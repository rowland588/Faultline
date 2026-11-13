/* ACCEPTANCE — YOUR BRAND ON EVERY PAPER (8 November, docs/STORY.md S1; lib/brand, ui/BrandSheet, supabase/BRAND.sql — Rowland: "is
 * the first page our app name and business name and name of consultant"). Driven in a real browser on the smoke seed:
 *
 *   1  the account menu's Your brand: the name and business offered, a strapline, a contact line and a logo given, saved; the row
 *      saying it after a reload (kept on this device; the cloud's copy through set_my_brand when signed in)
 *   2  a paper's foot carries "Rowland Glew · Streamline Synergy" (the problems report, read back)
 *   3  the line's full package cover says who it is for and who prepared it, with the strapline and the contact line
 *   4  the phone: the sheet fits, nothing off the side
 *
 *   node scripts/acceptance/brand.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
await page.evaluate(async id => { const db = await import('/src/db.ts'); const w = (await db.listWorkspaces()).find(x => x.id === id); await db.updateWorkspace({ ...w, clientName: 'Northfield Foods' }); }, sd.wsId);

/* ---- 1 · said once ---- */
await t.go('#/story', 3000);
await page.locator('.acct-btn').click(); await page.waitForTimeout(500);
await page.locator('.sheet-row', { hasText: 'Your brand' }).click(); await page.waitForTimeout(600);
const name = page.getByLabel('Your name', { exact: true }), biz = page.getByLabel('Your business', { exact: true });
ok((await name.inputValue()) === 'Rowland Glew' && (await biz.inputValue()) === 'Streamline Synergy', '1 the sheet offers Rowland Glew · Streamline Synergy');
await page.getByLabel('Strapline').fill('Operational improvement for food manufacturers');
await page.getByLabel('Contact line').fill('rowland@streamlinesynergy.co.uk');
await page.locator('input[aria-label="Choose a logo"]').setInputFiles('public/tools/calc.png'); await page.waitForTimeout(800);
ok((await page.locator('.brand-logo').count()) === 1, '1 a logo chosen is shown');
await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1500);
await page.reload(); await page.waitForTimeout(2500);
await page.locator('.acct-btn').click(); await page.waitForTimeout(500);
ok(/Rowland Glew · Streamline Synergy/.test(await page.locator('.sheet-row', { hasText: 'Your brand' }).innerText()), '1 kept after a reload — the row says Rowland Glew · Streamline Synergy');
await page.keyboard.press('Escape'); await page.waitForTimeout(400);

/* ---- 2 · the foot of a paper ---- */
await t.go(`#/snags?line=${sd.wsId}`, 3000);
const problems = await t.pdfText(() => paper(page, 'Problems report'), 'problems');
ok(/Rowland Glew · Streamline Synergy/.test(problems), '2 the problems report\'s foot says Rowland Glew · Streamline Synergy');

/* ---- 3 · the full package's cover ---- */
await t.go(`#/lines/${sd.wsId}`, 3000);
const dir = mkdtempSync(join(tmpdir(), 'brand-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 300000 }), paper(page, 'Line report — full package', page.locator('.pl'))]);
const file = join(dir, 'package.pdf'); await dl.saveAs(file);
const pkg = t.norm(execFileSync('pdftotext', ['-raw', '-l', '2', file, '-'], { encoding: 'utf8' }));
ok(/For Northfield Foods/.test(pkg) && /Prepared by Rowland Glew, Streamline Synergy/.test(pkg) && /Operational improvement for food manufacturers · rowland@streamlinesynergy\.co\.uk/.test(pkg) && /Made with Faultline/.test(pkg),
  '3 the package\'s cover: For Northfield Foods · Prepared by Rowland Glew, Streamline Synergy · the strapline and contact · Made with Faultline');

/* ---- 4 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await t.go('#/story', 2500);
await page.locator('.acct-btn').click(); await page.waitForTimeout(500);
await page.locator('.sheet-row', { hasText: 'Your brand' }).click(); await page.waitForTimeout(600);
ok((await page.getByLabel('Your name', { exact: true }).isVisible()) && (await t.wide()) <= 1, '4 the phone: the sheet fits, nothing off the side');

await t.finish('Your brand accepted: said once in the account menu, on the foot of every paper and on the full package\'s cover with who it is for.');
