/* THE SHAPES A WEEKLY TRACKER WORKBOOK ARRIVES IN.
 *
 * Types only — nothing in this file runs, and nothing in it is anybody's data.
 *
 * It used to be `projectPaceData.ts`, and it held one factory's tracker
 * compiled into the bundle: 28 real actions with real people's names against
 * them, a Pareto of that factory's stop reasons, its roster, its four lines and
 * the exact Monday its weeks were counted from. Every copy of the app shipped
 * with it, and every new project inherited it as a "baseline" until somebody
 * uploaded over the top.
 *
 * That was fine while the app was one person's page and wrong the moment it was
 * a product. A project with no upload now shows nothing, and says so — which is
 * the truth, and is also the only answer that is right for a business whose
 * tracker this never was.
 *
 * The workbook itself is still the system of record: lib/paceWorkbook.ts reads
 * one by column heading and produces these. */

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
  /** People / Process / Plant — the column this row sits in on the board.
   *  Read from a "Pillar" (or "PPP") column on the tracker sheet. Absent on a
   *  workbook that has not added the column yet, which the board says out loud
   *  rather than quietly dropping the row. */
  pillar?: string;
}

/** One row of a Pareto sheet: where the time went, ranked. */
export interface ParetoRow {
  category: string;
  mins: number;
  events: number;
  minPerEvent: number;
  profile: string;
  l2: number; l7: number; l10: number;
}

/** The workbook's own Lists sheet — the roster a meeting is run through, plus
 *  the vocabulary its dropdowns use. Includes people with nothing open. */
export interface PaceRosterData {
  owners: string[];
  statuses: string[];
  categories: string[];
  lines: string[];
  departments: string[];
}
