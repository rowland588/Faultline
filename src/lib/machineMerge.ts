/* ONE RECORD OF A MACHINE (docs/STAGEGATE-RESEARCH.md §5, slice 1).
 *
 * Rowland, 26 October: "i like the idea of one record of the machine this
 * makes sense to me"; 27 October: "Do one record per machine". A machine on a
 * line is one record (lib/testing Asset), whoever named it first — the line,
 * from Your factory or the line's page, or a project, from Install. Two records
 * of one machine on one line could be made: a project's Install made its own
 * beside the line's, and two devices could each make one before they synced.
 *
 * This is the rule that finds them and says which is kept. Pure — the device
 * applies it (db/machineMerge), and so could the cloud. Nothing is deleted:
 * the other record is put away with `mergedInto` naming the one kept, and
 * everything that pointed at it (a test, a fix, a program, a study, a note)
 * points at the kept one, so the machine's whole story is on one record.
 *
 * WHICH ONE IS KEPT — the same answer on every device, from the records alone:
 * a project's record before the line's own (it carries the project's tests,
 * and the project still lists it among its machines), then the smallest id.
 * What the kept record does not know and the other does — its maker, a note,
 * its dates, its documents — it takes.
 *
 * ONLY THE LINE'S OWN RECORDS ARE PUT AWAY. Two records a project holds — of
 * one project, or one each of two — are left as they are and said (`held`):
 * a project's machines are still the records that name it, so merging two
 * projects' would take a machine off one project's Install, and deleting a
 * project's record is its owner's (supabase/ACCESS_LEVELS.sql). Slice 3 — a
 * project taking machines on — is where those meet. */
import type { Asset } from './testing';
import { lineOfMachine, machineKey, type JobLine } from './lineRecords';

export interface MachineMerge {
  /** The record kept, as it should now be written (absent: unchanged). */
  keep: Asset;
  changed: boolean;
  /** The records put away into it. */
  into: Asset[];
}

export interface MergePlan {
  merges: MachineMerge[];
  /** Records whose line is known only through their project — written onto
   *  it, so the line is said on the record itself. */
  lined: Asset[];
  /** Machines a project holds two records of, or two projects one each —
   *  left as they are (slice 3), said rather than guessed at. */
  held: { lineId: string; name: string; projects: string[] }[];
}

const FILLS = ['oem', 'note', 'dueOn', 'onSiteOn', 'installedOn', 'runningOn'] as const;

/** Which of two records of one machine is kept: a project's first, then the
 *  smallest id — never the device's clock or order. */
function keptFirst(a: Asset, b: Asset): number {
  return (a.projectId ? 0 : 1) - (b.projectId ? 0 : 1) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function planOneRecord(assets: readonly Asset[], jobLines: readonly JobLine[]): MergePlan {
  const live = assets.filter(a => !a.deletedAt && !a.mergedInto);
  const lined: Asset[] = [];
  const groups = new Map<string, { lineId: string; recs: Asset[] }>();
  for (const a of live) {
    const lineId = lineOfMachine(a, jobLines);
    const k = machineKey(a.name);
    if (!lineId || !k) continue;
    if (!a.workspaceId) lined.push({ ...a, workspaceId: lineId });
    const key = `${lineId}\u0000${k}`;
    const g = groups.get(key) ?? { lineId, recs: [] };
    g.recs.push(a.workspaceId ? a : { ...a, workspaceId: lineId });
    groups.set(key, g);
  }
  const merges: MachineMerge[] = [];
  const held: MergePlan['held'] = [];
  for (const { lineId, recs } of groups.values()) {
    if (recs.length < 2) continue;
    const projects = [...new Set(recs.map(r => r.projectId).filter(Boolean))].sort();
    /* Only the line's own records are put away: a project's record is the
       project owner's to delete (supabase/ACCESS_LEVELS.sql keeps deleted_at
       for anyone else), so two of them — of one project or two — wait. */
    if (recs.filter(r => r.projectId).length > 1) {
      held.push({ lineId, name: recs.slice().sort(keptFirst)[0].name.trim(), projects });
      continue;
    }
    const [first, ...rest] = recs.slice().sort(keptFirst);
    let keep: Asset = first;
    let changed = false;
    for (const o of rest) {
      for (const f of FILLS) {
        if (!keep[f] && o[f]) { keep = { ...keep, [f]: o[f] }; changed = true; }
      }
      const docs = [...(keep.docs ?? [])];
      for (const d of o.docs ?? []) if (!docs.some(x => x.blobKey === d.blobKey)) docs.push(d);
      if (docs.length !== (keep.docs ?? []).length) { keep = { ...keep, docs }; changed = true; }
    }
    merges.push({ keep, changed, into: rest });
  }
  /* a record merged away is not also "lined" — the kept one carries the line */
  const gone = new Set(merges.flatMap(m => m.into.map(r => r.id)));
  return { merges, lined: lined.filter(a => !gone.has(a.id)), held };
}

/** Where every record put away now points: its id → the kept one's. */
export function mergedIds(plan: MergePlan): Map<string, string> {
  return new Map(plan.merges.flatMap(m => m.into.map(r => [r.id, m.keep.id] as const)));
}

/** A note's place on a machine is `asset:<id>` (lib/noteScope); moved with it. */
export function movedScope(testId: string, moved: ReadonlyMap<string, string>): string | undefined {
  if (!testId.startsWith('asset:')) return undefined;
  const to = moved.get(testId.slice('asset:'.length));
  return to ? `asset:${to}` : undefined;
}
