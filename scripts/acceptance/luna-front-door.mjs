/* ACCEPTANCE — LUNA IS THE FRONT DOOR (11 November, F1 — Rowland: "Luna becomes the primary way people interact … this does NOT mean
 * that everything becomes a chatbot … The interface should reveal complexity only when it is needed"). Today opens with Luna's box first,
 * then the briefing as before. The gateway answered by the script:
 *
 *   1  Luna's box is the first thing under the greeting — the question in one line, the box, voice beside it, before the briefing
 *   2  two or three suggestions, each equal to lib/today suggestionsFor over the Actions page's own rows and the lines' states, at least
 *      one drawn from the seed's real state (a late action, a line with problems open, a project behind)
 *   3  a suggestion sent opens Luna beside Today — the page kept, the words sent into the conversation
 *   4  voice beside the box opens Luna's voice conversation as the bar at the foot of Today, the page kept; End closes it
 *   5  AI Mode off — no box, no voice, the briefing first and the page whole
 *   6  a phone (390) — nothing off the side, the box, voice, Ask and every suggestion 44 px
 *
 *   node scripts/acceptance/luna-front-door.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  asks.push(r.request().postDataJSON());
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Here is what I found.', model: 'test' }) });
});
await page.evaluate(() => localStorage.setItem('faultline.lunaPanel', 'closed'));

/* ---- 1 · first ---- */
await t.go('#/today', 3000);
await page.waitForSelector('[data-brief]', { timeout: 8000 }).catch(() => undefined);
const top = async sel => page.evaluate(s => document.querySelector(s)?.getBoundingClientRect().top ?? -1, sel);
const [tBox, tBrief, tLines] = [await top('[data-today-luna]'), await top('[data-today-brief]'), await top('[data-today-lines]')];
ok(tBox > 0 && tBox < tBrief && tBrief < tLines, `1 Luna's box first, then the briefing, then the lines (${Math.round(tBox)} < ${Math.round(tBrief)} < ${Math.round(tLines)})`);
ok(/understand or get done/.test(await t.words('[data-today] .part-head')), `1 one line asking what they want to understand or get done: "${(await t.words('[data-today] .part-head')).slice(0, 120)}"`);
ok((await page.locator('[data-today-luna] [data-today-ask]').count()) === 1 && (await page.locator('[data-today-luna] [data-today-voice]').count()) === 1, '1 the box with voice beside it');

/* ---- 2 · the suggestions, from the real state ---- */
const want = await page.evaluate(async () => {
  const { allProjects } = await import('/src/db/projects.ts');
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const { loadEveryAction } = await import('/src/lib/useProjectActions.ts');
  const { suggestionsFor, lineState } = await import('/src/lib/today.ts');
  const ps = (await allProjects()).filter(p => !p.archivedAt && !p.deletedAt);
  const every = await loadEveryAction(ps);
  const ls = await liveProductionLines(await db.listWorkspaces());
  const sn = (await db.listAllSnags()).filter(s => !s.deletedAt && !s.archivedAt && s.status !== 'closed');
  const rows = ls.map(l => { const m = sn.filter(s => s.workspaceId === l.id); return { name: l.name, ...lineState(m.length, m.filter(s => s.priority === 'critical').length) }; })
    .sort((a, b) => 'ragwn'.indexOf(a.state) - 'ragwn'.indexOf(b.state));
  return suggestionsFor(every.rows, rows);
});
const shown = (await page.locator('[data-today-sugg]').allInnerTexts()).map(s => s.trim());
ok(shown.length >= 2 && shown.length <= 3 && JSON.stringify(shown) === JSON.stringify(want), `2 the suggestions are lib/today's: ${shown.join(' | ')}`);
const real = shown.filter(s => !/^(What should I do first today\?|Where is the factory losing the most time\?)$/.test(s));
ok(real.length >= 1, `2 at least one from the real state ("${real[0] ?? ''}")`);

/* ---- 3 · sent: Luna beside Today ---- */
await page.locator('[data-today-sugg]').first().click(); await page.waitForTimeout(3000);
ok((await page.evaluate(() => location.hash)) === '#/today' && (await page.locator('[data-luna-panel="open"] [data-ai]').count()) === 1, '3 Luna opens beside Today, the page kept');
ok(asks.some(b => (b.turns ?? []).some(x => (x.text ?? '') === shown[0])), `3 the suggestion sent into the conversation ("${shown[0]}")`);
ok(/Here is what I found/.test(await t.words('[data-luna-panel] .ai-turn.is-colleague')), '3 her answer beside the page');

/* ---- 4 · voice beside the box ---- */
await page.evaluate(() => localStorage.setItem('faultline.lunaPanel', 'closed'));
await t.go('#/today', 2500);
await page.locator('[data-today-voice]').click(); await page.waitForTimeout(2000);
ok((await page.evaluate(() => location.hash)) === '#/today' && (await page.locator('[data-voice-bar]').count()) === 1, '4 voice opens Luna’s voice conversation as the bar at the foot of Today, the page kept');
await page.locator('[data-voice-end]').click().catch(() => undefined); await page.waitForTimeout(800);
ok((await page.locator('[data-voice-mode]').count()) === 0, '4 End closes it');

/* ---- 5 · AI Mode off ---- */
await page.evaluate(async () => (await import('/src/colleague/aiMode.ts')).setAiMode(false)); await page.waitForTimeout(800);
ok((await page.locator('[data-today-luna], [data-today-voice]').count()) === 0 && (await page.locator('[data-brief]').count()) >= 1 && (await page.locator('[data-today-lines]').count()) === 1, '5 AI Mode off: no box and no voice, the briefing and the lines whole');
ok(!/understand or get done/.test(await t.words('[data-today] .part-head')), '5 the header says what the page holds, not a question to Luna');
await page.evaluate(async () => (await import('/src/colleague/aiMode.ts')).setAiMode(true));

/* ---- 6 · a phone ---- */
await page.evaluate(() => localStorage.setItem('faultline.lunaPanel', 'closed'));
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/today', 2500);
const small = await page.$$eval('[data-today-ask], [data-today-voice], [data-today-send], [data-today-sugg]', els => els.filter(e => e.getBoundingClientRect().height < 44).map(e => e.getAttribute('aria-label') ?? e.textContent));
const pTop = await top('[data-today-luna]');
ok(small.length === 0 && (await t.wide()) <= 0 && pTop > 0 && pTop < 844, `6 a phone: the box on the first screen, every press 44 px, nothing off the side (${small.join(', ') || 'none small'})`);

await t.finish('Luna is the front door: Today opens with her box, voice and suggestions from the real state; Manual Mode whole without her.');
