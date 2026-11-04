/* A PROBLEM LINKED TO A PROGRAM AND THE PRODUCTS IT AFFECTS (supabase/PROBLEM_PROGRAM.sql — Rowland, 4 November: "link a problem to the program ... pick which
 * products it actually affects ... make sure that ... is on the reports, linked beautifully, clearly seeing problems with the pictures directly associated
 * to this product"):
 *
 *  L1  the problem's editor: a Program chip toggles the link, the Products chips are that program's products (none picked = every product it makes);
 *      the link is kept on the record (programId, products), and after a reload
 *  L2  the register's row says it in words (lib/problemScope)
 *  L3  the Problems report carries "Program and products: …" for it
 *  L4  the problem's card carries a PROGRAM AND PRODUCTS block
 *  L5  the Programs report carries a PROBLEMS ON THIS PROGRAM box under the program: the problem, how serious, the products it affects, and its picture
 *  L6  a problem with no program (about the whole line) says nothing of one
 *  Ph  the phone: the editor's chips, nothing off the side
 */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { paper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 500)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const dir = mkdtempSync(join(tmpdir(), 'pprog-'));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async h => { await page.goto(`${BASE}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(2200); };
const main = () => page.locator('.nv-main');

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const WS = sd.wsId;
/* a program of the line running two products, and a problem on the line with a picture */
const made = await page.evaluate(async ws => {
  const db = await import('/src/db.ts');
  const { programsOnLine } = await import('/src/lib/lineRecords.ts');
  const progs = (await db.listAllPrograms()).filter(p => !p.deletedAt);
  const onLine = programsOnLine(ws, progs, await db.allPaceLines());
  const prog = onLine[0];
  await db.putProgram({ ...prog, runs: 'Maris Piper 2kg, King Edward 2kg', updatedAt: Date.now() });
  /* a real picture */
  const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const g = cv.getContext('2d'); g.fillStyle = '#c4281c'; g.fillRect(0, 0, 640, 360);
  const blob = await new Promise(r => cv.toBlob(r, 'image/jpeg', 0.8));
  await db.putBlob('pp-photo', blob);
  const id = 'pp-s1', t = Date.now();
  await db.addSnag({ id, workspaceId: ws, problem: 'Seal jaws not reaching temperature on the film', status: 'open', priority: 'critical', raisedAt: t - 864e5, updatedAt: t,
    media: [{ id: 'pp-m1', kind: 'photo', blobKey: 'pp-photo', mime: 'image/jpeg', capturedAt: t }] });
  await db.addSnag({ id: 'pp-s2', workspaceId: ws, problem: 'Whole line: floor drain blocked', status: 'open', priority: 'low', raisedAt: t - 864e5, updatedAt: t, media: [] });
  return { id, prog: { id: prog.id, what: prog.what } };
}, WS);
ok(!!made.prog, `the seed: a program (${made.prog?.what}) running two products and a problem with a picture`);
const snag = () => page.evaluate(async id => (await import('/src/db.ts')).listAllSnags().then(l => l.find(s => s.id === id)), 'pp-s1');

/* ---- L1 ---- */
await go(`#/snags?line=${WS}&open=pp-s1`);
const ed = main().locator('.pe').first();
const progChip = ed.locator('[aria-label="Which program"] .chip', { hasText: made.prog.what.slice(0, 20) }).first();
ok(await progChip.count() === 1, 'L1 the editor offers the line’s program as a chip');
await progChip.click(); await page.waitForTimeout(700);
let s = await snag();
ok(s?.programId === made.prog.id && !s.products?.length, 'L1 a program picked is kept on the record, no products yet', JSON.stringify({ p: s?.programId, pr: s?.products }));
const prods = await ed.locator('[aria-label="Which products"] .chip').allInnerTexts();
ok(prods.map(flat).join('|') === 'Maris Piper 2kg|King Edward 2kg', `L1 the products offered are that program’s (${prods.map(flat).join(' | ')})`);
ok(/every product/.test(flat(await ed.innerText())), 'L1 none picked says every product it makes');
await ed.locator('[aria-label="Which products"] .chip', { hasText: 'King Edward' }).click(); await page.waitForTimeout(700);
s = await snag();
ok(s?.products?.length === 1 && s.products[0] === 'King Edward 2kg', 'L1 one product picked is kept — only that one', JSON.stringify(s?.products));
await go(`#/snags?line=${WS}&open=pp-s1`);
ok(await main().locator('.pe [aria-label="Which products"] .chip[aria-pressed="true"]').count() === 1, 'L1 still there after a reload');

/* ---- L2 ---- */
await go(`#/snags?line=${WS}`);
const rowText = flat(await main().locator('.qsl-row, .qsl-x, li', { hasText: 'Seal jaws not reaching' }).first().innerText());
ok(rowText.includes('King Edward 2kg') && rowText.includes(made.prog.what.slice(0, 15)), 'L2 the register’s row says the program and the product', rowText.slice(0, 300));

/* ---- L3 · L6 ---- */
const [d1] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, 'Problems report')]);
const f1 = join(dir, 'problems.pdf'); await d1.saveAs(f1);
const t1 = flat(execFileSync('pdftotext', ['-raw', f1, '-'], { encoding: 'utf8' }));
ok(t1.includes('Program and products:') && t1.includes('King Edward 2kg'), 'L3 the Problems report carries “Program and products” for it');
const afterFloor = t1.slice(t1.indexOf('floor drain'));
ok(t1.includes('floor drain') && !/floor drain[^]{0,200}Program and products/.test(afterFloor.slice(0, 300)) , 'L6 a problem about the whole line says nothing of a program');

/* ---- L4 ---- */
const [d2] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, 'Problem cards')]);
const f2 = join(dir, 'cards.pdf'); await d2.saveAs(f2);
const t2 = flat(execFileSync('pdftotext', ['-raw', f2, '-'], { encoding: 'utf8' }));
ok(/PROGRAM AND PRODUCTS/.test(t2) && t2.includes('King Edward 2kg'), 'L4 the problem’s card carries a PROGRAM AND PRODUCTS block');

/* ---- L5 ---- */
await go(`#/programs?line=${WS}`);
const [d3] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, 'Programs report')]);
const f3 = join(dir, 'programs.pdf'); await d3.saveAs(f3);
const t3 = flat(execFileSync('pdftotext', ['-raw', f3, '-'], { encoding: 'utf8' }));
ok(/PROBLEMS ON THIS PROGRAM — 1 OPEN OF 1/.test(t3), 'L5 the Programs report has a PROBLEMS ON THIS PROGRAM box under the program', t3.slice(0, 400));
ok(t3.includes('CRITICAL') && t3.includes('Seal jaws not reaching temperature') && /Affects: King Edward 2kg/.test(t3), 'L5 the box names the problem, how serious, and the product it affects');
const imgs = execFileSync('pdfimages', ['-list', f3], { encoding: 'utf8' }).trim().split('\n').length - 2;
ok(imgs >= 1, `L5 and its picture is on the page (${imgs} image)`);

/* ---- R · the hourly rate, typed where the line is set up (Rowland: "nowhere for me to put the cost of labour per hour") ---- */
await page.evaluate(async ws => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(ws); await db.updateWorkspace({ ...w, crew: undefined, labourRatePerHour: undefined, labourBurden: undefined }); await db.patchSnag('pp-s2', { minutesPerDay: 30 }); }, WS);
await go(`#/snags?line=${WS}&open=pp-s2`);
const addRate = main().locator('.pe .pe-rate');
ok(await addRate.count() === 1 && /Add the hourly rate on/.test(await addRate.innerText()), 'R1 a problem’s cost with no hourly rate on the line says where to add it, one tap');
await addRate.click(); await page.waitForTimeout(1800);
ok(page.url().includes(`/lines/${WS}`) && page.url().includes('view=setup'), 'R1 it opens the line’s setup', page.url());
const rate = main().locator('[data-line-rate]');
ok(await rate.count() === 1, 'R2 the line’s setup has People on the line and £ an hour each, typed in place');
await rate.getByLabel('People on the line').fill('6'); await rate.getByLabel('People on the line').blur(); await page.waitForTimeout(600);
await rate.getByLabel('Labour rate, pounds an hour each').fill('18.50'); await rate.getByLabel('Labour rate, pounds an hour each').blur(); await page.waitForTimeout(900);
const w = await page.evaluate(async ws => { const x = await (await import('/src/db.ts')).getWorkspace(ws); return { crew: x.crew, rate: x.labourRatePerHour }; }, WS);
ok(w.crew === 6 && w.rate === 18.5, 'R2 both kept on the line', JSON.stringify(w));
ok(/6 people · £111\/hr/.test(flat(await main().locator('.pl-facts').innerText())), 'R2 and the line says its crew and cost', flat(await main().locator('.pl-facts').innerText()));
await go(`#/snags?line=${WS}&open=pp-s2`);
const costSaid = flat(await main().locator('.pe .pe-cost').innerText());
ok(/£/.test(costSaid) && await main().locator('.pe .pe-rate').count() === 0, `R3 the problem’s 30 minutes a day is now said in money, the prompt gone (${costSaid.slice(0, 120)})`);

/* ---- Ph ---- */
await page.setViewportSize({ width: 375, height: 800 });
await go(`#/snags?line=${WS}&open=pp-s1`);
const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(over <= 1 && await main().locator('.pe [aria-label="Which products"]').count() >= 1, `Ph the editor on a phone, products there, nothing off the side (${over}px)`);
ok(errs.length === 0, 'no console errors', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
