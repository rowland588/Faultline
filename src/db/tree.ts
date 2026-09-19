/* THE LEVER TREE: where a box has got to, and the nodes themselves. */
import type { ID } from '../types';
import { now } from '../lib/ids';
import type { TreeNodeRow } from './rows';
import { getDB, signalWrite } from './core';
import { recordTombstones } from './sync';

/* ---------- THE LEVER TREE ----------
 *
 * Drawn on paper it has four named levels: the desired outcome, what has to be
 * true for it, the conditions under each of those, and the work underneath.
 * Stored, it is one kind of node nested by `parentId`, and the level is simply
 * how deep you are.
 *
 * That is deliberate. Four typed levels would need a migration the first time a
 * fifth was wanted, or a level was collapsed, or a condition needed a condition
 * under it — and the whole point of a tree you author yourself is that its shape
 * is yours to change. One node type costs nothing and never has to be undone.
 *
 * The colour is set by hand, and is not derived from anything. This is a
 * thinking surface before it is a reporting one; when the app starts deriving
 * the colour it starts arguing with the person holding the pen.
 */

export async function listTreeNodes(projectId: string): Promise<TreeNodeRow[]> {
  const all = await (await getDB()).getAllFromIndex('tree_nodes', 'by_project', projectId);
  return all.filter(n => !n.deletedAt).sort((a, b) => a.sort - b.sort);
}

export async function putTreeNode(n: TreeNodeRow): Promise<void> {
  await (await getDB()).put('tree_nodes', { ...n, updatedAt: now() });
  signalWrite();
}

/** Several at once — a pasted block of work becomes one node per line, and one
 *  write per node would fire the sync debounce a dozen times over. */
export async function putTreeNodes(nodes: TreeNodeRow[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('tree_nodes', 'readwrite');
  const t = now();
  for (const n of nodes) await tx.store.put({ ...n, updatedAt: t });
  await tx.done;
  signalWrite();
}

/** A branch, not a node: deleting a condition takes the work under it, because
 *  leaving orphans in a tree means leaving them invisible. */
export async function deleteTreeBranch(projectId: string, id: ID): Promise<number> {
  const all = await listTreeNodes(projectId);
  const kids = new Map<string, TreeNodeRow[]>();
  for (const n of all) {
    const k = n.parentId ?? '';
    kids.set(k, [...(kids.get(k) ?? []), n]);
  }
  const doomed: ID[] = [];
  const walk = (nid: ID) => { doomed.push(nid); for (const c of kids.get(nid) ?? []) walk(c.id); };
  walk(id);

  const db = await getDB();
  const tx = db.transaction('tree_nodes', 'readwrite');
  for (const d of doomed) await tx.store.delete(d);
  await tx.done;
  await recordTombstones('tree_nodes', doomed);
  signalWrite();
  return doomed.length;
}
