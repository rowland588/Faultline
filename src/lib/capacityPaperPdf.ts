/* LINE CAPACITY ON PAPER — one product's page, or every product a list
 * shows (lib/capacityPaper reads them; docs/AUDIT.md, bar 3).
 *
 * Laid out by the report engine (src/lib/report/, docs/REPORTS.md): the
 * product's name and where it is, the dark band saying what limits the line
 * and the module's sentence under it; then where it is limited — the V, the
 * bottleneck walked, the capacity sheet a row a station, and only what is
 * wrong to check; then what it means — a shift's make and what a pack costs;
 * then what we are doing about it — the what-ifs tried, the people's work
 * against takt. One page where it fits; never cut where it does not.
 *
 * Every product shown: a front that says them all in a sentence and a row
 * each (the same words as the list's rows), then each product's own, each
 * starting a page unless the whole of it fits in what is left. */
import type { jsPDF } from 'jspdf';
import type { CapacityPaper, CapacityPaperRow, CapacityPaperShift, Tone } from './capacityPaper';
import { capacityPapersSay } from './capacityPaper';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, heading, label, lead, rows, space, text, wrap, type Row } from './report/blocks';
import { san } from './reportKit';
import { oneOf } from './capacity';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#0f1a2e', INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef', BRAND = '#1f63e0', SURF = '#eef2f8';
/** The house's red and amber on paper (lib/report/lossTable, lib/factoryPdf). */
const RED = '#9b3227', AMBER = '#8a5f14';
const toneInk = (t?: Tone) => (t === 'r' ? RED : t === 'a' ? AMBER : INK2);

const T = 8.5, S = 7.5, LH = 10.6, LS = 9.4;

/* ------------------------------- the band -------------------------------- */

/** WHERE WE ARE — the dark band: what limits the line, and the sentence. A
 *  red edge when it is short of its target; the words say so too. */
function band(headline: string, sentence: string, short: boolean): Block {
  const parts = (f: Frame) => ({ h: wrap(f.doc, headline, f.w - 30, 11, 'bold'), s: sentence ? wrap(f.doc, sentence, f.w - 30, T) : [] });
  const height = (f: Frame) => { const p = parts(f); return 22 + p.h.length * 14 + (p.s.length ? 4 + p.s.length * LH : 0); };
  return box(f => height(f) + gap(f.density, 'm'), (f, y) => {
    const p = parts(f), h = height(f);
    f.doc.setFillColor('#0d1f3c'); f.doc.roundedRect(f.x, y, f.w, h, 6, 6, 'F');
    if (short) { f.doc.setFillColor(RED); f.doc.rect(f.x, y + 6, 4, h - 12, 'F'); }
    font(f.doc, 11, 'bold', '#ffffff'); f.doc.text(p.h, f.x + 15, y + 17);
    if (p.s.length) { font(f.doc, T, 'normal', '#c9d6ea'); f.doc.text(p.s, f.x + 15, y + 17 + p.h.length * 14 + 2); }
  }, f => gap(f.density, 'm'));
}

/** A line of words in a tone, after a bold lead-in: "The V-curve: …". The
 *  lines are measured with the lead-in's bold width, so the first line never
 *  runs past the column. */
function said(lead_: string, words: string, tone: Tone = 'n', o: { indent?: number; size?: number } = {}): Block {
  const size = o.size ?? T, indent = o.indent ?? 0;
  const lead1 = san(lead_);
  const extra = (f: Frame) => {
    font(f.doc, size, 'bold'); const b = f.doc.getTextWidth(lead1);
    font(f.doc, size, 'normal'); return Math.max(0, b - f.doc.getTextWidth(lead1));
  };
  const lines = (f: Frame) => wrap(f.doc, `${lead_} ${words}`, f.w - indent - extra(f), size);
  return {
    height: f => lines(f).length * lead(size, f.density) + gap(f.density, 's'),
    after: f => gap(f.density, 's'),
    draw: (f, y) => {
      const l = lines(f), lh = lead(size, f.density);
      font(f.doc, size, 'bold'); const leadW = f.doc.getTextWidth(`${lead1} `);
      l.forEach((s, i) => {
        const ty = y + size * 0.92 + i * lh;
        if (i === 0 && s.startsWith(lead1)) {
          font(f.doc, size, 'bold', INK); f.doc.text(lead1, f.x + indent, ty);
          const rest = s.slice(lead1.length).trimStart();
          if (rest) { font(f.doc, size, 'normal', toneInk(tone)); f.doc.text(rest, f.x + indent + leadW, ty); }
        } else { font(f.doc, size, i === 0 ? 'bold' : 'normal', i === 0 ? INK : toneInk(tone)); f.doc.text(s, f.x + indent, ty); }
      });
    },
  };
}

/* --------------------------- the capacity sheet --------------------------- */

interface Col { key: string; head: string; w: number; right?: boolean }
const sheetCols = (w: number, unit: string, target: boolean): Col[] => {
  const fixed: Col[] = [
    { key: 'n', head: '#', w: 20 },
    { key: 'name', head: 'STATION', w: 0 },
    { key: 'speed', head: 'SPEED · HOW KNOWN', w: 112 },
    { key: 'stops', head: 'OWN STOPS', w: 36, right: true },
    { key: 'good', head: 'GOOD', w: 32, right: true },
    { key: 'min', head: `${unit} A MIN`.toUpperCase(), w: 44, right: true },
    { key: 'hour', head: `${unit} AN HOUR`.toUpperCase(), w: 50, right: true },
    { key: 'neck', head: 'OF THE BOTTLENECK', w: 64, right: true },
    ...(target ? [{ key: 'needs', head: 'TARGET NEEDS', w: 46, right: true }] : []),
  ];
  const used = fixed.reduce((n, c) => n + c.w, 0);
  return fixed.map(c => (c.key === 'name' ? { ...c, w: Math.max(110, w - used) } : c));
};

function sheet(p: CapacityPaper): Block {
  const target = p.target != null;
  /* A FIGURE IS NEVER SQUEEZED: a column of numbers is as wide as its widest
     figure needs (a unit typed wrong can make one ten digits long — found by
     the random capacity seeds, printed over its neighbour); the station's
     name, which wraps, gives up the room. */
  const VALUE: Record<string, (r: CapacityPaperRow) => string> = {
    stops: r => r.stops, good: r => r.good, min: r => r.perMin, hour: r => r.perHour, needs: r => r.needs ?? '',
  };
  const lay = (f: Frame) => {
    font(f.doc, T, 'bold');
    const need = (k: string) => Math.max(0, ...p.rows.map(r => f.doc.getTextWidth(san(VALUE[k]?.(r) ?? '')) + 8));
    const base = sheetCols(f.w, p.unit, target).map(c => (VALUE[c.key] ? { ...c, w: Math.max(c.w, need(c.key)) } : c));
    /* ...AND THE SHEET IS NEVER WIDER THAN THE PAGE: what a wide figure takes
       comes out of the columns that wrap — how it is known, then the share of
       the bottleneck, then the station's name — each down to a floor (found
       by the random capacity seeds: a ten-digit hour pushed the last column
       off the page) */
    let over = base.reduce((n, c) => n + (c.key === 'name' ? 80 : c.w), 0) - f.w;
    for (const [k, floor] of [['speed', 64], ['neck', 44]] as const) {
      const c = base.find(x => x.key === k);
      const take = c ? Math.min(Math.max(0, over), c.w - floor) : 0;
      if (c && take > 0) { c.w -= take; over -= take; }
    }
    const nameMin = Math.max(56, 80 - Math.max(0, over));
    const used = base.filter(c => c.key !== 'name').reduce((n, c) => n + c.w, 0);
    const cols = base.map(c => (c.key === 'name' ? { ...c, w: Math.max(nameMin, f.w - used) } : c));
    let x = f.x;
    return cols.map(c => { const at = { ...c, x }; x += c.w; return at; });
  };
  const headLines = (f: Frame, c: Col) => wrap(f.doc, c.head, c.w - 4, SIZE.tiny, 'bold');
  const header: Row = {
    h: f => 6 + Math.max(...lay(f).map(c => headLines(f, c).length)) * 8.4 + 5,
    draw: (f, y) => {
      const h = 6 + Math.max(...lay(f).map(c => headLines(f, c).length)) * 8.4 + 5;
      for (const c of lay(f)) {
        const l = headLines(f, c);
        font(f.doc, SIZE.tiny, 'bold', MUTED);
        l.forEach((s, i) => f.doc.text(s, c.right ? c.x + c.w - 3 : c.x, y + 6 + SIZE.tiny + i * 8.4, c.right ? { align: 'right' } : undefined));
      }
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + h - 1, f.x + f.w, y + h - 1);
    },
  };
  /* each cell: its first line in the body size, the second (the unit, how it
     is known) small; every cell wraps, and the row is as tall as its tallest */
  const cells = (f: Frame, r: CapacityPaperRow) => {
    const by = Object.fromEntries(lay(f).map(c => [c.key, c]));
    const w = (k: string) => (by[k]?.w ?? 40) - 6;
    return {
      name: wrap(f.doc, `${r.name}${r.crew ? ` ${r.crew}` : ''}`, w('name'), T, 'bold'),
      unit: wrap(f.doc, r.unit, w('name'), S),
      speed: wrap(f.doc, r.speed, w('speed'), T),
      how: wrap(f.doc, r.how, w('speed'), S),
      neck: wrap(f.doc, r.ofNeck, w('neck') + 3, T, r.limit ? 'bold' : 'normal'),
    };
  };
  const rowH = (f: Frame, r: CapacityPaperRow) => {
    const c = cells(f, r);
    return 5 + Math.max(c.name.length * LH + c.unit.length * LS, c.speed.length * LH + c.how.length * LS, c.neck.length * LH) + 4;
  };
  const body: Row[] = p.rows.map(r => ({
    h: f => rowH(f, r),
    draw: (f, y) => {
      const c = cells(f, r), cols = lay(f), h = rowH(f, r), by = Object.fromEntries(cols.map(k => [k.key, k]));
      /* THE BOTTLENECK, marked as the screen marks it — a wash and an ink
         edge, never a state colour: it is the limit, not a failure */
      if (r.limit) { f.doc.setFillColor(SURF); f.doc.rect(f.x, y, f.w, h, 'F'); f.doc.setFillColor(INK); f.doc.rect(f.x, y, 3, h, 'F'); }
      const ty = y + 5 + T * 0.92;
      const right = (k: string, v: string, ink = INK2, style: 'normal' | 'bold' = 'normal') => {
        const col = by[k]; if (!col) return;
        font(f.doc, T, style, ink); f.doc.text(san(v), col.x + col.w - 3, ty, { align: 'right' });
      };
      font(f.doc, T, 'bold', MUTED); f.doc.text(String(r.n), (by.n?.x ?? f.x) + 15, ty, { align: 'right' });
      font(f.doc, T, 'bold', INK); f.doc.text(c.name, by.name.x, ty);
      font(f.doc, S, 'normal', MUTED); f.doc.text(c.unit, by.name.x, ty + c.name.length * LH - 1);
      font(f.doc, T, 'normal', INK2); f.doc.text(c.speed, by.speed.x, ty);
      font(f.doc, S, r.notPlate ? 'bold' : 'normal', r.notPlate ? AMBER : MUTED); f.doc.text(c.how, by.speed.x, ty + c.speed.length * LH - 1);
      right('stops', r.stops); right('good', r.good);
      right('min', r.perMin, INK, 'bold'); right('hour', r.perHour);
      font(f.doc, T, r.limit ? 'bold' : r.under ? 'bold' : 'normal', r.limit ? INK : r.under ? AMBER : INK2);
      f.doc.text(c.neck, by.neck.x + by.neck.w - 3, ty, { align: 'right' });
      if (r.needs != null) right('needs', r.needs, r.over ? RED : INK2, r.over ? 'bold' : 'normal');
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + h - 0.5, f.x + f.w, y + h - 0.5);
    },
  }));
  return rows({ header, rows: body, after: 's' });
}

/* ------------------------------- a shift ------------------------------- */

function shiftTable(p: CapacityPaper): Block | null {
  const s = p.shift;
  if (!s || !s.rows.length) return null;
  const heads = ['SHIFT', 'ITS TIME', 'BREAKS', 'CHANGEOVERS', 'MAKING', `${p.unit} A SHIFT`.toUpperCase()];
  /* the shift's name on the left; each figure's column, right edges evenly spaced */
  const NAME = 130;
  const edges = (f: Frame) => [1, 2, 3, 4, 5].map(i => f.x + NAME + (i * (f.w - NAME)) / 5);
  const nameLines = (f: Frame, r: CapacityPaperShift) => wrap(f.doc, r.name, NAME + (f.w - NAME) / 5 - 70, T, 'bold');
  const header: Row = {
    h: () => 18,
    draw: (f, y) => {
      const e = edges(f);
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      f.doc.text(heads[0], f.x, y + 12);
      heads.slice(1).forEach((t, i) => f.doc.text(san(t), e[i] - 3, y + 12, { align: 'right' }));
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 17, f.x + f.w, y + 17);
    },
  };
  const line = (r: CapacityPaperShift, total = false): Row => {
    const h = (f: Frame) => 6 + Math.max(nameLines(f, r).length * LH, LH + (r.without ? LS : 0)) + 3;
    return {
      h,
      draw: (f, y) => {
        const e = edges(f), ty = y + 6 + T * 0.92;
        font(f.doc, T, 'bold', INK); f.doc.text(nameLines(f, r), f.x, ty);
        font(f.doc, T, 'normal', INK2);
        [r.time, r.breaks, r.changeovers, r.making].forEach((v, i) => { if (v) f.doc.text(san(v), e[i] - 3, ty, { align: 'right' }); });
        font(f.doc, T, 'bold', INK); f.doc.text(san(r.made), e[4] - 3, ty, { align: 'right' });
        if (r.without) { font(f.doc, S, 'normal', MUTED); f.doc.text(san(r.without), e[4] - 3, ty + LS, { align: 'right' }); }
        if (!total) { f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + h(f) - 0.5, f.x + f.w, y + h(f) - 0.5); }
      },
    };
  };
  return rows({ header, rows: [...s.rows.map(r => line(r)), ...(s.day ? [line(s.day, true)] : [])], after: 's' });
}

/* ------------------------------ one product ------------------------------ */

/** The blocks of one product's page. `own`: the page is this product's
 *  alone, headed by its name; otherwise it is one of many, under a heading. */
export function productBlocks(p: CapacityPaper, d: Density, own: boolean, keep = true): Block[] {
  const out: Block[] = [];
  const where = `${p.line}${p.job ? ` · for ${p.job}` : ' · on no job'}`;
  if (own) {
    out.push(text({ text: `LINE CAPACITY · ${p.line.toUpperCase()}`, size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
    out.push(text({ text: p.product, size: SIZE.title, style: 'bold', after: 4 }));
    out.push(text({ text: `${where} · printed ${p.printed}`, colour: MUTED, after: gap(d, 'm') }));
  }
  out.push(band(p.headline, p.rows.length ? p.sentence : '', p.short));
  if (!p.rows.length) {
    out.push(text({ text: p.sentence, colour: INK2, after: gap(d, 'm') }));
    /* stations written down and none counted: each said, and why — it was
       left off the paper when nothing could be counted (the random seeds) */
    if (p.check.length) {
      out.push(label('To check before the sums are trusted', AMBER));
      for (const c of p.check) out.push(text({ text: c, size: T, colour: AMBER, indent: 10, bullet: '·', after: 3 }));
    }
    return own ? out : withHead(p, where, out, keep);
  }

  /* WHY — where it is limited */
  out.push(label('Where it is limited'));
  if (p.target) out.push(said('The target:', `${p.target}.`));
  if (p.v) out.push(said('The V-curve:', p.v.text, p.v.tone));
  if (p.walk) out.push(said('The bottleneck, walked:', p.walk.text, p.walk.tone));
  out.push({ ...space('s'), keepWithNext: true });   // travels with the sheet, never strands the label
  out.push(sheet(p));
  if (p.check.length) {
    out.push(label('To check before the sums are trusted', AMBER));
    for (const c of p.check) out.push(text({ text: c, size: T, colour: AMBER, indent: 10, bullet: '·', after: 3 }));
    out.push(space('s'));
  }

  /* WHAT IT MEANS — a shift, and a pack */
  if (p.shift) {
    out.push(label(`What the line makes a shift`));
    const t = shiftTable(p);
    if (t) out.push(t);
    out.push(text({ text: p.shift.sentence, size: T, colour: INK2, after: gap(d, 'm') }));
  }
  if (p.labour) {
    out.push(label(`What a ${oneOf(p.unit)} costs in labour`));
    out.push(text({ text: p.labour.says, size: T, colour: INK2, after: p.labour.more ? 4 : gap(d, 'm') }));
    if (p.labour.more) out.push(text({ text: p.labour.more, size: T, colour: INK2, after: gap(d, 'm') }));
  }

  /* WHAT WE ARE DOING ABOUT IT — the what-ifs tried, the people's work */
  out.push(label('What we are doing about it'));
  if (!p.whatIfs.length) out.push(text({ text: 'No what-if tried yet — a copy of the line with one thing changed shows what moves the limit.', size: T, colour: MUTED, after: 6 }));
  for (const w of p.whatIfs) {
    /* the sentence names the what-if itself: the lead-in says only what it is, and whether it is on the board */
    out.push(said(w.onBoard ? 'What if — on the board:' : 'What if:', w.says));
    if (w.changed.length) out.push(text({ text: `Changed: ${w.changed.join('; ')}`, size: S, colour: MUTED, indent: 10, after: 3 }));
    if (w.labour) out.push(text({ text: w.labour, size: S, colour: MUTED, indent: 10, after: 5 }));
  }
  if (p.work) {
    out.push(said('The people’s work against takt:', p.work.text));
    for (const l of p.work.lines) out.push(text({ text: l.text, size: T, colour: toneInk(l.tone), indent: 10, bullet: '·', after: 3 }));
  }
  return own ? out : withHead(p, where, out, keep);
}

/** One of many: under its name, kept on one page when the whole of it fits a page. */
function withHead(p: CapacityPaper, where: string, body: Block[], keep: boolean): Block[] {
  const h = heading(p.product, where);
  if (!keep) return [h, ...body];
  /* only a product a page can hold asks for one: a longer one splits
     wherever it starts, so starting it overleaf only leaves a page short */
  const all = (f: Frame) => [h, ...body].reduce((n, b) => n + b.height(f), 0);
  return [{ ...h, keep: f => (all(f) <= f.bottom - f.top ? all(f) : 0) }, ...body];
}

/* ------------------------------ the front ------------------------------ */

function frontBlocks(papers: CapacityPaper[], scope: string, printed: string, d: Density): Block[] {
  const out: Block[] = [];
  out.push(text({ text: `LINE CAPACITY · ${scope.toUpperCase()}`, size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: 'Line capacity', size: SIZE.title, style: 'bold', after: 4 }));
  out.push(text({ text: `Where each line is limited, product by product · printed ${printed}`, colour: MUTED, after: gap(d, 'm') }));
  out.push(band(capacityPapersSay(papers), '', papers.some(p => p.short)));
  out.push(label('Every product shown'));
  const xs = (f: Frame) => ({ product: f.x, line: f.x + Math.round(f.w * 0.3), says: f.x + Math.round(f.w * 0.52) });
  const parts = (f: Frame, p: CapacityPaper) => {
    const x = xs(f);
    return {
      product: wrap(f.doc, p.product, x.line - x.product - 8, T, 'bold'),
      line: wrap(f.doc, `${p.line}${p.job ? ` · for ${p.job}` : ''}`, x.says - x.line - 8, T),
      says: wrap(f.doc, p.headline, f.x + f.w - x.says, T, p.short ? 'bold' : 'normal'),
    };
  };
  const hOf = (f: Frame, p: CapacityPaper) => { const q = parts(f, p); return 8 + Math.max(q.product.length, q.line.length, q.says.length) * LH; };
  out.push(rows({
    rows: papers.map(p => ({
      h: f => hOf(f, p),
      draw: (f, y) => {
        const q = parts(f, p), x = xs(f), ty = y + 5 + T * 0.92;
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
        font(f.doc, T, 'bold', INK); f.doc.text(q.product, x.product, ty);
        font(f.doc, T, 'normal', INK2); f.doc.text(q.line, x.line, ty);
        font(f.doc, T, p.short ? 'bold' : 'normal', p.short ? RED : p.rows.length ? INK2 : MUTED); f.doc.text(q.says, x.says, ty);
      },
    })),
    after: 'l',
  }));
  return out;
}

/* ------------------------------- the paper ------------------------------- */

/** Draw one product's page — or, with `scope`, every product a list shows:
 *  the front, then each product's own. The first page is the current one. */
export async function drawCapacityPaper(doc: jsPDF, papers: CapacityPaper[], o: { scope?: string; printed: string }): Promise<void> {
  const one = papers.length === 1 && !o.scope;
  const build = (d: Density): Block[] => (one ? productBlocks(papers[0], d, true)
    /* the first product follows the front where it stands — kept whole
       overleaf, it left the front alone on a page */
    : [...frontBlocks(papers, o.scope ?? 'every product shown', o.printed, d), ...papers.flatMap((p, i) => productBlocks(p, d, false, i > 0))]);
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, build);
  await pour({ ...base, density, dry: false }, build(density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  /* the running foot says whose the page is — the product's whole name, or,
     when that will not fit a line, the tool and the day (never a name cut) */
  const long = one ? `Line capacity · ${papers[0].product} · ${papers[0].line} · printed ${o.printed}`
    : `Line capacity · ${papers.length} product${papers.length === 1 ? '' : 's'} · printed ${o.printed}`;
  const foot = wrap(doc, long, CW - 60, 7.5).length === 1 ? long : `Line capacity · printed ${o.printed}`;
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(san(foot), M, H - 18);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
