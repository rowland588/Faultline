/* THE SNAGS, AS THE SNAGS PAGE AND ITS REPORT SAY THEM — one reading for
 * the page (snag/QuickSnagsScreen) and the snags report of its own
 * (lib/snagsReportPdf), so the screen and the paper cannot disagree.
 *
 * Rowland, 12 October: "Snags need its own report on the snag page ... I have
 * moved some snags, it says moved to jobs — those snags I don't know where
 * they are ... the Snags page needs to be a working page, not just a home for
 * snags and transfers, as it may be the best place to organise all snags
 * rather than have them spread all over."
 *
 * So every snag on every line is read here, however it was taken — on the
 * move (the Snag button), pinned on a frame of the line's walk, or raised
 * from the Pareto board — and each says where it came from. A snag moved to
 * a job is followed there: what it became (a fix, a problem on a stage, an
 * action on the board) and how it stands now, read off the job, so "moved"
 * never means "gone". Nothing is stored here.
 *
 * Simple with detail (CLAUDE.md): where are we (the counts, in words), what
 * is wrong (late first, with whose it is and by how much), what is being done
 * (who, by when). Colour only on the abnormal: late is red; due within the
 * week amber; an open snag wears the snag's own red, in progress indigo,
 * closed the quiet green (snag/types SNAG_STATUS_META). */
import { SNAG_STATUS_META, actionTarget, ageDays, dueInDays, isDueSoon, isOverdue, isQuickSnag, type Snag, type SnagStatus } from '../snag/types';
import { fixTone } from './fixTone';
import { live, type Asset, type Test, type TestItem } from './testing';
import type { PaceTodoRow } from '../db/rows';

/** The house colours: green done, red late or a problem, indigo under way,
 *  amber due soon or waiting, grey nothing yet. */
export type SnagTone = 'g' | 'r' | 'w' | 'a' | 'n';

/** WHAT A MOVED SNAG BECAME, read off its job — a renamed fix or stage reads
 *  right — and how it stands there now. Keyed by the record the snag's
 *  `sent` names (a TestItem, or a board action). */
export interface Became {
  projectId: string;
  /** "a fix — due tomorrow · 14 Oct", "a problem on Bagger — Install — open", "an action on its board — to do". */
  says: string;
  tone: SnagTone;
  /** Still to be done there. */
  open: boolean;
  /** The record to open: a fix or a problem in the job's drawer, or a board action. */
  open_: { kind: 'record'; id: string } | { kind: 'action'; id: string };
}

const FIX_TONE: Record<ReturnType<typeof fixTone>['tone'], SnagTone> = { done: 'g', late: 'r', soon: 'a', ahead: 'w', notRun: 'n' };
const lower = (w: string) => w.charAt(0).toLowerCase() + w.slice(1);

/** Every moved snag's record on one job, what it became and how it stands. */
export function becameOn(projectId: string, tests: Test[], items: TestItem[], assets: Asset[], todos: PaceTodoRow[], today?: string): Map<string, Became> {
  const m = new Map<string, Became>();
  const stageLabel = (t: Test) => `${assets.find(a => a.id === t.assetId)?.name ?? 'the line'} — ${t.title}`;
  for (const i of live(items)) {
    const t = tests.find(x => x.id === i.testId && x.kind !== 'fix');
    const fix = i.becameTestId ? tests.find(x => x.id === i.becameTestId && !x.deletedAt) : undefined;
    const flag = i.critical ? 'critical · ' : i.risk ? 'high risk · ' : '';
    if (fix) {
      const ft = fixTone(fix, today);
      m.set(i.id, { projectId, says: `a fix — ${flag}${lower(ft.when)}`, tone: FIX_TONE[ft.tone], open: fix.outcome !== 'passed', open_: { kind: 'record', id: fix.id } });
    } else {
      const done = i.doneAt != null;
      m.set(i.id, { projectId, says: `a problem on ${t ? stageLabel(t) : 'the job'} — ${flag}${done ? 'sorted' : 'open'}`, tone: done ? 'g' : 'r', open: !done, open_: { kind: 'record', id: i.id } });
    }
  }
  for (const a of todos) {
    const word = a.state === 'done' ? 'done' : a.state === 'waiting' ? 'waiting' : 'to do';
    m.set(a.id, { projectId, says: `an action on its board — ${word}`, tone: a.state === 'done' ? 'g' : a.state === 'waiting' ? 'a' : 'w', open: a.state !== 'done', open_: { kind: 'action', id: a.id } });
  }
  return m;
}

/** Moved to a job: it has gone there, and that record is the live one. */
export const isMoved = (s: Snag): boolean => (s.sent ?? []).length > 0;

/** How a snag was taken, in words — what the paper and the row both say. */
export function fromWords(s: Snag, assetName?: string): string {
  if (s.assetId) return `From the walk — on the ${assetName?.trim() || 'frame it was pinned on'}`;
  if (!isQuickSnag(s)) return `From the board — ${actionTarget(s) || 'the Pareto'}`;
  return `Taken on the move${s.targetAsset?.trim() ? ` — ${s.targetAsset.trim()}` : ''}`;
}

const nice = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** One snag still on its line. */
export interface SnagRow {
  id: string; workspaceId: string; line: string;
  what: string; from: string;
  status: SnagStatus;
  /** "Open · 12 days", "In progress", "Closed 9 Oct". */
  word: string; tone: SnagTone;
  owner?: string;
  /** "3 days late" (red), "due 14 Oct" (amber within the week), "due 30 Oct". */
  due?: string; dueTone?: SnagTone;
  late: boolean;
  update?: string;
  /** Named for a job and not moved there yet. */
  forJob?: string;
  photo?: string;
  raisedAt: number;
}

/** One snag moved to a job, followed there. */
export interface MovedRow {
  id: string; line: string; what: string; from: string;
  job: string; projectId?: string;
  /** What it became and how it stands — or that it is no longer there. */
  says: string; tone: SnagTone; open: boolean;
  became?: Became;
  photo?: string;
  movedAt: number;
}

export interface SnagsReading {
  counts: { open: number; in_progress: number; closed: number; late: number; moved: number; movedOpen: number; lines: number };
  /** Where things stand, in one sentence. */
  says: string;
  /** Still snags, line by line: late first, then open, in progress, closed — newest first in each. */
  lines: { id: string; name: string; rows: SnagRow[] }[];
  /** Moved snags, job by job. */
  moved: { projectId?: string; job: string; rows: MovedRow[] }[];
}

const RANK: Record<SnagStatus, number> = { open: 0, in_progress: 1, closed: 2 };

export function snagRow(s: Snag, line: string, assetName?: string, jobName?: string, ref = Date.now(), still?: string): SnagRow {
  const late = isOverdue(s, ref), d = dueInDays(s, ref);
  const age = ageDays(s.raisedAt, ref);
  const word = s.status === 'closed' ? `Closed${s.closedAt ? ` ${nice(s.closedAt)}` : ''}`
    : `${SNAG_STATUS_META[s.status].label} · ${age === 0 ? 'today' : age === 1 ? '1 day' : `${age} days`}`;
  const tone: SnagTone = s.status === 'closed' ? 'g' : s.status === 'in_progress' ? 'w' : 'r';
  const due = s.status === 'closed' || d == null || s.dueAt == null ? undefined
    : d < 0 ? `${-d} day${d === -1 ? '' : 's'} late` : d === 0 ? 'due today' : `due ${nice(s.dueAt)}`;
  const dueTone: SnagTone | undefined = due == null ? undefined : late ? 'r' : isDueSoon(s, ref) ? 'a' : 'n';
  /* its first picture; a snag pinned on the walk shows the frame it was pinned on */
  const photo = s.media?.find(m => m.kind === 'photo')?.blobKey ?? s.detailPhotoKey ?? still;
  return {
    id: s.id, workspaceId: s.workspaceId, line, what: s.problem?.trim() || 'A picture, no words yet', from: fromWords(s, assetName),
    status: s.status, word, tone, late, raisedAt: s.raisedAt,
    ...(s.owner?.trim() ? { owner: s.owner.trim() } : {}),
    ...(due ? { due, ...(dueTone ? { dueTone } : {}) } : {}),
    ...(s.latestUpdate?.trim() ? { update: s.latestUpdate.trim() } : {}),
    ...(s.projectId && jobName ? { forJob: jobName } : {}),
    ...(photo ? { photo } : {}),
  };
}

export interface SnagsInput {
  snags: Snag[];
  lineName: (wsId: string) => string;
  assetName?: (s: Snag) => string | undefined;
  /** The frame a walk snag was pinned on — its picture when it has none of its own. */
  stillOf?: (s: Snag) => string | undefined;
  jobName: (projectId?: string) => string | undefined;
  became: Map<string, Became>;
  today?: number;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The reading of the snags given — the caller filters; this orders, groups and says. */
export function snagsReading(x: SnagsInput): SnagsReading {
  const ref = x.today ?? Date.now();
  const all = x.snags.filter(s => !s.deletedAt);
  const here = all.filter(s => !isMoved(s)).map(s => snagRow(s, x.lineName(s.workspaceId), x.assetName?.(s), x.jobName(s.projectId), ref, x.stillOf?.(s)));
  const byLine = new Map<string, SnagRow[]>();
  for (const r of here) byLine.set(r.workspaceId, [...(byLine.get(r.workspaceId) ?? []), r]);
  const order = (a: SnagRow, b: SnagRow) => Number(b.late) - Number(a.late) || RANK[a.status] - RANK[b.status] || b.raisedAt - a.raisedAt;
  const lines = [...byLine.entries()].map(([id, rows]) => ({ id, name: rows[0].line, rows: rows.sort(order) }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  const moved: MovedRow[] = all.filter(isMoved).map(s => {
    const last = (s.sent ?? [])[(s.sent ?? []).length - 1];
    const b = (s.sent ?? []).map(t => x.became.get(t.itemId)).filter((v): v is Became => !!v).pop();
    const job = x.jobName(b?.projectId ?? last?.projectId) ?? 'a job';
    const photo = s.media?.find(m => m.kind === 'photo')?.blobKey ?? s.detailPhotoKey;
    return {
      id: s.id, line: x.lineName(s.workspaceId), what: s.problem?.trim() || 'A picture, no words yet', from: fromWords(s, x.assetName?.(s)),
      job, ...(b?.projectId ?? last?.projectId ? { projectId: b?.projectId ?? last?.projectId } : {}),
      says: b ? b.says : x.jobName(last?.projectId) ? 'no longer on the job — deleted there' : 'on a job this device cannot open',
      tone: b ? b.tone : 'n', open: b ? b.open : false, ...(b ? { became: b } : {}), ...(photo ? { photo } : {}),
      movedAt: last?.at ?? s.updatedAt,
    };
  });
  const byJob = new Map<string, MovedRow[]>();
  for (const r of moved) byJob.set(r.projectId ?? '', [...(byJob.get(r.projectId ?? '') ?? []), r]);
  const movedGroups = [...byJob.entries()].map(([pid, rows]) => ({ ...(pid ? { projectId: pid } : {}), job: rows[0].job,
    rows: rows.sort((a, b) => Number(b.open) - Number(a.open) || b.movedAt - a.movedAt) }))
    .sort((a, b) => a.job.localeCompare(b.job));

  const counts = {
    open: here.filter(r => r.status === 'open').length,
    in_progress: here.filter(r => r.status === 'in_progress').length,
    closed: here.filter(r => r.status === 'closed').length,
    late: here.filter(r => r.late).length,
    moved: moved.length,
    movedOpen: moved.filter(r => r.open).length,
    lines: new Set(all.map(s => s.workspaceId)).size,
  };
  const parts: string[] = [];
  if (here.length) parts.push(`${plural(here.length, 'snag')} on ${plural(new Set(here.map(r => r.workspaceId)).size, 'line')} — ${counts.open} open, ${counts.in_progress} in progress, ${counts.closed} closed${counts.late ? `; ${counts.late} late` : ''}`);
  if (moved.length) parts.push(`${plural(moved.length, 'snag')} moved to ${plural(movedGroups.length, 'job')}, ${counts.movedOpen ? `${counts.movedOpen} still open there` : 'every one done there'}`);
  const says = parts.length ? `${parts.join('. ')}.` : 'No snags.';
  return { counts, says, lines, moved: movedGroups };
}
