/* A LINE WATCH — every machine of a line watched at once, on one clock.
 *
 * Rowland, 25 October: "I have 2 machines in the project ... if I pick the entire line, the next screen
 * I get all the assets. Then I set them up and I can run multiple asset analyses at the same time ...
 * start one clock for the entire line and I can click through the UI on each individual asset."
 *
 * No new record: each machine is a reliability study of its own (its counts, taps, figures, paper), and
 * the studies watched together share `agreed.reliability.group`. The clock is the same stretch written on
 * each of them, so every machine's watched time is the line's, and one press starts or stops them all.
 * Nothing worked out is stored; this module is the pure part (the page is ReliabilityScreen). */
import type { RelCount, ToolStudy, WatchRun } from '../../lib/study';
import { DEFAULT_STOP_REASONS, isStoppage, MAX_REASONS } from './repair';
import { plural, relAll, runningRun, studyReliabilitySays } from './reliability';

/** The studies watched with this one — itself included — in the order they were made. None for a study on its own. */
export function groupOf(all: readonly ToolStudy[], s: Pick<ToolStudy, 'id' | 'agreed'>): ToolStudy[] {
  const g = s.agreed?.reliability?.group;
  if (!g) return [];
  return all.filter(x => x.tool === 'reliability' && !x.deletedAt && x.agreed?.reliability?.group === g)
    .sort((a, b) => a.createdAt - b.createdAt || (a.machine ?? '').localeCompare(b.machine ?? ''));
}

/** The watch with a stretch started at `from` — unchanged when one is already running. */
export function started(watch: readonly WatchRun[] | undefined, from: number, id: string, by?: string): WatchRun[] {
  const w = watch ?? [];
  return runningRun(w) ? [...w] : [...w, { id, from, ...(by ? { by } : {}) }];
}

/** The watch with the running stretch stopped at `at` — unchanged when none is running. */
export function stopped(watch: readonly WatchRun[] | undefined, at: number): WatchRun[] {
  const w = watch ?? [];
  const open = runningRun(w);
  return open ? w.map(r => (r.id === open.id ? { ...r, to: Math.max(open.from, at) } : r)) : [...w];
}

/** One machine of the line watch in a row: what it is, what has been tapped, and what its figures say. */
export interface LineRow {
  id: string; machine: string; /** every thing counted, each with its taps in the watch */ counts: { id: string; words: string; n: number }[];
  taps: number; running: boolean; verdict: string; tone: ReturnType<typeof studyReliabilitySays>['tone'];
}

export function lineRows(sibs: readonly ToolStudy[], t: number): LineRow[] {
  return sibs.map(s => {
    const a = s.agreed?.reliability, runs = s.facts.watch ?? [], events = s.facts.events ?? [];
    const items = relAll(a, runs, events, t);
    const said = studyReliabilitySays(a, runs, events, t);
    const counts = items.map(i => ({ id: i.c.id, words: `${i.f.n} ${plural(i.c.event, i.f.n)}`, n: i.f.n }));
    return { id: s.id, machine: s.machine || s.name, counts, taps: counts.reduce((n, c) => n + c.n, 0), running: !!runningRun(runs), verdict: said.verdict, tone: said.tone };
  });
}

/** The line, in words: "3 machines on one clock — 2 running". */
export function lineWords(rows: readonly LineRow[]): string {
  const on = rows.filter(r => r.running).length;
  return `${rows.length} machine${rows.length === 1 ? '' : 's'} on one clock — ${on === rows.length && on ? 'all watching' : on ? `${on} watching` : 'the watch is stopped'}`;
}

/** What each machine of a new line watch is set up with: the things counted, in the floor's words. */
export interface MachineSetup { machine: string; counting: string; targetMin?: number; /** time each stop and press its reason */ timed?: boolean; /** the reasons typed, commas between */ reasons?: string }

/** The reasons typed as a list — commas or lines, none twice. */
export const reasonList = (text: string | undefined): string[] => {
  const seen = new Set<string>();
  return (text ?? '').split(/[,\n]/).map(x => x.trim()).filter(x => { const k = x.toLowerCase(); if (!x || seen.has(k)) return false; seen.add(k); return true; });
};

/** The counts a machine's set-up makes — one thing, or several split by commas, a name once. */
export function countsFor(counting: string, targetMin: number | undefined, newId: () => string, timing?: { reasons: string[] }): RelCount[] {
  const names = [...new Set(counting.split(/[,;]+/).map(x => x.trim().toLowerCase()).filter(Boolean))].slice(0, 6);
  return (names.length ? names : ['stop']).map((name, i) => ({ id: newId(), name, ...(i === 0 && targetMin ? { targetMin } : {}),
    /* a stoppage, timed: help arrived, running again — and the reason pressed from the list */
    ...(timing && isStoppage(name) ? { timed: 'stop' as const, ...(timing.reasons.length ? { reasons: timing.reasons } : {}) } : {}) }));
}

/** The reasons a machine starts with: the typed list, else the usual one. */
export const startingReasons = (typed: string | undefined): string[] => { const l = reasonList(typed); return l.length ? l : [...DEFAULT_STOP_REASONS]; };

/** Is a set-up fit to start with? Says what is missing in words, or nothing. */
export function setupProblem(rows: readonly (MachineSetup & { on: boolean })[]): string | undefined {
  const on = rows.filter(r => r.on);
  if (!on.length) return 'Tick at least one machine to watch.';
  const long = on.find(r => r.timed && reasonList(r.reasons).length > MAX_REASONS);
  if (long) return `${long.machine}: a short list of reasons — ${MAX_REASONS} at most.`;
  const bad = on.find(r => r.targetMin !== undefined && !(r.targetMin > 0 && r.targetMin <= 100_000));
  return bad ? `${bad.machine}: an MTBF wanted is minutes, more than 0 — or leave it empty.` : undefined;
}
