/* THE SPAGHETTI DIAGRAM — walking and transport distance (FC-004; knowledge/specs/FC-004-spaghetti-diagram.md; knowledge/methods/lean/spaghetti.md).
 *
 * One person's (or one load's) path over a round, every leg a line on the layout, to scale: the tangle shows the motion and the transport nobody sees while
 * doing them. Then measure: the distance of a round, the rounds a shift, the distance and time a shift, and which trips make most of it. A leg's length is the
 * metres WALKED (paced, or a wheel or tape — typed), else the straight line between the two places' positions on the layout — said to be that, since a person goes
 * round a guard. The pace is a stated choice: unloaded about 1.6 m/s (MTM-1's walking element, 5.3 TMU a foot) or loaded and crowded about 1.3 m/s, or a pace timed on the
 * floor — always said, because it moves the minutes by a quarter. Nothing reads a person's movement: every place and metre is typed. Pure; the page, the paper and the
 * acceptance script read these figures. */

export interface Place { name: string; /** metres east and north of the layout's corner */ x?: number; y?: number; /** metres walked from the place before it, typed */ m?: number; /** what the trip to it is for */ trip?: string }

export interface Leg {
  n: number; from: string; to: string;
  /** metres, or absent when neither typed nor given by two positions */
  m?: number;
  /** where the length came from */
  source: 'walked' | 'straight' | 'none';
  trip: string;
}

export const PACE = {
  unloaded: { ms: 1.6, label: 'unloaded, at a standard pace', source: 'MTM-1’s walking element: 5.3 TMU a foot, about 1.6 m/s' },
  loaded: { ms: 1.3, label: 'loaded or in a crowded hall', source: 'the knowledge record: 1.2–1.3 m/s is nearer when loaded, crowded or on a wet floor' },
} as const;
export type PaceKind = keyof typeof PACE | 'timed';

const key = (n: string): string => n.trim().toLowerCase().replace(/\s+/g, ' ');
const dist = (a: Place, b: Place): number | undefined => (a.x !== undefined && a.y !== undefined && b.x !== undefined && b.y !== undefined ? Math.hypot(b.x - a.x, b.y - a.y) : undefined);

/** The legs of a path: place i − 1 to place i. */
export function legsOf(places: readonly Place[]): Leg[] {
  const out: Leg[] = [];
  for (let i = 1; i < places.length; i++) {
    const a = places[i - 1], b = places[i];
    const straight = dist(a, b);
    const m = b.m !== undefined ? b.m : straight;
    out.push({ n: i, from: a.name, to: b.name, ...(m !== undefined ? { m } : {}), source: b.m !== undefined ? 'walked' : straight !== undefined ? 'straight' : 'none', trip: b.trip?.trim() || `${a.name} → ${b.name}` });
  }
  return out;
}

export interface Trip { name: string; m: number; share: number; legs: number }

export interface WalkFigures {
  legs: Leg[];
  /** Σ the legs that have a length — one round. */
  round: number;
  /** legs with no length yet, and legs whose length is a straight line */
  missing: number[]; straight: number[];
  /** the trips, longest first (a trip is the legs sharing a label — else each leg is its own) */
  trips: Trip[];
  shiftM: number;
  /** minutes of walking in a shift at the pace given */
  minutes: number;
  /** the same at the other standard pace, to say how much the pace assumed matters */
  minutesAt: (ms: number) => number;
  shareOfShift?: number;
  longest?: Trip;
}

export function walkFigures(places: readonly Place[], o: { rounds: number; ms: number; shiftMin?: number }): WalkFigures {
  const legs = legsOf(places);
  const round = legs.reduce((t, l) => t + (l.m ?? 0), 0);
  const by = new Map<string, Trip>();
  for (const l of legs) {
    if (l.m === undefined) continue;
    const t = by.get(key(l.trip)) ?? { name: l.trip, m: 0, share: 0, legs: 0 };
    t.m += l.m; t.legs++; by.set(key(l.trip), t);
  }
  const trips = [...by.values()].map(t => ({ ...t, share: round > 0 ? t.m / round : 0 })).sort((a, b) => b.m - a.m || a.name.localeCompare(b.name));
  const shiftM = round * o.rounds;
  const minutesAt = (ms: number): number => shiftM / ms / 60;
  const minutes = minutesAt(o.ms);
  return {
    legs, round, missing: legs.filter(l => l.m === undefined).map(l => l.n), straight: legs.filter(l => l.source === 'straight').map(l => l.n), trips, shiftM, minutes, minutesAt,
    ...(o.shiftMin && o.shiftMin > 0 ? { shareOfShift: minutes / o.shiftMin } : {}), ...(trips[0] ? { longest: trips[0] } : {}),
  };
}

/** MONEY (knowledge/MONEY.md §4, FC-004 — labour L): the walking is the person's time at the line's wage with on-costs. */
export interface WalkMoney { perShift?: number; perWeek?: number; missing: string[] }
export function walkMoney(minutes: number, x: { rate?: number; shiftsPerWeek?: number }): WalkMoney {
  if (x.rate === undefined) return { missing: ['Give the line a wage (Set up the line), or type what an hour of the person walking costs, to say the walking in money.'] };
  const perShift = (minutes / 60) * x.rate;
  return { perShift, ...(x.shiftsPerWeek !== undefined ? { perWeek: perShift * x.shiftsPerWeek } : {}), missing: x.shiftsPerWeek === undefined ? ['Give how many shifts a week this person works the round to say it a week.'] : [] };
}

/** The data window of a path's drawing: the bounding box of the placed places, padded, widened (about its centre) so that one metre is the same length across and
 *  up — and kept between 1 : 2.5 and 2.5 : 1 so the drawing is never a thread. */
export function windowOf(pts: readonly { x: number; y: number }[]): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Math.min(...pts.map(p => p.x)), x1 = Math.max(...pts.map(p => p.x)), y0 = Math.min(...pts.map(p => p.y)), y1 = Math.max(...pts.map(p => p.y));
  const pad = Math.max(2, 0.12 * Math.max(x1 - x0, y1 - y0));
  x0 -= pad; x1 += pad; y0 -= pad; y1 += pad;
  const w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  if (w / h > 2.5) { const nh = w / 2.5; y0 = cy - nh / 2; y1 = cy + nh / 2; }
  else if (h / w > 2.5) { const nw = h / 2.5; x0 = cx - nw / 2; x1 = cx + nw / 2; }
  return { x0, x1, y0, y1 };
}
