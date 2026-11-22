/* A SMALL WORKBOOK WRITTEN AS EXCEL WRITES ONE — a zip of XML with a date style — for a test that needs cells the big generators do
 * not make: a moment WITH a time of day (a stop's start), beside a sheet whose dates are days. Real bytes through the app's own
 * reader, so the test reads what a person's file would be read as; every figure the test expects is worked by hand beside it. */
import { zipSync, strToU8 } from 'fflate';
import { readWorkbook, type WorkbookProfile } from '../read';
import { MemoryStore } from '../store';
import type { ByteSource } from '../zip';

/** A cell: words, a number, nothing — or `{ at }`, a moment (ms, the sheet's own wall clock read as UTC) written as a date serial. */
export type TinyCell = string | number | null | { at: number };

const esc = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = (i: number): string => { let s = ''; for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const EXCEL0 = Date.UTC(1899, 11, 30);
const cell = (r: number, c: number, v: TinyCell): string => {
  if (v === null || v === '') return '';
  const ref = `${col(c)}${r}`;
  if (typeof v === 'object') return `<c r="${ref}" s="1"><v>${(v.at - EXCEL0) / 86_400_000}</v></c>`;
  return typeof v === 'number' ? `<c r="${ref}"><v>${v}</v></c>` : `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
};
const sheetXml = (rows: TinyCell[][]): string => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, i) => `<row r="${i + 1}">${row.map((v, c) => cell(i + 1, c, v)).join('')}</row>`).join('')}</sheetData></worksheet>`;

/** The workbook's bytes: a sheet a name, in order, each a grid with its headings on the first row. */
export function tinyBook(sheets: Record<string, TinyCell[][]>): Uint8Array {
  const names = Object.keys(sheets);
  const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const files: Record<string, string> = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS}"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_n, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${names.length + 1}" Type="${NS}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy hh:mm"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164" applyNumberFormat="1"/></cellXfs></styleSheet>',
  };
  names.forEach((n, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = sheetXml(sheets[n]); });
  return zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])));
}

/** The workbook read by the app's own reader into a store in memory. */
export async function readTiny(sheets: Record<string, TinyCell[][]>, name = 'tiny.xlsx'): Promise<{ p: WorkbookProfile; store: MemoryStore }> {
  const b = tinyBook(sheets);
  const store = new MemoryStore();
  const src: ByteSource = { size: b.length, read: async (s, e) => b.subarray(s, e) };
  const p = await readWorkbook(src, store, { id: 'tiny', name });
  return { p, store };
}
