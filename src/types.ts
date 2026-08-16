/* Faultline — the data model. One object matters: the Observation. Every one of
 * the seven quality tools is a *read* over Observation[], never a reshape.
 * Workspaces are the hard isolation boundary; time is epoch-ms; taxonomies are
 * plain strings that grow inline. Kept deliberately small. */

export type ID = string; // crypto.randomUUID()
export type Millis = number; // epoch ms (Date.now())
export type Measure = 'count' | 'time' | 'cost'; // cost = idle-labour £, ranks like time
export type DimensionKey = 'asset' | 'category' | 'subcategory';

/* ============ WORKSPACE — top-level isolation container ============ */
export interface Workspace {
  id: ID;
  /** Who created it (auth user id). Set by sync; local-only rows may lack it. */
  ownerId?: string;
  name: string;
  color: string; // single accent, auto-assigned on create
  createdAt: Millis;
  updatedAt: Millis; // LWW clock for future sync

  // Managed vocabularies. Categories and assets are plain string lists;
  // sub-categories are scoped PER category (each drills to its own Pareto).
  categories: string[]; // WHAT — seeded with lean defaults
  subcategories: Record<string, string[]>; // category → its sub-categories
  assets: string[]; // WHERE — starts empty; the operator adds their machines
  shifts: Shift[]; // optional stratifier; starts empty

  // Idle-labour cost model: crew × wage × on-costs ratio = cost per hour;
  // a downtime event costs (its hours) × that rate — so cost ranks like time.
  // The ratio turns the wage into what a person actually costs the business
  // (employer NI, pension, holiday cover — typically ×1.25–1.4).
  crew?: number; // people on the line
  labourRatePerHour?: number; // £ per person-hour (base wage)
  labourBurden?: number; // on-costs multiplier; unset = 1 (wage only)

  // Sticky capture defaults so a repeat event is one tap (START).
  lastCategory?: string;
  lastAsset?: string;

  // Resume: the full hash the user last stood on in this workspace.
  lastRoute?: string;
  // Device-local recency for the Home sort — deliberately NOT the sync clock,
  // so opening a workspace never gives stale data a fresher LWW stamp.
  lastOpenedAt?: Millis;

  // Running stopwatch survives app close (persisted, debounced).
  activeTimer?: ActiveTimer;

  archived?: boolean;
  schemaVersion: number; // starts at 1 (migration guard)
}

export interface Shift {
  name: string;
  start: string; // "06:00"
  end: string; // "14:00"
}

export interface ActiveTimer {
  category: string;
  subcategory?: string;
  asset: string;
  startedAt: Millis; // elapsed = Date.now() - startedAt on resume
}

/* ============ OBSERVATION — the one row; every lens reads this ============ */
export interface Observation {
  id: ID;
  /** Who captured it — shown to teammates in a shared workspace. */
  ownerId?: string;
  workspaceId: ID; // ISOLATION KEY — every query filters on this

  category: string; // WHAT  (Pareto axis)
  subcategory?: string; // WHAT, level 2 — the category's sub-level (its own Pareto on drill)
  asset: string; // WHERE (primary drill entry point)
  shift?: string; // optional stratifier (reserved)

  startedAt: Millis; // event start = run-chart X, shift bucket
  endedAt?: Millis; // stopwatch stop; absent for instant/typed
  durationMs: number; // 0 = instant/count-only; >0 = timed (Pareto "time", histogram)
  timing: 'stopwatch' | 'typed' | 'instant';

  count: number; // default 1; a batch ("jammed 6×") stays one row
  valueNum?: number; // reserved: scatter Y / measure (P1)
  costPer?: number; // reserved: £ accessor (P1)

  note?: string; // free text; searched, never charted
  media: MediaRef[]; // evidence metadata; blobs live in the `media` store

  createdAt: Millis;
  updatedAt: Millis; // LWW clock
  deletedAt?: Millis; // soft delete — tombstone for future sync
}

/* Lightweight — NO blob. Blob & thumb live in the `media` store by these keys. */
export interface MediaRef {
  id: ID;
  kind: 'photo' | 'video';
  blobKey: string; // key into `media` store
  thumbKey?: string; // key into `media` store (poster)
  mime: string;
  capturedAt: Millis;
}

/* ============ ENGINE VIEW STATE — resumable, mirrors the URL hash ============ */
export interface DrillStep {
  dimension: DimensionKey;
  value: string;
}
export type DrillPath = DrillStep[]; // [{asset,"Brillopack"},{category,"Changeover"}]

export interface WorkstreamView {
  workspaceId: ID;
  measure: Measure; // count | time
  dimensionOrder: DimensionKey[]; // default ['asset','category','reason']
  path: DrillPath; // current drill position
  mode: 'analyse' | 'present';
}

/* ============ CASE — the thin A3: a folder with a number on it ============
 * The product's ONE deliberate addition beyond the original objects (see
 * docs/PRODUCT.md — the coherence rule). A Case is a question, a saved scope
 * (a drill path — the same shape the engine filters by), a baseline and a
 * target. Everything in its A3 boxes DERIVES from data that already exists:
 * current condition = the scoped rows' weekly loss, analysis = the drill,
 * countermeasures = snags carrying this caseId, follow-up = the scoped trend
 * against the target. It stores no chart, no analysis, no copies. */
export interface Case {
  id: ID;
  ownerId?: string;      // who opened it (auth user id) — set by sync
  workspaceId: ID;
  title: string;         // the problem, in the team's words
  path: DrillPath;       // the saved scope — which slice of the data it watches
  note?: string;         // one-line background, optional
  /** Weekly loss when the Case opened (avg of the 4 full weeks before) —
   *  auto-filled from data, never typed. The honest "before". */
  baselineMsWeek: number;
  targetMsWeek?: number; // the promise; unset = "make it better"
  status: 'open' | 'closed';
  openedAt: Millis;
  closedAt?: Millis;
  updatedAt: Millis;     // LWW clock for cloud sync
  deletedAt?: Millis;    // soft delete (tombstone)
}
