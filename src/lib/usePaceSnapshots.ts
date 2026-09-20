/* Weekly uploads.
 *
 * The newest upload IS the picture — the app reads the workbook and shows it,
 * nothing more. Earlier uploads are kept only so a bad one can be removed and
 * the previous file take over again.
 *
 * THERE IS NO BASELINE UNDERNEATH THEM. One factory's tracker used to ship
 * inside the app and sit at the bottom of this chain, so a project with no
 * upload showed somebody else's 28 actions and called them yours. A project
 * with no upload now shows nothing and says so. */
import { useCallback, useEffect, useState } from 'react';
import { listPaceSnapshots, addPaceSnapshot, deletePaceSnapshot, onDataChange } from '../db';
import { readPaceWorkbook, type PaceSnapshot, type PaceRoster, type PaceParetoSheet } from './paceWorkbook';
import type { PaceAction } from './tracker';

export interface PaceState {
  loading: boolean;
  /** Newest first. Empty until somebody uploads. */
  snapshots: PaceSnapshot[];
  /** The current picture — the newest upload, and nothing at all before that. */
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

/** Uploads for ONE project. Every project starts with no actions until
 *  somebody uploads its own tracker — there is nothing to inherit. */
export function usePaceSnapshots(projectId: string): PaceState {
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
      pareto: (r as { pareto?: PaceParetoSheet }).pareto,
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
        /* Written here or it is lost: this call names every field rather than
           spreading the snapshot, so anything the parser learns to read has to
           be added on this line too. */
        pareto: report.snapshot.pareto,
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

  // newest first
  const chain = [...rows].sort((a, b) => b.takenAt - a.takenAt);
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
