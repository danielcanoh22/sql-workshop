import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { ChallengeIslandProps } from '../../../core/content/markdown-blocks';
import { IslandComponent } from '../../../core/content/islands';
import { SchemaStore } from '../../../core/sql/schema.store';
import { SqlEngineService } from '../../../core/sql/sql-engine.service';
import { CheckOutcome, CheckSpec, SqlResultSet, SqlRunOutcome } from '../../../core/sql/sql.model';
import { ResultView } from '../ui/result-view';
import { SqlEditor } from '../ui/sql-editor';

/**
 * Island for `::::challenge` blocks with a SQL solution: the learner writes an answer, can run it on the playground
 * to explore, and checks it. Checking runs answer and reference solution on fresh copies of the dataset and compares
 * their results, so any correct query is accepted, not just the one in the solution.
 */
@Component({
  selector: 'app-sql-challenge',
  imports: [SqlEditor, ResultView],
  templateUrl: './sql-challenge.html',
  styleUrl: './sql-challenge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SqlChallenge implements IslandComponent<ChallengeIslandProps> {
  readonly props = input.required<ChallengeIslandProps>();

  private readonly engine = inject(SqlEngineService);

  protected readonly completion = inject(SchemaStore).completion;
  protected readonly starter = computed(() => this.props().starter ?? '');
  protected readonly code = linkedSignal(() => this.starter());
  protected readonly busy = signal<'run' | 'check' | undefined>(undefined);
  protected readonly runOutcome = signal<{ sql: string; result: SqlRunOutcome } | undefined>(undefined);
  protected readonly check = signal<{ sql: string; outcome: CheckOutcome } | undefined>(undefined);

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
    try {
      this.check.set({ sql, outcome: await this.engine.check(sql, spec) });
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
