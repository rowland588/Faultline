/* ACCEPTANCE — conversation acts (24 November, docs/LUNA-ACTS.md): remind me tomorrow, make a report, send this report.
 * Done in the app — the gateway is mocked and must not be asked. Luna product only (#/ai).
 *   node scripts/acceptance/luna-conversation-acts.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
await page.reload();
await page.waitForTimeout(800);

const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  asks.push(r.request().postDataJSON());
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: false, why: 'conversation acts must not ask the gateway' }) });
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
ok(/nothing to put in a report yet/i.test(await page.locator('.ai-turn.is-colleague').last().innerText()), '2 honest when there is nothing to report');

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

await t.go('#/ai', 1500);
ok((await page.locator('[data-luna-reminder]').count()) === 1, '5 the reminder is still there after another look');

await page.setViewportSize({ width: 360, height: 740 });
await page.waitForTimeout(400);
ok(await page.locator('[data-luna-reminder]').count(), '6 phone — the reminder is in view');
const box = await page.locator('[data-luna-reminder]').boundingBox();
ok(box && box.x >= 0 && box.x + box.width <= 360 + 1, '6 phone — reminder not off the side');

await t.finish('Conversation acts: remind me tomorrow kept on Luna; make a report; send this report on a card. No gateway.');
