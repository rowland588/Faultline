/* ACCEPTANCE — THE CHARTER IS ONE RECORD, READ BY DMAIC'S DEFINE (knowledge/specs/FC-142-charter.md §10; 1 November 2026 — Rowland: "make FC-142 the
 * tool/record behind it consistently, reading the same answers; do not duplicate storage").
 *
 *   1  the DMAIC project's Define card, with its problem and scope written on the sheet, says there is no charter page yet and offers to start it
 *   2  Start the charter opens /doc/charter in the project (New asks the name); the charter's own boxes OFFER the sheet's words — the problem and the
 *      scope — in one tap each, and taking one copies it into the document only when the person taps (nothing stored twice by itself)
 *   3  the sheet's answer is untouched by that; change it on the sheet and the offer says the new words
 *   4  back on the project, the Define card reads the charter's own sentence and Open lands on the charter's list; the card counts what the sheet wrote
 *   5  a phone: nothing off the side
 *
 *   node scripts/acceptance/charter-define.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp();
const { page, ok, go, words } = t;
const openFolds = async (pg = page) => { for (let n = 0; n < 60; n++) { const f = pg.locator('.doc-form .fold:not(.is-open) .fold-toggle').first(); if (!(await f.count())) break; await f.click(); } }; // a document's sections are folds (docs/DESIGN.md): open them all before reading its boxes
const sd = await t.seed();
const ID = sd.methodProjectIds.dmaic;
const PROBLEM = 'Seal failures on Line 7, 4% of packs since September';
const SCOPE = 'Line 7, the 400 g tray, all shifts; not the film supplier';
const box = q => page.locator('.pmethod-sec[aria-label="Define"] .msheet-f', { has: page.locator('.msheet-q', { hasText: new RegExp('^' + q + '$') }) }).locator('.msheet-in');

/* ---- 1 ---- */
await go(`#/project/${ID}`, 2000);
await page.waitForSelector('.dm', { timeout: 20000 });
await box('The problem statement').fill(PROBLEM); await box('The problem statement').blur();
await box('Scope — in and out').fill(SCOPE); await box('Scope — in and out').blur(); await page.waitForTimeout(700);
const ins = page.locator('#dm-define [data-insert="charter"]');
ok((await ins.count()) === 1 && /no charter page in this project yet/.test(await ins.innerText()), `1 the Define card says there is no charter page yet (${(await ins.innerText()).replace(/\s+/g, ' ')})`);
ok((await ins.getByRole('button', { name: 'Start the charter' }).count()) === 1, '1 …and offers to start it');

/* ---- 2 ---- */
await ins.getByRole('button', { name: 'Start the charter' }).click(); await page.waitForTimeout(1200);
ok(/#\/doc\/charter/.test(page.url()) && page.url().includes(ID), `2 Start opens the charter list in the project (${page.url().split('#')[1]})`);
await page.getByLabel('What is it of?').fill('Line 7 seals — charter');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1600); await openFolds();
const offP = page.locator('[data-offer=problem]'), offS = page.locator('[data-offer=scopeIn]');
ok((await offP.count()) === 1 && (await offP.innerText()).includes('Seal failures on Line 7') && /method sheet/.test(await offP.innerText()), `2 the problem box offers the sheet's words, saying where from (${(await offP.innerText()).slice(0, 110)})`);
ok((await offS.count()) === 1 && /Define’s scope/.test(await offS.innerText()), '2 the scope box offers Define’s scope');
ok((await page.locator('[data-field-input=problem]').inputValue()) === '', '2 nothing was copied by itself — the box is empty until it is tapped');
await offP.click(); await page.waitForTimeout(900);
ok((await page.locator('[data-field-input=problem]').inputValue()) === PROBLEM, '2 one tap puts the words in the document');

/* ---- 3 ---- */
const sheetNow = await page.evaluate(async id => { const D = await import('/src/db.ts'); return (await D.listTestItems(id)).filter(i => i.testId === 'method:dmaic:problem' && !i.deletedAt).map(i => i.what); }, ID);
ok(sheetNow.length === 1 && sheetNow[0] === PROBLEM, '3 the sheet still holds its one answer — the charter copied it only because the person tapped, and the sheet is untouched');
await go(`#/project/${ID}`, 2000);
await page.waitForSelector('.dm', { timeout: 20000 });
await box('The problem statement').fill('Seal failures on Line 7, 5% of packs since October'); await box('The problem statement').blur(); await page.waitForTimeout(800);
await page.locator('#dm-define [data-insert="charter"]').getByRole('button', { name: /^Open Documents/ }).click(); await page.waitForTimeout(1500);
await page.getByText('Line 7 seals — charter', { exact: true }).first().click(); await page.waitForTimeout(1800); await openFolds();
const again = page.locator('[data-offer=problem]');
ok((await again.count()) === 1 && (await again.innerText()).includes('5% of packs since October'), '3 change the sheet and the offer says the new words (it is read, not copied)');

/* ---- 4 ---- */
await go(`#/project/${ID}`, 2000);
await page.waitForSelector('.dm', { timeout: 20000 });
const insA = page.locator('#dm-define [data-insert="charter"]');
ok(/Line 7 seals — charter/.test(await insA.innerText()) && /Still to fill in/.test(await insA.innerText()), `4 the Define card reads the charter's own words, saying what is still to fill in (${(await insA.innerText()).replace(/\s+/g, ' ').slice(0, 160)})`);
await insA.getByRole('button', { name: /^Open Documents/ }).click(); await page.waitForTimeout(1200);
ok(/#\/doc\/charter/.test(page.url()) && page.url().includes(ID), '4 Open lands on the charter list in the project');

/* ---- 5 ---- */
await page.setViewportSize({ width: 390, height: 780 });
await go(`#/project/${ID}`, 2000);
ok((await t.wide()) <= 1, `5 the phone: nothing off the side (${await t.wide()})`);
await t.finish('the charter is one record: DMAIC’s Define reads it and offers its words, nothing stored twice');
