/* THE ROW SHAPES THIS DATABASE STORES.
 *
 * Separated from core.ts because the schema in core needs every one of them and
 * the feature modules need them too — keeping them here is what stops that being
 * a cycle. Types only: nothing in this file runs.
 */
import type { ID, MediaRef } from '../types';
import type { WinProof } from '../lib/measureProof';
import type { TrackerBind } from '../lib/treeBind';

export interface PaceTodoRow {
  id: string;
  /** Which project's list this is on. Absent on rows written before projects
   *  became plural — those read as the default project's. */
  projectId?: string;
  /** Which LINE it belongs to, when it belongs to one. Absent means it is the
   *  project's own — something spanning every line, or something logged before
   *  lines had their own packs. The project sees both; a line sees only its. */
  lineId?: string;
  what: string; where: string; why: string; who: string; when: string;
  state: 'todo' | 'waiting' | 'done';
  /** What happened. What/Where/Why/Who/When are all set BEFORE the thing is
   *  done; this is the write-up afterwards — the run, the numbers, the verdict.
   *  It is what makes a Next step able to hold a trial rather than only name
   *  one, so trials live here rather than in a tab of their own. */
  notes?: string;
  /** The verdict, written when the line is marked Done — did the trial work,
   *  did the quote land, what did we conclude. Separate from `notes`, which is
   *  the running write-up: this is the one line you read out in the meeting. */
  outcome?: string;
  /** Pictures and video of the thing being discussed — opened full screen.
   *  Same MediaRef shape observations use, so the thumbnail, the viewer and the
   *  blob sync are all the existing ones. */
  media?: MediaRef[];
  createdAt: number; updatedAt: number;
}

/** One win worth showing the team. `title` is what worked, `story` the
 *  commentary of what was actually done, `impact` the number that proves it
 *  ("44 → 49 ppm"), `who` the credit — a named person, because morale is the
 *  point. All free text; a win is a story, not a form. */
export interface PaceWinRow {
  id: string;
  title: string; story: string; where: string; who: string; impact: string;
  /** The measured claim, frozen at the moment somebody called it: which line's
   *  weeks, both means, both counts, and the significance. A win without one is
   *  a story — which is allowed, and is what `impact` is for — but a win WITH
   *  one is a receipt, and the report prints the receipt over the story. */
  proof?: WinProof;
  /** Which project's success log this is in — see PaceTodoRow. */
  projectId?: string;
  /** Which line's win it is — see PaceTodoRow.lineId. */
  lineId?: string;
  createdAt: number; updatedAt: number;
}

/** One production line inside a project: who runs it, who sponsors it, and where
 *  its own work is kept.
 *
 *  IT HOLDS NO NUMBERS. It used to carry `q1..q4` and a weekly array of packs per
 *  minute, which described one factory's spreadsheet and nobody else's. The
 *  numbers live in `targets` and `readings` now, against measures the business
 *  names itself — see lib/measures.ts.
 *
 *  This started as Project Pace's four fixed lines and grew into the general
 *  case — any project, any number of lines, each with people against it. The
 *  store is still called pace_ppm because the rows in it are the same rows: a
 *  rename would have meant a migration for no gain. */
export interface PaceLineRow {
  /** Sync identity. `key` ('2A') stays the human one. */
  id: string;
  key: string; name: string; variant?: string;

  /** The project this line belongs to. Absent on rows written before projects
   *  became plural — those are adopted by the default project on first load. */
  projectId?: string;

  /** The people. Names are what gets printed; the emails are what lets the same
   *  person be invited into the project and see it on their own device. */
  owner?: string; ownerEmail?: string;       // runs the line day to day
  sponsor?: string; sponsorEmail?: string;   // carries it at the top table

  /** This line's own workspace — its snag walk, its captures, its reports.
   *  Created on first use, never on first view. */
  workspaceId?: string;

  /** Display order within the project. Lines are added and reordered by hand,
   *  so the order is data, not the order they happened to be created in. */
  sort?: number;
  updatedAt: number;
  deletedAt?: number;
}

/** A parsed tracker upload, stored whole. */
export interface PaceSnapshotRow {
  id: string; takenAt: number; fileName: string;
  /** Which project this tracker was uploaded against — see PaceTodoRow. */
  projectId?: string;
  actions: unknown[];
  roster?: unknown;
  /** The Pareto sheet as this upload had it — see PaceParetoSheet. Optional
   *  because most trackers carry no Pareto, and because snapshots taken before
   *  the app read one simply have not got it. */
  pareto?: unknown;
}

/** kind:id of a hard-deleted row, so a delete reaches the cloud on next sync. */
export interface Tombstone { id: string; kind: SyncKind; deletedAt: number }
export type SyncKind = 'workspaces' | 'observations' | 'segments' | 'snag_assets' | 'snags' | 'cases' | 'projects' | 'project_targets' | 'project_actuals'
  | 'pace_ppm' | 'pace_todos' | 'pace_snapshots' | 'pace_wins' | 'tree_nodes'
  | 'commission_assets' | 'tests' | 'test_items' | 'targets' | 'readings' | 'materials' | 'programs';

/* WHERE A BOX HAS GOT TO. Five states, not four colours.
 *
 * It began as red/amber/green plus "no colour set", which is a traffic light,
 * not a status: four anonymous swatches told you a box was orange without ever
 * telling you whether that meant started, slipping, or stuck. A project is
 * steered on where something has GOT TO, so the states say that, and each one
 * carries its name on the box rather than only a tint — which is also the only
 * way it survives being printed or read by somebody who cannot separate red
 * from green.
 *
 * The stored letters stay as they were, so nothing already typed in is
 * disturbed: 'n' was "no colour" and is now "Not started", which is what an
 * uncoloured box always meant in practice. */
export type NodeStatus =
  | 'n'   // not started
  | 'w'   // in progress — working
  | 'a'   // at risk
  | 'r'   // blocked / off track
  | 'g';  // done

/** @deprecated the old traffic-light name — kept so nothing breaks mid-rename */
export type Rag = NodeStatus;

export interface TreeNodeRow {
  id: ID;
  projectId: string;
  /** Absent on the root — the desired outcome. Everything else hangs off one. */
  parentId?: ID;
  text: string;
  /** Column stays `rag` — renaming it would need a migration and buys nothing. */
  rag: NodeStatus;
  /** Order among siblings. Data, not insertion order: the tree gets rearranged. */
  sort: number;
  /** When set, the work under this box is DERIVED from the weekly tracker
   *  rather than typed: which line, which categories, optionally a word. The
   *  binding never shows on the tree — the box keeps the words its author
   *  wrote. See lib/treeBind.ts. */
  bind?: TrackerBind;
  createdAt: number; updatedAt: number; deletedAt?: number;
}
