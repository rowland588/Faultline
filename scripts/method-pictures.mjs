/* THE METHOD PICTURES (docs/METHODS.md §15 — Rowland, 1 November 2026: "Projects .. just like tools I want pictures so user can
 * see"): each of the eight methods photographed from its real project page.
 *
 * For every method a project that runs it is seeded (src/dev/seed.ts methodProjectIds — the same records the acceptance scripts use,
 * each with a tool already used in it), the project's REAL front page is opened in Chromium at a 1280 x 800 desk, the frame is
 * taken away, and the top of the page — the method's question and its first steps with the tools that fit them — is written to
 * public/methods/<key>.png at 960 x 600, with a manifest saying what each shows and the commit it was taken from. Nothing is typed
 * onto an image: every word on it is the app's.
 *
 *   node scripts/method-pictures.mjs                 all eight, written to public/methods/      (SMOKE_BASE, as smoke)
 *   node scripts/method-pictures.mjs dmaic kata      only these keys
 *   node scripts/method-pictures.mjs --out DIR       write somewhere else (public/methods is left alone) — for a comparison
 *
 * The same shape as scripts/tool-pictures.mjs, and the same rule: a picture is the page's own elements, never redrawn. */
import pkg from 'playwright';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { shrink } from './lib/pngShrink.mjs';
const { chromium } = pkg;

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'pictures@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools|navigator\.vibrate/i;
const W = 960, H = 600, BUDGET = 130_000, PAD = 16;

const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const OUT = outIdx >= 0 ? args[outIdx + 1] : join(ROOT, 'public/methods');
const only = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--out');
mkdirSync(OUT, { recursive: true });
const sha = (() => { try { return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { return 'unknown'; } })();

/* what each picture shows (the manifest's `of`), and the part of the project page that IS the picture */
const METHODS = [
  { key: 'pdca', of: 'A PDCA project — the question, then Plan, Do, Check and Act with the tools that fit each, a capability study already used' },
  { key: 'dmaic', of: 'A DMAIC project — Define, Measure, Analyse, Improve and Control with the tools that fit each, a capability study already used' },
  { key: 'eight-d', of: 'An 8D project — D0 to D8 with the tools that fit each step, a capability study already used' },
  { key: 'a3', of: 'An A3 project — Background, Current condition, Target, Analysis, Countermeasures and Plan, a capability study already used' },
  { key: 'stage-gate', of: 'A stage-gate project — new equipment taken through its gates: where it stands, what is late and what is blocking handover', parts: ['.pace-head', '.now'] },
  { key: 'kaizen-event', of: 'A Kaizen event — Prepare, Observe, Improve, Standardise and Sustain with the tools that fit each, a changeover already studied' },
  { key: 'kata', of: 'An Improvement Kata project — direction, current condition, next target condition and experiments, a capability study already used' },
  { key: 'toc', of: 'A Theory of Constraints project — identify, exploit, subordinate, elevate and go again, a changeover already studied at the constraint' },
];

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1280, height: 800 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const errors = [];
let page, cdp;
const freshPage = async () => {
  page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  cdp = await ctx.newCDPSession(page);
};
await freshPage();

await page.goto(`${BASE}/#/room`, { waitUntil: 'domcontentloaded', timeout: 240000 }); await page.waitForTimeout(3000);
const seeded = await page.evaluate(async () => {
  const seed = await import('/src/dev/seed.ts');
  return seed.seedForSmokeTest();
});
if (!seeded.methodProjectIds) throw new Error('the seed holds no methodProjectIds — nothing to photograph');

const HIDE_FRAME = 'html,body,.nv,.nv-main,.wrap{background:#f2f5f5 !important;background-image:none !important}.nv-top,.nv-rail,.nv-tabs,.nv-bar,.nv-ctx,.nv-foot,.toast,[class*="toast"]{visibility:hidden !important}';

async function shoot(m) {
  const id = seeded.methodProjectIds[m.key];
  if (!id) throw new Error(`${m.key}: no seeded project`);
  await page.goto(`${BASE}/#/project/${id}`);
  await page.waitForSelector(m.parts?.[0] ?? '.pmethod', { timeout: 30000 });
  await page.waitForTimeout(2200);
  const parts = m.parts ?? ['.pmethod'];
  const found = await page.evaluate(({ parts, hide }) => {
    const st = document.createElement('style'); st.textContent = hide; document.head.appendChild(st);
    const els = parts.map(sel => document.querySelector(sel));
    const missing = parts.filter((_, i) => !els[i]);
    if (missing.length) return { missing };
    const root = document.querySelector('.nv-main .wrap, .wrap') ?? document.body;
    const keep = e => els.some(p => p === e || p.contains(e) || e.contains(p));
    const prune = e => { for (const c of [...e.children]) { if (!keep(c)) c.style.setProperty('display', 'none', 'important'); else if (!els.some(p => p === c || p.contains(c))) prune(c); } };
    prune(root);
    return { missing: [] };
  }, { parts, hide: HIDE_FRAME });
  if (found.missing.length) throw new Error(`${m.key}: not on the page — ${found.missing.join(', ')}`);
  await page.waitForTimeout(600);
  const b = await page.evaluate(parts => {
    const rects = parts.map(sel => document.querySelector(sel).getBoundingClientRect());
    return { x0: Math.min(...rects.map(r => r.left)), x1: Math.max(...rects.map(r => r.right)), y0: Math.min(...rects.map(r => r.top)) + scrollY };
  }, parts);
  /* the 16:10 frame from the TOP of the page's content (a method's page is tall; the picture is its first screen), the width a
     multiple of 8 so the height is whole and the scale (960 / width) lands on 960 x 600 exactly */
  let w = Math.ceil((b.x1 - b.x0 + PAD * 2) / 8) * 8;
  const h = (w * H) / W;
  const x = Math.max(0, Math.round(b.x0 - PAD)), y = Math.max(0, Math.round(b.y0 - PAD));
  await page.setViewportSize({ width: 1280, height: Math.max(800, Math.ceil(y + h + 8)) });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
  await page.waitForTimeout(1200);
  await page.screenshot({ clip: { x: 0, y: 0, width: 8, height: 8 } });
  await page.waitForTimeout(600);
  const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: h, scale: W / w } });
  const raw = Buffer.from(shot.data, 'base64');
  await page.setViewportSize({ width: 1280, height: 800 });
  const dim = [raw.readUInt32BE(16), raw.readUInt32BE(20)];
  if (dim[0] !== W || dim[1] !== H) throw new Error(`taken at ${dim.join(' x ')}, not ${W} x ${H}`);
  const small = raw.length <= BUDGET ? { png: raw, colours: 'all', bytes: raw.length } : shrink(raw, BUDGET);
  writeFileSync(join(OUT, `${m.key}.png`), small.png);
  return { ...small, raw: raw.length, box: [Math.round(w), Math.round(h)] };
}

const manifestPath = join(OUT, 'manifest.json');
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : {};
let failed = 0;
for (const m of METHODS) {
  if (only.length && !only.includes(m.key)) continue;
  try {
    await page.close(); await freshPage();
    const r = await shoot(m);
    manifest[m.key] = { w: W, h: H, of: m.of, takenFrom: sha };
    console.log(`PASS  ${m.key.padEnd(13)} ${String(r.bytes).padStart(7)} bytes (${r.colours} colours; raw ${r.raw}) from a ${r.box.join(' x ')} frame`);
  } catch (e) { failed++; console.log(`FAIL  ${m.key} — ${e.message.split('\n')[0]}`); }
}
const sorted = Object.fromEntries(METHODS.filter(m => manifest[m.key]).map(m => [m.key, manifest[m.key]]));
writeFileSync(manifestPath, `${JSON.stringify(sorted, null, 2)}\n`);
if (errors.length) { console.log('console errors:', [...new Set(errors)].slice(0, 6)); failed++; }
await browser.close();
process.exit(failed ? 1 : 0);
