/* Convert phone footage into something every device can play.
 *
 * Phones record HEVC/H.265. A laptop browser decodes such a file's audio and
 * not its picture, so a walk filmed on a phone was unwatchable on the machine
 * people actually review it on. Telling users to film differently isn't a fix —
 * the footage has to be made portable on the way in.
 *
 * The device that shot it can always decode it, so we re-encode there: play the
 * clip into a MediaStream and record that stream back out in a portable codec.
 * No dependencies, no server. The cost is that it runs at playback speed, which
 * is why the caller shows progress rather than a spinner.
 *
 * Deliberately narrow: only footage we KNOW travels badly is touched. Anything
 * already portable is stored byte-for-byte, with no quality loss. */
import { sniffVideoCodec, browserCanPlay } from './mime';

type Capturable = HTMLVideoElement & {
  captureStream?: () => MediaStream;
  mozCaptureStream?: () => MediaStream;
};

const captureFrom = (v: Capturable): MediaStream | null => {
  const fn = v.captureStream ?? v.mozCaptureStream;
  return fn ? fn.call(v) : null;
};

/** Codecs that play essentially everywhere. HEVC is the notable absentee. */
function portableMimeType(): string | undefined {
  return [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=avc1',
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ].find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m));
}

export function transcodeSupported(): boolean {
  if (typeof MediaRecorder === 'undefined') return false;
  const v = document.createElement('video') as Capturable;
  return !!(v.captureStream || v.mozCaptureStream) && !!portableMimeType();
}

/** Would this clip fail to play on other devices? Only a positive
 *  identification counts — never re-encode something we merely can't name.
 *  `__FORCE_TRANSCODE__` is a test hook: browsers can't fabricate real HEVC,
 *  so the smoke suites set it to push synthetic footage down the convert path. */
export async function needsTranscode(blob: Blob): Promise<boolean> {
  if ((globalThis as { __FORCE_TRANSCODE__?: boolean }).__FORCE_TRANSCODE__) return true;
  const codec = await sniffVideoCodec(blob);
  return !!codec && codec.startsWith('HEVC');
}

export interface TranscodeResult {
  blob: Blob;
  converted: boolean;
  /** Set when conversion was needed but couldn't be done here. */
  reason?: 'unsupported' | 'cannot-decode' | 'failed' | 'too-long';
}

/**
 * Re-encode `blob` to a portable codec, reporting 0..1 progress.
 * Always resolves: on any failure the ORIGINAL is returned with a reason, since
 * storing the clip we were given beats losing the footage.
 */
export async function toPortableVideo(
  blob: Blob,
  onProgress?: (fraction: number) => void,
): Promise<TranscodeResult> {
  if (!transcodeSupported()) return { blob, converted: false, reason: 'unsupported' };

  const url = URL.createObjectURL(blob);
  const video = document.createElement('video') as Capturable;
  let recorder: MediaRecorder | null = null;
  const cleanup = () => {
    try { if (recorder && recorder.state !== 'inactive') recorder.stop(); } catch { /* already stopped */ }
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
  };

  try {
    video.src = url;
    video.muted = true;          // don't blast the clip's audio while converting
    video.playsInline = true;
    video.preload = 'auto';

    const meta = await new Promise<{ w: number; duration: number } | null>(resolve => {
      const t = setTimeout(() => resolve(null), 20_000);
      video.onloadedmetadata = () => { clearTimeout(t); resolve({ w: video.videoWidth, duration: video.duration }); };
      video.onerror = () => { clearTimeout(t); resolve(null); };
    });

    // No picture here either — this device can't decode it, so it can't convert
    // it. (Happens if the file is uploaded from the laptop rather than the phone.)
    if (!meta || !meta.w) { cleanup(); return { blob, converted: false, reason: 'cannot-decode' }; }

    const mimeType = portableMimeType()!;
    // Enough bitrate that a re-encode doesn't visibly soften the detail people
    // are looking for, capped so a long walk doesn't balloon on disk.
    const pixels = meta.w * (video.videoHeight || 720);
    const bitrate = Math.min(8_000_000, Math.max(2_500_000, Math.round(pixels * 4)));
    const total = Number.isFinite(meta.duration) && meta.duration > 0 ? meta.duration : 0;
    video.ontimeupdate = () => { if (total) onProgress?.(Math.min(1, video.currentTime / total)); };

    /* One pass. `keepAudio: false` drops the audio track, which some platforms
     * capture as "live" while never actually delivering samples — the muxer
     * then waits on it forever and the whole recording comes out empty. We only
     * pay that cost if the first pass proves it's happening. */
    const record = async (keepAudio: boolean): Promise<Blob | null> => {
      const stream = captureFrom(video);
      if (!stream) return null;
      if (!keepAudio) stream.getAudioTracks().forEach(t => stream.removeTrack(t));

      const chunks: Blob[] = [];
      const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate });
      recorder = rec;
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise<void>(res => { rec.onstop = () => res(); });

      video.currentTime = 0;
      rec.start(500);
      await video.play();

      // Is anything actually coming out? If not, this pass is dead — bail early
      // rather than sitting through the whole clip to find out.
      const flowing = await new Promise<boolean>(res => {
        const iv = setInterval(() => { if (chunks.length) { clearInterval(iv); clearTimeout(to); res(true); } }, 100);
        const to = setTimeout(() => { clearInterval(iv); res(chunks.length > 0); }, 3000);
      });
      if (!flowing) {
        try { rec.stop(); } catch { /* already inactive */ }
        await stopped.catch(() => {});
        video.pause();
        return null;
      }

      await new Promise<void>(res => {
        const done = () => res();
        video.onended = done;
        // Safety net: a stalled decode must not hang the import forever.
        setTimeout(done, (total ? total * 1000 : 60_000) * 2 + 15_000);
      });

      try { rec.stop(); } catch { /* already inactive */ }
      await stopped;
      const out = new Blob(chunks, { type: mimeType.split(';')[0] });
      return out.size >= 1024 ? out : null;
    };

    // Sound is worth keeping, but a picture that plays everywhere is the point.
    const out = (await record(true)) ?? (await record(false));
    onProgress?.(1);
    cleanup();
    if (!out) return { blob, converted: false, reason: 'failed' };
    return { blob: out, converted: true };
  } catch {
    cleanup();
    return { blob, converted: false, reason: 'failed' };
  }
}

/** Import a video: convert only if it wouldn't otherwise travel. */
export async function prepareVideoForImport(
  blob: Blob,
  onProgress?: (fraction: number) => void,
): Promise<TranscodeResult> {
  if (!(await needsTranscode(blob))) return { blob, converted: false };
  return toPortableVideo(blob, onProgress);
}

/** True when this browser can play what we're about to store. Used to warn
 *  honestly when a conversion couldn't happen on this device. */
export async function playableHere(blob: Blob): Promise<boolean> {
  return browserCanPlay(await sniffVideoCodec(blob));
}

/* ---------- MAKING A FILM FIT THE CLOUD ----------
 *
 * Rowland, on the phone's Backup: "4 files too large for the cloud (55 MB,
 * 91 MB, 100 MB, 345 MB; the limit is 50 MB) - only on this device". Films
 * picked from the phone's own camera roll are whatever the camera made of
 * them — 1080p or 4K at 30 to 170 MB a minute — and the cloud takes 50 MB a
 * file (Supabase's limit on the free plan, which cannot be raised there). A
 * film over it stays on the phone that took it, and the laptop never sees it.
 *
 * So a film over the limit is re-made smaller on the device that holds it:
 * played into a canvas no bigger than 720p and recorded back out at the
 * bitrate its length allows — the same 1.5 Mbps the app's own recorder uses
 * when it fits, less for a long walk. It is the same clip, a softer picture.
 *
 * THROUGH A CANVAS, not the video element's own stream, because iPhone
 * Safari has no captureStream() on a video — it does on a canvas. The sound
 * goes through Web Audio, and is dropped rather than the film when this
 * browser will not hand it over. Runs at playback speed, so the screen is
 * kept awake and the caller shows progress. Any failure returns the ORIGINAL:
 * a film too big to send beats a film lost. */

/** Supabase's limit for one file (the `media` bucket sets none of its own). */
export const CLOUD_FILE_LIMIT = 50 * 1024 * 1024;

const FIT_AUDIO = 64_000;
const FIT_MAX_VIDEO = 1_500_000;
const FIT_MIN_VIDEO = 200_000;

/** The size and bitrate that bring a film of this length under `limit`, or
 *  null when even the lowest bitrate worth watching cannot. 85% of the limit
 *  is aimed at: recorders overshoot, and the container costs a little. */
export function fitPlan(durationS: number, w: number, h: number, limit: number):
  { width: number; height: number; videoBps: number; audioBps: number } | null {
  if (!(durationS > 0) || !w || !h) return null;
  const videoBps = Math.min(FIT_MAX_VIDEO, Math.floor((limit * 0.85 * 8) / durationS - FIT_AUDIO));
  if (videoBps < FIT_MIN_VIDEO) return null;
  const side = videoBps >= 800_000 ? 1280 : 854;      // 720p while there is room for it, 480p when there is not
  const k = Math.min(1, side / Math.max(w, h));
  const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);
  return { width: even(w * k), height: even(h * k), videoBps, audioBps: FIT_AUDIO };
}

const seekTo = (v: HTMLVideoElement, t: number) => { v.currentTime = t; };
const playMuted = (v: HTMLVideoElement) => { v.muted = true; return v.play(); };
type WithFrames = HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
type WakeLock = { release: () => Promise<void> };

/** A film made small enough for the cloud, reporting 0..1 progress. */
export async function fitVideo(
  blob: Blob,
  limit: number = CLOUD_FILE_LIMIT,
  onProgress?: (fraction: number) => void,
): Promise<TranscodeResult> {
  if (blob.size <= limit) return { blob, converted: false };
  const mimeType = portableMimeType();
  const probe = document.createElement('canvas') as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream };
  if (!mimeType || typeof probe.captureStream !== 'function') return { blob, converted: false, reason: 'unsupported' };

  const url = URL.createObjectURL(blob);
  const video = document.createElement('video') as WithFrames;
  let wake: WakeLock | null = null;
  let audio: AudioContext | null = null;
  let drawing = true;
  const cleanup = () => {
    drawing = false;
    video.pause();
    video.removeAttribute('src');
    video.load();
    URL.revokeObjectURL(url);
    void audio?.close().catch(() => undefined);
    void wake?.release().catch(() => undefined);
  };

  try {
    video.src = url;
    video.playsInline = true;
    video.preload = 'auto';
    const ok = await new Promise<boolean>(resolve => {
      const t = setTimeout(() => resolve(false), 20_000);
      video.onloadedmetadata = () => { clearTimeout(t); resolve(true); };
      video.onerror = () => { clearTimeout(t); resolve(false); };
    });
    if (!ok || !video.videoWidth) { cleanup(); return { blob, converted: false, reason: 'cannot-decode' }; }
    /* A recorder's own webm says its length is Infinity until it has been
       read to the end; seeking far past it makes the browser find out. */
    if (!Number.isFinite(video.duration)) {
      await new Promise<void>(res => { video.ondurationchange = () => { if (Number.isFinite(video.duration)) res(); }; video.currentTime = 1e9; setTimeout(res, 5000); });
      seekTo(video, 0);
    }
    const total = video.duration;
    const plan = fitPlan(total, video.videoWidth, video.videoHeight, limit);
    if (!plan) { cleanup(); return { blob, converted: false, reason: Number.isFinite(total) ? 'too-long' : 'cannot-decode' }; }

    try { wake = await (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLock> } }).wakeLock?.request('screen') ?? null; }
    catch { wake = null; }   // a phone that will not stay awake still converts while the screen is on

    const canvas = document.createElement('canvas') as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream };
    canvas.width = plan.width; canvas.height = plan.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) { cleanup(); return { blob, converted: false, reason: 'unsupported' }; }
    const stream = canvas.captureStream(30);

    /* The sound, if this browser will give it: the element's output goes to
       the recording only, never the speaker. */
    let withSound = false;
    try {
      audio = new AudioContext();
      const dest = audio.createMediaStreamDestination();
      audio.createMediaElementSource(video).connect(dest);
      dest.stream.getAudioTracks().forEach(t => stream.addTrack(t));
      await audio.resume();
      withSound = stream.getAudioTracks().length > 0;
    } catch { withSound = false; }

    const run = async (videoBps: number): Promise<Blob | null> => {
      const chunks: Blob[] = [];
      let rec: MediaRecorder;
      try { rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: videoBps, audioBitsPerSecond: plan.audioBps }); }
      catch { rec = new MediaRecorder(stream, { mimeType }); }
      rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      const stopped = new Promise<void>(res => { rec.onstop = () => res(); });
      const draw = () => {
        if (!drawing) return;
        ctx.drawImage(video, 0, 0, plan.width, plan.height);
        if (video.ended) return;
        if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(draw); else requestAnimationFrame(draw);
      };
      video.currentTime = 0;
      video.muted = !withSound;
      video.ontimeupdate = () => onProgress?.(Math.min(1, video.currentTime / total));
      rec.start(1000);
      try { await video.play(); }
      catch {
        /* Sound refused (a phone that wants a tap for every unmuted play):
           the picture is the point — go again without it. */
        stream.getAudioTracks().forEach(t => stream.removeTrack(t));
        await playMuted(video);
      }
      draw();
      await new Promise<void>(res => {
        video.onended = () => res();
        setTimeout(res, total * 1000 * 2 + 15_000);   // a stalled decode must not hang for ever
      });
      try { rec.stop(); } catch { /* already inactive */ }
      await stopped;
      /* Only a film played to its end is a film: a screen locked half way
         (the frames stop) would otherwise save the first half as the whole. */
      if (!video.ended && video.currentTime < total - 0.5) return null;
      const out = new Blob(chunks, { type: mimeType.split(';')[0] });
      return out.size >= 1024 ? out : null;
    };

    let out = await run(plan.videoBps);
    // Over after all — recorders do not always keep to the rate asked. Once more, as much lower as it missed by.
    if (out && out.size > limit) out = await run(Math.max(FIT_MIN_VIDEO, Math.floor(plan.videoBps * (limit * 0.8) / out.size)));
    onProgress?.(1);
    cleanup();
    if (!out || out.size > limit) return { blob, converted: false, reason: 'failed' };
    return { blob: out, converted: true };
  } catch {
    cleanup();
    return { blob, converted: false, reason: 'failed' };
  }
}
