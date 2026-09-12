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


/* ---------- how the board paginates ----------
 * ONE rule, shared by the on-screen report and the PDF, because two rules is
 * how a four-page PDF ends up stamped "page 2 of 3". It is pure arithmetic on
 * the card COUNTS rather than on measured text, which is what lets both media
 * reach the same answer without one of them running a typesetter.
 *
 * The cost is that every printed card is the same height whether its text runs
 * to one line or two. That is a price worth paying: a board of uniform cards
 * reads better across a table anyway, and a page number that is always right
 * is worth more than a few millimetres of paper. */
export const BOARD_CARD_H = 42;      // one card, at its fixed printed height
export const BOARD_CARD_GAP = 5;
export const BOARD_AREA_CHROME = 30; // the area heading plus the column headings
export const BOARD_AREA_GAP = 14;

/** How tall one area's block prints. */
export function areaBlockHeight(counts: number[]): number {
  const tallest = Math.max(...counts, 0);
  return BOARD_AREA_CHROME + (tallest ? tallest * (BOARD_CARD_H + BOARD_CARD_GAP) : 14);
}

/** Split the areas across sheets of `avail` height. Both media call this. */
export function boardSheets<T extends { counts: number[] }>(areas: T[], avail: number): T[][] {
  const out: T[][] = [];
  let cur: T[] = [], y = 0;
  for (const a of areas) {
    const h = areaBlockHeight(a.counts);
    if (cur.length && y + h > avail) { out.push(cur); cur = []; y = 0; }
    cur.push(a); y += h + BOARD_AREA_GAP;
  }
  if (cur.length) out.push(cur);
  return out;
}
