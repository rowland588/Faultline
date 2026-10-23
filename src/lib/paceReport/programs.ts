/* WHAT THE MACHINE CAN RUN — the client report's programs sheets, a list in
 * columns with the state as a word (docs/STEADY.md, S4). */
import {
  INK, INK2, MUTED, LINE, OK, WARN, DANGER,
  san, setFont, fit, panel, type Doc
} from '../reportKit';
import type { PaceReportData } from './data';

/* ---------- WHAT THE MACHINE CAN RUN ----------
 *
 * Rowland: "on the client report we, for some reason, have what the machine can run
 * for the programs, and then we have a calendar — September, October, week
 * three, week four, week one, week two, week three, week four. Makes no sense.
 * We don't need that."
 *
 * He is right, and the reason is worth keeping written down. A program is not a
 * thing that ARRIVES. Materials earn a calendar because each one lands on a
 * date and the question is coverage over time — is the week we want to run in
 * green yet. A program is written, loaded and proved, and once it is proved it
 * stays proved; painting that across eight week columns produced eight columns
 * of one colour and a single ring, which is a great deal of ink to say "tested
 * on the 6th".
 *
 * So this is a LIST, two columns across the sheet, answering the four things
 * somebody actually asks: what it is, what it runs, where it has got to, and
 * when we find out. The state is a word as well as a colour, because this page
 * gets photocopied and faxed to an OEM.
 */
const PG_ROW_H = 22, PG_HEAD = 34, PG_KEY = 30, PG_PAD = 12;
const pgMaxRows = (H: number, M: number) => Math.max(1, Math.floor((H - 2 * M - 14 - PG_HEAD - PG_KEY - PG_PAD) / PG_ROW_H));
/** Sheets for this many programs: one column up to 16, two after, and as many
 *  sheets as two columns take — the rows past the sheet were dropped before. */
export function programsPlan(n: number, H: number, M: number): { sheets: number; per: number } {
  const maxRows = pgMaxRows(H, M);
  const perSheet = n > 16 ? maxRows * 2 : maxRows;
  const sheets = Math.max(1, Math.ceil(n / perSheet));
  return { sheets, per: Math.ceil(n / sheets) };
}
export function programsHeight(data: PaceReportData, H: number, M: number): number {
  const pg = data.programs;
  if (!pg) return 0;
  const n = programsPlan(pg.rows.length, H, M).per;
  const perCol = n > 16 ? Math.min(pgMaxRows(H, M), Math.ceil(n / 2)) : Math.min(pgMaxRows(H, M), n);
  return Math.min(H - 2 * M - 14, Math.max(130, PG_HEAD + perCol * PG_ROW_H + PG_KEY + PG_PAD));
}

export function programsSheet(d: Doc, data: PaceReportData, page: number, pages: number,
  yTop?: number, withFoot = true, sheet = 0): void {
  const pg = data.programs;
  if (!pg) return;
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const M = 26, CW = W - 2 * M;

  const sub = pg.overdue > 0
    ? `${pg.overdue} late for ${pg.overdue === 1 ? 'its' : 'their'} test · ${pg.proved} of ${pg.total} proved`
    : `${pg.proved} of ${pg.total} proved · ${pg.onMachine} on the machine · ${pg.needed} not written`;

  /* THE SHEET IS AS TALL AS THE LIST, and as wide as it needs to be.
     A panel given the whole A3 whatever is in it printed seven programs in the
     top-left corner of an otherwise empty sheet — the same "be a bit smarter
     with size" complaint the calendar earned. */
  const rowH = PG_ROW_H;
  const HEAD = PG_HEAD, KEY = PG_KEY, PAD = PG_PAD;
  const maxRows = pgMaxRows(H, M);
  const { per } = programsPlan(pg.rows.length, H, M);
  const mine = pg.rows.slice(sheet * per, (sheet + 1) * per);

  /* One column while the list is short enough to read down; two once it is long
     enough that a second column saves a sheet rather than splitting a glance. */
  const twoCols = mine.length > 16;
  const perCol = twoCols ? Math.min(maxRows, Math.ceil(mine.length / 2)) : Math.min(maxRows, mine.length);
  const rows = mine;

  const panelH = Math.min(H - 2 * M - 14, Math.max(130, HEAD + perCol * rowH + KEY + PAD));
  const y0 = yTop ?? M;
  /* Sharing a sheet with materials: no badge, because the badge is the page
     number and the page already has one. */
  const top = panel(d, M, y0, CW, panelH, withFoot ? String(page) : '', sheet ? 'What the machine can run — continued' : 'What the machine can run', sub);

  const gap = 34;
  const inner = CW - 28;
  /* A single column stops well short of the full A3 width: a three-word program
     name with 800pt of rule after it reads as a mistake. */
  const colW = twoCols ? (inner - gap) / 2 : Math.min(inner, 620);
  const x0 = M + 14;
  const bodyTop = top + HEAD;

  const wRuns = colW * 0.28, wWhen = colW * 0.32;
  const wWhat = colW - wRuns - wWhen;

  for (let c = 0; c < (twoCols ? 2 : 1); c++) {
    const cx = x0 + c * (colW + gap);
    if (c * perCol >= rows.length) break;

    setFont(d, 6.5, 'bold', MUTED);
    d.text('PROGRAM', cx, top + 20);
    d.text('WHAT IT RUNS', cx + wWhat, top + 20);
    d.text('WHERE IT HAS GOT TO', cx + wWhat + wRuns, top + 20);
    d.setDrawColor(LINE); d.setLineWidth(0.6);
    d.line(cx, top + 24, cx + colW, top + 24);

    for (let i = 0; i < perCol; i++) {
      const r = rows[c * perCol + i];
      if (!r) break;
      const y = bodyTop + i * rowH;

      if (i % 2 === 1) {
        d.setFillColor('#faf9f5');
        d.rect(cx - 4, y - 13, colW + 8, rowH, 'F');
      }

      /* A dot carries the state as colour; the words beside it carry it
         without. Neither is load-bearing on its own — this page gets
         photocopied and faxed to an OEM. */
      const dot = r.state === 'proved' ? OK : r.overdue != null ? DANGER
        : r.state === 'onMachine' ? WARN : MUTED;
      d.setFillColor(dot);
      d.circle(cx + 3, y - 3, 3, 'F');

      setFont(d, 9, r.overdue != null ? 'bold' : 'normal', r.state === 'proved' ? INK2 : INK);
      d.text(fit(d, san(r.what), wWhat - 18), cx + 11, y);

      setFont(d, 8, 'normal', MUTED);
      d.text(fit(d, san(r.runs ?? '\u2014'), wRuns - 8), cx + wWhat, y);

      /* "6 days ago" goes on the SAME line, not under it. Underneath, it fell
         into the rule between the rows and read as a smudge. */
      const when = r.overdue != null
        ? `${r.when} \u00b7 ${r.overdue} day${r.overdue === 1 ? '' : 's'} ago`
        : r.when;
      setFont(d, 8, 'bold',
        r.state === 'proved' ? OK : r.overdue != null ? DANGER : r.state === 'onMachine' ? INK2 : MUTED);
      d.text(fit(d, when, wWhen - 8), cx + wWhat + wRuns, y);

      d.setDrawColor('#eef1ea'); d.setLineWidth(0.4);
      d.line(cx, y + 7, cx + colW, y + 7);
    }
  }

  /* ---- the key: four dots and what they mean ---- */
  const keyY = y0 + panelH - 13;
  let kx = x0;
  ([[OK, 'Proved'], [WARN, 'On the machine, not proved'], [DANGER, 'Test date gone'], [MUTED, 'Not written yet']] as const)
    .forEach(([c, label]) => {
      d.setFillColor(c); d.circle(kx + 3, keyY - 2, 3, 'F');
      setFont(d, 6.5, 'normal', INK2);
      d.text(label, kx + 10, keyY);
      kx += 26 + d.getTextWidth(label);
    });

  if (withFoot) {
    setFont(d, 7, 'normal', MUTED);
    d.text(fit(d, `${data.title} · client report · page ${page} of ${pages} — what the machine can run`, CW * 0.8), M, H - M + 6);
    d.text('Proved carries the day it was proved. The word on its own is an opinion.',
      W - M, H - M + 6, { align: 'right' });
  }
}
