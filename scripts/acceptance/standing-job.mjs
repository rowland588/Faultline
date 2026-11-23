/* STANDING JOBS — weekly digest in code (G7, docs/LUNA-AGENT.md; docs/LUNA-G6-SERVER.md). Gateway mocked; no assist.
 *   node scripts/acceptance/standing-job.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { openLunaContext } from '../lib/lunaContext.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok, go } = t;
await t.seed();
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  asks.push(r.request().postDataJSON());
  return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, reply: 'no' }) });
});

await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  for (const w of await liveProductionLines(await db.listWorkspaces())) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston', siteName: 'Lincoln' });
});
await page.evaluate(() => { try { localStorage.setItem('faultline.client', 'Branston'); } catch { /* */ } });

/* Set up — standing job fold found by typing */
await go('#/factory?standing=1', 3000);
await page.waitForSelector('[data-fold="setup-standing-jobs"]', { timeout: 20000 });
const fold = page.locator('[data-fold="setup-standing-jobs"]');
await fold.scrollIntoViewIfNeeded();
if (await fold.locator('[data-standing-jobs]').count() === 0) await fold.locator('.fold-toggle').click();
await page.waitForSelector('[data-standing-jobs]', { state: 'visible', timeout: 20000 });
await page.getByRole('button', { name: 'Add weekly briefing', exact: true }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Run now', exact: true }).first().click();
await page.waitForTimeout(800);
const foldOpen = await page.locator('[data-fold="setup-standing-jobs"].is-open').count() > 0;

await go('#/ai', 2500);
await openLunaContext(page);
await page.waitForSelector('[data-standing-digest]', { timeout: 20000 });
const card = page.locator('[data-standing-digest]');
const cardShown = await card.isVisible();
await card.getByRole('button', { name: 'Show me', exact: true }).click();
await page.waitForSelector('.ai-turn.is-colleague [data-ai-code="1"]', { timeout: 15000 });
const digest = (await page.locator('.ai-turn.is-colleague').last().locator('.ai-words').first().innerText()).replace(/\s+/g, ' ');
const fail = (what, pass, said) => { if (!pass) throw new Error(`${what} — ${said}`); console.log(`      RIGHT  ${what}`); };
fail('Standing briefings fold on Set up', foldOpen, '');
fail('Weekly briefing card shown', cardShown, '');
fail('Digest in conversation — code only', /Weekly briefing/.test(digest) && await page.locator('[data-ai-code="1"]').count() > 0, digest.slice(0, 120));
fail('No assist asks', asks.length === 0, `${asks.length} asks`);

console.log('\nstanding-job — 4 of 4');
await t.browser?.close?.();
process.exit(0);