/* PRINT THE MACHINE LABELS — every machine on a job (the Reports index), or
 * one (its own page). The labels are drawn by lib/machineLabels; this only
 * gathers the address the codes open and hands the paper over, the way every
 * other document leaves (lib/savePdf deliverPdf). */
import type { Asset } from '../lib/testing';
import { todayISO, niceDay } from '../lib/weeks';

/** Draw and hand over the labels; says what happened, in words. */
export async function printLabels(project: { id: string; name: string }, assets: Asset[], one?: string): Promise<string> {
  const { machineLabels, drawMachineLabels } = await import('../lib/machineLabels');
  const { loadPdfLib, deliverPdf, titlePdf } = await import('../lib/savePdf');
  const { pdfFileName } = await import('../lib/fileName');
  const labels = machineLabels({ project, assets: one ? assets.filter(a => a.id === one) : assets, base: `${location.origin}${location.pathname}` });
  if (!labels.length) return 'No machines on this job yet — add one at Install, and it gets its label.';
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const today = todayISO();
  titlePdf(doc, `${project.name} — ${one ? `${labels[0].machine} label` : 'machine labels'}`);
  await drawMachineLabels(doc, labels, { job: project.name, printed: niceDay(today, { year: true }) });
  const name = pdfFileName(project.name, one ? `${labels[0].machine} label` : 'machine labels', today);
  const how = await deliverPdf(doc, name);
  return how === 'downloaded' ? `Saved ${name}.` : `${name} is ready — send it from the bar below.`;
}
