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
 *   7  on a phone: the criteria and the sign-off fit, nothing off the side */
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
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
/* a sheet closed just before takes its history entry off a moment later (ui/backCloses) — wait for it (CLAUDE.md) */
const go = async h => {
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 5000 }).catch(() => {});
  await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2500);
};
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
await go(PROGRAMS);
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
await page.waitForTimeout(2000); await go(PROGRAMS);
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
await page.waitForTimeout(1500); await go(PROGRAMS);
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
ok(JSON.stringify(chips) === JSON.stringify(['Capability study', 'Control chart', 'Reliability study', 'Analysis', 'Run test']),
  `2 Add a criterion offers the tools that say pass or fail, and its run test — ${chips.join(' · ')}`);
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
await go(PROGRAMS);

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
await go(PROGRAMS);
await row().getByRole('button', { name: 'Take the sign-off back' }).click(); await page.waitForTimeout(2000);
rec = await record();
ok(!rec.signedOff && !rec.provedOn && rec.criteria?.length === 2 && /ready to sign off/i.test(await pill()), `6 the sign-off taken back: "${await pill()}", nothing proved, both criteria kept`);
await row().getByRole('button', { name: 'Sign off', exact: true }).click(); await page.waitForTimeout(300);
await row().locator('input[aria-label="Who is signing it off"]').fill('R. Glew');
await row().getByRole('button', { name: 'Signed off — passed', exact: true }).click(); await page.waitForTimeout(2000);
ok((await record()).signedOff?.by?.join() === 'R. Glew' && (await pill()).startsWith('signed off — passed'), '6b signed again, by one name');

/* ---- 7 on a phone ---- */
await page.setViewportSize({ width: 390, height: 780 }); await go(PROGRAMS);
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
