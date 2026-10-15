import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EngineStatus, SqlEngineService } from '../../../core/sql/sql-engine.service';
import { SchemaInfo, SqlRunOutcome } from '../../../core/sql/sql.model';
import { DataPanel } from './data-panel';

const SCHEMA: SchemaInfo = {
  tables: [
    {
      name: 'customers',
      rowCount: 2,
      columns: [
        { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true },
        { name: 'city', type: 'text', nullable: true, isPrimaryKey: false },
      ],
    },
    {
      name: 'orders',
      rowCount: 1,
      columns: [
        { name: 'id', type: 'integer', nullable: false, isPrimaryKey: true },
        {
          name: 'customer_id',
          type: 'integer',
          nullable: false,
          isPrimaryKey: false,
          references: { table: 'customers', column: 'id' },
        },
      ],
    },
  ],
};

const PREVIEW: SqlRunOutcome = {
  ok: true,
  durationMs: 1,
  results: [
    {
      command: 'SELECT',
      columns: [
        { name: 'id', typeId: 23 },
        { name: 'city', typeId: 25 },
      ],
      rows: [
        [1, 'Madrid'],
        [2, null],
      ],
      rowCount: 2,
    },
  ],
};

/** Text of each child element, joined by spaces (Angular drops the whitespace between elements). */
const parts = (el: Element) => [...el.children].map((child) => child.textContent?.trim()).join(' ');

async function setup(status: EngineStatus = 'ready') {
  const engine = {
    status: signal<EngineStatus>(status),
    dataset: signal('store'),
    revision: signal(0),
    schema: vi.fn().mockResolvedValue(SCHEMA),
    preview: vi.fn().mockResolvedValue(PREVIEW),
    reset: vi.fn().mockResolvedValue(undefined),
  };
  TestBed.configureTestingModule({ providers: [{ provide: SqlEngineService, useValue: engine }] });
  const fixture = TestBed.createComponent(DataPanel);
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const click = async (selector: string) => {
    root.querySelector<HTMLElement>(selector)!.click();
    await fixture.whenStable();
  };
  return { fixture, root, engine, click };
}

describe('DataPanel', () => {
  it('lists every table with its row count', async () => {
    const { root } = await setup();

    const summaries = [...root.querySelectorAll('.table__summary')].map(parts);
    expect(summaries).toEqual(['customers 2 filas', 'orders 1 fila']);
  });

  it('describes columns with their type, primary keys, nullability and foreign keys', async () => {
    const { root } = await setup();

    const columns = [...root.querySelectorAll('.column')].map(parts);
    expect(columns).toEqual([
      'key id integer',
      'city text NULL',
      'key id integer',
      'link customer_id integer → customers.id',
    ]);
  });

  it('previews the rows of a table on demand', async () => {
    const { root, engine, click } = await setup();

    await click('.table__preview');

    expect(engine.preview).toHaveBeenCalledWith('customers');
    expect([...root.querySelectorAll('app-result-view tbody td')].map((td) => td.textContent?.trim())).toEqual([
      '1',
      'Madrid',
      '2',
      'NULL',
    ]);
  });

  it('refreshes an open preview after the playground changes', async () => {
    const { fixture, engine, click } = await setup();
    await click('.table__preview');

    engine.revision.set(1);
    await fixture.whenStable();

    expect(engine.preview).toHaveBeenCalledTimes(2);
  });

  it('resets the data only after confirmation', async () => {
    const { root, engine, click } = await setup();

    await click('.panel__reset');
    expect(engine.reset).not.toHaveBeenCalled();
    expect(root.querySelector('.panel__confirm')?.textContent).toContain('¿Volver a los datos originales?');

    await click('.panel__confirm-yes');
    expect(engine.reset).toHaveBeenCalledTimes(1);
    expect(root.querySelector('.panel__confirm')).toBeNull();
  });

  it('draws the relationship diagram with one box per table and one line per foreign key', async () => {
    const { root, click } = await setup();

    await click('[data-tab="diagram"]');

    expect(root.querySelectorAll('svg .box')).toHaveLength(2);
    expect(root.querySelectorAll('svg .edge')).toHaveLength(1);
    expect(root.querySelector('svg .edge title')?.textContent).toBe('orders.customer_id → customers.id');
  });

  it('opens the diagram in a large overlay and closes it with Escape', async () => {
    const { fixture, root, click } = await setup();
    await click('[data-tab="diagram"]');

    await click('.diagram__expand');
    expect(root.querySelector('[role="dialog"] app-schema-diagram')).not.toBeNull();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();
    expect(root.querySelector('[role="dialog"]')).toBeNull();
  });

  it('explains that PostgreSQL is still starting', async () => {
    const { root } = await setup('loading');

    expect(root.querySelector('.panel__status')?.textContent).toContain('Preparando PostgreSQL');
  });
});
