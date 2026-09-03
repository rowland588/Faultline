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

export type ChangeKind = 'added' | 'removed' | 'closed' | 'reopened' | 'status' | 'flag' | 'owner' | 'due' | 'text';

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

/** What the action is about — position-independent, so inserting rows in Excel
 *  does not masquerade as the tracker being rewritten. */
const identity = (a: PaceAction): string => {
  const what = clean(a.problem) || clean(a.action) || clean(a.category);
  return `${clean(a.line).toLowerCase()}|${what.toLowerCase()}`;
};

export function keyFor(actions: PaceAction[]): Map<string, PaceAction> {
  const seen = new Map<string, number>();
  const out = new Map<string, PaceAction>();
  for (const a of actions) {
    const base = identity(a);
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    out.set(n === 1 ? base : `${base}#${n}`, a);
  }
  return out;
}

/* Keyed on the observation itself, not on who logged it: the observer is a
 * label derived from a sheet name, and relabelling a sheet must not read as
 * everyone's observations being deleted and re-added. */
const obsKey = (o: PaceObservation) => `${o.lens}|${clean(o.text).toLowerCase()}`;

export function diffSnapshots(prev: PaceSnapshot, next: PaceSnapshot): PaceDiff {
  const A = keyFor(prev.actions);
  const B = keyFor(next.actions);
  const changes: ActionChange[] = [];

  for (const [key, b] of B) {
    const a = A.get(key);
    if (!a) { changes.push({ key, kind: 'added', action: b }); continue; }

    // Closing (or re-opening) is the headline; it replaces the plain status note.
    if (!isDone(a) && isDone(b)) {
      changes.push({ key, kind: 'closed', action: b, field: 'Status', from: a.status, to: b.status });
    } else if (isDone(a) && !isDone(b)) {
      changes.push({ key, kind: 'reopened', action: b, field: 'Status', from: a.status, to: b.status });
    } else if (clean(a.status) !== clean(b.status)) {
      changes.push({ key, kind: 'status', action: b, field: 'Status', from: a.status, to: b.status });
    }

    // A flag flip only matters while the action is still live.
    if (!isDone(b) && clean(a.flag) !== clean(b.flag)) {
      changes.push({ key, kind: 'flag', action: b, field: 'Flag', from: a.flag || '—', to: b.flag || '—' });
    }
    if (clean(a.owner) !== clean(b.owner)) {
      changes.push({ key, kind: 'owner', action: b, field: 'Owner', from: a.owner || '—', to: b.owner || '—' });
    }
    if (clean(a.due) !== clean(b.due)) {
      changes.push({ key, kind: 'due', action: b, field: 'Due', from: a.due || '—', to: b.due || '—' });
    }
    // Only a rewording — if the action text were the thing that matched them,
    // a change to it would have made them two different rows instead.
    if (clean(a.problem) && clean(a.action) !== clean(b.action)) {
      changes.push({ key, kind: 'text', action: b, field: 'Action', from: clean(a.action) || '—', to: clean(b.action) || '—' });
    }
  }

  for (const [key, a] of A) if (!B.has(key)) changes.push({ key, kind: 'removed', action: a });

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
const ORDER: ChangeKind[] = ['closed', 'added', 'reopened', 'flag', 'status', 'due', 'owner', 'text', 'removed'];
