/* AT THE MACHINE, ON PAPER — tools/doc/floorSheet poured by the report engine: the job, what to take care of, the steps big and in
 * order with the picture beside each, one quiet line at the foot. Light paper, graphite words, the one amber edge on the take-care box
 * (amber: it needs somebody's attention before they go on), every word beside its mark. Nothing here works anything out. */
import type { jsPDF } from 'jspdf';
import { INK, INK2, MUTED, LINE, BAND } from '../reportKit';
import type { Picture } from '../../tools/talk/talkPictures';
import type { FloorSheet, FloorStep } from '../../tools/doc/floorSheet';
import { box, font, wrap } from './blocks';
import { chooseDensity, pour, type Block, type Frame } from './flow';

const W = 595, H = 842, M = 40, CW = W - 2 * M;
const AMBER = '#b45309';
const NUM = 44, PIC = 150, GAP = 14;

function head(m: FloorSheet): Block {
  const title = (f: Frame) => wrap(f.doc, m.title, f.w, 24, 'bold');
  return box(
    f => 16 + title(f).length * 28 + (m.where ? 18 : 0) + 16 + 14,
    (f, y) => {
      const d = f.doc;
      font(d, 9, 'bold', MUTED); d.text(m.kind.toUpperCase(), f.x, y + 9);
      font(d, 24, 'bold', INK); title(f).forEach((l, i) => d.text(l, f.x, y + 38 + i * 28));
      let yy = y + 20 + title(f).length * 28;
      if (m.where) { font(d, 11.5, 'normal', INK2); d.text(m.where, f.x, yy + 10); yy += 18; }
      font(d, 9.5, m.agreed ? 'normal' : 'bold', m.agreed ? INK2 : AMBER); d.text(wrap(d, m.status, f.w, 9.5, m.agreed ? 'normal' : 'bold')[0] ?? '', f.x, yy + 12);
      d.setDrawColor(INK); d.setLineWidth(1.2); d.line(f.x, yy + 22, f.x + f.w, yy + 22);
    },
  );
}

function care(m: FloorSheet): Block {
  const lines = (f: Frame) => m.warnings.map(w => wrap(f.doc, w, f.w - 30, 11.5, 'bold'));
  const h = (f: Frame) => 28 + lines(f).reduce((s, l) => s + l.length * 15 + 5, 0) + 6;
  return box(
    f => h(f) + 12,
    (f, y) => {
      const d = f.doc, hh = h(f);
      d.setFillColor('#fff7ed'); d.rect(f.x, y, f.w, hh, 'F');
      d.setFillColor(AMBER); d.rect(f.x, y, 4, hh, 'F');
      font(d, 9, 'bold', AMBER); d.text('TAKE CARE — BEFORE YOU START', f.x + 16, y + 17);
      let yy = y + 34;
      for (const l of lines(f)) { font(d, 11.5, 'bold', INK); l.forEach((s, i) => d.text(s, f.x + 16, yy + i * 15)); yy += l.length * 15 + 5; }
    },
  );
}

function step(st: FloorStep, pic: Picture | undefined): Block {
  const tw = (f: Frame) => f.w - NUM - (pic ? PIC + GAP : 0);
  const doL = (f: Frame) => wrap(f.doc, st.do, tw(f), 13.5, 'bold');
  const pts = (f: Frame) => st.points.map(p => wrap(f.doc, p, tw(f) - 12, 10.5, 'normal'));
  const why = (f: Frame) => st.why.map(p => wrap(f.doc, `Why: ${p}`, tw(f) - 12, 9.5, 'normal'));
  const picSize = (): { w: number; h: number } => (pic ? (() => { const s = Math.min(PIC / pic.w, 120 / pic.h); return { w: pic.w * s, h: pic.h * s }; })() : { w: 0, h: 0 });
  const textH = (f: Frame) => doL(f).length * 17 + (st.care ? 15 : 0) + pts(f).reduce((s, l) => s + l.length * 13.5 + 2, 0) + why(f).reduce((s, l) => s + l.length * 12.5 + 2, 0) + (st.from ? 13 : 0);
  const h = (f: Frame) => Math.max(textH(f), picSize().h, 30) + 22;
  return box(
    f => h(f),
    (f, y) => {
      const d = f.doc, x = f.x + NUM;
      font(d, 26, 'bold', INK); d.text(String(st.n), f.x, y + 30);
      let yy = y + 20;
      font(d, 13.5, 'bold', INK); doL(f).forEach((l, i) => d.text(l, x, yy + i * 17)); yy += doL(f).length * 17;
      if (st.care) { font(d, 8.5, 'bold', AMBER); d.text(`TAKE CARE — ${st.care.toUpperCase()}`, x, yy + 1); yy += 15; }
      for (const l of pts(f)) { font(d, 10.5, 'normal', INK2); d.text('–', x, yy); l.forEach((s, i) => d.text(s, x + 12, yy + i * 13.5)); yy += l.length * 13.5 + 2; }
      for (const l of why(f)) { font(d, 9.5, 'normal', MUTED); l.forEach((s, i) => d.text(s, x + 12, yy + i * 12.5)); yy += l.length * 12.5 + 2; }
      if (st.from) { font(d, 7.5, 'normal', MUTED); d.text(st.from, x, yy + 6); }
      if (pic) { const s = picSize(), px = f.x + f.w - s.w; try { d.addImage(pic.dataUrl, 'JPEG', px, y + 8, s.w, s.h, `floor-${st.n}`); } catch { /* the step still prints */ } d.setDrawColor(LINE); d.setLineWidth(0.6); d.rect(px, y + 8, s.w, s.h); }
      d.setDrawColor(LINE); d.setLineWidth(0.6); d.line(f.x, y + h(f) - 6, f.x + f.w, y + h(f) - 6);
    },
  );
}

export function floorBlocks(m: FloorSheet, pictures: Map<string, Picture>): Block[] {
  const out: Block[] = [head(m)];
  if (m.warnings.length) out.push(care(m));
  if (!m.steps.length) out.push(box(() => 40, (f, y) => { font(f.doc, 11, 'normal', MUTED); f.doc.text('No steps are written yet.', f.x, y + 20); }));
  for (const st of m.steps) out.push(step(st, st.photoKey ? pictures.get(st.photoKey) : undefined));
  return out;
}

export async function drawFloorSheet(doc: jsPDF, m: FloorSheet, pictures: Map<string, Picture>, printed: string): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 26 };
  const density = await chooseDensity(base, () => floorBlocks(m, pictures));
  await pour({ ...base, density, dry: false }, floorBlocks(m, pictures), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(BAND); doc.rect(M, H - 52, CW, 0.6, 'F');
    font(doc, 8, 'normal', MUTED);
    doc.text(wrap(doc, [m.foot, m.source].filter(Boolean).join('  ·  ') || m.title, CW - 110, 8)[0] ?? '', M, H - 36);
    doc.text(wrap(doc, `${m.title}  ·  printed ${printed}`, CW - 60, 8)[0] ?? '', M, H - 22);
    doc.text(pages > 1 ? `Sheet ${i} of ${pages}` : '', W - M, H - 22, { align: 'right' });
  }
}

export async function saveFloorSheet(m: FloorSheet, pictures: Map<string, Picture>, printed: string, day: string): Promise<void> {
  const { loadPdfLib, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  await drawFloorSheet(doc, m, pictures, printed);
  await deliverPdf(doc, pdfFileName(m.title, 'at the machine', day));
}
