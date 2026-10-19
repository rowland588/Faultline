/* READING THE FOOTAGE ON THE DEVICE (docs/VIDEO.md, ingestion and
 * preprocessing).
 *
 * The browser decodes the file itself: an HTML5 <video> seeked to each time
 * and drawn to a canvas — the same way the filmed walk takes its stills
 * (snag/frame). No server sees the footage to read it, and no frame is sent
 * anywhere by this module. Every frame read is tied to the source second it
 * was seeked to; resizing never changes the time.
 *
 * Why not FFmpeg here: the app is static on Vercel with one edge function,
 * and an edge function cannot hold a video for minutes. The footage is read
 * where it already is — on the device that has it — and the job's state is
 * kept on the record so the reading picks up where it stopped. A worker with
 * FFmpeg for long or large footage is the next step (docs/VIDEO.md); it
 * would write the same signal and the same job states. */
import { sniffMime, sniffVideoCodec } from '../mime';
import { readVideoMeta } from '../../snag/frame';
import type { FootageScan, VideoFacts, VideoZone } from './record';
import type { Signal } from './detect';
import { SteadyCheck, steadySummary } from './steady';

/** What the file is, read from it: its type from its bytes, its length, its picture, its frame rate. */
export async function probe(file: File | Blob, name: string): Promise<{ facts: Partial<VideoFacts>; error?: string }> {
  const mime = (await sniffMime(file)) ?? undefined;
  const facts: Partial<VideoFacts> = { fileName: name, bytes: file.size, ...(mime ? { mime } : {}) };
  if (!mime || !mime.startsWith('video/')) return { facts };
  try {
    const m = await readVideoMeta(file);
    facts.durationSec = m.duration; facts.width = m.width; facts.height = m.height;
    facts.orientation = m.width > m.height ? 'landscape' : m.width < m.height ? 'portrait' : 'square';
  } catch {
    return { facts, error: 'The video could not be opened — it may be damaged, cut short, or in a form this browser cannot decode.' };
  }
  const codec = await sniffVideoCodec(file).catch(() => null);
  if (codec) facts.codec = codec;
  const fps = await estimateFps(file).catch(() => undefined);
  if (fps) facts.fps = fps;
  return { facts };
}

type FrameCallbackVideo = HTMLVideoElement & {
  requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime: number; presentedFrames: number }) => void) => number;
};

/** FRAMES A SECOND, estimated by playing a second of it, muted, and timing
 *  the frames presented (requestVideoFrameCallback). Undefined where the
 *  browser cannot say — the reading then assumes 30 and says so. */
export function estimateFps(file: Blob): Promise<number | undefined> {
  return new Promise(resolve => {
    const v = document.createElement('video') as FrameCallbackVideo;
    if (!v.requestVideoFrameCallback) { resolve(undefined); return; }
    const url = URL.createObjectURL(file);
    v.muted = true; v.playsInline = true; v.src = url;
    const times: number[] = [];
    let done = false;
    const finish = (fps?: number) => { if (done) return; done = true; v.pause(); URL.revokeObjectURL(url); v.removeAttribute('src'); v.load(); resolve(fps); };
    const tick = (_n: number, meta: { mediaTime: number }) => {
      times.push(meta.mediaTime);
      if (times.length >= 12) {
        const gaps = times.slice(1).map((t, i) => t - times[i]).filter(g => g > 0).sort((a, b) => a - b);
        const g = gaps[Math.floor(gaps.length / 2)];
        finish(g ? Math.round(1 / g) : undefined);
        return;
      }
      v.requestVideoFrameCallback?.(tick);
    };
    v.requestVideoFrameCallback(tick);
    v.play().catch(() => finish(undefined));
    setTimeout(() => finish(undefined), 4000);
  });
}

/** A fingerprint of the file — its first and last 64 KB, hashed — so the
 *  same footage read with the same settings is never read again. */
export async function fingerprint(file: Blob): Promise<string> {
  const k = 64 * 1024;
  const head = await file.slice(0, k).arrayBuffer();
  const tail = await file.slice(Math.max(0, file.size - k)).arrayBuffer();
  const both = new Uint8Array(head.byteLength + tail.byteLength);
  both.set(new Uint8Array(head), 0); both.set(new Uint8Array(tail), head.byteLength);
  const d = await crypto.subtle.digest('SHA-256', both);
  return [...new Uint8Array(d).slice(0, 8)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/** An open video, seeked frame by frame. */
export class Reader {
  private v: HTMLVideoElement;
  private url: string;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  constructor(file: Blob, private width = 160) {
    this.url = URL.createObjectURL(file);
    this.v = document.createElement('video');
    this.v.muted = true; this.v.preload = 'auto'; this.v.playsInline = true;
    this.canvas = document.createElement('canvas');
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) throw new Error('No canvas on this device.');
    this.ctx = ctx;
  }
  async open(): Promise<{ width: number; height: number; duration: number }> {
    await new Promise<void>((resolve, reject) => {
      this.v.onloadeddata = () => resolve();
      this.v.onerror = () => reject(new Error('The video could not be decoded on this device.'));
      this.v.src = this.url;
    });
    const w = this.width, h = Math.max(1, Math.round((this.v.videoHeight / Math.max(1, this.v.videoWidth)) * w));
    this.canvas.width = w; this.canvas.height = h;
    return { width: this.v.videoWidth, height: this.v.videoHeight, duration: this.v.duration };
  }
  /** Seek to a source second and wait for that frame. */
  async seek(t: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      const to = setTimeout(() => reject(new Error(`The frame at ${t.toFixed(1)} s did not come — the file may be damaged there.`)), 15000);
      this.v.onseeked = () => { clearTimeout(to); resolve(); };
      this.v.currentTime = Math.min(t, Math.max(0, (this.v.duration || t) - 0.001));
    });
  }
  /** The frame now, small and grey: one brightness a pixel, 0–255. */
  grey(): Uint8ClampedArray {
    const { width: w, height: h } = this.canvas;
    this.ctx.drawImage(this.v, 0, 0, w, h);
    return toGrey(this.ctx.getImageData(0, 0, w, h).data);
  }
  size(): { w: number; h: number } { return { w: this.canvas.width, h: this.canvas.height }; }
  /** The frame now at full size, or a part of it, as a JPEG. */
  async still(o: { maxWidth?: number; crop?: Pick<VideoZone, 'x0' | 'x1' | 'y0' | 'y1'> } = {}): Promise<Blob> {
    const vw = this.v.videoWidth, vh = this.v.videoHeight;
    const c = o.crop ?? { x0: 0, x1: 1, y0: 0, y1: 1 };
    const sx = c.x0 * vw, sy = c.y0 * vh, sw = (c.x1 - c.x0) * vw, sh = (c.y1 - c.y0) * vh;
    const scale = Math.min(1, (o.maxWidth ?? 640) / sw);
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(sw * scale)); cv.height = Math.max(1, Math.round(sh * scale));
    cv.getContext('2d')?.drawImage(this.v, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    return new Promise((resolve, reject) => cv.toBlob(b => (b ? resolve(b) : reject(new Error('The frame could not be made into a picture.'))), 'image/jpeg', 0.8));
  }
  close(): void { this.v.removeAttribute('src'); this.v.load(); URL.revokeObjectURL(this.url); }
}

/** A frame's colours as one brightness a pixel, 0–255 (the eye's weights). */
export function toGrey(px: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(px.length / 4);
  for (let i = 0, j = 0; i < px.length; i += 4, j++) out[j] = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
  return out;
}

/** HOW MUCH EACH STATION CHANGED between two grey frames — the mean
 *  difference of its pixels, as a share of full brightness (0–1). */
export function changeByZone(a: Uint8ClampedArray, b: Uint8ClampedArray, w: number, h: number, zones: readonly VideoZone[]): number[] {
  return zones.map(z => {
    const x0 = Math.floor(z.x0 * w), x1 = Math.max(x0 + 1, Math.ceil(z.x1 * w)), y0 = Math.floor(z.y0 * h), y1 = Math.max(y0 + 1, Math.ceil(z.y1 * h));
    let s = 0, n = 0;
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const i = y * w + x; s += Math.abs(a[i] - b[i]); n++; }
    return n ? s / n / 255 : 0;
  });
}

/** THE SIGNAL: from `fromIndex`, a frame every `sampleSec`, each station's
 *  change since the frame before. `onChunk` is called every few frames with
 *  what has been read so far, so the job can keep it and be resumed. */
export async function readSignal(file: Blob, o: {
  sampleSec: number; readWidth: number; zones: readonly VideoZone[]; durationSec: number;
  start?: Signal; onChunk?: (s: Signal, done: number, total: number) => Promise<void> | void; abort?: AbortSignal; chunk?: number;
}): Promise<Signal> {
  const r = new Reader(file, o.readWidth);
  try {
    await r.open();
    const total = Math.floor(o.durationSec / o.sampleSec) + 1;
    const sig: Signal = o.start
      ? { times: [...o.start.times], zones: o.start.zones.map(z => ({ zone: z.zone, values: [...z.values] })), steady: [...(o.start.steady ?? [])], bright: [...(o.start.bright ?? [])] }
      : { times: [], zones: o.zones.map(z => ({ zone: z.id, values: [] })), steady: [], bright: [] };
    const { w, h } = r.size();
    /* the footage's own steadiness and light, from the frames the reading reads anyway (docs/VIDEO-DESIGN.md, D6) */
    const check = new SteadyCheck(w, h);
    let prev: Uint8ClampedArray | undefined;
    let i = sig.times.length;
    /* resumed: the first frame held again as the camera's reference, and the frame before the first one still to read read again, for its difference */
    if (i > 0) { await r.seek(sig.times[0]); check.prime(r.grey()); await r.seek(sig.times[i - 1]); prev = r.grey(); }
    for (; i < total; i++) {
      if (o.abort?.aborted) throw new DOMException('Stopped', 'AbortError');
      const t = Math.round(i * o.sampleSec * 1000) / 1000;
      await r.seek(t);
      const g = r.grey();
      const d = prev ? changeByZone(prev, g, w, h, o.zones) : o.zones.map(() => 0);
      sig.times.push(t);
      d.forEach((v, k) => sig.zones[k].values.push(Math.round(v * 1e5) / 1e5));
      let b = 0;
      for (let k = 0; k < g.length; k++) b += g[k];
      sig.bright?.push(Math.round((b / g.length) * 10) / 10);
      const m = check.add(t, g)?.mark;
      if (m) sig.steady?.push({ t: m.t, dx: Math.round(m.dx * 1000) / 1000, dy: Math.round(m.dy * 1000) / 1000, light: Math.round(m.light * 1000) / 1000 });
      prev = g;
      if (o.onChunk && ((i + 1) % (o.chunk ?? 25) === 0 || i === total - 1)) await o.onChunk(sig, i + 1, total);
    }
    return sig;
  } finally { r.close(); }
}

export const SCAN_VERSION = 'scan-1';

/** A QUICK LOOK AT FOOTAGE AS IT COMES IN, before it is read: its light at
 *  sixteen moments across it, and the camera's steadiness over ten seconds a
 *  quarter of the way in, a frame every quarter second (lib/video/steady). A
 *  few seconds' work, so footage filmed in the hand or in the dark is said so
 *  before anyone waits for it to be read. */
export async function scanFootage(file: Blob, durationSec: number): Promise<FootageScan> {
  const r = new Reader(file, 160);
  try {
    await r.open();
    const { w, h } = r.size();
    const bright: number[] = [];
    const mean = (g: Uint8ClampedArray) => { let b = 0; for (let k = 0; k < g.length; k++) b += g[k]; return b / g.length; };
    for (let k = 0; k < 16; k++) { await r.seek(((k + 0.5) / 16) * durationSec); bright.push(mean(r.grey())); }
    const from = Math.max(0, Math.min(durationSec * 0.25, durationSec - 10)), to = Math.min(durationSec, from + 10);
    const check = new SteadyCheck(w, h);
    for (let t = from; t <= to + 1e-9; t += 0.25) { await r.seek(t); const g = r.grey(); bright.push(mean(g)); check.add(t, g); }
    const s = steadySummary(check.marks);
    const r1 = (x: number) => Math.round(x * 10) / 10, r3 = (x: number) => Math.round(x * 1000) / 1000;
    return {
      version: SCAN_VERSION, at: Date.now(), frames: bright.length,
      brightness: { mean: r1(bright.reduce((a, x) => a + x, 0) / bright.length), min: r1(Math.min(...bright)), max: r1(Math.max(...bright)) },
      stretch: [r3(from), r3(to)],
      steady: { windows: s.windows, shaking: r3(s.shaking), moved: r3(s.moved), shakeMax: r3(s.shakeMax), ...(s.movedAt !== undefined ? { movedAt: r3(s.movedAt), movedBy: r3(s.movedBy ?? 0) } : {}) },
    };
  } finally { r.close(); }
}

/** A still of one moment, whole or of one station — supporting evidence for an event. */
export async function stillAt(file: Blob, t: number, o: { maxWidth?: number; crop?: Pick<VideoZone, 'x0' | 'x1' | 'y0' | 'y1'> } = {}): Promise<Blob> {
  const r = new Reader(file, 32);
  try { await r.open(); await r.seek(t); return await r.still(o); } finally { r.close(); }
}
