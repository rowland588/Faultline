/* THE JOB, RUN ON THIS DEVICE (docs/VIDEO.md, asynchronous processing).
 *
 * One job a study at a time — a lock held for it (navigator.locks, across
 * tabs) — moved through its states on the study's own record, so the page
 * can be left and the job found where it was. Every few frames the signal so
 * far is kept beside the footage, so a reading cut off by a closed tab
 * resumes from its last frame, not the first. A reading of the same footage
 * with the same settings (its key) is never done twice: the finished signal
 * is kept and read again instead. The events it finds are written through
 * lib/video/validate; a person's decisions on earlier events are never
 * overwritten, and a candidate that repeats one a person already accepted is
 * not added again. */
import { deleteBlobs, getBlob, getStudy, patchStudy, putBlob } from '../../db';
import type { ToolStudy } from '../../lib/study';
import { footageGone } from './footage';
import { detectEvents, type Signal } from './detect';
import { fingerprint, readSignal, stillAt } from './extract';
import { move, readingKey } from './job';
import { applyLabels, assistLabeller } from './providers';
import { flagEvents, qualityOf } from './assess';
import type { JobState, VideoEvent, VideoSource } from './record';
import { clock } from './study';
import { checkConfig, keepValid, VIDEO_LIMITS } from './validate';

const running = new Set<string>();

/** Bytes as base64, a block at a time (a whole frame spread into one call is too many arguments). */
function base64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

/** Is this study's footage being read on this device now? */
export const isRunning = (id: string): boolean => running.has(id);

async function setJob(id: string, to: JobState, o: { progress?: number; said?: string; error?: string; retryable?: boolean; key?: string } = {}): Promise<boolean> {
  let ok = true;
  await patchStudy(id, cur => {
    const v = cur.facts.video;
    if (!v) { ok = false; return {}; }
    const next = to === v.job.state ? { ...v.job, progress: o.progress ?? v.job.progress, updatedAt: Date.now(), ...(o.said !== undefined ? { said: o.said } : {}) } : move(v.job, to, { now: Date.now(), ...o });
    if ('error' in next && typeof next.error === 'string' && !('state' in next)) { ok = false; return {}; }
    const job = { ...(next as VideoSource['job']), ...(o.key ? { key: o.key } : {}) };
    return { facts: { ...cur.facts, video: { ...v, job } } };
  });
  return ok;
}

const fail = (id: string, error: string, retryable = true) => setJob(id, 'failed', { error, retryable });

/** Overlap of two spans as a share of their joint span. */
const iou = (a: { start: number; end: number }, b: { start: number; end: number }) => {
  const i = Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
  const u = Math.max(a.end, b.end) - Math.min(a.start, b.start);
  return u > 0 ? i / u : 0;
};

/** Earlier events kept: what a person decided stays; earlier candidates go
 *  when the footage is read again; and the new reading never proposes again
 *  what a person already decided — accepted or rejected — at that station. */
export function mergeReading(existing: readonly VideoEvent[], found: readonly VideoEvent[]): VideoEvent[] {
  const decided = existing.filter(e => e.review !== 'candidate' || e.basis === 'person');
  const ids = new Set(decided.map(e => e.id));
  const fresh = found.filter(e => !ids.has(e.id) && !decided.some(d => d.zone === e.zone && iou(d, e) > 0.5));
  return [...decided, ...fresh].sort((a, b) => a.start - b.start || a.zone.localeCompare(b.zone));
}

/** READ THE FOOTAGE — or carry on reading it. Resolves when the job has
 *  moved as far as it can; its state is on the record whatever happens. */
export async function runJob(id: string, o: { withVision?: boolean; abort?: AbortSignal } = {}): Promise<void> {
  if (running.has(id)) return;
  const locks = typeof navigator !== 'undefined' ? (navigator as Navigator & { locks?: { request: (n: string, o: { ifAvailable: boolean }, f: (l: unknown) => Promise<void>) => Promise<void> } }).locks : undefined;
  const work = async () => {
    running.add(id);
    try { await read(id, o); }
    catch (e) { await fail(id, `The reading stopped: ${e instanceof Error ? e.message : 'an error this device did not explain'}. Try again.`); }
    finally { running.delete(id); }
  };
  if (locks) await locks.request(`fl-video-${id}`, { ifAvailable: true }, async lock => { if (lock) await work(); });
  else await work();
}

async function read(id: string, o: { withVision?: boolean; abort?: AbortSignal }): Promise<void> {
  const s = await getStudy(id);
  const v = s?.facts.video;
  if (!s || !v) return;
  if (footageGone(s.facts)) { await fail(id, 'The footage was deleted from this study, so it cannot be read again. What was found in it is kept.', false); return; }
  const file = await getBlob(v.media.blobKey);
  if (!file) { await fail(id, 'The footage is not on this device — it was taken on another one and has not come down from the cloud yet. Open the study there, or wait for it here.'); return; }
  const config = v.job.config;
  const problems = checkConfig(config, v.facts.durationSec, VIDEO_LIMITS);
  if (problems.length) { await fail(id, problems.map(p => p.message).join(' '), false); return; }

  let key: string;
  try { key = readingKey(v.facts, await fingerprint(file), config); }
  catch { await fail(id, 'The footage could not be read from this device’s storage.'); return; }
  if (v.job.key === key && (v.job.state === 'review' || v.job.state === 'reported')) return;

  /* to the reading, from wherever it was left */
  if (['uploaded', 'failed', 'cancelled', 'review', 'reported'].includes(v.job.state)) await setJob(id, 'queued', { said: 'Waiting to be read' });
  const now = (await getStudy(id))?.facts.video?.job.state;
  if (now === 'queued') await setJob(id, 'extracting', { said: 'Opening the footage', key });

  let sig: Signal | undefined;
  /* a signal kept from before the camera and the light were tracked on every frame is read again, so the footage's quality is never said unchecked */
  const tracked = (x: Signal | undefined) => (x && x.steady && x.bright ? x : undefined);
  const done = await getBlob(`vsig-${key}`);
  if (done) sig = tracked(JSON.parse(await done.text()) as Signal);
  if (!sig) {
    const part = await getBlob(`vsig-part-${key}`);
    const start = part ? tracked(JSON.parse(await part.text()) as Signal) : undefined;
    let lastSave = 0;
    try {
      sig = await readSignal(file, {
        sampleSec: config.sampleSec, readWidth: config.readWidth, zones: config.zones, durationSec: v.facts.durationSec, start, abort: o.abort,
        onChunk: async (so, n, total) => {
          if (Date.now() - lastSave < 800 && n < total) return;
          lastSave = Date.now();
          await putBlob(`vsig-part-${key}`, new Blob([JSON.stringify(so)], { type: 'application/json' }));
          await setJob(id, 'extracting', { progress: n / total, said: `Reading frame ${n} of ${total} (${clock(so.times[so.times.length - 1] ?? 0)})` });
        },
      });
    } catch (e) {
      if ((e as { name?: string }).name === 'AbortError') { await setJob(id, 'cancelled', { said: 'Stopped — it carries on from where it was when it is read again' }); return; }
      await fail(id, e instanceof Error ? e.message : 'The footage could not be read.');
      return;
    }
    await putBlob(`vsig-${key}`, new Blob([JSON.stringify(sig)], { type: 'application/json' }));
    await deleteBlobs([`vsig-part-${key}`]);
  }

  await setJob(id, 'analysing', { said: 'Finding the work at each station' });
  let found = detectEvents(sig, config, { key, idOf: (zone, i) => `${key}-${zone}-${i + 1}` });

  /* NAMED FROM THE FRAMES — only when the person asked, only for the events found, inside the limits */
  let note = '';
  if (o.withVision && found.length) {
    const pick = found.slice(0, VIDEO_LIMITS.maxVisionFrames);
    try {
      const frames = await Promise.all(pick.map(async e => {
        const z = config.zones.find(x => x.id === e.zone);
        const b = await stillAt(file, (e.start + e.end) / 2, { maxWidth: 512, ...(z ? { crop: z } : {}) });
        const data = base64(new Uint8Array(await b.arrayBuffer()));
        return { event: e.id, at: clock((e.start + e.end) / 2), data };
      }));
      const r = await assistLabeller.label({
        objective: v.objective ?? '', frames,
        events: pick.map(e => ({ id: e.id, station: config.zones.find(z => z.id === e.zone)?.label ?? e.zone, track: e.track ?? '', from: clock(e.start), to: clock(e.end) })),
      });
      if (r.ok) { found = applyLabels(found, r.labels, { model: r.model }); note = ` ${r.labels.length} named from the frames.`; }
      else note = ` ${r.why}`;
    } catch { note = ' The frames could not be taken for naming — name the work as you review.'; }
  }

  await setJob(id, 'validating', { said: 'Checking what was found' });
  const { kept, refused } = keepValid(found, { durationSec: v.facts.durationSec, zones: config.zones });
  /* what the reading found about the footage itself — the camera, the light — kept on the study, and every event flagged by it */
  const quality = qualityOf(sig, config.sampleSec);
  await patchStudy(id, cur => {
    const cv = cur.facts.video;
    return { facts: { ...cur.facts, vevents: flagEvents(mergeReading(cur.facts.vevents ?? [], kept), quality), ...(cv && quality ? { video: { ...cv, quality } } : {}) } };
  });
  const zonesWith = new Set(kept.map(e => e.zone)).size;
  const shook = quality && quality.shaking > 0 ? ` The camera shook for ${Math.round(quality.shaking * 100)}% of it — those events are flagged.` : '';
  await setJob(id, 'review', {
    said: `${kept.length} piece${kept.length === 1 ? '' : 's'} of work found at ${zonesWith} of ${config.zones.length} station${config.zones.length === 1 ? '' : 's'}${refused.length ? `; ${refused.length} refused as malformed` : ''}.${shook}${note}`,
  });
}

/** Jobs this device left half-way — a tab closed while reading — taken up again. */
export async function resumeLeftJobs(studies: readonly ToolStudy[]): Promise<void> {
  for (const s of studies) {
    const j = s.facts.video?.job;
    if (j && ['queued', 'extracting', 'analysing', 'validating'].includes(j.state) && !running.has(s.id) && Date.now() - j.updatedAt > 5000) void runJob(s.id);
  }
}
