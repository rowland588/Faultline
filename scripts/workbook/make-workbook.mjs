/* A DOWNTIME WORKBOOK OF ANY SIZE, WITH ITS OWN TOTALS (docs/WORKBOOKS.md, how it is proved). Written as Excel writes one — a zip of XML,
 * the shared strings after the sheets — streamed to disk so it can be hundreds of megabytes. Its totals are kept AS IT WRITES, from the values
 * it chose, never by reading the file back: the reader is checked against figures it did not make.
 *
 * What it holds, on purpose: a title row and a blank above the header; a merged title; a date column (a date style); a line written two ways
 * ("Line 3" and "line 3 "); "n/a" typed in the minutes; blank minutes; a formula column with Excel's saved values, some with none; #N/A in the
 * stops; rows repeated exactly; a hidden column (the note, inline text); a second sheet whose Machine column links to the first; a hidden
 * lookups sheet; a defined name; a table; a pivot cache built from the log.
 *
 *   node scripts/workbook/make-workbook.mjs OUT.xlsx ROWS [SEED]   → writes OUT.xlsx and OUT.xlsx.expected.json
 */
import { createWriteStream, writeFileSync } from 'node:fs';
import { Zip, ZipDeflate, strToU8 } from 'fflate';

const [out, rowsArg, seedArg] = process.argv.slice(2);
if (!out || !rowsArg) { console.error('usage: make-workbook.mjs OUT.xlsx ROWS [SEED]'); process.exit(2); }
const N = Number(rowsArg);
let seed = Number(seedArg ?? 7) >>> 0;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

const SHIFTS = ['Days', 'Nights'];
const LINES = ['Line 1', 'Line 2', 'Line 3', 'Line 4'];
const MACHINES = ['Filler', 'Bagger', 'Sealer', 'Checkweigher', 'Case packer', 'Palletiser'];
const REASONS = [['Bag presentation', 30], ['Film break', 18], ['Jam at infeed', 15], ['Changeover', 12], ['Label fault', 9], ['Waiting for materials', 7], ['Metal detector reject', 5], ['Other', 4]];
const PRODUCTS = Array.from({ length: 50 }, (_, i) => `Product ${String(i + 1).padStart(3, '0')}`);
const HEAD = ['Date', 'Shift', 'Line', 'Machine', 'Reason', 'Minutes', 'Stops', 'Packs lost', 'Note'];

const sst = [];
const sid = new Map();
const S = t => { let i = sid.get(t); if (i === undefined) { i = sst.length; sst.push(t); sid.set(t, i); } return i; };
['Line downtime log — Plant 2', ...HEAD, ...SHIFTS, ...LINES, 'line 3 ', ...MACHINES, ...REASONS.map(r => r[0]), 'n/a', 'Product', 'Rate per min', ...PRODUCTS, 'Reason list'].forEach(S);
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = n => { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const pick = () => { const tot = REASONS.reduce((t, r) => t + r[1], 0); let x = rnd() * tot; for (const [r, w] of REASONS) { if ((x -= w) < 0) return r; } return REASONS[0][0]; };

const ws = createWriteStream(out);
let waiting = Promise.resolve();
const zip = new Zip((err, data) => { if (err) throw err; if (!ws.write(data)) waiting = new Promise(r => ws.once('drain', r)); });
async function part(name, gen) {
  const f = new ZipDeflate(name, { level: 6 });
  zip.add(f);
  let buf = '';
  for (const s of gen()) { buf += s; if (buf.length > 1 << 20) { f.push(strToU8(buf)); buf = ''; await waiting; } }
  f.push(strToU8(buf), true);
  await waiting;
}

const exp = { rows: N, header: 3, above: ['Line downtime log — Plant 2'], minutesByReason: {}, minutesByLine: {}, minutesByMonth: {}, rowsByShift: {}, minutesTotal: 0, minutesBlank: 0, minutesText: 0, formulas: 0, formulasNoValue: 0, errors: 0, duplicates: 0, packsLost: 0, line3Variant: 0, bagLine3Minutes: 0, bagLine3Rows: 0, firstBagLine3Row: 0 };
const add = (o, k, v) => { o[k] = Math.round(((o[k] ?? 0) + v) * 1e6) / 1e6; };
const seen = new Set();
const BASE = Date.UTC(2026, 0, 1), EXCEL0 = Date.UTC(1899, 11, 30);

function* sheet1() {
  yield '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">';
  yield `<dimension ref="A1:I${N + 3}"/><cols><col min="9" max="9" width="30" hidden="1" customWidth="1"/></cols><sheetData>`;
  yield `<row r="1"><c r="A1" t="s"><v>${S('Line downtime log — Plant 2')}</v></c></row>`;
  yield `<row r="3">${HEAD.map((h, i) => `<c r="${col(i)}3" t="s"><v>${S(h)}</v></c>`).join('')}</row>`;
  let prev = null;
  for (let i = 0; i < N; i += 1) {
    const r = i + 4;
    let v;
    if (prev && i % 3000 === 2999) v = { ...prev };
    else {
      const day = Math.floor(rnd() * 365);
      let line = LINES[Math.floor(rnd() * 4)];
      if (line === 'Line 3' && i % 997 === 13) line = 'line 3 ';
      v = { day, shift: SHIFTS[Math.floor(rnd() * 2)], line, machine: MACHINES[Math.floor(rnd() * MACHINES.length)], reason: pick(), min: Math.round((1 + rnd() * 44) * 10) / 10, stops: 1 + Math.floor(rnd() * 5) };
      v.minKind = i % 1000 === 500 ? 'blank' : i % 1500 === 700 ? 'na' : 'num';
      v.err = i % 5000 === 4321; v.noval = i % 2000 === 1234;
      v.note = i % 50 === 0 ? `Seen at ${v.machine}` : '';
    }
    prev = v;
    const key = JSON.stringify([v.day, v.shift, v.line, v.machine, v.reason, v.minKind === 'num' ? v.min : v.minKind, v.err ? 'E' : v.stops, v.minKind === 'num' && !v.noval ? v.min * 60 : '', v.note]);
    if (seen.has(key)) exp.duplicates += 1; else seen.add(key);
    const month = new Date(BASE + v.day * 86400000).toISOString().slice(0, 7);
    add(exp.rowsByShift, v.shift, 1);
    if (v.line === 'line 3 ') exp.line3Variant += 1;
    let cells = `<c r="A${r}" s="1"><v>${(BASE + v.day * 86400000 - EXCEL0) / 86400000}</v></c><c r="B${r}" t="s"><v>${S(v.shift)}</v></c><c r="C${r}" t="s"><v>${S(v.line)}</v></c><c r="D${r}" t="s"><v>${S(v.machine)}</v></c><c r="E${r}" t="s"><v>${S(v.reason)}</v></c>`;
    if (v.minKind === 'num') {
      cells += `<c r="F${r}"><v>${v.min}</v></c>`;
      exp.minutesTotal = Math.round((exp.minutesTotal + v.min) * 1e6) / 1e6; add(exp.minutesByReason, v.reason, v.min); add(exp.minutesByLine, v.line, v.min); add(exp.minutesByMonth, month, v.min);
      if (v.reason === 'Bag presentation' && v.line.trim().toLowerCase() === 'line 3') { add(exp, 'bagLine3Minutes', v.min); exp.bagLine3Rows += 1; if (!exp.firstBagLine3Row) exp.firstBagLine3Row = r; }
    } else if (v.minKind === 'na') { cells += `<c r="F${r}" t="s"><v>${S('n/a')}</v></c>`; exp.minutesText += 1; }
    else exp.minutesBlank += 1;
    cells += v.err ? `<c r="G${r}" t="e"><v>#N/A</v></c>` : `<c r="G${r}"><v>${v.stops}</v></c>`;
    if (v.err) exp.errors += 1;
    if (v.minKind === 'num') {
      exp.formulas += 1;
      if (v.noval) { cells += `<c r="H${r}"><f>F${r}*60</f></c>`; exp.formulasNoValue += 1; }
      else { cells += `<c r="H${r}"><f>F${r}*60</f><v>${Math.round(v.min * 60 * 1e6) / 1e6}</v></c>`; add(exp, 'packsLost', v.min * 60); }
    }
    if (v.note) cells += `<c r="I${r}" t="inlineStr"><is><t>${esc(v.note)}</t></is></c>`;
    yield `<row r="${r}">${cells}</row>`;
  }
  yield '</sheetData><mergeCells count="1"><mergeCell ref="A1:I1"/></mergeCells></worksheet>';
}
function* sheet2() {
  yield '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetData>';
  yield `<row r="1"><c r="A1" t="s"><v>${S('Product')}</v></c><c r="B1" t="s"><v>${S('Machine')}</v></c><c r="C1" t="s"><v>${S('Rate per min')}</v></c></row>`;
  for (let i = 0; i < 50; i += 1) yield `<row r="${i + 2}"><c r="A${i + 2}" t="s"><v>${S(PRODUCTS[i])}</v></c><c r="B${i + 2}" t="s"><v>${S(MACHINES[i % MACHINES.length])}</v></c><c r="C${i + 2}"><v>${60 + (i % 7) * 10}</v></c></row>`;
  yield '</sheetData><tableParts count="1"><tablePart r:id="rId1"/></tableParts></worksheet>';
}
function* sheet3() {
  yield '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';
  yield `<row r="1"><c r="A1" t="s"><v>${S('Reason list')}</v></c></row>`;
  for (let i = 0; i < REASONS.length; i += 1) yield `<row r="${i + 2}"><c r="A${i + 2}" t="s"><v>${S(REASONS[i][0])}</v></c></row>`;
  yield '</sheetData></worksheet>';
}
const one = s => function* () { yield s; };

const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
await part('[Content_Types].xml', one('<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/></Types>'));
await part('_rels/.rels', one(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`));
await part('xl/workbook.xml', one(`<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS}"><workbookPr/><sheets><sheet name="Downtime" sheetId="1" r:id="rId1"/><sheet name="Products" sheetId="2" r:id="rId2"/><sheet name="Lookups" sheetId="3" state="hidden" r:id="rId3"/></sheets><definedNames><definedName name="ReasonList">Lookups!$A$2:$A$9</definedName></definedNames><pivotCaches><pivotCache cacheId="1" r:id="rId6"/></pivotCaches></workbook>`));
await part('xl/_rels/workbook.xml.rels', one(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="${NS}/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="${NS}/worksheet" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Type="${NS}/styles" Target="styles.xml"/><Relationship Id="rId5" Type="${NS}/sharedStrings" Target="sharedStrings.xml"/><Relationship Id="rId6" Type="${NS}/pivotCacheDefinition" Target="pivotCache/pivotCacheDefinition1.xml"/></Relationships>`));
await part('xl/styles.xml', one('<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164" applyNumberFormat="1"/></cellXfs></styleSheet>'));
await part('xl/worksheets/sheet1.xml', sheet1);
await part('xl/worksheets/sheet2.xml', sheet2);
await part('xl/worksheets/_rels/sheet2.xml.rels', one(`<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/table" Target="../tables/table1.xml"/></Relationships>`));
await part('xl/tables/table1.xml', one('<?xml version="1.0" encoding="UTF-8"?><table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="1" name="Table1" displayName="ProductRates" ref="A1:C51"><tableColumns count="3"><tableColumn id="1" name="Product"/><tableColumn id="2" name="Machine"/><tableColumn id="3" name="Rate per min"/></tableColumns></table>'));
await part('xl/worksheets/sheet3.xml', sheet3);
await part('xl/pivotCache/pivotCacheDefinition1.xml', one(`<?xml version="1.0" encoding="UTF-8"?><pivotCacheDefinition xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cacheSource type="worksheet"><worksheetSource ref="A3:I${N + 3}" sheet="Downtime"/></cacheSource></pivotCacheDefinition>`));
await part('xl/sharedStrings.xml', function* () {
  yield `<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sst.length}" uniqueCount="${sst.length}">`;
  for (const s of sst) yield /^\s|\s$/.test(s) ? `<si><t xml:space="preserve">${esc(s)}</t></si>` : `<si><t>${esc(s)}</t></si>`;
  yield '</sst>';
});
zip.end();
await waiting;
await new Promise(r => ws.end(r));
exp.packsLost = Math.round(exp.packsLost * 1e6) / 1e6;
writeFileSync(`${out}.expected.json`, JSON.stringify(exp, null, 1));
console.log(`${out}: ${N} rows`);
