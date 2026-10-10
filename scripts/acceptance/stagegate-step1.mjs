/* ACCEPTANCE — THE STAGE GATE'S STEP 1 (docs/LEAN40.md, docs/BUILD.md,
 * release 1). The story of the four, driven in a real browser on the seeded
 * job, so what was proved when it was built stays proved in every gate after:
 *
 *   1  the pace says when — the line under "Are we on target?" is the job's
 *      own forecast (lib/pace): on the seed it names the coder that has
 *      nothing on its list; given its list, it forecasts after the coder
 *      arrives, and the plan draws the day;
 *   2  the climb to rate — the run's page draws the product's runs and says
 *      what the learning curve says (lib/rampUp);
 *   3  since you last looked — away three days, the front page says what
 *      changed, as lib/since works it out; back at once, nothing;
 *   4  scan the machine — the Reports door draws a label for every machine,
 *      and the status report carries its code back to the job.
 *
 * Every sentence is checked against the module that makes it, run on the
 * same records in the page — the screen cannot say something the arithmetic
 * does not. Fails on any console error, as smoke does.
 *
 *   npx vite --port 5191 --strictPort &      (or SMOKE_BASE)
 *   node scripts/acceptance/stagegate-step1.mjs
 *
 * The printed codes were decoded back to their links when this was built
 * (10 October); here the paper is read for its words — no QR reader is added
 * to the app's dependencies for a test. */
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
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2300); };
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : null);
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const pdfPages = f => Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))[1]);
const grab = async (click, name) => { const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click()]); const f = join(OUT, name); await dl.saveAs(f); return f; };

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const J = `#/project/${sd.projectId}`;
/* What the modules say, on the records as they stand. */
const truth = () => page.evaluate(async pid => {
  const t = await import('/src/db/testing.ts'), P = await import('/src/db/projects.ts');
  const { paceOf } = await import('/src/lib/pace.ts'), R = await import('/src/lib/rampUp.ts');
  const { todayISO } = await import('/src/lib/weeks.ts');
  const [project, tests, assets] = await Promise.all([P.getProject(pid), t.listTests(pid), t.listAssets(pid)]);
  const pace = paceOf({ tests, assets, today: todayISO(), expectedAt: project.expectedAt, plannedAt: project.plannedAt });
  const perf = tests.find(x => !x.deletedAt && x.fromTestId && x.title === 'Performance run at the agreed rate');
  const climbs = perf ? R.climbsOn(R.climbsOf({ tests, assets }), perf) : [];
  return { pace, perfId: perf?.id, climbs: climbs.map(c => ({ text: c.text, n: c.points.length })), machines: assets.filter(a => !a.deletedAt).map(a => a.name) };
}, sd.projectId);

/* ---- 1 · the pace says when ---- */
let tr = await truth();
await go(J);
ok(tr.pace?.kind === 'unplanned' && await words('.ot-pace') === `${tr.pace.text} ${tr.pace.working}`, `1 pace, the seed: "${await words('.ot-pace')}"`);
await page.evaluate(async pid => {
  const t = await import('/src/db/testing.ts'); const { addDays, todayISO } = await import('/src/lib/weeks.ts');
  const today = todayISO(), coder = (await t.listAssets(pid)).find(a => /Domino/.test(a.name));
  await t.putAsset({ ...coder, dueOn: addDays(today, 20), updatedAt: Date.now() });
  for (const [i, title] of ['Positioned', 'Air and power connected', 'Guards fitted'].entries())
    await t.putTest({ id: crypto.randomUUID(), projectId: pid, kind: 'install', assetId: coder.id, title, outcome: 'planned', plannedFor: addDays(today, 21 + i), sort: 900 + i, createdAt: Date.now(), updatedAt: Date.now() });
}, sd.projectId);
tr = await truth();
await go('#/projects'); await go(J);
ok(tr.pace?.kind === 'forecast' && !!tr.pace.after && await words('.ot-pace') === `${tr.pace.text} ${tr.pace.working}`, `1 pace, the coder given its list: "${await words('.ot-pace')}"`);
await go(`${J}/plan`);
ok(/^At this pace /.test((await words('.gt-hand.is-pace')) ?? ''), `1 pace, on the plan: "${await words('.gt-hand.is-pace')}"`);

/* ---- 2 · the climb to rate ---- */
await go(`${J}/testing/${tr.perfId}`);
const says = (await page.locator('.cl-say').allInnerTexts()).map(s => s.replace(/\s+/g, ' ').trim());
ok(tr.climbs.length === 1 && JSON.stringify(says) === JSON.stringify(tr.climbs.map(c => c.text)), `2 climb: ${JSON.stringify(says)}`);
ok(await page.locator('.cl-svg .cl-dot').count() === tr.climbs[0]?.n, `2 climb: ${await page.locator('.cl-svg .cl-dot').count()} runs drawn`);

/* ---- 3 · since you last looked ---- */
const KEY = `faultline.seen.${sd.projectId}`, away = Date.now() - 3 * 86_400_000;
await page.evaluate(([k, v]) => localStorage.setItem(k, String(v)), [KEY, away]);
const want = await page.evaluate(async ([pid, seenAt]) => {
  const t = await import('/src/db/testing.ts'); const { sinceOf } = await import('/src/lib/since.ts');
  const s = sinceOf({ tests: await t.listTests(pid), items: await t.listTestItems(pid), assets: await t.listAssets(pid), seenAt });
  return s ? `${s.from}: ${s.parts.map(p => p.text).join(' · ')}` : null;
}, [sd.projectId, away]);
await go('#/projects'); await go(J);
ok(!!want && await words('p.sn') === want, `3 since, three days away: "${await words('p.sn')}"`);
await go('#/projects'); await go(J);
ok(await words('p.sn') === null, '3 since, back at once: nothing');

/* ---- 4 · scan the machine ---- */
await go(J);
await page.getByRole('button', { name: 'Reports', exact: true }).first().click(); await page.waitForTimeout(1200);
const labels = await grab(() => page.getByRole('button', { name: /^Machine labels/ }).first().click(), 'labels.pdf');
const lt = pdfText(labels);
ok(tr.machines.every(m => lt.includes(m)), `4 labels: a label for each of ${tr.machines.length} machines`);
await go(`${J}/report`);
const status = await grab(async () => { await page.getByRole('button', { name: 'Status — 1 page', exact: true }).first().click(); await page.waitForTimeout(800); await page.getByRole('button', { name: 'PDF', exact: true }).first().click(); }, 'status.pdf');
ok(pdfText(status).includes('Scan for it now') && pdfPages(status) === 1, `4 the status report: its code back to the job, still ${pdfPages(status)} page`);

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nrelease 1 accepted: 4 of 4 stories hold');
process.exit(failed ? 1 : 0);
