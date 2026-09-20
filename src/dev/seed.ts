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
  putPaceWin, putTreeNode, putCommissionItems,
  putCommissionAsset, putCommissionPack, putBlob,
  listObservations, snagsForWorkspace, listCommissionItems, listCommissionAssets,
} from '../db';
import type { Observation, Case } from '../types';
import type { Segment, SnagAsset, Snag } from '../snag/types';
import type { PaceTodoRow, PaceWinRow, TreeNodeRow } from '../db';
import type { Asset, CommissionItem, Pack } from '../lib/commissioning';

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
  /** The machines on the commissioning job, and the packs they must run. */
  assets: number;
  packs: number;
  /** The id of the first machine, so the smoke test can open its own screen. */
  commissionAssetId: string;
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

  /* A COMMISSIONING JOB PART-WAY THROUGH, with the programme behind it.
     FAT and install are signed, mechanical completion is where we are and it is
     eleven days late, and everything after it has moved with that — which is
     the whole shape the screen exists to show. Dates are relative to today, so
     the seed never quietly becomes a job that finished last year. */
  const day = 86_400_000;
  const iso = (offset: number) => new Date(t + offset * day).toISOString().slice(0, 10);

  /* THE COMMISSIONING JOB, SHAPED LIKE THE REAL ONE.
   *
   * Two machines on site, a film changeover part-delivered, a program nobody has
   * written, and results got on the spec that is being withdrawn. That last one
   * is the whole reason this fixture exists in TypeScript: the stale rule is
   * derived from pointers between rows, and a fixture that got those pointers
   * wrong would make the app look broken when it was reporting correctly. */
  await updateProject({ ...proj, plannedAt: iso(19), expectedAt: iso(27), updatedAt: t });

  const wrapper: Asset = {
    id: uid(), projectId: proj.id, name: 'Ilapak flow wrapper', oem: 'Ilapak UK',
    state: 'running', arrivedAt: iso(-30), installedAt: iso(-26), sort: 10, updatedAt: t,
  };
  const checkweigher: Asset = {
    id: uid(), projectId: proj.id, name: 'Ishida checkweigher', oem: 'Ishida Europe',
    state: 'running', arrivedAt: iso(-30), installedAt: iso(-25), sort: 20, updatedAt: t,
  };

  /* A document the OEM sent, bytes and all, so the asset screen renders a real
     row rather than an empty state — and so a broken read path shows up here
     rather than on somebody's phone on a factory floor. */
  const docKey = `doc-${uid()}`;
  await putBlob(docKey, new Blob(['%PDF-1.4 seeded FAT report'], { type: 'application/pdf' }));
  wrapper.docs = [{
    id: uid(), name: 'FAT report — Ilapak, Aug 2026', blobKey: docKey,
    mime: 'application/pdf', bytes: 2_411_008, savedAt: t - 30 * day,
  }];

  await putCommissionAsset(wrapper);
  await putCommissionAsset(checkweigher);

  const packs: Pack[] = [
    { id: uid(), projectId: proj.id, name: '200g pack', sort: 10, updatedAt: t },
    { id: uid(), projectId: proj.id, name: '400g pack', sort: 20, updatedAt: t },
    { id: uid(), projectId: proj.id, name: '1kg catering', sort: 30, updatedAt: t },
  ];
  for (const p of packs) await putCommissionPack(p);

  /* The two film rows first, because the results below point AT them: the new
     spec carries `supersedes`, and every run got on the old one is stale the
     moment that pointer exists. */
  const oldFilm: CommissionItem = {
    id: uid(), projectId: proj.id, assetId: wrapper.id, kind: 'material',
    title: 'Film', spec: '40\u00b5 old spec', need: 40, have: 40, unit: 'rolls',
    sort: 30, createdAt: t, updatedAt: t,
  };
  const newFilm: CommissionItem = {
    id: uid(), projectId: proj.id, assetId: wrapper.id, kind: 'material',
    title: 'Film', spec: '35\u00b5 modified', need: 40, have: 10, onOrder: 30, unit: 'rolls',
    supersedes: oldFilm.id, due: iso(12), grade: 'A',
    sort: 31, createdAt: t, updatedAt: t,
  };

  const items: CommissionItem[] = [
    oldFilm, newFilm,
    /* 200g and 400g ran fine — on the film that is going away. Both come back as
       needing a re-run, which is the app doing the remembering. */
    { id: uid(), projectId: proj.id, assetId: wrapper.id, packId: packs[0].id, kind: 'program',
      title: '200g pack', agreedRate: 80, rateUnit: 'ppm', written: true,
      runs: [{ id: uid(), at: t - 6 * day, by: 'Rowland + OEM', achieved: 82, minutes: 30, wastePct: 1.2, provenOn: oldFilm.id }],
      sort: 0, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, assetId: wrapper.id, packId: packs[1].id, kind: 'program',
      title: '400g pack', agreedRate: 65, rateUnit: 'ppm', written: true,
      runs: [{ id: uid(), at: t - 2 * day, by: 'Rowland', achieved: 58, minutes: 30, provenOn: oldFilm.id }],
      sort: 1, createdAt: t, updatedAt: t },
    /* Nobody has written this one at all — a different conversation, with a
       different person, from one that exists and has not been run. */
    { id: uid(), projectId: proj.id, assetId: wrapper.id, packId: packs[2].id, kind: 'program',
      title: '1kg catering', agreedRate: 45, rateUnit: 'ppm', written: false, grade: 'A',
      owner: 'Ilapak UK', sort: 2, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, assetId: checkweigher.id, packId: packs[2].id, kind: 'program',
      title: '1kg catering', agreedRate: 45, rateUnit: 'ppm', written: false, grade: 'A',
      owner: 'Ishida Europe', sort: 3, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, assetId: checkweigher.id, packId: packs[1].id, kind: 'program',
      title: '400g pack', agreedRate: 65, rateUnit: 'ppm', written: true,
      runs: [{ id: uid(), at: t - 4 * day, by: 'Rowland', achieved: 66, minutes: 30 }],
      sort: 4, createdAt: t, updatedAt: t },

    /* An e-stop test names no material on purpose: film makes no difference to
       it, so a changeover must not invalidate the safety tests. */
    { id: uid(), projectId: proj.id, assetId: wrapper.id, kind: 'check',
      title: 'Emergency stops', criterion: 'every e-stop halts the machine inside 2 s',
      result: '1.4 s', outcome: 'pass', witnessedBy: 'Dave', at: t - 9 * day,
      sort: 5, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, assetId: wrapper.id, kind: 'check',
      title: 'Seal integrity — 400g', criterion: '0 leaks in 20',
      result: '3 leaked', outcome: 'fail', witnessedBy: 'Priya Shah', at: t - 2 * day,
      provenOn: oldFilm.id, grade: 'B', owner: 'Ilapak UK', due: iso(6),
      sort: 6, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, assetId: checkweigher.id, kind: 'check',
      title: 'Weight accuracy — 400g', criterion: '\u00b11.5 g over 200 packs',
      result: '\u00b10.9 g', outcome: 'pass', witnessedBy: 'Rowland', at: t - 4 * day,
      sort: 7, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, assetId: checkweigher.id, kind: 'check',
      title: 'Metal detection', criterion: 'rejects 2.0mm Fe at full rate',
      outcome: 'notRun', due: iso(9), sort: 8, createdAt: t, updatedAt: t },

    { id: uid(), projectId: proj.id, assetId: wrapper.id, kind: 'punch',
      title: 'Former roller misaligned', severity: 'A', raisedAt: t - 5 * day,
      fixBy: 'Ilapak UK', sort: 9, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, assetId: checkweigher.id, kind: 'punch',
      title: 'Guard rattles above 40 ppm', severity: 'C', raisedAt: t - 1 * day,
      fixBy: 'us', sort: 10, createdAt: t, updatedAt: t },

    /* The line itself, not a machine on it: hygiene clearance and the paperwork
       hold up a handover exactly as hard as a broken guard does. */
    { id: uid(), projectId: proj.id, kind: 'check',
      title: 'Hygiene clearance before first product', criterion: 'swabs clear after a full clean-down',
      outcome: 'notRun', owner: 'Technical', due: iso(16), grade: 'A',
      sort: 11, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, kind: 'material',
      title: 'Outer cases', need: 500, have: 500, unit: 'cases', sort: 12, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, kind: 'task',
      title: 'Operators trained on changeover', state: 'doing', owner: 'Dave',
      due: iso(-2), sort: 13, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, kind: 'task',
      title: 'Spares list agreed', state: 'todo', owner: 'Engineering',
      due: iso(24), sort: 14, createdAt: t, updatedAt: t },
    { id: uid(), projectId: proj.id, kind: 'task',
      title: 'CE/UKCA file received', state: 'done', owner: 'Ilapak UK',
      sort: 15, createdAt: t, updatedAt: t },
  ];
  await putCommissionItems(items);

  return {
    wsId: ws.id, projectId: proj.id, lineId: line.id, caseId: kase.id,
    segmentId: seg.id, assetId: asset.id,
    observations: (await listObservations(ws.id)).length,
    snags: (await snagsForWorkspace(ws.id)).length,
    commission: (await listCommissionItems(proj.id)).length,
    assets: (await listCommissionAssets(proj.id)).length,
    packs: packs.length,
    commissionAssetId: wrapper.id,
  };
}
