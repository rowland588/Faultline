/* ACCEPTANCE — BUILDING TOOLS IN CONVERSATION (8 November; docs/AI-MODE.md, Building tools in conversation A · B · C;
 * src/capabilities/drafts, build; the context panel's Being built in screens/AiModeScreen; tools/doc/custom).
 * Rowland, 8 November: "The conversation itself should become the mechanism through which the application is populated …
 * show me what it has understood and populated, and confirm before committing." Driven in a real browser on the smoke seed,
 * the `assist` gateway answered by the script round by round (the capabilities run for real on the device):
 *
 *   1  his changeover: "around 42 minutes … get them down to 25 … three machines … six products … cleaning and waiting for
 *      engineering" — the colleague looks in the catalogue and offers SMED; on yes, start_draft (the panel's Being built with
 *      what is still missing as chips — one tapped starts the sentence in the box), then fill_draft: each field with its value
 *      and how it is known
 *   2  a correction — "45, not 42": the value 45 min with 42 min struck beside it, the correction sent back to the colleague
 *   3  Make it from the panel: what it will make said first, nothing written until Do it; then the SMED study on the line with
 *      its target, its elements, its products and what it has no box for in its notes, opening in Manual Mode at its own page
 *   4  a calculator filled from the conversation and made from the colleague's own make_record card: the record's sentence is
 *      the calculator's own
 *   5  a custom "Downtime capture sheet": sections, fields and a ratio metric built, filled, the metric as code works it in the
 *      panel, made, opened in Manual Mode as a document of its own structure, and its paper read back with the metric's value
 *   6  a client (access forced) on a project: Being built shown, no Make it offered, and the colleague's make_record refused
 *      before any card
 *
 *   node scripts/acceptance/ai-build.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper as pressPaper } from '../lib/pageHeader.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  const answer = next ? next(body) : { ok: false, why: 'nothing planned' };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});
const answered = async (n, ms = 12000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(500);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const result = (b, i = 0) => b.pending?.results?.[i];
const dataOf = (b, i = 0) => result(b, i)?.data ?? {};
const lastReply = () => t.words('.ai-turn.is-colleague:last-of-type .ai-words');
const dbStudies = () => page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).map(s => ({ id: s.id, tool: s.tool, name: s.name, workspaceId: s.workspaceId, projectId: s.projectId, agreed: s.agreed, facts: s.facts })));
const field = name => `[data-ctx-built] [data-field="${name}"]`;

/* ---- 1 · the changeover, offered and filled ---- */
await t.go(`#/ai?line=${encodeURIComponent(sd.wsId)}`, 2500);
const said = 'Changeover times on this packing line are around 42 minutes and we need to get them down to 25. There are three machines on the line, we change between six products. The biggest delays seem to be cleaning and waiting for engineering.';
plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 'k1', name: 'tool_catalogue', input: { words: 'changeover' } }], assistant: { v: 1 } }),
  b => ({ ok: true, reply: /SMED/.test(result(b)?.says ?? '') ? 'That is what a SMED study is for — shall I set one up on this line and fill it in as we talk?' : 'No tool came back.' }),
];
await send(said);
await answered(1);
ok(asks[0]?.turns?.at(-1)?.text === said && /SMED/.test(result(asks[1])?.says ?? '') && JSON.stringify(dataOf(asks[1])).includes('"key":"smed"'), '1 the catalogue read at once and SMED among what fits a changeover');
ok(/SMED study/.test(await lastReply()), '1 the colleague offers SMED in a sentence, and builds nothing yet');
ok((await page.locator('[data-ctx-built]').count()) === 0, '1 nothing is being built before the yes');

let draftId = '';
plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 's1', name: 'start_draft', input: { kind: 'smed', key: 'smed', title: 'Line changeovers' } }], assistant: { v: 1 } }),
  b => { draftId = dataOf(b).draftId ?? ''; return { ok: true, reply: 'Set up — now the figures you gave me.' }; },
];
await send('Yes, set it up');
await answered(2);
ok(!!draftId && (await page.locator(`[data-ctx-built] [data-draft="${draftId}"]`).count()) === 1, `1 start_draft: Being built shows the SMED draft (${draftId.slice(0, 8)})`);
ok(/a draft — nothing kept as a record yet/.test(await t.words(`[data-draft="${draftId}"] .ai-draft-t`)), '1 said to be a draft, not a record');
const misses = await page.locator(`[data-draft="${draftId}"] [data-missing]`).evaluateAll(es => es.map(e => e.getAttribute('data-missing')));
ok(JSON.stringify(misses) === JSON.stringify(['current', 'target', 'elements']), `1 still missing as chips: ${misses.join(', ')}`);
await page.locator(`[data-draft="${draftId}"] [data-missing="target"]`).click();
ok((await page.locator('.ai-box').inputValue()) === 'The minutes it must come in at: ', '1 a missing chip starts the sentence in the box');
ok(((await dbStudies()).filter(s => s.tool === 'changeover' && s.name === 'Line changeovers')).length === 0, '1 no record yet');

plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'f1', name: 'fill_draft', input: { draftId, values: [
    { field: 'current', value: 42, how: 'reported', said: 'around 42 minutes' }, { field: 'target', value: 25, how: 'reported', said: 'get them down to 25' },
    { field: 'machineCount', value: 3, how: 'reported' }, { field: 'productCount', value: 6, how: 'reported' },
    { field: 'elements', value: ['Cleaning', 'Waiting for engineering'], how: 'reported', said: 'the biggest delays seem to be' },
  ] } }] }),
  b => ({ ok: true, reply: result(b)?.ok ? 'In. Which product change takes the longest?' : `Not kept: ${result(b)?.says}` }),
];
await send('Fill it in from what I said');
await answered(3);
ok(/Kept: /.test(result(asks.at(-1))?.says ?? ''), `1 fill_draft kept: "${(result(asks.at(-1))?.says ?? '').slice(0, 110)}"`);
const cur = await t.words(field('current'));
ok(/42 min/.test(cur) && /Reported/.test(cur), `1 the minutes now with how known: "${cur}"`);
ok(/25 min/.test(await t.words(field('target'))), '1 the target, 25 min');
ok(/Cleaning; Waiting for engineering/.test(await t.words(field('elements'))) && /3/.test(await t.words(field('machineCount'))) && /6/.test(await t.words(field('productCount'))), '1 the elements by name, three machines, six products — no time invented');
ok((await page.locator(`[data-draft="${draftId}"] [data-missing]`).count()) === 0 && /Everything it needs is there/.test(await t.words(`[data-draft="${draftId}"]`)), '1 nothing required is missing now');
ok(/Being built \[draft /.test(asks.at(-1)?.focus ?? ''), '1 the next round’s focus carries the draft for the colleague');

/* ---- 2 · a correction ---- */
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'f2', name: 'fill_draft', input: { draftId, values: [{ field: 'current', value: 45, how: 'reported', said: '45, not 42' }] } }] }),
  b => ({ ok: true, reply: /42 min → 45 min/.test(result(b)?.says ?? '') ? 'Put right — 45 minutes.' : 'Not corrected.' }),
];
await send('Sorry — it is 45, not 42');
await answered(4);
ok(/Put right/.test(await lastReply()), '2 the correction said back to the colleague: 42 min → 45 min');
ok(/45 min/.test(await t.words(field('current'))) && (await t.words(`${field('current')} s[data-earlier]`)) === '42 min', '2 45 min shown with 42 min struck beside it');

/* ---- 3 · Make it, from the panel ---- */
await page.locator(`[data-draft="${draftId}"] [data-make]`).click();
await page.waitForSelector(`[data-draft="${draftId}"] [data-draft-card]`, { timeout: 5000 }).catch(() => undefined);
const preview = await t.words(`[data-draft="${draftId}"] [data-draft-card]`);
ok(/Make a SMED — quick changeover SMED study called “Line changeovers”/.test(preview) && /target|must come in at 25 min/i.test(preview), `3 what it will make is said first: "${preview.slice(0, 140)}"`);
ok(((await dbStudies()).filter(s => s.tool === 'changeover' && s.name === 'Line changeovers')).length === 0, '3 nothing written while the card waits');
await page.locator(`[data-draft="${draftId}"] [data-draft-card]`).getByRole('button', { name: 'Do it' }).click();
await page.waitForSelector(`[data-draft="${draftId}"][data-draft-status="made"]`, { timeout: 8000 }).catch(() => undefined);
const smed = (await dbStudies()).find(s => s.tool === 'changeover' && s.name === 'Line changeovers');
ok(!!smed && smed.workspaceId === sd.wsId && smed.agreed?.changeover?.minutes === 25, '3 Do it: the SMED study made on the line with its target, 25 min');
ok(JSON.stringify(smed?.facts?.sequence?.map(x => [x.name, x.sec ?? null])) === JSON.stringify([['Cleaning', null], ['Waiting for engineering', null]]), '3 its elements by name, untimed');
ok((smed?.facts?.remarks ?? []).some(r => /45 min now — reported/.test(r.text)) && (smed?.facts?.remarks ?? []).some(r => /3 machines are on the line/.test(r.text)) && (smed?.facts?.remarks ?? []).some(r => /6 products/.test(r.text)), '3 what SMED has no box for is in its notes, with how it is known');
ok((await page.locator('[data-ctx-sources] .ai-ref[data-ref^="study:"]').count()) >= 1, '3 the record listed under Sources');
await page.locator(`[data-draft="${draftId}"] [data-open-made]`).click(); await page.waitForTimeout(2500);
const smedPage = t.norm(await page.locator('.nv-main').innerText());
const mustIn = await page.getByLabel('It must come in at', { exact: true }).inputValue().catch(() => '');
ok(page.url().includes(smed?.id ?? '§') && /Cleaning/.test(smedPage) && /Waiting for engineering/.test(smedPage) && /^25(\.0)? min$/.test(mustIn), `3 Open it: the SMED study at its own page in Manual Mode — It must come in at ${mustIn}, its elements (${page.url().split('#')[1]})`);
await page.goBack(); await page.waitForTimeout(2500);

/* ---- 4 · a calculator, made from the colleague's own card ---- */
const kanban = await page.evaluate(async () => { const d = (await import('/src/tools/calc/registry.ts')).calcByKey('kanban'); return { inputs: d.examples[0].inputs, sentence: d.examples[0].expect.sentence }; });
let calcDraft = '';
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'c1', name: 'start_draft', input: { kind: 'calc', key: 'kanban', title: 'Tray kanban' } }] }),
  b => { calcDraft = dataOf(b).draftId; return { ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'c2', name: 'fill_draft', input: { draftId: calcDraft, values: Object.entries(kanban.inputs).map(([f, v]) => ({ field: f, value: v, how: 'reported' })) } }] }; },
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'c3', name: 'make_record', input: { draftId: calcDraft } }] }),
  b => ({ ok: true, reply: result(b)?.ok ? 'Made — it is with the calculators.' : `Not made: ${result(b)?.says}` }),
];
await send('How many kanbans for the trays? Usage and the rest as I said earlier.');
await page.waitForSelector('[data-card="make_record"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const card = page.locator('[data-card="make_record"][data-card-status="waiting"]');
ok((await card.count()) === 1 && /Make a Kanban/i.test(await card.innerText()), `4 make_record is a card: "${(await card.innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 120)}"`);
await card.getByRole('button', { name: 'Do it' }).click();
await answered(5);
const calc = (await dbStudies()).find(s => s.tool === 'calc' && s.name === 'Tray kanban');
const calcSays = calc ? await page.evaluate(async id => { const [{ getStudy }, { calcSays }] = await Promise.all([import('/src/db.ts'), import('/src/tools/calc/calc.ts')]); return calcSays(await getStudy(id)).text; }, calc.id) : '';
ok(!!calc && calc.workspaceId === sd.wsId && Object.entries(kanban.inputs).every(([k, v]) => calc.agreed?.calc?.inputs?.[k] === v), '4 the calculation kept on the line with the figures said');
ok(calcSays.includes(kanban.sentence.slice(0, 40)), `4 its sentence is the calculator’s own: "${calcSays.slice(0, 90)}"`);
ok(/Made — it is with the calculators/.test(await lastReply()), '4 the colleague says it is made only after the result');

/* ---- 5 · a custom sheet ---- */
let sheetDraft = '';
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'x1', name: 'create_sheet', input: {
    title: 'Downtime capture sheet', purpose: 'What stopped the line, for how long, and what share of the shift it took',
    sections: [
      { title: 'The shift', fields: [{ name: 'shift', label: 'Shift', type: 'choice', options: ['Days', 'Nights'] }, { name: 'planned', label: 'Planned minutes', type: 'number', unit: 'min', required: true }] },
      { title: 'The stops', fields: [{ name: 'stops', label: 'Stops', type: 'list', columns: [{ name: 'what', label: 'What stopped', type: 'text' }, { name: 'min', label: 'Minutes', type: 'number', unit: 'min' }] }] },
    ],
    metrics: [{ name: 'Share of the shift down', kind: 'ratio', of: ['stops.min', 'planned'], unit: '%' }, { name: 'Minutes down', kind: 'sum', of: ['stops.min'], unit: 'min' }],
  } }] }),
  b => { sheetDraft = dataOf(b).draftId; return { ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'x2', name: 'fill_draft', input: { draftId: sheetDraft, values: [
    { field: 'shift', value: 'Nights', how: 'reported' }, { field: 'planned', value: 450, how: 'reported' },
    { field: 'stops', value: [{ what: 'Film break', min: 12 }, { what: 'Jam at the infeed', min: 33 }], how: 'measured' },
  ] } }] }; },
  b => ({ ok: true, reply: /Share of the shift down 10%/.test(result(b)?.says ?? '') ? 'Faultline works the share out as 10%.' : 'No share yet.' }),
];
await send('No tool for this — I want a downtime capture sheet: the shift, its planned minutes, each stop and its minutes, and the share of the shift we were down.');
await answered(6);
ok(!!sheetDraft && (await page.locator(`[data-draft="${sheetDraft}"][data-draft-kind="custom"]`).count()) === 1, '5 create_sheet: the custom sheet being built');
ok(/10%/.test(await t.words(`[data-draft="${sheetDraft}"] [data-metric="Share of the shift down"]`)) && /45 min/.test(await t.words(`[data-draft="${sheetDraft}"] [data-metric="Minutes down"]`)), '5 its metrics as Faultline works them: 10% of the shift, 45 min');
ok(/works the share out as 10%/.test(await lastReply()), '5 the colleague quotes the figure the code worked out');
await page.locator(`[data-draft="${sheetDraft}"] [data-make]`).click();
await page.waitForSelector(`[data-draft="${sheetDraft}"] [data-draft-card]`, { timeout: 5000 }).catch(() => undefined);
await page.locator(`[data-draft="${sheetDraft}"] [data-draft-card]`).getByRole('button', { name: 'Do it' }).click();
await page.waitForSelector(`[data-draft="${sheetDraft}"][data-draft-status="made"]`, { timeout: 8000 }).catch(() => undefined);
const sheet = (await dbStudies()).find(s => s.tool === 'doc' && s.name === 'Downtime capture sheet');
ok(!!sheet && sheet.agreed?.doc?.def === 'custom' && sheet.facts?.customDef?.metrics?.length === 2 && sheet.facts?.docValues?.planned === 450, '5 made: a document of its own structure, the values in it');
await page.locator(`[data-draft="${sheetDraft}"] [data-open-made]`).click(); await page.waitForTimeout(2500);
ok(page.url().includes(`/doc/custom/${sheet?.id}`) && (await page.locator('[data-doc-custom]').count()) === 1, '5 opened in Manual Mode as a document, saying it is a custom sheet');
const docPage = t.norm(await page.locator('.nv-main').innerText());
ok(/Share of the shift down/.test(docPage) && /10%/.test(docPage) && (await page.locator('input[aria-label], .doc-body input').count()) > 0, '5 its boxes on the page to edit, its metric worked out beside them');
const pdf = await t.pdfText(() => pressPaper(page, / — on paper$/), 'sheet');
ok(/Downtime capture sheet/.test(pdf) && /Share of the shift down/.test(pdf) && /10%/.test(pdf) && /Film break/.test(pdf), `5 the paper read back: the sheet, its rows, the metric's value (${pdf.length} chars)`);
await page.goBack(); await page.waitForTimeout(2000);

/* ---- 6 · a client is offered no Make it ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await t.go(`#/ai?project=${encodeURIComponent(sd.projectId)}`, 500);
await page.reload(); await page.waitForTimeout(2500);
let clientDraft = '';
plan = [
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'y1', name: 'start_draft', input: { kind: 'smed', key: 'smed', title: 'Client changeover' } }] }),
  b => { clientDraft = dataOf(b).draftId; return { ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'y2', name: 'fill_draft', input: { draftId: clientDraft, values: [{ field: 'current', value: 30, how: 'reported' }, { field: 'target', value: 10, how: 'reported' }, { field: 'elements', value: ['Cleaning'], how: 'reported' }] } }] }; },
  () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: [{ id: 'y3', name: 'make_record', input: { draftId: clientDraft } }] }),
  b => ({ ok: true, reply: result(b)?.ok ? 'Made.' : 'Not offered.' }),
];
await send('Our changeovers take 30 minutes; we want 10.');
await answered(1);
ok(!!clientDraft && (await page.locator(`[data-draft="${clientDraft}"]`).count()) === 1, '6 a client sees what is being built');
ok((await page.locator(`[data-draft="${clientDraft}"] [data-make]`).count()) === 0 && (await page.locator(`[data-draft="${clientDraft}"] [data-draft-readonly]`).count()) === 1, '6 no Make it for a client — said in words');
ok((await page.locator('[data-card-refused="make_record"]').count()) === 1 && (await page.locator('[data-card="make_record"][data-card-status="waiting"]').count()) === 0, '6 the colleague’s make_record refused before any card');
ok(!(await dbStudies()).some(s => s.name === 'Client changeover'), '6 nothing made');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- the phone: the panel's sheet ---- */
await page.setViewportSize({ width: 390, height: 844 });
await t.go(`#/ai?line=${encodeURIComponent(sd.wsId)}`, 1500);
await page.locator('.ai-conv').first().click().catch(() => undefined);
await page.locator('.ai-list-b').click().catch(() => undefined);
await page.waitForTimeout(500);
const firstConv = page.locator('.sheet .ai-conv').last();
if (await firstConv.count()) { await firstConv.click(); await page.waitForTimeout(1500); }
await page.locator('.ai-strip').click(); await page.waitForTimeout(700);
const built = page.locator('.sheet [data-ctx-built]');
ok((await built.count()) === 1 && (await t.wide()) <= 0, `phone: Being built in the context sheet, nothing off the side (${await t.wide()} px)`);
const small = await page.evaluate(() => [...document.querySelectorAll('.sheet [data-ctx-built] button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.textContent?.trim().slice(0, 30)));
ok(small.length === 0, `phone: every press in Being built 44 px or more${small.length ? ` — ${small.join(' · ')}` : ''}`);

await t.finish('Building tools in conversation proved: SMED offered, filled, corrected and made; a calculator made from the colleague’s card; a custom sheet with a code-worked metric made, opened and printed; a client offered no Make it.');
