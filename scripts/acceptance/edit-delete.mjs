/* ACCEPTANCE — EVERY RECORD EDITED AND DELETED WHERE IT SITS (docs/AUDIT.md,
 * bar 2).
 *
 * Rowland, 13 October: "always implement deletes and editing in everything".
 * The audit read every place a record is listed or opened; these are the
 * gaps it found, driven in a real browser on the seeded data with the real
 * controls, so each stays closed in every gate after:
 *
 *   A  STUDIES — no study could be deleted anywhere, and a value stream map
 *      or a work sampling study could not be renamed even on its own page.
 *      1  every tool's list: Rename and Delete on each row (capability,
 *         value stream, SMED, work sampling, loss count)
 *      2  renamed in its row, kept
 *      3  deleted from its row: the ask says what goes with it and what
 *         stays (lib/studyLinks studyRemovingSays), it leaves the list,
 *         Undo puts it back whole
 *      4  every tool's own page: Rename and Delete beside its name — the
 *         map and work sampling renamed there
 *      5  deleted from its page: back on its tool's list on its line, Undo
 *   B  PROBLEMS OF A RUNNING LINE
 *      1  a 6M problem's words changed on its card, where it is opened —
 *         its causes kept (they were fixed once it was opened)
 *      2  the old A3 (a case on a line, no job): deleted with Undo, its ask
 *         saying what stays — it was a hard delete with no way back
 *   C  A STOP TIMED ON THE LINE — could be deleted, never changed
 *      1  tapped in the log, it opens to be changed where it is listed
 *      2  what it was, its minutes, its note changed — minutes typed over
 *         say typed, its end moves with them (lib/stopEdit)
 *      3  Undo: as the stopwatch timed it
 *   D  A WIN AND A READING — each asked, then gone for good; now Undo
 *   E  THE LINE'S OWN PAGE — its machines renamed and taken off where they
 *      sit (only in Set up the line before), Undo putting one back where it
 *      stood in the flow; the line archived from its own page, with Undo
 *   F  A PROBLEM IN THE REGISTER — asked, then gone for good (and the other
 *      devices not told until the next write); now Undo
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/edit-delete.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
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
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
/* every confirm is read, then answered as `answer` says */
let asked = ''; let answer = true;
page.on('dialog', d => { asked = d.message(); void (answer ? d.accept() : d.dismiss()); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(1800); };
const main = () => page.locator('.nv-main');
const txt = async () => (await main().innerText()).replace(/\s+/g, ' ');
const db = (fn, arg) => page.evaluate(async ([src, a]) => { const D = await import('/src/db.ts'); return (0, eval)(src)(D, a); }, [fn.toString(), arg]);
const undo = async () => { await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(900); };

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const study = id => db((D, id) => D.getStudy(id), id);

/* ================= A · STUDIES ================= */
const TOOLS = [
  { list: '#/capability', id: sd.studyId, page: id => `#/capability/${id}` },
  { list: '#/value-stream', id: sd.lineMapId, page: id => `#/value-stream/${id}` },
  { list: '#/smed', id: sd.changeoverId, page: id => `#/smed/${id}` },
  { list: '#/sampling', id: sd.samplingId, page: id => `#/sampling/${id}` },
  { list: '#/losses', id: sd.lossId, page: id => `#/losses/${id}` },
];
for (const T of TOOLS) {
  const s = await study(T.id);
  await go(T.list);
  const row = main().locator(`.lt-li[data-study="${T.id}"]`);
  ok(await row.count() === 1 && await row.getByRole('button', { name: `Delete ${s.name}`, exact: true }).count() === 1, `A1 ${T.list}: “${s.name}” has Rename and Delete on its row`);
}

/* 2 · renamed in its row */
{
  const s = await study(sd.studyId);
  await go('#/capability');
  await main().locator(`.lt-li[data-study="${sd.studyId}"]`).getByRole('button', { name: `Rename ${s.name}`, exact: true }).click();
  await page.getByLabel(`The study's name — ${s.name}`).fill('Weight accuracy 400 g — Weigher 2');
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(900);
  const now = await study(sd.studyId);
  ok(now.name === 'Weight accuracy 400 g — Weigher 2' && /Weight accuracy 400 g — Weigher 2/.test(await txt()), `A2 renamed in its row: “${now.name}”`);
}

/* 3 · deleted from its row: what goes with it, gone from the list, Undo */
{
  const s = await study(sd.lineMapId);
  const want = await page.evaluate(async id => (await import('/src/lib/studyLinks.ts')).studyRemovingSays(await (await import('/src/db.ts')).getStudy(id)), sd.lineMapId);
  await go('#/value-stream');
  answer = false;
  const row = main().locator(`.lt-li[data-study="${sd.lineMapId}"]`);
  await row.getByRole('button', { name: `Delete ${s.name}`, exact: true }).click(); await page.waitForTimeout(500);
  ok(asked === want.ask && /Its \d+ steps/.test(asked) && /evidence for 1 fix/.test(asked) && !!(await study(sd.lineMapId)), `A3 the ask says what goes and what stays — answered no, kept: "${asked.replace(/\n+/g, ' / ')}"`);
  answer = true;
  const before = await main().locator('.lt-li').count();
  await row.getByRole('button', { name: `Delete ${s.name}`, exact: true }).click(); await page.waitForTimeout(900);
  ok(!(await study(sd.lineMapId)) && await main().locator('.lt-li').count() === before - 1 && /Deleted the value stream map/.test(await page.locator('body').innerText()), 'A3 deleted: off the list, said, and Undo offered');
  await undo();
  const back = await study(sd.lineMapId);
  ok(!!back && back.uses.length === s.uses.length && (back.facts.flow ?? []).length === (s.facts.flow ?? []).length && await main().locator('.lt-li').count() === before, 'A3 Undo: back whole — its steps and its links');
}

/* 4 · its own page: Rename and Delete beside its name; the map and work
   sampling renamed there */
for (const T of TOOLS) {
  const s = await study(T.id);
  await go(T.page(T.id));
  const head = page.locator('.ie-name').first();
  ok(await head.getByRole('button', { name: 'Rename', exact: true }).count() === 1 && await head.getByRole('button', { name: `Delete ${s.name}`, exact: true }).count() === 1, `A4 ${T.page('…')}: Rename and Delete beside “${s.name}”`);
}
for (const [id, to] of [[sd.lineMapId, 'Line 7, run released to pallet away'], [sd.samplingId, 'Packing hall, days']]) {
  const T = TOOLS.find(x => x.id === id);
  await go(T.page(id));
  await page.locator('.ie-name').getByRole('button', { name: 'Rename', exact: true }).click();
  await page.getByLabel('What it is of').fill(to); await page.keyboard.press('Enter'); await page.waitForTimeout(800);
  ok((await study(id)).name === to && (await page.locator('h1.ie-name').innerText()).startsWith(to), `A4 renamed on its own page: “${to}”`);
}

/* 5 · deleted from its own page: its tool's list on its line, Undo */
{
  const s = await study(sd.samplingId);
  await go(`#/sampling/${sd.samplingId}`);
  await page.locator('.ie-name').getByRole('button', { name: `Delete ${s.name}`, exact: true }).click(); await page.waitForTimeout(1200);
  ok(!(await study(sd.samplingId)) && page.url().endsWith(`#/sampling?line=${s.workspaceId}`) && /Its \d+ taps go with it/.test(asked), `A5 deleted from its page: on ${page.url().split('#')[1]}, "${asked.split('\n')[2] ?? ''}"`);
  await undo();
  ok(!!(await study(sd.samplingId)) && /Packing hall, days/.test(await txt()), 'A5 Undo: back on its line\'s list');
}

/* ================= B · PROBLEMS OF A RUNNING LINE ================= */
/* 1 · a 6M problem in better words, on its card, where it is opened */
{
  const before = await db((D, id) => D.getCase(id), sd.problemId);
  await go(`#/project/${sd.pacedProjectId}/fishbone?problem=${sd.problemId}&panel=problem`);
  await page.getByRole('button', { name: 'Change the words', exact: true }).first().click();
  await page.getByLabel('The problem, in words').fill('Basketer misfeeds on the 2kg — bags miss the basket');
  await page.getByRole('button', { name: 'Save', exact: true }).first().click(); await page.waitForTimeout(1200);
  const after = await db((D, id) => D.getCase(id), sd.problemId);
  ok(after.title === 'Basketer misfeeds on the 2kg — bags miss the basket' && (after.causes ?? []).length === (before.causes ?? []).length && after.status === before.status,
    `B1 the 6M problem's words changed on its card, its causes kept: “${after.title}” (was “${before.title}”)`);
  ok((await txt()).includes('Basketer misfeeds on the 2kg — bags miss the basket'), 'B1 the fishbone says the new words');
}
/* 2 · the old A3 (a case on a line, no job): deleted with Undo, saying what stays */
{
  await go(`#/w/${sd.wsId}/case/${sd.caseId}`);
  answer = true;
  await page.getByRole('button', { name: 'Delete this case', exact: true }).click(); await page.waitForTimeout(1200);
  const gone = await db((D, id) => D.getCase(id), sd.caseId);
  ok(!gone && /Delete the case “seeded case”\?/.test(asked) && /stay/.test(asked) && /Undo brings it back/.test(asked) && /\/analyse/.test(page.url()), `B2 the case deleted, its ask saying what stays: "${asked.replace(/\n+/g, ' / ')}"`);
  await undo();
  ok(!!(await db((D, id) => D.getCase(id), sd.caseId)), 'B2 Undo: the case is back');
}

/* ================= C · A STOP TIMED ON THE LINE ================= */
{
  const list = await db((D, ws) => D.listObservations(ws), sd.wsId);
  const o = list[0];
  await go(`#/w/${sd.wsId}/capture`);
  await main().getByRole('button', { name: `Change ${o.category} on ${o.asset}`, exact: true }).first().click(); await page.waitForTimeout(500);
  const sheet = page.locator('.sheet, [role="dialog"]').last();
  ok(await sheet.getByLabel('Which machine').inputValue() === o.asset && await sheet.getByLabel('What it was').inputValue() === o.category, `C1 a stop opens to be changed where it is listed: ${o.asset} · ${o.category}`);
  const to = (await sheet.getByLabel('What it was').locator('option').allInnerTexts()).find(x => x !== o.category);
  await sheet.getByLabel('What it was').selectOption(to);
  await sheet.getByLabel('How long, in minutes').fill('12');
  await sheet.getByLabel('Note').fill('the stopwatch was left running');
  await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1000);
  const now = (await db((D, ws) => D.listObservations(ws), sd.wsId)).find(x => x.id === o.id);
  ok(now.category === to && now.durationMs === 720_000 && now.timing === 'typed' && now.endedAt === now.startedAt + 720_000 && now.note === 'the stopwatch was left running',
    `C2 changed: ${now.category}, ${now.durationMs / 60000} min, said typed (${now.timing}), its end moved`);
  ok(/Changed · /.test(await page.locator('body').innerText()) && /typed/.test(await txt()), 'C2 said, and the log says it was typed');
  await undo();
  const back = (await db((D, ws) => D.listObservations(ws), sd.wsId)).find(x => x.id === o.id);
  ok(back.category === o.category && back.durationMs === o.durationMs && back.timing === 'stopwatch', 'C3 Undo: the stop as the stopwatch timed it');
}

/* ================= D · A WIN, A READING — Undo after the ask ================= */
{
  const wins = () => db((D, a) => D.listPaceWins(a[0], a[1]), [sd.projectId, sd.lineId]);
  const w0 = (await wins()).find(w => w.title === 'seeded win');
  await go(`#/project/${sd.projectId}/line/${sd.lineId}?view=wins`);
  await main().getByRole('button', { name: 'Delete this win', exact: true }).first().click(); await page.waitForTimeout(900);
  ok(!(await wins()).some(w => w.id === w0.id) && /Undo brings it back/.test(asked) && /Deleted the win “seeded win”/.test(await page.locator('body').innerText()), 'D1 a win deleted: asked, said, Undo offered');
  await undo();
  ok((await wins()).some(w => w.id === w0.id && w.title === 'seeded win'), 'D1 Undo: the win is back');
}
{
  const reads = () => db((D, id) => D.listReadings(id), sd.pacedProjectId);
  const n0 = (await reads()).length;
  await go(`#/project/${sd.pacedProjectId}?view=data`);
  const x = main().locator('button[aria-label^="Remove "][aria-label*=" on 20"]').first();
  const label = await x.getAttribute('aria-label');
  await x.click(); await page.waitForTimeout(900);
  ok((await reads()).length === n0 - 1 && /Deleted the reading of /.test(await page.locator('body').innerText()), `D2 a reading deleted (${label}): said, Undo offered`);
  await undo();
  ok((await reads()).length === n0, 'D2 Undo: the reading is back');
}

/* ================= E · THE LINE'S OWN PAGE ================= */
{
  const L = `#/lines/${sd.wsId}`;
  const ws = () => db((D, id) => D.getWorkspace(id), sd.wsId);
  await go(L);
  const w0 = await ws();
  const first = w0.assets.find(a => a !== 'Whole line') ?? w0.assets[0];
  const row = main().locator(`.pl-machine[data-machine="${first}"]`);
  ok(await row.getByRole('button', { name: `Rename ${first}`, exact: true }).count() === 1 && await row.getByRole('button', { name: `Take ${first} off the line`, exact: true }).count() === 1, `E1 a machine on the line's page: Rename and Remove where it sits (${first})`);
  /* renamed: the list and its record follow */
  await row.getByRole('button', { name: `Rename ${first}`, exact: true }).click();
  await page.getByLabel(`The machine's name — ${first}`).fill(`${first} 2`);
  await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1000);
  let w = await ws();
  ok(w.assets.includes(`${first} 2`) && !w.assets.includes(first) && w.assets.indexOf(`${first} 2`) === w0.assets.indexOf(first), `E2 renamed in its place in the flow: ${w.assets.join(' → ')}`);
  /* taken off: asked, said, Undo puts it back where it stood */
  await main().locator(`.pl-machine[data-machine="${first} 2"]`).getByRole('button', { name: `Take ${first} 2 off the line`, exact: true }).click(); await page.waitForTimeout(900);
  w = await ws();
  ok(!w.assets.includes(`${first} 2`) && /Take “.+” off /.test(asked) && /Undo puts it back/.test(asked), `E3 taken off the line: "${asked.replace(/\n+/g, ' / ')}"`);
  await undo();
  w = await ws();
  ok(w.assets.indexOf(`${first} 2`) === w0.assets.indexOf(first), 'E3 Undo: back where it stood in the flow');
  /* archived from its own page, with Undo */
  await go(L);
  await main().getByRole('button', { name: 'Edit the line', exact: true }).click();
  await main().getByRole('button', { name: 'Archive this line', exact: true }).click(); await page.waitForTimeout(1200);
  ok((await ws()).archived === true && /#\/factory/.test(page.url()) && /loses nothing/.test(asked), 'E4 the line archived from its own page: on Your factory');
  await undo();
  ok((await ws()).archived === false, 'E4 Undo: the line is back on the floor');
}

/* ================= F · A PROBLEM IN THE REGISTER — Undo after the ask ================= */
{
  const all = () => db(D => D.listAllSnags());
  const s0 = (await all()).find(x => x.problem === 'seeded snag 0');
  await go('#/snags');
  const r = page.locator('.qsl-row', { hasText: 'seeded snag 0' }).first();
  await r.locator('.qsl-tick input').check();
  await page.locator('.qsl-bar').getByRole('button', { name: 'Delete', exact: true }).click(); await page.waitForTimeout(1200);
  ok(!(await all()).some(x => x.id === s0.id) && /Undo brings it back/.test(asked) && await page.locator('.qsl-row', { hasText: 'seeded snag 0' }).count() === 0 && /Deleted 1 problem/.test(await page.locator('body').innerText()),
    'F1 a problem deleted from the register: asked, gone from the page, Undo offered');
  await undo();
  const back = (await all()).find(x => x.id === s0.id);
  ok(!!back && back.problem === 'seeded snag 0' && back.status === s0.status && await page.locator('.qsl-row', { hasText: 'seeded snag 0' }).count() === 1, 'F1 Undo: the problem is back on the register');
}

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
