/* FC-014 — THE MISTAKE-PROOFING REGISTER AS DATA (knowledge/specs/FC-014-mistake-proofing.md, criteria 9–12; 1 November 2026).
 * A mistake-proofing log is started from its starter list on a line, and:
 *
 *   R1  the device register panel on The checks tab says Case 3 in the module's words — 7 devices (2 contact · 2 fixed-value ·
 *       3 motion-step; 6 control · 1 warning) and 2 routine checks — each device's line under its name; the warning rule once;
 *       the type and function chips narrow the rows and say how many are shown
 *   R2  Edit a check: its type taken off (Not stated) moves the count to "1 with no type yet" with no reload; set again; a new
 *       device added with its error, type and function counts as the 8th; everything kept after a reload
 *   R3  the Round shows the device's type, function and the error under its name, and what passes without those words
 *   R4  a log started before the fields existed (long names, "Contact · control." in passes-if) counts the same seven devices
 *       and says they are read from the words; editing one of them writes the fields
 *   R5  the paper, downloaded and read back: The device register — 8 devices, 2 routine checks, the module's sentence, the checks
 *       with their error, type and function, the routine checks marked as such, the warning rule
 *   R6  a client reads the register and edits nothing; the phone — nothing off the side, the chips and the form's chips 44 px
 *
 *   node scripts/acceptance/device-register.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
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
const OUT = mkdtempSync(join(tmpdir(), 'device-register-'));
const errors = [];
let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${String(extra).slice(0, 600)}` : ''}`); if (!c) failed++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();

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
await dp.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/** A mistake-proofing log on a fresh line, from the starter list (or, for an older log, as the starter list used to be written). */
const made = await dp.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { newLogStudy } = await import('/src/tools/checks/start.ts');
  const { defOf } = await import('/src/tools/checks/registry.ts');
  const def = defOf('mistake-proofing');
  const w = await db.createWorkspace('Packing line 14');
  await db.updateWorkspace({ ...w, packsPerMin: 110, materialsPerPack: 0.2 });
  const t = Date.now() - 60_000;
  const s = newLogStudy(def, { since: t, now: t, name: 'Device checks — Packing line 14', workspaceId: w.id, where: 'Wrapper' });
  await db.putStudy(s);
  /* an older log: the long names and the words in front of "passes if", no fields */
  const old = newLogStudy(def, { since: t, now: t, name: 'Device checks — the old list', workspaceId: w.id, where: 'Wrapper' });
  const longName = { 'Label-presence sensor': 'Label-presence sensor — prevents a pack with no label', 'Date-code reader': 'Date-code reader — prevents a missing or wrong date code',
    'Reject-confirm on the metal detector': 'Reject-confirm on the metal detector — prevents a rejected pack staying in the flow', 'Case-count sensor': 'Case-count sensor — prevents a short or over-filled case',
    'Guard interlock': 'Guard interlock — prevents the machine starting with the guard open', 'Colour-coded utensils and tools': 'Colour-coded utensils and tools — prevent an allergen tool at the wrong station',
    'Recipe release': 'Recipe release — prevents the next ingredient before the last is weighed' };
  const cap = x => x[0].toUpperCase() + x.slice(1);
  old.agreed.log.checks = old.agreed.log.checks.map(c => {
    if (!c.deviceType) return c;
    const { error, deviceType, deviceFunction, ...rest } = c;
    return { ...rest, name: longName[c.name] ?? c.name, criterion: `${cap(deviceType)} · ${deviceFunction}. ${c.criterion}` };
  });
  await db.putStudy(old);
  return { id: s.id, oldId: old.id, ws: w.id };
});

/** The module's own reading of the stored log. */
const truth = id => dp.evaluate(async sid => {
  const db = await import('/src/db.ts'); const R = await import('/src/tools/checks/register.ts');
  const s = await db.getStudy(sid); const r = R.registerOf(s.agreed.log.checks);
  return { says: R.registerSays(r), devices: r.devices.length, routines: r.routines.length, byType: r.byType, byFunction: r.byFunction, noType: r.noType, fromWords: r.fromWords, warning: R.warningNote(r) ?? null,
    names: r.devices.map(d => d.check.name), lines: r.devices.map(d => R.deviceLine(d)) };
}, id);
const tab = async (page, name) => { await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click(); await page.waitForTimeout(400); };
const openChecks = async (page, go, id) => { await go(`#/log/mistake-proofing/${id}`); await page.locator('.lg-figs').waitFor({ timeout: 15000 }); await tab(page, 'The checks'); await page.locator('.lg-register').waitFor({ timeout: 8000 }); };

/* ============================================================================================ R1 · the register counted */
await openChecks(dp, desk.go, made.id);
let t = await truth(made.id);
ok(t.says === '7 devices — 2 contact · 2 fixed-value · 3 motion-step; 6 control · 1 warning — and 2 routine checks on them.', 'R1 the module counts the starter list as the spec’s Case 3 says', t.says);
ok(flat(await dp.locator('[data-register-says]').innerText()) === t.says, 'R1 the page says it in the module’s words', await dp.locator('[data-register-says]').innerText());
ok((await dp.locator('[data-register-warning]').count()) === 1 && flat(await dp.locator('[data-register-warning]').innerText()) === t.warning, 'R1 the warning rule is said once, as the module says it');
ok(!(await dp.locator('[data-register-words]').count()), 'R1 a log started now has nothing read from words');
const lines = (await dp.locator('.lg-list [data-device]').allInnerTexts()).map(flat);
ok(lines.length === 7 && JSON.stringify(lines) === JSON.stringify(t.lines.map(flat)), `R1 each of the 7 devices carries its type, function and error under its name — ${lines[0]}`, JSON.stringify(lines));
ok((await dp.locator('li[data-check-def]').count()) === 9, 'R1 the list holds the 7 devices and the 2 routine checks');
const chip = n => dp.locator('.lg-register .chip', { hasText: n });  // the counts follow the word: 'Motion-step · 3'
await chip('Motion-step ·').click();
ok(flat(await dp.locator('[data-register-shown]').innerText()) === 'Showing 3 of 7 devices; the 2 routine checks are hidden.', 'R1 Motion-step narrows to 3 of 7 and says the routine checks are hidden', await dp.locator('[data-register-shown]').innerText());
ok((await dp.locator('li[data-check-def]').count()) === 3, 'R1 three rows');
await chip('Warning ·').click();
ok((await dp.locator('li[data-check-def]').count()) === 0, 'R1 motion-step AND warning is none of them');
await chip('Motion-step ·').click();
ok((await dp.locator('li[data-check-def]').count()) === 1 && /Colour-coded/.test(await dp.locator('li[data-check-def]').first().innerText()), 'R1 warning alone is the colour-coded tools');
await chip('Any function').click(); await chip('Every type').click();
ok((await dp.locator('li[data-check-def]').count()) === 9 && !(await dp.locator('[data-register-shown]').count()), 'R1 cleared: all nine again');

/* ============================================================================================ R2 · edit it */
const editOf = name => dp.getByRole('button', { name: `Edit — ${name}` });
await editOf('Case-count sensor').click();
const sheet = dp.locator('[data-sheet="check"]');
await sheet.waitFor();
ok(await sheet.getByRole('radio', { name: 'Fixed-value' }).getAttribute('aria-checked') === 'true' && await sheet.getByRole('radio', { name: 'Control' }).getAttribute('aria-checked') === 'true', 'R2 the form opens on the device’s type and function');
ok(await sheet.getByLabel('The error it prevents').inputValue() === 'A short or over-filled case', 'R2 and the error it prevents');
await sheet.getByRole('radiogroup', { name: 'Device type' }).getByRole('radio', { name: 'Not stated' }).click();
await sheet.getByRole('button', { name: 'Save the check' }).click();
await dp.waitForTimeout(500);
t = await truth(made.id);
ok(t.noType === 1 && t.says.includes('1 with no type yet.') && t.byType['fixed-value'] === 1, 'R2 type taken off: 1 with no type yet, fixed-value 1', t.says);
ok(flat(await dp.locator('[data-register-says]').innerText()) === t.says, 'R2 the page moved with no reload', await dp.locator('[data-register-says]').innerText());
await editOf('Case-count sensor').click();
await sheet.getByRole('radiogroup', { name: 'Device type' }).getByRole('radio', { name: 'Fixed-value' }).click();
await sheet.getByRole('button', { name: 'Save the check' }).click();
await dp.waitForTimeout(500);
ok((await truth(made.id)).noType === 0, 'R2 set again: every device has a type');
await dp.getByRole('button', { name: 'Add a check' }).click();
await sheet.waitFor();
await sheet.getByLabel('What is checked').fill('Seal-integrity camera');
await sheet.getByLabel('The error it prevents').fill('A pack with an open seal');
await sheet.getByRole('radiogroup', { name: 'Device type' }).getByRole('radio', { name: 'Contact' }).click();
await sheet.getByRole('radiogroup', { name: 'Device function' }).getByRole('radio', { name: 'Warning' }).click();
await sheet.getByLabel('What passes').fill('A pack with a gap in the seal is presented and the light comes on');
await sheet.getByRole('button', { name: 'Add the check' }).click();
await dp.waitForTimeout(500);
t = await truth(made.id);
ok(t.devices === 8 && t.byType.contact === 3 && t.byFunction.warning === 2 && t.says.startsWith('8 devices — 3 contact · 2 fixed-value · 3 motion-step; 6 control · 2 warning'), 'R2 a new device is the 8th: contact 3, warning 2', t.says);
await dp.reload(); await dp.locator('.lg-figs').waitFor(); await tab(dp, 'The checks'); await dp.locator('.lg-register').waitFor();
ok(flat(await dp.locator('[data-register-says]').innerText()) === t.says, 'R2 kept after a reload', await dp.locator('[data-register-says]').innerText());
ok(/2 warning devices depend on a person’s reaction/.test(await dp.locator('[data-register-warning]').innerText()), 'R2 the warning rule says 2 warning devices');

/* ============================================================================================ R3 · the round */
await tab(dp, 'Round');
const card = dp.locator('li.lg-card', { hasText: 'Label-presence sensor' });
ok(flat(await card.locator('[data-device]').innerText()) === 'Contact · control — prevents: A pack with no label', 'R3 the Round card says the device’s type, function and error', await card.locator('[data-device]').innerText());
ok(flat(await card.locator('.lg-judged').innerText()) === 'Passes if: A known-bad pack (no label) is presented and the line stops or the pack is rejected', 'R3 and what passes, without those words repeated', await card.locator('.lg-judged').innerText());
ok(!(await dp.locator('li.lg-card', { hasText: 'No device bypassed' }).locator('[data-device]').count()), 'R3 a routine check shows no device line');

/* ============================================================================================ R4 · an older log */
await openChecks(dp, desk.go, made.oldId);
const to = await truth(made.oldId);
ok(to.says === '7 devices — 2 contact · 2 fixed-value · 3 motion-step; 6 control · 1 warning — and 2 routine checks on them.' && to.fromWords === 7, 'R4 the older log reads the same seven devices from its words', to.says + ' / fromWords ' + to.fromWords);
ok(flat(await dp.locator('[data-register-says]').innerText()) === to.says, 'R4 the page says the same');
ok(/7 devices have their type, function or error read from the words of the check/.test(await dp.locator('[data-register-words]').innerText()), 'R4 and says they are read from the words', await dp.locator('[data-register-words]').innerText().catch(() => ''));
ok(flat(await dp.locator('li[data-check-def]', { hasText: 'Date-code reader' }).locator('[data-device]').innerText()) === 'Fixed-value · control — prevents: a missing or wrong date code', 'R4 a device’s line from its words');
await editOf('Date-code reader — prevents a missing or wrong date code').click();
await sheet.waitFor();
ok(await sheet.getByLabel('What passes').inputValue() === 'A known-bad code (blank, wrong date) is presented and the reader rejects the pack', 'R4 editing opens "what passes" without the old words');
await sheet.getByLabel('The error it prevents').fill('A missing, wrong or unreadable date code');
await sheet.getByRole('button', { name: 'Save the check' }).click();
await dp.waitForTimeout(500);
const stored = await dp.evaluate(async id => { const db = await import('/src/db.ts'); const s = await db.getStudy(id); const c = s.agreed.log.checks.find(x => x.name.startsWith('Date-code')); return { type: c.deviceType, fn: c.deviceFunction, error: c.error, criterion: c.criterion }; }, made.oldId);
ok(stored.type === 'fixed-value' && stored.fn === 'control' && stored.error === 'A missing, wrong or unreadable date code' && !/Fixed-value/.test(stored.criterion), 'R4 saving writes the fields and leaves the test in plain words', JSON.stringify(stored));
ok((await truth(made.oldId)).fromWords === 6, 'R4 one device fewer read from words');

/* ============================================================================================ R5 · the paper */
await desk.go(`#/log/mistake-proofing/${made.id}`);
await dp.locator('.lg-figs').waitFor();
const [d] = await Promise.all([dp.waitForEvent('download', { timeout: 60000 }), pressPaper(dp, / — on paper$/)]);
const f = join(OUT, 'device.pdf'); await d.saveAs(f);
const pdf = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
t = await truth(made.id);
ok(pdf.includes('The device register — 8 devices, 2 routine checks'), 'R5 the paper heads the device register with its counts', pdf.slice(0, 400));
ok(pdf.includes(t.says), 'R5 and says the module’s sentence', t.says);
ok(pdf.includes('Error it prevents') && pdf.includes('A short or over-filled case') && pdf.includes('A pack with an open seal'), 'R5 the checks as agreed carry each device’s error');
ok(pdf.includes('Contact · Warning') && pdf.includes('Motion-step · Control') && pdf.includes('A routine check on the devices'), 'R5 with type and function, and the routine checks marked as such');
ok(pdf.includes('2 warning devices depend on a person’s reaction'), 'R5 the warning rule');
ok(!/(^| )undefined( |$)/.test(pdf), 'R5 nothing undefined on the page');

/* ============================================================================================ R6 · client and phone */
const cl = await device(1360, 'client');
await cl.go('#/room');
const sd2 = await cl.page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const clientLog = await cl.page.evaluate(async ([ws, pj]) => {
  const db = await import('/src/db.ts'); const { newLogStudy } = await import('/src/tools/checks/start.ts'); const { defOf } = await import('/src/tools/checks/registry.ts');
  const t = Date.now() - 60_000;
  const s = newLogStudy(defOf('mistake-proofing'), { since: t, now: t, name: 'Device checks — project', workspaceId: ws, projectId: pj, where: 'Wrapper' });
  await db.putStudy(s); return s.id;
}, [sd2.wsId, sd2.projectId]);
await cl.go(`#/log/mistake-proofing/${clientLog}`); await cl.page.locator('.lg-figs').waitFor({ timeout: 15000 });
await tab(cl.page, 'The checks'); await cl.page.locator('.lg-register').waitFor();
ok(flat(await cl.page.locator('[data-register-says]').innerText()) === '7 devices — 2 contact · 2 fixed-value · 3 motion-step; 6 control · 1 warning — and 2 routine checks on them.', 'R6 a client reads the register');
ok(!(await cl.page.getByRole('button', { name: /^(Edit|Take off) — / }).count()) && !(await cl.page.getByRole('button', { name: 'Add a check' }).count()), 'R6 and can edit, take off and add nothing');
await cl.ctx.close();

const ph = await device(390);
await ph.go('#/room');
await ph.page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const phoneLog = await ph.page.evaluate(async () => {
  const db = await import('/src/db.ts'); const { newLogStudy } = await import('/src/tools/checks/start.ts'); const { defOf } = await import('/src/tools/checks/registry.ts');
  const w = await db.createWorkspace('Packing line 15'); const t = Date.now() - 60_000;
  const s = newLogStudy(defOf('mistake-proofing'), { since: t, now: t, name: 'Device checks — phone', workspaceId: w.id, where: 'Wrapper' });
  await db.putStudy(s); return s.id;
});
await ph.go(`#/log/mistake-proofing/${phoneLog}`); await ph.page.locator('.lg-figs').waitFor({ timeout: 15000 });
await tab(ph.page, 'The checks'); await ph.page.locator('.lg-register').waitFor();
ok(await ph.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'R6 the phone: nothing off the side of The checks');
const small = await ph.page.locator('.lg-register .chip').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 43.5).map(e => `${e.textContent} ${Math.round(e.getBoundingClientRect().height)}`));
ok(small.length === 0, 'R6 the phone: every register chip is at least 44 px tall', small.join(', '));
await ph.page.getByRole('button', { name: 'Edit — Guard interlock' }).click();
await ph.page.locator('[data-sheet="check"]').waitFor();
const small2 = await ph.page.locator('[data-sheet="check"] [role="radio"]').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 43.5).map(e => `${e.textContent} ${Math.round(e.getBoundingClientRect().height)}`));
ok(small2.length === 0, 'R6 the phone: the form’s chips are at least 44 px tall', small2.join(', '));
ok(await ph.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'R6 the phone: nothing off the side of the form');

ok(errors.length === 0, 'no console errors', errors.slice(0, 3).join(' | '));
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
