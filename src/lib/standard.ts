/* THE LINE STANDARD — who stands where, on each product. A tool, built on the
 * evidence system's picture.
 *
 * Rowland: "line standard manning … at the moment it's done really crudely in
 * manufacturing operations. Take a picture, and then we'll have little icons —
 * pallets, human icons, boxes … put these people and create a line map to say
 * when you're on this product, this is where the people go, this is what they
 * do."
 *
 * ONE MAP PER PRODUCT. The products are the job's programs where it has them
 * (Maris Piper 2kg — Tall …), typed where it does not — so picking a product
 * is picking a program and there is no second list of products to keep.
 *
 * Where it is used: on a stage-gate job, Hand over — how the new line is run,
 * product by product, is part of handing it over. On a 3P job, the standard
 * the line runs to: People. It prints as one page per product, to put up at
 * the line. Headcount is counted off the people on the map, never typed.
 */
import type { ID } from '../types';

export type MarkKind = 'person' | 'pallet' | 'box' | 'crate' | 'cage' | 'bin' | 'forklift';

/** One thing on the map. x and y are percentages of the picture, the same
 *  as a pin on the walk. A person carries a role ("Op 2") and what they do. */
export interface StandardMark {
  id: ID;
  kind: MarkKind;
  x: number;
  y: number;
  label?: string;
  task?: string;
}

export interface Standard {
  id: ID;
  projectId: ID;
  /** The product this map is for, in words. Usually a program's name. */
  product: string;
  /** The program it was picked from, when it was. */
  programId?: ID;
  /** The picture of the line — a photo, or a frame off the filmed walk. */
  photoKey?: string;
  marks: StandardMark[];
  note?: string;
  sort: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/** The icons, in the order the palette offers them. A glyph is a 24-unit
 *  SVG path drawn white on a disc of the kind's colour — the same path on the
 *  screen and on the printed sheet, so the two cannot drift. */
export const MARKS: { kind: MarkKind; word: string; colour: string; glyph: string }[] = [
  { kind: 'person', word: 'Person', colour: '#1f63e0',
    glyph: 'M12 3a3 3 0 1 1 0 6a3 3 0 1 1 0-6zM7 20v-6.5A3.5 3.5 0 0 1 10.5 10h3a3.5 3.5 0 0 1 3.5 3.5V20z' },
  { kind: 'pallet', word: 'Pallet', colour: '#a86a12',
    glyph: 'M3 7h18v3H3zM3 15h18v3H3zM4 10h3v5H4zM10.5 10h3v5h-3zM17 10h3v5h-3z' },
  { kind: 'box', word: 'Box', colour: '#a86a12',
    glyph: 'M4 7.5L12 4l8 3.5v9L12 20l-8-3.5z' },
  { kind: 'crate', word: 'Crate', colour: '#a86a12',
    glyph: 'M4 6h16v12H4zM6.5 8v8h2V8zM11 8v8h2V8zM15.5 8v8h2V8z' },
  { kind: 'cage', word: 'Cage', colour: '#55657a',
    glyph: 'M5 3h2v13h10V3h2v15H5zM7 6.5h10V8H7zM7 10.5h10V12H7zM6 19a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM15 19a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z' },
  { kind: 'bin', word: 'Bin', colour: '#55657a',
    glyph: 'M6 8h12l-1.2 12H7.2zM5 5h14v2H5zM10 3h4v2h-4z' },
  { kind: 'forklift', word: 'Forklift', colour: '#c2410c',
    glyph: 'M3 10h7l2 4v4H3zM5 5h4v5H5zM14 3h1.6v15H14zM15.6 16.4H21V18h-5.4zM4 19.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM9 19.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z' },
];

export const markOf = (k: MarkKind) => MARKS.find(m => m.kind === k) ?? MARKS[0];

const live = <T extends { deletedAt?: number }>(xs: readonly T[]): T[] => xs.filter(x => !x.deletedAt);
export { live as liveStandards };

/** The people on a map, in the order they were numbered. */
export function peopleOf(s: Pick<Standard, 'marks'>): StandardMark[] {
  return s.marks.filter(m => m.kind === 'person');
}

/** "6 people" — counted, never typed. */
export function headcount(s: Pick<Standard, 'marks'>): number {
  return peopleOf(s).length;
}

/** The next role to give a person dropped on the map: Op 1, Op 2 … the
 *  lowest number not already taken, so deleting Op 2 lets the next one be
 *  Op 2 again rather than Op 7. */
export function nextRole(s: Pick<Standard, 'marks'>): string {
  const taken = new Set(peopleOf(s).map(m => /^Op (\d+)$/.exec(m.label ?? '')?.[1]).filter(Boolean).map(Number));
  let n = 1;
  while (taken.has(n)) n++;
  return `Op ${n}`;
}

/** Everything else on the map, counted by kind: "2 pallets · 1 bin". */
export function thingsOf(s: Pick<Standard, 'marks'>): string {
  const counts = new Map<MarkKind, number>();
  for (const m of s.marks) if (m.kind !== 'person') counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1);
  return [...counts].map(([k, n]) => `${n} ${markOf(k).word.toLowerCase()}${n === 1 ? '' : k === 'box' ? 'es' : 's'}`).join(' · ');
}

/** A copy of a map for another product — the same picture and the same
 *  places, to move what differs. New ids throughout: two maps never share a
 *  mark, or moving a person on one would move them on both. */
export function copyFor(s: Standard, product: string, newId: () => ID, at: number, programId?: ID): Standard {
  return {
    ...s, id: newId(), product, programId, sort: at, createdAt: at, updatedAt: at, deletedAt: undefined,
    marks: s.marks.map(m => ({ ...m, id: newId() })),
  };
}
