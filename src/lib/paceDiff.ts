/* Week-over-week: what moved between two uploads of the tracker.
 *
 * Rows are matched on WHAT THE ACTION IS ABOUT, not on Ref. In this workbook
 * Ref is a formula — IF($F7="","","T-"&TEXT(ROW()-6,"000")) — so it is derived
 * from the row's POSITION. Insert one row in Excel and every Ref below it
 * shifts, which would report the whole tracker as rewritten. Ref also repeats
 * across distinct rows (T-010 and T-011 each appear twice).
 *
 * The stable identity is the problem text plus the line it is on, falling back
 * to the action text when the problem cell is blank. Identical descriptions are
 * separated by their occurrence order, so a genuine duplicate still pairs 1:1.
 * Ref is carried for display only, and a Ref that merely shifted is not a
 * change worth reporting. */
import type { PaceAction, PaceObservation } from './projectPaceData';
import type { PaceSnapshot } from './paceWorkbook';

export type ChangeKind =
  | 'added' | 'removed' | 'closed' | 'reopened'
  | 'status' | 'flag' | 'owner' | 'due' | 'priority'
  | 'line' | 'category' | 'who' | 'problem' | 'text';

export interface ActionChange {
  key: string;
  kind: ChangeKind;
  action: PaceAction;      // the current row (the previous one, for `removed`)
  field?: string;
  from?: string;
  to?: string;
}

export interface PaceDiff {
  from: { at: number; fileName: string };
  to: { at: number; fileName: string };
  changes: ActionChange[];
  obsAdded: PaceObservation[];
  obsRemoved: PaceObservation[];
  totals: {
    actionsThen: number; actionsNow: number;
    doneThen: number; doneNow: number;
    overdueThen: number; overdueNow: number;
    obsThen: number; obsNow: number;
  };
}

const isDone = (a: PaceAction) => /^done$/i.test(a.status.trim());
const isOverdue = (a: PaceAction) => /overdue/i.test(a.flag ?? '');
const clean = (s?: string) => (s ?? '').replace(/\s+/g, ' ').trim();

/* MATCHING, in three passes.
 *
 * A single identity key cannot survive the edits a tracker actually gets. If
 * the key is "line + what's happening", then tidying the wording of a problem,
 * or moving an action to another line, makes the row vanish and a stranger
 * appear — reported as a removal AND an addition, which reads as churn and
 * buries the real change underneath.
 *
 * So rows are paired on progressively weaker keys, and only what is left after
 * all three is genuinely new or genuinely gone:
 *
 *   1. line + what's happening   — the normal case
 *   2. the Action text           — catches a reworded problem. This is the
 *                                  column the workbook's own Ref formula keys
 *                                  off (IF($F7="",...)), so it is what the
 *                                  sheet already treats as "a row exists".
 *   3. what's happening alone    — catches an action moved to another line
 *
 * Rows sharing a key are paired in order, so genuine duplicates still pair 1:1.
 */
const norm = (s?: string) => (s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();

type KeyFn = (a: PaceAction) => string | null;
const LEVELS: KeyFn[] = [
  a => `1|${norm(a.line)}|${norm(a.problem) || norm(a.action) || norm(a.category)}`,
  a => (norm(a.action) ? `2|${norm(a.action)}` : null),
  a => (norm(a.problem) ? `3|${norm(a.problem)}` : null),
];

export interface Pairing {
  pairs: [PaceAction, PaceAction][];
  removed: PaceAction[];
  added: PaceAction[];
}

export function pairActions(prev: PaceAction[], next: PaceAction[]): Pairing {
  const pairs: [PaceAction, PaceAction][] = [];
  let left = [...prev];
  let right = [...next];

  for (const keyOf of LEVELS) {
    if (!left.length || !right.length) break;
    const buckets = new Map<string, PaceAction[]>();
    for (const a of left) {
      const k = keyOf(a);
      if (!k) continue;
      const q = buckets.get(k);
      if (q) q.push(a); else buckets.set(k, [a]);
    }
    const claimed = new Set<PaceAction>();
    const stillRight: PaceAction[] = [];
    for (const b of right) {
      const k = keyOf(b);
      const q = k ? buckets.get(k) : undefined;
      const a = q && q.length ? q.shift() : undefined;
      if (a) { pairs.push([a, b]); claimed.add(a); }
      else stillRight.push(b);
    }
    left = left.filter(a => !claimed.has(a));
    right = stillRight;
  }
  return { pairs, removed: left, added: right };
}

/* Keyed on the observation itself, not on who logged it: the observer is a
 * label derived from a sheet name, and relabelling a sheet must not read as
 * everyone's observations being deleted and re-added. */
const obsKey = (o: PaceObservation) => `${o.lens}|${clean(o.text).toLowerCase()}`;

export function diffSnapshots(prev: PaceSnapshot, next: PaceSnapshot): PaceDiff {
  const { pairs, removed, added } = pairActions(prev.actions, next.actions);
  const changes: ActionChange[] = [];

  const push = (key: string, kind: ChangeKind, action: PaceAction, field: string, from?: string, to?: string) =>
    changes.push({ key, kind, action, field, from: from || '—', to: to || '—' });

  pairs.forEach(([a, b], i) => {
    const key = `${b.ref}#${i}`;

    // Closing (or re-opening) is the headline; it replaces the plain status note.
    if (!isDone(a) && isDone(b)) push(key, 'closed', b, 'Status', a.status, b.status);
    else if (isDone(a) && !isDone(b)) push(key, 'reopened', b, 'Status', a.status, b.status);
    else if (clean(a.status) !== clean(b.status)) push(key, 'status', b, 'Status', a.status, b.status);

    // A flag flip only matters while the action is still live.
    if (!isDone(b) && clean(a.flag) !== clean(b.flag)) push(key, 'flag', b, 'Flag', a.flag, b.flag);
    if (clean(a.owner) !== clean(b.owner)) push(key, 'owner', b, 'Owner', a.owner, b.owner);
    if (clean(a.due) !== clean(b.due)) push(key, 'due', b, 'Due', a.due, b.due);
    if ((a.priority || 3) !== (b.priority || 3)) push(key, 'priority', b, 'Priority', `P${a.priority || 3}`, `P${b.priority || 3}`);
    if (clean(a.line) !== clean(b.line)) push(key, 'line', b, 'Line', a.line, b.line);
    if (clean(a.category) !== clean(b.category)) push(key, 'category', b, 'Category', a.category, b.category);
    if (clean(a.who) !== clean(b.who)) push(key, 'who', b, 'Department', a.who, b.who);
    if (clean(a.problem) !== clean(b.problem)) push(key, 'problem', b, "What's happening", clean(a.problem), clean(b.problem));
    if (clean(a.action) !== clean(b.action)) push(key, 'text', b, 'Action', clean(a.action), clean(b.action));
  });

  added.forEach((b, i) => changes.push({ key: `add:${b.ref}#${i}`, kind: 'added', action: b }));
  removed.forEach((a, i) => changes.push({ key: `del:${a.ref}#${i}`, kind: 'removed', action: a }));

  const oldObs = new Map(prev.observations.map(o => [obsKey(o), o]));
  const newObs = new Map(next.observations.map(o => [obsKey(o), o]));
  const obsAdded = [...newObs].filter(([k]) => !oldObs.has(k)).map(([, o]) => o);
  const obsRemoved = [...oldObs].filter(([k]) => !newObs.has(k)).map(([, o]) => o);

  return {
    from: { at: prev.takenAt, fileName: prev.fileName },
    to: { at: next.takenAt, fileName: next.fileName },
    changes: changes.sort((x, y) => ORDER.indexOf(x.kind) - ORDER.indexOf(y.kind)),
    obsAdded,
    obsRemoved,
    totals: {
      actionsThen: prev.actions.length, actionsNow: next.actions.length,
      doneThen: prev.actions.filter(isDone).length, doneNow: next.actions.filter(isDone).length,
      overdueThen: prev.actions.filter(isOverdue).length, overdueNow: next.actions.filter(isOverdue).length,
      obsThen: prev.observations.length, obsNow: next.observations.length,
    },
  };
}

/** Progress first, then new work, then drift — the order a stand-up reads in. */
const ORDER: ChangeKind[] = ['closed', 'added', 'reopened', 'priority', 'flag', 'status', 'due', 'owner', 'line', 'category', 'who', 'problem', 'text', 'removed'];
