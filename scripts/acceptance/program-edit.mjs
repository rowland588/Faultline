/* ACCEPTANCE — A PROGRAM'S TEST, EDITED WHERE IT SITS, AND A PROJECT'S TABS ON A PHONE.
 *
 * Rowland, 25 October: "Programs mobile ui difficult to see all tabs and screen, and when I change the fields
 * when I open it, it doesn't change the front look — Test 3, aiming 75 ppm for 60 min, set at 75, ran 180 min,
 * 3,600 packs, netted 20 ppm, passed … I changed 'ran for' to 60 … but it still says netted 20 ppm."
 *
 *   1  a program tested — aiming 75 ppm for 60 min, set at 75, ran 180 min, 3,600 packs — says "netted 20 ppm"
 *      on its row, as lib/programJourney says it
 *   2  its record opened (the ladder's step) and the run changed there — Ran for 60 — and the row says what the
 *      record says: ran 60 min · 3,600 packs · netted 60 ppm; the best pass says "for 60 min" (it said 180 / 20)
 *   3  Go again carries the aim as it now stands (aiming to run 60), not the one first written
 *   2+ the aim is a SPEED (Rowland: "it's not short … a net rate to achieve doesn't exist … they can be both"): 59.5 ppm netted
 *      is 15.5 below the 75 it ran at, a fact — never "short"; a net rate given as well is judged, and only then
 *   4  on a phone (390 px): a project's tabs — more than fit, the one you are on in view, the edge fading where
 *      more wait, the last one reachable; the top bar opaque (nothing reading through it); nothing off the side */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 780 }, locale: 'en-GB', isMobile: true, hasTouch: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
await page.goto(`${BASE}/#/project/${sd.projectId}/programs`); await page.waitForTimeout(2500);

/* ---- 4 the tabs, first — before anything is opened ---- */
{
  const t = await page.evaluate(() => {
    const n = document.querySelector('.nv-tabs'); if (!n) return null;
    const box = n.getBoundingClientRect(), on = n.querySelector('.nv-tab.is-on')?.getBoundingClientRect();
    const top = getComputedStyle(document.querySelector('.nv-top'));
    return { more: n.scrollWidth > n.clientWidth + 8, cls: n.className, onIn: !!on && on.left >= box.left - 1 && on.right <= box.right + 1, last: [...n.querySelectorAll('.nv-tab')].at(-1)?.innerText, n: n.querySelectorAll('.nv-tab').length, topBg: top.backgroundColor, blur: top.backdropFilter };
  });
  ok(!!t && t.more && /has-r/.test(t.cls) && t.n >= 8, `4 the project's ${t?.n} tabs are more than fit and the strip says so — an edge fades where more wait (${t?.cls})`);
  ok(!!t && t.onIn, '4b the page you are on (Programs) is in view, whole');
  ok(!!t && /^rgb\(/.test(t.topBg) && (t.blur === 'none' || !t.blur), `4c the top bar is opaque on a phone — ${t?.topBg}, blur ${t?.blur}`);
  await page.evaluate(() => { const n = document.querySelector('.nv-tabs'); n.scrollLeft = n.scrollWidth; });
  await page.waitForTimeout(300);
  const end = await page.evaluate(() => { const n = document.querySelector('.nv-tabs'); const l = [...n.querySelectorAll('.nv-tab')].at(-1).getBoundingClientRect(), b = n.getBoundingClientRect(); return { cls: n.className, lastIn: l.right <= b.right + 1 }; });
  ok(end.lastIn && /has-l/.test(end.cls) && !/has-r/.test(end.cls), `4d scrolled to the end, the last tab is whole and the fade moves to the other side (${end.cls})`);
}

/* ---- 1 a program tested, its row ---- */
await page.evaluate(() => { document.querySelector('.nv-tabs').scrollLeft = 0; });
const arguments_ = { 'Aiming for': '75', 'Aiming to run': '60', 'Set at': '75', 'Ran for': '180', 'Packs': '3600' };
/* the first program still to test; once it is tested its row is found by what it says — saving a program that was only a line
   on a stage makes its record and the row is drawn again */
await page.getByRole('button', { name: /^Test it$/ }).first().click(); await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Passed', exact: true }).first().click();
for (const [k, v] of Object.entries(arguments_)) await page.locator(`input[aria-label^="${k}"]`).first().fill(v);
ok(await page.locator('input[aria-label^="Net to achieve"]').count() === 1 && /judged on it only when you give one/.test(flat(await page.locator('.ptx-panel').first().innerText())), '1a the form says what Aiming for is (the speed it is set to) and offers Net to achieve as a second, optional aim');
await page.getByRole('button', { name: 'Save', exact: true }).first().click(); await page.waitForTimeout(3500);
const stepLoc = page.locator('.ptx-step', { hasText: 'aiming 75 ppm' });
const row = page.locator('li.pgr', { has: stepLoc }).first();
const step = () => stepLoc.first();
ok(/aiming 75 ppm for 60 min/.test(flat(await step().innerText())) && /ran 180 min · 3,600 packs · netted 20 ppm/.test(flat(await step().innerText())) && /passed/.test(flat(await step().innerText())),
  `1 Test 1 aiming 75 ppm for 60 min, set at 75, ran 180 min, 3,600 packs — "${flat(await step().innerText())}"`);

/* ---- 2 the record opened, the run changed there, the row follows ---- */
await step().click(); await page.waitForTimeout(1500);
const drawer = page.locator('[role=dialog]').last();
const said = async () => flat(await page.locator('.pr').first().innerText());
ok(!/short/i.test(await said()) && /Passed/.test(await said()), `2 the record does not call it short — the aim was a speed and it ran at 75: "${(await said()).slice(0, 160)}"`);
/* a pass is one folded line in the drawer (normal recedes) — its figures a tap away, then Change */
if (await page.getByRole('button', { name: 'Its figures' }).count()) { await page.getByRole('button', { name: 'Its figures' }).first().click(); await page.waitForTimeout(500); }
await page.getByRole('button', { name: 'Change', exact: true }).first().click(); await page.waitForTimeout(800);
const ran = page.locator('input[aria-label*="Ran for"]').first();
await ran.fill('60'); await ran.blur(); await page.waitForTimeout(1200);
const rej = page.locator('input[aria-label*="Rejects"]').first();
await rej.fill('30'); await rej.blur(); await page.waitForTimeout(1500);
const t3 = await said();
ok(/Net rate 59\.5 ppm/.test(t3) || /59\.5 ppm/.test(t3), `2a net (3,600 − 30) ÷ 60 = 59.5 ppm, as the record says it: "${t3.slice(0, 200)}"`);
ok(/15\.5 ppm below the 75 ppm it ran at/.test(t3) && !/Short:/.test(t3) && !/net rate 15\.5/i.test(t3), '2b a fact beside the speed — 15.5 ppm below the 75 it ran at — never "net rate 15.5 ppm short"');
ok(/Judged on run at 75 ppm for 60 min/.test(t3), '2c judged on what was agreed: run at 75 ppm for 60 min');
/* a net rate to achieve, given as well: judged on it, and only then */
await page.locator('input[aria-label="Agreed net rate, packs a minute"]').first().fill('60');
await page.locator('input[aria-label="Agreed net rate, packs a minute"]').first().blur(); await page.waitForTimeout(1500);
const t4 = await said();
ok(/Short: net rate 0\.5 ppm short/.test(t4) && /net 60 ppm/.test(t4), `2d with a net rate of 60 given too, 59.5 is 0.5 ppm short — "${t4.slice(0, 220)}"`);
await page.locator('input[aria-label="Agreed net rate, packs a minute"]').first().fill('59');
await page.locator('input[aria-label="Agreed net rate, packs a minute"]').first().blur(); await page.waitForTimeout(1500);
ok(!/Short:/.test(await said()), '2e and met at 59');
await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
const after = flat(await step().innerText());
ok(/ran 60 min · 3,600 packs · 30 rejects/.test(after) && /netted 59\.5 ppm/.test(after) && !/netted 20/.test(after), `2f the row follows the record — "${after}"`);
const best = flat(await row.locator('.ptx-best').first().innerText());
ok(/for 60 min/.test(best) && !/180/.test(best), `2g the best pass follows it — "${best}"`);

/* ---- 3 Go again carries the aim as it stands ---- */
await row.getByRole('button', { name: 'Go again' }).first().click(); await page.waitForTimeout(500);
ok(await row.locator('input[aria-label^="Aiming to run"]').first().inputValue() === '60' && await row.locator('input[aria-label^="Aiming for"]').first().inputValue() === '75' && await row.locator('input[aria-label^="Net to achieve"]').first().inputValue() === '59',
  '3 Go again starts from the aim as it now stands — 75 ppm for 60 min, net 59');

/* ---- 4e nothing off the side ---- */
const wide = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
ok(!wide, '4e nothing off the side of the phone');
ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
if (failed) { console.log(`${failed} check(s) failed`); process.exit(1); }
console.log('ALL PASSED');
