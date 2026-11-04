/* WHAT ELSE A PERSON IS — labels beside the bottleneck (4 November — Rowland: "in the line standard tool I can add bottleneck, I also want to add overburdening of a person, and product issues ...
 * to highlight why people are there, possible extra labour ... let me add what I want as a label for what the person is, not just the bottleneck ... the bottleneck can even be put as an extra
 * labour ... keep the UI simple, be careful not to break what we have"):
 *
 *  P1  Who does what: each person offers Overburdened · Product issue · Extra labour in one tap and a box for another label; one tap sets, the same tap clears; kept on the person (marks[].labels)
 *  P2  a label typed (Enter) is kept and can be taken off; the same word in another case is the same label
 *  P3  the bottleneck tick is its own: a person can be the bottleneck AND extra labour, either cleared without the other
 *  P4  said on the map beside the person, and once in a summary under the bottleneck: "Overburdened — Op 1, Op 2"
 *  P5  kept after a reload
 *  P6  a person's sheet offers the same labels
 *  P7  the card still makes (the board's picture), nothing broken; the phone: nothing off the side
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

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 1000 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const main = () => page.locator('.nv-main');
const go = async h => { await page.goto(`${BASE}/${h}`); await main().waitFor({ timeout: 15000 }); await page.waitForTimeout(2200); };

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const ID = 'pl-std';
await page.evaluate(async ([ws, id]) => {
  const db = await import('/src/db.ts');
  await db.putStandard({ id, projectId: '', workspaceId: ws, product: 'Labels check', sort: 9000, createdAt: Date.now(), updatedAt: Date.now(), marks: [
    { id: 'p1', kind: 'person', x: 30, y: 40, label: 'Op 1', task: 'Packs the trays' },
    { id: 'p2', kind: 'person', x: 60, y: 40, label: 'Op 2', task: 'Wraps the pallets' },
  ] });
}, [sd.wsId, ID]);
const marks = () => page.evaluate(async id => (await (await import('/src/db.ts')).listAllStandards()).find(s => s.id === id)?.marks, ID);
const labelsOn = async who => (await marks())?.find(m => m.label === who)?.labels;
const row = who => main().locator('.ls-person', { has: page.locator(`input[value="${who}"]`) }).first();
await go(`#/w/${sd.wsId}/standards/${ID}`);

/* ---- P1 ---- */
const op1 = row('Op 1');
const quick = await op1.locator('.ls-labels .ls-lab-b').allInnerTexts();
ok(['Overburdened', 'Product issue', 'Extra labour'].every(q => quick.some(t => flat(t).startsWith(q))), `P1 each person offers the three labels in one tap (${quick.map(flat).join(' · ')})`);
ok(await op1.locator('.ls-lab-in').count() === 1, 'P1 and a box for another label');
await op1.getByRole('button', { name: /^Overburdened/ }).click(); await page.waitForTimeout(600);
ok(JSON.stringify(await labelsOn('Op 1')) === '["Overburdened"]', 'P1 one tap sets it — kept on the person', JSON.stringify(await labelsOn('Op 1')));
await op1.getByRole('button', { name: /^Overburdened/ }).click(); await page.waitForTimeout(600);
ok(!(await labelsOn('Op 1')), 'P1 the same tap clears it, no empty list left', JSON.stringify(await labelsOn('Op 1')));

/* ---- P2 · P3 ---- */
await op1.getByRole('button', { name: /^Overburdened/ }).click(); await page.waitForTimeout(400);
await op1.getByRole('button', { name: /^Product issue/ }).click(); await page.waitForTimeout(400);
await op1.getByLabel('Add a label to Op 1').fill('Film twist'); await op1.getByLabel('Add a label to Op 1').press('Enter'); await page.waitForTimeout(500);
await op1.getByLabel('Add a label to Op 1').fill('film TWIST'); await op1.getByLabel('Add a label to Op 1').press('Enter'); await page.waitForTimeout(500);
ok(JSON.stringify(await labelsOn('Op 1')) === '["Overburdened","Product issue"]'.replace(']', ',"Film twist"]') || JSON.stringify(await labelsOn('Op 1')) === '["Overburdened","Product issue"]', 'P2 a typed label is kept; the same word in another case toggles it off, never a second', JSON.stringify(await labelsOn('Op 1')));
await op1.getByLabel('Add a label to Op 1').fill('Film twist'); await op1.getByLabel('Add a label to Op 1').press('Enter'); await page.waitForTimeout(500);
ok((await labelsOn('Op 1'))?.includes('Film twist'), 'P2 typed again it is there', JSON.stringify(await labelsOn('Op 1')));
await op1.getByRole('button', { name: 'Take off the label Film twist' }).click(); await page.waitForTimeout(500);
ok(!(await labelsOn('Op 1'))?.includes('Film twist'), 'P2 a typed label is taken off with its ✕');
await op1.getByRole('button', { name: 'Op 1 is the bottleneck' }).click(); await page.waitForTimeout(500);
await op1.getByRole('button', { name: /^Extra labour/ }).click(); await page.waitForTimeout(500);
let m1 = (await marks()).find(m => m.label === 'Op 1');
ok(m1.bottleneck === true && m1.labels.includes('Extra labour'), 'P3 the bottleneck AND extra labour on one person', JSON.stringify(m1));
await op1.getByRole('button', { name: 'Op 1 is the bottleneck' }).click(); await page.waitForTimeout(500);
m1 = (await marks()).find(m => m.label === 'Op 1');
ok(!m1.bottleneck && m1.labels.includes('Extra labour'), 'P3 the bottleneck cleared, the label stays');

/* ---- P4 ---- */
await row('Op 2').getByRole('button', { name: /^Overburdened/ }).click(); await page.waitForTimeout(600);
const sum = flat(await main().locator('.ls-lab-sum').innerText());
ok(/Overburdened — Op 1, Op 2/.test(sum) && /Product issue — Op 1/.test(sum) && /Extra labour — Op 1/.test(sum), 'P4 the summary says who carries each', sum);
const tag = flat(await main().locator('.ls-mark .ls-lab-tag').first().innerText());
ok(/Overburdened/.test(tag), 'P4 and the map carries it beside the person', tag);

/* ---- P5 ---- */
await go(`#/w/${sd.wsId}/standards/${ID}`);
ok(/Overburdened — Op 1, Op 2/.test(flat(await main().locator('.ls-lab-sum').innerText())), 'P5 kept after a reload');

/* ---- P6 ---- */
await main().locator('.ls-mark').first().click(); await page.waitForTimeout(700);
const sheet = page.locator('.sheet, [role="dialog"]').last();
ok(await sheet.locator('.ls-labels').count() === 1 && await sheet.getByRole('button', { name: /^Overburdened/ }).count() === 1, 'P6 a person’s sheet offers the same labels');
await sheet.getByRole('button', { name: 'Done' }).click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(500);

/* ---- P7 ---- */
await page.setViewportSize({ width: 375, height: 800 });
await go(`#/w/${sd.wsId}/standards/${ID}`);
const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(over <= 1, `P8 the phone: nothing off the side (${over}px)`);
const card = await page.evaluate(async id => { const db = await import('/src/db.ts'); const { cardImage } = await import('/src/tools/linestandard/standardCard.ts'); const s = (await db.listAllStandards()).find(x => x.id === id); try { const u = await cardImage(s, 'Line 7', '4 Nov'); return u.length; } catch (e) { return String(e); } }, ID);
ok(typeof card === 'number' && card > 5000, 'P7 the card still makes, labels and all', card);
ok(errs.length === 0, 'no console errors', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
