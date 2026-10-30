/* A MACHINE ON ITS LINE — EVERYTHING EVER DONE TO IT, ON ONE PAGE
 * (docs/STAGEGATE-RESEARCH.md §5, slice 4).
 *
 * Rowland, 26 October: "i like the idea of one record of the machine this
 * makes sense to me"; 27 October: "Do one record per machine". With one record
 * (lib/machineMerge), a machine's whole story can be read in one place: what it
 * is, the projects that worked on it, its programs, its problems, the studies
 * of it and its stops. A project's own page for it (screens/MachineScreen) is
 * that project's gates and runs; this is the line's — every project at once.
 *
 * No new record and no second answer: the programs are the line's Programs
 * reading (lib/lineRecords lineProgramsReading), a test's word is lib/testing's,
 * a problem is the register's, a study opens where it always does
 * (lib/studyLinks studyHref). Pure. */
import type { Observation, Project, Workspace } from '../types';
import type { Snag } from '../snag/types';
import type { Asset, Test } from './testing';
import { isSettled, outcomeWord } from './testing';
import type { Program } from './programs';
import type { ToolStudy } from './study';
import { lineProgramsReading, machineKey, machinesOnLine, programsOnLine, type JobLine } from './lineRecords';
import type { ProgramLine } from './programsReport';
import { studyHref } from './studyLinks';
import { toolLabel } from '../catalogue/registry';
import type { Standard } from '../tools/linestandard/standard';

/** How far back the stops are counted. */
export const STOP_DAYS = 28;

export interface LineMachineView {
  name: string;
  /** Its record, when more than its name is known. */
  record?: Asset;
  oem?: string;
  /** "The line's own" or "With Line 2 commissioning" — who is working on it. */
  whose: string;
  /** Every project that has done anything to it: its tests, what is open, the way to its page there. */
  projects: { id: string; name: string; tests: number; open: number; failed: number; last?: string; href: string }[];
  programs: ProgramLine[];
  /** The register's problems on it, the open first. */
  problems: { id: string; what: string; priority: 'critical' | 'high' | 'low'; open: boolean; href: string }[];
  studies: { id: string; name: string; tool: string; href: string }[];
  /** Its stops in the last STOP_DAYS days, as timed on the line. */
  stops: { n: number; minutes: number };
  /** The page's one sentence. */
  says: string;
}

export interface LineMachineInput {
  ws: Pick<Workspace, 'id' | 'name' | 'assets'>;
  assets: readonly Asset[];
  jobLines: readonly JobLine[];
  jobs: readonly Pick<Project, 'id' | 'name' | 'deletedAt'>[];
  programs: readonly Program[];
  tests: readonly Test[];
  snags: readonly Snag[];
  studies: readonly ToolStudy[];
  /** The line standards a program's Line capacity criterion is read from. */
  standards?: readonly Standard[];
  stops: readonly Observation[];
  now: number;
  /** What each project's floor said of its programs, and the projects' names — the line's Programs page's own
   *  options (lib/lineRecords lineProgramsReading), so a program reads here as it reads there. */
  floor?: NonNullable<Parameters<typeof lineProgramsReading>[2]>['floor'];
  jobNames?: ReadonlyMap<string, string>;
  today?: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The machine of that name on the line — undefined when the line does not have it. */
export function lineMachineView(name: string, i: LineMachineInput): LineMachineView | undefined {
  const k = machineKey(name);
  const m = machinesOnLine(i.ws, i.assets, i.jobLines).find(x => machineKey(x.name) === k);
  if (!m) return undefined;
  const rec = m.record;
  const jobName = (id: string) => i.jobs.find(j => j.id === id && !j.deletedAt)?.name ?? 'a project';

  /* the projects that did anything to it — by its tests (one record, so every project's) */
  const mine = rec ? i.tests.filter(t => !t.deletedAt && t.assetId === rec.id) : [];
  const byJob = new Map<string, Test[]>();
  for (const t of mine) byJob.set(t.projectId, [...(byJob.get(t.projectId) ?? []), t]);
  if (rec?.projectId && !byJob.has(rec.projectId)) byJob.set(rec.projectId, []);
  const projects = [...byJob].map(([id, ts]) => {
    const done = ts.filter(t => t.ranOn).sort((a, b) => (b.ranOn as string).localeCompare(a.ranOn as string))[0];
    return {
      id, name: jobName(id), tests: ts.length,
      open: ts.filter(t => !isSettled(t)).length,
      failed: ts.filter(t => t.outcome === 'failed').length,
      ...(done ? { last: `${done.title} — ${outcomeWord(done)}` } : {}),
      /* the project itself — its part for this machine is on this page (27 October: one machine, one page) */
      href: `/project/${id}`,
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  /* its programs, as the line's Programs page reads them */
  const progs = rec ? programsOnLine(i.ws.id, i.programs, i.jobLines).filter(p => p.assetId === rec.id) : [];
  const reading = progs.length ? lineProgramsReading([{ name: i.ws.name, id: i.ws.id, machines: [m], programs: progs }], i.today, { tests: i.tests, studies: i.studies, ...(i.standards ? { standards: i.standards } : {}), ...(i.floor ? { floor: i.floor } : {}), ...(i.jobNames ? { jobName: i.jobNames } : {}) }) : undefined;
  const programs = (reading?.lines ?? []).filter(l => !rec || l.assetId === rec.id);

  /* the register's problems on it — the line's own, by its name (Snag.targetAsset) */
  const problems = i.snags
    .filter(s => !s.deletedAt && !s.archivedAt && s.workspaceId === i.ws.id && !!s.targetAsset && machineKey(s.targetAsset) === k)
    .map(s => ({ id: s.id, what: s.problem, priority: s.priority ?? 'low', open: s.status !== 'closed', href: `/snags?line=${encodeURIComponent(i.ws.id)}&open=${encodeURIComponent(s.id)}` }))
    .sort((a, b) => Number(b.open) - Number(a.open) || ['critical', 'high', 'low'].indexOf(a.priority) - ['critical', 'high', 'low'].indexOf(b.priority));

  /* the studies of it — pointed at its record (slice 2), else naming it on this line */
  const studies = i.studies
    .filter(s => !s.deletedAt && ((rec && s.assetId === rec.id) || (s.workspaceId === i.ws.id && !!s.machine && machineKey(s.machine) === k)))
    .sort((a, b) => b.startedAt - a.startedAt)
    .map(s => ({ id: s.id, name: s.name, tool: toolLabel(s.tool), href: studyHref(s) }));

  /* its stops, as timed on the line */
  const since = i.now - STOP_DAYS * 86_400_000;
  const st = i.stops.filter(o => !o.deletedAt && o.workspaceId === i.ws.id && machineKey(o.asset) === k && o.startedAt >= since);
  const stops = { n: st.reduce((n, o) => n + (o.count || 1), 0), minutes: Math.round(st.reduce((n, o) => n + o.durationMs, 0) / 60_000) };

  const whose = rec?.projectId ? `With ${jobName(rec.projectId)}` : "The line's own";
  const openProblems = problems.filter(p => p.open).length;
  const says = [
    whose,
    projects.length ? `worked on by ${plural(projects.length, 'project')}` : '',
    programs.length ? plural(programs.length, 'program') : 'no programs',
    openProblems ? `${plural(openProblems, 'problem')} open` : 'no problem open',
    stops.n ? `${plural(stops.n, 'stop')}, ${stops.minutes} min in ${STOP_DAYS} days` : `no stops timed in ${STOP_DAYS} days`,
  ].filter(Boolean).join(' · ') + '.';

  return { name: m.name, ...(rec ? { record: rec } : {}), ...(rec?.oem ? { oem: rec.oem } : {}), whose, projects, programs, problems, studies, stops, says };
}
