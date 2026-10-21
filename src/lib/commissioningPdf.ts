/* THE COMMISSIONING REPORT AND CARDS ON PAPER (lib/commissioningReport).
 *
 * The report, laid out by the engine (src/lib/report/, docs/REPORTS.md), in
 * the order the meeting reads it: where we are — the verdict, the gate's
 * count and the handover dates, then every machine in a row with its word;
 * why we are not where we should be; what we are doing about it, and the
 * tests booked next; the runs; then each machine whole — its tests against
 * what each had to show and what was seen, its programs, what is still open.
 *
 * The cards, a page a machine, to put up in the meeting or hand round: the
 * machine, its word in its colour, three tiles (its tests, its programs, what
 * is open), its tests, what is still open and its next test. One colour, one
 * meaning, as on every screen: red the day gone or a failure, amber waiting,
 * indigo booked, green done, grey not started — and the words beside every
 * colour, so it survives a black-and-white copy. */
import { paperBand } from './reportKit';
import { codeHeader } from './report/codeHeader';
import { leanClosing, leanTiles } from './report/lean';
import type { jsPDF } from 'jspdf';
import type { OnTargetTone } from './onTarget';
import type { HoTone } from './handoverReport';
import type { CmLine, CmMachine, CmTone, CommissioningReport } from './commissioningReport';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, heading, label, rows, text, wrap, type Row } from './report/blocks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK = '#0f1417', INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6';
const BRAND = '#0c7489', OK = '#15803d', DANGER = '#c4281c', AMBER = '#b45309', BOOKED = '#6d28d9', GREY = '#8a9599';

const HO: Record<HoTone, string> = { done: OK, failed: DANGER, late: DANGER, ahead: BOOKED, none: MUTED };
const CM: Record<CmTone, string> = { g: OK, r: DANGER, a: AMBER, w: BOOKED, n: GREY };
const CM_SOFT: Record<CmTone, string> = { g: '#e6f2ec', r: '#f8e6e3', a: '#f7efdf', w: '#eeedfa', n: '#eef1f5' };
const VERDICT: Record<OnTargetTone, string> = { behind: '#c4281c', risk: '#b45309', on: '#15803d', none: '#59666c' }; /* the verdict's word on the light band (reportKit paperBand) */

function fitLine(doc: jsPDF, t: string, w: number): string {
  font(doc, 7.5, 'normal', MUTED);
  if (doc.getTextWidth(t) <= w) return t;
  let s = t;
  while (s.length > 4 && doc.getTextWidth(`${s}…`) > w) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

/** A line of a list: the thing on the left, its state on the right in its
 *  colour (the handover report's line). */
function line(left: string, right: string, colour: string, o: { bold?: boolean; under?: string } = {}): Block {
  const rightW = 150;
  const parts = (f: Frame) => ({
    l: wrap(f.doc, left, f.w - rightW - 8, 9.5, o.bold === false ? 'normal' : 'bold'),
    u: o.under ? wrap(f.doc, o.under, f.w - rightW - 8, 8.5) : [],
    r: wrap(f.doc, right, rightW, 8.5, 'bold'),
  });
  return rows({
    rows: [{
      h: (f: Frame) => { const p = parts(f); return 5 + Math.max(p.l.length * 12 + p.u.length * 10.5, p.r.length * 10.5) + 3; },
      draw: (f: Frame, y: number) => {
        const p = parts(f);
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, y, f.x + f.w, y);
        font(f.doc, 9.5, o.bold === false ? 'normal' : 'bold', INK2); f.doc.text(p.l, f.x, y + 13);
        if (p.u.length) { font(f.doc, 8.5, 'normal', MUTED); f.doc.text(p.u, f.x, y + 13 + p.l.length * 12); }
        font(f.doc, 8.5, 'bold', colour); f.doc.text(p.r, f.x + f.w, y + 13, { align: 'right' });
      },
    }],
    after: 's',
  });
}

/** A line of WHY or DOING: a coloured mark, the words, the meta under. */
function said(l: CmLine): Block {
  const parts = (f: Frame) => ({ t: wrap(f.doc, l.text, f.w - 14, 9.5, 'bold'), m: l.meta ? wrap(f.doc, l.meta, f.w - 14, 8.5) : [] });
  return {
    height: f => { const p = parts(f); return p.t.length * 12 + p.m.length * 10.5 + 6; },
    draw: (f, y) => {
      const p = parts(f), hh = p.t.length * 12 + p.m.length * 10.5;
      f.doc.setFillColor(CM[l.tone]); f.doc.roundedRect(f.x, y + 2, 3.5, Math.max(9, hh - 2), 1.5, 1.5, 'F');
      font(f.doc, 9.5, 'bold', INK2); f.doc.text(p.t, f.x + 10, y + 10);
      if (p.m.length) { font(f.doc, 8.5, 'normal', MUTED); f.doc.text(p.m, f.x + 10, y + 10 + p.t.length * 12); }
    },
  };
}

/** The dark band: the verdict and why, the gate's count and the dates. */
function band(r: CommissioningReport): Block {
  const parts = (f: Frame) => ({
    head: wrap(f.doc, `${r.verdict.word} — ${r.verdict.reason}`, f.w - 28, 11, 'bold'),
    sub: wrap(f.doc, `Commission: ${r.says} · ${r.dates}`, f.w - 28, 9),
  });
  return box(f => { const b = parts(f); return 24 + b.head.length * 14 + b.sub.length * 11.5 + 4; }, (f, y) => {
    const b = parts(f), hh = 24 + b.head.length * 14 + b.sub.length * 11.5;
    paperBand(f.doc, f.x, y, f.w, hh, 6);
    font(f.doc, 11, 'bold', VERDICT[r.verdict.tone]); f.doc.text(b.head, f.x + 14, y + 18);
    font(f.doc, 9, 'normal', '#323d43'); f.doc.text(b.sub, f.x + 14, y + 18 + b.head.length * 14);
  }, f => gap(f.density, 'm'));
}

/** Every machine in a row: its name, where it is, its tests in a line, its
 *  word in its colour. */
function machineTable(r: CommissioningReport): Block {
  const cols = (f: Frame) => { const w = f.w; return { name: w * 0.27, tests: w * 0.37, word: w * 0.36 }; };
  const parts = (f: Frame, m: CmMachine) => {
    const c = cols(f);
    return {
      n: wrap(f.doc, m.name, c.name - 8, 9.5, 'bold'), at: wrap(f.doc, m.at, c.name - 8, 8),
      t: wrap(f.doc, m.testsSaid, c.tests - 8, 8.5), p: m.programs ? wrap(f.doc, `Programs: ${m.programs}`, c.tests - 8, 8) : [],
      w: wrap(f.doc, m.verdict.word, c.word - 18, 8.5, 'bold'), nx: m.next ? wrap(f.doc, `Next: ${m.next}`, c.word - 18, 8) : [],
    };
  };
  const hRow = (f: Frame, m: CmMachine) => { const p = parts(f, m); return 6 + Math.max(p.n.length * 12 + p.at.length * 10, p.t.length * 11 + p.p.length * 10, p.w.length * 11 + p.nx.length * 10) + 5; };
  const header: Row = {
    h: () => 16,
    draw: (f, y) => {
      const c = cols(f);
      font(f.doc, SIZE.tiny, 'bold', MUTED);
      f.doc.text('MACHINE', f.x, y + 10); f.doc.text('TESTS · PROGRAMS', f.x + c.name, y + 10); f.doc.text('WHERE IT STANDS', f.x + c.name + c.tests, y + 10);
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.6); f.doc.line(f.x, y + 15, f.x + f.w, y + 15);
    },
  };
  const body: Row[] = r.machines.map(m => ({
    h: f => hRow(f, m),
    draw: (f, y) => {
      const c = cols(f), p = parts(f, m), hh = hRow(f, m);
      font(f.doc, 9.5, 'bold', INK); f.doc.text(p.n, f.x, y + 13);
      font(f.doc, 8, 'normal', MUTED); f.doc.text(p.at, f.x, y + 13 + p.n.length * 12);
      font(f.doc, 8.5, 'normal', m.counts.failed || m.counts.late ? DANGER : INK2); f.doc.text(p.t, f.x + c.name, y + 13);
      font(f.doc, 8, 'normal', m.programsWrong ? DANGER : MUTED); f.doc.text(p.p, f.x + c.name, y + 13 + p.t.length * 11);
      const wx = f.x + c.name + c.tests;
      f.doc.setFillColor(CM_SOFT[m.verdict.tone]); f.doc.roundedRect(wx, y + 4, c.word, p.w.length * 11 + 8, 4, 4, 'F');
      f.doc.setFillColor(CM[m.verdict.tone]); f.doc.circle(wx + 8, y + 12, 2.6, 'F');
      font(f.doc, 8.5, 'bold', CM[m.verdict.tone]); f.doc.text(p.w, wx + 15, y + 14);
      if (p.nx.length) { font(f.doc, 8, 'normal', INK2); f.doc.text(p.nx, wx + 15, y + 14 + p.w.length * 11 + 6); }
      f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.4); f.doc.line(f.x, y + hh - 0.5, f.x + f.w, y + hh - 0.5);
    },
  }));
  return rows({ header, rows: body, after: 'm' });
}

/** A machine whole: its tests against what each had to show, its programs,
 *  what is still open on it. */
/** EACH PROGRAM'S JOURNEY — every test of it, first to last, the speed and
 *  the time it ran and how it went (lib/programJourney). */
function journeyBlocks(m: Pick<CmMachine, 'journeys'>, title = 'Programs — the journey of each'): Block[] {
  if (!m.journeys.length) return [];
  const out: Block[] = [label(title)];
  for (const j of m.journeys) {
    out.push(line(j.what, j.says, INK2));
    if (j.best) out.push(text({ text: j.best, size: 8.5, style: 'bold', colour: OK, indent: 10 }));
    for (const st of j.steps) out.push(text({ text: st.text, size: 8.5, colour: st.tone === 'r' ? DANGER : st.tone === 'w' ? BOOKED : INK2, indent: 10, bullet: '•', after: 1 }));
  }
  out.push({ height: f => gap(f.density, 's'), draw: () => undefined });
  return out;
}

function machineBlocks(m: CmMachine, d: Density): Block[] {
  const out: Block[] = [];
  out.push(heading(m.name, `${m.at} · ${m.verdict.word}`, { size: SIZE.h2 + 1.5 }));
  out.push(text({ text: `Tests: ${m.testsSaid}${m.programs ? `   ·   Programs: ${m.programs}` : ''}`, size: 9, style: 'bold', colour: m.counts.failed || m.counts.late || m.programsWrong ? DANGER : INK2, after: gap(d, 's') }));
  if (m.next) out.push(text({ text: `Next: ${m.next}`, size: 9, colour: BOOKED, after: gap(d, 's') }));
  out.push(label('Tests — against what was agreed'));
  if (!m.tests.length) out.push(text({ text: 'No tests planned on this machine yet.', size: 9, colour: MUTED, after: gap(d, 'm') }));
  for (const t of m.tests) {
    out.push(line(t.title, [t.word, t.when].filter(Boolean).join(' · '), HO[t.tone]));
    if (t.passesIf) out.push(text({ text: `Had to show: ${t.passesIf}`, size: 8.5, colour: INK2, indent: 10 }));
    if (t.said) out.push(text({ text: `Seen: ${t.said}`, size: 8.5, colour: t.tone === 'failed' || t.tone === 'late' ? DANGER : MUTED, indent: 10 }));
    if (t.proved) out.push(text({ text: t.proved, size: 8.5, style: 'bold', colour: INK2, indent: 10 }));
  }
  if (m.tests.length) out.push({ height: f => gap(f.density, 's'), draw: () => undefined });
  out.push(...journeyBlocks(m));
  out.push(label('Still open on it', m.open.length ? AMBER : MUTED));
  if (!m.open.length) out.push(text({ text: 'Nothing still open.', size: 9, colour: INK2, after: gap(d, 'l') }));
  else m.open.forEach((o, i) => out.push(text({ text: o, size: 9, colour: INK2, indent: 10, bullet: '•', after: i === m.open.length - 1 ? gap(d, 'l') : 2 })));
  return out;
}

function reportBlocks(r: CommissioningReport, d: Density): Block[] {
  const out: Block[] = [];
  out.push(...codeHeader({ eyebrow: 'COMMISSIONING · STAGE GATE', title: r.name, colour: BRAND, ...(r.link ? { link: r.link } : {}),
    line: [r.lead ? `Led by ${r.lead}` : '', `Printed ${r.printed}`].filter(Boolean).join('   ·   ') }, d));
  /* THE TILES (docs/LEAN-PAGE.md) — the counts Commission's tiles say, and the money */
  out.push(leanTiles(r.tiles));

  /* WHERE WE ARE */
  out.push(band(r));
  if (r.commentary) out.push(text({ text: `“${r.commentary.text}”${r.commentary.by ? ` — ${r.commentary.by}` : ''}`, size: 9.5, colour: INK2, after: gap(d, 'm') }));
  out.push(label(`Machine by machine — ${r.machinesSaid}`));
  if (r.machines.length) out.push(machineTable(r));
  else out.push(text({ text: 'No machines on the project yet.', colour: MUTED, after: gap(d, 'm') }));

  /* WHY WE ARE NOT WHERE WE SHOULD BE */
  out.push(label('Why we are not where we should be', r.why.length ? DANGER : MUTED));
  if (!r.why.length) out.push(text({ text: 'Nothing — no test has failed or gone late, and no critical problem is open.', size: 9, colour: INK2, after: gap(d, 'm') }));
  r.why.forEach((l, i) => { const b = said(l); out.push(i === r.why.length - 1 ? { ...b, after: f => gap(f.density, 'm'), height: f => b.height(f) + gap(f.density, 'm') } : b); });

  /* WHAT WE ARE DOING ABOUT IT */
  out.push(label('What we are doing about it'));
  if (!r.doing.length) out.push(text({ text: 'No fix open and no problem taken for the project.', size: 9, colour: INK2, after: gap(d, 's') }));
  r.doing.forEach(l => out.push(said(l)));
  if (r.booked.length) {
    out.push(label(`Booked next — ${r.booked.length} test${r.booked.length === 1 ? '' : 's'}`, BOOKED));
    r.booked.forEach(l => out.push(said(l)));
  }
  out.push({ height: f => gap(f.density, 'm'), draw: () => undefined });

  /* THE RUNS — a row a product, as the client report has them */
  if (r.runs.length) {
    out.push(label('Performance runs — a row a product'));
    for (const run of r.runs) {
      out.push(line(`${run.machine ? `${run.machine} — ` : ''}${run.product}`, `${run.outcome} · ${run.when}`,
        run.tone === 'done' ? OK : run.tone === 'failed' || run.tone === 'late' ? DANGER : BOOKED,
        { under: `Net ${run.net} against ${run.agreed} · speed ${run.speed} · rejects ${run.rejects}${run.say ? ` — ${run.say}` : ''}` }));
    }
    out.push({ height: f => gap(f.density, 'm'), draw: () => undefined });
  }

  /* THE CLOSING LINE — the gate in one sentence and the slip in money, at
     the foot of the report's body; each machine whole is its appendix */
  out.push(leanClosing(r.closing));

  /* EACH MACHINE WHOLE */
  for (const m of r.machines) out.push(...machineBlocks(m, d));
  /* PROGRAMS ON THE LINE ITSELF — their journeys, as a machine's are */
  if (r.lineJourneys.length) out.push(...journeyBlocks({ journeys: r.lineJourneys }, 'Programs on the line itself — the journey of each'));

  /* OPEN ON NO ONE MACHINE, AND THE LINES' OWN PROGRAMS */
  if (r.line.length) {
    out.push(label('Still open on the line', AMBER));
    r.line.forEach((o, i) => out.push(text({ text: o, size: 9, colour: INK2, indent: 10, bullet: '•', after: i === r.line.length - 1 ? gap(d, 'l') : 2 })));
  }
  for (const lp of r.linePrograms) {
    out.push(label(`On ${lp.line}, with no project — programs`, lp.open.length ? AMBER : MUTED));
    out.push(text({ text: lp.says, size: 9, style: 'bold', colour: INK2, after: lp.open.length ? 3 : gap(d, 'l') }));
    lp.open.forEach((o, i) => out.push(text({ text: o, size: 9, colour: INK2, indent: 10, bullet: '•', after: i === lp.open.length - 1 ? gap(d, 'l') : 2 })));
  }
  return out;
}

/* ------------------------------- the cards ------------------------------ */

/** Three tiles: its tests, its programs, what is still open. */
function tiles(m: CmMachine): Block {
  const t: { k: string; v: string; s: string; c: string }[] = [
    { k: 'Tests', v: m.counts.tests ? `${m.counts.passed} of ${m.counts.tests}` : '—', s: m.counts.tests ? 'passed' : 'none planned', c: m.counts.failed || m.counts.late ? DANGER : m.counts.tests && m.counts.passed === m.counts.tests ? OK : INK },
    { k: 'Programs', v: m.programs ? m.programs.split(' · ')[0] : '—', s: m.programs ? m.programs.split(' · ').slice(1).join(' · ') || 'none proved yet' : 'none on it', c: m.programsWrong ? DANGER : INK },
    { k: 'Still open', v: String(m.open.length), s: m.open.length ? 'to close before hand-over' : 'nothing', c: m.open.length ? AMBER : OK },
  ];
  const sub = (f: Frame, s: string) => wrap(f.doc, s, (f.w - 16) / 3 - 16, 8.5);
  return box(f => 50 + Math.max(...t.map(x => sub(f, x.s).length)) * 10.5 + 4, (f, y) => {
    const cw = (f.w - 16) / 3, hh = 50 + Math.max(...t.map(x => sub(f, x.s).length)) * 10.5;
    t.forEach((x, i) => {
      const xx = f.x + i * (cw + 8);
      f.doc.setDrawColor(LINE); f.doc.setFillColor('#f6f8fb'); f.doc.setLineWidth(0.6); f.doc.roundedRect(xx, y, cw, hh, 6, 6, 'FD');
      font(f.doc, 7.5, 'bold', MUTED); f.doc.text(x.k.toUpperCase(), xx + 10, y + 14);
      font(f.doc, 18, 'bold', x.c); f.doc.text(x.v, xx + 10, y + 36);
      font(f.doc, 8.5, 'normal', INK2); f.doc.text(sub(f, x.s), xx + 10, y + 50);
    });
  }, f => gap(f.density, 'l'));
}

function cardBlocks(r: CommissioningReport, m: CmMachine, d: Density, i: number): Block[] {
  const out: Block[] = [];
  out.push(text({ text: `COMMISSIONING CARD · ${r.name.toUpperCase()} · ${i + 1} OF ${r.machines.length}`, size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: m.name, size: SIZE.title + 4, style: 'bold', colour: INK, after: 4 }));
  out.push(text({ text: `${m.at} · printed ${r.printed}`, size: 9, colour: MUTED, after: gap(d, 'm') }));
  /* ITS WORD, in its colour, with the words */
  const word = (f: Frame) => wrap(f.doc, m.verdict.word, f.w - 40, 14, 'bold');
  out.push(box(f => 22 + word(f).length * 17 + 4, (f, y) => {
    const hh = 22 + word(f).length * 17;
    f.doc.setFillColor(CM_SOFT[m.verdict.tone]); f.doc.roundedRect(f.x, y, f.w, hh, 8, 8, 'F');
    f.doc.setFillColor(CM[m.verdict.tone]); f.doc.roundedRect(f.x, y, 6, hh, 3, 3, 'F');
    font(f.doc, 14, 'bold', CM[m.verdict.tone]); f.doc.text(word(f), f.x + 20, y + 21);
  }, f => gap(f.density, 'm')));
  out.push(tiles(m));
  if (m.next) out.push(text({ text: `Next: ${m.next}`, size: 10, style: 'bold', colour: BOOKED, after: gap(d, 'm') }));
  out.push(label('Its tests'));
  if (!m.tests.length) out.push(text({ text: 'No tests planned on this machine yet.', size: 9, colour: MUTED, after: gap(d, 'm') }));
  for (const t of m.tests) {
    out.push(line(t.title, [t.word, t.when].filter(Boolean).join(' · '), HO[t.tone], { ...(t.said && (t.tone === 'failed' || t.tone === 'late') ? { under: `Seen: ${t.said}` } : {}) }));
  }
  if (m.tests.length) out.push({ height: f => gap(f.density, 'm'), draw: () => undefined });
  out.push(...journeyBlocks(m));
  out.push(label('Still open on it', m.open.length ? AMBER : MUTED));
  if (!m.open.length) out.push(text({ text: 'Nothing still open.', size: 9, colour: INK2 }));
  else m.open.forEach(o => out.push(text({ text: o, size: 9.5, colour: INK2, indent: 10, bullet: '•', after: 3 })));
  return out;
}

const foot = (doc: jsPDF, what: string, r: CommissioningReport) => {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    const num = `${i} of ${pages}`;
    doc.text(fitLine(doc, `${r.name}  ·  ${what}  ·  ${r.printed}`, CW - doc.getTextWidth(num) - 16), M, H - 18);
    doc.text(num, W - M, H - 18, { align: 'right' });
  }
};

/** Draw the commissioning report into `doc`. */
export async function drawCommissioningReport(doc: jsPDF, r: CommissioningReport): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => reportBlocks(r, d));
  await pour({ ...base, density, dry: false }, reportBlocks(r, density), () => doc.addPage('a4', 'portrait'));
  foot(doc, 'commissioning report', r);
}

/** Draw the commissioning cards — a page a machine, each starting its own
 *  page; a machine with more than a page carries on. */
export async function drawCommissioningCards(doc: jsPDF, r: CommissioningReport): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  if (!r.machines.length) {
    /* Still the job's, said at its top: a card with nothing on it is still
       a card of this job (the fuzz caught it printing no name). */
    await pour({ ...base, density: 'comfortable', dry: false }, [
      text({ text: `COMMISSIONING CARDS · ${r.name.toUpperCase()}`, size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }),
      text({ text: `Printed ${r.printed}`, size: 9, colour: MUTED, after: gap('comfortable', 'm') }),
      text({ text: 'No machines on the project yet — the cards are a page a machine.', colour: MUTED }),
    ], () => doc.addPage('a4', 'portrait'));
  }
  for (const [i, m] of r.machines.entries()) {
    if (i > 0) doc.addPage('a4', 'portrait');
    const density = await chooseDensity(base, d => cardBlocks(r, m, d, i));
    await pour({ ...base, density, dry: false }, cardBlocks(r, m, density, i), () => doc.addPage('a4', 'portrait'));
  }
  foot(doc, 'commissioning cards', r);
}
