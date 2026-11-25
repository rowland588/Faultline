import type { Workspace } from '../../types';

const same = (a?: string, b?: string) => (a ?? '').trim().toLocaleLowerCase() === (b ?? '').trim().toLocaleLowerCase();

/** Other production lines at this client's named site, outside this project. */
export function otherLinesAtSite(lines: readonly Workspace[], current: Workspace | undefined, linked: readonly string[]): Workspace[] {
  if (!current?.siteName?.trim()) return [];
  return lines.filter(line => !linked.includes(line.id)
    && same(line.clientName, current.clientName) && same(line.siteName, current.siteName));
}

/** The short line picker when a new recovery was started from another line at this site. */
export function linesAtSite(lines: readonly Workspace[], site: string, client: string): Workspace[] {
  if (!site.trim()) return [];
  return lines.filter(line => same(line.siteName, site) && same(line.clientName, client));
}

/** Customer reports belong to a single business, even when All clients is selected. */
export function recoveryLinesForClient(lines: readonly Workspace[], first?: Workspace): Workspace[] {
  return first ? lines.filter(w => (w.clientName ?? '').trim() === (first.clientName ?? '').trim()) : [...lines];
}
