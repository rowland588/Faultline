import { scopePage } from '../lib/pageHeader.mjs';
/* ACCEPTANCE — BACK, TO WHERE YOU WERE (9 November; state/navHistory, ui/ContextBar — Rowland: "going back out of a page is
 * difficult .. never send you back to where you was .. tools pages i have to press tools to get back, instead of the classic
 * back"). Driven in a real browser on the smoke seed:
 *
 *   1  a fresh start on the Lines tab: nothing to go back to — no Back shown
 *   2  the menu's Tools, then a tool's own page: Back shown; Back lands on Tools (not the Factory), Back again on the Lines tab
 *   3  a line, its Tools tab, a tool record on it: Back lands on the line's Tools tab, never on the factory's Tools
 *   4  a deep link opened afresh in a new tab with no trail: no Back (‹ Factory still there to go up); one step in, Back
 *   5  the phone: Back the arrow alone at a thumb's width, the up crumb giving way to it, nothing off the side at 375 px
 *
 *   node scripts/acceptance/back.mjs   (SMOKE_BASE, as smoke) */
import { openApp, BASE } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1360, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const back = () => page.locator('.nv-top .nv-back');
const hash = () => page.evaluate(() => window.location.hash);
const pressBack = async () => { await back().click(); await page.waitForTimeout(1200); };

/* ---- 1 · a fresh start ---- */
await page.evaluate(() => sessionStorage.removeItem('fl-nav-trail'));
await page.goto(`${BASE}/#/room`); await page.reload(); await page.waitForTimeout(2500);
ok((await back().count()) === 0, '1 a fresh start on the Lines tab: nothing to go back to, no Back shown');

/* ---- 2 · Tools, a tool's page, Back, Back ---- */
await scopePage(page, 'Tools'); /* the Factory's Tools tab since 16 November (docs/NAV.md N3) */ await page.waitForTimeout(1500);
const toolsHash = await hash();
await page.locator('[data-tool]').first().click(); await page.waitForTimeout(1500);
const toolHash = await hash();
ok(toolHash !== toolsHash && (await back().count()) === 1, `2 a tool's own page (${toolHash}): Back shown`);
await pressBack();
ok((await hash()) === toolsHash, `2 Back lands on Tools, where you were — not the Factory (${await hash()})`);
await pressBack();
ok((await hash()) === '#/room', `2 Back again lands on the Lines tab (${await hash()})`);

/* ---- 3 · a line's Tools tab, a record on it, Back ---- */
await page.goto(`${BASE}/#/lines/${sd.wsId}`); await page.waitForTimeout(2000);
await scopePage(page, 'Tools'); await page.waitForTimeout(1800);
const lineTools = await hash();
const rec = page.locator('.nv-main a[href*="#/"], .nv-main button').filter({ hasText: /Capability|Line capacity|Loss count|Reliability|SMED|Control chart/ }).first();
let opened = false;
if (await rec.count()) { await rec.click().catch(() => {}); await page.waitForTimeout(1800); opened = (await hash()) !== lineTools; }
if (!opened) { await page.goto(`${BASE}/#/lines/${sd.wsId}/capacity`); await page.waitForTimeout(1800); }
ok((await hash()) !== lineTools && (await back().count()) === 1, `3 a tool on the line (${await hash()}): Back shown`);
await pressBack();
ok((await hash()) === lineTools, `3 Back lands on the line's own Tools tab, where you were (${await hash()} — wanted ${lineTools})`);

/* ---- 4 · a deep link with no trail ---- */
{
  const p2 = await t.ctx.newPage();
  await p2.goto(`${BASE}/#/lines/${sd.wsId}`); await p2.waitForTimeout(2500);
  ok((await p2.locator('.nv-top .nv-back').count()) === 0 && (await p2.locator('.nv-top .nv-up').count()) === 1, '4 a deep link opened afresh: no Back, ‹ Factory still there to go up');
  await p2.locator('.nv-tabs .nv-tab').nth(1).click(); await p2.waitForTimeout(1500);
  ok((await p2.locator('.nv-top .nv-back').count()) === 1, '4 one step in, Back is offered');
  await p2.close();
}

/* ---- 5 · the phone ---- */
await page.setViewportSize({ width: 375, height: 800 });
await page.goto(`${BASE}/#/lines/${sd.wsId}`); await page.waitForTimeout(2000);
await scopePage(page, 'Machines'); await page.waitForTimeout(1500);
{
  const bb = await back().boundingBox();
  const upShown = await page.locator('.nv-top .nv-up').evaluate(e => getComputedStyle(e).display !== 'none').catch(() => false);
  ok(!!bb && bb.width >= 43 && bb.height >= 43 && !upShown, `5 the phone: Back the arrow at a thumb's width (${Math.round(bb?.width ?? 0)} × ${Math.round(bb?.height ?? 0)}), the up crumb giving way`);
  ok((await t.wide()) <= 1, '5 nothing off the side at 375 px');
}

/* Page Back skips an actual list view change, while native Back still closes a sheet. */
await page.setViewportSize({width:1360,height:900});
await t.go('#/room');
await scopePage(page,'Tools');
await page.getByRole('tab',{name:'Saved work',exact:true}).click();
await page.waitForTimeout(500);
await pressBack();
ok((await hash())==='#/room','6 one header Back skips the saved-work view change and leaves Tools for Factory');
await scopePage(page,'Tools');
await page.getByRole('tab',{name:'Saved work',exact:true}).click();
const savedHash=await hash();
await page.setViewportSize({width:375,height:800});
await page.locator('.nv-bar button').filter({hasText:/^More$/}).click();
await page.locator('.nv-sheet').waitFor();
await page.goBack();
await page.locator('.nv-sheet').waitFor({state:'hidden'});
ok((await hash())===savedHash,'6 native phone/browser Back closes More without leaving the page');
await pressBack();
ok((await hash())==='#/room','6 closing the sheet leaves no extra page-Back stop');
await page.goForward();await page.waitForTimeout(500);
ok((await hash()).startsWith('#/tools'),'6 browser Forward remains native after a page-level Back jump');

await t.finish('Back accepted: shown only when this session has a page to go back to, it lands where you were — Tools from a tool, a line\'s Tools from a tool on the line — never out of the app; a deep link goes up instead; on a phone the arrow alone, a thumb\'s width, nothing off the side.');
