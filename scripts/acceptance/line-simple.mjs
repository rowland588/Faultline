/* ACCEPTANCE — THE LINE'S PAGE, SIMPLER (10 November — Rowland: "the line pages are difficult also, busy … these dashboards are going
 * to be cleaner. Too busy. Things need to be simplified. Tools obvious. Continue obvious. Everything is too busy."). The line's Overview,
 * read in the order a person reads it:
 *
 *   1  the order — the page header and its doors, the four answers (the tiles inside the fold since 15 November), then Carry on, then Problems, then the line machine by machine,
 *      then one fold, More about this line, and the closing line last
 *   2  Carry on — the most recent record in use on this line (the same toolSaysOf reader as Tools on this line),
 *      with its tool, name and finding in the same words; All saved uses ›
 *      opening the line's Tools tab
 *   3  a Carry on row opens THAT record's own page — never the tool's list
 *   4  More about this line shut by default; opened, every part inside it — Programs, Spread what works (when there is something),
 *      Eyes on the line, Tools on this line (in use and not used yet), Logs, Projects, The line — and the closing line still last
 *   5  a line with no tool in use says so in one line and offers Start a tool directly
 *   6  a phone (390 px) — the same order, nothing off the side, the cards' heads and the fold's toggle a thumb's height
 *
 *   node scripts/acceptance/line-simple.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { openLineMore } from '../lib/lineMore.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const WS = sd.wsId;
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();

/* what the page's own reader says each tool's record is — the same toolSaysOf Tools on this line reads */
const truth = ws => page.evaluate(async id => {
  const db = await import('/src/db.ts');
  const { TOOLS, toolSaysOf } = await import('/src/screens/ProductionLineScreen.tsx');
  const [line, standards, studies, obs] = await Promise.all([db.getWorkspace(id), db.listStandardsForLine(id), db.listStudiesForLine(id), db.listObservations(id)]);
  const { toolUsesOf } = await import('/src/screens/ProductionLineScreen.tsx');
  return TOOLS.flatMap(tl => toolUsesOf(tl, { standards, studies, obs, line, wsId: id }))
    .filter(x => x.href && x.study?.tool !== 'doc').sort((a, b) => (b.at ?? 0) - (a.at ?? 0)).slice(0, 3)
    .map(x => ({ key: x.key, label: x.tool, name: x.name ?? '', finding: x.finding ?? '', said: x.finding ?? '', href: x.href }));
}, ws);

/* the page in reading order: what each of the overview's parts is, top to bottom */
const order = () => page.evaluate(() => {
  const want = [
    /* MinLine's order (minimal v2, 19 November): the machines under the figures; Problems and Actions side by side; then the tool
       uses, Programs and the fold */
    ['header', '.pl .part-head'], ['figures', '.pl .pl-figures'], ['machines', '.pl .tour'], ['problems', '.pl .pl-sec[aria-label="Problems on this line"]'],
    ['carry', '.pl [data-carry-on]'], ['programs', '.pl .pl-sec[aria-label="Programs on this line"]'], ['fold', '.pl [data-fold="line-more"]'],
  ];
  return want.map(([k, sel]) => { const e = document.querySelector(sel); return [k, e ? e.getBoundingClientRect().top + window.scrollY : null]; });
});
const inOrder = o => o.every(([, y]) => y != null) && o.every(([, y], i) => i === 0 || y > o[i - 1][1]);

/* ---- 1 · the order ---- */
await t.go(`#/lines/${WS}`, 3000);
await page.locator('[data-carry-on]').waitFor({ timeout: 10000 });
await page.locator('.pl-work').waitFor({ timeout: 60000 });
const o1 = await order();
const pair = await page.evaluate(() => { const a = document.querySelector('.pl .pl-sec[aria-label="Problems on this line"]')?.getBoundingClientRect(), b = document.querySelector('.pl .pl-work')?.getBoundingClientRect(); return a && b ? { top: Math.round(b.top - a.top), right: b.left >= a.right } : null; });
ok(!!pair && pair.top === 0 && pair.right, `1 Actions beside Problems at a desk, as MinLine (${JSON.stringify(pair)})`);
ok(inOrder(o1), `1 header, the line in figures, the machines, Problems, recent tool uses, Programs and More about this line — in that order (${o1.map(([k, y]) => `${k}@${y == null ? '—' : Math.round(y)}`).join(' ')})`);
/* MINIMAL V2 (19 November, docs/design/minimal-v2 layout change 2): The line in figures stands under the line's doors on arrival
   (it was inside More about this line from 15 November, docs/AREAS.md A2); one action and one problem still previewed */
ok(await page.locator('.pl-four').count() === 0 && await page.locator('.pl-work .pl-action-row').count() <= 1 && await page.locator('.pl-problem-cards .pl-row').count() <= 1 && await page.locator('.pl-figures .pl-tiles .ln-tile').count() === 4, '1 one action and problem previewed, the four figures in one row under the doors');
await openLineMore(page);
ok(await page.locator('[data-fold="line-more"] .pl-figures').count() === 0, '1 the figures are not drawn a second time inside More about this line');
await page.locator('[data-fold="line-more"] > .fold-h > .fold-toggle').first().click(); await page.waitForTimeout(300);
/* layout change 3: Results and charts open on arrival at a desk (a person's own choice still wins) */
ok(await page.locator('[data-fold="line-evidence"].is-open').count() === 1 || await page.locator('[data-fold="line-evidence"]').count() === 0, '1 Results and charts open on arrival at a desk');

/* ---- 2 · Carry on, the page's own reader ---- */
const want = await truth(WS);
const rows = await page.locator('[data-carry-on] [data-use]').evaluateAll(els => els.map(e => ({ key: e.getAttribute('data-use'), tool: e.querySelector('.line-use-kind')?.textContent ?? '', name: e.querySelector('b')?.textContent ?? '', finding: e.querySelector('.line-use-finding')?.textContent ?? '' })));
const top = want.slice(0, 1);
ok(want.length > 0 && rows.length === top.length && rows.every((r, i) => r.key === top[i].key && r.tool === top[i].label && r.name === top[i].name && r.finding === top[i].said), '2 the leading saved use has its own identity and the existing reader’s finding');
ok(rows.length <= 1, '2 overview keeps one recent use; every use remains on Tools');
await page.locator('[data-all-tools]').click(); await page.waitForTimeout(1500);
ok(/#\/lines\/[^?]+\?view=tools$/.test(page.url()), '2 All saved uses opens the line Tools page');
await t.go(`#/lines/${WS}`, 2500);
await page.locator('[data-carry-on] .line-use-open').first().click(); await page.waitForTimeout(2000);
const at = decodeURIComponent(page.url().split('#')[1] ?? '');
ok(at === decodeURIComponent(top[0].href), '3 one press opens that exact saved record, without an intermediate chart card');

/* ---- 4 · the fold, shut by default, everything inside it ---- */
await page.evaluate(() => { try { localStorage.removeItem('faultline.fold.line-more'); } catch { /* fine */ } });
await t.go(`#/lines/${WS}`, 2800);
const fold = page.locator('[data-fold="line-more"]');
ok(await fold.count() === 1 && /More about this line/.test(await fold.locator('.fold-t').innerText()), '4 one fold, More about this line');
ok(!(await fold.evaluate(e => e.classList.contains('is-open'))) && await page.locator('[data-fold="line-more"] .pl-sec[aria-label="Programs on this line"]').count() === 0 && await page.locator('.pl-sec[aria-label="Programs on this line"]').count() === 1, '4 shut by default; Programs stand on the page above it (MinLine), not inside');
ok(await page.locator('.pl-sec[aria-label="Tools on this line"]').count() === 0 && await page.locator('.pl-looked').count() === 0, '4 …neither the tools nor Eyes on the line');
await fold.locator(':scope > .fold-h > .fold-toggle').click(); await page.waitForTimeout(800);
await page.locator('[data-fold="line-tool-library"] > .fold-h > .fold-toggle').click();
const inside = sel => page.locator(`[data-fold="line-more"] .fold-b ${sel}`).count();
for (const [what, sel] of [
  ['Eyes on the line', '.pl-looked'],
  ['Tools on this line — in use', '.pl-sec[aria-label="Tools on this line"] .pl-tools.is-used'],
  ['Tools on this line — Stops timed among them', '.pl-tool.is-stops'],
  ['Tools on this line — not used yet', '.pl-sec[aria-label="Tools on this line"] .pl-tools-more'],
  ['Logs on this line', '.pl-sec[aria-label="Logs on this line"]'],
  ['Projects on this line', '.pl-sec[aria-label="Projects on this line"]'],
  ['The line — its facts', '.pl-sec[aria-label="The line"] .pl-facts'],
]) ok(await inside(sel) >= 1, `4 opened: ${what} inside it`);
ok(await page.locator('.pl > .ln-close').count() === 0, '4 the overview does not repeat its summary after the fold');
/* the line's own tabs are unchanged — no fold on them */
await t.go(`#/lines/${WS}?view=tools`, 2500);
ok(await page.locator('[data-fold="line-more"]').count() === 0 && await page.locator('.pl-sec[aria-label="Tools on this line"]').count() === 1, '4 the Tools tab shows its tools as before, no fold');

/* ---- 5 · a line with nothing in use ---- */
const empty = await page.evaluate(async () => { const db = await import('/src/db.ts'); const w = await db.createWorkspace(`Line simple ${Date.now() % 100000}`); return w.id; });
await t.go(`#/lines/${empty}`, 2800);
ok(/No saved tool uses yet/.test(await t.words('[data-carry-on]')) && await page.locator('[data-carry]').count() === 0, `5 a line with no tool in use says so in one line: "${await t.words('[data-carry-on]')}"`);
ok(await page.locator('[data-carry-on]').getByRole('button', { name: 'Start a tool' }).count() === 1, '5 …with Start a tool directly available');

/* ---- 5b · THE AREAS AND LINES BESIDE THE LINE (minimal v2, layout change 1 — line/LinePlacePanel) ---- */
await page.setViewportSize({ width: 1440, height: 900 });
await t.go(`#/lines/${WS}`, 3000);
await page.locator('[data-place-panel]').waitFor({ timeout: 15000 });
const panel = await page.evaluate(async ws => {
  const db = await import('/src/db.ts'); const { lineProblems } = await import('/src/lib/lineWork.ts'); const { lineState } = await import('/src/ui/FactoryLineCard.tsx');
  const rows = [...document.querySelectorAll('[data-place-panel] [data-place-line]')].map(e => ({ name: e.getAttribute('data-place-line'), on: e.getAttribute('aria-current') === 'page', sq: e.querySelector('.lpp-sq')?.className ?? '', word: (e.querySelector('.lpp-word') ?? e.querySelector('.sr-only'))?.textContent ?? '', shown: !!e.querySelector('.lpp-word') }));
  const lines = (await db.listWorkspaces()).filter(w => rows.some(r => r.name === w.name));
  const want = await Promise.all(lines.map(async w => { const p = lineProblems(await db.snagsForWorkspace(w.id), w); return { name: w.name, tone: lineState({ problems: { open: p.open, critical: p.critical, late: p.late } }).tone, id: w.id }; }));
  const box = document.querySelector('[data-place-panel]').getBoundingClientRect();
  return { rows, want, here: (await db.getWorkspace(ws))?.name, width: Math.round(box.width), mainLeft: Math.round(document.querySelector('.nv-main').getBoundingClientRect().left), panelRight: Math.round(box.right) };
}, WS);
ok(panel.rows.length >= 2 && panel.rows.filter(r => r.on).length === 1 && panel.rows.find(r => r.on)?.name === panel.here, `5b the panel lists the lines, the line you are on marked (${panel.rows.map(r => `${r.name}${r.on ? '*' : ''}`).join(', ')})`);
ok(panel.rows.every(r => r.word.trim() && panel.want.some(w => w.name === r.name && r.sq.includes(`is-${w.tone}`))), `5b every line its square and its word, the board's own reading (${panel.rows.map(r => `${r.name}: ${r.word}`).join(' · ')})`);
/* normal recedes (MinLine, 19 November): the word shows beside a line only when something is wrong; a quiet line's word is for a screen reader */
ok(panel.rows.every(r => r.shown === /is-(r|a)\b/.test(r.sq)), `5b the word shown only where something is wrong (${panel.rows.map(r => `${r.name}: ${r.shown ? 'shown' : 'read only'}`).join(' · ')})`);
ok(panel.width === 240 && panel.mainLeft >= panel.panelRight, `5b 240px beside the page, the page clear of it (${panel.width}px, page from ${panel.mainLeft}, panel to ${panel.panelRight})`);
const other = panel.rows.find(r => !r.on);
await page.locator(`[data-place-panel] [data-place-line="${other.name}"]`).click(); await page.waitForTimeout(2000);
const went = panel.want.find(w => w.name === other.name);
ok(page.url().includes(`#/lines/${went.id}`), `5b a press opens that line (${other.name})`);
for (const width of [820, 390]) { await page.setViewportSize({ width, height: 900 }); await page.waitForTimeout(300); ok(!(await page.locator('[data-place-panel]').isVisible()) && await t.wide() <= 0, `5b at ${width}px the panel stands away, nothing off the side`); }

/* ---- 6 · a phone ---- */
await page.evaluate(() => { try { localStorage.removeItem('faultline.fold.line-more'); } catch { /* fine */ } });
await page.setViewportSize({ width: 390, height: 844 });
await t.go(`#/lines/${WS}`, 3000);
await page.locator('[data-carry-on]').waitFor({ timeout: 10000 });
await page.locator('.pl-work').waitFor({ timeout: 60000 });
const o6 = await order();
ok(inOrder(o6), `6 the phone — the same order (${o6.map(([k, y]) => `${k}@${y == null ? '—' : Math.round(y)}`).join(' ')})`);
ok(await t.wide() <= 0, `6 nothing off the side (${await t.wide()} px)`);
const tall = await page.locator('[data-carry-on] .line-use-open, [data-fold="line-more"] > .fold-h > .fold-toggle').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(tall.length > 1 && tall.every(h => h >= 44), `6 Carry on's rows and the fold's toggle a thumb's height (${tall.join(', ')} px)`);
await page.locator('[data-fold="line-more"] > .fold-h > .fold-toggle').click(); await page.waitForTimeout(800);
ok(await page.locator('[data-fold="line-more"] .fold-b .pl-sec[aria-label="Tools on this line"]').count() === 1 && await t.wide() <= 0, '6 opened on the phone, the tools inside, nothing off the side');

await t.finish('The line page, simpler, accepted: the tiles, What we found (a card a record, into the record itself), Problems, the machines, then everything else in one fold shut by default — desk and phone.');
