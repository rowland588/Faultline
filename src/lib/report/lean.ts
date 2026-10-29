/* THE LEAN PAGE ON PAPER (docs/LEAN-PAGE.md) — the same parts the screen
 * draws (ui/Lean), from the same model (lib/lean), as report-engine blocks
 * (docs/REPORTS.md): each measures itself with the real font, none is cut.
 *
 * The band and the closing line light on paper — a pale fill, a teal edge,
 * graphite words (reportKit paperBand: a dark band spends toner and prints
 * streaky; the screen keeps its dark band); a tile's top edge and its
 * number in a state colour only when abnormal or met; a change drawn with a
 * triangle and its words (green better, red worse, grey the same), so it
 * survives a black-and-white print. */
import { changeTone, type LeanAction, type LeanInsight, type LeanPage, type LeanTile, type LeanTone, type LeanTrend } from '../lean';
import { BRAND, DANGER, INK, INK2, LINE, MUTED, OK, WARN, paperBand, san } from '../reportKit';
import { SIZE, font, rows, text, wrap, type Row } from './blocks';
import type { Block, Frame } from './flow';

const LINE2 = '#c7d1d2', GREY = '#6b7588', BAR = '#98a5ab';
const TONE: Record<LeanTone, string> = { r: DANGER, a: WARN, g: OK, n: GREY };
const wash = (t: LeanTone): string | undefined => (t === 'g' ? '#f1f8f3' : t === 'r' ? '#fcf1f0' : undefined);

/* -------------------------------------------------------------- the band */

/** THE BAND — what, where, and the day, the shift, the rate and when printed. */
export function leanBand(p: LeanPage, printed: string): Block {
  const facts: [string, string][] = [...p.facts, ['Printed', printed]];
  const FW = 168;
  const padOf = (f: Frame) => (f.density === 'compact' ? 9 : 12);
  const lay = (f: Frame) => {
    const PAD = padOf(f);
    const lw = f.w - FW - PAD * 3;
    const title = wrap(f.doc, p.title, lw, 19, 'bold');
    const sub = p.sub ? wrap(f.doc, p.sub, lw, 9.5, 'bold') : [];
    const fl = facts.map(([k, v]) => ({ k, v: wrap(f.doc, v, FW - 50, 8, 'bold') }));
    /* the verdict whole, however long — a long machine's name wraps the pill
       to a second line rather than losing the end of the finding */
    const said = p.verdict ? wrap(f.doc, p.verdict.text, lw - 16, 8.5, 'bold') : [];
    const pill = said.length ? 15 + (said.length - 1) * 10.5 : 0;
    const left = PAD + 9 + 4 + title.length * 22 + sub.length * 12 + (pill ? pill + 7 : 0) + PAD - 2;
    const right = PAD + fl.reduce((n, x) => n + Math.max(1, x.v.length) * 10 + 3, 0) + PAD - 4;
    return { lw, title, sub, fl, said, pill, h: Math.max(left, right, 64) };
  };
  return {
    height: f => lay(f).h + (f.density === 'compact' ? 7 : 10),
    after: f => (f.density === 'compact' ? 7 : 10),
    draw: (f, y) => {
      const d = f.doc, l = lay(f), PAD = padOf(f);
      paperBand(d, f.x, y, f.w, l.h);
      let yy = y + PAD + 7;
      font(d, 7.5, 'bold', MUTED); d.text(san(p.eyebrow.toUpperCase()), f.x + PAD, yy);
      yy += 6;
      font(d, 19, 'bold', INK); l.title.forEach(s => { yy += 19; d.text(s, f.x + PAD, yy); yy += 3; });
      font(d, 9.5, 'bold', INK2); l.sub.forEach(s => { yy += 12; d.text(s, f.x + PAD, yy); });
      if (p.verdict && l.said.length) {
        font(d, 8.5, 'bold', '#ffffff');
        const tw = Math.min(l.lw, Math.max(...l.said.map(s => d.getTextWidth(s))) + 16);
        const fill = TONE[p.verdict.tone];
        d.setFillColor(fill); d.roundedRect(f.x + PAD, yy + 7, tw, l.pill, 7.5, 7.5, 'F');
        l.said.forEach((s, i) => d.text(s, f.x + PAD + 8, yy + 17.5 + i * 10.5));
      }
      /* the facts on the right */
      let fy = y + PAD + 7;
      const fx = f.x + f.w - FW - PAD;
      l.fl.forEach(({ k, v }) => {
        font(d, 7.5, 'bold', MUTED); d.text(san(k), fx, fy);
        font(d, 8, 'bold', INK); v.forEach((s, i) => d.text(s, fx + 50, fy + i * 10));
        fy += Math.max(1, v.length) * 10 + 3;
      });
    },
  };
}

/* ------------------------------------------------------------- the tiles */

/** A small triangle — up or down — or an equals sign, beside a change. */
function triangle(f: Frame, x: number, y: number, dir: 'up' | 'down' | 'same', colour: string): void {
  const d = f.doc;
  d.setFillColor(colour); d.setDrawColor(colour);
  if (dir === 'up') d.triangle(x, y, x + 6, y, x + 3, y - 5, 'F');
  else if (dir === 'down') d.triangle(x, y - 5, x + 6, y - 5, x + 3, y, 'F');
  else { d.setLineWidth(0.9); d.line(x, y - 3.5, x + 6, y - 3.5); d.line(x, y - 1.5, x + 6, y - 1.5); }
}

/** THE TILES — big numbers across the page, each of what it should be and
 *  since last time. Five across at most; more wrap to a second row. */
export function leanTiles(tiles: LeanTile[]): Block {
  const GAP = 8, PER = Math.min(5, Math.max(1, tiles.length));
  const lay = (f: Frame) => {
    const tw = (f.w - GAP * (PER - 1)) / PER;
    const each = tiles.map(t => ({
      t, of: t.of ? wrap(f.doc, t.of, tw - 16, 7.5) : [], ch: t.change ? wrap(f.doc, t.change.text, tw - 26, 7.5, 'bold') : [],
      v: wrap(f.doc, t.v, tw - 16, 17, 'bold'),
    }));
    const pad = f.density === 'compact' ? 7 : 10;
    const hOf = (e: typeof each[number]) => pad + 9 + e.v.length * 19 + e.of.length * 9.5 + (e.ch.length ? 4 + e.ch.length * 9.5 : 0) + pad - 1;
    const rowsOf: typeof each[] = [];
    for (let i = 0; i < each.length; i += PER) rowsOf.push(each.slice(i, i + PER));
    const rh = rowsOf.map(r => Math.max(...r.map(hOf)));
    return { tw, rowsOf, rh, pad, h: rh.reduce((a, b) => a + b, 0) + GAP * (rowsOf.length - 1) };
  };
  return {
    height: f => (tiles.length ? lay(f).h + (f.density === 'compact' ? 8 : 12) : 0),
    after: f => (f.density === 'compact' ? 8 : 12),
    draw: (f, y) => {
      const d = f.doc, l = lay(f);
      let ry = y;
      l.rowsOf.forEach((r, ri) => {
        const h = l.rh[ri];
        r.forEach((e, i) => {
          const x = f.x + i * (l.tw + GAP), tone = e.t.tone ?? 'n';
          const fill = wash(tone);
          d.setDrawColor(LINE); d.setLineWidth(0.6);
          if (fill) { d.setFillColor(fill); d.roundedRect(x, ry, l.tw, h, 4, 4, 'FD'); } else d.roundedRect(x, ry, l.tw, h, 4, 4, 'S');
          d.setFillColor(tone === 'n' ? LINE2 : TONE[tone]); d.rect(x + 0.3, ry + 0.3, l.tw - 0.6, 3, 'F');
          let yy = ry + l.pad + 7;
          font(d, 6.8, 'bold', MUTED); d.text(san(e.t.k.toUpperCase()), x + 8, yy);
          font(d, 17, 'bold', tone === 'r' || tone === 'a' ? TONE[tone] : e.t.v === '—' ? GREY : INK);
          e.v.forEach(s => { yy += 19; d.text(s, x + 8, yy - 2); });
          font(d, 7.5, 'normal', INK2);
          e.of.forEach(s => { yy += 9.5; d.text(s, x + 8, yy); });
          if (e.t.change && e.ch.length) {
            const c = TONE[changeTone(e.t.change)];
            yy += 4;
            triangle(f, x + 8, yy + 8.5, e.t.change.dir, c);
            font(d, 7.5, 'bold', c);
            e.ch.forEach(s => { yy += 9.5; d.text(s, x + 18, yy); });
          }
        });
        ry += h + GAP;
      });
    },
  };
}

/* ------------------------------------------------------------- a heading */

/** A panel's heading on paper — bold, a rule under it, kept with what follows. */
export function leanHead(title: string, aside?: string): Block {
  return {
    keepWithNext: true,
    height: f => (f.density === 'compact' ? 17 : 20),
    draw: (f, y) => {
      const d = f.doc, k = f.density === 'compact' ? 2 : 0;
      font(d, 11, 'bold', INK); d.text(san(title), f.x, y + 11 - k);
      if (aside) { font(d, 7.5, 'normal', MUTED); d.text(san(aside), f.x + f.w, y + 11 - k, { align: 'right' }); }
      const ry = y + 15.5 - k;
      const accent = Math.min(48, f.w * 0.22);
      d.setDrawColor(BRAND); d.setLineWidth(2); d.line(f.x, ry, f.x + accent, ry);
      d.setDrawColor(LINE); d.setLineWidth(0.7); d.line(f.x + accent, ry, f.x + f.w, ry);
    },
  };
}

/* ------------------------------------------------------------- the trend */

const short = (n: number): string => (n >= 10_000 ? `${Math.round(n / 1000)}k` : n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(n)));
const nice = (max: number): number => {
  if (max <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(max));
  const m = max / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
};

/** THE TREND — bars against the dashed mark of what each should have been. */
export function leanTrend(t: LeanTrend, height = 150): Block {
  return {
    height: () => height + 18,
    draw: (f, y) => {
      const d = f.doc;
      const L = 28, B = 18, top = y + 10, H = height - B - 10;
      const max = nice(Math.max(...t.points.map(p => Math.max(p.v, p.target ?? 0)), 1) * 1.05);
      const n = t.points.length, slot = (f.w - L - 4) / n, bw = Math.min(26, slot * 0.6);
      const yv = (v: number) => top + (1 - v / max) * H;
      const cx = (i: number) => f.x + L + slot * i + slot / 2;
      [0, 0.5, 1].forEach(k => {
        d.setDrawColor(LINE); d.setLineWidth(0.5); d.line(f.x + L, yv(max * k), f.x + f.w, yv(max * k));
        font(d, 6.5, 'normal', MUTED); d.text(short(max * k), f.x + L - 4, yv(max * k) + 2.2, { align: 'right' });
      });
      t.points.forEach((p, i) => {
        d.setFillColor(p.now ? INK2 : BAR);
        d.rect(cx(i) - bw / 2, yv(p.v), bw, Math.max(0.8, yv(0) - yv(p.v)), 'F');
        /* the figure inside the bar's top when it is tall enough — clear of the dashed mark above */
        const inside = yv(0) - yv(p.v) > 14;
        font(d, 6.5, 'bold', inside ? (p.now ? '#ffffff' : INK) : p.now ? INK : INK2); d.text(short(p.v), cx(i), inside ? yv(p.v) + 8.5 : yv(p.v) - 2.5, { align: 'center' });
        font(d, 6.5, p.now ? 'bold' : 'normal', p.now ? INK : MUTED);
        d.text(wrap(d, p.label, slot - 2, 6.5, p.now ? 'bold' : 'normal')[0] ?? '', cx(i), top + H + 10, { align: 'center' });
      });
      const marks = t.points.map((p, i) => (p.target !== undefined ? [cx(i), yv(p.target)] as const : null)).filter((m): m is readonly [number, number] => !!m);
      d.setDrawColor(INK); d.setLineDashPattern([3, 2], 0);
      d.setLineWidth(0.6);
      for (let k = 1; k < marks.length; k++) d.line(marks[k - 1][0], marks[k - 1][1], marks[k][0], marks[k][1]);
      d.setLineWidth(1.4);
      t.points.forEach((p, i) => { if (p.target !== undefined) d.line(cx(i) - bw / 2 - 2, yv(p.target), cx(i) + bw / 2 + 2, yv(p.target)); });
      d.setLineDashPattern([], 0);
      /* the legend */
      const ly = y + height + 10;
      d.setFillColor(INK2); d.rect(f.x + L, ly - 6, 10, 7, 'F');
      font(d, 7, 'normal', INK2); d.text(san(t.bar), f.x + L + 14, ly);
      if (t.mark) {
        const mx = f.x + L + 14 + d.getTextWidth(san(t.bar)) + 14;
        d.setDrawColor(INK); d.setLineWidth(1.2); d.setLineDashPattern([3, 2], 0); d.line(mx, ly - 2.5, mx + 12, ly - 2.5); d.setLineDashPattern([], 0);
        d.text(san(t.mark), mx + 16, ly);
      }
    },
  };
}

/** Two boxes side by side, each half the page — the trend beside the picture.
 *  Either alone takes the whole width. */
export function pair(a: Block | undefined, b: Block | undefined, gapW = 14): Block | undefined {
  if (!a || !b) return a ?? b;
  const half = (f: Frame, right: boolean): Frame => {
    const w = (f.w - gapW) / 2;
    return { ...f, x: right ? f.x + w + gapW : f.x, w };
  };
  return {
    height: f => Math.max(a.height(half(f, false)), b.height(half(f, true))),
    draw: (f, y) => { a.draw(half(f, false), y); b.draw(half(f, true), y); },
  };
}

/* ---------------------------------------------------------- what it means */

/** A marked line: a filled circle in its colour (a cross, a tick, a !) or a
 *  grey dot, then the sentence. */
function mark(f: Frame, x: number, y: number, tone: LeanTone): void {
  const d = f.doc;
  if (tone === 'n') { d.setFillColor(LINE2); d.circle(x + 4.5, y - 3, 1.6, 'F'); return; }
  d.setFillColor(TONE[tone]); d.circle(x + 4.5, y - 3, 4.5, 'F');
  d.setDrawColor('#ffffff'); d.setLineWidth(1.1);
  if (tone === 'g') { d.line(x + 2.4, y - 3, x + 4, y - 1.5); d.line(x + 4, y - 1.5, x + 6.8, y - 4.8); }
  else if (tone === 'r') { d.line(x + 2.8, y - 4.7, x + 6.2, y - 1.3); d.line(x + 6.2, y - 4.7, x + 2.8, y - 1.3); }
  else { d.line(x + 4.5, y - 5.6, x + 4.5, y - 2.6); d.circle(x + 4.5, y - 1.2, 0.5, 'F'); }
}

/** WHAT IT MEANS — each sentence marked, wrapped whole. */
export function leanInsights(xs: LeanInsight[]): Block[] {
  if (!xs.length) return [];
  /* a grey dot's line — how a figure is known — is a caption: a size down */
  const size = (x: LeanInsight) => (x.tone === 'n' ? 7.8 : 8.5);
  const lh = (x: LeanInsight) => (x.tone === 'n' ? 10 : 11);
  return [rows({
    rows: xs.map((x): Row => {
      const lines = (f: Frame) => wrap(f.doc, x.text, f.w - 16, size(x), x.tone === 'r' ? 'bold' : 'normal');
      return {
        h: f => lines(f).length * lh(x) + 4,
        draw: (f, y) => {
          mark(f, f.x, y + 9, x.tone);
          font(f.doc, size(x), x.tone === 'r' ? 'bold' : 'normal', x.tone === 'r' ? DANGER : x.tone === 'a' ? WARN : INK2);
          lines(f).forEach((s, i) => f.doc.text(s, f.x + 16, y + 9 + i * lh(x)));
        },
      };
    }),
    after: 'm',
  })];
}

/* --------------------------------------------------------- the action plan */

/** THE ACTION PLAN — action · owner · due, late first; none says so. */
export function leanActions(xs: LeanAction[], empty: string): Block[] {
  if (!xs.length) return [text({ text: empty, size: SIZE.small, colour: MUTED, after: 12 })];
  const cols = (f: Frame) => ({ what: f.x, who: f.x + f.w * 0.58, due: f.x + f.w * 0.8 });
  const header: Row = {
    h: () => 14,
    draw: (f, y) => {
      const c = cols(f);
      font(f.doc, 6.8, 'bold', MUTED);
      f.doc.text('ACTION', c.what, y + 9); f.doc.text('OWNER', c.who, y + 9); f.doc.text('DUE', c.due, y + 9);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 12.5, f.x + f.w, y + 12.5);
    },
  };
  return [rows({
    header,
    rows: xs.map((a): Row => {
      const lay = (f: Frame) => {
        const c = cols(f);
        return {
          c,
          what: wrap(f.doc, a.what, c.who - c.what - 10, 8.5, 'bold'),
          from: a.from ? wrap(f.doc, `from ${a.from}`, c.who - c.what - 10, 7) : [],
          who: wrap(f.doc, a.who ?? 'nobody yet', c.due - c.who - 8, 8.5),
          due: wrap(f.doc, `${a.due ?? 'no day'}${a.state !== 'Open' ? ` · ${a.state}` : ''}`, f.x + f.w - c.due, 8.5, a.tone === 'r' ? 'bold' : 'normal'),
        };
      };
      const hOf = (f: Frame) => { const l = lay(f); return Math.max(l.what.length * 10.5 + l.from.length * 9, l.who.length * 10.5, l.due.length * 10.5) + 8; };
      return {
        h: hOf,
        draw: (f, y) => {
          const l = lay(f), d = f.doc, ty = y + 10;
          font(d, 8.5, 'bold', INK); l.what.forEach((s, i) => d.text(s, l.c.what, ty + i * 10.5));
          font(d, 7, 'normal', MUTED); l.from.forEach((s, i) => d.text(s, l.c.what, ty + l.what.length * 10.5 + i * 9 - 1));
          font(d, 8.5, 'normal', a.who ? INK2 : MUTED); l.who.forEach((s, i) => d.text(s, l.c.who, ty + i * 10.5));
          font(d, 8.5, a.tone === 'r' ? 'bold' : 'normal', a.tone === 'n' ? INK2 : TONE[a.tone]); l.due.forEach((s, i) => d.text(s, l.c.due, ty + i * 10.5));
          const h = hOf(f);
          d.setDrawColor(LINE); d.setLineWidth(0.4); d.line(f.x, y + h - 0.5, f.x + f.w, y + h - 0.5);
        },
      };
    }),
    after: 'm',
  })];
}

/* --------------------------------------------------------- the closing line */

/** THE CLOSING LINE — the one sentence, in the band at the foot (light on
 *  paper, as the band is). */
export function leanClosing(c: { text: string; tone: LeanTone }): Block {
  const LH = 11.5;
  const lines = (f: Frame) => wrap(f.doc, c.text, f.w - 56, 9.5, 'bold');
  const hOf = (f: Frame) => Math.max(f.density === 'compact' ? 30 : 34, lines(f).length * LH + (f.density === 'compact' ? 12 : 16));
  return {
    height: f => hOf(f) + 6,
    after: () => 6,
    draw: (f, y) => {
      const d = f.doc, l = lines(f), h = hOf(f);
      paperBand(d, f.x, y, f.w, h);
      d.setDrawColor(BRAND); d.setLineWidth(1.4);
      d.line(f.x + 6, y + 3.5, f.x + Math.min(44, f.w * 0.18), y + 3.5);
      const cx = f.x + 22, cy = y + h / 2;
      d.setFillColor(TONE[c.tone]); d.circle(cx, cy, 9, 'F');
      d.setDrawColor('#ffffff'); d.setLineWidth(1.7);
      if (c.tone === 'g') { d.line(cx - 4, cy, cx - 1, cy + 3.2); d.line(cx - 1, cy + 3.2, cx + 4.5, cy - 3.6); }
      else if (c.tone === 'r') { d.line(cx - 3.6, cy - 3.6, cx + 3.6, cy + 3.6); d.line(cx + 3.6, cy - 3.6, cx - 3.6, cy + 3.6); }
      else if (c.tone === 'a') { d.line(cx, cy - 4.5, cx, cy + 1); d.setFillColor('#ffffff'); d.circle(cx, cy + 3.8, 0.9, 'F'); }
      else { d.setFillColor('#ffffff'); d.circle(cx, cy, 1.8, 'F'); }
      font(d, 9.5, 'bold', INK);
      const ty = y + (h - l.length * LH) / 2 + 8.5;
      l.forEach((s, i) => d.text(s, f.x + 40, ty + i * LH));
    },
  };
}

/** A box under its own heading — a panel on paper, drawn whole. */
export function boxed(title: string, b: Block | undefined): Block | undefined {
  if (!b) return undefined;
  const head = leanHead(title);
  return {
    height: f => head.height(f) + b.height(f),
    draw: (f, y) => { head.draw(f, y); b.draw(f, y + head.height(f)); },
  };
}

/** Blocks drawn one under another as one box — a panel's heading and its
 *  words, for `pair` to set beside another. Only for what a page holds. */
export function stack(bs: Block[]): Block {
  return {
    /* the last block's space after it is not ink — the pair's own gap follows */
    height: f => bs.reduce((n, b) => n + b.height(f), 0) - (bs[bs.length - 1]?.after?.(f) ?? 0),
    draw: (f, y) => { let yy = y; for (const b of bs) { b.draw(f, yy); yy += b.height(f); } },
  };
}
