/* THE DEMONSTRATION WORKBOOK — A MONTH OF A FOOD FACTORY'S PLAN AND ACTUAL, WITH ITS OWN TOTALS (12 November, docs/LUNA-DEMO.md).
 * Written as Excel writes one (a zip of XML), its totals kept AS IT WRITES from the values it chose — the reader and Luna's answers are
 * checked against figures they did not make.
 *
 * Three sheets, not linked by formulas, as a real one is:
 *   Production   — a row a day, shift and line in October 2026: Date, Shift, Line, Product, Planned packs, Actual packs (above it a title).
 *   Downtime log — a row a stop: Date, Shift, Line, Area (Processing · Packing · Palletising), Machine, Reason, Minutes.
 *   Products     — the master: Product, Line, Rate per min, Contribution per pack (£).
 *
 * The story it holds, on purpose (so the demonstration has something real to find): Line 3 carries most of the month's shortfall; within
 * Line 3 the nights carry most of it, and from the 13th (a change of bag film) the packing area's Bagger loses time to bag presentation.
 * Every actual is the plan less the stop minutes at the product's rate, less a small loss no stop explains — so the downtime log explains
 * most of the variance and not all of it, and the rest must be said as not explained.
 *
 *   node scripts/workbook/make-demo-workbook.mjs OUT.xlsx [SEED]   → OUT.xlsx and OUT.xlsx.expected.json
 */
import { writeFileSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';

const [out, seedArg] = process.argv.slice(2);
if (!out) { console.error('usage: make-demo-workbook.mjs OUT.xlsx [SEED]'); process.exit(2); }
let seed = Number(seedArg ?? 11) >>> 0;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const PRODUCTS = [
  ['Mash 400g', 'Line 1', 90, 0.21], ['Mash 1kg', 'Line 1', 70, 0.34],
  ['Roast potatoes 750g', 'Line 2', 80, 0.29], ['Wedges 750g', 'Line 2', 80, 0.27],
  ['Baby potatoes 1kg', 'Line 3', 100, 0.24], ['Baby potatoes 500g', 'Line 3', 110, 0.18],
  ['Hash browns 600g', 'Line 4', 60, 0.31], ['Croquettes 450g', 'Line 4', 60, 0.33],
];
const LINES = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
const SHIFTS = ['Days', 'Nights'];
const PLANNED_MIN = 420;
const MACHINES = { Processing: ['Washer', 'Peeler', 'Cooker'], Packing: ['Weigher', 'Bagger', 'Checkweigher'], Palletising: ['Case packer', 'Palletiser'] };
const REASONS = { Washer: ['Blockage'], Peeler: ['Blade change', 'Blockage'], Cooker: ['Temperature low'], Weigher: ['Head fault', 'Product build-up'], Bagger: ['Bag presentation', 'Film splice', 'Jaw temperature'], Checkweigher: ['Reject gate jam'], 'Case packer': ['Case jam'], Palletiser: ['Pallet jam', 'Waiting for forklift'] };
const days = [];
for (let d = 1; d <= 31; d += 1) { const t = Date.UTC(2026, 9, d); const wd = new Date(t).getUTCDay(); if (wd !== 0 && wd !== 6) days.push(t); }

const r1 = n => Math.round(n * 10) / 10;
const add = (o, k, v) => { o[k] = Math.round(((o[k] ?? 0) + v) * 100) / 100; };
const exp = { days: days.length, plan: 0, actual: 0, planByLine: {}, actualByLine: {}, line3PlanByShift: {}, line3ActualByShift: {}, downtimeRows: 0, downtimeMinutes: 0, line3DowntimeByArea: {}, line3DowntimeByReason: {}, line3DowntimeByMachine: {}, line3BaggerFromThe13th: 0, line3BaggerBeforeThe13th: 0, line3PacksLostToStops: 0, line3PacksNotExplained: 0, line3ShortfallContribution: 0 };

const prod = [], stops = [];
for (const t of days) {
  const dom = new Date(t).getUTCDate();
  for (const shift of SHIFTS) {
    for (const line of LINES) {
      const mine = PRODUCTS.filter(p => p[1] === line);
      const [product, , rate, margin] = mine[(dom + (shift === 'Nights' ? 1 : 0)) % mine.length];
      const plan = rate * PLANNED_MIN;
      /* the stops this shift: every line has a few; Line 3's Bagger on nights from the 13th has many */
      let lost = 0;
      const n = 1 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i += 1) {
        const area = rnd() < 0.4 ? 'Processing' : rnd() < 0.7 ? 'Packing' : 'Palletising';
        const machine = MACHINES[area][Math.floor(rnd() * MACHINES[area].length)];
        const reason = REASONS[machine][Math.floor(rnd() * REASONS[machine].length)];
        const min = r1(3 + rnd() * 12);
        stops.push({ t, shift, line, area, machine, reason, min }); lost += min;
      }
      if (line === 'Line 3') {
        const bad = dom >= 13 ? (shift === 'Nights' ? 5 : 2) : 1;
        for (let i = 0; i < bad; i += 1) {
          const reason = rnd() < 0.75 ? 'Bag presentation' : 'Film splice';
          const min = r1(dom >= 13 ? 8 + rnd() * 14 : 4 + rnd() * 6);
          stops.push({ t, shift, line, area: 'Packing', machine: 'Bagger', reason, min }); lost += min;
          if (dom >= 13) exp.line3BaggerFromThe13th = r1(exp.line3BaggerFromThe13th + min); else exp.line3BaggerBeforeThe13th = r1(exp.line3BaggerBeforeThe13th + min);
        }
      }
      const unexplained = Math.round(rate * (2 + rnd() * 6));
      const actual = Math.max(0, Math.round(plan - lost * rate - unexplained));
      prod.push({ t, shift, line, product, plan, actual });
      exp.plan += plan; exp.actual += actual; add(exp.planByLine, line, plan); add(exp.actualByLine, line, actual);
      if (line === 'Line 3') {
        add(exp.line3PlanByShift, shift, plan); add(exp.line3ActualByShift, shift, actual);
        exp.line3PacksLostToStops += Math.round(lost * rate); exp.line3PacksNotExplained += unexplained;
        exp.line3ShortfallContribution = Math.round((exp.line3ShortfallContribution + (plan - actual) * margin) * 100) / 100;
      }
    }
  }
}
for (const s of stops) {
  exp.downtimeRows += 1; exp.downtimeMinutes = r1(exp.downtimeMinutes + s.min);
  if (s.line === 'Line 3') { add(exp.line3DowntimeByArea, s.area, s.min); add(exp.line3DowntimeByReason, s.reason, s.min); add(exp.line3DowntimeByMachine, s.machine, s.min); }
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = n => { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const EXCEL0 = Date.UTC(1899, 11, 30);
const cell = (r, c, v, date) => typeof v === 'number'
  ? `<c r="${col(c)}${r}"${date ? ' s="1"' : ''}><v>${date ? (v - EXCEL0) / 86400000 : v}</v></c>`
  : `<c r="${col(c)}${r}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
const sheet = (rows, first = 1) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, i) => `<row r="${i + first}">${row.map((v, c) => v === null ? '' : cell(i + first, c, v.v ?? v, v.date)).join('')}</row>`).join('')}</sheetData></worksheet>`;

const s1 = [['Production plan against actual — October 2026'], [], ['Date', 'Shift', 'Line', 'Product', 'Planned packs', 'Actual packs'], ...prod.map(p => [{ v: p.t, date: true }, p.shift, p.line, p.product, p.plan, p.actual])];
const s2 = [['Date', 'Shift', 'Line', 'Area', 'Machine', 'Reason', 'Minutes'], ...stops.map(s => [{ v: s.t, date: true }, s.shift, s.line, s.area, s.machine, s.reason, s.min])];
const s3 = [['Product', 'Line', 'Rate per min', 'Contribution per pack (£)'], ...PRODUCTS];

const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const files = {
  '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>',
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS}"><sheets><sheet name="Production" sheetId="1" r:id="rId1"/><sheet name="Downtime log" sheetId="2" r:id="rId2"/><sheet name="Products" sheetId="3" r:id="rId3"/></sheets></workbook>`,
  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${NS}/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="${NS}/styles" Target="styles.xml"/></Relationships>`,
  'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164" applyNumberFormat="1"/></cellXfs></styleSheet>',
  'xl/worksheets/sheet1.xml': sheet(s1),
  'xl/worksheets/sheet2.xml': sheet(s2),
  'xl/worksheets/sheet3.xml': sheet(s3),
};
writeFileSync(out, zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]))));
exp.variance = exp.actual - exp.plan;
exp.line3Variance = exp.actualByLine['Line 3'] - exp.planByLine['Line 3'];
writeFileSync(`${out}.expected.json`, JSON.stringify(exp, null, 1));
console.log(`${out}: ${prod.length} production rows, ${stops.length} stops`);
