/* EVERY JOB, ONE CALENDAR.
 *
 * Rowland: "What happens when I have multiple projects all going on? How do I
 * see that in one home? Line 2B commissioning, and next week Line 2A — how do
 * I manage each of them without going into everything?"
 *
 * The answer is not a new record. Each job already says where it stands —
 * standing() gives the sentence, the outstanding rows and the dated marks —
 * so this is those same answers laid side by side, on ONE calendar, so that
 * a month lands in the same place on every job and the weeks where two of
 * them pile onto the same people can be seen.
 *
 * Three things only a view across jobs can say, which is why it exists:
 *
 *   - what is due or late THIS WEEK, across everything, each item tagged with
 *     the job it belongs to;
 *   - who owes what ACROSS the jobs — "Ilapak owes 4 on 2B and 2 on 2A" is
 *     one conversation with Ilapak, not two;
 *   - where the jobs overlap, which is the Gantt.
 *
 * Pure: the screen loads the records and draws what comes back. Nothing here
 * reads a clock except through `today`.
 */
import { owns } from './format';
import type { Project } from '../types';
import type { Asset, Test, TestItem } from './testing';
import { assetStateOf, gateOf, isOverdue, isSettled, isTestFace, live, plannedEnd, titleOnMachine } from './testing';
import { jobJourney, journeyNow, lateOrProblem, type JourneyGate, type GateTone } from './install';
import { DAY_HOURS, hoursTally, hoursWord } from './hoursLost';
import { niceDay } from './weeks';
import { stageGateOnTarget, type OnTarget } from './onTarget';
import type { Material } from './materials';
import { isHere } from './materials';
import type { Program } from './programs';
import { daysOverdue, stateOf } from './programs';
import { standing, slipWords, type PlanMark } from './standing';
import { layoutPlan, type PlacedMark, type PlanAxis } from './plan';
import { companies, resolver, type Company } from './names';
import type { PaceLineRow, PaceTodoRow } from '../db';
import { methodOf, planModel, type PlanModel } from './planModel';
import { DUE_SOON_DAYS, isLate as stepIsLate } from './actions';
import { openByBone } from './pillars';
import { remindersOf } from './reminders';
import { owedParts, partLate, partOnStage } from './noted';
import type { TreeStanding } from './treeBind';
import { PHASE_WORD, type Phase } from './problems';
import { couldWords, criticalProblems, criticalState, riskProblems } from './critical';

export interface JobInput {
  project: Project;
  tests: Test[];
  items: TestItem[];
  materials: Material[];
  programs: Program[];
  assets: Asset[];
}

/** A 6M or lever tree job, as the control room reads it: the actions kept on
 *  its board, its lines, and how many of them are at target. Rowland: "turn it
 *  into a control room for change on your lines" — the board was a stage-gate
 *  board only, and a job on the other two methods did not appear on it. */
export interface PacedInput {
  project: Project;
  /** The board's actions — the project's next steps (lib/actions). */
  steps: PaceTodoRow[];
  lines: PaceLineRow[];
  /** Lines meeting their target, of the lines there is a target to judge. */
  atTarget: number;
  judged: number;
  /** Its meeting notes — for their reminders (lib/reminders). */
  notes?: TestItem[];
  /** A lever tree job's tree, read the way the tree draws it (treeStanding). */
  tree?: TreeStanding;
  /** A 6M job's problems, as the engine reads them (lib/useProblems viewsOf —
   *  the phase is lib/fishbone phaseOf's, never worked out again here). */
  problems?: SixMProblem[];
  /** A 6M job's lines against their target, in the sentence the 6M client
   *  report leads with (lib/measures gapOf). */
  gaps?: { lineId: string; line: string; says: string; short?: string }[];
  /** Are its lines on target? (lib/onTarget linesOnTarget) */
  onTarget?: OnTarget;
}

/** One 6M problem as the control room needs it: enough to say where it is and
 *  to open its fishbone. */
export interface SixMProblem { id: string; title: string; lineId?: string; phase: Phase; says: string }

/** A piece of a sentence, and whether it is the abnormal part that carries a
 *  colour: `late` red (past its day, or slipped back), `waiting` amber, `none`
 *  grey (nothing there). Everything else is plain ink. */
export interface Said { text: string; tone?: 'late' | 'waiting' | 'none' }
export const saidText = (parts: Said[]): string => parts.map(x => x.text).join('');

/** One thing owed, on one job. */
export interface JobItem {
  jobId: string;
  job: string;
  color: string;
  kind: PlanMark['kind'];
  /** The record it opens: a test or fix id; absent for a list row. */
  id?: string;
  /** A PART OF THE PLAN on the stage `id` (ui/StageParts): the part's own
   *  item id. The row opens its stage — the part is a branch of it. */
  part?: string;
  what: string;
  /** Who owes it, as typed. Empty is nobody. */
  who: string;
  /** Who it is filed under on the board: the supplier, spelled the way it is
   *  mostly typed; "The site" for anybody who is not a supplier; or nobody.
   *  Set by portfolio(). */
  party?: string;
  partyKind?: 'supplier' | 'site' | 'nobody';
  /** ISO. The day it is due by. */
  on?: string;
  late: boolean;
  /** A stage's hours lost to its problems, when they made it late
   *  (lib/install lateOrProblem). */
  lost?: number;
  /** AN OPEN CRITICAL PROBLEM (lib/critical), not a thing owed: where it is,
   *  what it means for the business, and how it stands in words. Its row
   *  opens its stage (`id`) — the problem is a branch of it. Never in the
   *  week, the parties or the late count; it leads Needs you (needsYou). */
  critical?: { where: string; impact?: string; state: string;
    /** A HIGH RISK (lib/critical riskProblems), not critical: amber, after
     *  the critical ones, never counted as "critical". */
    risk?: boolean };
}

export interface JobView {
  id: string;
  /** Which kind of change this is — a stage-gate row leads with its gates, a
   *  6M row with its open countermeasures by bone, a lever tree row with its
   *  tree. */
  method: PlanModel;
  methodLabel: string;
  /** Lines at target, said in words, when there is a target to judge. */
  reach?: string;
  /** Some judged line is short of its target — the one case the reach chip
   *  carries a colour (red, as the gap's "short" is on the client report);
   *  every line at target is normal, and normal recedes. */
  reachShort?: boolean;
  /** The board's bones that have anything open on them — only those, in the
   *  fishbone's order — each with how many are open and how it stands
   *  (late if anything on it is). Empty when nothing is open. */
  pillars: { key: string; label: string; open: number; tone: GateTone }[];
  /** A lever tree job: how its outcome and conditions stand — what its row
   *  leads with instead of the board's columns. */
  tree?: TreeStanding;
  /** A 6M job: its problems by phase and its open countermeasures by bone, in
   *  words (docs/SIXM.md, "Home / control room"), and what its drawer leads
   *  with — each line against its target, then the problems, worst first. */
  sixm?: {
    phases: Said[];
    bones: Said[];
    gaps: { lineId: string; line: string; says: string; short?: string }[];
    problems: (SixMProblem & { word: string; slipped: boolean })[];
  };
  name: string;
  color: string;
  lead?: string;
  /** A 6M or lever tree job's lines, each with its owner — the one-tap route
   *  to the line you want, carried from the project card the row replaced. */
  lines?: { id: string; key: string; name: string; owner?: string }[];
  sentence: string;
  slip?: string;
  daysToGo?: number;
  outstanding: number;
  late: number;
  /** Marks that have happened, of all the marks with a date. */
  done: number;
  total: number;
  /** The job's own reach on the shared calendar, as fractions. */
  from?: number;
  to?: number;
  /** Every dated mark, placed on the shared calendar. */
  marks: PlacedMark[];
  axis: PlanAxis;
  /** Everything this job's timeline needs, for drawing it under the same
   *  calendar when the row is opened. */
  plan: PlanMark[];
  expectedAt?: string;
  plannedAt?: string;
  /** The next thing owed on this job, soonest first, late before anything. */
  next?: JobItem;
  /** The four gates across the job's machines, and the one it is at. What a
   *  row on the board leads with: "at Commission" says where a job is; "10
   *  open" added planned gate steps to things owed and said neither. */
  gates: { gate: JourneyGate; label: string; tone: GateTone }[];
  at: string;
  /** ARE WE ON TARGET? (lib/onTarget) — the word and its reason, the same
   *  answer the job's own front page and its reports lead with. */
  onTarget?: OnTarget;
  /** Stages that hit a problem and lost no time — amber on the rail, said
   *  apart from `late` (lib/install lateOrProblem). */
  problems?: number;
  /** Its open critical problems, oldest first (criticalItems) — "1 critical"
   *  in solid red on its row. Empty on a 6M or lever tree job. */
  critical: JobItem[];
}

export interface Owed {
  who: string;
  kind: 'supplier' | 'site' | 'nobody';
  open: number;
  late: number;
  /** Per job, in the jobs' order: how many this party owes on each. */
  byJob: { jobId: string; job: string; color: string; open: number; late: number }[];
}

export interface Portfolio {
  axis: PlanAxis;
  /** Every date on every job — pass it as `span` to draw one job under the
   *  same calendar as the rest. */
  span: string[];
  jobs: JobView[];
  /** Late, or due within the week, across every job. Late first. */
  week: JobItem[];
  /** Everything owed, on every job, late first — what a number or a party on
   *  the board opens into. */
  items: JobItem[];
  /** Reminders set on meeting notes, every job, gone first — a week ahead.
   *  Kept apart from `items`: a reminder is not something a party owes. */
  reminders: JobItem[];
  /** Fixes nobody has agreed a date for, every job — "no date agreed" is a
   *  thing to chase, and nothing with no date reaches "this week". */
  undated: JobItem[];
  owes: Owed[];
  /** Every open critical problem, every job, the job's order then oldest
   *  first — what the control room's "1 critical" opens into. */
  critical: JobItem[];
  /** Suppliers typed more than one way — the records disagree with each other. */
  variants: Company[];
  totals: { jobs: number; outstanding: number; late: number; week: number; critical: number };
  says: string;
}

const WEEK_DAYS = 7;

/** "Line 2B commissioning" is "Line 2B" on a board where every row is a
 *  commissioning job — the word said nothing and pushed the rest off the row. */
export function shortName(name: string): string {
  const s = name.replace(/\s*\bcommissioning\b\s*/i, ' ').replace(/\s+/g, ' ').trim();
  return s || name;
}

const addDays = (iso: string, n: number): string => {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const NOBODY = 'Nobody named';
export const SITE = 'The site';

/** Is this item filed under this party on the board? */
export const owedBy = (x: JobItem, who: string): boolean => x.party === who;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A stage, late or not by the one rule, with the hours its problems lost
 *  when they are what made it late — so "was Thu 8 Oct" is never said of a
 *  day still to come. */
function stageLate(t: Test, items: TestItem[], today: string): { late: boolean; lost?: number } {
  if (lateOrProblem(t, items, today) !== 'late') return { late: false };
  const lost = hoursTally(t.id, items, DAY_HOURS).hours;
  return lost > 0 ? { late: true, lost } : { late: true };
}

/** When a late thing was due, in words: "was Thu 1 Oct" for a day gone; a
 *  stage late by the hours its problems lost while its day is still to come
 *  says that instead — "2 h lost". */
export function lateWhen(x: Pick<JobItem, 'on' | 'lost'>, today: string): string {
  if (x.on && x.on < today) return `was ${niceDay(x.on)}`;
  return x.lost ? `${hoursWord(x.lost)} lost` : 'late';
}

/** What each job owes, one row per thing — the same rules standing() counts
 *  by, so the board and each job's own verdict cannot disagree. */
export function jobItems(j: JobInput, today: string): JobItem[] {
  const p = j.project;
  const base = { jobId: p.id, job: shortName(p.name), color: p.color };
  const out: JobItem[] = [];
  for (const t of live(j.tests)) {
    const owed = !isSettled(t) || t.outcome === 'notRun';
    if (!owed) continue;
    out.push({
      /* A step is filed under its GATE — Set up and Hand over have words of
         their own (KIND_WORD), and "Install step" over a hand-over item was
         wrong on the control room's week and the job's front page alike. */
      ...base, kind: t.kind === 'install' ? gateOf(t) : t.kind ?? 'test', id: t.id, what: titleOnMachine(t, j.tests, j.assets),
      who: t.withWhom ?? '', on: plannedEnd(t),
      /* A stage is late by the one rule — its day gone, or hours lost
         (lib/install lateOrProblem) — the late standing() counts. */
      ...(t.kind === 'install' ? stageLate(t, j.items, today) : { late: isOverdue(t, today) }),
    });
  }
  /* A part of a stage with a day on it, not done (lib/noted owedParts — the
     rule standing() counts it by): filed under its stage's gate, said with
     its stage first, and opening the stage. */
  for (const { part, stage } of owedParts(j.tests, j.items)) {
    const machine = live(j.assets).find(a => a.id === stage.assetId)?.name;
    out.push({
      ...base, kind: gateOf(stage), id: stage.id, part: part.id, what: partOnStage(part, stage, machine),
      who: part.owner ?? '', on: part.due, late: partLate(part, today),
    });
  }
  for (const m of live(j.materials)) {
    if (isHere(m)) continue;
    out.push({ ...base, kind: 'material', what: m.what, who: m.from ?? '', on: m.due, late: !!m.due && m.due < today });
  }
  for (const pr of live(j.programs)) {
    if (stateOf(pr) === 'proved') continue;
    out.push({ ...base, kind: 'program', what: pr.what, who: pr.from ?? '', on: pr.testOn, late: daysOverdue(pr, today) != null });
  }
  /* Owed until it lands — the same rule standing() counts by. After that the
     machine is at a gate, and the gate is what the board shows. */
  for (const a of live(j.assets)) {
    if (assetStateOf(a) !== 'awaited') continue;
    out.push({
      ...base, kind: 'machine', what: a.name, who: a.oem ?? '',
      on: a.onSiteOn ? undefined : a.dueOn, late: !!a.dueOn && a.dueOn < today && !a.onSiteOn,
    });
  }
  return out;
}

/** THE OPEN CRITICAL PROBLEMS on a job, one row each (lib/critical
 *  criticalProblems — the one reading the count and the rows are made of):
 *  filed under its stage's gate and opening its stage, as a part is. Rowland,
 *  6 October: "the ability to say in a report: look at this, this is a major
 *  problem." Kept apart from jobItems — it is not a thing a party owes. */
export function criticalItems(j: Pick<JobInput, 'project' | 'tests' | 'items' | 'assets'>): JobItem[] {
  const p = j.project;
  return criticalProblems(j.tests, j.items, j.assets).open.map(c => {
    const impact = c.item.impact?.trim();
    return {
      jobId: p.id, job: shortName(p.name), color: p.color,
      kind: !c.on ? 'test' as const : c.on.kind === 'install' ? gateOf(c.on) : c.on.kind ?? 'test',
      ...(c.on ? { id: c.on.id } : {}),
      what: c.item.what.trim() || 'A critical problem', who: c.item.owner?.trim() ?? '', late: false,
      critical: { where: c.where, ...(impact ? { impact } : {}), state: criticalState(c) },
    };
  });
}

/** THE OPEN HIGH RISKS on a job, one row each — after the critical ones on
 *  Needs you, in amber, what each could cost said with how it stands. */
export function riskItems(j: Pick<JobInput, 'project' | 'tests' | 'items' | 'assets'>): JobItem[] {
  const p = j.project;
  return riskProblems(j.tests, j.items, j.assets).open.map(c => {
    const impact = c.item.impact?.trim();
    const could = couldWords(c.item);
    return {
      jobId: p.id, job: shortName(p.name), color: p.color,
      kind: !c.on ? 'test' as const : c.on.kind === 'install' ? gateOf(c.on) : c.on.kind ?? 'test',
      ...(c.on ? { id: c.on.id } : {}),
      what: c.item.what.trim() || 'A high risk', who: c.item.owner?.trim() ?? '', late: false,
      critical: { where: c.where, ...(impact ? { impact } : {}), state: [could, criticalState(c)].filter(Boolean).join(' · '), risk: true },
    };
  });
}

/** What a 6M or lever tree job owes: every open action on its board. */
export function pacedItems(j: PacedInput, today: string): JobItem[] {
  const p = j.project;
  const base = { jobId: p.id, job: shortName(p.name), color: p.color };
  return j.steps.filter(s => s.state !== 'done').map(s => ({
    ...base, kind: 'action' as const, id: s.id, what: (s.what || '').trim() || 'An action',
    who: s.who ?? '', on: s.due, late: stepIsLate(s, today),
  }));
}

/** The actions with a day on them, as marks on the shared calendar. */
function pacedPlan(j: PacedInput, today: string): PlanMark[] {
  return j.steps.filter(s => !!s.due).map(s => ({
    id: s.id, kind: 'action' as const, at: s.due as string, label: (s.what || '').trim() || 'An action',
    tone: s.state === 'done' ? 'done' as const : stepIsLate(s, today) ? 'late' as const : 'booked' as const,
  }));
}

/** Where a 6M or lever tree job stands, in one sentence — the line the project's
 *  own front page leads with, said once here so the two cannot differ. */
export function pacedSays(a: { atTarget: number; judged: number; lines?: number; open: number; late: number; any: boolean }): string {
  const onTarget = a.judged > 0 ? `${a.atTarget} of ${a.judged} line${a.judged === 1 ? '' : 's'} at target` : '';
  const onBoard = !a.any ? ''
    : a.open === 0 ? 'nothing open on the board'
    : `${a.open} action${a.open === 1 ? '' : 's'} open${a.late ? ` — ${a.late} past ${a.late === 1 ? 'its' : 'their'} day` : ''}`;
  const said = [onTarget, onBoard].filter(Boolean).join(', with ');
  return said ? said.charAt(0).toUpperCase() + said.slice(1) + '.' : 'Nothing on the board yet.';
}

/** The open countermeasures by bone — "Machine 3 · Method 1 · People 2" —
 *  only the bones with something open, each late if anything on it is, under
 *  way otherwise. A bone with nothing open is not drawn: six tiles of zeros
 *  on every row is the noise the row is there to cut through. */
function pacedPillars(j: PacedInput, today: string): JobView['pillars'] {
  return openByBone(j.steps.map(s => ({ pillar: s.pillar, open: s.state !== 'done', late: stepIsLate(s, today) })))
    .map(b => ({ key: b.key, label: b.label, open: b.open, tone: b.late > 0 ? 'late' as const : 'going' as const }));
}

/* ------------------------------ a 6M job, in words ------------------------------ */

/** The order a 6M job's problems are read in: what has slipped back first (it
 *  is the one thing wrong), then what is being worked, then what is done. The
 *  6M client report reads them in the same order. */
export const PHASE_ORDER: Phase[] = ['slipped', 'finding', 'acting', 'proving', 'holding', 'closed'];
const OPEN_PHASES: Phase[] = ['finding', 'acting', 'proving'];

/** "2 problems — 1 finding the cause, 1 acting on it · 1 holding": the open
 *  problems by phase, then the closed ones. A slipped one is the only part with
 *  a colour, and says "slipped back". */
export function problemsSaid(phases: Phase[]): Said[] {
  if (!phases.length) return [{ text: 'No problem opened yet', tone: 'none' }];
  const count = (ph: Phase) => phases.filter(x => x === ph).length;
  const open = OPEN_PHASES.filter(count);
  const n = open.reduce((t, ph) => t + count(ph), 0);
  const out: Said[] = [];
  if (n === 0) out.push({ text: 'No problem open', tone: 'none' });
  else if (n === 1) out.push({ text: `1 problem — ${PHASE_WORD[open[0]].toLowerCase()}` });
  else out.push({ text: `${plural(n, 'problem')} — ${open.map(ph => `${count(ph)} ${PHASE_WORD[ph].toLowerCase()}`).join(', ')}` });
  for (const ph of ['slipped', 'holding', 'closed'] as Phase[]) {
    const k = count(ph);
    if (!k) continue;
    out.push({ text: ' · ' });
    out.push({ text: `${k} ${PHASE_WORD[ph].toLowerCase()}`, ...(ph === 'slipped' ? { tone: 'late' as const } : {}) });
  }
  return out;
}

/** "7 open: Machine 3 · People 2 · Material 2, 2 past their day": the board's
 *  open countermeasures by bone, the biggest bone first (the fishbone's order
 *  between equals), and only then what is abnormal — past its day in red,
 *  waiting on somebody in amber. */
export function bonesSaid(steps: Pick<PaceTodoRow, 'pillar' | 'state' | 'due'>[], today: string): Said[] {
  if (!steps.length) return [{ text: 'Nothing on the board yet', tone: 'none' }];
  const open = steps.filter(s => s.state !== 'done');
  if (!open.length) return [{ text: 'Nothing open on the board', tone: 'none' }];
  const bones = openByBone(open.map(s => ({ pillar: s.pillar, open: true })))
    .map((b, i) => ({ ...b, i })).sort((a, b) => b.open - a.open || a.i - b.i);
  const unboned = open.length - bones.reduce((t, b) => t + b.open, 0);
  const late = open.filter(s => stepIsLate(s, today)).length;
  const waiting = open.filter(s => s.state === 'waiting' && !stepIsLate(s, today)).length;
  const by = [...bones.map(b => `${b.label} ${b.open}`), ...(unboned ? [`${unboned} not on a bone yet`] : [])];
  const out: Said[] = [{ text: `${open.length} open: ${by.join(' · ')}` }];
  if (late) out.push({ text: ', ' }, { text: `${late} past ${late === 1 ? 'its' : 'their'} day`, tone: 'late' });
  if (waiting) out.push({ text: ', ' }, { text: `${waiting} waiting on somebody`, tone: 'waiting' });
  return out;
}

/** Late first (the oldest day first), then by the day it is due; nothing
 *  with no date comes before something with one. */
export const byUrgency = (a: JobItem, b: JobItem) =>
  Number(b.late) - Number(a.late) || (a.on ?? '￿').localeCompare(b.on ?? '￿') || a.what.localeCompare(b.what);

/* ------------------------- the job's own front page -------------------------
 *
 * Rowland, 5 October, of the front page that ran to three screens: "too much
 * on a screen… this is more about opening doors rather than keeping it linear
 * and simple." What the page leads with is the one list a person has to act
 * on — NEEDS YOU — and it is this same list: every thing owed (jobItems,
 * pacedItems), counted by the rules standing() counts the band's "late" and
 * the report's by, and read once here for the control room's week and the
 * job's front page alike. Nothing below is a second opinion about a job; where
 * a row opens is lib/plan planHref, the door every plan mark uses. */

/** The word a thing owed is filed under — the same word on the control room's
 *  week and on the job's front page. */
export const KIND_WORD: Record<JobItem['kind'], string> = {
  install: 'Install step', setup: 'Set-up step', handover: 'Hand-over item', test: 'Test', fix: 'Fix',
  material: 'Material', program: 'Program', machine: 'Machine', action: 'Action', note: 'Reminder',
};

/** The word a row is filed under — a part of a stage says so, in the name
 *  the stage's drawer gives it. */
export const kindWord = (x: Pick<JobItem, 'kind' | 'part'>): string => (x.part ? 'Part of the plan' : KIND_WORD[x.kind]);

/** How a row on "Needs you" stands: the day has gone (red) · due within the
 *  next few days (amber) · the next thing booked after that (indigo). */
export type Urgency = 'critical' | 'late' | 'soon' | 'next';

export interface NeedsYou {
  rows: { item: JobItem; urgency: Urgency }[];
  /** Open critical problems (criticalItems) — every one a row, leading. */
  critical: number;
  /** Open high risks (riskItems) — a row each, after the critical ones. */
  risk: number;
  /** Everything past its day — on the rows or not. */
  late: number;
  /** Everything due within the next `soonDays`, on the rows or not. */
  soon: number;
  /** Open things with a day that are not on the rows. */
  more: number;
  /** Open things with no day at all — "no date agreed" is a thing to chase,
   *  and nothing without a date can ever be late. */
  undated: number;
}

/** WHAT NEEDS YOU, in the order you would deal with it: everything past its
 *  day (the oldest first), everything due within `soonDays`, then the next
 *  thing booked — always at least one of those when there is one, so a job
 *  that is in hand still says what is coming. Capped at `max` rows; the rest
 *  is a count, and the door to the list that holds it. Pure: the same items
 *  the control room's week is made of (jobItems, pacedItems). */
export function needsYou(all: JobItem[], today: string, o: { soonDays?: number; atLeast?: number; max?: number } = {}): NeedsYou {
  const soonDays = o.soonDays ?? DUE_SOON_DAYS, atLeast = o.atLeast ?? 3, max = o.max ?? 7;
  /* A CRITICAL PROBLEM LEADS, every one of them, outside the cap: it is the
     thing the whole job has to look at (lib/critical). The rest is counted as
     it always was. */
  const crit = all.filter(x => x.critical);
  const items = all.filter(x => !x.critical);
  const soonEnd = addDays(today, soonDays);
  const urgencyOf = (x: JobItem): Urgency | undefined =>
    x.late ? 'late' : !x.on ? undefined : x.on <= soonEnd ? 'soon' : 'next';
  const dated = [...items].sort(byUrgency).flatMap(item => {
    const urgency = urgencyOf(item);
    return urgency ? [{ item, urgency }] : [];
  });
  const rows = dated.filter(r => r.urgency !== 'next').slice(0, max);
  for (const r of dated) {
    if (r.urgency !== 'next') continue;
    if (rows.length >= max || (rows.length >= atLeast && rows.some(x => x.urgency === 'next'))) break;
    rows.push(r);
  }
  return {
    rows: [...crit.map(item => ({ item, urgency: 'critical' as const })), ...rows],
    critical: crit.filter(x => !x.critical?.risk).length,
    risk: crit.filter(x => x.critical?.risk).length,
    late: dated.filter(r => r.urgency === 'late').length,
    soon: dated.filter(r => r.urgency === 'soon').length,
    more: dated.length - rows.length,
    undated: items.length - dated.length,
  };
}

export function portfolio(unsorted: JobInput[], today: string, pacedIn: PacedInput[] = []): Portfolio {
  /* The job whose date comes first, first — that is the order they get asked
     about in. A job with no date yet goes last rather than first. Stage gate,
     6M and lever tree jobs stand in one order. */
  type Entry = { project: Project; plan: PlanMark[]; items: JobItem[]; critical: JobItem[]; gate?: { j: JobInput; st: ReturnType<typeof standing> }; paced?: PacedInput };
  const entries: Entry[] = [
    ...unsorted.map((j): Entry => {
      const st = standing({
        tests: j.tests, items: j.items, materials: j.materials, programs: j.programs, assets: j.assets,
        expectedAt: j.project.expectedAt, plannedAt: j.project.plannedAt, today,
      });
      return { project: j.project, plan: st.plan, items: jobItems(j, today), critical: criticalItems(j), gate: { j, st } };
    }),
    ...pacedIn.map((j): Entry => ({ project: j.project, plan: pacedPlan(j, today), items: pacedItems(j, today), critical: [], paced: j })),
  ];
  const when = (e: Entry) => e.project.expectedAt ?? e.project.plannedAt ?? '\uffff';
  entries.sort((a, b) => when(a).localeCompare(when(b)) || a.project.name.localeCompare(b.project.name));
  const inputs = entries.flatMap(e => (e.gate ? [e.gate.j] : []));

  /* ONE CALENDAR. Every date on every job goes into every job's layout, so
     the axis runs from the same month to the same month on all of them. */
  const span = [...new Set(entries.flatMap(e => [
    ...e.plan.flatMap(m => [m.at, ...(m.until ? [m.until] : [])]),
    ...[e.project.expectedAt, e.project.plannedAt].filter((d): d is string => !!d),
  ]))].sort();

  const layout = (marks: PlanMark[], p: Project) =>
    layoutPlan(marks, { today, expectedAt: p.expectedAt, plannedAt: p.plannedAt, span, minGap: 0 });

  const all = entries.map(e => e.items);
  const weekEnd = addDays(today, WEEK_DAYS);

  const jobs: JobView[] = entries.map((e, i) => {
    const p = e.project;
    const plan = layout(e.plan, p);
    const marks = plan.lanes.flatMap(l => l.rows.flat());
    const ats = marks.flatMap(m => [m.at, ...(m.until != null ? [m.until] : [])]);
    const ends = [...ats, ...(plan.axis.expected ? [plan.axis.expected.at] : []), ...(plan.axis.agreed ? [plan.axis.agreed.at] : [])];
    const items = all[i];
    const base = {
      id: p.id, method: planModel(p), methodLabel: methodOf(p).label,
      name: shortName(p.name), color: p.color, lead: p.lead,
      from: ats.length ? Math.min(...ats) : undefined,
      to: ends.length ? Math.max(...ends) : undefined,
      marks, axis: plan.axis, plan: e.plan,
      expectedAt: p.expectedAt, plannedAt: p.plannedAt,
      next: [...items].sort(byUrgency)[0],
      critical: e.critical,
    };
    if (e.paced) {
      const j = e.paced;
      const open = items.length, late = items.filter(x => x.late).length;
      const daysToGo = p.expectedAt
        ? Math.round((Date.parse(p.expectedAt + 'T12:00:00') - Date.parse(today + 'T12:00:00')) / 86_400_000) : undefined;
      return {
        ...base,
        /* A tree job says its tree first: the outcome and its conditions are
           what it is being run against; the board is the work under them. */
        /* A tree job with no tree yet says so — its board alone would read
           "Nothing open", as if the job were in hand. */
        sentence: (j.tree ? `${j.tree.says}. ` : planModel(p) === 'tree' ? 'No tree yet — it starts from the outcome. ' : '') + pacedSays({ atTarget: j.atTarget, judged: j.judged, open, late, any: j.steps.length > 0 }),
        tree: j.tree,
        lines: j.lines.map(l => ({ id: l.id, key: l.key, name: l.name, owner: l.owner || undefined })),
        slip: undefined, daysToGo, outstanding: open, late,
        done: e.plan.filter(m => m.tone === 'done').length, total: e.plan.length,
        reach: j.judged > 0 ? `${j.atTarget} of ${j.judged} at target` : undefined,
        reachShort: j.judged > 0 && j.atTarget < j.judged,
        pillars: pacedPillars(j, today),
        ...(planModel(p) === 'board' ? { sixm: {
          phases: problemsSaid((j.problems ?? []).map(x => x.phase)),
          bones: bonesSaid(j.steps, today),
          gaps: j.gaps ?? [],
          problems: (j.problems ?? [])
            .map(x => ({ ...x, word: PHASE_WORD[x.phase], slipped: x.phase === 'slipped' }))
            .sort((a, b) => PHASE_ORDER.indexOf(a.phase) - PHASE_ORDER.indexOf(b.phase)),
        } } : {}),
        gates: [], at: methodOf(p).label,
        ...(j.onTarget ? { onTarget: j.onTarget } : {}),
      };
    }
    const { j, st } = e.gate as NonNullable<Entry['gate']>;
    const gates = jobJourney(j.assets, j.tests, j.items, today, j.programs);
    return {
      ...base,
      // A handed-over job has nothing left to count down to.
      sentence: st.sentence, slip: slipWords(st.slipDays), daysToGo: st.handedOver ? undefined : st.daysToGo,
      outstanding: st.outstanding, late: st.late,
      done: st.plan.filter(m => m.tone === 'done').length, total: st.plan.length,
      pillars: [], gates, at: journeyNow(gates),
      onTarget: stageGateOnTarget({ ...j, today }, st),
      problems: live(j.tests).filter(t => t.kind === 'install' && lateOrProblem(t, j.items, today) === 'problem').length,
    };
  });

  /* The calendar every row shares — any job's will do, they are the same
     from and to. An empty board still gets today, on a month of its own. */
  const axis: PlanAxis = jobs.find(v => v.axis.ticks.length)?.axis
    ?? layoutPlan([{ kind: 'test', at: today, label: '', tone: 'booked' }], { today }).axis;

  const week = all.flat().filter(x => x.late || (!!x.on && x.on >= today && x.on <= weekEnd)).sort(byUrgency);

  /* WHO OWES WHAT, ACROSS THE JOBS — by the same rules page 3 of the client
     report files it by, so the home board and the page a client reads say
     the same thing about the same job.
       - A SUPPLIER is anyone named as one: a machine's OEM, where a material
         or a program comes from, who a test is done with. A fix's "who" does
         not make a supplier — that is as often Dave on nights as the OEM.
       - Anybody else is THE SITE, with the person's name kept on the line.
       - Nobody at all is its own party: nobody owing something on two jobs is
         the thing most worth seeing.
     And one company is one name however it was typed (see lib/names): the
     home board grouped by the typed string and showed a real supplier as
     "Brilopak 8" and "Brillopak 6" — two companies, each owing part. */
  const supplierTyped: string[] = [];
  for (const j of inputs) {
    for (const a of live(j.assets)) if (a.oem) supplierTyped.push(a.oem);
    for (const m of live(j.materials)) if (m.from) supplierTyped.push(m.from);
    for (const pr of live(j.programs)) if (pr.from) supplierTyped.push(pr.from);
    /* A TEST's "done with" is the other side; a fix's or an install step's
       is whoever is doing it, which is as often the site's own fitter. */
    for (const t of live(j.tests)) if (isTestFace(t) && t.withWhom) supplierTyped.push(t.withWhom);
  }
  const allTyped = [...supplierTyped, ...all.flat().map(x => x.who)];
  const res = resolver(allTyped);
  const supplierSet = new Set(supplierTyped.map(n => res(n).toLowerCase()));
  for (const x of all.flat()) {
    const who = x.who.trim();
    if (!who) { x.party = NOBODY; x.partyKind = 'nobody'; }
    else if (supplierSet.has(res(who).toLowerCase())) { x.party = res(who); x.partyKind = 'supplier'; }
    else { x.party = SITE; x.partyKind = 'site'; }
  }
  /* The spellings that disagree: every supplier name typed anywhere, fixes
     included where they name a supplier. */
  const variants = companies([
    ...supplierTyped,
    ...all.flat().filter(x => x.partyKind === 'supplier').map(x => x.who),
  ]).filter(c => c.spellings.length > 1);

  const parties = new Map<string, Owed>();
  for (const x of all.flat()) {
    const party = x.party ?? NOBODY;
    let o = parties.get(party);
    if (!o) {
      o = { who: party, kind: x.partyKind ?? 'nobody', open: 0, late: 0, byJob: jobs.map(v => ({ jobId: v.id, job: v.name, color: v.color, open: 0, late: 0 })) };
      parties.set(party, o);
    }
    o.open += 1;
    if (x.late) o.late += 1;
    const slot = o.byJob.find(b => b.jobId === x.jobId);
    if (slot) { slot.open += 1; if (x.late) slot.late += 1; }
  }
  /* Suppliers first, whoever is furthest behind leading; then what nobody
     owns; the site last — the order page 3 reads in. */
  const rank = (o: Owed) => (o.kind === 'supplier' ? 0 : o.kind === 'nobody' ? 1 : 2);
  const owes = [...parties.values()]
    .map(o => ({ ...o, byJob: o.byJob.filter(b => b.open > 0) }))
    .sort((a, b) => rank(a) - rank(b) || b.late - a.late || b.open - a.open || a.who.localeCompare(b.who));

  const outstanding = jobs.reduce((n, v) => n + v.outstanding, 0);
  const late = jobs.reduce((n, v) => n + v.late, 0);

  /* Reminders on the jobs' meeting notes — the same rule the project page and
     the device notification read (lib/reminders). */
  const reminders: JobItem[] = entries.flatMap(e => {
    const notes = e.gate ? e.gate.j.items : e.paced?.notes ?? [];
    return remindersOf(notes, today).map(r => ({
      jobId: e.project.id, job: shortName(e.project.name), color: e.project.color,
      kind: 'note' as const, id: r.id, what: r.what, who: '', on: r.due, late: r.days < 0,
    }));
  }).sort(byUrgency);

  return {
    axis, span, jobs, week, owes, variants, items: all.flat().sort(byUrgency), reminders,
    critical: entries.flatMap(e => e.critical),
    undated: all.flat().filter(x => x.kind === 'fix' && !x.on).sort((a, b) => a.job.localeCompare(b.job) || a.what.localeCompare(b.what)),
    totals: { jobs: jobs.length, outstanding, late, week: week.length, critical: entries.reduce((n, e) => n + e.critical.length, 0) },
    says: saysOf(jobs, owes, late),
  };
}

/** The whole board in one sentence, the way somebody would answer "how are
 *  the jobs going" in a corridor. */
function saysOf(jobs: JobView[], owes: Owed[], late: number): string {
  if (jobs.length === 0) return 'No job running yet.';
  const next = jobs
    .filter(v => v.daysToGo != null && v.daysToGo >= 0)
    .sort((a, b) => (a.daysToGo ?? 0) - (b.daysToGo ?? 0))[0];
  const bits = [plural(jobs.length, 'job') + ' running'];
  /* "Hands over" is a stage-gate job's word. A running line is not handed
     over: its date is the day it should be at target. */
  if (next) bits.push(next.method === 'commissioning'
    ? `${next.name} hands over first, in ${plural(next.daysToGo ?? 0, 'day')}`
    : `${next.name}’s date comes first, in ${plural(next.daysToGo ?? 0, 'day')}`);
  if (late === 0) return `${bits.join(' · ')}. Nothing is past its day.`;
  const top = [...owes].sort((a, b) => b.late - a.late)[0];
  const owner = top ? (top.kind === 'site' ? 'the site' : top.who) : '';
  const whose = top && top.late * 2 > late ? ` — ${top.late === late ? 'all' : `${top.late}`} of them ${owns(owner)}` : '';
  /* "late", not "past the day": a stage is late when its problems lost hours,
     before its day goes (lib/install lateOrProblem). */
  return `${bits.join(' · ')}. ${plural(late, 'thing')} late${whose}.`;
}

/* ---------- MARKS THAT FALL ON TOP OF EACH OTHER ----------
 *
 * Three things in the same few days drew as three dots in one place, and
 * nobody could tell them apart or hover the one underneath. Marks closer
 * than `gap` (a fraction of the calendar) are one dot with a number on it,
 * coloured by the most urgent thing inside it — a late ring beats a booked
 * one, whatever order they were drawn in. */
export interface Cluster { at: number; marks: PlacedMark[]; tone: PlacedMark['tone'] }

const URGENCY: Record<string, number> = { late: 0, failed: 1, ran: 2, booked: 3, done: 4 };

export function clusterMarks(marks: PlacedMark[], gap = 0.012): Cluster[] {
  const sorted = [...marks].sort((a, b) => a.at - b.at);
  const out: Cluster[] = [];
  for (const m of sorted) {
    const last = out[out.length - 1];
    if (last && m.at - last.marks[0].at <= gap) {
      last.marks.push(m);
      if ((URGENCY[m.tone] ?? 9) < (URGENCY[last.tone] ?? 9)) last.tone = m.tone;
      last.at = (last.marks[0].at + m.at) / 2;
    } else {
      out.push({ at: m.at, marks: [m], tone: m.tone });
    }
  }
  return out;
}
