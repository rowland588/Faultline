/* Install from the public sign-in page or from Account after the browser's one-shot offer arrived earlier. */
import assert from 'node:assert/strict';
import { devices } from 'playwright';
import { BASE, openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const install = page => page.getByRole('button', { name: 'Install Faultline', exact: true });
try {
  for (const [device, instruction] of [['Pixel 7', 'Add to Home screen'], ['iPhone 13', 'Share']]) {
    const ctx = await t.browser.newContext({ ...devices[device], serviceWorkers: 'block' });
    try {
      await ctx.route('**://*.supabase.co/**', route => route.abort());
      const page = await ctx.newPage();
      await page.goto(BASE);
      await install(page).click();
      assert.match(await page.getByRole('status').innerText(), new RegExp(instruction));
      await install(page).click();
      assert.equal(await page.locator('.install-instructions').count(), 0);
      await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
      await install(page).waitFor({ state: 'hidden' });
    } finally { await ctx.close(); }
  }

  await t.page.goto(BASE + '/#/projects');
  const account = t.page.getByRole('button', { name: /^Account —/ });
  await account.waitFor();
  const offer = outcome => t.page.evaluate(result => {
    const e = new Event('beforeinstallprompt', { cancelable: true });
    e.prompt = async () => {
      window.installTestCalls = (window.installTestCalls ?? 0) + 1;
      if (result === 'expired') throw new Error('Expired offer');
    };
    e.userChoice = Promise.resolve({ outcome: result });
    window.dispatchEvent(e);
  }, outcome);

  await offer('dismissed');
  await account.click();
  await install(t.page).click();
  assert.equal(await t.page.evaluate(() => window.installTestCalls), 1);
  await install(t.page).click();
  assert.match(await t.page.locator('.install-instructions').innerText(), /Install page as app/);
  await offer('expired');
  await install(t.page).click();
  assert.match(await t.page.locator('.install-instructions').innerText(), /Install page as app/);
  await offer('accepted');
  await install(t.page).click();
  await install(t.page).waitFor({ state: 'hidden' });
  assert.equal(await t.page.evaluate(() => window.installTestCalls), 3);
  assert.deepEqual(t.errors, []);
  console.log('PASS signed-out Android and iPhone instructions; Account captures an earlier offer, handles dismissal, expiry and acceptance.');
} finally { await t.browser.close(); }
