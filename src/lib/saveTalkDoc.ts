/* A LINE TALK DOCUMENT, MADE — its photos fetched and made small one at a
 * time (decoding many at once is how a phone drops the lot), the paper drawn
 * (lib/talkDocPdf) and handed over the way every Faultline PDF goes out: the
 * share sheet on a phone, a download on a desktop (lib/savePdf). */
import { loadPdfLib, deliverPdf, titlePdf, type Delivered } from './savePdf';
import { pdfFileName } from './fileName';
import { todayISO } from './weeks';
import { shrinkPicture, type Picture } from '../tools/talk/talkPictures';
import type { TalkDoc } from '../tools/talk/talkAssist';
import type { TalkTurn } from '../tools/talk/talk';

/* a photo printed a column wide: 1,400 px keeps it sharp and the file small */
const EDGE = 1400, QUALITY = 0.82;

export async function saveTalkDoc(doc: TalkDoc, o: { talk: string; line?: string; by?: string; photos: Map<string, TalkTurn> }): Promise<Delivered> {
  const { jsPDF } = await loadPdfLib();
  const { drawTalkDoc } = await import('../tools/talk/talkDocPdf');
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(pdf, doc.title);
  const used = [...new Set(doc.sections.flatMap(s => s.photos.map(p => p.photo)))];
  const pictures = new Map<string, Picture>();
  const taken = new Map<string, string>();
  for (const label of used) {
    const t = o.photos.get(label);
    if (!t) continue;
    taken.set(label, new Date(t.at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }));
    const p = t.media ? await shrinkPicture(t.media.blobKey, EDGE, QUALITY) : undefined;
    if (p) pictures.set(label, p);
  }
  await drawTalkDoc(pdf, {
    doc, talk: o.talk, ...(o.line ? { line: o.line } : {}), ...(o.by ? { by: o.by } : {}),
    printed: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    photos: pictures, taken,
  });
  return deliverPdf(pdf, pdfFileName(o.line ?? 'Line Talk', doc.title, todayISO()));
}
