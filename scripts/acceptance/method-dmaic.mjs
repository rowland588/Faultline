/* ACCEPTANCE — DMAIC'S OWN BOARD AND PAPER (docs/METHODS.md §16; ISO 13053-1 — Rowland, 1 November: "build the method and insert the
 * tools where required").
 *
 *   1  the questions: Define asks the charter (problem statement … risks), each phase its own, the new ones among them
 *   2  the board: a gate strip of five phases, each in words; the charter block
 *   3  a review per phase: who, when, what it decided — kept after a reload, the strip and the sentence following
 *   4  the charter written — the block shows it; a held review says the next phase waits (never locked)
 *   5  the tools fall in: the seeded capability study's own sentence under Measure, a missing one offered to start
 *   6  the Charter paper downloaded and read back against the answers and the reviews
 *   7  a client reads and writes nothing
 *   8  a phone: nothing off the side, the controls 44 px
 *
 *   node scripts/acceptance/method-dmaic.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go, words } = t;
const sd = await t.seed();
const ID = sd.methodProjectIds.dmaic;
const mod = await page.evaluate(async () => { const M = await import('/src/lib/methodSheet.ts'); return { define: M.fieldsOf('dmaic', 'Define').map(f => f.label), measure: M.fieldsOf('dmaic', 'Measure').map(f => f.label), analyse: M.fieldsOf('dmaic', 'Analyse').map(f => f.label), control: M.fieldsOf('dmaic', 'Control').map(f => f.label) }; });

/* ---- 1 the questions ---- */
await go(`#/project/${ID}`, 2000);
await page.waitForSelector('.dm', { timeout: 20000 });
const asked = name => page.locator(`.pmethod-sec[aria-label="${name}"] .msheet-q`).allInnerTexts();
ok(JSON.stringify(await asked('Define')) === JSON.stringify(mod.define), `1 Define asks the charter — ${mod.define.length} questions`);
ok(['The problem statement', 'The business case — what it is worth', 'The team and its roles', 'The timeline — a date for each phase review', 'Risks, constraints and assumptions'].every(q => mod.define.includes(q)), '1 the charter has the problem statement, business case, team, timeline and risks');
ok(mod.measure.includes('The data collection plan') && mod.analyse.includes('What was tested, and what the test said') && mod.control.includes('The benefit confirmed'), '1 each later phase asks what its practitioner asks (data plan, tests, benefit confirmed)');

/* ---- 2 the board ---- */
const gate = k => page.locator(`.dm-gate[data-phase="${k}"]`);
const names = await page.locator('.dm-gate b').allInnerTexts();
ok(JSON.stringify(names) === JSON.stringify(['1. Define', '2. Measure', '3. Analyse', '4. Improve', '5. Control']), '2 the gate strip: Define, Measure, Analyse, Improve, Control in order');
ok(/Not started/.test(await gate('define').innerText()), '2 an empty phase says “Not started” in words');
ok(/0 of 5 phase reviews passed/.test(await words('.dm-says')), `2 the strip says it (${await words('.dm-says')})`);

/* ---- 3 a review per phase ---- */
const card = k => page.locator(`#dm-${k}`);
await card('define').getByLabel('Define review — who').fill('Tanya (sponsor)'); await card('define').getByLabel('Define review — who').blur();
await card('define').getByLabel('Define review — when').fill('2026-11-14');
await card('define').getByRole('button', { name: 'Passed with conditions' }).click();
await card('define').getByLabel('Define review — note').fill('Goal to be restated in packs a minute'); await card('define').getByLabel('Define review — note').blur();
await page.waitForTimeout(700);
await go(`#/project/${ID}`, 2000);
ok((await card('define').getByLabel('Define review — who').inputValue()) === 'Tanya (sponsor)' && (await card('define').getByLabel('Define review — when').inputValue()) === '2026-11-14', '3 who and when are kept after a reload');
ok((await card('define').getByRole('button', { name: 'Passed with conditions' }).getAttribute('aria-pressed')) === 'true', '3 what it decided is kept');
ok(/Passed with conditions/.test(await gate('define').innerText()) && /14 Nov 2026/.test(await gate('define').innerText()), '3 the strip says Passed with conditions and the day');
ok(/1 of 5 phase reviews passed/.test(await words('.dm-says')) && (await gate('measure').getAttribute('aria-current')) === 'step', `3 the sentence moves on; Measure is the phase in hand (${await words('.dm-says')})`);
await card('measure').getByLabel('Measure review — who').fill('Rob Scott'); await card('measure').getByLabel('Measure review — who').blur();
await card('measure').getByRole('button', { name: 'Held' }).click(); await page.waitForTimeout(600);
ok(/Held/.test(await gate('measure').innerText()) && /Measure was held/.test(await card('analyse').innerText()), '4 a held review is said, and Analyse says it waits — nothing is locked');
ok((await card('analyse').getByLabel('Analyse review — who').isEnabled()) && (await page.locator('.pmethod-sec[aria-label="Analyse"] .msheet-in').first().isEnabled()), '4 the next phase can still be worked');

/* ---- 4 the charter ---- */
const box = q => page.locator('.pmethod-sec[aria-label="Define"] .msheet-f', { has: page.locator('.msheet-q', { hasText: new RegExp('^' + q + '$') }) }).locator('.msheet-in');
await box('The problem statement').fill('Seal failures on Line 7, 4% of packs since September'); await box('The problem statement').blur(); await page.waitForTimeout(600);
ok((await words('#dm-define .dm-charter')).includes('Seal failures on Line 7, 4% of packs since September') && /Not written yet/.test(await words('#dm-define .dm-charter')), '4 the charter block shows what is written and names what is not');
await box('The timeline — a date for each phase review').fill('Define 14 Nov, Measure 28 Nov'); await box('The timeline — a date for each phase review').blur(); await page.waitForTimeout(600);

/* ---- 5 tools fall in ---- */
const base = card('measure').locator('[data-insert="baseline"]');
ok((await base.count()) === 1 && /Seal temperature — jaw 2/.test(await base.innerText()), `5 the capability study’s own sentence is under the baseline (${(await base.innerText()).replace(/\s+/g, ' ').slice(0, 120)})`);
await base.getByRole('button', { name: /^Open Capability/ }).click(); await page.waitForTimeout(1200);
ok(/capability/.test(page.url()) && page.url().includes(ID), '5 Open lands on the tool in the project');
await go(`#/project/${ID}`, 2000);
const ctl = card('control').locator('[data-insert="hold"]');
ok(/no Control chart study in this project yet/.test(await ctl.innerText()), '5 no chart yet: said, never invented');
await ctl.getByRole('button', { name: /^Start Control chart/ }).click(); await page.waitForTimeout(1200);
ok(/chart/.test(page.url()) && page.url().includes(ID), '5 Start opens the chart in the project — nothing was required first');

/* ---- 6 the paper ---- */
await go(`#/project/${ID}`, 2000);
const { pageHeaderPress } = await import('../lib/pageHeader.mjs').catch(() => ({}));
const press = async () => { if (pageHeaderPress) await pageHeaderPress(page, 'Charter'); else { const b = page.getByRole('button', { name: /^Charter$/ }); if (await b.count()) await b.first().click(); else { await page.getByRole('button', { name: /Report/ }).first().click(); await page.getByRole('menuitem', { name: /Charter/ }).or(page.getByRole('button', { name: /Charter/ })).first().click(); } } };
const txt = await t.pdfText(press, 'charter');
for (const s of ['Charter', 'Seal failures on Line 7, 4% of packs since September', 'Define 14 Nov, Measure 28 Nov', 'The phase reviews', 'Passed with conditions', 'Tanya (sponsor)', '14 Nov 2026', 'Goal to be restated in packs a minute', 'Held', 'Rob Scott', 'Not written yet', 'Seal temperature']) ok(txt.includes(t.norm(s)), `6 the Charter says “${s}”`);
ok(!/\bjob\b|\bOEE\b/i.test(txt), '6 none of the old words');

/* ---- 7 a client ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await page.reload(); await page.waitForTimeout(2500);
{ const n = await card('define').locator('input, textarea, button.chip').count(); const said = await words('#dm-define'); ok(n === 0 && /Review: Passed with conditions — Tanya \(sponsor\), 14 Nov 2026/.test(said), `7 a client reads the review and writes nothing (${n} controls) — ${said.slice(-120)}`); }
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- 8 a phone ---- */
await page.setViewportSize({ width: 390, height: 800 }); await go(`#/project/${ID}`, 2000);
ok((await t.wide()) <= 1, `8 on a phone nothing is off the side (${await t.wide()}px over)`);
const small = await page.locator('.dm button, .dm input').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 43 && e.getBoundingClientRect().height > 0).length);
ok(small === 0, `8 every control on the board is 44 px (${small} smaller)`);

await t.finish('DMAIC accepted: the charter and its questions, the five-phase gate strip with a review each kept, tools falling in, the Charter read back, a client reads only, a phone fits');
