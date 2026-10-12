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
import { isOverdue as fixOverdue, isSettled, live, testOfFix, type Asset, type Test, type TestItem } from './testing';
import { notedProblems } from './noted';
import { fixFlag } from './critical';
import { niceDay } from './weeks';
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

/* ============================ PRIORITY — RAG ============================
 * Rowland, 12 October: "add a RAG status for the problems — critical red,
 * high amber, low green — to show in order of priorities." Every problem
 * has one of three: on a line, its own (Snag.priority); on a job, its
 * problem's Critical or High risk (lib/critical) — a fix takes its
 * problem's; anything not set is Low. Said in words beside the colour,
 * always, and every list is in this order. */
export type Priority = 'critical' | 'high' | 'low';
export const PRIORITY_WORD: Record<Priority, string> = { critical: 'Critical', high: 'High', low: 'Low' };
export const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, low: 2 };
export const priorityOf = (x: { priority?: Priority } | { flag?: 'critical' | 'risk' }): Priority =>
  'priority' in x && x.priority ? x.priority : 'flag' in x && x.flag ? (x.flag === 'critical' ? 'critical' : 'high') : 'low';

/** One snag still on its line. */
export interface SnagRow {
  id: string; workspaceId: string; line: string;
  what: string; from: string;
  status: SnagStatus;
  priority: Priority;
  /** "Open · 12 days", "In progress", "Closed 9 Oct". */
  word: string; tone: SnagTone;
  owner?: string;
  /** "3 days late" (red), "due 14 Oct" (amber within the week), "due 30 Oct". */
  due?: string; dueTone?: SnagTone;
  late: boolean;
  update?: string;
  /** Named for a job and not moved there yet. */
  forJob?: string;
  /** What we are going to do (Snag.proposedSolution). */
  plan?: string;
  /** The machine it is on — the walk's frame, else the one named. */
  machine?: string;
  /** Its journey, oldest first: on a day, what was done and what came of it. */
  journey: { id: string; day: string; did: string; result?: string }[];
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
  counts: {
    open: number; in_progress: number; closed: number; late: number; moved: number; movedOpen: number; lines: number;
    /** On the jobs: problems open (no fix yet), fixes to do, of them late, and done (fixed or sorted). */
    problems: number; fixes: number; jobLate: number; jobDone: number; jobs: number;
    critical: number; high: number; low: number;
  };
  /** Where things stand, in one sentence. */
  says: string;
  /** Still snags, line by line: late first, then open, in progress, closed — newest first in each. */
  lines: { id: string; name: string; rows: SnagRow[] }[];
  /** Each job's problems and fixes, job by job (jobGroup) — a moved snag is among them as what it became. */
  jobs: JobGroup[];
  /** A moved snag whose record is no longer on its job, or is on a job this device cannot open. */
  moved: { projectId?: string; job: string; rows: MovedRow[] }[];
}

const RANK: Record<SnagStatus, number> = { open: 0, in_progress: 1, closed: 2 };

export function snagRow(s: Snag, line: string, assetName?: string, jobName?: string, ref = Date.now(), still?: string): SnagRow {
  const late = isOverdue(s, ref), d = dueInDays(s, ref);
  const age = ageDays(s.raisedAt, ref);
  const word = s.status === 'closed' ? `Closed${s.closedAt ? ` ${nice(s.closedAt)}` : ''}`
    : `${SNAG_STATUS_META[s.status].label} · ${age === 0 ? 'today' : age === 1 ? '1 day' : `${age} days`}`;
  /* where it stands, in its colour; how serious it is is the priority's, and late is the due's — an open one is not red for being open (12 October) */
  const tone: SnagTone = s.status === 'closed' ? 'g' : s.status === 'in_progress' ? 'w' : 'n';
  const due = s.status === 'closed' || d == null || s.dueAt == null ? undefined
    : d < 0 ? `${-d} day${d === -1 ? '' : 's'} late` : d === 0 ? 'due today' : `due ${nice(s.dueAt)}`;
  const dueTone: SnagTone | undefined = due == null ? undefined : late ? 'r' : isDueSoon(s, ref) ? 'a' : 'n';
  /* its first picture; a snag pinned on the walk shows the frame it was pinned on */
  const photo = s.media?.find(m => m.kind === 'photo')?.blobKey ?? s.detailPhotoKey ?? still;
  return {
    id: s.id, workspaceId: s.workspaceId, line, what: s.problem?.trim() || 'A picture, no words yet', from: fromWords(s, assetName),
    status: s.status, priority: s.priority ?? 'low', word, tone, late, raisedAt: s.raisedAt,
    ...(s.owner?.trim() ? { owner: s.owner.trim() } : {}),
    ...(due ? { due, ...(dueTone ? { dueTone } : {}) } : {}),
    ...(s.latestUpdate?.trim() ? { update: s.latestUpdate.trim() } : {}),
    ...(s.projectId && jobName ? { forJob: jobName } : {}),
    ...(photo ? { photo } : {}),
    ...(s.proposedSolution?.trim() ? { plan: s.proposedSolution.trim() } : {}),
    ...((assetName ?? s.targetAsset)?.trim() ? { machine: (assetName ?? s.targetAsset ?? '').trim() } : {}),
    journey: [...(s.journey ?? [])].filter(j => j.did?.trim()).sort((a, b) => a.at - b.at)
      .map(j => ({ id: j.id, day: nice(j.at), did: j.did.trim(), ...(j.result?.trim() ? { result: j.result.trim() } : {}) })),
  };
}

/* ============ A JOB'S PROBLEMS AND FIXES, ON SNAGS & FIXES =============
 * Rowland, 12 October: "Ensure no confusion between snags, fixes, problems —
 * I think one location for all, and we manage it through its own page." The
 * three are one path, said once on the page and on paper: a SNAG is spotted
 * on a line; once it is on a job it is a PROBLEM; a FIX is what puts it
 * right. So beside the snags, each job's problems with no fix (lib/noted
 * notedProblems) and its fixes (a Test of kind 'fix', its colour and words
 * from lib/fixTone) — each row saying which it is, and, when it started as a
 * snag, which one. A moved snag is shown once: as the problem or fix it
 * became. */
export type JobRowKind = 'problem' | 'fix' | 'action';
export interface JobRow {
  kind: JobRowKind; id: string; projectId: string;
  what: string;
  /** "Bagger — Install", "Bagger · for Seal integrity", "The line · not from a test". */
  where: string;
  who?: string;
  /** "Open", "Sorted 9 Oct", "Due tomorrow · 13 Oct", "Late · was 4 Oct", "Fixed · 8 Oct". */
  word: string; tone: SnagTone;
  open: boolean; late: boolean;
  flag?: 'critical' | 'risk';
  priority: Priority;
  /** A fix shown under the problem it puts right: the fix's own words. */
  fixWhat?: string;
  /** It started as a snag: "a snag on Line 7". */
  fromSnag?: string;
  photo?: string;
  at: number;
}
export interface JobGroup {
  projectId: string; job: string; rows: JobRow[];
  problemsOpen: number; fixesToDo: number; late: number; done: number;
}
const FIX_TONE_SNAG: Record<ReturnType<typeof fixTone>['tone'], SnagTone> = { done: 'g', late: 'r', soon: 'a', ahead: 'w', notRun: 'n' };

/** One job's problems with no fix and its fixes, open first — late, critical,
 *  the rest — then what is done; each saying whether it came from a snag. */
export function jobGroup(x: { projectId: string; job: string; tests: Test[]; items: TestItem[]; assets: Asset[]; snags: Snag[]; lineName: (wsId: string) => string; today?: string;
  /** A 6M or lever-tree job's board actions — those that came from snags are its rows (it has no fixes). */
  todos?: PaceTodoRow[] }): JobGroup {
  const tests = live(x.tests), items = live(x.items), assets = live(x.assets);
  /* which records started as snags: the problem a snag became, and the fix booked from it */
  const fromItem = new Map<string, Snag>();
  for (const s of x.snags) for (const t of s.sent ?? []) if (t.projectId === x.projectId) fromItem.set(t.itemId, s);
  const fromFix = new Map<string, Snag>();
  for (const i of items) { const sn = fromItem.get(i.id); if (sn && i.becameTestId) fromFix.set(i.becameTestId, sn); }
  const snagWords = (sn?: Snag) => (sn ? `a snag on ${x.lineName(sn.workspaceId)}` : undefined);
  const photoOf = (m?: { kind: string; blobKey: string }[]) => m?.find(v => v.kind === 'photo')?.blobKey;
  const noted = notedProblems(tests, items, assets);
  const problems: JobRow[] = [...noted.open, ...noted.sorted].map(n => {
    const open = n.item.doneAt == null, crit = !!n.item.critical;
    const sn = fromItem.get(n.item.id);
    return {
      kind: 'problem' as const, id: n.item.id, projectId: x.projectId, what: n.item.what.trim() || 'A problem', where: n.where,
      ...(n.item.owner?.trim() ? { who: n.item.owner.trim() } : {}),
      word: open ? (crit ? 'Open — critical' : 'Open') : `Sorted ${niceDay(new Date(n.item.doneAt as number).toISOString().slice(0, 10))}`,
      tone: open ? (crit ? 'r' : 'a') : 'g', open, late: false,
      ...(crit ? { flag: 'critical' as const } : n.item.risk ? { flag: 'risk' as const } : {}),
      priority: crit ? 'critical' as const : n.item.risk ? 'high' as const : 'low' as const,
      ...(sn ? { fromSnag: snagWords(sn) } : {}), ...(photoOf(n.item.media) ? { photo: photoOf(n.item.media) } : {}),
      at: n.item.createdAt,
    };
  });
  const fixes: JobRow[] = tests.filter(t => t.kind === 'fix').map(t => {
    const ft = fixTone(t, x.today), machine = assets.find(a => a.id === t.assetId)?.name ?? 'The line', from = testOfFix(t, tests);
    const f = fixFlag(t.id, items);
    const sn = fromFix.get(t.id);
    const photo = photoOf(f.problem?.media);
    return {
      /* the problem first, the fix that puts it right under it — when there is one */
      kind: 'fix' as const, id: t.id, projectId: x.projectId, what: f.problem?.what.trim() || t.title.trim() || 'A problem',
      ...(f.problem?.what.trim() && t.title.trim() && t.title.trim() !== f.problem.what.trim() ? { fixWhat: t.title.trim() } : {}),
      where: `${machine} · ${from ? `for ${from.title}` : 'not from a test'}`, priority: priorityOf(f),
      ...(t.withWhom?.trim() ? { who: t.withWhom.trim() } : {}),
      word: ft.when, tone: FIX_TONE_SNAG[ft.tone], open: !isSettled(t), late: !isSettled(t) && fixOverdue(t, x.today),
      ...(f.flag ? { flag: f.flag } : {}), ...(sn ? { fromSnag: snagWords(sn) } : {}), ...(photo ? { photo } : {}),
      at: t.createdAt,
    };
  });
  /* a snag moved to a 6M or lever-tree job is an action on its board */
  const today = x.today ?? new Date().toISOString().slice(0, 10);
  const actions: JobRow[] = (x.todos ?? []).filter(a => fromItem.has(a.id)).map(a => {
    const sn = fromItem.get(a.id) as Snag, done = a.state === 'done', late = !done && !!a.due && a.due < today;
    return {
      kind: 'action' as const, id: a.id, projectId: x.projectId, what: a.what.trim() || 'An action', where: a.where?.trim() ? `${a.where.trim()} · on its board` : 'On its board',
      ...(a.who?.trim() ? { who: a.who.trim() } : {}),
      word: done ? 'Done' : late ? `Late · was ${niceDay(a.due)}` : a.state === 'waiting' ? 'Waiting' : a.due ? `By ${niceDay(a.due)}` : 'To do',
      tone: done ? 'g' : late ? 'r' : a.state === 'waiting' ? 'a' : 'w', open: !done, late,
      priority: sn.priority ?? 'low',
      fromSnag: snagWords(sn), ...(photoOf(a.media) ? { photo: photoOf(a.media) } : {}), at: a.createdAt,
    };
  });
  /* open first, in order of priority — late first within each — then done */
  const rank = (r: JobRow) => (!r.open ? 9 : PRIORITY_RANK[r.priority] * 2 + (r.late ? 0 : 1));
  const rows = [...problems, ...fixes, ...actions].sort((a, b) => rank(a) - rank(b) || b.at - a.at);
  return {
    projectId: x.projectId, job: x.job, rows,
    problemsOpen: problems.filter(r => r.open).length, fixesToDo: fixes.filter(r => r.open).length + actions.filter(r => r.open).length,
    late: rows.filter(r => r.late).length, done: rows.filter(r => !r.open).length,
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
  /** Each job's problems and fixes (jobGroup), when the page reads the jobs too. */
  jobs?: JobGroup[];
  /** The register (Rowland, 12 October: "write any problem ... and assign it
   *  to where it's going"): every problem is a row, assigned or not — none is
   *  "moved" away. */
  register?: boolean;
  today?: number;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The reading of the snags given — the caller filters; this orders, groups and says. */
export function snagsReading(x: SnagsInput): SnagsReading {
  const ref = x.today ?? Date.now();
  const all = x.snags.filter(s => !s.deletedAt);
  const here = all.filter(s => x.register || !isMoved(s)).map(s => snagRow(s, x.lineName(s.workspaceId), x.assetName?.(s), x.jobName(s.projectId), ref, x.stillOf?.(s)));
  const byLine = new Map<string, SnagRow[]>();
  for (const r of here) byLine.set(r.workspaceId, [...(byLine.get(r.workspaceId) ?? []), r]);
  /* still open first, in order of priority — late first within each — then closed */
  const order = (a: SnagRow, b: SnagRow) => Number(a.status === 'closed') - Number(b.status === 'closed') || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
    || Number(b.late) - Number(a.late) || RANK[a.status] - RANK[b.status] || b.raisedAt - a.raisedAt;
  const lines = [...byLine.entries()].map(([id, rows]) => ({ id, name: rows[0].line, rows: rows.sort(order) }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  /* A moved snag is shown once — as the problem or fix it became, under its
     job. Only one whose record is gone, or on a job this device cannot open,
     is listed on its own, saying so. */
  const moved: MovedRow[] = (x.register ? [] : all).filter(isMoved).filter(s => !(s.sent ?? []).some(t => x.became.has(t.itemId))).map(s => {
    const last = (s.sent ?? [])[(s.sent ?? []).length - 1];
    const job = x.jobName(last?.projectId) ?? 'a job';
    const photo = s.media?.find(m => m.kind === 'photo')?.blobKey ?? s.detailPhotoKey;
    return {
      id: s.id, line: x.lineName(s.workspaceId), what: s.problem?.trim() || 'A picture, no words yet', from: fromWords(s, x.assetName?.(s)),
      job, ...(last?.projectId ? { projectId: last.projectId } : {}),
      says: x.jobName(last?.projectId) ? 'no longer on the job — deleted there' : 'on a job this device cannot open',
      tone: 'n' as SnagTone, open: false, ...(photo ? { photo } : {}),
      movedAt: last?.at ?? s.updatedAt,
    };
  });
  const byJob = new Map<string, MovedRow[]>();
  for (const r of moved) byJob.set(r.projectId ?? '', [...(byJob.get(r.projectId ?? '') ?? []), r]);
  const movedGroups = [...byJob.entries()].map(([pid, rows]) => ({ ...(pid ? { projectId: pid } : {}), job: rows[0].job,
    rows: rows.sort((a, b) => b.movedAt - a.movedAt) }))
    .sort((a, b) => a.job.localeCompare(b.job));
  const jobs = (x.jobs ?? []).filter(g => g.rows.length).sort((a, b) => b.late - a.late || a.job.localeCompare(b.job));

  const counts = {
    open: here.filter(r => r.status === 'open').length,
    in_progress: here.filter(r => r.status === 'in_progress').length,
    closed: here.filter(r => r.status === 'closed').length,
    late: here.filter(r => r.late).length,
    moved: all.filter(isMoved).length,
    movedOpen: jobs.reduce((n, g) => n + g.rows.filter(r => r.fromSnag && r.open).length, 0),
    lines: new Set(all.map(s => s.workspaceId)).size,
    problems: jobs.reduce((n, g) => n + g.problemsOpen, 0),
    fixes: jobs.reduce((n, g) => n + g.fixesToDo, 0),
    jobLate: jobs.reduce((n, g) => n + g.late, 0),
    jobDone: jobs.reduce((n, g) => n + g.done, 0),
    jobs: jobs.filter(g => g.problemsOpen + g.fixesToDo > 0).length,
    /** Every open problem — on a line or on a job — by its priority. */
    critical: 0, high: 0, low: 0,
  };
  for (const p of [...here.filter(r => r.status !== 'closed').map(r => r.priority), ...jobs.flatMap(g => g.rows.filter(r => r.open).map(r => r.priority))]) counts[p]++;
  /* ONE NOUN, PROBLEM (Rowland, 12 October: "we won't have snags and fixes,
     just problems"): how many are open and how urgent, then where they are. */
  const openN = counts.critical + counts.high + counts.low, late = counts.late + counts.jobLate;
  const lineOpen = counts.open + counts.in_progress;
  const parts: string[] = [];
  if (openN) {
    parts.push(`${plural(openN, 'problem')} open — ${counts.critical} critical, ${counts.high} high, ${counts.low} low${late ? `; ${late} late` : ''}`);
    /* in the register a line's problem stays on its line, assigned to a project or not — never "not on a job yet" */
    const where = [lineOpen ? `${lineOpen} on ${plural(new Set(here.filter(r => r.status !== 'closed').map(r => r.workspaceId)).size, 'line')}${x.register ? '' : ', not on a job yet'}` : '',
      counts.problems + counts.fixes ? `${counts.problems + counts.fixes} on ${plural(counts.jobs, x.register ? 'project' : 'job')}${counts.fixes ? `, ${counts.fixes} being fixed` : ''}` : ''].filter(Boolean);
    if (where.length) parts.push(where.join('; '));
  } else if (counts.closed + counts.jobDone) parts.push(`no problem open — ${counts.closed + counts.jobDone} done`);
  if (moved.length) parts.push(`${plural(moved.length, 'problem')} moved to a job and no longer there`);
  const says = parts.length ? `${parts.map((p, i) => (i ? p.charAt(0).toUpperCase() + p.slice(1) : p.charAt(0).toUpperCase() + p.slice(1))).join('. ')}.` : 'No problems.';
  return { counts, says, lines, jobs, moved: movedGroups };
}
