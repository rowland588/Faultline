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
import type { Standard } from '../tools/linestandard/standard';
import type { StudyContext } from './studyLinks';
import { studyEvidence } from './clientReport';
import { checksSay, goodWord, pctWord, ruleWords, sample, sampleLines, sampleSays, CPK_FROM, type SampleFigures, fateOf, fateWord, moneySays, sampleMoney, modeNotes, spreadSays } from '../tools/capability/sample';
import { shareWords, type RunsFigures, type FaultsFigures, type RateFigures } from '../tools/capability/modes';
import { fewerThan } from './ie/dist';
import type { AgreedReadings } from './study';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, font, gap, label, rows, text, wrap } from './report/blocks';
import { streamBlocks } from './report/streamTable';
import { changeoverBlocks } from './report/changeoverTable';
import { agreedFor as agreedForChangeover, mustComeIn, changeoverSays, extrapolationSays, figuresOf, ladderOf, moneyOf } from '../tools/changeover/changeover';
import { smedLean } from '../tools/changeover/changeoverLean';
import { sampleClosing, sampleTiles } from '../tools/capability/sampleLean';
import { momentsAt, personRate, samplingClosing, samplingTiles } from '../tools/sampling/samplingLean';
import { flowClosing, flowMoneyTiles, flowTiles } from '../tools/valuestream/flowLean';
import { samplingSays } from '../tools/sampling/sampling';
import { dur, flowFigures, flowMoney, flowMoneySays } from '../tools/valuestream/steps';
import { bandPage, type LeanTile, type LeanTone } from './lean';
import { lossBlocks, lossFallBlock } from './report/lossTable';
import { boxed, leanActions, leanBand, leanClosing, leanHead, leanInsights, leanTiles, leanTrend, pair, stack } from './report/lean';
import { lossFiguresOf } from './studyLinks';
import { lossSays } from '../tools/losses/losses';
import { lossLean, lossPart, raisedFrom } from '../tools/losses/lossLean';
import type { ActionLike, FixLike } from './lean';
import { samplingBlocks } from './report/samplingTable';
import { balanceBlocks } from './report/balanceTable';
import { lineworkBlocks } from './report/timeTable';
import { balance } from '../tools/linework/balance';
import { agreedFor, balanceCost, costInputs, crewKept } from '../tools/linework/balanceLink';
import { costWords, countTitle, relAll, relCost, reliabilityInsights, reliabilitySays, relRows, studyReliabilitySays, waitCost, waitWords, type RelItem } from '../tools/reliability/reliability';
import { callsByShift, fitterCost } from '../tools/reliability/repair';
import { wearOf } from '../tools/reliability/wear';
import { weibullTiles } from '../tools/reliability/weibull';
import { gbp as relGbp } from '../tools/reliability/words';
import { lineDay } from './lineLoss';
import { callBlocks, growthBlocks, repairBlocks, wearBlocks } from './report/reliabilityMore';
import { relClosings, relTiles, relTrend } from '../tools/reliability/reliabilityLean';
import { overTime, overTimeSays } from '../tools/capability/overTime';
import { analysisClosing, analysisFigures, analysisGrids, analysisPicture, analysisPlot, analysisSays, analysisTiles, confidenceOf, KIND_WORDS, pSay as anP, pctWord as anPct, type Plot, type PicRow } from '../tools/analysis/analysis';
import { chartClosing, chartFigures, chartSays, chartTiles, type ChartFigures } from '../tools/chart/chart';
import { neckOf } from './lineLoss';
import { calcPaperParts } from './report/calcPaper';
import { scoredPaperBlocks } from './report/scoredPaper';
import { boardPaperBlocks } from './report/boardPaper';
import { scoredSays, scoredTitle, studyScored } from '../tools/scored/scored';
import { boardSays, boardTitle, studyBoard } from '../tools/board/board';
import { logBodyBlocks, logPaperBlocks, paperInput } from '../tools/checks/checksPaper';
import { ctxFrom } from '../tools/checks/ctx';
import { defOf } from '../tools/checks/registry';
import type { Snag } from '../snag/types';
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
  /** The register's problems — a check log's action plan and its problems' state (src/tools/checks). */
  snags?: Snag[];
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
function readingsRows(s: ToolStudy, word: (r: NonNullable<ToolStudy['facts']['readings']>[number]) => string, red: (id: string, r: NonNullable<ToolStudy['facts']['readings']>[number]) => boolean, per = 10): Block {
  const all = (s.facts.readings ?? []).map((r, i) => ({ no: i + 1, r }));
  const out10: typeof all[] = [];
  for (let i = 0; i < all.length; i += per) out10.push(all.slice(i, i + per));
  return rows({
    rows: out10.map(row => ({
      h: () => 15,
      draw: (fr: Frame, y: number) => {
        const cw = fr.w / per;
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
      /* a failed item by what became of it (FC-156) */
      readingsRows(s, r => (r.ok === true ? 'good' : r.ok === false ? (r.struck ? 'failed' : `failed · ${fateWord(fateOf(r))}`) : '—'), id => bad.has(id)),
    ];
  }
  /* W1 — the modes (knowledge/specs/FC-094-capability.md parts 2–4): rejects, faults, a rate — the cells,
     the runs' table, the chart, the tally */
  if (a.kind === 'rejects' && f.runs) return runsBlocks(f.runs, f, a);
  if (a.kind === 'faults' && f.faults) return faultsBlocks(f.faults, f, a);
  if (a.kind === 'rate' && f.rate) return rateBlocks(f.rate, f, a);
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
  /* W1 — machine capability and the lowest legal fill, beside the checks */
  for (const nt of modeNotes(f, a)) out.push(text({ text: nt.text, size: 8.5, style: nt.tone === 'r' || nt.tone === 'a' ? 'bold' : 'normal', colour: nt.tone === 'r' ? DANGER : nt.tone === 'a' ? AMBER : INK2, after: 6 }));
  /* a weigher's heads (FC-158): each head's readings, mean and spread, and how far from the others */
  if (f.weigher && f.weigher.heads.length >= 2) {
    const w = f.weigher, u = a.unit ? ` ${a.unit}` : '';
    out.push(label('By head'));
    out.push(tableBlock(['Head', 'Readings', 'Mean', 'Spread (s)', 'Against the others'], w.heads.map(h => {
      const rest = w.heads.filter(o => o !== h), others = rest.reduce((t, o) => t + o.mean, 0) / rest.length, d = h.mean - others;
      return [String(h.head), String(h.n), `${h.mean.toFixed(f.dp)}${u}`, h.n >= 2 ? h.sd.toFixed(f.dp + 1) : '—', `${d >= 0 ? '+' : '−'}${Math.abs(d).toFixed(f.dp)}${u}`];
    }), [0.12, 0.16, 0.22, 0.22, 0.28], i => w.far?.head === w.heads[i].head && (w.anova?.p ?? 1) < 0.05));
  }
  const hist = histBlock(f, a);
  if (hist) { out.push(label('How the readings spread')); out.push(hist); const sp = spreadSays(f, a.unit); if (sp) out.push(text({ text: sp, size: 8, colour: MUTED, after: 4 })); }
  /* every reading, in the order taken — outside in red, struck said */
  const outsideIds = new Set(f.outside.map(o => o.id));
  out.push(label('The readings, in the order taken'));
  out.push(readingsRows(s, r => (typeof r.value === 'number' ? `${r.value.toFixed(f.dp)}${a.question === 'weigher' && r.head !== undefined ? ` H${r.head}` : ''}` : '—'), id => outsideIds.has(id)));
  return out;
}

/* ---- W1: the modes on paper (tools/capability/modes) ---- */
const num = (v: number) => v.toLocaleString('en-GB');
/** A small table: a header row and one row per entry, the columns' widths as shares of the frame. */
function tableBlock(header: string[], body: string[][], shares: number[], redRow?: (i: number) => boolean): Block {
  const row = (cells: string[], bold: boolean, red = false): Parameters<typeof rows>[0]['rows'][number] => ({
    h: () => 13,
    draw: (fr: Frame, y: number) => {
      let x = fr.x;
      cells.forEach((c, i) => { font(fr.doc, 7.5, bold ? 'bold' : 'normal', bold ? MUTED : red ? DANGER : INK2); fr.doc.text(c, x, y + 9); x += fr.w * shares[i]; });
      if (bold) { fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4); fr.doc.line(fr.x, y + 12, fr.x + fr.w, y + 12); }
    },
  });
  return rows({ header: row(header, true), rows: body.map((b, i) => row(b, false, redRow?.(i) ?? false)), after: 'm' });
}
/** A table whose cells wrap inside their columns, a row as tall as its longest cell — for names and words that are not short. */
function wrapTable(header: string[], body: string[][], shares: number[], redRow?: (i: number) => boolean): Block {
  const LH = 9;
  const lines = (f: Frame, cells: string[], bold: boolean) => cells.map((c, i) => { font(f.doc, 7.5, bold ? 'bold' : 'normal', INK2); return wrap(f.doc, c, f.w * shares[i] - 6, 7.5); });
  const row = (cells: string[], bold: boolean, red = false): Parameters<typeof rows>[0]['rows'][number] => ({
    h: (f: Frame) => Math.max(...lines(f, cells, bold).map(l => l.length)) * LH + 4,
    draw: (fr: Frame, y: number) => {
      let x = fr.x;
      lines(fr, cells, bold).forEach((ls, i) => { font(fr.doc, 7.5, bold ? 'bold' : 'normal', bold ? MUTED : red ? DANGER : INK2); ls.forEach((l, k) => fr.doc.text(l, x, y + 8 + k * LH)); x += fr.w * shares[i]; });
      if (bold) { fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4); const h = Math.max(...lines(fr, cells, bold).map(l => l.length)) * LH + 2; fr.doc.line(fr.x, y + h, fr.x + fr.w, y + h); }
    },
  });
  return rows({ header: row(header, true), rows: body.map((b, i) => row(b, false, redRow?.(i) ?? false)), after: 'm' });
}
/** Bars against limits — a run, an inspection or an interval a bar; a line for the centre and one for the maximum. */
function barsBlock(bars: { v: number; out?: boolean; miss?: boolean; lo?: number; hi?: number }[], lines: { v: number; label: string; red?: boolean }[], fmt: (v: number) => string): Block {
  const top = Math.max(...bars.map(b => Math.max(b.v, b.hi ?? 0)), ...lines.map(l => l.v), 1e-9) * 1.12, HB = 110;
  return rows({ rows: [{
    h: () => HB + 14,
    draw: (fr: Frame, y: number) => {
      const x0 = fr.x + 40, w = fr.w - 40, bw = w / Math.max(bars.length, 1);
      const yy = (v: number) => y + 6 + (1 - v / top) * (HB - 12);
      bars.forEach((b, i) => {
        fr.doc.setFillColor(b.out ? DANGER : b.miss ? AMBER : BRAND); fr.doc.rect(x0 + i * bw + 1, yy(b.v), Math.max(1, bw - 2), y + 6 + HB - 12 - yy(b.v), 'F');
        if (b.hi !== undefined) { fr.doc.setDrawColor(INK2); fr.doc.setLineWidth(0.5); fr.doc.line(x0 + i * bw + 1, yy(b.hi), x0 + (i + 1) * bw - 1, yy(b.hi)); }
        if (bars.length <= 30) { font(fr.doc, 6, 'normal', MUTED); fr.doc.text(String(i + 1), x0 + i * bw + bw / 2, y + HB + 8, { align: 'center' }); }
      });
      for (const l of lines) {
        fr.doc.setDrawColor(l.red ? DANGER : INK2); fr.doc.setLineWidth(l.red ? 0.8 : 0.5); fr.doc.line(x0, yy(l.v), fr.x + fr.w, yy(l.v));
        font(fr.doc, 6.5, 'normal', l.red ? DANGER : MUTED); fr.doc.text(`${l.label} ${fmt(l.v)}`, fr.x, yy(l.v) + 2);
      }
      fr.doc.setDrawColor(LINE); fr.doc.line(x0, y + 6 + HB - 12, fr.x + fr.w, y + 6 + HB - 12);
    },
  }], after: 'm' });
}
/* ================== THE CONTROL CHART (W2, knowledge/specs/FC-086-charts.md) ================== */
/** The points in order against their lines — the chart as the page draws it: the limits dashed, the spec
 *  limits and the centre, a point beyond a limit in red, a point in a signal in amber, the changeover
 *  boundary marked. */
function pointsBlock(f: ChartFigures, lines: { v: number; label: string; red?: boolean; dash?: boolean }[], fmt: (v: number) => string): Block {
  const pts = f.points, HB = 130, slots = Math.max(pts.length, 20);
  const ys = [...pts.map(p => p.y), ...lines.map(l => l.v)];
  let lo = Math.min(...ys), hi = Math.max(...ys); const sp = Math.max(hi - lo, Math.abs(hi) * 0.002, 1e-9); lo -= sp * 0.1; hi += sp * 0.1;
  return rows({ rows: [{
    h: () => HB + 14,
    draw: (fr: Frame, y: number) => {
      const x0 = fr.x + 6, w = fr.w - 84, yy = (v: number) => y + 6 + (1 - (v - lo) / (hi - lo)) * (HB - 12), xx = (i: number) => x0 + (i / (slots - 1)) * w;
      for (const l of lines) {
        fr.doc.setDrawColor(l.red ? DANGER : INK2); fr.doc.setLineWidth(l.red ? 0.8 : 0.5);
        if (l.dash) fr.doc.setLineDashPattern([2, 2], 0); else fr.doc.setLineDashPattern([], 0);
        fr.doc.line(x0, yy(l.v), x0 + w, yy(l.v)); fr.doc.setLineDashPattern([], 0);
        font(fr.doc, 6.5, 'normal', l.red ? DANGER : MUTED); fr.doc.text(`${l.label} ${fmt(l.v)}`, x0 + w + 4, yy(l.v) + 2);
      }
      for (const b of f.shortRun?.boundaries ?? []) { const bx = (xx(b - 2) + xx(b - 1)) / 2; fr.doc.setDrawColor(LINE); fr.doc.line(bx, y + 6, bx, y + HB - 6); font(fr.doc, 6, 'normal', MUTED); fr.doc.text(pts[b - 1]?.product ?? '', bx + 2, y + 10); }
      pts.forEach((p, i) => {
        fr.doc.setFillColor(p.state === 'beyond' ? DANGER : p.state === 'signal' ? AMBER : INK2); fr.doc.circle(xx(i), yy(p.y), p.state === 'in' ? 1.5 : 2.2, 'F');
        if (pts.length <= 30) { font(fr.doc, 6, 'normal', MUTED); fr.doc.text(String(p.no), xx(i), y + HB + 8, { align: 'center' }); }
      });
      fr.doc.setDrawColor(LINE); fr.doc.line(x0, y + HB - 6, x0 + w, y + HB - 6);
    },
  }], after: 'm' });
}
function chartBlocks(s: ToolStudy): Block[] {
  const a = s.agreed?.chart;
  if (!a) return [];
  const f = chartFigures(a, s.facts.readings ?? []), said = chartSays(f, a);
  if (!f.n) return [];
  const dp = f.dp + 1, u = a.unit ? ` ${a.unit}` : '';
  const beyond = f.points.filter(p => p.state === 'beyond' && !p.short).length;
  const out: Block[] = [cellsRow([
    [a.kind === 'xbar' ? 'Subgroups' : 'Readings', a.kind === 'xbar' ? `${f.points.length} of ${f.m}` : String(f.n)],
    ['Centre', f.centre !== undefined ? `${f.centre.toFixed(dp)}${f.shortRun ? '' : u}` : '—'],
    ['Limits', f.lcl !== undefined && f.ucl !== undefined ? `${f.lcl.toFixed(dp)}–${f.ucl.toFixed(dp)}` : '—'],
    ['Signals', String(f.signals.length), f.signals.length > 0],
    ['Beyond', String(beyond), beyond > 0],
    ['Verdict', said.verdict, said.tone === 'r'],
  ])];
  out.push(text({ text: said.text, size: 9, colour: said.tone === 'r' ? DANGER : INK2, after: 4 }));
  if (f.pre) {
    out.push(label('Set-up and the pairs'));
    out.push(text({ text: `Set-up: ${f.pre.qualified ? `${f.pre.greens} greens in a row — qualified at reading ${f.pre.qualifiedAt}` : `${f.pre.greens} of the ${GREENS_PRE} greens needed`}.`, size: 8.5, colour: INK2, after: 2 }));
    for (const pr of f.pre.pairs) out.push(text({ text: `Readings ${pr.nos[0]} and ${pr.nos[1]} — ${pr.say}.`, size: 8.5, style: pr.tone === 'g' ? 'normal' : 'bold', colour: pr.tone === 'r' ? DANGER : pr.tone === 'a' ? AMBER : INK2, after: 2 }));
  }
  if (said.signals.length) {
    out.push(label('The signals, in words'));
    for (const g of said.signals) out.push(text({ text: `${g.text} — ${g.means}.`, size: 8.5, style: 'bold', colour: g.tone === 'r' ? DANGER : AMBER, after: 2 }));
  }
  if (!f.pre && f.centre !== undefined && f.ucl !== undefined && f.lcl !== undefined) {
    out.push(label(f.provisional ? 'The chart — limits provisional' : `The chart — limits set from ${a.kind === 'xbar' ? 'subgroups' : 'readings'} ${f.from?.from}–${f.from?.to}`));
    const lines = [
      ...(a.lower !== undefined && !f.shortRun ? [{ v: a.lower, label: 'spec', dash: true }] : []), ...(a.upper !== undefined && !f.shortRun ? [{ v: a.upper, label: 'spec', dash: true }] : []),
      { v: f.ucl, label: 'UCL', red: true }, { v: f.lcl, label: 'LCL', red: true }, { v: f.centre, label: 'centre' },
    ];
    out.push(pointsBlock(f, lines, v => v.toFixed(dp)));
    if (f.spreadUcl !== undefined && f.points.some(p => p.spread !== undefined)) {
      out.push(label(a.kind === 'xmr' ? 'The moving range' : a.subgroup && a.subgroup > 10 ? 'The standard deviation in each subgroup' : 'The range in each subgroup'));
      out.push(barsBlock(f.points.map(p => ({ v: p.spread ?? 0, ...(f.spreadUcl !== undefined && (p.spread ?? 0) > f.spreadUcl ? { out: true } : {}) })), [{ v: f.spreadUcl, label: 'UCL', red: true }], v => v.toFixed(dp)));
    }
  }
  if (f.pre) out.push(pointsBlock(f, [{ v: f.pre.nominal + f.pre.t, label: 'red above', red: true }, { v: f.pre.nominal + f.pre.t / 2, label: 'green to', dash: true }, { v: f.pre.nominal - f.pre.t / 2, label: 'green from', dash: true }, { v: f.pre.nominal - f.pre.t, label: 'red below', red: true }], v => v.toFixed(dp)));
  if (f.cusum) {
    out.push(label('The CUSUM — since when'));
    out.push(text({ text: f.cusum.signal !== undefined ? `${said.since ?? ''}. K ${f.cusum.k.toFixed(dp)}${u}, H ${f.cusum.h.toFixed(dp)}${u}.` : `No drift found against the target: K ${f.cusum.k.toFixed(dp)}${u}, H ${f.cusum.h.toFixed(dp)}${u}.`, size: 8.5, colour: INK2, after: 4 }));
  }
  if (f.shortRun && f.shortRun.products.length) {
    out.push(label('By product'));
    out.push(tableBlock(['Product', 'Nominal', 'Readings', 'Mean deviation', 'Spread (s)'], f.shortRun.products.map(p => [p.product, String(p.nominal), String(p.n), `${p.mean >= 0 ? '+' : '−'}${Math.abs(p.mean).toFixed(dp)}`, p.n >= 2 ? p.sd.toFixed(dp) : '—']), [0.34, 0.14, 0.14, 0.22, 0.16]));
  }
  if (a.frozenBefore?.length) out.push(text({ text: `Limits set before: ${a.frozenBefore.map(b => `${b.centre.toFixed(dp)} from ${b.n}${b.who ? ` by ${b.who}` : ''}`).join('; ')}.`, size: 8, colour: MUTED, after: 4 }));
  out.push(label('Every reading, in the order taken'));
  const byId = new Map(f.points.map(p => [p.id, p]));
  const noted = (s.facts.readings ?? []).filter(r => r.note && !r.struck).map(r => `${(s.facts.readings ?? []).indexOf(r) + 1}: ${r.note}`);
  out.push(readingsRows(s, r => (typeof r.value === 'number' ? `${r.value}${r.note ? '*' : ''}` : '—'), id => byId.get(id)?.state === 'beyond'));
  if (noted.length) out.push(text({ text: `* ${noted.join(' · ')}`, size: 8, colour: MUTED, after: 2 }));
  return out;
}
const GREENS_PRE = 5;
/* ================== THE ANALYSIS (W3a, knowledge/specs/FC-105-analysis.md) ================== */
/** The picture's lanes as the page draws them (tools/analysis analysisPicture): bars or dots, a point with its interval, a zero line. */
function analysisPicBlock(picRows: PicRow[]): Block {
  const LH = 40, HH = 70, hs = picRows.map(r => (r.hist ? HH : LH)), total = hs.reduce((a, b) => a + b, 0) + 6;
  return rows({ rows: [{
    h: () => total,
    draw: (fr: Frame, y: number) => {
      const LAB = 70, RT = 118; let top = y + 2;
      picRows.forEach((r, i) => {
        const h = hs[i], xs = (v: number) => fr.x + LAB + ((v - r.axis[0]) / (r.axis[1] - r.axis[0])) * (fr.w - LAB - RT), base = r.hist ? top + h - 8 : top + h / 2;
        font(fr.doc, 7.5, 'bold', MUTED); fr.doc.text(r.label.length > 14 ? r.label.slice(0, 13) + '…' : r.label, fr.x, base + 2);
        fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.5); fr.doc.line(fr.x + LAB, base, fr.x + fr.w - RT, base);
        if (r.zero) { fr.doc.setDrawColor(INK2); fr.doc.setLineDashPattern([2, 2], 0); fr.doc.line(xs(0), top + 2, xs(0), top + h - 2); fr.doc.setLineDashPattern([], 0); }
        const colour = r.tone === 'g' ? '#15803d' : r.tone === 'r' ? DANGER : r.tone === 'a' ? AMBER : BRAND, wash = r.tone === 'g' ? '#b9dcc5' : r.tone === 'r' ? '#eeb7b2' : r.tone === 'a' ? '#ebd0b0' : '#a8d2db';
        if (r.hist) {
          const topC = Math.max(...r.hist.counts, 1);
          const ed = r.hist.edges; r.hist.counts.forEach((c, k) => { if (c > 0) { const x0 = xs(ed[k]) + 0.6, w = Math.max(0.6, xs(ed[k + 1]) - xs(ed[k]) - 1.2), bh = (c / topC) * (h - 20); fr.doc.setFillColor(BAR); fr.doc.rect(x0, base - bh, w, bh, 'F'); } });
        }
        if (r.dots) { fr.doc.setFillColor(INK2); r.dots.forEach((d, k) => fr.doc.circle(xs(d), base - 8 + ((k * 37) % 13) - 6 + 6, 1.4, 'F')); }
        if (r.band) { fr.doc.setFillColor(wash); fr.doc.rect(xs(r.band.lo), base - 6, Math.max(1.5, xs(r.band.hi) - xs(r.band.lo)), 12, 'F'); }
        if (r.point) { fr.doc.setDrawColor(colour); fr.doc.setLineWidth(1.6); fr.doc.line(xs(r.point.v), base - 9, xs(r.point.v), base + 9); fr.doc.setLineWidth(0.5); font(fr.doc, 7.5, 'bold', INK2); fr.doc.text(r.point.text, fr.x + fr.w - RT + 6, base - 1); }
        if (r.band) { font(fr.doc, 6.5, 'normal', MUTED); fr.doc.text(r.band.text, fr.x + fr.w - RT + 6, base + 8); }
        top += h;
      });
    },
  }], after: 'm' });
}
/** A table of counts and a scatter, as the page draws them (tools/analysis analysisPlot): the counts with what chance would give and the
 *  cells beyond ±2 said in words; the points, the line and the band of the line’s own interval. */
function analysisPlotBlock(plot: Plot): Block {
  if (plot.kind === 'table') {
    const w = 0.72 / (plot.cols.length + 1);
    const flag = (z: number) => (Math.abs(z) > 2 ? (z > 0 ? ' MORE' : ' FEWER') : '');
    return wrapTable([`${plot.rowName} \\ ${plot.colName}`, ...plot.cols, 'All'],
      [...plot.rows.map((r, i) => [r, ...plot.cols.map((_c, j) => `${plot.counts[i][j]} (${plot.expected[i][j].toFixed(1)})${flag(plot.residuals[i][j])}`), String(plot.rowTotals[i])]), ['All', ...plot.colTotals.map(String), String(plot.total)]],
      [0.28, ...plot.cols.map(() => w), w]);
  }
  const HB = 150;
  return rows({ rows: [{
    h: () => HB + 30,
    draw: (fr: Frame, y: number) => {
      const L = 38, B = 22, w = fr.w - L - 6, h = HB - B - 6;
      const xs = (v: number) => fr.x + L + ((v - plot.xAxis[0]) / (plot.xAxis[1] - plot.xAxis[0])) * w, ys = (v: number) => y + 4 + (1 - (v - plot.yAxis[0]) / (plot.yAxis[1] - plot.yAxis[0])) * h;
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.5); fr.doc.line(fr.x + L, y + 4 + h, fr.x + L + w, y + 4 + h); fr.doc.line(fr.x + L, y + 4, fr.x + L, y + 4 + h);
      const tk = (lo: number, hi: number) => [0, 1, 2, 3, 4].map(i => lo + ((hi - lo) * i) / 4), fm = (v: number) => String(Number(v.toPrecision(3)));
      font(fr.doc, 6.5, 'normal', MUTED);
      tk(plot.xAxis[0], plot.xAxis[1]).forEach(v => fr.doc.text(fm(v), xs(v), y + 4 + h + 9, { align: 'center' }));
      tk(plot.yAxis[0], plot.yAxis[1]).forEach(v => fr.doc.text(fm(v), fr.x + L - 3, ys(v) + 2, { align: 'right' }));
      if (plot.band) { fr.doc.setFillColor('#a8d2db'); for (let i = 0; i + 1 < plot.band.length; i++) { const a = plot.band[i], b = plot.band[i + 1]; fr.doc.triangle(xs(a.x), ys(a.hi), xs(b.x), ys(b.hi), xs(a.x), ys(a.lo), 'F'); fr.doc.triangle(xs(b.x), ys(b.hi), xs(b.x), ys(b.lo), xs(a.x), ys(a.lo), 'F'); } }
      if (plot.ref) { fr.doc.setDrawColor(INK2); fr.doc.setLineWidth(0.6); fr.doc.setLineDashPattern([3, 3], 0); fr.doc.line(fr.x + L, ys(plot.ref.y), fr.x + L + w, ys(plot.ref.y)); fr.doc.setLineDashPattern([], 0); font(fr.doc, 6.5, 'normal', MUTED); fr.doc.text(plot.ref.label, fr.x + L + w, ys(plot.ref.y) - 2, { align: 'right' }); }
      if (plot.curve) { fr.doc.setDrawColor(INK2); fr.doc.setLineWidth(1.1); for (let i = 0; i + 1 < plot.curve.length; i++) fr.doc.line(xs(plot.curve[i][0]), ys(plot.curve[i][1]), xs(plot.curve[i + 1][0]), ys(plot.curve[i + 1][1])); }
      if (plot.line) { fr.doc.setDrawColor(INK2); fr.doc.setLineWidth(plot.equal ? 0.6 : 1.1); if (plot.equal) fr.doc.setLineDashPattern([3, 3], 0); fr.doc.line(xs(plot.line[0][0]), ys(plot.line[0][1]), xs(plot.line[1][0]), ys(plot.line[1][1])); fr.doc.setLineDashPattern([], 0); }
      fr.doc.setFillColor(INK2); plot.pts.forEach(p => fr.doc.circle(xs(p[0]), ys(p[1]), 1.5, 'F'));
      font(fr.doc, 7, 'bold', MUTED); fr.doc.text(`${plot.xName}${plot.xUnit ? ` (${plot.xUnit})` : ''}`, fr.x + L + w / 2, y + HB + 10, { align: 'center' });
      fr.doc.text(`${plot.yName}${plot.yUnit ? ` (${plot.yUnit})` : ''}`, fr.x, y + 2);
    },
  }], after: 'm' });
}
/** The gauge's agreement in words for the line under the paper's picture (the tolerance, the reference, the slice and the need). */
function gaugeAgreedWords(a: NonNullable<ToolStudy['agreed']>['analysis'] & object): string {
  const g = a.gauge, u = a.unit ? ` ${a.unit}` : '';
  if (!g) return '';
  const parts = [g.mode === 'range' ? 'references across its range' : g.mode === 'drift' ? 'one reference checked day after day' : 'one reference read again and again'];
  if (g.reference !== undefined) parts.push(`reference ${g.reference}${u}`);
  if (g.lower !== undefined && g.upper !== undefined) parts.push(`judging ${g.lower}–${g.upper}${u}`); else if ((g.lower ?? g.upper) !== undefined) parts.push(`one limit ${g.lower ?? g.upper}${u}${g.target !== undefined ? ` from the target ${g.target}${u}` : ''}`);
  if (g.limit !== undefined) parts.push(`read at ${g.limit}${u}`);
  parts.push(`its 6s may use ${Math.round((g.slice ?? 0.2) * 1000) / 10}% of the tolerance, Cg and Cgk wanted at ${g.need ?? 1.33}`);
  if (g.mode === 'drift') parts.push(`limits from the first ${g.baseline ?? 20} checks`);
  return `, ${parts.join(', ')}`;
}
function analysisBlocks(s: ToolStudy): Block[] {
  const a = s.agreed?.analysis;
  if (!a) return [];
  const f = analysisFigures(a, s.facts.readings ?? []), said = analysisSays(f, a);
  const tiles = analysisTiles(f, a);
  const out: Block[] = [cellsRow([...tiles.slice(0, 5).map(t => [t.k, t.of ? `${t.v}` : t.v, t.tone === 'r'] as [string, string, boolean]), ['Verdict', said.verdict, said.tone === 'r']].slice(0, 6) as [string, string, boolean?][])];
  out.push(text({ text: said.text, size: 9, colour: said.tone === 'r' ? DANGER : INK2, after: 3 }));
  for (const m of said.more) out.push(text({ text: m, size: 8.5, colour: INK2, after: 2 }));
  if (said.notClaimed) out.push(text({ text: `What this does not say. ${said.notClaimed}`, size: 8, colour: MUTED, after: 4 }));
  const pic = analysisPicture(f, a), plot = analysisPlot(f, a);
  if (plot) { out.push(label(plot.kind === 'table' ? 'The counts — each with what chance would give in brackets' : f.kind === 'relate' && f.multi ? 'The fit against what was read' : 'The picture')); out.push(analysisPlotBlock(plot)); }
  else if (pic.length) { out.push(label('The picture')); out.push(analysisPicBlock(pic)); }
  for (const g of analysisGrids(f, a)) { out.push(label(g.label)); out.push(wrapTable(g.head, g.rows, g.widths)); }
  if (f.kind === 'groups' && f.res) {
    const r = f.res, dp = f.dp + 1;
    out.push(label(`Every pair — Tukey’s HSD, ${anPct(f.conf)} intervals`));
    out.push(wrapTable(['Pair', 'Difference', `${anPct(f.conf)} interval`, 'p'], r.pairs.map(x => [`${x.a} − ${x.b}`, x.diff.toFixed(dp), `${x.lo.toFixed(dp)} to ${x.hi.toFixed(dp)}`, anP(x.p)]), [0.34, 0.2, 0.3, 0.16], i => r.pairs[i].p < f.alpha));
  }
  if (f.kind === 'relate' && f.multi) {
    const m = f.multi, g = (v: number) => String(Number(v.toPrecision(3)));
    out.push(label(`Each driver, per unit, the others held — ${anPct(f.conf)} intervals`));
    out.push(wrapTable(['Driver', 'Per unit', `${anPct(f.conf)} interval`, 'p', 'VIF'], [...m.drivers.map(d => [d.name, g(d.b), `${g(d.lo)} to ${g(d.hi)}`, anP(d.p), (d.vif ?? 1).toFixed(1)]), ['Intercept', g(m.intercept.b), `${g(m.intercept.lo)} to ${g(m.intercept.hi)}`, anP(m.intercept.p), '']], [0.3, 0.16, 0.3, 0.14, 0.1]));
  }
  if (f.checks.length) { out.push(label('Checks on the readings')); for (const c of f.checks) out.push(text({ text: c.say, size: 8.5, colour: c.tone === 'a' ? AMBER : INK2, after: 2 })); }
  out.push(text({ text: `Agreed: ${a.name} — ${KIND_WORDS[a.kind].name.toLowerCase()}${a.unit && a.kind !== 'table' ? ` in ${a.unit}` : ''}${a.kind === 'relate' ? `, against ${(a.drivers ?? []).map(d => (d.unit ? `${d.name} (${d.unit})` : d.name)).join(', ')}` : ''}${a.kind === 'table' ? `, ${(a.rows ?? []).join(', ')} by ${(a.cols ?? []).join(', ')}` : ''}${a.kind === 'gauge' && a.gauge ? gaugeAgreedWords(a) : ''}${a.kind === 'shape' && a.shape ? `${a.shape.lower !== undefined ? `, a lower limit of ${a.shape.lower}${a.unit ? ` ${a.unit}` : ''}` : ''}${a.shape.upper !== undefined ? `, an upper limit of ${a.shape.upper}${a.unit ? ` ${a.unit}` : ''}` : ''}` : ''}, ${anPct(confidenceOf(a))} confidence.`, size: 8, colour: MUTED, before: 2, after: 3 }));
  const rs = s.facts.readings ?? [];
  if (rs.length && a.kind === 'table') {
    out.push(label('Every count, in the order taken'));
    out.push(readingsRows(s, r => (r.col !== undefined && typeof r.made === 'number' ? `${(r.arm ?? '').slice(0, 8)}/${r.col.slice(0, 8)} ${r.made}` : '—'), () => false, 4));
  } else if (rs.length) {
    out.push(label(a.kind === 'paired' || (a.kind === 'relate' && (a.drivers ?? []).length === 1) ? 'Every pair, in the order taken' : a.kind === 'relate' ? 'Every row, in the order taken' : (a.kind === 'sure' && a.of !== 'mean') || (a.kind === 'change' && a.data === 'counted') || a.kind === 'learn' ? 'Every run, in the order taken' : 'Every reading, in the order taken'));
    out.push(readingsRows(s, r => `${Array.isArray(r.xs) ? `${r.xs.join(', ')} → ${r.value}` : typeof r.with === 'number' ? (a.kind === 'gauge' ? `${r.value} @${r.with}` : `${r.value} / ${r.with}`) : typeof r.made === 'number' ? `${r.rejected}/${r.made}` : typeof r.value === 'number' ? String(r.value) : '—'}${r.arm ? ` ${a.kind === 'groups' ? r.arm.slice(0, 6) : r.arm[0].toUpperCase()}` : ''}`, () => false, a.kind === 'paired' ? 5 : a.kind === 'relate' ? (a.drivers ?? []).length > 1 ? 3 : 5 : a.kind === 'groups' ? 6 : 10));
    if (a.kind === 'change') out.push(text({ text: 'B = before, A = after.', size: 8, colour: MUTED, after: 2 }));
    if (a.kind === 'groups') out.push(text({ text: 'Each reading is followed by the first six letters of its group.', size: 8, colour: MUTED, after: 2 }));
    if (a.kind === 'relate') out.push(text({ text: `Each row: ${(a.drivers ?? []).map(d => d.name).join(', ')} → ${a.name}.`, size: 8, colour: MUTED, after: 2 }));
    if (a.kind === 'paired') out.push(text({ text: `Each pair: ${a.firstName || 'the first way'} / ${a.secondName || 'the second way'}.`, size: 8, colour: MUTED, after: 2 }));
    if (a.kind === 'gauge' && a.gauge?.mode === 'range') out.push(text({ text: 'Each reading is followed by @ and the reference it was read against.', size: 8, colour: MUTED, after: 2 }));
  }
  return out;
}
function runsBlocks(r: RunsFigures, f: SampleFigures, a: AgreedReadings): Block[] {
  const said = sampleSays(f, a);
  const out: Block[] = [cellsRow([
    ['Made', num(r.made)], ['Rejected', num(r.rejected), r.verdict === 'notMet'], ['Rate', r.made ? `${(r.p * 100).toFixed(2)}%` : '—'],
    ['95% between', f.n >= 3 ? `${(r.lo * 100).toFixed(2)}–${(r.hi * 100).toFixed(2)}%` : 'from 3 runs'],
    ['Agreed at most', r.max !== undefined ? shareWords(r.max) : '—'], ['Verdict', said.verdict, said.tone === 'r'],
  ])];
  if (r.runs.length) {
    out.push(label('The runs, in the order counted'));
    out.push(tableBlock(['Run', 'Made', 'Rejected', 'Rate', 'Chart limits'], r.runs.map(x => [String(x.no), num(x.made), num(x.rejected), `${(x.p * 100).toFixed(2)}%`, r.runs.length >= 5 ? `${(x.lcl * 100).toFixed(2)}–${(x.ucl * 100).toFixed(2)}%${x.out ? ' outside' : ''}` : '—']), [0.1, 0.2, 0.2, 0.2, 0.3], i => r.runs[i].out));
    out.push(label(r.laney ? 'The p-chart — Laney’s limits' : 'The p-chart'));
    out.push(barsBlock(r.runs.map(x => ({ v: x.p, out: x.out, ...(r.runs.length >= 5 ? { hi: x.ucl } : {}) })), [{ v: r.p, label: 'pooled' }, ...(r.max !== undefined ? [{ v: r.max, label: 'at most', red: true }] : [])], v => `${(v * 100).toFixed(2)}%`));
  }
  return out;
}
function faultsBlocks(q: FaultsFigures, f: SampleFigures, a: AgreedReadings): Block[] {
  const said = sampleSays(f, a);
  const out: Block[] = [cellsRow([
    ['Items', num(q.items)], ['Faults', num(q.faults), q.verdict === 'notMet'], ['Per item', q.items ? q.dpu.toFixed(3) : '—'],
    ['95% between', f.n >= 3 ? `${q.lo.toFixed(3)}–${q.hi.toFixed(3)}` : 'from 3'],
    ['Agreed at most', q.max !== undefined ? `${(q.max * 100).toFixed(1)} per 100` : '—'], ['Verdict', said.verdict, said.tone === 'r'],
  ])];
  if (q.tally.length) {
    out.push(label('Faults by kind — the tally and its Pareto'));
    out.push(tableBlock(['Kind', 'Count', 'Share', 'Cumulative', q.tally.some(t => t.gbp !== undefined) ? 'Money' : ''], q.tally.map(t => [t.kind, num(t.count), `${Math.round(t.share * 100)}%`, `${Math.round(t.cum * 100)}%`, t.gbp !== undefined ? `£${t.gbp.toFixed(2)}` : '']), [0.34, 0.14, 0.14, 0.18, 0.2]));
  }
  if (q.insp.length) {
    out.push(label('The inspections, in the order made'));
    out.push(tableBlock(['No.', 'Items', 'Faults', 'Per item', 'Chart limits'], q.insp.map(x => [String(x.no), num(x.inspected), num(x.faults), x.u.toFixed(3), q.insp.length >= 5 ? `${x.lcl.toFixed(3)}–${x.ucl.toFixed(3)}${x.out ? ' outside' : ''}` : '—']), [0.1, 0.2, 0.2, 0.2, 0.3], i => q.insp[i].out));
    out.push(label(q.laney ? 'The u-chart — Laney’s limits' : q.equal ? 'The c-chart' : 'The u-chart'));
    out.push(barsBlock(q.insp.map(x => ({ v: x.u, out: x.out, ...(q.insp.length >= 5 ? { hi: x.ucl } : {}) })), [{ v: q.dpu, label: 'pooled' }, ...(q.max !== undefined ? [{ v: q.max, label: 'at most', red: true }] : [])], v => v.toFixed(3)));
  }
  return out;
}
function rateBlocks(r: RateFigures, f: SampleFigures, a: AgreedReadings): Block[] {
  const said = sampleSays(f, a), u = a.unit ? ` ${a.unit}` : '';
  const out: Block[] = [cellsRow([
    ['Intervals met', f.n ? `${r.met} of ${f.n}` : '—', r.held === 'not'], ['Longest stretch', f.n ? `${r.stretchMin} min` : '—'],
    ['Made', f.n ? `${num(r.made)} of ${num(Math.round(r.expected))}` : '—', f.n > 0 && r.ratio < 1],
    ['Ppk on rates', r.ppk !== undefined ? r.ppk.toFixed(2) : `from ${25}`], ['Agreed', `${r.side === 'least' ? 'at least' : 'at most'} ${r.limit}${u}/min`], ['Verdict', said.verdict, said.tone === 'r'],
  ])];
  if (r.intervals.length) {
    out.push(label(`The intervals — ${r.intervalMin} minute${r.intervalMin === 1 ? '' : 's'} each, the missed ones in amber`));
    out.push(barsBlock(r.intervals.map(i => ({ v: i.rate, miss: !i.met })), [{ v: r.limit, label: r.side === 'least' ? 'at least' : 'at most', red: true }], v => `${Math.round(v * 10) / 10}`));
    const misses = r.intervals.filter(i => !i.met);
    if (misses.length) out.push(text({ text: `Missed: ${misses.map(i => `minute ${i.no} (${Math.round(i.rate * 10) / 10}${u})`).join(', ')}.`, size: 8.5, colour: AMBER, after: 6 }));
  }
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
  const agreed = mustComeIn(s.agreed?.changeover, agreedForChangeover(st?.capacity?.changeovers, s.facts.fromProduct));
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
  } else if (s.tool === 'analysis' && s.agreed?.analysis) {
    const a = s.agreed.analysis, f = analysisFigures(a, s.facts.readings ?? []), said = analysisSays(f, a);
    eyebrow = 'Analysis'; verdict = { text: said.verdict, tone: said.tone }; tiles = analysisTiles(f, a); closing = analysisClosing(f, a, said);
    body = analysisBlocks(s);
  } else if (s.tool === 'calc') {
    /* a calculation (FC-235): one generic page from the definition's own result — the same the screen draws */
    const c = calcPaperParts(s);
    if (c) { eyebrow = c.eyebrow; verdict = c.verdict; tiles = c.tiles; closing = c.closing; body = c.body; }
  } else if (s.tool === 'scored' && s.agreed?.scored) {
    const said = scoredSays(s);
    eyebrow = scoredTitle(s); verdict = { text: said.verdict, tone: said.tone };
    body = scoredPaperBlocks(s);
    closing = { text: studyScored(s)?.result?.closing ?? '', tone: said.tone };
  } else if (s.tool === 'board' && s.agreed?.board) {
    const siblings = p.history ?? [];
    const said = boardSays(s, siblings, Date.now());
    eyebrow = boardTitle(s); verdict = { text: said.verdict, tone: said.tone };
    body = boardPaperBlocks(s, siblings, Date.now());
    tiles = studyBoard(s, siblings, Date.now())?.result?.tiles ?? [];
    closing = { text: studyBoard(s, siblings, Date.now())?.result?.closing ?? '', tone: said.tone };
  } else if (s.tool === 'chart' && s.agreed?.chart) {
    const a = s.agreed.chart, f = chartFigures(a, s.facts.readings ?? []), said = chartSays(f, a);
    eyebrow = 'Control chart'; verdict = { text: said.verdict, tone: said.tone }; tiles = chartTiles(f, a); closing = chartClosing(f, a, said);
    body = chartBlocks(s);
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
    const where = { machine: s.machine, neck: neckOf(p.standards, s.workspaceId) };   /* its machine and the line's bottleneck (FC-058) */
    eyebrow = 'Reliability study'; verdict = { text: said.verdict, tone: said.tone };
    if (items.length === 1) tiles = relTiles(items[0].c, items[0].f, relCost(items[0].f, items[0].c, line, where), { r: items[0].r, k: items[0].k, g: items[0].g });
    closing = relClosings(items, line, where);
    body = reliabilityBlocks(s, items, line, where);
  } else if (s.tool === 'map') {
    const list = s.facts.flow ?? [], f = flowFigures(list, s.agreed?.map);
    eyebrow = 'Value stream map'; verdict = { text: f.steps ? `${f.untimed ? '≥ ' : ''}${dur(f.leadSec)} lead time` : 'No steps yet', tone: f.longestCycle?.overTakt ? 'r' : 'n' };
    /* the money among the tiles (FC-001): the line's rate from the paper's context, the rest from the map */
    const lineW = p.ctx?.workspaces?.find(w => w.id === s.workspaceId);
    const money = flowMoney(list, s.agreed?.map, lineW ? { labourRatePerHour: lineW.labourRatePerHour, labourBurden: lineW.labourBurden } : undefined);
    tiles = [...flowTiles(f, list), ...flowMoneyTiles(money, s.agreed?.map)]; closing = flowClosing(f, s.agreed?.map);
    body = e.stream ? streamBlocks(e.stream.rows, e.stream.total) : [];
  }
  const out: Block[] = [leanBand(bandPage(eyebrow, s, verdict?.text, verdict?.tone), p.printed)];
  out.push(text({ text: `${where}${s.uses.length ? ` · used for ${s.uses.length} record${s.uses.length === 1 ? '' : 's'} on its project` : ''}`, size: 8, colour: MUTED, after: gap(d, 's') }));
  if (tiles.length) out.push(leanTiles(tiles));
  out.push(leanHead('What it says'));
  out.push(text({ text: e.line, size: 9, colour: e.tone === 'r' ? DANGER : INK2, after: gap(d, 's') }));
  /* IN MONEY (knowledge/specs/FC-156-capability-money.md): the sentence the page says, with its because, and
     the figures it was scaled by — the same module as the screen, nothing missing made up */
  if (s.tool === 'capability' && s.agreed?.readings) {
    const a = s.agreed.readings, f = sample(a, s.facts.readings ?? []), m = moneySays(sampleMoney(f, a), f, a);
    if (m) out.push(text({ text: m.text, size: 9, style: m.tone === 'a' ? 'bold' : 'normal', colour: INK2, after: 2 }));
    const given = [a.packsPerShift !== undefined ? `${a.packsPerShift.toLocaleString('en-GB')} a shift` : '', a.shiftsPerWeek !== undefined ? `${a.shiftsPerWeek} shifts a week` : '',
      a.costPerKg !== undefined ? `£${a.costPerKg} a kg` : '', a.materialsPerPack !== undefined ? `£${a.materialsPerPack} a pack’s materials` : '', a.reworkPerPack !== undefined ? `£${a.reworkPerPack} a rework` : ''].filter(Boolean);
    if (given.length) out.push(text({ text: `In money from: ${given.join(' · ')}.`, size: 8, colour: MUTED, after: gap(d, 's') }));
  }
  if (s.tool === 'map') {
    const a = s.agreed?.map, lineW = p.ctx?.workspaces?.find(w => w.id === s.workspaceId);
    const m = flowMoney(s.facts.flow, a, lineW ? { labourRatePerHour: lineW.labourRatePerHour, labourBurden: lineW.labourBurden } : undefined), said = flowMoneySays(m, a);
    if (said) out.push(text({ text: said.text, size: 9, style: said.tone === 'a' ? 'bold' : 'normal', colour: INK2, after: 2 }));
    const given = [m.ratePerHour !== undefined ? `£${m.ratePerHour.toFixed(2)} an hour (the line)` : '', a?.pieceCost !== undefined ? `£${a.pieceCost.toFixed(2)} a piece` : '', a?.carryingRatePerYear !== undefined ? `${a.carryingRatePerYear}% a year, 365 days` : ''].filter(Boolean);
    if (given.length) out.push(text({ text: `In money from: ${given.join(' · ')}.`, size: 8, colour: MUTED, after: gap(d, 's') }));
  }
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
function reliabilityBlocks(s: ToolStudy, items: RelItem[], line?: Parameters<typeof relCost>[2], where?: Parameters<typeof relCost>[3]): Block[] {
  const out: Block[] = [];
  const many = items.length > 1;
  if (many) { out.push(leanHead('Counted side by side')); out.push(...relTogetherBlocks(relRows(items, line, where))); }
  for (const { c, f, r, k, g, stops } of items) {
    if (many) {
      out.push(leanHead(countTitle(c)));
      out.push(leanTiles(relTiles(c, f, relCost(f, c, line, where), { r, k, g })));
      out.push(text({ text: reliabilitySays(c, f).text, size: 9, colour: INK2, after: 4 }));
    }
    const ins = reliabilityInsights(c, f);
    if (ins.length) out.push(...leanInsights(ins));
    const chart = relChartBlock(f, c.event);
    if (chart) { out.push(leanHead(`${countTitle(c)} against watched hours`)); out.push(chart); }
    const trend = relTrend(c, f);
    if (trend) { out.push(leanHead(many ? `${countTitle(c)} — MTBF, day by day` : trend.title)); out.push(leanTrend(trend)); }
    if (f.kinds.length) { out.push(leanHead('What they were')); out.push(...relKindsBlocks(f)); }
    const cost = relCost(f, c, line, where);
    if (cost.downMinPerH !== undefined) out.push(text({ text: `What it costs: ${costWords(cost)}.`, size: 8.5, colour: INK2, after: 4 }));
    else if (f.rate !== undefined && cost.missing.length) out.push(text({ text: `What it costs is said once given: ${cost.missing.join('; ')}.`, size: 8, colour: MUTED, after: 4 }));
    /* what the count was set up for beyond counting (FC-059, FC-015, FC-061, FC-060) — the page's panels, from the same modules */
    if (r) out.push(...repairBlocks(c.event, f, r, fitterCost(r, f.rate, c.fitterRate)));
    if (k) out.push(...callBlocks(c.event, k, !!c.reasons?.length, callsByShift(stops ?? [], line?.shifts), k.bars, waitWords(waitCost(k, f, c, line, where))));
    if (g) out.push(...growthBlocks(c.event, g, f.points));
    const wv = wearOf(c, f, s.facts.lives);
    if (wv) {
      const dayMin = line ? lineDay({ name: line.name, packsPerMin: line.packsPerMin, marginPerPack: line.marginPerPack, shifts: line.shifts }).minutes : undefined;
      out.push(...wearBlocks(wv.unit, wv.fit, wv.hasRunning, weibullTiles(wv.unit, wv.fit, wv.rep), { ...(wv.cp !== undefined ? { cp: wv.cp } : {}), ...(wv.cf !== undefined ? { cf: wv.cf } : {}), gbp: relGbp,
        ...(wv.unit === 'hours' && dayMin ? { dayUnits: dayMin / 60 } : {}), ...(wv.age !== undefined ? { age: wv.age } : {}), ...(wv.ahead !== undefined ? { ahead: wv.ahead } : {}) }));
    }
    if (f.days.length) { out.push(leanHead(many ? `${countTitle(c)} — day by day` : 'Day by day')); out.push(...relDaysBlocks(f, countTitle(c))); }
  }
  out.push(leanHead('Commentary'));
  out.push(...remarksBlocks(s.facts.remarks));
  return out;
}

/** A check log's paper input, read from what the paper has: the line's cost model, its Line capacity, the register. */
function logInputOf(p: StudiesPaper, { s, where }: StudyPaperItem) {
  const def = defOf(s.agreed?.log?.key);
  if (!def) return undefined;
  const line = p.ctx?.workspaces?.find(w => w.id === s.workspaceId);
  const name = (line as { name?: string } | undefined)?.name;
  return paperInput(s, def, ctxFrom(line, p.standards, s.workspaceId), p.snags ?? [], where, name);
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
  if (s.tool === 'chart') out.push(...chartBlocks(s));
  if (s.tool === 'analysis') out.push(...analysisBlocks(s));
  if (s.tool === 'calc') out.push(...(calcPaperParts(s)?.body ?? []));
  /* a check log's parts — the line report prints them as the log's own paper does */
  if (s.tool === 'log') { const li = logInputOf(p, { s, where }); if (li) out.push(...logBodyBlocks(li)); }
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
    /* the time study, the combination table, the order of the work and the questions asked of each step (FC-019 … FC-033) */
    const inputs = costInputs(cap, line);
    out.push(...lineworkBlocks(s.facts.steps ?? [], agreedFor(s.agreed?.balance, cap, !!s.closedAt), crewKept(s.facts.crew ?? [], cap), s.facts.tend,
      { ...(inputs.ratePerHour ? { rate: inputs.ratePerHour } : {}), ...(inputs.contributionPerPack ? { contribution: inputs.contributionPerPack } : {}) }));
  }
  if (s.receipt?.text && s.closedAt) out.push(text({ text: `Closed: ${s.receipt.text}`, size: 8, colour: MUTED, before: 2, after: 2 }));
  return out;
}

function blocksOf(p: StudiesPaper, d: Density): Block[] {
  if (p.lean && p.items.length === 1 && p.items[0].s.tool === 'log') { const li = logInputOf(p, p.items[0]); if (li) return logPaperBlocks(li, p.printed, d); }
  if (p.lean && p.items.length === 1 && p.items[0].s.tool === 'losses') return lossLeanBlocks(p, p.items[0], d);
  if (p.lean && p.items.length === 1 && ['capability', 'sampling', 'map', 'reliability', 'chart', 'analysis', 'calc', 'board', 'scored'].includes(p.items[0].s.tool)) return studyLeanBlocks(p, p.items[0], d);
  if (p.lean && p.items.length === 1 && p.items[0].s.tool === 'changeover') return smedLeanBlocks(p, p.items[0], d);
  const out: Block[] = [];
  out.push(text({ text: p.items.length === 1 ? 'A STUDY · MEASURED BY PEOPLE AT THE LINE' : `${p.items.length} STUDIES · MEASURED BY PEOPLE AT THE LINE`, size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: p.title, size: SIZE.title, style: 'bold', after: 4 }));
  out.push(text({ text: `Printed ${p.printed}`, colour: MUTED, after: gap(d, 'm') }));
  if (!p.items.length) out.push(text({ text: 'No studies here yet.', colour: MUTED }));
  /* capability across products and over time (FC-101): the list's studies side by side, before each one's page */
  const ot = overTime(p.items.map(i => i.s));
  if (ot) {
    out.push(label('Capability over time'));
    out.push(text({ text: overTimeSays(ot), size: 8.5, colour: INK2, after: 3 }));
    const share = [0.28, ...ot.months.map(() => 0.58 / ot.months.length), 0.14];
    out.push(wrapTable(['Product or machine', ...ot.months.map(m => m.label), 'Latest'], ot.rows.map(r => [r.who, ...ot.months.map(m => (r.cells[m.key] ? `${r.cells[m.key].text}${r.cells[m.key].studies > 1 ? ` ×${r.cells[m.key].studies}` : ''}` : '—')), r.latest.verdict]), share, i => ot.rows[i].latest.tone === 'r'));
  }
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
