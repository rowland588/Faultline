/* ACCEPTANCE — ONE INVESTIGATION, END TO END, THROUGH AI MODE (10 November; docs/AI-OPERATING.md §3, §10). Rowland, 10 November:
 * "a complete investigation workflow tested end-to-end as ONE workflow: describe the problem → establish the investigation → use and
 * populate tools → capture evidence → analyse → manage actions → final report." One conversation on the smoke seed's line, the
 * `assist` gateway played by the script round by round, every write the real capability into the real records:
 *
 *   1  DESCRIBE — "seal rejects are up" → plan_investigation: PDCA's sections in order, each with its tools and its questions
 *   2  ESTABLISH — start_project (one card): a PDCA project on the line, shown in the work pane
 *   3  ANSWER — answer_method into that project with NO card (said yes to when it was started): kept as the sheet's own answer
 *   4  POPULATE — start_study (a card): a capability study in the project with its limits; thirty readings added with NO card
 *   5  EVIDENCE — start_measurement of the line's stops (one card), a stop said and its end said, captured with NO card on the line
 *   6  ANALYSE — run_analysis on the study: the Analysis tool's own sentence from its readings
 *   7  ACTIONS — raise_problem (a card) on the line in the project with who and by when; a step on its journey with NO card; the
 *      project's Actions read in Manual Mode list it
 *   8  REPORT — make_report project: the project report opened beside the conversation, made on arrival and kept; its page carries
 *      the answer, the study's own sentence and the problem — the records, not the conversation
 *   9  MANUAL MODE — the same project opened by hand: its method page shows the answer and the study, its Actions the problem; the
 *      study's own page its thirty readings — one set of records, the app's own pages
 *
 *   node scripts/acceptance/ai-investigate.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

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
const cardsOf = name => page.locator(`[data-card="${name}"]`).count();
const waiting = () => page.locator('[data-card-status="waiting"]').count();
const doIt = async name => {
  await page.waitForSelector(`[data-card="${name}"][data-card-status="waiting"]`, { timeout: 10000 }).catch(() => undefined);
  const c = page.locator(`[data-card="${name}"][data-card-status="waiting"]`).last();
  const n = await c.count();
  if (n) await c.getByRole('button', { name: 'Do it' }).click();
  return n === 1;
};
const db = (fn, arg) => page.evaluate(fn, arg);
const frame = () => page.frame({ name: 'fl-work' });
const frameText = async (ms = 10000, path = '', re = null) => {
  const end = Date.now() + ms;
  let txt = '';
  while (Date.now() < end) {
    const f = frame();
    if (f && (!path || decodeURIComponent(f.url()).includes(path))) { try { txt = await f.evaluate(() => document.body.innerText); if (txt.trim().length > 40 && (!re || re.test(txt))) return txt; } catch { /* loading */ } }
    await page.waitForTimeout(300);
  }
  return txt;
};
let turns = 0;
const round = async (words, rounds, card) => {
  plan = rounds;
  await send(words);
  if (card) ok(await doIt(card), `the write is a card first: ${card}`);
  turns += 1;
  await answered(turns);
};
const lastResults = () => asks.at(-1)?.pending?.results ?? [];
const one = (id, name, input) => () => ({ ok: true, reply: '', calls: [{ id, name, input }], assistant: { v: 1 } });
const then = words => () => ({ ok: true, reply: words });

await t.go(`#/ai?line=${encodeURIComponent(sd.wsId)}`, 3000);

/* ---- 1 · DESCRIBE — the investigation planned ---- */
const WORDS = 'Seal rejects on the sealer are up — I want to investigate it properly';
await round(WORDS, [one('p1', 'plan_investigation', { words: WORDS, method: 'pdca', lineId: sd.wsId }), then('PDCA fits: plan, do, check, act.')]);
const planned = lastResults()[0];
const planData = planned?.data ?? {};
const steps = planData.steps ?? [];
ok(planned?.ok && steps.length >= 4 && steps[0].section === 'Plan', `1 plan_investigation: PDCA's sections in order (${steps.map(s => s.section).join(' → ')})`);
ok(steps[0]?.asks?.length > 0 && steps.some(s => (s.tools ?? []).length > 0), '1 each step with its questions and its tools');

/* ---- 2 · ESTABLISH — the project ---- */
await round('Yes, start it as a PDCA project on this line', [one('s1', 'start_project', { name: 'Seal rejects — sealer', method: 'pdca', lineIds: [sd.wsId] }), then('Started.')], 'start_project');
const pid = lastResults()[0]?.data?.id;
const proj = await db(async id => (await (await import('/src/db.ts')).getProject(id)), pid);
const onLine = await db(async ({ pid, ws }) => (await (await import('/src/db.ts')).projectWorkspaceIds(pid)).includes(ws), { pid, ws: sd.wsId });
ok(!!pid && proj?.name === 'Seal rejects — sealer' && proj?.method === 'pdca' && onLine, `2 the PDCA project made on the line (${pid})`);

/* ---- 3 · ANSWER — the method sheet, no card ---- */
const field = await db(async () => { const m = await import('/src/lib/methodSheet.ts'); const f = m.fieldsOf('pdca', 'Plan')[0]; return { id: f.id, label: f.label }; });
const ANSWER = 'Seal rejects at 2.1% of packs against 0.5% wanted, on the sealer since the film change.';
const cardsBefore = await waiting();
await round('The problem is seal rejects at 2.1% against 0.5% since the film change', [one('a1', 'answer_method', { projectId: pid, answers: [{ field: field.label, text: ANSWER }] }), then('Written on the plan.')]);
ok((await waiting()) === 0 && (await waiting()) === cardsBefore, '3 answer_method into the project said yes to — no card');
const ans = await db(async ({ pid, fid }) => { const m = await import('/src/lib/methodSheet.ts'); return (await (await import('/src/db.ts')).listTestItems(pid)).find(x => x.testId === m.answerScope('pdca', fid))?.what; }, { pid, fid: field.id });
ok(ans === ANSWER, `3 the answer kept as the sheet keeps it ("${field.label}")`);

/* ---- 4 · POPULATE — a capability study with its readings ---- */
await round('Start a capability study of seal strength on the sealer, 15 to 25 newtons', [one('c1', 'start_study', { tool: 'capability', lineId: sd.wsId, projectId: pid, name: 'Seal strength', machine: 'Sealer', setup: { kind: 'limits', unit: 'N', lower: 15, upper: 25, nominal: 20 } }), then('Started — say the readings.')], 'start_study');
const sid = lastResults()[0]?.data?.studyId;
const xs = Array.from({ length: 30 }, (_, i) => Math.round((20 + ((i * 7) % 11 - 5) / 4) * 10) / 10);
const cardsBefore4 = await waiting();
await round(`Readings: ${xs.join(', ')}`, [one('r1', 'add_readings', { studyId: sid, values: xs }), then('Thirty in.')]);
ok((await waiting()) === 0 && (await waiting()) === cardsBefore4, '4 readings into the study just said yes to — no card');
const study = await db(async id => (await (await import('/src/db.ts')).getStudy(id)), sid);
ok(study?.projectId === pid && study?.facts.readings?.length === 30 && JSON.stringify(study.facts.readings.map(r => r.value)) === JSON.stringify(xs), '4 the study is the project\'s, with every reading exactly as said');
ok((await page.locator('[data-work]').getAttribute('data-work-href'))?.includes(sid), '4 the study\'s own page beside the conversation');
const studySays = await db(async id => { const s = await (await import('/src/db.ts')).getStudy(id); return (await import('/src/lib/studyLinks.ts')).studyLine(s).text; }, sid);
ok(/capable|Ppk/i.test(studySays), `4 the tool reads its own readings: "${studySays.slice(0, 90)}"`);

/* ---- 5 · EVIDENCE — the line's stops timed live ---- */
await round('Time the stops on the sealer while I watch', [one('m1', 'start_measurement', { tool: 'stops', lineId: sd.wsId }), then('Timing — say each stop.')], 'start_measurement');
const obs0 = await db(async id => (await (await import('/src/db.ts')).listObservations(id)).length, sd.wsId);
await round('Sealer stopped — jaw temperature alarm', [one('e1', 'capture_event', { event: 'stopped', machine: 'Sealer', reason: 'Jaw temperature' }), then('Timing it.')]);
await page.waitForTimeout(1200);
await round('Running again', [one('e2', 'capture_event', { event: 'running' }), then('Kept.')]);
const stops = await db(async id => (await (await import('/src/db.ts')).listObservations(id)), sd.wsId);
const stop = stops.find(o => o.asset === 'Sealer' && o.category === 'Jaw temperature');
ok(stops.length === obs0 + 1 && stop && stop.durationMs >= 1000 && (await cardsOf('capture_event')) === 0, `5 the stop on the line with its time, captured with no card (${stop?.durationMs} ms)`);
await page.locator('[data-measure-end]').click(); await page.waitForTimeout(800);
ok((await page.locator('[data-measure]').count()) === 0, '5 the measurement ended');

/* ---- 6 · ANALYSE ---- */
await round('How sure are we of the mean seal strength?', [one('n1', 'run_analysis', { question: 'sure', name: 'Seal strength', unit: 'N', studyId: sid }), then('As the Analysis says.')]);
const sure = await db(async id => {
  const s = await (await import('/src/db.ts')).getStudy(id);
  const { analysisFrom } = await import('/src/capabilities/operate.ts');
  const { analysisFigures, analysisSays } = await import('/src/tools/analysis/analysis.ts');
  const b = analysisFrom({ question: 'sure', name: 'Seal strength', unit: 'N' }, s.facts.readings);
  return analysisSays(analysisFigures(b.a, b.readings), b.a).text;
}, sid);
ok(lastResults()[0]?.ok && lastResults()[0].says.startsWith(sure), `6 the Analysis tool's own sentence: "${sure.slice(0, 80)}"`);

/* ---- 7 · ACTIONS ---- */
const due = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
const PROBLEM = 'Sealer jaw temperature drifting low after the film change';
await round('Raise it: jaw temperature drifting after the film change, Sam to check the controller by next week', [one('k1', 'raise_problem', { lineId: sd.wsId, words: PROBLEM, machine: 'Sealer', priority: 'high', how: 'observed', projectId: pid, owner: 'Sam', due }), then('Raised.')], 'raise_problem');
const prob = lastResults()[0]?.data?.id;
const cardsBefore7 = await waiting();
await round('Sam has recalibrated the controller; jaws hold 180 °C now', [one('k2', 'add_journey_step', { problemId: prob, did: 'Recalibrated the jaw temperature controller', result: 'Jaws hold 180 °C' }), then('On its journey.')]);
ok((await waiting()) === 0 && (await waiting()) === cardsBefore7, '7 a step on the journey of the problem just raised — no card');
const snag = await db(async id => (await (await import('/src/db.ts')).listAllSnags()).find(s => s.id === id), prob);
ok(snag?.projectId === pid && snag?.owner === 'Sam' && snag?.dueAt != null && new Date(snag.dueAt).toISOString().slice(0, 10) === due && (snag?.journey ?? []).some(j => /Recalibrated/.test(j.did ?? '')), '7 the problem is the project\'s, with who, by when and its journey');

/* ---- 8 · REPORT ---- */
const keptBefore = await db(async () => (await (await import('/src/lib/keptPdfs.ts')).listKept()).length);
await round('Make the project report', [one('p9', 'make_report', { what: 'project', projectId: pid }), then('Being made beside us.')]);
ok((await page.locator('[data-work]').getAttribute('data-work-href')) === `/project/${pid}/method-report?save=1`, '8 the project report opened beside the conversation');
const rep = await frameText(20000, `/project/${pid}/method-report`, /Seal strength/);
ok(rep.includes('Seal strength') && rep.includes(studySays.slice(0, 40)), '8 the report carries the study in its own sentence');
ok(rep.includes(ANSWER.slice(0, 40)), '8 the report carries the plan as written on the method sheet');
const keptEnd = Date.now() + 20000;
let keptAfter = keptBefore;
while (Date.now() < keptEnd && keptAfter <= keptBefore) { await page.waitForTimeout(500); keptAfter = await db(async () => (await (await import('/src/lib/keptPdfs.ts')).listKept()).length); }
ok(keptAfter > keptBefore, '8 the paper made on arrival and kept under Saved copies');

/* ---- 8b · the combined line report, from the same records ---- */
await round('And the line report for the client', [one('p10', 'make_report', { what: 'line', lineId: sd.wsId }), then('The line report is being made.')]);
ok((await page.locator('[data-work]').getAttribute('data-work-href'))?.startsWith(`/lines/${sd.wsId}/report`), '8 the combined line report opened beside the conversation');
const lineRep = await frameText(20000, `/lines/${sd.wsId}/report`, /Seal strength/);
ok(lineRep.includes('Seal strength') && lineRep.includes(PROBLEM.slice(0, 30)), '8 the line report carries the new study and the problem raised — the records');
const keptEnd2 = Date.now() + 20000;
let kept2 = keptAfter;
while (Date.now() < keptEnd2 && kept2 <= keptAfter) { await page.waitForTimeout(500); kept2 = await db(async () => (await (await import('/src/lib/keptPdfs.ts')).listKept()).length); }
ok(kept2 > keptAfter, '8 the line report\'s paper made on arrival and kept');

/* ---- 9 · MANUAL MODE — the same records on the app's own pages ---- */
await t.go(`#/project/${pid}/actions`, 2500);
ok((await t.words('main')).includes(PROBLEM.slice(0, 30)), '9 the project\'s Actions list the problem, by hand');
await t.go(`#/project/${pid}`, 2500);
const projTxt = await t.words('main');
const boxes = await page.locator('main textarea, main input').evaluateAll(xs => xs.map(x => x.value));
ok(boxes.some(v => v === ANSWER) && /1 of 5 written/i.test(projTxt), '9 the project\'s method page shows the answer in its box, the plan counted 1 of 5 written');
ok(/Seal strength|capable|Ppk/i.test(projTxt), '9 the project\'s method page carries the study');
const href = await db(async id => { const s = await (await import('/src/db.ts')).getStudy(id); return (await import('/src/lib/studyLinks.ts')).studyHref(s); }, sid);
await t.go(`#${href}`, 2500);
ok((await t.words('main')).length > 100 && !/not found/i.test(await t.words('main')), '9 the study\'s own page opens by hand');

await t.finish('One investigation end to end through AI Mode: planned, established, answered, a study populated, stops timed live, analysed, actions raised and progressed, the project report made from the records — and every record on its own page by hand.');
