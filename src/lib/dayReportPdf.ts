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
import { ACCENT, DANGER, INK, INK2, LINE, MUTED, OK, WARN, BLUE, fit, san, setFont, type Doc } from './reportKit';
import type { Day, DayTone } from './day';
import type { Shot } from './testReport';
import { niceDay } from './weeks';

const M = 36;
const TONE: Record<DayTone, string> = {
  done: OK, bad: DANGER, slipped: DANGER, asking: WARN, found: ACCENT, booked: BLUE,
};

export interface DayReportMeta {
  project: string;
  lead?: string;
  builtAt: number;
  shots?: Shot[];
}

export function drawDayReport(d: Doc, day: Day, meta: DayReportMeta): void {
  const W = d.internal.pageSize.getWidth(), H = d.internal.pageSize.getHeight();
  const CW = W - 2 * M;
  let page = 1;

  const band = (first: boolean): number => {
    d.setFillColor(INK);
    d.rect(0, 0, W, first ? 96 : 40, 'F');
    setFont(d, 7, 'bold', '#9fc3b4');
    d.text('DAY REPORT', M, 20);
    setFont(d, 7, 'normal', '#8fae9f');
    d.text(fit(d, san(meta.project), W / 2), M + 62, 20);
    setFont(d, 6.5, 'normal', '#7f9b8d');
    d.text(`Built ${new Date(meta.builtAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`, W - M, 20, { align: 'right' });
    if (!first) {
      setFont(d, 9, 'bold', '#ffffff');
      d.text(`${san(niceDay(day.date, { weekday: 'short', year: true }))} — continued`, M, 32);
      return 56;
    }
    setFont(d, 20, 'bold', '#ffffff');
    d.text(san(niceDay(day.date, { weekday: 'short', year: true })), M, 50);
    setFont(d, 9.5, 'normal', '#cfe0d7');
    const head = d.splitTextToSize(san(day.headline), CW) as string[];
    head.slice(0, 2).forEach((l, i) => d.text(l, M, 68 + i * 12));
    return 112;
  };

  const foot = () => {
    setFont(d, 6.5, 'normal', MUTED);
    d.text(san(meta.lead ? `${meta.project} · ${meta.lead}` : meta.project), M, H - 16);
  };

  let y = band(true);

  /* INSTALL, AS IT STOOD — a bar, because "11 of 24" is read faster as a length. */
  if (day.install && day.install.total) {
    const { done, total } = day.install;
    setFont(d, 6.5, 'bold', MUTED);
    d.text('INSTALL, END OF THE DAY', M, y);
    setFont(d, 8, 'bold', INK);
    d.text(`${done} of ${total} steps done`, W - M, y, { align: 'right' });
    d.setFillColor('#eae7de');
    d.roundedRect(M, y + 6, CW, 6, 3, 3, 'F');
    if (done) { d.setFillColor(OK); d.roundedRect(M, y + 6, Math.max(6, CW * done / total), 6, 3, 3, 'F'); }
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
      const detail = l.detail ? (d.splitTextToSize(san(l.detail), CW - 16) as string[]).slice(0, 3) : [];
      const h = text.length * 12 + detail.length * 10.5 + 6;
      room(h);
      d.setFillColor(TONE[l.tone]);
      if (l.tone === 'slipped' || l.tone === 'booked') {
        d.setDrawColor(TONE[l.tone]);
        d.setLineWidth(1.2);
        d.circle(M + 3.5, y - 3, 2.6, 'S');
      } else {
        d.circle(M + 3.5, y - 3, 3, 'F');
      }
      setFont(d, 9.5, l.tone === 'bad' || l.tone === 'slipped' ? 'bold' : 'normal', INK);
      text.forEach((t, i) => d.text(t, M + 16, y + i * 12));
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

  /* THE DAY'S PICTURES, as many as fit one row. */
  const shots = meta.shots ?? [];
  if (shots.length) {
    const SH = 96;
    room(SH + 24);
    setFont(d, 7, 'bold', MUTED);
    d.text(`PICTURES FROM THE DAY${day.media.length > shots.length ? ` · ${shots.length} of ${day.media.length}` : ''}`, M, y);
    let x = M;
    for (const s of shots) {
      const sw = Math.min(160, (s.w / s.h) * SH);
      if (x + sw > W - M) break;
      try { d.addImage(s.data, 'JPEG', x, y + 8, sw, SH); } catch { /* a bad frame must not cost the words */ }
      x += sw + 8;
    }
    y += SH + 20;
  }

  foot();
  const pages = page;
  for (let p = 1; p <= pages; p++) {
    d.setPage(p);
    setFont(d, 6.5, 'normal', MUTED);
    d.text(`${p} of ${pages}`, W - M, H - 16, { align: 'right' });
  }
}
