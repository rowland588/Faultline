/* ACCEPTANCE — WHERE THE PROJECT IS, AND WHAT ITS TOOLS ARE SHOWING (docs/METHODS.md §17; lib/methodDashboard, project/method/
 * MethodDashboard — Rowland, 1 November: "each tool has to create insightfulness ... an ongoing summary ... then a report puts it
 * all together ... where are we on the journey? what's the tool showing us? does it all feed into a dashboard?").
 *
 *   1  a project that has used nothing: the summary sentence the module's, the journey in order with "You are here", the empty state
 *   2  the DMAIC project with its capability study: the finding in the tool's own sentence, in the section that lists the tool, the
 *      attention list and the next step — every sentence on the page equal to the module's
 *   3  a tool result nobody has written up is flagged; written, the flag goes; a number claimed with no tool behind it is noted
 *   4  a late action is counted and said, red beside its words, and the summary carries it
 *   5  the project report on paper (Report ▾ › Project report; the page itself is method-report.mjs) — read back: the sentence, the journey, the finding, attention, next, what we wrote
 *   6  a client reads it; a phone fits
 *
 *   node scripts/acceptance/method-dashboard.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper as pressPaper } from '../lib/pageHeader.mjs';

const t = await openApp();
const { page, ok, go, words, norm } = t;
const sd = await t.seed();
const PD = sd.methodProjectIds.pdca, DM = sd.methodProjectIds.dmaic;
const truth = id => page.evaluate(async pid => {
  const db = await import('/src/db.ts'); const U = await import('/src/project/method/useDashboard.ts'); const M = await import('/src/lib/methods.ts'); const S = await import('/src/lib/methodSheet.ts');
  const p = await db.getProject(pid); const method = M.methodByKey(M.methodOfProject(p));
  const items = await db.listTestItems(pid); const answers = {};
  for (const i of items) { const a = i.kind === 'note' && !i.deletedAt ? S.answerOf(i.testId) : undefined; if (a?.method === method.key) answers[a.field] = i.what; }
  const d = U.dashboardOf(method, answers, await db.listStudies(pid), items.filter(i => !i.deletedAt).map(i => ({ kind: i.kind, what: i.what, due: i.due, doneAt: i.doneAt ?? null, testId: i.testId })));
  return d;
}, id);
const onPage = async () => ({
  says: norm(await words('.mdash-says')),
  steps: await page.locator('.mdash-step .mdash-name').allInnerTexts(),
  finds: (await page.locator('.mdash-f .mdash-says').allInnerTexts()).map(norm),
  att: (await page.locator('.mdash-a').allInnerTexts()).map(norm),
  next: norm(await words('.mdash-next')),
});

/* ---- 1 nothing used: a method project that has used no tool ---- */
const EMPTY = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const id = crypto.randomUUID(); const now = Date.now();
  await db.addProject({ id, name: 'Empty Kata project', color: '#0a6a5c', workspaceIds: [], method: 'kata', createdAt: now, updatedAt: now });
  return id;
});
await go(`#/project/${EMPTY}`, 2000);
await page.waitForSelector('.mdash', { timeout: 20000 });
let d = await truth(EMPTY), p = await onPage();
ok(p.says === norm(d.says) && /you are in .+ \(step 1 of \d\)/.test(p.says), `1 the summary is the module’s: ${d.says.slice(0, 110)}…`);
ok(JSON.stringify(p.steps) === JSON.stringify(d.sections.map(s => s.name)) && (await words('.mdash-step.is-here')).includes('You are here'), '1 the journey in the method’s order, with “You are here”');
ok(d.findings.length === 0 && (await words('.mdash-col[aria-label="What the tools are showing"]')).includes('No tool has been used in this project yet'), '1 no tool used: said, and where a tool falls in');
ok(p.next === norm(d.next), `1 what to do next: ${d.next}`);

/* ---- 2 a tool's finding, in its own words, in its section ---- */
await go(`#/project/${DM}`, 2200);
d = await truth(DM); p = await onPage();
ok(d.findings.length >= 1 && JSON.stringify(p.finds) === JSON.stringify(d.findings.map(f => norm(f.says))), `2 the tools’ findings equal the module’s (${d.findings.length}): ${d.findings.map(f => f.section + ' · ' + f.tool).join('; ')}`);
ok(d.findings.every(f => d.sections.some(s => s.name === f.section)) && (await words('.mdash-f .mdash-where')).includes(d.findings[0].tool), '2 each finding names the tool and the section it serves');
ok(JSON.stringify(p.att) === JSON.stringify(d.attention.map(a => norm(a.text))) && p.says === norm(d.says), '2 the attention list and the summary are the module’s');
{
  const link = page.locator('.mdash-f .linkish').first();
  await link.click(); await page.waitForTimeout(1200);
  ok(/capability|study/.test(page.url()), `2 a finding opens its record (${page.url().split('#')[1]})`);
}

/* ---- 3 written up, and claimed without a tool ---- */
await go(`#/project/${DM}`, 2000);
const section1 = d.findings[0].section;
ok(d.attention.some(a => a.kind === 'unwritten' && a.text.startsWith(section1)), `3 ${section1}: a tool result with nothing written is flagged`);
await page.evaluate(async ([pid, sec]) => {
  const db = await import('/src/db.ts'); const S = await import('/src/lib/methodSheet.ts'); const f = S.fieldsOf('dmaic', sec)[0]; const now = Date.now();
  await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: S.answerScope('dmaic', f.id), kind: 'note', what: 'Seal strength drifting low on jaw 2', sort: now, createdAt: now, updatedAt: now });
}, [DM, section1]);
await go(`#/project/${DM}`, 2000);
d = await truth(DM); p = await onPage();
ok(!d.attention.some(a => a.kind === 'unwritten' && a.text.startsWith(section1)) && JSON.stringify(p.att) === JSON.stringify(d.attention.map(a => norm(a.text))), `3 once ${section1} is written the flag goes`);
const EM = (await page.evaluate(async pid => { const db = await import('/src/db.ts'); const M = await import('/src/lib/methods.ts'); return M.methodOfProject(await db.getProject(pid)); }, EMPTY));
await page.evaluate(async ([pid, key]) => {
  const db = await import('/src/db.ts'); const S = await import('/src/lib/methodSheet.ts'); const M = await import('/src/lib/methods.ts'); const now = Date.now();
  for (const sec of M.methodByKey(key).sections) { const f = S.fieldsOf(key, sec.name).find(x => (x.tools?.length ?? 0) > 0); if (f) { await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: S.answerScope(key, f.id), kind: 'note', what: 'A figure claimed from memory', sort: now, createdAt: now, updatedAt: now }); break; } }
}, [EMPTY, EM]);
await go(`#/project/${EMPTY}`, 2000);
d = await truth(EMPTY); p = await onPage();
ok(d.attention.some(a => a.kind === 'unproved') && p.att.some(a => /written with no number from a tool behind it/.test(a)), '3 a number claimed with no tool behind it is noted, naming the tool that would show it');

/* ---- 4 a late action ---- */
await page.evaluate(async pid => { const db = await import('/src/db.ts'); const S = await import('/src/lib/methodSheet.ts'); const now = Date.now(); await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: S.answerScope('pdca', 'number'), kind: 'note', what: 'Packs a minute at the packer', sort: now, createdAt: now, updatedAt: now }); await db.putTestItem({ id: crypto.randomUUID(), projectId: pid, testId: '', kind: 'next', what: 'Re-set the film dancer', due: '2026-01-05', sort: now, createdAt: now, updatedAt: now }); }, PD);
await go(`#/project/${PD}`, 2000);
d = await truth(PD); p = await onPage();
ok(d.actions.late === 1 && p.att[0] === '1 action is late: Re-set the film dancer.' && (await page.locator('.mdash-a.is-r').count()) === 1 && p.says.includes('1 action late.'), '4 a late action: counted, red beside its words, and in the summary');

/* ---- 5 the project report on paper ---- */
{
  const txt = await t.pdfText(() => pressPaper(page, /^Project report/), 'project-report');
  ok(txt.includes(norm(d.says).slice(0, 90)) && /Doing about it/i.test(txt) && /The journey/i.test(txt) && /What needs attention/i.test(txt) && /next: in /i.test(txt) && /What we wrote/i.test(txt), '5 the paper carries where we are, the journey, attention, what to do next and what we wrote');
  ok(txt.includes('Packs a minute at the packer') && txt.includes('1 action is late: Re-set the film dancer.'), '5 …with the team’s own words and the late action');
}

/* ---- 6 a client, a phone ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/project/${PD}`, 2000);
ok((await page.locator('.mdash').count()) === 1 && norm(await words('.mdash-says')).includes('PDCA'), '6 a client reads the dashboard');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
await page.setViewportSize({ width: 375, height: 800 }); await go(`#/project/${DM}`, 2000);
{ const w = await t.wide(); ok(w <= 1, `6 on a phone nothing is off the side (${w}px over)`); }

await t.finish('The project dashboard accepted: where the project is on its journey, what each tool is showing in its own words, what needs attention and what to do next, a late action, the project report on paper, a client, a phone');
