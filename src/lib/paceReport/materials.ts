/* MATERIALS, ON PAPER — the client report's materials sheets, the grid of
 * weeks as lib/materials shades them, as many sheets as the list takes
 * (docs/STEADY.md, S4). */
import {
  INK, INK2, MUTED, LINE, SURF2, OK, DANGER, BLUE,
  san, setFont, fit, panel, type Doc
} from '../reportKit';
import type { PaceReportData } from './data';

/* ---- AS MANY SHEETS AS THE LIST TAKES ----
 * The grid was capped at 26 rows and the footer said "14 more on the list than
 * fit this sheet — the app has them all", which is the report telling the
 * client to go and look somewhere else. A list runs onto the next sheet under
 * the same heading, "continued", with the week columns repeated. */
const MAT_ROW_MIN = 12, MAT_PANEL_HEAD = 44, MAT_GRID_HEAD = 50, MAT_FOOT_PAD = 22;
export function materialsPlan(n: number, H: number, M: number): { sheets: number; per: number } {
  const maxRows = Math.max(1, Math.floor((H - 2 * M - 14 - MAT_PANEL_HEAD - MAT_GRID_HEAD - MAT_FOOT_PAD) / MAT_ROW_MIN));
  const sheets = Math.max(1, Math.ceil(n / maxRows));
  return { sheets, per: Math.ceil(n / sheets) };
}
export function materialsHeight(data: PaceReportData, H: number, M: number): number {
  const m = data.materials;
  if (!m) return 0;
  const rows = materialsPlan(m.rows.length, H, M).per;
  const rowH = Math.max(MAT_ROW_MIN, Math.min(22, (H - 2 * M - 14 - MAT_PANEL_HEAD - MAT_GRID_HEAD - MAT_FOOT_PAD) / Math.max(1, rows)));
  return Math.min(H - 2 * M - 14, Math.max(150, MAT_PANEL_HEAD + MAT_GRID_HEAD + rows * rowH + MAT_FOOT_PAD));
}

export function materialsSheet(d: Doc, data: PaceReportData, page: number, pages: number,
  yTop?: number, withFoot = true, sheet = 0): number {
  const m = data.materials;
  if (!m) return 0;
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;

  const late = m.late > 0
    ? `${m.late} late \u00b7 ${m.waiting} still to come \u00b7 ${m.here} of ${m.total} in`
    : `${m.waiting} still to come \u00b7 ${m.here} of ${m.total} in`;

  const { per } = materialsPlan(m.rows.length, H, M);
  const rows = m.rows.slice(sheet * per, (sheet + 1) * per);
  const weeks = m.weeks;
  const y0 = yTop ?? M;

  /* THE PANEL IS AS TALL AS THE PLAN, not as tall as the page.
   *
   * Drawn full height first, seven rows of film sat in the top quarter of an A3
   * inside a box three times their height, which reads as a page that failed to
   * finish rather than as a short list. A box that stops where its content stops
   * leaves the white space OUTSIDE it, where white space is just paper. */
  /* GRID_HEAD was 36 and the week labels sat inside it at top+30 — but the
     first row's cells are drawn from `bodyTop - rowH + 6`, which on a tall row
     began at top+20 and painted straight over them. The grid printed with a
     month band, no week names, and an unlabelled column axis: the reader could
     see a block of green and not which weeks it covered. */
  const PANEL_HEAD = MAT_PANEL_HEAD, GRID_HEAD = MAT_GRID_HEAD, FOOT_PAD = MAT_FOOT_PAD;
  const rowH = Math.max(MAT_ROW_MIN, Math.min(22, (H - 2 * M - 14 - PANEL_HEAD - GRID_HEAD - FOOT_PAD) / Math.max(1, rows.length)));
  const panelH = Math.min(
    H - 2 * M - 14,
    Math.max(150, PANEL_HEAD + GRID_HEAD + rows.length * rowH + FOOT_PAD),
  );
  const top = panel(d, M, y0, CW, panelH, String(page), sheet ? 'What we are waiting on — continued' : 'What we are waiting on', late);

  /* Columns: the thing, when it is planned for, then one narrow cell per week.
     The week cells get whatever is left, so a long plan squeezes rather than
     running off the page. */
  const x0 = M + 14;
  const right = M + CW - 14;
  const whenW = 62;
  /* THE WEEK CELLS TAKE THE SHEET. Capped at 34 they drew a grid six inches
     wide in the middle of an A3 and left the rest white — "we've got the
     calendar all the way under the size". The cap is now generous enough that
     a short plan fills the paper it is printed on. */
  const wkW = Math.min(58, Math.max(14, (right - x0 - 320 - whenW) / Math.max(1, weeks.length)));
  const itemW = right - x0 - whenW - wkW * weeks.length;
  const gridX = x0 + itemW + whenW;

  /* The first row begins BELOW the week names, whatever the row height. */
  const headBottom = top + 34;
  const bodyTop = headBottom + rowH - 6;

  /* ---- the head: the months over their weeks, then the week names ---- */
  let runFrom = 0;
  weeks.forEach((w, i) => {
    const lastOfRun = i === weeks.length - 1 || weeks[i + 1].month !== w.month;
    if (!lastOfRun) return;
    const x = gridX + runFrom * wkW;
    const width = (i - runFrom + 1) * wkW;
    d.setFillColor(SURF2); d.setDrawColor(LINE); d.setLineWidth(0.5);
    d.rect(x, top + 10, width, 12, 'FD');
    setFont(d, 6.5, 'bold', INK2);
    d.text(fit(d, w.month.toUpperCase(), width - 4), x + width / 2, top + 18.5, { align: 'center' });
    runFrom = i + 1;
  });

  setFont(d, 6.5, 'bold', MUTED);
  d.text('WHAT WE NEED', x0, top + 18.5);
  d.text('PLANNED FOR', x0 + itemW, top + 18.5);
  weeks.forEach((w, i) => {
    setFont(d, 6, 'bold', MUTED);
    d.text(fit(d, w.label, wkW - 2), gridX + i * wkW + wkW / 2, top + 30, { align: 'center' });
  });

  d.setDrawColor(LINE); d.setLineWidth(0.6);
  d.line(x0, headBottom - 2, right, headBottom - 2);

  /* ---- the rows ----
     THE BANDS FIRST, ALL OF THEM, then the text. Drawn row by row, a shaded
     row's background began at the previous row's baseline + 5 and painted over
     its second line — so "3d late" under a date came out sliced in half on a
     sheet going to a client. */
  rows.forEach((_r, i) => {
    if (i % 2 !== 1) return;
    d.setFillColor('#faf9f5');
    d.rect(x0 - 4, bodyTop + i * rowH - rowH + 5, right - x0 + 8, rowH, 'F');
  });

  rows.forEach((r, i) => {
    const y = bodyTop + i * rowH;

    setFont(d, Math.min(8, rowH * 0.5), r.late != null ? 'bold' : 'normal', r.here ? MUTED : INK);
    d.text(fit(d, san(r.what), itemW - 6), x0, y);

    /* The arrival column says one of three things, and each one is a different
       fact: it is here, it is due on a date, or nobody has given a date. */
    setFont(d, Math.min(7, rowH * 0.45), 'bold',
      r.here ? OK : r.late != null ? DANGER : r.due ? INK2 : MUTED);
    d.text(r.here ? 'In stock' : r.due ? r.due : 'no date', x0 + itemW, y);
    if (r.late != null) {
      setFont(d, 5.5, 'normal', DANGER);
      d.text(`${r.late}d late`, x0 + itemW, y + 6);
    }

    /* The block. A covered week is filled; an uncovered one is left as the
       faintest wash, so the eye reads the BLOCK rather than counting cells —
       which is how the spreadsheet is read. Indigo while it is still coming
       (ahead), green only once it is in (done): one colour, one meaning. */
    r.covered.forEach((on, c) => {
      const cx = gridX + c * wkW;
      d.setFillColor(on ? (r.here ? OK : BLUE) : '#edf1f1');
      d.setDrawColor('#ffffff'); d.setLineWidth(0.6);
      d.rect(cx + 0.5, y - rowH + 6, wkW - 1, rowH - 2.5, 'FD');

      /* THE DAY, IN THE WEEK IT LANDS. White on the block it sits on, so it
         reads as part of the block rather than as something stuck over it. */
      const on_date = r.lands[c];
      if (on_date) {
        setFont(d, Math.min(6, wkW * 0.19), 'bold', on ? '#ffffff' : INK2);
        d.text(fit(d, on_date, wkW - 2), cx + wkW / 2, y - rowH / 2 + 8, { align: 'center' });
      }
    });
  });

  if (withFoot) {
    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, `${data.title} \u00b7 client report \u00b7 page ${page} of ${pages} \u2014 what we are waiting on`, CW * 0.8), M, H - M + 6);
    d.text('Indigo from the week it is due \u00b7 green once it is in.',
      W - M, H - M + 6, { align: 'right' });
  }
  return y0 + panelH;
}
