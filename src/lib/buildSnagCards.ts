/* Turning snags into the thing that gets sent.
 *
 * The drawer (lib/snagCardPdf) is deliberately ignorant of the database — hand
 * it plain strings and data URLs and it draws the same page anywhere. This is
 * the part that goes and gets them.
 *
 * Photographs are re-encoded on the way through rather than embedded whole. A
 * walk still is a full-resolution video frame; four of them straight into a PDF
 * makes a file too big to email, which would defeat the entire point of the
 * card. Re-encoded at 1400px and JPEG 0.82 they stay clearly readable and the
 * file stays sendable.
 */
import { getBlob } from '../db';
import type { Snag, SnagAsset } from '../snag/types';
import { SNAG_STATUS_META } from '../snag/types';
import type { SnagCardData, SnagCardPhoto, SnagCardSet } from './snagCardPdf';

const DAY = 86_400_000;
const MAX_EDGE = 1400;
const QUALITY = 0.82;

const dateNice = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Whole days since, never negative — an age, not a duration. */
const ageDays = (ms: number) => Math.max(0, Math.floor((Date.now() - ms) / DAY));

/** Days until the due date: negative once it is past. Local midnight, because
 *  "due today" has to stay true all day. */
function dueInDays(dueAt?: number): number | undefined {
  if (dueAt == null) return undefined;
  const today = new Date().setHours(0, 0, 0, 0);
  return Math.round((new Date(dueAt).setHours(0, 0, 0, 0) - today) / DAY);
}

/** One stored blob, re-encoded small enough to email and measured so the card
 *  can keep its aspect ratio. Undefined when the blob is not on this device —
 *  a card without its photo is still worth sending. */
async function photoFrom(key: string | undefined, pin?: { xPct?: number; yPct?: number }): Promise<SnagCardPhoto | undefined> {
  if (!key) return undefined;
  const blob = await getBlob(key);
  if (!blob) return undefined;
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error('decode failed'));
      i.src = url;
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * scale));
    cv.height = Math.max(1, Math.round(img.height * scale));
    cv.getContext('2d')!.drawImage(img, 0, 0, cv.width, cv.height);
    return {
      dataUrl: cv.toDataURL('image/jpeg', QUALITY),
      w: cv.width, h: cv.height,
      xPct: pin?.xPct, yPct: pin?.yPct,
    };
  } catch {
    return undefined;          // unreadable image: send the words
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface SnagCardRow { snag: Snag; asset?: SnagAsset; assetName: string }

/** Everything the drawer needs for a set of snags, photographs and all.
 *  Sequential on purpose: decoding several full-size frames at once is how you
 *  make a phone drop the lot. */
export async function buildSnagCards(
  rows: SnagCardRow[],
  workspace: string,
  filterNote?: string,
): Promise<SnagCardSet> {
  const snags: SnagCardData[] = [];
  for (const { snag, asset, assetName } of rows) {
    const still = await photoFrom(asset?.stillKey, { xPct: snag.xPct, yPct: snag.yPct });
    const detail = await photoFrom(snag.detailPhotoKey);
    snags.push({
      problem: snag.problem || 'Snag',
      proposedSolution: snag.proposedSolution || undefined,
      status: snag.status,
      statusLabel: SNAG_STATUS_META[snag.status].label,
      owner: snag.owner || '',
      assetName,
      where: workspace,
      raised: dateNice(snag.raisedAt),
      ageDays: ageDays(snag.raisedAt),
      due: snag.dueAt ? dateNice(snag.dueAt) : undefined,
      dueInDays: dueInDays(snag.dueAt),
      latestUpdate: snag.latestUpdate || undefined,
      latestUpdateAt: snag.latestUpdateAt ? dateNice(snag.latestUpdateAt) : undefined,
      still, detail,
    });
  }
  return { workspace, filterNote, now: Date.now(), snags };
}

/** Build the PDF and hand it to the browser to save. Kept here so every place
 *  that offers a card — one snag, or a filtered list — produces the identical
 *  file with the identical name. */
export async function saveSnagCards(rows: SnagCardRow[], workspace: string, filterNote?: string): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const { drawSnagCards } = await import('./snagCardPdf');
  const data = await buildSnagCards(rows, workspace, filterNote);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  drawSnagCards(doc, data);
  const slug = workspace.replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'snags';
  const one = rows.length === 1 ? '-' + (rows[0].snag.problem || 'snag').replace(/[^\w]+/g, '-').slice(0, 32).replace(/-$/, '').toLowerCase() : '';
  doc.save(`snag${rows.length === 1 ? '' : 's'}-${slug}${one}-${new Date().toISOString().slice(0, 10)}.pdf`);
}
