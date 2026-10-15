import { SchemaColumn, SchemaTable } from '../../../core/sql/sql.model';

export const BOX_WIDTH = 210;
export const HEADER_HEIGHT = 30;
export const ROW_HEIGHT = 22;
const BOX_PADDING = 6;
const GAP_X = 70;
const GAP_Y = 24;

export interface DiagramColumn extends SchemaColumn {
  /** Vertical center of the column row, in canvas coordinates. */
  readonly y: number;
}

export interface DiagramBox {
  readonly table: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly columns: readonly DiagramColumn[];
}

export interface DiagramEdge {
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
  readonly label: string;
}

export interface DiagramLayout {
  readonly width: number;
  readonly height: number;
  readonly boxes: readonly DiagramBox[];
  readonly edges: readonly DiagramEdge[];
}

/**
 * Lays out an entity-relationship diagram: referenced ("parent") tables on the left, the tables that point to them
 * further right, so every foreign key line runs from a child's left edge to its parent's right edge.
 */
export function layoutSchema(tables: readonly SchemaTable[]): DiagramLayout {
  if (tables.length === 0) {
    return { width: 0, height: 0, boxes: [], edges: [] };
  }

  const byName = new Map(tables.map((table) => [table.name, table]));
  const levels = new Map<string, number>();
  const levelOf = (name: string, visiting: Set<string>): number => {
    const known = levels.get(name);
    if (known !== undefined) return known;
    if (visiting.has(name)) return 0; // Reference cycle: break it here.
    visiting.add(name);
    const parents = (byName.get(name)?.columns ?? [])
      .map((column) => column.references?.table)
      .filter((parent): parent is string => !!parent && parent !== name && byName.has(parent));
    const level = parents.length ? 1 + Math.max(...parents.map((parent) => levelOf(parent, visiting))) : 0;
    visiting.delete(name);
    levels.set(name, level);
    return level;
  };

  // Column by column: the first one alphabetically, the next ones by the average position of their parents
  // (barycenter heuristic), which keeps most foreign key lines from crossing.
  const parentsOf = (table: SchemaTable) =>
    table.columns.map((c) => c.references?.table).filter((p): p is string => !!p && p !== table.name);
  const position = new Map<string, number>();
  const sorted: SchemaTable[] = [];
  const maxLevel = Math.max(...tables.map((table) => levelOf(table.name, new Set())));
  for (let level = 0; level <= maxLevel; level++) {
    const barycenter = (table: SchemaTable) => {
      const known = parentsOf(table).filter((p) => position.has(p));
      return known.length ? known.reduce((sum, p) => sum + position.get(p)!, 0) / known.length : Infinity;
    };
    const column = tables
      .filter((table) => levelOf(table.name, new Set()) === level)
      .sort((a, b) => (level === 0 ? 0 : barycenter(a) - barycenter(b)) || a.name.localeCompare(b.name));
    column.forEach((table, index) => position.set(table.name, index));
    sorted.push(...column);
  }

  const nextY = new Map<number, number>();
  const boxes: DiagramBox[] = sorted.map((table) => {
    const level = levelOf(table.name, new Set());
    const x = level * (BOX_WIDTH + GAP_X);
    const y = nextY.get(level) ?? 0;
    const height = HEADER_HEIGHT + table.columns.length * ROW_HEIGHT + BOX_PADDING;
    nextY.set(level, y + height + GAP_Y);
    return {
      table: table.name,
      x,
      y,
      width: BOX_WIDTH,
      height,
      columns: table.columns.map((column, index) => ({
        ...column,
        y: y + HEADER_HEIGHT + index * ROW_HEIGHT + ROW_HEIGHT / 2,
      })),
    };
  });

  const boxByName = new Map(boxes.map((box) => [box.table, box]));
  const edges: DiagramEdge[] = boxes.flatMap((box) =>
    box.columns.flatMap((column) => {
      const target = column.references && boxByName.get(column.references.table);
      const targetColumn = target?.columns.find((c) => c.name === column.references!.column);
      if (!target || !targetColumn) return [];
      return [
        {
          from: { x: box.x, y: column.y },
          to: { x: target.x + target.width, y: targetColumn.y },
          label: `${box.table}.${column.name} → ${target.table}.${targetColumn.name}`,
        },
      ];
    }),
  );

  return {
    width: Math.max(...boxes.map((box) => box.x + box.width)),
    height: Math.max(...boxes.map((box) => box.y + box.height)),
    boxes,
    edges,
  };
}
