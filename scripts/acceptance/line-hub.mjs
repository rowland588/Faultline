/* ACCEPTANCE — STAGE 3: THE LINE IS THE HUB (docs/BLUEPRINT.md §3, §7).
 *
 * Rowland, 17 October: "start stage 3 as fast as you can". On the smoke seed,
 * in a real browser, every sentence checked against the module that makes it
 * (lib/lineLean, lib/programs productsOf). Its products, ready or not,
 * came off on 23 October (Rowland: "You've invented products ... The program
 * is the product"; "one program could run multiple products ... a program 10
 * ... that does 4 products"):
 *
 *   1  the line's page: four tiles as lib/lineLean says them, no Products
 *      tile, tab or grid, the closing line saying nothing of products; an
 *      old link to ?view=products landing on the Overview
 *   2  a program planned on the line's Programs running four products —
 *      three added a chip each, the fourth typed and kept by Plan it — its
 *      row saying all four; one taken off on its form, saved, the form
 *      closed; an older program's one product kept
 *   3  its test day gone, the programs tile says it; proved, it counts
 *   4  the line report, one page: the tiles, no products grid, the program
 *      to prove with its products, the closing line as the screen says it
 *   5  the phone: nothing off the side, the products fit, each × tappable
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/line-hub.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper, more } from '../lib/pageHeader.mjs';
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
const go = async (hash, wait = 2500) => { await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(wait); };
const dir = mkdtempSync(join(tmpdir(), 'line-hub-'));

await go('#/room', 3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const LINE = sd.line7WsId;

/* what the module says for the line, from its own records */
const expected = () => page.evaluate(async id => {
  const db = await import('/src/db.ts');
  const { lineKit } = await import('/src/lib/lineRecords.ts');
  const [w, machines, programs, jobLines] = await Promise.all([db.getWorkspace(id), db.listAllAssets(), db.listAllPrograms(), db.allPaceLines()]);
  const kit = lineKit(w, machines, programs, jobLines);
  return { name: w.name, n: kit.programs.length, proved: kit.proved, late: kit.late };
}, LINE);
const tile = k => page.evaluate(k => { const t = [...document.querySelectorAll('.pl-tiles .ln-tile')].find(e => e.textContent.toUpperCase().includes(k.toUpperCase())); return t ? t.textContent.replace(/\s+/g, ' ').trim() : ''; }, k);
const program = what => page.evaluate(async w => (await (await import('/src/db.ts')).listAllPrograms()).find(p => p.what === w && !p.deletedAt), what);

/* 1 · the page — no Products (23 October: "You've invented products ... The program is the product") */
await go(`#/lines/${LINE}`, 3500);
let want = await expected();
ok(await page.locator('.pl-tiles .ln-tile').count() === 4, 'four tiles — problems, programs, stops, a day of the line');
ok(!(await tile('Products')), 'no Products ready tile');
ok((await tile('Programs proved')).includes(want.n ? `of ${want.n}` : 'no program planned on the line'), `Programs proved as lib/lineLean says it (${want.n} planned) — "${await tile('Programs proved')}"`);
ok(await page.locator('.pl > .ln-close').count() === 1, 'the closing line');
ok(!/product/i.test(flat(await page.locator('.pl > .ln-close').innerText())), 'the closing line says nothing of products');
const tabs = (await page.locator('.nv-tabs .nv-tab-l, .nv-rail a, .nv-rail button').allInnerTexts()).map(flat);
ok(!tabs.includes('Products'), `the line's pages have no Products (${[...new Set(tabs)].filter(Boolean).join(' · ')})`);
const order = await page.evaluate(() => [...document.querySelectorAll('.pl > .pl-sec')].map(s => s.getAttribute('aria-label')));
/* the machines are their own tab since 27 October ("I don't see your machine page"); the Overview has them machine by machine, then programs */
ok(!order.includes('Products on this line') && !order.includes('Machines on this line') && order.includes('The line, machine by machine') && order.indexOf('The line, machine by machine') < order.indexOf('Programs on this line'), `the page — the line machine by machine, then programs (${order.join(' · ')})`);
ok(tabs.includes('Machines'), 'the line has a Machines tab');
await go(`#/lines/${LINE}?view=products`, 2500);
ok(await page.locator('.pl-tiles .ln-tile').count() === 4, 'an old link to the line\'s Products lands on its Overview');

/* 2 · a program that runs four products, planned on the line's Programs */
await go(`#/programs?line=${encodeURIComponent(LINE)}&add=1`, 3000);
const form = page.locator('.mt-add-card').first();
if (!(await form.isVisible().catch(() => false))) await page.getByRole('button', { name: /^Plan a program on/ }).first().click();
await form.getByLabel("The program's name or number").fill('Program 10 All rounder');
const box = form.locator('.prods-box');
for (const x of ['All Rounder 2kg', 'Baking 2kg', 'Express 1.25kg']) {
  await box.locator('.prods-add input').fill(x);
  await box.locator('.prods-add input').press('Enter');
}
ok((await box.locator('.prods-chip').count()) === 3, 'three products added, a chip each');
await box.locator('.prods-add input').fill('Jacks 2kg');   /* typed, not added — Plan it keeps it */
await form.getByRole('button', { name: 'Plan it' }).click();
await page.waitForTimeout(1500);
let p10 = await program('Program 10 All rounder');
ok(p10?.runs === 'All Rounder 2kg, Baking 2kg, Express 1.25kg, Jacks 2kg', `kept: runs "${p10?.runs}"`);
ok((await box.locator('.prods-chip').count()) === 0 && (await box.locator('.prods-add input').inputValue()) === '', 'the form ready for the next program, no products left in it');
await go(`#/programs?line=${encodeURIComponent(LINE)}`, 3000);
const row = page.locator('.pgr').filter({ hasText: 'Program 10 All rounder' }).first();
ok(flat(await row.innerText()).includes('runs All Rounder 2kg, Baking 2kg, Express 1.25kg, Jacks 2kg'), 'its row says all four products');

/* one taken off where it sits */
await row.locator('.pgr-main, .pgr-name, button').first().click();
await page.waitForTimeout(800);
const edit = page.locator('.pgr-form').first();
ok((await edit.locator('.prods-chip').count()) === 4, 'its form shows the four, a chip each');
await edit.getByRole('button', { name: 'Take Baking 2kg off' }).click();
await edit.getByRole('button', { name: 'Save' }).click();
await page.waitForTimeout(1200);
p10 = await program('Program 10 All rounder');
ok(p10?.runs === 'All Rounder 2kg, Express 1.25kg, Jacks 2kg', `one taken off and saved: "${p10?.runs}"`);
ok(!(await page.locator('.pgr-form').count()), 'the form closes on Save');

/* an older program's one product is its first, and stays */
const older = await program('CW-1 Finest Red 2kg');
ok(older?.runs === 'Finest Red 2kg', `an older program keeps its one product ("${older?.runs}")`);

/* 3 · its test day gone, then proved — the line's tile moves */
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
await page.evaluate(async ([w, day]) => { const db = await import('/src/db.ts'); const p = (await db.listAllPrograms()).find(x => x.what === w); await db.putProgram({ ...p, state: 'onMachine', testOn: day, updatedAt: Date.now() }); }, ['Program 10 All rounder', yesterday]);
await go(`#/lines/${LINE}`, 3000);
want = await expected();
ok(want.late > 0 && (await tile('Programs proved')).includes(`${want.late} past its test day`), `the programs tile says ${want.late} past its test day — "${await tile('Programs proved')}"`);
const lineRow = flat(await page.locator('.pl-sec[aria-label="Programs on this line"]').innerText());
ok(lineRow.includes('runs All Rounder 2kg, Express 1.25kg, Jacks 2kg'), 'on the line\'s page the program says its products');
const provedBefore = want.proved;
await page.evaluate(async w => { const db = await import('/src/db.ts'); const p = (await db.listAllPrograms()).find(x => x.what === w); await db.putProgram({ ...p, state: 'proved', provedOn: new Date().toISOString().slice(0, 10), updatedAt: Date.now() }); }, 'Program 10 All rounder');
await go(`#/lines/${LINE}`, 3000);
want = await expected();
ok(want.proved === provedBefore + 1 && (await tile('Programs proved')).includes(`${want.proved}of ${want.n}`), `proved, the tile counts ${want.proved} (${provedBefore} → ${want.proved})`);

/* 4 · the line report, one page */
await page.evaluate(async w => { const db = await import('/src/db.ts'); const p = (await db.listAllPrograms()).find(x => x.what === w); await db.putProgram({ ...p, state: 'onMachine', provedOn: undefined, testOn: undefined, updatedAt: Date.now() }); }, 'Program 10 All rounder');
await go(`#/lines/${LINE}`, 3000);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), paper(page, 'Line report')]);
const f = join(dir, 'line.pdf'); await dl.saveAs(f);
const text = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' ');
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))?.[1]);
ok(pages === 1, `the line report is one page (${pages})`);
const nows = s => s.replace(/\s+/g, '');
for (const k of ['PROBLEMS OPEN', 'PROGRAMS PROVED', 'STOPS TIMED', 'A DAY OF THE LINE']) ok(text.toUpperCase().includes(k), `the tile "${k}" on the paper`);
ok(!/PRODUCTS READY|ITS PRODUCTS/i.test(text), 'no products grid on the paper');
ok(nows(text).includes(nows('Program 10 All rounder')) && nows(text).includes(nows('All Rounder 2kg, Express 1.25kg')), 'the program to prove on the paper with its products');
const closing = flat(await page.locator('.pl > .ln-close > span:last-child').innerText());
ok(nows(text).includes(nows(closing).slice(0, 40)), `the closing line on the paper as on the screen ("${closing.slice(0, 60)}…")`);

/* 5 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/lines/${LINE}`, 3000);
ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 392, 'the line\'s page: nothing off the side');
await go(`#/programs?line=${encodeURIComponent(LINE)}`, 3000);
await page.locator('.pgr').filter({ hasText: 'Program 10 All rounder' }).first().locator('.pgr-main, .pgr-name, button').first().click();
await page.waitForTimeout(800);
const ph = await page.evaluate(() => { const b = document.querySelector('.pgr-form .prods-box'); const r = b?.getBoundingClientRect(); return { wide: document.documentElement.scrollWidth, fits: !!r && r.right <= innerWidth + 1, x: [...document.querySelectorAll('.pgr-form .prods-x')].every(x => x.getBoundingClientRect().height >= 28) }; });
ok(ph.fits && ph.wide <= 392, `on a phone the products fit (${ph.wide}px)`);
ok(ph.x, 'each × big enough to tap');

ok(!errs.length, `no console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `${fail} failed` : 'Stage 3 accepted: the line is the hub — its tiles and no Products, a program running four products planned, one taken off, its tile moving when late and proved, its products on the line report, and the phone');
process.exit(fail ? 1 : 0);
