/* ACCEPTANCE — THE LUNAR ENVIRONMENT (11 November; docs/LUNAR-ENVIRONMENT.md; colleague/environment, colleague/WorkContext, ui/Everything,
 * ui/ContextBar env, ui/Frame). Rowland: "When I open LUNAR … I should feel as though I've entered an intelligent operational environment
 * where LUNA is ready to work with me. Everything else is there, incredibly powerful, but it sits behind her and comes into view when we
 * need it." Driven on the smoke seed, at a desk and on a phone:
 *
 *   1  #/ is Luna: her conversation on the page, the bar LUNAR's with Everything — no rail, no tabs, no phone bar, no Go to
 *   2  the two names: the mark says LUNAR, the page says Luna
 *   3  Everything: the places of the app, Ask Luna and Raise a problem; a line found by typing; Escape closes it
 *   4  a page opened from Everything comes into view as THE WORK beside her — the real page in the work pane, the address still hers
 *   5  a conversation on a line, begun: the line comes into view beside it — its state as lib/today lineState says it, its open problem,
 *      its records in use; a record opening as the real page in the work pane
 *   6  the Story and the consultant's home kept at #/story and #/clients; every other page keeps its frame with Luna first on the rail
 *   7  AI Mode off: #/ is the app as it was — the Story — and no environment
 *   8  the phone: the same, every press 44 px, nothing off the side; Everything full screen and fitting
 *
 *   node scripts/acceptance/lunar-environment.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const errs = []; page.on('pageerror', e => errs.push(e.message));

/* ---- 1 · #/ is Luna */
await t.go('#/', 2600);
ok((await page.locator('.nv.is-env').count()) === 1 && (await page.locator('[data-ai-slot="page"]').count()) === 1, '1 #/ opens the environment: Luna’s conversation is the page');
ok((await page.locator('.nv-rail').count()) === 0 && (await page.locator('.nv-tabs').count()) === 0 && (await page.locator('.nv-bar').count()) === 0 && (await page.locator('.nv-goto').count()) === 0,
  '1 no rail, no tabs, no phone bar, no Go to — the application sits behind her');
ok((await page.locator('[data-everything-open]').count()) === 1, '1 the bar offers Everything');
/* ---- 2 · the two names */
ok((await t.words('.nv-top .nv-name')) === 'LUNAR', `2 the mark says LUNAR ("${await t.words('.nv-top .nv-name')}")`);
ok(/I’m Luna/.test(await t.words('.ai-empty-g')) && /LUNAR’s AI colleague/.test(await t.words('.ai-empty .sub')), '2 the page says Luna, LUNAR’s AI colleague');

/* ---- 3 · Everything */
await page.locator('[data-everything-open]').click(); await page.waitForTimeout(600);
const places = await page.locator('[data-everything-place]').count();
ok(places >= 10 && (await page.locator('[data-everything-luna]').count()) === 1 && (await page.locator('[data-everything-problem]').count()) === 1, `3 Everything: ${places} places, Ask Luna, Raise a problem`);
const lineName = await page.evaluate(async () => (await (await import('/src/db.ts')).listWorkspaces()).find(l => /smoke/.test(l.name))?.name ?? '');
await page.locator('[data-everything-q]').fill('smoke'); await page.waitForTimeout(300);
ok(await page.locator('[data-everything-line]').filter({ hasText: lineName }).count() === 1, `3 typing finds the line (${lineName})`);
await page.keyboard.press('Escape'); await page.waitForTimeout(300);
ok((await page.locator('[data-everything]').count()) === 0, '3 Escape closes it');

/* ---- 4 · a page from Everything, as the work beside her */
await page.locator('[data-everything-open]').click(); await page.waitForTimeout(500);
await page.locator('[data-everything-place="problems"]').click(); await page.waitForTimeout(2500);
const workHref = await page.locator('[data-work]').getAttribute('data-work-href').catch(() => null);
ok(workHref === '/snags' && (await page.locator('[data-work-frame]').isVisible()) && /^#\/(ai|$)/.test(new URL(page.url()).hash || '#/'),
  `4 Problems comes into view as the work beside Luna — the real page in the work pane, the address still hers (${workHref}, ${new URL(page.url()).hash || '#/'})`);
const inFrame = await page.frameLocator('[data-work-frame]').locator('h1, .pace-title').first().innerText().catch(() => '');
ok(/Problem/i.test(inFrame), `4 the pane holds the app’s own page ("${inFrame.slice(0, 40)}")`);

/* ---- 5 · a conversation on a line brings the line into view */
const sd = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const ln = (await db.listWorkspaces()).find(l => /smoke/.test(l.name));
  const c = await import('/src/colleague/conversation.ts'); const now = Date.now(); const id = 'env-accept';
  const st = c.newConversation({ id, at: now, name: 'The line', thread: { id: 'th1', title: `Lost time on ${ln.name}`, scope: { lineId: ln.id } } });
  st.facts.turns = [{ id: 't1', at: now - 60000, who: 'You', kind: 'typed', text: `Luna, let’s investigate ${ln.name}.` }, { id: 't2', at: now - 50000, who: 'Faultline', kind: 'reply', text: 'The line is beside us.' }];
  await db.putStudy(st);
  const snags = (await db.listAllSnags()).filter(s => s.workspaceId === ln.id && s.status !== 'closed' && !s.archivedAt);
  const today = await import('/src/lib/today.ts');
  return { id, ln: ln.id, name: ln.name, open: snags.length, word: today.lineState(snags.length, snags.filter(s => s.priority === 'critical').length).word, first: snags[0]?.problem ?? '' };
});
await t.go(`#/ai?c=${sd.id}`, 2600);
ok((await page.locator('[data-work-context="line"]').isVisible()) && (await t.words('[data-work-context] .wctx-t')).startsWith(sd.name), `5 the conversation on ${sd.name}, begun: the line comes into view beside it`);
ok((await t.words('[data-wctx-state]')) === sd.word, `5 its state as lib/today lineState says it: "${await t.words('[data-wctx-state]')}" = "${sd.word}"`);
ok(!sd.first || (await t.words('[data-work-context] .wctx-list')).includes(sd.first), '5 its open problem named');
const recs = await page.locator('[data-wctx-record]').count();
ok(recs > 0, `5 the records in use on it (${recs})`);
await page.locator('[data-wctx-record]').first().click(); await page.waitForTimeout(2500);
ok((await page.locator('[data-work-frame]').isVisible()) && (await page.locator('.ai-ctx').isVisible()) === false, '5 a record opens as the real page in the work pane, taking the context’s place');

/* ---- 6 · the application behind her, kept */
await t.go('#/story', 2600);
ok((await page.locator('.nv.is-env').count()) === 0 && (await page.locator('.nv-rail').count()) === 1, '6 #/story is the Story in the app’s frame');
const first = await page.locator('.nv-rail .nv-ri').first().innerText().catch(() => '');
ok(/Luna/.test(first), `6 the rail’s first line is Luna ("${first.trim()}")`);
await t.go('#/clients', 2000);
ok((await page.locator('.nv.is-env').count()) === 0, '6 #/clients is the consultant’s home (the Story with one customer)');

/* ---- 7 · AI Mode off */
await page.evaluate(() => { localStorage.setItem('faultline.aiMode', 'off'); window.dispatchEvent(new Event('faultline-ai-mode')); });
await t.go('#/', 2600);
ok((await page.locator('.nv.is-env').count()) === 0 && (await page.locator('[data-ai-slot="page"]').count()) === 0 && (await page.locator('.nv-rail').count()) === 1, '7 AI Mode off: #/ is the app as it was, with its menu');
await page.evaluate(() => { localStorage.setItem('faultline.aiMode', 'on'); window.dispatchEvent(new Event('faultline-ai-mode')); });

/* ---- 8 · the phone */
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/', 2600);
const small = await page.$$eval('.nv-top button, .ai-compose button', els => els.filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height < 40; }).length);
ok((await t.wide()) <= 0 && small === 0, `8 a phone: nothing off the side, the bar’s presses a thumb’s size (${small} small)`);
await page.locator('[data-everything-open]').click(); await page.waitForTimeout(600);
const over = await page.$$eval('.evy *', els => els.filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length);
ok(over === 0, `8 Everything fits the phone (${over} past the edge)`);
await page.keyboard.press('Escape');
ok(errs.length === 0, `no page errors (${errs.slice(0, 2).join(' | ')})`);

await t.finish('The LUNAR environment — Luna at the centre, the application behind her, Everything one tap away.');
