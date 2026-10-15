import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { CompareVariantOutcome, PlanNode } from '../../../core/sql/sql.model';
import { ResultView } from './result-view';

export interface ComparisonItem {
  readonly label: string;
  readonly sql: string;
  readonly best?: boolean;
  readonly outcome: CompareVariantOutcome;
  /** Trusted HTML rendered from the tutorial Markdown. */
  readonly explanationHtml?: string;
}

/**
 * Presentational: side-by-side comparison of query variants. Pages read is the headline metric because, unlike
 * milliseconds measured in WebAssembly, it does not depend on the learner's machine.
 */
@Component({
  selector: 'app-comparison-view',
  imports: [ResultView, NgTemplateOutlet],
  templateUrl: './comparison-view.html',
  styleUrl: './comparison-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparisonView {
  readonly items = input.required<readonly ComparisonItem[]>();

  private readonly maxPages = computed(() => Math.max(1, ...this.items().map((item) => item.outcome.plan?.pagesRead ?? 0)));

  protected barWidth(pages: number): string {
    return `${Math.round((pages / this.maxPages()) * 100)}%`;
  }

  protected rowsReturned(item: ComparisonItem): number | undefined {
    const run = item.outcome.run;
    if (!run.ok) return undefined;
    const last = [...run.results].reverse().find((r) => r.columns.length > 0);
    return last?.rows.length ?? run.results.at(-1)?.rowCount;
  }

  protected sameLabel(index: number, item: ComparisonItem): string {
    if (index === 0) return 'Referencia';
    return item.outcome.sameResultAsFirst ? 'Igual' : 'Distinto';
  }

  protected scanClass(scanType: string): string {
    if (scanType === 'Seq Scan') return 'scan--seq';
    if (scanType.includes('Index') || scanType.includes('Bitmap')) return 'scan--index';
    return 'scan--other';
  }

  protected formatMs(ms: number): string {
    if (ms < 0.01) return '<0.01 ms';
    return `${ms < 1 ? Number(ms.toFixed(2)) : Math.round(ms)} ms`;
  }

  protected nodeText(node: PlanNode): string {
    return [
      node.nodeType,
      node.relation ? `en ${node.relation}` : '',
      node.index ? `usando ${node.index}` : '',
      node.actualRows !== undefined
        ? `· ${node.actualRows} ${node.actualRows === 1 ? 'fila' : 'filas'}` +
          ((node.actualLoops ?? 1) > 1 ? ` × ${node.actualLoops} vueltas` : '')
        : '',
    ]
      .filter(Boolean)
      .join(' ');
  }
}
