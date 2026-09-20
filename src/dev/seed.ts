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
  putTarget, putReadings,
  listObservations, snagsForWorkspace, listTests, listAssets,
} from '../db';
import type { Observation, Case } from '../types';
import type { Segment, SnagAsset, Snag } from '../snag/types';
import type { PaceTodoRow, PaceWinRow, TreeNodeRow } from '../db';
import type { Asset, Test, TestItem } from '../lib/testing';
import type { Measure, Period, Reading, Target } from '../lib/measures';
import { quarters } from '../lib/measures';

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

  const wrapper: Asset = {
    id: uid(), projectId: proj.id, name: 'Ilapak flow wrapper', oem: 'Ilapak UK',
    state: 'running', sort: 10, updatedAt: t,
  };
  const weigher: Asset = {
    id: uid(), projectId: proj.id, name: 'Ishida checkweigher', oem: 'Ishida Europe',
    state: 'running', sort: 20, updatedAt: t,
  };

  /* A file the OEM sent, bytes and all, so the screen renders a real row and a
     broken read path shows up here rather than on a phone on a factory floor. */
  const docKey = `doc-${uid()}`;
  await putBlob(docKey, new Blob(['%PDF-1.4 seeded FAT report'], { type: 'application/pdf' }));

  await putAsset(wrapper);
  await putAsset(weigher);

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
  for (const test of [estop, seal, weight, changeover, retest]) await putTest(test);

  const item = (testId: string, kind: TestItem['kind'], what: string, extra: Partial<TestItem> = {}): TestItem =>
    ({ id: uid(), projectId: proj.id, testId, kind, what, sort: 1, createdAt: t, updatedAt: t, ...extra });

  const jaw = item(seal.id, 'next', 'Ilapak to fit the upgraded jaw heater',
    { owner: 'Ilapak UK', due: iso(3), becameTestId: retest.id, sort: 1 });

  for (const i of [
    item(seal.id, 'found', 'Seal jaw temperature drifting', { owner: 'Ilapak UK', note: 'Drops 8°C over 20 minutes, then the seals fail', sort: 1 }),
    item(seal.id, 'found', 'Film tracking off to the left after a splice', { owner: 'Ilapak UK', sort: 2 }),
    item(seal.id, 'found', 'No guard on the infeed shelf', { owner: 'us', doneAt: t - 1 * day, sort: 3 }),
    jaw,
    item(seal.id, 'next', 'Re-track the film and re-splice', { owner: 'Dave', due: iso(1), sort: 2 }),
    item(changeover.id, 'found', 'Nobody on site could find the changeover parts', { owner: 'us', sort: 1 }),
    item(changeover.id, 'next', 'Ilapak to send a changeover kit list', { owner: 'Ilapak UK', due: iso(4), sort: 1 }),
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

  const pacedLine = await addPaceLine({
    projectId: paced.id, key: '2A', name: 'Line 2A', variant: 'measured independently',
    owner: 'Rob Scott', sponsor: 'Tanya', sort: 0,
  });
  const otherLine = await addPaceLine({
    projectId: paced.id, key: '7', name: 'Line 7', owner: 'Lee Carty', sponsor: 'Tanya', sort: 1,
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

  return {
    wsId: ws.id, projectId: proj.id, lineId: line.id, caseId: kase.id,
    segmentId: seg.id, assetId: asset.id,
    observations: (await listObservations(ws.id)).length,
    snags: (await snagsForWorkspace(ws.id)).length,
    tests: (await listTests(proj.id)).length,
    assets: (await listAssets(proj.id)).length,
    testId: seal.id,
    pacedProjectId: paced.id, pacedLineId: pacedLine.id,
    measures: 2, readings: rows.length,
  };
}
