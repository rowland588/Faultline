/* THE LINE STANDARD, ON PAPER — one A4 landscape page per product: the card
 * (lib/standardCard), placed edge to edge. The card is the same picture the
 * screen previews, so what was looked at is exactly what prints. */
import type { jsPDF } from 'jspdf';
import type { Standard } from './standard';
import { cardImage } from './standardCard';

/** One page per product, in the order given; the first goes on the current
 *  page, which must already be A4 landscape. */
export async function drawStandards(doc: jsPDF, standards: Standard[], projectName: string, printed: string): Promise<void> {
  for (let i = 0; i < standards.length; i++) {
    if (i > 0) doc.addPage('a4', 'landscape');
    const img = await cardImage(standards[i], projectName, printed);
    doc.addImage(img, 'JPEG', 0, 0, 842, 595);
  }
}
