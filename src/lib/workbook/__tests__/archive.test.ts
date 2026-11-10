/* A WORKBOOK SHAPED AS A REAL ONE WAS (10 November — Rowland, on his own hour-by-hour workbook: "I see the actual formulas when I
 * ask a question … the output is poor"). Two shapes a site's workbook takes that the reader got wrong:
 *   - an archive sheet with a title row AND a note beside it above the real header — the title row was taken for the header, so every
 *     column came out "Column B", "Column W" and every answer said "sum of Column V by Column W";
 *   - a live sheet whose formulas are dragged to the foot of the sheet — a million rows that show nothing, read as a million rows of data.
 * And the profile Luna is given never quotes a formula's text: how many cells are worked out by formulas, never the formula. */
import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { readWorkbook } from '../read';
import { MemoryStore } from '../store';
import type { ByteSource } from '../zip';
import { sheetSaid } from '../../../capabilities/workbook';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const col = (n: number) => { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
type Cell = string | number | { f: string; v?: string | number };
const cellXml = (r: number, c: number, v: Cell): string => {
  const ref = `${col(c)}${r}`;
  if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
  if (typeof v === 'string') return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  const val = v.v === undefined ? '' : `<v>${esc(String(v.v))}</v>`;
  return `<c r="${ref}"${typeof v.v === 'string' ? ' t="str"' : ''}><f>${esc(v.f)}</f>${val}</c>`;
};
const sheetXml = (rows: [number, Cell[]][]): string =>
  `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${
    rows.map(([r, cells]) => `<row r="${r}">${cells.map((v, c) => (v === '' ? '' : cellXml(r, c, v))).join('')}</row>`).join('')
  }</sheetData></worksheet>`;

function workbook(sheets: { name: string; rows: [number, Cell[]][] }[]): Uint8Array {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'xl/workbook.xml': strToU8(`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`),
  };
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s.rows)); });
  return zipSync(files);
}
const bytes = (b: Uint8Array): ByteSource => ({ size: b.length, read: async (s, e) => b.subarray(s, e) });

const HEAD = ['Week', 'Date', 'Crew', 'Shift', 'Line', 'Reason', 'Minutes'];
const REASONS = ['Mechanical breakdown', 'No product to line', 'Quality hold'];
/* the archive: a title in A1 with a note beside it, a blank row, the header in row 3, then 30 rows of values */
const archive: [number, Cell[]][] = [
  [1, ['HOUR BY HOUR — ARCHIVE (values only, no formulas)', '', '', '', 'Copied weekly']],
  [3, HEAD],
  ...Array.from({ length: 30 }, (_, i): [number, Cell[]] => [4 + i, [38 + (i % 3), 46200 + i, ['A', 'B', 'C'][i % 3], i % 2 ? 'NIGHTS' : 'DAYS', `LINE ${1 + (i % 4)}`, REASONS[i % 3], 10 + i]]),
];
/* the live sheet: a title, the header in row 4, 3 rows of data, then the template's formulas dragged down 5,000 rows showing nothing */
const live: [number, Cell[]][] = [
  [1, ['PRODUCTIVITY INPUT', 'Live']],
  [4, HEAD],
  ...Array.from({ length: 3 }, (_, i): [number, Cell[]] => [5 + i, [{ f: `IF(B${5 + i}="","",ISOWEEKNUM(B${5 + i}))`, v: 45 }, 46330 + i, 'A', { f: `IF(C${5 + i}="","",IF(C${5 + i}="A","DAYS","NIGHTS"))`, v: 'DAYS' }, 'LINE 7', 'Bagger', 20 + i]]),
  ...Array.from({ length: 5000 }, (_, i): [number, Cell[]] => [8 + i, [{ f: `IF(B${8 + i}="","",ISOWEEKNUM(B${8 + i}))`, v: '' }, '', '', { f: `IF(C${8 + i}="","",IF(C${8 + i}="A","DAYS","NIGHTS"))`, v: '' }]]),
];

describe('a site’s workbook read as it is', () => {
  it('the archive: the header is the row that names the columns, the title and its note said as what is above it', async () => {
    const p = await readWorkbook(bytes(workbook([{ name: 'HBH Archive', rows: archive }])), new MemoryStore(), { id: 'a', name: 'copy.xlsx' });
    const s = p.sheets[0];
    expect(s.headerRow).toBe(3);
    expect(s.columns.map(c => c.name)).toEqual(HEAD);
    expect(s.columns.every(c => c.named)).toBe(true);
    expect(s.above).toEqual(['HOUR BY HOUR — ARCHIVE (values only, no formulas) · Copied weekly']);
    expect(s.rows).toBe(30);
  });

  it('the live sheet: rows that hold only formulas showing nothing are not data — said as skipped, never counted', async () => {
    const p = await readWorkbook(bytes(workbook([{ name: 'Hour By Hour Raw Data', rows: live }])), new MemoryStore(), { id: 'b', name: 'copy.xlsx' });
    const s = p.sheets[0];
    expect(s.headerRow).toBe(4);
    expect(s.rows).toBe(3);
    expect(s.formulaRows).toBe(5000);
    expect(s.formulas).toBe(6);
    const said = sheetSaid(p.sheets[0], true);
    expect(said).toMatch(/3 rows of data under the header in row 4/);
    expect(said).toMatch(/5,000 of them hold only formulas showing nothing/);
  });

  it('what Luna is told never quotes a formula — only how many cells are worked out by one', async () => {
    const p = await readWorkbook(bytes(workbook([{ name: 'Hour By Hour Raw Data', rows: live }])), new MemoryStore(), { id: 'c', name: 'copy.xlsx' });
    const said = sheetSaid(p.sheets[0], true);
    expect(said).not.toMatch(/=IF|ISOWEEKNUM|IF\(/);
    expect(said).toMatch(/Week” — .*3 worked out by formulas/);
  });
});
