/* Build the spine for whatever screen you are on.
 *
 * One place decides the shape of the trail, so the project side and the
 * workspace side can never disagree about what sits above what — which is how
 * you end up with a back button that lands somewhere you have never been.
 *
 * The chain above a workspace is read from the data (which line owns it, which
 * project owns that line), never from browser history, so a link someone sent
 * you opens with the same trail as walking in.
 */
import { useEffect, useState } from 'react';
import { chainForWorkspace, getSegment, getSnagAsset } from '../db';
import type { Crumb } from '../ui/Crumbs';
import type { Route } from '../state/useRoute';

export interface WsChain { projectId: string; projectName: string; lineId?: string; lineName?: string }

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

/** The steps above a workspace: Projects › the project › the line. Ends with the
 *  line's FILMED lens, because that is the page a walk actually hangs off. */
export function chainCrumbs(chain: WsChain | null, wsName: string): Crumb[] {
  if (!chain) return [{ label: 'Workspaces', to: '/' }, { label: wsName, to: undefined }];
  const out: Crumb[] = [
    { label: 'Projects', to: '/projects' },
    { label: chain.projectName, to: `/project/${chain.projectId}` },
  ];
  if (chain.lineId) {
    out.push({ label: chain.lineName ?? 'the line', to: `/project/${chain.projectId}/line/${chain.lineId}?view=snags` });
  }
  return out;
}

/** What the screen you are on is called, for the last crumb. */
const SCREEN_LABEL: Record<string, string> = {
  capture: 'Capture', analyse: 'Analyse', log: 'The log', settings: 'Settings',
  people: 'People', snaglist: 'Evidence', snags: 'Walks', line: 'The line',
  trend: 'Trend', history: 'Through time', case: 'The case',
};

/** The whole trail for a workspace screen. `deep` is anything below the screen
 *  itself — a segment, or a segment and the frame marked in it. */
export function wsTrail(
  route: Route, chain: WsChain | null, wsName: string, deep: Crumb[] = [],
): Crumb[] {
  const wsId = route.wsId;
  const base = chainCrumbs(chain, wsName);
  // Inside a walk, "Walks" is the step above a segment and a frame both.
  const walkFamily = route.name === 'segment' || route.name === 'asset' || route.name === 'history';
  if (walkFamily) base.push({ label: 'Walks', to: `/w/${wsId}/snags?manage` });
  else base.push({ label: SCREEN_LABEL[route.name] ?? wsName, to: undefined });
  return [...base, ...deep];
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
        if (alive) setDeep(s ? [{ label: s.name || `Segment ${s.sequence}` }] : []);
        return;
      }
      if (name === 'asset' || name === 'history') {
        const a = await getSnagAsset(id);
        if (!a) { if (alive) setDeep([]); return; }
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
