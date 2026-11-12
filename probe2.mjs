import { openApp } from './scripts/lib/tocBrowser.mjs';
const t = await openApp({ width: 1440, height: 900 }); await t.seed();
const id = await t.page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).find(s => s.tool === 'chart')?.id);
await t.go(`#/chart/${id}`, 2500);
console.log(await t.page.evaluate(() => { const out = []; const pic = document.querySelector('.ie-pic');
  for (const el of pic.querySelectorAll('text, circle, path, line')) { const cs = getComputedStyle(el); const k = el.tagName + ' ' + (el.getAttribute('class') ?? '') + ' fill=' + cs.fill + ' stroke=' + cs.stroke + ' attr=' + (el.getAttribute('fill') ?? '') ; if (!out.includes(k)) out.push(k); }
  return out.slice(0, 25).join('\n'); }));
await t.browser.close();
