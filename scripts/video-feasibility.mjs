/* CAN IT BE DONE? — the video system's technical abilities measured before
 * any of the long study is built (Rowland, 19 October: "because of the
 * complexity of the video system we really need to make sure that the
 * technical abilities are possible.. and then how we achieve them").
 * docs/VIDEO-FEASIBILITY.md says what each probe found and what follows.
 *
 * Not a pass/fail. Each probe runs in a real Chromium on footage whose times
 * are known (src/dev/videoSynth lineScene), drawn live and fed to the reading
 * the way a camera is (canvas.captureStream), with the app's own arithmetic
 * (lib/video/extract changeByZone, lib/video/detect, lib/video/evaluate):
 *   A  live reading — the signal worked out while it is filmed, scored
 *      against the known times and against the app's reading of a
 *      recording of the same stream (readSignal), what each sample costs;
 *   B  rolling clips — the recorder started anew every N seconds (one after
 *      another, and overlapping): is each clip whole and playable alone,
 *      what is lost between two; and whether a timeslice chunk plays alone;
 *   C  a long run — FEAS_LONG_MIN minutes (default 20) read live: memory,
 *      the rate kept up minute by minute, the signal checkpointed to the
 *      device's storage every 10 s, the reading of it all at the end;
 *   D  a camera — getUserMedia on Chromium's fake camera, read while it
 *      records; what the recorder can write; what the device offers;
 *   E  sizes — a minute of clip at three bitrates, a still a station;
 *   F  the camera's set-up — fixed or shaken, knocked, held in the hand; the
 *      light changing; people crossing; a belt running in the stations; a
 *      view from above (a grid); many stations in one picture;
 *   G  the steady check — can the reading tell, as it reads, that the camera
 *      is shaking, was moved or is held, apart from the light changing and
 *      people crossing; how close its estimate of the camera's place is to
 *      the true one; and whether drawing each frame back to where the first
 *      one was rescues the reading.
 *
 *   node scripts/video-feasibility.mjs [out.json]    # SMOKE_BASE as the others
 *   FEAS_ONLY=A,B   FEAS_LONG_MIN=60
 * What it cannot prove: a phone — its camera, its heat and battery over
 * hours, a locked screen, Safari. That is the device probe's, on the phone. */
import pkg from 'playwright';
import { writeFileSync } from 'node:fs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const ONLY = process.env.FEAS_ONLY ? new Set(process.env.FEAS_ONLY.split(',')) : null;
const LONG_MIN = Number(process.env.FEAS_LONG_MIN ?? 20);
const want = k => !ONLY || ONLY.has(k);
const out = { at: new Date().toISOString(), base: BASE };

const STATIONS = [
  { label: 'Workstation 1', firstSec: 1.5, workSec: 4, cycleSec: 8, jitterSec: 0.3 },
  { label: 'Workstation 2', firstSec: 2.5, workSec: 6, cycleSec: 8, jitterSec: 0.3 },
  { label: 'Workstation 3', firstSec: 3.5, workSec: 3, cycleSec: 8, jitterSec: 0.3 },
];

/* The live reader, in the page: the scene drawn at 25 frames a second on a
   canvas, streamed, played in a <video> as a camera is, and read every
   sampleSec — drawn small, made grey, each station's change since the
   frame before. Optional: a recording of the stream; clips started anew
   every clipSec; the signal checkpointed every checkpointSec. */
const LIVE = async ({ durationSec, sampleSec = 0.2, readWidth = 160, record = false, clipSec = 0, overlap = false, checkpointSec = 0, bitrate = 1_000_000, perMinute = false, view = null, steady = false }) => {
  const { lineScene } = await import('/src/dev/videoSynth.ts');
  const { changeByZone } = await import('/src/lib/video/extract.ts');
  const { bands } = await import('/src/screens/VideoScreen.tsx');
  const stationsOf = (n, seed) => Array.from({ length: n }, (_, i) => ({ label: `Workstation ${i + 1}`, firstSec: 1.5 + ((i * 1.3 + seed) % 3), workSec: [4, 6, 3, 5, 2.5][i % 5], cycleSec: 8, jitterSec: 0.3 }));
  /* THE CAMERA'S SET-UP (probe F): one scene seen side-on, or two stacked as
     a view from above (six stations in a grid); the picture then shaken,
     knocked, carried, brightened, crossed or given a running belt. */
  const setUp = (v, dur) => {
    if (!v) { const sc = lineScene({ durationSec: dur, seed: 5, grain: 10, stations: stationsOf(3, 0) }); return { canvas: sc.canvas, truth: sc.truth, zones: bands(3), draw: sc.draw, offset: () => ({ dx: 0, dy: 0 }) }; }
    const W = 640, H = 360;
    const n = v.stations ?? 3;
    const scenes = v.grid ? [lineScene({ durationSec: dur, seed: 5, grain: 10, stations: stationsOf(3, 0) }), lineScene({ durationSec: dur, seed: 9, grain: 10, stations: stationsOf(3, 1.7) })]
      : [lineScene({ durationSec: dur, seed: 5, grain: 10, width: W, stations: stationsOf(n, 0) })];
    const truth = v.grid ? [...scenes[0].truth, ...scenes[1].truth.map(x => ({ ...x, zone: `s${Number(x.zone.slice(1)) + 3}` }))] : scenes[0].truth;
    const zones = v.grid ? [0, 1].flatMap(r => [0, 1, 2].map(c => ({ id: `s${r * 3 + c + 1}`, label: `W${r * 3 + c + 1}`, track: '', x0: c / 3, x1: (c + 1) / 3, y0: r / 2, y1: (r + 1) / 2 }))) : bands(n);
    const cam = document.createElement('canvas'); cam.width = W; cam.height = H;
    const g = cam.getContext('2d');
    /* a real place has texture that moves with the camera: a fixed speckle over the scene */
    const tex = document.createElement('canvas'); tex.width = W + 60; tex.height = H + 60;
    const tg = tex.getContext('2d'); let sd = 3; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let k = 0; k < 9000; k++) { tg.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.25)`; tg.fillRect(r() * tex.width, r() * tex.height, 2 + r() * 4, 2 + r() * 4); }
    let jx = 0, jy = 0, cur = { dx: 0, dy: 0 };
    const draw = (t) => {
      scenes.forEach(sc => sc.draw(t));
      let dx = 0, dy = 0;
      if (v.shake) { jx = (r() - 0.5) * 2 * v.shake; jy = (r() - 0.5) * 2 * v.shake; dx += jx; dy += jy; }
      if (v.bumpAt !== undefined && t >= v.bumpAt) { dx += v.bumpPx; dy += v.bumpPx / 2; }
      if (v.handheld) { dx += v.handheld * (Math.sin(t * 1.1) + 0.6 * Math.sin(t * 3.7)); dy += v.handheld * 0.7 * (Math.cos(t * 0.9) + 0.5 * Math.sin(t * 2.3)); }
      /* the stand sinking slowly: sag px a second, downwards */
      if (v.sag) dy += v.sag * t;
      cur = { dx, dy };
      g.fillStyle = '#9aa3a8'; g.fillRect(0, 0, W, H);
      g.save(); g.translate(dx, dy);
      if (v.grid) { g.drawImage(scenes[0].canvas, 0, 0, W, H / 2); g.drawImage(scenes[1].canvas, 0, H / 2, W, H / 2); }
      else g.drawImage(scenes[0].canvas, 0, 0, W, H);
      /* a place with detail that moves with the camera — or, plain, only the scene and its grain */
      if (!v.plain) g.drawImage(tex, -30, -30);
      /* a running belt along the conveyor, inside every station's area — a strip, or a fifth of the picture */
      if (v.conveyor) { const bh = typeof v.conveyor === 'number' ? v.conveyor : 0.06; g.fillStyle = '#3c4246'; for (let x = -40; x < W; x += 40) g.fillRect(((x + t * 120) % (W + 40)) - 20, H * 0.73, 18, H * bh); }
      g.restore();
      /* somebody walking across the line, through every station, every 20 s for 3 s */
      if (v.cross) { const ph = t % 20; if (ph < 3) { const x = (ph / 3) * (W + 80) - 40; g.fillStyle = '#26323c'; g.fillRect(x - 20, H * 0.15, 40, H * 0.6); g.beginPath(); g.arc(x, H * 0.1, 16, 0, Math.PI * 2); g.fill(); } }
      /* the phone's own exposure: the picture brightened 25% over 4 s, held, and back */
      if (v.exposure) { const ph = t % 40; const a = ph < 20 ? 0 : ph < 24 ? (ph - 20) / 4 : ph < 34 ? 1 : ph < 38 ? 1 - (ph - 34) / 4 : 0; if (a > 0) { g.fillStyle = `rgba(255,255,255,${0.25 * a})`; g.fillRect(0, 0, W, H); } }
    };
    return { canvas: cam, truth, zones, draw, offset: () => cur };
  };
  /* THE STEADY CHECK (probe G) is the app's own (lib/video/steady): each
     sample's place against the first frame; optionally each frame is then
     drawn back to where the first one was before it is read. */
  const { SteadyCheck } = await import('/src/lib/video/steady.ts');
  const scene = setUp(view, durationSec + 5);
  const zones = scene.zones;
  const stream = scene.canvas.captureStream(25);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.srcObject = stream;
  const t0 = performance.now();
  const now = () => (performance.now() - t0) / 1000;
  let drawing = true;
  const drawTick = () => { if (!drawing) return; scene.draw(now()); setTimeout(drawTick, 40); };
  drawTick();
  await v.play();
  const H = Math.max(1, Math.round(readWidth * scene.canvas.height / scene.canvas.width));
  const c = document.createElement('canvas'); c.width = readWidth; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  const sig = { times: [], zones: zones.map(z => ({ zone: z.id, values: [] })) };
  /* the steady check's own: each sample's shift and light against the first, the camera's true place, and the reading of frames drawn back */
  const sigBack = { times: [], zones: zones.map(z => ({ zone: z.id, values: [] })) };
  const marks = [];
  let check, prevBack, full, fctx, back, bctx;
  if (steady) {
    full = document.createElement('canvas'); full.width = scene.canvas.width; full.height = scene.canvas.height; fctx = full.getContext('2d');
    back = document.createElement('canvas'); back.width = readWidth; back.height = Math.max(1, Math.round(readWidth * scene.canvas.height / scene.canvas.width)); bctx = back.getContext('2d', { willReadFrequently: true });
  }
  const steadyMs = [], estMs = [];
  const costs = [], gaps = [];
  let prev, lastAt;
  const mime = ['video/webm;codecs=vp8', 'video/webm'].find(m => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
  /* the whole recording, for the app's own reading to be compared with */
  let whole, wholeParts = [];
  if (record) { whole = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate }); whole.ondataavailable = e => { if (e.data.size) wholeParts.push(e.data); }; whole.start(1000); }
  /* rolling clips: a recorder started anew every clipSec */
  const clips = [];
  const startClip = () => {
    const parts = [], at = now();
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: bitrate });
    const clip = { from: at, to: undefined, bytes: 0, kept: false, blob: undefined, startedAt: undefined, stoppedAt: undefined };
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    rec.onstart = () => { clip.startedAt = now(); };
    rec.onstop = () => { clip.stoppedAt = now(); const b = new Blob(parts, { type: mime }); clip.bytes = b.size; clip.blob = b; };
    rec.start(1000);
    clip.rec = rec;
    clips.push(clip);
    return clip;
  };
  let clipTimer;
  if (clipSec) {
    startClip();
    const roll = () => {
      const cur = clips[clips.length - 1];
      if (overlap) { startClip(); setTimeout(() => { cur.to = now(); cur.rec.stop(); }, 1000); }
      else { cur.to = now(); cur.rec.stop(); startClip(); }
      clipTimer = setTimeout(roll, clipSec * 1000);
    };
    clipTimer = setTimeout(roll, clipSec * 1000);
  }
  /* checkpoints: the signal so far written to the device's storage */
  const cpMs = [];
  let db;
  if (checkpointSec) {
    db = await new Promise((res, rej) => { const r = indexedDB.open('feas-signal', 1); r.onupgradeneeded = () => r.result.createObjectStore('s'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  }
  const checkpoint = async () => {
    const t = performance.now();
    const rec = { times: Float32Array.from(sig.times), zones: sig.zones.map(z => ({ zone: z.zone, values: Float32Array.from(z.values) })) };
    await new Promise((res, rej) => { const tx = db.transaction('s', 'readwrite'); tx.objectStore('s').put(rec, 'live'); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    cpMs.push(performance.now() - t);
  };
  const minutes = [];
  let minuteStart = 0, minuteCount = 0, minuteCost = 0;
  await new Promise(resolve => {
    let n = 0;
    const tick = async () => {
      const t = now();
      if (t >= durationSec) { resolve(); return; }
      const a = performance.now();
      /* with the steady check, one frame is taken and both readings come from it */
      if (steady) fctx.drawImage(v, 0, 0, full.width, full.height);
      ctx.drawImage(steady ? full : v, 0, 0, readWidth, H);
      const px = ctx.getImageData(0, 0, readWidth, H).data;
      const grey = new Uint8ClampedArray(readWidth * H);
      for (let i = 0, j = 0; i < px.length; i += 4, j++) grey[j] = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
      if (prev) {
        const d = changeByZone(prev, grey, readWidth, H, zones);
        sig.times.push(t);
        d.forEach((x, k) => sig.zones[k].values.push(x));
      }
      prev = grey;
      const cost = performance.now() - a;
      if (steady) {
        const b0 = performance.now();
        check ??= new SteadyCheck(readWidth, H);
        const got = check.add(t, grey);
        estMs.push(performance.now() - b0);
        if (got) {
          const sh = got.shift;
          const k = full.width / readWidth, off = scene.offset();
          marks.push({ ...got.mark, trueDx: off.dx / k, trueDy: off.dy / k });
          /* the frame drawn back to where the first one was, then read */
          bctx.fillStyle = '#808080'; bctx.fillRect(0, 0, readWidth, H);
          bctx.drawImage(full, sh.dx * k, sh.dy * k, full.width, full.height, 0, 0, readWidth, H);
          const bp = bctx.getImageData(0, 0, readWidth, H).data, bg = new Uint8ClampedArray(readWidth * H);
          for (let i = 0, j = 0; i < bp.length; i += 4, j++) bg[j] = (bp[i] * 299 + bp[i + 1] * 587 + bp[i + 2] * 114) / 1000;
          if (prevBack) { const d = changeByZone(prevBack, bg, readWidth, H, zones); sigBack.times.push(t); d.forEach((x, kk) => sigBack.zones[kk].values.push(x)); }
          prevBack = bg;
        }
        steadyMs.push(performance.now() - b0);
      }
      costs.push(cost);
      if (lastAt !== undefined) gaps.push(t - lastAt);
      lastAt = t;
      if (perMinute) {
        minuteCount++; minuteCost += cost;
        if (t - minuteStart >= 60) {
          const mem = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null;
          minutes.push({ minute: minutes.length + 1, samples: minuteCount, meanCostMs: +(minuteCost / minuteCount).toFixed(2), heapMB: mem, cpMeanMs: cpMs.length ? +(cpMs.slice(-6).reduce((s, x) => s + x, 0) / Math.min(6, cpMs.length)).toFixed(1) : null });
          minuteStart = t; minuteCount = 0; minuteCost = 0;
        }
      }
      if (checkpointSec && sig.times.length && Math.floor(t / checkpointSec) > Math.floor((t - sampleSec) / checkpointSec)) await checkpoint();
      /* each sample at its own time: the wait shortened by any lateness */
      n++;
      setTimeout(tick, Math.max(0, (n + 1) * sampleSec * 1000 - (performance.now() - t0)));
    };
    tick();
  });
  clearTimeout(clipTimer);
  if (clipSec) { const cur = clips[clips.length - 1]; if (cur.rec.state !== 'inactive') { cur.to = now(); cur.rec.stop(); } }
  let wholeBlob;
  if (whole) { await new Promise(r => { whole.onstop = r; whole.stop(); }); wholeBlob = new Blob(wholeParts, { type: mime }); }
  await new Promise(r => setTimeout(r, 1500));       /* the last clip's onstop */
  drawing = false;
  stream.getTracks().forEach(tr => tr.stop());
  const sorted = [...costs].sort((x, y) => x - y), gs = [...gaps].sort((x, y) => x - y);
  const pct = (xs, p) => xs.length ? xs[Math.min(xs.length - 1, Math.floor(p * xs.length))] : null;
  return {
    scene: scene, zones, truth: scene.truth.filter(x => x.start < durationSec), sig, sigBack, marks, steadyMeanMs: steadyMs.length ? +(steadyMs.reduce((s, x) => s + x, 0) / steadyMs.length).toFixed(2) : null, estMeanMs: estMs.length ? +(estMs.reduce((s, x) => s + x, 0) / estMs.length).toFixed(2) : null, wholeBlob, mime, clips, minutes, cpMs,
    stats: {
      samples: costs.length, expected: Math.floor(durationSec / sampleSec),
      costMeanMs: +(costs.reduce((s, x) => s + x, 0) / costs.length).toFixed(2), costP95Ms: +pct(sorted, 0.95).toFixed(2), costMaxMs: +sorted[sorted.length - 1].toFixed(2),
      gapP50: +pct(gs, 0.5).toFixed(3), gapP95: +pct(gs, 0.95).toFixed(3), gapMax: +gs[gs.length - 1].toFixed(3),
      signalBytes: sig.times.length * 4 * (1 + zones.length),
    },
  };
};

/* Whether a recorded piece plays on its own, and how long it runs. */
const PLAYS = async (blob) => {
  const v = document.createElement('video');
  v.muted = true; v.preload = 'auto';
  const url = URL.createObjectURL(blob);
  try {
    const ok = await new Promise(res => { v.onloadeddata = () => res(true); v.onerror = () => res(false); v.src = url; setTimeout(() => res(false), 8000); });
    if (!ok) return { plays: false };
    /* a recorder's WebM says no length until the end is sought */
    let duration = v.duration;
    if (!Number.isFinite(duration)) {
      duration = await new Promise(res => { v.ontimeupdate = () => { v.ontimeupdate = null; res(v.duration); }; v.currentTime = 1e9; setTimeout(() => res(v.duration), 8000); });
    }
    return { plays: v.readyState >= 2, duration: Number.isFinite(duration) ? +duration.toFixed(2) : null, width: v.videoWidth, height: v.videoHeight };
  } finally { v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url); }
};

const say = (...a) => console.log(...a);
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1200, height: 800 } });
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
await page.goto(`${BASE}/#/video`); await page.waitForTimeout(2500);
await page.evaluate(([live, plays]) => { window.__live = eval(`(${live})`); window.__plays = eval(`(${plays})`); }, [LIVE.toString(), PLAYS.toString()]);

/* ---- A: live reading against the truth, and against the app's reading of the recording ---- */
if (want('A')) {
  say('A  live reading — 120 s, a sample every 0.2 s, recorded alongside…');
  out.A = await page.evaluate(async () => {
    const { detectEvents } = await import('/src/lib/video/detect.ts');
    const { evaluate } = await import('/src/lib/video/evaluate.ts');
    const { readSignal } = await import('/src/lib/video/extract.ts');
    const r = await window.__live({ durationSec: 120, record: true });
    const config = { sampleSec: 0.2, readWidth: 160, zones: r.zones, sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: 'motion-1' };
    const ev = s => detectEvents(s, config).map(e => ({ zone: e.zone, start: e.start, end: e.end }));
    const live = ev(r.sig);
    const t = performance.now();
    const saved = await readSignal(r.wholeBlob, { sampleSec: 0.2, readWidth: 160, zones: r.zones, durationSec: 119.8 });
    const readSec = (performance.now() - t) / 1000;
    const after = ev(saved);
    const plays = await window.__plays(r.wholeBlob);
    return { stats: r.stats, live: evaluate(r.truth, live), saved: evaluate(r.truth, after), liveVsSaved: evaluate(after, live), savedReadSec: +readSec.toFixed(1), recording: { bytes: r.wholeBlob.size, ...plays } };
  });
  const e = (x) => `${x.detected}/${x.truth} found · precision ${x.precision.toFixed(2)} · recall ${x.recall.toFixed(2)} · start ±${x.startErr.toFixed(2)} s · end ±${x.endErr.toFixed(2)} s`;
  say(`   live:   ${e(out.A.live)}`);
  say(`   saved:  ${e(out.A.saved)}  (read in ${out.A.savedReadSec} s)`);
  say(`   live against saved: ${e(out.A.liveVsSaved)}`);
  say(`   samples ${out.A.stats.samples}/${out.A.stats.expected} · cost ${out.A.stats.costMeanMs} ms mean, ${out.A.stats.costP95Ms} p95, ${out.A.stats.costMaxMs} max · gap p50 ${out.A.stats.gapP50} s p95 ${out.A.stats.gapP95} max ${out.A.stats.gapMax} · signal ${out.A.stats.signalBytes} bytes`);
}

/* ---- B: rolling clips, one after another and overlapping; a timeslice chunk alone ---- */
if (want('B')) {
  out.B = {};
  for (const overlap of [false, true]) {
    say(`B  rolling clips every 30 s, ${overlap ? 'overlapping by 1 s' : 'one after another'} — 95 s…`);
    out.B[overlap ? 'overlap' : 'restart'] = await page.evaluate(async overlap => {
      const r = await window.__live({ durationSec: 95, clipSec: 30, overlap });
      const clips = [];
      for (const c of r.clips) clips.push({ from: +c.from.toFixed(2), startedAt: c.startedAt !== undefined ? +c.startedAt.toFixed(2) : null, to: c.to !== undefined ? +c.to.toFixed(2) : null, stoppedAt: c.stoppedAt !== undefined ? +c.stoppedAt.toFixed(2) : null, bytes: c.bytes, ...(c.blob ? await window.__plays(c.blob) : { plays: false }) });
      const lost = clips.slice(1).map((c, i) => +((c.startedAt ?? c.from) - (clips[i].stoppedAt ?? clips[i].to)).toFixed(3));
      return { clips, lostBetween: lost };
    }, overlap);
    const x = out.B[overlap ? 'overlap' : 'restart'];
    say(`   ${x.clips.map(c => `${c.plays ? 'plays' : 'DOES NOT PLAY'} ${c.duration ?? '?'} s ${Math.round(c.bytes / 1024)} KB`).join(' · ')}`);
    say(`   between clips (next started − last stopped, s): ${x.lostBetween.join(', ')}`);
  }
  say('B  one recorder, a 10 s timeslice: does the second chunk play alone? — 25 s…');
  out.B.timeslice = await page.evaluate(async () => {
    const { lineScene } = await import('/src/dev/videoSynth.ts');
    const s = lineScene({ durationSec: 30, seed: 5, stations: [{ label: 'W', firstSec: 1, workSec: 3, cycleSec: 6 }] });
    const stream = s.canvas.captureStream(25);
    const t0 = performance.now(); let on = true;
    const tick = () => { if (!on) return; s.draw((performance.now() - t0) / 1000); setTimeout(tick, 40); }; tick();
    const parts = [];
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm', videoBitsPerSecond: 1_000_000 });
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    rec.start(10000);
    await new Promise(r => setTimeout(r, 25000));
    await new Promise(r => { rec.onstop = r; rec.stop(); });
    on = false; stream.getTracks().forEach(t => t.stop());
    const res = [];
    for (const p of parts) res.push({ bytes: p.size, ...(await window.__plays(new Blob([p], { type: 'video/webm' }))) });
    return { chunks: res, firstPlusSecond: await window.__plays(new Blob(parts.slice(0, 2), { type: 'video/webm' })) };
  });
  say(`   chunks alone: ${out.B.timeslice.chunks.map((c, i) => `#${i + 1} ${c.plays ? 'plays' : 'does not play'}`).join(' · ')}; the first two together: ${out.B.timeslice.firstPlusSecond.plays ? 'play' : 'do not play'}`);
}

/* ---- D: a camera — Chromium's fake one — read while it records ---- */
if (want('D')) {
  say('D  a camera (Chromium’s fake) read every 0.2 s while it records — 30 s…');
  const cb = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  const cctx = await cb.newContext({ permissions: ['camera'] });
  await cctx.route('**://*.supabase.co/**', r => r.abort());
  const cp = await cctx.newPage();
  await cp.goto(`${BASE}/#/video`); await cp.waitForTimeout(2500);
  await cp.evaluate(([plays]) => { window.__plays = eval(`(${plays})`); }, [PLAYS.toString()]);
  out.D = await cp.evaluate(async () => {
    const { changeByZone } = await import('/src/lib/video/extract.ts');
    const { bands } = await import('/src/screens/VideoScreen.tsx');
    const types = ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm;codecs=h264', 'video/mp4', 'video/mp4;codecs=avc1', 'video/mp4;codecs=hvc1'];
    const offers = {
      recorderTypes: types.filter(t => MediaRecorder.isTypeSupported(t)),
      frameCallback: 'requestVideoFrameCallback' in HTMLVideoElement.prototype,
      wakeLock: 'wakeLock' in navigator,
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      trackProcessor: typeof window.MediaStreamTrackProcessor !== 'undefined',
      storage: navigator.storage?.estimate ? await navigator.storage.estimate().then(e => ({ quotaGB: +(e.quota / 1e9).toFixed(1), usageMB: +(e.usage / 1e6).toFixed(1) })) : null,
    };
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720, frameRate: 30 } });
    const settings = stream.getVideoTracks()[0].getSettings();
    const v = document.createElement('video'); v.muted = true; v.srcObject = stream; await v.play();
    const parts = [];
    const rec = new MediaRecorder(stream, { mimeType: offers.recorderTypes[0], videoBitsPerSecond: 1_000_000 });
    rec.ondataavailable = e => { if (e.data.size) parts.push(e.data); };
    rec.start(1000);
    const zones = bands(3), W = 160, H = Math.round(160 * settings.height / settings.width);
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d', { willReadFrequently: true });
    let prev, n = 0; const costs = [], moved = [];
    const t0 = performance.now();
    await new Promise(resolve => {
      const tick = () => {
        if (performance.now() - t0 > 30000) { resolve(); return; }
        const a = performance.now();
        ctx.drawImage(v, 0, 0, W, H);
        const px = ctx.getImageData(0, 0, W, H).data, g = new Uint8ClampedArray(W * H);
        for (let i = 0, j = 0; i < px.length; i += 4, j++) g[j] = (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000;
        if (prev) moved.push(Math.max(...changeByZone(prev, g, W, H, zones)));
        prev = g; costs.push(performance.now() - a);
        n++; setTimeout(tick, Math.max(0, (n + 1) * 200 - (performance.now() - t0)));
      };
      tick();
    });
    await new Promise(r => { rec.onstop = r; rec.stop(); });
    stream.getTracks().forEach(t => t.stop());
    const blob = new Blob(parts, { type: offers.recorderTypes[0] });
    return { offers, camera: { width: settings.width, height: settings.height, frameRate: settings.frameRate }, samples: costs.length, expected: 150, costMeanMs: +(costs.reduce((s, x) => s + x, 0) / costs.length).toFixed(2), sawMovement: moved.filter(x => x > 0.002).length, recording: { bytes: blob.size, ...(await window.__plays(blob)) } };
  });
  await cb.close();
  say(`   camera ${out.D.camera.width}×${out.D.camera.height} @ ${out.D.camera.frameRate} · samples ${out.D.samples}/${out.D.expected} · ${out.D.costMeanMs} ms each · movement seen in ${out.D.sawMovement} · recording ${Math.round(out.D.recording.bytes / 1024)} KB ${out.D.recording.plays ? 'plays' : 'DOES NOT PLAY'} ${out.D.recording.duration ?? ''} s`);
  say(`   offers: ${JSON.stringify(out.D.offers)}`);
}

/* ---- E: sizes — a minute of clip at three bitrates; a still a station ---- */
if (want('E')) {
  say('E  sizes — 20 s at 0.5, 1 and 2.5 Mbps, and a still of each station…');
  out.E = await page.evaluate(async () => {
    const rows = [];
    for (const bitrate of [500_000, 1_000_000, 2_500_000]) {
      const r = await window.__live({ durationSec: 20, record: true, bitrate });
      rows.push({ bitrate, bytes20s: r.wholeBlob.size, mbPerHour: +((r.wholeBlob.size / 20) * 3600 / 1048576).toFixed(0) });
    }
    const { lineScene } = await import('/src/dev/videoSynth.ts');
    const s = lineScene({ durationSec: 10, seed: 5, stations: [{ label: 'W1', firstSec: 0, workSec: 5, cycleSec: 6 }, { label: 'W2', firstSec: 0, workSec: 5, cycleSec: 6 }, { label: 'W3', firstSec: 0, workSec: 5, cycleSec: 6 }] });
    s.draw(2);
    const stills = [];
    for (let i = 0; i < 3; i++) {
      const cv = document.createElement('canvas'); cv.width = 240; cv.height = Math.round(240 * 360 / (640 / 3));
      cv.getContext('2d').drawImage(s.canvas, (i * 640) / 3, 0, 640 / 3, 360, 0, 0, cv.width, cv.height);
      stills.push(await new Promise(res => cv.toBlob(bl => res(bl.size), 'image/jpeg', 0.7)));
    }
    return { clips: rows, stillBytes: stills };
  });
  say(`   ${out.E.clips.map(r => `${r.bitrate / 1e6} Mbps: ${Math.round(r.bytes20s / 1024)} KB for 20 s ≈ ${r.mbPerHour} MB an hour`).join(' · ')} · a still ${out.E.stillBytes.map(x => Math.round(x / 1024)).join(', ')} KB`);
  say('   (the synthetic picture is simpler than a real line, so real footage at the same bitrate is the same size but softer; sizes are set by the bitrate)');
}

/* ---- F: the camera's set-up — what the reading needs, and what breaks it ---- */
if (want('F')) {
  const CONDS = [
    ['fixed camera, side-on (the reference)', {}],
    ['line vibration (±1.5 px every frame)', { shake: 1.5 }],
    ['the camera knocked once (10 px, at 30 s)', { bumpAt: 30, bumpPx: 10 }],
    ['held in the hand (drifting ±12 px)', { handheld: 12 }],
    ['the phone’s exposure changing (25% brighter for 14 s in 40)', { exposure: true }],
    ['somebody walking across every station every 20 s', { cross: true }],
    ['a running conveyor inside every station', { conveyor: true }],
    ['from above: six stations in a 2 × 3 grid', { grid: true }],
    ['ten stations in one picture (16 px each at the reading’s width)', { stations: 10 }],
    ['ten stations, read at twice the width (320 px)', { stations: 10, readWidth: 320 }],
  ];
  out.F = [];
  for (const [name, view] of CONDS) {
    const r = await page.evaluate(async ([view]) => {
      const { detectEvents } = await import('/src/lib/video/detect.ts');
      const { evaluate } = await import('/src/lib/video/evaluate.ts');
      const readWidth = view.readWidth ?? 160;
      const x = await window.__live({ durationSec: 60, view: { ...view }, readWidth });
      const config = { sampleSec: 0.2, readWidth, zones: x.zones, sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: 'motion-1' };
      const found = detectEvents(x.sig, config).map(e => ({ zone: e.zone, start: e.start, end: e.end }));
      /* every station changing at the same moment — the camera or the light, not work */
      const z = x.sig.zones.map(s => { const v = [...s.values].sort((a, b) => a - b); return { v: s.values, q: v[Math.floor(v.length * 0.5)] }; });
      const together = x.sig.times.filter((_, i) => z.every(s => s.v[i] > s.q * 2.5)).length / Math.max(1, x.sig.times.length);
      return { e: evaluate(x.truth, found), costMeanMs: x.stats.costMeanMs, together: +together.toFixed(3) };
    }, [view]);
    out.F.push({ name, ...r });
    say(`F  ${name}\n   ${r.e.detected}/${r.e.truth} found · precision ${r.e.precision.toFixed(2)} · recall ${r.e.recall.toFixed(2)} · start ±${r.e.startErr.toFixed(2)} s · end ±${r.e.endErr.toFixed(2)} s · every station changing at once ${Math.round(r.together * 100)}% of moments · ${r.costMeanMs} ms a sample`);
  }
}

/* ---- G: the steady check ---- */
/* Judged by the app's own module (lib/video/steady): two seconds of samples
   at a time, at the reading's width (160 px; one pixel there is four of a
   640-wide picture) — how much the picture's place jumps from one sample to
   the next (shake), how far it sits from where the first frame put it
   (moved), and its light against the first frame's. */
const median = xs => { const v = [...xs].sort((a, b) => a - b); return v.length ? (v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2) : 0; };
if (want('G')) {
  const CONDS = [
    ['fixed camera (the reference)', {}],
    ['light vibration (±0.75 px every frame)', { shake: 0.75 }],
    ['line vibration (±1.5 px every frame)', { shake: 1.5 }],
    ['heavy vibration (±3 px every frame)', { shake: 3 }],
    ['knocked once, 4 px, at 30 s', { bumpAt: 30, bumpPx: 4 }],
    ['knocked once, 10 px, at 30 s', { bumpAt: 30, bumpPx: 10 }],
    ['the stand sinking 0.1 px a second', { sag: 0.1 }],
    ['held in the hand (drifting ±12 px)', { handheld: 12 }],
    ['the phone’s exposure changing', { exposure: true }],
    ['somebody walking across every station', { cross: true }],
    ['a running conveyor inside every station', { conveyor: true }],
    ['from above: six stations in a 2 × 3 grid', { grid: true }],
    ['a wide belt running, a fifth of the picture', { conveyor: 0.2 }],
    ['a plain wall: fixed, little detail, grain and the workers', { plain: true }],
    ['a plain wall, light vibration (±0.75 px every frame)', { plain: true, shake: 0.75 }],
  ];
  const only = process.env.FEAS_G ? process.env.FEAS_G.split(',').map(Number) : null;
  const dur = Number(process.env.FEAS_G_SEC ?? 60);
  out.G = { durationSec: dur, rows: [] };
  say(`G  the steady check (lib/video/steady) — ${dur} s each`);
  for (const [i, [name, view]] of CONDS.entries()) {
    if (only && !only.includes(i + 1)) continue;
    const r = await page.evaluate(async ([view, dur]) => {
      const { detectEvents } = await import('/src/lib/video/detect.ts');
      const { evaluate } = await import('/src/lib/video/evaluate.ts');
      const { STEADY, steadySummary, steadyWindows } = await import('/src/lib/video/steady.ts');
      const x = await window.__live({ durationSec: dur, view: { ...view }, steady: true });
      const config = { sampleSec: 0.2, readWidth: 160, zones: x.zones, sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: 'motion-1' };
      const ev = sg => detectEvents(sg, config).map(e => ({ zone: e.zone, start: e.start, end: e.end }));
      const q = n => +n.toFixed(3);
      /* the estimate is against the first frame, so the truth is too */
      const o = x.marks[0] ?? { trueDx: 0, trueDy: 0 };
      const errs = x.marks.map(m => Math.hypot(m.dx - (m.trueDx - o.trueDx), m.dy - (m.trueDy - o.trueDy))).sort((a, b) => a - b);
      const sum = steadySummary(x.marks), wins = steadyWindows(x.marks);
      return { th: STEADY, sum, wins: wins.map(w => [q(w.at), q(w.shake), q(w.moved), q(w.light), w.word]), errP50: q(errs[Math.floor(errs.length / 2)] ?? 0), errP95: q(errs[Math.floor(errs.length * 0.95)] ?? 0), shakeP50: q([...wins.map(w => w.shake)].sort((a, b) => a - b)[Math.floor(wins.length / 2)] ?? 0),
        marks: x.marks.map(m => ({ t: q(m.t), dx: q(m.dx), dy: q(m.dy), light: q(m.light), trueDx: q(m.trueDx), trueDy: q(m.trueDy) })), plain: evaluate(x.truth, ev(x.sig)), back: evaluate(x.truth, ev(x.sigBack)), steadyMs: x.steadyMeanMs, estMs: x.estMeanMs, costMeanMs: x.stats.costMeanMs, samples: x.stats.samples, expected: x.stats.expected };
    }, [view, dur]);
    if (!out.G.thresholds) { out.G.thresholds = r.th; say(`   shaking over ${r.th.shake} px a step, moved over ${r.th.moved} px, light over ${Math.round(r.th.light * 100)}% (px at the reading's 160)`); }
    const j = { ...r.sum, errP50: r.errP50, errP95: r.errP95, shakeP50: r.shakeP50 };
    const after = view.bumpAt !== undefined ? r.marks.filter(m => m.t > view.bumpAt + 1) : [];
    const knock = after.length ? { est: [+median(after.map(m => m.dx)).toFixed(2), +median(after.map(m => m.dy)).toFixed(2)], truth: [after[0].trueDx, after[0].trueDy] } : null;
    const row = { name, view, ...j, knock, plain: r.plain, back: r.back, steadyMs: r.steadyMs, estMs: r.estMs, costMeanMs: r.costMeanMs, samples: r.samples, expected: r.expected };
    row.wins = r.wins;
    if (process.env.FEAS_G_MARKS) row.marks = r.marks;
    out.G.rows.push(row);
    const pr = e => `${e.detected}/${e.truth} · precision ${e.precision.toFixed(2)} · recall ${e.recall.toFixed(2)}`;
    say(`G${i + 1} ${name}\n   windows: shaking ${Math.round(j.shaking * 100)}% · moved ${Math.round(j.moved * 100)}%${j.movedAt !== undefined ? ` (first at ${j.movedAt.toFixed(1)} s)` : ''} · light ${Math.round(j.light * 100)}% · shake step p50 ${j.shakeP50.toFixed(3)} max ${j.shakeMax.toFixed(3)} · place error p50 ${j.errP50} p95 ${j.errP95} px${knock ? ` · after the knock read (${knock.est}) truth (${knock.truth.map(x => x.toFixed(2))})` : ''}\n   reading as it is: ${pr(r.plain)}  ·  drawn back first: ${pr(r.back)}  ·  check ${r.estMs} ms a sample, drawing back ${(r.steadyMs - r.estMs).toFixed(1)} more (reading ${r.costMeanMs}) · samples ${r.samples}/${r.expected}`);
  }
}

/* ---- C: a long run, minute by minute ---- */
if (want('C')) {
  say(`C  a long run — ${LONG_MIN} min read live with the steady check, clips every 30 s, the signal checkpointed every 10 s…`);
  out.C = await page.evaluate(async ([min]) => {
    const { detectEvents } = await import('/src/lib/video/detect.ts');
    const { evaluate } = await import('/src/lib/video/evaluate.ts');
    /* as the long study would run: the reading, the steady check, clips and the reading saved as it goes */
    const r = await window.__live({ durationSec: min * 60, clipSec: 30, checkpointSec: 10, perMinute: true, steady: true });
    const config = { sampleSec: 0.2, readWidth: 160, zones: r.zones, sensitivity: 4, joinGapSec: 0.5, minEventSec: 0.6, version: 'motion-1' };
    const t = performance.now();
    const found = detectEvents(r.sig, config).map(e => ({ zone: e.zone, start: e.start, end: e.end }));
    const detectMs = performance.now() - t;
    const { steadySummary } = await import('/src/lib/video/steady.ts');
    const st = steadySummary(r.marks);
    return { minutes: r.minutes, stats: r.stats, detectMs: +detectMs.toFixed(0), e: evaluate(r.truth, found), clips: r.clips.length, clipBytes: r.clips.reduce((s, c) => s + c.bytes, 0), clipsPlaying: r.clips.filter(c => c.bytes > 0).length, checkpointMaxMs: +Math.max(...r.cpMs).toFixed(1), steadyMs: r.steadyMeanMs, steady: { windows: st.windows, shaking: st.shaking, moved: st.moved, shakeMax: +st.shakeMax.toFixed(3) } };
  }, [LONG_MIN]);
  for (const m of out.C.minutes) say(`   minute ${String(m.minute).padStart(3)}: ${m.samples} samples · ${m.meanCostMs} ms each · heap ${m.heapMB ?? '?'} MB · checkpoint ${m.cpMeanMs ?? '—'} ms`);
  say(`   the steady check: ${out.C.steadyMs} ms a sample with drawing back · ${out.C.steady.windows} windows, shaking ${Math.round(out.C.steady.shaking * 100)}%, moved ${Math.round(out.C.steady.moved * 100)}%, the worst step ${out.C.steady.shakeMax} px`);
  say(`   at the end: ${out.C.e.detected}/${out.C.e.truth} found · precision ${out.C.e.precision.toFixed(2)} · recall ${out.C.e.recall.toFixed(2)} · read in ${out.C.detectMs} ms · signal ${out.C.stats.signalBytes} bytes · ${out.C.clips} clips, ${Math.round(out.C.clipBytes / 1048576)} MB if all were kept · checkpoint max ${out.C.checkpointMaxMs} ms`);
}

if (errs.length) say(`page errors: ${errs.slice(0, 3).join(' | ')}`);
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(out, null, 2));
await b.close();
