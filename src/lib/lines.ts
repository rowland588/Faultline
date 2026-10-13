/* THE PRODUCTION LINES — the lines a person works on, each its own page
 * (screens/ProductionLineScreen), in the control room's list and on its rail.
 *
 * Rowland, 12 October: "I want to just be able to open a production line and
 * use these tools inside the production line ... I need a record of
 * production lines ... and I also should be able to make the production
 * lines inside the problem sheet." A line is the record every problem and
 * every tool already hangs off (a Workspace — snags.workspace_id, a
 * standard's or a study's workspaceId); this names the list of them once,
 * so the control room, the rail and the line's page never disagree on it.
 * The demo line is a showcase, not a line anybody works on. */
import type { Workspace } from '../types';
import { inArchivedProject } from '../db/pace';

export const DEMO_NAME = 'Demo — Packing Hall';

/** Every line worked on: the demo aside, the archived aside, by name. */
export function productionLines(ws: readonly Workspace[]): Workspace[] {
  return ws.filter(w => w.name !== DEMO_NAME && !w.archived).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

/** The lines worked on now: every line, less those that belong to an
 *  archived project (Rowland, 12 October: "2A and 2B is actually an archived
 *  project") — they go with their project into the archive. Their problems
 *  stay on the Problems page, the line said to be an archived project's. */
export async function liveProductionLines(ws: readonly Workspace[]): Promise<Workspace[]> {
  const lines = productionLines(ws);
  const away = await Promise.all(lines.map(w => inArchivedProject(w.id)));
  return lines.filter((_, i) => !away[i]);
}

/** What the address asks for — `?line=<id>` (a list opened from a line's own
 *  page, on that line) or `?open=<id>` (one record opened in it). Read once,
 *  when the screen opens; the router keys the screen on the line. */
export function asked(key: 'line' | 'open'): string | undefined {
  return new URLSearchParams(window.location.hash.split('?')[1] ?? '').get(key) ?? undefined;
}
