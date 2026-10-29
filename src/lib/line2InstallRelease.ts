/* One-shot helper for Rowland's Line 2 installation → Line 2A (29 October).
 *
 * Not run on boot — smoke and acceptance need the seeded commissioning project.
 * Call from a deliberate action (Details → Move to the line) or a future admin
 * hook. */
import { ensureProjects, releaseInstallationToLine } from '../db';
import type { Project } from '../types';
import { planModel } from './planModel';

/** Installation projects whose name says Line 2 commissioning / install. */
export function isLine2InstallationProject(p: Project): boolean {
  if (p.archivedAt || p.deletedAt) return false;
  if (planModel(p) !== 'commissioning') return false;
  const n = p.name.toLowerCase();
  return n.includes('line 2') && (n.includes('commission') || n.includes('install') || n.includes('gate') || n.includes('rebuild'));
}

export async function releaseLine2InstallationIfPresent(): Promise<boolean> {
  const hit = (await ensureProjects()).find(isLine2InstallationProject);
  if (!hit) return false;
  await releaseInstallationToLine(hit.id);
  return true;
}
