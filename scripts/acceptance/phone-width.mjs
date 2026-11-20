/* NOTHING WIDER THAN THE PHONE (20 November — Rowland's own screenshot: the profile button, More and Send cut off at the right, the
 * bottom bar pushed off the screen). On a real phone a page even 2 px wider than the screen lets the browser lay its bars out against the
 * wider page and pan — so "nothing off the side" has to be measured as a phone measures it: the document's own width against the
 * screen's (scrollWidth − clientWidth), in a touch context. window.innerWidth — which the older checks read — GROWS with the overflow in
 * a touch context, so it reported 0 for a page 2 px too wide.
 *
 * Every page of the inventory (scripts/inventory/pages.mjs), at 360 and 412 px wide, touch: FAILS on any page wider than its screen,
 * naming what sticks out. Not a pass/fail on what a page shows — the inventory does that.
 *
 *   node scripts/acceptance/phone-width.mjs [--only "Page name"]      (SMOKE_BASE, as smoke) */
import { chromium } from 'playwright';
import { openSeedPage } from '../lib/seedPage.mjs';
import { PAGES } from '../inventory/pages.mjs';

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : '';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
let fail = 0, checked = 0;
/* the two widths side by side, each in its own phone — half the time, the same pages */
await Promise.all([360, 412].map(async width => {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: 780 }, isMobile: true, hasTouch: true, locale: 'en-GB', timezoneId: 'Europe/London' });
  await ctx.route(`https://${REF}.supabase.co/**`, r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage?.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage();
  await openSeedPage(page, BASE);
  const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  sd.checkLogs = await page.evaluate(async ([ws, pj]) => (await import('/src/dev/seed.ts')).seedChecksForTest(ws, pj), [sd.wsId, sd.projectId]);
  sd.areas = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedAreasForTest());
  const cap = await page.evaluate(async () => {
    await (await import('/src/dev/capacitySeeds.ts')).seedCapacityFor('huge');
    const all = await (await import('/src/db.ts')).listAllStandards();
    const lanes = all.find(x => (x.capacity?.lanes?.length ?? 0) > 1);
    return lanes ? { wsId: lanes.workspaceId, lanesId: lanes.id } : undefined;
  }).catch(() => undefined);
  for (const pg of PAGES(sd, cap).filter(p => !only || p.name === only)) {
    await page.goto(`${BASE}/${pg.path}`); await page.waitForTimeout(1300);
    const m = await page.evaluate(() => {
      const de = document.documentElement, cw = de.clientWidth;
      const out = [];
      for (const e of document.querySelectorAll('body *')) {
        const r = e.getBoundingClientRect();
        if (!r.width || r.right <= cw + 0.5) continue;
        /* inside something that scrolls sideways by design, or clipped by an ancestor, it widens nothing */
        let a = e.parentElement, held = false;
        for (; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { held = true; break; } }
        if (!held) out.push(`${e.tagName.toLowerCase()}.${String(e.className).split(' ').filter(Boolean).slice(0, 3).join('.')} (to ${Math.round(r.right)})`);
      }
      return { over: de.scrollWidth - cw, cw, what: out.slice(0, 4) };
    });
    checked += 1;
    if (m.over > 0) { fail += 1; console.log(`FAIL  ${width}  ${pg.name} — ${m.over} px wider than the screen${m.what.length ? `: ${m.what.join(', ')}` : ' (a tap halo or a parked panel)'}`); }
  }
  await ctx.close();
}));
await browser.close();
console.log(fail ? `\n${fail} of ${checked} pages are wider than the phone` : `\nno page is wider than the phone: ${checked} checked at 360 and 412 px, touch`);
process.exit(fail ? 1 : 0);
