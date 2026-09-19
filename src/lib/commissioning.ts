/* A LINE BEING HANDED OVER BY AN OEM.
 *
 * This is not a project plan with a commissioning label on it, and the first cut
 * of this file was exactly that: one generic "item" with a `kind` string, a
 * free-text `target`, and quarterly Q1–Q4 numbers inherited from the tracker.
 * Quarterly targets are meaningless here. A rate is agreed ONCE, in writing,
 * before the machine ships — you either prove it or you do not, and the only
 * question anybody asks is whether the line can be accepted.
 *
 * So the five things a handover is actually made of each get their own shape:
 *
 *   PROGRAM   a product or format that must run at an AGREED RATE. The rate is a
 *             number because it is a contractual figure, not a note. Proven by
 *             runs, which are the evidence: we ran this for so long and achieved
 *             this. A program that has not been written yet is MISSING, and that
 *             is a distinct state from written-but-untested — one is the OEM's
 *             job, the other is ours.
 *   MATERIAL  what the line needs to run at all: film, cartons, labels, tooling.
 *             Needed, have, on order, due. Nothing more; a materials list that
 *             wants a paragraph per row does not get filled in.
 *   CHECK     a site acceptance test. A criterion, a result, and a witness —
 *             an acceptance test nobody signed is not acceptance.
 *   PUNCH     a defect on the punch list, severity A/B/C as every handover in
 *             the industry grades them: A blocks sign-off, B is fixed before
 *             production, C is cosmetic and can follow. The severity is what
 *             makes the list actionable rather than a pile of complaints.
 *   TASK      the rest of the obligation: training, manuals, spares list, LOTO,
 *             the CE/UKCA file. Dull, and it holds up sign-off just as hard.
 *
 * ASSETS ARE THE SPINE. A production line is made of machines and each is
 * accepted in its own right; the line is signed off when all of them are. Every
 * record names its asset, and `undefined` means the line itself.
 *
 * SIGN-OFF IS DERIVED, NEVER TYPED. Nobody ticks "ready". It falls out of the
 * records: an open A defect, a program short of its rate, a failed or unrun
 * acceptance test, or material that has not landed. That is the whole point of
 * keeping the five shapes honest — the answer assembles itself from them, so it
 * cannot flatter the job.
 */
import type { MediaRef } from '../types';

/** Where the line itself is meant, rather than a machine on it. */
export const LINE_ITSELF = 'The line itself';

export type CommissionKind = 'program' | 'material' | 'check' | 'punch' | 'task';

/** The five colours the whole surface reads in. Same letters the walk uses, so
 *  a status means the same thing everywhere in the app.
 *  n not started · w in progress · a at risk · r blocked/failed · g done/proven */
export type ReadyState = 'n' | 'w' | 'a' | 'r' | 'g';

interface Base {
  id: string;
  projectId: string;
  /** Which machine. Absent means the line itself. */
  asset?: string;
  /** Which phase of the programme this belongs to, and therefore which gate it
   *  holds up. Absent means it is not tied to a stage — it still shows on the
   *  line, it simply gates nothing. */
  phaseId?: string;
  title: string;
  owner?: string;
  /** ISO date this is wanted by. */
  due?: string;
  note?: string;
  photos?: MediaRef[];
  /** Line-walk evidence this is proved by — ids only; the snag keeps its own
   *  lifecycle so closing it on the walk closes it here. */
  snagIds?: string[];
  sort: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/* ---------- PROGRAM: a product that must run at an agreed rate ---------- */

/** One attempt at rate. THE evidence a commissioning file is built on: we ran
 *  this product for this long and achieved this. */
export interface Run {
  id: string;
  at: number;
  /** Who witnessed it. A rate nobody watched is a claim, not a result. */
  by?: string;
  minutes?: number;
  packs?: number;
  /** Achieved rate, in the same unit as the agreed rate. */
  achieved: number;
  /** Give-away waste as a percentage, when it was measured. */
  wastePct?: number;
  note?: string;
  photos?: MediaRef[];
}

export interface Program extends Base {
  kind: 'program';
  /** The contractual figure, agreed before the machine shipped. */
  agreedRate: number;
  /** Packs per minute unless somebody says otherwise. */
  rateUnit?: string;
  /** Has the recipe been written on the machine at all? False is MISSING, and
   *  it is usually the OEM's to fix rather than ours. */
  written: boolean;
  runs?: Run[];
}

/* ---------- MATERIAL: what the line needs to run ---------- */

export interface Material extends Base {
  kind: 'material';
  need: number;
  have: number;
  onOrder?: number;
  /** Rolls, cases, kg — whatever it is counted in. */
  unit?: string;
}

/* ---------- CHECK: a site acceptance test ---------- */

export interface Check extends Base {
  kind: 'check';
  /** What good looks like, agreed in advance. */
  criterion: string;
  result?: string;
  outcome: 'notRun' | 'pass' | 'fail';
  witnessedBy?: string;
  at?: number;
}

/* ---------- PUNCH: a defect on the handover list ---------- */

/** A blocks sign-off · B before production · C can follow. */
export type Severity = 'A' | 'B' | 'C';

export interface Punch extends Base {
  kind: 'punch';
  severity: Severity;
  raisedAt: number;
  closedAt?: number;
  /** Whose to fix — usually the OEM or us. */
  fixBy?: string;
}

/* ---------- TASK: the rest of the obligation ---------- */

export interface Task extends Base {
  kind: 'task';
  state: 'todo' | 'doing' | 'waiting' | 'done';
}

export type CommissionItem = Program | Material | Check | Punch | Task;

/* ================================ derived ================================ */

const todayISO = (): string => new Date().toISOString().slice(0, 10);
const late = (iso?: string): boolean => !!iso && iso < todayISO();

/** The best rate ever achieved for a program, and the run it came from. */
export const bestRun = (p: Program): Run | undefined =>
  (p.runs ?? []).reduce<Run | undefined>((b, r) => (!b || r.achieved > b.achieved ? r : b), undefined);

export type ProgramStatus = 'missing' | 'untested' | 'below' | 'proven';

/** Where a program has got to.
 *
 *  `missing` is deliberately separate from `untested`: a program nobody has
 *  written is a different conversation, with a different person, than one that
 *  exists and has not been run. Rolling them together is how "we're waiting on
 *  the OEM" becomes invisible. */
export function programStatus(p: Program): ProgramStatus {
  if (!p.written) return 'missing';
  const best = bestRun(p);
  if (!best) return 'untested';
  return best.achieved >= p.agreedRate ? 'proven' : 'below';
}

export type MaterialStatus = 'have' | 'awaited' | 'short' | 'late';

/** Have we got the stuff. `short` means nothing is even on order. */
export function materialStatus(m: Material): MaterialStatus {
  if (m.have >= m.need) return 'have';
  const coming = m.onOrder ?? 0;
  if (coming <= 0) return 'short';
  return late(m.due) ? 'late' : 'awaited';
}

export const isOpen = (p: Punch): boolean => p.closedAt == null;

/** One record's colour, whatever kind it is. */
export function stateOf(i: CommissionItem): ReadyState {
  switch (i.kind) {
    case 'program':
      return { missing: 'r', untested: 'n', below: 'a', proven: 'g' }[programStatus(i)] as ReadyState;
    case 'material':
      return { have: 'g', awaited: 'w', short: 'a', late: 'r' }[materialStatus(i)] as ReadyState;
    case 'check':
      return i.outcome === 'pass' ? 'g' : i.outcome === 'fail' ? 'r' : late(i.due) ? 'a' : 'n';
    case 'punch':
      return !isOpen(i) ? 'g' : i.severity === 'A' ? 'r' : i.severity === 'B' ? 'a' : 'w';
    case 'task':
      return i.state === 'done' ? 'g' : i.state === 'waiting' ? 'a'
        : i.state === 'doing' ? 'w' : late(i.due) ? 'a' : 'n';
  }
}

export const STATE_WORD: Record<ReadyState, string> = {
  n: 'not started', w: 'in progress', a: 'at risk', r: 'blocked', g: 'done',
};

/* ---------- the only question that matters ---------- */

export interface Blocker {
  /** What is in the way, in the words somebody would use in the meeting. */
  what: string;
  /** Which asset it sits on, for a line made of several machines. */
  asset?: string;
  /** The record it came from, so the page can link straight to it. */
  id: string;
  kind: CommissionKind;
}

export interface Readiness {
  /** Can this be accepted today. */
  canSignOff: boolean;
  /** Everything standing in the way, worst first. */
  blockers: Blocker[];
  programs: { total: number; proven: number; below: number; untested: number; missing: number };
  materials: { total: number; have: number; short: number; awaited: number; late: number };
  checks: { total: number; pass: number; fail: number; notRun: number };
  punch: { openA: number; openB: number; openC: number; closed: number };
  tasks: { total: number; done: number };
  /** How far through, 0–1: everything that can be finished, that is. */
  pct: number;
}

const only = <K extends CommissionKind>(items: CommissionItem[], kind: K) =>
  items.filter((i): i is Extract<CommissionItem, { kind: K }> => i.kind === kind);

/** Read the whole picture off the records.
 *
 *  Order matters: the blockers come out worst first, because this list is read
 *  from the top in a meeting and whatever is at the bottom does not get said.
 *  An open A defect outranks an unproven program, which outranks material. */
export function readiness(items: CommissionItem[]): Readiness {
  const live = items.filter(i => !i.deletedAt);
  const programs = only(live, 'program');
  const materials = only(live, 'material');
  const checks = only(live, 'check');
  const punch = only(live, 'punch');
  const tasks = only(live, 'task');

  const ps = { total: programs.length, proven: 0, below: 0, untested: 0, missing: 0 };
  for (const p of programs) ps[programStatus(p)]++;

  const ms = { total: materials.length, have: 0, short: 0, awaited: 0, late: 0 };
  for (const m of materials) ms[materialStatus(m)]++;

  const cs = { total: checks.length, pass: 0, fail: 0, notRun: 0 };
  for (const c of checks) cs[c.outcome === 'pass' ? 'pass' : c.outcome === 'fail' ? 'fail' : 'notRun']++;

  const open = punch.filter(isOpen);
  const pu = {
    openA: open.filter(p => p.severity === 'A').length,
    openB: open.filter(p => p.severity === 'B').length,
    openC: open.filter(p => p.severity === 'C').length,
    closed: punch.length - open.length,
  };

  const ts = { total: tasks.length, done: tasks.filter(t => t.state === 'done').length };

  const blockers: Blocker[] = [
    ...open.filter(p => p.severity === 'A')
      .map(p => ({ what: `A defect open: ${p.title}`, asset: p.asset, id: p.id, kind: 'punch' as const })),
    ...checks.filter(c => c.outcome === 'fail')
      .map(c => ({ what: `Acceptance test failed: ${c.title}`, asset: c.asset, id: c.id, kind: 'check' as const })),
    ...programs.filter(p => programStatus(p) === 'missing')
      .map(p => ({ what: `No program written for ${p.title}`, asset: p.asset, id: p.id, kind: 'program' as const })),
    ...programs.filter(p => programStatus(p) === 'below')
      .map(p => ({
        what: `${p.title} short of rate — ${bestRun(p)?.achieved ?? 0} against ${p.agreedRate} ${p.rateUnit ?? 'ppm'}`,
        asset: p.asset, id: p.id, kind: 'program' as const,
      })),
    ...materials.filter(m => materialStatus(m) === 'late' || materialStatus(m) === 'short')
      .map(m => ({ what: `${m.title}: ${m.have} of ${m.need} ${m.unit ?? ''}`.trim(), asset: m.asset, id: m.id, kind: 'material' as const })),
    ...programs.filter(p => programStatus(p) === 'untested')
      .map(p => ({ what: `${p.title} not yet run at rate`, asset: p.asset, id: p.id, kind: 'program' as const })),
    ...checks.filter(c => c.outcome === 'notRun')
      .map(c => ({ what: `Acceptance test not run: ${c.title}`, asset: c.asset, id: c.id, kind: 'check' as const })),
    ...tasks.filter(t => t.state !== 'done')
      .map(t => ({ what: t.title, asset: t.asset, id: t.id, kind: 'task' as const })),
  ];

  const done = ps.proven + ms.have + cs.pass + pu.closed + ts.done;
  const total = ps.total + ms.total + cs.total + punch.length + ts.total;

  return {
    // A C-grade defect does not stop a handover, and neither does a closed one.
    canSignOff: total > 0 && blockers.length === 0,
    blockers,
    programs: ps, materials: ms, checks: cs, punch: pu, tasks: ts,
    pct: total ? done / total : 0,
  };
}

/** The assets on this line, each with its own readiness, plus the line itself
 *  last. A single project percentage cannot say "the bagger is ready and the
 *  palletiser has not started", which is the sentence a GM actually wants. */
export function byAsset(items: CommissionItem[]): { asset: string; items: CommissionItem[]; ready: Readiness }[] {
  const live = items.filter(i => !i.deletedAt);
  const names = [...new Set(live.map(i => i.asset ?? LINE_ITSELF))]
    .sort((a, b) => (a === LINE_ITSELF ? 1 : b === LINE_ITSELF ? -1 : a.localeCompare(b)));
  return names.map(asset => {
    const mine = live.filter(i => (i.asset ?? LINE_ITSELF) === asset);
    return { asset, items: mine, ready: readiness(mine) };
  });
}

/* ============================== THE PROGRAMME ==============================
 *
 * A commissioning job is a PROJECT, and the first cut of this file forgot that
 * entirely. It modelled the finish line — can we sign off — and nothing of the
 * race: no phases, no dates, no plan, so nothing could ever be early or late.
 * Handover is one gate at the end of six, not the system.
 *
 * A line is commissioned in the same order everywhere, because each stage needs
 * the one before it to be true:
 *
 *   FAT         it runs at rate on the OEM's floor, before it ships
 *   INSTALL     it is here, bolted down, services on
 *   MECHANICAL  guarded, labelled, safe, dry-run — nobody may put product
 *   COMPLETION  through a line that has not passed this
 *   SAT         it does on our floor what the contract says, witnessed
 *   RATE        every program proven at its agreed rate with real product
 *   HANDOVER    punch list down, training done, spares and papers in
 *
 * PLANNED VERSUS FORECAST IS THE WHOLE POINT. Without a baseline nothing can be
 * LATE, only due — which is why the first version could show a date slipping by
 * three weeks and say nothing. Every phase keeps the date it was planned for
 * and the date it is now expected, and the difference is the number the meeting
 * is actually about.
 *
 * A GATE CANNOT BE PASSED WITH SOMETHING OPEN. That is what makes this a
 * commissioning system rather than a list of dates somebody moves. Passing is
 * dated and named, and what has to be true first is derived from the records —
 * never a box somebody ticks.
 */

export type PhaseKey = 'fat' | 'install' | 'mechanical' | 'sat' | 'rate' | 'handover';

/** The order they happen in, and the order they are drawn in. */
export const PHASE_ORDER: PhaseKey[] = ['fat', 'install', 'mechanical', 'sat', 'rate', 'handover'];

export const PHASE_NAME: Record<PhaseKey, string> = {
  fat: 'Factory acceptance (FAT)',
  install: 'Delivery & install',
  mechanical: 'Mechanical completion',
  sat: 'Site acceptance (SAT)',
  rate: 'Rate proving',
  handover: 'Handover & sign-off',
};

/** What each stage is for, in the words somebody would use on the floor. Shown
 *  under the heading so a phase nobody has run before still explains itself. */
export const PHASE_WHAT: Record<PhaseKey, string> = {
  fat: 'It runs at rate on the OEM’s floor, before it ships.',
  install: 'It is here, bolted down, services connected.',
  mechanical: 'Guarded, labelled, safe and dry-run. No product goes through a line that has not passed this.',
  sat: 'It does on our floor what the contract says, witnessed and written down.',
  rate: 'Every program proven at its agreed rate, with real product and real people.',
  handover: 'Punch list down, training done, spares and papers in. The line is ours.',
};

export interface Phase {
  id: string;
  projectId: string;
  /* WHY THIS IS A STRING AND NOT THE UNION.
   *
   * Six stages is how a packaging line is commissioned, and it is the right
   * default. It is not a law. The first job that needs "Trials" or "Vertical
   * start-up" between two of them should not need a migration and a deploy, and
   * a system that says "your process is wrong, use mine" gets abandoned for the
   * spreadsheet it replaced. So the six keys below are seeded, and anything
   * else is allowed: the stage rules key off the known names and a custom stage
   * simply carries its own work. */
  key: string;
  /** Renamed by somebody. Absent means the built-in name for `key`. */
  name?: string;
  /** Where it sits in the run. Explicit rather than derived from the key, so a
   *  stage can be inserted between two others without renumbering the world. */
  sort: number;
  /** The date this was agreed for at the start — the baseline. Never edited
   *  once the job is running; that is what makes a slip visible. ISO date. */
  plannedAt?: string;
  /** When we now think it will happen. This is the one that moves. ISO date. */
  forecastAt?: string;
  /** Set when the gate is passed. ISO date. */
  passedAt?: string;
  /** Who signed it off — a gate passed by nobody is not passed. */
  passedBy?: string;
  owner?: string;
  note?: string;
  updatedAt: number;
  deletedAt?: number;
}

export type PhaseState = 'passed' | 'current' | 'upcoming';

const DAY = 86_400_000;

/** Whole days between two ISO dates, positive when `b` is later. */
export function daysBetween(a?: string, b?: string): number | undefined {
  if (!a || !b) return undefined;
  const x = Date.parse(a), y = Date.parse(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return undefined;
  return Math.round((y - x) / DAY);
}

/** How far a phase has moved from the date it was planned for. Positive is
 *  late. Undefined when there is no baseline to measure against — which is
 *  honest, and quite different from zero. */
export const slipOf = (p: Phase): number | undefined =>
  daysBetween(p.plannedAt, p.passedAt ?? p.forecastAt);

/** What this stage is called: what somebody renamed it to, else the built-in
 *  name, else the key itself — which is what a custom stage has. */
export const phaseName = (p: Phase): string =>
  p.name?.trim() || PHASE_NAME[p.key as PhaseKey] || p.key;

/** Where a phase stands. `current` is the FIRST unpassed phase — a commissioning
 *  job is a queue, not a set of parallel workstreams, so exactly one phase is
 *  ever the one being worked on. */
export function phaseStates(phases: Phase[]): Map<string, PhaseState> {
  const out = new Map<string, PhaseState>();
  let seenCurrent = false;
  for (const p of inOrder(phases)) {
    if (p.passedAt) { out.set(p.id, 'passed'); continue; }
    out.set(p.id, seenCurrent ? 'upcoming' : 'current');
    seenCurrent = true;
  }
  return out;
}

export const inOrder = (phases: Phase[]): Phase[] =>
  phases.filter(p => !p.deletedAt).sort((a, b) => a.sort - b.sort);

/** The phase being worked on now, if the job is not finished. */
export const currentPhase = (phases: Phase[]): Phase | undefined =>
  inOrder(phases).find(p => !p.passedAt);

/** What has to be true before this gate can be passed, read off the records.
 *  Items carrying the phase, plus the rules the stage itself imposes — a gate
 *  whose conditions are only the rows somebody remembered to add is a gate that
 *  can be passed around. */
export interface GateCriterion {
  what: string;
  met: boolean;
  /** The record it came from, when it came from one. */
  id?: string;
  /** Why it is not met, in the words of the meeting. */
  why?: string;
}

export function gateCriteria(phase: Phase, items: CommissionItem[]): GateCriterion[] {
  const mine = items.filter(i => !i.deletedAt && i.phaseId === phase.id);
  const out: GateCriterion[] = mine
    .sort((a, b) => a.sort - b.sort)
    .map(i => {
      const s = stateOf(i);
      return {
        what: i.title,
        met: s === 'g',
        id: i.id,
        why: s === 'g' ? undefined : whyNot(i),
      };
    });

  /* THE RULES THE STAGE ITSELF IMPOSES, whatever anybody typed. These are the
     ones that get argued about at five o'clock on a Friday, and they are not
     negotiable by leaving a row off the list. */
  const live = items.filter(i => !i.deletedAt);
  /* The stage rules apply to the BUILT-IN stages they were written for. A
     stage somebody invented carries its own work and nothing more — inventing
     rules for a name we have never seen would be this system telling somebody
     what their own process means. */
  if (phase.key === 'mechanical' || phase.key === 'sat' || phase.key === 'rate' || phase.key === 'handover') {
    const openA = live.filter((i): i is Punch => i.kind === 'punch' && isOpen(i) && i.severity === 'A');
    out.push({
      what: 'No open grade-A defects',
      met: openA.length === 0,
      why: openA.length ? `${openA.length} open — ${openA.map(p => p.title).join(', ')}` : undefined,
    });
  }
  if (phase.key === 'rate' || phase.key === 'handover') {
    const programs = live.filter((i): i is Program => i.kind === 'program');
    const proven = programs.filter(p => programStatus(p) === 'proven').length;
    out.push({
      what: 'Every program proven at its agreed rate',
      met: programs.length > 0 && proven === programs.length,
      why: programs.length === 0 ? 'no programs listed yet'
        : proven === programs.length ? undefined : `${proven} of ${programs.length} proven`,
    });
  }
  if (phase.key === 'handover') {
    const checks = live.filter((i): i is Check => i.kind === 'check');
    const passed = checks.filter(c => c.outcome === 'pass').length;
    out.push({
      what: 'Every acceptance test passed',
      met: checks.length > 0 && passed === checks.length,
      why: checks.length === 0 ? 'no acceptance tests listed yet'
        : passed === checks.length ? undefined : `${passed} of ${checks.length} passed`,
    });
    const owed = live.filter((i): i is Material => i.kind === 'material' && materialStatus(i) !== 'have');
    out.push({
      what: 'Material on site to run',
      met: owed.length === 0,
      why: owed.length ? `${owed.length} line${owed.length === 1 ? '' : 's'} short` : undefined,
    });
  }
  /* WHAT IS OWED COMES FIRST. The list is read top-down by somebody deciding
     whether to sign; burying the one open item under five ticks is how a gate
     gets passed by a reader who ran out of patience three rows in. */
  return out.sort((a, b) => Number(a.met) - Number(b.met));
}

/** Why a record is not done, said the way somebody would say it out loud. */
function whyNot(i: CommissionItem): string | undefined {
  switch (i.kind) {
    case 'program': {
      const st = programStatus(i);
      return st === 'missing' ? 'no program written'
        : st === 'untested' ? 'never run'
          : `${bestRun(i)?.achieved ?? 0} against ${i.agreedRate} ${i.rateUnit ?? 'ppm'}`;
    }
    case 'material':
      return `${i.have} of ${i.need}${i.unit ? ' ' + i.unit : ''}`;
    case 'check':
      return i.outcome === 'fail' ? 'failed' : 'not run';
    case 'punch':
      return `grade ${i.severity} open`;
    case 'task':
      return { todo: 'not started', doing: 'in progress', waiting: 'waiting on somebody', done: undefined }[i.state];
  }
}

export const canPass = (phase: Phase, items: CommissionItem[]): boolean => {
  const cs = gateCriteria(phase, items);
  return cs.length > 0 && cs.every(c => c.met);
};

/* ---------------------------- the programme view --------------------------- */

export interface Programme {
  phases: Phase[];
  states: Map<string, PhaseState>;
  current?: Phase;
  /** The last phase's date — when this line becomes ours. */
  handoverAt?: string;
  /** Days the handover has moved from its baseline. Positive is late. */
  handoverSlip?: number;
  /** Everything standing in the way of the CURRENT gate, worst first. */
  blocking: GateCriterion[];
}

export function programme(phases: Phase[], items: CommissionItem[]): Programme {
  const ordered = inOrder(phases);
  const states = phaseStates(ordered);
  const current = ordered.find(p => !p.passedAt);
  const last = ordered[ordered.length - 1];
  return {
    phases: ordered,
    states,
    current,
    handoverAt: last?.passedAt ?? last?.forecastAt ?? last?.plannedAt,
    handoverSlip: last ? slipOf(last) : undefined,
    blocking: current ? gateCriteria(current, items).filter(c => !c.met) : [],
  };
}

/** Everything with a date inside the next `days` days, soonest first — the list
 *  a Monday call is run from. Overdue things come first and stay until done,
 *  because a date that has passed does not stop mattering. */
export interface Dated {
  /** ISO date. */
  at: string;
  what: string;
  who?: string;
  /** True once the date is behind us and the thing is not done. */
  late: boolean;
  kind: CommissionKind | 'phase';
  id: string;
}

export function comingUp(phases: Phase[], items: CommissionItem[], days = 7, today = new Date()): Dated[] {
  const from = today.toISOString().slice(0, 10);
  const to = new Date(today.getTime() + days * DAY).toISOString().slice(0, 10);
  const out: Dated[] = [];

  for (const p of inOrder(phases)) {
    const at = p.forecastAt ?? p.plannedAt;
    if (!at || p.passedAt) continue;
    if (at <= to) out.push({ at, what: phaseName(p), who: p.owner, late: at < from, kind: 'phase', id: p.id });
  }
  for (const i of items) {
    if (i.deletedAt || !i.due || stateOf(i) === 'g') continue;
    if (i.due <= to) out.push({ at: i.due, what: i.title, who: i.owner, late: i.due < from, kind: i.kind, id: i.id });
  }
  return out.sort((a, b) => (a.late === b.late ? a.at.localeCompare(b.at) : a.late ? -1 : 1));
}

/** A fresh programme: the six phases, no dates yet. Dates are the user's to
 *  set — inventing them would put a baseline in the file that nobody agreed,
 *  and a baseline nobody agreed is worse than none. */
export function freshPhases(projectId: string, mkId: () => string, at: number): Phase[] {
  return PHASE_ORDER.map((key, i) => ({ id: mkId(), projectId, key, sort: (i + 1) * 10, updatedAt: at }));
}

/** Where a new stage goes when it is dropped in after `afterSort`. Gaps of ten
 *  mean an insert is one number, never a renumbering of every row after it —
 *  which would be six writes and six sync pushes to add one stage. */
export function sortBetween(phases: Phase[], afterSort?: number): number {
  const sorts = inOrder(phases).map(p => p.sort);
  if (afterSort == null) return (sorts[sorts.length - 1] ?? 0) + 10;
  const next = sorts.find(x => x > afterSort);
  return next == null ? afterSort + 10 : (afterSort + next) / 2;
}

/** A stage somebody adds themselves. The key is only an identifier here, so it
 *  is derived from the name and made unique rather than chosen from a list. */
export function customPhaseKey(name: string, taken: string[]): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'stage';
  if (!taken.includes(base)) return base;
  let n = 2;
  while (taken.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
