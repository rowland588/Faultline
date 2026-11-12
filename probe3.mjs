import { openApp } from './scripts/lib/tocBrowser.mjs';
const t = await openApp({ width: 1440, height: 900 }); await t.seed();
const id = await t.page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).find(s => s.tool === 'chart')?.id);
await t.go(`#/chart/${id}`, 2500);
console.log(await t.page.evaluate(() => [...document.querySelectorAll('.ie-pic text')].filter(e => /UCL|target/.test(e.textContent)).map(e => e.textContent + ' ' + getComputedStyle(e).fill + ' ' + e.closest('svg').getAttribute('class')).join('\n')));
await t.page.locator('.ie-pic').first().screenshot({ path: '../shots/crop.png' });
await t.browser.close();
