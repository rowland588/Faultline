/* MACHINES ON PAPER — the one drawer for every machine paper (lib/machinePaper): the machine report, the project's
 * Machines report and the factory's machines.
 *
 * Laid out by the report engine (src/lib/report/, docs/REPORTS.md). A list of machines first when there is one —
 * its sentence on the band, then each group (a line, or the project) a row a machine: its name and status, its line
 * of words, and on the right what is next, in its colour with the word. Then a page a machine: the band with its
 * status and facts, the project it is going through and its four gates in a row, and each section's rows — what,
 * the words under it, and on the right its state in its colour. Nothing is left off: a long list carries on. */
import type { jsPDF } from 'jspdf';
import type { Delivered } from './savePdf';
import { paperBand } from './reportKit';
import type { MachinePaper, MachinesPaper, PaperTone } from './machinePaper';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, label, rows, text, wrap } from './report/blocks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#0f1417', INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', BRAND = '#0c7489';
/* the five state colours as words are drawn on paper (CLAUDE.md, visual management) */
const TONE: Record<PaperTone, string> = { r: '#c4281c', a: '#b45309', w: '#6d28d9', g: '#15803d', n: '#6b7588' };

const pad = (f: Frame) => (f.density === 'compact' ? 4 : 6);

/** A row: words on the left (bold head, muted line under it), its state on the right in its colour. */
function rowOf(head: string, under: string | undefined, right: string, tone: PaperTone, lead?: string) {
  const rightW = (f: Frame) => Math.min(190, f.w * 0.36), numW = lead ? 20 : 0;
  const parts = (f: Frame) => ({
    h: wrap(f.doc, head, f.w - rightW(f) - numW - 12, 9.5, 'bold'),
    u: under ? wrap(f.doc, under, f.w - rightW(f) - numW - 12, 8.5) : [],
    r: wrap(f.doc, right, rightW(f), 8.5, 'bold'),
  });
  return {
    h: (f: Frame) => { const p = parts(f); return 2 * pad(f) + Math.max(p.h.length * 12 + p.u.length * 10.5, p.r.length * 10.5) + 2; },
    draw: (f: Frame, top: number) => {
      const p = parts(f), y = top + pad(f);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, top, f.x + f.w, top);
      if (lead) { font(f.doc, 9.5, 'bold', MUTED); f.doc.text(lead, f.x, y + 9); }
      font(f.doc, 9.5, 'bold', INK2); f.doc.text(p.h, f.x + numW, y + 9);
      if (p.u.length) { font(f.doc, 8.5, 'normal', MUTED); f.doc.text(p.u, f.x + numW, y + 9 + p.h.length * 12 - 1.5); }
      font(f.doc, 8.5, 'bold', TONE[tone]); f.doc.text(p.r, f.x + f.w, y + 9, { align: 'right' });
    },
  };
}

/** The band: what it is in capitals, its name large, the words beside. */
function band(eyebrow: string, title: string, says: string[], status?: { word: string; tone: PaperTone }): Block[] {
  const out: Block[] = [];
  out.push(text({ text: eyebrow, size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 5 }));
  out.push(text({ text: title, size: SIZE.title, style: 'bold', after: 6 }));
  const lines = (f: Frame) => says.flatMap(s => wrap(f.doc, s, f.w - 28, 10.5, 'bold'));
  out.push(box(f => 16 + (status ? 16 : 0) + lines(f).length * 14 + gap(f.density, 'm'), (f, y) => {
    const l = lines(f), h = 12 + (status ? 16 : 0) + l.length * 14;
    paperBand(f.doc, f.x, y, f.w, h, 6);
    let yy = y + 17;
    if (status) { font(f.doc, 11, 'bold', TONE[status.tone]); f.doc.text(status.word.toUpperCase(), f.x + 14, yy); yy += 16; }
    font(f.doc, 10.5, 'bold', INK); f.doc.text(l, f.x + 14, yy);
  }, f => gap(f.density, 'm')));
  return out;
}

function frontOf(p: MachinesPaper): Block[] {
  const out: Block[] = band(p.eyebrow, p.title, [p.says]);
  for (const g of p.groups) {
    if (g.head) out.push(label(g.head));
    if (!g.rows.length) { out.push(text({ text: g.empty ?? 'None.', colour: MUTED, after: 10 })); continue; }
    out.push(rows({
      rows: g.rows.map(r => rowOf(`${r.name}${r.status ? `  —  ${r.status.word}` : ''}`, r.says, r.right, r.rightTone ?? 'n', r.n != null ? String(r.n) : undefined)),
      after: 'm',
    }));
  }
  return out;
}

function machineOf(m: MachinePaper): Block[] {
  const out: Block[] = band(m.eyebrow, m.name, m.facts.length ? [m.facts.join('   ·   ')] : [], m.status);
  if (m.inProject) out.push(text({ text: m.inProject, size: 10.5, style: 'bold', colour: INK2, after: 6 }));
  const gates = m.gates ?? [];
  if (gates.length) {
    const n = gates.length;
    const cell = (f: Frame, i: number) => ({ x: f.x + i * (f.w / n), w: f.w / n - 6 });
    const saysOf = (f: Frame) => gates.map((g, i) => wrap(f.doc, g.says, cell(f, i).w - 12, 8));
    const tall = (f: Frame) => Math.max(...saysOf(f).map(l => l.length));
    out.push(box(f => 30 + tall(f) * 10 + gap(f.density, 'm'), (f, y) => {
      const h = 22 + tall(f) * 10, says = saysOf(f);
      gates.forEach((g, i) => {
        const c = cell(f, i);
        f.doc.setDrawColor(TONE[g.tone]); f.doc.setLineWidth(1.2); f.doc.roundedRect(c.x, y, c.w, h, 4, 4, 'S');
        f.doc.setFillColor(TONE[g.tone]); f.doc.rect(c.x, y + 3, 3, h - 6, 'F');
        font(f.doc, 9, 'bold', INK); f.doc.text(g.label, c.x + 9, y + 13);
        font(f.doc, 8, 'normal', g.tone === 'n' ? MUTED : TONE[g.tone]); f.doc.text(says[i], c.x + 9, y + 25);
      });
    }, f => gap(f.density, 'm')));
  }
  for (const s of m.sections) {
    out.push(label(`${s.title} · ${s.count}`));
    if (!s.rows.length) { out.push(text({ text: s.empty, colour: MUTED, after: 10 })); continue; }
    out.push(rows({ rows: s.rows.map(r => rowOf(r.what, r.says || undefined, r.word, r.tone)), after: 'm' }));
  }
  return out;
}

async function pourOn(doc: jsPDF, build: (d: Density) => Block[]): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 22 };
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(density), () => doc.addPage('a4', 'portrait'));
}

/** Draw machines into `doc`: the list first when it has one, then a page a machine. */
export async function drawMachinesPaper(doc: jsPDF, p: MachinesPaper, printed: string): Promise<void> {
  let first = true;
  if (p.groups.length) { await pourOn(doc, () => frontOf(p)); first = false; }
  for (const m of p.machines) {
    if (!first) doc.addPage('a4', 'portrait');
    first = false;
    await pourOn(doc, () => machineOf(m));
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`${p.foot}  ·  ${printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

/** Make the paper and hand it to the person — downloaded, or opened from the bar. */
export async function saveMachinesPaper(p: MachinesPaper, file: [string, string]): Promise<Delivered> {
  const { loadPdfLib, deliverPdf } = await import('./savePdf');
  const { pdfFileName } = await import('./fileName');
  const { niceDay, todayISO } = await import('./weeks');
  const { jsPDF: PDF } = await loadPdfLib();
  const doc = new PDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const today = todayISO();
  await drawMachinesPaper(doc, p, niceDay(today, { year: true }));
  return deliverPdf(doc, pdfFileName(file[0], file[1], today));
}
