/* Client-side video → still extraction: an HTML5 <video> drawn to a <canvas>.
 * No ffmpeg, no server. The video plays from a local blob object URL, so the
 * canvas is same-origin and never tainted. */

/** Draw the video's CURRENT frame to a canvas at native resolution → JPEG blob. */
export async function captureFrame(video: HTMLVideoElement, quality = 0.85): Promise<Blob> {
  const w = video.videoWidth, h = video.videoHeight;
  if (!w || !h) throw new Error('Frame not ready — let the video load and try again.');
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d');
  if (!ctx) throw new Error('No canvas context.');
  ctx.drawImage(video, 0, 0, w, h);
  return new Promise((resolve, reject) => cv.toBlob(b => (b ? resolve(b) : reject(new Error('Frame encode failed'))), 'image/jpeg', quality));
}

export interface VideoMeta { duration: number; width: number; height: number; }

export function readVideoMeta(file: Blob): Promise<VideoMeta> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { const m = { duration: v.duration || 0, width: v.videoWidth, height: v.videoHeight }; URL.revokeObjectURL(url); resolve(m); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read the video.')); };
    v.src = url;
  });
}

/** Grab a poster thumbnail from near the first frame of a local video File. */
export function posterFromVideo(file: Blob, quality = 0.7): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'auto'; v.muted = true;
    let done = false;
    const finish = (fn: () => void) => { if (done) return; done = true; URL.revokeObjectURL(url); fn(); };
    v.onloadeddata = () => { try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); } catch { /* ignore */ } };
    v.onseeked = async () => { try { const b = await captureFrame(v, quality); finish(() => resolve(b)); } catch (e) { finish(() => reject(e instanceof Error ? e : new Error('poster failed'))); } };
    v.onerror = () => finish(() => reject(new Error('Could not read the video for a poster.')));
    v.src = url;
  });
}
