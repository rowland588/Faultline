/* Weekly uploads.
 *
 * The newest upload IS the picture — the app reads the workbook and shows it,
 * nothing more. Earlier uploads are kept only so a bad one can be removed and
 * the previous file take over again. The workbook shipped with the app is the
 * last resort underneath them all. */
import { useCallback, useEffect, useState } from 'react';
import { listPaceSnapshots, addPaceSnapshot, deletePaceSnapshot, onDataChange, DEFAULT_PROJECT_ID } from '../db';
import { readPaceWorkbook, type PaceSnapshot, type PaceRoster } from './paceWorkbook';
import { PACE_ACTIONS, PACE_BASELINE_AT, PACE_ROSTER } from './projectPaceData';
import type { PaceAction } from './projectPaceData';

const BASELINE: PaceSnapshot = {
  id: 'baseline',
  takenAt: PACE_BASELINE_AT,
  fileName: 'Project_Pace_Action_Tracker.xlsx (baseline)',
  // ^ the workbook the app SHIPS with, re-cut from the real tracker whenever it
  //   changes shape. It is last in the list, so the moment a real upload lands
  //   it stops being what anybody sees.
  actions: PACE_ACTIONS,
  roster: PACE_ROSTER,
};

export interface PaceState {
  loading: boolean;
  /** Newest first, baseline last. */
  snapshots: PaceSnapshot[];
  /** The current picture — the newest upload, or the baseline. */
  actions: PaceAction[];
  /** The team's own owner/status lists, from the newest upload that carried them. */
  roster?: PaceRoster;
  busy: boolean;
  error: string | null;
  warnings: string[];
  upload: (file: File) => Promise<void>;
  remove: (id: string) => Promise<void>;
  dismissError: () => void;
}

/** Uploads for ONE project. The workbook the app shipped with belongs to
 *  Project Pace, so only Project Pace falls back to it — a project someone
 *  creates starts with no actions until they upload their own tracker. */
export function usePaceSnapshots(projectId: string = DEFAULT_PROJECT_ID): PaceState {
  const [rows, setRows] = useState<PaceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    const stored = await listPaceSnapshots(projectId);
    setRows(stored.map(r => ({
      id: r.id, takenAt: r.takenAt, fileName: r.fileName,
      actions: r.actions as PaceAction[],
      roster: (r as { roster?: PaceRoster }).roster,
    })));
    setLoading(false);
  }, [projectId]);

  // Upload the tracker on the laptop, and the phone is already showing it.
  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  const upload = useCallback(async (file: File) => {
    setBusy(true); setError(null); setWarnings([]);
    try {
      const report = readPaceWorkbook(await file.arrayBuffer(), file.name);
      await addPaceSnapshot({
        id: report.snapshot.id,
        projectId,
        takenAt: report.snapshot.takenAt,
        fileName: report.snapshot.fileName,
        actions: report.snapshot.actions,
        roster: report.snapshot.roster,
      });
      setWarnings(report.warnings);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That file could not be read.');
    } finally {
      setBusy(false);
    }
  }, [load, projectId]);

  const remove = useCallback(async (id: string) => {
    await deletePaceSnapshot(id);
    await load();
  }, [load]);

  // newest first, with the baseline always last — and only for the project the
  // baseline actually describes.
  const sorted = [...rows].sort((a, b) => b.takenAt - a.takenAt);
  const chain = projectId === DEFAULT_PROJECT_ID ? sorted.concat(BASELINE) : sorted;
  const current = chain[0];

  return {
    loading, busy, error, warnings,
    snapshots: chain,
    actions: current?.actions ?? [],
    // an older upload may predate roster support — fall back down the chain
    roster: chain.find(s => s.roster?.owners.length)?.roster,
    upload, remove,
    dismissError: () => setError(null),
  };
}
