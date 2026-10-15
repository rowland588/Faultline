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
 * Every line keeps what was typed on it (Rowland, 15 October: "the how many
 * lines system doesn't work" — moving the merge rebuilt every line as a copy
 * of the first and threw away what differed, and a line one station longer
 * than the others locked the merge for good). Now: more lines are copies of
 * the first; moving the merge LATER hands the stations it passes to every line
 * (each its own copy), keeping all they had; EARLIER makes each line's last
 * stations shared (each keeps its first k), the first line's version kept. Lines of different lengths
 * merge at the first line's point. Pure — the page offers an Undo. */
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

/** Where the lines merge: after the first line's own stations. Undefined with
 *  no lines. */
export function mergeAfterOf(cap: Capacity): number | undefined {
  const lanes = cap.lanes ?? [];
  if (!lanes.length) return undefined;
  return cap.stations.filter(s => s.lane === lanes[0].id).length;
}

/** True when every line holds the same stations at the same speeds — the page
 *  then shows them once, "each of them", not the same V over and over. */
export function lanesAlike(cap: Capacity): boolean {
  const lanes = cap.lanes ?? [];
  if (lanes.length < 2) return false;
  const sig = (id: string) => JSON.stringify(cap.stations.filter(s => s.lane === id).map(s => { const { id: _i, lane: _l, ...rest } = s; void _i; void _l; return rest; }));
  const a = sig(lanes[0].id);
  return lanes.every(l => sig(l.id) === a);
}

export function reshape(cap: Capacity, lines: number, mergeAfter: number, uid: () => string): Capacity {
  const chain = chainOf(cap);
  const n = Math.max(1, Math.min(MAX_LINES, Math.floor(lines)));
  const k = Math.max(1, Math.min(chain.length, Math.floor(mergeAfter)));
  const strip = (s: Station): Station => { const { lane: _drop, ...rest } = s; void _drop; return rest as Station; };
  if (n === 1 || !chain.length) return { ...cap, lanes: undefined, stations: chain.map(strip) };
  const old = cap.lanes ?? [];
  const lanes: Lane[] = Array.from({ length: n }, (_, i) => old[i] ?? { id: uid(), name: laneLetter(i) });
  const ids = new Set(old.map(l => l.id));
  let shared = cap.stations.filter(s => !s.lane || !ids.has(s.lane)).map(strip);
  /* each line's own stations as they stand — a new line a copy of the first's */
  const firstOwn = old.length ? cap.stations.filter(s => s.lane === old[0].id) : chain.slice(0, 0);
  const own: Station[][] = lanes.map((l, i) => {
    if (!old.length) return [];
    const mine = cap.stations.filter(s => s.lane === l.id);
    return i < old.length ? mine : firstOwn.map(s => ({ ...s, id: uid(), lane: l.id }));
  });
  if (!old.length) { shared = chain.map(strip); }
  const kA = old.length ? firstOwn.length : 0;
  if (k > kA) {
    /* LATER: the shared stations it passes become every line's own */
    const pass = shared.slice(0, k - kA);
    shared = shared.slice(k - kA);
    lanes.forEach((l, i) => { own[i] = [...own[i], ...pass.map(s => (i === 0 ? { ...s, lane: l.id } : { ...s, id: uid(), lane: l.id }))]; });
  } else if (k < kA) {
    /* EARLIER: each line keeps its first k; what the first line had after
       them becomes the shared stations, in front of what was shared */
    shared = [...own[0].slice(k).map(strip), ...shared];
    own.forEach((o, i) => { own[i] = o.slice(0, k); });
  }
  return { ...cap, lanes, stations: [...own.flat(), ...shared] };
}
