/* THE HANDOVER REPORT ON PAPER — the line as it was really handed over
 * (lib/handoverReport, docs/HANDOVER.md).
 *
 * Laid out by the report engine (src/lib/report/, docs/REPORTS.md), in the
 * order a handover is read: is it handed over, and how did that go against
 * the day agreed; then every machine as it really is (where it is and what
 * it went with, its tests against what each had to show, its hand-over list
 * with each sign-off and what it accepted, and what is still open on it);
 * what is open on no one machine; and the lines to sign. Long words, a long
 * account, many machines: it carries on over pages rather than cut anything,
 * and every account and sign-off note is printed whole. */
import type { jsPDF } from 'jspdf';
import type { OnTargetTone } from './onTarget';
import type { HandoverReport, HoTone } from './handoverReport';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, heading, label, rows, text, wrap } from './report/blocks';
import { niceDay } from './weeks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef';
const BRAND = '#1f63e0', OK = '#1e6b4b', DANGER = '#9b3227', AMBER = '#8a5f14', BOOKED = '#4f46b8';

/* One colour, one meaning — the app's, on paper. */
const TONE: Record<HoTone, string> = { done: OK, failed: DANGER, late: DANGER, ahead: BOOKED, none: MUTED };
const VERDICT: Record<OnTargetTone, string> = { behind: '#ffb4a8', risk: '#f2cf86', on: '#9fd8bb', none: '#c9d6ea' };

function fitLine(doc: jsPDF, t: string, w: number): string {
  font(doc, 7.5, 'normal', MUTED);
  if (doc.getTextWidth(t) <= w) return t;
  let s = t;
  while (s.length > 4 && doc.getTextWidth(`${s}…`) > w) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/** A line of a list: the thing on the left, its state on the right in its
 *  colour. Short by nature — the long words go under it, as text that can
 *  carry over a page. */
function line(left: string, right: string, colour: string, o: { bold?: boolean; who?: string } = {}): Block {
  const rightW = 150;
  const parts = (f: Frame) => ({
    l: wrap(f.doc, left, f.w - rightW - 8, 9.5, o.bold === false ? 'normal' : 'bold'),
    w: o.who ? wrap(f.doc, o.who, f.w - rightW - 8, 8.5) : [],
    r: wrap(f.doc, right, rightW, 8.5, 'bold'),
  });
  return rows({
    rows: [{
      h: (f: Frame) => { const p = parts(f); return 5 + Math.max(p.l.length * 12 + p.w.length * 10.5, p.r.length * 10.5) + 3; },
      draw: (f: Frame, y: number) => {
        const p = parts(f);
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
        font(f.doc, 9.5, o.bold === false ? 'normal' : 'bold', INK2); f.doc.text(p.l, f.x, y + 13);
        if (p.w.length) { font(f.doc, 8.5, 'normal', MUTED); f.doc.text(p.w, f.x, y + 13 + p.l.length * 12); }
        font(f.doc, 8.5, 'bold', colour); f.doc.text(p.r, f.x + f.w, y + 13, { align: 'right' });
      },
    }],
    after: 's',
  });
}

function blocksOf(r: HandoverReport, d: Density): Block[] {
  const out: Block[] = [];
  out.push(text({ text: 'HANDOVER · STAGE GATE', size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: r.name, size: SIZE.title, style: 'bold', after: 4 }));
  out.push(text({ text: [r.lead ? `Led by ${r.lead}` : '', `Printed ${r.printed}`].filter(Boolean).join('   ·   '), colour: MUTED, after: gap(d, 'm') }));

  /* IS IT HANDED OVER, AND HOW DID IT GO — the verdict and the sentence. */
  const v = r.verdict;
  /* Handed over, the verdict's reason says the day and what is open; the
     sentence would say it twice. Before that, it says where the job is. */
  const band = (f: Frame) => ({
    head: wrap(f.doc, `${v.word} — ${v.reason}`, f.w - 28, 11, 'bold'),
    said: r.handedOver ? [] : wrap(f.doc, r.sentence, f.w - 28, 9),
  });
  out.push(box(f => { const b = band(f); return 24 + b.head.length * 14 + b.said.length * 11.5 + 4; }, (f, y) => {
    const b = band(f), h = 24 + b.head.length * 14 + b.said.length * 11.5;
    f.doc.setFillColor('#0d1f3c'); f.doc.roundedRect(f.x, y, f.w, h, 6, 6, 'F');
    font(f.doc, 11, 'bold', VERDICT[v.tone]); f.doc.text(b.head, f.x + 14, y + 18);
    font(f.doc, 9, 'normal', '#e3eaf5'); f.doc.text(b.said, f.x + 14, y + 18 + b.head.length * 14);
  }, f => gap(f.density, 'l')));

  /* THE THREE FACTS — the day agreed, the day it went, the machines. */
  const facts: [string, string][] = [
    ['Agreed handover', r.agreed ? niceDay(r.agreed, { weekday: 'short' }) : 'no date agreed'],
    [r.handedOver ? 'Handed over' : 'Expected', r.handedOver ? (r.handedOn ? niceDay(r.handedOn, { weekday: 'short' }) : 'every machine') : r.expected ? niceDay(r.expected, { weekday: 'short' }) : 'not yet'],
    ['Machines', r.machinesSaid],
  ];
  const factLines = (f: Frame, t: string) => wrap(f.doc, t, (f.w - 16) / 3 - 16, 10, 'bold');
  out.push(box(f => 22 + Math.max(...facts.map(([, t]) => factLines(f, t).length)) * 12.5 + 4, (f, y) => {
    const cw = (f.w - 16) / 3;
    const h = 22 + Math.max(...facts.map(([, t]) => factLines(f, t).length)) * 12.5;
    facts.forEach(([k, t], i) => {
      const x = f.x + i * (cw + 8);
      f.doc.setDrawColor(LINE); f.doc.setFillColor('#f6f8fb'); f.doc.setLineWidth(0.6); f.doc.roundedRect(x, y, cw, h, 5, 5, 'FD');
      font(f.doc, 7, 'bold', MUTED); f.doc.text(k.toUpperCase(), x + 8, y + 12);
      font(f.doc, 10, 'bold', INK2); f.doc.text(factLines(f, t), x + 8, y + 25);
    });
  }, f => gap(f.density, 'l')));

  /* EVERY MACHINE, AS IT REALLY IS. */
  for (const m of r.machines) {
    out.push(heading(m.name, [m.at, m.on ? `on ${niceDay(m.on, { weekday: 'short' })}` : ''].filter(Boolean).join(' '), { size: SIZE.h2 + 1.5 }));
    if (m.with.length) out.push(text({ text: `Handed over with ${m.with.join(' · ')}`, size: 9, style: 'bold', colour: AMBER, after: gap(d, 's') }));

    out.push(label('Tests — against what was agreed'));
    if (m.noTest) out.push(text({ text: 'No test kept on this machine.', size: 9, style: 'bold', colour: AMBER, after: gap(d, 'm') }));
    for (const t of m.tests) {
      out.push(line(t.title, [t.word, t.when].filter(Boolean).join(' · '), TONE[t.tone]));
      if (t.passesIf) out.push(text({ text: `Had to show: ${t.passesIf}`, size: 8.5, colour: INK2, indent: 10 }));
      if (t.said) out.push(text({ text: `Seen: ${t.said}`, size: 8.5, colour: MUTED, indent: 10 }));
      if (t.files) out.push(text({ text: t.files, size: 8.5, colour: MUTED, indent: 10 }));
    }
    if (m.tests.length) out.push({ height: f => gap(f.density, 's'), draw: () => undefined });

    out.push(label('Hand over'));
    if (!m.items.length) out.push(text({ text: 'No hand-over list on this machine yet.', size: 9, colour: MUTED, after: gap(d, 'm') }));
    for (const it of m.items) {
      out.push(line(it.title, it.state, TONE[it.tone], { ...(it.who ? { who: it.signOff && it.tone === 'done' ? `signed by ${it.who}` : it.who } : {}) }));
      /* A sign-off's account is what it accepted — said in full. */
      if (it.said) out.push(text({ text: it.said, size: 8.5, colour: it.signOff ? INK2 : MUTED, indent: 10, ...(it.signOff ? { style: 'bold' as const } : {}) }));
      /* What was handed over, by name — the drawings, the signed sheet (docs/PANELS.md). */
      if (it.files) out.push(text({ text: it.files, size: 8.5, colour: MUTED, indent: 10 }));
    }
    if (m.items.length) out.push({ height: f => gap(f.density, 's'), draw: () => undefined });

    out.push(label('Still open on it', m.open.length ? AMBER : MUTED));
    if (!m.open.length) out.push(text({ text: 'Nothing still open.', size: 9, colour: INK2, after: gap(d, 'l') }));
    else m.open.forEach((o, i) => out.push(text({ text: o, size: 9, colour: INK2, indent: 10, bullet: '•', after: i === m.open.length - 1 ? gap(d, 'l') : 2 })));
  }
  if (!r.machines.length) out.push(text({ text: 'No machines on the job yet.', colour: MUTED, after: gap(d, 'l') }));

  /* OPEN ON NO ONE MACHINE. */
  if (r.line.length) {
    out.push(label('Still open on the line', AMBER));
    r.line.forEach((o, i) => out.push(text({ text: o, size: 9, colour: INK2, indent: 10, bullet: '•', after: i === r.line.length - 1 ? gap(d, 'l') : 2 })));
  }

  /* THE LINES TO SIGN. */
  out.push(label('Signed'));
  out.push(box(() => r.sign.length * 34 + 6, (f, y) => {
    r.sign.forEach((s, i) => {
      const yy = y + i * 34 + 22;
      font(f.doc, 8.5, 'bold', INK2); f.doc.text(s, f.x, yy);
      f.doc.setDrawColor('#9aa8bd'); f.doc.setLineWidth(0.6);
      f.doc.line(f.x + 110, yy + 2, f.x + f.w - 130, yy + 2);
      font(f.doc, 7.5, 'normal', MUTED); f.doc.text('Date', f.x + f.w - 120, yy);
      f.doc.line(f.x + f.w - 96, yy + 2, f.x + f.w, yy + 2);
    });
  }));
  return out;
}

/** Draw the handover report into `doc`. */
export async function drawHandoverReport(doc: jsPDF, r: HandoverReport): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => blocksOf(r, d));
  await pour({ ...base, density, dry: false }, blocksOf(r, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    const num = `${i} of ${pages}`;
    doc.text(fitLine(doc, `${r.name}  ·  handover report  ·  ${r.printed}`, CW - doc.getTextWidth(num) - 16), M, H - 18);
    doc.text(num, W - M, H - 18, { align: 'right' });
  }
}
