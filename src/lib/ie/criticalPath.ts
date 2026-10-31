/* CRITICAL PATH AND FLOAT — FC-215 (knowledge/specs/FC-215-critical-path.md; knowledge/methods/projects/critical-path.md).
 *
 * The critical path method (Kelley & Walker 1959): tasks with durations and the tasks each must wait for (finish to start).
 *   forward pass   ES = the latest EF of what it waits for (0 when it waits for nothing); EF = ES + duration; the end is the latest EF
 *   backward pass  LF = the earliest LS of what waits for it (the end when nothing does); LS = LF − duration
 *   total float    LS − ES (= LF − EF): the days it can slip before the end moves; critical where there is none
 * Pure: no dates, no calendar — days are the caller's working days counted from the start (day 0). Proved in
 * __tests__/criticalPath.test.ts against networks whose answers were worked out another way (scripts/knowledge/cases-calc.py
 * §FC-215, by listing every path from the start to the end — not by the two passes). */

export interface CpmTask {
  /** Anything unique: a letter, a key. */
  id: string;
  /** Working days; 0 is a milestone. */
  days: number;
  /** The ids this task cannot start before they have finished. */
  after: string[];
}

export interface CpmRow {
  id: string;
  days: number;
  after: string[];
  /** Earliest start and finish, latest start and finish — in days from the start. */
  es: number; ef: number; ls: number; lf: number;
  /** Total float, in days: never negative, never dust. */
  float: number;
  critical: boolean;
}

export type CpmError =
  | { ok: false; error: 'cycle'; cycle: string[] }
  | { ok: false; error: 'unknown'; id: string; waitsFor: string }
  | { ok: false; error: 'duplicate'; id: string }
  | { ok: false; error: 'empty' };

export interface CpmOk {
  ok: true;
  /** Every task, in the order it was given. */
  rows: CpmRow[];
  /** The earliest the last task can finish. */
  end: number;
  /** Every chain of critical tasks from a start to the end — more than one when two chains tie. */
  paths: string[][];
}

/** A value a Map must hold (every id was checked in before it is looked up). */
const need = <T>(x: T | undefined): T => { if (x === undefined) throw new Error('criticalPath: an id went missing'); return x; };

const EPS = 1e-9;
/** Floating-point dust off a day count: 0.30000000000000004 is 0.3, and −1e-15 is 0. */
const clean = (x: number): number => { const r = Math.round(x * 1e9) / 1e9; return Object.is(r, -0) ? 0 : r; };

/** The two passes. Returns the rows and every critical path, or why the network cannot be worked out (a loop, a task that waits for
 *  one that is not there, a repeated id, nothing at all). */
export function criticalPath(tasks: CpmTask[]): CpmOk | CpmError {
  if (tasks.length === 0) return { ok: false, error: 'empty' };
  const byId = new Map<string, CpmTask>();
  for (const t of tasks) { if (byId.has(t.id)) return { ok: false, error: 'duplicate', id: t.id }; byId.set(t.id, t); }
  for (const t of tasks) for (const p of t.after) if (!byId.has(p)) return { ok: false, error: 'unknown', id: t.id, waitsFor: p };

  /* the order in which every task comes after what it waits for (Kahn); what is left over is a loop */
  const waiting = new Map<string, number>(tasks.map(t => [t.id, new Set(t.after).size]));
  const succ = new Map<string, string[]>(tasks.map(t => [t.id, []]));
  for (const t of tasks) for (const p of new Set(t.after)) need(succ.get(p)).push(t.id);
  const order: string[] = [];
  const ready = tasks.filter(t => waiting.get(t.id) === 0).map(t => t.id);
  while (ready.length) {
    const id = need(ready.shift());
    order.push(id);
    for (const s of need(succ.get(id))) { const n = (need(waiting.get(s))) - 1; waiting.set(s, n); if (n === 0) ready.push(s); }
  }
  if (order.length < tasks.length) {
    /* every task still waiting waits for another that is still waiting: following that back must come round */
    const left = new Set(tasks.filter(t => !order.includes(t.id)).map(t => t.id));
    const seen: string[] = [];
    let at = [...left][0];
    while (!seen.includes(at)) { seen.push(at); at = need(need(byId.get(at)).after.find(p => left.has(p))); }
    const cycle = seen.slice(seen.indexOf(at)).reverse();
    return { ok: false, error: 'cycle', cycle: [...cycle, cycle[0]] };
  }

  const es = new Map<string, number>(), ef = new Map<string, number>();
  for (const id of order) {
    const t = need(byId.get(id));
    const s = Math.max(0, ...t.after.map(p => need(ef.get(p))));
    es.set(id, clean(s)); ef.set(id, clean(s + t.days));
  }
  const end = Math.max(...tasks.map(t => need(ef.get(t.id))));
  const ls = new Map<string, number>(), lf = new Map<string, number>();
  for (const id of [...order].reverse()) {
    const t = need(byId.get(id));
    const f = need(succ.get(id)).length ? Math.min(...need(succ.get(id)).map(s => need(ls.get(s)))) : end;
    lf.set(id, clean(f)); ls.set(id, clean(f - t.days));
  }
  const rows: CpmRow[] = tasks.map(t => {
    const float = clean((need(ls.get(t.id))) - (need(es.get(t.id))));
    return { id: t.id, days: t.days, after: t.after, es: need(es.get(t.id)), ef: need(ef.get(t.id)), ls: need(ls.get(t.id)), lf: need(lf.get(t.id)), float, critical: float <= EPS };
  });

  /* the critical paths: from each critical task that waits for no critical task, along the edges that lose no time */
  const row = new Map(rows.map(r => [r.id, r]));
  const crit = (id: string) => need(row.get(id)).critical;
  const onwards = (id: string): string[] => need(succ.get(id)).filter(s => crit(s) && Math.abs(need(row.get(s)).es - need(row.get(id)).ef) <= EPS);
  const paths: string[][] = [];
  const walk = (path: string[]) => {
    const here = path[path.length - 1];
    const next = onwards(here);
    if (!next.length) { if (Math.abs(need(row.get(here)).ef - end) <= EPS) paths.push(path); return; }
    for (const n of next) walk([...path, n]);
  };
  for (const r of rows) if (r.critical && !r.after.some(p => crit(p) && Math.abs(need(row.get(p)).ef - r.es) <= EPS)) walk([r.id]);
  return { ok: true, rows, end, paths };
}

export interface SlipOut {
  /** The end with the task that much later. */
  end: number;
  /** How much later the end is: max(0, slip − float) for one task slipping. */
  moved: number;
  /** The float the task had, and how much of it the slip uses up. */
  float: number;
  used: number;
}

/** One task finishing `days` later than planned, the rest as they are: where the end goes. */
export function slip(tasks: CpmTask[], id: string, days: number): SlipOut | undefined {
  const base = criticalPath(tasks);
  if (!base.ok) return undefined;
  const r = base.rows.find(x => x.id === id);
  if (!r) return undefined;
  const later = criticalPath(tasks.map(t => (t.id === id ? { ...t, days: t.days + days } : t)));
  if (!later.ok) return undefined;
  const moved = clean(later.end - base.end);
  return { end: later.end, moved, float: r.float, used: clean(Math.min(days, r.float)) };
}
