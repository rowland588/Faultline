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
 *   7  a job on the line sees the line's own programs — the same records;
 *      "Prove it in Commission" plans its test; the test passed proves the
 *      line's program, on the line and in the control room
 *   8  Your factory: each line's machines in flow order and its programs in
 *      words, on the screen and on its paper
 *   9  the programs report of the line: its sentence and every program
 *   10 Line capacity on the line offers its machines
 *   11 on a phone: nothing off the side
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
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
const main = page.locator('.nv-main');

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
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
    programs: kit.programs.map(p => ({ id: p.id, what: p.what, projectId: p.projectId, workspaceId: p.workspaceId, assetId: p.assetId, state: p.state, provedOn: p.provedOn, testOn: p.testOn, note: p.note, runs: p.runs })),
    reading: r ? { total: r.total, done: r.done, late: r.late, open: r.open, says: r.says } : null,
  };
}, WS);
const iso = d => new Date(Date.now() + d * 86_400_000).toISOString().slice(0, 10);

/* ---- 1 from the control room ---- */
{
  await go('#/');
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
  await form.getByRole('button', { name: 'Plan it' }).click(); await page.waitForTimeout(1500);
  const t = await truth();
  const p = t.programs.find(x => x.what === 'LB-2 Express labels');
  const m = t.machines.find(x => x.name === 'Labeller');
  ok(!!p && p.projectId === '' && p.workspaceId === WS && p.state === 'needed' && p.note === 'Herma to send the label file' && p.runs === 'Tesco Express 1.25 kg', '3 planned on the line with no job, its commentary and what it runs kept');
  ok(!!m && m.id === p?.assetId && t.list.includes('Labeller'), "3b on a machine not listed yet: the machine joins the line's list, its record made");
  ok(await main.locator('.lp-m', { hasText: 'Labeller' }).locator(`[data-program="${p?.id}"]`).count() === 1 && flat(await main.locator('.fac-added').innerText()).includes('LB-2 Express labels is planned on Line 7 — smoke test, on the Labeller'), '3c on the page under its machine, and said so');
}

/* ---- 4 where it has got to, its commentary, its test day, proved ---- */
{
  /* a line's own row is its boxes — found by its record, not by its text */
  const lb = (await truth()).programs.find(x => x.what === 'LB-2 Express labels');
  const row = () => main.locator(`[data-program="${lb.id}"]`);
  await row().getByLabel('Where LB-2 Express labels has got to').selectOption('onMachine'); await page.waitForTimeout(800);
  const note = row().getByLabel('Commentary on LB-2 Express labels');
  await note.fill('On the HMI — not run yet'); await note.press('Enter'); await page.waitForTimeout(800);
  await row().getByLabel('Day LB-2 Express labels is tested').fill(iso(-3)); await page.waitForTimeout(300);
  await row().getByLabel('Day LB-2 Express labels is tested').blur(); await page.waitForTimeout(1000);
  let p = (await truth()).programs.find(x => x.what === 'LB-2 Express labels');
  ok(p.state === 'onMachine' && p.note === 'On the HMI — not run yet' && p.testOn === iso(-3), '4 on the machine, its commentary and its test day, kept');
  ok(/is-pg-overdue/.test(await row().getAttribute('class')) && flat(await row().locator('.mt-when-n').innerText()) === 'test was 3 days ago', '4b a test day gone by: red, "test was 3 days ago"');
  await row().getByLabel('Where LB-2 Express labels has got to').selectOption('proved'); await page.waitForTimeout(300);
  await row().locator('input[type=date]').last().fill(iso(-1));
  await row().getByRole('button', { name: 'It’s proved' }).click(); await page.waitForTimeout(1000);
  p = (await truth()).programs.find(x => x.what === 'LB-2 Express labels');
  ok(p.state === 'proved' && p.provedOn === iso(-1) && !p.testOn && /is-pg-proved/.test(await row().getAttribute('class')), '4c proved asks the day and keeps it — green');
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

/* ---- 7 a job on the line sees the line's own programs ---- */
{
  await go(`#/project/${sd.projectId}/programs`);
  const sec = main.locator('.lpj', { hasText: 'On Line 7 — smoke test, with no job' });
  const t = await truth();
  const own = t.programs.filter(p => !p.projectId);
  const rows = await sec.locator('.lpj-row b').allInnerTexts();
  ok(own.every(p => rows.includes(p.what)) && rows.length === own.length, `7 the job sees the line's own programs — the same records (${rows.join(', ')})`);
  const cw3 = sec.locator('.lpj-row', { hasText: 'CW-3 Maris Piper 2kg' });
  await cw3.getByRole('button', { name: 'Prove it in Commission' }).click(); await page.waitForTimeout(1500);
  const test = await page.evaluate(async pid => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.title === 'Prove program CW-3 Maris Piper 2kg'), sd.projectId);
  const cw = t.programs.find(p => p.what === 'CW-3 Maris Piper 2kg');
  ok(!!test && test.programId === cw.id && test.outcome === 'planned', "7b Prove it in Commission plans its test, naming the line's program");
  /* its test passed in Commission (the test's own screen writes the same) */
  await page.evaluate(async ([tid, day]) => { const db = await import('/src/db.ts'); const row = await (await db.getDB()).get('tests', tid); await db.putTest({ ...row, outcome: 'passed', ranOn: day }); }, [test.id, iso(0)]);
  await page.waitForTimeout(800);
  const after = (await truth()).programs.find(p => p.what === 'CW-3 Maris Piper 2kg');
  ok(after.state === 'proved' && after.provedOn === iso(0) && after.projectId === '', "7c the test passed proves the line's program — still the line's, on no job");
  await go(`#/programs?line=${WS}`);
  ok(/is-pg-proved/.test(await main.locator(`[data-program="${cw.id}"]`).getAttribute('class')), '7d proved on the control room\'s Programs too');
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

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\nMachines and programs NOT accepted: ${failed} failed` : '\nMachines and programs accepted: planned on a line with no job, from the control room; the line\'s machines in flow order; a job seeing and proving them; the factory and the paper');
process.exit(failed ? 1 : 0);
