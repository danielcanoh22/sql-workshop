import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal, untracked } from '@angular/core';
import { SchemaStore } from '../../../core/sql/schema.store';
import { SqlEngineService } from '../../../core/sql/sql-engine.service';
import { SqlRunOutcome } from '../../../core/sql/sql.model';
import { ResultView } from '../ui/result-view';
import { SchemaDiagram } from './schema-diagram';

type Tab = 'tables' | 'diagram';

/**
 * Smart panel showing the data the learner is working with: tables, columns, keys, sample rows and the
 * relationship diagram. It refreshes after every statement, so the effect of an INSERT or UPDATE is visible.
 */
@Component({
  selector: 'app-data-panel',
  imports: [ResultView, SchemaDiagram],
  templateUrl: './data-panel.html',
  styleUrl: './data-panel.scss',
  host: { '(document:keydown.escape)': 'diagramExpanded.set(false)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataPanel {
  readonly closed = output<void>();

  private readonly engine = inject(SqlEngineService);
  private readonly store = inject(SchemaStore);

  protected readonly status = this.engine.status;
  protected readonly dataset = this.engine.dataset;
  protected readonly transaction = this.engine.transaction;
  protected readonly tables = computed(() => this.store.schema()?.tables ?? []);
  protected readonly tab = signal<Tab>('tables');
  protected readonly confirmingReset = signal(false);
  protected readonly previewTable = signal<string | undefined>(undefined);
  protected readonly preview = signal<SqlRunOutcome | undefined>(undefined);
  protected readonly diagramExpanded = signal(false);

  constructor() {
    // Re-read the open preview whenever the playground changes.
    effect(() => {
      this.engine.revision();
      const table = this.previewTable();
      if (table && this.status() === 'ready' && this.transaction() !== 'failed') {
        untracked(() => this.loadPreview(table));
      }
    });
  }

  protected rowsText(count: number): string {
    return `${count} ${count === 1 ? 'fila' : 'filas'}`;
  }

  protected togglePreview(table: string): void {
    this.preview.set(undefined);
    this.previewTable.update((current) => (current === table ? undefined : table));
  }

  protected async confirmReset(): Promise<void> {
    this.confirmingReset.set(false);
    await this.engine.reset();
  }

  private async loadPreview(table: string): Promise<void> {
    const outcome = await this.engine.preview(table);
    if (this.previewTable() === table) {
      this.preview.set(outcome);
    }
  }
}
