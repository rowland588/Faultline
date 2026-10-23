/* ACCEPTANCE — STAGE 3: THE LINE IS THE HUB (docs/BLUEPRINT.md §3, §7).
 *
 * Rowland, 17 October: "start stage 3 as fast as you can". On the smoke seed,
 * in a real browser, every sentence checked against the module that makes it
 * (lib/lineProducts, lib/lineLean):
 *
 *   1  the line's page: the five tiles as lib/lineLean says them from the
 *      line's own records; its products, a row a product with the four
 *      answers lib/lineProducts gives (program proved, line standard,
 *      capacity, changeover timed), each a word in its colour; the closing
 *      line
 *   2  a program planned for a new product, its test day gone: the product
 *      comes on its row with "test was …" in red, the Products ready tile
 *      and the control room's card for the line count it failing; proved,
 *      it reads proved in green and the failing count goes
 *   3  an answer tapped opens the tool that gives it, on this line
 *   4  the line report, one page: the tiles, every product with its answers,
 *      the problems, the closing line — as the screen says them
 *   5  the phone: a product a card, each answer named, nothing off the side
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/line-hub.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper, more } from '../lib/pageHeader.mjs';
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
const go = async (hash, wait = 2500) => { await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(wait); };
const dir = mkdtempSync(join(tmpdir(), 'line-hub-'));

await go('#/room', 3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const LINE = sd.line7WsId;

/* what the modules say for the line, from its own records */
const expected = () => page.evaluate(async id => {
  const db = await import('/src/db.ts');
  const { lineKit } = await import('/src/lib/lineRecords.ts');
  const { lineProducts, productsSaid } = await import('/src/lib/lineProducts.ts');
  const [w, machines, programs, jobLines, standards, studies] = await Promise.all([db.getWorkspace(id), db.listAllAssets(), db.listAllPrograms(), db.allPaceLines(), db.listStandardsForLine(id), db.listStudiesForLine(id)]);
  const kit = lineKit(w, machines, programs, jobLines);
  const p = lineProducts({ programs: kit.programs, standards: standards.filter(s => !s.deletedAt), studies: studies.filter(s => !s.deletedAt) });
  return { name: w.name, rows: p.rows.map(r => ({ name: r.name, cells: r.cells.map(c => ({ word: c.word, tone: c.tone })) })), ready: p.ready, failing: p.failing, withGaps: p.withGaps, said: productsSaid(p).map(x => x.text).join(''), toProve: kit.programs.length - kit.proved };
}, LINE);
/* the grid as drawn */
const drawn = () => page.evaluate(() => [...document.querySelectorAll('.pl-prod:not(.is-head)')].map(r => ({
  name: r.querySelector('.pl-prod-name')?.textContent.trim(),
  cells: [...r.querySelectorAll('.pl-ready')].map(c => { const k = c.querySelector('.pl-ready-k')?.textContent ?? ''; return { word: c.textContent.replace(k, '').trim(), tone: /is-([garwn])\b/.exec(c.className)?.[1] }; }),
})));
const tile = k => page.evaluate(k => { const t = [...document.querySelectorAll('.pl-tiles .ln-tile')].find(e => e.textContent.toUpperCase().includes(k.toUpperCase())); return t ? t.textContent.replace(/\s+/g, ' ').trim() : ''; }, k);

/* 1 · the page */
await go(`#/lines/${LINE}`, 3500);
let want = await expected(), got = await drawn();
ok(want.rows.length > 0, `the seed's line has products (${want.rows.map(r => r.name).join(', ')})`);
ok(JSON.stringify(got) === JSON.stringify(want.rows), `every product drawn with its four answers as lib/lineProducts says them${JSON.stringify(got) === JSON.stringify(want.rows) ? '' : `\n   drawn ${JSON.stringify(got)}\n   wanted ${JSON.stringify(want.rows)}`}`);
ok(await page.locator('.pl-tiles .ln-tile').count() === 5, 'five tiles — problems, programs, products, stops, a day of the line');
ok((await tile('Products ready')).includes(`${want.ready}`) && (await tile('Products ready')).includes(`of ${want.rows.length}`), `Products ready says ${want.ready} of ${want.rows.length} — "${await tile('Products ready')}"`);
ok(flat(await page.locator('.pl-sec[aria-label="Products on this line"] .pl-sec-aside').innerText()) === want.said, `the products said: "${want.said}"`);
ok(await page.locator('.pl > .ln-close').count() === 1, 'the closing line');
const order = await page.evaluate(() => [...document.querySelectorAll('.pl > .pl-sec')].map(s => s.getAttribute('aria-label')));
ok(order.indexOf('Machines on this line') < order.indexOf('Products on this line') && order.indexOf('Products on this line') < order.indexOf('Programs on this line'), `the page in §3's order — machines, products, programs (${order.join(' · ')})`);

/* 2 · a program planned for a new product, its test day gone */
const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
await page.evaluate(async ([id, day]) => {
  const db = await import('/src/db.ts');
  await db.putProgram({ id: 'hub-p1', projectId: '', workspaceId: id, what: 'PR-77', runs: 'Smash Mash 1kg', state: 'onMachine', testOn: day, sort: 999, createdAt: Date.now(), updatedAt: Date.now() });
}, [LINE, yesterday]);
await go(`#/lines/${LINE}`, 3000);
want = await expected(); got = await drawn();
const smash = got.find(r => r.name === 'Smash Mash 1kg');
ok(!!smash && smash.cells[0].tone === 'r' && /^test was /.test(smash.cells[0].word), `the new product on its row, its test day gone in red — "${smash?.cells[0].word}"`);
ok((await tile('Products ready')).includes(`${want.failing} failing`), `Products ready counts ${want.failing} failing — "${await tile('Products ready')}"`);
await go('#/room', 3500);
const card = await page.evaluate(n => [...document.querySelectorAll('.fac-card')].find(c => c.querySelector('.fac-card-name')?.textContent.trim() === n)?.querySelector('.fac-card-prods')?.textContent.replace(/\s+/g, ' ').trim() ?? '', want.name);
ok(card === want.said, `the control room's card for ${want.name}: "${card}" (wanted "${want.said}")`);
const cardRed = await page.evaluate(n => !![...document.querySelectorAll('.fac-card')].find(c => c.querySelector('.fac-card-name')?.textContent.trim() === n)?.querySelector('.fac-card-prods .is-r'), want.name);
ok(cardRed, 'the failing count in red on the card');
const failingBefore = want.failing;
await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const p = (await db.listAllPrograms()).find(x => x.id === 'hub-p1');
  await db.putProgram({ ...p, state: 'proved', provedOn: new Date().toISOString().slice(0, 10), updatedAt: Date.now() });
});
await go(`#/lines/${LINE}`, 3000);
want = await expected(); got = await drawn();
ok(got.find(r => r.name === 'Smash Mash 1kg')?.cells[0].tone === 'g', `proved, it reads ${got.find(r => r.name === 'Smash Mash 1kg')?.cells[0].word} in green`);
ok(want.failing === failingBefore - 1, `the failing count goes down by one (${failingBefore} → ${want.failing})`);

/* 3 · an answer tapped opens its tool on the line */
await page.locator('.pl-prod:not(.is-head)').first().locator('.pl-ready').nth(2).click();
await page.waitForTimeout(1500);
ok(page.url().includes('#/balances') && page.url().includes(`line=${encodeURIComponent(LINE)}`), `the capacity answer opens Line capacity on the line (${page.url().split('#')[1]})`);

/* 4 · the line report, one page */
await go(`#/lines/${LINE}`, 3000);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), paper(page, 'Line report')]);
const f = join(dir, 'line.pdf'); await dl.saveAs(f);
const text = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' ');
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))?.[1]);
ok(pages === 1, `the line report is one page (${pages})`);
const nows = s => s.replace(/\s+/g, '');
const missingProducts = want.rows.slice(0, 8).filter(r => !nows(text).includes(nows(r.name)));
ok(!missingProducts.length, `every product on the paper${missingProducts.length ? ` — missing ${missingProducts.map(r => r.name).join(', ')}` : ''}`);
const missingWords = want.rows.slice(0, 8).flatMap(r => r.cells.map(c => c.word)).filter(w => !nows(text).includes(nows(w).slice(0, 14)));
ok(!missingWords.length, `every answer's word on the paper${missingWords.length ? ` — missing ${missingWords.slice(0, 4).join(' | ')}` : ''}`);
for (const k of ['PROBLEMS OPEN', 'PROGRAMS PROVED', 'PRODUCTS READY', 'STOPS TIMED', 'A DAY OF THE LINE']) ok(text.toUpperCase().includes(k), `the tile "${k}" on the paper`);
const closing = flat(await page.locator('.pl > .ln-close > span:last-child').innerText());
ok(nows(text).includes(nows(closing).slice(0, 40)), `the closing line on the paper as on the screen ("${closing.slice(0, 60)}…")`);

/* 5 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/lines/${LINE}`, 3000);
const phone = await page.evaluate(() => ({
  head: getComputedStyle(document.querySelector('.pl-prod.is-head')).display,
  named: [...document.querySelectorAll('.pl-prod:not(.is-head) .pl-ready-k')].every(k => getComputedStyle(k).display !== 'none' && k.textContent.trim()),
  wide: document.documentElement.scrollWidth,
}));
ok(phone.head === 'none' && phone.named, 'on a phone a product is a card, each answer named');
ok(phone.wide <= 392, `nothing off the side (${phone.wide}px)`);

ok(!errs.length, `no console errors${errs.length ? ` — ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `${fail} failed` : 'Stage 3 accepted: the line is the hub — its tiles, its products ready or not, moving when a program is planned and proved, each answer a door to its tool, the line report on one page, the control room\'s card, and the phone');
process.exit(fail ? 1 : 0);
