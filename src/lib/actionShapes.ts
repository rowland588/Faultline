/* THE SHAPES THE BOARD, THE MEETING AND THE CLIENT REPORT DRAW FROM.
 *
 * Types only — nothing in this file runs, and nothing in it is anybody's data.
 *
 * These began as the columns of a weekly tracker workbook that was uploaded.
 * Nothing is uploaded now: an action is a next step kept in the app (see
 * lib/actions.ts), a Pareto is worked out from the timed stops (lib/paretoFromLog)
 * and the people in the meeting are the people on the actions. The shapes stay
 * because every screen that draws a board already reads them.
 */

export interface PaceAction {
  /** A stable id from an ID/UID column, when the sheet has one. Unlike Ref
   *  (a formula off ROW()) this survives inserts, sorting and row reuse. */
  uid?: string;
  ref: string;
  priority: number;
  line: string;
  category: string;
  problem?: string;
  action?: string;
  who?: string;
  owner?: string;
  due?: string;
  status: string;
  flag: string;
  /** The bone it sits on — People, Machine, Method, Material, Measurement or
   *  Environment (lib/sixm), as its word. Absent when nobody has said yet,
   *  which the board says out loud rather than quietly dropping the row. */
  pillar?: string;
  /** The line it belongs to, by id, when it came from a next step (see
   *  lib/actions.ts). Absent on an action spanning every line. */
  lineId?: string;
  /** Its line's key ('2A', '7'), or '' for work on every line — set on an
   *  action kept in the app, so the lever tree matches 2A and 2B apart rather
   *  than by the digits a workbook's "Line 2" needed. */
  lineKey?: string;
  /** The Case it was raised for, when it was (see lib/actions). */
  caseId?: string;
  /** The cause on the fishbone it is the countermeasure for —
   *  "<caseId>:<causeId>" (docs/SIXM.md). Absent: a just-do-it action. */
  causeRef?: string;
  /** What it should change, said before it is done — its prediction. */
  expect?: string;
  /** The day it is due, YYYY-MM-DD — `due` is that day as words. What the
   *  board sorts by and "due soon" is judged from. */
  dueISO?: string;
  /** The day it was marked done, YYYY-MM-DD — what the proof reads the line's
   *  numbers either side of (PaceTodoRow.doneOn). */
  doneOn?: string;
}

/** One row of a Pareto: where the time went, ranked. */
export interface PaceParetoRow {
  category: string;
  mins: number;
  events: number;
  minPerEvent: number;
  /** Long-stop, Frequency or Mixed — the sheet's own call, not the app's. */
  profile: string;
  /** Minutes per measured line, keyed as the sheet heads them (L2, L7, L10). */
  byLine: Record<string, number>;
}

export interface PaceParetoSheet {
  rows: PaceParetoRow[];
  totalMins: number;
  totalStops: number;
  /** "14 Jul – 6 Aug 2026", straight off the sheet's own subtitle. */
  period?: string;
  /** The sheet's own headline sentence, kept verbatim rather than rewritten. */
  headline?: string;
}

/** The dropdown lists the workbook drives itself from. The owner column is the
 *  roster the meeting is run through, and it INCLUDES people with no actions
 *  this week — "nothing from you" is a real answer at a stand-up, and it can
 *  only be given if the person is on screen to be asked. */
export interface PaceRoster {
  owners: string[];
  statuses: string[];
  categories: string[];
  lines: string[];
  departments: string[];
}
