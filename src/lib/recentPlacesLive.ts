/* Drop archived lines and archived projects from "Carry on where you were". */
import { allProjects } from '../db/projects';
import { listWorkspaces } from '../db/workspaces';
import { liveProductionLines } from './lines';
import { lineIdFromPlace, projectIdFromPlace, recentPlaces, type Place } from './recentPlaces';

const KEY = 'faultline.recentPlaces';

/** The last places that still exist on the floor — and scrub the stored list when something was archived. */
export async function liveRecentPlaces(limit = 4): Promise<Place[]> {
  const raw = recentPlaces();
  const [floor, projects] = await Promise.all([listWorkspaces(), allProjects()]);
  const liveLineIds = new Set((await liveProductionLines(floor)).map(w => w.id));
  const liveProjectIds = new Set(projects.filter(p => !p.archivedAt && !p.deletedAt).map(p => p.id));

  const kept = raw.filter(p => {
    if (p.kind === 'line') {
      const id = lineIdFromPlace(p.to);
      return !!id && liveLineIds.has(id);
    }
    if (p.kind === 'project') {
      const id = projectIdFromPlace(p.to);
      return !!id && liveProjectIds.has(id);
    }
    return false;
  });

  if (kept.length !== raw.length) {
    try { localStorage.setItem(KEY, JSON.stringify(kept)); } catch { /* private window */ }
  }
  return kept.slice(0, limit);
}
