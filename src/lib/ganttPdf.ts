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
import { pdfFamily, san } from './reportKit';
import { walkMarkers } from './walkSnags';

const PW = 842, PH = 595, M = 30, LAB = 186;
const INK = '#0f1a2e', INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef', SURF2 = '#eef3f9', WEEKEND = '#f1f4f8';
const BRAND = '#1f63e0', OK = '#1e6b4b', DANGER = '#9b3227', AMBER = '#8a5f14', BOOKED = '#4f46b8';
const DOW = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/* A reminder from the meeting notes — its own colour, on paper as on screen. */
const REMIND = '#b8237a';
const NOTE_TONE: Record<PlanMark['tone'], { fill: string; stroke: string; text: string }> = {
  done: { fill: REMIND, stroke: REMIND, text: '#ffffff' },
  failed: { fill: '#fbe7f1', stroke: DANGER, text: REMIND },
  ran: { fill: '#fbe7f1', stroke: REMIND, text: REMIND },
  late: { fill: '#fbe7f1', stroke: DANGER, text: REMIND },
  booked: { fill: '#fbe7f1', stroke: REMIND, text: REMIND },
  none: { fill: '#fbe7f1', stroke: REMIND, text: REMIND },
};

const TONE: Record<PlanMark['tone'], { fill: string; stroke: string; text: string }> = {
  /* Done is quiet on paper as on screen — what is wrong is what stands out. */
  done: { fill: '#e3efe9', stroke: OK, text: OK },
  failed: { fill: DANGER, stroke: DANGER, text: '#ffffff' },
  ran: { fill: AMBER, stroke: AMBER, text: '#ffffff' },
  late: { fill: '#f8ecea', stroke: DANGER, text: DANGER },
  booked: { fill: '#e6e4f6', stroke: BOOKED, text: BOOKED },
  none: { fill: SURF2, stroke: '#c6d2e3', text: MUTED },
};

const HEAD_TOP = 74;          // where the calendar band starts on a page
const MONTH_H = 13, DAY_H = 17;
const ROW_H = 17, GROUP_H = 13;
const FOOT = 54;              // room left at the bottom for the key (two lines when it is long) and the foot

type Line = { group: string; n: number; cont?: boolean } | { row: GanttRow; fix?: boolean } | { walk: true };

/** Draw the Gantt from the CURRENT page on (which must be landscape A4), adding
 *  landscape pages as the rows need them. Returns the page numbers it drew on,
 *  so a report can put its own foot on them. */
export function drawGantt(doc: jsPDF, g: Gantt, head: { eyebrow: string; title: string; sub?: string }, moves: MoveLine[] = []): number[] {
  const font = (size: number, style: 'normal' | 'bold' = 'normal', colour = INK) => {
    doc.setFont(pdfFamily(), style); doc.setFontSize(size); doc.setTextColor(colour);
  };
  const x0 = M + LAB, CW = PW - 2 * M - LAB;
  const px = CW / Math.max(1, g.days);
  const X = (day: number) => x0 + day * px;

  /* Rows, with each gate's heading, cut into pages. */
  const lines: Line[] = g.groups.flatMap(gr => [{ group: gr.label, n: gr.rows.length } as Line,
    ...gr.rows.flatMap(row => [{ row } as Line, ...(row.fixes ?? []).map(f => ({ row: f, fix: true }) as Line)])]);
  /* WHAT THE WALK FOUND — one lane, after the gates and before the fixes, the
     same place the screen draws it. */
  if (g.walk && g.walk.days.length) {
    const at = lines.findIndex(l => 'group' in l && (l.group === 'Fixes' || l.group === 'Actions'));
    lines.splice(at < 0 ? lines.length : at, 0, { walk: true });
  }
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
  let lastKey = 0;
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
      if ('walk' in l) {
        const lane = g.walk;
        doc.setDrawColor(LINE); doc.setLineWidth(0.4); doc.line(M, y + ROW_H, PW - M, y + ROW_H);
        if (lane) {
          if (lane.late) { doc.setFillColor(DANGER); doc.rect(M + 1, y + 3, 2, ROW_H - 6, 'F'); }
          font(7.5, 'bold', INK); doc.text('Found on the walk', M + 6, y + 7.5);
          font(6, 'bold', lane.open ? DANGER : OK); doc.text(san(lane.words), M + 6, y + 14);
          const cy = y + ROW_H / 2;
          for (const m of walkMarkers(lane, px, 13)) {
            const cx = X(m.start + m.span / 2);
            if (!m.open) { doc.setFillColor(OK); doc.circle(cx, cy, 2.4, 'F'); continue; }
            doc.setLineWidth(0.9); doc.setDrawColor(DANGER); doc.setFillColor(m.late ? DANGER : '#ffffff');
            doc.circle(cx, cy, 5.6, 'FD');
            font(6, 'bold', m.late ? '#ffffff' : DANGER); doc.text(String(m.open), cx, cy + 2.1, { align: 'center' });
          }
        }
        y += ROW_H;
        continue;
      }
      const r = l.row;
      doc.setDrawColor(LINE); doc.setLineWidth(0.4); doc.line(M, y + ROW_H, PW - M, y + ROW_H);
      /* A FIX UNDER ITS STAGE — its dates, or open-ended, "no date agreed". */
      if (l.fix) {
        font(6.5, 'bold', INK2);
        doc.text((doc.splitTextToSize(san(`> Fix: ${r.label}`), LAB - 18) as string[])[0] ?? '', M + 14, y + 7.5);
        font(5.5, 'normal', MUTED); doc.text(san(r.when), M + 14, y + 13.5);
        const fx = X(r.start) + 0.6, fy = y + 5, fh = ROW_H - 10;
        const open = (r as GanttRow & { open?: boolean }).open;
        if (open) {
          doc.setDrawColor(MUTED); doc.setLineWidth(0.6); doc.setLineDashPattern([2, 1.5], 0);
          doc.roundedRect(fx, fy, Math.max(4 * px, 46), fh, 2, 2, 'S'); doc.setLineDashPattern([], 0);
          font(5.5, 'normal', MUTED); doc.text('no date agreed', fx + 3, fy + fh / 2 + 1.9);
        } else {
          const ft = TONE[r.tone];
          const fw = Math.max(2.4, r.span * px - 1.2);
          doc.setDrawColor(ft.stroke); doc.setFillColor(ft.fill); doc.setLineWidth(0.6);
          doc.roundedRect(fx, fy, fw, fh, 1.5, 1.5, 'FD');
          font(5.5, 'bold', INK2); doc.text(san(r.when), fx + fw + 3, fy + fh / 2 + 1.9);
        }
        y += ROW_H;
        continue;
      }
      /* "Wrapper — Dry run": the step, with its machine under it. Only the
         machine is split off — a title with a dash of its own stays whole. */
      const mach = r.on && r.label.startsWith(`${r.on} — `) ? r.on : '';
      const step = mach ? r.label.slice(mach.length + 3) : r.label;
      font(7.5, 'bold', INK);
      const s1 = (doc.splitTextToSize(san(step), LAB - 12) as string[])[0] ?? '';
      doc.text(s1, M + 6, y + (mach ? 7.5 : 11));
      if (mach) { font(6, 'normal', MUTED); doc.text((doc.splitTextToSize(san(mach), LAB - 12) as string[])[0] ?? '', M + 6, y + 14); }

      const t = (r.kind === 'note' ? NOTE_TONE : TONE)[r.tone];
      const bx = X(r.start) + 0.6, bw = Math.max(2.4, r.span * px - 1.2), by = y + 4, bh = ROW_H - 8;
      doc.setDrawColor(t.stroke); doc.setFillColor(t.fill); doc.setLineWidth(0.7);
      doc.roundedRect(bx, by, bw, bh, 2, 2, 'FD');
      font(6, 'bold', t.text);
      const ww = doc.getTextWidth(san(r.when));
      /* THE OVERRUN — past the finish first planned: hatched red, with how far. */
      let after = bx + bw + 3;
      if (r.slip) {
        const sx = X(r.slip.start) + 0.4, sw = Math.max(2, r.slip.span * px - 0.8);
        doc.setFillColor('#f6dcd8'); doc.setDrawColor(DANGER); doc.setLineWidth(0.7);
        doc.roundedRect(sx, by, sw, bh, 2, 2, 'FD');
        doc.setDrawColor('#e3a59c'); doc.setLineWidth(0.5);
        for (let hx = sx - bh; hx < sx + sw; hx += 3.2) {
          const x1 = Math.max(hx, sx), y1 = by + bh - (x1 - hx), x2 = Math.min(hx + bh, sx + sw), y2 = by + bh - (x2 - hx);
          if (x2 > x1) doc.line(x1, Math.min(y1, by + bh), x2, Math.max(y2, by));
        }
        doc.setDrawColor(DANGER); doc.setLineWidth(0.7); doc.roundedRect(sx, by, sw, bh, 2, 2, 'S');
        after = Math.max(after, sx + sw + 3);
      }
      if (ww + 6 <= bw) doc.text(san(r.when), bx + 3, by + bh / 2 + 2.1);
      else { font(6, 'bold', INK2); doc.text(san(r.when), after, by + bh / 2 + 2.1); after += doc.getTextWidth(san(r.when)) + 3; }
      if (r.slip) { font(6, 'bold', DANGER); doc.text(`+${r.slip.days}d`, after, by + bh / 2 + 2.1); after += doc.getTextWidth(`+${r.slip.days}d`) + 3; }
      /* STARTS BEFORE THE STEP AHEAD HAS FINISHED — the same amber edge and
         words the screen shows, so the client reads the overlap too. */
      if (r.overlap) {
        doc.setFillColor(AMBER); doc.rect(M + 1, y + 3, 2, ROW_H - 6, 'F');
        font(6, 'bold', AMBER); doc.text(san(`overlaps ${r.overlap}`), after, by + bh / 2 + 2.1);
      }
      /* SOMETHING HAPPENED HERE — a small red diamond on the day. */
      for (const mk of r.marks ?? []) {
        const cx = X(mk.at + 0.5), cy = y + 3;
        doc.setFillColor(DANGER); doc.setDrawColor('#ffffff'); doc.setLineWidth(0.5);
        doc.lines([[2.6, 2.6], [-2.6, 2.6], [-2.6, -2.6], [2.6, -2.6]], cx, cy - 2.6, [1, 1], 'FD', true);
      }
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
    let kx = M; let ky = Math.min(bottom + 14, PH - FOOT + 14);
    lastKey = ky;
    /* A key with every entry on it is wider than the page: carry on below. */
    const fit = (word: string, extra: number) => {
      font(7, 'normal', INK2);
      if (kx + extra + doc.getTextWidth(san(word)) > PW - M) { kx = M; ky += 11; lastKey = ky; }
    };
    for (const [tone, word] of [['done', 'done'], ['failed', 'ran, didn’t pass'], ['ran', 'ran, not yet called'], ['late', 'the day has gone'], ['booked', 'still ahead']] as [PlanMark['tone'], string][]) {
      fit(word, 24);
      const c = TONE[tone];
      doc.setDrawColor(c.stroke); doc.setFillColor(c.fill); doc.setLineWidth(0.7);
      doc.roundedRect(kx, ky - 5.5, 12, 7, 1.5, 1.5, 'FD');
      font(7, 'normal', INK2); doc.text(san(word), kx + 15, ky);
      kx += 24 + doc.getTextWidth(san(word));
    }
    if (g.groups.some(x => x.rows.some(r => r.slip))) {
      fit('past the finish first planned', 24);
      doc.setFillColor('#f6dcd8'); doc.setDrawColor(DANGER); doc.setLineWidth(0.7);
      doc.roundedRect(kx, ky - 5.5, 12, 7, 1.5, 1.5, 'FD');
      font(7, 'normal', INK2); doc.text('past the finish first planned', kx + 15, ky);
      kx += 24 + doc.getTextWidth('past the finish first planned');
    }
    if (g.walk && g.walk.days.length) {
      fit('found on the walk - the number still open; solid, past due', 21);
      doc.setLineWidth(0.8); doc.setDrawColor(DANGER); doc.setFillColor('#ffffff'); doc.circle(kx + 4.5, ky - 2, 4.5, 'FD');
      font(5.5, 'bold', DANGER); doc.text('2', kx + 4.5, ky, { align: 'center' });
      const say = 'found on the walk - the number still open; solid, past due';
      font(7, 'normal', INK2); doc.text(say, kx + 12, ky);
      kx += 21 + doc.getTextWidth(say);
    }
    if (g.groups.some(x => x.rows.some(r => r.overlap))) {
      fit('starts before the step ahead has finished', 15);
      doc.setFillColor(AMBER); doc.rect(kx, ky - 6, 2.5, 8, 'F');
      font(7, 'normal', INK2); doc.text('starts before the step ahead has finished', kx + 6, ky);
      kx += 15 + doc.getTextWidth('starts before the step ahead has finished');
    }
    if (g.groups.some(x => x.rows.some(r => r.marks))) {
      fit('something happened', 18);
      doc.setFillColor(DANGER); doc.setDrawColor('#ffffff'); doc.setLineWidth(0.5);
      doc.lines([[2.6, 2.6], [-2.6, 2.6], [-2.6, -2.6], [2.6, -2.6]], kx + 3, ky - 5.2, [1, 1], 'FD', true);
      font(7, 'normal', INK2); doc.text('something happened', kx + 9, ky);
      kx += 18 + doc.getTextWidth('something happened');
    }
    if (g.groups.some(x => x.kind === 'note')) {
      fit('a reminder from the notes', 24);
      doc.setDrawColor(REMIND); doc.setFillColor('#fbe7f1'); doc.setLineWidth(0.7);
      doc.roundedRect(kx, ky - 5.5, 12, 7, 1.5, 1.5, 'FD');
      font(7, 'normal', INK2); doc.text('a reminder from the notes', kx + 15, ky);
      kx += 24 + doc.getTextWidth('a reminder from the notes');
    }
    fit('today handover', 60);
    doc.setDrawColor(BRAND); doc.setLineWidth(1.1); doc.line(kx, ky - 6, kx, ky + 1);
    font(7, 'normal', INK2); doc.text('today', kx + 4, ky); kx += 30;
    if (g.expected) {
      doc.setDrawColor(OK); doc.setLineDashPattern([3, 2], 0); doc.line(kx, ky - 6, kx, ky + 1); doc.setLineDashPattern([], 0);
      doc.text('handover', kx + 4, ky);
    }
  });

  /* ---- WHY THE PLAN MOVED — every push later, with its reason ---- */
  if (moves.length) {
    let y = lastKey + 22;
    const fresh = () => { doc.addPage('a4', 'landscape'); drawn.push(doc.getNumberOfPages()); y = M + 10; };
    if (y + 60 > PH - 34) fresh();
    font(11, 'bold'); doc.text('Why the plan moved', M, y); y += 6;
    doc.setDrawColor(LINE); doc.setLineWidth(0.6); doc.line(M, y, PW - M, y); y += 12;
    for (const mv of moves) {
      font(8, 'normal', INK2);
      const why = doc.splitTextToSize(san(mv.why), PW - 2 * M - 250) as string[];
      font(7, 'normal', MUTED);
      const fix = mv.fix ? doc.splitTextToSize(san(`Fix: ${mv.fix}`), PW - 2 * M - 250) as string[] : [];
      font(8, 'bold', INK);
      const stage = (doc.splitTextToSize(san(mv.stage), 180) as string[]).slice(0, 2);
      const h = Math.max(stage.length * 9.5 + 10, why.length * 10 + fix.length * 9) + 8;
      if (y + h > PH - 34) fresh();
      font(8, 'bold', DANGER); doc.text(san(`+${mv.days}d`), M, y);
      font(8, 'bold', INK); doc.text(stage, M + 30, y);
      font(7, 'normal', MUTED); doc.text(san(`${mv.on}  ·  ${mv.from} > ${mv.to}`), M + 30, y + stage.length * 9.5);
      font(8, 'normal', INK2); doc.text(why, M + 250, y);
      if (fix.length) { font(7, 'normal', MUTED); doc.text(fix, M + 250, y + why.length * 10); }
      y += h;
      doc.setDrawColor(LINE); doc.setLineWidth(0.3); doc.line(M, y - 7, PW - M, y - 7);
    }
  }
  return drawn;
}

/** One push later, for the list under the chart. */
export interface MoveLine { on: string; stage: string; from: string; to: string; days: number; why: string; fix?: string }

/** The plan on its own — landscape A4, a foot on every page. */
export function drawGanttDoc(doc: jsPDF, g: Gantt, opts: { name: string; printed: string; dates?: string; moves?: MoveLine[]; asOf?: string }): void {
  const pages = drawGantt(doc, g, {
    eyebrow: `THE PLAN · ${opts.name.toUpperCase()}`,
    title: 'The plan',
    // The same stamp as the screen: a reader of the paper knows how current it was.
    sub: [`Printed ${opts.printed}`, opts.asOf, opts.dates].filter(Boolean).join('   ·   '),
  }, opts.moves);
  pages.forEach((p, i) => {
    doc.setPage(p);
    doc.setFont(pdfFamily(), 'normal'); doc.setFontSize(7.5); doc.setTextColor(MUTED);
    doc.text(san(`${opts.name}  ·  the plan  ·  ${opts.printed}`), M, PH - 16);
    doc.text(`${i + 1} of ${pages.length}`, PW - M, PH - 16, { align: 'right' });
  });
}
