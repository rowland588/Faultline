/* Resume — the "come back exactly where you were" mechanism. Two halves:
 *  1) on boot, if we land on Home and there's a last workspace, jump into it;
 *  2) while inside a workspace, persist the full hash + mark it the last one.
 * Opening a workspace then replays its saved route (see ResumeRedirect). */
import { useEffect, useState } from 'react';
import type { ID } from '../types';
import { getLastWorkspace, getWorkspace, saveRoute, setLastWorkspace } from '../db';
import { parseRoute, navReplace, useHash } from './useRoute';

/** Gate the first render until we've decided whether to resume the last workspace. */
export function useBootResume(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = parseRoute(window.location.hash);
      if (r.name === 'home') {
        const last = await getLastWorkspace();
        if (alive && last && (await getWorkspace(last))) {
          navReplace(`/w/${last}`);
          setReady(true);
          return;
        }
      }
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, []);
  return ready;
}

/** While in a workspace, remember the exact spot (debounced by db no-op guard). */
export function usePersistRoute(wsId: ID | undefined): void {
  const hash = useHash();
  useEffect(() => {
    if (!wsId) return;
    const r = parseRoute(hash);
    if (r.wsId !== wsId || r.name === 'resume') return; // don't persist the redirect stub
    void saveRoute(wsId, hash);
    void setLastWorkspace(wsId);
  }, [hash, wsId]);
}
