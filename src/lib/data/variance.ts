/* PLAN AGAINST ACTUAL — WHERE THE VARIANCE SITS (12 November, docs/LUNA-DEMO.md — Rowland: "I upload a workbook and ask why there is
 * a significant variance … she should understand the structure, find the relevant sheets and columns, investigate, and explain what was
 * found, the supporting figures, sources, what is established, what is uncertain, and the next step").
 *
 * The same decomposition as a change between two periods (lib/data/change) with the plan as "before" and the actual as "after": the
 * totals, and for each field it can be broken by, each value's plan, actual and variance (actual − plan), ranked by how much of the
 * whole variance it carries; the field that concentrates it most; within that field's biggest contributor, the next field down.
 *
 * Honest by construction: a value planned with nothing recorded as actual is said as "planned, no actual recorded" (never a made-up
 * zero shortfall); a value recorded with no plan is "not in the plan"; a value that moved against the whole is said to offset it. No
 * word of good or bad unless the caller says which way is better. Pure. */
import type { Group, QueryResult } from '../workbook/query';
import { changeOf, type ByField, type Change } from './change';

export type Better = 'higher' | 'lower';

/** The whole variance: totals (plan → actual), every field's contributors, the field that concentrates it. */
export function varianceOf(totals: { plan: number; actual: number }, fields: { field: string; plan: readonly Group[]; actual: readonly Group[] }[]): Change {
  return changeOf({ before: totals.plan, after: totals.actual }, fields.map(f => ({ field: f.field, before: f.plan, after: f.actual })), 'size');
}

const w = (n: number, unit?: string) => `${Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-GB') : String(Math.round(n * 100) / 100)}${unit ? ` ${unit}` : ''}`;
const signed = (n: number, unit?: string) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${w(Math.abs(n), unit)}`;
const pc = (s: number | null) => (s === null ? '' : `${Math.round(Math.abs(s) * 100)}%`);

/** Above or below plan, and — only when told which way is better — whether that is adverse. */
export function sideOf(variance: number, better?: Better): string {
  if (!variance) return 'on plan';
  const side = variance > 0 ? 'above plan' : 'below plan';
  if (!better) return side;
  const adverse = (better === 'higher' && variance < 0) || (better === 'lower' && variance > 0);
  return `${side} (${adverse ? 'adverse' : 'favourable'})`;
}

function moverWords(m: ByField['movers'][number], unit?: string): string {
  const share = m.share === null ? '' : m.share >= 0 ? ` (${pc(m.share)} of the variance)` : ` (offsets ${pc(m.share)})`;
  const only = m.onlyIn === 'before' ? ', planned with no actual recorded' : m.onlyIn === 'after' ? ', not in the plan' : '';
  return `${m.key} ${signed(m.change, unit)}${share} — plan ${w(m.before, unit)}, actual ${w(m.after, unit)}${only}`;
}

/** The variance in words: the totals, where it sits most, the other fields' biggest contributors and the next field down. */
export function varianceSaid(v: Change, what: string, unit?: string, within?: { key: string; change: Change }, better?: Better): string {
  const head = `${what}: plan ${w(v.before, unit)}, actual ${w(v.after, unit)} — ${v.change === 0 ? 'on plan' : `${signed(v.change, unit)}${v.pct !== null ? ` (${signed(v.pct)}%)` : ''}, ${sideOf(v.change, better)}`}.`;
  if (!v.change) return `${head} With no variance in the total, no part of it can be said to carry one; each field's values are listed with their own.`;
  if (!v.best) return `${head} No field it can be broken by has more than one value here, so where the variance sits cannot be said from these figures.`;
  const top = v.best.movers.slice(0, 3).filter(m => m.change !== 0);
  const most = `It sits most in ${v.best.field}: ${top.map(m => moverWords(m, unit)).join('; ')}.`;
  const others = v.fields.filter(f => f !== v.best && f.movers.length > 1 && f.score !== null && f.movers[0].change !== 0)
    .map(f => `${f.field} — ${f.movers[0].key} ${signed(f.movers[0].change, unit)}${f.movers[0].share !== null ? ` (${pc(f.movers[0].share)})` : ''}`);
  let inner = '';
  if (within) {
    const one = !within.change.best ? within.change.fields.find(f => f.movers.length === 1 && f.movers[0].change !== 0) : undefined;
    if (one) inner = ` Within ${within.key}, all of it is on one ${one.field}: ${one.movers[0].key}.`;
    else if (within.change.best) inner = ` Within ${within.key}, it sits most in ${within.change.best.field}: ${within.change.best.movers.slice(0, 2).filter(m => m.change).map(m => `${m.key} ${signed(m.change, unit)}${m.share !== null ? ` (${m.share >= 0 ? '' : 'offsets '}${pc(m.share)} of the variance in ${within.key})` : ''}`).join('; ')}.`;
  }
  return `${head} ${most}${others.length ? ` By the other fields, the biggest contributors: ${others.join('; ')}.` : ''}${inner}`;
}

/** The variance kept as a result (a value a row: plan, actual, variance) — so it is charted, compared and reported like any other. */
export function varianceResult(f: ByField, totals: Change, sheet: string, notes: string[]): QueryResult {
  return {
    sheet, rowsScanned: 0, rowsMatched: 0,
    groups: f.movers.slice(0, 60).map(m => ({ key: [m.key], values: [m.before, m.after, m.change], rows: 0, refs: [] })),
    groupsTotal: f.movers.length, totals: [totals.before, totals.after, totals.change],
    measures: ['plan', 'actual', 'variance'], groupBy: [f.field], skipped: [], notes,
  };
}
