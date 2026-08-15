/* The promise, drawn: raised → today → due. Fill is elapsed time; the notch is
 * the due day. Green while comfortable, amber inside the due-soon window, red
 * past the promise. Closed actions get a verdict instead of a bar. Shared by
 * the snag list and the meeting so the same action never tells two stories. */
import { isOverdue, isDueSoon, closedDaysLate, dueInDays, type Snag } from './types';

const dateNice = (ms: number) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' });

export function TimeStrip({ snag }: { snag: Snag }) {
  const late = closedDaysLate(snag);
  if (snag.status === 'closed') {
    if (late == null) return null;
    return <span className={'ts-verdict ' + (late <= 0 ? 'ts-ontime' : 'ts-late')}>{late <= 0 ? 'on time ✓' : `${late}d late`}</span>;
  }
  if (snag.dueAt == null) return null;
  const start = snag.raisedAt, nowMs = Date.now();
  const end = Math.max(snag.dueAt, nowMs, start + 1);
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - start) / (end - start)) * 100));
  const state = isOverdue(snag) ? 'over' : isDueSoon(snag) ? 'soon' : 'ok';
  return (
    <span className={'time-strip ts-' + state} title={`Raised ${dateNice(start)} · due ${dateNice(snag.dueAt)}`}>
      <span className="ts-fill" style={{ width: `${pct(nowMs)}%` }} />
      <span className="ts-mark" style={{ left: `${pct(snag.dueAt)}%` }} />
    </span>
  );
}

/** "5d" / "today" / "3d over" — the words next to the strip. */
export function dueWord(s: Snag): string | null {
  if (s.status === 'closed') return null;
  const d = dueInDays(s);
  if (d == null) return null;
  return d < 0 ? `${-d}d over` : d === 0 ? 'today' : `${d}d`;
}
