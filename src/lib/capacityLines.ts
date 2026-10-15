/* THE SHAPE OF THE LINE — how many lines feed in, and where they meet.
 *
 * Rowland, 15 October: "it should almost be asking how many lines do you want
 * to do, and do they merge at the end — and then you can signal that this is
 * the end merge." One chain of stations (or the lines already there) is made
 * into N lines that go through the same first stations, then the rest shared:
 * `reshape(cap, n, k)` — the first k stations are each line's own, whatever
 * follows is where they merge. k = all of them: they do not merge, each ends
 * on its own and what they make is added. n = 1: one chain again.
 *
 * Nothing is lost silently: a line that already holds exactly k stations is
 * kept as it is (its speeds, its crew); the others are copies of the first
 * line's, to change what differs. Pure — the page offers an Undo. */
import type { Capacity, Lane, Station } from './capacity';

export const MAX_LINES = 8;
export const laneLetter = (i: number) => `Line ${String.fromCharCode(65 + (i % 26))}`;

/** The stations in flow order as one chain: the first line's own, then what
 *  they merge into. With no lines, the chain as it is. */
export function chainOf(cap: Capacity): Station[] {
  const lanes = cap.lanes ?? [];
  if (!lanes.length) return cap.stations;
  const ids = new Set(lanes.map(l => l.id));
  const first = cap.stations.filter(s => s.lane === lanes[0].id);
  return [...first, ...cap.stations.filter(s => !s.lane || !ids.has(s.lane))];
}

/** How many stations each line has of its own now — the merge point, when the
 *  lines are all the same length; otherwise undefined (they differ). */
export function mergeAfterOf(cap: Capacity): number | undefined {
  const lanes = cap.lanes ?? [];
  if (!lanes.length) return undefined;
  const n = lanes.map(l => cap.stations.filter(s => s.lane === l.id).length);
  return n.every(x => x === n[0]) ? n[0] : undefined;
}

export function reshape(cap: Capacity, lines: number, mergeAfter: number, uid: () => string): Capacity {
  const chain = chainOf(cap);
  const n = Math.max(1, Math.min(MAX_LINES, Math.floor(lines)));
  const k = Math.max(1, Math.min(chain.length, Math.floor(mergeAfter)));
  const strip = (s: Station): Station => { const { lane: _drop, ...rest } = s; void _drop; return rest as Station; };
  if (n === 1 || !chain.length) return { ...cap, lanes: undefined, stations: chain.map(strip) };
  const old = cap.lanes ?? [];
  const lanes: Lane[] = Array.from({ length: n }, (_, i) => old[i] ?? { id: uid(), name: laneLetter(i) });
  const template = chain.slice(0, k);
  const stations: Station[] = [];
  lanes.forEach((l, i) => {
    const own = cap.stations.filter(s => s.lane === l.id);
    if (i === 0) template.forEach(s => stations.push({ ...s, lane: l.id }));
    else if (own.length === k) own.forEach(s => stations.push(s));
    else template.forEach(s => stations.push({ ...s, id: uid(), lane: l.id }));
  });
  chain.slice(k).forEach(s => stations.push(strip(s)));
  return { ...cap, lanes, stations };
}
