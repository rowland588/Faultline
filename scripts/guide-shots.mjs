/* THE PICTURES OF THE HOW-IT-WORKS PAGE (public/how-it-works.html, 31 October — the page tells the improvement
 * lifecycle, Rowland: "operational improvement system, not a project management system").
 *
 * Every picture is the live app on the smoke seed, opened in Chromium and photographed whole — nothing is drawn or
 * typed onto an image. The tool pictures the page also shows (capability, line capacity, losses, analysis, actions,
 * problems) are public/tools/*.png, made by scripts/tool-pictures.mjs.
 *
 *   node scripts/guide-shots.mjs          writes public/guide/*.png      (SMOKE_BASE, as smoke)
 */
import pkg from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { shrink } from './lib/pngShrink.mjs';
const { chromium } = pkg;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public/guide');
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'pictures@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
mkdirSync(OUT, { recursive: true });

const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const open = async (w, h) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  const page = await ctx.newPage();
  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForTimeout(1500);
  const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  return { ctx, page, sd };
};
const shot = async (page, hash, file, o = {}) => {
  await page.goto(`${BASE}/${hash}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(o.wait ?? 'main, .wrap, .proj-new', { timeout: 60000 });
  await page.waitForTimeout(o.settle ?? 1800);
  if (o.before) await o.before(page);
  const buf = await page.screenshot({ clip: o.clip ?? { x: 0, y: 0, width: page.viewportSize().width, height: page.viewportSize().height } });
  writeFileSync(join(OUT, file), buf.length > 260_000 ? shrink(buf, 260_000).png : buf);
  console.log('wrote', file);
};

/* the method page opened at one of its sections, so the picture shows tools in use rather than the first section's gaps */
const toSection = name => async page => {
  await page.evaluate(n => { const s = [...document.querySelectorAll('.pmethod .pace-sec-title')].find(h => h.textContent.includes(n)); s?.scrollIntoView({ block: 'start' }); window.scrollBy(0, -130); }, name);
  await page.waitForTimeout(500);
};

{ /* desk */
  const { ctx, page, sd } = await open(1366, 900);
  await shot(page, '#/projects?new=1', 'methods.png', { wait: '.proj-model-grid', clip: { x: 0, y: 0, width: 1366, height: 760 } });
  await shot(page, `#/project/${sd.methodProjectId}`, 'method.png', { wait: '.pmethod', clip: { x: 0, y: 0, width: 1366, height: 900 }, before: toSection('Measure') });
  await ctx.close();
}
{ /* phone */
  const { ctx, page, sd } = await open(390, 844);
  await shot(page, `#/project/${sd.methodProjectId}`, 'method-phone.png', { wait: '.pmethod', before: toSection('Measure') });
  await ctx.close();
}
await b.close();
