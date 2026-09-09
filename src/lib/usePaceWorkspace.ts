/* The workspace that carries Project Pace's snag walk.
 *
 * The snag list is workspace-scoped by design — video segments, the assets
 * marked in them and the snags pinned on those stills all hang off a workspace.
 * Project Pace is a page, not a workspace, so it keeps one of its own and the
 * app's real snag screens are pointed at it. Nothing about the snag model is
 * reimplemented here: same stores, same screens, same cloud sync.
 *
 * Created on FIRST USE, not on first view — opening a tab should not litter the
 * workspace list for someone who never records a walk. */
import { useCallback, useEffect, useState } from 'react';
import { getPaceWorkspaceId, setPaceWorkspaceId, createWorkspace, projectForWorkspace, getProject } from '../db';

export const PACE_WS_NAME = 'Project Pace — line walk';

/** The walk workspace for ONE project. Each project gets its own, so two
 *  projects' walks never land in the same list. */
export function usePaceWorkspace(projectId?: string, projectName?: string) {
  const [wsId, setWsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void (async () => {
      const id = await getPaceWorkspaceId(projectId);
      if (alive) { setWsId(id); setLoading(false); }
    })();
    return () => { alive = false; };
  }, [projectId]);

  /** Returns the id, creating the workspace the first time it is actually needed. */
  const ensure = useCallback(async (): Promise<string> => {
    const existing = await getPaceWorkspaceId(projectId);
    if (existing) { setWsId(existing); return existing; }
    const name = projectName ? `${projectName} — line walk` : PACE_WS_NAME;
    const ws = await createWorkspace(name, 'food-packing');
    await setPaceWorkspaceId(ws.id, projectId);
    setWsId(ws.id);
    return ws.id;
  }, [projectId, projectName]);

  return { wsId, loading, ensure };
}

/** The project a workspace belongs to, when it belongs to one — its name and
 *  where to go back to. The snag and capture screens are generic, so this is
 *  how they know to offer a way back to the project rather than only to Home.
 *
 *  It used to answer only "is this Project Pace's walk?", which was enough when
 *  there was one project and one workspace under it. Now a line has a workspace
 *  of its own and there can be several projects, so the question is which one. */
export function useOwningProject(wsId?: string): { id: string; name: string } | null {
  const [proj, setProj] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    let alive = true;
    if (!wsId) { setProj(null); return; }
    void (async () => {
      const id = await projectForWorkspace(wsId);
      if (!alive) return;
      if (!id) { setProj(null); return; }
      const p = await getProject(id);
      setProj({ id, name: p?.name ?? 'the project' });
    })();
    return () => { alive = false; };
  }, [wsId]);
  return proj;
}
