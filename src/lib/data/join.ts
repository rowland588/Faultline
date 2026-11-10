/* TWO RESULTS SIDE BY SIDE (10 November, docs/LUNA-NEXT.md L4 — the proposal: "the budget says 120 minutes of changeover a week, and the
 * SMED studies show 210"). Any two results — a budget sheet's minutes by reason and the stops the line timed, last month's file and this
 * month's — matched by their labels: the same words (any case, spacing or punctuation), or a pair the person said are the same thing
 * (`rules`, never guessed). Each matched label with both values, the difference (second − first) and the ratio; the labels found on one
 * side only named with their values, never dropped and never matched by a near spelling. Kept as a result. Pure. */
import type { QueryResult } from '../workbook/query';
import type { DataResult } from './outputs';

export interface JoinRule { a: string; b: string }
export interface JoinRow { label: string; labelB: string; a: number | null; b: number | null; difference: number | null; ratio: number | null; byRule?: boolean }
export interface Joined { rows: JoinRow[]; onlyA: { label: string; value: number | null }[]; onlyB: { label: string; value: number | null }[]; totals: { a: number; b: number; difference: number }; result: QueryResult }

export const labelKey = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function joinResults(a: DataResult, b: DataResult, ma: number, mb: number, rules: readonly JoinRule[]): Joined | { why: string } {
  if (ma >= a.result.measures.length) return { why: `“${a.title}” has ${a.result.measures.length} measure${a.result.measures.length === 1 ? '' : 's'} — there is no measure ${ma}.` };
  if (mb >= b.result.measures.length) return { why: `“${b.title}” has ${b.result.measures.length} measure${b.result.measures.length === 1 ? '' : 's'} — there is no measure ${mb}.` };
  if (!a.result.groups.length || !b.result.groups.length) return { why: 'Both results need labels to match — one of them is a single total. Ask each by the same kind of label (reason, product, machine).' };
  const bBy = new Map<string, { label: string; value: number | null }>();
  for (const g of b.result.groups) bBy.set(labelKey(g.key.join(' · ')), { label: g.key.join(' · '), value: num(g.values[mb]) });
  const ruled = new Map(rules.map(r => [labelKey(r.a), labelKey(r.b)]));
  const used = new Set<string>();
  const rows: JoinRow[] = [];
  const onlyA: Joined['onlyA'] = [];
  for (const g of a.result.groups) {
    const label = g.key.join(' · ');
    const k = labelKey(label);
    const bk = ruled.get(k) ?? k;
    const hit = bBy.get(bk);
    if (!hit || used.has(bk)) { onlyA.push({ label, value: num(g.values[ma]) }); continue; }
    used.add(bk);
    const x = num(g.values[ma]), y = hit.value;
    rows.push({ label, labelB: hit.label, a: x, b: y, difference: x !== null && y !== null ? y - x : null, ratio: x && y !== null ? y / x : null, ...(ruled.has(k) ? { byRule: true } : {}) });
  }
  const onlyB = [...bBy.entries()].filter(([k]) => !used.has(k)).map(([, v]) => v);
  if (!rows.length) return { why: `No label of “${a.title}” is a label of “${b.title}” — ${a.result.groups.slice(0, 4).map(g => `“${g.key.join(' · ')}”`).join(', ')} against ${b.result.groups.slice(0, 4).map(g => `“${g.key.join(' · ')}”`).join(', ')}. Ask the person which are the same thing, and pass them as rules.` };
  rows.sort((p, q) => Math.abs(q.difference ?? 0) - Math.abs(p.difference ?? 0));
  const ta = rows.reduce((s, r) => s + (r.a ?? 0), 0), tb = rows.reduce((s, r) => s + (r.b ?? 0), 0);
  const result: QueryResult = {
    sheet: `${a.title} with ${b.title}`, rowsScanned: 0, rowsMatched: rows.length,
    groups: rows.map(r => ({ key: [r.label], values: [r.a, r.b, r.difference], rows: 0, refs: [] })), groupsTotal: rows.length,
    totals: [ta, tb, tb - ta], measures: [a.result.measures[ma] ? `${a.title}` : 'first', `${b.title}`, 'difference'], groupBy: ['label'], skipped: [],
    notes: [...(onlyA.length ? [`Only in “${a.title}”: ${onlyA.map(o => o.label).join(', ')}.`] : []), ...(onlyB.length ? [`Only in “${b.title}”: ${onlyB.map(o => o.label).join(', ')}.`] : []), ...(rules.length ? ['Some labels were matched as the person said they are the same thing.'] : [])],
  };
  return { rows, onlyA, onlyB, totals: { a: ta, b: tb, difference: tb - ta }, result };
}

const w = (n: number | null) => (n === null ? 'not recorded' : Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-GB') : String(Math.round(n * 100) / 100));
export function joinSaid(j: Joined, title: string, a: DataResult, b: DataResult): string {
  const top = j.rows.slice(0, 6).map(r => `${r.label}${r.byRule ? ` (= ${r.labelB})` : ''}: ${w(r.a)} against ${w(r.b)}, ${r.difference === null ? 'no difference can be said' : `${r.difference >= 0 ? '+' : '−'}${w(Math.abs(r.difference))}`}${r.ratio !== null ? ` (${Math.round(r.ratio * 100)}%)` : ''}`);
  return `${title} — “${a.title}” (${a.source.name}) against “${b.title}” (${b.source.name}), ${j.rows.length} label${j.rows.length === 1 ? '' : 's'} matched, the biggest differences first: ${top.join('; ')}${j.rows.length > 6 ? `; … ${j.rows.length - 6} more` : ''}. Matched in all: ${w(j.totals.a)} against ${w(j.totals.b)} (${j.totals.difference >= 0 ? '+' : '−'}${w(Math.abs(j.totals.difference))}).${j.onlyA.length ? ` Only in the first: ${j.onlyA.slice(0, 8).map(o => `${o.label} ${w(o.value)}`).join(', ')}.` : ''}${j.onlyB.length ? ` Only in the second: ${j.onlyB.slice(0, 8).map(o => `${o.label} ${w(o.value)}`).join(', ')}.` : ''} A label on one side only is never matched by a near spelling — ask the person whether it is the same thing.`;
}
