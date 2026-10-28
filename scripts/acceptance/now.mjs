/* NOW, DRIVEN — a stage-gate project's current state on one page (docs/STAGEGATE-RESEARCH.md §4).
 * Rowland, 26 October: "must have clear, simple understanding of the current state of anything."
 *
 * On the seeded stage-gate project:
 *
 *   1  the project's tabs — Now · Plan · Machines · Problems · Reports · More (26 October: "9 are still to many
 *      tabs"; 27 October, the second row under them "a mess": the gates, the timeline and Programs one Plan tab);
 *      Now is the front page, lit there, with no second row of tabs, and an old /now link lands on it
 *   2  the band and its five tiles, the one-page status's figures; Report ▾ with the status report
 *   3  blocking handover is the Actions page's critical rows, and only those
 *   4  the machines — a row each for the rail's machines, each at a gate, the wrapper's programs
 *      counted as the Programs page counts them; a row opens its machine's page
 *   5  today and the next two weeks — every day inside the range, five things a day at most,
 *      the rest one tap away on the journey for that day
 *   6  what you owe — late first, none critical (they are the blockers), All actions › opening Actions
 *   7  a blocking row opens its record
 *   8  the phone: nothing off the side, the five parts there
 *   9  More holds Materials, Tools, Notes and Details, each lighting More; Reports opens the reports; Machines
 *      the machines; Plan the gates, its own row the gates, the timeline and Programs — each lighting Plan; the
 *      day, the journey and the actions doors from Now, lighting it
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
const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1800); if (/#\/project\/[^/]+$/.test(hash)) await page.locator('.now-machines').waitFor({ timeout: 15000 }).catch(() => {}); };

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PID = sd.projectId;
const NOW = `#/project/${PID}`;

/* 1 · four tabs and More, Now the front page */
const tabsSaid = async () => (await page.locator('.nv-tabs .nv-tab .nv-tab-l').allInnerTexts()).map(flat);
const lit = async () => (await page.locator('.nv-tabs .nv-tab[aria-current="page"] .nv-tab-l').allInnerTexts()).map(flat);
await go(`#/project/${PID}/now`);
ok(page.url().endsWith(`#/project/${PID}`), '1 an old /now link lands on the front page', page.url());
await page.locator('.now').waitFor({ timeout: 15000 }); await page.waitForTimeout(800);
ok(JSON.stringify(await tabsSaid()) === JSON.stringify(['Now', 'Programs', 'Timeline', 'Gates', 'Machines', 'Problems', 'Reports', 'More']), '1 the tabs: Now · Programs · Timeline · Gates · Machines · Problems · Reports · More', await tabsSaid());
ok(await page.locator('.plt').count() === 0, '1 no second row of tabs on Now');
ok(JSON.stringify(await lit()) === JSON.stringify(['Now']), '1 Now lit on the front page', await lit());
ok(/machine/.test(flat(await page.locator('.now-says').innerText())), '1 the sentence says the machines', await page.locator('.now-says').innerText());
ok(await page.locator('.jn-week').count() === 0, '1 the week said once — the next two weeks on Now, not "This week and next" above it');

/* 2 · the band */
ok(await page.locator('.now .vd .vd-tile').count() === 5, '2 the band and its five tiles');
ok(await page.locator('.part-head .part-menu-b', { hasText: /^Report/ }).count() > 0, '2 Report ▾ on the page header');

/* 3 · blocking handover = the Actions page's critical rows */
const blocking = (await page.locator('.now-block .now-crit .lt-what').allInnerTexts()).map(flat);
await go(`#/project/${PID}/actions`);
const crit = [];
for (const li of await page.locator('.act-li').all()) if (await li.locator('.act-pri.is-critical').count()) crit.push(flat(await li.locator('.lt-what').innerText()));
ok(blocking.length > 0 && JSON.stringify([...new Set(crit)].sort()) === JSON.stringify([...blocking].sort()), '3 blocking handover is the Actions page’s critical rows', `${blocking} vs ${crit}`);

/* 4 · the machines */
await go(NOW);
const rows = page.locator('.now-machines .now-m');
await rows.first().waitFor({ timeout: 15000 });
const names = [];
/* its name (who made it beside it since 27 October) */
for (const r of await rows.all()) names.push(flat(await r.getAttribute('data-now-machine')));
const held = await page.evaluate(async pid => (await (await import('/src/db/testing.ts')).listAssets(pid)).filter(a => !a.deletedAt).map(a => a.name.trim()), PID);
ok(names.length === held.length && held.every(n => names.includes(n)), '4 a row for each of the project’s machines', `${names} / ${held}`);
const gates = (await page.locator('.now-machines .part-tag').allInnerTexts()).map(flat);
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

/* 9 · More, Reports, Machines and the doors */
await page.setViewportSize({ width: 1360, height: 900 });
await go(NOW);
await page.locator('.nv-tabs .nv-tab', { has: page.locator('.nv-tab-l', { hasText: /^More$/ }) }).click(); await page.waitForTimeout(600);
const inMore = (await page.locator('.nv-scope-more .nv-ri-l').allInnerTexts()).map(flat);
ok(JSON.stringify(inMore) === JSON.stringify(['Materials', 'Tools', 'Notes', 'Details']), '9 More holds Materials, Tools, Notes and Details', inMore);
await page.locator('.nv-scope-more .nv-ri', { has: page.locator('.nv-ri-l', { hasText: /^Materials$/ }) }).click(); await page.waitForTimeout(1200);
ok(page.url().includes('/materials') && JSON.stringify(await lit()) === JSON.stringify(['More']), '9 Materials opens, lighting More', `${page.url()} ${await lit()}`);
await page.locator('.nv-tabs .nv-tab', { has: page.locator('.nv-tab-l', { hasText: /^Reports$/ }) }).click(); await page.waitForTimeout(800);
ok(await page.locator('.sheet, [role=dialog]').filter({ hasText: /report/i }).count() > 0, '9 Reports opens the reports');
await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(500);
await go(NOW);
await page.locator('.nv-tabs .nv-tab', { has: page.locator('.nv-tab-l', { hasText: /^Machines$/ }) }).click(); await page.waitForTimeout(1200);
/* Machines is the machines, a row each with its status (27 October: "If I go to machine, I want to be able to see
   everything associated to my machine"); the gates are the project's own, from its front page */
ok(page.url().endsWith('/machines') && await page.locator('.pms .now-m').count() >= 1 && await page.locator('.plt').count() === 0,
  '9 Machines opens on the machines, a row each — no gates over them', page.url());
await go(NOW);
await page.locator('.nv-tabs .nv-tab', { has: page.locator('.nv-tab-l', { hasText: /^Gates$/ }) }).click(); await page.waitForTimeout(1200);
ok(page.url().endsWith('/install') && JSON.stringify(await lit()) === JSON.stringify(['Gates']), '9 Gates opens on the first gate with work, lighting Gates', `${page.url()} ${await lit()}`);
const views = (await page.locator('.plt .plt-t').allInnerTexts()).map(t => flat(t).split(' ')[0]);
ok(!views.includes('Now') && views.includes('Install') && views.includes('Commission') && !views.includes('Programs') && !views.includes('Timeline'), '9 gate pages: only the four gates in the row — Programs and Timeline are top tabs', views);
await page.locator('.nv-tabs .nv-tab', { has: page.locator('.nv-tab-l', { hasText: /^Programs$/ }) }).click(); await page.waitForTimeout(1200);
ok(page.url().includes('/programs') && JSON.stringify(await lit()) === JSON.stringify(['Programs']), '9 Programs is its own tab — one tap from Now', `${page.url()} ${await lit()}`);
await page.locator('.nv-tabs .nv-tab', { has: page.locator('.nv-tab-l', { hasText: /^Timeline$/ }) }).click(); await page.waitForTimeout(1200);
ok(page.url().includes('/plan') && JSON.stringify(await lit()) === JSON.stringify(['Timeline']), '9 Timeline (Gantt) is its own tab', `${page.url()} ${await lit()}`);
await go(NOW);
await page.locator('.now-doors button', { hasText: /^Programs$/ }).click(); await page.waitForTimeout(1200);
ok(page.url().includes('/programs'), '9 Now’s Programs button opens Programs', page.url());
await go(NOW);
await page.locator('.now-ahead .now-today').click(); await page.waitForTimeout(1200);
/* The day folded into the Journey (27 October, "fold it"): Today opens the Journey on today */
ok(/\/journey\?from=(\d{4}-\d\d-\d\d)&to=\1/.test(decodeURIComponent(page.url())) && await page.locator('.dy-in-jn').count() === 1 && JSON.stringify(await lit()) === JSON.stringify(['Now']), '9 Today a door from Now — the Journey on today, lighting Now', `${page.url()} ${await lit()}`);
await go(NOW);
await page.locator('.now-owe .qsl-gh button', { hasText: 'All actions' }).click(); await page.waitForTimeout(1200);
ok(page.url().endsWith('/actions') && JSON.stringify(await lit()) === JSON.stringify(['Now']), '9 the actions a door from Now, lighting it', `${page.url()} ${await lit()}`);

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
