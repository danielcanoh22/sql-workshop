import { SqlResultSet } from './sql.model';
import { diffByFirstColumn } from './result-diff';

const result = (rows: unknown[][], columns = ['item', 'outcome']): SqlResultSet => ({
  command: 'SELECT',
  columns: columns.map((name) => ({ name, typeId: 25 })),
  rows,
  rowCount: rows.length,
});

describe('diffByFirstColumn', () => {
  it('lists only the rows whose values differ, keyed by the first column', () => {
    const diff = diffByFirstColumn(
      result([
        ['reseña válida', 'ok'],
        ['valoración 0', 'ok'],
        ['valoración 6', 'check'],
      ]),
      result([
        ['reseña válida', 'ok'],
        ['valoración 0', 'check'],
        ['valoración 6', 'check'],
      ]),
    );

    expect(diff).toEqual([{ key: 'valoración 0', actual: 'ok', expected: 'check' }]);
  });

  it('reports rows that are missing or unexpected', () => {
    const diff = diffByFirstColumn(
      result([
        ['columna id', 'integer'],
        ['columna created_at', 'timestamp with time zone'],
      ]),
      result([
        ['columna id', 'integer'],
        ['columna comment', 'text'],
      ]),
    );

    expect(diff).toEqual([
      { key: 'columna comment', actual: undefined, expected: 'text' },
      { key: 'columna created_at', actual: 'timestamp with time zone', expected: undefined },
    ]);
  });

  it('joins the remaining columns and shows NULL explicitly', () => {
    const diff = diffByFirstColumn(
      result([['Feria del libro', '2025-04-23', null]], ['item', 'date', 'venue']),
      result([['Feria del libro', '2025-04-23', 'Palacio de Congresos']], ['item', 'date', 'venue']),
    );

    expect(diff).toEqual([
      { key: 'Feria del libro', actual: '2025-04-23 · NULL', expected: '2025-04-23 · Palacio de Congresos' },
    ]);
  });

  it('gives up when the first column does not identify the rows', () => {
    const repeated = result([
      ['Madrid', 'Ana'],
      ['Madrid', 'Alba'],
    ]);

    expect(diffByFirstColumn(repeated, repeated)).toBeUndefined();
  });

  it('gives up with a single column or different column counts', () => {
    expect(diffByFirstColumn(result([['a']], ['x']), result([['b']], ['x']))).toBeUndefined();
    expect(diffByFirstColumn(result([['a', 'b']]), result([['a', 'b', 'c']], ['x', 'y', 'z']))).toBeUndefined();
  });
});
