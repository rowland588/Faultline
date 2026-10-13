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

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nall passed');
process.exit(failed ? 1 : 0);
