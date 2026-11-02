/* ACCEPTANCE — A PROGRAM'S STATUS SECTION (lib/programStatus; ui/ProgramStatus — Rowland, 2 November: "the program report and app ui
 * needs a clear program status section this can be manually inputted by the user. Programs status done, doing etc, best speed.
 * Speed production can run at .. any caveats"). On the seeded project's Programs page, with the real controls:
 *
 *   1  every program row has a Status section; with nothing said it says so and offers Set the status
 *   2  Doing, best speed 75, production can run at 70, a caveat — kept on the program (db), shown on the row in the module's words,
 *      kept after a reload
 *   3  a speed that is not a number refused in words, Keep held; production above the best speed run said in amber, never refused
 *   4  the programs report on paper: the Status line and the tally as the module says them, read back
 *   5  the status taken off; a client reads it and has no button to change it; the phone, nothing off the side
 *   and no console error.
 *   node scripts/acceptance/program-status.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { paper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 500)}` : ''}`); if (!c) fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const dir = mkdtempSync(join(tmpdir(), 'fl-pstatus-'));
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const go = async h => { await page.goto(`${BASE}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1800); };
await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PROGS = `#/project/${sd.projectId}/programs`;
const openAll = async () => { await page.locator('.pp-chip', { hasText: /^All/ }).first().click().catch(() => {}); await page.waitForTimeout(300); };
const ROW = () => page.locator('.pgr:not(:has(.pp-line-tag))').first();
const prog = async what => page.evaluate(async ([pid, w]) => (await (await import('/src/db/programs.ts')).listPrograms(pid)).find(p => p.what === w && !p.deletedAt), [sd.projectId, what]);

await go(PROGS); await openAll();
const name = flat(await ROW().locator('.pgr-name').innerText());
const section = () => ROW().locator('[data-program-status]');
ok(await section().count() === 1 && /Nothing said yet/.test(await section().innerText()) && await section().getByRole('button', { name: 'Set the status' }).count() === 1, '1 a Status section on the row, saying nothing is said and offering Set the status', name);

await section().getByRole('button', { name: 'Set the status' }).click();
await section().getByRole('radio', { name: 'Doing' }).click();
await section().getByLabel('Best speed run').fill('75');
await section().getByLabel('Production can run at').fill('70');
await section().getByLabel('Caveats').fill('Only on the 2 kg film; check film tension each reel');
await section().getByRole('button', { name: 'Keep the status' }).click(); await page.waitForTimeout(700);
let p = await prog(name);
ok(p?.status?.work === 'doing' && p.status.bestSpeed === 75 && p.status.runAt === 70 && p.status.caveats.includes('2 kg film'), '2 kept on the program: doing, 75, 70, the caveat', JSON.stringify(p?.status));
const said = flat(await section().innerText());
ok(/Doing/.test(said) && /Best speed 75 ppm/.test(said) && /Production can run at 70 ppm/.test(said) && /Only on the 2 kg film/.test(said), '2 the row says it in the module’s words', said);
ok(!/faster than the best speed/.test(said), '2 70 is under 75 — no warning');
await go(PROGS); await openAll();
ok(/Production can run at 70 ppm/.test(flat(await section().innerText())), '2 kept after a reload');

await section().getByRole('button', { name: 'Change the status' }).click();
await section().getByLabel('Best speed run').fill('abc');
ok(await section().getByRole('button', { name: 'Keep the status' }).isDisabled() && /number above nothing/.test(await section().locator('[role=alert]').innerText()), '3 a speed that is not a number refused in words, Keep held');
await section().getByLabel('Best speed run').fill('75');
await section().getByLabel('Production can run at').fill('80');
await section().getByRole('button', { name: 'Keep the status' }).click(); await page.waitForTimeout(700);
ok(/faster than the best speed it has been run at/.test(flat(await section().innerText())), '3 production above the best speed run said, not refused');

/* 4 the paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, 'Programs report')]);
const f = join(dir, 'programs.pdf'); await dl.saveAs(f);
const txt = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' })).replace(/\s+/g, '');
const want = 'Status: Doing · Best speed 75 ppm · Production can run at 80 ppm'.replace(/\s+/g, '');
const wantCav = 'Caveats: Only on the 2 kg film; check film tension each reel'.replace(/\s+/g, '');
ok(txt.includes(want) && txt.includes(wantCav) && txt.indexOf(want) < txt.indexOf(wantCav), '4 the report carries the Status line as the module says it, the caveats on their own line under it');
ok(txt.includes('faster than the best speed'.replace(/\s+/g, '')), '4 and the amber sentence');
ok(/1ofd+programswithastatus—1doing/.test(txt) || /1of\d+programswithastatus/.test(txt), '4 and the tally of what people said of their programs');

/* 5 taken off; a client; the phone */
await section().getByRole('button', { name: 'Change the status' }).click();
await section().getByRole('button', { name: 'Take the status off' }).click(); await page.waitForTimeout(700);
ok(!(await prog(name))?.status && /Nothing said yet/.test(await section().innerText()), '5 the status taken off — nothing said again');
await section().getByRole('button', { name: 'Set the status' }).click();
await section().getByRole('radio', { name: 'Done' }).click();
await section().getByRole('button', { name: 'Keep the status' }).click(); await page.waitForTimeout(600);
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await page.reload(); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1800); await openAll();
{ const t = await section().count() ? flat(await section().innerText()) : '(no section)'; const nb = await section().getByRole('button', { name: /status/i }).count(); ok(/Done/.test(t) && nb === 0, '5 a client reads the status and has no button to change it', t + ' | buttons ' + nb); }
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 390, height: 800 }); await page.reload(); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1800); await openAll();
const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(over <= 1, `5 the phone: nothing off the side (${over}px)`);
/* 6 THE LINE'S OWN PROGRAMS PAGE has the status section too, and the commentary written on a test's study reaches the paper
   (Rowland, 2 November: "where is it all?"; "commentary on program 10 on a test … I can't see it anywhere") */
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 1360, height: 900 });
await page.evaluate(async ([ws]) => {
  const { putProgram } = await import('/src/db/programs.ts'); const { putTest } = await import('/src/db/testing.ts'); const { putStudy } = await import('/src/db/studies.ts');
  const t = Date.now();
  await putProgram({ id: 'pg10', workspaceId: ws, what: 'Program 10', state: 'onMachine', testId: 't10', createdAt: t, updatedAt: t, sort: 1 });
  await putTest({ id: 't10', projectId: 'line:' + ws, workspaceId: ws, title: 'Prove Program 10', kind: 'test', outcome: 'passed', programId: 'pg10', ranOn: '2026-10-30', sort: 1, createdAt: t, updatedAt: t });
  await putStudy({ id: 's10', tool: 'capability', name: 'Program 10 at 70 ppm', workspaceId: ws, uses: [{ id: 'u10', kind: 'test', ref: 't10', role: 'proof', at: t, by: 'x' }], agreed: {}, facts: { remarks: [{ id: 'rm1', at: t, text: 'Seal lifted on the third pack at 75', by: 'Rowland' }] }, startedAt: t, createdAt: t, updatedAt: t });
}, [sd.wsId]);
await go(`#/programs?line=${encodeURIComponent(sd.wsId)}`);
await page.locator('.pp-chip', { hasText: /^All/ }).first().click().catch(() => {}); await page.waitForTimeout(500);
const lrow = page.locator('.lp-row', { hasText: 'Program 10' }).first();
const lsec = lrow.locator('[data-program-status]');
ok(await lsec.count() === 1 && await lsec.getByRole('button', { name: 'Set the status' }).count() === 1, '6 the line’s own Programs row has the Status section');
await lsec.getByRole('button', { name: 'Set the status' }).click();
await lsec.getByRole('radio', { name: 'Doing' }).click();
await lsec.getByLabel('Best speed run').fill('75'); await lsec.getByLabel('Production can run at').fill('70');
await lsec.getByLabel('Caveats').fill('Only on the 2 kg film');
await lsec.getByRole('button', { name: 'Keep the status' }).click(); await page.waitForTimeout(700);
ok(/Doing/.test(await lsec.innerText()) && /75 ppm/.test(await lsec.innerText()), '6 set on the line’s page and shown there');
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, 'Programs report')]);
const f2 = join(dir, 'line-programs.pdf'); await dl2.saveAs(f2);
const t2 = flat(execFileSync('pdftotext', ['-raw', f2, '-'], { encoding: 'utf8' })).replace(/\s+/g, '');
ok(t2.includes('Status:Doing·Bestspeed75ppm·Productioncanrunat70ppm'), '6 the line’s programs report carries the status');
ok(t2.includes('Note:') && t2.includes('Seallifted on the third pack at 75'.replace(/\s+/g, '')), '6 and the commentary written on Program 10’s test, under the test');

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? '\nFAILED' : '\nALL PASSED');
process.exit(fail ? 1 : 0);
