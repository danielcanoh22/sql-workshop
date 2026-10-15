import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import { IslandComponent } from '../../../core/content/islands';
import { SqlEngineService } from '../../../core/sql/sql-engine.service';
import { SqlRunOutcome } from '../../../core/sql/sql.model';
import { ResultView } from '../ui/result-view';
import { SqlEditor } from '../ui/sql-editor';

export interface SqlRunnerProps {
  readonly code: string;
  readonly title?: string;
}

/** Island for ```sql run fences: an editable query, a Run button and its result, on the tutorial playground. */
@Component({
  selector: 'app-sql-runner',
  imports: [SqlEditor, ResultView],
  templateUrl: './sql-runner.html',
  styleUrl: './sql-runner.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SqlRunner implements IslandComponent<SqlRunnerProps> {
  readonly props = input.required<SqlRunnerProps>();

  private readonly engine = inject(SqlEngineService);
  // Queried by template reference so the editor can be swapped (e.g. in tests) without changing this component.
  private readonly editor = viewChild.required<Pick<SqlEditor, 'setCode'>>('editor');

  protected readonly code = linkedSignal(() => this.props().code);
  protected readonly running = signal(false);
  protected readonly outcome = signal<{ sql: string; result: SqlRunOutcome } | undefined>(undefined);

  protected readonly edited = computed(() => this.code() !== this.props().code);
  protected readonly status = this.engine.status;
  protected readonly canRun = computed(() => this.status() === 'ready' && !this.running());

  protected async run(): Promise<void> {
    if (!this.canRun()) {
      return;
    }
    const sql = this.code();
    this.running.set(true);
    try {
      this.outcome.set({ sql, result: await this.engine.run(sql) });
    } finally {
      this.running.set(false);
    }
  }

  protected restore(): void {
    this.editor().setCode(this.props().code);
    this.code.set(this.props().code);
  }
}
