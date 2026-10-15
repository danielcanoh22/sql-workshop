/** One column of a result set, as reported by Postgres. */
export interface SqlColumn {
  readonly name: string;
  /** Postgres type OID (e.g. 23 = integer, 25 = text). */
  readonly typeId: number;
}

/** The outcome of one statement. Rows are positional so duplicated column names (e.g. two `id`s in a JOIN) survive. */
export interface SqlResultSet {
  /** Command tag reported by Postgres: `SELECT`, `INSERT`, `CREATE`... */
  readonly command: string;
  readonly columns: readonly SqlColumn[];
  readonly rows: readonly (readonly unknown[])[];
  /** Rows returned by a SELECT or changed by INSERT/UPDATE/DELETE; undefined when the tag carries no count. */
  readonly rowCount: number | undefined;
}

export interface SqlError {
  readonly message: string;
  /** SQLSTATE code, e.g. `42601` for a syntax error. */
  readonly code?: string;
  /** 1-based character position inside the submitted SQL. */
  readonly position?: number;
  readonly detail?: string;
  readonly hint?: string;
}

/**
 * State of the playground connection after a script: `open` after a `BEGIN` without `COMMIT`/`ROLLBACK`,
 * `failed` when a statement failed inside that transaction (PostgreSQL ignores everything until `ROLLBACK`).
 */
export type TransactionState = 'idle' | 'open' | 'failed';

export type SqlRunOutcome =
  | {
      readonly ok: true;
      readonly results: readonly SqlResultSet[];
      readonly durationMs: number;
      /** Set by playground runs. */
      readonly transaction?: TransactionState;
    }
  | {
      readonly ok: false;
      readonly error: SqlError;
      readonly durationMs: number;
      readonly transaction?: TransactionState;
    };

export interface SchemaColumn {
  readonly name: string;
  readonly type: string;
  readonly nullable: boolean;
  readonly isPrimaryKey: boolean;
  /** `table.column` this column references, when it is part of a foreign key. */
  readonly references?: { readonly table: string; readonly column: string };
}

export interface SchemaTable {
  readonly name: string;
  readonly rowCount: number;
  readonly columns: readonly SchemaColumn[];
}

export interface SchemaInfo {
  readonly tables: readonly SchemaTable[];
}

/** How a challenge answer is checked against the reference solution. */
export interface CheckSpec {
  readonly solutionSql: string;
  /**
   * Query run after the answer and after the solution; its results are compared.
   * Use it for INSERT/UPDATE/DELETE/DDL challenges. Without it, the last result set of each script is compared.
   */
  readonly verifySql?: string;
  /** Compare rows in order (the statement asks for ORDER BY). Defaults to false: rows are compared as a multiset. */
  readonly ordered?: boolean;
  /** Extra SQL run on the fresh database before the answer and before the solution. */
  readonly setupSql?: string;
}

export type CheckVerdict =
  | 'correct'
  | 'user-error'
  | 'no-result'
  | 'column-count'
  | 'row-count'
  | 'row-order'
  | 'values';

export interface CheckOutcome {
  readonly verdict: CheckVerdict;
  /** Human-readable explanation in Spanish, shown to the learner. */
  readonly message: string;
  readonly userError?: SqlError;
  readonly actual?: SqlResultSet;
  readonly expected?: SqlResultSet;
}

/** One node of an EXPLAIN (FORMAT JSON) plan, reduced to what the workshop displays. */
export interface PlanNode {
  readonly nodeType: string;
  readonly relation?: string;
  readonly index?: string;
  readonly actualRows?: number;
  readonly actualLoops?: number;
  readonly totalTimeMs?: number;
  /** Rows read and thrown away by a filter: the clearest sign of wasted work. */
  readonly rowsRemovedByFilter?: number;
  readonly filter?: string;
  readonly indexCond?: string;
  readonly children: readonly PlanNode[];
}

export interface PlanSummary {
  readonly root: PlanNode;
  readonly executionTimeMs: number;
  readonly planningTimeMs: number;
  /** Sum of rows produced by every scan node plus the rows they discarded. */
  readonly rowsScanned: number;
  /** 8 kB pages touched (shared buffers hit + read): a machine-independent measure of the work done. */
  readonly pagesRead: number;
  readonly scanTypes: readonly string[];
}

export interface CompareVariant {
  readonly id: string;
  /** A single statement; it is executed and then explained with EXPLAIN ANALYZE. */
  readonly sql: string;
  /** Optional statements that prepare only this variant (e.g. `CREATE INDEX ...`). */
  readonly setupSql?: string;
}

export interface CompareVariantOutcome {
  readonly id: string;
  readonly run: SqlRunOutcome;
  readonly plan?: PlanSummary;
  /** True when the variant returned the same rows as the first variant. */
  readonly sameResultAsFirst: boolean;
}

export interface CompareOutcome {
  readonly variants: readonly CompareVariantOutcome[];
}
