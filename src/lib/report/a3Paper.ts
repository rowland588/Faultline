/* THE A3 ON ONE PAGE (FC-151; docs/METHODS.md §16) — Toyota's one sheet laid on A3 landscape, from the same model the board draws
 * (project/method/shapes/a3Model), so the screen and the paper cannot part. Two columns on the report engine (blocks that measure
 * themselves, never a hand-kept y): how it is now on the left, what is to be done on the right. The engine measures both columns
 * dry, at ever tighter density and type (never below 7 pt), and keeps the first that puts the whole sheet on ONE page. If the words
 * are more than a page can hold at that floor, nothing is cut: the sheet runs on in one column and the paper says so. */
import type { jsPDF } from 'jspdf';
import { pour, type Block, type Density } from './flow';
import { font, heading, lead, text, wrap } from './blocks';
import { BRAND, INK, LINE, MUTED } from '../reportKit';
import type { A3Block, A3Sheet } from '../../project/method/shapes/a3Model';
import { CM_COLUMNS } from '../../project/method/shapes/a3Model';

const W = 1190.55, H = 841.89, M = 36, GUTTER = 28, FOOT = 26;
const INK2 = '#475569', AMBER = '#b45309';
export interface A3PaperIn { project: string; printed: string; sheet: A3Sheet }

const NOT_WRITTEN = 'Not written yet.';
/** One block of the sheet as engine blocks, type scaled by `s`. */
export function a3BlockBlocks(b: A3Block, s: number): Block[] {
  const body = 10.5 * s, small = 8.5 * s;
  const out: Block[] = [heading(`${b.n}  ${b.title}`, undefined, { size: 13.5 * s })];
  return out.concat(b.fields.flatMap<Block>(fd => [
    ...(b.fields.length > 1 ? [text({ text: fd.label.toUpperCase(), size: small * 0.9, style: 'bold', colour: MUTED, after: 1 })] : []),
    text({ text: fd.value || NOT_WRITTEN, size: body, colour: fd.value ? INK : MUTED, after: 5 }),
  ]));
}

export function a3Blocks(sheet: A3Sheet, side: 'left' | 'right', s: number): Block[] {
  const body = 10.5 * s, small = 8.5 * s;
  const out: Block[] = [];
  for (const b of sheet.blocks.filter(x => x.side === side)) {
    if (!b.list) out.push(...a3BlockBlocks(b, s));
    else {
      out.push(heading(`${b.n}  ${b.title}`, undefined, { size: 13.5 * s }));
      if (!sheet.cms.length) out.push(text({ text: NOT_WRITTEN, size: body, colour: MUTED, after: 5 }));
      for (const { n, cm } of sheet.cms) {
        out.push(text({ text: `${n}. ${cm.what || '—'}`, size: body, style: 'bold', after: 1 }));
        const rest = CM_COLUMNS.filter(c => c.key !== 'what').map(c => `${c.label}: ${cm[c.key] || (c.key === 'cause' ? 'no cause named' : '—')}`).join('  ·  ');
        out.push(text({ text: rest, size: small, colour: cm.cause ? INK2 : AMBER, indent: 12, after: 5 }));
      }
    }
    if (b.evidence) {
      out.push(text({ text: 'WHAT THE PROJECT’S TOOLS SAY', size: small * 0.9, style: 'bold', colour: MUTED, after: 1 }));
      out.push(text({ text: b.evidence.title, size: small, style: 'bold', colour: INK2, after: 1 }));
      out.push(text({ text: b.evidence.says, size: small, colour: INK2, after: 5 }));
    }
  }
  return out;
}

/** (density, type scale) in the order tried: the roomiest that still puts the sheet on one page wins. */
export const ATTEMPTS: readonly { d: Density; s: number }[] = [
  { d: 'comfortable', s: 1 }, { d: 'compact', s: 1 }, { d: 'compact', s: 0.94 }, { d: 'compact', s: 0.88 }, { d: 'compact', s: 0.82 }, { d: 'compact', s: 0.78 },
];

export async function drawA3Paper(doc: jsPDF, x: A3PaperIn): Promise<{ pages: number }> {
  const { sheet } = x;
  /* the header across both columns: the problem is the page's title */
  const hw = W - 2 * M;
  const title = wrap(doc, sheet.problem || 'The problem is not written yet.', hw, 22, 'bold');
  const meta = [sheet.owner ? `Owner: ${sheet.owner}` : 'Owner: not written yet', sheet.agreed ? `Agreed: ${sheet.agreed}` : '', sheet.says].filter(Boolean).join('  ·  ');
  const metaL = wrap(doc, meta, hw, 9.5);
  const top0 = M + 14;
  const headH = 11 + title.length * lead(22, 'compact') + 4 + metaL.length * lead(9.5, 'compact') + 8;
  const top = top0 + headH;
  const bottom = H - M - FOOT;
  const colW = (hw - GUTTER) / 2;
  const frame = (xx: number, d: Density, dry: boolean) => ({ doc, x: xx, w: colW, top, bottom, density: d, dry });
  const none = () => undefined;

  let pick: { d: Density; s: number } | undefined;
  for (const a of ATTEMPTS) {
    const l = await pour(frame(M, a.d, true), a3Blocks(sheet, 'left', a.s), none);
    const r = await pour(frame(M + colW + GUTTER, a.d, true), a3Blocks(sheet, 'right', a.s), none);
    if (l.pages === 1 && r.pages === 1) { pick = a; break; }
  }
  const drawHead = () => {
    font(doc, 8.5, 'bold', BRAND); doc.text('A3 · ' + x.project.toUpperCase(), M, top0 + 6);
    font(doc, 22, 'bold', INK); title.forEach((l, i) => doc.text(l, M, top0 + 11 + 22 * 0.92 + i * lead(22, 'compact')));
    font(doc, 9.5, 'normal', INK2); metaL.forEach((l, i) => doc.text(l, M, top0 + 11 + title.length * lead(22, 'compact') + 4 + 9.5 * 0.92 + i * lead(9.5, 'compact')));
    doc.setDrawColor(BRAND); doc.setLineWidth(2); doc.line(M, top - 6, M + 60, top - 6);
    doc.setDrawColor(LINE); doc.setLineWidth(0.8); doc.line(M + 60, top - 6, W - M, top - 6);
  };
  const addPage = () => doc.addPage('a3', 'landscape');
  if (pick) {
    drawHead();
    await pour(frame(M, pick.d, false), a3Blocks(sheet, 'left', pick.s), none);
    await pour(frame(M + colW + GUTTER, pick.d, false), a3Blocks(sheet, 'right', pick.s), none);
    doc.setDrawColor(LINE); doc.setLineWidth(0.8); doc.line(M + colW + GUTTER / 2, top, M + colW + GUTTER / 2, bottom);
  } else {
    /* more than one A3 holds at the floor of the type: nothing is cut — one column, said */
    drawHead();
    const all = [...a3Blocks(sheet, 'left', 1), ...a3Blocks(sheet, 'right', 1)];
    await pour({ doc, x: M, w: hw, top, bottom, density: 'comfortable', dry: false }, all, () => { addPage(); });
  }
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i); font(doc, 7.5, 'normal', MUTED);
    doc.text(`A3 on one page · ${x.project} · printed ${x.printed}${pick ? '' : ' · too much written for one A3 at a readable size — it runs on, nothing cut'}`, M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
  return { pages };
}

/** Made and handed over: saved to the device, the bar offering Open and Send. */
export async function saveA3Pdf(x: A3PaperIn): Promise<void> {
  const { loadPdfLib, titlePdf, deliverPdf } = await import('../savePdf');
  const { pdfFileName } = await import('../fileName');
  const { todayISO } = await import('../weeks');
  const { jsPDF } = await loadPdfLib();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a3' });
  titlePdf(doc, `A3 on one page — ${x.project}`);
  await drawA3Paper(doc, x);
  await deliverPdf(doc, pdfFileName(x.project, 'a3', todayISO()));
}
