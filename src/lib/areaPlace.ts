/* AN AREA'S OWN PLACE (15 November, docs/AREAS.md A4 — agreed with Rowland 14 November: "the area as a real thing … an area able to hold
 * its own problems, tools and actions — so Dispatch, an area with no lines, works").
 *
 * Every tool, problem and action in the app hangs off a line (a workspace). Rather than teach every tool a second kind of home, an area
 * gets ONE workspace of its own, marked as the area's place by its type — as a customer's holding place is (lib/visits HOLDING_TYPE),
 * so no column and no migration — and carrying the area's words (client · site · area). It is never a production line:
 * lib/lines productionLines leaves it out, so it is on no board, picker, count or line report. It is made the first time something is
 * done there (a problem raised, a tool started), never before ("Do not force the creation of child records", 10 November). Then it
 * works as a line does, unchanged: a problem raised there is on its own action tracker, a tool started there lists and reports as it
 * always has, and the area's four answers count it with the area's lines. */
import type { Workspace } from '../types';
import { inArea, type AreaId } from './areas';
import { AREA_PLACE_TYPE, isAreaPlace } from './lines';

export { AREA_PLACE_TYPE, isAreaPlace };
/** What the place is called wherever its name is shown — "Dispatch — the area itself". */
export const areaPlaceName = (area: string): string => `${area.trim()} — the area itself`;

/** The area's place among the workspaces, if it has one (not archived). */
export function areaPlaceOf(all: readonly Workspace[], a: AreaId): Workspace | undefined {
  return all.find(w => !w.archived && isAreaPlace(w) && inArea(w, a));
}

/** The area a place stands for — its words. */
export function areaOfPlace(w: Pick<Workspace, 'clientName' | 'siteName' | 'areaName'>): AreaId | undefined {
  const area = w.areaName?.trim();
  if (!area) return undefined;
  const client = w.clientName?.trim(), site = w.siteName?.trim();
  return { area, ...(client ? { client } : {}), ...(site ? { site } : {}) };
}

/** THE AREA'S PLACE — found, or made: a workspace of the place's type carrying the area's words, off the floor. When the area has no line
 *  and no department record yet, the department record is made with it, so the area stands on the Factory's front page. */
export async function ensureAreaPlace(a: AreaId): Promise<Workspace> {
  const db = await import('../db');
  const all = await db.listWorkspaces();
  const had = areaPlaceOf(all, a);
  if (had) return had;
  /* the area's client, when the address does not name one: its lines' client, as the area's page says it */
  const client = a.client ?? all.find(w => !w.archived && !isAreaPlace(w) && inArea(w, a) && w.clientName?.trim())?.clientName?.trim();
  const w = await db.createWorkspace(areaPlaceName(a.area));
  const placed: Workspace = { ...w, lineType: AREA_PLACE_TYPE, areaName: a.area.trim(), ...(a.site?.trim() ? { siteName: a.site.trim() } : {}), ...(client ? { clientName: client } : {}), updatedAt: Date.now() };
  await db.updateWorkspace(placed);
  const lines = all.filter(x => !x.archived && !isAreaPlace(x) && inArea(x, a));
  if (!lines.length) {
    /* found when it is already a record, else made — one record of its words, never a second (db/departments addDepartment) */
    const { addDepartment } = await import('../db/departments');
    await addDepartment({ area: a.area, ...(a.site ? { site: a.site } : {}), ...(client ? { client } : {}) });
  }
  return placed;
}
