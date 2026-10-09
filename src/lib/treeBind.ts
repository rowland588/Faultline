/* THE TREE FILLS ITSELF FROM THE TRACKER.
 *
 * The problem this solves: the business runs on a weekly Excel tracker that
 * cannot be changed, the lever tree is where the project is actually steered
 * from, and keeping the two in step by hand is a copying job every Monday.
 *
 * The obvious fix — build the tree's middle level straight out of the tracker's
 * "What's happening" column — does not survive contact with the real workbook.
 * Line 2 has 34 actions and 33 DISTINCT "what's happening" texts, because that
 * column is written per row, about one incident. Used as a level it gives 33
 * boxes with one action each: a fan, not a tree, and unreadable on a wall.
 *
 * The column that does group is Category — Line 2's 34 actions fall into 8 of
 * them (10 Brillopack snags, 8 stock starvation, 7 changeovers, 4 line
 * organisation, then singles). But a category is not a condition. "Changeovers"
 * is a bucket; "Changeovers are quick and repeatable, every time" is a
 * statement of intent, and the tree is built out of intent.
 *
 * So the category never becomes a node. The CONDITION keeps the words its
 * author wrote, and carries a hidden binding — which line, which categories,
 * optionally a word to look for — that says which tracker rows live under it.
 * From then on the work underneath is DERIVED, never stored: every upload files
 * itself, a closed action turns green on its own, and nothing is ever copied.
 *
 * Derived rather than materialised is the whole trick. Writing real rows on
 * every upload would mean merging two versions of the same action every week,
 * and would leave last week's deleted rows stranded on the tree forever.
 */
import type { PaceAction } from './tracker';
import { todayISO } from './weeks';
import { toSixM } from './sixm';
import type { PaceLineRow, PaceTodoRow, TreeNodeRow, NodeStatus } from '../db';
import { standingFor, bySort, say, type Measure, type Period, type Target, type Reading, type Standing } from './measures';

/* The tracker writes lines the way people say them ("Line 2", "Line 10") and
 * marks the ones that belong to nobody in particular "All lines". Matching on
 * the DIGITS bridges that to the app's own keys, and stops "Line 2" swallowing
 * "Line 10" the way a substring test would. */
const digits = (s: string): string => (s.match(/\d+/)?.[0] ?? '');
const spansAll = (s: string): boolean => /\ball\b/i.test(s);

/* NOT lib/paceLineMatch's actionOnLine, and the difference matters.
 *
 * On a line's own pack, an action the tracker marks "All lines" IS that line's
 * to do, so it shows there — correct. On the tree it is not: three line
 * branches each claiming the same four actions puts the same sentence on the
 * wall three times and treble-counts it in the report. Measured on the real
 * workbook, that was 4 actions appearing 12 times.
 *
 * So on the tree they are their own thing — work that belongs to the project
 * rather than to any one line — and a condition says which of the two it wants. */
function onLine(a: PaceAction, lineKey: string): boolean {
  // An action kept in the app knows its line exactly: 2A is not 2B.
  if (a.lineKey !== undefined) return a.lineKey !== '' && a.lineKey === lineKey;
  const l = (a.line ?? '').trim();
  if (!l || spansAll(l)) return false;
  const want = digits(lineKey);
  return want !== '' && digits(l) === want;
}
const isAllLines = (a: PaceAction): boolean => spansAll((a.line ?? '').trim());

/** Which tracker rows belong under a condition. Every field narrows; an empty
 *  binding would collect the whole tracker, so `line` is always set in practice
 *  (the editor fills it from the branch the node sits on). */
export interface TrackerBind {
  /** Line key as the app spells it — '2A', '7', '10'. Matched on digits, so the
   *  workbook's "Line 2" finds it. Rows the tracker marks "All lines" are NOT
   *  included: see `allLines`. */
  line?: string;
  /** Only the rows the tracker marks as spanning every line. These belong to
   *  the project rather than to any one branch of it, so they hang off a
   *  condition of their own instead of being repeated under all three. */
  allLines?: boolean;
  /** Tracker categories, verbatim from the workbook's own list. Empty means
   *  every category on that line. */
  categories?: string[];
  /** A word that must appear in the action, the problem or the owner. For the
   *  cases where a category is too coarse to be one condition. */
  keyword?: string;
  /** WHERE the work under this box comes from. The weekly tracker by default —
   *  but a project's own Next steps are work too, they are already in the app,
   *  and leaving them off the tree meant the plan on the wall was missing
   *  whatever the team decided that did not come out of a spreadsheet.
   *  Next steps carry no category, so a binding that reads them uses the line
   *  alone. */
  source?: 'tracker' | 'next';
  /** THE COLOUR FOLLOWS A NUMBER. With both of these set, the box's state is no
   *  longer typed: it is the line's latest reading of this measure against the
   *  target for the period that reading falls in (lib/measures). At or better
   *  than target is green, behind it red, nothing to judge by grey. The same
   *  box may also bind to the board's work — the two halves are independent,
   *  which is why this is two fields on the one binding and not a second one. */
  measureId?: string;
  /** The app's own line id (not the key): a reading is written against it. */
  lineId?: string;
}

/** Does this binding bring the board's WORK under the box? Only when it names
 *  a line (or the project's own rows). A binding that carries nothing but a
 *  measure must never be read as "every action on the board" — that was the
 *  failure mode an unguarded `line` would have had. */
export const bindsWork = (b?: TrackerBind): boolean => !!b && !!(b.line || b.allLines);
/** Does this binding give the box its COLOUR from a number? */
export const bindsNumber = (b?: TrackerBind): boolean => !!b && !!(b.measureId && b.lineId);

/** The binding with its number half removed — `undefined` when nothing is left,
 *  so an unbound box stores no binding at all rather than an empty one. */
export function withoutNumber(b?: TrackerBind): TrackerBind | undefined {
  if (!b) return undefined;
  const { measureId: _m, lineId: _l, ...rest } = b;
  return bindsWork(rest) ? rest : undefined;
}
/** The binding with its work half removed — what the board sheet's "Unlink"
 *  leaves behind, so unlinking the actions does not also unbind the number. */
export function withoutWork(b?: TrackerBind): TrackerBind | undefined {
  if (!b) return undefined;
  const { line: _a, allLines: _b, categories: _c, keyword: _d, source: _e, ...rest } = b;
  return bindsNumber(rest) ? rest : undefined;
}

/* ---------- undo a link (HUNT 31) ---------- */

/** The same binding? Field by field, with a missing list the same as an empty
 *  one — so "Undo" is only offered when something actually changed. */
export function sameBind(a?: TrackerBind, b?: TrackerBind): boolean {
  const norm = (x?: TrackerBind) => JSON.stringify(x ? {
    line: x.line || undefined, allLines: x.allLines || undefined,
    categories: x.categories?.length ? [...x.categories].sort() : undefined,
    keyword: x.keyword?.trim() || undefined, source: x.source && x.source !== 'tracker' ? x.source : undefined,
    measureId: x.measureId || undefined, lineId: x.lineId || undefined,
  } : {});
  return norm(a) === norm(b);
}

/** What the Undo bar says after a box's binding changed — `null` when nothing
 *  did. Linking, unlinking, a number bound or let go: each said in the words
 *  the box's own buttons use. */
export function bindUndoWords(text: string, before?: TrackerBind, after?: TrackerBind): string | null {
  if (sameBind(before, after)) return null;
  const t = text.trim();
  const box = t ? `“${t.length > 40 ? t.slice(0, 39) + '…' : t}”` : 'the box';
  const work = bindsWork(before) !== bindsWork(after) || (bindsWork(after) && !sameBind(withoutNumber(before), withoutNumber(after)));
  const num = bindsNumber(before) !== bindsNumber(after)
    || (bindsNumber(after) && (before?.measureId !== after?.measureId || before?.lineId !== after?.lineId));
  if (work && !num) {
    return !bindsWork(after) ? `Unlinked ${box} from the board`
      : !bindsWork(before) ? `${box[0].toUpperCase() + box.slice(1)} now fills from the board`
      : `Changed what the board fills ${box} with`;
  }
  if (num && !work) {
    return !bindsNumber(after) ? `${box[0].toUpperCase() + box.slice(1)} no longer follows a number`
      : `${box[0].toUpperCase() + box.slice(1)} now follows a number`;
  }
  return `Changed what ${box} is linked to`;
}

/** What Undo writes back: the box as it is NOW — its words may have been
 *  edited since — with exactly the binding it had before, none included. */
export function withBindRestored(now: TreeNodeRow, before?: TrackerBind): TreeNodeRow {
  return { ...now, bind: before ? { ...before } : undefined };
}

/* ---------- the colour from a number ---------- */

/** What a number binding reads from: the project's measures and periods, and
 *  every target and reading on it. The same four lists useMeasures holds. */
export interface NumberSources {
  measures: Measure[];
  periods: Period[];
  targets: Target[];
  readings: Reading[];
}

/** One box's number, worked out: what was last read, what it was judged
 *  against, and the state that gives the box. */
export interface BoundNumber {
  measure: Measure;
  latest?: number;
  target?: number;
  period?: Period;
  status: NodeStatus;
  /** "52 vs 44 ppm" — the small text beside the box's own words. */
  figure: string;
  /** The state in words, beside the colour: "On target", "Behind target",
   *  "No target set", "Nothing measured yet". */
  words: string;
}

/** THE RULE. At or better than target → done (green). Behind it → red. No
 *  reading, or no target for the period it falls in → not started (grey).
 *  "Better" is the measure's own direction: 1.8% waste beats a 2% target, 61
 *  ppm beats 60 — `meets` in lib/measures already knows, so nothing here does. */
export function statusOfNumber(s: Pick<Standing, 'latest' | 'target' | 'meeting'>): NodeStatus {
  if (!s.latest || s.target == null || s.meeting === undefined) return 'n';
  return s.meeting ? 'g' : 'r';
}

/** The state said in words — colour is never the only carrier. */
export function numberWords(s: Pick<Standing, 'latest' | 'target' | 'meeting'>): string {
  if (!s.latest) return 'Nothing measured yet';
  if (s.target == null) return 'No target set';
  return s.meeting ? 'On target' : 'Behind target';
}

/** The figure beside the box's name: the latest reading against its target,
 *  the unit said once. "52 vs 44 ppm"; "52 ppm" when there is no target. */
export function numberFigure(s: Pick<Standing, 'measure' | 'latest' | 'target'>): string {
  if (!s.latest) return `${s.measure.name} · nothing measured yet`;
  if (s.target == null) return say(s.latest.value, s.measure.unit);
  return `${say(s.latest.value)} vs ${say(s.target, s.measure.unit)}`;
}

/** Where one bound box stands. `undefined` when the box is not bound to a
 *  number, or names a measure the project no longer has. */
export function boundNumber(bind: TrackerBind | undefined, src?: NumberSources): BoundNumber | undefined {
  if (!src || !bind?.measureId || !bind.lineId) return undefined;
  const s = standingFor(src.measures, src.periods, src.targets, src.readings, bind.lineId)
    .find(x => x.measure.id === bind.measureId);
  if (!s) return undefined;
  return {
    measure: s.measure, latest: s.latest?.value, target: s.target, period: s.period,
    status: statusOfNumber(s), figure: numberFigure(s), words: numberWords(s),
  };
}

/** Every measure × line a box can be bound to, in the project's own order,
 *  labelled the way the project says them: "Packs per minute · Line 2B". */
export function numberChoices(
  measures: Measure[], lines: PaceLineRow[],
): { measureId: string; lineId: string; label: string }[] {
  return bySort(measures).flatMap(m => lines.map(l => ({
    measureId: m.id, lineId: l.id, label: `${m.name} · ${l.name || `Line ${l.key}`}`,
  })));
}

const DONE = /^(done|complete|completed|closed)$/i;
/* Broader than the workbook's own dropdown on purpose. The dropdown says
 * "Blocked", but people type what is actually true — "With supplier",
 * "Awaiting parts", "On order" — and every one of those is the same thing:
 * stopped, waiting on somebody else. */
const BLOCKED = /^(blocked|on hold|waiting|waiting on .*|with (supplier|engineering|technical|.*)|awaiting.*|on order|chasing.*)$/i;
const GOING = /^(in progress|started|open|ongoing|wip)$/i;
/** Said in the sheet, in as many words: this has not begun. */
const NOT_STARTED = /^(not started|new|raised|to do|todo|backlog)$/i;

/** Where a tracker row has got to, in the tree's own five states.
 *
 *  This is the thing that used to be set by hand on every box. It now comes
 *  from the two columns the team already keeps — Status, and whatever the sheet
 *  puts in Flag — so a board in a meeting is never showing last month's colour. */
export function statusOfAction(a: PaceAction): NodeStatus {
  const s = (a.status ?? '').trim();
  /* A DAY BOOKED IS STILL AHEAD (Rowland, 4 October — CLAUDE.md visual
     management): an action nobody has started but with a due date is indigo,
     not grey; grey is only "not started and no day". Past its day is the red
     below, from the overdue flag. */
  const booked = !!a.dueISO;
  if (!s) return booked ? 'w' : 'n';
  if (DONE.test(s)) return 'g';
  /* PAST ITS DAY IS RED, WAITING IS AMBER — lean visual management: red is
     the abnormal thing, the day that has gone, and it is louder than anything
     else, waiting included (a waiting action past its date is overdue). Waiting
     on somebody is at risk, not yet wrong. These were the other way round, so
     an overdue action showed amber on the board and a waiting one red. */
  if (/overdue|late/i.test(a.flag ?? '')) return 'r';
  if (BLOCKED.test(s)) return 'a';
  if (GOING.test(s)) return 'w';
  if (NOT_STARTED.test(s)) return booked ? 'w' : 'n';
  /* Anything else is LIVE, not "not started". The fallback used to be 'n',
   * which meant an action somebody had written "With supplier" against read on
   * the wall as work nobody had begun — the most misleading thing a board can
   * say in a meeting. A status the app does not recognise is still somebody
   * tracking something; only an empty cell, or a word that says so, is "not
   * started". */
  return 'w';
}

/** What a tracker row reads as on the tree: what is being done, and by whom.
 *  The date deliberately stays in the tracker, which is where it gets changed
 *  and therefore where it stays right. */
export function bindActionText(a: PaceAction): string {
  const what = (a.action || a.problem || '').trim() || `Action ${a.ref}`;
  const who = (a.owner || a.who || '').trim();
  return who ? `${what} · ${who}` : what;
}

/* A BOX BOUND TO "Plant" STILL COLLECTS ITS ACTIONS. An action's category is
 * its bone's word (lib/actions), and the bones went from People · Plant ·
 * Process to the six (lib/sixm) — so a box bound before then names "Plant"
 * while its actions now say "Machine". A category matches as typed, or as
 * the same bone read across; any other category is matched as typed. */
function catMatches(cats: string[], category: string | undefined): boolean {
  const c = (category ?? '').trim().toLowerCase();
  if (cats.includes(c)) return true;
  const bone = toSixM(c);
  return !!bone && cats.some(x => toSixM(x) === bone && SIXM_WORDS.has(x));
}
/** The words a binding may name a bone by: the six and the old three. */
const SIXM_WORDS = new Set(['people', 'machine', 'method', 'material', 'measurement', 'environment', 'plant', 'process']);

/** The tracker rows a binding collects, in the tracker's own priority order. */
export function actionsForBind(actions: PaceAction[], bind: TrackerBind): PaceAction[] {
  if (bind.source === 'next') return [];
  const cats = (bind.categories ?? []).map(c => c.trim().toLowerCase()).filter(Boolean);
  const needle = (bind.keyword ?? '').trim().toLowerCase();
  return actions.filter(a => {
    if (bind.allLines) { if (!isAllLines(a)) return false; }
    else if (bind.line && !onLine(a, bind.line)) return false;
    if (cats.length && !catMatches(cats, a.category)) return false;
    if (needle && ![a.action, a.problem, a.owner, a.who].some(v => (v ?? '').toLowerCase().includes(needle))) return false;
    return true;
  });
}

/** Where a Next step has got to, in the tree's own five states. */
export function statusOfTodo(t: PaceTodoRow, today = todayISO()): NodeStatus {
  if (t.state === 'done') return 'g';
  /* The same rule as statusOfAction and the board: red is the day that has
     gone, amber is waiting on somebody. Waiting was drawn red — "Overdue" on
     the tree for a step nobody was late with — and a step past its day was
     drawn indigo, as if it were fine. */
  if (t.due && t.due < today) return 'r';
  if (t.state === 'waiting') return 'a';
  return 'w';
}

/** What a Next step reads as on the tree. */
export function todoText(t: PaceTodoRow): string {
  const what = (t.what || '').trim() || 'Next step';
  const who = (t.who || '').trim();
  return who ? `${what} · ${who}` : what;
}

/** The project's own Next steps a binding collects. The line is matched on the
 *  todo's own lineId, which the app sets when the step is logged on a line's
 *  pack — no digits to bridge, because both sides are the app's own key. */
export function todosForBind(todos: PaceTodoRow[], bind: TrackerBind, lineIds: string[]): PaceTodoRow[] {
  if (bind.source !== 'next') return [];
  const needle = (bind.keyword ?? '').trim().toLowerCase();
  return todos.filter(t => {
    if (bind.allLines) { if (t.lineId) return false; }      // the project's own, on no line
    else if (bind.line && !lineIds.includes(t.lineId ?? '')) return false;
    if (needle && ![t.what, t.why, t.who, t.where].some(v => (v ?? '').toLowerCase().includes(needle))) return false;
    return true;
  });
}

/** A synthetic id is recognisable on sight, and can never collide with a real
 *  one: real ids are uuids and contain no colon. Anything downstream that needs
 *  to know "is this row the tracker's or the user's" asks this. */
export const BOUND_PREFIX = 'tracker:';
export const isBoundNode = (id: string): boolean => id.startsWith(BOUND_PREFIX);

/** The state of a row the board put on the tree, in the BOARD'S words. Amber
 *  there is "Waiting" — on somebody — and the tree called the same action "At
 *  risk", so one action read two ways on two screens and on paper. A box the
 *  author drew keeps the tree's own words; undefined means "use those". */
export const boardWords = (id: string, rag: NodeStatus): string | undefined =>
  isBoundNode(id) && rag === 'a' ? 'Waiting' : undefined;

/** Build the derived children of one bound node. They look like ordinary rows
 *  so that everything which draws a tree — the editor, the report, the PDF —
 *  keeps working without knowing any of this exists. */
export function boundChildren(parent: TreeNodeRow, src: BindSources): TreeNodeRow[] {
  const bind = parent.bind;
  if (!bind || !bindsWork(bind)) return [];
  const row = (id: string, text: string, rag: NodeStatus, i: number): TreeNodeRow => ({
    id: `${BOUND_PREFIX}${parent.id}:${id}`,
    projectId: parent.projectId,
    parentId: parent.id,
    text, rag,
    sort: (i + 1) * 10,
    createdAt: parent.createdAt,
    updatedAt: parent.updatedAt,
  });
  if (bind.source === 'next') {
    const ids = src.lineIdsFor(bind.line);
    return todosForBind(src.todos, bind, ids)
      .map((t, i) => row(t.id, todoText(t), statusOfTodo(t), i));
  }
  return actionsForBind(src.actions, bind)
    .map((a, i) => row(a.uid || a.ref || String(i), bindActionText(a), statusOfAction(a), i));
}

/** Everything a binding can draw from. Passed as one object so that adding a
 *  third source later does not mean changing every caller again. */
export interface BindSources {
  actions: PaceAction[];
  todos: PaceTodoRow[];
  /** The app's line ids that answer to a tracker line key — 2A and 2B both
   *  answer to "Line 2", and a Next step is logged against one of them. */
  lineIdsFor: (lineKey?: string) => string[];
  /** The project's numbers, for a box whose colour follows one. Absent where a
   *  caller has no numbers to hand; such a box then keeps its stored colour. */
  numbers?: NumberSources;
}

/** The usual sources, built from the project's lines. */
export function bindSources(
  actions: PaceAction[], todos: PaceTodoRow[], lines: PaceLineRow[], numbers?: NumberSources,
): BindSources {
  return {
    actions, todos, numbers,
    lineIdsFor: (lineKey) => {
      if (!lineKey) return lines.map(l => l.id);
      return lines.filter(l => l.key === lineKey).map(l => l.id);
    },
  };
}

/** Every row the tree should draw: what is stored, plus what the bindings bring
 *  in. One function, used by the editor, the on-screen report and the PDF, so
 *  the three can never disagree about what is on the tree.
 *
 *  A bound node's hand-made children are kept and shown FIRST. Binding a node
 *  is meant to save typing, not to throw away the box somebody already wrote
 *  under it — and silently deleting work would be the fastest way to make
 *  nobody trust the feature. */
export function withTrackerRows(nodes: TreeNodeRow[], src: BindSources): TreeNodeRow[] {
  if (!nodes.some(n => n.bind)) return nodes;
  const out: TreeNodeRow[] = [];
  for (const n of nodes) {
    /* A box bound to a number is DRAWN in the colour the number gives it. The
       stored colour is left alone, so unbinding hands the box back as it was. */
    const num = boundNumber(n.bind, src.numbers);
    out.push(num ? { ...n, rag: num.status } : n);
    if (bindsWork(n.bind)) out.push(...boundChildren(n, src));
  }
  return out;
}

/** How many rows a binding is holding, and how many of those are finished —
 *  what a folded branch should say instead of a bare count. */
export function bindCount(bind: TrackerBind, src: BindSources): { total: number; done: number } {
  if (!bindsWork(bind)) return { total: 0, done: 0 };
  if (bind.source === 'next') {
    const rows = todosForBind(src.todos, bind, src.lineIdsFor(bind.line));
    return { total: rows.length, done: rows.filter(t => statusOfTodo(t) === 'g').length };
  }
  const rows = actionsForBind(src.actions, bind);
  return { total: rows.length, done: rows.filter(a => statusOfAction(a) === 'g').length };
}

/** The conditions worth offering for a line, newest thinking first.
 *
 *  Setting a tree up from nothing is the moment this feature is either adopted
 *  or abandoned, so the first run does the tedious half: it reads which
 *  categories that line actually has actions in, ranks them by weight, and
 *  proposes one condition per category ALREADY BOUND. The wording is a first
 *  draft in the language of intent, meant to be edited — the author's own words
 *  are the point of the level, and a suggestion that cannot be changed would
 *  just be the category with a longer name. */
export function suggestConditions(actions: PaceAction[], lineKey: string): { text: string; bind: TrackerBind; count: number }[] {
  const all = lineKey === ALL_LINES;
  const mine = actions.filter(a => (all ? isAllLines(a) : onLine(a, lineKey)));
  const by = new Map<string, number>();
  for (const a of mine) {
    const c = (a.category ?? '').trim();
    if (c) by.set(c, (by.get(c) ?? 0) + 1);
  }
  return [...by.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .map(([category, count]) => ({
      text: intentFor(category),
      bind: all ? { allLines: true, categories: [category] } : { line: lineKey, categories: [category] },
      count,
    }));
}

/** A category turned into something that reads like a condition. Deliberately
 *  a small hand-written table rather than anything clever: these are the words
 *  that go on a wall in front of a general manager, and a generated sentence
 *  that is 90% right is worse than a blank box, because nobody edits what looks
 *  finished. Anything not in the table gets the honest generic form. */
const INTENT: Record<string, string> = {
  // The board's six bones — what a lever tree groups the actions by now —
  // and the two old words a box may have been bound by before them.
  'people': 'The people on the line can run it, every shift',
  'machine': 'The machine runs without stopping us',
  'method': 'The way of working is clear, and followed',
  'material': 'What goes into the line and the pack is right first time',
  'measurement': 'What we check and count is right, and tells us the truth',
  'environment': 'The conditions around the line do not cost us',
  'plant': 'The machine runs without stopping us',
  'process': 'The way of working is clear, and followed',
  'changeovers': 'Changeovers are quick and repeatable, every time',
  'stock starvation': 'The line is never waiting for stock',
  'brillopack snags': 'Brillopack runs a full shift without stopping',
  'general line organisation': 'Everything the line needs is where it should be',
  'break management': 'The line keeps running through breaks',
  'robot / automation': 'The robot runs without short stops',
  'quality': 'Quality problems do not stop the line',
  'engineering': 'Engineering faults are found before they stop us',
  'packaging or equipment issues': 'Packaging and equipment do their job first time',
  'reject management': 'Good packs are not being rejected',
  'line staff capability': 'Everyone on the line can run it properly',
  'operator error': 'The line is set up so it is hard to get wrong',
  'set up': 'The line is set up right at the start of every run',
  'checkweigher': 'The checkweigher passes what it should',
  'consumable changes': 'Consumable changes do not cost us a run',
  'planning': 'The plan we are given is one the line can run',
  'trial': 'Tests finish and give us an answer',
};
function intentFor(category: string): string {
  return INTENT[category.trim().toLowerCase()] ?? `${category} is not costing us the line`;
}


/** The sentinel the line pickers use for "the work that spans every line".
 *  A key no real line can have, so it can travel through the same code paths
 *  as a line without a second argument threaded through every call. */
export const ALL_LINES = '*all*';

/** How many actions the tracker marks as spanning every line. Zero means the
 *  option is not worth offering. */
export const allLinesCount = (actions: PaceAction[]): number => actions.filter(isAllLines).length;

/** The project's lines, one entry each, in the app's own order.
 *
 *  These used to be grouped on their digits — 2A and 2B became one "Line 2" —
 *  because the uploaded tracker filed both under "Line 2". There is no tracker
 *  now: every action is written against one line in the app, so 2A and 2B are
 *  two branches with their own work. Rowland: "Yes split." */
export function trackerLines(lines: PaceLineRow[]): { key: string; label: string }[] {
  return lines.filter(l => l.key).map(l => ({ key: l.key, label: l.name || `Line ${l.key}` }));
}


/** The tracker rows that reach NO box on the tree.
 *
 *  Three ways a row goes missing, and none of them announce themselves: the
 *  Line cell is blank, so it matches no line; the Category is blank or is one
 *  no condition was built for; or nobody has linked that line yet. All three
 *  end the same way — the tracker says forty, the wall shows thirty-six, and
 *  nobody can name the four.
 *
 *  So the tree counts them and says so. It is not clever and it does not guess
 *  where they belong; it just refuses to lose them quietly. */
export function unplacedActions(nodes: TreeNodeRow[], actions: PaceAction[]): PaceAction[] {
  const bound = nodes.filter(n => bindsWork(n.bind) && n.bind?.source !== 'next');
  if (!bound.length) return [];
  const placed = new Set<string>();
  for (const n of bound) {
    for (const a of actionsForBind(actions, n.bind!)) placed.add(a.uid || a.ref);
  }
  return actions.filter(a => !placed.has(a.uid || a.ref));
}

/** Why one row is not on the tree, in words a person can act on. */
export function whyUnplaced(a: PaceAction): string {
  if (!(a.line ?? '').trim()) return 'no line on the tracker row';
  if (!(a.category ?? '').trim()) return 'no category on the tracker row';
  return `${a.category} on ${a.line} — no box is linked to it`;
}

/* ---------- the tree, as the control room reads it ---------- */

/** Where a lever tree stands, in one breath — what Home and the tree job's
 *  front page say without opening the tree. Read off the DRAWN rows (after
 *  withTrackerRows), so a box whose colour follows a number counts in that
 *  colour, exactly as the tree and the report show it. The board's own rows
 *  hung under a box are work, counted on the board, not here. */
export interface TreeStanding {
  outcome: { id: string; text: string; rag: NodeStatus; word: string };
  /** What the author wrote under the outcome: the levers and conditions. */
  total: number;
  late: number;
  risk: number;
  done: number;
  /** The conditions off track, overdue before at risk, in the tree's order. */
  off: { id: string; text: string; rag: NodeStatus }[];
  /** The tree's top: what was written directly under the outcome, in the
   *  tree's order — what the job's front page draws under the outcome. */
  top: { id: string; text: string; rag: NodeStatus }[];
  /** "The outcome is at risk · 2 of 5 conditions off track — 1 overdue, 1 at risk" */
  says: string;
}

const OUTCOME_WORD: Record<NodeStatus, string> = { g: 'reached', r: 'behind', a: 'at risk', w: 'in progress', n: 'not started' };

export function treeStanding(rows: TreeNodeRow[]): TreeStanding | undefined {
  const byId = new Map(rows.map(r => [r.id, r]));
  const roots = rows.filter(r => !r.parentId || !byId.has(r.parentId)).sort((a, b) => a.sort - b.sort);
  const root = roots[0];
  if (!root) return undefined;
  const under = rows.filter(r => r.id !== root.id && !isBoundNode(r.id));
  const late = under.filter(r => r.rag === 'r').length;
  const risk = under.filter(r => r.rag === 'a').length;
  const done = under.filter(r => r.rag === 'g').length;
  const word = OUTCOME_WORD[root.rag] ?? OUTCOME_WORD.n;
  const n = under.length;
  const off = late + risk;
  const plural = (k: number) => `condition${k === 1 ? '' : 's'}`;
  const conditions = n === 0 ? 'nothing written under it yet'
    : off > 0 ? `${off} of ${n} ${plural(n)} off track — ${[late && `${late} late`, risk && `${risk} at risk`].filter(Boolean).join(', ')}`
    : done === n ? `all ${n} ${plural(n)} done`
    : `${n} ${plural(n)}, none off track`;
  return {
    outcome: { id: root.id, text: root.text.trim() || 'The outcome', rag: root.rag, word },
    total: n, late, risk, done,
    off: [...under.filter(r => r.rag === 'r'), ...under.filter(r => r.rag === 'a')]
      .map(r => ({ id: r.id, text: r.text.trim() || 'A condition', rag: r.rag })),
    top: under.filter(r => r.parentId === root.id).sort((a, b) => a.sort - b.sort)
      .map(r => ({ id: r.id, text: r.text.trim() || 'A condition', rag: r.rag })),
    says: `The outcome is ${word} · ${conditions}`,
  };
}
