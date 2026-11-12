import { openApp } from './scripts/lib/tocBrowser.mjs';
const t = await openApp({ width: 390, height: 844 }); await t.seed();
await t.go('#/', 2500); await t.page.locator('[data-everything-open]').click(); await t.page.waitForTimeout(800);
console.log(await t.page.evaluate(() => [...document.querySelectorAll('.evy, .evy *')].filter(e => e.getBoundingClientRect().right > 392).slice(0, 8).map(e => `${e.tagName}.${e.className} ${Math.round(e.getBoundingClientRect().left)}-${Math.round(e.getBoundingClientRect().right)}`).join('\n')));
await t.browser.close();
