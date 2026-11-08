/* ACCEPTANCE — CLIENT, SITE AND AREA ON THE LINES (8 November, docs/CONSULTANT.md K1; supabase/CLIENT_SITE_AREA.sql — Rowland: "I go
 * in, I build what I see, an area, production lines within the area"). Driven in a real browser on the smoke seed:
 *
 *   1  Set up the lines: each line's Client, Site and Area typed through its own boxes, kept after a reload
 *   2  the Factory page titled by the one client, the lines under their site › area, a line with neither said last
 *   3  a line's own Set up: the same three boxes, a change there moving the line to its new area on the Factory page
 *   4  a second client: the Factory page titled Factory, the client chips (Every client · each), one picked showing only its lines
 *      and kept after a reload
 *   5  the phone: nothing off the side
 *
 *   node scripts/acceptance/client-site-area.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const lines = await page.evaluate(async () => (await (await import('/src/db.ts')).listWorkspaces()).filter(w => !w.archived).map(w => ({ id: w.id, name: w.name })));
const [a, b, c] = lines;

const type = async (name, what, v) => {
  const box = page.getByLabel(`${name}'s ${what}`, { exact: true });
  await box.fill(v); await box.press('Enter'); await page.waitForTimeout(400);
};
await t.go('#/factory', 3000);
for (const [w, area] of [[a, 'Packing hall'], [b, 'Packing hall'], [c, 'Despatch']]) {
  await type(w.name, 'client', 'Northfield Foods'); await type(w.name, 'site', 'Hull'); await type(w.name, 'area', area);
}
await page.reload(); await page.waitForTimeout(2500);
ok((await page.getByLabel(`${c.name}'s area`, { exact: true }).inputValue()) === 'Despatch' && (await page.getByLabel(`${a.name}'s client`, { exact: true }).inputValue()) === 'Northfield Foods', '1 client, site and area typed on Set up the lines, kept after a reload');

await t.go('#/', 3000);
const title = await t.words('.part-head h1');
const places = await page.locator('.fac-place-h').allInnerTexts();
const inPacking = await page.locator('.fac-place[data-place="Hull › Packing hall"] .fac-card-name').allInnerTexts();
ok(title === 'Northfield Foods' && JSON.stringify(places) === JSON.stringify(['Hull › Despatch', 'Hull › Packing hall']) && inPacking.length === 2,
  `2 the Factory page titled "${title}", the lines under ${places.join(' and ')} (${inPacking.join(', ')} in the packing hall)`);

await t.go(`#/lines/${a.id}?view=setup`, 3000);
const area = page.getByLabel("The line's area", { exact: true });
ok((await area.inputValue()) === 'Packing hall', '3 the line\'s own Set up shows its area');
await area.fill('Despatch'); await area.press('Enter'); await page.waitForTimeout(800);
await t.go('#/', 3000);
const inDespatch = await page.locator('.fac-place[data-place="Hull › Despatch"] .fac-card-name').allInnerTexts();
ok(inDespatch.includes(a.name), `3 moved there, ${a.name} is under Hull › Despatch on the Factory page`);

await t.go('#/factory', 2500);
await type(c.name, 'client', 'Acme Bakery'); await type(c.name, 'site', 'Leeds');
await t.go('#/', 3000);
const chips = await page.locator('.fac-clients .chip').allInnerTexts();
ok((await t.words('.part-head h1')) === 'Factory' && JSON.stringify(chips) === JSON.stringify(['Every client', 'Acme Bakery', 'Northfield Foods']), `4 two clients: titled Factory, the chips ${chips.join(' · ')}`);
await page.locator('.fac-clients .chip', { hasText: 'Acme Bakery' }).click(); await page.waitForTimeout(600);
const shown = await page.locator('.fac-card-name').allInnerTexts();
ok(shown.length === 1 && shown[0] === c.name && /Lines — Acme Bakery/.test(await t.words('.fac-home .home-sec-title')), `4 Acme Bakery picked: only ${shown.join(', ')}`);
await page.reload(); await page.waitForTimeout(3000);
ok((await page.locator('.fac-card-name').count()) === 1, '4 the client picked is kept after a reload');
await page.locator('.fac-clients .chip', { hasText: 'Every client' }).click(); await page.waitForTimeout(500);

await page.setViewportSize({ width: 390, height: 844 }); await t.go('#/', 2500);
ok((await t.wide()) <= 1, '5 the phone: nothing off the side');

await t.finish('Client, site and area accepted: typed on Set up the lines and on a line, the Factory page titled by the client with its lines under their site and area, a client picked when there are two.');
