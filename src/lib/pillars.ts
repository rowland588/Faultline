/* PEOPLE · PROCESS · PLANT — the three columns the board is made of.
 *
 * The tracker gains one column and the board follows from it. Nothing here is
 * stored: the cards are derived from the latest upload every time the board is
 * drawn, exactly as the lever tree's bindings were, so next week's file simply
 * appears and nothing anybody did in the app can be silently overwritten —
 * because there is nothing in the app to overwrite.
 *
 * The matching is deliberately forgiving about spelling and deliberately strict
 * about meaning. "People", "PEOPLE", "people (training)" all land in People; a
 * word the app does not recognise lands NOWHERE, and the board says so. Guessing
 * would put a card in a column somebody did not choose, and a board you cannot
 * trust to be complete is worse than no board.
 */
import type { PaceAction } from './projectPaceData';

export type PillarKey = 'people' | 'process' | 'plant';

export const PILLARS: { key: PillarKey; label: string; blurb: string }[] = [
  { key: 'people',  label: 'People',  blurb: 'who runs it, and whether they can' },
  { key: 'process', label: 'Process', blurb: 'the way of working itself' },
  { key: 'plant',   label: 'Plant',   blurb: 'the machine and everything on it' },
];

/** The words the sheet is allowed to use for each column. Matched on the START
 *  of the cell, so "Plant / equipment" and "People — training" both land. */
const MATCH: [PillarKey, RegExp][] = [
  ['people',  /^(people|person|team|labour|labor|manning|training|skills?)\b/i],
  ['process', /^(process|procedure|method|sop|way of working|system|standard)\b/i],
  ['plant',   /^(plant|machine|machinery|equipment|asset|kit|hardware|engineering)\b/i],
];

/** Which column a row belongs in, or null when the sheet has not said. */
export function pillarOf(a: PaceAction): PillarKey | null {
  const v = (a.pillar ?? '').trim();
  if (!v) return null;
  for (const [key, re] of MATCH) if (re.test(v)) return key;
  return null;
}

/** The board: three columns of rows, in the tracker's own priority order, plus
 *  everything the sheet did not place. The unplaced are returned rather than
 *  dropped — the whole point is that the board and the workbook agree. */
export function board(actions: PaceAction[]): {
  columns: { key: PillarKey; label: string; blurb: string; rows: PaceAction[] }[];
  unplaced: PaceAction[];
  hasPillarColumn: boolean;
} {
  const cols = PILLARS.map(p => ({ ...p, rows: [] as PaceAction[] }));
  const unplaced: PaceAction[] = [];
  for (const a of actions) {
    const k = pillarOf(a);
    const c = k && cols.find(x => x.key === k);
    if (c) c.rows.push(a); else unplaced.push(a);
  }
  for (const c of cols) c.rows.sort((x, y) => (x.priority || 3) - (y.priority || 3));
  return {
    columns: cols,
    unplaced,
    /* Told apart on purpose: a workbook with no Pillar column at all needs the
       column adding, while one that has it but left cells blank needs those
       cells filling. Two different jobs, two different sentences. */
    hasPillarColumn: actions.some(a => (a.pillar ?? '').trim() !== ''),
  };
}

/** What a card says. The date stays in the workbook, which is where it gets
 *  changed and therefore where it stays right. */
export const cardTitle = (a: PaceAction): string =>
  (a.action || a.problem || '').trim() || `Action ${a.ref}`;
