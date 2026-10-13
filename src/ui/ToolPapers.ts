/* THE LINE TOOLS' PAPER FOR EVERYTHING SHOWN — Line standard's cards and
 * Line capacity's report, for every product a list shows (screens/
 * LineToolsScreen; docs/AUDIT.md, bar 3: "a record that has a card offers
 * the cards for all that are shown, as well as one at a time").
 *
 * Rowland, 13 October: "I'm always asking for reports, or cards, to be able
 * to present things in a certain way that would seem to be obvious, but
 * aren't, because you're not building them." Each product's card was one
 * line's, or one job's, at a time; every product shown is one PDF now.
 *
 * The cards are the line standard's own (lib/standardPdf drawStandards, the
 * picture the screen previews), each printed under the name of the place it
 * sits — its line, or the job a map made inside a job belongs to — in the
 * order the list shows them. */
import { drawStandards } from '../lib/standardPdf';
import type { Standard } from '../lib/standard';

/** As the card is printed from its own page: "13 Oct 2026". */
const printedOn = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** Every product's card, a page each, in the order given — each under its
 *  place's name. Saved to the device; the bar offers Open and Send. */
export async function saveStandardCards(groups: { name: string; list: Standard[] }[], fileName: string): Promise<void> {
  const { loadPdfLib, deliverPdf, titlePdf } = await import('../lib/savePdf');
  const { pdfFileName } = await import('../lib/fileName');
  const { todayISO } = await import('../lib/weeks');
  const { worksFor } = await import('./WorkBalance');
  const { shiftShortsFor } = await import('./ShiftCapacity');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  const all = groups.flatMap(g => g.list);
  const works = await worksFor(all), shifts = await shiftShortsFor(all);
  const printed = printedOn();
  let first = true;
  for (const g of groups) {
    if (!g.list.length) continue;
    /* drawStandards puts its first on the current page: every group after
       the first starts a page of its own */
    if (!first) doc.addPage('a4', 'landscape');
    first = false;
    await drawStandards(doc, g.list, g.name, printed, works, shifts);
  }
  titlePdf(doc, `Line standard — ${all.length} product${all.length === 1 ? '' : 's'}`);
  /* the sheet is a picture edge to edge, with its own heading and mark */
  await deliverPdf(doc, pdfFileName(fileName, 'line standard cards', todayISO()), { brand: false });
}
