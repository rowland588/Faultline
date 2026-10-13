/* WHAT A LINE OWES ON ITS OWN — the control room's other half.
 *
 * The flow audit, 13 October (docs/FLOW-AUDIT.md, finding 1): "The control
 * room is blind to work on a line with no job. A Critical problem on Line 7
 * that is 3 days late and owed by Priya changes none of 10 late, 1 critical,
 * Who owes what, This week or the control room report." BLUEPRINT §1 rule 4
 * and §6.6: a line can be out of control with no job on it.
 *
 * No new record. A line's own problems are its register's (`snags` on the
 * workspace — the rows lib/snagsReport snagRow reads, open, not put away by a
 * fresh start, not moved to a job) and its own programs are the ones planned
 * on it with no job (`programs` with no `projectId`). A job's problems and
 * programs are counted on the job, never here as well.
 *
 * Read once, here, so the control room's four numbers, Who owes what, This
 * week and its report, the line's card on the control room and the line's
 * own page all count a line by the same rule:
 *
 *   - a PROBLEM is chased once somebody is named on it or a day is set for
 *     it — the register's backlog of unowned, undated problems stays on the
 *     register; late is past its day; a Critical one is critical, with or
 *     without a day (lib/snagsReport, PRIORITY — Rowland, 12 October);
 *   - a PROGRAM not proved is owed by whoever it comes from, and late once
 *     its test day has gone (lib/programs) — the same rule a job's program
 *     is counted by (lib/portfolio jobItems).
 *
 * Pure: the caller hands in the records and today. */
import type { Snag } from '../snag/types';
import { dueToInput } from '../snag/types';
import type { Program } from './programs';
import { daysOverdue, stateOf } from './programs';
import { snagRow, PRIORITY_RANK, type SnagRow } from './snagsReport';
import type { JobItem } from './portfolio';

/** A line's mark beside a job's colour — the ink, never a state's hue. */
export const LINE_COLOR = 'var(--ink-2)';

/** What the control room reads of one factory line. */
export interface LineInput {
  line: { id: string; name: string };
  /** Every problem on the device — this line's are picked out. */
  snags: readonly Snag[];
  /** Every program on the device — this line's own (no job) are picked out. */
  programs: readonly Program[];
}

/** A line's problem as the register reads it, still open on the line. */
export const isOpenOnLine = (s: Snag, wsId: string): boolean =>
  s.workspaceId === wsId && !s.deletedAt && !s.archivedAt && s.status !== 'closed' && !(s.sent ?? []).length;

/** THE PROBLEMS OPEN ON A LINE — the register's rows, worst first (Critical,
 *  then late, then newest) — and how many are critical and late: what the
 *  line's card on the control room and the line's own page both say. */
export interface LineProblems { rows: SnagRow[]; open: number; critical: number; late: number }

export function lineProblems(snags: readonly Snag[], line: { id: string; name: string }, o: { ref?: number; jobName?: (id: string) => string | undefined } = {}): LineProblems {
  const ref = o.ref ?? Date.now();
  const rows = snags.filter(s => isOpenOnLine(s, line.id))
    .map(s => snagRow(s, line.name, undefined, s.projectId ? o.jobName?.(s.projectId) : undefined, ref))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || Number(b.late) - Number(a.late) || b.raisedAt - a.raisedAt);
  return { rows, open: rows.length, critical: rows.filter(r => r.priority === 'critical').length, late: rows.filter(r => r.late).length };
}

/** "1 problem open · 1 critical · 1 late" in pieces — only the abnormal
 *  pieces carry colour, and every one says its word (visual rules 3 and 4). */
export function lineProblemsSaid(p: Pick<LineProblems, 'open' | 'critical' | 'late'>): { text: string; red?: boolean }[] {
  if (!p.open) return [{ text: 'No problems open' }];
  return [
    { text: `${p.open} problem${p.open === 1 ? '' : 's'} open` },
    ...(p.critical ? [{ text: ' · ' }, { text: `${p.critical} critical`, red: true }] : []),
    ...(p.late ? [{ text: ' · ' }, { text: `${p.late} late`, red: true }] : []),
  ];
}

/** A line's own programs — planned on it with no job. */
export const ownProgramsOf = (programs: readonly Program[], wsId: string): Program[] =>
  programs.filter(p => !p.deletedAt && !p.projectId && p.workspaceId === wsId);

/** The key a line's work is grouped under beside the jobs — never a job's id. */
export const lineGroupId = (wsId: string): string => `line:${wsId}`;

/** WHAT ONE LINE OWES, as the control room's rows: its problems somebody or
 *  a day is on, and its own programs not proved; and its open Critical
 *  problems, each a row of the control room's critical list. */
export function lineItems(x: LineInput, today: string, ref = Date.now()): { items: JobItem[]; critical: JobItem[] } {
  const base = { jobId: lineGroupId(x.line.id), job: x.line.name, color: LINE_COLOR, line: x.line.id };
  const open = lineProblems(x.snags, x.line, { ref });
  const items: JobItem[] = [];
  const critical: JobItem[] = [];
  for (const r of open.rows) {
    const s = x.snags.find(y => y.id === r.id);
    const on = s?.dueAt != null ? dueToInput(s.dueAt) : undefined;
    const who = r.owner ?? '';
    if (who || on) items.push({ ...base, kind: 'problem', id: r.id, what: r.what, who, ...(on ? { on } : {}), late: r.late });
    if (r.priority === 'critical') {
      critical.push({
        ...base, kind: 'problem', id: r.id, what: r.what, who, ...(on ? { on } : {}), late: r.late,
        critical: {
          where: r.machine ?? x.line.name,
          /* the register's words for where it stands — "3 days late", else "Open · 4 days" */
          state: r.due ?? r.word, word: r.due ?? r.word,
          ...(r.plan ? { more: `going with: ${r.plan}` } : {}),
        },
      });
    }
  }
  for (const p of ownProgramsOf(x.programs, x.line.id)) {
    if (stateOf(p) === 'proved') continue;
    items.push({ ...base, kind: 'program', id: p.id, what: p.what, who: p.from ?? '', ...(p.testOn ? { on: p.testOn } : {}), late: daysOverdue(p, today) != null });
  }
  return { items, critical };
}
