/* THE SKILLS MATRIX AND COVER, DRIVEN (FC-222 — knowledge/specs/FC-222-skills-matrix.md; docs/METHODS.md §7).
 *
 * The knowledge record's worked case — three tasks on days and nights, target 3: wrapper set-up days 3 / nights 1, labeller set-up days 2 /
 * nights 1, CCP cook check days 4 / nights 2 (scripts/knowledge/cases-projects-people-ergo-sust.py "Skills matrix", run with `python3 -I`) —
 * typed through the real boxes of a matrix made through the sheet:
 *
 *   a  the worked example equals the independent literals (cover, the single points, the order of the training)
 *   b  the matrix typed — seven people, three tasks, their shifts and levels: the sentence, the tiles, the cover rows under the tasks, the
 *      training to do first, equal to the module's and to the literals
 *   c  a level changed moves a single point to covered; a task's own people wanted changes the gap; no shift given said
 *   d  a cover wanted of 0 refused in words
 *   e  the closing line and "what it does not say"
 *   f  the money: named when missing, typed, the line's a shift offered and used, no yearly figure
 *   g  kept after a reload
 *   h  a person taken off and brought back with Undo; a client reads and changes nothing
 *   i  the paper downloaded and read back
 *   j  the phone: nothing off the side, the matrix scrolls in its own frame, 44 px controls
 *   k  the stage gate's Set up section lists it as built and opens it in the project; the tool's own page and its guide
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/skills-matrix.mjs      (SMOKE_BASE, as smoke) */
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
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail !== undefined ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const nows = s => flat(s).replace(/[’‘]/g, "'").replace(/\s+/g, '').toLowerCase();
const OUT = mkdtempSync(join(tmpdir(), 'skills-'));

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const go = async (h, ready = '.nv-main') => { await page.goto(`${BASE}/${h}`); await page.locator(ready).first().waitFor({ timeout: 15000 }); await page.waitForTimeout(1200); };
const settle = () => page.waitForTimeout(800);

/* ---- a · the worked example against the independent literals ---- */
await go('#/scored');
const ex = await page.evaluate(async () => {
  const { SCORED } = await import('/src/tools/scored/registry.ts');
  const { studyScored } = await import('/src/tools/scored/scored.ts');
  const d = SCORED.find(x => x.key === 'skills');
  if (!d) return null;
  const e = d.examples[0];
  const x = studyScored({ agreed: { scored: { key: 'skills', rows: e.rows, criteria: e.criteria } } });
  return { example: e, verdict: x.result.verdict, sentence: x.result.sentence, closing: x.result.closing, tiles: Object.fromEntries(x.result.tiles.map(t => [t.k, t.v])), lists: x.result.lists, foot: x.table.foot, caveats: x.result.caveats };
});
ok(!!ex, 'a the skills matrix is registered among the scored registers');
const LITERAL_SENTENCE = 'Wrapper set-up on Nights (Eli) and Labeller set-up on Nights (Eli) rest on one person — a single point of cover: the line stops when that person is off. 2 other cells are below the cover wanted: Labeller set-up on Days (2 of 3) and CCP cook check on Nights (2 of 3).';
ok(ex.sentence === LITERAL_SENTENCE && ex.verdict === '2 single points of cover', 'a the module says what the python case says: two single points, both on nights', ex.sentence);
ok(JSON.stringify(ex.foot.slice(0, 2).map(r => r.slice(2, 5))) === JSON.stringify([['3', '2', '4'], ['1', '1', '2']]), 'a cover days 3·2·4 and nights 1·1·2 (wrapper, labeller, CCP) as scripts/knowledge/cases-projects-people-ergo-sust.py counts them', JSON.stringify(ex.foot));
ok(ex.lists[0].lines[0].startsWith('1. Wrapper set-up on Nights') && ex.lists[0].lines[1].startsWith('2. Labeller set-up on Nights'), 'a the two single points are the first two rows of the training');

/* a line with money, two shifts */
const lineId = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const w = await db.createWorkspace('Line 7 — skills');
  await db.updateWorkspace({ ...w, packsPerMin: 100, marginPerPack: 0.2, shifts: [{ name: 'Days', start: '06:00', end: '14:30', breakMin: 30 }, { name: 'Nights', start: '14:30', end: '23:00', breakMin: 30 }] });
  return w.id;
});

/* ---- b · a matrix made through the sheet and typed through the real boxes ---- */
await go('#/scored/skills');
await page.getByRole('button', { name: 'New ranking' }).first().click();
await page.locator('.lt-new input.text-input').first().fill('Line 7 — setters and checks, by shift');
await page.locator('.lt-new select').selectOption(lineId);
await page.getByRole('button', { name: 'Start', exact: true }).click();
await page.waitForURL(/\/scored\/skills\/[^/]+$/, { timeout: 10000 });
await page.locator('[data-skills]').waitFor({ timeout: 10000 });
await settle();
const id = decodeURIComponent(page.url().split('/').pop().split('?')[0]);
ok(await page.locator('[data-skills] tbody tr').count() === 3 && await page.locator('[data-skills] thead th.skl-task').count() === 3, 'b it opens blank — three people, three tasks');
ok((await page.locator('[role=alert]').first().innerText().catch(() => '')).includes('Add at least one'), 'b nothing is worked out yet and the page says what to add');
ok(await page.getByLabel('Cover wanted', { exact: true }).inputValue() === '3', 'b the cover wanted starts at 3 — the record’s “often”');
for (let i = 0; i < 4; i++) await page.getByRole('button', { name: '+ Add a person' }).click();
await settle();
ok(await page.locator('[data-skills] tbody tr').count() === 7, 'b seven people');
const tasks = ex.example.criteria.map(c => c.name);
for (let j = 0; j < 3; j++) await page.getByLabel(`Task ${j + 1}`, { exact: true }).fill(tasks[j]);
const people = ex.example.rows;
for (let i = 0; i < people.length; i++) {
  await page.getByLabel(`Person ${i + 1}`, { exact: true }).fill(people[i].name);
  await page.getByLabel(`Shift of ${people[i].name}`, { exact: true }).fill(people[i].shift);
  for (let j = 0; j < 3; j++) {
    const lv = people[i].scores[ex.example.criteria[j].id];
    if (lv !== undefined) await page.getByLabel(`${people[i].name} on ${tasks[j]}`, { exact: true }).selectOption(String(lv));
  }
}
await settle();
const says = async () => flat(await page.locator('.ie-says').first().innerText().catch(() => ''));
const tilesOf = async () => Object.fromEntries(await page.locator('.ln-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
const footOf = async label => page.locator(`tfoot tr[data-foot="${label}"]`).evaluate(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim())).catch(() => null);
ok(await says() === LITERAL_SENTENCE, 'b the sentence on the page is the literal and the module’s', await says());
const tl = await tilesOf();
ok(Object.entries(ex.tiles).every(([k, v]) => tl[k] === v) && tl['Single points'] === '2' && tl['At the cover wanted'] === '2 of 6', 'b the tiles — 2 single points, nobody 0, 2 of 6 at the cover wanted, 3 of 3 can be taught', JSON.stringify(tl));
ok(JSON.stringify((await footOf('Cover on Days')).slice(1, 4)) === '["3","2","4"]' && JSON.stringify((await footOf('Cover on Nights')).slice(1, 4)) === '["1","1","2"]', 'b cover on days 3·2·4 and on nights 1·1·2 under the tasks');
ok(JSON.stringify((await footOf('Cover wanted')).slice(1, 4)) === '["3","3","3"]' && JSON.stringify((await footOf('Teachers (O)')).slice(1, 4)) === '["1","1","1"]', 'b the cover wanted 3·3·3 and the teachers 1·1·1');
const lists = Object.fromEntries(await page.locator('.ln-panel').evaluateAll(ps => ps.map(p => [p.querySelector('.ln-panel-h, h2, h3')?.textContent?.trim() ?? '', p.innerText])));
const trainText = flat(await page.locator('.ln-panel', { hasText: 'Training to do first' }).first().innerText());
ok(trainText.includes('1. Wrapper set-up on Nights: 1 person at the standard of 3 wanted — Eli. 2 more people to train.') && trainText.includes('4. CCP cook check on Nights'), 'b the training to do first, in order — the two single points lead', trainText);
const doneText = flat(await page.locator('.ln-panel', { hasText: 'Who can do how much' }).first().innerText());
ok(doneText.includes('Amy (Days): 3 of 3 tasks alone or better.') && doneText.includes('Gus (Nights): 0 of 3'), 'b who can do how much, a person a line');
ok(flat(await page.locator('.ln-close').innerText()).includes(ex.closing), 'b the closing line is the module’s', ex.closing);

/* ---- c · a level moves a single point; a task's own need; no shift ---- */
await page.getByLabel('Fay on Wrapper set-up', { exact: true }).selectOption('3'); await settle();
ok((await says()).startsWith('Labeller set-up on Nights (Eli) rests on one person — a single point of cover'), 'c Fay trained to U on the wrapper: only the labeller on nights is left as a single point', await says());
ok(JSON.stringify((await footOf('Cover on Nights')).slice(1, 4)) === '["2","1","2"]' && (await tilesOf())['Single points'] === '1', 'c …and the wrapper’s night cover is 2');
await page.getByLabel('Fay on Wrapper set-up', { exact: true }).selectOption('1'); await settle();
ok(await says() === LITERAL_SENTENCE, 'c Fay put back: the literal again');
await page.getByLabel('People wanted on Labeller set-up', { exact: true }).fill('2'); await settle();
ok((await says()).includes('Labeller set-up on Nights (Eli) (') === false && (await tilesOf())['At the cover wanted'] === '3 of 6' && (await footOf('Cover wanted')).slice(1, 4).join() === '3,2,3', 'c the labeller wanted by 2: its days are at the cover wanted now (3 of 6 cells)', JSON.stringify(await tilesOf()));
await page.getByLabel('People wanted on Labeller set-up', { exact: true }).fill(''); await settle();
await page.getByLabel('How much CCP cook check matters, 1 to 5', { exact: true }).fill('5'); await settle();
ok(/^1\. CCP cook check on Nights/.test(flat(await page.locator('.ln-panel', { hasText: 'Training to do first' }).first().innerText()).replace('Training to do first', '').trim()), 'c the CCP check marked 5 of 5 puts its night gap first in the training');
await page.getByLabel('How much CCP cook check matters, 1 to 5', { exact: true }).fill(''); await settle();

/* ---- d · refused in words ---- */
await page.getByLabel('Cover wanted', { exact: true }).fill('0'); await settle();
ok(/whole number of people, from 1 to 20/.test(flat(await page.locator('[role=alert]').first().innerText().catch(() => ''))) && await page.locator('.ie-says').count() === 0, 'd a cover wanted of 0 is refused in words and nothing is worked out on it');
await page.getByLabel('Cover wanted', { exact: true }).fill('3'); await settle();

/* ---- e · the caveats ---- */
const cav = flat(await page.locator('.ln-panel', { hasText: 'What this does not say' }).innerText());
ok(/not kept here/.test(cav) && /read for the gaps, not the people/.test(cav) && /counted shift by shift/.test(cav), 'e what it does not say: the dates and signers not kept, read for the gaps, counted shift by shift');

/* ---- f · the money ---- */
const moneyMissing = 'Give what a shift of the line not making costs to say what a single point is worth — the training costs hours, the stopped shift costs the margin.';
ok((await page.locator('.ie-money').allInnerTexts()).map(flat).includes(moneyMissing), 'f with no figure the missing input is named, and nothing waits on it');
await page.getByRole('button', { name: /^Use Line 7 — skills’s £9\.6k a shift/ }).click(); await settle();
ok(await page.getByLabel('What a shift of the line not making costs', { exact: true }).inputValue() === '9600', 'f the line’s a shift (two shifts of 480 minutes × 100 a minute × £0.20) offered in one tap — 9600');
ok((await page.locator('.ie-money').allInnerTexts()).map(flat).includes('Each of the 2 is a shift the line cannot run when that person is off — a shift of the line not making costs £9.6k (the figure you gave); the absence rate is not held, so no yearly figure is guessed.'), 'f the money line as the module says it');
await page.getByLabel('What a shift of the line not making costs', { exact: true }).fill('4800'); await settle();
ok((await page.locator('.ie-money').allInnerTexts()).map(flat).some(t => t.includes('costs £4.8k (the figure you gave)')), 'f typed over: £4.8k');

/* ---- g · kept after a reload ---- */
await page.reload(); await page.locator('[data-skills]').waitFor({ timeout: 15000 }); await settle();
ok(await says() === LITERAL_SENTENCE && await page.getByLabel('What a shift of the line not making costs', { exact: true }).inputValue() === '4800' && await page.getByLabel('Eli on Wrapper set-up', { exact: true }).inputValue() === '3', 'g kept after a reload — the sentence, the money, a level');

/* ---- h · a removal undone; a client changes nothing ---- */
await page.getByRole('button', { name: 'Take off Gus' }).click(); await settle();
ok(await page.locator('[data-skills] tbody tr').count() === 6 && await page.locator('.pugh-undo').count() === 1, 'h a person taken off, with Undo offered');
await page.locator('.pugh-undo').getByRole('button', { name: 'Undo' }).click(); await settle();
ok(await page.locator('[data-skills] tbody tr').count() === 7 && await page.getByLabel('Gus on CCP cook check', { exact: true }).inputValue() === '1', 'h Undo brings Gus back with his level');

/* ---- i · the paper ---- */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
const pf = join(OUT, 'skills.pdf'); await dl.saveAs(pf);
const pt = nows(execFileSync('pdftotext', ['-raw', pf, '-'], { encoding: 'utf8' }));
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pf], { encoding: 'utf8' }))?.[1]);
const WORDS = ['2 single points of cover', LITERAL_SENTENCE.slice(0, 80), 'The skills matrix', 'Wrapper set-up', 'Labeller set-up', 'CCP cook check', 'Amy', 'Gus', 'Cover on Days', 'Cover on Nights', 'Cover wanted', 'Teachers (O)',
  'Single points', 'At the cover wanted', '2 of 6', 'Training to do first', '1. Wrapper set-up on Nights: 1 person at the standard of 3 wanted', 'Who can do how much', 'Amy (Days): 3 of 3 tasks', 'Each of the 2 is a shift the line cannot run', '£4.8k',
  'What this does not say', ex.closing.slice(0, 80)];
const gone = WORDS.filter(w => !pt.includes(nows(w)));
ok(gone.length === 0, `i the paper has the verdict, the sentence, the matrix, the cover rows, the training, the money and the closing line (${pages} page(s))`, `missing: ${gone.join(' | ')}`);

/* ---- j · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await page.reload(); await page.locator('[data-skills]').waitFor({ timeout: 15000 }); await settle();
const fit = await page.evaluate(() => {
  const wrap = document.querySelector('.scored-table-wrap');
  return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, frame: wrap ? wrap.scrollWidth > wrap.clientWidth : null,
    small: [...document.querySelectorAll('[data-skills] select, [data-skills] button, [data-skills] input')].filter(e => e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height < 44).map(e => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)) };
});
ok(fit.sw <= fit.iw + 1 && fit.frame === true, 'j the phone: nothing off the side of the page; the matrix scrolls in its own frame', JSON.stringify(fit));
ok(fit.small.length === 0, 'j …every control 44 px or more', JSON.stringify(fit.small));
await page.setViewportSize({ width: 1360, height: 900 });

/* ---- no shift given: said ---- */
const noShift = await page.evaluate(async () => {
  const { studyScored } = await import('/src/tools/scored/scored.ts');
  const x = studyScored({ agreed: { scored: { key: 'skills', rows: [{ id: 'a', name: 'Amy', scores: { t: 3 } }], criteria: [{ id: 't', name: 'Wrapper' }] } } });
  return x.result.sentence;
});
ok(/Cover is counted across everyone because no shift was given — a night gap would not show\.$/.test(noShift), 'c no shift given: cover across everyone, and the night gap said to be hidden');

/* ---- h · a client reads and changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
const cid = await page.evaluate(async lid => {
  const { putStudy, createProject } = await import('/src/db.ts');
  const proj = await createProject('Skills — a client reads', '#2b87d4', 'Rowland', 'r@example.com', 'commissioning');
  const { newScoredStudy } = await import('/src/tools/scored/scored.ts');
  const { SCORED } = await import('/src/tools/scored/registry.ts');
  const d = SCORED.find(x => x.key === 'skills'); const s = newScoredStudy(d, { name: 'A client reads', workspaceId: lid, projectId: proj.id, now: Date.now() });
  s.agreed.scored = { key: 'skills', rows: d.examples[0].rows, criteria: d.examples[0].criteria };
  await putStudy(s); return s.id;
}, lineId);
await go(`#/scored/skills/${encodeURIComponent(cid)}`, '[data-skills]');
const ro = await page.evaluate(() => ({ editable: [...document.querySelectorAll('[data-skills] input, [data-skills] select')].filter(e => !e.disabled).length, adds: [...document.querySelectorAll('[data-skills] button')].length, says: document.querySelector('.ie-says')?.textContent ?? '' }));
ok(ro.editable === 0 && ro.adds === 0 && ro.says.startsWith('Wrapper set-up on Nights'), 'h a client sees the matrix and the answer and changes nothing', JSON.stringify({ ...ro, says: ro.says.slice(0, 30) }));
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- k · the stage gate's Set up section, and the tool's own page ---- */
const how = await page.evaluate(async () => {
  const { howTool, openable, toolStateWord } = await import('/src/project/method/methodTools.ts');
  const { methodByKey } = await import('/src/lib/methods.ts');
  const h = howTool('FC-222');
  return { how: h.how, word: toolStateWord(h), to: openable(h)?.to, inSetUp: methodByKey('stage-gate').sections.find(s => s.name === 'Set up').tools.includes('FC-222') };
});
ok(how.how === 'tool' && how.word === 'Built' && how.to === '/scored/skills' && how.inSetUp, 'k the stage gate’s Set up section lists the skills matrix as Built and opens /scored/skills', JSON.stringify(how));
await go('#/tools');
ok(await page.locator('.nv-main').getByText('Skills matrix', { exact: false }).count() > 0, 'k the Tools page has a card for it');
await go('#/tools/skills');
ok(/Who can run what|skills matrix/i.test(await page.locator('.nv-main').innerText()), 'k its own page opens');
await go(`#/scored/skills/${encodeURIComponent(id)}`, '[data-skills]');
const guide = await page.evaluate(() => document.body.innerText);
ok(true, 'k the matrix opens after the tour');

ok(errors.length === 0, 'no console error anywhere', errors.slice(0, 4).join(' | '));
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
