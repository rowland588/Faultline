/* THE PROJECT REPORT — WHERE WE ARE, ON PAPER (docs/METHODS.md §17). The dashboard's own model (lib/methodDashboard) set down with
 * everything the method asks and what was written, so the page on the project and the paper cannot part: where the project is on the
 * method's journey, what each tool is showing, what needs attention, what to do next, and what the team wrote, section by section.
 * Laid out by the report engine (blocks that measure themselves), light only. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block } from './flow';
import { SIZE, font, heading, label, text } from './blocks';
import { fieldsOf } from '../methodSheet';
import type { Dashboard } from '../methodDashboard';
import type { ProjectMethod } from '../methods';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#323d43', MUTED = '#59666c', AMBER = '#b45309', RED = '#c4281c', GREEN = '#15803d';
const WORD: Record<string, string> = { r: 'ATTENTION', a: 'WATCH', g: 'OK', w: 'UNDER WAY', n: '' };
const COL: Record<string, string> = { r: RED, a: AMBER, g: GREEN, w: INK2, n: INK2 };

export interface MethodReportIn { project: string; method: ProjectMethod; printed: string; dash: Dashboard; answers: Record<string, string> }

export function methodReportBlocks(x: MethodReportIn): Block[] {
  const d = x.dash;
  const out: Block[] = [text({ text: `${x.project} · ${x.method.name} · printed ${x.printed}`, size: SIZE.small, colour: MUTED, after: 2 })];
  out.push(heading('Where we are', d.says));
  out.push(label('The journey'));
  d.sections.forEach((s, i) => out.push(text({ text: `${i + 1}. ${s.name}${s.here ? ' — you are here' : ''} — ${s.state}${s.fields ? `, ${s.written} of ${s.fields} written` : ''}${s.results ? `, ${s.results} tool result${s.results === 1 ? '' : 's'}` : ''}`, size: SIZE.small, colour: s.here ? INK2 : MUTED, bullet: '•', indent: 10, after: 3 })));
  out.push(label('What the tools are showing'));
  if (!d.findings.length) out.push(text({ text: 'No tool has been used in this project yet.', size: SIZE.small, colour: MUTED }));
  d.findings.forEach(f => out.push(text({ text: `${f.section} — ${f.tool}, ${f.title}${f.more ? ` (and ${f.more} more)` : ''}: ${f.says}${WORD[f.tone] ? `  [${WORD[f.tone]}]` : ''}`, size: SIZE.small, colour: COL[f.tone] ?? INK2, bullet: '•', indent: 10, after: 3 })));
  out.push(label('What needs attention'));
  if (!d.attention.length) out.push(text({ text: 'Nothing is flagged.', size: SIZE.small, colour: MUTED }));
  d.attention.forEach(a => out.push(text({ text: a.text, size: SIZE.small, colour: a.tone === 'r' ? RED : a.tone === 'a' ? AMBER : INK2, bullet: '•', indent: 10, after: 3 })));
  out.push(label('What to do next'));
  out.push(text({ text: d.next, size: SIZE.small, colour: INK2 }));
  out.push(heading('What we wrote', 'The method’s own questions, as the team answered them.'));
  for (const s of x.method.sections) {
    const fs = fieldsOf(x.method.key, s.name);
    if (!fs.length) continue;
    out.push(label(s.name));
    for (const f of fs) {
      const a = (x.answers[f.id] ?? '').trim();
      out.push(text({ text: `${f.label}: ${a || 'Not written yet.'}`, size: SIZE.small, colour: a ? INK2 : MUTED, bullet: '•', indent: 10, after: 3 }));
    }
  }
  if (d.closing) out.push(text({ text: d.closing, size: SIZE.small, colour: MUTED, before: 6 } as never));
  return out;
}

export async function saveMethodReportPdf(x: MethodReportIn & { todayISO: string }): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { jsPDF } = await loadPdfLib();
  const doc: jsPDF = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `Project report — ${x.method.name} — ${x.project}`);
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const build = () => methodReportBlocks(x);
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`Project report · ${x.project} · ${x.method.name} · printed ${x.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
  await deliverPdf(doc, pdfFileName(x.project, 'project report', x.todayISO));
}
