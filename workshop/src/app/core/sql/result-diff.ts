import { SqlResultSet } from './sql.model';
import { formatValue } from './value-format';

/** A row that differs between the learner's result and the expected one; `undefined` means the row is missing. */
export interface RowDifference {
  readonly key: string;
  readonly actual: string | undefined;
  readonly expected: string | undefined;
}

/**
 * When the first column identifies each row (as in "check → outcome" verification queries), lists only the rows that
 * differ, with the rest of each row joined into one text. Returns `undefined` when the results cannot be compared that
 * way: fewer than two columns, different column counts or repeated keys.
 */
export function diffByFirstColumn(actual: SqlResultSet, expected: SqlResultSet): RowDifference[] | undefined {
  if (actual.columns.length < 2 || actual.columns.length !== expected.columns.length) {
    return undefined;
  }
  const actualRows = byKey(actual);
  const expectedRows = byKey(expected);
  if (!actualRows || !expectedRows) {
    return undefined;
  }

  const differences: RowDifference[] = [];
  for (const [key, value] of expectedRows) {
    if (actualRows.get(key) !== value) {
      differences.push({ key, actual: actualRows.get(key), expected: value });
    }
  }
  for (const [key, value] of actualRows) {
    if (!expectedRows.has(key)) {
      differences.push({ key, actual: value, expected: undefined });
    }
  }
  return differences;
}

function byKey(result: SqlResultSet): Map<string, string> | undefined {
  const rows = new Map<string, string>();
  for (const [key, ...rest] of result.rows) {
    const text = formatValue(key);
    if (rows.has(text)) {
      return undefined;
    }
    rows.set(text, rest.map(formatValue).join(' · '));
  }
  return rows;
}
