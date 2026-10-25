/* WHAT A LOG OWES, AND HOW IT COUNTS — one reading for the hubs, the line's page, the line report and Needs you
 * (knowledge/specs/FC-236-check-logs.md §10, rule 5: anything new shows up wherever its parent shows).
 *
 * A log is a record with a tick: a check overdue, a check failed and not yet checked again, a check due now. Those
 * three are work owed, said the way every other thing owed is said (a row with what, who, by when, late or not);
 * a check merely coming soon is not. A failure's problem is on the register and counted there — this is the
 * re-check that is owed, not the fix. Pure: studies in, rows out. */
import type { ToolStudy } from '../../lib/study';
import type { JobItem } from '../../lib/portfolio';
import type { LeanAction } from '../../lib/lean';
import { isoDay, niceDay } from '../../lib/weeks';
import { defOf } from './registry';
import { roundOf, when, type CheckState, type Tone } from './checks';

export const isLog = (s: ToolStudy): boolean => s.tool === 'log' && !s.deletedAt && !!s.agreed?.log;

/** One log's standing, in a line: "2 overdue · 1 failed", or "up to date". */
export interface LogStatus {
  checks: number;
  overdue: number;
  failed: number;
  due: number;
  results: number;
  lastAt?: number;
  tone: Tone;
  words: string;
}

export function statusOf(s: ToolStudy, now: number): LogStatus {
  const log = s.agreed?.log;
  const def = defOf(log?.key);
  const round = log ? roundOf(log, s.facts.results, now, def) : { now: [], later: [], events: [], off: [] };
  const all = [...round.now, ...round.later, ...round.events];
  const overdue = all.filter(x => x.key === 'overdue').length, failed = all.filter(x => x.key === 'failed').length, due = all.filter(x => x.key === 'due').length;
  const results = (s.facts.results ?? []).filter(r => !r.struck);
  const checks = all.length;
  const parts = [overdue ? `${overdue} overdue` : '', failed ? `${failed} failed` : '', due ? `${due} due now` : ''].filter(Boolean);
  const lastAt = results.reduce((m, r) => Math.max(m, r.at), 0) || undefined;
  return {
    checks, overdue, failed, due, results: results.length, ...(lastAt ? { lastAt } : {}),
    tone: overdue || failed ? 'r' : due ? 'a' : results.length ? 'g' : 'n',
    words: !checks ? 'nothing on the list yet' : parts.length ? parts.join(' · ') : results.length ? `up to date${lastAt ? ` — last check ${when(lastAt, now)}` : ''}` : 'none done yet',
  };
}

/** The sum over a scope's logs: how many, and how many are overdue, failed or due. */
export function scopeCounts(studies: readonly ToolStudy[], now: number): { logs: number; overdue: number; failed: number; due: number } {
  let overdue = 0, failed = 0, due = 0, logs = 0;
  for (const s of studies.filter(isLog)) { const t = statusOf(s, now); logs++; overdue += t.overdue; failed += t.failed; due += t.due; }
  return { logs, overdue, failed, due };
}

/** One check owed. */
export interface LogOwed {
  studyId: string;
  logKey: string;
  log: string;
  check: CheckState;
  /** overdue and failed are late; due now is owed today. */
  kind: 'overdue' | 'failed' | 'due';
  what: string;
  who: string;
  /** In words, for a branch under the row. */
  says: string;
}

export function logOwed(studies: readonly ToolStudy[], now: number): LogOwed[] {
  const out: LogOwed[] = [];
  for (const s of studies.filter(isLog)) {
    const log = s.agreed!.log!;
    const round = roundOf(log, s.facts.results, now, defOf(log.key));
    for (const st of round.now) {
      if (st.key !== 'overdue' && st.key !== 'failed' && st.key !== 'due') continue;
      const c = st.check;
      out.push({ studyId: s.id, logKey: log.key, log: s.name, check: st, kind: st.key, what: `${c.name}${c.where ? ` · ${c.where}` : ''}`, who: (c.who ?? '').trim(), says: st.words });
    }
  }
  return out.sort((a, b) => Number(b.kind !== 'due') - Number(a.kind !== 'due') || (b.check.lateMs ?? 0) - (a.check.lateMs ?? 0));
}

/** Where an owed check opens: its log, inside the project when it is the project's. */
export const logItemId = (key: string, studyId: string): string => `log:${key}:${studyId}`;
export function logItemHref(projectId: string, id: string): string | undefined {
  const m = /^log:([^:]+):(.+)$/.exec(id);
  return m ? `/log/${encodeURIComponent(m[1])}/${encodeURIComponent(m[2])}${projectId ? `?project=${encodeURIComponent(projectId)}` : ''}` : undefined;
}

/** A project's logs as rows of what it owes (Needs you, the control room's week, the Actions): `kind: 'check'`,
 *  late when overdue or failed. A job's own checks that keep a gain (6M) are the same kind of row. */
export function logJobItems(p: { id: string; name: string; color: string }, studies: readonly ToolStudy[] | undefined, today: string, now = Date.now()): JobItem[] {
  const mine = (studies ?? []).filter(s => isLog(s) && s.projectId === p.id);
  return logOwed(mine, now).map((o): JobItem => ({
    jobId: p.id, job: p.name, color: p.color, kind: 'check', id: logItemId(o.logKey, o.studyId), what: o.what, who: o.who,
    on: o.check.nextDue ? isoDay(o.check.nextDue) : today, late: o.kind !== 'due', branch: `${o.log} — ${o.says}`,
  }));
}

/** A line's owed checks as the line report's "who owes what by when". */
export function owedActions(studies: readonly ToolStudy[], now: number): LeanAction[] {
  return logOwed(studies, now).map((o): LeanAction => ({
    what: `${o.what}: ${o.kind === 'failed' ? 'check again' : o.kind === 'overdue' ? 'overdue' : 'due now'}`, ...(o.who ? { who: o.who } : {}),
    ...(o.check.nextDue ? { due: niceDay(isoDay(o.check.nextDue)) } : {}), state: o.kind === 'failed' ? 'Failed' : o.kind === 'overdue' ? 'Overdue' : 'Due', tone: o.kind === 'due' ? 'a' : 'r', from: o.log,
  }));
}
