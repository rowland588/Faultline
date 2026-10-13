/* ACCEPTANCE — YOUR FACTORY: THE BACKBONE (docs/BUILD.md, Your factory).
 *
 * Rowland, 13 October: "build a stronger backbone ... a factory setup before
 * the new projects ... your production lines. So then we were able to assign
 * everything to a production line ... Next time I go on, I should be able to
 * go and edit as well, of course, my factory. Build your factory, edit your
 * factory, let me put more lines, change the types, the names of the lines.
 * Again, always full edit control." Driven in a real browser from an empty
 * device:
 *
 *   1  the control room: Your factory first, none yet — set it up first; the
 *      rail's Set up your factory
 *   2  three lines added one after another, the type kept for the next
 *   3  the factory in words — "3 lines · 2 Packing · 1 Processing" — and the
 *      lines in the order added
 *   4  a name typed over, a type typed over — each said saved
 *   5  a line moved up — the order kept after a reload
 *   6  the control room: Your factory above the jobs, the lines in floor
 *      order with their types; the rail the same
 *   7  a line's own page: its type under its name; Edit the line — name and
 *      type changed there, and the factory says so
 *   8  its paper named with its type
 *   9  a line archived — gone from the factory, under Archived lines — and
 *      restored
 *  10  more lines on a factory with lines in it: placed at the end
 *  11-12 on a phone: nothing off the side, on Your factory and the control room
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/factory.mjs      (SMOKE_BASE, as smoke) */
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
page.on('dialog', d => void d.accept());
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
const txt = async () => (await page.locator('.nv-main').innerText()).replace(/\s+/g, ' ');
const rail = async () => (await page.locator('.nv').innerText()).replace(/\s+/g, ' ');
/** the factory's lines, in the order shown: "name|type" */
const order = async () => page.locator('.fac-line').evaluateAll(els => els.map(el => [...el.querySelectorAll('input')].map(i => i.value).join('|')));
const saidSaved = async () => (await page.locator('.fac-saved').innerText().catch(() => '')).trim();

/* 1 — empty: the factory first */
await page.goto(`${BASE}/#/`); await page.waitForTimeout(3500);
const t1 = await txt();
ok(/Your factory/.test(t1) && /Set up your factory first/.test(t1), '1 control room: Your factory, none yet — set it up first');
ok(/YOUR FACTORY Set up your factory/i.test(await rail()), '1b the rail: Your factory › Set up your factory');

/* 2 — three lines, one after another, the type kept for the next */
await page.locator('.nv-main').getByRole('button', { name: 'Set up your factory', exact: true }).click(); await page.waitForTimeout(1200);
ok(/#\/factory/.test(page.url()) && (await page.locator('.fac-add').count()) === 1, `2 Your factory, opened on Add lines: ${page.url().split('#')[1]}`);
const add = async (name, type) => {
  await page.getByLabel("The new line's name").fill(name);
  if (type !== undefined) await page.getByLabel("The new line's type").fill(type);
  await page.getByRole('button', { name: 'Add line', exact: true }).click(); await page.waitForTimeout(900);
};
await add('Line 1', 'Packing');
await add('Line 2');
await add('Line 3', 'Processing');
ok(/Added Line 1, Line 2, Line 3\./.test(await page.locator('.fac-added').innerText()), '2b each one said added; the box clear for the next');
ok((await page.getByLabel("The new line's name").inputValue()) === '' && (await page.getByLabel("The new line's type").inputValue()) === 'Processing', '2c the name box clear, the type kept');
await page.getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(500);

/* 3 — the factory in words, the lines in the order added */
ok((await page.locator('.pl-says').innerText()) === '3 lines · 2 Packing · 1 Processing', `3 the factory says: ${await page.locator('.pl-says').innerText()}`);
ok((await order()).join(' / ') === 'Line 1|Packing / Line 2|Packing / Line 3|Processing', `3b in the order added: ${(await order()).join(' / ')}`);
if (OUT) await page.screenshot({ path: `${OUT}/f-1-factory.png` });

/* 4 — a name and a type typed over */
await page.getByLabel("Line 2's name").fill('Line 2A');
await page.getByLabel("Line 2's name").press('Enter'); await page.waitForTimeout(900);
ok(/Saved — Line 2 is now Line 2A/.test(await saidSaved()), `4 a name typed over, said: ${await saidSaved()}`);
await page.getByLabel("Line 3's type").fill('Filling');
await page.getByLabel("Line 3's type").press('Enter'); await page.waitForTimeout(900);
ok(/Saved — Line 3 is a Filling line/.test(await saidSaved()), `4b a type typed over, said: ${await saidSaved()}`);
ok((await page.locator('.pl-says').innerText()) === '3 lines · 2 Packing · 1 Filling', `4c the factory says: ${await page.locator('.pl-says').innerText()}`);

/* 5 — a line moved up, kept after a reload */
await page.getByRole('button', { name: 'Move Line 3 up' }).click(); await page.waitForTimeout(900);
ok((await order()).join(' / ') === 'Line 1|Packing / Line 3|Filling / Line 2A|Packing', `5 Line 3 moved up: ${(await order()).join(' / ')}`);
await page.reload(); await page.waitForTimeout(2500);
ok((await order()).join(' / ') === 'Line 1|Packing / Line 3|Filling / Line 2A|Packing', `5b kept after a reload: ${(await order()).join(' / ')}`);
ok(await page.getByRole('button', { name: 'Move Line 1 up' }).isDisabled(), '5c the first line cannot go higher');

/* 6 — the control room: the factory above the jobs, in floor order; the rail the same */
await page.goto(`${BASE}/#/`); await page.waitForTimeout(2500);
const cards = await page.locator('.fac-card').evaluateAll(els => els.map(el => `${el.querySelector('.fac-card-name')?.textContent}|${el.querySelector('.fac-card-type')?.textContent}`));
ok(cards.join(' / ') === 'Line 1|Packing / Line 3|Filling / Line 2A|Packing', `6 the control room's Your factory, in floor order: ${cards.join(' / ')}`);
ok(/3 lines · 2 Packing · 1 Filling/.test(await txt()), '6b the control room says the factory');
const firstSec = await page.locator('.nv-main section').first().getAttribute('aria-label');
ok(firstSec === 'Your factory', `6c Your factory is the first thing on the control room (${firstSec})`);
ok(/YOUR FACTORY Your factory Line 1 Line 3 Line 2A/i.test(await rail()), '6d the rail: Your factory, the lines in floor order');
if (OUT) await page.screenshot({ path: `${OUT}/f-2-control.png` });

/* 7 — a line's own page: its type; edited there */
await page.locator('.fac-card', { hasText: 'Line 3' }).click(); await page.waitForTimeout(2000);
ok(/PRODUCTION LINE · FILLING/.test(await page.locator('.pl-eyebrow').innerText()), `7 the line's page says its type: ${await page.locator('.pl-eyebrow').innerText()}`);
await page.getByRole('button', { name: 'Edit the line' }).click(); await page.waitForTimeout(400);
await page.getByLabel("The line's name").fill('Line 3B'); await page.getByLabel("The line's name").press('Enter'); await page.waitForTimeout(900);
await page.getByLabel("The line's type").fill('Packing'); await page.getByLabel("The line's type").press('Enter'); await page.waitForTimeout(900);
ok((await page.locator('h1').innerText()) === 'Line 3B' && /PACKING/.test(await page.locator('.pl-eyebrow').innerText()), `7b edited on its page: ${await page.locator('h1').innerText()} · ${await page.locator('.pl-eyebrow').innerText()}`);
ok(/Saved — a Packing line/.test(await page.locator('.pl-edit .pe-saved').innerText().catch(() => '')), '7c said saved');

/* 8 — its paper named with its type (a problem taken on it first) */
await page.locator('.pl .pace-head-actions').getByRole('button', { name: 'Problem', exact: true }).click(); await page.waitForTimeout(900);
const sheet = page.locator('.sheet, [role="dialog"]').last();
await sheet.locator('textarea').first().fill('Film splice jams at the sealer');
await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1500);
const dir = mkdtempSync(join(tmpdir(), 'factory-'));
const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.locator('.pl .pace-head-actions').getByRole('button', { name: 'Problems report', exact: true }).click()]);
const f = join(dir, 'line.pdf'); await d.saveAs(f);
const paper = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
ok(/Line 3B \(Packing\) — problems/.test(paper) && /Film splice jams/.test(paper), '8 its Problems report is named with its type');

/* 9 — archived, and restored */
await page.goto(`${BASE}/#/factory`); await page.waitForTimeout(2000);
ok((await order()).join(' / ') === 'Line 1|Packing / Line 3B|Packing / Line 2A|Packing', `9 the factory has the page's edit: ${(await order()).join(' / ')}`);
await page.locator('.fac-line[data-line="Line 2A"]').getByRole('button', { name: 'Archive' }).click(); await page.waitForTimeout(1200);
const shelf = (await page.locator('.proj-arch-h').innerText().catch(() => 'no archive')).replace(/\s+/g, ' ');
ok(!(await order()).some(x => x.startsWith('Line 2A|')) && /^Archived lines 1\b/i.test(shelf), `9b Line 2A archived — gone from the factory (${(await order()).join(' / ')}), under ${shelf}`);
await page.getByRole('button', { name: /Archived lines/ }).click(); await page.waitForTimeout(300);
await page.locator('.proj-arch-row', { hasText: 'Line 2A' }).getByRole('button', { name: 'Restore' }).click(); await page.waitForTimeout(1200);
ok((await order()).some(x => x.startsWith('Line 2A|')), '9c and restored');

/* 10 — more lines, placed at the end */
await page.getByRole('button', { name: 'Add lines' }).click(); await page.waitForTimeout(400);
ok((await page.getByLabel("The new line's name").getAttribute('placeholder')) === 'e.g. Line 2B', `10 the next name guessed: ${await page.getByLabel("The new line's name").getAttribute('placeholder')}`);
await add('Line 4', 'Palletising');
await page.getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(500);
ok((await order()).at(-1) === 'Line 4|Palletising' && (await order()).length === 4, `10b placed at the end: ${(await order()).join(' / ')}`);

/* 11-12 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
await page.reload(); await page.waitForTimeout(2000);
const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(wide <= 1, `11 phone, Your factory: nothing off the side (${wide}px)`);
if (OUT) await page.screenshot({ path: `${OUT}/f-3-phone.png`, fullPage: true });
await page.goto(`${BASE}/#/`); await page.waitForTimeout(2000);
const wide2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(wide2 <= 1, `12 phone, the control room: nothing off the side (${wide2}px)`);
if (OUT) await page.screenshot({ path: `${OUT}/f-4-phone-control.png` });

ok(errs.length === 0, `no console errors ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(fail ? `\nYour factory NOT accepted: ${fail} failed` : '\nYour factory accepted: set up first, lines added one after another, named, typed, moved, archived and restored — in floor order on the control room, the rail, the line\'s page and its paper — and the phone');
process.exit(fail ? 1 : 0);
