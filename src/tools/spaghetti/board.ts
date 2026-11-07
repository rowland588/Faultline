/* THE SPAGHETTI DIAGRAM DRAWN ON A BOARD — FC-004 part 3 (knowledge/specs/FC-004-spaghetti-board.md).
 *
 * Rowland, 7 November: "spaghetti diagram would work better if it was similar to line standard — a blank page, draw the line or area
 * out, put people there and click the person to the objects I have on the map, as I do that lines are created." So the board: the
 * line or area drawn as areas, the Line standard's icons (lib: tools/linestandard/standard MARKS), place pins and people placed on it,
 * a scale set by two taps and a length, and a walk tapped — a person, then the places in order, each tap a move.
 *
 * The board is a way of FILLING the several-walkers calculator's boxes (calc/defs/spaghetti-walkers), never a second calculation:
 * `boardInputs` writes each walker's places by name and, when the scale is set, each place's metres east and north on the layout —
 * so every move's length is the straight line between them, said to be that, and a measured metres typed into a walker's box wins.
 * Positions are kept as percent of the board's width and height, as the Line standard keeps them. Pure: the page, the paper and the
 * tests read this. Nothing here reads where anybody went — every tap is a person's. */
import { BOARDS, MARKS, markOf, type BoardShape } from '../linestandard/standard';
import { WALKERS_MAX, STEPS_MAX, keyOf } from './walkers';

export const LAYOUT_MAX = 12;

/** What can be on the board: a person (who walks), a place pin, an area (the line or a store, drawn as a box) or one of the Line standard's icons. */
export type BoardKind = 'person' | 'place' | 'area' | string;

export interface BoardMark {
  id: string;
  kind: BoardKind;
  /** The centre, in percent of the board's width and height (0–100) — as the Line standard keeps its marks. */
  x: number;
  y: number;
  /** An area's size, in percent of the board's width and height. */
  w?: number;
  h?: number;
  label?: string;
}

export interface BoardWalk {
  /** The person walking. */
  person: string;
  /** The places tapped after the person, in order. */
  places: string[];
}

export interface SpagBoard {
  shape: BoardShape;
  marks: BoardMark[];
  /** Two points on the board (percent) and the metres between them. */
  scale?: { a: [number, number]; b: [number, number]; m: number };
  walks: BoardWalk[];
  /** Where it was copied from, when it was ("Walk on this map" from a product's Line standard). */
  from?: { standard: string; product: string };
}

export const emptyBoard = (shape: BoardShape = 'wide'): SpagBoard => ({ shape, marks: [], walks: [] });

/** The board as the record keeps it (a hidden box holding JSON) — anything that is not a board reads as none. */
export function readBoard(raw: unknown): SpagBoard | undefined {
  if (typeof raw !== 'string' || !raw.trim().startsWith('{')) return undefined;
  try {
    const b = JSON.parse(raw) as Partial<SpagBoard>;
    if (!b || !Array.isArray(b.marks)) return undefined;
    const shape: BoardShape = b.shape === 'square' || b.shape === 'tall' ? b.shape : 'wide';
    const marks = b.marks.filter((m): m is BoardMark => !!m && typeof m.id === 'string' && typeof m.x === 'number' && typeof m.y === 'number' && typeof m.kind === 'string');
    const ids = new Set(marks.map(m => m.id));
    const walks = (Array.isArray(b.walks) ? b.walks : []).filter(w => w && ids.has(w.person))
      .map(w => ({ person: w.person, places: (Array.isArray(w.places) ? w.places : []).filter(p => ids.has(p)) }));
    const sc = b.scale;
    const scale = sc && Array.isArray(sc.a) && Array.isArray(sc.b) && typeof sc.m === 'number' && sc.m > 0 ? { a: sc.a, b: sc.b, m: sc.m } as SpagBoard['scale'] : undefined;
    return { shape, marks, walks, ...(scale ? { scale } : {}), ...(b.from ? { from: b.from } : {}) };
  } catch { return undefined; }
}

export const writeBoard = (b: SpagBoard): string => JSON.stringify(b);

/* ------------------------------------------------------------------ the scale */

/** The board's own units: its width is BOARDS[shape].w and its height BOARDS[shape].h, so a unit is the same length across and up. */
export const unitsOf = (shape: BoardShape, p: readonly [number, number]): [number, number] => [(p[0] / 100) * BOARDS[shape].w, (p[1] / 100) * BOARDS[shape].h];

/** Metres in one board unit — undefined until a scale is set. */
export function metresPerUnit(b: Pick<SpagBoard, 'shape' | 'scale'>): number | undefined {
  if (!b.scale) return undefined;
  const [ax, ay] = unitsOf(b.shape, b.scale.a), [bx, by] = unitsOf(b.shape, b.scale.b);
  const d = Math.hypot(bx - ax, by - ay);
  return d > 0 && b.scale.m > 0 ? b.scale.m / d : undefined;
}

/** The whole board in metres, across and up — undefined until a scale is set. */
export function boardMetres(b: Pick<SpagBoard, 'shape' | 'scale'>): { w: number; h: number } | undefined {
  const k = metresPerUnit(b);
  return k ? { w: BOARDS[b.shape].w * k, h: BOARDS[b.shape].h * k } : undefined;
}

/** The straight line between two points on the board, in metres — undefined until a scale is set. */
export function straightMetres(b: Pick<SpagBoard, 'shape' | 'scale'>, p: readonly [number, number], q: readonly [number, number]): number | undefined {
  const k = metresPerUnit(b);
  if (!k) return undefined;
  const [px, py] = unitsOf(b.shape, p), [qx, qy] = unitsOf(b.shape, q);
  return Math.hypot(qx - px, qy - py) * k;
}

/** A point on the board as the layout's metres east of the left edge and north of the foot. */
export function eastNorth(b: Pick<SpagBoard, 'shape' | 'scale'>, p: readonly [number, number]): { x: number; y: number } | undefined {
  const k = metresPerUnit(b);
  if (!k) return undefined;
  const [ux, uy] = unitsOf(b.shape, p);
  return { x: ux * k, y: (BOARDS[b.shape].h - uy) * k };
}

/** The scale in words: "the 16 m between the two marks — 1 m is 1/32 of the board's width". */
export function scaleSaid(b: Pick<SpagBoard, 'shape' | 'scale'>): string | undefined {
  const m = boardMetres(b);
  if (!m || !b.scale) return undefined;
  const r = (x: number) => (x >= 100 ? String(Math.round(x)) : String(Math.round(x * 10) / 10));
  return `Scale set: ${r(b.scale.m)} m between the two marks, so the board is ${r(m.w)} m across and ${r(m.h)} m up. The distances are only as true as the drawing.`;
}

/* ------------------------------------------------------------------ names */

const ICON_KINDS = new Set(MARKS.map(m => m.kind));
export const isIcon = (k: BoardKind): boolean => k !== 'person' && k !== 'place' && k !== 'area' && ICON_KINDS.has(k);
export const kindWord = (k: BoardKind): string => (k === 'place' ? 'Place' : k === 'area' ? 'Area' : k === 'person' ? 'Person' : markOf(k).word);

/** Every mark's name as the calculator reads it: its label, else a name made from its kind and numbered so no two are one place by accident —
 *  the people Operator 1, 2…; a place pin Place 1, 2…; an area Area 1…; an icon its word (Scale, then Scale 2). */
export function namesOf(b: Pick<SpagBoard, 'marks'>): Map<string, string> {
  const out = new Map<string, string>();
  const used = new Set<string>();
  for (const m of b.marks) if (m.label?.trim()) used.add(keyOf(m.label));
  const count = new Map<string, number>();
  for (const m of b.marks) {
    if (m.label?.trim()) { out.set(m.id, m.label.trim()); continue; }
    const base = m.kind === 'person' ? 'Operator' : kindWord(m.kind);
    const numbered = m.kind === 'person' || m.kind === 'place' || m.kind === 'area';
    let n = count.get(base) ?? 0, name = '';
    do { n++; name = numbered || n > 1 ? `${base} ${n}` : base; } while (used.has(keyOf(name)));
    count.set(base, n); used.add(keyOf(name)); out.set(m.id, name);
  }
  return out;
}

/** The area a point stands in — the smallest, when areas overlap. */
export function areaAt(b: Pick<SpagBoard, 'marks'>, x: number, y: number): BoardMark | undefined {
  return b.marks.filter(m => m.kind === 'area' && Math.abs(x - m.x) <= (m.w ?? 0) / 2 && Math.abs(y - m.y) <= (m.h ?? 0) / 2)
    .sort((p, q) => (p.w ?? 0) * (p.h ?? 0) - (q.w ?? 0) * (q.h ?? 0))[0];
}

/** Where a walk starts: the area the person stands in (its centre is the place), else the person's own spot. */
export function startOf(b: Pick<SpagBoard, 'marks'>, person: BoardMark): { id: string; name?: string; x: number; y: number } {
  const a = areaAt(b, person.x, person.y);
  return a ? { id: a.id, x: a.x, y: a.y } : { id: `spot:${person.id}`, x: person.x, y: person.y };
}

export interface BoardPath { person: string; name: string; walker: number; points: { id: string; name: string; x: number; y: number }[] }

/** Each walk as the places it passes, start first, with their names and points — what the board draws and the boxes are filled from.
 *  A place tapped twice in a row is one visit (standing still is not a move); a walk with no place after its start has not walked. */
export function pathsOf(b: SpagBoard): BoardPath[] {
  const names = namesOf(b), byId = new Map(b.marks.map(m => [m.id, m]));
  const out: BoardPath[] = [];
  b.walks.forEach(w => {
    const person = byId.get(w.person);
    if (!person || person.kind !== 'person') return;
    const pname = names.get(person.id) as string;
    const st = startOf(b, person);
    const pts = [{ id: st.id, name: st.id.startsWith('spot:') ? `${pname}’s spot` : names.get(st.id) as string, x: st.x, y: st.y }];
    for (const id of w.places) {
      const m = byId.get(id);
      if (!m || id === person.id) continue;
      if (pts[pts.length - 1].id === id) continue;
      pts.push({ id, name: names.get(id) as string, x: m.x, y: m.y });
    }
    out.push({ person: person.id, name: pname, walker: out.length, points: pts });
  });
  return out.filter(p => p.points.length >= 2).map((p, k) => ({ ...p, walker: k }));
}

/** Can another place be tapped on this person's walk? Said in words when not. */
export function canAdd(b: SpagBoard, person: string): string | undefined {
  const walking = b.walks.filter(w => w.places.length > 0).map(w => w.person);
  if (!walking.includes(person) && walking.length >= WALKERS_MAX) return `Four people are walking already — the diagram holds ${WALKERS_MAX}. Finish with one of them, or take a walk off.`;
  const w = b.walks.find(x => x.person === person);
  if (w && w.places.length >= STEPS_MAX - 1) return `This walk has ${STEPS_MAX} places, the most one walker holds. Start the next round on another person, or take a place off.`;
  return undefined;
}

/** The board with a place added to a person's walk (the walk made when it is the first). */
export function addToWalk(b: SpagBoard, person: string, place: string): SpagBoard {
  const has = b.walks.some(w => w.person === person);
  const walks = has ? b.walks.map(w => (w.person === person ? { ...w, places: [...w.places, place] } : w)) : [...b.walks, { person, places: [place] }];
  return { ...b, walks };
}

/** The board with the last place of a person's walk taken off (the walk gone when it had one). */
export function undoWalk(b: SpagBoard, person: string): SpagBoard {
  return { ...b, walks: b.walks.map(w => (w.person === person ? { ...w, places: w.places.slice(0, -1) } : w)).filter(w => w.places.length > 0) };
}

/** The board with a mark taken off — and every walk it was on: the person's own walk gone, a place left out of the others'. */
export function withoutMark(b: SpagBoard, id: string): SpagBoard {
  return { ...b, marks: b.marks.filter(m => m.id !== id), walks: b.walks.filter(w => w.person !== id).map(w => ({ ...w, places: w.places.filter(p => p !== id) })).filter(w => w.places.length > 0) };
}

/* ------------------------------------------------------------------ the boxes */

const nn = (i: number): string => String(i + 1).padStart(2, '0');
const wid = (k: number): string => `w${k + 1}_label`;
const sid = (k: number, i: number, part: 'name' | 'm'): string => `w${k + 1}_s${nn(i)}_${part}`;
const lid = (i: number, part: 'name' | 'x' | 'y'): string => `l${nn(i)}_${part}`;
const r2 = (x: number): number => Math.round(x * 100) / 100;

/** True when the board has a walk of at least one move — then it fills the walkers' boxes, and its own win over what was typed in them. */
export const boardWalks = (b: SpagBoard | undefined): boolean => !!b && pathsOf(b).length > 0;

/** What the board writes into the calculator's boxes: each walker's label and places by name, and — when the scale is set — each place
 *  walked on the layout (metres east and north), so its moves are the straight lines between them. A walker's metres typed into a box are
 *  kept while the move it is on joins the same two places; every other box the board owns is emptied (null). */
export function boardInputs(b: SpagBoard, current: Record<string, string | number | undefined>): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  const paths = pathsOf(b).slice(0, WALKERS_MAX);
  for (let k = 0; k < WALKERS_MAX; k++) {
    const p = paths[k];
    out[wid(k)] = p ? p.name : null;
    for (let i = 0; i < STEPS_MAX; i++) {
      const pt = p?.points[i];
      out[sid(k, i, 'name')] = pt ? pt.name : null;
      if (i === 0) continue;
      const was = current[sid(k, i, 'm')];
      const same = pt && p && typeof current[sid(k, i, 'name')] === 'string' && keyOf(String(current[sid(k, i, 'name')])) === keyOf(pt.name)
        && typeof current[sid(k, i - 1, 'name')] === 'string' && keyOf(String(current[sid(k, i - 1, 'name')])) === keyOf(p.points[i - 1].name);
      out[sid(k, i, 'm')] = same && was !== undefined && was !== '' ? was : null;
    }
  }
  const placed: { name: string; x: number; y: number }[] = [];
  if (metresPerUnit(b)) {
    const seen = new Set<string>();
    for (const p of paths) for (const pt of p.points) {
      const key = keyOf(pt.name);
      if (seen.has(key)) continue;
      seen.add(key);
      const en = eastNorth(b, [pt.x, pt.y]) as { x: number; y: number };
      placed.push({ name: pt.name, x: r2(en.x), y: r2(en.y) });
    }
  }
  for (let i = 0; i < LAYOUT_MAX; i++) {
    const pl = placed[i];
    out[lid(i, 'name')] = pl ? pl.name : null;
    out[lid(i, 'x')] = pl ? pl.x : null;
    out[lid(i, 'y')] = pl ? pl.y : null;
  }
  return out;
}

/** The areas, in the layout's metres, for the picture — drawn behind the paths, each with its name. */
export function areasInMetres(b: SpagBoard): { x0: number; y0: number; x1: number; y1: number; label: string }[] {
  if (!metresPerUnit(b)) return [];
  const names = namesOf(b);
  return b.marks.filter(m => m.kind === 'area').map(m => {
    const p = eastNorth(b, [m.x - (m.w ?? 0) / 2, m.y + (m.h ?? 0) / 2]) as { x: number; y: number };
    const q = eastNorth(b, [m.x + (m.w ?? 0) / 2, m.y - (m.h ?? 0) / 2]) as { x: number; y: number };
    return { x0: p.x, y0: p.y, x1: q.x, y1: q.y, label: names.get(m.id) as string };
  });
}

/** The Line standard's marks on a new board: people stay people, a rectangle or square an area (its words its name), the icons as they are;
 *  circles, triangles, arrows and words are left off (said by the caller). */
export function fromStandardMarks(marks: readonly { id: string; kind: string; x: number; y: number; w?: number; h?: number; label?: string; shape?: string; task?: string }[]): { marks: BoardMark[]; left: number } {
  const out: BoardMark[] = [];
  let left = 0;
  for (const m of marks) {
    if (m.kind === 'shape') {
      if (m.shape === 'rect' || m.shape === 'square') out.push({ id: m.id, kind: 'area', x: m.x, y: m.y, w: m.w ?? 10, h: m.h ?? 10, ...(m.label?.trim() ? { label: m.label.trim().split('\n')[0] } : {}) });
      else left++;
      continue;
    }
    if (m.kind === 'person') { out.push({ id: m.id, kind: 'person', x: m.x, y: m.y, ...(m.label?.trim() ? { label: m.label.trim() } : {}) }); continue; }
    if (ICON_KINDS.has(m.kind)) out.push({ id: m.id, kind: m.kind, x: m.x, y: m.y, ...(m.label?.trim() ? { label: m.label.trim() } : {}) });
    else left++;
  }
  return { marks: out, left };
}
