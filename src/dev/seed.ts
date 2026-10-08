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
  createWorkspace, addObservation, addSegment, addSnagAsset, addSnag, addCase,
  createProject, updateProject, addPaceLine, putPaceTodo,
  putPaceWin, putTreeNode, putAsset, putTest, putTestItem, putBlob,
  putTarget, putReadings, putMaterials, putPrograms, putStandard,
  listObservations, snagsForWorkspace, listTests, listAssets,
} from '../db';
import type { Observation, Case } from '../types';
import type { Segment, SnagAsset, Snag } from '../snag/types';
import type { PaceTodoRow, PaceWinRow, TreeNodeRow } from '../db';
import type { Asset, Test, TestItem } from '../lib/testing';
import type { Measure, Period, Reading, Target } from '../lib/measures';
import { quarters } from '../lib/measures';
import type { Material } from '../lib/materials';
import type { Program } from '../lib/programs';

const uid = () => crypto.randomUUID();

export interface Seeded {
  wsId: string;
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
}

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

  for (let i = 0; i < 3; i++) {
    const s: Snag = {
      id: uid(), workspaceId: ws.id, assetId: asset.id,
      problem: `seeded snag ${i}`, proposedSolution: 'fix it',
      status: i === 0 ? 'open' : 'closed',
      raisedAt: t - i * 86_400_000, xPct: 40, yPct: 50, owner: 'Dave',
      linkedObsIds: [], updatedAt: t,
    };
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
  const perf: Test = {
    id: uid(), projectId: proj.id, title: 'Performance run at the agreed rate', assetId: wrapper.id,
    plannedFor: iso(-1), plannedTo: iso(1), ranOn: iso(-1), withWhom: 'Ilapak UK',
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
  for (const test of [estop, seal, weight, perf, speedRun, changeover, retest]) await putTest(test);

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
  await putStandard({ id: lineOnJob, projectId: proj.id, workspaceId: ws.id, product: 'Tesco Express 1.25 kg', marks: [], sort: 3, createdAt: t, updatedAt: t });

  return {
    wsId: ws.id, projectId: proj.id, standardId, lineStandardId: lineOnly, lineOnJobId: lineOnJob, lineId: line.id, caseId: kase.id,
    segmentId: seg.id, assetId: asset.id,
    observations: (await listObservations(ws.id)).length,
    snags: (await snagsForWorkspace(ws.id)).length,
    tests: (await listTests(proj.id)).length,
    assets: (await listAssets(proj.id)).length,
    testId: seal.id,
    stepId: airDrop.id,
    fixId: regulator.id,
    pastDay: iso(-7),
    pacedProjectId: paced.id, pacedLineId: pacedLine.id, treeProjectId: tree.id,
    measures: 2, readings: rows.length, materials: 7, programs: 7,
    problemId: misfeeds.id, closedProblemId: gap.id,
    oldCaseId: oldCase.id, line7Id: otherLine.id,
  };
}
