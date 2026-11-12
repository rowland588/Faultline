/* ACCEPTANCE — ANSWERED IN CODE, NO AI ASKED (12 November; docs/AI-COST.md step 0; src/colleague/fastPath, screens/AiModeScreen
 * answeredInCode). Rowland, 12 November: "how much can we take into code and not use API at all"; of the floor: "walking around the
 * factory, headset on, talking away". While stops are timed, words that are exactly a tap said out loud run the same capability Luna
 * would have asked for — and NOTHING is sent to the AI service. Driven in a real browser on the smoke seed, every request to the
 * `assist` gateway counted by the script:
 *
 *   1  the measurement started the usual way (Luna, one card) — the only requests so far
 *   2  "<machine> stopped, <reason the line knows>" — the line's stopwatch running on that machine and reason, the reply the
 *      capability's own sentence, marked "Done in the app — no AI used", and NO request sent
 *   3  "running again" — the stop kept as an observation with its time, no request
 *   4  a stop with a reason the line does not know, said as stopped — kept in the person's words, no request; "undo that" takes it off
 *   5  a question ("why does it keep stopping?") and a stop with no reason go to Luna — one request each, as before
 *   6  the phone at 390: the same, nothing off the side
 *
 *   node scripts/acceptance/ai-fast.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task === 'budget') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'not here' }) });
  asks.push(body);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: true, reply: 'Luna answered.' }) });
});
let turns = 0;
const say = async (words, rounds = []) => {
  plan = rounds;
  await page.locator('.ai-box').fill(words);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  turns += 1;
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), turns, { timeout: 12000 }).catch(() => undefined);
  await page.waitForTimeout(500);
};
const db = (fn, arg) => page.evaluate(fn, arg);
const ws = () => db(async id => { const w = await (await import('/src/db.ts')).getWorkspace(id); return { timer: w?.activeTimer, assets: w?.assets ?? [], categories: w?.categories ?? [] }; }, sd.wsId);
const obs = () => db(async id => (await (await import('/src/db.ts')).listObservations(id)).filter(o => !o.deletedAt).map(o => ({ asset: o.asset, category: o.category, ms: o.durationMs })), sd.wsId);
const lastReply = () => page.locator('.ai-turn.is-colleague').last().innerText();

const w0 = await ws();
const machine = w0.assets[0], reason = w0.categories[0];
ok(!!machine && !!reason, `the seeded line has machines and reasons of its own (${machine} · ${reason})`);
await t.go(`#/ai?line=${encodeURIComponent(sd.wsId)}`, 3000);

/* ---- 1 · started the usual way ---- */
plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 'm1', name: 'start_measurement', input: { tool: 'stops', lineId: sd.wsId } }], assistant: { v: 1 } }),
  () => ({ ok: true, reply: 'Timing stops — say each one as it happens.' }),
];
await page.locator('.ai-box').fill('Time the stops on this line');
await page.getByRole('button', { name: 'Send', exact: true }).click();
await page.waitForSelector('[data-card="start_measurement"][data-card-status="waiting"]', { timeout: 10000 });
await page.locator('[data-card="start_measurement"]').getByRole('button', { name: 'Do it' }).click();
turns += 1;
await page.waitForFunction(() => !!document.querySelector('[data-measure]') && !document.querySelector('.ai-thinking'), null, { timeout: 12000 }).catch(() => undefined);
await page.waitForTimeout(600);
ok((await page.locator('[data-measure]').count()) === 1, '1 the measurement is running, started by Luna with one card');
const asked0 = asks.length;
ok(asked0 === 2, `1 starting it asked the AI service (${asked0} requests)`);

/* ---- 2 · a stop said as a tap ---- */
const n0 = (await obs()).length;
await say(`${machine} stopped, ${reason.toLowerCase()}`);
const w1 = await ws();
ok(w1.timer?.asset === machine && w1.timer?.category === reason, `2 the line’s stopwatch runs on ${machine} — ${reason}, as the line has them`);
ok(asks.length === asked0, `2 NOTHING was sent to the AI service (${asks.length - asked0} requests)`);
const r2 = await lastReply();
ok(r2.includes(`Timing the stop: ${machine}, ${reason}`), `2 the reply is the capability’s own sentence: "${r2.slice(0, 80)}"`);
ok((await page.locator('.ai-turn.is-colleague').last().locator('[data-ai-code]').count()) === 1 && /no AI used/.test(r2), '2 the reply says it was done in the app — no AI used');
ok((await page.locator('[data-card="capture_event"]').count()) === 0, '2 no card');

/* ---- 3 · running again ---- */
await page.waitForTimeout(1200);
await say('Running again');
const o3 = await obs();
ok(o3.length === n0 + 1 && o3.some(o => o.asset === machine && o.category === reason && o.ms >= 1000) && !(await ws()).timer, '3 the stop is kept with its time and the stopwatch is clear');
ok(asks.length === asked0, '3 nothing sent');
ok(/Kept: .* stopped for/.test(await lastReply()), '3 the reply says what was kept');

/* ---- 4 · a reason the line does not know, in the person's words; undo ---- */
await say(`${machine} stopped, bags not opening`);
ok((await ws()).timer?.category === 'Bags not opening', '4 a new reason is kept in the person’s words — because they said it stopped');
await say('undo that');
ok(!(await ws()).timer && /Taken back/.test(await lastReply()), '4 "undo that" takes it back');
ok(asks.length === asked0, '4 nothing sent');

/* ---- 5 · what code does not answer goes to Luna ---- */
await say('Why does it keep stopping?', [() => ({ ok: true, reply: 'Let me look at what has been timed.' })]);
ok(asks.length === asked0 + 1, '5 a question goes to Luna (one request)');
ok((await page.locator('.ai-turn.is-colleague').last().locator('[data-ai-code]').count()) === 0, '5 her answer is not marked as code');
await say(`${machine} stopped`, [() => ({ ok: true, reply: 'Why did it stop?' })]);
ok(asks.length === asked0 + 2 && !(await ws()).timer, '5 a stop with no reason is not guessed — Luna asks');
const sent = JSON.stringify(asks[asks.length - 1]);
ok(sent.includes('Timing the stop') || sent.includes('Kept:'), '5 Luna is told what was captured in code (the turns go with the next request)');

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 800 });
await page.waitForTimeout(600);
{ const back = page.getByRole('button', { name: 'Back to the conversation' }); if (await back.isVisible().catch(() => false)) await back.click(); await page.waitForTimeout(400); }
await say(`${machine} ${reason.toLowerCase()}`);
ok((await ws()).timer?.asset === machine && asks.length === asked0 + 2, '6 the phone: captured in code, nothing sent');
ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '6 nothing off the side');
await say('running again');

await t.done('answered in code');
