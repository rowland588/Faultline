/* Finder — the data model. One object matters: the Observation. Every one of
 * the seven quality tools is a *read* over Observation[], never a reshape.
 * Workspaces are the hard isolation boundary; time is epoch-ms; taxonomies are
 * plain strings that grow inline. Kept deliberately small. */

export type ID = string; // crypto.randomUUID()
export type Millis = number; // epoch ms (Date.now())
export type Measure = 'count' | 'time'; // 'cost' is a P1 seam
export type DimensionKey = 'asset' | 'category' | 'reason' | 'shift';

/* ============ WORKSPACE — top-level isolation container ============ */
export interface Workspace {
  id: ID;
  name: string;
  color: string; // single accent, auto-assigned on create
  createdAt: Millis;
  updatedAt: Millis; // LWW clock for future sync

  // Managed vocabularies (WHAT / WHERE / WHY / shift). Plain strings; grow inline.
  categories: string[]; // seeded with lean defaults
  assets: string[]; // starts empty; the operator adds their machines
  reasons: string[]; // starts empty; optional 3rd drill level
  shifts: Shift[]; // optional stratifier; starts empty

  // Sticky capture defaults so a repeat event is one tap (START).
  lastCategory?: string;
  lastAsset?: string;

  // Resume: the full hash the user last stood on in this workspace.
  lastRoute?: string;

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
  asset: string;
  startedAt: Millis; // elapsed = Date.now() - startedAt on resume
}

/* ============ OBSERVATION — the one row; every lens reads this ============ */
export interface Observation {
  id: ID;
  workspaceId: ID; // ISOLATION KEY — every query filters on this

  category: string; // WHAT  (Pareto axis, fishbone spine, stratify)
  asset: string; // WHERE (primary drill entry point)
  reason?: string; // WHY   (optional; deepest drill / fishbone leaf)
  shift?: string; // optional stratifier (which shift saw it)

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
