/* ACCEPTANCE — LUNA'S SECOND LOOK AT HER OWN ANSWER (21 November 2026, docs/LUNA-AGENT.md, the audit of the loop — "she never checks
 * her answer: the first reply without calls is final"; Rowland: "make Luna as intelligent as possible").
 *
 * The app's own check knew when her answer held a figure with nothing behind it, and when a job she had planned still had steps
 * open — and told only the person (Check this; "Stopped with 2 of 4 done"). Now it tells HER, once: her answer is sent back with what
 * the check found, and what she then says takes the place of the first answer (colleague/colleagueAsk, the second look). The gateway
 * is played by this script and every request counted; the figures are Line 2's four timed stops (Jam 10 + 5, Film 12, Label 3 = 30).
 *
 *   1  A FIGURE FOUND NOWHERE: asked how much time the line lost, she asks the app and then says a figure the app never worked (45).
 *      The app sends her answer back with the figure named — a line from the app, no steps pending, her first answer handed on as
 *      the conversation's own record — and her corrected answer is the ONE answer the person has: no figure marked, the turn saying
 *      it was checked, no second turn, after a reload too
 *   2  A FIGURE THAT IS THE APP'S: an answer whose figures all trace is final at once — nothing sent back, no extra request
 *   3  ONE LOOK AN ANSWER: a figure still found nowhere after it is marked for the person, as it always was — never a third ask
 *   4  A PLAN LEFT OPEN: a job planned in this answer and ended with a step still to do — sent back once with the open step named;
 *      she does it, and the plan under her answer says Finished
 *   5  WAITING ON THE PERSON IS NOT UNFINISHED: a job that stops to ask them the one thing only they know is not sent back
 *   6  A SHARE OF ONLY WHAT IS SHOWN IS NEVER PASSED: a result cut to its two biggest groups — "Jam is 56% of it" (15 of the 27
 *      shown) is marked and sent back; "50%" (15 of the true 30) is the app's own
 *   7  THE LOOK DOES NOT COME BACK (22 November, the review): the gateway refuses the look's ask — her first answer stands, its
 *      figure marked as it would have been, the turn NOT a failed one (no Ask again), its record saying the check was not finished;
 *      the same after a reload
 *   8  STOPPED DURING THE LOOK: Stop pressed while she is re-checking — her first answer is on the turn with the Stop sentence under
 *      it, what she then asked for is not run, nothing more is asked of the gateway
 *   9  the phone: the answer inside the screen
 *
 *   node scripts/acceptance/luna-second-look.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
let plan = [];
const bodies = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task !== 'colleague') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ off: true, why: 'Not played.' }) });
  bodies.push(body);
  const next = plan.shift();
  const answer = next ? await next(body) : { ok: true, reply: 'Noted.' };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const calls = (reply, ...cs) => ({ ok: true, reply, assistant: { v: 1, n: bodies.length }, calls: cs.map(([id, name, input]) => ({ id, name, input })) });
const finished = async (n, ms = 30000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking') && !document.querySelector('.ai-turn.is-colleague .ai-avatar.is-thinking') && !document.querySelector('.ai-words[data-ai-growing]'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(700);
};
const lastTurn = () => page.evaluate(async () => {
  const d = await import('/src/db.ts');
  const c = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague && !x.deletedAt).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const replies = c.facts.turns.filter(x => x.kind === 'reply');
  const turn = replies[replies.length - 1];
  return { replies: replies.length, text: turn.text, unsure: turn.unsure ?? [], checked: turn.checked ?? 0, used: (turn.used ?? []).map(u => ({ name: u.name, title: u.title, status: u.status, says: u.says })) };
});
const newConversation = async () => {
  await page.getByRole('button', { name: 'New conversation' }).filter({ visible: true }).first().click().catch(async () => {
    await page.locator('.ai-head-acts').getByRole('button', { name: /^More/ }).click(); await page.getByRole('menuitem', { name: /New conversation/ }).first().click();
  });
  await page.waitForTimeout(1200);
};
const marks = () => page.locator('.ai-turn.is-colleague:last-of-type [data-ai-fig-check]').count();
const lastWords = async () => (await page.locator('.ai-turn.is-colleague:last-of-type .ai-words').innerText()).replace(/\s+/g, ' ').trim();

const L = await page.evaluate(async () => {
  const [{ addLineToFactory }, d] = await Promise.all([import('/src/lib/lines.ts'), import('/src/db.ts')]);
  const w = await addLineToFactory('Line 2');
  await d.updateWorkspace({ ...w, assets: ['Filler', 'Bagger', 'Case packer'] });
  const T0 = Date.UTC(2026, 10, 2, 8);
  for (const [cat, min] of [['Jam', 10], ['Jam', 5], ['Film', 12], ['Label', 3]]) await d.addObservation({ id: crypto.randomUUID(), workspaceId: w.id, category: cat, asset: 'Bagger', startedAt: T0, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: T0, updatedAt: T0 });
  return w.id;
});
const NOTE = await page.evaluate(async () => { const m = await import('/src/colleague/colleagueAsk.ts'); return { figure: m.lookAgain({ unsure: ['45'] }), open: m.lookAgain({ unsure: [], open: '2 “Say what it means” (to do)' }), cut: m.lookAgain({ unsure: ['56%'] }) }; });
const BY_CAT = ['q', 'query_data', { source: `stops:${L}`, title: 'Downtime by category', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }] }];
await t.go('#/ai', 2500);

/* ---- 1 · a figure found nowhere: sent back, and the corrected answer is the one answer ---- */
plan = [
  () => calls('', BY_CAT),
  () => ({ ok: true, reply: 'Line 2 lost about 45 minutes, mostly to jams.' }),
  () => ({ ok: true, reply: 'Line 2 lost 30 minutes in all: Jam 15, Film 12 and Label 3 — every one on the Bagger.', suggestions: ['Why does the Bagger jam?'] }),
];
await send('How much time has Line 2 lost?');
await finished(1);
const b3 = bodies[2];
const tail = b3?.turns?.slice(-2) ?? [];
ok(bodies.length === 3, `1 an answer with a figure the app never worked is not final: one more ask goes (${bodies.length} asks)`);
ok(tail[0]?.role === 'colleague' && tail[0].text.startsWith('Line 2 lost about 45 minutes, mostly to jams.') && /\[Work it out: .*Jam: 15/.test(tail[0].text.replace(/\n/g, ' ')), `1 her first answer and what its step found are handed on as the conversation’s own record: “${(tail[0]?.text ?? '').replace(/\s+/g, ' ').slice(0, 130)}…”`);
ok(tail[1]?.role === 'person' && tail[1].text === NOTE.figure && !b3.pending, `1 …then a line FROM THE APP naming the figure, no steps pending: “${(tail[1]?.text ?? '').slice(0, 150)}…”`);
const one = await lastTurn();
ok(one.replies === 1 && one.text === 'Line 2 lost 30 minutes in all: Jam 15, Film 12 and Label 3 — every one on the Bagger.' && (await page.locator('.ai-turn.is-colleague').count()) === 1, '1 what she said next is the ONE answer the person has — the first is not left beside it');
ok(one.unsure.length === 0 && one.checked >= 3 && (await marks()) === 0, `1 every figure in it is the app’s own (${one.checked} checked), none marked`);
const rec = one.used.find(u => u.name === 'look_again');
ok(!!rec && rec.title === 'Checked her answer' && rec.status === 'done' && rec.says === 'The app could not trace a figure in her first answer and sent it back to be worked out or taken out. This is the answer she gave after that.' && !/45/.test(rec.says), `1 the turn’s record says it was checked, with none of the figures in it: “${rec?.says}”`);
await page.reload(); await page.waitForTimeout(2500); await t.go('#/ai', 2500);
ok((await lastWords()).startsWith('Line 2 lost 30 minutes in all') && (await page.locator('.ai-turn.is-colleague').count()) === 1 && (await marks()) === 0, '1 the same after a reload');

/* ---- 2 · a figure that is the app's: final at once ---- */
await newConversation();
plan = [() => calls('', BY_CAT), () => ({ ok: true, reply: 'Jam took 15 of the 30 minutes lost.' })];
const b2 = bodies.length;
await send('What is the biggest loss on Line 2?');
await finished(1);
const two = await lastTurn();
ok(bodies.length === b2 + 2 && two.unsure.length === 0 && !two.used.some(u => u.name === 'look_again'), `2 an answer whose figures all trace is final at once — nothing sent back (${bodies.length - b2} asks)`);

/* ---- 3 · one look an answer ---- */
await newConversation();
plan = [() => ({ ok: true, reply: 'About 45 minutes, I think.' }), () => ({ ok: true, reply: 'I make it 45 minutes.' }), () => ({ ok: true, reply: 'never asked for' })];
const b3s = bodies.length;
await send('Roughly how long was the Bagger down last week?');
await finished(1);
const three = await lastTurn();
ok(bodies.length === b3s + 2 && three.text === 'I make it 45 minutes.' && JSON.stringify(three.unsure) === JSON.stringify(['45']) && (await marks()) === 1, `3 one look an answer: a figure still found nowhere after it is marked for the person, never a third ask (${bodies.length - b3s} asks, marked ${JSON.stringify(three.unsure)})`);

/* ---- 4 · a plan left open ---- */
await newConversation();
plan = [
  () => calls('On it.', ['p', 'plan_job', { goal: 'Find where Line 2 loses its time and say what it means', steps: ['Find where the time goes', 'Say what it means'] }], ['s1', 'job_step', { step: 1, status: 'doing' }]),
  () => calls('', BY_CAT, ['s1d', 'job_step', { step: 1, status: 'done', note: 'Jam 15 of the 30 minutes' }]),
  () => ({ ok: true, reply: 'Jam took 15 of the 30 minutes lost.' }),
  () => calls('', ['s2d', 'job_step', { step: 2, status: 'done', note: 'Jam is half of it' }]),
  () => ({ ok: true, reply: 'Jam took 15 of the 30 minutes lost — half of it, all on the Bagger. Why it jams is not known yet.' }),
];
const b4 = bodies.length;
await send('Find where Line 2 loses its time and say what it means.');
await finished(1);
const sentBack = bodies[b4 + 3]?.turns?.slice(-1)[0];
ok(bodies.length === b4 + 5 && sentBack?.role === 'person' && sentBack.text === NOTE.open, `4 a job ended with a step of her own plan still to do is sent back once, the open step named: “${(sentBack?.text ?? '').slice(0, 170)}…”`);
const four = await lastTurn();
const stands = (await page.locator('.ai-turn.is-colleague:last-of-type [data-ai-job-kept] summary').innerText().catch(() => '')).trim();
ok(four.text.startsWith('Jam took 15 of the 30 minutes lost — half of it') && stands === 'The job · Finished — 2 of 2 done' && four.used.some(u => u.name === 'look_again' && /plan still had steps open/.test(u.says)), `4 she finishes it: the plan under her answer says “${stands}”, and the turn says it was checked`);

/* ---- 5 · waiting on the person is not unfinished ---- */
await newConversation();
plan = [
  () => calls('', ['p', 'plan_job', { goal: 'Price the lost time on Line 2', steps: ['Find the lost time', 'Price it'] }], ['s1', 'job_step', { step: 1, status: 'doing' }]),
  () => calls('', BY_CAT, ['s1d', 'job_step', { step: 1, status: 'done', note: '30 minutes' }]),
  () => ({ ok: true, reply: 'The line lost 30 minutes. Before I price it — what does a minute of the Bagger cost you?' }),
];
const b5 = bodies.length;
await send('Price the lost time on Line 2.');
await finished(1);
const five = await lastTurn();
ok(bodies.length === b5 + 3 && !five.used.some(u => u.name === 'look_again') && five.text.endsWith('cost you?'), `5 a job that stops to ask the person the one thing only they know is not sent back (${bodies.length - b5} asks)`);

/* ---- 6 · a share of only what is shown is never passed ---- */
await newConversation();
const TOP2 = ['q', 'query_data', { source: `stops:${L}`, title: 'The two biggest', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }], limit: 2 }];
plan = [
  () => calls('', TOP2),
  b => { const r = b.pending?.results?.[0]; return { ok: true, reply: `Jam is 56% of the lost time.${r?.ok ? '' : ` (${r?.says})`}` }; },
  () => ({ ok: true, reply: 'Jam is 50% of the lost time — 15 of the 30 minutes.' }),
];
const b6 = bodies.length;
await send('What share of the lost time is Jam?');
await finished(1);
const cutNote = bodies[b6 + 2]?.turns?.slice(-1)[0];
const six = await lastTurn();
const shown = String(bodies[b6 + 1]?.pending?.results?.[0]?.says ?? '');
ok(/Jam: 15; Film: 12; … 1 more group not shown\. Totals \(of all 3 groups\): sum of minutes 30\./.test(shown), `6 the result she was given was cut to its two biggest groups, and says so — with its totals said to be of every group: “${shown.slice(0, 190)}”`);
ok(cutNote?.text === NOTE.cut, '6 “56%” — Jam’s share of the 27 minutes SHOWN — is not passed: it is sent back');
ok(six.text === 'Jam is 50% of the lost time — 15 of the 30 minutes.' && six.unsure.length === 0 && (await marks()) === 0, `6 “50%” — its share of the true 30 — is the app’s own (${six.checked} checked, none marked)`);

/* ---- 7 · the look does not come back: her first answer stands ---- */
const NOT_FINISHED = 'The app could not trace a figure in her first answer and sent it back to be worked out or taken out. The check was not finished, so this is her first answer — the figures marked are still to check.';
const STOPPED = await page.evaluate(async () => (await import('/src/colleague/colleagueAsk.ts')).STOPPED);
await newConversation();
plan = [() => ({ ok: true, reply: 'About 45 minutes, I think.', suggestions: ['By reason?'] }), () => ({ ok: false, why: '120 asks in a day is the allowance — more tomorrow.' }), () => ({ ok: true, reply: 'never asked for' })];
const b7 = bodies.length;
await send('Roughly how long was the Bagger down last week?');
await finished(1);
const seven = await lastTurn();
ok(bodies.length === b7 + 2 && seven.text === 'About 45 minutes, I think.' && JSON.stringify(seven.unsure) === JSON.stringify(['45']) && (await marks()) === 1, `7 the look’s ask is refused: her first answer stands, its figure marked as it would have been (“${seven.text}”, marked ${JSON.stringify(seven.unsure)}, ${bodies.length - b7} asks)`);
ok((await page.locator('[data-ai-failed]').count()) === 0 && (await page.getByRole('button', { name: 'Ask again' }).count()) === 0 && (await lastWords()).startsWith('About 45 minutes, I think.'), '7 the turn is not a failed one — her answer is on the screen, no Ask again');
const rec7 = seven.used.filter(u => u.name === 'look_again');
ok(rec7.length === 1 && rec7[0].status === 'failed' && rec7[0].says === NOT_FINISHED && !/45/.test(rec7[0].says), `7 ONE record of the look, and it says the check was not finished — never “the answer she gave after that”: “${rec7[0]?.says ?? ''}”`);
await page.reload(); await page.waitForTimeout(2500); await t.go('#/ai', 2500);
ok((await lastWords()).startsWith('About 45 minutes, I think.') && (await marks()) === 1 && (await page.locator('[data-ai-failed]').count()) === 0, '7 the same after a reload');

/* ---- 8 · stopped during the look ---- */
await newConversation();
const gate = () => { let open; const p = new Promise(res => { open = res; }); return { p, open }; };
const thinking = gate();
plan = [
  () => ({ ok: true, reply: 'About 45 minutes, I think.' }),
  /* she is re-checking when Stop is pressed: what she then asks for is not run */
  async () => { await thinking.p; return calls('Let me get that from the app.', ['never', 'query_data', { source: `stops:${L}`, title: 'NEVER RUN', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }] }]); },
  () => ({ ok: true, reply: 'THIS IS NEVER ASKED FOR.' }),
];
const b8 = bodies.length;
await send('Roughly how long was the Bagger down last week?');
for (let i = 0; i < 100 && bodies.length < b8 + 2; i++) await page.waitForTimeout(150);
await page.locator('[data-ai-stop]').click(); await page.waitForTimeout(300);
thinking.open();
await finished(1);
const eight = await lastTurn();
ok(eight.text === `About 45 minutes, I think.\n\n${STOPPED}` && JSON.stringify(eight.unsure) === JSON.stringify(['45']) && (await marks()) === 1, `8 stopped while she was re-checking: her first answer is on the turn, its figure marked, the Stop sentence under it: “${eight.text.replace(/\n+/g, ' / ')}”`);
ok(bodies.length === b8 + 2 && plan.length === 1 && !eight.used.some(u => u.name === 'query_data'), `8 what she asked for after Stop was not run, and nothing more was asked of the gateway (${bodies.length - b8} asks)`);
ok(eight.used.filter(u => u.name === 'look_again').map(u => u.status).join() === 'failed' && (await page.getByRole('button', { name: 'Send', exact: true }).count()) === 1, '8 the look’s record says it was not finished; Send is back');

/* ---- 9 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
ok((await t.wide()) <= 1 && (await lastWords()).startsWith('About 45 minutes, I think.'), '9 the phone: the answer inside the screen');

await t.finish('The second look accepted: an answer with a figure the app never worked, or a plan of her own left open, is sent back to Luna once by the app’s check — the figure and the open step named — and what she then says is the one answer the person has; an answer that traces is final at once; one look only; a question to the person is not unfinished; a share of only the groups a cut result shows is never passed as checked; and a look that does not come back — refused, or stopped part-way — leaves her first answer on the turn, marked as it would have been, never a failed turn.');
