/* A MACHINE'S OWN PICTURE (3 November — Rowland: "when I click on open machine, I can't actually add a picture of the machine ... what we
 * want is the picture of the machines to go in on the lines. So we're able to go across, see the pictures ... get access to the
 * problems directly to that machine"):
 *
 *  P1  the line's strip shows no picture from a problem — a machine with no picture of its own has no image
 *  P2  a machine's page offers Add a picture of the machine; a picture chosen is kept on its record (docs, marked picture),
 *      shown on the page, and after a reload
 *  P3  the strip card shows that picture; Change replaces it (one picture), Take it off removes it, Undo brings it back
 *  P4  a problem on a card opens itself — its own record, from the machine (not the register's whole page)
 *  P5  the picture is not counted as a paper of the machine
 *  Ph  the phone: the card and the page, nothing off the side
 */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { paper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 500)}` : ''}`); if (!c) fail++; };

/* a real JPEG made in a page, so the file is a picture */
const jpeg = async color => {
  const br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const p = await br.newPage();
  const data = await p.evaluate(c => { const cv = document.createElement('canvas'); cv.width = 800; cv.height = 450; const g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 800, 450); return cv.toDataURL('image/jpeg', 0.8).split(',')[1]; }, color);
  await br.close();
  return Buffer.from(data, 'base64');
};
const RED = await jpeg('#c4281c'), BLUE = await jpeg('#0c7489');

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const settle = async () => {
  await page.locator('.nv-main').waitFor({ timeout: 15000 });
  await page.waitForFunction(() => !/Loading…|Reading where|Opening /.test(document.querySelector('.nv-main')?.innerText ?? ''), null, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
};
const go = async hash => { await page.goto(`${BASE}/${hash}`); await settle(); };
const main = () => page.locator('.nv-main');
const hash = () => decodeURIComponent(page.url().split('#')[1] ?? '');

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const WS = sd.wsId;
const facts = await page.evaluate(async ws => {
  const db = await import('/src/db.ts');
  const { machinesOnLine, machineKey } = await import('/src/lib/lineRecords.ts');
  const line = await db.getWorkspace(ws);
  const [assets, jobLines, snags] = await Promise.all([db.listAllAssets(), db.allPaceLines(), db.listAllSnags()]);
  const ms = machinesOnLine(line, assets, jobLines);
  const withProblem = ms.find(m => snags.some(s => !s.deletedAt && s.workspaceId === ws && s.targetAsset && machineKey(s.targetAsset) === machineKey(m.name)));
  return { line: line.name, machine: (withProblem ?? ms[0])?.name, hasProblem: !!withProblem, docs: ms.map(m => (m.record?.docs ?? []).filter(d => d.picture).length) };
}, WS);
ok(!!facts.machine && facts.docs.every(n => n === 0), `the seed: ${facts.line} with machines and no machine picture yet (${facts.machine})`, JSON.stringify(facts));
/* a problem on the machine, so P4 is proved on every seed */
const M = facts.machine;
await page.evaluate(async ([ws, m]) => {
  const db = await import('/src/db.ts');
  await db.addSnag({ id: 'mp-s1', workspaceId: ws, problem: 'Film tracking off', targetAsset: m, status: 'open', priority: 'critical', raisedAt: Date.now() - 864e5, updatedAt: Date.now(), media: [] });
}, [WS, M]);
facts.hasProblem = true;

/* ---- P1 ---- */
await go(`#/lines/${WS}`);
const card = () => main().locator('.tour-card', { hasText: M }).first();
ok(await card().locator('.tour-img').count() === 0, 'P1 the strip card of a machine with no picture shows no image (a problem’s photo is the problem’s)');

/* ---- P2 ---- */
await go(`#/lines/${WS}/machine/${encodeURIComponent(M)}`);
ok(await main().locator('[data-machine-picture] button', { hasText: 'Add a picture of the machine' }).count() === 1, 'P2 the machine’s page offers “Add a picture of the machine”');
await main().locator('[data-machine-picture] input[type=file]').setInputFiles({ name: 'p160.jpg', mimeType: 'image/jpeg', buffer: RED });
await main().locator('[data-machine-picture] .mpic-img').waitFor({ timeout: 15000 });
ok(await main().locator('.mpic-img').count() === 1, 'P2 the picture is shown on the page once chosen');
const rec = async () => page.evaluate(async ([ws, m]) => {
  const db = await import('/src/db.ts');
  const { machinesOnLine, machineKey } = await import('/src/lib/lineRecords.ts');
  const line = await db.getWorkspace(ws);
  const [assets, jobLines] = await Promise.all([db.listAllAssets(), db.allPaceLines()]);
  const r = machinesOnLine(line, assets, jobLines).find(x => machineKey(x.name) === machineKey(m))?.record;
  return { docs: (r?.docs ?? []).map(d => ({ picture: !!d.picture, mime: d.mime })), n: assets.filter(a => !a.deletedAt && machineKey(a.name) === machineKey(m) && !a.projectId).length };
}, [WS, M]);
let r = await rec();
ok(r.docs.length === 1 && r.docs[0].picture && r.docs[0].mime.startsWith('image/') && r.n === 1, 'P2 kept on the machine’s one record as a docs entry marked picture', JSON.stringify(r));
await page.reload(); await settle();
ok(await main().locator('.mpic-img').count() === 1, 'P2 still there after a reload');
ok(await main().locator('[data-machine-picture] button', { hasText: 'Change the picture' }).count() === 1, 'P2 the button now says Change the picture');

/* ---- P3 ---- */
await go(`#/lines/${WS}`);
ok(await card().locator('img.tour-img').count() === 1, 'P3 the strip card shows the machine’s picture');
await go(`#/lines/${WS}/machine/${encodeURIComponent(M)}`);
await main().locator('[data-machine-picture] input[type=file]').setInputFiles({ name: 'p160b.jpg', mimeType: 'image/jpeg', buffer: BLUE });
await page.waitForTimeout(1500);
r = await rec();
ok(r.docs.length === 1 && r.docs[0].picture, 'P3 Change replaces it — still one picture', JSON.stringify(r));
await main().locator('[data-machine-picture] button', { hasText: 'Take it off' }).click(); await page.waitForTimeout(1000);
r = await rec();
ok(r.docs.length === 0 && await main().locator('.mpic-img').count() === 0, 'P3 Take it off removes it', JSON.stringify(r));
const undo = page.getByRole('button', { name: /^Undo$/ });
if (await undo.count()) { await undo.first().click(); await page.waitForTimeout(1200); }
r = await rec();
ok(r.docs.length === 1, 'P3 Undo brings it back', JSON.stringify(r));

/* ---- P4 ---- */
if (facts.hasProblem) {
  await go(`#/lines/${WS}`);
  const pr = card().locator('.tour-pr').first();
  ok(await pr.count() === 1, 'P4 the card lists its problems as buttons of their own');
  await pr.click(); await settle();
  ok(/^\/snags\?.*open=/.test(hash()), 'P4 a problem opens itself from the machine’s card', hash());
} else ok(true, 'P4 (no problem on a machine in this seed)');

/* ---- P5 ---- */
const papers = await page.evaluate(async () => { const { papersOf } = await import('/src/lib/machinePicture.ts'); return papersOf({ docs: [{ id: 'a', name: 'x', blobKey: 'k', mime: 'image/jpeg', savedAt: 1, picture: true }, { id: 'b', name: 'y.pdf', blobKey: 'k2', mime: 'application/pdf', savedAt: 1 }] }).length; });
ok(papers === 1, 'P5 a machine’s picture is not one of its papers');

/* ---- Q · the Machines tab offers it too (Rowland: "you can have it in both places") ---- */
await go(`#/lines/${WS}?view=machines`);
const row = () => main().locator('.pl-machine', { has: page.locator(`[data-machine="${M}"]`) }).or(main().locator(`.pl-machine[data-machine="${M}"]`)).first();
ok(await row().locator('[data-machine-picture]').count() === 1, 'Q1 the machine’s row on the Machines tab carries its picture control');
ok(await row().locator('.mpic-thumb').count() === 1, 'Q1 it shows the picture already on the machine (from its page)');
await row().locator('[data-machine-picture] button', { hasText: 'Take off' }).click(); await page.waitForTimeout(1000);
r = await rec();
ok(r.docs.length === 0, 'Q2 Take off on the row removes it', JSON.stringify(r));
await row().locator('[data-machine-picture] input[type=file]').setInputFiles({ name: 'row.jpg', mimeType: 'image/jpeg', buffer: BLUE });
await row().locator('.mpic-thumb').waitFor({ timeout: 15000 });
r = await rec();
ok(r.docs.length === 1 && r.docs[0].picture, 'Q2 a picture added from the row is kept on the record', JSON.stringify(r));

/* ---- R · the reports carry it ---- */
const dir = mkdtempSync(join(tmpdir(), 'mp-'));
const images = f => Number((execFileSync('pdfimages', ['-list', f], { encoding: 'utf8' }).trim().split('\n').length - 2) || 0);
const make = async (hashIn, label, name) => {
  await go(hashIn);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 40000 }), paper(page, label)]);
  const f = join(dir, name); await dl.saveAs(f); return f;
};
const one = await make(`#/lines/${WS}/machine/${encodeURIComponent(M)}`, 'Machine report', 'one.pdf');
ok(images(one) >= 1, 'R1 the machine report carries the machine’s picture', images(one));
/* the machine with no picture: none */
const other = await page.evaluate(async ws => { const db = await import('/src/db.ts'); const { machinesOnLine } = await import('/src/lib/lineRecords.ts'); const l = await db.getWorkspace(ws); return machinesOnLine(l, await db.listAllAssets(), await db.allPaceLines()).map(m => m.name); }, WS);
const bare = other.find(n => n !== M);
if (bare) {
  const f = await make(`#/lines/${WS}/machine/${encodeURIComponent(bare)}`, 'Machine report', 'bare.pdf');
  ok(images(f) === 0, `R2 a machine with no picture prints none (${bare})`, images(f));
}
const all = await make(`#/lines/${WS}?view=machines`, 'Machines report', 'all.pdf');
ok(images(all) >= 1, 'R3 the line’s Machines report carries it on that machine’s page', images(all));

/* ---- Ph ---- */
await page.setViewportSize({ width: 375, height: 800 });
for (const h of [`#/lines/${WS}`, `#/lines/${WS}/machine/${encodeURIComponent(M)}`]) {
  await go(h);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 1, `Ph nothing off the side on ${h.split('/').slice(-1)[0].slice(0, 20)}`, over);
}
ok(errs.length === 0, 'no console errors', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
