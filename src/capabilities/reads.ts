/* THE READS — run at once. Each says what the page that shows the same thing says, by calling that page's own reader: find is the
 * search box's places (lib/jumpPlaces, lib/jumpTo); line_state the line's page and Line Talk's (lib/lineWork lineProblems,
 * lib/lineRecords lineKit, lib/lines lineFacts, the page's toolSaysOf); list_problems the register (lib/snagsReport snagsReading);
 * overdue_actions the Actions pages (src/line/actions trackerRows/trackerSays, lib/projectActions, lib/useProjectActions
 * loadEveryAction, lib/forYou); project_state the method page's dashboard (project/method/reportData loadMethodReport) and the
 * project's Actions (project/projectRead); story_state the Story (lib/clientStory, lib/useFactoryRead loadFactoryRead,
 * lib/storyPick); tool_records the studies' own sentences (lib/studyLinks studyLine, studyTitle, studyHref). */
import {
  allPaceLines, ensureProjects, getProject, getWorkspace, listAllAssets, listAllPrograms, listAllSnags, listAllStandards,
  listAllStudies, listObservations, listSnagAssets, listStandardsForLine, listStudies, listStudiesForLine, listWorkspaces, projectsOnWorkspace,
} from '../db';
import type { Project, Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { ToolStudy } from '../lib/study';
import { isOverdue } from '../snag/types';
import { jumpTo, type Place } from '../lib/jumpTo';
import { placesOf } from '../lib/jumpPlaces';
import { factoryLinesOf } from '../lib/lineRecords';
import { lineFacts, productionLines } from '../lib/lines';
import { lineProblems, lineProblemsSaid } from '../lib/lineWork';
import { lineKit } from '../lib/lineRecords';
import { STATE_WORD, isProved, standingOf, stateOf } from '../lib/programs';
import { niceDay, todayISO } from '../lib/weeks';
import { PRIORITY_WORD, snagsReading } from '../lib/snagsReport';
import { trackerRows, trackerSays } from '../line/actions/lineActions';
import { actionsClosing, projectActions, type ProjectAction } from '../lib/projectActions';
import { loadEveryAction } from '../lib/useProjectActions';
import { forYou } from '../lib/forYou';
import { loadJobInputs } from '../lib/useJobInputs';
import { loadOwnRecords, projectRead } from '../project/projectRead';
import { loadMethodReport } from '../project/method/reportData';
import { methodOf } from '../lib/planModel';
import { linesOfClient, sinceOf, sinceSentence, snapshotOf, storySentence, storyTiles } from '../lib/clientStory';
import { loadFactoryRead } from '../lib/useFactoryRead';
import { clientShown, storyOfClient } from '../lib/storyPick';
import { studyHref, studyLine, studyTitle } from '../lib/studyLinks';
import { TOOLS, stopsOf, toolSaysOf } from '../screens/ProductionLineScreen';
import { checkObject, ID } from './check';
import { anyone } from './access';
import type { CapRef, CapResult, Capability } from './types';
import { lineRef, notFound, plural, problemRef, projectRef, route } from './util';

const KIND_REF: Record<Place['kind'], CapRef['kind']> = { line: 'line', job: 'project', product: 'page', tool: 'page', page: 'page', machine: 'machine', problem: 'problem' };
const KIND_WORD: Record<Place['kind'], string> = { line: 'line', job: 'project', product: 'product', tool: 'tool', page: 'page', machine: 'machine', problem: 'problem' };

/** The projects not archived — the live list (lib/useProjects). */
const liveProjects = async (): Promise<Project[]> => (await ensureProjects()).filter(p => !p.archivedAt);

/* ── find ── */
export const find: Capability = {
  name: 'find', title: 'Find in the factory', kind: 'read',
  validate: raw => checkObject(raw, { words: { kind: 'string', label: 'what to look for', required: true, max: 120 }, client: { kind: 'string', label: 'the client', max: 120 } }),
  allowed: anyone,
  async run(_ctx, input: { words: string; client?: string }): Promise<CapResult> {
    const [ws, std, snags, assets, jobLines, projects] = await Promise.all([listWorkspaces(), listAllStandards(), listAllSnags(), listAllAssets(), allPaceLines(), liveProjects()]);
    /* a client named: only the lines that name it, and what is on them (lib/clientStory linesOfClient) */
    const lines = input.client ? linesOfClient(productionLines(ws), input.client) : ws;
    const ids = new Set(lines.map(w => w.id));
    const projs = input.client ? projects.filter(p => factoryLinesOf(p.id, jobLines).some(id => ids.has(id))) : projects;
    const places = placesOf({ ws: lines, std, snags, assets, jobLines, projects: projs });
    const hits = jumpTo(input.words, input.client ? places.filter(p => p.kind !== 'page' && p.kind !== 'tool') : places, 12);
    if (!hits.length) return { ok: true, says: `Nothing found for “${input.words}”${input.client ? ` among ${input.client}’s lines` : ''}.`, data: [], refs: [] };
    const idOf = (p: Place): string => p.problemId ?? decodeURIComponent(route(p.href).split('?')[0].split('/').filter(Boolean)[1] ?? route(p.href));
    const refs: CapRef[] = hits.map(p => ({ kind: KIND_REF[p.kind], id: p.kind === 'machine' ? `${idOf(p)}:${p.label}` : idOf(p), label: p.label, href: route(p.href) }));
    return {
      ok: true,
      says: `${plural(hits.length, 'match', 'matches')} for “${input.words}”: ${hits.slice(0, 6).map(p => `${p.label} (${KIND_WORD[p.kind]}${p.sub ? `, ${p.sub}` : ''})`).join('; ')}${hits.length > 6 ? ' …' : ''}.`,
      data: hits.map((p, i) => ({ kind: KIND_WORD[p.kind], label: p.label, ...(p.sub ? { sub: p.sub } : {}), id: refs[i].id, href: refs[i].href })),
      refs,
    };
  },
};

/* ── line_state ── */
export const lineState: Capability = {
  name: 'line_state', title: 'Read a line', kind: 'read',
  validate: raw => checkObject(raw, { lineId: ID('the line', true) }),
  allowed: anyone,
  async run(_ctx, input: { lineId: string }): Promise<CapResult> {
    const line = await getWorkspace(input.lineId);
    if (!line) return notFound('line');
    const today = todayISO();
    const [every, std, studies, obs, walkAssets, assets, programs, jobLines, projects, jobIds] = await Promise.all([
      listAllSnags(), listStandardsForLine(line.id), listStudiesForLine(line.id), listObservations(line.id), listSnagAssets(line.id),
      listAllAssets(), listAllPrograms(), allPaceLines(), liveProjects(), projectsOnWorkspace(line.id),
    ]);
    const facts = lineFacts(line);
    const kit = lineKit(line, assets, programs, jobLines, today);
    const probs = lineProblems(every, { id: line.id, name: line.name }, { jobName: id => projects.find(p => p.id === id)?.name, assetName: s => walkAssets.find(a => a.id === s.assetId)?.name });
    const toProve = kit.programs.filter(p => !isProved(p));
    const live = studies.filter(s => !s.deletedAt);
    const tools = TOOLS.filter(t => t.study !== 'talk').flatMap(t => { const said = toolSaysOf(t, { standards: std, studies: live, obs, line, wsId: line.id }); return said.says ? [{ tool: t.label, says: said.says }] : []; });
    const stops = stopsOf(obs);
    const jobs = projects.filter(p => jobIds.includes(p.id));
    const problemsSaid = lineProblemsSaid(probs).map(p => p.text).join('');
    const says = [
      `${line.name}${line.lineType ? ` (${line.lineType})` : ''}: ${kit.says || 'no machines listed yet'}.`,
      `${problemsSaid}.`,
      toProve.length ? `${plural(toProve.length, 'program')} still to prove${kit.late ? `, ${kit.late} past its test day` : ''}.` : '',
      tools.length || stops.says ? `${plural(tools.length + (stops.says ? 1 : 0), 'tool finding')} on the line.` : 'No tool has been used on this line yet.',
    ].filter(Boolean).join(' ');
    return {
      ok: true, says,
      data: {
        line: { id: line.id, name: line.name, ...(line.lineType ? { type: line.lineType } : {}), ...(line.clientName ? { client: line.clientName } : {}), ...facts },
        machines: kit.machines.map(m => ({ name: m.name, ...(m.record?.oem ? { maker: m.record.oem } : {}) })),
        flow: kit.flow,
        problems: probs.rows.map(r => ({ id: r.id, what: r.what, priority: PRIORITY_WORD[r.priority], word: r.word, owner: r.owner ?? 'nobody yet', ...(r.due ? { due: r.due } : {}), late: r.late, ...(r.machine ? { machine: r.machine } : {}), ...(r.forJob ? { project: r.forJob } : {}) })),
        programs: toProve.map(p => ({ what: p.what, machine: kit.machines.find(m => m.record?.id === p.assetId)?.name ?? 'the line itself', word: STATE_WORD[stateOf(p)], ...(p.testOn ? { test: niceDay(p.testOn) } : {}), late: standingOf(p, today) === 'overdue' })),
        tools, ...(stops.says ? { stops: stops.says } : {}),
        projects: jobs.map(p => ({ id: p.id, name: p.name, method: methodOf(p).label })),
      },
      refs: [lineRef(line), ...probs.rows.slice(0, 12).map(r => problemRef(r)), ...jobs.map(projectRef)],
    };
  },
};

/* ── list_problems ── */
const WHICH = ['open', 'late', 'critical', 'all'] as const;
export const listProblems: Capability = {
  name: 'list_problems', title: 'List problems', kind: 'read',
  validate: raw => checkObject(raw, { lineId: ID('the line'), machine: { kind: 'string', label: 'the machine', max: 120 }, projectId: ID('the project'), which: { kind: 'enum', label: 'which problems', values: WHICH } }),
  allowed: anyone,
  async run(ctx, input: { lineId?: string; machine?: string; projectId?: string; which?: typeof WHICH[number] }): Promise<CapResult> {
    const [snags, ws, projects] = await Promise.all([listAllSnags(), listWorkspaces(), liveProjects()]);
    const walk = input.lineId ? await listSnagAssets(input.lineId) : [];
    const name = new Map(ws.map(w => [w.id, w.name]));
    const which = input.which ?? 'open';
    const mach = input.machine?.toLowerCase();
    const machineOf = (s: Snag) => (s.assetId ? walk.find(a => a.id === s.assetId)?.name : undefined) ?? s.targetAsset;
    const kept = snags.filter(s => !s.deletedAt && !s.archivedAt
      && (!input.lineId || s.workspaceId === input.lineId)
      && (!input.projectId || s.projectId === input.projectId)
      && (!mach || (machineOf(s) ?? '').trim().toLowerCase() === mach)
      && (which === 'all' || (which === 'open' && s.status !== 'closed') || (which === 'late' && isOverdue(s, ctx.now)) || (which === 'critical' && s.status !== 'closed' && s.priority === 'critical')));
    /* the register's own reading of exactly these (lib/snagsReport) — its sentence is the Problems page's */
    const reading = snagsReading({ snags: kept, register: true, today: ctx.now, became: new Map(),
      lineName: id => name.get(id) ?? 'a line', jobName: id => (id ? projects.find(p => p.id === id)?.name : undefined), assetName: s => machineOf(s) });
    const rows = reading.lines.flatMap(l => l.rows);
    return {
      ok: true, says: reading.says,
      data: rows.map(r => ({ id: r.id, what: r.what, line: r.line, ...(r.machine ? { machine: r.machine } : {}), priority: PRIORITY_WORD[r.priority], word: r.word, owner: r.owner ?? 'nobody yet', ...(r.due ? { due: r.due } : {}), late: r.late, ...(r.forJob ? { project: r.forJob } : {}), ...(r.update ? { latest: r.update } : {}) })),
      refs: rows.slice(0, 25).map(r => problemRef(r)),
    };
  },
};

/* ── overdue_actions ── */
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const actionRef = (a: ProjectAction): CapRef => (a.snagId ? problemRef({ id: a.snagId, what: a.what })
  : { kind: 'action', id: a.key, label: a.what, href: a.project ? `/project/${a.project.id}/actions` : '/actions' });

export const overdueActions: Capability = {
  name: 'overdue_actions', title: 'What is late and due', kind: 'read',
  validate: raw => checkObject(raw, { lineId: ID('the line'), projectId: ID('the project'), who: { kind: 'string', label: 'whose', max: 120 }, days: { kind: 'int', label: 'how many days ahead', min: 1, max: 60 } }),
  allowed: anyone,
  async run(ctx, input: { lineId?: string; projectId?: string; who?: string; days?: number }): Promise<CapResult> {
    const today = todayISO();
    const days = input.days ?? 7;
    const until = addDays(today, days);
    /* A LINE: its action tracker (src/line/actions) — every row a problem on the line */
    if (input.lineId) {
      const line = await getWorkspace(input.lineId);
      if (!line) return notFound('line');
      const rows = trackerRows(await listAllSnags(), line.id, ctx.now).filter(r => !input.who || r.owner.toLowerCase().includes(input.who.toLowerCase()));
      const dayOf = (t: number) => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
      const late = rows.filter(r => r.state === 'late');
      const soon = rows.filter(r => r.state !== 'late' && r.state !== 'done' && r.due != null && dayOf(r.due) <= until);
      return {
        ok: true, says: trackerSays(rows, line.name),
        data: { late: late.map(r => ({ what: r.what, who: r.owner || 'nobody yet', lateBy: r.lateBy })), soon: soon.map(r => ({ what: r.what, who: r.owner || 'nobody yet', due: niceDay(dayOf(r.due as number)) })) },
        refs: [lineRef(line), ...[...late, ...soon].slice(0, 20).map(r => problemRef({ id: r.id, what: r.what }))],
      };
    }
    /* A PROJECT: its Actions page; NEITHER: the control room's Actions — every project and every line's own problems */
    let rows: ProjectAction[];
    let refs: CapRef[] = [];
    if (input.projectId) {
      const p = await getProject(input.projectId);
      if (!p || p.deletedAt) return notFound('project');
      const [inputs, own] = await Promise.all([loadJobInputs([p]), loadOwnRecords(p.id)]);
      const read = projectRead(p, inputs, own, today);
      rows = projectActions(read.owed, read.register, p.id, today);
      refs = [projectRef(p)];
    } else rows = (await loadEveryAction(await liveProjects(), today)).rows;
    let late: ProjectAction[], soon: ProjectAction[];
    if (input.who) { const f = forYou(rows, input.who, today); late = f.late; soon = [...f.soon, ...f.week].filter(a => !!a.due && a.due <= until); }
    else { late = rows.filter(a => a.late); soon = rows.filter(a => !a.late && !!a.due && a.due <= until); }
    const mine = input.who ? [...late, ...soon] : rows;
    const closing = actionsClosing(mine).text;
    const says = `${input.who ? `${input.who}: ` : ''}${closing} ${soon.length ? `${plural(soon.length, 'more')} due by ${niceDay(until)}.` : `Nothing else due by ${niceDay(until)}.`}`;
    const said = (a: ProjectAction) => ({ what: a.what, kind: a.kind, who: a.who || 'nobody yet', ...(a.due ? { due: niceDay(a.due) } : {}), ...(a.where ? { where: a.where } : {}), ...(a.project ? { project: a.project.name } : {}), ...(a.priority ? { priority: PRIORITY_WORD[a.priority] } : {}) });
    return { ok: true, says, data: { late: late.map(said), soon: soon.map(said) }, refs: [...refs, ...[...late, ...soon].slice(0, 20).map(actionRef)] };
  },
};

/* ── project_state ── */
export const projectState: Capability = {
  name: 'project_state', title: 'Read a project', kind: 'read',
  validate: raw => checkObject(raw, { projectId: ID('the project', true) }),
  allowed: anyone,
  async run(_ctx, input: { projectId: string }): Promise<CapResult> {
    const p = await getProject(input.projectId);
    if (!p || p.deletedAt) return notFound('project');
    const today = todayISO();
    const [inputs, own, report] = await Promise.all([loadJobInputs([p]), loadOwnRecords(p.id), loadMethodReport(p.id)]);
    const read = projectRead(p, inputs, own, today);
    const rows = projectActions(read.owed, read.register, p.id, today);
    const closing = actionsClosing(rows);
    const dash = report?.report.dash;
    const method = report?.method.name ?? methodOf(p).label;
    const says = `${p.name} — ${method}${p.archivedAt ? ' (archived)' : ''}. ${dash ? `${dash.says} Next: ${dash.next}` : ''} Its actions: ${closing.text}`.replace(/\s+/g, ' ').trim();
    return {
      ok: true, says,
      data: {
        project: { id: p.id, name: p.name, method, ...(p.lead ? { lead: p.lead } : {}) },
        ...(dash ? {
          journey: dash.sections.map(s => ({ step: s.name, state: s.state, ...(s.here ? { here: true } : {}) })),
          attention: dash.attention.map(a => a.text),
          findings: dash.findings.map(f => ({ tool: f.tool, title: f.title, says: f.says, section: f.section })),
          next: dash.next, closing: dash.closing,
        } : {}),
        actions: { open: rows.length, late: rows.filter(a => a.late).length, said: closing.text },
      },
      refs: [projectRef(p), ...(dash?.findings ?? []).slice(0, 10).map(f => ({ kind: 'study' as const, id: f.id, label: f.title, href: f.href }))],
    };
  },
};

/* ── story_state ── */
export const storyState: Capability = {
  name: 'story_state', title: 'Read the story so far', kind: 'read',
  validate: raw => checkObject(raw, {}),
  allowed: anyone,
  async run(): Promise<CapResult> {
    const [ws, studies, projects] = await Promise.all([listWorkspaces(), listAllStudies(), liveProjects()]);
    const prod = productionLines(ws);
    const client = clientShown(prod);
    const lines = linesOfClient(prod, client);
    const read = await loadFactoryRead(projects, lines);
    const snapshot = snapshotOf({ at: Date.now(), lines, wrong: read.wrong, actions: read.actions, proved: read.proved, studies: read.studies, today: read.today });
    const story = storyOfClient(studies.filter(s => !s.deletedAt), client);
    const chapters = (story?.facts.chapters ?? []).filter(c => c.approvedAt).sort((a, b) => a.at - b.at);
    const since = sinceOf(snapshot, chapters[chapters.length - 1]?.snapshot);
    const says = `${story ? '' : `No story has been started for ${client || 'the factory'} yet — these are the figures it would start from. `}${storySentence(snapshot)} ${sinceSentence(since)}`;
    return {
      ok: true, says,
      data: { client: client || 'the factory', tiles: storyTiles(snapshot).map(t => ({ figure: t.k, value: t.v, ...(t.of ? { of: t.of } : {}) })), chapters: chapters.length, since: sinceSentence(since) },
      refs: [{ kind: 'story', id: story?.id ?? 'story', label: story?.name ?? 'The story', href: '/story' }],
    };
  },
};

/* ── tool_records ── */
export const toolRecords: Capability = {
  name: 'tool_records', title: 'Tool records', kind: 'read',
  validate: raw => {
    const c = checkObject(raw, { lineId: ID('the line'), projectId: ID('the project') });
    return c.ok && !c.input.lineId && !c.input.projectId ? { ok: false, why: 'Say which line or which project.' } : c;
  },
  allowed: anyone,
  async run(_ctx, input: { lineId?: string; projectId?: string }): Promise<CapResult> {
    let line: Workspace | undefined, list: ToolStudy[];
    const refs: CapRef[] = [];
    if (input.lineId) {
      line = await getWorkspace(input.lineId);
      if (!line) return notFound('line');
      list = await listStudiesForLine(line.id);
      if (input.projectId) list = list.filter(s => s.projectId === input.projectId);
      refs.push(lineRef(line));
    } else {
      const p = await getProject(input.projectId as string);
      if (!p || p.deletedAt) return notFound('project');
      list = await listStudies(p.id);
      refs.push(projectRef(p));
    }
    /* the records a person made — never an AI Mode conversation itself */
    const own = list.filter(s => !s.deletedAt && !(s.tool === 'talk' && (s.facts as { colleague?: boolean }).colleague));
    const obs = line ? await listObservations(line.id) : [];
    const ctxOf = (s: ToolStudy) => (line && s.tool === 'losses' ? { observations: obs, workspaces: [line] } : undefined);
    const rows = own.map(s => ({ id: s.id, title: studyTitle(s), says: studyLine(s, ctxOf(s)).text, href: studyHref(s), at: s.startedAt }));
    const where = line?.name ?? refs[0].label;
    return {
      ok: true,
      says: rows.length ? `${plural(rows.length, 'tool record')} on ${where}: ${rows.slice(0, 5).map(r => `${r.title} — ${r.says}`).join('; ')}${rows.length > 5 ? ' …' : ''}.` : `No tool has been used on ${where} yet.`,
      data: rows.map(r => ({ id: r.id, title: r.title, says: r.says, href: r.href })),
      refs: [...refs, ...rows.slice(0, 20).map(r => ({ kind: 'study' as const, id: r.id, label: r.title, href: r.href }))],
    };
  },
};
