/* ACCEPTANCE — F1 fast conversational path (23 November, docs/LUNA-ROOM.md §2): a hello answered in one gateway
 * round with no capability steps; a real question still goes through capabilities.
 *   node scripts/acceptance/luna-fast-chat.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
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

const answered = async (n, ms = 12000) => {
  for (const until = Date.now() + ms; plan.length && Date.now() < until;) await page.waitForTimeout(100);
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(300);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };

await t.go(`#/ai?line=${encodeURIComponent(sd.wsId)}`, 3000);
await page.locator('.ai-box').waitFor({ state: 'visible', timeout: 20000 });

plan = [
  () => ({ ok: true, reply: 'Hello — good to hear from you. How can I help today?', fastChat: true, model: 'test' }),
];
const before = asks.length;
await send('Hello Luna');
await answered(1);
ok(asks.length === before + 1 && asks.at(-1)?.turns?.at(-1)?.text === 'Hello Luna' && !asks.at(-1)?.pending, '1 hello — one ask, no pending');
ok(!(await page.locator('[data-ai-steps]').count()), '1 hello — no capability steps under the answer');

plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 'c1', name: 'list_problems', input: { lineId: sd.wsId } }], assistant: { v: 1, rounds: ['r1'] }, model: 'test' }),
  () => ({ ok: true, reply: 'Two open problems on the line.', model: 'test' }),
];
await send('What is open on this line?');
await answered(2);
ok(asks.filter(a => a.turns?.at(-1)?.text === 'What is open on this line?').length === 2, '2 a work question — gateway round with a read');
ok((await page.locator('[data-step="list_problems"]').count()) >= 1, '2 work question — capability step shown');

await t.finish('F1 fast chat proved: hello in one round without steps; a work question still runs a read.');