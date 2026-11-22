/* WHICH GROUPS ARE SHOWN: a condition on a group's figure, and the top few WITHIN each group (22 November 2026 —
 * docs/LUNA-ANALYSIS.md, G4 slice A6).
 *
 * Rowland, 21 November: "no more analysis — Luna knows everything. Ask her a question." A manager asks "the top three reasons on
 * EACH line" and "which lines lost more than an hour?". A question had one cut — the first so-many groups overall — so twelve lines
 * by thirty reasons came back as the fifty biggest pairs, with whole lines missing and nothing to say they were; and a condition on
 * a total ("more than an hour") could only be read off the list by eye.
 *
 *   having   keep only the groups whose figure meets a condition — a measure or a derived figure, by position or name — after
 *            every group and the totals are worked. The totals stay those of EVERY matched row, the groups that did not meet it
 *            are counted, and the result says it shows fewer groups than there are (so no share is ever taken of the ones shown).
 *   top      with two things grouped by: the n largest of the second WITHIN EACH value of the first, and the rest of each
 *            brought together into one “(k others)” group — worked from the rows themselves, never from the groups' figures, so
 *            an average, a lowest, a highest and a distinct count of the others are exact — so every value of the first is
 *            there and its groups still add back to its whole. The first's values are put in order of their own whole.
 *
 * The rules it keeps (LUNA-ANALYSIS §1): every figure is the engines' own; nothing is dropped in silence; a share is of the total
 * over every matched row. Pure: the two engines (lib/workbook/query, lib/data/table) hand it their groups and how to bring their
 * own running sums together. */
import type { Group } from './query';
import { cmpGroupKeys } from './parts';

export const HAVING_OPS = ['gt', 'gte', 'lt', 'lte', 'eq', 'ne', 'between'] as const;
export type HavingOp = typeof HAVING_OPS[number];
/** A condition on a group's figure: `of` a measure's position (0 first; derived figures follow) or its name. */
export interface Having { of: number | string; op: HavingOp; value?: number; from?: number; to?: number }
/** The n largest of the second thing grouped by, within each value of the first. */
export interface Top { n: number }
export const HAVING_MAX = 3, TOP_MAX = 20;
/** The most groups a question may be asked for — by the app's own code (a join asks each side uncut); Luna's questions are held
 *  to fifty by their tools. */
export const LIMIT_MAX = 5000;
export class GroupsError extends Error {}

/** HOW TO ASK, said in a refusal — never in the tool's own description. */
export const HAVING_HOW = 'having is up to three of { of, op, value } — of: a measure’s position (0 for the first; derived figures follow) or its name; op: gt, gte, lt, lte, eq, ne, or between with from and to.';
export const TOP_HOW = 'top is { n } with exactly two things grouped by: the n largest (1 to 20) of the second within each value of the first, the rest of each brought together as “(others)”.';

const low = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();
const fin = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const WORD: Record<HavingOp, string> = { gt: 'more than', gte: 'at least', lt: 'less than', lte: 'at most', eq: 'exactly', ne: 'not', between: 'between' };

/** What was asked for, read defensively — the conditions, or the words to refuse them with. */
export function readHaving(v: unknown): Having[] | string {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > HAVING_MAX) return HAVING_HOW;
  const out: Having[] = [];
  for (const x of v) {
    const o = x && typeof x === 'object' ? x as Record<string, unknown> : {};
    const of = typeof o.of === 'number' && Number.isInteger(o.of) && o.of >= 0 ? o.of : typeof o.of === 'string' && o.of.trim() ? o.of.trim() : undefined;
    if (of === undefined || !HAVING_OPS.includes(o.op as HavingOp)) return HAVING_HOW;
    if (o.op === 'between' ? !fin(o.from) || !fin(o.to) : !fin(o.value)) return HAVING_HOW;
    out.push(o.op === 'between' ? { of, op: 'between', from: o.from as number, to: o.to as number } : { of, op: o.op as HavingOp, value: o.value as number });
  }
  return out;
}
export function readTop(v: unknown): Top | undefined | string {
  if (v === undefined || v === null) return undefined;
  const o = typeof v === 'object' ? v as Record<string, unknown> : {};
  return typeof o.n === 'number' && Number.isInteger(o.n) && o.n >= 1 && o.n <= TOP_MAX ? { n: o.n } : TOP_HOW;
}

export interface HavingPlan { at: number; test: (v: number) => boolean; said: string }
/** The conditions checked against the figures of the question (`names`: the measures, then the derived figures). Throws in words. */
export function planHaving(having: readonly Having[] | undefined, names: readonly string[]): HavingPlan[] {
  if (!having?.length) return [];
  if (having.length > HAVING_MAX) throw new GroupsError(HAVING_HOW);
  return having.map(h => {
    const at = typeof h.of === 'number' ? (h.of < names.length ? h.of : -1) : names.findIndex(n => low(n) === low(String(h.of)));
    if (at < 0) throw new GroupsError(`having: ${typeof h.of === 'string' ? `“${h.of}”` : String(h.of)} is not a figure of this question — it has ${names.map((n, i) => `${i} “${n}”`).join(', ')}.`);
    if (!HAVING_OPS.includes(h.op)) throw new GroupsError(HAVING_HOW);
    const a = h.op === 'between' ? h.from : h.value, b = h.to;
    if (!fin(a) || (h.op === 'between' && !fin(b))) throw new GroupsError(HAVING_HOW);
    const test = (v: number): boolean => (h.op === 'gt' ? v > a : h.op === 'gte' ? v >= a : h.op === 'lt' ? v < a : h.op === 'lte' ? v <= a : h.op === 'eq' ? v === a : h.op === 'ne' ? v !== a : v >= a && v <= (b as number));
    const n = (x: number): string => x.toLocaleString('en-GB');
    return { at, test, said: `“${names[at]}” ${WORD[h.op]} ${h.op === 'between' ? `${n(a)} and ${n(b as number)}` : n(a)}` };
  });
}
/** The groups that meet every condition — a group with nothing recorded for the figure meets none — and how many did not. */
export function keepHaving(plan: readonly HavingPlan[], groups: Group[]): { kept: Group[]; dropped: number; note?: string; said?: string } {
  if (!plan.length) return { kept: groups, dropped: 0 };
  const kept = groups.filter(g => plan.every(p => { const v = g.values[p.at]; return typeof v === 'number' && p.test(v); }));
  const dropped = groups.length - kept.length;
  const said = plan.map(p => p.said).join(' and ');
  return { kept, dropped, said, note: `Only the groups with ${said} are shown: ${kept.length.toLocaleString('en-GB')} of ${groups.length.toLocaleString('en-GB')}. The totals are still of every matched row — the ${dropped.toLocaleString('en-GB')} not shown are in them.` };
}

/** The positions of the figures that are a RANK, or worked from one — a rank is of the groups as they were asked for, so a group
 *  made afterwards (a block's others, its whole) has none, and nothing worked from one either. */
export function rankPositions(plans: readonly { d: { op: string }; ai: number; bi?: number }[], base: number): number[] {
  const out: number[] = [];
  plans.forEach((x, k) => { if (x.d.op === 'rank' || out.includes(x.ai) || (x.bi !== undefined && out.includes(x.bi))) out.push(base + k); });
  return out;
}

/** The label of the group the rest of a block are brought together as. */
export const othersLabel = (k: number): string => `(${k.toLocaleString('en-GB')} other${k === 1 ? '' : 's'})`;
export const isOthers = (label: string): boolean => /^\(\d[\d,]* others?\)$/.test(label);

/** THE TOP n WITHIN EACH VALUE OF THE FIRST KEY. `items` are every group with the engine's own running sums behind it (`a`);
 *  `merge` brings several of those together exactly; `toGroup` makes a group of one. `by` is the position of the figure the groups
 *  are ordered by within a block and `desc` its direction (largest first unless said otherwise); `blocksByLabel` puts the blocks in
 *  the order of their labels instead of their own whole. Returns the groups in order — each block's top n, then its others — and
 *  the blocks as a list of how many groups each has (for a cut that never splits one). */
export function topWithin<A>(
  items: readonly { g: Group; a: A }[], n: number, o: { by: number; desc: boolean; blocksByLabel?: 'asc' | 'desc' },
  merge: (as: A[]) => A, toGroup: (a: A, key: string[]) => Group, finish: (others: Group[], wholes: Group[]) => void,
): { groups: Group[]; blocks: number[]; others: number } {
  const num = (g: Group): number => { const v = g.values[o.by]; return typeof v === 'number' ? v : -Infinity; };
  const cmp = (x: Group, y: Group): number => (o.desc ? num(y) - num(x) : (num(x) === -Infinity ? 1 : num(y) === -Infinity ? -1 : num(x) - num(y)));
  const byFirst = new Map<string, { g: Group; a: A }[]>();
  for (const it of items) { const k = it.g.key[0] ?? ''; const list = byFirst.get(k); if (list) list.push(it); else byFirst.set(k, [it]); }
  const blocks = [...byFirst.entries()].map(([first, list]) => {
    const sorted = [...list].sort((x, y) => cmp(x.g, y.g));
    const rest = sorted.slice(n);
    return {
      first, kept: sorted.slice(0, n).map(x => x.g),
      whole: toGroup(merge(list.map(x => x.a)), [first, '']),
      others: rest.length ? toGroup(merge(rest.map(x => x.a)), [first, othersLabel(rest.length)]) : undefined,
    };
  });
  /* the figures worked from the measures, for the groups this made (the engine knows how) — before the blocks are put in order */
  finish(blocks.flatMap(b => (b.others ? [b.others] : [])), blocks.map(b => b.whole));
  blocks.sort((x, y) => (o.blocksByLabel ? (o.blocksByLabel === 'desc' ? cmpGroupKeys([y.first], [x.first]) : cmpGroupKeys([x.first], [y.first])) : cmp(x.whole, y.whole) || cmpGroupKeys([x.first], [y.first])));
  return {
    groups: blocks.flatMap(b => [...b.kept, ...(b.others ? [b.others] : [])]),
    blocks: blocks.map(b => b.kept.length + (b.others ? 1 : 0)),
    others: blocks.filter(b => b.others).length,
  };
}

/** A RESULT ASKED WITH `top`, SAID BLOCK BY BLOCK — every value of the first key on one line with its top few and its others — so
 *  what is read is every block, never only the first dozen rows of the first three. `val` says a value at a position. A block is
 *  never started that there is no room for; `shown` is how many groups were said. */
export function blocksSaid(groups: readonly Group[], val: (v: number | string | null, i: number) => string, room = 3000): { text: string; shown: number } {
  const lines: string[] = [];
  let shown = 0, used = 0, cur = '', first: string | undefined;
  for (const g of groups) {
    const piece = `${g.key.slice(1).join(' · ')}: ${g.values.map(val).join(', ')}`;
    if (g.key[0] !== first) {
      if (shown && used + (g.key[0] ?? '').length + piece.length > room) break;
      if (cur) lines.push(cur);
      first = g.key[0]; cur = `${first} — ${piece}`; used += cur.length + 3;
    } else { cur += `; ${piece}`; used += piece.length + 2; }
    shown += 1;
  }
  if (cur) lines.push(cur);
  return { text: lines.join(' | '), shown };
}

/** The first `max` groups of a result — and, where it was asked with `top`, never part of a block: cut at the last whole block
 *  that fits (the first block whole, however long). */
export function keptGroups<G extends { key: string[] }>(groups: readonly G[], max: number, blocked: boolean): G[] {
  if (groups.length <= max || !blocked) return groups.slice(0, max);
  let end = max;
  while (end > 0 && groups[end].key[0] === groups[end - 1].key[0]) end -= 1;
  if (!end) { end = 1; while (end < groups.length && groups[end].key[0] === groups[0].key[0]) end += 1; }
  return groups.slice(0, end);
}

/** How many whole blocks fit in `limit` groups — at least the first, never part of one. */
export function wholeBlocks(blocks: readonly number[], limit: number): number {
  let n = 0;
  for (const b of blocks) { if (n && n + b > limit) break; n += b; if (n >= limit) break; }
  return n;
}
