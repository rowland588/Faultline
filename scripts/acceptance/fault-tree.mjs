/* FC-152 — FAULT TREE ANALYSIS, driven (knowledge/specs/FC-152-fault-tree.md, acceptance criteria 1–7; 1 November 2026): a tree on the scored shape — a top
 * event, AND and OR gates under it, basic events with probabilities; the minimal cut sets, the exact probability of the top event for independent events, the
 * single points and the importance of each event (IEC 61025). Held to the module (src/tools/faulttree/fault.ts) and to the second implementation's literals
 * (scripts/knowledge/cases-t8-3.py — a brute-force enumeration of every state of the basic events).
 *
 *   1  the hub and the list: Fault tree as a card, "New fault tree" the one primary, the empty list says what to do, ?add=1 opens the sheet
 *   2  the metal tree opened — the sentence, tiles and closing line equal the module's and the literals (9 cut sets of 7 events, P 0.12%); a row each with its
 *      role (top event, AND gate, OR gate, basic event); the cut sets and the weakest links listed
 *   3  a tree built through New fault tree with the real boxes — the top event, a gate each way, basic events with probabilities; the sentence follows each step
 *   4  a cause marked the same as another — counted once, the single point named
 *   5  a probability left out: the cut sets stand, the probability waits and names who lacks one; the period and the cost typed say it in money
 *   6  a row taken off with the causes below it, brought back whole with Undo
 *   7  the paper, read back: the tree as an outline, the cut sets as a table, the money, what it does not say
 *   8  kept after a reload; the list row; a client changes nothing; the phone
 *
 * Fails on any console error.   node scripts/acceptance/fault-tree.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
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
const OUT = mkdtempSync(join(tmpdir(), 'acceptance-'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text()) && !/same key/.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${extra}` : ''}`); if (!c) failed++; };
const flat = x => (x ?? '').replace(/\s+/g, ' ').trim();
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(1800); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const all = async sel => (await page.locator(sel).allInnerTexts()).map(flat);
const settle = () => page.waitForTimeout(900);   /* the register saves a moment after the last key */
const cardOf = i => page.locator('section.fm-card').nth(i);

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const lineId = sd.wsId;
const example = await page.evaluate(async () => (await import('/src/tools/scored/registry.ts')).SCORED.find(d => d.key === 'fault-tree').examples[0]);


const savedStudy = (name, key, rows, inputs = {}, extra = {}) => page.evaluate(async ([name, key, rows, lineId, inputs, extra]) => {
  const { putStudy } = await import('/src/db.ts'); const { SCORED } = await import('/src/tools/scored/registry.ts'); const { newScoredStudy } = await import('/src/tools/scored/scored.ts');
  const s = newScoredStudy(SCORED.find(d => d.key === key), { name, workspaceId: lineId, now: Date.now(), ...extra }); s.agreed.scored.rows = rows; Object.assign(s.agreed.scored, inputs); await putStudy(s); return s.id;
}, [name, key, rows, lineId, inputs, extra]);
const truth = id => page.evaluate(async sid => {
  const { getStudy, listAllStudies } = await import('/src/db.ts'); const { studyScored } = await import('/src/tools/scored/scored.ts');
  const s = await getStudy(sid); const x = studyScored(s, { studies: await listAllStudies() });
  return { sentence: x?.result?.sentence, verdict: x?.result?.verdict, closing: x?.result?.closing, tiles: x?.result?.tiles.map(t => [t.k, t.v, t.of]), money: x?.result?.money, cuts: x?.ranked?.ok.map(r => r.name), problems: x?.problems };
}, id);
const nameOf = i => cardOf(i).locator('.fm-mode input');
const roleOf = i => cardOf(i).getAttribute('data-ft-role');
const add = async i => { await cardOf(i).getByRole('button', { name: /^\+ Add a cause under this|Add a cause under/ }).first().click(); await settle(); };

/* ---- 1 · the hub and the list ---- */
{
  await go('#/scored');
  ok((await all('.pl-tool-card')).some(c => /^Fault tree/.test(c)), '1 Fault tree is a card on the Scored registers hub');
  await go('#/scored/fault-tree');
  ok(/^Fault tree$/.test((await words('.part-head .pace-title')) ?? '') && /^New fault tree$/.test((await words('.pace-head-actions .btn-primary')) ?? ''), '1 the list: Fault tree, New fault tree the one primary');
  ok(/No fault tree yet/.test((await words('.qsl-empty')) ?? ''), '1 the empty list says what to do');
  await go(`#/scored/fault-tree?project=${sd.projectId}&add=1`);
  ok((await page.locator('.lt-new').count()) === 1, '1 ?add=1 opens the sheet at once, in the project');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {});
}

/* ---- 2 · the metal tree ---- */
let worked;
{
  worked = await savedStudy('Line 2 — metal in a pack', 'fault-tree', example.rows, { period: 'a year' });
  const t = await truth(worked);
  ok(t.cuts.length === 9 && t.verdict === 'Top 0.12%', `2 the module reads the tree: ${t.cuts.length} cut sets — ${t.verdict}`);
  await go(`#/scored/fault-tree/${worked}`);
  ok((await words('.ie-says')) === t.sentence && t.sentence.startsWith('Metal reaches a consumer in a pack: 9 minimal cut sets from 7 basic events — the fewest events that can cause it is 2 (no single event does it alone).'), `2 the sentence is the module's: "${t.sentence.slice(0, 120)}"`);
  ok(/The probability of the top event is 0\.12% a year \(exact for independent events; the rare-event sum is 0\.123%, the upper bound 0\.122%\)\./.test(t.sentence), '2 P(top) 0.0012006918, rare-event 0.001225, upper bound 0.0012243877 — the literals of cases-t8-3.py, as percentages');
  const tiles = await all('.ln-tiles .ln-tile');
  ok(t.tiles.length === 5 && t.tiles.every(([k, v], i) => tiles[i]?.toLowerCase().includes(k.toLowerCase()) && tiles[i]?.includes(v)), `2 five tiles as the module says: ${tiles.join(' | ')}`);
  ok(((await words('.ln-close')) ?? '').includes(t.closing) && t.closing === 'Top 0.12% — 9 cut sets, 7 basic events.', `2 the closing line: ${t.closing}`);
  const roles = []; const n = await page.locator('section.ft-node').count(); for (let i = 0; i < n; i++) roles.push(await roleOf(i));
  ok(n === 11 && JSON.stringify(roles) === JSON.stringify(['Top event', 'OR gate', 'Basic event', 'Basic event', 'Basic event', 'OR gate', 'AND gate', 'Basic event', 'Basic event', 'Basic event', 'Basic event']), `2 a row each, as the outline reads: ${roles.join(' · ')}`);
  ok((await cardOf(0).locator('.fm-ap').innerText()) === 'Top event' && (await cardOf(1).evaluate(e => parseFloat(getComputedStyle(e).marginLeft))) > (await cardOf(0).evaluate(e => parseFloat(getComputedStyle(e).marginLeft))), '2 each row indented under its gate');
  const lists = (await all('.ln-panel li, .ie-caveats li')).join(' | ');
  ok(/Screen mesh breaks AND Detector bypassed during a fault — 0\.04%/.test(lists) && /Which events matter most/i.test(await page.locator('main').innerText()), '2 the cut sets are listed, the likeliest first, and the events that matter most');
  ok(/Screen mesh breaks — 58% of the top event, in 3 cut sets/.test(lists), '2 Fussell–Vesely 0.577184 said as 58%');
}

/* ---- 3 · a tree built through New fault tree ---- */
let made;
{
  await go('#/scored/fault-tree');
  await page.getByRole('button', { name: 'New fault tree' }).first().click(); await page.waitForTimeout(500);
  await page.getByLabel('What is the top event this tree explains?').fill('Metal reaches a consumer in a pack');
  await page.locator('.lt-new select').selectOption(lineId);
  await page.getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(1500);
  made = decodeURIComponent(page.url().split('/scored/fault-tree/')[1]?.split('?')[0] ?? '');
  ok(made.length > 8 && (await page.locator('section.ft-node').count()) === 1, '3 New fault tree opens a tree with one row, the top event');
  ok(/Name the top event/.test((await words('[role=alert]')) ?? ''), '3 nothing named: the page says what to name');
  await nameOf(0).fill('Metal reaches a consumer in a pack'); await settle();
  ok(/Add the causes under the top event/.test((await words('[role=alert]')) ?? ''), '3 a top event with no causes: the page says to add them');
  await add(0); await add(0);
  await nameOf(1).fill('Metal gets into the product'); await nameOf(2).fill('The detector does not remove it'); await settle();
  await cardOf(0).getByLabel('Gate').selectOption('AND'); await settle();
  await add(1); await add(1);
  ok((await page.locator('section.ft-node').count()) === 5 && (await roleOf(1)) === 'OR gate', '3 two causes added under the first: it becomes an OR gate, the outline now five rows');
  await nameOf(2).fill('Screen mesh breaks'); await nameOf(3).fill('Maintenance leaves a part in the line'); await nameOf(4).fill('The detector does not remove it'); await settle();
  ok((await roleOf(2)) === 'Basic event' && (await roleOf(4)) === 'Basic event', '3 the leaves are basic events, asking for a probability');
  await cardOf(2).getByLabel('Probability').fill('0.02'); await cardOf(3).getByLabel('Probability').fill('0.01'); await cardOf(4).getByLabel('Probability').fill('0.1'); await settle();
  ok(/2% /.test(await cardOf(2).innerText()) || /2%/.test(await cardOf(2).innerText()), '3 a probability is said back as the floor reads it (0.02 → 2%)');
  const t = await truth(made);
  ok((await words('.ie-says')) === t.sentence && /2 minimal cut sets from 3 basic events/.test(t.sentence) && /top event is 0\.298%/.test(t.sentence), `3 (1 − 0.98 × 0.99) × 0.1 = 0.298% and two cut sets: "${t.sentence.slice(0, 150)}"`);
  const g = await cardOf(0).getByLabel('Gate').inputValue(); ok(g === 'AND', '3 the top event’s gate is the one picked');
}

/* ---- 4 · one cause under two gates ---- */
{
  await add(4);
  ok((await roleOf(4)) === 'OR gate' && (await page.locator('section.ft-node').count()) === 6, '4 a cause added under the detector’s: it becomes a gate');
  await nameOf(5).fill('Maintenance leaves the detector off'); await settle();
  await cardOf(5).getByLabel('The same cause as').selectOption({ label: 'Maintenance leaves a part in the line' }); await settle();
  ok((await cardOf(5).getByLabel('Probability').count()) === 0, '4 marked the same cause: it takes the first’s probability and asks for none');
  const t = await truth(made);
  ok(/one event alone does it: Maintenance leaves a part in the line/.test(t.sentence) && t.verdict === '1 single point' && (await words('.ie-says')) === t.sentence, `4 counted once: a single point — "${t.verdict}"`);
  ok(/The probability of the top event is 1% /.test(t.sentence) || /top event is 1%/.test(t.sentence), '4 P(top) = P(that cause) = 1%, not the 0.0298 × … it would be counted twice');
}

/* ---- 5 · a probability left out, then money ---- */
{
  await cardOf(3).getByLabel('Probability').fill(''); await settle();
  ok(/Probabilities are missing for Maintenance leaves a part in the line — the cut sets stand, the probability waits\./.test((await words('.ie-says')) ?? '') && /^Top event\s+—/i.test((await all('.ln-tiles .ln-tile')).find(x => /^top event/i.test(x)) ?? ''), '5 a probability missing: named, the cut sets stand, the top event tile is a dash');
  await cardOf(3).getByLabel('Probability').fill('0.01'); await settle();
  await page.locator('.cp-prices summary').click();
  await page.getByLabel('The period every probability is for').fill('a year');
  await page.getByLabel('What one occurrence of the top event costs').fill('250000'); await settle();
  ok(/At £250,000 an event, 1% a year is an expected £2,500 a year \(probability × cost\)/.test((await all('.ie-money')).join(' ')), '5 the period and the cost typed: 1% × £250,000 = £2,500 a year');
}

/* ---- 6 · Undo ---- */
{
  const n = await page.locator('section.ft-node').count();
  await page.getByRole('button', { name: /^Take off or gate 2$|Take off or gate 2/i }).click().catch(async () => { await cardOf(1).getByRole('button', { name: /Take off/ }).click(); });
  await settle();
  ok((await page.locator('section.ft-node').count()) === n - 3 && /and the 2 below it taken off/.test((await all('[role=status]')).join(' ')), '6 a row taken off with the causes below it, said');
  await page.getByRole('button', { name: 'Undo' }).click(); await settle();
  ok((await page.locator('section.ft-node').count()) === n && (await nameOf(1).inputValue()) === 'Metal gets into the product', '6 Undo brings the whole branch back');
}

/* ---- 7 · on paper ---- */
{
  await go(`#/scored/fault-tree/${worked}`);
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, 'fault.pdf'); await d.saveAs(f); if (process.env.KEEP_PDF) console.log(f);
  const text = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
  const t = await truth(worked);
  ok(text.includes(t.sentence.slice(0, 80)) && /Fault tree/.test(text) && /Top 0\.12%/.test(text), '7 the paper carries the band and the sentence');
  ok(/The tree/.test(text) && /TOP EVENT: Metal reaches a consumer in a pack/.test(text) && /· OR gate: Metal gets into the product/.test(text) && /· · Event: Screen mesh breaks — 2%/.test(text) && /· · AND gate: Detector sensitivity drifts and is not caught/.test(text) && /· · · Event: Sensitivity drifts — 10%/.test(text), '7 the tree as an outline, each row under its gate with its probability');
  ok(/Minimal cut set/.test(text) && /Screen mesh breaks AND Detector bypassed during a fault/.test(text) && /0\.04%/.test(text), '7 the cut sets as a table with their probabilities');
  ok(/Which events matter most/.test(text) && /Screen mesh breaks — 58% of the top event/.test(text) && /Give what one occurrence of the top event costs/.test(text), '7 the weakest links and the cost named missing');
  ok(/What this does not say/i.test(text) && /independent/.test(text) && /IEC 61025/.test(text), '7 what it does not say');
}

/* ---- 8 · kept, the list row, a client, the phone ---- */
{
  await go(`#/scored/fault-tree/${made}`);
  ok((await page.locator('section.ft-node').count()) === 6 && (await nameOf(0).inputValue()) === 'Metal reaches a consumer in a pack', '8 kept after a reload');
  await go('#/scored/fault-tree');
  const row = flat(await page.locator(`.lt-li[data-study="${worked}"]`).innerText());
  ok(/Top 0\.12%/.test(row) && /9 minimal cut sets/.test(row), '8 the list’s row says the verdict and the count', row);
  const cid = await savedStudy('A client reads', 'fault-tree', example.rows, { period: 'a year' }, { projectId: sd.projectId });
  await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
  await go(`#/scored/fault-tree/${cid}`);
  const ro = await page.evaluate(() => ({ editable: [...document.querySelectorAll('.fm input, .fm select, .fm textarea')].filter(e => !e.disabled).length, adds: [...document.querySelectorAll('.fm button')].length, says: document.querySelector('.ie-says')?.textContent ?? '' }));
  ok(ro.editable === 0 && ro.adds === 0 && ro.says.startsWith('Metal reaches a consumer'), `8 a client sees the tree and the answer and changes nothing (${JSON.stringify({ ...ro, says: ro.says.slice(0, 20) })})`);
  await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/scored/fault-tree/${worked}`);
  ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '8 the phone: nothing off the side');
  const small = await page.evaluate(() => [...document.querySelectorAll('.ft-node input:not([type=checkbox]), .ft-node select, .ft-node button')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).map(e => `${e.tagName} ${e.getAttribute('aria-label') ?? ''}`));
  ok(small.length === 0, '8 the phone: every box, pick and button in a row a thumb’s size', small.slice(0, 4).join(' | '));
  ok((await page.evaluate(() => [...document.querySelectorAll('.ft-node')].every(g => g.getBoundingClientRect().right <= 392))), '8 the phone: each row fits the screen');
}

await browser.close();
ok(!errors.length, errors.join('; ') || 'No console errors');
process.exit(failed ? 1 : 0);
