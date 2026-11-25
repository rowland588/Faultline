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
ok(/Exchange Online mailbox/.test(await page.locator('[data-ms-hero-says]').innerText()), '2 Outlook setup explains the mailbox requirement');
ok(!await page.locator('[data-ms-admin]').count(), '2 mailbox customers never see owner registration');
await page.context().route('**/rest/v1/profiles*', r => r.fulfill({status: 200, contentType: 'application/json', headers: {'access-control-allow-origin': '*','access-control-allow-headers': '*'}, body: JSON.stringify({id:'11111111-1111-1111-1111-111111111111',is_super:true})}));
await page.reload();
await page.locator('[data-ms-auto]').waitFor();
const fold = page.getByRole('button', { name: /Or register by hand/ });
if (await fold.count()) await fold.click();
ok((await page.locator('[data-ms-copy="Permissions"]').count()) === 1, '2 Entra permissions have Copy');
const perms = await page.locator('[data-ms-copy="Permissions"] .ms-copy-v').innerText();
ok(/Mail\.Send/.test(perms) && /Files\.Read\.All/.test(perms), '2 permissions include Mail.Send beside the file scopes');
ok(/Mail\.Send/.test(await page.locator('[data-ms-sheet]').innerText()), '2 the page says Mail.Send');

await page.evaluate(() => localStorage.setItem('faultline.ms.clientId','1a2b3c4d-1234-5678-9abc-1234567890ab'));
await page.reload();
await page.locator('[data-ms-mail-connect]').waitFor();
ok(!await page.locator('[data-ms-test]').isVisible(), '3 Outlook offers mailbox sign-in even before files are connected');
const popupReady = page.context().waitForEvent('page');
await page.context().route('https://login.microsoftonline.com/**', r => r.fulfill({status: 200, body: 'Microsoft sign-in'}));
await page.locator('[data-ms-mail-connect]').click();
const popup = await popupReady;
await popup.waitForURL('https://login.microsoftonline.com/**');
ok(new URL(popup.url()).searchParams.get('scope').split(' ').includes('Mail.Send'), '3 Outlook connects through Microsoft with permission to send');
await popup.close();
await t.finish('Send-this-email first slice: Connect Outlook and Mail.Send on Data connections; no live Graph.');
