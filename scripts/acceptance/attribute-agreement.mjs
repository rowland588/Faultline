/* FC-121 Attribute agreement on the Analysis tool (knowledge/specs/FC-121-attribute-agreement.md). */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { mkdtempSync, readFileSync } from 'node:fs';
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

const ITEMS = 'P01, P02, P03, P04, P05, P06, P07, P08, P09, P10';
const PASTE = `P01 reference reject
P02 reference reject
P03 reference reject
P04 reference reject
P05 reference pass
P06 reference pass
P07 reference pass
P08 reference pass
P09 reference pass
P10 reference pass
P01 A 1 reject
P01 A 2 reject
P01 B 1 reject
P01 B 2 reject
P02 A 1 reject
P02 A 2 reject
P02 B 1 pass
P02 B 2 reject
P03 A 1 reject
P03 A 2 reject
P03 B 1 reject
P03 B 2 pass
P04 A 1 reject
P04 A 2 reject
P04 B 1 reject
P04 B 2 reject
P05 A 1 pass
P05 A 2 pass
P05 B 1 pass
P05 B 2 pass
P06 A 1 pass
P06 A 2 pass
P06 B 1 pass
P06 B 2 pass
P07 A 1 pass
P07 A 2 pass
P07 B 1 pass
P07 B 2 pass
P08 A 1 pass
P08 A 2 pass
P08 B 1 pass
P08 B 2 pass
P09 A 1 pass
P09 A 2 pass
P09 B 1 pass
P09 B 2 pass
P10 A 1 pass
P10 A 2 pass
P10 B 1 pass
P10 B 2 pass`;

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
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

await go('#/analysis');
await page.getByRole('button', { name: 'New analysis' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What is it of?').fill('Seal wrinkle study');
await page.getByLabel(/On which machine/).fill('Sealer');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
await page.waitForSelector('.ie-kind'); await page.waitForTimeout(300);
ok((await page.getByRole('radio', { name: /Do inspectors agree with themselves and the standard/ }).count()) === 1, '1 attribute question offered');
await page.getByRole('radio', { name: /Do inspectors agree with themselves and the standard/ }).click();
await page.getByLabel('What is measured').fill('');
await page.waitForTimeout(300);
ok(await page.getByRole('button', { name: 'Agree these' }).isDisabled() && /judged|What is being judged/.test(await words('.ie-problem') ?? ''), `1 empty name refused: "${await words('.ie-problem')}"`);
await page.getByLabel('What is measured').fill('Seal wrinkle check');
await page.getByLabel('The pieces').fill(ITEMS);
await page.getByLabel('The inspectors').fill('A, B');
await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
await page.getByLabel('Paste attribute judgments').fill(PASTE);
await page.getByRole('button', { name: 'Add these' }).click(); await page.waitForTimeout(800);
const say = await words('.ie-say');
ok(/Fleiss κ/.test(say ?? '') && /B:/.test(say ?? ''), `2 Verdict: "${say?.slice(0, 180)}"`);
ok(/Each inspector/.test(await words('.ie-grid') ?? '') || /Inspector/.test(flat(await page.locator('table').first().innerText().catch(() => ''))), '2 inspector table');

const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const pdf = join(OUT, 'attr.pdf');
await dl.saveAs(pdf);
ok(readFileSync(pdf).length > 8000, '3 paper downloaded');

await page.setViewportSize({ width: 375, height: 740 });
await page.reload(); await page.waitForTimeout(2000);
ok((await page.locator('body').evaluate(el => el.scrollWidth <= el.clientWidth + 2)), '4 phone — nothing off the side');

ok(!errors.length, errors.length ? `console: ${errors.join('; ')}` : 'no console errors');
await browser.close();
if (failed) process.exit(1);
