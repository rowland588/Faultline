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
import { AHEAD_SAYS, WORK_TONE, aheadOfBest, statusSays } from './programStatus';
import type { jsPDF } from 'jspdf';
import { badgeOf, type ProgramLine, type ProgramsReading, type ProgTone } from './programsReport';
import { san, OK, DANGER, BLUE, BAND, BAND_EDGE } from './reportKit';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { leanClosing } from './report/lean';
import type { LeanTile } from './lean';
import { programClosing } from './stageGatePages';
import { SIZE, box, font, gap, rows, text, wrap } from './report/blocks';
import type { ProgramProblemPaper } from './programProblems';
import { programsSummary, type SummaryRow } from './programsSummary';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#12171c', INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', BRAND = '#0c7489', AMBER = '#b45309';
const TONE: Record<ProgTone, string> = { g: OK, r: DANGER, w: BLUE, a: AMBER, n: MUTED };

const sanLine = (l: ProgramLine): ProgramLine => ({
  ...l, machine: san(l.machine), what: san(l.what), word: san(l.word), earlier: l.earlier.map(san),
  ...(l.runs ? { runs: san(l.runs) } : {}), ...(l.who ? { who: san(l.who) } : {}),
  ...(l.note ? { note: san(l.note) } : {}), ...(l.proving ? { proving: san(l.proving) } : {}),
  ...(l.run ? { run: san(l.run) } : {}),
  ...(l.status ? { status: { ...l.status, ...(l.status.caveats ? { caveats: san(l.status.caveats) } : {}) } } : {}),
  ...(l.tests ? { tests: l.tests.map(t => ({ ...t, badge: san(t.badge), text: san(t.text), studies: t.studies.map(san), ...(t.split ? { split: san(t.split) } : {}) })) } : {}), ...(l.proof ? { proof: { ...l.proof, word: san(l.proof.word) } } : {}),
  ...(l.criteria ? { criteria: { ...l.criteria, says: san(l.criteria.says), each: l.criteria.each.map(c => ({ ...c, title: san(c.title), word: san(c.word), says: san(c.says) })) } } : {}),
});

/** Each machine's programs, a row each: the program and its state on one
 *  line, what was seen and what was said before under it. */
export function programsBlocks(reading: ProgramsReading, d: Density, o: { machineLabels?: boolean;
  /** The register's problems that name a program, by program id, with their pictures (lib/programProblems). */
  problems?: Map<string, ProgramProblemPaper[]> } = {}): Block[] {
  const out: Block[] = [];
  /* the state pill leads the row, big and in its colour; the program after it; the day and what was seen at the right */
  const pillW = 62, stateW = 128, indent = pillW + 12;
  /* PROBLEMS ON THIS PROGRAM (Rowland, 4 November): a box of its own, a picture and the words a problem */
  const THUMB = 46;
  const probsOf = (f: Frame, l: ProgramLine) => ((l.programId ? o.problems?.get(l.programId) : undefined) ?? []).map(x => ({
    x, lines: wrap(f.doc, san(`${x.what}`), f.w - indent - 22 - (x.photo ? THUMB + 10 : 0), 9, 'bold'),
    sub: wrap(f.doc, san(`Affects: ${x.products}   ·   ${x.word}${x.owner ? `   ·   ${x.owner}` : ''}`), f.w - indent - 22 - (x.photo ? THUMB + 10 : 0), 8),
  }));
  const probH = (p: ReturnType<typeof probsOf>[number]) => Math.max(x_h(p), p.x.photo ? THUMB + 4 : 0) + 6;
  const x_h = (p: ReturnType<typeof probsOf>[number]) => 12 + p.lines.length * 11 + p.sub.length * 10;
  const probsBoxH = (f: Frame, l: ProgramLine) => { const ps = probsOf(f, l); return ps.length ? 24 + ps.reduce((n, p) => n + probH(p), 0) + 6 : 0; };
  const parts = (f: Frame, l: ProgramLine) => ({
    head: wrap(f.doc, `${l.what}${l.runs ? ` — runs ${l.runs}` : ''}`, f.w - indent - stateW - 10, 10, 'bold'),
    who: l.who ? wrap(f.doc, l.who, f.w - indent - stateW - 10, 8) : [],
    word: wrap(f.doc, l.word, stateW, 8, 'bold'),
    note: l.note ? wrap(f.doc, l.note, f.w - indent, 9) : [],
    /* LESS WRITING (Rowland, 2 November: "most of that writing is pointless"): what a person reads is the state, the status they typed,
       what was seen, each test's result and the commentary written on it. The statuses said before, the "on the floor" echo, Commission's
       run line and a proof that reads well are off the paper (on the page, one tap away); a proof that is amber or red, or a sign-off (who, when), stays. The criteria's answers and the studies lined up for a test stay: Rowland asked for both (28 and 26 October). */
    earlier: [] as string[], proving: [] as string[],
    proof: l.proof && (l.proof.tone === 'a' || l.proof.tone === 'r' || /^Signed off/.test(l.proof.word)) ? wrap(f.doc, l.proof.word, f.w - indent, 8) : [],
    run: [] as string[],
    /* ITS STATUS SECTION — typed by hand: where the work stands, the best speed, the speed production can run at, the caveats (lib/programStatus) */
    stat: l.status ? wrap(f.doc, statusSays(l.status, false), f.w - indent - 22, 10, 'bold') : [],
    cav: l.status?.caveats ? wrap(f.doc, l.status.caveats, f.w - indent - 22, 9.5, 'bold') : [],
    ahead: aheadOfBest(l.status) ? wrap(f.doc, AHEAD_SAYS, f.w - indent, 8, 'bold') : [],
    /* ITS CRITERIA (docs/PROGRAM-GOAL.md): where they stand — unless signed off, which its proof says — then each with its answer */
    crit: l.criteria && !(l.proof && /^Signed off/.test(l.proof.word)) ? wrap(f.doc, `Criteria: ${l.criteria.says}`, f.w - indent, 8.5, 'bold') : [],
    each: (l.criteria?.each ?? []).map(c => ({ tone: c.tone, lines: wrap(f.doc, `${c.word} — ${c.title}: ${c.says}`, f.w - indent - 4, 8) })),
    /* every test of it, first to last, each with the studies lined up for it */
    tests: (l.tests ?? []).map(t => ({ tone: t.tone, badge: t.badge, lines: [...wrap(f.doc, t.text, f.w - indent - 4, 8), ...(t.split ? wrap(f.doc, t.split, f.w - indent - 4, 8) : [])], studies: t.studies.flatMap(x => wrap(f.doc, `Study: ${x}`, f.w - indent - 16, 7.5)), notes: (t.notes ?? []).flatMap(x => wrap(f.doc, `Note: ${x}`, f.w - indent - 12, 8.5)) })),
  });
  /* THE STATUS BLOCK (Rowland, 3 November: "the caveats are not shown clearly in the pdf report"): the status and the caveats in a pale
     panel of their own with a teal edge, each under its small heading — what a reader must not miss, not a line among the rest */
  const statBoxH = (p: { stat: string[]; cav: string[] }) => (p.stat.length || p.cav.length ? 14 + (p.stat.length ? 10 + p.stat.length * 12.5 : 0) + (p.cav.length ? 12 + p.cav.length * 12 : 0) + 10 : 0);
  const height = (f: Frame, l: ProgramLine) => {
    const p = parts(f, l);
    return 8 + Math.max(p.head.length * 13 + p.who.length * 10, p.word.length * 10, 16) + (p.note.length ? 14 + p.note.length * 11 : 0) + p.run.length * 11 + statBoxH(p) + p.ahead.length * 10 + p.crit.length * 11 + p.each.reduce((n, c) => n + c.lines.length * 10, 0) + (p.earlier.length + p.proving.length + p.proof.length) * 10 + p.tests.reduce((n, t) => n + 12 + t.lines.length * 10 + t.notes.length * 11 + t.studies.length * 9, 0) + 6 + probsBoxH(f, l);
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
          if (p.stat.length || p.cav.length) {
            const bh = statBoxH(p), bx = f.x + indent - 2, bw = f.w - indent + 2;
            f.doc.setFillColor(BAND); f.doc.roundedRect(bx, ty - 6, bw, bh - 6, 3, 3, 'F');
            f.doc.setFillColor(BAND_EDGE); f.doc.rect(bx, ty - 6, 2.5, bh - 6, 'F');
            let by = ty + 4;
            if (p.stat.length) {
              font(f.doc, 6.5, 'bold', MUTED); f.doc.text('STATUS', bx + 10, by); by += 10;
              font(f.doc, 10, 'bold', l.status ? TONE[WORK_TONE[l.status.work]] : INK2); f.doc.text(p.stat, bx + 10, by); by += p.stat.length * 12.5;
            }
            if (p.cav.length) {
              font(f.doc, 6.5, 'bold', MUTED); f.doc.text('CAVEATS — WHAT TO WATCH', bx + 10, by + 2); by += 12;
              font(f.doc, 9.5, 'bold', INK); f.doc.text(p.cav, bx + 10, by); by += p.cav.length * 12;
            }
            ty += bh;
          }
          if (p.ahead.length) { font(f.doc, 8, 'bold', AMBER); f.doc.text(p.ahead, f.x + indent, ty); ty += p.ahead.length * 10; }
          /* ITS COMMENTARY, labelled, straight after the status — the words the team wrote about the program */
          if (p.note.length) { font(f.doc, 6.5, 'bold', MUTED); f.doc.text('NOTE', f.x + indent, ty + 2); font(f.doc, 9, 'normal', INK); f.doc.text(p.note, f.x + indent, ty + 12); ty += 14 + p.note.length * 11; }
          if (p.proof.length) { font(f.doc, 8, l.proof && (l.proof.tone === 'a' || l.proof.tone === 'r') ? 'bold' : 'normal', l.proof && (l.proof.tone === 'a' || l.proof.tone === 'r') ? TONE[l.proof.tone] : MUTED); f.doc.text(p.proof, f.x + indent, ty); ty += p.proof.length * 10; }
          if (p.crit.length) { font(f.doc, 8.5, 'bold', l.criteria ? TONE[l.criteria.tone] : INK2); f.doc.text(p.crit, f.x + indent, ty); ty += p.crit.length * 11; }
          for (const c of p.each) { font(f.doc, 8, 'normal', c.tone === 'r' || c.tone === 'a' ? TONE[c.tone] : INK2); f.doc.text(c.lines, f.x + indent + 4, ty); ty += c.lines.length * 10; }
          if (p.proving.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.proving, f.x + indent, ty); ty += p.proving.length * 10; }
          /* Its run at speed — the colour only when it fell short or passed. */
          if (p.run.length) { font(f.doc, 8.5, 'bold', l.runTone ? TONE[l.runTone] : INK2); f.doc.text(p.run, f.x + indent, ty); ty += p.run.length * 11; }
          if (p.tests.length) {
            for (const t of p.tests) {
              /* each test: its own result in its colour first, then what it aimed at and did */
              font(f.doc, 7, 'bold', TONE[t.tone]); f.doc.text(t.badge.slice(0, 14), f.x + indent, ty);
              font(f.doc, 8, 'normal', INK2); f.doc.text(t.lines, f.x + indent + 0, ty + 9); ty += 9 + t.lines.length * 10;
              if (t.notes.length) { font(f.doc, 8.5, 'normal', INK2); f.doc.text(t.notes, f.x + indent + 12, ty); ty += t.notes.length * 11; }
              if (t.studies.length) { font(f.doc, 7.5, 'normal', MUTED); f.doc.text(t.studies, f.x + indent + 12, ty); ty += t.studies.length * 9; }
              ty += 3;
            }
          }
          /* PROBLEMS ON THIS PROGRAM — a box of its own: each problem with its picture, how serious (a word and its colour), what it affects and whose */
          const ps = probsOf(f, l);
          if (ps.length) {
            const bx = f.x + indent - 2, bw = f.w - indent + 2, bh = probsBoxH(f, l) - 6;
            f.doc.setFillColor('#ffffff'); f.doc.setDrawColor(BRAND); f.doc.setLineWidth(0.9); f.doc.roundedRect(bx, ty, bw, bh, 3, 3, 'FD');
            f.doc.setFillColor(BAND); f.doc.roundedRect(bx, ty, bw, 16, 3, 3, 'F');
            font(f.doc, 7, 'bold', INK2); f.doc.text(`PROBLEMS ON THIS PROGRAM — ${ps.filter(q => q.x.open).length} OPEN OF ${ps.length}`, bx + 9, ty + 11);
            let py = ty + 22;
            for (const q of ps) {
              const rowH = probH(q);
              if (q.x.photo) { try { f.doc.addImage(q.x.photo.dataUrl, 'JPEG', bx + 8, py, THUMB * Math.min(1.5, q.x.photo.w / q.x.photo.h), THUMB); } catch { /* an unreadable picture: its words still print */ } }
              const tx = bx + 8 + (q.x.photo ? THUMB * Math.min(1.5, q.x.photo.w / q.x.photo.h) + 10 : 0);
              const pc = q.x.priority === 'critical' ? DANGER : q.x.priority === 'high' ? AMBER : OK;
              font(f.doc, 7, 'bold', pc); f.doc.text(q.x.priority.toUpperCase(), tx, py + 8);
              font(f.doc, 9, 'bold', INK); f.doc.text(q.lines, tx + 44, py + 8);
              font(f.doc, 8, 'normal', INK2); f.doc.text(q.sub, tx, py + 8 + q.lines.length * 11 + 1);
              py += rowH;
            }
            ty += bh + 6;
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

/** THE SUMMARY TABLE (4 November — Rowland: "think of a table form ... the program number, the program name, the run speed that we achieved, and the caveat next
 *  to it ... so somebody can go to a meeting and say, that's where we are. These are the details below it"): one row a program, in the report's order. */
export function summaryBlocks(reading: ProgramsReading): Block[] {
  const data: SummaryRow[] = programsSummary({ ...reading, machines: reading.machines.map(m => ({ ...m, lines: m.lines.map(sanLine) })) });
  if (!data.length) return [];
  /* the columns: no · program (with its machine and products under it) · status · run speed · can run at · caveat */
  const cols = { no: 44, prog: 150, st: 64, sp: 62, run: 58 }, PAD = 6;
  const cavW = (f: Frame) => f.w - (cols.no + cols.prog + cols.st + cols.sp + cols.run) - PAD;
  const CAV_MAX = 4;
  const cells = (f: Frame, r: SummaryRow) => {
    const cav = r.caveat ? wrap(f.doc, san(r.caveat), cavW(f) - 6, 8.5, 'bold') : [];
    return {
      no: wrap(f.doc, san(r.no || '—'), cols.no - 4, 9, 'bold'),
      name: wrap(f.doc, san(r.name), cols.prog - 8, 9.5, 'bold'),
      sub: wrap(f.doc, san([r.machine, r.runs].filter(Boolean).join(' · ')), cols.prog - 8, 7.5),
      sp: wrap(f.doc, san(r.runSpeed), cols.sp - 4, 9, 'bold'), run: wrap(f.doc, san(r.canRunAt), cols.run - 4, 9, 'bold'),
      cav: cav.length > CAV_MAX ? [...cav.slice(0, CAV_MAX - 1), `${cav[CAV_MAX - 1].replace(/\s+\S*$/, '')} …`] : cav,
    };
  };
  const rowH = (f: Frame, r: SummaryRow) => { const c = cells(f, r); return Math.max(24, 10 + c.name.length * 11.5 + c.sub.length * 9.5, 10 + c.sp.length * 11, 8 + c.cav.length * 11) + 6; };
  const head = (f: Frame, y: number) => {
    f.doc.setFillColor(BAND); f.doc.roundedRect(f.x, y, f.w, 18, 3, 3, 'F'); f.doc.setFillColor(BAND_EDGE); f.doc.rect(f.x, y, 2.5, 18, 'F');
    font(f.doc, 7, 'bold', INK2);
    let x = f.x + 8;
    for (const [t, w] of [['NO.', cols.no], ['PROGRAM', cols.prog], ['STATUS', cols.st], ['RUN SPEED', cols.sp], ['CAN RUN AT', cols.run], ['CAVEAT — WHAT TO WATCH', cavW(f)]] as [string, number][]) { f.doc.text(t, x, y + 12); x += w; }
  };
  const out: Block[] = [
    { ...text({ text: `SUMMARY — WHERE EACH PROGRAM STANDS · ${data.length} PROGRAM${data.length === 1 ? '' : 'S'}`, size: 8, style: 'bold', colour: BRAND, before: 2, after: 4 }), keepWithNext: true },
    { ...box(() => 22, (f, y) => head(f, y)), keepWithNext: true },
    rows({
      rows: data.map(r => ({
        h: (f: Frame) => rowH(f, r),
        draw: (f: Frame, y: number) => {
          const c = cells(f, r), h = rowH(f, r);
          f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y + h - 2, f.x + f.w, y + h - 2);
          let x = f.x + 8;
          font(f.doc, 9, 'bold', BRAND); f.doc.text(c.no, x, y + 13); x += cols.no;
          font(f.doc, 9.5, 'bold', INK); f.doc.text(c.name, x, y + 13);
          if (c.sub.length) { font(f.doc, 7.5, 'normal', MUTED); f.doc.text(c.sub, x, y + 13 + c.name.length * 11.5 - 2); }
          x += cols.prog;
          /* the status as a pill in its colour — the one white-on-colour the house allows; grey is an outline with grey words */
          const w = Math.min(cols.st - 4, 8 + (r.status.word.length > 9 ? 52 : r.status.word.length * 5.6));
          if (r.status.tone === 'n') { f.doc.setDrawColor(MUTED); f.doc.setLineWidth(0.8); f.doc.roundedRect(x, y + 4, w, 14, 3, 3, 'S'); font(f.doc, 6.5, 'bold', MUTED); }
          else { f.doc.setFillColor(TONE[r.status.tone]); f.doc.roundedRect(x, y + 4, w, 14, 3, 3, 'F'); font(f.doc, 6.5, 'bold', '#ffffff'); }
          f.doc.text(r.status.word.toUpperCase().slice(0, 12), x + w / 2, y + 13.2, { align: 'center' });
          x += cols.st;
          font(f.doc, 9, 'bold', r.runSpeed === '—' ? MUTED : INK); f.doc.text(c.sp, x, y + 13); x += cols.sp;
          font(f.doc, 9, 'bold', r.ahead ? AMBER : r.canRunAt === '—' ? MUTED : INK); f.doc.text(c.run, x, y + 13); x += cols.run;
          if (c.cav.length) { font(f.doc, 8.5, 'bold', INK); f.doc.text(c.cav, x, y + 12); }
        },
      })),
      after: 'm',
    }),
  ];
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
  const problems = await (await import('./programProblems')).problemsByProgram().catch(() => undefined);
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
    out.push(text({ text: san(r.says), size: 9.5, colour: INK2, after: r.statusSays ? 2 : gap(d, 'm') }));
    if (r.statusSays) out.push(text({ text: san(r.statusSays), size: 9, colour: INK2, after: gap(d, 'm') }));
    /* a job with none of its own, and its line's to show, says so in a line —
       never "No programs yet" over the line's */
    if (r.total || !x.linePrograms?.length) { out.push(...summaryBlocks(r)); out.push(text({ text: 'THE DETAIL — EVERY PROGRAM, MACHINE BY MACHINE', size: 8, style: 'bold', colour: BRAND, before: gap(d, 's'), after: 4 })); out.push(...programsBlocks(r, d, { problems })); }
    for (const lp of x.linePrograms ?? []) {
      out.push({ ...text({ text: `On ${san(lp.line)}, with no project — ${san(lp.reading.says)}`, size: SIZE.h2, style: 'bold', before: gap(d, 's'), after: 4 }), keepWithNext: true });
      out.push(...programsBlocks(lp.reading, d, { problems }));
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

export async function drawOneProgramReport(doc: jsPDF, x: { lineName: string; printed: string; reading: ProgramsReading;
  eyebrow?: string }): Promise<void> {
  const line = x.reading.lines[0];
  if (!line) return;
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const problems = await (await import('./programProblems')).problemsByProgram().catch(() => undefined);
  const name = san(line.what);
  const blocks = (d: Density): Block[] => {
    const out: Block[] = [];
    out.push(text({ text: x.eyebrow ?? 'PROGRAM · PRODUCTION LINE', size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
    out.push(text({ text: name, size: SIZE.title, style: 'bold', after: 4 }));
    out.push(text({ text: [`On ${san(x.lineName)}`, line.machine ? `Machine: ${san(line.machine)}` : '', `Printed ${san(x.printed)}`].filter(Boolean).join('   ·   '), colour: MUTED, after: gap(d, 'm') }));
    out.push(...programsBlocks(x.reading, d, { machineLabels: false, problems }));
    return out;
  };
  const density = await chooseDensity(base, d => blocks(d));
  await pour({ ...base, density, dry: false }, blocks(density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`${name}  ·  ${san(x.lineName)}  ·  ${san(x.printed)}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
