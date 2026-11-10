/* ACCEPTANCE — LUNA PERSISTS ACROSS THE APP (10 November, docs/LUNA-WORKSPACE.md W1 — Rowland: "Luna must genuinely persist across
 * navigation. This includes active conversations, responses in progress, pending proposals, unfinished investigations … We must not
 * simply preserve the visual chat panel while losing its underlying activity"). The `assist` gateway answered by the script:
 *
 *   1  an answer in flight: asked on #/ai, the gateway slow; the person goes to the line's page; the answer is given while they are away
 *      (the gateway asked its second round, the read run) and the line page's address is never rewritten; back on #/ai the answer is
 *      there, one conversation, nothing failed — the same live screen (a marker set on it before leaving is still on it)
 *   2  a proposal waiting: a write card asked for; away to Tools and back — the card still waiting, Do it raises the problem once
 *   3  a conversation named by a link (#/ai?c=) opened while Luna is alive
 *   4  Manual Mode untouched: the line page works with Luna parked (its tabs, Problem); AI Mode off — #/ai says so, no Luna on the page
 *
 *   node scripts/acceptance/luna-persist.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
let hold = 0;
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  const answer = next ? next(body) : { ok: false, why: 'nothing planned' };
  if (hold) await new Promise(res => setTimeout(res, hold));
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});
const hash = async h => { await page.evaluate(x => { location.hash = x; }, h); await page.waitForTimeout(1200); };
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };

/* ---- 1 · an answer in flight survives leaving the page ---- */
await t.go(`#/ai?line=${encodeURIComponent(sd.wsId)}`, 2500);
await page.evaluate(() => { const el = document.querySelector('[data-ai]'); if (el) el.setAttribute('data-test-live', 'same-screen'); });
plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 'c1', name: 'list_problems', input: { lineId: sd.wsId } }], assistant: { v: 1 }, model: 'test' }),
  () => ({ ok: true, reply: 'One problem is open on the line — the seeded snag.', suggestions: ['Which is the oldest?'], model: 'test' }),
];
hold = 2500;
await send('What is open on this line?');
await page.waitForTimeout(400);
const convId = await page.evaluate(() => new URLSearchParams(location.hash.split('?')[1] ?? '').get('c'));
await hash(`#/lines/${encodeURIComponent(sd.wsId)}`);
ok(/^#\/lines\//.test(await page.evaluate(() => location.hash)), '1 left for the line page while Luna is answering');
await page.waitForFunction(() => document.querySelector('[data-luna-parked] [data-ai]') !== null, null, { timeout: 5000 }).catch(() => undefined);
ok(await page.evaluate(() => !!document.querySelector('[data-luna-parked] [data-ai]')), '1 Luna is parked, still alive, while the line page is shown');
await page.waitForFunction(n => n >= 2, asks.length, { timeout: 1 }).catch(() => undefined);
for (let i = 0; i < 20 && asks.length < 2; i++) await page.waitForTimeout(500);
await page.waitForTimeout(3000);
ok(asks.length === 2 && asks[1]?.pending?.results?.[0]?.id === 'c1', `1 the answer went on while away: the read run and the second round asked (${asks.length} asks)`);
ok(/^#\/lines\//.test(await page.evaluate(() => location.hash)), `1 the line page's address never rewritten (${await page.evaluate(() => location.hash)})`);
ok((await page.locator('main .nv-tabs, .nv-tabs').count()) > 0, '1 the line page drawn as ever with Luna parked');
await hash(convId ? `#/ai?c=${convId}` : '#/ai');
ok(await page.evaluate(() => document.querySelector('[data-ai]')?.getAttribute('data-test-live') === 'same-screen'), '1 back on #/ai: the same live screen, never a new one');
const replies = await page.locator('.ai-turn.is-colleague').count();
ok(replies === 1 && /One problem is open/.test(await t.words('.ai-turn.is-colleague')) && (await page.locator('[data-ai-failed]').count()) === 0, `1 the answer is there, given while away (${replies} reply, none failed)`);
ok(new Set(asks.map(a => a.conversationId)).size === 1, '1 one conversation throughout');

/* ---- 2 · a proposal waiting survives leaving the page ---- */
hold = 0;
plan = [() => ({ ok: true, reply: '', calls: [{ id: 'w1', name: 'raise_problem', input: { lineId: sd.wsId, words: 'Film tension drifting on the wrapper', priority: 'high', how: 'observed' } }], assistant: { v: 2 }, model: 'test' }),
  () => ({ ok: true, reply: 'Raised it on the line.', model: 'test' })];
await send('Raise a problem — the film tension drifts on the wrapper');
await page.waitForSelector('[data-card="raise_problem"][data-card-status="waiting"]', { timeout: 8000 }).catch(() => undefined);
ok((await page.locator('[data-card="raise_problem"][data-card-status="waiting"]').count()) === 1, '2 the card waits for a yes');
await hash('#/tools');
ok(/^#\/tools/.test(await page.evaluate(() => location.hash)), '2 away to Tools with the card waiting');
await hash(convId ? `#/ai?c=${convId}` : '#/ai');
ok((await page.locator('[data-card="raise_problem"][data-card-status="waiting"]').count()) === 1, '2 back: the card still waiting');
await page.locator('[data-card="raise_problem"]').getByRole('button', { name: /Do it/ }).click();
await page.waitForTimeout(2500);
const raised = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllSnags()).filter(s => s.problem.startsWith('Film tension drifting')).length);
ok(raised === 1, `2 Do it raised the problem once (${raised})`);

/* ---- 3 · a conversation named by a link, opened while Luna is alive ---- */
const other = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const t0 = Date.now();
  await db.putStudy({ id: 'luna-other', tool: 'talk', name: 'Another conversation', facts: { colleague: true, named: 'Another conversation', turns: [{ id: 'x1', at: t0, who: 'You', kind: 'typed', text: 'An earlier question' }], threads: [], actions: [] }, uses: [], startedAt: t0, createdAt: t0, updatedAt: t0 });
  return 'luna-other';
});
await hash(`#/ai?c=${other}`);
ok(/An earlier question/.test(await t.words('[data-ai]')), '3 #/ai?c= opens the conversation it names');

/* ---- 4 · Manual Mode untouched; AI Mode off ---- */
await hash(`#/lines/${encodeURIComponent(sd.wsId)}`);
ok((await page.locator('.nv-tabs .nv-tab').count()) >= 5 && (await page.locator('[data-luna-slot]').count()) === 0, '4 the line page as ever: its tabs, no Luna on it');
await page.evaluate(async () => (await import('/src/colleague/aiMode.ts')).setAiMode(false));
await page.waitForTimeout(600);
ok((await page.locator('[data-luna-host] [data-ai]').count()) === 0, '4 AI Mode off: Luna holds nothing');
await hash('#/ai');
ok((await page.locator('[data-ai-off]').count()) === 1, '4 #/ai says AI Mode is off');
await page.evaluate(async () => (await import('/src/colleague/aiMode.ts')).setAiMode(true));
await page.waitForTimeout(600);

await t.finish('Luna persists across the app — an answer in flight, a card waiting and a linked conversation kept; Manual Mode untouched.');
