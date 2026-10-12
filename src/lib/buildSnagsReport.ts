/* THE SNAGS & FIXES REPORT, MADE — the pictures fetched and made small, the PDF
 * drawn (lib/snagsReportPdf) and handed over: the share sheet on a phone, a
 * download on a desktop (lib/savePdf). The drawer knows nothing of the
 * database; this is the part that goes and gets the pictures. */
import { getBlob } from '../db';
import { loadPdfLib, deliverPdf } from './savePdf';
import { pdfFileName } from './fileName';
import { todayISO } from './weeks';
import type { SnagsReading } from './snagsReport';
import type { SnagPhoto } from './snagsReportPdf';

/* A thumbnail is printed 42 pt across; 240 px keeps it sharp and the file small. */
const EDGE = 240, QUALITY = 0.78;

async function small(key: string): Promise<SnagPhoto | undefined> {
  const blob = await getBlob(key);
  if (!blob || !blob.type.startsWith('image/')) return undefined;
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('decode')); i.src = url; });
    const s = Math.min(1, EDGE / Math.max(img.width, img.height));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(img.width * s)); cv.height = Math.max(1, Math.round(img.height * s));
    cv.getContext('2d')?.drawImage(img, 0, 0, cv.width, cv.height);
    return { dataUrl: cv.toDataURL('image/jpeg', QUALITY), w: cv.width, h: cv.height };
  } catch {
    return undefined;            // an unreadable picture: the words still print
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Every picture the reading names, one at a time — decoding many at once is
 *  how a phone drops the lot. A picture not on this device prints as an empty
 *  square: the snag is still worth reading. */
export async function snagPhotos(r: SnagsReading): Promise<Map<string, SnagPhoto>> {
  const keys = [...new Set([...r.lines.flatMap(l => l.rows.map(x => x.photo)), ...r.jobs.flatMap(g => g.rows.map(x => x.photo)), ...r.moved.flatMap(g => g.rows.map(x => x.photo))].filter((k): k is string => !!k))];
  const out = new Map<string, SnagPhoto>();
  for (const k of keys) { const p = await small(k); if (p) out.set(k, p); }
  return out;
}

export async function saveSnagsReport(r: SnagsReading, title: string): Promise<void> {
  const { jsPDF } = await loadPdfLib();
  const { drawSnagsReport } = await import('./snagsReportPdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const printed = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  await drawSnagsReport(doc, { title, printed, reading: r, photos: await snagPhotos(r) });
  await deliverPdf(doc, pdfFileName('snags and fixes', title.toLowerCase() === 'everything open' ? 'report' : title, todayISO()));
}
