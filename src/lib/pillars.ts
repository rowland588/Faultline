/* THE 6M BOARD — a running line's countermeasures, on the six bones, by line.
 *
 * WHAT A CARD IS, BECAUSE GETTING THIS WRONG MAKES EVERY COUNT A LIE. A block
 * on the board is a LINE (or the work spanning every line); the things inside
 * it are ACTIONS, in six lanes — the bones of the fishbone (lib/sixm): People,
 * Machine, Method, Material, Measurement, Environment. "Five lines on the
 * board" and "twenty-eight actions" are different objects, and calling the
 * actions cards is how a board stops being something a person can hold in
 * their head.
 *
 * The lanes are the fishbone's bones on purpose (docs/SIXM.md): an action is a
 * countermeasure to a cause on a bone, so the board and the fishbone sort the
 * same work the same way, and the client reads one picture on the screen and
 * on the paper. It replaced People · Plant · Process, which was three of the
 * six — an action stored with an old word is read across (Plant → Machine,
 * Process → Method), never dropped.
 *
 * Nothing here is stored. Every block and every action on it is derived from
 * the project's actions (lib/actions) each time the board is drawn.
 */
import type { PaceAction } from './tracker';
import { statusOfAction } from './treeBind';
import { SIXM, toSixM, type SixM } from './sixm';

/** A lane on the board — one of the six bones. The old name is kept because
 *  the board, the report and the composers all import it. */
export type PillarKey = SixM;

/** The six, in the fishbone's own order, so the board and the fishbone read
 *  the same way round. */
export const PILLARS: { key: PillarKey; label: string; blurb: string }[] = SIXM;

/** Which lane an action belongs in, or null when nobody has said. The six
 *  keys or their words, and the old 3P words read across (lib/sixm toSixM);
 *  a word nobody recognises lands NOWHERE and is shown as not sorted, because
 *  guessing would put an action on a bone nobody chose. */
export function pillarOf(a: Pick<PaceAction, 'pillar'>): PillarKey | null {
  return toSixM(a.pillar);
}

/** Blocks in reading order: the numbered lines in order, then any named
 *  area (Cellox), then whatever spans everything, last.
 *
 *  The name is the line's VERBATIM — "Cellox" has no number in it and would
 *  vanish from anything that matched on digits, and a block the board silently
 *  dropped would be the one nobody notices is missing. */
const areaRank = (name: string): [number, number, string] => {
  const n = name.match(/\d+/)?.[0];
  if (/\ball\b/i.test(name)) return [2, 0, name];       // "All lines" goes last
  if (n) return [0, Number(n), name];                    // Line 2, 7, 10…
  return [1, 0, name];                                   // Cellox and any other name
};

export interface BoardArea {
  name: string;
  /** All six lanes, in the fishbone's order, even when empty. */
  columns: { key: PillarKey; label: string; blurb: string; rows: PaceAction[] }[];
  total: number;
  done: number;
}

export interface BoardResult {
  areas: BoardArea[];
  /** Actions not yet on a bone — none given, or a word nobody recognises. */
  unplaced: PaceAction[];
  /** Whether any action has been given a bone at all — "sort these" and
   *  "start sorting" are two different sentences. */
  hasPillarColumn: boolean;
  total: number;
  done: number;
}

const isDone = (a: PaceAction): boolean => /^(done|complete|completed|closed)$/i.test((a.status ?? '').trim());

/* THE ORDER A MEETING NEEDS. The board is what the meeting is run off, so the
 * action at the top of a lane has to be the one worth a question: overdue
 * first, then waiting on somebody — the two that need somebody in the room —
 * then the soonest due, and done last because it is the answer rather than
 * the question. The tie-break was the workbook's Priority column, which an
 * action kept in the app does not have: every one said 3, so it sorted
 * nothing. The day it is due does. */
const MEETING_RANK: Record<string, number> = { r: 0, a: 1, w: 2, n: 3, g: 4 };
export const meetingOrder = (x: PaceAction, y: PaceAction): number =>
  (MEETING_RANK[statusOfAction(x)] ?? 2) - (MEETING_RANK[statusOfAction(y)] ?? 2)
  || (x.dueISO ?? '\uffff').localeCompare(y.dueISO ?? '\uffff')
  || (x.priority || 3) - (y.priority || 3);

/** The whole board: every line, each with its six lanes. */
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
      columns: lanes(rows),
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

/** One block's six lanes, each in meeting order. The board screen, the
 *  project page and the report all group by this, so a lane never holds a
 *  different set of actions on one of them. */
export function lanes(rows: PaceAction[]): BoardArea['columns'] {
  return PILLARS.map(p => ({
    ...p,
    rows: rows.filter(a => pillarOf(a) === p.key).sort(meetingOrder),
  }));
}

/** Open actions on each bone, only the bones that have any, in the
 *  fishbone's order — "Machine 3 · Method 1 · People 2" said as data. */
export function openByBone(rows: { pillar?: string; open: boolean; late?: boolean }[]): { key: PillarKey; label: string; open: number; late: number }[] {
  return PILLARS.map(p => {
    const mine = rows.filter(r => r.open && toSixM(r.pillar) === p.key);
    return { key: p.key, label: p.label, open: mine.length, late: mine.filter(r => r.late).length };
  }).filter(x => x.open > 0);
}

/** What an action says on the board. */
export const actionTitle = (a: PaceAction): string =>
  (a.action || a.problem || '').trim() || `Action ${a.ref}`;


/* ---------- how the board FITS ----------
 * ONE rule, shared by the on-screen report and the PDF, because two rules is
 * how a four-page PDF ends up stamped "page 2 of 3". It is pure arithmetic on
 * the action COUNTS rather than on measured text, which is what lets both media
 * reach the same answer without one of them running a typesetter.
 *
 * The aim is ONE SHEET. There are only ever a handful of cards, so a board that
 * spills onto a second page has failed at the one thing a board is for: being
 * taken in whole, at a glance, across a table. Two things buy the room:
 *
 *   1. A printed action is ONE line of text, not two. An action's words can
 *      run to a paragraph, and a wall board wants the gist with the detail a
 *      tap away in the app.
 *   2. The whole drawing is then scaled to the page, DOWN to fit and UP to
 *      fill. A board that leaves the bottom third of an A3 blank is as wrong as
 *      one that runs off the edge; it just fails more quietly.
 *
 * Only when even the floor scale cannot hold it does it spill, and then it
 * spills whole lines rather than cutting one in half.
 */
export const BOARD_ACT_H = 24;      // one line of action, plus its status row
export const BOARD_ACT_GAP = 5;
export const BOARD_AREA_CHROME = 30; // the area heading plus the column headings
export const BOARD_AREA_GAP = 14;

/** How far the drawing may be squeezed before the type stops being readable
 *  across a table, and how far it may be stretched before the board stops
 *  looking like a board. */
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
/** What is left for the cards after the page margins, the panel head and the foot. */
export const BOARD_AVAIL = BOARD_SHEET_H - 2 * 26 - 14 - 60;
/** One point, in report-screen pixels. */
export const BOARD_PX = BOARD_SHEET_PX_H / BOARD_SHEET_H;

/** How tall one area's block is at scale 1. */
export function areaBlockHeight(counts: number[]): number {
  const tallest = Math.max(...counts, 0);
  return BOARD_AREA_CHROME + (tallest ? tallest * (BOARD_ACT_H + BOARD_ACT_GAP) : 14);
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

/** What the board is called on a job. "6M" is a method's name: on a lever
 *  tree job the board is where the tree's work is written, and the job is not
 *  a 6M job. The report's screen sheet and its PDF call it the same thing. */
export function boardName(method?: string): string {
  return method === 'Lever tree' ? 'Board' : '6M Board';
}
