/* THE PHONE CHECK, RUN on the phone's own camera (lib/video/phoneCheck says
 * what it found; screens/VideoCheckScreen is its page).
 *
 * It does what the long study would do, for as long as it is asked: the rear
 * camera read five times a second at the reading's width, each third of the
 * picture's change worked out as a station's is (lib/video/extract); the
 * steady check on every frame (lib/video/steady); clips of thirty seconds
 * written one over the next by a second (scripts/video-feasibility.mjs B:
 * overlapping loses nothing, starting anew loses a frame or two), each tried
 * on its own and then let go but the last; the screen asked to stay on; the
 * reading so far saved on the phone every ten seconds; the battery, the app
 * going out of sight and the camera being stopped, each noted with its time.
 * Nothing leaves the phone, and what it saved is deleted when it ends. */
import { changeByZone, toGrey } from './extract';
import { SteadyCheck, steadyWindows, type SteadyMark, type SteadyWord } from './steady';
import type { PhoneClip, PhoneMinute, PhoneOffers, PhoneRun } from './phoneCheck';
import type { VideoZone } from './record';

export const SAMPLE_SEC = 0.2, READ_WIDTH = 160, CLIP_SEC = 30, BITRATE = 1_000_000, SAVE_SEC = 10;
const DB = 'fl-phone-check';

type WakeLock = { released?: boolean; release: () => Promise<void>; addEventListener: (e: 'release', f: () => void) => void };
type BatteryManager = { level: number; charging: boolean };
type Nav = Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLock> }; getBattery?: () => Promise<BatteryManager>; deviceMemory?: number };

/** What the browser offers, asked without asking the person anything. */
export async function phoneOffers(recorder?: string): Promise<PhoneOffers> {
  const nav = navigator as Nav;
  let storage: PhoneOffers['storage'], persisted: boolean | undefined;
  try { const e = await navigator.storage?.estimate?.(); if (e?.quota) storage = { quota: e.quota, usage: e.usage ?? 0 }; } catch { /* not said */ }
  try { persisted = await navigator.storage?.persisted?.(); } catch { /* not said */ }
  return {
    ...(recorder ? { recorder } : {}),
    wakeLock: !!nav.wakeLock,
    frameCallback: typeof HTMLVideoElement !== 'undefined' && 'requestVideoFrameCallback' in HTMLVideoElement.prototype,
    trackProcessor: typeof (window as unknown as { MediaStreamTrackProcessor?: unknown }).MediaStreamTrackProcessor !== 'undefined',
    battery: typeof nav.getBattery === 'function',
    ...(storage ? { storage } : {}),
    ...(persisted !== undefined ? { persisted } : {}),
    ...(nav.hardwareConcurrency ? { cores: nav.hardwareConcurrency } : {}),
    ...(nav.deviceMemory ? { memoryGB: nav.deviceMemory } : {}),
    ua: nav.userAgent,
  };
}

/** Whether a clip plays on its own, and how long it runs. */
export async function playsAlone(blob: Blob): Promise<{ plays: boolean; duration?: number }> {
  const v = document.createElement('video');
  v.muted = true; v.preload = 'auto'; v.playsInline = true;
  const url = URL.createObjectURL(blob);
  try {
    const ok = await new Promise<boolean>(res => { v.onloadeddata = () => res(true); v.onerror = () => res(false); v.src = url; setTimeout(() => res(false), 8000); });
    if (!ok) return { plays: false };
    let d = v.duration;
    /* a recorder's WebM says no length until its end is sought */
    if (!Number.isFinite(d)) d = await new Promise<number>(res => { v.ontimeupdate = () => { v.ontimeupdate = null; res(v.duration); }; v.currentTime = 1e9; setTimeout(() => res(v.duration), 8000); });
    return { plays: v.readyState >= 2, ...(Number.isFinite(d) ? { duration: Math.round(d * 10) / 10 } : {}) };
  } finally { v.removeAttribute('src'); v.load(); URL.revokeObjectURL(url); }
}

/** What the page shows while it runs. */
export interface PhoneLive { sec: number; samples: number; rate: number; costMs: number; clips: number; clipsBad: number; word: SteadyWord | 'looking'; levels: number[]; wake: boolean; hidden: number }

export class PhoneTest {
  private t0 = 0;
  private running = false;
  private finished = false;
  private stream?: MediaStream;
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  private prev?: Uint8ClampedArray;
  private steady?: SteadyCheck;
  /* kept here, not on the check, so a phone turned part way (a new first frame) keeps what came before */
  private marks: SteadyMark[] = [];
  private tickTimer?: number;
  private sig: { times: number[]; zones: number[][] };
  private costs: number[] = [];
  private checks: number[] = [];
  private levels: number[] = [];
  private timers: number[] = [];
  private recs: { rec: MediaRecorder; at: number; parts: Blob[]; done: Promise<void> }[] = [];
  private clips: PhoneClip[] = [];
  private lastClip?: Blob;
  private wake: PhoneRun['wake'] = { offered: false, held: false, lost: [] };
  private lock?: WakeLock;
  private hidden: PhoneRun['hidden'] = [];
  private hiddenAt?: number;
  private paused: NonNullable<PhoneRun['paused']> = [];
  private pausedAt?: number;
  private cameraStopped?: number;
  private battery?: BatteryManager;
  private batteryStart?: number;
  private db?: IDBDatabase;
  private saves: number[] = [];
  private saveFailed?: string;
  private minutes: PhoneMinute[] = [];
  private minute = { start: 0, samples: 0, cost: 0, hidden: false };
  private camera?: PhoneRun['camera'];

  constructor(private readonly o: {
    seconds: number; mime?: string; zones: readonly VideoZone[]; video: HTMLVideoElement;
    onLive: (l: PhoneLive) => void; onDone: (run: PhoneRun, lastClip?: Blob) => void;
  }) {
    this.sig = { times: [], zones: o.zones.map(() => []) };
  }

  private now = () => (performance.now() - this.t0) / 1000;

  async start(): Promise<void> {
    this.t0 = performance.now();
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } }, audio: false });
    } catch (e) {
      const name = (e as Error)?.name;
      this.finish('error', name === 'NotAllowedError' ? 'the camera was refused — allow it for this site in the browser’s settings' : name === 'NotFoundError' ? 'this phone has no camera the browser can use' : 'the camera did not open');
      return;
    }
    this.running = true;
    const track = this.stream.getVideoTracks()[0];
    const st = track.getSettings();
    this.camera = { width: st.width ?? 0, height: st.height ?? 0, ...(st.frameRate ? { frameRate: Math.round(st.frameRate) } : {}), ...(track.label ? { label: track.label } : {}) };
    track.addEventListener('ended', () => { if (this.running) { this.cameraStopped = this.now(); void this.stop('camera'); } });
    /* held back while in sight: the picture would freeze, and a frozen picture reads as a still line */
    track.addEventListener('mute', () => { if (this.running && document.visibilityState === 'visible') this.pausedAt = this.now(); });
    track.addEventListener('unmute', () => { if (this.pausedAt !== undefined) { this.paused.push({ at: this.pausedAt, sec: this.now() - this.pausedAt }); this.pausedAt = undefined; } });
    const v = this.o.video;
    v.muted = true; v.playsInline = true; v.srcObject = this.stream;
    try { await v.play(); } catch { /* the frames still come to the canvas */ }
    document.addEventListener('visibilitychange', this.onVisible);
    await this.keepAwake();
    try { await navigator.storage?.persist?.(); } catch { /* said on the room's line */ }
    const nav = navigator as Nav;
    try { if (nav.getBattery) { this.battery = await nav.getBattery(); this.batteryStart = this.battery.level; } } catch { /* not told */ }
    try { this.db = await openDb(); } catch (e) { this.saveFailed = (e as Error)?.message || 'the phone’s storage refused it'; }
    if (this.o.mime && typeof MediaRecorder !== 'undefined') this.startClip();
    this.timers.push(window.setTimeout(() => void this.stop('done'), this.o.seconds * 1000));
    this.tick(0);
  }

  /** Stopped by the person, by the time running out, or by the phone taking the camera. */
  async stop(why: 'done' | 'stopped' | 'camera' = 'stopped'): Promise<void> {
    if (!this.running) return;
    this.running = false;
    this.timers.forEach(t => window.clearTimeout(t));
    window.clearTimeout(this.tickTimer);
    document.removeEventListener('visibilitychange', this.onVisible);
    if (this.hiddenAt !== undefined) { this.hidden.push({ at: this.hiddenAt, sec: this.now() - this.hiddenAt }); this.hiddenAt = undefined; }
    if (this.pausedAt !== undefined) { this.paused.push({ at: this.pausedAt, sec: this.now() - this.pausedAt }); this.pausedAt = undefined; }
    const ranSec = this.now();
    await Promise.all(this.recs.map(r => { if (r.rec.state !== 'inactive') r.rec.stop(); return r.done; }));
    try { await this.lock?.release(); } catch { /* already let go */ }
    this.stream?.getTracks().forEach(t => t.stop());
    this.o.video.srcObject = null;
    this.db?.close();
    try { indexedDB.deleteDatabase(DB); } catch { /* nothing kept */ }
    this.finish(why, undefined, ranSec);
  }

  private finish(ended: PhoneRun['ended'], error?: string, ranSec = this.now()): void {
    if (this.finished) return;
    this.finished = true;
    const sorted = [...this.costs].sort((a, b) => a - b);
    const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
    const run: PhoneRun = {
      askedSec: this.o.seconds, ranSec, ended, ...(error ? { error } : {}),
      ...(this.camera ? { camera: this.camera } : {}),
      sampleSec: SAMPLE_SEC, readWidth: READ_WIDTH, samples: this.costs.length,
      costMs: mean(this.costs), costP95Ms: sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))] : 0, checkMs: mean(this.checks),
      ...(this.o.mime ? { mime: this.o.mime } : {}), bitrate: BITRATE, clipSec: CLIP_SEC,
      clips: this.clips, marks: this.marks, wake: this.wake, hidden: this.hidden, ...(this.paused.length ? { paused: this.paused } : {}),
      ...(this.cameraStopped !== undefined ? { cameraStopped: this.cameraStopped } : {}),
      ...(this.battery && this.batteryStart !== undefined ? { battery: { start: this.batteryStart, end: this.battery.level, charging: this.battery.charging } } : {}),
      ...(this.saves.length ? { saveMaxMs: Math.max(...this.saves) } : {}),
      ...(this.saveFailed ? { saveFailed: this.saveFailed } : {}),
      minutes: this.minutes,
    };
    this.o.onDone(run, this.lastClip);
  }

  private onVisible = () => {
    if (document.visibilityState === 'hidden') { this.hiddenAt = this.now(); this.minute.hidden = true; return; }
    if (this.hiddenAt !== undefined) { this.hidden.push({ at: this.hiddenAt, sec: this.now() - this.hiddenAt }); this.hiddenAt = undefined; }
    /* the phone lets go of the screen when the app is out of sight; asked again on its return */
    if (this.running && this.wake.held) void this.keepAwake();
  };

  private async keepAwake(): Promise<void> {
    const nav = navigator as Nav;
    this.wake.offered = !!nav.wakeLock;
    if (!nav.wakeLock) return;
    try {
      const lock = await nav.wakeLock.request('screen');
      this.lock = lock; this.wake.held = true;
      lock.addEventListener('release', () => { if (this.running && document.visibilityState === 'visible') this.wake.lost.push(this.now()); });
    } catch (e) {
      if (!this.wake.held) this.wake.error = (e as Error)?.name || 'refused';
    }
  }

  /** A clip, and the next one started a second before it stops. */
  private startClip(): void {
    if (!this.running || !this.stream || !this.o.mime) return;
    let rec: MediaRecorder;
    try { rec = new MediaRecorder(this.stream, { mimeType: this.o.mime, videoBitsPerSecond: BITRATE }); } catch { return; }
    const entry = { rec, at: this.now(), parts: [] as Blob[], done: Promise.resolve() };
    entry.done = new Promise<void>(resolve => {
      rec.ondataavailable = e => { if (e.data.size) entry.parts.push(e.data); };
      rec.onstop = async () => {
        const blob = new Blob(entry.parts, { type: this.o.mime });
        const p = blob.size ? await playsAlone(blob) : { plays: false };
        this.clips.push({ at: Math.round(entry.at * 10) / 10, bytes: blob.size, ...p });
        if (blob.size) this.lastClip = blob;
        this.recs = this.recs.filter(r => r !== entry);
        resolve();
      };
    });
    rec.start(1000);
    this.recs.push(entry);
    this.timers.push(window.setTimeout(() => {
      if (!this.running) return;
      this.startClip();
      this.timers.push(window.setTimeout(() => { if (rec.state !== 'inactive') rec.stop(); }, 1000));
    }, CLIP_SEC * 1000));
  }

  /** One sample, then the next at its own time — the wait shortened by any lateness. */
  private tick(n: number): void {
    if (!this.running) return;
    const v = this.o.video;
    if (document.visibilityState === 'visible' && this.pausedAt === undefined && v.videoWidth && this.ctx) {
      const t = this.now();
      const a = performance.now();
      const w = READ_WIDTH, h = Math.max(1, Math.round((READ_WIDTH * v.videoHeight) / v.videoWidth));
      if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; this.prev = undefined; this.steady = new SteadyCheck(w, h); }
      this.ctx.drawImage(v, 0, 0, w, h);
      const grey = toGrey(this.ctx.getImageData(0, 0, w, h).data);
      if (this.prev) {
        this.levels = changeByZone(this.prev, grey, w, h, this.o.zones);
        this.sig.times.push(t);
        this.levels.forEach((x, k) => this.sig.zones[k].push(x));
      }
      this.prev = grey;
      const cost = performance.now() - a;
      this.costs.push(cost);
      const b = performance.now();
      const m = this.steady?.add(t, grey);
      if (m) this.marks.push(m.mark);
      this.checks.push(performance.now() - b);
      this.minute.samples++; this.minute.cost += cost;
      if (t - this.minute.start >= 60) {
        this.minutes.push({ minute: this.minutes.length + 1, samples: this.minute.samples, costMs: Math.round((this.minute.cost / Math.max(1, this.minute.samples)) * 10) / 10, ...(this.battery ? { battery: Math.round(this.battery.level * 100) } : {}), hidden: this.minute.hidden });
        this.minute = { start: t, samples: 0, cost: 0, hidden: false };
      }
      if (this.db && Math.floor(t / SAVE_SEC) > Math.floor((t - SAMPLE_SEC) / SAVE_SEC)) void this.save();
      if (n % 5 === 0) this.live();
    }
    this.tickTimer = window.setTimeout(() => this.tick(n + 1), Math.max(0, (n + 1) * SAMPLE_SEC * 1000 - (performance.now() - this.t0)));
  }

  private async save(): Promise<void> {
    const db = this.db;
    if (!db) return;
    const a = performance.now();
    try {
      const rec = { times: Float32Array.from(this.sig.times), zones: this.sig.zones.map(z => Float32Array.from(z)) };
      await new Promise<void>((res, rej) => { const tx = db.transaction('s', 'readwrite'); tx.objectStore('s').put(rec, 'reading'); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
      this.saves.push(performance.now() - a);
    } catch (e) { this.saveFailed = (e as Error)?.message || 'the phone’s storage refused it'; this.db = undefined; }
  }

  private live(): void {
    const marks = this.marks;
    const last = marks.length >= 10 ? steadyWindows(marks.slice(-10))[0] : undefined;
    const sec = this.now();
    const shown = Math.max(1, sec - this.hidden.reduce((s, x) => s + x.sec, 0));
    this.o.onLive({
      sec, samples: this.costs.length, rate: this.costs.length / shown,
      costMs: this.costs.length ? this.costs.reduce((s, x) => s + x, 0) / this.costs.length : 0,
      clips: this.clips.length, clipsBad: this.clips.filter(c => !c.plays).length,
      word: last?.word ?? 'looking', levels: this.levels, wake: !!this.lock && this.lock.released !== true, hidden: this.hidden.length,
    });
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('s');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
