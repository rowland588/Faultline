/* A SHIFT REPORT AS A SITE KEEPS IT BY HAND (13 November, docs/WORKBOOKS.md) — for the tests of the four things the Excel work was
 * missing: a details strip ABOVE the headings that reads as headings (so the person must say the row), cells painted by hand (a missed
 * shift's whole row red, a good count green, a short status amber — one fill by its rgb, one by its theme colour and tint), and the
 * SAME report a month later (more rows, a part month now whole, and one figure already reported quietly changed).
 * Every name and figure is made up. Its own totals are kept beside it as it writes, for the tests to check against.
 *   node scripts/workbook/make-marked-workbook.mjs OUT.xlsx [--later] [--strip] */
import { writeFileSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';

const [out, ...flags] = process.argv.slice(2);
if (!out) { console.error('usage: make-marked-workbook.mjs OUT.xlsx [--later] [--strip]'); process.exit(1); }
const later = flags.includes('--later'), strip = flags.includes('--strip');
const DAY = 86_400_000, EXCEL0 = Date.UTC(1899, 11, 30);
let seed = 20261113;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) >>> 0; return seed / 4294967296; };
const r2 = x => Math.round(x * 100) / 100;

const LINES = ['Line 1', 'Line 2', 'Line 3'], SHIFTS = ['Days', 'Nights'];
const first = Date.UTC(2026, 7, 1), lastDay = later ? Date.UTC(2026, 9, 31) : Date.UTC(2026, 8, 14);
const exp = { rows: 0, variance: 0, byMonth: {}, byLine: {}, byShift: {}, daysByMonth: {}, red: 0, green: 0, amber: 0, redVariance: 0, restated: null };
const add = (o, k, v) => { o[k] = r2((o[k] ?? 0) + v); };
/* cell styles: 0 plain · 1 date · 2 red (rgb) · 3 date on red · 4 green (theme accent 6, lighter) · 5 amber (rgb) */
const rows = [];
for (let t = first; t <= Date.UTC(2026, 9, 31); t += DAY) for (const shift of SHIFTS) for (const line of LINES) {
  /* the same draws whichever file is written, so the two files agree on every row both hold */
  const target = 9000 + LINES.indexOf(line) * 1500;
  const packs = Math.round(target * (0.86 + rnd() * 0.22) - (line === 'Line 3' && shift === 'Nights' ? 700 : 0));
  let variance = r2((packs - target) * 0.42);
  if (t > lastDay) continue;
  /* a figure already reported, changed in the later file: 12 August, Nights, Line 2 */
  if (later && t === Date.UTC(2026, 7, 12) && shift === 'Nights' && line === 'Line 2') { exp.restated = { was: variance, is: r2(variance - 500) }; variance = r2(variance - 500); }
  const status = packs >= target ? 'OK' : 'Short';
  const red = variance < -300, green = !red && packs >= target * 1.05, amber = !red && status === 'Short';
  const month = new Date(t).toISOString().slice(0, 7);
  exp.rows += 1; exp.variance = r2(exp.variance + variance);
  add(exp.byMonth, month, variance); add(exp.byLine, line, variance); add(exp.byShift, shift, variance);
  if (shift === 'Days' && line === 'Line 1') exp.daysByMonth[month] = (exp.daysByMonth[month] ?? 0) + 1;
  if (red) { exp.red += 1; exp.redVariance = r2(exp.redVariance + variance); } if (green) exp.green += 1; if (amber) exp.amber += 1;
  const s = red ? 2 : 0;
  rows.push([{ v: t, s: red ? 3 : 1 }, { v: shift, s }, { v: line, s }, { v: packs, s: green ? 4 : s }, { v: target, s }, { v: variance, s }, { v: status, s: amber ? 5 : s }]);
}

const esc = x => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = n => String.fromCharCode(65 + n);
const cell = (r, c, x) => {
  const v = x && typeof x === 'object' ? x.v : x, s = x && typeof x === 'object' && x.s ? ` s="${x.s}"` : '';
  if (v === null || v === undefined || v === '') return '';
  return typeof v === 'number' ? `<c r="${col(c)}${r}"${s}><v>${s.includes('"1"') || s.includes('"3"') ? (v - EXCEL0) / DAY : v}</v></c>` : `<c r="${col(c)}${r}"${s} t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
};
const sheet = (list, tail = '') => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${list.map((row, i) => `<row r="${i + 1}">${row.map((v, c) => cell(i + 1, c, v)).join('')}</row>`).join('')}</sheetData>${tail}</worksheet>`;

const HEAD = ['Date', 'Shift', 'Line', 'Packs', 'Target', 'Variance £', 'Status'];
/* the details strip: two rows of labels and values above the headings — more words than the headings themselves */
const STRIP = [['Site', 'Northfield Foods', 'Report', 'Shift report', 'Prepared by', 'A Marsh', 'Status', 'Draft'], ['Pattern', 'Two shifts', 'Lines', 'Three', 'Issue', 'Weekly', 'Copy', 'Master']];
const s1 = strip ? [...STRIP, HEAD, ...rows] : [HEAD, ...rows];
exp.headerRow = strip ? 3 : 1;
const s2 = [['Line', 'Area', 'Crew size'], ['Line 1', 'Packing hall', 5], ['Line 2', 'Packing hall', 6], ['Line 3', 'Dispatch end', 4]];
const names = ['Shift report', 'Lines'];
const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const files = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS}"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId9" Type="${NS}/styles" Target="styles.xml"/></Relationships>`,
  'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>'
    + '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFF0000"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor theme="9" tint="0.59999389629810485"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFC000"/><bgColor indexed="64"/></patternFill></fill></fills>'
    + '<cellXfs count="6"><xf numFmtId="0" fillId="0"/><xf numFmtId="164" fillId="0" applyNumberFormat="1"/><xf numFmtId="0" fillId="2" applyFill="1"/><xf numFmtId="164" fillId="2" applyNumberFormat="1" applyFill="1"/><xf numFmtId="0" fillId="3" applyFill="1"/><xf numFmtId="0" fillId="4" applyFill="1"/></cellXfs></styleSheet>',
  'xl/worksheets/sheet1.xml': sheet(s1, '<conditionalFormatting sqref="D2:D400"><cfRule type="cellIs" dxfId="0" priority="1" operator="lessThan"><formula>8000</formula></cfRule></conditionalFormatting>'),
  'xl/worksheets/sheet2.xml': sheet(s2),
};
writeFileSync(out, zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]))));
writeFileSync(`${out}.expected.json`, JSON.stringify(exp, null, 1));
console.log(`${out}: ${exp.rows} rows · variance ${exp.variance} · ${exp.red} red rows, ${exp.green} green, ${exp.amber} amber${later ? ' · the later file' : ''}${strip ? ' · with the strip above the headings' : ''}`);
