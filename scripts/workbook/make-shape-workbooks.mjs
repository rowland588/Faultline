/* THE SHAPES FACTORY WORKBOOKS COME IN (14 November, docs/WORKBOOKS.md — "Any workbook"). Seventeen small workbooks (the last a log
 * with a report sheet built on it by formulas — what a real workbook taught), each a shape a
 * manufacturing site really keeps — a tidy log, months across the top, two rows of headings, the sheet's own total rows, a tab a week,
 * tables stacked on one sheet, a filled-in form, numbers typed with their units, a register of words, headings a long way down, a
 * summary beside the log, a name merged down its rows, durations kept as times, a sheet of rates, measurements against limits, a stock
 * list — every name and figure MADE UP, and each with the truth it was written from (NAME.truth.json), so the reader is held to totals
 * it did not make. Usage: node scripts/workbook/make-shape-workbooks.mjs OUTDIR */
import { writeFileSync, mkdirSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
const out = process.argv[2];
if (!out) { console.error('usage: make-shape-workbooks.mjs OUTDIR'); process.exit(2); }
mkdirSync(out, { recursive: true });
let seed = 5;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const DAY = 86400000, EXCEL0 = Date.UTC(1899, 11, 30);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = n => { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const D = t => ({ v: (t - EXCEL0) / DAY, s: 1 }), T = mins => ({ v: mins / 1440, s: 2 }), P = x => ({ v: x, s: 3 });
const cell = (r, c, v) => v === null || v === undefined || v === '' ? '' : typeof v === 'object' && v.f ? `<c r="${col(c)}${r}"><f>${esc(v.f)}</f><v>${v.val}</v></c>`
  : typeof v === 'object' ? `<c r="${col(c)}${r}" s="${v.s}"><v>${v.v}</v></c>` : typeof v === 'number' ? `<c r="${col(c)}${r}"><v>${v}</v></c>` : `<c r="${col(c)}${r}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
const sheetXml = (rows, merges = []) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, i) => (row && row.length ? `<row r="${i + 1}">${row.map((v, c) => cell(i + 1, c, v)).join('')}</row>` : '')).join('')}</sheetData>${merges.length ? `<mergeCells count="${merges.length}">${merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}</worksheet>`;
const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
function book(name, sheets, truth) {
  const files = {
    '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
    '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS}"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId99" Type="${NS}/styles" Target="styles.xml"/></Relationships>`,
    'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="2"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="[h]:mm"/></numFmts><cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="164" applyNumberFormat="1"/><xf numFmtId="165" applyNumberFormat="1"/><xf numFmtId="10" applyNumberFormat="1"/></cellXfs></styleSheet>',
    ...Object.fromEntries(sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheetXml(s.rows, s.merges)])),
  };
  writeFileSync(`${out}/${name}.xlsx`, zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]))));
  writeFileSync(`${out}/${name}.truth.json`, JSON.stringify(truth));
}
const LINES = ['Line 1', 'Line 2', 'Line 3', 'Line 4'], REASONS = ['Jam', 'No film', 'Changeover', 'Breakdown'];
const r2 = n => Math.round(n * 100) / 100;
const START = Date.UTC(2026, 3, 6);
/* the same made-up downtime log, as records: 60 days x 4 lines */
const recs = [];
for (let d = 0; d < 60; d += 1) for (const line of LINES) recs.push({ t: START + d * DAY, line, reason: REASONS[Math.floor(rnd() * 4)], mins: Math.round(10 + rnd() * 90), packs: Math.round(20000 + rnd() * 8000), cost: 0 });
for (const r of recs) r.cost = r2(r.mins * 2.4);
const sum = (xs, k) => r2(xs.reduce((t, x) => t + x[k], 0));
const total = { mins: sum(recs, 'mins'), packs: sum(recs, 'packs'), cost: sum(recs, 'cost') };
const byLine = k => Object.fromEntries(LINES.map(l => [l, sum(recs.filter(r => r.line === l), k)]));
const HEAD = ['Date', 'Line', 'Reason', 'Downtime (mins)', 'Packs', 'Cost £'];
const row = r => [D(r.t), r.line, r.reason, r.mins, r.packs, r.cost];

/* 01 the tidy log — the shape she was built on */
book('01-tidy-log', [{ name: 'Downtime', rows: [HEAD, ...recs.map(row)] }], { what: 'A tidy log: one row a stop, one heading row', sheet: 'Downtime', figure: 'Downtime (mins)', total: total.mins, byLine: byLine('mins') });

/* 02 months across the top — a plan or KPI grid: lines down, months across */
{ const months = ['Apr-26', 'May-26', 'Jun-26'];
  const m = r => new Date(r.t).getUTCMonth() - 3;
  const grid = LINES.map(l => [l, ...months.map((_, i) => sum(recs.filter(r => r.line === l && m(r) === i), 'packs'))]);
  book('02-months-across', [{ name: 'Output', rows: [['PACKS MADE BY MONTH'], [], ['Line', ...months], ...grid] }], { what: 'A grid: lines down, months across the top (no date column)', sheet: 'Output', figure: 'packs by month', total: total.packs, byLine: byLine('packs') }); }

/* 03 two rows of headings, the top one merged over groups */
{ const rows = [['', 'Days', '', 'Nights', ''], ['Date', 'Packs', 'Downtime (mins)', 'Packs', 'Downtime (mins)']];
  let packs = 0, mins = 0;
  for (let d = 0; d < 40; d += 1) { const a = Math.round(20000 + rnd() * 5000), b = Math.round(10 + rnd() * 60), c = Math.round(18000 + rnd() * 5000), e = Math.round(10 + rnd() * 80); packs += a + c; mins += b + e; rows.push([D(START + d * DAY), a, b, c, e]); }
  book('03-two-row-headings', [{ name: 'Line 1', rows, merges: ['B1:C1', 'D1:E1'] }], { what: 'Two rows of headings: Days / Nights merged over Packs and Downtime', sheet: 'Line 1', figure: 'Packs (both shifts)', total: packs, also: { mins } }); }

/* 04 subtotal and total rows inside the data */
{ const rows = [HEAD];
  for (const l of LINES) { const mine = recs.filter(r => r.line === l); rows.push(...mine.map(row)); rows.push(['', `${l} Total`, '', sum(mine, 'mins'), sum(mine, 'packs'), sum(mine, 'cost')]); }
  rows.push(['', 'Grand Total', '', total.mins, total.packs, total.cost]);
  book('04-total-rows', [{ name: 'Downtime', rows }], { what: 'The tidy log with a subtotal row after each line and a grand total at the foot', sheet: 'Downtime', figure: 'Downtime (mins)', total: total.mins, wrongIfDoubled: total.mins * 3 }); }

/* 05 one tab a week, the same layout on each */
{ const sheets = [];
  for (let w = 0; w < 8; w += 1) { const mine = recs.filter(r => Math.floor((r.t - START) / (7 * DAY)) === w); sheets.push({ name: `Wk ${w + 15}`, rows: [HEAD, ...mine.map(row)] }); }
  const first8 = recs.filter(r => Math.floor((r.t - START) / (7 * DAY)) < 8);
  book('05-tab-per-week', sheets, { what: 'One tab a week (8 tabs), the same headings on each', sheet: 'all 8 tabs', figure: 'Downtime (mins)', total: sum(first8, 'mins'), oneTab: sum(first8.filter(r => Math.floor((r.t - START) / (7 * DAY)) === 0), 'mins') }); }

/* 06 several tables stacked on one sheet, each with its own heading row */
{ const rows = [['WEEKLY SUMMARY']];
  rows.push([], ['OUTPUT'], ['Line', 'Packs', 'Target'], ...LINES.map(l => [l, byLine('packs')[l], 1500000]));
  rows.push([], ['DOWNTIME BY REASON'], ['Reason', 'Stops', 'Minutes'], ...REASONS.map(x => [x, recs.filter(r => r.reason === x).length, sum(recs.filter(r => r.reason === x), 'mins')]));
  rows.push([], ['LABOUR'], ['Shift', 'Heads', 'Hours'], ['Days', 24, 1920], ['Nights', 18, 1440]);
  book('06-stacked-tables', [{ name: 'Summary', rows }], { what: 'Three small tables stacked on one sheet, each under its own heading row', sheet: 'Summary', figure: 'Packs (first table) / Minutes (second)', total: total.packs, also: { mins: total.mins } }); }

/* 07 a form: a shift report as labels and values */
book('07-form', [{ name: 'Shift report', rows: [['SHIFT REPORT'], [], ['Date', D(START)], ['Shift', 'Days'], ['Line', 'Line 2'], ['Team leader', 'A. Marsh'], [], ['Packs made', 21450], ['Target', 24000], ['Downtime (mins)', 85], ['Rejects', 312], [], ['Biggest stop', 'Film break at the bagger, 40 min'], ['Handover notes', 'Sealer jaw temperature drifting; engineer booked']] }],
  { what: 'A filled-in form: labels down one column, values beside them', sheet: 'Shift report', figure: 'Packs made 21,450 of 24,000; downtime 85', total: 21450 });

/* 08 numbers and dates typed as text, with their units */
book('08-text-numbers', [{ name: 'Downtime', rows: [HEAD, ...recs.map(r => [new Date(r.t).toLocaleDateString('en-GB', { timeZone: 'UTC' }), r.line, r.reason, `${r.mins} min`, `${r.packs.toLocaleString('en-GB')}`, `£${r.cost.toFixed(2)}`])] }],
  { what: 'The tidy log typed by hand: "45 min", "21,450", "£108.00", dates as text', sheet: 'Downtime', figure: 'Downtime (mins)', total: total.mins });

/* 09 a register of words: an action log */
{ const rows = [['Ref', 'Raised', 'Area', 'Action', 'Owner', 'Due', 'Status', 'Priority']];
  const st = ['Open', 'Open', 'Closed', 'Overdue'], pr = ['High', 'Medium', 'Low'], who = ['A. Marsh', 'B. Okoro', 'C. Lund'];
  let open = 0, overdue = 0;
  for (let i = 0; i < 60; i += 1) { const s = st[Math.floor(rnd() * 4)]; if (s !== 'Closed') open += 1; if (s === 'Overdue') overdue += 1; rows.push([`A-${100 + i}`, D(START + i * DAY), LINES[i % 4], `Action ${i + 1} to put right`, who[i % 3], D(START + (i + 14) * DAY), s, pr[i % 3]]); }
  book('09-action-log', [{ name: 'Actions', rows }], { what: 'A register of words: an action log (owner, due, status) — no figure to add up', sheet: 'Actions', figure: 'counts: open, overdue, by owner', total: open, also: { overdue, rows: 60 } }); }

/* 10 the headings a long way down, under a block of notes */
{ const rows = [['DOWNTIME LOG — SITE COPY']];
  for (let i = 0; i < 38; i += 1) rows.push([`Note ${i + 1}: guidance for whoever fills this in.`]);
  rows.push(HEAD, ...recs.map(row));
  book('10-headings-low', [{ name: 'Downtime', rows }], { what: 'The tidy log with its headings on row 40, under 39 lines of notes', sheet: 'Downtime', figure: 'Downtime (mins)', total: total.mins }); }

/* 11 two tables side by side */
{ const a = recs.slice(0, 60), b = REASONS.map(x => [x, sum(recs.filter(r => r.reason === x), 'mins')]);
  const rows = [[...HEAD, '', '', 'Reason', 'Minutes (all)']];
  for (let i = 0; i < a.length; i += 1) rows.push([...row(a[i]), '', '', ...(b[i] ?? [])]);
  book('11-side-by-side', [{ name: 'Downtime', rows }], { what: 'A log with a small summary table beside it on the same rows', sheet: 'Downtime', figure: 'Downtime (mins)', total: sum(a, 'mins'), wrongIf: 'the summary column is added to it or read as a row' }); }

/* 12 the line written once, then left blank down the rows (or merged) */
{ const rows = [HEAD]; const merges = []; let at = 2;
  for (const l of LINES) { const mine = recs.filter(r => r.line === l); mine.forEach((r, i) => rows.push([D(r.t), i === 0 ? l : '', r.reason, r.mins, r.packs, r.cost])); merges.push(`B${at}:B${at + mine.length - 1}`); at += mine.length; }
  book('12-merged-down', [{ name: 'Downtime', rows, merges }], { what: 'The line name written once and merged down its rows', sheet: 'Downtime', figure: 'Downtime (mins) by Line', total: total.mins, byLine: byLine('mins') }); }

/* 13 durations kept as times (h:mm) */
book('13-durations-as-time', [{ name: 'Stops', rows: [['Date', 'Line', 'Reason', 'Duration', 'Packs'], ...recs.map(r => [D(r.t), r.line, r.reason, T(r.mins), r.packs])] }],
  { what: 'Stop durations kept as times (0:45), as Excel stores them', sheet: 'Stops', figure: 'Duration', total: total.mins, unit: 'minutes' });

/* 14 only rates: an OEE sheet of percentages */
{ const rows = [['Date', 'Line', 'Availability %', 'Performance %', 'Quality %', 'OEE %']]; let n = 0, s = 0;
  for (let d = 0; d < 40; d += 1) for (const l of LINES) { const a = 0.8 + rnd() * 0.15, p = 0.85 + rnd() * 0.1, q = 0.97 + rnd() * 0.02; rows.push([D(START + d * DAY), l, P(a), P(p), P(q), P(a * p * q)]); n += 1; s += a * p * q; }
  book('14-rates-only', [{ name: 'OEE', rows }], { what: 'A sheet of rates only: availability, performance, quality, OEE (percentages)', sheet: 'OEE', figure: 'OEE % (an average, never a sum)', total: Math.round((s / n) * 1000) / 10, unit: '% average' }); }

/* 15 a quality sheet: measurements against limits (weights) */
{ const rows = [['Sample', 'Time', 'Line', 'Product', 'Weight (g)', 'Lower limit', 'Upper limit', 'Checked by']]; let out = 0;
  for (let i = 0; i < 200; i += 1) { const w = r2(500 + (rnd() - 0.45) * 14); if (w < 497 || w > 506) out += 1; rows.push([i + 1, D(START + Math.floor(i / 20) * DAY), LINES[i % 2], 'Granola 500g', w, 497, 506, 'QA']); }
  book('15-measurements', [{ name: 'Weights', rows }], { what: 'Measurements against limits: 200 pack weights with a lower and upper limit', sheet: 'Weights', figure: 'Weight (g): its average, spread and how many outside the limits', total: out, unit: 'outside the limits' }); }

/* 16 a stock list / bill of materials: codes, descriptions, quantities, unit cost */
{ const rows = [['Item code', 'Description', 'Supplier', 'Qty on hand', 'Unit cost £', 'Reorder level', 'Location']]; let value = 0, low = 0;
  for (let i = 0; i < 80; i += 1) { const q = Math.round(rnd() * 500), c = r2(0.5 + rnd() * 40), re = 100; value += q * c; if (q < re) low += 1; rows.push([`RM-${1000 + i}`, `Material ${i + 1}`, ['Acorn Ltd', 'Birch & Co', 'Cedar plc'][i % 3], q, c, re, `Bay ${1 + (i % 9)}`]); }
  book('16-stock-list', [{ name: 'Stock', rows }], { what: 'A stock list: quantity and unit cost a row — the value is quantity × cost, never the sum of either', sheet: 'Stock', figure: 'Stock value (qty × unit cost)', total: r2(value), also: { belowReorder: low } }); }
/* 17 a log with a report sheet built on it by formulas — a row a line and a Total row, every one a SUMIFS that leaves the re-worked rows out */
{ const flag = i => (i % 10 === 0 ? 1 : 0);
  const log = [[...HEAD, 'Rework'], ...recs.map((r, i) => [...row(r), flag(i)])];
  const kept = recs.filter((_, i) => !flag(i));
  const KEY = { D: 'mins', E: 'packs', F: 'cost' };
  const F = (c, line) => ({ f: line ? 'SUMIFS(Log!$' + c + ':$' + c + ',Log!$B:$B,$A' + (LINES.indexOf(line) + 2) + ',Log!$G:$G,0)' : 'SUMIFS(Log!$' + c + ':$' + c + ',Log!$G:$G,0)', val: sum(line ? kept.filter(r => r.line === line) : kept, KEY[c]) });
  const report = [['Line', 'Minutes', 'Packs', 'Cost £'], ...LINES.map(l => [l, F('D', l), F('E', l), F('F', l)]), ['Total', F('D'), F('E'), F('F')]];
  book('17-report-on-log', [{ name: 'Log', rows: log }, { name: 'Report', rows: report }], { what: 'A log with a report sheet built on it by formulas (a row a line and a Total row), leaving the re-worked rows out', sheet: 'Log', figure: 'Downtime (mins), on the rows the report takes', total: sum(kept, 'mins'), also: { all: total.mins, kept: kept.length, formulas: 15 } }); }
console.log('made 17 workbooks in', out);
