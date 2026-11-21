/* THE WORKBOOK EXAM'S WORKBOOK (20 November, docs/CONNECTED-LUNA.md X4) — a made-up site's production log, the shape a packing site keeps:
 * a row a line a shift, Monday to Friday from 3 August to 15 October 2026 (October only half written), with the site's own Total row at
 * the foot (SUM formulas, as Excel saves them), an efficiency kept as a percentage (a rate — averaged, never added), a downtime reason
 * left blank now and then, and a notes sheet beside it. Every name and figure is MADE UP, from a fixed seed, so every run asks of the
 * same file.
 *
 * Written with its TRUTH, worked here row by row as each is written — never by the app's reader — so the exam marks Luna against the
 * figures the file was made from. `workbookBook.test.ts` proves the app's reader gives the same figures, so a wrong mark is Luna's,
 * never the generator's. */
import { strToU8, zipSync } from 'fflate';

export const BOOK_NAME = 'Production log 2026.xlsx';
export const BOOK_SHEET = 'Shift log';
export const LINES = ['Line 1', 'Line 2', 'Line 3'] as const;
const SHIFTS = ['Days', 'Nights'] as const;
const PRODUCT: Record<string, string> = { 'Line 1': '500g bag', 'Line 2': '1kg bag', 'Line 3': '2.5kg bag' };
const TARGET: Record<string, number> = { 'Line 1': 9600, 'Line 2': 8400, 'Line 3': 6000 };
const DOWN_MEAN: Record<string, number> = { 'Line 1': 34, 'Line 2': 52, 'Line 3': 41 };
const CREW: Record<string, number> = { 'Line 1': 5, 'Line 2': 4, 'Line 3': 4 };
/** The reasons, by weight; '' is a stop with no reason written. */
const REASONS: [string, number][] = [['Jam', 0.34], ['Film change', 0.2], ['Changeover', 0.18], ['Waiting for materials', 0.12], ['Breakdown', 0.08], ['', 0.08]];
export const HEAD = ['Date', 'Line', 'Shift', 'Product', 'Packs', 'Target', 'Downtime (min)', 'Downtime reason', 'Efficiency', 'Crew'] as const;
/** Minutes of downtime are priced at this in the exam's follow-up — said by the person, never in the file. */
export const POUNDS_A_MINUTE = 4.2;

export interface Row { date: string; line: string; shift: string; product: string; packs: number; target: number; down: number; reason: string; eff: number; crew: number }
export interface BookTruth {
  rows: number;
  first: string; last: string;
  packs: number;
  packsByMonth: Record<string, number>;
  daysByMonth: Record<string, number>;
  packsByLineByMonth: Record<string, Record<string, number>>;
  bestLineSeptember: { line: string; packs: number };
  down: number;
  downByReason: Record<string, number>;
  topReason: { reason: string; minutes: number };
  noReason: number;
  downByLine: Record<string, number>;
  /** Efficiency averaged over the rows of each shift — as a fraction (0.8734). */
  effByShift: Record<string, number>;
  /** What the downtime costs at POUNDS_A_MINUTE. */
  cost: number;
}

/* ------------------------------------------------------------------ the rows, from a fixed seed */
function rng(seed: number) {
  return () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const monthOf = (isoDay: string) => MONTH[Number(isoDay.slice(5, 7)) - 1];

export function bookRows(): Row[] {
  const rnd = rng(20261120);
  const out: Row[] = [];
  for (let t = Date.UTC(2026, 7, 3); t <= Date.UTC(2026, 9, 15); t += 86_400_000) {
    const wd = new Date(t).getUTCDay();
    if (wd === 0 || wd === 6) continue;
    for (const line of LINES) for (const shift of SHIFTS) {
      const zero = rnd() < 0.1;
      const down = zero ? 0 : Math.max(1, Math.round(DOWN_MEAN[line] * 2 * rnd()));
      const perf = (shift === 'Days' ? 0.95 : 0.9) * (0.97 + 0.06 * rnd());
      const target = TARGET[line];
      const packs = Math.round(target * ((480 - down) / 480) * perf);
      let reason = '';
      if (down > 0) { let x = rnd(), i = 0; for (; i < REASONS.length - 1 && x >= REASONS[i][1]; i++) x -= REASONS[i][1]; reason = REASONS[i][0]; }
      const crew = CREW[line] + (rnd() < 0.2 ? 1 : rnd() < 0.1 ? -1 : 0);
      out.push({ date: iso(t), line, shift, product: PRODUCT[line], packs, target, down, reason, eff: Math.round((packs / target) * 10_000) / 10_000, crew });
    }
  }
  return out;
}

export function truthOf(rows: readonly Row[]): BookTruth {
  const add = (m: Record<string, number>, k: string, v: number) => { m[k] = (m[k] ?? 0) + v; };
  const packsByMonth: Record<string, number> = {}, packsByLineByMonth: Record<string, Record<string, number>> = {};
  const downByReason: Record<string, number> = {}, downByLine: Record<string, number> = {};
  const days: Record<string, Set<string>> = {}, effSum: Record<string, number> = {}, effN: Record<string, number> = {};
  let packs = 0, down = 0, noReason = 0;
  for (const r of rows) {
    const mo = monthOf(r.date);
    packs += r.packs; down += r.down;
    add(packsByMonth, mo, r.packs);
    add((packsByLineByMonth[mo] ??= {}), r.line, r.packs);
    (days[mo] ??= new Set()).add(r.date);
    add(downByLine, r.line, r.down);
    if (r.down > 0) { if (r.reason) add(downByReason, r.reason, r.down); else noReason += r.down; }
    add(effSum, r.shift, r.eff); add(effN, r.shift, 1);
  }
  const sep = Object.entries(packsByLineByMonth.September ?? {}).sort((a, b) => b[1] - a[1])[0];
  const top = Object.entries(downByReason).sort((a, b) => b[1] - a[1])[0];
  return {
    rows: rows.length, first: rows[0]?.date ?? '', last: rows[rows.length - 1]?.date ?? '',
    packs, packsByMonth, daysByMonth: Object.fromEntries(Object.entries(days).map(([k, v]) => [k, v.size])), packsByLineByMonth,
    bestLineSeptember: { line: sep[0], packs: sep[1] },
    down, downByReason, topReason: { reason: top[0], minutes: top[1] }, noReason, downByLine,
    effByShift: Object.fromEntries(Object.keys(effSum).map(k => [k, effSum[k] / effN[k]])),
    cost: Math.round(down * POUNDS_A_MINUTE * 100) / 100,
  };
}

/* ------------------------------------------------------------------ the file, as Excel writes one */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const colName = (n: number) => { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
type Cell = string | number | null | { v: number; s: number } | { f: string; val: number; s?: number };
const EXCEL0 = Date.UTC(1899, 11, 30);
const cellXml = (r: number, c: number, v: Cell) => {
  const ref = `${colName(c)}${r}`;
  if (v === null || v === '') return '';
  if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
  if (typeof v === 'string') return `<c r="${ref}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
  if ('f' in v) return `<c r="${ref}"${v.s ? ` s="${v.s}"` : ''}><f>${esc(v.f)}</f><v>${v.val}</v></c>`;
  return `<c r="${ref}" s="${v.s}"><v>${v.v}</v></c>`;
};
const sheetXml = (rows: Cell[][]) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, i) => `<row r="${i + 1}">${row.map((v, c) => cellXml(i + 1, c, v)).join('')}</row>`).join('')}</sheetData></worksheet>`;
const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

/** The workbook's bytes and its truth. */
export function examWorkbook(): { name: string; bytes: Uint8Array; truth: BookTruth; rows: Row[] } {
  const rows = bookRows();
  const truth = truthOf(rows);
  const n = rows.length, lastRow = n + 1;
  const log: Cell[][] = [
    [...HEAD],
    ...rows.map(r => [{ v: (Date.parse(r.date) - EXCEL0) / 86_400_000, s: 1 }, r.line, r.shift, r.product, r.packs, r.target, r.down, r.reason || null, { v: r.eff, s: 2 }, r.crew] as Cell[]),
    /* the site's own total row, as its shift managers keep it — the reader leaves it out of every figure */
    ['Total', null, null, null, { f: `SUM(E2:E${lastRow})`, val: truth.packs }, { f: `SUM(F2:F${lastRow})`, val: rows.reduce((s, r) => s + r.target, 0) }, { f: `SUM(G2:G${lastRow})`, val: truth.down }, null,
      { f: `AVERAGE(I2:I${lastRow})`, val: Math.round((rows.reduce((s, r) => s + r.eff, 0) / n) * 10_000) / 10_000, s: 2 }, null],
  ];
  const notes: Cell[][] = [
    ['Production log — the packing hall'],
    ['Kept by the shift managers, a row a line a shift.'],
    ['Efficiency is packs made against the target for the shift.'],
    ['Downtime is the minutes the line stood in the shift, with the main reason.'],
  ];
  const sheets = [{ name: BOOK_SHEET, rows: log }, { name: 'Notes', rows: notes }];
  const files: Record<string, string> = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS}"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId99" Type="${NS}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="10" applyNumberFormat="1"/></cellXfs></styleSheet>',
    ...Object.fromEntries(sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.rows)])),
  };
  /* THE SAME BYTES EVERY TIME: a zip stamps each file with the time it was written (to the two seconds), so two builds a moment apart
     differed whenever they fell either side of a tick — the daily full gate's one red unit test, 20 November. The stamp is fixed. */
  const bytes = zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])), { mtime: new Date(Date.UTC(2026, 10, 20, 12, 0, 0)) });
  return { name: BOOK_NAME, bytes, truth, rows };
}

/** The workbook as a file chosen on the device — the same name, size and day every run, so it is one identity. */
export function examWorkbookFile(): { file: File; truth: BookTruth } {
  const b = examWorkbook();
  return { file: new File([new Uint8Array(b.bytes)], b.name, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', lastModified: Date.UTC(2026, 9, 16, 7) }), truth: b.truth };
}
