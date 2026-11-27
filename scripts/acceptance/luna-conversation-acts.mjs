/* ACCEPTANCE — conversation acts (24 November, docs/LUNA-ACTS.md): remind me tomorrow, make a report, send this report.
 * Done in the app — the gateway is mocked and must not be asked. Luna product only (#/ai).
 *   node scripts/acceptance/luna-conversation-acts.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { openLunaConversations } from '../lib/lunaContext.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
await page.reload();
await page.waitForTimeout(800);

const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/luna-mail', r => {
  if (r.request().postDataJSON()?.action !== 'status') throw new Error('No real email may be sent during conversation acts.');
  return r.fulfill({ json: { allowed: true, ready: false } });
});
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  const answer = next ? next(body) : { ok: false, why: 'conversation acts must not ask the gateway' };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});

const send = async words => {
  await page.locator('.ai-box').fill(words);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
};
const answered = async (n, ms = 12000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(300);
};

await t.go('#/ai', 3000);
await page.locator('.ai-box').waitFor({ state: 'visible', timeout: 20000 });

await send('Remind me tomorrow to look at the wrapper');
await answered(1);
ok((await page.locator('.ai-turn.is-colleague').count()) >= 1, '1 remind — a reply');
ok(asks.length === 0, '1 remind — no gateway');
ok(await page.locator('[data-ai-code]').count(), '1 remind — done in the app');
ok(/I'll remind you tomorrow/.test(await page.locator('.ai-turn.is-colleague').last().innerText()), '1 remind — she says tomorrow');
ok((await page.locator('[data-luna-reminder]').count()) === 1, '1 remind — kept on the page');
ok(/look at the wrapper/.test(await page.locator('[data-luna-reminder]').innerText()), '1 remind — the words they said');

await send('make a report');
await answered(2);
ok(asks.length === 0, '2 no chart yet — no gateway');
ok(/what should the report cover/i.test(await page.locator('.ai-turn.is-colleague').last().innerText()), '2 asks what to write when the conversation has no data');

await page.evaluate(async () => {
  const d = await import('/src/db.ts');
  const s = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  const result = {
    id: 'Rseed', title: 'Downtime by category', at: Date.now(),
    source: { kind: 'dataset', id: 'stops:w', name: 'Line 2 — stops' }, query: {},
    result: {
      sheet: 'stops', rowsScanned: 4, rowsMatched: 4, groupsTotal: 2, groupBy: ['category'],
      groups: [{ key: ['Jam'], values: [15], rows: 2, refs: [] }, { key: ['Film'], values: [12], rows: 1, refs: [] }],
      measures: ['minutes'], totals: [27], notes: [], skipped: [],
    },
  };
  const chart = { id: 'Cseed', at: Date.now(), versions: [{ resultId: 'Rseed', type: 'column', measure: 0, title: 'Downtime by category' }] };
  await d.patchStudy(s.id, cur => ({ facts: { ...cur.facts, results: [result], charts: [chart] } }));
});

await send('put that in a report');
await answered(3);
ok(asks.length === 0, '3 make a report — no gateway');
ok((await page.locator('[data-report]').count()) + (await page.locator('[data-step="build_report"]').count()) >= 1, '3 a report was made');
ok(/report/i.test(await page.locator('.ai-turn.is-colleague').last().innerText()), '3 she says the report');

await send('send this report to jane@acme.test');
await answered(4);
ok(asks.length === 0, '4 send — no gateway');
const card = page.locator('[data-card="send_email"]');
await card.waitFor({ state: 'visible', timeout: 8000 });
ok((await card.getAttribute('data-card-status')) === 'waiting', '4 a confirm card — nothing sent yet');
await card.getByRole('button', { name: 'Not now' }).click();
await page.waitForTimeout(400);
ok((await page.locator('[data-card="send_email"][data-card-status="declined"]').count()) === 1, '4 Not now — nothing sent');
ok(/not now|nothing was sent/i.test(await page.locator('.ai-turn.is-colleague').last().innerText()), '4 she says nothing was sent');

await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const { setActiveClient } = await import('/src/lib/activeClient.ts');
  for (const w of await liveProductionLines(await db.listWorkspaces())) await db.patchWorkspaceRecord(w.id, { clientName: 'Branston' });
  setActiveClient('Branston');
});
const beforeSched = asks.length;
plan = [
  () => ({ ok: true, reply: "I'll keep that going for Jane.", calls: [{ id: 's1', name: 'send_email', input: { to: 'jane@acme.test', repeat: 'daily', time: '07:00', chartId: 'Cseed' } }], assistant: { v: 1, rounds: ['s1'] } }),
  b => ({ ok: true, reply: b.pending?.results?.[0]?.declined ? 'You said not now — no schedule was added.' : 'Scheduled.' }),
];
await send('Could you email jane@acme.test that downtime chart every morning?');
await page.waitForSelector('[data-card="send_email"][data-card-status="waiting"]', { timeout: 12000 }).catch(() => undefined);
const sched = page.locator('[data-card="send_email"]').last();
ok(asks.length > beforeSched, '5 schedule — Luna was asked, not a keyword router');
ok((await sched.getAttribute('data-card-status')) === 'waiting', '5 a confirm card for the schedule');
ok(/every day at 07:00/i.test(await sched.innerText()), '5 the card names the rhythm in London');
ok(/not rebuilt from a later workbook|Finish Resend setup/i.test(await sched.innerText()), '5 honest: frozen report or Resend still to set up — not Outlook');
await sched.getByRole('button', { name: 'Not now' }).click();
await answered(5, 15000);
ok(/no schedule was added/i.test(await page.locator('.ai-turn.is-colleague').last().innerText()), '5 Not now — no schedule');

await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const t = Date.now();
  const names = [...new Set((await db.listWorkspaces()).map(l => l.clientName).filter(Boolean))];
  const stored = (() => { try { return localStorage.getItem('faultline.client') || ''; } catch { return ''; } })();
  const client = stored || names[0] || 'Acme';
  await db.putStandingJob({
    id: 'sched-home', client, kind: 'weekly_digest', schedule: 'daily', weekday: 1, hour: 7, minute: 0, enabled: true,
    name: 'Downtime by category',
    scope: { email: { to: 'jane@acme.test', subject: 'Downtime by category', message: 'Jam: 15' }, conversationId: 'conv' },
    createdAt: t, updatedAt: t,
  });
});
await page.waitForTimeout(400);
await openLunaConversations(page);
const schedules = page.locator('[data-luna-schedules]');
const details = schedules.locator('details');
if (!(await details.evaluate(el => el.open))) await details.locator('summary').click();
await schedules.locator('[data-schedule-job="sched-home"]').waitFor({ timeout: 8000 });
ok(/Downtime by category/.test(await schedules.locator('[data-schedule-what]').innerText()), '5 Schedules names what');
ok(/Every day at 07:00/.test(await schedules.locator('[data-schedule-when]').innerText()), '5 Schedules names when');
ok(/jane@acme.test/.test(await schedules.locator('[data-schedule-who]').innerText()), '5 Schedules names who');
ok(/Last run/.test(await schedules.locator('[data-schedule-last]').innerText()), '5 Schedules names last run');
ok(/Next run/.test(await schedules.locator('[data-schedule-next]').innerText()), '5 Schedules names next run');

await t.go('#/ai', 1500);
ok((await page.locator('[data-luna-reminder]').count()) === 1, '5 the reminder is still there after another look');

await page.setViewportSize({ width: 360, height: 740 });
await page.waitForTimeout(400);
ok(await page.locator('[data-luna-reminder]').count(), '6 phone — the reminder is in view');
const box = await page.locator('[data-luna-reminder]').boundingBox();
ok(box && box.x >= 0 && box.x + box.width <= 360 + 1, '6 phone — reminder not off the side');

await t.finish('Conversation acts: remind me tomorrow kept on Luna; make a report; send this report on a card; a report on a rhythm asked in ordinary language is send_email then a schedule in the drawer.');
