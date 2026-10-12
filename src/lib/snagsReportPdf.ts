/* THE SNAGS REPORT — the Snags page on paper, of its own (lib/snagsReport).
 *
 * Rowland, 12 October: "Snags need its own report on the snag page."
 *
 * What the page is showing, as it shows it: where things stand in a tile per
 * count and a sentence; then line by line, every snag still on its line —
 * its picture, what is wrong, how it was taken, its latest word, its state in
 * words and in its colour, whose it is and by when (late in red); then the
 * snags moved to jobs, job by job, each saying what it became there and how it
 * stands now. Poured by the report engine (lib/report, docs/REPORTS.md),
 * never placed by hand. The one-page-a-snag card for Engineering stays its
 * own thing (lib/snagCardPdf). */
import type { jsPDF } from 'jspdf';
import type { MovedRow, SnagRow, SnagsReading, SnagTone } from './snagsReport';
import { san, OK, DANGER, BLUE, WARN } from './reportKit';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, rows, text, wrap } from './report/blocks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef', BRAND = '#1f63e0';
const TONE: Record<SnagTone, string> = { g: OK, r: DANGER, w: BLUE, a: WARN, n: MUTED };
const THUMB = 42, RIGHT = 150;

/** A snag's first picture, made small for paper: a data URL and its size. */
export interface SnagPhoto { dataUrl: string; w: number; h: number }

function thumb(doc: jsPDF, p: SnagPhoto | undefined, x: number, y: number): void {
  doc.setDrawColor(LINE); doc.setLineWidth(0.5);
  if (!p) { doc.roundedRect(x, y, THUMB, THUMB, 3, 3, 'S'); return; }
  /* Fitted inside the square, its shape kept — a tall frame is never stretched. */
  const s = Math.min(THUMB / p.w, THUMB / p.h), w = p.w * s, h = p.h * s;
  try { doc.addImage(p.dataUrl, 'JPEG', x + (THUMB - w) / 2, y + (THUMB - h) / 2, w, h); } catch { /* an unreadable picture: the words still print */ }
  doc.roundedRect(x, y, THUMB, THUMB, 3, 3, 'S');
}

interface Parts { what: string[]; from: string[]; note: string[]; right: { t: string; c: string; bold?: boolean }[] }

function snagParts(f: Frame, r: SnagRow): Parts {
  const tw = f.w - THUMB - 10 - RIGHT - 10;
  const right: Parts['right'] = [{ t: r.word, c: TONE[r.tone], bold: true }];
  if (r.owner) right.push({ t: r.owner, c: INK2 });
  else if (r.status !== 'closed') right.push({ t: 'nobody yet', c: MUTED });
  if (r.due) right.push({ t: r.due, c: r.dueTone ? (r.dueTone === 'n' ? INK2 : TONE[r.dueTone]) : INK2, bold: r.late });
  return {
    what: wrap(f.doc, san(r.what), tw, 9.5, 'bold'),
    from: wrap(f.doc, san(r.from + (r.forJob ? ` · for ${r.forJob} — not moved yet` : '')), tw, 8),
    note: r.update ? wrap(f.doc, san(`Latest: ${r.update}`), tw, 8.5) : [],
    right,
  };
}
function movedParts(f: Frame, r: MovedRow): Parts {
  const tw = f.w - THUMB - 10 - RIGHT - 10;
  return {
    what: wrap(f.doc, san(r.what), tw, 9.5, 'bold'),
    from: wrap(f.doc, san(`${r.line} · ${r.from}`), tw, 8),
    note: [],
    right: wrap(f.doc, san(r.says), RIGHT, 8.5, 'bold').map(t => ({ t, c: TONE[r.tone], bold: true })),
  };
}
const height = (p: Parts) => 8 + Math.max(THUMB, p.what.length * 12 + p.from.length * 10 + p.note.length * 11, p.right.length * 11) + 8;

function drawRow(f: Frame, y: number, p: Parts, photo?: SnagPhoto): void {
  f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
  thumb(f.doc, photo, f.x, y + 8);
  const tx = f.x + THUMB + 10;
  let ty = y + 19;
  font(f.doc, 9.5, 'bold', INK2); f.doc.text(p.what, tx, ty); ty += p.what.length * 12;
  font(f.doc, 8, 'normal', MUTED); f.doc.text(p.from, tx, ty - 1); ty += p.from.length * 10;
  if (p.note.length) { font(f.doc, 8.5, 'normal', INK2); f.doc.text(p.note, tx, ty); }
  /* The state in words, in its colour — never the colour alone. */
  p.right.forEach((x, i) => { font(f.doc, 8.5, x.bold ? 'bold' : 'normal', x.c); f.doc.text(x.t, f.x + f.w - RIGHT, y + 19 + i * 11); });
}

export function snagsBlocks(r: SnagsReading, d: Density, photos: Map<string, SnagPhoto>): Block[] {
  const out: Block[] = [];
  for (const g of r.lines) {
    const late = g.rows.filter(x => x.late).length, open = g.rows.filter(x => x.status !== 'closed').length;
    out.push({ ...text({ text: san(`${g.name} · ${g.rows.length} snag${g.rows.length === 1 ? '' : 's'} — ${open} not closed${late ? `, ${late} late` : ''}`), size: SIZE.h2, style: 'bold', colour: INK2, before: 6, after: 4 }), keepWithNext: true });
    out.push(rows({ rows: g.rows.map(x => ({ h: (f: Frame) => height(snagParts(f, x)), draw: (f: Frame, y: number) => drawRow(f, y, snagParts(f, x), x.photo ? photos.get(x.photo) : undefined) })), after: 'm' }));
  }
  if (r.moved.length) {
    out.push({ ...text({ text: 'MOVED TO JOBS — WHERE EACH IS NOW', size: SIZE.eyebrow, style: 'bold', colour: BRAND, before: 8, after: 4 }), keepWithNext: true });
    for (const g of r.moved) {
      const open = g.rows.filter(x => x.open).length;
      out.push({ ...text({ text: san(`${g.job} · ${g.rows.length} moved — ${open ? `${open} still open there` : 'none open there'}`), size: SIZE.h2, style: 'bold', colour: INK2, before: 4, after: 4 }), keepWithNext: true });
      out.push(rows({ rows: g.rows.map(x => ({ h: (f: Frame) => height(movedParts(f, x)), draw: (f: Frame, y: number) => drawRow(f, y, movedParts(f, x), x.photo ? photos.get(x.photo) : undefined) })), after: 'm' }));
    }
  }
  if (!out.length) out.push(text({ text: 'No snags here.', colour: INK2, after: gap(d, 's') }));
  return out;
}

/** THE SNAGS REPORT — its own document. `title` is what the page was showing:
 *  "Every snag", "Open snags on Line 7". */
export async function drawSnagsReport(doc: jsPDF, x: { title: string; printed: string; reading: SnagsReading; photos: Map<string, SnagPhoto> }): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const r = x.reading, c = r.counts;
  const title = san(x.title);
  const blocks = (d: Density): Block[] => {
    const out: Block[] = [];
    out.push(text({ text: 'SNAGS', size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
    out.push(text({ text: title, size: SIZE.title, style: 'bold', after: 4 }));
    out.push(text({ text: `Printed ${san(x.printed)}`, colour: MUTED, after: gap(d, 'm') }));
    /* WHERE THE SNAGS ARE — a tile per count; only the abnormal in its colour,
       a zero grey (CLAUDE.md, visual management rule 3). */
    const tiles: { n: number; word: string; c: string }[] = [
      { n: c.open, word: 'open', c: DANGER }, { n: c.late, word: 'late', c: DANGER }, { n: c.in_progress, word: 'in progress', c: BLUE },
      { n: c.closed, word: 'closed', c: OK }, { n: c.moved, word: c.moved ? `moved · ${c.movedOpen} open there` : 'moved to jobs', c: c.movedOpen ? WARN : INK2 },
    ];
    out.push(box(() => 46 + gap(d, 'm'), (f, y) => {
      const tw = (f.w - 4 * 8) / 5;
      tiles.forEach((t, i) => {
        const tx = f.x + i * (tw + 8), col = t.n ? t.c : MUTED;
        f.doc.setDrawColor(t.n ? col : LINE); f.doc.setLineWidth(t.n && t.c === DANGER ? 1.4 : 0.8);
        f.doc.roundedRect(tx, y, tw, 40, 5, 5, 'S');
        font(f.doc, 16, 'bold', col); f.doc.text(String(t.n), tx + 9, y + 20);
        font(f.doc, 8, 'normal', t.n ? INK2 : MUTED); f.doc.text(wrap(f.doc, t.word, tw - 14, 8)[0] ?? '', tx + 9, y + 33);
      });
    }));
    out.push(text({ text: san(r.says), size: 9.5, colour: INK2, after: gap(d, 'm') }));
    out.push(...snagsBlocks(r, d, x.photos));
    return out;
  };
  const density = await chooseDensity(base, d => blocks(d));
  await pour({ ...base, density, dry: false }, blocks(density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`Snags  ·  ${title}  ·  ${san(x.printed)}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
