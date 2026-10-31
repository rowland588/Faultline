/* HOW FRESH THE LOOKING IS, LIVE (FC-199) — each line's looking, read from the device's own records and read again
 * when anything is written (coalesced: one save is often dozens of writes). Nothing is written. */
import { useEffect, useMemo, useState } from 'react';
import type { Workspace } from '../../types';
import { allPaceLines, getWorkspace, listObservations, listSegments, listSnagAssets, onDataChange, snagsForWorkspace } from '../../db';
import { factoryLinesOf } from '../../lib/lineRecords';
import { lookingAt, type LineLooking } from './looking';

export interface LineLookingRow extends LineLooking { ws: Workspace }

async function readLine(id: string, ref: number): Promise<LineLookingRow | null> {
  const ws = await getWorkspace(id);
  if (!ws) return null;
  const [obs, segments, assets, snags] = await Promise.all([listObservations(id), listSegments(id), listSnagAssets(id), snagsForWorkspace(id)]);
  return { id, name: ws.name, ws, looking: lookingAt({ obs, segments, assets, snags }, ws.assets ?? [], ref) };
}

/** The lines' looking, in the order asked; null while the first read is under way. */
export function useLooking(wsIds: readonly string[]): LineLookingRow[] | null {
  const key = wsIds.join('|');
  const [rows, setRows] = useState<LineLookingRow[] | null>(null);
  useEffect(() => {
    let live = true;
    let timer: number | undefined;
    const ids = key ? key.split('|') : [];
    const load = () => void Promise.all(ids.map(id => readLine(id, Date.now()))).then(r => { if (live) setRows(r.filter((x): x is LineLookingRow => !!x)); });
    load();
    const off = onDataChange(() => { window.clearTimeout(timer); timer = window.setTimeout(load, 150); });
    return () => { live = false; window.clearTimeout(timer); off(); };
  }, [key]);
  return rows;
}

/** The factory lines a project is on — its own, read from the project's lines. */
export function useProjectLineIds(projectId: string): string[] | null {
  const [ids, setIds] = useState<string[] | null>(null);
  useEffect(() => {
    let live = true;
    const load = () => void allPaceLines().then(r => { if (live) setIds(factoryLinesOf(projectId, r)); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [projectId]);
  return ids;
}

/** A project's lines' looking. */
export function useProjectLooking(projectId: string): LineLookingRow[] | null {
  const ids = useProjectLineIds(projectId);
  const rows = useLooking(useMemo(() => ids ?? [], [ids]));
  return ids === null ? null : rows;
}
