/* ACCEPTANCE — LUNA BESIDE THE PAGE (10 November, docs/LUNA-WORKSPACE.md W2 — Rowland: "Luna becoming a persistent panel within the
 * application, with the actual working page alongside her … Design desktop and mobile as deliberate experiences"). The gateway answered
 * by the script:
 *
 *   1  a desk: Ask Luna on a line's page opens her beside it — the page stays, its address too; the conversation starts on the line and
 *      she is told what is on the screen beside her; the page keeps its width for the work (nothing off the side)
 *   2  a question answered in the panel; its record's chip opens the problem's page as the work — Luna still beside it, the same
 *      conversation, her answer still there
 *   3  moving about with her open: Tools, then the line again — the same conversation all the way; the door puts her away and the
 *      frame is as before (no panel, the page's full width); opened again, the same conversation
 *   4  a phone: the door opens her over the page; going to a page brings it to the front with Luna a bar at the foot (still the same
 *      conversation); the bar brings her back; presses 44 px and nothing off the side
 *   5  Manual Mode untouched: with her closed no panel is drawn on any page; AI Mode off hides the door and the panel
 *
 *   node scripts/acceptance/luna-panel.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: false, why: 'nothing planned' }) });
});
const hash = async h => { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(1500); };
const lineName = await page.evaluate(async id => (await (await import('/src/db.ts')).getWorkspace(id))?.name, sd.wsId);
const lineHash = `#/lines/${encodeURIComponent(sd.wsId)}`;

/* ---- 1 · beside the page on a desk ---- */
await t.go(lineHash, 2500);
ok((await page.locator('[data-luna-panel]').count()) === 0, '1 closed: no panel on the page');
await page.locator('.nv-top .ai-door').click(); await page.waitForTimeout(2200);
ok(await page.evaluate(() => location.hash) === lineHash && (await page.locator('[data-luna-panel="open"] [data-ai]').count()) === 1, '1 Ask Luna opens her beside the line page — its address kept');
ok((await t.words('[data-luna-panel] [data-ai-title]')) === lineName, `1 the conversation starts on the line (${lineName})`);
const box = await page.locator('[data-luna-panel]').boundingBox();
ok(!!box && box.width >= 400 && box.width <= 440 && box.x + box.width <= 1441, `1 a column at the right (${Math.round(box?.width ?? 0)} px)`);
ok((await page.locator('.nv-tabs .nv-tab').count()) >= 5 && (await t.wide()) <= 0, '1 the page beside her drawn as ever, nothing off the side');

/* ---- 2 · answered in the panel; a record opened as the work ---- */
plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 'c1', name: 'list_problems', input: { lineId: sd.wsId } }], assistant: { v: 1 }, model: 'test' }),
  () => ({ ok: true, reply: 'One problem is open on the line.', model: 'test' }),
];
await page.locator('[data-luna-panel] .ai-box').fill('What is open here?');
await page.locator('[data-luna-panel]').getByRole('button', { name: 'Send', exact: true }).click();
await page.waitForFunction(() => /One problem is open/.test(document.querySelector('[data-luna-panel] .ai-turn.is-colleague')?.textContent ?? '') && !document.querySelector('[data-luna-panel] .ai-thinking'), null, { timeout: 15000 }).catch(() => undefined);
await page.waitForTimeout(500);
ok(/On the screen beside the conversation: .*#\/lines\//.test(asks[0]?.focus ?? ''), '2 she was told what is on the screen beside her');
ok(/One problem is open/.test(await t.words('[data-luna-panel] .ai-turn.is-colleague')), '2 answered in the panel');
const conv = asks[0]?.conversationId;
await page.locator('[data-luna-panel] details[data-ai-steps]').first().evaluate(d => { d.open = true; });
const chip = page.locator('[data-luna-panel] .ai-ref[data-ref^="problem:"]').first();
const had = await chip.count();
if (had) { await chip.click(); await page.waitForTimeout(2000); }
ok(had === 1 && /#\/snags/.test(await page.evaluate(() => location.hash)) && (await page.locator('[data-luna-panel="open"] [data-ai]').count()) === 1, `2 the problem's chip opens its page as the work, Luna still beside it (${await page.evaluate(() => location.hash)})`);
ok(/One problem is open/.test(await t.words('[data-luna-panel] .ai-turn.is-colleague')), '2 her answer still there');

/* ---- 3 · moving about with her open; put away and back ---- */
await hash('#/tools');
ok((await page.locator('[data-luna-panel] [data-ai]').count()) === 1 && /One problem is open/.test(await t.words('[data-luna-panel] .ai-turn.is-colleague')), '3 on Tools: the same conversation beside it');
await hash(lineHash);
ok(/One problem is open/.test(await t.words('[data-luna-panel] .ai-turn.is-colleague')), '3 back on the line: the same conversation');
await page.locator('.nv-top .ai-door').click(); await page.waitForTimeout(1200);
const mainW = await page.locator('.nv-main').evaluate(el => getComputedStyle(el).paddingRight);
ok((await page.locator('[data-luna-panel]').count()) === 0 && mainW === '0px', `3 the door puts her away: no panel, the page its full width (${mainW})`);
await page.locator('.nv-top .ai-door').click(); await page.waitForTimeout(1500);
ok(/One problem is open/.test(await t.words('[data-luna-panel] .ai-turn.is-colleague')), '3 opened again: the same conversation');
plan = [() => ({ ok: true, reply: 'Still here.', model: 'test' })];
await page.locator('[data-luna-panel] .ai-box').fill('Are you still there?');
await page.locator('[data-luna-panel]').getByRole('button', { name: 'Send', exact: true }).click();
await page.waitForTimeout(2500);
ok(asks.at(-1)?.conversationId === conv, '3 one conversation throughout');

/* ---- 4 · a phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await hash(lineHash);
ok((await page.locator('[data-luna-panel="open"]').count()) === 1 || (await page.locator('[data-luna-panel="min"]').count()) === 1, '4 a phone: Luna kept');
await page.evaluate(async () => (await import('/src/colleague/lunaPanel.ts')).setLunaPanel('open'));
await page.waitForTimeout(800);
const sheet = await page.locator('[data-luna-panel="open"]').boundingBox();
ok(!!sheet && sheet.width >= 389 && (await page.locator('.nv-bar').isVisible().catch(() => false)) === false, '4 open on a phone: over the page, the menu bar giving way');
await hash('#/tools');
ok((await page.locator('[data-luna-panel="min"] [data-luna-min]').isVisible()) && (await page.locator('.nv-bar').isVisible()), '4 going to a page brings it to the front, Luna a bar at the foot');
const minBox = await page.locator('[data-luna-min]').boundingBox();
ok(!!minBox && minBox.height >= 44, `4 the bar a thumb's height (${Math.round(minBox?.height ?? 0)} px)`);
await page.locator('[data-luna-min]').click(); await page.waitForTimeout(1200);
ok((await page.locator('[data-luna-panel="open"] [data-ai]').count()) === 1 && /Still here/.test(await t.words('[data-luna-panel]')), '4 the bar brings her back — the same conversation');
ok((await t.wide()) <= 0, '4 nothing off the side at 390');
await page.setViewportSize({ width: 1440, height: 900 });

/* ---- 5 · Manual Mode untouched ---- */
await page.evaluate(async () => (await import('/src/colleague/lunaPanel.ts')).setLunaPanel('closed'));
for (const h of [lineHash, '#/tools', '#/projects', '#/']) { await hash(h); if (await page.locator('[data-luna-panel]').count()) ok(false, `5 a panel drawn on ${h} while closed`); }
ok(true, '5 closed: no panel on the line, Tools, Projects or the Story');
await page.evaluate(async () => { (await import('/src/colleague/lunaPanel.ts')).setLunaPanel('open'); (await import('/src/colleague/aiMode.ts')).setAiMode(false); });
await page.waitForTimeout(800);
ok((await page.locator('[data-luna-panel]').count()) === 0 && (await page.locator('.nv-top .ai-door').count()) === 0, '5 AI Mode off: no door, no panel');
await page.evaluate(async () => { (await import('/src/colleague/aiMode.ts')).setAiMode(true); (await import('/src/colleague/lunaPanel.ts')).setLunaPanel('closed'); });

await t.finish('Luna beside the page — on a desk and a phone, the same conversation wherever the person goes; Manual Mode untouched when she is closed.');
