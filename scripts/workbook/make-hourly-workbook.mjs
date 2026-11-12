/* AN HOUR-BY-HOUR LABOUR WORKBOOK, WITH ITS OWN TOTALS (12 November, docs/WORKBOOKS.md — the first look; the boardroom rehearsal).
 * The shape of the workbook a packing site really keeps (seen 10 November): one row an hour on a line, the labour it cost, the labour it
 * earned at the product's standard, the difference as a profit-and-loss column, the tonnes, the unplanned downtime with its reason — under
 * three title rows, with a product master beside it. Every name and figure here is MADE UP; nothing of any customer is in it.
 *
 * The story it holds, on purpose: Lines 6 and 2 lose money over the period and Line 5 earns the most; from October Line 2 gets worse on
 * "Red 2kg tray" (so September → October the biggest mover is Line 2); the last month is only nine days and runs worse a day than
 * October; one downtime minute in eight has no reason given. Totals are kept AS IT WRITES, from the rounded values it writes.
 *
 *   node scripts/workbook/make-hourly-workbook.mjs OUT.xlsx [SEED]   → OUT.xlsx and OUT.xlsx.expected.json */
import { writeFileSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';

const [out, seedArg] = process.argv.slice(2);
if (!out) { console.error('usage: make-hourly-workbook.mjs OUT.xlsx [SEED]'); process.exit(2); }
let seed = Number(seedArg ?? 7) >>> 0;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const r2 = n => Math.round(n * 100) / 100;

/* product: [name, £ of labour earned a tonne, tonnes an hour at standard] */
const PRODUCTS = { 'White 2.5kg bag': [38, 3.2], 'Baking 4 pack': [52, 2.1], 'Red 2kg tray': [44, 2.6], 'Baby 750g': [61, 1.8], 'Salad 1kg': [47, 2.4], 'Sweet potato 14kg': [29, 3.9] };
/* line: [crew, £ an hour a head, its products, how well it runs against standard] */
const LINES = { 'Line 1': [6, 14.2, ['White 2.5kg bag', 'Salad 1kg'], 1.0], 'Line 2': [7, 14.2, ['Red 2kg tray', 'Baking 4 pack'], 0.9], 'Line 3': [5, 14.2, ['Baby 750g', 'Salad 1kg'], 1.02],
  'Line 4': [6, 14.2, ['Baking 4 pack', 'White 2.5kg bag'], 0.96], 'Line 5': [5, 14.2, ['Baby 750g', 'White 2.5kg bag'], 1.12], 'Line 6': [8, 14.2, ['Sweet potato 14kg', 'Red 2kg tray'], 0.94] };
const REASONS = ['Mechanical breakdown', 'No product to line', 'Quality hold', 'Bagger', 'Conveyors', 'Changeover overrun'];
const SHIFTS = [['Days', 'A', 6], ['Lates', 'B', 14]];
const DAY = 86400000, FROM = Date.UTC(2026, 6, 27), TO = Date.UTC(2026, 10, 9);

const exp = { sheet: 'Hourly archive', header: 4, rows: 0, pl: 0, plByMonth: {}, plByLine: {}, plByProduct: {}, costByMonth: {}, tonnesByMonth: {}, daysByMonth: {}, dt: 0, dtBlank: 0, dtBlankRows: 0, dtByReason: {}, plByLineMonth: {} };
const add = (o, k, v) => { o[k] = r2((o[k] ?? 0) + v); };
const rows = [];
for (let t = FROM; t <= TO; t += DAY) {
  const d = new Date(t), month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`, m = d.getUTCMonth();
  exp.daysByMonth[month] = (exp.daysByMonth[month] ?? 0) + 1;
  for (const [shift, crew, h0] of SHIFTS) for (const [line, [heads, wage, prods, runs]] of Object.entries(LINES)) {
    const product = prods[(d.getUTCDate() + (shift === 'Lates' ? 1 : 0)) % prods.length];
    for (let h = 0; h < 8; h += 1) {
      const [earnRate, std] = PRODUCTS[product];
      /* the story: Line 2 on the red tray falls away from October; everything is a little worse in November */
      const drag = (line === 'Line 2' && product === 'Red 2kg tray' && m >= 9 ? 0.72 : 1) * (m === 10 ? 0.93 : 1);
      const stopped = rnd() < 0.085;
      const dtMin = stopped ? Math.round(5 + rnd() * 40) : 0;
      const tonnes = r2(std * runs * drag * (0.92 + rnd() * 0.16) * (1 - dtMin / 60));
      const cost = r2(heads * wage), earned = r2(tonnes * earnRate), pl = r2(earned - cost);
      const reason = stopped ? (rnd() < 0.125 ? null : REASONS[Math.floor(rnd() * REASONS.length)]) : null;
      rows.push([{ v: t, date: true }, shift, crew, h0 + h, line, product, tonnes, cost, earned, pl, stopped ? dtMin : null, reason, r2(earned / cost)]);
      exp.rows += 1; exp.pl = r2(exp.pl + pl);
      add(exp.plByMonth, month, pl); add(exp.plByLine, line, pl); add(exp.plByProduct, product, pl); add(exp.costByMonth, month, cost); add(exp.tonnesByMonth, month, tonnes);
      add(exp.plByLineMonth, `${line}|${month}`, pl);
      if (stopped) { exp.dt += dtMin; if (reason === null) { exp.dtBlank += dtMin; exp.dtBlankRows += 1; } else add(exp.dtByReason, reason, dtMin); }
    }
  }
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = n => { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const EXCEL0 = Date.UTC(1899, 11, 30);
const cell = (r, c, v, date) => typeof v === 'number'
  ? `<c r="${col(c)}${r}"${date ? ' s="1"' : ''}><v>${date ? (v - EXCEL0) / DAY : v}</v></c>`
  : `<c r="${col(c)}${r}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
const sheet = list => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${list.map((row, i) => `<row r="${i + 1}">${row.map((v, c) => (v === null || v === undefined ? '' : cell(i + 1, c, v.v ?? v, v.date))).join('')}</row>`).join('')}</sheetData></worksheet>`;

const HEAD = ['Date', 'Shift', 'Crew', 'Hour', 'Line', 'Product', 'Tonnes', 'Direct labour cost £', 'Earned labour value £', 'Direct P&L £ (fav +)', 'Unplanned DT (mins)', 'Downtime reason', 'Efficiency %'];
const s1 = [['HOUR BY HOUR — ARCHIVE (values only)'], ['Closed months are pasted here as values'], [], HEAD, ...rows];
const s2 = [['Product', 'Earned £ per tonne', 'Standard tonnes per hour'], ...Object.entries(PRODUCTS).map(([k, v]) => [k, ...v])];
const s3 = [['Order', 'Product', 'Tonnes ordered'], ...Object.keys(PRODUCTS).map((k, i) => [`SO-${1000 + i}`, k, 40 + i * 12]), ['SO-1010', 'Baby 750g', 18], ['SO-1011', 'Salad 1kg', 25], ['SO-1012', 'Red 2kg tray', 60]];

const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const names = ['Hourly archive', 'Product master', 'Orders'];
const files = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS}"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId9" Type="${NS}/styles" Target="styles.xml"/></Relationships>`,
  'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164" applyNumberFormat="1"/></cellXfs></styleSheet>',
  'xl/worksheets/sheet1.xml': sheet(s1), 'xl/worksheets/sheet2.xml': sheet(s2), 'xl/worksheets/sheet3.xml': sheet(s3),
};
writeFileSync(out, zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]))));
writeFileSync(`${out}.expected.json`, JSON.stringify(exp, null, 1));
console.log(`${out}: ${exp.rows.toLocaleString('en-GB')} rows · P&L ${exp.pl} · downtime ${exp.dt} min, ${exp.dtBlank} with no reason`);
