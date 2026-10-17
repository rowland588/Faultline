/* ACCEPTANCE — THE CASE FOR THE CHANGE (docs/CASE.md, BLUEPRINT §6, 12).
 *
 * Rowland, 17 October: "at its core faultline is a project management system
 * ... what we could introduce into faultline that would make it more
 * powerful". A job said when it hands over, never what it is for in money.
 * Driven in a real browser on the seeded stage-gate job with the real controls:
 *
 *   1  under the band: what it is for, and — its line's shifts and margin
 *      not in Your factory — what to give, as lib/businessCase says it
 *   2  the line's shifts and margin given: the case priced, as the module says
 *   3  the owner changes it — the rate before and the days a week typed, the
 *      worth worked out as it is typed, saved, said under the band, kept
 *      after a reload
 *   4  the one-page status and the full report print it, whole
 *   5  a client reads it and has no way to change it
 *   and no console error.
 *
 *   node scripts/acceptance/business-case.mjs      (SMOKE_BASE, as smoke) */
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
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
const OUT = mkdtempSync(join(tmpdir(), 'case-'));
const pdfText = f => flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const FRONT = `#/project/${sd.projectId}`;
/* What the module says of the case as the records stand. */
const truth = () => page.evaluate(async pid => {
  const { caseLinesOf, caseSays, readCase } = await import('/src/lib/businessCase.ts');
  const P = await import('/src/db/projects.ts'); const M = await import('/src/db/measures.ts');
  const { allPaceLines } = await import('/src/db/pace.ts'); const { listWorkspaces } = await import('/src/db/workspaces.ts');
  const { todayISO } = await import('/src/lib/weeks.ts');
  const p = await P.getProject(pid), today = todayISO();
  const lines = caseLinesOf(pid, p, await allPaceLines(), await listWorkspaces(), await M.listTargets(pid), await M.listReadings(pid), today);
  return caseSays(readCase(p.businessCase, lines, today, p.expectedAt ?? p.plannedAt)) ?? null;
}, sd.projectId);
const front = async () => { await page.goto(`${BASE}/${FRONT}`); await page.waitForTimeout(2600); };
const said = async () => ({ why: flat(await page.locator('[data-case] .bz-why').innerText().catch(() => '')), worth: flat(await page.locator('[data-case] .bz-worth').innerText().catch(() => '')) });

/* ---- 1 under the band, what to give ---- */
await front();
let t = await truth(), s = await said();
ok(!!t && s.why === t.why && s.worth === t.worth && /^Not priced yet — give .*its shifts and its margin a pack in Your factory$/.test(s.worth),
  `1 under the band: “${s.why}” — “${s.worth}”`);

/* ---- 2 the line's facts given in Your factory: priced ---- */
await page.evaluate(async () => {
  const W = await import('/src/db/workspaces.ts');
  const ws = (await W.listWorkspaces()).find(w => w.name === 'Line 7 — smoke test');
  await W.updateWorkspace({ ...ws, shifts: [{ name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }, { name: 'Lates', start: '14:00', end: '22:00', breakMin: 30 }], packsPerMin: 120, marginPerPack: 0.12 });
});
await front();
t = await truth(); s = await said();
ok(s.worth === t?.worth && s.worth.startsWith('£64.8k a week of margin — Line 7 — smoke test from 0 to 120 a minute, 5 days a week'), `2 priced from Your factory: “${s.worth}”`);

/* ---- 3 the owner changes it ---- */
await page.locator('[data-case] .bz-edit').click(); await page.waitForTimeout(600);
await page.getByLabel(/the rate before/).fill('20');
await page.getByLabel('Days it runs a week').fill('4');
await page.waitForTimeout(300);
const live = flat(await page.locator('.bz-says').innerText());
ok(live.startsWith('£43.2k a week of margin — Line 7 — smoke test from 20 to 120 a minute, 4 days a week'), `3a worked out as it is typed: “${live}”`);
await page.getByRole('button', { name: 'Save the case' }).click();
await page.waitForFunction(() => /£43\.2k/.test(document.querySelector('[data-case] .bz-worth')?.textContent ?? ''), null, { timeout: 8000 }).catch(() => {});
s = await said(); t = await truth();
ok(s.worth === t?.worth && s.worth.startsWith('£43.2k'), `3b saved and said under the band: “${s.worth}”`);
await front();
ok((await said()).worth === t?.worth, '3c kept after a reload');

/* ---- 4 on paper ---- */
await page.goto(`${BASE}/${FRONT}/report`); await page.waitForTimeout(2600);
const grab = async (name, button) => {
  await page.getByRole('button', { name: button, exact: true }).first().click(); await page.waitForTimeout(900);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 40000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
  const f = join(OUT, name); await dl.saveAs(f); return pdfText(f);
};
const status = await grab('status.pdf', 'Status — 1 page');
const full = await grab('full.pdf', 'Full report');
for (const [name, txt] of [['the one-page status', status], ['the full report', full]]) {
  ok(txt.includes('THE CASE FOR THE CHANGE') && txt.includes(t.why) && txt.includes(t.worth), `4 ${name} prints the case whole`);
}

/* ---- 5 a client reads it, changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await front();
ok((await said()).worth === t.worth && await page.locator('[data-case] .bz-edit').count() === 0, '5 a client reads the case, with no way to change it');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, `no console error${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `${failed} failed` : 'The case for the change accepted: what the job is for, priced from Your factory, written by its owner, under the band and on both papers, read by a client');
process.exit(failed ? 1 : 0);
