/* A FILE BY ITS LINK — a workbook read by pasting its share link, with no Microsoft set-up and no business account (21 November 2026,
 * docs/CONNECTED-LUNA.md X1b — Rowland: "I'm not a business, so I can't do the SharePoint thing … I need to get to the point where I can
 * connect to a URL and extract").
 *
 * Luna's cloud (the `link` function) is PLAYED by this script — its rules are proved by src/lib/fileLink/__tests__/linkCore.test.ts, and
 * the deployed function by the sample link on the live site — and every request to Luna's AI gateway is counted: none may be made.
 * The workbooks are real ones, written by the generators with their own totals.
 *
 *   1  ONE BUTTON (21 November — Rowland: "I should just have one click, one button. Connect. And then what am I connecting to? And I
 *      connect … simplicity, not complexity"): Luna's ＋ has one Connect row; the sheet asks What are you connecting to? — A link, or
 *      Microsoft 365; A link is one box and one button, Connect, held until something is pasted; what is not a link is said when
 *      Connect is pressed, never before; the rest (how to get a link, who can read it) is one fold, shut;
 *   2  Read it: the link sent to the cloud as the signed-in person, the file read on the device as an upload is — the first look Luna's
 *      turn worked in code, NO request to the AI gateway — and kept in the register with where it came from (the link, the service, the
 *      fingerprint of its bytes);
 *   3  Files Luna can read lists it From a link; Check for a newer version fetches the link again — the same bytes said the same; the
 *      file changed behind the link said newer, Read it reads it and the look says what changed since;
 *   4  a link that opens a web page is said so in the cloud's words, the sheet staying open, nothing read; no signal said;
 *   5  Try the sample link: Faultline's own sample address asked for, the made-up month read, its plan and actual the generator's;
 *   6  Set up › Data connections: A file by its link, Ready — Paste a link opens the sheet beside Luna;
 *   7  the phone: the menu row and the sheet's presses 44 px, nothing off the side. */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';
import { openLunaContext, openLunaFolds } from '../lib/lunaContext.mjs';

const dir = mkdtempSync(join(tmpdir(), 'lnk-'));
const gen = (script, out, ...flags) => { execFileSync('node', [`scripts/workbook/${script}`, out, ...flags], { stdio: 'ignore' }); return readFileSync(out); };
const V1 = gen('make-marked-workbook.mjs', join(dir, 'v1.xlsx'));
const V2 = gen('make-marked-workbook.mjs', join(dir, 'v2.xlsx'), '--later');
gen('make-demo-workbook.mjs', join(dir, 'demo.xlsx'));
const DEMO = JSON.parse(readFileSync(join(dir, 'demo.xlsx.expected.json'), 'utf8'));
const SAMPLE = readFileSync('public/sample/Plan-and-actual-October.xlsx');
const sha = b => createHash('sha256').update(b).digest('hex');
const n = x => x.toLocaleString('en-GB');

const ONEDRIVE = 'https://1drv.ms/x/c/abc123def/EaBcDeFgHiJ?e=Xy12Zz';
const GOOGLE = 'https://docs.google.com/spreadsheets/d/1AbCdEfGhIjKlMnOpQrStUvWxYz012345/edit?usp=sharing';
const SAMPLE_LINK = 'https://faultline.opexelevate.co.uk/sample/Plan-and-actual-October.xlsx';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-expose-headers': 'x-link-name, x-link-kind, x-link-service, x-link-host, x-link-etag, x-link-modified, x-link-size' };
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task === 'budget') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not here' }) });
  asks.push(body);
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Asked of Luna.' }) });
});

/* ---- Luna's cloud, played: the link function ---- */
const PRIVATE = 'https://example.sharepoint.com/:x:/s/Operations/test-private';
const privateRequests = [];
const fetched = [];
let onedrive = V1, down = false;
await page.route('**/functions/v1/link', async r => {
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
  if (down) return r.abort();
  const url = r.request().postDataJSON()?.url ?? '';
  fetched.push({ url, auth: r.request().headers().authorization ?? '' });
  const give = (bytes, name, service, host) => r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/octet-stream', 'x-link-name': encodeURIComponent(name), 'x-link-kind': 'zip', 'x-link-service': service, 'x-link-host': host }, body: bytes });
  if (url === PRIVATE) {
    const signed = r.request().postDataJSON()?.microsoftAccess === 'test-link-account';
    privateRequests.push(signed);
    if (!signed) return r.fulfill({ status: 422, headers: CORS, contentType: 'application/json', body: JSON.stringify({ code: 'sign-in', why: 'File requires sign-in.' }) });
    return give(V1, 'Private shift workbook.xlsx', 'sharepoint', 'example.sharepoint.com');
  }
  if (url === ONEDRIVE) return give(onedrive, 'Shift report September.xlsx', 'onedrive', 'my.microsoftpersonalcontent.com');
  if (url === SAMPLE_LINK) return give(SAMPLE, 'Plan-and-actual-October.xlsx', 'web', 'faultline.opexelevate.co.uk');
  if (url === GOOGLE) return r.fulfill({ status: 422, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, code: 'page', why: 'The link opens a web page, not the file itself. In Google Drive choose Share, set General access to “Anyone with the link”, copy that link and paste it here.' }) });
  return r.fulfill({ status: 422, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, code: 'gone', why: 'The link no longer points at a file.' }) });
});

const plus = async () => { await page.locator('.ai-plus').click(); await page.locator('[data-connect-open]').click(); await page.locator('[data-connect-to="link"]').click(); await page.locator('[data-link-sheet]').waitFor({ timeout: 10000 }); };
const codeTurns = () => page.locator('.ai-turn.is-colleague [data-ai-code]').count();
const lastLook = async () => (await page.locator('.ai-turn.is-colleague').last().innerText()).replace(/\s+/g, ' ');
const afterLook = async before => { await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > k, before, { timeout: 60000 }).catch(() => undefined); await page.waitForTimeout(800); };

/* ---- 1 · one button, then what to, then connect ---- */
await t.go('#/ai', 3000);
await page.locator('.ai-plus').click();
const menu = (await page.locator('[data-attach-menu] [role="menuitem"]').allInnerTexts()).map(x => x.split('\n')[0].trim());
ok(menu.filter(x => /connect|link|microsoft/i.test(x)).join(' | ') === 'Connect', `1 Luna’s ＋ has ONE row for connecting — Connect (${menu.join(' · ')})`);
await page.locator('[data-connect-open]').click(); await page.locator('[data-connect-sheet="choose"]').waitFor();
const tos = (await page.locator('[data-connect-sheet="choose"] [data-connect-to]').allInnerTexts()).map(x => x.split('\n')[0].trim());
ok(/^What are you connecting to\?$/.test(await t.words('.cn-q')) && tos.join(' | ') === 'Open a file URL | Microsoft 365', `1 the sheet asks one thing — "${await t.words('.cn-q')}" — and offers ${tos.join(' · ')}`);
await page.locator('[data-connect-to="link"]').click(); await page.locator('[data-link-sheet]').waitFor();
const first = await page.locator('[data-link-sheet]').evaluate(e => ({ boxes: e.querySelectorAll('input').length, buttons: [...e.querySelectorAll('button.btn')].map(b => b.textContent.trim()), help: e.querySelector('[data-fold="connect-help"]')?.getAttribute('aria-expanded') ?? e.querySelector('.fold-h')?.getAttribute('aria-expanded') ?? '', words: e.innerText.replace(/\s+/g, ' ').trim().length }));
ok(first.boxes === 1 && first.buttons.join(' | ') === 'Connect' && await page.locator('[data-link-read]').isDisabled(), `1 A link: one box and one button, Connect — held with nothing pasted (${first.buttons.join(' | ')})`);
ok(first.words < 120 && (await page.locator('.cn-how').isVisible().catch(() => false)) === false, `1 nothing else on the first view — the rest is Help, shut (${first.words} characters of words on the sheet)`);
await page.locator('[data-fold="connect-help"] .fold-toggle').click();
ok((await page.locator('.cn-how a').evaluateAll(es => es.map(e => new URL(e.href).hostname))).join(',') === 'onedrive.live.com,drive.google.com,www.dropbox.com', '1 help opens each supported service to get a shareable link');
await page.locator('[data-fold="connect-help"] .fold-toggle').click();
await page.locator('[data-link-url]').fill('Shift report.xlsx');
ok((await page.locator('[data-link-err]').count()) === 0, '1 nothing is said while it is typed');
await page.locator('[data-link-read]').click();
ok(/That is not a link — paste the whole link/.test(await t.words('[data-link-err]')) && fetched.length === 0, `1 what is not a link is said when Connect is pressed, nothing sent: "${await t.words('[data-link-err]')}"`);

/* ---- 2 · read ---- */
await page.locator('[data-link-url]').fill(ONEDRIVE);
const before2 = await codeTurns();
await page.locator('[data-link-read]').click();
await afterLook(before2);
ok(fetched.length === 1 && fetched[0].url === ONEDRIVE && /^Bearer \S+/.test(fetched[0].auth), `2 the link sent to the cloud as the signed-in person (${fetched.length} request)`);
ok((await page.locator('[data-link-sheet]').count()) === 0, '2 the sheet closes once it is connected');
const look2 = await lastLook();
ok((await codeTurns()) > before2 && /Shift report September\.xlsx/.test(look2), `2 the first look is Luna’s turn worked in code, on the file by its name (${look2.slice(0, 130)}…)`);
ok(asks.length === 0, `2 no request to the AI gateway (${asks.length})`);
const src = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  return (await db.listAllStudies()).filter(x => x.tool === 'source' && x.facts?.source?.fileName === 'Shift report September.xlsx').map(x => x.facts.source.origin);
});
ok(src.length === 1 && src[0]?.kind === 'link' && src[0].url === ONEDRIVE && src[0].service === 'onedrive' && src[0].hash === sha(V1) && src[0].path === 'OneDrive link · 1drv.ms',
  `2 in the register with where it came from — the link, the service, the fingerprint of its bytes (${JSON.stringify(src[0] ? { ...src[0], hash: `${src[0].hash?.slice(0, 12)}…` } : null)})`);

/* ---- 3 · Files Luna can read: checked again by the link ---- */
await openLunaContext(page); await openLunaFolds(page, ['luna-files']);
const fileRow = () => page.locator('[data-luna-files] [data-luna-file]').first();
const where = await fileRow().locator('[data-luna-file-where]').innerText();
ok(/^From a link · OneDrive link · 1drv\.ms · read /.test(where), `3 listed beside Luna with where it came from: "${where}"`);
await fileRow().locator('[data-luna-file-check]').click();
await fileRow().locator('[data-luna-file-same]').waitFor({ timeout: 15000 }).catch(() => undefined);
ok((await fileRow().locator('[data-luna-file-same]').count()) === 1 && fetched.length === 2 && fetched[1].url === ONEDRIVE, '3 Check for a newer version fetches the link again — the same bytes, the same version said');
onedrive = V2;
await page.reload(); await page.waitForTimeout(3000);
await openLunaContext(page); await openLunaFolds(page, ['luna-files']);
await fileRow().locator('[data-luna-file-check]').click();
await fileRow().locator('[data-luna-file-newer]').waitFor({ timeout: 15000 }).catch(() => undefined);
ok(/A newer version — the file behind the link has changed\./.test(await fileRow().locator('[data-luna-file-newer]').innerText().catch(() => '')), '3 the file changed behind the link: a newer version said');
const before3 = await codeTurns();
await fileRow().locator('[data-luna-file-read]').click();
await afterLook(before3);
const look3 = await lastLook();
ok((await codeTurns()) > before3 && /since/i.test(look3), `3 Read it: read again and compared with the first (${look3.slice(0, 150)}…)`);
ok(fetched.length === 3, `3 the changed file is not fetched twice (${fetched.length} requests in all)`);
const kept = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(x => x.tool === 'source' && x.facts?.source?.origin?.kind === 'link').map(x => x.facts.source.origin.hash));
ok(kept.includes(sha(V2)), '3 the newer version kept with its own fingerprint');
ok(asks.length === 0, `3 still no request to the AI gateway (${asks.length})`);

/* ---- 4 · a link that is not the file, and no signal ---- */
await plus();
await page.locator('[data-link-url]').fill(GOOGLE);
const before4 = await codeTurns();
await page.locator('[data-link-read]').click();
await page.locator('[data-link-err]').waitFor({ timeout: 15000 }).catch(() => undefined);
const err4 = await t.words('[data-link-err]');
ok(/opens a web page, not the file itself\..*Anyone with the link/.test(err4) && (await page.locator('[data-link-sheet]').count()) === 1 && (await codeTurns()) === before4, `4 a link that opens a web page is said so, with what to do — the sheet open, nothing read: "${err4}"`);
/* the browser logs the refusal this step plays on purpose — that one entry is not an error of the app's */
for (let i = t.errors.length - 1; i >= 0; i--) if (/status of 422/.test(t.errors[i])) t.errors.splice(i, 1);
down = true;
await page.locator('[data-link-url]').fill(ONEDRIVE);
await page.locator('[data-link-read]').click();
await page.waitForFunction(() => /No signal/.test(document.querySelector('[data-link-err]')?.textContent ?? ''), null, { timeout: 15000 }).catch(() => undefined);
ok(/No signal — the file link needs a connection/.test(await t.words('[data-link-err]')), `4 no signal said: "${await t.words('[data-link-err]')}"`);
down = false;

/* ---- 5 · the sample link ---- */
const before5 = await codeTurns();
await page.locator('[data-link-sample]').click();
await afterLook(before5);
const sample = fetched[fetched.length - 1];
ok(sample.url === SAMPLE_LINK, `5 Try the sample link asks for Faultline’s own sample (${sample.url})`);
const look5 = await lastLook();
ok((await codeTurns()) > before5 && /Plan-and-actual-October\.xlsx/.test(look5), `5 the sample read — Luna’s turn worked in code (${look5.slice(0, 150)}…)`);
ok(look5.includes(n(DEMO.actual)) || look5.includes(n(DEMO.plan)), `5 its figures are the generator’s (actual ${n(DEMO.actual)} of plan ${n(DEMO.plan)})`);
ok(asks.length === 0, `5 no request to the AI gateway (${asks.length})`);

/* ---- 6 · Set up › Data connections ---- */
await t.go('#/factory/data', 2500);
const card = page.locator('[data-link-card]');
ok((await card.count()) === 1 && /^Open a file URL\s*Ready/.test((await card.innerText()).replace(/\s+/g, ' ')) && /Paste an Excel or document link/.test(await card.innerText()) && (await t.words('[data-link-card-open]')) === 'Connect', `6 Data connections: "${(await card.innerText()).replace(/\s+/g, ' ')}"`);
await page.locator('[data-link-card-open]').click();
await page.locator('[data-link-sheet]').waitFor({ timeout: 15000 }).catch(() => undefined);
ok(/#\/factory\/data\?link=1/.test(page.url()) && (await page.locator('[data-link-page] [data-link-sheet]').count()) === 1 && (await page.locator('.nv.is-env').count()) === 0 && (await page.locator('.sheet[aria-label="Connect"]').count()) === 0, '6 its Connect opens the link on Data connections — the page, not a sheet over Luna');
await page.locator('[data-link-page] .part-back').click(); await page.waitForTimeout(500);

/* ---- 7 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
await t.go('#/ai', 2500);
await page.locator('.ai-plus').click();
const rowH = await page.locator('[data-connect-open]').evaluate(e => Math.round(e.getBoundingClientRect().height));
await page.locator('[data-connect-open]').click(); await page.locator('[data-connect-sheet="choose"]').waitFor();
const toH = await page.locator('[data-connect-to]').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
await page.locator('[data-connect-to="link"]').click(); await page.locator('[data-link-sheet]').waitFor();
await page.locator('[data-link-url]').fill(ONEDRIVE);
const sizes = await page.locator('[data-link-url], [data-link-read], [data-link-sample]').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
const off = await page.locator('[data-link-sheet] *').evaluateAll(es => es.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > innerWidth + 1; }).length);
ok(rowH >= 44 && toH.every(h => h >= 44) && sizes.every(h => h >= 44) && off === 0 && (await t.wide()) <= 0, `7 the phone: Connect ${rowH} px, each answer ${Math.min(...toH)} px, the box and the presses ${Math.min(...sizes)} px or more, nothing off the side`);

await page.evaluate(() => localStorage.setItem('faultline.ms.session.fileLink', JSON.stringify({ access: 'test-link-account', expiresAt: Date.now() + 600_000 })));
await t.go('#/factory/data?ms=1', 1200);
await page.locator('[data-ms-page] [data-link-url]').fill(PRIVATE);
await page.locator('[data-ms-page] [data-link-read]').click();
await page.waitForURL(/#\/ai/, {timeout:20000});
await page.waitForFunction(async () => (await (await import('/src/capabilities/data.ts')).allSources()).some(s => s.facts.origin?.privateMicrosoft), undefined, {timeout:60000});
ok(privateRequests.join(',') === 'false,true', '8 an Excel URL pasted straight into Microsoft setup opens in Luna with the existing account');
/* The first, unsigned request receives the expected private-file refusal. */
const privateRefusal = t.errors.findIndex(error => /status of 422/.test(error));
if (privateRefusal >= 0) t.errors.splice(privateRefusal, 1);
await t.finish('Accepted: a file read by its link — no Microsoft set-up, no business account, no request to the AI service');
