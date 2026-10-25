/* A REALISTIC DATABASE, BUILT THROUGH THE APP'S OWN API AND CHECKED BY tsc.
 *
 * This exists because a smoke test with an empty database proves nothing: every
 * workspace route falls through to the home screen and every project route
 * renders an empty state, so a screen that never mounted cannot report an error.
 *
 * It is TypeScript in src/ rather than a script beside the test ON PURPOSE. The
 * first two attempts at this were plain objects inside page.evaluate, which is
 * untyped — so they were wrong twice in ways that looked exactly like app bugs:
 * an Observation with no `media` (required) crashed CaptureScreen, and a line
 * with `lineKey` instead of `key` produced a React "missing key" warning on the
 * project dashboard. Both got reported as findings before being traced back to
 * the harness. Here, tsc --noEmit rejects either mistake before it can waste
 * anybody's afternoon.
 *
 * Nothing imports this from the app, so it is tree-shaken out of the bundle.
 */
import {
  createWorkspace, updateWorkspace, addObservation, addSegment, addSnagAsset, addSnag, addCase,
  createProject, updateProject, addPaceLine, putPaceTodo,
  putPaceWin, putTreeNode, putAsset, putTest, putTestItem, putBlob,
  putTarget, putReadings, putMaterials, putPrograms, putStandard, putStudy, getStudy,
  addMachineToLine, addLineProgram, putProgram,
  listObservations, snagsForWorkspace, listTests, listAssets,
} from '../db';
import { barExpect, barWords, lossFigures } from '../tools/losses/losses';
import { shiftWindow } from '../lib/shifts';
import { studyTitle } from '../lib/studyLinks';
import type { LossCount, ToolStudy } from '../lib/study';
import type { Observation, Case } from '../types';
import type { Segment, SnagAsset, Snag } from '../snag/types';
import type { PaceTodoRow, PaceWinRow, TreeNodeRow } from '../db';
import type { Asset, Test, TestItem } from '../lib/testing';
import type { Measure, Period, Reading, Target } from '../lib/measures';
import { quarters } from '../lib/measures';
import type { Material } from '../lib/materials';
import type { Program } from '../lib/programs';
import type { ChangeoverProduct, ChangeoverSide, ChangeoverStep } from '../lib/study';

const uid = () => crypto.randomUUID();

export interface Seeded {
  wsId: string;
  /** The open problem pinned on the walk (the register's editor opens it: #/snags?open=). */
  snagId: string;
  projectId: string;
  lineId: string;
  caseId: string;
  segmentId: string;
  assetId: string;
  observations: number;
  snags: number;
  /** How many tests are on the job, and the id of one that has run — so the
   *  smoke test can open a real test rather than an empty one. */
  tests: number;
  /** An install step, for the screens that open one. */
  stepId: string;
  /** A fix FOR that step, for the drawer that opens one over the Fixes list. */
  fixId: string;
  /** A machine on the commissioning job — the checkweigher — for the drawer
   *  that opens a machine whole (ui/MachinePanel). */
  machineId: string;
  /** A day in the past with a story on it — the air went on. */
  pastDay: string;
  assets: number;
  testId: string;
  /** A project on the BOARD model, with measures its own business defined,
   *  targets per period and real readings behind them — so the charts, the
   *  numbers panel and the deck are all driven by data rather than by an empty
   *  state. A commissioning job has none of that surface. */
  pacedProjectId: string;
  pacedLineId: string;
  measures: number;
  readings: number;
  /** What that project is waiting on — one of every state, so the grid, the
   *  list order and the late banner are all exercised. */
  materials: number;
  /** What the machine can run — one of every state, for the same reason. */
  programs: number;
  /** A line standard map on the commissioning job. */
  standardId: string;
  /** A line standard on the line itself, on no job; and one attached to the job. */
  lineStandardId: string; lineOnJobId: string;
  /** A project on the lever tree model, with a tree, a bound condition, a
   *  Pareto switched on and actions on its board — the smoke test used to
   *  open the tree on the stage-gate job, which bounced to its front page, so
   *  the tree had never been rendered by it. */
  treeProjectId: string;
  /** The 6M problems on Line 2A of the board project: one open and being
   *  acted on (a Pareto bar), one closed and holding (the gap). */
  problemId: string;
  closedProblemId: string;
  /** A Case opened before 6M on Line 7 — old five whys, no causes. */
  oldCaseId: string;
  line7Id: string;
  /** A capability study, a quick session: the worked example's thirty packs
   *  (docs/LEAN40.md appendix) — passes, and is not capable. */
  studyId: string;
  /** A value stream map saved door to door before maps became only a
   *  line's — one lane per step, no scope; must still open. */
  mapId: string;
  /** One line's map, kept large: what is done on Line 7 and who does it,
   *  the departments that touch the line included — on the job, a fix raised
   *  from its QA wait. */
  lineMapId: string;
  /** That fix, and the line walked again as its proof (B3). */
  mapFixId: string;
  mapProofId: string;
  /** A CHANGEOVER on Line 7 (tool 6): Maris Piper 2kg to Tesco Express
   *  1.25 kg, eight steps timed, three of them external, on the job — and
   *  the products the interval needs. */
  changeoverId: string;
  /** The same changeover on the 6M job's Line 7, for its fishbone to offer. */
  pacedChangeoverId: string;
  /** Work sampling on Line 7 (H1): Op 1 and Op 2 watched through the shift,
   *  36 moments answered, one come a minute ago still to answer. */
  samplingId: string;
  /** A RELIABILITY STUDY on Line 7 (tool 13): the flow wrapper watched three
   *  hours yesterday and two today, the watch running again now — two things
   *  counted at once on the one watch: its stops (eleven, one struck; 45 min
   *  wanted, 3 min stood each) and its failures (three, 12 min stood each,
   *  no target); two remarks. */
  reliabilityId: string;
  /** A RELIABILITY STUDY with every W5 part (FC-059, FC-015, FC-061, FC-060): the wrapper watched six hours, its stops timed
   *  (help arrived, running again; reasons; a fitter's rate) and growing better, its calls for help (reasons, help wanted
   *  within 3 min) and a belt that wears (eight lives, two still running, two costs). */
  reliabilityFamilyId: string;
  /** A CONTROL CHART on Line 7's wrapper (W2): forty fill weights against a 400 g target, the limits set
   *  from the first twenty, a +0.8 g shift from reading 21 — two points beyond and a run above the centre,
   *  the CUSUM saying since when; a note on the new reel. */
  chartId: string;
  /** AN ANALYSIS on Line 7's weigher (W3a): twelve fill weights before a re-calibration and twelve after — did it change? */
  analysisId: string;
  analysisGroupsId: string;
  analysisTableId: string;
  analysisRelateId: string;
  /** The paced job's Line 7 — its own workspace, with shifts, a cost model
   *  and stops timed through the last two days' shifts (tool 7). */
  line7WsId: string;
  /** A SHIFT'S LOSS COUNT on it (lib/ie/losses): Shift 1 two days ago — the
   *  worked example's numbers, 9 minutes of slow running and short stops not
   *  yet told apart — the evidence for a countermeasure raised from its
   *  biggest bar; the next day's Shift 1 counted, its running speed timed,
   *  as that countermeasure's proof; and one on the stage-gate job's Line 7,
   *  a window typed by hand, for the client report's Evidence appendix. */
  lossId: string;
  lossActionId: string;
  lossProofId: string;
  lossStageId: string;
  /** A video study on the line (docs/VIDEO.md): its footage not on this
   *  device, three stations, events read and some accepted, takt given. */
  videoStudyId: string;
  /** A Line Talk on the line (docs/LINE-TALK.md): pieces the phone wrote
   *  down, one corrected, a photo, a typed line, one not written down (no
   *  signal) and one written by a phone that does not record — the
   *  recordings not on this device. */
  talkId: string;
}

/* A CHANGEOVER'S EIGHT ELEMENTS, as lapped on the phone (SMED, tool 6): who
   did each and where, Shingo's function, internal or external. 42 min, three
   external (15 min). */
const smedElements = (at: number, timer: string): ChangeoverStep[] => ([
  ['Stop and clear the former', 4, 'internal', ['Op 1'], 'Former', 'mount'],
  ['Fetch the next former from the store', 5, 'external', ['Op 2'], 'Stores', 'prepare'],
  ['Change the former tube', 10, 'internal', ['Op 1'], 'Former', 'mount'],
  ['Pre-stage the film reels', 7, 'external', ['Op 2'], 'Film unit', 'prepare'],
  ['Change the film reel', 6, 'internal', ['Op 1'], 'Film unit', 'mount'],
  ['Set the jaw temperature', 3, 'internal', ['Op 1'], 'Jaws', 'adjust'],
  ['Print the new labels', 3, 'external', ['Op 2'], 'Labeller', 'prepare'],
  ['First bags and check the seal', 4, 'internal', ['Op 1', 'Team leader'], 'Jaws', 'trial'],
] as const).map(([name, min, side, crew, where, fn], i) => ({ id: uid(), order: i, name, sec: min * 60, side: side as ChangeoverSide, source: 'timed' as const,
  at: at + i * 5 * 60_000, who: timer, crew: [...crew], where, fn }));

export async function seedForSmokeTest(): Promise<Seeded> {
  const t = Date.now();
  const ws = await createWorkspace('Line 7 — smoke test');

  for (let i = 0; i < 12; i++) {
    const o: Observation = {
      id: uid(), workspaceId: ws.id,
      category: ['Changeover', 'Breakdown', 'Material'][i % 3]!,
      subcategory: `sub ${i % 4}`, asset: 'Bagger', shift: 'Days',
      startedAt: t - (i + 1) * 3_600_000,
      endedAt: t - (i + 1) * 3_600_000 + 240_000,
      durationMs: 240_000 + i * 1000,
      count: 1, timing: 'stopwatch', note: `seeded ${i}`,
      media: [], createdAt: t, updatedAt: t,
    };
    await addObservation(o);
  }

  const seg: Segment = { id: uid(), workspaceId: ws.id, name: 'walk 1', durationS: 90, sequence: 1, videoKey: `seed-video-${uid()}`, createdAt: t, updatedAt: t };
  await addSegment(seg);

  const asset: SnagAsset = { id: uid(), workspaceId: ws.id, segmentId: seg.id, name: 'Former roller', code: 'FR-1', timestampS: 12, stillKey: `seed-still-${uid()}`, createdAt: t, updatedAt: t };
  await addSnagAsset(asset);

  let snagId = '';
  for (let i = 0; i < 3; i++) {
    const s: Snag = {
      id: uid(), workspaceId: ws.id, assetId: asset.id,
      problem: `seeded snag ${i}`, proposedSolution: 'fix it',
      status: i === 0 ? 'open' : 'closed',
      raisedAt: t - i * 86_400_000, xPct: 40, yPct: 50, owner: 'Dave',
      linkedObsIds: [], updatedAt: t,
    };
    if (i === 0) snagId = s.id;
    await addSnag(s);
  }

  const kase: Case = {
    id: uid(), workspaceId: ws.id, title: 'seeded case', path: [],
    baselineMsWeek: 1_200_000, status: 'open', openedAt: t, updatedAt: t,
  };
  await addCase(kase);

  const proj = await createProject('Line 2 commissioning', '#2b87d4', 'Rowland', 'r@example.com', 'commissioning');
  await updateProject({ ...proj, workspaceIds: [ws.id] });

  // NOTE: the field is `key`, not `lineKey`. Getting this wrong makes React
  // render the chart cells with key={undefined}, which is a "missing key"
  // warning that looks like an app bug and is not one.
  const line = await addPaceLine({
    projectId: proj.id, workspaceId: ws.id, key: 'L7', name: 'Line 7',
    variant: 'A', sort: 0,
  });
  await addPaceLine({
    projectId: proj.id, workspaceId: ws.id, key: 'L8', name: 'Line 8',
    variant: 'B', sort: 1,
  });

  const todo: PaceTodoRow = {
    id: uid(), projectId: proj.id, lineId: line.id, what: 'align the former roller',
    where: 'Line 7', why: 'losing rate', who: 'Dave', when: 'Friday',
    state: 'todo', notes: 'seeded', outcome: '', media: [], createdAt: t, updatedAt: t,
  };
  await putPaceTodo(todo);

  const win: PaceWinRow = {
    id: uid(), projectId: proj.id, lineId: line.id, title: 'seeded win',
    story: 'it got faster', impact: '+4 ppm', where: 'Line 7', who: 'Dave',
    createdAt: t, updatedAt: t,
  };
  await putPaceWin(win);

  const node: TreeNodeRow = { id: uid(), projectId: proj.id, text: 'Output', rag: 'g', sort: 0, createdAt: t, updatedAt: t };
  await putTreeNode(node);

  /* A COMMISSIONING JOB PART-WAY THROUGH, with the programme behind it.
     FAT and install are signed, mechanical completion is where we are and it is
     eleven days late, and everything after it has moved with that — which is
     the whole shape the screen exists to show. Dates are relative to today, so
     the seed never quietly becomes a job that finished last year. */
  const day = 86_400_000;
  const iso = (offset: number) => new Date(t + offset * day).toISOString().slice(0, 10);

  /* THE TESTING CYCLE, SHAPED LIKE THE REAL JOB.
   *
   * Two machines, four tests round the loop: one passed, one didn't and has the
   * findings and next steps that came out of it, one didn't run, and one planned
   * from a next step on the failed one. That last link is the cycle, and a
   * fixture that got it wrong would make the app look broken when it was right. */
  await updateProject({ ...proj, plannedAt: iso(19), expectedAt: iso(27), updatedAt: t });

  /* Each machine carries its four days — expected, landed, installed, running —
     so the Machines lane of the plan draws from the seed the way it draws from
     a real job. The wrapper ran on time; the weigher landed late and is still
     being commissioned; the labeller was due three days ago and has not turned
     up, which is the one case the outstanding table counts as late. */
  const wrapper: Asset = {
    id: uid(), projectId: proj.id, name: 'Ilapak flow wrapper', oem: 'Ilapak UK',
    state: 'running', dueOn: iso(-16), onSiteOn: iso(-16), installedOn: iso(-13), runningOn: iso(-10),
    sort: 10, updatedAt: t,
  };
  const weigher: Asset = {
    id: uid(), projectId: proj.id, name: 'Ishida checkweigher', oem: 'Ishida Europe',
    state: 'installed', dueOn: iso(-12), onSiteOn: iso(-8), installedOn: iso(-5),
    sort: 20, updatedAt: t,
  };
  const labeller: Asset = {
    id: uid(), projectId: proj.id, name: 'Domino coder', oem: 'Domino UK',
    state: 'awaited', dueOn: iso(-3),
    sort: 30, updatedAt: t,
  };

  /* A file the OEM sent, bytes and all, so the screen renders a real row and a
     broken read path shows up here rather than on a phone on a factory floor. */
  const docKey = `doc-${uid()}`;
  await putBlob(docKey, new Blob(['%PDF-1.4 seeded FAT report'], { type: 'application/pdf' }));

  await putAsset(wrapper);
  await putAsset(weigher);
  await putAsset(labeller);

  const estop: Test = {
    id: uid(), projectId: proj.id, title: 'Emergency stops', assetId: wrapper.id,
    plannedFor: iso(-9), ranOn: iso(-9), withWhom: 'Ilapak UK',
    passesIf: 'Every e-stop halts the machine inside 2 seconds',
    result: 'Halted in 1.4 s on all four', outcome: 'passed',
    sort: 1, createdAt: t, updatedAt: t,
  };
  const seal: Test = {
    id: uid(), projectId: proj.id, title: 'Seal integrity — Finest Red 2kg', assetId: wrapper.id,
    plannedFor: iso(-2), ranOn: iso(-2), withWhom: 'Ilapak UK',
    planned: 'Finest Red 2kg', product: 'Finest Red 2kg',
    passesIf: '0 leaks in 20 packs, tested off the running machine',
    result: '3 leaked in 20. Held 61 ppm while it ran.', outcome: 'failed',
    docs: [{ id: uid(), name: 'Ilapak seal report.pdf', blobKey: docKey, mime: 'application/pdf', bytes: 411_008, savedAt: t }],
    sort: 2, createdAt: t, updatedAt: t,
  };
  const weight: Test = {
    id: uid(), projectId: proj.id, title: 'Weight accuracy — 400g', assetId: weigher.id,
    plannedFor: iso(-4), ranOn: iso(-4), withWhom: 'Ishida Europe',
    planned: 'Jacks White 2kg', product: 'Jacks White 2kg',
    passesIf: 'Within ±1.5 g over 200 packs',
    result: '±0.9 g over 200', outcome: 'passed',
    sort: 3, createdAt: t, updatedAt: t,
  };
  /* THE PERFORMANCE RUNS (lib/run) — the line accepted on its numbers. One
     run, three PRODUCTS planned ahead: one met every agreed number, one
     netted short, one still to run (Rowland, 7 October: "commissioning runs
     are multiple products"). And one kept the older single way, short. */
  /* THE FIRST TRY — an earlier attempt at the same run, which Jacks Piper did
     not pass twice (52, then 56 a minute against 60). With today's 58.5 it is
     a climb of three runs (lib/rampUp): at this climb, 60 at the next run. */
  const firstTry: Test = {
    id: uid(), projectId: proj.id, title: 'Performance run at the agreed rate', assetId: wrapper.id,
    plannedFor: iso(-5), ranOn: iso(-5), ranTo: iso(-3), withWhom: 'Ilapak UK',
    runs: [
      { id: uid(), product: 'Jacks Piper 1.25kg', agreed: { rate: 60, minutes: 60, rejectsMax: 1 },
        day: { minutes: 60, packs: 3150, rejects: 30, speed: 58, stops: 9 }, ranOn: iso(-5) },
      { id: uid(), product: 'Jacks Piper 1.25kg', agreed: { rate: 60, minutes: 60, rejectsMax: 1 },
        day: { minutes: 60, packs: 3400, rejects: 40, speed: 60, stops: 7 }, ranOn: iso(-3) },
    ],
    result: 'Film tracking drifted at speed; the jaw temperature was raised after the first hour.', outcome: 'failed',
    sort: 4, createdAt: t, updatedAt: t,
  };
  const perf: Test = {
    id: uid(), projectId: proj.id, title: 'Performance run at the agreed rate', assetId: wrapper.id,
    plannedFor: iso(-1), plannedTo: iso(1), ranOn: iso(-1), withWhom: 'Ilapak UK', fromTestId: firstTry.id,
    runs: [
      { id: uid(), product: 'Finest Red 2kg', agreed: { rate: 60, minutes: 60, rejectsMax: 1 },
        day: { minutes: 60, packs: 3720, rejects: 14, speed: 64, stops: 3 }, ranOn: iso(-1) },
      { id: uid(), product: 'Jacks Piper 1.25kg', agreed: { rate: 60, minutes: 60, rejectsMax: 1 },
        day: { minutes: 60, packs: 3550, rejects: 42, speed: 62, stops: 6 }, ranOn: iso(-1) },
      { id: uid(), product: 'Express White 500g', agreed: { rate: 70, minutes: 30, rejectsMax: 1 } },
    ],
    result: 'Held 64 on the controller; one film splice stop at 35 min.', outcome: 'planned',
    sort: 5, createdAt: t, updatedAt: t,
  };
  const speedRun: Test = {
    id: uid(), projectId: proj.id, title: 'Runs with product at the agreed speed', assetId: weigher.id,
    plannedFor: iso(-3), ranOn: iso(-3), withWhom: 'Ishida Europe',
    planned: 'Jacks White 2kg', product: 'Jacks White 2kg',
    runAgreed: { rate: 60, minutes: 30, rejectsMax: 1 },
    run: { minutes: 30, packs: 1710, rejects: 31, speed: 60, stops: 2 },
    outcome: 'failed',
    sort: 6, createdAt: t, updatedAt: t,
  };
  const changeover: Test = {
    id: uid(), projectId: proj.id, title: 'Changeover 2kg → 1.25kg', assetId: wrapper.id,
    plannedFor: iso(-6), ranOn: iso(-6), withWhom: 'Ilapak UK',
    passesIf: '20 minutes, by our own people, twice',
    result: 'Ilapak engineer off site — did not happen', outcome: 'notRun',
    sort: 4, createdAt: t, updatedAt: t,
  };
  /* THE LOOP: planned off the back of the failed seal test. */
  const retest: Test = {
    id: uid(), projectId: proj.id, title: 'Seal integrity — Finest Red 2kg — re-test', assetId: wrapper.id,
    plannedFor: iso(5), withWhom: 'Ilapak UK',
    planned: 'Finest Red 2kg',
    passesIf: '0 leaks in 20 packs, tested off the running machine',
    fromTestId: seal.id, outcome: 'planned',
    sort: 5, createdAt: t, updatedAt: t,
  };
  for (const test of [estop, seal, weight, firstTry, perf, speedRun, changeover, retest]) await putTest(test);

  const item = (testId: string, kind: TestItem['kind'], what: string, extra: Partial<TestItem> = {}): TestItem =>
    ({ id: uid(), projectId: proj.id, testId, kind, what, sort: 1, createdAt: t, updatedAt: t, ...extra });

  /* FIXES ARE MADE ON THE FIXES SCREEN, AGAINST THE TEST THEY ARE FOR — so the
     seed makes them that way. They used to be next-step lines that a loader
     silently turned into fixes, which is the very thing Rowland found on his
     own list and never asked for. */
  const fix = (o: Partial<Test> & { title: string }): Test => ({
    id: uid(), projectId: proj.id, kind: 'fix', outcome: 'planned', sort: 20, createdAt: t, updatedAt: t, ...o,
  });
  for (const f of [
    fix({ title: 'Fit the upgraded jaw heater', fromTestId: seal.id, assetId: wrapper.id,
      withWhom: 'Ilapak UK', plannedFor: iso(3), passesIf: 'Seal jaw temperature drifts 8°C in 20 minutes' }),
    fix({ title: 'Re-track the film and re-splice', fromTestId: seal.id, assetId: wrapper.id,
      withWhom: 'Dave', plannedFor: iso(1), passesIf: 'Film tracking off to the left after a splice' }),
    fix({ title: 'Send a changeover kit list', fromTestId: changeover.id, assetId: wrapper.id,
      withWhom: 'Ilapak UK', plannedFor: iso(4), passesIf: 'Nobody on site could find the changeover parts' }),
  ]) await putTest(f);

  /* THE WEIGHER'S INSTALLATION, step by step — four done, one late, one
     ahead, and the air drop turned up a missing regulator that became a fix
     for that step. The Install screen draws its strip and its sentence off
     exactly this. */
  const step = (title: string, sort: number, o: Partial<Test> = {}): Test => ({
    id: uid(), projectId: proj.id, kind: 'install', title, assetId: weigher.id, withWhom: 'Ishida Europe',
    outcome: 'planned', sort: 40 + sort, createdAt: t, updatedAt: t, ...o,
  });
  const airDrop = step('Air and power connected', 3, { plannedFor: iso(-7), ranOn: iso(-7), outcome: 'passed',
    result: 'Air on and tested. Regulator missing from the kit — fitted a loan one.' });
  const steps = [
    step('Positioned and levelled', 1, { plannedFor: iso(-8), ranOn: iso(-8), outcome: 'passed' }),
    step('Mechanically complete', 2, { plannedFor: iso(-8), ranOn: iso(-7), outcome: 'passed' }),
    airDrop,
    step('Electrically complete', 4, { plannedFor: iso(-6), ranOn: iso(-5), outcome: 'passed', withWhom: 'Site electrician' }),
    step('Sensors and controls checked (I/O)', 5, { plannedFor: iso(-2) }),
    step('Dry run', 6, { plannedFor: iso(2) }),
  ];
  for (const s of steps) await putTest(s);
  /* THE GATES AFTER INSTALL on the wrapper, which is in and running: set up
     part-way (programs loaded, recipes set, change parts late), and the
     hand-over check sheet started (manuals handed over). */
  const programsLoaded = step('Programs loaded', 11, { gate: 'setup', assetId: wrapper.id, withWhom: 'Ilapak UK', plannedFor: iso(-4), ranOn: iso(-4), outcome: 'passed',
    result: 'All six programs loaded from the Ilapak laptop. Two recipes still had the old 1.25 kg weights — corrected on site with their engineer.' });
  for (const g of [
    programsLoaded,
    step('Recipes and settings set', 12, { gate: 'setup', assetId: wrapper.id, withWhom: 'Ilapak UK', plannedFor: iso(-3), ranOn: iso(-3), outcome: 'passed' }),
    step('Change parts fitted', 13, { gate: 'setup', assetId: wrapper.id, withWhom: 'Ilapak UK', plannedFor: iso(-1) }),
    step('Manuals and drawings handed over', 21, { gate: 'handover', assetId: wrapper.id, withWhom: 'Ilapak UK', plannedFor: iso(-2), ranOn: iso(-2), outcome: 'passed',
      result: 'Manuals, electrical drawings and the spares book handed over on a USB stick and in paper; filed in the engineering office.' }),
    step('Operators and engineers trained', 22, { gate: 'handover', assetId: wrapper.id, withWhom: 'Ilapak UK', plannedFor: iso(8) }),
  ]) await putTest(g);
  await putTestItem(item(airDrop.id, 'found', 'Regulator missing from the kit', { owner: 'Ishida Europe', sort: 1 }));
  /* The short run's issue — what is written under it is the run's "issues". */
  await putTestItem(item(speedRun.id, 'found', 'Light packs rejected at the start of every reel — 31 in the half hour', { owner: 'Ishida Europe', sort: 1 }));
  /* PARTS OF THE PLAN on a stage (ui/StageParts) — Rowland's own, written on
     Programs loaded, with a day; and one already done. The plan draws them as
     branches under the stage, on screen and on paper. */
  await putTestItem(item(programsLoaded.id, 'next', 'First program to verify Tesco Express 1.25 packs through the de-nester and the pick and place',
    { owner: 'Ilapak UK', due: iso(2), sort: 1 }));
  /* A HIGH RISK (lib/critical riskProblems) — Rowland's 100 hours, which
     are an assumption, not reality: what it could cost, and the consequence. */
  await putTestItem(item(programsLoaded.id, 'found', 'Recipes may need re-validating by Tesco quality before release', {
    owner: 'Rowland', risk: true, couldLose: 100, sort: 4,
    impact: 'If Tesco ask for re-validation, the release slips a further two weeks and the launch moves.',
    ways: [{ id: 'r1', what: 'Ask Tesco quality now whether the old validation carries over' }],
  }));

  /* THE PLAN FOR TODAY (lib/huddle) — agreed at this morning's huddle: one
     done, one about a stage, one on the whole job; and yesterday's, with one
     line not done, so "carry it over" is offered. */
  for (const [k, p] of ([
    [1, { what: 'Load the Express programs on the wrapper', testId: programsLoaded.id, owner: 'Ilapak UK' }],
    [2, { what: 'Walk the guarding with the safety officer', owner: 'Rowland', doneAt: t }],
    [3, { what: 'Chase the regulator from Ishida', owner: 'Dave' }],
  ] as const)) await putTestItem(item(p.testId ?? '', 'today', p.what, { owner: p.owner, due: iso(0), sort: k, ...('doneAt' in p ? { doneAt: p.doneAt } : {}) }));
  await putTestItem(item('', 'today', 'Book the electrician for the coder', { owner: 'Rowland', due: iso(-1), sort: 1 }));
  await putTestItem(item('', 'today', 'Unpack the change parts', { owner: 'Dave', due: iso(-1), doneAt: t - day, sort: 2 }));

  /* A CRITICAL PROBLEM (lib/critical) — Rowland's own example, on the
     stage it was found on, with what it means for the business and two ways
     round it, one agreed. It leads the front page, the plan's stage, the day
     and the client report under "Are we on target?". */
  await putTestItem(item(programsLoaded.id, 'found', 'Programs cannot be copied over from the old line — each one has to be rewritten', {
    owner: 'Ilapak UK', hoursLost: 6, critical: true, sort: 3,
    impact: 'The line cannot go back to production on the agreed day: rewriting the programs takes about two weeks, and the Tesco Express launch is booked for 2 November.',
    ways: [
      { id: 'w1', what: 'Put a production belt in to bypass the robot, and pack by hand until the programs are done', agreed: true },
      { id: 'w2', what: 'Ilapak send a second engineer to rewrite the programs in parallel' },
    ],
  }));
  await putTestItem(item(programsLoaded.id, 'next', 'Back up the six programs to the site server', { owner: 'Dave', due: iso(-3), doneAt: t - 3 * day, sort: 2 }));
  /* PROGRAMS WITH A STATUS AND WHAT WAS SEEN (lib/noted resultNow) — one at
     its baseline after failing the day before, one failed. Rowland, 8
     October: "status of program, not just problem — pass, fail, baseline
     achieved ... status with commentary." */
  await putTestItem(item(programsLoaded.id, 'next', 'PR-12 Express 1.25 kg', { owner: 'Ilapak UK', sort: 5, results: [
    { is: 'failed', on: iso(-1), note: 'Seal jaws not reaching temperature — film creasing on every pack', at: t - day },
    { is: 'baseline', on: iso(0), note: 'Running 32 ppm at baseline settings; film tracking still to tune', at: t },
  ] }));
  await putTestItem(item(programsLoaded.id, 'next', 'PR-04 Finest Red 2 kg', { owner: 'Ilapak UK', sort: 6, results: [
    { is: 'failed', on: iso(0), note: 'Bag length short by 8 mm — the 2 kg will not close', at: t },
  ] }));
  const regulator = fix({ title: 'Send the regulator', fromTestId: airDrop.id, assetId: weigher.id,
    withWhom: 'Ishida Europe', plannedFor: iso(1), passesIf: 'Regulator missing from the kit — running on a loan one' });
  await putTest(regulator);

  /* THE WRAPPER'S PROGRAMS, PROVED IN COMMISSION (lib/commission) — one with
     its test booked, one proved by a test that passed, one with no test yet,
     so the Commission grid's programs square, "Programs to prove", the
     drawer's program line and Set up's programs stage all draw a real one. */
  const wrapProg = (what: string, p: Partial<Program>): Program =>
    ({ id: uid(), projectId: proj.id, assetId: wrapper.id, what, state: 'onMachine', from: 'Ilapak UK', sort: 0, createdAt: t, updatedAt: t, ...p });
  const express = wrapProg('PR-12 Express 1.25 kg', { runs: 'Tesco Express 1.25 kg', testOn: iso(3), sort: 1 });
  const red = wrapProg('PR-04 Finest Red 2 kg', { runs: 'Finest Red 2 kg', sort: 2 });
  await putPrograms([express, red, wrapProg('PR-07 Baking Potatoes 2 kg', { state: 'needed', sort: 3 })]);
  const proveExpress: Test = { id: uid(), projectId: proj.id, kind: 'test', title: 'Prove program PR-12 Express 1.25 kg', assetId: wrapper.id,
    programId: express.id, planned: 'Tesco Express 1.25 kg', plannedFor: iso(3), withWhom: 'Ilapak UK', outcome: 'planned', sort: 6, createdAt: t, updatedAt: t };
  const proveRed: Test = { id: uid(), projectId: proj.id, kind: 'test', title: 'Prove program PR-04 Finest Red 2 kg', assetId: wrapper.id,
    programId: red.id, planned: 'Finest Red 2 kg', plannedFor: iso(-1), ranOn: iso(-1), withWhom: 'Ilapak UK', outcome: 'passed', result: '500 packs, no rejects', sort: 7, createdAt: t, updatedAt: t };
  await putTest(proveExpress);
  await putTest(proveRed);

  for (const i of [
    item(seal.id, 'found', 'Seal jaw temperature drifting', { owner: 'Ilapak UK', note: 'Drops 8°C over 20 minutes, then the seals fail', sort: 1 }),
    item(seal.id, 'found', 'Film tracking off to the left after a splice', { owner: 'Ilapak UK', sort: 2 }),
    item(seal.id, 'found', 'No guard on the infeed shelf', { owner: 'us', doneAt: t - 1 * day, sort: 3 }),
    item(changeover.id, 'found', 'Nobody on site could find the changeover parts', { owner: 'us', sort: 1 }),
    item(estop.id, 'found', 'E-stop label peeling on the infeed', { owner: 'us', doneAt: t - 5 * day, sort: 1 }),
  ]) await putTestItem(i);

  /* A PROJECT ON THE BOARD MODEL, MEASURED THE WAY ITS OWN BUSINESS MEASURES.
   *
   * Two measures, deliberately pulling in opposite directions — packs per minute
   * where up is good, waste where down is good. A seed with only "up is good"
   * measures in it cannot catch the bug this whole model exists to prevent: the
   * app congratulating somebody for making more waste. */
  const paced = await createProject('Line 7 pace', '#1b7f5a', 'Rowland', 'r@example.com', 'board');
  const ppm: Measure = { id: uid(), name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 10 };
  const waste: Measure = { id: uid(), name: 'Waste', unit: '%', direction: 'down', sort: 20 };
  const periods: Period[] = quarters(iso(-40), uid);
  await updateProject({ ...paced, measures: [ppm, waste], periods, updatedAt: t });

  /* LINE 2A's STATIONS — the worked line from lib/capacity's tests: a bagger at
     70 a minute, baskets of 12 at 5.5 a minute (running 94% of the time, so it
     is its STOPS that limit the line, not its speed), a person carrying two
     baskets every 20 s, and a palletiser at 8 pallets an hour. Its stops are
     logged on the line's own workspace, against those machine names. */
  const capWs = await createWorkspace('Line 2A — capacity');
  const pacedLine = await addPaceLine({
    projectId: paced.id, key: '2A', name: 'Line 2A', variant: 'measured independently',
    owner: 'Rob Scott', sponsor: 'Tanya', sort: 0, workspaceId: capWs.id,
    capacity: {
      targetPerMin: 66, plannedHoursPerWeek: 10,
      stations: [
        { id: 'cap-bagger', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min', source: 'plate' },
        { id: 'cap-basketer', name: 'Basketer', kind: 'machine', unit: 'baskets', contains: 12, rate: 5.5, ratePer: 'min', runningPct: 94, source: 'timed', note: 'Timed 30 baskets, 2 Oct' },
        { id: 'cap-carrier', name: 'Carrier', kind: 'people', unit: 'baskets', contains: 1, cycleSec: 20, perCycle: 2, source: 'timed', note: 'Sustained pace, not best lap' },
        { id: 'cap-palletiser', name: 'Palletiser', kind: 'machine', unit: 'pallets', contains: 40, rate: 8, ratePer: 'hour', source: 'plate' },
      ],
      /* A what-if beside the line: the basketer swapped for a faster one. It
         moves the limit to the palletiser and gains only 2 — the honest cap
         the compare sentence has to say. */
      whatIfs: [{
        id: 'cap-wi-1', name: 'New basketer', createdAt: t,
        stations: [
          { id: 'cap-bagger', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min', source: 'plate' },
          { id: 'cap-basketer', name: 'New basketer', kind: 'machine', unit: 'baskets', contains: 12, rate: 8, ratePer: 'min', runningPct: 94, source: 'plate' },
          { id: 'cap-carrier', name: 'Carrier', kind: 'people', unit: 'baskets', contains: 1, cycleSec: 20, perCycle: 2, source: 'timed', note: 'Sustained pace, not best lap' },
          { id: 'cap-palletiser', name: 'Palletiser', kind: 'machine', unit: 'pallets', contains: 40, rate: 8, ratePer: 'hour', source: 'plate' },
        ],
      }],
    },
  });
  const stop = (asset: string, mins: number, daysAgo: number, category = 'Breakdown', subcategory = 'Mechanical'): Observation => ({
    id: uid(), workspaceId: capWs.id, category, subcategory, asset, shift: 'Days',
    startedAt: t - daysAgo * 86_400_000, endedAt: t - daysAgo * 86_400_000 + mins * 60_000, durationMs: mins * 60_000,
    count: 1, timing: 'stopwatch', media: [], createdAt: t, updatedAt: t,
  });
  for (const o of [
    stop('Basketer', 52, 2), stop('Basketer', 38, 5), stop('Basketer', 54, 9),
    stop('Basketer', 12, 4, 'Waiting', 'Blocked downstream'),
    stop('Palletiser', 8, 3), stop('Bagger', 6, 6),
    stop('Bagger', 9, 7, 'Waiting', 'Starved upstream'),
  ]) await addObservation(o);
  /* Line 7 has its own walk (an empty one): the old Case below lives in it,
     which is how a Case opened before 6M knows its line. */
  const line7Ws = await createWorkspace('Line 7');
  const otherLine = await addPaceLine({
    projectId: paced.id, key: '7', name: 'Line 7', owner: 'Lee Carty', sponsor: 'Tanya', sort: 1, workspaceId: line7Ws.id,
  });

  const target = (lineId: string, measureId: string, periodId: string, value: number): Target =>
    ({ id: uid(), projectId: paced.id, lineId, measureId, periodId, value, updatedAt: t });

  /* Rising quarterly targets on the rate, one flat target on the waste. */
  const rates = [44, 50, 52, 55];
  for (const [q, p] of periods.entries()) {
    await putTarget(target(pacedLine.id, ppm.id, p.id, rates[q]));
    await putTarget(target(otherLine.id, ppm.id, p.id, rates[q] - 5));
    await putTarget(target(pacedLine.id, waste.id, p.id, 2));
  }

  /* Eight weeks of readings on each line, one of them ABOVE target and one
     below, so both the good and the bad branch of every chart is drawn. */
  const reading = (lineId: string, measureId: string, at: string, value: number): Reading =>
    ({ id: uid(), projectId: paced.id, lineId, measureId, at, value, createdAt: t, updatedAt: t });

  const weekly = [42, 41, 35, 47, 44, 46, 49, 52];
  const rows: Reading[] = [];
  weekly.forEach((v, i) => {
    const at = iso(-7 * (weekly.length - i));
    rows.push(reading(pacedLine.id, ppm.id, at, v));
    rows.push(reading(otherLine.id, ppm.id, at, v - 8));
    // waste is read less often than the rate, which is the normal case and the
    // reason the chart plots against dates rather than a week index
    if (i % 2 === 0) rows.push(reading(pacedLine.id, waste.id, at, 2.8 - i * 0.2));
  });
  await putReadings(rows);

  /* THE 3P ACTIONS — kept in the app, one in every column and every state:
     late, waiting, done, one for every line, and one not yet given a column,
     so every branch of the board is drawn. */
  const act = (what: string, a: Partial<PaceTodoRow>): PaceTodoRow => ({
    id: uid(), projectId: paced.id, what, where: '', why: '', who: '', when: '', state: 'todo',
    createdAt: t, updatedAt: t, ...a,
  });
  for (const a of [
    act('Train the night shift on the splice', { lineId: pacedLine.id, pillar: 'people', who: 'Rob Scott', due: iso(-2), why: 'Film breaks at the splice' }),
    act('Replace the worn sealing jaw', { lineId: pacedLine.id, pillar: 'plant', who: 'Engineering', due: iso(5), state: 'waiting' }),
    act('One changeover standard for 2kg to 1.25kg', { lineId: pacedLine.id, pillar: 'process', who: 'Rob Scott', due: iso(-9), state: 'done', doneOn: iso(-21), outcome: 'Down to 22 minutes' }),
    act('Second operator on the infeed at start-up', { lineId: otherLine.id, pillar: 'people', who: 'Lee Carty', due: iso(3) }),
    act('Weekly 5S walk, every line', { pillar: 'process', who: 'Tanya', due: iso(7) }),
    act('Look at the reject bin full by 10am', { lineId: otherLine.id }),
  ]) await putPaceTodo(a);

  /* THE 6M METHOD ON LINE 2A (docs/SIXM.md) — two problems, so every part of
     the fishbone is drawn from data rather than an empty state.

     The log first: five weeks of Basketer minor stops, most of them on
     nights, some tapped onto a bone by the floor and the rest left for the
     fishbone to guess; film splices on the bagger (a Material guess); and
     two notes about condensation on the eye (Environment). */
  const sixmStop = (o: Partial<Observation> & { daysAgo: number; mins: number }): Observation => {
    const { daysAgo, mins, ...rest } = o;
    const s = t - daysAgo * 86_400_000 - 3 * 3_600_000;
    return {
      id: uid(), workspaceId: capWs.id, category: 'Minor stop', subcategory: 'Misfeed', asset: 'Basketer', shift: 'Nights',
      startedAt: s, endedAt: s + mins * 60_000, durationMs: mins * 60_000, count: 1, timing: 'stopwatch',
      media: [], createdAt: t, updatedAt: t, ...rest,
    };
  };
  for (const o of [
    ...[3, 6, 8, 10, 12, 15, 17, 19, 22, 24, 26, 29, 31, 33].map((d, i) =>
      sixmStop({ daysAgo: d, mins: 6 + (i % 5) * 2, ...(i % 3 === 0 ? { causeM: 'machine' as const } : {}) })),
    ...[4, 11, 18, 25, 32].map(d => sixmStop({ daysAgo: d, mins: 7, shift: 'Days' })),
    sixmStop({ daysAgo: 9, mins: 9, subcategory: 'Sensor trip', note: 'condensation on the eye at start-up' }),
    sixmStop({ daysAgo: 23, mins: 11, subcategory: 'Sensor trip', note: 'Condensation on the photo-eye again', shift: 'Days' }),
    ...[5, 13, 20, 27].map(d => sixmStop({ daysAgo: d, mins: 14, asset: 'Bagger', subcategory: 'Film / packaging snag', shift: 'Days' })),
    /* Two small losses outside the vital few, so the Pareto offers "Just do
       it" on a bar (lib/paretoPicks) as well as "Find the root cause". */
    sixmStop({ daysAgo: 7, mins: 6, category: 'Changeover', subcategory: 'Size change', asset: 'Bagger', shift: 'Days' }),
    sixmStop({ daysAgo: 16, mins: 3, category: 'Waiting', subcategory: 'Waiting for materials', asset: 'Basketer', shift: 'Days' }),
  ]) await addObservation(o);

  /* Problem 1 — a Pareto bar, being acted on: a confirmed root drilled with
     its whys, suspected causes on three more bones, and two countermeasures
     on the board pointing at the root (one late). */
  const misfeeds: Case = {
    id: uid(), workspaceId: capWs.id, title: 'Basketer minor stops', path: [{ dimension: 'asset', value: 'Basketer' }, { dimension: 'category', value: 'Minor stop' }],
    baselineMsWeek: Math.round(3.4 * 3_600_000), status: 'open', openedAt: t - 12 * day, updatedAt: t,
    projectId: paced.id, lineId: pacedLine.id, source: { kind: 'pareto', category: 'Minor stop', asset: 'Basketer' },
    causes: [
      { id: 'rail', m: 'machine', text: 'Baskets catch on the guide rail at the transfer', grade: 'observed', status: 'confirmed', root: true,
        by: 'Rob Scott', at: t - 10 * day, source: { kind: 'observation', label: 'Seen on nights, 24 Sept' },
        whys: [
          { id: uid(), text: 'The guide rail has a groove worn at the transfer', grade: 'observed' },
          { id: uid(), text: 'The rail has not been on the PM schedule since the basketer was moved', grade: 'counted' },
          { id: uid(), text: 'Nobody owns the PM list for kit that has been moved', grade: 'reported' },
        ] },
      { id: 'nights', m: 'people', text: 'Most stops on Nights', grade: 'measured', status: 'suspected', whys: [], at: t - 9 * day,
        source: { kind: 'pareto', ref: 'shift=Nights', label: 'Stops by shift — Nights' } },
      { id: 'stack', m: 'material', text: 'Damaged baskets in the stack — bent lips', grade: 'reported', status: 'suspected', whys: [], at: t - 8 * day, by: 'Lee Carty' },
      { id: 'eye', m: 'environment', text: 'Condensation on the photo-eye at start-up', grade: 'observed', status: 'ruled_out', at: t - 7 * day, by: 'Rob Scott',
        whys: [{ id: uid(), text: 'Only on the first hour after a cold start — not the misfeeds', grade: 'observed' }] },
    ],
  };
  /* Problem 2 — the gap, closed and holding: changeovers drilled to a root,
     the countermeasure done three weeks ago, the rate up since, and the check
     that keeps it. */
  const gap: Case = {
    id: uid(), workspaceId: capWs.id, title: 'Line 2A below its rate target', path: [],
    baselineMsWeek: 0, status: 'closed', openedAt: t - 50 * day, closedAt: t - 4 * day, updatedAt: t,
    projectId: paced.id, lineId: pacedLine.id, source: { kind: 'gap', measureId: ppm.id },
    causes: [
      { id: 'co', m: 'method', text: 'Changeovers take 48 min against a 25 min standard', grade: 'measured', status: 'confirmed', root: true, at: t - 45 * day, by: 'Rob Scott',
        whys: [
          { id: uid(), text: 'Every shift does the 2kg → 1.25kg change its own way', grade: 'observed' },
          { id: uid(), text: 'There is no written changeover standard for the size change', grade: 'counted' },
        ] },
      { id: 'train', m: 'people', text: 'New starters not trained on the size change', grade: 'counted', status: 'confirmed', whys: [], at: t - 44 * day },
      { id: 'jaw', m: 'machine', text: 'Sealing jaw slow to come up to heat', grade: 'reported', status: 'ruled_out', whys: [], at: t - 44 * day },
    ],
    hold: { what: 'One changeover timed against the standard each week', who: 'Rob Scott', everyDays: 7, since: iso(-4), lastChecked: iso(-1), standardUpdated: true },
  };
  await addCase(misfeeds);
  await addCase(gap);
  /* A CASE OPENED BEFORE 6M, on Line 7 (not 2A, so no other fixture's count
     moves): no project or line on the row, its five whys as the old plain
     list (the last the root) and no causes — the fishbone shows the chain and
     offers "Put it on a bone". Opened long ago, so the job still leads with
     the Basketer problem. */
  const oldCase: Case = {
    id: uid(), workspaceId: line7Ws.id, title: 'Reject bin full by 10am', path: [],
    whys: ['The checkweigher rejects good packs', 'It weighs light after a film change', 'Nobody re-zeroes it after the film change'],
    baselineMsWeek: 0, status: 'open', openedAt: t - 70 * day, updatedAt: t,
  };
  await addCase(oldCase);
  /* LINE 7'S VALUE STREAM on this job (B3b): its card says the flow, and the
     old case's fishbone (the whole line) offers its biggest wait and its
     waste as causes — the run waiting a day for planning to release it, on
     Method; the jaw reset, on Machine. */
  {
    const H = 3600;
    await putStudy({ id: uid(), tool: 'map', name: 'Run released to pallet away — Line 7', projectId: paced.id, workspaceId: line7Ws.id,
      agreed: { map: { scope: 'line', supplier: 'Run released', customer: 'Pallet to despatch', demandPerDay: 9600, availableSecPerDay: 16 * H } },
      facts: { flow: [
        { id: uid(), order: 0, name: 'Release the run to the line', who: ['Planning'], where: 'Office', kind: 'operation', value: 'needed', cycleSec: 600, batch: 9600, waitSec: 20 * H, source: 'typed' },
        { id: uid(), order: 1, name: 'Bag and seal', who: ['Machine'], where: 'Bagger', kind: 'operation', value: 'adds', cycleSec: 1.3, source: 'timed' },
        { id: uid(), order: 2, name: 'Reset the sealing jaw', who: ['Maintenance', 'Op 1'], where: 'Bagger', kind: 'operation', value: 'waste', cycleSec: 600, batch: 4800, source: 'timed' },
        { id: uid(), order: 3, name: 'Pallet waits for QA release', who: ['Quality'], where: 'Palletiser', kind: 'wait', waitSec: 6 * H, source: 'typed' },
        { id: uid(), order: 4, name: 'Pallet to despatch', who: ['Forklift driver'], where: 'Despatch', kind: 'move', value: 'needed', cycleSec: 180, batch: 720, source: 'timed' },
      ] }, uses: [], startedAt: t - 5 * 3_600_000, createdAt: t, updatedAt: t });
  }
  /* LINE 7'S SMED on this job (tool 6): the old case's fishbone offers its
     longest internal elements on Machine and the external work still done
     with the line stopped on Method; the line's card says its minutes. How
     the line runs is said — three shifts of 8 h less 30 min of breaks, five
     days, 48 weeks, two changeovers a shift — and the speed is the line's
     rated speed in its settings (not a plate speed: Line 7 has no line
     balance for Express); with Line 7's cost settings the cost is said in
     pounds, idle labour and contribution apart (docs/CAPACITY.md §6). */
  const pacedChangeoverId = uid();
  await putStudy({ id: pacedChangeoverId, tool: 'changeover', name: 'Finest Red 2kg → Express 1.25 kg', product: 'Express 1.25 kg', projectId: paced.id, workspaceId: line7Ws.id,
    facts: { fromProduct: 'Finest Red 2kg', toProduct: 'Express 1.25 kg', sequence: smedElements(t - 4 * 3_600_000, 'Rob Scott'),
      running: { shiftsPerDay: 3, hoursPerShift: 8, breakMin: 30, daysPerWeek: 5, weeksPerYear: 48 }, changeovers: { count: 2, per: 'shift' }, ratePerMin: 100, rateFrom: 'line' },
    uses: [], startedAt: t - 4 * 3_600_000, createdAt: t, updatedAt: t });

  /* A SHIFT'S LOSSES ON LINE 7 (tool 7). The line gets its three shifts —
     30 minutes of breaks on each, the line stopping for them on the days,
     relief covering them on nights — and a cost model (crew 4 at £14.50
     with on-costs ×1.3: £75.40 an hour of idle labour; 4p a pack margin);
     a line standard whose capacity has the Bagger at 100 a minute on its
     plate, the critical machine; and the stops the floor timed through two
     days ago's two shifts and yesterday's. The count is the worked example:
     480 min shift − 30 of breaks = 450 planned at the Bagger's plate 100 a
     minute, 36,500 made, 600 rejects — 85 min lost, 52 of stops, 18 of
     changeover, 6 of rejects, 9 of slow running and short stops not yet told
     apart (amber: over a tenth); £107 idle labour · £340 lost contribution.
     Its biggest bar raised a countermeasure on the board; yesterday's Shift
     1 is counted as its proof, with its running speed timed — the slow
     running told from the short stops — before → after on the board, the
     fishbone, the line's card, the control room and the 6M report's Evidence. */
  const SHIFTS = [{ name: 'Shift 1', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Shift 2', start: '14:00', end: '22:00', breakMin: 30 }, { name: 'Nights', start: '22:00', end: '06:00', breakMin: 30, relief: true }];
  await updateWorkspace({ ...line7Ws, shifts: SHIFTS, crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, packsPerMin: 100, marginPerPack: 0.04 });
  const line7Std = uid();
  await putStandard({ id: line7Std, projectId: paced.id, workspaceId: line7Ws.id, product: 'Maris Piper 2kg', marks: [],
    capacity: { targetPerMin: 100, stations: [
      { id: 'l7-bagger', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 100, ratePer: 'min', source: 'plate' },
      { id: 'l7-check', name: 'Checkweigher', kind: 'machine', unit: 'bags', contains: 1, rate: 2.2, ratePer: 'sec', source: 'plate' },
      { id: 'l7-packer', name: 'Packer', kind: 'people', unit: 'cases', contains: 10, cycleSec: 5, perCycle: 1, crew: 2, source: 'timed' },
    ] }, sort: 4, createdAt: t, updatedAt: t });
  /* two days ago's Shift 1 and Shift 2, and yesterday's Shift 1 — every one
     of them over, whatever the hour the seed runs at */
  const y1 = shiftWindow(SHIFTS[0], iso(-2)) as { from: number; to: number };
  const y2 = shiftWindow(SHIFTS[1], iso(-2)) as { from: number; to: number };
  const d1 = shiftWindow(SHIFTS[0], iso(-1)) as { from: number; to: number };
  const HR = 3_600_000;
  const lstop = (at: number, mins: number, o: Partial<Observation> = {}): Observation => ({
    id: uid(), workspaceId: line7Ws.id, category: 'Breakdown', subcategory: 'Mechanical', asset: 'Bagger', shift: 'Shift 1',
    startedAt: at, endedAt: at + mins * 60_000, durationMs: mins * 60_000, count: 1, timing: 'stopwatch', media: [], createdAt: t, updatedAt: t, ...o,
  });
  for (const o of [
    lstop(y1.from + 1 * HR, 32, { causeM: 'machine', note: 'jaw heater tripped' }),
    lstop(y1.from + 3 * HR, 12, { category: 'Minor stop', subcategory: 'Misfeed', asset: 'Checkweigher' }),
    lstop(y1.from + 5 * HR, 8, { category: 'Minor stop', subcategory: 'Sensor trip', asset: 'Checkweigher' }),
    lstop(y1.from + 6 * HR, 18, { category: 'Changeover', subcategory: 'Size / format change' }),
    lstop(y2.from + 1 * HR, 20, { shift: 'Shift 2' }),
    lstop(y2.from + 2.5 * HR, 10, { shift: 'Shift 2', category: 'Minor stop', subcategory: 'Misfeed', asset: 'Checkweigher' }),
    lstop(y2.from + 4 * HR, 15, { shift: 'Shift 2', category: 'Changeover', subcategory: 'Product change' }),
    lstop(y2.from + 6 * HR, 5, { shift: 'Shift 2', category: 'Quality', subcategory: 'Seal fault' }),
    lstop(d1.from + 1 * HR, 10, { causeM: 'machine' }),
    lstop(d1.from + 2 * HR, 18, { category: 'Changeover', subcategory: 'Size / format change' }),
  ]) await addObservation(o);
  const lossCount: LossCount = { shift: 'Shift 1', from: y1.from, to: y1.to, breakMin: 30, plannedMin: 450, made: 36_500, rejects: 600, ratePerMin: 100, rateFrom: 'plate', rateMachine: 'Bagger' };
  const lossId = uid(), lossActionId = uid(), lossProofId = uid();
  const dayOf = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  const lossStudy: ToolStudy = { id: lossId, tool: 'losses', name: `Shift 1, ${dayOf(y1.from)}`, product: 'Maris Piper 2kg', standardId: line7Std,
    workspaceId: line7Ws.id, projectId: paced.id, facts: { losses: lossCount },
    uses: [{ id: uid(), kind: 'action', ref: lossActionId, role: 'evidence', at: y1.to + 20 * 60_000, step: 'cause:Breakdown' }],
    startedAt: y1.to + 5 * 60_000, createdAt: t, updatedAt: t };
  await putStudy(lossStudy);
  const lf = lossFigures(lossCount, await listObservations(line7Ws.id), { crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, marginPerPack: 0.04 });
  const bigBar = lf.bars[0];
  await putPaceTodo(act(barWords(bigBar, lossCount), { id: lossActionId, lineId: otherLine.id, pillar: bigBar.bone, where: bigBar.asset ?? '', why: studyTitle(lossStudy),
    who: 'Lee Carty', due: iso(3), expect: barExpect(bigBar, lossCount) }));
  await putStudy({ id: lossProofId, tool: 'losses', name: `Shift 1, ${dayOf(d1.from)}`, product: 'Maris Piper 2kg', standardId: line7Std,
    workspaceId: line7Ws.id, projectId: paced.id,
    facts: { losses: { shift: 'Shift 1', from: d1.from, to: d1.to, breakMin: 30, plannedMin: 450, made: 40_900, rejects: 300, ratePerMin: 100, rateFrom: 'plate', rateMachine: 'Bagger' },
      /* the running speed timed three times through the shift: 345 in 3.5 min = 98.6 a minute */
      timings: [
        { id: uid(), at: d1.from + 2 * HR, by: 'Lee Carty', packs: 99, sec: 60 },
        { id: uid(), at: d1.from + 4 * HR, by: 'Lee Carty', packs: 98, sec: 60 },
        { id: uid(), at: d1.from + 6 * HR, by: 'Sam Okafor', packs: 148, sec: 90 },
      ] },
    uses: [{ id: uid(), kind: 'action', ref: lossActionId, role: 'proof', at: d1.to + 5 * 60_000 }], startedAt: d1.to + 5 * 60_000, createdAt: t, updatedAt: t });
  for (const a of [
    act('Replace the basket guide rail', { lineId: pacedLine.id, pillar: 'machine', who: 'Engineering', due: iso(4), state: 'waiting',
      causeRef: `${misfeeds.id}:rail`, expect: 'Basketer minor stops 3.4 → 1.5 h a week' }),
    act('Put moved kit on the PM list, with an owner', { lineId: pacedLine.id, pillar: 'method', who: 'Rob Scott', due: iso(-1),
      causeRef: `${misfeeds.id}:rail`, expect: 'No moved machine without a PM owner' }),
    act('Write and train the 2kg → 1.25kg changeover standard', { lineId: pacedLine.id, pillar: 'method', who: 'Rob Scott', due: iso(-22),
      state: 'done', doneOn: iso(-21), causeRef: `${gap.id}:co`, expect: 'Changeover 48 → 25 min, rate 41 → 48 ppm', outcome: 'Down to 24 minutes on every shift' }),
    act('Size change on the new-starter training plan', { lineId: pacedLine.id, pillar: 'people', who: 'Tanya', due: iso(-20),
      state: 'done', doneOn: iso(-20), causeRef: `${gap.id}:train` }),
  ]) await putPaceTodo(a);

  /* A PROJECT ON THE LEVER TREE: an outcome, a line under it, a condition
     bound to the board (so the tree draws derived rows), a Pareto, and actions
     written on its board against its own line. */
  const tree = await createProject('Line 2B to 60 ppm', '#7c3aed', 'Rowland', 'r@example.com', 'tree');
  const treeLine = await addPaceLine({ projectId: tree.id, key: '2B', name: 'Line 2B', owner: 'Rob Scott', sponsor: 'Tanya', sort: 0 });
  const treeBox = (text: string, sort: number, o: Partial<TreeNodeRow> = {}): TreeNodeRow =>
    ({ id: uid(), projectId: tree.id, text, rag: 'n', sort, createdAt: t, updatedAt: t, ...o });
  /* THE TREE'S OWN NUMBER: one measure, this quarter's target, three weeks of
     readings — behind the target, so the box bound to it draws red, which is
     the branch of the rule a seed has to prove. "Line 2B achieves its ppm rate"
     is bound to it in the seed; the outcome above is left for a person to bind
     through the real controls. */
  const treePpm: Measure = { id: uid(), name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 10 };
  const treePeriods: Period[] = quarters(iso(-40), uid);
  await updateProject({ ...tree, pareto: true, measures: [treePpm], periods: treePeriods, updatedAt: t });
  await putTarget({ id: uid(), projectId: tree.id, lineId: treeLine.id, measureId: treePpm.id, periodId: treePeriods[0].id, value: 60, updatedAt: t });
  await putReadings([48, 51, 54].map((v, i): Reading => ({
    id: uid(), projectId: tree.id, lineId: treeLine.id, measureId: treePpm.id,
    at: iso(-7 * (3 - i)), value: v, createdAt: t, updatedAt: t,
  })));
  const outcome = treeBox('Line 2B holds 60 ppm', 0);
  const truth = treeBox('Line 2B achieves its ppm rate', 0, { parentId: outcome.id, bind: { measureId: treePpm.id, lineId: treeLine.id } });
  const cond = treeBox('The machine runs without stopping us', 0, { parentId: truth.id, bind: { line: '2B', categories: ['Plant'] } });
  for (const n of [outcome, truth, cond]) await putTreeNode(n);
  for (const a of [
    { what: 'Replace the worn sealing jaw', pillar: 'plant' as const, who: 'Engineering', due: iso(-1) },
    { what: 'Re-time the infeed to the sealer', pillar: 'plant' as const, who: 'Rob Scott', due: iso(6) },
    { what: 'Night shift trained on the splice', pillar: 'people' as const, who: 'Rob Scott', due: iso(4), state: 'done' as const },
  ]) await putPaceTodo({
    id: uid(), projectId: tree.id, lineId: treeLine.id, where: '', why: '', when: '', state: 'todo',
    createdAt: t, updatedAt: t, ...a,
  });

  /* WHAT THE JOB IS WAITING ON — one of each state, because the grid, the list
     order and the "late" banner all read differently per state and a fixture
     that is all one thing proves none of them. */
  const material = (what: string, m: Partial<Material>): Material =>
    ({ id: uid(), projectId: paced.id, what, sort: 0, createdAt: t, updatedAt: t, ...m });

  await putMaterials([
    material('Perforated film — 2kg, 60 micron', {
      howMuch: '10 reels', lineId: pacedLine.id, from: 'Sealed Air',
      due: iso(-3), note: 'New perforation plan — the old film drops the bagger', sort: 10,
    }),
    material('Upgraded jaw heater', { howMuch: '1 off', from: 'Ilapak UK', due: iso(-1), sort: 20 }),
    material('Perforated film — 1.25kg', { howMuch: '6 reels', lineId: pacedLine.id, due: iso(4), sort: 30 }),
    material('Changeover kit — 2kg to 1.25kg', { howMuch: '1 set', from: 'Ilapak UK', due: iso(11), sort: 40 }),
    material('Labels — export run', { howMuch: '20 rolls', sort: 50 }),
    material('Trial reel', { howMuch: '2 reels', lineId: pacedLine.id, here: true, inOn: iso(-9), sort: 60 }),
    material('Sealing jaw — spare', { howMuch: '1 off', from: 'Ilapak UK', here: true, sort: 70 }),
  ]);

  /* WHAT THE MACHINE CAN RUN — one of every state and every standing, because
     the grid's three fills, the ring, the list order and the "past its test
     date" banner all read differently and a fixture that is all one thing
     proves none of them. Including the row the model exists to catch: a
     program that SAYS proved and has no date to show for it. */
  const program = (what: string, p: Partial<Program>): Program =>
    ({ id: uid(), projectId: paced.id, what, state: 'needed', sort: 0, createdAt: t, updatedAt: t, ...p });

  await putPrograms([
    program('P-104 perforation — 2kg', {
      runs: 'Finest Red 2kg', lineId: pacedLine.id, state: 'proved', provedOn: iso(-7),
      testId: seal.id, sort: 10,
    }),
    program('P-106 perforation — 2kg', {
      runs: 'Finest Nemo 2kg', state: 'proved', provedOn: iso(-3), sort: 20,
    }),  // proved with no test behind it — signed off by hand
    program('P-121 perforation — 2kg', {
      runs: 'All Rounder 2kg', lineId: pacedLine.id, state: 'onMachine',
      testOn: iso(8), from: 'Ilapak UK', sort: 30,
    }),
    program('P-130 perforation — 2kg', {
      runs: 'Baking Potatoes 2kg', state: 'onMachine', sort: 40,
    }),  // on the machine, nobody has said when
    program('P-141 perforation — 1.25kg', {
      runs: 'Express Piper 1.25kg', state: 'needed', testOn: iso(15), from: 'Ilapak UK', sort: 50,
    }),
    program('P-150 perforation — 2kg', {
      runs: 'Jacks Piper 2kg', state: 'onMachine', testOn: iso(-6), from: 'Ilapak UK', sort: 60,
    }),  // the day came and went
    program('P-160 perforation — 2kg', { state: 'proved', sort: 70 }),
    // ^ the word and nothing behind it: the app must read this as on the machine
  ]);

  /* A LINE STANDARD on the commissioning job — the frame off the walk as its
     picture, people with roles and tasks, and kit — so the map, its people
     list and the products page are all drawn from a real one. */
  const standardId = uid();
  await putStandard({
    id: standardId, projectId: proj.id, product: 'Finest Red 2kg', photoKey: asset.stillKey,
    marks: [
      { id: uid(), kind: 'person', x: 22, y: 40, label: 'Op 1', task: 'Load film, splice at the end of each reel' },
      { id: uid(), kind: 'person', x: 58, y: 62, label: 'Op 2', task: 'Check weigher — sample 5 every 30 minutes' },
      { id: uid(), kind: 'pallet', x: 84, y: 70 },
      { id: uid(), kind: 'bin', x: 40, y: 80 },
    ],
    sort: 1, createdAt: t, updatedAt: t,
  });

  /* LINE TOOLS (LINE_TOOLS.sql) — two products on Line 7 itself: one a map
     with its balance on no job at all, one attached to the commissioning job,
     so the line's page, the job's line standard and the card's balance line
     all draw a real one. */
  const lineBalance = {
    targetPerMin: 60,
    stations: [
      { id: 'lb-bagger', name: 'Bagger', kind: 'machine' as const, unit: 'bags', contains: 1, rate: 70, ratePer: 'min' as const, source: 'plate' as const },
      { id: 'lb-basketer', name: 'Basketer', kind: 'machine' as const, unit: 'baskets', contains: 12, rate: 5, ratePer: 'min' as const, runningPct: 92, source: 'timed' as const },
      { id: 'lb-packer', name: 'Packer', kind: 'people' as const, unit: 'baskets', contains: 1, cycleSec: 15, perCycle: 1, source: 'timed' as const },
    ],
  };
  const lineOnly = uid(), lineOnJob = uid();
  await putStandard({ id: lineOnly, projectId: '', workspaceId: ws.id, product: 'Maris Piper 2kg', photoKey: asset.stillKey,
    marks: [{ id: uid(), kind: 'person', x: 30, y: 45, label: 'Op 1', task: 'Feed the bagger' }], capacity: lineBalance, sort: 2, createdAt: t, updatedAt: t });
  /* The Express standard carries a rate and the planned hours — what the
     changeover's interval reads for its run time and the minutes a day. */
  await putStandard({ id: lineOnJob, projectId: proj.id, workspaceId: ws.id, product: 'Tesco Express 1.25 kg', marks: [],
    capacity: { targetPerMin: 50, plannedHoursPerWeek: 37.5, stations: [] }, sort: 3, createdAt: t, updatedAt: t });

  /* A SMED (lib/ie/changeover, tool 6): Maris Piper 2kg to Tesco Express
     1.25 kg on Line 7, on the commissioning job — eight elements lapped on
     the phone, who did each and where, 42 min, three external (15 min). How
     the line runs: one shift of 8 h less 30 min of breaks — 450 min — five
     days a week, six changeovers a week; the speed the Express standard's
     target, 50 a minute, said as not a plate speed. The five products the
     line runs with their run times, 300 min of the 450-minute day — the
     toolkit's worked example: every product every 1.4 days, 0.9 with the
     external work out. No plan yet — the acceptance script makes one. */
  const changeoverId = uid();
  const coProducts = (): ChangeoverProduct[] => [
    { id: uid(), product: 'Maris Piper 2kg', standardId: lineOnly, demandPerDay: 7200, ratePerMin: 60 },
    { id: uid(), product: 'Tesco Express 1.25 kg', standardId: lineOnJob, demandPerDay: 3000, ratePerMin: 50 },
    { id: uid(), product: 'Finest Red 2kg', runMinPerDay: 50 },
    { id: uid(), product: 'King Edward 2.5kg', runMinPerDay: 40 },
    { id: uid(), product: 'Baby potatoes 1kg', runMinPerDay: 30 },
  ];
  await putStudy({ id: changeoverId, tool: 'changeover', name: 'Maris Piper 2kg → Tesco Express 1.25 kg', product: 'Tesco Express 1.25 kg',
    workspaceId: ws.id, standardId: lineOnJob, projectId: proj.id,
    facts: { fromProduct: 'Maris Piper 2kg', toProduct: 'Tesco Express 1.25 kg', sequence: smedElements(t - 2 * 3_600_000, 'K. Ahmed'), products: coProducts(),
      running: { shiftsPerDay: 1, hoursPerShift: 8, breakMin: 30, daysPerWeek: 5 }, changeovers: { count: 6, per: 'week' }, ratePerMin: 50, rateFrom: 'standard' },
    uses: [], startedAt: t - 2 * 3_600_000, createdAt: t, updatedAt: t });

  /* A WORK BALANCE on the line's Maris Piper map (ui/WorkBalance): three
     people at a 12 s takt — Op 1 timed and over takt, Op 2 timed, Op 3 typed. */
  const lapsOf = (xs: number[]) => xs.map((sec, i) => ({ id: uid(), sec, at: t - (60 - i) * 15_000, who: 'K. Ahmed' }));
  await putStudy({ id: uid(), tool: 'balance', name: 'Maris Piper 2kg', standardId: lineOnly, workspaceId: ws.id,
    agreed: { balance: { taktSec: 12, allowance: 0.1 } },
    facts: { steps: [
      { id: uid(), order: 0, name: 'Feed the bagger', who: 'Op 1', rating: 100, laps: lapsOf([6.1, 5.9, 6.0, 6.2, 5.8, 6.0]) },
      { id: uid(), order: 1, name: 'Clear the jams', who: 'Op 1', rating: 110, laps: lapsOf([5.2, 5.0, 5.4, 5.1, 5.3]) },
      { id: uid(), order: 2, name: 'Fold and tape the case', who: 'Op 2', rating: 100, laps: lapsOf([8.0, 8.2, 7.9, 8.1, 8.0, 7.8]) },
      { id: uid(), order: 3, name: 'Stack the pallet', who: 'Op 3', typedSec: 7 },
    ] }, uses: [], startedAt: t - 3_600_000, createdAt: t, updatedAt: t });

  /* A VALUE STREAM MAP SAVED DOOR TO DOOR before maps became only a line's
     (B1, 11 October): its steps carry one lane — an area — and no scope. It
     must still open, its lanes by where (smoke). */
  const mapId = uid(), H = 3600, DY = 86_400;
  const fs = (order: number, name: string, lane: string, kind: 'operation' | 'move' | 'check' | 'wait' | 'store', o: Record<string, unknown> = {}) => ({ id: uid(), order, name, lane, kind, ...o });
  await putStudy({ id: mapId, tool: 'map', name: 'Order to delivery — Maris Piper 2kg', product: 'Maris Piper 2kg',
    agreed: { map: { supplier: 'the order', customer: 'Tesco', demandPerDay: 9600, availableSecPerDay: 16 * H } },
    facts: { flow: [
      fs(0, 'Order arrives by EDI', 'Order office', 'operation', { value: 'needed', cycleSec: 300, batch: 9600, waitSec: 4 * H, info: 'the system' }),
      fs(1, 'Run planned for the week', 'Planning', 'operation', { value: 'needed', cycleSec: 1800, batch: 48_000, waitSec: 1.5 * DY, info: 'paper', burst: true }),
      fs(2, 'Bag and seal', 'Line 7', 'operation', { value: 'adds', cycleSec: 2, people: 1 }),
      fs(3, 'Pallet waits for the lorry', 'Despatch', 'store', { queue: 19_200 }),
      fs(4, 'Loaded and sent', 'Despatch', 'move', { value: 'needed', cycleSec: 1200 }),
    ] }, uses: [], startedAt: t - 2 * 3_600_000, createdAt: t, updatedAt: t });

  /* A LINE'S MAP, kept large — what is done on Line 7 and who does it: Op 1,
     Op 2, Op 3 (the Maris Piper standard's people), the machine, the team
     leader, and the departments whose work touches the line — planning,
     stores, quality, maintenance (Rowland, 11 October: "different people
     doing different activities on the same line"; "keep the line large,
     different departments can affect the line"). */
  const lineMapId = uid();
  const qaStep = uid(), mapFixId = uid(), mapProofId = uid();
  await putStudy({ id: lineMapId, tool: 'map', name: 'Run released to pallet away — Maris Piper 2kg', product: 'Maris Piper 2kg',
    workspaceId: ws.id, standardId: lineOnly, projectId: proj.id,
    agreed: { map: { scope: 'line', supplier: 'Run released', customer: 'Pallet to despatch', demandPerDay: 9600, availableSecPerDay: 16 * H, pieceCost: 0.8, carryingRatePerYear: 25 } },
    facts: { flow: [
      fs(0, 'Release the run to the line', 'Planning', 'operation', { who: ['Planning'], where: 'Office', value: 'needed', cycleSec: 600, batch: 9600, waitSec: 1 * DY, info: 'paper' }),
      fs(1, 'Issue the film and cases', 'Stores', 'move', { who: ['Stores', 'Forklift driver'], where: 'Stores', value: 'waste', cycleSec: 900, batch: 9600, waitSec: 4 * H }),
      fs(2, 'Load the film reel', 'Op 1', 'operation', { who: ['Op 1'], where: 'Bagger', value: 'needed', cycleSec: 120, batch: 2000 }),
      fs(3, 'Splice the film', 'Op 1', 'operation', { who: ['Op 1'], where: 'Bagger', value: 'needed', cycleSec: 45, batch: 2000 }),
      fs(4, 'Bag and seal', 'Machine', 'operation', { who: ['Machine'], where: 'Bagger', value: 'adds', cycleSec: 1.2 }),
      fs(5, 'First-off check', 'Quality', 'check', { who: ['Quality', 'Team leader'], where: 'Checkweigher', value: 'needed', cycleSec: 300, batch: 9600 }),
      fs(6, 'Check the weight', 'Machine', 'check', { who: ['Machine'], where: 'Checkweigher', value: 'needed', cycleSec: 0.5 }),
      fs(7, 'Clear a jam', 'Op 1', 'operation', { who: ['Op 1', 'Team leader'], where: 'Bagger', value: 'waste', cycleSec: 90, batch: 500, burst: true }),
      fs(8, 'Reset the sealing jaw', 'Maintenance', 'operation', { who: ['Maintenance', 'Op 1'], where: 'Bagger', value: 'waste', cycleSec: 600, batch: 4800, burst: true }),
      fs(9, 'Pack the bags into the case', 'Op 2', 'operation', { who: ['Op 2'], where: 'Case packer', value: 'adds', cycleSec: 8, batch: 6 }),
      fs(10, 'Tape the case', 'Op 2', 'operation', { who: ['Op 2'], where: 'Case packer', value: 'needed', cycleSec: 4, batch: 6 }),
      fs(11, 'Walk to fetch flat cases', 'Op 2', 'move', { who: ['Op 2'], where: 'Stores', value: 'waste', cycleSec: 60, batch: 120 }),
      fs(12, 'Stack the case on the pallet', 'Op 3', 'operation', { who: ['Op 3'], where: 'Palletiser', value: 'needed', cycleSec: 5, batch: 6, waitSec: 25 * 60 }),
      fs(13, 'Sign off the pallet', 'Team leader', 'check', { who: ['Team leader'], where: 'Palletiser', value: 'needed', cycleSec: 60, batch: 720 }),
      { ...fs(14, 'Pallet waits for QA release', 'Quality', 'wait', { who: ['Quality'], where: 'Palletiser', waitSec: 6 * H }), id: qaStep },
      fs(15, 'Pallet to despatch', 'Forklift driver', 'move', { who: ['Forklift driver'], where: 'Despatch', value: 'needed', cycleSec: 180, batch: 720 }),
    ] }, uses: [{ id: uid(), kind: 'fix', ref: mapFixId, role: 'evidence', at: t - 1_800_000, step: qaStep }], startedAt: t - 3_600_000, createdAt: t, updatedAt: t });

  /* WORK SAMPLING (H1): Op 1 and Op 2 on Line 7, a moment every ten minutes
     through the morning, each answered — Op 2 waiting a fifth of the time —
     and one moment come a minute ago, still to answer; three more ahead. */
  const samplingId = uid();
  {
    const HR = 3_600_000;   // H above is the map's, in seconds; moments are instants
    const past = Array.from({ length: 36 }, (_, i) => t - 6 * HR + i * 10 * 60_000);
    const due = t - 60_000, ahead = [t + 15 * 60_000, t + 40 * 60_000, t + 70 * 60_000];
    const deal = (counts: [string, number][]) => counts.flatMap(([a, k]) => Array<string>(k).fill(a));
    const op1 = deal([['working', 28], ['walking', 3], ['waiting', 4], ['away', 1]]);
    const op2 = deal([['working', 22], ['waiting', 7], ['walking', 4], ['searching', 3]]);
    const taps = past.flatMap((at, i) => [
      { id: uid(), at, who: 'Op 1', activity: op1[(i * 7) % 36] ?? 'working', by: 'Sam Patel' },
      { id: uid(), at, who: 'Op 2', activity: op2[(i * 11) % 36] ?? 'working', by: 'Sam Patel' },
    ]);
    await putStudy({ id: samplingId, tool: 'sampling', name: 'Packing hall, day shift', product: 'Maris Piper 2kg',
      workspaceId: ws.id, standardId: lineOnly, projectId: proj.id,
      agreed: { sampling: { who: ['Op 1', 'Op 2'], activities: ['working', 'walking', 'waiting', 'searching', 'away'], marginPts: 5,
        from: t - 6 * HR, to: t + 2 * HR, prompts: [...past, due, ...ahead] } },
      facts: { taps }, uses: [], startedAt: t - 6 * HR, createdAt: t, updatedAt: t });
  }

  /* A RELIABILITY STUDY (tool 13): the flow wrapper watched yesterday and
     today, the watch running again now, a stop struck as a mistap. */
  const reliabilityId = uid();
  {
    const M = 60_000, y0 = t - 26 * 3_600_000, d0 = t - 3 * 3_600_000, r0 = t - 20 * M;
    const stop = uid(), fail = uid();
    const at = (from: number, mins: number[], count: string) => mins.map(m => ({ id: uid(), at: from + m * M, by: 'Sam Patel', count }));
    await putStudy({ id: reliabilityId, tool: 'reliability', name: 'Wrapper stops', machine: 'Ilapak flow wrapper', workspaceId: ws.id,
      agreed: { reliability: { counts: [{ id: stop, name: 'stop', targetMin: 45, downMin: 3 }, { id: fail, name: 'failure', downMin: 12 }] } },
      facts: {
        watch: [{ id: uid(), from: y0, to: y0 + 180 * M, by: 'Sam Patel' }, { id: uid(), from: d0, to: d0 + 120 * M, by: 'Sam Patel' }, { id: uid(), from: r0, by: 'Sam Patel' }],
        events: [
          ...at(y0, [12, 30, 51, 77, 98, 130, 162], stop),
          { id: uid(), at: y0 + 140 * M, by: 'Sam Patel', count: stop, struck: true },
          ...at(y0, [64, 151], fail),
          ...at(d0, [25, 70, 101], stop),
          ...at(d0, [88], fail),
          ...at(r0, [8], stop),
        ],
        remarks: [
          { id: uid(), at: y0 + 100 * M, text: 'Jams all at the infeed — the film splice passing the jaws.', by: 'Sam Patel' },
          { id: uid(), at: d0 + 30 * M, text: 'New reel fitted before the run; watch whether the jams drop.', by: 'Sam Patel' },
        ],
      }, uses: [], startedAt: y0, createdAt: t, updatedAt: t });
  }

  /* A RELIABILITY STUDY with the W5 parts: stops timed and getting better, calls for help, a belt that wears */
  const reliabilityFamilyId = uid();
  {
    const M = 60_000, w0 = t - 30 * 3_600_000;
    const stop = uid(), call = uid(), belt = uid();
    /* twelve stops, further apart as the watch goes on: [minute tapped, minutes to help, minutes to running again, reason] */
    const stops: [number, number | undefined, number, string][] = [
      [5, 1, 4, 'jam'], [9, 2, 5, 'film break'], [15, 1, 3, 'jam'], [23, 1.5, 6, 'sensor'], [34, 1, 3, 'jam'], [49, 3, 8, 'film break'], [70, 1, 4, 'jam'],
      [98, 2, 5, 'jam'], [138, 1, 3, 'sensor'], [190, 6, 12, 'film break'], [250, 1, 3, 'jam'], [320, undefined, 2, 'jam'],
    ];
    /* eleven calls for help — reasons from the team's short list — over the same watch */
    const calls: [number, number, number, string][] = [
      [12, 1, 6, 'film change'], [30, 2, 7, 'film change'], [58, 0.5, 2, 'jam'], [80, 5, 9, 'QA check'], [118, 1.5, 8, 'film change'], [160, 4, 6, 'jam'],
      [205, 11, 14, 'QA check'], [250, 2.5, 6.5, 'label'], [290, 1, 5, 'film change'], [320, 9, 19, 'material short'], [345, 3.5, 8, 'label'],
    ];
    const wearAge = (age: number, failed: boolean) => ({ id: uid(), count: belt, age, failed, at: w0 + 6 * 3_600_000, by: 'Sam Patel' });
    await putStudy({ id: reliabilityFamilyId, tool: 'reliability', name: 'Wrapper — repairs, calls and bedding in', machine: 'Ilapak flow wrapper', workspaceId: ws.id,
      agreed: { reliability: { counts: [
        { id: stop, name: 'stop', targetMin: 30, timed: 'stop', reasons: ['jam', 'film break', 'sensor'], fitterRate: 30, growth: true },
        { id: call, name: 'call', timed: 'call', reasons: ['film change', 'jam', 'QA check', 'label', 'material short'], respondMin: 3 },
        { id: belt, name: 'belt break', wear: { unit: 'hours', swapCost: 20, failCost: 120 } },
      ] } },
      facts: {
        watch: [{ id: uid(), from: w0, to: w0 + 360 * M, by: 'Sam Patel' }],
        events: [
          ...stops.map(([m, help, fix, reason]) => ({ id: uid(), at: w0 + m * M, by: 'Sam Patel', count: stop, ...(help !== undefined ? { arrivedAt: w0 + (m + help) * M } : {}), fixedAt: w0 + (m + fix) * M, reason, ...(help === undefined ? { est: true } : {}) })),
          ...calls.map(([m, help, fix, reason]) => ({ id: uid(), at: w0 + m * M, by: 'Sam Patel', count: call, arrivedAt: w0 + (m + help) * M, fixedAt: w0 + (m + fix) * M, reason })),
        ],
        lives: [...[210, 320, 380, 450, 520, 610, 700].map(a => wearAge(a, true)), wearAge(150, false), wearAge(330, false)],
        remarks: [{ id: uid(), at: w0 + 200 * M, text: 'Film breaks all on the new reel; QA check waits for the technician from line 3.', by: 'Sam Patel' }],
      }, uses: [], startedAt: w0, createdAt: t, updatedAt: t });
  }

  const analysisId = uid();
  /* AN ANALYSIS (W3a, knowledge/specs/FC-105-analysis.md): fill weights before and after a re-calibration, lower is better —
     the figures are the specification's independent case (cases-w3a.py): Welch p 0.0006, the difference −0.50 g. */
  {
    const M = 60_000, w0 = t - 30 * 3_600_000;
    const Bf = [12.4, 12.9, 13.1, 12.2, 12.8, 13.4, 12.6, 12.9, 13.0, 12.5, 13.2, 12.7], Af = [12.1, 12.3, 12.6, 11.9, 12.5, 12.2, 12.4, 12.0, 12.7, 12.3, 12.2, 12.5];
    await putStudy({ id: analysisId, tool: 'analysis', name: 'Fill time before and after the re-calibration', machine: 'Ishida checkweigher', workspaceId: ws.id,
      agreed: { analysis: { kind: 'change', name: 'Fill time', unit: 's', data: 'measured', better: 'lower', confidence: 0.95 } },
      facts: { readings: [...Bf.map((value, i) => ({ id: uid(), value, arm: 'before', at: w0 + i * 5 * M, who: 'Sam Patel' })), ...Af.map((value, i) => ({ id: uid(), value, arm: 'after', at: w0 + (14 + i) * 5 * M, who: 'Sam Patel' }))] },
      uses: [], startedAt: w0, createdAt: t, updatedAt: t });
  }

  /* THE ANALYSIS, PART TWO (W3b, knowledge/specs/FC-107-groups-tables-relations.md): three shifts' give-away, rejects by lane and fault type,
     and seal strength against jaw temperature — quick sessions (no line), the specification's independent cases (cases-w3b.py). */
  const analysisGroupsId = uid(), analysisTableId = uid(), analysisRelateId = uid();
  {
    const M = 60_000, w0 = t - 40 * 3_600_000;
    const shifts: [string, number[]][] = [['A', [1.2, 0.9, 1.4, 1.1, 1.0, 1.3, 0.8, 1.2]], ['B', [1.6, 1.9, 1.4, 1.8, 2.1, 1.5, 1.7, 1.6]], ['C', [1.1, 1.3, 0.9, 1.2, 1.4, 1.0, 1.2, 1.1]]];
    await putStudy({ id: analysisGroupsId, tool: 'analysis', name: 'Give-away by shift', agreed: { analysis: { kind: 'groups', name: 'Give-away', unit: 'g', firstName: 'shift', better: 'lower', confidence: 0.95 } },
      facts: { readings: shifts.flatMap(([arm, vs], k) => vs.map((value, i) => ({ id: uid(), value, arm, at: w0 + (k * 10 + i) * M, who: 'Sam Patel' }))) }, uses: [], startedAt: w0, createdAt: t, updatedAt: t });
    const lanes = ['Lane 1', 'Lane 2', 'Lane 3'], faults = ['Underweight', 'Leaker', 'Misprint'], T = [[18, 7, 5], [9, 14, 4], [6, 5, 12]];
    await putStudy({ id: analysisTableId, tool: 'analysis', name: 'Rejects by lane and fault type', agreed: { analysis: { kind: 'table', name: 'Rejects', firstName: 'Lane', secondName: 'Fault type', rows: lanes, cols: faults, confidence: 0.95 } },
      facts: { readings: T.flatMap((r, i) => r.map((made, j) => ({ id: uid(), arm: lanes[i], col: faults[j], made, at: w0 + (i * 3 + j) * M, who: 'Sam Patel' }))) }, uses: [], startedAt: w0, createdAt: t, updatedAt: t });
    const X = [150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205], Y = [9.1, 10.2, 11.0, 12.4, 12.9, 13.8, 14.6, 15.1, 15.9, 16.2, 16.8, 17.0];
    await putStudy({ id: analysisRelateId, tool: 'analysis', name: 'Seal strength against jaw temperature', agreed: { analysis: { kind: 'relate', name: 'Seal strength', unit: 'N', drivers: [{ name: 'Jaw temperature', unit: '°C' }], confidence: 0.95 } },
      facts: { readings: X.map((x, i) => ({ id: uid(), xs: [x], value: Y[i], at: w0 + i * M, who: 'Sam Patel' })) }, uses: [], startedAt: w0, createdAt: t, updatedAt: t });
  }

  /* A CONTROL CHART (W2, knowledge/specs/FC-086-charts.md): the CUSUM case's forty readings — steady for
     twenty, then 1 g higher — the limits set from the first twenty and kept. */
  const chartId = uid();
  {
    const M = 60_000, w0 = t - 14 * 3_600_000;
    const W = [400.0, 400.2, 399.8, 399.3, 399.6, 399.2, 400.0, 401.1, 399.6, 399.5, 400.4, 400.3, 400.1, 399.3, 400.0, 400.6, 398.9, 399.6, 398.5, 399.0, 399.5, 400.8, 400.0, 401.2, 401.1, 400.9, 399.0, 400.6, 401.0, 401.1, 399.8, 400.6, 400.2, 400.4, 401.8, 400.4, 401.0, 401.7, 400.5, 400.9];
    const st = W.slice(0, 20), mc = st.reduce((a, b) => a + b, 0) / 20, mr = st.slice(1).reduce((a, v, i) => a + Math.abs(v - st[i]), 0) / 19;
    await putStudy({ id: chartId, tool: 'chart', name: 'Fill weight 400 g', machine: 'Ishida checkweigher', workspaceId: ws.id,
      agreed: { chart: { kind: 'xmr', name: 'Fill weight', unit: 'g', target: 400, lower: 396, upper: 404, cusum: { shift: 0.8 }, ewma: true,
        frozen: { from: 1, to: 20, centre: mc, spread: mr, sigma: mr / 1.128, n: 20, at: w0 + 6 * 3_600_000, who: 'Sam Patel' } } },
      facts: { readings: W.map((value, i) => ({ id: uid(), value, at: w0 + i * 20 * M, who: 'Sam Patel', ...(i === 20 ? { note: 'New reel' } : {}) })) },
      uses: [], startedAt: w0, createdAt: t, updatedAt: t });
  }

  /* THE MAP INSIDE A CHANGE (B3): a fix raised from the QA wait on the line's
     map — its words the step's figures — and the line walked again as its
     proof, the wait typed shorter, the rest still carried from before. The
     step on the grid wears the branch; the fix's drawer says before → after. */
  await putTest({ id: mapFixId, projectId: proj.id, kind: 'fix', title: 'Pallet waits for QA release (Palletiser) — 6.0 h wait',
    passesIf: 'Pallet waits for QA release (Palletiser) — 6.0 h wait', outcome: 'planned', sort: 25, createdAt: t, updatedAt: t });
  const walkedAgain = (await getStudy(lineMapId))?.facts.flow ?? [];
  await putStudy({ id: mapProofId, tool: 'map', name: 'Run released to pallet away — Maris Piper 2kg', product: 'Maris Piper 2kg',
    workspaceId: ws.id, standardId: lineOnly, projectId: proj.id,
    agreed: { map: { scope: 'line', supplier: 'Run released', customer: 'Pallet to despatch', demandPerDay: 9600, availableSecPerDay: 16 * H } },
    facts: { flow: walkedAgain.map(x => (x.id === qaStep ? { ...x, waitSec: 1.5 * H, source: 'typed' as const } : { ...x, source: 'carried' as const })) },
    uses: [{ id: uid(), kind: 'fix', ref: mapFixId, role: 'proof', at: t - 600_000 }], startedAt: t - 900_000, createdAt: t, updatedAt: t });

  /* A CAPABILITY STUDY, unfiled: the thirty packs of the worked example —
     mean 401.2 g, all within 400–404, Cpk 0.67 (lib/ie/sample). */
  const thirty = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
    401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
  const studyId = uid();
  await putStudy({ id: studyId, tool: 'capability', name: 'Weight accuracy 400 g', machine: 'Ishida CCW-RV-214W multihead weigher',
    agreed: { readings: { kind: 'limits', unit: 'g', nominal: 400, lower: 400, upper: 404, count: 30, packsPerShift: 10000, shiftsPerWeek: 5, costPerKg: 18 } },
    facts: { readings: thirty.map((value, i) => ({ id: uid(), value, at: t - (30 - i) * 60_000, who: 'K. Ahmed' })) },
    uses: [], startedAt: t - 31 * 60_000, createdAt: t, updatedAt: t });

  /* THE RE-TEST'S PACKS, being checked: a row of ticks proving it, eight of
     its twenty in — Needs you says "12 of 20 readings still to take" under
     the re-test's own row, its day and Ilapak's name (lib/portfolio). */
  await putStudy({ id: uid(), tool: 'capability', name: 'Seal integrity — Finest Red 2kg — re-test', projectId: proj.id, machine: 'Ilapak flow wrapper',
    agreed: { readings: { kind: 'ticks', count: 20, packsPerShift: 10000, materialsPerPack: 0.25, reworkPerPack: 0.12 } },
    facts: { readings: Array.from({ length: 8 }, (_, i) => ({ id: uid(), ok: true, at: t - (20 - i) * 60_000, who: 'Dave' })) },
    uses: [{ id: uid(), kind: 'test', ref: retest.id, role: 'proof', at: t - 1_200_000 }], startedAt: t - 1_300_000, createdAt: t, updatedAt: t });

  /* A LOSS COUNT ON THE STAGE-GATE JOB'S LINE 7 — the twelve stops timed in
     the last twelve hours, in a window typed by hand (the line has no
     shifts), less an hour of breaks typed with it: 660 planned. The rate is
     typed at 60 a minute (a new count here would offer the Packer's timed
     pace, 48 bags a minute — a person, slower than every machine). The
     client report's Evidence appendix carries the waterfall as a table. */
  const lossStageId = uid();
  await putStudy({ id: lossStageId, tool: 'losses', name: `${new Date(t - 12 * 3_600_000).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}–${new Date(t).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}, ${new Date(t - 12 * 3_600_000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`,
    product: 'Maris Piper 2kg', standardId: lineOnly, workspaceId: ws.id, projectId: proj.id,
    facts: { losses: { from: t - 12 * 3_600_000, to: t, breakMin: 60, plannedMin: 660, made: 36_000, rejects: 120, ratePerMin: 60, rateFrom: 'typed' } },
    uses: [], startedAt: t - 60_000, createdAt: t, updatedAt: t });

  /* THE LINE'S OWN PROGRAMS (docs/BLUEPRINT.md, Stage 2) — planned on Line 7
     with no job: a machine of the line's own with its maker, one program
     whose test day has gone and one proved; beside them the stage-gate job's,
     which is on this line. */
  await addMachineToLine(ws.id, 'Checkweigher', 'Ishida');
  await addLineProgram(ws.id, { what: 'CW-3 Maris Piper 2kg', machine: 'Checkweigher', runs: 'Maris Piper 2kg', testOn: iso(-2), from: 'Ishida', note: 'Ishida to send the weights table' });
  const cw1 = await addLineProgram(ws.id, { what: 'CW-1 Finest Red 2kg', machine: 'Checkweigher', runs: 'Finest Red 2kg' });
  if (cw1) await putProgram({ ...cw1, state: 'proved', provedOn: iso(-10) });

  /* A VIDEO STUDY (docs/VIDEO.md): read from footage taken on another device —
     so the footage is not here, and the study says so — its events found by
     movement, most accepted, one corrected, one rejected, two still to review,
     the demand given for takt. Every number is worked out from these. */
  const videoStudyId = await (async () => {
    const { newJob } = await import('../tools/video/job');
    const { READING_VERSION } = await import('../tools/video/record');
    const t = Date.now();
    const zones = [0, 1, 2].map(i => ({ id: `s${i + 1}`, label: `Workstation ${i + 1}`, track: `Operator ${'ABC'[i]}`, x0: i / 3, x1: (i + 1) / 3, y0: 0, y1: 1 }));
    const config = { sampleSec: 0.1, readWidth: 160, zones, sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: READING_VERSION };
    const ev = (zone: string, start: number, end: number, review: 'candidate' | 'accepted' | 'rejected', extra: object = {}) => ({
      id: `seedv-${zone}-${start}`, start, end, category: 'work' as const, zone, track: zones.find(z => z.id === zone)?.track,
      observed: `Movement at ${zones.find(z => z.id === zone)?.label}`, confidence: 0.86, frames: [start, (start + end) / 2, end],
      basis: 'motion' as const, review, pm: 0.05, ...(review !== 'candidate' ? { by: 'Rowland', at: t } : {}), provenance: { provider: 'motion', version: READING_VERSION, key: 'seed' }, ...extra });
    const vevents = [
      ...[1.5, 9.5, 17.5, 25.5].map(s0 => ev('s1', s0, s0 + 4.1, 'accepted')),
      ...[2.5, 10.5, 18.5].map(s0 => ev('s2', s0, s0 + 6.1, 'accepted')), ev('s2', 26.5, 31.5, 'candidate'),
      ...[3.5, 11.5].map(s0 => ev('s3', s0, s0 + 3.0, 'accepted')), ev('s3', 19.5, 22.6, 'accepted', { proposed: { start: 19.5, end: 22.4, category: 'work', zone: 's3' } }),
      ev('s3', 27.5, 30.4, 'candidate'), ev('s1', 6, 6.8, 'rejected', { flags: ['light' as const] }),
    ];
    const id = uid();
    await putStudy({ id, tool: 'balance', name: 'Line 4 — packing, morning', workspaceId: ws.id, uses: [], startedAt: t, createdAt: t, updatedAt: t,
      facts: { vevents, video: {
        media: { id: uid(), blobKey: `video-seed-not-here-${id}`, mime: 'video/webm', capturedAt: t },
        facts: { fileName: 'line4-morning.webm', mime: 'video/webm', bytes: 7_100_000, durationSec: 32, width: 1280, height: 720, fps: 25, orientation: 'landscape' },
        objective: 'Analyse this video for line balance against takt', kind: 'balance', view: 'side-raised' as const,
        /* what the reading found about the footage itself: a steady camera, and a lamp switched on at 6 s — the rejected event (lib/video/assess) */
        quality: { version: 'quality-1', sampleSec: 0.1, windows: 32, shaking: 0, moved: 0, shakeMax: 0.04, shakingSpans: [], lightSpans: [[6, 6.2] as [number, number]], brightness: { mean: 132, min: 128, max: 151 } },
        job: { ...newJob(config, t), state: 'review', key: 'seed', said: '12 pieces of work found at 3 of 3 stations.', updatedAt: t, finishedAt: t },
        demand: { units: 600, unit: 'packs', availableMin: 55, per: 'shift' },
      } } });
    return id;
  })();

  /* A LINE TALK (docs/LINE-TALK.md): one walk of the line talked into the
     phone — four pieces, the first corrected, a photo where it was taken, a
     line typed, the last waiting for signal and one the service could not
     hear; then a report asked for and Line Talk's answer with the document it
     wrote. The recordings were made on another phone, so they are not here. */
  const talkId = await (async () => {
    const t = Date.now() - 40 * 60_000;
    const piece = (n: number, durationS: number) => ({ blobKey: `talk-seed-not-here-${n}`, mime: 'audio/webm', capturedAt: t + n * 60_000, durationS });
    const turns = [
      { id: 'seedt-1', at: t + 60_000, kind: 'said' as const, who: 'Rowland', media: piece(1, 58),
        heard: 'Starting at the bagger, it is running at about sixty a minute, the former looks clean.',
        text: 'Starting at the bagger — running at about 62 a minute, the former looks clean.' },
      { id: 'seedt-2', at: t + 2 * 60_000, kind: 'said' as const, who: 'Rowland', media: piece(2, 60),
        heard: 'The checkweigher is kicking out the odd bag at the infeed, the guide rail looks bent.' },
      { id: 'seedt-3', at: t + 2 * 60_000 + 40_000, kind: 'photo' as const, who: 'Rowland', text: 'the infeed guide rail',
        media: { blobKey: 'talk-seed-not-here-photo', mime: 'image/jpeg', capturedAt: t + 2 * 60_000 + 40_000 } },
      { id: 'seedt-4', at: t + 3 * 60_000, kind: 'typed' as const, who: 'Rowland', text: 'Ask Dave about the spare belt for the case packer.' },
      { id: 'seedt-5', at: t + 4 * 60_000, kind: 'said' as const, who: 'Rowland', media: piece(5, 31), hearing: 'failed' as const,
        why: 'No signal while it was said, so the phone could not write it down. The recording is kept — play it, and type what was said with Correct.' },
      /* written down by a phone that gives its microphone to the hearing: the words, no recording */
      { id: 'seedt-6', at: t + 5 * 60_000, kind: 'said' as const, who: 'Rowland', heard: 'Back at the bagger. The jaws are clean now.' },
      /* ASKED (slice 2): a question typed, Line Talk's answer, and the line-walk report it wrote with the photo — one figure in it flagged to check */
      { id: 'seedt-7', at: t + 6 * 60_000, kind: 'typed' as const, who: 'Rowland', text: 'Write a line-walk report from this, with the photo.' },
      { id: 'seedt-8', at: t + 6 * 60_000 + 30_000, kind: 'reply' as const, who: 'Line Talk', model: 'test-model',
        text: 'Here is the line-walk report: what you saw at the bagger and the checkweigher, with **P1** beside the guide rail. One piece was not written down, so it is not in it.',
        unsure: ['8'],
        doc: { title: 'Line 7 — morning walk', kind: 'line-walk' as const, sections: [
          { heading: 'What was seen', text: 'A walk of Line 7 from the bagger to the case packer.', points: [
            { text: 'The bagger was running at about 62 a minute and the former looked clean.', basis: 'observed' as const, owner: '', due: '' },
            { text: 'The checkweigher is kicking out the odd bag at the infeed; the guide rail looks bent, about 8 mm out.', basis: 'observed' as const, owner: '', due: '' },
          ], photos: [{ photo: 'P1', caption: 'The infeed guide rail, where bags catch' }] },
          { heading: 'What to do next', text: '', points: [
            { text: 'Check the infeed guide rail on the checkweigher before the next shift.', basis: 'interpretation' as const, owner: '', due: '' },
            { text: 'Ask Dave about the spare belt for the case packer.', basis: 'observed' as const, owner: 'Dave', due: '' },
          ], photos: [] },
        ] } },
    ];
    const id = uid();
    await putStudy({ id, tool: 'talk', name: 'Line 7 — morning walk', workspaceId: ws.id, uses: [], startedAt: t, createdAt: t, updatedAt: t + 6 * 60_000 + 30_000, facts: { turns } });
    return id;
  })();

  return {
    videoStudyId,
    talkId,
    wsId: ws.id, snagId, projectId: proj.id, standardId, lineStandardId: lineOnly, lineOnJobId: lineOnJob, lineId: line.id, caseId: kase.id,
    segmentId: seg.id, assetId: asset.id,
    observations: (await listObservations(ws.id)).length,
    snags: (await snagsForWorkspace(ws.id)).length,
    tests: (await listTests(proj.id)).length,
    assets: (await listAssets(proj.id)).length,
    testId: seal.id,
    stepId: airDrop.id,
    fixId: regulator.id,
    machineId: weigher.id,
    pastDay: iso(-7),
    pacedProjectId: paced.id, pacedLineId: pacedLine.id, treeProjectId: tree.id,
    measures: 2, readings: rows.length, materials: 7, programs: 7,
    problemId: misfeeds.id, closedProblemId: gap.id,
    oldCaseId: oldCase.id, line7Id: otherLine.id, mapId, lineMapId, mapFixId, mapProofId, studyId, changeoverId, pacedChangeoverId, samplingId, reliabilityId, reliabilityFamilyId, chartId, analysisId, analysisGroupsId, analysisTableId, analysisRelateId,
    line7WsId: line7Ws.id, lossId, lossActionId, lossProofId, lossStageId,
  };
}
