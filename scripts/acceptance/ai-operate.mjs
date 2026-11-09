/* ACCEPTANCE — AI MODE OPERATES THE APPLICATION (10 November; docs/AI-OPERATING.md; src/capabilities/connectors, operate.ts,
 * lib/pane, screens/AiModeScreen WorkPane · MeasureStrip). Rowland, 10 November: "I want to be able to talk to Faultline about an
 * operational problem and have it intelligently use the entire application to do the work with me … When the AI populates a study,
 * I want to be able to see the real study and its information being populated … confirm once when starting the measurement. Once
 * authorised, spoken events should be captured directly … correct, undo and review recorded events." Driven in a real browser on
 * the smoke seed, the `assist` gateway answered by the script round by round:
 *
 *   1  MEASURE — Stops timed started with one card (Do it); the capture screen of the line shown in the work pane (the real page,
 *      in its frame, no menu); "the wrapper has stopped, film break" captured with NO card — the line's stopwatch running, as its
 *      own Stopped does; "running again" an observation with its time; the strip counting; Undo from the strip takes it off the
 *      line; Review lists every event with its time and what was taken back; End stops it and the strip goes
 *   2  FILL — readings said added to the seeded capability study (a card) and its own page shown with them; read_record and
 *      run_analysis on that record answered in the Analysis tool's own words
 *   3  REPORT — make_report of the study opens its page with ?save=1 and the app's own paper is made and kept (Saved copies)
 *   4  ONE COLLEAGUE — a document written in the conversation kept as a Line Talk (a card), its document page shown; a flow
 *      diagram said aloud made as the process flow chart's own record (a card), its page shown with the calculator's sentence
 *   5  INVESTIGATE — plan_investigation answered with a method's sections and their tools; the kinds of work said apart by tool_guide
 *   6  the phone at 390: the work pane over the conversation with its way back, the strip's presses 44 px, nothing off the side
 *
 *   node scripts/acceptance/ai-operate.mjs   (SMOKE_BASE, as smoke) */
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
const doIt = async name => {
  await page.waitForSelector(`[data-card="${name}"][data-card-status="waiting"]`, { timeout: 10000 }).catch(() => undefined);
  const c = page.locator(`[data-card="${name}"][data-card-status="waiting"]`).last();
  const n = await c.count();
  if (n) await c.getByRole('button', { name: 'Do it' }).click();
  return n === 1;
};
const db = (fn, arg) => page.evaluate(fn, arg);
const frame = () => page.frame({ name: 'fl-work' });
/* the frame's words once it shows `path` (and, if given, words matching `re`) — the pane reloads as a new page is shown */
const frameText = async (ms = 8000, path = '', re = null) => {
  const end = Date.now() + ms;
  let txt = '';
  while (Date.now() < end) {
    const f = frame();
    if (f && (!path || decodeURIComponent(f.url()).includes(path))) { try { txt = await f.evaluate(() => `${document.body.innerText}\n${[...document.querySelectorAll('input, textarea')].map(x => x.value).join('\n')}`); if (txt.trim().length > 40 && (!re || re.test(txt))) return txt; } catch { /* loading */ } }
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

const lineName = await db(async id => (await (await import('/src/db.ts')).getWorkspace(id))?.name, sd.wsId);
await t.go(`#/ai?line=${encodeURIComponent(sd.wsId)}`, 3000);

/* ---- 1 · MEASURE — confirmed once, then captured as said ---- */
await round('I want to time the stops on this line', [
  () => ({ ok: true, reply: '', calls: [{ id: 'm1', name: 'start_measurement', input: { tool: 'stops', lineId: sd.wsId } }], assistant: { v: 1 } }),
  b => ({ ok: true, reply: b.pending?.results?.[0]?.ok ? 'Timing stops — say each one as it happens.' : 'Could not start.' }),
], 'start_measurement');
ok((await page.locator('[data-card="start_measurement"]').first().innerText()).includes('without asking each time'), '1 the one card says what happens from now — captured without asking each time');
ok((await page.locator('[data-measure]').count()) === 1 && /Stops timed on/.test(await t.words('[data-measure]')), `1 the strip says the measurement is running: "${(await t.words('[data-measure]')).slice(0, 70)}"`);
ok((await page.locator('[data-work]').getAttribute('data-work-href')) === `/w/${sd.wsId}/capture`, '1 the work pane shows the line’s own capture screen');
const capTxt = await frameText();
ok(capTxt.length > 40 && (await frame()?.locator('.nv-rail, .nv-top').count()) === 0, '1 the real page in its frame, with no menu or top bar of its own');
const obs0 = await db(async id => (await (await import('/src/db.ts')).listObservations(id)).length, sd.wsId);
await round('The wrapper has stopped — film break', [
  () => ({ ok: true, reply: '', calls: [{ id: 'e1', name: 'capture_event', input: { event: 'stopped', machine: 'Wrapper', reason: 'Film break' } }], assistant: { v: 1 } }),
  () => ({ ok: true, reply: 'Wrapper, film break — timing it.' }),
]);
ok((await page.locator('[data-card="capture_event"]').count()) === 0, '1 the event captured with no card');
const timer = await db(async id => (await (await import('/src/db.ts')).getWorkspace(id))?.activeTimer, sd.wsId);
ok(timer?.asset === 'Wrapper' && timer?.category === 'Film break', '1 the line’s stopwatch is running, as its own Stopped does');
await page.waitForTimeout(1500);
await round('Running again', [
  () => ({ ok: true, reply: '', calls: [{ id: 'e2', name: 'capture_event', input: { event: 'running' } }], assistant: { v: 1 } }),
  () => ({ ok: true, reply: 'Kept.' }),
]);
const obs1 = await db(async id => (await (await import('/src/db.ts')).listObservations(id)), sd.wsId);
const kept = obs1.find(o => o.asset === 'Wrapper' && o.category === 'Film break' && o.timing === 'stopwatch');
ok(obs1.length === obs0 + 1 && kept && kept.durationMs >= 1000, `1 running again keeps the stop on the line with its time (${kept?.durationMs} ms)`);
ok(/2 captured/.test(await t.words('[data-measure]')), `1 the strip counts what was captured: "${(await t.words('[data-measure]')).slice(0, 90)}"`);
await page.locator('[data-measure-undo]').click(); await page.waitForTimeout(800);
ok((await db(async id => (await (await import('/src/db.ts')).listObservations(id)).length, sd.wsId)) === obs0, '1 Undo on the strip takes the stop off the line');
await page.locator('[data-measure-review]').click(); await page.waitForTimeout(500);
const rows = page.locator('[data-measure-list] li');
ok((await rows.count()) === 2 && /taken back/.test(await rows.nth(1).innerText()) && /\d\d:\d\d:\d\d/.test(await rows.nth(0).innerText()), '1 Review lists each event with its time, the one taken back said so');
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
await page.locator('[data-measure-end]').click(); await page.waitForTimeout(800);
ok((await page.locator('[data-measure]').count()) === 0, '1 End stops it — the strip goes');

/* ---- 2 · FILL and ANALYSE ---- */
const cap = sd.studyId;
const capBefore = await db(async id => ((await (await import('/src/db.ts')).getStudy(id))?.facts.readings ?? []).length, cap);
const xs = [20.1, 19.8, 20.3, 20.0, 19.9, 20.2, 20.4, 19.7, 20.1, 20.0];
await round('Add these seal readings', [
  () => ({ ok: true, reply: '', calls: [{ id: 'r1', name: 'add_readings', input: { studyId: cap, values: xs } }], assistant: { v: 1 } }),
  () => ({ ok: true, reply: 'Added.' }),
], 'add_readings');
const capAfter = await db(async id => ((await (await import('/src/db.ts')).getStudy(id))?.facts.readings ?? []), cap);
ok(capAfter.length === capBefore + 10 && JSON.stringify(capAfter.slice(-10).map(r => r.value)) === JSON.stringify(xs), '2 the readings are in the study, each exactly as said');
ok((await page.locator('[data-work]').getAttribute('data-work-href'))?.includes(cap), '2 the study’s own page is shown beside the conversation');
await round('How sure are we of the mean?', [
  () => ({ ok: true, reply: '', calls: [{ id: 'a1', name: 'read_record', input: { studyId: cap } }, { id: 'a2', name: 'run_analysis', input: { question: 'sure', name: 'Seal strength', unit: 'N', studyId: cap } }], assistant: { v: 1 } }),
  b => ({ ok: true, reply: 'As the Analysis says.', _seen: b }),
]);
const res = asks.at(-1)?.pending?.results ?? [];
const sure = await db(async ({ id }) => {
  const { getStudy } = await import('/src/db.ts');
  const { analysisFrom } = await import('/src/capabilities/operate.ts');
  const { analysisFigures, analysisSays } = await import('/src/tools/analysis/analysis.ts');
  const s = await getStudy(id);
  const b = analysisFrom({ question: 'sure', name: 'Seal strength', unit: 'N' }, s.facts.readings);
  return analysisSays(analysisFigures(b.a, b.readings), b.a).text;
}, { id: cap });
ok(res[0]?.ok && res[1]?.ok && res[1].says.startsWith(sure), `2 run_analysis is the Analysis tool’s own sentence: "${sure.slice(0, 80)}"`);
ok(/readings/.test(res[0]?.says ?? ''), '2 read_record reads the study with its readings');

/* ---- 3 · REPORT — the app's own paper ---- */
const keptBefore = await db(async () => (await (await import('/src/lib/keptPdfs.ts')).listKept()).length);
await round('Make the report for that study', [
  () => ({ ok: true, reply: '', calls: [{ id: 'p1', name: 'make_report', input: { what: 'record', studyId: cap } }], assistant: { v: 1 } }),
  () => ({ ok: true, reply: 'It is being made beside us.' }),
]);
ok(/\?save=1$/.test((await page.locator('[data-work]').getAttribute('data-work-href')) ?? ''), '3 the study’s page opened to make its paper on arrival');
let keptAfter = keptBefore;
for (let i = 0; i < 30 && keptAfter === keptBefore; i++) { await page.waitForTimeout(500); keptAfter = await db(async () => (await (await import('/src/lib/keptPdfs.ts')).listKept()).length); }
ok(keptAfter === keptBefore + 1, `3 the app’s own paper made and kept under Saved copies (${keptBefore} → ${keptAfter})`);

/* ---- 4 · ONE COLLEAGUE — Line Talk's document and diagrams ---- */
const document = { title: `${lineName} — walk`, kind: 'line-walk', status: { state: 'watch', line: 'Wrapper stopping on film' }, sections: [
  { heading: 'What is not as it should be', icon: '🚨', text: '', points: [{ text: 'The wrapper stops on the film splice', basis: 'observed', state: 'problem', owner: '', due: '' }], photos: [] },
  { heading: 'What we are doing about it', icon: '🔧', text: '', points: [{ text: 'Check the splice tape', basis: 'interpretation', state: 'action', owner: 'Owner not named yet', due: '' }], photos: [] }] };
await round('Write that up as a walk report', [
  () => ({ ok: true, reply: '', calls: [{ id: 'd1', name: 'write_document', input: { document, lineId: sd.wsId } }], assistant: { v: 1 } }),
  () => ({ ok: true, reply: 'Kept — it is beside us.' }),
], 'write_document');
const docHref = (await page.locator('[data-work]').getAttribute('data-work-href')) ?? '';
ok(/^\/talk\/[^?]+\?doc=/.test(docHref), `4 the document kept as a Line Talk and its document page shown (${docHref.slice(0, 40)}…)`);
const docWords = await frameText(10000, docHref.split('?')[0], /film splice/);
ok(/film splice/.test(docWords), `4 the document page in the pane reads as written (${docWords.slice(0, 80).replace(/\n/g, ' ')})`);
const capture = { title: 'Tray, oven to pallet', steps: [
  { what: 'Cook', kind: 'operation', time: 20, timeUnit: 'minutes', dist: null, distUnit: '' },
  { what: 'To the chiller', kind: 'transport', time: 90, timeUnit: 'seconds', dist: 40, distUnit: 'metres' },
  { what: 'Chill', kind: 'storage', time: 4, timeUnit: 'hours', dist: null, distUnit: '' }] };
await round('Draw that as a flow diagram', [
  () => ({ ok: true, reply: '', calls: [{ id: 'g1', name: 'draw_diagram', input: { set: 'flow', capture, lineId: sd.wsId } }], assistant: { v: 1 } }),
  () => ({ ok: true, reply: 'Made — the chart is beside us.' }),
], 'draw_diagram');
const flowHref = (await page.locator('[data-work]').getAttribute('data-work-href')) ?? '';
ok(/^\/calc\/process-flow\//.test(flowHref), `4 the flow diagram is the process flow chart’s own record (${flowHref})`);
const flowWords = await frameText(10000, flowHref, /To the chiller/);
ok(/To the chiller/.test(flowWords) && /\b3 steps\b/i.test(flowWords), `4 its own page in the pane works it out (${flowWords.slice(0, 120).replace(/\n/g, ' ')})`);

/* ---- 5 · INVESTIGATE, and the kinds of work said apart ---- */
await round('Why does the wrapper keep stopping? Let’s investigate properly', [
  () => ({ ok: true, reply: '', calls: [{ id: 'i1', name: 'plan_investigation', input: { words: 'why the wrapper keeps stopping', method: 'dmaic', lineId: sd.wsId } }, { id: 'i2', name: 'tool_guide', input: { intent: 'measure' } }], assistant: { v: 1 } }),
  () => ({ ok: true, reply: 'DMAIC fits — shall I start it?' }),
]);
const inv = asks.at(-1)?.pending?.results ?? [];
ok(inv[0]?.ok && /Define/.test(inv[0].says) && /Control/.test(inv[0].says) && /project report/.test(inv[0].says), '5 plan_investigation gives the method’s sections with their tools, ending in the project report');
ok(inv[1]?.ok && (inv[1].data?.tools ?? []).length === 5 && /Stops timed/.test(inv[1].says), '5 tool_guide says which tools measure live');
ok(asks.every(a => a.task === 'colleague'), '5 one colleague: every answer from the one gateway task');

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(800);
await page.locator('[data-work-show]').click().catch(() => undefined); await page.waitForTimeout(500);
const pane = await page.locator('[data-work]').boundingBox();
ok(!!pane && pane.width >= 380 && (await page.locator('.ai-work-back').isVisible()), '6 on a phone the work fills the screen with the way back to the conversation');
await page.locator('.ai-work-back').click(); await page.waitForTimeout(400);
ok((await page.locator('.ai-work.is-open').count()) === 0 && (await page.locator('[data-work-show]').isVisible()), '6 back to the conversation, Show the work there to return');
const wide = await page.evaluate(() => document.documentElement.scrollWidth);
ok(wide <= 392, `6 nothing off the side at 390 (${wide})`);

await t.finish('ai-operate');
