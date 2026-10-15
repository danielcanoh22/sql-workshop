import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { ChallengeIslandProps } from '../../../core/content/markdown-blocks';
import { IslandComponent, STEP_CONTEXT } from '../../../core/content/islands';
import { ChallengeProgressService, challengeKey } from '../../../core/progress/challenge-progress.service';
import { SchemaStore } from '../../../core/sql/schema.store';
import { SqlEngineService } from '../../../core/sql/sql-engine.service';
import { CheckOutcome, CheckSpec, SqlResultSet, SqlRunOutcome } from '../../../core/sql/sql.model';
import { NgTemplateOutlet } from '@angular/common';
import { diffByFirstColumn } from '../../../core/sql/result-diff';
import { ComparisonItem, ComparisonView } from '../ui/comparison-view';
import { ResultView } from '../ui/result-view';
import { SqlEditor } from '../ui/sql-editor';

/**
 * Island for `::::challenge` blocks with a SQL solution: the learner writes an answer, can run it on the playground
 * to explore, and checks it. Checking runs answer and reference solution on fresh copies of the dataset and compares
 * their results, so any correct query is accepted, not just the one in the solution.
 */
@Component({
  selector: 'app-sql-challenge',
  imports: [SqlEditor, ResultView, ComparisonView, NgTemplateOutlet],
  templateUrl: './sql-challenge.html',
  styleUrl: './sql-challenge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SqlChallenge implements IslandComponent<ChallengeIslandProps> {
  readonly props = input.required<ChallengeIslandProps>();

  private readonly engine = inject(SqlEngineService);
  private readonly progress = inject(ChallengeProgressService);
  private readonly stepContext = inject(STEP_CONTEXT, { optional: true });
  // Queried by template reference so the editor can be swapped (e.g. in tests) without changing this component.
  private readonly editor = viewChild.required<Pick<SqlEditor, 'setCode'>>('editor');

  /** Progress is saved only for titled challenges rendered inside a tutorial step. */
  private readonly key = computed(() => {
    const context = this.stepContext?.();
    const title = this.props().title;
    return context && title ? challengeKey(context.slug, context.stepId, title) : undefined;
  });

  protected readonly completion = inject(SchemaStore).completion;
  protected readonly starter = computed(() => this.props().starter ?? '');
  /** What the editor shows when it opens: the answer saved in a previous visit, or the starter code. */
  protected readonly initialCode = computed(() => {
    const key = this.key();
    return (key && untracked(() => this.progress.answer(key))) ?? this.starter();
  });
  protected readonly code = linkedSignal(() => this.initialCode());
  protected readonly solved = computed(() => {
    const key = this.key();
    return !!key && this.progress.isSolved(key);
  });
  protected readonly canRestart = computed(() => this.code() !== this.starter());
  protected readonly busy = signal<'run' | 'check' | 'compare' | undefined>(undefined);
  protected readonly runOutcome = signal<{ sql: string; result: SqlRunOutcome } | undefined>(undefined);
  protected readonly check = signal<{ sql: string; outcome: CheckOutcome } | undefined>(undefined);
  protected readonly comparison = signal<ComparisonItem[] | undefined>(undefined);
  /** For results keyed by their first column (e.g. verification checks): only the rows that differ. */
  protected readonly differences = computed(() => {
    const outcome = this.check()?.outcome;
    if (!outcome?.actual || !outcome.expected || outcome.verdict === 'correct') return undefined;
    const differences = diffByFirstColumn(outcome.actual, outcome.expected);
    return differences?.length ? differences : undefined;
  });

  protected readonly ready = computed(() => this.engine.status() === 'ready' && !this.busy());
  protected readonly hasCode = computed(() => this.code().trim().length > 0);

  protected async run(): Promise<void> {
    if (!this.ready() || !this.hasCode()) return;
    const sql = this.code();
    this.busy.set('run');
    try {
      this.runOutcome.set({ sql, result: await this.engine.run(sql) });
    } finally {
      this.busy.set(undefined);
    }
  }

  protected async verify(): Promise<void> {
    if (!this.ready() || !this.hasCode()) return;
    const sql = this.code();
    const { solutionSql, ordered, verifySql, setupSql } = this.props();
    const spec: CheckSpec = {
      solutionSql,
      ...(ordered ? { ordered } : {}),
      ...(verifySql !== undefined ? { verifySql } : {}),
      ...(setupSql !== undefined ? { setupSql } : {}),
    };
    this.busy.set('check');
    this.comparison.set(undefined);
    try {
      const outcome = await this.engine.check(sql, spec);
      this.check.set({ sql, outcome });
      const key = this.key();
      if (outcome.verdict === 'correct' && key) {
        this.progress.markSolved(key);
      }
    } finally {
      this.busy.set(undefined);
    }
  }

  protected edit(sql: string): void {
    this.code.set(sql);
    const key = this.key();
    if (!key) return;
    if (sql === this.starter()) {
      this.progress.clearAnswer(key);
    } else {
      this.progress.saveAnswer(key, sql);
    }
  }

  /** Back to the starter code. The challenge stays solved: what was learned is not undone. */
  protected restart(): void {
    this.editor().setCode(this.starter());
    this.edit(this.starter());
    this.runOutcome.set(undefined);
    this.check.set(undefined);
    this.comparison.set(undefined);
  }

  /** After a correct answer: how much work did it take compared with the recommended solution? */
  protected async compareWithSolution(): Promise<void> {
    const answer = this.check()?.sql;
    if (!answer || !this.ready()) return;
    const { solutionSql, setupSql } = this.props();
    this.busy.set('compare');
    try {
      const outcome = await this.engine.compare(
        [
          { id: 'answer', sql: answer },
          { id: 'solution', sql: solutionSql },
        ],
        setupSql,
      );
      this.comparison.set([
        { label: 'Tu solución', sql: answer, outcome: outcome.variants[0] },
        { label: 'Solución recomendada', sql: solutionSql, best: true, outcome: outcome.variants[1] },
      ]);
    } finally {
      this.busy.set(undefined);
    }
  }

  protected asOutcome(result: SqlResultSet): SqlRunOutcome {
    return { ok: true, results: [result], durationMs: 0 };
  }

  protected errorOutcome(outcome: CheckOutcome): SqlRunOutcome {
    return { ok: false, error: outcome.userError ?? { message: outcome.message }, durationMs: 0 };
  }
}
