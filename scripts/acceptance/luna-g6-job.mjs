/* ACCEPTANCE — LUNA G6 PARKED JOB (24 November 2026, docs/LUNA-G6-SERVER.md G6 job slice).
 *
 * A job finished on the server while the app was shut: mocked row in luna_server_jobs; opening Luna shows the overnight note and
 * Read it writes her answer into the conversation. A job that ran out of time says how far she got. assist is PLAYED.
 *
 *   1  server job mocked — data-server-job with Luna carried on while you were away
 *   2  Read it — her answer in the conversation, the row cleared
 *   3  a stopped job — how far she got, Read it merges it
 *   4  the phone: inside the screen, 44 px
 *
 *   node scripts/acceptance/luna-g6-job.mjs */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
await page.route('**/functions/v1/assist', async r => {
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Played.' }) });
});

const GOAL = 'Find where Line 2 loses time overnight';
const REPLY = 'Done overnight. Jam took 15 of the 30 minutes on the Bagger — that is what the stops show.';
const FAR = 'I had mapped the stops. Line 2 jam is the main loss.';
const THREAD = 'thread-g6';

const seedJob = async (jobId, extra = {}) => {
  return page.evaluate(async ({ goal, reply, thread, jobId: jid, extra: x }) => {
    const db = await import('/src/db.ts');
    const { uid } = await import('/src/lib/ids.ts');
    const id = uid();
    await db.putStudy({
      id,
      tool: 'talk',
      at: Date.now(),
      updatedAt: Date.now(),
      facts: {
        colleague: true,
        turns: [{ id: uid(), at: Date.now(), who: 'You', kind: 'said', text: goal }],
        threads: [{
          id: thread, title: goal.slice(0, 40), status: 'current', scope: {}, notes: [], refs: [], at: Date.now(),
          job: { goal, startedAt: Date.now(), steps: [{ what: 'Find the stops', status: 'done', note: 'Jam 15 min' }] },
        }],
      },
    });
    window.__faultlineServerJobs = [{
      id: jid,
      owner_id: 'mock',
      conversation_id: id,
      thread_id: thread,
      client: '',
      status: x.status ?? 'done',
      snapshot: { turns: [], focus: '', today: 'Mon', conversationId: id, threadId: thread, client: '', reply: x.reply ?? reply, job: { goal, startedAt: Date.now(), steps: [{ what: 'Find the stops', status: 'done' }] } },
      legs: 1,
      max_legs: 24,
      deadline_at: new Date(Date.now() + 60_000).toISOString(),
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
      last_error: x.last_error ?? null,
    }];
    return id;
  }, { goal: GOAL, reply: REPLY, thread: THREAD, jobId, extra });
};

const convId = await seedJob('mock-job-1');
await t.go(`#/ai?c=${convId}`, 2500);
await page.waitForSelector('[data-server-job]', { timeout: 15000 });
ok((await page.locator('[data-server-job]').innerText()).includes('carried on while you were away'), 'overnight note shown');
await page.locator('[data-server-job-read]').click();
await page.waitForFunction(() => !document.querySelector('[data-server-job]'), null, { timeout: 15000 });
ok((await page.locator('[data-server-job]').count()) === 0, 'Read it clears the note');
await page.waitForFunction(() => (document.querySelector('.ai-turn.is-colleague .ai-words')?.textContent ?? '').includes('Jam took 15'), null, { timeout: 15000 });
ok((await page.locator('.ai-turn.is-colleague .ai-words').last().innerText()).includes('Jam took 15'), 'her answer is in the conversation');

const farId = await seedJob('mock-job-far', { status: 'stopped', reply: FAR, last_error: 'Time for this job ran out.' });
await t.go(`#/ai?c=${farId}`, 2500);
await page.waitForSelector('[data-server-job-status="stopped"]', { timeout: 15000 });
ok((await page.locator('[data-server-job]').innerText()).includes('How far she got'), 'how far she got is said');
ok((await page.locator('[data-server-job]').innerText()).includes('mapped the stops'), 'her partial answer is there');
await page.locator('[data-server-job-read]').click();
await page.waitForFunction(() => !document.querySelector('[data-server-job]'), null, { timeout: 15000 });
ok((await page.locator('.ai-turn.is-colleague .ai-words').last().innerText()).includes('mapped the stops'), 'how far she got is in the conversation');

await page.setViewportSize({ width: 390, height: 844 });
const phoneConv = await seedJob('mock-job-2');
await t.go(`#/ai?c=${phoneConv}`, 800);
await page.waitForSelector('[data-server-job]', { timeout: 15000 });
const box = await page.locator('[data-server-job-read]').boundingBox();
ok(box && box.height >= 44, 'Read it fits a thumb on the phone');
const aside = await page.locator('[data-server-job]').boundingBox();
const view = page.viewportSize();
ok(aside && view && aside.x >= 0 && aside.x + aside.width <= view.width, 'nothing off the side on the phone');

await t.finish('G6 parked job accepted: overnight note, Read it merges her answer, how far she got, phone fit.');
