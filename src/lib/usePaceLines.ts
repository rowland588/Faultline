/* The lines in a project — their people, their targets and their ppm numbers,
 * owned by the app rather than by the source file.
 *
 * The default project is seeded from the figures the app shipped with, then
 * edited in place — and the seed only ever fills a line this device has no row
 * for, so a reload can never undo a number somebody typed. A project somebody
 * creates starts empty: its lines are the ones they add.
 *
 * Every device derives the same row id from the line name (see loadPaceLines),
 * which is what lets the figures be entered on a laptop and presented from a
 * phone: the two devices are editing one row, not two rival ones. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadPaceLines, putPaceLine, addPaceLine, deletePaceLine, onDataChange,
  DEFAULT_PROJECT_ID, type PaceLineRow,
} from '../db';
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

/** What a line needs to exist: what the team calls it, and nothing else. The
 *  targets and the people can all be filled in afterwards. */
export interface NewLine {
  key: string; name?: string; variant?: string;
  owner?: string; ownerEmail?: string;
  sponsor?: string; sponsorEmail?: string;
  q1?: number; q2?: number; q3?: number; q4?: number;
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
  /** Setting up the project: the lines themselves, and who is against them. */
  addLine: (line: NewLine) => Promise<void>;
  editLine: (id: string, patch: Partial<PaceLineRow>) => Promise<void>;
  removeLine: (id: string) => Promise<void>;
  moveLine: (id: string, delta: -1 | 1) => Promise<void>;
}

export function usePaceLines(projectId: string = DEFAULT_PROJECT_ID): PaceLinesState {
  const [lines, setLines] = useState<PaceLineRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // db does the migrating, folding onto the shared id and (only for a line
    // this device has no row for) the seeding — one place, so two callers
    // cannot disagree. `updatedAt` is set there, deliberately old.
    //
    // Only the default project is seeded, and only it adopts the line rows
    // written before projects became plural: a project someone creates today
    // must not quietly inherit Project Pace's four lines.
    const isDefault = projectId === DEFAULT_PROJECT_ID;
    const rows = await loadPaceLines(
      projectId,
      isDefault ? PACE_LINES.map((l, i) => ({
        key: l.key, name: l.name, variant: l.variant,
        q1: l.q1, q2: l.q2, q3: l.q3, q4: l.q4,
        weekly: [...l.weekly], sort: i, updatedAt: 0,
      })) : [],
      { adoptOrphans: isDefault },
    );
    setLines(rows);
    setLoading(false);
  }, [projectId]);

  // Re-read when anything changes — including a number typed on the laptop and
  // pulled down here. Debounced, because a burst of writes is one change worth
  // redrawing once. (Typing is safe: each cell keeps its own draft until blur.)
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    setLoading(true);
    void refresh();
    return onDataChange(() => {
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => { void refresh(); }, 300);
    });
  }, [refresh]);

  const write = useCallback(async (next: PaceLineRow[]) => {
    setLines(next);                                // optimistic: typing stays responsive
    for (const r of next) await putPaceLine(r);
  }, []);

  const patch = useCallback(async (key: string, fn: (r: PaceLineRow) => PaceLineRow) => {
    const before = lines.find(r => r.key === key);
    if (!before) return;
    const after = fn(before);
    setLines(lines.map(r => (r.key === key ? after : r)));
    await putPaceLine(after);          // one row, not all of them
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

  /* ---------- setting the project up ---------- */

  const addLine = useCallback(async (l: NewLine) => {
    const key = l.key.trim();
    if (!key) return;
    // A line the project already has is a rename waiting to happen, not a
    // second row — silently adding a duplicate "2A" is the one outcome nobody
    // wants, because both then claim the same numbers.
    if (lines.some(r => r.key.toLowerCase() === key.toLowerCase())) return;
    // A new line starts with as many empty weeks as the project already has, so
    // it lines up under the same week headings instead of starting at week 1.
    await addPaceLine({
      projectId, key,
      name: (l.name ?? '').trim() || `Line ${key}`,
      variant: l.variant?.trim() || undefined,
      owner: l.owner?.trim() || undefined, ownerEmail: l.ownerEmail?.trim().toLowerCase() || undefined,
      sponsor: l.sponsor?.trim() || undefined, sponsorEmail: l.sponsorEmail?.trim().toLowerCase() || undefined,
      q1: l.q1 ?? 0, q2: l.q2 ?? 0, q3: l.q3 ?? 0, q4: l.q4 ?? 0,
      weekly: Array(weeks).fill(null) as (number | null)[],
      sort: lines.reduce((m, r) => Math.max(m, r.sort ?? 0), 0) + 1,
    });
    await refresh();
  }, [lines, projectId, weeks, refresh]);

  const editLine = useCallback(async (id: string, p: Partial<PaceLineRow>) => {
    const before = lines.find(r => r.id === id);
    if (!before) return;
    const after = { ...before, ...p };
    setLines(lines.map(r => (r.id === id ? after : r)));
    await putPaceLine(after);
  }, [lines]);

  const removeLine = useCallback(async (id: string) => {
    setLines(lines.filter(r => r.id !== id));
    await deletePaceLine(id);
    await refresh();
  }, [lines, refresh]);

  /** Swap with the neighbour and write both — order is data, so it has to
   *  travel to the other device rather than being however this one sorted. */
  const moveLine = useCallback(async (id: string, delta: -1 | 1) => {
    const i = lines.findIndex(r => r.id === id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= lines.length) return;
    const next = [...lines];
    [next[i], next[j]] = [next[j], next[i]];
    const stamped = next.map((r, n) => ({ ...r, sort: n }));
    setLines(stamped);
    for (const r of stamped) await putPaceLine(r);
  }, [lines]);

  return {
    loading, lines: padded, weeks, thisWeek,
    setPpm, setTarget, addWeek, removeLastWeek,
    addLine, editLine, removeLine, moveLine,
  };
}
