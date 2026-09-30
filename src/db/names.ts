/* MAKE THE RECORDS AGREE ABOUT WHO A COMPANY IS.
 *
 * The board and the client report already treat Brillopak and Brilopak as one
 * company (lib/names). This is the other half: rewriting the records so they
 * all say it the same way, in one move, undoable — instead of asking somebody
 * to open eleven machines, tests and materials and retype a name.
 *
 * Touches exactly the four places a supplier is typed: a machine's OEM, what
 * a test or fix is done with, where a material comes from, where a program
 * comes from. Matches the spellings it is given, ignoring case, and nothing
 * else — it never guesses at a name it was not told about.
 */
import type { ID } from '../types';
import { listAssets, putAsset, listTests, putTest } from './testing';
import { listMaterials, putMaterial } from './materials';
import { listPrograms, putProgram } from './programs';
import { restoreRows, type Restore } from './sync';

export async function renameSupplier(
  projectIds: ID[], from: string[], to: string,
): Promise<{ changed: number; undo: Restore }> {
  const target = to.trim();
  const spellings = new Set(from.map(s => s.trim().toLowerCase()).filter(Boolean));
  const hit = (v?: string) => !!v && spellings.has(v.trim().toLowerCase()) && v.trim() !== target;

  const was = {
    commission_assets: [] as { id: ID }[], tests: [] as { id: ID }[],
    materials: [] as { id: ID }[], programs: [] as { id: ID }[],
  };
  for (const pid of projectIds) {
    for (const a of await listAssets(pid)) if (hit(a.oem)) { was.commission_assets.push(a); await putAsset({ ...a, oem: target }); }
    for (const t of await listTests(pid)) if (hit(t.withWhom)) { was.tests.push(t); await putTest({ ...t, withWhom: target }); }
    for (const m of await listMaterials(pid)) if (hit(m.from)) { was.materials.push(m); await putMaterial({ ...m, from: target }); }
    for (const p of await listPrograms(pid)) if (hit(p.from)) { was.programs.push(p); await putProgram({ ...p, from: target }); }
  }
  const changed = Object.values(was).reduce((n, rows) => n + rows.length, 0);
  return {
    changed,
    undo: async () => {
      for (const [kind, rows] of Object.entries(was)) {
        await restoreRows(kind as 'commission_assets' | 'tests' | 'materials' | 'programs', rows);
      }
    },
  };
}
