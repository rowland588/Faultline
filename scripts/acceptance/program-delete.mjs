/* ACCEPTANCE — A PROGRAM DELETED, AND A TEST DELETED, LEAVE NOTHING BEHIND.
 *
 * Rowland, 18 October, on a job's Programs: "deletes tests ... no delete but
 * still holds memory — Tesco main estate finest 2kg 8 in a tray, on the
 * machine, test 20 Oct, Brillopak". A line's own program on the job had no
 * Delete (only a link to the line), and a deleted test left its day on its
 * program. On the smoke seed, in a real browser:
 *
 *   1  a booked test deleted — its program forgets it: no day, no link, and
 *      its row on the job's Programs no longer says the day
 *   2  a program deleted takes its tests still to run with it; one Undo puts
 *      both back
 *   3  a line's own program on the job's Programs changed and deleted where
 *      it sits — and still gone after a reload
 *   and no page error.
 *
 *   node scripts/acceptance/program-delete.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke', user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'a@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { localStorage.setItem(k, JSON.stringify(s)); }, ['sb-testproj-auth-token', SESSION]);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message));
page.on('dialog', d => d.accept());
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const P = sd.projectId;
const prog = id => page.evaluate(async id => { const db = await import('/src/db.ts'); return (await db.listAllPrograms()).find(p => p.id === id) ?? null; }, id);
const tests = () => page.evaluate(async pid => { const db = await import('/src/db.ts'); return (await db.listTests(pid)).filter(t => t.programId && !t.deletedAt).map(t => ({ id: t.id, title: t.title, programId: t.programId, outcome: t.outcome, plannedFor: t.plannedFor })); }, P);
const rowWord = async what => page.evaluate(w => { const r = [...document.querySelectorAll('.pgr')].find(x => x.querySelector('.pgr-name')?.textContent.trim() === w); return r ? r.querySelector('.status-pill')?.textContent.trim() : null; }, what);

/* 1 · a booked test deleted: its program forgets the day */
let ts = await tests();
const bookedT = ts.find(t => t.outcome === 'planned');
const pid = bookedT.programId;
let p = await prog(pid);
ok(p.testOn === bookedT.plannedFor, `the program carries its booked test's day (${p.testOn})`);
await page.evaluate(async ([id, pr]) => { const db = await import('/src/db.ts'); await db.deleteTest(id, pr); }, [bookedT.id, P]);
p = await prog(pid);
ok(!p.testOn && !p.testId, `the test deleted, the program forgets it (testOn ${p.testOn}, testId ${p.testId})`);
await page.goto(`${BASE}/#/project/${P}/programs`); await page.waitForTimeout(3000);
ok(!/test 2\d Oct|due/.test((await rowWord(p.what)) ?? ''), `its row no longer says the day: "${await rowWord(p.what)}"`);

/* 2 · a program deleted: its booked tests go with it, one Undo puts both back */
await page.evaluate(async ([pid, pr]) => { const db = await import('/src/db.ts'); const p = (await db.listAllPrograms()).find(x => x.id === pid); await db.putTest({ id: 'tt-book', projectId: pr, kind: 'test', title: `Prove program ${p.what}`, programId: pid, outcome: 'planned', plannedFor: '2026-10-28', gate: 'commission', sort: 99, createdAt: Date.now(), updatedAt: Date.now() }); }, [pid, P]).catch(e => console.log('putTest', e.message));
ts = await tests();
ok(ts.some(t => t.id === 'tt-book'), 'a booked test made again for it');
const undo = await page.evaluate(async pid => { const db = await import('/src/db.ts'); window.__undo = await db.deleteProgramWithTests(pid); return true; }, pid);
ok(!(await prog(pid)) && !(await tests()).some(t => t.id === 'tt-book'), 'deleted: the program and its booked test both gone');
await page.evaluate(async () => { await window.__undo(); });
ok(!!(await prog(pid)) && (await tests()).some(t => t.id === 'tt-book'), 'Undo: both back');

/* 3 · a line's own program on the job: changed and deleted where it sits */
await page.goto(`${BASE}/#/project/${P}/programs`); await page.waitForTimeout(3500);
/* the page opens on what needs you (28 October); a line's own program that is done is under All */
await page.locator('.pp-chip', { hasText: /^All/ }).first().click(); await page.waitForTimeout(400);
const own = page.locator('.pgr').filter({ has: page.locator('.pp-line-tag') }).first();
const ownName = (await own.locator('.pgr-name').innerText()).trim();
await own.locator('.pgr-main').click(); await page.waitForTimeout(500);
ok(await own.locator('.pgr-del').count() === 1, `a line's own program (${ownName}) has Delete on the job's Programs`);
await own.getByLabel(/^(A|Another) product it runs$/).fill('Tesco Finest 2kg — 8 in a tray');
await own.locator('button[type=submit]').click(); await page.waitForTimeout(1200);
ok(flat(await page.locator('.pgr').filter({ hasText: ownName }).first().innerText()).includes('8 in a tray'), 'changed there: what it runs saved');
await page.locator('.pgr').filter({ hasText: ownName }).first().locator('.pgr-main').click(); await page.waitForTimeout(400);
await page.locator('.pgr').filter({ hasText: ownName }).first().locator('.pgr-del').click(); await page.waitForTimeout(1500);
ok(await page.locator('.pgr-name', { hasText: ownName }).count() === 0, 'deleted there: gone from the job\'s Programs');
await page.reload(); await page.waitForTimeout(3500);
ok(await page.locator('.pgr-name', { hasText: ownName }).count() === 0, 'and still gone after a reload — nothing holds it');
ok(!errs.length, `no page errors ${errs.join(' | ')}`);
console.log(fail ? `${fail} failed` : 'Program delete accepted: a deleted test forgotten by its program, a deleted program taking its booked tests with it (and Undo), a line\'s own program changed and deleted on the job — nothing holds it');
process.exitCode = fail ? 1 : 0;
await b.close();
function flat(s) { return (s ?? '').replace(/\s+/g, ' '); }
