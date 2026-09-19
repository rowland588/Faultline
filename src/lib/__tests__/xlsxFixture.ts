/* Build a real .xlsx from a plain grid, so a workbook test reads like a
 * spreadsheet instead of an opaque binary fixture.
 *
 * Real bytes through the app's own reader on purpose: the point of these tests
 * is the whole path — zip, XML, shared strings, column letters, the lot — not a
 * hand-made SheetData object that skips everything the reader actually does.
 *
 * Values are written as inline strings or bare numbers, which is the subset the
 * reader treats as ordinary data. Anything more exotic (a formula with no cached
 * result, a date serial, an error cell) gets written by the individual test that
 * cares about it, because those are the interesting cases and hiding them in a
 * helper would make them unreadable.
 */
import { zipSync, strToU8 } from 'fflate';

export type Cell = string | number | null | undefined;

/** A cell written as raw XML, for the cases a plain value cannot express.
 *  `{{ref}}` is replaced with the cell reference. */
export interface RawCell { raw: string }
export const raw = (xml: string): RawCell => ({ raw: xml });
/** Includes RawCell so a test can drop a hand-written cell into a grid —
 *  a formula with no cached value, a date serial — without a second type. */
export type Grid = (Cell | RawCell)[][];

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** 0 -> A, 25 -> Z, 26 -> AA. Excel's column letters, which the reader uses to
 *  place a cell — so a test can leave a gap and have it land in the right
 *  column rather than shuffling everything left. */
export function colName(i: number): string {
  let s = '';
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) s = String.fromCharCode(65 + (n % 26)) + s;
  return s;
}

function cellXml(v: Cell | RawCell, col: number, row: number): string {
  if (v == null || v === '') return '';
  const ref = `${colName(col)}${row + 1}`;
  if (typeof v === 'object' && 'raw' in v) return v.raw.replace('{{ref}}', ref);
  if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
  return `<c r="${ref}" t="inlineStr"><is><t>${esc(String(v))}</t></is></c>`;
}

function sheetXml(grid: Grid): string {
  const rows = grid
    .map((row, r) => {
      const cells = row.map((v, c) => cellXml(v, c, r)).join('');
      return cells ? `<row r="${r + 1}">${cells}</row>` : `<row r="${r + 1}"/>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows}</sheetData></worksheet>`;
}

/** sheets in order: { "Action Tracker": grid, "Pareto": grid } */
export function xlsx(sheets: Record<string, Grid>): ArrayBuffer {
  const names = Object.keys(sheets);

  const wb = `<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>${names
    .map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`)
    .join('')}</sheets>
</workbook>`;

  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names
    .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
    .join('')}</Relationships>`;

  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
</Types>`),
    'xl/workbook.xml': strToU8(wb),
    'xl/_rels/workbook.xml.rels': strToU8(rels),
  };
  names.forEach((n, i) => {
    files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(sheets[n]!));
  });

  const zipped = zipSync(files);
  // A fresh ArrayBuffer, not zipped.buffer: fflate may hand back a view into a
  // larger pooled buffer, and the reader would then unzip whatever else is in it.
  const out = new ArrayBuffer(zipped.byteLength);
  new Uint8Array(out).set(zipped);
  return out;
}
