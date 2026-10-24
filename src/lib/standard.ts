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
import type { Capacity } from '../tools/linebalance/capacity';

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

export type ShapeTone = 'blue' | 'grey' | 'amber' | 'green' | 'red' | 'purple' | 'teal';
export const TONES: Record<ShapeTone, { fill: string; stroke: string; ink: string; word: string }> = {
  blue: { fill: '#e3edfd', stroke: '#1f63e0', ink: '#123c8c', word: 'Machine' },
  grey: { fill: '#eceff4', stroke: '#55657a', ink: '#2b3546', word: 'Structure' },
  amber: { fill: '#fdf1dc', stroke: '#b7791f', ink: '#6e4a0f', word: 'Materials' },
  green: { fill: '#e2f4ea', stroke: '#1e8a4c', ink: '#145c34', word: 'Zone' },
  red: { fill: '#fde6e3', stroke: '#c0392b', ink: '#8a2318', word: 'Hazard' },
  /* two more (Rowland, 13 October: "a few more options with lines and colours") —
     an area of work and the flow of product, never a state's meaning */
  purple: { fill: '#efe7fd', stroke: '#7c3aed', ink: '#4c1d95', word: 'Area' },
  teal: { fill: '#dcf3f0', stroke: '#0f766e', ink: '#134e4a', word: 'Flow' },
};

/* A SHAPE'S FILL AND LINE (Rowland, 13 October: "a few more options with
   lines and colours ... almost fading out a certain area of a colour"). The
   fill: none (an outline), light (the colour's own wash — as before) or
   faded (the colour itself, seen through — an area that stands out while
   the picture still shows under it). The line: solid, dashed, dotted or
   thick. */
export type ShapeFill = 'none' | 'light' | 'faded';
export const FILLS: { fill: ShapeFill; word: string }[] = [
  { fill: 'none', word: 'None' }, { fill: 'light', word: 'Light' }, { fill: 'faded', word: 'Faded' },
];
export type ShapeLine = 'solid' | 'dashed' | 'dotted' | 'thick';
export const LINES: { line: ShapeLine; word: string }[] = [
  { line: 'solid', word: 'Solid' }, { line: 'dashed', word: 'Dashed' }, { line: 'dotted', word: 'Dotted' }, { line: 'thick', word: 'Thick' },
];
/** How opaque a faded area is drawn — the picture still seen under it. */
export const FADED_ALPHA = 0.32;
/** A stroke pattern for a line, in multiples of the line's width. */
export const dashOf = (line: ShapeLine | undefined, width: number): number[] =>
  line === 'dashed' ? [width * 4, width * 3] : line === 'dotted' ? [width * 0.1, width * 2.2] : [];
/** The line's width against the usual. */
export const weightOf = (line: ShapeLine | undefined): number => (line === 'thick' ? 2.2 : 1);

/* A PERSON'S COLOUR — Rowland, 13 October: "I also can't change the colour
   of the people. I want to be able to do that." Teams, crews or jobs told
   apart at a glance (line lead, quality, the fitter). Never the state
   colours' meaning: a person's role is always written beside them, on the
   board and on the card, so the colour is never the only thing that says. */
export type PersonColour = 'blue' | 'purple' | 'teal' | 'orange' | 'pink' | 'brown' | 'slate' | 'black';
export const PERSON_COLOURS: Record<PersonColour, { hex: string; word: string }> = {
  blue: { hex: '#1f63e0', word: 'Blue' },
  purple: { hex: '#7c3aed', word: 'Purple' },
  teal: { hex: '#0f766e', word: 'Teal' },
  orange: { hex: '#c2410c', word: 'Orange' },
  pink: { hex: '#be185d', word: 'Pink' },
  brown: { hex: '#8b5a2b', word: 'Brown' },
  slate: { hex: '#475569', word: 'Grey' },
  black: { hex: '#111827', word: 'Black' },
};

/** The colour a mark is drawn in — a person's own when given one, else its kind's. */
export const colourOf = (m: Pick<StandardMark, 'kind' | 'colour'>): string =>
  (m.kind === 'person' && m.colour ? PERSON_COLOURS[m.colour]?.hex : undefined) ?? markOf(m.kind).colour;

/* THE BOARD'S SHAPE — a board drawn with shapes (no photo) is wide, square or
   tall (Rowland, 13 October: "I only have a small surface area to play
   with"). A photo's board is the photo's shape. */
export type BoardShape = 'wide' | 'square' | 'tall';
export const BOARDS: Record<BoardShape, { w: number; h: number; word: string }> = {
  wide: { w: 16, h: 9, word: 'Wide' },
  square: { w: 1, h: 1, word: 'Square' },
  tall: { w: 3, h: 4, word: 'Tall' },
};
export const boardOf = (s: Pick<Standard, 'board'>): BoardShape => s.board ?? 'wide';

/** The marks on a board made another shape: everything stays where it stood —
 *  the width is the same, so the room is added (or taken) below — and only
 *  a mark that would fall off the foot is brought back onto it. */
export function reshaped(marks: readonly StandardMark[], from: BoardShape, to: BoardShape): StandardMark[] {
  const k = (BOARDS[from].h / BOARDS[from].w) / (BOARDS[to].h / BOARDS[to].w);
  if (k === 1) return [...marks];
  const r1 = (v: number) => Math.round(v * 10) / 10;
  return marks.map(m => {
    const h = m.h == null ? undefined : r1(m.h * k);
    const half = isShape(m) && m.shape !== 'arrow' ? (h ?? 0) / 2 : 0;
    const y = r1(Math.min(Math.max(m.y * k, half), 100 - half));
    return { ...m, y, ...(h == null ? {} : { h }) };
  });
}

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
  /** A shape's fill and line (FILLS, LINES) — light and solid when not given. */
  fill?: ShapeFill;
  line?: ShapeLine;
  /** A person's colour (PERSON_COLOURS); blue when not given. */
  colour?: PersonColour;
  /** THE BOTTLENECK, said on the map (Rowland, 13 October: "highlight a
   *  bottleneck ... this area is this person's — the bottleneck"): a person or
   *  an area named the one that holds the line. Said in words on the map and
   *  in Who does what, never by a state colour. */
  bottleneck?: boolean;
  /** WHICH WAY A SHAPE'S WORDS RUN (Rowland, 15 October: "it only goes
   *  across, it doesn't let me go upwards, so I have to squeeze things in").
   *  'up': written up the shape's length, read from the bottom, as on a
   *  drawing; 'across': as typed. Absent: up when the shape is tall and narrow
   *  and a word would not fit across it (`wordsUp`), else across. */
  dir?: WordDir;
}

export type WordDir = 'across' | 'up';
export const WORD_DIRS: { dir: WordDir | undefined; word: string }[] = [
  { dir: undefined, word: 'Auto' }, { dir: 'across', word: 'Across' }, { dir: 'up', word: 'Upwards' },
];
/** A bold letter's width against its size — one estimate, the same on the
 *  screen and the card, so a shape's words turn the same way on both. */
const EM = 0.6;
/** Do a shape's words run up it? As set; or, unset, when it is at least half
 *  as tall again as it is wide and its longest word would not fit across —
 *  "Destaker" in a narrow box broke into "Dest aker". */
export function wordsUp(m: Pick<StandardMark, 'dir' | 'label' | 'shape'>, wPx: number, hPx: number, fontPx: number): boolean {
  if (m.shape === 'arrow' || !m.label?.trim()) return false;
  if (m.dir) return m.dir === 'up';
  if (!(Math.abs(hPx) > Math.abs(wPx) * 1.5)) return false;
  const longest = Math.max(...m.label.split(/\s+/).map(w => w.length));
  return longest * fontPx * EM > Math.abs(wPx) - 12;
}

/** The first paragraph of what was written — the summary a card has room
 *  for; the rest is printed in full on the notes page. */
export function firstPara(text: string): string {
  return text.trim().split(/\n\s*\n/)[0].replace(/\s*\n\s*/g, ' ').trim();
}

export const isShape = (m: Pick<StandardMark, 'kind'>): boolean => m.kind === 'shape';

export interface Standard {
  id: ID;
  /** The job it is attached to — '' when it is on no job: a tool on a line
   *  (LINE_TOOLS.sql). Rowland, 7 October: "not everything belongs to a
   *  project, some things just need doing — it's a tool, but can be attached." */
  projectId: ID;
  /** The line (line study) it belongs to, as a snag does. Absent on a map
   *  made inside a job before line standards could live on a line. */
  workspaceId?: ID;
  /** THE LINE BALANCE for this product — the same document a 6M line's
   *  balance is (lib/capacity): stations, speeds, units, what-ifs. The map
   *  says who stands where; this says where the line is limited. */
  capacity?: Capacity;
  /** The product this map is for, in words. Usually a program's name. */
  product: string;
  /** The program it was picked from, when it was. */
  programId?: ID;
  /** The picture of the line — a photo, or a frame off the filmed walk.
   *  Absent: a plain board, drawn on with shapes. */
  photoKey?: string;
  /** The plain board's shape (STANDARD_BOARD.sql) — wide when not given. */
  board?: BoardShape;
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

/** The bottlenecks said on the map, in words: "Op 2 — packs the trays", "the
 *  Basket station". The first is the summary at the head of Who does what. */
export function bottlenecksOf(s: Pick<Standard, 'marks'>): { id: ID; words: string; person: boolean }[] {
  return s.marks.filter(m => m.bottleneck).map(m => {
    const person = m.kind === 'person';
    const label = (m.label ?? '').trim();
    /* the first paragraph: a long analysis written as what they do (his
       pallet wrapper's, 15 October) is summed up by its head, and printed in
       full on the card's notes */
    const words = person ? `${label || 'A person'}${m.task?.trim() ? ` — ${firstPara(m.task)}` : ''}`
      : label ? `The ${label}` : isShape(m) ? 'An area' : `The ${markOf(m.kind).word.toLowerCase()}`;
    return { id: m.id, person, words };
  });
}

/* NAMES ON THE MAP (Rowland, 13 October: "when I'm putting in a name, it's too
   long, it covers up too much of the map ... the commentary just on the
   right-hand side"). The map carries a person's name short, or their number,
   or nothing; the whole of it and what they do are in Who does what. */
export type LabelMode = 'full' | 'short' | 'number';
export const LABEL_MODES: { mode: LabelMode; word: string }[] = [
  { mode: 'short', word: 'Short' }, { mode: 'full', word: 'Full' }, { mode: 'number', word: 'Numbers' },
];
/** How this device shows names on the map — the screen's chips set it, and
 *  the card prints the same (a crowded board printed with numbers). */
export const LABEL_KEY = 'faultline.ls.labels';
export function labelModeHere(): LabelMode {
  try { const v = localStorage.getItem(LABEL_KEY); return v === 'full' || v === 'number' ? v : 'short'; } catch { return 'short'; }
}
/** A name on the map, short: its first 14 letters, then an ellipsis. */
export const shortLabel = (label: string, max = 14): string => {
  const t = label.trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
};
/** What a mark says on the map, in a mode — a person's number counts them in the order they were numbered. */
export function mapLabel(m: Pick<StandardMark, 'kind' | 'label' | 'id'>, mode: LabelMode, people: readonly Pick<StandardMark, 'id'>[]): string | undefined {
  if (m.kind === 'person' && mode === 'number') { const i = people.findIndex(p => p.id === m.id); return i >= 0 ? String(i + 1) : undefined; }
  const l = m.label?.trim();
  if (!l) return undefined;
  return mode === 'full' ? l : shortLabel(l);
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

/* ===================== WHICH TOOL A PRODUCT IS IN =========================
 * One record per product on a line holds two tools: its map (who stands
 * where — Line standard) and its capacity (where the line is limited — Line
 * capacity). Rowland, 13 October: "in line capacity why do I still see line
 * standard cards in there ... I have said it before". So each tool lists the
 * products it has been used for, never the other's: a product mapped and
 * never worked out for capacity is not in Line capacity, and the other way
 * round. The changeovers SMED sets as a product's standard ride inside
 * `capacity` but are not a capacity worked out. */

/** It has a map: people or kit placed, a picture, or a board shape chosen. */
export const hasMap = (s: Pick<Standard, 'marks' | 'photoKey' | 'board'>): boolean =>
  (s.marks?.length ?? 0) > 0 || !!s.photoKey || !!s.board;

/** Its capacity has been started: stations, what-ifs or a target — or it was
 *  made in Line capacity (an empty capacity) — not only SMED's changeovers. */
export const capacityStarted = (s: Pick<Standard, 'capacity'>): boolean => {
  const c = s.capacity;
  if (!c) return false;
  return c.stations.length > 0 || !!c.whatIfs?.length || c.targetPerMin != null || !c.changeovers?.length;
};

/** In Line capacity's list: its capacity started. A product only named —
 *  neither mapped nor started — is the line standard's, where it was named. */
export const inCapacityTool = (s: Pick<Standard, 'capacity'>): boolean => capacityStarted(s);

/** In Line standard's list. */
export const inMapTool = (s: Pick<Standard, 'marks' | 'photoKey' | 'board' | 'capacity'>): boolean =>
  hasMap(s) || !capacityStarted(s);

/* TAKING ONE TOOL OFF A PRODUCT (Rowland, 13 October: "cant delete a line
   capacity anywhere ... always implement deletes and editing in everything").
   A product's one record holds its map (Line standard) and its capacity (Line
   capacity): deleting one keeps the other — a map deleted kept its capacity
   nowhere before; it went with the record. SMED's agreed changeovers ride in
   the capacity and stay with a product that is kept. Only when the other tool
   has nothing on it does the record go. */
export type ProductTool = 'map' | 'balance';

/** The record after one tool is taken off it — or null: nothing is left, delete it. */
export function afterRemoving(s: Standard, tool: ProductTool): Standard | null {
  if (tool === 'balance') {
    if (!hasMap(s)) return null;
    const co = s.capacity?.changeovers;
    return { ...s, capacity: co?.length ? { stations: [], changeovers: co } : undefined };
  }
  if (!capacityStarted(s)) return null;
  return { ...s, marks: [], photoKey: undefined, board: undefined };
}

/** What a delete does, in words: the question before it, and the line after it. */
export function removingSays(s: Standard, tool: ProductTool): { ask: string; done: string } {
  const kept = afterRemoving(s, tool) != null;
  const name = s.product.trim() || 'this product';
  const what = tool === 'balance' ? 'Line capacity' : 'line standard map';
  const other = tool === 'balance' ? 'line standard map' : 'Line capacity';
  const co = (s.capacity?.changeovers?.length ?? 0) > 0;
  return kept
    ? { ask: `Delete the ${what} for “${name}”? Its ${other} stays${co ? ', and its agreed SMED changeovers' : ''}.`,
        done: `${tool === 'balance' ? 'Line capacity' : 'Map'} for ${name} deleted — its ${other} kept` }
    : { ask: `Delete the ${what} for “${name}”?${co ? ' Its agreed SMED changeovers go with it.' : ''}`,
        done: `${tool === 'balance' ? 'Line capacity' : 'Map'} for ${name} deleted` };
}
