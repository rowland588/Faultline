/* STANDING JOBS — weekly digest in code (G7, docs/LUNA-AGENT.md; docs/LUNA-G6-SERVER.md). Gateway mocked; no assist.
 *   node scripts/acceptance/standing-job.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { openLunaContext } from '../lib/lunaContext.mjs';

const mobile = process.env.SMOKE_MOBILE === '1';
const t = await openApp({ width: mobile ? 390 : 1440, height: mobile ? 844 : 900, mobile });
const { page, ok, go } = t;
const owner = '11111111-1111-1111-1111-111111111111';
const recipient = 'shift@example.test';
const savedSchedules = [];
await page.route('**/rest/v1/profiles?*', r => r.fulfill({ json: [{ id: owner, is_super: true, email: 'acceptance@example.com' }] }));
await page.route('**/functions/v1/luna-mail', r => {
  if (r.request().postDataJSON()?.action !== 'status') throw new Error('No real email may be sent during the schedule rehearsal.');
  return r.fulfill({ json: { allowed: true, ready: true } });
});
await page.route('**/rest/v1/standing_jobs*', r => {
  if (r.request().method() === 'POST') {
    savedSchedules.push(r.request().postDataJSON());
    return r.fulfill({ status: 201, body: '' });
  }
  return r.fulfill({ json: [] });
});
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
await page.getByRole('button', { name: 'Weekly', exact: true }).click();
await page.waitForTimeout(400);
const panel = fold.locator('[data-standing-jobs]');
await panel.getByRole('button', { name: 'Add email' }).click();
await panel.getByLabel('Email recipient').fill(recipient);
await panel.getByLabel('London time').fill('08:30');
await panel.getByRole('button', { name: 'Save', exact: true }).click();
await panel.getByText(recipient, { exact: false }).waitFor();
if (!savedSchedules.some(row => row.scope?.email?.to === recipient && row.hour === 8 && row.minute === 30)) throw new Error('Email schedule was not saved online.');
await panel.getByRole('button', { name: 'Pause', exact: true }).click();
await panel.getByRole('button', { name: 'Resume', exact: true }).click();
await panel.getByRole('button', { name: 'Preview briefing', exact: true }).click();
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

console.log('\nstanding-job — briefing, email settings, pause and resume passed');
await t.browser?.close?.();
process.exit(0);