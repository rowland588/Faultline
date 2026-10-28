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
import { badgeOf, type ProgramLine, type ProgramsReading, type ProgTone } from './programsReport';
import { san, OK, DANGER, BLUE } from './reportKit';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { leanClosing } from './report/lean';
import type { LeanTile } from './lean';
import { programClosing } from './stageGatePages';
import { SIZE, box, font, gap, rows, text, wrap } from './report/blocks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', BRAND = '#0c7489', AMBER = '#b45309';
const TONE: Record<ProgTone, string> = { g: OK, r: DANGER, w: BLUE, a: AMBER, n: MUTED };

const sanLine = (l: ProgramLine): ProgramLine => ({
  ...l, machine: san(l.machine), what: san(l.what), word: san(l.word), earlier: l.earlier.map(san),
  ...(l.runs ? { runs: san(l.runs) } : {}), ...(l.who ? { who: san(l.who) } : {}),
  ...(l.note ? { note: san(l.note) } : {}), ...(l.proving ? { proving: san(l.proving) } : {}),
  ...(l.run ? { run: san(l.run) } : {}),
  ...(l.tests ? { tests: l.tests.map(t => ({ ...t, badge: san(t.badge), text: san(t.text), studies: t.studies.map(san), ...(t.split ? { split: san(t.split) } : {}) })) } : {}), ...(l.proof ? { proof: { ...l.proof, word: san(l.proof.word) } } : {}),
  ...(l.criteria ? { criteria: { ...l.criteria, says: san(l.criteria.says), each: l.criteria.each.map(c => ({ ...c, title: san(c.title), word: san(c.word), says: san(c.says) })) } } : {}),
});

/** Each machine's programs, a row each: the program and its state on one
 *  line, what was seen and what was said before under it. */
export function programsBlocks(reading: ProgramsReading, d: Density, o: { machineLabels?: boolean } = {}): Block[] {
  const out: Block[] = [];
  /* the state pill leads the row, big and in its colour; the program after it; the day and what was seen at the right */
  const pillW = 62, stateW = 128, indent = pillW + 12;
  const parts = (f: Frame, l: ProgramLine) => ({
    head: wrap(f.doc, `${l.what}${l.runs ? ` — runs ${l.runs}` : ''}`, f.w - indent - stateW - 10, 10, 'bold'),
    who: l.who ? wrap(f.doc, l.who, f.w - indent - stateW - 10, 8) : [],
    word: wrap(f.doc, l.word, stateW, 8, 'bold'),
    note: l.note ? wrap(f.doc, l.note, f.w - indent, 8.5) : [],
    earlier: l.earlier.flatMap(e => wrap(f.doc, `Before: ${e}`, f.w - indent, 8)),
    proving: l.proving ? wrap(f.doc, l.proving, f.w - indent, 8) : [],
    /* how a proved one was proved (flow audit #21) — its colour only when abnormal */
    proof: l.proof ? wrap(f.doc, l.proof.word, f.w - indent, 8) : [],
    run: l.run ? wrap(f.doc, `In Commission: ${l.run}`, f.w - indent, 8.5, 'bold') : [],
    /* ITS CRITERIA (docs/PROGRAM-GOAL.md): where they stand — unless signed off, which its proof says — then each with its answer */
    crit: l.criteria && !(l.proof && /^Signed off/.test(l.proof.word)) ? wrap(f.doc, `Criteria: ${l.criteria.says}`, f.w - indent, 8.5, 'bold') : [],
    each: (l.criteria?.each ?? []).map(c => ({ tone: c.tone, lines: wrap(f.doc, `${c.word} — ${c.title}: ${c.says}`, f.w - indent - 4, 8) })),
    /* every test of it, first to last, each with the studies lined up for it */
    tests: (l.tests ?? []).map(t => ({ tone: t.tone, badge: t.badge, lines: [...wrap(f.doc, t.text, f.w - indent - 4, 8), ...(t.split ? wrap(f.doc, t.split, f.w - indent - 4, 8) : [])], studies: t.studies.flatMap(x => wrap(f.doc, `Study: ${x}`, f.w - indent - 16, 7.5)) })),
  });
  const height = (f: Frame, l: ProgramLine) => {
    const p = parts(f, l);
    return 8 + Math.max(p.head.length * 13 + p.who.length * 10, p.word.length * 10, 16) + p.note.length * 11 + p.run.length * 11 + p.crit.length * 11 + p.each.reduce((n, c) => n + c.lines.length * 10, 0) + (p.earlier.length + p.proving.length + p.proof.length) * 10 + p.tests.reduce((n, t) => n + 9 + t.lines.length * 10 + t.studies.length * 9, 0) + 6;
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
          const h = height(f, l);
          /* The abnormal stands out: a heavy edge on a row that failed or is late. */
          if (l.bucket === 'failed' || l.bucket === 'late') { f.doc.setFillColor(DANGER); f.doc.rect(f.x - 5, y + 3, 2.5, h - 5, 'F'); }
          /* THE STATE, FIRST AND BIG: a pill in its colour with its word — the one white-on-colour the house allows. */
          const badge = badgeOf(l);
          f.doc.setFillColor(TONE[l.tone]); f.doc.roundedRect(f.x, y + 5, pillW, 15, 3, 3, 'F');
          font(f.doc, badge.length > 8 ? 6.5 : 7.5, 'bold', '#ffffff'); f.doc.text(badge, f.x + pillW / 2, y + 15.2, { align: 'center' });
          font(f.doc, 10, 'bold', INK2); f.doc.text(p.head, f.x + indent, y + 16);
          let ty = y + 16 + p.head.length * 13 - 3;
          if (p.who.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.who, f.x + indent, ty - 2); ty += p.who.length * 10; }
          /* The day and what it rests on, at the right, in its colour — never the colour alone. */
          font(f.doc, 8, 'bold', TONE[l.tone]); f.doc.text(p.word, f.x + f.w - stateW, y + 15);
          ty = Math.max(ty, y + 16 + p.word.length * 10);
          if (p.proof.length) { font(f.doc, 8, l.proof && (l.proof.tone === 'a' || l.proof.tone === 'r') ? 'bold' : 'normal', l.proof && (l.proof.tone === 'a' || l.proof.tone === 'r') ? TONE[l.proof.tone] : MUTED); f.doc.text(p.proof, f.x + indent, ty); ty += p.proof.length * 10; }
          if (p.crit.length) { font(f.doc, 8.5, 'bold', l.criteria ? TONE[l.criteria.tone] : INK2); f.doc.text(p.crit, f.x + indent, ty); ty += p.crit.length * 11; }
          for (const c of p.each) { font(f.doc, 8, 'normal', c.tone === 'r' || c.tone === 'a' ? TONE[c.tone] : INK2); f.doc.text(c.lines, f.x + indent + 4, ty); ty += c.lines.length * 10; }
          if (p.note.length) { font(f.doc, 8.5, 'normal', INK2); f.doc.text(p.note, f.x + indent, ty); ty += p.note.length * 11; }
          if (p.proving.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.proving, f.x + indent, ty); ty += p.proving.length * 10; }
          /* Its run at speed — the colour only when it fell short or passed. */
          if (p.run.length) { font(f.doc, 8.5, 'bold', l.runTone ? TONE[l.runTone] : INK2); f.doc.text(p.run, f.x + indent, ty); ty += p.run.length * 11; }
          if (p.tests.length) {
            for (const t of p.tests) {
              /* each test: its own result in its colour first, then what it aimed at and did */
              font(f.doc, 7, 'bold', TONE[t.tone]); f.doc.text(t.badge.slice(0, 14), f.x + indent, ty);
              font(f.doc, 8, 'normal', INK2); f.doc.text(t.lines, f.x + indent + 0, ty + 9); ty += 9 + t.lines.length * 10;
              if (t.studies.length) { font(f.doc, 7.5, 'normal', MUTED); f.doc.text(t.studies, f.x + indent + 12, ty); ty += t.studies.length * 9; }
            }
          }
          if (p.earlier.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.earlier, f.x + indent, ty); }
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
export async function drawProgramsReport(doc: jsPDF, x: { name: string; lead?: string; printed: string; reading: ProgramsReading;
  /** What it is the programs of — a stage-gate job (the default), a
   *  production line, or every line of the factory (docs/BLUEPRINT.md, Stage 2). */
  eyebrow?: string;
  /** A job's lines' own programs — planned on the line with no job, on the
   *  job's Programs page (ui/LineProgramsOnJob): each line's reading, after
   *  the job's own (lib/clientReport GateSection.linePrograms). */
  linePrograms?: { line: string; reading: ProgramsReading }[];
  /** The job's money (lib/useJobMoney) — said in the closing line when the
   *  slip has run one up. */
  money?: LeanTile }): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const r = x.reading;
  const name = san(x.name);
  const blocks = (d: Density): Block[] => {
    const out: Block[] = [];
    out.push(text({ text: x.eyebrow ?? 'PROGRAMS · STAGE GATE', size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
    out.push(text({ text: name, size: SIZE.title, style: 'bold', after: 4 }));
    out.push(text({ text: [x.lead ? `Led by ${san(x.lead)}` : '', `Printed ${san(x.printed)}`].filter(Boolean).join('   ·   '), colour: MUTED, after: gap(d, 'm') }));
    /* WHERE THE PROGRAMS ARE — a tile per state, the abnormal in its colour;
       a zero is grey (CLAUDE.md, visual management rule 3). */
    const tiles: { n: number; word: string; c: string }[] = [
      { n: r.done, word: 'passed or done', c: OK }, { n: r.baseline, word: 'at baseline', c: OK },
      { n: r.failed, word: 'failed', c: DANGER }, { n: r.late, word: 'late', c: DANGER }, { n: r.open, word: 'to do', c: INK2 },
      /* why the ones not done are not done, when it was said (12 October) */
      { n: r.noProgram ?? 0, word: 'no program', c: AMBER }, { n: r.notTested ?? 0, word: 'not tested', c: INK2 },
    ];
    out.push(box(() => 46 + gap(d, 'm'), (f, y) => {
      const tw = (f.w - (tiles.length - 1) * 8) / tiles.length;
      tiles.forEach((t, i) => {
        const tx = f.x + i * (tw + 8), c = t.n ? t.c : MUTED;
        f.doc.setDrawColor(t.n ? c : LINE); f.doc.setLineWidth(t.n && (t.c === DANGER) ? 1.4 : 0.8);
        f.doc.roundedRect(tx, y, tw, 40, 5, 5, 'S');
        font(f.doc, 16, 'bold', c); f.doc.text(String(t.n), tx + 9, y + 20);
        font(f.doc, 8, 'normal', t.n ? INK2 : MUTED); f.doc.text(t.word, tx + 9, y + 33);
      });
    }));
    out.push(text({ text: san(r.says), size: 9.5, colour: INK2, after: gap(d, 'm') }));
    /* a job with none of its own, and its line's to show, says so in a line —
       never "No programs yet" over the line's */
    if (r.total || !x.linePrograms?.length) out.push(...programsBlocks(r, d));
    for (const lp of x.linePrograms ?? []) {
      out.push({ ...text({ text: `On ${san(lp.line)}, with no project — ${san(lp.reading.says)}`, size: SIZE.h2, style: 'bold', before: gap(d, 's'), after: 4 }), keepWithNext: true });
      out.push(...programsBlocks(lp.reading, d));
    }
    /* THE CLOSING LINE (docs/LEAN-PAGE.md; lib/stageGatePages) — the programs in
       one sentence, as the page closes; the tiles above are its chips */
    if (r.total) out.push(leanClosing(programClosing(r, x.money ?? { k: '', v: '', of: '' })));
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
