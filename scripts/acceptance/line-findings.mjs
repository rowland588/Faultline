/* WHAT LUNAR HAS FOUND ON A LINE (12 November, docs/LUNAR-BRAIN.md B1 — Rowland: "Lunar does its homework before the question is
 * asked … Luna must understand why things happen … a recorded reason is not a cause"). A line is made with stops of known age:
 * Jam on the Bagger seven times in the last week and three in the three before, a Film break on the Wrapper, and two stops booked to
 * "Operator issue". Then:
 *   1  the line's Overview, More about this line opened — What LUNAR has found, Up to date, each finding's sentence equal to the
 *      engine's (lib/brain/engine homework) on the same records, with its sureness word, what it cannot say and its money
 *   2  "Operator issue" said to be a description, not a cause; the change said unlikely to be chance
 *   3  kept: one 'brain' study for the line, worked once — a reload does not work it again
 *   4  a stop added moves it with no reload (the next homework counts it)
 *   5  a line with nothing timed says so in words
 *   6  the phone: nothing off the side
 *   node scripts/acceptance/line-findings.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { openLineMore } from '../lib/lineMore.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: { } } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const go = async (h, ms = 2200) => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(ms); await openLineMore(page); };
await go('#/room');
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

const made = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const DAY = 86_400_000, t = Date.now(), uid = () => crypto.randomUUID();
  const w = await db.createWorkspace('Brain L1'); await db.updateWorkspace({ ...w, assets: ['Bagger', 'Wrapper'] });
  const e = await db.createWorkspace('Brain empty');
  const stop = (ago, min, asset, category) => db.addObservation({ id: uid(), workspaceId: w.id, category, asset, startedAt: t - ago * DAY, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: t, updatedAt: t });
  for (let i = 0; i < 7; i++) await stop(0.4 + i * 0.8, 6, 'Bagger', 'Jam');
  for (const d of [10, 16, 24]) await stop(d, 6, 'Bagger', 'Jam');
  await stop(3.5, 12, 'Wrapper', 'Film break');
  await stop(2.5, 10, 'Bagger', 'Operator issue'); await stop(12.5, 12, 'Wrapper', 'Operator issue');   // 22 of 94 min = 23%, over the fifth the engine flags
  return { ws: w.id, empty: e.id };
});

/* 1–2 the page against the engine */
await go(`#/lines/${made.ws}`, 3500);
const sec = page.locator('[data-line-findings]');
await page.locator('[data-line-findings] [data-finding]').first().waitFor({ timeout: 15000 }).catch(() => {});
ok(await sec.count() === 1, '1 What LUNAR has found is on the line’s Overview, inside More about this line');
ok(flat(await sec.locator('[data-brain-state-word]').textContent()).startsWith('Up to date'), '1 its homework said to be up to date', await sec.locator('[data-brain-state-word]').textContent());
const engine = await page.evaluate(async (ws) => {
  const db = await import('/src/db.ts'); const { lineBrain } = await import('/src/lib/brain/homework.ts');
  const w = (await db.listWorkspaces()).find(x => x.id === ws);
  return (await lineBrain(w)).findings.map(f => ({ kind: f.kind, says: f.says, sure: f.sure, money: f.money?.words ?? '', limits: f.limits.join(' ') }));
}, made.ws);
const rows = await sec.locator('[data-finding]').evaluateAll(els => els.map(el => ({ kind: el.getAttribute('data-finding'), says: el.querySelector('.lf-says')?.textContent ?? '', how: el.querySelector('.lf-how')?.textContent ?? '', money: el.querySelector('.lf-money')?.textContent ?? '', limits: el.querySelector('.lf-limits')?.textContent ?? '' })));
ok(engine.length >= 4 && rows.length === engine.length, `1 a row for every finding the engine made (${rows.length} of ${engine.length})`, JSON.stringify(engine.map(f => f.kind)));
ok(engine.every((f, i) => rows[i] && flat(rows[i].says) === flat(f.says) && flat(rows[i].money) === flat(f.money) && flat(rows[i].limits).includes(flat(f.limits))), '1 each sentence, its money and what it cannot say are the engine’s own', JSON.stringify({ rows, engine }).slice(0, 600));
const SURE = { measured: 'Measured', significant: 'Unlikely to be chance', suggestive: 'Could be chance', thin: 'Too few records' };
ok(engine.every((f, i) => rows[i]?.how.startsWith(SURE[f.sure])), '1 each says how sure it is in words');
const changed = engine.find(f => f.kind === 'changed');
ok(changed && changed.sure === 'significant' && /more stops; unlikely to be chance/.test(changed.says), '2 seven Jams in a week against three before: more stops, unlikely to be chance', changed?.says);
const recorded = engine.find(f => f.kind === 'recorded');
ok(recorded && /“Operator issue” — a description, not a cause/.test(recorded.says), '2 “Operator issue” said to be a description, not a cause', recorded?.says);
ok(engine.some(f => f.kind === 'recurs' && /Jam on the Bagger has come back/.test(f.says)), '2 Jam on the Bagger said to recur');

/* 3 kept once */
const keptAt = async () => page.evaluate(async (ws) => { const db = await import('/src/db.ts'); const s = await db.getStudy(`brain-${ws}`); return s && !s.deletedAt ? { tool: s.tool, at: s.facts.brain.at } : null; }, made.ws);
const k1 = await keptAt();
ok(k1?.tool === 'brain', '3 kept as one brain study for the line');
await go(`#/lines/${made.ws}`, 3000);
const k2 = await keptAt();
ok(k2?.at === k1?.at, '3 a reload does not work the same records again');

/* 4 a stop added moves it with no reload */
const before = flat(await sec.locator('[data-finding="where"] .lf-says').textContent());
await page.evaluate(async (ws) => { const db = await import('/src/db.ts'); const t = Date.now(); await db.addObservation({ id: crypto.randomUUID(), workspaceId: ws, category: 'Film break', asset: 'Wrapper', startedAt: t - 3_600_000, durationMs: 30 * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: t, updatedAt: t }); }, made.ws);
await page.waitForFunction((b) => { const el = document.querySelector('[data-finding="where"] .lf-says'); return el && el.textContent.replace(/\s+/g, ' ').trim() !== b; }, before, { timeout: 10_000 }).catch(() => {});
const after = flat(await sec.locator('[data-finding="where"] .lf-says').textContent());
ok(after !== before && /in 14 stops/.test(after), '4 a stop timed moves the finding with no reload', after);

/* 5 nothing timed */
await go(`#/lines/${made.empty}`, 3000);
ok(/Nothing timed on this line to work from yet/.test(flat(await page.locator('[data-brain-empty]').textContent().catch(() => ''))), '5 a line with nothing timed says so in words');

/* 6 the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/lines/${made.ws}`, 3000);
const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(over <= 1 && await page.locator('[data-line-findings] [data-finding]').count() >= 3, '6 the phone: the findings shown, nothing off the side', `over ${over}`);

ok(errors.length === 0, 'no errors on the page', errors.join(' | '));
await browser.close();
console.log(fail ? `\n${fail} failed` : '\nall passed');
process.exit(fail ? 1 : 0);
