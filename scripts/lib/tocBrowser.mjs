/* A BROWSER FOR THE THEORY-OF-CONSTRAINTS ACCEPTANCE SCRIPTS (1 November 2026) — the one launch they share: a signed-in
 * device with no network to the cloud, console errors collected, `ok` counting what failed, and the app's own modules reached
 * through the page (`page.evaluate(() => import('/src/…'))`) so a script checks the screen against the module and against
 * literals worked by hand (scripts/knowledge/cases-toc.py).
 *
 *     const t = await openApp();           // { page, ok, go, words, truth, seed, finish, … }
 *     await t.seed();                      // the smoke seed; returns its ids
 *     await t.finish('what held');         // errors checked, browser closed, exit code set */
import pkg from 'playwright';
import { openMethodSections } from './methodFolds.mjs';
const { chromium } = pkg;

export const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;

export async function openApp({ width = 1360, height = 900, profile, args } = {}) {
  /* profile: a folder for an ON-DISK browser profile, as a person's own browser has — a fresh context keeps the browser's private file
     storage in memory (private mode), which a workbook of hundreds of megabytes would not fit (docs/WORKBOOKS.md, measured) */
  const opts = { serviceWorkers: 'block', viewport: { width, height }, locale: 'en-GB', acceptDownloads: true };
  const exe = process.env.CHROMIUM ?? '/opt/pw-browsers/chromium';
  const ctx = profile ? await chromium.launchPersistentContext(profile, { executablePath: exe, ...opts }) : await (await chromium.launch({ executablePath: exe, ...(args ? { args } : {}) })).newContext(opts);
  const browser = profile ? { close: () => ctx.close(), on: (...a) => ctx.on(...a) } : ctx.browser();
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const page = profile ? ctx.pages()[0] ?? await ctx.newPage() : await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  const t = { browser, ctx, page, errors, failed: 0 };
  t.ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) t.failed++; };
  t.go = async (h, ms = 2200) => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(ms); };
  t.words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');
  t.norm = s => s.replace(/\s+/g, ' ').replace(/[–—−]/g, '-').replace(/[’‘]/g, "'").trim();
  t.seed = async () => {
    await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
    return page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  };
  /** A method project's sections opened by their folds (every one, or those named) — methodFolds.mjs. */
  t.openSections = names => openMethodSections(page, names);
  t.wide = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  /** The PDF a button makes, as plain text (pdftotext), whitespace and dashes normalised. */
  t.pdfText = async (press, name = 'paper') => {
    const { execFileSync } = await import('node:child_process');
    const { mkdtempSync } = await import('node:fs'); const { tmpdir } = await import('node:os'); const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'toc-'));
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), press()]);
    const file = join(dir, `${name}.pdf`); await dl.saveAs(file);
    return t.norm(execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' }));
  };
  t.finish = async done => {
    t.ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
    await browser.close();
    console.log(t.failed ? `\n${t.failed} acceptance check(s) failed` : `\n${done}`);
    process.exit(t.failed ? 1 : 0);
  };
  return t;
}
