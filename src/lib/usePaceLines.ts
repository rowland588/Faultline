/* The lines in a project, and the people against them.
 *
 * THE NUMBERS ARE NOT HERE. A line used to carry four quarterly ppm targets and
 * a weekly array indexed from one fixed Monday, and this hook was how they were
 * typed in. Both described one factory's spreadsheet. What a line is measured on
 * is the business's to name now — lib/useMeasures.ts holds the measures, the
 * periods, the targets and the readings.
 *
 * NOTHING IS SEEDED. Four lines of one factory's used to be compiled in and
 * filled into the first project on every device. A project's lines are the ones
 * somebody added to it, and a project with none says so.
 *
 * Every device derives the same row id from the line name (see loadPaceLines),
 * which is what lets the figures be entered on a laptop and presented from a
 * phone: the two devices are editing one row, not two rival ones. */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  loadPaceLines, putPaceLine, addPaceLine, deletePaceLine, onDataChange,
  type PaceLineRow,
} from '../db';
/** What a line needs to exist: what the team calls it, and nothing else. The
 *  people and the targets can all be filled in afterwards. */
export interface NewLine {
  key: string; name?: string; variant?: string;
  owner?: string; ownerEmail?: string;
  sponsor?: string; sponsorEmail?: string;
}

export interface PaceLinesState {
  loading: boolean;
  lines: PaceLineRow[];
  /** Setting up the project: the lines themselves, and who is against them. */
  addLine: (line: NewLine) => Promise<void>;
  editLine: (id: string, patch: Partial<PaceLineRow>) => Promise<void>;
  removeLine: (id: string) => Promise<void>;
  moveLine: (id: string, delta: -1 | 1) => Promise<void>;
}

export function usePaceLines(projectId: string): PaceLinesState {
  const [lines, setLines] = useState<PaceLineRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // db does the migrating and the folding onto the shared id — one place, so
    // two callers cannot disagree about which row is which line.
    setLines(await loadPaceLines(projectId));
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

  /* ---------- setting the project up ---------- */

  const addLine = useCallback(async (l: NewLine) => {
    const key = l.key.trim();
    if (!key) return;
    // A line the project already has is a rename waiting to happen, not a
    // second row — silently adding a duplicate "2A" is the one outcome nobody
    // wants, because both then claim the same numbers.
    if (lines.some(r => r.key.toLowerCase() === key.toLowerCase())) return;
    await addPaceLine({
      projectId, key,
      name: (l.name ?? '').trim() || `Line ${key}`,
      variant: l.variant?.trim() || undefined,
      owner: l.owner?.trim() || undefined, ownerEmail: l.ownerEmail?.trim().toLowerCase() || undefined,
      sponsor: l.sponsor?.trim() || undefined, sponsorEmail: l.sponsorEmail?.trim().toLowerCase() || undefined,
      sort: lines.reduce((m, r) => Math.max(m, r.sort ?? 0), 0) + 1,
    });
    await refresh();
  }, [lines, projectId, refresh]);

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

  return { loading, lines, addLine, editLine, removeLine, moveLine };
}
