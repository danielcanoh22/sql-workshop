import type { Results } from '@electric-sql/pglite';
import { compareResultSets } from './result-compare';
import { EXPLAIN_PREFIX, summarizePlan } from './explain-plan';
import { CatalogReader, quoteIdentifier, readSchema } from './schema-introspection';
import {
  CheckOutcome,
  CheckSpec,
  CompareOutcome,
  CompareVariant,
  CompareVariantOutcome,
  SchemaInfo,
  SqlError,
  SqlResultSet,
  SqlRunOutcome,
} from './sql.model';

/** The slice of the PGlite API the engine uses; lets tests and the worker inject their own instances. */
export interface Database extends CatalogReader {
  exec(sql: string, options?: { rowMode?: 'array' | 'object' }): Promise<Results<unknown>[]>;
  query<T>(sql: string, params?: unknown[], options?: { rowMode?: 'array' | 'object' }): Promise<Results<T>>;
  dumpDataDir(compression?: 'none' | 'gzip' | 'auto'): Promise<Blob | File>;
  close(): Promise<void>;
}

/** Creates an empty database, or one restored from a `dumpDataDir()` snapshot. */
export type DatabaseFactory = (snapshot?: Blob | File) => Promise<Database>;

export const PREVIEW_LIMIT = 50;

/**
 * Owns the databases of the workshop:
 * - the **playground**, where the learner's statements run and accumulate, and
 * - throwaway copies of the freshly seeded dataset, so checks and comparisons never depend on what the learner
 *   changed in the playground.
 */
export class SqlEngine {
  private snapshot: Blob | File | undefined;
  private datasetKey: string | undefined;
  private playground: Database | undefined;
  private readonly expectedCache = new Map<string, SqlRunOutcome>();

  constructor(private readonly createDatabase: DatabaseFactory) {}

  get loadedDataset(): string | undefined {
    return this.datasetKey;
  }

  /** Seeds a dataset and opens a playground on it. Loading the dataset that is already open keeps its state. */
  async load(datasetKey: string, seedSql: string): Promise<void> {
    if (this.datasetKey === datasetKey && this.playground) {
      return;
    }
    await this.dispose();

    const db = await this.createDatabase();
    await db.exec(seedSql);
    this.snapshot = await db.dumpDataDir('none');
    this.playground = db;
    this.datasetKey = datasetKey;
  }

  /** Throws away every change made in the playground. */
  async reset(): Promise<void> {
    const snapshot = this.requireSnapshot();
    await this.playground?.close();
    this.playground = await this.createDatabase(snapshot);
  }

  run(sql: string): Promise<SqlRunOutcome> {
    return runScript(this.requirePlayground(), sql);
  }

  schema(): Promise<SchemaInfo> {
    return readSchema(this.requirePlayground());
  }

  /** First rows of a table, by name as listed in `schema()`. */
  async preview(table: string): Promise<SqlRunOutcome> {
    const { tables } = await this.schema();
    if (!tables.some((t) => t.name === table)) {
      return failure({ message: `La tabla "${table}" no existe.` }, 0);
    }
    return this.run(`SELECT * FROM ${quoteIdentifier(table)} LIMIT ${PREVIEW_LIMIT}`);
  }

  /** Runs the answer and the reference solution on fresh copies of the dataset and compares their results. */
  async check(userSql: string, spec: CheckSpec): Promise<CheckOutcome> {
    const actualRun = await this.onFreshCopy((db) => runForCheck(db, userSql, spec));
    if (!actualRun.ok) {
      return {
        verdict: 'user-error',
        message: 'Tu SQL produjo un error. Corrígelo y vuelve a intentarlo.',
        userError: actualRun.error,
      };
    }

    const expectedRun = await this.expectedFor(spec);
    if (!expectedRun.ok) {
      throw new Error(`The reference solution failed: ${expectedRun.error.message}`);
    }

    const actual = lastResultWithColumns(actualRun.results);
    const expected = lastResultWithColumns(expectedRun.results);
    if (!expected) {
      throw new Error('The reference solution returned no result set to compare.');
    }
    if (!actual) {
      return {
        verdict: 'no-result',
        message: 'Tu SQL no devolvió ningún resultado. Este reto espera una consulta que devuelva filas.',
        expected,
      };
    }

    const comparison = compareResultSets(
      actual,
      expected,
      spec.ordered ?? false,
      spec.verifySql ? 'verification' : 'query',
    );
    return { ...comparison, actual, expected };
  }

  /**
   * Runs every variant on the same fresh copy, each inside a transaction that is rolled back so a variant's setup
   * (e.g. an index) never leaks into the next one, and explains it with EXPLAIN ANALYZE.
   */
  async compare(variants: readonly CompareVariant[], setupSql?: string): Promise<CompareOutcome> {
    return this.onFreshCopy(async (db) => {
      if (setupSql) {
        await db.exec(setupSql);
      }

      const outcomes: CompareVariantOutcome[] = [];
      let firstRows: SqlResultSet | undefined;

      for (const variant of variants) {
        await db.exec('BEGIN');
        try {
          if (variant.setupSql) {
            await db.exec(variant.setupSql);
          }
          const run = await runScript(db, variant.sql);
          const plan = run.ok ? await explain(db, variant.sql) : undefined;
          const rows = run.ok ? lastResultWithColumns(run.results) : undefined;

          firstRows ??= rows;
          const sameResultAsFirst =
            !!rows && !!firstRows && compareResultSets(rows, firstRows, false).verdict === 'correct';
          outcomes.push({ id: variant.id, run, plan, sameResultAsFirst });
        } finally {
          await db.exec('ROLLBACK');
        }
      }
      return { variants: outcomes };
    });
  }

  async dispose(): Promise<void> {
    await this.playground?.close();
    this.playground = undefined;
    this.snapshot = undefined;
    this.datasetKey = undefined;
    this.expectedCache.clear();
  }

  private async expectedFor(spec: CheckSpec): Promise<SqlRunOutcome> {
    const key = JSON.stringify([spec.setupSql ?? '', spec.solutionSql, spec.verifySql ?? '']);
    const cached = this.expectedCache.get(key);
    if (cached) {
      return cached;
    }
    const outcome = await this.onFreshCopy((db) => runForCheck(db, spec.solutionSql, spec));
    if (outcome.ok) {
      this.expectedCache.set(key, outcome);
    }
    return outcome;
  }

  private async onFreshCopy<T>(work: (db: Database) => Promise<T>): Promise<T> {
    const db = await this.createDatabase(this.requireSnapshot());
    try {
      return await work(db);
    } finally {
      await db.close();
    }
  }

  private requirePlayground(): Database {
    if (!this.playground) {
      throw new Error('No dataset loaded: call load() first.');
    }
    return this.playground;
  }

  private requireSnapshot(): Blob | File {
    if (!this.snapshot) {
      throw new Error('No dataset loaded: call load() first.');
    }
    return this.snapshot;
  }
}

/** Executes one or more statements. Postgres runs a multi-statement script atomically: an error undoes all of it. */
export async function runScript(db: Database, sql: string): Promise<SqlRunOutcome> {
  const started = performance.now();
  try {
    const results = await db.exec(sql, { rowMode: 'array' });
    return { ok: true, results: results.map(toResultSet), durationMs: performance.now() - started };
  } catch (error) {
    return failure(toSqlError(error), performance.now() - started);
  }
}

async function runForCheck(db: Database, sql: string, spec: CheckSpec): Promise<SqlRunOutcome> {
  if (spec.setupSql) {
    await db.exec(spec.setupSql);
  }
  const run = await runScript(db, sql);
  if (!run.ok || !spec.verifySql) {
    return run;
  }
  return runScript(db, spec.verifySql);
}

async function explain(db: Database, sql: string) {
  try {
    const { rows } = await db.query<unknown[]>(EXPLAIN_PREFIX + sql, [], { rowMode: 'array' });
    return summarizePlan(rows[0][0]);
  } catch {
    // Statements that cannot be explained (e.g. DDL) simply have no plan.
    return undefined;
  }
}

function toResultSet(result: Results<unknown>): SqlResultSet {
  return {
    command: result.command ?? '',
    columns: result.fields.map((field) => ({ name: field.name, typeId: field.dataTypeID })),
    rows: result.rows as unknown as unknown[][],
    rowCount: result.rowCount,
  };
}

function lastResultWithColumns(results: readonly SqlResultSet[]): SqlResultSet | undefined {
  return [...results].reverse().find((result) => result.columns.length > 0);
}

function failure(error: SqlError, durationMs: number): SqlRunOutcome {
  return { ok: false, error, durationMs };
}

export function toSqlError(error: unknown): SqlError {
  if (error && typeof error === 'object' && 'message' in error) {
    const e = error as { message: string; code?: string; position?: string | number; detail?: string; hint?: string };
    const position = e.position === undefined ? undefined : Number(e.position);
    return {
      message: e.message,
      ...(e.code ? { code: e.code } : {}),
      ...(position !== undefined && !Number.isNaN(position) ? { position } : {}),
      ...(e.detail ? { detail: e.detail } : {}),
      ...(e.hint ? { hint: e.hint } : {}),
    };
  }
  return { message: String(error) };
}
