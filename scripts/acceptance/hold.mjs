/* FC-135 — PRODUCT ON HOLD, driven (knowledge/specs/FC-135-product-on-hold.md, acceptance criteria 1–8; 1 November 2026): a register of cards on the scored shape —
 * a hold a card: what is held, packs, where, segregated, why and the cause, who raised it and when, who may release it and by when; then the fate (released,
 * concession, reworked, regraded, destroyed) with who decided, when and on what grounds. The money keeps the two-parts rule: tied up while open (not lost),
 * lost once decided, never added. Held to the module (src/tools/hold/hold.ts) and to the second implementation's literals (scripts/knowledge/cases-t8-3.py).
 *
 *   1  the hub and the list: Product on hold as a card, "New holds register" the one primary, the empty list says what to do, ?add=1 opens the sheet
 *   2  the six-hold register opened with its prices — the sentence, tiles, money and closing line equal the module's and the literals (2 open, 6,000 packs,
 *      £3,180 tied up; 4 decided, £3,145 lost; Seal three times — an 8D); open first, the decided newest first
 *   3  a register made through New holds register, a hold typed through the real boxes — the parts still to say fall away as each is said
 *   4  a decision: the fate, who, when and the grounds; an open hold past its day red; one with no decision day named
 *   5  the prices typed in the register's own boxes price it; what is missing is named and nothing waits
 *   6  a hold taken off and brought back with Undo
 *   7  the paper, read back: the register as a table, the money, holds by cause, what it does not say
 *   8  kept after a reload; the list row; a client changes nothing; the phone
 *
 * Fails on any console error.   node scripts/acceptance/hold.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'acceptance-'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text()) && !/same key/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${extra}` : ''}`); if (!c) failed++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(1800); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const all = async sel => (await page.locator(sel).allInnerTexts()).map(flat);
const settle = () => page.waitForTimeout(900);   /* the register saves a moment after the last key */
const cardOf = i => page.locator('section.fm-card').nth(i);

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const lineId = sd.wsId;
const example = await page.evaluate(async () => (await import('/src/tools/scored/registry.ts')).SCORED.find(d => d.key === 'hold').examples[0]);


const savedStudy = (name, key, rows, inputs = {}, extra = {}) => page.evaluate(async ([name, key, rows, lineId, inputs, extra]) => {
  const { putStudy } = await import('/src/db.ts'); const { SCORED } = await import('/src/tools/scored/registry.ts'); const { newScoredStudy } = await import('/src/tools/scored/scored.ts');
  const s = newScoredStudy(SCORED.find(d => d.key === key), { name, workspaceId: lineId, now: Date.now(), ...extra }); s.agreed.scored.rows = rows; Object.assign(s.agreed.scored, inputs); await putStudy(s); return s.id;
}, [name, key, rows, lineId, inputs, extra]);
const truth = id => page.evaluate(async sid => {
  const { getStudy, listAllStudies } = await import('/src/db.ts'); const { studyScored } = await import('/src/tools/scored/scored.ts');
  const s = await getStudy(sid); const x = studyScored(s, { studies: await listAllStudies() });
  return { sentence: x?.result?.sentence, verdict: x?.result?.verdict, closing: x?.result?.closing, tiles: x?.result?.tiles.map(t => [t.k, t.v, t.of]), money: x?.result?.money, order: x?.ranked?.ok.map(r => r.name), also: x?.result?.also?.lines };
}, id);
const stateOf = i => cardOf(i).locator('.fm-ap').innerText();
const PRICES = { rate: 25, costToDate: 0.53, margin: 0.35, carryPct: 12 };

/* ---- 1 · the hub and the list ---- */
{
  await go('#/scored');
  ok((await all('.pl-tool-card')).some(c => /^Product on hold/.test(c)), '1 Product on hold is a card on the Scored registers hub');
  await go('#/scored/hold');
  ok(/^Product on hold$/.test((await words('.part-head .pace-title')) ?? '') && /^New holds register$/.test((await words('.pace-head-actions .btn-primary')) ?? ''), '1 the list: Product on hold, New holds register the one primary');
  ok(/No holds recorded yet/.test((await words('.qsl-empty')) ?? ''), '1 the empty list says what to do');
  await go(`#/scored/hold?project=${sd.projectId}&add=1`);
  ok((await page.locator('.lt-new').count()) === 1, '1 ?add=1 opens the sheet at once, in the project');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {});
}

/* ---- 2 · the six-hold register ---- */
let worked;
{
  worked = await savedStudy('Line 2 — holds, October', 'hold', example.rows, PRICES);
  const t = await truth(worked);
  ok(JSON.stringify(t.order) === JSON.stringify(example.expect.order) && t.verdict === '2 on hold', `2 the module reads the six: open first, then the decided newest first — ${t.verdict}`);
  await go(`#/scored/hold/${worked}`);
  ok((await words('.ie-says')) === t.sentence && t.sentence.startsWith('2 holds open — 6,000 packs held, the oldest 6 days (Maris 500 g — failed seal check).'), `2 the sentence is the module's: "${t.sentence.slice(0, 110)}"`);
  ok(/Seal has held product 3 times \(8,100 packs\) — a repeating cause is worth an 8D\./.test(t.sentence) && /4 holds decided: 1 released, 1 reworked, 1 regraded, 1 destroyed\./.test(t.sentence), '2 the decided by fate and the repeating cause, as the second implementation counts them');
  const tiles = await all('.ln-tiles .ln-tile');
  ok(t.tiles.length === 5 && t.tiles.every(([k, v], i) => tiles[i]?.toLowerCase().includes(k.toLowerCase()) && tiles[i]?.includes(v)), `2 five tiles as the module says: ${tiles.join(' | ')}`);
  ok(tiles.some(x => /^tied up/i.test(x) && x.includes('£3,180') && /not lost/.test(x)) && tiles.some(x => /^lost, decided/i.test(x) && x.includes('£3,145')), '2 £3,180 tied up (not lost) and £3,145 lost — separate tiles, the literals of cases-t8-3.py');
  const money = (await all('.ie-money, .ie-says.ie-money')).join(' ');
  ok(/destroyed £2,790/.test(money) && /released £50/.test(money) && /reworked £145/.test(money) && /regraded £160/.test(money) && /Tied up and lost are never added/.test(money) && /≈ £5 so far/.test(money), `2 the money lines by fate: "${money.slice(0, 150)}"`);
  ok(((await words('.ln-close')) ?? '').includes(t.closing) && /^2 on hold — 6,000 packs, the oldest 6 d, 1 decision late\.$/.test(t.closing), `2 the closing line: ${t.closing}`);
  ok((await page.locator('section.fm-card').count()) === 6, '2 a card each — six');
  const st = []; for (let i = 0; i < 6; i++) st.push(await stateOf(i));
  ok(JSON.stringify(st) === JSON.stringify(['Held · 6 d', 'Held · 2 d', 'Destroyed', 'Released', 'Regraded', 'Reworked']), `2 each card says its state: ${st.join(' · ')}`);
  ok(/The decision was due 30 Oct and is not made/.test((await words('section.fm-card .ie-warn')) ?? ''), '2 the late decision is said on its card');
  ok(/Seal — 3 holds, 8,100 packs · repeating/.test((await all('.ln-panel li, .ie-also li')).join(' | ')), '2 Holds by cause lists it');
}

/* ---- 3 · a register made through New holds register ---- */
let made;
{
  await go('#/scored/hold');
  await page.getByRole('button', { name: 'New holds register' }).first().click(); await page.waitForTimeout(500);
  await page.getByLabel('What line or area are these holds for?').fill('Line 2 — holds, November');
  await page.locator('.lt-new select').selectOption(lineId);
  await page.getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(1500);
  made = decodeURIComponent(page.url().split('/scored/hold/')[1]?.split('?')[0] ?? '');
  ok(made.length > 8 && (await page.locator('section.fm-card').count()) === 1, '3 New holds register opens a register with one blank card');
  ok(/Name at least one hold/.test((await words('[role=alert]')) ?? '') && (await stateOf(0)) === 'Not named', '3 nothing named: the page says what to name');
  const c = cardOf(0);
  await c.getByLabel('Hold 1', { exact: true }).fill('Maris 500 g — failed seal check'); await settle();
  ok(/^Held/.test(await stateOf(0)) && /how many packs · why it is held · who may release it · that it is segregated/.test((await words('[data-missing]')) ?? ''), `3 named: four parts to say — "${await words('[data-missing]')}"`);
  await c.getByLabel('How many packs').fill('4800');
  await c.getByLabel('Why it is held — the check, the complaint, the deviation').fill('Seal pull failed, 3 of 5 below 8 N');
  await c.getByLabel('Cause').fill('Seal'); await settle();
  ok(/who may release it · that it is segregated/.test((await words('[data-missing]')) ?? '') && !/how many packs|why it is held/.test((await words('[data-missing]')) ?? ''), '3 packs and why said: two to say');
  await c.getByLabel('Who may release it — the authority').fill('Priya (QA lead)');
  await c.getByLabel('Segregated and labelled').check(); await settle();
  ok((await page.locator('[data-missing]').count()) === 0, '3 every part said: nothing left to say');
  const today = new Date(); const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  await c.getByLabel('Raised on').fill(iso(new Date(today.getTime() - 4 * 86400000))); await settle();
  ok(/Held · 4 d/.test(await stateOf(0)) && /^1 hold open — 4,800 packs held, the oldest 4 days/.test((await words('.ie-says')) ?? ''), `3 raised four days ago: ${await stateOf(0)}`);
  const t = await truth(made); ok((await words('.ie-says')) === t.sentence, '3 the page’s sentence is the module’s');
}

/* ---- 4 · a decision, a late one, no day ---- */
{
  const c = cardOf(0);
  ok(/no day for the decision — a hold with no decision day is a slow destroy/.test((await words('.ie-says')) ?? ''), '4 an open hold with no decision day is named, and why it matters');
  const iso = n => { const d = new Date(Date.now() + n * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  await c.getByLabel('Decision due by').fill(iso(-1)); await settle();
  ok(/The decision was due .* and is not made/.test((await words('section.fm-card .ie-warn')) ?? '') && /1 decision past its day/.test((await words('.ie-says')) ?? '') && /late\.$/.test((await words('.ln-close')) ?? ''), '4 a decision past its day is red, said on the card, the sentence and the closing line');
  await c.getByLabel('What became of it').selectOption('rework'); await settle();
  await c.getByLabel('Decided by').fill('Priya (QA lead)');
  await c.getByLabel('On what grounds').fill('Re-sealed and 100% pull-tested');
  ok((await c.getByLabel('Hours the review or rework took').count()) === 1 && (await c.getByLabel('Materials added in the rework, £').count()) === 1 && (await c.getByLabel('Disposal cost, £').count()) === 0, '4 a rework asks its hours and the materials added, not a disposal');
  await c.getByLabel('Hours the review or rework took').fill('4');
  await c.getByLabel('Materials added in the rework, £').fill('45'); await settle();
  ok(/Reworked/.test(await stateOf(0)) && /^Nothing is on hold\. 1 hold decided: 1 reworked\./.test((await words('.ie-says')) ?? ''), `4 decided: ${await stateOf(0)} — nothing on hold`);
  ok(/To say it in money give £ an hour/.test((await all('.ie-money')).join(' ')), '4 no wage yet: the lost money names what it lacks and nothing waits');
  await c.getByLabel('What became of it').selectOption('destroy'); await settle();
  ok(/Disposal cost, £/i.test(await c.innerText()) && !/Hours the review/i.test(await c.innerText()), '4 changed to destroyed: it asks for the disposal cost now');
}

/* ---- 5 · the prices typed in the register's own boxes ---- */
{
  await c0();
  async function c0() {
    await page.locator('.cp-prices summary').click();
    await page.getByLabel('What a pack has cost to this point, £ (materials and labour)').fill('0.53');
    await page.getByLabel('The margin a pack, £').fill('0.35'); await settle();
    ok(/£4,224 lost/.test((await words('[data-lost]')) ?? '') || /£4,224/.test((await all('.ie-money')).join(' ')), '5 destroyed 4,800 packs: £2,544 + £1,680 = £4,224 lost — the record’s case');
    await cardOf(0).getByLabel('Disposal cost, £').fill('150'); await settle();
    ok(/£4,374 lost/.test((await words('[data-lost]')) ?? ''), '5 with £150 to dispose of it: £4,374');
    await cardOf(0).getByLabel('What became of it').selectOption(''); await settle();
    ok(/£2,544 tied up — not lost unless the product is/.test((await words('[data-tied]')) ?? ''), '5 back to held: £2,544 tied up, said not lost');
    await page.getByLabel('Carrying rate, % a year').fill('12'); await settle();
    ok(/carried at 12% a year ≈ £\d+ so far/.test((await all('.ie-money')).join(' ')), '5 a carrying rate adds what it has cost to carry');
  }
}

/* ---- 6 · Undo ---- */
{
  await page.getByRole('button', { name: '+ Add a hold' }).click(); await settle();
  await cardOf(1).getByLabel('Hold 2', { exact: true }).fill('King Edward — wrong date code'); await settle();
  await page.getByRole('button', { name: 'Take off hold 2' }).click(); await settle();
  ok((await page.locator('section.fm-card').count()) === 1 && /taken off\./.test((await all('[role=status]')).join(' ')), '6 a hold taken off, said');
  await page.getByRole('button', { name: 'Undo' }).click(); await settle();
  ok((await page.locator('section.fm-card').count()) === 2 && (await cardOf(1).getByLabel('Hold 2', { exact: true }).inputValue()) === 'King Edward — wrong date code', '6 Undo brings it back whole');
  await page.getByRole('button', { name: 'Take off hold 2' }).click(); await settle();
}

/* ---- 7 · on paper ---- */
{
  await go(`#/scored/hold/${worked}`);
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, 'hold.pdf'); await d.saveAs(f);
  const text = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
  const t = await truth(worked);
  ok(text.includes(t.sentence.slice(0, 80)) && /Product on hold/.test(text) && /2 on hold/.test(text), '7 the paper carries the band and the sentence');
  ok(/Maris 500 g — failed seal check/.test(text) && /Baby 400 g/.test(text) && /Tesco 400 g/.test(text) && /Who may release/.test(text) && /Priya \(QA lead\)/.test(text), '7 the register as a table, every hold and its authority');
  ok(text.indexOf('failed seal check') < text.indexOf('Baby 400 g'), '7 open first on paper too');
  ok(/£3,180 is tied up in 2 open holds/.test(text) && /Tied up and lost are never added/.test(text) && /Holds by cause/.test(text) && /Seal — 3 holds, 8,100 packs/.test(text), '7 the money and the holds by cause are on the paper');
  ok(/What this does not say/i.test(text) && /segregated or locked/.test(text), '7 what it does not say');
}

/* ---- 8 · kept, the list row, a client, the phone ---- */
{
  await go(`#/scored/hold/${made}`);
  ok((await page.locator('section.fm-card').count()) === 1 && (await cardOf(0).getByLabel('Hold 1', { exact: true }).inputValue()) === 'Maris 500 g — failed seal check', '8 kept after a reload');
  await go('#/scored/hold');
  const row = flat(await page.locator(`.lt-li[data-study="${worked}"]`).innerText());
  ok(/2 on hold/.test(row) && /2 holds open — 6,000 packs held/.test(row), '8 the list’s row says the verdict and the count', row);
  const cid = await savedStudy('A client reads', 'hold', example.rows, PRICES, { projectId: sd.projectId });
  await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
  await go(`#/scored/hold/${cid}`);
  const ro = await page.evaluate(() => ({ editable: [...document.querySelectorAll('.fm input, .fm select, .fm textarea')].filter(e => !e.disabled).length, adds: [...document.querySelectorAll('.fm button')].length, says: document.querySelector('.ie-says')?.textContent ?? '' }));
  ok(ro.editable === 0 && ro.adds === 0 && ro.says.startsWith('2 holds open'), `8 a client sees the register and the answer and changes nothing (${JSON.stringify({ ...ro, says: ro.says.slice(0, 20) })})`);
  await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/scored/hold/${worked}`);
  ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '8 the phone: nothing off the side');
  const small = await page.evaluate(() => [...document.querySelectorAll('.fm-card input:not([type=checkbox]), .fm-card select, .fm-card button, .fm-card textarea')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).map(e => `${e.tagName} ${e.getAttribute('aria-label') ?? ''}`));
  ok(small.length === 0, '8 the phone: every box, pick and button in a card a thumb’s size', small.slice(0, 4).join(' | '));
  ok((await page.evaluate(() => [...document.querySelectorAll('.fm-grid')].every(g => g.getBoundingClientRect().right <= 392))), '8 the phone: each card is one column wide');
}

await browser.close();
ok(!errors.length, errors.join('; ') || 'No console errors');
process.exit(failed ? 1 : 0);
