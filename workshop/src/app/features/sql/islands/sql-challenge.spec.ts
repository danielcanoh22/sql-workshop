import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EngineStatus, SqlEngineService } from '../../../core/sql/sql-engine.service';
import { CheckOutcome, SqlResultSet, SqlRunOutcome } from '../../../core/sql/sql.model';
import { SqlEditor } from '../ui/sql-editor';
import { SqlChallenge } from './sql-challenge';

@Component({ selector: 'app-sql-editor', template: '<textarea [value]="code()"></textarea>' })
class FakeEditor {
  readonly code = input.required<string>();
  readonly schema = input<unknown>({});
  readonly label = input('');
  readonly codeChange = output<string>();
  readonly runRequested = output<void>();
  readonly setCode = vi.fn((code: string) => this.codeChange.emit(code));
}

const names = (...values: string[]): SqlResultSet => ({
  command: 'SELECT',
  columns: [{ name: 'first_name', typeId: 25 }],
  rows: values.map((v) => [v]),
  rowCount: values.length,
});

const PROPS = {
  solutionSql: "SELECT first_name FROM customers WHERE city = 'Madrid' ORDER BY first_name;",
  ordered: true,
  starter: 'SELECT',
};

function setup(check: CheckOutcome, props: object = PROPS) {
  const run: SqlRunOutcome = { ok: true, durationMs: 1, results: [names('Ana')] };
  const engine = {
    status: signal<EngineStatus>('ready'),
    revision: signal(0),
    schema: vi.fn().mockResolvedValue({ tables: [] }),
    run: vi.fn().mockResolvedValue(run),
    check: vi.fn().mockResolvedValue(check),
  };
  TestBed.configureTestingModule({ providers: [{ provide: SqlEngineService, useValue: engine }] });
  TestBed.overrideComponent(SqlChallenge, { remove: { imports: [SqlEditor] }, add: { imports: [FakeEditor] } });
  const fixture = TestBed.createComponent(SqlChallenge);
  fixture.componentRef.setInput('props', props);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const editor = () => fixture.debugElement.query((el) => el.componentInstance instanceof FakeEditor).componentInstance as FakeEditor;
  const click = async (selector: string) => {
    root.querySelector<HTMLButtonElement>(selector)!.click();
    await fixture.whenStable();
  };
  return { fixture, root, engine, editor, click };
}

const CORRECT: CheckOutcome = { verdict: 'correct', message: '¡Correcto! Tu resultado coincide con el esperado.' };

describe('SqlChallenge', () => {
  it('starts from the starter code', () => {
    const { root } = setup(CORRECT);

    expect(root.querySelector('textarea')?.value).toBe('SELECT');
  });

  it('checks the answer against the reference solution with the challenge options', async () => {
    const { root, engine, editor, click } = setup(CORRECT, { ...PROPS, verifySql: 'SELECT 1', setupSql: 'SELECT 2' });

    editor().codeChange.emit("SELECT first_name FROM customers WHERE city = 'Madrid' ORDER BY 1");
    await click('.challenge__check');

    expect(engine.check).toHaveBeenCalledWith("SELECT first_name FROM customers WHERE city = 'Madrid' ORDER BY 1", {
      solutionSql: PROPS.solutionSql,
      ordered: true,
      verifySql: 'SELECT 1',
      setupSql: 'SELECT 2',
    });
    const verdict = root.querySelector('.verdict')!;
    expect(verdict.classList).toContain('verdict--correct');
    expect(verdict.textContent).toContain('¡Correcto!');
  });

  it('explains a wrong answer and shows its result next to the expected one', async () => {
    const { root, click } = setup({
      verdict: 'row-count',
      message: 'Tu consulta devuelve 1 fila y se esperaban 3.',
      actual: names('Ana'),
      expected: names('Alba', 'Ana', 'Camila'),
    });

    await click('.challenge__check');

    const verdict = root.querySelector('.verdict')!;
    expect(verdict.classList).toContain('verdict--wrong');
    expect(verdict.textContent).toContain('se esperaban 3');
    const [mine, expected] = [...root.querySelectorAll('.verdict__side')];
    expect(mine.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(expected.querySelectorAll('tbody tr')).toHaveLength(3);
  });

  it('shows the SQL error of an answer that does not run', async () => {
    const { root, click } = setup({
      verdict: 'user-error',
      message: 'Tu SQL produjo un error.',
      userError: { message: 'syntax error at or near "SELEC"', position: 1 },
    });

    await click('.challenge__check');

    expect(root.querySelector('.verdict [role="alert"]')?.textContent).toContain('syntax error at or near "SELEC"');
  });

  it('cannot be checked while the editor is empty', () => {
    const { fixture, root, editor } = setup(CORRECT);

    editor().codeChange.emit('   ');
    fixture.detectChanges();

    expect(root.querySelector<HTMLButtonElement>('.challenge__check')!.disabled).toBe(true);
  });

  it('can also run the answer on the playground to explore the data', async () => {
    const { root, engine, click } = setup(CORRECT);

    await click('.challenge__run');

    expect(engine.run).toHaveBeenCalledWith('SELECT');
    expect(root.querySelector('.challenge__output td')?.textContent).toBe('Ana');
  });
});
