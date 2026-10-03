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

/** The walk's screens — the filmed line and everything cut from it. Their
 *  step up is the FILMED lens of the line (or the project), because that is the
 *  page a walk hangs off. The study's screens — Capture, Analyse, the case, the
 *  meeting — are reached from the line itself (its "where is the time going?"
 *  door), so their step up is the line's own page. Sending them to the filmed
 *  lens put Back on a page the person had never been on. */
const WALK_SCREENS = new Set(['snags', 'snaglist', 'line', 'segment', 'asset', 'history', 'walk']);

/** The steps above a workspace: Projects › the project › the line. `screen` is
 *  the route you are on, which decides which face of the line Back lands on. */
export function chainCrumbs(chain: WsChain | null, wsName: string, screen?: string): Crumb[] {
  if (!chain) return [{ label: 'Workspaces', to: '/' }, { label: wsName, to: undefined }];
  const filmed = !screen || WALK_SCREENS.has(screen);
  const out: Crumb[] = [
    { label: 'Projects', to: '/projects' },
    { label: chain.projectName, to: `/project/${chain.projectId}${filmed && !chain.lineId && !chain.stageGate ? '?view=snags' : ''}` },
  ];
  if (chain.lineId) {
    out.push({ label: chain.lineName ?? 'the line', to: `/project/${chain.projectId}/line/${chain.lineId}${filmed ? '?view=snags' : ''}` });
  } else if (chain.stageGate) {
    /* On a stage-gate job the filmed line lives on Install — so that is the
       step above the walk, and where Back lands. */
    out.push({ label: 'Install', to: `/project/${chain.projectId}/install` });
  }
  return out;
}

/** What the screen you are on is called, for the last crumb. */
const SCREEN_LABEL: Record<string, string> = {
  capture: 'Capture', analyse: 'Analyse', log: 'The log', settings: 'Settings',
  people: 'People', snaglist: 'Evidence', snags: 'Walks', line: 'Machines',
  trend: 'Trend', history: 'Through time', case: 'The case', walk: 'Walk',
};

/** The whole trail for a workspace screen. `deep` is anything below the screen
 *  itself — a segment, or a segment and the frame marked in it. */
export function wsTrail(
  route: Route, chain: WsChain | null, wsName: string, deep: Crumb[] = [],
): Crumb[] {
  const wsId = route.wsId;
  const base = chainCrumbs(chain, wsName, route.name);
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
