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
      analyses: [an('Stop minutes a day', 'perDay', { of: 'Minutes' }), an('Biggest reason', 'pareto', { by: 'Reason', of: 'Minutes' }), an('Stop minutes by day', 'trend', { of: 'Minutes' }), an('Long stops', 'share', { when_column: 'Minutes', when_op: '>', when_value: '5' }), an('Packs lost', 'sum', { of: 'Packs lost' }), an('Stop minutes a week on', 'forecast', { of: 'Minutes', target: 10 })] })],
      gate: [cond({})] },
    { name: 'Fix it', purpose: 'The biggest reason dealt with.', steps: [step('Countermeasure done', { role: 'Line lead' })], gate: [cond({})] },
    { name: 'Prove it', purpose: 'The same log again.', steps: [step('Log every stop again', { answer: 'log', role: 'Operator', columns: COLS, analyses: [an('Stop minutes a day', 'perDay', { of: 'Minutes' })] })],
      gate: [cond({}), cond({ type: 'fieldMeets', step: 'Log every stop again', field: 'Stop minutes a day', op: '<=', value: 10 }), cond({ type: 'measureMet', measure: 'Stop minutes a day' })] },
  ],
  measures: [{ name: 'Stop minutes a day', unit: 'min', better: 'lower', target: 10, from: [{ step: 'Log every stop', field: 'Stop minutes a day' }, { step: 'Log every stop again', field: 'Stop minutes a day' }] }],
  needs: [{ what: 'A forecast of the next jam', why: 'So the infeed is cleaned before it stops, not after', inputs: 'The time of every jam', method: 'A Weibull fit of the time between jams', check: 'Against a month of logged jams' }],
  assumptions: ['The bagger runs one line; a stop is anything over a minute.'], questions: ['Who will log the stops on the night shift?'],
};
/* asked before it is designed (lib/flow/clarifyCore): what the words leave open */
const CLARIFY = {
  understood: 'Every short stop on the bagger logged with its reason and minutes, the biggest cause fixed, and proved under 10 stop minutes a day', ready: false,
  questions: [
    { ask: 'Who logs the stops as they happen?', why: 'It says whose step the log is.', options: ['The operator', 'The line lead', 'Engineering'] },
    { ask: 'Which shifts does the bagger run?', why: 'It says whether the log is kept on every shift.', options: ['Days only', 'Days and lates', 'All three shifts'] },
    { ask: 'How long is a short stop?', why: 'It sets what counts as an entry.', options: ['Under a minute', 'Under five minutes'] },
  ],
};
let designedFrom = '';
const answer = req => {
  const body = JSON.parse(req.postData() ?? '{}');
  if (body.task === 'clarify') return { ok: true, clarify: CLARIFY, left: { calls: 24 } };
  if (body.task === 'design') { designedFrom = String(body.description ?? ''); return { ok: true, proposal: DESIGN, errors: [], warnings: [], left: { calls: 24 } }; }
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

/* 0 — said at the front door; read first, and what the words leave open asked */
await page.goto(`${BASE}/#/`); await page.locator('.fd-ask h1').waitFor({ timeout: 20000 });
await page.getByLabel('What you need, in your words', { exact: true }).fill(NEED);
await page.getByRole('button', { name: 'Start', exact: true }).click();
await page.locator('.fw-asking').waitFor({ timeout: 15000 });
const askTurn = flat(await page.locator('.fw-turn', { has: page.locator('.fw-asking') }).innerText());
ok(askTurn.includes(`${CLARIFY.understood}. Before it is designed, 3 questions`) && await page.locator('.fw-asking .fw-q').count() === 3 && /It says whose step the log is\./.test(askTurn) && await page.locator('.fw-proposed').count() === 0,
  '0 read before it is designed: the need said back, three questions with why each matters — nothing proposed yet', askTurn.slice(0, 300));
await page.locator('.fw-q[data-q="0"]').getByRole('radio', { name: 'The operator' }).click();
if (process.env.SHOTS) { await page.getByLabel('Your own answer: Which shifts does the bagger run?', { exact: true }).fill('All three, 6 till 6'); await page.locator('.fw-turn', { has: page.locator('.fw-asking') }).screenshot({ path: join(process.env.SHOTS, 'asking.png') }); }
await page.getByLabel('Your own answer: Which shifts does the bagger run?', { exact: true }).fill('All three, 6 till 6');
ok(await page.locator('.fw-q[data-q="0"]').getByRole('radio', { name: 'The operator' }).getAttribute('aria-checked') === 'true', '0a an answer tapped, another written in the person’s own words, one left');
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(400);
ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '0d on a phone: the questions fit, nothing off the side');
if (process.env.SHOTS) await page.locator('.fw-asking').screenshot({ path: join(process.env.SHOTS, 'asking-phone.png') });
await page.setViewportSize({ width: 1360, height: 900 }); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Design it with these answers' }).click();
await page.locator('.fw-proposed').waitFor({ timeout: 15000 });
ok(designedFrom.startsWith(NEED) && designedFrom.includes('Asked before designing:\n- Who logs the stops as they happen? — The operator\n- Which shifts does the bagger run? — All three, 6 till 6') && !designedFrom.includes('How long is a short stop?'),
  '0b the design asked for with the need and the two answers given — the one left unanswered not put in its mouth', designedFrom.slice(-260));
ok(/Who logs the stops as they happen\? — The operator · Which shifts does the bagger run\? — All three, 6 till 6/.test(flat(await page.locator('.fw-turns').innerText())) && await page.locator('.fw-asking').count() === 0,
  '0c the answers said in the conversation; the questions kept above them, answered');

/* 1 — proposed with a log */
const prop = flat(await page.locator('.fw-proposed').innerText());
ok(/Log every stop · once · a log · Operator · 3 columns an entry · works out stop minutes a day, biggest reason, stop minutes by day, long stops, packs lost, stop minutes a week on/.test(prop), '1 proposed: a step that is a log — its columns and what it works out, a tool nobody coded', prop.slice(0, 400));
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
  const r = A.analyse([{ key: 'a', label: 'Stop minutes a day', block: 'perDay', of: 'minutes' }, { key: 'b', label: 'Biggest reason', block: 'pareto', by: 'reason', of: 'minutes' }, { key: 'c', label: 'Packs lost', block: 'sum', of: 'packs_lost' }, { key: 'd', label: 'Stop minutes a week on', block: 'forecast', of: 'minutes', target: 10 }], cols, entries);
  return { perDay: r.a.says, pareto: r.b.says, lost: r.c.says, forecast: r.d.says };
}, [STOPS, days]);
const results = flat(await sheet().locator('.fw-results').innerText());
ok(results.includes(truth.perDay) && results.includes(truth.pareto) && results.includes(truth.lost), `3a what the entries add up to, as lib/flow/analysis says: "${truth.perDay}" · "${truth.pareto}" · "${truth.lost}"`, results.slice(0, 400));
ok(await sheet().locator('svg.fw-chart.is-pareto .fw-bar').count() === 4 && await sheet().locator('svg.fw-chart.is-pareto .fw-cum').count() === 1, '3b the Pareto drawn — a bar a reason, the running share over them');
/* a block written after the first: the forecast — the line through the days carried a week on, and the day it reaches the target */
ok(results.includes(truth.forecast) && /falling 2 min a day/.test(truth.forecast) && /it reaches 10 min on 16 Oct at this rate/.test(truth.forecast), `3d the forecast, as lib/flow/analysis says: "${truth.forecast}"`, results.slice(0, 600));
ok(await sheet().locator('svg.fw-chart.is-forecast .fw-fit.is-ahead').count() === 1 && await sheet().locator('svg.fw-chart.is-forecast .fw-target').count() === 1 && await sheet().locator('svg.fw-chart.is-forecast .fw-bar').count() === 3,
  '3e the forecast drawn as its block says — a bar a day, the line carried on dashed, the target across');
if (process.env.SHOTS) await sheet().locator('.fw-result', { has: page.locator('svg.is-forecast') }).screenshot({ path: join(process.env.SHOTS, 'forecast.png') });
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
ok(/Stop minutes a week on: falling/.test(pdf) && /a week on/.test(pdf.replace(/Stop minutes a week on/g, '')), '7d the forecast on paper — its sentence and its picture');

/* 8 — Faultline's own tool made from blocks, in the library */
await page.goto(`${BASE}/#/methods`); await page.locator('.fw-card[data-library="rejects-log"]').waitFor({ timeout: 15000 });
ok(/Rejects, logged and halved/.test(flat(await page.locator('.fw-card[data-library="rejects-log"]').innerText())), '8 the library holds a tool made from blocks — Rejects, logged and halved');
await page.locator('.fw-card[data-library="rejects-log"]').getByRole('button', { name: 'Use it as it is' }).click();
await page.waitForFunction(() => /#\/methods\/[^/]+$/.test(location.hash), null, { timeout: 15000 }).catch(() => {});
ok(/works out rejects a day, biggest reason, rejects by day, rejects by shift/.test(flat(await page.locator('.nv-main').innerText())), '8a taken: its log and what it works out, on the method page');

/* 8b — statistical process control, a tool no screen was written for: the library's
   process held in control, made of the control chart, the spread, the histogram and
   the relationship — started, read, a signal found, struck and brought back, on paper */
await page.goto(`${BASE}/#/methods`); await page.locator('.fw-card[data-library="held-in-control"]').waitFor({ timeout: 15000 });
ok(/A process held in control/.test(flat(await page.locator('.fw-card[data-library="held-in-control"]').innerText())), '8b the library holds statistical process control, made of blocks — A process held in control');
await page.locator('.fw-card[data-library="held-in-control"]').getByRole('button', { name: 'Use it as it is' }).click();
await page.waitForFunction(() => /#\/methods\/[^/]+$/.test(location.hash), null, { timeout: 15000 }).catch(() => {});
ok(/works out signals, average, spread, the shape of the readings, the reading and line speed/i.test(flat(await page.locator('.nv-main').innerText())), '8c taken: its log works out the signals, the spread, the shape and the link with line speed');
await page.getByRole('button', { name: 'Approve version 1' }).click();
await page.getByRole('button', { name: 'Start a project on it' }).click();
await sheet().waitFor();
await page.getByLabel("The project's name", { exact: true }).fill('Depositor fill weight');
await sheet().getByRole('button', { name: 'Start it' }).click();
await page.locator('.fw-row[data-step="log-before"]').waitFor({ timeout: 15000 });
await page.locator('.fw-row[data-step="log-before"]').first().click();
await sheet().locator('.fw-log-panel').waitFor();
const READ = [[10, 60], [12, 61], [11, 61], [13, 62], [10, 61], [11, 60], [12, 62], [30, 72]];
for (const [i, [w, sp]] of READ.entries()) {
  const form = sheet().locator('.fw-entry').first();
  await form.getByLabel('Reading', { exact: true }).fill(String(w));
  await form.getByLabel('Line speed', { exact: true }).fill(String(sp));
  await form.getByLabel('The day it happened', { exact: true }).fill(`2026-10-0${i + 1}`);
  await form.getByRole('button', { name: 'Add the entry' }).click(); await page.waitForTimeout(300);
}
await page.waitForTimeout(500);
const spc = await page.evaluate(async read => {
  const A = await import('/src/lib/flow/analysis.ts'), L = await import('/src/lib/flow/library.ts');
  const st = L.libraryEntry('held-in-control').build().stages[0].steps[0];
  const r = A.analyse(st.analyses, st.columns, read.map(([w, sp], i) => ({ id: `s${i}`, on: `2026-10-0${i + 1}`, at: i, values: { reading: w, speed: sp } })));
  return { signals: r.signals.says, link: r.with_speed.says };
}, READ);
const spcSaid = flat(await sheet().locator('.fw-results').innerText());
ok(spcSaid.includes(spc.signals) && /^Signals: 1 signal — 30 on 8 Oct above the upper limit/.test(spc.signals), `8d the control chart's signal, as lib/flow/analysis says: "${spc.signals}"`, spcSaid.slice(0, 400));
ok(await sheet().locator('svg.fw-chart.is-control .fw-dot').count() === 8 && await sheet().locator('svg.fw-chart.is-control .fw-dot.is-signal').count() === 1 && await sheet().locator('svg.fw-chart.is-control .fw-lim').count() === 2,
  '8e drawn as a control chart — every reading in order, the limits either side, the signal marked');
ok(spcSaid.includes(spc.link) && await sheet().locator('svg.fw-chart.is-scatter .fw-dot').count() === 8 && await sheet().locator('svg.fw-chart.is-scatter .fw-fit').count() === 1,
  `8f the reading against line speed — a dot an entry and the line through them: "${spc.link}"`);
if (process.env.SHOTS) for (const [i, el] of (await sheet().locator('.fw-result.has-pic').all()).entries()) await el.screenshot({ path: join(process.env.SHOTS, `spc-${i}.png`) });
await sheet().locator('.fw-entries-t tbody tr', { hasText: '30' }).first().getByRole('button', { name: 'Strike' }).click(); await page.waitForTimeout(600);
ok(/Signals: in control — 7 readings within the limits/.test(flat(await sheet().locator('.fw-results').innerText())) && await sheet().locator('svg.fw-chart.is-control .fw-dot.is-signal').count() === 0,
  '8g the odd reading struck — the chart in control, nothing marked', flat(await sheet().locator('.fw-results').innerText()).slice(0, 160));
await page.getByRole('button', { name: 'Undo' }).click().catch(() => {}); await page.waitForTimeout(700);
ok(/Signals: 1 signal/.test(flat(await sheet().locator('.fw-results').innerText())), '8h and Undo brings the signal back');
await page.keyboard.press('Escape'); await settle();
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Method report' }).click()]);
const f2 = join(dir, 'spc.pdf'); await dl2.saveAs(f2);
const pdf2 = flat(execFileSync('pdftotext', ['-raw', f2, '-'], { encoding: 'utf8' }));
if (process.env.SHOW_PDF) console.log(pdf2);
ok(pdf2.includes('Signals: 1 signal — 30 on 8 Oct above the upper limit') && /UCL/.test(pdf2) && /LCL/.test(pdf2) && /Line speed, across/.test(pdf2)
  && !/of \d+ Faultline/.test(pdf2.slice(pdf2.indexOf('The reading and line speed:'), pdf2.indexOf('Line speed, across'))), '8i on paper: the signal said, the control chart with its limits, the relationship with its axes on the page with its sentence', pdf2.slice(0, 500));

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
