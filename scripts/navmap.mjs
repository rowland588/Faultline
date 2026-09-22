/* WHERE AM I, AND HOW DO I GET OUT? — the spine, on every screen at once.
 *
 *   npx vite --port 5191 --strictPort &
 *   node scripts/navmap.mjs
 *
 * Rowland, after using it: "the back and forth between pages... it's very
 * complex. Just trying to go backwards into something, you lose track of where
 * you just need to go back to, or forward."
 *
 * He was right, and reading the code did not show it — ui/Crumbs.tsx is fine in
 * isolation. The faults only appear when you put all eighteen screens side by
 * side, which is what this does. It walks each one and prints the spine trail,
 * where the up button points, the h1, and every OTHER control on the page that
 * looks like a way back.
 *
 * What it found the first time it ran, all four invisible to every unit test:
 *
 *   1. The client report and the walk render NO spine at all — the two screens
 *      you most need to get out of.
 *   2. Nearly every screen carries two competing ways back, in two places, with
 *      different words for the same destination ("Back to the tests" under
 *      "‹ Testing").
 *   3. Four different screens have the same h1 — the project's name — so the
 *      largest text on screen is the one thing that does not say where you are.
 *   4. Nothing moves sideways. Materials and Programs are peers, and getting
 *      between them means going up to the project and back down.
 *
 * Keep it passing: a screen with no spine, or with a second back control, is a
 * regression of exactly the thing that made the app hard to walk around.
 */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: {
    id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated',
    email: 'smoke@example.com', app_metadata: {}, user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 900 } });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } },
  [`sb-${REF}-auth-token`, SESSION]);

const page = await ctx.newPage();
await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const seeded = await page.evaluate(async () => {
  const { seedForSmokeTest } = await import('/src/dev/seed.ts');
  return seedForSmokeTest();
});

const ROUTES = [
  ['home', '#/'],
  ['projects', '#/projects'],
  ['project', `#/project/${seeded.projectId}`],
  ['project setup', `#/project/${seeded.projectId}/setup`],
  ['testing list', `#/project/${seeded.projectId}/testing`],
  ['one trial', `#/project/${seeded.projectId}/testing/${seeded.testId}`],
  ['materials', `#/project/${seeded.pacedProjectId}/materials`],
  ['programs', `#/project/${seeded.pacedProjectId}/programs`],
  ['project line', `#/project/${seeded.projectId}/line/${seeded.lineId}`],
  ['client report', `#/pace-report?project=${seeded.projectId}`],
  ['walk', `#/w/${seeded.wsId}/walk`],
  ['evidence', `#/w/${seeded.wsId}/snaglist`],
  ['asset', `#/w/${seeded.wsId}/asset/${seeded.assetId}`],
  ['capture', `#/w/${seeded.wsId}/capture`],
  ['analyse', `#/w/${seeded.wsId}/analyse`],
  ['lever tree', `#/project/${seeded.pacedProjectId}/tree`],
  ['3P board', `#/project/${seeded.pacedProjectId}/board`],
  ['pareto', `#/project/${seeded.pacedProjectId}/pareto`],
];

const rows = [];
for (const [name, hash] of ROUTES) {
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(900);
  rows.push({
    name,
    ...(await page.evaluate(() => {
      const spine = document.querySelector('.spine');
      const trail = spine ? [...spine.querySelectorAll('.spine-crumb')].map(e => e.textContent.trim()) : null;
      const up = spine?.querySelector('.spine-up');
      /* Anything ELSE on the page that offers a way back. Two of these on one
         screen is the fault, not a convenience. */
      const others = [...document.querySelectorAll('button, a')]
        .filter(e => !e.closest('.spine'))
        .map(e => e.textContent.trim())
        .filter(t => /back|^‹|^«|^←/i.test(t))
        .slice(0, 6);
      return { trail, up: up?.getAttribute('aria-label') ?? null, h1: document.querySelector('h1')?.textContent?.trim() ?? '', others };
    })),
  });
}

let faults = 0;
const seenH1 = new Map();
for (const r of rows) {
  console.log(`\n${r.name.toUpperCase().padEnd(16)} h1: ${r.h1.slice(0, 44) || '(none)'}`);
  console.log(`  spine : ${r.trail ? r.trail.join(' > ') : '*** NO SPINE ***'}`);
  console.log(`  up    : ${r.up ?? '(none)'}`);
  if (r.others.length) console.log(`  ALSO  : ${r.others.join(' | ').slice(0, 150)}`);
  if (!r.trail) faults++;
  if (r.others.length) faults++;
  if (r.h1) seenH1.set(r.h1, (seenH1.get(r.h1) ?? 0) + 1);
}

const shared = [...seenH1].filter(([, n]) => n > 1);
for (const [h1, n] of shared) {
  console.log(`\nSHARED HEADING  "${h1}" is the h1 on ${n} different screens`);
  faults++;
}

console.log(`\n${faults} navigation fault${faults === 1 ? '' : 's'} across ${rows.length} screens.`);
await browser.close();
