/* FC-153 — STRATIFICATION, driven (knowledge/specs/FC-153-stratification.md, acceptance criteria 1–9; 1 November 2026): the question asked first
 * — where does the problem live? — rejects split by shift and product from the record's worked case (rca.stratification), the sentence, the
 * tiles, the tables and the two factors together read on the page against the module (src/tools/analysis/strat.ts) and against SciPy's literals
 * (scripts/knowledge/cases-m6-analysis.py); money only when what a reject costs is given; the honest minimum-count rule; a measured split (three
 * shifts' give-away); the paper downloaded and read back; kept after a reload; the phone.
 *
 *   1  the question offered among the others, a half-made agreement refused in words
 *   2  counted: four records pasted (the rows of a sheet) — Shift and Product split, the sentence, the tiles, the grids, the cell that stands out
 *   3  a record added by the chips and the boxes, a record struck and restored, rows that cannot be used listed
 *   4  money — named missing while what a reject costs is not given, then the excess in pounds
 *   5  the honest rule — three lines with 3, 2 and 9 rejected: the χ² is not trusted and no place is named; a place with 4 rejected never named
 *   6  measured: three shifts' give-away — F, η², the shift that stands out
 *   7  the paper, read back: the sentence, the tables, the splits tried, every record
 *   8  kept after a reload; a client changes nothing is held by the shared access tests; the phone — nothing off the side, controls a thumb's size
 *
 * Fails on any console error.   node scripts/acceptance/strat.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'acceptance-'));

const SHIFT_PRODUCT = 'Day, A, 24000, 120\nDay, B, 16000, 80\nNight, A, 24000, 230\nNight, B, 16000, 90';
const LINES = 'L1, 900, 3\nL2, 800, 2\nL3, 700, 9';
const A = [1.2, 0.9, 1.4, 1.1, 1.0, 1.3, 0.8, 1.2], B = [1.6, 1.9, 1.4, 1.8, 2.1, 1.5, 1.7, 1.6], C = [1.1, 1.3, 0.9, 1.2, 1.4, 1.0, 1.2, 1.1];
const SHIFTS = [...A.map(v => `A, ${v}`), ...B.map(v => `B, ${v}`), ...C.map(v => `C, ${v}`)].join('\n');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text()) && !/same key/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${extra}` : ''}`); if (!c) failed++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2000); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const all = async sel => (await page.locator(sel).allInnerTexts()).map(flat);
const studyId = () => decodeURIComponent(page.url().split('/analysis/')[1]?.split('?')[0] ?? '');
const pdf = async name => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, name); await d.saveAs(f);
  return flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
};
const truth = id => page.evaluate(async sid => {
  const { getStudy } = await import('/src/db.ts'); const A = await import('/src/tools/analysis/analysis.ts');
  const s = await getStudy(sid); const a = s.agreed?.analysis; const f = A.analysisFigures(a, s.facts.readings ?? []); const said = A.analysisSays(f, a);
  return { said, tiles: A.analysisTiles(f, a).map(t => [t.k, t.v]), closing: A.analysisClosing(f, a, said).text, grids: A.analysisGrids(f, a).map(g => g.label), checks: f.checks.map(c => c.say), lanes: A.analysisPicture(f, a).length, f: { lead: f.lead?.factor, unusable: f.unusable } };
}, id);
const start = async what => {
  await go('#/analysis');
  await page.getByRole('button', { name: 'New analysis' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(what);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  return studyId();
};
const agree = async ({ data, factors, name, unit, cost }) => {
  await page.getByRole('radio', { name: /Where does the problem live/ }).click();
  if (data) await page.getByRole('radio', { name: new RegExp(`^${data}`) }).click();
  await page.getByLabel('The factors', { exact: true }).fill(factors);
  await page.getByLabel('What is measured').fill(name);
  if (unit) await page.getByLabel('Unit', { exact: false }).first().fill(unit);
  if (cost) await page.getByLabel('What one reject costs').fill(cost);
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
};
const pasteRecords = async text => { await page.getByLabel('Paste records').fill(text); await page.getByRole('button', { name: 'Add these records' }).click(); await page.waitForTimeout(700); };
const sameAsModule = async (t, tag) => {
  const say = await words('.ie-say');
  const tiles = flat(await page.locator('.ie-strip').innerText());
  ok(say === t.said.text && t.tiles.every(([, v]) => tiles.includes(flat(String(v)))) && (await words('.ln-close'))?.includes(t.closing.slice(0, 25)), `${tag}: "${say?.slice(0, 140)}${say && say.length > 140 ? '…' : ''}" — the tiles and closing line as the module says them`);
};

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);

/* ---- 1 · the question, and a refusal ---- */
let rejects;
{
  rejects = await start('Rejects — October');
  const kinds = await all('[role=radiogroup][aria-label="What do you want to know?"] .ie-kind');
  ok(kinds.some(k => /^Where does the problem live — which shift, line, machine or product\?/.test(k)), `1 the question is among the others: ${kinds.length} offered`);
  await page.getByRole('radio', { name: /Where does the problem live/ }).click();
  await page.getByLabel('The factors', { exact: true }).fill('');
  await page.getByLabel('What is measured').fill('Rejects');
  ok(/one to 4 names/.test((await words('.ie-problem')) ?? ''), `1 no factor — refused, said why: "${await words('.ie-problem')}"`);
  await page.getByLabel('The factors', { exact: true }).fill('Shift, shift');
  ok(/same name/.test((await words('.ie-problem')) ?? ''), '1 two factors of one name — refused');
  ok((await page.getByRole('group', { name: 'Factors to split by' }).getByRole('button').count()) === 5, '1 the five usual factors offered as chips — shift, line, machine, product, supplier');
  await page.getByLabel('The factors', { exact: true }).fill('Shift, Line');
  await page.getByRole('group', { name: 'Factors to split by' }).getByRole('button', { name: 'Shift' }).click();
  ok(/^Line$/.test(await page.getByLabel('The factors', { exact: true }).inputValue()), '1 a chip tapped off takes its factor out of the list');
  await page.getByRole('group', { name: 'Factors to split by' }).getByRole('button', { name: 'Product' }).click();
  ok(/^Line, Product$/.test(await page.getByLabel('The factors', { exact: true }).inputValue()), '1 a chip tapped on puts its factor in');
}

/* ---- 2 · counted, the record's worked case ---- */
{
  await page.getByLabel('The factors', { exact: true }).fill('Shift, Product');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  ok(/Nothing counted yet/.test((await words('.ie-say')) ?? ''), `2 agreed with nothing counted: "${await words('.ie-say')}"`);
  await pasteRecords(SHIFT_PRODUCT);
  const t = await truth(rejects);
  await sameAsModule(t, '2 the worked case');
  const say = await words('.ie-say');
  ok(/Rejects by shift: we can be 95% confident the problem is not spread evenly \(χ² 27\.9 on 1 degree of freedom, p < 0\.0001; Cramér’s V 0\.02\)\. Night carries 62% of the rejects from 50% of what was made: 0\.80% \(320 of 40,000\) against 0\.50% for the rest\./.test(say ?? ''), '2 the sentence, as SciPy’s figures say it (χ² 27.8735, V 0.01867, residual 3.72)');
  ok(/Lives in Night/.test((await words('.ln-band')) ?? '') && (await page.locator('.ie-say.is-a').count()) === 1, '2 the band says where it lives, in amber — never red');
  const more = (await all('.ie-more')).join(' | ');
  ok(/Product: shows a difference \(χ² 11\.6 on 1 degree of freedom, p = 0\.0006/.test(more) && /Together: Night on A stands out — 0\.96% \(230 of 24,000\) against 0\.52% for everything else\./.test(more), `2 the other factor and the two together: ${more.slice(0, 220)}`);
  ok(/Give what one reject costs/.test(more), '2 the money’s missing input named, nothing invented');
  ok((await page.locator('.ie-strip .ln-tile').count()) === 5, '2 five tiles');
  ok(JSON.stringify(t.grids) === JSON.stringify(['Every split tried', 'By shift', 'By product', 'Together — Shift × Product']), `2 the tables: ${t.grids.join(' · ')}`);
  const cross = await all('.ie-grid[aria-label^="Together"] tbody tr');
  ok(cross.length === 2 && /Night.*0\.96% · 230\/24,000 — stands out/.test(cross[1]) && /Day.*0\.50% · 120\/24,000/.test(cross[0]), `2 the cells: ${cross.join(' | ')}`);
  const byShift = await all('.ie-grid[aria-label="By shift"] tbody tr');
  ok(/Night 40,000 320 0\.80%/.test(byShift[1]) && /62%/.test(byShift[1]) && /more — stands out/.test(byShift[1]), `2 the split by shift: ${byShift[1]}`);
  ok((await page.locator('.ie-an-pic g').count()) >= 2 && t.lanes === 2, '2 the picture: a lane a place with its interval');
  const checks = (await all('.ie-check')).join(' | ');
  ok(/Splits tried: 2 \(Shift, Product\) and 4 cells together/.test(checks), `2 the splits counted, the level divided: ${checks.slice(0, 200)}`);
}

/* ---- 3 · a record by the chips, struck and restored, rows that cannot be used ---- */
{
  ok(/^Pick a level of each: Shift, Product$/.test((await words('.ie-cap-box > .btn-primary')) ?? ''), `3 no level picked: the button says what is missing ("${await words('.ie-cap-box > .btn-primary')}")`);
  await page.getByLabel('New shift').fill('Weekend'); await page.getByRole('button', { name: 'Add the shift' }).click();
  await page.getByLabel('New product').fill('A'); await page.getByRole('button', { name: 'Add the product' }).click();
  await page.getByRole('textbox', { name: 'Made', exact: true }).fill('1000'); await page.getByRole('textbox', { name: 'Rejected', exact: true }).fill('1001');
  ok(await page.getByRole('button', { name: 'Add the record' }).isDisabled(), '3 more rejected than made — held');
  await page.getByRole('textbox', { name: 'Rejected', exact: true }).fill('9'); await page.getByRole('button', { name: 'Add the record' }).click(); await page.waitForTimeout(600);
  const n = await page.evaluate(async sid => { const { getStudy } = await import('/src/db.ts'); const s = await getStudy(sid); return s.facts.readings.length; }, rejects);
  ok(n === 5, `3 the record added with its tags: ${n} on the study`);
  await page.locator('.ie-readings summary').click();
  ok(/Shift Weekend · Product A: 9 of 1000/.test((await all('.ie-rows li')).at(-1) ?? ''), '3 the record worded in the list');
  await page.getByRole('button', { name: 'Strike reading 5' }).click(); await page.waitForTimeout(500);
  const t1 = await truth(rejects); ok(!t1.said.text.includes('Weekend') && /Night carries 62%/.test(t1.said.text), '3 struck: left out of every figure');
  await page.getByRole('button', { name: 'Restore reading 5' }).click(); await page.waitForTimeout(500);
  await page.getByLabel('Paste records').fill('Day, A, 100\nNight, A, 10, 99999\nx'); await page.getByRole('button', { name: 'Add these records' }).click(); await page.waitForTimeout(600);
  ok(/Left out — not 4 cells/.test((await words('.ie-problem')) ?? ''), `3 rows that are not records are listed, not dropped: "${await words('.ie-problem')}"`);
  await page.getByRole('button', { name: 'Strike reading 5' }).click(); await page.waitForTimeout(400);
}

/* ---- 4 · money ---- */
{
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(300);
  await page.getByLabel('What one reject costs').fill('0.6');
  await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
  const more = (await all('.ie-more')).join(' | ');
  ok(/had Night run at the rate of the rest, there would be about 120 fewer rejects in these records — about £72 at £0\.60 each/.test(more), `4 the excess in pounds: ${more.match(/In money[^|]*/)?.[0]}`);
  const t = await truth(rejects); await sameAsModule(t, '4 with the cost given');
}

/* ---- 5 · the honest minimum-count rule ---- */
{
  const lines = await start('Rejects by line');
  await agree({ factors: 'Line', name: 'Rejects' });
  await pasteRecords(LINES);
  const say = await words('.ie-say');
  ok(/cannot place the problem in one line/.test(say ?? '') && /Not in one place/.test((await words('.ln-band')) ?? ''), `5 three small counts: no place named — "${say?.slice(0, 160)}"`);
  const checks = (await all('.ie-check')).join(' | ');
  ok(/counts too small — 33% of the cells expect fewer than 5 \(the smallest 4\.1\)/.test(checks) && /not to be trusted/.test(checks), `5 the χ² not trusted, said: ${checks.slice(0, 200)}`);
  const row = (await all('.ie-grid[aria-label="By line"] tbody tr')).join(' | ');
  ok(/L1.*too few to judge/.test(row) && /L2.*too few to judge/.test(row) && /L3.*more(?! — stands out)/.test(row) && !/stands out/.test(row), `5 no place named “stands out”: ${row.slice(0, 200)}`);
  await page.getByLabel('Paste records').fill('L1, 5000, 100\nL2, 5000, 105\nL3, 40, 4');
  await page.getByRole('button', { name: 'Add these records' }).click(); await page.waitForTimeout(700);
  const t = await truth(lines);
  ok(!/Lives in L3/.test(t.said.verdict), `5 a place with 4 rejected is never named: ${t.said.verdict}`);
}

/* ---- 6 · measured ---- */
let shifts;
{
  shifts = await start('Give-away by shift');
  await agree({ data: 'Measured', factors: 'Shift', name: 'Give-away', unit: 'g' });
  await pasteRecords(SHIFTS);
  const t = await truth(shifts);
  await sameAsModule(t, '6 three shifts’ give-away');
  const say = await words('.ie-say');
  ok(/Give-away by shift: we can be 95% confident the shifts differ \(F 21\.9 on 2 and 21 degrees of freedom, p < 0\.0001; η² 0\.68 — 68% of the variation is between them\)\. B is above every other: mean 1\.70 g against 1\.13 g for the rest\./.test(say ?? ''), '6 the sentence, as SciPy’s figures say it (F 21.9291, p 7.2e-6, η² 0.67622)');
  ok(/B stands out/.test((await words('.ln-band')) ?? ''), '6 the band');
  const rows = await all('.ie-grid[aria-label="By shift"] tbody tr');
  ok(rows.length === 3 && /B 8 1\.70 g.*above all — stands out/.test(rows[1]) && !/stands out/.test(rows[0] + rows[2]), `6 B alone stands out: ${rows[1]}`);
}

/* ---- 7 · on paper ---- */
{
  const text = await pdf('strat-measured.pdf');
  const t = await truth(shifts);
  ok(text.includes(flat(t.said.text).slice(0, 60)) && /Every split tried/i.test(text) && /By shift/i.test(text) && /Agreed: Give-away — where it lives/.test(text) && /measured, split by Shift/.test(text) && /Every record, in the order taken/i.test(text) && /Shift B: 1\.6 g/.test(text), '7 the measured study on paper: the sentence, the tables, what was agreed, every record');
  await go(`#/analysis/${rejects}`);
  const text2 = await pdf('strat-counted.pdf');
  ok(/Together — Shift × Product/i.test(text2) && /0\.96% · 230\/24,000 — stands out/.test(text2) && /Splits tried: 2 \(Shift, Product\)/.test(text2) && /Lives in Night/.test(text2), '7 the counted study on paper: the two together, the splits tried, the verdict');
  ok(/Shift Day · Product A: 120 of 24000/.test(text2), '7 every record worded as the screen words it');
}

/* ---- 8 · kept, and the phone ---- */
{
  await go(`#/analysis/${rejects}`);
  const t = await truth(rejects); await sameAsModule(t, '8 after a reload');
  await go('#/analysis');
  const row = flat(await page.locator(`.lt-li[data-study="${rejects}"]`).innerText());
  ok(/where it lives/.test(row) && /Lives in Night/.test(row) && /4 records/.test(row), '8 the list’s row: its question, verdict and what was typed', row);
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/analysis/${rejects}`);
  ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '8 the phone: nothing off the side');
  const small = await page.evaluate(() => [...document.querySelectorAll('.ie-cap-box button, .ie-cap-box input')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).map(e => `${e.tagName} ${e.getAttribute('aria-label') ?? e.textContent?.slice(0, 20)} ${Math.round(e.getBoundingClientRect().height)}px`));
  ok(small.length === 0, `8 the phone: every control in the entry a thumb’s size`, small.slice(0, 4).join(' | '));
}

await browser.close();
ok(!errors.length, errors.join('; ') || 'No console errors');
process.exit(failed ? 1 : 0);
