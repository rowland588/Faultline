/* The demo workspace — a fully seeded showcase, generated on demand. Not a
 * sandbox for customers: a stage for showing the product with everything lit.
 * Fourteen weeks of believable packing-hall data with real story arcs:
 *
 *   · a PROVEN WIN — film snags on the flow wrapper: case opened, whys asked,
 *     actions closed on time, confirmation study called ✓, £ recovered on the
 *     wins shelf and the trend visibly stepping down;
 *   · a LIVE CASE — allergen changeovers (worst on Nights): study running,
 *     one action overdue in red, one in progress with a latest update;
 *   · three shifts with times (so "is it the same on every shift?" answers),
 *     the food-packing taxonomy, a full cost model incl. lost output;
 *   · a snag walk with drawn stills, pinned faults in every state (open /
 *     overdue / stale / closed with an after-photo), and a short walk video
 *     recorded from a canvas animation right in the browser.
 *
 * Everything goes through the SAME mutators as real use — the demo is the
 * product exercising itself, so every screen (board, prize, cases, meeting,
 * proof, reports, print) shows full power. Deleting the workspace removes it
 * all, exactly like any workspace. */
import type { Case, Observation, DrillPath, Workspace } from '../types';
import type { Snag, SnagAsset } from '../snag/types';
import {
  createWorkspace, updateWorkspace, addObservation, addSnag, addCase,
  addSegment, addSnagAsset, putBlob,
} from '../db';
import { uid } from './ids';
import { readVideoMeta } from '../snag/frame';

export const DEMO_NAME = 'Demo — Packing Hall';
const DAY = 86_400_000;
const MIN = 60_000;

/* ---------- deterministic-ish randomness (stable enough runs) ---------- */
let seed = 20260817;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const jitter = (mean: number, spread = 0.55) => Math.max(0.4, mean * (1 - spread + rnd() * spread * 2));

/* ---------- canvas art: stills, after-photos, the walk footage ---------- */
const PALETTE_BG = '#eef5fa';
function drawMachine(ctx: CanvasRenderingContext2D, x: number, w: number, h: number, name: string, accent: string) {
  const baseY = h * 0.78;
  // machine body
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#c8dcea'; ctx.lineWidth = 3;
  const bw = w * 0.62, bh = h * 0.42, bx = x + (w - bw) / 2, by = baseY - bh;
  ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 18); ctx.fill(); ctx.stroke();
  // accent panel + lamp
  ctx.fillStyle = accent; ctx.beginPath(); ctx.roundRect(bx, by, bw, 26, [18, 18, 0, 0]); ctx.fill();
  ctx.beginPath(); ctx.arc(bx + bw - 26, by + 60, 10, 0, 7); ctx.fillStyle = '#67c27f'; ctx.fill();
  // dials
  ctx.fillStyle = '#e8f1f8';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.roundRect(bx + 24 + i * 64, by + 46, 48, 30, 6); ctx.fill(); }
  // hopper
  ctx.fillStyle = '#dcebf5'; ctx.beginPath();
  ctx.moveTo(bx + bw * 0.3, by); ctx.lineTo(bx + bw * 0.7, by); ctx.lineTo(bx + bw * 0.58, by - 52); ctx.lineTo(bx + bw * 0.42, by - 52); ctx.closePath(); ctx.fill();
  // conveyor
  ctx.fillStyle = '#b9cfdf'; ctx.fillRect(x, baseY, w, 14);
  ctx.fillStyle = '#8fa9bd';
  for (let px = x + 8; px < x + w; px += 46) ctx.fillRect(px, baseY + 3, 26, 8);
  // packs
  ctx.fillStyle = accent;
  for (let i = 0; i < 3; i++) { ctx.globalAlpha = 0.75; ctx.beginPath(); ctx.roundRect(x + 30 + i * 90, baseY - 20, 40, 20, 4); ctx.fill(); }
  ctx.globalAlpha = 1;
  // label
  ctx.fillStyle = '#21374c'; ctx.font = '700 34px -apple-system, Segoe UI, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText(name, x + w / 2, baseY + 58);
}
function stillCanvas(name: string, accent: string): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = PALETTE_BG; ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = '#dfeaf2'; ctx.fillRect(0, 0, 1280, 120); // ceiling band
  drawMachine(ctx, 140, 1000, 720, name, accent);
  ctx.fillStyle = '#7a8fa2'; ctx.font = '600 20px -apple-system, Segoe UI, sans-serif'; ctx.textAlign = 'right';
  ctx.fillText('DEMO FOOTAGE', 1250, 700);
  return c;
}
const toJpeg = (c: HTMLCanvasElement): Promise<Blob> =>
  new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('canvas'))), 'image/jpeg', 0.86));

async function makeStill(name: string, accent: string): Promise<string> {
  const key = `blob-${uid()}`;
  await putBlob(key, await toJpeg(stillCanvas(name, accent)));
  return key;
}
async function makeAfterPhoto(name: string, accent: string): Promise<string> {
  const c = stillCanvas(name, accent);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#1f8a4c'; ctx.beginPath(); ctx.roundRect(40, 40, 330, 64, 12); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = '800 34px -apple-system, Segoe UI, sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('✓ FIXED', 64, 84);
  const key = `blob-${uid()}`;
  await putBlob(key, await toJpeg(c));
  return key;
}

/** A 12-second stylized walk past the line, recorded from a canvas animation.
 *  Best-effort: browsers without canvas MediaRecorder just skip the footage
 *  (the stills still carry the walk). */
async function recordWalkVideo(assets: Array<{ name: string; accent: string }>, onNote: (s: string) => void): Promise<{ videoKey: string; posterKey?: string; durationS: number }> {
  const videoKey = `blob-${uid()}`;
  const durationS = 12;
  const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
  const ctx = c.getContext('2d')!;
  const totalW = assets.length * 1100 + 400;
  const drawFrame = (t: number) => { // t 0..1
    ctx.fillStyle = PALETTE_BG; ctx.fillRect(0, 0, 1280, 720);
    ctx.fillStyle = '#dfeaf2'; ctx.fillRect(0, 0, 1280, 120);
    const camX = t * (totalW - 1280);
    ctx.save(); ctx.translate(-camX, 0);
    assets.forEach((a, i) => drawMachine(ctx, 200 + i * 1100, 1000, 720, a.name, a.accent));
    ctx.restore();
    ctx.fillStyle = 'rgba(33,55,76,0.75)'; ctx.beginPath(); ctx.roundRect(24, 24, 260, 44, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '600 22px -apple-system, Segoe UI, sans-serif'; ctx.textAlign = 'left';
    ctx.fillText(`Line walk · ${(t * durationS).toFixed(1)}s`, 40, 53);
  };
  drawFrame(0);
  try {
    const stream = (c as HTMLCanvasElement & { captureStream: (fps: number) => MediaStream }).captureStream(30);
    const rec = new MediaRecorder(stream, { mimeType: 'video/webm', videoBitsPerSecond: 2_000_000 });
    const chunks: Blob[] = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    const done = new Promise<void>(res => { rec.onstop = () => res(); });
    onNote('recording walk footage…');
    rec.start(250);
    const t0 = performance.now();
    await new Promise<void>(res => {
      const tick = () => {
        const t = (performance.now() - t0) / (durationS * 1000);
        drawFrame(Math.min(1, t));
        if (t >= 1) { rec.stop(); res(); } else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    await done;
    await putBlob(videoKey, new Blob(chunks, { type: 'video/webm' }));
  } catch { /* no MediaRecorder — stills still tell the story */ }
  let posterKey: string | undefined;
  try { drawFrame(0.04); posterKey = `blob-${uid()}`; await putBlob(posterKey, await toJpeg(c)); } catch { /* optional */ }
  return { videoKey, posterKey, durationS };
}


/* ---------- REAL footage, when the deployment carries it ----------
 * Drop any properly licensed clip (Pexels/Pixabay are free for commercial
 * use) at public/demo/footage.mp4 or .webm and the walk uses IT: the video
 * plays in the app and the machine stills are frozen from its real frames,
 * captioned per machine. Without a clip, the drawn line stands in. */
async function fetchRealFootage(): Promise<Blob | null> {
  for (const path of ['/demo/footage.mp4', '/demo/footage.webm']) {
    try {
      const r = await fetch(path);
      if (!r.ok) continue;
      const b = await r.blob();
      if (b.size > 50_000) return b.type.startsWith('video') ? b : b.slice(0, b.size, path.endsWith('.mp4') ? 'video/mp4' : 'video/webm');
    } catch { /* absent — drawn fallback */ }
  }
  return null;
}

/** Freeze a real frame at `t` seconds, cover-cropped to 1280×720, with the
 *  machine's name captioned — the still the pins live on. */
function frameFromVideo(blob: Blob, t: number, label: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement('video');
    v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    const fail = (e: unknown) => { URL.revokeObjectURL(url); reject(e instanceof Error ? e : new Error('frame')); };
    v.onerror = fail;
    v.onloadedmetadata = () => { try { v.currentTime = Math.min(t, Math.max(0, (v.duration || t) - 0.2)); } catch (e) { fail(e); } };
    v.onseeked = () => {
      try {
        const c = document.createElement('canvas'); c.width = 1280; c.height = 720;
        const ctx = c.getContext('2d')!;
        const vw = v.videoWidth || 1280, vh = v.videoHeight || 720;
        const scale = Math.max(1280 / vw, 720 / vh);
        const dw = vw * scale, dh = vh * scale;
        ctx.drawImage(v, (1280 - dw) / 2, (720 - dh) / 2, dw, dh);
        // caption band: the machine's name, so every still is unmistakable
        ctx.fillStyle = 'rgba(33,55,76,0.82)'; ctx.beginPath(); ctx.roundRect(24, 636, 24 + label.length * 19 + 36, 56, 12); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 32px -apple-system, Segoe UI, sans-serif'; ctx.textAlign = 'left';
        ctx.fillText(label, 48, 675);
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '600 18px -apple-system, Segoe UI, sans-serif'; ctx.textAlign = 'right';
        ctx.fillText('DEMO', 1256, 700);
        URL.revokeObjectURL(url);
        c.toBlob(b => (b ? resolve(b) : reject(new Error('canvas'))), 'image/jpeg', 0.86);
      } catch (e) { fail(e); }
    };
  });
}

/* ---------- the event table: what a packing hall actually loses ---------- */
interface EventKind {
  asset: string; category: string; sub?: string;
  meanMin: number; weight: number;
  nightsX?: number; // shift bias
  /** weight/mean overrides over time — the story arcs */
  arc?: (daysAgo: number) => { weight?: number; meanMin?: number };
}
const FIX_STUDY_START = 21; // film-snag study armed 21d ago (the win)
const KINDS: EventKind[] = [
  { asset: 'Flow wrapper', category: 'Minor stop', sub: 'Film / packaging snag', meanMin: 7, weight: 3.1,
    arc: d => (d <= FIX_STUDY_START ? { weight: 1.0, meanMin: 2.4 } : {}) }, // the proven fix
  { asset: 'Whole line', category: 'Changeover', sub: 'Allergen changeover', meanMin: 34, weight: 1.9, nightsX: 2.2 },
  { asset: 'Whole line', category: 'Changeover', sub: 'Product change', meanMin: 17, weight: 1.7 },
  { asset: 'Tray sealer', category: 'Waiting', sub: 'Starved upstream', meanMin: 9, weight: 1.6 },
  { asset: 'Multihead weigher', category: 'Minor stop', sub: 'Misfeed', meanMin: 3.5, weight: 1.9 },
  { asset: 'Flow wrapper', category: 'Breakdown', sub: 'Mechanical', meanMin: 22, weight: 0.6 },
  { asset: 'Checkweigher', category: 'Quality', sub: 'Underweight reject', meanMin: 4, weight: 1.1 },
  { asset: 'Metal detector', category: 'Quality', sub: 'Foreign body / detector reject', meanMin: 12, weight: 0.4 },
  { asset: 'Case packer', category: 'Breakdown', sub: 'Jam / blockage', meanMin: 6, weight: 1.0 },
  { asset: 'Whole line', category: 'Hygiene & cleaning', sub: 'Unscheduled clean', meanMin: 26, weight: 0.5 },
  { asset: 'Labeller', category: 'Minor stop', sub: 'Sensor trip', meanMin: 2.5, weight: 0.9 },
  { asset: 'Whole line', category: 'Waiting', sub: 'No labour', meanMin: 15, weight: 0.5 },
];
const SHIFTS = [
  { name: 'Days', start: '06:00', end: '14:00', startH: 6 },
  { name: 'Backs', start: '14:00', end: '22:00', startH: 14 },
  { name: 'Nights', start: '22:00', end: '06:00', startH: 22 },
];

function makeObs(ws: Workspace, kind: EventKind, at: number, shiftName: string, durMin: number): Observation {
  const durationMs = Math.round(durMin * MIN);
  return {
    id: uid(), workspaceId: ws.id,
    category: kind.category, subcategory: kind.sub, asset: kind.asset, shift: shiftName,
    startedAt: at, endedAt: at + durationMs, durationMs,
    timing: 'stopwatch', count: 1, media: [],
    createdAt: at + durationMs, updatedAt: at + durationMs,
  };
}

const scopedMs = (obs: Observation[], path: DrillPath, from: number, to: number) =>
  obs.filter(o => o.startedAt >= from && o.startedAt < to &&
    path.every(s => (s.dimension === 'asset' ? o.asset : s.dimension === 'category' ? o.category : s.dimension === 'subcategory' ? (o.subcategory ?? '(none)') : (o.shift ?? '')) === s.value))
    .reduce((a, o) => a + o.durationMs, 0);

/* ---------- the seed ---------- */
export async function seedDemoWorkspace(onProgress?: (note: string) => void): Promise<string> {
  const note = (s: string) => onProgress?.(s);
  const now = Date.now();

  note('creating the workspace…');
  const ws = await createWorkspace(DEMO_NAME, 'food-packing');
  await updateWorkspace({
    ...ws,
    shifts: SHIFTS.map(({ name, start, end }) => ({ name, start, end })),
    crew: 6, labourRatePerHour: 14.2, labourBurden: 1.3,
    packsPerMin: 110, marginPerPack: 0.035,
  });

  // ---- 14 weeks of observations, three shifts, story arcs ----
  note('generating 14 weeks of observations…');
  const obs: Observation[] = [];
  for (let d = 97; d >= 0; d--) {
    const day = new Date(now - d * DAY); day.setHours(0, 0, 0, 0);
    const dow = day.getDay();
    if (dow === 0) continue;                    // Sundays quiet
    const dayFactor = dow === 6 ? 0.4 : 1;      // Saturdays lighter
    for (const sh of SHIFTS) {
      const n = Math.floor(rnd() * 2.4 * dayFactor + (rnd() < 0.45 ? 1 : 0));
      for (let i = 0; i < n; i++) {
        // weighted pick with arc + shift bias applied
        const weights = KINDS.map(k => {
          const arc = k.arc?.(d) ?? {};
          let w = arc.weight ?? k.weight;
          if (sh.name === 'Nights' && k.nightsX) w *= k.nightsX;
          return w;
        });
        const total = weights.reduce((a, b) => a + b, 0);
        let r = rnd() * total, idx = 0;
        while (r > weights[idx]) { r -= weights[idx]; idx++; }
        const kind = KINDS[idx];
        const arc = kind.arc?.(d) ?? {};
        const at = day.getTime() + sh.startH * 3600_000 + Math.floor(rnd() * 7.5 * 3600_000);
        obs.push(makeObs(ws, kind, at, sh.name, jitter(arc.meanMin ?? kind.meanMin)));
      }
    }
  }
  // guarantee the two studies have their samples
  const filmKind = KINDS[0];
  const filmAfter = obs.filter(o => o.asset === 'Flow wrapper' && o.category === 'Minor stop' && o.startedAt >= now - FIX_STUDY_START * DAY).length;
  for (let i = filmAfter; i < 14; i++) {
    const at = now - Math.floor(rnd() * FIX_STUDY_START * DAY * 0.9) - DAY;
    obs.push(makeObs(ws, filmKind, at, SHIFTS[Math.floor(rnd() * 3)].name, jitter(2.4)));
  }
  const allergenKind = KINDS[1];
  const allergenRecent = obs.filter(o => o.subcategory === 'Allergen changeover' && o.startedAt >= now - 4 * DAY).length;
  for (let i = allergenRecent; i < 6; i++) {
    const at = now - Math.floor(rnd() * 3.5 * DAY) - 3600_000;
    obs.push(makeObs(ws, allergenKind, at, rnd() < 0.55 ? 'Nights' : 'Backs', jitter(29)));
  }
  obs.sort((a, b) => a.startedAt - b.startedAt);
  for (const o of obs) await addObservation(o);

  // ---- the walk: footage (REAL when provided), stills, pinned snags ----
  note('preparing the walk footage…');
  const walkAssets = [
    { name: 'Flow wrapper', accent: '#2b87d4' },
    { name: 'Multihead weigher', accent: '#2f9e52' },
    { name: 'Tray sealer', accent: '#d06e12' },
    { name: 'Checkweigher', accent: '#12958f' },
    { name: 'Case packer', accent: '#5e7dd8' },
  ];
  const real = await fetchRealFootage();
  let videoKey: string; let posterKey: string | undefined; let durationS: number;
  const assetStamp = new Map<string, number>();
  const stillKeys = new Map<string, string>();
  if (real) {
    note('freezing stills from the real footage…');
    videoKey = `blob-${uid()}`;
    await putBlob(videoKey, real);
    const meta = await readVideoMeta(real).catch(() => ({ duration: 30, width: 0, height: 0 }));
    durationS = meta.duration || 30;
    for (let i = 0; i < walkAssets.length; i++) {
      const t = Math.max(0.5, durationS * (0.1 + i * (0.8 / walkAssets.length)));
      assetStamp.set(walkAssets[i].name, t);
      try {
        const key = `blob-${uid()}`;
        await putBlob(key, await frameFromVideo(real, t, walkAssets[i].name));
        stillKeys.set(walkAssets[i].name, key);
      } catch { stillKeys.set(walkAssets[i].name, await makeStill(walkAssets[i].name, walkAssets[i].accent)); }
    }
    try { posterKey = `blob-${uid()}`; await putBlob(posterKey, await frameFromVideo(real, Math.min(1, durationS * 0.05), 'Packing hall — line walk')); } catch { posterKey = undefined; }
  } else {
    const rec = await recordWalkVideo(walkAssets, note);
    videoKey = rec.videoKey; posterKey = rec.posterKey; durationS = rec.durationS;
    for (let i = 0; i < walkAssets.length; i++) {
      assetStamp.set(walkAssets[i].name, 1.5 + i * 2.3);
      stillKeys.set(walkAssets[i].name, await makeStill(walkAssets[i].name, walkAssets[i].accent));
    }
  }
  const segId = uid();
  const walkAt = now - 2 * DAY;
  await addSegment({ id: segId, workspaceId: ws.id, sequence: 0, name: 'Packing hall — line walk', videoKey, posterKey, durationS, createdAt: walkAt, updatedAt: walkAt });

  note('pinning the snags…');
  const assetIds = new Map<string, string>();
  for (const a of walkAssets) {
    const id = uid();
    assetIds.set(a.name, id);
    const asset: SnagAsset = {
      id, workspaceId: ws.id, segmentId: segId, timestampS: assetStamp.get(a.name) ?? 2,
      name: a.name, stillKey: stillKeys.get(a.name)!, createdAt: walkAt, updatedAt: walkAt,
    };
    await addSnagAsset(asset);
  }
  interface PinSeed {
    assetName: string; problem: string; xPct: number; yPct: number;
    owner?: string; status?: Snag['status']; raisedDaysAgo: number; dueInDays?: number;
    closedDaysAgo?: number; closeNote?: string; latestUpdate?: string;
    proposedSolution?: string; after?: boolean; linkedObsIds?: string[];
  }
  const linkable = obs.filter(o => o.asset === 'Flow wrapper' && o.subcategory === 'Film / packaging snag').slice(-3).map(o => o.id);
  const pinned: PinSeed[] = [
    { assetName: 'Flow wrapper', problem: 'Film reel brake pad worn — reel judders on pull', xPct: 32, yPct: 38, owner: 'Dave', status: 'open', raisedDaysAgo: 6, dueInDays: 4, proposedSolution: 'Replace brake pad, add to PPM', linkedObsIds: linkable },
    { assetName: 'Flow wrapper', problem: 'Guard hinge cracked at infeed', xPct: 68, yPct: 55, owner: 'Sam', status: 'closed', raisedDaysAgo: 18, dueInDays: -10, closedDaysAgo: 11, closeNote: 'New hinge fitted, guard realigned', after: true },
    { assetName: 'Multihead weigher', problem: 'Load cell 7 cover missing', xPct: 45, yPct: 30, owner: 'Marta', status: 'in_progress', raisedDaysAgo: 9, dueInDays: 1, latestUpdate: 'Cover ordered — fitting on next clean-down' },
    { assetName: 'Tray sealer', problem: 'Seal head temperature gauge unreadable', xPct: 55, yPct: 42, raisedDaysAgo: 35 }, // stale on purpose
    { assetName: 'Checkweigher', problem: 'Reject arm air line perished', xPct: 60, yPct: 60, owner: 'Sam', raisedDaysAgo: 8, dueInDays: -1, proposedSolution: 'Replace air line before it fails QA' }, // overdue
    { assetName: 'Case packer', problem: 'Flap folder bolts working loose', xPct: 38, yPct: 48, owner: 'Priya', status: 'closed', raisedDaysAgo: 15, dueInDays: -6, closedDaysAgo: 7, closeNote: 'Thread-locked and torqued' },
  ];
  for (const p of pinned) {
    const raisedAt = now - p.raisedDaysAgo * DAY;
    const s: Snag = {
      id: uid(), workspaceId: ws.id, assetId: assetIds.get(p.assetName), xPct: p.xPct, yPct: p.yPct,
      problem: p.problem, proposedSolution: p.proposedSolution, owner: p.owner,
      status: p.status ?? 'open',
      raisedAt, dueAt: p.dueInDays != null ? startOfDay(now + p.dueInDays * DAY) : undefined,
      latestUpdate: p.latestUpdate, latestUpdateAt: p.latestUpdate ? now - DAY : undefined,
      closedAt: p.closedDaysAgo != null ? now - p.closedDaysAgo * DAY : undefined,
      closeNote: p.closeNote,
      fixedPhotoKey: p.after ? await makeAfterPhoto(p.assetName, '#2b87d4') : undefined,
      linkedObsIds: p.linkedObsIds,
      updatedAt: p.closedDaysAgo != null ? now - p.closedDaysAgo * DAY : raisedAt,
    };
    await addSnag(s);
  }

  // ---- the cases: one proven win, one live fight ----
  note('opening the cases…');
  const winPath: DrillPath = [{ dimension: 'asset', value: 'Flow wrapper' }, { dimension: 'category', value: 'Minor stop' }];
  const winOpened = now - 30 * DAY;
  const winBaseline = Math.round(scopedMs(obs, winPath, winOpened - 28 * DAY, winOpened) / 4);
  const winCase: Case = {
    id: uid(), workspaceId: ws.id, title: 'Film snags — Flow wrapper', path: winPath,
    note: 'Film keeps snapping at speed; worst on fresh reels. Found on the 14 Jul walk.',
    whys: [
      'The film snaps at the splice under tension',
      'Splices are prepared by eye at roll change',
      'There is no splice jig or standard for roll changes',
      'Roll changes are rushed at shift handover',
    ],
    baselineMsWeek: winBaseline, targetMsWeek: Math.round(winBaseline / 2),
    study: { startedAt: now - FIX_STUDY_START * DAY, targetN: 12, closedAt: now - 6 * DAY },
    status: 'open', openedAt: winOpened, updatedAt: now - 6 * DAY,
  };
  await addCase(winCase);

  const livePath: DrillPath = [{ dimension: 'category', value: 'Changeover' }, { dimension: 'subcategory', value: 'Allergen changeover' }];
  const liveOpened = now - 10 * DAY;
  const liveBaseline = Math.round(scopedMs(obs, livePath, liveOpened - 28 * DAY, liveOpened) / 4);
  const liveCase: Case = {
    id: uid(), workspaceId: ws.id, title: 'Allergen changeovers — worst on Nights', path: livePath,
    note: 'The shift cut showed Nights lose nearly twice what Days do on the same changeover.',
    whys: [
      'The full clean is done with the line already stopped',
      'Nothing is staged — the crew fetch kit mid-changeover',
    ],
    baselineMsWeek: liveBaseline, targetMsWeek: Math.round(liveBaseline * 0.6),
    study: { startedAt: now - 4 * DAY, targetN: 10 },
    status: 'open', openedAt: liveOpened, updatedAt: now - DAY,
  };
  await addCase(liveCase);

  // ---- the actions (board actions with the tracker's full teeth) ----
  note('raising the actions…');
  const mk = (a: Partial<Snag> & { problem: string; raisedDaysAgo: number }): Snag => ({
    id: uid(), workspaceId: ws.id, problem: a.problem,
    targetCategory: a.targetCategory, targetSubcategory: a.targetSubcategory, targetAsset: a.targetAsset,
    caseId: a.caseId, owner: a.owner, status: (a.status ?? 'open') as Snag['status'],
    raisedAt: now - a.raisedDaysAgo * DAY,
    dueAt: a.dueAt, latestUpdate: a.latestUpdate, latestUpdateAt: a.latestUpdate ? now - DAY : undefined,
    closedAt: a.closedAt, closeNote: a.closeNote, proposedSolution: a.proposedSolution,
    updatedAt: now - Math.min(a.raisedDaysAgo, 1) * DAY,
  });
  const actions: Snag[] = [
    mk({ problem: 'Build a splice jig + laminated splice standard', caseId: winCase.id, targetAsset: 'Flow wrapper', targetCategory: 'Minor stop', owner: 'Dave', status: 'closed', raisedDaysAgo: 28, dueAt: startOfDay(now - 16 * DAY), closedAt: now - 17 * DAY, closeNote: 'Jig on the reel stand; standard laminated at the wrapper' }),
    mk({ problem: 'Train all packers on the splice standard (5 min at handover)', caseId: winCase.id, targetAsset: 'Flow wrapper', targetCategory: 'Minor stop', owner: 'Priya', status: 'closed', raisedDaysAgo: 24, dueAt: startOfDay(now - 12 * DAY), closedAt: now - 13 * DAY, closeNote: 'All 3 shifts signed off' }),
    mk({ problem: 'Pre-stage the allergen clean kit at the line before changeover', caseId: liveCase.id, targetCategory: 'Changeover', targetSubcategory: 'Allergen changeover', owner: 'Sam', status: 'open', raisedDaysAgo: 9, dueAt: startOfDay(now - 3 * DAY), latestUpdate: 'Kit trolley built — waiting on wheels', proposedSolution: 'Trolley with full kit, staged 30 min before' }),
    mk({ problem: 'Split the clean: external tasks while the line still runs (SMED)', caseId: liveCase.id, targetCategory: 'Changeover', targetSubcategory: 'Allergen changeover', owner: 'Marta', status: 'in_progress', raisedDaysAgo: 8, dueAt: startOfDay(now + 2 * DAY), latestUpdate: 'Trialled on Nights Tue — 41 min down to 28' }),
    mk({ problem: 'Laminate the allergen matrix at each station', caseId: liveCase.id, targetCategory: 'Changeover', targetSubcategory: 'Allergen changeover', owner: 'Dave', status: 'closed', raisedDaysAgo: 9, dueAt: startOfDay(now - 4 * DAY), closedAt: now - 5 * DAY, closeNote: 'Printed, laminated, zip-tied at each station' }),
    mk({ problem: 'Agree film spec review with the supplier', targetAsset: 'Flow wrapper', targetCategory: 'Minor stop', owner: 'Priya', status: 'open', raisedDaysAgo: 41 }), // stale, no due — shows the blunt case
    mk({ problem: 'Fix guard interlock chatter on the case packer', targetAsset: 'Case packer', targetCategory: 'Breakdown', owner: 'Sam', status: 'open', raisedDaysAgo: 5, dueAt: startOfDay(now + 6 * DAY) }),
  ];
  for (const a of actions) await addSnag(a);

  note('done — opening the workspace…');
  return ws.id;
}

const startOfDay = (ms: number): number => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

/* A hook for scripted demos/recordings (harmless in production — it only
 * builds a workspace the owner can delete like any other). */
declare global { interface Window { __faultlineSeedDemo?: typeof seedDemoWorkspace } }
if (typeof window !== 'undefined') window.__faultlineSeedDemo = seedDemoWorkspace;
