/* Evidence capture — "here's the number, watch the problem." Opens the camera
 * on a phone (falls back to a file picker on desktop), stores the blob in the
 * media bag, and makes a small thumbnail for photos. Returns a lightweight
 * MediaRef; heavy blobs never travel with the observation. */
import type { MediaRef } from '../types';
import { putBlob } from '../db';
import { uid, now } from './ids';

function pickFile(kind: 'photo' | 'video'): Promise<File | null> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = kind === 'photo' ? 'image/*' : 'video/*';
    // hint mobile browsers to open the rear camera directly
    input.setAttribute('capture', 'environment');
    input.style.position = 'fixed';
    input.style.top = '-9999px';
    // Some mobile browsers — notably iOS Safari in standalone/installed mode —
    // silently ignore .click() on an element that was never attached to the
    // document, so the camera never opens and the caller hangs forever.
    document.body.appendChild(input);
    input.onchange = () => { input.remove(); resolve(input.files?.[0] ?? null); };
    input.click();
  });
}

async function makePhotoThumb(blob: Blob): Promise<Blob | null> {
  try {
    const url = URL.createObjectURL(blob);
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = url;
    });
    const MAX = 240;
    const scale = Math.min(1, MAX / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * scale));
    cv.height = Math.max(1, Math.round(img.height * scale));
    cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
    URL.revokeObjectURL(url);
    return await new Promise(res => cv.toBlob(b => res(b), 'image/jpeg', 0.7));
  } catch {
    return null;
  }
}

/** Capture one piece of evidence; returns its ref, or null if cancelled. */
export async function captureMedia(kind: 'photo' | 'video'): Promise<MediaRef | null> {
  const file = await pickFile(kind);
  if (!file) return null;
  return kind === 'photo' ? saveEvidence('photo', file) : saveEvidence('video', file);
}

async function saveEvidence(kind: 'photo' | 'video', blob: Blob): Promise<MediaRef> {
  const blobKey = `blob-${uid()}`;
  await putBlob(blobKey, blob);
  let thumbKey: string | undefined;
  if (kind === 'photo') {
    const thumb = await makePhotoThumb(blob);
    if (thumb) {
      thumbKey = `thumb-${uid()}`;
      await putBlob(thumbKey, thumb);
    }
  }
  return { id: uid(), kind, blobKey, thumbKey, mime: blob.type || (kind === 'photo' ? 'image/jpeg' : 'video/mp4'), capturedAt: now() };
}

/** Save an in-app recorded clip (MediaRecorder output) the same way a picked
 *  video file is saved, so both paths land in the same evidence shape. */
export function saveVideoBlob(blob: Blob): Promise<MediaRef> {
  return saveEvidence('video', blob);
}
