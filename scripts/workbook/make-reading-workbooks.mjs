/* THE READING — TWO MONTHS OF ONE REPORT, AND A THIRD (15 November, docs/WORKBOOKS.md — "The reading"). A made-up site's shift
 * report, the way a site keeps one: its own words for things, which no reader can know from the cells —
 *   "Standing"   the minutes the line stood (time lost — the heading does not say so);
 *   "Score"      a shift's score out of 100 (a rate — added up unaided, which means nothing);
 *   "Crew"       the people on the shift (a level — never a total);
 *   "Charge"     £ recharged to the customer (money — the heading does not say so);
 *   "Type"       Production or Trial — the site never counts its trial runs.
 * Each month is written with its truth BOTH WAYS: as a reader gets it unaided, and as the site reads it once told. And the same three
 * months again with a details strip above the headings (strip-…), which a reader takes for the headings until told the row.
 * Every name and figure is MADE UP. Usage: node scripts/workbook/make-reading-workbooks.mjs OUTDIR */
import { writeFileSync, mkdirSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';
const out = process.argv[2];
if (!out) { console.error('usage: make-reading-workbooks.mjs OUTDIR'); process.exit(2); }
mkdirSync(out, { recursive: true });
let seed = 41;
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
const r2 = n => Math.round(n * 100) / 100;
const LINES = ['Line 1', 'Line 2', 'Line 3'], SHIFTS = ['Days', 'Nights'];
const HEAD = ['Date', 'Line', 'Shift', 'Type', 'Packs', 'Score', 'Standing', 'Crew', 'Charge'];
const STRIP = [['Site', 'Hallam Foods', 'Report', 'Shift report', 'Prepared by', 'J Okafor', 'Status', 'Issued', 'Copy'], ['Pattern', 'Two shifts', 'Lines', 'Three', 'Issue', 'Monthly', 'Owner', 'Operations', 'Master'], []];
const MONTHS = [['march', 2, 31], ['april', 3, 30], ['may', 4, 31]];
for (const [name, month, days] of MONTHS) {
  const recs = [];
  for (let d = 1; d <= days; d += 1) for (const line of LINES) for (const shift of SHIFTS) {
    const trial = rnd() < 0.09;
    recs.push({ t: Date.UTC(2026, month, d), line, shift, type: trial ? 'Trial' : 'Production', packs: Math.round((trial ? 6000 : 20000) + rnd() * 6000), score: Math.round(62 + rnd() * 34 - (line === 'Line 2' ? 8 : 0)),
      standing: Math.round((trial ? 120 : 15) + rnd() * (line === 'Line 3' ? 110 : 60)), crew: 4 + Math.floor(rnd() * 4), charge: r2(40 + rnd() * 260) });
  }
  const sum = (xs, k) => r2(xs.reduce((t, x) => t + x[k], 0));
  const prod = recs.filter(r => r.type === 'Production'), trial = recs.filter(r => r.type === 'Trial');
  const truth = {
    what: 'A shift report in the site’s own words: a row a shift', sheet: 'Shift log', rows: recs.length, headerRow: 1,
    /* AS A READER GETS IT UNAIDED: it leads with the packs, every row counted, and adds the score, the minutes, the crew and the charge up */
    unaided: { headline: 'Packs', packs: sum(recs, 'packs'), scoreAddedUp: sum(recs, 'score'), crewAddedUp: sum(recs, 'crew') },
    /* AS THE SITE READS IT: the standing minutes lead, trial runs left out, the score averaged, the crew never added, the charge in £ */
    told: { headline: 'Standing', rows: prod.length, out: trial.length, standing: sum(prod, 'standing'), standingOut: sum(trial, 'standing'), standingAll: sum(recs, 'standing'),
      byLine: Object.fromEntries(LINES.map(l => [l, sum(prod.filter(r => r.line === l), 'standing')])), score: r2(sum(prod, 'score') / prod.length), scoreAll: r2(sum(recs, 'score') / recs.length), charge: sum(prod, 'charge'), packs: sum(prod, 'packs') },
  };
  const rows = recs.map(r => [D(r.t), r.line, r.shift, r.type, r.packs, r.score, r.standing, r.crew, r.charge]);
  const notes = { name: 'Notes', rows: [['Shift report'], ['Kept by operations, one row a shift.'], ['Trial runs are logged with the rest.']] };
  book(`shift-report-${name}`, [notes, { name: 'Shift log', rows: [HEAD, ...rows] }], truth);
  book(`strip-shift-report-${name}`, [notes, { name: 'Shift log', rows: [...STRIP, HEAD, ...rows] }], { ...truth, headerRow: 4 });
}
console.log(`${out}: ${MONTHS.length} months of the shift report, and the same with a details strip above the headings`);
