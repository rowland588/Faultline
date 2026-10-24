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
import { checksSay, goodWord, pctWord, ruleWords, sample, sampleLines, sampleSays, CPK_FROM, type SampleFigures } from '../tools/capability/sample';
import { fewerThan } from './ie/dist';
import type { AgreedReadings } from './study';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, font, gap, label, rows, text, wrap } from './report/blocks';
import { streamBlocks } from './report/streamTable';
import { changeoverBlocks } from './report/changeoverTable';
import { agreedFor as agreedForChangeover, changeoverSays, extrapolationSays, figuresOf, ladderOf, moneyOf } from '../tools/changeover/changeover';
import { smedLean } from '../tools/changeover/changeoverLean';
import { sampleClosing, sampleTiles } from '../tools/capability/sampleLean';
import { momentsAt, personRate, samplingClosing, samplingTiles } from '../tools/sampling/samplingLean';
import { flowClosing, flowTiles } from '../tools/valuestream/flowLean';
import { samplingSays } from '../tools/sampling/sampling';
import { dur, flowFigures } from '../tools/valuestream/steps';
import { bandPage, type LeanTile, type LeanTone } from './lean';
import { lossBlocks, lossFallBlock } from './report/lossTable';
import { boxed, leanActions, leanBand, leanClosing, leanHead, leanInsights, leanTiles, leanTrend, pair, stack } from './report/lean';
import { lossFiguresOf } from './studyLinks';
import { lossSays } from '../tools/losses/losses';
import { lossLean, lossPart, raisedFrom } from '../tools/losses/lossLean';
import type { ActionLike, FixLike } from './lean';
import { samplingBlocks } from './report/samplingTable';
import { balanceBlocks } from './report/balanceTable';
import { balance } from './ie/balance';
import { agreedFor, balanceCost, costInputs, crewKept } from './ie/balanceLink';
import { costWords, countTitle, relAll, relCost, reliabilityInsights, reliabilitySays, relRows, studyReliabilitySays, type RelItem } from '../tools/reliability/reliability';
import { relClosings, relTiles, relTrend } from '../tools/reliability/reliabilityLean';
import { relChartBlock, relDaysBlocks, relKindsBlocks, relTogetherBlocks, remarksBlocks } from './report/reliabilityTable';

import { todayISO } from './weeks';
const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', BRAND = '#0c7489', DANGER = '#c4281c', AMBER = '#b45309', BAR = '#c3cfcf';

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

/** A row of figures across the page — the strip as the paper draws it. */
function cellsRow(cells: [string, string, boolean?][]): Block {
  return rows({ rows: [{
    h: () => 30,
    draw: (fr: Frame, y: number) => {
      const cw = fr.w / cells.length;
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.5); fr.doc.line(fr.x, y, fr.x + fr.w, y); fr.doc.line(fr.x, y + 28, fr.x + fr.w, y + 28);
      cells.forEach(([k, v, red], i) => {
        font(fr.doc, 7, 'bold', MUTED); fr.doc.text(k.toUpperCase(), fr.x + i * cw, y + 10);
        font(fr.doc, 10, 'bold', red ? DANGER : INK2); fr.doc.text(v, fr.x + i * cw, y + 23);
      });
    },
  }], after: 's' });
}

/** Every reading in the order taken, ten to a row: its number, and what it
 *  was — a value, or good / failed — the abnormal in red, struck said. */
function readingsRows(s: ToolStudy, word: (r: NonNullable<ToolStudy['facts']['readings']>[number]) => string, red: (id: string, r: NonNullable<ToolStudy['facts']['readings']>[number]) => boolean): Block {
  const all = (s.facts.readings ?? []).map((r, i) => ({ no: i + 1, r }));
  const out10: typeof all[] = [];
  for (let i = 0; i < all.length; i += 10) out10.push(all.slice(i, i + 10));
  return rows({
    rows: out10.map(row => ({
      h: () => 15,
      draw: (fr: Frame, y: number) => {
        const cw = fr.w / 10;
        row.forEach(({ no, r }, i) => {
          const v = word(r), struck = !!r.struck, isRed = !struck && red(r.id, r);
          font(fr.doc, 6.5, 'normal', MUTED); fr.doc.text(String(no), fr.x + i * cw, y + 10);
          font(fr.doc, 8.5, isRed ? 'bold' : 'normal', struck ? MUTED : isRed ? DANGER : INK2);
          fr.doc.text(struck ? `${v} struck` : v, fr.x + i * cw + 12, y + 10);
        });
      },
    })),
    after: 'm',
  });
}

/** THE HISTOGRAM ON PAPER — the bars the page draws (lib/ie/sample hist),
 *  the limits and the target as lines, a bar holding a reading outside in red. */
function histBlock(f: SampleFigures, a: AgreedReadings): Block | undefined {
  const h = f.hist;
  if (!h || f.n < 2) return undefined;
  const lines = sampleLines(f, a);
  const lo = h.edges[0], hi = h.edges[h.edges.length - 1], top = Math.max(...h.counts, 1);
  const dp = Math.max(f.dp, h.width < 1 ? Math.min(3, Math.ceil(-Math.log10(h.width))) : 0);
  const HT = 104, T = 16, B = 14;
  return rows({ rows: [{
    h: () => HT,
    draw: (fr: Frame, y: number) => {
      const x = (v: number) => fr.x + ((v - lo) / (hi - lo)) * fr.w;
      const base = y + HT - B, yc = (c: number) => base - (c / top) * (HT - T - B);
      h.counts.forEach((c, i) => {
        const x0 = x(h.edges[i]) + 0.8, w = Math.max(0.6, x(h.edges[i + 1]) - x(h.edges[i]) - 1.6);
        if (c > 0) {
          fr.doc.setFillColor(h.out[i] ? DANGER : BAR); fr.doc.rect(x0, yc(c), w, base - yc(c), 'F');
          font(fr.doc, 6.5, 'bold', INK2); fr.doc.text(String(c), x0 + w / 2, yc(c) - 2, { align: 'center' });
        }
      });
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.6); fr.doc.line(fr.x, base, fr.x + fr.w, base);
      for (const l of lines) {
        const lx = x(l.v);
        fr.doc.setDrawColor(l.kind === 'lim' ? INK2 : MUTED); fr.doc.setLineWidth(l.kind === 'lim' ? 1 : 0.7);
        if (l.kind === 'nom') fr.doc.setLineDashPattern([1.5, 2.5], 0);
        fr.doc.line(lx, y + T - 4, lx, base);
        fr.doc.setLineDashPattern([], 0);
        font(fr.doc, 6.5, 'bold', MUTED);
        fr.doc.text(l.label, lx, y + T - 7, { align: lx > fr.x + fr.w - 50 ? 'right' : lx < fr.x + 50 ? 'left' : 'center' });
      }
      font(fr.doc, 6.5, 'normal', MUTED);
      fr.doc.text(`${lo.toFixed(dp)}${a.unit ? ` ${a.unit}` : ''}`, fr.x, base + 10);
      fr.doc.text(hi.toFixed(dp), fr.x + fr.w, base + 10, { align: 'right' });
    },
  }], after: 'm' });
}

/** A CAPABILITY STUDY'S FIGURES AND READINGS — the strip as a row; a
 *  measurement's checks before capability and its histogram; then every
 *  reading in the order taken, ten to a row, struck ones said so. Pass or
 *  fail: checked, failed, allowed and what it proves, then each one good or
 *  failed by its number (knowledge/specs/FC-094-capability.md §7). */
function capabilityBlocks(s: ToolStudy): Block[] {
  const a = s.agreed?.readings;
  if (!a) return [];
  const f = sample(a, s.facts.readings ?? []);
  if (!f.n) return [];
  if (a.kind === 'ticks' && f.ticks) {
    const t = f.ticks, bad = new Set(t.bad.map(b => b.id));
    return [
      /* the rule beside how many may fail, and what the count proves with its confidence (part 1b) */
      cellsRow([['Checked', `${f.n.toLocaleString('en-GB')} of ${f.count.toLocaleString('en-GB')}`], ['Failed', t.bad.length.toLocaleString('en-GB'), t.bad.length > t.allowFail],
        ['May fail', `${t.allowFail > 0 ? t.allowFail.toLocaleString('en-GB') : 'none'}${ruleWords(t).replace(/^ for /, ' — ')}`],
        [`${pctWord(t.conf)} confident`, t.proves >= 0.995 ? 'nothing yet' : t.judge === 'count' ? `${fewerThan(t.proves)} fail` : `at least ${goodWord(1 - t.proves)} good`]]),
      label('Each one, in the order checked'),
      readingsRows(s, r => (r.ok === true ? 'good' : r.ok === false ? 'failed' : '—'), id => bad.has(id)),
    ];
  }
  const unit = a.unit ? ` ${a.unit}` : '';
  const fx = (v?: number) => (v === undefined ? '—' : v.toFixed(f.dp));
  const enough = f.n >= CPK_FROM;
  const out: Block[] = [cellsRow([
    ['Readings', `${f.n} of ${f.count}`], ['Mean', `${fx(f.mean)}${unit}`], ['Range', `${fx(f.min)}–${fx(f.max)}`],
    ['Outside', String(f.outside.length), f.outside.length > 0],
    ['Ppk', enough && f.ppk !== undefined && Number.isFinite(f.ppk) ? f.ppk.toFixed(2) : 'too few'],
    ['95% sure', f.ppkLow !== undefined ? `at least ${f.ppkLow.toFixed(2)}` : '—'],
    ['Cpk', enough && f.cpk !== undefined && Number.isFinite(f.cpk) ? f.cpk.toFixed(2) : 'too few'],
  ])];
  /* before capability — the three checks, the abnormal in amber */
  const checks = checksSay(f, a);
  if (checks.length) {
    out.push(label('Before capability'));
    checks.forEach((c, i) => out.push(text({ text: c.text, size: 8.5, style: c.tone === 'a' ? 'bold' : 'normal', colour: c.tone === 'a' ? AMBER : INK2, after: i === checks.length - 1 ? 8 : 2 })));
  }
  const hist = histBlock(f, a);
  if (hist) { out.push(label('How the readings spread')); out.push(hist); }
  /* every reading, in the order taken — outside in red, struck said */
  const outsideIds = new Set(f.outside.map(o => o.id));
  out.push(label('The readings, in the order taken'));
  out.push(readingsRows(s, r => (typeof r.value === 'number' ? r.value.toFixed(f.dp) : '—'), id => outsideIds.has(id)));
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
  out.push(text({ text: `${where}${s.uses.length ? ` · used for ${s.uses.length} record${s.uses.length === 1 ? '' : 's'} on its project` : ''}`, size: 8, colour: MUTED, after: gap(d, 's') }));
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
  out.push(text({ text: `${where}${s.uses.length ? ` · used for ${s.uses.length} record${s.uses.length === 1 ? '' : 's'} on its project` : ''}`, size: 8, colour: MUTED, after: gap(d, 's') }));
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
  } else if (s.tool === 'reliability' && s.agreed?.reliability) {
    /* every thing counted: one count's tiles at the top as its page has them;
       several, counted side by side and then each one's own section */
    const items = relAll(s.agreed.reliability, s.facts.watch, s.facts.events), said = studyReliabilitySays(s.agreed.reliability, s.facts.watch, s.facts.events);
    const line = p.ctx?.workspaces?.find(w => w.id === s.workspaceId) as Parameters<typeof relCost>[2] | undefined;
    eyebrow = 'Reliability study'; verdict = { text: said.verdict, tone: said.tone };
    if (items.length === 1) tiles = relTiles(items[0].c, items[0].f, relCost(items[0].f, items[0].c, line));
    closing = relClosings(items, line);
    body = reliabilityBlocks(s, items, line);
  } else if (s.tool === 'map') {
    const list = s.facts.flow ?? [], f = flowFigures(list, s.agreed?.map);
    eyebrow = 'Value stream map'; verdict = { text: f.steps ? `${f.untimed ? '≥ ' : ''}${dur(f.leadSec)} lead time` : 'No steps yet', tone: f.longestCycle?.overTakt ? 'r' : 'n' };
    tiles = flowTiles(f, list); closing = flowClosing(f, s.agreed?.map);
    body = e.stream ? streamBlocks(e.stream.rows, e.stream.total) : [];
  }
  const out: Block[] = [leanBand(bandPage(eyebrow, s, verdict?.text, verdict?.tone), p.printed)];
  out.push(text({ text: `${where}${s.uses.length ? ` · used for ${s.uses.length} record${s.uses.length === 1 ? '' : 's'} on its project` : ''}`, size: 8, colour: MUTED, after: gap(d, 's') }));
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

/** A RELIABILITY STUDY'S OWN PARTS (lib/report/reliabilityTable), as its
 *  page shows them: several things counted side by side first; then each
 *  one's — its tiles when there are several, what it means, its taps against
 *  watched hours, its MTBF day by day, what they were (a study set up before
 *  22 October), what it costs and its days; then the commentary. */
function reliabilityBlocks(s: ToolStudy, items: RelItem[], line?: Parameters<typeof relCost>[2]): Block[] {
  const out: Block[] = [];
  const many = items.length > 1;
  if (many) { out.push(leanHead('Counted side by side')); out.push(...relTogetherBlocks(relRows(items, line))); }
  for (const { c, f } of items) {
    if (many) {
      out.push(leanHead(countTitle(c)));
      out.push(leanTiles(relTiles(c, f, relCost(f, c, line))));
      out.push(text({ text: reliabilitySays(c, f).text, size: 9, colour: INK2, after: 4 }));
    }
    const ins = reliabilityInsights(c, f);
    if (ins.length) out.push(...leanInsights(ins));
    const chart = relChartBlock(f, c.event);
    if (chart) { out.push(leanHead(`${countTitle(c)} against watched hours`)); out.push(chart); }
    const trend = relTrend(c, f);
    if (trend) { out.push(leanHead(many ? `${countTitle(c)} — MTBF, day by day` : trend.title)); out.push(leanTrend(trend)); }
    if (f.kinds.length) { out.push(leanHead('What they were')); out.push(...relKindsBlocks(f)); }
    const cost = relCost(f, c, line);
    if (cost.downMinPerH !== undefined) out.push(text({ text: `What it costs: ${costWords(cost)}.`, size: 8.5, colour: INK2, after: 4 }));
    else if (f.rate !== undefined && cost.missing.length) out.push(text({ text: `What it costs is said once given: ${cost.missing.join('; ')}.`, size: 8, colour: MUTED, after: 4 }));
    if (f.days.length) { out.push(leanHead(many ? `${countTitle(c)} — day by day` : 'Day by day')); out.push(...relDaysBlocks(f, countTitle(c))); }
  }
  out.push(leanHead('Commentary'));
  out.push(...remarksBlocks(s.facts.remarks));
  return out;
}

/** ONE STUDY'S BLOCKS as its own paper prints them — its title, where it sits,
 *  its sentence, then its table and figures by tool. The combined line report
 *  (lib/lineBundlePdf) prints each tool's section with these, so the two
 *  papers can never disagree. `i` > 0 opens a gap before it. */
export function studyBlocks(p: StudiesPaper, { s, where }: StudyPaperItem, i: number, d: Density = 'comfortable'): Block[] {
  const out: Block[] = [];
  const e = studyEvidence(s, [], p.standards, p.ctx);
  out.push(text({ text: e.title, size: SIZE.h2, style: 'bold', before: i ? gap(d, 'l') : 0, after: 2 }));
  out.push(text({ text: where, size: 8, colour: MUTED, after: 1 }));
  if (s.uses.length) out.push(text({ text: `Used for: ${s.uses.length} record${s.uses.length === 1 ? '' : 's'} on its project`, size: 8, colour: MUTED, after: 1 }));
  out.push(text({ text: e.line, size: 9.5, colour: e.tone === 'r' ? DANGER : INK2, after: 6 }));
  if (s.tool === 'capability') out.push(...capabilityBlocks(s));
  if (e.stream) out.push(...streamBlocks(e.stream.rows, e.stream.total));
  if (e.changeover) out.push(...changeoverBlocks(e.changeover, e.line));
  if (e.losses) out.push(...lossBlocks(e.losses));
  if (e.sampling) out.push(...samplingBlocks(e.sampling));
  /* A RELIABILITY STUDY — its own parts, as on its own paper */
  if (s.tool === 'reliability' && s.agreed?.reliability) {
    out.push(...reliabilityBlocks(s, relAll(s.agreed.reliability, s.facts.watch, s.facts.events), p.ctx?.workspaces?.find(w => w.id === s.workspaceId) as Parameters<typeof relCost>[2] | undefined));
  }
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
  return out;
}

function blocksOf(p: StudiesPaper, d: Density): Block[] {
  if (p.lean && p.items.length === 1 && p.items[0].s.tool === 'losses') return lossLeanBlocks(p, p.items[0], d);
  if (p.lean && p.items.length === 1 && ['capability', 'sampling', 'map', 'reliability'].includes(p.items[0].s.tool)) return studyLeanBlocks(p, p.items[0], d);
  if (p.lean && p.items.length === 1 && p.items[0].s.tool === 'changeover') return smedLeanBlocks(p, p.items[0], d);
  const out: Block[] = [];
  out.push(text({ text: p.items.length === 1 ? 'A STUDY · MEASURED BY PEOPLE AT THE LINE' : `${p.items.length} STUDIES · MEASURED BY PEOPLE AT THE LINE`, size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: p.title, size: SIZE.title, style: 'bold', after: 4 }));
  out.push(text({ text: `Printed ${p.printed}`, colour: MUTED, after: gap(d, 'm') }));
  if (!p.items.length) out.push(text({ text: 'No studies here yet.', colour: MUTED }));
  p.items.forEach((item, i) => out.push(...studyBlocks(p, item, i)));
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
