/* ACCEPTANCE — A METHOD DESIGNED FROM WHAT A PERSON NEEDS, RUN, MEASURED AND
 * REUSED (docs/PLATFORM-STATUS.md, the vision slice; slices 4 and 5).
 *
 * The gateway (supabase/functions/assist) is answered with recorded answers
 * in the shape the real one returns, so the journey is proved with no key
 * and no network. From an empty device, in a real browser:
 *
 *   1  the control room's Describe what you need; the assistant off — said,
 *      the library closest to the words offered, one started from
 *   2  described: the proposal on the right, what it took for granted and
 *      what it would ask on the left, a question answered in a tap
 *   3  shaped: a second turn changes the method as it stands, the change said
 *      in a line and its stage marked
 *   4  approved and a project started on it in one go
 *   5  changed with the assistant into version 2 — a measure added — kept,
 *      approved; the project moved after what moving does is said
 *   6  measured: a reading under the target did not pass, tried again over
 *      it — the measure 36 before, 44 now, met; on the page and its tile
 *   7  asked: the app answers the common question; the assistant answers from
 *      the facts, a figure it was not told never shown as known
 *   8  the method report: what it measures, what has happened, the move
 *   9  the library: Faultline's SMED method adapted (its target changed in
 *      words), approved, started on a line; a SMED study on the line attached
 *      to the step — its minutes read by SMED's own arithmetic into the step
 *      and the measure; one started from the step on SMED's own New, saying
 *      the step, attached as it is made, with Undo and the log saying so
 *  10  Line performance used as it is; a method copied
 *  11  Line capacity as a tool step: Bring a line to its rate run on Line 4,
 *      a product's capacity attached — its rate and labour a pack read by
 *      lib/capacity — and one made from the step attached as it is made
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/methods-design.mjs      (SMOKE_BASE, as smoke) */
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

/* the recorded answers */
const step = (title, o = {}) => ({ title, per: 'machine', answer: 'done', role: '', passes_if: '', photos: 0, files: 0, due_days: null, after: [], tool: '', fields: [], help: '', ...o });
const cond = (o) => ({ type: 'stepsDone', policy: 'block', step: '', field: '', op: '>=', value: null, value2: null, evidence: 'photo', min: null, measure: '', priority: 'any', due_days: null, label: '', ...o });
const DESIGN = {
  name: 'Wrapper upgrade', purpose: 'A new film wrapper fitted to the line and proved before production takes it.', kind: 'stagegate',
  roles: [{ name: 'OEM engineer', side: 'supplier' }, { name: 'Quality', side: 'site' }],
  stages: [
    { name: 'Fit', purpose: 'The wrapper in place and connected.', steps: [step('Wrapper fitted', { role: 'OEM engineer', photos: 1 }), step('Guards on', { role: 'OEM engineer' })], gate: [cond({})] },
    { name: 'Prove', purpose: 'Run at the agreed speed.', steps: [
      step('Performance run', { per: 'line', answer: 'measure', role: 'OEM engineer', passes_if: '40 packs a minute for an hour', fields: [{ label: 'Packs per minute', type: 'reading', unit: 'packs/min', min: 40, max: null, options: [], formula: '', required: true }] }),
      step('Quality sign-off', { per: 'line', answer: 'signoff', role: 'Quality', after: ['Performance run'] }),
    ], gate: [cond({}), cond({ type: 'fieldMeets', step: 'Performance run', field: 'Packs per minute', op: '>=', value: 40 })] },
  ],
  measures: [],
  assumptions: ['One wrapper, on one line.', 'The agreed speed is 40 packs a minute.'],
  questions: ['How long must the performance run last?'],
};
const WITH_RUN = structuredClone(DESIGN);
WITH_RUN.stages[1].steps.splice(1, 0, step('Reliability run', { per: 'line', answer: 'check', role: 'OEM engineer', passes_if: 'Four hours with no stop over two minutes' }));
WITH_RUN.assumptions = ['Added a four-hour reliability run before Quality signs.'];
WITH_RUN.questions = [];
const V2 = structuredClone(WITH_RUN);
V2.stages[1].steps.push(step('Film splice check', { per: 'line', answer: 'check', role: 'OEM engineer' }));
V2.measures = [{ name: 'Packs per minute', unit: 'packs/min', better: 'higher', target: 40, from: [{ step: 'Performance run', field: 'Packs per minute' }] }];
V2.assumptions = ['The speed is measured on the performance run, against 40 packs a minute.'];
let mode = 'off';
const answer = req => {
  const body = JSON.parse(req.postData() ?? '{}');
  if (mode === 'off') return { off: true, why: 'The assistant is not switched on for this app yet — write the method by hand; everything else works the same.' };
  if (body.task === 'design') return { ok: true, proposal: DESIGN, errors: [], warnings: [], left: { calls: 24 } };
  if (body.task === 'change') {
    const cur = body.current ?? {};
    if (/^Changeover reduction/.test(cur.name ?? '')) {
      const next = structuredClone(cur);
      next.measures[0].target = 7;
      return { ok: true, proposal: { ...next, assumptions: ['The target is 7 minutes, as asked.'], questions: [] }, errors: [], warnings: [] };
    }
    const hasRun = (cur.stages ?? []).some(s => (s.steps ?? []).some(t => t.title === 'Reliability run'));
    return { ok: true, proposal: hasRun ? V2 : WITH_RUN, errors: [], warnings: [], left: { calls: 23 } };
  }
  if (body.task === 'ask') {
    const f = body.facts.find(x => /Performance run/.test(x.text)) ?? body.facts[0];
    return { ok: true, answer: { sentences: [
      { text: f.text, basis: 'known', facts: [f.id] },
      { text: 'It ran at 31 packs a minute last Tuesday.', basis: 'known', facts: [f.id] },
      { text: 'Nothing recorded says why.', basis: 'unknown', facts: [] },
    ] } };
  }
  return { ok: false, why: 'unknown task' };
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
const txt = async () => (await page.locator('.nv-main').innerText()).replace(/\s+/g, ' ');
const sheet = () => page.getByRole('dialog').last();
const sheetTxt = async () => (await sheet().innerText()).replace(/\s+/g, ' ');
const talk = async () => (await page.locator('.fw-talk').innerText()).replace(/\s+/g, ' ');
const proposed = async () => (await page.locator('.fw-proposed').innerText()).replace(/\s+/g, ' ');
const shot = async n => { if (OUT) await page.screenshot({ path: `${OUT}/md-${n}.png`, fullPage: true }); };
const settle = async () => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300); };
const DESCRIBE = 'We are fitting a new film wrapper to Line 3. The OEM fits it, then it must run at 40 packs a minute and Quality signs it off before production takes it.';
const box = () => page.getByLabel(/^(What you need, in your words|What should change)$/);

/* 1 — from the control room; the assistant off */
await page.goto(`${BASE}/#/`); await page.waitForTimeout(3500);
await page.getByRole('button', { name: 'Describe what you need ›' }).first().click(); await page.waitForTimeout(1200);
ok(/#\/design$/.test(page.url()) && /What do you need to achieve\?/.test(await txt()), '1 the control room opens the studio: what do you need to achieve?');
ok(await page.locator('.fw-start .fw-card').count() >= 5, '1a the library offered before a word is said');
await box().fill(DESCRIBE);
ok(/Closest to what you said/.test(await txt()) && await page.locator('.fw-start .fw-card[data-start="stage-gate"]').count() === 1, '1b the library closest to the words, as they are typed');
await page.getByRole('button', { name: 'Design it' }).click(); await page.waitForTimeout(1200);
const off = await talk();
ok(/not switched on/.test(off) && /Closest to what you said, to start from and adapt/.test(off), '1c the assistant off: said in words, and the closest methods offered', off);
await page.locator('.fw-offers').getByRole('button', { name: 'Start from “Stage gate”' }).click(); await page.waitForTimeout(800);
ok(/Stage gate/.test(await proposed()) && /1\. Install/.test(await proposed()), '1d one started from with no assistant: the method on the right, to adapt');
await page.getByRole('button', { name: 'Start again' }).click(); await page.waitForTimeout(500);

/* 2 — described */
mode = 'on';
await box().fill(DESCRIBE);
await page.getByRole('button', { name: 'Design it' }).click(); await page.waitForTimeout(1500);
const t2 = await talk(), p2 = await proposed();
ok(/Here is a proposal: “Wrapper upgrade” — 2 stages, 4 steps\./.test(t2), '2 the proposal said in the conversation', t2);
ok(/What it took for granted One wrapper, on one line\./i.test(t2) && /What it would ask you How long must the performance run last\?/i.test(t2), '2a what it took for granted, and what it would ask');
ok(/Wrapper upgrade/.test(p2) && /1\. Fit/.test(p2) && /Performance run · once · measured · OEM engineer · 1 box/.test(p2) && /“Performance run”: Packs per minute at least 40 packs\/min/.test(p2), '2b the method on the right, each step and gate in words', p2);
await page.locator('.fw-turn').getByRole('button', { name: 'Answer' }).first().click(); await page.waitForTimeout(200);
ok((await box().inputValue()).startsWith('How long must the performance run last? — '), '2c a question answered in a tap — it is put in the box');
await shot('1-proposal');

/* 3 — shaped in a second turn */
await box().fill('Add a four-hour reliability run before Quality signs.');
await page.getByRole('button', { name: 'Change it' }).click(); await page.waitForTimeout(1500);
const t3 = await talk();
ok(/Changed 1 thing:/.test(t3) && /added Step “Reliability run” in Prove/.test(t3), '3 the change said in a line', t3);
ok(/Reliability run/.test(await proposed()) && await page.locator('.fw-prop-st.is-touched[data-stage="prove"]').count() === 1 && await page.locator('.fw-prop-st.is-touched[data-stage="fit"]').count() === 0, '3a the method changed as it stood — the stage it touched marked, the rest kept');
await shot('2-shaped');

/* 4 — approved and started in one go */
await page.getByRole('button', { name: 'Approve it and start a project' }).click(); await page.waitForTimeout(1800);
ok(/#\/methods\/[^/?]+\?start=1$/.test(page.url()) && /Start a project on Wrapper upgrade/.test(await sheetTxt()), '4 approved, and straight on to starting a project');
await page.getByLabel("The project's name", { exact: true }).fill('Line 3 wrapper');
await page.getByLabel('The machines, one a line', { exact: true }).fill('Wrapper');
await sheet().getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(2000);
const projUrl = page.url();
ok(/Line 3 wrapper/.test(await txt()) && /Wrapper upgrade · version 1/.test(await txt()), '4a a project on it, version 1');
await page.locator('.fw-row[data-step="guards-on"]').click(); await page.waitForTimeout(500);
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(800);
await page.keyboard.press('Escape'); await settle();
await page.locator('.fw-band-acts').getByRole('link', { name: 'The method ›' }).click(); await page.waitForTimeout(1500);
const mp = await txt();
ok(/Approved · version 1/.test(mp) && /Designed with the assistant from: “We are fitting a new film wrapper/.test(mp) && /proposed by the assistant/.test(mp), '4b the method says how it began — on its page and in its history', mp.slice(0, 400));

/* 5 — changed with the assistant into version 2; the project moved */
await page.getByRole('button', { name: 'Change it with the assistant' }).click(); await page.waitForTimeout(1500);
ok(/#\/design\?version=/.test(page.url()) && /as it stands, version 1/.test(await talk()), '5 the studio opens on the method as it stands');
await box().fill('Measure the speed against 40 packs a minute, and add a film splice check.');
await page.getByRole('button', { name: 'Change it' }).click(); await page.waitForTimeout(1500);
const t5 = await talk();
ok(/added Step “Film splice check” in Prove/.test(t5) && /added Measure “Packs per minute” — at least 40 packs\/min/.test(t5), '5a every change said — a step and a measure', t5);
ok(/What it measures — before and after Packs per minute · at least 40 packs\/min · read from Packs per minute on “Performance run”/i.test(await proposed()), '5b the measure on the method, said in words');
await page.getByRole('button', { name: 'Keep it as version 2 (a draft)' }).click(); await page.waitForTimeout(1500);
ok(/Draft · version 2/.test(await txt()) && /What it measures Packs per minute/.test(await txt()), '5c kept as version 2, a draft, measuring the speed');
await page.getByRole('button', { name: 'Approve version 2' }).click(); await page.waitForTimeout(1200);
ok(/v1 · Retired/.test(await txt()) && /v2 · Approved/.test(await txt()), '5d version 2 approved, version 1 kept');
await page.goto(projUrl); await page.waitForTimeout(2000);
ok(/Version 2 of the method is approved — this project runs version 1/.test(await txt()), '5e the project is told version 2 is approved');
await page.getByRole('button', { name: 'See what moving would do' }).click(); await page.waitForTimeout(900);
const mv = await sheetTxt();
ok(/1 step done stays done; 1 new step to do\. Nothing is deleted\./.test(mv) && /New to do Film splice check/i.test(mv), '5f what moving does, said first', mv);
await sheet().getByRole('button', { name: 'Move it to version 2' }).click(); await page.waitForTimeout(1000);
ok(/Now on version 2/.test(await sheetTxt()) && await page.locator('.toast', { hasText: 'moved to version 2' }).count() > 0, '5g moved, and Undo offered');
await page.keyboard.press('Escape'); await settle(); await page.waitForTimeout(900);
ok(/Wrapper upgrade · version 2/.test(await txt()) && /Guards on Done/.test(await txt()), '5h on version 2, the step done still done');

/* 6 — measured: under the target, then over it */
const tile = async () => (await page.locator('.ln-tile', { hasText: 'Packs per minute' }).first().innerText()).replace(/\s+/g, ' ');
ok(/—/.test(await tile()) && /not measured yet · target at least 40 packs\/min/.test(await tile()), '6 the measure is the first tile — not measured yet, its target said', await tile());
await page.locator('.fw-strip .fw-sg[data-stage="prove"]').click(); await page.waitForTimeout(600);
await page.locator('.fw-row[data-step="performance-run"]').click(); await page.waitForTimeout(500);
await sheet().getByLabel('Packs per minute', { exact: true }).fill('36'); await sheet().getByLabel('Packs per minute', { exact: true }).press('Enter'); await page.waitForTimeout(500);
await sheet().getByRole('button', { name: 'Save the result' }).click(); await page.waitForTimeout(800);
ok(/did not pass/i.test(await sheetTxt()), '6a 36 a minute is kept — it did not pass');
await sheet().getByRole('button', { name: 'Try again' }).click(); await page.waitForTimeout(700);
await sheet().getByLabel('Packs per minute', { exact: true }).fill('44'); await sheet().getByLabel('Packs per minute', { exact: true }).press('Enter'); await page.waitForTimeout(500);
await sheet().getByRole('button', { name: 'Save the result' }).click(); await page.waitForTimeout(800);
await page.keyboard.press('Escape'); await settle(); await page.waitForTimeout(800);
const measured = await page.locator('.fw-measured').innerText().catch(() => '');
ok(/Packs per minute: 36 packs\/min before, 44 packs\/min now — 8 packs\/min better — target at least 40 packs\/min, met\./.test(measured.replace(/\s+/g, ' ')), '6b before → now against the target, from every attempt', measured);
ok(/44 packs\/min/.test(await tile()) && /met/.test(await tile()) && /8 packs\/min since the first, 36 packs\/min/.test(await tile()), '6c and on its tile', await tile());
await shot('3-measured');

/* 7 — asked */
await page.locator('.fw-ask').getByRole('button', { name: 'What is late?' }).click(); await page.waitForTimeout(600);
ok(/answered by the app, from what is recorded/.test(await txt()) && /Nothing is late\. worked out/.test(await txt()), '7 the common question answered by the app itself');
await page.getByLabel('Ask about this project', { exact: true }).fill('Why did the performance run go wrong at first?');
await page.locator('.fw-ask').getByRole('button', { name: 'Ask', exact: true }).click(); await page.waitForTimeout(1500);
const a = await page.locator('.fw-ask-a').innerText();
ok(/answered by the assistant, from the project’s facts only/.test(a) && /It ran at 31 packs a minute last Tuesday\.\s+the assistant’s reading — the figure 31 is not in what it was told/.test(a) && /Nothing recorded says why\.\s+not known/.test(a), '7a the rest by the assistant, a figure it was not told never shown as known', a);

/* 8 — the method report */
const dir = mkdtempSync(join(tmpdir(), 'methods-design-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Method report' }).click()]);
const f = join(dir, 'report.pdf'); await dl.saveAs(f);
const pdf = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
ok(/What it measures/.test(pdf) && /Packs per minute: 36 packs\/min before, 44 packs\/min now/.test(pdf), '8 the report: what it measures, before → now');
ok(/What has happened/.test(pdf) && /Moved from version 1 to version 2/.test(pdf), '8a and what has happened — the move among it');

/* 9 — Faultline's SMED method adapted, started on a line, a SMED study attached */
const lineId = await page.evaluate(async () => (await (await import('/src/db.ts')).createWorkspace('Line 4')).id);
await page.goto(`${BASE}/#/methods`); await page.waitForTimeout(1800);
ok(await page.locator('.fw-card.is-library').count() === 6 && /From Faultline’s library/.test(await txt()), '9 Faultline’s library on Methods, beside your own');
await page.getByLabel('Find a method', { exact: true }).fill('changeover');
ok(await page.locator('.fw-card.is-library').count() === 1, '9a found by a word');
await page.locator('.fw-card[data-library="changeover-reduction"]').getByRole('button', { name: 'Adapt it' }).click(); await page.waitForTimeout(1500);
const p9 = await proposed();
ok(/Changeover reduction \(SMED\)/.test(p9) && /Time the changeover as it is · once · measured · with SMED/.test(p9) && /Changeover minutes · at most 9 min/.test(p9), '9b SMED’s method: its steps done with SMED, its measure at single-digit minutes', p9);
await box().fill('Our target on Line 4 is 7 minutes.');
await page.getByRole('button', { name: 'Change it' }).click(); await page.waitForTimeout(1500);
ok(/Measure “Changeover minutes”: at most 7 min \(was at most 9 min\)/.test(await talk()), '9c adapted in words — the target changed, said');
await page.getByRole('button', { name: 'Approve it and start a project' }).click(); await page.waitForTimeout(1800);
await page.getByLabel("The project's name", { exact: true }).fill('Line 4 changeovers');
await page.getByLabel('On which line', { exact: true }).selectOption(lineId);
await sheet().getByRole('button', { name: 'Start it' }).click();
await page.locator('.ln-tile', { hasText: 'Changeover minutes' }).first().waitFor({ timeout: 15000 }).catch(() => {});
ok(/Line 4 changeovers/.test(await txt()) && /Changeover minutes/i.test(await tile2()), '9d started on Line 4, the measure its first tile', `${await tile2()} | ${(await txt()).slice(0, 200)}`);
async function tile2() { return (await page.locator('.ln-tile', { hasText: 'Changeover minutes' }).first().innerText().catch(() => '')).replace(/\s+/g, ' '); }
/* a SMED of the bagger on Line 4, timed: 2 min external, 40 min internal */
await page.evaluate(async lid => {
  const db = await import('/src/db.ts');
  const t = Date.now();
  await db.putStudy({ id: 'smed-acc', tool: 'changeover', name: 'Bagger 45 → 60', workspaceId: lid, product: 'Bagger 60', uses: [], startedAt: t, createdAt: t, updatedAt: t,
    facts: { fromProduct: 'Bagger 45', toProduct: 'Bagger 60', sequence: [
      { id: 'e1', order: 0, name: 'Fetch the change parts', sec: 120, side: 'external', source: 'timed' },
      { id: 'e2', order: 1, name: 'Change the former', sec: 1500, side: 'internal', source: 'timed' },
      { id: 'e3', order: 2, name: 'Set the jaws', sec: 900, side: 'internal', source: 'timed' },
    ] } });
}, lineId);
await page.locator('.fw-row[data-step="time-now"]').click();
await sheet().locator('.fw-tool-c[data-study="smed-acc"]').waitFor({ timeout: 15000 }).catch(() => {});
ok(/Answered by SMED/i.test(await sheetTxt()) && /SMED — Bagger 45 → 60/.test(await sheetTxt()), '9e the step offers the SMED studies on its line', await sheetTxt());
/* started from the step: SMED's own New on the job's line, saying the step it
   answers; made there, it is attached to the step, said with Undo */
const jobUrl = page.url().split('?')[0];
await sheet().getByRole('button', { name: 'Start a SMED on the line' }).click();
await page.locator('.fw-asking').waitFor({ timeout: 15000 }).catch(() => {});
const asking = (await page.locator('.fw-asking').innerText().catch(() => '')).replace(/\s+/g, ' ');
/* the picker fills from Your factory a moment after the sheet opens */
await page.waitForFunction(lid => [...document.querySelectorAll('[role=dialog] select[aria-label="Which line"]')].some(x => x.value === lid), lineId, { timeout: 10000 }).catch(() => {});
const onLine9 = await sheet().getByLabel('Which line', { exact: true }).inputValue().catch(e => `(${e.message.split('\n')[0]})`);
ok(/#\/smed\?add=1&line=/.test(page.url()) && /For “Time the changeover as it is” on Line 4 changeovers — it is attached to that step once it is made/.test(asking)
  && onLine9 === lineId, '9e1 SMED’s own New, on the job’s line, saying which step it answers', `${page.url()} | ${asking} | line ${onLine9} (want ${lineId})`);
await page.getByLabel('From which product?').fill('Bagger 60');
await page.getByLabel('To which product?').fill('Bagger 45');
await page.getByRole('button', { name: 'Start it' }).click();
await page.locator('.toast', { hasText: 'Attached to' }).waitFor({ timeout: 15000 }).catch(() => {});
const toast = (await page.locator('.toast').innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/#\/smed\/[^/?]+/.test(page.url()) && /Attached to “Time the changeover as it is” on Line 4 changeovers/.test(toast) && /Undo/.test(toast), '9e2 made: its page opens, and it is said attached to the step, with Undo', `${page.url()} | ${toast}`);
/* the tool's page opened inside the project (BLUEPRINT §3, the workspace): the step's bar, the project's navigation —
   the bar was open on SMED's list already, and says the study is attached once the step has it */
await page.waitForFunction(() => /Attached to this step/.test(document.querySelector('.fw-stepbar')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
const bar9 = (await page.locator('.fw-stepbar').innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/[?&]for=/.test(page.url()) && /Line 4 changeovers/.test(bar9) && /Time the changeover as it is/.test(bar9) && /Attached to this step — its changeover minutes, internal minutes, external minutes come into it/.test(bar9)
  && /Line 4 changeovers/.test(await page.locator('.nv-rail').innerText().catch(() => '')), '9e2a SMED’s page opens inside the project: the step it answers, what comes into it, the project’s own navigation', `${page.url()} | ${bar9}`);
await settle();
await page.locator('.toast').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
await page.locator('.fw-stepbar').getByRole('button', { name: 'Back to the step ›' }).click();
await sheet().locator('.fw-tool-r').waitFor({ timeout: 15000 }).catch(() => {});
ok(page.url().split('?')[0] === jobUrl && /SMED — Bagger 60 → Bagger 45/.test(await sheetTxt()) && /Take it off the step/.test(await sheetTxt()), '9e3 back to the step, open — answered by the study made from it', `${page.url()} | ${await sheetTxt()}`);
await page.keyboard.press('Escape'); await settle();
ok(/Time the changeover as it is — answered by SMED — Bagger 60 → Bagger 45/.test(await txt()), '9e4 the log says it: answered by the study');
/* nothing timed on it yet — taken off, and the timed one used instead */
await page.locator('.fw-row[data-step="time-now"]').click();
await sheet().getByRole('button', { name: 'Take it off the step' }).click();
await sheet().locator('.fw-tool-c[data-study="smed-acc"]').waitFor({ timeout: 15000 }).catch(() => {});
await sheet().locator('.fw-tool-c[data-study="smed-acc"]').getByRole('button', { name: 'Use this' }).click(); await page.waitForTimeout(1200);
const s9 = await sheetTxt();
ok(/Internal minutes 40 min/.test(s9) && /External minutes 2 min/.test(s9), '9f attached: its figures read by SMED’s own arithmetic', s9);
await sheet().getByRole('button', { name: 'Save the result' }).click(); await page.waitForTimeout(900);
await page.keyboard.press('Escape'); await settle(); await page.waitForTimeout(900);
ok(/min/.test(await tile2()) && /target at most 7 min · not met yet/.test(await tile2()), '9g the measure read from the study — not met yet against 7', await tile2());
await shot('4-smed');

/* 10 — used as it is; copied */
await page.goto(`${BASE}/#/methods`); await page.waitForTimeout(1500);
await page.locator('.fw-card[data-library="line-performance"]').getByRole('button', { name: 'Use it as it is' }).click(); await page.waitForTimeout(1500);
ok(/Line performance — find the cause, prove the fix/.test(await txt()) && /Draft · version 1/.test(await txt()) && /with A shift’s losses/.test(await txt()) && /Lost minutes a shift/.test(await txt()), '10 used as it is: a draft of your own, its tool steps and measures with it');
await page.getByRole('button', { name: 'Make a copy' }).click(); await page.waitForTimeout(1500);
ok(/Line performance — find the cause, prove the fix \(copy\)/.test(await txt()) && /A copy of “Line performance/.test(await txt()), '10a a copy — a method of its own, saying where it came from');

/* 11 — Line capacity as a tool step: Faultline's "Bring a line to its rate" used
   as it is and run on Line 4; the step answered by a product's Line capacity,
   its figures read by lib/capacity — the rate, labour a pack; and one made from
   the step attached as it is made */
await page.evaluate(async lid => {
  const db = await import('/src/db.ts');
  const t = Date.now();
  await db.putStandard({ id: 'cap-acc', projectId: '', workspaceId: lid, product: 'Express 1kg', marks: [], sort: t, createdAt: t, updatedAt: t,
    capacity: { targetPerMin: 60, labour: { people: 4, ratePerHour: 15 }, stations: [
      { id: 'b', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min', source: 'plate' },
      { id: 'w', name: 'Wrapper', kind: 'machine', unit: 'bags', contains: 1, rate: 44, ratePer: 'min', source: 'plate' },
    ] } });
}, lineId);
await page.goto(`${BASE}/#/methods`); await page.waitForTimeout(1500);
await page.locator('.fw-card[data-library="line-rate"]').getByRole('button', { name: 'Use it as it is' }).click(); await page.waitForTimeout(1500);
ok(/Bring a line to its rate/.test(await txt()) && /with Line capacity/.test(await txt()) && /Labour a pack/.test(await txt()), '11 Bring a line to its rate: its steps done with Line capacity, the rate and labour a pack its measures');
await page.getByRole('button', { name: /^Approve version 1$/ }).click(); await page.waitForTimeout(1500);
await page.getByRole('button', { name: 'Start a project on it' }).click(); await page.waitForTimeout(800);
await page.getByLabel("The project's name", { exact: true }).fill('Line 4 to 60 a minute');
await page.getByLabel('On which line', { exact: true }).selectOption(lineId);
await sheet().getByRole('button', { name: 'Start it' }).click();
await page.locator('.fw-row[data-step="capacity-now"]').waitFor({ timeout: 15000 }).catch(() => {});
const capJob = page.url().split('?')[0];
await page.locator('.fw-row[data-step="capacity-now"]').click();
await sheet().locator('.fw-tool-c[data-study="cap-acc"]').waitFor({ timeout: 15000 }).catch(() => {});
ok(/Answered by Line capacity/i.test(await sheetTxt()) && /Line capacity — Express 1kg · Short of its target/.test(await sheetTxt()), '11a the step offers the line’s Line capacities, each with its verdict', await sheetTxt());
/* made from the step: Line capacity's own New, attached as it is made */
await sheet().getByRole('button', { name: 'Start a Line capacity on the line' }).click();
await page.locator('.fw-asking').waitFor({ timeout: 15000 }).catch(() => {});
const ask11 = (await page.locator('.fw-asking').innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/#\/balances\?add=1&line=/.test(page.url()) && /For “Line capacity as it is” on Line 4 to 60 a minute/.test(ask11), '11b Line capacity’s own New, saying the step it answers', `${page.url()} | ${ask11}`);
await page.locator('.lt-new input[list="lt-products"]').fill('Express 1kg — trial');
await page.getByRole('button', { name: 'Make it and balance the line' }).click();
await page.locator('.toast', { hasText: 'Attached to' }).waitFor({ timeout: 15000 }).catch(() => {});
ok(/\/standards\/[^?]+\?at=balance/.test(page.url()) && /Attached to “Line capacity as it is”/.test(await page.locator('.toast').innerText().catch(() => '')), '11c made: its page opens, said attached to the step');
await settle();
await page.locator('.toast').waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
await page.goto(capJob); await page.waitForTimeout(1500);
await page.locator('.fw-row[data-step="capacity-now"]').click();
await sheet().locator('.fw-tool-r').waitFor({ timeout: 15000 }).catch(() => {});
ok(/Line capacity — Express 1kg — trial on Line 4/.test(await sheetTxt()) && /Speeds still to fill in/.test(await sheetTxt()), '11d the step answered by the capacity made from it — its speeds still to fill in', await sheetTxt());
/* taken off, and the line's own capacity used instead */
await sheet().getByRole('button', { name: 'Take it off the step' }).click();
await sheet().locator('.fw-tool-c[data-study="cap-acc"]').waitFor({ timeout: 15000 }).catch(() => {});
await sheet().locator('.fw-tool-c[data-study="cap-acc"]').getByRole('button', { name: 'Use this' }).click(); await page.waitForTimeout(1200);
const c11 = await sheetTxt();
ok(/Line capacity — Express 1kg on Line 4/.test(c11) && /Line rate 44 a minute/.test(c11) && /Short of target 16 a minute/.test(c11) && /Labour a pack 2\.27 pence/.test(c11), '11e attached: the rate, how short, and labour a pack, by Line capacity’s own arithmetic', c11);
await sheet().getByRole('button', { name: 'Save the result' }).click(); await page.waitForTimeout(900);
await page.keyboard.press('Escape'); await settle(); await page.waitForTimeout(900);
const rate = (await page.locator('.ln-tile', { hasText: 'Line rate' }).first().innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/44 a minute/.test(rate), '11f the measure read from the capacity: 44 a minute', rate);

ok(errs.length === 0, `no console errors${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
