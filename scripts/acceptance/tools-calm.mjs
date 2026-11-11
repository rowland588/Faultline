/* ACCEPTANCE — TOOLS, CALM (10 November, docs/DESIGN.md — Rowland: "Tools obvious"; "Faultline … should feel remarkably simple to
 * use"). The library and a tool's own page as a person meets them. Driven in a real browser on the smoke seed:
 *
 *   1  Tools opens on the tools themselves: the header, the two doors (Line Talk and the 6M), then one list — a row for every tool
 *      the registry says a person can open (catalogue/counts GALLERY_TOOLS), in its order, each with its picture or drawn tile, its
 *      name and what it is for in the registry's words; nothing else above it
 *   2  every row opens its tool's own page (#/tools/:key); Open › its list
 *   3  everything else in the one fold, shut on arrival, each with its title and one line saying what is inside (My templates last, 11 November) — Find one by the
 *      problem · By kind · The worlds · The AI toolbox · What we have and what we need to build — and each opening to its contents
 *   4  a tool's own page: its name, what it is for and Start one first, the picture and its questions beside it; What you give it ·
 *      How it works · Inside it · Where it stands · Where it comes in each a fold, shut, with its one line, and each opening
 *   5  no card inside a card: the list's rows and the folds draw no box of their own
 *   6  the heights, printed — desk and phone
 *   7  the phone (390): one column, nothing off the side, every press 44 px or more
 *
 *   node scripts/acceptance/tools-calm.mjs      (SMOKE_BASE, as smoke) */
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

/* My templates (11 November, docs/CONSULTANT-WORKSPACE.md C5) — the consultant's own, the last fold */
const LIB_FOLDS = ['tools-find', 'tools-kinds', 'tools-worlds', 'tools-ai', 'tools-holdings', 'tools-templates'];
const PAGE_FOLDS = ['tool-io', 'tool-how', 'tool-inside', 'tool-stands', 'tool-routes'];
/* what each fold holds once open — the drawn thing, never the box */
const INSIDE = {
  'tools-find': '.et-search input', 'tools-kinds': '[aria-label="Kind of tool"] .chip', 'tools-worlds': '.wd-card', 'tools-ai': '[data-ai-tool]', 'tools-holdings': '.hd-tool', 'tools-templates': '[data-templates-open]',
  'tool-io': '.tp-io h2', 'tool-how': '.sg-step', 'tool-inside': '.tp-modes li', 'tool-stands': '.tp-sec[aria-label="Where it stands"] p', 'tool-routes': '.tp-routes button',
};

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
const heights = {};

for (const [tag, vp] of [['desk', { width: 1360, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const { ctx, page, errs } = await mk(vp);
  const go = async h => { await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 5000 }).catch(() => {}); await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
  await go('#/room');
  await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  await go('#/tools');
  const tools = await page.evaluate(async () => (await import('/src/catalogue/counts.ts')).GALLERY_TOOLS.map(t => ({ key: t.key, label: t.label, says: t.says, to: t.to })));
  await page.locator('.et-now .tc-card').first().waitFor({ timeout: 15000 });

  /* 1 — the tools first */
  const rows = await page.locator('.et-now .tc-card').evaluateAll(es => es.map(e => ({ key: e.getAttribute('data-tool'), name: e.querySelector('.tc-name')?.textContent?.trim(), says: e.querySelector('.tc-says')?.textContent?.trim(), pic: !!e.querySelector('.tc-pic') })));
  ok(JSON.stringify(rows.map(r => r.key)) === JSON.stringify(tools.map(t => t.key)) && tools.length >= 19, `1 ${tag}: a row for every tool the registry says a person can open, in its order — ${rows.length}`);
  ok(rows.every((r, i) => r.name === tools[i].label && flat(r.says) === flat(tools[i].says) && r.pic), `1 ${tag}: each with its picture, its name and what it is for, in the registry's words`);
  const order = await page.evaluate(() => {
    const main = document.querySelector('.wrap.et'); const kids = [...main.children].map(e => e.matches('header') ? 'header' : e.classList.contains('et-doors') ? 'doors' : e.classList.contains('et-now') ? 'tools' : e.classList.contains('fold') ? 'fold' : e.className);
    return kids;
  });
  ok(order.slice(0, 3).join() === 'header,doors,tools' && order.slice(3).every(k => k === 'fold'), `1 ${tag}: the header, the two doors, the tools — then only folds (${order.join(' · ')})`);
  ok((await page.locator('.et-doors [data-door="talk"]').count()) === 1 && (await page.locator('.et-doors [data-sixm-door]').count()) === 1, `1 ${tag}: Line Talk and the 6M, the two doors`);

  /* 3 — the folds shut, each with its one line, each opening */
  const folds = await page.locator('.wrap.et > .fold').evaluateAll(es => es.map(e => ({ id: e.getAttribute('data-fold'), open: e.classList.contains('is-open'), t: e.querySelector('.fold-t')?.textContent?.trim(), s: e.querySelector('.fold-s')?.textContent?.trim() })));
  ok(JSON.stringify(folds.map(f => f.id)) === JSON.stringify(LIB_FOLDS) && folds.every(f => !f.open && f.t && f.s), `3 ${tag}: ${folds.map(f => `${f.t} (${f.s?.slice(0, 40)}…)`).join(' · ')} — every one shut, with its one line`);
  ok((await page.locator('.wd-card, [data-ai-tool], .hd-tool, .et-search input').count()) === 0, `3 ${tag}: shut means shut — none of their contents drawn on arrival`);

  /* 5 — no card inside a card (measured before anything is opened) */
  const boxed = await page.evaluate(() => {
    const box = el => { const cs = getComputedStyle(el); const edges = ['Top', 'Right', 'Bottom', 'Left'].filter(k => parseFloat(cs[`border${k}Width`]) > 0).length; const fill = !['rgba(0, 0, 0, 0)', 'transparent'].includes(cs.backgroundColor) && cs.backgroundColor !== getComputedStyle(document.body).backgroundColor; return (fill && (edges >= 2 || cs.boxShadow !== 'none' || parseFloat(cs.borderTopLeftRadius) > 2)) || edges >= 3 || (cs.boxShadow !== 'none' && parseFloat(cs.borderTopLeftRadius) > 2); };
    return [...document.querySelectorAll('.et-now, .et-now .tc-cell, .et-now .tc-card, .wrap.et > .fold')].filter(box).map(e => e.className);
  });
  ok(!boxed.length, `5 ${tag}: the list, its rows and the folds draw no box of their own`, boxed.join(' | '));

  heights[`${tag} · the library`] = await page.evaluate(() => document.documentElement.scrollHeight);

  /* 7 — the phone */
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `7 ${tag}: nothing off the side`);
  if (tag === 'phone') {
    const presses = await page.locator('.et-now .tc-main, .et-now .tc-open, .et-doors .btn, .wrap.et > .fold .fold-toggle').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
    ok(Math.min(...presses) >= 44, `7 phone: every press on the list, the doors and the folds ${Math.min(...presses)} px or more (${presses.length})`);
    const cols = await page.locator('.et-now .tc-cell').evaluateAll(es => new Set(es.map(e => Math.round(e.getBoundingClientRect().left))).size);
    ok(cols === 1, `7 phone: the tools in one column (${cols})`);
  }

  for (const id of LIB_FOLDS) {
    await page.locator(`[data-fold="${id}"] .fold-toggle`).click(); await page.waitForTimeout(250);
    ok((await page.locator(`[data-fold="${id}"].is-open ${INSIDE[id]}`).count()) > 0, `3 ${tag}: ${id} opens to what it holds`);
  }
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `7 ${tag}: everything open, still nothing off the side`);
  heights[`${tag} · the library, every fold open`] = await page.evaluate(() => document.documentElement.scrollHeight);
  /* shut them again for the next steps (the choice is remembered on this device) */
  for (const id of LIB_FOLDS) await page.locator(`[data-fold="${id}"] .fold-toggle`).click();

  /* 2 — every row a door */
  for (const t of tag === 'desk' ? tools : tools.slice(0, 3)) {
    await go('#/tools');
    await page.locator(`.et-now .tc-card[data-tool="${t.key}"] .tc-main`).click();
    await page.waitForFunction(l => document.querySelector('.pace-head h1')?.textContent?.trim() === l, t.label, { timeout: 8000 }).catch(() => {});
    const h1 = flat(await page.locator('.pace-head h1').first().innerText().catch(() => ''));
    ok(page.url().endsWith(`#/tools/${t.key}`) && h1 === t.label, `2 ${tag}: ${t.label} opens its own page`, `${page.url()} · ${h1}`);
  }
  await go('#/tools');
  await page.locator('.et-now .tc-card[data-tool="capability"] .tc-open').click(); await page.waitForTimeout(1200);
  ok(/#\/capability(\?|$)/.test(page.url()), `2 ${tag}: Open › opens the tool's list`, page.url());

  /* 4 — a tool's own page */
  await go('#/tools/capability');
  const tp = await page.evaluate(() => {
    const main = document.querySelector('.wrap.tp');
    return { kids: [...main.children].map(e => e.matches('header') ? 'header' : e.classList.contains('tp-hero') ? 'hero' : e.classList.contains('fold') ? `fold:${e.getAttribute('data-fold')}:${e.classList.contains('is-open') ? 'open' : 'shut'}` : e.tagName === 'NAV' ? 'nav' : e.className) };
  });
  ok(tp.kids[0] === 'header' && tp.kids[1] === 'hero' && tp.kids.at(-1) === 'nav', `4 ${tag}: the header, then what it is for, then the folds, then the other tools (${tp.kids.join(' · ')})`);
  ok(JSON.stringify(tp.kids.filter(k => k.startsWith('fold:'))) === JSON.stringify(PAGE_FOLDS.map(f => `fold:${f}:shut`)), `4 ${tag}: ${PAGE_FOLDS.join(', ')} — each a fold, shut`);
  ok(await page.getByRole('button', { name: 'Start one', exact: true }).isVisible() && (await page.locator('.tp-hero .tp-qs li').count()) >= 3 && (await page.locator('.tp-hero .tc-pic').count()) === 1, `4 ${tag}: Start one, the picture and the questions it answers, first`);
  const says = await page.locator('.wrap.tp > .fold .fold-s').allInnerTexts();
  ok(says.length === PAGE_FOLDS.length && says.every(s => flat(s).length > 4), `4 ${tag}: each fold says in one line what is inside — ${says.map(flat).join(' | ').slice(0, 220)}`);
  heights[`${tag} · a tool's own page (Capability)`] = await page.evaluate(() => document.documentElement.scrollHeight);
  for (const id of PAGE_FOLDS) {
    await page.locator(`[data-fold="${id}"] .fold-toggle`).click(); await page.waitForTimeout(250);
    ok((await page.locator(`[data-fold="${id}"].is-open ${INSIDE[id]}`).count()) > 0, `4 ${tag}: ${id} opens to what it holds`);
  }
  ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), `7 ${tag}: a tool's page, everything open, nothing off the side`);
  heights[`${tag} · a tool's own page, every fold open`] = await page.evaluate(() => document.documentElement.scrollHeight);
  for (const id of PAGE_FOLDS) await page.locator(`[data-fold="${id}"] .fold-toggle`).click();
  if (tag === 'phone') {
    const sb = await page.getByRole('button', { name: 'Start one', exact: true }).evaluate(e => Math.round(e.getBoundingClientRect().height));
    ok(sb >= 44, `7 phone: Start one ${sb} px`);
  }

  ok(!errs.length, `no console error (${tag})${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
  await ctx.close();
}

/* 6 — the heights, printed */
for (const [k, v] of Object.entries(heights)) console.log(`      ${k.padEnd(48)} ${v} px`);
await browser.close();
console.log(fail ? `\nTools, calm — NOT accepted: ${fail} failed` : '\nTools, calm — accepted: the tools first, every one a door to its page; everything else one fold away, shut, each saying what it holds; a tool\'s page its purpose and Start one first; the phone fits.');
process.exit(fail ? 1 : 0);
