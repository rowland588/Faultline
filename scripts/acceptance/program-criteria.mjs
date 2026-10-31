/* ACCEPTANCE — A PROGRAM PROVED BY THE CRITERIA PICKED FOR IT, SIGNED OFF BY WHO ACCEPTS IT (docs/PROGRAM-GOAL.md).
 *
 * Rowland, 27–28 October: program 5 didn't pass its run on net packs a minute because of lost time that had nothing to
 * do with the trial — "you can fail the overall goal, but it still means that you passed the test"; then "the program
 * has a set role of criteria. So I choose the criteria ... If they pass, I then need to be able to sign off ... me and
 * my colleagues together, but just leave it as signed off, passed."
 *
 * Walked on the seeded project's PR-07 Baking Potatoes 2 kg, as program 5 was:
 *   1  no criteria: one quiet door on its row, + Pick its criteria; its run tested and failed on net alone reads failed,
 *      as a program with none picked always has
 *   2  two criteria picked from the row — a capability study and a reliability study, each made for the program on its
 *      machine — the net run left off; each Not yet; the row says 0 of 2 criteria passed, never FAILED; not proved
 *   3  the studies set up and read (their limits and readings, their MTBF wanted and watch): each Passed with its tool's
 *      own sentence (lib/studyLinks studyLine); the row Ready to sign off; a criterion opens its study
 *   4  signed off by two names on a day: the row Signed off — passed, the program proved on that day by them; the
 *      Programs page's count of done one more
 *   5  the Programs report, the machine's page and its Machine report, Commission's sheet and the commissioning report
 *      each say it signed off, by whom, and what passed it
 *   6  the sign-off taken back: ready again, nothing proved, the criteria kept; signed again
 *   7  on a phone: the criteria and the sign-off fit, nothing off the side
 *   8  the audit's tools (30 October — Rowland: "Five tools in the criteria picker — what are you saying, we only have 5
 *      tools built? We should have many more that offer a verdict?"): the picker offers seven chips and says what each
 *      judges; a SMED made for the program, the minutes it must come in at set on the SMED itself (not yet while unset,
 *      Passed within them, Didn't pass over them); a line balance timed on a product's line standard (made from the
 *      picker, or picked once timed — Not yet without a takt, Passed within takt, Didn't pass over it); a figures-only
 *      analysis question never passes; the program's pill, its sign-off line and the Programs report moving with
 *      each; on a phone the seven chips wrap and nothing is off the side
 *   9  the second slice (the coordinator's, 30 October: "build every tool that offers a verdict"): the picker's eleven
 *      choices; a product's Line capacity — kept on its line standard, picked once written or started on a product with
 *      no stations, Passed meeting its target (66 a minute against 60), Didn't pass 4 short of 70, Not yet with no stations,
 *      the criterion opening it; work sampling against the work share typed on the study (margins counted: 90% ±8 meets 80,
 *      50% misses it); a loss count against the most a shift may lose (85 min within 90, over by 25 against 60); a check log
 *      judged by a count not the clock (the latest 3 of every check, a failure standing); each Not yet with a reason until
 *      its target is typed; the sign-off line, the Programs report, the Machine report, the commissioning report and
 *      Commission's sheet saying each; the phone */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { find, paper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'pcrit-'));
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const pdf = f => flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
let failed = 0;
const ok = (c, m, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) failed++; };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => {
  if (m.type() === 'error' && !IGNORE.test(m.text())) {
    errors.push(`console: ${m.text().slice(0, 200)}`);
    /* a React warning's own words are in its arguments (a duplicate key's key, the component) */
    void Promise.all(m.args().slice(0, 4).map(a => a.jsonValue().catch(() => '?'))).then(v => errors.push(`  args: ${JSON.stringify(v.slice(1)).slice(0, 500)}`));
  }
});
/* a sheet closed just before takes its history entry off a moment later (ui/backCloses) — wait for it (CLAUDE.md) */
const go = async h => {
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 5000 }).catch(() => {});
  await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2500);
};
/* the Programs page opens on Needs you (28 October): a signed-off program is not among them, so All is pressed to see its row */
const goPrograms = async () => { await go(PROGRAMS); await page.locator('button.pp-chip', { hasText: /^All\b/ }).first().click({ timeout: 4000 }).catch(() => {}); await page.waitForTimeout(600); };
/* the criteria are in the Prove fold, compact until opened (C5): opened to see their rows and the way back from a sign-off */
const openProve = async () => { const h = row().locator('.pgr-prove-h').first(); if (await h.count() && (await h.getAttribute('aria-expanded')) !== 'true') await h.click(); await page.waitForTimeout(500); };
/* wait for a row to read what it will read: the page redraws on the data change a moment after the write */
const settle = async check => { for (let i = 0; i < 24; i++) { if (await check().catch(() => false)) return true; await page.waitForTimeout(500); } return false; };
const download = async (label, file, within = page.locator('body')) => {
  const b = await find(page, 'Report', label, within);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), b.click({ timeout: 60000 })]);
  const f = join(OUT, file); await dl.saveAs(f); return f;
};

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PID = sd.projectId, NAME = 'PR-07 Baking Potatoes 2 kg', PROGRAMS = `#/project/${PID}/programs`;
const today = await page.evaluate(async () => (await import('/src/lib/weeks.ts')).todayISO());
const nice = await page.evaluate(async d => (await import('/src/lib/weeks.ts')).niceDay(d), today);
const record = () => page.evaluate(async ([pid, name]) => (await (await import('/src/db.ts')).listPrograms(pid)).find(p => p.what === name), [PID, NAME]);
const row = () => page.locator('li.pgr', { has: page.locator('.pgr-name', { hasText: NAME }) }).first();
const pill = async () => flat(await row().locator('.pgr-top .status-pill').first().innerText());
const done = async () => Number(/(\d+) done/.exec(flat(await page.locator('.nv-main').innerText()))?.[1] ?? NaN);

/* ---- 1 no criteria: one door; its run failed on net alone reads failed, as always ---- */
await goPrograms();
ok(await row().locator('.pgc-empty .pgc-add', { hasText: '+ Pick its criteria' }).count() === 1 && await row().locator('.pgc-list').count() === 0,
  '1 no criteria picked: one quiet door on its row — + Pick its criteria — and no list');
await row().getByRole('button', { name: /^Test it$/ }).click(); await page.waitForTimeout(500);
await row().getByRole('button', { name: 'Didn’t pass', exact: true }).click();
for (const [k, v] of Object.entries({ 'Aiming for': '75', 'Aiming to run': '60', 'Net rate target': '55', 'Set at': '75', 'Ran for': '60', 'Packs': '3300', 'Rejects': '48' }))
  await row().locator(`input[aria-label^="${k}"]`).first().fill(v);
await row().getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(3000);
const split1 = flat(await row().locator('.ptx-split').first().innerText().catch(() => ''));
ok(/didn.t pass/i.test(await pill()) && /net rate alone/.test(split1), `1b its run failed on net alone (${split1}) — the row reads didn’t pass, as with no criteria it always has: "${await pill()}"`);
/* testing a program kept only on the list makes its line on the machine's programs stage a moment later, and its row is
   drawn again under that line (ui/ProgramRow) — the page read afresh once it has */
await page.waitForTimeout(2000); await goPrograms();
const doneBefore = await done();
let rec;

/* ---- 1c a study already passed on its test — shown first, one tap as a criterion (program 5, 28 October) ---- */
const proofId = await page.evaluate(async ([pid, name]) => {
  const db = await import('/src/db.ts');
  const { uid, now } = await import('/src/lib/ids.ts');
  const p = (await db.listPrograms(pid)).find(x => x.what === name);
  const t = (await db.listTests(pid)).find(x => x.programId === p?.id && x.outcome === 'failed');
  if (!p || !t) return null;
  const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
    401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
  const id = uid();
  const at = now();
  await db.putStudy({ id, tool: 'capability', name: 'Express 75 ppm — already passed', projectId: pid, workspaceId: p.workspaceId,
    machine: 'Ilapak flow wrapper', agreed: { readings: { kind: 'limits', unit: 'g', nominal: 400, lower: 395, upper: 408, count: 30 } },
    facts: { readings: THIRTY.map((value, i) => ({ id: `r${i}`, value, at: at + i })) },
    uses: [{ id: uid(), kind: 'test', ref: t.id, role: 'proof', at, by: 'acceptance' }],
    startedAt: at, createdAt: at, updatedAt: at });
  return id;
}, [PID, NAME]);
ok(proofId, '1c a capability study passed and lined up on the failed run as Proved by');
await page.waitForTimeout(1500); await goPrograms();
ok(await row().locator('.pgc-proof-all').count() === 1, '1c its row offers the proving study as criteria in one go');
await row().locator('.pgc-add').click(); await page.waitForTimeout(400);
ok(await row().locator('.pgc-existing .pgc-row .status-pill', { hasText: 'Passed' }).count() >= 1,
  '1c Add a criterion shows work already done first — Passed with its tool’s sentence');
await row().locator('.pgc-existing .pgc-open').first().click(); await page.waitForTimeout(2000);
rec = await record();
ok(rec?.criteria?.length === 1 && rec.criteria[0].kind === 'study' && rec.criteria[0].id === proofId,
  `1c the passed study is a criterion on the record — ${proofId}`);
ok(/ready to sign off|1 of 1 criteria passed/i.test(await pill()) && !/didn.t pass|^failed/i.test(await pill()),
  `1c the net run still failed but the program is judged by the tool — "${await pill()}"`);
await row().locator('.pgc-x').click(); await page.waitForTimeout(1500);
rec = await record();
ok(!rec?.criteria?.length, '1c criterion taken off again for the walk that follows');

/* ---- 2 two criteria picked: a capability study and a reliability study, the net run left off ---- */
await row().locator('.pgc-add').click(); await page.waitForTimeout(400);
const startNewCap = row().getByRole('button', { name: /Start a new capability study instead/i });
if (await startNewCap.count()) await startNewCap.click();
await page.waitForTimeout(200);
const chips = (await row().locator('.pgc-panel [role=radio]').allInnerTexts()).map(flat);
ok(JSON.stringify(chips) === JSON.stringify(['Capability study', 'Control chart', 'Reliability study', 'Analysis', 'SMED', 'Line balance', 'Line capacity', 'Work sampling', 'Loss count', 'Check log', 'Run test']),
  `2 Add a criterion offers every tool that ends in a verdict against a stated target (the 30 October audit), and its run test — ${chips.join(' · ')}`);
await row().locator('input[aria-label="Name the study"]').fill('Placement 75 ppm');
await row().getByRole('button', { name: 'Add it, set up later' }).click(); await page.waitForTimeout(1500);
await row().getByRole('button', { name: 'Add a criterion' }).click(); await page.waitForTimeout(300);
await row().locator('.pgc-panel [role=radio]', { hasText: 'Reliability study' }).click();
const startNewRel = row().getByRole('button', { name: /Start a new reliability study instead/i });
if (await startNewRel.count()) await startNewRel.click();
await page.waitForTimeout(200);
await row().locator('input[aria-label="Name the study"]').fill('Robot faults');
await row().getByRole('button', { name: 'Add it, set up later' }).click(); await page.waitForTimeout(1800);
rec = await record();
const crit = (await row().locator('.pgc-row').evaluateAll(els => els.map(e => ({ t: e.querySelector('.pgc-t')?.textContent ?? '', w: e.querySelector('.status-pill')?.textContent ?? '' }))));
ok(rec?.criteria?.length === 2 && rec.criteria.every(c => c.kind === 'study') && JSON.stringify(crit) === JSON.stringify([{ t: 'Capability study — Placement 75 ppm', w: 'Not yet' }, { t: 'Reliability study — Robot faults', w: 'Not yet' }]),
  `2b the two criteria on the record and on its row, each Not yet — ${crit.map(c => `${c.t}: ${c.w}`).join(' · ')}`);
const studies = await page.evaluate(async ids => { const db = await import('/src/db.ts'); return Promise.all(ids.map(id => db.getStudy(id))); }, rec.criteria.map(c => c.id));
ok(studies.every(s => s && s.programId === rec.id && s.projectId === PID && s.machine === 'Ilapak flow wrapper') && studies[0].tool === 'capability' && studies[1].tool === 'reliability',
  `2c each a study made for the program, on its project and its machine — ${studies.map(s => `${s?.tool} on ${s?.machine}`).join(', ')}`);
ok(/0 of 2 criteria passed/.test(await pill()) && !/didn.t pass|failed/i.test(await pill()) && !rec.provedOn,
  `2d the net run is not a criterion — the row says where its criteria stand, not FAILED: "${await pill()}"; not proved`);

/* ---- 3 the studies set up and read: each Passed with its tool's own sentence; ready to sign off ---- */
await page.evaluate(async ids => {
  const db = await import('/src/db.ts');
  const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
    401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];
  const cap = await db.getStudy(ids[0]), rel = await db.getStudy(ids[1]);
  const t0 = Date.now() - 11 * 3_600_000;
  await db.putStudy({ ...cap, agreed: { readings: { kind: 'limits', unit: 'g', nominal: 400, lower: 395, upper: 408, count: 30 } },
    facts: { readings: THIRTY.map((value, i) => ({ id: `r${i}`, value, at: t0 + i })) } });
  await db.putStudy({ ...rel, agreed: { reliability: { counts: [{ id: 'f', name: 'robot fault', targetMin: 60 }] } },
    facts: { watch: [{ id: 'w', from: t0, to: t0 + 10 * 3_600_000 }], events: [{ id: 'e1', at: t0 + 5 * 3_600_000, count: 'f' }] } });
}, rec.criteria.map(c => c.id));
await page.waitForTimeout(2000);
const said = await page.evaluate(async ids => { const db = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts'); return Promise.all(ids.map(async id => L.studyLine(await db.getStudy(id)).text)); }, rec.criteria.map(c => c.id));
const rows3 = await row().locator('.pgc-row').evaluateAll(els => els.map(e => ({ w: e.querySelector('.status-pill')?.textContent ?? '', s: (e.querySelector('.pgc-says')?.textContent ?? '').replace(/\s+/g, ' ').trim() })));
ok(rows3.every(r => r.w === 'Passed') && rows3.map(r => r.s).join('|') === said.map(flat).join('|'),
  `3 each criterion Passed with its tool's own sentence — ${rows3.map(r => r.s.slice(0, 70)).join(' · ')}`);
ok(/ready to sign off — all 2 criteria passed/i.test(await pill()) && await row().getByRole('button', { name: 'Sign off', exact: true }).count() === 1,
  `3b every criterion passed: the row "${await pill()}", and Sign off`);
await row().locator('.pgc-open', { hasText: 'Placement 75 ppm' }).click(); await page.waitForTimeout(1500);
ok(page.url().includes(`/capability/${rec.criteria[0].id}`), `3c a criterion opens its study — ${page.url().split('#')[1]}`);
await goPrograms();

/* ---- 4 signed off by two names on a day ---- */
await row().getByRole('button', { name: 'Sign off', exact: true }).click(); await page.waitForTimeout(300);
await row().locator('input[aria-label="Who is signing it off"]').fill('R. Glew, J. Smith');
ok(await row().locator('input[aria-label="The day it is signed off"]').inputValue() === today, `4 Sign off asks who and the day — today by default (${today})`);
await row().getByRole('button', { name: 'Signed off — passed', exact: true }).click(); await page.waitForTimeout(2500);
rec = await record();
ok(rec.signedOff && JSON.stringify(rec.signedOff.by) === JSON.stringify(['R. Glew', 'J. Smith']) && rec.signedOff.on === today && rec.provedOn === today && rec.state === 'proved',
  `4b the program signed off — by ${rec.signedOff?.by?.join(' and ')} on ${rec.signedOff?.on}, proved ${rec.provedOn}`);
ok((await pill()) === `signed off — passed ${nice}` && flat(await row().locator('.pgc-v').innerText()) === `Signed off — passed ${nice} by R. Glew and J. Smith`
  && await row().getByRole('button', { name: 'Take the sign-off back' }).count() === 1,
  `4c its row: "${await pill()}" · its criteria "${flat(await row().locator('.pgc-v').innerText())}", and the way back`);
ok(await done() === doneBefore + 1, `4d the Programs page counts it done — ${doneBefore} → ${await done()}`);
const passedIt = await page.evaluate(async ([pid, name]) => {
  const db = await import('/src/db.ts'); const C = await import('/src/lib/programCriteria.ts');
  const p = (await db.listPrograms(pid)).find(x => x.what === name);
  return C.passedItLine(p, C.criteriaOf(p, await db.listAllStudies(), await db.listTests(pid)));
}, [PID, NAME]);
ok(/^Signed off — passed .+ by R\. Glew and J\. Smith · Placement 75 ppm: Passed \(.+\) · Robot faults: .+/.test(passedIt), `4e what passed it, in one line: "${passedIt}"`);

/* ---- 5 every place it shows ---- */
{
  const t = pdf(await download('Programs report', 'programs.pdf'));
  ok(t.includes(`Signed off — passed ${nice} by R. Glew and J. Smith`) && t.includes('Passed — Capability study — Placement 75 ppm') && t.includes('Passed — Reliability study — Robot faults'),
    '5 the Programs report: signed off, by whom, and each criterion with its answer', t.slice(t.indexOf('PR-07'), t.indexOf('PR-07') + 600));
}
{
  await go(`#/project/${PID}/machines`);
  await page.locator('.nv-main').getByText('Ilapak flow wrapper', { exact: false }).first().click(); await page.waitForTimeout(2500);
  const m = flat(await page.locator('.nv-main').innerText());
  ok(m.includes(`signed off — passed ${nice}`), `5b the machine's page says it signed off — ${m.slice(m.indexOf('PR-07'), m.indexOf('PR-07') + 120)}`);
  const t = pdf(await download('Machine report', 'machine.pdf'));
  ok(t.includes(`Signed off — passed ${nice} by R. Glew and J. Smith`) && t.includes('Placement 75 ppm'), '5c its Machine report says it, and what passed it', t.slice(t.indexOf('PR-07'), t.indexOf('PR-07') + 500));
}
{
  await go(`#/project/${PID}/testing`);
  const cell = page.locator('.nv-main button[aria-label^="Ilapak flow wrapper — programs"]').first();
  await cell.click(); await page.waitForTimeout(1200);
  const sheet = page.locator('[role=dialog]').last();
  const li = flat(await sheet.locator('li', { hasText: NAME }).first().innerText().catch(() => ''));
  ok(li.includes(`signed off — passed ${nice}`), `5d Commission's sheet of the machine's programs: "${li.slice(0, 160)}"`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  await go(`#/project/${PID}/report?doc=commissioning`);
  const t = pdf(await download('Download', 'commissioning.pdf'));
  ok(t.includes(`Criteria: Signed off — passed ${nice} by R. Glew and J. Smith`) && t.includes('Passed — Reliability study — Robot faults'), '5e the commissioning report: its criteria and the sign-off', t.slice(t.indexOf('PR-07'), t.indexOf('PR-07') + 500));
}

/* ---- 6 taken back, signed again ---- */
await goPrograms(); await openProve();
await row().getByRole('button', { name: 'Take the sign-off back' }).click(); await page.waitForTimeout(2000);
rec = await record();
ok(!rec.signedOff && !rec.provedOn && rec.criteria?.length === 2 && /ready to sign off/i.test(await pill()), `6 the sign-off taken back: "${await pill()}", nothing proved, both criteria kept`);
await row().getByRole('button', { name: 'Sign off', exact: true }).click(); await page.waitForTimeout(300);
await row().locator('input[aria-label="Who is signing it off"]').fill('R. Glew');
await row().getByRole('button', { name: 'Signed off — passed', exact: true }).click(); await page.waitForTimeout(2000);
ok((await record()).signedOff?.by?.join() === 'R. Glew' && (await pill()).startsWith('signed off — passed'), '6b signed again, by one name');

/* ---- 8 the tools the 30 October audit added: SMED and a line balance, each with its own verdict ---- */
{
  await goPrograms(); await openProve();
  await row().getByRole('button', { name: 'Take the sign-off back' }).click(); await page.waitForTimeout(2000);
  await row().getByRole('button', { name: 'Add a criterion' }).click(); await page.waitForTimeout(300);
  const chips8 = (await row().locator('.pgc-panel [role=radio]').allInnerTexts()).map(flat);
  ok(chips8.length === 11 && chips8.includes('SMED') && chips8.includes('Line balance'), `8 the picker offers eleven choices, not five — ${chips8.join(' · ')}`);
  await row().locator('.pgc-panel [role=radio]', { hasText: 'SMED' }).click(); await page.waitForTimeout(200);
  const hint8 = flat(await row().locator('.pgc-panel .pgc-judges').first().innerText());
  ok(/SMED judges: the changeover timed against the minutes it must come in at/.test(hint8), `8b each tool says what it judges before anything is made — "${hint8.slice(0, 120)}"`);
  const startNewSmed = row().getByRole('button', { name: /Start a new smed instead/i });
  if (await startNewSmed.count()) await startNewSmed.click();
  await row().locator('input[aria-label="Name the study"]').fill('Changeover to 2 kg');
  await row().getByRole('button', { name: 'Add it, set up later' }).click(); await page.waitForTimeout(1800);
  rec = await record();
  const smedId = rec.criteria.map(c => c.id).find(id => id !== rec.criteria[0].id && id !== rec.criteria[1].id);
  const smed = await page.evaluate(id => import('/src/db.ts').then(db => db.getStudy(id)), smedId);
  ok(smed?.tool === 'changeover' && smed.programId === rec.id && smed.projectId === PID && smed.machine === 'Ilapak flow wrapper',
    `8c a SMED made for the program, on its project and its machine — ${smed?.tool} on ${smed?.machine}`);
  const smedRow = () => row().locator('.pgc-row', { hasText: 'SMED — Changeover to 2 kg' });
  ok(flat(await smedRow().locator('.status-pill').innerText()) === 'Not yet' && /2 of 3 criteria passed/.test(await pill()) && await row().getByRole('button', { name: 'Sign off', exact: true }).count() === 0,
    `8d it reads Not yet, the row "${await pill()}", and Sign off is gone until it passes`);

  /* its minutes are set on the SMED itself; its elements are timed there (seeded: 10 + 8 minutes with the line stopped) */
  await page.evaluate(async id => {
    const db = await import('/src/db.ts');
    const st = (i, sec) => ({ id: `e${i}`, order: i, name: `Element ${i}`, side: 'internal', sec, source: 'timed' });
    await db.patchStudy(id, cur => ({ facts: { ...cur.facts, sequence: [st(0, 600), st(1, 480)] } }));
  }, smedId);
  await page.waitForTimeout(1500);
  ok(flat(await smedRow().locator('.status-pill').innerText()) === 'Not yet' && /18 min/.test(flat(await smedRow().innerText())),
    `8e timed at 18 minutes with no minutes set it is still Not yet — never a pass on figures alone: "${flat(await smedRow().innerText()).slice(0, 140)}"`);
  await smedRow().locator('.pgc-open').click(); await page.waitForTimeout(2500);
  ok(page.url().includes(`/smed/${smedId}`), `8f the criterion opens the SMED — ${page.url().split('#')[1]}`);
  const box = page.locator('input[aria-label="It must come in at"]');
  ok(await box.count() === 1, '8g the SMED has its box — It must come in at');
  await box.fill('20'); await box.blur(); await page.waitForTimeout(1200);
  const after20 = await page.evaluate(id => import('/src/db.ts').then(db => db.getStudy(id)), smedId);
  ok(after20.agreed?.changeover?.minutes === 20, `8h the minutes are kept on the study — ${JSON.stringify(after20.agreed)}`);
  await goPrograms(); await openProve();
  let sa = flat(await smedRow().innerText());
  ok(flat(await smedRow().locator('.status-pill').innerText()) === 'Passed' && /Within the 20 min standard/.test(sa), `8i 18 min within 20: Passed with the SMED's own sentence — "${sa.slice(0, 160)}"`);
  ok(/ready to sign off — all 3 criteria passed/i.test(await pill()), `8j every criterion passed: "${await pill()}"`);
  await smedRow().locator('.pgc-open').click(); await page.waitForTimeout(2500);
  await page.locator('input[aria-label="It must come in at"]').fill('15'); await page.locator('input[aria-label="It must come in at"]').blur(); await page.waitForTimeout(1200);
  await goPrograms(); await openProve();
  sa = flat(await smedRow().innerText());
  ok(flat(await smedRow().locator('.status-pill').innerText()) === 'Didn’t pass' && /Over the 15 min standard by 3 min/.test(sa) && /2 of 3 criteria passed · 1 didn.t pass/.test(await pill()),
    `8k the minutes changed to 15: Didn’t pass, over by 3 min, the row "${await pill()}"`);
  await smedRow().locator('.pgc-open').click(); await page.waitForTimeout(2500);
  await page.locator('input[aria-label="It must come in at"]').fill('20'); await page.locator('input[aria-label="It must come in at"]').blur(); await page.waitForTimeout(1200);
  await goPrograms(); await openProve();

  /* a line balance: timed on a product's line standard, made from the picker */
  await row().getByRole('button', { name: 'Add a criterion' }).click(); await page.waitForTimeout(300);
  await row().locator('.pgc-panel [role=radio]', { hasText: 'Line balance' }).click(); await page.waitForTimeout(800);
  const stds = (await row().locator('.pgc-panel [aria-label="Time a new line balance on a product"] .chip').allInnerTexts()).map(flat);
  ok(stds.includes('Finest Red 2kg') && stds.includes('Tesco Express 1.25 kg'), `8l Line balance offers the project's line standards to time it on — ${stds.join(' · ')}`);
  /* one already timed in the project is offered to pick */
  const timedId = await page.evaluate(async ([pid, sid]) => {
    const db = await import('/src/db.ts'); const { uid, now } = await import('/src/lib/ids.ts');
    const id = uid(), at = now();
    const t = (i, who, sec) => ({ id: `t${i}`, order: i, name: `Task ${i}`, who, typedSec: sec });
    await db.putStudy({ id, tool: 'balance', name: 'Finest Red 2kg — timed Tuesday', projectId: pid, standardId: sid, agreed: { balance: { taktSec: 12 } },
      facts: { steps: [t(0, 'Op 1', 10), t(1, 'Op 2', 8)] }, uses: [], startedAt: at, createdAt: at, updatedAt: at });
    return id;
  }, [PID, sd.standardId]);
  await page.waitForTimeout(1500);
  const picks = (await row().locator('.pgc-panel [aria-label="Line balances already timed here"] .chip').allInnerTexts()).map(flat);
  ok(picks.length === 1 && /Finest Red 2kg — timed Tuesday · Passed/.test(picks[0]), `8m a balance already timed in the project is offered, with its answer — ${picks.join(' · ')}`);
  await row().locator('.pgc-panel [aria-label="Line balances already timed here"] .chip').first().click(); await page.waitForTimeout(1800);
  const balRow = () => row().locator('.pgc-row', { hasText: 'Line balance — Finest Red 2kg — timed Tuesday' });
  sa = flat(await balRow().innerText());
  ok(flat(await balRow().locator('.status-pill').innerText()) === 'Passed' && /takt/.test(sa), `8n picked: Line balance Passed within takt — "${sa.slice(0, 160)}"`);
  /* over takt */
  await page.evaluate(async id => {
    const db = await import('/src/db.ts');
    await db.patchStudy(id, cur => ({ facts: { ...cur.facts, steps: cur.facts.steps.map((x, i) => (i === 0 ? { ...x, typedSec: 14 } : x)) } }));
  }, timedId);
  await page.waitForTimeout(1500);
  sa = flat(await balRow().innerText());
  ok(flat(await balRow().locator('.status-pill').innerText()) === 'Didn’t pass' && /Op 1 carries/.test(sa), `8o a person over takt: Didn’t pass, said who — "${sa.slice(0, 160)}"`);
  await balRow().locator('.pgc-x').click(); await page.waitForTimeout(1500);
  ok(!(await balanceGone()), '8p taken off the criteria — the balance study is kept');
  async function balanceGone() { return !(await page.evaluate(id => import('/src/db.ts').then(db => db.getStudy(id)), timedId)); }
  /* made from the picker on the product's line standard: opens there, Not yet until it has a takt and times */
  await row().getByRole('button', { name: 'Add a criterion' }).click(); await page.waitForTimeout(300);
  await row().locator('.pgc-panel [role=radio]', { hasText: 'Line balance' }).click(); await page.waitForTimeout(800);
  await row().locator('.pgc-panel [aria-label="Time a new line balance on a product"] .chip', { hasText: 'Finest Red 2kg' }).click(); await page.waitForTimeout(2500);
  rec = await record();
  const madeId = rec.criteria.map(c => c.id).find(id => ![rec.criteria[0].id, rec.criteria[1].id, smedId].includes(id));
  const made = await page.evaluate(id => import('/src/db.ts').then(db => db.getStudy(id)), madeId);
  ok(made?.tool === 'balance' && made.programId === rec.id && made.projectId === PID && made.standardId === sd.standardId && made.machine === 'Ilapak flow wrapper' && (made.facts.steps ?? []).length === 2,
    `8q a line balance made for the program from the product's line standard — its two people the elements, on the machine`);
  ok(page.url().includes(`/standard/${sd.standardId}`) && page.url().includes(`study=${madeId}`), `8r it opens on the standard's People view — ${page.url().split('#')[1]}`);
  await goPrograms(); await openProve();
  const made8 = row().locator('.pgc-row', { hasText: 'Line balance — Finest Red 2kg' });
  ok(flat(await made8.locator('.status-pill').innerText()) === 'Not yet', `8s untimed and with no takt it is Not yet — "${flat(await made8.innerText()).slice(0, 120)}"`);
  await page.evaluate(async id => {
    const db = await import('/src/db.ts');
    await db.patchStudy(id, cur => ({ agreed: { balance: { taktSec: 12 } }, facts: { ...cur.facts, steps: cur.facts.steps.map((x, i) => ({ ...x, typedSec: i ? 8 : 10 })) } }));
  }, madeId);
  await settle(async () => /ready to sign off — all 4 criteria passed/i.test(await pill()));
  ok(flat(await made8.locator('.status-pill').innerText()) === 'Passed' && /ready to sign off — all 4 criteria passed/i.test(await pill()), `8t timed within a 12 s takt: Passed — the row "${await pill()}"`);

  /* a figures-only analysis question can never pass */
  const sureId = await page.evaluate(async ([pid, prog]) => {
    const db = await import('/src/db.ts'); const { uid, now } = await import('/src/lib/ids.ts');
    const id = uid(), at = now();
    await db.putStudy({ id, tool: 'analysis', name: 'How sure is the fill', projectId: pid, programId: prog,
      agreed: { analysis: { kind: 'sure', name: 'Fill weight', unit: 'g' } },
      facts: { readings: [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4].map((value, i) => ({ id: `s${i}`, at: at + i, value })) }, uses: [], startedAt: at, createdAt: at, updatedAt: at });
    const p = (await db.listPrograms(pid)).find(x => x.id === prog);
    await db.putProgram({ ...p, criteria: [...p.criteria, { kind: 'study', id }] });
    return id;
  }, [PID, rec.id]);
  await page.waitForTimeout(1800);
  const sureRow = row().locator('.pgc-row', { hasText: 'Analysis — How sure is the fill' });
  sa = flat(await sureRow.innerText());
  ok(flat(await sureRow.locator('.status-pill').innerText()) === 'Not yet' && /gives figures, not a pass or fail/.test(sa) && await row().getByRole('button', { name: 'Sign off', exact: true }).count() === 0,
    `8u an analysis that only gives figures never passes — Not yet, said, no Sign off — "${sa.slice(0, 200)}"`);
  await sureRow.locator('.pgc-x').click(); await page.waitForTimeout(1500);
  void sureId;

  /* signed off with the new tools among its criteria: the sign-off line, the report */
  await row().getByRole('button', { name: 'Sign off', exact: true }).click(); await page.waitForTimeout(300);
  await row().locator('input[aria-label="Who is signing it off"]').fill('R. Glew, J. Smith');
  await row().getByRole('button', { name: 'Signed off — passed', exact: true }).click(); await page.waitForTimeout(2500);
  const line8 = await page.evaluate(async ([pid, name]) => {
    const db = await import('/src/db.ts'); const C = await import('/src/lib/programCriteria.ts');
    const p = (await db.listPrograms(pid)).find(x => x.what === name);
    return C.passedItLine(p, C.criteriaOf(p, await db.listAllStudies(), await db.listTests(pid)));
  }, [PID, NAME]);
  ok(/Changeover to 2 kg: Within the 20 min standard/.test(line8) && /Finest Red 2kg: Within takt/.test(line8), `8v what passed it names the new tools' verdicts: "${line8}"`);
  const t8 = pdf(await download('Programs report', 'programs8.pdf'));
  ok(t8.includes('Passed — SMED — Changeover to 2 kg') && t8.includes('Passed — Line balance — Finest Red 2kg') && t8.includes('Within the 20 min standard'),
    '8w the Programs report: each new criterion with its answer and the tool’s sentence', t8.slice(t8.indexOf('PR-07'), t8.indexOf('PR-07') + 700));
  await go(`#/project/${PID}/machines`);
  await page.locator('.nv-main').getByText('Ilapak flow wrapper', { exact: false }).first().click(); await page.waitForTimeout(2500);
  const mach8 = pdf(await download('Machine report', 'machine8.pdf'));
  ok(mach8.includes('Changeover to 2 kg') && mach8.includes('Finest Red 2kg'), '8x its Machine report says what passed it, the new tools among them', mach8.slice(mach8.indexOf('PR-07'), mach8.indexOf('PR-07') + 500));
  await go(`#/project/${PID}/report?doc=commissioning`);
  const cm8 = pdf(await download('Download', 'commissioning8.pdf'));
  ok(cm8.includes('Passed — SMED — Changeover to 2 kg') && cm8.includes('Passed — Line balance — Finest Red 2kg'), '8x2 the commissioning report: the new criteria with their answers', cm8.slice(cm8.indexOf('PR-07'), cm8.indexOf('PR-07') + 600));
  await go(`#/project/${PID}/testing`);
  await page.locator('.nv-main button[aria-label^="Ilapak flow wrapper — programs"]').first().click(); await page.waitForTimeout(1200);
  ok(flat(await page.locator('[role=dialog]').last().innerText().catch(() => '')).includes(`signed off — passed ${nice}`), '8x3 Commission’s sheet of the machine’s programs still says it signed off, the new tools among its criteria');
  await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  /* the phone: seven chips wrap, nothing off the side */
  await page.setViewportSize({ width: 375, height: 780 });
  await goPrograms(); await openProve();
  await row().getByRole('button', { name: 'Take the sign-off back' }).click(); await page.waitForTimeout(1500);
  await row().getByRole('button', { name: 'Add a criterion' }).click(); await page.waitForTimeout(400);
  const fit8 = await page.evaluate(name => {
    const li = [...document.querySelectorAll('li.pgr')].find(l => l.querySelector('.pgr-name')?.textContent?.includes(name));
    const chips = [...(li?.querySelectorAll('.pgc-panel [role=radio]') ?? [])].map(c => c.getBoundingClientRect());
    return { n: chips.length, over: document.documentElement.scrollWidth - window.innerWidth, inside: chips.every(r => r.right <= window.innerWidth + 1 && r.left >= -1), rows: new Set(chips.map(r => Math.round(r.top))).size };
  }, NAME);
  ok(fit8.n === 11 && fit8.inside && fit8.over <= 0 && fit8.rows >= 2, `8y on a 375 px phone the eleven chips wrap onto ${fit8.rows} lines, none off the side (${fit8.over}px over)`);
  await row().getByRole('button', { name: 'Cancel' }).first().click().catch(() => {});
  await page.setViewportSize({ width: 1360, height: 900 });
  await goPrograms(); await openProve();
  await row().getByRole('button', { name: 'Sign off', exact: true }).click(); await page.waitForTimeout(300);
  await row().locator('input[aria-label="Who is signing it off"]').fill('R. Glew');
  await row().getByRole('button', { name: 'Signed off — passed', exact: true }).click(); await page.waitForTimeout(2000);
  ok((await pill()).startsWith('signed off — passed'), '8z signed again, with the new tools among its criteria');
}


/* ---- 9 the second slice of the audit: Line capacity, work sampling, a loss count, a check log — each with a target typed where it lives ---- */
{
  await goPrograms(); await openProve();
  await row().getByRole('button', { name: 'Take the sign-off back' }).click(); await page.waitForTimeout(2000);
  const crit9 = () => row().locator('.pgc-row');
  const pill9 = async t => flat(await row().locator('.pgc-row', { hasText: t }).locator('.status-pill').first().innerText());
  const rowText = async t => flat(await row().locator('.pgc-row', { hasText: t }).first().innerText());
  const db = fn => page.evaluate(fn, [PID, NAME]);
  const startNew = async label => { const b = row().getByRole('button', { name: new RegExp(`Start a new ${label} instead`, 'i') }); if (await b.count()) await b.click(); await page.waitForTimeout(200); };
  const add = async chip => { await row().getByRole('button', { name: 'Add a criterion' }).click(); await page.waitForTimeout(300); await row().locator('.pgc-panel [role=radio]', { hasText: chip }).click(); await page.waitForTimeout(500); };

  /* Line capacity: kept on the product's line standard — Bagger 70 a minute, Basketer 12 bags to a basket at 5.5 = 66 a minute */
  const stds = await page.evaluate(async pid => (await (await import('/src/db.ts')).listStandards(pid)).map(x => [x.id, x.product]), PID);
  const FR = stds.find(x => x[1] === 'Finest Red 2kg')[0], TX = stds.find(x => x[1] === 'Tesco Express 1.25 kg')[0];
  const setCap = (target, stations = true) => page.evaluate(async ([id, target, stations]) => {
    const d = await import('/src/db.ts'); const st = await d.getStandard(id);
    const sx = (n, u, o) => ({ id: n, name: n, kind: 'machine', unit: u, contains: 1, ratePer: 'min', ...o });
    await d.putStandard({ ...st, capacity: { stations: stations ? [sx('Bagger', 'bags', { rate: 70 }), sx('Basketer', 'baskets', { contains: 12, rate: 5.5 })] : [], ...(target ? { targetPerMin: target } : {}) } });
  }, [FR, target, stations]);
  await setCap(60);
  await page.evaluate(async id => { const d = await import('/src/db.ts'); const st = await d.getStandard(id); await d.putStandard({ ...st, capacity: { stations: [], targetPerMin: 50 } }); }, TX);
  await page.waitForTimeout(1500);
  await add('Line capacity');
  const hint9 = flat(await row().locator('.pgc-panel .pgc-judges').first().innerText());
  ok(/Line capacity judges: what the line can make, once stops count, against the target/.test(hint9), `9 Line capacity says what it judges — "${hint9.slice(0, 130)}"`);
  const have = (await row().locator('[aria-label="Line capacities already written here"] .chip').allInnerTexts()).map(flat);
  const start = (await row().locator('[aria-label="Start a Line capacity on a product"] .chip').allInnerTexts()).map(flat);
  ok(have.length === 1 && /^Finest Red 2kg · Passed$/.test(have[0]) && start.includes('Tesco Express 1.25 kg') && start.includes('Finest Red 2kg') === false,
    `9b the capacity already written is offered with its answer, one with no stations to start — ${have.join(' · ')} | ${start.join(' · ')}`);
  await row().locator('[aria-label="Line capacities already written here"] .chip').first().click(); await page.waitForTimeout(1800);
  rec = await record();
  ok(rec.criteria.some(c => c.kind === 'capacity' && c.id === FR), `9c it is a criterion of kind capacity on the record — ${JSON.stringify(rec.criteria.filter(c => c.kind === 'capacity'))}`);
  let t9 = await rowText('Line capacity — Finest Red 2kg');
  ok(await pill9('Line capacity — Finest Red 2kg') === 'Passed' && /limits the line at 66/.test(t9) && /above the 60 target/.test(t9), `9d 66 a minute against a target of 60: Passed, the sheet's own sentence — "${t9.slice(0, 170)}"`);
  await setCap(70); await page.waitForTimeout(1500);
  t9 = await rowText('Line capacity — Finest Red 2kg');
  ok(await pill9('Line capacity — Finest Red 2kg') === 'Didn’t pass' && /4 short of the 70 target/.test(t9), `9e the target raised to 70: Didn’t pass, 4 short — "${t9.slice(0, 170)}"`);
  await setCap(60); await page.waitForTimeout(1500);
  await row().locator('.pgc-row', { hasText: 'Line capacity — Finest Red 2kg' }).locator('.pgc-open').click(); await page.waitForTimeout(2200);
  ok(page.url().includes(`/standard/${FR}`) && page.url().includes('at=balance'), `9f the criterion opens the product's Line capacity — ${page.url().split('#')[1]}`);
  await goPrograms(); await openProve();
  /* started on a product with no stations: Not yet, opening there */
  await add('Line capacity');
  await row().locator('[aria-label="Start a Line capacity on a product"] .chip', { hasText: 'Tesco Express 1.25 kg' }).click(); await page.waitForTimeout(2200);
  ok(page.url().includes(`/standard/${TX}`) && page.url().includes('at=balance'), `9g started on a product with no stations: it opens there — ${page.url().split('#')[1]}`);
  await goPrograms(); await openProve();
  ok(await pill9('Line capacity — Tesco Express 1.25 kg') === 'Not yet' && /Add the stations/.test(await rowText('Line capacity — Tesco Express 1.25 kg')), '9h with no stations it is Not yet, and says what to add');
  await row().locator('.pgc-row', { hasText: 'Tesco Express' }).locator('.pgc-x').click(); await page.waitForTimeout(1500);

  /* work sampling: the share of the time on the work, typed on the study */
  await add('Work sampling'); await startNew('work sampling');
  await row().locator('input[aria-label="Name the study"]').fill('Packers, morning');
  await row().getByRole('button', { name: 'Add it, set up later' }).click(); await page.waitForTimeout(1800);
  rec = await record();
  const smpId = rec.criteria[rec.criteria.length - 1].id;
  ok(await pill9('Work sampling — Packers, morning') === 'Not yet', '9i a work sampling made for the program reads Not yet');
  const seedSampling = (working, waiting) => page.evaluate(async ([id, working, waiting]) => {
    const d = await import('/src/db.ts'); const t = Date.now();
    const mk = (w, n) => Array.from({ length: n }, (_, i) => ({ id: `${w}${i}`, at: t - 100_000 + i, who: 'Op 1', activity: w }));
    await d.patchStudy(id, cur => ({ agreed: { sampling: { who: ['Op 1'], activities: ['working', 'waiting'], marginPts: 5, from: t - 8 * 3_600_000, to: t, prompts: Array.from({ length: 40 }, (_, i) => t - 8 * 3_600_000 + i * 600_000), ...(cur.agreed?.sampling?.workAtLeast ? { workAtLeast: cur.agreed.sampling.workAtLeast } : {}) } },
      facts: { ...cur.facts, taps: [...mk('working', working), ...mk('waiting', waiting)] } }));
  }, [smpId, working, waiting]);
  await seedSampling(54, 6); await page.waitForTimeout(1500);
  ok(await pill9('Work sampling — Packers, morning') === 'Not yet' && /No share is wanted yet/.test(await rowText('Work sampling — Packers, morning')), '9j 54 of 60 working but no share wanted: shares only — Not yet, and it says what to set');
  await row().locator('.pgc-row', { hasText: 'Work sampling' }).locator('.pgc-open').click(); await page.waitForTimeout(2500);
  ok(page.url().includes(`/sampling/${smpId}`), `9k the criterion opens the study — ${page.url().split('#')[1]}`);
  await page.getByRole('button', { name: 'Change what was agreed' }).click(); await page.waitForTimeout(500);
  await page.locator('input[aria-label="Work share wanted, at least %"]').fill('80');
  await page.getByRole('button', { name: 'Start sampling' }).click(); await page.waitForTimeout(1500);
  const agreed9 = await page.evaluate(id => import('/src/db.ts').then(d => d.getStudy(id)), smpId);
  ok(agreed9.agreed?.sampling?.workAtLeast === 80 && agreed9.facts.taps.length === 60, `9l the work share wanted is kept on the study (${agreed9.agreed?.sampling?.workAtLeast}%) with its 60 taps`);
  await goPrograms(); await openProve();
  t9 = await rowText('Work sampling — Packers, morning');
  ok(await pill9('Work sampling — Packers, morning') === 'Passed' && /every person at least the 80% wanted/.test(t9), `9m 90% working (±8 points) against 80%: Passed, margins counted — "${t9.slice(0, 200)}"`);
  await seedSampling(30, 30); await page.waitForTimeout(1500);
  t9 = await rowText('Work sampling — Packers, morning');
  ok(await pill9('Work sampling — Packers, morning') === 'Didn’t pass' && /Op 1 is working 50% of the time/.test(t9), `9n 30 of 60 working: Didn’t pass, said who — "${t9.slice(0, 200)}"`);
  await seedSampling(54, 6); await page.waitForTimeout(1200);

  /* a loss count: the most a counted shift may lose, typed on the count */
  await add('Loss count'); await startNew('loss count');
  await row().locator('input[aria-label="Name the study"]').fill('Shift 1 at the packer');
  await row().getByRole('button', { name: 'Add it, set up later' }).click(); await page.waitForTimeout(1800);
  rec = await record();
  const lossId = rec.criteria[rec.criteria.length - 1].id;
  await page.evaluate(async id => {
    const d = await import('/src/db.ts'); const t = Date.now();
    await d.patchStudy(id, cur => ({ facts: { ...cur.facts, losses: { shift: 'Shift 1', from: t - 8 * 3_600_000, to: t, plannedMin: 450, breakMin: 30, made: 36_500, rejects: 600, ratePerMin: 100, rateFrom: 'plate', rateMachine: 'Bagger' } } }));
  }, lossId);
  await page.waitForTimeout(1500);
  ok(await pill9('Loss count — Shift 1 at the packer') === 'Not yet' && /No most is set yet/.test(await rowText('Loss count — Shift 1 at the packer')), '9o a counted shift (85 min lost) with no most set: Not yet, and it says what to set');
  await row().locator('.pgc-row', { hasText: 'Loss count' }).locator('.pgc-open').click(); await page.waitForTimeout(2500);
  ok(page.url().includes(`/losses/${lossId}`) && await page.locator('input[aria-label="A shift may lose at most"]').count() === 1, `9p the criterion opens the count, with its box — A shift may lose at most`);
  const most = page.locator('input[aria-label="A shift may lose at most"]');
  await most.fill('90'); await most.blur(); await page.waitForTimeout(1200);
  ok((await page.evaluate(id => import('/src/db.ts').then(d => d.getStudy(id)), lossId)).agreed?.losses?.maxLostMin === 90, '9q the most is kept on the count');
  await goPrograms(); await openProve();
  t9 = await rowText('Loss count — Shift 1 at the packer');
  ok(await pill9('Loss count — Shift 1 at the packer') === 'Passed' && /85 min lost, within the 90 min allowed/.test(t9), `9r 85 min lost against at most 90: Passed — "${t9.slice(0, 200)}"`);
  await row().locator('.pgc-row', { hasText: 'Loss count' }).locator('.pgc-open').click(); await page.waitForTimeout(2500);
  await page.locator('input[aria-label="A shift may lose at most"]').fill('60'); await page.locator('input[aria-label="A shift may lose at most"]').blur(); await page.waitForTimeout(1200);
  await goPrograms(); await openProve();
  t9 = await rowText('Loss count — Shift 1 at the packer');
  ok(await pill9('Loss count — Shift 1 at the packer') === 'Didn’t pass' && /over by 25 min/.test(t9), `9s against at most 60: Didn’t pass, over by 25 min — "${t9.slice(0, 200)}"`);
  await row().locator('.pgc-row', { hasText: 'Loss count' }).locator('.pgc-open').click(); await page.waitForTimeout(2500);
  await page.locator('input[aria-label="A shift may lose at most"]').fill('90'); await page.locator('input[aria-label="A shift may lose at most"]').blur(); await page.waitForTimeout(1200);

  /* a check log: the latest results of every check passed — a count, not the clock. Started from the picker on the job's only line. */
  await goPrograms(); await openProve();
  await add('Check log');
  const hasKinds = await row().locator('select[aria-label="Which check log"] option').count();
  ok(hasKinds >= 10, `9t Check log offers its kinds to start (${hasKinds}) — the program is on its job's line`);
  await row().locator('select[aria-label="Which check log"]').selectOption({ value: 'metal-detection' });
  await row().locator('input[aria-label="Name the check log"]').fill('Metal detection, commissioning week');
  await row().getByRole('button', { name: 'Add it, set up later' }).click(); await page.waitForTimeout(2000);
  rec = await record();
  const logId = rec.criteria[rec.criteria.length - 1].id;
  const log9 = await page.evaluate(id => import('/src/db.ts').then(d => d.getStudy(id)), logId);
  ok(log9?.tool === 'log' && log9.agreed?.log?.key === 'metal-detection' && log9.programId === rec.id && log9.projectId === PID && !!log9.workspaceId && log9.agreed.log.checks.length >= 3,
    `9u a log made for the program from the starter list, on its line — ${log9?.agreed?.log?.checks?.length} checks`);
  const results = (n, bad) => page.evaluate(async ([id, n, bad]) => {
    const d = await import('/src/db.ts'); const st = await d.getStudy(id); const t = Date.now() - 3_600_000 * 20;
    const rs = []; let i = 0;
    for (const c of st.agreed.log.checks) for (let k = 0; k < n; k++) rs.push({ id: `${c.id}-${k}`, checkId: c.id, at: t + 1000 * ++i, outcome: bad && k === n - 1 && c === st.agreed.log.checks[0] ? 'fail' : 'pass' });
    await d.patchStudy(id, cur => ({ facts: { ...cur.facts, results: rs } }));
  }, [logId, n, bad]);
  await results(3, false); await page.waitForTimeout(1500);
  ok(await pill9('Check log — Metal detection, commissioning week') === 'Not yet' && /No count is set yet/.test(await rowText('Check log — Metal detection')), '9v three passes of every check but no count set: "up to date" is not a pass — Not yet, and it says what to set');
  await row().locator('.pgc-row', { hasText: 'Check log' }).locator('.pgc-open').click(); await page.waitForTimeout(2500);
  ok(page.url().includes(`/log/metal-detection/${logId}`), `9w the criterion opens the log — ${page.url().split('#')[1]}`);
  const inrow = page.locator('input[aria-label="Results in a row, every check, that must pass"]');
  await inrow.fill('3'); await inrow.blur(); await page.waitForTimeout(1200);
  ok((await page.evaluate(id => import('/src/db.ts').then(d => d.getStudy(id)), logId)).agreed?.log?.inARow === 3, '9x the count is kept on the log');
  await goPrograms(); await openProve();
  t9 = await rowText('Check log — Metal detection');
  ok(await pill9('Check log — Metal detection') === 'Passed' && /of every one of the \d+ checks passed/.test(t9), `9y the latest 3 of every check passed: Passed — "${t9.slice(0, 190)}"`);
  await results(3, true); await settle(async () => (await pill9('Check log — Metal detection')) === 'Didn’t pass');
  t9 = await rowText('Check log — Metal detection');
  ok(await pill9('Check log — Metal detection') === 'Didn’t pass' && /failed on its latest/.test(t9), `9z a check failed on its latest: Didn’t pass — "${t9.slice(0, 190)}"`);
  await results(3, false); await page.waitForTimeout(1200);

  /* every criterion passed again: signed off, the new tools in the line, on every paper */
  /* the row's header is read from every study on the device, loaded a moment after the criteria block's own — wait for it */
  await settle(async () => /ready to sign off/i.test(await pill()));
  ok(/ready to sign off/i.test(await pill()), `9aa every criterion passed: "${await pill()}"`);
  await row().getByRole('button', { name: 'Sign off', exact: true }).click(); await page.waitForTimeout(300);
  await row().locator('input[aria-label="Who is signing it off"]').fill('R. Glew, J. Smith');
  await row().getByRole('button', { name: 'Signed off — passed', exact: true }).click(); await page.waitForTimeout(2500);
  const line9 = await page.evaluate(async ([pid, name]) => {
    const d = await import('/src/db.ts'); const C = await import('/src/lib/programCriteria.ts');
    const p = (await d.listPrograms(pid)).find(x => x.what === name);
    return C.passedItLine(p, C.criteriaOf(p, await d.listAllStudies(), await d.listTests(pid), undefined, { standards: await d.listAllStandards() }));
  }, [PID, NAME]);
  ok(/Finest Red 2kg: Meets the 60 bags\/min target/.test(line9) && /Packers, morning: working at least 80%/.test(line9) && /Shift 1 at the packer: Within the 90 min allowed/.test(line9) && /Metal detection, commissioning week: 3 in a row passed/.test(line9),
    `9bb what passed it names every new tool's verdict: "${line9.slice(0, 600)}"`);
  const pp = pdf(await download('Programs report', 'programs9.pdf'));
  ok(['Passed — Line capacity — Finest Red 2kg', 'Passed — Work sampling — Packers, morning', 'Passed — Loss count — Shift 1 at the packer', 'Passed — Check log — Metal detection, commissioning week'].every(x => pp.includes(x)),
    '9cc the Programs report: each new criterion with its answer', pp.slice(pp.indexOf('PR-07'), pp.indexOf('PR-07') + 900));
  await goPrograms();
  ok((await pill()).startsWith('signed off — passed') && !/not yet/i.test(await pill()), `9dd the Programs row: "${await pill()}"`);
  const m9 = pdf(await (async () => { await go(`#/project/${PID}/machines`); await page.locator('.nv-main').getByText('Ilapak flow wrapper', { exact: false }).first().click(); await page.waitForTimeout(2500); return download('Machine report', 'machine9.pdf'); })());
  ok(m9.includes('Finest Red 2kg') && m9.includes('Packers, morning') && m9.includes('Shift 1 at the packer') && m9.includes('Metal detection, commissioning week'), '9ee its Machine report says what passed it, the new tools among them', m9.slice(m9.indexOf('PR-07'), m9.indexOf('PR-07') + 600));
  await go(`#/project/${PID}/report?doc=commissioning`);
  const c9 = pdf(await download('Download', 'commissioning9.pdf'));
  ok(c9.includes('Passed — Line capacity — Finest Red 2kg') && c9.includes('Passed — Check log — Metal detection, commissioning week'), '9ff the commissioning report: the new criteria with their answers', c9.slice(c9.indexOf('PR-07'), c9.indexOf('PR-07') + 700));
  await go(`#/project/${PID}/testing`);
  await page.locator('.nv-main button[aria-label^="Ilapak flow wrapper — programs"]').first().click(); await page.waitForTimeout(1200);
  ok(flat(await page.locator('[role=dialog]').last().innerText().catch(() => '')).includes(`signed off — passed ${nice}`), '9gg Commission’s sheet of the machine’s programs: signed off, the Line capacity read from the standards');
  await page.keyboard.press('Escape'); await page.waitForTimeout(800);
  /* the phone */
  await page.setViewportSize({ width: 375, height: 780 });
  await goPrograms(); await openProve();
  await row().getByRole('button', { name: 'Take the sign-off back' }).click(); await page.waitForTimeout(1500);
  await row().getByRole('button', { name: 'Add a criterion' }).click(); await page.waitForTimeout(400);
  await row().locator('.pgc-panel [role=radio]', { hasText: 'Line capacity' }).click(); await page.waitForTimeout(500);
  const fit9 = await page.evaluate(name => {
    const li = [...document.querySelectorAll('li.pgr')].find(l => l.querySelector('.pgr-name')?.textContent?.includes(name));
    const els = [...(li?.querySelectorAll('.pgc-panel [role=radio], .pgc-panel .chip, .pgc-panel .pgc-judges') ?? [])].map(c => c.getBoundingClientRect());
    return { n: els.length, over: document.documentElement.scrollWidth - window.innerWidth, inside: els.every(r => r.right <= window.innerWidth + 1 && r.left >= -1) };
  }, NAME);
  ok(fit9.n >= 11 && fit9.inside && fit9.over <= 0, `9hh on a 375 px phone the eleven chips and Line capacity's hint and picks fit — nothing off the side (${fit9.over}px over)`);
  await row().getByRole('button', { name: 'Cancel' }).first().click().catch(() => {});
  await page.setViewportSize({ width: 1360, height: 900 });
  await goPrograms(); await openProve();
  await row().getByRole('button', { name: 'Sign off', exact: true }).click(); await page.waitForTimeout(300);
  await row().locator('input[aria-label="Who is signing it off"]').fill('R. Glew');
  await row().getByRole('button', { name: 'Signed off — passed', exact: true }).click(); await page.waitForTimeout(2000);
  ok((await pill()).startsWith('signed off — passed'), '9ii signed again, with every new tool among its criteria');
}

/* ---- 7 on a phone ---- */
await page.setViewportSize({ width: 390, height: 780 }); await goPrograms(); await openProve();
const fit = await page.evaluate(name => {
  const li = [...document.querySelectorAll('li.pgr')].find(l => l.querySelector('.pgr-name')?.textContent?.includes(name));
  const c = li?.querySelector('.pgc'); const r = c?.getBoundingClientRect();
  return { over: document.documentElement.scrollWidth - window.innerWidth, inside: !!r && r.right <= window.innerWidth + 1 && r.left >= -1, signed: c?.querySelector('.pgc-v')?.textContent ?? '' };
}, NAME);
ok(fit.over <= 0 && fit.inside && /Signed off — passed/.test(fit.signed), `7 on a phone the criteria and the sign-off fit — nothing off the side (${fit.over}px over)`);

ok(!errors.length, `no errors on the page${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
