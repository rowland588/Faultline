/* ACCEPTANCE — THE WORK BESIDE LUNA (12 November, docs/LUNAR-ENVIRONMENT.md §5 — Rowland: "Prioritise putting actual charts,
 * calculations, results and working documents into the work pane alongside conversations. Also extend contextual display to machines
 * and problems, not just lines and projects"). The gateway played by the script; on Line 2 with four timed stops (Jam 10 + 5, Film 12,
 * Label 3 on the Bagger), at a desk and on a phone:
 *
 *   1  a question answered from the stops: the RESULT comes into view beside the conversation as its table — each category and its
 *      minutes as the kept result says them, the total 30, no frame, no "Open the page"
 *   2  a chart made from it: the CHART beside the conversation, its picture saying each figure
 *   3  a report built from them: the REPORT beside the conversation as its working document — its sections' words and its chart
 *   4  Show beside the conversation on the earlier result brings the table back
 *   5  a conversation about a problem on the Bagger: THE PROBLEM in context (its words, priority, who has it, late), THE MACHINE in
 *      context (the Bagger on Line 2, the other open problem on it, the study of it), and the line under them; the machine opening its
 *      own page as the work
 *   6  the phone: the result's table and the context inside the screen, presses 44 px
 *
 *   node scripts/acceptance/luna-work-pane.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const errs = []; page.on('pageerror', e => errs.push(e.message));
const CORS = { 'access-control-allow-origin': '*' };
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: true, reply: 'Noted.' }) });
});
let replies = 0;
const answered = async () => {
  replies++;
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), replies, { timeout: 15000 }).catch(() => undefined);
  await page.waitForTimeout(800);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const result = b => b.pending?.results?.[0];
const calls = (...cs) => () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: cs.map(([id, name, input]) => ({ id, name, input })) });
const then = reply => () => ({ ok: true, reply });

const L = await page.evaluate(async () => {
  const [{ addLineToFactory }, d] = await Promise.all([import('/src/lib/lines.ts'), import('/src/db.ts')]);
  const w = await addLineToFactory('Line 2');
  await d.updateWorkspace({ ...w, assets: ['Filler', 'Bagger', 'Case packer'] });
  const T0 = Date.UTC(2026, 10, 2, 8);
  for (const [cat, min] of [['Jam', 10], ['Jam', 5], ['Film', 12], ['Label', 3]]) await d.addObservation({ id: crypto.randomUUID(), workspaceId: w.id, category: cat, asset: 'Bagger', startedAt: T0, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: T0, updatedAt: T0 });
  return w.id;
});
await t.go('#/ai', 2500);

/* ---- 1 · a result, beside the conversation ---- */
let R1 = '';
plan = [calls(['q', 'query_data', { source: `stops:${L}`, title: 'Downtime by category', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }] }]),
  b => { R1 = result(b)?.data?.resultId ?? ''; return then('Jams lead.')(); }];
await send('Where does the time go on Line 2?');
await answered();
const pane = page.locator('[data-work].is-open');
ok((await pane.getAttribute('data-work-kind')) === 'result' && (await page.locator('[data-work-made] [data-result]').count()) === 1, `1 the result beside the conversation (${R1})`);
const rows = await page.$$eval('[data-work-made] .ai-result-t tbody tr', trs => trs.map(tr => [...tr.querySelectorAll('td')].map(td => td.textContent)));
const kept = await page.evaluate(async id => { const d = await import('/src/db.ts'); const s = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0]; return (s?.facts?.results ?? []).find(r => r.id === id)?.result; }, R1);
const want = (kept?.groups ?? []).map(g => [...g.key, ...g.values.map(v => String(v))]);
ok(JSON.stringify(rows) === JSON.stringify(want) && rows.length === 3, `1 its table is the kept result, row for row: ${JSON.stringify(rows)}`);
ok(/Total\s*30/.test(await page.locator('[data-work-made] .ai-result-t tfoot').innerText()), '1 its total, 30 minutes');
ok((await page.locator('[data-work] [data-work-frame]').count()) === 0 && (await page.locator('[data-work] .ai-work-full').count()) === 0, '1 drawn in place — no frame, no Open the page');

/* ---- 2 · a chart ---- */
plan = [calls(['c', 'make_chart', { resultId: R1, type: 'column', title: 'Line 2 downtime by category' }]), then('There it is.')];
await send('Chart that.');
await answered();
const alt = await page.locator('[data-work-made] .ai-chart-img').getAttribute('alt').catch(() => '');
ok((await pane.getAttribute('data-work-kind')) === 'chart' && /Jam 15/.test(alt ?? '') && /Film 12/.test(alt ?? '') && /Label 3/.test(alt ?? ''), `2 the chart beside the conversation, saying its figures ("${(alt ?? '').slice(0, 80)}")`);

/* ---- 3 · a report, as its working document ---- */
const CH = await page.evaluate(async () => { const d = await import('/src/db.ts'); const s = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0]; return s?.facts?.charts?.[0]?.id ?? ''; });
let D = '';
const build = async (words, input) => { plan = [() => calls(['b', 'build_report', { ...(D ? { reportId: D } : {}), ...input }])(), b => { D = D || result(b)?.data?.reportId; return then('Done.')(); }]; await send(words); await answered(); };
await build('Put it in a report.', { title: 'Line 2 downtime', op: 'add', section: { kind: 'chart', heading: 'Where the time goes', chartId: CH } });
await build('Add the finding.', { op: 'add', section: { kind: 'finding', heading: 'Jams lead', text: 'Jams cost 15 minutes — 50% of the 30 recorded.', evidence: [R1] } });
const doc = page.locator('[data-work-made] [data-report-doc]');
const docText = await doc.innerText().catch(() => '');
ok((await pane.getAttribute('data-work-kind')) === 'convreport' && /Where the time goes/.test(docText) && /Jams cost 15 minutes — 50% of the 30 recorded/.test(docText) && (await doc.locator('.ai-chart-img').count()) === 1,
  '3 the report beside the conversation as its document — the finding’s words and its chart');
ok((await doc.locator('[data-report-pdf]').count()) === 1, '3 its PDF from the same card');

/* ---- 4 · an earlier result brought back ---- */
await page.locator(`[data-show-beside="result:${R1}"]`).click();
await page.waitForTimeout(600);
ok((await pane.getAttribute('data-work-kind')) === 'result' && (await page.locator('[data-work-made] .ai-result-t tbody tr').count()) === 3, '4 Show beside the conversation brings the result back');

/* ---- 5 · a problem and its machine, in context ---- */
const ctx = await page.evaluate(async ws => {
  const d = await import('/src/db.ts'); const c = await import('/src/colleague/conversation.ts');
  const now = Date.now(); const day = 86_400_000;
  await d.addSnag({ id: 'wp-film', workspaceId: ws, problem: 'Film tears on the Bagger at splice', targetAsset: 'Bagger', priority: 'critical', owner: 'Tom Reed', dueAt: now - 2 * day, media: [], status: 'open', raisedAt: now - 5 * day, updatedAt: now, latestUpdate: 'New splice tape on trial' });
  await d.addSnag({ id: 'wp-jam', workspaceId: ws, problem: 'Bags not opening on the Bagger', targetAsset: 'Bagger', priority: 'high', media: [], status: 'open', raisedAt: now - day, updatedAt: now });
  await d.addSnag({ id: 'wp-fill', workspaceId: ws, problem: 'Filler drips', targetAsset: 'Filler', priority: 'low', media: [], status: 'open', raisedAt: now, updatedAt: now });
  await d.putStudy({ id: 'wp-cap', tool: 'capability', name: 'Seal strength', workspaceId: ws, machine: 'Bagger', facts: {}, uses: [], startedAt: now, createdAt: now, updatedAt: now });
  const st = c.newConversation({ id: 'wp-conv', at: now, name: 'Film tears', thread: { id: 'wp-t', title: 'Film tears on the Bagger', scope: { lineId: ws, machine: 'Bagger', problemId: 'wp-film' } } });
  st.facts.turns = [{ id: 't1', at: now - 60000, who: 'You', kind: 'typed', text: 'Let’s look at the film tears on the bagger.' }, { id: 't2', at: now - 50000, who: 'Faultline', kind: 'reply', text: 'The problem and its machine are beside us.' }];
  await d.putStudy(st);
  return { ok: true };
}, L);
await t.go('#/ai?c=wp-conv', 2800);
const prob = await t.words('[data-work-context="problem"]');
ok(/Film tears on the Bagger at splice/.test(prob) && /Critical/.test(prob) && /Tom Reed has it/.test(prob) && /late — due/.test(prob) && /New splice tape on trial/.test(prob),
  `5 the problem in context — its words, priority, who has it, late, its latest ("${prob.replace(/\s+/g, ' ').slice(0, 140)}")`);
const mac = await t.words('[data-work-context="machine"]');
ok(/Bagger/.test(mac) && /on Line 2/.test(mac) && /Bags not opening on the Bagger/.test(mac) && !/Filler drips/.test(mac) && !/Film tears/.test(mac) && /Seal strength/.test(mac),
  `5 the machine in context — the Bagger on Line 2, its other open problem, its study, nothing of the Filler ("${mac.replace(/\s+/g, ' ').slice(0, 140)}")`);
ok((await page.locator('[data-work-context="line"]').count()) === 1, '5 the line under them');
await page.locator('[data-wctx-open-machine]').click();
await page.waitForTimeout(2000);
ok(/\/lines\/[^/]+\/machine\/Bagger/.test((await page.locator('[data-work]').getAttribute('data-work-href')) ?? ''), '5 the machine opens its own page as the work');

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/ai?c=wp-conv', 2500);
if (await page.locator('[data-work].is-open .ai-work-x').count()) { await page.locator('[data-work].is-open .ai-work-x').click(); await page.waitForTimeout(400); }
await page.locator('.ai-strip').click();   // the phone's context sheet
await page.waitForTimeout(600);
ok((await page.locator('[data-work-context="problem"]:visible').count()) === 1 && (await page.locator('[data-work-context="machine"]:visible').count()) === 1, '6 a phone: the problem and the machine in the context sheet');
ok((await t.wide()) <= 0, `6 a phone: nothing off the side (${await t.wide()} px)`);
const small = await page.$$eval('[data-work-context] button, [data-show-beside]', els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 40; }).length);
ok(small === 0, `6 the context’s presses a thumb’s size (${small} small)`);
ok(errs.length === 0, `no page errors (${errs.slice(0, 2).join(' | ')})`);

await t.finish('The work beside Luna — results, charts and reports drawn in the pane; the problem and its machine in context.');
