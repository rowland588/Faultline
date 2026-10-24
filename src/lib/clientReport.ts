/* THE CLIENT REPORT FOR A STAGE-GATE JOB — what goes on it, worked out once.
 *
 * Rowland: "you have deleted the PDF report system — it's likely out of date
 * now we have a new system. Build a new one."
 *
 * The A3 report was built for the 3P tracker and had the gates bolted on; on a
 * job with no materials or programs it was not even offered. This one is the
 * stage-gate job told in the order it is run, and it reads only what the
 * screens already keep — nothing here is typed for the report:
 *
 *   1  WHERE THE JOB IS      the sentence, the dates, the four gates for the
 *                            whole job, and where each machine is
 *   2  GATE BY GATE          Install · Set up · Commission · Hand over, each
 *                            with its checklist per machine and, under it, how
 *                            each stage went in the team's words (Set up also
 *                            its programs; Commission its tests)
 *   3  FIXES                 open first, with where each is on the line
 *   4  WHO OWES WHAT         the same table the Overview shows
 *   5  LINE STANDARD         one page per product, when there are any
 *
 * Notes are never on it: they are private preparation.
 *
 * Pure: the screen gathers the records, this shapes them, the drawer draws. */
import { isRunTest, productFigures, productName, readRuns, runsLine } from './run';
import type { WeekLine } from '../project/journey/journey';
import type { MediaPin, Project } from '../types';
import { answerOf, GATE_WORD, gateGaps, installGrid, jobJourney, lateOrProblemSays, handedOverWith, machineAt, machineNow, machinesWhere, journeyOf, usualStages, type GateTone, type JourneyGate, type StepView, lateByWords, heldUpBy } from './install';
import { stageGateOnTarget, type OnTarget } from './onTarget';
import { standing, slipWords, type OutstandingRow, type PlanMark } from './standing';
import { fixTone, type FixTone } from './fixTone';
import { isProgramsStage, type Program } from './programs';
import { programsOpenOn, programsReading, type ProgramsReading } from './programsReport';
import { jobLineReadings, machineKey, type JobLinePrograms } from './lineRecords';
import { assetStateOf } from './testing';
import type { Snag } from '../snag/types';
import { PRIORITY_RANK } from './snagsReport';
import { filesSaid, live, hasRun, latestAttempts, outcomeWord, type Asset, type StepGate, type Test, type TestItem } from './testing';
import type { Material } from './materials';
import type { Standard } from './standard';
import { niceDay, todayISO } from './weeks';
import { dayLength, daysWord, hoursTally, hoursWord } from './hoursLost';
import { notedProblems, partsOf, partWords, resultNow, type Noted } from './noted';
import { couldWords, criticalProblems, criticalState, riskProblems, type Critical } from './critical';
import type { JobFigures } from './stageGateLean';
import { linesDay, type DayFacts } from './lineLoss';
import type { WalkSnag } from './walkSnags';
import { climbsOf } from './rampUp';
import type { ToolStudy } from './study';
import { constraintOfBars } from './lineRead';
import { lossFiguresOf, provedLine, recordProvedLine, studyHref, studyLine, studyTitle, type StudyContext } from './studyLinks';
import { streamRows } from './ie/steps';
import { agreedFor, changeoverSheet, moneyOf } from './ie/changeover';
import { lossRows } from '../tools/losses/losses';
import { samplingRows } from './ie/sampling';

/** One cell of a gate's checklist: how that stage stands on that machine. */
/** `booked` is a step with a day, still ahead (indigo); `ahead` one with no
 *  day yet (grey) — the same two the grid on screen draws. */
export type CellTone = 'done' | 'problem' | 'asking' | 'late' | 'booked' | 'ahead' | 'none';

export interface GateSection {
  gate: StepGate | 'commission';
  label: string;
  /** "4 of 12 done · 1 late" */
  says: string;
  tone: GateTone;
  /** The checklist, machines down, stages across. Absent for Commission. */
  grid?: { columns: string[]; rows: { machine: string; cells: CellTone[] }[] };
  /** What is LATE at this gate, in words, for the line under it — a stage
   *  late by lib/install lateOrProblem (its day gone, or hours lost), with
   *  the hours when there are any. On Commission, the tests that did not
   *  pass or did not run. */
  late: string[];
  /** The stages that hit a problem and lost no time — amber, said apart from
   *  what is late (Rowland, 6 October: never "late or a problem"). */
  problems: string[];
  /** THE PARTS SAID TO HAVE FAILED — a program that did not pass, with what
   *  was seen (lib/noted resultNow): "Filler — Programs loaded — Tesco Express
   *  1.25 kg: seal temperature low". Red, its own list; never folded into
   *  late or a problem. Absent when none has. */
  failed?: string[];
  /** THE RECORD BEHIND EACH LINE above, in the same order — the stage (or,
   *  on Commission, the test) — so a line read on the Reports screen opens
   *  it in the drawer as it does everywhere else (docs/FLOW.md item 1: a
   *  late line under "why" was the one place a stage would not open). */
  lateIds?: string[];
  problemIds?: string[];
  failedIds?: string[];
  /** Install, Set up, Hand over: how each stage went, in the team's own words
   *  (the step's "What was done" — typed or said into "Say how it went"), for
   *  every step that has one, in the grid's order: machine, then stage. A step
   *  with nothing said is not listed — the grid already gives its state. */
  accounts?: StepAccount[];
  /** HOURS LOST at this gate (lib/hoursLost): the total in hours and days,
   *  and a line per stage that lost any — what pushed its finish, what is
   *  still short of a day, and the problems that cost them. */
  hours?: { total: string; lines: string[] };
  /** Set up only: THE PROGRAMS, every one, machine by machine — the floor's
   *  status and what was seen, and its proving in Commission
   *  (lib/programsReport). The same reading the programs report prints. */
  programs?: ProgramsReading;
  /** Set up only: THE LINE'S OWN PROGRAMS — planned on the job's line with
   *  no job, shown on the job's Programs page (ui/LineProgramsOnJob) and
   *  proved by a test here: the line's reading (lib/lineRecords
   *  lineProgramsReading), the same words the line's Programs page says. */
  linePrograms?: { line: string; reading: ProgramsReading }[];
  /** WHAT THE GATE'S NEEDS YOU SAYS IS MISSING (lib/install gateGaps) — a
   *  machine with none of the gate's stages yet, a machine's stages not
   *  added yet — in the gate screen's words, grey: not started, not late. */
  gaps?: string[];
  /** Commission only: the tests, in the order they were planned. */
  tests?: { title: string; machine?: string; when: string; outcome: string; tone: 'done' | 'failed' | 'booked' | 'ahead' | 'late'; result?: string; passesIf?: string;
    /** A run at a rate, in one line (lib/run runLine). */
    run?: string;
    /** WHAT PROVED IT, or is still short — a study at the line (lib/studyLinks
     *  recordProvedLine), as the hand-over and the test's row say it. */
    proved?: string }[];
  /** Commission only: THE PERFORMANCE RUNS — a row per PRODUCT of the latest
   *  attempt of each run at a rate, with its numbers, first in the section.
   *  Rowland, 7 October: "this is my time of acceptance ... people ask how
   *  fast did we run, what did we net" — and "commissioning runs are
   *  multiple products." */
  runs?: RunRow[];
  /** Commission only: THE CLIMB TO RATE (lib/rampUp) — each product's runs on
   *  a machine read as the climb they are, said once each, under the runs. */
  climbs?: { text: string; tone: 'risk' | 'on' | 'none' }[];
}

/** One product of a performance run, as the client reads it (lib/run). */
export interface RunRow {
  /** The test it is a product of. */
  title: string;
  machine?: string;
  /** The product down the machine — "Product not named" when nobody said. */
  product: string;
  when: string;
  /** The figures, as the board shows them — "58.4 ppm", "—" when not measured. */
  net: string; agreed: string; speed: string; rejects: string; length: string;
  /** Net rate met · short · nothing agreed to judge it on. */
  netTone: 'met' | 'short' | '';
  rejectsTone: 'met' | 'short' | '';
  /** The product's verdict, from its numbers: "Passed" · "Didn't pass" ·
   *  "To run" · "Numbers going in" · "Ran — no rate agreed"; "… — run again"
   *  on a row run again further down. */
  outcome: string;
  tone: 'done' | 'failed' | 'booked' | 'ahead' | 'late';
  /** What fell short and by how much — empty when nothing did. */
  say: string;
  meets?: boolean;
  /** Run again further down the list — history; the later row counts. */
  rerun?: boolean;
}

/** One step's account, as the client reads it under its gate. */
export interface StepAccount {
  machine: string;
  stage: string;
  /** The day it was done, else the day it is booked for; "no date" when neither. */
  when: string;
  /** The grid's own tone for the step, so the word and its colour match the square. */
  tone: Exclude<CellTone, 'none'>;
  /** The state in words, the same words as the grid's key: "late, 2 h
   *  lost", "a problem, no time lost" (lib/install lateOrProblem). */
  state: string;
  /** The stage's parts of the plan (ui/StageParts), in words. */
  parts?: string[];
  /** Its files by name — "2 files: GA drawings rev C.pdf, …" (docs/PANELS.md). */
  files?: string;
  /** What the team said, whole. */
  said: string;
}

/** The grid key's words — the account's state says the same as its square. */
export const CELL_WORD: Record<CellTone, string> = {
  done: 'done', problem: 'a problem, no time lost', asking: 'waiting on a verdict', late: 'late',
  booked: 'still ahead', ahead: 'no day yet', none: 'not added yet',
};

export interface FixRow {
  id: string;
  title: string;
  problem?: string;
  machine?: string;
  who?: string;
  when: string;
  tone: FixTone;
  /** For the drawer to fetch a picture: pinned on a frame, or its first photo. */
  pin?: Test['pin'];
  photoKey?: string;
  /** WHAT ITS STUDIES SAY (lib/studyLinks): before → after when it has both,
   *  else how we know it was needed, or what proved it. */
  proved?: string;
  /** What is marked on that photo (MediaRef.pins, ui/Evidence) — drawn on it
   *  and listed beside it by number when it is the picture printed. */
  photoPins?: MediaPin[];
}

export interface ClientReport {
  /** THE JOB'S ADDRESS, set by the screen at print time (ui/ClientReportScreen)
   *  — the code on the first page opens the job as it is now
   *  (lib/report/codeHeader). Absent, the header is as it always was. */
  link?: string;
  name: string;
  lead?: string;
  printed: string;
  sentence: string;
  /** "Handover expected 26 Oct · agreed 18 Oct" */
  dates?: string;
  slip?: string;
  /** ARE WE ON TARGET? (lib/onTarget) — at the top of the first page and of
   *  the report's screen. */
  onTarget: OnTarget;
  gates: { gate: JourneyGate; label: string; tone: GateTone; says: string }[];
  /** `with`: what a handed-over machine went with — "no test kept", "1 fix open". */
  machines: { name: string; at: string; gates: GateTone[]; with?: string[] }[];
  sections: GateSection[];
  fixes: { open: FixRow[]; done: FixRow[] };
  /** CRITICAL ISSUES (lib/critical) — straight under "Are we on target?":
   *  each open one told whole (what, where, what it means for the business,
   *  the ways round it and the one agreed, its fix), the sorted ones a line
   *  each. Rowland: "say in a report — look at this, this is a major problem,
   *  potential solutions." */
  critical: { open: CriticalRow[]; sorted: string[] };
  /** HIGH RISKS (lib/critical) — under the critical ones, in amber: not
   *  happened yet, told the same way, with what each could cost as an
   *  estimate. Rowland, 7 October: "flag a metric, and a risk of consequence." */
  risks: { open: CriticalRow[]; sorted: string[] };
  /** PROBLEMS WITH NO FIX (lib/noted) — in words, open ones first: what, where,
   *  the day, hours lost. Kept on paper so the journey is told whole. A
   *  critical one is told under Critical issues, not again here. */
  noted: { open: string[]; sorted: string[] };
  /** The same problems as records — for the Reports screen, where each row
   *  opens the problem in the drawer, to change it or take it off. */
  notedRows: { id: string; text: string; sorted: boolean }[];
  /** PROBLEMS FOR THIS JOB — NOT ON IT YET: taken on the register for the
   *  job and not yet made a problem or a fix on it (the Fixes page's own
   *  list), each with its priority — Critical · High · Low, in its word — its
   *  line and machine, whose and by when. */
  assigned: { id: string; priority: 'critical' | 'high' | 'low';
    /** The problem as written. */
    what: string;
    /** "Line 7 · Coder · Priya" — where and whose. */
    meta: string;
    /** "due 16 Oct" · "was due 7 Oct" — by when, when it has a day. */
    due?: string;
    /** Its day has gone. */
    late: boolean }[];
  waiting: OutstandingRow[];
  /** THE TILES' FIGURES (lib/stageGateLean, docs/LEAN-PAGE.md) — the same
   *  the job's front page counts: the handover, outstanding, late, critical
   *  and high risk, fixes open and late. */
  figures: JobFigures;
  /** THE LEAD'S COMMENTARY (Project.reportNote) — printed under "where we
   *  are" on both reports. Rowland, 9 October: "we have numbers but not the
   *  story ... I need a way to add commentary." */
  commentary?: { text: string; on?: string; by?: string };
  /** THIS WEEK AND NEXT (lib/journey weekLine) — the one line the front page says. */
  week?: WeekLine;
  standards: Standard[];
  /** EVIDENCE — every study on the job (docs/TOOLKIT.md, Part 0): what it is
   *  of, what it is used for, and what it says, in its own words. Measured by
   *  people at the line, so said as such. Printed as the appendix. */
  evidence: { id: string; title: string; href: string; used: string; line: string; tone: string;
    /** A value stream map's steps as a table (lib/ie/steps streamRows) — the
     *  grid on paper, the step a fix was raised from naming it. */
    stream?: ReturnType<typeof streamRows>;
    /** A changeover's steps as a table, the bars and the interval in words
     *  (lib/ie/changeover changeoverSheet) — the step a fix came from naming it. */
    changeover?: ReturnType<typeof changeoverSheet>;
    /** A shift's loss count as a table (lib/ie/losses lossRows) — the
     *  waterfall on paper: cause · stops · minutes · £. */
    losses?: NonNullable<ReturnType<typeof lossRows>>;
    /** A work sampling as a table (lib/ie/sampling samplingRows) — each
     *  person's shares with their margins; too early said, never a figure. */
    sampling?: NonNullable<ReturnType<typeof samplingRows>> }[];
  /** The job's dated marks — the same ones the project page's Gantt draws —
   *  for "The plan" page, with the day it was printed and both handover dates. */
  plan: PlanMark[];
  /** What happened to each stage, for the plan page's overruns and its "why"
   *  list — the steps, their fixes, what was found and each stage's parts
   *  (drawn as branches under it). Never the notes. */
  planRecords: { tests: Test[]; items: TestItem[]; walk?: WalkSnag[];
    /** The machines and their programs — for the plan drawn machine by machine. */
    assets?: Asset[]; programs?: Program[];
    /** The job's working day, for hours lost (lib/hoursLost). */
    dayHours?: number;
    /** Each gate's list, for the plan by stage in the Install grid's order. */
    stages?: Partial<Record<StepGate, readonly string[]>> };
  today: string;
  expectedAt?: string;
  plannedAt?: string;
}

export interface CriticalRow {
  /** The problem's id — the Reports screen opens it in the drawer. */
  id: string;
  what: string;
  /** "Pick and place — Programs loaded · raised Mon 5 Oct · Ilapak UK · 6 h lost" */
  meta: string;
  impact?: string;
  ways: { what: string; agreed: boolean }[];
  /** "Fix: Rewrite the programs — booked Fri 9 Oct, Ilapak UK" */
  fix?: string;
  /** "open · going with: a belt to bypass the robot" (lib/critical criticalState). */
  state: string;
  /** "could cost 100 h (an estimate)" — never counted as lost — and the hours. */
  could?: string;
  couldLose?: number;
}

export interface ClientReportInput {
  project: Project;
  projects: Project[];
  assets: Asset[];
  tests: Test[];
  items: TestItem[];
  materials: Material[];
  programs: Program[];
  standards: Standard[];
  /** What the filmed walk found — its lane on the plan page. */
  walk?: WalkSnag[];
  /** The job's studies (lib/study) — the Evidence appendix and each fix's line. */
  studies?: ToolStudy[];
  /** What a loss count reads beside its facts: its line's stops and cost
   *  model (lib/studyLinks StudyContext). Absent: a count says its loss, and
   *  not where it went. */
  studyContext?: StudyContext;
  /** The studies that can show a program proved — the job's and its lines'
   *  (ToolStudy.programId): a program proved by a study on its line says so,
   *  as the line's Programs page does, never "signed off by hand". */
  proofStudies?: ToolStudy[];
  /** THE JOB'S LINES' OWN PROGRAMS — planned on the line with no job
   *  (ui/LineProgramsOnJob reads the same). */
  linePrograms?: JobLinePrograms[];
  /** The tests that prove programs, on whichever job (Test.programId): a
   *  line's program proved on another job says its test, never "signed off
   *  by hand" (ui/LineProgramsOnJob reads the same). */
  provingTests?: Test[];
  /** The register's problems taken for this job (Snag.projectId) — those not
   *  yet sent to it are its "Problems for this job — not on it yet". */
  assigned?: Snag[];
  /** This week and next, as the journey counts it (lib/journey weekLine). */
  week?: WeekLine;
  /** A line's name, for an assigned problem's line. */
  lineName?: (wsId: string) => string;
  /** THE JOB'S LINES AS YOUR FACTORY HOLDS THEM (lib/lineRecords
   *  jobFactoryLines) — their speed, shifts and margin a pack say what a day
   *  late costs (lib/lineLoss linesDay; the money tile, lib/stageGateLean). */
  factoryLines?: DayFacts[];
  today: string;
}

/** THE REGISTER'S PROBLEMS FOR A JOB, NOT ON IT YET — the Fixes page's
 *  list (screens/FixesScreen jobSnags): for the job, not sent to it, open,
 *  not put away. Critical first, then High, then Low; oldest first in each. */
export function assignedToJob(snags: readonly Snag[], projectId: string): Snag[] {
  return snags.filter(sn => sn.projectId === projectId && !(sn.sent ?? []).length && sn.status !== 'closed' && !sn.deletedAt && !sn.archivedAt)
    .sort((a, b) => PRIORITY_RANK[a.priority ?? 'low'] - PRIORITY_RANK[b.priority ?? 'low'] || a.raisedAt - b.raisedAt);
}

/** A register problem as the Fixes page's row says it — "Coder misprints the
 *  date", "Line 7 · Coder · Priya" and "due 16 Oct" (its priority said beside
 *  it, in its word); a day gone by "was due", the one part in red. */
export function assignedWords(sn: Snag, today: string, lineName?: (wsId: string) => string): { what: string; meta: string; due?: string; late: boolean } {
  const dueOn = sn.dueAt ? todayISO(new Date(sn.dueAt)) : '';
  const late = !!dueOn && dueOn < today;
  return {
    what: sn.problem.trim() || 'A picture, no words yet',
    meta: [lineName?.(sn.workspaceId) ?? '', sn.targetAsset?.trim() ?? '', sn.owner?.trim() || 'nobody yet'].filter(Boolean).join(' · '),
    ...(dueOn ? { due: `${late ? 'was due' : 'due'} ${niceDay(dueOn)}` } : {}),
    late,
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** A register problem names its machine by name (Snag.targetAsset). */
export const namesMachine = (sn: Pick<Snag, 'targetAsset'>, a: Pick<Asset, 'name'>): boolean =>
  !!sn.targetAsset?.trim() && machineKey(sn.targetAsset) === machineKey(a.name);

/** WHAT A HANDED-OVER MACHINE WENT WITH, beyond lib/install handedOverWith —
 *  its programs not done as the Programs page says them (flow audit #3), its
 *  problems with no fix (lib/noted), and the register's problems for the job
 *  on it — in the same words on the full report and the handover. */
export function wentWithAlso(a: Asset, progs: ProgramsReading | undefined, programs: readonly Program[], noted: readonly Noted[], assigned: readonly Pick<Snag, 'targetAsset'>[]): string[] {
  const mine = noted.filter(r => r.on?.assetId === a.id).length;
  const reg = assigned.filter(sn => namesMachine(sn, a)).length;
  return [...programsOpenOn(progs, a.id, programs).counts, mine ? `${plural(mine, 'problem')} with no fix` : '', reg ? `${plural(reg, 'problem')} not on the project yet` : ''].filter(Boolean);
}

export function clientReport(x: ClientReportInput): ClientReport {
  const { project, today } = x;
  const tests = live(x.tests), items = live(x.items), assets = live(x.assets).sort((a, b) => a.sort - b.sort);
  const programs = live(x.programs);
  const machine = (id?: string) => assets.find(a => a.id === id)?.name;
  const st = standing({
    tests, items, assets, materials: x.materials, programs,
    expectedAt: project.expectedAt, plannedAt: project.plannedAt, today,
  });

  /* THE JOB'S STUDIES — evidence, never moved: each fix and test reads the one link. */
  const studies = (x.studies ?? []).filter(s => !s.deletedAt && s.projectId === project.id);
  /* the studies that can show a program proved — the job's and its lines' */
  const proofStudies = x.proofStudies ?? studies;
  /* THE PROGRAMS, read once (lib/programsReport) — Set up's section, the
     programs report and what a machine was handed over with. */
  const progs = programsReading({ tests, items, assets, programs, today, holder: project, studies: proofStudies });

  const notedOpen = notedProblems(tests, items, assets).open;
  const assignedSnags = assignedToJob(x.assigned ?? [], project.id);

  /* ---- where the job is ---- */
  const job = jobJourney(assets, tests, items, today, programs);
  const machines = assets.map(a => {
    const j = journeyOf(a, tests, items, today, programs);
    /* "Due on site" for a machine not here yet, never "Install" (machineAt). */
    /* What it was handed over with, beside "Handed over" (docs/HANDOVER.md)
       — a program that failed or is not proved among it (flow audit #3). */
    const open = machineNow(j) === 'Handed over' ? [...handedOverWith(a, tests, items, today, programs), ...wentWithAlso(a, progs, programs, notedOpen, assignedSnags)] : [];
    return { name: a.name, at: machineAt(a, j).short, gates: j.map(g => g.tone), ...(open.length ? { with: open } : {}) };
  });
  /* A MACHINE LATE ON SITE — awaited past its day, as the control room and
     Install's Needs you list it (lib/portfolio jobItems). */
  const lateOnSite = assets.filter(a => assetStateOf(a) === 'awaited' && !!a.dueOn && a.dueOn < today && !a.onSiteOn);

  /* ---- gate by gate ---- */
  const stepGate = (gate: StepGate): GateSection => {
    const usual = usualStages(project, x.projects, gate).stages;
    const g = installGrid(assets, tests, items, today, usual, gate);
    const steps = tests.filter(t => t.kind === 'install' && (t.gate ?? 'install') === gate);
    const done = steps.filter(t => t.outcome === 'passed').length;
    /* LATE, OR A PROBLEM — WHICH (lib/install lateOrProblem): a stage late
       by its day or by the hours its problems lost is a late square; one that
       hit a problem and lost no time is a problem square, amber. */
    const cellOf = (c: StepView): Exclude<CellTone, 'none'> => {
      const which = lateOrProblemSays(c.step, items, today)?.which;
      if (which) return which;
      return (c.tone === 'ahead' && c.step.plannedFor ? 'booked' : c.tone) as Exclude<CellTone, 'none'>;
    };
    const rows = g.rows.filter(r => r.view.total > 0).map(r => ({
      machine: r.asset?.name ?? 'The line',
      cells: r.cells.map(c => (!c ? 'none' : cellOf(c)) as CellTone),
    }));
    /* HOW EACH STAGE WENT. Rowland, 4 October: the account a step is given
       ("Say how it went") is "part of the reports — how did it go, what
       happened". It used to reach the paper only when the step hit a problem.
       In the grid's order — machine, then stage — and then any step the grid
       could not give a square of its own (two steps of one name on a machine). */
    const accounts: StepAccount[] = g.rows.flatMap(r => {
      const inGrid = r.cells.filter((c): c is StepView => !!c);
      const rest = r.view.steps.filter(s => !inGrid.includes(s));
      const progStage = (t: Test) => isProgramsStage(t, answerOf(t, project, items));
      return [...inGrid, ...rest].filter(s => s.step.result?.trim() || (s.step.docs ?? []).length || (!progStage(s.step) && partsOf(s.step.id, items).length)).map(s => {
        const tone = cellOf(s);
        /* A programs stage's parts are the programs — said once, under
           Programs, with their status and what was seen. */
        const parts = progStage(s.step) ? [] : partsOf(s.step.id, items).map(p => partWords(p, today));
        return {
          machine: r.asset?.name ?? 'The line', stage: s.step.title,
          when: niceDay(s.step.ranOn ?? s.step.plannedFor) || 'no date',
          /* Done after its first planned finish says so (lib/install doneLateBy). */
          tone, state: [lateOrProblemSays(s.step, items, today)?.words ?? (s.lateBy ? `done, ${lateByWords(s.lateBy)}` : CELL_WORD[tone]),
            /* Why, when it was the stage before (lib/install heldUpBy). */
            heldUpBy(s.step, tests, items, today, usual)?.words].filter(Boolean).join(' — '), said: (s.step.result ?? '').trim(),
          ...(parts.length ? { parts } : {}),
          ...(filesSaid(s.step) ? { files: filesSaid(s.step) } : {}),
        };
      });
    });
    /* LATE, OR A PROBLEM — WHICH. Rowland, 6 October: "We know if it's a
       problem and if it's late, because I put hours in the problem to tell
       the app it caused lateness." Each stage is one or the other by the one
       rule (lib/install lateOrProblem): late — its day gone, or hours lost,
       said with the hours — or a problem that lost no time. Two lists, two
       counts, never "late or a problem". */
    const all = g.rows.flatMap(r => r.view.steps.map(s => ({ r, s, w: lateOrProblemSays(s.step, items, today) })));
    const named = (r: (typeof all)[number]['r'], s: StepView) => `${r.asset?.name ?? 'The line'} — ${s.step.title}`;
    const lateAll = all.filter(({ s, w }) => w?.which === 'late' || (!w && cellOf(s) === 'late'));
    const lateSteps = lateAll
      .map(({ r, s, w }) => { const h = heldUpBy(s.step, tests, items, today, usual); return `${named(r, s)}${w?.lost ? ` — ${hoursWord(w.lost)} lost` : ''}${h ? ` — ${h.words}` : ''}`; });
    const problemAll = all.filter(({ w }) => w?.which === 'problem');
    const problemSteps = problemAll.map(({ r, s }) => named(r, s));
    const failedAll = all.flatMap(({ r, s }) => partsOf(s.step.id, items).flatMap(p => {
      const said = resultNow(p);
      return said?.is === 'failed' ? [{ id: s.step.id, line: `${named(r, s)} — ${p.what}${said.note ? `: ${said.note}` : ''}` }] : [];
    }));
    const failedParts = failedAll.map(x => x.line);
    /* Rowland, 6 October: "2 hours here, 1 hour there, 5 hours here ... that
       was one day fully missed, or half a day." */
    const day = dayLength(project);
    let lostAll = 0;
    const hourLines = all.flatMap(({ r, s }) => {
      const h = hoursTally(s.step.id, items, day);
      if (!h.hours) return [];
      lostAll += h.hours;
      const each = items.filter(i => i.testId === s.step.id && i.kind === 'found' && (i.hoursLost ?? 0) > 0)
        .sort((a, b) => a.createdAt - b.createdAt).map(i => `${i.what} ${hoursWord(i.hoursLost as number)}`);
      /* Said once: "30 min lost" needs no "30 min not yet a day" after it. */
      const state = h.pushedDays
        ? `, pushed the finish ${h.pushedDays} day${h.pushedDays === 1 ? '' : 's'}${h.banked ? `; ${hoursWord(h.banked)} towards the next` : ''}`
        : h.hours >= day ? ' — the finish has not been moved for it' : '';
      return [`${r.asset?.name ?? 'The line'} — ${s.step.title}: ${hoursWord(h.hours)} lost${state} (${each.join('; ')})`];
    });
    /* A machine late on site is late at Install — Needs you's first line,
       opening the machine itself. */
    const siteLate = gate === 'install' ? lateOnSite : [];
    /* WHAT NEEDS YOU SAYS IS MISSING at this gate (lib/install gateGaps), in its words */
    const gp = gateGaps(g, gate);
    const things = gate === 'handover' ? 'hand-over items' : 'stages';
    const gaps = [
      ...(gp.bare.length ? [`${gp.bare.map(a => a.name).join(', ')} — none of the ${things} yet`] : []),
      ...gp.byMachine.map(m => `${m.asset?.name ?? 'The line'} — ${m.n} ${gate === 'handover' ? `item${m.n === 1 ? '' : 's'}` : `stage${m.n === 1 ? '' : 's'}`} not added yet`),
    ];
    const problems = problemSteps.length;
    const lateN = lateSteps.length;
    /* DONE, BUT LATE — Rowland, 7 October: "planned 5 to the 6th, done the
       7th, so it was late." Counted in the gate's line, as it happened. */
    const doneLateN = all.filter(({ s }) => s.lateBy > 0).length;
    const tone = job.find(j => j.gate === gate)?.tone ?? 'none';
    // Said as the gate's own screen says it — stages with nothing planned count.
    const unplanned = rows.reduce((n, r) => n + r.cells.filter(c => c === 'none').length, 0);
    return {
      gate, label: GATE_WORD[gate], tone,
      /* A gate the machines are marked past with no steps kept is done, and
         says so — a green box reading "nothing kept" told the client two
         things at once (seen on a random-job report, 4 Oct). */
      says: steps.length === 0 ? (tone === 'done' ? 'Done — no steps kept for it' : `Nothing kept at this gate yet${siteLate.length ? ` · ${siteLate.length} machine${siteLate.length === 1 ? '' : 's'} late on site` : ''}`)
        : `${done} of ${steps.length} done${doneLateN ? ` (${doneLateN} done late)` : ''}${lateN ? ` · ${lateN} late` : ''}${problems ? ` · ${problems} a problem` : ''}${unplanned ? ` · ${unplanned} not added yet` : ''}${siteLate.length ? ` · ${siteLate.length} machine${siteLate.length === 1 ? '' : 's'} late on site` : ''}${gp.bare.length ? ` · ${gp.bare.length} machine${gp.bare.length === 1 ? '' : 's'} with none yet` : ''}`,
      grid: rows.length ? { columns: g.columns, rows } : undefined,
      late: [...siteLate.map(a => `${a.name} — not on site, was due ${niceDay(a.dueOn)}`), ...lateSteps],
      lateIds: [...siteLate.map(a => a.id), ...lateAll.map(({ s }) => s.step.id)],
      problems: problemSteps, problemIds: problemAll.map(({ s }) => s.step.id),
      ...(failedParts.length ? { failed: failedParts, failedIds: failedAll.map(x => x.id) } : {}),
      ...(hourLines.length ? { hours: { total: `${hoursWord(lostAll)} lost to problems — ${daysWord(lostAll, day)} at ${hoursWord(day)} a day`, lines: hourLines } } : {}),
      ...(accounts.length ? { accounts } : {}),
      ...(gaps.length ? { gaps } : {}),
    };
  };

  const install = stepGate('install');
  const setup = stepGate('setup');
  if (progs) {
    setup.programs = progs;
    setup.says = setup.says === 'Nothing kept at this gate yet'
      ? `${progs.doneAll} of ${progs.total} programs done`
      : `${setup.says} · ${progs.doneAll} of ${progs.total} programs done`;
  }
  /* THE LINE'S OWN PROGRAMS, on the job's line with no job — the line's own
     reading, its own words (lib/lineRecords), proved by a test here or a study */
  const provingTests = [...tests, ...(x.provingTests ?? []).filter(t => !tests.some(u => u.id === t.id))];
  const linePrograms = jobLineReadings(x.linePrograms ?? [], today, { tests: provingTests, studies: proofStudies });
  if (linePrograms.length) setup.linePrograms = linePrograms;

  const proofs = tests.filter(t => (t.kind ?? 'test') === 'test').sort((a, b) => a.sort - b.sort);
  /* THE COUNTS ARE THE LATEST ATTEMPT OF EACH TEST. A test that failed and
     passed on its re-test is one test that passed; the rows below still list
     both attempts, because that is what happened. */
  const now = latestAttempts(tests).sort((a, b) => a.sort - b.sort);
  const passed = now.filter(t => t.outcome === 'passed').length;
  const failed = now.filter(t => t.outcome === 'failed').length;
  const notRun = now.filter(t => t.outcome === 'notRun').length;
  const endOf = (t: Test) => t.plannedTo ?? t.plannedFor;
  const commission: GateSection = {
    gate: 'commission', label: 'Commission', tone: job.find(j => j.gate === 'commission')?.tone ?? 'none',
    says: proofs.length === 0 ? 'No tests planned yet'
      // Every outcome said: "2 of 5 passed · 1 didn't pass" left a test that never ran unaccounted for.
      : `${passed} of ${now.length} passed${failed ? ` · ${failed} didn’t pass` : ''}${notRun ? ` · ${notRun} didn’t run` : ''}`,
    late: now.filter(t => t.outcome === 'failed' || t.outcome === 'notRun').map(t => `${t.title}${machine(t.assetId) ? ` — ${machine(t.assetId)}` : ''}`),
    lateIds: now.filter(t => t.outcome === 'failed' || t.outcome === 'notRun').map(t => t.id),
    problems: [],
    tests: proofs.map(t => ({
      title: t.title, machine: machine(t.assetId),
      when: niceDay(t.ranOn ?? t.plannedFor) || 'no date',
      outcome: hasRun(t) ? outcomeWord(t) : 'planned',
      tone: t.outcome === 'passed' ? 'done' : t.outcome === 'failed' || t.outcome === 'notRun' ? 'failed'
        : (endOf(t) ?? '\uffff') < today ? 'late' : t.plannedFor ? 'booked' : 'ahead',
      result: t.result, passesIf: t.passesIf,
      ...((pr => (pr ? { proved: pr } : {}))(recordProvedLine(studies, t, x.studyContext))),
      /* A run's numbers are in the Performance runs table above; an earlier
         attempt, not in that table, carries them on its own line. */
      ...(runsLine(t) && !(isRunTest(t, answerOf(t, project)) && now.includes(t)) ? { run: runsLine(t) } : {}),
    })),
    ...(() => {
      /* A row per product planned or run — not every test with "rate" in its
         name as a row of dashes. Each product judged on its own numbers; a
         product still to run takes its test's day (booked, or late once the
         day has gone). */
      const runs = now.filter(t => isRunTest(t, answerOf(t, project))).flatMap(t => {
        const testTone: RunRow['tone'] = (endOf(t) ?? '\uffff') < today ? 'late' : t.plannedFor ? 'booked' : 'ahead';
        return readRuns(t).products.map((p): RunRow => {
          const f = productFigures(p);
          const tone: RunRow['tone'] = p.rerun ? 'ahead' : p.state === 'met' ? 'done' : p.state === 'short' ? 'failed'
            : p.state === 'unjudged' ? (t.outcome === 'passed' ? 'done' : t.outcome === 'failed' ? 'failed' : 'booked') : testTone;
          return {
            title: t.title, machine: machine(t.assetId), product: productName(p.run),
            when: niceDay(p.run.ranOn ?? t.ranOn ?? t.plannedFor) || 'no date',
            net: f.net, speed: f.speed, rejects: f.rejects, length: f.length,
            agreed: f.agreed || 'nothing agreed yet',
            netTone: f.netTone, rejectsTone: f.rejectsTone,
            outcome: p.rerun ? `${p.word}, re-run` : p.state === 'toRun' && testTone === 'late' ? 'Not run — late' : p.word,
            tone, say: p.gap, ...(p.r.meets != null ? { meets: p.r.meets } : {}), ...(p.rerun ? { rerun: true } : {}),
          };
        });
      });
      return runs.length ? { runs } : {};
    })(),
    ...(() => {
      /* Every run of a product on a machine, every attempt — the climb is
         the attempts in order (lib/rampUp), so it reads all of them. */
      const climbs = climbsOf({ tests, assets }).map(c => ({ text: c.machine ? `${c.machine} — ${c.text}` : c.text, tone: c.tone }));
      return climbs.length ? { climbs } : {};
    })(),
  };

  const handover = stepGate('handover');

  /* ---- fixes ---- */
  const ctx = x.studyContext;
  const provedOf = (fixId: string): string | undefined => provedLine(studies, fixId, 'fix', ctx);
  const fixRow = (t: Test): FixRow => {
    const ft = fixTone(t, today);
    /* The fix's own picture, else the one taken with the problem that booked
       it (Hit a problem keeps the photo on the problem) — the same picture
       the Fixes page shows on its box. */
    const seen = items.filter(i => i.kind === 'found' && i.becameTestId === t.id).flatMap(i => i.media ?? []);
    const media = [...(t.media ?? []), ...seen];
    const pic = media.find(m => m.kind === 'photo');
    const photo = pic?.blobKey ?? media[0]?.thumbKey;
    /* Named by its problem when nobody gave it words of its own: the problem
       is then the title, not printed a second time under it. */
    const problem = t.passesIf && t.passesIf.trim() !== t.title.trim() ? t.passesIf : undefined;
    return {
      id: t.id, title: t.title, problem, machine: machine(t.assetId), who: t.withWhom,
      when: ft.when, tone: ft.tone, pin: t.pin, photoKey: photo,
      ...(pic?.pins?.length ? { photoPins: pic.pins } : {}),
      ...(provedOf(t.id) ? { proved: provedOf(t.id) } : {}),
    };
  };
  const rank: Record<FixTone, number> = { late: 0, notRun: 1, soon: 2, ahead: 3, done: 4 };
  const fixes = tests.filter(t => t.kind === 'fix').map(fixRow).sort((a, b) => rank[a.tone] - rank[b.tone]);

  const when = project.expectedAt ?? project.plannedAt;
  const moved = project.expectedAt && project.plannedAt && project.expectedAt !== project.plannedAt;

  return {
    name: project.name, lead: project.lead,
    printed: niceDay(today, { year: true }),
    sentence: st.sentence,
    figures: {
      ...(st.daysToGo != null ? { daysToGo: st.daysToGo } : {}), ...(st.handedOver ? { handedOver: true } : {}), ...(st.handedVs != null ? { handedVs: st.handedVs } : {}),
      outstanding: st.outstanding, late: st.late, ...(when ? { handoverOn: when } : {}),
      critical: criticalProblems(tests, items, assets).open.length, risks: riskProblems(tests, items, assets).open.length,
      fixesOpen: fixes.filter(f => f.tone !== 'done').length, fixesLate: fixes.filter(f => f.tone === 'late').length,
      ...(st.slipDays != null ? { slipDays: st.slipDays } : {}), ...(x.factoryLines ? { day: linesDay(x.factoryLines) } : {}),
    },
    onTarget: stageGateOnTarget({ project, tests, items, assets, materials: x.materials, programs, today }, st),
    dates: when ? `Handover ${moved ? 'expected' : ''} ${niceDay(when, { year: true })}${moved ? ` · agreed ${niceDay(project.plannedAt, { year: true })}` : ''}`.replace('  ', ' ') : undefined,
    slip: slipWords(st.slipDays),
    gates: job.map(g => {
      const s = [install, setup, commission, handover].find(x => x.gate === g.gate);
      return { gate: g.gate, label: g.label, tone: g.tone, says: s?.says ?? '' };
    }),
    machines,
    sections: [install, setup, commission, handover],
    fixes: { open: fixes.filter(f => f.tone !== 'done'), done: fixes.filter(f => f.tone === 'done') },
    ...(() => {
      const fixWords = (f: Test) => `Fix: ${f.title} — ${f.outcome === 'passed' ? `done${f.ranOn ? ` ${niceDay(f.ranOn)}` : ''}`
        : f.plannedFor ? `booked ${niceDay(f.plannedFor)}` : 'no day yet'}${f.withWhom ? `, ${f.withWhom}` : ''}`;
      const told = (c: { open: Critical[]; sorted: Critical[] }) => ({
        open: c.open.map(r => ({
          id: r.item.id,
          what: r.item.what,
          meta: [r.where, `raised ${niceDay(r.day)}`, r.item.owner, r.item.hoursLost ? `${hoursWord(r.item.hoursLost)} lost` : ''].filter(Boolean).join(' · '),
          ...(r.item.impact ? { impact: r.item.impact } : {}),
          ways: (r.item.ways ?? []).map(w => ({ what: w.what, agreed: !!w.agreed })),
          ...(r.fix ? { fix: fixWords(r.fix) } : {}),
          /* The agreed way is marked in the list just above — said once. */
          state: r.agreed ? 'open · a way round it is agreed' : criticalState(r),
          ...(r.item.couldLose ? { could: couldWords(r.item), couldLose: r.item.couldLose } : {}),
        })),
        sorted: c.sorted.map(r => `${r.item.what} — ${r.where} · ${criticalState(r)}${r.agreed ? ` · went with: ${r.agreed.what}` : ''}`),
      });
      return { critical: told(criticalProblems(tests, items, assets)), risks: told(riskProblems(tests, items, assets)) };
    })(),
    noted: (() => {
      const n = notedProblems(tests, items, assets);
      const line = (r: typeof n.open[number]) => `${r.item.what} — ${r.where}, ${niceDay(r.day)}${r.item.hoursLost ? ` · ${hoursWord(r.item.hoursLost)} lost` : ''}`;
      const plain = (r: typeof n.open[number]) => !r.item.critical && !r.item.risk;
      return { open: n.open.filter(plain).map(line), sorted: n.sorted.filter(plain).map(line) };
    })(),
    notedRows: (() => {
      const n = notedProblems(tests, items, assets);
      const line = (r: typeof n.open[number]) => `${r.item.what} — ${r.where}, ${niceDay(r.day)}${r.item.hoursLost ? ` · ${hoursWord(r.item.hoursLost)} lost` : ''}`;
      const plain = (r: typeof n.open[number]) => !r.item.critical && !r.item.risk;
      return [...n.open.filter(plain).map(r => ({ id: r.item.id, text: line(r), sorted: false })),
        ...n.sorted.filter(plain).map(r => ({ id: r.item.id, text: line(r), sorted: true }))];
    })(),
    assigned: assignedSnags.map(sn => ({ id: sn.id, priority: sn.priority ?? 'low', ...assignedWords(sn, today, x.lineName) })),
    waiting: st.rows,
    ...(x.week ? { week: x.week } : {}),
    ...(project.reportNote?.trim() ? { commentary: {
      text: project.reportNote.trim(),
      ...(project.reportNoteAt ? { on: niceDay(todayISO(new Date(project.reportNoteAt))) } : {}),
      ...(project.lead?.trim() ? { by: project.lead.trim() } : {}),
    } } : {}),
    standards: live(x.standards),
    evidence: studies.map(s => studyEvidence(s, tests, live(x.standards), ctx)),
    /* Notes are never on the client's copy — they are private
       preparation — so a note's reminder stays off its plan page too. */
    plan: st.plan.filter(m => m.kind !== 'note'),
    planRecords: { tests, items: items.filter(i => i.kind === 'found' || i.kind === 'next'), assets, programs, ...(x.walk?.length ? { walk: x.walk } : {}), ...(project.dayHours ? { dayHours: project.dayHours } : {}),
      stages: Object.fromEntries((['install', 'setup', 'handover'] as const).map(gt => [gt, usualStages(project, x.projects, gt).stages])) },
    today,
    ...(project.expectedAt ? { expectedAt: project.expectedAt } : {}),
    ...(project.plannedAt ? { plannedAt: project.plannedAt } : {}),
  };
}

/** ONE STUDY AS PAPER SAYS IT — what it is, what it is used for, its
 *  sentence and its table (a value stream's grid, a changeover's steps, a
 *  shift's losses, a sampling's shares). The client report's Evidence and a
 *  study's own paper (lib/studiesPdf) both read it, so the two never part. */
export function studyEvidence(s: ToolStudy, tests: Pick<Test, 'id' | 'title'>[], standards: Standard[], ctx?: StudyContext): ClientReport['evidence'][number] {
  const used = s.uses.map(u => {
    const r = tests.find(t => t.id === u.ref);
    if (!r) return '';
    return u.kind === 'test' ? `proves ${r.title}` : u.role === 'evidence' ? `how we know: ${r.title}` : `proves the fix: ${r.title}`;
  }).filter(Boolean).join('; ');
  const l = studyLine(s, ctx);
  const branches = new Map(s.uses.flatMap(u => { const r = u.step && u.role === 'evidence' ? tests.find(t => t.id === u.ref) : undefined; return r && u.step ? [[u.step, r.title] as [string, string]] : []; }));
  const losses = s.tool === 'losses' ? lossRows(lossFiguresOf(s, ctx), s.facts.losses, constraintOfBars(s, ctx?.observations ?? [], standards)) : undefined;
  const sampling = s.tool === 'sampling' && !s.agreed?.sampling?.walk ? samplingRows(s.agreed?.sampling, s.facts.taps ?? []) : undefined;
  return { id: s.id, title: studyTitle(s), href: studyHref(s),
    used: used || 'not used for a record yet', line: l.text, tone: l.tone,
    ...(s.tool === 'map' && (s.facts.flow ?? []).length ? { stream: streamRows(s.facts.flow, s.agreed?.map, branches) } : {}),
    ...(s.tool === 'changeover' && (s.facts.sequence ?? []).length
      ? { changeover: changeoverSheet(s.facts, agreedFor(standards.find(st => st.id === s.standardId)?.capacity?.changeovers, s.facts.fromProduct), branches,
          moneyOf(ctx?.workspaces?.find(w => w.id === s.workspaceId))) } : {}),
    ...(losses ? { losses } : {}), ...(sampling ? { sampling } : {}) };
}

/** "2 at Commission · 1 at Install" — the machines in one line. */
export function machinesSay(r: Pick<ClientReport, 'machines'>): string {
  return machinesWhere(r.machines.map(m => m.at)) || plural(0, 'machine');
}
