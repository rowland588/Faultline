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
import { getStandard, getStudy, getWorkspace, listTestItems, listTests, listWorkspaces, onDataChange } from '../db';
import { PROJECT_KEY } from '../lib/inProject';
import { liveProductionLines } from '../lib/lines';
import { gateOf, live } from '../lib/testing';
import { useTesting } from '../lib/useTesting';
import { usePrograms } from '../lib/usePrograms';
import { machineRecord } from '../lib/machineRecord';
import { todayISO } from '../lib/weeks';
import { LogoMark } from './Logo';
import { Icon } from './Icon';
import { AccountMenu } from './AccountMenu';
import { JumpTo } from './JumpTo';
import { Sheet } from './Sheet';
import { ReportsSheet } from './ReportsSheet';
import { ControlRoomReports } from './ControlRoomReports';
import { useJobStands } from './railJobs';
import { QuickSnagButton, QuickSnagHost } from '../snag/QuickSnag';
import { useFactoryLines } from '../lib/useFactoryLines';
import {
  controlRoom, snagsPlace, toolsGroup, jobLine, gatesGroup, machinesGroup, methodGroup, workGroup, linesGroup, footGroup, studyLines, phoneBar, hereOf,
  type RailGroup, type RailLine, type RailLineOf, type RailMachine, type SquareState,
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
function useRecordProject(kind: 'standard' | 'study' | undefined, id?: string): string | undefined {
  const [got, setGot] = useState<{ id: string; project: string } | null>(null);
  useEffect(() => {
    let live = true;
    if (!kind || !id) return;
    const load = () => void (kind === 'standard' ? getStandard(id) : getStudy(id)).then(r => { if (live) setGot({ id, project: r?.projectId ?? '' }); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [kind, id]);
  return kind && id && got?.id === id ? got.project : undefined;
}

export function Frame({ route, children }: { route: Route; children: ReactNode }) {
  const { projects, archived, loading } = useProjects();
  const chain = useWsChain(route.wsId);
  const product = route.name === 'lineStandards' ? route.id : undefined;
  const record = product ? 'standard' : RECORDS.has(route.name) && route.id ? 'study' : undefined;
  const recordProject = useRecordProject(record, product ?? route.id);
  /* a record: its own project or none; a line's list of its products: the
     project it was opened in, or none */
  const projectId = record ? recordProject || undefined
    : route.name === 'lineStandards' ? route.query.get(PROJECT_KEY) ?? undefined
      : projectOf(route, chain?.projectId);
  /* An archived job still opens (from the archive), and still wears its rail. */
  const project = projectId ? (projects.find(p => p.id === projectId) ?? archived.find(p => p.id === projectId)) : undefined;
  const jobHere = useHere(route, project);
  /* on no job, the tool it is: Line capacity or Line standard in the Tools */
  const here = route.name === 'lineStandards' && !project ? (route.query.get('at') === 'balance' ? 'linebalance' : 'linestandard') : jobHere;

  return (
    <div className="nv">
      <TopBar project={project} projects={projects} place={placeOf(route)} />
      {project
        ? <ProjectNav key={project.id} project={project} here={here} wsId={route.wsId} />
        /* While the job is still being read, only the first line — never the
           control room's list of jobs for a moment, then the job's rail. */
        : (projectId && (loading || (route.wsId && chain === null))) || (record && recordProject === undefined)
          ? <NavChrome groups={[{ lines: [controlRoom(here), snagsPlace(here)] }, toolsGroup(here)]} bar={[controlRoom(here)]} />
          : <HomeNav projects={projects} here={here} wsId={route.wsId} loose={!!route.wsId && chain === null && route.name !== 'lineHome'} />}
      <main className="nv-main">{children}</main>
      <QuickSnagHost wsId={route.wsId} projectId={projectId} />
    </div>
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

/** WHERE YOU ARE, off a job — the name the top bar says in the job's place.
 *  It said "Control room" on Your factory, on a line and on every tool, which
 *  was not where you were (docs/FLOW-AUDIT.md #20): now it names the layer, as
 *  the rail's groups do — the control room (and its problems, its jobs), Your
 *  factory (a line, its programs, its stopwatch and walk), or the tools. */
function placeOf(route: Route): string {
  switch (route.name) {
    case 'factory': case 'lineHome': case 'linePrograms': return 'Your factory';
    case 'lineTools': case 'studies': case 'study': case 'lineStandards': case 'videos': case 'videoStudy': case 'talks': case 'talk': return 'Tools';
    case 'start': return 'Home';
    case 'projects': return 'Projects';
    case 'home': case 'portfolio': case 'quickSnags': case 'allActions': return 'Control room';
    default: return route.wsId ? 'Your factory' : 'Control room';
  }
}

function TopBar({ project, projects, place }: { project?: Project; projects: Project[]; place: string }) {
  /* An archived job is not in the live list, but it is the one you are in. */
  const options = project && !projects.some(p => p.id === project.id) ? [...projects, project] : projects;
  /* off a job and off the control room, the select stands on where you are
     (the place, not a choice) and the control room is still its way up */
  const away = !project && place !== 'Control room';
  return (
    <header className="nv-top">
      <button type="button" className="nv-mark" onClick={() => nav('/')} aria-label="Faultline — home">
        <LogoMark size={28} id="nv" />
        <span className="nv-name">Faultline</span>
      </button>
      {/* WHICH JOB. A native select laid over the job's name: the phone's own
          picker, a list on a laptop, and the one control that already knows
          how to be a switcher. Its first option is the control room, so it is
          also the way up — "home is home". */}
      <label className="nv-job">
        <select value={project?.id ?? ''} aria-label="Which project"
          onChange={e => nav(e.target.value && e.target.value !== 'home' ? `/project/${e.target.value}` : '/room')}>
          {away && <option value="" disabled>{place}</option>}
          <option value={away ? 'home' : ''}>Control room</option>
          {options.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="nv-job-l" aria-hidden>{project?.name ?? place}</span>
        <Icon name="chevronDown" size={14} />
      </label>
      {/* The search box that held search's place is gone until search exists
          (docs/FLOW.md item 3): a control that does nothing is not true yet.
          The gap keeps the snag button and you at the right. */}
      <span className="nv-gap" aria-hidden />
      <JumpTo />
      <QuickSnagButton />
      <AccountMenu />
    </header>
  );
}

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

function ProjectNav({ project, here, wsId }: { project: Project; here: string; wsId?: string }) {
  const model = planModel(project);
  const { lines: own } = usePaceLines(project.id);
  /* each of the job's lines by the factory's name, opening the factory's
     line (ui/rail linesGroup; docs/FLOW-AUDIT.md #7) */
  const factory = useFactoryLines();
  const lines = own.map(l => ({ ...l, factoryName: factory.find(w => w.id === l.workspaceId)?.name }));
  const notes = useOpenNotes(project.id);
  const shared = { project, here, wsId, lines, notes, model };
  return model === 'commissioning' ? <GateNav {...shared} />
    : <MethodNav {...shared} method={model} />;
}

interface NavProps {
  project: Project; here: string; wsId?: string; model: PlanModel; notes: number;
  lines: RailLineOf[];
}

function GateNav(p: NavProps) {
  const stand = useStanding(p.project.id);
  const machines = useRailMachines(p.project.id);
  const lines = linesGroup(p.project.id, p.lines, p.here, p.wsId);
  const groups: RailGroup[] = [
    { lines: [controlRoom(p.here), snagsPlace(p.here), jobLine(p.project.id, p.project.name, p.here, stand.standing.late,
      (['install', 'setup', 'handover'] as const).reduce((n, k) => n + (stand.counts[k]?.problem ?? 0), 0))] },
    gatesGroup(p.project.id, p.here, stand.counts),
    ...(machines.length ? [machinesGroup(p.project.id, p.here, machines)] : []),
    footGroup(p.project.id, p.here, p.notes),
    /* The lines a stage-gate job is on go under paper, above the tools, so
       they no longer push the job down (docs/FLOW.md item 3) — named Lines,
       by the factory's names: they sat unlabelled among the tools, called
       Line 7 and Line 8 for one line of the factory (docs/FLOW-AUDIT.md #7). */
    ...(lines.lines.length ? [lines] : []),
    toolsGroup(p.here, [], p.project.id),
  ];
  return <NavChrome groups={withJobStudy(groups, p.wsId, p.lines, p.here)} project={p.project} model={p.model} />;
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
  const groups: RailGroup[] = [
    /* The job's square is red for anything late on it — its board's actions
       and what it waits on — the count its header and the control room say. */
    { lines: [controlRoom(p.here), snagsPlace(p.here), jobLine(p.project.id, p.project.name, p.here, (counts.board?.late ?? 0) + (counts.materials?.late ?? 0) + (counts.checks?.late ?? 0))] },
    methodGroup(p.project.id, p.method, p.here, counts,
      { pareto: !!p.project.pareto, tree: p.method !== 'tree' && !!p.project.leverTree }),
    workGroup(p.project.id, p.here, counts),
    /* A running line's lines are what the job is about, so they stay with
       the work; only the tools go to the foot. */
    linesGroup(p.project.id, p.lines, p.here, p.wsId),
    footGroup(p.project.id, p.here, p.notes),
    toolsGroup(p.here, [], p.project.id),
  ];
  return <NavChrome groups={withJobStudy(groups, p.wsId, p.lines, p.here)} project={p.project} model={p.model} />;
}

/** The job's own walk — a stage-gate job films its new line from Install, a
 *  6M job from its Evidence lens. Inside that study the four screens are
 *  drawn under the job, since no line of the project owns them. */
function withJobStudy(groups: RailGroup[], wsId: string | undefined, lines: NavProps['lines'], here: string): RailGroup[] {
  if (!wsId || lines.some(l => l.workspaceId === wsId)) return groups;
  return groups.map((g, i) => (i === 0 ? { ...g, lines: [...g.lines, ...studyLines(wsId, here)] } : g));
}

/* ------------------------------------------------------------------------- */
/*  THE RAIL, THE CONTROL ROOM'S                                             */
/* ------------------------------------------------------------------------- */

/** Every production line — the lines on this device, the demo line aside —
 *  for the control room's rail. Read again when anything is written. */
function useProductionLines(): Workspace[] {
  const [ws, setWs] = useState<Workspace[]>([]);
  useEffect(() => {
    let live = true;
    const load = () => void listWorkspaces().then(liveProductionLines).then(lines => { if (live) setWs(lines); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, []);
  return ws;
}

/** OFF A PROJECT, ONE RAIL (docs/BLUEPRINT.md §3, the new product): its
 *  places first — Home (say what you need, #/), Projects, Methods (the
 *  library) — then the control room as the view of every project and line at
 *  once (its problems, every paper), Your factory, the jobs, and the tools at
 *  the foot. The front door's five places and the control room's rail were
 *  two rails; they are merged, nothing taken off. A loose study (no project
 *  owns it) shows its name and its four screens under the control room. */
function HomeNav({ projects, here, wsId, loose }: { projects: Project[]; here: string; wsId?: string; loose: boolean }) {
  const [wsName, setWsName] = useState('');
  const stands = useJobStands();
  useEffect(() => {
    let live = true;
    if (!wsId) { setWsName(''); return; }
    void getWorkspace(wsId).then(w => { if (live) setWsName(w?.name ?? 'Line study'); });
    return () => { live = false; };
  }, [wsId]);
  const prodLines = useProductionLines();
  const groups: RailGroup[] = [
    /* HOME AND THE PROJECTS */
    { lines: [
      { key: 'start', label: 'Home', to: '/', on: here === 'start', state: 'n', bare: true, icon: 'home' } as RailLine,
      { key: 'projects', label: 'Projects', to: '/projects', on: here === 'projects', state: 'n', bare: true, icon: 'board', n: projects.length || undefined } as RailLine,
    ] },
    /* THE CONTROL ROOM — every project and line at once; REPORTS, as a job's
       rail has them — every paper (ui/ControlRoomReports; Rowland, 14
       October: "we need the same in control room") */
    { label: 'Control room', lines: [{ ...controlRoom(here), icon: 'list' }, snagsPlace(here),
      /* every project's actions and every line's own problems (docs/PROJECTS.md, P4) */
      { key: 'allactions', label: 'Every action', to: '/actions', on: here === 'allactions', state: 'n', bare: true, icon: 'list' } as RailLine,
      { key: 'reports', label: 'Reports', on: false, state: 'n', bare: true, icon: 'list' } as RailLine,
      ...(loose && wsId ? [
      { key: 'ws', label: wsName || 'Line study', to: `/w/${wsId}/capture`, on: false, state: 'n', bare: true } as RailLine,
      ...studyLines(wsId, here),
    ] : [])] },
    /* YOUR FACTORY first — the backbone, before the jobs (Rowland, 13
       October: "a factory setup before the new projects ... your production
       lines"): the factory itself, then each line, in floor order, each its
       own page — its problems and its tools, no project needed. */
    {
      label: 'Your factory',
      lines: [
        { key: 'factory', label: prodLines.length ? 'Your factory' : 'Set up your factory', to: '/factory', on: here === 'factory', state: 'n', bare: true, icon: 'machine' } as RailLine,
        /* every line's programs, planned and proved, no job needed (Stage 2) */
        ...(prodLines.length ? [{ key: 'lineprograms', label: 'Programs', to: '/programs', on: here === 'lineprograms', state: 'n', bare: true, icon: 'list' } as RailLine] : []),
        ...prodLines.map(w => ({ key: `line:${w.id}`, label: w.name, to: `/lines/${w.id}`, on: here === `line:${w.id}`, state: 'n', bare: true, icon: 'chart' } as RailLine)),
      ],
    },
    ...(projects.length ? [{
      label: 'Projects',
      /* Each job's square and count are the control room board's own answer
         (ui/railJobs) — red with "late" in words if anything is past its day,
         otherwise under way. The rail does not read every job a second time. */
      lines: projects.map(p => {
        const s = stands.get(p.id);
        return {
          key: `job:${p.id}`, label: p.name, to: `/project/${p.id}`, on: false,
          state: s && s.late > 0 ? 'r' : s?.problem ? 'a' : 'w', n: s?.outstanding || undefined, late: s?.late || undefined, problem: s?.problem || undefined,
        } as RailLine;
      }),
    }] : []),
    /* The tools, at the foot under the jobs — where every job's rail has
       them. */
    { ...toolsGroup(here), foot: true },
  ];
  const all = groups.flatMap(g => g.lines);
  /* THE PHONE'S BAR, OFF A JOB: Home · Problems · Lines · More
     (FLOW-AUDIT.md, 11; Home first since #/ became the front door, 18
     October). It was the control room, the first three jobs and More, so
     the lines — the backbone now — and the problems taken on them were
     behind More. The jobs and the control room are one tap away still: in
     More (the whole rail), in the top bar's job picker (the control room
     first), and on the front door's own rows. */
  const onLines = here === 'factory' || here === 'lineprograms' || here.startsWith('line:');
  /* INSIDE A LINE STUDY the bar is the study's own screens — Capture ·
     Analyse · Evidence — so a stop logged is one tap from its ranking
     (docs/UPGRADE-AUDIT.md F2: Analyse was behind More, the walk's second
     dead end); the line's page and the rest are under More. */
  const study = loose && wsId ? studyLines(wsId, here).filter(l => l.key !== 'meeting').map(l => ({ ...l, sub: false })) : [];
  const bar: RailLine[] = study.length ? [
    ...all.filter(l => l.key === 'start'),
    ...study,
    { key: 'more', label: 'More', on: !study.some(l => l.on) && all.some(l => l.on && l.key !== 'start'), state: 'n', icon: 'grip' },
  ] : [
    ...all.filter(l => l.key === 'start'),
    { ...snagsPlace(here), label: 'Problems', icon: 'flag' },
    { key: 'lines', label: 'Lines', to: '/factory', on: onLines, state: 'n', bare: true, icon: 'machine' },
    { key: 'more', label: 'More', on: !onLines && all.some(l => l.on && l.key !== 'start' && l.key !== 'quicksnags'), state: 'n', icon: 'grip' },
  ];
  return <NavChrome groups={groups} bar={bar} home={projects} />;
}

/* ------------------------------------------------------------------------- */
/*  THE CHROME — the rail on a laptop, the bar and its sheet on a phone      */
/* ------------------------------------------------------------------------- */

function NavChrome({ groups, project, model, bar, home }: {
  groups: RailGroup[]; project?: Project; model?: PlanModel; bar?: RailLine[];
  /** Off a job: the control room's jobs, for its Reports. */
  home?: Project[];
}) {
  const five = bar ?? phoneBar(groups, model ?? 'commissioning');
  const [more, setMore] = useState(false);
  const [reports, setReports] = useState(false);
  /* Both close when the page under them changes — a sheet left open over a
     new screen is the old screen's. */
  const hash = useHash();
  useEffect(() => { setMore(false); setReports(false); }, [hash]);

  const go = (l: RailLine) => {
    setMore(false);
    if (l.key === 'reports') { setReports(true); return; }
    if (l.key === 'more') { setMore(true); return; }
    if (l.to) nav(l.to);
  };

  return (
    <>
      <aside className="nv-rail" aria-label="Where you are">
        <RailList groups={groups} go={go} />
      </aside>
      <nav className="nv-bar" aria-label="Where you are">
        {five.map(l => (
          <button key={l.key} type="button" className={'nv-bi' + (l.on ? ' is-on' : '')} onClick={() => go(l)}
            aria-current={l.on ? 'page' : undefined}
            aria-label={l.late || l.failed || l.problem ? [l.label, l.late ? `${l.late} late` : '', l.failed ? `${l.failed} failed` : '', l.problem ? `${l.problem} a problem` : ''].filter(Boolean).join(', ') : undefined}>
            <span className={'nv-bi-ic' + (l.late || l.failed ? ' is-late' : l.problem ? ' is-problem' : '')}><Icon name={l.icon ?? 'board'} size={22} /></span>
            <span className="nv-bi-l">{l.label}</span>
          </button>
        ))}
      </nav>
      {more && (
        <Sheet open onClose={() => setMore(false)} title={project?.name ?? 'Faultline'}>
          <div className="nv-sheet"><RailList groups={groups} go={go} /></div>
        </Sheet>
      )}
      {reports && project && <ReportsSheet project={project} onClose={() => setReports(false)} />}
      {reports && !project && home && <ControlRoomReports projects={home} onClose={() => setReports(false)} />}
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
