/* FC-132 — THE PROCESS FMEA, driven (knowledge/specs/FC-132-fmea.md, acceptance criteria 1–8; 1 November 2026): a register of cards on the scored shape —
 * a failure mode a card, rated for severity, occurrence and detection against anchors, its action priority read by Faultline's own severity-first rule
 * (NOT the AIAG-VDA table, which is not reproduced), an action with who and by when, a reason when there is none, the re-rating once it is done.
 * The page is held to the module (src/tools/fmea/fmea.ts) and to the second implementation's literals (scripts/knowledge/cases-m6-analysis.py).
 *
 *   1  the hub and the list: Process FMEA as a card, "New FMEA" the one primary, New on a method page (?add=1) opening the sheet
 *   2  the worked register (seven failure modes) opened — the band, tiles, sentence, closing line equal the module's and the literals; a card each, the
 *      priority a word never a colour; the register ranked High first; the rule and the scales on the page
 *   3  a register made through New FMEA, a card typed through the real boxes and picked — the priority and the sentence follow each pick
 *   4  an action with who and by when; a reason; an action past its day (red, said); done and re-rated (the priority comes down); a priority set by hand
 *      from the handbook (marked); a cost beside the priority
 *   5  a card taken off and brought back with Undo; a half-rated card not ranked and said
 *   6  the paper, read back: the register as a table, the rule, what it does not say, the limits
 *   7  kept after a reload; a client sees it and changes nothing; the phone — nothing off the side, controls a thumb's size
 *
 * Fails on any console error.   node scripts/acceptance/fmea.mjs      (SMOKE_BASE, as smoke) */
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
const apOf = async i => cardOf(i).locator('.fm-ap').getAttribute('data-ap');

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const lineId = sd.lineId ?? sd.wsId;

/** A saved register, made the way the New sheet makes it, with the given cards. */
const saved = (name, rows, extra = {}) => page.evaluate(async ([name, rows, lineId, extra]) => {
  const { putStudy } = await import('/src/db.ts'); const { SCORED } = await import('/src/tools/scored/registry.ts'); const { newScoredStudy } = await import('/src/tools/scored/scored.ts');
  const s = newScoredStudy(SCORED.find(d => d.key === 'fmea'), { name, workspaceId: lineId, now: Date.now(), ...extra }); s.agreed.scored.rows = rows; await putStudy(s); return s.id;
}, [name, rows, lineId, extra]);
const truth = id => page.evaluate(async sid => {
  const { getStudy } = await import('/src/db.ts'); const { studyScored } = await import('/src/tools/scored/scored.ts');
  const s = await getStudy(sid); const x = studyScored(s); return { sentence: x?.result?.sentence, verdict: x?.result?.verdict, closing: x?.result?.closing, tiles: x?.result?.tiles.map(t => [t.k, t.v]), order: x?.ranked?.ok.map(r => r.name), classes: x?.ranked?.ok.map(r => r.class), money: x?.result?.money, problems: x?.problems };
}, id);
const example = await page.evaluate(async () => (await import('/src/tools/scored/registry.ts')).SCORED.find(d => d.key === 'fmea').examples[0]);

/* ---- 1 · the hub and the list ---- */
{
  await go('#/scored');
  ok((await all('.pl-tool-card')).some(c => /^Process FMEA/.test(c)), '1 Process FMEA is a card on the Scored registers hub');
  await go('#/scored/fmea');
  ok(/^Process FMEA$/.test((await words('.part-head .pace-title')) ?? '') && /^New FMEA$/.test((await words('.pace-head-actions .btn-primary')) ?? ''), '1 the list: Process FMEA, New FMEA the one primary');
  ok(/No process FMEA yet/.test((await words('.qsl-empty')) ?? ''), '1 the empty list says what to do');
  await go(`#/scored/fmea?project=${sd.projectId}&add=1`);
  ok((await page.locator('.lt-new').count()) === 1, '1 New on a method page (?add=1) opens the sheet at once, in the project');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {});
}

/* ---- 2 · the worked register ---- */
let worked;
{
  worked = await saved('Line 2 wrapper — October review', example.rows);
  const t = await truth(worked);
  ok(JSON.stringify(t.order) === JSON.stringify(example.expect.order) && JSON.stringify(t.classes) === JSON.stringify(['H', 'M', 'M', 'M', 'M', 'L', 'L']) && t.verdict === '1 High', `2 the module ranks the seven: ${t.order.join(' > ')} — ${t.verdict}`);
  await go(`#/scored/fmea/${worked}`);
  ok((await words('.ie-says')) === t.sentence && t.sentence === '7 failure modes rated: 1 High, 4 Medium, 2 Low. High first: Wrong date code (S 7 · O 5 · D 7) — no action yet. 5 High or Medium modes still have neither an action nor a written reason.', `2 the sentence, as the rule and the second implementation say it: "${(await words('.ie-says'))?.slice(0, 150)}…"`);
  const tiles = await all('.ln-tiles .ln-tile');
  ok(t.tiles.every(([k, v], i) => tiles[i]?.toLowerCase().includes(k.toLowerCase()) && tiles[i]?.includes(v)) && tiles.length === 5, `2 five tiles as the module says: ${tiles.join(' | ')}`);
  ok(((await words('.ln-close')) ?? '').includes(t.closing) && /^1 High — 7 failure modes rated, 5 still to act on\.$/.test(t.closing), `2 the closing line: ${t.closing}`);
  ok((await page.locator('section.fm-card').count()) === 7, '2 a card each — seven');
  const aps = await page.locator('section.fm-card').evaluateAll(cs => cs.map(c => [c.querySelector('input[aria-label^="Failure mode"]').value, c.querySelector('.fm-ap').dataset.ap, c.querySelector('.fm-ap').textContent]));
  const want = { 'Seal does not hold': 'M', 'Wrong film reel loaded': 'M', 'Print smudged': 'L', 'Metal detector misses a test piece': 'M', 'Wrong date code': 'H', 'Underweight pack': 'L', 'Film splice not seen': 'M' };
  ok(aps.every(([n, ap, word]) => ap === want[n] && word === { H: 'High', M: 'Medium', L: 'Low' }[ap]), `2 each card carries its priority as a word: ${aps.map(([n, ap]) => `${n.split(' ').slice(0, 2).join(' ')} ${ap}`).join(' · ')}`);
  const hue = await page.locator('.fm-ap.is-H').evaluate(e => getComputedStyle(e).backgroundColor + '|' + getComputedStyle(e).color);
  ok(!/rgb\(196, 40, 28\)|rgb\(180, 83, 9\)|rgb\(21, 128, 61\)/.test(hue), `2 a priority wears no state hue (${hue})`);
  ok((await page.locator('.ln-panel', { hasText: 'How the priority is decided' }).count()) >= 1 && /not the handbook’s table/.test((await all('.ie-caveats, .ln-panel')).join(' ')), '2 the rule is on the page, and it says it is not the handbook’s table');
  await page.locator('.fm-scales summary').click();
  ok((await page.locator('.fm-scales li').count()) === 30, '2 the three scales, ten anchors each');
  ok(/Wrong date code.*—.*S ≥ 8|belong on the control plan/.test((await all('.ie-caveats li')).join(' ')), '2 the rows of severity 8 or more are said to belong on the control plan');
}

/* ---- 3 · a register made through New FMEA, one card typed and picked ---- */
let made;
{
  await go('#/scored/fmea');
  await page.getByRole('button', { name: 'New FMEA' }).first().click(); await page.waitForTimeout(500);
  await page.getByLabel('What is the process or line step this covers?').fill('Line 2 sealer — new film');
  await page.locator('.lt-new select').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Start' }).click(); await page.waitForTimeout(1500);
  made = decodeURIComponent(page.url().split('/scored/fmea/')[1]?.split('?')[0] ?? '');
  ok(made.length > 8 && (await page.locator('section.fm-card').count()) === 1, '3 New FMEA opens a register with one blank card');
  ok(/Rate at least one failure mode/.test((await words('[role=alert]')) ?? '') && (await apOf(0)) === '', '3 nothing rated: the page says what to rate, the card says Not rated');
  const c = cardOf(0);
  await c.getByLabel('Failure mode 1', { exact: true }).fill('Seal does not hold');
  await c.getByLabel('Process step').fill('Sealing');
  await c.getByLabel('Effect — what the customer or the next step gets').fill('Leaker reaches the customer');
  await c.getByLabel('Cause — why it would happen').fill('Jaw temperature drift');
  await c.getByLabel('Prevention now — what stops the cause').fill('Set-point check each start');
  await c.getByLabel('Detection now — what would catch it').fill('Seal pull every 30 min');
  await c.getByLabel('Severity of the effect').selectOption('9');
  ok((await apOf(0)) === '', '3 one rating picked: still not rated');
  await c.getByLabel('Occurrence of the cause').selectOption('3');
  await c.getByLabel('Detection by the control now').selectOption('4'); await settle();
  ok((await apOf(0)) === 'M' && /a critical effect \(severity 9–10\) with strong controls \(occurrence 3, detection 4\) → Medium/.test((await words('.fm-why')) ?? ''), `3 S9 · O3 · D4 → Medium, and why: "${await words('.fm-why')}"`);
  ok(/Seal strength|^Seal does not hold$/.test(await c.getByLabel('Failure mode 1', { exact: true }).inputValue()) && /Jaw temperature drift/.test(await c.getByLabel('Cause — why it would happen').inputValue()), '3 the words are kept in the card');
  await c.getByLabel('Occurrence of the cause').selectOption('8'); await settle();
  ok((await apOf(0)) === 'H' && /Seal does not hold \(S 9 · O 8 · D 4\) — no action yet/.test((await words('.ie-says')) ?? ''), `3 occurrence 8 makes the controls weak whatever the detection: High — "${(await words('.ie-says'))?.slice(0, 130)}"`);
  const t = await truth(made); ok((await words('.ie-says')) === t.sentence, '3 the page’s sentence is the module’s');
}

/* ---- 4 · an action, a reason, late, done and re-rated, by hand, a cost ---- */
{
  const c = cardOf(0);
  await c.locator('summary', { hasText: 'Action, and the priority from a handbook' }).click();
  await c.getByLabel('Action — what will be done').fill('Fit a jaw thermocouple alarm');
  await c.getByLabel('Who', { exact: true }).fill('Dave');
  await c.getByLabel('By when').fill('2026-12-20'); await settle();
  ok(/Seal does not hold \(S 9 · O 8 · D 4\): Fit a jaw thermocouple alarm, Dave by 20 Dec\./.test((await words('.ie-says')) ?? '') && (await page.locator('.ie-says.is-r, .ln-band .is-r').count()) === 0, `4 an action with who and by when answers the High mode: "${(await words('.ie-says'))?.slice(0, 160)}"`);
  ok(/^need an action 0\b/i.test((await all('.ln-tiles .ln-tile')).find(x => /^need an action/i.test(x)) ?? ''), '4 nothing still needs an action');
  await c.getByLabel('By when').fill('2026-10-01'); await settle();
  ok(/1 action is late\./.test((await words('.ie-says')) ?? '') && /This action was due 1 Oct and is not done/.test((await words('section.fm-card .ie-warn')) ?? '') && /late\.$/.test((await words('.ln-close')) ?? ''), `4 an action past its day is late, said on the card, the sentence and the closing line`);
  ok((await page.locator('.ln-band.is-r, .ln-band [class*="is-r"], .ln-close.is-r').count()) >= 1, '4 and it is red — the one red on the page');
  await c.getByLabel('Done on', { exact: false }).fill('2026-10-05'); await settle();
  ok(!/late/.test((await words('.ln-close')) ?? ''), '4 done: no longer late');
  await c.getByLabel('Occurrence after').selectOption('2');
  await c.getByLabel('Detection after').selectOption('2'); await settle();
  ok(/Now Low, down from High|Now Medium, down from High/.test((await words('.fm-after')) ?? ''), `4 re-rated after the action: "${(await words('.fm-after'))?.slice(0, 160)}"`);
  await c.getByLabel('Priority from the handbook').selectOption('M'); await settle();
  ok((await apOf(0)) === 'M' && /from the handbook/.test((await c.locator('.fm-ap').innerText())) && /The rule says High/.test((await words('.fm-why')) ?? ''), `4 a priority set by hand is marked, and the rule’s is still said: "${(await words('.fm-why'))?.slice(0, 120)}"`);
  await c.getByLabel('Priority from the handbook').selectOption(''); await settle();
  await c.getByLabel('One occurrence costs').fill('420'); await settle();
  ok(/Where a cost is known, one occurrence costs: Seal does not hold £420 — said beside the priority, never used to rank it\./.test((await all('.ie-money')).join(' ')) || /£420/.test((await words('.ie-says.ie-money')) ?? ''), '4 a cost typed is said beside the priority (£420), never in the ranking');
}

/* ---- 5 · Undo, and a half-rated card ---- */
{
  await page.getByRole('button', { name: '+ Add a failure mode' }).click(); await settle();
  const c1 = cardOf(1);
  await c1.getByLabel('Failure mode 2', { exact: true }).fill('Wrong reel loaded');
  await c1.getByLabel('Severity of the effect').selectOption('8'); await settle();
  ok((await apOf(1)) === '' && /1 failure mode rated: .*; 1 not rated yet\./.test((await words('.ie-says')) ?? ''), '5 a half-rated card is not ranked, and the sentence says one is not rated yet');
  await c1.getByLabel('Occurrence of the cause').selectOption('2'); await c1.getByLabel('Detection by the control now').selectOption('9'); await settle();
  ok((await apOf(1)) === 'M', '5 S8 · O2 · D9 → Medium (the reel)');
  await page.getByRole('button', { name: 'Take off failure mode 2' }).click(); await settle();
  ok((await page.locator('section.fm-card').count()) === 1 && /Wrong reel loaded taken off\./.test((await words('[role=status]')) ?? ''), '5 a card taken off, said');
  await page.getByRole('button', { name: 'Undo' }).click(); await settle();
  ok((await page.locator('section.fm-card').count()) === 2 && (await cardOf(1).getByLabel('Failure mode 2', { exact: true }).inputValue()) === 'Wrong reel loaded', '5 Undo brings it back whole');
  await page.getByRole('button', { name: 'Take off failure mode 2' }).click(); await settle();
}

/* ---- 6 · on paper ---- */
{
  await go(`#/scored/fmea/${worked}`);
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, 'fmea.pdf'); await d.saveAs(f);
  const text = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
  const t = await truth(worked);
  ok(text.includes(t.sentence.slice(0, 80)) && /Process FMEA/.test(text) && /1 High/.test(text), '6 the paper carries the band and the sentence');
  ok(/Wrong date code/.test(text) && /Metal detector misses a test piece/.test(text) && /Print smudged/.test(text) && /Step · failure mode/.test(text) && /Priority/.test(text), '6 the register as a table, every failure mode');
  ok(text.indexOf('Wrong date code') < text.indexOf('Print smudged'), '6 ranked High first on paper too');
  ok(/How the priority is decided/i.test(text) && /not the handbook’s table, which is not reproduced/.test(text) && /The product of the three ratings \(the older RPN\) is not used/.test(text), '6 the rule, and what it is not');
  ok(/What this does not say/i.test(text) && /HACCP/.test(text) && /Give what one occurrence costs on the High mode/.test(text), '6 what it does not say, the HACCP pointer and the cost named missing');
}

/* ---- 7 · kept, a client, the phone ---- */
{
  await go(`#/scored/fmea/${made}`);
  ok((await page.locator('section.fm-card').count()) === 1 && (await apOf(0)) === 'H' || (await apOf(0)) === 'M', '7 kept after a reload');
  await go('#/scored/fmea');
  const row = flat(await page.locator(`.lt-li[data-study="${worked}"]`).innerText());
  ok(/1 High/.test(row) && /7 failure modes rated/.test(row), '7 the list’s row says the verdict and the count', row);
  const cid = await saved('A client reads', example.rows, { projectId: sd.projectId });
  await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
  await go(`#/scored/fmea/${cid}`);
  const ro = await page.evaluate(() => ({ editable: [...document.querySelectorAll('.fm input, .fm select, .fm textarea')].filter(e => !e.disabled).length, adds: [...document.querySelectorAll('.fm button')].length, says: document.querySelector('.ie-says')?.textContent ?? '' }));
  ok(ro.editable === 0 && ro.adds === 0 && ro.says.startsWith('7 failure modes rated'), `7 a client sees the register and the answer and changes nothing (${JSON.stringify({ ...ro, says: ro.says.slice(0, 24) })})`);
  await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/scored/fmea/${worked}`);
  ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '7 the phone: nothing off the side');
  const small = await page.evaluate(() => [...document.querySelectorAll('.fm-card input:not([type=checkbox]), .fm-card select, .fm-card button')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).map(e => `${e.tagName} ${e.getAttribute('aria-label') ?? e.textContent?.slice(0, 20)} ${Math.round(e.getBoundingClientRect().height)}px`));
  ok(small.length === 0, '7 the phone: every box, pick and button in a card a thumb’s size', small.slice(0, 4).join(' | '));
  ok((await page.evaluate(() => [...document.querySelectorAll('.fm-grid')].every(g => g.getBoundingClientRect().right <= 392))), '7 the phone: each card is one column wide');
}

await browser.close();
ok(!errors.length, errors.join('; ') || 'No console errors');
process.exit(failed ? 1 : 0);
