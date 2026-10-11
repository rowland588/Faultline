/* THE VALUE STREAM — door to door, where the time goes between the order and
 * the customer, and how much of it is work (docs/TOOLKIT.md, tool 2; the map
 * as Rowland sees it in docs/LEAN40.md).
 *
 * Rowland, 11 October: "VSM is not just a line tool, it's a business tool."
 * So the stream runs wherever the order goes — the office, planning, stores,
 * the line, QA, despatch — and its lead time is the business's, not a line's.
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
import type { AgreedMap, FlowStep } from '../study';

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
}

/** The swimlanes — who does the steps — in the order the journey first
 *  reaches each one, so the grid reads top to bottom as the order travels. */
export function lanesOf(flow: FlowStep[]): string[] {
  const out: string[] = [];
  for (const st of [...flow].sort((x, y) => x.order - y.order)) {
    const l = st.lane?.trim() || 'Not said';
    if (!out.includes(l)) out.push(l);
  }
  return out;
}

export function flowFigures(flow: FlowStep[] | undefined, a?: AgreedMap): FlowFigures {
  const list = [...(flow ?? [])].sort((x, y) => x.order - y.order);
  const takt = a?.demandPerDay && a.demandPerDay > 0 && a.availableSecPerDay && a.availableSecPerDay > 0 ? a.availableSecPerDay / a.demandPerDay : undefined;
  let lead = 0, adds = 0, needed = 0, waste = 0, untimed = 0, unmarked = 0;
  let biggestWait: FlowFigures['biggestWait'], longestCycle: FlowFigures['longestCycle'];
  for (const st of list) {
    const c = st.cycleSec && st.cycleSec > 0 ? st.cycleSec : 0;
    const w = waitOf(st, a);
    const wSec = w.sec ?? 0;
    if (!c && w.sec === undefined) untimed++;
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
    lanes: lanesOf(list),
    steps: list.length, leadSec: lead, addsSec: adds, neededSec: needed, wasteSec: waste,
    ...(lead > 0 ? { pce: adds / lead } : {}), ...(takt ? { taktSec: takt } : {}),
    ...(biggestWait ? { biggestWait } : {}), ...(longestCycle ? { longestCycle } : {}), untimed, unmarked,
  };
}

/* ------------------------------------------------------------- the words */

/** A duration as people say it: seconds, minutes, hours, days. */
export function dur(sec: number): string {
  if (sec > 0 && sec < 0.1) return `${Number(sec.toPrecision(2))} s`;
  if (sec < 60) return `${sec.toFixed(1)} s`;
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
  if (!f.steps) return { text: 'List the steps door to door — from the order to the customer — and how long each takes and waits.', lines: [] };
  const atLeast = f.untimed ? 'at least ' : '';
  const ends = a?.customer || a?.supplier ? ` from ${a?.supplier || 'the order'} to ${a?.customer || 'the customer'}` : '';
  const parts = [`Lead time ${atLeast}${dur(f.leadSec)}${ends}.`];
  if (f.leadSec > 0) parts.push(`${dur(f.addsSec)} of it adds value — ${share(f.pce ?? 0)}.`);
  if (f.biggestWait) parts.push(`The biggest wait: ${f.biggestWait.step.name.trim() || 'a step'}${f.biggestWait.step.lane ? ` (${f.biggestWait.step.lane})` : ''}, ${dur(f.biggestWait.sec)}.`);
  if (f.longestCycle) {
    const c = f.longestCycle;
    const per = c.step.batch && c.step.batch > 1 ? ` a piece (${dur(c.step.cycleSec ?? 0)} for ${c.step.batch})` : '';
    parts.push(`The longest cycle: ${c.step.name.trim() || 'a step'}, ${dur(c.sec)}${per}${f.taktSec ? (c.overTakt ? `, over takt (${dur(f.taktSec)}) — where the stream is limited` : `, within takt (${dur(f.taktSec)})`) : ''}.`);
  }
  const lines: string[] = [];
  if (f.untimed) lines.push(`${f.untimed} step${f.untimed === 1 ? ' has' : 's have'} no time yet — the lead time is at least this.`);
  if (f.unmarked) lines.push(`${f.unmarked} step${f.unmarked === 1 ? '' : 's'} not marked adds value, needed or waste yet.`);
  if (f.biggestWait?.from === 'queue' && a?.demandPerDay) lines.push(`${f.biggestWait.step.name.trim()}: worked out from ${f.biggestWait.step.queue} waiting, at ${a.demandPerDay} a day.`);
  return { text: parts.join(' '), lines };
}

/** BEFORE → AFTER: today's stream against the future one, figure by figure. */
export function compareFlows(now: FlowFigures, then: FlowFigures): string {
  const d = then.leadSec - now.leadSec;
  const lead = `Lead time ${dur(now.leadSec)} → ${dur(then.leadSec)} (${d <= 0 ? '−' : '+'}${dur(Math.abs(d))})`;
  const adds = now.pce !== undefined && then.pce !== undefined ? ` · adds value ${share(now.pce)} → ${share(then.pce)}` : '';
  const steps = now.steps !== then.steps ? ` · ${now.steps} → ${then.steps} steps` : '';
  return `${lead}${adds}${steps}.`;
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
