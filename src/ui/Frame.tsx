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
 * room, this job, the gate you are in, Fixes, More — and More opens the whole
 * rail as a sheet.
 *
 * What the rail holds, and which line is on, is worked out in ui/rail.ts
 * (pure, tested). The counts on its lines are lib/useStanding's and
 * lib/useMethodCounts' — the same numbers the client report prints.
 *
 * Every URL is unchanged. The frame reads the route; it never owns one.
 */
import { useEffect, useState, type ReactNode } from 'react';
import type { Route } from '../state/useRoute';
import { nav, useHash } from '../state/useRoute';
import type { Project } from '../types';
import { useProjects } from '../lib/useProjects';
import { usePaceLines } from '../lib/usePaceLines';
import { useStanding } from '../lib/useStanding';
import { useMethodCounts } from '../lib/useMethodCounts';
import { useWsChain } from '../lib/useTrail';
import { planModel, type PlanModel } from '../lib/planModel';
import { getWorkspace, listTestItems, listTests, onDataChange } from '../db';
import { gateOf } from '../lib/testing';
import { LogoMark } from './Logo';
import { Icon } from './Icon';
import { AccountMenu } from './AccountMenu';
import { Sheet } from './Sheet';
import { ReportsSheet } from './ReportsSheet';
import { useJobStands } from './railJobs';
import { QuickSnagButton, QuickSnagHost } from '../snag/QuickSnag';
import {
  controlRoom, toolsGroup, jobLine, gatesGroup, methodGroup, workGroup, linesGroup, footGroup, studyLines, phoneBar, hereOf,
  type RailGroup, type RailLine,
} from './rail';

/** Which job a route is under. Every `/project/:id/…` route carries the job
 *  as its `id`; a study's screens (`/w/:ws/…`) reach it through the chain the
 *  workspace hangs off; the 6M client report names it in its query. Read off
 *  the route's shape rather than a list of names, so a screen added under
 *  /project/:id later sits in the frame without being registered here. */
function projectOf(route: Route, chainProject?: string): string | undefined {
  if (route.wsId) return chainProject;
  if (route.name === 'paceReport') return route.query.get('project') ?? undefined;
  if (route.name === 'home' || route.name === 'projects' || route.name === 'share' || route.name === 'quickSnags' || route.name === 'lineTools' || route.name === 'studies' || route.name === 'study') return undefined;
  return route.id;
}

export function Frame({ route, children }: { route: Route; children: ReactNode }) {
  const { projects, archived, loading } = useProjects();
  const chain = useWsChain(route.wsId);
  const projectId = projectOf(route, chain?.projectId);
  /* An archived job still opens (from the archive), and still wears its rail. */
  const project = projectId ? (projects.find(p => p.id === projectId) ?? archived.find(p => p.id === projectId)) : undefined;
  const here = useHere(route, project);

  return (
    <div className="nv">
      <TopBar project={project} projects={projects} />
      {project
        ? <ProjectNav key={project.id} project={project} here={here} wsId={route.wsId} />
        /* While the job is still being read, only the first line — never the
           control room's list of jobs for a moment, then the job's rail. */
        : projectId && (loading || (route.wsId && chain === null))
          ? <NavChrome groups={[{ lines: [controlRoom(here)] }, toolsGroup(here)]} bar={[controlRoom(here)]} />
          : <HomeNav projects={projects} here={here} wsId={route.wsId} loose={!!route.wsId && chain === null} />}
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

function TopBar({ project, projects }: { project?: Project; projects: Project[] }) {
  /* An archived job is not in the live list, but it is the one you are in. */
  const options = project && !projects.some(p => p.id === project.id) ? [...projects, project] : projects;
  return (
    <header className="nv-top">
      <button type="button" className="nv-mark" onClick={() => nav('/')} aria-label="Faultline — the control room">
        <LogoMark size={28} id="nv" />
        <span className="nv-name">Faultline</span>
      </button>
      {/* WHICH JOB. A native select laid over the job's name: the phone's own
          picker, a list on a laptop, and the one control that already knows
          how to be a switcher. Its first option is the control room, so it is
          also the way up — "home is home". */}
      <label className="nv-job">
        <select value={project?.id ?? ''} aria-label="Which job"
          onChange={e => nav(e.target.value ? `/project/${e.target.value}` : '/')}>
          <option value="">Control room</option>
          {options.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <span className="nv-job-l" aria-hidden>{project?.name ?? 'Control room'}</span>
        <Icon name="chevronDown" size={14} />
      </label>
      {/* The search box that held search's place is gone until search exists
          (docs/FLOW.md item 3): a control that does nothing is not true yet.
          The gap keeps the snag button and you at the right. */}
      <span className="nv-gap" aria-hidden />
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
  const { lines } = usePaceLines(project.id);
  const notes = useOpenNotes(project.id);
  const shared = { project, here, wsId, lines, notes, model };
  return model === 'commissioning' ? <GateNav {...shared} /> : <MethodNav {...shared} method={model} />;
}

interface NavProps {
  project: Project; here: string; wsId?: string; model: PlanModel; notes: number;
  lines: { id: string; name: string; workspaceId?: string }[];
}

function GateNav(p: NavProps) {
  const stand = useStanding(p.project.id);
  const groups: RailGroup[] = [
    { lines: [controlRoom(p.here), jobLine(p.project.id, p.project.name, p.here, stand.standing.late,
      (['install', 'setup', 'handover'] as const).reduce((n, k) => n + (stand.counts[k]?.problem ?? 0), 0))] },
    gatesGroup(p.project.id, p.here, stand.counts),
    workGroup(p.project.id, p.model, p.here, stand.counts),
    footGroup(p.project.id, p.here, p.notes),
    /* The lines a stage-gate job filmed are tools it used, not its work —
       they go with the tools, under paper (docs/FLOW.md item 3). */
    toolsGroup(p.here, linesGroup(p.project.id, p.lines, p.here, p.wsId).lines),
  ];
  return <NavChrome groups={withJobStudy(groups, p.wsId, p.lines, p.here)} project={p.project} model={p.model} />;
}

function MethodNav(p: NavProps & { method: 'board' | 'tree' }) {
  const counts = useMethodCounts(p.project.id);
  const groups: RailGroup[] = [
    /* The job's square is red for anything late on it — its board's actions
       and what it waits on — the count its header and the control room say. */
    { lines: [controlRoom(p.here), jobLine(p.project.id, p.project.name, p.here, (counts.board?.late ?? 0) + (counts.materials?.late ?? 0))] },
    methodGroup(p.project.id, p.method, p.here, counts,
      { pareto: !!p.project.pareto, tree: p.method !== 'tree' && !!p.project.leverTree }),
    workGroup(p.project.id, p.model, p.here, counts),
    /* A running line's lines are what the job is about, so they stay with
       the work; only the tools go to the foot. */
    linesGroup(p.project.id, p.lines, p.here, p.wsId),
    footGroup(p.project.id, p.here, p.notes),
    toolsGroup(p.here),
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

/** On the control room, the Projects page, or a study attached to no line:
 *  the control room, then every job. A loose study (no project owns it) shows
 *  its name and its four screens under the control room. */
function HomeNav({ projects, here, wsId, loose }: { projects: Project[]; here: string; wsId?: string; loose: boolean }) {
  const [wsName, setWsName] = useState('');
  const stands = useJobStands();
  useEffect(() => {
    let live = true;
    if (!wsId) { setWsName(''); return; }
    void getWorkspace(wsId).then(w => { if (live) setWsName(w?.name ?? 'Line study'); });
    return () => { live = false; };
  }, [wsId]);
  const groups: RailGroup[] = [
    { lines: [controlRoom(here), ...(loose && wsId ? [
      { key: 'ws', label: wsName || 'Line study', to: `/w/${wsId}/capture`, on: false, state: 'n', bare: true } as RailLine,
      ...studyLines(wsId, here),
    ] : [])] },
    ...(projects.length ? [{
      label: 'Jobs',
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
  const bar: RailLine[] = [
    ...all.filter(l => l.key === 'home'),
    ...all.filter(l => l.key.startsWith('job:')).slice(0, 3).map(l => ({ ...l, icon: 'route' as const })),
    { key: 'more', label: 'More', on: all.some(l => l.on && l.key !== 'home'), state: 'n', icon: 'grip' },
  ];
  return <NavChrome groups={groups} bar={bar} />;
}

/* ------------------------------------------------------------------------- */
/*  THE CHROME — the rail on a laptop, the bar and its sheet on a phone      */
/* ------------------------------------------------------------------------- */

function NavChrome({ groups, project, model, bar }: {
  groups: RailGroup[]; project?: Project; model?: PlanModel; bar?: RailLine[];
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
