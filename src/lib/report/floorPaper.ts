/* AT THE MACHINE, ON PAPER — tools/doc/floorSheet as a lean standard work sheet (13 November — Rowland, shown a plain numbered list:
 * "its a bit bland, its just a list … a lean manufacturing sop would not use this, change it"). So it is the form the method uses, on
 * A4 landscape: a TITLE BLOCK (the kind, the job, a draft said; machine and line, version, who keeps it, when it is read again), the
 * KEY to its symbols, what to TAKE CARE of before starting, then the STEP TABLE — No. · What to do · Key point (how) · Why · Picture,
 * a step a row with its number in a ring, its care as a symbol with its word, and a frame where its picture goes (a missing picture
 * is seen, as a board shows a missing tool) — and the SIGN-OFF boxes. The header row is drawn again on every sheet it runs onto.
 * Light paper, graphite words; the one amber edge is the take-care box and a draft's word; a symbol always has its word beside it.
 * Nothing here works anything out. */
import type { jsPDF } from 'jspdf';
import { INK, INK2, MUTED, BAND, BRAND } from '../reportKit';
import type { Picture } from '../../tools/talk/talkPictures';
import type { FloorSheet, FloorStep } from '../../tools/doc/floorSheet';
import { box, font, rows, wrap, type Row } from './blocks';
import { chooseDensity, pour, type Block, type Frame } from './flow';

const W = 842, H = 595, M = 30, CW = W - 2 * M;
const AMBER = '#b45309', GRID = '#cbd5e1';

/** The care symbols of a standard work sheet, drawn (never a glyph a font may lack): a cross, a diamond, a ring, a triangle. */
function symbol(d: jsPDF, kind: string, x: number, y: number, r = 5): void {
  d.setFillColor(INK); d.setDrawColor(INK); d.setLineWidth(1.2);
  if (kind === 'Safety') { d.rect(x - r / 3, y - r, (2 * r) / 3, 2 * r, 'F'); d.rect(x - r, y - r / 3, 2 * r, (2 * r) / 3, 'F'); }
  else if (kind === 'Quality') d.triangle(x - r, y, x, y - r, x + r, y, 'F'), d.triangle(x - r, y, x, y + r, x + r, y, 'F');
  else if (kind === 'Food safety') d.circle(x, y, r - 0.8, 'S');
  else d.triangle(x - r, y + r * 0.8, x, y - r, x + r, y + r * 0.8, 'S');
}

function titleBlock(m: FloorSheet, printed: string): Block {
  const HT = 92, LEFT = 0.5;
  return box(() => HT + 10, (f, y) => {
    const d = f.doc, lw = f.w * LEFT;
    d.setFillColor(BAND); d.rect(f.x, y, f.w, HT, 'F');
    d.setFillColor(BRAND); d.rect(f.x, y, f.w, 3, 'F');
    d.setDrawColor(GRID); d.setLineWidth(0.8); d.rect(f.x, y, f.w, HT);
    font(d, 9, 'bold', BRAND); d.text(m.kind.toUpperCase(), f.x + 14, y + 22);
    const big = wrap(d, m.title, lw - 28, 21, 'bold').length <= 1;
    const tl = wrap(d, m.title, lw - 28, big ? 21 : 16, 'bold').slice(0, 2);
    font(d, big ? 21 : 16, 'bold', INK); tl.forEach((l, i) => d.text(l, f.x + 14, y + (big ? 48 : 42) + i * 19));
    if (m.agreed) { font(d, 9.5, 'normal', INK2); d.text(wrap(d, m.status, lw - 28, 9.5)[0] ?? '', f.x + 14, y + 78); }
    else {
      font(d, 9, 'bold', AMBER); const tag = 'DRAFT', tw = d.getTextWidth(tag) + 14;
      d.setDrawColor(AMBER); d.setLineWidth(1); d.roundedRect(f.x + 14, y + 66, tw, 16, 2, 2); d.text(tag, f.x + 21, y + 77.5);
      font(d, 9, 'normal', INK2); d.text(wrap(d, 'Not agreed yet — read it against the machine before it is used.', lw - 40 - tw, 9)[0] ?? '', f.x + 22 + tw, y + 77.5);
    }
    /* the boxes: two rows of three */
    const cells = [...m.cells.slice(0, 2), { label: 'Printed', value: printed }, ...m.cells.slice(2, 4), { label: 'Agreed', value: m.agreed ? m.status.replace(/^Agreed /, '') : 'Not yet' }];
    const x0 = f.x + lw, cw = (f.w - lw) / 3, ch = HT / 2;
    cells.forEach((c, i) => {
      const cx = x0 + (i % 3) * cw, cy = y + Math.floor(i / 3) * ch;
      d.setDrawColor(GRID); d.setLineWidth(0.8); d.rect(cx, cy, cw, ch);
      font(d, 7, 'bold', MUTED); d.text(c.label.toUpperCase(), cx + 8, cy + 14);
      font(d, 10.5, 'bold', INK); wrap(d, c.value, cw - 16, 10.5, 'bold').slice(0, 2).forEach((l, k) => d.text(l, cx + 8, cy + 30 + k * 12));
    });
  });
}

function careBox(m: FloorSheet): Block {
  const lines = (f: Frame) => m.warnings.map(w => wrap(f.doc, w, f.w - 190, 11.5, 'bold'));
  const h = (f: Frame) => Math.max(34, lines(f).reduce((s, l) => s + l.length * 15 + 4, 0) + 16);
  return box(f => h(f) + 10, (f, y) => {
    const d = f.doc, hh = h(f);
    d.setFillColor('#fff7ed'); d.rect(f.x, y, f.w, hh, 'F');
    d.setFillColor(AMBER); d.rect(f.x, y, 5, hh, 'F');
    d.setDrawColor(AMBER); d.setLineWidth(0.8); d.rect(f.x, y, f.w, hh);
    symbol(d, 'Safety', f.x + 24, y + hh / 2, 7);
    font(d, 9, 'bold', AMBER); d.text('TAKE CARE', f.x + 42, y + hh / 2 - 2); d.text('BEFORE YOU START', f.x + 42, y + hh / 2 + 9);
    let yy = y + 20;
    for (const l of lines(f)) { font(d, 11.5, 'bold', INK); l.forEach((s, i) => d.text(s, f.x + 160, yy + i * 15)); yy += l.length * 15 + 4; }
  });
}

interface Col { head: string; w: number }
function colsOf(m: FloorSheet): Col[] {
  return m.hasWhy
    ? [{ head: 'No.', w: 0.06 }, { head: 'Important step — what to do', w: 0.27 }, { head: 'Key points — how', w: 0.25 }, { head: 'Why', w: 0.22 }, { head: 'Picture', w: 0.2 }]
    : [{ head: 'No.', w: 0.06 }, { head: 'What to do', w: 0.37 }, { head: 'Key point — how', w: 0.35 }, { head: 'Picture', w: 0.22 }];
}

function stepRows(m: FloorSheet, pictures: Map<string, Picture>): Block {
  const cols = colsOf(m), PAD = 9;
  const xs = (f: Frame) => cols.reduce<number[]>((a, c, i) => [...a, a[i] + f.w * c.w], [f.x]);
  const header: Row = {
    h: () => 24,
    draw: (f, y) => {
      const d = f.doc, x = xs(f);
      d.setFillColor(BAND); d.rect(f.x, y, f.w, 24, 'F'); d.setFillColor(BRAND); d.rect(f.x, y, f.w, 2, 'F');
      d.setDrawColor(GRID); d.setLineWidth(0.8); d.rect(f.x, y, f.w, 24);
      cols.forEach((c, i) => { font(d, 8.5, 'bold', INK2); d.text(c.head.toUpperCase(), x[i] + PAD, y + 16); if (i) d.line(x[i], y, x[i], y + 24); });
    },
  };
  const make = (st: FloorStep): Row => {
    const pic = st.photoKey ? pictures.get(st.photoKey) : undefined;
    const picW = (f: Frame) => f.w * cols[cols.length - 1].w - 2 * PAD;
    const picSize = (f: Frame) => (pic ? (() => { const s = Math.min(picW(f) / pic.w, 96 / pic.h); return { w: pic.w * s, h: pic.h * s }; })() : { w: picW(f), h: 38 });
    const doL = (f: Frame) => wrap(f.doc, st.do, f.w * cols[1].w - 2 * PAD, 12, 'bold');
    const ptL = (f: Frame) => st.points.map(p => wrap(f.doc, p, f.w * cols[2].w - 2 * PAD - 10, 10.5));
    const whyL = (f: Frame) => (m.hasWhy ? st.why.map(p => wrap(f.doc, p, f.w * cols[3].w - 2 * PAD - 10, 10)) : []);
    const colH = (ls: string[][], lh: number) => ls.reduce((s, l) => s + l.length * lh + 3, 0);
    const h = (f: Frame) => Math.max(doL(f).length * 15 + (st.from ? 12 : 0), (st.care ? 17 : 0) + colH(ptL(f), 13.5), colH(whyL(f), 13), picSize(f).h, 30) + 2 * PAD + 2;
    return {
      h,
      draw: (f, y) => {
        const d = f.doc, x = xs(f), hh = h(f);
        d.setDrawColor(GRID); d.setLineWidth(0.8); d.rect(f.x, y, f.w, hh);
        for (let i = 1; i < cols.length; i++) d.line(x[i], y, x[i], y + hh);
        /* the number in its ring */
        const cx = (x[0] + x[1]) / 2, cy = y + PAD + 13;
        d.setFillColor('#ffffff'); d.setDrawColor(BRAND); d.setLineWidth(1.6); d.circle(cx, cy, 13, 'FD');
        font(d, 14, 'bold', INK); d.text(String(st.n), cx, cy + 5, { align: 'center' });
        /* what to do */
        font(d, 12, 'bold', INK); doL(f).forEach((l, i) => d.text(l, x[1] + PAD, y + PAD + 11 + i * 15));
        if (st.from) { font(d, 7.5, 'normal', MUTED); d.text(st.from, x[1] + PAD, y + PAD + 11 + doL(f).length * 15); }
        /* key points, the care first as its symbol and its word */
        let yy = y + PAD + 10;
        if (st.care) { symbol(d, st.care, x[2] + PAD + 5, yy - 3, 4.5); font(d, 8.5, 'bold', INK); d.text(st.care.toUpperCase(), x[2] + PAD + 15, yy); yy += 17; }
        for (const l of ptL(f)) { font(d, 10.5, 'normal', INK); d.setFillColor(INK2); d.circle(x[2] + PAD + 2.5, yy - 3.5, 1.6, 'F'); l.forEach((s, i) => d.text(s, x[2] + PAD + 10, yy + i * 13.5)); yy += l.length * 13.5 + 3; }
        if (!st.points.length && !st.care) { font(d, 10, 'normal', GRID); d.text('—', x[2] + PAD, yy); }
        if (m.hasWhy) {
          let wy = y + PAD + 10;
          for (const l of whyL(f)) { font(d, 10, 'normal', INK2); d.setFillColor(GRID); d.circle(x[3] + PAD + 2.5, wy - 3.5, 1.6, 'F'); l.forEach((s, i) => d.text(s, x[3] + PAD + 10, wy + i * 13)); wy += l.length * 13 + 3; }
          if (!st.why.length) { font(d, 10, 'normal', GRID); d.text('—', x[3] + PAD, wy); }
        }
        /* the picture, or the frame it belongs in */
        const px = x[cols.length - 1] + PAD, s = picSize(f);
        if (pic) { try { d.addImage(pic.dataUrl, 'JPEG', px, y + PAD, s.w, s.h, `floor-${st.n}`); } catch { /* the step still prints */ } d.setDrawColor(GRID); d.setLineWidth(0.6); d.rect(px, y + PAD, s.w, s.h); }
        else {
          d.setDrawColor(GRID); d.setLineWidth(0.7); d.setLineDashPattern([3, 3], 0); d.rect(px, y + PAD, s.w, hh - 2 * PAD); d.setLineDashPattern([], 0);
          font(d, 8, 'normal', MUTED); d.text(`Photo of step ${st.n}`, px + s.w / 2, y + hh / 2 + 3, { align: 'center' });
        }
      },
    };
  };
  return rows({ header, rows: m.steps.map(make), after: 'm' });
}

function keyLine(m: FloorSheet): Block {
  const used = [...new Set(m.steps.map(s => s.care).filter(Boolean))];
  if (!used.length) return box(() => 0, () => undefined);
  return box(() => 20, (f, y) => {
    const d = f.doc; let x = f.x;
    font(d, 8, 'bold', MUTED); d.text('KEY', x, y + 10); x += 28;
    for (const k of used) { symbol(d, k, x + 5, y + 7, 4.5); font(d, 8.5, 'normal', INK2); d.text(k, x + 15, y + 10); x += 26 + d.getTextWidth(k); }
  });
}

function signOff(m: FloorSheet): Block {
  return box(() => 46, (f, y) => {
    const d = f.doc, w = f.w / m.signs.length;
    m.signs.forEach((sg, i) => {
      d.setDrawColor(GRID); d.setLineWidth(0.8); d.rect(f.x + i * w, y, w, 40);
      font(d, 7, 'bold', MUTED); d.text(sg.label.toUpperCase(), f.x + i * w + 8, y + 13);
      font(d, 10.5, 'bold', INK); d.text(wrap(d, sg.value, w - 16, 10.5, 'bold')[0] ?? '', f.x + i * w + 8, y + 30);
    });
  });
}

export function floorBlocks(m: FloorSheet, pictures: Map<string, Picture>, printed = ''): Block[] {
  const out: Block[] = [titleBlock(m, printed)];
  if (m.warnings.length) out.push(careBox(m));
  out.push(keyLine(m));
  if (!m.steps.length) out.push(box(() => 40, (f, y) => { font(f.doc, 11, 'normal', MUTED); f.doc.text('No steps are written yet.', f.x, y + 20); }));
  else out.push(stepRows(m, pictures));
  out.push(signOff(m));
  return out;
}

export async function drawFloorSheet(doc: jsPDF, m: FloorSheet, pictures: Map<string, Picture>, printed: string): Promise<void> {
  const base = { doc, x: M, w: CW, top: M + 8, bottom: H - M - 14 };
  const density = await chooseDensity(base, () => floorBlocks(m, pictures, printed));
  await pour({ ...base, density, dry: false }, floorBlocks(m, pictures, printed), () => doc.addPage('a4', 'landscape'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 8, 'normal', MUTED);
    doc.text(wrap(doc, [m.title, m.source].filter(Boolean).join('  ·  '), CW - 90, 8)[0] ?? '', M, H - 18);
    doc.text(pages > 1 ? `Sheet ${i} of ${pages}` : '', W - M, H - 18, { align: 'right' });
  }
}

export async function saveFloorSheet(m: FloorSheet, pictures: Map<string, Picture>, printed: string, day: string): Promise<void> {
  const { loadPdfLib, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  await drawFloorSheet(doc, m, pictures, printed);
  await deliverPdf(doc, pdfFileName(m.title, 'at the machine', day));
}
