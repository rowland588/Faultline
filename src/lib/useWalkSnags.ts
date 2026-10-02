/* The project's walk snags — its own walk and every line's — kept fresh as
 * anything is written (a snag closed on the walk shows on the plan at once). */
import { useEffect, useState } from 'react';
import { listSnagAssets, onDataChange, projectWorkspaceIds, snagsForWorkspace } from '../db';
import { walkSnagsOf, type WalkSnag } from './walkSnags';

export async function loadWalkSnags(projectId: string): Promise<WalkSnag[]> {
  const ids = await projectWorkspaceIds(projectId);
  const rows = await Promise.all(ids.map(async wsId => {
    const [snags, frames] = await Promise.all([snagsForWorkspace(wsId), listSnagAssets(wsId)]);
    return { wsId, snags, frames };
  }));
  return walkSnagsOf(rows);
}

/** null until loaded, so a report waits for it rather than printing without. */
export function useWalkSnags(projectId: string): WalkSnag[] | null {
  const [list, setList] = useState<WalkSnag[] | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => void loadWalkSnags(projectId).then(l => { if (alive) setList(l); }).catch(() => { if (alive) setList([]); });
    load();
    const off = onDataChange(load);
    return () => { alive = false; off(); };
  }, [projectId]);
  return list;
}
