/* THE CRITICAL PATH OF A STAGE-GATE PLAN — FC-215 part 2 (knowledge/specs/FC-215-critical-path.md, Part 2; docs/METHODS.md §7).
 *
 * The two passes are lib/ie/criticalPath's, unchanged. This reads the network from what a stage-gate project already holds — its
 * machines (each with the day it is due on site and the state it has reached) and its steps (install, set up, commission, hand over,
 * each booked for a window of days) — and from the one thing the plan never held: what a step waits for, stored on the project
 * (`Project.gateStages.waitsFor`, the owner's, no migration). A step not yet told what it waits for takes a proposal from its dates.
 *
 * Every figure is the passes' or a count of the plan's: no AI, nothing invented. Days are calendar days counted from `today`
 * (day 0), a booked window counted with both ends (12th to 16th is 5 days). Pure: records in, a reading out; the sentences are here,
 * so the page, the paper and the acceptance script say one thing. */
import { criticalPath, slip, type CpmRow, type CpmTask } from '../../lib/ie/criticalPath';
import type { Asset, Test } from '../../lib/testing';
import { assetStateOf, daysBetween, gateOf, plannedEnd } from '../../lib/testing';
import { addDays, niceDay } from '../../lib/weeks';
import { owns, plural } from '../../lib/format';
import { fmtGBP } from '../../lib/cost';
import type { LinesDay } from '../../lib/lineLoss';
import type { LeanTile, LeanTone } from '../../lib/lean';
import type { CalcPicture } from '../calc/types';

/** Where a node sits in the project's order: a machine arriving, then the four gates. */
export type NodeGate = 'arrival' | 'install' | 'setup' | 'commission' | 'handover';
const GATE_ORDER: Record<NodeGate, number> = { arrival: 0, install: 1, setup: 2, commission: 3, handover: 4 };
export const GATE_WORD: Record<NodeGate, string> = { arrival: 'On site', install: 'Install', setup: 'Set up', commission: 'Commission', handover: 'Hand over' };

/** One task of the plan: a machine arriving, or a step booked for a window. */
export interface PlanNode {
  /** The step's id, or `a:<machine id>` for an arrival. */
  id: string;
  /** In the floor's words: "Dry run", "Filler on site". */
  label: string;
  machine?: string;
  machineId?: string;
  gate: NodeGate;
  /** Days left of it: 0 when done (or already here). */
  days: number;
  /** Its booked length (the days from today to the due date, for an arrival) — what it would take if it were not done. */
  planned: number;
  done: boolean;
  /** The booked window, ISO. An arrival's `to` is its due date. */
  from?: string;
  to?: string;
  /** Said once under the table when the page worked it out in a way the person should know. */
  note?: string;
}

/** A step the network could not use, and why — said in words, never dropped quietly. */
export interface PlanLeft { id: string; label: string; why: string }

export const arrivalId = (assetId: string): string => `a:${assetId}`;
export const isArrival = (id: string): boolean => id.startsWith('a:');

export interface PlanInput {
  assets: readonly Asset[];
  tests: readonly Test[];
  /** The owner's waits, by node id (`Project.gateStages.waitsFor`). */
  waitsFor?: Record<string, string[]>;
  /** ISO day 0. */
  today: string;
  /** The date handover is agreed for (`expectedAt`, else `plannedAt`). */
  handoverAt?: string;
}

export interface PlanBuilt { nodes: PlanNode[]; left: PlanLeft[]; machineCount: number }

const stepGate = (t: Test): NodeGate => (t.kind === 'install' ? gateOf(t) : 'commission');

/** The plan as tasks: every live machine's arrival, and every live step with a day. Pure; the order is the plan's (machine, gate, day, sort). */
export function planNodes(input: Pick<PlanInput, 'assets' | 'tests' | 'today'>): PlanBuilt {
  const { today } = input;
  const assets = input.assets.filter(a => !a.deletedAt && !a.mergedInto);
  const byId = new Map(assets.map(a => [a.id, a]));
  const nodes: PlanNode[] = [];
  const left: PlanLeft[] = [];

  for (const a of [...assets].sort((x, y) => x.sort - y.sort)) {
    const here = assetStateOf(a) !== 'awaited';
    const gone = a.dueOn ? daysBetween(today, a.dueOn) : undefined;
    const days = here ? 0 : gone === undefined ? 0 : Math.max(0, gone);
    nodes.push({
      id: arrivalId(a.id), label: `${a.name} on site`, machine: a.name, machineId: a.id, gate: 'arrival',
      days, planned: days, done: here, ...(a.dueOn ? { to: a.dueOn } : {}),
      ...(!here && gone === undefined ? { note: `${a.name} is not here yet and has no due date — counted as here today; give it a due date.` }
        : !here && gone !== undefined && gone < 0 ? { note: `${a.name} was due ${niceDay(a.dueOn)} and is not here — counted as arriving today.` } : {}),
    });
  }

  const steps = input.tests.filter(t => !t.deletedAt && t.kind !== 'fix' && (!t.assetId || byId.has(t.assetId)));
  const ordered = [...steps].sort((x, y) => (byId.get(x.assetId ?? '')?.sort ?? 1e9) - (byId.get(y.assetId ?? '')?.sort ?? 1e9) || GATE_ORDER[stepGate(x)] - GATE_ORDER[stepGate(y)] || (x.plannedFor ?? '9999').localeCompare(y.plannedFor ?? '9999') || x.sort - y.sort);
  for (const t of ordered) {
    const m = t.assetId ? byId.get(t.assetId) : undefined;
    const from = t.plannedFor, to = plannedEnd(t);
    const label = m ? `${m.name} — ${t.title}` : t.title;
    if (!from || !to) { left.push({ id: t.id, label, why: 'no day booked' }); continue; }
    const planned = Math.max(1, (daysBetween(from, to) ?? 0) + 1);
    const done = t.outcome === 'passed';
    nodes.push({
      id: t.id, label, ...(m ? { machine: m.name, machineId: m.id } : {}), gate: stepGate(t),
      days: done ? 0 : planned, planned, done, from, to,
      ...(!done && to < today ? { note: `${label} was booked to ${niceDay(to)} and is not done — it keeps its booked ${plural(planned, 'day')}; re-date it to say otherwise.` } : {}),
    });
  }
  return { nodes, left, machineCount: assets.length };
}

/** What each node waits for when the owner has not said: the steps on its machine whose window ends before its own begins — the nearest
 *  ones (the latest end, ties all) — else its machine's arrival; a step on no machine takes the nearest steps of any machine. Steps
 *  whose windows overlap do not wait for each other. Faultline's proposal (spec, Part 2), not a fact of the plan. */
export function proposedWaits(nodes: readonly PlanNode[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  const steps = nodes.filter(n => n.gate !== 'arrival');
  for (const n of nodes) {
    if (n.gate === 'arrival') { out[n.id] = []; continue; }
    const pool = steps.filter(o => o.id !== n.id && (n.machineId ? o.machineId === n.machineId : true) && o.to && n.from && o.to < n.from);
    const latest = pool.reduce((m, o) => (o.to && o.to > m ? o.to : m), '');
    const near = pool.filter(o => o.to === latest).map(o => o.id);
    out[n.id] = near.length ? near : n.machineId ? [arrivalId(n.machineId)] : [];
  }
  return out;
}

/** A wait set on one step: the list the owner ticked, kept only where it differs from nothing. */
export function withWaits(stored: Record<string, string[]> | undefined, id: string, after: string[]): Record<string, string[]> {
  return { ...(stored ?? {}), [id]: [...new Set(after)].filter(a => a !== id) };
}
/** Back to the proposal for one step. */
export function withoutWaits(stored: Record<string, string[]> | undefined, id: string): Record<string, string[]> | undefined {
  if (!stored || !(id in stored)) return stored;
  const { [id]: _gone, ...rest } = stored;
  return Object.keys(rest).length ? rest : undefined;
}
/** Every step's proposal stored as the owner's word, in one tap. */
export function keepProposal(nodes: readonly PlanNode[], stored: Record<string, string[]> | undefined): Record<string, string[]> {
  const prop = proposedWaits(nodes);
  const out: Record<string, string[]> = { ...(stored ?? {}) };
  for (const n of nodes) if (n.gate !== 'arrival' && !(n.id in out)) out[n.id] = prop[n.id] ?? [];
  return out;
}

/** One row of the reading: a node, its passes, and what it waits for. */
export interface PlanRow extends CpmRow {
  node: PlanNode;
  /** What it waits for, by node (only those left to do are worth naming; done ones are kept for the passes). */
  waits: PlanNode[];
  /** True when the owner said it; false when it is the proposal. */
  told: boolean;
  /** Calendar days of the early start and finish. */
  startOn: string;
  endOn: string;
}

export interface PlanMachine {
  id: string;
  name: string;
  /** The day its last step can finish; the least float among its steps left; critical when any step left is. */
  endDay: number;
  float: number;
  critical: boolean;
  left: number;
  done: number;
}

export interface PlanReading {
  ok: true;
  today: string;
  rows: PlanRow[];
  /** The rows still to do — what the page lists. */
  todo: PlanRow[];
  end: number;
  /** The last day anything must be done by (end − 1 days from today; today when nothing is left). */
  endOn: string;
  paths: string[][];
  machines: PlanMachine[];
  left: PlanLeft[];
  /** Notes about arrivals and late steps. */
  notes: string[];
  /** Waits the owner stored for steps that have gone. */
  dead: number;
  /** Steps whose waits the owner has said / the proposal covers. */
  told: number;
  proposed: number;
  /** Days in hand (+) or short (−) against the handover date; absent without one. */
  margin?: number;
  handoverAt?: string;
  tasks: CpmTask[];
}

export type PlanOut = PlanReading
  | { ok: false; why: 'empty'; left: PlanLeft[] }
  | { ok: false; why: 'cycle'; cycle: string[]; left: PlanLeft[] }
  | { ok: false; why: 'nothing-left'; done: number; left: PlanLeft[]; today: string };

/** The reading: tasks from the plan, waits from the owner else the proposal, then the two passes. */
export function planPath(input: PlanInput): PlanOut {
  const { nodes, left } = planNodes(input);
  if (!nodes.length) return { ok: false, why: 'empty', left };
  const todoCount = nodes.filter(n => !n.done).length;
  if (!todoCount) return { ok: false, why: 'nothing-left', done: nodes.length, left, today: input.today };

  const have = new Set(nodes.map(n => n.id));
  const stored = input.waitsFor ?? {};
  const prop = proposedWaits(nodes);
  let dead = 0, told = 0, proposed = 0;
  const afterOf = (n: PlanNode): { after: string[]; told: boolean } => {
    if (n.gate === 'arrival') return { after: [], told: true };
    if (n.id in stored) {
      const kept = stored[n.id].filter(a => have.has(a) && a !== n.id);
      dead += stored[n.id].length - kept.length;
      return { after: kept, told: true };
    }
    return { after: prop[n.id] ?? [], told: false };
  };
  const wiring = new Map(nodes.map(n => [n.id, afterOf(n)]));
  for (const n of nodes) if (n.gate !== 'arrival') { if (wiring.get(n.id)?.told) told++; else proposed++; }
  const tasks: CpmTask[] = nodes.map(n => ({ id: n.id, days: n.days, after: wiring.get(n.id)?.after ?? [] }));
  const r = criticalPath(tasks);
  if (!r.ok) {
    const label = (id: string): string => nodes.find(n => n.id === id)?.label ?? id;
    return r.error === 'cycle' ? { ok: false, why: 'cycle', cycle: r.cycle.map(label), left } : { ok: false, why: 'empty', left };
  }

  const byNode = new Map(nodes.map(n => [n.id, n]));
  const rows: PlanRow[] = r.rows.map(x => {
    const node = byNode.get(x.id) as PlanNode;
    const w = wiring.get(x.id);
    return { ...x, node, waits: (w?.after ?? []).map(a => byNode.get(a) as PlanNode), told: w?.told ?? false, startOn: addDays(input.today, x.es), endOn: addDays(input.today, Math.max(x.ef - 1, x.es)) };
  });
  /* the critical path is the passes' over the whole network; a done step has no days and so no weight, but it can sit on the chain */
  const todo = rows.filter(x => !x.node.done);
  const ids = new Set(todo.map(x => x.node.machineId).filter((m): m is string => !!m));
  const machines: PlanMachine[] = [...ids].map(id => {
    const mine = rows.filter(x => x.node.machineId === id);
    const open = mine.filter(x => !x.node.done);
    const crit = open.filter(x => x.critical && x.days > 0);
    return {
      id, name: mine[0].node.machine ?? '', endDay: Math.max(...mine.map(x => x.ef)),
      float: Math.min(...open.map(x => x.float)), critical: crit.length > 0, left: open.length, done: mine.length - open.length,
    };
  });
  const endOn = addDays(input.today, Math.max(r.end - 1, 0));
  const margin = input.handoverAt ? daysBetween(endOn, input.handoverAt) : undefined;
  return {
    ok: true, today: input.today, rows, todo, end: r.end, endOn, paths: r.paths, machines, left,
    notes: nodes.map(n => n.note).filter((x): x is string => !!x), dead, told, proposed,
    ...(margin !== undefined ? { margin, handoverAt: input.handoverAt } : {}), tasks,
  };
}

/* ------------------------------------------------------------------ what it says */

const dayWord = (n: number): string => `${n} ${n === 1 ? 'day' : 'days'}`;
const andList = (xs: string[]): string => (xs.length <= 1 ? xs[0] ?? '' : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** The steps that decide the end, in the order they run (a step carrying days; arrivals count). */
const critical = (x: PlanReading): PlanRow[] => x.todo.filter(r => r.critical && r.days > 0);

/** The machines whose chain decides the handover, in the order they finish. */
export const criticalMachines = (x: PlanReading): PlanMachine[] => x.machines.filter(m => m.critical);

/** The sentence at the head of the page, the paper and the Timeline's line. */
export function planSays(x: PlanReading): string {
  const crit = criticalMachines(x);
  const tight = x.todo.filter(r => !r.critical).reduce<PlanRow | undefined>((m, r) => (!m || r.float < m.float ? r : m), undefined);
  const head = `Nothing can be finished before ${niceDay(x.endOn)} — ${dayWord(x.end)} from ${niceDay(x.today)}.`;
  const who = crit.length === 0 ? ' The steps that are on no machine decide it: a day lost on any of them is a day later at the handover.' : crit.length === 1
    ? ` ${owns(crit[0].name)} chain decides it: a day lost on any of its critical steps is a day later at the handover.`
    : ` ${andList(crit.map(m => m.name))} decide it together: a day lost on any of their critical steps is a day later at the handover.`;
  const rest = x.machines.filter(m => !m.critical);
  const slack = rest.length ? ` ${andList(rest.map(m => `${m.name} has ${dayWord(m.float)} of float`))}.` : '';
  const last = !rest.length && tight ? ` The tightest step off the path, ${tight.node.label}, has ${dayWord(tight.float)} of float.` : '';
  return `${head}${who}${slack}${last}`;
}

/** The Timeline's one line: who decides the handover, when it can finish, and the handover date against it. */
export function planLine(x: PlanReading): string {
  const crit = criticalMachines(x);
  const who = crit.length === 0 ? 'the steps on no machine decide the handover'
    : crit.length === 1 ? `${owns(crit[0].name)} chain decides the handover` : `${andList(crit.map(m => m.name))} decide the handover together`;
  const m = x.margin;
  const against = m === undefined ? '' : m < 0 ? `, ${dayWord(-m)} short of the handover date` : m === 0 ? ', no day in hand against the handover date' : `, ${dayWord(m)} in hand against the handover date`;
  return `Critical path: ${who} — earliest finish ${niceDay(x.endOn)} (${dayWord(x.end)})${against}.`;
}

/** The handover date against the earliest finish, in words. */
export function marginSays(x: PlanReading): string {
  if (x.margin === undefined || !x.handoverAt) return 'No handover date is agreed yet, so there is nothing to measure the chain against — agree one on the project.';
  if (x.margin < 0) return `Handover is agreed for ${niceDay(x.handoverAt)}: the chain of waits is ${dayWord(-x.margin)} short of it, even with every step starting the moment it may.`;
  if (x.margin === 0) return `Handover is agreed for ${niceDay(x.handoverAt)}, the day the chain can finish: no day in hand.`;
  return `Handover is agreed for ${niceDay(x.handoverAt)}: ${dayWord(x.margin)} in hand over the chain of waits.`;
}

export const DEFAULT_WATCH = 2;
/** The steps off the path within `watch` days of it. */
export const nearCritical = (x: PlanReading, watch = DEFAULT_WATCH): PlanRow[] => (watch > 0 ? x.todo.filter(r => !r.critical && r.days > 0 && r.float <= watch + 1e-9).sort((a, b) => a.float - b.float || a.es - b.es) : []);

/** One step being late: the end it moves to. */
export function lateStep(x: PlanReading, id: string, days: number): { moved: number; float: number; used: number; end: number; says: string; label: string } | undefined {
  const row = x.rows.find(r => r.id === id);
  const s = slip(x.tasks, id, days);
  if (!row || !s) return undefined;
  const label = row.node.label;
  const says = s.moved === 0
    ? `If ${label} is ${dayWord(days)} late the end stays where it is — it uses ${s.used} of its ${dayWord(s.float)} of float, leaving ${s.float - s.used}.`
    : s.float === 0
      ? `If ${label} is ${dayWord(days)} late the handover moves ${dayWord(s.moved)} — it has no float to take it up.`
      : `If ${label} is ${dayWord(days)} late it uses all ${dayWord(s.float)} of its float and the handover moves ${dayWord(s.moved)}.`;
  return { ...s, says, label };
}

export interface PlanMoney { says: string; perDay?: number; missing?: string }

/** A day on the critical path is a day of the project's lines not making, in margin (lib/lineLoss linesDay, the model the Timeline's money tile uses). */
export function planMoney(day: LinesDay | undefined, moved?: number): PlanMoney {
  if (!day || !day.lines.length) return { says: 'A day lost on the critical path costs a day of the project’s lines not making — there is no line from the Factory on the project yet, so it is not priced.', missing: 'no line from the Factory on the project yet' };
  if (day.margin == null) {
    const miss = andList(day.missing);
    return { says: `A day lost on the critical path costs a day of ${andList(day.lines)} not making — not priced yet: give ${miss} on the Factory’s Lines page.`, missing: miss };
  }
  const base = `A day lost on the critical path costs ${fmtGBP(day.margin)} — a day of ${andList(day.priced)} not making, in margin${day.missing.length ? `; ${andList(day.missing.map(m => m.split(':')[0]))} not priced yet` : ''}.`;
  return { says: moved !== undefined ? `${base} That slip moves the handover ${dayWord(moved)}: ${fmtGBP(moved * day.margin)}.` : base, perDay: day.margin };
}

/** The tiles, in the lean page's words. */
export function planTiles(x: PlanReading, money: PlanMoney, watch = DEFAULT_WATCH): LeanTile[] {
  const crit = critical(x);
  const tight = x.todo.filter(r => !r.critical && r.days > 0).reduce<PlanRow | undefined>((m, r) => (!m || r.float < m.float ? r : m), undefined);
  const near = nearCritical(x, watch).length;
  const cm = criticalMachines(x);
  return [
    { k: 'Earliest finish', v: dayWord(x.end), of: `by ${niceDay(x.endOn)}` },
    x.margin === undefined ? { k: 'Against handover', v: '—', of: 'no handover date agreed' }
      : { k: 'Against handover', v: x.margin < 0 ? `${dayWord(-x.margin)} short` : x.margin === 0 ? 'no day in hand' : `${dayWord(x.margin)} in hand`, of: x.handoverAt ? `handover ${niceDay(x.handoverAt)}` : '', tone: x.margin < 0 ? 'r' : x.margin <= watch ? 'a' : 'n' },
    { k: 'On the critical path', v: String(crit.length), of: `of ${plural(x.todo.filter(r => r.days > 0).length, 'step')} left` },
    tight ? { k: 'Least float off it', v: dayWord(tight.float), of: tight.node.label, tone: near ? 'a' : 'n' } : { k: 'Least float off it', v: '—', of: 'every step left is critical' },
    { k: 'Decides the handover', v: cm.length ? andList(cm.map(m => m.name)) : '—', of: cm.length > 1 ? 'tied' : 'the machine whose chain is longest' },
    { k: 'A day late costs', v: money.perDay !== undefined ? fmtGBP(money.perDay) : '—', of: money.perDay !== undefined ? 'a day of the lines not making' : money.missing ?? 'give what a day costs' },
  ];
}

/** The closing line. */
export function planClosing(x: PlanReading, watch = DEFAULT_WATCH): { text: string; tone: LeanTone } {
  const crit = critical(x);
  const near = nearCritical(x, watch);
  const m = x.margin;
  const head = `Earliest finish ${niceDay(x.endOn)} (${dayWord(x.end)}). ${plural(crit.length, 'step')} decide${crit.length === 1 ? 's' : ''} it — chase those first${near.length ? `; ${plural(near.length, 'step')} ${near.length === 1 ? 'is' : 'are'} within ${dayWord(watch)} of critical` : ''}.`;
  return { text: `${head}${m !== undefined ? ` ${m < 0 ? `${dayWord(-m)} short of the handover date.` : m === 0 ? 'No day in hand against the handover date.' : `${dayWord(m)} in hand against the handover date.`}` : ''}`, tone: m !== undefined && m < 0 ? 'r' : (m !== undefined && m <= watch) || near.length ? 'a' : 'n' };
}

/** What the page does not say — the same words on the page and the paper. */
export function planCaveats(x: PlanReading): string[] {
  return [
    `${x.told} of ${plural(x.told + x.proposed, 'step')} ${x.told === 1 ? 'has' : 'have'} the owner’s word on what they wait for; the other ${x.proposed} take Faultline’s proposal from their dates (the nearest steps booked before them on the machine). A wait left out makes a step look free, and a wait that is not real makes it look critical — check each with the people doing the work.`,
    'Whole calendar days from today, a booked window counted with both ends (12th to 16th is 5 days) — weekends count as days, the way the Gantt draws them. A step not done keeps its booked length; re-date it to say it will take less or more.',
    'Finish-to-start waits only: no lags, no overlaps, and no limit on the people or the rigging crew (a crew shared by two machines is a wait to add).',
    'It is the earliest the work can finish if every step starts the moment it may — the handover forecast from the pace of tests already run (the stage gate’s own) is a different sum, and the two should agree.',
  ];
}

/** The plan as the calculator's picture draws it: a row a machine (and one for steps on no machine), each step a bar from its earliest start to its earliest
 *  finish — dark on the critical path — and a dashed tail for the machine's float. */
export function planPicture(x: PlanReading): CalcPicture {
  const lanes: { name: string; rows: PlanRow[]; float: number; critical: boolean }[] = x.machines.map(m => ({ name: m.name, rows: x.todo.filter(r => r.node.machineId === m.id && r.days > 0), float: m.float, critical: m.critical }));
  const loose = x.todo.filter(r => !r.node.machineId && r.days > 0);
  if (loose.length) lanes.push({ name: 'The line', rows: loose, float: Math.min(...loose.map(r => r.float)), critical: loose.some(r => r.critical) });
  const n = lanes.length;
  const step = [1, 2, 5, 10, 20, 50, 100, 200, 500].find(s => x.end / s <= 7) ?? 500;
  const ticks: number[] = [];
  for (let d = 0; d <= x.end + 1e-9; d += step) ticks.push(d);
  const handoverDay = x.margin !== undefined ? x.end - 1 + x.margin + 1 : undefined;
  const maxX = Math.max(x.end, handoverDay ?? 0);
  return {
    title: 'The plan as it can run',
    caption: 'A row for each machine: each step is a bar from the earliest it can start to the earliest it can finish. The dark bars are on the critical path; the dashed tail on a machine is the float its chain has before the handover moves.',
    x: { label: `Days from ${niceDay(x.today)}`, min: 0, max: maxX, ticks, fmt: v => String(v) },
    y: { label: 'Machine', min: -0.5, max: n - 0.5, ticks: lanes.map((_, i) => n - 1 - i), fmt: v => { const t = lanes[n - 1 - Math.round(v)]?.name ?? ''; return t.length > 8 ? `${t.slice(0, 7)}…` : t; } },
    lines: lanes.flatMap((l, i): CalcPicture['lines'] => [
      ...l.rows.map(r => ({ points: [[r.es, n - 1 - i], [r.ef, n - 1 - i]] as [number, number][], mark: (r.critical ? 'ink' : 'brand') as 'ink' | 'brand' })),
      ...(!l.critical && l.float > 0 && l.rows.length ? [{ points: [[Math.max(...l.rows.map(r => r.ef)), n - 1 - i], [Math.max(...l.rows.map(r => r.ef)) + l.float, n - 1 - i]] as [number, number][], mark: 'muted' as const, dash: true }] : []),
    ]),
    verticals: [{ x: x.end, label: `earliest finish, day ${x.end}` }, ...(handoverDay !== undefined && handoverDay !== x.end ? [{ x: handoverDay, label: 'handover agreed' }] : [])],
    horizontals: [],
    dots: [],
  };
}
