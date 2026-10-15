import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { CompareIslandProps } from '../../../core/content/markdown-blocks';
import { IslandComponent } from '../../../core/content/islands';
import { SchemaStore } from '../../../core/sql/schema.store';
import { SqlEngineService } from '../../../core/sql/sql-engine.service';
import { CompareVariant } from '../../../core/sql/sql.model';
import { ComparisonItem, ComparisonView } from '../ui/comparison-view';
import { SqlEditor } from '../ui/sql-editor';

/**
 * Island for `:::compare` blocks: several ways to get the same data, run on the same fresh copy of the dataset and
 * compared by the work PostgreSQL did. Queries stay editable so the learner can test their own ideas, and the
 * explanations appear only after running, so they predict first.
 */
@Component({
  selector: 'app-sql-compare',
  imports: [SqlEditor, ComparisonView],
  templateUrl: './sql-compare.html',
  styleUrl: './sql-compare.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SqlCompare implements IslandComponent<CompareIslandProps> {
  readonly props = input.required<CompareIslandProps>();

  private readonly engine = inject(SqlEngineService);

  protected readonly completion = inject(SchemaStore).completion;
  protected readonly queries = linkedSignal(() => this.props().variants.map((variant) => variant.sql));
  protected readonly running = signal(false);
  protected readonly items = signal<ComparisonItem[] | undefined>(undefined);
  protected readonly canRun = computed(() => this.engine.status() === 'ready' && !this.running());

  protected setQuery(index: number, sql: string): void {
    this.queries.update((queries) => queries.map((query, i) => (i === index ? sql : query)));
  }

  protected async run(): Promise<void> {
    if (!this.canRun()) return;
    const { variants, setupSql } = this.props();
    const queries = this.queries();
    const request: CompareVariant[] = variants.map((variant, index) => ({
      id: String(index),
      sql: queries[index],
      ...(variant.setupSql !== undefined ? { setupSql: variant.setupSql } : {}),
    }));

    this.running.set(true);
    try {
      const outcome = await this.engine.compare(request, setupSql);
      this.items.set(
        variants.map((variant, index) => ({
          label: variant.label,
          sql: queries[index],
          ...(variant.best ? { best: true } : {}),
          outcome: outcome.variants[index],
          explanationHtml: variant.explanationHtml,
        })),
      );
    } finally {
      this.running.set(false);
    }
  }
}
