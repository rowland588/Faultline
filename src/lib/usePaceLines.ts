/* The ppm numbers, owned by the app rather than by the source file.
 *
 * Seeded from the figures the app shipped with, then edited in place — and the
 * seed only ever fills a line this device has no row for, so a reload can never
 * undo a number somebody typed.
 *
 * Every device derives the same row id from the line name (see loadPaceLines),
 * which is what lets the figures be entered on a laptop and presented from a
 * phone: the two devices are editing one row, not two rival ones. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPaceLines, putPaceLine, onDataChange, type PaceLineRow } from '../db';
import { PACE_LINES, PACE_START } from './projectPaceData';

const WEEK_MS = 7 * 86_400_000;

/** Monday of the week at `index`, counted from the first measured week. */
export function weekStart(index: number): Date {
  return new Date(PACE_START + index * WEEK_MS);
}
export function weekLabel(index: number): string {
  return weekStart(index).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** Which week we are in right now, counted from PACE_START (0-based). The grid
 *  always runs up to here, so the week in progress is always there to type into
 *  and nobody has to remember to add one every Monday. */
export function currentWeekIndex(now = Date.now()): number {
  return Math.max(0, Math.floor((now - PACE_START) / WEEK_MS));
}

export interface PaceLinesState {
  loading: boolean;
  lines: PaceLineRow[];
  weeks: number;
  /** 0-based index of the week in progress — the grid never stops short of it. */
  thisWeek: number;
  setPpm: (key: string, week: number, value: number | null) => Promise<void>;
  setTarget: (key: string, q: 'q1' | 'q2' | 'q3' | 'q4', value: number) => Promise<void>;
  addWeek: () => Promise<void>;
  removeLastWeek: () => Promise<void>;
}

export function usePaceLines(): PaceLinesState {
  const [lines, setLines] = useState<PaceLineRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // db does the migrating, folding onto the shared id and (only for a line
    // this device has no row for) the seeding — one place, so two callers
    // cannot disagree. `updatedAt` is set there, deliberately old.
    const rows = await loadPaceLines(PACE_LINES.map(l => ({
      key: l.key, name: l.name, variant: l.variant,
      q1: l.q1, q2: l.q2, q3: l.q3, q4: l.q4,
      weekly: [...l.weekly], updatedAt: 0,
    })));
    setLines(rows.sort(byShippedOrder));
    setLoading(false);
  }, []);

  // Re-read when anything changes — including a number typed on the laptop and
  // pulled down here. Debounced, because a burst of writes is one change worth
  // redrawing once. (Typing is safe: each cell keeps its own draft until blur.)
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    void refresh();
    return onDataChange(() => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void refresh(); }, 300);
    });
  }, [refresh]);

  const write = useCallback(async (next: PaceLineRow[]) => {
    setLines(next.sort(byShippedOrder));           // optimistic: typing stays responsive
    for (const r of next) await putPaceLine(r);
  }, []);

  const patch = useCallback(async (key: string, fn: (r: PaceLineRow) => PaceLineRow) => {
    const before = lines.find(r => r.key === key);
    if (!before) return;
    const after = fn(before);
    setLines(lines.map(r => (r.key === key ? after : r)).sort(byShippedOrder));
    await putPaceLine(after);          // one row, not all four
  }, [lines]);

  // Always reach the current week, even if nothing has been typed into it yet.
  // Padding is for display only — nothing is written until a number is entered.
  const thisWeek = currentWeekIndex();
  const weeks = Math.max(lines.reduce((m, l) => Math.max(m, l.weekly.length), 0), thisWeek + 1);
  const padded = lines.map(l => (l.weekly.length >= weeks
    ? l
    : { ...l, weekly: [...l.weekly, ...Array(weeks - l.weekly.length).fill(null)] as (number | null)[] }));

  const setPpm = useCallback(async (key: string, week: number, value: number | null) => {
    await patch(key, r => {
      const weekly = [...r.weekly];
      while (weekly.length <= week) weekly.push(null);
      weekly[week] = value;
      return { ...r, weekly };
    });
  }, [patch]);

  const setTarget = useCallback(async (key: string, q: 'q1' | 'q2' | 'q3' | 'q4', value: number) => {
    await patch(key, r => ({ ...r, [q]: value }));
  }, [patch]);

  const addWeek = useCallback(async () => {
    await write(lines.map(r => ({ ...r, weekly: [...r.weekly, null] })));
  }, [lines, write]);

  /** Only ever drops a trailing week that holds no readings. */
  const removeLastWeek = useCallback(async () => {
    const last = weeks - 1;
    if (last < 0) return;
    if (lines.some(l => l.weekly[last] != null)) return;
    await write(lines.map(r => ({ ...r, weekly: r.weekly.slice(0, last) })));
  }, [lines, weeks, write]);

  return { loading, lines: padded, weeks, thisWeek, setPpm, setTarget, addWeek, removeLastWeek };
}

/** Keep 2A, 2B, 7, 10 in the order the team says them, not alphabetically. */
const order = new Map(PACE_LINES.map((l, i) => [l.key, i]));
const byShippedOrder = (a: PaceLineRow, b: PaceLineRow) =>
  (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99);
