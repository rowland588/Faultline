/* FIGURES WORKED FROM WHAT HAS BEEN ADDED UP (22 November 2026 — docs/LUNA-ANALYSIS.md, G4 slice A3).
 *
 * Rowland, 21 November: "no more analysis — Luna knows everything. Ask her a question." A manager asks for a RATE (rejects ÷ packs by
 * line), a SHARE (how much of the loss is Line 3), a CHANGE (this month on last), a RUNNING total (the Pareto's 80%). A question could
 * only add up, count and average — so each of those was two sums and a `work_out` a group: nine or ten steps and forty seconds for
 * "the reject rate by line", with the arithmetic strung between steps by the model (the audit of 21 November, measured).
 *
 * Now the question itself says what to work from its measures — `derive` — and this code works it, on EVERY group and on the totals,
 * before the groups are cut to the ones shown:
 *
 *   ratio         a ÷ b                       difference    a − b                      product    a × b
 *   share         a as a share of the total of a, over EVERY matched row (never only the groups shown)
 *   change        a less the group before it  pct_change    that, as a share of the group before   — in the order asked
 *   running       a added up group by group   running_share that, as a share of the total          — in the order asked
 *   rank          1 for the largest a
 *
 * The rules it keeps (LUNA-ANALYSIS §1):
 *   - every figure is this code's — the model names what it wants and does no arithmetic;
 *   - A TOTAL'S RATE IS WORKED FROM THE TOTALS (total a ÷ total b), never as a sum or an average of the groups' rates;
 *   - not recorded is never zero: a figure with nothing recorded behind it is not recorded (null), and so is a division by nothing;
 *   - a share, a running total and a running share are of something ADDED UP or COUNTED — an average has no share, and is refused;
 *   - a figure that depends on the order (change, running) cannot itself be what the groups are ordered by — refused in words;
 *   - the result says how each was made (its notes), and keeps what each is (`derived`) for the words, the paper and the figure check.
 * Pure: the two engines (lib/workbook/query for a workbook's rows, lib/data/table for the app's own records) hand it their groups. */
import type { Group } from './query';

export const DERIVE_OPS = ['ratio', 'difference', 'product', 'share', 'change', 'pct_change', 'running', 'running_share', 'rank'] as const;
export type DeriveOp = typeof DERIVE_OPS[number];
/** One figure to work: its name, what to work, and from which measure(s) — by position (0 for the first measure; the derived figures
 *  follow the measures) or by name (a measure as the result names it — "sum of Minutes" — or an earlier derived figure's `as`). */
export interface Derive { as: string; op: DeriveOp; a: number | string; b?: number | string }
/** What a derived figure IS, kept on the result. */
export interface Derived {
  as: string; op: DeriveOp;
  /** The names of what it was worked from. */
  a: string; b?: string;
  /** A fraction of one — a share, a rate, a change on the one before — which is said, and may be quoted, as a percentage. */
  fraction?: true;
}
export class DeriveError extends Error {}
export const DERIVE_MAX = 4;

const TWO: readonly DeriveOp[] = ['ratio', 'difference', 'product'];
const ORDERED: readonly DeriveOp[] = ['change', 'pct_change', 'running', 'running_share'];
const OF_A_TOTAL: readonly DeriveOp[] = ['share', 'running', 'running_share'];
const FRACTION: readonly DeriveOp[] = ['ratio', 'share', 'pct_change', 'running_share'];
const low = (s: string): string => s.trim().replace(/\s+/g, ' ').toLowerCase();
const q = (s: string): string => `“${s}”`;
const round = (x: number): number => Math.round(x * 1e6) / 1e6;
const num = (v: number | string | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

interface Plan { d: Derive; ai: number; bi?: number; /** Depends on the order of the groups. */ late: boolean; /** Something added up or counted. */ additive: boolean }
export interface DerivePlan { plans: Plan[]; names: string[]; derived: Derived[]; notes: string[]; /** How many base measures come before the derived figures. */ base: number }

/** HOW TO ASK, said in a refusal — never in the tool's own description (the cold prompt does not grow for it). */
export const DERIVE_HOW = 'derive is up to four of { as, op, a, b? }: op is ratio (a ÷ b), difference (a − b), product (a × b), share (a of the total of a), change or pct_change (a on the group before, in the order asked), running or running_share (a added up group by group), rank (1 for the largest); a and b are a measure’s position (0 for the first) or name, or an earlier derived figure’s name.';

/** The derived figures checked against the measures they are worked from. Throws DeriveError, in words, when one cannot be worked. */
export function planDerive(derive: readonly Derive[] | undefined, measures: readonly string[]): DerivePlan {
  const out: DerivePlan = { plans: [], names: [], derived: [], notes: [], base: measures.length };
  if (!derive?.length) return out;
  if (derive.length > DERIVE_MAX) throw new DeriveError(`At most ${DERIVE_MAX} derived figures a question. ${DERIVE_HOW}`);
  const names = [...measures];
  const additiveBase = (i: number): boolean => /^(sum of |count of |rows$)/i.test(measures[i] ?? '');
  for (const d of derive) {
    const as = typeof d.as === 'string' ? d.as.trim().replace(/\s+/g, ' ').slice(0, 60) : '';
    if (!as) throw new DeriveError(`A derived figure needs a name (as). ${DERIVE_HOW}`);
    if (!DERIVE_OPS.includes(d.op)) throw new DeriveError(`${q(as)}: “${String(d.op)}” is not something to work. ${DERIVE_HOW}`);
    if (names.some(n => low(n) === low(as))) throw new DeriveError(`${q(as)} is already the name of a figure in this question — give the derived figure another name.`);
    const find = (x: number | string | undefined, which: 'a' | 'b'): number => {
      if (typeof x === 'number' && Number.isInteger(x) && x >= 0 && x < names.length) return x;
      if (typeof x === 'string' && x.trim()) { const i = names.findIndex(n => low(n) === low(x)); if (i >= 0) return i; }
      throw new DeriveError(`${q(as)}: its ${which} (${typeof x === 'string' ? q(x) : String(x)}) is not a figure of this question — it has ${names.map((n, i) => `${i} ${q(n)}`).join(', ')}.`);
    };
    const ai = find(d.a, 'a');
    const two = TWO.includes(d.op);
    if (two && d.b === undefined) throw new DeriveError(`${q(as)}: a ${d.op} is worked from two figures — a and b.`);
    const bi = two ? find(d.b, 'b') : undefined;
    const input = (i: number): Plan | undefined => (i >= measures.length ? out.plans[i - measures.length] : undefined);
    const isAdditive = (i: number): boolean => (i < measures.length ? additiveBase(i) : !!input(i)?.additive);
    if (OF_A_TOTAL.includes(d.op) && !isAdditive(ai)) throw new DeriveError(`${q(as)}: a ${d.op.replace('_', ' ')} is of something added up or counted — ${q(names[ai])} is neither, so it has no total to be a share of.`);
    const late = ORDERED.includes(d.op) || !!input(ai)?.late || (bi !== undefined && !!input(bi)?.late);
    /* a difference of two things added up is itself added up; a product and a ratio are not */
    const additive = d.op === 'difference' && isAdditive(ai) && bi !== undefined && isAdditive(bi);
    out.plans.push({ d: { ...d, as }, ai, ...(bi !== undefined ? { bi } : {}), late, additive });
    const A = q(names[ai]), B = bi !== undefined ? q(names[bi]) : '';
    out.derived.push({ as, op: d.op, a: names[ai], ...(bi !== undefined ? { b: names[bi] } : {}), ...(FRACTION.includes(d.op) ? { fraction: true as const } : {}) });
    out.notes.push(
      d.op === 'ratio' ? `${q(as)} is ${A} ÷ ${B}, worked by the app on each group and on the totals — the total’s is total ÷ total, never the groups’ rates added or averaged.`
      : d.op === 'difference' ? `${q(as)} is ${A} − ${B}, worked by the app on each group and on the totals.`
      : d.op === 'product' ? `${q(as)} is ${A} × ${B}, worked by the app on each group and on the totals.`
      : d.op === 'share' ? `${q(as)} is each group’s ${A} as a share of the total over EVERY matched row — not only the groups shown.`
      : d.op === 'change' ? `${q(as)} is each group’s ${A} less the group before it, in the order shown; the first has none before it.`
      : d.op === 'pct_change' ? `${q(as)} is the change in ${A} on the group before it, as a share of that group, in the order shown; the first has none before it.`
      : d.op === 'running' ? `${q(as)} is ${A} added up group by group, in the order shown.`
      : d.op === 'running_share' ? `${q(as)} is ${A} added up group by group, in the order shown, as a share of the total over every matched row.`
      : `${q(as)} ranks the groups by ${A}: 1 is the largest.`);
    names.push(as);
  }
  out.names = names.slice(measures.length);
  return out;
}

/** The `derive` of a question as it arrives from outside (the gateway, a kept question asked again), read defensively: the list, or
 *  the words to refuse it with. Whether its a and b ARE figures of the question is checked when it is worked (planDerive). */
export function readDerive(v: unknown): Derive[] | string {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > DERIVE_MAX) return DERIVE_HOW;
  const out: Derive[] = [];
  for (const x of v) {
    const o = x && typeof x === 'object' ? x as Record<string, unknown> : {};
    const ref = (r: unknown): r is number | string => (typeof r === 'number' && Number.isInteger(r) && r >= 0) || (typeof r === 'string' && !!r.trim());
    if (typeof o.as !== 'string' || !o.as.trim() || !DERIVE_OPS.includes(o.op as DeriveOp) || !ref(o.a) || (o.b !== undefined && o.b !== null && !ref(o.b))) return DERIVE_HOW;
    out.push({ as: o.as, op: o.op as DeriveOp, a: o.a, ...(o.b !== undefined && o.b !== null ? { b: o.b as number | string } : {}) });
  }
  return out;
}

/** May the groups be ordered by this position? A derived figure that depends on the order cannot be what orders them. */
export function orderable(plan: DerivePlan, by: number): string | undefined {
  const p = by >= plan.base ? plan.plans[by - plan.base] : undefined;
  return p?.late ? `The groups cannot be ordered by ${q(p.d.as)} — it is worked from the order itself (${p.d.op.replace('_', ' ')}). Order by a measure, or by “group”.` : undefined;
}

/** THE FIGURES WORKED, into each group's values and into the totals, at their places after the measures. `phase` 'early' works those
 *  that do not depend on the order (so the groups may then be sorted by one); 'late' works the rest, in the order the groups are in.
 *  `groups` is EVERY group, before any cut. */
export function deriveInto(plan: DerivePlan, groups: Group[], totals: (number | string | null)[], phase: 'early' | 'late'): void {
  if (!plan.plans.length) return;
  const size = plan.base + plan.plans.length;
  for (const row of [...groups.map(g => g.values), totals]) while (row.length < size) row.push(null);
  plan.plans.forEach((p, k) => {
    if (p.late !== (phase === 'late')) return;
    const at = plan.base + k, { ai, bi } = p;
    const two = (a: number | null, b: number | null): number | null => {
      if (a === null || b === null) return null;
      if (p.d.op === 'ratio') return b === 0 ? null : round(a / b);
      return round(p.d.op === 'difference' ? a - b : a * b);
    };
    const whole = num(totals[ai]);
    switch (p.d.op) {
      case 'ratio': case 'difference': case 'product':
        for (const g of groups) g.values[at] = two(num(g.values[ai]), num(g.values[bi as number]));
        totals[at] = two(whole, num(totals[bi as number]));
        break;
      case 'share':
        for (const g of groups) { const a = num(g.values[ai]); g.values[at] = a === null || !whole ? null : round(a / whole); }
        totals[at] = whole ? 1 : null;
        break;
      case 'change': case 'pct_change': {
        let prev: number | null | undefined;
        for (const g of groups) {
          const a = num(g.values[ai]);
          g.values[at] = prev === undefined || prev === null || a === null ? null : p.d.op === 'change' ? round(a - prev) : prev === 0 ? null : round((a - prev) / Math.abs(prev));
          prev = a;
        }
        totals[at] = null;
        break;
      }
      case 'running': case 'running_share': {
        let sum: number | null = null;
        for (const g of groups) {
          const a = num(g.values[ai]);
          if (a !== null) sum = (sum ?? 0) + a;
          g.values[at] = sum === null ? null : p.d.op === 'running' ? round(sum) : !whole ? null : round(sum / whole);
        }
        totals[at] = p.d.op === 'running' ? whole : whole ? 1 : null;
        break;
      }
      case 'rank': {
        const sorted = groups.map(g => num(g.values[ai])).filter((x): x is number => x !== null).sort((x, y) => y - x);
        for (const g of groups) { const a = num(g.values[ai]); g.values[at] = a === null ? null : sorted.indexOf(a) + 1; }
        totals[at] = null;
        break;
      }
    }
  });
}

/** A derived figure as it is SAID: a share or a change as a percentage, a rate with enough figures to be quoted, a rank whole. Undefined
 *  for a value that is not a derived figure's — the caller says it as it always did. */
export function derivedSaid(v: number | string | null, d: Derived | undefined): string | undefined {
  if (!d || typeof v !== 'number') return undefined;
  if (d.op === 'share' || d.op === 'pct_change' || d.op === 'running_share') return `${(Math.round(v * 1000) / 10).toLocaleString('en-GB')}%`;
  if (d.op === 'rank') return String(v);
  if (d.op === 'ratio' && Math.abs(v) < 10) return String(Number(v.toPrecision(4)));
  return undefined;
}

/** The derived figure at a position of a result's values, if that position is one. */
export const derivedAt = (r: { measures: readonly string[]; derived?: readonly Derived[] }, i: number): Derived | undefined => {
  const n = r.derived?.length ?? 0;
  return n && i >= r.measures.length - n ? r.derived?.[i - (r.measures.length - n)] : undefined;
};
