/* A FILE BY ITS LINK, AGAINST THE REAL INTERNET (21 November 2026, docs/CONNECTED-LUNA.md X1b — Rowland: "create an environment where you
 * can test that approach, that it actually works … test the fact that if this was shared, this is exactly how it would happen. And oh no,
 * she didn't get access").
 *
 * Not a gate step: it needs the network and the database's own check key. It calls the DEPLOYED `link` function — the same code the app
 * calls, on Supabase's servers, fetching across the real internet — with real links, and says what came back for each:
 *   a file          its name, size, what it is, and (a workbook) its sheets read from the bytes themselves;
 *   no access       the function's own words — what Luna says to the person.
 * Each case says what is expected of it (a file, or one of the refusals); a case that answers otherwise FAILS, so this is evidence and
 * not a demonstration. With --app it then drives the real app in a test browser with the real function behind it (its request forwarded
 * with the check key, as scripts/eval/luna-real.mjs does for the AI gateway) and takes pictures: a real link read by Luna, and a real
 * SharePoint address that is not shared with her.
 *
 *   LINK_CHECK_KEY=… NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt node scripts/eval/link-real.mjs OUT_DIR [--app] [--link URL …]
 * LINK_CHECK_KEY is push_keys.cron_key — read from the database by whoever runs this, never written to a file or a commit. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';

const args = process.argv.slice(2);
const OUT = args.find(a => !a.startsWith('--') && !/^https:/.test(a)) ?? 'link-real-out';
const APP = args.includes('--app');
const extra = args.filter(a => /^https:/.test(a));
const KEY = process.env.LINK_CHECK_KEY ?? '';
if (KEY.length < 20) { console.error('LINK_CHECK_KEY is not set (push_keys.cron_key, read from the database).'); process.exit(2); }
const FN = process.env.LINK_EVAL_URL ?? 'https://eqdigvzbljofxznqtfia.supabase.co/functions/v1/link';
/* the project's public (anon) key — the same one the app is built with; it only lets the request reach the function. Read from the
   AI check's own script, so it is written in one place */
const ANON = process.env.LUNA_EVAL_ANON ?? (/const ANON = process\.env\.LUNA_EVAL_ANON \?\? '([^']+)'/.exec(readFileSync(new URL('./luna-real.mjs', import.meta.url), 'utf8'))?.[1] ?? '');
if (!ANON) { console.error('The project’s public key could not be read from scripts/eval/luna-real.mjs.'); process.exit(2); }
mkdirSync(OUT, { recursive: true });

const ask = async (url, key = KEY) => {
  const res = await fetch(FN, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${ANON}`, apikey: ANON, ...(key === null ? {} : { 'x-check-key': key }) }, body: JSON.stringify({ url }) });
  if (res.ok) {
    const bytes = new Uint8Array(await res.arrayBuffer());
    const name = decodeURIComponent(res.headers.get('x-link-name') ?? '');
    return { ok: true, status: res.status, bytes, name, kind: res.headers.get('x-link-kind'), service: res.headers.get('x-link-service'), host: res.headers.get('x-link-host') };
  }
  let j = {};
  try { j = await res.json(); } catch { /* not ours */ }
  return { ok: false, status: res.status, code: j.code ?? '', why: j.why ?? j.message ?? j.msg ?? '' };
};
/** What a workbook's bytes hold, read from the bytes themselves — its sheets by name. */
const sheetsOf = bytes => { try { const z = unzipSync(bytes, { filter: f => f.name === 'xl/workbook.xml' }); const x = strFromU8(z['xl/workbook.xml'] ?? new Uint8Array()); return [...x.matchAll(/<sheet\b[^>]*\bname="([^"]*)"/g)].map(m => m[1]); } catch { return []; } };

/* Real links. `want` is a file, or the refusal expected; several where a service may answer in more than one honest way. */
const CASES = [
  { what: 'A Google Sheet shared with anyone who has the link (Google’s own sample sheet)', url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing', want: ['file'] },
  /* REAL ONEDRIVE, SHARED WITH ANYONE WHO HAS THE LINK — the sample link published in Deepnote's own OneDrive documentation. If its
     owner ever un-shares it this case fails and says so: find another published link, never loosen what is wanted of it. */
  { what: 'REAL OneDrive, a workbook shared with anyone who has the link (a published sample link)', url: 'https://1drv.ms/x/s!AjP7y6eiYDDSafV7BusEaDHrI0o?e=cL0Fqi', want: ['file'] },
  { what: 'A Google Sheet that does not exist, or is not shared', url: 'https://docs.google.com/spreadsheets/d/1ZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZzZz/edit', want: ['gone', 'sign-in', 'page'] },
  { what: 'A workbook Microsoft itself gives out by a link (its Financial Sample)', url: 'https://go.microsoft.com/fwlink/?LinkID=521962', want: ['file'] },
  { what: 'A CSV on the open web', url: 'https://raw.githubusercontent.com/plotly/datasets/master/gapminderDataFiveYear.csv', want: ['file'] },
  { what: 'REAL SharePoint, a sharing link NOT shared with Luna (Microsoft’s own SharePoint)', url: 'https://microsoft.sharepoint.com/:x:/s/packing-hall/EaBcDeFgHiJkLmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPq?e=AbC123', want: ['sign-in', 'gone'] },
  { what: 'REAL SharePoint, a person’s OneDrive for work NOT shared with Luna', url: 'https://microsoft-my.sharepoint.com/:x:/g/personal/someone_microsoft_com/EaBcDeFgHiJkLmNoPqRsTuVwXyZaBcDeFgHiJkLmNoPq?e=AbC123', want: ['sign-in', 'gone'] },
  { what: 'REAL SharePoint, a file’s own address in a site — there, but only for people signed in to that organisation', url: 'https://microsoft.sharepoint.com/sites/packing/Shared%20Documents/Shift%20report.xlsx', want: ['sign-in', 'gone'] },
  { what: 'REAL SharePoint, the organisation’s own front page — only for people signed in', url: 'https://microsoft.sharepoint.com/_layouts/15/sharepoint.aspx', want: ['sign-in'] },
  { what: 'REAL OneDrive (personal), a link that points at nothing', url: 'https://1drv.ms/x/s!AaBbCcDdEeFfGgHhIiJj', want: ['gone', 'sign-in', 'page', 'service'] },
  { what: 'A web page, not a file', url: 'https://www.bbc.co.uk/news', want: ['page'] },
  { what: 'An address inside a private network (the cloud’s own metadata address)', url: 'https://169.254.169.254/latest/meta-data/', want: ['address'] },
  { what: 'Plain http', url: 'http://example.com/report.xlsx', want: ['address'] },
  ...extra.map(url => ({ what: 'A link given on the command line', url, want: ['file'] })),
];

let failed = 0;
const rows = [];
console.log(`The deployed link function: ${FN}\n`);
/* nobody signed in and no check key: refused */
{ const r = await ask('https://example.com/a.xlsx', null); const good = !r.ok && r.status === 401; if (!good) failed++; console.log(`${good ? 'PASS' : 'FAIL'}  nobody signed in, no key → refused (${r.status} ${r.why})`); }
{ const r = await ask('https://example.com/a.xlsx', 'not-the-key-not-the-key-not-the-key'); const good = !r.ok && r.status === 401; if (!good) failed++; console.log(`${good ? 'PASS' : 'FAIL'}  a wrong key → refused (${r.status})`); }

for (const [i, c] of CASES.entries()) {
  let r;
  try { r = await ask(c.url); } catch (e) { r = { ok: false, status: 0, code: 'unreachable', why: String(e?.message ?? e) }; }
  const got = r.ok ? 'file' : r.code || `http-${r.status}`;
  const good = c.want.includes(got);
  if (!good) failed++;
  let said;
  if (r.ok) {
    const sheets = r.kind === 'zip' ? sheetsOf(r.bytes) : [];
    const lines = r.kind === 'csv' ? strFromU8(r.bytes).split(/\r?\n/).filter(Boolean).length : 0;
    said = `“${r.name}” — ${r.bytes.length.toLocaleString('en-GB')} bytes, ${r.kind}${sheets.length ? `, ${sheets.length} sheet${sheets.length === 1 ? '' : 's'}: ${sheets.slice(0, 6).join(' · ')}` : ''}${lines ? `, ${lines.toLocaleString('en-GB')} lines` : ''} (from ${r.host}; fingerprint ${createHash('sha256').update(r.bytes).digest('hex').slice(0, 12)}…)`;
    writeFileSync(join(OUT, `case-${i + 1}-${r.name.replace(/[^A-Za-z0-9._-]+/g, '_')}`), r.bytes);
  } else said = `${got} — Luna says: “${r.why}”`;
  rows.push({ ...c, got, good, said });
  console.log(`${good ? 'PASS' : 'FAIL'}  ${c.what}\n      ${c.url}\n      → ${said}${good ? '' : `\n      EXPECTED ${c.want.join(' or ')}`}\n`);
}
writeFileSync(join(OUT, 'results.json'), JSON.stringify(rows.map(({ what, url, want, got, good, said }) => ({ what, url, want, got, good, said })), null, 2));

/* ---- the real app, with the real function behind it ---- */
if (APP) {
  const { openApp } = await import('../lib/tocBrowser.mjs');
  const t = await openApp({ width: 412, height: 915 });
  const { page } = t;
  await t.seed();
  const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-expose-headers': 'x-link-name, x-link-kind, x-link-service, x-link-host, x-link-etag, x-link-modified, x-link-size' };
  let aiAsks = 0;
  await page.route('**/functions/v1/assist', async r => { const b = r.request().postDataJSON(); if (b?.task !== 'budget') aiAsks++; return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not asked in this test' }) }); });
  await page.route('**/functions/v1/link', async r => {
    if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
    const res = await fetch(FN, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${ANON}`, apikey: ANON, 'x-check-key': KEY }, body: r.request().postData() ?? '{}' });
    const headers = { ...CORS };
    for (const h of ['content-type', 'x-link-name', 'x-link-kind', 'x-link-service', 'x-link-host', 'x-link-etag', 'x-link-modified', 'x-link-size']) { const v = res.headers.get(h); if (v) headers[h] = v; }
    return r.fulfill({ status: res.status, headers, body: Buffer.from(await res.arrayBuffer()) });
  });
  const open = async () => { await t.go('#/ai', 2500); await page.locator('.ai-plus').click(); await page.locator('[data-connect-open]').click(); await page.locator('[data-connect-to="link"]').click(); await page.locator('[data-link-sheet]').waitFor(); };
  const say = (good, m) => { if (!good) failed++; console.log(`${good ? 'PASS' : 'FAIL'}  ${m}`); };

  /* she gets the file */
  const fileCase = rows.find(x => x.got === 'file' && /1drv\.ms|onedrive|sharepoint/.test(x.url)) ?? rows.find(x => x.got === 'file' && /spreadsheets|fwlink/.test(x.url)) ?? rows.find(x => x.got === 'file');
  if (fileCase) {
    await open();
    await page.locator('[data-link-url]').fill(fileCase.url);
    await page.screenshot({ path: join(OUT, 'app-1-link-pasted.png') });
    const before = await page.locator('.ai-turn.is-colleague [data-ai-code]').count();
    await page.locator('[data-link-read]').click();
    await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > k, before, { timeout: 90000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
    const look = (await page.locator('.ai-turn.is-colleague').last().innerText().catch(() => '')).replace(/\s+/g, ' ');
    await page.screenshot({ path: join(OUT, 'app-2-read-by-luna.png') });
    say((await page.locator('.ai-turn.is-colleague [data-ai-code]').count()) > before && look.length > 40, `the real app, a real link (${fileCase.url.slice(0, 60)}…): fetched by the real function and read by Luna — “${look.slice(0, 220)}…”`);
    say(aiAsks === 0, `no request to the AI service (${aiAsks})`);
  } else say(false, 'no real link gave a file, so the app could not be shown reading one');

  /* she does not get access */
  const noCase = rows.find(x => /sharepoint\.com/.test(x.url) && x.got === 'sign-in') ?? rows.find(x => /sharepoint\.com/.test(x.url) && x.got !== 'file');
  if (noCase) {
    await open();
    await page.locator('[data-link-url]').fill(noCase.url);
    await page.locator('[data-link-read]').click();
    await page.locator('[data-link-err]').waitFor({ timeout: 90000 }).catch(() => undefined);
    const err = (await page.locator('[data-link-err]').innerText().catch(() => '')).replace(/\s+/g, ' ');
    await page.screenshot({ path: join(OUT, 'app-3-no-access.png') });
    say(err.length > 20 && (await page.locator('[data-link-sheet]').count()) === 1, `the real app, real SharePoint not shared with her: nothing read, and she says — “${err}”`);
  }
  await t.browser?.close?.();
}

console.log(failed ? `\n${failed} did not go as expected` : '\nEvery real link went as expected.');
process.exit(failed ? 1 : 0);
