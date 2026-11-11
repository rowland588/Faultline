/* THE AREA REPORT ON PAPER (9 November, src/line/report/areaBundle). A4 portrait, poured by the report engine (src/lib/report/):
 *
 *   the band — AREA · THE AREA REPORT, the area's name, its client, site and area, its lines; the area's tiles and its sentence;
 *   each line of the area in turn, read as the line report's summary reads a part — its tiles, where on the line, what it means,
 *   who owes what (lineBundlePdf summaryReading), a dual line as its lines and then both lines together, printed once;
 *   THE AREA TOGETHER — every open problem across its lines naming its line, who owes what by when across them, the projects on its
 *   lines, the programs to prove; the closing line;
 *   then the records of each line — its problems, its programs, each ticked tool's own blocks (lineBundlePdf summaryDetail).
 *
 * The parts are printed by the line report's own functions, so the area's paper and each line's can never disagree. */
import type { jsPDF } from 'jspdf';
import type { Standard } from '../../tools/linestandard/standard';
import type { StudyContext } from '../../lib/studyLinks';
import type { ProgramsReading } from '../../lib/programsReport';
import type { CapacityPaper } from '../../tools/linebalance/capacityPaper';
import type { LineReading } from '../../lib/lineLean';
import { chooseDensity, pour, type Block, type Density } from '../../lib/report/flow';
import { font, gap, text, wrap } from '../../lib/report/blocks';
import { leanActions, leanBand, leanClosing, leanHead, leanTiles } from '../../lib/report/lean';
import { bandPage, type LeanTone } from '../../lib/lean';
import { listRows } from '../../lib/lineReportPdf';
import { PRIORITY_WORD } from '../../lib/snagsReport';
import { preloadAttachPictures } from '../../lib/report/attachPaper';
import { preloadToolProblems } from '../../lib/report/toolProblemsPaper';
import { areaSays, areaTiles } from '../../lib/areas';
import { dualOf, linesSaid } from '../../lib/lines';
import { summaryDetail, summaryReading, type LineBundlePaper } from './lineBundlePdf';
import { areaActionRows, type AreaBundle } from './areaBundle';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#475569', MUTED = '#64748b';
const TONE: Record<LeanTone, string> = { g: '#15803d', a: '#b45309', r: '#c4281c', n: '#6b7588' };

export interface AreaBundlePaper {
  area: AreaBundle;
  picks: ReadonlySet<string>;
  printed: string;
  /** Each part's line as the one-page line report reads it, by the part's line id. */
  readings: ReadonlyMap<string, LineReading>;
  programs: ReadonlyMap<string, ProgramsReading | undefined>;
  standards: Standard[];
  ctx?: StudyContext;
  capacity: ReadonlyMap<string, CapacityPaper>;
}

/** The band's facts — client, site, area and its lines, the words the lines say. */
export function areaBandFacts(a: AreaBundle, picks: number): [string, string][] {
  return [
    ...(a.client ? [['Client', a.client] as [string, string]] : []),
    ...(a.area.site ? [['Site', a.area.site] as [string, string]] : []),
    ['Area', a.area.area],
    ['Lines', a.lines.map(w => w.name).join(' · ') || 'none'],
    ['Tools in', String(picks)],
  ];
}

/** Each line's part as its own line report prints it — every bundle printed with a heading a part, a dual line's with its lines. */
function paperOf(p: AreaBundlePaper, i: number): LineBundlePaper {
  const b = p.area.bundles[i];
  /* `dual` set on every bundle so each part is headed by its line's name (summaryReading, summaryDetail), as a dual line's are */
  return { bundle: { ...b, dual: true }, picks: p.picks, printed: p.printed, readings: p.readings, programs: p.programs, standards: p.standards, capacity: p.capacity, ...(p.ctx ? { ctx: p.ctx } : {}) };
}

function blocksOf(p: AreaBundlePaper, d: Density): Block[] {
  const a = p.area;
  const says = areaSays(a.facts);
  const page = bandPage('AREA · THE AREA REPORT — EVERYTHING HAPPENING IN THE AREA', { name: a.title }, says.tone === 'r' ? 'Needs you' : says.tone === 'a' ? 'Gaps to close' : 'In hand', says.tone, areaBandFacts(a, p.picks.size));
  const out: Block[] = [leanBand(page, p.printed), leanTiles(areaTiles(a.facts)),
    text({ text: says.text, size: 9.5, style: 'bold', colour: says.tone === 'r' ? TONE.r : says.tone === 'a' ? TONE.a : INK2, after: gap(d, 'm') })];

  /* EACH LINE OF THE AREA — the line report's own reading of each part */
  a.bundles.forEach((b, i) => {
    if (b.parts.length > 1) {
      const dual = dualOf(b.line, a.lines);
      out.push(leanHead(b.line.name.toUpperCase(), dual.madeOf.length ? `a dual line, made of ${linesSaid(b.parts.filter(x => x.line.id !== b.line.id).map(x => x.line))}` : undefined));
    }
    const lp = paperOf(p, i);
    for (const part of b.parts) out.push(...summaryReading(lp, part, d));
  });

  /* THE AREA TOGETHER — what is open and owed across its lines, its projects, its programs to prove */
  out.push(leanHead('THE AREA TOGETHER', `${a.lines.length} line${a.lines.length === 1 ? '' : 's'}`));
  const rows = a.parts.flatMap(part => part.problems.rows.map(r => ({ r, line: part.line.name })));
  const open = rows.length, late = rows.filter(x => x.r.late).length;
  out.push(leanHead('Problems open in the area', open ? `${open} open${late ? ` · ${late} late` : ''}` : undefined));
  const rank = (x: (typeof rows)[number]) => (x.r.late ? 0 : x.r.priority === 'critical' ? 1 : x.r.priority === 'high' ? 2 : 3);
  if (!rows.length) out.push(text({ text: 'Nothing open on any line of the area.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else out.push(...listRows(rows.slice().sort((x, y) => rank(x) - rank(y)).map(({ r, line }) => ({ what: `${PRIORITY_WORD[r.priority]} · ${r.what}`, meta: [line, r.machine ?? '', r.forJob ? `for ${r.forJob}` : '', r.owner ?? 'nobody yet'].filter(Boolean).join(' · '), right: r.late && r.due ? r.due : r.word, tone: r.late || r.priority === 'critical' ? 'r' : 'n' })), 24, n => `and ${n} more — each line's Problems report has every one`));
  out.push(leanHead('Who owes what by when, across the area', a.actions.length ? `${a.actions.length} open` : undefined));
  out.push(...leanActions(areaActionRows(a), 'Nothing owed in the area — no problem open, every program proved.'));
  out.push(leanHead('Projects on its lines', a.projects.length ? String(a.projects.length) : undefined));
  if (!a.projects.length) out.push(text({ text: 'No project on any line of the area.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else for (const j of a.projects) out.push(text({ text: `${j.name} — on ${j.lines.join(', ')}`, size: 9, colour: INK2, after: 3 }));
  const toProve = a.actions.filter(x => x.kind === 'program');
  out.push(leanHead('Programs to prove', toProve.length ? String(toProve.length) : undefined));
  if (!toProve.length) out.push(text({ text: 'Every program on the area\'s lines is proved, or none is planned.', size: 8.5, colour: MUTED, after: gap(d, 'm') }));
  else for (const g of toProve) out.push(text({ text: `${g.what} — ${g.line} · ${g.state}${g.due ? ` · ${g.due}` : ''}`, size: 9, style: g.tone === 'r' ? 'bold' : 'normal', colour: g.tone === 'r' ? TONE.r : INK2, after: 3 }));
  out.push(leanClosing(says));

  /* THE RECORDS — each line's problems, programs and the tools ticked in, as its own report prints them */
  a.bundles.forEach((b, i) => { const lp = paperOf(p, i); for (const part of b.parts) out.push(...summaryDetail(lp, part, d)); });
  return out;
}

export async function drawAreaBundle(doc: jsPDF, p: AreaBundlePaper): Promise<void> {
  await preloadAttachPictures(p.area.parts.flatMap(pt => pt.items.flatMap(it => (it.study && p.picks.has(it.key) ? [it.study] : []))));
  await preloadToolProblems();
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, dd => blocksOf(p, dd));
  await pour({ ...base, density, dry: false }, blocksOf(p, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(wrap(doc, `${p.area.title} — the area report, everything happening in the area  ·  ${p.printed}  ·  each line's own report has every row`, CW - 60, 7.5)[0] ?? '', M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
