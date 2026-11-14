/* A KPI WORKBOOK WITH A MODEL ON TOP OF ITS ROWS, AND ITS OWN TOTALS (14 November, docs/WORKBOOKS.md — "the model on top of the rows").
 * The SHAPE of a packing site's KPI workbook: production rows a shift on a line; a flag its own report formulas hold to 0 (re-work runs
 * the reports leave out); a downtime log by WEEK ENDING SATURDAY (so its week is not the calendar's Monday–Sunday); a set-up sheet with
 * the week calendar and each week's own name; a report sheet of SUMIFS; a trend sheet whose unused rows show #N/A on purpose; and a
 * HEALTH sheet of its own checks — row counts, a stale status, the week's packs and efficiency as its reports show them, a figure made
 * by a formula the rows cannot give, a downtime cost a little off the log's, and a note that the trend's errors are intentional.
 * Every name and figure here is MADE UP; nothing of any customer is in it. Totals are kept AS IT WRITES, from the rounded values.
 *
 *   node scripts/workbook/make-kpi-workbook.mjs OUT.xlsx [SEED]   → OUT.xlsx and OUT.xlsx.expected.json */
import { writeFileSync } from 'node:fs';
import { zipSync, strToU8 } from 'fflate';

const [out, seedArg] = process.argv.slice(2);
if (!out) { console.error('usage: make-kpi-workbook.mjs OUT.xlsx [SEED]'); process.exit(2); }
let seed = Number(seedArg ?? 11) >>> 0;
const rnd = () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const r2 = n => Math.round(n * 100) / 100;

const DAY = 86400000, FROM = Date.UTC(2026, 2, 2), TO = Date.UTC(2026, 5, 10);   /* Monday 2 March to Wednesday 10 June 2026 */
const LINES = { 'Line A': [5, 1.02, 'Carrots 1kg'], 'Line B': [6, 0.93, 'Parsnips 500g'], 'Line C': [4, 1.05, 'Swede each'], 'Line D': [7, 0.9, 'Leeks 3 pack'] };
const SHIFTS = ['Days', 'Nights'];
const RATE = 15;   /* £ an hour a head */
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const dmy = t => { const d = new Date(t); return `${String(d.getUTCDate()).padStart(2, '0')}-${MON[d.getUTCMonth()]}-${d.getUTCFullYear()}`; };
const iso = t => new Date(t).toISOString().slice(0, 10);
/* the business's week: Sunday to Saturday; its financial year starts Sunday 1 March 2026 (week 1) */
const weekEnd = t => t + ((6 - new Date(t).getUTCDay() + 7) % 7) * DAY;
const FY0 = Date.UTC(2026, 2, 1);
const weekName = end => `FY26 Wk ${Math.round((end - 6 * DAY - FY0) / (7 * DAY)) + 1}`;

const exp = { sheet: 'Production', rows: 0, flagRows: 0, opAll: 0, opBasis: 0, opFlagged: 0, packsAll: 0, packsBasis: 0, weeks: {}, opByLineBasis: {}, opByMonthBasis: {}, opByMonthAll: {}, lastDate: iso(TO),
  dtRows: 0, dtMinutes: 0, dtCost: 0, dtNoReasonRows: 0, dtByWeek: {} };
const add = (o, k, v) => { o[k] = r2((o[k] ?? 0) + v); };
const prod = [];
for (let t = FROM; t <= TO; t += DAY) {
  const end = iso(weekEnd(t)), month = iso(t).slice(0, 7);
  const w = (exp.weeks[end] ??= { name: weekName(weekEnd(t)), days: 0, rows: 0, basisRows: 0, op: 0, opAll: 0, packs: 0, actual: 0, earned: 0 });
  w.days += 1;
  for (const shift of SHIFTS) for (const [line, [heads, runs, product]] of Object.entries(LINES)) {
    /* the story: Line D gets worse from May; one run in sixteen is re-work, and re-work loses heavily */
    const flag = rnd() < 0.0625 ? 1 : 0;
    const drag = (line === 'Line D' && new Date(t).getUTCMonth() >= 4 ? 0.86 : 1) * (flag ? 0.55 : 1);
    const runHours = r2(7 + rnd()), actual = r2(heads * runHours);
    const earned = r2(actual * runs * drag * (0.94 + rnd() * 0.12));
    const packs = Math.round(earned * 310), op = r2((earned - actual) * RATE);
    prod.push([{ v: t, date: true }, shift, line, product, flag, 1 + Math.floor(rnd() * 3), packs, runHours, actual, earned, op]);
    exp.rows += 1; w.rows += 1; exp.opAll = r2(exp.opAll + op); exp.packsAll += packs; w.opAll = r2(w.opAll + op); add(exp.opByMonthAll, month, op);
    if (flag) { exp.flagRows += 1; exp.opFlagged = r2(exp.opFlagged + op); continue; }
    exp.opBasis = r2(exp.opBasis + op); exp.packsBasis += packs; w.basisRows += 1; w.op = r2(w.op + op); w.packs += packs; w.actual = r2(w.actual + actual); w.earned = r2(w.earned + earned);
    add(exp.opByLineBasis, line, op); add(exp.opByMonthBasis, month, op);
  }
}
const ends = Object.keys(exp.weeks).sort();
/* the first week starts on a Monday (6 days) and the last stops on a Wednesday (4 days): the latest WHOLE week is the one before it */
exp.partWeek = ends[ends.length - 1]; exp.latestWeek = ends[ends.length - 2]; exp.weekBefore = ends[ends.length - 3];
const earlier = ends.slice(0, -2).filter(e => exp.weeks[e].days === 7).slice(-12);
exp.averageBefore = r2(earlier.reduce((t, e) => t + exp.weeks[e].op, 0) / earlier.length); exp.averageOver = earlier.length;
const LW = exp.weeks[exp.latestWeek];
exp.efficiency = Math.round((LW.earned / LW.actual) * 10000) / 100;

/* the downtime log: a row a line a week, by week ENDING (a Saturday), each with the week's own name; one row in five has no reason */
const REASONS = ['Bagger jam', 'No product', 'Label change', 'Unclassified', 'Film break'];
const down = [];
for (const e of ends) for (const line of Object.keys(LINES)) {
  const reason = REASONS[Math.floor(rnd() * REASONS.length)], minutes = Math.round(20 + rnd() * 160), cost = r2(minutes * 1.9);
  down.push([{ v: Date.parse(e), date: true }, line, reason, minutes, cost, exp.weeks[e].name]);
  exp.dtRows += 1; exp.dtMinutes += minutes; exp.dtCost = r2(exp.dtCost + cost); add(exp.dtByWeek, e, cost);
  if (reason === 'Unclassified') exp.dtNoReasonRows += 1;
}
/* what the HEALTH sheet shows: one figure the rows cannot give (it adds an off-line cost kept nowhere in the rows), one a little off */
exp.toStandard = r2(LW.op - 1840.37);
exp.healthDowntime = r2(exp.dtByWeek[exp.latestWeek] * 0.998);
/* the week's operating variance in its two halves (they add to it), and the four weeks to the latest whole one */
exp.speed = r2(LW.op * 0.92); exp.manning = r2(LW.op - exp.speed);
exp.op4 = r2(ends.slice(-5, -1).reduce((t, e) => t + exp.weeks[e].op, 0));

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const col = n => { let s = ''; for (n += 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s; return s; };
const EXCEL0 = Date.UTC(1899, 11, 30);
const cell = (r, c, v, date) => v && v.f ? `<c r="${col(c)}${r}"><f>${esc(v.f)}</f><v>${v.val}</v></c>` : v && v.err ? `<c r="${col(c)}${r}" t="e"><v>${esc(v.err)}</v></c>` : typeof v === 'number'
  ? `<c r="${col(c)}${r}"${date ? ' s="1"' : ''}><v>${date ? (v - EXCEL0) / DAY : v}</v></c>`
  : `<c r="${col(c)}${r}" t="inlineStr"><is><t>${esc(v)}</t></is></c>`;
const sheet = list => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${list.map((row, i) => `<row r="${i + 1}">${row.map((v, c) => (v === null || v === undefined ? '' : cell(i + 1, c, v.err || v.f ? v : v.v ?? v, v.date))).join('')}</row>`).join('')}</sheetData></worksheet>`;

const N = prod.length + 1;
const s1 = [['Date', 'Shift', 'Line', 'Product', 'Rework flag', 'Runs', 'Packs', 'Run hours', 'Actual hours', 'Earned hours', 'Op var £'], ...prod];
const s2 = [['Week ending', 'Line', 'Reason', 'Minutes', 'Cost £', 'Week'], ...down];
/* the calendar: the weeks of the data and a few still to come */
const cal = [];
for (let e = Date.parse(ends[0]); e <= Date.parse(ends[ends.length - 1]) + 4 * 7 * DAY; e += 7 * DAY) cal.push([weekName(e), { v: e - 6 * DAY, date: true }, { v: e, date: true }]);
exp.weekNames = cal.length;
const s3 = [['Week', 'Starts', 'Ends'], ...cal];
/* the report: every figure a SUMIFS over the production rows, by the window picked (a cell), by line (a word) — and with the flag held to 0 */
const P = c => `Production!$${c}$2:$${c}$${N}`;
const sumifs = (c, line, val) => ({ f: `SUMIFS(${P(c)},${P('A')},">="&Report!$B$2,${P('A')},"<="&Report!$B$3,${P('C')},"${line}",${P('E')},0)`, val });
const s4 = [['WEEKLY REPORT'], ['From', { v: Date.parse(exp.latestWeek) - 6 * DAY, date: true }], ['To', { v: Date.parse(exp.latestWeek), date: true }], [],
  ['Line', 'Packs', 'Op var £', 'Actual hours', 'Earned hours', 'Runs booked'],
  ...Object.keys(LINES).map((l, i) => [l, sumifs('G', l, 90000 + i), sumifs('K', l, -400 - i), sumifs('I', l, 500 + i), sumifs('J', l, 480 + i), { f: `COUNTIFS(${P('C')},"${l}")`, val: 200 + i }]),
  ['All lines', { f: `SUMIFS(${P('G')},${P('A')},">="&Report!$B$2,${P('A')},"<="&Report!$B$3,${P('E')},0)`, val: LW.packs }, { f: `SUMIFS(${P('K')},${P('A')},">="&Report!$B$2,${P('A')},"<="&Report!$B$3,${P('E')},0)`, val: LW.op }]];
/* the trend: the weeks so far, then rows kept ready that show #N/A until their week comes — on purpose */
const NA = { err: '#N/A' };
const s5 = [['Week', 'Packs', 'Op var £'], ...ends.slice(-3).map(e => [exp.weeks[e].name, exp.weeks[e].packs, exp.weeks[e].op]), ...Array.from({ length: 10 }, () => [NA, NA, NA])];
const fmt = n => n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = n => `${n < 0 ? '-' : ''}£${fmt(Math.abs(n))}`;
const s6 = [['HEALTH — is the data fit to use'], ['Read this before the report.'], ['HOW FRESH'],
  ['Last production entry', `${WD[new Date(TO).getUTCDay()]} ${dmy(TO)}`],
  ['Production data status', 'STALE - chase the entries'],
  ['Last downtime week entered', `${WD[new Date(Date.parse(exp.partWeek)).getUTCDay()]} ${dmy(Date.parse(exp.partWeek))}`],
  ['ROW COUNTS'],
  ['Production rows', exp.rows],
  ['Downtime rows', exp.dtRows],
  ['Runs marked re-work', exp.flagRows],
  ['Downtime rows without a reason', exp.dtNoReasonRows],
  ['THE REPORT'],
  ['Report window valid', 'PASS'],
  ['THIS WEEK'],
  [`Week to ${dmy(Date.parse(exp.latestWeek))}, all shifts`, `Efficiency ${exp.efficiency.toFixed(2)}% · £ against plan ${money(exp.toStandard)} · Packs ${LW.packs.toLocaleString('en-GB')}`],
  ['Where the loss is', `Rate ${money(exp.speed)} · Crewing ${money(exp.manning)} · Indirect ${money(-1840.37)}`],
  ['Since the start / Last 4 weeks / This week', `${money(exp.opBasis)} · ${money(exp.op4)} · ${money(LW.op)} (all re-worked by hand)`],
  ['Capacity used (production / downtime)', '0.0% / 0.0%'],
  ['Downtime cost this week', money(exp.healthDowntime)],
  ['ON PURPOSE'],
  ['Trend rows still to come show #N/A', 'Intentional - they keep the chart from drawing zeros']];

const NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const names = ['Production', 'Downtime', 'Setup', 'Report', 'Trend', 'Health'];
const files = {
  '[Content_Types].xml': `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
  '_rels/.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
  'xl/workbook.xml': `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${NS}"><sheets>${names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
  'xl/_rels/workbook.xml.rels': `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId9" Type="${NS}/styles" Target="styles.xml"/></Relationships>`,
  'xl/styles.xml': '<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><cellXfs count="2"><xf numFmtId="0"/><xf numFmtId="164" applyNumberFormat="1"/></cellXfs></styleSheet>',
  ...Object.fromEntries([s1, s2, s3, s4, s5, s6].map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, sheet(s)])),
};
writeFileSync(out, zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)]))));
writeFileSync(`${out}.expected.json`, JSON.stringify(exp, null, 1));
console.log(`${out}: ${exp.rows} rows · ${exp.flagRows} flagged · Op var ${exp.opBasis} on the reports' basis, ${exp.opAll} on every row · latest whole week ${exp.latestWeek} (${LW.name})`);
