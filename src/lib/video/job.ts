/* THE JOB THAT READS THE FOOTAGE — its lifecycle (docs/VIDEO.md,
 * asynchronous processing).
 *
 *   uploaded → queued → extracting → analysing → validating → review → reported
 *                 ↘ failed (retryable or not) · cancelled
 *
 * Kept on the study's record, so a person can leave and come back and find
 * it where it was; resumed from the state it was left in, never started
 * twice for the same footage and settings (the key). Pure: the runner
 * (lib/video/runner) does the reading and writes each move through here. */
import type { JobState, ProcessingConfig, VideoFacts, VideoJob } from './record';

export const STATE_WORD: Record<JobState, string> = {
  uploaded: 'Uploaded', queued: 'Waiting to be read', extracting: 'Reading frames', analysing: 'Finding the work',
  validating: 'Checking what was found', review: 'Ready for review', reported: 'Report made', failed: 'Did not finish', cancelled: 'Stopped',
};

const NEXT: Record<JobState, JobState[]> = {
  uploaded: ['queued', 'cancelled'],
  queued: ['extracting', 'cancelled', 'failed'],
  extracting: ['analysing', 'failed', 'cancelled', 'queued'],
  analysing: ['validating', 'failed', 'cancelled', 'queued'],
  validating: ['review', 'failed', 'queued'],
  review: ['reported', 'queued'],
  reported: ['review', 'reported', 'queued'],
  failed: ['queued'],
  cancelled: ['queued'],
};

export const canMove = (from: JobState, to: JobState): boolean => NEXT[from].includes(to);

/** Move the job, or say why it cannot. */
export function move(j: VideoJob, to: JobState, o: { now: number; progress?: number; said?: string; error?: string; retryable?: boolean } ): VideoJob | { error: string } {
  if (!canMove(j.state, to)) return { error: `It cannot go from “${STATE_WORD[j.state]}” to “${STATE_WORD[to]}”.` };
  const out: VideoJob = { ...j, state: to, progress: o.progress ?? (to === j.state ? j.progress : 0), updatedAt: o.now };
  if (o.said !== undefined) out.said = o.said; else delete out.said;
  if (to === 'failed') { out.error = o.error ?? 'It stopped without saying why.'; out.retryable = o.retryable ?? true; }
  else { delete out.error; delete out.retryable; }
  if (to === 'extracting' && j.state === 'queued') { out.attempts = j.attempts + 1; out.startedAt = out.startedAt ?? o.now; }
  if (to === 'review') out.finishedAt = o.now;
  return out;
}

/** Whether it is reading now — on this device or one that left it mid-way. */
export const working = (s: JobState): boolean => s === 'queued' || s === 'extracting' || s === 'analysing' || s === 'validating';

/** Whether a person may ask it to read again. */
export const canRetry = (j: VideoJob, maxAttempts: number): boolean =>
  (j.state === 'failed' && j.retryable !== false) || j.state === 'cancelled' || (j.state === 'failed' && j.attempts < maxAttempts);

/** A JOB LEFT HALF-WAY — the device closed while it read. Older than this
 *  and still "reading" with nobody holding it, it is taken up again. */
export const STALE_MS = 2 * 60 * 1000;
export const stale = (j: VideoJob, now: number): boolean => working(j.state) && now - j.updatedAt > STALE_MS;

/** THE KEY OF ONE READING — the footage (its size, length and first bytes'
 *  fingerprint) and every setting that changes what is found. The same key
 *  is the same result: it is never read twice. */
export function readingKey(f: Pick<VideoFacts, 'bytes' | 'durationSec' | 'width' | 'height'>, fingerprint: string, c: ProcessingConfig): string {
  const zones = c.zones.map(z => `${z.id}:${[z.x0, z.x1, z.y0, z.y1].map(v => v.toFixed(3)).join(',')}`).join('|');
  return hash([f.bytes, f.durationSec.toFixed(2), f.width, f.height, fingerprint, c.sampleSec, c.readWidth, c.sensitivity, c.joinGapSec, c.minEventSec, c.version, zones].join(';'));
}

/** FNV-1a, 32 bits, as hex — a fingerprint, not a secret. */
export function hash(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

export function newJob(config: ProcessingConfig, now: number): VideoJob {
  return { state: 'uploaded', progress: 0, attempts: 0, config, updatedAt: now };
}
