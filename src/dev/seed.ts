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
  ensureProjects, createProject, updateProject, addPaceLine, putPaceTodo,
  putPaceWin, putTreeNode, putCommissionItem,
  listObservations, snagsForWorkspace, listCommissionItems,
} from '../db';
import type { Observation, Case } from '../types';
import type { Segment, SnagAsset, Snag } from '../snag/types';
import type { PaceTodoRow, PaceWinRow, TreeNodeRow } from '../db';
import type { CommissionItem } from '../lib/commissioning';

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
  commission: number;
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

  await ensureProjects({ name: 'Smoke test project', color: '#2b87d4' });
  const proj = await createProject('Line 2 commissioning', '#2b87d4', 'Rowland', 'r@example.com', 'commissioning');
  await updateProject({ ...proj, workspaceIds: [ws.id] });

  // NOTE: the field is `key`, not `lineKey`. Getting this wrong makes React
  // render the chart cells with key={undefined}, which is a "missing key"
  // warning that looks like an app bug and is not one.
  const line = await addPaceLine({
    projectId: proj.id, workspaceId: ws.id, key: 'L7', name: 'Line 7',
    variant: 'A', q1: 60, q2: 65, q3: 70, q4: 75, weekly: [], sort: 0,
  });
  await addPaceLine({
    projectId: proj.id, workspaceId: ws.id, key: 'L8', name: 'Line 8',
    variant: 'B', q1: 50, q2: 55, q3: 60, q4: 65, weekly: [], sort: 1,
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

  /* A handover part-way through, so the smoke test exercises every state the
     readiness answer can be in: a program proven, one short of rate, one with no
     program written at all, material short, a failed check and an open A defect. */
  const items: CommissionItem[] = [
    { id: uid(), projectId: proj.id, asset: 'Brillopack bagger', kind: 'program',
      title: '250g tray', agreedRate: 75, rateUnit: 'ppm', written: true,
      runs: [{ id: uid(), at: t - 86_400_000, by: 'Rowland + OEM', achieved: 76, minutes: 30, wastePct: 1.2 }],
      sort: 0, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, asset: 'Brillopack bagger', kind: 'program',
      title: '500g tray', agreedRate: 60, rateUnit: 'ppm', written: true,
      runs: [{ id: uid(), at: t - 43_200_000, by: 'Rowland', achieved: 51, minutes: 20 }],
      sort: 1, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, asset: 'Ishida multihead', kind: 'program',
      title: '1kg bag', agreedRate: 45, rateUnit: 'ppm', written: false,
      sort: 2, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, asset: 'Brillopack bagger', kind: 'material',
      title: '980mm film', need: 40, have: 10, onOrder: 20, unit: 'rolls',
      due: '2026-09-24', sort: 3, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, kind: 'material',
      title: 'Outer cases', need: 500, have: 500, unit: 'cases', sort: 4, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, asset: 'Brillopack bagger', kind: 'check',
      title: 'Emergency stops', criterion: 'every E-stop halts the line inside 2 s',
      outcome: 'pass', witnessedBy: 'Dave', at: t - 172_800_000, sort: 5, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, asset: 'Ishida multihead', kind: 'check',
      title: 'Metal detection', criterion: 'rejects 2.0mm Fe at full rate',
      result: 'missed one in ten at rate', outcome: 'fail', witnessedBy: 'Dave',
      at: t - 86_400_000, sort: 6, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, asset: 'Brillopack bagger', kind: 'punch',
      title: 'Former roller misaligned', severity: 'A', raisedAt: t - 259_200_000,
      fixBy: 'OEM', sort: 7, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, asset: 'Ishida multihead', kind: 'punch',
      title: 'Guard rattles above 40 ppm', severity: 'C', raisedAt: t - 86_400_000,
      fixBy: 'us', sort: 8, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, kind: 'task',
      title: 'Operators trained on changeover', state: 'doing', owner: 'Dave',
      sort: 9, createdAt: t, updatedAt: t },
  ];
  for (const i of items) await putCommissionItem(i);

  return {
    wsId: ws.id, projectId: proj.id, lineId: line.id, caseId: kase.id,
    segmentId: seg.id, assetId: asset.id,
    observations: (await listObservations(ws.id)).length,
    snags: (await snagsForWorkspace(ws.id)).length,
    commission: (await listCommissionItems(proj.id)).length,
  };
}
