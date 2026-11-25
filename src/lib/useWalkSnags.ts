/* The project's walk snags — its own walk and every line's — kept fresh as
 * anything is written (a snag closed on the walk shows on the plan at once). */
import { useEffect, useState } from 'react';
import { getProject, listSnagAssets, onDataChange, projectWorkspaceIds, snagsForWorkspace } from '../db';
import { walkSnagsOf, type WalkSnag } from './walkSnags';

export async function loadWalkSnags(projectId: string): Promise<WalkSnag[]> {
  const [ids, project] = await Promise.all([projectWorkspaceIds(projectId), getProject(projectId)]);
  const recovery = project?.programKey === 'line-recovery';
  const rows = await Promise.all(ids.map(async wsId => {
    const [snags, frames] = await Promise.all([snagsForWorkspace(wsId), listSnagAssets(wsId)]);
    const unassignedBelongsHere = !recovery || wsId === project?.walkWorkspaceId;
    const visible = snags.filter(s => !s.archivedAt && (s.projectId ? s.projectId === projectId : unassignedBelongsHere));
    return { wsId, snags: visible, frames };
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
