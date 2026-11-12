/* WHAT CHANGED, AND WHERE (10 November, docs/LUNA-NEXT.md L2 — Rowland: "it needs to understand … the intelligence there"; the proposal:
 * "Ask 'why is downtime up?' … a good analyst breaks it down by line, machine, shift, week and reason, and finds what changed").
 *
 * A measure over two periods: the total before and after, and for each field it can be broken by, each value's before, after and
 * change, ranked by how much of the total change it carries. The field that CONCENTRATES the change most is the one to read first —
 * scored by how much of the total change its biggest mover carries in the total's direction (a field whose values all moved a little
 * says less than one whose single value moved most of it). Then, within that biggest mover, the same again by the other fields.
 *
 * Honest by construction: a value present in one period only has the other as 0 when the measure is a count or a sum of something
 * that happened (no rows = none happened in that period), and says so; a value with nothing recorded is "(not recorded)", named,
 * never folded in; a change of nothing is said as no change, never as a share of zero. Pure. */
import type { Group, QueryResult } from '../workbook/query';

export interface Mover { key: string; before: number; after: number; change: number; /** Of the total change, signed: 0.7 = 70% of it, in its direction. */ share: number | null; onlyIn?: 'before' | 'after' }
export interface ByField { field: string; movers: Mover[]; /** How much of the total change the biggest mover in its direction carries (0–1); null with no change. */ score: number | null }
export interface Change { before: number; after: number; change: number; pct: number | null; fields: ByField[]; best?: ByField }

const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

/** One field's values compared across the two periods, each with its share of the total change. */
export function moversOf(field: string, before: readonly Group[], after: readonly Group[], totalChange: number): ByField {
  const a = new Map(before.map(g => [g.key.join(' · '), num(g.values[0])]));
  const b = new Map(after.map(g => [g.key.join(' · '), num(g.values[0])]));
  const keys = [...new Set([...a.keys(), ...b.keys()])];
  const movers: Mover[] = keys.map(k => {
    const x = a.get(k) ?? 0, y = b.get(k) ?? 0;
    return { key: k, before: x, after: y, change: y - x, share: totalChange ? (y - x) / totalChange : null, ...(!a.has(k) ? { onlyIn: 'after' as const } : !b.has(k) ? { onlyIn: 'before' as const } : {}) };
  });
  movers.sort((p, q) => (totalChange >= 0 ? q.change - p.change : p.change - q.change) || Math.abs(q.change) - Math.abs(p.change) || p.key.localeCompare(q.key, 'en-GB', { numeric: true }));
  const top = movers[0];
  const score = !totalChange || !top ? null : Math.max(0, Math.min(1, top.change / totalChange));
  return { field, movers, score };
}

/** The whole change: the totals, every field's movers, and the field that concentrates it most. */
export function changeOf(totals: { before: number; after: number }, fields: { field: string; before: readonly Group[]; after: readonly Group[] }[], against: 'none' | 'size' = 'none'): Change {
  const change = totals.after - totals.before;
  const by = fields.map(f => moversOf(f.field, f.before, f.after, change));
  /* a field with one value (or none) says nothing about where; the best is the one whose biggest mover carries most of the change.
     Against SIZE (a variance against plan — lib/data/variance): what the biggest mover carries beyond its own share of the plan, so a
     field of two halves (Days, Nights) does not win by carrying half of everything — Line 3, a third of the plan carrying 56% of the
     shortfall, says more than Nights, half the plan carrying 56%. */
  const lead = (f: ByField): number => {
    const s = f.score ?? 0;
    if (against === 'none') return s;
    const top = f.movers[0];
    const fair = totals.before ? (top?.before ?? 0) / totals.before : 1 / Math.max(1, f.movers.length);
    return s - fair;
  };
  const telling = by.filter(f => f.movers.length > 1 && f.score !== null);
  /* equal concentration: the finer field (more values) says more precisely where — Jam rather than the Bagger it ran on */
  const best = [...telling].sort((x, y) => lead(y) - lead(x) || y.movers.length - x.movers.length)[0];
  return { before: totals.before, after: totals.after, change, pct: totals.before ? (change / totals.before) * 100 : null, fields: by, ...(best ? { best } : {}) };
}

const w = (n: number, unit?: string) => `${Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('en-GB') : String(Math.round(n * 100) / 100)}${unit ? ` ${unit}` : ''}`;
const signed = (n: number, unit?: string) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${w(Math.abs(n), unit)}`;

/** The change in words: the totals, where it sits most, and the next field down — every figure the code's. */
export function changeSaid(c: Change, what: string, periods: { before: string; after: string }, unit?: string, within?: { key: string; change: Change }): string {
  const head = `${what}: ${w(c.before, unit)} in ${periods.before}, ${w(c.after, unit)} in ${periods.after} — ${c.change === 0 ? 'no change' : `${signed(c.change, unit)}${c.pct !== null ? ` (${signed(c.pct)}%)` : ''}`}.`;
  if (!c.change) return `${head} With no change in the total, no part of it can be said to carry one; each field's values are listed with their own change.`;
  if (!c.best) return `${head} No field it can be broken by has more than one value in these periods, so where it sits cannot be said from these records.`;
  const top = c.best.movers.slice(0, 3).filter(m => m.change !== 0);
  const most = `It sits most in ${c.best.field}: ${top.map(m => `${m.key} ${signed(m.change, unit)}${m.share !== null ? ` (${Math.round(m.share * 100)}% of the change)` : ''}${m.onlyIn === 'after' ? ', new in the later period' : m.onlyIn === 'before' ? `, none in ${periods.after}` : ''}`).join('; ')}.`;
  const others = c.fields.filter(f => f !== c.best && f.movers.length > 1 && f.score !== null).map(f => `${f.field} — ${f.movers[0].key} ${signed(f.movers[0].change, unit)}${f.score !== null ? ` (${Math.round((f.movers[0].share ?? 0) * 100)}%)` : ''}`);
  const one = within && !within.change.best ? within.change.fields.find(f => f.movers.length === 1 && f.movers[0].change !== 0) : undefined;
  const inner = one && within ? ` Within ${within.key}, all of it is on one ${one.field}: ${one.movers[0].key} (${w(one.movers[0].before, unit)} to ${w(one.movers[0].after, unit)}).` : within && within.change.best ? ` Within ${within.key}, it sits most in ${within.change.best.field}: ${within.change.best.movers.slice(0, 2).filter(m => m.change).map(m => `${m.key} ${signed(m.change, unit)}${m.share !== null ? ` (${Math.round(m.share * 100)}% of the change in ${within.key})` : ''}`).join('; ')}.` : '';
  return `${head} ${most}${others.length ? ` By the other fields, the biggest movers: ${others.join('; ')}.` : ''}${inner}`;
}

/** The change kept as a result (a value a mover: before, after, change) — so it is charted, compared and reported like any other. */
export function changeResult(c: ByField, totals: Change, sheet: string, notes: string[]): QueryResult {
  return {
    sheet, rowsScanned: 0, rowsMatched: 0,
    groups: c.movers.slice(0, 60).map(m => ({ key: [m.key], values: [m.before, m.after, m.change], rows: 0, refs: [] })),
    groupsTotal: c.movers.length, totals: [totals.before, totals.after, totals.change],
    measures: ['before', 'after', 'change'], groupBy: [c.field], skipped: [], notes,
  };
}
