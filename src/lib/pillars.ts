/* THE 3P BOARD — People / Plant / Process, by area.
 *
 * This is modelled on the workbook's own "3P Board" sheet, because that sheet
 * is the thing being presented and the app should hand back the same picture
 * rather than a nearby one. Its shape: one block per AREA (Line 2, Line 7,
 * Line 10, Cellox, All lines), and inside each block three columns in the
 * order PEOPLE · PLANT · PROCESS.
 *
 * WHY THE APP READS THE TRACKER AND NOT THAT SHEET. The 3P Board says so
 * itself, in its own subtitle: "Live view of Tracker actions grouped by...".
 * It is array formulas pointing back at the Tracker, with helper columns
 * holding the row numbers they came from. It carries only Ref, Action, Owner,
 * Due and Stage — Category, What's happening, Priority, Who and Flag are all
 * left behind, and those are what the Pareto page, the meeting screen and the
 * line packs run on. Reading a formula grid of merged blocks to get less data
 * than the source already offers would be fragile and lossy at once. So the
 * app reads the Tracker — which carries the 3P column — and draws the 3P
 * Board's shape from it. Same picture, nothing lost, nothing else broken.
 *
 * Nothing here is stored. The cards are derived from the latest upload every
 * time the board is drawn, so next week's file simply appears.
 */
import type { PaceAction } from './projectPaceData';

export type PillarKey = 'people' | 'plant' | 'process';

/** In the workbook's own order — People, Plant, Process — because somebody
 *  reading the app beside the sheet should not have to re-find their place. */
export const PILLARS: { key: PillarKey; label: string; blurb: string }[] = [
  { key: 'people',  label: 'People',  blurb: 'who runs it, and whether they can' },
  { key: 'plant',   label: 'Plant',   blurb: 'the machine and everything on it' },
  { key: 'process', label: 'Process', blurb: 'the way of working itself' },
];

/** The words the sheet is allowed to use for each column. Matched on the START
 *  of the cell, so "Plant / equipment" and "People — training" both land. */
const MATCH: [PillarKey, RegExp][] = [
  ['people',  /^(people|person|team|labour|labor|manning|training|skills?)\b/i],
  ['plant',   /^(plant|machine|machinery|equipment|asset|kit|hardware|engineering)\b/i],
  ['process', /^(process|procedure|method|sop|way of working|system|standard)\b/i],
];

/** Which column a row belongs in, or null when the sheet has not said.
 *  Deliberately forgiving about spelling and strict about meaning: a word the
 *  app does not recognise lands NOWHERE and is reported, because guessing would
 *  put a card in a column nobody chose. */
export function pillarOf(a: PaceAction): PillarKey | null {
  const v = (a.pillar ?? '').trim();
  if (!v) return null;
  for (const [key, re] of MATCH) if (re.test(v)) return key;
  return null;
}

/** Areas in the workbook's own reading order: the numbered lines in order,
 *  then any named area (Cellox), then whatever spans everything, last.
 *
 *  The area is the Line cell VERBATIM — "Cellox" has no number in it and would
 *  vanish from anything that matched on digits, and an area the board silently
 *  dropped would be the one nobody notices is missing. */
const areaRank = (name: string): [number, number, string] => {
  const n = name.match(/\d+/)?.[0];
  if (/\ball\b/i.test(name)) return [2, 0, name];       // "All lines" goes last
  if (n) return [0, Number(n), name];                    // Line 2, 7, 10…
  return [1, 0, name];                                   // Cellox and any other name
};

export interface BoardArea {
  name: string;
  columns: { key: PillarKey; label: string; blurb: string; rows: PaceAction[] }[];
  total: number;
  done: number;
}

export interface BoardResult {
  areas: BoardArea[];
  /** Rows the workbook has not placed — no 3P value, or one nobody recognises. */
  unplaced: PaceAction[];
  /** Told apart on purpose: a workbook with no 3P column at all needs the
   *  column adding, while one that has it but left cells blank needs those
   *  cells filling. Two different jobs, two different sentences. */
  hasPillarColumn: boolean;
  total: number;
  done: number;
}

const isDone = (a: PaceAction): boolean => /^(done|complete|completed|closed)$/i.test((a.status ?? '').trim());

/** The whole board: every area, each with its three columns. */
export function board(actions: PaceAction[]): BoardResult {
  const unplaced: PaceAction[] = [];
  const byArea = new Map<string, PaceAction[]>();
  for (const a of actions) {
    if (!pillarOf(a)) { unplaced.push(a); continue; }
    const area = (a.line ?? '').trim() || 'Unassigned';
    byArea.set(area, [...(byArea.get(area) ?? []), a]);
  }

  const areas: BoardArea[] = [...byArea.entries()]
    .sort((x, y) => {
      const [ax, an, at] = areaRank(x[0]), [bx, bn, bt] = areaRank(y[0]);
      return ax - bx || an - bn || at.localeCompare(bt);
    })
    .map(([name, rows]) => ({
      name,
      columns: PILLARS.map(p => ({
        ...p,
        rows: rows.filter(a => pillarOf(a) === p.key)
          .sort((x, y) => (x.priority || 3) - (y.priority || 3)),
      })),
      total: rows.length,
      done: rows.filter(isDone).length,
    }));

  const placed = areas.reduce((n, a) => n + a.total, 0);
  return {
    areas,
    unplaced,
    hasPillarColumn: actions.some(a => (a.pillar ?? '').trim() !== ''),
    total: placed,
    done: areas.reduce((n, a) => n + a.done, 0),
  };
}

/** What a card says. The date stays in the workbook, which is where it gets
 *  changed and therefore where it stays right. */
export const cardTitle = (a: PaceAction): string =>
  (a.action || a.problem || '').trim() || `Action ${a.ref}`;


/* ---------- how the board FITS ----------
 * ONE rule, shared by the on-screen report and the PDF, because two rules is
 * how a four-page PDF ends up stamped "page 2 of 3". It is pure arithmetic on
 * the card COUNTS rather than on measured text, which is what lets both media
 * reach the same answer without one of them running a typesetter.
 *
 * The aim is ONE SHEET. An area is a card and there are only ever a handful of
 * them, so a board that spills onto a second page has failed at the one thing a
 * board is for: being taken in whole, at a glance, across a table. Two things
 * buy the room:
 *
 *   1. A printed card is ONE line of action text, not two. The workbook's
 *      Action cells run to paragraphs — several dated updates in one cell — and
 *      a wall board wants the gist with the detail a tap away in the app.
 *   2. The whole drawing is then scaled to the page, DOWN to fit and UP to
 *      fill. A board that leaves the bottom third of an A3 blank is as wrong as
 *      one that runs off the edge; it just fails more quietly.
 *
 * Only when even the floor scale cannot hold it does it spill, and then it
 * spills whole areas rather than cutting one in half.
 */
export const BOARD_CARD_H = 24;      // one line of action, plus its status row
export const BOARD_CARD_GAP = 5;
export const BOARD_AREA_CHROME = 30; // the area heading plus the column headings
export const BOARD_AREA_GAP = 14;

/** How far the drawing may be squeezed before the type stops being readable
 *  across a table, and how far it may be stretched before the cards stop
 *  looking like cards. */
export const BOARD_MIN_SCALE = 0.74;
export const BOARD_MAX_SCALE = 1.5;

/* THE SHEET, IN ONE UNIT. The PDF draws in points and the report screen draws
 * in pixels, and for a while each worked out its own available height in its
 * own unit — which meant the two could reach different answers about how many
 * sheets the board needs, and the screen would show three pages while the file
 * had two. So the geometry above is in POINTS, both media measure against the
 * same available height, and the screen converts once, here. */
export const BOARD_SHEET_H = 841.89;              // A3 landscape, points
export const BOARD_SHEET_PX_H = 1131;             // the same sheet, on screen
/** What is left for cards after the page margins, the panel head and the foot. */
export const BOARD_AVAIL = BOARD_SHEET_H - 2 * 26 - 14 - 60;
/** One point, in report-screen pixels. */
export const BOARD_PX = BOARD_SHEET_PX_H / BOARD_SHEET_H;

/** How tall one area's block is at scale 1. */
export function areaBlockHeight(counts: number[]): number {
  const tallest = Math.max(...counts, 0);
  return BOARD_AREA_CHROME + (tallest ? tallest * (BOARD_CARD_H + BOARD_CARD_GAP) : 14);
}

/** The unscaled height of a run of areas. */
export const runHeight = (areas: { counts: number[] }[]): number =>
  areas.reduce((t, a) => t + areaBlockHeight(a.counts), 0)
  + Math.max(0, areas.length - 1) * BOARD_AREA_GAP;

/** Down to fit, up to fill — clamped so neither end is silly. */
export const boardScale = (totalH: number, avail: number = BOARD_AVAIL): number =>
  totalH <= 0 ? 1 : Math.min(BOARD_MAX_SCALE, Math.max(BOARD_MIN_SCALE, avail / totalH));

/** Split the areas across sheets, but only when the floor scale cannot hold
 *  them. Both media call this, so both agree on the page count. */
export function boardSheets<T extends { counts: number[] }>(areas: T[], avail: number = BOARD_AVAIL): T[][] {
  if (areas.length === 0) return [];
  const roomAtFloor = avail / BOARD_MIN_SCALE;
  if (runHeight(areas) <= roomAtFloor) return [areas];   // the whole board, one sheet

  const out: T[][] = [];
  let cur: T[] = [];
  for (const a of areas) {
    if (cur.length && runHeight([...cur, a]) > roomAtFloor) { out.push(cur); cur = []; }
    cur.push(a);
  }
  if (cur.length) out.push(cur);
  return out;
}
