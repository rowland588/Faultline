/* A WORKBOOK SHAPED AS A REAL ONE WAS (10 November — Rowland, on his own hour-by-hour workbook: "I see the actual formulas when I
 * ask a question … the output is poor"). Two shapes a site's workbook takes that the reader got wrong:
 *   - an archive sheet with a title row AND a note beside it above the real header — the title row was taken for the header, so every
 *     column came out "Column B", "Column W" and every answer said "sum of Column V by Column W";
 *   - a live sheet whose formulas are dragged to the foot of the sheet — a million rows that show nothing, read as a million rows of data.
 * And the profile Luna is given never quotes a formula's text: how many cells are worked out by formulas, never the formula. */
import { describe, it, expect } from 'vitest';
import { zipSync, strToU8 } from 'fflate';
import { readWorkbook } from '../read';
import { runQuery } from '../query';
import { MemoryStore } from '../store';
import type { ByteSource } from '../zip';
import { sheetSaid, sheetLine, linkSaid } from '../../../capabilities/workbook';

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
type Filter = { ref: string; colId: number; hidden: Set<number> };
const sheetXml = (rows: [number, Cell[]][], f?: Filter): string =>
  `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${
    rows.map(([r, cells]) => `<row r="${r}"${f?.hidden.has(r) ? ' hidden="1"' : ''}>${cells.map((v, c) => (v === '' ? '' : cellXml(r, c, v))).join('')}</row>`).join('')
  }</sheetData>${f ? `<autoFilter ref="${f.ref}"><filterColumn colId="${f.colId}"><filters><dateGroupItem year="2026" month="10" dateTimeGrouping="month"/></filters></filterColumn></autoFilter>` : ''}</worksheet>`;
const absRef = (ref: string): string => ref.split(':').map(x => x.replace(/^([A-Z]+)(\d+)$/, '$$$1$$$2')).join(':');

function workbook(sheets: { name: string; rows: [number, Cell[]][]; filter?: Filter }[]): Uint8Array {
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    'xl/workbook.xml': strToU8(`<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets><definedNames>${sheets.map((s, i) => (s.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${esc(s.name)}'!${absRef(s.filter.ref)}</definedName>` : '')).join('')}</definedNames></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(`<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`),
  };
  sheets.forEach((s, i) => { files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(sheetXml(s.rows, s.filter)); });
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

  it('a filter on the archive (on Date, Rowland’s): its header the filter’s first row, the rows it hides counted, each row Shown by the filter yes or no — so a question can be asked of what was on screen', async () => {
    /* the filter's range starts at the header row 3 — even with a longer, wordier title above it */
    const titled: [number, Cell[]][] = [[1, ['HOUR BY HOUR — ARCHIVE', 'values only', 'no formulas', 'copied weekly', 'by the shift lead', 'do not edit', 'see REF', 'and the rota']], ...archive.slice(1)];
    const hidden = new Set(Array.from({ length: 20 }, (_, i) => 4 + i));
    const store = new MemoryStore();
    const p = await readWorkbook(bytes(workbook([{ name: 'HBH Archive', rows: titled, filter: { ref: 'A3:G33', colId: 1, hidden } }])), store, { id: 'f', name: 'copy.xlsx' });
    const s = p.sheets[0];
    expect(s.headerRow).toBe(3);
    expect(s.columns.slice(0, 7).map(c => c.name)).toEqual(HEAD);
    expect(s.rows).toBe(30);
    expect(s.filter).toEqual({ ref: 'A3:G33', on: ['Date'], hiddenRows: 20 });
    expect(s.columns.find(c => c.name === 'Shown by the filter')?.type).toBe('yes/no');
    const all = await runQuery(store, p, { sheet: 'HBH Archive', measures: [{ op: 'sum', column: 'Minutes' }] });
    const shown = await runQuery(store, p, { sheet: 'HBH Archive', filters: [{ column: 'Shown by the filter', op: 'eq', value: 'yes' }], measures: [{ op: 'sum', column: 'Minutes' }] });
    expect(all.rowsMatched).toBe(30);
    expect(shown.rowsMatched).toBe(10);
    expect(shown.totals[0]).toBe(Array.from({ length: 10 }, (_, i) => 30 + i).reduce((a, b) => a + b, 0));
    expect(sheetSaid(s, true)).toMatch(/A filter is on \(A3:G33, on Date\): 20 of the 30 rows are hidden by it/);
  });

  it('what Luna is told never quotes a formula — only how many cells are worked out by one', async () => {
    const p = await readWorkbook(bytes(workbook([{ name: 'Hour By Hour Raw Data', rows: live }])), new MemoryStore(), { id: 'c', name: 'copy.xlsx' });
    const said = sheetSaid(p.sheets[0], true);
    expect(said).not.toMatch(/=IF|ISOWEEKNUM|IF\(/);
    expect(said).toMatch(/Week” — .*3 worked out by formulas/);
  });
});

/* THREE SHEETS NOT LINKED BY ANY FORMULA (10 November — Rowland: "Even if the sheets aren't linked … the product master is … the product
 * costings and the product rates … then I've attached the budget … It's understanding the connections between names of products, the
 * costings"). The master names each SKU once (as a number), the budget plans by SKU, the log repeats SKUs and has one the master lacks. */
const MASTER: [number, Cell[]][] = [
  [1, ['PRODUCT MASTER — costings and rates']],
  [2, ['SKU', 'Product', '£ per pack', 'Rate ppm']],
  [3, [1001, 'Maris Piper 2kg', 0.4, 60]],
  [4, [1002, 'King Edward 2.5kg', 0.5, 50]],
  [5, [1003, 'Baby Potatoes 1kg', 0.8, 70]],
  [6, [1004, 'Salad Potatoes 750g', 0.9, 65]],
];
const BUDGET: [number, Cell[]][] = [
  [1, ['Month', 'SKU', 'Planned packs']],
  [2, [46296, 1001, 100000]], [3, [46296, 1002, 80000]], [4, [46296, 1003, 50000]],
  [5, [46327, 1001, 110000]], [6, [46327, 1002, 85000]], [7, [46327, 1003, 55000]],
];
/* the log: SKU, minutes down, packs lost — 1001 three times, 1002 twice, 1003 once, and 1999 (not in the master) once */
const LOG_ROWS: [number, number, number][] = [[1001, 30, 1800], [1001, 20, 1200], [1002, 45, 2250], [1003, 10, 700], [1001, 15, 900], [1002, 5, 250], [1999, 12, 600]];
const LOG: [number, Cell[]][] = [[1, ['Date', 'SKU', 'Minutes', 'Packs lost']], ...LOG_ROWS.map(([sku, m, p], i): [number, Cell[]] => [2 + i, [46300 + i, sku, m, p]])];

describe('the whole workbook understood: what each sheet is and how they connect, from their values', () => {
  const load = async () => { const store = new MemoryStore(); const p = await readWorkbook(bytes(workbook([{ name: 'HBH Archive', rows: LOG }, { name: 'PRODUCT MASTER', rows: MASTER }, { name: 'FY27 Budget', rows: BUDGET }])), store, { id: 'x', name: 'bob.xlsx' }); return { store, p }; };

  it('the master’s SKU lists each value once; the log’s and the budget’s repeat', async () => {
    const { p } = await load();
    const col = (sh: string, c: string) => p.sheets.find(x => x.name === sh)!.columns.find(x => x.name === c)!;
    expect(col('PRODUCT MASTER', 'SKU').unique).toBe(true);
    expect(col('PRODUCT MASTER', 'Product').unique).toBe(true);
    expect(col('HBH Archive', 'SKU').unique).toBeFalsy();
    expect(col('FY27 Budget', 'SKU').unique).toBeFalsy();
  });

  it('the connections are found from the SKUs themselves — log to master and budget to master — and the minutes link to nothing', async () => {
    const { p } = await load();
    const said = p.links.map(l => `${l.a}.${l.column}~${l.b}.${l.bColumn ?? l.column}:${l.shared}:${l.key ?? ''}`).sort();
    expect(said).toContain('HBH Archive.SKU~PRODUCT MASTER.SKU:3:PRODUCT MASTER');
    expect(said).toContain('PRODUCT MASTER.SKU~FY27 Budget.SKU:3:PRODUCT MASTER');
    expect(p.links.some(l => l.column === 'Minutes' || l.bColumn === 'Minutes')).toBe(false);
    expect(linkSaid(p.links.find(l => l.a === 'HBH Archive')!)).toBe('“HBH Archive”.SKU ↔ “PRODUCT MASTER”.SKU (3 values shared, 75% of the smaller list; “PRODUCT MASTER” lists each once — the master)');
    expect(sheetLine(p.sheets.find(x => x.name === 'PRODUCT MASTER')!)).toMatch(/4 rows, header row 2; columns \(4\): SKU, Product, £ per pack, Rate ppm; each value once in: SKU, Product/);
  });

  it('a question across sheets: the log’s minutes by the master’s product name, and the packs lost priced at the master’s £ a pack — the unknown SKU left blank and said', async () => {
    const { store, p } = await load();
    const r = await runQuery(store, p, {
      sheet: 'HBH Archive',
      lookups: [{ as: 'Product', sheet: 'PRODUCT MASTER', match: 'SKU', on: 'SKU', take: 'Product' }, { as: 'Std £ a pack', sheet: 'PRODUCT MASTER', match: 'SKU', on: 'SKU', take: '£ per pack' }],
      calcs: [{ as: 'Lost £', a: 'Packs lost', op: '*', b: 'Std £ a pack' }],
      groupBy: ['Product'],
      measures: [{ op: 'sum', column: 'Minutes' }, { op: 'sum', column: 'Lost £' }],
      order: { by: 0, desc: true },
    });
    const by = Object.fromEntries(r.groups.map(g => [g.key[0], g.values]));
    /* by hand: Maris Piper 30+20+15 = 65 min, (1800+1200+900) × 0.40 = £1,560; King Edward 45+5 = 50 min, 2500 × 0.50 = £1,250;
       Baby 10 min, 700 × 0.80 = £560; SKU 1999 not in the master: 12 min, no price */
    expect(by['Maris Piper 2kg']).toEqual([65, 1560]);
    expect(by['King Edward 2.5kg']).toEqual([50, 1250]);
    expect(by['Baby Potatoes 1kg']).toEqual([10, 560]);
    expect(by['(blank)']).toEqual([12, null]);
    expect(r.totals).toEqual([137, 3370]);
    expect(r.notes.join(' ')).toMatch(/1 rows had a value not found for “Product” \(e\.g\. “1999”\) — left blank, never guessed/);
    expect(r.notes.join(' ')).toMatch(/“Lost £” is “Packs lost” × “Std £ a pack”/);
  });

  it('the budget against the master: planned packs by product name, the budget’s SKU found in the master', async () => {
    const { store, p } = await load();
    const r = await runQuery(store, p, { sheet: 'FY27 Budget', lookups: [{ as: 'Product', sheet: 'PRODUCT MASTER', match: 'SKU', on: 'SKU', take: 'Product' }], groupBy: ['Product'], measures: [{ op: 'sum', column: 'Planned packs' }] });
    expect(Object.fromEntries(r.groups.map(g => [g.key[0], g.values[0]]))).toEqual({ 'Maris Piper 2kg': 210000, 'King Edward 2.5kg': 165000, 'Baby Potatoes 1kg': 105000 });
  });
});
