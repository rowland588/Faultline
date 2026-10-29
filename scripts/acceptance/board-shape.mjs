/* ACCEPTANCE — BOARD SHAPE (FC-067 maintenance measures). */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };

const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch {} }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
await page.goto(`${BASE}/#/board`);
await page.locator('.nv-main').waitFor({ timeout: 15000 });
await page.waitForTimeout(800);

const defs = await page.evaluate(async () => (await import('/src/tools/board/registry.ts')).BOARDS.map(d => ({ key: d.key, fc: d.fc })));
ok(defs.some(d => d.key === 'maintenance-measures'), 'maintenance-measures registered');

const share = await page.evaluate(async () => {
  const { plannedShare } = await import('/src/lib/ie/maintenanceMeasures.ts');
  return plannedShare(210, 190);
});
ok(Math.abs(share - 0.525) < 0.01, `planned share ${share} ≈ 52.5%`);

await page.goto(`${BASE}/#/board/maintenance-measures`);
await page.locator('.nv-main').waitFor({ timeout: 15000 });
await page.waitForTimeout(600);
ok(await page.locator('text=Maintenance measures').count() > 0, 'maintenance-measures list page');

await browser.close();
process.exit(failed ? 1 : 0);
