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

/* THE ICONS — food manufacturing, in four groups. Rowland: "we need more
   icons available. Go full food manufacturing." Every glyph is a 24-unit SVG
   path drawn white on a disc of its group's colour, the same path on the
   screen and on the printed card. `rule` is nonzero only for the few glyphs
   whose strokes cross (a snowflake, an ear of wheat); everything else cuts its
   holes with evenodd. */
export type IconGroup = 'people' | 'kit' | 'machines' | 'safety';

export interface IconDef { kind: string; word: string; group: IconGroup; colour: string; glyph: string; rule?: 'nonzero' }

const PEOPLE = '#1f63e0', KIT = '#a86a12', MACH = '#3b5b8c', SAFE = '#0f7b6c', DANGER = '#c0392b';

export const ICON_GROUPS: { group: IconGroup; word: string }[] = [
  { group: 'people', word: 'People' },
  { group: 'kit', word: 'Materials & kit' },
  { group: 'machines', word: 'Machines' },
  { group: 'safety', word: 'Quality & safety' },
];

export const MARKS: IconDef[] = [
  /* people */
  { kind: 'person', word: 'Person', group: 'people', colour: PEOPLE,
    glyph: 'M12 3a3 3 0 1 1 0 6a3 3 0 1 1 0-6zM7 20v-6.5A3.5 3.5 0 0 1 10.5 10h3a3.5 3.5 0 0 1 3.5 3.5V20z' },
  /* materials & kit */
  { kind: 'pallet', word: 'Pallet', group: 'kit', colour: KIT,
    glyph: 'M3 7h18v3H3zM3 15h18v3H3zM4 10h3v5H4zM10.5 10h3v5h-3zM17 10h3v5h-3z' },
  { kind: 'box', word: 'Box', group: 'kit', colour: KIT, glyph: 'M4 7.5L12 4l8 3.5v9L12 20l-8-3.5z' },
  { kind: 'crate', word: 'Crate', group: 'kit', colour: KIT, glyph: 'M4 6h16v12H4zM6.5 8v8h2V8zM11 8v8h2V8zM15.5 8v8h2V8z' },
  { kind: 'tray', word: 'Tray', group: 'kit', colour: KIT, glyph: 'M3 8h18v2H3zM3.5 10h17l-2 6h-13z' },
  { kind: 'tote', word: 'Tote bin', group: 'kit', colour: KIT, glyph: 'M3 4h18v2H3zM4 6h16l-1.5 13h-13zM8.5 8.5h7V10h-7z' },
  { kind: 'sack', word: 'Sack', group: 'kit', colour: KIT, glyph: 'M8 3h8l-1.2 2.4C17.5 7.5 19 10.4 19 14c0 4.2-2.6 7-7 7s-7-2.8-7-7c0-3.6 1.5-6.5 4.2-8.6z' },
  { kind: 'reel', word: 'Film reel', group: 'kit', colour: KIT, glyph: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 1 0 0-5z' },
  { kind: 'produce', word: 'Produce', group: 'kit', colour: KIT, glyph: 'M6.6 8.4c2.4-4.3 9.5-4.3 11.4.2 1.9 4.4-.3 10.2-6.2 10.9-5.4.6-7.8-6.1-5.2-11.1zM10 10a1 1 0 1 0 0 2a1 1 0 1 0 0-2zM14 13a1 1 0 1 0 0 2a1 1 0 1 0 0-2z' },
  { kind: 'cage', word: 'Cage', group: 'kit', colour: '#55657a',
    glyph: 'M5 3h2v13h10V3h2v15H5zM7 6.5h10V8H7zM7 10.5h10V12H7zM6 19a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM15 19a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z' },
  { kind: 'trolley', word: 'Trolley', group: 'kit', colour: '#55657a', glyph: 'M4 3h2v13h14v2H4zM8 6h10v8H8zM6 20a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM15 20a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z' },
  { kind: 'rack', word: 'Racking', group: 'kit', colour: '#55657a', glyph: 'M4 3h2v18H4zM18 3h2v18h-2zM6 7h12v1.5H6zM6 12h12v1.5H6zM6 17h12v1.5H6z' },
  { kind: 'bin', word: 'Bin', group: 'kit', colour: '#55657a', glyph: 'M6 8h12l-1.2 12H7.2zM5 5h14v2H5zM10 3h4v2h-4z' },
  { kind: 'pallettruck', word: 'Pallet truck', group: 'kit', colour: '#c2410c', glyph: 'M3 3h5v1.6H6.6V13H21v3H5V4.6H3zM6.5 19a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0zM16 19a1.6 1.6 0 1 0 3.2 0a1.6 1.6 0 1 0-3.2 0z' },
  { kind: 'forklift', word: 'Forklift', group: 'kit', colour: '#c2410c',
    glyph: 'M3 10h7l2 4v4H3zM5 5h4v5H5zM14 3h1.6v15H14zM15.6 16.4H21V18h-5.4zM4 19.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM9 19.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z' },
  /* machines */
  { kind: 'conveyor', word: 'Conveyor', group: 'machines', colour: MACH, glyph: 'M2 10h20v3.5H2zM5 6h4v4H5zM13 6h4v4h-4zM4 16.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM10.5 16.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0zM17 16.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0z' },
  { kind: 'bagger', word: 'Bagger', group: 'machines', colour: MACH, glyph: 'M7 2h10l-2.5 4h-5zM6 7h12v9H6zM9 9h6v4H9zM9 17h6v5H9z' },
  { kind: 'flowwrap', word: 'Flow wrapper', group: 'machines', colour: MACH, glyph: 'M2 10h20v6H2zM4 6h6v4H4zM13 12h5v2h-5z' },
  { kind: 'casepacker', word: 'Case packer', group: 'machines', colour: MACH, glyph: 'M4 11h16v10H4zM11 2h2v5h3l-4 4-4-4h3z' },
  { kind: 'labeller', word: 'Labeller', group: 'machines', colour: MACH, glyph: 'M3 6h12l6 6-6 6H3zM7.5 10.5a1.5 1.5 0 1 0 0 3a1.5 1.5 0 1 0 0-3z' },
  { kind: 'coder', word: 'Coder / printer', group: 'machines', colour: MACH, glyph: 'M6 3h12v5H6zM3 9h18v8h-3v4H6v-4H3zM8 14.5h8v4.5H8z' },
  { kind: 'metaldetector', word: 'Metal detector', group: 'machines', colour: MACH, glyph: 'M4 4h16v13h-3V7H7v10H4zM2 17.5h20V20H2z' },
  { kind: 'checkweigher', word: 'Checkweigher', group: 'machines', colour: MACH, glyph: 'M7 4h10v8H7zM9 6h6v4H9zM11 12h2v3h-2zM2 15h20v3H2z' },
  { kind: 'scale', word: 'Scale', group: 'machines', colour: MACH, glyph: 'M6 7h12v2H6zM10 9h4v5h-4zM4 14h16v3H4zM6 17h12v4H6z' },
  { kind: 'xray', word: 'X-ray', group: 'machines', colour: MACH, glyph: 'M3 6h18v12H3zM12 8.5l4 7H8z' },
  { kind: 'robot', word: 'Robot / pick & place', group: 'machines', colour: MACH, glyph: 'M4 19h8v3H4zM7 12h2v7H7zM7.3 11.6l7-6 1.4 1.6-7 6zM14 3h5v2h-1.5v3h-1.5V5h-2z' },
  { kind: 'hopper', word: 'Hopper', group: 'machines', colour: MACH, glyph: 'M3 3h18l-7 9v7h-4v-7z' },
  { kind: 'mixer', word: 'Mixer', group: 'machines', colour: MACH, glyph: 'M8 3h8v2H8zM11 5h2v6h-2zM4 11h16c0 5-3.6 9-8 9s-8-4-8-9z' },
  { kind: 'oven', word: 'Oven / fryer', group: 'machines', colour: MACH, glyph: 'M3 4h18v16H3zM5 8.5h14V18H5zM6 5.5h2V7H6zM10 5.5h2V7h-2z' },
  { kind: 'chiller', word: 'Chiller / freezer', group: 'machines', colour: '#1d7fb8', rule: 'nonzero',
    glyph: 'M11 2h2v20h-2zM2 11h20v2H2zM4.9 6.3l1.4-1.4 12.8 12.8-1.4 1.4zM17.7 4.9l1.4 1.4L6.3 19.1l-1.4-1.4z' },
  { kind: 'washer', word: 'Washer', group: 'machines', colour: '#1d7fb8', glyph: 'M12 3c3 4 5 7 5 10a5 5 0 0 1-10 0c0-3 2-6 5-10z' },
  { kind: 'stretchwrap', word: 'Stretch wrapper', group: 'machines', colour: MACH, glyph: 'M5 4h14v13H5zM5 7h14v1.5H5zM5 11h14v1.5H5zM3 18h18v3H3z' },
  { kind: 'hmi', word: 'Screen / HMI', group: 'machines', colour: MACH, glyph: 'M4 5h16v12H4zM6 7h12v8H6zM10 18h4v2.5h-4z' },
  /* quality & safety */
  { kind: 'qc', word: 'QC check', group: 'safety', colour: SAFE, glyph: 'M6 4h12v18H6zM9 2h6v4H9zM8.5 9h7v1.5h-7zM8.5 13h7v1.5h-7zM8.5 17h5v1.5h-5z' },
  { kind: 'thermometer', word: 'Temperature', group: 'safety', colour: SAFE, glyph: 'M10 4a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0zM11.2 6h1.6v8.5h-1.6z' },
  { kind: 'inspect', word: 'Inspection', group: 'safety', colour: SAFE, glyph: 'M12 6c5 0 9 6 9 6s-4 6-9 6-9-6-9-6 4-6 9-6zM12 9a3 3 0 1 0 0 6a3 3 0 1 0 0-6z' },
  { kind: 'allergen', word: 'Allergen', group: 'safety', colour: '#b7791f', rule: 'nonzero',
    glyph: 'M11.25 4h1.5v18h-1.5zM12 7c2-2.2 4-2.4 5.2-1.4-1 2-3.2 3.2-5.2 3.2zM12 7c-2-2.2-4-2.4-5.2-1.4 1 2 3.2 3.2 5.2 3.2zM12 12c2-2.2 4-2.4 5.2-1.4-1 2-3.2 3.2-5.2 3.2zM12 12c-2-2.2-4-2.4-5.2-1.4 1 2 3.2 3.2 5.2 3.2zM12 17c2-2.2 4-2.4 5.2-1.4-1 2-3.2 3.2-5.2 3.2zM12 17c-2-2.2-4-2.4-5.2-1.4 1 2 3.2 3.2 5.2 3.2z' },
  { kind: 'handwash', word: 'Hand wash', group: 'safety', colour: SAFE, glyph: 'M12 2c2 3 3.5 5 3.5 7a3.5 3.5 0 0 1-7 0c0-2 1.5-4 3.5-7zM4 14h16v3c0 2.2-1.8 4-4 4H8c-2.2 0-4-1.8-4-4z' },
  { kind: 'ppe', word: 'PPE', group: 'safety', colour: SAFE, glyph: 'M4 15a8 8 0 0 1 16 0zM11 6.5h2V11h-2zM2 15h20v3H2z' },
  { kind: 'cleaning', word: 'Cleaning', group: 'safety', colour: SAFE, glyph: 'M9 9h6v12H9zM10 6h5v3h-5zM15 6h3v1.5h-3zM7 6.5h2.5V8H7z' },
  { kind: 'firstaid', word: 'First aid', group: 'safety', colour: '#1e8a4c', glyph: 'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z' },
  { kind: 'estop', word: 'E-stop', group: 'safety', colour: DANGER, glyph: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM12 7a5 5 0 1 0 0 10a5 5 0 1 0 0-10zM12 9.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z' },
  { kind: 'extinguisher', word: 'Fire extinguisher', group: 'safety', colour: DANGER, glyph: 'M9 8h6v13H9zM10 4h4v2h-4zM11 6h2v2h-2zM14 4.5h3l2 2h-2l-1-.8h-2z' },
  { kind: 'warning', word: 'Hazard', group: 'safety', colour: DANGER, glyph: 'M12 2l10 19H2zM11 9h2v6h-2zM11 16.5h2v2h-2z' },
  { kind: 'noentry', word: 'No entry', group: 'safety', colour: DANGER, glyph: 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18zM6 11h12v2H6z' },
];

export type MarkKind = string;

/* THE SHAPES — for drawing the line when there is no picture of it, or on top
   of one. Rowland: "circles, rectangles, squares, triangles, the same sort of
   shapes you'd expect with something like Visio … and write in the middle of
   the shape itself." A shape is a mark of kind 'shape': a box (x, y its centre,
   w and h its size, all in percent of the board) with its words in the middle.
   An arrow runs from (x, y) by (w, h). */
export type ShapeKind = 'rect' | 'square' | 'circle' | 'triangle' | 'arrow' | 'text';

export const SHAPES: { shape: ShapeKind; word: string }[] = [
  { shape: 'rect', word: 'Rectangle' },
  { shape: 'square', word: 'Square' },
  { shape: 'circle', word: 'Circle' },
  { shape: 'triangle', word: 'Triangle' },
  { shape: 'arrow', word: 'Arrow' },
  { shape: 'text', word: 'Text' },
];

export type ShapeTone = 'blue' | 'grey' | 'amber' | 'green' | 'red';
export const TONES: Record<ShapeTone, { fill: string; stroke: string; ink: string; word: string }> = {
  blue: { fill: '#e3edfd', stroke: '#1f63e0', ink: '#123c8c', word: 'Machine' },
  grey: { fill: '#eceff4', stroke: '#55657a', ink: '#2b3546', word: 'Structure' },
  amber: { fill: '#fdf1dc', stroke: '#b7791f', ink: '#6e4a0f', word: 'Materials' },
  green: { fill: '#e2f4ea', stroke: '#1e8a4c', ink: '#145c34', word: 'Zone' },
  red: { fill: '#fde6e3', stroke: '#c0392b', ink: '#8a2318', word: 'Hazard' },
};

/** One thing on the map. x and y are percentages of the picture, the same
 *  as a pin on the walk. A person carries a role ("Op 2") and what they do.
 *  A shape (kind 'shape') also carries its size and colour. */
export interface StandardMark {
  id: ID;
  kind: MarkKind;
  x: number;
  y: number;
  label?: string;
  task?: string;
  shape?: ShapeKind;
  w?: number;
  h?: number;
  tone?: ShapeTone;
}

export const isShape = (m: Pick<StandardMark, 'kind'>): boolean => m.kind === 'shape';

export interface Standard {
  id: ID;
  projectId: ID;
  /** The product this map is for, in words. Usually a program's name. */
  product: string;
  /** The program it was picked from, when it was. */
  programId?: ID;
  /** The picture of the line — a photo, or a frame off the filmed walk.
   *  Absent: a plain board, drawn on with shapes. */
  photoKey?: string;
  marks: StandardMark[];
  note?: string;
  sort: number;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export const markOf = (k: MarkKind): IconDef => MARKS.find(m => m.kind === k) ?? MARKS[0];

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

/** "boxes", "x-rays", "tote bins" — the plural of an icon's word. */
export function manyOf(word: string): string {
  const w = word.toLowerCase();
  return /(x|ch|sh|s)$/.test(w) ? `${w}es` : `${w}s`;
}

/** Everything else on the map, counted by kind: "2 pallets · 1 bin". */
export function thingsOf(s: Pick<Standard, 'marks'>): string {
  const counts = new Map<MarkKind, number>();
  for (const m of s.marks) if (m.kind !== 'person' && !isShape(m)) counts.set(m.kind, (counts.get(m.kind) ?? 0) + 1);
  return [...counts].map(([k, n]) => `${n} ${n === 1 ? markOf(k).word.toLowerCase() : manyOf(markOf(k).word)}`).join(' · ');
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
