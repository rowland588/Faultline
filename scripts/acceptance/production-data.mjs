/* PRODUCTION DATA FROM THE BUSINESS'S OWN SYSTEMS, driven (11 November, docs/DATA-CONNECTIONS.md — Rowland: "Production data
 * connectivity is a core platform capability … so she can answer why we missed target yesterday … Retain data provenance, apply
 * calculations through the app's own deterministic logic and distinguish actual system data from reported or estimated information").
 * The gateway is played by the script; every figure is checked against figures worked by hand below.
 *
 *   1  Set up's door → Set up › Data connections; nothing yet said so; Add a connection the one primary
 *   2  a push connection made on Packing Line 2 — the token shown ONCE (luna_ + 43), how it stands said; on this device no token
 *      anywhere, only its SHA-256 waiting to be sent; "I have kept it" and the token never shown again — its last four only
 *   3  a CSV the MES made brought in through the app's own import path (the core the ingest function runs): 2 of 4 kept, the line
 *      "PK-9" and the row with no id refused with why; the rows on the line; health in words; brought in again — 0 new, 2 replaced,
 *      still 2 rows (the system's id makes a row sent twice one row)
 *   4  a pull refused for an address it may not fetch (http, a private address)
 *   5  Luna: "why did we miss target yesterday on Packing Line 2?" — production_gap and source_fields through the gateway: by hand
 *      90,000 target, 81,800 delivered, 8,200 short; Film break 50 min, Jam 10 min; £2,870.00 of contribution (8,200 × £0.35) and
 *      £60.00 of idle labour (60 min × 4 × £15), kept apart; how known: system; the token never sent to the gateway
 *   6  the phone at 390: nothing off the side, presses 44 px
 *
 *   node scripts/acceptance/production-data.mjs   (SMOKE_BASE, as smoke) */
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
if (process.env.DEBUG_403) page.on('response', r => { if (r.status() === 403) console.log('403', r.url()); });
await page.goto(`${process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191'}/#/room`); await page.waitForTimeout(2500);

/* Packing Line 2 with its crew and margin — the cost model's inputs */
const L = await page.evaluate(async () => {
  const [{ addLineToFactory }, d] = await Promise.all([import('/src/lib/lines.ts'), import('/src/db.ts')]);
  const w = await addLineToFactory('Packing Line 2');
  await d.updateWorkspace({ ...w, crew: 4, labourRatePerHour: 15, marginPerPack: 0.35 });
  return w.id;
});
const DAY = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

/* ---- 1 · the door and the empty page ---- */
await t.go('#/factory', 2500);
const door = page.locator('[data-dc-door]');
ok((await door.count()) === 1 && /Data connections/.test(await door.innerText()) && /Connect your MES, ERP or monitoring system/.test(await door.innerText()), `1 Set up's door: "${(await door.innerText()).replace(/\s+/g, ' ')}"`);
await door.click(); await page.waitForTimeout(1500);
ok(page.url().endsWith('#/factory/data'), '1 the door opens Set up › Data connections');
ok(/^None yet\. Connect your MES, ERP or monitoring system/.test(await t.words('[data-dc-says]')), '1 nothing yet, said so');
ok((await page.locator('.part-head .btn-primary').count()) === 1 && (await page.locator('.part-head .btn-primary').innerText()) === 'Add a connection', '1 Add a connection — the one primary');
ok((await t.words('.nv-tabs .nv-tab.is-on')) === 'Set up', '1 the Set up tab lit');

/* ---- 2 · a push connection and its token, once ---- */
await page.locator('.part-head .btn-primary').click();
await page.getByLabel('The connection’s name').fill('MES shift totals');
await page.getByLabel('The system').fill('the MES');
await page.getByLabel('The connection’s line').selectOption(L);
await page.getByRole('button', { name: 'Make it and its token' }).click();
await page.waitForSelector('[data-dc-token]', { timeout: 20000 });
const token = (await page.locator('[data-dc-token]').innerText()).trim();
ok(/^luna_[A-Za-z0-9_-]{43}$/.test(token), `2 the token shown: luna_ and 43 characters (${token.slice(0, 9)}…)`);
ok(/shown this once/.test(await t.words('[data-dc-token-once]')) && /works once this device has reached the cloud/.test(await t.words('[data-dc-token-state]')), '2 said: shown once; works once this device reaches the cloud (no cloud here)');
const held = await page.evaluate(async () => {
  const { getDB } = await import('/src/db/core.ts');
  const db = await getDB();
  return { conns: await db.getAll('data_connections'), pending: await db.get('meta', 'dataTokenPending') };
});
const hash = createHash('sha256').update(token).digest('hex');
ok(!JSON.stringify(held).includes(token) && !JSON.stringify(held).includes(token.slice(5, 30)), '2 the token is nowhere on this device');
ok(held.conns.length === 1 && Object.values(held.pending ?? {})[0] === hash && held.conns[0].tokenHint === token.slice(-4), '2 only its SHA-256 waits to be sent; the connection keeps its last four');
await page.getByRole('button', { name: 'I have kept it' }).click();
await page.waitForTimeout(500);
await page.reload(); await page.waitForTimeout(2200);
const body1 = await page.locator('body').innerText();
ok(!body1.includes(token) && new RegExp(`…${token.slice(-4).replace(/[-_]/g, m => `\\${m}`)}`).test(body1), '2 never shown again — the page names it by its last four');
ok(/Waiting\s+the token works once this device has reached the cloud/.test(await t.words('[data-dc-health-one]')), `2 health in words: "${await t.words('[data-dc-health-one]')}"`);

/* ---- 3 · a file the MES made, brought in through the app's own import path ---- */
const dir = mkdtempSync(join(tmpdir(), 'dc-'));
const csv = join(dir, 'mes-shifts.csv');
writeFileSync(csv, [
  'id,line,day,shift,product,planned_minutes,run_minutes,output,target,good,rejects,downtime_minutes,downtime_reason',
  `${DAY}-D,Packing Line 2,${DAY},Days,Crisps 6x25g,450,400,38000,45000,,400,50,Film break`,
  `${DAY}-N,,${DAY},Nights,Crisps 6x25g,450,440,44500,45000,44200,300,10,Jam`,
  `${DAY}-X,PK-9,${DAY},Days,Crisps 6x25g,450,450,40000,45000,,,0,`,
  `,Packing Line 2,${DAY},Days,Crisps 6x25g,,,1,1,,,,`,
].join('\n'));
const bring = async () => {
  const f = page.locator('[data-fold^="dc-bring-"]');
  if (!(await f.evaluate(e => e.classList.contains('is-open')))) await f.locator('button').first().click();
  await page.getByLabel('A CSV or JSON file from the system').setInputFiles(csv);
  await page.waitForSelector('[data-dc-brought]', { timeout: 10000 });
  await page.waitForTimeout(600);
  return t.words('[data-dc-brought]');
};
const said1 = await bring();
ok(/^2 of 4 rows kept, 2 refused \(row 3: line “PK-9” is not mapped to a line; row 4: no id — the system’s own id for the row is needed/.test(said1) && /2 new, 0 replaced/.test(said1), `3 brought in: "${said1.slice(0, 160)}"`);
ok(/Row 3: line “PK-9” is not mapped to a line/.test(said1) && /Row 4: no id/.test(said1), '3 each refused row listed with why');
ok((await page.locator('[data-dc-row]').count()) === 2, '3 the latest rows on the page — two');
ok(/^Healthy 2 rows on .*, 2 refused\.$/.test(await t.words('[data-dc-health-one]')), `3 health in words: "${await t.words('[data-dc-health-one]')}"`);
const onLine = await page.evaluate(async id => (await import('/src/db/production.ts')).listProduction(id), L);
ok(onLine.length === 2 && onLine.every(r => r.workspaceId === L && r.howKnown === 'system' && r.connectionId === held.conns[0].id), '3 both rows on Packing Line 2, how known: system, with their connection');
ok(onLine.find(r => r.shift === 'Days')?.good === undefined && onLine.find(r => r.shift === 'Days')?.rejects === 400, '3 a blank is not recorded — never zero (Days sent no good units)');
const said2 = await bring();
const again = await page.evaluate(async id => (await import('/src/db/production.ts')).listProduction(id), L);
ok(/0 new, 2 replaced/.test(said2) && again.length === 2, `3 brought in again: 0 new, 2 replaced — still ${again.length} rows`);

/* ---- 4 · a pull may not fetch what it must not ---- */
await t.go('#/factory/data', 1500);
await page.locator('.part-head .btn-primary').click();
await page.getByRole('radio', { name: 'Luna fetches' }).click();
await page.getByLabel('The connection’s name').fill('ERP orders');
for (const [u, why] of [['http://erp.example.com/api', /only https addresses are fetched/], ['https://169.254.169.254/latest', /private, loopback or link-local/], ['https://x.supabase.co/rest/v1/', /cannot be reached from Luna’s cloud/]]) {
  await page.getByLabel('The address to fetch').fill(u);
  await page.getByRole('button', { name: 'Make it', exact: true }).click();
  await page.waitForTimeout(300);
  ok(why.test(await t.words('.dc-add [role=alert]')), `4 ${u} refused: "${await t.words('.dc-add [role=alert]')}"`);
}
ok((await page.evaluate(async () => (await import('/src/db/production.ts')).listConnections())).length === 1, '4 nothing made');
await page.getByRole('button', { name: 'Cancel' }).click();

/* ---- 5 · Luna: why did we miss target yesterday ---- */
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const b = r.request().postDataJSON();
  asks.push(b);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(b) : { ok: true, reply: 'Noted.' }) });
});
const calls = (...cs) => () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: cs.map(([id, name, input]) => ({ id, name, input })) });
await t.go('#/ai', 2500);
plan = [
  calls(['g', 'production_gap', { lineId: L, from: DAY, to: DAY }], ['f', 'source_fields', { source: `production:${L}` }]),
  () => ({ ok: true, reply: 'Packing Line 2 delivered 81,800 against 90,000 yesterday — 8,200 short, most of it on Days (7,400), where the MES records 50 minutes of film breaks. These are the MES’s figures (system data).' }),
];
await page.locator('.ai-box').fill('Why did we miss target yesterday on Packing Line 2?');
await page.getByRole('button', { name: 'Send', exact: true }).click();
await page.waitForFunction(() => document.querySelectorAll('.ai-turn.is-colleague').length >= 1 && !document.querySelector('.ai-thinking'), null, { timeout: 20000 }).catch(() => undefined);
await page.waitForTimeout(800);
const gapAsk = asks.find(a => a.pending?.results?.[0]?.says);
const gap = gapAsk?.pending?.results?.[0] ?? {};
const fields = gapAsk?.pending?.results?.[1] ?? {};
ok(gap.ok && /— system data, not measured in the app — for \d{4}-\d{2}-\d{2}: 81,800 delivered against a target of 90,000; 8,200 units short on the rows that missed\./.test(gap.says), `5 production_gap by hand — 81,800 of 90,000, 8,200 short: "${(gap.says ?? '').slice(0, 170)}"`);
ok(/From the business’s production system \(MES shift totals, the MES\)/.test(gap.says ?? ''), '5 the connection and the system named');
ok(/Film break 50 min, Jam 10 min/.test(gap.says ?? '') && /the units short £2,870\.00 of contribution at £0\.35 a pack; the downtime £60\.00 of idle labour \(kept apart, never added to it\)/.test(gap.says ?? ''), '5 downtime by the system’s reasons; £2,870.00 and £60.00 through the cost model, kept apart');
ok(/Packing Line 2 [\d-]+ Days \(Crisps 6x25g\) 7,400 short; Packing Line 2 [\d-]+ Nights \(Crisps 6x25g\) 800 short/.test(gap.says ?? '') && /How known: system/.test(gap.says ?? ''), '5 the shortfalls largest first; how known: system');
ok(/how known \(text\): recorded on 2 of 2/.test(fields.says ?? '') && /System data — what the business’s production system recorded/.test(fields.says ?? ''), '5 source_fields on the production source: system data, said so');
ok(asks.length >= 2 && asks.every(a => !JSON.stringify(a).includes(token) && !JSON.stringify(a).includes(hash)), '5 neither the token nor its hash ever sent to the gateway');
ok(/8,200 short/.test(await t.words('.ai-turn.is-colleague:last-of-type')) || /8,200 short/.test(await page.locator('.ai-turn.is-colleague').last().innerText()), '5 Luna’s answer in the conversation');

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
for (const h of ['#/factory/data', `#/factory/data?c=${held.conns[0].id}`]) {
  await t.go(h, 2000);
  ok((await t.wide()) <= 0, `6 phone ${h}: nothing off the side (${await t.wide()} px)`);
  const small = await page.evaluate(() => [...document.querySelectorAll('.dc-page button, .dc-page .lt-row, .dc-page select, .dc-page input:not([type=file])')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44 && !b.closest('.fold-body')).map(b => (b.textContent || b.getAttribute('aria-label') || '').trim().slice(0, 30)));
  ok(small.length === 0, `6 phone ${h}: presses 44 px${small.length ? ` — ${small.join(' · ')}` : ''}`);
}

await t.finish('Production data proved: a push connection made with its token shown once and only its hash kept; a system file taken in through the same core the ingest function runs — kept by the system’s id, refused rows with why, health in words; a pull refused for an address it must not fetch; Luna’s missed-target answer worked by the app’s code, in money through the cost model, said as system data.');
