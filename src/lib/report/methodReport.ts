/* THE PROJECT REPORT ON PAPER (docs/METHODS.md §17). The same model the page draws (lib/methodReportModel) poured by the report
 * engine: the cover band and its tiles, the journey, what everything is telling us now — each tool's sentence and, under it, that
 * tool's OWN paper blocks (lib/studiesPdf studyBlocks, the way the line's combined report prints them, so a number on the report
 * is the tool's own) — the money by tool, what needs attention with who owes what by when, the method's own sections, everything
 * the team wrote, and the closing line. Tables measure themselves; nothing is cut or printed over anything else; every page is
 * footed with the project, the method, the printed date and the page number. Light only. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block, type Density, type Frame } from './flow';
import { SIZE, font, heading, label, rows, text, wrap, type Row } from './blocks';
import { leanBand, leanClosing, leanTiles } from './lean';
import { BRAND, DANGER, INK2, LINE, MUTED, OK, WARN } from '../reportKit';
import { leanPageOf, type MethodReport, type ReportItem, type ReportTone } from '../methodReportModel';
import type { StudyContext } from '../studyLinks';
import type { ToolStudy } from '../study';
import type { Standard } from '../../tools/linestandard/standard';
import { studyBlocks, type StudiesPaper } from '../studiesPdf';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const TONE: Record<ReportTone, string> = { r: DANGER, a: WARN, g: OK, w: INK2, n: MUTED };

/** The records a tool's own paper blocks are printed from. */
export interface ReportPaperData { studies: ToolStudy[]; standards: Standard[]; ctx: StudyContext }
export interface MethodReportPaperIn { project: string; methodName: string; report: MethodReport; data: ReportPaperData; todayISO: string }

/** A table whose cells wrap inside their columns; a row as tall as its longest cell; header again on every page. */
function table(head: string[], body: string[][], shares: number[] | undefined, tones?: (ReportTone | undefined)[]): Block {
  const sh = shares && shares.length === head.length ? shares : head.map(() => 1 / head.length);
  const LH = 10;
  const cells = (f: Frame, r: string[], bold: boolean) => r.map((c, i) => wrap(f.doc, c, f.w * (sh[i] ?? 0.2) - 8, 8, bold ? 'bold' : 'normal'));
  const row = (r: string[], isHead: boolean, tone?: ReportTone): Row => ({
    h: f => Math.max(...cells(f, r, isHead || tone === 'r').map(l => l.length), 1) * LH + 6,
    draw: (f, y) => {
      let x = f.x;
      const bold = isHead || tone === 'r' || tone === 'w';
      cells(f, r, bold).forEach((ls, i) => {
        font(f.doc, isHead ? 7 : 8, bold ? 'bold' : 'normal', isHead ? MUTED : tone ? TONE[tone] : INK2);
        ls.forEach((l, k) => f.doc.text(isHead ? l.toUpperCase() : l, x, y + 9 + k * LH));
        x += f.w * (sh[i] ?? 0.2);
      });
      const h = Math.max(...cells(f, r, bold).map(l => l.length), 1) * LH + 6;
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(isHead ? 0.7 : 0.4); f.doc.line(f.x, y + h - 1, f.x + f.w, y + h - 1);
    },
  });
  return rows({ header: row(head, true), rows: body.map((r, i) => row(r, false, tones?.[i])), after: 'm' });
}

/** A call-out: an edge in the tone's colour, its WORD, then the words — the colour is never the only carrier. */
function callout(tone: ReportTone, word: string, body: string): Block {
  const lay = (f: Frame) => wrap(f.doc, body, f.w - 16, 8.5);
  const hOf = (f: Frame) => (word ? 11 : 3) + lay(f).length * 10.5 + 6;
  return rows({ rows: [{
    h: hOf,
    draw: (f, y) => {
      const h = hOf(f);
      f.doc.setFillColor(TONE[tone]); f.doc.rect(f.x, y + 1, 2.4, h - 4, 'F');
      let yy = y + 8;
      if (word) { font(f.doc, 7, 'bold', TONE[tone]); f.doc.text(word.toUpperCase(), f.x + 9, yy); yy += 3; }
      font(f.doc, 8.5, 'normal', INK2);
      lay(f).forEach((l, k) => f.doc.text(l, f.x + 9, yy + 8 + k * 10.5));
    },
  }], after: 's' });
}

/** Small bars where a record already says a share: label, a track and its fill, the words beside. */
function bars(title: string, bs: { label: string; v: number; text: string; here?: boolean }[]): Block[] {
  const lw = (f: Frame) => f.w * 0.42, tw = (f: Frame) => f.w * 0.3;
  const one = (b: (typeof bs)[number]): Row => ({
    h: f => Math.max(wrap(f.doc, b.label, lw(f) - 8, 8, b.here ? 'bold' : 'normal').length, 1) * 10 + 6,
    draw: (f, y) => {
      font(f.doc, 8, b.here ? 'bold' : 'normal', INK2);
      wrap(f.doc, b.label, lw(f) - 8, 8, b.here ? 'bold' : 'normal').forEach((l, k) => f.doc.text(l, f.x, y + 9 + k * 10));
      const x0 = f.x + lw(f);
      f.doc.setFillColor(LINE); f.doc.rect(x0, y + 3, tw(f), 6, 'F');
      if (b.v > 0) { f.doc.setFillColor(b.v >= 1 ? OK : BRAND); f.doc.rect(x0, y + 3, tw(f) * Math.min(1, b.v), 6, 'F'); }
      font(f.doc, 8, 'normal', MUTED); f.doc.text(b.text, x0 + tw(f) + 8, y + 9);
    },
  });
  return [label(title), rows({ rows: bs.map(one), after: 'm' })];
}

function blocksOfItem(it: ReportItem, data: ReportPaperData, d: Density, first: boolean): Block[] {
  switch (it.kind) {
    case 'paragraph': return [text({ text: it.text, size: SIZE.small, colour: it.tone ? TONE[it.tone] : INK2, after: 6 })];
    case 'facts': return [table(['', ''], it.rows.map(([k, v]) => [k, v]), [0.3, 0.7])];
    case 'bullets': return it.items.map(b => text({ text: b.text, size: SIZE.small, colour: b.tone ? TONE[b.tone] : INK2, bullet: '•', indent: 10, after: 3 }));
    case 'table': return [table(it.head, it.rows, it.shares, it.tones)];
    case 'callout': return [callout(it.tone, it.word, it.text)];
    case 'money': return [callout('n', it.missing ? `Money not said · ${it.tool} (${it.title})` : `Money · ${it.tool} (${it.title})`, it.text)];
    case 'bars': return bars(it.title, it.bars);
    case 'qa': return [label(it.title), table(['Question', 'Answer'], it.rows.map(r => [r.q, r.a]), [0.38, 0.62], it.rows.map(r => (r.written ? undefined : 'n')))];
    case 'tool': {
      const s = data.studies.find(x => x.id === it.id);
      if (!s) return [text({ text: `${it.tool} — ${it.title}: ${it.says}`, size: SIZE.small, colour: TONE[it.tone], after: 6 })];
      const sp: StudiesPaper = { title: it.title, printed: '', items: [{ s, where: it.where }], standards: data.standards, ctx: data.ctx };
      /* the tool's own blocks — its title, where it sits, its sentence, then its table and figures by tool */
      return [text({ text: `${it.section} · ${it.tool}${it.more ? ` · and ${it.more} more of this tool` : ''}`, size: SIZE.label, style: 'bold', colour: MUTED, before: first ? 0 : 8, after: 2 }), ...studyBlocks(sp, sp.items[0], 0, d)];
    }
  }
}

export function methodReportBlocks(x: MethodReportPaperIn, d: Density = 'comfortable'): Block[] {
  const r = x.report, c = r.cover;
  const page = leanPageOf(r);
  const out: Block[] = [leanBand(page, c.printed), leanTiles(c.tiles)];
  for (const s of r.sections) {
    out.push(heading(s.title, s.lead));
    s.items.forEach((it, i) => out.push(...blocksOfItem(it, x.data, d, i === 0)));
  }
  out.push(heading('Where we are, why, and what we are doing about it'));
  out.push(leanClosing(r.closing));
  return out;
}

export async function saveMethodReportPdf(x: MethodReportPaperIn): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { jsPDF } = await loadPdfLib();
  const doc: jsPDF = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `Project report — ${x.methodName} — ${x.project}`);
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => methodReportBlocks(x, d));
  await pour({ ...base, density, dry: false }, methodReportBlocks(x, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`Project report · ${x.project} · ${x.methodName} · printed ${x.report.cover.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
  await deliverPdf(doc, pdfFileName(x.project, 'project report', x.todayISO));
}
