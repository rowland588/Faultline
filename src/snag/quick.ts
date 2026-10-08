/* QUICK SNAGS — Rowland, 6 October: "Build a quick fire evidence system, snag
 * system — can assign it to line and projects, made for on the move: spot an
 * issue. Make sure you can add multiple snags to the same line. You can then
 * transfer these multiple snags over to a project, transfer them as problems."
 *
 * No new noun. A quick snag IS a line's snag (snag/types `Snag`, table
 * `snags`): open / in progress / closed, whose, by when. What it adds is that
 * it can be taken from any screen (the Snag button in ui/Frame), hold every
 * picture (`media`), name the project it is for (`projectId`), and be SENT to
 * a stage-gate job as a PROBLEM — a TestItem of kind 'found' on one of its
 * stages. From there it is the job's own: it shows on the Fixes page under
 * "Problems with no fix" (lib/noted) and prints on the client report. The
 * snag keeps `sent` so the Snags page can say where it went. */
import type { Snag } from './types';
import type { MediaPin } from '../types';
import { nextFrom, type Test, type TestItem } from '../lib/testing';
import { deletePaceTodo, listAllSnags, listAssets, listTests, putPaceTodo, putTest, putTestItem, updateSnag, type PaceTodoRow, type Restore } from '../db';
import { dueToInput } from './types';
import { uid } from '../lib/ids';
import { withPins } from '../ui/Evidence';

/** A snag taken from the Snag button — not pinned on a frame of the walk, and
 *  not an action raised from the Pareto board (those carry where the board
 *  pointed). A quick snag always writes `media`, even empty, which is what
 *  tells it apart from a board action that pointed at a machine only. */
export const isQuickSnag = (s: Snag): boolean =>
  !s.assetId && s.xPct == null
  && (Array.isArray(s.media) || (!s.targetCategory && !s.targetSubcategory && !s.caseId));

/* The last line and project used — one less tap for the next snag. A
   per-device convenience, so localStorage, and never relied on. */
const KEY = { line: 'faultline.quicksnag.line', project: 'faultline.quicksnag.project' } as const;
export function recall(which: keyof typeof KEY): string {
  try { return localStorage.getItem(KEY[which]) ?? ''; } catch { return ''; }
}
export function remember(which: keyof typeof KEY, v: string): void {
  try { if (v) localStorage.setItem(KEY[which], v); else localStorage.removeItem(KEY[which]); } catch { /* private window */ }
}

/** How a snag goes to a stage-gate job: the stage it was found on (none is
 *  an answer), flagged or not, and with its fix booked or not.
 *  Rowland, 8 October: "snags attached to a project show nowhere on the
 *  reports … maybe we need project but then turn to a fix — and for any fix
 *  have a critical or high risk." */
export interface SendHow { flag?: 'critical' | 'risk'; fix?: boolean }

const wordsOf = (s: Snag): string =>
  s.problem.trim() || (s.targetAsset ? `Snag on the ${s.targetAsset} — see the picture` : 'Snag — see the picture');

/** IT HAS MOVED. Rowland, 8 October: "does it move from a snag and go to the
 *  fix page, to keep things clean and transitional?" Once on the job, the
 *  job's record is the live one; the snag is closed with where it went — the
 *  walk's "Raise a fix here" always did this — so no list or count of open
 *  snags carries it twice, and `sent` is the door to what it became. */
const moved = (s: Snag, projectId: string, itemId: string, at: number, said: string): Snag => ({
  ...s, projectId, status: 'closed', closedAt: s.closedAt ?? at, closeNote: said,
  sent: [...(s.sent ?? []), { projectId, itemId, at }],
});

/** SEND SNAGS TO A STAGE-GATE JOB — one problem per snag, carrying the snag's
 *  words and the same pictures (the same blob keys: nothing is copied), and
 *  the flag when one was given. On a stage when one was named; with `fix`
 *  each books its fix, as "Make it a fix" does (lib/testing nextFrom) — the
 *  snag's words as "The problem", whose it is, the day it was wanted by. With
 *  no stage it is always a fix (planned on its own, for nothing — its problem
 *  carried on the fix, as a fix flagged on its own does: ui/RecordEdit). Each
 *  snag then moves (above). Hands back how to take it all back. */
export async function sendSnags(snags: Snag[], projectId: string, testId: string | undefined, how: SendHow = {}, jobName = 'the job'): Promise<Restore> {
  const at = Date.now();
  const made: TestItem[] = [];
  const fixes: Test[] = [];
  const [tests, assets] = await Promise.all([listTests(projectId), listAssets(projectId)]);
  const stage = testId ? tests.find(t => t.id === testId && !t.deletedAt) : undefined;
  const asFix = !stage || !!how.fix;
  for (const [k, s] of snags.entries()) {
    const words = wordsOf(s);
    const was = s.status === 'closed';
    const common = {
      ...(s.owner ? { withWhom: s.owner } : {}),
      ...(s.dueAt != null ? { plannedFor: dueToInput(s.dueAt) } : {}),
      sort: at + k,
    };
    const machine = s.targetAsset ? assets.find(a => !a.deletedAt && a.name.trim().toLowerCase() === s.targetAsset?.trim().toLowerCase()) : undefined;
    const fix: Test | undefined = stage
      ? (asFix && !was ? { ...nextFrom(stage, uid, at + k, words, 'fix', words), ...common } : undefined)
      : {
        id: uid(), projectId, kind: 'fix', title: words, passesIf: words, outcome: was ? 'passed' : 'planned',
        ...(was && s.closedAt ? { ranOn: dueToInput(s.closedAt) } : {}),
        ...(machine ? { assetId: machine.id } : {}), ...common, createdAt: at + k, updatedAt: at + k,
      };
    if (fix) { await putTest(fix); fixes.push(fix); }
    const item: TestItem = {
      id: uid(), projectId, testId: stage?.id ?? (fix as Test).id, kind: 'found', what: words,
      ...(s.media?.length ? { media: s.media } : {}),
      ...(s.owner ? { owner: s.owner } : {}),
      ...(was ? { doneAt: s.closedAt ?? at } : {}),
      ...(how.flag === 'critical' ? { critical: true } : how.flag === 'risk' ? { risk: true } : {}),
      ...(fix ? { becameTestId: fix.id } : {}),
      sort: at + k, createdAt: at + k, updatedAt: at + k,
    };
    await putTestItem(item);
    await updateSnag(moved(s, projectId, item.id, at, `Moved to ${jobName} — ${fix ? 'now a fix there' : 'now a problem there'}`));
    made.push(item);
  }
  /* Undone as a soft delete of the problems, never deleteTestItem: that
     deletes the item's pictures, and they are the snag's pictures too. */
  return async () => {
    for (const i of made) await putTestItem({ ...i, deletedAt: Date.now() });
    for (const f of fixes) await putTest({ ...f, deletedAt: Date.now() });
    for (const s of snags) await updateSnag(s);
  };
}

/** MOVE SNAGS TO A 6M OR LEVER-TREE JOB — that job's own work is its actions
 *  (lib/actions: a next step, on its board, in its meeting and its report),
 *  so each snag becomes one: its words, its pictures (the same blob keys),
 *  whose it is, the day it is wanted by, its latest word as the write-up.
 *  Then it moves (above). Hands back how to take it all back. */
export async function moveSnagsToActions(snags: Snag[], projectId: string, jobName = 'the job'): Promise<Restore> {
  const at = Date.now();
  const made: PaceTodoRow[] = [];
  for (const [k, s] of snags.entries()) {
    const was = s.status === 'closed';
    const todo: PaceTodoRow = {
      id: uid(), projectId, what: wordsOf(s), where: s.targetAsset ?? '', why: '', who: s.owner ?? '', when: '',
      state: was ? 'done' : 'todo',
      ...(s.dueAt != null ? { due: dueToInput(s.dueAt) } : {}),
      ...(s.latestUpdate ? { notes: s.latestUpdate } : {}),
      ...(s.media?.length ? { media: s.media } : {}),
      createdAt: at + k, updatedAt: at + k,
    };
    await putPaceTodo(todo);
    await updateSnag(moved(s, projectId, todo.id, at, `Moved to ${jobName} — now an action there`));
    made.push(todo);
  }
  /* The pictures are the snag's too: the action lets go of them before it
     goes, or deleting it would delete them (db deletePaceTodo). */
  return async () => {
    for (const t of made) { await putPaceTodo({ ...t, media: [] }); await deletePaceTodo(t.id); }
    for (const s of snags) await updateSnag(s);
  };
}

/** A KEPT SNAG'S PICTURE, MARKED (ui/Evidence) — the marks written onto that
 *  picture of the snag as it is now, at once, from the Snags page or the
 *  snag's own sheet: closing the sheet without Save must not lose them. A
 *  picture not kept yet goes with the snag's Save, marks and all. Once sent,
 *  the problem holds its own copy of the picture's marks (sendSnags). */
export async function pinSnag(snagId: string, mediaId: string, pins: MediaPin[]): Promise<void> {
  const s = (await listAllSnags()).find(x => x.id === snagId);
  if (s?.media?.some(m => m.id === mediaId)) await updateSnag({ ...s, media: withPins(s.media, mediaId, pins) });
}
