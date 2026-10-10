/* THE DAY REPORT — one day on the job, on a page you can send at the end of a
 * shift.
 *
 * Rowland: "telling a story". The story is lib/day.ts's, read once; this only
 * lays it out. A4 PORTRAIT, because it is read on a phone and forwarded from
 * there, the way the trial card is — but upright, because it is a list of
 * sentences, and sentences read down a page.
 *
 * It flows onto a second sheet rather than cutting lines off: the day that
 * went badly is the day with the most to say, and it is the one that most
 * needs every line.
 */
import { DANGER, INK, INK2, LINE, MUTED, OK, WARN, BLUE, SHELL_MUTED, drawMark, fit, nameFont, san, setFont, type Doc } from './reportKit';
import type { Day, DayTone } from './day';
import type { Shot } from './testReport';
import type { OnTarget, OnTargetTone } from './onTarget';
import { paceSays } from './pace';
import { niceDay } from './weeks';

const M = 36;
const TONE: Record<DayTone, string> = {
  done: OK, bad: DANGER, slipped: DANGER, asking: WARN, found: INK2, booked: BLUE, problem: WARN,
};
/* The verdict's word on the dark band — the app's dark-card reds and ambers
   (styles.css --shell-bad, --shell-warn), a quiet green, a grey. */
const ON_DARK: Record<OnTargetTone, string> = { behind: '#e2796b', risk: '#e0a94a', on: '#8fd3b0', none: '#9fb0cc' };

export interface DayReportMeta {
  project: string;
  lead?: string;
  builtAt: number;
  shots?: Shot[];
  /** ARE WE ON TARGET? (lib/onTarget) — at the top of the page's band. */
  onTarget?: OnTarget;
  /** "today, Tue 6 Oct" when the page is about another day. */
  asOf?: string;
}

export function drawDayReport(d: Doc, day: Day, meta: DayReportMeta): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const CW = W - 2 * M;
  let page = 1;

  /* THE BAND GROWS WITH THE DAY'S SENTENCE — it kept two lines of it and
     dropped the rest (docs/REPORTS.md: nothing is cut). */
  setFont(d, 9.5, 'normal', INK);
  const headLines = d.splitTextToSize(san(day.headline), CW) as string[];
  /* ARE WE ON TARGET? — the word in its colour, then the reason, wrapped to
     the band: the first line after the word, the rest the band's width. */
  const ot = meta.onTarget;
  const otLines: { word?: string; text: string; pace?: boolean }[] = [];
  if (ot) {
    setFont(d, 10.5, 'bold', INK);
    const ww = d.getTextWidth(`${san(ot.word)} `);
    setFont(d, 9.5, 'normal', INK);
    const reason = san(`— ${ot.reason}`);
    const first = (d.splitTextToSize(reason, CW - ww) as string[])[0] ?? '';
    const rest = reason.slice(first.length).trim();
    otLines.push({ word: san(ot.word), text: first }, ...(rest ? (d.splitTextToSize(rest, CW) as string[]).map(text => ({ text })) : []));
    /* THE PACE SAYS WHEN (lib/pace) — under the answer, a line of its own:
       amber when it lands after the date or nothing has been done lately. */
    if (ot.pace) {
      setFont(d, 8.5, ot.pace.tone === 'risk' ? 'bold' : 'normal', INK);
      otLines.push(...(d.splitTextToSize(san(paceSays(ot.pace)), CW) as string[]).map(text => ({ text, pace: true })));
    }
  }
  const otH = ot ? 12 + otLines.length * 12 + 6 : 0;
  const bandH = 74 + otH + headLines.length * 12 + 10;
  const band = (first: boolean): number => {
    d.setFillColor(INK);
    d.rect(0, 0, W, first ? bandH : 40, 'F');
    /* The band's small type in the shell's own muted blues (it was a green
       left over from an older palette), and the Faultline mark in the band —
       the corner stamp every other document carries would sit on the dark. */
    setFont(d, 7, 'bold', SHELL_MUTED);
    d.text('DAY REPORT', M, 20);
    setFont(d, 7, 'normal', SHELL_MUTED);
    d.text(fit(d, san(meta.project), W / 2), M + 62, 20);
    nameFont(d, 8, '#ffffff');
    const word = 'Faultline', tw = d.getTextWidth(word);
    d.text(word, W - M, 20, { align: 'right' });
    drawMark(d, W - M - tw - 15, 11.5, 11);
    setFont(d, 6.5, 'normal', SHELL_MUTED);
    d.text(`Built ${new Date(meta.builtAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`, W - M, 32, { align: 'right' });
    if (!first) {
      setFont(d, 9, 'bold', '#ffffff');
      d.text(`${san(niceDay(day.date, { weekday: 'short', year: true }))} — continued`, M, 32);
      return 56;
    }
    setFont(d, 20, 'bold', '#ffffff');
    d.text(san(niceDay(day.date, { weekday: 'short', year: true })), M, 50);
    let hy = 68;
    if (ot) {
      setFont(d, 6.5, 'bold', SHELL_MUTED);
      d.text(`ARE WE ON TARGET?${meta.asOf ? ` \u00b7 ${san(meta.asOf).toUpperCase()}` : ''}`, M, 67);
      otLines.forEach((l, i) => {
        const ly = 79 + i * 12;
        let lx = M;
        if (l.word) {
          setFont(d, 10.5, 'bold', ON_DARK[ot.tone]);
          d.text(l.word, M, ly);
          lx = M + d.getTextWidth(`${l.word} `);
        }
        if (l.pace && ot.pace) setFont(d, 8.5, ot.pace.tone === 'risk' ? 'bold' : 'normal', ot.pace.tone === 'risk' ? ON_DARK.risk : SHELL_MUTED);
        else setFont(d, 9.5, 'normal', '#ffffff');
        d.text(l.text, lx, ly);
      });
      hy = 67 + otH + 6;
    }
    setFont(d, 9.5, 'normal', '#c9d4e6');
    headLines.forEach((l, i) => d.text(l, M, hy + i * 12));
    return bandH + 16;
  };

  const foot = () => {
    setFont(d, 6.5, 'normal', MUTED);
    d.text(san(meta.lead ? `${meta.project} · ${meta.lead}` : meta.project), M, H - 16);
  };

  let y = band(true);

  /* EACH GATE, AS IT STOOD — a bar, because "11 of 24" is read faster as a
     length. Install, Set up and Hand over, whichever have steps: the same
     bars the day's screen draws. */
  for (const g of day.gates) {
    const { done, total, late, problem } = g;
    setFont(d, 6.5, 'bold', MUTED);
    d.text(`${g.label.toUpperCase()}, END OF THE DAY`, M, y);
    /* The same bar as the screen: done a quiet green, late red after it, and
       late said in words so it survives a black-and-white print. */
    const words = `${done} of ${total} steps done`;
    /* WHICH, by the one rule (lib/install lateOrProblem): late in red, a
       problem that lost no time in amber — said apart, never "late or a
       problem". Drawn from the right, each piece in its colour. */
    const parts: { t: string; c: string }[] = [{ t: words, c: INK }];
    if (late) parts.push({ t: ` \u00b7 ${late} late`, c: DANGER });
    if (problem) parts.push({ t: ` \u00b7 ${problem} a problem`, c: WARN });
    let rx = W - M;
    for (const p of [...parts].reverse()) {
      setFont(d, 8, 'bold', p.c);
      d.text(p.t, rx, y, { align: 'right' });
      rx -= d.getTextWidth(p.t);
    }
    d.setFillColor('#e9eff7');
    d.roundedRect(M, y + 6, CW, 6, 3, 3, 'F');
    const doneW = done ? Math.max(6, CW * done / total) : 0;
    if (done) { d.setFillColor('#a9cdbb'); d.roundedRect(M, y + 6, doneW, 6, 3, 3, 'F'); }
    let bx = M + doneW;
    if (late) { const lw = Math.max(3, CW * late / total); d.setFillColor(DANGER); d.rect(bx, y + 6, lw, 6, 'F'); bx += lw; }
    if (problem) { d.setFillColor(WARN); d.rect(bx, y + 6, Math.max(3, CW * problem / total), 6, 'F'); }
    y += 28;
  }

  const room = (need: number) => {
    if (y + need <= H - 36) return;
    foot();
    d.addPage();
    page += 1;
    y = band(false);
  };

  if (day.sections.length === 0) {
    setFont(d, 10, 'normal', MUTED);
    d.text('Nothing was logged for this day.', M, y + 6);
    y += 24;
  }

  for (const s of day.sections) {
    room(40);
    setFont(d, 7, 'bold', MUTED);
    d.text(san(s.title).toUpperCase(), M, y);
    d.setDrawColor(LINE);
    d.setLineWidth(0.6);
    d.line(M, y + 4, W - M, y + 4);
    y += 18;
    for (const l of s.lines) {
      setFont(d, 9.5, 'normal', INK);
      const text = d.splitTextToSize(san(l.text), CW - 16) as string[];
      setFont(d, 8, 'normal', INK2);
      // Every line of it: the detail stopped at three.
      const detail = l.detail ? d.splitTextToSize(san(l.detail), CW - 16) as string[] : [];
      const h = text.length * 12 + detail.length * 10.5 + 6;
      room(h);
      d.setFillColor(TONE[l.tone]);
      // Hollow for what has no verdict yet — booked, slipped, or written down — as the screen draws it.
      if (l.tone === 'slipped' || l.tone === 'booked' || l.tone === 'found') {
        d.setDrawColor(TONE[l.tone]);
        d.setLineWidth(1.2);
        d.circle(M + 3.5, y - 3, 2.6, 'S');
      } else {
        d.circle(M + 3.5, y - 3, 3, 'F');
      }
      const style = l.tone === 'bad' || l.tone === 'slipped' || l.tone === 'problem' ? 'bold' : 'normal';
      setFont(d, 9.5, style, INK);
      /* The words that say which — "late, 2 h lost", "a problem, no time
         lost" — in the line's colour, wherever the wrap puts them. */
      const full = san(l.text), mark = l.mark ? san(l.mark) : '';
      const at = mark ? full.indexOf(mark) : -1;
      let pos = 0;
      text.forEach((t, i) => {
        const s0 = Math.max(pos, full.indexOf(t, pos));
        pos = s0 + t.length;
        const a = at - s0, b = at + mark.length - s0;
        if (at < 0 || b <= 0 || a >= t.length) { setFont(d, 9.5, style, INK); d.text(t, M + 16, y + i * 12); return; }
        let cx = M + 16;
        const seg = (s: string, c: string, st: 'bold' | 'normal') => {
          if (!s) return;
          setFont(d, 9.5, st, c);
          d.text(s, cx, y + i * 12);
          cx += d.getTextWidth(s);
        };
        seg(t.slice(0, Math.max(0, a)), INK, style);
        seg(t.slice(Math.max(0, a), Math.min(t.length, b)), TONE[l.tone], 'bold');
        seg(t.slice(Math.min(t.length, b)), INK, style);
      });
      y += text.length * 12;
      if (detail.length) {
        setFont(d, 8, 'normal', INK2);
        detail.forEach((t, i) => d.text(t, M + 16, y - 1 + i * 10.5));
        y += detail.length * 10.5;
      }
      y += 6;
    }
    y += 10;
  }

  /* THE DAY'S PICTURES, as many as fit one row — and under each, what is
     marked on it (ui/Evidence), by the numbers drawn on it. */
  const shots = meta.shots ?? [];
  if (shots.length) {
    const SH = 96;
    const row: { s: Shot; x: number; w: number; marks: string[][] }[] = [];
    let x = M;
    for (const s of shots) {
      const sw = Math.min(160, (s.w / s.h) * SH);
      if (x + sw > W - M) break;
      setFont(d, 7, 'normal', INK2);
      row.push({ s, x, w: sw, marks: (s.marks ?? []).map(m => d.splitTextToSize(san(m), Math.max(40, sw - 10)) as string[]) });
      x += sw + 8;
    }
    const marksH = Math.max(0, ...row.map(r => r.marks.reduce((n, l) => n + l.length, 0) * 8.5));
    room(SH + 24 + (marksH ? marksH + 6 : 0));
    setFont(d, 7, 'bold', MUTED);
    d.text(`PICTURES FROM THE DAY${day.media.length > shots.length ? ` · ${shots.length} of ${day.media.length}` : ''}`, M, y);
    for (const r of row) {
      try { d.addImage(r.s.data, 'JPEG', r.x, y + 8, r.w, SH); } catch { /* a bad frame must not cost the words */ }
      let my = y + 8 + SH + 11;
      r.marks.forEach((lines, i) => {
        setFont(d, 7, 'bold', DANGER); d.text(String(i + 1), r.x, my);
        setFont(d, 7, 'normal', INK2); d.text(lines, r.x + 9, my);
        my += lines.length * 8.5;
      });
    }
    y += SH + 20 + (marksH ? marksH + 6 : 0);
  }

  foot();
  const pages = page;
  for (let p = 1; p <= pages; p++) {
    d.setPage(p);
    setFont(d, 6.5, 'normal', MUTED);
    d.text(`${p} of ${pages}`, W - M, H - 16, { align: 'right' });
  }
}
