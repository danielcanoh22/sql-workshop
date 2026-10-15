import { CheckVerdict, SqlResultSet } from './sql.model';
import { cellKey } from './value-format';

export interface ComparisonResult {
  readonly verdict: Exclude<CheckVerdict, 'user-error' | 'no-result'>;
  readonly message: string;
}

/**
 * What is being compared: the rows the learner's query returned, or the rows a hidden verification query returned
 * after the learner's SQL changed the data. Only the wording of the feedback changes.
 */
export type ComparedResult = 'query' | 'verification';

const rowKey = (row: readonly unknown[]) => JSON.stringify(row.map(cellKey));

const VERIFICATION_PREFIX = 'Después de ejecutar tu SQL, los datos no quedan como se esperaba: ';

/**
 * Compares two result sets by position: column names are ignored (aliases are a style choice), the number of
 * columns, the rows and their values are not. With `ordered` the row order must match too.
 */
export function compareResultSets(
  actual: SqlResultSet,
  expected: SqlResultSet,
  ordered: boolean,
  compared: ComparedResult = 'query',
): ComparisonResult {
  const verification = compared === 'verification';
  const subject = verification ? `${VERIFICATION_PREFIX}la comprobación` : 'Tu consulta';

  if (actual.columns.length !== expected.columns.length) {
    return {
      verdict: 'column-count',
      message: `${subject} devuelve ${plural(actual.columns.length, 'columna')} y se esperaban ${expected.columns.length}.`,
    };
  }
  if (actual.rows.length !== expected.rows.length) {
    return {
      verdict: 'row-count',
      message: `${subject} devuelve ${plural(actual.rows.length, 'fila')} y se esperaban ${expected.rows.length}.`,
    };
  }

  const actualKeys = actual.rows.map(rowKey);
  const expectedKeys = expected.rows.map(rowKey);

  if (sameMultiset(actualKeys, expectedKeys)) {
    if (!ordered || actualKeys.every((key, index) => key === expectedKeys[index])) {
      return { verdict: 'correct', message: '¡Correcto! Tu resultado coincide con el esperado.' };
    }
    return {
      verdict: 'row-order',
      message: verification
        ? `${VERIFICATION_PREFIX}la comprobación devuelve las filas correctas, pero en otro orden.`
        : 'Las filas son las correctas, pero el orden no: revisa tu ORDER BY.',
    };
  }
  return {
    verdict: 'values',
    message: verification
      ? `${VERIFICATION_PREFIX}algunos valores no coinciden.`
      : 'Tienes la cantidad correcta de filas y columnas, pero algunos valores no coinciden.',
  };
}

function sameMultiset(a: readonly string[], b: readonly string[]): boolean {
  const counts = new Map<string, number>();
  for (const key of a) {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const key of b) {
    const count = counts.get(key);
    if (!count) {
      return false;
    }
    counts.set(key, count - 1);
  }
  return true;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}
