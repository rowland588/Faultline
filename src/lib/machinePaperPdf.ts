/* MACHINES ON PAPER — the one drawer for every machine paper (lib/machinePaper): the machine report, the project's
 * Machines report and the factory's machines.
 *
 * MADE EASY TO READ, 27 October (Rowland: "Each section needs sectioning off, and each of its own section needs to
 * have clear headers. At the moment, for example, tests, they're all grayed out ... it must be easy to read plain
 * English, and nobody can make a mistake when reading this"). A machine's pages open with how to read them (the five
 * colours, each with its words) and what is in them (a numbered list of its parts); then each part under a band of its
 * own — its number, its name, how many, and one sentence of what it holds — and each thing in it a card: its name in
 * black, its status one word on a coloured label, and its detail a labelled line each (what it had to show; every
 * attempt with its day and its result in its colour; what was found; who has it; by when), the words in black, never
 * grey. What is open is a table — what, who has it, by when, its status. A card too long for a page carries on, said.
 *
 * Laid out by the report engine (src/lib/report/, docs/REPORTS.md). A list of machines first when there is one —
 * its sentence on the band, then each group (a line, or the project) a row a machine: its name and status, its line
 * of words, and on the right what is next, in its colour with the word. Then a page a machine: the band with its
 * status and facts, the project it is going through and its four gates in a row, and each section's rows — what,
 * the words under it, and on the right its state in its colour. Nothing is left off: a long list carries on. */
import type { jsPDF } from 'jspdf';
import type { Delivered } from './savePdf';
import { paperBand } from './reportKit';
import type { MachinePaper, MachinesPaper, PaperRow, PaperTone } from './machinePaper';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, label, rows, text, wrap } from './report/blocks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#0f1417', INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', BRAND = '#0c7489';
/* the five state colours as words are drawn on paper (CLAUDE.md, visual management) */
const TONE: Record<PaperTone, string> = { r: '#c4281c', a: '#b45309', w: '#6d28d9', g: '#15803d', n: '#6b7588' };

const pad = (f: Frame) => (f.density === 'compact' ? 4 : 6);

/* ---- the parts of a machine's pages (27 October) ---- */

/** A status as a label: its word in capitals on its colour (white words on a state's colour — the one exception,
 *  CLAUDE.md); grey, too pale for white words, is drawn as an outline with its grey words. */
const PILL = 7.6;
function pillW(doc: jsPDF, word: string): number { font(doc, PILL, 'bold'); return doc.getTextWidth(word) + 12; }
function pill(doc: jsPDF, word: string, tone: PaperTone, xRight: number, y: number): void {
  if (!word) return;
  const w = pillW(doc, word), x = xRight - w;
  if (tone === 'n') { doc.setDrawColor(TONE.n); doc.setLineWidth(0.8); doc.roundedRect(x, y, w, 13, 6.5, 6.5, 'S'); font(doc, PILL, 'bold', TONE.n); }
  else { doc.setFillColor(TONE[tone]); doc.roundedRect(x, y, w, 13, 6.5, 6.5, 'F'); font(doc, PILL, 'bold', '#ffffff'); }
  doc.text(word, x + 6, y + 9.2);
}

/** A part's band: its number, its name, how many — and under it one sentence of what it holds. Kept with what follows. */
function sectionHead(n: number, title: string, count: string, intro?: string): Block {
  const introL = (f: Frame) => (intro ? wrap(f.doc, intro, f.w - 4, 9) : []);
  return {
    ...box(f => 26 + (intro ? introL(f).length * 11.5 + 6 : 0) + 6, (f, y) => {
      paperBand(f.doc, f.x, y, f.w, 24, 4);
      font(f.doc, 12.5, 'bold', BRAND); f.doc.text(String(n), f.x + 12, y + 16.5);
      font(f.doc, 12.5, 'bold', INK); f.doc.text(title, f.x + 30, y + 16.5);
      font(f.doc, 9.5, 'bold', INK2); f.doc.text(count, f.x + f.w - 10, y + 16.5, { align: 'right' });
      if (intro) { font(f.doc, 9, 'normal', INK2); f.doc.text(introL(f), f.x + 2, y + 24 + 13); }
    }),
    keepWithNext: true,
  };
}

const LABEL_W = 112;
/** One thing as a card: a stripe in its colour down its left, its name and status label at the top, the words under
 *  its name, then its detail — a label on the left, the words on the right, a result first in its colour. */
function cardOf(r: PaperRow, cont = false) {
  const inner = (f: Frame) => ({ x: f.x + 12, w: f.w - 20 });
  const VW = (f: Frame) => inner(f).w - LABEL_W;
  const parts = (f: Frame) => {
    const pw = r.word ? pillW(f.doc, r.word) + 10 : 0;
    const head = wrap(f.doc, `${r.what}${cont ? ' (carried on)' : ''}`, inner(f).w - pw, 10.5, 'bold');
    const says = r.says ? wrap(f.doc, r.says, inner(f).w - pw, 8.8) : [];
    const detail = (r.detail ?? []).map(d => {
      font(f.doc, 8.6, 'bold'); const ww = d.word ? f.doc.getTextWidth(d.word) + 6 : 0;
      return {
        d, ww,
        label: wrap(f.doc, d.label, LABEL_W - 10, 8.3, 'bold'),
        text: d.text ? wrap(f.doc, d.text, VW(f) - ww, 8.8) : [],
        more: d.more ? wrap(f.doc, d.more, VW(f), 8.3) : [],
      };
    });
    return { head, says, detail };
  };
  const dh = (x: ReturnType<typeof parts>['detail'][number]) => Math.max(x.label.length * 10.5, Math.max(1, x.text.length) * 11.5 + x.more.length * 10.5) + 5;
  const height = (p: ReturnType<typeof parts>) => 9 + p.head.length * 13 + p.says.length * 11 + (p.detail.length ? 7 + p.detail.reduce((n, x) => n + dh(x), 0) : 0) + 7;
  return {
    h: (f: Frame) => height(parts(f)) + 8,
    draw: (f: Frame, y0: number) => {
      const p = parts(f), h = height(p), { x, w } = inner(f);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.8); f.doc.roundedRect(f.x, y0, f.w, h, 4, 4, 'S');
      f.doc.setFillColor(TONE[r.tone]); f.doc.rect(f.x + 0.4, y0 + 3, 3.2, h - 6, 'F');
      pill(f.doc, r.word, r.tone, x + w, y0 + 7);
      let y = y0 + 9;
      font(f.doc, 10.5, 'bold', INK); f.doc.text(p.head, x, y + 9); y += p.head.length * 13;
      if (p.says.length) { font(f.doc, 8.8, 'normal', INK2); f.doc.text(p.says, x, y + 8); y += p.says.length * 11; }
      if (!p.detail.length) return;
      y += 4;
      p.detail.forEach((d, i) => {
        if (i) { f.doc.setDrawColor('#edf1f1'); f.doc.setLineWidth(0.5); f.doc.line(x, y - 1, x + w, y - 1); }
        y += 2;
        font(f.doc, 8.3, 'bold', INK2); f.doc.text(d.label, x, y + 8);
        const vx = x + LABEL_W;
        if (d.d.word) { font(f.doc, 8.6, 'bold', TONE[d.d.tone ?? 'n']); f.doc.text(d.d.word, vx, y + 8); }
        if (d.text.length) { font(f.doc, 8.8, 'normal', INK); f.doc.text(d.text, vx + d.ww, y + 8); }
        if (d.more.length) { font(f.doc, 8.3, 'normal', INK2); f.doc.text(d.more, vx, y + 8 + Math.max(1, d.text.length) * 11.5); }
        y += dh(d) - 2;
      });
    },
  };
}

/** A card's detail in pieces a page can hold — a long one carries on in a second card, said so. */
function cardsOf(r: PaperRow) {
  const d = r.detail ?? [];
  if (d.length <= 14) return [cardOf(r)];
  const out = [];
  for (let i = 0; i < d.length; i += 12) out.push(cardOf({ ...r, detail: d.slice(i, i + 12) }, i > 0));
  return out;
}

/** What needs doing as a table: what (and what kind of thing), who has it, by when, its status. */
function tableOf(list: PaperRow[]): Block {
  const cols = (f: Frame) => { const w = f.w; return { what: w * 0.44, who: w * 0.2, when: w * 0.17, st: w * 0.19 }; };
  const header = {
    h: () => 20,
    draw: (f: Frame, y: number) => {
      const c = cols(f);
      f.doc.setFillColor('#eef3f3'); f.doc.rect(f.x, y, f.w, 18, 'F');
      font(f.doc, 8, 'bold', INK2);
      f.doc.text('WHAT NEEDS DOING', f.x + 6, y + 12); f.doc.text('WHO HAS IT', f.x + c.what + 4, y + 12);
      f.doc.text('BY WHEN', f.x + c.what + c.who + 4, y + 12); f.doc.text('STATUS', f.x + f.w - 6, y + 12, { align: 'right' });
    },
  };
  const row = (r: PaperRow) => {
    const parts = (f: Frame) => {
      const c = cols(f);
      return { what: wrap(f.doc, r.what, c.what - 12, 9.5, 'bold'), kind: r.kind ? wrap(f.doc, r.kind, c.what - 12, 8.3) : [],
        who: wrap(f.doc, r.who ?? '', c.who - 8, 9), when: wrap(f.doc, r.when ?? '', c.when - 8, 9) };
    };
    const hOf = (p: ReturnType<typeof parts>) => Math.max(p.what.length * 12 + p.kind.length * 10.5, p.who.length * 11.5, p.when.length * 11.5, 14) + 12;
    return {
      h: (f: Frame) => hOf(parts(f)),
      draw: (f: Frame, y: number) => {
        const p = parts(f), c = cols(f);
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y + hOf(p), f.x + f.w, y + hOf(p));
        f.doc.setFillColor(TONE[r.tone]); f.doc.rect(f.x, y + 4, 2.6, hOf(p) - 8, 'F');
        font(f.doc, 9.5, 'bold', INK); f.doc.text(p.what, f.x + 6, y + 13);
        if (p.kind.length) { font(f.doc, 8.3, 'normal', INK2); f.doc.text(p.kind, f.x + 6, y + 13 + p.what.length * 12 - 1.5); }
        font(f.doc, 9, 'normal', INK); f.doc.text(p.who, f.x + c.what + 4, y + 13);
        font(f.doc, 9, r.tone === 'r' ? 'bold' : 'normal', r.tone === 'r' ? TONE.r : INK); f.doc.text(p.when, f.x + c.what + c.who + 4, y + 13);
        pill(f.doc, r.word, r.tone, f.x + f.w - 2, y + 4);
      },
    };
  };
  return rows({ header, rows: list.map(row), after: 'm' });
}

/** HOW TO READ IT — the five colours, each with its words, said once at the front. */
const KEY: { word: string; tone: PaperTone; says: string }[] = [
  { word: 'LATE · DIDN’T PASS', tone: 'r', says: 'its day has gone, it failed, or it is critical' },
  { word: 'OPEN · A PROBLEM', tone: 'a', says: 'waiting on somebody, or a problem with no fix yet' },
  { word: 'DUE · BOOKED', tone: 'w', says: 'under way, or booked for a day still ahead' },
  { word: 'DONE · PASSED', tone: 'g', says: 'finished, passed or fixed' },
  { word: 'NO DAY SET', tone: 'n', says: 'not started, and no day given yet' },
];
function keyAndContents(contents: { title: string; count: string }[]): Block[] {
  const out: Block[] = [];
  out.push(label('How to read this report', INK2));
  out.push(box(() => KEY.length * 17 + 18, (f, y) => {
    f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.8); f.doc.roundedRect(f.x, y, f.w, KEY.length * 17 + 10, 4, 4, 'S');
    KEY.forEach((k, i) => {
      const yy = y + 6 + i * 17;
      pill(f.doc, k.word, k.tone, f.x + 10 + pillW(f.doc, k.word), yy);
      font(f.doc, 9, 'normal', INK); f.doc.text(k.says, f.x + 150, yy + 9.5);
    });
  }));
  out.push(text({ text: 'Every status is said in words on its label; the colour only repeats it.', size: 8.5, colour: INK2, after: 12 }));
  out.push(label('What is in it', INK2));
  out.push(box(() => contents.length * 15 + 10, (f, y) => {
    contents.forEach((c, i) => {
      const yy = y + 10 + i * 15;
      font(f.doc, 9.5, 'bold', BRAND); f.doc.text(String(i + 1), f.x + 4, yy);
      font(f.doc, 9.5, 'bold', INK); f.doc.text(c.title, f.x + 22, yy);
      font(f.doc, 9.5, 'normal', INK2); f.doc.text(c.count, f.x + f.w, yy, { align: 'right' });
    });
  }, f => gap(f.density, 'm')));
  return out;
}

/** A row: words on the left (bold head, muted line under it), its state on the right in its colour — and under them,
 *  the full width, its detail a line each: every attempt, what was seen, what was written, each step of its journey. */
function rowOf(head: string, under: string | undefined, right: string, tone: PaperTone, lead?: string, detail: readonly string[] = []) {
  const rightW = (f: Frame) => Math.min(190, f.w * 0.36), numW = lead ? 20 : 0;
  const parts = (f: Frame) => ({
    h: wrap(f.doc, head, f.w - rightW(f) - numW - 12, 9.5, 'bold'),
    u: under ? wrap(f.doc, under, f.w - rightW(f) - numW - 12, 8.5) : [],
    r: wrap(f.doc, right, rightW(f), 8.5, 'bold'),
    d: detail.map(x => wrap(f.doc, x, f.w - numW - 22, 8)),
  });
  const top = (p: ReturnType<typeof parts>) => Math.max(p.h.length * 12 + p.u.length * 10.5, p.r.length * 10.5);
  const deep = (p: ReturnType<typeof parts>) => p.d.reduce((n, l) => n + l.length * 9.6, 0) + (p.d.length ? 5 : 0);
  return {
    h: (f: Frame) => { const p = parts(f); return 2 * pad(f) + top(p) + deep(p) + 2; },
    draw: (f: Frame, y0: number) => {
      const p = parts(f), y = y0 + pad(f);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y0, f.x + f.w, y0);
      if (lead) { font(f.doc, 9.5, 'bold', MUTED); f.doc.text(lead, f.x, y + 9); }
      font(f.doc, 9.5, 'bold', INK2); f.doc.text(p.h, f.x + numW, y + 9);
      if (p.u.length) { font(f.doc, 8.5, 'normal', MUTED); f.doc.text(p.u, f.x + numW, y + 9 + p.h.length * 12 - 1.5); }
      font(f.doc, 8.5, 'bold', TONE[tone]); f.doc.text(p.r, f.x + f.w, y + 9, { align: 'right' });
      /* the detail, as it was lived — a thin rule down its left, each line in turn */
      let yy = y + top(p) + 5;
      if (p.d.length) { f.doc.setDrawColor(LINE); f.doc.setLineWidth(1); f.doc.line(f.x + numW + 3, yy - 1, f.x + numW + 3, yy + deep(p) - 7); }
      font(f.doc, 8, 'normal', INK2);
      for (const l of p.d) { f.doc.text(l, f.x + numW + 10, yy + 7); yy += l.length * 9.6; }
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
  /* THE TILES — a few counted figures, each of what it should be */
  const tiles = m.tiles ?? [];
  if (tiles.length) {
    const n = tiles.length;
    out.push(box(f => 46 + gap(f.density, 'm'), (f, y) => {
      tiles.forEach((t, i) => {
        const w = f.w / n - 6, x = f.x + i * (f.w / n);
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.8); f.doc.roundedRect(x, y, w, 40, 4, 4, 'S');
        font(f.doc, 16, 'bold', t.tone === 'n' ? INK : TONE[t.tone]); f.doc.text(t.value, x + 8, y + 19);
        if (t.of) { const vw = f.doc.getTextWidth(t.value); font(f.doc, 8.5, 'normal', MUTED); f.doc.text(t.of, x + 12 + vw, y + 19); }
        font(f.doc, 7.5, 'bold', MUTED); f.doc.text(t.label.toUpperCase(), x + 8, y + 33);
      });
    }, f => gap(f.density, 'm')));
  }
  /* HOW TO READ IT AND WHAT IS IN IT — then each part under its own numbered band; what has nothing is said once, a
     line each, as the last part — never a heading a "none" */
  const full = m.sections.filter(x => x.rows.length);
  const none = m.sections.filter(x => !x.rows.length);
  out.push(...keyAndContents([...full.map(s => ({ title: s.title, count: s.count })), ...(none.length ? [{ title: 'Nothing on it yet', count: `${none.length} part${none.length === 1 ? '' : 's'}` }] : [])]));
  full.forEach((s, i) => {
    out.push(sectionHead(i + 1, s.title, s.count, s.intro));
    out.push(s.table ? tableOf(s.rows) : rows({ rows: s.rows.flatMap(cardsOf), after: 'm' }));
  });
  if (none.length) {
    out.push(sectionHead(full.length + 1, 'Nothing on it yet', '', 'The parts of this report with nothing in them for this machine.'));
    for (const x of none) out.push(text({ text: `•  ${x.empty}`, size: 9.5, colour: INK, after: 4 }));
    out.push(text({ text: '', after: 8 }));
  }
  /* THE CLOSING LINE — the machine in one sentence */
  if (m.closing) {
    const c = m.closing;
    const ls = (f: Frame) => wrap(f.doc, c, f.w - 28, 10, 'bold');
    out.push(box(f => 18 + ls(f).length * 13 + gap(f.density, 'm'), (f, y) => {
      paperBand(f.doc, f.x, y, f.w, 14 + ls(f).length * 13, 6);
      font(f.doc, 10, 'bold', INK); f.doc.text(ls(f), f.x + 14, y + 17);
    }, f => gap(f.density, 'm')));
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
