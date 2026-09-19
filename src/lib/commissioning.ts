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
