/* A TALK'S PHOTO, MADE SMALL — for the assistant to look at, and for a
 * document's page. The picture is the talk's own (db putBlob, kept for good
 * and in the cloud while the talk names it — supabase/LINE_TALK.sql); a copy
 * is drawn smaller as the reports draw their thumbnails (lib/buildSnagsReport
 * small), and the original is never touched. */
import { getBlob } from '../db';

export interface Picture { dataUrl: string; w: number; h: number }

/** The picture with its longest side `edge` pixels at most, as a JPEG — or
 *  nothing when it is not on this device or cannot be read. */
export async function shrinkPicture(blobKey: string, edge: number, quality: number): Promise<Picture | undefined> {
  const blob = await getBlob(blobKey);
  if (!blob || !blob.type.startsWith('image/')) return undefined;
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = url; });
    const s = Math.min(1, edge / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * s)); cv.height = Math.max(1, Math.round(img.height * s));
    const g = cv.getContext('2d');
    if (!g) return undefined;
    /* a transparent picture on white, as paper is */
    g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height);
    g.drawImage(img, 0, 0, cv.width, cv.height);
    return { dataUrl: cv.toDataURL('image/jpeg', quality), w: cv.width, h: cv.height };
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

const sent = new Map<string, string>();

/** The picture as the assistant is sent it — 1,280 px at most, under the
 *  gateway's limit — the same bytes each time it is asked in one sitting, so
 *  the conversation before it is read from the cache. */
export async function pictureForAssistant(blobKey: string, maxBytes: number): Promise<string | undefined> {
  const had = sent.get(blobKey);
  if (had) return had;
  for (const [edge, q] of [[1280, 0.8], [1024, 0.72], [800, 0.65]] as const) {
    const p = await shrinkPicture(blobKey, edge, q);
    if (!p) return undefined;
    const data = p.dataUrl.slice(p.dataUrl.indexOf(',') + 1);
    if (data.length * 0.75 <= maxBytes) { sent.set(blobKey, data); return data; }
  }
  return undefined;
}
