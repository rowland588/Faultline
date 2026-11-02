/* FC-148 — CHOOSING WHAT TO VERIFY, AND THE WHY TREE (knowledge/specs/FC-148-why-tree.md; Rowland, 1 November: "I'm going to
 * take some of these, not all of them, and start a 5-why" and "the whys could branch off, which then lead to multiple root
 * causes"). On a 6M problem made for it (src/dev/seed.ts seedWhyTreeProblem: seven causes, a poor-training why tree, a
 * ruled-out cause, a legacy chain):
 *   1  What to check: the sentence equals lib/causeCheck's and the hand-worked "3 of 7 … 2 confirmed, 1 ruled out, 1 checking
 *      (due …)"; the cards in the order the ratings give (suspected rated first, then confirmed, then ruled out)
 *   2  a rating and a tick with a check written, saved: kept after a reload, the order moving, the check made an ACTION on the
 *      board (who, the day) — on the project's Actions — pointing at no cause
 *   3  the gate: a suspected cause's sheet says "Check it first" and offers no Ask why; confirmed from its check, it opens
 *   4  the why tree as the module says it (poor training: 3 branches, 1 root shared by all three), the Root and "Same root
 *      as" tags, a new branch asked, answered, marked a root; the cause keeps its own root flag; a fix on the root counts as the cause's
 *   5  a legacy chain unchanged (one chain, its sentence), and a cause drilled before it was checked says so and is not locked
 *   6  the 6M report: the checked-causes table and the tree on the page and in the downloaded PDF
 *   7  a client reads the tree and the checks and changes nothing
 *   8  the phone: nothing off the side, controls 44 px
 *   node scripts/acceptance/why-tree.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'why-tree-'));
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const san = s => s.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/’/g, "'").replace(/\s+/g, ' ');

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
let failed = 0;
const ok = (c, m, d) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && d ? ` — ${String(d).slice(0, 400)}` : ''}`); if (!c) failed++; };
const go = async h => {
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 5000 }).catch(() => {});
  await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200);
};
const words = async (sel, within = page) => ((await within.locator(sel).count()) ? (await within.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');
const norm = s => s.replace(/\s+/g, ' ').trim();

await go('#/room');
const S = await page.evaluate(async () => {
  const seed = await import('/src/dev/seed.ts');
  const sd = await seed.seedForSmokeTest();
  const db = await import('/src/db.ts');
  const lines = await db.loadPaceLines(sd.pacedProjectId);
  const wsId = lines.find(l => l.id === sd.pacedLineId)?.workspaceId ?? lines[0]?.workspaceId;
  const made = await seed.seedWhyTreeProblem({ projectId: sd.pacedProjectId, lineId: sd.pacedLineId, workspaceId: wsId });
  return { projectId: sd.pacedProjectId, lineId: sd.pacedLineId, ...made };
});
const P = `#/project/${S.projectId}`;
const READ = `${P}/fishbone?problem=${S.problemId}&view=read`;
const causeOf = id => page.evaluate(async ([pid, cid]) => { const c = (await (await import('/src/db.ts')).listProjectCases(pid)).find(x => x.title === 'Film breaks on the Bagger'); return c?.causes?.find(x => x.id === cid); }, [S.projectId, id]);
const cardOf = text => page.locator('.wc-card', { has: page.locator('.wc-text', { hasText: text }) });

/* ---- 1 · What to check ---- */
await go(READ);
await page.locator('.wc').first().waitFor({ timeout: 15000 });
{
  const lit = await page.evaluate(async ([pid]) => {
    const db = await import('/src/db.ts'); const m = await import('/src/lib/causeCheck.ts');
    const c = (await db.listProjectCases(pid)).find(x => x.title === 'Film breaks on the Bagger');
    const today = new Date().toISOString().slice(0, 10);
    return { says: m.stepSays(c.causes, today), order: m.orderForCheck(c.causes).map(x => x.id) };
  }, [S.projectId]);
  const says = await words('.wc-says');
  ok(says === lit.says && /^3 of 7 causes ticked to check — 2 confirmed, 1 ruled out, 1 checking \(due /.test(says), `1 the sentence is the module's and the hand-worked one: "${says}"`);
  const order = await page.locator('.wc-card .wc-text').allInnerTexts();
  ok(JSON.stringify(order.map(norm)) === JSON.stringify(['Splices vary between shifts', 'Reel cores out of round', 'Photo-eye misses the film join', 'Hot mornings soften the film', 'Poor training on the changeover', 'Film is stored by the door', 'Sealing jaw runs cold at start-up']) && lit.order.length === 7,
    '1 the cards: suspected rated first (likely, then possible), then unrated in the order added, then confirmed, then ruled out', order.join(' | '));
  ok(/Checking \(by /.test(await words('.wc-state', cardOf('Splices vary'))) && (await words('.wc-state', cardOf('Reel cores'))) === 'Possible · Some' && (await words('.wc-state', cardOf('Photo-eye'))) === 'Not rated'
    && /^Confirmed \(seen\)$/.test(await words('.wc-state', cardOf('Poor training'))) && (await words('.wc-state', cardOf('Sealing jaw'))) === 'Ruled out', '1 each cause says where it stands in words');
  ok(/Within 2 °C of set point/.test(norm(await cardOf('Sealing jaw').innerText())), '1 the ruled-out cause keeps what the check found');
}

/* ---- 2 · rate, tick, write the check, save — and the check is an action on the board ---- */
{
  const card = cardOf('Hot mornings');
  await card.getByRole('radio', { name: 'Likely', exact: true }).click();
  await card.getByRole('radio', { name: 'Some', exact: true }).click();
  await card.getByLabel(/^Worth checking/).or(card.locator('.cf-tick input')).first().check();
  const day = new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);
  await card.getByLabel(/^What would show it/).fill('Log the packing-room temperature for a week');
  await card.getByLabel(/^Who checks it/).fill('Lee');
  await card.getByLabel(/^Check it by/).fill(day);
  await card.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(900);
  const c = await causeOf('wt-heat');
  ok(c?.likely === 'likely' && c?.explains === 'some' && c?.tick === true && c?.check?.who === 'Lee' && c?.check?.by === day && !!c?.checkAction, '2 the rating, the tick and the check are kept on the cause', JSON.stringify(c));
  const act = await page.evaluate(async ([pid, id]) => (await (await import('/src/db.ts')).listPaceTodos(pid)).find(t => t.id === id), [S.projectId, c?.checkAction]);
  ok(!!act && act.what === 'Check: Log the packing-room temperature for a week' && act.who === 'Lee' && act.due === day && !act.causeRef && act.state === 'todo', '2 the check is an action on the board: what, who, the day, no cause', JSON.stringify(act));
  await go(READ);
  const order = (await page.locator('.wc-card .wc-text').allInnerTexts()).map(norm);
  ok(order[0] === 'Splices vary between shifts' && order[1] === 'Hot mornings soften the film' && order[2] === 'Reel cores out of round', '2 after a reload the list is in the new order (Likely · Some before Possible · Some)', order.join(' | '));
  await go(`${P}/actions`);
  ok(/Check: Log the packing-room temperature for a week/.test(await page.locator('.nv-main').innerText()), '2 the check is on the project\'s Actions');
}

/* ---- 3 · the gate ---- */
await go(READ);
{
  await cardOf('Reel cores').locator('.wc-text').click();
  await page.locator('.cs-body').first().waitFor({ timeout: 8000 });
  const t = norm(await page.locator('.cs-body').first().innerText());
  ok(/Check it first/.test(t) && (await page.locator('.cs-body').getByRole('button', { name: /Ask why/ }).count()) === 0, '3 a suspected cause: the whys say "Check it first" and no Ask why is offered');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  /* Hot mornings: ticked, checking — confirm from its card (The check shows it is real) */
  await go(READ);
  await cardOf('Hot mornings').getByRole('button', { name: /confirm/ }).click();
  await page.waitForTimeout(900);
  const c = await causeOf('wt-heat');
  const act = await page.evaluate(async ([pid, id]) => (await (await import('/src/db.ts')).listPaceTodos(pid)).find(t => t.id === id), [S.projectId, c?.checkAction]);
  ok(c?.status === 'confirmed' && act?.state === 'done', '3 confirmed from its check — the board action is done with it', JSON.stringify([c?.status, act?.state]));
  await cardOf('Hot mornings').locator('.wc-text').click();
  await page.locator('.cs-body').first().waitFor({ timeout: 8000 });
  ok((await page.locator('.cs-body').getByRole('button', { name: /Ask why/ }).count()) >= 1, '3 once confirmed, Ask why opens');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
}

/* ---- 4 · the why tree ---- */
await go(READ);
{
  await cardOf('Poor training').locator('.wc-text').click();
  await page.locator('.wt').first().waitFor({ timeout: 8000 });
  const lit = await page.evaluate(async ([pid, cid]) => {
    const db = await import('/src/db.ts'); const m = await import('/src/lib/whyTree.ts');
    const c = (await db.listProjectCases(pid)).find(x => x.title === 'Film breaks on the Bagger').causes.find(x => x.id === cid);
    return { says: m.treeSays(c), r: m.readTree(c) };
  }, [S.projectId, S.trainingCauseId]);
  const says = await words('.wt-says');
  ok(says === lit.says && says === '3 branches, 1 root — Training is not planned into the roster — shared by all three.' && lit.r.branches === 3 && lit.r.roots.length === 1 && lit.r.roots[0].branches === 3, `4 the tree says it as the module and the hand-worked case do: "${says}"`);
  ok((await page.locator('.wt-node').count()) === 6 && (await page.locator('.wt-tag.is-root').count()) === 1 && (await page.locator('.wt-tag', { hasText: /^Same root as/ }).count()) === 2, '4 six answers, one Root tag and two "Same root as" tags');
  const back = norm(await page.locator('.cs-read').first().innerText());
  ok(/Training is not planned into the roster, therefore the trainer has no time/.test(back) && /Nobody owns the standard, therefore there is no written standard/.test(back), '4 the therefore test is read branch by branch');
  /* a fix on the root counts as the cause's own (refIsCause) */
  const fixCount = await page.evaluate(async ([pid, cid]) => {
    const f = await import('/src/lib/fishbone.ts'); const db = await import('/src/db.ts');
    const t = Date.now();
    await db.putPaceTodo({ id: 'wt-fix', projectId: pid, what: 'Plan training into the roster', where: '', why: '', who: 'Pat', when: '', state: 'todo', pillar: 'people', causeRef: f.causeRefOf((await db.listProjectCases(pid)).find(x => x.title === 'Film breaks on the Bagger').id, cid, 'wt-w6'), createdAt: t, updatedAt: t });
    return 1;
  }, [S.projectId, S.trainingCauseId]);
  ok(fixCount === 1, '4 a fix is written on the root (…#wt-w6)');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await go(READ);
  await cardOf('Poor training').locator('.wc-text').click();
  await page.locator('.cs-cms').first().waitFor({ timeout: 8000 });
  ok(/Plan training into the roster/.test(await words('.cs-cms')), '4 the fix on the root is listed under the cause\'s Fix');
  /* a new branch: ask why under the cause, answer, ask why again under it, mark it a root */
  await page.getByRole('button', { name: /Another answer to the cause/ }).click();
  await page.locator('.wt-node').last().locator('textarea, input').first().fill('Starters watch one shift and are left alone');
  await page.getByRole('button', { name: 'Why?', exact: true }).last().click();
  await page.waitForTimeout(300);
  await page.locator('.wt-node').last().locator('textarea, input').first().fill('The buddy rota is not kept');
  await page.locator('.wt-node').last().locator('.wt-root input').check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.waitForTimeout(900);
  const c = await causeOf(S.trainingCauseId);
  const mid = await page.evaluate(async c0 => (await import('/src/lib/whyTree.ts')).readTree(c0), c);
  ok(c.whys.length === 8 && c.root === true && mid.branches === 4 && mid.roots.length === 2 && mid.roots.some(r => r.branches === 3), '4 a fourth branch with its own root: 4 branches, 2 roots (one shared by three), the cause keeps root = true', JSON.stringify([c.whys.length, mid.branches, mid.roots.length]));
}

/* ---- 5 · a chain written before the tree; drilled before it was checked ---- */
await go(READ);
{
  await cardOf('Film is stored').locator('.wc-text').click();
  await page.locator('.wt').first().waitFor({ timeout: 8000 });
  ok(await words('.wt-says') === 'One chain, 2 whys deep — it reached a root: Nobody asked for one.', '5 a legacy chain reads as one chain with its root, unchanged');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.evaluate(async ([pid]) => {
    const db = await import('/src/db.ts');
    const c = (await db.listProjectCases(pid)).find(x => x.title === 'Film breaks on the Bagger');
    await db.patchCase(c.id, k => ({ ...k, causes: k.causes.map(x => (x.id === 'wt-reel' ? { ...x, whys: [{ id: 'wt-r1', text: 'The supplier changed the core' }] } : x)) }));
  }, [S.projectId]);
  await go(READ);
  ok(/Drilled before it was checked/.test(await words('.wc-state', cardOf('Reel cores'))), '5 a suspected cause that already has whys says it was drilled before it was checked');
  await cardOf('Reel cores').locator('.wc-text').click();
  await page.locator('.wt').first().waitFor({ timeout: 8000 });
  ok((await page.getByRole('button', { name: 'Why?', exact: true }).count()) >= 1, '5 and is not locked: it can still be asked why');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
}

/* ---- 6 · the 6M report: on the page and on paper ---- */
await go(`#/pace-report?project=${S.projectId}`);
{
  await page.getByRole('button', { name: 'Full report', exact: true }).click(); await page.waitForTimeout(500);
  const screen = norm(await page.locator('.nv-main').innerText());
  ok(/Causes thought of and checked/.test(screen) && /Neither could name the film-change steps/.test(screen) && /Sealing jaw runs cold at start-up/.test(screen), '6 the report page: the checked causes, with what each check found, the ruled-out one kept');
  ok(/3 branches|4 branches/.test(screen) && /shared by/.test(screen) && /same root as/.test(screen), '6 the report page: the tree\'s sentence and its "same root as"');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Download', exact: true }).first().click()]);
  const pdf = join(OUT, 'sixm.pdf'); await dl.saveAs(pdf);
  const t = san(pdfText(pdf));
  ok(t.includes(san('Causes thought of and checked')) && t.includes(san('Neither could name the film-change steps')) && t.includes(san('Sealing jaw runs cold at start-up')), '6 the paper: the checked causes and what each found');
  ok(t.includes(san('Training is not planned into the roster')) && /same root as/i.test(t) && t.includes(san('Ratings are the team\'s judgement')), '6 the paper: the tree with its roots and the ratings said to be the team\'s judgement');
}

/* ---- 7 · a client reads, and changes nothing ---- */
{
  const before = await causeOf(S.trainingCauseId);
  await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
  await go(READ);
  const canWrite = (await page.locator('.wc-card .cf').count()) + (await page.getByRole('button', { name: /^Save$/ }).count());
  ok(canWrite === 0, '7 a client sees the checks and has no box or Save on them');
  await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
  const after = await causeOf(S.trainingCauseId);
  ok(JSON.stringify(before) === JSON.stringify(after), '7 nothing was changed');
}

/* ---- 8 · the phone ---- */
{
  const phone = await ctx.newPage();
  await phone.setViewportSize({ width: 390, height: 844 });
  await phone.goto(`${BASE}/${READ}`); await phone.waitForTimeout(2500);
  await phone.locator('.wc').first().waitFor({ timeout: 15000 });
  const over = await phone.evaluate(() => { const w = document.documentElement.clientWidth; return [...document.querySelectorAll('.wc *')].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.right > w + 1 || r.left < -1); }).length; });
  ok(over === 0, `8 the phone: nothing off the side (${over} over)`);
  const small = await phone.evaluate(() => [...document.querySelectorAll('.wc .cs-chip, .wc .cf-tick, .wc .btn')].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 40).length);
  ok(small === 0, `8 the phone: chips, tick and buttons are a thumb's height (${small} short)`);
  await phone.close();
}

ok(errors.length === 0, `no console error${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(failed ? `\n${failed} FAILED` : '\nALL PASSED');
process.exit(failed ? 1 : 0);
