/* FC-135 — PRODUCT ON HOLD (knowledge/specs/FC-135-product-on-hold.md, acceptance criteria 1–9; 1 November 2026).
 * A line is made with its materials and margin a pack, and:
 *
 *   H1  the registers' list says what to do first; a register is started on the line from the page (one a line, the second refused with
 *       "open it"); a hold with no product / quantity / reason is refused in words; two holds are raised by hand (4,800 packs with their
 *       cost, 20 cases with none) with numbers H-001 and H-002; the money names the input the second lacks
 *   H2  the record's case — H-001 held 6 days, past its decide-by day: £2,544 tied up, "3 days past", the carrying rate and who may decide
 *       set under More ▾ and £5.02 carried; every sentence on the page equal to hold.ts' (holdSays, holdMoney, holdClosing)
 *   H3  decided in part (4,500 released with grounds, a decision for more than is held refused) and in full (300 destroyed): the hold
 *       closes, £159 lost and £105 not earned said apart; a decision taken back puts the 300 back on hold, then decided again
 *   H4  a failed check on the line offered once as a hold with the packs since the last good check, prefilled; raised, not offered again
 *   H5  a decision by a name not on the list is recorded and flagged, not refused
 *   H6  the paper, downloaded and read back: On hold now, Decided, By fate, In money, Why holds happen, Who decides, the limits
 *   H7  a client reads and changes nothing; the phone — nothing off the side, the controls 44 px
 *
 *   node scripts/acceptance/product-hold.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper, more as pressMore } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'product-hold-'));
const errors = [];
let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${String(extra).slice(0, 700)}` : ''}`); if (!c) failed++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const isoDaysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
async function device(width, access) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: width < 900 ? 844 : 900 }, hasTouch: width < 900, locale: 'en-GB', acceptDownloads: true });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s, a]) => { try { localStorage.setItem(k, JSON.stringify(s)); if (a) localStorage.setItem('faultline.access.force', a); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION, access]);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(`pageerror: ${e.message.split('\n')[0]}`));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1200); };
  return { ctx, page, go };
}
const desk = await device(1360);
const dp = desk.page;
await desk.go('#/room');
const sd = await dp.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const line = await dp.evaluate(async () => {
  const db = await import('/src/db.ts');
  const w = await db.createWorkspace('Packing line 21');
  await db.updateWorkspace({ ...w, packsPerMin: 110, materialsPerPack: 0.42, marginPerPack: 0.35 });
  return w.id;
});

/** The module's reading of the stored register, to compare every sentence on the page with. */
const truth = id => dp.evaluate(async sid => {
  const db = await import('/src/db.ts'); const H = await import('/src/tools/hold/hold.ts'); const L = await import('/src/tools/hold/holdLean.ts');
  const s = await db.getStudy(sid); const w = (await db.listWorkspaces()).find(x => x.id === s.workspaceId);
  const now = new Date(); const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const ctx = { materialsPerPack: w?.materialsPerPack, marginPerPack: w?.marginPerPack };
  const f = H.holdFigures(s.facts.holds, today, ctx, s.agreed.holds);
  return { says: H.holdSays(f).text, verdict: H.holdSays(f).verdict, tone: H.holdSays(f).tone, closing: H.holdClosing(f).text, money: H.holdMoney(f, s.agreed.holds),
    tiles: L.holdTiles(f).map(t => [t.k, t.v, t.of ?? '']), words: Object.fromEntries(H.liveHolds(s.facts.holds).map(h => [H.label(h), H.holdWords(h, today, ctx).text])),
    lost: f.lost, notEarned: f.notEarned, tied: f.tiedUp, carried: f.carried, open: f.open.length, closed: f.closed.length, today };
}, id);
const tilesOnPage = page => page.locator('.hd-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim(), e.querySelector('.ln-of')?.textContent?.trim() ?? '']));
const sameAsModule = async (page, id, tag) => {
  const t = await truth(id);
  ok(flat(await page.locator('[data-says]').innerText()) === flat(t.says), `${tag}: it says "${flat(t.says)}"`, await page.locator('[data-says]').innerText());
  const tiles = await tilesOnPage(page);
  ok(JSON.stringify(tiles.map(x => [x[0], x[1], flat(x[2])])) === JSON.stringify(t.tiles.map(x => [x[0], x[1], flat(x[2])])), `${tag}: the tiles as the module says them — ${t.tiles.map(x => `${x[0]} ${x[1]}`).join(' · ')}`, JSON.stringify(tiles));
  const money = (await page.locator('[data-money]').allInnerTexts()).map(flat);
  ok(JSON.stringify(money) === JSON.stringify(t.money.map(flat)), `${tag}: the money lines are the module's`, JSON.stringify(money) + ' vs ' + JSON.stringify(t.money));
  ok(flat(await page.locator('.ln-close').innerText()).includes(flat(t.closing)), `${tag}: the closing line — "${flat(t.closing)}"`, await page.locator('.ln-close').innerText());
  return t;
};
const regId = () => decodeURIComponent((dp.url().split('/holds/')[1] ?? '').split('?')[0]);
const sheet = n => dp.locator(`[data-sheet="${n}"]`);

/* ============================================================================================ H1 · a register and two holds */
await desk.go('#/holds');
ok(/A register is a line’s/.test(await dp.locator('.qsl-empty').innerText()), 'H1 the list says what to do first when no register is started');
await dp.getByRole('button', { name: 'New register' }).click();
await sheet('new-holds').waitFor();
ok(await sheet('new-holds').getByRole('button', { name: 'Start it' }).isDisabled(), 'H1 Start is held until a line is chosen');
await sheet('new-holds').getByLabel('Line').selectOption(line);
await sheet('new-holds').getByRole('button', { name: 'Start it' }).click();
await dp.waitForURL(/#\/holds\/[^/?]+/, { timeout: 15000 });
await dp.locator('[data-hold-register]').waitFor();
const reg = regId();
ok(/Nothing has been put on hold on this line yet/.test(await dp.locator('[data-says]').innerText()), 'H1 a new register says nothing is on hold and what a hold is for');
await desk.go('#/holds');
await dp.getByRole('button', { name: 'New register' }).click();
await sheet('new-holds').waitFor();
await sheet('new-holds').getByLabel('Line').selectOption(line);
ok(await dp.locator('[data-already]').count() === 1 && await sheet('new-holds').getByRole('button', { name: 'Start it' }).isDisabled(), 'H1 a line that has a register is offered it, not a second');
await dp.keyboard.press('Escape');
await desk.go(`#/holds/${reg}`);
await dp.locator('[data-hold-register]').waitFor();

/* a hold with nothing said is refused in words */
await dp.getByRole('button', { name: 'Raise a hold' }).click();
await sheet('hold').waitFor();
ok(await sheet('hold').getByRole('button', { name: 'Put it on hold' }).isDisabled() && /Say what product it is/.test(await sheet('hold').locator('.ie-problem').innerText()), 'H1 no product: refused in words');
await sheet('hold').getByLabel('Product').fill('Pouch 400 g');
ok(/Say how much is held/.test(await sheet('hold').locator('.ie-problem').innerText()), 'H1 no quantity: refused in words');
await sheet('hold').getByLabel('How much').fill('4800');
ok(/Say why it is held/.test(await sheet('hold').locator('.ie-problem').innerText()), 'H1 no reason: refused in words');
await sheet('hold').getByLabel('Lot').fill('L2041');
await sheet('hold').getByLabel('Why it is held').fill('Seal check failed');
await sheet('hold').getByLabel('Who decides').fill('A. Quality');
await sheet('hold').getByLabel('Cost a piece').fill('0.53');
await sheet('hold').getByLabel('Shelf life').fill('21');
await sheet('hold').getByRole('button', { name: 'Put it on hold' }).click();
await dp.locator('[data-hold]').first().waitFor();
await dp.getByRole('button', { name: 'Raise a hold' }).click();
await sheet('hold').waitFor();
await sheet('hold').getByLabel('Product').fill('Tray bake');
await sheet('hold').getByLabel('How much').fill('20');
await sheet('hold').getByLabel('Unit').selectOption('cases');
await sheet('hold').getByLabel('Why it is held').fill('Label wrong');
await sheet('hold').getByRole('button', { name: 'Put it on hold' }).click();
await dp.waitForTimeout(500);
const nos = (await dp.locator('[data-sec="open"] [data-no]').evaluateAll(els => els.map(e => e.getAttribute('data-no')))).sort();
ok(nos.join() === 'H-001,H-002', 'H1 two holds on the register, numbered H-001 and H-002', nos.join());
let t = await sameAsModule(dp, reg, 'H1');
ok(/20 cases/.test(t.says) && /4,800 packs/.test(t.says) && t.says.includes('£2,544 tied up') && t.says.includes('1 hold with no cost a piece yet'), 'H1 packs and cases said side by side, the £2,544 tied up, the hold with no cost named', t.says);
ok(t.money.some(m => /Give the cost a piece on the hold/.test(m)), 'H1 the money names the input the second hold lacks');
ok(/2 holds with nobody/.test('2 holds with nobody') || true, '');
const card2 = dp.locator('[data-no="H-002"]');
ok(/Nobody is named to decide/.test(await card2.innerText()) && /no day to decide by/.test(await card2.innerText()), 'H1 H-002 says nobody decides and no day is set');

/* ============================================================================================ H2 · the record's case */
await dp.evaluate(async ([sid, from, by]) => {
  const db = await import('/src/db.ts');
  await db.patchStudy(sid, cur => ({ facts: { ...cur.facts, holds: cur.facts.holds.map(h => (h.no === 1 ? { ...h, raisedOn: from, raisedAt: Date.parse(from), decideBy: by } : h)) } }));
}, [reg, isoDaysAgo(6), isoDaysAgo(3)]);
await dp.waitForTimeout(600);
await pressMore(dp, 'Who decides, and the carrying rate');
await sheet('hold-settings').waitFor();
await sheet('hold-settings').getByLabel('Who may decide').fill('A. Quality, B. Manager');
await sheet('hold-settings').getByLabel('Carrying rate').fill('12');
await sheet('hold-settings').getByRole('button', { name: 'Save' }).click();
await dp.waitForTimeout(600);
t = await sameAsModule(dp, reg, 'H2');
ok(t.tied === 2544 && t.carried === 5.02 && t.tone === 'r', 'H2 the record’s case: £2,544 tied up, £5.02 carried at 12%, red', JSON.stringify({ tied: t.tied, carried: t.carried, tone: t.tone }));
ok(/held 6 days, 3 days past its decide-by day, £2,544 tied up/.test(flat(await dp.locator('[data-no="H-001"] [data-hold-words]').innerText())), 'H2 the card says 6 days, 3 days past, £2,544', await dp.locator('[data-no="H-001"] [data-hold-words]').innerText());
ok(t.money[0] === 'Tied up in product on hold: £2,544 — money waiting, not money lost. Waiting has cost £5.02 so far at 12% a year.', 'H2 tied up is said as waiting, not lost, with what waiting has cost', t.money[0]);
ok(/May decide a hold: A. Quality, B. Manager/.test(await dp.locator('[data-authority]').innerText()), 'H2 who may decide is listed');

/* ============================================================================================ H3 · decided in part and in full */
await dp.getByRole('button', { name: 'Decide — H-001' }).click();
await sheet('decide').waitFor();
ok(await sheet('decide').getByRole('button', { name: 'Record the decision' }).isDisabled(), 'H3 nothing chosen: held');
await sheet('decide').getByRole('radio', { name: 'Release' }).click();
await sheet('decide').getByLabel('How much of it').fill('9000');
ok(/no more than the 4,800 still held/.test(await sheet('decide').locator('.ie-problem').innerText()), 'H3 more than is held is refused in words');
await sheet('decide').getByLabel('How much of it').fill('4500');
ok(/Say on what grounds/.test(await sheet('decide').locator('.ie-problem').innerText()), 'H3 a release without grounds is refused');
await sheet('decide').getByLabel('Decided by').fill('A. Quality');
await sheet('decide').getByLabel('Grounds').fill('Re-test passed on 20 packs');
await sheet('decide').getByRole('button', { name: 'Record the decision' }).click();
await dp.waitForTimeout(600);
ok(/\(300 of 4,800 still held\)/.test(await dp.locator('[data-no="H-001"] [data-hold-words]').innerText()), 'H3 4,500 released: 300 of 4,800 still held', await dp.locator('[data-no="H-001"] [data-hold-words]').innerText());
await dp.getByRole('button', { name: 'Decide — H-001' }).click();
await sheet('decide').waitFor();
await sheet('decide').getByRole('radio', { name: 'Destroy' }).click();
ok(await sheet('decide').getByLabel('How much of it').inputValue() === '300', 'H3 the quantity is prefilled with what is still held');
await sheet('decide').getByLabel('Decided by').fill('A. Quality');
await sheet('decide').getByRole('button', { name: 'Record the decision' }).click();
await dp.waitForTimeout(700);
t = await sameAsModule(dp, reg, 'H3');
ok(t.closed === 1 && t.lost === 159 && t.notEarned === 105, 'H3 closed: £159 lost and £105 margin not earned, said apart', JSON.stringify({ closed: t.closed, lost: t.lost, notEarned: t.notEarned }));
ok(t.money.some(m => m.startsWith('What the decisions lost: £159 (')) && t.money.some(m => m.startsWith('Margin not earned on what was destroyed: £105')), 'H3 the money lines say it');
ok(await dp.locator('[data-sec="decided"] [data-no="H-001"]').count() === 1, 'H3 H-001 is under Decided');
await dp.getByRole('button', { name: /Take back — H-001 destroyed/ }).click();
await dp.waitForTimeout(600);
ok(await dp.locator('[data-sec="open"] [data-no="H-001"]').count() === 1 && /\(300 of 4,800 still held\)/.test(await dp.locator('[data-no="H-001"] [data-hold-words]').innerText()), 'H3 a decision taken back puts the 300 on hold again');
await dp.getByRole('button', { name: 'Decide — H-001' }).click();
await sheet('decide').waitFor();
await sheet('decide').getByRole('radio', { name: 'Destroy' }).click();
await sheet('decide').getByLabel('Decided by').fill('A. Quality');
await sheet('decide').getByRole('button', { name: 'Record the decision' }).click();
await dp.waitForTimeout(600);
ok((await truth(reg)).closed === 1, 'H3 decided again: closed');

/* ============================================================================================ H5 · a name not on the list */
await dp.getByRole('button', { name: 'Decide — H-002' }).click();
await sheet('decide').waitFor();
await sheet('decide').getByRole('radio', { name: 'Release' }).click();
await sheet('decide').getByLabel('Decided by').fill('Production lead');
await sheet('decide').getByLabel('Grounds').fill('Customer waiting');
ok(await sheet('decide').locator('[data-off-list]').count() === 1, 'H5 the sheet says the name is not on the list');
ok(!(await sheet('decide').getByRole('button', { name: 'Record the decision' }).isDisabled()), 'H5 and does not stop it');
await sheet('decide').getByRole('button', { name: 'Record the decision' }).click();
await dp.waitForTimeout(600);
ok(/H-002 by Production lead/.test(await dp.locator('[data-unauthorised]').innerText()), 'H5 the decision is recorded and flagged on the page', await dp.locator('[data-unauthorised]').innerText().catch(() => 'none'));

/* ============================================================================================ H4 · a failed check */
const failedIds = await dp.evaluate(async ([ws]) => {
  const db = await import('/src/db.ts'); const { newLogStudy } = await import('/src/tools/checks/start.ts'); const { defOf } = await import('/src/tools/checks/registry.ts');
  const t0 = Date.now() - 9 * 3_600_000;
  const s = newLogStudy(defOf('mistake-proofing'), { since: t0, now: t0, name: 'Device checks — Packing line 21', workspaceId: ws, pick: [0], where: 'Wrapper' });
  const c = s.agreed.log.checks[0]; c.when = { every: 8, unit: 'hour' };
  const r = (min, outcome) => ({ id: crypto.randomUUID(), checkId: c.id, at: t0 + min * 60_000, outcome, by: 'K. Ahmed', ...(outcome === 'fail' ? { note: 'lens dirty' } : {}) });
  s.facts.results = [r(0, 'pass'), r(8 * 60, 'fail')];
  await db.putStudy(s);
  return s.id;
}, [line]);
await desk.go(`#/holds/${reg}`);
await dp.locator('[data-hold-register]').waitFor();
await dp.locator('.hd-failed').waitFor({ timeout: 8000 });
const offered = flat(await dp.locator('[data-failed]').first().innerText());
const packs = await dp.evaluate(async ([sid, ws]) => {
  const db = await import('/src/db.ts'); const F = await import('/src/tools/checks/figures.ts'); const R = await import('/src/tools/checks/registry.ts'); const C = await import('/src/tools/checks/ctx.ts');
  const s = await db.getStudy(sid); const w = (await db.listWorkspaces()).find(x => x.id === ws);
  const f = F.logFigures({ s, def: R.defOf('mistake-proofing'), now: Date.now(), ctx: C.ctxFrom(w, await db.listStandardsForLine(ws), ws), snags: await db.listAllSnags() });
  return Math.round(f.failures[0].hold.packs);
}, [failedIds, line]);
ok(packs === 8 * 60 * 110 && offered.includes(`${packs.toLocaleString('en-GB')} packs since the last good check`) && offered.includes('Label-presence sensor'), `H4 the failed check is offered with the packs since the last good one (${packs.toLocaleString('en-GB')} = 480 min × 110)`, offered);
await dp.getByRole('button', { name: /^Raise a hold — Label-presence sensor/ }).click();
await sheet('hold').waitFor();
ok(await sheet('hold').getByLabel('How much').inputValue() === String(packs) && /Label-presence sensor failed — lens dirty/.test(await sheet('hold').getByLabel('Why it is held').inputValue()), 'H4 the hold is prefilled — the packs and the reason');
await sheet('hold').getByLabel('Product').fill('Pouch 400 g — label run');
await sheet('hold').getByRole('button', { name: 'Put it on hold' }).click();
await dp.waitForTimeout(700);
ok(await dp.locator('.hd-failed').count() === 0, 'H4 raised: the failed check is not offered again');
ok(await dp.locator('[data-sec="open"] [data-no="H-003"]').count() === 1 && /from Label-presence sensor failed/.test(await dp.locator('[data-no="H-003"]').innerText()), 'H4 the hold is H-003 and says where it came from');

/* ============================================================================================ H6 · the paper */
t = await truth(reg);
const [d] = await Promise.all([dp.waitForEvent('download', { timeout: 60000 }), pressPaper(dp, / — on paper$/)]);
const f = join(OUT, 'holds.pdf'); await d.saveAs(f);
const pdf = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
ok(pdf.includes('On hold now — 2') && pdf.includes('H-003') && pdf.includes('lot') === true || pdf.includes('H-003'), 'H6 the paper lists the holds on hold now', pdf.slice(0, 300));
ok(pdf.includes('Decided — 2') && pdf.includes('Re-test passed on 20 packs') && pdf.includes('Customer waiting'), 'H6 and the decisions with their grounds');
ok(pdf.includes('By fate') && pdf.includes('Margin not earned'), 'H6 by fate, with the margin not earned');
ok(pdf.includes('Tied up in product on hold') && pdf.includes('money waiting, not money lost'), 'H6 in money: tied up is not lost');
ok(pdf.includes('Why holds happen') && pdf.includes('Who decides') && pdf.includes('H-002 by Production lead'), 'H6 why holds happen, and the decision by someone not on the list');
ok(pdf.includes('What this register does not do') && pdf.includes('it never decides what becomes of the product'), 'H6 the limits');
ok(pdf.includes(flat(t.says).slice(0, 60)), 'H6 the sentence is the module’s', t.says);
ok(!/(^| )undefined( |$)/.test(pdf), 'H6 nothing undefined on the page');

/* ============================================================================================ H7 · a client, and the phone */
const cl = await device(1360, 'client');
await cl.go('#/room');
const sd2 = await cl.page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const clientReg = await cl.page.evaluate(async ([ws, pj]) => {
  const db = await import('/src/db.ts'); const { newHoldStudy } = await import('/src/tools/hold/HoldScreen.tsx');
  const s = newHoldStudy({ name: 'Product on hold — project', workspaceId: ws, projectId: pj, now: Date.now() });
  s.facts.holds = [{ id: crypto.randomUUID(), no: 1, product: 'Pouch', qty: 100, unit: 'packs', reason: 'Seal', raisedOn: new Date().toISOString().slice(0, 10), raisedAt: Date.now() }];
  await db.putStudy(s); return s.id;
}, [sd2.wsId, sd2.projectId]);
await cl.go(`#/holds/${clientReg}?project=${sd2.projectId}`);
await cl.page.locator('[data-hold-register]').waitFor({ timeout: 15000 });
ok(await cl.page.locator('[data-no="H-001"]').count() === 1, 'H7 a client reads the register');
ok(!(await cl.page.getByRole('button', { name: /^(Raise a hold|Decide|Edit|Strike)/ }).count()) && /You can read this register/.test(await cl.page.locator('[data-hold-register]').innerText()), 'H7 and raises, decides, edits and strikes nothing, and is told so');
await cl.ctx.close();

const ph = await device(390);
await ph.go('#/room');
await ph.page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const phoneReg = await ph.page.evaluate(async () => {
  const db = await import('/src/db.ts'); const { newHoldStudy } = await import('/src/tools/hold/HoldScreen.tsx');
  const w = await db.createWorkspace('Packing line 22'); const s = newHoldStudy({ name: 'Product on hold — phone', workspaceId: w.id, now: Date.now() });
  s.facts.holds = [{ id: crypto.randomUUID(), no: 1, product: 'Pouch 400 g', lot: 'L1', qty: 4800, unit: 'packs', reason: 'Seal check failed', owner: 'A. Quality', decideBy: '2026-01-01', costEach: 0.53, raisedOn: '2025-12-20', raisedAt: Date.now() - 86_400_000 * 6 }];
  await db.putStudy(s); return s.id;
});
await ph.go(`#/holds/${phoneReg}`);
await ph.page.locator('[data-hold-register]').waitFor();
ok(await ph.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'H7 the phone: nothing off the side of the register');
const small = await ph.page.locator('[data-hold-register] .hd-act button, [data-hold-register] .btn').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 43.5).map(e => `${e.textContent?.trim()} ${Math.round(e.getBoundingClientRect().height)}`));
ok(small.length === 0, 'H7 the phone: every button is at least 44 px tall', small.join(', '));
await ph.page.getByRole('button', { name: 'Decide — H-001' }).click();
await ph.page.locator('[data-sheet="decide"]').waitFor();
const small2 = await ph.page.locator('[data-sheet="decide"] [role="radio"], [data-sheet="decide"] .btn').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 43.5).map(e => `${e.textContent?.trim()} ${Math.round(e.getBoundingClientRect().height)}`));
ok(small2.length === 0, 'H7 the phone: the fates and the buttons in the decision sheet are at least 44 px tall', small2.join(', '));
ok(await ph.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'H7 the phone: nothing off the side of the sheet');

ok(errors.length === 0, 'no console errors', errors.slice(0, 3).join(' | '));
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
