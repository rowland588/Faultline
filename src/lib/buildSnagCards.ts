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
import { loadPdfLib, deliverPdf } from './savePdf';
import { pdfFileName } from './fileName';
import { todayISO } from './weeks';
import type { Snag, SnagAsset } from '../snag/types';
import { SNAG_STATUS_META } from '../snag/types';
import type { SnagCardData, SnagCardPhoto, SnagCardSet } from './snagCardPdf';
import type { MediaPin } from '../types';
import type { JobRow } from './snagsReport';
import { drawMarks } from './testReport';

const DAY = 86_400_000;
const MAX_EDGE = 1400;
const QUALITY = 0.82;

const dateNice = (ms: number) =>
  new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

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
async function photoFrom(key: string | undefined, pin?: { xPct?: number; yPct?: number }, marks?: MediaPin[]): Promise<SnagCardPhoto | undefined> {
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
    const ctx = cv.getContext('2d')!;
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    /* What is marked on it (ui/Evidence), drawn in as every document draws
       it (lib/testReport) and listed beside it by number. */
    const marked = (marks ?? []).filter(m => m.note.trim());
    if (marked.length) drawMarks(ctx, cv.width, cv.height, marked);
    return {
      dataUrl: cv.toDataURL('image/jpeg', QUALITY),
      w: cv.width, h: cv.height,
      xPct: pin?.xPct, yPct: pin?.yPct,
      ...(marked.length ? { marks: marked.map(m => m.note.trim()) } : {}),
    };
  } catch {
    return undefined;          // unreadable image: send the words
  } finally {
    URL.revokeObjectURL(url);
  }
}

export interface SnagCardRow { snag: Snag; asset?: SnagAsset; assetName: string; /** lib/problemCost words, when its minutes are typed (FC-154) */ cost?: string }

/** Everything the drawer needs for a set of snags, photographs and all.
 *  Sequential on purpose: decoding several full-size frames at once is how you
 *  make a phone drop the lot. */
export async function buildSnagCards(
  rows: SnagCardRow[],
  workspace: string,
  filterNote?: string,
): Promise<SnagCardSet> {
  const snags: SnagCardData[] = [];
  for (const { snag, asset, assetName, cost } of rows) {
    const still = await photoFrom(asset?.stillKey, { xPct: snag.xPct, yPct: snag.yPct });
    /* A quick snag keeps its pictures in `media` (snag/quick): its first photo
       is the close-up when it has no close-up of its own — with its marks. */
    const first = snag.detailPhotoKey ? undefined : snag.media?.find(m => m.kind === 'photo');
    const detail = await photoFrom(snag.detailPhotoKey ?? first?.blobKey, undefined, first?.pins);
    snags.push({
      problem: snag.problem || 'Evidence',
      proposedSolution: snag.proposedSolution || undefined,
      ...(cost ? { cost } : {}),
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
      priority: snag.priority ?? 'low',
      ...(snag.journey?.length ? { journey: [...snag.journey].filter(j => j.did?.trim()).sort((a, b) => a.at - b.at).map(j => ({ day: dateNice(j.at), did: j.did.trim(), ...(j.result?.trim() ? { result: j.result.trim() } : {}) })) } : {}),
      latestUpdateAt: snag.latestUpdateAt ? dateNice(snag.latestUpdateAt) : undefined,
      still, detail,
    });
  }
  return { workspace, filterNote, now: Date.now(), snags };
}

/** A PROBLEM ON A JOB, AS A CARD (Rowland, 12 October: "each can be a report
 *  card PDF"): its words, its fix as what is proposed, its state in words,
 *  whose it is, its machine and job, its priority and its first picture. */
export interface JobCardRow { row: JobRow; job: string }
async function jobCard({ row, job }: JobCardRow): Promise<SnagCardData> {
  const detail = await photoFrom(row.photo);
  const machine = row.where.split(/ · | — /)[0]?.trim() || 'The line';
  return {
    problem: row.what || 'A problem',
    ...(row.fixWhat ? { proposedSolution: `Fix: ${row.fixWhat}` } : row.kind === 'fix' ? { proposedSolution: 'Being fixed — the fix is booked on the project.' } : {}),
    status: !row.open ? 'closed' : row.kind === 'problem' ? 'open' : 'in_progress',
    statusLabel: row.word, owner: row.who ?? '', assetName: machine, where: job,
    raised: dateNice(row.at), ageDays: ageDays(row.at), priority: row.priority,
    ...(row.fromSnag ? { latestUpdate: `Seen first on ${row.fromSnag.replace(/^a (?:snag|problem) on /, '')}` } : {}),
    ...(detail ? { detail } : {}),
  };
}

/** Cards for any problems — on a line or on a job — one page each, in the
 *  order given; the same file name as the line's cards. */
export async function saveProblemCards(items: ({ line: SnagCardRow } | { job: JobCardRow })[], workspace: string, filterNote?: string): Promise<void> {
  const { jsPDF } = await loadPdfLib();
  const { drawSnagCards } = await import('./snagCardPdf');
  const lineSet = await buildSnagCards(items.flatMap(x => ('line' in x ? [x.line] : [])), workspace, filterNote);
  const cards: SnagCardData[] = [];
  let k = 0;
  for (const x of items) cards.push('line' in x ? lineSet.snags[k++] : await jobCard(x.job));
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  drawSnagCards(doc, { workspace, ...(filterNote ? { filterNote } : {}), now: Date.now(), snags: cards });
  const first = items[0];
  const one = items.length === 1 && first ? ` ${(('line' in first ? first.line.snag.problem : first.job.row.what) || 'item').slice(0, 32)}` : '';
  await deliverPdf(doc, pdfFileName(workspace, `problem${one}`, todayISO()));
}

/** Build the PDF and hand it to the browser to save. Kept here so every place
 *  that offers a card — one snag, or a filtered list — produces the identical
 *  file with the identical name. */
export async function saveSnagCards(rows: SnagCardRow[], workspace: string, filterNote?: string): Promise<void> {
  const { jsPDF } = await loadPdfLib();
  const { drawSnagCards } = await import('./snagCardPdf');
  const data = await buildSnagCards(rows, workspace, filterNote);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  drawSnagCards(doc, data);
  const one = rows.length === 1 ? ` ${(rows[0].snag.problem || 'item').slice(0, 32)}` : '';
  // Share sheet on a phone, download on a desktop — see lib/savePdf. A card is
  // made to be sent, and on the floor that means the share sheet.
  await deliverPdf(doc, pdfFileName(workspace, `evidence${one}`, todayISO()));
}
