/* A TOOL NOBODY WROTE CODE FOR, DRIVEN (docs/BLUEPRINT.md §3; Rowland, 18
 * October: "Faultline must be capable of going beyond its existing
 * functionality ... design and create new manufacturing tools ... from
 * plain-English descriptions ... I want working software and demonstrated
 * capability").
 *
 * From an empty device: a need said in plain words at the front door — log
 * every short stop on the bagger, find the biggest cause, prove it — and
 * the assistant (a recorded answer standing in for Claude, as front-door
 * does) proposes a method whose first step is a LOG: its columns, its
 * analyses (stop minutes a day, the Pareto of reasons, the trend), a gate
 * on a log's figure, a measure fed by the two logs, and a need for
 * development it says plainly (a forecast of the next jam no block does).
 * Approved and started; the log filled on the floor — every figure checked
 * against lib/flow/analysis on the same entries, the Pareto drawn, an entry
 * corrected and one struck (and its Undo); the gate passed; the log kept
 * again, the gate on its figure met and the measure moved before → now; the
 * report read back with the log's sentences, its picture, every entry and
 * the need; Faultline's own rejects log in the library; and the phone.
 *
 *   node scripts/acceptance/designed-tool.mjs      (SMOKE_BASE, as smoke) */
import pkg from '/home/user/Faultline/node_modules/playwright/index.js';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };

/* the recorded answer: a method built on a log — no tool of the app's does this */
const fld = (label, type, o = {}) => ({ label, type, unit: '', min: null, max: null, options: [], formula: '', required: false, ...o });
const an = (label, block, o = {}) => ({ label, block, of: '', by: '', when_column: '', when_op: '', when_value: '', unit: '', ...o });
const step = (title, o = {}) => ({ title, per: 'line', answer: 'done', role: '', passes_if: '', photos: 0, files: 0, due_days: null, after: [], tool: '', fields: [], columns: [], analyses: [], min_entries: null, help: '', ...o });
const cond = (o) => ({ type: 'stepsDone', policy: 'block', step: '', field: '', op: '>=', value: null, value2: null, evidence: 'photo', min: null, measure: '', priority: 'any', due_days: null, label: '', ...o });
const COLS = [fld('Reason', 'choice', { options: ['Jam at infeed', 'Film change', 'Label fault', 'No product'], required: true }), fld('Minutes', 'number', { unit: 'min', required: true }), fld('Packs lost', 'calc', { unit: 'packs', formula: 'minutes * 40' })];
const DESIGN = {
  name: 'Short stops on the bagger', purpose: 'Every short stop logged, the biggest reason found by its Pareto and fixed, proved on the stop minutes a day.', kind: 'improvement',
  roles: [{ name: 'Operator', side: 'site' }, { name: 'Line lead', side: 'site' }],
  stages: [
    { name: 'Log the stops', purpose: 'Every stop as it happens.', steps: [step('Log every stop', { answer: 'log', role: 'Operator', columns: COLS, min_entries: 5,
      analyses: [an('Stop minutes a day', 'perDay', { of: 'Minutes' }), an('Biggest reason', 'pareto', { by: 'Reason', of: 'Minutes' }), an('Stop minutes by day', 'trend', { of: 'Minutes' }), an('Long stops', 'share', { when_column: 'Minutes', when_op: '>', when_value: '5' }), an('Packs lost', 'sum', { of: 'Packs lost' })] })],
      gate: [cond({})] },
    { name: 'Fix it', purpose: 'The biggest reason dealt with.', steps: [step('Countermeasure done', { role: 'Line lead' })], gate: [cond({})] },
    { name: 'Prove it', purpose: 'The same log again.', steps: [step('Log every stop again', { answer: 'log', role: 'Operator', columns: COLS, analyses: [an('Stop minutes a day', 'perDay', { of: 'Minutes' })] })],
      gate: [cond({}), cond({ type: 'fieldMeets', step: 'Log every stop again', field: 'Stop minutes a day', op: '<=', value: 10 }), cond({ type: 'measureMet', measure: 'Stop minutes a day' })] },
  ],
  measures: [{ name: 'Stop minutes a day', unit: 'min', better: 'lower', target: 10, from: [{ step: 'Log every stop', field: 'Stop minutes a day' }, { step: 'Log every stop again', field: 'Stop minutes a day' }] }],
  needs: [{ what: 'A forecast of the next jam', why: 'So the infeed is cleaned before it stops, not after', inputs: 'The time of every jam', method: 'A Weibull fit of the time between jams', check: 'Against a month of logged jams' }],
  assumptions: ['The bagger runs one line; a stop is anything over a minute.'], questions: ['Who will log the stops on the night shift?'],
};
const answer = req => {
  const body = JSON.parse(req.postData() ?? '{}');
  if (body.task === 'design') return { ok: true, proposal: DESIGN, errors: [], warnings: [], left: { calls: 24 } };
  return { off: true, why: 'The assistant is not switched on for this.' };
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
await page.route('**/functions/v1/assist', r => r.request().method() === 'OPTIONS'
  ? r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: 'ok' })
  : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(answer(r.request())) }));
page.setDefaultTimeout(20000);
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m, why = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${c || !why ? '' : ` — ${String(why).replace(/\s+/g, ' ').slice(0, 300)}`}`); if (!c) fail++; };
const flat = x => String(x ?? '').replace(/\s+/g, ' ').trim();
const sheet = () => page.getByRole('dialog').last();
const settle = async () => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300); };
const NEED = 'Log every short stop on the bagger with its reason and minutes, find the biggest cause, fix it and prove it — under 10 stop minutes a day.';

/* 1 — said at the front door, proposed with a log */
await page.goto(`${BASE}/#/`); await page.locator('.fd-ask h1').waitFor({ timeout: 20000 });
await page.getByLabel('What you need, in your words', { exact: true }).fill(NEED);
await page.getByRole('button', { name: 'Start', exact: true }).click();
await page.locator('.fw-proposed').waitFor({ timeout: 15000 });
const prop = flat(await page.locator('.fw-proposed').innerText());
ok(/Log every stop · once · a log · Operator · 3 columns an entry · works out stop minutes a day, biggest reason, stop minutes by day, long stops, packs lost/.test(prop), '1 proposed: a step that is a log — its columns and what it works out, a tool nobody coded', prop.slice(0, 400));
ok(/Needs development — what no block does yet/i.test(prop) && /A forecast of the next jam — So the infeed is cleaned before it stops/.test(prop) && /Method: A Weibull fit of the time between jams/.test(prop),
  '1a what no block does is said as a need for development, never faked', prop.slice(prop.search(/needs development/i), prop.search(/needs development/i) + 300));
ok(/Stop minutes a day/.test(prop) && /It can run/.test(prop), '1b the measure fed by the two logs, and the validator content: it can run');

/* 2 — approved and started */
await page.getByRole('button', { name: 'Approve it and start a project' }).click();
await sheet().waitFor({ timeout: 15000 });
await page.getByLabel("The project's name", { exact: true }).fill('Bagger stops');
await sheet().getByRole('button', { name: 'Start it' }).click();
await page.locator('.fw-row[data-step="log-every-stop"]').waitFor({ timeout: 15000 });
ok(/Bagger stops/.test(flat(await page.locator('.nv-main').innerText())), '2 the project, running the method');

/* 3 — the log filled on the floor */
await page.locator('.fw-row[data-step="log-every-stop"]').first().click();
await sheet().locator('.fw-log-panel').waitFor({ timeout: 10000 });
ok(/Needs an entry in its log|5 entries in its log/.test(flat(await sheet().innerText())) || /The log — 0 entries of the 5 it needs/.test(flat(await sheet().innerText())), '3 the log asks for its entries — 0 of the 5 it needs', flat(await sheet().innerText()).slice(0, 200));
const days = ['2026-10-12', '2026-10-12', '2026-10-13', '2026-10-13', '2026-10-14', '2026-10-14'];
const STOPS = [['Jam at infeed', '12'], ['Film change', '6'], ['Jam at infeed', '8'], ['Label fault', '3'], ['Jam at infeed', '10'], ['No product', '4']];
for (const [i, [reason, minutes]] of STOPS.entries()) {
  const form = sheet().locator('.fw-entry').first();
  await form.getByLabel('Reason', { exact: true }).selectOption(reason);
  await form.getByLabel('Minutes', { exact: true }).fill(minutes);
  await form.getByLabel('The day it happened', { exact: true }).fill(days[i]);
  await form.getByRole('button', { name: 'Add the entry' }).click();
  await page.waitForTimeout(350);
}
await page.waitForTimeout(500);
/* every figure on the screen is the module's own answer on the same entries */
const truth = await page.evaluate(async ([stops, ds]) => {
  const A = await import('/src/lib/flow/analysis.ts');
  const cols = [{ key: 'reason', label: 'Reason', type: 'choice', options: ['Jam at infeed', 'Film change', 'Label fault', 'No product'] }, { key: 'minutes', label: 'Minutes', type: 'number', unit: 'min' }, { key: 'packs_lost', label: 'Packs lost', type: 'calc', unit: 'packs', formula: 'minutes * 40' }];
  const entries = stops.map(([reason, m], i) => ({ id: `t${i}`, on: ds[i], at: i, values: { reason, minutes: Number(m) } }));
  const r = A.analyse([{ key: 'a', label: 'Stop minutes a day', block: 'perDay', of: 'minutes' }, { key: 'b', label: 'Biggest reason', block: 'pareto', by: 'reason', of: 'minutes' }, { key: 'c', label: 'Packs lost', block: 'sum', of: 'packs_lost' }], cols, entries);
  return { perDay: r.a.says, pareto: r.b.says, lost: r.c.says };
}, [STOPS, days]);
const results = flat(await sheet().locator('.fw-results').innerText());
ok(results.includes(truth.perDay) && results.includes(truth.pareto) && results.includes(truth.lost), `3a what the entries add up to, as lib/flow/analysis says: "${truth.perDay}" · "${truth.pareto}" · "${truth.lost}"`, results.slice(0, 400));
ok(await sheet().locator('svg.fw-chart.is-pareto .fw-bar').count() === 4 && await sheet().locator('svg.fw-chart.is-pareto .fw-cum').count() === 1, '3b the Pareto drawn — a bar a reason, the running share over them');
ok(await sheet().locator('.fw-entries-t tbody tr').count() === 6 && /12 min/.test(flat(await sheet().locator('.fw-entries-t').innerText())) && /480 packs/.test(flat(await sheet().locator('.fw-entries-t').innerText())), '3c every entry listed, its worked-out column worked out (12 min → 480 packs)');

/* 4 — corrected where it sits, and struck (never erased), with Undo */
const row = sheet().locator('.fw-entries-t tbody tr', { hasText: 'Label fault' }).first();
await row.getByRole('button', { name: 'Correct' }).click();
await sheet().locator('.fw-entry-fix').getByLabel('Minutes', { exact: true }).fill('5');
await sheet().locator('.fw-entry-fix').getByRole('button', { name: 'Save the correction' }).click(); await page.waitForTimeout(600);
ok(/Stop minutes a day: 15 min a day, over 3 days logged/.test(flat(await sheet().locator('.fw-results').innerText())), '4 an entry corrected — the figures move with it (43 → 45 minutes over 3 days)', flat(await sheet().locator('.fw-results').innerText()).slice(0, 120));
await sheet().locator('.fw-entries-t tbody tr', { hasText: 'No product' }).first().getByRole('button', { name: 'Strike' }).click(); await page.waitForTimeout(600);
const struckRow = sheet().locator('.fw-entries-t tbody tr.is-struck');
ok(await struckRow.count() === 1 && /The log — 5 entries/i.test(flat(await sheet().innerText())) && /Stop minutes a day: 13\.67 min a day/.test(flat(await sheet().locator('.fw-results').innerText())),
  '4a an entry struck — it keeps its place, counts for nothing, the figures move', flat(await sheet().locator('.fw-results').innerText()).slice(0, 120));
await page.getByRole('button', { name: 'Undo' }).click().catch(() => {}); await page.waitForTimeout(700);
ok(await sheet().locator('.fw-entries-t tbody tr.is-struck').count() === 0 && /The log — 6 entries/i.test(flat(await sheet().innerText())), '4b and Undo brings it back');
await sheet().locator('.fw-entries-t tbody tr', { hasText: 'No product' }).first().getByRole('button', { name: 'Strike' }).click(); await page.waitForTimeout(500);

/* 5 — done, the gate passed */
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(700);
ok(/^Done/.test(flat(await sheet().locator('.fw-state').innerText())), '5 the log done — enough entries', flat(await sheet().locator('.fw-state').innerText()));
await page.keyboard.press('Escape'); await settle();
const rowLine = flat(await page.locator('.fw-row[data-step="log-every-stop"]').first().innerText());
ok(/5 entries · Stop minutes a day: 13\.67 min a day/.test(rowLine), '5a the step says its log on its row', rowLine);
for (const g of ['log-the-stops']) {
  await page.locator(`.fw-gate-line[data-gate="${g}"]`).click();
  await sheet().getByRole('button', { name: 'Pass the gate' }).click(); await page.waitForTimeout(700);
  await page.keyboard.press('Escape'); await settle();
}
await page.locator('.fw-strip .fw-sg[data-stage="fix-it"]').click(); await page.waitForTimeout(500);
await page.locator('.fw-row[data-step="countermeasure-done"]').first().click();
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(600);
await page.keyboard.press('Escape'); await settle();
await page.locator('.fw-gate-line[data-gate="fix-it"]').click();
await sheet().getByRole('button', { name: 'Pass the gate' }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();

/* 6 — the log kept again; the gate on its figure and the measure */
await page.locator('.fw-strip .fw-sg[data-stage="prove-it"]').click(); await page.waitForTimeout(500);
await page.locator('.fw-row[data-step="log-every-stop-again"]').first().click();
await sheet().locator('.fw-log-panel').waitFor();
for (const [reason, minutes, on] of [['Film change', '5', '2026-10-20'], ['Jam at infeed', '3', '2026-10-20'], ['Label fault', '4', '2026-10-21']]) {
  const form = sheet().locator('.fw-entry').first();
  await form.getByLabel('Reason', { exact: true }).selectOption(reason);
  await form.getByLabel('Minutes', { exact: true }).fill(minutes);
  await form.getByLabel('The day it happened', { exact: true }).fill(on);
  await form.getByRole('button', { name: 'Add the entry' }).click(); await page.waitForTimeout(350);
}
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();
const measured = flat(await page.locator('.fw-measured').innerText().catch(() => ''));
ok(/Stop minutes a day: 13\.67 min before, 6 min now — 7\.67 min better — target at most 10 min, met\./.test(measured), '6 the measure read from the two logs: before → now, against its target', measured);
await page.locator('.fw-gate-line[data-gate="prove-it"]').click();
const gate = flat(await sheet().innerText());
ok(/Ready to pass/.test(gate) && /Stop minutes a day/.test(gate), '6a the gate on the log’s figure met — ready to pass', gate.slice(0, 300));
await sheet().getByRole('button', { name: 'Pass the gate' }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();

/* 7 — the report: the log's sentences, its picture, every entry, the need */
const dir = mkdtempSync(join(tmpdir(), 'designed-tool-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Method report' }).click()]);
const f = join(dir, 'report.pdf'); await dl.saveAs(f);
const pdf = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
ok(/The log — Log every stop: 5 entries/.test(pdf) && pdf.includes('Biggest reason: Jam at infeed is'), '7 on paper: the log and what it adds up to', pdf.slice(0, 400));
ok(/line: the running share/.test(pdf), '7a the Pareto drawn on paper');
ok(/Every entry/.test(pdf) && /No product · Minutes 4 min · Packs lost 160 packs.*struck, not counted/.test(pdf), '7b every entry printed — the struck one said struck', pdf.slice(pdf.indexOf('Every entry'), pdf.indexOf('Every entry') + 300));
ok(/Needs development/.test(pdf) && /A forecast of the next jam/.test(pdf), '7c the need for development on paper');

/* 8 — Faultline's own tool made from blocks, in the library */
await page.goto(`${BASE}/#/methods`); await page.locator('.fw-card[data-library="rejects-log"]').waitFor({ timeout: 15000 });
ok(/Rejects, logged and halved/.test(flat(await page.locator('.fw-card[data-library="rejects-log"]').innerText())), '8 the library holds a tool made from blocks — Rejects, logged and halved');
await page.locator('.fw-card[data-library="rejects-log"]').getByRole('button', { name: 'Use it as it is' }).click();
await page.waitForFunction(() => /#\/methods\/[^/]+$/.test(location.hash), null, { timeout: 15000 }).catch(() => {});
ok(/works out rejects a day, biggest reason, rejects by day, rejects by shift/.test(flat(await page.locator('.nv-main').innerText())), '8a taken: its log and what it works out, on the method page');

/* 9 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
await page.goBack(); await page.waitForTimeout(800);
await page.goto(`${BASE}/#/projects`); await page.waitForTimeout(800);
const pid = await page.evaluate(async () => (await (await import('/src/db.ts')).allProjects()).find(p => p.name === 'Bagger stops')?.id);
await page.goto(`${BASE}/#/project/${pid}?view=stage-log-the-stops`); await page.waitForTimeout(1500);
await page.locator('.fw-row[data-step="log-every-stop"]').first().click(); await sheet().locator('.fw-log-panel').waitFor();
const fits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
ok(fits && await sheet().locator('svg.fw-chart').count() >= 1, '9 on a phone: the log and its picture, nothing off the side');

ok(errs.length === 0, `no console errors${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
