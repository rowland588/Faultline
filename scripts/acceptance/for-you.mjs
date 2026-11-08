/* ACCEPTANCE — FOR YOU, THE BELL (8 November — the enterprise basics, notifications; src/lib/forYou, src/ui/ForYou). Driven in a
 * real browser on the smoke seed:
 *
 *   1  the bell in the top bar with no count before a name is said; pressed, it asks which name is yours on the actions, offering
 *      the names on them
 *   2  a name picked — the panel's groups and the bell's count as lib/forYou says them from the very rows the Actions page reads,
 *      the late the same number as that person's fold on Actions says; the count red when any is late
 *   3  a row opens its record (the panel closes, the record's drawer opens over the page)
 *   4  kept after a reload (this device only); Change the name asking again
 *   5  the phone: the bell in the bar, nothing off the side
 *
 *   node scripts/acceptance/for-you.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const WHO = 'Ilapak UK';

/* ---- 1 · asked once ---- */
await t.go('#/', 3000);
const bell = page.locator('.nv-bell');
ok((await bell.count()) === 1 && (await page.locator('.nv-bell-n').count()) === 0, '1 the bell in the top bar, no count before a name is said');
await bell.click(); await page.waitForTimeout(1500);
const chips = await page.locator('[data-for-you-panel] .pp-chip').allInnerTexts();
ok(/Which name are you on the actions\?/.test(await t.words('[data-for-you-panel] .fy-h')) && chips.includes(WHO), `1 it asks which name is yours, offering the names on the actions (${chips.slice(0, 5).join(', ')}…)`);

/* ---- 2 · the groups and the count, as the module says them from the Actions page's rows ---- */
await page.locator('[data-for-you-panel] .pp-chip', { hasText: WHO }).click(); await page.waitForTimeout(1500);
const shown = {
  late: await page.locator('[data-for-you-panel] .fy-g.is-late .fy-row').count(),
  soon: await page.locator('[data-for-you-panel] .fy-g.is-soon .fy-row').count(),
  badge: Number(await bell.getAttribute('data-for-you')),
  red: await bell.evaluate(e => e.classList.contains('is-late')),
};
const head = await t.words('[data-for-you-panel] .fy-h');
ok(shown.badge === shown.late + shown.soon && head === `${shown.badge} need${shown.badge === 1 ? 's' : ''} you${shown.late ? ` — ${shown.late} late` : ''}` && shown.red === shown.late > 0, `2 the count is the late and the due by tomorrow: "${head}", the bell ${shown.badge}${shown.red ? ', red' : ''}`);
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
await t.go('#/actions', 3000);
const fold = page.locator('.fold', { has: page.locator('.fold-t', { hasText: new RegExp(`^${WHO}$`) }) }).first();
const foldSays = await fold.locator('.fold-s').innerText();
const foldLate = Number(/(\d+) late/.exec(foldSays)?.[1] ?? 0);
ok(foldLate === shown.late, `2 its late is the number ${WHO}'s fold on Actions says (${foldSays.replace(/\s+/g, ' ')})`);

/* ---- 3 · a row opens its record ---- */
await bell.click(); await page.waitForTimeout(1200);
await page.locator('[data-for-you-panel] .fy-row').first().click(); await page.waitForTimeout(1500);
ok((await page.locator('[data-for-you-panel]').count()) === 0 && (await page.locator('aside.rd').count()) === 1, '3 a row opens its record over the page, the bell\'s panel closed');
await page.keyboard.press('Escape'); await page.waitForTimeout(600);

/* ---- 4 · kept on this device; changed ---- */
await page.reload(); await page.waitForTimeout(3000);
ok(Number(await bell.getAttribute('data-for-you')) === shown.badge, '4 the name kept after a reload — the same count');
await bell.click(); await page.waitForTimeout(1200);
await page.getByRole('button', { name: `Not ${WHO}? Change the name` }).click(); await page.waitForTimeout(500);
ok(/Which name are you on the actions\?/.test(await t.words('[data-for-you-panel] .fy-h')), '4 Change the name asks again');
await page.getByLabel('Your name on the actions').fill('Nobody Here'); await page.getByRole('button', { name: "That's me" }).click(); await page.waitForTimeout(800);
ok(/Nothing of yours is late or due by tomorrow/.test(await t.words('[data-for-you-panel] .fy-h')), '4 a name with nothing on it says so');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);

/* ---- 5 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
const box = await bell.boundingBox();
ok((await bell.isVisible()) && (await t.wide()) <= 1 && (box?.height ?? 0) >= 40, `5 the phone: the bell in the bar (${Math.round(box?.height ?? 0)} px), nothing off the side`);

await t.finish('For you accepted: the bell asks your name once, counts what is yours late or due by tomorrow from the Actions page\'s own rows, opens each record, and keeps the name on this device.');
