/* OPERATIONAL READINESS, DRIVEN (FC-082 — knowledge/specs/FC-082-operational-readiness.md; docs/METHODS.md §7).
 *
 * The knowledge record's worked case — 72 items in six areas, people 14/18, SOPs 9/11, HACCP 3/4, spares 22/30, PM 6/6, cleaning 2/3: 56 ready,
 * 16 open, 3 past their day, the HACCP validation and the cleaning validation the two that stop day one (scripts/knowledge/cases-operations.py,
 * the readiness block, run with `python3 -I`) — and a list started through the sheet from the starter and worked through the real boxes:
 *
 *   a  the worked case equals the independent literals (56 of 72, 16 open, 3 late, the two stoppers; the sentence)
 *   b  a list started through the sheet: the starter's 22 items in six areas, every one open, ten that would stop day one, red
 *   c  an owner and a day given (late said in words), an item marked ready with its evidence and one with none (said), one not needed here,
 *      one added and one taken off with Undo — the sentence, tiles and lists follow, equal to the module's
 *   d  nothing to work on refused in words
 *   e  the money: named while a stopper is open, the line's a day offered in one tap and used, none once no stopper is open
 *   f  kept after a reload
 *   g  the paper downloaded and read back
 *   h  a client reads and changes nothing
 *   i  the phone: nothing off the side, 44 px controls
 *   j  the stage gate's Set up and Hand over sections list it as built and open it; the Tools page's card and its own page
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/readiness.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket|tunnel/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail !== undefined ? ` — ${String(detail).slice(0, 800)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const nows = s => flat(s).replace(/[’‘]/g, "'").replace(/\s+/g, '').toLowerCase();
const OUT = mkdtempSync(join(tmpdir(), 'readiness-'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const go = async (h, ready = '.nv-main') => { await page.goto(`${BASE}/${h}`); await page.locator(ready).first().waitFor({ timeout: 15000 }); await page.waitForTimeout(1200); };
const settle = () => page.waitForTimeout(900);
const says = async () => flat(await page.locator('.ie-says').first().innerText().catch(() => ''));
const tilesOf = async () => Object.fromEntries(await page.locator('.ln-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
const panel = async t => flat(await page.locator('.ln-panel', { hasText: t }).first().innerText().catch(() => ''));
const iso = n => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

/* ---- a · the worked case ---- */
await go('#/scored');
const w = await page.evaluate(async () => {
  const { SCORED } = await import('/src/tools/scored/registry.ts');
  const { studyScored } = await import('/src/tools/scored/scored.ts');
  const d = SCORED.find(x => x.key === 'readiness');
  if (!d) return null;
  const x = studyScored({ agreed: { scored: { key: 'readiness', rows: d.examples[0].rows } } });
  return { n: d.examples[0].rows.length, verdict: x.result.verdict, sentence: x.result.sentence, tiles: Object.fromEntries(x.result.tiles.map(t => [t.k, t.v])), areas: x.table.foot.map(r => r.slice(0, 2)) };
});
ok(!!w, 'a operational readiness is registered among the scored registers');
ok(w.n === 72 && w.verdict === '16 open, 3 late' && w.sentence === 'Readiness: 56 of 72 items ready; 16 open, 3 past their day. HACCP validation and cleaning validation would stop day one.', 'a the module says what the python case says: 56 of 72 ready, 16 open, 3 past their day, the HACCP and the cleaning validation stop day one', w.sentence);
ok(JSON.stringify(w.areas) === JSON.stringify([['People trained and signed off', '14 of 18 ready'], ['SOPs and standards issued', '9 of 11 ready'], ['HACCP plan amended and validated', '3 of 4 ready'], ['Spares on the shelf', '22 of 30 ready'], ['PM schedule loaded', '6 of 6 ready'], ['Cleaning validated', '2 of 3 ready']]), 'a the six areas count 14/18, 9/11, 3/4, 22/30, 6/6, 2/3 as the python does', JSON.stringify(w.areas));
ok(!/78/.test(w.sentence), 'a …and says no percentage: the gate is every item');

const lineId = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const l = await db.createWorkspace('Line 7 — readiness');
  await db.updateWorkspace({ ...l, packsPerMin: 100, marginPerPack: 0.2, shifts: [{ name: 'Days', start: '06:00', end: '14:30', breakMin: 30 }] });
  return l.id;
});

/* ---- b · a list started through the sheet ---- */
await go('#/scored/readiness');
await page.getByRole('button', { name: 'New ranking' }).first().click();
await page.locator('.lt-new input.text-input').first().fill('Line 7 — new wrapper, readiness for handover');
await page.locator('.lt-new select').selectOption(lineId);
await page.getByRole('button', { name: 'Start', exact: true }).click();
await page.waitForURL(/\/scored\/readiness\/[^/]+$/, { timeout: 10000 });
await page.locator('[data-checklist]').waitFor({ timeout: 10000 });
await settle();
const starter = await page.evaluate(async () => { const m = await import('/src/tools/readiness/readiness.ts'); return { n: m.STARTER.length, areas: [...new Set(m.STARTER.map(s => s.group))], stoppers: m.STARTER.filter(s => s.stopper).length }; });
ok(await page.locator('[data-item]').count() === 22 && starter.n === 22 && await page.locator('.ckl-area').count() === 6 && starter.areas.length === 6, 'b the starter opens: 22 items in six areas', await page.locator('[data-item]').count());
ok(starter.stoppers === 10 && (await tilesOf())['Would stop day one'] === '10' && (await tilesOf()).Ready === '0 of 22', 'b nothing ready and ten that would stop day one — the food-safety and legal ones, the signed-off people, the SOPs and the labels', JSON.stringify(await tilesOf()));
ok((await says()).startsWith('Readiness: 0 of 22 items ready; 22 open.') && /would stop day one\.$/.test(await says()), 'b the sentence says 0 of 22 and what would stop day one', await says());
ok(await page.locator('.ln-close.is-r, .ln-band .is-r').count() > 0 || /Not ready to hand over: 22 items open/.test(flat(await page.locator('.ln-close').innerText())), 'b red until they are done, and the closing line says not ready');

/* ---- c · work through the real boxes ---- */
const OPS = 'Operators trained and signed off on every station they will run';
const HACCP = 'HACCP plan amended for the new equipment';
const FB = 'Foreign-body controls tested (metal detection, sieves, magnets)';
const PLAN = 'Product, recipe and rate set up in planning';
await page.getByLabel(`Who owns it — ${OPS}`, { exact: true }).fill('Dee');
await page.getByLabel(`By when — ${OPS}`, { exact: true }).fill(iso(-1));
await page.getByLabel(`State of ${HACCP}`, { exact: true }).selectOption('ready');
await page.getByLabel(`Evidence — what was seen, the record’s number — ${HACCP}`, { exact: true }).fill('Plan v7, reviewed 12 October');
await page.getByLabel(`State of ${FB}`, { exact: true }).selectOption('ready');
await page.getByLabel(`State of ${PLAN}`, { exact: true }).selectOption('na');
await settle();
const t2 = await tilesOf();
ok(t2.Ready === '2 of 22' && t2.Open === '19' && t2['Past their day'] === '1' && t2['Would stop day one'] === '8', 'c the tiles follow: 2 of 22 ready, 19 open, 1 past its day, 8 that would stop day one', JSON.stringify(t2));
const s2 = await says();
ok(s2.startsWith('Readiness: 2 of 22 items ready, 1 not needed here; 19 open, 1 past their day.') && /1 ready item has no evidence written\.$/.test(s2), 'c the sentence: 2 ready, 1 not needed here, 19 open, 1 late — and the ready item with no evidence said', s2);
const mod2 = await page.evaluate(async () => {
  const { getStudy, listAllStudies } = await import('/src/db.ts');
  const { studyScored } = await import('/src/tools/scored/scored.ts');
  const s = (await listAllStudies()).find(x => x.name === 'Line 7 — new wrapper, readiness for handover');
  const x = studyScored(s);
  return { sentence: x.result.sentence, closing: x.result.closing, lists: x.result.lists.map(l => l.title) };
});
ok(mod2.sentence === s2, 'c …and it is the module’s on the saved record');
ok(await page.locator(`[data-item] .ckl-tag.is-late`).count() === 1 && /Late — was due/.test(flat(await page.locator('.ckl-tag.is-late').innerText())), 'c the late item says so in words');
ok(flat(await page.locator('.ln-close').innerText()).includes(mod2.closing), 'c the closing line is the module’s');
ok(/Dee: Operators trained and signed off on every station they will run \(late\)/.test(await panel('Open, by who owns them')) && /Nobody yet:/.test(await panel('Open, by who owns them')), 'c open by who owns them — Dee with the late item, and the items nobody owns yet');
ok(/People: 0 of 5 ready/.test(await panel('By area')) && /Food safety and quality: 2 of 7 ready, 5 open/.test(await panel('By area')) && /Planning and systems: 0 of 1 ready, 1 not needed here/.test(await panel('By area')), 'c by area: the counts, never a percentage');
await page.getByLabel('The new item', { exact: true }).fill('Night shift cover agreed');
await page.getByLabel('Area for a new item', { exact: true }).fill('People');
await page.getByRole('button', { name: '+ Add an item' }).click(); await settle();
ok(await page.locator('[data-item]').count() === 23 && (await tilesOf()).Ready === '2 of 23', 'c an item added under People: 2 of 23');
await page.getByRole('button', { name: 'Take off Night shift cover agreed' }).click(); await settle();
ok(await page.locator('[data-item]').count() === 22 && await page.locator('.pugh-undo').count() === 1, 'c …taken off, with Undo offered');
await page.locator('.pugh-undo').getByRole('button', { name: 'Undo' }).click(); await settle();
ok(await page.locator('[data-item]').count() === 23, 'c Undo brings it back');
await page.getByRole('button', { name: 'Take off Night shift cover agreed' }).click(); await settle();

/* ---- e · the money ---- */
const MISSING = 'Give what a day of the line not making costs to say what a day’s wait for start-up is worth — readiness is the cheapest insurance the project buys.';
ok((await page.locator('.ie-money').allInnerTexts()).map(flat).includes(MISSING), 'e with no figure the missing input is named, and nothing waits on it');
await page.getByRole('button', { name: /^Use Line 7 — readiness’s £9\.6k a day/ }).click(); await settle();
ok(await page.getByLabel('What a day of the line not making costs', { exact: true }).inputValue() === '9600', 'e the line’s day (480 minutes × 100 a minute × £0.20) offered in one tap — 9600');
ok((await page.locator('.ie-money').allInnerTexts()).map(flat).includes('While 8 items that would stop day one are open, each day production cannot start is a day of the line not making: £9.6k (the figure you gave).'), 'e the money line as the module says it');

/* ---- f · kept after a reload ---- */
await page.reload(); await page.locator('[data-checklist]').waitFor({ timeout: 15000 }); await settle();
ok(await says() === s2 && await page.getByLabel(`Who owns it — ${OPS}`, { exact: true }).inputValue() === 'Dee' && await page.getByLabel('What a day of the line not making costs', { exact: true }).inputValue() === '9600', 'f kept after a reload — the sentence, an owner, the money');

/* ---- g · the paper ---- */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const pf = join(OUT, 'readiness.pdf'); await dl.saveAs(pf);
const pt = nows(execFileSync('pdftotext', ['-raw', pf, '-'], { encoding: 'utf8' }));
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pf], { encoding: 'utf8' }))?.[1]);
const WORDS = ['19 open, 1 late', s2.slice(0, 90), 'What must be ready before production takes the line', 'People', 'Food safety and quality', OPS, 'Dee', 'Not yet — late', 'Plan v7, reviewed 12 October', 'Not needed here', 'would stop day one',
  'Ready', '2 of 22', 'Would stop day one', 'Would stop day one', 'Open, by who owns them', 'By area', 'While 8 items that would stop day one are open', '£9.6k', 'What this does not say', mod2.closing.slice(0, 80)];
const gone = WORDS.filter(x => !pt.includes(nows(x)));
ok(gone.length === 0, `g the paper has the verdict, the sentence, the list by area with owners, days and evidence, the lists, the money and the closing line (${pages} page(s))`, `missing: ${gone.join(' | ')}`);

/* ---- i · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); await page.locator('[data-checklist]').waitFor({ timeout: 15000 }); await settle();
const fit = await page.evaluate(() => ({
  sw: document.documentElement.scrollWidth, iw: window.innerWidth,
  off: [...document.querySelectorAll('[data-checklist] .ckl-item, [data-checklist] input, [data-checklist] select')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > window.innerWidth + 1 || r.left < -1); }).length,
  small: [...document.querySelectorAll('[data-checklist] select, [data-checklist] button, [data-checklist] input:not([type=checkbox])')].filter(e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height < 44).map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40)),
}));
ok(fit.sw <= fit.iw + 1 && fit.off === 0, 'i the phone: nothing off the side of the page', JSON.stringify({ sw: fit.sw, iw: fit.iw, off: fit.off }));
ok(fit.small.length === 0, 'i …every control 44 px or more', JSON.stringify(fit.small.slice(0, 6)));
await page.setViewportSize({ width: 1360, height: 900 });

/* ---- d · nothing to work on ---- */
const emptyId = await page.evaluate(async lid => {
  const { putStudy } = await import('/src/db.ts');
  const { newScoredStudy } = await import('/src/tools/scored/scored.ts');
  const { SCORED } = await import('/src/tools/scored/registry.ts');
  const d = SCORED.find(x => x.key === 'readiness'); const s = newScoredStudy(d, { name: 'Nothing yet', workspaceId: lid, now: Date.now() });
  s.agreed.scored = { key: 'readiness', rows: [] };
  await putStudy(s); return s.id;
}, lineId);
await go(`#/scored/readiness/${encodeURIComponent(emptyId)}`, '[data-checklist]');
ok(/Add at least one item/.test(flat(await page.locator('[role=alert]').first().innerText().catch(() => ''))) && await page.locator('.ie-says').count() === 0, 'd nothing to work on is refused in words');

/* ---- h · a client ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
const cid = await page.evaluate(async lid => {
  const { putStudy, createProject } = await import('/src/db.ts');
  const proj = await createProject('Readiness — a client reads', '#2b87d4', 'Rowland', 'r@example.com', 'commissioning');
  const { newScoredStudy } = await import('/src/tools/scored/scored.ts');
  const { SCORED } = await import('/src/tools/scored/registry.ts');
  const d = SCORED.find(x => x.key === 'readiness'); const s = newScoredStudy(d, { name: 'A client reads', workspaceId: lid, projectId: proj.id, now: Date.now() });
  await putStudy(s); return s.id;
}, lineId);
await go(`#/scored/readiness/${encodeURIComponent(cid)}`, '[data-checklist]');
const ro = await page.evaluate(() => ({ editable: [...document.querySelectorAll('[data-checklist] input, [data-checklist] select')].filter(e => !e.disabled).length, buttons: document.querySelectorAll('[data-checklist] button').length, says: document.querySelector('.ie-says')?.textContent ?? '' }));
ok(ro.editable === 0 && ro.buttons === 0 && ro.says.startsWith('Readiness: 0 of 22'), 'h a client sees the list and the answer and changes nothing', JSON.stringify({ ...ro, says: ro.says.slice(0, 30) }));
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- j · the stage gate's sections, the Tools page ---- */
const how = await page.evaluate(async () => {
  const { howTool, openable, toolStateWord } = await import('/src/project/method/methodTools.ts');
  const { methodByKey } = await import('/src/lib/methods.ts');
  const h = howTool('FC-082'), m = methodByKey('stage-gate');
  return { how: h.how, word: toolStateWord(h), to: openable(h)?.to, sections: m.sections.filter(s => s.tools.includes('FC-082')).map(s => s.name) };
});
ok(how.how === 'tool' && how.word === 'Built' && how.to === '/scored/readiness' && how.sections.join() === 'Set up,Hand over', 'j the stage gate’s Set up and Hand over sections list it as Built and open /scored/readiness', JSON.stringify(how));
await go('#/tools');
ok(await page.locator('.nv-main').getByText('Operational readiness').count() > 0, 'j the Tools page has a card for it');
await go('#/tools/readiness');
ok(/readiness/i.test(await page.locator('.nv-main').innerText()), 'j its own page opens');

ok(errors.length === 0, 'no console error anywhere', errors.slice(0, 4).join(' | '));
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
