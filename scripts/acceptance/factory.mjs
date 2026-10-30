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
 *  13-20 the jobs take their lines from the factory: a project started from
 *      a line's page with that line picked and another; its lines the
 *      factory's, each In your factory; a line added from the factory and one
 *      not in it yet (added to the factory); a project's line made before the
 *      factory finding the factory's line of its name, never a second; the
 *      factory row, the line's page and the control room saying the job
 *  24-26 a job archived: its line still in the factory and on every Which
 *      line, no job on its page, and a tool on it wearing the control
 *      room's rail, never the archived job's
 *  27-30 Stage 1: a line's facts on its page (unsaid said so), set up in the
 *      one editor from there, its crew on Your factory and on paper; a line
 *      made twice merged — what moves counted, its problem on the other line,
 *      the emptied one archived
 *  21-23 the factory on paper — one page, the factory in words, every line in
 *      floor order with its type, its jobs and what is open; a tool's Which
 *      line offering the factory in floor order, and a line made there put at
 *      the end of the factory
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/factory.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper as pressPaper, more } from '../lib/pageHeader.mjs';
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
await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3500);
const t1 = await txt();
ok(/Lines/.test(t1) && /Set up your factory first/.test(t1), '1 control room: Lines, none yet — set it up first');
ok(/LINES Set up your factory/i.test(await rail()), '1b the page: Lines › Set up your factory');

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
await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
const cards = await page.locator('.fac-card').evaluateAll(els => els.map(el => `${el.querySelector('.fac-card-name')?.textContent}|${el.querySelector('.fac-card-type')?.textContent}`));
ok(cards.join(' / ') === 'Line 1|Packing / Line 3|Filling / Line 2A|Packing', `6 the control room's Your factory, in floor order: ${cards.join(' / ')}`);
ok(/3 lines · 2 Packing · 1 Filling/.test(await txt()), '6b the control room says the factory');
const firstSec = await page.locator('.nv-main section').first().getAttribute('aria-label');
ok(firstSec === 'Lines', `6c the factory's Lines are the first thing on the control room (${firstSec})`);
/* the rail is the factory's own pages since B2 (docs/STRUCTURE.md §5.2), its lines one tap away in the context bar's switcher — in floor order */
await page.locator('.nv-top .nv-job').click(); await page.waitForTimeout(600);
const swLines = await page.locator('.nv-sw .nv-sw-g').nth(1).locator('.nv-sw-i b').allInnerTexts();
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
ok(/Projects/.test(await rail()) && /Tools/.test(await rail()) && swLines.join(' / ') === 'Line 1 / Line 3 / Line 2A', `6d the rail: Projects and Tools (the lines on the board and Set up, 27 October); the switcher, the lines in floor order (${swLines.join(' / ')})`);
if (OUT) await page.screenshot({ path: `${OUT}/f-2-control.png` });

/* 7 — a line's own page: its type; edited there */
await page.locator('.fac-card', { hasText: 'Line 3' }).click(); await page.waitForTimeout(2000);
ok(/PRODUCTION LINE · FILLING/.test(await page.locator('.pl-eyebrow').innerText()), `7 the line's page says its type: ${await page.locator('.pl-eyebrow').innerText()}`);
await more(page, 'Edit the line'); await page.waitForTimeout(400);
await page.getByLabel("The line's name").fill('Line 3B'); await page.getByLabel("The line's name").press('Enter'); await page.waitForTimeout(900);
await page.getByLabel("The line's type").fill('Packing'); await page.getByLabel("The line's type").press('Enter'); await page.waitForTimeout(900);
ok((await page.locator('h1').innerText()) === 'Line 3B' && /PACKING/.test(await page.locator('.pl-eyebrow').innerText()), `7b edited on its page: ${await page.locator('h1').innerText()} · ${await page.locator('.pl-eyebrow').innerText()}`);
ok(/Saved — a Packing line/.test(await page.locator('.pl-edit .pe-saved').innerText().catch(() => '')), '7c said saved');

/* 8 — its paper named with its type (a problem taken on it first) */
await page.locator('.nv-top .qs-top').click(); await page.waitForTimeout(900);
const sheet = page.locator('.sheet, [role="dialog"]').last();
await sheet.locator('textarea').first().fill('Film splice jams at the sealer');
await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1500);
const dir = mkdtempSync(join(tmpdir(), 'factory-'));
const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), pressPaper(page, 'Problems report', page.locator('.pl'))]);
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
await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2000);
const wide2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(wide2 <= 1, `12 phone, the control room: nothing off the side (${wide2}px)`);
if (OUT) await page.screenshot({ path: `${OUT}/f-4-phone-control.png` });

/* 13-20 — the jobs take their lines from the factory (slice 2) */
await page.setViewportSize({ width: 1360, height: 900 });
const idOf = async name => page.evaluate(async n => (await (await import('/src/db.ts')).listWorkspaces()).find(w => w.name === n && !w.archived)?.id, name);
const line1 = await idOf('Line 1');
await page.goto(`${BASE}/#/lines/${line1}`); await page.waitForTimeout(2000);
ok(/Projects on this line/.test(await txt()) && /No project on this line now/.test(await txt()), '13 a line\'s page: Jobs on this line — none yet, said so');
await page.getByRole('button', { name: 'Start a project on this line ›' }).click(); await page.waitForTimeout(1500);
ok(/#\/projects\?new=1&line=/.test(page.url()), `13b Start a job on this line: ${page.url().split('#')[1].slice(0, 30)}…`);
await page.getByRole('button', { name: /Find and fix what is holding a line back/ }).click(); await page.waitForTimeout(400);
const chip = name => page.getByRole('group', { name: 'Which lines it is on' }).getByRole('button', { name: new RegExp(`^${name}\\b`) });
ok((await chip('Line 1').getAttribute('aria-pressed')) === 'true', '14 the new project: Line 1 already picked, from the factory');
await chip('Line 4').click();
if (OUT) await page.screenshot({ path: `${OUT}/f-6-new-project.png` });
await page.locator('.proj-new').getByLabel('Name').fill('Line 1 performance');
await page.getByRole('button', { name: 'Create and add lines' }).click(); await page.waitForTimeout(2500);
const pid = /#\/project\/([^/?]+)/.exec(page.url())?.[1];
await page.goto(`${BASE}/#/project/${pid}/setup`); await page.waitForTimeout(2500);
const keys = await page.locator('.pset-row .pset-key').allInnerTexts();
ok(keys.join(',') === '1,4', `15 the project's lines are the factory's picked: ${keys.join(',')}`);
ok((await page.locator('.pset-row', { hasText: 'Open pack' }).first().getByRole('button', { name: 'In your factory ›' }).count()) === 1, '15b each says In your factory ›');
/* a line from the factory, and one not in it yet */
await page.getByLabel('Which line of your factory').selectOption({ label: 'Line 3B · Packing' }); await page.waitForTimeout(300);
const filled = [await page.locator('.pset-add').getByPlaceholder('2A', { exact: true }).inputValue(), await page.locator('.pset-add').getByPlaceholder('Line 2A', { exact: true }).inputValue()];
if (OUT) await page.screenshot({ path: `${OUT}/f-7-add-line.png`, fullPage: true });
ok(filled.join('|') === '3B|Line 3B', `16 picked from the factory, its key and name filled: ${filled.join('|')}`);
await page.locator('.pset-add').getByRole('button', { name: 'Add line' }).click(); await page.waitForTimeout(1500);
await page.getByLabel('Which line of your factory').selectOption({ label: 'A line not in the factory yet…' });
await page.locator('.pset-add').getByPlaceholder('2A', { exact: true }).fill('9');
await page.locator('.pset-add').getByPlaceholder('Line 2A', { exact: true }).fill('Line 9');
ok(/added to the factory as it is added here/.test(await page.locator('.pset-add').innerText()), '16b a line not in the factory: said it goes into the factory');
await page.locator('.pset-add').getByRole('button', { name: 'Add line' }).click(); await page.waitForTimeout(1500);
ok((await page.locator('.pset-row .pset-key').allInnerTexts()).join(',') === '1,4,3B,9', `16c the project's lines: ${(await page.locator('.pset-row .pset-key').allInnerTexts()).join(',')}`);
/* a project's line made before the factory finds the factory's line of its name */
await page.evaluate(async p => { const db = await import('/src/db.ts'); await db.addPaceLine({ projectId: p, key: '2A', name: 'Line 2A', sort: 9 }); }, pid);
await page.reload(); await page.waitForTimeout(2500);
await page.locator('.pset-row', { hasText: '2A' }).getByRole('button', { name: 'Time & film' }).click(); await page.waitForTimeout(2000);
const twoA = await page.evaluate(async () => (await (await import('/src/db.ts')).listWorkspaces()).filter(w => w.name === 'Line 2A').length);
ok(twoA === 1, `17 a project's line made before the factory uses the factory's Line 2A — ${twoA} of that name`);
/* the factory, the line's page and the control room say the job */
await page.goto(`${BASE}/#/factory`); await page.waitForTimeout(2000);
ok((await order()).at(-1) === 'Line 9|' && (await order()).length === 5, `18 Line 9 is in the factory, at the end: ${(await order()).join(' / ')}`);
const row1 = page.locator('.fac-line[data-line="Line 1"]');
ok(/on Line 1 performance/.test(await row1.innerText()) && (await row1.getByRole('button', { name: 'Archive' }).count()) === 0, '18b Line 1 says its job, and is not archived from under it');
await page.goto(`${BASE}/#/lines/${line1}`); await page.waitForTimeout(2000);
if (OUT) await page.screenshot({ path: `${OUT}/f-8-line-jobs.png` });
const jobsSec = (await page.getByRole('region', { name: 'Projects on this line' }).innerText()).replace(/\s+/g, ' ');
ok(/Line 1 performance Performance \(6M\)/.test(jobsSec), `19 Line 1's page: its job — ${jobsSec}`);
await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
ok(/Projects: Line 1 performance/.test(await page.locator('.fac-card', { hasText: 'Line 1' }).first().innerText()), '20 the Factory board\'s card: Projects: Line 1 performance');
if (OUT) await page.screenshot({ path: `${OUT}/f-5-control-jobs.png` });

/* 21-23 — the factory on paper; the tools pick from it (slice 3) */
await page.goto(`${BASE}/#/factory`); await page.waitForTimeout(2000);
const [fd] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), pressPaper(page, 'Factory report')]);
const ff = join(dir, 'factory.pdf'); await fd.saveAs(ff);
const fpaper = execFileSync('pdftotext', ['-raw', ff, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const fpages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [ff], { encoding: 'utf8' }))?.[1]);
ok(fpages === 1 && /The factory’s lines/.test(fpaper) && /5 lines · 3 Packing · 1 Palletising · 1 not typed yet/.test(fpaper), `21 Your factory on paper, one page, the factory in words (${fpages} page)`);
const at = n => fpaper.indexOf(n);
ok(at('Line 1 — Packing') >= 0 && at('Line 1 — Packing') < at('Line 3B — Packing') && at('Line 3B — Packing') < at('Line 2A — Packing') && at('Line 4 — Palletising') < at('Line 9'), '21b every line in floor order, with its type');
ok(/On: Line 1 performance/.test(fpaper) && /1 open/.test(fpaper), '21c the jobs on each line, and what is open on it');
/* the lean page (slice 5b, lib/factoryLean): the page's tiles and closing line, word for word on the paper */
const flat = s => s.replace(/\s+/g, '');
const fTiles = await page.locator('.fac .sg-tiles .ln-tile').evaluateAll(ts => ts.map(t => ({ k: t.querySelector('.ln-k')?.textContent ?? '', v: t.querySelector('.ln-v')?.textContent ?? '' })));
const fClose = (await page.locator('.fac .ln-close span:last-child').innerText()).trim();
const fFlat = flat(fpaper);
ok(fTiles.length >= 4 && fTiles.every(x => fFlat.includes(flat(x.k.toUpperCase())) || fFlat.includes(flat(x.k))) && fTiles.every(x => fFlat.includes(flat(x.v))) && fTiles.some(x => x.k === 'A day of the factory') && fFlat.includes(flat(fClose)),
  `21d the page's tiles and closing line on the paper — ${fTiles.map(x => `${x.k} ${x.v}`).join(' · ')} — "${fClose.slice(0, 60)}…"`);
/* a tool's New offers the factory, in floor order; a new line goes into it */
await page.goto(`${BASE}/#/balances`); await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'New line capacity' }).first().click(); await page.waitForTimeout(800);
const sheetSel = page.locator('.sheet, [role="dialog"]').last().locator('select').first();
const opts = await sheetSel.evaluate(el => [...el.options].map(o => o.text));
ok(opts.join(' / ') === 'Line 1 / Line 3B / Line 2A / Line 4 / Line 9 / A new line…', `22 a tool's Which line: the factory, in floor order — ${opts.join(' / ')}`);
await sheetSel.selectOption({ label: 'A new line…' });
await page.locator('.sheet, [role="dialog"]').last().getByPlaceholder('e.g. Line 4').fill('Line 10');
await page.locator('.sheet, [role="dialog"]').last().getByPlaceholder(/Maris Piper/).fill('Rooster 1kg');
await page.locator('.sheet, [role="dialog"]').last().locator('button[type="submit"]').click(); await page.waitForTimeout(2000);
await page.goto(`${BASE}/#/factory`); await page.waitForTimeout(2000);
ok((await order()).at(-1) === 'Line 10|' && (await order()).length === 6, `23 a new line made in a tool is in the factory, at the end: ${(await order()).join(' / ')}`);

/* 24-26 — a job archived: its line stays in the factory; the archived job is nobody's context (13 October:
   "somehow it was aligned to an old project ... archive is causing issues ... once and for all") */
await page.evaluate(async p => { const P = await import('/src/db/projects.ts'); await P.archiveProject(p); }, pid);
await page.goto(`${BASE}/#/factory`); await page.waitForTimeout(2000);
ok((await order()).some(x => x.startsWith('Line 1|')) && !/Line 1 performance/.test(await txt()), `24 Line 1 performance archived: Line 1 still in the factory, the job's name gone from it (${(await order()).length} lines)`);
await page.goto(`${BASE}/#/lines/${line1}`); await page.waitForTimeout(2000);
ok(/No project on this line now/.test(await txt()) && !/Line 1 performance/.test(await rail()), '25 the line\'s page: no job on it now, none on the rail');
await page.goto(`${BASE}/#/w/${line1}/capture`); await page.waitForTimeout(2500);
/* a tool on the line is the line's since B2: the line's own rail, the bar naming the line */
const scopeSays = (await page.locator('.nv-top .nv-ctx .nv-job-l').innerText()).trim();
ok(!/Line 1 performance/.test(await rail()) && /Overview/.test(await rail()) && scopeSays === 'Line 1', `26 a tool on the line wears the line's rail (${scopeSays}), never the archived job's`);
await page.goto(`${BASE}/#/balances`); await page.waitForTimeout(2000);
await page.getByRole('button', { name: 'New line capacity' }).first().click(); await page.waitForTimeout(800);
const opts2 = await page.locator('.sheet, [role="dialog"]').last().locator('select').first().evaluate(el => [...el.options].map(o => o.text));
ok(opts2.includes('Line 1') && !opts2.some(o => /performance/.test(o)), `26b a tool's Which line still offers Line 1 (${opts2.length} lines)`);

/* 27-30 — Stage 1: the factory holds the line's facts; two lines merged (BLUEPRINT §7) */
await page.goto(`${BASE}/#/lines/${line1}`); await page.waitForTimeout(2000);
const facts = async () => (await page.getByRole('region', { name: 'The line', exact: true }).innerText()).replace(/\s+/g, ' ');
ok(/Shifts Not said yet/.test(await facts()) && /Crew and cost Not said yet/.test(await facts()), `27 the line's facts, unsaid, said so: ${(await facts()).slice(0, 90)}`);
await page.getByRole('button', { name: 'Set up the line ›' }).click(); await page.waitForTimeout(900);
const setup = page.locator('.sheet').last();
await setup.locator('input[placeholder="e.g. 6"]').fill('6'); await setup.locator('input[placeholder="e.g. 6"]').press('Tab'); await page.waitForTimeout(500);
await setup.locator('input[placeholder="e.g. 18.50"]').fill('18.5'); await setup.locator('input[placeholder="e.g. 18.50"]').press('Tab'); await page.waitForTimeout(800);
await page.keyboard.press('Escape'); await page.waitForTimeout(800);
ok(/Crew and cost 6 people · £111/.test(await facts()), `27b set up from the line's page, in the one editor: ${(await facts()).match(/Crew and cost [^M]*/)?.[0]}`);
await page.goto(`${BASE}/#/factory`); await page.waitForTimeout(2000);
ok(/6 people/.test(await page.locator('.fac-line[data-line="Line 1"]').innerText()), '28 Your factory says Line 1 has 6 people');
/* a line made twice, merged */
const l9 = await idOf('Line 9'), l10 = await idOf('Line 10');
await page.evaluate(async ws => { const db = await import('/src/db.ts'); const t = Date.now(); await db.addSnag({ id: `sn-dup-${t}`, workspaceId: ws, problem: 'Duplicate line problem — the label printer smudges', status: 'open', raisedAt: t, updatedAt: t, media: [] }); }, l10);
await page.reload(); await page.waitForTimeout(2000);
await page.locator('.fac-line[data-line="Line 10"]').getByRole('button', { name: 'Merge…' }).click(); await page.waitForTimeout(600);
ok(/1 problem/.test(await page.locator('.fac-merge').innerText()) && !/snag/i.test(await page.locator('.fac-merge').innerText()), `29 merging Line 10 counts what moves: ${(await page.locator('.fac-merge .sub').innerText()).slice(0, 110)}`);
await page.getByLabel('The line it goes into').selectOption({ label: 'Line 9' });
await page.locator('.fac-merge').getByRole('button', { name: 'Merge', exact: true }).click(); await page.waitForTimeout(1500);
const after = await page.evaluate(async ({ a, b }) => { const db = await import('/src/db.ts'); const s = (await db.listAllSnags()).find(x => x.problem.startsWith('Duplicate line problem')); const w = (await db.listWorkspaces()).find(x => x.id === b); const arch = (await db.listArchivedWorkspaces()).some(x => x.id === b); return { on: s?.workspaceId === a, arch, gone: !w || w.archived }; }, { a: l9, b: l10 });
ok(after.on && after.arch && !(await order()).some(x => x.startsWith('Line 10|')) && /Line 10 merged into Line 9/.test(await saidSaved()), `29b merged: its problem on Line 9, Line 10 archived and out of the factory — ${await saidSaved()}`);
await page.goto(`${BASE}/#/lines/${l9}`); await page.waitForTimeout(2000);
ok(/Duplicate line problem/.test(await txt()), '29c Line 9\'s page has the problem that was on Line 10');
await page.goto(`${BASE}/#/factory`); await page.waitForTimeout(2000);
const [fd2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), pressPaper(page, 'Factory report')]);
const ff2 = join(dir, 'factory2.pdf'); await fd2.saveAs(ff2);
const fpaper2 = execFileSync('pdftotext', ['-raw', ff2, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
ok(/6 people/.test(fpaper2) && !/Line 10/.test(fpaper2), '30 the factory on paper: Line 1\'s crew, Line 10 merged away');

ok(errs.length === 0, `no console errors ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(fail ? `\nYour factory NOT accepted: ${fail} failed` : '\nYour factory accepted: set up first, lines added one after another, named, typed, moved, archived and restored — in floor order on the control room, the rail, the line\'s page and its paper — the phone, the jobs taking their lines from it, its paper, and the tools picking from it');
process.exit(fail ? 1 : 0);
