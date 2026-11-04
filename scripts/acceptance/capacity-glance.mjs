/* LINE CAPACITY AT A GLANCE (4 November — Rowland, of Line capacity on his phone: "It's quite simple, like what I did. But when I look at it, it makes no sense to me ...
 * it's a user interface which is confusing me"): the records of his Line 2A — large crate (the pallet wrapper's 12 minutes a pair of pallets holds it at 60 against 70),
 * Tesco Express (the wrapper has room), and the mu's (a stacker keeping up with 60%) — read as the module reads them:
 *
 *  G1  on a phone the page opens on one card: what the line makes, what it should, how far short, what holds it, each station in words with the limit marked, the one fix
 *  G2  the card says what the module says (60 of 70, 10 short, the wrapper), and a record that meets its target says it meets it with no fix offered
 *  G3  the page is short while the workings are closed — the set-up, the drawings and the sums not in the way — and "Show the workings and set-up" opens all of them, "Hide" closes
 *  G4  on a wide screen nothing changed: no card, everything open as it was
 *  G5  nothing off the side on the phone, the button a thumb's height
 */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 500)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const st = (id, name, kind, unit, contains, o = {}) => ({ id, name, kind, unit, contains, ratePer: 'min', crew: 1, ...o });
const wrapper = per => st('s2', 'Pallet wrapper (one operator, both lines)', 'people', 'pallets', per, { perCycle: 2, cycleSec: 720, cycleIn: 'min', source: 'timed', allowancePct: 0 });
const filling = st('s1', 'Lines 2A and 2B filling (together)', 'machine', 'units', 1, { rate: 70, source: 'plate' });
const CAPS = {
  large: { name: 'Large crate — 2A/2B baskets', cap: { targetPerMin: 70, stations: [filling, wrapper(360)] } },
  tesco: { name: 'Tesco Express — 2A/2B baskets', cap: { targetPerMin: 70, stations: [filling, wrapper(1200)] } },
  mu: { name: "Line 2a and 2b mu's", cap: { targetPerMin: 140, stations: [st('s1', 'Fillers — Line 2A and Line 2B', 'machine', 'units', 1, { rate: 70, crew: 2, source: 'plate' }),
    st('s2', 'Mu stacker (one operator)', 'people', 'mus', 105, { perCycle: 4, cycleSec: 300, cycleIn: 'min', source: 'timed', allowancePct: 0 })] } },
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const mk = async (w, h) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  return { page, errs };
};
const phone = await mk(390, 844);
await phone.page.goto(`${BASE}/#/room`); await phone.page.waitForTimeout(2500);
const sd = await phone.page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
await phone.page.evaluate(async ([ws, caps]) => {
  const db = await import('/src/db.ts');
  let i = 0;
  for (const [k, v] of Object.entries(caps)) await db.putStandard({ id: `cg-${k}`, projectId: '', workspaceId: ws, product: v.name, capacity: v.cap, marks: [], sort: 7000 + i++, createdAt: Date.now(), updatedAt: Date.now() });
}, [sd.wsId, CAPS]);
const open = async (page, k) => { await page.goto(`${BASE}/#/w/${sd.wsId}/standards/cg-${k}?at=balance`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(2200); };
const glance = page => page.locator('[data-glance]');

/* ---- G1 · G2 ---- */
await open(phone.page, 'large');
ok(await glance(phone.page).count() === 1, 'G1 on a phone the page opens on one card');
const t = flat(await glance(phone.page).innerText());
ok(/THE LINE MAKES 60 units\/min/.test(t) && /IT SHOULD MAKE 70 units\/min/.test(t), 'G2 the card says the line makes 60 and should make 70', t);
ok(/10 short of 70/.test(t) && /held by Pallet wrapper/.test(t), 'G2 10 short of 70, held by the pallet wrapper');
const rows = await glance(phone.page).locator('.cg-rows li').allInnerTexts();
ok(rows.length === 2 && /Lines 2A and 2B filling/.test(rows[0]) && /70 units a minute/.test(rows[0]) && /can do 70 units\/min/.test(rows[0]), 'G1 the filling in its own words — typed 70 a minute, can do 70', rows[0]);
ok(/Pallet wrapper/.test(rows[1]) && /holds the line/.test(rows[1]) && /2 pallets every 12 min/.test(rows[1]) && /can do 60 units\/min/.test(rows[1]), 'G1 the wrapper — 2 pallets every 12 min, can do 60, the limit marked', rows[1]);
ok(/WHAT WOULD FIX IT/.test(t) && /Pallet wrapper/.test(t.split('WHAT WOULD FIX IT')[1] ?? ''), 'G1 the one thing to do is named');

/* ---- G3 ---- */
const body = phone.page.locator('.capx-body');
const h0 = await phone.page.evaluate(() => document.documentElement.scrollHeight);
ok(await body.isHidden() && h0 < 1800, `G3 the workings are closed, the page short (${h0}px; it was about 5,500)`, h0);
const btn = phone.page.getByRole('button', { name: 'Show the workings and set-up' });
ok((await btn.boundingBox())?.height >= 40, 'G5 the button is a thumb’s height', JSON.stringify(await btn.boundingBox()));
await btn.click(); await phone.page.waitForTimeout(600);
const h1 = await phone.page.evaluate(() => document.documentElement.scrollHeight);
ok(await body.isVisible() && h1 > 3000 && await phone.page.getByText('The stations, in order the product').count() + await phone.page.locator('.capx-step').count() > 0, `G3 Show the workings opens the set-up, the drawings and the sums (${h1}px)`, h1);
await phone.page.getByRole('button', { name: 'Hide the workings' }).click(); await phone.page.waitForTimeout(500);
ok(await body.isHidden(), 'G3 Hide closes them again');

/* ---- G2 · meets ---- */
await open(phone.page, 'tesco');
const tt = flat(await glance(phone.page).innerText());
ok(/THE LINE MAKES 70 units\/min/.test(tt) && /meets the target of 70/.test(tt) && !/WHAT WOULD FIX IT/.test(tt), 'G2 Tesco Express meets its target and offers no fix', tt);
await open(phone.page, 'mu');
const mt = flat(await glance(phone.page).innerText());
ok(/THE LINE MAKES 84 units\/min/.test(mt) && /56 short of 140/.test(mt) && /held by Mu stacker/.test(mt), 'G2 the mu’s: 84 of 140, held by the stacker (60%)', mt);

/* ---- G5 ---- */
const over = await phone.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(over <= 1, `G5 nothing off the side on the phone (${over}px)`);
ok(phone.errs.length === 0, 'no console errors on the phone', phone.errs.join(' | '));

/* ---- G4 · the desk ---- */
const desk = await mk(1360, 900);
await desk.page.goto(`${BASE}/#/room`); await desk.page.waitForTimeout(2500);
const sd2 = await desk.page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
await desk.page.evaluate(async ([ws, caps]) => { const db = await import('/src/db.ts'); await db.putStandard({ id: 'cg-large', projectId: '', workspaceId: ws, product: caps.large.name, capacity: caps.large.cap, marks: [], sort: 7000, createdAt: Date.now(), updatedAt: Date.now() }); }, [sd2.wsId, CAPS]);
await desk.page.goto(`${BASE}/#/w/${sd2.wsId}/standards/cg-large?at=balance`); await desk.page.locator('.nv-main').waitFor({ timeout: 15000 }); await desk.page.waitForTimeout(2200);
ok(await desk.page.locator('[data-glance]').count() === 0 && await desk.page.locator('.capx-body').isVisible() && await desk.page.locator('.capx-step').count() >= 2, 'G4 on a wide screen no card, everything open as before');
ok(desk.errs.length === 0, 'no console errors on the desk', desk.errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
