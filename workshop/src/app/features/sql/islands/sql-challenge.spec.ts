import { Component, input, output, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { STEP_CONTEXT, StepContext } from '../../../core/content/islands';
import { ChallengeProgressService, challengeKey } from '../../../core/progress/challenge-progress.service';
import { PROGRESS_STORAGE } from '../../../core/progress/progress.service';
import { EngineStatus, SqlEngineService } from '../../../core/sql/sql-engine.service';
import { CheckOutcome, CompareOutcome, SqlResultSet, SqlRunOutcome } from '../../../core/sql/sql.model';
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

interface SetupOptions {
  /** Step the challenge is rendered in; omitted, nothing is saved. */
  readonly context?: StepContext;
  /** Runs before the component is created, e.g. to simulate progress saved in a previous visit. */
  readonly before?: (progress: ChallengeProgressService) => void;
}

function setup(check: CheckOutcome, props: object = PROPS, options: SetupOptions = {}) {
  const run: SqlRunOutcome = { ok: true, durationMs: 1, results: [names('Ana')] };
  const engine = {
    status: signal<EngineStatus>('ready'),
    revision: signal(0),
    schema: vi.fn().mockResolvedValue({ tables: [] }),
    run: vi.fn().mockResolvedValue(run),
    check: vi.fn().mockResolvedValue(check),
    compare: vi.fn(),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: SqlEngineService, useValue: engine },
      { provide: PROGRESS_STORAGE, useValue: null },
      ...(options.context ? [{ provide: STEP_CONTEXT, useValue: signal(options.context) }] : []),
    ],
  });
  TestBed.overrideComponent(SqlChallenge, { remove: { imports: [SqlEditor] }, add: { imports: [FakeEditor] } });
  const progress = TestBed.inject(ChallengeProgressService);
  options.before?.(progress);
  const fixture = TestBed.createComponent(SqlChallenge);
  fixture.componentRef.setInput('props', props);
  fixture.detectChanges();
  const root = fixture.nativeElement as HTMLElement;
  const editor = () => fixture.debugElement.query((el) => el.componentInstance instanceof FakeEditor).componentInstance as FakeEditor;
  const click = async (selector: string) => {
    root.querySelector<HTMLButtonElement>(selector)!.click();
    await fixture.whenStable();
  };
  return { fixture, root, engine, editor, click, progress };
}

const CORRECT: CheckOutcome = { verdict: 'correct', message: '¡Correcto! Tu resultado coincide con el esperado.' };
const WRONG: CheckOutcome = { verdict: 'values', message: 'Algunos valores no coinciden.' };

describe('SqlChallenge progress', () => {
  const context: StepContext = { slug: 'select-where', stepId: 'where-filters' };
  const titled = { ...PROPS, title: 'Clientes de Madrid' };
  const key = challengeKey('select-where', 'where-filters', 'Clientes de Madrid');

  it('restores the last saved answer instead of the starter code', () => {
    const { root } = setup(CORRECT, titled, { context, before: (p) => p.saveAnswer(key, 'SELECT saved') });

    expect(root.querySelector('textarea')?.value).toBe('SELECT saved');
  });

  it('saves the answer while the learner types', () => {
    const { editor, progress } = setup(CORRECT, titled, { context });

    editor().codeChange.emit('SELECT typed');

    expect(progress.answer(key)).toBe('SELECT typed');
  });

  it('marks the challenge as solved after a correct check, and only then', async () => {
    const wrong = setup(WRONG, titled, { context });
    await wrong.click('.challenge__check');
    expect(wrong.progress.isSolved(key)).toBe(false);
    expect(wrong.root.querySelector('.challenge__solved')).toBeNull();

    TestBed.resetTestingModule();
    const right = setup(CORRECT, titled, { context });
    await right.click('.challenge__check');
    right.fixture.detectChanges();
    expect(right.progress.isSolved(key)).toBe(true);
    expect(right.root.querySelector('.challenge__solved')?.textContent).toContain('Resuelto');
  });

  it('shows challenges solved in a previous visit as solved', () => {
    const { root } = setup(CORRECT, titled, { context, before: (p) => p.markSolved(key) });

    expect(root.querySelector('.challenge__solved')).not.toBeNull();
  });

  it('starts over from the starter code, forgetting the saved answer but not the solved mark', async () => {
    const { fixture, root, editor, progress, click } = setup(CORRECT, titled, {
      context,
      before: (p) => {
        p.saveAnswer(key, 'SELECT saved');
        p.markSolved(key);
      },
    });

    await click('.challenge__check');
    await click('.challenge__restart');
    fixture.detectChanges();

    expect(editor().setCode).toHaveBeenCalledWith('SELECT');
    expect(progress.answer(key)).toBeUndefined();
    expect(progress.isSolved(key)).toBe(true);
    expect(root.querySelector('.verdict')).toBeNull();
    expect(root.querySelector('.challenge__restart')).toBeNull();
  });

  it('saves nothing outside a tutorial step', async () => {
    const { editor, progress, click } = setup(CORRECT, titled);

    editor().codeChange.emit('SELECT typed');
    await click('.challenge__check');

    expect(progress.answer(key)).toBeUndefined();
    expect(progress.isSolved(key)).toBe(false);
  });
});

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

  it('offers comparing a correct answer with the recommended solution', async () => {
    const { root, engine, editor, click } = setup(CORRECT, { ...PROPS, setupSql: 'SELECT 2' });
    const compared: CompareOutcome = {
      variants: ['answer', 'solution'].map((id) => ({ id, run: { ok: true, durationMs: 1, results: [] }, sameResultAsFirst: true })),
    };
    engine.compare.mockResolvedValue(compared);

    expect(root.querySelector('.verdict__compare-solution')).toBeNull();
    editor().codeChange.emit('SELECT mine');
    await click('.challenge__check');
    await click('.verdict__compare-solution');

    expect(engine.compare).toHaveBeenCalledWith(
      [
        { id: 'answer', sql: 'SELECT mine' },
        { id: 'solution', sql: PROPS.solutionSql },
      ],
      'SELECT 2',
    );
    expect([...root.querySelectorAll('app-comparison-view .variant__label')].map((l) => l.textContent?.trim())).toEqual([
      'Tu solución',
      'Solución recomendada',
    ]);
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
