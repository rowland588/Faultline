/* THE VALUE STREAM — one line end to end: where the time goes between the
 * work starting and the pallet leaving, and how much of it is work
 * (docs/TOOLKIT.md, tool 2; the map as Rowland sees it in docs/LEAN40.md).
 *
 * Rowland, 11 October: "remove business-wide mapping ... but keep the line
 * large, different departments can affect the line." So the stream is a
 * line's, and runs through everyone whose work touches it — the operators,
 * the machine, planning, stores, quality, maintenance — and its lead time
 * counts their waits as well as the line's.
 *
 * FACTS → FIGURES → READING. Pure. No verdict: a map is a reading, and the act
 * is the fix raised from it.
 *
 * THE HONESTY RULES, as this tool keeps them:
 *   enough?      a step with no time is said ("2 steps have no time yet"), and
 *                the lead time is "at least" until every step has one
 *   how known    a wait worked out from a queue says so ("from 600 cases
 *                waiting, at 300 a day")
 *   people       only an operation can add value — the app will not call a
 *                move or a wait value-adding
 *
 * THE GRID: lanes down the side (who), the journey across (the steps in
 * order), each card filled by its value (ui/ValueStream). */
import type { AgreedMap, FlowKind, FlowStep, FlowValue } from '../../lib/study';

const DAY = 86_400;

/** A step's wait: typed, or worked out from what is queued before it and the
 *  customer's daily demand (Little's law) — days of demand, as days. */
export function waitOf(st: FlowStep, a?: AgreedMap): { sec?: number; from?: 'queue' } {
  if (st.waitSec !== undefined && st.waitSec >= 0) return { sec: st.waitSec };
  if (st.queue && st.queue > 0 && a?.demandPerDay && a.demandPerDay > 0) return { sec: (st.queue / a.demandPerDay) * DAY, from: 'queue' };
  return {};
}

/** Value as the stream counts it: a wait or a store is waste, and a step
 *  marked "adds" that is not an operation is only needed. A step nobody has
 *  marked stays unmarked, and the reading says so — never guessed. */
export const valueOf = (st: FlowStep): FlowStep['value'] =>
  st.kind === 'wait' || st.kind === 'store' ? 'waste' : st.value === 'adds' && st.kind !== 'operation' ? 'needed' : st.value;

/* ------------------------------------------------ marking a step's value
 * Rowland, 30 October: "it doesn't allow me to quickly reference the activity
 * as VNA, VA, etc". One rule for every place a step is marked — the step's
 * sheet, the quick buttons on the map, the classify walk — so they can never
 * disagree: an operation can be VA, NE or NV; a move or a check only NE or NV
 * (the app will not call a move value-adding); a wait or a store is NV by
 * definition and is marked by nobody. */

/** The values a step of this kind can be marked. */
export const valuesFor = (kind: FlowKind): FlowValue[] =>
  kind === 'operation' ? ['adds', 'needed', 'waste'] : kind === 'wait' || kind === 'store' ? [] : ['needed', 'waste'];

/** Can a person mark this step at all (a wait or a store is NV already)? */
export const markable = (st: FlowStep): boolean => valuesFor(st.kind).length > 0;

/** The value a step has after one tap on `tapped`: that value; the same value
 *  tapped again clears it; one the kind does not allow changes nothing. */
export function tapValue(st: FlowStep, tapped: FlowValue): FlowValue | undefined {
  if (!valuesFor(st.kind).includes(tapped)) return valueOf(st);
  return valueOf(st) === tapped ? undefined : tapped;
}

/** The step marked `v` (undefined clears it) — a value its kind does not allow is dropped. */
export function withValue(st: FlowStep, v: FlowValue | undefined): FlowStep {
  const { value: _was, ...rest } = st; void _was;
  return v && valuesFor(st.kind).includes(v) ? { ...rest, value: v } : rest;
}

/** How the steps stand: each value, and the steps nobody has marked yet (a wait
 *  or a store is NV, so is never among them). */
export interface ClassCounts { steps: number; adds: number; needed: number; waste: number; unclassified: number; waits: number }
export function classCounts(flow: FlowStep[] | undefined): ClassCounts {
  const c: ClassCounts = { steps: 0, adds: 0, needed: 0, waste: 0, unclassified: 0, waits: 0 };
  for (const st of flow ?? []) {
    c.steps++;
    const v = valueOf(st);
    if (st.kind === 'wait' || st.kind === 'store') c.waits++;
    if (v === 'adds') c.adds++; else if (v === 'needed') c.needed++; else if (v === 'waste') c.waste++; else c.unclassified++;
  }
  return c;
}

/** The nudge, said exactly as the arithmetic does it: a step nobody has marked
 *  keeps its time in the lead time but in none of VA · NE · NV, so the share
 *  that adds value counts only what is marked VA. */
export const notClassifiedWords = (n: number): string =>
  `${n} step${n === 1 ? '' : 's'} not classified yet — the % value added counts only the steps classified VA; ${n === 1 ? 'its' : 'their'} time is in the lead time but in none of VA · NE · NV.`;

/** The steps in the order of the journey — the order the classify walk goes. */
export const walkOrder = (flow: FlowStep[] | undefined): FlowStep[] => [...(flow ?? [])].sort((x, y) => x.order - y.order);

/** The place of the next step nobody has classified, after `from` (−1 for the
 *  start), wrapping round to the ones before it; undefined when none is left. */
export function nextUnclassified(steps: FlowStep[], from: number): number | undefined {
  const n = steps.length;
  for (let k = 1; k <= n; k++) {
    const i = (from + k + n) % n;
    if (i !== from && !valueOf(steps[i])) return i;
  }
  return undefined;
}

/** "Step 7 of 23 — 5 still to classify" (or "all classified"). */
export function walkCount(steps: FlowStep[], at: number): string {
  const left = steps.filter(x => !valueOf(x)).length;
  return `Step ${at + 1} of ${steps.length} — ${left ? `${left} still to classify` : 'all classified'}`;
}

/** Where the walk ends: how many are VA · NE · NV, the share that adds value
 *  and the lead time — the figures the map's own cards say, from flowFigures. */
export function classifySummary(flow: FlowStep[] | undefined, a?: AgreedMap): { counts: ClassCounts; f: FlowFigures; text: string } {
  const counts = classCounts(flow), f = flowFigures(flow, a);
  const marked = `${counts.adds} VA · ${counts.needed} NE · ${counts.waste} NV`;
  const lead = f.leadSec > 0 ? ` ${share(f.pce ?? 0)} of the ${f.untimed ? 'at least ' : ''}${dur(f.leadSec)} lead time adds value (${dur(f.addsSec)}).` : '';
  const left = counts.unclassified ? ` ${notClassifiedWords(counts.unclassified)}` : '';
  return { counts, f, text: `${counts.steps} step${counts.steps === 1 ? '' : 's'}: ${marked}.${lead}${left}` };
}

export interface FlowFigures {
  /** The swimlanes, in the order the journey first reaches them. */
  lanes: string[];
  steps: number;
  /** Seconds, start to customer: every cycle and every wait. */
  leadSec: number;
  addsSec: number;
  neededSec: number;
  /** Waste: wasteful work and every wait. */
  wasteSec: number;
  /** Adds-value ÷ lead. */
  pce?: number;
  taktSec?: number;
  biggestWait?: { step: FlowStep; sec: number; from?: 'queue' };
  /** The longest time a piece, of the operations and checks — held against takt. */
  longestCycle?: { step: FlowStep; sec: number; overTakt: boolean };
  /** Steps with no time at all. */
  untimed: number;
  /** Steps with no value marked (operations, moves and checks). */
  unmarked: number;
  /** Steps carried from the map before, not walked or typed again yet (a
   *  fix being proved — Prove it). */
  carried: number;
}

/** The grid's two dimensions: who does each step, or where it is done. */
export type LaneBy = 'who' | 'where';

/** Who does a step — everyone on it. A step saved before it had both
 *  dimensions kept one lane: on a line's map that was who. */
export function whoOf(st: FlowStep, a?: AgreedMap): string[] {
  const w = (Array.isArray(st.who) ? st.who : []).map(x => String(x).trim()).filter(Boolean);
  if (w.length) return w;
  return a?.scope === 'line' && st.lane?.trim() ? [st.lane.trim()] : [];
}

/** Where a step is done. Before it had both, a door-to-door map's one lane was where. */
export function whereOf(st: FlowStep, a?: AgreedMap): string | undefined {
  if (typeof st.where === 'string' && st.where.trim()) return st.where.trim();
  return a?.scope !== 'line' && st.lane?.trim() ? st.lane.trim() : undefined;
}

/** The lanes a step sits in, by the dimension asked: every person on it, or
 *  its one place. Nothing said: "Not said". */
export function lanesOfStep(st: FlowStep, by: LaneBy, a?: AgreedMap): string[] {
  const l = by === 'who' ? whoOf(st, a) : [whereOf(st, a)].filter((x): x is string => !!x);
  return l.length ? l : ['Not said'];
}

/** The swimlanes in the order the journey first reaches each one, so the grid
 *  reads top to bottom as the work travels. */
export function lanesOf(flow: FlowStep[], by: LaneBy = 'who', a?: AgreedMap): string[] {
  const out: string[] = [];
  for (const st of [...flow].sort((x, y) => x.order - y.order)) for (const l of lanesOfStep(st, by, a)) if (!out.includes(l)) out.push(l);
  return out;
}

/** Which dimension a map opens on: by who — or, for a map saved door to door
 *  before maps became only a line's, by where (the lanes it was made with). */
export const laneByDefault = (a?: AgreedMap): LaneBy => (a?.scope === 'line' ? 'who' : 'where');

export function flowFigures(flow: FlowStep[] | undefined, a?: AgreedMap): FlowFigures {
  const list = [...(flow ?? [])].sort((x, y) => x.order - y.order);
  const takt = a?.demandPerDay && a.demandPerDay > 0 && a.availableSecPerDay && a.availableSecPerDay > 0 ? a.availableSecPerDay / a.demandPerDay : undefined;
  let lead = 0, adds = 0, needed = 0, waste = 0, untimed = 0, unmarked = 0, carried = 0;
  let biggestWait: FlowFigures['biggestWait'], longestCycle: FlowFigures['longestCycle'];
  for (const st of list) {
    const c = st.cycleSec && st.cycleSec > 0 ? st.cycleSec : 0;
    const w = waitOf(st, a);
    const wSec = w.sec ?? 0;
    if (!c && w.sec === undefined) untimed++;
    if (st.source === 'carried') carried++;
    lead += c + wSec;
    const v = valueOf(st);
    if (!v && st.kind !== 'wait' && st.kind !== 'store') unmarked++;
    if (v === 'adds') adds += c; else if (v === 'needed') needed += c; else if (v === 'waste') waste += c;
    waste += wSec;
    if (wSec > 0 && (!biggestWait || wSec > biggestWait.sec)) biggestWait = { step: st, sec: wSec, ...(w.from ? { from: w.from } : {}) };
    /* Takt is a pace a piece: a step done once for a batch (an order, a week's
       plan) is held against it by its time a piece, never its whole time. */
    const each = c / (st.batch && st.batch > 1 ? st.batch : 1);
    if (each > 0 && (st.kind === 'operation' || st.kind === 'check') && (!longestCycle || each > longestCycle.sec)) longestCycle = { step: st, sec: each, overTakt: !!takt && each > takt };
  }
  return {
    lanes: lanesOf(list, laneByDefault(a), a),
    steps: list.length, leadSec: lead, addsSec: adds, neededSec: needed, wasteSec: waste,
    ...(lead > 0 ? { pce: adds / lead } : {}), ...(takt ? { taktSec: takt } : {}),
    ...(biggestWait ? { biggestWait } : {}), ...(longestCycle ? { longestCycle } : {}), untimed, unmarked, carried,
  };
}

/* ------------------------------------------------------------- the words */

/** A duration as people say it: seconds, minutes, hours, days. Under ten
 *  minutes to a tenth ("1.5 min", "4 min") — whole minutes there put a 60 s
 *  cycle "1 min, within takt (1 min)" against a 69 s takt, and 90 s of lead
 *  time at "2 min" (audit, 13 October); whole minutes from ten. */
export function dur(sec: number): string {
  if (sec > 0 && sec < 0.1) return `${Number(sec.toPrecision(2))} s`;
  if (sec < 60) return `${sec.toFixed(1)} s`;
  if (sec < 600) return `${Number((sec / 60).toFixed(1))} min`;
  if (sec < 3600) return `${Math.round(sec / 60)} min`;
  if (sec < DAY) return `${(sec / 3600).toFixed(1)} h`;
  return `${(sec / DAY).toFixed(1)} d`;
}

/** A share as a person would say it — never "0.00%" for something that is
 *  there: a tiny share keeps its first figure ("0.002%"). */
export const share = (x: number): string => (x <= 0 ? '0%' : x >= 0.1 ? `${Math.round(x * 100)}%` : x >= 0.001 ? `${(x * 100).toFixed(1)}%` : `${Number((x * 100).toPrecision(1))}%`);

export interface FlowSays { text: string; lines: string[] }

/** What the stream says: lead time, how much of it is work, the biggest
 *  wait, the longest cycle against takt; what is not known yet, said. */
export function flowSays(f: FlowFigures, a?: AgreedMap): FlowSays {
  if (!f.steps) return { text: 'List the steps on the line end to end — from the work starting to the pallet leaving, whoever does them — and how long each takes and waits.', lines: [] };
  const atLeast = f.untimed ? 'at least ' : '';
  const ends = a?.customer || a?.supplier ? ` from ${a?.supplier || 'the order'} to ${a?.customer || 'the customer'}` : '';
  const parts = [`Lead time ${atLeast}${dur(f.leadSec)}${ends}.`];
  if (f.leadSec > 0) parts.push(`${dur(f.addsSec)} of it adds value — ${share(f.pce ?? 0)}.`);
  if (f.biggestWait) {
    const at = whereOf(f.biggestWait.step, a) ?? whoOf(f.biggestWait.step, a)[0];
    parts.push(`The biggest wait: ${f.biggestWait.step.name.trim() || 'a step'}${at ? ` (${at})` : ''}, ${dur(f.biggestWait.sec)}.`);
  }
  if (f.longestCycle) {
    const c = f.longestCycle;
    const per = c.step.batch && c.step.batch > 1 ? ` a piece (${dur(c.step.cycleSec ?? 0)} for ${c.step.batch})` : '';
    parts.push(`The longest cycle: ${c.step.name.trim() || 'a step'}, ${dur(c.sec)}${per}${f.taktSec ? (c.overTakt ? `, over takt (${dur(f.taktSec)}) — where the stream is limited` : `, within takt (${dur(f.taktSec)})`) : ''}.`);
  }
  const lines: string[] = [];
  if (f.untimed) lines.push(`${f.untimed} step${f.untimed === 1 ? ' has' : 's have'} no time yet — the lead time is at least this.`);
  if (f.carried) lines.push(`${f.carried} step${f.carried === 1 ? ' is' : 's are'} carried from the map before — not walked or typed again yet.`);
  if (f.unmarked) lines.push(notClassifiedWords(f.unmarked));
  if (f.biggestWait?.from === 'queue' && a?.demandPerDay) lines.push(`${f.biggestWait.step.name.trim()}: worked out from ${f.biggestWait.step.queue} waiting, at ${a.demandPerDay} a day.`);
  return { text: parts.join(' '), lines };
}

/** BEFORE → AFTER: today's stream against the future one, figure by figure. */
export function compareFlows(now: FlowFigures, then: FlowFigures): string {
  const d = then.leadSec - now.leadSec;
  /* only what moved is said to have moved */
  const lead = d === 0 ? `Lead time ${dur(now.leadSec)}, no change` : `Lead time ${dur(now.leadSec)} → ${dur(then.leadSec)} (${d < 0 ? '−' : '+'}${dur(Math.abs(d))})`;
  const adds = now.pce !== undefined && then.pce !== undefined && share(now.pce) !== share(then.pce) ? ` · adds value ${share(now.pce)} → ${share(then.pce)}` : '';
  const steps = now.steps !== then.steps ? ` · ${now.steps} → ${then.steps} steps` : '';
  return `${lead}${adds}${steps}.`;
}

/* ---------------------------------------------------- one step, made better */

/** Is a step worth a fix: work that is waste, or a wait after it. */
export const stepWorth = (st: FlowStep, a?: AgreedMap): boolean => valueOf(st) === 'waste' || (waitOf(st, a).sec ?? 0) > 0;

/** What is wrong with a step, in its own figures — "6.0 h wait", "1.0 min of
 *  waste each time (for 120)", "5.0 s of waste each time, then a 25 min wait". */
export function stepFigure(st: FlowStep, a?: AgreedMap): string {
  const w = waitOf(st, a).sec;
  const work = st.kind !== 'wait' && st.kind !== 'store' && valueOf(st) === 'waste'
    ? (st.cycleSec ? `${dur(st.cycleSec)} of waste each time${st.batch && st.batch > 1 ? ` (for ${st.batch})` : ''}` : 'waste, no time yet') : '';
  const wait = w !== undefined && w > 0 ? `${dur(w)} wait` : '';
  return work && wait ? `${work}, then a ${wait}` : work || wait || 'no time yet';
}

/** Who or where a step is, for a line of words: its place, else its people. */
export const stepAt = (st: FlowStep, a?: AgreedMap): string => whereOf(st, a) ?? whoOf(st, a).join(', ');

/** ONE STEP BEFORE → AFTER, matched by id: its wait and its work, as walked
 *  again; "not walked again yet" while it is carried; "taken out" when gone. */
export function compareStep(before: FlowStep, after: FlowStep | undefined, a?: AgreedMap, aAfter: AgreedMap | undefined = a): string {
  const name = before.name.trim() || 'The step';
  if (!after) return `${name}: taken out`;
  if (after.source === 'carried') return `${name}: not walked again yet`;
  const parts: string[] = [];
  const w0 = waitOf(before, a).sec ?? 0, w1 = waitOf(after, aAfter).sec ?? 0;
  if (w0 > 0 || w1 > 0) parts.push(`wait ${dur(w0)} → ${dur(w1)}`);
  if (before.cycleSec !== undefined && after.cycleSec !== undefined && before.cycleSec !== after.cycleSec) parts.push(`work ${dur(before.cycleSec)} → ${dur(after.cycleSec)}`);
  return `${name}: ${parts.join(', ') || 'no change'}`;
}

/** Prove it on a map: the same steps as they stand, each CARRIED — walked or
 *  typed again one by one, and until then said to be the old figure. */
export const carryFlow = (flow: FlowStep[] | undefined): FlowStep[] => (flow ?? []).map(st => ({ ...st, source: 'carried' as const }));

/* ------------------------------------------------------------ on paper */

/** One step as the paper's table says it (lib/report/streamTable): every
 *  figure already in words, so the PDF only draws. */
export interface StreamRow {
  n: number; what: string; who: string; where: string; value?: FlowStep['value'];
  work: string; wait: string; lead: string;
  /** Carried from the map before, not walked again yet. */
  carried?: boolean;
  /** The fix or countermeasure raised from it — the branch off the step. */
  branch?: string;
}

/** THE STREAM AS A TABLE: a row per step in order — what, who, where, its
 *  value, its work (a piece when it is done for a batch), the wait after it
 *  and the lead time by the end of it — and the totals. `branches` names the
 *  record raised from a step, by step id. */
export function streamRows(flow: FlowStep[] | undefined, a?: AgreedMap, branches: Map<string, string> = new Map()): { rows: StreamRow[]; total: { work: string; wait: string; lead: string } } {
  const list = [...(flow ?? [])].sort((x, y) => x.order - y.order);
  let lead = 0, work = 0, waits = 0;
  const rows = list.map((st, i) => {
    const c = st.cycleSec && st.cycleSec > 0 ? st.cycleSec : 0;
    const w = waitOf(st, a).sec;
    lead += c + (w ?? 0); work += c; waits += w ?? 0;
    const v = valueOf(st), b = branches.get(st.id);
    return {
      n: i + 1, what: st.name.trim() || 'A step', who: whoOf(st, a).join(', ') || '—', where: whereOf(st, a) ?? '—',
      ...(v ? { value: v } : {}),
      work: c ? `${dur(c)}${st.batch && st.batch > 1 ? ` for ${st.batch}` : ''}` : st.kind === 'wait' || st.kind === 'store' ? '—' : 'no time yet',
      wait: w !== undefined && w > 0 ? dur(w) : '—', lead: dur(lead),
      ...(st.source === 'carried' ? { carried: true } : {}), ...(b ? { branch: b } : {}),
    };
  });
  return { rows, total: { work: dur(work), wait: dur(waits), lead: dur(lead) } };
}

/** A time as people type it — "6 s", "4 min", "1.5 h", "2 d", "about 2 days",
 *  "1 week" — into seconds. A bare number is in `bare` (seconds for a cycle,
 *  minutes for a wait). Nothing it can read: undefined, and the box says so. */
export function parseDur(text: string, bare: 's' | 'min' = 's'): number | undefined {
  const m = /(\d+(?:[.,]\d+)?)\s*([a-z]*)/i.exec(text.replace(/about|around|roughly|~/gi, '').trim());
  if (!m) return undefined;
  const n = Number(m[1].replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return undefined;
  const u = m[2].toLowerCase();
  const per: Record<string, number> = { s: 1, sec: 1, secs: 1, second: 1, seconds: 1, m: 60, min: 60, mins: 60, minute: 60, minutes: 60,
    h: 3600, hr: 3600, hrs: 3600, hour: 3600, hours: 3600, d: DAY, day: DAY, days: DAY, w: 7 * DAY, wk: 7 * DAY, week: 7 * DAY, weeks: 7 * DAY };
  if (!u) return n * (bare === 'min' ? 60 : 1);
  return per[u] !== undefined ? n * per[u] : undefined;
}

/* ============================== MONEY =========================================
 * knowledge/specs/FC-001-value-stream-money.md; knowledge/methods/cost/
 * inventory-carrying-cost.md. Rowland, 24 October: "only assign money to already
 * industry standard tools ... ensure they are flexible, not all costs are
 * available to me in a factory". Two costs, never blended: the LABOUR on
 * non-value-adding work a day (lean accounting's value stream costing — the
 * hours at the stream's rate, the line's one cost model) and the PRODUCT
 * WAITING between steps — tied up at what a piece has cost so far, carried at
 * the business's annual rate (operations management's carrying cost), the
 * pieces counted or, by Little's law, from the wait and the demand. */
export interface LineRate { labourRatePerHour?: number; labourBurden?: number }
export interface WasteLabour { steps: number; untimed: number; personSecPerPiece: number; secPerDay?: number; gbpPerDay?: number }
export interface WaitHeld { step: FlowStep; pieces: number; from: 'queue' | 'little'; gbp?: number }
export interface FlowMoney {
  waste?: WasteLabour;
  waits: WaitHeld[];
  /** Waits that could not be counted — no queue, and no wait time or no demand to work it out. */
  unpriced: number;
  tiedUp?: number;
  carryPerDay?: number;
  ratePerHour?: number;
  missing: { labour?: string; waits?: string; carry?: string };
}
export const MISSING_WAGE = 'give the line’s wage on its page to say the labour';
export const MISSING_DEMAND = 'agree the demand a day to say it';
export const MISSING_PIECE = 'give what a piece has cost to say what is tied up';
export const MISSING_RATE = 'give the carrying rate a year to say what carrying it costs';

export function flowMoney(flow: FlowStep[] | undefined, a: AgreedMap | undefined, line?: LineRate): FlowMoney {
  const list = (flow ?? []).slice().sort((x, y) => x.order - y.order);
  const out: FlowMoney = { waits: [], unpriced: 0, missing: {} };
  if (!list.length) return out;
  const D = a?.demandPerDay && a.demandPerDay > 0 ? a.demandPerDay : undefined;
  const A = a?.availableSecPerDay && a.availableSecPerDay > 0 ? a.availableSecPerDay : undefined;
  const rate = line?.labourRatePerHour && line.labourRatePerHour > 0 ? line.labourRatePerHour * (line.labourBurden && line.labourBurden > 0 ? line.labourBurden : 1) : undefined;
  /* the labour on waste work */
  /* waste WORK — a wait or a store is product waiting, priced below, never labour */
  const waste = list.filter(st => valueOf(st) === 'waste' && st.kind !== 'wait' && st.kind !== 'store');
  if (waste.length) {
    const timed = waste.filter(st => st.cycleSec !== undefined && st.cycleSec > 0);
    const perPiece = timed.reduce((t, st) => t + (st.cycleSec as number) / (st.batch && st.batch > 1 ? st.batch : 1) * (st.people && st.people > 0 ? st.people : 1), 0);
    const w: WasteLabour = { steps: waste.length, untimed: waste.length - timed.length, personSecPerPiece: perPiece };
    if (D !== undefined) { w.secPerDay = perPiece * D; if (rate !== undefined) w.gbpPerDay = (w.secPerDay / 3600) * rate; }
    out.waste = w;
    if (rate === undefined) out.missing.labour = MISSING_WAGE; else if (D === undefined) out.missing.labour = MISSING_DEMAND;
    if (rate !== undefined) out.ratePerHour = rate;
  }
  /* the product waiting */
  const K = a?.pieceCost && a.pieceCost > 0 ? a.pieceCost : undefined;
  for (const st of list) {
    const wt = waitOf(st, a);
    if (st.queue && st.queue > 0) out.waits.push({ step: st, pieces: st.queue, from: 'queue' });
    else if (st.waitSec && st.waitSec > 0 && wt.from !== 'queue') {
      if (D !== undefined && A !== undefined) out.waits.push({ step: st, pieces: Math.round((D * st.waitSec) / A), from: 'little' });
      else out.unpriced++;
    }
  }
  if (out.waits.length || out.unpriced) {
    if (K === undefined) out.missing.waits = MISSING_PIECE;
    else {
      for (const w of out.waits) w.gbp = w.pieces * K;
      out.tiedUp = out.waits.reduce((t, w) => t + (w.gbp ?? 0), 0);
      const r = a?.carryingRatePerYear;
      if (r !== undefined && r > 0) out.carryPerDay = (out.tiedUp * (r / 100)) / 365; else out.missing.carry = MISSING_RATE;
    }
    if (out.unpriced && out.waits.length === 0 && D === undefined && K !== undefined) out.missing.waits = MISSING_DEMAND;
  }
  return out;
}

const gbp = (n: number): string => (n >= 1000 ? `£${(Math.round(n / 100) / 10).toFixed(1)}k` : `£${Math.round(n).toLocaleString('en-GB')}`);
const hoursWord = (sec: number): string => `${(Math.round((sec / 3600) * 10) / 10).toString()} h`;

/** THE MONEY IN ONE SENTENCE, with its because, and what is missing named. */
export function flowMoneySays(m: FlowMoney, a?: AgreedMap): { text: string; tone: 'a' | 'n' } | undefined {
  const parts: string[] = [];
  if (m.waste) {
    const w = m.waste, n = w.steps === 1 ? '1 non-value-adding step' : `${w.steps} non-value-adding steps`;
    if (w.gbpPerDay !== undefined && w.secPerDay !== undefined && m.ratePerHour !== undefined)
      parts.push(`Waste work costs ${gbp(w.gbpPerDay)} a day in labour (${n}${w.untimed ? `, ${w.untimed} not timed yet` : ''} — ${hoursWord(w.secPerDay)} a day at £${m.ratePerHour.toFixed(2)} an hour).`);
    else parts.push(`Waste work: ${n}${w.untimed ? `, ${w.untimed} not timed yet` : ''} — ${m.missing.labour ?? MISSING_WAGE}.`);
  }
  if (m.waits.length || m.unpriced) {
    if (m.tiedUp !== undefined) {
      const top = m.waits.slice().sort((x, y) => (y.gbp ?? 0) - (x.gbp ?? 0))[0];
      const where = top && m.waits.length > 1 ? ` — ${gbp(top.gbp ?? 0)} of it at ${top.step.name.trim() || 'a step'}` : top ? ` — at ${top.step.name.trim() || 'a step'}` : '';
      const carry = m.carryPerDay !== undefined ? `, which costs about ${gbp(m.carryPerDay)} a day to carry at ${a?.carryingRatePerYear}% a year` : `; ${m.missing.carry ?? MISSING_RATE}`;
      parts.push(`${gbp(m.tiedUp)} of product is waiting between steps${where} (at £${(a?.pieceCost ?? 0).toFixed(2)} a piece)${carry}.${m.unpriced ? ` ${m.unpriced} wait${m.unpriced === 1 ? '' : 's'} not counted.` : ''}`);
    } else parts.push(`Product waits at ${m.waits.length + m.unpriced} step${m.waits.length + m.unpriced === 1 ? '' : 's'} — ${m.missing.waits ?? MISSING_PIECE}.`);
  }
  if (!parts.length) return undefined;
  return { text: parts.join(' '), tone: (m.waste?.gbpPerDay ?? 0) > 0 || (m.carryPerDay ?? 0) > 0 ? 'a' : 'n' };
}
