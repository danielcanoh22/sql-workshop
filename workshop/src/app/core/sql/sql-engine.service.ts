import { DOCUMENT, Injectable, InjectionToken, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { EngineMethod, WorkerRequest, WorkerResponse } from './sql-protocol';
import { CheckOutcome, CheckSpec, CompareOutcome, CompareVariant, SchemaInfo, SqlRunOutcome } from './sql.model';

/** The part of `Worker` the service uses, so tests can provide a fake. */
export interface WorkerLike {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  postMessage(request: WorkerRequest): void;
  terminate(): void;
}

/** Creates the worker that hosts PGlite. Provided in `app.config.ts`, where the bundler sees the worker URL. */
export const SQL_WORKER_FACTORY = new InjectionToken<() => WorkerLike>('SQL_WORKER_FACTORY');

/** Longest a statement may run before the worker is restarted. */
export const SQL_TIMEOUT_MS = new InjectionToken<number>('SQL_TIMEOUT_MS', { factory: () => 15_000 });

export type EngineStatus = 'idle' | 'loading' | 'ready' | 'error';

class SqlTimeoutError extends Error {}

interface Pending {
  readonly resolve: (value: unknown) => void;
  readonly reject: (error: Error) => void;
}

/**
 * Main-thread facade over the SQL worker. Queries run off the main thread so a slow one never freezes the page,
 * and a runaway one is stopped by restarting the worker (PGlite cannot cancel a running statement).
 */
@Injectable({ providedIn: 'root' })
export class SqlEngineService {
  private readonly http = inject(HttpClient);
  private readonly document = inject(DOCUMENT);
  private readonly createWorker = inject(SQL_WORKER_FACTORY);
  private readonly timeoutMs = inject(SQL_TIMEOUT_MS);

  private readonly statusSignal = signal<EngineStatus>('idle');
  private readonly datasetSignal = signal<string | undefined>(undefined);
  private readonly revisionSignal = signal(0);

  readonly status = this.statusSignal.asReadonly();
  /** Dataset currently loaded in the playground. */
  readonly dataset = this.datasetSignal.asReadonly();
  /** Increases after every operation that may have changed the playground; data views re-read on change. */
  readonly revision = this.revisionSignal.asReadonly();

  private worker: WorkerLike | undefined;
  private ready: Promise<void> | undefined;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly seeds = new Map<string, string>();
  private opening: { readonly dataset: string; readonly done: Promise<void> } | undefined;

  /** Loads a dataset into the playground. Opening the dataset that is already open keeps the learner's changes. */
  open(dataset: string): Promise<void> {
    if (this.opening?.dataset === dataset) {
      return this.opening.done;
    }
    const done = this.load(dataset);
    this.opening = { dataset, done };
    return done;
  }

  async run(sql: string): Promise<SqlRunOutcome> {
    try {
      return (await this.call('run', [sql], true)) as SqlRunOutcome;
    } catch (error) {
      if (error instanceof SqlTimeoutError) {
        return { ok: false, error: { message: error.message }, durationMs: this.timeoutMs };
      }
      throw error;
    } finally {
      this.bumpRevision();
    }
  }

  async reset(): Promise<void> {
    await this.call('reset', []);
    this.bumpRevision();
  }

  schema(): Promise<SchemaInfo> {
    return this.call('schema', []) as Promise<SchemaInfo>;
  }

  preview(table: string): Promise<SqlRunOutcome> {
    return this.call('preview', [table]) as Promise<SqlRunOutcome>;
  }

  async check(sql: string, spec: CheckSpec): Promise<CheckOutcome> {
    try {
      return (await this.call('check', [sql, spec], true)) as CheckOutcome;
    } catch (error) {
      if (error instanceof SqlTimeoutError) {
        return { verdict: 'user-error', message: error.message, userError: { message: error.message } };
      }
      throw error;
    }
  }

  compare(variants: readonly CompareVariant[], setupSql?: string): Promise<CompareOutcome> {
    return this.call('compare', [variants, setupSql], true) as Promise<CompareOutcome>;
  }

  private async load(dataset: string): Promise<void> {
    this.statusSignal.set('loading');
    try {
      const seed = await this.seedFor(dataset);
      await this.call('load', [dataset, seed]);
      this.datasetSignal.set(dataset);
      this.statusSignal.set('ready');
      this.bumpRevision();
    } catch (error) {
      this.statusSignal.set('error');
      this.opening = undefined;
      throw error;
    }
  }

  private async seedFor(dataset: string): Promise<string> {
    let seed = this.seeds.get(dataset);
    if (seed === undefined) {
      seed = await firstValueFrom(this.http.get(`datasets/${dataset}.sql`, { responseType: 'text' }));
      this.seeds.set(dataset, seed);
    }
    return seed;
  }

  private async call(method: EngineMethod, args: readonly unknown[], withTimeout = false): Promise<unknown> {
    await this.ensureWorker();
    const result = this.post(this.worker!, method, args);

    if (!withTimeout) {
      return result;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        // Reject first: restarting also rejects `result`, and the first rejection wins the race.
        reject(
          new SqlTimeoutError(
            `La consulta tardó demasiado (más de ${Math.round(this.timeoutMs / 1000)} s) y se detuvo. ` +
              'La base de datos volvió a su estado inicial.',
          ),
        );
        this.restart();
      }, this.timeoutMs);
    });
    try {
      return await Promise.race([result, timeout]);
    } finally {
      clearTimeout(timer);
    }
  }

  private ensureWorker(): Promise<void> {
    if (!this.ready) {
      const worker = this.createWorker();
      worker.onmessage = ({ data }) => this.settle(data);
      this.worker = worker;
      this.ready = this.post(worker, 'init', [new URL('pglite/', this.document.baseURI).href]).then(() => undefined);
    }
    return this.ready;
  }

  private post(worker: WorkerLike, method: WorkerRequest['method'], args: readonly unknown[]): Promise<unknown> {
    const id = this.nextId++;
    const result = new Promise<unknown>((resolve, reject) => this.pending.set(id, { resolve, reject }));
    worker.postMessage({ id, method, args });
    return result;
  }

  private settle(response: WorkerResponse): void {
    const pending = this.pending.get(response.id);
    if (!pending) {
      return;
    }
    this.pending.delete(response.id);
    if (response.ok) {
      pending.resolve(response.value);
    } else {
      pending.reject(new Error(response.message));
    }
  }

  /** Kills the worker (the only way to stop a running statement) and reloads the dataset on a new one. */
  private restart(): void {
    this.worker?.terminate();
    this.worker = undefined;
    this.ready = undefined;
    for (const pending of this.pending.values()) {
      pending.reject(new SqlTimeoutError('La base de datos se reinició.'));
    }
    this.pending.clear();

    const dataset = this.datasetSignal();
    this.opening = undefined;
    if (dataset) {
      // Errors surface through `status()`; nobody awaits this reload.
      this.open(dataset).catch(() => undefined);
    }
  }

  private bumpRevision(): void {
    this.revisionSignal.update((value) => value + 1);
  }
}
