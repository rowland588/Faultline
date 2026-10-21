/* A PROJECT'S ACTIONS ON PAPER — the action list for the meeting, and each
 * person's own (docs/PROJECTS.md, P3). The lean page (docs/LEAN-PAGE.md):
 * the band, the tiles and the closing line the Actions page says
 * (lib/projectActions), then who is doing what — a section a person, the
 * most late first, each row what · why · where · by when, late in red.
 * Laid out by the report engine (src/lib/report/); as many pages as it
 * needs, every action on it. */
import type { jsPDF } from 'jspdf';
import { chooseDensity, pour, type Block, type Frame } from './report/flow';
import { font, rows, text, wrap } from './report/blocks';
import { leanBand, leanClosing, leanHead, leanTiles } from './report/lean';
import { bandPage } from './lean';
import { actionTiles, actionsClosing, byPerson, PRIORITY_WORD, type DoneThing, type ProjectAction } from './projectActions';

const W = 595, H = 842, M = 36, CW = W - 2 * M;
const INK2 = '#323d43', MUTED = '#59666c', LINE = '#dde6e6', RED = '#c4281c', AMBER = '#b45309';

export interface ActionsPaper {
  project: string;
  printed: string;
  today: string;
  rows: ProjectAction[];
  done: DoneThing[];
  /** One person's own list — their name as the page shows it. */
  person?: string;
}

const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
/** When, in words beside its colour — so it survives a black-and-white print. */
export const whenWord = (a: Pick<ProjectAction, 'due' | 'late' | 'soon'>): string =>
  !a.due ? 'no date agreed' : a.late ? `late — was ${day(a.due)}` : a.soon ? `due ${day(a.due)}, soon` : `due ${day(a.due)}`;

function actionRows(list: ProjectAction[]): Block {
  const rightW = 120;
  const meta = (a: ProjectAction) => [a.kind, a.priority ? PRIORITY_WORD[a.priority] : '', a.where ?? '', a.why ?? ''].filter(Boolean).join(' · ');
  const parts = (f: Frame, a: ProjectAction) => ({ what: wrap(f.doc, a.what, f.w - rightW - 8, 9, 'bold'), meta: wrap(f.doc, meta(a), f.w - rightW - 8, 8) });
  return rows({
    rows: list.map(a => ({
      h: (f: Frame) => { const p = parts(f, a); return 6 + p.what.length * 11 + p.meta.length * 10; },
      draw: (f: Frame, top: number) => {
        const p = parts(f, a);
        f.doc.setDrawColor(LINE); f.doc.setLineWidth(0.5); f.doc.line(f.x, top, f.x + f.w, top);
        font(f.doc, 9, 'bold', a.priority === 'critical' ? RED : INK2); f.doc.text(p.what, f.x, top + 11);
        if (p.meta.length) { font(f.doc, 8, 'normal', MUTED); f.doc.text(p.meta, f.x, top + 11 + p.what.length * 11 - 1); }
        font(f.doc, 8.5, a.late ? 'bold' : 'normal', a.late ? RED : a.soon ? AMBER : MUTED);
        f.doc.text(wrap(f.doc, whenWord(a), rightW, 8.5)[0] ?? '', f.x + f.w, top + 11, { align: 'right' });
      },
    })),
    after: 'm',
  });
}

function blocksOf(r: ActionsPaper): Block[] {
  const mine = r.person ? r.rows.filter(a => a.who.trim().toLowerCase() === r.person?.trim().toLowerCase()) : r.rows;
  const page = bandPage(r.person ? `ACTIONS · ${r.person.toUpperCase()}` : 'ACTIONS · WHO IS DOING WHAT', { name: r.project }, undefined, undefined,
    [['Open', String(mine.length)], ['Printed', r.printed]]);
  const out: Block[] = [leanBand(page, r.printed), leanTiles(actionTiles(mine, r.person ? [] : r.done, r.today))];
  if (!mine.length) out.push(text({ text: r.person ? `Nothing owed by ${r.person} on the project.` : 'Nothing owed on the project.', size: 9, colour: MUTED, after: 10 }));
  for (const g of byPerson(mine)) {
    out.push(leanHead(g.label, `${g.rows.length} open${g.late ? ` · ${g.late} late` : ''}`));
    out.push(actionRows(g.rows));
  }
  out.push(leanClosing(actionsClosing(mine)));
  return out;
}

/** Draw the action list into `doc` — every action, as many pages as it needs. */
export async function drawActions(doc: jsPDF, r: ActionsPaper): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20 };
  const density = await chooseDensity(base, () => blocksOf(r));
  await pour({ ...base, density, dry: false }, blocksOf(r), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(`${r.project} — actions${r.person ? ` · ${r.person}` : ''}  ·  ${r.printed}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}

/** Made and handed over: saved to the device, the bar offering Open and Send. */
export async function saveActionsPdf(r: ActionsPaper): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('./savePdf');
  const { pdfFileName } = await import('./fileName');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  titlePdf(doc, `${r.project} — actions${r.person ? ` — ${r.person}` : ''}`);
  await drawActions(doc, r);
  await deliverPdf(doc, pdfFileName(r.project, r.person ? `actions ${r.person}` : 'actions', r.today));
}
