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
 * THE PRACTICE (bar 4 of docs/AUDIT.md — each figure the practice's, worked
 * by hand in the tests):
 *   basic time      observed × rating ÷ 100, on the BS 3138 scale where 100
 *                   is standard performance (ILO, Introduction to Work Study,
 *                   4th ed., ch. 12–13; BS 3138:1992)
 *   standard time   basic × (1 + the allowances agreed) — the allowances a
 *                   share of basic time, as the ILO and BS 3138 add them
 *   cycles needed   n = (t·s ÷ (k·x̄))², k = 0.05, t Student's at n − 1
 *                   degrees of freedom, 95% two-sided (Freivalds, Niebel's
 *                   Methods, Standards and Work Design, ch. 9). The ILO's
 *                   and Barnes's rule of thumb takes t as 2; on the few laps
 *                   a floor times (t at 4 df is 2.78) that claims ±5% at 95%
 *                   from what is ±5% at under 90%, so t is the readings' own.
 *   takt            available time ÷ demand; the fewest people ⌈work ÷ takt⌉
 *   balance         work ÷ (people × the longest stack) — the line balance
 *                   efficiency of the Yamazumi (Helgeson and Birnie, 1961)
 *   the suggestion  the elements in order, a new person opened when the next
 *                   would pass takt — ranked positional weight on a line whose
 *                   elements follow one another; never a stack piled past
 *                   takt to reach the theoretical fewest
 *
 * THE HONESTY RULES, as this tool keeps them:
 *   enough?          each element's laps against the cycles needed for ±5%
 *                    at 95% (n ≥ (t·s ÷ 0.05x̄)²), said "4 of 15 cycles"
 *   how known        an element is timed or typed; a person's stack is only
 *                    as known as the weakest element on it, and says so
 *   people decide    a far lap is flagged, never struck by the app; the
 *                    suggested balance is a suggestion, applied only when a
 *                    person says so */
import type { AgreedBalance, BalanceCrew, BalanceStep, Lap, ReusedTime, StepKind } from '../../lib/study';
import type { Tone } from '../capability/sample';
import { runTimeline } from './timeline';
import { rankedPositional } from './order';
import { allowanceOf } from './allowance';

/** Laps that count: not an interruption, not struck. */
export const keptLaps = (laps: Lap[] | undefined): Lap[] => (laps ?? []).filter(l => !l.foreign && !l.struck && Number.isFinite(l.sec) && l.sec > 0);

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[], m = mean(xs)) => (xs.length < 2 ? 0 : Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / (xs.length - 1)));

/** Student's t, 95% two-sided, by degrees of freedom (any table: Freivalds,
 *  appendix; Montgomery). Between the rows the smaller df — the larger t,
 *  the careful reading; past 120, the normal's 1.96. */
const T95: [number, number][] = [[1, 12.706], [2, 4.303], [3, 3.182], [4, 2.776], [5, 2.571], [6, 2.447], [7, 2.365], [8, 2.306], [9, 2.262], [10, 2.228],
  [11, 2.201], [12, 2.179], [13, 2.16], [14, 2.145], [15, 2.131], [16, 2.12], [17, 2.11], [18, 2.101], [19, 2.093], [20, 2.086],
  [21, 2.08], [22, 2.074], [23, 2.069], [24, 2.064], [25, 2.06], [26, 2.056], [27, 2.052], [28, 2.048], [29, 2.045], [30, 2.042],
  [40, 2.021], [60, 2.0], [120, 1.98]];
export const t95 = (df: number): number => {
  if (!(df >= 1)) return T95[0][1];
  let t = 1.96;
  for (const [d, v] of T95) { if (d <= df) t = v; else break; }
  return df > 120 ? 1.96 : t;
};

/** Cycles needed for ±5% at 95%: (t·s ÷ 0.05·x̄)², t Student's at n − 1
 *  degrees of freedom from the n laps timed (Freivalds). Without n, the
 *  rule of thumb t = 2 (ILO; Barnes) — only for a figure worked without laps. */
export const cyclesNeeded = (m: number, s: number, n?: number): number => {
  if (!(m > 0)) return 0;
  const t = n !== undefined && n >= 2 ? t95(n - 1) : 2;
  return Math.ceil(((t * s) / (0.05 * m)) ** 2 - 1e-9);
};
/** Never fewer than this before an element is enough, however steady. */
export const MIN_CYCLES = 5;

export interface ElementFigures {
  id: string;
  name: string;
  who: string;
  /** timed at the line · typed · reused from another product's timing (standard data) · nothing yet */
  source: 'timed' | 'typed' | 'library' | 'none';
  n: number;
  observed?: number;
  rating: number;
  /** Whether a pace was ever given: an element timed and never rated is taken at 100, and says so. A
   *  machine's run is never rated. */
  rated: boolean;
  /** How far the mean may be from the truth, a fraction, 95% two-sided: t·s ÷ (√n·x̄). Two laps or more. */
  margin?: number;
  /** The steps (ids) that must come before this one (FC-033). */
  after: string[];
  /** Where a reused time came from (FC-024). */
  reuse?: ReusedTime;
  basic?: number;
  /** The standard time, seconds: basic plus the allowance — or typed. */
  standard?: number;
  needed: number;
  enough: boolean;
  /** Lap ids far from the rest of this element's laps. */
  far: string[];
  /** Work, walking or waiting (the combination table's three). */
  kind: StepKind;
}

/** One element: observed mean, basic = observed × rating ÷ 100, standard =
 *  basic × (1 + allowance); or the typed time, said "typed". */
export function element(st: BalanceStep, allowance = 0): ElementFigures {
  const laps = keptLaps(st.laps), xs = laps.map(l => l.sec);
  /* A MACHINE'S RUN is paced by the machine: never rated, no allowance (ie.time-study, ie.allowances). */
  const machine = st.kind === 'machine';
  const rated = !machine && !!(st.rating && st.rating > 0);
  const rating = machine ? 100 : st.rating && st.rating > 0 ? st.rating : 100;
  const al = machine ? 0 : allowance;
  const base = { id: st.id, name: st.name, who: st.who, rating, rated, n: xs.length, kind: st.kind ?? 'work' as StepKind, after: st.after ?? [] };
  if (!xs.length) {
    const typed = st.typedSec && st.typedSec > 0 ? st.typedSec : undefined;
    if (!typed && st.reuse && st.reuse.basicSec > 0) {
      /* STANDARD DATA: another product's basic time, this balance's allowance */
      return { ...base, source: 'library', reuse: st.reuse, basic: st.reuse.basicSec, standard: st.reuse.basicSec * (1 + al), needed: 0, enough: st.reuse.enough, far: [] };
    }
    return { ...base, source: typed ? 'typed' : 'none', ...(typed ? { standard: typed } : {}), needed: 0, enough: false, far: [] };
  }
  const m = mean(xs), s = sd(xs, m);
  const basic = (m * rating) / 100;
  const needed = Math.max(MIN_CYCLES, cyclesNeeded(m, s, xs.length));
  const far = xs.length >= 5 ? laps.filter((l, i) => {
    const others = xs.filter((_, j) => j !== i), om = mean(others), os = sd(others, om);
    return os > 0 && Math.abs(l.sec - om) > 3 * os;
  }).map(l => l.id) : [];
  const margin = xs.length >= 2 && m > 0 ? (t95(xs.length - 1) * s) / (Math.sqrt(xs.length) * m) : undefined;
  return { ...base, source: 'timed', observed: m, basic, standard: basic * (1 + al), needed, enough: xs.length >= needed, far, ...(margin !== undefined ? { margin } : {}) };
}

export interface PersonFigures {
  who: string;
  /** Their cycle: every element's standard time, seconds a piece of theirs. */
  work: number;
  /** Of it, walking and waiting — time that adds nothing. */
  walk: number;
  wait: number;
  elements: ElementFigures[];
  /** The weakest source under the stack. */
  source: 'timed' | 'typed' | 'library' | 'none';
  /** Their cycle laid out as it is drawn: every step but a machine's run, then the time they wait for
   *  the machine — the same list as `elements` for a person with no machine. */
  parts: ElementFigures[];
  /** The machine's own run in a cycle (FC-007), and what of the cycle they wait for it. */
  machine: number;
  machineWait: number;
  overBy: number;
  spare: number;
  /** THEIR OWN TAKT, seconds a piece of theirs: the line's takt × the line's
   *  units in one of their pieces (a tray of 8 at a 3 s takt is 24 s). */
  takt?: number;
  /** Line units in one piece of theirs — 1 on no station. */
  per: number;
  /** What a piece of theirs is ("trays"), when it is not the line's unit. */
  unit?: string;
  /** The Line capacity station they work at. */
  station?: string;
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

/** The whole balance: each person's stack, in the order they first appear.
 *  `crew`: where each person is on the line (BalanceCrew) — a person at a
 *  station that counts in trays times a tray, and is held to the line's
 *  takt × the packs in a tray. Without it, everyone counts the line's unit,
 *  as before. */
export function balance(steps: BalanceStep[] | undefined, a: AgreedBalance | undefined, crew?: readonly BalanceCrew[]): BalanceFigures {
  const list = [...(steps ?? [])].sort((x, y) => x.order - y.order);
  const els = list.map(st => element(st, allowanceOf(a)));
  const order: string[] = [];
  for (const e of els) if (!order.includes(e.who)) order.push(e.who);
  const takt = a?.taktSec && a.taktSec > 0 ? a.taktSec : undefined;
  const people = order.map((who): PersonFigures => {
    const mine = els.filter(e => e.who === who);
    /* a machine's run goes alongside the person's steps, so it is not a sum of theirs: with one, the
       cycle is the longer of the person's end and the machine's (lib timeline) */
    const sum = (k?: StepKind) => mine.filter(e => (k ? e.kind === k : e.kind !== 'machine')).reduce((t, e) => t + (e.standard ?? 0), 0);
    const machine = sum('machine');
    const tl = mine.some(e => e.kind === 'machine') ? runTimeline(mine) : undefined;
    const work = tl ? tl.cycle : sum();
    const source: PersonFigures['source'] = mine.some(e => e.source === 'none') ? 'none' : mine.some(e => e.source === 'typed') ? 'typed' : mine.some(e => e.source === 'library') ? 'library' : 'timed';
    const parts = tl ? [...mine.filter(e => e.kind !== 'machine'),
      ...(tl.personWaits > 1e-9 ? [{ id: `machine-wait-${who}`, name: 'Waits for the machine', who, source: 'timed' as const, n: 0, rating: 100, rated: false, after: [], kind: 'wait' as StepKind, standard: tl.personWaits, needed: 0, enough: true, far: [] }] : [])]
      : mine;
    const c = crew?.find(x => x.who === who);
    /* a station's unit counts only against a takt whose unit is known — Line
       capacity's target, a minute in the line's unit — or none yet. A takt
       typed here by hand is "seconds a piece" of whatever each person does,
       as it always was: put through a station's 12 to a basket it read 12 s
       as 144 s (found walking it, 17 October). */
    const per = c?.per && c.per > 0 && (!a || a.from === 'target') ? c.per : 1;
    const t = takt ? takt * per : undefined;
    return { who, work, walk: sum('walk'), wait: sum('wait') + (tl?.personWaits ?? 0), elements: mine, parts, machine, machineWait: tl?.personWaits ?? 0, source, per,
      ...(c?.unit?.trim() && per !== 1 ? { unit: c.unit.trim() } : {}), ...(c?.station?.trim() ? { station: c.station.trim() } : {}),
      ...(t ? { takt: t } : {}), overBy: t ? Math.max(0, work - t) : 0, spare: t ? Math.max(0, t - work) : 0 };
  });
  /* Everything below is in the LINE's unit — a person's seconds a tray put
     back into seconds a pack — so people counting different things add up. */
  const load = (p: PersonFigures) => p.work / p.per;
  const total = people.reduce((t, p) => t + load(p), 0);
  /* the work in it: waiting is time a person could take work in, never work */
  const doing = people.reduce((t, p) => t + (p.work - p.wait) / p.per, 0);
  const longest = people.reduce<PersonFigures | undefined>((m, p) => (!m || load(p) > load(m) ? p : m), undefined);
  /* An element with no time is not zero seconds: until every element has a
     time, nobody is "the constraint" and no headcount or balance is claimed. */
  const untimed = els.filter(e => e.source === 'none').length;
  return {
    ...(takt ? { taktSec: takt } : {}), elements: els, people, total,
    ...(takt && doing > 0 && !untimed ? { fewest: Math.ceil(doing / takt - 1e-9) } : {}),
    ...(longest && longest.work > 0 && !untimed ? { efficiency: doing / (people.length * load(longest)), constraint: longest } : {}),
    untimed,
    short: els.filter(e => e.source === 'timed' && !e.enough).length,
  };
}

/** A piece of a person's, in words: " a tray" — nothing when it is the line's own unit. */
export const aPiece = (p: Pick<PersonFigures, 'unit'>): string => {
  const u = p.unit?.trim();
  if (!u) return '';
  const one = /ies$/i.test(u) ? u.replace(/ies$/i, 'y') : /(ches|shes|xes|sses)$/i.test(u) ? u.replace(/es$/i, '') : u.replace(/s$/i, '');
  return ` a ${one}`;
};

/** A SUGGESTED BALANCE — the elements in their order (each must follow the
 *  one before), filled into the fewest people the takt allows, a person's
 *  stack closed before it passes takt (ranked positional weight, Helgeson
 *  and Birnie, on elements that follow one another). A ghost until someone
 *  says "use it". */
export function suggest(f: BalanceFigures): { who: string; ids: string[]; work: number }[] | undefined {
  /* only on one unit: elements timed per tray and per pack do not pile */
  if (!f.taktSec || !f.fewest || f.untimed || f.people.some(p => p.per !== 1)) return undefined;
  /* a machine-paced balance is not shared out by this: the machine's run is not a person's to move */
  if (f.elements.some(e => e.kind === 'machine')) return undefined;
  const takt = f.taktSec;
  /* AN ORDER GIVEN (FC-033): ranked positional weight over what must follow what; none given, as it was */
  if (f.elements.some(e => e.after.length)) {
    const r = rankedPositional(f.elements.filter(e => e.kind !== 'wait').map(e => ({ id: e.id, name: e.name, t: e.standard ?? 0, after: e.after })), takt);
    return 'loop' in r ? undefined : r.stations.map((st, i) => ({ who: `Op ${i + 1}`, ids: st.ids, work: st.work }));
  }
  const out: { who: string; ids: string[]; work: number }[] = [];
  /* The next element joins the person before only while their stack stays
     within takt; else the next person starts. Kept in order, this needs the
     fewest people the order allows — ⌈work ÷ takt⌉ when the elements fit,
     one more when they do not — and never piles a stack past takt to reach
     the theoretical fewest (it once did: four 7 s elements at a 12 s takt
     gave 7 · 7 · 14). Only an element longer than takt on its own is over. */
  /* waiting is not work to share out — it goes when the work is moved */
  for (const e of f.elements.filter(x => x.kind !== 'wait')) {
    const t = e.standard ?? 0;
    const cur = out[out.length - 1];
    if (cur && cur.work + t <= takt + 1e-9) { cur.ids.push(e.id); cur.work += t; }
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
  /* WAITING AND WALKING (the combination table): time that adds nothing —
     waiting is room for work, walking the layout's to shorten */
  const idle: { text: string; tone: Tone }[] = [];
  const waits = f.people.filter(p => p.wait > 0);
  if (waits.length) idle.push({ text: `Waiting: ${waits.map(p => `${p.who} ${secs(p.wait)}`).join(', ')} a cycle — time they could take work in.`, tone: 'a' });
  const walks = f.people.filter(p => p.walk > 0);
  if (walks.length) idle.push({ text: `Walking: ${walks.map(p => `${p.who} ${secs(p.walk)}`).join(', ')} a cycle — the layout’s to shorten.`, tone: 'n' });
  if (!f.taktSec) {
    /* timing never waits on the takt (Rowland, 17 October: "I input people,
       what they do, and should be able to time them") — what is timed is
       said, and what the takt would add */
    const timed = f.elements.length - f.untimed, n = f.people.length;
    return { text: `${n} ${n === 1 ? 'person' : 'people'}, ${timed} of ${f.elements.length} element${f.elements.length === 1 ? '' : 's'} with a time — ${secs(f.total)} of work so far. No takt yet to read it against: give Line capacity a target, or agree one here.`,
      tone: 'n', lines: idle };
  }
  const lines: { text: string; tone: Tone }[] = [];
  const over = f.people.filter(p => p.overBy > 0).sort((a, b) => b.overBy - a.overBy);
  for (const p of over) lines.push({ text: `${p.who} carries ${secs(p.work)}${aPiece(p)} — over takt${p.per !== 1 && p.takt ? ` (${secs(p.takt)}${aPiece(p)})` : ''} by ${secs(p.overBy)}.`, tone: 'r' });
  lines.push(...idle);
  if (onMap !== undefined && f.fewest !== undefined && onMap !== f.fewest && f.total > 0) {
    lines.push({ text: `The map has ${onMap} ${onMap === 1 ? 'person' : 'people'}; the work needs ${f.fewest}.`, tone: 'a' });
  }
  if (f.untimed) {
    /* Only what is true so far: who is already over (a floor, not a total),
       how much has a time, and what is still to time. */
    const timed = f.elements.length - f.untimed;
    if (f.short) lines.push({ text: `${f.short} element${f.short === 1 ? ' is' : 's are'} short of the cycles for ±5% — time more.`, tone: 'a' });
    return { text: `${timed} of ${f.elements.length} elements have a time — ${secs(f.total)} of work so far at a ${secs(f.taktSec)} takt. Time the rest to read the balance.`,
      tone: over.length ? 'r' : 'n', lines };
  }
  if (f.short) lines.push({ text: `${f.short} element${f.short === 1 ? ' is' : 's are'} short of the cycles for ±5% — time more.`, tone: 'a' });
  const eff = f.efficiency !== undefined ? `, ${Math.round(f.efficiency * 100)}% balanced` : '';
  const head = `${secs(f.total)} of work at a ${secs(f.taktSec)} takt — ${f.fewest ?? 0} ${f.fewest === 1 ? 'person' : 'people'} needed, ${f.people.length} working${eff}.`;
  const c = f.constraint, spare = [...f.people].sort((a, b) => b.spare - a.spare)[0];
  const who = c ? ` ${c.who} carries ${secs(c.work)} — the constraint.` : '';
  const room = spare && spare.spare > 0 && spare !== c ? ` ${spare.who} has ${secs(spare.spare)} to spare.` : '';
  return { text: `${head}${who}${room}`, tone: over.length ? 'r' : f.untimed || f.short ? 'a' : 'g', lines };
}

/** "reused from Maris Piper 1kg — 12.3 s basic from 15 cycles, enough; not timed here" — one reused step in words. */
export const reuseSays = (r: ReusedTime): string => `reused from ${r.product} — ${r.basicSec.toFixed(1)} s basic from ${r.n} cycle${r.n === 1 ? '' : 's'}${r.enough ? ', enough' : ', short of enough'}; not timed here`;

/** One element's reading: "Wrap and seal: 31.6 s standard (25.2 observed at
 *  110, +14%) — from 15 cycles, enough." */
export function elementSays(e: ElementFigures, allowance = 0): { text: string; tone: Tone } {
  if (e.source === 'none') return { text: 'Not timed yet.', tone: 'n' };
  if (e.source === 'library' && e.reuse) return { text: `${secs(e.standard ?? 0)} standard — ${reuseSays(e.reuse)}.`, tone: e.enough ? 'n' : 'a' };
  if (e.source === 'typed') return { text: `${secs(e.standard ?? 0)} — typed, not timed.`, tone: 'n' };
  const pct = allowance ? `, +${+(allowance * 100).toFixed(1)}%` : '';
  const enough = e.enough ? 'enough' : `${e.n} of ${e.needed} cycles`;
  return { text: `${secs(e.standard ?? 0)} standard (${secs(e.observed ?? 0)} observed at ${e.rating}${pct}) — from ${e.n} cycle${e.n === 1 ? '' : 's'}, ${enough}.`, tone: e.enough ? 'g' : 'a' };
}

/** BEFORE → AFTER on the same line standard, at the same takt: the longest
 *  stack each side, against takt, and the balance. Fair only when nothing is
 *  untimed on either side; short of cycles is said, not hidden. It says "the
 *  number moved", never "the fix did it". */
export function compareBalances(before: BalanceFigures, after: BalanceFigures): { text: string; tone: Tone } {
  const takt = after.taktSec;
  const b = before.constraint, a = after.constraint;
  if (!takt || !b || !a || before.untimed || after.untimed) return { text: 'Too early to compare — every element needs a time on both sides.', tone: 'n' };
  const who = (p: PersonFigures, other: PersonFigures) => (p.who === other.who ? '' : ` (${p.who})`);
  const eff = before.efficiency !== undefined && after.efficiency !== undefined
    ? ` · ${Math.round(before.efficiency * 100)}% → ${Math.round(after.efficiency * 100)}% balanced` : '';
  const head = `The longest stack ${secs(b.work)}${who(b, a)} → ${secs(a.work)}${who(a, b)} against a ${secs(takt)} takt${eff}`;
  const word = a.overBy > 0 ? `still over by ${secs(a.overBy)}` : b.overBy > 0 ? 'within takt now' : a.work < b.work ? 'more room under takt' : 'no better';
  const short = before.short || after.short ? ' Some elements are short of their cycles — time more before leaning on it.' : '';
  return { text: `${head} — ${word}. The number moved; what moved it is the fix's to say.${short}`,
    tone: a.overBy > 0 ? 'r' : before.short || after.short ? 'a' : b.overBy > 0 || a.work < b.work ? 'g' : 'n' };
}

/** The study's one sentence for a record or for paper: the abnormal first. */
export function balanceLine(f: BalanceFigures, onMap?: number): { text: string; tone: Tone; verdict: string } {
  const s = balanceSays(f, onMap);
  const over = s.lines.filter(l => l.tone === 'r').map(l => l.text);
  const verdict = !f.elements.length || !f.taktSec ? 'Not agreed' : over.length ? 'Over takt' : f.untimed ? 'Not timed' : f.short ? 'Short of cycles' : 'Within takt';
  /* Over takt: who and by how much, then the totals — the constraint is
     already named, so it is not said twice. */
  const rest = over.length && !f.untimed && f.taktSec
    ? `${secs(f.total)} of work at a ${secs(f.taktSec)} takt — ${f.fewest ?? 0} ${f.fewest === 1 ? 'person' : 'people'} needed, ${f.people.length} working.` : s.text;
  return { text: [...over, rest].join(' '), tone: s.tone, verdict };
}
