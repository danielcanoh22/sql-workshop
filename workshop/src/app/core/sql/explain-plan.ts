import { PlanNode, PlanSummary } from './sql.model';

/** Raw node of `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`; only the keys the workshop reads. */
interface RawPlanNode {
  readonly 'Node Type': string;
  readonly 'Relation Name'?: string;
  readonly 'Index Name'?: string;
  readonly 'Actual Rows'?: number;
  readonly 'Actual Loops'?: number;
  readonly 'Actual Total Time'?: number;
  readonly 'Rows Removed by Filter'?: number;
  readonly Filter?: string;
  readonly 'Index Cond'?: string;
  readonly 'Shared Hit Blocks'?: number;
  readonly 'Shared Read Blocks'?: number;
  readonly Plans?: readonly RawPlanNode[];
}

interface RawExplain {
  readonly Plan: RawPlanNode;
  readonly 'Planning Time'?: number;
  readonly 'Execution Time'?: number;
}

/** Statement prefix that produces the plan `summarizePlan` understands. */
export const EXPLAIN_PREFIX = 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ';

/** Accepts the single cell returned by EXPLAIN ... FORMAT JSON (already parsed or still as text). */
export function summarizePlan(cell: unknown): PlanSummary {
  const parsed = (typeof cell === 'string' ? JSON.parse(cell) : cell) as readonly RawExplain[];
  const explain = parsed[0];
  const root = toNode(explain.Plan);
  const scans = collect(root).filter((node) => node.nodeType.includes('Scan'));

  return {
    root,
    executionTimeMs: explain['Execution Time'] ?? 0,
    planningTimeMs: explain['Planning Time'] ?? 0,
    rowsScanned: Math.round(
      scans.reduce((sum, node) => sum + ((node.actualRows ?? 0) + (node.rowsRemovedByFilter ?? 0)) * (node.actualLoops ?? 1), 0),
    ),
    pagesRead: (explain.Plan['Shared Hit Blocks'] ?? 0) + (explain.Plan['Shared Read Blocks'] ?? 0),
    scanTypes: [...new Set(scans.map((node) => node.nodeType))],
  };
}

function toNode(raw: RawPlanNode): PlanNode {
  return {
    nodeType: raw['Node Type'],
    relation: raw['Relation Name'],
    index: raw['Index Name'],
    actualRows: raw['Actual Rows'],
    actualLoops: raw['Actual Loops'],
    totalTimeMs: raw['Actual Total Time'],
    rowsRemovedByFilter: raw['Rows Removed by Filter'],
    filter: raw.Filter,
    indexCond: raw['Index Cond'],
    children: (raw.Plans ?? []).map(toNode),
  };
}

function collect(node: PlanNode): PlanNode[] {
  return [node, ...node.children.flatMap(collect)];
}
