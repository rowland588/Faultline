/* ACCEPTANCE — THE COLLEAGUE UNDERSTANDS THE APP, THE AIM AND WHERE WORK BELONGS (9 November; docs/AI-CONTEXT.md;
 * src/capabilities/understand, appModel). Rowland: "an intelligent manufacturing colleague that understands the application it
 * operates within, understands the user's intentions and knows how to connect conversational work to the correct application
 * records." Driven in a real browser on the smoke seed — Line 7 — smoke test and Line 7 in Acme Foods' Hull › Packing hall, Line 7
 * with "Line 7 improvement" on it, Brook Dairy's "Line 7 Brook" in a packing hall of its own — the `assist` gateway played by the
 * script round by round, so what is proved is what Faultline does with each call the colleague makes (its judgement in words is
 * the model's, held by the rules in colleagueAssist):
 *
 *   1  an observation analysis with no context: plan_work reads it as an observation and gives one question — which line, naming
 *      the client's lines — the step said under the turn
 *   2  "the packing hall": resolve_record one area; "Line 7": several — both Acme lines, never Brook's
 *   3  connected to the existing project: update_context with it — the panel says In the project, the Line 7 improvement chip
 *   4  a standalone investigation: a new conversation, "nothing to do with any projects, just a test" — standalone kept; the SMED
 *      draft in no project; its card says where it goes ("standalone — in no project, as you said")
 *   5  standalone → linked: made with Do it, in no project; link_to_project's card ("Put SMED … into the project … it stays on
 *      Line 7"), nothing changed until Do it, then in the project
 *   6  a general conversation: mode talk, a question answered with no call — no record, no problem, no draft made
 *   7  a change of subject and back: set_focus to a method question, then back to the investigation — its line, mode and record kept
 *   8  a correction: "no, the other Line 7" — update_context moves the draft to Line 7 — smoke test and drops the project not on it
 *   9  retrieving what exists: resolve_record by the record's name, list_problems on the line, tool_records — each said
 *  10  no duplicates by default: start_project with the existing project's name refused on Do it; raise_problem's card naming the
 *      open problem that says the same; start_draft twice gives the same draft
 *  11  client separation: resolve_record for Brook's line from an Acme conversation finds none; describe_faultline as a client lists
 *      the writes as not open
 *  12  Manual Mode: the SMED made and linked opens on its own page, sitting on Line 7 and in Line 7 improvement; the project's
 *      Tools lists it; the phone at 390 shows the context panel's mode in its sheet, nothing off the side
 *
 *   node scripts/acceptance/ai-context.mjs   (SMOKE_BASE, as smoke) */
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
  const answer = next ? next(body) : { ok: false, why: 'nothing planned' };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});
const answered = async (n, ms = 12000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(500);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const result = (b, i = 0) => b?.pending?.results?.[i];
const dataOf = (b, i = 0) => result(b, i)?.data ?? {};
const lastReply = () => t.words('.ai-turn.is-colleague:last-of-type .ai-words');
const replies = () => page.locator('.ai-turn.is-colleague').count();
/* one round: the colleague calls `calls`, then answers with `reply(body)` once the results come back */
const round = (calls, reply) => [
  () => ({ ok: true, reply: '', calls: calls.map((c, i) => ({ id: `c${asks.length}-${i}`, ...c })), assistant: { v: 1 } }),
  b => ({ ok: true, reply: typeof reply === 'function' ? reply(b) : reply }),
];
const say = async (words, calls, reply) => { const n = await replies(); plan = calls ? round(calls, reply) : [() => ({ ok: true, reply })]; await send(words); await answered(n + 1); return asks.at(-1); };
const convId = () => page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(s => s.tool === 'talk' && s.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id);
const db = (fn, arg) => page.evaluate(async ([src, a]) => { const d = await import('/src/db.ts'); return (0, eval)(src)(d, a); }, [fn.toString(), arg]);

/* ---- the place: two Acme lines in the packing hall, a project on one, Brook's line elsewhere ---- */
const W = await page.evaluate(async () => {
  const seed = await import('/src/dev/seed.ts');
  await seed.seedAreasForTest();
  const d = await import('/src/db.ts');
  const { addLineToFactory } = await import('/src/lib/lines.ts');
  const { putProjectOnLines } = await import('/src/lib/newProject.ts');
  const ws = (await d.listWorkspaces()).filter(w => !w.archived);
  const smoke = ws.find(w => w.name === 'Line 7 — smoke test'), seven = ws.find(w => w.name === 'Line 7');
  for (const w of [smoke, seven]) await d.updateWorkspace({ ...w, clientName: 'Acme Foods', assets: [...new Set([...(w.assets ?? []), 'Filler', 'Wrapper'])] });
  const brook = await addLineToFactory('Line 7 Brook');
  await d.updateWorkspace({ ...brook, clientName: 'Brook Dairy', siteName: 'Farm', areaName: 'Packing hall' });
  const p = await d.createProject('Line 7 improvement', '#2563eb', undefined, undefined, 'board', 'dmaic');
  await putProjectOnLines(p.id, [seven]);
  await d.addSnag({ id: 'twin-snag', workspaceId: seven.id, problem: 'Film breaks on the wrapper twice a shift', media: [], status: 'open', raisedAt: Date.now(), updatedAt: Date.now() });
  return { smoke: smoke.id, seven: seven.id, brook: brook.id, project: p.id };
});
ok(!!W.smoke && !!W.seven && !!W.project, '0 the packing hall: Line 7 — smoke test and Line 7 (Acme Foods), Line 7 improvement on Line 7, Brook Dairy’s Line 7 Brook');

/* ---- 1 · an observation analysis with no context ---- */
await t.go('#/ai', 2500);
let b = await say('I want to carry out an observation analysis', [{ name: 'plan_work', input: { words: 'I want to carry out an observation analysis' } }], x => dataOf(x).ask ?? 'nothing to ask');
const p1 = dataOf(b);
ok(p1.activity?.id === 'observe' && /Which line/.test(p1.ask ?? '') && (p1.missing ?? []).includes('line'), `1 plan_work reads an observation and asks one thing: "${p1.ask}"`);
ok(/Line 7 \(Acme Foods\)/.test(p1.ask ?? '') && /Line 7 Brook \(Brook Dairy\)/.test(p1.ask ?? ''), '1 two clients in sight: each line offered says whose — never one list of two businesses');
ok((await page.locator('[data-step="plan_work"]').count()) === 1 && /observation/i.test(await t.words('[data-step="plan_work"]')), '1 the step said under the turn');
await page.screenshot({ path: process.env.AI_SHOTS ? `${process.env.AI_SHOTS}/ctx-1.png` : '/dev/null' }).catch(() => undefined);

/* ---- 2 · the packing hall, then several lines ---- */
b = await say('Let’s look at the packing hall', [{ name: 'set_focus', input: { title: 'Observation in the packing hall' } }, { name: 'resolve_record', input: { words: 'the packing hall', kind: 'area' } }], 'The packing hall — Line 7 or Line 7 — smoke test?');
const area = dataOf(b, 1);
ok(area.match === 'several' && (area.candidates ?? []).every(c => c.kind === 'area' && c.label === 'Packing hall') && area.candidates.some(c => /Acme Foods/.test(c.sub)) && area.candidates.some(c => /Brook Dairy/.test(c.sub)), `2 "the packing hall" with no client in hand is two areas — asked which: ${(area.candidates ?? []).map(c => c.sub).join(' | ')}`);
b = await say('Acme’s', [{ name: 'resolve_record', input: { words: 'the packing hall', kind: 'area', lineId: W.smoke } }], 'Acme’s packing hall — two lines.');
ok(dataOf(b).match === 'one' && /Acme Foods › Hull — 2 lines/.test(dataOf(b).candidates?.[0]?.sub ?? ''), `2 with Acme’s line in hand it is one: ${dataOf(b).candidates?.[0]?.sub}`);
b = await say('Line 7', [{ name: 'resolve_record', input: { words: 'Line 7', kind: 'line', lineId: W.smoke } }], x => dataOf(x).match === 'several' ? `There are ${dataOf(x).candidates.length} — which?` : 'one');
const several = dataOf(b);
const labels = (several.candidates ?? []).map(c => c.label);
ok(several.match === 'several' && labels.includes('Line 7') && labels.includes('Line 7 — smoke test') && !labels.includes('Line 7 Brook'), `2 "Line 7" in Acme’s factory is several — never Brook’s: ${labels.join(' · ')}`);

/* ---- 3 · connected to the existing project ---- */
b = await say('The plain Line 7 — and use the existing project there', [
  { name: 'update_context', input: { lineId: W.seven, objective: 'see what the packers are doing' } }, { name: 'resolve_record', input: { words: 'the existing project', kind: 'project', lineId: W.seven } },
], 'Line 7, in Line 7 improvement.');
const proj = dataOf(b, 1);
const onSeven = await page.evaluate(async id => { const d = await import('/src/db.ts'); const { factoryLinesOf } = await import('/src/lib/lineRecords.ts'); const jl = await d.allPaceLines(); return (await d.ensureProjects()).filter(p => !p.archivedAt && !p.deletedAt && factoryLinesOf(p.id, jl).includes(id)).map(p => p.name).sort(); }, W.seven);
const got3 = (proj.candidates ?? []).map(c => c.label).sort();
ok(JSON.stringify(got3) === JSON.stringify(onSeven) && proj.match === (onSeven.length === 1 ? 'one' : 'several'), `3 "the existing project" on Line 7 is the line's own projects — ${proj.match}: ${got3.join(' · ')}`);
await say('Yes, that one', [{ name: 'update_context', input: { projectId: W.project } }], 'In the project now.');
ok((await page.locator('[data-ctx-current] [data-ctx-mode="project"]').count()) === 1 && /Line 7 improvement/.test(await t.words('[data-ctx-current]')), '3 the panel says In the project, with Line 7 improvement as a chip');
ok(/see what the packers are doing/.test(await t.words('[data-ctx-aim]')), '3 the aim kept on the subject');
const focus3 = asks.at(-1)?.focus ?? '';
ok(/Aim: see what the packers are doing/.test(focus3) && /Kind of work: in the project/.test(focus3), '3 the gateway is told the aim and the kind of work');

/* ---- 4 · a standalone investigation, in a new conversation ---- */
await t.go(`#/ai?line=${encodeURIComponent(W.seven)}`, 2500);
ok((await convId()) && (await page.locator('.ai-turn').count()) === 0, '4 the door on another line starts a new conversation, not the one in hand');
await say('I want to analyse the changeover time on the filler. Nothing to do with any projects — this is just a test.', [
  { name: 'set_focus', input: { title: 'Filler changeover', scope: { lineId: W.seven } } }, { name: 'update_context', input: { mode: 'standalone', machine: 'Filler', objective: 'time the Filler changeover' } }, { name: 'start_draft', input: { kind: 'smed', key: 'smed', title: 'Filler changeover test' } },
], 'Standalone it is — a SMED draft on Line 7, in no project.');
ok((await page.locator('[data-ctx-current] [data-ctx-mode="standalone"]').count()) === 1, '4 the panel says Standalone — in no project');
let drafts = await db((d, id) => d.getStudy(id).then(s => s.facts.drafts ?? []), await convId());
const smedDraft = drafts.find(x => x.kind === 'smed');
ok(!!smedDraft && smedDraft.scope.lineId === W.seven && !smedDraft.scope.projectId, '4 the SMED draft is on Line 7 and in no project');
const twice = await say('Start the SMED', [{ name: 'start_draft', input: { kind: 'smed', key: 'smed' } }], x => (dataOf(x).again ? 'Already being built.' : 'A second one.'));
ok(dataOf(twice).draftId === smedDraft?.id && dataOf(twice).again === true, '10 start_draft again gives the same draft, never a second');
await say('42 minutes now, 25 is the aim; the steps are cleaning and waiting for the fitter', [{ name: 'fill_draft', input: { draftId: smedDraft?.id, values: [
  { field: 'current', value: 42, how: 'reported' }, { field: 'target', value: 25, how: 'reported' }, { field: 'machines', value: ['Filler'], how: 'reported' }, { field: 'elements', value: ['Cleaning', 'Waiting for the fitter'], how: 'reported' },
] } }], 'Got the figures.');
plan = [() => ({ ok: true, reply: '', calls: [{ id: 'mk', name: 'make_record', input: { draftId: smedDraft?.id } }], assistant: { v: 1 } }), () => ({ ok: true, reply: 'Made.' })];
let n = await replies();
await send('Keep it');
await page.waitForSelector('[data-card="make_record"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const mk = await t.words('[data-card="make_record"][data-card-status="waiting"]');
ok(/on Line 7 \(Hull › Packing hall\), standalone — in no project, as you said/.test(mk), `4 the card says where it goes: "${(mk.match(/on Line 7[^,]*,[^,.]*/) ?? [''])[0]}"`);

/* ---- 5 · made standalone, then linked ---- */
await page.locator('[data-card="make_record"][data-card-status="waiting"]').getByRole('button', { name: 'Do it' }).click();
await answered(n + 1);
const made = (await db(d => d.listAllStudies())).find(s => s.tool === 'changeover' && s.name === 'Filler changeover test');
ok(!!made && made.workspaceId === W.seven && !made.projectId, '5 made on Line 7, in no project');
await say('What else is open there?', [{ name: 'list_problems', input: { lineId: W.seven } }, { name: 'tool_records', input: { lineId: W.seven } }], 'Two things are open.');
ok(/Film breaks on the wrapper/.test(await t.words('[data-step="list_problems"]')) && /Filler changeover test/.test(await t.words('[data-step="tool_records"]')), '9 the problems and the tool records on the line, each said');
b = await say('Actually, connect this to the Line 7 improvement project', [{ name: 'resolve_record', input: { words: 'Line 7 improvement project', kind: 'project' } }, { name: 'link_to_project', input: { projectId: W.project, studyId: made?.id } }], 'Proposed.');
await page.waitForSelector('[data-card="link_to_project"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
const link = await t.words('[data-card="link_to_project"][data-card-status="waiting"]');
ok(/Put SMED “Filler changeover test” into the project “Line 7 improvement” — it stays on Line 7/.test(link), '5 the link card says what will happen first');
ok(!(await db((d, id) => d.getStudy(id), made?.id))?.projectId, '5 nothing linked while the card waits');
n = await replies();
plan = [() => ({ ok: true, reply: 'Linked.' })];
await page.locator('[data-card="link_to_project"][data-card-status="waiting"]').getByRole('button', { name: 'Do it' }).click();
await answered(n + 1);
ok((await db((d, id) => d.getStudy(id), made?.id))?.projectId === W.project, '5 Do it: the SMED is in Line 7 improvement');
ok((await page.locator('[data-ctx-current] [data-ctx-mode="project"]').count()) === 1, '5 the subject is now in the project');

/* ---- 6 · a general conversation keeps nothing ---- */
const before = await db(d => Promise.all([d.listAllStudies(), d.listAllSnags()]).then(([s, p]) => s.length + p.length));
await say('Hypothetically — if a changeover is 42 minutes and we do six a week, is SMED or a schedule change the better first move?', [{ name: 'set_focus', input: { title: 'SMED or the schedule — a what-if' } }, { name: 'update_context', input: { mode: 'talk' } }], 'Start with SMED on the longest element …');
ok((await page.locator('[data-ctx-current] [data-ctx-mode="talk"]').count()) === 1, '6 the what-if said to be just talk');
const after = await db(d => Promise.all([d.listAllStudies(), d.listAllSnags()]).then(([s, p]) => s.length + p.length));
ok(after === before, `6 nothing kept: ${before} records before, ${after} after (the conversation itself apart)`);

/* ---- 7 · back to the investigation ---- */
await say('Right, back to the Filler changeover', [{ name: 'set_focus', input: { title: 'Filler changeover' } }], 'Back on it.');
const back = await t.words('[data-ctx-current]');
ok(/Filler/.test(back) && (await page.locator('[data-ctx-current] [data-ctx-mode="project"]').count()) === 1, `7 back on the investigation with its machine and its project: "${back.replace(/\s+/g, ' ').slice(0, 160)}"`);
ok(/SMED or the schedule/.test(await t.words('[data-ctx-parked]')), '7 the what-if parked, not lost');

/* ---- 8 · a correction ---- */
await page.getByRole('button', { name: 'New conversation' }).first().click(); await page.waitForTimeout(800);
await say('Losses on Line 7', [{ name: 'set_focus', input: { title: 'Losses on Line 7', scope: { lineId: W.seven } } }, { name: 'update_context', input: { projectId: W.project } }, { name: 'start_draft', input: { kind: 'smed', key: 'smed', title: 'Changeover — other line' } }], 'Started.');
const cid = await convId();
b = await say('No — I meant the other Line 7, the smoke test one', [{ name: 'update_context', input: { lineId: W.smoke } }], x => result(x)?.says ?? '');
ok(/“Losses on Line 7”: Now on Line 7 — smoke test \(corrected\); the project is not on that line, so it is taken off; 1 draft moved/.test(result(b)?.says ?? ''), `8 corrected: "${result(b)?.says}"`);
drafts = await db((d, id) => d.getStudy(id).then(s => s.facts.drafts ?? []), cid);
ok(drafts.find(x => x.title === 'Changeover — other line')?.scope?.lineId === W.smoke && !drafts.find(x => x.title === 'Changeover — other line')?.scope?.projectId, '8 the draft moved to Line 7 — smoke test, out of the project');

/* ---- 9 · retrieving by name ---- */
b = await say('Find the filler changeover test', [{ name: 'resolve_record', input: { words: 'filler changeover test', kind: 'study' } }], 'Found it.');
ok(dataOf(b).candidates?.[0]?.label === 'Filler changeover test' && /SMED/.test(dataOf(b).candidates[0].sub), `9 a record by its name: ${dataOf(b).candidates?.[0]?.label} — ${dataOf(b).candidates?.[0]?.sub}`);

/* ---- 10 · no duplicates ---- */
plan = [() => ({ ok: true, reply: '', calls: [{ id: 'sp', name: 'start_project', input: { name: 'Line 7 improvement', method: 'pdca', lineIds: [W.seven] } }], assistant: { v: 1 } }), () => ({ ok: true, reply: 'It already exists.' })];
n = await replies();
await send('Start a project called Line 7 improvement');
await page.waitForSelector('[data-card="start_project"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
ok(/Already on these lines: “Line 7 improvement”/.test(await t.words('[data-card="start_project"]')), '10 start_project’s card names the project already on the line');
await page.locator('[data-card="start_project"][data-card-status="waiting"]').getByRole('button', { name: 'Do it' }).click();
await answered(n + 1);
ok((await db(d => d.ensureProjects())).filter(p => p.name === 'Line 7 improvement' && !p.deletedAt).length === 1 && /already a project/.test(await t.words('[data-card="start_project"]')), '10 Do it refused — still one Line 7 improvement');
plan = [() => ({ ok: true, reply: '', calls: [{ id: 'rp', name: 'raise_problem', input: { lineId: W.seven, words: 'Wrapper film breaks twice a shift', priority: 'high', how: 'reported' } }], assistant: { v: 1 } }), () => ({ ok: true, reply: 'Left it.' })];
await send('Raise the wrapper film breaking');
await page.waitForSelector('[data-card="raise_problem"][data-card-status="waiting"]', { timeout: 10000 }).catch(() => undefined);
ok(/already has an open problem like this: “Film breaks on the wrapper twice a shift”/.test(await t.words('[data-card="raise_problem"]')), '10 raise_problem’s card names the open problem that says the same');
n = await replies();
await page.locator('[data-card="raise_problem"][data-card-status="waiting"]').getByRole('button', { name: 'Not now' }).click();
await answered(n + 1);

/* ---- 11 · never another client's ---- */
b = await say('What about Line 7 Brook?', [{ name: 'resolve_record', input: { words: 'Line 7 Brook', kind: 'line', lineId: W.seven } }], x => dataOf(x).match);
ok(dataOf(b).match === 'none' || !(dataOf(b).candidates ?? []).some(c => c.label === 'Line 7 Brook'), `11 Brook Dairy’s line is never found from Acme’s (${dataOf(b).match})`);
const client = await page.evaluate(async () => (await (await import('/src/capabilities/registry.ts')).runCall({ now: Date.now(), level: 'client' }, { id: 'd', name: 'describe_faultline', input: { about: 'capabilities' } }, { confirmed: false })).data.capabilities.filter(c => c.kind === 'write' && c.available).length);
ok(client === 0, '11 as a client, describe_faultline lists no write as open');

/* ---- 12 · Manual Mode ---- */
await t.go(`#/smed/${encodeURIComponent(made?.id ?? '')}`, 2500);
const where = await t.words('main');
ok(/Filler changeover test/.test(where) && /Line 7 improvement/.test(where), '12 the SMED opens on its own page, in Line 7 improvement');
await t.go(`#/project/${encodeURIComponent(W.project)}/tools`, 2500);
ok(/Filler changeover test|SMED/.test(await t.words('main')), '12 the project’s Tools lists it');
await page.setViewportSize({ width: 390, height: 844 });
await t.go(`#/ai?c=${encodeURIComponent(cid)}`, 2500);
await page.locator('.ai-strip').click(); await page.waitForTimeout(600);
ok((await page.locator('.sheet [data-ctx-mode]').count()) === 1 && (await t.wide()) <= 0, `12 the phone: the kind of work in the context sheet, nothing off the side (${await t.wide()} px)`);

await t.finish('The colleague understands the app and where work belongs: what is wanted read and one question asked; areas, lines, projects and records resolved, several asked about, none never guessed; standalone kept standalone and linked by a card; just talk keeps nothing; a correction moves the draft; no duplicate by default; another client never seen; made records in Manual Mode.');
