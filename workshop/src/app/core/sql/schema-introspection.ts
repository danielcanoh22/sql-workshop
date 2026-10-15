import { SchemaColumn, SchemaInfo, SchemaTable } from './sql.model';

/** Minimal query surface needed to read the catalog; satisfied by PGlite and its transactions. */
export interface CatalogReader {
  query<T>(sql: string): Promise<{ rows: T[] }>;
}

const COLUMNS_SQL = `
SELECT c.relname AS table_name,
       a.attname AS column_name,
       format_type(a.atttypid, a.atttypmod) AS type,
       NOT a.attnotnull AS nullable
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY c.relname, a.attnum`;

const KEYS_SQL = `
SELECT c.relname AS table_name,
       con.contype AS kind,
       a.attname AS column_name,
       rc.relname AS ref_table,
       ra.attname AS ref_column
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS k(attnum, ord)
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
LEFT JOIN pg_class rc ON rc.oid = con.confrelid
LEFT JOIN pg_attribute ra ON ra.attrelid = con.confrelid AND ra.attnum = con.confkey[k.ord]
WHERE n.nspname = 'public' AND con.contype IN ('p', 'f')`;

interface ColumnRow {
  readonly table_name: string;
  readonly column_name: string;
  readonly type: string;
  readonly nullable: boolean;
}

interface KeyRow {
  readonly table_name: string;
  readonly kind: 'p' | 'f';
  readonly column_name: string;
  readonly ref_table: string | null;
  readonly ref_column: string | null;
}

/** Quotes an identifier the way Postgres does (`"my ""table"""`), so catalog names are always safe to embed. */
export function quoteIdentifier(name: string): string {
  return `"${name.replaceAll('"', '""')}"`;
}

/** Reads the tables of the `public` schema with their columns, keys and row counts. */
export async function readSchema(db: CatalogReader): Promise<SchemaInfo> {
  const [{ rows: columns }, { rows: keys }] = [
    await db.query<ColumnRow>(COLUMNS_SQL),
    await db.query<KeyRow>(KEYS_SQL),
  ];

  const tableNames = [...new Set(columns.map((c) => c.table_name))];
  const counts = await countRows(db, tableNames);

  const tables: SchemaTable[] = tableNames.map((table) => ({
    name: table,
    rowCount: counts.get(table) ?? 0,
    columns: columns
      .filter((c) => c.table_name === table)
      .map((c): SchemaColumn => {
        const own = keys.filter((k) => k.table_name === table && k.column_name === c.column_name);
        const fk = own.find((k) => k.kind === 'f' && k.ref_table && k.ref_column);
        return {
          name: c.column_name,
          type: c.type,
          nullable: c.nullable,
          isPrimaryKey: own.some((k) => k.kind === 'p'),
          ...(fk ? { references: { table: fk.ref_table!, column: fk.ref_column! } } : {}),
        };
      }),
  }));

  return { tables };
}

async function countRows(db: CatalogReader, tables: readonly string[]): Promise<Map<string, number>> {
  if (tables.length === 0) {
    return new Map();
  }
  const sql = tables
    .map((table, index) => `SELECT ${index} AS i, count(*)::int AS n FROM ${quoteIdentifier(table)}`)
    .join(' UNION ALL ');
  const { rows } = await db.query<{ i: number; n: number }>(sql);
  return new Map(rows.map((row) => [tables[row.i], row.n]));
}
