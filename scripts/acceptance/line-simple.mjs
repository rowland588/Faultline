/* ACCEPTANCE — THE LINE'S PAGE, SIMPLER (10 November — Rowland: "the line pages are difficult also, busy … these dashboards are going
 * to be cleaner. Too busy. Things need to be simplified. Tools obvious. Continue obvious. Everything is too busy."). The line's Overview,
 * read in the order a person reads it:
 *
 *   1  the order — the page header and its doors, the four tiles, then Carry on, then Problems, then the line machine by machine,
 *      then one fold, More about this line, and the closing line last
 *   2  Carry on — the records in use on this line, newest first (each tool's record as Tools on this line speaks of it — the page's
 *      own toolSaysOf, one reader), at most five, each with its tool, its name and its finding in the same words; All tools on this line ›
 *      opening the line's Tools tab
 *   3  a Carry on row opens THAT record's own page — never the tool's list
 *   4  More about this line shut by default; opened, every part inside it — Programs, Spread what works (when there is something),
 *      Eyes on the line, Tools on this line (in use and not used yet), Logs, Projects, The line — and the closing line still last
 *   5  a line with no tool in use says so in one line, with the Tools tab one tap away
 *   6  a phone (390 px) — the same order, nothing off the side, the cards' heads and the fold's toggle a thumb's height
 *
 *   node scripts/acceptance/line-simple.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

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
  const G = await import('/src/line/glance/glance.ts');
  const live = studies.filter(s => !s.deletedAt);
  return TOOLS.map(tl => ({ key: tl.key, label: tl.label, ...toolSaysOf(tl, { standards, studies: live, obs, line, wsId: id }) }))
    .filter(x => x.n > 0 && x.href && x.key !== 'doc').sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
    /* since 13 November a record is a card with its evidence: its words are the tool's own sentence where it has one (line/glance), else the finding */
    .map(x => ({ key: x.key, label: x.label, name: x.name ?? '', finding: x.finding ?? '', said: (x.study ? G.glanceOfStudy(x.study).sentence : undefined) ?? x.finding ?? '', href: x.href }));
}, ws);

/* the page in reading order: what each of the overview's parts is, top to bottom */
const order = () => page.evaluate(() => {
  const want = [
    ['header', '.pl .part-head'], ['tiles', '.pl .pl-tiles'], ['carry', '.pl [data-carry-on]'], ['problems', '.pl .pl-sec[aria-label="Problems on this line"]'],
    ['machines', '.pl .tour'], ['fold', '.pl [data-fold="line-more"]'], ['closing', '.pl > .ln-close'],
  ];
  return want.map(([k, sel]) => { const e = document.querySelector(sel); return [k, e ? e.getBoundingClientRect().top + window.scrollY : null]; });
});
const inOrder = o => o.every(([, y]) => y != null) && o.every(([, y], i) => i === 0 || y > o[i - 1][1]);

/* ---- 1 · the order ---- */
await t.go(`#/lines/${WS}`, 3000);
await page.locator('[data-carry-on]').waitFor({ timeout: 10000 }).catch(() => {});
const o1 = await order();
ok(inOrder(o1), `1 header, tiles, What we found, Problems, the machines, More about this line, the closing line — in that order (${o1.map(([k, y]) => `${k}@${y == null ? '—' : Math.round(y)}`).join(' ')})`);
ok(await page.locator('.pl-tiles .ln-tile').count() === 4, '1 the four tiles');

/* ---- 2 · Carry on, the page's own reader ---- */
const want = await truth(WS);
const rows = await page.locator('[data-carry]').evaluateAll(els => els.map(e => ({ key: e.getAttribute('data-carry'), tool: e.querySelector('.ev-tool')?.textContent ?? '', name: e.querySelector('.ev-name')?.textContent ?? '', finding: e.querySelector('.ev-says')?.textContent ?? '' })));
const top = want;
ok(want.length > 0 && rows.length === top.length && rows.every((r, i) => r.key === top[i].key && r.tool === top[i].label && r.name === top[i].name && r.finding === top[i].said),
  `2 What we found is the records in use, newest first, as toolSaysOf says them (${rows.map(r => `${r.tool}: ${r.name}`).join(' · ')})`);
ok(rows.length === want.length, `2 a card for every tool in use (${rows.length} of ${want.length}) — a document is under What we produced`);
/* the finding is the sentence Tools on this line shows for the same tool */
await page.locator('[data-fold="line-more"] .fold-toggle').click(); await page.waitForTimeout(600);
const toolsSays = await page.locator('.pl-sec[aria-label="Tools on this line"] .pl-tool.is-used').evaluateAll(els => els.map(e => ({ label: e.querySelector('b')?.textContent ?? '', says: e.querySelector('.pl-tool-says')?.textContent ?? '' })));
ok(top.every(r => { const s = toolsSays.find(x => x.label === r.label); return !!s && s.says.includes(r.finding); }), '2 each record’s finding the words Tools on this line shows for that tool');
await page.locator('[data-fold="line-more"] .fold-toggle').click(); await page.waitForTimeout(400);
await page.locator('[data-carry-on]').getByRole('button', { name: 'All tools on this line ›' }).click(); await page.waitForTimeout(1500);
ok(/#\/lines\/[^?]+\?view=tools$/.test(page.url()), `2 All tools on this line › opens the line's Tools tab (${page.url().split('#')[1]})`);

/* ---- 3 · a row opens the record itself ---- */
await t.go(`#/lines/${WS}`, 2500);
const first = top[0];
await page.locator('[data-carry]').first().click(); await page.waitForTimeout(500);
ok(/#\/lines\//.test(page.url()) && (await page.locator('[data-ev][data-ev-open="1"]').count()) === 1, '3 a card opens in place, still on the line’s page');
await page.locator('[data-ev][data-ev-open="1"] [data-ev-go]').click(); await page.waitForTimeout(2000);
const at = decodeURIComponent(page.url().split('#')[1] ?? '');
ok(!!first && at === decodeURIComponent(first.href) && !at.includes('?line='), `3 its Open … › goes to that record's own page (${at}), not its list`);
ok(/[0-9a-z-]{6,}/i.test(at.split('?')[0].split('/').pop() ?? ''), '3 the address names the record');

/* ---- 4 · the fold, shut by default, everything inside it ---- */
await page.evaluate(() => { try { localStorage.removeItem('faultline.fold.line-more'); } catch { /* fine */ } });
await t.go(`#/lines/${WS}`, 2800);
const fold = page.locator('[data-fold="line-more"]');
ok(await fold.count() === 1 && /More about this line/.test(await fold.locator('.fold-t').innerText()), '4 one fold, More about this line');
ok(!(await fold.evaluate(e => e.classList.contains('is-open'))) && await page.locator('.pl-sec[aria-label="Programs on this line"]').count() === 0, '4 shut by default — nothing of it on the page');
ok(await page.locator('.pl-sec[aria-label="Tools on this line"]').count() === 0 && await page.locator('.pl-looked').count() === 0, '4 …neither the tools nor Eyes on the line');
await fold.locator('.fold-toggle').click(); await page.waitForTimeout(800);
const inside = sel => page.locator(`[data-fold="line-more"] .fold-b ${sel}`).count();
for (const [what, sel] of [
  ['Programs', '.pl-sec[aria-label="Programs on this line"]'],
  ['Eyes on the line', '.pl-looked'],
  ['Tools on this line — in use', '.pl-sec[aria-label="Tools on this line"] .pl-tools.is-used'],
  ['Tools on this line — Stops timed among them', '.pl-tool.is-stops'],
  ['Tools on this line — not used yet', '.pl-sec[aria-label="Tools on this line"] .pl-tools-more'],
  ['Logs on this line', '.pl-sec[aria-label="Logs on this line"]'],
  ['Projects on this line', '.pl-sec[aria-label="Projects on this line"]'],
  ['The line — its facts', '.pl-sec[aria-label="The line"] .pl-facts'],
]) ok(await inside(sel) >= 1, `4 opened: ${what} inside it`);
ok(await page.locator('.pl > .ln-close').count() === 1 && await page.evaluate(() => { const f = document.querySelector('[data-fold="line-more"]'); const c = document.querySelector('.pl > .ln-close'); return !!f && !!c && (f.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) > 0; }), '4 the closing line still last, after the fold');
/* the line's own tabs are unchanged — no fold on them */
await t.go(`#/lines/${WS}?view=tools`, 2500);
ok(await page.locator('[data-fold="line-more"]').count() === 0 && await page.locator('.pl-sec[aria-label="Tools on this line"]').count() === 1, '4 the Tools tab shows its tools as before, no fold');

/* ---- 5 · a line with nothing in use ---- */
const empty = await page.evaluate(async () => { const db = await import('/src/db.ts'); const w = await db.createWorkspace(`Line simple ${Date.now() % 100000}`); return w.id; });
await t.go(`#/lines/${empty}`, 2800);
ok(/No tool in use on this line yet/.test(await t.words('[data-carry-on]')) && await page.locator('[data-carry]').count() === 0, `5 a line with no tool in use says so in one line: "${await t.words('[data-carry-on] .pl-carry-none')}"`);
ok(await page.locator('[data-carry-on]').getByRole('button', { name: 'All tools on this line ›' }).count() === 1, '5 …with the Tools tab one tap away');

/* ---- 6 · a phone ---- */
await page.evaluate(() => { try { localStorage.removeItem('faultline.fold.line-more'); } catch { /* fine */ } });
await page.setViewportSize({ width: 390, height: 844 });
await t.go(`#/lines/${WS}`, 3000);
await page.locator('[data-carry-on]').waitFor({ timeout: 10000 }).catch(() => {});
const o6 = await order();
ok(inOrder(o6), `6 the phone — the same order (${o6.map(([k, y]) => `${k}@${y == null ? '—' : Math.round(y)}`).join(' ')})`);
ok(await t.wide() <= 0, `6 nothing off the side (${await t.wide()} px)`);
const tall = await page.locator('[data-carry], [data-fold="line-more"] .fold-toggle').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(tall.length > 1 && tall.every(h => h >= 44), `6 Carry on's rows and the fold's toggle a thumb's height (${tall.join(', ')} px)`);
await page.locator('[data-fold="line-more"] .fold-toggle').click(); await page.waitForTimeout(800);
ok(await page.locator('[data-fold="line-more"] .fold-b .pl-sec[aria-label="Tools on this line"]').count() === 1 && await t.wide() <= 0, '6 opened on the phone, the tools inside, nothing off the side');

await t.finish('The line page, simpler, accepted: the tiles, What we found (a card a record, into the record itself), Problems, the machines, then everything else in one fold shut by default — desk and phone.');
