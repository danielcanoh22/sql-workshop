import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CompareIslandProps } from '../../../core/content/markdown-blocks';
import { EngineStatus, SqlEngineService } from '../../../core/sql/sql-engine.service';
import { CompareOutcome } from '../../../core/sql/sql.model';
import { SqlEditor } from '../ui/sql-editor';
import { SqlCompare } from './sql-compare';

@Component({ selector: 'app-sql-editor', template: '<textarea [value]="code()"></textarea>' })
class FakeEditor {
  readonly code = input.required<string>();
  readonly schema = input<unknown>({});
  readonly label = input('');
  readonly codeChange = output<string>();
  readonly runRequested = output<void>();
  readonly setCode = vi.fn((code: string) => this.codeChange.emit(code));
}

const PROPS: CompareIslandProps = {
  title: 'Buscar por email',
  setupSql: 'CREATE INDEX i ON customers (email);',
  variants: [
    { label: 'Con función', sql: 'SELECT 1', explanationHtml: '<p>Lenta</p>' },
    { label: 'Directa', sql: 'SELECT 2', setupSql: 'ANALYZE customers;', best: true, explanationHtml: '<p>Rápida</p>' },
  ],
};

const OUTCOME: CompareOutcome = {
  variants: [0, 1].map((i) => ({
    id: String(i),
    run: { ok: true, durationMs: 1, results: [] },
    sameResultAsFirst: true,
  })),
};

function setup(status: EngineStatus = 'ready') {
  const engine = {
    status: signal<EngineStatus>(status),
    revision: signal(0),
    schema: vi.fn().mockResolvedValue({ tables: [] }),
    compare: vi.fn().mockResolvedValue(OUTCOME),
  };
  TestBed.configureTestingModule({ providers: [{ provide: SqlEngineService, useValue: engine }] });
  TestBed.overrideComponent(SqlCompare, { remove: { imports: [SqlEditor] }, add: { imports: [FakeEditor] } });
  const fixture = TestBed.createComponent(SqlCompare);
  fixture.componentRef.setInput('props', PROPS);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const editors = () =>
    fixture.debugElement.queryAll((el) => el.name === 'app-sql-editor').map((el) => el.componentInstance as FakeEditor);
  const run = async () => {
    root.querySelector<HTMLButtonElement>('.compare__run')!.click();
    await fixture.whenStable();
  };
  return { fixture, root, engine, editors, run };
}

describe('SqlCompare', () => {
  it('shows the title and an editable query per variant, with its label', () => {
    const { root, editors } = setup();

    expect(root.querySelector('.compare__title')?.textContent).toContain('Buscar por email');
    expect([...root.querySelectorAll('.compare__variant-label')].map((l) => l.textContent?.trim())).toEqual(['Con función', 'Directa']);
    expect(editors().map((e) => e.code())).toEqual(['SELECT 1', 'SELECT 2']);
  });

  it('asks for a prediction and keeps the explanations hidden until the comparison runs', () => {
    const { root } = setup();

    expect(root.querySelector('.compare__prompt')?.textContent).toContain('¿cuál crees que hará menos trabajo');
    expect(root.querySelector('app-comparison-view')).toBeNull();
  });

  it('compares the current queries on the same data and shows the results with the explanations', async () => {
    const { root, engine, editors, run } = setup();

    editors()[0].codeChange.emit('SELECT 10');
    await run();

    expect(engine.compare).toHaveBeenCalledWith(
      [
        { id: '0', sql: 'SELECT 10' },
        { id: '1', sql: 'SELECT 2', setupSql: 'ANALYZE customers;' },
      ],
      'CREATE INDEX i ON customers (email);',
    );
    expect(root.querySelectorAll('app-comparison-view .variant')).toHaveLength(2);
    expect(root.querySelector('app-comparison-view .variant__explanation')?.textContent).toContain('Lenta');
  });

  it('cannot run until PostgreSQL is ready', () => {
    const { root } = setup('loading');

    expect(root.querySelector<HTMLButtonElement>('.compare__run')!.disabled).toBe(true);
  });
});
