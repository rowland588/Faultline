/* What sits above a line study, read from the data.
 *
 * The chain above a workspace — which line owns it, which project owns that
 * line — is read from the records, never from browser history, so a link
 * someone sent you opens with the same rail (ui/Frame) as walking in.
 *
 * (This used to also build the spine's trail — chainCrumbs and wsTrail. The
 * spine is gone: the rail shows every step at once, so there is no "step
 * above" to work out. The walk's deep trail, below, is the one trail left.)
 */
import { useEffect, useState } from 'react';
import { chainForWorkspace, getSegment, getSnagAsset } from '../db';
import type { Route } from '../state/useRoute';

/** One step of the walk's deep trail: a name, and where it goes (absent =
 *  you are here). */
export interface Crumb {
  label: string;
  to?: string;
}

export interface WsChain { projectId: string; projectName: string; lineId?: string; lineName?: string; stageGate?: boolean }

/** The project and line a workspace belongs to — null while loading or when the
 *  workspace is free-standing. */
export function useWsChain(wsId?: string): WsChain | null {
  const [chain, setChain] = useState<WsChain | null>(null);
  useEffect(() => {
    let alive = true;
    if (!wsId) { setChain(null); return; }
    void chainForWorkspace(wsId).then(c => { if (alive) setChain(c); });
    return () => { alive = false; };
  }, [wsId]);
  return chain;
}

/** The last one or two crumbs when you are inside a walk: the segment you are
 *  looking at, and — on a marked frame — the frame itself.
 *
 *  A frame whose clip has been deleted keeps its own crumb and simply has no
 *  segment above it. It is still evidence; it is just no longer part of a film.
 */
export function useDeepCrumbs(route: Route): Crumb[] {
  const [deep, setDeep] = useState<Crumb[]>([]);
  const { name, wsId, id } = route;
  useEffect(() => {
    let alive = true;
    void (async () => {
      if (!id || !wsId) { if (alive) setDeep([]); return; }
      if (name === 'segment') {
        const s = await getSegment(id);
        if (alive) setDeep(s ? [{ label: s.name || `Segment ${s.sequence}` }] : [{ label: 'Not here any more' }]);   // a gone clip still names where you are
        return;
      }
      if (name === 'asset' || name === 'history') {
        const a = await getSnagAsset(id);
        if (!a) { if (alive) setDeep([{ label: 'Not here any more' }]); return; }
        const seg = a.segmentId ? await getSegment(a.segmentId) : undefined;
        const out: Crumb[] = [];
        if (seg) out.push({ label: seg.name || `Segment ${seg.sequence}`, to: `/w/${wsId}/segment/${seg.id}` });
        out.push(name === 'history'
          ? { label: a.name, to: `/w/${wsId}/asset/${a.id}` }
          : { label: a.name });
        if (name === 'history') out.push({ label: 'Through time' });
        if (alive) setDeep(out);
        return;
      }
      if (alive) setDeep([]);
    })();
    return () => { alive = false; };
  }, [name, wsId, id]);
  return deep;
}
