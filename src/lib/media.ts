/* Evidence capture — "here's the number, watch the problem." Opens the camera
 * on a phone (falls back to a file picker on desktop), stores the blob in the
 * media bag, and makes a small thumbnail for photos. Returns a lightweight
 * MediaRef; heavy blobs never travel with the observation. */
import type { MediaRef } from '../types';
import { putBlob } from '../db';
import { uid, now } from './ids';
import { sniffMime, withUsableMime } from './mime';
import { prepareVideoForImport } from './transcode';

/** Open the device's file picker.
 *
 *  `camera: true` adds the capture attribute, which sends phones straight to
 *  the camera. That is ONLY ever right when the user asked to shoot something —
 *  with it set, a phone will not offer the gallery or Files at all, so an
 *  "upload what I already have" button carrying it is simply broken. */
export function pickFiles(accept: string, opts: { camera?: boolean; multiple?: boolean } = {}): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    if (opts.camera) input.setAttribute('capture', 'environment');
    if (opts.multiple) input.multiple = true;
    input.style.position = 'fixed';
    input.style.top = '-9999px';
    // Some mobile browsers — notably iOS Safari in standalone/installed mode —
    // silently ignore .click() on an element that was never attached to the
    // document, so the picker never opens and the caller hangs forever.
    document.body.appendChild(input);
    input.onchange = () => { input.remove(); resolve(Array.from(input.files ?? [])); };
    // BACKING OUT OF THE PICKER FIRES `cancel`, NOT `change`. Without this the
    // promise never settles at all: the caller waits for ever, the input stays
    // in the document, and anything the caller put on hold while it waited —
    // a spinner, a disabled row of buttons — stays that way until the screen is
    // left. Changing your mind about a photo is not an error, and it must not
    // leave the thing you tapped dead behind it.
    input.oncancel = () => { input.remove(); resolve([]); };
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

/** One piece of evidence; null if cancelled.
 *
 *  `gallery: true` drops the capture attribute, so the phone offers its own
 *  chooser — camera, or a picture already on the device — instead of going
 *  straight to the lens.
 *
 *  WHY IT IS A CHOICE AND NOT ONE ANSWER. Rowland, on the testing screen:
 *  "make photo offer the gallery too." A line walk is filmed as you walk it, so
 *  the camera is the only thing that button can sensibly mean there. A test or
 *  a fix is written up after the fact, often from a close-up somebody already
 *  took — so on those screens, refusing to show it is refusing the ordinary
 *  case. Same door, and the screen says which it is standing in front of. */
export async function captureMedia(
  kind: 'photo' | 'video',
  opts: { gallery?: boolean } = {},
): Promise<MediaRef | null> {
  const [file] = await pickFiles(kind === 'photo' ? 'image/*' : 'video/*', { camera: !opts.gallery });
  if (!file) return null;
  return saveEvidence(kind, file);
}

/** Attach photos/videos the user ALREADY has — phone gallery, Files, or a
 *  laptop's disk. Several at once, since that's how footage usually arrives.
 *  Phone video is converted on the way in so it plays on other devices too;
 *  `onProgress` reports (fileIndex, 0..1) while that runs. */
export async function pickExistingMedia(
  onProgress?: (index: number, total: number, fraction: number) => void,
): Promise<MediaRef[]> {
  const files = await pickFiles('image/*,video/*', { multiple: true });
  const refs: MediaRef[] = [];
  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const mime = f.type || (await sniffMime(f)) || '';
    if (mime.startsWith('video/')) {
      const { blob } = await prepareVideoForImport(f, fr => onProgress?.(i, files.length, fr));
      refs.push(await saveEvidence('video', blob));
    } else {
      refs.push(await saveEvidence('photo', f));
    }
  }
  return refs;
}

/* There was a photos-only picker here as well, for Next steps, on the reasoning
 * that the attachment there is a picture of the thing being discussed rather
 * than footage of the line. Next steps moved onto pickExistingMedia above and
 * nothing else ever called it. It is gone rather than kept, because the reason
 * it existed — "video does not belong on this one" — turned out to be wrong
 * everywhere: Rowland wants to upload a clip wherever evidence is attached, and
 * a second picker that silently cannot is how a phone comes to hide the video
 * you are trying to attach.
 */

async function saveEvidence(kind: 'photo' | 'video', raw: Blob): Promise<MediaRef> {
  // Store it already carrying a type the browser can dispatch on — files
  // dragged off a laptop often arrive with none at all.
  const blob = await withUsableMime(raw, kind === 'photo' ? 'image/jpeg' : 'video/mp4');
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
