/* UNDERSTANDING — the colleague knows the app it works in, what the person is trying to do, and where the work belongs
 * (9 November; docs/AI-CONTEXT.md). Rowland: "an intelligent manufacturing colleague that understands the application it operates
 * within, understands the user's intentions and knows how to connect conversational work to the correct application records."
 *
 *   describe_faultline  read   the app as it is now: its kinds of record and how they relate (./appModel), the capabilities
 *                              this person may use here (the registry and its schemas, each write checked against their access),
 *                              the tools (the catalogue's registry) and the methods (lib/methods) — read, never a fixed list
 *   plan_work           read   "I want to do an observation analysis": the kind of work, the tools that do it, what is already
 *                              known from the conversation, what already exists (records of those tools on the line, the line's
 *                              projects, drafts in hand, open problems that sound the same) and the ONE question to ask next
 *   resolve_record      read   "the packing hall", "that line", "the existing project", "the investigation we did yesterday":
 *                              one, several or none — areas, lines, machines, projects, problems and tool records, from the
 *                              conversation's own subjects first, only the client in hand, never another's
 *   update_context      local  what the subject is now: the person's objective, just talk · standalone · in a project, the
 *                              line, project or machine (a correction moves the drafts not yet made with it), a decision, an
 *                              assumption, a question waiting for its answer
 *   link_to_project     write  confirmed: a tool record or a problem put into a project, as the study's "Attach to a job" and
 *                              the problem's project do — only a project on the same line, never silently
 *
 * Reads and the local change only what the conversation holds; the write goes through the person's yes. Nothing deletes, nothing
 * is marked verified, no figure is worked out here. */
import { allPaceLines, ensureProjects, getProject, getSnag, getStudy, getWorkspace, listAllAssets, listAllSnags, listAllStudies, listWorkspaces, patchSnag, patchStudy } from '../db';
import type { Project, Workspace } from '../types';
import type { ToolStudy } from '../lib/study';
import type { Snag } from '../snag/types';
import { factoryLinesOf, onlyLineOf, type JobLine } from '../lib/lineRecords';
import { clientKey } from '../lib/factoryKnowledge';
import { areaHref } from '../lib/areas';
import { studyHref, studyTitle } from '../lib/studyLinks';
import { niceDay, todayISO } from '../lib/weeks';
import { METHODS } from '../lib/methods';
import { APP_TOOLS, toolByKey } from '../catalogue/registry';
import { ENTRIES, entryById, searchEntries, stems } from '../catalogue/index';
import { PRIORITY_WORD } from '../lib/snagsReport';
import { uid } from '../lib/ids';
import { checkObject, ID } from './check';
import { anyone, mayEdit, mayStartProjects } from './access';
import { conversation, draftsOf, writeDrafts } from './draftStore';
import { scopeOf } from './factory';
import { POINTING, RECORD_KINDS, STOPS_TOOL, activitiesFor, dayWindow } from './appModel';
import { CAPABILITY_SCHEMAS } from './schemas';
import { evidenceFor, nextStep, routeFor, type TaskStep } from './task';
import type { CapCtx, CapRef, CapResult, Capability, ColleagueDraft, ColleagueThread, ThreadMode, ThreadPoint, ThreadScope } from './types';
import { lineRef, notFound, plural, problemRef, projectRef } from './util';

/* ------------------------------------------------------------------ shared */

const threadsOf = (s: Pick<ToolStudy, 'facts'>): ColleagueThread[] => {
  const t = (s.facts as { threads?: unknown }).threads;
  return Array.isArray(t) ? t as ColleagueThread[] : [];
};
const writeThreads = (id: string, change: (cur: ColleagueThread[]) => ColleagueThread[]) =>
  patchStudy(id, cur => ({ facts: { ...cur.facts, threads: change(threadsOf(cur)) } as ToolStudy['facts'] }));

/** The conversation's current subject, when there is a conversation and a subject. */
async function currentOf(ctx: CapCtx): Promise<{ s?: ToolStudy; cur?: ColleagueThread; threads: ColleagueThread[] }> {
  if (!ctx.conversationId) return { threads: [] };
  const c = await conversation(ctx);
  if (!c.ok) return { threads: [] };
  const threads = threadsOf(c.s);
  return { s: c.s, cur: threads.find(t => t.status === 'current'), threads };
}

const liveProjects = async (): Promise<Project[]> => (await ensureProjects()).filter(p => !p.archivedAt && !p.deletedAt);
/** The live projects on a line, as the line's page lists them. */
const projectsOnLine = (lineId: string, projects: readonly Project[], jobLines: readonly JobLine[]): Project[] =>
  projects.filter(p => factoryLinesOf(p.id, jobLines).includes(lineId));

/** How alike two names are, 0 to 1 — the share of the shorter one's words the other holds (the catalogue's stems). */
export function alike(a: string, b: string): number {
  const x = new Set(stems(a)), y = new Set(stems(b));
  if (!x.size || !y.size) return 0;
  let n = 0;
  for (const w of x) if (y.has(w)) n++;
  return n / Math.min(x.size, y.size);
}
const same = (a: string, b: string): boolean => a.trim().toLowerCase() === b.trim().toLowerCase();

/** A tool's word for a record — "SMED", "Loss count" — from the registry by what the record is. */
export function toolWordOf(s: Pick<ToolStudy, 'tool' | 'agreed'>): string {
  const calc = s.agreed?.calc?.key;
  const t = APP_TOOLS.find(a => (calc ? a.reads === `calc:${calc}` : false)) ?? APP_TOOLS.find(a => a.reads === s.tool);
  return t?.label ?? (s.tool === 'talk' ? 'Line Talk' : s.tool);
}
/** The records of an app tool, by what its line page reads. */
const ofTool = (key: string) => (s: ToolStudy): boolean => {
  const t = toolByKey(key);
  if (!t?.reads) return false;
  if (t.reads.startsWith('calc:')) return s.tool === 'calc' && s.agreed?.calc?.key === t.reads.slice(5);
  return s.tool === t.reads;
};
const studyRef = (s: ToolStudy): CapRef => ({ kind: 'study', id: s.id, label: s.name, href: studyHref(s) });
const ago = (now: number, at: number): string => niceDay(todayISO(new Date(at))) + (now - at < 36e5 * 24 ? ' (today)' : '');

/* ================================================================== describe_faultline */

type About = 'records' | 'capabilities' | 'tools' | 'methods' | 'all';
interface DescribeIn { about?: About; name?: string }

export const describeFaultline: Capability = {
  name: 'describe_faultline', title: 'What LUNAR holds and can do', kind: 'read',
  validate: raw => checkObject(raw, { about: { kind: 'enum', label: 'what to describe', values: ['records', 'capabilities', 'tools', 'methods', 'all'] }, name: { kind: 'string', label: 'one thing by name', max: 80 } }),
  allowed: anyone,
  async run(ctx, input: DescribeIn): Promise<CapResult> {
    const about = input.about ?? 'all';
    const name = input.name?.trim().toLowerCase();
    /* the registry read when asked — a capability added to it is described with no change here */
    const { CAPABILITIES } = await import('./registry');
    const { cur } = await currentOf(ctx);
    const projectId = cur?.mode === 'standalone' || cur?.mode === 'talk' ? undefined : cur?.scope.projectId;
    const caps = await Promise.all(CAPABILITIES.filter(c => c.name !== 'describe_faultline').map(async c => {
      const schema = CAPABILITY_SCHEMAS.find(s => s.name === c.name);
      const req = ((schema?.input_schema as { required?: string[] } | undefined)?.required ?? []);
      /* what this person may do here: reads and the conversation's own steps anyone; a write by their access as the screens check it */
      const may = c.kind !== 'write' ? { ok: true as const } : c.name === 'start_project' ? await mayStartProjects(ctx) : await mayEdit(ctx, projectId);
      return { name: c.name, title: c.title, kind: c.kind, does: schema?.description ?? c.title, needs: req, available: may.ok, ...(may.ok ? {} : { why: may.why }) };
    }));
    const tools = APP_TOOLS.map(t => {
      const e = entryById(t.id);
      return { key: t.key, label: t.label, kind: t.kind, starts: t.starts, says: t.says, gives: e?.outputs ?? '', needs: e?.inputs ?? '', page: t.to };
    });
    const methods = METHODS.map(m => ({ key: m.key, name: m.name, question: m.question, sections: m.sections.map(s => s.name) }));
    const pick = <T extends { name?: string; label?: string; key?: string; kind?: string; word?: string }>(xs: T[]) =>
      name ? xs.filter(x => [x.name, x.label, x.key, x.kind, x.word].some(v => v?.toLowerCase().includes(name))) : xs;
    const data = {
      ...(about === 'records' || about === 'all' ? { records: pick(RECORD_KINDS.map(r => ({ ...r }))) } : {}),
      ...(about === 'capabilities' || about === 'all' ? { capabilities: pick(caps) } : {}),
      ...(about === 'tools' || about === 'all' ? { tools: pick(tools), stopsTimed: { key: STOPS_TOOL.key, label: STOPS_TOOL.label, says: STOPS_TOOL.says } } : {}),
      ...(about === 'methods' || about === 'all' ? { methods: pick(methods) } : {}),
    };
    const parts = [
      data.records ? plural(data.records.length, 'kind of record') : '',
      data.capabilities ? `${plural(data.capabilities.filter(c => c.available).length, 'capability', 'capabilities')} you can use here${data.capabilities.some(c => !c.available) ? ` (${data.capabilities.filter(c => !c.available).length} not open to you here)` : ''}` : '',
      data.tools ? plural(data.tools.length, 'tool') : '',
      data.methods ? plural(data.methods.length, 'method') : '',
    ].filter(Boolean);
    return { ok: true, says: `LUNAR as it is now: ${parts.join(', ')}${name ? ` matching “${input.name}”` : ''}.`, data, refs: [] };
  },
};

/* ================================================================== plan_work */

interface PlanIn { words: string; lineId?: string; projectId?: string; machine?: string }
interface ToolOffer { key: string; label: string; says: string; page?: string; existing: { id: string; name: string; day: string; project?: string; href: string }[] }

/** The activities the words name, best first — then the catalogue's own search for what no activity names. */
export { activitiesFor };

export const planWork: Capability = {
  name: 'plan_work', title: 'Work out what is wanted', kind: 'read',
  validate: raw => checkObject(raw, { words: { kind: 'string', label: 'what the person wants to do', required: true, max: 300 }, lineId: ID('the line'), projectId: ID('the project'), machine: { kind: 'string', label: 'the machine', max: 120 } }),
  allowed: anyone,
  async run(ctx, input: PlanIn): Promise<CapResult> {
    const { s, cur } = await currentOf(ctx);
    const mode: ThreadMode | undefined = cur?.mode;
    const lineId = input.lineId ?? cur?.scope.lineId;
    const projectId = input.projectId ?? (mode === 'standalone' || mode === 'talk' ? undefined : cur?.scope.projectId);
    const machine = input.machine ?? cur?.scope.machine;
    const [line, project, all, jobLines, projects, studies, snags] = await Promise.all([
      lineId ? getWorkspace(lineId) : undefined, projectId ? getProject(projectId) : undefined, listWorkspaces(), allPaceLines(), liveProjects(), listAllStudies(), listAllSnags(),
    ]);
    if (input.lineId && !line) return notFound('line');
    if (input.projectId && (!project || project.deletedAt)) return notFound('project');

    /* WHAT KIND OF WORK — the floor's words first (./appModel), else the catalogue's search over the tools a person can open */
    const acts = activitiesFor(input.words);
    const act = acts[0];
    const keys = act ? act.tools : searchEntries(input.words, ENTRIES.filter(e => APP_TOOLS.some(t => t.id === e.id))).slice(0, 3).map(e => APP_TOOLS.find(t => t.id === e.id)?.key).filter((k): k is string => !!k);
    const lineStudies = line ? studies.filter(x => !x.deletedAt && x.workspaceId === line.id && x.tool !== 'talk') : [];
    const offers: ToolOffer[] = keys.map(k => {
      if (k === STOPS_TOOL.key) return { key: k, label: STOPS_TOOL.label, says: STOPS_TOOL.says, ...(line ? { page: STOPS_TOOL.href(line.id) } : {}), existing: [] };
      const t = toolByKey(k);
      const mine = lineStudies.filter(ofTool(k)).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 4);
      return {
        key: k, label: t?.label ?? k, says: t?.says ?? '', ...(t ? { page: t.to } : {}),
        existing: mine.map(x => ({ id: x.id, name: x.name, day: ago(ctx.now, x.updatedAt), ...(x.projectId ? { project: projects.find(p => p.id === x.projectId)?.name ?? 'a project' } : {}), href: studyHref(x) })),
      };
    });

    /* WHAT IS KNOWN, WHAT IS NOT — the conversation's subject first; only what is missing is asked */
    const known: string[] = [];
    if (line) known.push(`the line: ${line.name}${line.areaName ? ` (${[line.siteName, line.areaName].filter(Boolean).join(' › ')})` : ''}`);
    if (machine) known.push(`the machine: ${machine}`);
    if (project) known.push(`the project: ${project.name}`);
    if (mode) known.push(mode === 'talk' ? 'it is just a conversation — nothing to keep' : mode === 'standalone' ? 'it is standalone — in no project' : `it is in ${project?.name ?? 'a project'}`);
    if (cur?.objective) known.push(`what they want: ${cur.objective}`);
    const needsLine = act ? act.needsLine : keys.some(k => ['line', 'product'].includes(toolByKey(k)?.starts ?? ''));
    const needsMachine = !!act?.needsMachine;
    const onLine = line ? projectsOnLine(line.id, projects, jobLines) : [];
    const drafts = s ? draftsOf(s).filter(d => d.status === 'draft' && d.kind !== 'factory' && (!line || d.scope.lineId === line.id)) : [];
    const said = new Set(stems(input.words));
    const alikeProblems = line ? snags.filter(p => !p.deletedAt && p.workspaceId === line.id && p.status !== 'closed' && stems(p.problem).some(w => said.has(w) && w.length > 3)).slice(0, 4) : [];
    /* the lines a person could mean when none is said — only the client in hand (or the ones they see), at most eight */
    const scope = await scopeOf({ ...(projectId ? { projectId } : {}) }, all);
    const visible = all.filter(w => !w.archived && (!scope.ok || !scope.clients || scope.clients.includes(clientKey(w))));
    const machines = line ? [...new Set([...(line.assets ?? []), ...(await listAllAssets()).filter(a => a.workspaceId === line.id && !a.deletedAt && !a.mergedInto && !a.replacedBy).map(a => a.name)])] : [];

    /* THE ONE QUESTION — the first thing that is truly missing, in the order a colleague would ask it */
    const missingNow: string[] = [];
    let ask: string | undefined;
    let recommend: TaskStep | undefined;
    if (mode === 'talk') ask = undefined;
    else if (needsLine && !line) {
      missingNow.push('line');
      /* more than one client in sight: each line says whose, so two businesses are never offered as one list */
      const clients = new Set(visible.map(clientKey));
      const named = (w: Workspace) => `${w.name}${clients.size > 1 ? ` (${w.clientName?.trim() || 'no client named'})` : ''}`;
      ask = visible.length > 1 && visible.length <= 8 ? `Which line — ${visible.map(named).join(', ')}?` : clients.size > 1 ? 'Which client’s factory, and which line?' : 'Which line is this on?';
    } else if (needsMachine && !machine) {
      missingNow.push('machine');
      ask = machines.length ? `Which machine — ${machines.slice(0, 8).join(', ')}${machines.length > 8 ? ' …' : ''}?` : 'Which machine is it on?';
    } else if (act && line && act.tools.length > 1 && !offers.some(o => o.existing.length) && (recommend = nextStep((await evidenceFor(line.id, routeFor(act), ctx.now))?.steps ?? []))) {
      /* THE TASK LEADS (10 November, docs/AI-TASK.md): never "which tool?" — the line's own evidence says where to start */
      ask = `Start with ${recommend.label} — ${recommend.why}${recommend.status === 'old' ? ' (what is there is more than four weeks old)' : ''}. Shall I set it up?`;
    } else if (offers.some(o => o.existing.length)) {
      const o = offers.find(x => x.existing.length) as ToolOffer;
      ask = `${line?.name ?? 'The line'} already has ${o.label} “${o.existing[0].name}” from ${o.existing[0].day} — carry on with that one, or start a new one?`;
    }
    /* standalone or in a project — asked once, and only when it matters: the line has a project and nothing is settled */
    const linkToDecide = !mode && !project && onLine.length > 0;
    if (!ask && linkToDecide) ask = `Is this part of ${onLine.length === 1 ? `“${onLine[0].name}”` : `one of the projects on ${line?.name} (${onLine.map(p => `“${p.name}”`).join(', ')})`}, or standalone?`;
    if (linkToDecide) missingNow.push('project or standalone');

    const says = [
      act ? `This reads as ${act.word.toLowerCase()}.` : keys.length ? 'The nearest tools for that:' : 'No tool matches those words — describe the work, or a custom sheet can be built.',
      offers.length ? `Tools: ${offers.map(o => `${o.label}${o.existing.length ? ` (${plural(o.existing.length, 'record')} on this line already)` : ''}`).join('; ')}.` : '',
      known.length ? `Known: ${known.join('; ')}.` : 'Nothing is known yet about where this is.',
      drafts.length ? `Being built already: ${drafts.map(d => `“${d.title}”`).join(', ')}.` : '',
      alikeProblems.length ? `Open problems that sound the same: ${alikeProblems.map(p => `“${p.problem}”`).join('; ')}.` : '',
      mode === 'talk' ? 'It is just a conversation — nothing needs to be kept.' : ask ? `Ask next: ${ask}` : 'Nothing more needs asking — carry on.',
    ].filter(Boolean).join(' ');
    return {
      ok: true, says,
      data: {
        activity: act ? { id: act.id, word: act.word } : null, ...(recommend ? { recommend: { key: recommend.key, label: recommend.label, why: recommend.why, status: recommend.status } } : {}), tools: offers, known, missing: missingNow, ask: ask ?? null,
        line: line ? { id: line.id, name: line.name, site: line.siteName ?? null, area: line.areaName ?? null, client: line.clientName ?? null } : null,
        projectsOnLine: onLine.map(p => ({ id: p.id, name: p.name, method: p.method ?? null })), mode: mode ?? null,
        drafts: drafts.map(d => ({ id: d.id, title: d.title })), similarProblems: alikeProblems.map(p => ({ id: p.id, words: p.problem, priority: PRIORITY_WORD[p.priority ?? 'low'] })),
        machines: machines.slice(0, 20), lines: line ? [] : visible.slice(0, 12).map(w => ({ id: w.id, name: w.name, area: w.areaName ?? null })),
      },
      refs: [...(line ? [lineRef(line)] : []), ...onLine.map(projectRef), ...offers.flatMap(o => o.existing.slice(0, 2).map(e => ({ kind: 'study' as const, id: e.id, label: e.name, href: e.href }))), ...alikeProblems.map(problemRef)],
    };
  },
};

/* ================================================================== resolve_record */

type RecKind = 'area' | 'line' | 'machine' | 'project' | 'problem' | 'study';
const REC_KINDS: readonly RecKind[] = ['area', 'line', 'machine', 'project', 'problem', 'study'];
interface ResolveIn { words: string; kind?: RecKind; lineId?: string; projectId?: string }
interface Candidate { kind: RecKind; id: string; label: string; sub: string; href: string; score: number; why: string; lineId?: string }

/** Words that name a kind of record rather than which one ("the line", "that project", "the investigation"). */
const KIND_WORDS: Record<string, RecKind> = {
  line: 'line', lines: 'line', area: 'area', hall: 'area', department: 'area', machine: 'machine', equipment: 'machine', asset: 'machine',
  project: 'project', programme: 'project', program: 'project', problem: 'problem', snag: 'problem', issue: 'problem', loss: 'problem',
  investigation: 'study', study: 'study', analysis: 'study', record: 'study', sampling: 'study', smed: 'study', count: 'study', log: 'study',
};
const NOISE = new Set(['let', 'look', 'go', 'back', 'connect', 'with', 'about', 'we', 'us', 'our', 'the', 'that', 'this', 'existing', 'previous', 'earlier', 'last', 'other', 'same', 'one', 'ones', 'yesterday', 'today', 'week', 'looked', 'did', 'were', 'had', 'at', 'on', 'in', 'to', 'it', 'just', 'actually', 'instead', 'not', 'no', 'meant', 'mean', 'current', 'already']);

/** The kind the words point at, when they name one. */
function kindIn(words: string): RecKind | undefined {
  for (const w of words.toLowerCase().split(/[^a-z0-9]+/)) if (KIND_WORDS[w]) return KIND_WORDS[w];
  return undefined;
}
/** The words that might be a name — what is left once "the existing", "line" and the like are taken off. */
const nameWords = (words: string): string => words.toLowerCase().split(/[^a-z0-9]+/).filter(w => w && !NOISE.has(w) && !(KIND_WORDS[w] && !/^\d/.test(w))).join(' ');

export const resolveRecord: Capability = {
  name: 'resolve_record', title: 'Work out which record is meant', kind: 'read',
  validate: raw => checkObject(raw, { words: { kind: 'string', label: 'the words said', required: true, max: 200 }, kind: { kind: 'enum', label: 'the kind of record', values: REC_KINDS }, lineId: ID('the line in hand'), projectId: ID('the project in hand') }),
  allowed: anyone,
  async run(ctx, input: ResolveIn): Promise<CapResult> {
    const { cur, threads } = await currentOf(ctx);
    const kind = input.kind ?? kindIn(input.words);
    const lineIn = input.lineId ?? cur?.scope.lineId, projIn = input.projectId ?? (cur?.mode === 'standalone' ? undefined : cur?.scope.projectId);
    const [all, assets, jobLines, projects, snags, studies] = await Promise.all([listWorkspaces(), listAllAssets(), allPaceLines(), liveProjects(), listAllSnags(), listAllStudies()]);
    /* NEVER ANOTHER CLIENT'S — the client of the line or project in hand, else every client whose lines this person can see */
    const scope = await scopeOf({ ...(lineIn ? { lineId: lineIn } : projIn ? { projectId: projIn } : {}) }, all);
    if (!scope.ok) return scope;
    const lines = all.filter(w => !w.archived && (!scope.clients || scope.clients.includes(clientKey(w))));
    const lineIds = new Set(lines.map(w => w.id));
    const lineName = (id?: string) => lines.find(w => w.id === id)?.name;
    const projs = projects.filter(p => !scope.clients || factoryLinesOf(p.id, jobLines).some(id => lineIds.has(id)));
    const projIds = new Set(projs.map(p => p.id));
    const name = nameWords(input.words);
    const pointing = POINTING.test(input.words);
    const window = dayWindow(input.words);
    const wants = (k: RecKind) => !kind || kind === k;
    const out: Candidate[] = [];
    const add = (c: Candidate) => { const had = out.find(x => x.kind === c.kind && x.id === c.id); if (had) { had.score = Math.max(had.score, c.score); if (c.score >= had.score) had.why = c.why; } else out.push(c); };
    const byName = (label: string): number => {
      if (!name) return 0;
      if (same(label, name)) return 100;
      const l = label.toLowerCase();
      if (l.includes(name) || name.includes(l)) return 85;
      return Math.round(alike(label, name) * 70);
    };

    /* 1 · THE CONVERSATION — "that line", "the existing project": what this conversation has been about, newest first */
    if (pointing) {
      const recent = [...threads].sort((a, b) => b.at - a.at);
      recent.forEach((t, i) => {
        const bonus = (t.status === 'current' ? 60 : 50) - i * 3;
        const sc = t.scope;
        if (sc.lineId && wants('line') && lineIds.has(sc.lineId)) add({ kind: 'line', id: sc.lineId, label: lineName(sc.lineId) ?? 'a line', sub: `this conversation — “${t.title}”`, href: `/lines/${sc.lineId}`, score: bonus, why: 'said in this conversation' });
        if (sc.projectId && wants('project') && projIds.has(sc.projectId)) { const p = projs.find(x => x.id === sc.projectId); if (p) add({ kind: 'project', id: p.id, label: p.name, sub: `this conversation — “${t.title}”`, href: `/project/${p.id}`, score: bonus, why: 'said in this conversation' }); }
        if (sc.machine && sc.lineId && wants('machine')) add({ kind: 'machine', id: `${sc.lineId}:${sc.machine}`, label: sc.machine, sub: lineName(sc.lineId) ?? '', href: `/lines/${sc.lineId}/machine/${encodeURIComponent(sc.machine)}`, score: bonus, why: 'said in this conversation', lineId: sc.lineId });
        if (sc.studyId && wants('study')) { const st = studies.find(x => x.id === sc.studyId && !x.deletedAt); if (st) add({ kind: 'study', id: st.id, label: st.name, sub: `${toolWordOf(st)} — this conversation`, href: studyHref(st), score: bonus + 5, why: 'worked on in this conversation' }); }
        if (sc.problemId && wants('problem')) { const p = snags.find(x => x.id === sc.problemId); if (p) add({ kind: 'problem', id: p.id, label: p.problem, sub: lineName(p.workspaceId) ?? '', href: `/snags?open=${encodeURIComponent(p.id)}`, score: bonus, why: 'said in this conversation' }); }
        for (const r of t.refs) {
          const k: RecKind | undefined = r.kind === 'study' ? 'study' : r.kind === 'project' ? 'project' : r.kind === 'line' ? 'line' : r.kind === 'problem' ? 'problem' : undefined;
          if (k && wants(k) && (k !== 'line' || lineIds.has(r.id)) && (k !== 'project' || projIds.has(r.id))) add({ kind: k, id: r.id, label: r.label, sub: `this conversation — “${t.title}”`, href: r.href, score: bonus - 10, why: 'touched in this conversation' });
        }
      });
    }

    /* 1b · "the existing project", "the project", "the investigation" with a line in hand and no name: what is on that line */
    if (lineIn && lineIds.has(lineIn) && !name && (pointing || kind)) {
      if (kind === 'project') projs.filter(p => factoryLinesOf(p.id, jobLines).includes(lineIn)).forEach(p => add({ kind: 'project', id: p.id, label: p.name, sub: `on ${lineName(lineIn)}`, href: `/project/${p.id}`, score: 55, why: `the project on ${lineName(lineIn)}` }));
      if (kind === 'study') studies.filter(x => !x.deletedAt && x.tool !== 'talk' && x.workspaceId === lineIn).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5)
        .forEach((x, i) => add({ kind: 'study', id: x.id, label: x.name, sub: `${toolWordOf(x)} on ${lineName(lineIn)} — ${niceDay(todayISO(new Date(x.updatedAt)))}`, href: studyHref(x), score: 50 - i * 5, why: `a record on ${lineName(lineIn)}` }));
    }

    /* 2 · A DAY SAID — "the machine we looked at yesterday": the subjects of the person's other conversations in that window */
    if (window) {
      /* the day counted from the capability's own clock (ctx.now), never the wall's — the same answer in a test and on the floor */
      const today = new Date(todayISO(new Date(ctx.now))).getTime();
      const dayMs = 864e5, start = today - window.to * dayMs, end = today - (window.from - 1) * dayMs;
      for (const conv of studies.filter(x => x.tool === 'talk' && (x.facts as { colleague?: boolean }).colleague && x.id !== ctx.conversationId && !x.deletedAt)) {
        for (const t of threadsOf(conv).filter(t => t.at >= start && t.at < end)) {
          const when = niceDay(todayISO(new Date(t.at)));
          if (t.scope.lineId && wants('line') && lineIds.has(t.scope.lineId)) add({ kind: 'line', id: t.scope.lineId, label: lineName(t.scope.lineId) ?? 'a line', sub: `talked about ${when} — “${t.title}”`, href: `/lines/${t.scope.lineId}`, score: 55, why: `from a conversation on ${when}` });
          if (t.scope.machine && t.scope.lineId && wants('machine') && lineIds.has(t.scope.lineId)) add({ kind: 'machine', id: `${t.scope.lineId}:${t.scope.machine}`, label: t.scope.machine, sub: `${lineName(t.scope.lineId) ?? ''} — talked about ${when}`, href: `/lines/${t.scope.lineId}/machine/${encodeURIComponent(t.scope.machine)}`, score: 60, why: `from a conversation on ${when}`, lineId: t.scope.lineId });
          if (t.scope.projectId && wants('project') && projIds.has(t.scope.projectId)) { const p = projs.find(x => x.id === t.scope.projectId); if (p) add({ kind: 'project', id: p.id, label: p.name, sub: `talked about ${when}`, href: `/project/${p.id}`, score: 55, why: `from a conversation on ${when}` }); }
        }
      }
      /* and the records changed in that window */
      for (const st of studies.filter(x => !x.deletedAt && x.tool !== 'talk' && x.updatedAt >= start && x.updatedAt < end && (x.workspaceId ? lineIds.has(x.workspaceId) : !scope.clients))) {
        if (wants('study')) add({ kind: 'study', id: st.id, label: st.name, sub: `${toolWordOf(st)} — changed ${niceDay(todayISO(new Date(st.updatedAt)))}`, href: studyHref(st), score: 40 + byName(st.name) / 2, why: 'worked on that day' });
      }
    }

    /* 3 · BY NAME — the records in scope whose name meets the words */
    if (name) {
      if (wants('area')) {
        const seen = new Map<string, Workspace>();
        for (const w of lines) if (w.areaName?.trim()) seen.set(`${clientKey(w)}|${(w.siteName ?? '').trim().toLowerCase()}|${w.areaName.trim().toLowerCase()}`, w);
        for (const w of seen.values()) {
          const sc = byName(w.areaName ?? '');
          if (sc >= 40) {
            const n = lines.filter(x => x.areaName?.trim().toLowerCase() === w.areaName?.trim().toLowerCase() && (x.siteName ?? '') === (w.siteName ?? '') && clientKey(x) === clientKey(w)).length;
            add({ kind: 'area', id: `${w.clientName ?? ''}|${w.siteName ?? ''}|${w.areaName}`, label: w.areaName as string, sub: `${[w.clientName, w.siteName].filter(Boolean).join(' › ') || 'the factory'} — ${plural(n, 'line')}`, href: areaHref({ area: w.areaName as string, ...(w.siteName ? { site: w.siteName } : {}), ...(w.clientName ? { client: w.clientName } : {}) }), score: sc, why: 'its name' });
          }
        }
      }
      if (wants('line')) for (const w of lines) { const sc = byName(w.name); if (sc >= 40) add({ kind: 'line', id: w.id, label: w.name, sub: [w.siteName, w.areaName].filter(Boolean).join(' › '), href: `/lines/${w.id}`, score: sc, why: 'its name' }); }
      if (wants('machine')) {
        for (const w of lines) {
          const names = new Set([...(w.assets ?? []), ...assets.filter(a => a.workspaceId === w.id && !a.deletedAt && !a.mergedInto).map(a => a.name)]);
          for (const m of names) {
            const rec = assets.find(a => a.workspaceId === w.id && a.name === m && !a.deletedAt);
            const sc = Math.max(byName(m), rec?.kind ? byName(rec.kind) - 10 : 0);
            if (sc >= 40) add({ kind: 'machine', id: rec?.id ?? `${w.id}:${m}`, label: m, sub: w.name + (rec?.replacedBy ? ' — replaced' : ''), href: `/lines/${w.id}/machine/${encodeURIComponent(m)}`, score: sc - (rec?.replacedBy ? 30 : 0) + (lineIn === w.id ? 10 : 0), why: 'its name', lineId: w.id });
          }
        }
      }
      if (wants('project')) for (const p of projs) { const sc = byName(p.name); if (sc >= 40) add({ kind: 'project', id: p.id, label: p.name, sub: factoryLinesOf(p.id, jobLines).map(lineName).filter(Boolean).join(', '), href: `/project/${p.id}`, score: sc + (lineIn && factoryLinesOf(p.id, jobLines).includes(lineIn) ? 10 : 0), why: 'its name' }); }
      if (wants('problem')) for (const p of snags.filter(x => !x.deletedAt && lineIds.has(x.workspaceId))) { const sc = byName(p.problem) - (p.status === 'closed' ? 15 : 0); if (sc >= 45) add({ kind: 'problem', id: p.id, label: p.problem, sub: `${lineName(p.workspaceId) ?? ''}${p.status === 'closed' ? ' — closed' : ''}`, href: `/snags?open=${encodeURIComponent(p.id)}`, score: sc + (lineIn === p.workspaceId ? 10 : 0), why: 'its words' }); }
      if (wants('study')) for (const st of studies.filter(x => !x.deletedAt && x.tool !== 'talk' && (x.workspaceId ? lineIds.has(x.workspaceId) : x.projectId ? projIds.has(x.projectId) : !scope.clients))) {
        const sc = Math.max(byName(st.name), byName(`${toolWordOf(st)} ${st.machine ?? ''}`) - 5);
        if (sc >= 45) add({ kind: 'study', id: st.id, label: st.name, sub: `${toolWordOf(st)}${st.workspaceId ? ` on ${lineName(st.workspaceId)}` : ''}${st.projectId ? `, in ${projs.find(p => p.id === st.projectId)?.name ?? 'a project'}` : ''} — ${niceDay(todayISO(new Date(st.updatedAt)))}`, href: studyHref(st), score: sc + (lineIn === st.workspaceId ? 10 : 0), why: 'its name' });
      }
    }

    out.sort((a, b) => b.score - a.score || a.label.localeCompare(b.label));
    const top = out.slice(0, 6);
    const clear = top.length === 1 ? top[0].score >= 45 : top.length > 1 && top[0].score >= 60 && top[0].score - top[1].score >= 20;
    const match = !top.length ? 'none' : clear ? 'one' : 'several';
    const said = (c: Candidate) => `${c.label} (${c.kind}${c.sub ? `, ${c.sub}` : ''})`;
    const says = match === 'none'
      ? `Nothing recorded matches “${input.words}”${kind ? ` as a ${kind}` : ''}${scope.clients ? ` among ${scope.what}’s` : ''}. Say it is not known — never guess one.`
      : match === 'one' ? `“${input.words}” is ${said(top[0])} — ${top[0].why}.`
      : `“${input.words}” could be ${top.map(said).join('; ')}. Ask which.`;
    return { ok: true, says, data: { match, candidates: top.map(({ score, ...c }) => ({ ...c, sure: score >= 85 ? 'name' : score >= 60 ? 'likely' : 'possible' })) }, refs: top.map(c => ({ kind: c.kind === 'area' ? 'page' as const : c.kind, id: c.id, label: c.label, href: c.href })) };
  },
};

/* ================================================================== update_context */

interface ContextIn {
  objective?: string; mode?: ThreadMode; lineId?: string; projectId?: string; machine?: string; studyId?: string; problemId?: string;
  decision?: string; assumption?: string; question?: string; answered?: { question: string; answer: string };
}

/** A draft not yet made, on the subject, follows a change of line or project — what is made already is linked only by a card. */
const follows = (d: ColleagueDraft, threadId: string) => d.status === 'draft' && d.kind !== 'factory' && d.threadId === threadId;

export const updateContext: Capability = {
  name: 'update_context', title: 'Keep track of where we are', kind: 'local',
  validate: raw => checkObject(raw, {
    objective: { kind: 'string', label: 'what they are trying to do', max: 300 }, mode: { kind: 'enum', label: 'what kind of work', values: ['talk', 'standalone', 'project'] },
    lineId: ID('the line'), projectId: ID('the project'), machine: { kind: 'string', label: 'the machine', max: 120 }, studyId: ID('the record'), problemId: ID('the problem'),
    decision: { kind: 'string', label: 'a decision', max: 300 }, assumption: { kind: 'string', label: 'an assumption', max: 300 }, question: { kind: 'string', label: 'a question still open', max: 300 },
    answered: { kind: 'object', label: 'a question answered', fields: { question: { kind: 'string', label: 'the question', required: true, max: 300 }, answer: { kind: 'string', label: 'the answer', required: true, max: 300 } } },
  }),
  allowed: anyone,
  async run(ctx, input: ContextIn): Promise<CapResult> {
    const c = await conversation(ctx);
    if (!c.ok) return c;
    const cur = threadsOf(c.s).find(t => t.status === 'current');
    if (!cur) return { ok: false, why: 'No subject is current — set the focus first (set_focus), then say where it is.' };
    const [line, project, jobLines] = await Promise.all([input.lineId ? getWorkspace(input.lineId) : undefined, input.projectId ? getProject(input.projectId) : undefined, allPaceLines()]);
    if (input.lineId && !line) return notFound('line');
    if (input.projectId && (!project || project.deletedAt)) return notFound('project');
    if (input.studyId && !(await getStudy(input.studyId))) return notFound('record');
    if (input.problemId && !(await getSnag(input.problemId))) return notFound('problem');
    if (input.mode === 'project' && !project && !cur.scope.projectId) return { ok: false, why: 'In which project? Find it first (resolve_record), then give its id with mode project.' };

    const scope: ThreadScope = { ...cur.scope };
    const said: string[] = [];
    let mode = input.mode ?? cur.mode;
    if (line && line.id !== scope.lineId) {
      said.push(`${scope.lineId ? 'Now on' : 'On'} ${line.name}${scope.lineId ? ' (corrected)' : ''}`);
      scope.lineId = line.id;
      /* a project not on the new line no longer fits — said, never kept silently */
      if (scope.projectId && !project && !factoryLinesOf(scope.projectId, jobLines).includes(line.id)) { said.push('the project is not on that line, so it is taken off'); delete scope.projectId; if (mode === 'project') mode = undefined; }
      if (scope.machine && input.machine === undefined) delete scope.machine;
    }
    if (project) {
      const on = factoryLinesOf(project.id, jobLines);
      if (scope.lineId && on.length && !on.includes(scope.lineId)) return { ok: false, why: `“${project.name}” is on ${on.length ? (await Promise.all(on.map(id => getWorkspace(id)))).map(w => w?.name).filter(Boolean).join(', ') : 'no line'}, not on this subject’s line — check which project is meant, or which line.` };
      if (project.id !== scope.projectId) said.push(`in “${project.name}”`);
      scope.projectId = project.id; mode = input.mode ?? 'project';
    }
    if (mode === 'standalone' || mode === 'talk') { if (scope.projectId) said.push('in no project'); delete scope.projectId; }
    if (input.mode && input.mode !== cur.mode) said.push(input.mode === 'talk' ? 'just a conversation — nothing to keep' : input.mode === 'standalone' ? 'standalone — in no project' : 'in the project');
    if (input.machine !== undefined && input.machine !== scope.machine) { if (input.machine.trim()) scope.machine = input.machine.trim(); else delete scope.machine; said.push(input.machine.trim() ? `the machine: ${input.machine.trim()}` : 'no machine'); }
    if (input.studyId) { scope.studyId = input.studyId; said.push('the record noted'); }
    if (input.problemId) { scope.problemId = input.problemId; said.push('the problem noted'); }
    const points: ThreadPoint[] = [...(cur.points ?? [])];
    const point = (kind: ThreadPoint['kind'], text?: string) => { if (text?.trim()) { points.push({ id: uid(), kind, text: text.trim(), at: ctx.now }); said.push(`${kind}: ${text.trim()}`); } };
    point('decision', input.decision); point('assumption', input.assumption); point('question', input.question);
    if (input.answered) {
      const q = [...points].reverse().find(p => p.kind === 'question' && !p.answered && alike(p.text, input.answered?.question ?? '') >= 0.5);
      if (q) { q.answered = input.answered.answer.trim(); said.push(`answered: ${q.text} — ${q.answered}`); }
      else point('decision', `${input.answered.question.trim()} — ${input.answered.answer.trim()}`);
    }
    const objective = input.objective?.trim() || cur.objective;
    if (input.objective?.trim() && input.objective.trim() !== cur.objective) said.push(`aim: ${input.objective.trim()}`);
    await writeThreads(c.s.id, list => list.map(t => (t.id === cur.id ? {
      ...t, scope, ...(objective ? { objective } : {}), ...(mode ? { mode } : { mode: undefined }), points, at: ctx.now,
      refs: [...t.refs, ...(line && !t.refs.some(r => r.id === line.id) ? [lineRef(line)] : []), ...(project && !t.refs.some(r => r.id === project.id) ? [projectRef(project)] : [])],
    } : t)));
    /* the drafts not yet made on this subject follow its line and project */
    let moved = 0;
    await writeDrafts(c.s.id, list => list.map(d => {
      if (!follows(d, cur.id)) return d;
      const next = { ...d.scope, ...(scope.lineId ? { lineId: scope.lineId } : {}) };
      if (scope.projectId) next.projectId = scope.projectId; else delete next.projectId;
      if (next.lineId === d.scope.lineId && next.projectId === d.scope.projectId) return d;
      moved++;
      return { ...d, scope: next };
    }));
    if (moved) said.push(`${plural(moved, 'draft')} moved with it`);
    return { ok: true, says: said.length ? `“${cur.title}”: ${said.join('; ')}.` : `Nothing changed on “${cur.title}”.`, data: { threadId: cur.id, scope, mode: mode ?? null }, refs: [...(line ? [lineRef(line)] : []), ...(project ? [projectRef(project)] : [])] };
  },
};

/* ================================================================== link_to_project */

interface LinkIn { projectId: string; studyId?: string; problemId?: string }
type Target = { kind: 'study'; s: ToolStudy } | { kind: 'problem'; p: Snag };

async function linkCheck(input: LinkIn): Promise<{ ok: true; t: Target; project: Project; lines: string[]; lineId?: string; to?: string; from?: Project } | { ok: false; why: string }> {
  if (!!input.studyId === !!input.problemId) return { ok: false, why: 'Name one thing to link — a tool record or a problem.' };
  const [project, jobLines] = await Promise.all([getProject(input.projectId), allPaceLines()]);
  if (!project || project.deletedAt || project.archivedAt) return notFound('project');
  const lines = factoryLinesOf(project.id, jobLines);
  const t: Target | undefined = input.studyId ? (s => (s && !s.deletedAt ? { kind: 'study' as const, s } : undefined))(await getStudy(input.studyId)) : (p => (p && !p.deletedAt ? { kind: 'problem' as const, p } : undefined))(await getSnag(input.problemId as string));
  if (!t) return notFound(input.studyId ? 'record' : 'problem');
  const lineId = t.kind === 'study' ? t.s.workspaceId : t.p.workspaceId;
  const already = t.kind === 'study' ? t.s.projectId : t.p.projectId;
  if (already === project.id) return { ok: false, why: `It is already in “${project.name}”.` };
  /* only a project on the same line — never a link the floor could not see from the line */
  if (lineId && lines.length && !lines.includes(lineId)) {
    const [here, there] = await Promise.all([getWorkspace(lineId), Promise.all(lines.map(id => getWorkspace(id)))]);
    return { ok: false, why: `It is on ${here?.name ?? 'another line'}; “${project.name}” is on ${there.map(w => w?.name).filter(Boolean).join(', ')} — not the same line, so it is not linked. Check which project is meant.` };
  }
  const from = already ? await getProject(already) : undefined;
  const to = !lineId && t.kind === 'study' ? onlyLineOf(project.id, jobLines) : undefined;
  return { ok: true, t, project, lines, ...(lineId ? { lineId } : {}), ...(to ? { to } : {}), ...(from && !from.deletedAt ? { from } : {}) };
}
const targetName = (t: Target): string => (t.kind === 'study' ? `${toolWordOf(t.s)} “${t.s.name}”` : `the problem “${t.p.problem}”`);

export const linkToProject: Capability = {
  name: 'link_to_project', title: 'Put it into a project', kind: 'write',
  validate: raw => checkObject(raw, { projectId: ID('the project', true), studyId: ID('the tool record'), problemId: ID('the problem') }),
  async allowed(ctx: CapCtx, input: LinkIn) {
    const a = await mayEdit(ctx, input.projectId);
    if (!a.ok) return a;
    /* taking it out of another project is that project's change too */
    const was = input.studyId ? (await getStudy(input.studyId))?.projectId : input.problemId ? (await getSnag(input.problemId))?.projectId : undefined;
    return was && was !== input.projectId ? mayEdit(ctx, was) : { ok: true };
  },
  async preview(_ctx, input: LinkIn) {
    const c = await linkCheck(input);
    if (!c.ok) return c.why;
    const line = c.lineId ? await getWorkspace(c.lineId) : c.to ? await getWorkspace(c.to) : undefined;
    return `Put ${targetName(c.t)} into the project “${c.project.name}”${line ? ` — it stays on ${line.name}` : ''}${c.from ? `, moving it out of “${c.from.name}” (a record is in one project at a time)` : ''}. It then shows on the project’s ${c.t.kind === 'study' ? 'Tools' : 'Problems and Actions'} as well as the line’s.`;
  },
  async run(ctx, input: LinkIn): Promise<CapResult> {
    const c = await linkCheck(input);
    if (!c.ok) return c;
    /* the study's own "Attach to a job" (ui/StudyPlace attach) and the problem's project, as the register writes it */
    if (c.t.kind === 'study') await patchStudy(c.t.s.id, cur => ({ projectId: c.project.id, ...(!cur.workspaceId && c.to ? { workspaceId: c.to } : {}) }));
    else await patchSnag(c.t.p.id, { projectId: c.project.id, updatedAt: Date.now() });
    /* the conversation's subject that was working on it is now in the project */
    if (ctx.conversationId) {
      const id = c.t.kind === 'study' ? c.t.s.id : c.t.p.id;
      await writeThreads(ctx.conversationId, list => list.map(t => (t.scope.studyId === id || t.scope.problemId === id ? { ...t, mode: 'project', scope: { ...t.scope, projectId: c.project.id } } : t)));
    }
    const ref = c.t.kind === 'study' ? studyRef((await getStudy(c.t.s.id)) ?? c.t.s) : problemRef(c.t.p);
    return { ok: true, says: `${targetName(c.t)} is now in “${c.project.name}”${c.from ? ` (out of “${c.from.name}”)` : ''}.`, refs: [ref, projectRef(c.project)] };
  },
};

/* ================================================================== what is already there — the duplicate checks the writes say */

/** Records of the same tool on the same line whose names are alike — said on make_record's card before anything is made. */
export async function alikeRecords(d: Pick<ColleagueDraft, 'title' | 'scope'>, tool: string, calcKey?: string): Promise<ToolStudy[]> {
  if (!d.scope.lineId) return [];
  return (await listAllStudies()).filter(s => !s.deletedAt && s.workspaceId === d.scope.lineId && s.tool === tool && (!calcKey || s.agreed?.calc?.key === calcKey) && (same(s.name, d.title) || alike(s.name, d.title) >= 0.75));
}
/** Live projects on any of these lines with a name like this one. */
export async function alikeProjects(name: string, lineIds: readonly string[]): Promise<Project[]> {
  const [projects, jobLines] = await Promise.all([liveProjects(), allPaceLines()]);
  return projects.filter(p => (same(p.name, name) || alike(p.name, name) >= 0.75) && (!lineIds.length || factoryLinesOf(p.id, jobLines).some(id => lineIds.includes(id))));
}
/** Open problems on the line that say the same thing. */
export async function alikeProblems(lineId: string, words: string): Promise<Snag[]> {
  return (await listAllSnags()).filter(p => !p.deletedAt && p.workspaceId === lineId && p.status !== 'closed' && (same(p.problem, words) || alike(p.problem, words) >= 0.6));
}
/** Where a draft will be made, in words — the line with its site and area, the project or that it is in none. */
export async function destinationOf(scope: ColleagueDraft['scope'], mode?: ThreadMode): Promise<string> {
  const [line, p, jobLines, projects] = await Promise.all([scope.lineId ? getWorkspace(scope.lineId) : undefined, scope.projectId ? getProject(scope.projectId) : undefined, allPaceLines(), liveProjects()]);
  const where = line ? `on ${line.name}${line.areaName ? ` (${[line.siteName, line.areaName].filter(Boolean).join(' › ')})` : ''}` : 'on no line';
  if (p && !p.deletedAt) return `${where}, in the project “${p.name}”`;
  const onLine = line ? projectsOnLine(line.id, projects, jobLines) : [];
  return `${where}, ${mode === 'standalone' ? 'standalone — in no project, as you said' : onLine.length ? `in no project (not in ${onLine.map(x => `“${x.name}”`).join(' or ')})` : 'in no project'}`;
}
/** The conversation's thread a draft was started on — its mode decides how the destination is said. */
export const modeOf = (s: Pick<ToolStudy, 'facts'>, threadId?: string): ThreadMode | undefined => threadsOf(s).find(t => t.id === threadId)?.mode;
/** Day words for a record — "SMED “Filler changeover” (3 Nov)". */
export const recordSaid = (s: ToolStudy): string => `${toolWordOf(s)} “${s.name}” (${niceDay(todayISO(new Date(s.updatedAt)))})`;
/** A study's title as the lists say it. */
export { studyTitle };
