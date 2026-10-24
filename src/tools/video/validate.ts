/* WHAT A VIDEO STUDY ACCEPTS — the footage, and every event written into it
 * (docs/VIDEO.md, ingestion and analysis). Pure: the browser reads the file
 * (lib/video/ingest) and hands its facts here; whatever proposes an event —
 * the movement reading, the assistant, a person — hands it here before it is
 * kept. A malformed event is refused in words, never quietly repaired. */
import { EVENT_CATEGORIES, type ProcessingConfig, type VideoEvent, type VideoFacts, type VideoZone } from './record';

/** The limits, in one place — each one a sentence a person reads when it bites. */
export interface VideoLimits {
  /** Largest file taken in, bytes. The cloud's own limit (50 MB) is separate: a larger file stays on the device it came from, said so. */
  maxBytes: number;
  maxDurationSec: number;
  minDurationSec: number;
  maxWidth: number;
  maxHeight: number;
  maxFps: number;
  /** Most frames compared for movement in one reading. */
  maxSamples: number;
  /** Most frames sent to the assistant in one reading, and its cost ceiling in pence. */
  maxVisionFrames: number;
  maxVisionPence: number;
  /** How many times a failed reading is tried again on its own before a person is asked. */
  maxAttempts: number;
}

export const VIDEO_LIMITS: VideoLimits = {
  maxBytes: 500 * 1024 * 1024,
  maxDurationSec: 20 * 60,
  minDurationSec: 2,
  maxWidth: 3840,
  maxHeight: 3840,
  maxFps: 240,
  maxSamples: 2400,
  maxVisionFrames: 24,
  maxVisionPence: 50,
  maxAttempts: 3,
};

/** The containers a browser can read and seek: MP4/QuickTime and WebM. */
export const VIDEO_MIMES = ['video/mp4', 'video/quicktime', 'video/webm'] as const;

export interface Problem { field: string; message: string }

const mb = (n: number) => `${Math.round(n / (1024 * 1024))} MB`;
const mins = (s: number) => (s >= 120 ? `${Math.round(s / 60)} minutes` : `${Math.round(s)} seconds`);

/** The footage, checked: what it is (from its bytes), how long, how big. */
export function checkFootage(f: Partial<VideoFacts>, l: VideoLimits = VIDEO_LIMITS): Problem[] {
  const out: Problem[] = [];
  if (!f.mime || !(VIDEO_MIMES as readonly string[]).includes(f.mime)) {
    out.push({ field: 'mime', message: f.mime ? `This file is ${f.mime}, not a video the app can read — an MP4, MOV or WebM is.` : 'This file is not a video the app can read — its first bytes are not an MP4, MOV or WebM, whatever its name says.' });
  }
  if (f.bytes !== undefined && f.bytes > l.maxBytes) out.push({ field: 'bytes', message: `It is ${mb(f.bytes)}; the most a study takes is ${mb(l.maxBytes)}. Trim it to the part to study.` });
  if (f.bytes !== undefined && f.bytes === 0) out.push({ field: 'bytes', message: 'The file is empty — the upload did not finish.' });
  if (f.durationSec !== undefined) {
    if (!(f.durationSec > 0)) out.push({ field: 'durationSec', message: 'Its length cannot be read — the file may be cut short or damaged.' });
    else if (f.durationSec < l.minDurationSec) out.push({ field: 'durationSec', message: `It is ${f.durationSec.toFixed(1)} seconds — too short to see a cycle in.` });
    else if (f.durationSec > l.maxDurationSec) out.push({ field: 'durationSec', message: `It runs ${mins(f.durationSec)}; a study takes up to ${mins(l.maxDurationSec)}. Trim it to a few cycles.` });
  }
  if (f.width !== undefined && f.height !== undefined) {
    if (!(f.width > 0 && f.height > 0)) out.push({ field: 'width', message: 'No picture can be read from it — it may hold sound only, or be damaged.' });
    else if (f.width > l.maxWidth || f.height > l.maxHeight) out.push({ field: 'width', message: `It is ${f.width}×${f.height}; the largest a study reads is ${l.maxWidth}×${l.maxHeight}.` });
  }
  if (f.fps !== undefined && f.fps > l.maxFps) out.push({ field: 'fps', message: `It runs at ${Math.round(f.fps)} frames a second; a study reads up to ${l.maxFps}.` });
  return out;
}

/** The settings, checked before a reading starts. */
export function checkConfig(c: ProcessingConfig, durationSec: number, l: VideoLimits = VIDEO_LIMITS): Problem[] {
  const out: Problem[] = [];
  if (!(c.sampleSec > 0)) out.push({ field: 'sampleSec', message: 'The time between frames must be more than nothing.' });
  else if (durationSec / c.sampleSec > l.maxSamples) out.push({ field: 'sampleSec', message: `Reading a frame every ${c.sampleSec} s is ${Math.ceil(durationSec / c.sampleSec)} frames; the most is ${l.maxSamples}.` });
  if (!c.zones.length) out.push({ field: 'zones', message: 'Mark at least one station in view.' });
  for (const z of c.zones) out.push(...checkZone(z));
  const ids = new Set<string>();
  for (const z of c.zones) { if (ids.has(z.id)) out.push({ field: 'zones', message: `Two stations share the id ${z.id}.` }); ids.add(z.id); }
  return out;
}

function checkZone(z: VideoZone): Problem[] {
  const out: Problem[] = [];
  const inUnit = (v: number) => Number.isFinite(v) && v >= 0 && v <= 1;
  if (![z.x0, z.x1, z.y0, z.y1].every(inUnit) || !(z.x1 > z.x0) || !(z.y1 > z.y0)) out.push({ field: 'zones', message: `“${z.label}” is not a rectangle inside the picture.` });
  if (!z.label.trim()) out.push({ field: 'zones', message: 'A station has no name.' });
  return out;
}

/** ONE EVENT, checked against the footage and the stations — whoever wrote it. */
export function checkEvent(e: unknown, o: { durationSec: number; zones: readonly { id: string }[] }): Problem[] {
  const out: Problem[] = [];
  if (!e || typeof e !== 'object') return [{ field: 'event', message: 'Not an event.' }];
  const x = e as Partial<VideoEvent>;
  if (typeof x.id !== 'string' || !x.id) out.push({ field: 'id', message: 'An event has no id.' });
  const num = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
  if (!num(x.start) || !num(x.end)) out.push({ field: 'start', message: 'An event needs a start and an end, in seconds of the footage.' });
  else {
    if (x.start < 0 || x.end > o.durationSec + 0.05) out.push({ field: 'start', message: `It runs ${x.start.toFixed(1)}–${x.end.toFixed(1)} s, outside the footage's ${o.durationSec.toFixed(1)} s.` });
    if (!(x.end > x.start)) out.push({ field: 'end', message: 'Its end is not after its start.' });
  }
  if (!x.category || !(EVENT_CATEGORIES as readonly string[]).includes(x.category)) out.push({ field: 'category', message: `“${String(x.category)}” is not a kind of event the study knows.` });
  if (typeof x.zone !== 'string' || !o.zones.some(z => z.id === x.zone)) out.push({ field: 'zone', message: 'It is at no station of this study.' });
  if (!num(x.confidence) || x.confidence < 0 || x.confidence > 1) out.push({ field: 'confidence', message: 'Its confidence must be between 0 and 1.' });
  if (typeof x.observed !== 'string' || !x.observed.trim()) out.push({ field: 'observed', message: 'It does not say what is seen.' });
  if (!Array.isArray(x.frames) || !x.frames.every(num)) out.push({ field: 'frames', message: 'Its frames must be seconds of the footage.' });
  if (!x.basis || !['motion', 'vision', 'person'].includes(x.basis)) out.push({ field: 'basis', message: 'It does not say how it is known.' });
  if (!x.review || !['candidate', 'accepted', 'rejected'].includes(x.review)) out.push({ field: 'review', message: 'It has no review state.' });
  if (!x.provenance || typeof x.provenance.provider !== 'string' || typeof x.provenance.version !== 'string') out.push({ field: 'provenance', message: 'It does not say what produced it.' });
  return out;
}

/** Keep the events that pass; say why each refused one was refused. */
export function keepValid(events: readonly unknown[], o: { durationSec: number; zones: readonly { id: string }[] }): { kept: VideoEvent[]; refused: { index: number; problems: Problem[] }[] } {
  const kept: VideoEvent[] = [];
  const refused: { index: number; problems: Problem[] }[] = [];
  events.forEach((e, index) => {
    const problems = checkEvent(e, o);
    if (problems.length) refused.push({ index, problems });
    else kept.push(e as VideoEvent);
  });
  return { kept, refused };
}
