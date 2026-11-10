/* FC-155 — HORIZONTAL DEPLOYMENT: a proved fix offered to every line with the same machine
 * (knowledge/specs/FC-155-horizontal-deployment.md; knowledge/methods/rca/horizontal-deployment.md, "Worked case").
 * Lines Yoko 1, 3, 4, 7 each have a Wrapper (Yoko 9 has a Filler; Yoko 2 has a Wrapper and is archived). A 6M countermeasure
 * "Splice guide" on Yoko 3's Wrapper is done and its before → after (film breaks, capability study before and after) moved the
 * right way. Line 7 has six film-break problems written on the Wrapper, Line 1 four, Line 4 two. Then:
 *
 *   1  Yoko 3's page: "Spread what works" says the fix, its proof, the three lines in the order 7, 1, 4 (the module's words),
 *      each "not offered"; a fix not done or with no before → after is not there; Yoko 9 (Filler) and the archived line not listed
 *   2  Offer it: three offers, one problem on each line's register (a fixed id — pressing again makes none); the sentence now
 *      "offered on …"; Yoko 7's page shows it under "Offered to this line" with Take it, It worked here, Not for this line
 *   3  Take it on Yoko 1 — in progress; "It worked here" refused with no words, then proved with its words (closed, the words
 *      on the register's row); Yoko 4 declines with a reason (complete, not open); the source's sentence and tally move without a reload
 *   4  the register on Yoko 7 holds the offer as a problem of its own, not a look (Eyes on the line unchanged)
 *   5  on paper: the line's one-page report and the combined line report, downloaded and read back, carry the module's sentence
 *   6  the phone: nothing off the side, the buttons 44 px
 *
 *   node scripts/acceptance/horizontal-deployment.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { openMethodSections } from '../lib/methodFolds.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { paper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {} } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const dir = mkdtempSync(join(tmpdir(), 'yokoten-'));
const readPdf = async (d, file) => { const f = join(dir, file); await d.saveAs(f); return execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' '); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const go = async (h, ms = 1800) => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(ms); };
await go('#/room');
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- the factory: five lines and an archived one; the fix, its proof, the lines' own breaks */
const made = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const DAY = 86_400_000, t = Date.now(), uid = () => crypto.randomUUID();
  const mk = async (name, assets, archived) => { const w = await db.createWorkspace(name); await db.updateWorkspace({ ...w, assets: ['Whole line', ...assets], ...(archived ? { archived: true } : {}) }); return w; };
  const Y1 = await mk('Yoko 1', ['Wrapper', 'Sealer']), Y3 = await mk('Yoko 3', ['Wrapper']), Y4 = await mk('Yoko 4', ['wrapper ']), Y7 = await mk('Yoko 7', ['Wrapper']);
  const Y9 = await mk('Yoko 9', ['Filler']), Y2 = await mk('Yoko 2', ['Wrapper'], true);
  const breaks = (w, n) => Promise.all(Array.from({ length: n }, (_, i) => db.addSnag({ id: uid(), workspaceId: w.id, problem: 'Film break', status: 'closed', raisedAt: t - DAY - i * 1000, closedAt: t, updatedAt: t, targetCategory: 'Minor stop', targetAsset: 'Wrapper' })));
  await breaks(Y7, 6); await breaks(Y1, 4); await breaks(Y4, 2); await breaks(Y9, 5);
  const project = await db.createProject('Yokoten 6M', '#0e7490', 'Rowland', 'r@example.com', 'board', 'pdca');
  const pl = await db.addPaceLine({ projectId: project.id, key: 'Y3', name: 'Yoko 3', owner: 'Rob', sponsor: 'Tanya', sort: 0, workspaceId: Y3.id });
  const todo = (id, what, state, where = 'Wrapper') => db.putPaceTodo({ id, projectId: project.id, lineId: pl.id, what, where, why: 'Film breaks', who: 'Rob', when: 'this week', state, pillar: 'machine', createdAt: t, updatedAt: t });
  await todo('yk-fix', 'Splice guide', 'done');
  await todo('yk-open', 'Re-tension the film', 'todo');
  await todo('yk-bare', 'Clean the jaws', 'done'); // done, but nothing proves it
  const agreed = { readings: { kind: 'limits', unit: 'breaks', nominal: 4, lower: 0, upper: 8, count: 10 } };
  const study = (name, readings, role, ref, ago) => db.putStudy({ id: uid(), tool: 'capability', name, workspaceId: Y3.id, projectId: project.id, machine: 'Wrapper', agreed,
    facts: { readings: readings.map((value, i) => ({ id: uid(), value, at: t - (20 - i) * 60_000, who: 'K. Ahmed' })) },
    uses: [{ id: uid(), kind: 'action', ref, role, at: t }], startedAt: t - ago, createdAt: t, updatedAt: t });
  await study('Film breaks a shift', [7, 8, 6, 9, 7, 8, 7, 6, 8, 7], 'evidence', 'yk-fix', 3 * DAY);
  await study('Film breaks a shift', [3, 4, 3, 2, 4, 3, 3, 4, 2, 3], 'proof', 'yk-fix', 60_000);
  return { Y1: Y1.id, Y3: Y3.id, Y4: Y4.id, Y7: Y7.id, Y9: Y9.id, Y2: Y2.id, project: project.id };
});
/* the module's own words for the same records, read on the page */
const mod = await page.evaluate(async (m) => {
  const db = await import('/src/db.ts'); const y = await import('/src/tools/yokoten/yokoten.ts');
  const ws = await db.listWorkspaces();
  const lines = ws.map(w => ({ id: w.id, name: w.name, machines: w.assets ?? [], ...(w.archived ? { archived: true } : {}) }));
  const fixes = y.provedFixes(await db.listAllPaceTodos(), await db.allPaceLines(), await db.listAllStudies(), lines);
  const fix = fixes.find(f => f.id === 'yk-fix');
  const snags = await db.listAllSnags();
  const c = fix ? y.candidatesOf(fix, lines, snags, Date.now()) : [];
  return { fixes: fixes.map(f => f.id), proof: fix?.proof, says: fix ? y.fixSays(fix, c) : '', order: c.map(x => `${x.line.name}:${x.rate}`), tally: fix ? y.tallySays(y.tallyOf(c)) : '' };
}, made);
const SAYS0 = 'Splice guide proved on Yoko 3 (' + String(mod.proof).replace(/\.$/, '') + ') — Yoko 7, Yoko 1 and Yoko 4 have the Wrapper: not offered on Yoko 7, Yoko 1 and Yoko 4.';

/* 1 — the source line's page */
ok(mod.fixes.length === 1 && mod.fixes[0] === 'yk-fix', '1 only the done countermeasure with a before → after moving the right way is a proved fix (not the open one, not the one nothing proves)', JSON.stringify(mod.fixes));
ok(/\d+(\.\d+)?/.test(mod.proof ?? '') && !!mod.proof, '1 its proof is the board’s own before → after', mod.proof);
ok(mod.order.join(' ') === 'Yoko 7:6 Yoko 1:4 Yoko 4:2', '1 the lines in the order of their own breaks, 7 (6), 1 (4), 4 (2) — Yoko 9’s Filler and the archived Yoko 2 not among them', mod.order.join(' '));
await go(`#/lines/${made.Y3}`);
await page.waitForSelector('.pl-spread .yk-fix', { timeout: 15000 });
ok(flat(await page.locator('.pl-spread .yk-fix .yk-says').first().innerText()) === SAYS0, '1 Yoko 3 says the fix, its proof and the three lines — the module’s sentence', await page.locator('.pl-spread .yk-fix .yk-says').first().innerText());
ok(flat(await page.locator('.pl-spread .yk-fix .yk-more').first().innerText()) === mod.tally && mod.tally.startsWith('3 lines with this machine · 0 proved · 0 taken · 0 offered, not answered · 0 declined · 3 not offered'), '1 and the tally', mod.tally);
const names = (await page.locator('.pl-spread .yk-line .yk-name').allInnerTexts()).map(flat);
ok(names.join(',') === 'Yoko 7,Yoko 1,Yoko 4', '1 a row a line, in that order', names.join(','));
ok((await page.locator('.pl-spread .yk-line .yk-rate').first().innerText()).includes('6 problems written on it in 90 days'), '1 each row says its own rate in words');
ok(!(await page.locator('.pl-spread .yk-fix').filter({ hasText: 'Clean the jaws' }).count()) && !(await page.locator('.pl-spread .yk-fix').filter({ hasText: 'Re-tension' }).count()), '1 the fix nothing proves and the one still open are not offered');
ok((await page.locator('.pl-spread .yk-foot').innerText()).includes('A fix copied is a rumour') && (await page.locator('.pl-spread .yk-foot').innerText()).includes('No money is said'), '1 the page says a copied fix is checked on each line and names the money that is not said');
ok((await page.locator('.pl-tiles .ln-tile').count()) === 4, '1 the four tiles are still four');
await go(`#/lines/${made.Y9}`); await page.waitForTimeout(600);
/* 6 November (docs/LOOK.md §0, L2): a line with nothing proved says so and what proves one — never a hole, no fix listed */
ok((await page.locator('.pl-spread.is-none').count()) === 1 && (await page.locator('.pl-spread .yk-fix').count()) === 0 && /No fix proved on this line yet/.test(await page.locator('.pl-spread .yk-none').innerText()),
  '1 a line with nothing to spread and nothing offered says no fix proved yet, and lists none');

/* 1b — the project's method page: the Horizontal deployment row (PDCA's Act) says it and opens the line */
await go(`#/project/${made.project}`);
await page.waitForSelector('.pmethod-sec'); await openMethodSections(page);  // a method page opens on the section in hand, the rest folded (docs/DESIGN.md) — opened to read them
const row = page.locator('.pmethod-sec .lt-row', { hasText: 'Horizontal deployment' });
ok((await row.count()) === 1, '1b the project’s Act lists Horizontal deployment once');
ok(flat(await row.locator('.lt-says').innerText()) === 'Splice guide proved on Yoko 3 — 3 lines with the Wrapper, 3 not yet answered.', '1b it says the fix and how many lines are not yet answered', await row.locator('.lt-says').innerText());
await row.click(); await page.waitForTimeout(1200);
ok(page.url().endsWith(`#/lines/${made.Y3}`), '1b and opens the line that proved it', page.url());

/* 2 — offer it */
await go(`#/lines/${made.Y3}`);
await page.waitForSelector('.pl-spread .yk-offer');
ok(flat(await page.locator('.yk-offer').innerText()).startsWith('Offer it to the 3 lines'), '2 one button offers it to the three lines', await page.locator('.yk-offer').innerText());
await page.locator('.yk-offer').click();
await page.waitForFunction(() => !document.querySelector('.pl-spread .yk-offer'), null, { timeout: 8000 }).catch(() => {});
const snagsNow = await page.evaluate(async () => (await (await import('/src/db.ts')).listAllSnags()).filter(s => s.targetCategory === 'Spread a fix').map(s => ({ ws: s.workspaceId, id: s.id, status: s.status, asset: s.targetAsset, problem: s.problem })));
ok(snagsNow.length === 3 && new Set(snagsNow.map(s => s.id)).size === 3 && snagsNow.every(s => s.id === `yokoten-yk-fix-${s.ws}` && s.status === 'open' && s.asset === 'Wrapper'), '2 three offers — one open problem on each line’s register, with a fixed id', JSON.stringify(snagsNow));
ok(flat(await page.locator('.pl-spread .yk-fix .yk-says').first().innerText()).endsWith('offered on Yoko 7, Yoko 1 and Yoko 4.'), '2 the sentence now says offered', await page.locator('.pl-spread .yk-fix .yk-says').first().innerText());
await page.evaluate(async (m) => { const y = await import('/src/tools/yokoten/yokoten.ts'); void y; }, made);
await go(`#/lines/${made.Y3}`);
ok((await page.evaluate(async () => (await (await import('/src/db.ts')).listAllSnags()).filter(s => s.targetCategory === 'Spread a fix').length)) === 3, '2 offering again (a reload) makes no more');
await go(`#/lines/${made.Y7}`);
await page.waitForSelector('.pl-spread [data-received]', { timeout: 15000 });
const rec = page.locator('.pl-spread [data-received]');
ok(flat(await rec.locator('.yk-says').innerText()).startsWith('Splice guide: offered. Proved on Yoko 3.'), '2 Yoko 7 shows it under Offered to this line', await rec.locator('.yk-says').innerText());
ok((await rec.getByRole('button').allInnerTexts()).map(flat).join('|') === 'Take it|It worked here…|Not for this line…', '2 with Take it, It worked here, Not for this line');

/* 3 — the answers */
await go(`#/lines/${made.Y1}`);
await page.waitForSelector('.pl-spread [data-received]');
await page.getByRole('button', { name: 'Take it' }).click();
await page.waitForSelector('.pl-spread [data-received="taken"]', { timeout: 8000 });
ok(flat(await page.locator('.pl-spread [data-received] .yk-says').innerText()).startsWith('Splice guide: taken.'), '3 Yoko 1 takes it — taken');
await page.getByRole('button', { name: 'It worked here…' }).click();
ok(await page.getByRole('button', { name: 'Proved here' }).isDisabled(), '3 "It worked here" is refused with no words');
await page.locator('.yk-ask input').fill('breaks 4 → 1 a shift');
await page.getByRole('button', { name: 'Proved here' }).click();
await page.waitForSelector('.pl-spread [data-received="proved"]', { timeout: 8000 });
ok(flat(await page.locator('.pl-spread [data-received] .yk-says').innerText()).startsWith('Splice guide: Proved — breaks 4 → 1 a shift'), '3 proved here, its own words on the row', await page.locator('.pl-spread [data-received] .yk-says').innerText());
ok((await page.locator('.pl-spread [data-received] .btn').count()) === 0, '3 and nothing more to press');
await go(`#/lines/${made.Y4}`);
await page.waitForSelector('.pl-spread [data-received]');
await page.getByRole('button', { name: 'Not for this line…' }).click();
await page.locator('.yk-ask input').fill('different film');
await page.getByRole('button', { name: 'Decline' }).click();
await page.waitForSelector('.pl-spread [data-received="declined"]', { timeout: 8000 });
ok(flat(await page.locator('.pl-spread [data-received] .yk-says').innerText()).startsWith('Splice guide: Declined — different film'), '3 Yoko 4 declines with its reason');
await go(`#/lines/${made.Y3}`);
await page.waitForSelector('.pl-spread .yk-fix .yk-says');
const after = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const y = await import('/src/tools/yokoten/yokoten.ts');
  const lines = (await db.listWorkspaces()).map(w => ({ id: w.id, name: w.name, machines: w.assets ?? [], ...(w.archived ? { archived: true } : {}) }));
  const fix = y.provedFixes(await db.listAllPaceTodos(), await db.allPaceLines(), await db.listAllStudies(), lines).find(f => f.id === 'yk-fix');
  const c = y.candidatesOf(fix, lines, await db.listAllSnags(), Date.now());
  return { says: y.fixSays(fix, c), tally: y.tallySays(y.tallyOf(c)), open: y.tallyOf(c).open };
});
ok(flat(await page.locator('.pl-spread .yk-fix .yk-says').first().innerText()) === after.says && after.says.endsWith('proved here on Yoko 1; offered on Yoko 7; declined on Yoko 4.'), '3 the source’s sentence says proved on Yoko 1, offered on 7, declined on 4', after.says);
ok(flat(await page.locator('.pl-spread .yk-fix .yk-more').first().innerText()) === after.tally && after.tally.startsWith('3 lines with this machine · 1 proved · 0 taken · 1 offered, not answered · 1 declined · 0 not offered') && after.open === 1, '3 and the tally — a decline with a reason is complete, an unanswered offer is open', after.tally);

/* 4 — the register holds it as a problem; not a look */
const reg = await page.evaluate(async (id) => { const db = await import('/src/db.ts'); return (await db.snagsForWorkspace(id)).filter(s => s.targetCategory === 'Spread a fix').map(s => ({ status: s.status, owner: s.owner ?? '', proposed: s.proposedSolution })); }, made.Y7);
ok(reg.length === 1 && reg[0].status === 'open' && /Splice guide — proved on Yoko 3/.test(reg[0].proposed), '4 Yoko 7’s register holds the offer as an open problem carrying the fix and its proof', JSON.stringify(reg));
await go(`#/lines/${made.Y7}`);
await page.waitForSelector('.pl-looked .lk-says');
ok(!(await page.locator('.pl-looked .lk-says').innerText()).includes('a problem raised'), '4 an offer is not a look — Eyes on the line does not count it', await page.locator('.pl-looked .lk-says').innerText());

/* 5 — on paper */
await go(`#/lines/${made.Y3}`, 3000);
await page.waitForSelector('.pl-spread .yk-fix');
const [d1] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), paper(page, 'Line report — 1 page', page.locator('.pl'))]);
const one = await readPdf(d1, 'one.pdf');
ok(one.includes('Splice guide proved on Yoko 3') && one.includes('have the Wrapper') && one.includes(`offered on Yoko 7`), '5 the one-page report carries the sentence', one.slice(0, 1400));
const [d2] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), paper(page, 'Line report — everything on the line', page.locator('.pl'))]);
await page.waitForSelector('.lr-part', { timeout: 15000 });
ok((await page.locator('.lr-spread').first().innerText()).includes('Splice guide proved on Yoko 3'), '5 the combined report’s page says it too');
void d2;
await go(`#/lines/${made.Y7}`, 3000);
await page.waitForSelector('.pl-spread [data-received]');
const [d3] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), paper(page, 'Line report — 1 page', page.locator('.pl'))]);
const rcv = await readPdf(d3, 'rcv.pdf');
ok(rcv.includes('Splice guide: offered. Proved on Yoko 3.'), '5 the receiving line’s report says what was offered to it', rcv.slice(0, 1400));

/* 6 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
for (const h of [`#/lines/${made.Y3}`, `#/lines/${made.Y7}`]) {
  await go(h);
  ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, `6 the phone: nothing off the side of ${h.replace(/[0-9a-f-]{36}/, ':id')}`);
}
await go(`#/lines/${made.Y3}`);
await page.waitForSelector('.pl-spread .yk-name');
const hts = await page.locator('.pl-spread .yk-name').evaluateAll(es => es.map(e => e.getBoundingClientRect().height));
ok(hts.length === 3 && hts.every(h => h >= 44), '6 a line’s name is a 44 px target', hts.join(','));

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
