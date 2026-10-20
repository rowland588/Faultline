/* THE NEW PRODUCT'S MILESTONE, DRIVEN (docs/BLUEPRINT.md §3; Rowland, 18
 * October: "the real milestone is being able to describe a manufacturing
 * need in plain English and create, execute and report on a working
 * methodology through Faultline").
 *
 * From an empty device, at the front door — home, #/ (the control room at
 * #/room, its own address): the question first,
 * nothing under way, the library and the tools; a need said in plain words
 * with the assistant off — the studio says so and offers the closest
 * methods — and with it on (a recorded answer standing in for Claude, as
 * methods-design does): a proposal, approved and started in one go; the
 * project run — a stage's steps done and its gate passed, the next stage's
 * run measured against its limit and signed — the measure read before and
 * now; the report downloaded and read back; the front door listing the
 * project under way; then one way to start (the new product's change 3):
 * New job on a line leading with the words, then Faultline's established
 * three, then the library — the words taken to the studio with the line,
 * the closest established method offered there and started as a job on
 * that line, a library method approved and started on the line carried
 * through the studio, and the lever tree started from the library page;
 * and the phone.
 *
 *   node scripts/acceptance/front-door.mjs      (SMOKE_BASE, as smoke) */
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

/* the recorded answer: a method for proving a new case packer */
const step = (title, o = {}) => ({ title, per: 'machine', answer: 'done', role: '', passes_if: '', photos: 0, files: 0, due_days: null, after: [], tool: '', fields: [], help: '', ...o });
const cond = (o) => ({ type: 'stepsDone', policy: 'block', step: '', field: '', op: '>=', value: null, value2: null, evidence: 'photo', min: null, measure: '', priority: 'any', due_days: null, label: '', ...o });
const DESIGN = {
  name: 'Case packer to production', purpose: 'A new case packer fitted to the line, run at its agreed speed and signed off before production takes it.', kind: 'stagegate',
  roles: [{ name: 'OEM engineer', side: 'supplier' }, { name: 'Quality', side: 'site' }],
  stages: [
    { name: 'Fit', purpose: 'The case packer in place, guarded and connected.', steps: [step('Case packer fitted', { role: 'OEM engineer' }), step('Guards on', { role: 'OEM engineer' })], gate: [cond({})] },
    { name: 'Prove', purpose: 'Run at the agreed speed and signed.', steps: [
      step('Performance run', { per: 'line', answer: 'measure', role: 'OEM engineer', passes_if: '20 cases a minute for an hour', fields: [{ label: 'Cases per minute', type: 'reading', unit: 'cases/min', min: 20, max: null, options: [], formula: '', required: true }] }),
      step('Quality sign-off', { per: 'line', answer: 'signoff', role: 'Quality', after: ['Performance run'] }),
    ], gate: [cond({}), cond({ type: 'fieldMeets', step: 'Performance run', field: 'Cases per minute', op: '>=', value: 20 })] },
  ],
  measures: [{ name: 'Cases per minute', unit: 'cases/min', better: 'higher', target: 20, from: [{ step: 'Performance run', field: 'Cases per minute' }] }],
  assumptions: ['One case packer, on one line.', 'The agreed speed is 20 cases a minute.'],
  questions: ['Who from Quality signs it off?'],
};
let mode = 'off';
const answer = req => {
  const body = JSON.parse(req.postData() ?? '{}');
  if (mode === 'off') return { off: true, why: 'The assistant is not switched on for this app yet — write the method by hand; everything else works the same.' };
  if (body.task === 'design') return { ok: true, proposal: DESIGN, errors: [], warnings: [], left: { calls: 24 } };
  return { ok: false, why: 'unknown task' };
};

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
/* what this script proves was parked on 20 October (docs/DIRECTION.md, lib/parked) — shown here so it stays proved */
await ctx.addInitScript(() => { try { localStorage.setItem('fl-parked-builder', 'shown'); } catch { /* private mode */ } });
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
const talk = async () => (await page.locator('.fw-talk').innerText().catch(() => '')).replace(/\s+/g, ' ');
const settle = async () => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300); };
const NEED = 'We are fitting a new case packer on Line 4. The OEM fits it, it must run at 20 cases a minute, and Quality signs it off before production takes it.';
const door = async () => { await page.goto(`${BASE}/#/`); await page.locator('.fd-ask h1').waitFor({ timeout: 20000 }).catch(() => {}); await page.waitForTimeout(800); };

/* 1 — the front door, on an empty device */
await door();
ok(/What do you need to get done\?/.test(await txt()) && await page.getByLabel('What you need, in your words', { exact: true }).count() === 1, '1 the front door: the question first, and the box to say it in');
ok(/Nothing under way yet/.test(await txt()), '1a nothing under way yet, said');
ok(await page.locator('.fd-lib .fw-card[data-start^="l:"]').count() === 12 && await page.locator('.fd-lib .fw-card[data-start^="e:"]').count() === 3 && await page.locator('.fd-tools li[data-tool]').count() === 10,
  '1b the library to start from (twelve of Faultline’s methods and its three established ones) and the ten tools to use on their own — Line Talk among them (20 October)');
ok((await page.locator('.fd-lib .fw-card[data-start^="e:"] .fw-card-t').allInnerTexts()).join(' · ') === 'Stage gate · 6M · Lever tree', '1b1 the established three by name — the lever tree in the library');
const first = await page.locator('.nv-rail .nv-grp').first().locator('.nv-ri-l').allInnerTexts();
const groupsSaid = await page.locator('.nv-rail .nv-grp-l').allInnerTexts();
ok(first.join(' · ') === 'Home · Projects · Methods' && await page.locator('.nv-rail .nv-ri.is-on').filter({ hasText: 'Home' }).count() === 1
  && ['Control room', 'Your factory', 'Tools'].every(g => groupsSaid.some(x => x.toLowerCase() === g.toLowerCase())),
  '1c one rail off a project: the new product’s places first, Home lit — then the control room, Your factory and the tools', `${first.join(' · ')} | ${groupsSaid.join(' · ')}`);
/* home is the front door; the control room keeps its own address */
await page.locator('.nv-rail .nv-ri', { hasText: /^Control room$/ }).first().click(); await page.waitForTimeout(1500);
ok(/#\/room$/.test(page.url()) && await page.locator('.nv-rail .nv-ri.is-on').filter({ hasText: /^Control room$/ }).count() === 1, '1d the control room at #/room, lit in the rail', page.url());
await page.locator('.nv-mark').click(); await page.waitForTimeout(1200);
ok(/#\/$/.test(page.url()) && /What do you need to get done\?/.test(await txt()), '1e the mark goes home — the front door', page.url());
await page.locator('.nv-job select').selectOption({ label: 'Control room' }); await page.waitForTimeout(1200);
ok(/#\/room$/.test(page.url()), '1f the top bar’s picker still leads with the control room', page.url());
await door();

/* 2 — said in plain words, the assistant off */
await page.getByLabel('What you need, in your words', { exact: true }).fill(NEED);
await page.getByRole('button', { name: 'Start', exact: true }).click();
await page.locator('.fw-turn.is-app').waitFor({ timeout: 15000 }).catch(() => {});
const off = await talk();
ok(/fitting a new case packer on Line 4/.test(off) && /not switched on/.test(off) && /Closest to what you said, to start from and adapt/.test(off), '2 the words go straight into the studio: the assistant off said, the closest methods offered', off);
await page.waitForFunction(() => location.hash === '#/design', null, { timeout: 5000 }).catch(() => {});
ok(/#\/design$/.test(page.url()), '2a the address drops the words once they are sent — going back opens this conversation, not a second', page.url());
ok(await page.locator('.fw-offers button', { hasText: 'Stage gate' }).count() === 1, '2b the stage gate offered to adapt, with no assistant');

/* 3 — said again, the assistant on: a proposal */
mode = 'on';
await door();
await page.getByLabel('What you need, in your words', { exact: true }).fill(NEED);
await page.getByRole('button', { name: 'Start', exact: true }).click();
await page.locator('.fw-proposed').waitFor({ timeout: 15000 }).catch(() => {});
const on = await talk();
ok(/Here is a proposal: “Case packer to production” — 2 stages, 4 steps, measuring cases per minute before and after\./.test(on) && !/not switched on/.test(on), '3 a fresh conversation: the proposal, said — none of the last one carried into it', on);
ok(/1\. Fit/.test(await page.locator('.fw-proposed').innerText()) && /Cases per minute/.test(await page.locator('.fw-proposed').innerText()), '3a the method on the right: its stages and what it measures');
ok(/Or run it as a Stage gate job instead — its own screens — the machines/.test((await page.locator('.fw-est-alt[data-established="commissioning"]').innerText().catch(() => '')).replace(/\s+/g, ' ')),
  '3b beside the proposal, the established Stage gate it could run on instead', await page.locator('.fw-est-alt').innerText().catch(() => 'none'));

/* 4 — approved and started in one go */
await page.getByRole('button', { name: 'Approve it and start a project' }).click();
await sheet().waitFor({ timeout: 15000 }).catch(() => {});
ok(/Start a project on Case packer to production/.test(await sheetTxt()), '4 approved, and straight on to starting a project');
await page.getByLabel("The project's name", { exact: true }).fill('Line 4 case packer');
await page.getByLabel('The machines, one a line', { exact: true }).fill('Case packer');
await sheet().getByRole('button', { name: 'Start it' }).click();
await page.locator('.fw-row[data-step="case-packer-fitted"]').waitFor({ timeout: 15000 }).catch(() => {});
const projUrl = page.url();
ok(/Line 4 case packer/.test(await txt()) && /Case packer to production · version 1/.test(await txt()), '4a the project, running version 1 of the method', (await txt()).slice(0, 300));
const tile = async () => (await page.locator('.ln-tile', { hasText: 'Cases per minute' }).first().innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/not measured yet/.test(await tile()), '4b what it measures is its first tile — not measured yet', await tile());

/* 5 — run: Fit done and its gate passed */
for (const key of ['case-packer-fitted', 'guards-on']) {
  await page.locator(`.fw-row[data-step="${key}"]`).first().click();
  await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(600);
  await page.keyboard.press('Escape'); await settle();
}
await page.locator('.fw-gate-line[data-gate="fit"]').click();
await sheet().getByRole('button', { name: 'Pass the gate' }).click(); await page.waitForTimeout(800);
ok(/passed/i.test(await sheetTxt()), '5 Fit’s steps done, its gate passed', await sheetTxt());
await page.keyboard.press('Escape'); await settle();

/* 6 — Prove: the run measured against its limit, then signed */
await page.locator('.fw-strip .fw-sg[data-stage="prove"]').click(); await page.waitForTimeout(600);
await page.locator('.fw-row[data-step="performance-run"]').click();
await sheet().getByLabel('Cases per minute', { exact: true }).fill('18'); await sheet().getByLabel('Cases per minute', { exact: true }).press('Enter'); await page.waitForTimeout(400);
await sheet().getByRole('button', { name: 'Save the result' }).click(); await page.waitForTimeout(700);
ok(/did not pass/i.test(await sheetTxt()), '6 18 cases a minute is kept — it did not pass its limit of 20');
await sheet().getByRole('button', { name: 'Try again' }).click(); await page.waitForTimeout(600);
await sheet().getByLabel('Cases per minute', { exact: true }).fill('22'); await sheet().getByLabel('Cases per minute', { exact: true }).press('Enter'); await page.waitForTimeout(400);
await sheet().getByRole('button', { name: 'Save the result' }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();
await page.locator('.fw-row[data-step="quality-sign-off"]').click();
await sheet().getByLabel('Signed by', { exact: true }).fill('Priya (Quality)'); await sheet().getByLabel('Signed by', { exact: true }).press('Enter'); await page.waitForTimeout(400);
await sheet().getByRole('button', { name: 'Signed', exact: true }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();
const measured = (await page.locator('.fw-measured').innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/Cases per minute: 18 cases\/min before, 22 cases\/min now — 4 cases\/min better — target at least 20 cases\/min, met\./.test(measured), '6a the measure read from every attempt: before → now, against its target', measured);
await page.locator('.fw-gate-line[data-gate="prove"]').click();
await sheet().getByRole('button', { name: 'Pass the gate' }).click(); await page.waitForTimeout(800);
ok(/passed/i.test(await sheetTxt()), '6b Prove’s gate passed — run at 22 and signed by Quality', await sheetTxt());
await page.keyboard.press('Escape'); await settle();

/* 7 — the report, downloaded and read back */
const dir = mkdtempSync(join(tmpdir(), 'front-door-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Method report' }).click()]);
const f = join(dir, 'report.pdf'); await dl.saveAs(f);
const pdf = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
ok(/Line 4 case packer/.test(pdf) && /Case packer to production/.test(pdf), '7 the report: the project and the method it runs', pdf.slice(0, 300));
ok(/Cases per minute: 18 cases\/min before, 22 cases\/min now/.test(pdf) && /Priya \(Quality\)/.test(pdf), '7a what it measured, before → now, and who signed', pdf.slice(0, 1200));

/* 8 — the front door lists it under way */
await door();
const row = (await page.locator('.fd-jobs li[data-project]').first().innerText().catch(() => '')).replace(/\s+/g, ' ');
ok(/Line 4 case packer/.test(row) && /Case packer to production/.test(row), '8 the front door: the project under way, said in a line by the control room’s own reading', row);
await page.locator('.fd-jobs li[data-project] .lt-row').first().click(); await page.waitForTimeout(1500);
ok(page.url().split('?')[0] === projUrl.split('?')[0], '8a and opened from it', page.url());

/* 9 — one way to start: New job on a line leads with the words, then the
   established three, then the library; the line goes with each way in */
const flat = x => String(x ?? '').replace(/\s+/g, ' ').trim();
mode = 'off';
const L4 = await page.evaluate(async () => (await (await import('/src/lib/lines.ts')).addLineToFactory('Line 4', 'Packing')).id);
const newJobOnLine = async () => {
  await page.goto(`${BASE}/#/lines/${L4}`); await page.getByRole('button', { name: 'Start a job on this line ›' }).waitFor({ timeout: 20000 });
  await page.getByRole('button', { name: 'Start a job on this line ›' }).click(); await page.locator('.proj-new').waitFor({ timeout: 10000 }); await page.waitForTimeout(800);
};
await newJobOnLine();
const form = flat(await page.locator('.proj-new').innerText());
ok(/What are you trying to do on Line 4\?/i.test(form) && await page.locator('.proj-new').getByLabel('What you need, in your words', { exact: true }).count() === 1, '9 New job on a line: the question says the line, and the box to say it in', form.slice(0, 200));
const ys = await page.evaluate(() => ['.proj-say', '.proj-model-grid', '.proj-lib'].map(s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + window.scrollY : null; }));
ok(ys.every(y => y != null) && ys[0] < ys[1] && ys[1] < ys[2], '9a in that order: said in words, then the established three, then the library', JSON.stringify(ys));
const libCards = await page.locator('.proj-lib .fw-card').evaluateAll(els => els.map(e => e.textContent ?? ''));
ok(libCards.length === 13 && /Case packer to production\s*Yours/.test(libCards[0]) && libCards.slice(1).every(t => /From Faultline/.test(t)), '9b the library: the method approved above, yours, first — then Faultline’s twelve', libCards.map(t => t.slice(0, 40)).join(' | '));
const JAMS = 'Line 4 keeps jamming at the case erector and misses its packs a shift — find the cause and prove the fix';
await page.locator('.proj-new').getByLabel('What you need, in your words', { exact: true }).fill(JAMS);
await page.getByRole('button', { name: 'Design it ›' }).click();
await page.locator('.fw-turn.is-app').waitFor({ timeout: 15000 }).catch(() => {});
await page.waitForFunction(() => location.hash === '#/design', null, { timeout: 5000 }).catch(() => {});
ok(/keeps jamming at the case erector/.test(await talk()) && /#\/design$/.test(page.url()), '9c the words straight into the studio, as said', page.url());
ok(flat(await page.locator('.fw-online').innerText().catch(() => '')) === 'On Line 4 — the project it starts is on this line.', '9d the studio says the line it is for', await page.locator('.fw-design .pace-head').innerText().catch(() => ''));
const est = page.locator('.fw-est[data-established="board"]');
ok(await est.count() === 1 && /Or run it as a 6M job — its own screens — the fishbone/.test(flat(await est.innerText())), '9e the closest of the established methods offered beside the library: 6M, on its own screens', await page.locator('.fw-est').innerText().catch(() => ''));
await est.getByRole('button', { name: 'Start a 6M job ›' }).click(); await page.locator('.proj-new').waitFor({ timeout: 10000 }); await page.waitForTimeout(1000);
const picked = await page.locator('.proj-model-opt[aria-pressed="true"] .proj-model-t').allInnerTexts();
const lineOn = await page.locator('.proj-lines .chip[aria-pressed="true"]').allInnerTexts();
ok(picked.join() === 'Make a running line perform better' && lineOn.length === 1 && /^Line 4/.test(lineOn[0]), '9f New job with 6M picked and Line 4 on — the line carried through the studio', `${picked} · ${lineOn}`);
await page.getByLabel('Name', { exact: true }).fill('Line 4 jams');
await page.locator('.proj-new .btn-primary', { hasText: /^Create/ }).click(); await page.waitForFunction(() => /#\/project\//.test(location.hash), null, { timeout: 15000 }).catch(() => {});
const jams = await page.evaluate(async L => {
  const db = await import('/src/db.ts'); const pm = await import('/src/lib/planModel.ts');
  const p = (await db.allProjects()).find(x => x.name === 'Line 4 jams');
  return p ? { model: pm.planModel(p), lines: (await db.loadPaceLines(p.id)).map(l => l.workspaceId === L) } : null;
}, L4);
ok(jams?.model === 'board' && jams.lines.length === 1 && jams.lines[0], '9g a 6M job, on Line 4', JSON.stringify(jams));

/* a method from the library, adapted in the studio and started on the line */
await newJobOnLine();
await page.locator('.proj-lib .fw-card[data-start="l:changeover-reduction"] button').click();
await page.locator('.fw-proposed').waitFor({ timeout: 15000 }).catch(() => {});
ok(flat(await page.locator('.fw-online').innerText().catch(() => '')) === 'On Line 4 — the project it starts is on this line.' && /Faultline’s “Changeover reduction \(SMED\)”, to adapt/.test(await talk()) && await page.locator('.fw-proposed').count() === 1, '9h Faultline’s SMED method from New job: in the studio to adapt, on Line 4');
await page.getByRole('button', { name: 'Approve it and start a project' }).click();
await sheet().waitFor({ timeout: 15000 }).catch(() => {});
ok(await sheet().getByLabel('On which line', { exact: true }).inputValue() === L4, '9i approved, and its start already on Line 4', await sheetTxt());
await page.getByLabel("The project's name", { exact: true }).fill('Line 4 changeovers');
await page.getByLabel('The machines, one a line', { exact: true }).fill('Case erector');
await sheet().getByRole('button', { name: 'Start it' }).click();
await page.waitForFunction(() => /#\/project\//.test(location.hash), null, { timeout: 15000 }).catch(() => {});
const smed = await page.evaluate(async () => (await (await import("/src/db.ts")).allProjects()).find(x => x.name === 'Line 4 changeovers'));
ok(!!smed?.flow && (smed.workspaceIds ?? []).join() === L4, '9j the project on the method, on Line 4', JSON.stringify(smed?.workspaceIds));

/* the lever tree, from the library page */
await page.goto(`${BASE}/#/methods`); await page.locator('.fw-card[data-established]').first().waitFor({ timeout: 15000 }).catch(() => {});
ok(await page.locator('.fw-card[data-established]').count() === 3 && /Faultline’s established methods/.test(await txt()), '9k the library page: Faultline’s established methods, the three');
const treeCard = page.locator('.fw-card[data-established="tree"]');
ok(/Lever tree\s*Its own screens/.test(flat(await treeCard.innerText())) && /Hit a number by a date/.test(await treeCard.innerText()), '9l the lever tree in the library, on its own screens', flat(await treeCard.innerText()));
await treeCard.getByRole('button', { name: 'Start a job on it' }).click(); await page.locator('.proj-new').waitFor({ timeout: 10000 }); await page.waitForTimeout(800);
ok((await page.locator('.proj-model-opt[aria-pressed="true"] .proj-model-t').allInnerTexts()).join() === 'Hit a number by a date', '9m New job with the lever tree picked');
await page.getByLabel('Name', { exact: true }).fill('Line 4 to 30 cases a minute by March');
await page.locator('.proj-lines .chip', { hasText: 'Line 4' }).click();
await page.locator('.proj-new .btn-primary', { hasText: /^Create/ }).click(); await page.waitForFunction(() => /#\/project\//.test(location.hash), null, { timeout: 15000 }).catch(() => {});
const tree = await page.evaluate(async () => { const p = (await (await import("/src/db.ts")).allProjects()).find(x => x.name === 'Line 4 to 30 cases a minute by March'); return p ? (await import('/src/lib/planModel.ts')).planModel(p) : null; });
ok(tree === 'tree', '9n a lever tree job, started from the library', String(tree));
await page.goto(`${BASE}/#/methods`); await page.locator('.fw-card[data-established="tree"]').waitFor({ timeout: 15000 }).catch(() => {});
ok(/1 job on it/.test(await page.locator('.fw-card[data-established="tree"]').innerText()), '9o and the library counts it', await page.locator('.fw-card[data-established="tree"]').innerText());

/* 10 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
await newJobOnLine();
const fitNew = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
ok(fitNew, '10 New job on a phone: nothing off the side');
await door();
const fit = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const box = await page.getByLabel('What you need, in your words', { exact: true }).boundingBox();
ok(fit && !!box && box.y + box.height < 844, '10a the front door on a phone: nothing off the side, the box on the first screen', JSON.stringify(box));
ok(/Home/.test(await page.locator('.nv-bar').innerText().catch(() => '')), '10b the phone’s bar: Home first');

ok(errs.length === 0, `no console errors${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
