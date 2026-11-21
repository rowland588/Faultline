/* LUNA'S FILES AND LINKS BELONG TO THE CUSTOMER IN HAND (21 November 2026, docs/CONNECTED-LUNA.md — Rowland: "links and data for Luna
 * also need to be included in the current customer … Branston currently live. But if I archive it then Luna will not pull information
 * from that, because the customer is archived … if the customer is restarted then it pulls all information").
 *
 * Driven in a real browser on the smoke seed (every line Branston). Luna's cloud (the `link` function) is played by this script with
 * real generated workbooks; every request to her AI gateway is counted — none may be made. What Luna can reach is asked of her own
 * capabilities (the code the AI is given), of what she is told each turn (conversationFocus), and of the list beside her.
 *
 *   1  Branston live, a link connected with NO place chosen: the file is Branston's all the same; Luna lists it, finds it by name, reads
 *      what it holds, is told of it each turn; Files Luna can read lists it;
 *   2  Branston ARCHIVED: not listed beside her; her list has none; found by no name; asked for by its id it is refused in words naming
 *      Branston as archived — and its workbook the same; she is not told of it; the file's record is in the database exactly as it was;
 *   3  Branston CONTINUED: all of it back, nothing having changed;
 *   4  a second customer, Cobb Foods: a link connected under it is Cobb's; with Cobb in hand Luna has Cobb's file and not Branston's
 *      (asked for by its id: refused, naming Branston and the way to it); with Branston in hand the other way round; all clients shown —
 *      both, each naming whose it is;
 *   4b A FILE ALWAYS HAS A CUSTOMER: with all clients shown and no place chosen it cannot be known, so it is asked — Which customer is
 *      this for? — a row a customer; shut without an answer, nothing is connected; answered, the file is that customer's and the top
 *      bar is left as it was;
 *   5  Branston archived with all clients shown: Cobb's only;
 *   6  the same link connected again with Cobb in hand is a file of Cobb's own; Branston's copy stays Branston's, put away with it and
 *      back when it is continued. */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';
import { openLunaContext, openLunaFolds } from '../lib/lunaContext.mjs';

const dir = mkdtempSync(join(tmpdir(), 'cfl-'));
const gen = (script, out, ...flags) => { execFileSync('node', [`scripts/workbook/${script}`, out, ...flags], { stdio: 'ignore' }); return readFileSync(out); };
const BRANSTON_BOOK = gen('make-marked-workbook.mjs', join(dir, 'b.xlsx'));
const COBB_BOOK = gen('make-demo-workbook.mjs', join(dir, 'c.xlsx'));
const BRANSTON_LINK = 'https://1drv.ms/x/c/abc123def/EaBranstonShiftReport?e=Xy12Zz';
const COBB_LINK = 'https://1drv.ms/x/c/abc123def/EaCobbPlanAndActual?e=Qq34Rr';
const THIRD_LINK = 'https://1drv.ms/x/c/abc123def/EaCobbWasteLog?e=Tt56Uu';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
/* every line Branston's, as a consultant's one customer (the way customers.mjs names it) */
await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  for (const w of await liveProductionLines(await db.listWorkspaces())) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln' });
});
await page.reload(); await page.waitForTimeout(1500);
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-expose-headers': 'x-link-name, x-link-kind, x-link-service, x-link-host, x-link-etag, x-link-modified, x-link-size' };
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task === 'budget') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not here' }) });
  asks.push(body);
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Asked of Luna.' }) });
});
await page.route('**/functions/v1/link', async r => {
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
  const url = r.request().postDataJSON()?.url ?? '';
  const give = (bytes, name) => r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/octet-stream', 'x-link-name': encodeURIComponent(name), 'x-link-kind': 'zip', 'x-link-service': 'onedrive', 'x-link-host': 'onedrive.live.com' }, body: bytes });
  if (url === BRANSTON_LINK) return give(BRANSTON_BOOK, 'Branston shift report.xlsx');
  if (url === COBB_LINK) return give(COBB_BOOK, 'Cobb plan and actual.xlsx');
  if (url === THIRD_LINK) return give(gen('make-demo-workbook.mjs', join(dir, 'w.xlsx'), '7'), 'Cobb waste log.xlsx');
  return r.fulfill({ status: 422, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, code: 'gone', why: 'The link no longer points at a file.' }) });
});

/* ---- what is asked ---- */
const codeTurns = () => page.locator('.ai-turn.is-colleague [data-ai-code]').count();
const connect = async link => {
  await t.go('#/ai', 3000);
  const before = await codeTurns();
  await page.locator('.ai-plus').click(); await page.locator('[data-connect-open]').click(); await page.locator('[data-connect-to="link"]').click();
  await page.locator('[data-link-url]').fill(link); await page.locator('[data-link-read]').click();
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > k, before, { timeout: 60000 }).catch(() => undefined);
  await page.waitForTimeout(1000);
};
/** The file's record, as the database holds it. */
const record = name => page.evaluate(async n => { const s = (await (await import('/src/db.ts')).listAllStudies()).find(x => x.tool === 'source' && x.facts?.source?.fileName === n); return s ? { id: s.id, name: s.facts.source.name, client: s.facts.source.client ?? '', fileId: s.facts.source.fileId, lineId: s.workspaceId ?? '', facts: JSON.stringify(s.facts), deletedAt: s.deletedAt ?? null } : null; }, name);
/** Luna's own capabilities, run as the code runs them for her. */
const cap = (name, input, cid) => page.evaluate(async ([n, i, c]) => { const r = await (await import('/src/capabilities/registry.ts')).runCall({ now: Date.now(), level: 'owner', ...(c ? { conversationId: c } : {}) }, { id: 'x', name: n, input: i }, { confirmed: false }); return { ok: !!r.ok, says: r.says ?? '', why: r.why ?? '', data: r.data ?? null }; }, [name, input, cid ?? '']);
/** What Luna is told each turn. */
const told = cid => page.evaluate(async c => (await import('/src/colleague/turnRules.ts')).conversationFocus(c), cid);
const cidNow = () => page.evaluate(async () => { const all = (await (await import('/src/db.ts')).listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague && !x.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt); return all[0]?.id ?? ''; });
/** The files listed beside her, each with whose and where it came from. */
const listed = async () => {
  await t.go('#/ai', 2500);
  await openLunaContext(page); await openLunaFolds(page, ['luna-files']);
  return page.locator('[data-luna-file]').evaluateAll(es => es.map(e => `${e.getAttribute('data-luna-file')} | ${e.querySelector('[data-luna-file-where]')?.textContent?.replace(/\s+/g, ' ').replace(/ · read .*/, '') ?? ''}`));
};
const customers = fn => page.evaluate(async ([f, a]) => { const c = await import('/src/lib/customers.ts'); const r = await c[f](...a); return { ok: !!r.ok, why: r.why ?? '' }; }, fn);
const choose = client => page.evaluate(async c => { (await import('/src/lib/activeClient.ts')).setActiveClient(c); }, client);
/** Everything Luna can reach of a file, in one reading. */
const reach = async (rec, words, cid) => {
  const list = await cap('list_sources', {});
  const found = await cap('resolve_source', { words });
  const fields = await cap('source_fields', { source: rec.id });
  const book = await cap('workbook_profile', { workbookId: rec.fileId }, cid);
  const focus = await told(cid);
  return { listed: (list.data?.files ?? []).some(f => f.id === rec.id), found: found.data?.match === 'one' && found.data.id === rec.id, fields, book, told: focus.includes(rec.name) };
};

/* ---- 1 · Branston live ---- */
await connect(BRANSTON_LINK);
const b = await record('Branston shift report.xlsx');
ok(b.id && b.client === 'Branston' && !b.lineId, `1 connected with no place chosen, the file is Branston’s all the same (customer “${b.client}”, on no line)`);
const cidB = await cidNow();
let r = await reach(b, 'Branston shift report', cidB);
ok(r.listed && r.found && r.fields.ok && r.book.ok && r.told, `1 Branston live — Luna lists it, finds it by name, reads what it holds (“${r.fields.says.slice(0, 70)}…”), and is told of it each turn`);
let rows = await listed();
ok(rows.length === 1 && rows[0] === `${b.name} | From a link · OneDrive link · 1drv.ms`, `1 Files Luna can read lists it: ${rows.join(' ; ')}`);

/* ---- 2 · Branston archived ---- */
const kept = b.facts;
ok((await customers(['archiveCustomer', ['Branston']])).ok, '2 Branston archived');
rows = await listed();
ok(rows.length === 0, `2 archived — not listed beside her (${rows.length})`);
r = await reach(b, 'Branston shift report', cidB);
ok(!r.listed && !r.found, '2 archived — her list has none, and it is found by no name');
ok(!r.fields.ok && /belongs to Branston, which is archived — nothing is read from an archived customer/.test(r.fields.why) && /continue Branston/.test(r.fields.why), `2 asked for by its id, refused in words: “${r.fields.why}”`);
ok(!r.book.ok && /which is archived/.test(r.book.why), `2 its workbook the same — not a cell read: “${r.book.why.slice(0, 90)}…”`);
ok(!r.told, '2 she is not told of it');
const after = await record('Branston shift report.xlsx');
ok(after && after.facts === kept && after.deletedAt === null, '2 the file’s record is in the database exactly as it was — nothing deleted, nothing rewritten');

/* ---- 3 · Branston continued ---- */
ok((await customers(['continueCustomer', ['Branston']])).ok, '3 Branston continued');
r = await reach(b, 'Branston shift report', cidB);
ok(r.listed && r.found && r.fields.ok && r.book.ok && r.told, '3 continued — listed, found, read and told of again');
rows = await listed();
ok(rows.length === 1 && rows[0].startsWith(`${b.name} |`) && (await record('Branston shift report.xlsx')).facts === kept, '3 back beside her, its record unchanged through it all');

/* ---- 4 · a second customer ---- */
ok((await customers(['addCustomer', ['Cobb Foods', 'York']])).ok, '4 Cobb Foods added');
await choose('Cobb Foods');
await connect(COBB_LINK);
const c = await record('Cobb plan and actual.xlsx');
const cidC = await cidNow();
ok(c.id && c.client === 'Cobb Foods', `4 a link connected with Cobb Foods in hand is Cobb’s (customer “${c.client}”)`);
rows = await listed();
ok(rows.length === 1 && rows[0].startsWith(`${c.name} |`), `4 Cobb in hand — beside her, Cobb’s file and not Branston’s: ${rows.join(' ; ')}`);
let rc = await reach(c, 'Cobb plan and actual', cidC), rb = await reach(b, 'Branston shift report', cidC);
ok(rc.listed && rc.found && rc.fields.ok && rc.told && !rb.listed && !rb.found && !rb.told, '4 Cobb in hand — Luna has Cobb’s file, and neither lists, finds nor is told of Branston’s');
ok(!rb.fields.ok && /belongs to Branston, not the customer in hand — switch to Branston/.test(rb.fields.why), `4 Branston’s asked for by its id: “${rb.fields.why}”`);
await choose('Branston');
rows = await listed();
rb = await reach(b, 'Branston shift report', cidB); rc = await reach(c, 'Cobb plan and actual', cidB);
ok(rows.length === 1 && rows[0].startsWith(`${b.name} |`) && rb.listed && rb.fields.ok && !rc.listed && !rc.fields.ok, '4 Branston in hand — the other way round');
await choose('');
rows = await listed();
ok(rows.length === 2 && rows.includes(`${b.name} | Branston · From a link · OneDrive link · 1drv.ms`) && rows.includes(`${c.name} | Cobb Foods · From a link · OneDrive link · 1drv.ms`), `4 all clients shown — both, each naming whose it is: ${rows.join(' ; ')}`);
const both = await cap('list_sources', {});
ok((both.data?.files ?? []).length === 2, `4 …and Luna’s list has both (${(both.data?.files ?? []).length})`);

/* ---- 4b · all clients shown, no place chosen: asked whose ---- */
const pasteAndConnect = async link => {
  await t.go('#/ai', 3000);
  await page.locator('.ai-plus').click(); await page.locator('[data-connect-open]').click(); await page.locator('[data-connect-to="link"]').click();
  await page.locator('[data-link-url]').fill(link); await page.locator('[data-link-read]').click();
  await page.locator('[data-whose-sheet]').waitFor({ timeout: 30000 });
};
await pasteAndConnect(THIRD_LINK);
const offered = await page.locator('[data-whose]').evaluateAll(es => es.map(e => e.getAttribute('data-whose')));
ok(/^Which customer is this for\?$/.test(await t.words('[data-whose-sheet] .cn-q')) && offered.join(' | ') === 'Branston | Cobb Foods', `4b all clients shown and no place chosen — asked “${await t.words('[data-whose-sheet] .cn-q')}”: ${offered.join(' · ')}`);
await page.keyboard.press('Escape'); await page.waitForTimeout(900);
ok((await record('Cobb waste log.xlsx')) === null && /Nothing was connected — a file is connected to a customer/.test(await t.words('[data-imported]')), `4b shut without an answer — nothing connected, and said: “${await t.words('[data-imported]')}”`);
await pasteAndConnect(THIRD_LINK);
const before4b = await codeTurns();
await page.locator('[data-whose="Cobb Foods"]').click();
await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > k, before4b, { timeout: 60000 }).catch(() => undefined);
await page.waitForTimeout(1000);
const w = await record('Cobb waste log.xlsx');
const stillAll = await page.evaluate(async () => (await import('/src/lib/activeClient.ts')).storedClient());
ok(w?.client === 'Cobb Foods' && stillAll === '', `4b answered Cobb Foods — the file is Cobb’s (customer “${w?.client}”), the top bar left on all clients`);

/* ---- 5 · Branston archived, all clients shown ---- */
ok((await customers(['archiveCustomer', ['Branston']])).ok, '5 Branston archived again');
rows = await listed();
const only = await cap('list_sources', {});
rb = await reach(b, 'Branston shift report', cidC);
/* with Branston archived one customer is in use, so the rows need not say whose — they are all Cobb's */
ok(rows.length === 2 && rows.some(x => x.startsWith(`${c.name} |`)) && rows.some(x => x.startsWith(`${w.name} |`)) && (only.data?.files ?? []).length === 2 && only.data.files.every(f => f.id === c.id || f.id === w.id) && !rb.fields.ok && /which is archived/.test(rb.fields.why), '5 Branston archived — Cobb’s two only, beside her and in her list; Branston’s refused as archived');

/* ---- 6 · the same link connected again under Cobb ---- */
await choose('Cobb Foods');
await connect(BRANSTON_LINK);
const copies = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(x => x.tool === 'source' && x.facts?.source?.fileName === 'Branston shift report.xlsx' && !x.deletedAt).map(x => ({ id: x.id, name: x.facts.source.name, client: x.facts.source.client ?? '', fileId: x.facts.source.fileId })));
const cobbs = copies.find(x => x.id !== b.id);
const still = copies.find(x => x.id === b.id);
const rCobbs = cobbs ? await reach(cobbs, 'Branston shift report', await cidNow()) : null;
ok(copies.length === 2 && cobbs?.client === 'Cobb Foods' && still?.client === 'Branston' && rCobbs?.listed && rCobbs.fields.ok, `6 the same link connected with Cobb in hand is a file of Cobb’s own, usable — Branston’s copy stays Branston’s (${copies.map(x => x.client).join(' · ')})`);
const rStill = await cap('source_fields', { source: b.id });
ok(!rStill.ok && /belongs to Branston, which is archived/.test(rStill.why), '6 …and Branston’s is still put away with Branston');
ok((await customers(['continueCustomer', ['Branston']])).ok, '6 Branston continued once more');
await choose('');
rows = await listed();
ok(rows.length === 4 && rows.filter(x => x.includes('| Branston · ')).length === 1 && rows.filter(x => x.includes('| Cobb Foods · ')).length === 3, `6 all clients shown, Branston back: its one file and Cobb’s three, each naming whose it is (${rows.length})`);

ok(asks.length === 0, `no request to the AI gateway in any of it (${asks.length})`);
await t.finish('Accepted: Luna’s files and links belong to the customer in hand — archived, she pulls nothing from them; continued, all of it is back');
