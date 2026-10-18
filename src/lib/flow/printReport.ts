/* THE METHOD REPORT, MADE AND HANDED OVER — from the project's page and from
 * its Reports (ui/ReportsSheet, ui/ControlRoomReports) alike, so the two
 * doors print the same paper. Read fresh, by the one runtime. */
import { todayISO } from '../weeks';
import { loadFlowProject } from './operations';
import { flowLean } from './view';

export async function printFlowReport(projectId: string): Promise<string> {
  const today = todayISO();
  const fp = await loadFlowProject(projectId, today);
  if (!fp) return 'Its method has not reached this device yet — it will once this device has synced.';
  const page = flowLean({
    project: fp.project, def: fp.method.definition, version: fp.method.version, startedOn: fp.project.flow?.startedOn,
    state: fp.state, problems: fp.problems, records: fp.records, machines: fp.machines,
  }, today);
  const { loadPdfLib, deliverPdf, titlePdf } = await import('../savePdf');
  const { drawFlowReport } = await import('./reportPdf');
  const { pdfFileName } = await import('../fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `${fp.project.name} — ${fp.method.definition.name}`);
  await drawFlowReport(doc, { fp, page, printed: new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) });
  const name = pdfFileName(fp.project.name, 'method report', today);
  const how = await deliverPdf(doc, name);
  return how === 'downloaded' ? `Saved ${name}.` : `${name} is ready.`;
}
