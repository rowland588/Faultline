/* THE STOPS TIMED HERE, ON THE LINE'S OWN STOP LOG (FC-241 part 8, knowledge/specs/FC-241-workstation-stops.md — Rowland, 13 November:
 * "the cellox tool I'm using for stops is great and think the 6M tool could use similar for pareto … we need additional reasons to the
 * stop; that all could be very powerful").
 *
 * A record of Stops across workstations keeps every stop timed with its reason (stopReasons). The line's Pareto, its 6M's fishbone, the
 * loss count and What Faultline has found all read ONE place — the line's stop log (observations). So the stops are COPIED there, by the
 * person, with a link back, and kept in step afterwards: one stop here is one stop there, never two, because its id on the log is worked
 * out from this record, its workstation and the moment it began. The reason is the log's category (what the Pareto ranks), the
 * workstation its machine. Nothing is invented: a stop with no reason is "No reason given"; minutes typed by hand with no stop timed are
 * not sent, because the log holds events, not totals. Pure. */
import type { Observation } from '../../types';
import type { StopDone } from './stopReasons';

export const NO_REASON = 'No reason given';
export const FROM = 'From Stops across workstations';

/* a small, stable 128-bit hash (cyrb128) written as a UUID — the log's id column is a uuid, and the same stop must always get the same one */
function hash128(s: string): [number, number, number, number] {
  let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
  for (let i = 0; i < s.length; i++) {
    const k = s.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067); h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213); h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067); h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213); h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4; h2 ^= h1; h3 ^= h1; h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}
export function stopObsId(studyId: string, station: number, at: number): string {
  const hex = hash128(`stops-to-line|${studyId}|${station}|${at}`).map(n => n.toString(16).padStart(8, '0')).join('').split('');
  hex[12] = '4'; hex[16] = '89ab'[parseInt(hex[16], 16) & 3];
  const h = hex.join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

export interface Wanted { studyId: string; name: string; lineId: string; stops: readonly StopDone[]; nameOf: (i: number) => string; now: number; ownerId?: string }

/** Each timed stop as the line's log holds one. */
export function stopsWanted(w: Wanted): Observation[] {
  return w.stops.map(s => {
    const durationMs = Math.max(0, Math.round(s.min * 60000));
    return {
      id: stopObsId(w.studyId, s.i, s.at), workspaceId: w.lineId, ...(w.ownerId ? { ownerId: w.ownerId } : {}),
      category: s.why || NO_REASON, asset: w.nameOf(s.i), startedAt: s.at, endedAt: s.at + durationMs, durationMs, timing: 'stopwatch' as const,
      count: 1, note: `${FROM} — ${w.name}`, media: [], createdAt: w.now, updatedAt: w.now,
    };
  });
}

export interface Plan { add: Observation[]; update: Observation[]; remove: string[]; ids: string[] }
const same = (a: Observation, b: Observation): boolean => a.workspaceId === b.workspaceId && a.category === b.category && a.asset === b.asset
  && a.startedAt === b.startedAt && a.durationMs === b.durationMs && a.note === b.note && a.deletedAt == null;

/** What to do to the log so it holds exactly these stops of this record: `held` is what the log has under the ids sent before or wanted
 *  now (deleted ones included). A stop already there keeps whatever was added to it on the line (its cause family, its photos). */
export function planSync(wanted: readonly Observation[], held: ReadonlyMap<string, Observation>, sent: readonly string[]): Plan {
  const add: Observation[] = [], update: Observation[] = [];
  const ids = new Set(wanted.map(o => o.id));
  for (const o of wanted) {
    const h = held.get(o.id);
    if (!h) add.push(o);
    else if (!same(h, o)) { const { deletedAt: _d, ...rest } = h; void _d; update.push({ ...rest, workspaceId: o.workspaceId, category: o.category, asset: o.asset, startedAt: o.startedAt, endedAt: o.endedAt, durationMs: o.durationMs, note: o.note }); }
  }
  const remove = sent.filter(id => !ids.has(id) && held.get(id) && held.get(id)?.deletedAt == null);
  return { add, update, remove, ids: [...ids] };
}

/** What the page says about it. */
export function lineStopsSaid(o: { line?: string; stops: number; sent?: number; canEdit: boolean }): string {
  if (!o.line) return 'This record is on no line, so its stops are on no line’s stop log. Put it on a line (Change, at the top) and they can go to that line’s Pareto and 6M.';
  if (o.sent === undefined) return `${o.stops} ${o.stops === 1 ? 'stop is' : 'stops are'} only in this record. Put ${o.stops === 1 ? 'it' : 'them'} on ${o.line}’s stop log and its Pareto and its 6M read ${o.stops === 1 ? 'it' : 'them'} — each stop as timed here, its reason what the Pareto ranks, its workstation the machine.`;
  return `On ${o.line}’s stop log: ${o.sent} ${o.sent === 1 ? 'stop' : 'stops'} from this record${o.canEdit ? ', kept in step as you time more, change a reason or take one off' : ''}. Its Pareto and its 6M read them.`;
}
