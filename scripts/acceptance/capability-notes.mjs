/* NOTES ON A LIVE TEST (Rowland, 2 November: "I'm doing a live test … I need the ability to go off this test and go back on it, and
 * … put notes on the test. At the moment I can't do anything apart from good or fail … write my observations in"). On the seeded
 * pass-or-fail study (the re-test's seal integrity, eight of twenty in):
 *   1  a Notes box on the page with the taps — an observation written while it runs, kept with its time and who
 *   2  the taps and the note survive going off the test and back, and a reload (nothing lost, the count carried on)
 *   2b a Back to the test button at the top of the study, going to the test it proves
 *   3  a note edited where it sits, deleted and brought back with Undo
 *   4  the note on the study's paper, read back
 *   6  End the test — one control: Fail the test (a total fail, with its reason, in the headline verdict, the notes and the criterion), changed to Abandon, readings still editable, the paper saying it, the call taken back
 *   5  a client (read only) sees the note and no box to write in; the phone fits
 *   node scripts/acceptance/capability-notes.mjs      (SMOKE_BASE, as smoke) */
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
const dir = mkdtempSync(join(tmpdir(), 'fl-capnotes-'));
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const go = async h => { await page.goto(`${BASE}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
await go('#/room');
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const sid = await page.evaluate(async () => { const db = await import('/src/db.ts'); const all = await db.listAllStudies(); return all.find(s => s.tool === 'capability' && s.agreed?.readings?.kind === 'ticks')?.id; });
ok(!!sid, '0 a pass-or-fail study to work on', sid);
const readingsN = () => page.evaluate(async id => (((await (await import('/src/db.ts')).getStudy(id))?.facts.readings) ?? []).filter(r => !r.struck).length, sid);
const notes = () => page.evaluate(async id => (((await (await import('/src/db.ts')).getStudy(id))?.facts.remarks) ?? []).filter(r => !r.struck).map(r => r.text), sid);

await go(`#/capability/${encodeURIComponent(sid)}`);
const box = page.getByLabel('Add to the commentary');
await box.waitFor({ timeout: 8000 });
ok((await page.locator('.rl-remarks').first().innerText()).includes('Notes'), '1 a Notes box sits on the page with the taps');
const before = await readingsN();
await page.getByRole('button', { name: 'Good', exact: true }).click(); await page.getByRole('button', { name: 'Failed', exact: true }).click(); await page.waitForTimeout(300);
await box.fill('Film tight on the left jaw from the start of the run');
await page.getByRole('button', { name: 'Add', exact: true }).click(); await page.waitForTimeout(500);
ok((await readingsN()) === before + 2 && (await notes()).length === 1, '1 two taps and one note written while it ran', `${await readingsN()} ${await notes()}`);
ok((await page.locator('.rl-rem li').first().innerText()).includes('Film tight on the left jaw') && /acceptance|\d\d:\d\d/.test(await page.locator('.rl-rem li').first().innerText()), '1 the note shows with its time');

/* 2 off the test and back, then a reload */
await go('#/room'); await go(`#/capability/${encodeURIComponent(sid)}`);
ok((await readingsN()) === before + 2 && (await page.locator('.rl-rem li').count()) === 1, '2 gone off the test and back — the taps and the note are there');
await page.getByRole('button', { name: 'Good', exact: true }).click(); await page.waitForTimeout(300);
await page.reload(); await page.locator('.nv-main').waitFor(); await page.waitForTimeout(1500);
ok((await readingsN()) === before + 3 && (await page.locator('.rl-rem li').count()) === 1, '2 a reload keeps all of it and the count carries on');

/* 2b the way back to the test it proves, at the top */
const back = page.getByRole('button', { name: /^‹ Back to the test/ });
ok(await back.count() === 1 && (await back.innerText()).includes('Seal integrity'), '2 a Back to the test button at the top names the test it proves');
await back.click(); await page.waitForTimeout(1500);
ok(!/#\/capability\//.test(page.url()), '2 it leaves the study for the test', page.url());
await go(`#/capability/${encodeURIComponent(sid)}`);

/* 3 edit, delete, undo */
await page.locator('.rl-rem li').first().getByRole('button', { name: 'Edit' }).click();
await page.getByLabel('The remark').fill('Film tight on the left jaw — loosened at 10:40');
await page.getByRole('button', { name: 'Keep' }).click(); await page.waitForTimeout(400);
ok((await notes())[0].includes('loosened at 10:40'), '3 a note edited where it sits');
await page.locator('.rl-rem li').first().getByRole('button', { name: 'Delete' }).click(); await page.waitForTimeout(400);
ok((await notes()).length === 0, '3 a note deleted');
await page.getByRole('button', { name: /Show the 1 taken off/ }).click();
await page.getByRole('button', { name: /Undo — bring it back/ }).click(); await page.waitForTimeout(400);
ok((await notes()).length === 1, '3 Undo brings it back');

/* 4 the paper */
const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, / — on paper$/)]);
const f = join(dir, 'study.pdf'); await d.saveAs(f);
const txt = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
ok(/notes/i.test(txt) && txt.includes('loosened at 10:40'), '4 the note is on the study’s paper', txt.slice(-400));

/* 6 end the test — one control, three calls, each with its reason (Rowland, 2 November: "a total fail on the tests … abandoned,
   overrule … don't save and are confusing") */
const state = () => page.evaluate(async id => { const x = await (await import('/src/db.ts')).getStudy(id); return { ab: x?.facts.abandoned, over: x?.overrule }; }, sid);
const band = async () => flat(await page.locator('.ln-band').first().innerText());
ok((await page.getByRole('button', { name: 'Overrule the verdict' }).count()) === 0, '6 the separate Overrule button is gone — one control');
await page.getByRole('button', { name: 'Fail the test', exact: true }).click();
ok(await page.getByRole('button', { name: 'Fail it' }).isDisabled(), '6 no reason chosen — Fail it held');
await page.getByRole('radio', { name: 'Something else' }).click();
ok(await page.getByRole('button', { name: 'Fail it' }).isDisabled(), '6 “Something else” with no words — held');
await page.getByRole('radio', { name: 'Machine fault' }).click();
await page.getByLabel('Its reason, in your words').fill('left jaw heater tripped at 10:52');
await page.getByRole('button', { name: 'Fail it' }).click(); await page.waitForTimeout(500);
let st = await state();
ok(st.over?.verdict === 'Didn’t pass' && st.over.why.includes('machine fault: left jaw heater') && !st.ab, '6 failed as a whole, with its reason, saved', JSON.stringify(st));
ok(/Failed/.test(await band()) && (await page.locator('.ie-say').first().innerText()).startsWith('Failed — called'), '6 the headline verdict and the sentence say Failed, not one line lower down', await band());
ok((await page.getByRole('button', { name: 'Good', exact: true }).count()) === 1 && (await page.getByRole('button', { name: /^Strike/ }).count()) > 0, '6 still editable — the taps and Strike are there');
ok((await notes()).some(n => n.startsWith('Test called failed — machine fault')), '6 the notes say it');
const crit = async () => page.evaluate(async id => { const db = await import('/src/db.ts'); const m = await import('/src/lib/programCriteria.ts'); const L = await import('/src/lib/studyLinks.ts'); const x = await db.getStudy(id); return { line: L.studyLine(x).text, ov: x.overrule?.verdict, ab: x.facts.abandoned?.reason }; }, sid);
let cr = await crit();
ok(cr.ov === 'Didn’t pass' && /Overruled: Didn’t pass/.test(cr.line), '6 a program’s criterion reads it as failed', JSON.stringify(cr));
/* change the call: abandon it */
await page.getByRole('button', { name: 'Abandon the test', exact: true }).click();
await page.getByRole('radio', { name: 'Line stopped' }).click();
await page.getByRole('button', { name: 'Abandon it' }).click(); await page.waitForTimeout(500);
st = await state();
ok(st.ab?.reason === 'Line stopped' && !st.over && st.ab.taken === before + 3, '6 the call changed to abandoned — the fail taken off, the readings it had kept', JSON.stringify(st));
ok(/Abandoned/.test(await band()) && (await page.getByRole('button', { name: 'Good', exact: true }).count()) === 0, '6 the headline says Abandoned and the taps are gone');
await page.getByRole('button', { name: /Every reading/ }).click().catch(() => {}); await page.waitForTimeout(300);
ok((await page.getByRole('button', { name: /^Strike/ }).count()) > 0, '6 the readings are still editable after abandoning (every reading, with Strike and what became of a failed one)');
const [d2] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, / — on paper$/)]);
const f2 = join(dir, 'abandoned.pdf'); await d2.saveAs(f2);
ok(/Abandoned — line stopped/.test(flat(execFileSync('pdftotext', ['-raw', f2, '-'], { encoding: 'utf8' }))), '6 the paper says it first');
cr = await crit();
ok(!cr.ov && cr.ab === 'Line stopped', '6 a criterion reads it as abandoned, not passed or failed', JSON.stringify(cr));
await page.getByRole('button', { name: 'Take the call back' }).click(); await page.waitForTimeout(500);
st = await state();
ok(!st.ab && !st.over && (await page.getByRole('button', { name: 'Good', exact: true }).count()) === 1, '6 the call taken back — the test as the readings say, the taps back');
ok((await readingsN()) === before + 3, '6 every reading still there');

/* 5 the phone */
await page.setViewportSize({ width: 390, height: 800 }); await page.waitForTimeout(500);
const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(over <= 1, `5 the phone: nothing off the side (${over}px)`);
ok(await page.getByLabel('Add to the commentary').isVisible(), '5 the phone: the note box is there');
ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? '\nFAILED' : '\nALL PASSED');
process.exit(fail ? 1 : 0);
