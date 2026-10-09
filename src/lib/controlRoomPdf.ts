/* THE CONTROL ROOM REPORT ON PAPER — one A4 page, every job
 * (lib/controlRoomReport, docs/CONTROLROOM.md).
 *
 * Laid out by the report engine (src/lib/report/, docs/REPORTS.md), in the
 * order every page answers: where every job is (a row each, its verdict in
 * its colour and the reason in one line, the critical and the next thing
 * owed), then who owes what across the jobs, then what is late and what is
 * due this week. The lists step down until the page fits; every job is
 * always on it, and a page that cannot hold them all carries on rather than
 * leaving one out. */
import type { jsPDF } from 'jspdf';
import type { OnTargetTone } from './onTarget';
import type { Portfolio } from './portfolio';
import { CR_STEPS, controlRoomReport, type ControlRoomReport, type CrLine } from './controlRoomReport';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, label, rows, text, wrap } from './report/blocks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef';
const BRAND = '#1f63e0', OK = '#1e6b4b', DANGER = '#9b3227', AMBER = '#8a5f14', BOOKED = '#4f46b8';

/* The verdict's colours — the status report's, so the two pages read alike. */
const TONE: Record<OnTargetTone, { fill: string; stroke: string; text: string }> = {
  behind: { fill: '#fdf2f0', stroke: DANGER, text: DANGER },
  risk: { fill: '#f7eedb', stroke: AMBER, text: AMBER },
  on: { fill: '#eef6f1', stroke: '#9cc4af', text: OK },
  none: { fill: '#f4f6fa', stroke: '#c6d2e3', text: MUTED },
};

function fitLine(doc: jsPDF, t: string, w: number): string {
  font(doc, 7.5, 'normal', MUTED);
  if (doc.getTextWidth(t) <= w) return t;
  let s = t;
  while (s.length > 4 && doc.getTextWidth(`${s}…`) > w) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/* A job's row breathes less when the page is tight. */
const pad = (f: Frame) => (f.density === 'compact' ? 4 : 7);

function blocksOf(r: ControlRoomReport, d: Density): Block[] {
  const out: Block[] = [];
  out.push(text({ text: 'CONTROL ROOM · EVERY JOB', size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: 'Control room report', size: SIZE.title, style: 'bold', after: 4 }));
  out.push(text({ text: `Printed ${r.printed}`, colour: MUTED, after: gap(d, 'm') }));

  /* THE BOARD IN ONE SENTENCE, and its four numbers in words. */
  const t = r.totals;
  /* What the sentence does not already say: the jobs and the late are in it. */
  const counts = [t.critical ? `${t.critical} critical` : '', `${t.week} due or late this week`].filter(Boolean).join('   ·   ');
  const saysLines = (f: Frame) => wrap(f.doc, r.says, f.w - 28, 11, 'bold');
  out.push(box(f => 30 + saysLines(f).length * 14 + gap(f.density, 'l'), (f, y) => {
    const l = saysLines(f), h = 24 + l.length * 14;
    f.doc.setFillColor('#0d1f3c'); f.doc.roundedRect(f.x, y, f.w, h, 6, 6, 'F');
    font(f.doc, 11, 'bold', '#ffffff'); f.doc.text(l, f.x + 14, y + 17);
    font(f.doc, 8.5, 'normal', '#c9d6ea'); f.doc.text(counts, f.x + 14, y + 17 + l.length * 14);
  }, f => gap(f.density, 'l')));

  /* 1 · WHERE EVERY JOB IS — one row a job: its name and kind of change, its
     verdict in its colour, the reason in one line, the critical in red and
     what is owed next. */
  out.push(label('Where every job is'));
  const pillW = 92;
  const jobParts = (f: Frame, j: ControlRoomReport['jobs'][number]) => ({
    head: wrap(f.doc, `${j.name} — ${j.method}${j.at ? ` · ${j.at}` : ''}`, f.w - pillW - 10, 10, 'bold'),
    why: wrap(f.doc, j.why, f.w - pillW - 10, 8.5),
    crit: j.critical ? wrap(f.doc, j.critical, f.w - pillW - 10, 8.5, 'bold') : [],
    next: j.next ? wrap(f.doc, `Next: ${j.next}`, f.w - pillW - 10, 8.5) : [],
  });
  out.push(rows({
    rows: r.jobs.map(j => ({
      h: (f: Frame) => { const p = jobParts(f, j); return 2 * pad(f) + p.head.length * 12.5 + (p.why.length + p.crit.length + p.next.length) * 10.5; },
      draw: (f: Frame, top: number) => {
        const p = jobParts(f, j), c = TONE[j.tone];
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, top, f.x + f.w, top);
        const y = top + pad(f) - 7;
        font(f.doc, 10, 'bold', INK2); f.doc.text(p.head, f.x, y + 14);
        let ty = y + 14 + p.head.length * 12.5 - 2;
        font(f.doc, 8.5, 'normal', INK2); f.doc.text(p.why, f.x, ty); ty += p.why.length * 10.5;
        if (p.crit.length) { font(f.doc, 8.5, 'bold', DANGER); f.doc.text(p.crit, f.x, ty); ty += p.crit.length * 10.5; }
        if (p.next.length) { font(f.doc, 8.5, 'normal', j.nextLate ? DANGER : MUTED); f.doc.text(p.next, f.x, ty); }
        /* The verdict, a pill on the right in its colour, the word in it. */
        f.doc.setFillColor(c.fill); f.doc.setDrawColor(c.stroke); f.doc.setLineWidth(j.tone === 'behind' ? 1.2 : 0.7);
        f.doc.roundedRect(f.x + f.w - pillW, y + 5, pillW, 15, 7, 7, 'FD');
        font(f.doc, 8, 'bold', c.text); f.doc.text(j.word, f.x + f.w - pillW / 2, y + 15.2, { align: 'center' });
      },
    })),
    after: 'l',
  }));

  /* 2 · WHO OWES WHAT, ACROSS THE JOBS — suppliers first, the furthest
     behind leading, as the board orders them. */
  if (!r.owes.length && r.owesMore) out.push(text({ text: 'Who owes what — on the control room.', size: 9, style: 'bold', colour: INK2, after: gap(d, 'l') }));
  if (r.owes.length) {
    out.push(label('Who owes what'));
    const owedParts = (f: Frame, o: ControlRoomReport['owes'][number]) => ({
      head: wrap(f.doc, `${o.who} — ${o.who === 'No one named' ? 'has' : 'owes'} ${o.open}`, f.w - 70, 9.5, 'bold'),
      jobs: o.jobs ? wrap(f.doc, o.jobs, f.w - 70, 8.5) : [],
    });
    out.push(rows({
      rows: r.owes.map(o => ({
        h: (f: Frame) => { const p = owedParts(f, o); return 5 + p.head.length * 12 + p.jobs.length * 10.5 + 5; },
        draw: (f: Frame, y: number) => {
          const p = owedParts(f, o);
          f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
          font(f.doc, 9.5, 'bold', INK2); f.doc.text(p.head, f.x, y + 13);
          if (p.jobs.length) { font(f.doc, 8.5, 'normal', MUTED); f.doc.text(p.jobs, f.x, y + 13 + p.head.length * 12); }
          font(f.doc, 8.5, 'bold', o.late ? DANGER : MUTED); f.doc.text(o.late ? `${o.late} late` : 'none late', f.x + f.w, y + 13, { align: 'right' });
        },
      })),
      after: r.owesMore ? 's' : 'l',
    }));
    if (r.owesMore) out.push(text({ text: `and ${r.owesMore} more — on the control room.`, size: 8.5, colour: MUTED, after: gap(d, 'l') }));
  }

  /* 3 · WHAT IS LATE, and what is due this week — job, what, who, when. */
  const list = (title: string, items: CrLine[], more: number, empty: string, tone: string) => {
    /* A list stepped down to nothing is one line saying where it is. */
    if (!items.length && more) { out.push(text({ text: `${title} — on the control room.`, size: 9, style: 'bold', colour: INK2, after: gap(d, 'l') })); return; }
    out.push(label(title, items.length ? tone : MUTED));
    if (!items.length) { out.push(text({ text: empty, colour: INK2, after: gap(d, 'l') })); return; }
    const whenW = 96, jobW = 96;
    const parts = (f: Frame, x: CrLine) => ({
      job: wrap(f.doc, x.job, jobW - 8, 8.5, 'bold'),
      what: wrap(f.doc, `${x.what} · ${x.who}`, f.w - jobW - whenW - 8, 9),
      when: wrap(f.doc, x.when, whenW, 8.5, x.late ? 'bold' : 'normal'),
    });
    out.push(rows({
      rows: items.map(x => ({
        h: (f: Frame) => { const p = parts(f, x); return 5 + Math.max(p.job.length, p.what.length, p.when.length) * 11 + 4; },
        draw: (f: Frame, y: number) => {
          const p = parts(f, x);
          f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
          font(f.doc, 8.5, 'bold', INK2); f.doc.text(p.job, f.x, y + 12);
          font(f.doc, 9, 'normal', INK2); f.doc.text(p.what, f.x + jobW, y + 12);
          font(f.doc, 8.5, x.late ? 'bold' : 'normal', x.late ? DANGER : BOOKED); f.doc.text(p.when, f.x + f.w, y + 12, { align: 'right' });
        },
      })),
      after: more ? 's' : 'l',
    }));
    if (more) out.push(text({ text: `and ${more} more — on the control room.`, size: 8.5, colour: MUTED, after: gap(d, 'l') }));
  };
  list(`Late — ${r.late.length + r.lateMore}`, r.late, r.lateMore, 'Nothing is late.', DANGER);
  if (r.week.length || r.weekMore) list(`Due this week — ${r.week.length + r.weekMore}`, r.week, r.weekMore, '', BOOKED);
  return out;
}

/** Draw the control room report into `doc`: one page, the lists stepping down
 *  until it fits (every job stays on it). */
export async function drawControlRoomReport(doc: jsPDF, pf: Portfolio, today: string): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  let r = controlRoomReport(pf, today, CR_STEPS[0]);
  let density: Density = 'comfortable';
  const one = async (d: Density) => (await pour({ ...base, density: d, dry: true }, blocksOf(r, d), () => undefined)).pages === 1;
  steps: for (const limits of CR_STEPS) {
    r = controlRoomReport(pf, today, limits);
    for (const d of ['comfortable', 'compact'] as const) if (await one(d)) { density = d; break steps; }
    /* Past every step, and still more than a page: every job stays on it. */
    density = await chooseDensity(base, d => blocksOf(r, d));
  }
  await pour({ ...base, density, dry: false }, blocksOf(r, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    const num = `${i} of ${pages}`;
    doc.text(fitLine(doc, `Control room report  ·  ${r.printed}  ·  every job's own report has its detail`, CW - doc.getTextWidth(num) - 16), M, H - 18);
    doc.text(num, W - M, H - 18, { align: 'right' });
  }
}
