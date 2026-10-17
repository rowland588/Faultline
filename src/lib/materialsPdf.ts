/* WHAT WE ARE WAITING ON, ON PAPER — one A4 page where it fits (lib/
 * materialsReport reads it; docs/AUDIT.md, bar 3).
 *
 * Laid out by the report engine (src/lib/report/, docs/REPORTS.md): the job
 * and the day, the dark band saying how many are here, then the late ones
 * (red — the day has gone), what is still coming by the day it is due, what
 * has no date agreed, and what is in, named once and quietly. A list too long
 * for a page carries on, its header repeated; nothing is cut. */
import type { jsPDF } from 'jspdf';
import type { MaterialPaperRow, MaterialsReading } from './materialsReport';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, heading, rows, text, wrap, type Row } from './report/blocks';
import { leanClosing, leanTiles } from './report/lean';
import type { LeanTile } from './lean';
import { materialClosing, materialTiles } from './stageGatePages';
import { niceDay } from './weeks';
import { san, paperBand } from './reportKit';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#0f1417', INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', BRAND = '#0c7489';
const RED = '#c4281c';
const T = 8.5, S = 7.5, LH = 10.6, LS = 9.4;

function band(headline: string, says: string, late: boolean): Block {
  const parts = (f: Frame) => ({ h: wrap(f.doc, headline, f.w - 30, 11, 'bold'), s: wrap(f.doc, says, f.w - 30, T) });
  const height = (f: Frame) => { const p = parts(f); return 22 + p.h.length * 14 + (p.s.length ? 4 + p.s.length * LH : 0); };
  return box(f => height(f) + gap(f.density, 'm'), (f, y) => {
    const p = parts(f), h = height(f);
    paperBand(f.doc, f.x, y, f.w, h, 6);
    /* late: the band's edge in red, as the screen's late border is */
    if (late) { f.doc.setFillColor(RED); f.doc.roundedRect(f.x, y, 4, h, 2, 2, 'F'); }
    font(f.doc, 11, 'bold', '#0f1417'); f.doc.text(p.h, f.x + 15, y + 17);
    font(f.doc, T, 'normal', '#323d43'); f.doc.text(p.s, f.x + 15, y + 17 + p.h.length * 14 + 2);
  }, f => gap(f.density, 'm'));
}

/** A table of materials: what it is (how much · for · from under it, and why
 *  its date moved), the day it is due and how far off — red when late. */
function table(list: MaterialPaperRow[]): Block {
  const WHEN = 92, DUE = 54;
  const whatW = (f: Frame) => f.w - WHEN - DUE - 8;
  const parts = (f: Frame, r: MaterialPaperRow) => ({
    what: wrap(f.doc, r.what, whatW(f), T, 'bold'),
    facts: r.facts ? wrap(f.doc, r.facts, whatW(f), S) : [],
    moved: r.moved ? wrap(f.doc, r.moved, whatW(f), S) : [],
    note: r.note ? wrap(f.doc, r.note, whatW(f), S) : [],
    when: wrap(f.doc, r.when, WHEN - 4, T, r.state === 'late' ? 'bold' : 'normal'),
  });
  const rowH = (f: Frame, r: MaterialPaperRow) => {
    const p = parts(f, r);
    return 6 + Math.max(p.what.length * LH + (p.facts.length + p.moved.length + p.note.length) * LS, p.when.length * LH) + 4;
  };
  const header: Row = {
    h: () => 17,
    draw: (f, y) => {
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      f.doc.text('WHAT IT IS', f.x, y + 11);
      f.doc.text('DUE', f.x + f.w - WHEN - 4, y + 11, { align: 'right' });
      f.doc.text('WHERE IT IS', f.x + f.w, y + 11, { align: 'right' });
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 16, f.x + f.w, y + 16);
    },
  };
  return rows({
    header,
    rows: list.map(r => ({
      h: f => rowH(f, r),
      draw: (f, y) => {
        const p = parts(f, r), ty = y + 6 + T * 0.92, late = r.state === 'late';
        font(f.doc, T, 'bold', INK); f.doc.text(p.what, f.x, ty);
        let yy = ty + p.what.length * LH - 1;
        font(f.doc, S, 'normal', MUTED);
        if (p.facts.length) { f.doc.text(p.facts, f.x, yy); yy += p.facts.length * LS; }
        font(f.doc, S, 'normal', late ? RED : MUTED);
        if (p.moved.length) { f.doc.text(p.moved, f.x, yy); yy += p.moved.length * LS; }
        font(f.doc, S, 'normal', MUTED);
        if (p.note.length) f.doc.text(p.note, f.x, yy);
        font(f.doc, T, 'normal', INK2); f.doc.text(san(r.due), f.x + f.w - WHEN - 4, ty, { align: 'right' });
        font(f.doc, T, late ? 'bold' : 'normal', late ? RED : INK2); f.doc.text(p.when, f.x + f.w, ty, { align: 'right' });
        const h = rowH(f, r);
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + h - 0.5, f.x + f.w, y + h - 0.5);
      },
    })),
    after: 'm',
  });
}

/* THE LEAN PAGE (docs/LEAN-PAGE.md; lib/stageGatePages) — the page's tiles,
   and its closing line, the job's money among them when the page passed it */
const leanOf = (r: MaterialsReading, money?: LeanTile) => {
  const m = money ?? { k: '', v: '', of: '' };
  return { tiles: materialTiles(r.tally, m, iso => niceDay(iso)).slice(0, money ? 5 : 4), closing: materialClosing(r.tally, m) };
};

function blocksOf(r: MaterialsReading, d: Density, money?: LeanTile): Block[] {
  const out: Block[] = [];
  const lean = leanOf(r, money);
  out.push(text({ text: `WHAT WE ARE WAITING ON · ${r.job.toUpperCase()}`, size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: 'Materials', size: SIZE.title, style: 'bold', after: 4 }));
  out.push(text({ text: `${r.job} · printed ${r.printed}`, colour: MUTED, after: gap(d, 'm') }));
  if (r.total) out.push(leanTiles(lean.tiles));
  out.push(band(r.headline, r.says, r.late.length > 0));
  if (r.late.length) { out.push(heading('Late — what is holding us up', `${r.late.length} past the day ${r.late.length === 1 ? 'it was' : 'they were'} due, the longest first`)); out.push(table(r.late)); }
  if (r.coming.length) { out.push(heading('Still coming', 'by the day each is due')); out.push(table(r.coming)); }
  if (r.undated.length) { out.push(heading('No date agreed', 'needed, and nobody has said when — ask whoever is bringing it')); out.push(table(r.undated)); }
  if (r.here.length) {
    out.push(heading(`In — ${r.here.length} of ${r.total}`));
    out.push(text({ text: `${r.here.join(' · ')}.`, size: T, colour: INK2, after: gap(d, 'm') }));
  }
  if (r.total) out.push(leanClosing(lean.closing));
  return out;
}

/** Draw the materials into `doc`: one page where it fits, every row always on it. */
export async function drawMaterialsReport(doc: jsPDF, r: MaterialsReading, money?: LeanTile): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => blocksOf(r, d, money));
  await pour({ ...base, density, dry: false }, blocksOf(r, density, money), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  const long = `${r.job} · what we are waiting on · printed ${r.printed}`;
  const foot = wrap(doc, long, CW - 60, 7.5).length === 1 ? long : `What we are waiting on · printed ${r.printed}`;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(san(foot), M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

/** Made from the job's records and handed over: saved, the bar offering Open and Send. */
export async function saveMaterialsReport(projectId: string, job: string, lineName: (id?: string) => string | undefined, money?: LeanTile): Promise<void> {
  const { listMaterials, listTests, listTestItems } = await import('../db');
  const { loadPdfLib, deliverPdf, titlePdf } = await import('./savePdf');
  const { pdfFileName } = await import('./fileName');
  const { materialsReading } = await import('./materialsReport');
  const { todayISO } = await import('./weeks');
  const [materials, tests, items] = await Promise.all([listMaterials(projectId), listTests(projectId), listTestItems(projectId)]);
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const today = todayISO();
  titlePdf(doc, `${job} — materials`);
  await drawMaterialsReport(doc, materialsReading({ job, printed: niceDay(today, { year: true }), materials, lineName, tests, items, today }), money);
  await deliverPdf(doc, pdfFileName(job, 'materials', today));
}
