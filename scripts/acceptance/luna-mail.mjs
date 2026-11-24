/* ACCEPTANCE — send this email (24 November, docs/LUNA-MAIL.md): Data connections names Mail.Send and Connect Outlook;
 * the Entra fold lists the one extra permission. Microsoft Graph is not called — Entra cannot be ticked from the repo.
 *   node scripts/acceptance/luna-mail.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
await page.reload();
await page.waitForTimeout(800);

await t.go('#/factory/data', 3000);
await page.locator('[data-page="data-connections"]').waitFor({ state: 'visible', timeout: 20000 });
ok(await page.locator('[data-ms-outlook-card]').count(), '1 Outlook card on Data connections');
ok(await page.getByRole('button', { name: /Connect Outlook|Set up Microsoft first/ }).count(), '1 Connect Outlook (or set up Microsoft first)');
await t.go('#/factory/data?ms=1&mail=1', 3000);
await page.locator('[data-ms-page] [data-ms-sheet]').waitFor({ state: 'visible', timeout: 15000 });
ok(/Connect to Microsoft/.test(await page.locator('[data-page="data-connections"] .part-head h1').innerText()), '1 Connect to Microsoft is the page, not a drawer');
ok((await page.locator('.sheet[aria-label="Connect to Microsoft"]').count()) === 0, '2 Microsoft is the factory page, not a sheet');
const fold = page.getByRole('button', { name: /Or register by hand/ });
if (await fold.count()) await fold.click();
ok((await page.locator('[data-ms-copy="Permissions"]').count()) === 1, '2 Entra permissions have Copy');
const perms = await page.locator('[data-ms-copy="Permissions"] .ms-copy-v').innerText();
ok(/Mail\.Send/.test(perms) && /Files\.Read\.All/.test(perms), '2 permissions include Mail.Send beside the file scopes');
ok(/Mail\.Send/.test(await page.locator('[data-ms-sheet]').innerText()), '2 the page says Mail.Send');

await t.finish('Send-this-email first slice: Connect Outlook and Mail.Send on Data connections; no live Graph.');
