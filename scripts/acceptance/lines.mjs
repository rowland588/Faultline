/* ACCEPTANCE — PRODUCTION LINES: A PLACE OF THEIR OWN (docs/BUILD.md,
 * Production lines).
 *
 * Rowland, 12 October: "I have to open one of the projects to get access to
 * the tools ... I want to just be able to open a production line and use
 * these tools inside the production line ... I need a record of production
 * lines ... make the production lines inside the problem sheet ... Control
 * room, yes, of course, make them from there ... There's a production line,
 * there's a problem, take the picture and move forward with it." Driven in a
 * real browser from an empty device — no project at all:
 *
 *   1  the control room's Your factory, none yet, saying set it up first
 *   2  a line added in Your factory by a name, and opened: its own page
 *   3  the rail's Your factory carrying it
 *   4  its page: no problems, its tools
 *   5  the Problem button on it: the line set, no project
 *   6  the problem on the line's page, open; the line's Problems report and a
 *      card for each problem, from its page
 *   7  tapped: the Problems page on that line, the problem open to work
 *   8-11 a tool opened on the line (Line capacity, SMED): none yet said so,
 *      and New starting on the line
 *  12  the control room: the line, its problem counted
 *  13-14 on a phone: nothing off the side; More lists the line
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/lines.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
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
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
const txt = async () => (await page.locator('.nv-main').innerText()).replace(/\s+/g, ' ');
await page.goto(`${BASE}/#/`); await page.waitForTimeout(3500);
ok(/Your factory/.test(await txt()) && /Set up your factory first/.test(await txt()), '1 control room: Your factory, none yet — set it up first');
/* a line is made in Your factory (13 October), by a name — and opened from there */
await page.locator('.nv-main').getByRole('button', { name: 'Set up your factory', exact: true }).click(); await page.waitForTimeout(1200);
await page.getByLabel("The new line's name").fill('Line 2B');
await page.getByRole('button', { name: 'Add line', exact: true }).click(); await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(500);
await page.locator('.fac-line[data-line="Line 2B"]').getByRole('button', { name: 'Open ›' }).click(); await page.waitForTimeout(2000);
ok(/#\/lines\//.test(page.url()) && (await page.locator('h1').innerText()) === 'Line 2B', `2 made, and on its own page: ${page.url().split('#')[1]}`);
if (OUT) await page.screenshot({ path: `${OUT}/l-1-line.png` });
const rail = (await page.locator('.nv').innerText()).replace(/\s+/g, ' ');
ok(/YOUR FACTORY Your factory Programs Line 2B/i.test(rail), '3 the rail has Your factory, its Programs › Line 2B');
ok(/No problems open/.test(await txt()) && /Tools on this line/.test(await txt()), '4 the line page: no problems, its tools');
// take a problem on it
await page.locator('.pl .pace-head-actions').getByRole('button', { name: 'Problem', exact: true }).click(); await page.waitForTimeout(900);
const sheet = page.locator('.sheet, [role="dialog"]').last();
const lineSel = sheet.locator('label', { hasText: 'LINE' }).locator('select');
const chosen = await lineSel.evaluate(el => el.options[el.selectedIndex]?.text);
const proj = await sheet.locator('label', { hasText: 'PROJECT' }).locator('select').evaluate(el => el.options[el.selectedIndex]?.text);
ok(chosen === 'Line 2B' && proj === 'No project', `5 the Problem sheet: on ${chosen}, ${proj}`);
await sheet.locator('textarea').first().fill('Infeed guard loose on the bagger');
await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1500);
ok(/1 problem open/.test(await txt()) && /Infeed guard loose/.test(await txt()), '6 it is on the line page, open');
if (OUT) await page.screenshot({ path: `${OUT}/l-2-line-problem.png` });
// the line on paper — its report, and a card for each problem open
const dir = mkdtempSync(join(tmpdir(), 'lines-'));
const pdfOf = async (name, file) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.locator('.pl .pace-head-actions').getByRole('button', { name, exact: true }).click()]);
  const f = join(dir, file); await d.saveAs(f);
  return { text: execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' '), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
};
const rep = await pdfOf('Problems report', 'line.pdf');
ok(/Line 2B — problems/.test(rep.text) && /Infeed guard loose on the bagger/.test(rep.text), '6b the line on paper: its Problems report, its problem on it');
const cards = await pdfOf('Report cards', 'line-cards.pdf');
ok(cards.pages === 1 && /Infeed guard loose/.test(cards.text), `6c and a card for each problem open (${cards.pages})`);

// tap it → register filtered, editor open
await page.locator('.pl-row', { hasText: 'Infeed guard loose' }).click(); await page.waitForTimeout(2000);
ok(/#\/snags\?line=/.test(page.url()) && (await page.locator('.pe').count()) === 1 && (await page.locator('.qsl-g .qsl-gh h2').allInnerTexts()).join('|') === 'Line 2B', `7 tapped: the Problems page on Line 2B, the problem open to work`);
// tools
await page.goBack(); await page.waitForTimeout(1500);
await page.locator('.pl-tool', { hasText: 'Line capacity' }).click(); await page.waitForTimeout(2000);
ok(/#\/balances\?line=/.test(page.url()), `8 Line capacity opened on the line: ${page.url().split('#')[1]}`);
await page.getByRole('button', { name: 'New line capacity' }).first().click(); await page.waitForTimeout(800);
const capLine = await page.locator('.sheet, [role="dialog"]').last().locator('select').first().evaluate(el => el.options[el.selectedIndex]?.text);
ok(capLine === 'Line 2B', `9 New line capacity starts on ${capLine}`);
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await page.goto(`${BASE}/#/lines/${page.url().match(/line=([^&]+)/)?.[1] ?? ''}`); await page.waitForTimeout(1500);
await page.locator('.pl-tool', { hasText: 'SMED' }).click(); await page.waitForTimeout(2000);
ok(/#\/smed\?line=/.test(page.url()) && /None on Line 2B yet/.test(await txt()), `10 SMED on the line: none yet, said so`);
await page.getByRole('button', { name: /New SMED|New/ }).first().click(); await page.waitForTimeout(800);
const smedLine = await page.locator('.sheet, [role="dialog"]').last().getByLabel('Which line').evaluate(el => el.options[el.selectedIndex]?.text).catch(() => 'no line box');
ok(smedLine === 'Line 2B', `11 New SMED starts on ${smedLine}`);
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await page.goto(`${BASE}/#/`); await page.waitForTimeout(2500);
ok(/Line 2B No type yet 1 problem open/.test(await txt()), '12 the control room: Line 2B, 1 problem open');
if (OUT) await page.screenshot({ path: `${OUT}/l-3-control.png` });
// phone
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${BASE}/#/lines/${(await page.evaluate(async () => (await (await import('/src/db.ts')).listWorkspaces())[0].id))}`); await page.waitForTimeout(2000);
const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(wide <= 1, `13 phone: nothing off the side (${wide}px)`);
if (OUT) await page.screenshot({ path: `${OUT}/l-4-phone.png` });
await page.getByRole('button', { name: 'More' }).click(); await page.waitForTimeout(800);
ok(/Line 2B/.test(await page.locator('body').innerText()), '14 phone: More lists the line');
if (OUT) await page.screenshot({ path: `${OUT}/l-5-phone-more.png` });
ok(errs.length === 0, `no console errors ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(fail ? `\nProduction lines NOT accepted: ${fail} failed` : '\nProduction lines accepted: made in Your factory, opened on their own, a problem taken on one with no project, its tools opened on it, and the phone');
process.exit(fail ? 1 : 0);
