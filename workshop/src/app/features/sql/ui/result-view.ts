import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SqlResultSet, SqlRunOutcome } from '../../../core/sql/sql.model';
import { formatValue } from '../../../core/sql/value-format';

export const MAX_VISIBLE_ROWS = 100;

interface ResultBlock {
  readonly result: SqlResultSet;
  readonly visibleRows: readonly (readonly unknown[])[];
}

/** Presentational: the outcome of running SQL, as psql would show it but friendlier. */
@Component({
  selector: 'app-result-view',
  templateUrl: './result-view.html',
  styleUrl: './result-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResultView {
  readonly outcome = input.required<SqlRunOutcome>();
  /** The SQL that produced the outcome; used to turn an error position into line and column. */
  readonly sql = input('');
  readonly showTiming = input(true);

  protected readonly format = formatValue;
  protected readonly maxRows = MAX_VISIBLE_ROWS;

  protected readonly blocks = computed<ResultBlock[]>(() => {
    const outcome = this.outcome();
    return outcome.ok
      ? outcome.results.map((result) => ({ result, visibleRows: result.rows.slice(0, MAX_VISIBLE_ROWS) }))
      : [];
  });

  protected readonly error = computed(() => {
    const outcome = this.outcome();
    return outcome.ok ? undefined : outcome.error;
  });

  protected readonly errorLocation = computed(() => {
    const position = this.error()?.position;
    if (!position) {
      return undefined;
    }
    const before = this.sql().slice(0, position - 1).split('\n');
    return { line: before.length, column: before[before.length - 1].length + 1 };
  });

  protected readonly durationText = computed(() => {
    const ms = this.outcome().durationMs;
    return ms < 1 ? '<1 ms' : `${Math.round(ms)} ms`;
  });

  protected rowsText(count: number): string {
    return `${count} ${count === 1 ? 'fila' : 'filas'}`;
  }

  protected commandText(result: SqlResultSet): string {
    if (result.rowCount === undefined) {
      return `${result.command} · hecho`;
    }
    return `${result.command} · ${result.rowCount} ${result.rowCount === 1 ? 'fila afectada' : 'filas afectadas'}`;
  }
}
