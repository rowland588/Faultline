/* ACCEPTANCE — A METHOD OF YOUR OWN, BY HAND (docs/PLATFORM-STATUS.md,
 * slice 3; docs/PLATFORM-REVIEW.md §6).
 *
 * Rowland's mandate, 18 October: a person describes a kind of work, it is
 * turned into a method, approved, and run — with the app useful when no AI
 * is there. Driven in a real browser from an empty device, AI off:
 *
 *   1  Methods from the control room's rail; none yet
 *   2  a blank method written by hand: its name, what it is for, a role, a
 *      stage renamed, a step needing a photo, a measured step with a limit,
 *      a gate needing a figure and a check by hand — the validator saying
 *      what is wrong until it can run
 *   3  approved; a project started on it with two machines
 *   4  the project's page: the band, the tiles, the stages, a step per
 *      machine, the gate waiting on its steps
 *   5  Done refused while the photo is missing, said in words; a photo
 *      taken; done
 *   6  a measurement outside its limit kept and said "did not pass" in red;
 *      tried again and passed
 *   7  the gate: its check confirmed by name and passed — every gate passed
 *   8  the method report: the stage, each step on each machine, the gate,
 *      the check and who confirmed it
 *   9  the control room: the project's row with the method's name and its
 *      stage
 *  10  a new version made, changed and approved — the first retired, and the
 *      project still on version 1
 *  11  a team member does the work and may not pass a gate; a client reads
 *  12  a phone: nothing off the side, the step opens
 *  and no console error anywhere.
 *
 *   node scripts/acceptance/methods.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const OUT = process.env.SHOTS;
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
page.setDefaultTimeout(20000);
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
const txt = async () => (await page.locator('.nv-main').innerText()).replace(/\s+/g, ' ');
const sheet = () => page.getByRole('dialog').last();
const sheetTxt = async () => (await sheet().innerText()).replace(/\s+/g, ' ');
const blur = async () => { await page.keyboard.press('Tab'); await page.waitForTimeout(250); };
const fill = async (loc, v) => { await loc.fill(v); await blur(); };
const shot = async n => { if (OUT) await page.screenshot({ path: `${OUT}/m-${n}.png`, fullPage: true }); };
/* a 1×1 picture, for the Camera door */
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3500);
/* 1 — from the control room's rail */
await page.locator('.nv-rail').getByRole('button', { name: 'Methods', exact: true }).click(); await page.waitForTimeout(1200);
ok(/#\/methods$/.test(page.url()) && /No methods yet/.test(await txt()), '1 Methods from the rail: none yet');

/* 2 — a blank method, written by hand */
await page.locator('.nv-main').getByRole('button', { name: 'New method' }).first().click(); await page.waitForTimeout(500);
await page.getByRole('button', { name: /Nothing — a blank method/ }).click(); await page.waitForTimeout(1500);
ok(/#\/methods\/[^/]+$/.test(page.url()) && /Draft · version 1/.test(await txt()), '2 a blank method opens as a draft, version 1');
await fill(page.getByLabel("The method's name", { exact: true }), 'Changeover kit trial');
await fill(page.getByLabel('What it is for', { exact: true }), 'A new changeover kit proved on every bagger before it is the standard.');
await page.getByRole('button', { name: 'Add a role' }).click(); await page.waitForTimeout(400);
await fill(page.getByLabel('Role 1', { exact: true }), 'Fitter');
await fill(page.getByLabel("Stage 1's name", { exact: true }), 'Prove the kit');
await page.getByRole('button', { name: 'Add a step' }).click(); await page.waitForTimeout(700);
await fill(sheet().getByLabel("The step's title", { exact: true }), 'Kit laid out');
await sheet().getByLabel('Who does it', { exact: true }).selectOption({ label: 'Fitter' }); await page.waitForTimeout(250);
await fill(sheet().getByLabel('Photos it needs', { exact: true }), '1');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Add a step' }).click(); await page.waitForTimeout(700);
await fill(sheet().getByLabel("The step's title", { exact: true }), 'Trial changeover');
await sheet().getByLabel('How it is answered', { exact: true }).selectOption('measure'); await page.waitForTimeout(400);
await fill(sheet().getByLabel("Box 1's name", { exact: true }), 'Changeover minutes');
await fill(sheet().getByLabel('Changeover minutes: at most', { exact: true }), '20');
await fill(sheet().getByLabel("Changeover minutes's unit", { exact: true }), 'min');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
ok(/Kit laid out every machine · done · Fitter · 1 photo/.test(await txt()) && /Trial changeover every machine · measured · 1 box/.test(await txt()), '2a each step said in a line under its title');
await page.getByRole('button', { name: 'Add what the gate needs' }).click(); await page.waitForTimeout(600);
await sheet().getByLabel('What the gate needs', { exact: true }).selectOption('fieldMeets'); await page.waitForTimeout(300);
await sheet().getByLabel('Is', { exact: true }).selectOption('<='); await page.waitForTimeout(200);
await fill(sheet().getByLabel('The figure', { exact: true }), '20');
await sheet().getByRole('button', { name: 'Add it to the gate' }).click(); await page.waitForTimeout(600);
await page.getByRole('button', { name: 'Add what the gate needs' }).click(); await page.waitForTimeout(600);
await sheet().getByLabel('What the gate needs', { exact: true }).selectOption('manual'); await page.waitForTimeout(300);
await fill(sheet().getByLabel('What is checked', { exact: true }), 'Kit stored on its shadow board');
await sheet().getByRole('button', { name: 'Add it to the gate' }).click(); await page.waitForTimeout(700);
ok(/WAITS “Trial changeover”: Changeover minutes at most 20 min/i.test(await txt()) && /WAITS Kit stored on its shadow board/i.test(await txt()), '2b the gate needs the figure and a check by hand');
ok(/It can run/.test(await txt()) && await page.getByRole('button', { name: 'Approve version 1' }).isEnabled(), '2c the validator says it can run');
/* a broken method is refused in words: a measured step with nothing to measure */
await page.locator('.fw-step-b', { hasText: 'Trial changeover' }).click(); await page.waitForTimeout(500);
await sheet().getByRole('button', { name: /Remove box Changeover minutes/ }).click(); await page.waitForTimeout(500);
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
ok(/to put right before it can run/.test(await txt()) && /is measured but has no number to measure/.test(await txt()) && /reads a field "changeover_minutes" that "Trial changeover" does not have/.test(await txt()) && !(await page.getByRole('button', { name: 'Approve version 1', exact: true }).isEnabled()), '2d a measured step with no number, and a gate reading a box that is gone: said, and Approve held back');
await page.locator('.fw-step-b', { hasText: 'Trial changeover' }).click(); await page.waitForTimeout(500);
await sheet().getByRole('button', { name: 'Add a box' }).click(); await page.waitForTimeout(300);
await sheet().getByLabel("Box 1's kind", { exact: true }).selectOption('reading'); await page.waitForTimeout(300);
await fill(sheet().getByLabel("Box 1's name", { exact: true }), 'Changeover minutes');
await fill(sheet().getByLabel('Changeover minutes: at most', { exact: true }), '20');
await fill(sheet().getByLabel("Changeover minutes's unit", { exact: true }), 'min');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
/* a first draft takes its keys from its words: the box named again is the box the gate reads */
ok(/It can run/.test(await txt()), '2e the box named again is the one the gate reads — it can run again');
await shot('1-draft');
await page.getByRole('button', { name: 'Approve version 1' }).click(); await page.waitForTimeout(1200);
ok(/Approved · version 1/.test(await txt()), '3 approved — version 1');

/* 3 — a project on it */
await page.getByRole('button', { name: 'Start a project on it' }).click(); await page.waitForTimeout(500);
await page.getByLabel("The project's name", { exact: true }).fill('Bagger kit trial — Line 4');
await page.getByLabel('The machines, one a line', { exact: true }).fill('Bagger 1\nBagger 2');
await page.getByLabel('Who is Fitter', { exact: true }).fill('Dave');
await sheet().getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(2500);
const projUrl = page.url();
const t4 = await txt();
ok(/#\/project\/[^/?]+$/.test(projUrl) && /METHOD Bagger kit trial — Line 4 Changeover kit trial · version 1/.test(t4), '4 the project: its band, its method and version');
ok(/STEPS DONE 0 of 4 · 0%/.test(t4) && /GATES PASSED 0 of 1/.test(t4), '4a the tiles: 0 of 4 steps, 0 of 1 gates');
ok(/Bagger 1 · 0 of 2 done Kit laid out To do · Dave Trial changeover To do Bagger 2 · 0 of 2 done/.test(t4), '4b a step per machine — the one given to the Fitter for Dave');
ok(/THE GATE 2 things not met Every step in Prove the kit done · “Trial changeover”: Changeover minutes at most 20 min · Kit stored on its shadow board/.test(t4) && await page.locator('.fw-gate-line.is-a').count() === 1, '4c the gate: two things not met, in amber (waiting), not red — and its check by hand');
await shot('2-project');

/* 5 — Done refused without its photo; a photo; done */
await page.locator('.fw-row[data-step="kit-laid-out"][data-machine="Bagger 1"]').click(); await page.waitForTimeout(600);
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(700);
ok(/It still needs a photo\./.test(await sheetTxt()), '5 Done refused, in words: it still needs a photo');
const [chooser] = await Promise.all([page.waitForEvent('filechooser'), sheet().getByRole('button', { name: 'Camera' }).click()]);
await chooser.setFiles({ name: 'kit.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(1500);
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(900);
ok(/Done\./.test(await sheetTxt()) && /1 photo/.test(await sheetTxt()), '5a a photo taken, and done');
await page.keyboard.press('Escape'); await page.waitForTimeout(700);
ok(/Kit laid out Done \d+ \w+ · Dave/.test(await txt()), '5b the row says done, with the day');

/* 6 — a measurement outside its limit, then again inside it */
await page.locator('.fw-row[data-step="trial-changeover"][data-machine="Bagger 1"]').click(); await page.waitForTimeout(600);
await fill(sheet().getByLabel('Changeover minutes', { exact: true }), '26');
await sheet().getByRole('button', { name: 'Save the result' }).click(); await page.waitForTimeout(900);
ok(/Kept — it did not pass: Changeover minutes 26 min — at most 20 min/.test(await sheetTxt()), '6 26 minutes kept, and said: did not pass');
await sheet().getByRole('button', { name: 'Try again' }).click(); await page.waitForTimeout(800);
await fill(sheet().getByLabel('Changeover minutes', { exact: true }), '18');
await sheet().getByRole('button', { name: 'Save the result' }).click(); await page.waitForTimeout(900);
ok(/Done\./.test(await sheetTxt()) && /Earlier attempts Did not pass .*Changeover minutes 26/i.test(await sheetTxt()), '6a tried again at 18 — passed, the first attempt kept');
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
/* Bagger 2: both steps */
await page.locator('.fw-row[data-step="kit-laid-out"][data-machine="Bagger 2"]').click(); await page.waitForTimeout(500);
const [c2] = await Promise.all([page.waitForEvent('filechooser'), sheet().getByRole('button', { name: 'Camera' }).click()]);
await c2.setFiles({ name: 'kit2.png', mimeType: 'image/png', buffer: png }); await page.waitForTimeout(1500);
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(800);
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await page.locator('.fw-row[data-step="trial-changeover"][data-machine="Bagger 2"]').click(); await page.waitForTimeout(500);
await fill(sheet().getByLabel('Changeover minutes', { exact: true }), '17');
await sheet().getByRole('button', { name: 'Save the result' }).click(); await page.waitForTimeout(800);
await page.keyboard.press('Escape'); await page.waitForTimeout(700);
ok(/STEPS DONE 4 of 4 · 100%/.test(await txt()) && /THE GATE Ready to pass/.test(await txt()), '6b every step done — the gate ready, its check confirmed at the pass');

/* 7 — the gate: its check confirmed by name, passed */
await page.locator('.fw-gate-line').click(); await page.waitForTimeout(600);
const g = await sheetTxt();
ok(/✓ “Trial changeover”: Changeover minutes at most 20 min — 18 min, 17 min/.test(g), '7 the gate reads the figures: 18 min, 17 min, at most 20');
ok(await sheet().getByRole('button', { name: 'Pass it anyway' }).isDisabled(), '7a with its check not confirmed it passes only with a reason');
await sheet().getByLabel('Kit stored on its shadow board — confirmed by', { exact: true }).fill('Lee');
await sheet().getByRole('button', { name: 'Pass the gate' }).click(); await page.waitForTimeout(1000);
ok(/Prove the kit's gate passed\./.test(await sheetTxt()), '7b passed');
await page.keyboard.press('Escape'); await page.waitForTimeout(700);
ok(/Every gate passed/.test(await txt()) && /GATES PASSED 1 of 1/.test(await txt()), '7c every gate passed — the band and the tiles say so');
ok(/Passed .* gate/.test(await txt()) && /What has happened/.test(await txt()), '7d the history says who did what');
await shot('3-done');

/* 8 — the method report */
const dir = mkdtempSync(join(tmpdir(), 'methods-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Method report' }).click()]);
const f = join(dir, 'report.pdf'); await dl.saveAs(f);
const pdf = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
ok(/Bagger kit trial — Line 4/.test(pdf) && /Kit laid out — Bagger 1/.test(pdf) && /Trial changeover — Bagger 2/.test(pdf), '8 the report: each step on each machine');
ok(/Confirmed by Lee — Kit stored on its shadow board/.test(pdf) && /Every gate passed/.test(pdf), '8a the gate, the check and who confirmed it');

/* 9 — the control room */
await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const room = await txt();
ok(/Bagger kit trial — Line 4 Changeover kit trial · Every gate passed/.test(room), '9 the control room: the row, its method, where it is');
ok(/Bagger kit trial — Line 4/.test((await page.locator('.nv-rail').innerText()).replace(/\s+/g, ' ')), '9a the rail lists it under Jobs');

/* 10 — a new version, changed and approved; the project stays on 1 */
await page.goto(`${BASE}/#/methods`); await page.waitForTimeout(1500);
await page.locator('.fw-card', { hasText: 'Changeover kit trial' }).locator('.fw-card-b').click(); await page.waitForTimeout(1200);
ok(/Running on Bagger kit trial — Line 4|Projects on it Bagger kit trial — Line 4 · on version 1/.test(await txt()), '10 the method lists the project on version 1');
await page.getByRole('button', { name: 'Change it — a new version' }).click(); await page.waitForTimeout(1500);
ok(/Draft · version 2/.test(await txt()), '10a a new version, as a draft');
await fill(page.getByLabel("Stage 1's name", { exact: true }), 'Prove the kit on every bagger');
await page.getByRole('button', { name: 'Approve version 2' }).click(); await page.waitForTimeout(1200);
ok(/v1 · Retired/.test(await txt()) && /v2 · Approved/.test(await txt()), '10b version 2 approved, version 1 retired — kept');
await page.goto(projUrl); await page.waitForTimeout(2000);
ok(/Changeover kit trial · version 1/.test(await txt()) && /Prove the kit\b/.test(await txt()) && !/Prove the kit on every bagger/.test(await txt()), '10c the project still runs on version 1, its stage as it was');

/* 11 — a team member and a client (the development switch, cloud/access) */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'team'));
await page.reload(); await page.waitForTimeout(2500);
await page.locator('.fw-gate-line').click(); await page.waitForTimeout(500);
ok(/Reopen it/.test(await sheetTxt()) === false, '11 a team member: no reopening the gate');
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await page.reload(); await page.waitForTimeout(2500);
ok(/You can read this job and take its reports/.test(await txt()), '11a a client reads it, and is told so');
await page.locator('.fw-row[data-step="kit-laid-out"][data-machine="Bagger 1"]').click(); await page.waitForTimeout(500);
ok(await sheet().getByRole('button', { name: 'Camera' }).count() === 0 && await sheet().getByRole('button', { name: 'Take back “done”' }).count() === 0, '11b a client: no camera, nothing to take back');
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* 12 — a phone */
await page.setViewportSize({ width: 390, height: 844 });
await page.reload(); await page.waitForTimeout(2500);
ok(await page.evaluate(() => document.documentElement.scrollWidth) <= 392, '12 a phone: nothing off the side');
await page.locator('.fw-row[data-step="trial-changeover"][data-machine="Bagger 2"]').click(); await page.waitForTimeout(600);
ok(/Changeover minutes/i.test(await sheetTxt()), '12a the step opens in its sheet');
await shot('4-phone');

writeFileSync(join(dir, 'done'), '');
ok(errs.length === 0, `no console errors${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
