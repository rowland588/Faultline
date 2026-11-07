/* THE LINE REPORT — EVERYTHING ON THE LINE, ON PAPER (lib/lineBundle, 23
 * October). A4 portrait, laid out by the report engine (src/lib/report/,
 * docs/REPORTS.md): the band and the line's tiles as the one-page line report
 * prints them (lib/lineLean); then, for each part — a line, or each line of a
 * dual line and then both together — what is open (its problems and its
 * programs, with the programs report's own blocks), where on the line a
 * finding points, each tool ticked in with the blocks its own paper prints
 * (lib/studiesPdf studyBlocks; lib/capacityPaperPdf productLeanBlocks), and
 * who owes what by when; the closing line last. Nothing is drawn here that a
 * tool's own paper does not draw: the sections are theirs, the order is the
 * line's.
 *
 * The summary (not the full package's glance) opens as the lean page
 * (docs/LEAN-PAGE.md): the band, the tiles, where on the line as the one
 * picture, what it means, who owes what, the closing line. The problems,
 * the programs and each ticked tool's own blocks follow as the records. */
import type { jsPDF } from 'jspdf';
import type { Standard } from '../../tools/linestandard/standard';
import type { StudyContext } from '../../lib/studyLinks';
import type { ProgramsReading } from '../../lib/programsReport';
import type { CapacityPaper } from '../../tools/linebalance/capacityPaper';
import type { LineReading } from '../../lib/lineLean';
import { lineClosing, lineTiles } from '../../lib/lineLean';
import { pictureNames, problemsLine, summaryMeans, summaryPage, whereFor, type LineBundle, type LinePart, type WhereRow } from './lineBundle';
import { chooseDensity, pour, type Block, type Density, type Frame } from '../../lib/report/flow';
import { font, gap, rows, text, wrap } from '../../lib/report/blocks';
import { leanActions, leanBand, leanClosing, leanHead, leanInsights, leanTiles } from '../../lib/report/lean';
import { bandPage, type LeanTone } from '../../lib/lean';
import { listRows } from '../../lib/lineReportPdf';
import { programsBlocks } from '../../lib/programsReportPdf';
import { studyBlocks, type StudiesPaper } from '../../lib/studiesPdf';
import { preloadAttachPictures } from '../../lib/report/attachPaper';
import { productLeanBlocks } from '../../tools/linebalance/capacityPaperPdf';
import { PRIORITY_WORD } from '../../lib/snagsReport';
import { headcount } from '../../tools/linestandard/standard';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#475569', MUTED = '#64748b', LINE = '#e6eaf0';
const TONE: Record<LeanTone, string> = { g: '#15803d', a: '#b45309', r: '#c4281c', n: '#6b7588' };

export interface LineBundlePaper {
  bundle: LineBundle;
  /** The items ticked in, by key (lib/lineBundle BundleItem.key). */
  picks: ReadonlySet<string>;
  printed: string;
  /** Each part's line as the one-page report reads it (lib/lineLean), by the part's line id. */
  readings: ReadonlyMap<string, LineReading>;
  /** Each part's programs, machine by machine, by the part's line id — absent when it has none. */
  programs: ReadonlyMap<string, ProgramsReading | undefined>;
  /** What a study's blocks read beside the study. */
  standards: Standard[];
  ctx?: StudyContext;
  /** A product's Line capacity on paper, by the standard's id — for the capacities ticked in. */
  capacity: ReadonlyMap<string, CapacityPaper>;
  /** "Made of Line 2a + line 2b" / "Part of 2a 2b" for the band (lib/lines). */
  dual?: [string, string];
  /** THE LINE AT A GLANCE, for the full package: the tiles, what is open, where, who owes what — and no tool sections (each tool's own paper follows it). */
  glance?: boolean;
}

/** WHERE ON THE LINE — a row a machine, every finding under it in its own colour. */
function whereBlocks(rowsOf: WhereRow[]): Block[] {
  const nameW = 130;
  return [rows({
    rows: rowsOf.map(w => ({
      h: (f: Frame) => 8 + Math.max(12, w.findings.reduce((n, x) => n + wrap(f.doc, `${x.from}: ${x.says}`, f.w - nameW - 8, 8.5).length * 10.5, 0)),
      draw: (f: Frame, top: number) => {
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, top, f.x + f.w, top);
        font(f.doc, 9, 'bold', INK2); f.doc.text(wrap(f.doc, w.machine, nameW - 8, 9, 'bold').slice(0, 2), f.x, top + 12);
        let y = top + 12;
        for (const x of w.findings) {
          const lines = wrap(f.doc, `${x.from}: ${x.says}`, f.w - nameW - 8, 8.5);
          font(f.doc, 8.5, x.tone === 'n' ? 'normal' : 'bold', TONE[x.tone]);
          f.doc.text(lines, f.x + nameW, y);
          y += lines.length * 10.5;
        }
      },
    })),
    after: 'm',
  })];
}

function partBlocks(p: LineBundlePaper, part: LinePart, d: Density): Block[] {
  const out: Block[] = [];
  const b = p.bundle;
  const reading = p.readings.get(part.line.id);
  if (b.dual) out.push(leanHead(part.title.toUpperCase() === part.title ? part.title : part.title, part.title === 'Both lines together' ? `what was run on ${b.line.name} itself` : undefined));
  if (reading) {
    out.push(leanTiles(lineTiles(reading)));
    const c = lineClosing(reading);
    out.push(text({ text: c.text, size: 9.5, style: 'bold', colour: c.tone === 'r' ? TONE.r : c.tone === 'a' ? TONE.a : INK2, after: gap(d, 's') }));
    /* HOW FRESH THE LOOKING IS (FC-199) — the line's sentence and what the looking found, as its page says them */
    if (reading.looking) {
      out.push(text({ text: reading.looking.says, size: 9, style: 'bold', colour: /stale/.test(reading.looking.says) ? TONE.r : /fading/.test(reading.looking.says) ? TONE.a : INK2, after: 2 }));
      out.push(text({ text: reading.looking.more, size: 8, colour: MUTED, after: gap(d, 'm') }));
    }
    /* A PROVED FIX OFFERED ACROSS THE LINES (FC-155, tools/yokoten) — as the line's page says it */
    for (const x of reading.spread ?? []) out.push(text({ text: x, size: 8.5, colour: INK2, after: 3 }));
  }

  /* WHAT IS OPEN — its problems, priority order, the late in red; its programs, machine by machine.
     The full package's glance (a page headed "the line at a glance" must show its problems — Rowland, 4 November: "the line at a glance
     didn't have problems, makes no sense") lists the open problems, one line each, and says its programs in one line, leaving their
     full lists to the Programs section that follows. */
  out.push(leanHead('Problems open', part.problems.open ? `${part.problems.open} open${part.problems.late ? ` · ${part.problems.late} late` : ''}` : undefined));
  if (!part.problems.rows.length) out.push(text({ text: 'Nothing open on this line.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else out.push(...listRows(part.problems.rows.map(r => ({ what: `${PRIORITY_WORD[r.priority]} · ${r.what}`, meta: [r.machine ?? '', r.forJob ? `for ${r.forJob}` : '', r.owner ?? 'nobody yet'].filter(Boolean).join(' · '), right: r.late && r.due ? r.due : r.word, tone: r.late || r.priority === 'critical' ? 'r' : 'n' })), 12, n => `and ${n} more — the line's Problems report has every one`));
  if (p.glance) {
    const pr0 = p.programs.get(part.line.id);
    out.push(leanHead('Programs', pr0 ? pr0.says : undefined));
    out.push(text({ text: pr0?.lines.length ? 'Every program, machine by machine, with each test and how it went, is in the Programs and Test cards sections that follow.' : 'No program planned on this line.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  } else {
  const pr = p.programs.get(part.line.id);
  out.push(leanHead('Programs', pr ? pr.says : undefined));
  if (!pr || !pr.lines.length) out.push(text({ text: 'No program planned on this line.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else out.push(...programsBlocks(pr, d));
  }

  /* WHERE ON THE LINE — only where a finding points at a machine */
  const where = whereFor(part, p.picks);
  if (where.length) { out.push(leanHead('Where on the line', `${where.length} machine${where.length === 1 ? '' : 's'} with findings`)); out.push(...whereBlocks(where)); }

  /* EACH TOOL TICKED IN — its own paper's blocks (the full package's glance leaves them to their own papers) */
  const picked = p.glance ? [] : part.items.filter(it => p.picks.has(it.key));
  if (!picked.length && !p.glance) out.push(text({ text: part.items.length ? 'No tool ticked in for this line.' : 'No tool used on this line yet.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  let i = 0;
  for (const it of picked) {
    out.push(leanHead(`${it.tool} — ${it.name}`, it.says.length <= 60 ? it.says : undefined));
    if (it.study) {
      const sp: StudiesPaper = { title: it.name, printed: p.printed, items: [{ s: it.study, where: `On ${part.line.name}` }], standards: p.standards, ...(p.ctx ? { ctx: p.ctx } : {}) };
      out.push(...studyBlocks(sp, sp.items[0], i, d));
    } else if (it.standard && it.key.startsWith('capacity:')) {
      const cp = p.capacity.get(it.standard.id);
      if (cp) out.push(...productLeanBlocks(cp, d));
      else out.push(text({ text: it.says, size: 9, colour: INK2, after: gap(d, 'm') }));
    } else if (it.standard) {
      const n = headcount(it.standard);
      out.push(text({ text: `${n ? `${n} ${n === 1 ? 'person' : 'people'} placed on the board` : 'The board, nobody placed yet'} — the line standard's card is its own paper.`, size: 9, colour: INK2, after: gap(d, 'm') }));
    }
    i++;
  }

  /* WHO OWES WHAT BY WHEN */
  out.push(leanHead('Who owes what by when', part.actions.length ? `${part.actions.length} open` : undefined));
  out.push(...leanActions(part.actions, 'Nothing owed on this line — no problem open, every program proved.'));
  return out;
}

/** The one picture — the machines in flow, a tone only where a finding is off, then the findings. */
function machineStrip(names: string[], where: WhereRow[]): Block {
  const GAP = 8;
  const toneOf = (name: string): LeanTone => {
    const row = where.find(w => w.machine.toLowerCase() === name.toLowerCase());
    if (!row?.findings.length) return 'n';
    return row.findings.some(f => f.tone === 'r') ? 'r' : row.findings.some(f => f.tone === 'a') ? 'a' : 'n';
  };
  const countOf = (name: string) => where.find(w => w.machine.toLowerCase() === name.toLowerCase())?.findings.length ?? 0;
  const lay = (f: Frame) => {
    const bw = Math.min(120, Math.max(78, (f.w - 3 * GAP) / 4));
    const per = Math.max(1, Math.floor((f.w + GAP) / (bw + GAP)));
    const boxes = names.map(name => {
      const label = wrap(f.doc, name, bw - 16, 8, 'bold').slice(0, 2);
      const n = countOf(name);
      return { name, label, sub: n ? `${n} finding${n === 1 ? '' : 's'}` : 'no finding', tone: toneOf(name), h: 8 + label.length * 10 + 12 + 8 };
    });
    const rowH: number[] = [];
    for (let i = 0; i < boxes.length; i += per) rowH.push(Math.max(...boxes.slice(i, i + per).map(b => b.h)));
    return { bw, per, boxes, rowH, h: rowH.reduce((a, b) => a + b, 0) + GAP * Math.max(0, rowH.length - 1) };
  };
  return {
    height: f => lay(f).h + 8,
    after: () => 8,
    draw: (f, y) => {
      const l = lay(f), d = f.doc;
      let i = 0;
      l.rowH.forEach((rh, ri) => {
        const y0 = y + l.rowH.slice(0, ri).reduce((a, b) => a + b + GAP, 0);
        for (let c = 0; c < l.per && i < l.boxes.length; c++, i++) {
          const b = l.boxes[i], x = f.x + c * (l.bw + GAP);
          d.setDrawColor(LINE); d.setLineWidth(0.6); d.roundedRect(x, y0, l.bw, rh, 3, 3, 'S');
          d.setFillColor(b.tone === 'n' ? LINE : TONE[b.tone]); d.rect(x + 0.4, y0 + 0.4, l.bw - 0.8, 2.5, 'F');
          font(d, 8, 'bold', INK2); b.label.forEach((s, k) => d.text(s, x + 8, y0 + 14 + k * 10));
          font(d, 7, 'normal', MUTED); d.text(b.sub, x + 8, y0 + 14 + b.label.length * 10 + 2);
        }
      });
    },
  };
}

function linePicture(machines: string[], where: WhereRow[]): Block[] {
  const names = pictureNames(machines, where);
  const out: Block[] = [];
  if (names.length) out.push(machineStrip(names, where));
  if (where.length) out.push(...whereBlocks(where));
  else if (!names.length) out.push(text({ text: 'No finding points at a machine.', size: 8.5, colour: MUTED, after: 8 }));
  return out;
}

/** The lean reading of one part — tiles, the picture, what it means, who owes what. */
function summaryReading(p: LineBundlePaper, part: LinePart, _d: Density): Block[] {
  const out: Block[] = [];
  const reading = p.readings.get(part.line.id);
  if (p.bundle.dual) out.push(leanHead(part.title, part.title === 'Both lines together' ? `what was run on ${p.bundle.line.name} itself` : undefined));
  if (reading) out.push(leanTiles(lineTiles(reading)));
  const where = whereFor(part, p.picks);
  out.push(leanHead('Where on the line', where.length ? `${where.length} machine${where.length === 1 ? '' : 's'} with findings` : undefined));
  out.push(...linePicture(part.kit.machines.map(m => m.name), where));
  const pr = p.programs.get(part.line.id);
  const means = summaryMeans({
    ...(reading?.looking ? { looking: reading.looking } : {}),
    ...(reading?.spread?.length ? { spread: reading.spread } : {}),
    problems: problemsLine(part),
    programs: pr?.says ?? 'no program planned',
    programsTone: reading?.programs.late ? 'r' : reading && reading.programs.n > reading.programs.proved ? 'a' : 'n',
    picked: part.items.filter(it => p.picks.has(it.key)).map(it => ({ tool: it.tool, says: it.says, tone: it.tone })),
  });
  if (means.length) { out.push(leanHead('What it means')); out.push(...leanInsights(means)); }
  out.push(leanHead('Who owes what by when', part.actions.length ? `${part.actions.length} open` : undefined));
  out.push(...leanActions(part.actions, 'Nothing owed on this line — no problem open, every program proved.'));
  return out;
}

/** The records behind the reading — problems, programs, each ticked tool's own blocks. */
function summaryDetail(p: LineBundlePaper, part: LinePart, d: Density): Block[] {
  const out: Block[] = [];
  out.push(leanHead(p.bundle.dual ? part.title : 'The records', p.bundle.dual ? 'the records' : undefined));
  out.push(leanHead('Problems open', part.problems.open ? `${part.problems.open} open${part.problems.late ? ` · ${part.problems.late} late` : ''}` : undefined));
  if (!part.problems.rows.length) out.push(text({ text: 'Nothing open on this line.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else out.push(...listRows(part.problems.rows.map(r => ({ what: `${PRIORITY_WORD[r.priority]} · ${r.what}`, meta: [r.machine ?? '', r.forJob ? `for ${r.forJob}` : '', r.owner ?? 'nobody yet'].filter(Boolean).join(' · '), right: r.late && r.due ? r.due : r.word, tone: r.late || r.priority === 'critical' ? 'r' : 'n' })), 12, n => `and ${n} more — the line's Problems report has every one`));
  const pr = p.programs.get(part.line.id);
  out.push(leanHead('Programs', pr ? pr.says : undefined));
  if (!pr || !pr.lines.length) out.push(text({ text: 'No program planned on this line.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else out.push(...programsBlocks(pr, d));
  const picked = part.items.filter(it => p.picks.has(it.key));
  if (!picked.length) out.push(text({ text: part.items.length ? 'No tool ticked in for this line.' : 'No tool used on this line yet.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  let i = 0;
  for (const it of picked) {
    out.push(leanHead(`${it.tool} — ${it.name}`, it.says.length <= 60 ? it.says : undefined));
    if (it.study) {
      const sp: StudiesPaper = { title: it.name, printed: p.printed, items: [{ s: it.study, where: `On ${part.line.name}` }], standards: p.standards, ...(p.ctx ? { ctx: p.ctx } : {}) };
      out.push(...studyBlocks(sp, sp.items[0], i, d));
    } else if (it.standard && it.key.startsWith('capacity:')) {
      const cp = p.capacity.get(it.standard.id);
      if (cp) out.push(...productLeanBlocks(cp, d));
      else out.push(text({ text: it.says, size: 9, colour: INK2, after: gap(d, 'm') }));
    } else if (it.standard) {
      const n = headcount(it.standard);
      out.push(text({ text: `${n ? `${n} ${n === 1 ? 'person' : 'people'} placed on the board` : 'The board, nobody placed yet'} — the line standard's card is its own paper.`, size: 9, colour: INK2, after: gap(d, 'm') }));
    }
    i++;
  }
  return out;
}

/** The summary paper: the lean page first, the closing line, then the records. */
function summaryDocument(p: LineBundlePaper, d: Density): Block[] {
  const b = p.bundle;
  const whole = b.dual ? p.readings.get(b.line.id) : p.readings.get(b.parts[0].line.id);
  const c = whole ? lineClosing(whole) : { text: '', tone: 'n' as LeanTone };
  const page = summaryPage(b, { picks: p.picks.size, tone: c.tone, ...(p.dual ? { dual: p.dual } : {}), ...(whole?.looking ? { lookingFact: whole.looking.fact } : {}) });
  const out: Block[] = [leanBand(page, p.printed)];
  for (const part of b.parts) out.push(...summaryReading(p, part, d));
  if (whole && c.text) out.push(leanClosing(c));
  for (const part of b.parts) out.push(...summaryDetail(p, part, d));
  return out;
}

function blocksOf(p: LineBundlePaper, d: Density): Block[] {
  if (!p.glance) return summaryDocument(p, d);
  const b = p.bundle;
  const first = p.readings.get(b.parts[0].line.id);
  const whole = b.dual ? p.readings.get(b.line.id) : first;
  const c = whole ? lineClosing(whole) : { text: '', tone: 'n' as LeanTone };
  const page = bandPage(`PRODUCTION LINE${b.line.lineType ? ` · ${b.line.lineType.toUpperCase()}` : ''} · ${p.glance ? 'THE LINE AT A GLANCE' : 'THE LINE REPORT — EVERYTHING ON THE LINE'}`, { name: b.line.name }, undefined, undefined,
    [...(p.dual ? [p.dual] : []), ['Parts', b.dual ? `${b.parts.length - 1} lines, then both together` : 'one line'], ...(p.glance ? [] : [['Tools in', String([...p.picks].length)] as [string, string]])]);
  const out: Block[] = [leanBand({ ...page, verdict: { text: c.tone === 'r' ? 'Needs you' : c.tone === 'a' ? 'Gaps to close' : 'In hand', tone: c.tone } }, p.printed)];
  for (const part of b.parts) out.push(...partBlocks(p, part, d));
  if (whole) out.push(leanClosing(lineClosing(whole)));
  return out;
}

export async function drawLineBundle(doc: jsPDF, p: LineBundlePaper): Promise<void> {
  /* the pictures the ticked studies carry (docs/ATTACHMENTS.md), read before the paper is poured */
  await preloadAttachPictures(p.bundle.parts.flatMap(pt => pt.items.flatMap(it => (it.study ? [it.study] : []))));
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, dd => blocksOf(p, dd));
  await pour({ ...base, density, dry: false }, blocksOf(p, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(wrap(doc, `${p.bundle.line.name} — ${p.glance ? 'the line at a glance' : 'the line report, everything on the line'}  ·  ${p.printed}${p.glance ? '' : '  ·  each tool\'s own report has every row'}`, CW - 60, 7.5)[0] ?? '', M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
