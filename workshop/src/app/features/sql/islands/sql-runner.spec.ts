import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EngineStatus, SqlEngineService } from '../../../core/sql/sql-engine.service';
import { SqlRunOutcome } from '../../../core/sql/sql.model';
import { SqlEditor } from '../ui/sql-editor';
import { SqlRunner } from './sql-runner';

/** Stands in for CodeMirror, which needs layout APIs jsdom does not have. */
@Component({ selector: 'app-sql-editor', template: '<textarea [value]="code()"></textarea>' })
class FakeEditor {
  readonly code = input.required<string>();
  readonly schema = input<unknown>({});
  readonly label = input('');
  readonly codeChange = output<string>();
  readonly runRequested = output<void>();
  readonly setCode = vi.fn((code: string) => this.codeChange.emit(code));
}

const ROWS: SqlRunOutcome = {
  ok: true,
  durationMs: 2,
  results: [{ command: 'SELECT', columns: [{ name: 'n', typeId: 23 }], rows: [[1]], rowCount: 1 }],
};

function setup(status: EngineStatus = 'ready', props: object = { code: 'SELECT 1;', title: 'Prueba esto' }) {
  const engine = {
    status: signal<EngineStatus>(status),
    run: vi.fn<(sql: string) => Promise<SqlRunOutcome>>().mockResolvedValue(ROWS),
  };
  TestBed.configureTestingModule({ providers: [{ provide: SqlEngineService, useValue: engine }] });
  TestBed.overrideComponent(SqlRunner, { remove: { imports: [SqlEditor] }, add: { imports: [FakeEditor] } });
  const fixture = TestBed.createComponent(SqlRunner);
  fixture.componentRef.setInput('props', props);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const editor = () => fixture.debugElement.query((el) => el.componentInstance instanceof FakeEditor).componentInstance as FakeEditor;
  const runButton = () => root.querySelector<HTMLButtonElement>('.runner__run')!;
  return { fixture, root, engine, editor, runButton };
}

describe('SqlRunner', () => {
  it('shows the title and the code in the editor', () => {
    const { root } = setup();

    expect(root.querySelector('.runner__title')?.textContent).toContain('Prueba esto');
    expect(root.querySelector('textarea')?.value).toBe('SELECT 1;');
  });

  it('runs the current code and shows the result', async () => {
    const { fixture, root, engine, editor, runButton } = setup();

    editor().codeChange.emit('SELECT 2;');
    runButton().click();
    await fixture.whenStable();

    expect(engine.run).toHaveBeenCalledWith('SELECT 2;');
    expect(root.querySelector('app-result-view td')?.textContent).toBe('1');
  });

  it('runs on Ctrl+Enter from the editor', async () => {
    const { fixture, engine, editor } = setup();

    editor().runRequested.emit();
    await fixture.whenStable();

    expect(engine.run).toHaveBeenCalledWith('SELECT 1;');
  });

  it('disables running while PostgreSQL is starting and explains why', () => {
    const { root, runButton } = setup('loading');

    expect(runButton().disabled).toBe(true);
    expect(root.querySelector('.runner__status')?.textContent).toContain('Preparando PostgreSQL');
  });

  it('tells the learner when the database could not start', () => {
    const { root, runButton } = setup('error');

    expect(runButton().disabled).toBe(true);
    expect(root.querySelector('.runner__status')?.textContent).toContain('No se pudo iniciar');
  });

  it('offers restoring the original code only after it was edited', async () => {
    const { fixture, root, editor } = setup();
    const restore = () => root.querySelector<HTMLButtonElement>('.runner__restore');

    expect(restore()).toBeNull();
    editor().codeChange.emit('SELECT 99;');
    fixture.detectChanges();
    restore()!.click();
    fixture.detectChanges();

    expect(editor().setCode).toHaveBeenCalledWith('SELECT 1;');
    expect(restore()).toBeNull();
  });
});
