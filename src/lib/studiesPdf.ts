/* A STUDY ON PAPER — one study, or every one a list shows (docs/AUDIT.md,
 * bar 3). Rowland, 13 October: "I find that I'm always asking for reports, or
 * cards, to be able to present things in a certain way that would seem to be
 * obvious, but aren't". A study reached paper only inside a job's client or
 * 6M report; a study on a line, or a quick session, had none.
 *
 * Each study says what it is, where it sits, what it is used for and its
 * sentence (lib/studyLinks studyLine), then its table — the same blocks the
 * client report's Evidence draws (lib/clientReport studyEvidence), so the two
 * never part: a value stream's grid, a changeover's steps, a shift's losses,
 * a sampling's shares. A capability study adds its figures and its readings.
 * Laid out by the report engine (src/lib/report/, docs/REPORTS.md). */
import type { jsPDF } from 'jspdf';
import type { ToolStudy } from './study';
import type { Standard } from './standard';
import type { StudyContext } from './studyLinks';
import { studyEvidence } from './clientReport';
import { sample, sampleSays, CPK_FROM } from './ie/sample';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, font, gap, label, rows, text, wrap } from './report/blocks';
import { streamBlocks } from './report/streamTable';
import { changeoverBlocks } from './report/changeoverTable';
import { agreedFor as agreedForChangeover, changeoverSays, extrapolationSays, figuresOf, ladderOf, moneyOf } from './ie/changeover';
import { smedLean } from './ie/changeoverLean';
import { sampleClosing, sampleTiles } from './ie/sampleLean';
import { momentsAt, personRate, samplingClosing, samplingTiles } from './ie/samplingLean';
import { flowClosing, flowTiles } from './ie/flowLean';
import { samplingSays } from './ie/sampling';
import { dur, flowFigures } from './ie/steps';
import { bandPage, type LeanTile, type LeanTone } from './lean';
import { lossBlocks, lossFallBlock } from './report/lossTable';
import { boxed, leanActions, leanBand, leanClosing, leanHead, leanInsights, leanTiles, leanTrend, pair, stack } from './report/lean';
import { lossFiguresOf } from './studyLinks';
import { lossSays } from './ie/losses';
import { lossLean, lossPart, raisedFrom } from './ie/lossLean';
import type { ActionLike, FixLike } from './lean';
import { samplingBlocks } from './report/samplingTable';
import { balanceBlocks } from './report/balanceTable';
import { balance } from './ie/balance';
import { agreedFor, balanceCost, costInputs, crewKept } from './ie/balanceLink';

import { todayISO } from './weeks';
const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', BRAND = '#0c7489', DANGER = '#c4281c';

export interface StudyPaperItem {
  s: ToolStudy;
  /** "On Line 7 · attached to Line 7 commissioning", said as the page says it. */
  where: string;
}

export interface StudiesPaper {
  /** "Capability study — Weight accuracy 400 g", or "Capability studies — Line 7". */
  title: string;
  printed: string;
  items: StudyPaperItem[];
  standards: Standard[];
  ctx?: StudyContext;
  /** One loss count on its own prints as the lean page (docs/LEAN-PAGE.md):
   *  its line's name, the line's other counts (since last time, the trend)
   *  and what has been raised from it (the action plan). */
  lineName?: string;
  /** Printed from the count's own page — a list's PDF keeps its list form. */
  lean?: boolean;
  history?: ToolStudy[];
  records?: { actions: ({ id: string; deletedAt?: number } & ActionLike)[]; fixes: ({ id: string; deletedAt?: number } & FixLike)[] };
}

/** A CAPABILITY STUDY'S FIGURES AND READINGS — the strip as a row, then
 *  every reading in the order taken, ten to a row, struck ones said so. */
function capabilityBlocks(s: ToolStudy): Block[] {
  const a = s.agreed?.readings;
  if (!a || a.kind === 'ticks') return [];
  const f = sample(a, s.facts.readings ?? []);
  if (!f.n) return [];
  const unit = a.unit ? ` ${a.unit}` : '';
  const fx = (v?: number) => (v === undefined ? '—' : v.toFixed(f.dp));
  const enough = f.n >= CPK_FROM;
  const cells: [string, string][] = [
    ['Readings', `${f.n} of ${f.count}`], ['Mean', `${fx(f.mean)}${unit}`], ['Range', `${fx(f.min)}–${fx(f.max)}`],
    ['Outside', String(f.outside.length)],
    ['Ppk', enough && f.ppk !== undefined && Number.isFinite(f.ppk) ? f.ppk.toFixed(2) : 'too few'],
    ['Cpk', enough && f.cpk !== undefined && Number.isFinite(f.cpk) ? f.cpk.toFixed(2) : 'too few'],
  ];
  const out: Block[] = [];
  out.push(rows({ rows: [{
    h: () => 30,
    draw: (fr: Frame, y: number) => {
      const cw = fr.w / cells.length;
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.5); fr.doc.line(fr.x, y, fr.x + fr.w, y); fr.doc.line(fr.x, y + 28, fr.x + fr.w, y + 28);
      cells.forEach(([k, v], i) => {
        font(fr.doc, 7, 'bold', MUTED); fr.doc.text(k.toUpperCase(), fr.x + i * cw, y + 10);
        font(fr.doc, 10, 'bold', k === 'Outside' && f.outside.length ? DANGER : INK2); fr.doc.text(v, fr.x + i * cw, y + 23);
      });
    },
  }], after: 's' }));
  /* every reading, in the order taken — outside in red, struck said */
  const all = (s.facts.readings ?? []).map((r, i) => ({ no: i + 1, r }));
  const out10: typeof all[] = [];
  for (let i = 0; i < all.length; i += 10) out10.push(all.slice(i, i + 10));
  const outsideIds = new Set(f.outside.map(o => o.id));
  out.push(label('The readings, in the order taken'));
  out.push(rows({
    rows: out10.map(row => ({
      h: () => 15,
      draw: (fr: Frame, y: number) => {
        const cw = fr.w / 10;
        row.forEach(({ no, r }, i) => {
          const v = typeof r.value === 'number' ? r.value.toFixed(f.dp) : r.ok === true ? '✓' : r.ok === false ? '✗' : '—';
          const struck = !!r.struck;
          font(fr.doc, 6.5, 'normal', MUTED); fr.doc.text(String(no), fr.x + i * cw, y + 10);
          font(fr.doc, 8.5, outsideIds.has(r.id) ? 'bold' : 'normal', struck ? MUTED : outsideIds.has(r.id) ? DANGER : INK2);
          fr.doc.text(struck ? `${v} struck` : v, fr.x + i * cw + 12, y + 10);
        });
      },
    })),
    after: 'm',
  }));
  return out;
}

/** ONE LOSS COUNT AS THE LEAN PAGE — the band, the tiles, the trend beside
 *  the waterfall, the top causes, what it means, the action plan and the
 *  closing line, read as the screen reads them (lib/ie/lossLean). */
function lossLeanBlocks(p: StudiesPaper, item: StudyPaperItem, d: Density): Block[] {
  const { s, where } = item;
  const f = lossFiguresOf(s, p.ctx);
  const said = lossSays(f, s.facts.losses, { ...(s.product ? { product: s.product } : {}) });
  const history = (p.history ?? []).filter(h => h.tool === 'losses' && !h.deletedAt).map(h => ({ s: h, f: h.id === s.id ? f : lossFiguresOf(h, p.ctx) }));
  const page = lossLean({ s, f, said, ...(p.lineName ? { line: p.lineName } : {}), history, actions: raisedFrom(s, p.records?.actions ?? [], p.records?.fixes ?? [], lossPart(f)) });
  const e = studyEvidence(s, [], p.standards, p.ctx);
  const out: Block[] = [leanBand(page, p.printed)];
  out.push(text({ text: `${where}${s.uses.length ? ` · used for ${s.uses.length} record${s.uses.length === 1 ? '' : 's'} on its job` : ''}`, size: 8, colour: MUTED, after: gap(d, 's') }));
  out.push(leanTiles(page.tiles));
  const pic = pair(page.trend ? boxed('Shift by shift', leanTrend(page.trend, 104)) : undefined, boxed('Where the minutes went', lossFallBlock(f)));
  if (pic) out.push({ ...pic, after: () => gap(d, 'm'), height: fr => pic.height(fr) + gap(d, 'm') });
  if (e.losses) { out.push(leanHead('Top causes')); out.push(...lossBlocks(e.losses, { head: false })); }
  /* WHAT IT MEANS beside THE ACTION PLAN, as the screen sets them — when a
     page holds both side by side; one under the other when there is more */
  const means = [leanHead('What it means'), text({ text: said.text, size: 8.5, style: said.tone === 'r' ? 'bold' : 'normal', colour: said.tone === 'r' ? DANGER : INK2, after: 4 }), ...leanInsights(page.insights)];
  const plan = [leanHead('Action plan'), ...leanActions(page.actions, page.actionsEmpty)];
  if (page.insights.length <= 6 && page.actions.length <= 5) {
    const both = pair(stack(means), stack(plan), 18) as Block;
    out.push({ ...both, height: fr => both.height(fr) + gap(d, 's'), after: () => gap(d, 's') });
  } else out.push(...means, ...plan);
  out.push(leanClosing(page.closing));
  if (s.receipt?.text && s.closedAt) out.push(text({ text: `Closed: ${s.receipt.text}`, size: 8, colour: MUTED, before: 2, after: 2 }));
  return out;
}

/** ONE SMED AS THE LEAN PAGE (slice 6; lib/ie/changeoverLean) — the band,
 *  the tiles, what it says, the changeover element by element, the action
 *  plan and the closing line, read as the screen reads them. */
function smedLeanBlocks(p: StudiesPaper, item: StudyPaperItem, d: Density): Block[] {
  const { s, where } = item;
  const ws = p.ctx?.workspaces?.find(w => w.id === s.workspaceId);
  const st = p.standards.find(x => x.id === s.standardId);
  const agreed = agreedForChangeover(st?.capacity?.changeovers, s.facts.fromProduct);
  const f = figuresOf(s.facts), l = ladderOf(s.facts.sequence), said = changeoverSays(f, agreed), money = moneyOf(ws);
  const cost = extrapolationSays(l, s.facts, money);
  const page = smedLean({ s, f, l, said, cost, ...(money ? { money } : {}), ...(p.lineName ? { line: p.lineName } : {}), ...(agreed ? { agreed } : {}),
    raised: raisedFrom(s, p.records?.actions ?? [], p.records?.fixes ?? [], step => (s.facts.sequence ?? []).find(x => x.id === step)?.name) });
  const e = studyEvidence(s, [], p.standards, p.ctx);
  const out: Block[] = [leanBand(page, p.printed)];
  out.push(text({ text: `${where}${s.uses.length ? ` · used for ${s.uses.length} record${s.uses.length === 1 ? '' : 's'} on its job` : ''}`, size: 8, colour: MUTED, after: gap(d, 's') }));
  out.push(leanTiles(page.tiles));
  out.push(leanHead('What it says'));
  out.push(text({ text: e.line, size: 9, colour: e.tone === 'r' ? DANGER : INK2, after: gap(d, 's') }));
  if (e.changeover) { out.push(leanHead('The changeover, element by element')); out.push(...changeoverBlocks(e.changeover, e.line)); }
  out.push(leanHead('Action plan'));
  out.push(...leanActions(page.actions, page.actionsEmpty));
  out.push(leanClosing(page.closing));
  if (s.receipt?.text && s.closedAt) out.push(text({ text: `Closed: ${s.receipt.text}`, size: 8, colour: MUTED, before: 2, after: 2 }));
  return out;
}

/** A CAPABILITY STUDY, WORK SAMPLING OR A VALUE STREAM AS THE LEAN PAGE
 *  (slice 6) — the band with its verdict, the tiles its page shows, what it
 *  says, its own table, the action plan and the closing line, from the same
 *  builders the page reads (lib/ie/sampleLean, samplingLean, flowLean). */
function studyLeanBlocks(p: StudiesPaper, item: StudyPaperItem, d: Density): Block[] {
  const { s, where } = item;
  const e = studyEvidence(s, [], p.standards, p.ctx);
  const raised = raisedFrom(s, p.records?.actions ?? [], p.records?.fixes ?? []);
  let eyebrow = 'Study', verdict: { text: string; tone: string } | undefined, tiles: LeanTile[] = [], closing: { text: string; tone: LeanTone } = { text: e.line, tone: 'n' };
  let body: Block[] = [];
  if (s.tool === 'capability' && s.agreed?.readings) {
    const a = s.agreed.readings, f = sample(a, s.facts.readings ?? []), said = sampleSays(f, a);
    eyebrow = 'Capability study'; verdict = { text: said.verdict, tone: said.tone }; tiles = sampleTiles(f, a, said); closing = sampleClosing(f, a, said);
    body = capabilityBlocks(s);
  } else if (s.tool === 'sampling' && s.agreed?.sampling) {
    const a = s.agreed.sampling, taps = s.facts.taps ?? [], said = samplingSays(a, taps);
    const rate = personRate(p.ctx?.workspaces?.find(w => w.id === s.workspaceId));
    eyebrow = a.walk ? 'Bottleneck walk' : 'Work sampling'; verdict = { text: said.verdict, tone: said.tone };
    tiles = samplingTiles(a, taps, momentsAt(a, taps, Date.now()), rate); closing = samplingClosing(a, taps, said, rate);
    body = e.sampling ? samplingBlocks(e.sampling) : [];
  } else if (s.tool === 'map') {
    const list = s.facts.flow ?? [], f = flowFigures(list, s.agreed?.map);
    eyebrow = 'Value stream map'; verdict = { text: f.steps ? `${f.untimed ? '≥ ' : ''}${dur(f.leadSec)} lead time` : 'No steps yet', tone: f.longestCycle?.overTakt ? 'r' : 'n' };
    tiles = flowTiles(f, list); closing = flowClosing(f, s.agreed?.map);
    body = e.stream ? streamBlocks(e.stream.rows, e.stream.total) : [];
  }
  const out: Block[] = [leanBand(bandPage(eyebrow, s, verdict?.text, verdict?.tone), p.printed)];
  out.push(text({ text: `${where}${s.uses.length ? ` · used for ${s.uses.length} record${s.uses.length === 1 ? '' : 's'} on its job` : ''}`, size: 8, colour: MUTED, after: gap(d, 's') }));
  if (tiles.length) out.push(leanTiles(tiles));
  out.push(leanHead('What it says'));
  out.push(text({ text: e.line, size: 9, colour: e.tone === 'r' ? DANGER : INK2, after: gap(d, 's') }));
  out.push(...body);
  out.push(leanHead('Action plan'));
  out.push(...leanActions(raised, 'Nothing raised from it yet.'));
  out.push(leanClosing(closing));
  if (s.receipt?.text && s.closedAt) out.push(text({ text: `Closed: ${s.receipt.text}`, size: 8, colour: MUTED, before: 2, after: 2 }));
  return out;
}

function blocksOf(p: StudiesPaper, d: Density): Block[] {
  if (p.lean && p.items.length === 1 && p.items[0].s.tool === 'losses') return lossLeanBlocks(p, p.items[0], d);
  if (p.lean && p.items.length === 1 && ['capability', 'sampling', 'map'].includes(p.items[0].s.tool)) return studyLeanBlocks(p, p.items[0], d);
  if (p.lean && p.items.length === 1 && p.items[0].s.tool === 'changeover') return smedLeanBlocks(p, p.items[0], d);
  const out: Block[] = [];
  out.push(text({ text: p.items.length === 1 ? 'A STUDY · MEASURED BY PEOPLE AT THE LINE' : `${p.items.length} STUDIES · MEASURED BY PEOPLE AT THE LINE`, size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: p.title, size: SIZE.title, style: 'bold', after: 4 }));
  out.push(text({ text: `Printed ${p.printed}`, colour: MUTED, after: gap(d, 'm') }));
  if (!p.items.length) out.push(text({ text: 'No studies here yet.', colour: MUTED }));
  p.items.forEach(({ s, where }, i) => {
    const e = studyEvidence(s, [], p.standards, p.ctx);
    out.push(text({ text: e.title, size: SIZE.h2, style: 'bold', before: i ? gap(d, 'l') : 0, after: 2 }));
    out.push(text({ text: where, size: 8, colour: MUTED, after: 1 }));
    if (s.uses.length) out.push(text({ text: `Used for: ${s.uses.length} record${s.uses.length === 1 ? '' : 's'} on its job`, size: 8, colour: MUTED, after: 1 }));
    out.push(text({ text: e.line, size: 9.5, colour: e.tone === 'r' ? DANGER : INK2, after: 6 }));
    if (s.tool === 'capability') out.push(...capabilityBlocks(s));
    if (e.stream) out.push(...streamBlocks(e.stream.rows, e.stream.total));
    if (e.changeover) out.push(...changeoverBlocks(e.changeover, e.line));
    if (e.losses) out.push(...lossBlocks(e.losses));
    if (e.sampling) out.push(...samplingBlocks(e.sampling));
    /* THE LINE BALANCE — each person's work against takt, and what the
       bottleneck costs a pack and a minute (lib/report/balanceTable) */
    if (s.tool === 'balance') {
      const st = p.standards.find(x => x.id === s.standardId), cap = st?.capacity;
      const f = balance(s.facts.steps, agreedFor(s.agreed?.balance, cap, !!s.closedAt), crewKept(s.facts.crew ?? [], cap));
      const line = p.ctx?.workspaces?.find(w => w.id === s.workspaceId);
      const cost = balanceCost(f, costInputs(cap, line));
      const unit = cap?.stations[0]?.unit.trim() || undefined;
      out.push(...balanceBlocks(f, { ...(cost ? { cost } : {}), ...(unit ? { unit } : {}) }));
    }
    if (s.receipt?.text && s.closedAt) out.push(text({ text: `Closed: ${s.receipt.text}`, size: 8, colour: MUTED, before: 2, after: 2 }));
  });
  return out;
}

/** Draw the studies into `doc` (A4 portrait), every page footed. */
export async function drawStudies(doc: jsPDF, p: StudiesPaper): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => blocksOf(p, d));
  await pour({ ...base, density, dry: false }, blocksOf(p, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    const foot = wrap(doc, `${p.title}  ·  ${p.printed}`, CW - 60, 7.5)[0] ?? '';
    doc.text(foot, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

/** Make the PDF and hand it over — the study's page and a list's "PDF" both. */
export async function saveStudiesPdf(p: StudiesPaper, fileWhat: string): Promise<void> {
  const { loadPdfLib, deliverPdf } = await import('./savePdf');
  const { pdfFileName } = await import('./fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  await drawStudies(doc, p);
  await deliverPdf(doc, pdfFileName(fileWhat, 'report', todayISO()));
}
