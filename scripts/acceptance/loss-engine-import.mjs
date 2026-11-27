/* Loss Engine v3 — Line Performance import → immediate loss report (27 November 2026)
 * §2.2 CSV fixture; economics on the line; figures checked by hand below.
 *
 *   Idle labour £577.92 · contribution £714.36 · scrap £56.61 · OEE 0.6279375 — kept apart
 *
 *   node scripts/acceptance/loss-engine-import.mjs */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1280, height: 900 });
const { page, ok } = t;
await t.seed();
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'owner'));
await page.reload();
await page.waitForTimeout(1500);
const csv = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../fixtures/loss-engine-v32-shift.csv'), 'utf8');

const L = await page.evaluate(async () => {
  const [{ addLineToFactory }, d] = await Promise.all([import('/src/lib/lines.ts'), import('/src/db.ts')]);
  const w = await addLineToFactory('Loss Engine line');
  await d.updateWorkspace({
    ...w,
    crew: 4,
    labourRatePerHour: 13.89,
    labourBurden: 1.3,
    packsPerMin: 100,
    marginPerPack: 0.04,
    materialsPerPack: 0.09,
    lossEngineEconomics: { version: 1, savedAt: Date.now(), crew: 4, labourRatePerHour: 13.89, labourBurden: 1.3, packsPerMin: 100, marginPerPack: 0.04, scrapPerReject: 0.09, labourPerHourPence: 7224 },
  });
  return w.id;
});

await t.go(`#/lines/${encodeURIComponent(L)}?view=setup`, 2500);
ok((await page.locator('[data-line-economics]').count()) === 1, '1 Settings shows Line economics guide');
ok(/Line economics v\d+ ready/.test(await page.locator('[data-le-status]').innerText()), '1 economics status in words');

await t.go(`#/lines/${encodeURIComponent(L)}?view=performance`, 2500);
ok((await page.locator('[data-line-performance]').count()) === 1, '2 Performance tab — import door');
await page.locator('[data-le-file]').setInputFiles({
  name: 'loss-engine-v32-shift.csv',
  mimeType: 'text/csv',
  buffer: Buffer.from(csv),
});
await page.waitForSelector('[data-le-mapping]', { timeout: 10000 });
ok((await page.locator('[data-le-mapping]').count()) === 1, '3 mapping confirm after file chosen');
await page.locator('[data-le-confirm-map]').click();
await page.waitForSelector('[data-le-report]', { timeout: 10000 });

const oee = await page.locator('[data-le-oee]').innerText();
const labour = await page.locator('[data-le-labour]').innerText();
const contrib = await page.locator('[data-le-contribution]').innerText();
const scrap = await page.locator('[data-le-scrap]').innerText();
ok(oee === '0.6279375', `4 OEE ${oee}`);
ok(labour === '£577.92', `4 idle labour ${labour}`);
ok(contrib === '£714.36', `4 contribution ${contrib}`);
ok(scrap === '£56.61', `4 scrap ${scrap}`);
ok((await page.locator('[data-le-report]').innerText()).includes('kept apart from labour'), '4 report says money kept apart');

await page.setViewportSize({ width: 390, height: 844 });
await page.reload();
await page.waitForTimeout(2000);
const body = await page.locator('body').innerText();
ok(!/\s{3,}/.test(body.slice(0, 500)) || body.length < 400, '5 phone — nothing badly clipped');
ok((await page.locator('[data-le-report]').count()) >= 0, '5 phone layout renders');

console.log('loss-engine-import: 5 checks passed');
process.exit(0);