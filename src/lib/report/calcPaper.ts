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
import { INK2, MUTED, LINE, BRAND, WARN, san } from '../reportKit';
import { askedFields, beforeRun, inputSaid, studyCalc, tilesSince } from '../../tools/calc/calc';
import type { CalcPicture } from '../../tools/calc/types';
import { font, label, rows, text, wrap, type Row } from './blocks';
import { leanHead } from './lean';
import type { Block, Frame } from './flow';

/** A table whose cells wrap inside their columns, a row as tall as its longest cell. */
function table(header: string[], body: string[][], shares: number[]): Block {
  const LH = 9.5;
  const cells = (f: Frame, row: string[], bold: boolean) => row.map((c, i) => wrap(f.doc, c, f.w * shares[i] - 8, 8, bold ? 'bold' : 'normal'));
  const make = (row: string[], bold: boolean): Row => ({
    h: f => Math.max(...cells(f, row, bold).map(l => l.length), 1) * LH + 5,
    draw: (fr, y) => {
      let x = fr.x;
      cells(fr, row, bold).forEach((ls, i) => {
        font(fr.doc, 8, bold ? 'bold' : 'normal', bold ? MUTED : INK2);
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
  const H = 190;
  return rows({ rows: [{
    h: () => H + 18,
    draw: (fr: Frame, y: number) => {
      const d = fr.doc, L = 44, R = 12, T = 14, B = 26, w = fr.w - L - R, h = H - T - B;
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
      font(d, 7, 'bold', MUTED); t(pic.x.label, fr.x + L + w / 2, y + H + 8, 'center'); t(pic.y.label, fr.x, y + 8);
    },
  }], after: 's' });
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
        : f.default !== undefined && String(f.default) === String(v[f.id]) && f.chosen ? 'Faultline’s starting point — a choice' : 'typed';
    return [f.label, inputSaid(f, v), src];
  });
  const before = beforeRun(def, agreed);

  if (r) {
    const more = [...(r.more ?? []), ...run.problems.filter(p => !p.block).map(p => `Check: ${p.say}`)];
    if (more.length) { out.push(label('What else it says')); for (const m of more) out.push(text({ text: m, size: 8.5, colour: m.startsWith('Check:') ? WARN : INK2, after: 2 })); }
    if (r.picture) { out.push(leanHead(r.picture.title)); out.push(pictureBlock(r.picture)); out.push(text({ text: r.picture.caption, size: 8, colour: MUTED, after: 4 })); }
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
    const changed = def.inputs.filter(f => String(b.inputs[f.id] ?? '') !== String(agreed.inputs[f.id] ?? ''));
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
