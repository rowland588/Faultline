/* THE GANTT, ON PAPER — the same chart the project page draws (lib/gantt lays
 * it out; this only draws), on landscape A4.
 *
 * Rowland: "print the Gantt charts as well, and PDF." On paper there is no
 * scrolling, so the whole job is fitted across the page: a day is however wide
 * the page allows, and the calendar band says days, or weeks, or only months,
 * whichever the width can carry legibly. Rows that do not fit carry on over the
 * page with the calendar drawn again at the top, so every sheet reads alone.
 *
 * Used twice: on its own from the plan ("Download the plan"), and inside the
 * client report, straight after the front page.
 */
import type { jsPDF } from 'jspdf';
import type { Gantt, GanttRow } from './gantt';
import type { PlanMark } from './standing';
import { san } from './reportKit';

const PW = 842, PH = 595, M = 30, LAB = 186;
const INK = '#0f1a2e', INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef', SURF2 = '#eef3f9', WEEKEND = '#f1f4f8';
const BRAND = '#1f63e0', OK = '#1e6b4b', DANGER = '#9b3227', AMBER = '#8a5f14', BOOKED = '#4f46b8';
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const TONE: Record<PlanMark['tone'], { fill: string; stroke: string; text: string }> = {
  done: { fill: OK, stroke: OK, text: '#ffffff' },
  failed: { fill: DANGER, stroke: DANGER, text: '#ffffff' },
  ran: { fill: AMBER, stroke: AMBER, text: '#ffffff' },
  late: { fill: '#f8ecea', stroke: DANGER, text: DANGER },
  booked: { fill: '#e6e4f6', stroke: BOOKED, text: BOOKED },
  none: { fill: SURF2, stroke: '#c6d2e3', text: MUTED },
};

const HEAD_TOP = 74;          // where the calendar band starts on a page
const MONTH_H = 13, DAY_H = 17;
const ROW_H = 17, GROUP_H = 13;
const FOOT = 46;              // room left at the bottom for the key and the foot

type Line = { group: string; n: number; cont?: boolean } | { row: GanttRow };

/** Draw the Gantt from the CURRENT page on (which must be landscape A4), adding
 *  landscape pages as the rows need them. Returns the page numbers it drew on,
 *  so a report can put its own foot on them. */
export function drawGantt(doc: jsPDF, g: Gantt, head: { eyebrow: string; title: string; sub?: string }): number[] {
  const font = (size: number, style: 'normal' | 'bold' = 'normal', colour = INK) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(colour);
  };
  const x0 = M + LAB, CW = PW - 2 * M - LAB;
  const px = CW / Math.max(1, g.days);
  const X = (day: number) => x0 + day * px;

  /* Rows, with each gate's heading, cut into pages. */
  const lines: Line[] = g.groups.flatMap(gr => [{ group: gr.label, n: gr.rows.length } as Line, ...gr.rows.map(row => ({ row }) as Line)]);
  const bodyTop = HEAD_TOP + MONTH_H + DAY_H;
  const room = PH - FOOT - bodyTop;
  const pages: Line[][] = [];
  let cur: Line[] = [], used = 0, lastGroup = '';
  for (const l of lines) {
    const h = 'group' in l ? GROUP_H : ROW_H;
    /* A heading never sits alone at the foot of a page. */
    const need = 'group' in l ? h + ROW_H : h;
    if (used + need > room && cur.length) {
      pages.push(cur); cur = []; used = 0;
      if (!('group' in l)) { cur.push({ group: lastGroup, n: 0, cont: true }); used += GROUP_H; }
    }
    if ('group' in l) lastGroup = l.group;
    cur.push(l); used += h;
  }
  if (cur.length || !pages.length) pages.push(cur);

  const drawn: number[] = [];
  pages.forEach((page, pi) => {
    if (pi > 0) doc.addPage('a4', 'landscape');
    drawn.push(doc.getNumberOfPages());

    /* ---- the heading ---- */
    font(8, 'bold', BRAND); doc.text(san(head.eyebrow), M, M + 6);
    font(17, 'bold'); doc.text(san(head.title) + (pages.length > 1 ? `  ·  ${pi + 1} of ${pages.length}` : ''), M, M + 26);
    if (head.sub) { font(9, 'normal', MUTED); doc.text(san(head.sub), M, M + 40, { maxWidth: PW - 2 * M }); }

    const bodyH = page.reduce((h, l) => h + ('group' in l ? GROUP_H : ROW_H), 0);
    const bottom = bodyTop + bodyH;

    /* ---- the calendar band ---- */
    doc.setFillColor(SURF2); doc.rect(M, HEAD_TOP, PW - 2 * M, MONTH_H + DAY_H, 'F');
    font(7, 'bold', MUTED); doc.text('WHAT', M + 6, HEAD_TOP + MONTH_H + DAY_H - 6);
    for (const mo of g.months) {
      const x = X(mo.start), w = mo.span * px;
      doc.setDrawColor('#c6d2e3'); doc.setLineWidth(0.6); doc.line(x, HEAD_TOP, x, bottom);
      if (w >= 18) { font(7.5, 'bold', INK); doc.text(mo.label.toUpperCase(), x + 3, HEAD_TOP + 9.5, { maxWidth: w - 4 }); }
    }
    const dy = HEAD_TOP + MONTH_H;
    if (px >= 10) {
      /* Room for every day: its date and its weekday, weekends shaded. */
      for (const d of g.dayList) {
        const x = X(d.at);
        if (d.weekend) { doc.setFillColor(WEEKEND); doc.rect(x, bodyTop, px, bodyH, 'F'); doc.setFillColor('#e4e9f0'); doc.rect(x, dy, px, DAY_H, 'F'); }
        if (d.at === g.today) { doc.setFillColor(BRAND); doc.rect(x, dy, px, DAY_H, 'F'); }
        const c = d.at === g.today ? '#ffffff' : d.weekend ? MUTED : INK;
        font(px >= 14 ? 7 : 6, 'bold', c); doc.text(String(d.day), x + px / 2, dy + 7.5, { align: 'center' });
        font(5, 'normal', d.at === g.today ? '#ffffff' : MUTED); doc.text(DOW[d.dow], x + px / 2, dy + 13.5, { align: 'center' });
      }
    } else {
      /* Too narrow for days: a column per week, labelled by its Monday. */
      if (px >= 3) for (const d of g.dayList) if (d.weekend) { doc.setFillColor(WEEKEND); doc.rect(X(d.at), bodyTop, px, bodyH, 'F'); }
      for (const w of g.weeks) {
        const x = X(w.start);
        doc.setDrawColor(LINE); doc.setLineWidth(0.4); doc.line(x, dy, x, bottom);
        if (w.span * px >= 22) { font(6, 'bold', INK2); doc.text(w.label, x + 2, dy + 10, { maxWidth: w.span * px - 3 }); }
      }
    }

    /* ---- the rows ---- */
    let y = bodyTop;
    for (const l of page) {
      if ('group' in l) {
        doc.setFillColor(SURF2); doc.rect(M, y, LAB, GROUP_H, 'F');
        font(6.5, 'bold', INK2);
        doc.text(`${l.group.toUpperCase()}${l.cont ? '  (continued)' : `  ${l.n}`}`, M + 6, y + 9);
        y += GROUP_H;
        continue;
      }
      const r = l.row;
      doc.setDrawColor(LINE); doc.setLineWidth(0.4); doc.line(M, y + ROW_H, PW - M, y + ROW_H);
      /* "Wrapper — Dry run": the step, with its machine under it. */
      const cut = r.label.indexOf(' — ');
      const step = cut >= 0 ? r.label.slice(cut + 3) : r.label;
      const mach = cut >= 0 ? r.label.slice(0, cut) : '';
      font(7.5, 'bold', INK);
      const s1 = (doc.splitTextToSize(san(step), LAB - 12) as string[])[0] ?? '';
      doc.text(s1, M + 6, y + (mach ? 7.5 : 11));
      if (mach) { font(6, 'normal', MUTED); doc.text((doc.splitTextToSize(san(mach), LAB - 12) as string[])[0] ?? '', M + 6, y + 14); }

      const t = TONE[r.tone];
      const bx = X(r.start) + 0.6, bw = Math.max(2.4, r.span * px - 1.2), by = y + 4, bh = ROW_H - 8;
      doc.setDrawColor(t.stroke); doc.setFillColor(t.fill); doc.setLineWidth(0.7);
      doc.roundedRect(bx, by, bw, bh, 2, 2, 'FD');
      font(6, 'bold', t.text);
      const ww = doc.getTextWidth(san(r.when));
      if (ww + 6 <= bw) doc.text(san(r.when), bx + 3, by + bh / 2 + 2.1);
      else { font(6, 'bold', INK2); doc.text(san(r.when), bx + bw + 3, by + bh / 2 + 2.1); }
      y += ROW_H;
    }
    doc.setDrawColor('#c6d2e3'); doc.setLineWidth(0.6); doc.line(x0, HEAD_TOP, x0, bottom);
    doc.rect(M, HEAD_TOP, PW - 2 * M, bottom - HEAD_TOP);

    /* ---- today and the handover, over the rows ---- */
    if (g.today != null) {
      const x = X(g.today + 0.5);
      doc.setDrawColor(BRAND); doc.setLineWidth(1.1); doc.line(x, bodyTop, x, bottom);
    }
    const mark = (at: number, colour: string, words: string, lift: number) => {
      const x = X(at + 0.5);
      doc.setDrawColor(colour); doc.setLineWidth(1); doc.setLineDashPattern([3, 2], 0);
      doc.line(x, bodyTop, x, bottom); doc.setLineDashPattern([], 0);
      font(6.5, 'bold', colour);
      const w = doc.getTextWidth(words);
      const tx = Math.min(x + 3, PW - M - w - 2);
      doc.setFillColor('#ffffff'); doc.rect(tx - 1.5, bottom - 10 - lift, w + 3, 8.5, 'F');
      doc.text(words, tx, bottom - 3.6 - lift);
    };
    if (g.agreed) mark(g.agreed.at, MUTED, `Agreed ${g.agreed.when}`, 10);
    if (g.expected) mark(g.expected.at, OK, `Handover ${g.expected.when}`, 0);

    /* ---- the key ---- */
    let kx = M; const ky = Math.min(bottom + 14, PH - FOOT + 14);
    for (const [tone, word] of [['done', 'done'], ['failed', 'ran, didn’t pass'], ['ran', 'ran, not yet called'], ['late', 'the day has gone'], ['booked', 'still ahead']] as [PlanMark['tone'], string][]) {
      const c = TONE[tone];
      doc.setDrawColor(c.stroke); doc.setFillColor(c.fill); doc.setLineWidth(0.7);
      doc.roundedRect(kx, ky - 5.5, 12, 7, 1.5, 1.5, 'FD');
      font(7, 'normal', INK2); doc.text(san(word), kx + 15, ky);
      kx += 24 + doc.getTextWidth(san(word));
    }
    doc.setDrawColor(BRAND); doc.setLineWidth(1.1); doc.line(kx, ky - 6, kx, ky + 1);
    font(7, 'normal', INK2); doc.text('today', kx + 4, ky); kx += 30;
    if (g.expected) {
      doc.setDrawColor(OK); doc.setLineDashPattern([3, 2], 0); doc.line(kx, ky - 6, kx, ky + 1); doc.setLineDashPattern([], 0);
      doc.text('handover', kx + 4, ky);
    }
  });
  return drawn;
}

/** The plan on its own — landscape A4, a foot on every page. */
export function drawGanttDoc(doc: jsPDF, g: Gantt, opts: { name: string; printed: string; dates?: string }): void {
  const pages = drawGantt(doc, g, {
    eyebrow: `THE PLAN · ${opts.name.toUpperCase()}`,
    title: 'The plan',
    sub: [`Printed ${opts.printed}`, opts.dates].filter(Boolean).join('   ·   '),
  });
  pages.forEach((p, i) => {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED);
    doc.text(san(`${opts.name}  ·  the plan  ·  ${opts.printed}`), M, PH - 16);
    doc.text(`${i + 1} of ${pages.length}`, PW - M, PH - 16, { align: 'right' });
  });
}
