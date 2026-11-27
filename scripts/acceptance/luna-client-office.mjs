/* ACCEPTANCE — client-office Luna (27 November): walk in, Hello Luna, then ask about their data.
 * Typed is enough (voice is luna-conversation-mode.mjs). Gateway played by the script; every figure from the seeded stops.
 *   node scripts/acceptance/luna-client-office.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
await page.reload();
await page.waitForTimeout(1500);

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

const answered = async (n, ms = 15000) => {
  for (const until = Date.now() + ms; plan.length && Date.now() < until;) await page.waitForTimeout(100);
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(400);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const calls = (...cs) => () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: cs.map(([id, name, input]) => ({ id, name, input })) });
const then = reply => () => ({ ok: true, reply });

const L2 = await page.evaluate(async () => {
  const [{ addLineToFactory }, d] = await Promise.all([import('/src/lib/lines.ts'), import('/src/db.ts')]);
  const w = await addLineToFactory('Line 2');
  await d.updateWorkspace({ ...w, clientName: 'Acme Foods' });
  const rows = [
    [Date.UTC(2026, 10, 10, 8), 'Film', 20],
    [Date.UTC(2026, 10, 11, 8), 'Jam', 8],
    [Date.UTC(2026, 10, 17, 8), 'Jam', 25],
    [Date.UTC(2026, 10, 18, 8), 'Film', 5],
    [Date.UTC(2026, 10, 18, 9), 'Label', 12],
  ];
  for (const [at, cat, min] of rows) {
    await d.addObservation({
      id: crypto.randomUUID(), workspaceId: w.id, category: cat, asset: 'Bagger',
      startedAt: at, durationMs: min * 60_000, timing: 'stopwatch', count: 1, media: [],
      createdAt: at, updatedAt: at,
    });
  }
  return w.id;
});

await t.go('#/ai', 3000);
await page.locator('.ai-box').waitFor({ state: 'visible', timeout: 20000 });

ok((await page.locator('.ai-empty .ai-orb').count()) >= 1 && (await t.words('.ai-empty-g')) === 'Luna', '0 empty — orb and Luna');
ok((await page.locator('.ai-empty .ai-sug').count()) === 0, '0 empty — no Faultline chips');

const beforeHello = asks.length;
await send('Hello Luna');
await answered(1);
ok(asks.length === beforeHello, '1 hello — no gateway');
ok((await page.locator('[data-ai-code]').count()) >= 1, '1 hello — answered in the app');
const hello = await t.words('.ai-turn.is-colleague');
ok(/good to (meet|see) you/i.test(hello) && /I'm Luna/i.test(hello), `1 hello — meeting, not a dead Hello: "${hello.slice(0, 80)}"`);
ok(!/\d/.test(hello.replace(/\d{1,2}:\d{2}/g, '').replace(/I'm Luna/g, '')), '1 hello — no figure');
ok((await page.locator('.ai-turn.is-colleague .ai-sug').count()) === 0, '1 hello — no Faultline chips');

plan = [
  calls(['q', 'query_data', { source: `stops:${L2}`, title: 'Top losses', groupBy: ['category'], measures: [{ op: 'sum', column: 'minutes' }], order: { by: 0, desc: true }, limit: 5 }]),
  then('Jam led the minutes.'),
];
await send('show me top losses');
await answered(2);
ok(asks.filter(a => a.turns?.at(-1)?.text === 'show me top losses').length >= 1, '2 top losses — went to the gateway');
ok((await page.locator('[data-step="query_data"]').count()) >= 1, '2 top losses — she started work');
const offer = await t.words('.ai-turn.is-colleague:last-of-type');
ok(/No problem — I'll get on it now/i.test(offer) && /How would you like it/i.test(offer), `2 top losses — organic offer: "${offer.slice(0, 120)}"`);
const chips = await page.locator('.ai-turn.is-colleague:last-of-type .ai-sug').allInnerTexts();
ok(chips.includes('Graphs') && chips.includes('A table') && chips.includes('A report'), `2 top losses — graphs chips: ${chips.join(' | ')}`);
ok((await page.locator('[data-chart]').count()) === 0, '2 top losses — no graph until they choose');
const o1 = await page.evaluate(async () => {
  const d = await import('/src/db.ts');
  const s = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return s?.facts?.results?.[0]?.result?.groups?.map(g => [g.key[0], g.values[0]]) ?? [];
});
ok(JSON.stringify(o1) === JSON.stringify([['Jam', 33], ['Film', 25], ['Label', 12]]), `2 top losses — app figures, never invented: ${JSON.stringify(o1)}`);

const beforeGraph = asks.length;
await page.locator('.ai-sug', { hasText: 'Graphs' }).click();
await page.waitForFunction(() => /graphs?/i.test((document.querySelector('.ai-box')?.value ?? '')), { timeout: 4000 }).catch(() => undefined);
await page.getByRole('button', { name: 'Send', exact: true }).click();
await answered(3);
ok(asks.length === beforeGraph, '3 Graphs — drawn in the app, no gateway');
ok((await page.locator('[data-chart]').count()) >= 1, '3 Graphs — a chart from the app’s result');
const alt = await page.locator('[data-chart] img').last().getAttribute('alt') ?? '';
ok(/Jam 33/.test(alt) && /Film 25/.test(alt), `3 Graphs — picture says the app’s figures: "${alt.slice(0, 120)}"`);

plan = [
  calls(['w', 'query_data', { source: `stops:${L2}`, title: 'Minutes by week', time: { column: 'day', by: 'week' }, measures: [{ op: 'sum', column: 'minutes' }] }]),
  then('Last week was heavier.'),
];
await send('what happened last week compared to the week before as a graph');
await answered(4);
ok((await page.locator('[data-step="query_data"]').count()) >= 2, '4 last week — she started work');
const weekReply = await t.words('.ai-turn.is-colleague:last-of-type');
ok(!/How would you like it/i.test(weekReply), '4 last week — they named graphs, so she did not ask again');
ok((await page.locator('[data-chart]').count()) >= 2, '4 last week — a graph from the app’s result');

await t.finish('Client-office Luna: meeting hello, then top losses offers graphs, choosing graphs draws the app’s figures.');
