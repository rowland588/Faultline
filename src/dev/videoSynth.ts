/* FOOTAGE WHOSE TIMES ARE KNOWN — for measuring the video study's reading
 * (docs/VIDEO.md, accuracy), never shown to a person as real footage.
 *
 * A canvas drawn like a line filmed side-on: a still background with a
 * camera's grain on every frame, and a worker at each station who moves —
 * arms and a part — only while working, by a schedule written down before
 * the first frame. Recorded with the browser's own MediaRecorder at the
 * frame rate asked, so it is a real WebM the app reads like any other. The
 * schedule is the truth the reading is scored against (lib/video/evaluate).
 * It is a dev aid: no factory footage is invented for a person to read. */
import type { Timed } from '../lib/video/evaluate';

export interface SynthStation { label: string; firstSec: number; workSec: number; cycleSec: number; jitterSec?: number }

export interface SynthOptions {
  durationSec: number; fps?: number; width?: number; height?: number; seed?: number; stations: SynthStation[];
  /** The camera's grain, in brightness steps either way. */
  grain?: number;
  /** Lights that flicker: the whole picture brightened by this much (0–1), on and off every `flickerSec`. */
  flicker?: number; flickerSec?: number;
}

function rng(seed: number) { let s = seed || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

/** The schedule: each station's pieces of work, start to end, in seconds. */
export function schedule(o: SynthOptions): Timed[] {
  const r = rng(o.seed ?? 11);
  const out: Timed[] = [];
  o.stations.forEach((st, i) => {
    for (let t = st.firstSec; t < o.durationSec; t += st.cycleSec) {
      const j = (st.jitterSec ?? 0) * (r() * 2 - 1);
      const start = Math.max(0, t + j), end = Math.min(o.durationSec, start + st.workSec + (st.jitterSec ?? 0) * (r() - 0.5));
      if (end - start > 0.3) out.push({ zone: `s${i + 1}`, start: Math.round(start * 1000) / 1000, end: Math.round(end * 1000) / 1000 });
    }
  });
  return out;
}

/** Record the footage. Takes as long as the footage runs. */
export async function makeLineVideo(o: SynthOptions): Promise<{ blob: Blob; truth: Timed[]; mime: string }> {
  const fps = o.fps ?? 25, W = o.width ?? 640, H = o.height ?? 360;
  const truth = schedule(o);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('no canvas');
  const mime = ['video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
  const stream = cv.captureStream(fps);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  const parts: Blob[] = [];
  rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
  const n = o.stations.length;
  const grain = o.grain ?? 10;
  const noise = rng((o.seed ?? 11) + 7);
  const draw = (t: number) => {
    ctx.fillStyle = '#9aa3a8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#5d666b'; ctx.fillRect(0, H * 0.72, W, H * 0.08);           /* the conveyor */
    for (let i = 0; i < n; i++) {
      const x0 = (i / n) * W, cx = x0 + W / n / 2;
      ctx.fillStyle = '#c9cfd2'; ctx.fillRect(x0 + 12, H * 0.5, W / n - 24, H * 0.22); /* the bench */
      const busy = truth.some(x => x.zone === `s${i + 1}` && t >= x.start && t <= x.end);
      const ph = t * 7 + i;
      const reach = busy ? Math.sin(ph) * 28 : 0, lift = busy ? Math.cos(ph * 1.3) * 16 : 0;
      ctx.fillStyle = '#2d4a6b'; ctx.fillRect(cx - 22, H * 0.18, 44, H * 0.34);     /* the worker */
      ctx.fillStyle = '#e0b48a'; ctx.beginPath(); ctx.arc(cx, H * 0.13, 16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#2d4a6b'; ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(cx - 18, H * 0.25); ctx.lineTo(cx - 30 + reach, H * 0.46 + lift); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 18, H * 0.25); ctx.lineTo(cx + 30 - reach, H * 0.46 - lift); ctx.stroke();
      if (busy) { ctx.fillStyle = '#d96d1f'; ctx.fillRect(cx - 14 + reach * 0.6, H * 0.47 + lift * 0.5, 28, 20); } /* the part in hand */
    }
    /* lights that flicker: the whole picture lighter for a while, then not */
    if (o.flicker && Math.floor(t / (o.flickerSec ?? 1.3)) % 2 === 1) { ctx.fillStyle = `rgba(255,255,255,${o.flicker})`; ctx.fillRect(0, 0, W, H); }
    /* a camera's grain: the same small speckle on every frame, at random places */
    if (grain > 0) {
      const img = ctx.getImageData(0, 0, W, H), d = img.data;
      for (let k = 0; k < (W * H) / 6; k++) { const p = Math.floor(noise() * W * H) * 4, g = (noise() - 0.5) * grain * 2; d[p] += g; d[p + 1] += g; d[p + 2] += g; }
      ctx.putImageData(img, 0, 0);
    }
  };
  draw(0);
  rec.start(250);
  const t0 = performance.now();
  await new Promise<void>(resolve => {
    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      if (t >= o.durationSec) { resolve(); return; }
      draw(t);
      setTimeout(tick, 1000 / fps);
    };
    tick();
  });
  await new Promise<void>(resolve => { rec.onstop = () => resolve(); rec.stop(); });
  stream.getTracks().forEach(tr => tr.stop());
  return { blob: new Blob(parts, { type: 'video/webm' }), truth, mime };
}
