/* A MACHINE'S OWN PICTURE (3 November — Rowland: "when I look at machines, I have the picture of the problem ... it's not really what
 * should be there, because it's the problem ... what we want is the picture of the machines to go in on the lines. So we're able to go
 * across, see the pictures"). The line's strip of machines shows the machine, not its newest problem's photo.
 *
 * No new record and no column: the picture is one entry of the machine record's `docs` (jsonb, its bytes riding the media pipeline
 * as a snag photo's do) marked `picture`. A machine has at most one; taking a new one replaces it. Pure — the writes are
 * db/lineRecords setMachinePicture. */
import type { Asset, DocRef } from './testing';

/** The machine's picture, if it has one. */
export const pictureOf = (a: Pick<Asset, 'docs'> | undefined): DocRef | undefined => (a?.docs ?? []).find(d => d.picture && d.mime.startsWith('image/'));

/** The papers sent with a machine — its docs without its picture. */
export const papersOf = (a: Pick<Asset, 'docs'> | undefined): DocRef[] => (a?.docs ?? []).filter(d => !d.picture);

/** A picture's longest side, and its JPEG quality — a phone's 4,000 px photo is 1,600 px on the strip and the page. */
export const PICTURE_EDGE = 1600;
export const PICTURE_QUALITY = 0.82;

/** The photo made small as a JPEG, or the file itself when the browser cannot draw it. */
export async function smallPicture(file: Blob): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('That is not a picture.');
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = url; });
    const s = Math.min(1, PICTURE_EDGE / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * s)); cv.height = Math.max(1, Math.round(img.height * s));
    const g = cv.getContext('2d');
    if (!g) return file;
    g.drawImage(img, 0, 0, cv.width, cv.height);
    const out = await new Promise<Blob | null>(res => cv.toBlob(res, 'image/jpeg', PICTURE_QUALITY));
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** The machine's picture made small for paper (900 px, as the documents' photos are), or nothing when it has none or it is not on this device. */
export async function paperPicture(a: Pick<Asset, 'docs'> | undefined): Promise<{ dataUrl: string; w: number; h: number } | undefined> {
  const d = pictureOf(a);
  if (!d) return undefined;
  const { shrinkPicture } = await import('../tools/talk/talkPictures');
  return shrinkPicture(d.blobKey, 900, 0.8);
}
