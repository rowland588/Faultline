/* ALL TOGETHER ON PAPER — the page as the screen has it (ui/Together; the
 * words from lib/together): where it stands (Line capacity, the line
 * balance, the line standard, what the bottleneck costs), the line station
 * by station with who works there, the line standard's card, and each
 * person's work against takt. A4 portrait, laid out by the report engine
 * (src/lib/report/, docs/REPORTS.md); the card is the line standard's own
 * picture (lib/standardCard), so it is exactly the card at the line. */
import type { jsPDF } from 'jspdf';
import { getWorkspace } from '../db';
import type { Standard } from './standard';
import type { ToolStudy } from './study';
import { togetherOf } from './together';
import { balanceCost, costInputs } from './ie/balanceLink';
import { chooseDensity, pour, type Block, type Density, type Frame } from './report/flow';
import { SIZE, box, font, gap, label, rows, text, wrap } from './report/blocks';
import { balanceBlocks } from './report/balanceTable';
import { todayISO } from './weeks';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#33415a', MUTED = '#5b6b82', LINE = '#dbe4ef', BRAND = '#1f63e0', DANGER = '#c4281c', NAVY = '#0f1a2e';

export interface TogetherPaper { s: Standard; study?: ToolStudy; name: string; printed: string; card?: string; line?: Awaited<ReturnType<typeof getWorkspace>> }

function blocksOf(p: TogetherPaper, d: Density): Block[] {
  const t = togetherOf(p.s, p.study, p.line);
  const unit = p.s.capacity?.stations[0]?.unit.trim() || undefined;
  const out: Block[] = [];
  out.push(text({ text: `ALL TOGETHER · ${p.name.toUpperCase()}`, size: SIZE.eyebrow, style: 'bold', colour: BRAND, after: 6 }));
  out.push(text({ text: p.s.product, size: SIZE.title, style: 'bold', after: 4 }));
  out.push(text({ text: `Line standard, line balance and Line capacity, each as its own tool says it · printed ${p.printed}`, colour: MUTED, after: gap(d, 'm') }));
  /* where it stands */
  out.push(label('Where it stands'));
  const strip: [string, string, boolean][] = [
    ['Line capacity', t.capacity.text, t.capacity.short],
    ...(t.money ? [['What it costs', t.money.text, t.money.short] as [string, string, boolean]] : []),
    ['Line balance', t.balance.red[0] ?? t.balance.text, t.balance.red.length > 0],
    ['Line standard', t.people, false],
  ];
  out.push(rows({ rows: strip.map(([k, v, red]) => ({
    h: (fr: Frame) => Math.max(14, wrap(fr.doc, v, fr.w - 96, 9).length * 11 + 4),
    draw: (fr: Frame, y: number) => {
      font(fr.doc, 7.5, 'bold', MUTED); fr.doc.text(k.toUpperCase(), fr.x, y + 9);
      wrap(fr.doc, v, fr.w - 96, 9, red ? 'bold' : 'normal').forEach((l, i) => { font(fr.doc, 9, red ? 'bold' : 'normal', red ? DANGER : INK2); fr.doc.text(l, fr.x + 96, y + 9 + i * 11); });
    },
  })), after: 's' }));
  const cost = t.figures ? balanceCost(t.figures, costInputs(p.s.capacity, p.line)) : undefined;
  /* the line, station by station */
  if (t.stations.length) {
    out.push(label('The line, station by station'));
    const cols = [0, 22, 170, 290];
    out.push(rows({
      header: { h: () => 13, draw: (fr, y) => {
        font(fr.doc, 7, 'bold', MUTED);
        ['#', 'Station', 'Makes', 'Who works there'].forEach((h, i) => fr.doc.text(h.toUpperCase(), fr.x + cols[i], y + 9));
        fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.5); fr.doc.line(fr.x, y + 12, fr.x + fr.w, y + 12);
      } },
      rows: t.stations.map((x, i) => {
        const who = x.people.length ? x.people.map(q => `${q.who}: ${q.says}`) : [x.kind === 'people' ? 'nobody in the line balance here' : 'machine'];
        const makes = `${x.makes}${x.ofLimit != null && !x.limit ? ` · ${x.ofLimit}% of the bottleneck` : ''}`;
        const lines = (fr: Frame) => ({ w: who.flatMap(l => wrap(fr.doc, l, fr.w - cols[3], 8)), m: wrap(fr.doc, makes, cols[3] - cols[2] - 8, 8), n: wrap(fr.doc, `${x.name}${x.lane ? ` · ${x.lane}` : ''}${x.limit ? ' — BOTTLENECK' : ''}`, cols[2] - cols[1] - 8, 8.5, 'bold') });
        return {
          h: (fr: Frame) => { const l = lines(fr); return Math.max(l.w.length, l.m.length, l.n.length) * 10 + 7; },
          draw: (fr: Frame, y: number) => {
            const l = lines(fr), red = x.people.some(q => q.over);
            font(fr.doc, 8, 'normal', MUTED); fr.doc.text(String(i + 1), fr.x, y + 9);
            l.n.forEach((s, k) => { font(fr.doc, 8.5, 'bold', x.limit ? NAVY : INK2); fr.doc.text(s, fr.x + cols[1], y + 9 + k * 10); });
            l.m.forEach((s, k) => { font(fr.doc, 8, 'normal', INK2); fr.doc.text(s, fr.x + cols[2], y + 9 + k * 10); });
            l.w.forEach((s, k) => { font(fr.doc, 8, red ? 'bold' : 'normal', red ? DANGER : INK2); fr.doc.text(s, fr.x + cols[3], y + 9 + k * 10); });
            const rh = Math.max(l.w.length, l.m.length, l.n.length) * 10 + 7;
            fr.doc.setDrawColor(LINE); fr.doc.setLineWidth(0.4); fr.doc.line(fr.x, y + rh - 1, fr.x + fr.w, y + rh - 1);
          },
        };
      }),
      after: 's',
    }));
    if (t.loose.length) out.push(text({ text: `At no station: ${t.loose.map(q => `${q.who} ${q.says}`).join(' · ')}`, size: SIZE.small, colour: INK2, after: gap(d, 'm') }));
  }
  /* the line standard's card */
  if (p.card) {
    out.push(label('Who stands where — the line standard'));
    const ch = CW * (1240 / 1754);
    out.push(box(() => ch + 8, (fr, y) => { fr.doc.addImage(p.card as string, 'PNG', fr.x, y, fr.w, fr.w * (1240 / 1754)); }));
  }
  /* each person against takt, and what the bottleneck costs */
  if (t.figures) out.push(...balanceBlocks(t.figures, { ...(cost ? { cost } : {}), ...(unit ? { unit } : {}), heading: 'What each person does, against takt' }));
  else out.push(text({ text: 'No line balance yet — the people’s work is not timed.', colour: MUTED }));
  return out;
}

export async function drawTogether(doc: jsPDF, p: TogetherPaper): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, d => blocksOf(p, d));
  await pour({ ...base, density, dry: false }, blocksOf(p, density), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(wrap(doc, `All together — ${p.s.product}  ·  ${p.printed}`, CW - 60, 7.5)[0] ?? '', M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

/** Gather what the page shows — the line, the card — and hand the PDF over. */
export async function togetherPdf(s: Standard, study: ToolStudy | undefined, name: string): Promise<jsPDF> {
  const { loadPdfLib } = await import('./savePdf');
  const { jsPDF } = await loadPdfLib();
  const printed = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const line = s.workspaceId ? await getWorkspace(s.workspaceId) : undefined;
  let card: string | undefined;
  const t = togetherOf(s, study);
  if (t.hasMap) {
    const [{ cardPages }, { worksFor }] = await Promise.all([import('./standardCard'), import('../ui/WorkBalance')]);
    card = (await cardPages(s, name, printed, (await worksFor([s]))[s.id]))[0];
  }
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  await drawTogether(doc, { s, ...(study ? { study } : {}), name, printed, ...(card ? { card } : {}), line });
  return doc;
}

export async function saveTogetherPdf(s: Standard, study: ToolStudy | undefined, name: string): Promise<void> {
  const { deliverPdf } = await import('./savePdf');
  const { pdfFileName } = await import('./fileName');
  await deliverPdf(await togetherPdf(s, study, name), pdfFileName(name, `all together ${s.product}`, todayISO()));
}
