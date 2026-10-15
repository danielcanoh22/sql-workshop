import { types, type ParserOptions } from '@electric-sql/pglite';

const raw = (value: string) => value;

/**
 * Keep date/time and JSON values exactly as Postgres prints them (like psql does) instead of converting them to
 * JS `Date`/objects: no time zone surprises and the learner sees the real text representation.
 */
export const DISPLAY_PARSERS: ParserOptions = {
  [types.DATE]: raw,
  [types.TIME]: raw,
  [types.TIMETZ]: raw,
  [types.TIMESTAMP]: raw,
  [types.TIMESTAMPTZ]: raw,
  [types.INTERVAL]: raw,
  [types.JSON]: raw,
  [types.JSONB]: raw,
};

/** Text shown in a result grid cell. `null` is returned as `NULL` so it never looks like an empty string. */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Uint8Array) {
    return '\\x' + [...value].map((byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  if (Array.isArray(value)) {
    return '{' + value.map((item) => formatValue(item)).join(',') + '}';
  }
  return JSON.stringify(value);
}

/** Stable key used to compare cells; distinguishes SQL NULL from the string 'NULL'. */
export function cellKey(value: unknown): string {
  return value === null || value === undefined ? '\u0000null' : formatValue(value);
}
