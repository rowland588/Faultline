/* MACHINE LABELS — a code per machine, to stick on it (docs/LEAN40.md, the
 * stage gate's evolution, step 1: "Scan the machine").
 *
 * Rowland, 10 October: "What can be done right now to give it the evolution
 * that I could actually say this is Lean 4.0?" — the third answer: each
 * machine carries a code; scanned with the phone's camera at the line, it
 * opens that machine's page in the job (ui/MachinePanel, flow slice 2) —
 * its stages, tests, problems and what it waits on, with Done today and Hit a
 * problem one tap away. Information where the work is.
 *
 * NOTHING NEW IS KEPT, AND NO ROUTE IS NEW. The link is the one the app
 * already opens a machine with — the job's Install page with the machine open
 * over it — written in full the way a share link is (cloud/shares shareUrl).
 * A person without access to the job sees the sign-in, and nothing of it.
 *
 * Laid out by the report engine (lib/report): each row of labels is a block
 * that measures itself, poured into pages — a long machine name wraps and
 * the row grows; nothing is cut. Pure apart from drawing into the doc. */
import type { jsPDF } from 'jspdf';
import { box, font, wrap } from './report/blocks';
import { pour, type Block, type Frame } from './report/flow';
import { drawQr } from './qr';
import { live, type Asset } from './testing';
import { san } from './reportKit';

export interface MachineLabel {
  machine: string;
  oem?: string;
  job: string;
  /** The full link the code opens. */
  link: string;
}

/** The link that opens a machine's page in its job. `base` is the app's own
 *  address — `location.origin + location.pathname`, as a share link is made. */
export const machineLink = (base: string, projectId: string, assetId: string): string =>
  `${base}#/project/${projectId}/install?open=${encodeURIComponent(assetId)}`;

/** The link that opens a job's front page — the code on a report's first page. */
export const jobLink = (base: string, projectId: string): string => `${base}#/project/${projectId}`;

/** One label per machine on the job, in its own order. */
export function machineLabels(x: { project: { id: string; name: string }; assets: Asset[]; base: string }): MachineLabel[] {
  return live(x.assets).sort((a, b) => a.sort - b.sort).map(a => ({
    machine: a.name.trim() || 'Machine not named', ...(a.oem ? { oem: a.oem } : {}),
    job: x.project.name, link: machineLink(x.base, x.project.id, a.id),
  }));
}

const W = 595.28, H = 841.89, M = 36, CW = W - 2 * M;
const GAP = 14, COLS = 2, LW = (CW - GAP * (COLS - 1)) / COLS;
const QR = 112, PAD = 12;
const INK = '#0f1a2e', INK2 = '#33415a', MUTED = '#5b6b82', CUT = '#9aa8bd';

function labelLines(f: Frame, l: MachineLabel) {
  const tw = LW - QR - PAD * 3;
  return {
    name: wrap(f.doc, san(l.machine), tw, 13, 'bold'),
    sub: wrap(f.doc, san([l.oem, l.job].filter(Boolean).join(' · ')), tw, 8.5),
    say: wrap(f.doc, 'Scan with your phone’s camera to open this machine in Faultline.', tw, 8),
  };
}
const labelH = (f: Frame, l: MachineLabel) => {
  const t = labelLines(f, l);
  return Math.max(QR + PAD * 2, PAD + t.name.length * 15 + 4 + t.sub.length * 11 + 8 + t.say.length * 10 + PAD);
};

function drawLabel(f: Frame, l: MachineLabel, x: number, y: number, h: number): void {
  const d = f.doc, t = labelLines(f, l);
  /* The cut line — dashed, so it reads as where to cut, not a box. */
  d.setDrawColor(CUT); d.setLineWidth(0.6); d.setLineDashPattern([3, 2], 0);
  d.roundedRect(x, y, LW, h, 6, 6, 'S'); d.setLineDashPattern([], 0);
  drawQr(d, l.link, x + PAD, y + (h - QR) / 2, QR);
  const tx = x + PAD * 2 + QR;
  let ty = y + PAD + 12;
  font(d, 13, 'bold', INK); d.text(t.name, tx, ty, { lineHeightFactor: 15 / 13 }); ty += t.name.length * 15 + 2;
  font(d, 8.5, 'normal', INK2); d.text(t.sub, tx, ty, { lineHeightFactor: 11 / 8.5 }); ty += t.sub.length * 11 + 6;
  font(d, 8, 'normal', MUTED); d.text(t.say, tx, ty, { lineHeightFactor: 10 / 8 });
}

/** The labels, two to a row, as blocks. */
export function labelBlocks(labels: MachineLabel[]): Block[] {
  const rows: MachineLabel[][] = [];
  for (let i = 0; i < labels.length; i += COLS) rows.push(labels.slice(i, i + COLS));
  return rows.map(row => {
    const h = (f: Frame) => Math.max(...row.map(l => labelH(f, l)));
    return box(f => h(f) + GAP, (f, y) => { const hh = h(f); row.forEach((l, i) => drawLabel(f, l, f.x + i * (LW + GAP), y, hh)); }, () => GAP);
  });
}

/** Draw the labels into `doc`, a page footer on each page. */
export async function drawMachineLabels(doc: jsPDF, labels: MachineLabel[], o: { job: string; printed: string }): Promise<void> {
  const base = { doc, x: M, w: CW, top: M, bottom: H - M - 20, density: 'comfortable' as const };
  await pour({ ...base, dry: false }, labelBlocks(labels), () => doc.addPage('a4', 'portrait'));
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    font(doc, 7.5, 'normal', MUTED);
    doc.text(san(`${o.job}  ·  machine labels  ·  ${o.printed}`), M, H - 18);
    doc.text(`${i} of ${pages}`, W - M, H - 18, { align: 'right' });
  }
}
