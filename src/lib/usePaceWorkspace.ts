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
import { getPaceWorkspaceId, setPaceWorkspaceId, createWorkspace } from '../db';

export const PACE_WS_NAME = 'Project Pace — line walk';

export function usePaceWorkspace() {
  const [wsId, setWsId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => { setWsId(await getPaceWorkspaceId()); setLoading(false); })();
  }, []);

  /** Returns the id, creating the workspace the first time it is actually needed. */
  const ensure = useCallback(async (): Promise<string> => {
    const existing = await getPaceWorkspaceId();
    if (existing) { setWsId(existing); return existing; }
    const ws = await createWorkspace(PACE_WS_NAME, 'food-packing');
    await setPaceWorkspaceId(ws.id);
    setWsId(ws.id);
    return ws.id;
  }, []);

  return { wsId, loading, ensure };
}

/** True when the workspace on screen is the one behind Project Pace. The snag
 *  screens are generic, so this is how they know to offer a way back to the
 *  project rather than only to Home. */
export function useIsPaceWorkspace(wsId?: string): boolean {
  const [is, setIs] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!wsId) { setIs(false); return; }
    void getPaceWorkspaceId().then(id => { if (alive) setIs(!!id && id === wsId); });
    return () => { alive = false; };
  }, [wsId]);
  return is;
}
