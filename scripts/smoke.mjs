/* SMOKE TEST: load every screen in the app with realistic data and fail on any
 * error the browser reports.
 *
 *   npx vite --port 5191 --strictPort &
 *   node scripts/smoke.mjs
 *
 * WHY THE SEED IS TYPESCRIPT (src/dev/seed.ts) AND NOT PART OF THIS FILE: the
 * first two attempts wrote plain objects here, which nothing typechecks. Both
 * were wrong in ways that looked exactly like app bugs — an Observation missing
 * its required `media` crashed CaptureScreen, and a pace line with `lineKey`
 * instead of `key` produced a React missing-key warning. Neither was a bug in
 * the app. tsc now rejects that class of mistake before this ever runs.
 *
 * Supabase is blocked outright: this tests the app, not the network, and every
 * screen must render from the local database alone. */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';

/* A session planted in localStorage, so the invite-only front door opens without
 * a real sign-in. The key is sb-<project-ref>-auth-token, and the ref comes from
 * whatever VITE_SUPABASE_URL the dev server was started with. */
const REF = (process.env.SMOKE_SUPABASE_REF ?? 'testproj');
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: {
    id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated',
    email: 'smoke@example.com', app_metadata: {}, user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

/* Noise that is expected and says nothing about the app's health. */
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools/i;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([key, s]) => {
  try { localStorage.setItem(key, JSON.stringify(s)); } catch { /* private mode */ }
}, [`sb-${REF}-auth-token`, SESSION]);

const page = await ctx.newPage();
const bootErrors = [];
page.on('pageerror', e => bootErrors.push(e.message.split('\n')[0]));
await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

const seeded = await page.evaluate(async () => {
  const { seedForSmokeTest } = await import('/src/dev/seed.ts');
  return seedForSmokeTest();
});
console.log('seeded:', JSON.stringify(seeded));
if (bootErrors.length) console.log('errors during boot/seed:', bootErrors);

const ROUTES = [
  ['home', '#/'], ['guide', '#/guide'], ['portfolio', '#/portfolio'],
  ['projects', '#/projects'], ['pace report', '#/pace-report'],
  ['project dashboard', `#/project/${seeded.projectId}`],
  ['project setup', `#/project/${seeded.projectId}/setup`],
  ['lever tree', `#/project/${seeded.projectId}/tree`],
  ['3P board', `#/project/${seeded.projectId}/board`],
  ['pareto', `#/project/${seeded.projectId}/pareto`],
  ['testing', `#/project/${seeded.projectId}/testing`],
  ['one test', `#/project/${seeded.projectId}/testing/${seeded.testId}`],
  // A test that is not there any more must say so, not render a screen about
  // nothing — the class of fault that took the whole app down once. And every
  // old /commissioning bookmark still lands on the list.
  ['test gone', `#/project/${seeded.projectId}/testing/no-such-test`],
  ['old commissioning link', `#/project/${seeded.projectId}/commissioning`],
  ['old deep link', `#/project/${seeded.projectId}/commissioning/asset/whatever`],
  ['project line', `#/project/${seeded.projectId}/line/${seeded.lineId}`],
  /* THE MEASURED PROJECT — the one on the board model, with the measures its own
     business defined, targets per period and real readings behind them. Every
     screen that draws a number is here rather than on the commissioning job,
     which has none of that surface. */
  ['measured project', `#/project/${seeded.pacedProjectId}`],
  ['measured setup', `#/project/${seeded.pacedProjectId}/setup`],
  ['measured numbers', `#/project/${seeded.pacedProjectId}?view=data`],
  ['measured lines', `#/project/${seeded.pacedProjectId}?view=lines`],
  ['measured line', `#/project/${seeded.pacedProjectId}/line/${seeded.pacedLineId}`],
  ['line numbers', `#/project/${seeded.pacedProjectId}/line/${seeded.pacedLineId}?view=data`],
  ['line success', `#/project/${seeded.pacedProjectId}/line/${seeded.pacedLineId}?view=wins`],
  ['measured deck', `#/pace-report?project=${seeded.pacedProjectId}`],
  ['line deck', `#/pace-report?project=${seeded.pacedProjectId}&line=${seeded.pacedLineId}`],
  ['capture', `#/w/${seeded.wsId}/capture`],
  ['analyse', `#/w/${seeded.wsId}/analyse`],
  ['present', `#/w/${seeded.wsId}/present`],
  ['meeting', `#/w/${seeded.wsId}/meeting`],
  ['log', `#/w/${seeded.wsId}/log`],
  ['settings', `#/w/${seeded.wsId}/settings`],
  ['people', `#/w/${seeded.wsId}/people`],
  ['evidence', `#/w/${seeded.wsId}/snaglist`],
  ['walk', `#/w/${seeded.wsId}/walk`],
  ['segment', `#/w/${seeded.wsId}/segment/${seeded.segmentId}`],
  ['asset', `#/w/${seeded.wsId}/asset/${seeded.assetId}`],
  ['trend', `#/w/${seeded.wsId}/trend`],
  ['history', `#/w/${seeded.wsId}/history`],
  ['report', `#/w/${seeded.wsId}/report`],
  ['case', `#/w/${seeded.wsId}/case/${seeded.caseId}`],
];

const rows = [];
for (const [name, hash] of ROUTES) {
  const errs = [];
  const onErr = e => errs.push('THROWN: ' + e.message.split('\n')[0]);
  const onCon = m => {
    const t = m.text();
    if (IGNORE.test(t)) return;
    if (m.type() === 'error') errs.push('console.error: ' + t.replace(/\s+/g, ' ').slice(0, 220));
  };
  page.on('pageerror', onErr);
  page.on('console', onCon);

  // Each screen gets a fresh load, so one screen's crash cannot leave the error
  // boundary tripped for the next and report a fault that is not there.
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2200);

  const st = await page.evaluate(() => {
    const text = (document.body.innerText || '').trim();
    return { chars: text.length, crash: /something broke|something went wrong/i.test(text), head: text.split('\n')[0]?.slice(0, 40) ?? '' };
  });

  page.off('pageerror', onErr);
  page.off('console', onCon);
  rows.push({ name, hash, errs: [...new Set(errs)], ...st });
}
await browser.close();

console.log('\n' + 'screen'.padEnd(19) + 'chars  state           first line');
console.log('-'.repeat(86));
const bad = [];
for (const r of rows) {
  const why = r.crash ? 'ERROR BOUNDARY' : r.errs.length ? `${r.errs.length} error(s)` : r.chars < 60 ? 'NEARLY BLANK' : 'ok';
  if (why !== 'ok') bad.push(r);
  console.log(r.name.padEnd(19) + String(r.chars).padStart(5) + '  ' + why.padEnd(16) + r.head);
}
if (bad.length) {
  console.log('\n=== detail ===');
  for (const r of bad) {
    console.log(`\n${r.name}  ${r.hash}`);
    if (r.crash) console.log('   rendered the error boundary');
    if (r.chars < 60) console.log(`   rendered almost nothing (${r.chars} characters)`);
    r.errs.forEach(e => console.log('   ' + e));
  }
}
console.log(`\n${bad.length ? `${bad.length} of ${rows.length} screens FAILED` : `all ${rows.length} screens clean`}`);
process.exit(bad.length ? 1 : 0);
