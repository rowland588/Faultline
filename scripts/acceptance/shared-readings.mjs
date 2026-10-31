/* Readings shared between the Statistics tools (knowledge/specs/FC-094-shared-readings.md; docs/TOOLS-WORLDS.md W1 — Rowland,
 * 31 October: "shared readings yes ... option A").
 *
 *   1  a capability study of 30 readings (two struck) offers More ▾ › Use these readings in… — the sheet lists the OTHER two
 *      tools, each with what it will do; a count-based study and a lone reading offer none, with their reason
 *   2  Chart these readings — the new chart opens with 28 readings in order, none struck, the limits, unit and nominal carried;
 *      its sentence is the chart module's on those readings; the origin line says where they came from and opens the source
 *   3  the source study is untouched (30 readings, two struck, no copiedFrom)
 *   4  a chart with a unit and no limits copied into Capability: no agreed record — the study asks, the readings are there
 *   5  How sure am I — an analysis of the mean, 95%, its sentence the analysis module's on the same readings
 *   6  the source gaining readings says so on the copy, and changes nothing
 *   7  the copy's paper carries the origin line, read back from the PDF; the source's paper does not
 *   8  the phone — the sheet, its rows at least 44 px, nothing off the side
 *      (a client is not offered it by the same canEdit that withholds Rename — read in ui/StudyActs, not driven here)
 *
 *   node scripts/acceptance/shared-readings.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { more as pressMore, paper as pressPaper } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools|Failed to load resource/i;
const OUT = mkdtempSync(join(tmpdir(), 'acceptance-'));
let fail = 0;
const ok = (c, m, d) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && d ? ` — ${String(d).slice(0, 400)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const mk = async vp => {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: vp, locale: 'en-GB', acceptDownloads: true });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(`console: ${m.text().slice(0, 160)}`); });
  return { ctx, page, errs };
};
const D = await mk({ width: 1360, height: 900 });
const page = D.page;
const go = async h => { await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 5000 }).catch(() => {}); await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2500); };
const getStudy = id => page.evaluate(async i => (await import('/src/db.ts')).getStudy(i), id);
const idOf = (tool) => decodeURIComponent(page.url().split(`/${tool}/`)[1]?.split('?')[0] ?? '');
const pdf = async (name, label) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, label)]);
  const f = join(OUT, name); await d.saveAs(f);
  return flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
};

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const made = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts');
  const line = (await db.listWorkspaces()).find(w => !w.deletedAt && !w.archivedAt);
  const t = Date.now() - 86_400_000;
  const vals = Array.from({ length: 30 }, (_, i) => Number((400 + Math.sin(i * 1.3) * 2.4 + ((i * 7) % 5 - 2) * 0.35).toFixed(2)));
  const readings = vals.map((v, i) => ({ id: uid(), value: v, at: t + i * 60_000, ...(i === 3 || i === 17 ? { struck: true } : {}) }));
  const mkS = (tool, name, agreed, rs) => ({ id: uid(), tool, name, workspaceId: line.id, machine: 'Filler', product: 'Crisps 400 g', agreed, facts: { readings: rs }, uses: [], startedAt: t, createdAt: t, updatedAt: t });
  const cap = mkS('capability', 'Fill weight', { readings: { kind: 'limits', count: 30, unit: 'g', nominal: 400, lower: 395, upper: 405 } }, readings);
  const rej = mkS('capability', 'Rejects by run', { readings: { kind: 'rejects', count: 6 } }, readings.slice(0, 6));
  const one = mkS('chart', 'Lone reading', { chart: { kind: 'xmr', name: 'Lone' } }, readings.slice(0, 1));
  const chartNoLimits = mkS('chart', 'Seal temperature', { chart: { kind: 'xmr', name: 'Seal temperature', unit: '°C' } }, readings.map(r => ({ ...r, id: uid(), value: r.value - 215 })));
  for (const s of [cap, rej, one, chartNoLimits]) await db.putStudy(s);
  return { cap: cap.id, rej: rej.id, one: one.id, chart: chartNoLimits.id, line: line.id, n: readings.filter(r => !r.struck).length, values: readings.filter(r => !r.struck).map(r => r.value) };
});

/* 1 */
await go(`#/capability/${made.cap}`);
await pressMore(page, 'Use these readings in…');
const sheet = page.locator('[data-sheet="share-readings"]');
await sheet.waitFor({ timeout: 10000 });
const targets = await sheet.locator('.sr-opt').evaluateAll(es => es.map(e => ({ t: e.getAttribute('data-target'), text: e.innerText.replace(/\s+/g, ' ') })));
ok(JSON.stringify(targets.map(x => x.t)) === JSON.stringify(['chart', 'analysis']), '1 the sheet offers the other two tools, never its own', JSON.stringify(targets.map(x => x.t)));
ok(targets.every(x => /Chart these readings|How sure am I/.test(x.text) && x.text.length > 40), '1 each says what it will do');
ok(/28 readings/.test(flat(await sheet.innerText())) && /struck ones are left behind/.test(flat(await sheet.innerText())), '1 the sheet says how many travel and that struck ones are left');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
await go(`#/capability/${made.rej}`);
await page.locator('.part-menu-b', { hasText: /^More/ }).first().click();
const item = page.getByRole('menuitem').filter({ hasText: /Use these readings in/ }).first();
ok(await item.isDisabled() && /counts or passes/.test(await item.innerText()), '1 a count-based study: the item is there, off, saying why', await item.innerText());
await go(`#/chart/${made.one}`);
await page.locator('.part-menu-b', { hasText: /^More/ }).first().click();
const item2 = page.getByRole('menuitem').filter({ hasText: /Use these readings in/ }).first();
ok(await item2.isDisabled() && /Nothing to share yet/.test(await item2.innerText()), '1 a lone reading: off, saying why');

/* 2 */
await go(`#/capability/${made.cap}`);
await pressMore(page, 'Use these readings in…');
await page.locator('[data-sheet="share-readings"] .sr-opt[data-target="chart"]').click();
ok((await page.locator('input[aria-label="Name the new study"]').inputValue()) === 'Fill weight — chart', '2 its name offered for its tool');
await page.getByRole('button', { name: 'Chart these readings', exact: true }).click(); await page.waitForTimeout(3000);
ok(/#\/chart\//.test(page.url()), '2 the new chart opens', page.url());
const chartId = idOf('chart');
const c = await getStudy(chartId);
ok(c.tool === 'chart' && c.facts.readings.length === made.n && c.facts.readings.every(r => !r.struck), `2 ${made.n} readings, none struck`, c.facts.readings.length);
ok(JSON.stringify(c.facts.readings.map(r => r.value)) === JSON.stringify(made.values), '2 in the source’s order');
ok(c.agreed.chart.unit === 'g' && c.agreed.chart.target === 400 && c.agreed.chart.lower === 395 && c.agreed.chart.upper === 405 && c.agreed.chart.kind === 'xmr', '2 the unit, nominal and limits carried', JSON.stringify(c.agreed));
ok(c.workspaceId === made.line && c.machine === 'Filler' && c.product === 'Crisps 400 g' && !c.programId, '2 on the same line, machine and product; no program');
const truth = await page.evaluate(async id => {
  const db = await import('/src/db.ts'); const m = await import('/src/tools/chart/chart.ts');
  const s = await db.getStudy(id); const f = m.chartFigures(s.agreed.chart, s.facts.readings);
  return m.chartSays(f, s.agreed.chart).text;
}, chartId);
ok(flat(await page.locator('.ie-says .ie-say').first().innerText()) === flat(truth), '2 its sentence is the chart module’s on those readings', flat(await page.locator('.ie-says .ie-say').first().innerText()));
const from = flat(await page.locator('[data-copied-from]').innerText());
ok(/^Readings copied from “Fill weight”, 28 on \d+ \w{3}/.test(from) && !/now has/.test(from), `2 the origin line says where they came from — "${from}"`);

/* 3 */
const src = await getStudy(made.cap);
ok(src.facts.readings.length === 30 && src.facts.readings.filter(r => r.struck).length === 2 && !src.facts.copiedFrom && src.agreed.readings.lower === 395, '3 the source is untouched');
await page.locator('[data-copied-from] .linkish').click(); await page.waitForTimeout(2500);
ok(page.url().includes(`/capability/${made.cap}`), '3 Open it goes to the source', page.url());

/* 4 */
await go(`#/chart/${made.chart}`);
await pressMore(page, 'Use these readings in…');
await page.locator('[data-sheet="share-readings"] .sr-opt[data-target="capability"]').click();
ok(/You will be asked for the limits/.test(flat(await page.locator('[data-target="capability"]').innerText())), '4 the sheet says capability will ask for limits');
await page.getByRole('button', { name: 'Check capability', exact: true }).click(); await page.waitForTimeout(3000);
const capId = idOf('capability');
const k = await getStudy(capId);
ok(k.tool === 'capability' && !k.agreed && k.facts.readings.length === made.n && /Seal temperature — capability/.test(k.name), '4 no agreed record — the readings are there and the set-up asks', JSON.stringify(k.agreed));
ok((await page.locator('[data-copied-from]').count()) === 1, '4 the origin line is on it');
ok(/limit|agree|what is|question/i.test(flat(await page.locator('main').innerText())), '4 the study asks first (its set-up)');

/* 5 */
await go(`#/capability/${made.cap}`);
await pressMore(page, 'Use these readings in…');
await page.locator('[data-sheet="share-readings"] .sr-opt[data-target="analysis"]').click();
await page.getByRole('button', { name: 'How sure am I', exact: true }).click(); await page.waitForTimeout(3000);
const anId = idOf('analysis');
const an = await getStudy(anId);
ok(an.tool === 'analysis' && an.agreed.analysis.kind === 'sure' && an.agreed.analysis.of === 'mean' && an.agreed.analysis.confidence === 0.95 && an.agreed.analysis.unit === 'g', '5 an analysis of the mean at 95%, unit carried', JSON.stringify(an.agreed));
const anTruth = await page.evaluate(async id => {
  const db = await import('/src/db.ts'); const m = await import('/src/tools/analysis/analysis.ts');
  const s = await db.getStudy(id); return m.analysisSays(m.analysisFigures(s.agreed.analysis, s.facts.readings), s.agreed.analysis).text;
}, anId);
ok(flat(await page.locator('.ie-says .ie-say').first().innerText()) === flat(anTruth), '5 its sentence is the analysis module’s on those readings');

/* 6 */
await page.evaluate(async ([sid]) => {
  const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts');
  await db.patchStudy(sid, cur => ({ facts: { ...cur.facts, readings: [...(cur.facts.readings ?? []), { id: uid(), value: 400.1, at: Date.now() }, { id: uid(), value: 399.9, at: Date.now() + 1 }] } }));
}, [made.cap]);
await go(`#/chart/${chartId}`);
const from2 = flat(await page.locator('[data-copied-from]').innerText());
ok(/The source now has 30 — this copy has 28\./.test(from2), `6 the source gaining readings is said, not acted on — "${from2.slice(-60)}"`);
ok((await getStudy(chartId)).facts.readings.length === 28, '6 the copy is unchanged');

/* 7 */
const copyPaper = await pdf('copy.pdf', / — on paper$/);
ok(/Readings copied from “Fill weight”, 28 on \d+ \w{3}/.test(copyPaper), '7 the copy’s paper says where its readings came from');
await go(`#/capability/${made.cap}`);
const srcPaper = await pdf('source.pdf', / — on paper$/);
ok(!/Readings copied from/.test(srcPaper), '7 the source’s paper does not');

/* 8 */
const P = await mk({ width: 375, height: 800 });
const pp = P.page;
await pp.goto(`${BASE}/#/room`); await pp.waitForTimeout(2500);
await pp.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
await pp.evaluate(async s => { const db = await import('/src/db.ts'); await db.putStudy(s); }, await page.evaluate(async id => (await import('/src/db.ts')).getStudy(id), made.cap));
await pp.goto(`${BASE}/#/capability/${made.cap}`); await pp.waitForTimeout(2500);
await pressMore(pp, 'Use these readings in…');
await pp.locator('[data-sheet="share-readings"]').waitFor({ timeout: 10000 });
ok(!(await pp.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), '8 the phone: the sheet, nothing off the side');
const box = await pp.locator('[data-sheet="share-readings"] .sr-opt').first().boundingBox();
ok(box && box.height >= 44, '8 the phone: a row is at least 44 px', JSON.stringify(box));
const errs = [...D.errs, ...P.errs];
ok(!errs.length, `no console error${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\nShared readings NOT accepted: ${fail} failed` : '\nShared readings accepted: one column of readings started in another tool, copied with its origin said, nothing invented, nothing changed at the source.');
process.exit(fail ? 1 : 0);
