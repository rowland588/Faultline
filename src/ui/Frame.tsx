/* ONE FRAME. Rowland, 5 October: "too many doors opening… what's home is
 * home, really home, or the project home? it's just messy."
 *
 * Every signed-in screen sits inside this: a slim top bar (the mark, which job
 * you are in, search, you) and a left rail that IS the structure — Control
 * room → this job → its gates or lenses → its work → its lines → paper. The
 * rail replaces the spine (ui/Crumbs, gone), all five rows of pill tabs
 * (ui/Peers' projectPeers, methodPeers and studyPeers, gone) and the header
 * buttons every screen carried (Notes, Reports, Pareto, the gear).
 * You always see where you are and everything one step either side; "back"
 * is a glance left. On a phone the rail folds into a bar at the foot — Control
 * room, this job, the gate you are in, Fixes, More; off a job, Control room,
 * Problems, Lines, More — and More opens the whole rail as a sheet.
 *
 * What the rail holds, and which line is on, is worked out in ui/rail.ts
 * (pure, tested). The counts on its lines are lib/useStanding's and
 * lib/useMethodCounts' — the same numbers the client report prints.
 *
 * Every URL is unchanged. The frame reads the route; it never owns one.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Route } from '../state/useRoute';
import { nav, useHash } from '../state/useRoute';
import type { Project, Workspace } from '../types';
import { useProjects } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { useStanding } from '../lib/useStanding';
import { useMethodCounts } from '../lib/useMethodCounts';
import { useWsChain } from '../lib/useTrail';
import { planModel, type PlanModel } from '../lib/planModel';
import { getStandard, getStudy, listTestItems, listTests, onDataChange } from '../db';
import { PROJECT_KEY, inProject } from '../lib/inProject';
import { gateOf, live } from '../lib/testing';
import { useTesting } from '../lib/useTesting';
import { usePrograms } from '../lib/usePrograms';
import { machineRecord } from '../lib/machineRecord';
import { todayISO } from '../lib/weeks';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import { ReportsSheet } from './ReportsSheet';
import { ControlRoomReports } from './ControlRoomReports';
import { QuickSnagHost, openQuickSnag, useCanTakeProblem } from '../snag/QuickSnag';
import { ContextBar } from './ContextBar';
import { notePlace } from '../lib/recentPlaces';
import { LineReports } from './ControlRoomReports';
import { scopeOf, type Scope } from '../lib/scope';
import { toolByKey } from '../catalogue/registry';
import { listAllSnags, allPaceLines } from '../db';
import { useFactoryLines } from '../lib/useFactoryLines';
import {
  hereOf, hereIn, factoryGroups, lineGroups, projectGroups, menuGroups, menuBar, scopeTabs, factoryTabs, FACTORY_PAGES, STUDY_SCREENS,
  type RailGroup, type RailLine, type RailLineOf, type RailMachine, type SquareState, type Count,
} from './rail';

/** Which job a route is under. Every `/project/:id/…` route carries the job
 *  as its `id`; a study's screens (`/w/:ws/…`) reach it through the chain the
 *  workspace hangs off; the 6M client report names it in its query. Read off
 *  the route's shape rather than a list of names, so a screen added under
 *  /project/:id later sits in the frame without being registered here. */
function projectOf(route: Route, chainProject?: string): string | undefined {
  /* a production line's own page is the line's, never a job's — no project needed */
  if (route.name === 'lineHome' || route.name === 'factory' || route.name === 'linePrograms') return undefined;
  if (route.wsId) return chainProject;
  if (route.name === 'paceReport') return route.query.get('project') ?? undefined;
  /* A TOOL'S PAGE INSIDE A PROJECT carries it (lib/inProject; docs/PROJECTS.md,
     P2): the rail's tools open with ?project=, and the page keeps the
     project's rail. Outside one, the control room's, as before. */
  if (TOOL_LISTS.has(route.name)) return route.query.get(PROJECT_KEY) ?? undefined;
  if (route.name === 'home' || route.name === 'start' || route.name === 'projects' || route.name === 'share' || route.name === 'quickSnags' || RECORDS.has(route.name)) return undefined;
  return route.id;
}

/** A tool's list — every use of it, on every line and project. */
const TOOL_LISTS = new Set<Route['name']>(['lineTools', 'studies', 'videos', 'talks']);
/** A tool's record — a study, a video study, a talk — wears its own project. */
const RECORDS = new Set<Route['name']>(['study', 'videoStudy', 'talk']);

/** A RECORD WEARS ITS OWN PROJECT, OR NONE. A line standard or a line
 *  capacity on a line is the project's only when it is attached to one: a
 *  product on no project opened on a line that a project also uses wore that
 *  project's rail, and read as its (Rowland, 13 October). So does a study, a
 *  video study and a talk since 21 October (docs/PROJECTS.md, P2): made
 *  inside a project, it is the project's and opens in it. `undefined` while
 *  it is read; '' when it is on no project. */
function useRecordProject(kind: 'standard' | 'study' | undefined, id?: string): { project: string; line?: string } | undefined {
  const [got, setGot] = useState<{ id: string; project: string; line?: string } | null>(null);
  useEffect(() => {
    let live = true;
    if (!kind || !id) return;
    const load = () => void (kind === 'standard' ? getStandard(id) : getStudy(id)).then(r => { if (live) setGot({ id, project: r?.projectId ?? '', line: r?.workspaceId ?? undefined }); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [kind, id]);
  return kind && id && got?.id === id ? { project: got.project, line: got.line } : undefined;
}

export function Frame({ route, children }: { route: Route; children: ReactNode }) {
  const { projects, archived, loading } = useProjects();
  const chain = useWsChain(route.wsId);
  const lines = useFactoryLines();
  const product = route.name === 'lineStandards' ? route.id : undefined;
  const record = product ? 'standard' : RECORDS.has(route.name) && route.id ? 'study' : undefined;
  const recordOf = useRecordProject(record, product ?? route.id);
  /* a record: its own project or none; a line's list of its products: the
     project it was opened in, or none */
  const projectId = record ? recordOf?.project || undefined
    : route.name === 'lineStandards' ? route.query.get(PROJECT_KEY) ?? undefined
      : projectOf(route, chain?.projectId);
  /* An archived job still opens (from the archive), and still wears its rail. */
  const project = projectId ? (projects.find(p => p.id === projectId) ?? archived.find(p => p.id === projectId)) : undefined;
  /* THE SCOPE (lib/scope; docs/STRUCTURE.md §5): the factory, a line or a project — or Home */
  const scope: Scope = scopeOf(route, { projectId: project ? projectId : undefined, lineId: recordOf?.line });
  const jobHere = useHere(route, project);
  const here = scope.kind === 'project' ? (hereIn(route, 'project') === 'tools' ? 'tools' : jobHere) : hereIn(route, scope.kind);
  /* on a tool's own page, its name after the page in the bar */
  const tool = here === 'tools' ? toolByKey(hereOf(route)) : undefined;
  const toolName = tool?.label;
  /* on one of its records, the tool's name goes back to its list in the scope */
  const toolTo = tool && route.id
    ? scope.kind === 'project' ? inProject(tool.to, scope.projectId) : scope.kind === 'line' ? `${tool.to}?line=${encodeURIComponent(scope.wsId)}` : tool.to
    : undefined;
  const reading = (projectId && !project && (loading || (route.wsId && chain === null))) || (record && recordOf === undefined);

  return (
    <div className="nv">
      <ScopeFrame scope={scope} project={project} projects={projects} lines={lines} here={here} toolName={toolName} toolTo={toolTo} wsId={route.wsId} reading={!!reading} />
      <main className="nv-main">{children}</main>
      <QuickSnagHost wsId={route.wsId ?? (scope.kind === 'line' ? scope.wsId : undefined)} projectId={projectId} />
    </div>
  );
}

/** THE CONTEXT BAR AND THE SCOPE'S RAIL — one of three, by the scope (docs/STRUCTURE.md §5.2). */
function ScopeFrame({ scope, project, projects, lines, here, toolName, toolTo, wsId, reading }: {
  scope: Scope; project?: Project; projects: Project[]; lines: Workspace[]; here: string; toolName?: string; toolTo?: string; wsId?: string; reading: boolean;
}) {
  const all = useMemo(() => (project && !projects.some(p => p.id === project.id) ? [...projects, project] : projects), [projects, project]);
  const [page, setPage] = useState<string | undefined>(undefined);
  /* a project's own lines, said in the context bar — "on Line 7 ›", one tap to the line (23 October) */
  const [onLines, setOnLines] = useState<{ label: string; to: string }[]>([]);
  const bar = (groups: RailGroup[]) => groups.flatMap(g => g.lines).find(l => l.on && l.key !== 'up')?.label;
  const said = (groups: RailGroup[]) => {
    setPage(bar(groups));
    setOnLines(groups.flatMap(g => g.lines).filter(l => l.sub && l.to?.startsWith('/lines/')).map(l => ({ label: l.label, to: l.to as string })));
  };
  /* WHERE YOU WERE (lib/recentPlaces, B5): a project's or a line's page, noted on this device for Home */
  const scopeName = scope.kind === 'project' ? project?.name : scope.kind === 'line' ? lines.find(l => l.id === scope.wsId)?.name : undefined;
  const placePage = toolName ?? page;
  useEffect(() => {
    if (reading || !scopeName || (scope.kind !== 'project' && scope.kind !== 'line')) return;
    notePlace({ to: window.location.hash.slice(1) || '/', scope: scopeName, ...(placePage ? { page: placePage } : {}), kind: scope.kind, at: Date.now() });
  }, [reading, scopeName, placePage, scope.kind]);
  return (
    <>
      <ContextBar scope={scope} page={page} tool={toolName && toolName !== page ? toolName : undefined} toolTo={toolTo} projects={all} lines={lines} projectId={project?.id}
        onLines={scope.kind === 'project' ? onLines : undefined} />
      {reading ? <NavChrome groups={[]} bar={[]} />
        : scope.kind === 'project' && project ? <ProjectNav key={project.id} project={project} here={here} wsId={wsId} onPage={said} />
          : scope.kind === 'line' ? <LineNav key={scope.wsId} wsId={scope.wsId} name={lines.find(l => l.id === scope.wsId)?.name ?? 'This line'} here={here} projects={projects} onPage={g => setPage(bar(g))} />
            : <FactoryNav projects={projects} here={here} onPage={g => setPage(bar(g))} />}
    </>
  );
}

/** Which rail line is on. Mostly the route alone (ui/rail hereOf). Two
 *  kinds of page belong to a line the route cannot name by itself:
 *   - a record's own page (a step, a test, a fix, and its card) sits under
 *     the list it is on — a fix under Fixes, a step under its gate, a test
 *     under Commission — as the spine's step above it did;
 *   - the line standard is held by Hand over on a stage-gate job and by
 *     Lines on the others. */
function useHere(route: Route, project?: Project): string {
  const base = hereOf(route);
  const record = route.name === 'test' || route.name === 'trialCard' ? route.lineId : undefined;
  const [kind, setKind] = useState<{ id: string; key: string } | null>(null);
  useEffect(() => {
    let live = true;
    if (!record || !project) return;
    void listTests(project.id).then(rows => {
      const t = rows.find(x => x.id === record);
      if (!live || !t) return;
      setKind({ id: record, key: t.kind === 'fix' ? 'fixes' : t.kind === 'install' ? gateOf(t) : 'testing' });
    });
    return () => { live = false; };
  }, [record, project]);
  if (record) return kind?.id === record ? kind.key : base;
  if (route.name === 'standard' && project) return planModel(project) === 'commissioning' ? 'handover' : 'lines';
  return base;
}

/* ------------------------------------------------------------------------- */
/*  THE TOP BAR — the mark, which job, search, you                           */
/* ------------------------------------------------------------------------- */

/* ------------------------------------------------------------------------- */
/*  THE RAIL, A JOB'S — one component per method, so each reads only what    */
/*  its counts need                                                           */
/* ------------------------------------------------------------------------- */

/** What the notes asked to be raised and have not been yet — the count the
 *  Notes header button carried, now on its rail line. */
function useOpenNotes(projectId: string): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    const load = () => void listTestItems(projectId).then(rows => {
      if (live) setN(rows.filter(i => i.kind === 'note' && !i.deletedAt && i.doneAt == null).length);
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return n;
}

function ProjectNav({ project, here, wsId, onPage }: { project: Project; here: string; wsId?: string; onPage: (g: RailGroup[]) => void }) {
  const model = planModel(project);
  const { lines: own } = usePaceLines(project.id);
  /* each of the job's lines by the factory's name, opening the factory's
     line (ui/rail linesGroup; docs/FLOW-AUDIT.md #7) */
  const factory = useFactoryLines();
  const lines = own.map(l => ({ ...l, factoryName: factory.find(w => w.id === l.workspaceId)?.name }));
  const notes = useOpenNotes(project.id);
  const shared = { project, here, wsId, lines, notes, model, onPage };
  return model === 'commissioning' ? <GateNav {...shared} />
    : <MethodNav {...shared} method={model} />;
}

interface NavProps {
  project: Project; here: string; wsId?: string; model: PlanModel; notes: number;
  lines: RailLineOf[]; onPage: (g: RailGroup[]) => void;
}

function GateNav(p: NavProps) {
  const stand = useStanding(p.project.id);
  const machines = useRailMachines(p.project.id);
  const problem = (['install', 'setup', 'handover'] as const).reduce((n, k) => n + (stand.counts[k]?.problem ?? 0), 0);
  const groups = withJobStudy(projectGroups({ projectId: p.project.id, name: p.project.name, model: p.model, here: p.here, counts: stand.counts,
    late: stand.standing.late, problem, machines, notes: p.notes }), p.wsId, p.here);
  return <NavChrome groups={groups} project={p.project} model={p.model} kind="project" onPage={p.onPage} />;
}

/** A stage-gate job's machines for the rail, each with its square — read by
 *  lib/machineRecord, the reading the machine's own page makes. */
function useRailMachines(projectId: string): RailMachine[] {
  const tt = useTesting(projectId);
  const progs = usePrograms(projectId);
  return useMemo(() => {
    if (tt.loading || progs.loading) return [];
    const today = todayISO();
    return live(tt.assets).sort((a, b) => a.sort - b.sort).map(a => {
      const m = machineRecord(a, { tests: tt.tests, items: tt.items, programs: progs.programs, today });
      const late = m.gates.reduce((n, g) => n + g.lines.filter(l => l.tone === 'late' || l.tone === 'failed').length, 0) + (m.arrivalLate ? 1 : 0);
      const state: SquareState = late > 0 ? 'r' : m.gates.some(g => g.tone === 'problem') ? 'a'
        : m.at.startsWith('Handed over') ? 'g' : m.gates.some(g => g.tone === 'going' || g.tone === 'done') ? 'w' : 'n';
      const open = m.gates.reduce((n, g) => n + g.lines.filter(l => l.tone !== 'done').length, 0);
      return { id: a.id, name: a.name, state, ...(open ? { open } : {}), ...(late ? { late } : {}) };
    });
  }, [tt.loading, progs.loading, tt.assets, tt.tests, tt.items, progs.programs]);
}

function MethodNav(p: NavProps & { method: 'board' | 'tree' }) {
  const counts = useMethodCounts(p.project.id);
  /* The job's square is red for anything late on it — its board's actions
     and what it waits on — the count its header and the control room say. */
  const late = (counts.board?.late ?? 0) + (counts.materials?.late ?? 0) + (counts.checks?.late ?? 0);
  const groups = withJobStudy(projectGroups({ projectId: p.project.id, name: p.project.name, model: p.method, here: p.here, counts, late,
    lines: p.lines, notes: p.notes, tools: { pareto: !!p.project.pareto, tree: p.method !== 'tree' && !!p.project.leverTree }, wsId: p.wsId }), p.wsId, p.here);
  return <NavChrome groups={groups} project={p.project} model={p.model} kind="project" onPage={p.onPage} />;
}

/** Inside a line study the project wears, where it sits is lit: its line on a 6M or tree project
 *  (projectGroups lights it); the Plan on a stage gate, which films its new line from Install, a gate
 *  of the Plan. The study's four screens are its own tabs since B6 (docs/STRUCTURE.md D8). */
function withJobStudy(groups: RailGroup[], wsId: string | undefined, here: string): RailGroup[] {
  if (!wsId || !STUDY_SCREENS.has(here) || groups.some(g => g.lines.some(l => l.on))) return groups;
  return groups.map(g => ({ ...g, lines: g.lines.map(l => (l.key === 'plan' ? { ...l, on: true } : l)) }));
}

/* ------------------------------------------------------------------------- */
/*  THE RAIL, A LINE'S                                                       */
/* ------------------------------------------------------------------------- */

/** A line's open problems — its rail's count, said the way the register says them. */
function useLineProblems(wsId: string): Count {
  const [c, setC] = useState<Count>({ n: 0, late: 0 });
  useEffect(() => {
    let live = true;
    const load = () => void listAllSnags().then(all => {
      const now = Date.now();
      const mine = all.filter(s => s.workspaceId === wsId && !s.deletedAt && !s.archivedAt && s.status !== 'closed');
      if (live) setC({ n: mine.length, late: mine.filter(s => s.dueAt != null && s.dueAt < now).length });
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [wsId]);
  return c;
}

function LineNav({ wsId, name, here, projects, onPage }: { wsId: string; name: string; here: string; projects: Project[]; onPage: (g: RailGroup[]) => void }) {
  const problems = useLineProblems(wsId);
  const onLine = useProjectsOnLine(wsId, projects);
  const groups = lineGroups(wsId, here, { problems, projects: onLine }).map(g => ({
    ...g,
    /* inside the line's study — its first log, Stops timed — Logs is lit; its four screens are the log's tabs (B6) */
    lines: g.lines.map(l => (l.key === 'logs' && (STUDY_SCREENS.has(here) || here === 'logs') ? { ...l, on: true } : l)),
  }));
  return <NavChrome groups={groups} kind="line" line={{ id: wsId, name }} onPage={onPage} />;
}


/** How many running projects are on the line — its Projects page's count. */
function useProjectsOnLine(wsId: string, projects: Project[]): number {
  const [n, setN] = useState(0);
  const key = projects.map(p => p.id).join(',');
  useEffect(() => {
    let live = true;
    const load = () => void allPaceLines().then(rows => {
      const ids = new Set(rows.filter(l => !l.deletedAt && l.workspaceId === wsId).map(l => l.projectId));
      if (live) setN(projects.filter(p => ids.has(p.id)).length);
    });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [wsId, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return n;
}

/* ------------------------------------------------------------------------- */
/*  THE RAIL, THE FACTORY'S                                                  */
/* ------------------------------------------------------------------------- */

/** THE FACTORY'S PAGES — every line and project at once (docs/STRUCTURE.md §5.2). Home is the
 *  mark and the switcher's first; every line and project is in the switcher. */
function FactoryNav({ projects, here, onPage }: { projects: Project[]; here: string; onPage: (g: RailGroup[]) => void }) {
  const groups = factoryGroups(here, projects.length);
  return <NavChrome groups={groups} kind="factory" home={projects} onPage={onPage} />;
}

/* ------------------------------------------------------------------------- */
/*  THE CHROME — the rail on a laptop, the bar and its sheet on a phone      */
/* ------------------------------------------------------------------------- */

function NavChrome({ groups, project, bar, home, kind = 'factory', line, onPage }: {
  groups: RailGroup[]; project?: Project; model?: PlanModel; bar?: RailLine[];
  /** Off a project: the control room's jobs, for its Reports. */
  home?: Project[];
  kind?: 'factory' | 'line' | 'project';
  /** On a line: which, for its Reports. */
  line?: { id: string; name: string };
  /** Told the groups, so the context bar can name the page that is on. */
  onPage?: (g: RailGroup[]) => void;
}) {
  /* ＋ on the bar only for somebody who may take a problem here (B0: never a client inside a project) */
  const may = useCanTakeProblem(project?.id);
  /* ONE MENU, NEVER CHANGING (23 October) — the scope's own pages are tabs across the top */
  const all = groups.flatMap(g => g.lines);
  const onKey = all.find(l => l.on && l.key !== 'up')?.key ?? '';
  const menu = menuGroups(onKey, kind, kind === 'factory' ? all.find(l => l.key === 'projects')?.n ?? 0 : 0);
  const five = bar ?? menuBar(menu, may);
  const tabs = bar ? [] : kind === 'factory' ? (FACTORY_PAGES.has(onKey) ? factoryTabs(onKey) : []) : scopeTabs(groups);
  const [more, setMore] = useState(false);
  const [reports, setReports] = useState(false);
  /* Both close when the page under them changes — a sheet left open over a
     new screen is the old screen's. */
  const hash = useHash();
  useEffect(() => { setMore(false); setReports(false); }, [hash]);
  /* told again when the page changes or the lines it is on arrive (a project's lines are read after it) */
  const onSaid = all.filter(l => l.on || (l.sub && l.to?.startsWith('/lines/'))).map(l => `${l.key}:${l.label}:${l.on}`).join(',');
  useEffect(() => { onPage?.(groups); }, [onSaid]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (l: RailLine) => {
    setMore(false);
    if (l.key === 'reports') { setReports(true); return; }
    if (l.key === 'more') { setMore(true); return; }
    if (l.key === 'plus') { openQuickSnag(); return; }
    if (l.to) nav(l.to);
  };

  return (
    <>
      <aside className="nv-rail" aria-label="Menu">
        <RailList groups={bar ? [] : menu} go={go} />
      </aside>
      {tabs.length > 0 && (
        <nav className="nv-tabs" aria-label={`${kind === 'line' ? line?.name ?? 'This line' : kind === 'project' ? project?.name ?? 'This project' : 'The factory'} — its pages`}>
          {tabs.map(l => (
            <button key={l.key} type="button" className={'nv-tab' + (l.on ? ' is-on' : '')} onClick={() => go(l)} aria-current={l.on ? 'page' : undefined}>
              <span className="nv-tab-l">{l.label}</span>{!!l.n && <span className="nv-tab-n">{l.n}{!!l.late && <i> · {l.late} late</i>}{!!l.failed && <i> · {l.failed} failed</i>}</span>}
            </button>
          ))}
        </nav>
      )}
      <nav className="nv-bar" aria-label="Menu">
        {five.map(l => (
          <button key={l.key} type="button" className={'nv-bi' + (l.on ? ' is-on' : '') + (l.key === 'plus' ? ' is-plus' : '')} onClick={() => go(l)}
            aria-current={l.on ? 'page' : undefined}
            aria-label={l.key === 'plus' ? 'Problem — a new problem, here' : l.late || l.failed || l.problem ? [l.label, l.late ? `${l.late} late` : '', l.failed ? `${l.failed} failed` : '', l.problem ? `${l.problem} a problem` : ''].filter(Boolean).join(', ') : undefined}>
            <span className={'nv-bi-ic' + (l.late || l.failed ? ' is-late' : l.problem ? ' is-problem' : '')}><Icon name={l.icon ?? 'board'} size={22} /></span>
            <span className="nv-bi-l">{l.label}</span>
          </button>
        ))}
      </nav>
      {more && (
        <Sheet open onClose={() => setMore(false)} title="Menu">
          <div className="nv-sheet"><RailList groups={menu} go={go} /></div>
        </Sheet>
      )}
      {reports && project && <ReportsSheet project={project} onClose={() => setReports(false)} />}
      {reports && !project && line && <LineReports line={line} onClose={() => setReports(false)} />}
      {reports && !project && !line && home && <ControlRoomReports projects={home} onClose={() => setReports(false)} />}
    </>
  );
}

/** The lines, as they are drawn in the rail and in the phone's sheet alike:
 *  a square that says the state, the name, the count on the right with its
 *  late part red. The line you are on is a soft surface, never the brand. */
function RailList({ groups, go }: { groups: RailGroup[]; go: (l: RailLine) => void }) {
  return (
    <>
      {groups.map((g, i) => (
        <div key={g.label ?? i} className={'nv-grp' + (g.foot ? ' is-foot' : '')}>
          {g.label && <p className="nv-grp-l">{g.label}</p>}
          {g.lines.map(l => (
            <button key={l.key} type="button" className={'nv-ri' + (l.on ? ' is-on' : '') + (l.sub ? ' is-sub' : '') + (l.problem || (l.late && l.failed) ? ' is-wrap' : '')}
              onClick={() => go(l)} aria-current={l.on ? 'page' : undefined}>
              <span className={'nv-sq is-' + l.state + (l.bare ? ' is-bare' : '')} aria-hidden />
              <span className="nv-ri-l">{l.label}</span>
              {!!l.n && (
                <span className="nv-n">{l.n}{!!l.late && <> · <i>{l.late} late</i></>}{!!l.failed && <> · <i>{l.failed} failed</i></>}{!!l.problem && <> · <i className="is-a">{l.problem} a problem</i></>}</span>
              )}
            </button>
          ))}
        </div>
      ))}
    </>
  );
}
