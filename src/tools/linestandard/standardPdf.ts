/* THE LINE STANDARD, ON PAPER — one A4 landscape page per product: the card
 * (lib/standardCard), placed edge to edge — and after it, when the card had to
 * cut anything written, its notes page(s), the words whole. The pages are the
 * same pictures the screen previews, so what was looked at is what prints. */
import type { jsPDF } from 'jspdf';
import type { Standard } from './standard';
import { cardPages, type CardWork } from './standardCard';

/** One page per product, in the order given; the first goes on the current
 *  page, which must already be A4 landscape. */
export async function drawStandards(doc: jsPDF, standards: Standard[], projectName: string, printed: string,
  works?: Record<string, CardWork | undefined>, shifts?: Record<string, string | undefined>): Promise<void> {
  let first = true;
  for (const st of standards) {
    for (const img of await cardPages(st, projectName, printed, works?.[st.id], shifts?.[st.id])) {
      if (!first) doc.addPage('a4', 'landscape');
      first = false;
      doc.addImage(img, 'JPEG', 0, 0, 842, 595);
    }
  }
}
