import { TestBed } from '@angular/core/testing';
import { CompareVariantOutcome, PlanSummary } from '../../../core/sql/sql.model';
import { ComparisonItem, ComparisonView } from './comparison-view';

const plan = (overrides: Partial<PlanSummary>): PlanSummary => ({
  root: { nodeType: 'Seq Scan', relation: 'customers', actualRows: 1, actualLoops: 1, filter: "(lower(email) = 'a')", children: [] },
  executionTimeMs: 4.2,
  planningTimeMs: 0.1,
  rowsScanned: 5000,
  pagesRead: 100,
  scanTypes: ['Seq Scan'],
  ...overrides,
});

const outcome = (id: string, overrides: Partial<CompareVariantOutcome> = {}): CompareVariantOutcome => ({
  id,
  run: {
    ok: true,
    durationMs: 1,
    results: [{ command: 'SELECT', columns: [{ name: 'id', typeId: 23 }], rows: [[1]], rowCount: 1 }],
  },
  sameResultAsFirst: true,
  ...overrides,
});

const ITEMS: ComparisonItem[] = [
  {
    label: 'Función sobre la columna',
    sql: 'SELECT 1',
    outcome: outcome('0', { plan: plan({}) }),
    explanationHtml: '<p>La función impide usar el <strong>índice</strong>.</p>',
  },
  {
    label: 'Comparación directa',
    sql: 'SELECT 2',
    best: true,
    outcome: outcome('1', {
      plan: plan({
        root: { nodeType: 'Index Scan', relation: 'customers', index: 'customers_email_idx', actualRows: 1, actualLoops: 1, children: [] },
        rowsScanned: 1,
        pagesRead: 10,
        executionTimeMs: 0.05,
        scanTypes: ['Index Scan'],
      }),
    }),
  },
  {
    label: 'Otra',
    sql: 'SELECT 3',
    outcome: outcome('2', { sameResultAsFirst: false, plan: plan({}) }),
  },
];

async function render(items: ComparisonItem[] = ITEMS) {
  const fixture = TestBed.createComponent(ComparisonView);
  fixture.componentRef.setInput('items', items);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

const metric = (card: Element, name: string) =>
  card.querySelector(`[data-metric="${name}"] .metric__value`)?.textContent?.replace(/\s+/g, ' ').trim();

describe('ComparisonView', () => {
  it('shows one card per variant and marks the recommended one', async () => {
    const root = await render();
    const cards = [...root.querySelectorAll('.variant')];

    expect(cards.map((c) => c.querySelector('.variant__label')?.textContent?.trim())).toEqual([
      'Función sobre la columna',
      'Comparación directa',
      'Otra',
    ]);
    expect(cards[1].querySelector('.variant__best')?.textContent).toContain('Recomendada');
    expect(cards[0].querySelector('.variant__best')).toBeNull();
  });

  it('reports rows returned, rows read, pages read and time for each variant', async () => {
    const [slow, fast] = [...(await render()).querySelectorAll('.variant')];

    expect(metric(slow, 'rows')).toBe('1');
    expect(metric(slow, 'scanned')).toBe('5000');
    expect(metric(slow, 'pages')).toBe('100');
    expect(metric(fast, 'scanned')).toBe('1');
    expect(metric(fast, 'pages')).toBe('10');
    expect(metric(fast, 'time')).toBe('0.05 ms');
  });

  it('never shows a measured time as zero', async () => {
    const root = await render([{ label: 'Instantánea', sql: 'SELECT 1', outcome: outcome('0', { plan: plan({ executionTimeMs: 0.003 }) }) }]);

    expect(metric(root.querySelector('.variant')!, 'time')).toBe('<0.01 ms');
  });

  it('draws the pages read as bars relative to the largest one', async () => {
    const [slow, fast] = [...(await render()).querySelectorAll('.variant')];

    expect(slow.querySelector<HTMLElement>('.metric__bar-fill')!.style.width).toBe('100%');
    expect(fast.querySelector<HTMLElement>('.metric__bar-fill')!.style.width).toBe('10%');
  });

  it('flags variants whose result differs from the first one', async () => {
    const cards = [...(await render()).querySelectorAll('.variant')];

    expect(metric(cards[0], 'same')).toBe('Referencia');
    expect(metric(cards[1], 'same')).toBe('Igual');
    expect(metric(cards[2], 'same')).toBe('Distinto');
  });

  it('names how each variant reads the table, highlighting full scans', async () => {
    const [slow, fast] = [...(await render()).querySelectorAll('.variant')];

    expect(slow.querySelector('.scan')?.classList).toContain('scan--seq');
    expect(fast.querySelector('.scan')?.classList).toContain('scan--index');
  });

  it('shows the execution plan tree and the explanation', async () => {
    const [slow, fast] = [...(await render()).querySelectorAll('.variant')];

    expect(fast.querySelector('.plan__node')?.textContent).toContain('Index Scan');
    expect(fast.querySelector('.plan__node')?.textContent).toContain('customers_email_idx');
    expect(slow.querySelector('.plan__node')?.textContent?.trim()).toBe('Seq Scan en customers · 1 fila');
    expect(slow.querySelector('.plan__tree')?.textContent).toContain("Filtro: (lower(email) = 'a')");
    expect(slow.querySelector('.variant__explanation strong')?.textContent).toBe('índice');
  });

  it('shows the error of a variant that failed', async () => {
    const root = await render([
      {
        label: 'Rota',
        sql: 'SELEC 1',
        outcome: { id: '0', run: { ok: false, durationMs: 0, error: { message: 'syntax error' } }, sameResultAsFirst: false },
      },
    ]);

    expect(root.querySelector('.variant [role="alert"]')?.textContent).toContain('syntax error');
  });
});
