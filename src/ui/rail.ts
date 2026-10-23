/* THE RAIL — the structure of the app, drawn once, read by ui/Frame.
 *
 * Rowland, 5 October: "too many doors opening… what's home is home, really
 * home, or the project home? it's just messy." Every level of the app had
 * been built as its own home — a spine with a back pill, a row of pill tabs
 * per level (five different rows), and a set of header buttons per screen.
 * Walking in you passed four of them, so "back" never felt like back.
 *
 * This file is the one place that knows what sits under what:
 *
 *   Control room
 *   the job                       (on, on its front page)
 *   Gates     Install · Set up · Commission · Hand over     — a stage-gate job
 *   Method    Fishbone · Board · Lines · Results — a 6M job (B5, D9: Numbers and Wins one page,
 *             Results; Evidence is the project's Tools, with the filmed line on it)
 *             Tree · Board · Lines · …                      — a lever tree job
 *   Work      Fixes · Materials · The plan · The day
 *   Lines     each line, by the factory's name, opening the factory's line
 *             (#/lines/:ws); under it, inside its study: Capture · Analyse ·
 *             Evidence · Meeting                    — a 6M or lever tree job
 *             Reports · Notes · Details
 *   Tools     Line standard · Line capacity · …     (and, on a stage-gate
 *             job, its lines)
 *
 * Control room problems sits under the Control room on every rail: the
 * register is the control room's page, never a tool (docs/FLOW-AUDIT.md #20).
 *
 * It is pure: a route and the counts in, groups of lines out. The counts come
 * from lib/useStanding and lib/useMethodCounts — the same numbers the client
 * report prints — so the rail and the paper cannot disagree about how many
 * are outstanding. On a laptop the groups are the left rail; on a phone five
 * of the lines are the bar at the foot and the rest are the "More" sheet.
 */
import { APP_TOOLS } from '../catalogue/registry';
import type { Route } from '../state/useRoute';
import type { PlanModel } from '../lib/planModel';
import { inProject } from '../lib/inProject';

/** How many are open, how many of those are late, and how many are already
 *  done — the three numbers a rail line's square and count are drawn from. */
export interface Count { n: number; late: number; done?: number;
  /** Of `n`, the ones that failed — a program that failed is not late, and
   *  the rail says "failed" in words as its page does (docs/STAGEGATE.md:
   *  the rail said Programs "1 late" where the page said 0 late, 1 failed). */
  failed?: number;
  /** Stages that hit a problem and lost no time (lib/install lateOrProblem) —
   *  amber, said apart from late. */
  problem?: number }
export type Counts = Record<string, Count | undefined>;

/** The square beside a rail line: red if any of it is late, amber if a stage
 *  hit a problem and lost no time, indigo if it is under way, green when all
 *  of it is done, grey when nothing has started (CLAUDE.md, visual
 *  management rule 1). */
export type SquareState = 'r' | 'a' | 'w' | 'g' | 'n';

export const squareOf = (c?: Count): SquareState =>
  !c ? 'n' : c.late + (c.failed ?? 0) > 0 ? 'r' : (c.problem ?? 0) > 0 ? 'a' : c.n > 0 ? 'w' : (c.done ?? 0) > 0 ? 'g' : 'n';

export interface RailLine {
  /** The key the route resolves to (`hereOf`), so the line knows it is on. */
  key: string;
  label: string;
  /** Where it goes. Absent for a line that opens something in place (Reports). */
  to?: string;
  on: boolean;
  state: SquareState;
  /** The whole number is the work and stays neutral; only the late part is
   *  red, and says "late" in words (Peers.Count's rule, kept). */
  n?: number;
  late?: number;
  /** Of `n`, the ones that failed — red, said "failed". */
  failed?: number;
  /** Of `n`, the stages that hit a problem and lost no time — amber, and
   *  said "a problem" in words (lib/install lateOrProblem). */
  problem?: number;
  /** Drawn indented — a study's screens under their line. */
  sub?: boolean;
  /** A place rather than a list — the control room, a lens, a line, paper.
   *  It has no state of its own, so it is drawn with no square: a grey one
   *  would say "not started", which is not true of the control room. */
  bare?: boolean;
  /** The phone's bar icon, when this line can be one of its five. */
  icon?: 'home' | 'route' | 'machine' | 'flag' | 'board' | 'grip' | 'chart' | 'list' | 'time' | 'camera' | 'people' | 'hash' | 'mic' | 'arrowUp' | 'plus';
}

/** `foot`: drawn at the bottom of the rail — paper, the next meeting, what
 *  is set once — apart from the work above it. */
export interface RailGroup { label?: string; lines: RailLine[]; foot?: boolean }

/* ------------------------------------------------------------------------- */
/*  WHERE YOU ARE, as the key of the rail line that is on                     */
/* ------------------------------------------------------------------------- */

/** The study's screens, folded onto the four the rail draws (the Log is
 *  Capture's list; the trend and the case are Analyse; the walk, a segment, a
 *  frame and its history are Evidence; present and the one-page report are
 *  the Meeting's) — and the plan, which is becoming a page of its own
 *  (/project/:id/plan) and is matched by name so it lights its line the day
 *  that route lands. */
const KEY_OF: Record<string, string> = {
  plan: 'plan',
  capture: 'capture', log: 'capture', settings: 'capture', people: 'capture',
  analyse: 'analyse', trend: 'analyse', case: 'analyse',
  snags: 'snaglist', snaglist: 'snaglist', line: 'snaglist', segment: 'snaglist', asset: 'snaglist', history: 'snaglist', walk: 'snaglist',
  meeting: 'meeting', report: 'meeting', present: 'meeting',
};

/** Which rail line a route stands on. A project's front page is the job
 *  itself; `?view=` on it is one of the method's lenses; every other screen
 *  is its own line. A screen with no line of its own (a test's page, the
 *  line standard) returns '' and nothing is marked, since the rail still says
 *  which job it is under. */
export function hereOf(route: Route): string {
  switch (route.name) {
    case 'home': return 'home';
    case 'start': return 'start';
    case 'projects': return 'projects';
    case 'quickSnags': return 'quicksnags';
    case 'lineHome': return `line:${route.wsId}`;
    case 'factory': return 'factory';
    case 'linePrograms': return 'lineprograms';
    case 'videos': case 'videoStudy': return 'video';
    case 'talks': case 'talk': return 'talk';
    case 'lineTools': return route.view === 'balance' ? 'linebalance' : route.view === 'work' ? 'linework' : 'linestandard';
    /* a line's own product — its map, its line balance (?at=work) or its
       Line capacity (?at=balance) — lights the tool it is, as the list does */
    case 'lineStandards': return route.query.get('at') === 'work' || route.query.get('view') === 'work' ? 'linework' : route.query.get('at') === 'balance' ? 'linebalance' : 'linestandard';
    case 'studies': case 'study': return route.view === 'map' ? 'valuestream' : route.view === 'changeover' ? 'changeover' : route.view === 'sampling' ? 'sampling' : route.view === 'losses' ? 'losses' : route.view === 'reliability' ? 'reliability' : 'capability';
    case 'projectDashboard': {
      const v = route.query.get('view');
      /* `next` is the board as a list; `snags` on a stage-gate job is sent to
         Install by the screen itself. */
      return !v || v === 'overview' ? 'job' : v === 'next' ? 'board' : v;
    }
    case 'install': return 'install';
    case 'gateSetup': return 'setup';
    case 'programs': return 'programs';
    case 'machine': return `machine:${route.lineId ?? ''}`;
    case 'testing': case 'test': case 'trialCard': return 'testing';
    case 'handover': return 'handover';
    case 'fixes': return 'fixes';
    case 'materials': return 'materials';
    case 'actions': return 'actions';
    case 'allActions': return 'allactions';
    case 'day': return 'day';
    case 'notes': return 'notes';
    case 'projectSetup': return 'details';
    case 'board': return 'board';
    case 'leverTree': return 'tree';
    case 'fishbone': return 'fishbone';
    case 'pareto': return 'pareto';
    case 'projectLine': return route.lineId ? `line:${route.lineId}` : '';
    case 'clientReport': case 'paceReport': return 'reports';
    default: return KEY_OF[route.name] ?? '';
  }
}

/* ------------------------------------------------------------------------- */
/*  THE GROUPS                                                                */
/* ------------------------------------------------------------------------- */

const sum = (counts: Counts, keys: string[], f: (c: Count) => number): number =>
  keys.reduce((n, k) => n + (counts[k] ? f(counts[k] as Count) : 0), 0);

/** A line whose number is the sum of several strands — Set up counts its
 *  steps and the programs not yet proved together, as the Set up tab did. */
function counted(key: string, label: string, to: string, here: string, counts: Counts, keys: string[] = [key],
  icon?: RailLine['icon']): RailLine {
  const c: Count = { n: sum(counts, keys, x => x.n), late: sum(counts, keys, x => x.late), done: sum(counts, keys, x => x.done ?? 0),
    problem: sum(counts, keys, x => x.problem ?? 0), failed: sum(counts, keys, x => x.failed ?? 0) };
  return { key, label, to, on: here === key, state: squareOf(c), n: c.n || undefined, late: c.late || undefined, failed: c.failed || undefined, problem: c.problem || undefined, icon };
}

const plain = (key: string, label: string, to: string, here: string, icon?: RailLine['icon']): RailLine =>
  ({ key, label, to, on: here === key, state: 'n', bare: true, icon });

/** The first line of every rail. */
export const controlRoom = (here: string): RailLine =>
  ({ key: 'home', label: 'Control room', to: '/room', on: here === 'home', state: 'n', bare: true, icon: 'home' });

/** THE TOOLS — the line standard, Line capacity and the studies. Rowland,
 *  8 October: "we want line standard and line balancing as tools like snag
 *  ... same principle: use independent or connect to project." Each is used
 *  on a line with no job, and attached to one when it is wanted (LINE_TOOLS.sql,
 *  screens/LineToolsScreen). The problems register sat first here; it went up
 *  under the control room (snagsPlace) — a problem is a record, not a tool.
 *  Read from the catalogue since 23 October (src/catalogue/registry — what
 *  each one is for is its entry's), in the floor's order. */
export const toolPlaces = (here: string, projectId?: string): RailLine[] => APP_TOOLS.map(t => ({
  key: t.key, label: t.label, to: projectId ? inProject(t.to, projectId) : t.to, on: here === t.key, state: 'n', bare: true, icon: t.icon,
}) as RailLine);

/** The job itself — on its front page, where the method's answer is. */
export const jobLine = (projectId: string, name: string, here: string, late = 0, problem = 0): RailLine =>
  ({ key: 'job', label: name, to: `/project/${projectId}`, on: here === 'job', state: late > 0 ? 'r' : problem > 0 ? 'a' : 'w', icon: 'route' });

/** THE GATES, in the order the job goes through them — Install, Set up,
 *  Commission, Hand over (Rowland: "install — next gate set up, programs;
 *  next commissioning; after that handover"). The tests' key stays
 *  'testing' because it is the URL and the count every screen already uses. */
export const GATE_KEYS = ['install', 'setup', 'testing', 'handover'] as const;
export type GateKey = typeof GATE_KEYS[number];
export const GATE_PATH: Record<GateKey, string> = { install: 'install', setup: 'set-up', testing: 'testing', handover: 'handover' };

/** THE MACHINES of a stage-gate job, each a page of its own (docs/
 *  STAGEGATE-UX.md slice 3) — in the job's order, each with its square:
 *  red when anything on it is late or failed, amber a problem with no time
 *  lost, green handed over, indigo under way, grey nothing started. */
export interface RailMachine { id: string; name: string; state: SquareState;
  /** Its stages and tests not done — the work, neutral; of them, `late` red. */
  open?: number; late?: number }
export interface RailLineOf { id: string; name: string; workspaceId?: string;
  /** The factory's name for the line, when the job's line is one of Your
   *  factory's. The rail then says that name and opens the line's own page
   *  (#/lines/:ws) — never the job's copy of it under a name of its own
   *  ("Line 8" for Line 7 — smoke test; docs/FLOW-AUDIT.md #7). */
  factoryName?: string }

/** The screens of a line study, drawn under the line they belong to (or
 *  under the job, when the job's own line was filmed). The line's maps and
 *  capacities were a fifth line here, "Maps and balance": a second door to
 *  what Tools › Line standard and Line capacity open, and what the line's own
 *  page lists as its tools — it went (docs/FLOW-AUDIT.md #7, #20), and a
 *  product of the line lights its tool instead (hereOf, lineStandards). */
export function studyLines(wsId: string, here: string): RailLine[] {
  const s = (key: string, label: string, to: string, icon: RailLine['icon']): RailLine =>
    ({ key, label, to: `/w/${wsId}/${to}`, on: here === key, state: 'n', sub: true, bare: true, icon });
  return [
    s('capture', 'Capture', 'capture', 'time'), s('analyse', 'Analyse', 'analyse', 'chart'),
    s('snaglist', 'Evidence', 'snaglist', 'camera'), s('meeting', 'Meeting', 'meeting', 'people'),
  ];
}

/** LINES — each line of the project, and under the one whose study you are
 *  inside, that study's four screens. Two lines can share one study (it was
 *  filmed across both); its screens are drawn once, under the first.
 *
 *  A JOB POINTS AT THE FACTORY'S LINE (docs/BLUEPRINT.md §1 rule 2). A line
 *  of Your factory is said by the factory's name and opens the line's own
 *  page, where the job is listed; two of the job's lines on one factory line
 *  are that one line, once. A job's line not yet in the factory keeps the
 *  job's page for it. */
export function linesGroup(projectId: string, lines: RailLineOf[], here: string, wsId?: string): RailGroup {
  const out: RailLine[] = [];
  const seen = new Set<string>();
  let drawn = false;
  for (const l of lines) {
    const fac = l.factoryName && l.workspaceId ? l.workspaceId : undefined;
    if (fac && seen.has(fac)) continue;
    if (fac) seen.add(fac);
    out.push(fac
      ? plain(`line:${l.id}`, l.factoryName as string, `/lines/${fac}`, here, 'hash')
      : plain(`line:${l.id}`, l.name, `/project/${projectId}/line/${l.id}`, here, 'hash'));
    if (wsId && !drawn && l.workspaceId === wsId) { out.push(...studyLines(wsId, here)); drawn = true; }
  }
  return { label: 'Lines', lines: out };
}

/* ========================================================================= */
/*  THE SCOPES' RAILS (docs/STRUCTURE.md §5.2–§5.3, B2, approved 23 October)  */
/* ========================================================================= */
/* You are always in one scope — the factory, a line or a project (lib/scope) —
   and the rail holds that scope's pages and the way up, nothing else. Before 23
   October one rail drew the whole app at once: 25 lines off a project, 27 in
   one, every line, project and tool adding one more. The tools are a page of
   each scope now (Tools), listed by their kind (src/catalogue/registry); lines
   and projects are one tap away in the context bar's switcher. */

/** The way up — from a line or a project to the factory. */
export const upLine = (): RailLine => ({ key: 'up', label: 'Factory', to: '/room', on: false, state: 'n', bare: true, icon: 'arrowUp' });

/** THE FACTORY'S PAGES — every line and project at once. */
export function factoryGroups(here: string, projects = 0): RailGroup[] {
  return [{
    lines: [
      { ...controlRoom(here), icon: 'list' },
      plain('allactions', 'Actions', '/actions', here, 'list'),
      { key: 'quicksnags', label: 'Problems', to: '/snags', on: here === 'quicksnags', state: 'n', bare: true, icon: 'flag' },
      { ...plain('projects', 'Projects', '/projects', here, 'board'), n: projects || undefined },
      plain('factory', 'Lines', '/factory', here, 'machine'),
      plain('lineprograms', 'Programs', '/programs', here, 'list'),
      plain('tools', 'Tools', '/tools', here, 'chart'),
    ],
  }, { foot: true, lines: [{ key: 'reports', label: 'Reports', on: false, state: 'n', bare: true, icon: 'list' }] }];
}

/** Where a line's page puts you — its overview, or one of its pages. */
export const lineHref = (wsId: string, view?: string): string => `/lines/${encodeURIComponent(wsId)}${view ? `?view=${view}` : ''}`;

/** THE LINE'S PAGES — the line as a place, no project needed. Its problems and its
 *  programs are the factory's lists narrowed to it; its products are its standards,
 *  product by product; its tools the studies and documents used on it; its log the
 *  stops timed (B6 folds the line study in). */
export function lineGroups(wsId: string, here: string, counts: { problems?: Count; programs?: Count; projects?: number } = {}): RailGroup[] {
  return [
    { lines: [upLine()] },
    { lines: [
      plain('overview', 'Overview', lineHref(wsId), here, 'home'),
      counted('problems', 'Problems', `/snags?line=${encodeURIComponent(wsId)}`, here, { problems: counts.problems }, ['problems'], 'flag'),
      counted('programs', 'Machines & programs', `/programs?line=${encodeURIComponent(wsId)}`, here, { programs: counts.programs }, ['programs'], 'machine'),
      plain('products', 'Products', lineHref(wsId, 'products'), here, 'list'),
      plain('tools', 'Tools', lineHref(wsId, 'tools'), here, 'chart'),
      plain('logs', 'Logs', `/w/${encodeURIComponent(wsId)}/capture`, here, 'time'),
      { ...plain('projects', 'Projects', lineHref(wsId, 'projects'), here, 'board'), n: counts.projects || undefined },
    ] },
    { foot: true, lines: [
      { key: 'reports', label: 'Reports', on: false, state: 'n', bare: true, icon: 'list' },
      plain('setup', 'Set up', lineHref(wsId, 'setup'), here),
    ] },
  ];
}

/** A PROJECT'S PAGES — its overview, its type's own pages (lib/planModel), then
 *  what every project has: Actions, Problems, Tools; Notes, Reports, Details at
 *  the foot. A stage gate's machines fold under Machines past six. */
export function projectGroups(o: {
  projectId: string; name: string; model: PlanModel; here: string; counts: Counts;
  late: number; problem?: number; machines?: readonly RailMachine[]; lines?: RailLineOf[]; notes?: number;
  tools?: { pareto?: boolean; tree?: boolean };
  /** Inside a line study: its line, so its four screens sit under that line. */
  wsId?: string;
}): RailGroup[] {
  const p = `/project/${o.projectId}`;
  const job: RailLine = { ...jobLine(o.projectId, 'Overview', o.here, o.late, o.problem ?? 0), icon: 'home' };
  let own: RailLine[];
  if (o.model === 'commissioning') {
    const at = GATE_KEYS.find(k => (o.counts[k]?.n ?? 0) > 0);
    const plan = counted('plan', 'Plan', at ? `${p}/${GATE_PATH[at]}` : `${p}/plan`, o.here, o.counts, [...GATE_KEYS], 'machine');
    const machines = o.machines ?? [];
    const each: RailLine[] = machines.length <= 6
      ? machines.map(m => ({ key: `machine:${m.id}`, label: m.name, to: `${p}/machine/${encodeURIComponent(m.id)}`, on: o.here === `machine:${m.id}`, state: m.state, sub: true, ...(m.open ? { n: m.open } : {}), ...(m.late ? { late: m.late } : {}), icon: 'machine' as const }))
      /* past six, one line — the plan lists them, machine by machine */
      : [{ key: 'machines', label: `Machines (${machines.length})`, to: `${p}/plan`, on: o.here.startsWith('machine:'), state: machines.some(m => m.state === 'r') ? 'r' : 'w', sub: true, late: machines.reduce((n, m) => n + (m.late ?? 0), 0) || undefined, icon: 'machine' as const }];
    own = [
      { ...plan, on: o.here === 'plan' || (GATE_KEYS as readonly string[]).includes(o.here) },
      ...each,
      counted('programs', 'Programs', `${p}/programs`, o.here, o.counts, ['programs'], 'list'),
      counted('materials', 'Materials', `${p}/materials`, o.here, o.counts, ['materials'], 'list'),
      plain('day', 'The day', `${p}/day`, o.here, 'time'),
    ];
  } else {
    const t = o.tools ?? {};
    own = [
      ...(o.model === 'board' ? [plain('fishbone', 'Fishbone', `${p}/fishbone`, o.here, 'route')] : []),
      ...(o.model === 'tree' || t.tree ? [plain('tree', 'Tree', `${p}/tree`, o.here, 'route')] : []),
      counted('board', 'Board', `${p}/board`, o.here, o.counts, ['board'], 'board'),
      plain('lines', 'Lines', `${p}?view=lines`, o.here, 'chart'),
      ...linesGroup(o.projectId, o.lines ?? [], o.here, o.wsId).lines.map(l => ({ ...l, sub: true })),
      /* RESULTS (docs/STRUCTURE.md D9, B5): the readings against target and what worked, one page with
         two views — Numbers and Wins were two lines; Evidence is the project's Tools, below */
      { ...plain('results', 'Results', `${p}?view=data`, o.here, 'chart'), on: o.here === 'data' || o.here === 'wins' },
      ...(t.pareto ? [plain('pareto', 'Pareto', `${p}/pareto`, o.here, 'chart')] : []),
      counted('materials', 'Materials', `${p}/materials`, o.here, o.counts, ['materials'], 'list'),
    ];
  }
  return [
    { lines: [upLine()] },
    { label: o.name, lines: [job, ...own] },
    { lines: [
      plain('actions', 'Actions', `${p}/actions`, o.here, 'list'),
      ...(o.model === 'commissioning' ? [counted('fixes', 'Problems', `${p}/fixes`, o.here, o.counts, ['fixes'], 'flag')] : [plain('problems', 'Problems', `/snags?project=${encodeURIComponent(o.projectId)}`, o.here, 'flag')]),
      plain('tools', 'Tools', `${p}/tools`, o.here, 'chart'),
    ] },
    { foot: true, lines: [
      { key: 'notes', label: 'Notes', to: `${p}/notes`, on: o.here === 'notes', state: 'n', bare: true, n: o.notes || undefined },
      { key: 'reports', label: 'Reports', on: o.here === 'reports', state: 'n', bare: true },
      plain('details', 'Details', `${p}/setup`, o.here),
    ] },
  ];
}

/** ＋ in the middle of a phone's bar: a new problem, where you are — one tap, as the
 *  round button was (docs/STRUCTURE.md §5.3; D6). */
export const plusLine = (): RailLine => ({ key: 'plus', label: 'Problem', on: false, state: 'n', bare: true, icon: 'plus' });

/** THE PHONE'S BAR, FIXED WITHIN A SCOPE (D6): the factory — Control room · Actions ·
 *  ＋ · Problems · More; a line — Overview · Tools · ＋ · Problems · More; a project —
 *  Overview · its main page (Plan, Fishbone or Tree) · ＋ · Actions · More. ＋ only for
 *  somebody who may take a problem there. More is on when the page lives in the sheet. */
export function scopeBar(kind: 'factory' | 'line' | 'project', groups: RailGroup[], model?: PlanModel, plus = true): RailLine[] {
  const all = groups.flatMap(g => g.lines);
  const by = (k: string) => all.find(l => l.key === k);
  const two: (RailLine | undefined)[] = kind === 'factory' ? [by('home'), by('allactions')]
    : kind === 'line' ? [by('overview'), by('tools')]
      : [by('job'), by(model === 'commissioning' ? 'plan' : model === 'tree' ? 'tree' : 'fishbone') ?? by('board')];
  const last = kind === 'project' ? by('actions') : kind === 'line' ? by('problems') : by('quicksnags');
  const five = [...two, ...(plus ? [plusLine()] : []), last].filter((l): l is RailLine => !!l);
  const onBar = five.some(l => l.on);
  return [
    ...five.map(l => (l.key === 'job' ? { ...l, label: 'Overview' } : l)),
    { key: 'more', label: 'More', on: !onBar && all.some(l => l.on), state: 'n', icon: 'grip' },
  ];
}

/** WHICH PAGE OF ITS SCOPE a route is — the rail line that is on (docs/STRUCTURE.md §5.2). */
export function hereIn(route: Route, scope: 'home' | 'factory' | 'line' | 'project'): string {
  const tool = ['lineTools', 'studies', 'study', 'videos', 'videoStudy', 'talks', 'talk'].includes(route.name);
  if (scope === 'line') {
    if (route.name === 'lineHome') { const v = route.query.get('view'); return v && ['products', 'tools', 'projects', 'setup'].includes(v) ? v : 'overview'; }
    if (route.name === 'quickSnags') return 'problems';
    if (route.name === 'linePrograms') return 'programs';
    if (route.name === 'lineTools' || route.name === 'lineStandards') return 'products';
    if (tool) return 'tools';
    if (route.wsId) return 'logs';
    return '';
  }
  if (scope === 'project') {
    if (route.name === 'projectTools' || tool || route.name === 'lineStandards') return 'tools';
    if (route.name === 'quickSnags') return 'problems';
    return hereOf(route);
  }
  if (tool || route.name === 'tools') return 'tools';
  return hereOf(route);
}
