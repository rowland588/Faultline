/* GUIDANCE AND PICTURES, DRIVEN (docs/METHODS.md §15 — Rowland, 1 November 2026: "Projects .. just like tools I want pictures
 * so user can see.. also all tools must have user guidance.. whats each step means"). On the smoke seed:
 *
 *   1  New project: every one of the eight cards wears a picture that really loaded (an image with a width), and a
 *      How it works › link to the method's own page — the card itself still picks the method
 *   2  each of the eight methods' own page (#/methods/:key): its name, its question, its picture, when to reach for it ·
 *      not for · an example, every step of the method in order each said as What it means · What to do · What you get
 *      (the words lib/methodGuide holds), the tools that fit each step with their status in words, where it comes from,
 *      the other seven one tap away
 *   3  Start a {method} project opens New project with that method picked; an unknown key says so; a bare #/methods
 *      still lands on the Factory (the old address)
 *   4  a tool's own page (#/tools/capability) shows How it works — each step the tool's guide holds, in order, each
 *      as the three parts; a tool whose modes carry their own steps (Reliability) folding them under its own and opening one; the context bar's How it works opens the same steps over a
 *      tool's list and over one of its records, and closes with Escape
 *   5  a method project's step: What this step means opens to the three parts for that step (lib/methodGuide)
 *   6  the phone: the method page and a tool's page have nothing off the side
 *
 *   node scripts/acceptance/guidance.mjs      (SMOKE_BASE, as smoke) */
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
const unfold = async (pg, id) => { const f = pg.locator(`[data-fold="${id}"]`); if (await f.count() && !(await f.evaluate(e => e.classList.contains('is-open')))) { await f.locator('.fold-toggle').click(); await pg.waitForTimeout(250); } };   // a fold opened where its contents are read (10 November, docs/DESIGN.md)

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async h => { await page.goto(`${BASE}/${h}`, { waitUntil: 'domcontentloaded', timeout: 120000 }); await page.waitForTimeout(1500); };

/* the words, from the modules (read in the page, so nothing here is typed twice) */
const words = await (async () => {
  await go('#/room');
  return page.evaluate(async () => {
    const { METHODS } = await import('/src/lib/methods.ts');
    const { METHOD_GUIDE } = await import('/src/lib/methodGuide.ts');
    return { methods: METHODS.map(m => ({ key: m.key, name: m.name, question: m.question, sections: m.sections.map(s => s.name), tools: m.sections.map(s => s.tools.length) })),
      guide: Object.fromEntries(Object.entries(METHOD_GUIDE).map(([k, g]) => [k, { whenToUse: g.whenToUse, notFor: g.notFor, example: g.example, sections: g.sections }])) };
  });
})();
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* 1 — the cards */
await go('#/projects?new=1');
await page.waitForSelector('.proj-model-grid', { timeout: 30000 });
await page.waitForTimeout(1500);
const pics = await page.locator('.proj-model-opt .tc-pic img').evaluateAll(els => els.map(e => ({ w: e.naturalWidth, src: e.getAttribute('src') })));
ok(pics.length === 8 && pics.every(p => p.w >= 960), `1 a picture on each of the eight cards, every one loaded at full size (${pics.map(p => p.w).join(',')})`, JSON.stringify(pics));
ok(pics.map(p => p.src).join() === words.methods.map(m => `/methods/${m.key}.png`).join(), '1 each card shows its own method’s picture, in the order of the methods');
const links = await page.locator('.proj-model-card .proj-model-more').evaluateAll(els => els.map(e => e.getAttribute('href')));
ok(links.join() === words.methods.map(m => `#/methods/${m.key}`).join(), '1 How it works › on each card, to that method’s page', links.join());
await page.locator('.proj-model-card .proj-model-more').nth(1).click();
await page.waitForSelector('.tp[data-method]', { timeout: 15000 });
ok(/#\/methods\/dmaic/.test(page.url()) && /^DMAIC$/.test(flat(await page.locator('.pace-head h1').innerText())), '1 the link opens DMAIC’s own page', page.url());
ok((await page.locator('.proj-model-opt[aria-pressed="true"]').count()) === 0, '1 a card’s link never picked the method for you');

/* 2 — every method's own page */
for (const m of words.methods) {
  await go(`#/methods/${m.key}`);
  await page.waitForSelector('.tp[data-method]', { timeout: 30000 });
  const g = words.guide[m.key];
  const title = flat(await page.locator('.pace-head h1').innerText());
  const says = flat(await page.locator('.pace-head').innerText());
  ok(title === m.name && says.includes(m.question), `2 ${m.name}: its name and its question`, `${title} | ${says.slice(0, 160)}`);
  const hero = flat(await page.locator('.tp-hero-side').innerText());
  ok(hero.includes(g.whenToUse) && hero.includes(g.notFor) && hero.includes(g.example), `2 ${m.name}: when to reach for it, when not, an example`, hero.slice(0, 200));
  ok(await page.locator('.tp-hero .tc-pic img').evaluate(e => e.naturalWidth >= 960).catch(() => false), `2 ${m.name}: its picture, loaded`);
  const steps = await page.locator('.mp-steps > .sg-step').evaluateAll(els => els.map(e => ({
    name: e.querySelector('.sg-name')?.textContent?.trim(),
    labels: [...e.querySelectorAll('.sg-three dt')].map(d => d.textContent?.trim()).join('|'),
    dds: [...e.querySelectorAll('.sg-three dd')].map(d => d.textContent?.trim()),
    tools: e.querySelectorAll('.mp-tools li').length })));
  ok(steps.map(s => s.name).join(' · ') === m.sections.join(' · '), `2 ${m.name}: its steps, in order`, steps.map(s => s.name).join(' · '));
  ok(steps.every(s => s.labels === 'What it means|What to do|What you get'), `2 ${m.name}: every step says what it means · what to do · what you get`);
  ok(steps.every((s, i) => s.dds[0] === g.sections[i].means && s.dds[1] === g.sections[i].doThis && s.dds[2] === g.sections[i].youGet), `2 ${m.name}: the words are the guide’s, step for step`);
  ok(steps.every((s, i) => s.tools >= 1 && s.tools <= m.tools[i]), `2 ${m.name}: each step lists the tools that fit it (${steps.map(s => s.tools).join(',')})`);
  ok(/ — (Built|Built, with limits|A mode of .+|Built into the app|Not built yet|Specified|Needs research|Planned)/.test(await page.locator('.mp-tools').first().innerText()), `2 ${m.name}: each tool says its status in words`);
  ok((await page.locator('.mp-others .chip').count()) === 7, `2 ${m.name}: the other seven methods one tap away`);
}

/* 3 — Start, an unknown key, the old address */
await go('#/methods/kata');
await page.waitForSelector('.tp[data-method]');
await page.getByRole('button', { name: 'Start a Improvement Kata project' }).first().click();
await page.waitForSelector('.proj-model-grid', { timeout: 15000 });
ok((await page.locator('.proj-model-opt[aria-pressed="true"] .proj-model-t').allInnerTexts()).map(flat).join() === 'Improvement Kata', '3 Start a … project opens New project with that method picked', page.url());
await go('#/methods/nothing-here');
ok(/Method not found/.test(await page.locator('.pace-head').innerText().catch(() => '')), '3 an unknown method says so');
await go('#/methods');
ok(!/#\/methods/.test(page.url()) || /Factory|Lines/.test(await page.locator('.pace-head h1, .nv-ctx').first().innerText().catch(() => '')), '3 a bare #/methods lands on the Factory as before', page.url());

/* 4 — a tool's page, and the bar's How it works */
await go('#/tools/capability');
await page.waitForSelector('.tp', { timeout: 30000 });
await unfold(page, 'tool-how');   // How it works is in a fold on a tool's page since 10 November
const toolSteps = await page.locator('.tp-sec[aria-label="How it works, step by step"] .sg-steps').first().evaluate(ol => [...ol.querySelectorAll(':scope > .sg-step')].map(li => ({ n: li.querySelector('.sg-name')?.textContent?.trim(), l: [...li.querySelectorAll('dt')].map(d => d.textContent?.trim()).join('|') })));
ok(toolSteps.length >= 4 && toolSteps.every(s => s.l === 'What it means|What to do|What you get'), `4 Capability’s page: How it works — ${toolSteps.length} steps, each the three parts (${toolSteps.map(s => s.n).join(' · ').slice(0, 120)})`);
await go('#/tools/reliability');
await page.waitForSelector('.tp', { timeout: 30000 });
await unfold(page, 'tool-how');
ok((await page.locator('.tp-sec[aria-label="How it works, step by step"] details.sg-fold').count()) >= 3, '4 Reliability’s page: its modes’ steps are folded under its own');
await page.locator('.tp-sec[aria-label="How it works, step by step"] details.sg-fold summary').first().click();
ok((await page.locator('.tp-sec[aria-label="How it works, step by step"] details.sg-fold[open] .sg-step').count()) >= 2, '4 …and a mode opens to its own steps');
await go(`#/capability?project=${sd.methodProjectId}`);
await page.waitForSelector('.nv-guide', { timeout: 30000 });
await page.locator('.nv-guide').click();
await page.waitForSelector('.nv-guide-body .sg-step', { timeout: 10000 });
ok((await page.locator('.nv-guide-body .sg-step').count()) >= 4, '4 the bar’s How it works opens the tool’s steps over its list');
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
ok((await page.locator('.nv-guide-body').count()) === 0, '4 and Escape closes it');
const rec = await page.evaluate(async () => { const { listStudies } = await import('/src/db.ts'); return (await listStudies()).find(s => s.tool === 'capability')?.id; });
if (rec) {
  await go(`#/capability/${rec}`);
  await page.waitForSelector('.nv-guide', { timeout: 30000 });
  ok(true, '4 the bar’s How it works is there on one of its records');
}

/* 5 — a method project's step */
await go(`#/project/${sd.methodProjectId}`);
await page.waitForSelector('.pmethod', { timeout: 30000 });
const fold = page.locator('.pmethod details.sg-fold').first();
await fold.locator('summary').click();
const gl = (await fold.locator('dt').allInnerTexts()).map(flat).join('|');
ok(gl.toLowerCase() === 'what it means|what to do|what you get', '5 What this step means opens to the three parts', gl);
ok(flat(await fold.locator('dd').first().innerText()) === words.guide.dmaic.sections[0].means, '5 …the guide’s words for that step');

/* 6 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
for (const h of ['#/methods/pdca', '#/tools/capability', '#/projects?new=1']) {
  await go(h);
  await page.waitForTimeout(800);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 1, `6 the phone: ${h} has nothing off the side (${over}px)`);
}

ok(errs.length === 0, 'no console error', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nAll passed');
process.exit(fail ? 1 : 0);
