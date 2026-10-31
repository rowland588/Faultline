/* Hand-overs between the Statistics tools (knowledge/specs/FC-086-hand-overs.md; docs/TOOLS-WORLDS.md W2 — Rowland, 30 October:
 * "this tool says X, now link to this tool").
 *
 *   1  a capability study the tool says is not steady: Next, with the tool's own sentence as the reason; a steady one: nothing
 *   2  the button opens the sharing sheet already on the chart; nothing exists until Start; Start makes the chart with the readings
 *   3  a steady chart with its limits set and the specification typed: Next › Check capability, making the capability study
 *   4  the same chart given a signal, or with no specification: nothing
 *   5  the phone — the line wraps, the button is at least 44 px, nothing off the side
 *
 *   node scripts/acceptance/hand-overs.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools|Failed to load resource/i;
let fail = 0;
const ok = (c, m, d) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && d ? ` — ${String(d).slice(0, 400)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const mk = async vp => {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: vp, locale: 'en-GB' });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(`console: ${m.text().slice(0, 160)}`); });
  return { ctx, page, errs };
};
const D = await mk({ width: 1360, height: 900 });
const page = D.page;
const go = async h => { await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 5000 }).catch(() => {}); await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2500); };
const getStudy = id => page.evaluate(async i => (await import('/src/db.ts')).getStudy(i), id);
const idOf = tool => decodeURIComponent(page.url().split(`/${tool}/`)[1]?.split('?')[0] ?? '');

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const made = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts'); const ch = await import('/src/tools/chart/chart.ts');
  const line = (await db.listWorkspaces()).find(w => !w.deletedAt && !w.archivedAt);
  const t = Date.now() - 86_400_000;
  const steady = Array.from({ length: 30 }, (_, i) => 400 + (((i * 7) % 5) - 2) * 0.4);
  const drifting = Array.from({ length: 30 }, (_, i) => 395 + i * 0.35);
  const rd = vals => vals.map((v, i) => ({ id: uid(), value: v, at: t + i * 60_000 }));
  const mkS = (tool, name, agreed, vals) => ({ id: uid(), tool, name, workspaceId: line.id, agreed, facts: { readings: rd(vals) }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  const lim = { kind: 'limits', count: 30, unit: 'g', nominal: 400, lower: 390, upper: 410 };
  const chartOf = (name, vals, spec = true) => { const a = { kind: 'xmr', name, unit: 'g', ...(spec ? { lower: 390, upper: 410 } : {}) }; const s = mkS('chart', name, { chart: a }, vals); const fr = ch.freezeFrom(a, s.facts.readings, 1, 20); s.agreed.chart.frozen = fr; return s; };
  const list = [mkS('capability', 'Drifting fill', { readings: lim }, drifting), mkS('capability', 'Steady fill', { readings: lim }, steady),
    chartOf('Steady chart', steady), chartOf('Drifting chart', drifting), chartOf('Steady chart no spec', steady, false)];
  for (const s of list) await db.putStudy(s);
  return { drift: list[0].id, steadyCap: list[1].id, chart: list[2].id, chartSignal: list[3].id, chartNoSpec: list[4].id, n: 30 };
});
const next = () => page.locator('[data-next-step]');

/* 1 */
await go(`#/capability/${made.drift}`);
ok((await next().count()) === 1 && (await next().getAttribute('data-next-step')) === 'chart', '1 a capability study the tool says is not steady shows Next, to the chart');
const truth = await page.evaluate(async id => { const db = await import('/src/db.ts'); const m = await import('/src/tools/capability/sample.ts'); const s = await db.getStudy(id); return m.checksSay(m.sample(s.agreed.readings, s.facts.readings), s.agreed.readings).find(c => c.k === 'steady')?.text; }, made.drift);
ok(flat(await next().innerText()).includes(flat(truth)) && /^Next/.test(flat(await next().innerText())), `1 its reason is the tool's own sentence — "${flat(truth).slice(0, 70)}"`, flat(await next().innerText()));
await go(`#/capability/${made.steadyCap}`);
ok((await next().count()) === 0, '1 a steady one shows nothing');

/* 2 */
await go(`#/capability/${made.drift}`);
const before = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(s => s.tool === 'chart').length);
await next().getByRole('button', { name: /Chart these readings/ }).click(); await page.waitForTimeout(800);
const sheet = page.locator('[data-sheet="share-readings"]');
ok(await sheet.locator('.sr-opt[data-target="chart"][aria-checked="true"]').count() === 1, '2 the button opens the sharing sheet already on the chart');
ok((await page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(s => s.tool === 'chart').length)) === before, '2 nothing exists until Start');
await page.getByRole('button', { name: 'Chart these readings', exact: true }).click(); await page.waitForTimeout(3000);
const c = await getStudy(idOf('chart'));
ok(c?.tool === 'chart' && c.facts.readings.length === made.n && c.facts.copiedFrom?.id === made.drift, '2 Start makes the chart with the readings, its origin noted');

/* 3 */
await go(`#/chart/${made.chart}`);
ok((await next().count()) === 1 && (await next().getAttribute('data-next-step')) === 'capability' && /Check capability/.test(await next().innerText()), '3 a steady chart with limits set and the specification typed: Next › Check capability');
await next().getByRole('button', { name: /Check capability/ }).click(); await page.waitForTimeout(800);
ok(await page.locator('[data-sheet="share-readings"] .sr-opt[data-target="capability"][aria-checked="true"]').count() === 1, '3 the sheet opens on capability');
await page.getByRole('button', { name: 'Check capability', exact: true }).click(); await page.waitForTimeout(3000);
const k = await getStudy(idOf('capability'));
ok(k?.tool === 'capability' && k.agreed?.readings?.lower === 390 && k.agreed.readings.upper === 410 && k.facts.readings.length === made.n, '3 the capability study is made, the specification carried');

/* 4 */
await go(`#/chart/${made.chartSignal}`);
ok((await next().count()) === 0, '4 a chart with a signal shows nothing');
await go(`#/chart/${made.chartNoSpec}`);
ok((await next().count()) === 0, '4 a chart with no specification shows nothing');

/* 5 */
const P = await mk({ width: 375, height: 800 });
const pp = P.page;
await pp.goto(`${BASE}/#/room`); await pp.waitForTimeout(2500);
await pp.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
await pp.evaluate(async s => { await (await import('/src/db.ts')).putStudy(s); }, await getStudy(made.drift));
await pp.goto(`${BASE}/#/capability/${made.drift}`); await pp.waitForTimeout(2800);
const ns = pp.locator('[data-next-step]');
ok((await ns.count()) === 1, '5 the phone shows it');
ok(!(await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), '5 nothing off the side');
const bb = await ns.locator('button').boundingBox();
ok(bb && bb.height >= 44, '5 the button is at least 44 px', JSON.stringify(bb));
const errs = [...D.errs, ...P.errs];
ok(!errs.length, `no console error${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\nHand-overs NOT accepted: ${fail} failed` : '\nHand-overs accepted: a tool says what to look at next, with its own reason, and never starts anything itself.');
process.exit(fail ? 1 : 0);
