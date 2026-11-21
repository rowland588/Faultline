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
 *   3  hours later the file has changed behind the link: opened, she says so without being asked — A file I read has changed, its name,
 *      that it is from its link and when the version she holds was read, Read it and Later — and nothing has been read or changed yet
 *   4  Read it: the newer version read as an upload is, the first look Luna's turn worked in code saying what changed since the last,
 *      the note gone, both versions in the register; no request to the AI gateway
 *   5  Later: the note put away, nothing read; and she does not ask again at the next opening. LEFT OPEN for hours and then looked
 *      at again (the app comes back into view): she looks without the page being opened, and says what changed
 *   6  ONLY THE CUSTOMER IN HAND: with another customer in hand the file is not asked for; with its customer archived it is not asked
 *      for; continued and in hand again, it is
 *   7  the phone: her note inside the screen, its presses 44 px, nothing off the side
 *
 *   node scripts/acceptance/keep-up.mjs   (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'kup-'));
const gen = (out, ...flags) => { execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', out, ...flags], { stdio: 'ignore' }); return readFileSync(out); };
const V1 = gen(join(dir, 'v1.xlsx'));
const V2 = gen(join(dir, 'v2.xlsx'), '--later');
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

/* ---- 3 · the file changes behind the link: said without being asked ---- */
behind = V2;
await hoursPass(5);
const turnsBefore = await page.locator('.ai-turn').count();
await openLuna(3);
await note().waitFor({ timeout: 10000 }).catch(() => undefined);
ok(fetched.length === 3 && (await note().count()) === 1, `3 five hours later the file has changed: opened, Luna says so without being asked (${fetched.length} requests)`);
const head = (await page.locator('[data-keepup] .ai-news-h').innerText()).trim();
const row = page.locator('[data-keepup] [data-keepup-file]').first();
const said = (await row.locator('.ai-news-w').innerText()).replace(/\s+/g, ' ').trim();
ok(head === 'A file I read has changed' && (await row.getAttribute('data-keepup-file')) === NAME && said.startsWith(NAME) && /from its link · the version I hold was read \d{1,2} \w{3}$/.test(said), `3 her note: “${head}” — ${said}`);
const presses = await page.locator('[data-keepup] .ai-news-acts button').allInnerTexts();
ok(JSON.stringify(presses) === JSON.stringify(['Read it', 'Later']), `3 Read it and Later (${presses.join(' · ')})`);
ok((await sources()).length === 1 && asks.length === 0, '3 nothing has been read or changed yet, and the AI was not asked');

/* ---- 4 · Read it ---- */
const b4 = await codeTurns();
await page.locator('[data-keepup-read]').first().click();
await afterLook(b4);
const look4 = await lastLook();
ok((await codeTurns()) > b4 && /since/i.test(look4) && /Shift report September\.xlsx/.test(look4), `4 Read it: the newer version read as an upload is, her first look saying what changed since the last (${look4.slice(0, 150)}…)`);
ok((await note().count()) === 0, '4 the note is gone');
const reg = await sources();
ok(reg.length === 2 && reg[0].hash !== reg[1].hash, `4 both versions are in the register (${reg.map(x => x.hash).join(' → ')})`);
ok(asks.length === 0 && fetched.length === 3, `4 no request to the AI gateway, and the file was not fetched twice (${asks.length} asks, ${fetched.length} fetches)`);

/* ---- 5 · Later ---- */
behind = V1;   /* changed again */
await hoursPass(5);
await openLuna(4);
await note().waitFor({ timeout: 10000 }).catch(() => undefined);
const b5 = await codeTurns();
ok(fetched.length === 4 && (await note().count()) === 1, '5 changed again, said again');
await page.locator('[data-keepup-later]').first().click(); await page.waitForTimeout(500);
ok((await note().count()) === 0 && (await codeTurns()) === b5 && (await sources()).length === 2, '5 Later: the note put away, nothing read');
await openLuna(4);
ok(fetched.length === 4 && (await note().count()) === 0, '5 opened again: she does not ask again — it was looked at just now');

/* …and LEFT OPEN: hours later the app comes back into view (a phone unlocked on her page) — she looks again, with no page opened.
   The file behind the link is still the one she was told of and did not read (Later), so it is said again. */
await hoursPass(5);
await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
for (const until = Date.now() + 12000; fetched.length < 5 && Date.now() < until;) await page.waitForTimeout(200);
await note().waitFor({ timeout: 10000 }).catch(() => undefined);
ok(fetched.length === 5 && (await note().count()) === 1, `5 left open for hours and looked at again: she looks without the page being opened, and says it has changed (${fetched.length} requests)`);
await page.locator('[data-keepup-later]').first().click(); await page.waitForTimeout(300);

/* ---- 6 · only the customer in hand ---- */
const inHand = c => page.evaluate(async c => { (await import('/src/lib/activeClient.ts')).setActiveClient(c); }, c);
await page.evaluate(async () => { await (await import('/src/lib/customers.ts')).addCustomer('Cobb Foods', 'York'); });   /* …and it is the one in hand */
await hoursPass(5);
await openLuna(5);
ok(fetched.length === 5 && (await note().count()) === 0, `6 with Cobb Foods in hand, Branston’s file is not asked for (${fetched.length} requests)`);
await page.evaluate(async () => { await (await import('/src/lib/customers.ts')).archiveCustomer('Branston'); });
await openLuna(6);
ok(fetched.length === 5, '6 with Branston archived, its file is not asked for — put away with its customer');
await page.evaluate(async () => { await (await import('/src/lib/customers.ts')).continueCustomer('Branston'); });   /* …and Branston is the one in hand again */
await inHand('Branston');
await openLuna(6);
await note().waitFor({ timeout: 10000 }).catch(() => undefined);
ok(fetched.length === 6 && (await note().count()) === 1, `6 continued and in hand again: she asks, and says it has changed (${fetched.length} requests)`);

/* ---- 7 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
const phone = await page.evaluate(() => {
  const n = document.querySelector('[data-keepup]')?.getBoundingClientRect();
  const hs = [...document.querySelectorAll('[data-keepup] .ai-news-acts button')].map(b => Math.round(b.getBoundingClientRect().height));
  return { left: n ? Math.round(n.left) : -1, right: n ? Math.round(n.right) : 9999, hs, vw: window.innerWidth };
});
ok(phone.left >= 0 && phone.right <= phone.vw && phone.hs.length === 2 && phone.hs.every(h => h >= 44) && (await t.wide()) <= 1, `7 the phone: her note inside the screen, its presses ${phone.hs.join(', ')} px, nothing off the side`);
ok(asks.length === 0, `no request to the AI gateway in any of it (${asks.length})`);

await t.finish('Keeping up accepted: Luna looks at her linked files by herself when she is opened — not when they were looked at lately, once when they are due — says the one that has changed without being asked, reads it on the press with what changed since the last, puts the note away on Later, asks only for the customer in hand’s files and never an archived customer’s; and on the phone. No AI asked.');
