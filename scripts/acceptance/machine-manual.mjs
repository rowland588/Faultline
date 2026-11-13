/* ACCEPTANCE — A MACHINE'S MANUAL AND THE PM LIST FROM IT (13 November, docs/ASSET-DOCUMENTS.md D3; src/lib/manual, src/capabilities/manuals).
 * Rowland: "the oem manual is pdf. Luna reads the pdf and user ask luna to create a pm list based on the oem information"; "If there's a
 * possibility to do it through code … so it doesn't involve heavy AI costs." A made-up OEM manual (every name and figure invented) is
 * written as a real PDF by this script, with its own list of what it stipulates, and driven in a real browser, the gateway played by
 * the script and every request to it counted:
 *
 *   1  ATTACHED — the PDF through Luna's own attach control: the sheet offers "A machine's manual…", the line in hand, the machine,
 *      what it is; Keep it on the machine — read page by page in the app, NO request sent; what it says equals lib/manual's own reading
 *   2  ASKED — "what speed is it rated for": find_in_document answers with the passage and its page
 *   3  THE PM LIST — draft_pm_list: every task the manual states with an interval, each with the manual's words and page; a task Luna
 *      adds whose words are on the page stands, one that is not in the manual is dropped and said
 *   4  MADE — make_pm_list a card, nothing made until Do it; then a Planned maintenance log on the line for the machine, a check a task,
 *      its interval the manual's, its criterion quoting the manual with the page; no hours invented
 *   5  WHERE IT SHOWS — the machine's page lists the manual with what was read; the log opens on its own page
 *   6  the gateway was never sent the PDF or its pages wholesale; a non-PDF is not offered as a manual; the phone
 *
 *   node scripts/acceptance/machine-manual.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { jsPDF } from 'jspdf';

/* ---- the made-up manual, and what it stipulates (the script's own list — independent of the module) ---- */
const PAGES = [
  ['Northfield Packaging Machinery', 'VFB-240 Vertical Form Fill Seal Bagger', 'Operating and Maintenance Manual', 'Document NPM-VFB240-OM-03'],
  ['2 Technical data', 'Rated speed: up to 85 bags per minute, depending on product and film.', 'Bag width 80 to 240 mm. Bag length 100 to 380 mm.', 'Film: laminated polyethylene, maximum reel diameter 450 mm.', 'Compressed air: 6 bar. Do not exceed 8 bar.', 'Sealing jaw temperature: maximum 190 °C.'],
  ['7 Maintenance', 'Carry out the work below at the intervals given. Isolate the machine first.', '', 'Daily', 'Clean the sealing jaws with the brass brush.', 'Check the film path for debris.', '', 'Weekly', 'Inspect the pull belts for wear and glazing.', 'Check the knife for nicks.'],
  ['7 Maintenance (continued)', 'Lubricate the jaw carriage linear bearings every 500 operating hours.', 'Replace the PTFE tape on the sealing jaws every 2 weeks.', 'Inspect the vacuum pump filter monthly.', 'Replace the pull belts annually.', 'Contact Northfield service if the jaws do not close squarely.'],
];
const WANT = [
  ['Clean the sealing jaws with the brass brush', 1, 'day', 3], ['Check the film path for debris', 1, 'day', 3],
  ['Inspect the pull belts for wear and glazing', 1, 'week', 3], ['Check the knife for nicks', 1, 'week', 3],
  ['Lubricate the jaw carriage linear bearings', 500, 'hour', 4], ['Replace the PTFE tape on the sealing jaws', 2, 'week', 4],
  ['Inspect the vacuum pump filter', 30, 'day', 4], ['Replace the pull belts', 365, 'day', 4],
];
const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
PAGES.forEach((lines, i) => { if (i) pdf.addPage(); pdf.setFontSize(11); lines.forEach((l, k) => { if (l) pdf.text(l, 56, 72 + k * 22); }); });
const BYTES = Buffer.from(pdf.output('arraybuffer'));
const FILE = { name: 'VFB-240 operating manual.pdf', mimeType: 'application/pdf', buffer: BYTES };

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const LINE = 'Line 4 — bagging';
const line = await page.evaluate(async n => { const L = await import('/src/lib/lines.ts'); const w = await L.addLineToFactory(n); await L.machineOntoLine(w.id, 'Bagger'); await L.machineOntoLine(w.id, 'Checkweigher'); return w.id; }, LINE);
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON(); asks.push(body);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: false, why: 'nothing planned' }) });
});
const answered = async n => { await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: 12000 }).catch(() => undefined); await page.waitForTimeout(500); };
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
let turns = 0;
const round = async (words, rounds, card) => {
  plan = rounds; await send(words);
  if (card) {
    await page.waitForSelector(`[data-card="${card}"][data-card-status="waiting"]`, { timeout: 10000 }).catch(() => undefined);
    await card.before?.();
  }
  return async () => { turns += 1; await answered(turns); };
};
const result = id => asks.flatMap(a => a?.pending?.results ?? []).filter(r => r.id === id).at(-1);
const calls = (...cs) => () => ({ ok: true, reply: '', calls: cs.map(([id, name, input]) => ({ id, name, input })), assistant: { v: 1 } });
const then = words => () => ({ ok: true, reply: words });
const docsOf = () => page.evaluate(async l => (await (await import('/src/lib/manual/store.ts')).listMachineDocs({ lineId: l })).map(d => ({ id: d.id, name: d.name, machine: d.machine, kind: d.docKind, pages: d.pageCount, blank: d.blank })), line);
const logsOf = () => page.evaluate(async l => (await (await import('/src/db.ts')).listAllStudies()).filter(s => !s.deletedAt && s.workspaceId === l && s.agreed?.log).map(s => ({ id: s.id, name: s.name, machine: s.machine, kind: s.agreed.log.kind ?? s.agreed.log.def ?? null, checks: s.agreed.log.checks })), line);

await t.go(`#/ai?line=${encodeURIComponent(line)}`, 3000);

/* ---- 1 · ATTACHED ---- */
await page.locator('input[type="file"][aria-label="Choose a factory document"]').setInputFiles(FILE);
await page.waitForSelector('[data-fdoc]', { timeout: 8000 }).catch(() => undefined);
ok(await page.locator('[data-fdoc-what="machine"][aria-checked="true"]').count() === 1, '1 a PDF named a manual is offered as a machine’s manual, already chosen');
ok(await page.locator('[data-fdoc-what="factory"]').count() === 1, '1 a register of lines and machines is still one tap away (a way in added, none taken)');
ok(await page.locator('select[aria-label="Which line"]').inputValue() === line, '1 the line in hand is the line offered');
ok(await page.locator('select[aria-label="What it is"]').inputValue() === 'manual', '1 said to be a manual');
ok(await page.locator('[data-fdoc-keep]').isDisabled(), '1 held until the machine is said');
await page.locator('input[aria-label="Which machine"]').fill('Bagger');
const before = asks.length;
await page.locator('[data-fdoc-keep]').click();
await page.waitForSelector('[data-fdoc-said]', { timeout: 15000 }).catch(() => undefined);
const said = await t.words('[data-fdoc-said]');
const docs = await docsOf();
const doc = docs[0];
ok(docs.length === 1 && doc.machine === 'Bagger' && doc.kind === 'manual' && doc.pages === 4 && doc.blank === 0, `1 kept once, on the Bagger, a manual of 4 pages all read (${JSON.stringify(docs)})`);
const mod = await page.evaluate(async id => { const S = await import('/src/lib/manual/store.ts'); const M = await import('/src/lib/manual/manual.ts'); const d = await S.getMachineDoc(id); return { said: S.docSaid(d), tasks: M.pmTasksOf(d.pages) }; }, doc?.id);
ok(said === mod.said && /4 pages/.test(said), `1 what the sheet says is the module's own sentence: "${said.slice(0, 140)}"`);
ok(asks.length === before, '1 NO request sent to the AI to keep and read it');
await page.getByRole('button', { name: 'Done', exact: true }).click();
await page.waitForTimeout(600);

/* the rules against the script's own list — independent of the module */
const got = mod.tasks.map(x => [x.task, x.every, x.unit, x.page]);
ok(JSON.stringify(got) === JSON.stringify(WANT), `1 the rules read exactly the eight tasks the manual stipulates, each with its interval and page (${got.length} read)`);
ok(!mod.tasks.some(x => /Contact Northfield|Isolate/.test(x.task)), '1 a line with no interval is not made a task');

/* ---- 2 · ASKED ---- */
let done = await round('What speed is the bagger rated for?', [calls(['l1', 'list_documents', { lineId: line, machine: 'Bagger' }], ['f1', 'find_in_document', { documentId: doc.id, topic: 'speed' }]), then('The manual gives up to 85 bags per minute (page 2), depending on product and film.')]);
await done();
const l1 = result('l1'), f1 = result('f1');
ok(l1?.ok && l1.says.includes(`[${doc.id}]`) && /manual, Bagger, 4 pages/.test(l1.says), `2 list_documents names the manual on the Bagger: "${(l1?.says ?? '').slice(0, 100)}"`);
ok(f1?.ok && /p\.2: .*Rated speed: up to 85 bags per minute/.test(f1.says) && /answer only from these, giving the page/.test(f1.says), '2 find_in_document gives the passage with its page, and the rule to answer only from it');
const f2 = await page.evaluate(async id => (await import('/src/capabilities/registry.ts')).runCall({ now: Date.now() }, { id: 'x', name: 'find_in_document', input: { documentId: id, words: 'torque setting' } }, { confirmed: false }), doc.id).catch(e => ({ err: String(e) }));
ok(f2?.ok && /says nothing a search finds/.test(f2.says) && /do not answer from memory/.test(f2.says), `2 what the manual does not say is said so, never answered from memory (${JSON.stringify(f2).slice(0, 90)})`);

/* ---- 3 · THE PM LIST ---- */
const ADD_OK = { task: 'Check the compressed air supply', every: 1, unit: 'day', oem: 'Daily', page: 2, quote: 'Compressed air: 6 bar. Do not exceed 8 bar.' };
const ADD_BAD = { task: 'Replace the gearbox oil', every: 2000, unit: 'hour', oem: 'every 2000 hours', page: 4, quote: 'Replace the gearbox oil every 2000 hours' };
done = await round('Create a PM list from what the OEM stipulates.', [calls(['d1', 'draft_pm_list', { documentId: doc.id, add: [ADD_OK, ADD_BAD] }]), then('Here are the tasks the manual states, each with its interval and page.')]);
await done();
const d1 = result('d1');
ok(d1?.ok && d1.data?.tasks?.length === 9, `3 draft_pm_list: the eight by rule and the one added whose words are on its page (${d1?.data?.tasks?.length})`);
ok(WANT.every(([task]) => d1.says.includes(task)) && /every 500 hours \(the manual: “every 500 operating hours”\), p\.4/.test(d1.says), '3 each task said with its interval in the manual’s own words and its page');
ok(/every 30 days \(the manual: “monthly”\)/.test(d1.says) && /every 365 days \(the manual: “annually”\)/.test(d1.says), '3 monthly and annually said as the days the log holds, the manual’s word beside it');
ok(d1.data.dropped.length === 1 && /Replace the gearbox oil/.test(d1.data.dropped[0]) && /Dropped, not in the manual as said/.test(d1.says), `3 a task that is not in the manual is dropped and said: ${d1.data.dropped[0]}`);
ok((await logsOf()).length === 0, '3 nothing made yet');

/* ---- 4 · MADE ---- */
plan = [calls(['m1', 'make_pm_list', { documentId: doc.id, leaveOut: ['Check the knife for nicks'] }]), then('The PM list is on Line 4 for the Bagger.')];
await send('Yes, make it — leave out the knife check, we do that every shift already.');
await page.waitForSelector('[data-card="make_pm_list"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const card = page.locator('[data-card="make_pm_list"][data-card-status="waiting"]').last();
const cardSays = (await card.innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/Make a Planned maintenance list on Line 4 — bagging for Bagger from “VFB-240 operating manual”: 7 tasks/.test(cardSays), `4 the card says what it will make before it runs: "${cardSays.slice(0, 130)}"`);
ok((await logsOf()).length === 0, '4 nothing made while the card waits');
await card.getByRole('button', { name: 'Do it' }).click();
turns += 1; await answered(turns);
const logs = await logsOf();
const log = logs[0];
ok(logs.length === 1 && log.name === 'Bagger — PM from the manual' && log.machine === 'Bagger', `4 one Planned maintenance list on the line for the Bagger (${logs.map(l => l.name).join(', ')})`);
ok(log?.checks.length === 7 && !log.checks.some(c => /knife/i.test(c.name)), '4 seven checks, the one left out not among them');
const lub = log?.checks.find(c => /Lubricate/.test(c.name));
ok(lub && lub.when.every === 500 && lub.when.unit === 'hour' && lub.where === 'Bagger', '4 the lubrication due every 500 hours, on the Bagger');
ok(lub && lub.criterion === 'Done as the manual says — “Lubricate the jaw carriage linear bearings every 500 operating hours.” (VFB-240 operating manual, p.4; interval: “every 500 operating hours”)', `4 its criterion quotes the manual with the page: ${lub?.criterion}`);
ok(log.checks.every(c => c.stdHours === undefined), '4 no hours invented for any task');
const m1 = result('m1');
ok(m1?.ok && /Hours a task takes are not set — the manual gives none/.test(m1.says) && /counts clock hours/.test(m1.says), '4 Luna is told what is not set and that operating hours are counted as clock hours');

/* ---- 5 · WHERE IT SHOWS ---- */
await t.go(`#/lines/${line}/machine/${encodeURIComponent('Bagger')}`, 2500);
let row = await t.words('[data-machine-docs]');
if (!row) { const href = await page.evaluate(() => [...document.querySelectorAll('a[href*="machine"]')].map(a => a.getAttribute('href'))[0] ?? ''); console.log('   (machine page address tried; links seen:', href, ')'); }
ok(/Its documents 1/.test(row) && /VFB-240 operating manual/.test(row) && /Manual · 4 pages · 8 maintenance tasks with an interval read in it/.test(row), `5 the machine's page lists the manual and what was read in it: "${row.slice(0, 150)}"`);
const href = await page.evaluate(async id => { const s = await (await import('/src/db.ts')).getStudy(id); return (await import('/src/lib/studyLinks.ts')).studyHref(s); }, log.id).catch(() => null);
if (href) {
  await t.go(`#${href}`, 2500);
  const body = t.norm(await page.locator('body').innerText());
  ok(/Bagger - PM from the manual/.test(body) && /Lubricate the jaw carriage linear bearings/.test(body), '5 the list opens on its own Planned maintenance page with its tasks');
} else ok(false, '5 the list’s own page could not be addressed');

/* ---- 6 · WHAT WAS SENT, WHAT IS NOT A MANUAL, THE PHONE ---- */
const sent = JSON.stringify(asks);
ok(!sent.includes('JVBERi0') && !sent.includes('Northfield Packaging Machinery'), '6 the gateway was never sent the PDF, nor its pages wholesale — only the answers to what was asked');
await t.go(`#/ai?line=${encodeURIComponent(line)}`, 2500);
await page.locator('input[type="file"][aria-label="Choose a factory document"]').setInputFiles({ name: 'site notes.txt', mimeType: 'text/plain', buffer: Buffer.from('The packing hall has two lines.') });
await page.waitForSelector('[data-fdoc]', { timeout: 8000 }).catch(() => undefined);
ok(await page.locator('[data-fdoc]').count() === 1 && await page.locator('[data-fdoc-what]').count() === 0 && await page.locator('[data-fdoc-read]').count() === 1, '6 a file that is not a PDF is read as before, not offered as a manual');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);

await page.setViewportSize({ width: 390, height: 800 });
await t.go(`#/ai?line=${encodeURIComponent(line)}`, 2500);
await page.locator('input[type="file"][aria-label="Choose a factory document"]').setInputFiles(FILE);
await page.waitForSelector('[data-fdoc]', { timeout: 8000 }).catch(() => undefined);
const phone = await page.evaluate(() => {
  const el = document.querySelector('[data-fdoc]'); if (!el) return null;
  const w = document.documentElement.clientWidth;
  const off = [...el.querySelectorAll('*')].filter(x => { const r = x.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1); }).length;
  const small = [...el.querySelectorAll('button, select, input')].filter(x => { const r = x.getBoundingClientRect(); return r.height > 0 && r.height < 43.5; }).map(x => `${x.tagName}:${Math.round(x.getBoundingClientRect().height)}`);
  return { off, small };
});
ok(phone && phone.off === 0, `6 the phone: nothing off the side (${phone?.off})`);
ok(phone && phone.small.length === 0, `6 the phone: every press 44 px (${phone?.small.join(', ')})`);

await t.finish('a machine’s manual kept and read in code, asked of, and its PM list made from the maker’s own words');
