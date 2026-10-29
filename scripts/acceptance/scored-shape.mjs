/* ACCEPTANCE — SCORED REGISTER SHAPE (FC-064 criticality first). Table-driven over src/tools/scored/registry. */
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
await page.goto(`${BASE}/#/scored`);
await page.locator('.nv-main').waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);

const defs = await page.evaluate(async () => (await import('/src/tools/scored/registry.ts')).SCORED.map(d => ({ key: d.key, fc: d.fc, title: d.title, example: d.examples[0] })));
ok(defs.some(d => d.key === 'criticality'), 'criticality registered');

const ex = defs.find(d => d.key === 'criticality')?.example;
const truth = await page.evaluate(async ex => {
  const { rankCriticality, summarizeCriticality } = await import('/src/lib/ie/criticality.ts');
  const rows = ex.rows.map(r => ({ ...r }));
  const ranked = rankCriticality(rows);
  if ('problems' in ranked) return { err: ranked.problems };
  const sum = summarizeCriticality(ranked.ok);
  return { verdict: sum.verdict, tiles: Object.fromEntries(sum.tiles.map(t => [t.k, t.v])), a: ranked.ok.filter(r => r.class === 'A').length };
}, ex);

ok(!truth.err, `independent case ${truth.err ?? ''}`);
ok(truth.a === 2, `class A count ${truth.a} (expect 2)`);
ok(truth.tiles['Class A'] === '2', `tile Class A ${truth.tiles['Class A']}`);

await browser.close();
process.exit(failed ? 1 : 0);
