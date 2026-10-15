import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { SQL_TIMEOUT_MS, SQL_WORKER_FACTORY, SqlEngineService, WorkerLike } from './sql-engine.service';
import { WorkerRequest, WorkerResponse } from './sql-protocol';
import { SqlRunOutcome } from './sql.model';

class FakeWorker implements WorkerLike {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
  readonly requests: WorkerRequest[] = [];
  terminated = false;

  postMessage(request: WorkerRequest): void {
    this.requests.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  /** Answers the oldest unanswered request with the given method. */
  reply(method: WorkerRequest['method'], value: unknown = null): void {
    const request = this.requests.find((r) => r.method === method && !this.answered.has(r.id));
    if (!request) {
      throw new Error(`No pending ${method} request`);
    }
    this.answered.add(request.id);
    this.onmessage?.({ data: { id: request.id, ok: true, value } } as MessageEvent<WorkerResponse>);
  }

  fail(method: WorkerRequest['method'], message: string): void {
    const request = this.requests.find((r) => r.method === method && !this.answered.has(r.id))!;
    this.answered.add(request.id);
    this.onmessage?.({ data: { id: request.id, ok: false, message } } as MessageEvent<WorkerResponse>);
  }

  private readonly answered = new Set<number>();
}

const flush = () => new Promise((resolve) => setTimeout(resolve));

function setup(timeoutMs = 1000) {
  const workers: FakeWorker[] = [];
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: SQL_WORKER_FACTORY, useValue: () => workers[workers.push(new FakeWorker()) - 1] },
      { provide: SQL_TIMEOUT_MS, useValue: timeoutMs },
    ],
  });
  return { service: TestBed.inject(SqlEngineService), http: TestBed.inject(HttpTestingController), workers };
}

async function openShop(service: SqlEngineService, http: HttpTestingController, workers: FakeWorker[]) {
  const opened = service.open('shop');
  http.expectOne('datasets/shop.sql').flush('CREATE TABLE t (id int);');
  await flush();
  workers.at(-1)!.reply('init');
  await flush();
  workers.at(-1)!.reply('load');
  await opened;
}

const OK: SqlRunOutcome = { ok: true, results: [], durationMs: 1 };

describe('SqlEngineService', () => {
  afterEach(() => vi.useRealTimers());

  it('opens a dataset: fetches its seed, initializes the worker with the PGlite assets URL and loads it', async () => {
    const { service, http, workers } = setup();

    expect(service.status()).toBe('idle');
    const opened = service.open('shop');
    expect(service.status()).toBe('loading');
    http.expectOne('datasets/shop.sql').flush('CREATE TABLE t (id int);');
    await flush();
    workers[0].reply('init');
    await flush();
    workers[0].reply('load');
    await opened;

    expect(workers[0].requests.map((r) => r.method)).toEqual(['init', 'load']);
    expect(String(workers[0].requests[0].args[0])).toMatch(/\/pglite\/$/);
    expect(workers[0].requests[1].args).toEqual(['shop', 'CREATE TABLE t (id int);']);
    expect(service.status()).toBe('ready');
    expect(service.dataset()).toBe('shop');
  });

  it('opens the same dataset only once', async () => {
    const { service, http, workers } = setup();
    await openShop(service, http, workers);

    await service.open('shop');

    http.expectNone('datasets/shop.sql');
    expect(workers[0].requests.filter((r) => r.method === 'load')).toHaveLength(1);
  });

  it('runs SQL in the worker and bumps the revision so data views refresh', async () => {
    const { service, http, workers } = setup();
    await openShop(service, http, workers);
    const before = service.revision();

    const running = service.run('SELECT 1');
    await flush();
    workers[0].reply('run', OK);

    expect(await running).toEqual(OK);
    expect(workers[0].requests.at(-1)).toMatchObject({ method: 'run', args: ['SELECT 1'] });
    expect(service.revision()).toBe(before + 1);
  });

  it('tracks the transaction state reported by each run and clears it on reset', async () => {
    const { service, http, workers } = setup();
    await openShop(service, http, workers);

    expect(service.transaction()).toBe('idle');
    const running = service.run('BEGIN');
    await flush();
    workers[0].reply('run', { ...OK, transaction: 'open' });
    await running;
    expect(service.transaction()).toBe('open');

    const resetting = service.reset();
    await flush();
    workers[0].reply('reset');
    await resetting;
    expect(service.transaction()).toBe('idle');
  });

  it('resets the playground and bumps the revision', async () => {
    const { service, http, workers } = setup();
    await openShop(service, http, workers);
    const before = service.revision();

    const resetting = service.reset();
    await flush();
    workers[0].reply('reset');
    await resetting;

    expect(service.revision()).toBe(before + 1);
  });

  it('stops a query that takes too long, restarts the worker and reloads the dataset', async () => {
    const { service, http, workers } = setup(50);
    await openShop(service, http, workers);

    const outcome = await service.run('SELECT pg_sleep(100)');
    await flush();

    expect(outcome.ok).toBe(false);
    expect(!outcome.ok && outcome.error.message).toContain('tardó demasiado');
    expect(workers[0].terminated).toBe(true);
    expect(workers).toHaveLength(2);
    expect(service.status()).toBe('loading');

    workers[1].reply('init');
    await flush();
    workers[1].reply('load');
    await flush();

    expect(workers[1].requests[1]).toMatchObject({ method: 'load', args: ['shop', 'CREATE TABLE t (id int);'] });
    expect(service.status()).toBe('ready');
  });

  it('rejects when the worker reports an internal failure', async () => {
    const { service, http, workers } = setup();
    await openShop(service, http, workers);

    const schema = service.schema();
    await flush();
    workers[0].fail('schema', 'boom');

    await expect(schema).rejects.toThrow('boom');
  });

  it('marks the engine as failed when the dataset cannot be loaded', async () => {
    const { service, http, workers } = setup();

    const opened = service.open('shop');
    http.expectOne('datasets/shop.sql').flush('CREATE TABLE t (id int);');
    await flush();
    workers[0].reply('init');
    await flush();
    workers[0].fail('load', 'bad seed');

    await expect(opened).rejects.toThrow('bad seed');
    expect(service.status()).toBe('error');
  });
});
