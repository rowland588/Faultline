/* ACCEPTANCE — TODAY (10 November, docs/LUNA-WORKSPACE.md W7, docs/LUNA-FIRST.md A — "greets you and shows what moved since you were
 * last in — at most three things that want you … worked out by Faultline's code, never by the model, each a door — then Luna's box …
 * the factory in a few lines … Carry on where you were and the projects under way by method. With Luna off … the box hidden"). The
 * gateway answered by the script:
 *
 *   1  Today first in the menu, lit on #/today; the greeting and the day
 *   2  the briefing — one to three rows, each equal to lib/today briefing() over the Actions page's own rows and the register, read in
 *      the page with the same "since"; a row opening its door
 *   3  a problem raised since — the briefing naming it as New with no reload
 *   4  the lines, each with its state in words (lib/today lineState over its open problems), opening the line; the projects by method
 *   5  Luna's box — a question asked opens her beside Today and sends it into the conversation; a suggestion the same
 *   6  AI Mode off — no box, the rest of the page whole
 *   7  a phone — the rows a thumb's height, nothing off the side
 *
 *   node scripts/acceptance/today.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
await page.route('**/functions/v1/assist', async r => {
  asks.push(r.request().postDataJSON());
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ ok: true, reply: 'Two actions are late.', model: 'test' }) });
});
const SINCE = Date.now() - 3 * 86_400_000;
await page.evaluate(s => { localStorage.setItem('faultline.today.seen', String(s)); localStorage.setItem('faultline.lunaPanel', 'closed'); }, SINCE);

/* ---- 1 · first in the menu ---- */
await t.go('#/today', 3000);
const first = await page.locator('.nv-rail .nv-ri').first();
ok(/Today/.test(await first.innerText()) && /\bis-on\b/.test((await first.getAttribute('class')) ?? '') , `1 Today first in the menu and lit (${(await first.innerText()).trim()})`);
ok(/Good (morning|afternoon|evening)/.test(await t.words('[data-today] .pace-title')), '1 the greeting');

/* ---- 2 · the briefing, as the module says it ---- */
const want = async () => page.evaluate(async since => {
  const { allProjects } = await import('/src/db/projects.ts');
  const { loadEveryAction, loadActionParts } = await import('/src/lib/useProjectActions.ts');
  const { briefing } = await import('/src/lib/today.ts');
  const ps = (await allProjects()).filter(p => !p.archivedAt && !p.deletedAt);
  const [every, parts] = await Promise.all([loadEveryAction(ps), loadActionParts(ps)]);
  return briefing(every.rows, parts.register, since);
}, SINCE);
const shown = async () => page.$$eval('[data-brief]', els => els.map(e => ({ key: e.getAttribute('data-brief'), says: e.querySelector('.today-brief-says')?.textContent ?? '', to: e.getAttribute('href') })));
await page.waitForSelector('[data-brief]', { timeout: 8000 }).catch(() => undefined);
const w2 = await want(), s2 = await shown();
ok(s2.length >= 1 && s2.length <= 3 && s2.length === w2.length && s2.every((x, i) => x.key === w2[i].key && x.says === w2[i].says && x.to === `#${w2[i].to}`), `2 the briefing is the module's: ${s2.map(x => x.key).join(', ')} — "${s2[0]?.says.slice(0, 90)}"`);
const to2 = s2[0]?.to ?? '';
await page.locator('[data-brief]').first().click(); await page.waitForTimeout(1500);
ok(decodeURIComponent(await page.evaluate(() => location.hash)).startsWith(decodeURIComponent(to2).split('?')[0]), `2 a row opens its door (${to2})`);

/* ---- 3 · a problem raised since ---- */
await t.go('#/today', 2500);
await page.evaluate(async ws => {
  const db = await import('/src/db.ts');
  const now = Date.now();
  await db.addSnag({ id: `today-${now}`, workspaceId: ws, assetId: '', xPct: 0, yPct: 0, problem: 'Bags not presenting at the bagger', priority: 'high', status: 'open', raisedAt: now, linkedObsIds: [], updatedAt: now });
}, sd.wsId).catch(e => console.log('addSnag', e.message));
await page.waitForTimeout(1800);
const s3 = await shown();
const n3 = s3.find(x => x.key === 'new');
ok(!!n3 && /Bags not presenting at the bagger/.test(n3.says), `3 the new problem named with no reload: "${n3?.says ?? s3.map(x => x.key).join(',')}"`);

/* ---- 4 · the lines and the projects ---- */
const lines = await page.$$eval('[data-today-line]', els => els.map(e => ({ id: e.getAttribute('data-today-line'), tag: e.querySelector('.part-tag')?.textContent ?? '' })));
const lw = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const { liveProductionLines } = await import('/src/lib/lines.ts'); const { lineState } = await import('/src/lib/today.ts');
  const ls = await liveProductionLines(await db.listWorkspaces()); const sn = (await db.listAllSnags()).filter(s => !s.deletedAt && !s.archivedAt && s.status !== 'closed');
  return Object.fromEntries(ls.map(l => { const m = sn.filter(s => s.workspaceId === l.id); return [l.id, lineState(m.length, m.filter(s => s.priority === 'critical').length).word]; }));
});
ok(lines.length >= 1 && lines.every(l => lw[l.id] === l.tag), `4 each line in words as lineState says (${lines.map(l => l.tag).join(' · ')})`);
ok((await page.locator('[data-today-projects] .today-method-h').count()) >= 1, `4 the projects by method (${(await t.words('[data-today-projects] .today-method-h')).slice(0, 80)})`);
await page.locator(`[data-today-line="${sd.wsId}"]`).click(); await page.waitForTimeout(1500);
ok((await page.evaluate(() => location.hash)).includes(encodeURIComponent(sd.wsId)), '4 a line opens its page');

/* ---- 5 · Luna's box ---- */
await t.go('#/today', 2500);
await page.locator('[data-today-ask]').fill('What is late today?');
await page.locator('[data-today-send]').click(); await page.waitForTimeout(3000);
ok((await page.evaluate(() => location.hash)) === '#/today' && (await page.locator('[data-luna-panel="open"] [data-ai]').count()) === 1, '5 Luna opens beside Today, the page kept');
ok(asks.some(b => (b.turns ?? []).some(x => /What is late today/.test(x.text ?? ''))), '5 the question sent into the conversation');
ok(/Two actions are late/.test(await t.words('[data-luna-panel] .ai-turn.is-colleague')), '5 her answer beside the page');
const n5 = asks.length;
await page.locator('[data-today-sugg]').first().click(); await page.waitForTimeout(2500);
ok(asks.length > n5 && asks.at(-1).turns.some(x => /What should I do first today/.test(x.text ?? '')), '5 a suggestion asked the same way');

/* ---- 6 · AI Mode off ---- */
await page.evaluate(async () => (await import('/src/colleague/aiMode.ts')).setAiMode(false)); await page.waitForTimeout(800);
ok((await page.locator('[data-today-luna]').count()) === 0 && (await page.locator('[data-brief]').count()) >= 1 && (await page.locator('[data-today-lines]').count()) === 1, '6 AI Mode off: no box, the briefing and the lines whole');
await page.evaluate(async () => (await import('/src/colleague/aiMode.ts')).setAiMode(true));

/* ---- 7 · a phone ---- */
await page.evaluate(() => localStorage.setItem('faultline.lunaPanel', 'closed'));
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/today', 2500);
const small = await page.$$eval('[data-brief], [data-today-line], [data-today-project], [data-today-sugg], [data-today-send]', els => els.filter(e => e.getBoundingClientRect().height < 44).length);
ok(small === 0 && (await t.wide()) <= 0, `7 a phone: every row and press 44 px, nothing off the side (${small} small)`);

await t.finish('Today — what wants you, worked out by the app; Luna one box away; the lines and the projects.');
