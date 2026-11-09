/* THE TASK-LED APPLICATION (10 November; docs/AI-TASK.md). Rowland: "The user should not have to navigate Faultline to find the
 * functionality they need … They should simply tell Faultline what they are doing, what they have observed, what they want to
 * investigate, or what they want to achieve. Faultline should understand the task and use the appropriate capabilities of the
 * existing application to help them complete it." And: "I think we're losing too much production time on this line. Can you help
 * me understand why? — They should not need to know where to start."
 *
 *   understand_task   read   the task in the person's words, on its line: what Faultline already holds that bears on it (each tool's
 *                            own finding, the stops of the last four weeks, the open problems and what they cost, the 6M work), what
 *                            is old and what is missing — and the ONE next step, with why, in the order the method takes it. Never a
 *                            menu of tools to choose from.
 *   keep_task         local  the task kept on the conversation's current subject: its goal, its line, its steps in order and when it
 *                            began — so it carries on across turns, is parked and taken up again like any subject.
 *   task_state        read   where the task stands now, read from the real records: each step known · old · missing, what each
 *                            found in its tool's own words, which were done since the task began, and the next step.
 *
 * Every figure is the tool's own (its sentence); nothing is worked out here but counts and days. Nothing is written but the
 * conversation's own subject. */
import { getWorkspace, listCases, listObservations, listStandardsForLine, listStudiesForLine, listAllSnags, patchStudy } from '../db';
import type { Observation, Workspace } from '../types';
import type { ToolStudy } from '../lib/study';
import type { Standard } from '../tools/linestandard/standard';
import { inCapacityTool, inMapTool } from '../tools/linestandard/standard';
import { TOOLS, stopsOf, toolSaysOf, usesOfTool } from '../screens/ProductionLineScreen';
import { lineProblems, lineProblemsSaid } from '../lib/lineWork';
import { toolByKey } from '../catalogue/registry';
import { checkObject, ID } from './check';
import { anyone } from './access';
import { conversation } from './draftStore';
import { STOPS_TOOL, activitiesFor, type Activity } from './appModel';
import type { CapCtx, CapRef, CapResult, Capability, ColleagueTask, ColleagueThread } from './types';
import { lineRef, notFound, plural } from './util';

const DAY = 86_400_000;
/** A finding older than this is said to be old — the line may have moved on (four weeks, the window the stops are read over). */
export const STALE_DAYS = 28;

/* ------------------------------------------------------------------ the route a task takes */

/** One step of a task's route: the tool, and what it would tell the person about THIS task. */
export interface RouteStep { key: string; why: string }

/** SIXM — a problem worked to its root on the fishbone (the 6M tool's door; its records are the line's 6M problems). */
export const SIXM = { key: 'sixm', label: '6M — the root cause', href: (lineId: string) => `/lines/${lineId}?view=tools` };

/** Each kind of task, its tools in the order the work takes them, each with why — the method, not a menu. A kind not here takes its
 *  activity's own tools in order, each with what the tool is for. */
export const ROUTES: Record<string, RouteStep[]> = {
  losttime: [
    { key: 'stops', why: 'where the line’s time goes — every stop timed with its machine and reason, ranked by minutes and priced' },
    { key: 'losses', why: 'where a whole shift’s planned time went — breakdowns, changeovers, slow running, short stops and rejects, in packs and pounds' },
    { key: 'linebalance', why: 'which machine holds the line — so the minutes that cost output are the constraint’s, not every stop alike' },
    { key: 'reliability', why: 'once one machine stands out, how often it fails and how long it takes to get it running again' },
    { key: 'sixm', why: 'the biggest loss worked to its root cause, with countermeasures and proof on the same number' },
  ],
  downtime: [
    { key: 'stops', why: 'every stop timed with its machine and reason, ranked by minutes and priced' },
    { key: 'losses', why: 'what the stops cost a shift against everything else that took its time' },
    { key: 'reliability', why: 'the machine that stops most, watched for failures and repair times' },
    { key: 'sixm', why: 'the worst stop worked to its root cause' },
  ],
  output: [
    { key: 'linebalance', why: 'what the line can make and which station holds it' },
    { key: 'losses', why: 'where a shift’s time went between what it could make and what it made' },
    { key: 'stops', why: 'the stops at the constraint, timed and ranked' },
    { key: 'linework', why: 'the people’s work against takt where a person is the constraint' },
    { key: 'sixm', why: 'the biggest loss at the constraint worked to its root' },
  ],
  quality: [
    { key: 'capability', why: 'whether the process can stay inside its limits, and how sure that is' },
    { key: 'chart', why: 'whether it is steady or drifting over time' },
    { key: 'analysis', why: 'what changed it, or whether a fix made a difference' },
    { key: 'sixm', why: 'the cause of the rejects worked to its root' },
  ],
  changeover: [
    { key: 'changeover', why: 'the changeover timed element by element, internal and external, against what it costs' },
    { key: 'sixm', why: 'what keeps the longest element long, worked to its root' },
  ],
  people: [
    { key: 'linework', why: 'each person’s work timed against takt — who is overloaded and who waits' },
    { key: 'sampling', why: 'what people are doing at random moments, with its margin' },
    { key: 'linestandard', why: 'who stands where, and what they are' },
  ],
  observe: [
    { key: 'talk', why: 'the walk talked through and written up as you go' },
    { key: 'stops', why: 'what stops the line and for how long' },
    { key: 'sampling', why: 'what people are doing at random moments' },
  ],
};

/** A step's name and its page on the line. */
function stepTool(key: string, lineId: string): { label: string; href: string } {
  if (key === STOPS_TOOL.key) return { label: STOPS_TOOL.label, href: STOPS_TOOL.href(lineId) };
  if (key === SIXM.key) return { label: SIXM.label, href: SIXM.href(lineId) };
  const t = toolByKey(key);
  return { label: t?.label ?? key, href: t?.to ?? `/lines/${lineId}` };
}

/** The route for a task: its kind's own, else its activity's tools in order. */
export function routeFor(act: Activity | undefined): RouteStep[] {
  if (!act) return ROUTES.losttime;
  return ROUTES[act.id] ?? act.tools.map(k => ({ key: k, why: k === STOPS_TOOL.key ? STOPS_TOOL.says : toolByKey(k)?.says ?? '' }));
}

/** A kept task's route: its steps in order, each with its kind's why (else the tool's own purpose). */
export const routeOfTask = (task: Pick<ColleagueTask, 'kind' | 'steps'>): RouteStep[] =>
  task.steps.map(k => ROUTES[task.kind ?? '']?.find(r => r.key === k) ?? { key: k, why: k === STOPS_TOOL.key ? STOPS_TOOL.says : toolByKey(k)?.says ?? '' });

/* ------------------------------------------------------------------ what the line holds, step by step */

export type StepStatus = 'known' | 'old' | 'missing';
export interface TaskStep {
  key: string; label: string; why: string; href: string;
  status: StepStatus;
  /** What it found, in its tool's own words. */
  finding?: string;
  /** Days since the newest record (or stop). */
  days?: number;
  /** Records of it on the line. */
  n: number;
  /** A record of it made or changed since the task began. */
  sinceTask?: boolean;
}
export interface LineEvidence { line: Workspace; steps: TaskStep[]; problems: string; openProblems: number }

const daysSince = (now: number, t: number) => Math.max(0, Math.floor((now - t) / DAY));
const statusOf = (n: number, days: number | undefined): StepStatus => (!n ? 'missing' : days !== undefined && days > STALE_DAYS ? 'old' : 'known');

/** What the line holds for each step of a route — read from the real records, each finding in its tool's own sentence. */
export async function evidenceFor(lineId: string, route: readonly RouteStep[], now: number, since?: number): Promise<LineEvidence | undefined> {
  const line = await getWorkspace(lineId);
  if (!line) return undefined;
  const [standards, studies, obs, cases, snags] = await Promise.all([
    listStandardsForLine(line.id), listStudiesForLine(line.id), listObservations(line.id), listCases(line.id), listAllSnags(),
  ]);
  const live = studies.filter(s => !s.deletedAt);
  const probs = lineProblems(snags, { id: line.id, name: line.name });
  const steps = route.map(r => stepOn(r, { line, standards, studies: live, obs, cases }, now, since));
  return { line, steps, problems: lineProblemsSaid(probs).map(p => p.text).join(''), openProblems: probs.rows.length };
}

function stepOn(r: RouteStep, d: { line: Workspace; standards: Standard[]; studies: ToolStudy[]; obs: Observation[]; cases: { title: string; status: string; openedAt: number; closedAt?: number }[] }, now: number, since?: number): TaskStep {
  const { label, href } = stepTool(r.key, d.line.id);
  const base = { key: r.key, label, why: r.why, href };
  if (r.key === STOPS_TOOL.key) {
    const st = stopsOf(d.obs);
    const newest = d.obs.reduce((m, o) => Math.max(m, o.startedAt), 0);
    const days = newest ? daysSince(now, newest) : undefined;
    /* stops older than the four weeks read are on the line, but say nothing now */
    const n = d.obs.length;
    return { ...base, n, ...(days !== undefined ? { days } : {}), status: !n ? 'missing' : st.n ? 'known' : 'old',
      ...(st.says ? { finding: `the last four weeks: ${st.says}` } : n ? { finding: `${plural(n, 'stop')} timed, none in the last four weeks` } : {}),
      ...(since !== undefined && newest >= since ? { sinceTask: true } : {}) };
  }
  if (r.key === SIXM.key) {
    const open = d.cases.filter(c => c.status !== 'closed');
    const newest = d.cases.reduce((m, c) => Math.max(m, c.closedAt ?? c.openedAt), 0);
    const days = newest ? daysSince(now, newest) : undefined;
    return { ...base, n: d.cases.length, ...(days !== undefined ? { days } : {}), status: statusOf(d.cases.length, open.length ? 0 : days),
      ...(d.cases.length ? { finding: open.length ? `${plural(open.length, '6M problem')} open: ${open.slice(0, 3).map(c => `“${c.title}”`).join(', ')}` : `${plural(d.cases.length, '6M problem')}, all closed` } : {}),
      ...(since !== undefined && newest >= since ? { sinceTask: true } : {}) };
  }
  const t = TOOLS.find(x => x.key === r.key);
  if (!t) return { ...base, n: 0, status: 'missing' };
  const said = toolSaysOf(t, { standards: d.standards, studies: d.studies, obs: d.obs, line: d.line, wsId: d.line.id });
  const recs: { updatedAt: number }[] = t.standard
    ? d.standards.filter(r.key === 'linebalance' ? inCapacityTool : inMapTool)
    : t.study ? usesOfTool(t.study, d.studies) : [];
  const newest = recs.reduce((m, x) => Math.max(m, x.updatedAt), 0);
  const days = newest ? daysSince(now, newest) : undefined;
  return { ...base, n: said.n, ...(days !== undefined ? { days } : {}), status: statusOf(said.n, days), ...(said.says ? { finding: said.says } : {}),
    ...(since !== undefined && newest >= since ? { sinceTask: true } : {}) };
}

/** THE NEXT STEP — the first in the route whose evidence is missing or old; when every step is known, the last (working the biggest
 *  loss to its root), else nothing. */
export function nextStep(steps: readonly TaskStep[]): TaskStep | undefined {
  return steps.find(s => s.status !== 'known') ?? steps.find(s => s.key === SIXM.key) ?? steps[steps.length - 1];
}

const STATUS_WORD: Record<StepStatus, string> = { known: 'known', old: 'old', missing: 'not done' };
const ago = (d?: number) => (d === undefined ? '' : d === 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`);

/** The evidence and the next step said as a colleague would: what is known (in each tool's words), what is old, what is missing,
 *  then the next step and why. */
export function evidenceSays(ev: LineEvidence, next: TaskStep | undefined): string {
  const known = ev.steps.filter(s => s.status === 'known');
  const old = ev.steps.filter(s => s.status === 'old');
  const missing = ev.steps.filter(s => s.status === 'missing');
  return [
    `${ev.line.name}: ${ev.problems || 'no open problems'}.`,
    known.length ? `Known: ${known.map(s => `${s.label} — ${s.finding ?? 'recorded'}${s.days !== undefined ? ` (${ago(s.days)})` : ''}`).join('; ')}.` : 'Nothing on the line bears on this yet.',
    old.length ? `Old (more than ${STALE_DAYS} days): ${old.map(s => `${s.label}${s.days !== undefined ? `, ${ago(s.days)}` : ''}`).join('; ')}.` : '',
    missing.length ? `Not done on this line: ${missing.map(s => s.label).join(', ')}.` : '',
    next ? `Next: ${next.label} — ${next.why}.${next.status === 'old' ? ' What is there is old, so do it again.' : ''}` : '',
  ].filter(Boolean).join(' ');
}

const stepsData = (steps: readonly TaskStep[]) => steps.map(s => ({ key: s.key, label: s.label, status: STATUS_WORD[s.status], why: s.why, ...(s.finding ? { finding: s.finding } : {}), ...(s.days !== undefined ? { days: s.days } : {}), records: s.n, ...(s.sinceTask ? { sinceTask: true } : {}), page: s.href }));

/* ------------------------------------------------------------------ the conversation's subject */

const threadsOf = (s: Pick<ToolStudy, 'facts'>): ColleagueThread[] => {
  const t = (s.facts as { threads?: unknown }).threads;
  return Array.isArray(t) ? t as ColleagueThread[] : [];
};
async function currentThread(ctx: CapCtx): Promise<{ s?: ToolStudy; cur?: ColleagueThread }> {
  if (!ctx.conversationId) return {};
  const c = await conversation(ctx);
  if (!c.ok) return {};
  return { s: c.s, cur: threadsOf(c.s).find(t => t.status === 'current') };
}

/* ================================================================== understand_task */
interface UnderstandIn { words: string; lineId?: string; machine?: string }
export const understandTask: Capability = {
  name: 'understand_task', title: 'Understand the task', kind: 'read',
  validate: raw => checkObject(raw, { words: { kind: 'string', label: 'what the person is doing or wants', required: true, max: 400 }, lineId: ID('the line'), machine: { kind: 'string', label: 'the machine', max: 120 } }),
  allowed: anyone,
  async run(ctx, input: UnderstandIn): Promise<CapResult> {
    const { cur } = await currentThread(ctx);
    const lineId = input.lineId ?? cur?.scope.lineId;
    const act = activitiesFor(input.words)[0];
    const route = routeFor(act);
    if (!lineId) {
      return { ok: true, says: `This reads as ${(act?.word ?? 'lost production time').toLowerCase()}. It is worked on a line — ask which one (resolve their words for it), then run understand_task again.`, data: { task: act?.id ?? 'losttime', missing: ['line'], route: route.map(r => ({ key: r.key, why: r.why })) }, refs: [] };
    }
    const ev = await evidenceFor(lineId, route, ctx.now);
    if (!ev) return notFound('line');
    const next = nextStep(ev.steps);
    const refs: CapRef[] = [lineRef(ev.line)];
    return {
      ok: true,
      says: `${act ? `This reads as ${act.word.toLowerCase()}.` : 'This reads as lost production time.'} ${evidenceSays(ev, next)} Recommend the next step in a sentence with its reason — never a list of tools to choose from — and on their yes keep the task (keep_task) and start it.`,
      data: { task: act?.id ?? 'losttime', line: { id: ev.line.id, name: ev.line.name }, openProblems: ev.openProblems, steps: stepsData(ev.steps), ...(next ? { next: { key: next.key, label: next.label, why: next.why, page: next.href } } : {}) },
      refs,
      ...(next ? { show: { kind: 'line' as const, id: ev.line.id, label: ev.line.name, href: next.key === STOPS_TOOL.key || next.key === SIXM.key ? next.href : `/lines/${ev.line.id}` } } : {}),
    };
  },
};

/* ================================================================== keep_task */
interface KeepIn { goal: string; lineId?: string; task?: string; steps?: string[] }
export const keepTask: Capability = {
  name: 'keep_task', title: 'Keep the task', kind: 'local',
  validate: raw => checkObject(raw, {
    goal: { kind: 'string', label: 'the task, in their words', required: true, max: 300 }, lineId: ID('the line'),
    task: { kind: 'string', label: 'the kind of task', max: 40 }, steps: { kind: 'strings', label: 'the steps', max: 8 },
  }),
  allowed: anyone,
  async run(ctx, input: KeepIn): Promise<CapResult> {
    if (!ctx.conversationId) return { ok: false, why: 'A task is kept on a conversation — there is none here.' };
    const c = await conversation(ctx);
    if (!c.ok) return { ok: false, why: c.why };
    const threads = threadsOf(c.s);
    const cur = threads.find(t => t.status === 'current');
    const lineId = input.lineId ?? cur?.scope.lineId;
    const act = activitiesFor(input.goal)[0];
    const kind = input.task && ROUTES[input.task] ? input.task : act?.id ?? 'losttime';
    const route = ROUTES[kind] ?? routeFor(act);
    const keys = (input.steps?.length ? input.steps.filter(k => route.some(r => r.key === k) || toolByKey(k) || k === STOPS_TOOL.key || k === SIXM.key) : route.map(r => r.key)).slice(0, 8);
    const task: ColleagueTask = { goal: input.goal.trim(), kind, steps: keys, startedAt: cur?.task && cur.task.goal === input.goal.trim() ? cur.task.startedAt : ctx.now, ...(lineId ? { lineId } : {}) };
    const id = cur?.id ?? `t-${ctx.now.toString(36)}`;
    await patchStudy(c.s.id, s => {
      const ts = threadsOf(s);
      const has = ts.some(t => t.id === id);
      const next: ColleagueThread[] = has
        /* the task becomes the subject: its goal the aim and the title, so "back to …" finds it again */
        ? ts.map(t => (t.id === id ? { ...t, task, objective: task.goal, title: task.goal.slice(0, 80), scope: { ...t.scope, ...(lineId ? { lineId } : {}) } } : t))
        : [...ts.map(t => (t.status === 'current' ? { ...t, status: 'parked' as const } : t)), { id, title: task.goal.slice(0, 80), status: 'current', scope: lineId ? { lineId } : {}, notes: [], refs: [], at: ctx.now, objective: task.goal, task }];
      return { facts: { ...s.facts, threads: next } as ToolStudy['facts'] };
    });
    const labels = keys.map(k => stepTool(k, lineId ?? '').label);
    return { ok: true, says: `Task kept: “${task.goal}” — ${labels.join(' → ')}. Its progress is read from the records as they are made.`, data: { task }, refs: [] };
  },
};

/* ================================================================== task_state */
export const taskState: Capability = {
  name: 'task_state', title: 'Where the task stands', kind: 'read',
  validate: raw => checkObject(raw, {}),
  allowed: anyone,
  async run(ctx): Promise<CapResult> {
    const { cur } = await currentThread(ctx);
    const task = cur?.task;
    if (!task) return { ok: true, says: 'No task is kept on this subject yet — understand_task, then keep_task on their yes.', data: { task: null }, refs: [] };
    if (!task.lineId) return { ok: true, says: `The task “${task.goal}” has no line yet — ask which one.`, data: { task }, refs: [] };
    const ev = await evidenceFor(task.lineId, routeOfTask(task), ctx.now, task.startedAt);
    if (!ev) return notFound('line');
    const next = nextStep(ev.steps);
    const done = ev.steps.filter(s => s.sinceTask);
    return {
      ok: true,
      says: `The task: “${task.goal}”, begun ${ago(daysSince(ctx.now, task.startedAt))}. ${done.length ? `Done since: ${done.map(s => s.label).join(', ')}. ` : ''}${evidenceSays(ev, next)}`,
      data: { task, steps: stepsData(ev.steps), ...(next ? { next: { key: next.key, label: next.label, why: next.why, page: next.href } } : {}) },
      refs: [lineRef(ev.line)],
    };
  },
};

export const TASK: readonly Capability[] = [understandTask, keepTask, taskState];
