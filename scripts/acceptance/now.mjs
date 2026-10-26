/* NOW, DRIVEN — a stage-gate project's current state on one page (docs/STAGEGATE-RESEARCH.md §4).
 * Rowland, 26 October: "must have clear, simple understanding of the current state of anything."
 *
 * On the seeded stage-gate project:
 *
 *   1  Now on the project's rail, lit on its page; the front page is where it was
 *   2  the band and its tiles are the front page's, word for word
 *   3  blocking handover is the Actions page's critical rows, and only those
 *   4  the machines — a row each for the rail's machines, each at a gate, the wrapper's programs
 *      counted as the Programs page counts them; a row opens its machine's page
 *   5  today and the next two weeks — every day inside the range, five things a day at most,
 *      the rest one tap away on the journey for that day
 *   6  what you owe — late first, none critical (they are the blockers), All actions › opening Actions
 *   7  a blocking row opens its record
 *   8  the phone: nothing off the side, the five parts there
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/now.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1800); };

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PID = sd.projectId;
const NOW = `#/project/${PID}/now`;

/* 1 · the rail */
await go(`#/project/${PID}`);
const front = flat(await page.locator('.vd').first().innerText());
/* the project's own pages are its tabs across the top (23 October) — Now beside Overview */
const railNow = page.locator('.nv-tabs .nv-tab').filter({ hasText: /^Now$/ });
ok(await railNow.count() > 0, '1 Now among the project’s own pages');
await railNow.first().click();
await page.locator('.now').waitFor({ timeout: 15000 }); await page.waitForTimeout(1200);
ok(page.url().endsWith('/now'), '1 the rail’s Now opens the page', page.url());
ok(await page.locator('.nv-tabs .nv-tab[aria-current="page"]').filter({ hasText: /^Now$/ }).count() > 0, '1 Now lit on its page');
ok(/machine/.test(flat(await page.locator('.now-says').innerText())), '1 the sentence says the machines', await page.locator('.now-says').innerText());

/* 2 · the band is the front page's */
const band = flat(await page.locator('.now .vd').first().innerText());
ok(band === front, '2 the band and its tiles are the front page’s, word for word', `${band}\n≠\n${front}`);

/* 3 · blocking handover = the Actions page's critical rows */
const blocking = (await page.locator('.now-block .now-crit .lt-what').allInnerTexts()).map(flat);
await go(`#/project/${PID}/actions`);
const crit = [];
for (const li of await page.locator('.act-li').all()) if (await li.locator('.act-pri.is-critical').count()) crit.push(flat(await li.locator('.lt-what').innerText()));
ok(blocking.length > 0 && JSON.stringify([...new Set(crit)].sort()) === JSON.stringify([...blocking].sort()), '3 blocking handover is the Actions page’s critical rows', `${blocking} vs ${crit}`);

/* 4 · the machines */
await go(NOW);
const rows = page.locator('.now-machines .now-m');
const names = [];
for (const r of await rows.all()) names.push(flat((await r.locator('.lt-what').innerText()).replace(/\s(Install|Set up|Commission|Hand over|Handed over|Due on site)$/, '')));
const held = await page.evaluate(async pid => (await (await import('/src/db/testing.ts')).listAssets(pid)).filter(a => !a.deletedAt).map(a => a.name.trim()), PID);
ok(names.length === held.length && held.every(n => names.includes(n)), '4 a row for each of the project’s machines', `${names} / ${held}`);
const gates = (await page.locator('.now-machines .now-gate').allInnerTexts()).map(flat);
ok(gates.length === names.length && gates.every(g => /^(Install|Set up|Commission|Hand over|Handed over|Due on site)$/.test(g)), '4 each at a gate, in words', gates);
const wrapper = flat(await rows.filter({ hasText: 'Ilapak flow wrapper' }).locator('.lt-says').innerText());
const m = wrapper.match(/Programs: (\d+) of (\d+) passed(?: · (\d+) didn’t pass)?/);
await go(`#/project/${PID}/programs`);
const progText = flat(await page.locator('.wrap').first().innerText());
ok(!!m, '4 the wrapper says its programs passed of all', wrapper);
if (m) {
  /* the Programs page's reading for the job: "N programs · K done …" counts every machine; the wrapper carries them all on the seed */
  const total = progText.match(/(\d+) programs? ·/);
  ok(!!total && Number(total[1]) >= Number(m[2]), '4 the wrapper’s programs are within the Programs page’s count', `${m[0]} / ${total?.[0]}`);
}
await go(NOW);
await page.locator('.now-machines .now-m button').first().click();
await page.waitForTimeout(1200);
ok(/\/machine\//.test(page.url()), '4 a machine row opens its machine’s page', page.url());

/* 5 · today and the next two weeks */
await go(NOW);
const today = await page.evaluate(async () => (await import('/src/lib/weeks.ts')).todayISO?.() ?? new Date().toISOString().slice(0, 10)).catch(() => new Date().toISOString().slice(0, 10));
const days = await page.locator('.now-ahead .now-day').evaluateAll(els => els.map(e => ({ d: e.getAttribute('data-now-day'), n: e.querySelectorAll('.jn-li').length, more: !!e.querySelector('.now-more') })));
const end = new Date(new Date(`${today}T12:00:00Z`).getTime() + 14 * 864e5).toISOString().slice(0, 10);
ok(days.length > 0 && days.every(x => x.d >= today && x.d <= end), '5 every day inside today and the next two weeks', JSON.stringify(days));
ok(days.every(x => x.n <= 5), '5 five things a day at most', JSON.stringify(days));
const more = page.locator('.now-ahead .now-more button').first();
if (await more.count()) {
  const d = days.find(x => x.more)?.d;
  await more.click(); await page.waitForTimeout(1200);
  ok(page.url().includes('/journey') && page.url().includes(`from=${d}`) && page.url().includes(`to=${d}`), '5 the rest of a day one tap away on the journey', page.url());
} else ok(true, '5 no day with more than five');

/* 6 · what you owe */
await go(NOW);
const owe = await page.locator('.now-owe .act-li').evaluateAll(els => els.map(e => ({ late: e.classList.contains('is-late'), crit: !!e.querySelector('.act-pri.is-critical') })));
ok(owe.length > 0 && owe.length <= 6, '6 what you owe — six at most', owe.length);
const firstNotLate = owe.findIndex(x => !x.late);
ok(firstNotLate === -1 || owe.slice(firstNotLate).every(x => !x.late), '6 late first', JSON.stringify(owe));
ok(owe.every(x => !x.crit), '6 none critical — they are the blockers');
await page.locator('.now-owe .qsl-gh button', { hasText: 'All actions' }).click(); await page.waitForTimeout(1000);
ok(page.url().endsWith('/actions'), '6 All actions › opens Actions', page.url());

/* 7 · a blocking row opens its record */
await go(NOW);
await page.locator('.now-block .now-crit button').first().click(); await page.waitForTimeout(1200);
ok(/[?&]open=/.test(page.url()) && await page.locator('.rd-title').first().isVisible(), '7 a blocking row opens its record in the drawer', page.url());

/* 8 · the phone — the same device, narrowed */
await page.setViewportSize({ width: 390, height: 844 });
await go(NOW);
const pp = page;
ok(await pp.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 0, '8 the phone: nothing off the side');
for (const sel of ['.now .vd', '.now-block', '.now-machines .now-m', '.now-ahead', '.now-owe']) ok(await pp.locator(sel).first().isVisible(), `8 the phone: ${sel}`);

ok(errs.length === 0, 'no console error anywhere', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} failed` : '\nall passed');
process.exit(fail ? 1 : 0);
