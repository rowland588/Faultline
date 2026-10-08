/* THE PROGRAMS ON PAPER — the programs report of its own, and the same rows
 * as the client report's Programs section (lib/programsReport).
 *
 * Rowland, 8 October: "On programs they are missing from the reports — need
 * its own report, and added to the main report."
 *
 * Machine by machine: each program, its state in words and in its colour
 * (CLAUDE.md, visual management — green done, red failed or late, indigo under
 * way, grey not started), what was seen, and the statuses said before it.
 * Poured by the report engine (lib/report, docs/REPORTS.md), never placed. */
import type { jsPDF } from 'jspdf';
import type { ProgramLine, ProgramsReading, ProgTone } from './programsReport';
import { san, OK, DANGER, BLUE } from './reportKit';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, rows, text, wrap } from './report/blocks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef', BRAND = '#1f63e0', AMBER = '#8a5f14';
const TONE: Record<ProgTone, string> = { g: OK, r: DANGER, w: BLUE, a: AMBER, n: MUTED };

const sanLine = (l: ProgramLine): ProgramLine => ({
  ...l, machine: san(l.machine), what: san(l.what), word: san(l.word), earlier: l.earlier.map(san),
  ...(l.runs ? { runs: san(l.runs) } : {}), ...(l.who ? { who: san(l.who) } : {}),
  ...(l.note ? { note: san(l.note) } : {}), ...(l.proving ? { proving: san(l.proving) } : {}),
});

/** Each machine's programs, a row each: the program and its state on one
 *  line, what was seen and what was said before under it. */
export function programsBlocks(reading: ProgramsReading, d: Density, o: { machineLabels?: boolean } = {}): Block[] {
  const out: Block[] = [];
  const stateW = 150;
  const parts = (f: Frame, l: ProgramLine) => ({
    head: wrap(f.doc, `${l.what}${l.runs ? ` — runs ${l.runs}` : ''}`, f.w - stateW - 10, 9.5, 'bold'),
    who: l.who ? wrap(f.doc, l.who, f.w - stateW - 10, 8) : [],
    word: wrap(f.doc, l.word, stateW, 8.5, 'bold'),
    note: l.note ? wrap(f.doc, l.note, f.w - 12, 8.5) : [],
    earlier: l.earlier.flatMap(e => wrap(f.doc, `Before: ${e}`, f.w - 12, 8)),
    proving: l.proving ? wrap(f.doc, l.proving, f.w - 12, 8) : [],
  });
  const height = (f: Frame, l: ProgramLine) => {
    const p = parts(f, l);
    return 6 + Math.max(p.head.length * 12 + p.who.length * 10, p.word.length * 11) + p.note.length * 11 + (p.earlier.length + p.proving.length) * 10 + 6;
  };
  for (const g of reading.machines.map(m => ({ ...m, name: san(m.name), lines: m.lines.map(sanLine) }))) {
    /* The machine's name as it is written — a capitalised label lost it to
       anybody searching the paper for "Ilapak flow wrapper". */
    if (o.machineLabels !== false) out.push({ ...text({ text: `${g.name} · ${g.lines.length} program${g.lines.length === 1 ? '' : 's'}`, size: 10, style: 'bold', colour: INK2, before: 4, after: 4 }), keepWithNext: true });
    out.push(rows({
      rows: g.lines.map(l => ({
        h: (f: Frame) => height(f, l),
        draw: (f: Frame, y: number) => {
          const p = parts(f, l);
          f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
          font(f.doc, 9.5, 'bold', INK2); f.doc.text(p.head, f.x, y + 13);
          let ty = y + 13 + p.head.length * 12;
          if (p.who.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.who, f.x, ty - 2); ty += p.who.length * 10; }
          /* Its state in words, in its colour — never the colour alone. */
          font(f.doc, 8.5, 'bold', TONE[l.tone]); f.doc.text(p.word, f.x + f.w - stateW, y + 13);
          ty = Math.max(ty, y + 13 + p.word.length * 11);
          if (p.note.length) { font(f.doc, 8.5, 'normal', INK2); f.doc.text(p.note, f.x + 12, ty); ty += p.note.length * 11; }
          if (p.proving.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.proving, f.x + 12, ty); ty += p.proving.length * 10; }
          if (p.earlier.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.earlier, f.x + 12, ty); }
        },
      })),
      after: 'm',
    }));
  }
  if (!out.length) out.push(text({ text: 'No programs yet.', colour: INK2, after: gap(d, 's') }));
  return out;
}

/** THE PROGRAMS REPORT — its own document: the job, the count in words and a
 *  tile per state, then every program machine by machine. */
export async function drawProgramsReport(doc: jsPDF, x: { name: string; lead?: string; printed: string; reading: ProgramsReading }): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const r = x.reading;
  const name = san(x.name);
  const blocks = (d: Density): Block[] => {
    const out: Block[] = [];
    out.push(text({ text: 'PROGRAMS · STAGE GATE', size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
    out.push(text({ text: name, size: SIZE.title, style: 'bold', after: 4 }));
    out.push(text({ text: [x.lead ? `Led by ${san(x.lead)}` : '', `Printed ${san(x.printed)}`].filter(Boolean).join('   ·   '), colour: MUTED, after: gap(d, 'm') }));
    /* WHERE THE PROGRAMS ARE — a tile per state, the abnormal in its colour;
       a zero is grey (CLAUDE.md, visual management rule 3). */
    const tiles: { n: number; word: string; c: string }[] = [
      { n: r.done, word: 'passed', c: OK }, { n: r.baseline, word: 'at baseline', c: BLUE },
      { n: r.failed, word: 'failed', c: DANGER }, { n: r.late, word: 'late', c: DANGER }, { n: r.open, word: 'to do', c: INK2 },
    ];
    out.push(box(() => 46 + gap(d, 'm'), (f, y) => {
      const tw = (f.w - 4 * 8) / 5;
      tiles.forEach((t, i) => {
        const tx = f.x + i * (tw + 8), c = t.n ? t.c : MUTED;
        f.doc.setDrawColor(t.n ? c : LINE); f.doc.setLineWidth(t.n && (t.c === DANGER) ? 1.4 : 0.8);
        f.doc.roundedRect(tx, y, tw, 40, 5, 5, 'S');
        font(f.doc, 16, 'bold', c); f.doc.text(String(t.n), tx + 9, y + 20);
        font(f.doc, 8, 'normal', t.n ? INK2 : MUTED); f.doc.text(t.word, tx + 9, y + 33);
      });
    }));
    out.push(text({ text: san(r.says), size: 9.5, colour: INK2, after: gap(d, 'm') }));
    out.push(...programsBlocks(r, d));
    return out;
  };
  const density = await chooseDensity(base, d => blocks(d));
  await pour({ ...base, density, dry: false }, blocks(density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`${name}  ·  programs  ·  ${san(x.printed)}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
