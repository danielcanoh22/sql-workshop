import { TestBed } from '@angular/core/testing';
import { SqlRunOutcome } from '../../../core/sql/sql.model';
import { ResultView } from './result-view';

async function render(outcome: SqlRunOutcome, sql = '') {
  const fixture = TestBed.createComponent(ResultView);
  fixture.componentRef.setInput('outcome', outcome);
  fixture.componentRef.setInput('sql', sql);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const select = (rows: unknown[][]): SqlRunOutcome => ({
  ok: true,
  durationMs: 3.4,
  results: [
    {
      command: 'SELECT',
      columns: [
        { name: 'name', typeId: 25 },
        { name: 'city', typeId: 25 },
      ],
      rows,
      rowCount: rows.length,
    },
  ],
});

describe('ResultView', () => {
  it('shows a SELECT as a table with headers, NULL marked and a row count footer', async () => {
    const root = await render(
      select([
        ['Ana', 'Madrid'],
        ['Luis', null],
      ]),
    );

    expect([...root.querySelectorAll('th')].map((th) => th.textContent?.trim())).toEqual(['name', 'city']);
    const cells = [...root.querySelectorAll('tbody td')];
    expect(cells.map((td) => td.textContent?.trim())).toEqual(['Ana', 'Madrid', 'Luis', 'NULL']);
    expect(cells[3].classList).toContain('cell--null');
    expect(root.querySelector('.result__summary')?.textContent).toContain('2 filas');
  });

  it('can hide the timing, e.g. for results that were not just executed', async () => {
    const fixture = TestBed.createComponent(ResultView);
    fixture.componentRef.setInput('outcome', select([['Ana', 'Madrid']]));
    fixture.componentRef.setInput('showTiming', false);
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('.result__summary')?.textContent?.trim()).toBe('1 fila');
  });

  it('says so when a SELECT returns no rows', async () => {
    const root = await render(select([]));

    expect(root.querySelector('.result__empty')?.textContent).toContain('0 filas');
  });

  it('limits long results and tells how many rows were left out', async () => {
    const rows = Array.from({ length: 250 }, (_, i) => [`n${i}`, 'x']);
    const root = await render(select(rows));

    expect(root.querySelectorAll('tbody tr')).toHaveLength(100);
    expect(root.querySelector('.result__truncated')?.textContent).toContain('Mostrando 100 de 250 filas');
  });

  it('summarizes statements without columns by their command and affected rows', async () => {
    const root = await render({
      ok: true,
      durationMs: 1,
      results: [
        { command: 'UPDATE', columns: [], rows: [], rowCount: 1 },
        { command: 'CREATE TABLE', columns: [], rows: [], rowCount: undefined },
      ],
    });

    const lines = [...root.querySelectorAll('.result__command-text')].map((el) => el.textContent?.trim());
    expect(lines).toEqual(['UPDATE · 1 fila afectada', 'CREATE TABLE · hecho']);
  });

  it('shows errors with the line and column of the position, the detail and the hint', async () => {
    const root = await render(
      {
        ok: false,
        durationMs: 1,
        error: { message: 'column "nam" does not exist', code: '42703', position: 17, hint: 'Perhaps you meant "name".' },
      },
      'SELECT id,\n       nam FROM customers',
    );

    const error = root.querySelector('[role="alert"]')!;
    expect(error.textContent).toContain('column "nam" does not exist');
    expect(error.textContent).toContain('Línea 2, columna 6');
    expect(error.querySelector('.result__hint')?.textContent).toContain('Perhaps you meant "name".');
  });
});
