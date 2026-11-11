/* A CALCULATION ON PAPER — one generic page for every calculator (knowledge/specs/FC-235-calculators.md, The report).
 *
 * Built from the SAME result the screen draws (tools/calc/calc, the definition's compute), never a second reading of it: the
 * band with the verdict, the tiles with what moved since the saved before, the sentence (lib/studiesPdf prints it under "What
 * it says"), then here — what else it says and the checks, the picture where the definition has one, the figures put in with
 * their units and where each came from (typed, the line's, or Faultline's own starting point), how it was worked out, the money
 * or the sentence saying what to add, the saved before and what changed, and what it does not say. Laid out by the report engine
 * (docs/REPORTS.md): every block measures itself with the real font. */
import type { LeanTile, LeanTone } from '../lean';
import type { ToolStudy } from '../study';
import { INK2, MUTED, LINE, BRAND, WARN, SURF2, san } from '../reportKit';
import { askedFields, beforeRun, inputSaid, studyCalc, tilesSince } from '../../tools/calc/calc';
import type { CalcBars, CalcChart, CalcHands, CalcPicture } from '../../tools/calc/types';
import { symbolShape } from '../../tools/flow/symbols';
import { font, label, rows, text, wrap, type Row } from './blocks';
import { leanHead } from './lean';
import type { Block, Frame } from './flow';

/** A table whose cells wrap inside their columns, a row as tall as its longest cell. */
export function table(header: string[], body: string[][], shares: number[]): Block {
  const LH = 9.5;
  const cells = (f: Frame, row: string[], bold: boolean) => row.map((c, i) => wrap(f.doc, c, f.w * shares[i] - 8, 8, bold ? 'bold' : 'normal'));
  const make = (row: string[], bold: boolean): Row => ({
    h: f => Math.max(...cells(f, row, bold).map(l => l.length), 1) * LH + 5,
    draw: (fr, y) => {
      let x = fr.x;
      /* the header row on a pale fill, as a Word table's (X7) */
      if (bold) { fr.doc.setFillColor(SURF2); fr.doc.rect(fr.x - 4, y, fr.w + 4, Math.max(...cells(fr, row, bold).map(l => l.length), 1) * LH + 3, 'F'); }
      cells(fr, row, bold).forEach((ls, i) => {
        font(fr.doc, 8, bold ? 'bold' : 'normal', bold ? INK2 : INK2);
        ls.forEach((l, k) => fr.doc.text(l, x, y + 8 + k * LH));
        x += fr.w * shares[i];
      });
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4);
      const h = Math.max(...cells(fr, row, bold).map(l => l.length), 1) * LH + 3;
      fr.doc.line(fr.x, y + h, fr.x + fr.w, y + h);
    },
  });
  return rows({ header: make(header, true), rows: body.map(b => make(b, false)), after: 'm' });
}

/** The picture the definition describes, drawn on the page — axes, the curve, guides with their words, dots with theirs. */
export function pictureBlock(pic: CalcPicture): Block {
  /* a drawing of a board (areas drawn) is given room to be read — the board is the picture */
  const H = pic.areas?.length ? 330 : 190, KEY = pic.legend?.length ? 14 : 0;
  return rows({ rows: [{
    h: () => H + 18 + KEY,
    draw: (fr: Frame, y: number) => {
      const d = fr.doc, L = 44, R = 12, T = 14, B = 26, aw = fr.w - L - R, ah = H - T - B;
      /* a drawing to scale (pic.aspect) takes the largest plot of its shape that fits, so one metre is one length across and up */
      const w = !pic.aspect ? aw : aw / ah > pic.aspect ? ah * pic.aspect : aw, h = !pic.aspect ? ah : aw / ah > pic.aspect ? ah : aw / pic.aspect;
      const xs = (x: number) => fr.x + L + ((x - pic.x.min) / (pic.x.max - pic.x.min)) * w;
      const ys = (v: number) => y + T + (1 - (v - pic.y.min) / (pic.y.max - pic.y.min)) * h;
      const right = (x: number) => xs(x) > fr.x + L + w * 0.62;
      const t = (s: string, x: number, yy: number, align: 'left' | 'right' | 'center' = 'left') => d.text(san(s), x, yy, { align });
      d.setLineWidth(0.4);
      font(d, 6.5, 'normal', MUTED);
      for (const v of pic.y.ticks) { d.setDrawColor(LINE); d.line(fr.x + L, ys(v), fr.x + L + w, ys(v)); t(pic.y.fmt(v), fr.x + L - 4, ys(v) + 2, 'right'); }
      for (const v of pic.x.ticks) t(pic.x.fmt(v), xs(v), y + T + h + 10, 'center');
      d.setDrawColor(MUTED); d.line(fr.x + L, y + T + h, fr.x + L + w, y + T + h); d.line(fr.x + L, y + T, fr.x + L, y + T + h);
      d.setLineDashPattern([2.5, 2], 0); d.setDrawColor(MUTED);
      for (const g of pic.horizontals) { d.line(fr.x + L, ys(g.y), fr.x + L + w, ys(g.y)); font(d, 6.5, 'bold', INK2); t(g.label, fr.x + L + w - 2, ys(g.y) - 2, 'right'); }
      for (const g of pic.verticals) { d.line(xs(g.x), y + T, xs(g.x), y + T + h); font(d, 6.5, 'bold', INK2); t(g.label, xs(g.x) + (right(g.x) ? -3 : 3), y + T + 8, right(g.x) ? 'right' : 'left'); }
      d.setLineDashPattern([], 0);
      /* the areas as drawn on the board, behind the paths, each with its name in its top-left corner */
      for (const a of pic.areas ?? []) {
        const ax = xs(Math.min(a.x0, a.x1)), ay = ys(Math.max(a.y0, a.y1)), aw2 = Math.abs(xs(a.x1) - xs(a.x0)), ah2 = Math.abs(ys(a.y1) - ys(a.y0));
        d.setFillColor(SURF2); d.setDrawColor(MUTED); d.setLineWidth(0.6); d.rect(ax, ay, aw2, ah2, 'FD');
        font(d, 6.5, 'normal', MUTED); t(a.label, ax + 3, ay + 8, 'left');
      }
      for (const l of pic.lines) {
        d.setDrawColor(l.mark === 'ink' ? INK2 : l.mark === 'muted' ? MUTED : BRAND); d.setLineWidth(1.6);
        if (l.dash) d.setLineDashPattern([3, 2.5], 0);
        for (let i = 1; i < l.points.length; i++) d.line(xs(l.points[i - 1][0]), ys(l.points[i - 1][1]), xs(l.points[i][0]), ys(l.points[i][1]));
        d.setLineDashPattern([], 0);
      }
      d.setLineWidth(0.4);
      for (const p of pic.dots) {
        d.setFillColor(INK2); d.circle(xs(p.x), ys(p.y), 2.2, 'F');
        if (p.label) { font(d, 6.5, 'bold', INK2); t(p.label, xs(p.x) + (right(p.x) ? -5 : 5), ys(p.y) + (p.y > 0.5 ? 9 : -4), right(p.x) ? 'right' : 'left'); }
      }
      font(d, 7, 'bold', MUTED); t(pic.x.label, fr.x + L + w / 2, pic.aspect ? y + T + h + 24 : y + H + 8, 'center'); t(pic.y.label, fr.x, y + 8);
      /* who each line is: its own stroke, then its name, in a row under the plot */
      if (pic.legend?.length) {
        let kx = fr.x + L; const ky = (pic.aspect ? y + T + h + 24 : y + H + 8) + 11;
        for (const k of pic.legend) {
          d.setDrawColor(k.mark === 'ink' ? INK2 : BRAND); d.setLineWidth(1.6);
          if (k.dash) d.setLineDashPattern([3, 2.5], 0);
          d.line(kx, ky - 2, kx + 16, ky - 2); d.setLineDashPattern([], 0);
          font(d, 7, 'bold', INK2); t(k.label, kx + 20, ky, 'left');
          kx += 20 + d.getTextWidth(san(k.label)) + 14;
        }
      }
    },
  }], after: 's' });
}

/** A chart of steps (the process flow chart, FC-003): the ASME symbols down the page joined by a line, each step's words and its two figures — one row to a step,
 *  the same description the screen draws. A row is as tall as its words. */
export function chartBlock(chart: CalcChart): Block {
  const R = 15;
  const wordsOf = (f: Frame, what: string) => wrap(f.doc, `${what}`, f.w - 44 - 110, 8.5);
  const head: Row = {
    h: () => 14,
    draw: (fr, y) => {
      font(fr.doc, 7.5, 'bold', MUTED);
      fr.doc.text(san(chart.head[0]), fr.x + 36, y + 9);
      fr.doc.text(san(chart.head[1]), fr.x + fr.w - 66, y + 9, { align: 'right' });
      fr.doc.text(san(chart.head[2]), fr.x + fr.w, y + 9, { align: 'right' });
    },
  };
  const row = (r: CalcChart['rows'][number]): Row => ({
    h: f => Math.max(R, wordsOf(f, `${r.n}. ${san(r.what)}`).length * 10 + 5),
    draw: (fr, y) => {
      const d = fr.doc, hh = Math.max(R, wordsOf(fr, `${r.n}. ${san(r.what)}`).length * 10 + 5), cy = y + hh / 2;
      d.setDrawColor(MUTED); d.setLineWidth(0.8);
      if (r.n > 1) d.line(fr.x + 10, y, fr.x + 10, cy - 6);
      d.line(fr.x + 10, cy + 6, fr.x + 10, y + hh);
      const sh = symbolShape(r.symbol, fr.x + 10, cy, 5.5);
      d.setDrawColor(INK2); d.setLineWidth(r.symbol === 'O' ? 1.4 : 0.9); d.setFillColor('#ffffff');
      if ('circle' in sh) d.circle(sh.circle.cx, sh.circle.cy, sh.circle.r, 'FD');
      else { const [p0, ...rest] = sh.poly; d.lines(rest.map((p, i) => [p[0] - (i ? rest[i - 1][0] : p0[0]), p[1] - (i ? rest[i - 1][1] : p0[1])] as [number, number]), p0[0], p0[1], [1, 1], 'FD', true); }
      font(d, 5.5, 'bold', INK2); d.text(r.symbol, fr.x + 10, cy + 2, { align: 'center' });
      font(d, 8.5, 'normal', INK2);
      wordsOf(fr, `${r.n}. ${san(r.what)}`).forEach((l, k) => d.text(l, fr.x + 36, y + 9 + k * 10));
      font(d, 8.5, 'normal', INK2);
      d.text(san(r.time), fr.x + fr.w - 66, y + 9, { align: 'right' });
      if (r.distance) d.text(san(r.distance), fr.x + fr.w, y + 9, { align: 'right' });
      d.setDrawColor(LINE); d.setLineWidth(0.4); d.line(fr.x + 24, y + hh, fr.x + fr.w, y + hh);
    },
  });
  return rows({ header: head, rows: chart.rows.map(row), after: 'm' });
}

/** A two-handed chart (micro-movements, FC-233): a row to a moment, each element a box with its therblig's code in its hand's lane, its words and seconds beside — the same description the
 *  screen draws. Working motion has a heavy solid line, motion to question a dashed one, the rest a thin one. A row is as tall as its longest words. */
export function handsBlock(chart: CalcHands): Block {
  const NUMW = 18, SECW = 34, LH = 9, MIN = 24;
  const laneW = (f: Frame): number => (f.w - NUMW - SECW) / chart.lanes.length;
  const wordsOf = (f: Frame, what: string) => wrap(f.doc, what, laneW(f) - 36, 7.5);
  const hOf = (f: Frame, r: CalcHands['rows'][number]): number => Math.max(MIN, ...r.cells.map(c => wordsOf(f, san(c.what)).length * LH + 12));
  const head: Row = {
    h: () => 14,
    draw: (fr, y) => {
      font(fr.doc, 7.5, 'bold', MUTED);
      fr.doc.text(san(chart.head[0]), fr.x, y + 9);
      chart.lanes.forEach((l, i) => fr.doc.text(san(l), fr.x + NUMW + i * laneW(fr) + 2, y + 9));
      fr.doc.text(san(chart.head[1]), fr.x + fr.w, y + 9, { align: 'right' });
    },
  };
  const row = (r: CalcHands['rows'][number]): Row => ({
    h: f => hOf(f, r),
    draw: (fr, y) => {
      const d = fr.doc, hh = hOf(fr, r);
      font(d, 8, 'normal', MUTED); d.text(`${r.n}.`, fr.x, y + 12);
      for (const c of r.cells) {
        const x = fr.x + NUMW + c.lane * laneW(fr) + 2;
        d.setDrawColor(INK2); d.setFillColor('#ffffff');
        d.setLineWidth(c.style === 'working' ? 1.6 : c.style === 'question' ? 1 : 0.6);
        d.setLineDashPattern(c.style === 'question' ? [2.5, 1.8] : [], 0);
        d.roundedRect(x, y + 3, 22, 12, 1.5, 1.5, 'FD');
        d.setLineDashPattern([], 0);
        font(d, 6.5, 'bold', INK2); d.text(san(c.code), x + 11, y + 11, { align: 'center' });
        font(d, 6.5, 'normal', MUTED); d.text(san(c.sec), x + 11, y + 22, { align: 'center' });
        font(d, 7.5, 'normal', INK2);
        wordsOf(fr, san(c.what)).forEach((l, k) => d.text(l, x + 26, y + 9 + k * LH));
      }
      font(d, 8, 'normal', INK2); d.text(san(r.sec), fr.x + fr.w, y + 12, { align: 'right' });
      d.setDrawColor(LINE); d.setLineWidth(0.4); d.line(fr.x, y + hh, fr.x + fr.w, y + hh);
    },
  });
  return rows({ header: head, rows: chart.rows.map(row), after: 'm' });
}

/** A bar a row on paper, the second figure's bar beside the first on its own scale — the same description the screen draws. */
export function barsBlock(b: CalcBars): Block {
  const NAMEW = 0.3, LH = 11;
  const maxA = Math.max(...b.rows.map(r => r.a), 0) || 1;
  const maxB = Math.max(...b.rows.map(r => r.b ?? 0), 0) || 1;
  const rowH = b.b ? LH * 2 + 6 : LH + 6;
  const row = (r: CalcBars['rows'][number]): Row => ({
    h: () => rowH,
    draw: (fr, y) => {
      const d = fr.doc, nameW = fr.w * NAMEW, barX = fr.x + nameW + 6, barW = (fr.w - nameW - 6) * 0.5;
      font(d, 8, 'bold', INK2); d.text(san(r.label), fr.x, y + 9);
      if (r.note) { font(d, 6.5, 'normal', MUTED); d.text(san(r.note), fr.x, y + 18); }
      d.setFillColor(BRAND); d.rect(barX, y + 3, Math.max(0.5, (barW * r.a) / maxA), 7, 'F');
      font(d, 7.5, 'normal', INK2); d.text(san(r.aText), barX + barW + 6, y + 9);
      if (b.b) {
        d.setFillColor(MUTED); d.rect(barX, y + 3 + LH, Math.max(0.5, (barW * (r.b ?? 0)) / maxB), 7, 'F');
        font(d, 7.5, 'normal', MUTED); d.text(san(r.bText ?? ''), barX + barW + 6, y + 9 + LH);
      }
      d.setDrawColor(LINE); d.setLineWidth(0.4); d.line(fr.x, y + rowH - 1, fr.x + fr.w, y + rowH - 1);
    },
  });
  const head: Row = { h: () => 12, draw: (fr, y) => { font(fr.doc, 7.5, 'bold', MUTED); fr.doc.text(san(`Workstation · ${b.a}${b.b ? ` · ${b.b}` : ''}`), fr.x, y + 8); } };
  return rows({ header: head, rows: b.rows.map(row), after: 'm' });
}

export interface CalcPaperParts {
  eyebrow: string;
  verdict: { text: string; tone: LeanTone };
  tiles: LeanTile[];
  closing: { text: string; tone: LeanTone };
  body: Block[];
}

/** Everything a calculation prints, from its record — undefined when its calculator is not in this build or cannot be worked out. */
export function calcPaperParts(s: ToolStudy): CalcPaperParts | undefined {
  const c = studyCalc(s);
  if (!c) return undefined;
  const { def, agreed, run } = c;
  const r = run.result;
  const v = run.values;
  const out: Block[] = [];

  /* the figures put in, with their units and where each came from — printed even when the answer cannot be worked out yet */
  const figs = askedFields(def, v).filter(f => f.kind !== 'text' || v[f.id]).map(f => {
    const given = v[f.id] !== undefined && v[f.id] !== '';
    const src = !given ? (f.optional ? 'not given' : 'needed')
      : agreed.src?.[f.id] ? `from ${agreed.src[f.id]}`
        : f.default !== undefined && String(f.default) === String(v[f.id]) && f.chosen ? 'the app’s starting point — a choice' : 'typed';
    return [f.label, inputSaid(f, v), src];
  });
  const before = beforeRun(def, agreed);

  if (r) {
    const more = [...(r.more ?? []), ...run.problems.filter(p => !p.block).map(p => `Check: ${p.say}`)];
    if (more.length) { out.push(label('What else it says')); for (const m of more) out.push(text({ text: m, size: 8.5, colour: m.startsWith('Check:') ? WARN : INK2, after: 2 })); }
    if (r.bars) { out.push(leanHead(r.bars.title)); out.push(barsBlock(r.bars)); out.push(text({ text: r.bars.caption, size: 8, colour: MUTED, after: 4 })); }
    if (r.picture) { out.push(leanHead(r.picture.title)); out.push(pictureBlock(r.picture)); out.push(text({ text: r.picture.caption, size: 8, colour: MUTED, after: 4 })); }
    if (r.hands) { out.push(leanHead(r.hands.title)); out.push(handsBlock(r.hands)); out.push(text({ text: r.hands.caption, size: 8, colour: MUTED, after: 4 })); }
    if (r.chart) { out.push(leanHead(r.chart.title)); out.push(chartBlock(r.chart)); out.push(text({ text: r.chart.caption, size: 8, colour: MUTED, after: 4 })); }
  } else out.push(text({ text: `Not worked out yet: ${run.problems.filter(p => p.block).map(p => p.say).join(' ')}`, size: 9, colour: WARN, after: 4 }));

  out.push(leanHead('The figures put in'));
  out.push(table(['Figure', 'Put in', 'Where it came from'], figs, [0.46, 0.26, 0.28]));

  if (r) {
    out.push(leanHead('How it is worked out'));
    out.push(table(['Step', 'Working', 'Method'], r.working.map(w => [w.label, w.value, w.note ?? '']), [0.26, 0.5, 0.24]));
    out.push(leanHead('In money'));
    if (r.money?.text) out.push(text({ text: r.money.text, size: 9, style: 'bold', colour: INK2, after: 3 }));
    if (r.money?.figures?.length) out.push(table(['Figure', 'Value'], r.money.figures, [0.62, 0.38]));
    for (const m of r.money?.missing ?? []) out.push(text({ text: m, size: 8, colour: MUTED, after: 2 }));
  }

  const b = agreed.before;
  if (before && b) {
    out.push(leanHead('Before → after'));
    out.push(text({ text: before.result ? `Before (figures saved ${new Date(b.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}${b.by ? ` by ${b.by}` : ''}): ${before.result.sentence}` : 'The saved before cannot be worked out any more.', size: 9, colour: INK2, after: 3 }));
    const changed = def.inputs.filter(f => !f.hidden && String(b.inputs[f.id] ?? '') !== String(agreed.inputs[f.id] ?? ''));
    if (changed.length) out.push(table(['Figure', 'Before', 'Now'], changed.map(f => [f.label, inputSaid(f, before.values), inputSaid(f, v)]), [0.46, 0.27, 0.27]));
    else out.push(text({ text: 'No figure has changed since it was saved.', size: 8, colour: MUTED, after: 3 }));
  }

  if (r) {
    out.push(leanHead('What this does not say'));
    for (const cv of r.caveats) out.push(text({ text: cv, size: 8.5, colour: INK2, indent: 10, bullet: '·', after: 2 }));
  }

  const tiles = r ? tilesSince(r.tiles, before?.result?.tiles) : [];
  return {
    eyebrow: def.title,
    verdict: r ? { text: r.verdict, tone: r.tone } : { text: 'Figures needed', tone: 'n' },
    tiles,
    closing: r ? { text: r.closing, tone: r.tone } : { text: 'Give the figures it needs and the answer is worked out.', tone: 'n' },
    body: out,
  };
}
