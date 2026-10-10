/* A QR CODE ON PAPER — the one way the app draws one (docs/LEAN40.md, step 1,
 * "Scan the machine").
 *
 * The code is made by qrcode-generator (MIT, no dependencies of its own) and
 * drawn here as filled squares in the PDF — no picture is embedded, so it is
 * sharp at any size and prints from any printer. Error correction M (15%): a
 * label on a machine gets scuffed. A quiet zone of four modules all round, as
 * the standard asks, so a phone finds its edges. */
import qrcode from 'qrcode-generator';
import type { jsPDF } from 'jspdf';

/** The code's modules, dark true: row by row. */
export function qrModules(text: string): boolean[][] {
  const q = qrcode(0, 'M');
  q.addData(text);
  q.make();
  const n = q.getModuleCount();
  return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (_, c) => q.isDark(r, c)));
}

/** The quiet zone, in modules, the standard asks for. */
export const QUIET = 4;

/** Draw `text` as a QR code `size` points square at (x, y), quiet zone included. */
export function drawQr(doc: jsPDF, text: string, x: number, y: number, size: number): void {
  const m = qrModules(text);
  const n = m.length + QUIET * 2;
  const cell = size / n;
  doc.setFillColor('#ffffff');
  doc.rect(x, y, size, size, 'F');
  doc.setFillColor('#000000');
  for (let r = 0; r < m.length; r++) {
    /* A run of dark modules in a row is one rectangle — fewer shapes, no
       hairline seams between neighbours when a viewer anti-aliases. */
    let c = 0;
    while (c < m.length) {
      if (!m[r][c]) { c++; continue; }
      let e = c;
      while (e + 1 < m.length && m[r][e + 1]) e++;
      doc.rect(x + (QUIET + c) * cell, y + (QUIET + r) * cell, (e - c + 1) * cell, cell + 0.01, 'F');
      c = e + 1;
    }
  }
}
