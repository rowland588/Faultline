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
/* a page is read once it has drawn — under the gate's load "Loading…" can
   outlast a fixed wait, and a front page read then says nothing and never
   counts the visit (the "since" story failed so, 17 October) */
const go = async h => {
  await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2300);
  /* a page still reading says so — "Loading…", or Now's "Reading where the project is…" (project/now) — and is not read until it has done */
  await page.waitForFunction(() => !/Loading…|Reading where the project is…/.test(document.querySelector('main')?.innerText ?? ''), null, { timeout: 15000 }).catch(() => {});
};
const { more: pressMore } = await import('../lib/pageHeader.mjs');
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : null);
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const pdfPages = f => Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))[1]);
const grab = async (click, name) => { const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click()]); const f = join(OUT, name); await dl.saveAs(f); return f; };

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
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
/* under the gate's load the front page can take longer than go's wait to draw its pace */
await page.locator('.ot-pace').first().waitFor({ timeout: 15000 }).catch(() => {});
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
const status = await grab(async () => { await page.getByRole('button', { name: 'Status — 1 page', exact: true }).first().click(); await page.waitForTimeout(800); await page.getByRole('button', { name: 'Download', exact: true }).first().click(); }, 'status.pdf');
ok(pdfText(status).includes('Scan for it now') && pdfPages(status) === 1, `4 the status report: its code back to the job, still ${pdfPages(status)} page`);

/* ---- 5 · what the shortfall is worth (knowledge/specs/FC-076-run-money.md; CLAUDE.md, 24 October: the cost one of the
   outputs, nothing blocked): a product short on its rate says the packs short and their contribution — the margin asked
   while the line has none — and the climb what it has cost so far; the row, the card, the client report ---- */
{
  const money = () => page.evaluate(async pid => {
    const t = await import('/src/db/testing.ts'), db = await import('/src/db.ts');
    const R = await import('/src/lib/rampUp.ts'), M = await import('/src/lib/runMoney.ts'), { readRuns } = await import('/src/lib/run.ts');
    const [tests, assets, lines, ws] = await Promise.all([t.listTests(pid), t.listAssets(pid), db.allPaceLines(), db.listWorkspaces()]);
    const perf = tests.find(x => !x.deletedAt && x.fromTestId && x.title === 'Performance run at the agreed rate');
    const line = M.runLineOf(perf, assets, lines, ws);
    const worths = readRuns(perf).products.map(p => M.runWorth(p, line)?.words).filter(Boolean);
    const climbs = R.climbsOn(R.climbsOf({ tests, assets }), perf).map(c => M.climbWorth(c, line)?.words).filter(Boolean);
    return { lineId: line?.id, worths, climbs };
  }, sd.projectId);
  const ws0 = await page.evaluate(async id => (await import('/src/db.ts')).getWorkspace(id), (await money()).lineId);
  ok(!!ws0, `5 the run's line found — ${ws0?.name}`);
  const setLine = async ws => { await page.evaluate(async ws => { await (await import('/src/db.ts')).updateWorkspace(ws); }, ws); await page.waitForTimeout(600); };
  const { marginPerPack: _m, ...bare } = ws0; void _m;
  await setLine({ ...bare, shifts: [{ id: 'd', name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }, { id: 'l', name: 'Lates', start: '14:00', end: '22:00', breakMin: 30 }] });
  let m = await money();
  await go(`${J}/testing/${tr.perfId}`);
  await page.locator('.pr-worth').first().waitFor({ timeout: 10000 }).catch(() => {});
  let seen = (await page.locator('.pr-worth').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  ok(m.worths.length >= 1 && JSON.stringify(seen) === JSON.stringify(m.worths) && seen.every(w => /ppm short: [\d,]+ packs over the \d+ min run — give the line a margin a pack \(Set up the line\) to say it in money\.$/.test(w)),
    `5 a product short on its rate: the packs short, the margin asked while the line has none — ${JSON.stringify(seen)}`);
  await setLine({ ...bare, marginPerPack: 0.04, shifts: [{ id: 'd', name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }, { id: 'l', name: 'Lates', start: '14:00', end: '22:00', breakMin: 30 }] });
  m = await money();
  await page.waitForTimeout(900);
  seen = (await page.locator('.pr-worth').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  ok(JSON.stringify(seen) === JSON.stringify(m.worths) && seen.every(w => /contribution; at this rate a day of the line’s shifts \(15 h\) is [\d,]+ packs, £[\d,]+\.$/.test(w)),
    `5 the line given 4p a pack: the contribution over the run and a day of its shifts, without a reload — ${JSON.stringify(seen)}`);
  const cl = (await page.locator('.cl-worth').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  ok(m.climbs.length === 1 && JSON.stringify(cl) === JSON.stringify(m.climbs) && /^The climb so far: [\d,]+ packs below the agreed 60 over \d runs — £[\d,]+ contribution\.$/.test(cl[0] ?? ''), `5 the climb says what it has cost so far — ${JSON.stringify(cl)}`);
  const flat = x => x.replace(/[’']/g, '').replace(/\s+/g, ' ');
  const card = await grab(() => pressMore(page, /card — PDF$/), 'run-card.pdf');
  const ct = flat(pdfText(card));
  ok(m.worths.every(w => ct.includes(flat(w).slice(0, 50))) && ct.includes(flat(m.climbs[0]).slice(0, 40)), '5 the test’s card carries the worth and the climb’s cost');
  await go(`${J}/report`);
  const full = await grab(async () => { await page.getByRole('button', { name: 'Full report', exact: true }).first().click(); await page.waitForTimeout(800); await page.getByRole('button', { name: 'Download', exact: true }).first().click(); }, 'full.pdf');
  const ft = flat(pdfText(full));
  ok(m.worths.every(w => ft.includes(flat(w).slice(0, 50))) && ft.includes(flat(m.climbs[0]).slice(0, 40)), '5 the client report carries the worth and the climb’s cost');
  await setLine(ws0);
}

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nrelease 1 accepted: 4 of 4 stories hold');
process.exit(failed ? 1 : 0);
