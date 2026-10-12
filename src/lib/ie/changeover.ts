/* THE CHANGEOVER AND ITS INTERVAL — how long the line stops between two
 * products, how much of that could be done while it still runs, and how
 * often each product can run (docs/TOOLKIT.md, tool 6; SMED and EPEI in
 * docs/LEAN40.md's appendix).
 *
 * Rowland's question, as the ops lead would say it to the GM: "42 min now.
 * With the 15 min of external work done while the line runs: 27 min — 90 min
 * a week back, 6 changeovers. Five products at 42 min run every 1.4 days; at
 * 27 min, every 0.9 — daily."
 *
 * FACTS → FIGURES → READING → VERDICT. Pure: the steps as timed on the phone
 * (each INTERNAL — the line stopped — or EXTERNAL — could be done while it
 * runs), the changeovers a week and the products' run times in; the minutes
 * now, the minutes with the external work moved out, the capacity bought
 * back, the time free for changeovers and the interval out. Nothing worked
 * out is stored.
 *
 * THE HONESTY RULES, as this tool keeps them:
 *   enough?      at least one step timed or typed before a minute is said; a
 *                step with no time is said; the interval needs every
 *                product's run time, and names the ones still missing
 *   how known    a step is timed, typed or carried from the changeover before
 *                (a fix being proved — carried is the old figure, and says
 *                so); a run time is from the balance's rate or typed
 *   what it      "could be done while the line runs" is the claim — moving a
 *   does not     step outside is the fix's to do, and the changeover is timed
 *   claim        again to prove it; the interval is "at most this often": the
 *                free time has nothing else in it (no cleans, no breakdowns)
 *   agreed       the standard is the sequence agreed by the owner (Set as the
 *                standard); a changeover over it is said against it */
import type { ChangeoverProduct, ChangeoverStep, StandardChangeover } from '../study';
import type { Tone } from './sample';
import { dur } from './steps';

/* ------------------------------------------------------------ the figures */

export interface ChangeoverFigures {
  steps: number;
  /** Steps with a time, timed or typed (a carried one counts: it is a figure, the old one). */
  known: number;
  untimed: number;
  carried: number;
  /** The weakest source under the minutes: timed, typed, or carried from before. */
  source: 'timed' | 'typed' | 'carried' | 'none';
  /** Seconds, every step with a time. */
  nowSec: number;
  internalSec: number;
  externalSec: number;
  /** With every external step done while the line runs: the internal work alone. */
  afterSec: number;
  perWeek?: number;
  /** external × the changeovers a week. */
  weekSec?: number;
  /** The external steps, longest first — the work to move out. */
  external: ChangeoverStep[];
  /** The internal steps, longest first — the work to shorten next. */
  internal: ChangeoverStep[];
  /** At least one step timed or typed. */
  enough: boolean;
}

const sorted = (seq: ChangeoverStep[] | undefined): ChangeoverStep[] => [...(seq ?? [])].sort((a, b) => a.order - b.order);
const secOf = (st: ChangeoverStep): number => (st.sec !== undefined && Number.isFinite(st.sec) && st.sec > 0 ? st.sec : 0);
const hasTime = (st: ChangeoverStep): boolean => secOf(st) > 0;

export function changeoverFigures(seq: ChangeoverStep[] | undefined, perWeek?: number): ChangeoverFigures {
  const list = sorted(seq);
  const withTime = list.filter(hasTime);
  const internalSec = withTime.filter(s => s.side === 'internal').reduce((t, s) => t + secOf(s), 0);
  const externalSec = withTime.filter(s => s.side === 'external').reduce((t, s) => t + secOf(s), 0);
  const carried = list.filter(s => s.source === 'carried').length;
  const source: ChangeoverFigures['source'] = !withTime.length ? 'none' : withTime.some(s => s.source === 'carried') ? 'carried' : withTime.some(s => s.source === 'typed') ? 'typed' : 'timed';
  const pw = perWeek && perWeek > 0 ? perWeek : undefined;
  const byLongest = (a: ChangeoverStep, b: ChangeoverStep) => secOf(b) - secOf(a) || a.order - b.order;
  return {
    steps: list.length, known: withTime.length, untimed: list.length - withTime.length, carried, source,
    nowSec: internalSec + externalSec, internalSec, externalSec, afterSec: internalSec,
    ...(pw ? { perWeek: pw, weekSec: externalSec * pw } : {}),
    external: list.filter(s => s.side === 'external' && hasTime(s)).sort(byLongest),
    internal: list.filter(s => s.side === 'internal' && hasTime(s)).sort(byLongest),
    enough: withTime.length > 0,
  };
}

/* ------------------------------------------------------------ the interval */

/** A product's run time a day, minutes, and how it is known: from its demand
 *  and the line's rate on it, or typed. Nothing when neither is there. */
export function runMinOf(p: ChangeoverProduct): { min: number; how: 'rate' | 'typed' } | undefined {
  if (p.demandPerDay && p.demandPerDay > 0 && p.ratePerMin && p.ratePerMin > 0) return { min: p.demandPerDay / p.ratePerMin, how: 'rate' };
  if (p.runMinPerDay && p.runMinPerDay > 0) return { min: p.runMinPerDay, how: 'typed' };
  return undefined;
}

export interface IntervalFigures {
  /** Products run on the line, as listed. */
  products: number;
  /** Of them, with a run time a day. */
  known: number;
  missing: string[];
  availableMinPerDay?: number;
  /** Σ run a day, when every product has one. */
  runMinPerDay?: number;
  /** Minutes a day free for changeovers: available − run. */
  freeMinPerDay?: number;
  /** Every product every this many days, at the changeover as it is now … */
  daysNow?: number;
  /** … and with the external work done while the line runs. */
  daysAfter?: number;
  /** The changeover a daily interval needs: free ÷ products, minutes. */
  dailyMin?: number;
  /** The whole sum can be read. */
  ready: boolean;
}

/** EVERY PRODUCT EVERY INTERVAL: the time free for changeovers each day is
 *  what is available less what is run; one cycle of every product costs one
 *  changeover each; the interval is the cycle's changeovers over the free
 *  time. Toolkit's proof: 450 − 300 = 150 free; 5 × 42 = 210 → 1.4 days;
 *  5 × 27 = 135 → 0.9 days; a daily interval needs 150 ÷ 5 = 30 min. */
export function intervalOf(f: ChangeoverFigures, products: ChangeoverProduct[] | undefined, availableMinPerDay?: number): IntervalFigures {
  const list = (products ?? []).filter(p => p.product.trim());
  const runs = list.map(p => ({ p, r: runMinOf(p) }));
  const known = runs.filter(x => x.r).length;
  const missing = runs.filter(x => !x.r).map(x => x.p.product.trim());
  const available = availableMinPerDay && availableMinPerDay > 0 ? availableMinPerDay : undefined;
  const base: IntervalFigures = { products: list.length, known, missing, ...(available ? { availableMinPerDay: available } : {}), ready: false };
  if (list.length < 2 || missing.length || !available || !f.enough) return base;
  const run = runs.reduce((t, x) => t + (x.r?.min ?? 0), 0);
  const free = available - run;
  if (free <= 0) return { ...base, runMinPerDay: run, freeMinPerDay: free };
  const n = list.length;
  return {
    ...base, runMinPerDay: run, freeMinPerDay: free,
    daysNow: (n * f.nowSec / 60) / free, daysAfter: (n * f.afterSec / 60) / free, dailyMin: free / n, ready: true,
  };
}

/* --------------------------------------------------------------- the words */

/** Minutes as the floor says them: whole from ten up, one decimal under it
 *  ("4.5 min"), seconds under a minute ("30 s"). */
export function mins(sec: number): string {
  if (sec < 60) return dur(sec);
  const m = sec / 60;
  return m >= 10 ? `${Math.round(m)} min` : `${+m.toFixed(1)} min`;
}

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** "Five products", "12 products". */
export const countWord = (n: number): string => (n >= 0 && n <= 10 && Number.isInteger(n) ? COUNT[n] : String(n));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const days = (d: number): string => `${d.toFixed(1)}`;

/** The interval in one sentence — or what it still needs, in words. */
export function intervalSays(iv: IntervalFigures, f: ChangeoverFigures): { text: string; tone: Tone } {
  if (!f.enough) return { text: 'Time or type the changeover first — the interval is read from its minutes.', tone: 'n' };
  if (iv.products < 2) return { text: 'List the products run on this line, each with what the customer takes a day, to read how often each can run.', tone: 'n' };
  if (iv.missing.length) return { text: `${iv.known} of ${iv.products} products have a run time; the interval needs all — ${iv.missing.join(', ')} still to say.`, tone: 'n' };
  if (!iv.availableMinPerDay) return { text: 'How many minutes the line runs a day — the interval needs it.', tone: 'n' };
  if (!iv.ready || iv.freeMinPerDay === undefined || iv.daysNow === undefined || iv.daysAfter === undefined || iv.dailyMin === undefined) {
    return { text: `No time free for changeovers: ${mins((iv.runMinPerDay ?? 0) * 60)} of run in the ${mins(iv.availableMinPerDay * 60)} the line has a day.`, tone: 'r' };
  }
  const n = cap(countWord(iv.products));
  const daily = iv.daysAfter <= 1 ? ' — daily' : ` — a daily interval needs a changeover of ${mins(iv.dailyMin * 60)} or less`;
  if (f.externalSec > 0) return { text: `${n} products at ${mins(f.nowSec)} run every ${days(iv.daysNow)} days; at ${mins(f.afterSec)}, every ${days(iv.daysAfter)}${daily}.`, tone: 'n' };
  return { text: `${n} products at ${mins(f.nowSec)} run every ${days(iv.daysNow)} days${iv.daysNow <= 1 ? ' — daily' : ` — a daily interval needs a changeover of ${mins(iv.dailyMin * 60)} or less`}.`, tone: 'n' };
}

export interface ChangeoverSays {
  text: string;
  tone: Tone;
  verdict: string;
  /** What is not known yet, and the standard it stands against — each with its tone. */
  lines: { text: string; tone: Tone }[];
}

/** What the changeover says: the minutes now, what moving the external work
 *  out would make it and buy back; against the agreed standard when there is
 *  one. The abnormal — external work still done with the line stopped, or
 *  minutes over the standard — carries the colour. */
export function changeoverSays(f: ChangeoverFigures, agreed?: Pick<StandardChangeover, 'minutes'>): ChangeoverSays {
  if (!f.steps) return { text: 'Time the changeover step by step — Lap as each step ends — or type the steps; mark each internal (the line stopped) or external (could be done while it runs).', tone: 'n', verdict: 'Not timed', lines: [] };
  if (!f.enough) return { text: `${f.steps} step${f.steps === 1 ? '' : 's'}, none timed yet — Lap as each ends, or type the minutes.`, tone: 'n', verdict: 'Not timed', lines: [] };
  const lines: ChangeoverSays['lines'] = [];
  if (f.untimed) lines.push({ text: `${f.untimed} step${f.untimed === 1 ? ' has' : 's have'} no time yet — the minutes are at least this.`, tone: 'n' });
  if (f.carried) lines.push({ text: `${f.carried} step${f.carried === 1 ? ' is' : 's are'} carried from the changeover before — not timed again yet.`, tone: 'n' });
  const agreedMin = agreed && agreed.minutes > 0 ? agreed.minutes : undefined;
  const over = agreedMin !== undefined ? f.nowSec / 60 - agreedMin : undefined;
  if (agreedMin !== undefined && over !== undefined) {
    if (over > 0.5) lines.push({ text: `Over the ${mins(agreedMin * 60)} standard by ${mins(over * 60)}.`, tone: 'r' });
    else lines.push({ text: `Within the ${mins(agreedMin * 60)} standard.`, tone: 'g' });
  }
  const atLeast = f.untimed ? 'at least ' : '';
  const week = f.weekSec && f.perWeek ? ` — ${mins(f.weekSec)} a week back, ${f.perWeek} changeover${f.perWeek === 1 ? '' : 's'}` : '';
  const text = f.externalSec > 0
    ? `${cap(atLeast)}${mins(f.nowSec)} now. With the ${mins(f.externalSec)} of external work done while the line runs: ${mins(f.afterSec)}${week}.`
    : `${cap(atLeast)}${mins(f.nowSec)} now, all of it with the line stopped — no external work found yet.`;
  const tone: Tone = over !== undefined && over > 0.5 ? 'r' : f.externalSec > 0 ? 'a' : over !== undefined ? 'g' : 'n';
  const verdict = over !== undefined && over > 0.5 ? 'Over the standard' : f.externalSec > 0 ? `${mins(f.externalSec)} external inside` : over !== undefined ? 'Within the standard' : `${mins(f.nowSec)} now`;
  return { text, tone, verdict, lines };
}

/** One step's figure, for a fix's words and the fishbone: "external, 11 min". */
export function stepFigure(st: ChangeoverStep): string {
  return `${st.side}, ${hasTime(st) ? mins(secOf(st)) : 'no time yet'}`;
}

/** BEFORE → AFTER, the changeover timed again: its minutes, and the week
 *  they buy back; nothing claimed while a step is still carried from before.
 *  It says "the number moved", never "the fix did it". */
export function compareChangeovers(before: ChangeoverFigures, after: ChangeoverFigures): { text: string; tone: Tone } {
  if (!before.enough || !after.enough) return { text: 'Too early to compare — time the changeover on both sides.', tone: 'n' };
  if (after.carried) return { text: `${mins(before.nowSec)} → ${mins(after.nowSec)} so far — ${after.carried} of ${after.steps} steps carried from before, not timed again yet.`, tone: 'n' };
  const d = after.nowSec - before.nowSec;
  if (Math.abs(d) < 30) return { text: `${mins(before.nowSec)} → ${mins(after.nowSec)}, no change. The number moved only within the half-minute.`, tone: 'n' };
  const pw = after.perWeek ?? before.perWeek;
  const week = d < 0 && pw ? `; ${mins(-d * pw)} a week back at ${pw} changeover${pw === 1 ? '' : 's'}` : '';
  const still = after.externalSec > 0 ? ` ${mins(after.externalSec)} of external work is still done with the line stopped.` : '';
  return { text: `${mins(before.nowSec)} → ${mins(after.nowSec)} (${d < 0 ? '−' : '+'}${mins(Math.abs(d))})${week}. The number moved; what moved it is the fix's to say.${still}`, tone: d < 0 ? 'g' : 'r' };
}

/** Prove it: the same steps, each CARRIED — timed or typed again one by one,
 *  and until then said to be the old figure. */
export const carrySequence = (seq: ChangeoverStep[] | undefined): ChangeoverStep[] =>
  sorted(seq).map(({ at: _at, who: _who, ...st }) => { void _at; void _who; return { ...st, source: 'carried' as const }; });

/** The agreed sequence, as Set as the standard writes it onto the product's
 *  line standard: the steps' words, sides and seconds, the total in minutes. */
export function standardFrom(seq: ChangeoverStep[] | undefined, x: { id: string; from?: string; at: number; by?: string; studyId: string }): StandardChangeover {
  const list = sorted(seq);
  const f = changeoverFigures(list);
  return {
    id: x.id, ...(x.from?.trim() ? { from: x.from.trim() } : {}),
    steps: list.map(st => ({ name: st.name, side: st.side, ...(hasTime(st) ? { sec: secOf(st) } : {}) })),
    minutes: +(f.nowSec / 60).toFixed(1), agreedAt: x.at, ...(x.by ? { by: x.by } : {}), fromStudyId: x.studyId,
  };
}

/** The standard's own line, under the product: "27 min · 8 steps, 2 external
 *  · from Finest Red 2kg · agreed 11 Oct". */
export function standardLine(a: StandardChangeover, day: (ms: number) => string): string {
  const ext = a.steps.filter(s => s.side === 'external').length;
  return `${mins(a.minutes * 60)} · ${a.steps.length} step${a.steps.length === 1 ? '' : 's'}${ext ? `, ${ext} external` : ''}${a.from ? ` · from ${a.from}` : ''} · agreed ${day(a.agreedAt)}`;
}

/** The agreed changeover a study stands against, from its product's line
 *  standard: the one from the same product when the standard holds it, else
 *  the standard's newest. */
export function agreedFor(list: StandardChangeover[] | undefined, from?: string): StandardChangeover | undefined {
  const all = list ?? [];
  const f = (from ?? '').trim().toLowerCase();
  return (f ? all.find(a => (a.from ?? '').trim().toLowerCase() === f) : undefined) ?? [...all].sort((a, b) => b.agreedAt - a.agreedAt)[0];
}

/* -------------------------------------------------------------- on paper */

export interface ChangeoverRow {
  n: number; name: string; side: 'Internal' | 'External'; minutes: string; how: string;
  /** Carried from the changeover before, not timed again yet — its figure is the old one. */
  carried?: boolean;
  /** The fix or countermeasure raised from it — the branch off the step. */
  branch?: string;
}
export interface ChangeoverSheet {
  rows: ChangeoverRow[];
  total: { minutes: string; internal: string; external: string };
  /** The two bars in words, then the interval's line — each a sentence. */
  lines: string[];
}

const HOW: Record<ChangeoverStep['source'], string> = { timed: 'timed', typed: 'typed', carried: 'carried from before' };

/** THE CHANGEOVER AS A TABLE (lib/report/changeoverTable): a row per step in
 *  order — what is done, its side, its minutes, how it is known — the totals,
 *  and under them the figures the bars show, in words. `branches` names the
 *  record raised from a step, by step id. */
export function changeoverSheet(facts: { sequence?: ChangeoverStep[]; perWeek?: number; products?: ChangeoverProduct[]; availableMinPerDay?: number }, agreed?: Pick<StandardChangeover, 'minutes'>,
  branches: Map<string, string> = new Map()): ChangeoverSheet {
  const list = sorted(facts.sequence);
  const f = changeoverFigures(list, facts.perWeek);
  const iv = intervalOf(f, facts.products, facts.availableMinPerDay);
  const rows = list.map((st, i) => ({
    n: i + 1, name: st.name.trim() || 'A step', side: (st.side === 'external' ? 'External' : 'Internal') as ChangeoverRow['side'],
    minutes: hasTime(st) ? mins(secOf(st)) : 'no time yet', how: HOW[st.source] ?? 'typed',
    ...(st.source === 'carried' ? { carried: true } : {}), ...(branches.get(st.id) ? { branch: branches.get(st.id) } : {}),
  }));
  const said = changeoverSays(f, agreed);
  const lines = f.enough ? [said.text, ...said.lines.filter(l => l.tone !== 'n').map(l => l.text), intervalSays(iv, f).text] : [];
  return { rows, total: { minutes: mins(f.nowSec), internal: mins(f.internalSec), external: mins(f.externalSec) }, lines };
}
