/* The ppm numbers, owned by the app rather than by the source file.
 *
 * Seeded once from the figures the app shipped with, then edited in place. The
 * seed runs only when the store is EMPTY — otherwise every reload would undo
 * the user's own numbers. */
import { useCallback, useEffect, useState } from 'react';
import { listPaceLines, putPaceLine, type PaceLineRow } from '../db';
import { PACE_LINES, PACE_START } from './projectPaceData';

const WEEK_MS = 7 * 86_400_000;

/** Monday of the week at `index`, counted from the first measured week. */
export function weekStart(index: number): Date {
  return new Date(PACE_START + index * WEEK_MS);
}
export function weekLabel(index: number): string {
  return weekStart(index).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export interface PaceLinesState {
  loading: boolean;
  lines: PaceLineRow[];
  weeks: number;
  setPpm: (key: string, week: number, value: number | null) => Promise<void>;
  setTarget: (key: string, q: 'q1' | 'q2' | 'q3' | 'q4', value: number) => Promise<void>;
  addWeek: () => Promise<void>;
  removeLastWeek: () => Promise<void>;
}

export function usePaceLines(): PaceLinesState {
  const [lines, setLines] = useState<PaceLineRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      let rows = await listPaceLines();
      if (!rows.length) {
        // first run on this device — take the shipped figures as the starting point
        rows = PACE_LINES.map(l => ({
          key: l.key, name: l.name, variant: l.variant,
          q1: l.q1, q2: l.q2, q3: l.q3, q4: l.q4,
          weekly: [...l.weekly], updatedAt: Date.now(),
        }));
        for (const r of rows) await putPaceLine(r);
      }
      setLines(rows.sort(byShippedOrder));
      setLoading(false);
    })();
  }, []);

  const write = useCallback(async (next: PaceLineRow[]) => {
    setLines(next.sort(byShippedOrder));           // optimistic: typing stays responsive
    for (const r of next) await putPaceLine(r);
  }, []);

  const patch = useCallback(async (key: string, fn: (r: PaceLineRow) => PaceLineRow) => {
    const next = lines.map(r => (r.key === key ? fn(r) : r));
    await write(next);
  }, [lines, write]);

  const weeks = lines.reduce((m, l) => Math.max(m, l.weekly.length), 0);

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

  return { loading, lines, weeks, setPpm, setTarget, addWeek, removeLastWeek };
}

/** Keep 2A, 2B, 7, 10 in the order the team says them, not alphabetically. */
const order = new Map(PACE_LINES.map((l, i) => [l.key, i]));
const byShippedOrder = (a: PaceLineRow, b: PaceLineRow) =>
  (order.get(a.key) ?? 99) - (order.get(b.key) ?? 99);
