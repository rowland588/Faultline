/* ACCEPTANCE — A STUDY ON A RUNNING LINE (docs/BUILD.md, 2h).
 *
 * Release 2 proved the ecosystem on a stage-gate job: a study, a test, a fix,
 * before → after, the client report. On a running line (6M) the records are
 * a cause on the fishbone and a countermeasure on the board, and the same
 * story has to hold there, driven in a real browser on the 6M stress job:
 *
 *   1  the board's countermeasure says how we know it was needed, what
 *      proved it and before → after — as the module says
 *   2  the cause's panel on the fishbone says how we know it
 *   3  the study lists both, and offers the job's causes and countermeasures
 *      (never its tests and fixes)
 *   4  Make it better raises a countermeasure on the board — the study's
 *      figures its words, what it should change said — and it opens there
 *      with the study as how we know
 *   5  the 6M report's PDF carries the countermeasure's before → after
 *   and a client reads the countermeasure and changes nothing.
 *
 * Fails on any console error.
 *
 *   node scripts/acceptance/sixm-evidence.mjs      (SMOKE_BASE, as smoke) */
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
const OUT = mkdtempSync(join(tmpdir(), 'acceptance-'));

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
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2500); };
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const j = await page.evaluate(async () => {
  const j = await (await import('/src/dev/reportSeeds.ts')).seedSixMJob('huge');
  const { listStudies } = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
  const studies = await listStudies(j.projectId);
  const ev = studies.find(s => s.tool === 'capability' && s.uses.some(u => u.kind === 'cause'));
  const action = ev.uses.find(u => u.kind === 'action').ref, cause = ev.uses.find(u => u.kind === 'cause').ref;
  return { ...j, ev: ev.id, evLine: L.studyLine(ev).text, title: L.studyTitle(ev), action, cause, ba: L.beforeAfter(studies, action, 'action')?.text, proved: L.provedLine(studies, action, 'action') };
});
const P = `#/project/${j.projectId}`;

/* ---- 1 · the countermeasure's sheet ---- */
await go(`${P}/board?a=${encodeURIComponent(j.action)}`);
await page.locator('.sl').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const w = await words('.sl');
  ok(/How we know/i.test(w) && /Proved by/i.test(w) && w.includes(j.evLine) && !!j.ba && (await words('.sl-ba')) === `Before → after: ${j.ba}`,
    `1 the countermeasure: how we know, proved by, "${await words('.sl-ba')}"`);
}

/* ---- 2 · the cause's panel ---- */
{
  const [cp, cc] = j.cause.split(':');
  await go(`${P}/fishbone?problem=${cp}&cause=${cc}`);
  await page.locator('.sl-cause').first().waitFor({ timeout: 10000 }).catch(() => {});
  const w = await words('.sl-cause');
  ok(/How we know/i.test(w) && w.includes(j.title) && w.includes(j.evLine), `2 the cause's panel: "${w.slice(0, 140)}"`);
}

/* ---- 3 · the study: what it is used for, and what it could be ---- */
await go(`#/capability/${j.ev}`);
await page.locator('.ie-used').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const w = await words('.ie-used');
  ok(/How we know: /.test(w) && /How we know it was needed: /.test(w), `3 used for: "${w.slice(0, 200)}"`);
  await page.getByRole('button', { name: 'Use it for…' }).click(); await page.waitForTimeout(400);
  const groups = await page.getByLabel('Use it for').locator('optgroup').evaluateAll(gs => gs.map(g => g.getAttribute('label')));
  ok(JSON.stringify(groups) === JSON.stringify(['Causes on the fishbone', 'Countermeasures on the board']), `3 it offers the job's causes and countermeasures: ${groups.join(' · ')}`);
  await page.reload(); await page.waitForTimeout(2500);
}

/* ---- 4 · Make it better — a countermeasure on the board ---- */
{
  const before = await page.evaluate(async pid => (await (await import('/src/db.ts')).listPaceTodos(pid)).map(t => t.id), j.projectId);
  await page.getByRole('button', { name: 'Make it better — a countermeasure' }).click(); await page.waitForTimeout(3000);
  const t = await page.evaluate(async ([pid, was, ev]) => {
    const db = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
    const row = (await db.listPaceTodos(pid)).find(x => !was.includes(x.id));
    const s = await db.getStudy(ev);
    return row && { row, want: L.betterWords(s), expect: L.betterExpect(s), linked: s.uses.some(u => u.kind === 'action' && u.ref === row.id && u.role === 'evidence') };
  }, [j.projectId, before, j.ev]);
  ok(!!t && t.row.what === t.want && t.row.expect === t.expect && t.linked && /\/board/.test(page.url()), `4 a countermeasure: "${t?.row.what}" — should change: "${t?.row.expect}"`);
  await page.locator('.sl').first().waitFor({ timeout: 10000 }).catch(() => {});
  const w = await words('.sl');
  ok(/How we know/i.test(w) && w.includes(j.evLine) && (await page.getByRole('button', { name: /^Prove it/ }).count()) === 1, '4 it opens on the board, the study its how we know, Prove it offered');
}

/* ---- 5 · the 6M report's PDF ---- */
await go(`#/pace-report?project=${j.projectId}`);
{
  /* the full report — the status page is the one offered first (17 below) */
  await page.getByRole('button', { name: 'Full report', exact: true }).click(); await page.waitForTimeout(400);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
  const pdf = join(OUT, 'sixm.pdf'); await dl.saveAs(pdf);
  const san = s => s.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  ok(san(pdfText(pdf)).includes(san(j.proved).slice(0, 70)), `5 the 6M report: "${j.proved.slice(0, 90)}…"`);
}

/* ---- a client reads the countermeasure and changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`${P}/board?a=${encodeURIComponent(j.action)}`);
await page.locator('.sl').first().waitFor({ timeout: 10000 }).catch(() => {});
ok((await page.locator('.sl').count()) === 1 && (await page.getByRole('button', { name: /^Prove it/ }).count()) === 0, 'a client reads how it is known and changes nothing');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\n2h accepted: a study holds on a running line');
process.exit(failed ? 1 : 0);
