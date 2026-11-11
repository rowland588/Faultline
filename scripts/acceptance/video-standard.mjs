/* FC-021 — THE VIDEO STUDY'S STANDARD: pace rated by the reviewer and the allowance the site agreed
 * (knowledge/specs/FC-021-video-time-study.md; knowledge/methods/ie/video-time-study.md).
 * The smoke seed's video study "Line 4 — packing, morning" (three stations, events with known times; footage not on this device):
 * Workstation 1's whole cycles are four of 4.1 s (events 1.5–5.6, 9.5–13.6, 17.5–21.6, 25.5–29.6 of a 32 s clip). Hand-worked:
 *   rated 110 -> basic 4.1 x 110 / 100 = 4.51 s; allowance personal needs 5 + basic fatigue 4 + standing 2 = 11%
 *   -> standard 4.51 x 1.11 = 5.0061 s -> "5.0 s", planned floor(3600 / 5.0061) = 719 an hour.
 *
 *   1  before anything is rated the study says so — pace not rated, footage cannot show it, observed times not a standard
 *   2  Workstation 1 rated 110, three allowance parts typed (11%): the page says basic 4.5 s, standard 5.0 s, 719 an hour, the allowance in parts,
 *      "not rated yet, so taken at 100" for the others — each the module's sentence — and kept after a reload
 *   3  a part with no name refused in words; the parts adding to 100 refused
 *   4  the station's observed work, takt and cycles unchanged by it (still 4.1 s, 4 cycles)
 *   5  the paper, downloaded and read back, carries the same sentences
 *   6  a client changes nothing (no controls); the phone — nothing off the side
 *
 *   node scripts/acceptance/video-standard.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { paper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {} } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const dir = mkdtempSync(join(tmpdir(), 'vstandard-'));
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const go = async (h, ms = 1800) => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(ms); };
await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const id = sd.videoStudyId;
/* a fold opened as a person would (ui/Fold, 10 November, docs/DESIGN.md) — a tap on its line when it is shut */
const openFold = async id => { const t = page.locator(`[data-fold="${id}"]:not(.is-open) .fold-toggle`); if (await t.count()) { await t.first().click(); await page.waitForTimeout(300); } };
const findingsText = async () => (await page.locator('.vid-findings li').evaluateAll(es => es.map(e => e.lastElementChild.textContent))).map(flat);

/* 1 — nothing rated */
await go(`#/video/${id}`);
await page.waitForSelector('.vid-findings li', { timeout: 15000 });
let fs = await findingsText();
ok(fs.some(t => t.includes('Pace is not rated: footage cannot show how hard someone is working, so these are observed times, not a standard.')), '1 nothing rated: the study says the times are observed, not a standard', fs.join(' | '));
ok(!fs.some(t => t.includes('pace rated')), '1 and no standard is claimed');

/* 2 — rate Workstation 1, type the allowance (the standard is one line until opened) */
await openFold('vid-pace');
await page.getByLabel('Pace at Workstation 1', { exact: true }).fill('110');
for (const [name, pct] of [['Personal needs', '5'], ['Basic fatigue', '4'], ['Standing', '2']]) {
  await page.getByRole('button', { name: 'Add an allowance part' }).click();
  const names = page.getByLabel('Allowance part'); const n = await names.count();
  await names.nth(n - 1).fill(name);
  await page.getByLabel(`${name} percent`).fill(pct);
}
await page.getByRole('button', { name: 'Work out the standard' }).click();
await page.waitForFunction(() => [...document.querySelectorAll('.vid-findings li')].some(li => li.textContent.includes('pace rated 110')), null, { timeout: 8000 }).catch(() => {});
fs = await findingsText();
const mod = await page.evaluate(async (sid) => {
  const db = await import('/src/db.ts'); const st = await import('/src/tools/video/study.ts');
  const s = await db.getStudy(sid); const f = st.videoFigures(s.facts.video, s.facts.vevents ?? [], 'verified');
  return { says: st.findings(f).map(x => x.text.replace(/\s+/g, ' ')), standards: f.standards.map(x => ({ l: x.label, o: x.observed, r: x.rating, rated: x.rated, b: x.basic, s: x.standard })), allowance: f.allowance };
}, id);
const s1 = mod.standards.find(x => x.l === 'Workstation 1');
ok(s1 && Math.abs(s1.o - 4.1) < 1e-6 && s1.r === 110 && s1.rated && Math.abs(s1.b - 4.51) < 1e-6 && Math.abs(s1.s - 5.0061) < 1e-6, '2 the module’s figures are the hand-worked: observed 4.1, rated 110, basic 4.51, standard 5.0061', JSON.stringify(s1));
ok(Math.abs(mod.allowance - 0.11) < 1e-9, '2 the allowance is the three parts added: 11%', String(mod.allowance));
const line1 = fs.find(t => t.includes('Workstation 1: pace rated 110'));
ok(line1 === 'Workstation 1: pace rated 110 by the reviewer — basic 4.5 s (observed 4.1 s × 110 ÷ 100), standard 5.0 s with 11% allowance, about 719 an hour planned.', '2 Workstation 1: basic 4.5 s, standard 5.0 s, 719 an hour planned', line1);
ok(fs.some(t => t.includes('Not rated yet, so taken at 100: Workstation 2, Workstation 3.')), '2 the other two stations are said not rated yet and taken at 100', fs.join(' | '));
ok(fs.some(t => t.includes('11% allowance — personal needs 5, basic fatigue 4, standing 2.')), '2 the allowance said in its parts', fs.join(' | '));
ok(fs.every(t => mod.says.includes(t)), '2 every sentence on the page is the module’s', fs.filter(t => !mod.says.includes(t)).join(' | '));
await go(`#/video/${id}`);
await page.waitForSelector('.vid-findings li');
ok((await page.getByLabel('Pace at Workstation 1', { exact: true }).inputValue()) === '110' && (await findingsText()).some(t => t.includes('Workstation 1: pace rated 110')), '2 kept after a reload');

/* 3 — refused */
await page.getByRole('button', { name: 'Add an allowance part' }).click();
await page.getByLabel('Allowance part').last().fill('');
await page.getByLabel(' percent').last().fill('3');
ok(await page.getByRole('button', { name: 'Work out the standard' }).isDisabled() && /Name each part/.test(await page.locator('.vid-pace [role=alert]').innerText()), '3 a part with a percentage and no name is refused in words');
await page.getByLabel(' percent').last().fill('95');
await page.getByLabel('Allowance part').last().fill('Everything');
ok(await page.getByRole('button', { name: 'Work out the standard' }).isDisabled() && /add to 100% or more/.test(await page.locator('.vid-pace [role=alert]').innerText()), '3 parts adding to 100 or more are refused');
await go(`#/video/${id}`);
await page.waitForSelector('.vid-findings li');

/* 4 — the observed figures are unchanged */
const row = flat(await page.locator('tr[data-station="s1"]').innerText());
ok(row.includes('4.1 s') && /\b4\b/.test(row), '4 Workstation 1’s observed work is still 4.1 s over its whole cycles', row);

/* 5 — on paper */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), paper(page, 'Video study report')]);
const f = join(dir, 'v.pdf'); await dl.saveAs(f);
const pdf = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' ');
ok(pdf.includes('Workstation 1: pace rated 110 by the reviewer — basic 4.5 s (observed 4.1 s × 110 ÷ 100), standard 5.0 s with 11% allowance, about 719 an hour planned.'), '5 the paper carries the standard, as the page says it', pdf.slice(pdf.indexOf('What it says'), pdf.indexOf('What it says') + 600));
ok(pdf.includes('Not rated yet, so taken at 100: Workstation 2, Workstation 3.') && pdf.includes('11% allowance'), '5 and what is not rated yet and the allowance');

/* 6 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/video/${id}`);
await page.waitForSelector('.vid-findings li'); await openFold('vid-pace');
await page.waitForSelector('.vid-pace');
ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '6 the phone: nothing off the side');
ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
