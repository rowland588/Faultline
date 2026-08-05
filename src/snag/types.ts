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
  workspaceId: ID;
  segmentId: ID;
  timestampS: number;        // where in the video it was marked
  name: string;
  code?: string;
  stillKey: string;          // key into the `media` store (the frozen frame)
  createdAt: Millis;
  updatedAt?: Millis;        // LWW clock for cloud sync
}

/** A snag pinned onto an asset's still. x/y are PERCENTAGES (0–100), never
 *  pixels, so a pin stays correct at any size, orientation or zoom. */
export interface Snag {
  id: ID;
  workspaceId: ID;
  assetId: ID;
  xPct: number;
  yPct: number;
  problem: string;
  proposedSolution?: string;
  status: SnagStatus;
  owner?: string;            // assignee name (free text)
  raisedAt: Millis;
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

export const ageDays = (raisedAt: number, ref = Date.now()): number =>
  Math.max(0, Math.floor((ref - raisedAt) / 86_400_000));

export const isStaleOpen = (s: Snag, ref = Date.now()): boolean =>
  s.status !== 'closed' && ageDays(s.raisedAt, ref) > SNAG_STALE_DAYS;
