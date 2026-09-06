/* Weekly uploads.
 *
 * The newest upload IS the picture — the app reads the workbook and shows it,
 * nothing more. Earlier uploads are kept only so a bad one can be removed and
 * the previous file take over again. The workbook shipped with the app is the
 * last resort underneath them all. */
import { useCallback, useEffect, useState } from 'react';
import { listPaceSnapshots, addPaceSnapshot, deletePaceSnapshot, onDataChange } from '../db';
import { readPaceWorkbook, type PaceSnapshot, type PaceRoster } from './paceWorkbook';
import { PACE_ACTIONS, PACE_BASELINE_AT, PACE_ROSTER } from './projectPaceData';
import type { PaceAction } from './projectPaceData';

const BASELINE: PaceSnapshot = {
  id: 'baseline',
  takenAt: PACE_BASELINE_AT,
  fileName: 'Project_Pace_Action_Tracker.xlsx (baseline)',
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

export function usePaceSnapshots(): PaceState {
  const [rows, setRows] = useState<PaceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const load = useCallback(async () => {
    const stored = await listPaceSnapshots();
    setRows(stored.map(r => ({
      id: r.id, takenAt: r.takenAt, fileName: r.fileName,
      actions: r.actions as PaceAction[],
      roster: (r as { roster?: PaceRoster }).roster,
    })));
    setLoading(false);
  }, []);

  // Upload the tracker on the laptop, and the phone is already showing it.
  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  const upload = useCallback(async (file: File) => {
    setBusy(true); setError(null); setWarnings([]);
    try {
      const report = readPaceWorkbook(await file.arrayBuffer(), file.name);
      await addPaceSnapshot({
        id: report.snapshot.id,
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
  }, [load]);

  const remove = useCallback(async (id: string) => {
    await deletePaceSnapshot(id);
    await load();
  }, [load]);

  // newest first, with the baseline always last
  const chain = [...rows].sort((a, b) => b.takenAt - a.takenAt).concat(BASELINE);
  const current = chain[0];

  return {
    loading, busy, error, warnings,
    snapshots: chain,
    actions: current.actions,
    // an older upload may predate roster support — fall back down the chain
    roster: chain.find(s => s.roster?.owners.length)?.roster,
    upload, remove,
    dismissError: () => setError(null),
  };
}
