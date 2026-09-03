/* Hash routing — the whole navigation model, and the resume mechanism. Drill
 * state lives in the URL (?measure=&path=…) so a workstream is shareable and
 * survives a reload. No router library; just parse the hash. */
import { useEffect, useMemo, useState } from 'react';
import type { ID, Measure, DrillPath, DimensionKey, WorkstreamView } from '../types';

export type RouteName = 'home' | 'resume' | 'capture' | 'analyse' | 'present' | 'meeting' | 'log' | 'settings' | 'people'
  | 'snags' | 'segment' | 'asset' | 'snaglist' | 'walk' | 'line'
  | 'trend' | 'history' | 'report' | 'case' | 'guide' | 'portfolio'
  | 'projects' | 'projectDashboard' | 'projectMetrics';

export interface Route {
  name: RouteName;
  wsId?: ID;
  id?: string;          // sub-entity id (segment/:id, asset/:id)
  query: URLSearchParams;
}

const SCREENS: Record<string, RouteName> = {
  capture: 'capture',
  analyse: 'analyse',
  present: 'present',
  meeting: 'meeting',
  log: 'log',
  settings: 'settings',
  people: 'people',
  // Snag List module
  snags: 'snags',
  segment: 'segment',
  asset: 'asset',
  snaglist: 'snaglist',
  walk: 'walk',
  line: 'line',
  // the ecosystem: proof, memory, and the page you print
  trend: 'trend',
  history: 'history',
  report: 'report',
  case: 'case',
};

export function parseRoute(hash: string): Route {
  const raw = hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const query = new URLSearchParams(qs || '');
  const segs = path.split('/').filter(Boolean);
  if (segs[0] === 'guide') return { name: 'guide', query }; // public — no workspace, no session
  if (segs[0] === 'portfolio') return { name: 'portfolio', query }; // cross-workspace — the ledger
  if (segs[0] === 'projects') return { name: 'projects', query }; // projects listing
  if (segs[0] === 'project' && segs[1]) {
    const projectId = decodeURIComponent(segs[1]);
    const view = segs[2] || 'dashboard';
    const name = view === 'metrics' ? 'projectMetrics' : 'projectDashboard';
    return { name, id: projectId, query };
  }
  if (segs[0] === 'w' && segs[1]) {
    const wsId = decodeURIComponent(segs[1]);
    const name = (segs[2] && SCREENS[segs[2]]) || 'resume';
    const id = segs[3] ? decodeURIComponent(segs[3]) : undefined;
    return { name, wsId, id, query };
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
export const nav = (to: string | { page: string; [key: string]: any }): void => {
  let hash: string;
  if (typeof to === 'string') {
    hash = to.startsWith('#') ? to : '#' + to;
  } else {
    const { page, ...params } = to;
    const qs = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString();
    if (page === 'home') {
      hash = '#/';
    } else if (page === 'projects') {
      hash = '#/projects' + (qs ? '?' + qs : '');
    } else if (page === 'projectDashboard') {
      hash = '#/project/' + params.projectId + (qs ? '?' + qs : '');
    } else if (page === 'projectMetrics') {
      hash = '#/project/' + params.projectId + '/metrics' + (qs ? '?' + qs : '');
    } else {
      hash = '#/' + page + (qs ? '?' + qs : '');
    }
  }
  window.location.hash = hash;
};

/** Replace the current entry (no back-button trail) — used by redirects. */
export const navReplace = (to: string): void => {
  const hash = to.startsWith('#') ? to : '#' + to;
  history.replaceState(null, '', hash);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
};

/** Go back to wherever you came from, with a safe fallback if there's no history
 *  (deep link / hard refresh). Used by the secondary pages' back button. */
export const goBack = (fallback: string): void => {
  if (window.history.length > 1) window.history.back();
  else nav(fallback);
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
  period?: string, // the period lens (lib/period) — absent = the default window
): string {
  const q = new URLSearchParams({ measure });
  if (dims && dims.length) q.set('dims', dims.join(','));
  if (path.length) q.set('path', encodePath(path));
  if (period) q.set('p', period);
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
