/* THE CLIENT REPORT, ON PAPER — A4, portrait, in the order the job is run.
 * See lib/clientReport.ts for what is on it and why. This only draws. */
import type { jsPDF } from 'jspdf';
import type { ClientReport, CellTone, FixRow } from './clientReport';
import type { GateTone } from './install';
import type { Shot } from './testReport';
import { san } from './reportKit';
import { gantt } from './gantt';
import { drawGantt } from './ganttPdf';
import { moveLines } from './story';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#0f1a2e', INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef';
/* The app's own state colours, so paper and screen say the same thing in the
   same colour: one red (the day has gone), one amber (waiting), one indigo
   (under way, still ahead), one green (done — and quiet). */
const BRAND = '#1f63e0', SHELL = '#0d1f3c', OK = '#1e6b4b', DANGER = '#9b3227', AMBER = '#8a5f14', BOOKED = '#4f46b8';
const DONE_WASH = '#e3efe9';

const GATE_COLOUR: Record<GateTone, { fill?: string; stroke: string; text: string; word: string }> = {
  done: { fill: DONE_WASH, stroke: OK, text: OK, word: 'done' },
  going: { fill: '#eeedfa', stroke: BOOKED, text: BOOKED, word: 'under way' },
  late: { fill: '#fdf2f0', stroke: DANGER, text: DANGER, word: 'late or a problem' },
  ahead: { stroke: '#b8c4d6', text: INK2, word: 'still ahead' },
  none: { stroke: '#d5dde8', text: MUTED, word: 'nothing kept' },
};
const CELL_COLOUR: Record<CellTone, { fill?: string; stroke: string }> = {
  done: { fill: DONE_WASH, stroke: OK },
  problem: { fill: DANGER, stroke: DANGER },
  late: { fill: '#fdf2f0', stroke: DANGER },
  asking: { fill: '#fff7e6', stroke: AMBER },
  ahead: { stroke: '#b8c4d6' },
  none: { stroke: '#e3e9f1' },
};
const FIX_COLOUR: Record<string, string> = { late: DANGER, notRun: DANGER, soon: AMBER, ahead: BOOKED, done: OK };

export interface ClientReportExtras {
  /** A picture per fix id: its frame on the line with the dot, or its photo. */
  shots: Map<string, Shot>;
  /** Draws the line standard pages; called once, on a fresh landscape page. */
  standards?: (doc: jsPDF) => Promise<void>;
}

/** Every string in the report through the one door the other PDFs use. The
 *  built-in font has no arrows: "Changeover 2kg → 1.25kg" printed as
 *  "Changeover 2kg !' 1.25kg" on the client's copy. */
function sanAll<T>(v: T): T {
  if (typeof v === 'string') return san(v) as T;
  if (Array.isArray(v)) return v.map(sanAll) as T;
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, sanAll(x)])) as T;
  return v;
}

export async function drawClientReport(doc: jsPDF, report: ClientReport, extras: ClientReportExtras): Promise<void> {
  const r = sanAll(report);
  let y = M;
  const font = (size: number, style: 'normal' | 'bold' | 'italic' = 'normal', colour = INK) => {
    doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(colour);
  };
  const newPage = () => { doc.addPage('a4', 'portrait'); y = M; };
  const room = (h: number) => { if (y + h > H - M - 20) newPage(); };
  const lines = (text: string, width: number): string[] => doc.splitTextToSize(text, width) as string[];
  /** `need` is the room the heading's first block wants with it, so a short
   *  table is never split to leave one row alone on the next page. */
  const heading = (title: string, says?: string, need = 60) => {
    room(need);
    y += 8;
    font(15, 'bold'); doc.text(title, M, y + 12);
    if (says) { font(9.5, 'normal', MUTED); doc.text(says, M, y + 26); }
    y += says ? 34 : 22;
    doc.setDrawColor(LINE); doc.setLineWidth(0.8); doc.line(M, y, W - M, y);
    y += 10;
  };
  const pill = (x: number, py: number, w: number, h: number, tone: GateTone, label: string) => {
    const c = GATE_COLOUR[tone];
    doc.setLineWidth(tone === 'none' ? 0.6 : 0.9);
    if (tone === 'none') doc.setLineDashPattern([2, 1.5], 0); else doc.setLineDashPattern([], 0);
    doc.setDrawColor(c.stroke);
    if (c.fill) { doc.setFillColor(c.fill); doc.roundedRect(x, py, w, h, 3, 3, 'FD'); } else doc.roundedRect(x, py, w, h, 3, 3, 'S');
    doc.setLineDashPattern([], 0);
    font(7, 'bold', c.text);
    doc.text(label, x + w / 2, py + h / 2 + 2.4, { align: 'center', maxWidth: w - 4 });
  };

  /* ================================ 1 · WHERE THE JOB IS ================================ */
  font(8.5, 'bold', BRAND); doc.text('CLIENT REPORT · STAGE GATE', M, y + 6);
  font(22, 'bold'); const nameLines = lines(r.name, CW); doc.text(nameLines, M, y + 30); y += 30 + (nameLines.length - 1) * 24;
  font(9.5, 'normal', MUTED);
  doc.text([r.lead ? `Led by ${r.lead}` : '', `Printed ${r.printed}`, r.dates ?? ''].filter(Boolean).join('   ·   '), M, y + 16);
  y += 28;

  // the sentence, on the dark band
  font(14, 'bold', '#ffffff');
  const said = lines(r.sentence, CW - 32);
  const bandH = 30 + said.length * 17 + (r.slip ? 14 : 0);
  doc.setFillColor(SHELL); doc.roundedRect(M, y, CW, bandH, 8, 8, 'F');
  font(7.5, 'bold', '#8fa3c4'); doc.text('WHERE THE JOB IS', M + 16, y + 16);
  font(14, 'bold', '#ffffff'); doc.text(said, M + 16, y + 34);
  if (r.slip) { font(9, 'normal', '#c9d4e6'); doc.text(r.slip, M + 16, y + 34 + said.length * 17); }
  y += bandH + 18;

  // the four gates, for the whole job
  font(8.5, 'bold', MUTED); doc.text('THE FOUR GATES', M, y); y += 8;
  const gw = (CW - 3 * 8) / 4;
  let maxH = 0;
  r.gates.forEach((g, i) => {
    const x = M + i * (gw + 8);
    const c = GATE_COLOUR[g.tone];
    font(8, 'normal', INK2);
    const says = lines(g.says || c.word, gw - 14);
    const h = 30 + says.length * 10;
    maxH = Math.max(maxH, h);
    doc.setDrawColor(c.stroke); doc.setLineWidth(1);
    if (c.fill && g.tone !== 'done') { doc.setFillColor(c.fill); doc.roundedRect(x, y, gw, h, 5, 5, 'FD'); }
    else if (g.tone === 'done') { doc.setFillColor('#e9f5ef'); doc.roundedRect(x, y, gw, h, 5, 5, 'FD'); }
    else doc.roundedRect(x, y, gw, h, 5, 5, 'S');
    font(11, 'bold', g.tone === 'done' ? OK : c.text === MUTED ? INK2 : c.text); doc.text(g.label, x + 7, y + 15);
    font(8, 'normal', INK2); doc.text(says, x + 7, y + 27);
  });
  y += maxH + 20;

  // where each machine is
  if (r.machines.length) {
    room(40 + r.machines.length * 20);
    font(8.5, 'bold', MUTED); doc.text('WHERE EACH MACHINE IS', M, y); y += 8;
    const nameW = 140, atW = 80, cellW = (CW - nameW - atW - 4 * 4) / 4;
    font(7, 'bold', MUTED);
    ['Install', 'Set up', 'Commission', 'Hand over'].forEach((g, i) => doc.text(g, M + nameW + i * (cellW + 4) + cellW / 2, y + 6, { align: 'center' }));
    doc.text('AT', M + CW - atW + 4, y + 6);
    y += 12;
    for (const m of r.machines) {
      room(22);
      doc.setDrawColor(LINE); doc.setLineWidth(0.5); doc.line(M, y, W - M, y);
      font(9.5, 'bold'); doc.text(m.name, M, y + 13, { maxWidth: nameW - 6 });
      m.gates.forEach((t, i) => pill(M + nameW + i * (cellW + 4), y + 4, cellW, 13, t, GATE_COLOUR[t].word));
      font(9, 'bold', INK2); doc.text(m.at, M + CW - atW + 4, y + 13);
      y += 20;
    }
    y += 8;
  }

  /* ================================ 2 · GATE BY GATE ================================ */
  for (const s of r.sections) {
    heading(s.label, s.says);
    if (s.grid) {
      const nameW = 120, n = s.grid.columns.length, colW = Math.max(28, (CW - nameW) / Math.max(1, n));
      const shown = s.grid.columns.slice(0, Math.floor((CW - nameW) / colW));
      font(6.5, 'bold', MUTED);
      const heads = shown.map(c => lines(c, colW - 4).slice(0, 3));
      const headH = 8 + Math.max(...heads.map(h => h.length), 1) * 7.5;
      room(headH + 20 * Math.min(4, s.grid.rows.length));
      heads.forEach((h, i) => doc.text(h, M + nameW + i * colW + colW / 2, y + 7, { align: 'center' }));
      y += headH;
      for (const row of s.grid.rows) {
        room(18);
        doc.setDrawColor(LINE); doc.setLineWidth(0.5); doc.line(M, y, W - M, y);
        font(8.5, 'bold'); doc.text(row.machine, M, y + 12, { maxWidth: nameW - 6 });
        row.cells.slice(0, shown.length).forEach((c, i) => {
          const cc = CELL_COLOUR[c], x = M + nameW + i * colW + colW / 2 - 7;
          /* Late is drawn heavier than done — the abnormal stands out. */
          doc.setDrawColor(cc.stroke); doc.setLineWidth(c === 'late' ? 1.8 : 0.9);
          if (c === 'none') doc.setLineDashPattern([1.5, 1.5], 0);
          if (cc.fill) { doc.setFillColor(cc.fill); doc.roundedRect(x, y + 4, 14, 10, 2, 2, 'FD'); } else doc.roundedRect(x, y + 4, 14, 10, 2, 2, 'S');
          doc.setLineDashPattern([], 0);
        });
        y += 18;
      }
      // the key, once per grid, small
      font(7, 'normal', MUTED);
      let kx = M;
      for (const [t, w] of [['problem', 'a problem'], ['late', 'late'], ['asking', 'waiting on a verdict'], ['ahead', 'still to do'], ['done', 'done'], ['none', 'not on this machine']] as [CellTone, string][]) {
        const cc = CELL_COLOUR[t];
        doc.setDrawColor(cc.stroke); doc.setLineWidth(0.8);
        if (t === 'none') doc.setLineDashPattern([1.5, 1.5], 0);
        if (cc.fill) { doc.setFillColor(cc.fill); doc.roundedRect(kx, y + 5, 9, 7, 1.5, 1.5, 'FD'); } else doc.roundedRect(kx, y + 5, 9, 7, 1.5, 1.5, 'S');
        doc.setLineDashPattern([], 0);
        doc.text(w, kx + 12, y + 11); kx += 18 + doc.getTextWidth(w);
      }
      y += 20;
    }

    if (s.late.length && s.gate !== 'commission') {
      room(14 + s.late.length * 12);
      font(8.5, 'bold', DANGER); doc.text('Late or a problem', M, y + 8); y += 14;
      font(9, 'normal', INK2);
      for (const l of s.late.slice(0, 12)) { room(12); doc.text(`•  ${l}`, M + 4, y + 8, { maxWidth: CW - 8 }); y += 12; }
      y += 6;
    }

    if (s.programs) {
      room(30);
      font(10, 'bold'); doc.text(`Programs — ${s.programs.proved} of ${s.programs.total} proved`, M, y + 10); y += 18;
      font(9, 'normal', INK2);
      for (const p of s.programs.notYet.slice(0, 20)) {
        room(12); doc.text(`•  ${p.what}${p.machine ? ` — ${p.machine}` : ''}: ${p.state}`, M + 4, y + 8, { maxWidth: CW - 8 }); y += 12;
      }
      y += 8;
    }

    if (s.tests) {
      if (s.tests.length === 0) { font(9.5, 'normal', MUTED); doc.text('No tests planned yet.', M, y + 8); y += 18; }
      for (const t of s.tests) {
        font(9.5, 'bold');
        const title = lines(t.title, CW - 150);
        font(8.5, 'normal', MUTED);
        const res = t.result ? lines(`Result: ${t.result}`, CW - 150) : [];
        const agreed = t.passesIf ? lines(`Passes if: ${t.passesIf}`, CW - 150) : [];
        const h = 10 + title.length * 12 + (res.length + agreed.length) * 10.5 + 6;
        room(h);
        doc.setDrawColor(LINE); doc.setLineWidth(0.5); doc.line(M, y, W - M, y);
        font(9.5, 'bold'); doc.text(title, M, y + 13);
        let ty = y + 13 + title.length * 12;
        font(8.5, 'normal', MUTED);
        if (agreed.length) { doc.text(agreed, M, ty); ty += agreed.length * 10.5; }
        if (res.length) { font(8.5, 'normal', INK2); doc.text(res, M, ty); }
        font(8, 'normal', MUTED); doc.text([t.machine, t.when].filter(Boolean).join(' · '), W - M - 140, y + 13, { maxWidth: 80 });
        const tc = t.tone === 'done' ? 'done' : t.tone === 'failed' || t.tone === 'late' ? 'late' : 'ahead';
        pill(W - M - 56, y + 5, 56, 12, tc, t.outcome);
        y += h;
      }
      y += 6;
    }
  }

  /* ================================ THE PLAN ================================ */
  /* The Gantt the project page draws, on a landscape page of its own: the
     calendar across the top, a bar per thing on the days it means. Rowland:
     "print the Gantt charts as well, and PDF." AFTER the gates, not before
     them: straight after the front page it left most of page 1 empty on a job
     with few machines, and pushed the gate detail to page 3. */
  let planPages: number[] = [];
  if (r.plan.length) {
    doc.addPage('a4', 'landscape');
    const g = gantt(r.plan, { today: r.today, expectedAt: r.expectedAt, plannedAt: r.plannedAt }, r.planRecords);
    planPages = drawGantt(doc, g, {
      eyebrow: 'CLIENT REPORT · THE PLAN', title: 'The plan',
      sub: [r.dates, `${r.plan.length} dated · printed ${r.printed}`].filter(Boolean).join('   ·   '),
    }, moveLines(g.groups.flatMap(x => x.rows), r.planRecords.tests, r.planRecords.items));
    newPage();
  }

  /* ================================ 3 · FIXES ================================ */
  heading('Fixes', `${r.fixes.open.length} open · ${r.fixes.done.length} done`);
  if (r.fixes.open.length === 0) { font(9.5, 'normal', MUTED); doc.text('Nothing open.', M, y + 8); y += 18; }
  for (const f of r.fixes.open) drawFix(f);
  if (r.fixes.done.length) {
    room(30);
    font(8.5, 'bold', OK); doc.text('Done', M, y + 10); y += 16;
    font(9, 'normal', INK2);
    for (const f of r.fixes.done) { room(12); doc.text(`•  ${f.title}${f.machine ? ` — ${f.machine}` : ''}  (${f.when})`, M + 4, y + 8, { maxWidth: CW - 8 }); y += 12; }
    y += 6;
  }

  function drawFix(f: FixRow) {
    const shot = extras.shots.get(f.id);
    const textW = shot ? CW - 130 : CW - 12;
    font(10, 'bold'); const title = lines(f.title, textW);
    font(8.5, 'normal', INK2); const prob = f.problem ? lines(f.problem, textW) : [];
    const h = Math.max(shot ? 76 : 0, 14 + title.length * 12 + prob.length * 10.5 + 14);
    room(h + 6);
    doc.setFillColor(FIX_COLOUR[f.tone] ?? BRAND); doc.rect(M, y, 3, h, 'F');
    font(10, 'bold'); doc.text(title, M + 10, y + 13);
    let fy = y + 13 + title.length * 12;
    if (prob.length) { font(8.5, 'normal', INK2); doc.text(prob, M + 10, fy); fy += prob.length * 10.5; }
    font(8, 'bold', FIX_COLOUR[f.tone] ?? BRAND); doc.text(f.when, M + 10, fy + 2);
    const ww = doc.getTextWidth(f.when);
    font(8, 'normal', MUTED); doc.text([f.machine, f.who].filter(Boolean).join(' · '), M + 20 + ww, fy + 2, { maxWidth: Math.max(40, textW - ww - 20) });
    if (shot) {
      const k = Math.min(116 / shot.w, 70 / shot.h);
      const iw = shot.w * k, ih = shot.h * k;
      try { doc.addImage(shot.data, 'JPEG', W - M - iw, y + 2, iw, ih); doc.setDrawColor(LINE); doc.rect(W - M - iw, y + 2, iw, ih); } catch { /* the words carry it */ }
    }
    y += h + 8;
    doc.setDrawColor(LINE); doc.setLineWidth(0.4); doc.line(M, y - 4, W - M, y - 4);
  }

  /* ================================ 4 · WHO OWES WHAT ================================ */
  if (r.waiting.length) {
    // A short table travels whole; a long one starts with at least three rows.
    heading('What we’re waiting on', 'and whose it is', 46 + 12 + Math.min(r.waiting.length, 12) * 18);
    font(7.5, 'bold', MUTED);
    doc.text('OPEN', M + CW - 190, y + 6, { align: 'right' }); doc.text('LATE', M + CW - 150, y + 6, { align: 'right' }); doc.text('MOSTLY WHOSE', M + CW - 130, y + 6);
    y += 12;
    for (const w of r.waiting) {
      room(18);
      doc.setDrawColor(LINE); doc.setLineWidth(0.5); doc.line(M, y, W - M, y);
      font(9.5, 'bold'); doc.text(w.what, M, y + 12);
      font(10, 'bold'); doc.text(String(w.open), M + CW - 190, y + 12, { align: 'right' });
      font(10, 'bold', w.late ? DANGER : '#aab6c8'); doc.text(w.late ? String(w.late) : '—', M + CW - 150, y + 12, { align: 'right' });
      font(9, 'normal', INK2); doc.text(w.whose ?? '—', M + CW - 130, y + 12, { maxWidth: 130 });
      y += 18;
    }
  }

  /* ================================ 5 · LINE STANDARD ================================ */
  if (extras.standards && r.standards.length) {
    doc.addPage('a4', 'landscape');
    await extras.standards(doc);
  }

  /* ---- the foot of every page ---- */
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth(), ph = doc.internal.pageSize.getHeight();
    if (pw > ph && !planPages.includes(i)) continue;   // a line standard page carries its own foot
    font(7.5, 'normal', MUTED);
    doc.text(`${r.name}  ·  client report  ·  ${r.printed}`, M, ph - 18);
    doc.text(`${i} of ${pages}`, pw - M, ph - 18, { align: 'right' });
  }
}
