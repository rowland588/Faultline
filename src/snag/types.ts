/* SNAG LIST — a video-driven fault walk, layered on the workspace model.
 *
 * The WORKSPACE is the line. A snag walk is one or more video SEGMENTS filmed
 * infeed→outfeed; scrubbing the footage you mark ASSETS (each freezes an exact
 * frame as a still); on a still you pin SNAGS — observed problems with a
 * lifecycle (open → in_progress → closed). All device-local: video, stills and
 * detail photos are blobs in the shared `media` store, referenced by key.
 *
 * Separate from the Observation/Pareto model — the only (optional) tie is a
 * snag's `linkedObsIds`, pointing at observations in the SAME workspace. */
import type { ID, Millis } from '../types';

export type SnagStatus = 'open' | 'in_progress' | 'closed';

/** One video segment of the walk. `sequence` gives flow order along the line. */
export interface Segment {
  id: ID;
  ownerId?: string; // who captured it (auth user id) — set by sync
  workspaceId: ID;
  sequence: number;          // 1, 2, 3… walk order
  name?: string;
  videoKey: string;          // key into the `media` store
  posterKey?: string;        // key into the `media` store (first-frame thumbnail)
  durationS?: number;
  createdAt: Millis;
  updatedAt?: Millis;        // LWW clock for cloud sync
}

/** An asset — created ONLY by marking a frame in a segment. No catalogue. */
export interface SnagAsset {
  id: ID;
  ownerId?: string; // who captured it (auth user id) — set by sync
  workspaceId: ID;
  segmentId: ID;
  timestampS: number;        // where in the video it was marked
  name: string;
  code?: string;
  stillKey: string;          // key into the `media` store (the frozen frame)
  createdAt: Millis;
  updatedAt?: Millis;        // LWW clock for cloud sync
}

/** A snag pinned onto an asset's still — OR an action raised straight from the
 *  Pareto board. A pinned snag has assetId + x/y (PERCENTAGES 0–100, never
 *  pixels, so a pin stays correct at any size). A board action has none of
 *  those; instead it carries the drill target it came from (category / kind /
 *  operational asset name). Both share the same lifecycle, owners, snag list,
 *  report and trend flags — one action system, two ways in. */
export interface Snag {
  id: ID;
  ownerId?: string; // who captured it (auth user id) — set by sync
  workspaceId: ID;
  assetId?: ID;              // absent → board action (no pin)
  xPct?: number;
  yPct?: number;
  targetCategory?: string;   // board actions: where the Pareto pointed
  targetSubcategory?: string;
  targetAsset?: string;      // operational asset NAME (observation vocabulary)
  caseId?: ID;               // the Case (A3) this action belongs to, if any
  problem: string;
  proposedSolution?: string;
  status: SnagStatus;
  owner?: string;            // assignee name (free text)
  raisedAt: Millis;
  dueAt?: Millis;            // the promise — local midnight of the agreed day
  latestUpdate?: string;     // one line of "what's happening with this?"
  latestUpdateAt?: Millis;   // when that line was written
  closedAt?: Millis;
  closeNote?: string;
  detailPhotoKey?: string;   // key into the `media` store (close-up of the fault)
  linkedObsIds?: ID[];       // optional Pareto link → Observation ids (same workspace)
  updatedAt: Millis;
  deletedAt?: Millis;        // soft delete (tombstone), mirrors Observation
}

export const SNAG_STALE_DAYS = 30;

export const SNAG_STATUS_META: Record<SnagStatus, { label: string; color: string }> = {
  open:        { label: 'Open',        color: 'var(--danger)' },
  in_progress: { label: 'In progress', color: 'var(--warn)' },
  closed:      { label: 'Closed',      color: 'var(--ok)' },
};

/** "Changeover · Size change · Filler" — where the board pointed when this
 *  action was raised. Empty string for pinned snags. */
export const actionTarget = (s: Snag): string =>
  [s.targetCategory, s.targetSubcategory, s.targetAsset].filter(Boolean).join(' · ');

export const ageDays = (raisedAt: number, ref = Date.now()): number =>
  Math.max(0, Math.floor((ref - raisedAt) / 86_400_000));

export const isStaleOpen = (s: Snag, ref = Date.now()): boolean =>
  s.status !== 'closed' && ageDays(s.raisedAt, ref) > SNAG_STALE_DAYS;

/* ---------- due dates (the promise) ---------- */

export const DUE_SOON_DAYS = 7;

const DAY = 86_400_000;
const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/** Calendar days until due: 0 = due today, negative = overdue by that many. */
export const dueInDays = (s: Snag, ref = Date.now()): number | null =>
  s.dueAt == null ? null : Math.round((startOfDay(s.dueAt) - startOfDay(ref)) / DAY);

export const isOverdue = (s: Snag, ref = Date.now()): boolean => {
  if (s.status === 'closed') return false;
  const d = dueInDays(s, ref);
  return d != null && d < 0;
};

export const isDueSoon = (s: Snag, ref = Date.now()): boolean => {
  if (s.status === 'closed') return false;
  const d = dueInDays(s, ref);
  return d != null && d >= 0 && d <= DUE_SOON_DAYS;
};

/** Closed against its promise: 0 or less = on time, positive = days late.
 *  Null when there was no due date (or it's not closed) — no promise, no verdict. */
export const closedDaysLate = (s: Snag): number | null =>
  s.status === 'closed' && s.closedAt != null && s.dueAt != null
    ? Math.round((startOfDay(s.closedAt) - startOfDay(s.dueAt)) / DAY)
    : null;

/** Review order — the Monday-meeting sort. Overdue leads, then dated work by
 *  urgency, then undated open work, closed last. Ties keep the caller's order
 *  (sort is stable), so walk order survives within each band. */
export const reviewRank = (s: Snag, ref = Date.now()): number => {
  if (s.status === 'closed') return 3;
  const d = dueInDays(s, ref);
  if (d == null) return 2;
  return d < 0 ? 0 : 1;
};
export const compareReview = (a: Snag, b: Snag, ref = Date.now()): number => {
  const r = reviewRank(a, ref) - reviewRank(b, ref);
  if (r !== 0) return r;
  const da = dueInDays(a, ref), db = dueInDays(b, ref);
  if (da != null && db != null && da !== db) return da - db;
  return 0;
};

/** dueAt <-> <input type="date"> value. Always LOCAL midnight — never
 *  new Date('YYYY-MM-DD'), which parses as UTC and shifts the day. */
export const dueToInput = (ms?: Millis): string => {
  if (ms == null) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const dueFromInput = (v: string): Millis | undefined => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v.trim());
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
};
