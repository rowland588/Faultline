/* A RELATIONSHIP FROM A KEPT RESULT'S GROUPS — pairs read by code, never typed by the model (docs/LUNA-ANALYSIS.md A8). */
import type { QueryResult } from '../workbook/query';

const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function pairsFromResult(r: QueryResult, x: number, y: number): { pairs: { x: number; y: number }[]; grain: string; xName: string; yName: string } | { why: string } {
  if (x < 0 || x >= r.measures.length) return { why: `There is no figure at position ${x} — this result has ${r.measures.length} (${r.measures.join(', ')}).` };
  if (y < 0 || y >= r.measures.length) return { why: `There is no figure at position ${y} — this result has ${r.measures.length} (${r.measures.join(', ')}).` };
  if (!r.groups.length) return { why: 'This result is one total, not groups — ask it by day, line or another label first.' };
  const pairs: { x: number; y: number }[] = [];
  for (const g of r.groups) {
    const xv = num(g.values[x]), yv = num(g.values[y]);
    if (xv === null || yv === null) continue;
    pairs.push({ x: xv, y: yv });
  }
  if (pairs.length < 3) return { why: `Only ${pairs.length} group${pairs.length === 1 ? '' : 's'} have both figures recorded — at least three pairs are needed.` };
  const by = r.groupBy.length ? r.groupBy.join(', ') : 'each row';
  const grain = `${by}, ${r.groups.length} group${r.groups.length === 1 ? '' : 's'}`;
  return { pairs, grain, xName: r.measures[x], yName: r.measures[y] };
}