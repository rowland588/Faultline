/* ACCEPTANCE — LUNA KEEPS UP BY HERSELF (21 November 2026, docs/LUNA-AGENT.md G2; colleague/keepUp, colleague/KeepUpNews — Rowland: "the
 * path for the app is … Luna linked to data … Luna knows everything … a live humanistic person like Iron Man's Jarvis", and "fully
 * agentic … understand and build").
 *
 * A file Luna is linked to was checked for a newer version only when the person pressed Check for a newer version. Now she looks by
 * herself when she is opened, and says the ones that have changed. Luna's cloud (the `link` function) is PLAYED by this script and its
 * requests counted; every request to the AI gateway is counted too — none may be made. The workbooks are real ones, written by the
 * generator with its own totals; the hours are moved by the script (the records' own times and this device's note of each check).
 *
 *   1  a workbook read by its link, as before. Opened again straight away, Luna asks for nothing — it was looked at just now
 *   2  hours later, opened again: she asks for the link again BY HERSELF, once; the file is the same, so she says nothing; opened once
 *      more, she does not ask again — it was looked at just now
 *   3  hours later the file has changed behind the link: opened, she READS IT HERSELF (G2b — colleague/readQuietly) and says so without
 *      being asked — A file I read has changed, its name, I have read the new version, WHAT changed in the look's own words (the rows
 *      more by the generator's count), Show me and OK. Both versions are in the register under the one name, nothing was put into the
 *      conversation, and what she is told of the file with every question is now the NEW version's headline (the generator's total)
 *      with what changed under it — dated, and marked as not yet shown to the person while her note is up — the version before listed
 *      as an earlier reading (read as production builds her context: colleague/turnRules conversationFocus)
 *   4  Show me: what changed written into the conversation as her turn, worked in code — that it changed, what changed, what it says
 *      now; the note gone and still gone after a reload; once shown, what she is told no longer says the person has not seen it; no
 *      request to the AI gateway, nothing fetched again
 *   5  the note is KEPT until it is acknowledged: changed again and read, the page reloaded — her note is still there; OK puts it away,
 *      nothing written into the conversation. LEFT OPEN for hours and then looked at again (the app comes back into view): she looks
 *      without the page being opened, reads, and says what changed
 *   6  ONLY THE CUSTOMER IN HAND: with another customer in hand the file is not asked for and its note is not shown; with its customer
 *      archived it is not asked for; continued and in hand again, it is — and the note is shown again
 *   7  A FILE SHE CANNOT READ BY HERSELF (changed to one bigger than she fetches and reads unasked) is still offered: Read it and
 *      Later, nothing read until the press
 *   7b FILES, NEVER READINGS (22 November, the review): thirteen and more readings of the one link and one other file of the customer
 *      — she is told two files (the report with the one reading before it, and the other file), list_sources says 2 files with the
 *      earlier readings counted in a clause, and the Files list beside her shows a row a file with its earlier versions counted on it
 *   8  the phone: her note inside the screen, its presses 44 px, nothing off the side
 *
 *   node scripts/acceptance/keep-up.mjs   (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';
import { openLunaContext, openLunaFolds } from '../lib/lunaContext.mjs';

const dir = mkdtempSync(join(tmpdir(), 'kup-'));
const gen = (out, ...flags) => { execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', out, ...flags], { stdio: 'ignore' }); return readFileSync(out); };
const V1 = gen(join(dir, 'v1.xlsx'));
const V2 = gen(join(dir, 'v2.xlsx'), '--later');
const E1 = JSON.parse(readFileSync(join(dir, 'v1.xlsx.expected.json'), 'utf8')), E2 = JSON.parse(readFileSync(join(dir, 'v2.xlsx.expected.json'), 'utf8'));
const pounds = v => `−£${Math.abs(Math.round(v)).toLocaleString('en-GB')}`;   /* as the first look writes a figure in pounds */
const LINK = 'https://1drv.ms/x/c/abc123def/EaBcDeFgHiJ?e=Xy12Zz';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
/* every line Branston's — so the file read here is Branston's (a file belongs to a customer) */
await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  for (const w of await liveProductionLines(await db.listWorkspaces())) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln' });
});
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-expose-headers': 'x-link-name, x-link-kind, x-link-service, x-link-host, x-link-etag, x-link-modified, x-link-size' };
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task === 'budget') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not here' }) });
  asks.push(body);
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Asked of Luna.' }) });
});
const fetched = [];
let behind = V1;
await page.route('**/functions/v1/link', async r => {
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
  const url = r.request().postDataJSON()?.url ?? '';
  fetched.push(url);
  return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/octet-stream', 'x-link-name': encodeURIComponent('Shift report September.xlsx'), 'x-link-kind': 'zip', 'x-link-service': 'onedrive', 'x-link-host': 'my.microsoftpersonalcontent.com' }, body: behind });
});

const codeTurns = () => page.locator('.ai-turn.is-colleague [data-ai-code]').count();
const afterLook = async before => { await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > k, before, { timeout: 60000 }).catch(() => undefined); await page.waitForTimeout(800); };
const lastLook = async () => (await page.locator('.ai-turn.is-colleague').last().innerText()).replace(/\s+/g, ' ');
/* THE HOURS MOVED: every linked record's own times, and this device's note of each check, put back by `h` hours */
const hoursPass = h => page.evaluate(async h => {
  const d = await import('/src/db.ts');
  const ms = h * 3600_000;
  for (const s of (await d.listAllStudies()).filter(x => x.tool === 'source' && !x.deletedAt && x.facts?.source?.origin)) {
    await d.patchStudy(s.id, cur => { const f = cur.facts.source; return { facts: { ...cur.facts, source: { ...f, at: f.at - ms, origin: { ...f.origin, ...(typeof f.origin.checkedAt === 'number' ? { checkedAt: f.origin.checkedAt - ms } : {}) } } } }; });
  }
  const st = JSON.parse(localStorage.getItem('faultline.keepup') ?? '{}');
  for (const k of Object.keys(st)) st[k] -= ms;
  localStorage.setItem('faultline.keepup', JSON.stringify(st));
}, h);
/* Luna opened — from another page, as a person opens her — and given the time she takes to look (she starts a moment after the page
   has drawn) */
const openLuna = async (expectFetches) => {
  await t.go('#/today', 1200);
  await t.go('#/ai', 2500);
  for (const until = Date.now() + 12000; fetched.length < expectFetches && Date.now() < until;) await page.waitForTimeout(200);
  await page.waitForTimeout(2500);
};
const note = () => page.locator('[data-keepup]');
const sources = () => page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(x => x.tool === 'source' && !x.deletedAt && x.facts?.source?.origin?.kind === 'link').map(x => ({ name: x.facts.source.name, hash: x.facts.source.origin.hash.slice(0, 10), at: x.facts.source.at })).sort((a, b) => a.at - b.at));

/** What Luna is told each turn, as production builds it (colleague/turnRules conversationFocus) — and the files block of it. */
const cidNow = () => page.evaluate(async () => { const all = (await (await import('/src/db.ts')).listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague && !x.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt); return all[0]?.id ?? ''; });
const toldNow = async () => { const f = await page.evaluate(async c => (await import('/src/colleague/turnRules.ts')).conversationFocus(c), await cidNow()); const i = f.indexOf('Files in the register'); return { all: f, files: i < 0 ? '' : f.slice(i) }; };
const fileLines = block => block.split('\n').filter(l => /^ {2}“/.test(l));

/* ---- 1 · read by its link; opened again straight away, nothing asked ---- */
await t.go('#/ai', 3000);
await page.locator('.ai-plus').click(); await page.locator('[data-connect-open]').click(); await page.locator('[data-connect-to="link"]').click(); await page.locator('[data-link-sheet]').waitFor({ timeout: 10000 });
await page.locator('[data-link-url]').fill(LINK);
const b1 = await codeTurns();
await page.locator('[data-link-read]').click();
await afterLook(b1);
ok(fetched.length === 1 && (await codeTurns()) > b1 && /Shift report September\.xlsx/.test(await lastLook()), '1 a workbook read by its link — the first look in code, as before');
const NAME = (await sources())[0]?.name ?? '';
await openLuna(1);
ok(fetched.length === 1 && (await note().count()) === 0, `1 opened again straight away: Luna asks for nothing — it was looked at just now (${fetched.length} request)`);

/* ---- 2 · hours later: she looks by herself; nothing changed, nothing said ---- */
await hoursPass(5);
await openLuna(2);
ok(fetched.length === 2 && fetched[1] === LINK, `2 five hours later, opened: she asks for the link again by herself (${fetched.length} requests, nobody pressed anything)`);
ok((await note().count()) === 0, '2 the file is the same — she says nothing');
const stamped = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('faultline.keepup') ?? '{}')));
ok(stamped.length === 1 && stamped[0] === `link:${LINK}`, '2 the look is noted on this device');
await openLuna(2);
ok(fetched.length === 2, '2 opened once more: she does not ask again — it was looked at just now');

/* ---- 3 · the file changes behind the link: she reads it herself, and says what changed ---- */
behind = V2;
await hoursPass(5);
const code3 = await codeTurns();
await openLuna(3);
await note().waitFor({ timeout: 30000 }).catch(() => undefined);
ok(fetched.length === 3 && (await note().count()) === 1, `3 five hours later the file has changed: opened, Luna says so without being asked (${fetched.length} requests)`);
const head = (await page.locator('[data-keepup] .ai-news-h').innerText()).trim();
const row = page.locator('[data-keepup] [data-keepup-told]').first();
const said = (await row.locator('.ai-news-w').innerText()).replace(/\s+/g, ' ').trim();
ok(head === 'A file I read has changed' && (await row.getAttribute('data-keepup-told')) === NAME && said.startsWith(`${NAME} I have read the new version`), `3 her note: “${head}” — ${said.slice(0, 90)}…`);
const changed = (await row.locator('[data-keepup-changed]').innerText()).replace(/\s+/g, ' ').trim();
const more = (E2.rows - E1.rows).toLocaleString('en-GB');
ok(changed.startsWith('Since “Shift report September.xlsx”, read on ') && changed.includes(`${more} rows more on “Shift report” (${E1.rows.toLocaleString('en-GB')} then, ${E2.rows.toLocaleString('en-GB')} now)`), `3 …and WHAT changed, in the look’s own words, the rows by the generator’s count: “${changed.slice(0, 150)}…”`);
const presses = await page.locator('[data-keepup] .ai-news-acts button').allInnerTexts();
ok(JSON.stringify(presses) === JSON.stringify(['Show me', 'OK']), `3 Show me and OK (${presses.join(' · ')})`);
const reg3 = await sources();
ok(reg3.length === 2 && reg3[0].hash !== reg3[1].hash && reg3.every(x => x.name === NAME), `3 she has read it herself: both versions are in the register under the one name (${reg3.map(x => x.hash).join(' → ')})`);
ok((await codeTurns()) === code3 && asks.length === 0, '3 nothing was put into the conversation, and the AI was not asked');
/* what she is told of it with every question — read as production builds it, not through the helper alone (22 November) */
const told3 = await toldNow();
const lines3 = fileLines(told3.files);
ok(lines3.length === 2 && new RegExp(`It says: “Variance £” comes to ${pounds(E2.variance).slice(0, -1)}\\d over ${E2.rows} rows of “Shift report”`).test(told3.files),
  `3 what she is told of the file with every question is the NEW version’s headline: ${told3.files.split('\n').slice(2, 3).join('').trim().slice(0, 150)}…`);
ok(/\n {4}Changed since it was read before \(this version came in \d+ \w+ — the person has not been shown this yet\): Since “Shift report September\.xlsx”, read on /.test(told3.files),
  '3 …with what changed under it — dated, compared with the reading before it of THIS file, and marked as not yet shown to the person while her note is up');
ok(/an earlier reading of the same file, came in .*; kept as it was read \[source /.test(lines3[1] ?? '') && told3.files.split('It says:').length - 1 === 1, `3 …and the version before is listed as an earlier reading, not said twice: ${(lines3[1] ?? '').trim().slice(0, 110)}`);

/* ---- 4 · Show me ---- */
const b4 = await codeTurns();
await page.locator('[data-keepup-show]').first().click();
await afterLook(b4);
const look4 = await lastLook();
ok((await codeTurns()) === b4 + 1 && look4.includes(`“${NAME}” has changed since I read it on `) && /I have read the new version\./.test(look4) && look4.includes(`${more} rows more`) && /What it says now: “Variance £” comes to −£/.test(look4), `4 Show me: what changed written into the conversation as her turn, worked in code (${look4.slice(0, 160)}…)`);
ok((await note().count()) === 0, '4 the note is gone');
const told4 = await toldNow();
ok(/Changed since it was read before \(this version came in \d+ \w+\): Since “Shift report September\.xlsx”/.test(told4.files) && !told4.files.includes('has not been shown'), '4 …and once shown, what she is told no longer says the person has not seen it — it is not said again unasked');
await page.reload(); await page.waitForTimeout(2500); await t.go('#/ai', 2500);
ok((await note().count()) === 0, '4 …and still gone after a reload');
ok(asks.length === 0 && fetched.length === 3, `4 no request to the AI gateway, and the file was not fetched again (${asks.length} asks, ${fetched.length} fetches)`);

/* ---- 5 · the note is kept until it is acknowledged; OK ---- */
behind = V1;   /* changed again */
await hoursPass(5);
await openLuna(4);
await note().waitFor({ timeout: 30000 }).catch(() => undefined);
ok(fetched.length === 4 && (await page.locator('[data-keepup-told]').count()) === 1 && (await sources()).length === 3, '5 changed again: read again by herself, said again');
const fewer = (await page.locator('[data-keepup-changed]').first().innerText()).replace(/\s+/g, ' ');
ok(fewer.includes(`${more} rows fewer on “Shift report” (${E2.rows.toLocaleString('en-GB')} then, ${E1.rows.toLocaleString('en-GB')} now)`), `5 …with what changed this time: “${fewer.slice(0, 120)}…”`);
await page.reload(); await page.waitForTimeout(2500); await t.go('#/ai', 2500);
await note().waitFor({ timeout: 10000 }).catch(() => undefined);
ok((await page.locator('[data-keepup-told]').count()) === 1 && fetched.length === 4, '5 the page reloaded before it was acknowledged: her note is still there, and nothing was fetched again');
const b5 = await codeTurns();
await page.locator('[data-keepup-ok]').first().click(); await page.waitForTimeout(500);
ok((await note().count()) === 0 && (await codeTurns()) === b5, '5 OK: the note put away, nothing written into the conversation');
await openLuna(4);
ok(fetched.length === 4 && (await note().count()) === 0, '5 opened again: she does not ask again — it was looked at just now');

/* …and LEFT OPEN: hours later the app comes back into view (a phone unlocked on her page) — she looks again, with no page opened */
behind = V2;
await hoursPass(5);
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
for (const until = Date.now() + 12000; fetched.length < 5 && Date.now() < until;) await page.waitForTimeout(200);
await note().waitFor({ timeout: 30000 }).catch(() => undefined);
ok(fetched.length === 5 && (await page.locator('[data-keepup-told]').count()) === 1, `5 left open for hours and looked at again: she looks without the page being opened, reads, and says what changed (${fetched.length} requests)`);

/* ---- 6 · only the customer in hand ---- */
const inHand = c => page.evaluate(async c => { (await import('/src/lib/activeClient.ts')).setActiveClient(c); }, c);
await page.evaluate(async () => { await (await import('/src/lib/customers.ts')).addCustomer('Cobb Foods', 'York'); });   /* …and it is the one in hand */
await hoursPass(5);
await openLuna(5);
ok(fetched.length === 5 && (await note().count()) === 0, `6 with Cobb Foods in hand, Branston’s file is not asked for and its note is not shown (${fetched.length} requests)`);
await page.evaluate(async () => { await (await import('/src/lib/customers.ts')).archiveCustomer('Branston'); });
await openLuna(6);
ok(fetched.length === 5, '6 with Branston archived, its file is not asked for — put away with its customer');
await page.evaluate(async () => { await (await import('/src/lib/customers.ts')).continueCustomer('Branston'); });   /* …and Branston is the one in hand again */
await inHand('Branston');
behind = V1;
await openLuna(6);
await note().waitFor({ timeout: 30000 }).catch(() => undefined);
ok(fetched.length === 6 && (await page.locator('[data-keepup-told]').count()) === 1, `6 continued and in hand again: she asks, reads, and her note is shown (${fetched.length} requests)`);
await page.locator('[data-keepup-ok]').first().click(); await page.waitForTimeout(400);

/* ---- 7 · a file she cannot read by herself is still offered ---- */
const regBefore = (await sources()).length;
behind = Buffer.alloc(16 * 1024 * 1024, 7);   /* the file behind the link is now bigger than she fetches and reads by herself */
await hoursPass(5);
const f7 = fetched.length;
await openLuna(f7 + 1);
await note().waitFor({ timeout: 30000 }).catch(() => undefined);
const offer = page.locator('[data-keepup] [data-keepup-file]');
const acts7 = await offer.first().locator('.ai-news-acts button').allInnerTexts().catch(() => []);
ok(fetched.length === f7 + 1 && (await offer.count()) === 1 && (await page.locator('[data-keepup-told]').count()) === 0 && JSON.stringify(acts7) === JSON.stringify(['Read it', 'Later']),
  `7 changed to a file too big for her to read by herself (16 MB): it is offered to the person instead — ${acts7.join(' · ')}`);
ok((await sources()).length === regBefore && asks.length === 0, '7 …and nothing is read until the press');
await page.locator('[data-keepup-later]').first().click(); await page.waitForTimeout(300);
ok((await note().count()) === 0, '7 Later: the note put away, nothing read');

/* ---- 7b · FILES, NEVER READINGS (22 November, the review): a report read again each time it changed is ONE file ---- */
const made = await page.evaluate(async () => {
  const d = await import('/src/db.ts'), data = await import('/src/capabilities/data.ts');
  /* the customer's other file — older than every reading below */
  const pm = await data.registerFile({ now: Date.now() }, { fileId: 'wb-product-master', fileName: 'product master.xlsx', kind: 'workbook', bytes: 10, status: 'ready', sheets: [{ name: 'Products', rows: 40, columns: [{ name: 'Code', type: 'text' }] }] });
  /* …and the daily report read again and again: readings of the same link, each newer than the last */
  const all = (await d.listAllStudies()).filter(x => x.tool === 'source' && !x.deletedAt && x.facts?.source?.origin?.kind === 'link').sort((a, b) => b.facts.source.at - a.facts.source.at);
  const newest = all[0], t0 = Date.now() + 1000;
  for (let i = 0; i < 12; i += 1) { const at = t0 + i * 1000; await d.putStudy({ ...newest, id: crypto.randomUUID(), facts: { ...newest.facts, source: { ...newest.facts.source, at, fileId: `${newest.facts.source.fileId}-again-${i}` } }, createdAt: at, updatedAt: at, startedAt: at }); }
  return { pm: pm?.facts.name ?? '', readings: all.length + 12 };
});
const told7 = await toldNow();
const lines7 = fileLines(told7.files);
ok(made.readings >= 13 && lines7.length === 3 && lines7.filter(l => l.includes('an earlier reading of the same file')).length === 1 && lines7.some(l => l.includes(`“${made.pm}”`)),
  `7b ${made.readings} readings of one link and one other file: she is told 2 files — the report with the one reading before it, and “${made.pm}” — not twelve readings of one name (${lines7.length} lines)`);
const list7 = await page.evaluate(async () => { const r = await (await import('/src/capabilities/registry.ts')).runCall({ now: Date.now(), level: 'owner' }, { id: 'x', name: 'list_sources', input: {} }, { confirmed: false }); return { says: r.says ?? '', files: r.data?.files?.length ?? -1 }; });
ok(/^2 files in the register/.test(list7.says) && list7.files === 2 && list7.says.includes(`(${made.readings - 1} earlier readings of linked files kept as read`), `7b list_sources says 2 files, the earlier readings counted in a clause: “${list7.says.slice(0, 60)}… ${(/\(\d+ earlier readings[^)]*\)/.exec(list7.says) ?? [''])[0]}”`);
await openLunaContext(page); await openLunaFolds(page, ['luna-files']);
const rows7 = await page.locator('[data-luna-file]').evaluateAll(es => es.map(e => `${e.getAttribute('data-luna-file')} | ${e.querySelector('[data-luna-file-earlier]')?.textContent?.trim() ?? ''}`));
ok(rows7.length === 2 && rows7.some(r => r.startsWith(`${NAME} | · ${made.readings - 1} earlier versions kept`)), `7b the Files list beside her shows a row a file, its earlier versions counted on it: ${rows7.join(' ; ')}`);

/* ---- 8 · the phone ---- */
behind = V2;
await hoursPass(5);
await openLuna(fetched.length + 1);
await note().waitFor({ timeout: 30000 }).catch(() => undefined);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
const phone = await page.evaluate(() => {
  const n = document.querySelector('[data-keepup]')?.getBoundingClientRect();
  const hs = [...document.querySelectorAll('[data-keepup] .ai-news-acts button')].map(b => Math.round(b.getBoundingClientRect().height));
  return { left: n ? Math.round(n.left) : -1, right: n ? Math.round(n.right) : 9999, hs, vw: window.innerWidth };
});
ok(phone.left >= 0 && phone.right <= phone.vw && phone.hs.length >= 2 && phone.hs.every(h => h >= 44) && (await t.wide()) <= 1, `8 the phone: her note inside the screen, its presses ${phone.hs.join(', ')} px, nothing off the side`);
ok(asks.length === 0, `no request to the AI gateway in any of it (${asks.length})`);

await t.finish('Keeping up accepted: Luna looks at her linked files by herself when she is opened — not when they were looked at lately, once when they are due — and a workbook that has changed she reads herself: she says what changed without being asked, what she is told of the file is the new version’s, Show me writes it into the conversation, her note is kept until it is acknowledged; what changed is dated, compared with the earlier reading of that file, and said unasked only until it has been shown; a report read again and again is one file in what she knows, in list_sources and in the Files list; a file she cannot read by herself is still offered; only the customer in hand’s files, never an archived customer’s; and on the phone. No AI asked.');
