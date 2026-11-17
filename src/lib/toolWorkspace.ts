import type { Route } from '../state/useRoute';

/** Presentation context only. Saved ownership and permissions remain on the record. */
export const TOOL_WORKSPACE_ROUTES: ReadonlySet<Route['name']> = new Set([
  'tools', 'toolPage', 'toolWorld', 'templates', 'lineTools', 'lineStandards', 'standard',
  'studies', 'study', 'videos', 'videoStudy', 'talks', 'talk', 'sixmList', 'sixmTool',
]);

export function inToolWorkspace(route: Pick<Route, 'name' | 'query'>): boolean {
  return route.query.get('workspace') === 'tools' || ['tools', 'toolPage', 'toolWorld', 'templates'].includes(route.name);
}

export function toolsHref(to: string): string {
  const [path, query = ''] = to.split('?');
  const q = new URLSearchParams(query); q.set('workspace', 'tools');
  return `${path}?${q}`;
}
