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
 *   Lines     each line; under it, inside its study: Capture · Analyse ·
 *             Evidence · Meeting                    — a 6M or lever tree job
 *             Reports · Notes · Details
 *   Tools     Snags · Line standard · Line balance  (and, on a stage-gate
 *             job, its lines)
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
  lineStandards: 'standards',
};

/** Which rail line a route stands on. A project's front page is the job
 *  itself; `?view=` on it is one of the method's lenses; every other screen
 *  is its own line. A screen with no line of its own (a test's page, the
 *  line standard) returns '' and nothing is marked, since the rail still says
 *  which job it is under. */
export function hereOf(route: Route): string {
  switch (route.name) {
    case 'home': return 'home';
    case 'quickSnags': return 'quicksnags';
    case 'lineTools': return route.view === 'balance' ? 'linebalance' : 'linestandard';
    case 'projectDashboard': {
      const v = route.query.get('view');
      /* `next` is the board as a list; `snags` on a stage-gate job is sent to
         Install by the screen itself. */
      return !v || v === 'overview' ? 'job' : v === 'next' ? 'board' : v;
    }
    case 'install': return 'install';
    case 'gateSetup': return 'setup';
    case 'programs': return 'programs';
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

/** EVERY SNAG, every line — beside the control room on every rail, because a
 *  snag is taken from anywhere (snag/QuickSnag) and sent on from there. */
export const snagsPlace = (here: string): RailLine =>
  ({ key: 'quicksnags', label: 'Snags', to: '/snags', on: here === 'quicksnags', state: 'n', bare: true, icon: 'camera' });

/** THE TOOLS — the snags, the line standard and the line balance. Rowland,
 *  8 October: "we want line standard and line balancing as tools like snag
 *  ... same principle: use independent or connect to project." Each is used
 *  on a line with no job, and attached to one when it is wanted (LINE_TOOLS.sql,
 *  screens/LineToolsScreen). */
export const toolPlaces = (here: string): RailLine[] => [
  snagsPlace(here),
  { key: 'linestandard', label: 'Line standard', to: '/standards', on: here === 'linestandard', state: 'n', bare: true, icon: 'people' },
  { key: 'linebalance', label: 'Line balance', to: '/balances', on: here === 'linebalance', state: 'n', bare: true, icon: 'chart' },
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

/** THE GATES, in the order the job goes through them. Rowland: "install —
 *  next gate set up, programs; next commissioning; after that handover." The
 *  tests' key stays 'testing' because it is the URL and the count every
 *  screen already uses. */
export function gatesGroup(projectId: string, here: string, counts: Counts): RailGroup {
  const p = `/project/${projectId}`;
  return {
    label: 'Gates',
    lines: [
      counted('install', 'Install', `${p}/install`, here, counts, ['install'], 'machine'),
      counted('setup', 'Set up', `${p}/set-up`, here, counts, ['setup'], 'machine'),
      /* PROGRAMS, a page of their own between Set up and Commission — loaded
         at one, proved at the other (screens/ProgramsPage). */
      counted('programs', 'Programs', `${p}/programs`, here, counts, ['programs'], 'list'),
      counted('testing', 'Commission', `${p}/testing`, here, counts, ['testing'], 'machine'),
      counted('handover', 'Hand over', `${p}/handover`, here, counts, ['handover'], 'machine'),
    ],
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

/** WORK — what every gate draws on. A stage-gate job also has the plan and
 *  the day's story; the other methods keep their materials here. The plan
 *  is its own page, /project/:id/plan (screens/PlanScreen). */
export function workGroup(projectId: string, model: PlanModel, here: string, counts: Counts): RailGroup {
  const p = `/project/${projectId}`;
  return {
    label: 'Work',
    lines: model === 'commissioning'
      ? [
        counted('fixes', 'Fixes', `${p}/fixes`, here, counts, ['fixes'], 'flag'),
        counted('materials', 'Materials', `${p}/materials`, here, counts, ['materials'], 'list'),
        plain('plan', 'The plan', `${p}/plan`, here, 'chart'),
        plain('day', 'The day', `${p}/day`, here, 'time'),
      ]
      : [counted('materials', 'Materials', `${p}/materials`, here, counts, ['materials'], 'list')],
  };
}

export interface RailLineOf { id: string; name: string; workspaceId?: string }

/** The screens of a line study, drawn under the line they belong to (or
 *  under the job, when the job's own line was filmed) — and the line's own
 *  tools: its maps and balances, one per product (LINE_TOOLS.sql), a tool on
 *  the line whether or not a job is attached. */
export function studyLines(wsId: string, here: string): RailLine[] {
  const s = (key: string, label: string, to: string, icon: RailLine['icon']): RailLine =>
    ({ key, label, to: `/w/${wsId}/${to}`, on: here === key, state: 'n', sub: true, bare: true, icon });
  return [
    s('capture', 'Capture', 'capture', 'time'), s('analyse', 'Analyse', 'analyse', 'chart'),
    s('snaglist', 'Evidence', 'snaglist', 'camera'), s('meeting', 'Meeting', 'meeting', 'people'),
    s('standards', 'Maps and balance', 'standards', 'grip'),
  ];
}

/** LINES — each line of the project, and under the one whose study you are
 *  inside, that study's four screens. Two lines can share one study (it was
 *  filmed across both); its screens are drawn once, under the first. */
export function linesGroup(projectId: string, lines: RailLineOf[], here: string, wsId?: string): RailGroup {
  const out: RailLine[] = [];
  let drawn = false;
  for (const l of lines) {
    out.push(plain(`line:${l.id}`, l.name, `/project/${projectId}/line/${l.id}`, here, 'hash'));
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
  const main = groups.find(g => g.label === 'Gates' || g.label === 'Method')?.lines ?? [];
  const inLine = all.find(l => l.on && (l.sub || l.key.startsWith('line:')));
  /* Off the gates, a stage-gate job's bar carries the gate the job is at —
     the first with work open — so the work is one tap (docs/FLOW.md item 3:
     Commission sat under More wherever the job was). With nothing open, the
     last gate. */
  const at = model === 'commissioning' ? (main.find(l => (l.n ?? 0) > 0) ?? main[main.length - 1]) : main[0];
  const current = main.find(l => l.on) ?? inLine ?? at;
  const fourth = model === 'commissioning' ? by('fixes') : (current?.key === 'board' ? by('materials') : by('board'));
  const five = [home, job, current, fourth].filter((l): l is RailLine => !!l);
  const onBar = five.some(l => l.on);
  return [
    ...five.map(l => ({ ...l, label: l.key === 'job' ? 'This job' : l.label })),
    { key: 'more', label: 'More', on: !onBar && all.some(l => l.on), state: 'n', icon: 'grip' },
  ];
}
