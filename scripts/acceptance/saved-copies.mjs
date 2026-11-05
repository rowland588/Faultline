/* ACCEPTANCE — A PDF IS KEPT WHERE IT WAS MADE (lib/keptPdfs, ui/SavedCopies — Rowland, 5 November: "I never actually have the report saved and available in the app ... wherever I've done it, that's where the PDF is"): a paper made on a page is kept, listed under Report ▾ › Saved copies with its date and size, downloaded again as the same file, a second kept apart, both after a reload, absent on another page, held by the line's page, one taken off, the phone. */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { paper as pressPaper, more as pressMore } from '../lib/pageHeader.mjs';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');



await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const CAP = `#/w/${sd.wsId}/standards/${sd.lineStandardId}?at=balance`;
const settle = ms => page.waitForTimeout(ms);
await go(CAP);
const made = async () => { const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, /^Line capacity — /)]); const f = `/tmp/sc-${Date.now()}.pdf`; await d.saveAs(f); await settle(900); return f; };
const menu = () => page.locator('.part-menu-b', { hasText: /^Report/ }).first();
ok(await page.locator('[data-saved-copies-open]').count() === 0, '1 before any paper is made the Report menu offers no Saved copies');
const f1 = await made();
await menu().click();
ok(/Saved copies · 1/.test(await page.locator('[data-saved-copies-open]').innerText()), '2 the paper just made is kept: Report ▾ now says Saved copies · 1');
await page.locator('[data-saved-copies-open]').click(); await settle(400);
ok(await page.locator('[data-saved-copies] [data-kept]').count() === 1 && /KB|MB/.test(await page.locator('[data-saved-copies]').innerText()), '3 the sheet lists it with its date and size');
const id = await page.locator('[data-saved-copies] [data-kept]').first().getAttribute('data-kept');
const [d2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.locator(`[data-kept-down="${id}"]`).click()]);
const f2 = `/tmp/sc-again-${Date.now()}.pdf`; await d2.saveAs(f2);
ok(readFileSync(f2).length === readFileSync(f1).length, '4 Download hands over the very same file (same size), without making another');
await settle(600);
ok(await page.locator('[data-saved-copies] [data-kept]').count() === 1, '5 and keeps no second copy of it');
await page.keyboard.press('Escape'); await settle(400);
const f3 = await made();
await menu().click();
ok(/Saved copies · 2/.test(await page.locator('[data-saved-copies-open]').innerText()), '6 a second paper made is a second copy, each its own');
await page.keyboard.press('Escape');
await go(CAP);
await menu().click();
ok(/Saved copies · 2/.test(await page.locator('[data-saved-copies-open]').innerText()), '7 after a reload both are still there');
await page.locator('[data-saved-copies-open]').click(); await settle(400);
/* it is on THIS page: another page of the app has none of it */
await go('#/tools');
ok(await page.locator('[data-saved-copies-open]').count() === 0, '8 a page it was not made on does not carry it');
/* the line's own page holds what was made for the line, anywhere */
await go(`#/lines/${sd.wsId}`);
await menu().click().catch(() => undefined);
const onLine = await page.locator('[data-saved-copies-open]').count();
ok(onLine === 1 && /Saved copies · 2/.test(await page.locator('[data-saved-copies-open]').innerText()), '9 the line’s page holds what was made for the line on its pages');
await page.locator('[data-saved-copies-open]').click(); await settle(400);
page.once('dialog', dd => void dd.accept());
await page.locator('[data-kept-drop]').last().click(); await settle(900);
ok(await page.locator('[data-saved-copies] [data-kept]').count() === 1, '10 one taken off — the other stays');
await page.keyboard.press('Escape'); await settle(300);
void f3;
await page.setViewportSize({ width: 390, height: 800 });
await go(CAP);
await menu().click(); await page.locator('[data-saved-copies-open]').click(); await settle(500);
ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '11 the phone: nothing off the side');
ok(errors.length === 0, 'no console errors' + (errors[0] ? ': ' + errors[0] : ''));
await browser.close(); console.log(failed ? `${failed} FAILED` : 'ALL PASSED'); process.exit(failed ? 1 : 0);
