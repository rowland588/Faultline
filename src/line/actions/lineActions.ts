/* A LINE'S ACTION TRACKER (7 November — Rowland: "every line has its own action tracker ... automatically populates a Gantt
 * chart. Gantt chart's just a visible tool ... a really classic, simple action tracker ... automated by problems that I found
 * automatically going to an action tracker. Simple.").
 *
 * NO NEW RECORD. A row IS a problem on the line (snag/types Snag): raised on the line, it is on its tracker; its owner, due day,
 * status and priority are edited in the tracker and are the problem's own. So the tracker, the Problems page, the Factory's
 * Actions and every paper read one record and can never disagree.
 *
 * The Gantt is drawn from the same rows: a bar from the day it was raised to its due day (to the day it closed when closed),
 * today's line across them, late in red, done a quiet green, a row with no due day a point at its start saying so. Nothing is
 * worked out that a person did not type: no durations guessed, no dependencies invented. */
import type { Snag, SnagStatus } from '../../snag/types';

export const DAY = 86_400_000;
const startOfDay = (t: number): number => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
/** Due within this many days, not late: amber. */
export const SOON_DAYS = 7;

export type TrackerState = 'late' | 'soon' | 'open' | 'doing' | 'done' | 'nodate';
export interface TrackerRow {
  id: string;
  what: string;
  owner: string;
  priority: 'critical' | 'high' | 'low';
  status: SnagStatus;
  /** Local midnight of the day it was raised. */
  start: number;
  /** Local midnight of the day it is due by, if one is agreed. */
  due?: number;
  /** Local midnight of the day it closed. */
  closed?: number;
  state: TrackerState;
  /** Days late (due before today, not done), else 0. */
  lateBy: number;
  machine?: string;
}

const PRIO_RANK = { critical: 0, high: 1, low: 2 } as const;

/** The tracker's rows from the line's problems: not deleted, not put away; done ones only when asked (and closed within
 *  `doneDays`). Late first, then by due day (no day last), then priority. */
export function trackerRows(snags: readonly Snag[], wsId: string, today: number, opts: { withDone?: boolean; doneDays?: number; machineOf?: (s: Snag) => string | undefined } = {}): TrackerRow[] {
  const t0 = startOfDay(today), keepDone = (opts.doneDays ?? 30) * DAY;
  const rows: TrackerRow[] = [];
  for (const s of snags) {
    if (s.workspaceId !== wsId || s.deletedAt || s.archivedAt) continue;
    const done = s.status === 'closed';
    if (done && (!opts.withDone || (s.closedAt != null && t0 - startOfDay(s.closedAt) > keepDone))) continue;
    const due = s.dueAt != null ? startOfDay(s.dueAt) : undefined;
    const lateBy = !done && due != null && due < t0 ? Math.round((t0 - due) / DAY) : 0;
    const state: TrackerState = done ? 'done' : lateBy > 0 ? 'late' : due == null ? 'nodate' : due - t0 <= SOON_DAYS * DAY ? 'soon' : s.status === 'in_progress' ? 'doing' : 'open';
    rows.push({
      id: s.id, what: s.problem, owner: s.owner?.trim() ?? '', priority: s.priority ?? 'low', status: s.status,
      start: startOfDay(s.raisedAt), ...(due != null ? { due } : {}), ...(done && s.closedAt != null ? { closed: startOfDay(s.closedAt) } : {}),
      state, lateBy, ...(opts.machineOf?.(s) ? { machine: opts.machineOf(s) } : {}),
    });
  }
  const rank = (r: TrackerRow) => (r.state === 'done' ? 2 : r.state === 'late' ? 0 : 1);
  return rows.sort((a, b) => rank(a) - rank(b) || (a.due ?? Infinity) - (b.due ?? Infinity) || PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || a.start - b.start);
}

export interface TrackerSummary { open: number; late: number; soon: number; noOwner: number; noDate: number; done: number }
export function trackerSummary(rows: readonly TrackerRow[]): TrackerSummary {
  const open = rows.filter(r => r.state !== 'done');
  return {
    open: open.length, late: open.filter(r => r.state === 'late').length, soon: open.filter(r => r.state === 'soon').length,
    noOwner: open.filter(r => !r.owner).length, noDate: open.filter(r => r.due == null).length, done: rows.length - open.length,
  };
}

const n = (k: number, one: string, more = `${one}s`) => `${k} ${k === 1 ? one : more}`;
/** The tracker in one sentence: what is open, what is late and whose, what is due this week, what has no owner or no day. */
export function trackerSays(rows: readonly TrackerRow[], line: string): string {
  const s = trackerSummary(rows);
  if (!s.open) return s.done ? `Nothing open on ${line} — ${n(s.done, 'action')} done lately.` : `Nothing open on ${line}. Raise a problem on the line and it is on this tracker at once.`;
  const late = rows.filter(r => r.state === 'late');
  const lateWho = [...new Set(late.map(r => r.owner || 'nobody yet'))];
  const parts = [`${n(s.open, 'action')} open on ${line}`];
  parts.push(s.late ? `${s.late} late (${lateWho.slice(0, 3).join(', ')}${lateWho.length > 3 ? ' …' : ''})` : 'none late');
  if (s.soon) parts.push(`${s.soon} due within a week`);
  const gaps = [s.noOwner ? `${s.noOwner} with nobody on it` : '', s.noDate ? `${s.noDate} with no day` : ''].filter(Boolean);
  return `${parts.join(', ')}.${gaps.length ? ` ${gaps.join(' and ')}.` : ''}`;
}

/** The Gantt's span: from the earliest open start (at most 8 weeks back, at least a week before today) to the latest due
 *  (at least four weeks after today), on Monday boundaries. */
export function ganttSpan(rows: readonly TrackerRow[], today: number): { from: number; to: number; weeks: number } {
  const t0 = startOfDay(today);
  const starts = rows.map(r => r.start), ends = rows.map(r => r.closed ?? r.due ?? r.start);
  let from = Math.max(Math.min(t0 - 7 * DAY, ...starts), t0 - 56 * DAY);
  let to = Math.max(t0 + 28 * DAY, ...ends);
  const monday = (t: number) => { const d = new Date(t); const k = (d.getDay() + 6) % 7; return startOfDay(t - k * DAY); };
  from = monday(from); to = monday(to) + 7 * DAY;
  return { from, to, weeks: Math.round((to - from) / (7 * DAY)) };
}

/** A row's bar on the Gantt as fractions of the span: where it starts and ends (a point when there is no day). */
export function barOf(r: TrackerRow, span: { from: number; to: number }): { left: number; width: number; point: boolean; startsBefore: boolean } {
  const len = span.to - span.from;
  const a = Math.max(r.start, span.from), endRaw = r.closed ?? r.due;
  if (endRaw == null) return { left: (a - span.from) / len, width: 0, point: true, startsBefore: r.start < span.from };
  const b = Math.max(Math.min(endRaw + DAY, span.to), a + DAY);
  return { left: (a - span.from) / len, width: (b - a) / len, point: false, startsBefore: r.start < span.from };
}
