import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SchemaTable } from '../../../core/sql/sql.model';
import { DiagramEdge, HEADER_HEIGHT, layoutSchema } from './schema-layout';

const MARGIN = 12;

/** Presentational: entity-relationship diagram of the playground, drawn as SVG. */
@Component({
  selector: 'app-schema-diagram',
  template: `
    @if (layout(); as layout) {
      <div class="diagram" tabindex="0" role="region" aria-label="Diagrama de relaciones">
        <svg
          [attr.width]="layout.width + margin * 2"
          [attr.height]="layout.height + margin * 2"
          [attr.viewBox]="viewBox()"
          role="img"
          aria-label="Tablas y claves foráneas"
        >
          @for (edge of layout.edges; track edge.label) {
            <path class="edge" [attr.d]="path(edge)"><title>{{ edge.label }}</title></path>
            <circle class="edge__end" [attr.cx]="edge.to.x" [attr.cy]="edge.to.y" r="3" />
          }
          @for (box of layout.boxes; track box.table) {
            <g class="box">
              <rect class="box__frame" [attr.x]="box.x" [attr.y]="box.y" [attr.width]="box.width" [attr.height]="box.height" rx="8" />
              <rect class="box__header" [attr.x]="box.x" [attr.y]="box.y" [attr.width]="box.width" [attr.height]="headerHeight" rx="8" />
              <text class="box__title" [attr.x]="box.x + 10" [attr.y]="box.y + 20">{{ box.table }}</text>
              @for (column of box.columns; track column.name) {
                <text class="box__column" [class.box__column--key]="column.isPrimaryKey" [attr.x]="box.x + 10" [attr.y]="column.y + 4">
                  {{ column.isPrimaryKey ? '🔑 ' : column.references ? '↗ ' : '' }}{{ column.name }}
                </text>
                <text class="box__type" [attr.x]="box.x + box.width - 10" [attr.y]="column.y + 4" text-anchor="end">{{ column.type }}</text>
              }
            </g>
          }
        </svg>
      </div>
    }
  `,
  styles: `
    .diagram {
      overflow: auto;
      max-height: 70vh;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--ws-radius-sm);
      background: var(--mat-sys-surface);
    }
    svg {
      display: block;
      font-family: var(--ws-font-mono);
    }
    .box__frame {
      fill: var(--mat-sys-surface-container-low);
      stroke: var(--mat-sys-outline-variant);
    }
    .box__header {
      fill: color-mix(in srgb, var(--mat-sys-primary) 22%, var(--mat-sys-surface-container));
    }
    .box__title {
      font-size: 13px;
      font-weight: 700;
      fill: var(--mat-sys-on-surface);
    }
    .box__column {
      font-size: 12px;
      fill: var(--mat-sys-on-surface);
    }
    .box__column--key {
      font-weight: 700;
    }
    .box__type {
      font-size: 11px;
      fill: var(--mat-sys-on-surface-variant);
    }
    .edge {
      fill: none;
      stroke: var(--mat-sys-tertiary);
      stroke-width: 1.5;
    }
    .edge__end {
      fill: var(--mat-sys-tertiary);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SchemaDiagram {
  readonly tables = input.required<readonly SchemaTable[]>();

  protected readonly margin = MARGIN;
  protected readonly headerHeight = HEADER_HEIGHT;
  protected readonly layout = computed(() => (this.tables().length ? layoutSchema(this.tables()) : undefined));
  protected readonly viewBox = computed(() => {
    const layout = this.layout();
    return layout ? `${-MARGIN} ${-MARGIN} ${layout.width + MARGIN * 2} ${layout.height + MARGIN * 2}` : '';
  });

  /** S-shaped curve from the child column (left edge) back to the parent column (right edge). */
  protected path({ from, to }: DiagramEdge): string {
    const bend = Math.max(30, Math.abs(from.x - to.x) / 2);
    return `M ${from.x} ${from.y} C ${from.x - bend} ${from.y}, ${to.x + bend} ${to.y}, ${to.x} ${to.y}`;
  }
}
