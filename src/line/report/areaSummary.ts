/** A short customer brief, read from the area's existing questions. No new figures or records. */
import type { AreaBundle } from './areaBundle';
import type { FourQuestions } from '../../lib/factoryQuestions';
import { heading, text, font } from '../../lib/report/blocks';
import { pour, type Block } from '../../lib/report/flow';
import { loadPdfLib, deliverPdf, titlePdf } from '../../lib/savePdf';
import { pdfFileName } from '../../lib/fileName';
import { todayISO, niceDay } from '../../lib/weeks';

export async function saveAreaSummary(bundle: AreaBundle, q: FourQuestions): Promise<void> {
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  titlePdf(doc, `${bundle.title} — summary`);
  const blocks: Block[] = [heading(`${bundle.title} — Summary`, [bundle.client, todayISO()].filter(Boolean).join(' · ')),
    text({ text: q.sentence, size: 11, style: 'bold', after: 12 }), heading('Main findings')];
  for (const p of q.wrong.top.slice(0, 3)) blocks.push(text({ text: `${p.line}: ${p.what}. ${p.cost?.short ?? 'Financial impact not priced yet.'}`, size: 10, after: 8 }));
  if (!q.wrong.open) blocks.push(text({ text: 'No problems logged. This does not establish that the area has no losses.', size: 10, after: 8 }));
  blocks.push(heading('Next actions'));
  for (const a of q.doing.top.slice(0, 3)) blocks.push(text({ text: `${a.what} — ${a.who || 'Owner not assigned'} · ${a.due ? `${a.late ? 'Overdue: ' : 'Due: '}${niceDay(a.due)}` : 'No due date'}`, size: 10, after: 8 }));
  if (!q.doing.open) blocks.push(text({ text: 'No actions recorded.', size: 10, after: 8 }));
  blocks.push(heading('Results verified'));
  for (const fix of q.worked.proved.slice(0, 3)) blocks.push(text({ text: `${fix.lineName}: ${fix.what} — ${fix.proof}`, size: 10, after: 8 }));
  if (!q.worked.proved.length) blocks.push(text({ text: 'No improvement has yet been verified by a before-and-after measurement.', size: 10, after: 8 }));
  blocks.push(text({ text: 'Selected priorities only. The full area report and Action tracker retain the complete records, measurements and actions.', size: 9, after: 8 }));
  await pour({ doc, x: 36, w: 523, top: 36, bottom: 790, density: 'comfortable', dry: false }, blocks, () => doc.addPage());
  for (let i = 1; i <= doc.getNumberOfPages(); i++) { doc.setPage(i); font(doc, 8, 'normal', '#64748b'); doc.text(`${bundle.title} · ${i} of ${doc.getNumberOfPages()}`, 36, 820); }
  await deliverPdf(doc, pdfFileName(bundle.title, 'summary', todayISO()));
}
