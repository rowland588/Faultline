/* ACCEPTANCE — A JOB TAKEN AND FINISHED (21 November 2026, docs/LUNA-AGENT.md G1 — Rowland: "when I say intelligence level you must grade
 * it in the future of the app — it's not just about reading files and spouting out numbers … it's to get to the level of ChatGPT
 * agent, fully agentic … I need you to understand and build").
 *
 * The machinery of a job, the gateway played by the script (what Luna herself does with it is the real-model job exam,
 * scripts/eval/luna-job.mjs). On Line 2 with four timed stops (Jam 10 + 5, Film 12, Label 3 on the Bagger), at a desk and on a phone:
 *
 *   1  a job handed over in ONE message. She plans it (plan_job) and starts in the same go; while she works her plan is under her
 *      words — the goal, each step in its word (Done with what it found, Doing, To do), the step in hand marked — and on the context
 *      panel; Stop stands where Send was
 *   2  the job runs past one go of six rounds and the APP carries her on — the person says nothing: the next ask starts clean of the
 *      last go's carry, with that go handed on as the conversation's own record (her words, each step's finding) and the app's own line
 *      after it; the step asked for on the sixth round is not run and is asked again
 *   3  she finishes: the result in her words; the report made, with its three sections; every figure in her answer checked — though
 *      the result it rests on was worked two goes of rounds earlier; the plan kept folded under the answer, Finished — 4 of 4 done,
 *      each step with what it found; kept after a reload
 *   4  a second job, stopped: Stop pressed while she is thinking — what she then asks for is not run, nothing more is asked of the
 *      gateway, the answer says Stopped and what she had done is kept (the plan as it stood, one step done); Send is back; Carry on is
 *      offered
 *   5  the phone: the plan and Stop inside the screen, Stop 44 px, nothing off the side
 *
 *   node scripts/acceptance/luna-job.mjs   (SMOKE_BASE, as smoke) */
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
const got = (b, id) => b.pending?.results?.find(x => x.id === id);
/* an answer held until the script lets it go — so the page can be read while she is working */
const gate = () => { let open; const p = new Promise(res => { open = res; }); return { p, open }; };
/* finished: her avatar has stopped and no words are still growing (the "working on it" line alone gives way to her first words) */
const finished = async (n, ms = 30000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking') && !document.querySelector('.ai-turn.is-colleague .ai-avatar.is-thinking') && !document.querySelector('.ai-words[data-ai-growing]'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(600);
};
const jobList = (root = '.ai-turn.is-colleague:last-of-type') => page.locator(`${root} [data-ai-job] [data-job-step]`).evaluateAll(els => els.map(e => ({ n: e.getAttribute('data-job-step'), status: e.getAttribute('data-job-status'), word: e.querySelector('.ai-task-word')?.textContent ?? '', body: (e.querySelector('.ai-task-body')?.textContent ?? '').trim(), next: e.classList.contains('is-next') })));

const L = await page.evaluate(async () => {
  const [{ addLineToFactory }, d] = await Promise.all([import('/src/lib/lines.ts'), import('/src/db.ts')]);
  const w = await addLineToFactory('Line 2');
  await d.updateWorkspace({ ...w, assets: ['Filler', 'Bagger', 'Case packer'] });
  const T0 = Date.UTC(2026, 10, 2, 8);
  for (const [cat, min] of [['Jam', 10], ['Jam', 5], ['Film', 12], ['Label', 3]]) await d.addObservation({ id: crypto.randomUUID(), workspaceId: w.id, category: cat, asset: 'Bagger', startedAt: T0, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: T0, updatedAt: T0 });
  return w.id;
});
const consts = await page.evaluate(async () => { const m = await import('/src/colleague/colleagueAsk.ts'); return { CARRY_ON: m.CARRY_ON, STOPPED: m.STOPPED, MAX_ROUNDS: m.MAX_ROUNDS }; });
await t.go('#/ai', 2500);

/* ---- 1 · THE JOB HANDED OVER, PLANNED, AND WATCHED ---- */
const GOAL = 'Find out where Line 2 loses its time and put it in a report for the manager';
const STEPS = ['Find where the time goes', 'Chart it', 'Build the report', 'Say what it means'];
const hold = gate();
let R1 = '', C1 = '', REP = '';
plan = [
  () => calls('On it — the stops first, then the report.', ['p', 'plan_job', { goal: GOAL, steps: STEPS }], ['s1', 'job_step', { step: 1, status: 'doing' }]),
  () => calls('', ['q', 'query_data', { source: `stops:${L}`, title: 'Downtime by category', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }] }]),
  b => { R1 = got(b, 'q')?.data?.resultId ?? ''; return calls('', ['s1d', 'job_step', { step: 1, status: 'done', note: 'Jam 15 of the 30 minutes' }], ['s2', 'job_step', { step: 2, status: 'doing' }], ['c', 'make_chart', { resultId: R1, type: 'column', title: 'Line 2 downtime by category' }]); },
  async b => { C1 = got(b, 'c')?.data?.chartId ?? ''; await hold.p; return calls('Now the report.', ['s2d', 'job_step', { step: 2, status: 'done', note: 'the chart is made' }], ['s3', 'job_step', { step: 3, status: 'doing' }], ['r1', 'build_report', { title: 'Line 2 — where the time goes', op: 'add', section: { kind: 'chart', heading: 'Downtime by category', chartId: C1 } }]); },
  b => { REP = got(b, 'r1')?.data?.reportId ?? ''; return calls('', ['r2', 'build_report', { reportId: REP, op: 'add', section: { kind: 'finding', heading: 'Jams lead', text: 'Jam took 15 of the 30 minutes lost on the Bagger.', evidence: [R1] } }]); },
  /* the sixth round: what it asks for is NOT run — the go is over */
  () => calls('', ['r3-lost', 'build_report', { reportId: REP, op: 'add', section: { kind: 'recommendation', heading: 'What I would do', text: 'Watch the Bagger for a shift and time every jam.', by: 'luna' } }]),
  /* THE APP CARRIES HER ON: she asks again for what did not run */
  () => calls('', ['r3', 'build_report', { reportId: REP, op: 'add', section: { kind: 'recommendation', heading: 'What I would do', text: 'Watch the Bagger for a shift and time every jam.', by: 'luna' } }], ['s3d', 'job_step', { step: 3, status: 'done', note: 'Line 2 — where the time goes' }], ['s4', 'job_step', { step: 4, status: 'doing' }]),
  () => calls('', ['s4d', 'job_step', { step: 4, status: 'done', note: 'Jam is half the lost time' }]),
  () => ({ ok: true, reply: 'Done. The report is “Line 2 — where the time goes”. Jam took 15 of the 30 minutes lost — half of it, all on the Bagger. That is what the stops timed show; why it jams is not known yet.', suggestions: ['Why does the Bagger jam?'] }),
];
await send(`${GOAL}.`);
/* held on the fourth ask: three rounds of steps have run */
await page.waitForFunction(() => document.querySelectorAll('.ai-turn.is-colleague:last-of-type [data-ai-job] [data-job-step][data-job-status="doing"]').length === 1 && document.querySelectorAll('.ai-turn.is-colleague:last-of-type [data-ai-job] [data-job-step][data-job-status="done"]').length === 1, null, { timeout: 20000 }).catch(() => undefined);
const during = await jobList();
ok(JSON.stringify(during) === JSON.stringify([
  { n: '1', status: 'done', word: 'Done', body: 'Find where the time goes — Jam 15 of the 30 minutes', next: false },
  { n: '2', status: 'doing', word: 'Doing', body: 'Chart it', next: true },
  { n: '3', status: 'todo', word: 'To do', body: 'Build the report', next: false },
  { n: '4', status: 'todo', word: 'To do', body: 'Say what it means', next: false }]),
  `1 while she works her plan is under her words, each step in its word, the step in hand marked: ${JSON.stringify(during.map(x => `${x.n} ${x.word}${x.next ? ' ←' : ''}`))}`);
ok((await page.locator('.ai-turn.is-colleague:last-of-type [data-ai-job] .ai-job-goal').innerText()) === GOAL && (await page.locator('.ai-turn.is-colleague:last-of-type [data-ai-job] [data-job-stands]').innerText()) === '1 of 4 done', '1 …with the goal in the person’s words and where it stands: 1 of 4 done');
ok((await page.locator('.ai-turn.is-colleague:last-of-type .ai-words').innerText()).trim() === 'On it — the stops first, then the report.', '1 her one line of plan above it');
ok((await page.locator('.ai-ctx [data-ai-job] [data-job-step]').count()) === 4 && (await page.locator('.ai-ctx [data-ai-job] [data-job-stands]').innerText()) === '1 of 4 done', '1 the plan is on the context panel too');
ok((await page.locator('[data-ai-stop]').count()) === 1 && (await page.getByRole('button', { name: 'Send', exact: true }).count()) === 0 && (await page.getByRole('button', { name: 'Stop', exact: true }).isEnabled()), '1 Stop stands where Send was while she works');
const said1 = bodies[1]?.focus ?? '';
ok(/JOB IN HAND: Find out where Line 2 loses its time/.test(said1) && /1\. \[Doing\] Find where the time goes {3}← the step in hand/.test(said1) && /4\. \[To do\] Say what it means/.test(said1), '1 and she is told the job and the step in hand with every round');
hold.open();

/* ---- 2 · CARRIED ON BY THE APP ---- */
await finished(1);
ok(bodies.length === 9 && plan.length === 0, `2 the job took ${bodies.length} asks — past one go of ${consts.MAX_ROUNDS} — and the person said nothing more`);
const people = await page.locator('.ai-turn:not(.is-colleague)').count();
ok(people === 1, `2 one message from the person in the conversation (${people})`);
const go2 = bodies[6];
ok(!go2.pending && bodies[5].pending && go2.turns.length === bodies[5].turns.length + 2, '2 the next go starts clean of the last go’s carry, two turns longer');
const handed = go2.turns[go2.turns.length - 2], line = go2.turns[go2.turns.length - 1];
ok(handed.role === 'colleague' && handed.text.startsWith('On it — the stops first, then the report.\n\nNow the report.\n[') && /\[Work it out: Downtime by category \[result R\w+\] .*Jam: 15; Film: 12; Label: 3\. Totals: sum of minutes 30\./.test(handed.text) && /\[Tick a step of the job: Step 1 of 4 done — Jam 15 of the 30 minutes\./.test(handed.text) && /\[Make a chart: /.test(handed.text) && /\[Build the report: /.test(handed.text),
  `2 the last go is handed on as the conversation’s own record — her words, then what each step found (${handed.text.length} characters, the ids of what was made among them)`);
ok(line.role === 'person' && line.text === consts.CARRY_ON, '2 …and after it the app’s own line, said to be the app’s');
const kept = await page.evaluate(async () => { const d = await import('/src/db.ts'); const s = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0]; const turn = [...s.facts.turns].reverse().find(x => x.kind === 'reply'); return { used: (turn.used ?? []).map(u => `${u.name}:${u.status}`), reports: (s.facts.reports ?? []).map(r => ({ title: r.title, sections: r.sections.map(x => x.kind) })), job: turn.job, unsure: turn.unsure ?? [], checked: turn.checked, legs: turn.timing?.rounds }; });
ok(kept.used.filter(u => u === 'build_report:done').length === 3 && !kept.used.some(u => /failed|dropped/.test(u)), `2 the step asked for on the sixth round was not run then, and was run when asked again: three sections built, none twice (${kept.used.filter(u => u.startsWith('build_report')).join(', ')})`);

/* ---- 3 · FINISHED ---- */
const answer = (await page.locator('.ai-turn.is-colleague:last-of-type .ai-words').innerText()).trim();
ok(answer.endsWith('Done. The report is “Line 2 — where the time goes”. Jam took 15 of the 30 minutes lost — half of it, all on the Bagger. That is what the stops timed show; why it jams is not known yet.'), '3 she finishes with the result, in her words');
ok(JSON.stringify(kept.reports) === JSON.stringify([{ title: 'Line 2 — where the time goes', sections: ['chart', 'finding', 'recommendation'] }]) && (await page.locator('.ai-turn.is-colleague:last-of-type [data-report]').count()) === 1, `3 the report is made, its three sections in order (${JSON.stringify(kept.reports)})`);
ok(kept.unsure.length === 0 && kept.checked >= 2 && (await page.locator('.ai-turn.is-colleague:last-of-type [data-ai-fig-check]').count()) === 0 && /figures checked/.test(await page.locator('.ai-turn.is-colleague:last-of-type [data-ai-figures="ok"]').innerText()),
  `3 every figure in her answer is checked (${kept.checked}), though the result behind them was worked a go of rounds earlier`);
const fold = page.locator('.ai-turn.is-colleague:last-of-type [data-ai-job-kept]');
ok((await fold.locator('summary').innerText()).trim() === 'The job · Finished — 4 of 4 done' && !(await fold.evaluate(e => e.open)), '3 the plan is kept folded under the answer: The job · Finished — 4 of 4 done');
await fold.locator('summary').click(); await page.waitForTimeout(300);
const after = await jobList('.ai-turn.is-colleague:last-of-type [data-ai-job-kept]');
ok(JSON.stringify(after.map(x => `${x.word}: ${x.body}`)) === JSON.stringify(['Done: Find where the time goes — Jam 15 of the 30 minutes', 'Done: Chart it — the chart is made', 'Done: Build the report — Line 2 — where the time goes', 'Done: Say what it means — Jam is half the lost time']) && !after.some(x => x.next),
  '3 …opened: each step Done with what it found, none marked in hand');
ok(!!kept.job?.endedAt && (await page.getByRole('button', { name: 'Send', exact: true }).count()) === 1 && (await page.locator('[data-ai-stop]').count()) === 0, '3 the job is ended, and Send is back');
await page.reload(); await page.waitForTimeout(3000);
ok((await page.locator('.ai-turn.is-colleague:last-of-type [data-ai-job-kept] summary').innerText()).trim() === 'The job · Finished — 4 of 4 done' && (await page.locator('.ai-turn.is-colleague:last-of-type [data-report]').count()) === 1, '3 kept after a reload — the plan under the answer, the report');

/* ---- 4 · A SECOND JOB, STOPPED ---- */
const before = bodies.length;
const thinking = gate();
plan = [
  () => calls('Right — last week now.', ['p2', 'plan_job', { goal: 'The same for the week before', steps: ['Find the week before', 'Compare the two weeks', 'Add it to the report'] }], ['w1', 'job_step', { step: 1, status: 'doing' }]),
  () => calls('', ['w1d', 'job_step', { step: 1, status: 'done', note: 'no stops timed that week' }]),
  /* she is thinking when Stop is pressed: what she then asks for is not run */
  async () => { await thinking.p; return calls('Comparing them.', ['never', 'query_data', { source: `stops:${L}`, title: 'NEVER RUN', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }] }]); },
  () => ({ ok: true, reply: 'THIS IS NEVER ASKED FOR.' }),
];
await send('Now the same for the week before.');
await page.waitForFunction(() => document.querySelectorAll('.ai-turn.is-colleague:last-of-type [data-ai-job] [data-job-step][data-job-status="done"]').length === 1, null, { timeout: 20000 }).catch(() => undefined);
await page.locator('[data-ai-stop]').click(); await page.waitForTimeout(300);
ok((await page.locator('[data-ai-stop]').isDisabled()) && /Stopping/.test(await page.locator('.ai-hint').innerText()), '4 Stop pressed while she is thinking: it says Stopping, and cannot be pressed twice');
thinking.open();
await finished(2);
const stopped = (await page.locator('.ai-turn.is-colleague:last-of-type .ai-words').innerText()).trim();
ok(stopped === `Right — last week now.\n\nComparing them.\n\n${consts.STOPPED}`, `4 the answer says Stopped, with what she had said: “${stopped.replace(/\n+/g, ' / ')}”`);
ok(bodies.length === before + 3 && plan.length === 1, `4 nothing more was asked of the gateway after Stop (${bodies.length - before} asks, one answer never asked for)`);
const kept2 = await page.evaluate(async () => { const d = await import('/src/db.ts'); const s = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0]; const turn = [...s.facts.turns].reverse().find(x => x.kind === 'reply'); return { used: (turn.used ?? []).map(u => `${u.name}:${u.status}`), results: (s.facts.results ?? []).map(r => r.title), job: turn.job?.steps.map(x => x.status) }; });
ok(!kept2.used.some(u => u.startsWith('query_data')) && !kept2.results.includes('NEVER RUN'), '4 what she asked for after Stop was not run');
ok(JSON.stringify(kept2.job) === JSON.stringify(['done', 'todo', 'todo']) && (await page.locator('.ai-turn.is-colleague:last-of-type [data-ai-job-kept] summary').innerText()).trim() === 'The job · 1 of 3 done', '4 what she had done is kept — the plan as it stood, one step done');
ok((await page.getByRole('button', { name: 'Send', exact: true }).count()) === 1 && (await page.locator('.ai-turn.is-colleague:last-of-type .ai-sug').allInnerTexts()).includes('Carry on'), '4 Send is back, and Carry on is offered');

/* ---- 5 · THE PHONE ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.reload(); await page.waitForTimeout(3000);
const phoneHold = gate();
plan = [
  () => calls('Carrying on.', ['w2', 'job_step', { step: 2, status: 'doing' }]),
  async () => { await phoneHold.p; return { ok: true, reply: 'Nothing to compare — the week before has no stops timed.' }; },
];
await send('Carry on');
await page.waitForFunction(() => !!document.querySelector('.ai-turn.is-colleague:last-of-type [data-ai-job] [data-job-step][data-job-status="doing"]'), null, { timeout: 20000 }).catch(() => undefined);
const phone = await page.evaluate(() => {
  const job = document.querySelector('.ai-turn.is-colleague:last-of-type [data-ai-job]')?.getBoundingClientRect();
  const stop = document.querySelector('[data-ai-stop]')?.getBoundingClientRect();
  return { jobLeft: job ? Math.round(job.left) : null, jobRight: job ? Math.round(job.right) : null, stopH: stop ? Math.round(stop.height) : 0, stopW: stop ? Math.round(stop.width) : 0, vw: window.innerWidth };
});
ok(phone.jobLeft !== null && phone.jobLeft >= 0 && phone.jobRight <= phone.vw && phone.stopH >= 44 && phone.stopW >= 44 && (await t.wide()) <= 1, `5 the phone: the plan inside the screen, Stop ${phone.stopW} × ${phone.stopH} px, nothing off the side`);
phoneHold.open();
await finished(3);

await t.finish('A job accepted: handed over once, planned and watched as it ticks, carried on by the app past one go of rounds with the last go handed on, finished with the report made and every figure checked, the plan kept under the answer after a reload; a second job stopped part-way with what was done kept; and on the phone.');
