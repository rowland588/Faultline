/* Hash routing — the whole navigation model, and the resume mechanism. Drill
 * state lives in the URL (?measure=&path=…) so a workstream is shareable and
 * survives a reload. No router library; just parse the hash. */
import { useEffect, useMemo, useState } from 'react';
import type { ID, Measure, DrillPath, DimensionKey, WorkstreamView } from '../types';

export type RouteName = 'home' | 'resume' | 'capture' | 'analyse' | 'present' | 'log' | 'settings';

export interface Route {
  name: RouteName;
  wsId?: ID;
  query: URLSearchParams;
}

const SCREENS: Record<string, RouteName> = {
  capture: 'capture',
  analyse: 'analyse',
  present: 'present',
  log: 'log',
  settings: 'settings',
};

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const query = new URLSearchParams(qs || '');
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'w' && segs[1]) {
    const wsId = decodeURIComponent(segs[1]);
    const name = (segs[2] && SCREENS[segs[2]]) || 'resume';
    return { name, wsId, query };
  }
  return { name: 'home', query };
}

export function useHash(): string {
  const [h, setH] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setH(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return h;
}

export function useRoute(): Route {
  const h = useHash();
  return useMemo(() => parseRoute(h), [h]);
}

/** Navigate (adds a history entry). */
export const nav = (to: string): void => {
  window.location.hash = to.startsWith('#') ? to : '#' + to;
};

/** Replace the current entry (no back-button trail) — used by redirects. */
export const navReplace = (to: string): void => {
  const hash = to.startsWith('#') ? to : '#' + to;
  history.replaceState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};

/* ---------- drill path <-> URL (?path=asset:Brillopack>category:Changeover) ---------- */

export function encodePath(path: DrillPath): string {
  return path.map(s => `${s.dimension}:${encodeURIComponent(s.value)}`).join('>');
}

export function decodePath(raw: string | null): DrillPath {
  if (!raw) return [];
  return raw
    .split('>')
    .filter(Boolean)
    .map(seg => {
      const i = seg.indexOf(':');
      return { dimension: seg.slice(0, i) as DimensionKey, value: decodeURIComponent(seg.slice(i + 1)) };
    });
}

/** Build an analyse/present hash from measure + drill order + drill path.
 *  This URL fully captures the view, so it's shareable and resumable. */
export function buildAnalyseHash(
  wsId: ID,
  screen: 'analyse' | 'present',
  measure: Measure,
  path: DrillPath,
  dims?: DimensionKey[],
): string {
  const q = new URLSearchParams({ measure });
  if (dims && dims.length) q.set('dims', dims.join(','));
  if (path.length) q.set('path', encodePath(path));
  return `#/w/${wsId}/${screen}?${q.toString()}`;
}

/** Reconstruct the full engine view from the URL — the single source Analyse and
 *  Present both read. null when there's no chosen question yet. */
export function readWorkstreamView(route: Route, wsId: ID): WorkstreamView | null {
  const measure = route.query.get('measure');
  const dims = route.query.get('dims');
  if ((measure !== 'count' && measure !== 'time' && measure !== 'cost') || !dims) return null;
  return {
    workspaceId: wsId,
    measure,
    dimensionOrder: dims.split(',').filter(Boolean) as DimensionKey[],
    path: decodePath(route.query.get('path')),
    mode: route.name === 'present' ? 'present' : 'analyse',
  };
}
