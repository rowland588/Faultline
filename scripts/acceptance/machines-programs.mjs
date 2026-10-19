/* ACCEPTANCE — MACHINES AND PROGRAMS ON THE LINE (docs/BLUEPRINT.md, Stage 2).
 *
 * Rowland, 13 October: "programs should be able to pick programs from the
 * control room and plan a program for a line rather than open up a full
 * project system." Driven in a real browser on the seeded factory with the
 * real controls, every sentence checked against the module that makes it:
 *
 *   1  the control room's Your factory opens Programs; the rail's Programs
 *      is lit; each line's card says its programs to prove, the late in red
 *   2  Programs on one line: the sentence as lib/lineRecords reads it; the
 *      machines in flow order, each with its programs; a job's program on
 *      the line says which job and is changed there, not here
 *   3  a program planned on the line with no job, on a machine not listed
 *      yet — kept on no job, on the line; the machine joins the line's list
 *      (where the stopwatch and a problem find it), its record made
 *   4  where it has got to and its commentary, kept; a test day gone by —
 *      red, "test was … ago"; proved asks the day and keeps it
 *   5  the line's page: its machines in flow order with who made each and
 *      their programs; a machine named there with its maker; who made one
 *      typed; its Programs, the late in red — "The line" no longer lists
 *      the machines a second time
 *   6  a machine renamed in Set up the line: the record and its programs
 *      follow the name
 *   7  a job on the line sees the line's own programs under their machines,
 *      marked by line — the same records; Test it on the row (passed, what
 *      was seen, the day) makes its proving test and proves the line's
 *      program, on the line and in the control room; Commission's programs
 *      cell opens a machine's programs and a tap its test; Needs you's Test
 *      it lands on the row on Programs, open — booked for a day there; a
 *      line's program with no machine on the job tested on the line itself,
 *      didn't pass said in red, on the row and the board; a line on a
 *      machine's "Programs loaded" with no record tested the same — its
 *      record made, proved, and counted on Commission's board
 *   8  Your factory: each line's machines in flow order and its programs in
 *      words, on the screen and on its paper
 *   9  the programs report of the line: its sentence and every program
 *   10 Line capacity on the line offers its machines
 *   11 on a phone: nothing off the side
 *   12 one program, one answer (flow audit #3): a program failed on the
 *      floor after its test passed is back on the machine, on the line and
 *      the job; each says the other record beside its own; a failed program
 *      is never counted done; the job's paper says the same
 *   13 proved says what showed it (flow audit #21): its test, a study on
 *      the line (the study's page says so), or the words of who signed it
 *      off — amber when nothing; on the line's paper; the job's own
 *      Programs list asks the same and offers its test
 *   14 one list of machines, every picker (flow audit #14): the Problem
 *      sheet offers this line's and no other's; the stopwatch every one;
 *      Line capacity offers its unlisted machine stations to the line, then
 *      every station offers them; SMED's where; a study's machine picked
 *      from its line; a new study on the line offers them
 *   and no console error.
 *
 *   node scripts/acceptance/machines-programs.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
page.on('dialog', d => void d.accept());
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
/* a sheet closed by Escape takes its history entry off a moment later — wait for it, or it lands on top of the goto (CLAUDE.md) */
const go = async h => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 3000 }).catch(() => {}); await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
const main = page.locator('.nv-main');

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const WS = sd.wsId;

/* What the modules say of the line as it stands. */
const truth = () => page.evaluate(async ws => {
  const db = await import('/src/db.ts');
  const L = await import('/src/lib/lineRecords.ts');
  const [all, assets, programs, jobLines] = await Promise.all([db.listWorkspaces(), db.listAllAssets(), db.listAllPrograms(), db.allPaceLines()]);
  const w = all.find(x => x.id === ws);
  const kit = L.lineKit(w, assets, programs, jobLines);
  const r = L.lineProgramsReading([{ id: w.id, name: w.name, machines: kit.machines, programs: kit.programs }]);
  return {
    name: w.name, list: w.assets, kit: { says: kit.says, flow: kit.flow, late: kit.late, proved: kit.proved, n: kit.programs.length },
    machines: kit.machines.map(m => ({ name: m.name, oem: m.record?.oem, id: m.record?.id, job: m.jobId })),
    programs: kit.programs.map(p => ({ id: p.id, what: p.what, projectId: p.projectId, workspaceId: p.workspaceId, assetId: p.assetId, state: p.state, provedOn: p.provedOn, testOn: p.testOn, note: p.note, runs: p.runs, from: p.from })),
    reading: r ? { total: r.total, done: r.done, late: r.late, open: r.open, says: r.says } : null,
  };
}, WS);
const iso = d => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

/* ---- 1 from the control room ---- */
{
  await go('#/room');
  const card = main.locator('.fac-card', { hasText: 'Line 7 — smoke test' });
  const t = await truth();
  const todo = t.kit.n - t.kit.proved;
  ok(flat(await card.innerText()).includes(`${todo} programs to prove`) && (t.kit.late ? await card.locator('b.is-r', { hasText: `${t.kit.late} late` }).count() === 1 : true),
    `1 the line's card: ${todo} programs to prove${t.kit.late ? `, ${t.kit.late} late in red` : ''}`);
  await main.locator('.fac-home').getByRole('button', { name: 'Programs', exact: true }).click(); await page.waitForTimeout(1800);
  ok(page.url().endsWith('#/programs') && await page.locator('.nv-ri.is-on[aria-current="page"]', { hasText: /^Programs$/ }).count() === 1 && await main.locator('h1', { hasText: 'Programs' }).count() === 1,
    '1b the control room opens Programs — every line, no job');
}

/* ---- 2 on one line ---- */
{
  await main.getByRole('group', { name: 'Which line' }).getByRole('button', { name: /Line 7 — smoke test/ }).click(); await page.waitForTimeout(800);
  const t = await truth();
  const says = flat(await main.locator('.lp-says').innerText());
  ok(says.startsWith(`${t.reading.total} programs · ${t.reading.done} proved`) && (t.reading.late ? says.includes(`${t.reading.late} late`) : true), `2 the sentence as the module reads it (${says})`);
  const heads = await main.locator('.lp-mh').allInnerTexts();
  const flow = t.machines.map(m => m.name).filter(n => heads.some(h => h.startsWith(n)));
  ok(flow.length >= 2 && heads.findIndex(h => h.startsWith(flow[0])) < heads.findIndex(h => h.startsWith(flow[1])), `2b the machines in flow order (${heads.map(h => h.split(' · ')[0]).join(' → ')})`);
  const jobRow = main.locator('.lp-row', { hasText: 'PR-12 Express 1.25 kg' });
  ok(await jobRow.locator('.lp-job', { hasText: 'Line 2 commissioning' }).count() === 1 && await jobRow.locator('select').count() === 0, "2c a job's program says its job, and is changed there");
}

/* ---- 3 a program planned on the line, no job ---- */
{
  await main.getByRole('button', { name: 'Plan a program on Line 7 — smoke test' }).click(); await page.waitForTimeout(300);
  const form = main.locator('.mt-add-card');
  await form.getByLabel("The program's name or number").fill('LB-2 Express labels');
  await form.getByLabel('Which machine it is on').selectOption({ label: 'A machine not listed…' });
  await form.getByLabel("The machine's name").fill('Labeller');
  await form.getByLabel('What it runs').fill('Tesco Express 1.25 kg');
  await form.getByLabel('Commentary').fill('Herma to send the label file');
  await form.getByLabel('Whose it is').fill('Herma');
  await form.getByRole('button', { name: 'Plan it' }).click(); await page.waitForTimeout(1500);
  const t = await truth();
  const p = t.programs.find(x => x.what === 'LB-2 Express labels');
  const m = t.machines.find(x => x.name === 'Labeller');
  ok(!!p && p.projectId === '' && p.workspaceId === WS && p.state === 'needed' && p.note === 'Herma to send the label file' && p.runs === 'Tesco Express 1.25 kg', '3 planned on the line with no job, its commentary and what it runs kept');
  ok(!!m && m.id === p?.assetId && t.list.includes('Labeller'), "3b on a machine not listed yet: the machine joins the line's list, its record made");
  ok(await main.locator('.lp-m', { hasText: 'Labeller' }).locator(`[data-program="${p?.id}"]`).count() === 1 && flat(await main.locator('.fac-added').innerText()).includes('LB-2 Express labels is planned on Line 7 — smoke test, on the Labeller'), '3c on the page under its machine, and said so');
  /* who owes it is "Whose", never "From" (flow audit #20) */
  ok(p?.from === 'Herma' && flat(await main.locator(`[data-program="${p?.id}"] .pgr-meta`).first().innerText()).includes('whose: Herma')
    && await main.locator('.mt-add-card .field-label', { hasText: /^From$/ }).count() === 0, '3d whose it is: asked as "Whose", kept, and said "whose: Herma" on its row');
}

/* ---- 4 where it has got to, its commentary, its test day, proved ---- */
{
  /* a line's own row: one line, its boxes a tap away (16 October: "cant
     edit simpley the ui very long") — found by its record, not by its text */
  const lb = (await truth()).programs.find(x => x.what === 'LB-2 Express labels');
  const row = () => main.locator(`[data-program="${lb.id}"]`);
  const shut = await row().getByLabel('Where LB-2 Express labels has got to').count() === 0;
  await row().locator('.pgr-main').click(); await page.waitForTimeout(400);
  await row().getByLabel('Where LB-2 Express labels has got to').selectOption('onMachine'); await page.waitForTimeout(800);
  await row().getByLabel('Commentary on LB-2 Express labels').fill('On the HMI — not run yet');
  await row().getByLabel('The day LB-2 Express labels is tested').fill(iso(-3));
  await row().locator('.pgr-form').getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1000);
  let p = (await truth()).programs.find(x => x.what === 'LB-2 Express labels');
  ok(shut && p.state === 'onMachine' && p.note === 'On the HMI — not run yet' && p.testOn === iso(-3), '4 a tap opens its boxes: on the machine, its commentary and its test day, kept');
  ok(/is-pg-overdue/.test(await row().getAttribute('class')) && flat(await row().locator('.spp-pill').first().innerText()) === 'on the machine · test was 3 days ago', '4b a test day gone by: red, "test was 3 days ago" in its one pill');
  await row().locator('.pgr-main').click(); await page.waitForTimeout(400);
  await row().getByLabel('Where LB-2 Express labels has got to').selectOption('proved'); await page.waitForTimeout(300);
  await row().getByLabel('The day LB-2 Express labels was proved').fill(iso(-1));
  /* flow audit #21: proved asks what showed it — nothing said, nothing proved */
  const asked = await row().getByRole('button', { name: 'It’s proved' }).isDisabled();
  await row().getByLabel('What showed LB-2 Express labels works').fill('200 Express labels run on the Herma, every one read by the scanner');
  await row().getByRole('button', { name: 'It’s proved' }).click(); await page.waitForTimeout(1000);
  p = (await truth()).programs.find(x => x.what === 'LB-2 Express labels');
  ok(asked && p.state === 'proved' && p.provedOn === iso(-1) && !p.testOn && p.note === '200 Express labels run on the Herma, every one read by the scanner' && /is-pg-proved/.test(await row().getAttribute('class'))
    && flat(await row().locator('.lp-how').innerText()) === 'Signed off by hand',
    '4c proved asks the day and what showed it, keeps both — green, "Signed off by hand", what showed it its commentary');
}

/* ---- 5 the line's page ---- */
{
  await go(`#/lines/${WS}`);
  const t = await truth();
  const names = await main.locator('.pl-machine b').allInnerTexts();
  ok(JSON.stringify(names) === JSON.stringify(t.machines.map(m => m.name)), `5 its machines in flow order (${names.join(' → ')})`);
  ok(await main.locator('.pl-facts dt', { hasText: 'Machines' }).count() === 0, '5b "The line" no longer lists the machines a second time');
  await main.getByLabel("The machine's name").fill('Case erector');
  await main.getByLabel('Who made the new machine').fill('Wexxar');
  await main.getByRole('button', { name: 'Add the machine' }).click(); await page.waitForTimeout(1200);
  let t2 = await truth();
  ok(t2.list.includes('Case erector') && t2.machines.find(m => m.name === 'Case erector')?.oem === 'Wexxar' && await main.locator('.pl-machine', { hasText: 'Case erector' }).count() === 1, '5c a machine named on the line with its maker — on the list and its record');
  const oem = main.getByLabel('Who made the Labeller');
  await oem.fill('Herma'); await oem.press('Enter'); await page.waitForTimeout(1000);
  t2 = await truth();
  ok(t2.machines.find(m => m.name === 'Labeller')?.oem === 'Herma', '5d who made one, typed where it is');
  const lab = flat(await main.locator('.pl-machine', { hasText: 'Labeller' }).innerText());
  ok(lab.includes('1 program, 1 proved'), `5e each machine's programs (${lab})`);
  const says = flat(await main.locator('section[aria-label="Programs on this line"] .pl-says').innerText());
  ok(says === `${t2.kit.n} programs · ${t2.kit.proved} proved${t2.kit.late ? ` · ${t2.kit.late} late` : ''}` && (t2.kit.late ? await main.locator('section[aria-label="Programs on this line"] .pl-says b.is-r').count() === 1 : true), `5f its Programs, the late in red (${says})`);
}

/* ---- 6 a machine renamed in Set up the line ---- */
{
  await main.getByRole('button', { name: 'Order and names ›' }).click(); await page.waitForTimeout(1500);
  const chip = page.locator('.chip-editor', { hasText: 'Machines on the line' }).locator('.chip-label', { hasText: /^Labeller$/ });
  await chip.click(); await page.waitForTimeout(200);
  const box = page.locator('.chip-editor', { hasText: 'Machines on the line' }).locator('.chip-add-form input');
  await box.fill('Labeller 2'); await box.press('Enter'); await page.waitForTimeout(1500);
  const t = await truth();
  const m = t.machines.find(x => x.name === 'Labeller 2');
  ok(!!m && m.oem === 'Herma' && t.programs.find(p => p.what === 'LB-2 Express labels')?.assetId === m.id && !t.machines.some(x => x.name === 'Labeller'), '6 renamed in Set up the line: its record, its maker and its program follow the name');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
}

/* ---- 7 a job on the line sees the line's own programs, under their
   machines, and tests one on its row (Rowland, 14 October: "reach it only
   from programs and improve the ui to actually run it?" — "do it") ---- */
{
  await go(`#/project/${sd.projectId}/programs`);
  const t = await truth();
  const own = t.programs.filter(p => !p.projectId);
  const rows = (await main.locator('.pgr:has(.pp-line-tag)').allInnerTexts()).map(flat);
  ok(own.every(p => rows.some(r => r.includes(p.what) && r.startsWith('Line 7 — smoke test’s own'))) && rows.length === own.length && await main.locator('.lpj').count() === 0,
    `7 the job sees the line's own programs under their machines, marked by line — the same records, no second list (${rows.length})`);
  const cw = t.programs.find(p => p.what === 'CW-3 Maris Piper 2kg');
  const row = main.locator(`.pgr[data-program="${cw.id}"]`);
  await row.getByRole('button', { name: 'Test it' }).click(); await page.waitForTimeout(300);
  const panel = row.getByRole('group', { name: 'Test CW-3 Maris Piper 2kg' });
  const saveOff = await panel.getByRole('button', { name: 'Save' }).isDisabled();
  await panel.getByRole('button', { name: 'Passed' }).click();
  await panel.getByLabel('What was seen when CW-3 Maris Piper 2kg ran').fill('500 packs at 60 a minute, seals checked');
  await panel.getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(1500);
  const test = await page.evaluate(async ([pid, id]) => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.programId === id && !x.deletedAt), [sd.projectId, cw.id]);
  ok(saveOff && !!test && test.title === 'Prove program CW-3 Maris Piper 2kg' && test.outcome === 'passed' && test.ranOn === iso(0) && test.result === '500 packs at 60 a minute, seals checked',
    "7b Test it on the row: Save waits for how it went; passed, what was seen and the day — its proving test, naming the line's program");
  const after = (await truth()).programs.find(p => p.what === 'CW-3 Maris Piper 2kg');
  const said = flat(await row.innerText());
  ok(after.state === 'proved' && after.provedOn === iso(0) && after.projectId === '' && await row.locator('.ptx-ladder li').count() === 1
    && /Test 1/.test(said) && /passed/.test(said) && await row.getByRole('button', { name: 'Go again' }).count() === 1,
    "7c passing it proves the line's program — still the line's, on no job; its journey on the row, and Go again");
  await go(`#/programs?line=${WS}`);
  ok(/is-pg-proved/.test(await main.locator(`[data-program="${cw.id}"]`).getAttribute('class')), '7d proved on the control room\'s Programs too');

  /* ---- 7e Commission opens a machine's programs from its cell ---- */
  await go(`#/project/${sd.projectId}/testing`);
  ok(await main.getByRole('button', { name: /Prove programs/ }).count() === 0, '7e Commission has no second picker');
  const mname = await page.evaluate(async ([pid, id]) => (await (await import('/src/db.ts')).listAssets(pid)).find(a => a.id === id)?.name ?? 'The line itself', [sd.projectId, test.assetId]);
  await main.getByRole('button', { name: new RegExp(`^${mname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} — programs:`) }).click(); await page.waitForTimeout(500);
  const sheet = page.getByRole('dialog', { name: `Programs on ${mname}` });
  const prow = sheet.locator('.cgp-row', { hasText: 'CW-3 Maris Piper 2kg' });
  ok(/passed/.test(flat(await prow.innerText())) && /Open the test/.test(flat(await prow.innerText())), `7e its programs cell opens ${mname}'s programs, the line's tested one with its test`);
  await prow.click(); await page.waitForTimeout(1200);
  ok(await page.getByLabel('Which program this test proves').inputValue() === cw.id, "7e a tap opens its test, naming the line's program");
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);

  /* ---- 7f Needs you's program with no test: Test it lands on its row on Programs, open ---- */
  const aid = await page.evaluate(async pid => (await (await import('/src/db.ts')).listAssets(pid)).filter(a => !a.deletedAt)[0]?.id, sd.projectId);
  await page.evaluate(async ([pid, aid]) => {
    const db = await import('/src/db.ts'); const t = Date.now();
    await db.putProgram({ id: 'acc-jp-1', projectId: pid, what: 'JP-1 Acceptance 500g', runs: 'Acceptance 500g', assetId: aid, state: 'onMachine', sort: 9001, createdAt: t, updatedAt: t });
  }, [sd.projectId, aid]);
  await page.waitForTimeout(800);
  const need = main.locator('.nd-row', { hasText: 'JP-1 Acceptance 500g' });
  await need.getByRole('button', { name: 'Test it' }).click(); await page.waitForTimeout(2200);
  const jp = page.getByRole('group', { name: 'Test JP-1 Acceptance 500g' });
  ok(/\/programs\?test=acc-jp-1/.test(page.url()) && await jp.isVisible(), "7f Needs you's Test it lands on the program's row on Programs, its test open");
  await jp.getByLabel('The day JP-1 Acceptance 500g ran or is booked').fill(iso(3));
  await jp.getByRole('button', { name: 'Not run yet — book it for this day' }).click(); await page.waitForTimeout(1500);
  const jt = await page.evaluate(async pid => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.programId === 'acc-jp-1' && !x.deletedAt), sd.projectId);
  const jrow = main.locator('.ptx', { hasText: 'booked' }).filter({ has: page.getByRole('button', { name: 'Say how it went' }) });
  ok(!!jt && jt.outcome === 'planned' && jt.plannedFor === iso(3) && jt.assetId === aid && await jrow.count() >= 1,
    '7f not run yet: booked for its day on its machine, the row says booked and asks how it went');

  /* ---- 7g a line's program with no machine on the job: tested on the line itself; didn't pass is said in red ---- */
  await page.evaluate(async ws => {
    const db = await import('/src/db.ts'); const t = Date.now();
    await db.putProgram({ id: 'acc-lp-9', projectId: '', workspaceId: ws, what: 'LP-9 Express 1kg', runs: 'Express 1kg', state: 'onMachine', sort: 9000, createdAt: t, updatedAt: t });
  }, WS);
  await go(`#/project/${sd.projectId}/programs`);
  const lp = main.locator('.pgr[data-program="acc-lp-9"]');
  await lp.getByRole('button', { name: 'Test it' }).click(); await page.waitForTimeout(300);
  const lpp = lp.getByRole('group', { name: 'Test LP-9 Express 1kg' });
  await lpp.getByRole('button', { name: 'Didn’t pass' }).click();
  await lpp.getByLabel('What was seen when LP-9 Express 1kg ran').fill('Film tracked off after 40 packs');
  await lpp.getByRole('button', { name: 'Save' }).click();
  /* the row is read once the save has finished — a fixed 1.5 s read it mid-save on 19 October (it took 2.7 s on the dev server) */
  await lp.getByRole('button', { name: 'Go again' }).waitFor({ timeout: 10000 }).catch(() => {});
  const lt = await page.evaluate(async pid => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.programId === 'acc-lp-9' && !x.deletedAt), sd.projectId);
  const lsaid = flat(await lp.innerText());
  const red7g = await lp.locator('.cg-pstate.is-r').count();
  const parts7g = [!lt ? 'no test' : lt.outcome !== 'failed' ? `outcome ${lt.outcome}` : '', lt?.assetId ? 'on a machine' : '', /didn’t pass.*Film tracked off after 40 packs/.test(lsaid) ? '' : 'not said', red7g === 1 ? '' : `${red7g} red`, /Go again/.test(lsaid) ? '' : 'no Go again'].filter(Boolean);
  ok(!parts7g.length,
    `7g a line's program tested on the line itself: didn't pass, in red, with what was seen, and Go again (${parts7g.join(', ')} · ${lsaid.slice(0, 300)})`);
  await go(`#/project/${sd.projectId}/testing`);
  ok(/gone wrong/.test(flat(await main.getByRole('button', { name: /^The line itself — programs:/ }).innerText())), "7g and on Commission's board, the line itself's programs say one gone wrong");
}

/* ---- 7h a line on a machine's "Programs loaded" with no program record —
   how a job's programs are mostly held (Rowland, 14 October: "I've gone to
   programs, nothing's changed ... link it into the stage gate process") ---- */
{
  await go(`#/project/${sd.projectId}/programs`);
  const what = 'First program to verify Tesco';
  const before = await page.evaluate(async pid => (await (await import('/src/db.ts')).listPrograms(pid)).filter(p => !p.deletedAt).length, sd.projectId);
  const row = main.locator('.pgr', { hasText: what });
  ok(await row.getByRole('button', { name: 'Test it' }).count() === 1, '7h a "Programs loaded" line with no record has Test it on its row');
  await row.getByRole('button', { name: 'Test it' }).click(); await page.waitForTimeout(300);
  await row.getByRole('button', { name: 'Passed' }).click();
  await row.locator('.ptx-panel textarea').fill('Ran 200 packs through the de-nester, all placed');
  await row.getByRole('button', { name: 'Save' }).click();
  /* read once the save has settled — the program made, its test written and
     the row re-read — up to 10 s, as 12f does (under the gate's load 1.5 s
     read the row before it said "proved") */
  const read7h = () => page.evaluate(async ([pid, w]) => {
    const db = await import('/src/db.ts');
    const progs = (await db.listPrograms(pid)).filter(p => !p.deletedAt);
    const p = progs.find(x => x.what.startsWith(w));
    const t = p && (await db.listTests(pid)).find(x => x.programId === p.id && !x.deletedAt);
    return { n: progs.length, p, t };
  }, [sd.projectId, what]);
  let r = await read7h(), said = flat(await row.innerText());
  for (let i = 0; i < 20 && !(r.p?.provedOn && /proved/i.test(said)); i++) { await page.waitForTimeout(500); r = await read7h(); said = flat(await row.innerText()); }
  ok(r.n === before + 1 && !!r.p && !!r.t && r.t.outcome === 'passed' && r.p.provedOn === iso(0) && /proved/i.test(said) && /Test 1.*passed/.test(said),
    `7h tested: its program made on its machine, its test passed, proved — said on the row (${said.slice(0, 160)})`);
  await go(`#/project/${sd.projectId}/testing`);
  const mname = await page.evaluate(async ([pid, id]) => (await (await import('/src/db.ts')).listAssets(pid)).find(a => a.id === id)?.name, [sd.projectId, r.t.assetId]);
  await main.getByRole('button', { name: new RegExp(`^${mname} — programs:`) }).click(); await page.waitForTimeout(500);
  const sheet = flat(await page.getByRole('dialog', { name: `Programs on ${mname}` }).innerText());
  const others = await page.evaluate(async pid => {
    const db = await import('/src/db.ts');
    return (await db.listTestItems(pid)).filter(i => !i.deletedAt && i.kind === 'next').length;
  }, sd.projectId);
  ok(sheet.includes(what) && /passed/.test(sheet.slice(sheet.indexOf(what))) && sheet.includes('Back up the six programs to the site server') && others > 0,
    `7h Commission's programs on ${mname} carry its "Programs loaded" lines, the tested one passed`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
}

/* ---- 7i THE JOURNEY (Rowland, 14 October: "I only run for 30 minutes, so
   we decide to run a retest ... successful at, say, 50 packs per minute.
   Great. Now let's do a retest at 55 ... It's just the status of what was
   done") — CW-3 passed above; tested again at 55 and short: both on its row,
   the pass standing, on Commission's sheet and on the commissioning paper ---- */
{
  await go(`#/project/${sd.projectId}/programs`);
  const t0 = await truth();
  const cw = t0.programs.find(p => p.what === 'CW-3 Maris Piper 2kg');
  const row = main.locator(`.pgr[data-program="${cw.id}"]`);
  await row.getByRole('button', { name: 'Go again' }).click(); await page.waitForTimeout(300);
  const pan = row.getByRole('group', { name: 'Test CW-3 Maris Piper 2kg' });
  await pan.getByLabel('Aiming for — CW-3 Maris Piper 2kg', { exact: true }).fill('55');
  await pan.getByLabel('Aiming to run — CW-3 Maris Piper 2kg', { exact: true }).fill('60');
  /* what it did is asked once how it went is said (16 October: the run's numbers belong to a test) */
  await pan.getByRole('button', { name: 'Didn’t pass' }).click();
  await pan.getByLabel('Set at — CW-3 Maris Piper 2kg', { exact: true }).fill('55');
  await pan.getByLabel('Ran for — CW-3 Maris Piper 2kg', { exact: true }).fill('45');
  await pan.getByLabel('Packs — CW-3 Maris Piper 2kg', { exact: true }).fill('2,400');
  await pan.getByLabel('Rejects — CW-3 Maris Piper 2kg', { exact: true }).fill('30');
  await pan.getByLabel('What was seen when CW-3 Maris Piper 2kg ran').fill('Seal temp low above 52');
  await pan.getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(1500);
  const r = await page.evaluate(async ([pid, id]) => {
    const db = await import('/src/db.ts');
    const ts = (await db.listTests(pid)).filter(t => t.programId === id && !t.deletedAt);
    const J = await import('/src/lib/programJourney.ts');
    const p = (await db.listAllPrograms()).find(x => x.id === id);
    return { p, j: J.programJourney(p, ts, new Date().toISOString().slice(0, 10)), ts };
  }, [sd.projectId, cw.id]);
  const steps = (await row.locator('.ptx-ladder li').allInnerTexts()).map(flat);
  const second = r.ts.find(t => t.fromTestId);
  ok(r.ts.length === 2 && !!second && second.outcome === 'failed' && second.run?.speed === 55 && second.run?.minutes === 45 && second.run?.packs === 2400 && second.runAgreed?.rate === 55
    && r.p.provedOn === iso(0) && steps.length === 2 && steps[1].includes('set at 55 ppm') && steps[1].includes('ran 45 min') && steps[1].includes('didn’t pass')
    && flat(await row.locator('.ptx-best').innerText()) === r.j.best,
    `7i tested again at 55: a re-test following the pass, its numbers kept, both on the row — the pass standing (${r.j.best}; ${steps[1]})`);
  /* on Commission's sheet */
  await go(`#/project/${sd.projectId}/testing`);
  const mname = await page.evaluate(async ([pid, id]) => (await (await import('/src/db.ts')).listAssets(pid)).find(a => a.id === id)?.name ?? 'The line itself', [sd.projectId, second.assetId]);
  await main.getByRole('button', { name: new RegExp(`^${mname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} — programs:`) }).click(); await page.waitForTimeout(500);
  const sheetJ = (await page.getByRole('dialog', { name: `Programs on ${mname}` }).locator('.cgp-j li').allInnerTexts()).map(flat);
  ok(sheetJ.length >= 2 && sheetJ.includes(r.j.attempts[1].text), `7i Commission's sheet carries the journey (${sheetJ.length} steps)`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  /* and the commissioning paper */
  await go(`#/project/${sd.projectId}/report?doc=commissioning`);
  const dir = mkdtempSync(join(tmpdir(), 'cmj-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), main.getByRole('button', { name: 'PDF', exact: true }).click()]);
  const file = join(dir, 'cm.pdf'); await dl.saveAs(file);
  const txt = flat(execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' })).replace(/\s+/g, '');
  const want = [r.j.best, ...r.j.attempts.map(a => a.text)].map(w => w.replace(/[–—]/g, '-').replace(/[’]/g, "'").replace(/\s+/g, ''));
  const tight = txt.replace(/[–—]/g, '-').replace(/[’]/g, "'");
  const lost = want.filter(w => !tight.includes(w));
  ok(!lost.length, `7i the commissioning report prints each program's journey${lost.length ? ` — lost: ${lost.join(' | ')}` : ''}`);
}

/* ---- 8 Your factory, screen and paper ---- */
{
  await go('#/factory');
  const t = await truth();
  const row = main.locator(`[data-line="${t.name}"]`);
  ok(flat(await row.locator('.fac-flow').innerText()) === t.kit.flow && flat(await row.locator('.fac-kit').innerText()).startsWith(t.kit.says), `8 Your factory: its machines in flow order (${t.kit.flow}) and ${t.kit.says}`);
  const dir = mkdtempSync(join(tmpdir(), 'fac-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), main.getByRole('button', { name: 'Factory report' }).click()]);
  const file = join(dir, 'factory.pdf'); await dl.saveAs(file);
  const txt = flat(execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' })).replace(/\s+/g, '');
  ok(txt.includes(t.kit.says.replace(/\s+/g, '')), '8b and on its paper');
}

/* ---- 9 the programs report of the line ---- */
{
  await go(`#/programs?line=${WS}`);
  const t = await truth();
  const dir = mkdtempSync(join(tmpdir(), 'lprogs-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), main.getByRole('button', { name: 'Programs report' }).click()]);
  const file = join(dir, 'programs.pdf'); await dl.saveAs(file);
  const txt = flat(execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' })).replace(/\s+/g, '');
  const lost = [t.reading.says, 'PROGRAMS·PRODUCTIONLINE', ...t.programs.map(p => p.what)].filter(w => !txt.includes(w.replace(/\s+/g, '')));
  ok(!lost.length, `9 the line's programs report: its sentence and every program${lost.length ? ` — lost: ${lost.join(' | ')}` : ''}`);
}

/* ---- 10 Line capacity on the line offers its machines ---- */
{
  const offered = await page.evaluate(async ws => {
    const db = await import('/src/db.ts');
    const std = (await db.listStandardsForLine(ws))[0];
    return std?.id;
  }, WS);
  if (offered) {
    await go(`#/w/${WS}/standards/${offered}?at=balance`);
    await page.waitForTimeout(800);
    const t = await truth();
    const opts = await page.locator('datalist[id^="cap-machines-"] option').evaluateAll(els => [...new Set(els.map(e => e.getAttribute('value')))]);
    const start = await page.getByRole('button', { name: `Start from the line’s machines, in flow order (${t.machines.length})` }).count();
    ok(opts.length ? t.machines.every(m => opts.includes(m.name)) : start === 1, `10 Line capacity offers the line's machines (${opts.length ? `${opts.length} on each station's name` : 'start from them'})`);
  } else ok(true, '10 (no line standard seeded on the line)');
}

/* ---- 11 the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/programs?line=${WS}`);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  await go(`#/lines/${WS}`);
  const wide2 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(wide <= 1 && wide2 <= 1, `11 phone: nothing off the side (${wide}px, ${wide2}px)`);
}

/* ---- 12 one program, one answer (flow audit #3) ---- */
await page.setViewportSize({ width: 1360, height: 900 });
{
  /* What the job's own reading says of its programs (lib/programsReport). */
  const job = () => page.evaluate(async pid => {
    const db = await import('/src/db.ts');
    const { programsReading } = await import('/src/lib/programsReport.ts');
    const [tests, items, assets, programs, project] = await Promise.all([db.listTests(pid), db.listTestItems(pid), db.listAssets(pid), db.listPrograms(pid), db.getProject(pid)]);
    const r = programsReading({ tests, items, assets, programs, holder: project });
    return { says: r.says, doneAll: r.doneAll, failed: r.failed, lines: r.lines.map(l => ({ what: l.what, word: l.word, bucket: l.bucket, record: l.record, assetId: l.assetId ?? '' })),
      programs: programs.map(p => ({ id: p.id, what: p.what, state: p.state, provedOn: p.provedOn, testId: p.testId })) };
  }, sd.projectId);
  let j = await job();
  const p04 = j.programs.find(p => p.what === 'PR-04 Finest Red 2 kg');
  const l04 = j.lines.find(l => l.what === 'PR-04 Finest Red 2 kg');
  ok(!p04.provedOn && p04.state === 'onMachine' && /^Failed/.test(l04.word),
    `12 PR-04, failed on the floor the day after its test passed, is back on the machine — not "Proved" (${l04.word})`);
  await go(`#/programs?line=${WS}`);
  let row = main.locator(`[data-program="${p04.id}"]`);
  ok(flat(await row.locator('.spp-pill').first().innerText()).startsWith('on the machine') && flat(await row.locator('.lp-floor').innerText()).includes(`On its Set up: ${l04.word}`),
    `12b the line's Programs says the record's state and, beside it, what the job's floor said (${flat(await row.locator('.lp-floor').innerText()).slice(0, 60)})`);
  await go(`#/project/${sd.projectId}/programs`);
  /* ONE STATUS A ROW (16 October): the record's word only when it says
     something worse than the floor's — here it does not */
  const jrow = what => main.locator('.pgr', { hasText: what }).first();
  const one = async what => ({ pills: await jrow(what).locator('.pgr-top .spp-pill:not(.pgr-pn)').count(), word: flat(await jrow(what).locator('.pgr-top .spp-pill').first().innerText()), aside: await jrow(what).locator('.pgr-aside').count() });
  const r04 = await one('PR-04 Finest Red 2 kg'), s12 = await one('PR-12 Express 1.25 kg');
  ok(r04.pills === 1 && r04.word === l04.word && r04.aside === 0 && s12.pills === 1 && s12.word === j.lines.find(l => l.what === 'PR-12 Express 1.25 kg').word && s12.aside === 0,
    `12c the job's row says one status — "${r04.word}", "${s12.word}" — the line's record only when it is worse`);
  const wrap = j.lines.filter(l => l.assetId === j.lines.find(x => x.what === 'PR-04 Finest Red 2 kg').assetId);
  const doneHere = wrap.filter(l => l.bucket === 'done' || l.bucket === 'baseline').length;
  const head = flat(await main.locator('.pp-mh', { hasText: 'Ilapak flow wrapper' }).innerText());
  ok(j.doneAll === j.lines.filter(l => l.bucket === 'done' || l.bucket === 'baseline').length && j.says.includes(`${j.failed} failed`) && !new RegExp(`${j.doneAll + j.failed} done`).test(j.says)
    && head.includes(`${wrap.length} programs · ${doneHere} done`), `12d a failed program is never counted done — "${j.says}"; the machine "${head}"`);
  /* PR-12 proved in Commission yesterday (its test's own screen writes the same), then failed on the floor here, with the real controls */
  const p12 = j.programs.find(p => p.what === 'PR-12 Express 1.25 kg');
  await page.evaluate(async ([tid, day]) => { const db = await import('/src/db.ts'); const t = await (await db.getDB()).get('tests', tid); await db.putTest({ ...t, outcome: 'passed', ranOn: day }); }, [p12.testId, iso(-1)]);
  await page.waitForTimeout(800);
  j = await job();
  ok(j.programs.find(p => p.id === p12.id).provedOn === iso(-1), '12e PR-12 proved by its test in Commission');
  /* one form: didn't pass is the test's and the floor's at once */
  await go(`#/project/${sd.projectId}/programs`);
  const r12 = main.locator('.pgr', { hasText: 'PR-12 Express 1.25 kg' }).first();
  await r12.locator('.ptx-go').click(); await page.waitForTimeout(400);
  await r12.locator('.ptx-panel').getByRole('button', { name: 'Didn’t pass', exact: true }).click();
  await r12.locator('.ptx-panel textarea').fill('Film creasing again on the 1.25 kg — seal jaws cold');
  await r12.locator('.ptx-panel').getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1500);
  /* the save writes the test, the record and the floor's word; read once it
     has settled, not after a fixed pause — under the gate's load 1.5 s read
     the record before it had dropped back (16 October, in the gate twice) */
  for (let k = 0; k < 20; k++) {
    j = await job();
    const a12 = j.programs.find(p => p.id === p12.id);
    if (!a12.provedOn && a12.state === 'onMachine') break;
    await page.waitForTimeout(500);
  }
  const after12 = j.programs.find(p => p.id === p12.id);
  const part12 = await page.evaluate(async pid => (await (await import('/src/db.ts')).listTestItems(pid)).find(i => !i.deletedAt && i.kind === 'next' && i.what === 'PR-12 Express 1.25 kg'), sd.projectId);
  ok(!after12.provedOn && after12.state === 'onMachine' && part12?.results?.at(-1)?.is === 'failed' && /^on the machine · (failed .* to prove again|test didn’t pass)$/.test(j.lines.find(l => l.what === 'PR-12 Express 1.25 kg').record?.word ?? ''),
    `12f didn't pass in the one form: the floor says failed, and the program drops back to on the machine (${j.lines.find(l => l.what === 'PR-12 Express 1.25 kg').record?.word})`);
  await go(`#/programs?line=${WS}`);
  row = main.locator(`[data-program="${p12.id}"]`);
  ok(!/is-pg-proved/.test(await row.getAttribute('class')) && flat(await row.locator('.spp-pill').first().innerText()).startsWith('on the machine') && flat(await row.locator('.lp-floor').innerText()).includes('Failed'),
    '12g and the line\'s Programs says the same — on the machine, its floor\'s failure beside it');
  /* on paper: the job's programs report says the record beside the floor's, and counts no failure as done */
  await go(`#/project/${sd.projectId}/programs`);
  const dir = mkdtempSync(join(tmpdir(), 'jprogs-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), main.getByRole('button', { name: 'Programs report — PDF' }).click()]);
  const file = join(dir, 'programs.pdf'); await dl.saveAs(file);
  const txt = flat(execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' })).replace(/\s+/g, '');
  const lost = [j.says, `On the line: ${j.lines.find(l => l.what === 'PR-12 Express 1.25 kg').record.word}`].filter(w => !txt.includes(w.replace(/\s+/g, '')));
  ok(!lost.length, `12h the job's programs report: its count and the line's record beside the floor's${lost.length ? ` — lost: ${lost.join(' | ')}` : ''}`);
}

/* ---- 13 proved says what showed it (flow audit #21) ---- */
{
  /* How each of the line's programs was proved, as the module says it. */
  const proofs = () => page.evaluate(async ws => {
    const db = await import('/src/db.ts');
    const L = await import('/src/lib/lineRecords.ts');
    const [all, assets, programs, jobLines, tests, studies] = await Promise.all([db.listWorkspaces(), db.listAllAssets(), db.listAllPrograms(), db.allPaceLines(), db.listProvingTests(), db.listAllStudies()]);
    const w = all.find(x => x.id === ws);
    const kit = L.lineKit(w, assets, programs, jobLines);
    const r = L.lineProgramsReading([{ id: w.id, name: w.name, machines: kit.machines, programs: kit.programs }], undefined, { tests, studies });
    return { lines: r.lines.map(l => ({ id: l.programId, what: l.what, proof: l.proof })), studies: studies.filter(s => s.workspaceId === ws).map(s => ({ id: s.id, name: s.name, tool: s.tool, programId: s.programId })) };
  }, WS);
  await go(`#/programs?line=${WS}`);
  let pr = await proofs();
  const how = async id => flat(await main.locator(`[data-program="${id}"] .lp-how`).innerText().catch(() => ''));
  const cw3 = pr.lines.find(l => l.what === 'CW-3 Maris Piper 2kg'), cw1 = pr.lines.find(l => l.what === 'CW-1 Finest Red 2kg');
  ok(/^Proved by its test — Prove program CW-3 Maris Piper 2kg, passed /.test(cw3.proof?.word ?? '') && await how(cw3.id) === cw3.proof.word,
    `13 proved by its test in Commission, said under it: "${await how(cw3.id)}"`);
  ok(cw1.proof?.tone === 'a' && await how(cw1.id) === 'Signed off by hand — nothing said shows it' && /is-a/.test(await main.locator(`[data-program="${cw1.id}"] .lp-how`).getAttribute('class')),
    '13b signed off by hand with nothing said: proved, and said so in amber');
  /* a new program on the line, proved by a study on the line */
  await main.getByRole('button', { name: 'Plan a program on Line 7 — smoke test' }).click(); await page.waitForTimeout(300);
  const form = main.locator('.mt-add-card');
  await form.getByLabel("The program's name or number").fill('CW-7 Maris Piper 2.5kg');
  await form.getByLabel('Which machine it is on').selectOption({ label: 'Checkweigher' });
  await form.getByRole('button', { name: 'Plan it' }).click(); await page.waitForTimeout(1500);
  pr = await proofs();
  const cw7 = pr.lines.find(l => l.what === 'CW-7 Maris Piper 2.5kg');
  const row = main.locator(`[data-program="${cw7.id}"]`);
  await row.locator('.pgr-main').click(); await page.waitForTimeout(400);
  await row.getByLabel('Where CW-7 Maris Piper 2.5kg has got to').selectOption('proved'); await page.waitForTimeout(300);
  await row.getByRole('button', { name: 'A study on the line' }).click();
  const choice = row.getByLabel('The study that showed CW-7 Maris Piper 2.5kg works');
  const studyId = await choice.locator('option').nth(1).getAttribute('value');
  await choice.selectOption(studyId);
  await row.getByRole('button', { name: 'It’s proved' }).click(); await page.waitForTimeout(1500);
  pr = await proofs();
  const st = pr.studies.find(s => s.id === studyId);
  const p7 = (await truth()).programs.find(p => p.id === cw7.id);
  const said7 = pr.lines.find(l => l.id === cw7.id).proof;
  ok(p7.state === 'proved' && !!p7.provedOn && st.programId === cw7.id && said7.studyId === studyId && await how(cw7.id) === `${said7.word} Open it ›`,
    `13c proved by a study on the line — the study names it, and the row says so: "${said7.word.slice(0, 80)}…"`);
  await row.locator('.lp-how').getByRole('button', { name: 'Open it ›' }).click(); await page.waitForTimeout(2200);
  ok(flat(await main.locator('.ie-proves').innerText().catch(() => '')).startsWith('Shows program CW-7 Maris Piper 2.5kg proved'),
    `13d the study's own page says the program it shows proved (${flat(await main.locator('.ie-proves').innerText().catch(() => '—'))})`);
  /* on paper: the line's programs report says how each proved one was proved */
  await go(`#/programs?line=${WS}`);
  const dir = mkdtempSync(join(tmpdir(), 'lproof-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), main.getByRole('button', { name: 'Programs report' }).click()]);
  const file = join(dir, 'programs.pdf'); await dl.saveAs(file);
  const txt = flat(execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' })).replace(/\s+/g, '');
  const want = pr.lines.filter(l => l.proof).map(l => l.proof.word.slice(0, 60));
  const lost = want.filter(w => !txt.includes(w.replace(/\s+/g, '')));
  ok(want.length >= 4 && !lost.length, `13e the line's programs report says how each of ${want.length} was proved${lost.length ? ` — lost: ${lost.join(' | ')}` : ''}`);
  /* a job's program kept only on its list is proved where it sits: Passed
     in its one form, with what was seen — its test behind it, its line on
     its machine's stage made (it was "Track it here", then "Mark it proved"
     in the list folded at the foot) */
  await go(`#/project/${sd.projectId}/programs`);
  ok(await main.getByRole('button', { name: /Add a program, or change one/ }).count() === 0 && await main.getByRole('button', { name: 'Track it here' }).count() === 0, '13f no second list at the foot, no "Track it here"');
  const r07 = main.locator('.pgr', { hasText: 'PR-07 Baking Potatoes 2 kg' }).first();
  await r07.getByRole('button', { name: 'Test it' }).click(); await page.waitForTimeout(300);
  const f07 = r07.getByRole('group', { name: 'Test PR-07 Baking Potatoes 2 kg' });
  const blank = await f07.getByRole('button', { name: 'Save', exact: true }).isDisabled();
  await f07.getByRole('button', { name: 'Passed', exact: true }).click();
  await f07.locator('textarea').fill('Ran 2 kg potatoes for an hour at 40 a minute, no rejects');
  await f07.getByRole('button', { name: 'Save', exact: true }).click();
  /* the test, the proof and the stage's line are three writes: read once all have landed (a loaded gate is slow) */
  const read07 = () => page.evaluate(async pid => {
    const db = await import('/src/db.ts');
    const p = (await db.listPrograms(pid)).find(x => x.what === 'PR-07 Baking Potatoes 2 kg');
    const t = (await db.listTests(pid)).find(x => x.programId === p.id && !x.deletedAt);
    const part = (await db.listTestItems(pid)).find(i => !i.deletedAt && i.kind === 'next' && i.what === 'PR-07 Baking Potatoes 2 kg');
    return { p, t, part };
  }, sd.projectId);
  let j07 = await read07();
  for (let i = 0; i < 16 && !(j07.p.state === 'proved' && j07.t?.outcome === 'passed' && j07.part?.results?.length); i++) { await page.waitForTimeout(500); j07 = await read07(); }
  await page.waitForTimeout(600);
  ok(blank && j07.p.state === 'proved' && j07.t?.outcome === 'passed' && j07.t?.result === 'Ran 2 kg potatoes for an hour at 40 a minute, no rejects'
    && j07.part?.results?.at(-1)?.is === 'passed' && /proved/.test(flat(await r07.locator('.pgr-top').innerText())),
    '13f the job\'s program on its list only: Passed with what was seen proves it — its test behind it, its line on the stage, "proved" on its row');
}

/* ---- 14 one list of machines, every picker (flow audit #14) ---- */
{
  /* another line with a machine of its own, and a job on it with one: neither may reach this line's pickers */
  const other = await page.evaluate(async () => {
    const db = await import('/src/db.ts');
    const w = (await db.listWorkspaces()).find(x => x.name === 'Line 7');
    await db.addMachineToLine(w.id, 'Line seven bagger', 'Ishida');
    return w.id;
  });
  const of = (ws, job) => page.evaluate(async ([w, j]) => {
    const db = await import('/src/db.ts');
    const L = await import('/src/lib/lineRecords.ts');
    const [all, assets, jobLines] = await Promise.all([db.listWorkspaces(), db.listAllAssets(), db.allPaceLines()]);
    return L.machinesOf(all.find(x => x.id === w), assets, jobLines, j || undefined);
  }, [ws, job]);
  /* the Problem sheet, on the line */
  await go(`#/lines/${WS}`);
  await page.locator('.qs-top').first().click(); await page.waitForTimeout(800);
  const sheet = page.locator('.qs');
  await sheet.locator('label.cw-f', { has: page.locator('span', { hasText: /^LINE$/ }) }).locator('select').selectOption(WS); await page.waitForTimeout(600);
  const project = await sheet.locator('label.cw-f', { has: page.locator('span', { hasText: /^PROJECT/ }) }).locator('select').inputValue();
  let chips = (await sheet.locator('[aria-label="Which machine"] .chip').allInnerTexts()).map(flat);
  let want = await of(WS, project);
  ok(JSON.stringify(chips) === JSON.stringify(want) && !chips.includes('Line seven bagger'),
    `14 the Problem sheet offers this line's machines, in flow order, and no other line's (${chips.join(', ')})`);
  await sheet.locator('label.cw-f', { has: page.locator('span', { hasText: /^LINE$/ }) }).locator('select').selectOption(other); await page.waitForTimeout(600);
  chips = (await sheet.locator('[aria-label="Which machine"] .chip').allInnerTexts()).map(flat);
  ok(JSON.stringify(chips) === JSON.stringify(await of(other, await sheet.locator('label.cw-f', { has: page.locator('span', { hasText: /^PROJECT/ }) }).locator('select').inputValue())) && chips.includes('Line seven bagger') && !chips.includes('Ilapak flow wrapper'),
    `14b on another line, that line's: ${chips.join(', ')}`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  /* the stopwatch */
  await go(`#/w/${WS}/capture`);
  const sw = (await page.locator('.cap-block', { hasText: 'Which machine?' }).locator('.chip-row > button.chip:not(.chip-add)').allInnerTexts()).map(flat);
  want = await of(WS);
  ok(JSON.stringify(sw) === JSON.stringify(['Whole line', ...want]), `14c the stopwatch offers the whole line, then every machine on the line (${sw.length - 1} of ${want.length})`);
  /* Line capacity: its machine stations the line does not list are offered to the line, then reach every picker */
  const stdId = await page.evaluate(async ws => (await (await import('/src/db.ts')).listStandardsForLine(ws)).find(s => (s.capacity?.stations ?? []).length)?.id, WS);
  await go(`#/w/${WS}/standards/${stdId}?at=balance`);
  const offer = page.locator('.cap-unlisted');
  const unlisted = await page.evaluate(async ([ws, sid]) => {
    const db = await import('/src/db.ts'); const L = await import('/src/lib/lineRecords.ts');
    const [all, assets, jobLines, std] = await Promise.all([db.listWorkspaces(), db.listAllAssets(), db.allPaceLines(), db.getStandard ? db.getStandard(sid) : (await db.listStandardsForLine(ws)).find(s => s.id === sid)]);
    const known = new Set(L.machinesOf(all.find(x => x.id === ws), assets, jobLines).map(L.machineKey));
    return [...new Set(std.capacity.stations.filter(s => s.kind === 'machine' && s.name.trim() && !known.has(L.machineKey(s.name))).map(s => s.name.trim()))];
  }, [WS, stdId]);
  ok(unlisted.length > 0 && flat(await offer.innerText()).startsWith(`${unlisted.join(', ')} ${unlisted.length === 1 ? 'is' : 'are'} not on Line 7 — smoke test’s machines yet`),
    `14d Line capacity says its machine stations the line does not list (${unlisted.join(', ')})`);
  await offer.getByRole('button', { name: /to the line ›$/ }).click(); await page.waitForTimeout(1500);
  const after = await of(WS);
  ok(unlisted.every(n => after.includes(n)) && await offer.count() === 0 && (await page.locator('datalist[id^="cap-machines-"]').first().locator('option').evaluateAll(els => els.map(e => e.getAttribute('value')))).length === after.length,
    `14e added to the line with one tap — on its list, offered on every station (${after.length} machines)`);
  /* SMED's where offers them too */
  const smed = await page.evaluate(async ws => { const s = (await (await import('/src/db.ts')).listAllStudies()).find(x => x.tool === 'changeover' && x.workspaceId === ws && x.projectId); const L = await import('/src/lib/studyLinks.ts'); return s ? L.studyHref(s) : null; }, WS);
  if (smed) {
    await go(`#${smed}`);
    await page.locator('.co-sq').first().click(); await page.waitForTimeout(500);
    const places = await page.locator('#co-places option').evaluateAll(els => els.map(e => e.getAttribute('value')));
    ok(after.every(n => places.includes(n)), `14f SMED's "where" offers every machine on the line (${after.length})`);
    await page.keyboard.press('Escape'); await page.waitForTimeout(300);
  } else ok(true, '14f (no SMED seeded on the line)');
  /* a capability study's machine, picked from its line once it sits on one */
  const capId = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).find(s => s.tool === 'capability' && s.machine === 'Ishida CCW-RV-214W multihead weigher')?.id);
  await go(`#/capability/${capId}`);
  await main.getByRole('button', { name: 'Put on a line' }).click();
  await main.getByLabel('Put it on which line').selectOption(WS); await page.waitForTimeout(1200);
  const box = main.getByLabel('Which machine it is of');
  const offered = await page.locator(`#ie-machines-${capId} option`).evaluateAll(els => els.map(e => e.getAttribute('value')));
  const warned = flat(await main.locator('.ie-machine-not').innerText().catch(() => ''));
  await box.fill('Ishida checkweigher'); await box.press('Enter'); await page.waitForTimeout(900);
  const kept = await page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id))?.machine, capId);
  ok(JSON.stringify(offered) === JSON.stringify(after) && warned.includes('not one of the line’s machines') && kept === 'Ishida checkweigher' && await main.locator('.ie-machine-not').count() === 0,
    `14g a study put on the line: its typed machine said not one of the line's, the line's offered, one picked and kept (${kept})`);
  /* a new study of a machine, started on the line, offers them */
  await go(`#/capability?line=${WS}`);
  await main.getByRole('button', { name: 'New capability study' }).first().click(); await page.waitForTimeout(600);
  const fresh = await page.locator('#new-study-machines option').evaluateAll(els => els.map(e => e.getAttribute('value')));
  ok(JSON.stringify(fresh) === JSON.stringify(after), `14h a new study started on the line offers its machines (${fresh.length})`);
  await page.keyboard.press('Escape');
}

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\nMachines and programs NOT accepted: ${failed} failed` : '\nMachines and programs accepted: planned on a line with no job, from the control room; the line\'s machines in flow order; a job seeing and proving them; the factory and the paper');
process.exit(failed ? 1 : 0);
