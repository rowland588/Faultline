/* ACCEPTANCE — THE CALCULATOR SHAPE, FOR EVERY CALCULATOR THERE IS (knowledge/specs/FC-235-calculators.md; 25 October 2026).
 *
 * TABLE-DRIVEN: it asks the app for every registered definition (src/tools/calc/registry) and walks each one through the real
 * page — so a calculator added later is covered with no change here. For each definition:
 *   a  its page on the hub as a card, then its own list: New, its name, the record opened — a fresh record says it is waiting for the figures
 *   b  every worked example typed through the real boxes (a choice by its button, a number in its box) — the sentence, the verdict, every
 *      expected tile and the money as the example's independent literals say AND as the definition computes them in the page
 *   c  every refused input typed in — no answer, the refusal's words on the page
 *   d  the figures kept after a reload; the saved before (Save as before, then another example's figures: each tile saying what moved,
 *      the before's own sentence), a what-if (one figure changed, the answer as the definition computes it, nothing kept until Make it so)
 *   e  the paper downloaded and read back: the sentence, the tiles, every figure put in with its unit, the working, the caveats, the
 *      picture's title where the definition draws one, and "Before → after" once a before is saved
 *   f  the phone: 390 px, nothing off the side, every box inside it, the picture inside it
 *   g  Rename in More ▾, Delete (the ask says what goes) and Undo — back whole
 * then, once: the hub counted and listing the saved ones, a line's Tools page with its row, the line's report with every saved calculation
 * ticked in and on its paper, a client reading a project's calculation read-only with its paper, and no console error anywhere.
 *
 *   node scripts/acceptance/calc-shape.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper, more as pressMore } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'calc-shape-'));
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const nows = s => String(s ?? '').replace(/\s+/g, '').replace(/[’‘]/g, "'");

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const errors = [];
let failed = 0;
const ok = (c, m, extra) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && extra ? ` — ${String(extra).slice(0, 500)}` : ''}`); if (!c) failed++; };

/** A device: a width, and whether the person is a team member (default) or a client (access forced). */
async function device(width, access) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: width < 900 ? 844 : 900 }, locale: 'en-GB', acceptDownloads: true });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s, a]) => { try { localStorage.setItem(k, JSON.stringify(s)); if (a) localStorage.setItem('faultline.access.force', a); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION, access]);
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  return { ctx, page };
}
const { page } = await device(1360);
let asked = '', answer = true;
page.on('dialog', d => { asked = d.message(); void (answer ? d.accept() : d.dismiss()); });
const go = async h => { await page.goto(`${BASE}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const pdf = async (name, label) => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, label)]);
  const f = join(OUT, name); await d.saveAs(f);
  return { text: flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' })), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
};
const recordId = () => decodeURIComponent(page.url().split('/').pop()?.split('?')[0] ?? '');

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const defs = await page.evaluate(async () => (await import('/src/tools/calc/registry.ts')).CALCS.map(d => ({
  key: d.key, fc: d.fc, title: d.title, says: d.says, group: d.group, question: d.question, see: d.see ?? [],
  inputs: d.inputs.map(f => ({ id: f.id, label: f.label, chosen: f.chosen ?? null, kind: f.kind, unit: f.unit ?? '', optional: !!f.optional, money: !!f.money, def: f.default ?? null, options: (f.options ?? []).map(o => o.value) })),
  examples: d.examples, refused: d.refused,
})));
ok(defs.length >= 4, `${defs.length} calculators registered: ${defs.map(d => d.key).join(', ')}`);

/** What the definition says in the page for these inputs — the truth the screen is checked against. */
const truth = (key, inputs) => page.evaluate(async ([key, inputs]) => {
  const C = await import('/src/tools/calc/calc.ts'), R = await import('/src/tools/calc/registry.ts');
  const run = C.runCalc(R.calcByKey(key), inputs);
  return { blocked: run.blocked, problems: run.problems.map(p => ({ say: p.say, block: !!p.block })), r: run.result ? { verdict: run.result.verdict, tone: run.result.tone, sentence: run.result.sentence, tiles: run.result.tiles.map(t => [t.k, t.v]), money: run.result.money?.text ?? null, missing: run.result.money?.missing ?? [], picture: run.result.picture?.title ?? null, closing: run.result.closing, caveats: run.result.caveats, working: run.result.working.map(w => w.label) } : null };
}, [key, inputs]);
const whatIfTruth = (key, inputs, id, val) => page.evaluate(async ([key, inputs, id, val]) => {
  const C = await import('/src/tools/calc/calc.ts'), R = await import('/src/tools/calc/registry.ts');
  const run = C.whatIf(R.calcByKey(key), inputs, id, val);
  return run.result ? { sentence: run.result.sentence, verdict: run.result.verdict } : null;
}, [key, inputs, id, val]);

/** The boxes as a person fills them: choices first (they decide which boxes are asked), then each number or text; a box the example
 *  does not give is emptied. */
async function fill(def, inputs) {
  for (const f of def.inputs.filter(f => f.kind === 'choice')) {
    const want = inputs[f.id] ?? f.def;
    if (want === null || want === undefined) continue;
    await page.locator(`[data-field="${f.id}"] [data-value="${want}"]`).click();
  }
  await page.waitForTimeout(150);
  /* the money boxes sit under "In money — all optional": opened as a person would */
  if (await page.locator('.calc-money').count() && !(await page.locator('.calc-money').evaluate(e => e.open))) { await page.locator('.calc-money > summary').click(); await page.waitForTimeout(150); }
  for (const f of def.inputs.filter(f => f.kind !== 'choice')) {
    const box = page.locator(`[data-field-input="${f.id}"]`);
    if (!(await box.count())) continue;                       // not asked for these choices
    await box.fill(inputs[f.id] === undefined ? '' : String(inputs[f.id]));
  }
  await page.waitForTimeout(350);
}
const sentence = () => words('[data-calc=sentence]');
const tilesOf = async () => Object.fromEntries(await page.locator('.calc-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));

/* ---- 0 · the hub ---- */
await go('#/calc');
ok(/^Calculators$/.test((await words('h1')) ?? ''), '0 the hub is named Calculators');
for (const g of [...new Set(defs.map(d => d.group))]) ok(((await page.locator('.part-sec-h h2').allInnerTexts()).map(flat)).includes(g), `0 the group “${g}” is a heading`);
for (const d of defs) {
  const card = flat((await page.locator(`[data-calc-card="${d.key}"]`).innerText().catch(() => '')) ?? '');
  ok(card.includes(d.title) && card.includes(d.says), `0 ${d.key}: its card says what it is for — "${card.slice(0, 90)}"`);
}
const savedTexts = (await page.locator('.lt-rows .lt-li').allInnerTexts()).map(flat);
ok(savedTexts.some(t => t.includes('Trays to the packer')) && savedTexts.some(t => t.includes('Goods-in film check')) && savedTexts.some(t => t.includes('Cooked trays in the chiller')), `0 the saved ones are listed, each with its calculator and what it says (${savedTexts.length})`);
ok(/Kanban sizing · 8 kanbans/.test(savedTexts.find(t => t.includes('Trays to the packer')) ?? ''), '0 a row says its calculator and its verdict', savedTexts[0]);
ok(/1 saved/i.test(flat(await page.locator('[data-calc-card=kanban]').innerText())), '0 the kanban card counts its saved one');

/* ---- per definition ---- */
for (const d of defs) {
  const tag = `${d.key}`;
  /* a · New, from the calculator's own page */
  await go(`#/calc/${d.key}`);
  ok(flat(await page.locator('h1').first().innerText()) === d.title && (await words('.pace-lede'))?.includes(d.question), `${tag} a its page: ${d.title}, and the question it answers`);
  await page.getByRole('button', { name: 'New calculation' }).first().click(); await page.waitForTimeout(400);
  await page.getByLabel('What is it of?').fill(`Acceptance — ${d.title}`);
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  const id = recordId();
  ok(page.url().includes(`/calc/${d.key}/`) && id.length > 8, `${tag} a started: ${page.url().split('#')[1]}`);
  for (const f of d.inputs.filter(f => f.chosen)) ok((await words(`[data-chosen="${f.id}"]`))?.startsWith('A choice, not a measurement.'), `${tag} a ${f.id} says it is a choice, not a measurement`);
  const startsBlank = d.inputs.some(f => !f.optional && f.kind === 'number');
  if (startsBlank) ok(/Waiting for the figures/.test((await words('[data-calc=waiting]')) ?? '') && (await page.locator('[data-calc=sentence]').count()) === 0, `${tag} a a new record is asked for its figures, not shown an answer: "${(await words('[data-calc=waiting]'))?.slice(0, 120)}"`);

  /* b · every example, through the real boxes */
  for (const [i, ex] of d.examples.entries()) {
    await fill(d, ex.inputs);
    const t = await truth(d.key, ex.inputs);
    const say = await sentence();
    ok(say === ex.expect.sentence && t.r?.sentence === say, `${tag} b${i + 1} “${ex.name}”: "${say?.slice(0, 140)}${(say?.length ?? 0) > 140 ? '…' : ''}"`, `${say} || ${ex.expect.sentence}`);
    const tiles = await tilesOf();
    ok(Object.entries(ex.expect.tiles).every(([k, v]) => tiles[k] === v) && t.r.tiles.every(([k, v]) => tiles[k] === v), `${tag} b${i + 1} the tiles: ${Object.entries(ex.expect.tiles).map(([k, v]) => `${k} ${v}`).join(' · ')}`, JSON.stringify(tiles));
    const band = flat((await words('.ln-verdict')) ?? '');
    ok(band === ex.expect.verdict && (await page.locator(`.ie-say.is-${ex.expect.tone}`).count()) === 1, `${tag} b${i + 1} the band says “${band}” and the sentence is ${ex.expect.tone}`);
    const warnsOn = (await page.locator('.ie-check.is-a').allInnerTexts()).map(flat).join(' | ');
    ok((ex.expect.warns ?? []).every(w => warnsOn.includes(w)) && (await page.locator('.ie-check.is-a').count()) === (ex.expect.warns ?? []).length, `${tag} b${i + 1} the warnings beside the answer: ${(ex.expect.warns ?? []).length ? `"${(ex.expect.warns ?? [])[0].slice(0, 70)}"` : 'none'}`, warnsOn);
    const money = await words('[data-calc=money]');
    if (ex.expect.money) ok(money === ex.expect.money && t.r.money === money, `${tag} b${i + 1} the money: "${money?.slice(0, 120)}"`, money);
    else ok(money === null && t.r.missing.length > 0 && (await page.locator('.calc-money-missing').count()) === t.r.missing.length, `${tag} b${i + 1} no money figure: ${t.r.missing.length} sentence(s) say what to add — "${t.r.missing[0]?.slice(0, 80)}"`);
    ok(flat(await page.locator('.ln-close').innerText()).includes(t.r.closing.slice(0, 40)) && (await page.locator('.calc-caveats li').count()) === t.r.caveats.length && (await page.locator('.calc-working-t tr').count()) === t.r.working.length, `${tag} b${i + 1} the closing line, the working (${t.r.working.length}) and what it does not say (${t.r.caveats.length}) as the definition has them`);
    if (t.r.picture) ok((await page.locator('.calc-pic-svg').count()) === 1 && (await page.locator('.calc-pic-svg polyline').count()) >= 1 && (await words('.calc-pic-cap'))?.startsWith(t.r.picture), `${tag} b${i + 1} the picture: ${t.r.picture}`);
    else ok((await page.locator('.calc-pic-svg').count()) === 0, `${tag} b${i + 1} no picture drawn — this calculator has none to earn`);
  }

  /* c · what it refuses */
  for (const x of d.refused) {
    const doable = d.inputs.filter(f => f.kind === 'choice').every(f => x.inputs[f.id] === undefined || f.options.includes(String(x.inputs[f.id])));
    if (!doable) { ok(true, `${tag} c “${x.name}”: not typeable (a choice offers only what is valid) — refused by the definition (unit test)`); continue; }
    await fill(d, x.inputs);
    const body = flat(await page.locator('.calc-form, .calc-out').first().innerText()) + ' ' + flat(await page.locator('.calc-out').innerText());
    const all = flat(await page.locator('.nv-main').innerText());
    ok((await page.locator('[data-calc=sentence]').count()) === 0 && (all.includes(x.blocked) || body.includes(x.blocked)), `${tag} c “${x.name}”: no answer, and the page says “${x.blocked}”`, all.slice(0, 300));
  }

  /* d · kept after a reload; the saved before; a what-if */
  const e0 = d.examples[0], e1 = d.examples[1];
  await fill(d, e0.inputs);
  await page.waitForTimeout(900);
  await page.reload(); await page.locator('.nv-main').waitFor(); await page.waitForTimeout(1800);
  ok((await sentence()) === e0.expect.sentence, `${tag} d reloaded: the figures and the answer kept`);
  await page.getByRole('button', { name: 'Save as before', exact: true }).click(); await page.waitForTimeout(700);
  ok(/Before → after/.test((await words('.calc-before')) ?? '') && (await words('[data-calc=before]')) === `Before: ${e0.expect.sentence}`, `${tag} d the figures saved as the before — "Before: …"`);
  await fill(d, e1.inputs);
  const sameInputs = JSON.stringify(e0.inputs) === JSON.stringify(e1.inputs);
  const changes = await page.locator('.calc-tiles .ln-ch').allInnerTexts();
  ok(sameInputs || changes.length > 0, `${tag} d another example's figures typed: ${changes.length} tile(s) say what moved since the saved before — "${flat(changes[0] ?? '').slice(0, 70)}"`);
  ok(/Changed: /.test((await words('.calc-before-ch')) ?? ''), `${tag} d it lists which figures changed`);
  /* the what-if: the first needed number whose value differs between the two examples; nothing is kept until Make it so */
  const wf = d.inputs.find(f => f.kind === 'number' && e0.inputs[f.id] !== undefined && e1.inputs[f.id] !== undefined && e0.inputs[f.id] !== e1.inputs[f.id]) ?? d.inputs.find(f => f.kind === 'number' && e0.inputs[f.id] !== undefined);
  await fill(d, e0.inputs);
  const alt = wf ? (e1.inputs[wf.id] !== undefined && e1.inputs[wf.id] !== e0.inputs[wf.id] ? e1.inputs[wf.id] : Number(e0.inputs[wf.id]) + 1) : undefined;
  if (wf) {
    await page.locator('select[aria-label="What if: which figure"]').selectOption(wf.id);
    await page.locator('[aria-label="What if: the new figure"]').fill(String(alt));
    await page.waitForTimeout(400);
    const w = await whatIfTruth(d.key, e0.inputs, wf.id, String(alt));
    const wsay = await words('[data-calc=whatif] .ie-say');
    ok(w && wsay === w.sentence, `${tag} d what if ${wf.label} were ${alt}: "${wsay?.slice(0, 110)}"`, `${wsay} || ${w?.sentence}`);
    ok((await sentence()) === e0.expect.sentence, `${tag} d …and the record's own answer has not moved`);
    await page.getByRole('button', { name: 'Make it so', exact: true }).click(); await page.waitForTimeout(900);
    const kept = await page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)).agreed.calc.inputs, id);
    ok(String(kept[wf.id]) === String(alt), `${tag} d Make it so: ${wf.id} is now ${kept[wf.id]} on the record`);
    await fill(d, e0.inputs); await page.waitForTimeout(800);
  }

  /* e · on paper */
  const p = await pdf(`${d.key}.pdf`, / — on paper$/);
  const T = nows(p.text);
  ok(T.includes(nows(e0.expect.sentence.slice(0, 60))) && T.includes(nows(e0.expect.sentence.slice(-40))), `${tag} e the paper says the sentence (${p.pages} page${p.pages === 1 ? '' : 's'})`, p.text.slice(0, 400));
  ok(Object.entries(e0.expect.tiles).every(([k, v]) => T.includes(nows(v))) && T.includes(nows(d.title.toUpperCase())) || T.includes(nows(d.title)), `${tag} e …the tiles' figures and the calculator's name`);
  const given = d.inputs.filter(f => e0.inputs[f.id] !== undefined && f.kind !== 'choice');
  ok(given.every(f => T.includes(nows(f.label))) && /Where it came from/.test(p.text) && /typed/.test(p.text), `${tag} e the figures put in, each with its name and where it came from (${given.length})`);
  ok(/How it is worked out/.test(p.text) && /What this does not say/.test(p.text) && /In money/.test(p.text), `${tag} e the working, the money and what it does not say`);
  ok(/Before → after|Before to after/.test(p.text) && T.includes(nows(`Before`)), `${tag} e the saved before is on the paper`);
  const tr = await truth(d.key, e0.inputs);
  if (tr.r.picture) ok(T.includes(nows(tr.r.picture.slice(0, 30))), `${tag} e the picture's title is on the paper: ${tr.r.picture}`);
  if (e0.expect.money) ok(T.includes(nows(e0.expect.money.slice(0, 50))), `${tag} e the money sentence is on the paper`);

  /* f · the phone */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  const wide = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, off: [...document.querySelectorAll('.calc-form input, .calc-tiles .ln-tile, .calc-pic-svg, .calc-working-t')].filter(e => { const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }).length }));
  ok(wide.sw <= wide.iw + 1 && wide.off === 0, `${tag} f the phone: nothing off the side (${wide.sw}px of ${wide.iw}), ${wide.off} box/tile/picture outside`);
  const small = await page.locator('.calc-form input').evaluateAll(es => es.filter(e => e.getBoundingClientRect().height < 36).length);
  ok(small === 0, `${tag} f the phone: every box is thumb-sized`);
  await page.setViewportSize({ width: 1360, height: 900 }); await page.waitForTimeout(300);

  /* g · renamed, deleted with what goes said, Undo */
  await pressMore(page, 'Rename'); await page.waitForTimeout(300);
  await page.getByLabel('What it is of').fill(`Renamed ${d.key}`); await page.keyboard.press('Enter'); await page.waitForTimeout(700);
  ok(flat(await page.locator('h1').first().innerText()) === `Renamed ${d.key}`, `${tag} g renamed where it sits`);
  answer = false;
  await pressMore(page, 'Delete'); await page.waitForTimeout(500);
  ok(/Delete the calculation “Renamed/.test(asked) && /figures? .*go/.test(asked), `${tag} g the ask says what goes — answered no`, asked);
  ok((await page.evaluate(async id => !!(await (await import('/src/db.ts')).getStudy(id)), id)), `${tag} g …and it is kept`);
  answer = true;
  await pressMore(page, 'Delete'); await page.waitForTimeout(1200);
  ok(!(await page.evaluate(async id => !!(await (await import('/src/db.ts')).getStudy(id)), id)) && page.url().includes(`/calc/${d.key}`), `${tag} g deleted, back on its list`);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(1000);
  const back = await page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)), id);
  ok(!!back && back.agreed.calc.key === d.key && !!back.agreed.calc.before && Object.keys(back.agreed.calc.inputs).length > 0, `${tag} g Undo: back whole — its figures and its saved before`);
}

/* ---- the line: its Tools page, its report ---- */
await go(`#/lines/${sd.wsId}?view=tools`);
const row = flat(await page.locator('.pl-tools li', { has: page.locator('b', { hasText: /^Calculators$/ }) }).first().innerText());
ok(/Calculators/.test(row) && /2 on this line/.test(row), `L the line’s Tools page lists Calculators once — "${row.slice(0, 160)}"`);
ok((await page.locator('.pl-tools li b', { hasText: /^(Kanban sizing|Safety stock|What a sampling plan protects|WIP and lead time)/ }).count()) === 0, 'L …not a row for each calculator');
await page.locator('.pl-tools li', { has: page.locator('b', { hasText: /^Calculators$/ }) }).first().locator('button.pl-tool').click(); await page.waitForTimeout(1500);
ok(page.url().includes('/calc?line=') && (await page.locator('.lt-rows .lt-li').count()) >= 2, `L its row opens the hub on this line (${page.url().split('#')[1]})`);
await go(`#/lines/${sd.wsId}?view=tools`);
await page.getByLabel('Tick Calculators').check();
await page.getByRole('button', { name: /^Line report from these/ }).click(); await page.waitForTimeout(2500);
const ticks = await page.locator('.lr-tick input').evaluateAll(xs => xs.map(x => ({ label: x.getAttribute('aria-label'), on: x.checked })));
const calcTicks = ticks.filter(t => /^(Kanban sizing|WIP and lead time|Safety stock|What a sampling plan)/.test(t.label ?? ''));
ok(calcTicks.length === 2 && calcTicks.every(t => t.on) && ticks.filter(t => t.on).length === 2, `L the line’s report has each saved calculation on the line as a record, titled by its calculator and ticked in, and nothing else ticked: ${ticks.filter(t => t.on).map(t => t.label).join(' · ')}`, ticks.map(t => `${t.on ? '[x]' : '[ ]'} ${t.label}`).join(' | '));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Download' }).click()]);
const lf = join(OUT, 'line.pdf'); await dl.saveAs(lf);
const lt = flat(execFileSync('pdftotext', ['-raw', lf, '-'], { encoding: 'utf8' }));
ok(nows(lt).includes(nows('Kanban sizing — Trays to the packer')) && nows(lt).includes(nows('8 kanbans of 60 trays')) && nows(lt).includes(nows('Little')) || nows(lt).includes(nows('WIP and lead time — Cooked trays in the chiller')), 'L the line’s paper has each calculation’s section under its calculator’s name, with its sentence');
ok(/Before → after|Before to after/.test(lt) && /How it is worked out/.test(lt), 'L …and the kanban’s saved before and its working');

/* ---- a client reads a project’s calculation, read-only, and takes its paper ---- */
const cl = await device(1360, 'client');
await cl.page.goto(`${BASE}/#/room`); await cl.page.waitForTimeout(2500);
const sd2 = await cl.page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
await cl.page.evaluate(async ([id, pid]) => { const D = await import('/src/db.ts'); await D.patchStudy(id, { projectId: pid }); }, [sd2.calcKanbanId, sd2.projectId]);
const kid = sd2.calcKanbanId;
await cl.page.goto(`${BASE}/#/calc/kanban/${kid}`); await cl.page.waitForTimeout(2500);
const ro = await cl.page.evaluate(() => ({ inputs: [...document.querySelectorAll('.calc-form input')].filter(i => !i.disabled).length, radios: [...document.querySelectorAll('.calc-form [role=radio]')].filter(i => !i.disabled).length, saveBefore: [...document.querySelectorAll('button')].some(b => /Save as before|Save these as the new before|Make it so/.test(b.textContent ?? '')), said: !!document.querySelector('.calc-ro'), sentence: document.querySelector('[data-calc=sentence]')?.textContent ?? '' }));
ok(ro.inputs === 0 && ro.radios === 0 && !ro.saveBefore && ro.said && ro.sentence.startsWith('8 kanbans of 60 trays'), `C a client sees the figures and the answer, changes none, and is told so (${JSON.stringify({ ...ro, sentence: ro.sentence.slice(0, 30) })})`);
const cpdf = await Promise.all([cl.page.waitForEvent('download', { timeout: 60000 }), pressPaper(cl.page, / — on paper$/)]);
const cf = join(OUT, 'client.pdf'); await cpdf[0].saveAs(cf);
ok(nows(flat(execFileSync('pdftotext', ['-raw', cf, '-'], { encoding: 'utf8' }))).includes(nows('8 kanbans of 60 trays')), 'C …and takes its paper');
await cl.ctx.close();

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
