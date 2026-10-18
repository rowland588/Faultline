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
 *   Method    Fishbone · Board · Lines · Numbers · Wins · Evidence — a 6M job
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
import type { Route } from '../state/useRoute';
import type { PlanModel } from '../lib/planModel';

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
  icon?: 'home' | 'route' | 'machine' | 'flag' | 'board' | 'grip' | 'chart' | 'list' | 'time' | 'camera' | 'people' | 'hash';
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
    case 'quickSnags': return 'quicksnags';
    case 'lineHome': return `line:${route.wsId}`;
    case 'factory': return 'factory';
    case 'linePrograms': return 'lineprograms';
    case 'methods': case 'method': case 'design': return 'methods';
    case 'videos': case 'videoStudy': return 'video';
    case 'lineTools': return route.view === 'balance' ? 'linebalance' : route.view === 'work' ? 'linework' : 'linestandard';
    /* a line's own product — its map, its line balance (?at=work) or its
       Line capacity (?at=balance) — lights the tool it is, as the list does */
    case 'lineStandards': return route.query.get('at') === 'work' || route.query.get('view') === 'work' ? 'linework' : route.query.get('at') === 'balance' ? 'linebalance' : 'linestandard';
    case 'studies': case 'study': return route.view === 'map' ? 'valuestream' : route.view === 'changeover' ? 'changeover' : route.view === 'sampling' ? 'sampling' : route.view === 'losses' ? 'losses' : 'capability';
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
  ({ key: 'home', label: 'Control room', to: '/', on: here === 'home', state: 'n', bare: true, icon: 'home' });

/** EVERY PROBLEM, every line — under the control room on every rail, because
 *  a problem is taken from anywhere (snag/QuickSnag) and sent on from there.
 *  The register is the control room's own page, not a tool, so it never sits
 *  in Tools (docs/FLOW-AUDIT.md #20). */
export const snagsPlace = (here: string): RailLine =>
  ({ key: 'quicksnags', label: 'Control room problems', to: '/snags', on: here === 'quicksnags', state: 'n', bare: true, icon: 'camera' });

/** THE TOOLS — the line standard, Line capacity and the studies. Rowland,
 *  8 October: "we want line standard and line balancing as tools like snag
 *  ... same principle: use independent or connect to project." Each is used
 *  on a line with no job, and attached to one when it is wanted (LINE_TOOLS.sql,
 *  screens/LineToolsScreen). The problems register sat first here; it went up
 *  under the control room (snagsPlace) — a problem is a record, not a tool. */
export const toolPlaces = (here: string): RailLine[] => [
  { key: 'linestandard', label: 'Line standard', to: '/standards', on: here === 'linestandard', state: 'n', bare: true, icon: 'people' },
  /* The line balance — the people's work, timed at the line against takt, and what the bottleneck costs (17 October). */
  { key: 'linework', label: 'Line balance', to: '/linebalance', on: here === 'linework', state: 'n', bare: true, icon: 'time' },
  { key: 'linebalance', label: 'Line capacity', to: '/balances', on: here === 'linebalance', state: 'n', bare: true, icon: 'chart' },
  /* The capability study — readings against agreed limits, Cpk out (docs/TOOLKIT.md, tool 1). */
  { key: 'capability', label: 'Capability', to: '/capability', on: here === 'capability', state: 'n', bare: true, icon: 'hash' },
  /* The value stream map — always a line's, the departments that touch it included, as a swimlane grid (tool 2). */
  { key: 'valuestream', label: 'Value stream', to: '/value-stream', on: here === 'valuestream', state: 'n', bare: true, icon: 'route' },
  /* SMED, quick changeover — Shingo's stages on a grid of who does what, the ladder to single-digit minutes, what the changeovers cost (tool 6). */
  { key: 'changeover', label: 'SMED', to: '/smed', on: here === 'changeover', state: 'n', bare: true, icon: 'time' },
  /* Work sampling — what people are doing at random moments of a shift, one tap per person, every share with its margin (tool 9). */
  { key: 'sampling', label: 'Work sampling', to: '/sampling', on: here === 'sampling', state: 'n', bare: true, icon: 'people' },
  /* A shift's losses by hand — two counts at the end of the shift and the stops already timed; the waterfall, in minutes and pounds (tool 7). */
  { key: 'losses', label: 'Loss count', to: '/losses', on: here === 'losses', state: 'n', bare: true, icon: 'time' },
  /* A video study — footage of the line read for the work at each station, reviewed, worked out as a line balance (docs/VIDEO.md). */
  { key: 'video', label: 'Video study', to: '/video', on: here === 'video', state: 'n', bare: true, icon: 'camera' },
];

/** THE TOOLS AS ONE GROUP, at the foot of every rail, under paper and
 *  details. Rowland, 10 October, on the flow audit (docs/FLOW.md item 3):
 *  the rail leads with the job — its front page, its gates, its work — and
 *  the tools used inside it come after, where they no longer push the job
 *  down. On a stage-gate job the lines it filmed are tools too (`extra`). */
export const toolsGroup = (here: string, extra: RailLine[] = []): RailGroup =>
  ({ label: 'Tools', lines: [...toolPlaces(here), ...extra] });

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

/** A STAGE-GATE JOB'S PLACES (docs/STAGEGATE-UX.md; Rowland, 16 October:
 *  "when i show peole the app, i get losst in it, find dorrs that open othe
 *  rthings"). The four gates were four lines here, each opening the same
 *  shape of page — Needs you and a machine-by-stage board; they are one
 *  Plan now, the gates its tabs beside the timeline (ui/PlanTabs), and the
 *  line opens on the gate the job is at: the first with work open. Then
 *  Programs, the problems, materials and the day — one group, so the rail
 *  says the job's places once. */
export function gatesGroup(projectId: string, here: string, counts: Counts): RailGroup {
  const p = `/project/${projectId}`;
  const at = GATE_KEYS.find(k => (counts[k]?.n ?? 0) > 0);
  const plan = counted('plan', 'Plan', at ? `${p}/${GATE_PATH[at]}` : `${p}/plan`, here, counts, [...GATE_KEYS], 'machine');
  return {
    label: 'Work',
    lines: [
      { ...plan, on: here === 'plan' || (GATE_KEYS as readonly string[]).includes(here) },
      /* PROGRAMS, a page of their own — loaded at Set up, proved at
         Commission (screens/ProgramsPage). */
      counted('programs', 'Programs', `${p}/programs`, here, counts, ['programs'], 'list'),
      counted('fixes', 'Problems', `${p}/fixes`, here, counts, ['fixes'], 'flag'),
      counted('materials', 'Materials', `${p}/materials`, here, counts, ['materials'], 'list'),
      plain('day', 'The day', `${p}/day`, here, 'time'),
    ],
  };
}

/** THE MACHINES of a stage-gate job, each a page of its own (docs/
 *  STAGEGATE-UX.md slice 3) — in the job's order, each with its square:
 *  red when anything on it is late or failed, amber a problem with no time
 *  lost, green handed over, indigo under way, grey nothing started. */
export interface RailMachine { id: string; name: string; state: SquareState;
  /** Its stages and tests not done — the work, neutral; of them, `late` red. */
  open?: number; late?: number }
export function machinesGroup(projectId: string, here: string, machines: readonly RailMachine[]): RailGroup {
  return {
    label: 'Machines',
    lines: machines.map(m => ({ key: `machine:${m.id}`, label: m.name, to: `/project/${projectId}/machine/${encodeURIComponent(m.id)}`,
      on: here === `machine:${m.id}`, state: m.state, ...(m.open ? { n: m.open } : {}), ...(m.late ? { late: m.late } : {}), icon: 'machine' as const })),
  };
}

/** THE METHOD, on a 6M or lever tree job — the fishbone (or the tree) first,
 *  because it is the journey, then the board that holds its countermeasures,
 *  then the lines it is about and what says whether it is working. A tool the
 *  job opted into (the Pareto; a lever tree beside a 6M job) is a line here
 *  too, where its header button was. */
export function methodGroup(projectId: string, method: 'board' | 'tree', here: string, counts: Counts,
  tools: { pareto?: boolean; tree?: boolean } = {}): RailGroup {
  const p = `/project/${projectId}`;
  return {
    label: 'Method',
    lines: [
      ...(method === 'board' ? [plain('fishbone', 'Fishbone', `${p}/fishbone`, here, 'route')] : []),
      ...(method === 'tree' || tools.tree ? [plain('tree', 'Tree', `${p}/tree`, here, 'route')] : []),
      counted('board', 'Board', `${p}/board`, here, counts, ['board'], 'board'),
      plain('lines', 'Lines', `${p}?view=lines`, here, 'chart'),
      plain('data', 'Numbers', `${p}?view=data`, here, 'chart'),
      plain('wins', 'Wins', `${p}?view=wins`, here, 'chart'),
      plain('snags', 'Evidence', `${p}?view=snags`, here, 'chart'),
      ...(tools.pareto ? [plain('pareto', 'Pareto', `${p}/pareto`, here, 'chart')] : []),
    ],
  };
}

/** WORK on a 6M or lever tree job — its materials. A stage-gate job's work
 *  is in its one group (gatesGroup). */
export function workGroup(projectId: string, here: string, counts: Counts): RailGroup {
  return { label: 'Work', lines: [counted('materials', 'Materials', `/project/${projectId}/materials`, here, counts, ['materials'], 'list')] };
}

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

/** THE FOOT — paper, the next meeting, and what is set once. Three header
 *  buttons (Reports, Notes, the gear) become three lines. Reports has
 *  no `to`: it opens the sheet of everything printable where you stand. */
export function footGroup(projectId: string, here: string, openNotes = 0): RailGroup {
  const p = `/project/${projectId}`;
  return {
    foot: true,
    lines: [
      { key: 'reports', label: 'Reports', on: here === 'reports', state: 'n', bare: true },
      { key: 'notes', label: 'Notes', to: `${p}/notes`, on: here === 'notes', state: 'n', bare: true, n: openNotes || undefined },
      plain('details', 'Details', `${p}/setup`, here),
    ],
  };
}

/* ------------------------------------------------------------------------- */
/*  THE PHONE'S FIVE                                                          */
/* ------------------------------------------------------------------------- */

/** The bar at the foot of a phone: Control room, this job, the gate or lens
 *  you are in (or, off them, the gate the job is at; a method's first lens)
 *  — or, inside a line or its study, that line
 *  or study screen — Fixes (the board on the other methods), and More — the
 *  whole rail as a sheet. "More" is on when the screen you are on lives only
 *  in the sheet. */
export function phoneBar(groups: RailGroup[], model: PlanModel): RailLine[] {
  const all = groups.flatMap(g => g.lines);
  const by = (k: string) => all.find(l => l.key === k);
  const home = by('home');
  const job = by('job');
  const main = groups.find(g => g.label === (model === 'commissioning' ? 'Work' : 'Method'))?.lines ?? [];
  const inLine = all.find(l => l.on && (l.sub || l.key.startsWith('line:')));
  /* A stage-gate job's bar carries the Plan — opening on the gate the job is
     at — or the place it is on (docs/FLOW.md item 3; docs/STAGEGATE-UX.md). */
  /* a method of one's own: the stage it is at — the first not passed — and its method */
  const at = model === 'commissioning' ? by('plan')
    : model === 'flow' ? (main.find(l => l.key.startsWith('stage-') && l.state !== 'g') ?? main[0]) : main[0];
  const current = main.find(l => l.on && l.key !== 'fixes') ?? inLine ?? at;
  const fourth = model === 'commissioning' ? by('fixes') : model === 'flow' ? by('method')
    : (current?.key === 'board' ? by('materials') : by('board'));
  /* each place once — before a method's stages are read, its first line and its method line are the same */
  const five = [home, job, current, fourth].filter((l, i, all): l is RailLine => !!l && all.findIndex(x => x?.key === l.key) === i);
  const onBar = five.some(l => l.on);
  return [
    ...five.map(l => ({ ...l, label: l.key === 'job' ? 'This job' : l.label })),
    { key: 'more', label: 'More', on: !onBar && all.some(l => l.on), state: 'n', icon: 'grip' },
  ];
}
