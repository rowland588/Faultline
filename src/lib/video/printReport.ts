/* THE VIDEO STUDY'S REPORT, MADE AND HANDED OVER — from the accepted events,
 * read fresh; each time it is made is kept on the study (when, and from how
 * many accepted and still to review), so a report made again after a
 * correction never loses the one before. */
import { allProjects, getStudy, listWorkspaces, patchStudy } from '../../db';
import { todayISO } from '../weeks';
import type { VideoSource } from './record';
import { videoFigures } from './study';
import { footageGone } from './footage';

export async function printVideoReport(id: string, who?: string): Promise<string> {
  const s = await getStudy(id);
  const v = s?.facts.video;
  if (!s || !v) return 'The study is not on this device.';
  const events = s.facts.vevents ?? [];
  const f = videoFigures(v, events, 'verified');
  const [lines, projects] = await Promise.all([listWorkspaces(), allProjects()]);
  const today = todayISO();
  const { loadPdfLib, deliverPdf, titlePdf } = await import('../savePdf');
  const { drawVideoReport } = await import('./reportPdf');
  const { pdfFileName } = await import('../fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const name = s.name || v.facts.fileName;
  titlePdf(doc, `${name} — video study`);
  await drawVideoReport(doc, {
    name, v, events, f, gone: footageGone(s.facts), line: lines.find(l => l.id === s.workspaceId)?.name, job: projects.find(p => p.id === s.projectId)?.name,
    printed: new Date(`${today}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
  });
  const file = pdfFileName(name, 'video study', today);
  const how = await deliverPdf(doc, file);
  await patchStudy(id, cur => {
    const cv = cur.facts.video as VideoSource;
    const job = cv.job.state === 'review' ? { ...cv.job, state: 'reported' as const, updatedAt: Date.now() } : cv.job;
    return { facts: { ...cur.facts, video: { ...cv, job, reports: [...(cv.reports ?? []), { at: Date.now(), accepted: f.accepted, candidates: f.candidates, ...(who ? { by: who } : {}) }] } } };
  });
  return how === 'downloaded' ? `Saved ${file}.` : `${file} is ready.`;
}
