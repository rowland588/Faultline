/* TWO RESULTS SIDE BY SIDE (10 November, docs/LUNA-NEXT.md L4 — the proposal: "the budget says 120 minutes of changeover a week, and the
 * SMED studies show 210"). Any two results — a budget sheet's minutes by reason and the stops the line timed, last month's file and this
 * month's — matched by their labels: the same words (any case, spacing or punctuation), or a pair the person said are the same thing
 * (`rules`, never guessed). Each matched label with both values, the difference (second − first) and the ratio; the labels found on one
 * side only named with their values, never dropped and never matched by a near spelling. Kept as a result. Pure. */
import type { QueryResult } from '../workbook/query';
import type { DataResult } from './outputs';
import { isOthers } from '../workbook/groups';

export interface JoinRule { a: string; b: string }
export interface JoinRow { label: string; labelB: string; a: number | null; b: number | null; difference: number | null; ratio: number | null; byRule?: boolean }
export interface Joined { rows: JoinRow[]; onlyA: { label: string; value: number | null }[]; onlyB: { label: string; value: number | null }[]; totals: { a: number; b: number; difference: number }; result: QueryResult;
  /** How the two were brought together, where it has to be said: the second's keys read in the first's order; a side that shows
   *  fewer groups than it has. */
  heads: string[] }

export const labelKey = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

export function joinResults(a: DataResult, b: DataResult, ma: number, mb: number, rules: readonly JoinRule[]): Joined | { why: string } {
  if (ma >= a.result.measures.length) return { why: `“${a.title}” has ${a.result.measures.length} measure${a.result.measures.length === 1 ? '' : 's'} — there is no measure ${ma}.` };
  if (mb >= b.result.measures.length) return { why: `“${b.title}” has ${b.result.measures.length} measure${b.result.measures.length === 1 ? '' : 's'} — there is no measure ${mb}.` };
  if (!a.result.groups.length || !b.result.groups.length) return { why: 'Both results need labels to match — one of them is a single total. Ask each by the same kind of label (reason, product, machine).' };
  /* THE “(k others)” OF A TOP ARE NOT A LABEL (lib/workbook/groups): two results asked for their top few each bring the rest of
     a block together under a name that says only how many — "Line 1 · (3 others)" in one is not the same three things as in the
     other. They are left out of the join, and it says so. */
  const namedOnly = (r: DataResult): DataResult['result']['groups'] => (r.result.top ? r.result.groups.filter(g => !isOthers(g.key[g.key.length - 1] ?? '')) : r.result.groups);
  const aGroups = namedOnly(a), bGroups = namedOnly(b);
  const othersLeft = (a.result.groups.length - aGroups.length) + (b.result.groups.length - bGroups.length);
  if (!aGroups.length || !bGroups.length) return { why: 'Both results need labels to match — one of them has only its “others” left. Ask each by the same kind of label (reason, product, machine).' };
  /* THE KEYS IN THE SAME ORDER (22 November, docs/LUNA-ANALYSIS.md A5): two results grouped by the same two or three things, asked
     in a different order ("machine, then day" against "day, then machine"), had no label in common — "Bagger · 2026-11-02" is not
     "2026-11-02 · Bagger". The second's keys are read in the first's order: BY THEIR NAMES where the second's are the first's in
     another order; where the names differ (a workbook's "Machine" against the app's "machine name"), by what they hold — and only
     when read in its own order the second matches NOTHING and another order matches something. Never turned round on a guess:
     two results already in the same order stay so, however their labels happen to overlap. Said when it is not its own order. */
  const ka = aGroups[0].key.length, kb = bGroups[0].key.length;
  let order = Array.from({ length: kb }, (_x, i) => i);
  if (ka === kb && kb >= 2 && kb <= 3) {
    const an = a.result.groupBy.map(labelKey), bn = b.result.groupBy.map(labelKey);
    const named = an.length === ka && bn.length === kb && new Set(an).size === ka && an.every(n => bn.includes(n));
    if (named) order = an.map(n => bn.indexOf(n));
    else {
      const perms = kb === 2 ? [[0, 1], [1, 0]] : [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
      const aKeys = new Set(aGroups.map(g => labelKey(g.key.join(' · '))));
      const hits = (p: number[]): number => bGroups.reduce((n, g) => n + (aKeys.has(labelKey(p.map(i => g.key[i]).join(' · '))) ? 1 : 0), 0);
      if (!hits(perms[0])) { let best = 0; for (const p of perms.slice(1)) { const h = hits(p); if (h > best) { best = h; order = p; } } }
    }
  }
  const reordered = order.some((x, i) => x !== i);
  const labelB = (g: { key: string[] }): string => order.map(i => g.key[i]).join(' · ');
  const bBy = new Map<string, { label: string; value: number | null }>();
  /* (a pair the person gave is written as the second result SHOWS its label — found through its own order) */
  const ownToRead = new Map<string, string>();
  for (const g of bGroups) { bBy.set(labelKey(labelB(g)), { label: labelB(g), value: num(g.values[mb]) }); ownToRead.set(labelKey(g.key.join(' · ')), labelKey(labelB(g))); }
  const ruled = new Map(rules.map(r => [labelKey(r.a), labelKey(r.b)]));
  const used = new Set<string>();
  const rows: JoinRow[] = [];
  const onlyA: Joined['onlyA'] = [];
  for (const g of aGroups) {
    const label = g.key.join(' · ');
    const k = labelKey(label);
    const rb = ruled.get(k);
    const bk = rb === undefined ? k : bBy.has(rb) ? rb : ownToRead.get(rb) ?? rb;
    const hit = bBy.get(bk);
    if (!hit || used.has(bk)) { onlyA.push({ label, value: num(g.values[ma]) }); continue; }
    used.add(bk);
    const x = num(g.values[ma]), y = hit.value;
    rows.push({ label, labelB: hit.label, a: x, b: y, difference: x !== null && y !== null ? y - x : null, ratio: x && y !== null ? y / x : null, ...(ruled.has(k) ? { byRule: true } : {}) });
  }
  const onlyB = [...bBy.entries()].filter(([k]) => !used.has(k)).map(([, v]) => v);
  if (!rows.length) return { why: `No label of “${a.title}” is a label of “${b.title}” — ${aGroups.slice(0, 4).map(g => `“${g.key.join(' · ')}”`).join(', ')} against ${bGroups.slice(0, 4).map(g => `“${g.key.join(' · ')}”`).join(', ')}. Ask the person which are the same thing, and pass them as rules.` };
  rows.sort((p, q) => Math.abs(q.difference ?? 0) - Math.abs(p.difference ?? 0));
  const ta = rows.reduce((s, r) => s + (r.a ?? 0), 0), tb = rows.reduce((s, r) => s + (r.b ?? 0), 0);
  const heads = [
    ...(reordered ? [`“${b.title}” is grouped by the same things in another order (${b.result.groupBy.join(', ')}) — its labels are read in the order of “${a.title}” (${order.map(i => b.result.groupBy[i] ?? '').join(', ')}).`] : []),
    ...cutNotes(a, b),
    ...(othersLeft ? [`The “(… others)” groups of a result asked for its top few are left out (${othersLeft}) — they say how many, not which, so they are not the same things on both sides.`] : []),
  ];
  const result: QueryResult = {
    sheet: `${a.title} with ${b.title}`, rowsScanned: 0, rowsMatched: rows.length,
    groups: rows.map(r => ({ key: [r.label], values: [r.a, r.b, r.difference], rows: 0, refs: [] })), groupsTotal: rows.length,
    totals: [ta, tb, tb - ta], measures: [a.result.measures[ma] ? `${a.title}` : 'first', `${b.title}`, 'difference'], groupBy: ['label'], skipped: [],
    notes: [...heads,
      ...(onlyA.length ? [`Only in “${a.title}”: ${said(onlyA)}.`] : []), ...(onlyB.length ? [`Only in “${b.title}”: ${said(onlyB)}.`] : []), ...(rules.length ? ['Some labels were matched as the person said they are the same thing.'] : [])],
  };
  return { rows, onlyA, onlyB, totals: { a: ta, b: tb, difference: tb - ta }, result, heads };
}

/** The labels on one side only — the first forty named, the rest counted (a join over thousands of labels names what it can). */
const said = (only: readonly { label: string }[]): string => `${only.slice(0, 40).map(o => o.label).join(', ')}${only.length > 40 ? ` … and ${(only.length - 40).toLocaleString('en-GB')} more` : ''}`;
/** A side that shows fewer groups than it has: a label "only in" the other side may simply be past the cut — said, never hidden. */
const cutNotes = (a: DataResult, b: DataResult): string[] => [a, b].filter(r => r.result.groupsTotal > r.result.groups.length)
  .map(r => `“${r.title}” shows ${r.result.groups.length.toLocaleString('en-GB')} of its ${r.result.groupsTotal.toLocaleString('en-GB')} groups — a label only on the other side may be among the ones it does not show.`);
const w = (n: number | null) => (n === null ? 'not recorded' : Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-GB') : String(Math.round(n * 100) / 100));
export function joinSaid(j: Joined, title: string, a: DataResult, b: DataResult): string {
  const top = j.rows.slice(0, 6).map(r => `${r.label}${r.byRule ? ` (= ${r.labelB})` : ''}: ${w(r.a)} against ${w(r.b)}, ${r.difference === null ? 'no difference can be said' : `${r.difference >= 0 ? '+' : '−'}${w(Math.abs(r.difference))}`}${r.ratio !== null ? ` (${Math.round(r.ratio * 100)}%)` : ''}`);
  return `${title} — “${a.title}” (${a.source.name}) against “${b.title}” (${b.source.name}), ${j.rows.length} label${j.rows.length === 1 ? '' : 's'} matched, the biggest differences first: ${top.join('; ')}${j.rows.length > 6 ? `; … ${j.rows.length - 6} more` : ''}. Matched in all: ${w(j.totals.a)} against ${w(j.totals.b)} (${j.totals.difference >= 0 ? '+' : '−'}${w(Math.abs(j.totals.difference))}).${j.onlyA.length ? ` Only in the first: ${j.onlyA.slice(0, 8).map(o => `${o.label} ${w(o.value)}`).join(', ')}.` : ''}${j.onlyB.length ? ` Only in the second: ${j.onlyB.slice(0, 8).map(o => `${o.label} ${w(o.value)}`).join(', ')}.` : ''}${j.heads.length ? ` ${j.heads.join(' ')}` : ''} A label on one side only is never matched by a near spelling — ask the person whether it is the same thing.`;
}
