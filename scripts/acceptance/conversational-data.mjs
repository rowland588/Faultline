/* CONVERSATIONAL DATA, driven (10 November, docs/CONVERSATIONAL-DATA.md — Rowland: "I should be able to talk to Luna about a factory, a
 * production problem, a test, an experiment or a set of figures … ask questions, explore the information, challenge the results, request
 * graphs, build reports and change direction naturally"). The gateway is played by the script; every figure is checked against figures
 * the script made itself (the stops it seeded, the workbook generator's own totals).
 *
 *   1  "mechanical downtime across the three shifts on Line 2": list_sources, source_fields, query_data — "cannot be answered", the
 *      fields the stops hold named, NO result kept, no chart
 *   2  "downtime by category": a result kept with the seeded minutes; "make me a graph" — a chart card in the conversation (its picture
 *      saying the figures), version 1
 *   3  "change that to percentages", "remove Label", "go back to the original figures": versions 2, 3, 4, each card its own picture,
 *      the left-out category said; Download PNG and SVG
 *   4  two workbooks attached — each put in the register under a name; "analyse the packing line downtime workbook" asked between,
 *      never picked; "line 2's" resolved; named by card (BrilloPak Speed Trials, Luna's suggestion said); the downtime by reason
 *      equal to the generator's own totals; "now by shift" a new result from it
 *   5  "put that graph into a report", "add your findings", "an executive summary" (a figure it does not hold marked Check this),
 *      "your recommendations", "make it a presentation": the report card's sections in order, each kind in words; the PDF downloaded
 *      and read back (sections, Check this, the recommendation said as a view, what the figures rest on); the slides downloaded and read
 *      back (a slide a section, the chart as a picture)
 *   6  the gateway told what was made and what the register holds, never a cell
 *   7  the phone: the cards inside the screen, the downloads a thumb's height
 *
 *   node scripts/acceptance/conversational-data.mjs   (SMOKE_BASE, as smoke) */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  const answer = next ? next(body) : { ok: true, reply: 'Noted.' };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});
let replies = 0;
const answered = async (ms = 15000) => {
  replies++;
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), replies, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(700);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const result = (b, i = 0) => b.pending?.results?.[i];
const calls = (...cs) => () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: cs.map(([id, name, input]) => ({ id, name, input })) });
const then = reply => () => ({ ok: true, reply });
const outs = () => page.evaluate(async () => {
  const d = await import('/src/db.ts');
  const s = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return { results: s?.facts?.results ?? [], charts: s?.facts?.charts ?? [], reports: s?.facts?.reports ?? [] };
});
const DIR = join(tmpdir(), `fl-cd-${Date.now()}`);
mkdirSync(DIR, { recursive: true });
const download = async (sel) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.locator(sel).last().click()]);
  const p = join(DIR, dl.suggestedFilename());
  await dl.saveAs(p);
  return p;
};

/* Line 2 with four timed stops: Jam 10 + 5, Film 12, Label 3 — no shift recorded, no classification */
const L2 = await page.evaluate(async () => {
  const [{ addLineToFactory }, d] = await Promise.all([import('/src/lib/lines.ts'), import('/src/db.ts')]);
  const w = await addLineToFactory('Line 2');
  await d.updateWorkspace({ ...w, clientName: 'Acme Foods' });
  const T0 = Date.UTC(2026, 10, 2, 8);
  for (const [cat, min] of [['Jam', 10], ['Jam', 5], ['Film', 12], ['Label', 3]]) await d.addObservation({ id: crypto.randomUUID(), workspaceId: w.id, category: cat, asset: 'Bagger', startedAt: T0, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: T0, updatedAt: T0 });
  return w.id;
});
await t.go('#/ai', 2500);

/* ---- 1 · what cannot be said is said so ---- */
plan = [
  calls(['l', 'list_sources', { lineId: L2 }], ['f', 'source_fields', { source: `stops:${L2}` }]),
  calls(['q', 'query_data', { source: `stops:${L2}`, title: 'Mechanical downtime by shift', groupBy: ['downtime class', 'shift'], measures: [{ op: 'sum', column: 'minutes' }] }]),
  then('I can’t give you mechanical downtime by shift from Line 2’s stops: they record what stopped the line (Jam, Film, Label) but no mechanical/electrical classification, and no stop has its shift recorded. To answer it, the stops need a class and the shift — or tell me which categories you count as mechanical.'),
];
await send('What’s the downtime caused by mechanical failures across the three shifts on Line 2?');
await answered();
const fieldsSaid = asks.find(a => result(a, 1)?.says?.includes('holds —'));
ok(/shift \(text\): recorded on 0 of 4/.test(result(fieldsSaid ?? {}, 1)?.says ?? '') && /no separate downtime classification/.test(result(fieldsSaid ?? {}, 1)?.says ?? ''), '1 source_fields: the shift recorded on none of the 4 stops, no classification held');
const cannot = result(asks.at(-1)) ?? {};
ok(cannot.ok && /This cannot be answered from Line 2 — stops: it holds no “downtime class”/.test(cannot.says) && cannot.data?.answered === false, `1 query_data: cannot be answered, with what it holds: "${(cannot.says ?? '').slice(0, 140)}"`);
let o = await outs();
ok(o.results.length === 0 && (await page.locator('[data-chart]').count()) === 0, '1 no result kept and no chart — nothing invented');

/* ---- 2 · a result and a graph ---- */
let R1 = '';
plan = [
  calls(['q', 'query_data', { source: `stops:${L2}`, title: 'Downtime by category', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }] }]),
  b => { R1 = result(b)?.data?.resultId ?? ''; return calls(['c', 'make_chart', { resultId: R1, type: 'column', title: 'Line 2 downtime by category' }])(); },
  then('Jams lead with 15 minutes.'),
];
await send('Show me downtime by category, and make me a graph.');
await answered();
o = await outs();
const g = o.results[0]?.result?.groups?.map(x => [x.key[0], x.values[0]]);
ok(JSON.stringify(g) === JSON.stringify([['Jam', 15], ['Film', 12], ['Label', 3]]), `2 the result kept with the seeded minutes: ${JSON.stringify(g)}`);
const c1 = page.locator('[data-chart]').last();
ok((await c1.count()) === 1 && (await c1.getAttribute('data-chart-version')) === '1' && /Jam 15, Film 12, Label 3/.test(await c1.locator('img').getAttribute('alt') ?? ''), '2 the chart card in the conversation, version 1, its picture saying the figures');
const CH = o.charts[0]?.id;

/* ---- 3 · refined, version by version ---- */
const refine = async (words, input, version, alt) => {
  plan = [calls(['r', 'refine_chart', { chartId: CH, ...input }]), then('Done.')];
  await send(words);
  await answered();
  const last = page.locator('[data-chart]').last();
  const a = await last.locator('img').getAttribute('alt') ?? '';
  ok((await last.getAttribute('data-chart-version')) === String(version) && alt.test(a), `3 “${words}” — version ${version}: "${a.slice(0, 90)}"`);
  return last;
};
await refine('Change that to percentages.', { percent: true }, 2, /Jam 50%, Film 40%, Label 10%/);
const v3 = await refine('Remove Label.', { exclude: ['Label'] }, 3, /Jam 55\.6%, Film 44\.4%/);
ok(/Left out: Label/.test(await v3.innerText()), '3 the card says what was left out');
await refine('Go back to the original figures.', { back: 'original' }, 4, /Jam 15, Film 12, Label 3/);
ok((await page.locator('.ai-turn [data-chart]').count()) === 4, '3 every version kept in the conversation as its own picture (the pane beside it draws the current one too)');
const png = await download('[data-chart-png]');
const svgP = await download('[data-chart-svg]');
ok(readFileSync(png).subarray(1, 4).toString() === 'PNG' && /<svg[\s\S]*Line 2 downtime by category/.test(readFileSync(svgP, 'utf8')), '3 Download PNG and SVG — the picture itself');

/* ---- 4 · two workbooks, named and asked between ---- */
const W = DIR;
for (const [n, seed] of [['packing line 1 downtime', 7], ['packing line 2 downtime', 8]]) execFileSync('node', ['scripts/workbook/make-workbook.mjs', join(W, `${n}.xlsx`), '400', String(seed)]);
const exp2 = JSON.parse(readFileSync(join(W, 'packing line 2 downtime.xlsx.expected.json'), 'utf8'));
for (const n of ['packing line 1 downtime', 'packing line 2 downtime']) {
  await page.locator('input[aria-label="Choose a factory document"]').setInputFiles(join(W, `${n}.xlsx`));
  await page.waitForFunction(x => [...document.querySelectorAll('.ai-step, [role=status], .sub')].some(e => (e.textContent ?? '').includes(`It is in the register as`) && (e.textContent ?? '').includes(x)), n, { timeout: 30000 }).catch(() => undefined);
  await page.waitForTimeout(800);
}
const reg = await page.evaluate(async () => (await import('/src/capabilities/data.ts')).allSources().then(l => l.map(s => ({ id: s.id, name: s.facts.name, fileName: s.facts.fileName, fileId: s.facts.fileId, sheets: (s.facts.sheets ?? []).map(x => x.name) }))));
ok(reg.length === 2 && reg.every(s => s.sheets.includes('Downtime')), `4 both workbooks in the register under a name: ${reg.map(s => s.name).join(' · ')}`);
const two = reg.find(s => s.fileName === 'packing line 2 downtime.xlsx');
plan = [calls(['s', 'resolve_source', { words: 'the packing line downtime workbook' }]), then('Which one — packing line 1 or packing line 2?')];
await send('Analyse the packing line downtime workbook.');
await answered();
const asked = result(asks.at(-1)) ?? {};
ok(asked.data?.match === 'ask' && asked.data.candidates.length === 2 && /never pick one/.test(asked.says), '4 two could be meant — asked between, never picked');
plan = [
  calls(['s', 'resolve_source', { words: 'packing line 2 downtime' }]),
  b => calls(['n', 'name_source', { sourceId: result(b)?.data?.id, name: 'BrilloPak Speed Trials', suggested: true, description: 'Downtime log, 400 rows' }])(),
  then('Named.'),
];
await send('Line 2’s — and call it something sensible.');
await page.waitForSelector('[data-card="name_source"][data-card-status="waiting"]', { timeout: 12000 }).catch(() => undefined);
const nc = page.locator('[data-card="name_source"][data-card-status="waiting"]');
ok(/call it “BrilloPak Speed Trials” \(Luna’s suggestion\)/.test(await nc.innerText().catch(() => '')), '4 name_source a card, the name said as Luna’s suggestion');
await nc.getByRole('button', { name: 'Do it' }).click();
await answered();
plan = [
  calls(['s', 'resolve_source', { words: 'BrilloPak speed trials' }]),
  b => calls(['q', 'query_data', { source: result(b)?.data?.id, sheet: 'Downtime', title: 'Downtime by reason (BrilloPak)', groupBy: ['Reason'], measures: [{ op: 'sum', column: 'Minutes' }] }])(),
  then('Bag presentation leads.'),
];
await send('Open BrilloPak Speed Trials — downtime by reason.');
await answered();
o = await outs();
const wr = o.results.at(-1);
const byReason = Object.fromEntries((wr?.result?.groups ?? []).map(x => [x.key[0], Math.round(x.values[0] * 10) / 10]));
ok(wr?.source?.sourceId === two?.id && Object.entries(exp2.minutesByReason).every(([k, v]) => Math.abs((byReason[k] ?? -1) - v) < 0.05), `4 resolved to line 2’s workbook; every reason’s minutes equal to the generator’s own: ${JSON.stringify(byReason).slice(0, 120)}`);
plan = [calls(['q', 'query_data', { source: two?.id, sheet: 'Downtime', title: 'Rows by shift (BrilloPak)', groupBy: ['Shift'], measures: [{ op: 'count' }], from: wr?.id }]), then('Days has more.')];
await send('Now by shift.');
await answered();
o = await outs();
const shift = Object.fromEntries((o.results.at(-1)?.result?.groups ?? []).map(x => [x.key[0], x.values[0]]));
ok(shift.Days === exp2.rowsByShift.Days && shift.Nights === exp2.rowsByShift.Nights && o.results.at(-1)?.from === wr?.id, `4 a new result from it: ${JSON.stringify(shift)} = ${JSON.stringify(exp2.rowsByShift)}`);

/* ---- 5 · a report, built progressively ---- */
let D = '';
const build = async (words, input) => {
  plan = [() => calls(['b', 'build_report', { ...(D ? { reportId: D } : {}), ...input }])(), b => { D = D || result(b)?.data?.reportId; return then('Done.')(); }];
  await send(words);
  await answered();
};
await build('Put that graph into a report.', { title: 'Line 2 downtime', op: 'add', section: { kind: 'chart', heading: 'Where the time goes', chartId: CH } });
await build('Add your findings.', { op: 'add', section: { kind: 'finding', heading: 'Jams lead', text: 'Jams cost 15 minutes — 50% of the 30 recorded.', evidence: [R1] } });
await build('Give me an executive summary.', { op: 'add', after: 'start', section: { kind: 'summary', heading: 'Executive summary', text: 'Line 2 lost 30 minutes, 45 of them to jams.', evidence: [R1] } });
await build('And your recommendations.', { op: 'add', section: { kind: 'recommendation', heading: 'Next', text: 'Time the bagger jams for a week before changing anything.', by: 'luna' } });
await build('Make it a presentation instead.', { form: 'presentation' });
const card = page.locator('[data-report]').last();
const kinds = await card.locator('[data-section-kind]').evaluateAll(es => es.map(e => e.getAttribute('data-section-kind')));
ok(JSON.stringify(kinds) === JSON.stringify(['summary', 'chart', 'finding', 'recommendation']) && /Presentation D\w+ · version 6/i.test(await card.innerText()), `5 the report card: ${kinds.join(', ')}, a presentation, version 6`);
ok(/Check this: 45/.test(await card.innerText()) && /Luna’s view, not a finding/.test(await card.innerText()), '5 the summary’s 45 marked Check this; the recommendation said as a view');
/* in the conversation — since 12 November the report is also drawn as the work beside her (the pane), which is not a second card */
{ const nR = await page.locator('.ai-turn [data-report]').count(), nS = await page.locator('.ai-turn [data-report-step]').count(); ok(nR === 1 && nS === 4, `5 one live card, the earlier steps a line each (${nR} cards, ${nS} steps)`); }
const pdf = await download('[data-report-pdf]');
const text = execFileSync('pdftotext', ['-layout', pdf, '-']).toString().replace(/\s+/g, ' ');
ok(/Line 2 downtime/.test(text) && /EXECUTIVE SUMMARY|Executive summary/.test(text) && /CHECK THIS — 45/.test(text) && /A recommendation — Luna’s view, not a finding/.test(text) && /What the figures rest on/.test(text) && /Line 2 — stops: sum of minutes by category — 4 of 4 rows/.test(text), '5 the PDF read back: the sections, Check this, the view, what the figures rest on');
const pptx = await download('[data-report-pptx]');
const unz = join(DIR, 'deck'); mkdirSync(unz, { recursive: true });
execFileSync('unzip', ['-o', '-q', pptx, '-d', unz]);
const slides = readdirSync(join(unz, 'ppt', 'slides')).filter(f => f.endsWith('.xml'));
const xml = slides.map(f => readFileSync(join(unz, 'ppt', 'slides', f), 'utf8')).join(' ');
const media = (() => { try { return readdirSync(join(unz, 'ppt', 'media')).filter(f => /\.png$/i.test(f)).length; } catch { return 0; } })();
ok(slides.length === 6 && /Executive summary/.test(xml) && /Jams lead/.test(xml) && media >= 1, `5 the slides read back: ${slides.length} slides (cover, 4 sections, sources), the chart as a picture (${media})`);

/* ---- 6 · what the gateway is told ---- */
const focus = asks.at(-1)?.focus ?? '';
ok(/Files in the register/.test(focus) && /“BrilloPak Speed Trials” \(name suggested by Luna\)/.test(focus) && /Made in this conversation/.test(focus) && /Presentation D\w+ v6/.test(focus) && !/Bag presentation,\s*\d/.test(focus), '6 the gateway told the register and what was made — never a cell');

/* ---- 7 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(800);
ok((await t.wide()) <= 0, `phone: nothing off the side (${await t.wide()} px)`);
const small = await page.evaluate(() => [...document.querySelectorAll('.ai-out button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.textContent?.trim()));
ok(small.length === 0, `phone: every download a thumb’s height${small.length ? ` — ${small.join(' · ')}` : ''}`);

await t.finish('Conversational data proved: what the records cannot say said so, with nothing invented; a result, a graph and its versions; two files asked between and one named; a workbook asked by name with the generator’s own totals; a report built section by section, its figures checked, as a PDF and as slides.');
