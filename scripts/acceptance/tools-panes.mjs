/* ACCEPTANCE — A LINE'S TOOLS, WHAT IS IN USE STANDS OUT; A CALCULATOR IN THREE PANES ON A PHONE (Rowland, 5 November: "tools used on this line — you can hardly see it, nothing really stands out"; "the calculators UI is terrible ... on the phone everything should be swiping").
   The line's Tools: In use on this line first — a card each with what it found, its colour the state's — then Not used on this line yet as a quiet list; ticks and the old doors unchanged. A calculator record: on a phone Figures · Answer · What if, a swipe moving between them, the answer so far on the figures; at a desk no panes and the answer stays in view. */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', hasTouch: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2500); };
const flat = async loc => (await loc.innerText()).replace(/\s+/g, ' ').trim();

// the line's Tools
await go(`#/lines/${sd.wsId}?view=tools`);
const used = page.locator('.pl-tools.is-used > li');
const nUsed = await used.count();
ok(await page.getByRole('heading', { name: /In use on this line/ }).count() === 1 && nUsed >= 8, `1 "In use on this line" comes first with a card each (${nUsed})`);
const firstFinding = await page.locator('.pl-tool.is-used .pl-tool-says').count();
ok(firstFinding >= 6, `1b the cards say what each found (${firstFinding} findings)`);
const red = await page.locator('.pl-tool.is-used.is-r').evaluate(el => getComputedStyle(el).borderLeftColor).catch(() => '');
const grey = await page.locator('.pl-tool.is-used.is-n').first().evaluate(el => getComputedStyle(el).borderLeftColor).catch(() => '');
ok(red && grey && red !== grey, `1c a tool out of control is edged in the state's red, a quiet one grey (${red} · ${grey})`);
ok(await page.locator('.pl-tick input').count() >= nUsed, '1d the ticks are still beside the tools (for the line report and starting together)');
const notUsedHead = await page.getByRole('heading', { name: /Not used on this line yet/ }).count();
ok(notUsedHead === 1 && await page.locator('.pl-tools-more > li').count() >= 1, '2 the tools not used yet are a quiet list below, each saying what it is for');
ok(await page.getByRole('button', { name: /6M/ }).count() >= 1, '2b the 6M door is still there');
const bar = await page.locator('.pl-tool.is-used').first().innerText();
ok(!/None yet/.test(bar), '2c an in-use card never says "None yet"');

// the phone
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/lines/${sd.wsId}?view=tools`);
const over1 = await page.evaluate(() => document.scrollingElement.scrollWidth > window.innerWidth + 1);
ok(!over1, '3 the Tools page on a phone: nothing off the side');
const small = await page.locator('.pl-tool-more').evaluateAll(es => es.filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).length);
ok(small === 0, `3b the quiet list's rows are a thumb's height (${small} short)`);

// the calculator
await go(`#/calc/wip/${sd.calcLittleId}`);
ok(await page.getByRole('tab', { name: 'Figures' }).count() === 1 && await page.getByRole('tab', { name: 'Answer' }).count() === 1 && await page.getByRole('tab', { name: 'What if' }).count() === 1, '4 on a phone the calculator has Figures · Answer · What if');
ok(await page.locator('.calc-strip').count() === 1 && /3 hours/.test(await flat(page.locator('.calc-strip'))), '4b the figures show the answer so far (the verdict), one tap to the answer');
const formVisible = await page.locator('.calc-form').first().isVisible();
const tilesHidden = !(await page.locator('.calc-result').first().isVisible().catch(() => false));
ok(formVisible && tilesHidden, '4c on Figures the form shows and the answer does not');
const body = page.locator('.calc-body');
const swipeLeft = () => page.evaluate(() => {
  const el = document.querySelector('.calc-body'); const mk = (type, x, y) => new TouchEvent(type, { bubbles: true, cancelable: true, touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })], changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })] });
  el.dispatchEvent(mk('touchstart', 320, 300)); el.dispatchEvent(mk('touchend', 120, 305));
});
await swipeLeft(); await page.waitForTimeout(500);
ok(await page.getByRole('tab', { name: 'Answer' }).getAttribute('aria-selected') === 'true' && await page.locator('.calc-result').first().isVisible(), '5 a swipe left moves to the Answer: the tiles show');
ok(!(await page.locator('.calc-form').first().isVisible()), '5b and the form is out of the way');
await swipeLeft(); await page.waitForTimeout(500);
ok(await page.getByRole('tab', { name: 'What if' }).getAttribute('aria-selected') === 'true' && await page.locator('.calc-whatif, .calc-before').first().isVisible(), '5c another swipe: What if and Before → after');
const h = await page.evaluate(() => document.scrollingElement.scrollHeight);
ok(h < 1800, `5d the pane is short (${h} px — the page was about 3,700)`);
const over2 = await page.evaluate(() => document.scrollingElement.scrollWidth > window.innerWidth + 1);
ok(!over2, '5e nothing off the side');

// a desk
await page.setViewportSize({ width: 1360, height: 900 });
await go(`#/calc/wip/${sd.calcLittleId}`);
ok(await page.getByRole('tab', { name: 'Figures' }).count() === 0, '6 at a desk there are no panes — the form and the answer side by side');
const pos = await page.locator('.calc-out').evaluate(el => getComputedStyle(el).position);
ok(pos === 'sticky', '6b the answer stays in view while the figures are filled in (sticky)');
// Line Talk from the line and from a tool (5 November — Rowland: "I can only get to Line Talk from the main factory page")
await go(`#/lines/${sd.wsId}?view=tools`);
ok(await page.getByRole('button', { name: /Talk on this line ›/ }).count() === 1, '8 the line’s Tools has a visible Talk on this line button');
await page.getByRole('button', { name: /Talk on this line ›/ }).click(); await page.waitForTimeout(1800);
ok(/#\/talk/.test(page.url()) && page.url().includes(sd.wsId), `8b it opens Line Talk on that line (${page.url().split('#')[1]})`);
const menuItems = async () => { await page.locator('main .part-menu-b', { hasText: /^More/ }).first().click(); await page.waitForTimeout(300); return page.getByRole('menuitem').allInnerTexts(); };
await go(`#/lines/${sd.wsId}`);
ok((await menuItems()).some(t => /Talk on this line/.test(t)), '9 the line’s More ▾ offers Line Talk on every page of the line');
await page.keyboard.press('Escape');
await go(`#/calc/wip/${sd.calcLittleId}`);
const calcMore = await menuItems();
ok(calcMore.some(t => /Talk about this on the line/.test(t)), `9b a tool’s More ▾ offers Talk about this on the line (${calcMore.map(t => t.split('\n')[0]).join(' · ')})`);
await page.keyboard.press('Escape');
ok(errors.length === 0, `7 no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `${failed} FAILED` : 'ALL PASSED');
process.exit(failed ? 1 : 0);
