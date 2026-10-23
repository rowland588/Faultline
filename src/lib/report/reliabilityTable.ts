/* A RELIABILITY STUDY ON PAPER (docs/TOOLKIT.md, tool 13; lib/ie/reliability)
 * — what its page shows, drawn for print: the events against watched hours
 * (the step line as they came, the dashed line the rate overall), the day by
 * day table, what the events were, and the commentary with who wrote it and
 * when. Grey and ink only: the MTBF's colour is the band's and the tiles',
 * against what was agreed. Rows break between pages, never inside one.
 *
 * Every figure is the module's; this only draws. */
import type { Remark } from '../study';
import { plural, span, type RelFigures, type RelRow } from '../../tools/reliability/reliability';
import { niceDay, isoDay } from '../weeks';
import { INK, INK2, LINE, MUTED } from '../reportKit';
import { box, font, rows, text, wrap, SIZE, type Row } from './blocks';
import type { Block } from './flow';

const T = 8.5, LH = 11;
const STEP = '#0c7489';

const niceStep = (max: number, parts = 4): number => {
  const raw = max / parts, p = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9))), m = raw / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

/** The events against watched hours — a straight line a steady rate. */
export function relChartBlock(f: RelFigures, event: string): Block | undefined {
  if (!f.n || f.hours <= 0) return undefined;
  const HT = 150;
  return box(() => HT + 20, (fr, y) => {
    const d = fr.doc;
    const L = 26, B = 18, top = y + 6, H = HT - B - 6, W = fr.w - L - 6;
    const x = (h: number) => fr.x + L + (h / f.hours) * W, yv = (n: number) => top + (1 - n / Math.max(f.n, 1)) * H;
    const ys = Math.max(1, Math.round(niceStep(f.n))), xs = niceStep(f.hours);
    for (let v = 0; v <= f.n; v += ys) {
      d.setDrawColor(LINE); d.setLineWidth(0.5); d.line(fr.x + L, yv(v), fr.x + L + W, yv(v));
      font(d, 6.5, 'normal', MUTED); d.text(String(v), fr.x + L - 4, yv(v) + 2.2, { align: 'right' });
    }
    for (let v = 0; v <= f.hours + 1e-9; v += xs) { font(d, 6.5, 'normal', MUTED); d.text(String(+v.toFixed(2)), x(v), top + H + 9, { align: 'center' }); }
    /* the rate overall, dashed */
    d.setDrawColor(INK2); d.setLineWidth(0.6); d.setLineDashPattern([3, 2], 0);
    d.line(x(0), yv(0), x(f.hours), yv(f.n)); d.setLineDashPattern([], 0);
    /* the events as they came */
    d.setDrawColor(STEP); d.setLineWidth(1.2);
    let px = x(0), py = yv(0);
    for (const p of f.points) { d.line(px, py, x(p.h), py); d.line(x(p.h), py, x(p.h), yv(p.n)); px = x(p.h); py = yv(p.n); }
    d.line(px, py, x(f.hours), py);
    font(d, 6.5, 'normal', MUTED);
    d.text(`hours watched · the step: ${plural(event)} as they came · dashed: the rate overall`, fr.x + L, top + H + 18);
  });
}

/** Day by day — watched, events, MTBF — and all of it. */
export function relDaysBlocks(f: RelFigures, title = 'EVENTS'): Block[] {
  if (!f.days.length) return [];
  const cols = (w: number) => ({ day: w * 0.34, each: (w * 0.66) / 3 });
  const cell = (fr: Parameters<Row['draw']>[0], y: number, vals: string[], bold = false, colour = INK2) => {
    const c = cols(fr.w);
    font(fr.doc, T, bold ? 'bold' : 'normal', bold ? INK : colour);
    fr.doc.text(vals[0], fr.x, y);
    vals.slice(1).forEach((v, i) => fr.doc.text(v, fr.x + c.day + (i + 1) * c.each - 4, y, { align: 'right' }));
  };
  const header: Row = {
    h: () => 16,
    draw: (fr, y) => {
      const c = cols(fr.w);
      font(fr.doc, SIZE.tiny, 'bold', MUTED);
      fr.doc.text('DAY', fr.x, y + 10);
      ['WATCHED', title.toUpperCase(), 'MTBF'].forEach((h, i) => fr.doc.text(h, fr.x + c.day + (i + 1) * c.each - 4, y + 10, { align: 'right' }));
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.6); fr.doc.line(fr.x, y + 14.5, fr.x + fr.w, y + 14.5);
    },
  };
  const line = (fr: Parameters<Row['draw']>[0], y: number) => { fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4); fr.doc.line(fr.x, y + LH + 4.5, fr.x + fr.w, y + LH + 4.5); };
  const body: Row[] = [
    ...f.days.map(d => ({ h: () => LH + 5, draw: (fr: Parameters<Row['draw']>[0], y: number) => { cell(fr, y + 4 + T * 0.92, [niceDay(d.day, { weekday: 'short' }), span(d.hours), String(d.n), d.mtbfH !== undefined ? span(d.mtbfH) : `none in ${span(d.hours)}`]); line(fr, y); } })),
    { h: () => LH + 5, draw: (fr, y) => cell(fr, y + 4 + T * 0.92, ['All', span(f.hours), String(f.n), f.mtbfH !== undefined ? span(f.mtbfH) : '—'], true) },
  ];
  return [rows({ header, rows: body, after: 's' })];
}

/** What the events were — each kind's count, share and its own MTBF. */
export function relKindsBlocks(f: RelFigures): Block[] {
  if (!f.kinds.length) return [];
  return [rows({
    rows: f.kinds.map(k => ({
      h: () => LH + 5,
      draw: (fr, y) => {
        const ty = y + 4 + T * 0.92, bw = fr.w * 0.3, bx = fr.x + fr.w * 0.3;
        font(fr.doc, T, 'bold', INK); fr.doc.text(wrap(fr.doc, k.kind, fr.w * 0.28, T, 'bold')[0] ?? '', fr.x, ty);
        fr.doc.setFillColor('#edf1f1'); fr.doc.rect(bx, y + 5, bw, 6, 'F');
        fr.doc.setFillColor('#3c474c'); fr.doc.rect(bx, y + 5, Math.max(0.8, bw * k.share), 6, 'F');
        font(fr.doc, T, 'normal', INK2); fr.doc.text(`${k.n} · ${Math.round(k.share * 100)}% · one every ${span(k.mtbfH)}`, fr.x + fr.w, ty, { align: 'right' });
        fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4); fr.doc.line(fr.x, y + LH + 4.5, fr.x + fr.w, y + LH + 4.5);
      },
    })),
    after: 's',
  })];
}

/** The commentary, oldest first, each with its day and who wrote it. */
export function remarksBlocks(remarks: readonly Remark[] = []): Block[] {
  const live = remarks.filter(r => !r.struck).sort((a, b) => a.at - b.at);
  if (!live.length) return [text({ text: 'Nothing written yet.', size: 8.5, colour: MUTED, after: 4 })];
  return live.flatMap(r => [
    text({ text: r.text, size: 9, colour: INK2, after: 1 }),
    text({ text: `${niceDay(isoDay(r.at))} ${new Date(r.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}${r.by ? ` · ${r.by}` : ''}${r.editedAt ? ' · edited' : ''}`, size: 7.5, colour: MUTED, after: 5 }),
  ]);
}

const RED = '#c4281c', AMBER = '#b45309', GREEN = '#15803d';
const fmt = (n: number): string => `£${n >= 100 ? Math.round(n).toLocaleString('en-GB') : n.toFixed(2)}`;

/** EVERY THING COUNTED SIDE BY SIDE — a row each: its taps, MTBF and range,
 *  its rate, against its target (in its colour, with its words) and what it
 *  costs an hour of running. */
export function relTogetherBlocks(rs: readonly RelRow[]): Block[] {
  if (!rs.length) return [];
  const heads = ['COUNTED', 'TAPS', 'MTBF', '90% SURE', 'AN HOUR', 'AGAINST', '£ AN HOUR'];
  const cols = (w: number) => [0, w * 0.2, w * 0.28, w * 0.39, w * 0.52, w * 0.64, w * 0.9].map((x, i) => ({ x, right: i > 0 && i !== 5 }));
  const at = (w: number, i: number) => { const c = cols(w); const next = i + 1 < c.length ? c[i + 1].x : w; return c[i].right ? next - 4 : c[i].x; };
  const againstLines = (fr: Parameters<Row['draw']>[0], r: RelRow) => wrap(fr.doc, r.against, fr.w * 0.25 - 6, T);
  const header: Row = {
    h: () => 16,
    draw: (fr, y) => {
      font(fr.doc, SIZE.tiny, 'bold', MUTED);
      heads.forEach((h, i) => fr.doc.text(h, fr.x + at(fr.w, i), y + 10, cols(fr.w)[i].right ? { align: 'right' } : undefined));
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.6); fr.doc.line(fr.x, y + 14.5, fr.x + fr.w, y + 14.5);
    },
  };
  const body: Row[] = rs.map(r => ({
    h: fr => 5 + Math.max(1, againstLines(fr, r).length) * LH + 2,
    draw: (fr, y) => {
      const ty = y + 4 + T * 0.92;
      const vals = [r.title, String(r.n), r.mtbf, r.range, r.rate, '', r.costPerH !== undefined ? fmt(r.costPerH) : '—'];
      vals.forEach((v, i) => {
        if (i === 5) return;
        font(fr.doc, T, i === 0 || i === 2 ? 'bold' : 'normal', i === 0 || i === 2 ? INK : INK2);
        fr.doc.text(v, fr.x + at(fr.w, i), ty, cols(fr.w)[i].right ? { align: 'right' } : undefined);
      });
      const colour = r.tone === 'r' ? RED : r.tone === 'a' ? AMBER : r.tone === 'g' ? GREEN : INK2;
      font(fr.doc, T, r.tone === 'n' ? 'normal' : 'bold', colour);
      fr.doc.text(againstLines(fr, r), fr.x + at(fr.w, 5), ty);
      const h = 5 + Math.max(1, againstLines(fr, r).length) * LH + 2;
      fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4); fr.doc.line(fr.x, y + h - 0.5, fr.x + fr.w, y + h - 0.5);
    },
  }));
  return [rows({ header, rows: body, after: 's' })];
}
