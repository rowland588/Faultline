/* ACCEPTANCE — AI MODE, THE COLLEAGUE (8 November; docs/AI-MODE.md; src/colleague, screens/AiModeScreen, src/capabilities).
 * Rowland, 8 November: two modes over one application — the colleague works Faultline only through approved capabilities;
 * reads run at once, a write is a card and runs only on the person's tap. Driven in a real browser on the smoke seed, the
 * `assist` gateway answered by the script round by round:
 *
 *   1  the door: Ask Luna in the top bar on a line, opening #/ai?line= with the line as what it is on now
 *   2  a question answered: the gateway sent the conversation, the focus, today and the conversation's id; its call
 *      (list_problems) run at once — the step said under the turn with the records as chips — and the result sent back
 *      with the opaque `assistant` unchanged; the reply, a figure to check, the follow-ups (one tapped into the box)
 *   3  a write: Raise a problem as a card (what it will do, its inputs); Not now sends `declined` and writes nothing;
 *      asked again, Do it raises it — Done with its chip, which opens the problem in Manual Mode on the register
 *   4  a change of subject: set_focus parks the line's thread and makes the new one current; a note with how it is
 *      known; Back to this brings the line back; the Sources list what was read and changed; kept after a reload
 *   5  the switch: AI Mode off in the account menu hides the door and #/ai says it is off; on again
 *   6  the phone at 390: nothing off the side, the strip and its sheet, the box above the bar, presses 44 px
 *
 *   node scripts/acceptance/ai-mode.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const SHOTS = process.env.AI_SHOTS;   // a folder: the screenshots at 1440 and 390 are kept there
const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
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
const answered = async (n, ms = 10000) => {
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), n, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(400);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };

/* ---- 1 · the door ---- */
const lineName = await page.evaluate(async id => (await (await import('/src/db.ts')).getWorkspace(id))?.name, sd.wsId);
await t.go(`#/lines/${encodeURIComponent(sd.wsId)}`, 2500);
ok((await page.locator('.nv-top .ai-door').count()) === 1 && /Ask Luna/.test(await t.words('.nv-top .ai-door')), '1 Ask Luna is in the top bar');
await page.locator('.nv-top .ai-door').click(); await page.waitForTimeout(2000);
ok(page.url().includes(`#/ai?line=${encodeURIComponent(sd.wsId)}`), `1 the door opens AI Mode on the line (${page.url().split('#')[1]})`);
ok((await t.words('[data-ctx-current] .ai-ctx-t')) === lineName && (await t.words('[data-ai-title]')) === lineName, `1 a new conversation starts on ${lineName}`);
ok((await page.locator('.ai-empty .ai-sug').count()) === 3, '1 the empty conversation offers three examples');

/* ---- 2 · a question answered through a read ---- */
plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 'c1', name: 'list_problems', input: { lineId: sd.wsId } }], assistant: { v: 1, rounds: ['r1'] }, model: 'test' }),
  () => ({ ok: true, reply: 'These are the **open problems** on the line:\n- the wrapper film\n- the labeller', suggestions: ['Which is the oldest?', 'Raise one for the film'], unsure: ['45'], model: 'test' }),
];
await send('What is open on this line?');
await answered(1);
const a0 = asks[0], a1 = asks[1];
ok(a0?.task === 'colleague' && a0.turns?.at(-1)?.text === 'What is open on this line?' && /Current: .*\[thread/.test(a0.focus ?? '') && typeof a0.today === 'string' && !!a0.conversationId && !a0.pending,
  `2 asked once with the conversation, the focus ("${(a0?.focus ?? '').split('\n')[0]}"), today and the conversation's id`);
ok(a1?.conversationId === a0?.conversationId && JSON.stringify(a1?.pending?.assistant) === JSON.stringify({ v: 1, rounds: ['r1'] }) && a1.pending.results?.[0]?.id === 'c1' && a1.pending.results[0].ok === true,
  '2 the read run at once and sent back with the gateway’s assistant unchanged');
const step = await t.words('[data-step="list_problems"]');
ok(step.length > 10 && (await page.locator('[data-step="list_problems"] .ai-ref').count()) >= 1, `2 the step said under the turn with its records: "${step.slice(0, 90)}"`);
ok((await page.locator('.ai-turn.is-colleague .ai-words b').first().innerText()) === 'open problems' && (await page.locator('.ai-turn.is-colleague .ai-words li').count()) === 2, '2 the reply drawn with its bold and its list');
ok(/Check this: 45/.test(await t.words('[data-ai-unsure]')), '2 a figure not in the records said as Check this');
await page.locator('.ai-sug', { hasText: 'Raise one for the film' }).click();
ok((await page.locator('.ai-box').inputValue()) === 'Raise one for the film', '2 a follow-up tapped goes into the box');
if (SHOTS) await page.screenshot({ path: `${SHOTS}/ai-1440-read.png` });

/* ---- 3 · a write, as a card ---- */
const raise = { lineId: sd.wsId, words: 'Film breaks on the wrapper twice a shift', priority: 'high', how: 'reported' };
plan = [
  () => ({ ok: true, reply: 'I can raise that on the register.', calls: [{ id: 'w1', name: 'raise_problem', input: raise }], assistant: { v: 1, rounds: ['w1'] } }),
  b => ({ ok: true, reply: b.pending?.results?.[0]?.declined ? 'Left it — nothing raised.' : 'Raised.' }),
];
const before = asks.length;
await page.getByRole('button', { name: 'Send', exact: true }).click();
await page.waitForSelector('[data-card="raise_problem"][data-card-status="waiting"]', { timeout: 8000 }).catch(() => undefined);
const card = page.locator('[data-card="raise_problem"]').last();
ok((await card.count()) === 1 && /Raise a problem/i.test(await card.innerText()) && /Film breaks on the wrapper/.test(await card.innerText()) && /High/i.test(await card.innerText()), '3 the write is a card: its title, what it will raise, its priority');
ok((await page.evaluate(async () => (await (await import('/src/db.ts')).listAllSnags?.() ?? []).filter(s => /Film breaks on the wrapper/.test(s.problem ?? '')).length)) === 0, '3 nothing written while the card waits');
if (SHOTS) await page.screenshot({ path: `${SHOTS}/ai-1440-card.png` });
await card.getByRole('button', { name: 'Not now' }).click();
await answered(2);
ok(asks[before + 1]?.pending?.results?.[0]?.declined === true && /Left it/.test(await t.words('.ai-turn.is-colleague:last-of-type .ai-words')), '3 Not now sent back as declined, the colleague says so');
ok((await page.locator('[data-card="raise_problem"][data-card-status="declined"]').count()) === 1, '3 the card says not done');
plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 'w2', name: 'raise_problem', input: raise }], assistant: { v: 1 } }),
  b => ({ ok: true, reply: b.pending?.results?.[0]?.ok ? 'Raised — it is on the register.' : 'It could not be raised.' }),
];
await send('Yes, raise it');
await page.waitForSelector('[data-card="raise_problem"][data-card-status="waiting"]', { timeout: 8000 }).catch(() => undefined);
await page.locator('[data-card="raise_problem"][data-card-status="waiting"]').getByRole('button', { name: 'Do it' }).click();
await answered(3);
const done = page.locator('[data-card="raise_problem"][data-card-status="done"]');
ok((await done.count()) === 1 && /Raised — it is on the register/.test(await t.words('.ai-turn.is-colleague:last-of-type .ai-words')), '3 Do it runs it: the card done, the colleague told');
const probChip = done.locator('.ai-ref[data-ref^="problem:"]');
ok((await probChip.count()) === 1, '3 the card carries the problem as a chip');
ok((await page.locator('[data-ctx-sources] .ai-ref').count()) >= 2, `3 the Sources list what was read and changed (${await page.locator('[data-ctx-sources] .ai-ref').count()})`);
const convUrl = page.url();
await probChip.click(); await page.waitForTimeout(2500);
ok(/#\/snags\?open=/.test(page.url()) && /Film breaks on the wrapper twice a shift/.test(await page.locator('body').innerText()), '3 the chip opens the problem in Manual Mode, on the register');

/* ---- 4 · a change of subject ---- */
await page.goto(convUrl); await page.waitForTimeout(2500);
ok((await page.locator('.ai-turn').count()) >= 6, '4 the conversation kept after leaving and coming back');
plan = [
  () => ({ ok: true, reply: '', calls: [{ id: 'f1', name: 'set_focus', input: { title: 'Accumulation conveyor' } }, { id: 'n1', name: 'record_observation', input: { text: 'The conveyor backs up when the wrapper stops', how: 'observed' } }], assistant: { v: 1 } }),
  () => ({ ok: true, reply: 'Parked the line — we are on the accumulation conveyor now. How long does it take to fill?' }),
];
await send('Now the accumulation conveyor — it backs up when the wrapper stops');
await answered(4);
ok((await t.words('[data-ctx-current] .ai-ctx-t')) === 'Accumulation conveyor', '4 the new subject is what it is on now');
ok((await page.locator(`[data-ctx-parked] [data-parked="${lineName}"]`).count()) === 1, `4 ${lineName} is parked`);
ok(/Observed/.test(await t.words('[data-ctx-current] .ai-notes')) && /backs up/.test(await t.words('[data-ctx-current] .ai-notes')), '4 the note says how it is known: Observed');
ok(/Parked: .*\[thread/.test(asks.at(-1)?.focus ?? ''), '4 the next round’s focus names the parked thread');
await page.locator(`[data-ctx-parked] [data-parked="${lineName}"]`).getByRole('button', { name: 'Back to this' }).click(); await page.waitForTimeout(1200);
ok((await t.words('[data-ctx-current] .ai-ctx-t')) === lineName && (await page.locator('[data-ctx-parked] [data-parked="Accumulation conveyor"]').count()) === 1, '4 Back to this brings the line back and parks the conveyor');
await page.reload(); await page.waitForTimeout(2500);
ok((await t.words('[data-ctx-current] .ai-ctx-t')) === lineName && (await page.locator('[data-card-status="done"]').count()) === 1, '4 kept after a reload — the threads and the card');
ok((await page.locator('.ai-conv').count()) >= 1, '4 the conversation is listed on the left');
/* each earlier conversation's options (10 November — Rowland: "earlier conversations can't delete them, need options") */
{
  const row = page.locator('.ai-list .ai-conv-row').first();
  const before = await page.locator('.ai-list .ai-conv').count();
  await row.locator('.ai-conv-more').click(); await page.waitForTimeout(300);
  const opts = await row.locator('.ai-conv-menu [role="menuitem"]').allInnerTexts();
  ok(opts.join('|') === 'Open|Rename|Delete', `4 ⋯ on an earlier conversation offers Open, Rename and Delete: ${opts.join(' · ')}`);
  await row.locator('.ai-conv-menu').getByRole('menuitem', { name: 'Rename' }).click(); await page.waitForTimeout(300);
  await page.locator('.ai-list .ai-conv-name input').fill('Bagger jams walk');
  await page.locator('.ai-list .ai-conv-name').getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(900);
  ok((await page.locator('.ai-list .ai-conv b').first().innerText()) === 'Bagger jams walk', '4 Rename — the conversation called what the person typed');
  page.once('dialog', d => void d.accept());
  await page.locator('.ai-list .ai-conv-row').first().locator('.ai-conv-more').click(); await page.waitForTimeout(300);
  await page.locator('.ai-list [data-conv-delete]').first().click(); await page.waitForTimeout(1200);
  ok((await page.locator('.ai-list .ai-conv').count()) === before - 1, `4 Delete — asked, then gone from the list (${before} → ${await page.locator('.ai-list .ai-conv').count()})`);
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(1200);
  ok((await page.locator('.ai-list .ai-conv').count()) === before && (await page.locator('.ai-list .ai-conv b').allInnerTexts()).includes('Bagger jams walk'), '4 Undo — the conversation back, its name kept');
  await page.locator('.ai-list .ai-conv', { hasText: 'Bagger jams walk' }).click(); await page.waitForTimeout(1500);
  ok((await page.locator('.ai-turn').count()) >= 6, '4 opened again, every turn still there');
}
if (SHOTS) await page.screenshot({ path: `${SHOTS}/ai-1440.png` });

/* ---- 5 · the switch ---- */
await page.locator('.acct-btn').click(); await page.waitForTimeout(500);
await page.getByText('AI Mode — On', { exact: true }).click(); await page.waitForTimeout(600);
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
ok((await page.locator('.nv-top .ai-door').count()) === 0, '5 AI Mode off hides the door');
await t.go('#/ai', 1500);
ok((await page.locator('[data-ai-off]').count()) === 1 && /AI Mode is off/.test(await t.words('[data-ai-off]')), '5 #/ai says AI Mode is off, with the way back on');
await page.getByRole('button', { name: 'Turn AI Mode on' }).click(); await page.waitForTimeout(600);
ok((await page.locator('.nv-top .ai-door').count()) === 1 && (await page.locator('[data-ai]').count()) === 1, '5 on again — the door and the page are back');

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(convUrl); await page.waitForTimeout(2500);
const past = await page.evaluate(() => [...document.querySelectorAll('.ai *, .nv-top *')].filter(e => e instanceof HTMLElement && e.offsetParent !== null && e.getBoundingClientRect().right > window.innerWidth + 1).slice(0, 4).map(e => `${e.tagName.toLowerCase()}.${String(e.className).split(' ')[0]}`));
ok((await t.wide()) <= 0 && past.length === 0, `6 nothing off the side at 390 (${await t.wide()} px${past.length ? ` — ${past.join(', ')}` : ''})`);
ok(await page.locator('.ai-strip').isVisible() && /parked/.test(await t.words('.ai-strip')), `6 the strip says what it is on and what is parked: "${await t.words('.ai-strip')}"`);
const small = await page.evaluate(() => [...document.querySelectorAll('.ai-main button, .nv-top .ai-door')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.textContent?.trim().slice(0, 30) || b.getAttribute('aria-label')));
ok(small.length === 0, `6 every press 44 px or more${small.length ? ` — ${small.join(' · ')}` : ''}`);
/* a conversation takes the whole phone, as a chat does (9 November — Rowland: "much like WhatsApp … rather than this very small
   little window"): the menu's bar gives way, the box at the foot of the screen, the way out the top bar's Back */
const box = await page.locator('.ai-compose').boundingBox();
ok(!!box && box.y + box.height <= 844 + 1 && box.y + box.height >= 844 - 6 && !(await page.locator('.nv-bar').isVisible()), `6 the box sits at the foot of the phone, the menu’s bar giving way (${box ? Math.round(box.y + box.height) : '—'} of 844)`);
await page.locator('.ai-plus').click(); await page.waitForTimeout(300);
const menu = await page.locator('[data-attach-menu] [role=menuitem]').allInnerTexts();
ok(menu.length === 3 && /Take a photo/.test(menu[0]) && /Photos/.test(menu[1]) && /spreadsheet/.test(menu[2]) && /Excel/.test(menu[2]), `6 ＋ offers a photo taken, photos and a file or spreadsheet (Excel, CSV, a factory document): ${menu.map(x => x.split('\n')[0]).join(' · ')}`);
await page.keyboard.press('Escape'); await page.waitForTimeout(200);
ok((await page.locator('[data-attach-menu]').count()) === 0, '6 Escape puts the ＋ menu away');
if (SHOTS) await page.screenshot({ path: `${SHOTS}/ai-390.png` });
await page.locator('.ai-strip').click(); await page.waitForTimeout(600);
ok(await page.locator('.sheet [data-ctx-parked]').isVisible(), '6 the strip opens what it is on, parked and the sources in a sheet');
if (SHOTS) await page.screenshot({ path: `${SHOTS}/ai-390-context.png` });

await t.finish('AI Mode proved: the door, a read, a write confirmed and declined, the threads, the switch and the phone.');
