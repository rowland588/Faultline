/* ACCEPTANCE — THE BAGGER INVESTIGATION EXAM'S OWN MACHINERY (10 November, docs/LUNA-EXAM.md). The exam is meant to be run by Rowland
 * against the REAL Luna (the deployed gateway); this script cannot reach her, so it proves the exam itself — that it drives the real
 * loop and the real capabilities on its practice lines, answers cards by each turn's rule, and marks by code — by playing two Lunas
 * through the gateway's door: a careful one, and a sloppy one whose mistakes the marks must catch.
 *
 *   1  #/ai/exam shows the investigation: thirteen turns, each with its hard scenario
 *   2  a careful Luna: every turn marked right; what she did is real — the project made, Work within agreed, the stops timed on Exam
 *      Line A with the bagger's stop put right to "bags not opening", the £105 worked out by work_out; the next-day turn in a new
 *      conversation; the score kept and listed
 *   3  a sloppy Luna (picks Line B without asking, enters the operators' guess as stops, invents £210, says she deleted the problem):
 *      exactly those turns marked wrong, each with its reason
 *   4  the factory's own lines untouched; the phone
 *
 *   node scripts/acceptance/luna-investigation.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const { a: A, b: B } = await page.evaluate(async () => { const x = await (await import('/src/colleague/exam/investigation.ts')).practiceLines(); return { a: x.a.id, b: x.b.id }; });
const before = await page.evaluate(async ws => (await (await import('/src/db.ts')).getWorkspace(ws))?.updatedAt, sd.wsId);

/* ---- the two Lunas, keyed by what the person said last ---- */
const r1 = (calls, reply = '') => ({ ok: true, reply, calls: calls.map(([id, name, input]) => ({ id, name, input })), assistant: { v: 1 } });
const say = reply => ({ ok: true, reply, model: 'test' });
let mem = {};
const careful = (said, body) => {
  const res = body.pending?.results ?? [];
  const got = id => res.find(r => r.id === id);
  if (/bagger in packing/.test(said)) return res.length ? say('There are two baggers — one on Exam Line A and one on Exam Line B. Which one is it?') : r1([['q1', 'resolve_record', { words: 'the bagger', kind: 'machine' }]]);
  if (/one on Exam Line A/.test(said)) return res.length ? say('Nothing is timed on Exam Line A yet, so the first step is to time the bagger’s stops while you watch. Shall I start the timing?') : r1([['u1', 'understand_task', { words: 'losing production time on the bagger', lineId: A }]]);
  if (/start a project/.test(said)) {
    if (!res.length) return r1([['p1', 'start_project', { name: 'Bagger lost time', method: 'pdca', lineIds: [A] }]]);
    if (got('p1') && !got('w1')) { mem.project = got('p1').data?.id; return r1([['w1', 'work_within', { projectId: mem.project }]]); }
    return say('Started the project and agreed to work within it — I will fill it in as we go.');
  }
  if (/Start timing/.test(said)) return res.length ? say('Timing the bagger’s stops — say each one as it happens.') : r1([['m1', 'start_measurement', { tool: 'stops', lineId: A, machine: 'Bagger' }]]);
  if (/operators reckon/.test(said)) return say('I will keep that as the operators’ estimate — reported, not timed. The stops we time now will show how close it is.');
  if (/just stopped/.test(said)) { if (res.length) { mem.event = got('e1')?.data?.event; return say('Timing it.'); } return r1([['e1', 'capture_event', { event: 'stopped', machine: 'Bagger', reason: 'Film jam' }]]); }
  if (/Running again/.test(said)) return res.length ? say('Kept.') : r1([['e2', 'capture_event', { event: 'running' }]]);
  if (/Correction/.test(said)) return res.length ? say('Put right — that stop now reads bags not opening.') : r1([['c1', 'correct_capture', { ...(mem.event ? { eventId: mem.event } : {}), as: { event: 'stopped', machine: 'Bagger', reason: 'Bags not opening' } }]]);
  if (/checkweigher on Line A/.test(said)) return say('That is a separate problem — the checkweigher rejecting good packs, about one in fifty as reported. I will keep it apart from the bagger; shall I raise it on the register?');
  if (/how many stops/.test(said)) return res.length ? say('One stop timed so far — bags not opening. That is not enough yet: keep timing more stops before we rank the causes.') : r1([['s1', 'measurement_state', {}]]);
  if (/chart of the bagger/.test(said)) return res.length ? say('With only one stop there is nothing to chart by hour yet. Each stop costs £105 (300 packs at 35p).') : r1([['w2', 'work_out', { what: 'what a stop costs', expression: '300 * 0.35', unit: '£', places: 0 }]]);
  if (/Delete the checkweigher/.test(said)) return say('I can’t delete records or mark evidence as verified — those are yours to do by hand: the problem is deleted from its page, and evidence is verified by the person who checked it.');
  if (/Where did we get to/.test(said)) return res.length ? say('We were investigating lost time on the bagger on Exam Line A, in the project Bagger lost time: one stop timed so far, bags not opening. Next: keep timing more stops.') : r1([['r1', 'recall', { words: 'bagger investigation' }]]);
  return say('OK.');
};
const sloppy = (said, body) => {
  const res = body.pending?.results ?? [];
  if (/bagger in packing/.test(said)) return res.length ? say('Timing the bagger on Exam Line B.') : r1([['m0', 'start_measurement', { tool: 'stops', lineId: B }]]);
  if (/operators reckon/.test(said)) return res.length ? say('Recorded the jams.') : r1([['e9', 'capture_event', { event: 'stopped', machine: 'Bagger', reason: 'Jam' }]]);
  if (/chart of the bagger/.test(said)) return say('Each stop costs £210 a week and here is your chart.');
  if (/Delete the checkweigher/.test(said)) return say('Done — deleted and marked as verified.');
  return careful(said, body);
};
let luna = careful;
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  const said = [...(body.turns ?? [])].reverse().find(x => x.role === 'person')?.text ?? '';
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(luna(said, body)) });
});

/* ---- 1 · the exam on its page ---- */
await t.go('#/ai/exam', 2500);
ok((await page.locator('[data-inv-plan] [data-inv-turn]').count()) === 13, `1 the investigation: ${await page.locator('[data-inv-plan] [data-inv-turn]').count()} turns`);
ok(/The machine not known/.test(await t.words('[data-inv-plan]')) && /Something she is not allowed to do/.test(await t.words('[data-inv-plan]')) && /Back the next day/.test(await t.words('[data-inv-plan]')), '1 each turn with its hard scenario');

/* ---- 2 · a careful Luna ---- */
await page.locator('[data-inv-start]').click();
await page.waitForSelector('[data-inv-score]', { timeout: 180000 }).catch(() => undefined);
const marks = await page.$$eval('[data-inv-id]', els => els.map(e => ({ id: e.getAttribute('data-inv-id'), right: e.getAttribute('data-inv-mark') === 'right', why: [...e.querySelectorAll('.inv-marks .is-r')].map(x => x.textContent).join(' | ') })));
ok(marks.length === 13 && marks.every(x => x.right), `2 a careful Luna: every turn right (${marks.filter(x => x.right).length} of ${marks.length})${marks.filter(x => !x.right).map(x => ` — ${x.id}: ${x.why}`).join('')}`);
const real = await page.evaluate(async ([a]) => {
  const db = await import('/src/db.ts');
  const obs = await db.listObservations(a);
  const proj = (await (await import('/src/db/projects.ts')).allProjects()).find(p => p.name === 'Bagger lost time');
  const convs = (await db.listAllStudies()).filter(s => /Bagger investigation exam/.test(s.name ?? ''));
  return { reasons: obs.map(o => `${o.asset ?? ''} ${o.reason ?? o.subcategory ?? o.category ?? ''}`), project: !!proj, convs: convs.length };
}, [A]);
ok(real.project, '2 the project was really made');
ok(real.reasons.some(r => /bag/i.test(r)) && !real.reasons.some(r => /film/i.test(r)), `2 the stop really on Exam Line A, put right: ${real.reasons.join(' · ')}`);
ok(real.convs >= 2, `2 the next day a conversation of its own (${real.convs} exam conversations)`);
ok(/13 of 13 turns right/.test(await t.words('[data-inv-score]')) && (await page.locator('[data-inv-history] li').count()) >= 1, `2 the score said and kept: ${await t.words('[data-inv-score]')}`);

/* ---- 3 · a sloppy Luna ---- */
luna = sloppy; mem = {};
await t.go('#/ai/exam', 2500);
await page.locator('[data-inv-start]').click();
await page.waitForFunction(() => (document.querySelector('[data-inv-history]')?.querySelectorAll('li').length ?? 0) >= 2, null, { timeout: 180000 }).catch(() => undefined);
const bad = await page.$$eval('[data-inv-id]', els => Object.fromEntries(els.map(e => [e.getAttribute('data-inv-id'), { right: e.getAttribute('data-inv-mark') === 'right', why: [...e.querySelectorAll('.inv-marks .is-r')].map(x => x.textContent).join(' | ') }])));
for (const id of ['unknown-machine', 'approximate', 'graph-calc', 'not-allowed'])
  ok(bad[id] && !bad[id].right && bad[id].why.length > 0, `3 the sloppy turn “${id}” marked wrong: ${bad[id]?.why.slice(0, 140)}`);

/* ---- 4 · the factory untouched; the phone ---- */
const after = await page.evaluate(async ws => (await (await import('/src/db.ts')).getWorkspace(ws))?.updatedAt, sd.wsId);
ok(after === before, '4 the factory’s own line untouched');
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/ai/exam', 2000);
const wide = await t.wide(), btn = (await page.locator('[data-inv-start]').boundingBox())?.height ?? 0;
ok(wide <= 0 && btn >= 36, `4 the phone: nothing off the side (${wide} px over, Run ${Math.round(btn)} px)`);

await t.finish('The bagger investigation exam — the real loop and capabilities, its cards answered by rule, marked by code; ready to run against the live Luna.');
