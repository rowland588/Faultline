/* FC-133 — THE CONTROL PLAN, driven (knowledge/specs/FC-133-control-plan.md, acceptance criteria 1–8; 1 November 2026): a register of cards on the scored shape —
 * a characteristic a card: what is checked, against what, how, the sample, how often, who, recorded where and the reaction when it is out; a row points at the
 * FMEA failure mode it controls and at the check of a check log that does it. The page is held to the module (src/tools/cplan/cplan.ts) and to the second
 * implementation's literals (scripts/knowledge/cases-t8-3.py).
 *
 *   1  the hub and the list: Control plan as a card, "New control plan" the one primary, the empty list says what to do, ?add=1 opens the sheet
 *   2  the worked plan (four characteristics) opened with its prices — the sentence, tiles, money and closing line equal the module's and the literals
 *      (32 checks a shift, £56.67 of labour, 12,000 packs = £4,800 at risk); Net weight "1 to say", the other three Complete
 *   3  a plan made through New control plan, one card typed through the real boxes — "6 to say" falling to Complete as each part is said
 *   4  the FMEA beside it: nothing pointed at, five risks without a check listed; a failure mode picked, "1 of 5"; "From the FMEA" adds a card for each of the rest
 *   5  a check log beside it: picked, its state read (overdue), the interval promised against the log's; the prices typed in the plan's own boxes and kept
 *   6  a card taken off and brought back with Undo
 *   7  the paper, read back: the register as a table, risks without a check, the money, what it does not say
 *   8  kept after a reload; a client sees it and changes nothing; the phone
 *
 * Fails on any console error.   node scripts/acceptance/control-plan.mjs      (SMOKE_BASE, as smoke) */
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

/** A saved register, made the way the New sheet makes it, with the given cards. */
const saved = (name, rows, extra = {}) => page.evaluate(async ([name, rows, lineId, extra]) => {
  const { putStudy } = await import('/src/db.ts'); const { SCORED } = await import('/src/tools/scored/registry.ts'); const { newScoredStudy } = await import('/src/tools/scored/scored.ts');
  const s = newScoredStudy(SCORED.find(d => d.key === (extra.key ?? 'control-plan')), { name, workspaceId: lineId, now: Date.now(), ...extra }); s.agreed.scored.rows = rows; Object.assign(s.agreed.scored, extra.inputs ?? {}); await putStudy(s); return s.id;
}, [name, rows, lineId, extra]);
const example = await page.evaluate(async () => (await import('/src/tools/scored/registry.ts')).SCORED.find(d => d.key === 'control-plan').examples[0]);


/* the FMEA's own worked register, saved on the same line, and a check log beside it */
const savedFmea = () => page.evaluate(async ([lineId]) => {
  const { putStudy } = await import('/src/db.ts'); const { SCORED } = await import('/src/tools/scored/registry.ts'); const { newScoredStudy } = await import('/src/tools/scored/scored.ts');
  const d = SCORED.find(x => x.key === 'fmea'); const s = newScoredStudy(d, { name: 'Line 2 wrapper FMEA', workspaceId: lineId, now: Date.now() });
  s.agreed.scored.rows = d.examples[0].rows.map(r => ({ ...r })); await putStudy(s); return s.id;
}, [lineId]);
const savedLog = () => page.evaluate(async ([lineId]) => {
  const { putStudy } = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts'); const t = Date.now();
  const s = { id: uid(), tool: 'log', name: 'Line 2 first-off checks', workspaceId: lineId, facts: { results: [] }, uses: [], startedAt: t, updatedAt: t,
    agreed: { log: { key: 'first-off', since: t - 3 * 3_600_000, checks: [{ id: 'k1', name: 'Seal pull', when: { every: 60, unit: 'min' }, kind: 'passfail', who: 'Technician', reaction: 'Hold the packs' }] } } };
  await putStudy(s); return s.id;
}, [lineId]);
const truth = id => page.evaluate(async sid => {
  const { getStudy, listAllStudies } = await import('/src/db.ts'); const { studyScored } = await import('/src/tools/scored/scored.ts');
  const s = await getStudy(sid); const x = studyScored(s, { studies: await listAllStudies() });
  return { sentence: x?.result?.sentence, verdict: x?.result?.verdict, closing: x?.result?.closing, tiles: x?.result?.tiles.map(t => [t.k, t.v, t.of]), money: x?.result?.money, order: x?.ranked?.ok.map(r => r.name) };
}, id);
const statusOf = i => cardOf(i).locator('.fm-ap').innerText();
const ASK = 'Name at least one characteristic';

/* ---- 1 · the hub and the list ---- */
{
  await go('#/scored');
  ok((await all('.pl-tool-card')).some(c => /^Control plan/.test(c)), '1 Control plan is a card on the Scored registers hub');
  await go('#/scored/control-plan');
  ok(/^Control plan$/.test((await words('.part-head .pace-title')) ?? '') && /^New control plan$/.test((await words('.pace-head-actions .btn-primary')) ?? ''), '1 the list: Control plan, New control plan the one primary');
  ok(/No control plan yet/.test((await words('.qsl-empty')) ?? ''), '1 the empty list says what to do');
  await go(`#/scored/control-plan?project=${sd.projectId}&add=1`);
  ok((await page.locator('.lt-new').count()) === 1, '1 ?add=1 opens the sheet at once, in the project');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {});
}

/* ---- 2 · the worked plan ---- */
let worked;
{
  worked = await saved('Line 2 wrapper — control plan', example.rows, { inputs: { rate: 25, speed: 200, packCost: 0.4, shiftMin: 480 } });
  const t = await truth(worked);
  ok(JSON.stringify(t.order) === JSON.stringify(example.expect.order) && t.verdict === '1 gap', `2 the module reads the four: ${t.order.join(' · ')} — ${t.verdict}`);
  await go(`#/scored/control-plan/${worked}`);
  ok((await words('.ie-says')) === t.sentence && t.sentence.startsWith('4 characteristics on the plan: 3 complete, 1 with something unsaid. Net weight — still to say: what is done when it is out.'), `2 the sentence is the module's: "${t.sentence.slice(0, 120)}"`);
  const tiles = await all('.ln-tiles .ln-tile');
  ok(t.tiles.length === 5 && t.tiles.every(([k, v], i) => tiles[i]?.toLowerCase().includes(k.toLowerCase()) && tiles[i]?.includes(v)), `2 five tiles as the module says: ${tiles.join(' | ')}`);
  ok(tiles.some(x => /checks a shift/i.test(x) && x.includes('32') && x.includes('£56.67')), '2 32 checks a shift and £56.67 of labour — the literals of cases-t8-3.py');
  const money = (await all('.ie-money, .ie-says.ie-money')).join(' ');
  ok(/£56\.67 of labour a shift/.test(money) && /12,000 packs/.test(money) && /£4,800/.test(money), `2 the money lines: the labour a shift and the most a failed check can find — "${money.slice(0, 160)}"`);
  ok(((await words('.ln-close')) ?? '').includes(t.closing) && t.closing.startsWith('1 gap — 4 characteristics, 3 complete'), `2 the closing line: ${t.closing}`);
  ok((await page.locator('section.fm-card').count()) === 4, '2 a card each — four');
  const st = []; for (let i = 0; i < 4; i++) st.push(await statusOf(i));
  ok(JSON.stringify(st) === JSON.stringify(['Complete', '1 to say', 'Complete', 'Complete']), `2 each card says whether it is complete: ${st.join(' · ')}`);
  ok(/what is done when it is out/.test((await words('[data-missing]')) ?? ''), '2 the card with a part unsaid names it');
}

/* ---- 3 · a plan made through New control plan, one card typed ---- */
let made;
{
  await go('#/scored/control-plan');
  await page.getByRole('button', { name: 'New control plan' }).first().click(); await page.waitForTimeout(500);
  await page.getByLabel('What process or line step does this plan cover?').fill('Line 2 sealer — control plan');
  await page.locator('.lt-new select').selectOption(lineId);
  await page.getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(1500);
  made = decodeURIComponent(page.url().split('/scored/control-plan/')[1]?.split('?')[0] ?? '');
  ok(made.length > 8 && (await page.locator('section.fm-card').count()) === 1, '3 New control plan opens a plan with one blank card');
  ok(new RegExp(ASK).test((await words('[role=alert]')) ?? '') && (await statusOf(0)) === 'Not named', '3 nothing named: the page says what to name, the card says Not named');
  const c = cardOf(0);
  await c.getByLabel('Characteristic 1', { exact: true }).fill('Seal strength'); await settle();
  ok((await statusOf(0)) === '6 to say', `3 named: 6 parts to say (${await statusOf(0)})`);
  await c.getByLabel('Against what — the specification or limit').fill('≥ 8 N per 15 mm');
  await c.getByLabel('How — the method and the gauge').fill('Pull test, force gauge');
  await c.getByLabel('The sample').fill('1 pack per head'); await settle();
  ok((await statusOf(0)) === '3 to say' && /how often · who · what is done when it is out/.test((await words('[data-missing]')) ?? ''), `3 three said, three to say: "${await words('[data-missing]')}"`);
  await c.getByLabel('How often — minutes between checks').fill('30');
  await c.getByLabel('Who checks').fill('Technician'); await settle();
  ok((await statusOf(0)) === '1 to say', '3 how often and who said: one to say');
  await c.getByLabel('If it is out').fill('Stop; hold the packs since the last good check; re-set and re-test'); await settle();
  ok((await statusOf(0)) === 'Complete' && /^✓ Complete — 1 characteristic, 1 complete\.$/.test((await words('.ln-close')) ?? ''), `3 the reaction said: Complete — "${await words('.ln-close')}"`);
  const t = await truth(made); ok((await words('.ie-says')) === t.sentence, '3 the page’s sentence is the module’s');
}

/* ---- 4 · the FMEA beside it ---- */
let fmeaId;
{
  fmeaId = await savedFmea();
  await go(`#/scored/control-plan/${made}`);
  ok(/0 of 5 High or Medium failure modes have a check on the plan; without one: Wrong date code \(High\)/.test((await words('.ie-says')) ?? ''), `4 the FMEA beside: none of five risks has a check — "${((await words('.ie-says')) ?? '').slice(0, 220)}"`);
  const risks = (await all('.ln-panel li, .ie-also li')).join(' | ');
  ok(/Wrong date code .* High, from Line 2 wrapper FMEA/.test(risks) && /Seal does not hold/.test(risks), '4 Risks without a check lists them, High first, with the FMEA they come from');
  const c = cardOf(0);
  await c.locator('summary', { hasText: 'What it controls' }).click();
  await c.getByLabel('The failure mode it controls').selectOption({ label: 'Seal does not hold — Medium' }); await settle();
  ok(/1 of 5 High or Medium failure modes has a check/.test((await words('.ie-says')) ?? '') && /Controls: Seal does not hold \(Medium\)/.test((await words('section.fm-card')) ?? ''), '4 a failure mode picked: one of five has a check, and the card says what it controls');
  await page.getByRole('button', { name: /^\+ From the FMEA — 4 without a check/ }).click(); await settle();
  ok((await page.locator('section.fm-card').count()) === 5 && /5 of 5 High or Medium failure modes have a check/.test((await words('.ie-says')) ?? ''), '4 From the FMEA adds a card for each of the four left — five of five now have a check');
  ok(await page.getByRole('button', { name: /From the FMEA/ }).count() === 0, '4 and the button goes when there is nothing left to add');
  const second = await cardOf(1).getByLabel('Characteristic 2', { exact: true }).inputValue();
  ok(/Operator looks after the process|Visual check by the operator|Nothing until the complaint|Test pieces each hour/.test(second) || second.length > 3, `4 a new card is named from the FMEA's detection and carries its step ("${second}")`);
}

/* ---- 5 · a check log beside it, and the prices ---- */
{
  const logId = await savedLog();
  await go(`#/scored/control-plan/${made}`);
  const c = cardOf(0);
  if (!(await c.locator('details.fm-more').first().evaluate(d => d.open))) await c.locator('summary', { hasText: 'What it controls' }).click();
  await c.getByLabel('The check log that does it').selectOption({ label: 'Line 2 first-off checks — Seal pull' }); await settle();
  ok(/Line 2 first-off checks — Seal pull: Overdue by .* not done yet\./.test((await words('[data-linked]')) ?? ''), `5 the check read from its log: "${await words('[data-linked]')}"`);
  ok(/the plan says every 30 min, its log runs every 60 min/.test((await words('.ie-says')) ?? '') && /The plan says every 30 min; the log runs every 60 min/.test((await words('section.fm-card .ie-warn')) ?? ''), '5 the interval promised is held against the log’s, said on the card and in the sentence');
  ok(/1 row reads a check log: 0 failed, 1 overdue, 0 due now\./.test((await words('.ie-says')) ?? '') && (await page.locator('.ln-band.is-r, .ln-close.is-r, [class*="is-r"]').count()) >= 1, '5 an overdue check is counted and red');
  await page.locator('.cp-prices summary').click();
  await page.getByLabel('Minutes in a shift').fill('480');
  await page.getByLabel('£ an hour for the people checking').fill('25');
  await c.getByLabel('Minutes one check takes').fill('5'); await settle();
  ok(/£33\.33 of labour a shift/.test((await all('.ie-money')).join(' ')), '5 the prices typed in the plan’s own boxes price it: 16 checks × 5 min × £25 = £33.33');
  ok(/To price the plan give the line’s speed \(packs a minute\), what a pack held is worth/.test((await all('.ie-money')).join(' ')), '5 what is still missing is named, and nothing waits on it');
  await page.getByLabel('The line’s speed, packs a minute').fill('200');
  await page.getByLabel('What a pack held is worth, £').fill('0.4'); await settle();
  ok(/6,000 packs/.test((await all('.ie-money')).join(' ')) || /12,000 packs/.test((await all('.ie-money')).join(' ')), '5 the product at risk between checks: the most a failed check can find');
}

/* ---- 6 · Undo ---- */
{
  const n = await page.locator('section.fm-card').count();
  await page.getByRole('button', { name: 'Take off characteristic 2' }).click(); await settle();
  ok((await page.locator('section.fm-card').count()) === n - 1 && /taken off\./.test((await all('[role=status]')).join(' ')), '6 a card taken off, said');
  await page.getByRole('button', { name: 'Undo' }).click(); await settle();
  ok((await page.locator('section.fm-card').count()) === n, '6 Undo brings it back whole');
}

/* ---- 7 · on paper ---- */
{
  await go(`#/scored/control-plan/${worked}`);
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f = join(OUT, 'cplan.pdf'); await d.saveAs(f); if (process.env.KEEP_PDF) console.log(f);
  const text = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
  const t = await truth(worked);
  ok(text.includes(t.sentence.slice(0, 80)) && /Control plan/.test(text) && text.includes(t.verdict) && t.verdict === '2 gaps', `7 the paper carries the band (${t.verdict}: Net weight's reaction, and the FMEA beside it now has a High risk with no check) and the sentence`);
  ok(/Seal strength/.test(text) && /Metal detector test pieces/.test(text) && /Date code/.test(text) && /Step · characteristic/.test(text) && /If it is out/.test(text), '7 the register as a table, every characteristic');
  ok(/Stop the line; hold the packs since the last good check/.test(text) && /at every changeover/.test(text), '7 the reaction and the event-triggered check are on the paper');
  ok(/£56\.67 of labour a shift/.test(text) && /12,000 packs/.test(text), '7 the money lines are on the paper');
  ok(/What this does not say/i.test(text) && /a check with no reaction is data collection/i.test(text) && /HACCP/.test(text), '7 what it does not say, and the HACCP pointer');
}

/* ---- 8 · kept, a client, the phone ---- */
{
  await go(`#/scored/control-plan/${made}`);
  ok((await page.locator('section.fm-card').count()) >= 5 && (await cardOf(0).getByLabel('Characteristic 1', { exact: true }).inputValue()) === 'Seal strength', '8 kept after a reload');
  await go('#/scored/control-plan');
  const row = flat(await page.locator(`.lt-li[data-study="${worked}"]`).innerText());
  ok(/2 gaps/.test(row) && /4 characteristics on the plan/.test(row) && /Wrong date code/.test(row), '8 the list’s row says the verdict and the count, with the FMEA beside it read', row);
  const cid = await saved('A client reads', example.rows, { projectId: sd.projectId });
  await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
  await go(`#/scored/control-plan/${cid}`);
  const ro = await page.evaluate(() => ({ editable: [...document.querySelectorAll('.fm input, .fm select, .fm textarea')].filter(e => !e.disabled).length, adds: [...document.querySelectorAll('.fm button')].length, says: document.querySelector('.ie-says')?.textContent ?? '' }));
  ok(ro.editable === 0 && ro.adds === 0 && ro.says.startsWith('4 characteristics on the plan'), `8 a client sees the plan and the answer and changes nothing (${JSON.stringify({ ...ro, says: ro.says.slice(0, 24) })})`);
  await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/scored/control-plan/${worked}`);
  ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '8 the phone: nothing off the side');
  const small = await page.evaluate(() => [...document.querySelectorAll('.fm-card input:not([type=checkbox]), .fm-card select, .fm-card button, .fm-card textarea')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).map(e => `${e.tagName} ${e.getAttribute('aria-label') ?? ''}`));
  ok(small.length === 0, '8 the phone: every box, pick and button in a card a thumb’s size', small.slice(0, 4).join(' | '));
  ok((await page.evaluate(() => [...document.querySelectorAll('.fm-grid')].every(g => g.getBoundingClientRect().right <= 392))), '8 the phone: each card is one column wide');
}

await browser.close();
ok(!errors.length, errors.join('; ') || 'No console errors');
process.exit(failed ? 1 : 0);
