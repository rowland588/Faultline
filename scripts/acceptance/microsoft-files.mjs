/* CONNECT TO MICROSOFT — a workbook from SharePoint or OneDrive, read by Luna as an upload (20 November, docs/CONNECTED-LUNA.md X1 —
 * Rowland: "the most important aspect for Luna right now is upload Excel and that entire system and connect to pull Excel files").
 *
 * Microsoft is played by the script — its sign-in page answering with a code, its token endpoint, Graph's listings and a file's
 * download address serving a real workbook made by scripts/workbook/make-marked-workbook.mjs — and every request to Luna's gateway is
 * counted. Proves, in the real page:
 *   1  not registered: Luna's ＋ › Connect › Microsoft 365 says so and See the steps opens Data connections with them; an ID that is not one
 *      refused in words; a real one kept on this device and said (ending …)
 *   2  Sign in with Microsoft: Microsoft's own window, the code sent back to /ms-auth.html, the token asked for with the PKCE verifier
 *      (its S256 matching the challenge sent), Signed in as the account's name
 *   3  Recent and My files listed — folders first, only files Faultline can read (no picture), a folder opened with its path and the way back
 *   4  a workbook chosen: downloaded to this device and read as an upload — the first look is Luna's turn worked in code, NO request to the
 *      gateway; the file in the register with where it came from (the drive, the item, its version, its path)
 *   5  SharePoint: a site found by name, its library listed
 *   6  a folder Microsoft refuses (403) said in words: the business's IT administrator approves Faultline
 *   7  Sign out forgets the sign-in on this device
 *   9  Files Luna can read (X2): the file listed beside her with where it came from; Check for a newer version — the same version said;
 *      Microsoft's copy changed — a newer version said and Read it downloading and reading it again, compared with the first
 *   8  the phone: the picker inside the screen, every row a thumb's height
 *  11  ready to connect, for everyone: the card and the sheet say where it stands in a word (Not set up · Ready · Connected); the
 *      administrator saves the Application ID ONCE FOR EVERYONE (the table app_settings, played here) — another device, nothing typed,
 *      is ready from it on start; Test the connection signs in and says what Microsoft listed, ticking step 3 and turning the card
 *      Connected; a registration missing its redirect (AADSTS50011) said as what to add and where (step 1); a client's approval link made
 *      with their domain and the ID; the phone
 *  10  several at once: a monthly folder's March and April ticked (each tick a thumb's size) and Read 2 workbooks — both downloaded,
 *      read in the order of their own dates, April's look saying what changed since March, each in the register with its own origin
 *      and path, NO request to the gateway
 *
 *   node scripts/acceptance/microsoft-files.mjs   (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';
import { openLunaContext, openLunaFolds } from '../lib/lunaContext.mjs';

const dir = mkdtempSync(join(tmpdir(), 'msf-'));
const WB = join(dir, 'Shift report September.xlsx');
execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', WB], { stdio: 'ignore' });
const WB_BYTES = readFileSync(WB);
execFileSync('node', ['scripts/workbook/make-reading-workbooks.mjs', dir], { stdio: 'ignore' });
const MONTH = m => readFileSync(join(dir, `shift-report-${m}.xlsx`));
const ID = '1a2b3c4d-1234-5678-9abc-1234567890ab';
const b64url = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const ID_TOKEN = `x.${b64url(JSON.stringify({ name: 'Pat Example', preferred_username: 'pat@example-foods.co.uk' }))}.y`;

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const ctx = page.context();
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task === 'budget') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not here' }) });
  asks.push(body);
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Asked of Luna.' }) });
});

/* ---- Microsoft, played ---- */
let challenge = '', tokenBody = '', authorizeError = '';
await ctx.route('https://login.microsoftonline.com/**', async r => {
  const u = new URL(r.request().url());
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
  if (u.pathname.endsWith('/authorize')) {
    challenge = u.searchParams.get('code_challenge') ?? '';
    if (authorizeError) return r.fulfill({ status: 302, headers: { location: `${u.searchParams.get('redirect_uri')}?error=invalid_request&error_description=${encodeURIComponent(authorizeError)}&state=${encodeURIComponent(u.searchParams.get('state') ?? '')}` } });
    return r.fulfill({ status: 302, headers: { location: `${u.searchParams.get('redirect_uri')}?code=CODE-123&state=${encodeURIComponent(u.searchParams.get('state') ?? '')}` } });
  }
  if (u.pathname.endsWith('/token')) {
    tokenBody = r.request().postData() ?? '';
    return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ access_token: 'AT-1', refresh_token: 'RT-1', expires_in: 3600, id_token: ID_TOKEN }) });
  }
  return r.fulfill({ status: 404, headers: CORS, body: '{}' });
});
const file = (id, name, size, extra = {}) => ({ id, name, size, file: {}, eTag: `"{${id}},1"`, lastModifiedDateTime: '2026-11-19T08:00:00Z', parentReference: { driveId: 'D1' }, webUrl: `https://example.sharepoint.com/${name}`, ...extra });
const graphSeen = [];
const version = { eTag: '"{W1},1"', at: '2026-11-19T08:00:00Z' };
await ctx.route('https://graph.microsoft.com/**', async r => {
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
  const u = new URL(r.request().url()); const p = u.pathname.replace('/v1.0', '');
  graphSeen.push({ p, auth: r.request().headers().authorization });
  const json = (body, status = 200) => r.fulfill({ status, contentType: 'application/json', headers: CORS, body: JSON.stringify(body) });
  if (p === '/me/drive/recent') return json({ value: [{ id: 'local1', name: 'Weekly KPIs.xlsx', remoteItem: file('K1', 'Weekly KPIs.xlsx', 51200, { parentReference: { driveId: 'D2' } }) }] });
  if (p === '/me/drive/root/children') return json({ value: [file('P1', 'line photo.png', 9000), file('F2', 'Notes.xlsx', 3000), { id: 'F1', name: 'Reports', folder: { childCount: 2 }, parentReference: { driveId: 'D1' } }, { id: 'F3', name: 'Locked', folder: { childCount: 1 }, parentReference: { driveId: 'D1' } }] });
  if (p === '/drives/D1/items/F1/children') return json({ value: [file('W1', 'Shift report September.xlsx', WB_BYTES.length, { '@microsoft.graph.downloadUrl': 'https://dl.example-files.test/sep' }), file('W0', 'Old summary.xls', 4000), { id: 'F4', name: 'Monthly', folder: { childCount: 2 }, parentReference: { driveId: 'D1' } }] });
  if (p === '/drives/D1/items/F4/children') return json({ value: ['april', 'march'].map(m => file(`M-${m}`, `shift-report-${m}.xlsx`, MONTH(m).length, { '@microsoft.graph.downloadUrl': `https://dl.example-files.test/${m}` })) });
  if (p === '/drives/D1/items/F3/children') return json({ error: { code: 'accessDenied' } }, 403);
  if (p === '/sites') return json({ value: [{ id: 'S1', displayName: 'Operations', webUrl: 'https://example.sharepoint.com/sites/ops' }] });
  if (p === '/sites/S1/drives') return json({ value: [{ id: 'D3', name: 'Documents' }] });
  if (p === '/drives/D3/root/children') return json({ value: [file('C1', 'Downtime log.csv', 1200, { parentReference: { driveId: 'D3' } })] });
  if (p === '/drives/D1/items/W1') return json(file('W1', 'Shift report September.xlsx', WB_BYTES.length, { eTag: version.eTag, lastModifiedDateTime: version.at, '@microsoft.graph.downloadUrl': 'https://dl.example-files.test/sep' }));
  return json({ error: { code: 'itemNotFound' } }, 404);
});
await ctx.route('https://dl.example-files.test/**', r => { const m = /\/(march|april)$/.exec(new URL(r.request().url()).pathname)?.[1]; return r.fulfill({ status: 200, headers: { ...CORS, 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: m ? MONTH(m) : WB_BYTES }); });

/* since 21 November ＋ has ONE Connect row and its sheet asks what to: Microsoft 365 is one of its two answers (colleague/ConnectSheet) */
const plus = async () => { await page.locator('.ai[data-ai-slot="page"] .ai-plus').click(); await page.waitForTimeout(300); await page.locator('[data-connect-open]').click(); await page.locator('[data-connect-to="microsoft"]').click(); await page.waitForTimeout(600); };

/* ---- 1 · not registered ---- */
await t.go('#/ai', 3000);
await plus();
ok((await page.locator('[data-ms-unregistered]').count()) === 1 && /not registered with Microsoft yet/.test(await t.words('[data-ms-unregistered]')), '1 not registered: the picker says so');
await page.locator('[data-ms-unregistered] .btn').click(); await page.waitForTimeout(1500);
ok(/#\/factory\/data/.test(page.url()) && (await page.locator('[data-ms-page] [data-ms-sheet]').count()) === 1 && (await page.locator('.sheet[aria-label="Connect to Microsoft"]').count()) === 0, '1 See the steps opens Data connections with them — the page, not a sheet');
ok(!await page.locator('[data-ms-id]').isVisible(), '1 customers see their own account requirements before administrator registration');
await page.getByText('Need a Microsoft work or school account?', { exact: true }).click();
ok(await page.getByRole('link', { name: /Set up Microsoft 365 for business/ }).getAttribute('href') === 'https://www.microsoft.com/en-gb/microsoft-365/business/compare-all-microsoft-365-business-products', '1 business account setup opens Microsoft');
await page.locator('[data-ms-admin] summary').first().click();
await page.locator('[data-ms-id]').fill('my-faultline-app'); await page.getByRole('button', { name: 'Use it on this device' }).click(); await page.waitForTimeout(300);
ok(/not an Application ID/.test(await page.locator('[data-ms-sheet]').innerText()), '1 an ID that is not one is refused in words');
await page.locator('[data-ms-id]').fill(ID); await page.getByRole('button', { name: 'Use it on this device' }).click(); await page.waitForTimeout(400);
ok(/registered with Microsoft.*ending 90ab/.test(await t.words('[data-ms-registered]')), `1 kept and said: "${await t.words('[data-ms-registered]')}"`);
await page.keyboard.press('Escape'); await page.waitForTimeout(500);

/* ---- 2 · Sign in with Microsoft ---- */
await t.go('#/ai', 2500);
await plus();
ok((await page.locator('[data-ms-signin-go]').count()) === 1, '2 registered and not signed in: one button, Sign in with Microsoft');
const [popup] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }), page.locator('[data-ms-signin-go]').click()]);
await page.locator('[data-ms-who]').waitFor({ timeout: 20000 });
const verifier = new URLSearchParams(tokenBody).get('code_verifier') ?? '';
const s256 = b64url(createHash('sha256').update(verifier).digest());
ok(popup.isClosed() && /grant_type=authorization_code/.test(tokenBody) && /code=CODE-123/.test(tokenBody) && verifier.length >= 43 && s256 === challenge,
  '2 Microsoft’s own window, the code sent back and the token asked for with its PKCE verifier (S256 matches the challenge)');
ok(/Signed in as Pat Example \(pat@example-foods\.co\.uk\)/.test(await t.words('[data-ms-who]')), `2 "${await t.words('[data-ms-who]')}"`);

/* ---- 3 · Recent and My files ---- */
await page.locator('[data-ms-item]').first().waitFor({ timeout: 10000 });
ok((await page.locator('[data-ms-item]').allInnerTexts()).some(x => /Weekly KPIs\.xlsx/.test(x)) && graphSeen.every(g => g.auth === 'Bearer AT-1'), '3 Recent lists the files, asked with the token');
await page.getByRole('tab', { name: 'My files' }).click(); await page.waitForTimeout(800);
const mine = (await page.locator('[data-ms-item]').evaluateAll(es => es.map(e => e.getAttribute('data-ms-item'))));
ok(mine.join(' | ') === 'Locked | Reports | Notes.xlsx', `3 folders first, then the files Faultline can read — no picture (${mine.join(' | ')})`);
await page.locator('[data-ms-item="Reports"]').click(); await page.waitForTimeout(800);
ok(/My files › Reports/.test(await t.words('[data-ms-where]')) && (await page.locator('.msp-back').count()) === 1, '3 a folder opened, its path said and the way back');
await page.locator('[data-ms-item="Old summary.xls"]').click(); await page.waitForTimeout(300);
ok(/older Excel format/.test(await t.words('[data-ms-error]')), '3 an older .xls said why it cannot be read');

/* ---- 4 · a workbook chosen and read ---- */
const before = await page.locator('.ai-turn.is-colleague [data-ai-code]').count();
await page.locator('[data-ms-item="Shift report September.xlsx"]').click();
await page.waitForFunction(n => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > n, before, { timeout: 60000 }).catch(() => undefined);
await page.waitForTimeout(800);
ok((await page.locator('[data-ms-picker]').count()) === 0, '4 the picker closes once the file is downloaded');
const look = (await page.locator('.ai-turn.is-colleague').last().innerText()).replace(/\s+/g, ' ');
ok((await page.locator('.ai-turn.is-colleague [data-ai-code]').count()) > before && /Done in the app/i.test(await page.locator('.ai-turn.is-colleague').last().innerText()) || /Done/.test(look), `4 the first look is Luna’s turn worked in code (${look.slice(0, 120)}…)`);
ok(asks.length === 0, `4 no request to the gateway (${asks.length})`);
const src = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const s = (await db.listAllStudies()).find(x => x.tool === 'source' && x.facts?.source?.fileName === 'Shift report September.xlsx');
  return s?.facts?.source;
});
ok(src?.origin?.kind === 'microsoft' && src.origin.driveId === 'D1' && src.origin.itemId === 'W1' && src.origin.eTag === '"{W1},1"' && src.origin.path === 'My files › Reports › Shift report September.xlsx',
  `4 in the register with where it came from — ${JSON.stringify(src?.origin ?? null)}`);

/* ---- 5 · SharePoint ---- */
await plus();
await page.getByRole('tab', { name: 'SharePoint' }).click(); await page.waitForTimeout(300);
await page.getByLabel('Find a SharePoint site').fill('Operations'); await page.getByRole('button', { name: 'Find sites' }).click(); await page.waitForTimeout(800);
await page.locator('[data-ms-site="Operations"]').click(); await page.waitForTimeout(900);
ok((await page.locator('[data-ms-item="Downtime log.csv"]').count()) === 1 && /Operations/.test(await t.words('[data-ms-where]')), '5 a site found by name, its library listed');

/* ---- 6 · refused by Microsoft ---- */
await page.getByRole('tab', { name: 'My files' }).click(); await page.waitForTimeout(700);
const e0 = t.errors.length;
await page.locator('[data-ms-item="Locked"]').click(); await page.waitForTimeout(800);
ok(/IT administrator to approve Faultline/.test(await t.words('[data-ms-error]')), `6 a 403 said in words: "${await t.words('[data-ms-error]')}"`);
/* the browser logs the refusal this step plays on purpose — that one entry, and only it, is not an error of the app's */
for (let i = t.errors.length - 1; i >= e0; i--) if (/status of 403/.test(t.errors[i])) { t.errors.splice(i, 1); break; }

/* ---- 8 · the phone (before signing out) ---- */
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
await plus();
await page.getByRole('tab', { name: 'My files' }).click(); await page.waitForTimeout(800);
const rows = await page.locator('.msp-row, .msp-view').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
ok(rows.length > 3 && rows.every(h => h >= 44) && (await t.wide()) <= 0, `8 the phone: every row and tab 44 px or more (${Math.min(...rows)}), nothing off the side`);

/* ---- 9 · Files Luna can read (X2) ---- */
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
await page.setViewportSize({ width: 1440, height: 900 }); await page.waitForTimeout(600);
await openLunaContext(page); await openLunaFolds(page, ['luna-files']);
const fileRow = page.locator('[data-luna-files] [data-luna-file]').first();
ok(/SharePoint or OneDrive · My files › Reports › Shift report September\.xlsx · read/.test(await fileRow.locator('[data-luna-file-where]').innerText()), `9 the file listed beside Luna with where it came from: "${await fileRow.locator('[data-luna-file-where]').innerText()}"`);
await fileRow.locator('[data-luna-file-check]').click(); await page.waitForTimeout(800);
ok((await fileRow.locator('[data-luna-file-same]').count()) === 1, '9 Check for a newer version — the same version said');
version.eTag = '"{W1},2"'; version.at = '2026-11-20T07:30:00Z';
await page.reload(); await page.waitForTimeout(3000);
await openLunaContext(page); await openLunaFolds(page, ['luna-files']);
const row2 = page.locator('[data-luna-files] [data-luna-file]').first();
await row2.locator('[data-luna-file-check]').click(); await page.waitForTimeout(800);
ok(/A newer version — changed 20 Nov/.test(await row2.locator('[data-luna-file-newer]').innerText().catch(() => '')), '9 Microsoft’s copy changed: a newer version said');
const before9 = await page.locator('.ai-turn.is-colleague [data-ai-code]').count();
await row2.locator('[data-luna-file-read]').click();
await page.waitForFunction(n => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > n, before9, { timeout: 60000 }).catch(() => undefined);
await page.waitForTimeout(800);
const again = (await page.locator('.ai-turn.is-colleague').last().innerText()).replace(/\s+/g, ' ');
ok((await page.locator('.ai-turn.is-colleague [data-ai-code]').count()) > before9 && /Since “Shift report September\.xlsx”|since/i.test(again), `9 Read it: downloaded and read again, compared with the first (${again.slice(0, 140)}…)`);
const kept9 = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(x => x.tool === 'source' && x.facts?.source?.origin?.itemId === 'W1').map(x => x.facts.source.origin.eTag));
ok(kept9.includes('"{W1},2"'), `9 the newer version kept with its own version (${kept9.join(', ')})`);
ok(asks.length === 0, `9 still no request to the gateway (${asks.length})`);
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
await plus();

/* ---- 10 · several at once, on the phone ---- */
await page.getByRole('tab', { name: 'My files' }).click(); await page.waitForTimeout(800);
await page.locator('[data-ms-item="Reports"]').click(); await page.waitForTimeout(800);
await page.locator('[data-ms-item="Monthly"]').click(); await page.waitForTimeout(800);
const tickBoxes = await page.locator('.msp-tick').evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return Math.min(r.width, r.height); }));
ok(tickBoxes.length === 2 && tickBoxes.every(h => h >= 44), `10 a tick beside each workbook, a thumb's size (${tickBoxes.join(', ')})`);
await page.locator('[data-ms-tick="shift-report-april.xlsx"]').check(); await page.locator('[data-ms-tick="shift-report-march.xlsx"]').check(); await page.waitForTimeout(300);
ok(/2 workbooks ticked/.test(await t.words('[data-ms-ticked]')), `10 "${await t.words('[data-ms-ticked]')}"`);
const before10 = await page.locator('.ai-turn.is-colleague [data-ai-code]').count();
const turns10 = await page.locator('.ai-turn.is-colleague').count();
await page.locator('[data-ms-read-ticked]').click();
await page.waitForFunction(n => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length >= n + 3, before10, { timeout: 90000 }).catch(() => undefined);
await page.waitForTimeout(900);
const said10 = (await page.locator('.ai-turn.is-colleague').allInnerTexts()).slice(turns10).map(x => t.norm(x));
const looks10 = said10.filter(x => /The one worth analysing|I have taken/.test(x));
ok(looks10.map(x => (/shift-report-(march|april)\.xlsx/.exec(x) ?? [])[1]).join(' ') === 'march april', `10 read in the order of their own dates: ${looks10.map(x => (/shift-report-(march|april)/.exec(x) ?? [])[1]).join(', ')}`);
ok((looks10[1] ?? '').includes(t.norm('Since “shift-report-march.xlsx”')), '10 April says what changed since March');
ok(said10.some(x => /I read the 2 workbooks in the order of their own dates/.test(x)), '10 the closing line says the order');
const origins10 = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(x => x.tool === 'source' && /shift-report-(march|april)/.test(x.facts?.source?.fileName ?? '')).map(x => `${x.facts.source.origin?.itemId} ${x.facts.source.origin?.path}`).sort());
ok(origins10.join(' | ') === 'M-april My files › Reports › Monthly › shift-report-april.xlsx | M-march My files › Reports › Monthly › shift-report-march.xlsx', `10 each in the register with its own origin and path (${origins10.join(' | ')})`);
ok(asks.length === 0, `10 no request to the gateway (${asks.length})`);
await plus();

/* ---- 7 · Sign out ---- */
await page.locator('[data-ms-who] .linkish').click(); await page.waitForTimeout(400);
ok((await page.locator('[data-ms-signin-go]').count()) === 1 && await page.evaluate(() => localStorage.getItem('faultline.ms.session')) === null, '7 Sign out forgets the sign-in on this device');

/* ---- 11 · ready to connect, for everyone ---- */
await page.setViewportSize({ width: 1440, height: 900 });
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
const ID2 = '22222222-1234-5678-9abc-1234567890ab';
let savedForEveryone = '', saves = 0;
/* the administrator (profiles.is_super) and Faultline's own settings (supabase/APP_SETTINGS.sql), played as the cloud answers them */
await ctx.route('**/rest/v1/profiles*', r => r.request().method() === 'OPTIONS' ? r.fulfill({ status: 204, headers: CORS })
  : r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ id: 'me', email: 'admin@example-foods.co.uk', is_super: true, created_at: '2026-11-01T00:00:00Z' }) }));
await ctx.route('**/rest/v1/app_settings*', async r => {
  const m = r.request().method();
  if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: { ...CORS, 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
  if (m === 'POST') { saves += 1; savedForEveryone = JSON.parse(r.request().postData() ?? '{}').value ?? ''; return r.fulfill({ status: 201, headers: CORS, body: '' }); }
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(savedForEveryone ? [{ key: 'microsoft_client_id', value: savedForEveryone }] : []) });
});
await page.evaluate(() => { localStorage.removeItem('faultline.ms.clientId'); localStorage.removeItem('faultline.app.settings'); localStorage.removeItem('faultline.ms.tested'); });
await t.go('#/factory/data', 2500);
ok(/Not set up/.test(await t.words('[data-ms-card]')) && (await t.words('[data-ms-connect]')) === 'Set up', `11 nothing set up: the card says so, its button Set up ("${await t.words('[data-ms-card]')}")`);
await page.locator('[data-ms-connect]').click(); await page.waitForTimeout(800);
ok((await page.locator('[data-ms-stage="none"]').count()) === 1 && (await page.locator('[data-ms-step]').count()) === 4 && (await page.locator('[data-ms-step-done="yes"]').count()) === 0 && (await page.locator('[data-ms-page]').count()) === 1 && (await page.locator('.sheet[aria-label="Connect to Microsoft"]').count()) === 0, '11 the page: Not set up, four numbered steps, none done — not a sheet');
ok(/curl -fsSL https:\/\/faultline\.opexelevate\.co\.uk\/microsoft-setup\.sh \| bash/.test(await t.words('[data-ms-copy="Paste in Cloud Shell"]')) && (await page.locator('[data-ms-cloud-shell]').getAttribute('href')) === 'https://shell.azure.com/bash',
  '11 step 1 is automatic: one line to paste, with its Copy, and Open Azure Cloud Shell');
await page.locator('[data-fold="ms-register"] .fold-toggle').click(); await page.waitForTimeout(300);
ok((await page.locator('[data-ms-copy="Redirect URI"]').count()) >= 1 && (await page.locator('[data-ms-copy="Permissions"]').count()) === 1, '11 by hand, in its fold: each value to put into Microsoft has its Copy');
/* the link the set-up prints (public/microsoft-setup.sh): the sheet open with the ID in hand — one press from saved */
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
await t.go(`#/factory/data?ms=1&id=${ID2}`, 3000);
ok((await page.locator('[data-ms-brought]').count()) === 1 && /ending 90ab came with the link/.test(await t.words('[data-ms-brought]')) && (await page.locator('[data-ms-id]').inputValue()) === ID2 && savedForEveryone === '',
  '11 the set-up’s link opens the page with the ID in the box — nothing saved before the press');
await page.locator('[data-ms-save-everyone]').click(); await page.waitForTimeout(1200);
ok(savedForEveryone === ID2 && saves === 1, `11 the administrator saves it ONCE FOR EVERYONE — sent to Faultline's settings (${savedForEveryone})`);
ok((await page.locator('[data-ms-stage="ready"]').count()) === 1 && /ending 90ab, saved for everyone/.test(await t.words('[data-ms-hero-says]')) && (await page.locator('[data-ms-step="1"][data-ms-step-done="yes"], [data-ms-step="2"][data-ms-step-done="yes"]').count()) === 2,
  `11 Ready — steps 1 and 2 ticked ("${await t.words('[data-ms-hero-says]')}")`);
/* another device: nothing typed there — Faultline's settings read on start */
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await page.evaluate(() => { localStorage.removeItem('faultline.app.settings'); localStorage.removeItem('faultline.ms.clientId'); });
await t.go('#/factory/data', 500); await page.reload(); await page.waitForTimeout(3000);   /* a real start, as another device's */
ok(/Ready/.test(await t.words('[data-ms-card]')) && (await t.words('[data-ms-connect]')) === 'Connect' && await page.evaluate(() => localStorage.getItem('faultline.ms.clientId')) === null,
  '11 another device, nothing typed: ready from the setting read on start — the card Ready, its button Connect');
await page.locator('[data-ms-connect]').click(); await page.waitForTimeout(800);
/* a registration missing its redirect: Microsoft's AADSTS50011, said as what to add and where */
authorizeError = 'AADSTS50011: The redirect URI specified in the request does not match the redirect URIs configured for the application.';
const [p11] = await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }), page.locator('[data-ms-test]').click()]);
await page.locator('[data-ms-test-why]').waitFor({ timeout: 15000 }).catch(() => undefined);
ok(/Add http:\/\/[^ ]+\/ms-auth\.html as a Single-page application redirect URI \(step 1\)/.test(await t.words('[data-ms-test-why]')), `11 a missing redirect said as what to add (${await t.words('[data-ms-test-why]')})`);
void p11;
authorizeError = '';
await Promise.all([ctx.waitForEvent('page', { timeout: 15000 }), page.locator('[data-ms-test]').click()]);
await page.locator('[data-ms-tested]').waitFor({ timeout: 15000 }).catch(() => undefined);
ok(/signed in as Pat Example; Microsoft listed 1 recent file Faultline can read/.test(await t.words('[data-ms-tested]')) && (await page.locator('[data-ms-stage="connected"]').count()) === 1 && (await page.locator('[data-ms-step="3"][data-ms-step-done="yes"]').count()) === 1,
  `11 Test the connection: signed in, what Microsoft listed said, step 3 ticked, Connected ("${await t.words('[data-ms-tested]')}")`);
await page.locator('[data-ms-approval] summary').click();
await page.locator('[data-ms-domain]').fill('not a domain');
ok(!await page.getByRole('link', {name: /Open Microsoft approval/}).count(), '11 an invalid domain produces no approval URL');
await page.locator('[data-ms-domain]').fill('example-foods.co.uk');
ok(await page.getByRole('link', {name: /Open Microsoft approval/}).getAttribute('href') === `https://login.microsoftonline.com/example-foods.co.uk/adminconsent?client_id=${ID2}`, '11 approval opens Microsoft for the named business');
ok((await t.words('[data-ms-copy="Approval link"] .ms-copy-v')) === `https://login.microsoftonline.com/example-foods.co.uk/adminconsent?client_id=${ID2}`, '11 a client’s approval link made with their domain and the ID');
await page.locator('[data-ms-page] .part-back').click(); await page.waitForTimeout(800);
ok(/Connected/.test(await t.words('[data-ms-card]')) && /Pat Example/.test(await t.words('[data-ms-card-state]')) && (await t.words('[data-ms-connect]')) === 'Manage', '11 the card: Connected as Pat Example, its button Manage');
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
await page.locator('[data-ms-connect]').click(); await page.waitForTimeout(800);
ok((await page.locator('[data-ms-page]').count()) === 1 && (await page.locator('.sheet[aria-label="Connect to Microsoft"]').count()) === 0, '11 the phone: Microsoft is the page, not a sheet');
const press11 = await page.locator('[data-ms-sheet] .ms-acts .btn, [data-ms-sheet] .ms-copy .btn').evaluateAll(es => es.filter(e => e.offsetParent).map(e => Math.round(e.getBoundingClientRect().height)));
ok((await t.wide()) <= 0 && press11.length > 2 && press11.every(h => h >= 36), `11 the phone: nothing off the side, its presses ${Math.min(...press11)} px or more`);
await page.locator('[data-ms-page] .part-back').click(); await page.waitForTimeout(300);

await t.finish('Connect to Microsoft accepted: registered, signed in by PKCE in Microsoft’s own window, a workbook chosen from OneDrive downloaded and read as an upload with no AI request, its origin kept, SharePoint found, a refusal said, signed out, the phone.');
