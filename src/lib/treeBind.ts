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
import type { PaceAction } from './projectPaceData';
import { actionOnLine } from './paceLineMatch';
import type { TreeNodeRow, NodeStatus } from '../db';

/** Which tracker rows belong under a condition. Every field narrows; an empty
 *  binding would collect the whole tracker, so `line` is always set in practice
 *  (the editor fills it from the branch the node sits on). */
export interface TrackerBind {
  /** Line key as the app spells it — '2A', '7', '10'. Matched on digits, so the
   *  workbook's "Line 2" and rows marked "All lines" both land correctly. */
  line?: string;
  /** Tracker categories, verbatim from the workbook's own list. Empty means
   *  every category on that line. */
  categories?: string[];
  /** A word that must appear in the action, the problem or the owner. For the
   *  cases where a category is too coarse to be one condition. */
  keyword?: string;
}

const DONE = /^(done|complete|completed|closed)$/i;
const BLOCKED = /^(blocked|on hold|waiting)$/i;
const GOING = /^(in progress|started|open|ongoing)$/i;

/** Where a tracker row has got to, in the tree's own five states.
 *
 *  This is the thing that used to be set by hand on every box. It now comes
 *  from the two columns the team already keeps — Status, and whatever the sheet
 *  puts in Flag — so a board in a meeting is never showing last month's colour. */
export function statusOfAction(a: PaceAction): NodeStatus {
  const s = (a.status ?? '').trim();
  if (DONE.test(s)) return 'g';
  if (BLOCKED.test(s)) return 'r';
  // Overdue is louder than "in progress": a live action past its date is the
  // one worth a question in the room.
  if (/overdue|late/i.test(a.flag ?? '')) return 'a';
  if (GOING.test(s)) return 'w';
  return 'n';
}

/** What a tracker row reads as on the tree: what is being done, and by whom.
 *  The date deliberately stays in the tracker, which is where it gets changed
 *  and therefore where it stays right. */
export function bindActionText(a: PaceAction): string {
  const what = (a.action || a.problem || '').trim() || `Action ${a.ref}`;
  const who = (a.owner || a.who || '').trim();
  return who ? `${what} · ${who}` : what;
}

/** The tracker rows a binding collects, in the tracker's own priority order. */
export function actionsForBind(actions: PaceAction[], bind: TrackerBind): PaceAction[] {
  const cats = (bind.categories ?? []).map(c => c.trim().toLowerCase()).filter(Boolean);
  const needle = (bind.keyword ?? '').trim().toLowerCase();
  return actions.filter(a => {
    if (bind.line && !actionOnLine(a, bind.line)) return false;
    if (cats.length && !cats.includes((a.category ?? '').trim().toLowerCase())) return false;
    if (needle && ![a.action, a.problem, a.owner, a.who].some(v => (v ?? '').toLowerCase().includes(needle))) return false;
    return true;
  });
}

/** A synthetic id is recognisable on sight, and can never collide with a real
 *  one: real ids are uuids and contain no colon. Anything downstream that needs
 *  to know "is this row the tracker's or the user's" asks this. */
export const BOUND_PREFIX = 'tracker:';
export const isBoundNode = (id: string): boolean => id.startsWith(BOUND_PREFIX);

/** Build the derived children of one bound node. They look like ordinary rows
 *  so that everything which draws a tree — the editor, the report, the PDF —
 *  keeps working without knowing any of this exists. */
export function boundChildren(parent: TreeNodeRow, actions: PaceAction[]): TreeNodeRow[] {
  if (!parent.bind) return [];
  return actionsForBind(actions, parent.bind).map((a, i) => ({
    id: `${BOUND_PREFIX}${parent.id}:${a.uid || a.ref || i}`,
    projectId: parent.projectId,
    parentId: parent.id,
    text: bindActionText(a),
    rag: statusOfAction(a),
    sort: (i + 1) * 10,
    createdAt: parent.createdAt,
    updatedAt: parent.updatedAt,
  }));
}

/** Every row the tree should draw: what is stored, plus what the bindings bring
 *  in. One function, used by the editor, the on-screen report and the PDF, so
 *  the three can never disagree about what is on the tree.
 *
 *  A bound node's hand-made children are kept and shown FIRST. Binding a node
 *  is meant to save typing, not to throw away the box somebody already wrote
 *  under it — and silently deleting work would be the fastest way to make
 *  nobody trust the feature. */
export function withTrackerRows(nodes: TreeNodeRow[], actions: PaceAction[]): TreeNodeRow[] {
  if (!nodes.some(n => n.bind)) return nodes;
  const out: TreeNodeRow[] = [];
  for (const n of nodes) {
    out.push(n);
    if (n.bind) out.push(...boundChildren(n, actions));
  }
  return out;
}

/** How many rows a binding is holding, and how many of those are finished —
 *  what a folded branch should say instead of a bare count. */
export function bindCount(bind: TrackerBind, actions: PaceAction[]): { total: number; done: number } {
  const rows = actionsForBind(actions, bind);
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
  const mine = actions.filter(a => actionOnLine(a, lineKey));
  const by = new Map<string, number>();
  for (const a of mine) {
    const c = (a.category ?? '').trim();
    if (c) by.set(c, (by.get(c) ?? 0) + 1);
  }
  return [...by.entries()]
    .sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0]))
    .map(([category, count]) => ({
      text: intentFor(category),
      bind: { line: lineKey, categories: [category] },
      count,
    }));
}

/** A category turned into something that reads like a condition. Deliberately
 *  a small hand-written table rather than anything clever: these are the words
 *  that go on a wall in front of a general manager, and a generated sentence
 *  that is 90% right is worse than a blank box, because nobody edits what looks
 *  finished. Anything not in the table gets the honest generic form. */
const INTENT: Record<string, string> = {
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
  'trial': 'Trials finish and give us an answer',
};
function intentFor(category: string): string {
  return INTENT[category.trim().toLowerCase()] ?? `${category} is not costing us the line`;
}
