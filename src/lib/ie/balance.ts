/* THE WORK BALANCE — each element timed at the line, each person's work
 * stacked against takt (docs/TOOLKIT.md, tool 3 the time study and tool 4
 * the Yamazumi; the worked examples in docs/LEAN40.md's appendix).
 *
 * Rowland, 10 October: the line balance "thought it would be more Lean 4.0".
 * It was speeds typed in. This is the work as people do it: timed on the
 * phone, rated, given the allowance agreed, and stacked person by person
 * against the pace the line must keep — so the constraint is a person and a
 * number, not a guess.
 *
 * FACTS → FIGURES → READING → VERDICT. Pure: the elements and what was agreed
 * in, the figures and the sentences out. Nothing worked out is stored.
 *
 * THE HONESTY RULES, as this tool keeps them:
 *   enough?          each element's laps against the cycles needed for ±5%
 *                    at 95% (n ≥ (2s ÷ 0.05x̄)²), said "4 of 15 cycles"
 *   how known        an element is timed or typed; a person's stack is only
 *                    as known as the weakest element on it, and says so
 *   people decide    a far lap is flagged, never struck by the app; the
 *                    suggested balance is a suggestion, applied only when a
 *                    person says so */
import type { AgreedBalance, BalanceStep, Lap } from '../study';
import type { Tone } from './sample';

/** Laps that count: not an interruption, not struck. */
export const keptLaps = (laps: Lap[] | undefined): Lap[] => (laps ?? []).filter(l => !l.foreign && !l.struck && Number.isFinite(l.sec) && l.sec > 0);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[], m = mean(xs)) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)));

/** Cycles needed for ±5% at 95%: (t·s ÷ 0.05·x̄)², t ≈ 2. */
export const cyclesNeeded = (m: number, s: number): number => (m > 0 ? Math.ceil(((2 * s) / (0.05 * m)) ** 2) : 0);
/** Never fewer than this before an element is enough, however steady. */
export const MIN_CYCLES = 5;

export interface ElementFigures {
  id: string;
  name: string;
  who: string;
  source: 'timed' | 'typed' | 'none';
  n: number;
  observed?: number;
  rating: number;
  basic?: number;
  /** The standard time, seconds: basic plus the allowance — or typed. */
  standard?: number;
  needed: number;
  enough: boolean;
  /** Lap ids far from the rest of this element's laps. */
  far: string[];
}

/** One element: observed mean, basic = observed × rating ÷ 100, standard =
 *  basic × (1 + allowance); or the typed time, said "typed". */
export function element(st: BalanceStep, allowance = 0): ElementFigures {
  const laps = keptLaps(st.laps), xs = laps.map(l => l.sec);
  const rating = st.rating && st.rating > 0 ? st.rating : 100;
  const base = { id: st.id, name: st.name, who: st.who, rating, n: xs.length };
  if (!xs.length) {
    const typed = st.typedSec && st.typedSec > 0 ? st.typedSec : undefined;
    return { ...base, source: typed ? 'typed' : 'none', ...(typed ? { standard: typed } : {}), needed: 0, enough: false, far: [] };
  }
  const m = mean(xs), s = sd(xs, m);
  const basic = (m * rating) / 100;
  const needed = Math.max(MIN_CYCLES, cyclesNeeded(m, s));
  const far = xs.length >= 5 ? laps.filter((l, i) => {
    const others = xs.filter((_, j) => j !== i), om = mean(others), os = sd(others, om);
    return os > 0 && Math.abs(l.sec - om) > 3 * os;
  }).map(l => l.id) : [];
  return { ...base, source: 'timed', observed: m, basic, standard: basic * (1 + allowance), needed, enough: xs.length >= needed, far };
}

export interface PersonFigures {
  who: string;
  work: number;
  elements: ElementFigures[];
  /** The weakest source under the stack. */
  source: 'timed' | 'typed' | 'none';
  overBy: number;
  spare: number;
}

export interface BalanceFigures {
  taktSec?: number;
  elements: ElementFigures[];
  people: PersonFigures[];
  total: number;
  /** Fewest people the work needs at this takt: ⌈total ÷ takt⌉. */
  fewest?: number;
  /** Σ work ÷ (people × the longest stack). */
  efficiency?: number;
  constraint?: PersonFigures;
  /** Elements with no time at all yet. */
  untimed: number;
  /** Elements timed but short of their cycles. */
  short: number;
}

/** The whole balance: each person's stack, in the order they first appear. */
export function balance(steps: BalanceStep[] | undefined, a: AgreedBalance | undefined): BalanceFigures {
  const list = [...(steps ?? [])].sort((x, y) => x.order - y.order);
  const els = list.map(st => element(st, a?.allowance ?? 0));
  const order: string[] = [];
  for (const e of els) if (!order.includes(e.who)) order.push(e.who);
  const takt = a?.taktSec && a.taktSec > 0 ? a.taktSec : undefined;
  const people = order.map(who => {
    const mine = els.filter(e => e.who === who);
    const work = mine.reduce((t, e) => t + (e.standard ?? 0), 0);
    const source: PersonFigures['source'] = mine.some(e => e.source === 'none') ? 'none' : mine.some(e => e.source === 'typed') ? 'typed' : 'timed';
    return { who, work, elements: mine, source, overBy: takt ? Math.max(0, work - takt) : 0, spare: takt ? Math.max(0, takt - work) : 0 };
  });
  const total = people.reduce((t, p) => t + p.work, 0);
  const longest = people.reduce<PersonFigures | undefined>((m, p) => (!m || p.work > m.work ? p : m), undefined);
  return {
    ...(takt ? { taktSec: takt } : {}), elements: els, people, total,
    ...(takt && total > 0 ? { fewest: Math.ceil(total / takt - 1e-9) } : {}),
    ...(longest && longest.work > 0 ? { efficiency: total / (people.length * longest.work), constraint: longest } : {}),
    untimed: els.filter(e => e.source === 'none').length,
    short: els.filter(e => e.source === 'timed' && !e.enough).length,
  };
}

/** A SUGGESTED BALANCE — the elements in their order (each must follow the
 *  one before), filled into the fewest people the takt allows, a person's
 *  stack closed before it passes takt. A ghost until someone says "use it". */
export function suggest(f: BalanceFigures): { who: string; ids: string[]; work: number }[] | undefined {
  if (!f.taktSec || !f.fewest || f.untimed) return undefined;
  const takt = f.taktSec;
  const out: { who: string; ids: string[]; work: number }[] = [];
  for (const e of f.elements) {
    const t = e.standard ?? 0;
    const cur = out[out.length - 1];
    if (cur && (cur.work + t <= takt + 1e-9 || out.length >= f.fewest)) { cur.ids.push(e.id); cur.work += t; }
    else out.push({ who: `Op ${out.length + 1}`, ids: [e.id], work: t });
  }
  return out;
}

/* ---------------------------------------------------------------- the words */

/** Seconds as the floor says them: one decimal under a minute, else minutes. */
export const secs = (s: number): string => (s < 60 ? `${s.toFixed(1)} s` : `${(s / 60).toFixed(2)} min`);

export interface BalanceSays { text: string; tone: Tone; lines: { text: string; tone: Tone }[] }

/** What the balance says, the abnormal first. `onMap`: the people on the
 *  line standard's map, for the crewing check. */
export function balanceSays(f: BalanceFigures, onMap?: number): BalanceSays {
  if (!f.elements.length) return { text: 'List the work — each element, and whose it is — then time it at the line.', tone: 'n', lines: [] };
  if (!f.taktSec) return { text: 'Agree the takt — the pace the line must keep — to balance the work against it.', tone: 'n', lines: [] };
  const lines: { text: string; tone: Tone }[] = [];
  const over = f.people.filter(p => p.overBy > 0).sort((a, b) => b.overBy - a.overBy);
  for (const p of over) lines.push({ text: `${p.who} carries ${secs(p.work)} — over takt by ${secs(p.overBy)}.`, tone: 'r' });
  if (onMap !== undefined && f.fewest !== undefined && onMap !== f.fewest && f.total > 0) {
    lines.push({ text: `The map has ${onMap} ${onMap === 1 ? 'person' : 'people'}; the work needs ${f.fewest}.`, tone: 'a' });
  }
  if (f.untimed) lines.push({ text: `${f.untimed} element${f.untimed === 1 ? '' : 's'} not timed yet.`, tone: 'n' });
  if (f.short) lines.push({ text: `${f.short} element${f.short === 1 ? ' is' : 's are'} short of the cycles for ±5% — time more.`, tone: 'a' });
  const eff = f.efficiency !== undefined ? `, ${Math.round(f.efficiency * 100)}% balanced` : '';
  const head = `${secs(f.total)} of work at a ${secs(f.taktSec)} takt — ${f.fewest ?? 0} ${f.fewest === 1 ? 'person' : 'people'} needed, ${f.people.length} working${eff}.`;
  const c = f.constraint, spare = [...f.people].sort((a, b) => b.spare - a.spare)[0];
  const who = c ? ` ${c.who} carries ${secs(c.work)} — the constraint.` : '';
  const room = spare && spare.spare > 0 && spare !== c ? ` ${spare.who} has ${secs(spare.spare)} to spare.` : '';
  return { text: `${head}${who}${room}`, tone: over.length ? 'r' : f.untimed || f.short ? 'a' : 'g', lines };
}

/** One element's reading: "Wrap and seal: 31.6 s standard (25.2 observed at
 *  110, +14%) — from 15 cycles, enough." */
export function elementSays(e: ElementFigures, allowance = 0): { text: string; tone: Tone } {
  if (e.source === 'none') return { text: 'Not timed yet.', tone: 'n' };
  if (e.source === 'typed') return { text: `${secs(e.standard ?? 0)} — typed, not timed.`, tone: 'n' };
  const pct = allowance ? `, +${Math.round(allowance * 100)}%` : '';
  const enough = e.enough ? 'enough' : `${e.n} of ${e.needed} cycles`;
  return { text: `${secs(e.standard ?? 0)} standard (${secs(e.observed ?? 0)} observed at ${e.rating}${pct}) — from ${e.n} cycle${e.n === 1 ? '' : 's'}, ${enough}.`, tone: e.enough ? 'g' : 'a' };
}
