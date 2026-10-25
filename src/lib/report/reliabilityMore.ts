/* WHAT A RELIABILITY STUDY ADDS ON PAPER (knowledge/specs/FC-059, FC-015,
 * FC-061, FC-060) — the repair times and their bar for each stop, the calls
 * ranked by the minutes waited and by shift, the growth curve, the Weibull
 * plot — each drawn from the same module figures the page draws (tools/
 * reliability/repair, growth, weibull). Grey and ink, and the one amber that
 * means waiting; every picture says what its marks are in words under it.
 *
 * Every figure is the module's; this only draws. */
import { INK, INK2, LINE, MUTED } from '../reportKit';
import { box, font, rows, text, wrap, SIZE, type Row } from './blocks';
import type { Block } from './flow';
import { leanHead, leanInsights, leanTiles } from './lean';
import type { LeanTile } from '../lean';
import { fitterWords, type CallFigures, type FitterCost, type ReasonRow, type RepairFigures, type ShiftRow, type StopBar, repairInsights, repairSays, callInsights, callSays } from '../../tools/reliability/repair';
import { GROWTH_CAVEATS, growthRows, growthSays, type GrowthFigures } from '../../tools/reliability/growth';
import { conditionalSays, replaceSays, weibullInsights, weibullPlot, weibullRows, weibullSays, type WeibullFit } from '../../tools/reliability/weibull';
import { mins, plural } from '../../tools/reliability/words';

const STEP = '#0c7489', WAIT = '#b45309', WHOLE = '#c3cfcf';
const T = 8.5, LH = 11;

const hm = (ms: number): string => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** A table of [label, value] rows — the growth and Weibull tables. */
export function pairRows(rs: readonly [string, string][]): Block[] {
  if (!rs.length) return [];
  return [rows({
    rows: rs.map((r): Row => {
      const lines = (f: Parameters<Row['h']>[0]) => wrap(f.doc, r[1], f.w * 0.6 - 4, T);
      return {
        h: f => Math.max(1, lines(f).length) * LH + 5,
        draw: (f, y) => {
          font(f.doc, T, 'normal', MUTED); f.doc.text(wrap(f.doc, r[0], f.w * 0.4 - 8, T)[0] ?? '', f.x, y + 4 + T * 0.92);
          font(f.doc, T, 'bold', INK); lines(f).forEach((s, i) => f.doc.text(s, f.x + f.w * 0.4, y + 4 + T * 0.92 + i * LH));
          f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + Math.max(1, lines(f).length) * LH + 4.5, f.x + f.w, y + Math.max(1, lines(f).length) * LH + 4.5);
        },
      };
    }),
    after: 's',
  })];
}

/* ------------------------------------------------------------------ repair times */

/** A bar for each stop, oldest first, the last 24: waiting then fixing. */
export function stopBarsBlock(bars: readonly StopBar[], ev: string): Block | undefined {
  const list = bars.slice(-24);
  if (!list.length) return undefined;
  const RH = 9, top = 4;
  const H = list.length * RH + top + 26;
  return box(() => H, (f, y) => {
    const d = f.doc, L = 34, R = 44, W = f.w - L - R;
    const max = Math.max(...list.map(b => (b.waitMin ?? 0) + b.fixMin), 0.5);
    const x = (m: number) => f.x + L + (m / max) * W;
    list.forEach((b, i) => {
      const yy = y + top + i * RH;
      font(d, 6.5, 'normal', MUTED); d.text(hm(b.at), f.x + L - 4, yy + 6, { align: 'right' });
      const w = b.waitMin ?? 0;
      if (b.waitMin !== undefined) { d.setFillColor(WAIT); d.rect(x(0), yy + 1, Math.max(0.6, x(w) - x(0)), RH - 3, 'F'); }
      d.setFillColor(b.waitMin !== undefined ? INK2 : WHOLE); d.rect(x(w), yy + 1, Math.max(0.6, x(w + b.fixMin) - x(w)), RH - 3, 'F');
      font(d, 6.5, 'bold', INK2); d.text(`${b.est ? '~' : ''}${mins(w + b.fixMin)}`, x(w + b.fixMin) + 3, yy + 6);
    });
    const ly = y + top + list.length * RH + 9;
    d.setFillColor(WAIT); d.rect(f.x + L, ly - 6, 9, 6, 'F'); font(d, 6.8, 'normal', INK2); d.text('waiting for help', f.x + L + 12, ly - 1);
    d.setFillColor(INK2); d.rect(f.x + L + 80, ly - 6, 9, 6, 'F'); d.text('fixing — help arrived to running again', f.x + L + 92, ly - 1);
    d.setFillColor(WHOLE); d.rect(f.x + L + 232, ly - 6, 9, 6, 'F'); d.text('the whole time (no help stamp)', f.x + L + 244, ly - 1);
    d.text(`~ said, not clocked · each ${ev}, oldest first`, f.x + L, ly + 9);
  });
}

/** The repair section of a timed stop count: sentence, what it means, the bars, the fitter's money. */
export function repairBlocks(ev: string, basis: { n: number; mtbfH?: number }, r: RepairFigures, fitter: FitterCost | undefined): Block[] {
  const out: Block[] = [leanHead('Repair times')];
  const said = repairSays(ev, basis, r);
  out.push(text({ text: said.text, size: 9, colour: INK2, after: 4 }));
  const ins = repairInsights(ev, basis, r);
  if (ins.length) out.push(...leanInsights(ins));
  const bars = stopBarsBlock(r.bars, ev);
  if (bars) out.push(bars);
  const fw = fitterWords(fitter);
  if (fw) out.push(text({ text: fw, size: 8.5, colour: INK2, after: 4 }));
  if (r.reasons.length) { out.push(leanHead(`What the ${plural(ev)} were`)); out.push(...reasonTable(r.reasons, 'clear')); }
  return out;
}

/* ------------------------------------------------------------------ calls */

/** Reasons ranked, a bar for the minutes — waited, or cleared. */
export function reasonTable(rs: readonly ReasonRow[], by: 'wait' | 'clear'): Block[] {
  if (!rs.length) return [];
  const key = (r: ReasonRow) => (by === 'wait' ? r.waitMin : r.clearMin);
  const max = Math.max(...rs.map(key), 0.1);
  const header: Row = { h: () => 16, draw: (f, y) => {
    font(f.doc, SIZE.tiny, 'bold', MUTED);
    f.doc.text('REASON', f.x, y + 10); f.doc.text('CALLS', f.x + f.w * 0.52, y + 10, { align: 'right' });
    f.doc.text('WAITED', f.x + f.w * 0.64, y + 10, { align: 'right' }); f.doc.text('CLEARED', f.x + f.w * 0.78, y + 10, { align: 'right' });
    f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 14.5, f.x + f.w, y + 14.5);
  } };
  return [rows({
    header,
    rows: rs.map((r): Row => ({
      h: () => LH + 6,
      draw: (f, y) => {
        const ty = y + 4 + T * 0.92;
        font(f.doc, T, 'bold', INK); f.doc.text(wrap(f.doc, r.reason, f.w * 0.3, T, 'bold')[0] ?? '', f.x, ty);
        font(f.doc, T, 'normal', INK2);
        f.doc.text(String(r.n), f.x + f.w * 0.52, ty, { align: 'right' });
        f.doc.text(mins(r.waitMin), f.x + f.w * 0.64, ty, { align: 'right' });
        f.doc.text(mins(r.clearMin), f.x + f.w * 0.78, ty, { align: 'right' });
        const bx = f.x + f.w * 0.82, bw = f.w * 0.18;
        f.doc.setFillColor('#edf1f1'); f.doc.rect(bx, y + 4, bw, 6, 'F');
        f.doc.setFillColor(by === 'wait' ? WAIT : INK2); f.doc.rect(bx, y + 4, Math.max(0.8, (key(r) / max) * bw), 6, 'F');
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + LH + 5.5, f.x + f.w, y + LH + 5.5);
      },
    })),
    after: 's',
  })];
}

export function shiftTable(rs: readonly ShiftRow[]): Block[] {
  if (!rs.length) return [];
  const header: Row = { h: () => 16, draw: (f, y) => {
    font(f.doc, SIZE.tiny, 'bold', MUTED);
    f.doc.text('SHIFT', f.x, y + 10); f.doc.text('CALLS', f.x + f.w * 0.5, y + 10, { align: 'right' });
    f.doc.text('ANSWERED', f.x + f.w * 0.68, y + 10, { align: 'right' }); f.doc.text('HELP IN, TYPICALLY', f.x + f.w * 0.98, y + 10, { align: 'right' });
    f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 14.5, f.x + f.w, y + 14.5);
  } };
  return [rows({
    header,
    rows: rs.map((r): Row => ({
      h: () => LH + 5,
      draw: (f, y) => {
        const ty = y + 4 + T * 0.92;
        font(f.doc, T, 'bold', INK); f.doc.text(r.name, f.x, ty);
        font(f.doc, T, 'normal', INK2);
        f.doc.text(String(r.calls), f.x + f.w * 0.5, ty, { align: 'right' }); f.doc.text(String(r.answered), f.x + f.w * 0.68, ty, { align: 'right' });
        f.doc.text(r.respMedianMin !== undefined ? mins(r.respMedianMin) : '—', f.x + f.w * 0.98, ty, { align: 'right' });
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + LH + 4.5, f.x + f.w, y + LH + 4.5);
      },
    })),
    after: 's',
  })];
}

/** The call section: sentence, what it means, the reasons ranked by the minutes waited, by shift, the bars, the money. */
export function callBlocks(ev: string, k: CallFigures, listed: boolean, shifts: readonly ShiftRow[], bars: readonly StopBar[], moneyText: string): Block[] {
  const out: Block[] = [leanHead(`${plural(ev).replace(/^./, c => c.toUpperCase())} for help`)];
  out.push(text({ text: callSays(ev, k).text, size: 9, colour: INK2, after: 4 }));
  const ins = callInsights(ev, k, listed);
  if (ins.length) out.push(...leanInsights(ins));
  if (k.reasons.length) { out.push(leanHead('Reasons, by the minutes waited')); out.push(...reasonTable(k.reasons, 'wait')); }
  if (shifts.length) { out.push(leanHead('By shift')); out.push(...shiftTable(shifts)); }
  const b = stopBarsBlock(bars, ev);
  if (b) out.push(b);
  if (moneyText) out.push(text({ text: moneyText, size: 8.5, colour: INK2, after: 4 }));
  return out;
}

/* ------------------------------------------------------------------ growth */

const niceStep = (max: number, parts = 4): number => {
  const raw = max / parts, p = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9))), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

/** Failures against running hours: the steps as they came, the fitted curve dashed, the steady rate dotted. */
export function growthChartBlock(g: GrowthFigures, points: readonly { h: number; n: number }[], ev: string): Block | undefined {
  if (!points.length || g.hours <= 0) return undefined;
  const HT = 160;
  return box(() => HT + 24, (f, y) => {
    const d = f.doc, L = 26, B = 18, top = y + 6, H = HT - B - 6, W = f.w - L - 6;
    const yMax = Math.max(points.length, ...g.curve.map(c => c.n), 1);
    const x = (h: number) => f.x + L + (h / g.hours) * W, yv = (n: number) => top + (1 - n / yMax) * H;
    const ys = Math.max(1, Math.round(niceStep(yMax))), xs = niceStep(g.hours);
    for (let v = 0; v <= yMax; v += ys) { d.setDrawColor(LINE); d.setLineWidth(0.5); d.line(f.x + L, yv(v), f.x + L + W, yv(v)); font(d, 6.5, 'normal', MUTED); d.text(String(v), f.x + L - 4, yv(v) + 2.2, { align: 'right' }); }
    for (let v = 0; v <= g.hours + 1e-9; v += xs) { font(d, 6.5, 'normal', MUTED); d.text(String(+v.toFixed(1)), x(v), top + H + 9, { align: 'center' }); }
    /* the steady rate: the straight line to the last failure */
    d.setDrawColor(INK2); d.setLineWidth(0.6); d.setLineDashPattern([1, 2], 0); d.line(x(0), yv(0), x(g.hours), yv(points.length)); d.setLineDashPattern([], 0);
    /* the fitted curve */
    d.setDrawColor(INK); d.setLineWidth(1); d.setLineDashPattern([3, 2], 0);
    g.curve.forEach((c, i) => { if (i) d.line(x(g.curve[i - 1].h), yv(g.curve[i - 1].n), x(c.h), yv(c.n)); });
    d.setLineDashPattern([], 0);
    /* the failures as they came */
    d.setDrawColor(STEP); d.setLineWidth(1.2);
    let px = x(0), py = yv(0);
    for (const p of points) { d.line(px, py, x(p.h), py); d.line(x(p.h), py, x(p.h), yv(p.n)); px = x(p.h); py = yv(p.n); }
    d.line(px, py, x(g.hours), py);
    font(d, 6.8, 'normal', MUTED);
    d.text(`running hours · solid: ${plural(ev)} as they came · dashed: the fitted curve · dotted: a steady rate`, f.x + L, top + H + 20);
  });
}

export function growthBlocks(ev: string, g: GrowthFigures, points: readonly { h: number; n: number }[]): Block[] {
  const out: Block[] = [leanHead('Reliability growth')];
  out.push(text({ text: growthSays(ev, g).text, size: 9, colour: INK2, after: 4 }));
  const chart = growthChartBlock(g, points, ev);
  if (chart && g.beta !== undefined) out.push(chart);
  out.push(...pairRows(growthRows(g)));
  out.push(text({ text: GROWTH_CAVEATS.join(' '), size: 7.8, colour: MUTED, after: 4 }));
  return out;
}

/* ------------------------------------------------------------------ Weibull */

/** The Weibull plot: ages on a log scale, % failed on the Weibull scale, the lives as points, the two lines. */
export function weibullPlotBlock(w: WeibullFit, unit: string): Block | undefined {
  const p = weibullPlot(w);
  if (!p) return undefined;
  const HT = 190;
  return box(() => HT + 24, (f, y) => {
    const d = f.doc, L = 34, B = 20, top = y + 6, H = HT - B - 6, W = f.w - L - 8;
    const x = (v: number) => f.x + L + ((v - p.xMin) / (p.xMax - p.xMin)) * W, yv = (v: number) => top + (1 - (v - p.yMin) / (p.yMax - p.yMin)) * H;
    p.yTicks.forEach(t => { d.setDrawColor(LINE); d.setLineWidth(0.5); d.line(f.x + L, yv(t.y), f.x + L + W, yv(t.y)); font(d, 6.5, 'normal', MUTED); d.text(t.label, f.x + L - 4, yv(t.y) + 2.2, { align: 'right' }); });
    p.xTicks.forEach(t => { d.setDrawColor(LINE); d.setLineWidth(0.4); d.line(x(t.x), top, x(t.x), top + H); font(d, 6.5, 'normal', MUTED); d.text(t.label, x(t.x), top + H + 9, { align: 'center' }); });
    /* a line, cut to the plot's top and foot */
    const clipY = (a: { x: number; y: number }, b: { x: number; y: number }): [number, number, number, number] => {
      let [x1, y1, x2, y2] = [a.x, a.y, b.x, b.y];
      const at = (yy: number): [number, number] => [x1 + ((yy - y1) / (y2 - y1)) * (x2 - x1), yy];
      if (y1 < p.yMin) [x1, y1] = at(p.yMin);
      if (y1 > p.yMax) [x1, y1] = at(p.yMax);
      if (y2 < p.yMin) [x2, y2] = at(p.yMin);
      if (y2 > p.yMax) [x2, y2] = at(p.yMax);
      return [x(x1), yv(y1), x(x2), yv(y2)];
    };
    if (p.rr) { d.setDrawColor(INK2); d.setLineWidth(0.8); d.setLineDashPattern([3, 2], 0); const c = clipY(p.rr[0], p.rr[1]); d.line(c[0], c[1], c[2], c[3]); d.setLineDashPattern([], 0); }
    if (p.mle) { d.setDrawColor(STEP); d.setLineWidth(1.3); const c = clipY(p.mle[0], p.mle[1]); d.line(c[0], c[1], c[2], c[3]); }
    d.setFillColor(INK); p.points.forEach(q => d.circle(x(q.x), yv(q.y), 1.9, 'F'));
    font(d, 6.8, 'normal', MUTED);
    d.text(`age (${unit}), log scale · % failed · points: the failures · solid: maximum likelihood · dashed: the plot’s own line`, f.x + L, top + H + 20);
  });
}

export function wearBlocks(unit: string, w: WeibullFit, hasRunning: boolean, tiles: LeanTile[], o: { cp?: number; cf?: number; gbp: (n: number) => string; dayUnits?: number; age?: number; ahead?: number }): Block[] {
  const out: Block[] = [leanHead('How the part wears'), leanTiles(tiles)];
  out.push(text({ text: weibullSays(unit, w).text, size: 9, colour: INK2, after: 4 }));
  const ins = weibullInsights(unit, w, hasRunning);
  if (ins.length) out.push(...leanInsights(ins));
  const plot = weibullPlotBlock(w, unit);
  if (plot && w.beta !== undefined) out.push(plot);
  out.push(...pairRows(weibullRows(unit, w)));
  if (o.age !== undefined && o.ahead !== undefined) { const c = conditionalSays(unit, w, o.age, o.ahead); if (c) out.push(text({ text: c, size: 8.5, colour: INK2, after: 4 })); }
  const rep = replaceSays(unit, w, o.cp, o.cf, o.gbp, o.dayUnits);
  if (rep.text) out.push(text({ text: rep.text, size: 8.5, colour: INK2, style: rep.missing.length ? 'normal' : 'bold', after: 4 }));
  out.push(text({ text: 'One count is one failure mode; ages are in the unit named; a first guess is revised as failures accrue. Not claimed: IEC 61649 (its text has not been read).', size: 7.8, colour: MUTED, after: 4 }));
  return out;
}
