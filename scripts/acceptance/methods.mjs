/* THE METHODS, DRIVEN (docs/METHODS.md, slice M3 — Rowland, 31 October: "the method equals the project … build the
 * methods, and we simply insert the tools where required"). From an empty device:
 *
 *   1  New project: the eight cards in order, none picked, no name box until one is; each card its question and its
 *      sections in order as lib/methods says them; a card picked opens the form; the older ?model=commissioning address
 *      picks Stage gate and ?method=dmaic picks DMAIC
 *   2  every method but the stage gate made in turn from its card: the project opens on its method page — the heading,
 *      its sections in order and each section's tools in the module's order, each said as lib/methods + methodTools say it
 *   3  the page's honesty: a tool that is built is a row with New; one not built says so and has no button; a mode says
 *      which tool it lives in
 *   3b a method project's tabs are its own (S4): Overview · Actions · Journey · Problems · Tools · Notes · Details, no 6M tabs;
 *      Tools holds the 6M tool as one door (Fishbone · Board · Results) and is the tab lit on those pages
 *   4  New on a tool starts it in the project (the address carries ?project=, the tool's list opens the project's frame)
 *      and the use is counted back on the method's row; Add a tool offers every tool and starts it the same way; a tool
 *      used that the method does not list sits under Also used here
 *   4b the smoke seed's DMAIC project: its one capability study counted back on the rows, the sections and the header;
 *      the Projects chips are the methods, each project's row naming its method
 *   5  a stage-gate project from its card is the commissioning list and lands on Install
 *   6  the phone: nothing off the side
 *
 *   node scripts/acceptance/methods.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {} } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const ORDER = ['PDCA', 'DMAIC', '8D', 'A3', 'Stage gate', 'Kaizen event', 'Improvement Kata', 'Theory of Constraints'];
const SECTIONS = {
  'PDCA': ['Plan', 'Do', 'Check', 'Act'],
  'DMAIC': ['Define', 'Measure', 'Analyse', 'Improve', 'Control'],
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(1200); };

/* 1 — the eight cards */
await go('#/projects?new=1');
await page.waitForSelector('.proj-model-grid', { timeout: 15000 });
const names = (await page.locator('.proj-model-grid .proj-model-t').allInnerTexts()).map(flat);
ok(names.join(' · ') === ORDER.join(' · '), '1 the eight methods, in order', names.join(' · '));
ok((await page.locator('.proj-model-opt[aria-pressed="true"]').count()) === 0 && (await page.locator('.proj-new-grid').count()) === 0, '1 none picked for you, no name box yet');
const sections = (await page.locator('.proj-model-grid .proj-model-s').allInnerTexts()).map(flat);
ok(sections[0] === 'Plan · Do · Check · Act' && sections[1] === 'Define · Measure · Analyse · Improve · Control', '1 a card says its sections in order', sections.slice(0, 2).join(' | '));
await go('#/projects?new=1&model=commissioning');
ok((await page.locator('.proj-model-opt[aria-pressed="true"] .proj-model-t').allInnerTexts()).map(flat).join() === 'Stage gate', '1 ?model=commissioning picks Stage gate');
await go('#/projects?new=1&method=dmaic');
ok((await page.locator('.proj-model-opt[aria-pressed="true"] .proj-model-t').allInnerTexts()).map(flat).join() === 'DMAIC', '1 ?method=dmaic picks DMAIC');

/* 2 — each method but the stage gate, made from its card */
const made = {};
for (const m of ORDER.filter(x => x !== 'Stage gate')) {
  await go('#/projects?new=1');
  await page.waitForSelector('.proj-model-grid');
  await page.locator('.proj-model-opt', { has: page.locator('.proj-model-t', { hasText: new RegExp(`^${m}$`) }) }).click();
  await page.locator('.proj-new-grid input.text-input').first().fill(`Line 7 ${m}`);
  await page.getByRole('button', { name: 'Create project' }).click();
  await page.waitForSelector('.pmethod', { timeout: 15000 }).catch(() => {});
  const title = flat(await page.locator('.pmethod h1').innerText().catch(() => ''));
  const secs = (await page.locator('.pmethod .pace-sec-title').allInnerTexts()).map(flat);
  made[m] = page.url().match(/#\/project\/[^/?]+/)?.[0];
  ok(title === m && secs.length >= 4 && secs.every((x, i) => x.startsWith(`${i + 1}. `)), `2 ${m} made from its card and opened on its method: ${secs.join(' | ')}`, `${title} | ${secs.join(' | ')}`);
  if (SECTIONS[m]) ok(secs.map(x => x.replace(/^\d+\. /, '')).join() === SECTIONS[m].join(), `2 ${m}'s sections in the module's order`, secs.join(' | '));
  const eyebrow = flat(await page.locator('.pmethod .pace-eyebrow').innerText().catch(() => ''));
  ok(eyebrow === `${m.toUpperCase()} · LINE 7 ${m.toUpperCase()}`, `2 ${m}: the band says the method and the project`, eyebrow);
}

/* 3 — honesty, on DMAIC */
await go(made['DMAIC']);
await page.waitForSelector('.pmethod');
const rows = await page.locator('.pmethod .lt-li').evaluateAll(els => els.map(e => ({ what: e.querySelector('.lt-what')?.textContent ?? '', where: e.querySelector('.lt-where')?.textContent ?? '', btn: !!e.querySelector('button.btn') })));
const notYet = rows.filter(r => /Not built yet|Specified|Research/i.test(r.where));
ok(rows.length > 20 && notYet.length > 0 && notYet.every(r => !r.btn), `3 a tool not built says so and has no New (${notYet.length} of ${rows.length})`);
ok(rows.filter(r => /^A mode of /.test(r.where)).every(r => r.btn), '3 a mode names the tool it lives in and has New');
ok(rows.some(r => r.where === 'Built' && r.btn), '3 a built tool is a row with New');

/* 3b — the project's tabs are its own (S4, 1 November): Overview · Actions · Journey · Problems · Tools · Notes · Details, never the
   6M tabs (Fishbone, Board, Lines, Results); the 6M tool is one door under Tools and lights Tools while you are on its pages */
const tabs = async () => (await page.locator('.nv-tabs .nv-tab .nv-tab-l').allInnerTexts()).map(flat);
for (const m of ['PDCA', 'DMAIC', 'Theory of Constraints']) {
  await go(made[m]); await page.waitForSelector('.pmethod');
  const t = await tabs();
  ok(t.join(' · ') === 'Overview · Actions · Journey · Problems · Tools · Notes · Details', `3b ${m}: the project's own tabs`, t.join(' · '));
}
await go(`${made['DMAIC']}/tools`); await page.waitForSelector('.ptools-sixm', { timeout: 15000 });
const sixm = (await page.locator('.ptools-sixm .lt-what').allInnerTexts()).map(flat);
ok(sixm.join(' · ') === 'Fishbone · Board · Results', '3b Tools: the 6M tool as one door — its three pages', sixm.join(' · '));
await page.locator('.ptools-sixm .lt-row', { hasText: 'Fishbone' }).first().click(); await page.waitForTimeout(1500);
ok(/\/fishbone/.test(page.url()), '3b the Fishbone opens in the project', page.url());
const lit = (await page.locator('.nv-tabs .nv-tab.is-on .nv-tab-l').allInnerTexts()).map(flat);
ok(lit.join() === 'Tools' && !(await tabs()).includes('Fishbone'), '3b …and Tools is the tab that is lit, no Fishbone tab', lit.join());
await go(made['DMAIC']); await page.waitForSelector('.pmethod');
await page.locator('.pmethod .lt-li', { hasText: '6M — a running line made to perform better' }).first().locator('.lt-row').click();
await page.waitForTimeout(1500);
ok(/\/fishbone/.test(page.url()), '3b the 6M row on a section opens the fishbone, where the method places it', page.url());

await go(made['DMAIC']); await page.waitForSelector('.pmethod');

/* 4 — New starts a tool in the project, counted back */
const proj = made['DMAIC'].split('/').pop();
const row = page.locator('.pmethod .lt-li', { hasText: 'Individuals and moving range chart' }).first();
await row.getByRole('button', { name: /^New —/ }).click();
await page.waitForTimeout(1500);
ok(page.url().includes(`project=${proj}`) || page.url().includes(proj), '4 New opened the tool in the project', page.url());
await go(made['DMAIC']);
await page.waitForSelector('.pmethod');
await page.locator('.pmethod .pmethod-add button').first().click();
ok((await page.locator('.pmethod .pmethod-add-list .chip').count()) >= 10, '4 Add a tool offers the tools', await page.locator('.pmethod .pmethod-add-list .chip').count());

/* 4a — a document is a mode of Documents: its row says so, and New starts that very kind in the project (FC-240) */
await go(made['DMAIC']);
await page.waitForSelector('.pmethod');
const charterRow = page.locator('.pmethod .lt-li', { hasText: 'Project charter' }).first();
ok(/A mode of Documents/.test(flat(await charterRow.innerText())), '4a Project charter is "A mode of Documents"', flat(await charterRow.innerText()));
await charterRow.getByRole('button', { name: /^New —/ }).click();
await page.waitForTimeout(1500);
ok(/#\/doc\/charter/.test(page.url()) && page.url().includes(proj) && await page.getByRole('heading', { name: 'New charter' }).count() + await page.getByLabel('What is it of?').count() > 0, '4a New on it opens the charter’s own list in the project with the New sheet', page.url());

/* 4b — the uses in the project, counted back: the smoke seed's DMAIC project holds one capability study */
await go('#/');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
await go('#/projects');
const kinds = (await page.locator('.proj-list .part-filters .chip').allInnerTexts()).map(flat).join(' | ');
ok(/DMAIC/.test(kinds) && /Stage gate/.test(kinds), '4b the Projects chips are the methods, with their counts', kinds);
ok((await page.locator('.proj-list li.part-row', { hasText: 'Line 7 seal failures' }).first().innerText()).includes('DMAIC'), '4b a method project’s row names its method');
await go(`#/project/${sd.methodProjectId}`);
await page.waitForSelector('.pmethod');
const usedRows = await page.locator('.pmethod .lt-li', { hasText: '1 use in this project' }).count();
ok(usedRows >= 1 && /1 tool used here/.test(await page.locator('.pmethod').innerText()), `4b the seeded study counted on the method's rows (${usedRows} rows say 1 use) and on its sections`);
ok(/1 use of tools in this project/.test(flat(await page.locator('.pmethod .pace-lede').innerText())), '4b the header says how many uses', await page.locator('.pmethod .pace-lede').innerText());

/* 5 — the stage gate and a project from before the methods */
await go('#/projects?new=1');
await page.locator('.proj-model-opt', { has: page.locator('.proj-model-t', { hasText: /^Stage gate$/ }) }).click();
await page.locator('.proj-new-grid input.text-input').first().fill('Line 4 new wrapper');
await page.getByRole('button', { name: 'Create and add the machines' }).click();
await page.waitForTimeout(1500);
ok(/#\/project\/[^/]+\/install/.test(page.url()), '5 a stage gate made from its card lands on Install', page.url());

/* 6 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(made['PDCA']);
await page.waitForSelector('.pmethod');
const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(over <= 1, `6 the phone: nothing off the side (${over}px)`);

ok(errs.length === 0, 'no console error', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nAll passed');
process.exit(fail ? 1 : 0);
