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
  reason?: 'unsupported' | 'cannot-decode' | 'failed';
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
    try { recorder?.state !== 'inactive' && recorder?.stop(); } catch { /* already stopped */ }
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
