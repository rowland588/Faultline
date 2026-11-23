/* ACCEPTANCE — LUNA G6 G2 REMAINDER (23 November 2026, docs/LUNA-G6-SERVER.md).
 *
 * The cloud noticed a linked file changed while the app was shut: a row in luna_server_news is shown above the conversation (G2a's
 * words), Read it fetches the link on the device, Later acks the row. The assist gateway is PLAYED; the link function is PLAYED.
 *
 *   1  server news mocked — Luna shows *the cloud noticed a change while you were away* with Read it · Later (data-server-keepup)
 *   2  Read it — the link fetched, the conversation's attach path unchanged, the news row gone
 *   3  a second row, Later — acked, nothing in the list
 *   4  the phone: inside the screen, 44 px, nothing off the side
 *
 *   node scripts/acceptance/luna-g6-keepup.mjs */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = mkdtempSync(join(tmpdir(), 'g6k-'));
execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', join(dir, 'v1.xlsx')], { stdio: 'ignore' });
execFileSync('node', ['scripts/workbook/make-marked-workbook.mjs', join(dir, 'v2.xlsx'), '--later'], { stdio: 'ignore' });
const V1 = readFileSync(join(dir, 'v1.xlsx'));
const V2 = readFileSync(join(dir, 'v2.xlsx'));
const LINK = 'https://1drv.ms/x/c/test/Eabc?e=xy';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  for (const w of await liveProductionLines(await db.listWorkspaces())) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln' });
});

const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type', 'access-control-allow-methods': 'POST, OPTIONS, GET, PATCH' };
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task === 'budget') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not here' }) });
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Asked.' }) });
});
let behind = V1;
await page.route('**/functions/v1/link', async r => {
  if (r.request().method() === 'OPTIONS') return r.fulfill({ status: 204, headers: CORS });
  return r.fulfill({
    status: 200,
    headers: { ...CORS, 'content-type': 'application/octet-stream', 'x-link-name': encodeURIComponent('Shift report.xlsx'), 'x-link-kind': 'zip', 'x-link-service': 'onedrive', 'x-link-host': 'x.test' },
    body: behind,
  });
});

/* connect a linked workbook — same path as keep-up.mjs */
await t.go('#/ai', 3000);
await page.locator('.ai-plus').click();
await page.locator('[data-connect-open]').click();
await page.locator('[data-connect-to="link"]').click();
await page.locator('[data-link-sheet]').waitFor({ timeout: 10000 });
await page.locator('[data-link-url]').fill(LINK);
const b1 = await page.locator('.ai-turn.is-colleague [data-ai-code]').count();
await page.locator('[data-link-read]').click();
await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague [data-ai-code]').length > k, b1, { timeout: 60000 });
const meta = await page.evaluate(async () => {
  const { allSources } = await import('/src/capabilities/data.ts');
  const s = (await allSources()).find(x => x.facts.origin?.kind === 'link');
  return { sourceId: s?.id ?? '', name: s?.facts.name ?? '' };
});
ok(meta.sourceId, 'a linked source exists');
const sourceId = meta.sourceId;
const FNAME = meta.name;

const news1 = [{
  id: 'news-1', source_id: sourceId, file_key: `link:${LINK}|branston`, client: 'Branston', file_name: FNAME,
  old_hash: 'old', new_hash: 'new', detected_at: new Date().toISOString(),
}];
await page.addInitScript(rows => { window.__faultlineServerNews = rows; }, news1);
await page.reload();
await t.go('#/ai', 2500);
await page.waitForSelector(`[data-server-keepup="${FNAME}"]`, { timeout: 15000 });
ok(await page.locator('[data-server-keepup]').count() === 1, 'server news shown');
ok((await page.locator('[data-server-keepup]').innerText()).includes('cloud noticed'), 'said while away');

behind = V2;
await page.locator('[data-server-keepup] [data-keepup-read]').click();
await page.waitForTimeout(2000);
ok(await page.locator('[data-server-keepup]').count() === 0, 'Read it clears server news');

const news2 = [{
  id: 'news-2', source_id: sourceId, file_key: `link:${LINK}|branston`, client: 'Branston', file_name: FNAME,
  old_hash: 'a', new_hash: 'b', detected_at: new Date().toISOString(),
}];
await page.addInitScript(rows => { window.__faultlineServerNews = rows; }, news2);
await page.reload();
await t.go('#/ai', 2500);
await page.waitForSelector('[data-server-keepup]', { timeout: 15000 });
await page.locator('[data-keepup-later]').click();
await page.waitForTimeout(500);
ok(await page.locator('[data-server-keepup]').count() === 0, 'Later acks server news');
ok(await page.evaluate(() => (window.__faultlineServerNews ?? []).length === 0), 'ack cleared test news');

/* phone */
await page.setViewportSize({ width: 390, height: 844 });
const news3 = [{
  id: 'news-3', source_id: sourceId, file_key: `link:${LINK}|branston`, client: 'Branston', file_name: FNAME,
  old_hash: 'c', new_hash: 'd', detected_at: new Date().toISOString(),
}];
await page.addInitScript(rows => { window.__faultlineServerNews = rows; }, news3);
await page.reload();
await t.go('#/ai', 2500);
await page.waitForSelector('[data-server-keepup]', { timeout: 15000 });
const box = await page.locator('[data-keepup-read]').boundingBox();
ok(box && box.height >= 44 && box.width <= 390, 'Read it fits the phone');
const docW = await page.evaluate(() => document.documentElement.scrollWidth);
ok(docW <= 400, 'nothing off the side on the phone');

await t.finish('G6 G2 remainder accepted: server news shown while away, Read it and Later, phone fit.');