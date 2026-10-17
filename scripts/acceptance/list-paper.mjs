/* ACCEPTANCE — PAPER WHEREVER THERE IS A LIST (docs/AUDIT.md, bar 3: "a page
 * that lists records offers its report; a record that has a card offers the
 * cards for all that are shown, as well as one at a time").
 *
 * Rowland, 13 October: "I find that I'm always asking for reports, or cards,
 * to be able to present things in a certain way that would seem to be
 * obvious, but aren't, because you're not building them." Driven in a real
 * browser on the ordinary seed, each button pressed, each PDF saved and read
 * back with pdftotext, every sentence checked against the module that makes
 * it on the screen:
 *
 *   1  Line capacity's own page: PDF — one page; the product, what limits it
 *      (lib/capacity shortSays), the screen's sentence, the V's, every
 *      station counted, a shift's, what a pack costs, the people's work
 *   2  Line capacity's list: PDF (all shown) — a front saying them all, and
 *      every product the list shows with the finding its row says; on one
 *      line, only that line's
 *   3  Line standard's list: PDF (all shown) — a card a page for every
 *      product shown; on one line, that line's
 *   4  Materials: Materials report — one page; how many are here as the
 *      header says it, the late named with how late as the list says it,
 *      every material on it; greyed with nothing on the list
 *   5  Commission: Test cards — a card for every test on the board, each
 *      numbering its own pages
 *   6  a client takes the paper too
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/list-paper.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
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
const dir = mkdtempSync(join(tmpdir(), 'list-paper-'));
const flat = x => x.replace(/\s+/g, '');
/** Press a button, save what it downloads, and read it back. */
const paper = async (button, name) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), button.click()]);
  const f = join(dir, name); await dl.saveAs(f);
  return {
    text: execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' '),
    pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }))?.[1]),
    file: f,
  };
};
/** What the PDF fonts make of a string (lib/reportKit san), so a typed "→" is compared as it prints. */
const sanned = xs => page.evaluate(async xs => { const { san } = await import('/src/lib/reportKit.ts'); await (await import('/src/lib/savePdf.ts')).loadPdfLib(); return xs.map(x => san(x ?? '')); }, xs);
const missing = async (text, xs) => (await sanned(xs.filter(Boolean))).filter(x => x && !flat(text).includes(flat(x)));

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- 1 Line capacity's own page ---- Line 7's Maris Piper 2kg: three
   stations, the line's shifts, its crew and rate, its target met */
{
  const L7 = await page.evaluate(async ws => { const db = await import('/src/db.ts'); return (await db.listAllStandards()).find(s => s.workspaceId === ws && s.capacity?.stations.length)?.id; }, sd.line7WsId);
  await go(`#/w/${sd.line7WsId}/standards/${L7}?at=balance`);
  await page.locator('.cap-says').first().waitFor({ timeout: 10000 }).catch(() => {});
  const truth = await page.evaluate(async id => {
    const db = await import('/src/db.ts'); const C = await import('/src/lib/capacity.ts');
    const st = await db.getStandard(id); const r = C.analyse(st.capacity);
    return { product: st.product, short: C.shortSays(r), sentence: r.sentence, v: C.vCurve(r, st.capacity.vMarginPct).sentence, stations: r.ok.map(x => x.station.name) };
  }, L7);
  const screen = { says: await words('.cap-says'), v: await words('.vc-says'), shift: await words('.shc-says'), cost: await words('.cap-cost-says') };
  const p = await paper(page.getByRole('button', { name: 'PDF', exact: true }), 'capacity-one.pdf');
  const lost = await missing(p.text, [truth.product, truth.short, truth.sentence, truth.v, ...truth.stations, screen.says, screen.v, screen.shift, screen.cost]);
  ok(p.pages === 1 && !lost.length && /LINE CAPACITY/.test(p.text) && /the bottleneck/.test(p.text),
    `1 Line capacity's own page on paper: one page (${p.pages}) — ${truth.short}; the sentence, the V, ${truth.stations.length} stations, a shift and the cost a pack as the screen says them${lost.length ? ` — lost: ${lost.slice(0, 3).join(' | ')}` : ''}`);
}

/* ---- 2 Line capacity's list: every product shown ---- */
{
  await go('#/balances');
  const shown = await page.locator('.lt-rows .lt-li').evaluateAll(els => els.map(e => ({ what: e.querySelector('.lt-what')?.textContent?.trim() ?? '', says: e.querySelector('.lt-says')?.textContent?.trim() ?? '' })));
  const p = await paper(page.getByRole('button', { name: /^PDF \(all shown\)/ }), 'capacity-all.pdf');
  const lost = await missing(p.text, shown.flatMap(x => [x.what, x.says.replace(/^No stations yet.*$/, 'No stations yet')]));
  ok(shown.length >= 2 && !lost.length && new RegExp(`${shown.length} products? on \\d+ lines?`).test(p.text),
    `2 Line capacity, every product shown (${shown.length}): a front saying them all, each with the finding its row says${lost.length ? ` — lost: ${lost.slice(0, 3).join(' | ')}` : ''}`);
  /* on one line: only that line's */
  const chip = page.locator('.qsl-f .chip', { hasText: /^Line 7 — smoke test$/ });
  if (await chip.count()) {
    await chip.click(); await page.waitForTimeout(600);
    const one = (await page.locator('.lt-rows .lt-what').allInnerTexts()).map(x => x.trim());
    const q = await paper(page.getByRole('button', { name: /^PDF \(all shown\)/ }), 'capacity-line.pdf');
    ok(one.length < shown.length && new RegExp(`${one.length} products? on 1 line`).test(q.text) && /LINE CAPACITY · LINE 7 — SMOKE TEST/.test(q.text) && (await missing(q.text, one)).length === 0,
      `2 on one line: that line's ${one.length} of the ${shown.length}`);
  } else ok(false, '2 on one line: the line chip is not on the list');
}

/* ---- 3 Line standard's list: a card for every product shown ---- */
{
  await go('#/standards');
  /* every line — the list keeps the line picked on Line capacity */
  if (await page.locator('.qsl-f .chip', { hasText: /^Every line$/ }).count()) { await page.locator('.qsl-f .chip', { hasText: /^Every line$/ }).click(); await page.waitForTimeout(500); }
  const shown = await page.locator('.lt-rows .lt-li').count();
  const p = await paper(page.getByRole('button', { name: /^PDF \(all shown\)/ }), 'standards-all.pdf');
  ok(shown >= 2 && p.pages === shown, `3 Line standard, a card a page for every product shown (${p.pages} of ${shown})`);
  const chip = page.locator('.qsl-f .chip').nth(1);
  await chip.click(); await page.waitForTimeout(600);
  const one = await page.locator('.lt-rows .lt-li').count();
  const q = await paper(page.getByRole('button', { name: /^PDF \(all shown\)/ }), 'standards-line.pdf');
  ok(q.pages === one && one < shown, `3 on one place: its ${one} card${one === 1 ? '' : 's'}`);
}

/* ---- 4 Materials ---- the paced job's seven: two late, two coming, one undated, two in */
{
  await go(`#/project/${sd.pacedProjectId}/materials`);
  /* "2 of 7 here" — its counts are the page's tiles now (lib/stageGatePages) */
  const here = (await page.locator('.sg-tiles .ln-tile').evaluateAll(els => els.map(e => ({ k: e.querySelector('.ln-k')?.textContent?.trim() ?? '', v: e.querySelector('.ln-v')?.textContent?.trim() ?? '', of: e.querySelector('.ln-of')?.textContent?.trim() ?? '' })))).find(x => x.k === 'Here') ?? { v: '', of: '' };
  const head = `${here.v} ${here.of.replace(/ needed$/, '')} here`;
  const rows = await page.locator('section.pace-sec', { hasText: 'What we are waiting on' }).first().locator('.mt-row').evaluateAll(els => els.map(e => ({ what: e.querySelector('.mt-what')?.textContent?.trim() ?? '', when: e.querySelector('.mt-when-n')?.textContent?.trim() ?? '', late: e.classList.contains('is-late') })));
  const p = await paper(page.getByRole('button', { name: 'Materials report' }), 'materials.pdf');
  const lost = await missing(p.text, [head, ...rows.map(r => r.what), ...rows.filter(r => r.late).map(r => r.when)]);
  const late = rows.filter(r => r.late);
  ok(p.pages === 1 && rows.length === 7 && !lost.length && /Late — what is holding us up/.test(p.text) && /No date agreed/.test(p.text) && new RegExp(`In — 2 of ${rows.length}`).test(p.text),
    `4 Materials report: one page (${p.pages}) — "${head}", ${late.length} late as the list says (${late.map(r => r.when).join(', ')}), every one of ${rows.length} on it${lost.length ? ` — lost: ${lost.slice(0, 3).join(' | ')}` : ''}`);
  await go(`#/project/${sd.projectId}/materials`);
  ok(await page.getByRole('button', { name: 'Materials report' }).isDisabled(), '4 nothing on the list: the report greyed');
}

/* ---- 5 Commission: a card for every test on the board ---- */
{
  await go(`#/project/${sd.projectId}/testing`);
  const board = await page.evaluate(async pid => { const T = await import('/src/lib/testCards.ts'); const db = await import('/src/db.ts'); return T.boardOrder(await db.listTests(pid), await db.listAssets(pid)).map(x => x.title); }, sd.projectId);
  const p = await paper(page.getByRole('button', { name: /^Test cards/ }), 'test-cards.pdf');
  const lost = await missing(p.text, board);
  const firsts = (p.text.match(/ 1 of \d+/g) ?? []).length;
  ok(board.length >= 3 && !lost.length && p.pages >= board.length && firsts >= board.length,
    `5 Test cards: a card for every test on the board (${board.length}, ${p.pages} pages), each numbering its own${lost.length ? ` — lost: ${lost.slice(0, 3).join(' | ')}` : ''}`);
  /* and every step on a gate — Install's */
  await go(`#/project/${sd.projectId}/install`);
  const steps = await page.evaluate(async pid => { const T = await import('/src/lib/testCards.ts'); const db = await import('/src/db.ts'); return T.boardOrder(await db.listTests(pid), await db.listAssets(pid), 'install').map(x => x.title); }, sd.projectId);
  const q = await paper(page.getByRole('button', { name: /^Step cards/ }), 'step-cards.pdf');
  const lostSteps = await missing(q.text, steps);
  ok(steps.length >= 2 && !lostSteps.length && q.pages >= steps.length && /INSTALL STEP|Install step/i.test(q.text),
    `5 Step cards on Install: a card for every step (${steps.length}, ${q.pages} pages)${lostSteps.length ? ` — lost: ${lostSteps.slice(0, 3).join(' | ')}` : ''}`);
}

/* ---- 6 a client takes the paper too ---- */
{
  await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
  await go(`#/project/${sd.pacedProjectId}/materials`);
  const m = await page.getByRole('button', { name: 'Materials report' }).isEnabled();
  await go(`#/project/${sd.projectId}/testing`);
  const t = await page.getByRole('button', { name: /^Test cards/ }).isEnabled();
  await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
  ok(m && t, '6 a client reads the job and takes its paper');
}

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nPaper wherever there is a list: Line capacity, Line standard, Materials and Commission accepted');
process.exit(failed ? 1 : 0);
