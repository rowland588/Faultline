/* Resume — "come back exactly where you were", and where it stops.
 *
 * THE FRONT DOOR IS PROJECTS, AND BOOT NO LONGER OVERRULES THAT.
 *
 * Rowland: "when I reload from an update I get shot into this almost a timer,
 * which is actually a workspace. But I was never near that. I haven't opened a
 * 3P. I'm in commissioning."
 *
 * He was right, and it was not random. Boot used to read the last workspace and
 * replace the hash with `/w/<id>`, which ResumeRedirect turns into
 * `#/w/<id>/capture` — the timer. `setLastWorkspace` fires whenever a
 * WorkspaceProvider mounts, which is any time you open Evidence, a walk, a
 * segment or an asset. So opening Evidence ONCE from a commissioning job meant
 * every cold boot after it landed in a capture timer of a workspace nobody
 * chose. A leftover from when this app was workspace-first: the front door
 * moved to Projects and this never moved with it.
 *
 * WHY IT IS SAFE TO REMOVE RATHER THAN MERELY REDIRECT: the behaviour it gave
 * already exists on Home, deliberately — every workspace there carries its own
 * "Resume ›" button that replays its saved route. The capability is kept; only
 * the hijack is gone. One tap instead of a screen you did not ask for.
 *
 * What remains:
 *  1) boot asks the browser to keep our IndexedDB, then renders the front door;
 *  2) inside a workspace, the exact spot is still persisted, so Resume works.
 */
import { useEffect, useState } from 'react';
import type { ID } from '../types';
import { saveRoute, setLastWorkspace } from '../db';
import { parseRoute, useHash } from './useRoute';

/** Gate the first render on the one thing boot genuinely has to do. */
export function useBootResume(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let alive = true;
    (async () => {
      /* Ask the browser to keep our IndexedDB (best-effort) so the floor's data
         is not silently evicted. Never blocks boot. */
      try { await navigator.storage?.persist?.(); } catch { /* not supported */ }
      if (alive) setReady(true);
    })();
    return () => { alive = false; };
  }, []);
  return ready;
}

/** While in a workspace, remember the exact spot, so the Resume button on the
 *  front door has somewhere to send you. */
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
