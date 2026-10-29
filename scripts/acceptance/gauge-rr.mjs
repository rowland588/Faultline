/* FC-118 Gauge R&R on the Analysis tool (knowledge/specs/FC-118-gauge-rr.md). */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
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

const PARTS = '12.0, 13.5, 11.2, 14.8, 12.6, 13.1, 11.8, 14.2, 12.9, 13.7';
const PASTE = `12.0 A 11.69
12.0 A 12.07
12.0 B 12.42
12.0 B 12.18
12.0 C 11.82
12.0 C 11.51
13.5 A 13.16
13.5 A 13.17
13.5 B 13.85
13.5 B 13.99
13.5 C 13.16
13.5 C 13.78
11.2 A 11.43
11.2 A 11.0
11.2 B 11.45
11.2 B 11.72
11.2 C 10.93
11.2 C 11.09
14.8 A 14.94
14.8 A 15.0
14.8 B 14.96
14.8 B 15.62
14.8 C 14.61
14.8 C 14.71
12.6 A 12.46
12.6 A 12.5
12.6 B 13.56
12.6 B 12.68
12.6 C 12.08
12.6 C 12.02
13.1 A 13.1
13.1 A 13.48
13.1 B 13.65
13.1 B 13.21
13.1 C 12.92
13.1 C 12.92
11.8 A 12.05
11.8 A 11.94
11.8 B 11.81
11.8 B 12.01
11.8 C 11.46
11.8 C 11.22
14.2 A 13.76
14.2 A 14.4
14.2 B 14.53
14.2 B 14.73
14.2 C 13.95
14.2 C 13.89
12.9 A 13.19
12.9 A 13.11
12.9 B 13.76
12.9 B 13.25
12.9 C 12.61
12.9 C 12.55
13.7 A 13.72
13.7 A 13.75
13.7 B 14.54
13.7 B 14.1
13.7 C 13.21
13.7 C 13.33`;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text()) && !/same key/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2000); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);

await go('#/analysis');
await page.getByRole('button', { name: 'New analysis' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What is it of?').fill('Seal strength study');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1200);
await page.getByRole('radio', { name: /How much of what we see is the measurement/ }).click();
await page.getByLabel('What is measured').fill('Seal strength');
await page.getByLabel('Unit').fill('N');
await page.getByLabel('The parts').fill(PARTS);
await page.getByLabel('The appraisers').fill('A, B, C');
await page.getByLabel('Lower tolerance').fill('10');
await page.getByLabel('Upper tolerance').fill('16');
await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
await page.getByLabel('Paste gauge R&R readings').fill(PASTE);
await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(800);
ok(/60 of 60/.test(await words('.ie-count') ?? ''), `Grid full: "${await words('.ie-count')}"`);
const say = await words('.ie-say');
ok(/34\.8%/.test(say ?? '') && /ndc 3|under 5/.test(say ?? ''), `Verdict: "${say?.slice(0, 160)}"`);
ok(/Reproducibility is the larger part/.test(say ?? ''), 'AV > EV said');
const close = await words('.ln-close');
ok(/Not acceptable/.test(close ?? ''), `Closing: "${close}"`);

const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const pdf = join(OUT, 'grr.pdf');
await dl.saveAs(pdf);
ok((await import('node:fs')).statSync(pdf).size > 500, 'Paper downloaded');

await page.setViewportSize({ width: 375, height: 812 });
await page.waitForTimeout(400);
ok((await page.evaluate(() => document.documentElement.scrollWidth)) <= 380, 'Phone fits');

await browser.close();
ok(!errors.length, errors.join('; ') || 'No console errors');
process.exit(failed ? 1 : 0);
