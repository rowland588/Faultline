/* ACCEPTANCE — THE TASK-LED APPLICATION (10 November; docs/AI-TASK.md; src/capabilities/task). Rowland, 10 November: "The user
 * should not have to navigate Faultline to find the functionality they need … A user walks onto a factory floor and says: 'I think
 * we're losing too much production time on this line. Can you help me understand why?' They should not need to know where to start."
 * Driven in a real browser on the smoke seed's line, the `assist` gateway played by the script round by round:
 *
 *   1  UNDERSTAND — the sentence as said; understand_task reads the line's own evidence: the task read as lost production time,
 *      each step of its route known · old · not done exactly as the module reads the same records, ONE next step with its reason,
 *      and the instruction never to offer a menu; the line shown beside the conversation
 *   2  KEEP — "yes": keep_task with NO card; the context panel shows The task — its steps in order, each in a word, Next on the one
 *      the evidence names, the line's own findings beside them
 *   3  ACT — the next step started through its capability (Stops timed, one card), a stop said and its end said, captured with no card
 *   4  CONTINUITY — task_state read from the records: Stops timed done in this task, the next step moved on; the panel the same with
 *      no reload; a change of subject parks the task and coming back brings it with its progress
 *   5  MANUAL MODE — the stop on the line's own records; plan_work on the line recommends a step, never asks which tool
 *   6  the phone: the task in the context sheet, the Next press 44 px, nothing off the side
 *
 *   node scripts/acceptance/ai-task.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { openLunaContext, openLunaFolds } from '../lib/lunaContext.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const seeded = await t.seed();
/* a line where nothing is known yet — the situation Rowland described: walking onto a floor that has not been looked at */
const freshLine = await page.evaluate(async () => (await (await import('/src/lib/lines.ts')).addLineToFactory('Line 9 — packing')).id);
const sd = { ...seeded, wsId: freshLine };
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
const waiting = () => page.locator('[data-card-status="waiting"]').count();
const doIt = async name => {
  await page.waitForSelector(`[data-card="${name}"][data-card-status="waiting"]`, { timeout: 10000 }).catch(() => undefined);
  const c = page.locator(`[data-card="${name}"][data-card-status="waiting"]`).last();
  const n = await c.count();
  if (n) await c.getByRole('button', { name: 'Do it' }).click();
  return n === 1;
};
const db = (fn, arg) => page.evaluate(fn, arg);
let turns = 0;
const round = async (words, rounds, card) => {
  plan = rounds;
  await send(words);
  if (card) ok(await doIt(card), `the write is a card first: ${card}`);
  turns += 1;
  await answered(turns);
};
const lastResults = () => asks.at(-1)?.pending?.results ?? [];
const calls = (...cs) => () => ({ ok: true, reply: '', calls: cs.map(([id, name, input]) => ({ id, name, input })), assistant: { v: 1 } });
const then = words => () => ({ ok: true, reply: words });
/* the module's own reading of the same records, in the page */
const moduleSteps = since => db(async ({ ws, since }) => {
  const m = await import('/src/capabilities/task.ts');
  const ev = await m.evidenceFor(ws, m.ROUTES.losttime, Date.now(), since);
  return { steps: ev.steps.map(s => ({ key: s.key, status: s.status, sinceTask: !!s.sinceTask })), next: m.nextStep(ev.steps)?.key };
}, { ws: sd.wsId, since });

await t.go(`#/ai?line=${encodeURIComponent(sd.wsId)}`, 3000);
await openLunaContext(page); await openLunaFolds(page);   /* F2: the context one tap away at a desk, opened as a person would */

/* ---- 1 · UNDERSTAND ---- */
const SAID = 'I think we’re losing too much production time on this line. Can you help me understand why?';
await round(SAID, [calls(['u1', 'understand_task', { words: SAID, lineId: sd.wsId }]), then('Here is what the line already tells us, and where I would start.')]);
const u = lastResults()[0];
const before = await moduleSteps();
ok(u?.ok && u.data?.task === 'losttime', `1 the sentence read as lost production time (${u?.data?.task})`);
ok(JSON.stringify(u.data.steps.map(s => s.key)) === JSON.stringify(['stops', 'losses', 'linebalance', 'reliability', 'sixm']), '1 the route in the method’s order: stops, the loss count, the constraint, reliability, the root cause');
const word = { known: 'known', old: 'old', missing: 'not done' };
ok(u.data.steps.every((s, i) => s.status === word[before.steps[i].status]), `1 each step known · old · not done exactly as the line's records say (${u.data.steps.map(s => `${s.key} ${s.status}`).join(', ')})`);
ok(u.data.next?.key === before.next && /^[a-z]/.test(u.data.next.why), `1 ONE next step, with its reason: ${u.data.next?.label} — ${u.data.next?.why?.slice(0, 60)}`);
ok(u.data.next?.key === 'stops' && u.data.steps.every(s => s.status === 'not done') && /Nothing on the line bears on this yet/.test(u.says), '1 a line nothing is known of: start by timing the stops, because nothing says where its time goes');
ok(/never a list of tools to choose from/.test(u.says) && !/which tool/i.test(u.says), '1 told to recommend, never to offer a menu of tools');
ok((await page.locator('[data-work]').count()) === 1, '1 the line shown beside the conversation');

/* ---- 2 · KEEP ---- */
const GOAL = 'Understand why this line is losing production time';
await round('Yes, let’s do that', [calls(['k1', 'keep_task', { goal: GOAL, lineId: sd.wsId, task: 'losttime' }], ['m1', 'start_measurement', { tool: 'stops', lineId: sd.wsId }]), then('Timing the stops — say each one as it happens.')], 'start_measurement');
ok(lastResults().find(r => r.id === 'k1')?.ok, '2 keep_task ran with no card');
const card = page.locator('[data-ctx-task]');
await card.waitFor({ timeout: 8000 }).catch(() => undefined);
ok((await card.count()) === 1, '2 the context panel shows The task');
const rows = card.locator('[data-task-step]');
await page.waitForFunction(() => document.querySelectorAll('[data-task-step]').length === 5, null, { timeout: 8000 }).catch(() => undefined);
ok((await rows.count()) === 5 && (await rows.nth(0).getAttribute('data-task-step')) === 'stops', '2 its five steps in order');
await page.waitForFunction(g => (document.querySelector('[data-ctx-aim]')?.textContent ?? '').includes(g), GOAL, { timeout: 8000 }).catch(() => undefined);
const aim = await t.words('[data-ctx-aim]');
ok(aim.includes(GOAL), `2 the aim is the task in the person’s words: "${aim.slice(0, 80)}"`);

/* ---- 3 · ACT — the stops timed live ---- */
await round('Wrapper’s stopped — film break', [calls(['e1', 'capture_event', { event: 'stopped', machine: 'Wrapper', reason: 'Film break' }]), then('Timing it.')]);
await page.waitForTimeout(1200);
await round('Running again', [calls(['e2', 'capture_event', { event: 'running' }]), then('Kept.')]);
ok((await page.locator('[data-card="capture_event"]').count()) === 0 && (await waiting()) === 0, '3 the stop and its end captured with no card');
await page.locator('[data-measure-end]').click().catch(() => undefined); await page.waitForTimeout(800);

/* ---- 4 · CONTINUITY — progress read from the records ---- */
const kept = await db(async () => {
  const s = await (await import('/src/db.ts')).getStudy(new URLSearchParams(location.hash.split('?')[1]).get('c') ?? '');
  return s ? (s.facts.threads ?? []).find(x => x.status === 'current')?.task : null;
});
const conv = await db(async () => [...(await (await import('/src/db.ts')).listAllStudies())].filter(s => s.tool === 'talk' && s.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0]?.facts.threads?.find(x => x.status === 'current')?.task);
const task = kept ?? conv;
ok(task?.goal === GOAL && task.lineId === sd.wsId, '4 the task kept on the conversation’s subject');
await round('Where are we with it?', [calls(['s1', 'task_state', {}]), then('Stops timed is done — next is the loss count.')]);
const st = lastResults()[0];
const after = await moduleSteps(task?.startedAt);
const stopsNow = st?.data?.steps?.find(s => s.key === 'stops');
ok(st?.ok && stopsNow?.status === 'known' && stopsNow?.sinceTask === true, '4 task_state: Stops timed done, and done in this task');
ok(st.data.next?.key === after.next && after.next === 'losses', `4 the next step moved on to the loss count, as the records say: ${st.data.next?.label}`);
ok(/Done since: Stops timed/.test(st.says), '4 said: done since the task began');
await page.waitForFunction(() => document.querySelector('[data-task-step="stops"]')?.getAttribute('data-task-status') === 'known', null, { timeout: 8000 }).catch(() => undefined);
const stopsRow = await t.words('[data-task-step="stops"]');
ok(/this task/.test(stopsRow) && /Done/.test(stopsRow), `4 the panel moved with no reload: "${stopsRow.slice(0, 80)}"`);
ok((await t.words(`[data-task-step="${after.next}"]`)).startsWith('Next'), '4 Next on the step the records name');
await round('Hang on — quick question about the labeller, separate thing', [calls(['f1', 'set_focus', { title: 'Labeller question' }]), then('Parked the lost-time task.')]);
ok((await page.locator('[data-ctx-task]').count()) === 0, '4 a change of subject parks the task');
await round('Back to the lost time', [calls(['f2', 'set_focus', { title: GOAL }]), then('Back on it.')]);
await page.waitForSelector('[data-ctx-task]', { timeout: 8000 }).catch(() => undefined);
ok((await page.locator('[data-ctx-task]').count()) === 1 && (await page.locator('[data-task-step="stops"][data-task-status="known"]').count()) === 1, '4 coming back brings the task with its progress');

/* ---- 5 · MANUAL MODE ---- */
const obs = await db(async ws => (await (await import('/src/db.ts')).listObservations(ws)).filter(o => o.asset === 'Wrapper' && o.category === 'Film break').length, sd.wsId);
ok(obs >= 1, '5 the stop is on the line’s own records, as its capture screen keeps it');
await round('Can we look at downtime on here?', [calls(['p1', 'plan_work', { words: 'a downtime analysis', lineId: sd.wsId }]), then('Start there.')]);
const pw = lastResults()[0];
ok(pw?.ok && /^Start with /.test(pw.data?.ask ?? '') && !/Is it the whole line/.test(pw.data?.ask ?? ''), `5 plan_work recommends from the evidence, never asks which tool: "${(pw.data?.ask ?? '').slice(0, 70)}"`);

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
const back = page.locator('.ai-work-back:visible');
if (await back.count()) { await back.click(); await page.waitForTimeout(400); }
await page.locator('.ai-strip').click().catch(() => undefined); await page.waitForTimeout(600);
const go = page.locator('[data-task-go]:visible').first();
ok((await go.count()) === 1 && (await go.boundingBox()).height >= 44, '6 the phone: the task in the context sheet, its Next a thumb’s height');
const wide = await page.evaluate(() => document.documentElement.scrollWidth);
ok(wide <= 392, `6 nothing off the side at 390 (${wide})`);

await t.finish('The task-led application: the person’s sentence understood from the line’s own evidence, one next step recommended, the task kept and carried through, its progress read from the records, parked and taken up again — every record the app’s own.');
