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
 *   7  THE MONEY (20 November, spec §6 "In money"; the figures scripts/knowledge/cases-rca.py's): the splice guide answers a 6M problem
 *      of 3 h a week on Yoko 3 (crew 5, £14.80, × 1.3, 60 a minute, 6p) and its board gives it 40% — Yoko 3's page says what it is
 *      worth there (1.2 h a week: £115 labour · 4,320 packs · £259 contribution), equal to the module and to FC-146's counterWorth read
 *      from the board's own reader; each row its own if — Yoko 7 £75 · 5,760 packs · £288 counted as stopping, Yoko 1 £56 labour only
 *      (its Line capacity's bottleneck the Sealer), Yoko 4 3,600 packs · £216 with its wage asked for; the three not yet answered
 *      9,360 packs · £504, the labour not added up and Yoko 4 named; a wage typed on Yoko 4 adding the labour (£160) with no reload
 *   8  the receiving line's offer says its own if (Yoko 7, here); after the answers the sum is Yoko 7 alone and the declined row has none
 *   9  the papers carry the money (step 5's reads)
 *  10  the share taken off the countermeasure: no money said, the share asked for where it is typed, no row priced; put back
 *
 *   node scripts/acceptance/horizontal-deployment.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { openMethodSections } from '../lib/methodFolds.mjs';
import { openLineMore } from '../lib/lineMore.mjs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { paper, linePaper } from '../lib/pageHeader.mjs';
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
const go = async (h, ms = 1800) => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(ms); await openLineMore(page); };  /* a line's Overview: More about this line opened first, as a person would (10 November) */
await go('#/room');
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- the factory: five lines and an archived one; the fix, its proof, the lines' own breaks */
const made = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const DAY = 86_400_000, t = Date.now(), uid = () => crypto.randomUUID();
  const mk = async (name, assets, archived, cost = {}) => { const w = await db.createWorkspace(name); await db.updateWorkspace({ ...w, assets: ['Whole line', ...assets], ...(archived ? { archived: true } : {}), ...cost }); return w; };
  /* each line's own cost model (the money's independent case, cases-rca.py): Yoko 3 FC-146's line; Yoko 4 no wage */
  const Y1 = await mk('Yoko 1', ['Wrapper', 'Sealer'], false, { crew: 3, labourRatePerHour: 13, labourBurden: 1.2, packsPerMin: 70, marginPerPack: 0.04 });
  const Y3 = await mk('Yoko 3', ['Wrapper'], false, { crew: 5, labourRatePerHour: 14.8, labourBurden: 1.3, packsPerMin: 60, marginPerPack: 0.06 });
  const Y4 = await mk('Yoko 4', ['wrapper '], false, { packsPerMin: 50, marginPerPack: 0.06 });
  const Y7 = await mk('Yoko 7', ['Wrapper'], false, { crew: 4, labourRatePerHour: 12.5, labourBurden: 1.25, packsPerMin: 80, marginPerPack: 0.05 });
  /* Yoko 1's Line capacity: the Sealer (50 a minute) holds the line, the Wrapper (100) is not its bottleneck */
  const st = (name, rate) => ({ id: name, name, kind: 'machine', unit: 'packs', contains: 1, rate, ratePer: 'min', crew: 1, source: 'plate' });
  await db.putStandard({ id: uid(), projectId: '', workspaceId: Y1.id, product: 'Yoko pack', capacity: { stations: [st('Wrapper', 100), st('Sealer', 50)] }, marks: [], sort: 0, createdAt: t, updatedAt: t });
  const Y9 = await mk('Yoko 9', ['Filler']), Y2 = await mk('Yoko 2', ['Wrapper'], true);
  const breaks = (w, n) => Promise.all(Array.from({ length: n }, (_, i) => db.addSnag({ id: uid(), workspaceId: w.id, problem: 'Film break', status: 'closed', raisedAt: t - DAY - i * 1000, closedAt: t, updatedAt: t, targetCategory: 'Minor stop', targetAsset: 'Wrapper' })));
  await breaks(Y7, 6); await breaks(Y1, 4); await breaks(Y4, 2); await breaks(Y9, 5);
  const project = await db.createProject('Yokoten 6M', '#0e7490', 'Rowland', 'r@example.com', 'board', 'pdca');
  const pl = await db.addPaceLine({ projectId: project.id, key: 'Y3', name: 'Yoko 3', owner: 'Rob', sponsor: 'Tanya', sort: 0, workspaceId: Y3.id });
  /* the 6M problem the splice guide answers: 3 h a week lost on the line when it opened (FC-146's case) */
  const caseId = uid();
  await db.addCase({ id: caseId, workspaceId: Y3.id, title: 'Film breaks stop the line', path: [], baselineMsWeek: 3 * 3_600_000, status: 'open', openedAt: t - 30 * DAY, updatedAt: t,
    projectId: project.id, lineId: pl.id, source: { kind: 'pareto', category: 'Minor stop' }, causes: [] });
  const todo = (id, what, state, where = 'Wrapper', more = {}) => db.putPaceTodo({ id, projectId: project.id, lineId: pl.id, what, where, why: 'Film breaks', who: 'Rob', when: 'this week', state, pillar: 'machine', createdAt: t, updatedAt: t, ...more });
  await todo('yk-fix', 'Splice guide', 'done', 'Wrapper', { caseId, expectPct: 40 });
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
/* THE MONEY as the module says it from the same records — the 6M board's own reader (lib/useProblems, lib/fishbone buildView) for the
   fix's problem, FC-146's counterWorth, and each line's own cost model and Line capacity (lib/lineLoss neckOf) */
const moneyNow = () => page.evaluate(async (m) => {
  const db = await import('/src/db.ts'); const y = await import('/src/tools/yokoten/yokoten.ts');
  const up = await import('/src/lib/useProblems.ts'); const sm = await import('/src/lib/sixmMoney.ts'); const ll = await import('/src/lib/lineLoss.ts');
  const ws = await db.listWorkspaces();
  const lines = ws.map(w => ({ id: w.id, name: w.name, machines: w.assets ?? [], ...(w.archived ? { archived: true } : {}) }));
  const todos = await db.listAllPaceTodos();
  const fix = y.provedFixes(todos, await db.allPaceLines(), await db.listAllStudies(), lines).find(f => f.id === 'yk-fix');
  const loaded = await up.loadProblems(m.project);
  const view = up.viewsOf(loaded, m.project).find(v => v.actions.some(a => (a.uid ?? a.ref) === 'yk-fix'));
  const pct = todos.find(t => t.id === 'yk-fix')?.expectPct;
  const board = sm.counterWorth(pct, view?.money);
  const money = y.fixMoneyOf(pct, view?.measure, view?.money, { onProblem: !!view });
  const cands = y.candidatesOf(fix, lines, await db.listAllSnags(), Date.now());
  const standards = await db.listAllStandards();
  const ifs = new Map(money.kind === 'worth' ? cands.map(c => [c.line.id, y.lineIfOf(money.hours, fix.machine, ws.find(w => w.id === c.line.id), ll.neckOf(standards, c.line.id))]) : []);
  const row = id => { const c = cands.find(x => x.line.id === id); const v = ifs.get(id); return c && v && c.state !== 'declined' ? y.lineIfSays(c.line.name, fix.machine, v, 'there') : ''; };
  return {
    here: y.fixMoneySays(fix, money), board: board?.parts ?? null, kind: money.kind,
    sum: money.kind === 'worth' ? y.spreadIfSays(money, cands, ifs) : '',
    rows: { Y7: row(m.Y7), Y1: row(m.Y1), Y4: row(m.Y4) },
    at7: money.kind === 'worth' ? y.lineIfSays('Yoko 7', fix.machine, ifs.get(m.Y7), 'here') : '',
  };
}, made);
const pane = async (sel) => (await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : '';
const rowWorth = async (name) => { const r = page.locator('.pl-spread .yk-line', { has: page.locator('.yk-name', { hasText: new RegExp(`^${name}$`) }) }); return (await r.locator('.yk-worth').count()) ? flat(await r.locator('.yk-worth').innerText()) : ''; };
const M0 = await moneyNow();
/* SHOTS=<dir>: the panel as drawn, at the desk and on the phone — for looking at, never a check */
const shot = async name => { if (process.env.SHOTS) await page.locator('.pl-spread').first().screenshot({ path: `${process.env.SHOTS}/yokoten-${name}.png` }).catch(() => {}); };
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
ok((await page.locator('.pl-spread .yk-foot').innerText()).includes('A fix copied is a rumour'), '1 the page says a copied fix is checked on each line');
ok((await page.locator('.pl-tiles .ln-tile').count()) === 4, '1 the four tiles are still four');

/* 7 — the money where it was proved, each line's if, the lines not yet answered added up (spec §6 "In money", cases 1–5) */
const HERE = 'What it is worth on Yoko 3, by the share its 6M board gives it — 40% of the problem’s 3 h a week, so 1.2 h a week: £115 labour · 4,320 packs · £259 contribution a week.';
ok(M0.kind === 'worth' && M0.here === HERE, '7 the module says the fix’s worth on Yoko 3 by its board’s share — the independent case (1.2 h a week: £115 · 4,320 packs · £259)', M0.here);
ok(!!M0.board && Math.abs(M0.board.labour - 115.44) < 1e-6 && Math.abs(M0.board.packs - 4320) < 1e-6 && Math.abs(M0.board.contribution - 259.2) < 1e-6,
  '7 the figure is FC-146’s counterWorth read from the 6M board’s own reader (£115.44 · 4,320 · £259.20 — cases-rca.py)', JSON.stringify(M0.board));
ok((await pane('.pl-spread .yk-fix .yk-money')) === HERE, '7 Yoko 3’s page says it, under the tally', await pane('.pl-spread .yk-fix .yk-money'));
ok(!/earned:|saved|measured/.test(HERE), '7 where it was proved it is the board’s share — never said as earned or measured');
const ROW7 = 'If the same 1.2 h a week comes back there: £75 labour · 5,760 packs · £288 contribution a week — counted as stopping the line: Yoko 7’s bottleneck is not known until its capacity is counted.';
const ROW1 = 'If the same 1.2 h a week comes back there: £56 labour a week — the Wrapper is not Yoko 1’s bottleneck, so the line runs round it.';
const ROW4 = 'If the same 1.2 h a week comes back there: 3,600 packs · £216 contribution a week — counted as stopping the line: Yoko 4’s bottleneck is not known until its capacity is counted; give Yoko 4 a wage (Set up the line) to say the labour.';
ok(M0.rows.Y7 === ROW7 && M0.rows.Y1 === ROW1 && M0.rows.Y4 === ROW4, '7 the module prices each line by its own cost model and bottleneck — the independent cases 2–4', JSON.stringify(M0.rows));
ok((await rowWorth('Yoko 7')) === ROW7, '7 Yoko 7’s row: £75 · 5,760 packs · £288, counted as stopping (no Line capacity)', await rowWorth('Yoko 7'));
ok((await rowWorth('Yoko 1')) === ROW1, '7 Yoko 1’s row: £56 labour only — its Line capacity says the Sealer holds it, the line runs round the Wrapper', await rowWorth('Yoko 1'));
ok((await rowWorth('Yoko 4')) === ROW4, '7 Yoko 4’s row: 3,600 packs · £216, and its wage asked for where it is given', await rowWorth('Yoko 4'));
const SUM0 = 'If it brings back the same 1.2 h a week on the 3 lines not yet answered: 9,360 packs · £504 contribution a week — an if, not earned: each line proves it by its own before → after. The labour is not added up — Yoko 4 has no wage (Set up the line). The packs are counted as stopping the line on Yoko 7 and Yoko 4, whose bottleneck is not known.';
ok(M0.sum === SUM0 && (await pane('.pl-spread .yk-fix .yk-if')) === SUM0, '7 the three not yet answered added up — 9,360 packs · £504; the labour not added, Yoko 4 named; an if, not earned', await pane('.pl-spread .yk-fix .yk-if'));
/* a wage typed on Yoko 4 — the labour is added with no reload (75 + 56.16 + 1.2 × 2 × £12 = £159.96); taken off again, back as it was */
const setWage = (id, crew, rate) => page.evaluate(async ([i, c, r]) => { const db = await import('/src/db.ts'); const w = await db.getWorkspace(i); await db.updateWorkspace({ ...w, crew: c, labourRatePerHour: r }); }, [id, crew, rate]);
await setWage(made.Y4, 2, 12);
await page.waitForFunction(() => /^If it brings back the same 1\.2 h a week on the 3 lines not yet answered: £160 labour · 9,360 packs · £504 contribution a week/.test((document.querySelector('.pl-spread .yk-if')?.textContent ?? '').replace(/\s+/g, ' ')), null, { timeout: 8000 }).catch(() => {});
const SUMW = await pane('.pl-spread .yk-fix .yk-if');
ok(SUMW.startsWith('If it brings back the same 1.2 h a week on the 3 lines not yet answered: £160 labour · 9,360 packs · £504 contribution a week') && !SUMW.includes('not added up'),
  '7 a wage typed on Yoko 4 adds the labour (£160 a week) and the ask goes — with no reload', SUMW);
await setWage(made.Y4, undefined, undefined);
await page.waitForFunction(s => (document.querySelector('.pl-spread .yk-if')?.textContent ?? '').replace(/\s+/g, ' ').trim() === s, SUM0, { timeout: 8000 }).catch(() => {});
ok((await pane('.pl-spread .yk-fix .yk-if')) === SUM0, '7 taken off again, the labour is not added and Yoko 4 is named once more', await pane('.pl-spread .yk-fix .yk-if'));
await shot('desk');
await go(`#/lines/${made.Y9}`); await page.waitForTimeout(600);
/* 6 November (docs/LOOK.md §0, L2): a line with nothing proved says so and what proves one — never a hole, no fix listed */
ok((await page.locator('.pl-spread.is-none').count()) === 1 && (await page.locator('.pl-spread .yk-fix').count()) === 0 && /No fix proved on this line yet/.test(await page.locator('.pl-spread .yk-none').innerText()),
  '1 a line with nothing to spread and nothing offered says no fix proved yet, and lists none');

/* 1b — the project's method page: the Horizontal deployment row (PDCA's Act) says it and opens the line */
await go(`#/project/${made.project}`);
await page.waitForSelector('.pmethod-sec'); await openMethodSections(page);  // a method page opens on the section in hand, the rest folded (docs/DESIGN.md) — opened to read them
const row = page.locator('.pmethod-sec .lt-row', { hasText: 'Horizontal deployment' });
ok((await row.count()) === 1, '1b the project’s Act lists Horizontal deployment once');
ok(flat(await row.locator('.lt-says').innerText()) === `Splice guide proved on Yoko 3 — 3 lines with the Wrapper, 3 not yet answered. ${SUM0}`, '1b it says the fix, how many lines are not yet answered and what they would be worth — the line page’s sum', await row.locator('.lt-says').innerText());
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
const AT7 = 'If the same 1.2 h a week comes back here: £75 labour · 5,760 packs · £288 contribution a week — counted as stopping the line: Yoko 7’s bottleneck is not known until its capacity is counted.';
ok(M0.at7 === AT7 && flat(await rec.locator('.yk-money').innerText()) === AT7, '8 Yoko 7’s offer says what it would be worth here, by Yoko 7’s own cost model — an if', await rec.locator('.yk-money').innerText());

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
const M1 = await moneyNow();
const SUM1 = 'If it brings back the same 1.2 h a week on Yoko 7, the line not yet answered: £75 labour · 5,760 packs · £288 contribution a week — an if, not earned: each line proves it by its own before → after. The packs are counted as stopping the line on Yoko 7, whose bottleneck is not known.';
ok(M1.sum === SUM1 && (await pane('.pl-spread .yk-fix .yk-if')) === SUM1, '8 after the answers the sum is Yoko 7 alone — £75 · 5,760 packs · £288 (case 6), moved with no reload', await pane('.pl-spread .yk-fix .yk-if'));
ok((await rowWorth('Yoko 4')) === '' && M1.rows.Y4 === '', '8 the declined Yoko 4 has no if', await rowWorth('Yoko 4'));
ok((await rowWorth('Yoko 1')) === ROW1, '8 the proved-here Yoko 1 keeps its if — its proof is its words, no money is claimed', await rowWorth('Yoko 1'));

/* 4 — the register holds it as a problem; not a look */
const reg = await page.evaluate(async (id) => { const db = await import('/src/db.ts'); return (await db.snagsForWorkspace(id)).filter(s => s.targetCategory === 'Spread a fix').map(s => ({ status: s.status, owner: s.owner ?? '', proposed: s.proposedSolution })); }, made.Y7);
ok(reg.length === 1 && reg[0].status === 'open' && /Splice guide — proved on Yoko 3/.test(reg[0].proposed), '4 Yoko 7’s register holds the offer as an open problem carrying the fix and its proof', JSON.stringify(reg));
await go(`#/lines/${made.Y7}`);
await page.waitForSelector('.pl-looked .lk-says');
ok(!(await page.locator('.pl-looked .lk-says').innerText()).includes('a problem raised'), '4 an offer is not a look — Eyes on the line does not count it', await page.locator('.pl-looked .lk-says').innerText());

/* 5 — on paper */
await go(`#/lines/${made.Y3}`, 3000);
await page.waitForSelector('.pl-spread .yk-fix');
const [d1] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), linePaper(page, 'summary')]);
const one = await readPdf(d1, 'one.pdf');
ok(one.includes('Splice guide proved on Yoko 3') && one.includes('have the Wrapper') && one.includes(`offered on Yoko 7`), '5 the one-page report carries the sentence', one.slice(0, 1400));
/* the paper's one door (lib/reportKit san) spells an arrow "to" — the sentence as the paper prints it, by the engine's own function */
const onPaper = txt => page.evaluate(async x => (await import('/src/lib/reportKit.ts')).san(x), txt);
ok(one.includes(await onPaper(HERE)) && one.includes(await onPaper(SUM1)), '9 the one-page report carries the money — its worth on Yoko 3 and the line not yet answered added up, read back', one.slice(one.indexOf('Splice guide'), one.indexOf('Splice guide') + 1600));
const [d2] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), linePaper(page, 'shorter')]);
await page.waitForSelector('.lr-part', { timeout: 15000 });
ok((await page.locator('.lr-spread').first().innerText()).includes('Splice guide proved on Yoko 3'), '5 the combined report’s page says it too');
const lrs = (await page.locator('.lr-spread').allInnerTexts()).map(flat);
ok(lrs.includes(HERE) && lrs.includes(SUM1), '9 and the money with it — the same two sentences', lrs.join(' | '));
void d2;
await go(`#/lines/${made.Y7}`, 3000);
await page.waitForSelector('.pl-spread [data-received]');
const [d3] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), linePaper(page, 'summary')]);
const rcv = await readPdf(d3, 'rcv.pdf');
ok(rcv.includes('Splice guide: offered. Proved on Yoko 3.'), '5 the receiving line’s report says what was offered to it', rcv.slice(0, 1400));
ok(rcv.includes(await onPaper(AT7)), '9 and what it would be worth on Yoko 7 — the if, read back', rcv.slice(rcv.indexOf('Splice guide'), rcv.indexOf('Splice guide') + 900));

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
ok((await pane('.pl-spread .yk-fix .yk-money')) === HERE && (await rowWorth('Yoko 7')) === ROW7, '6 the phone carries the money: its worth on Yoko 3 and each line’s if', await pane('.pl-spread .yk-fix .yk-money'));
const moneyBox = await page.locator('.pl-spread .yk-money, .pl-spread .yk-if, .pl-spread .yk-worth').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().right)));
ok(moneyBox.length >= 3 && moneyBox.every(r => r <= 390), '6 the money’s words wrap inside the phone’s width', moneyBox.join(','));
await shot('phone');

/* 10 — the share taken off the countermeasure: no money said, the share asked for where it is typed; nothing priced; put back */
const setShare = pct => page.evaluate(async p => { const db = await import('/src/db.ts'); const t = (await db.listAllPaceTodos()).find(x => x.id === 'yk-fix'); const { expectPct: _x, ...rest } = t; await db.putPaceTodo(p == null ? rest : { ...rest, expectPct: p }); }, pct);
await setShare(null);
const NOSHARE = 'No money is said: its 6M board gives it no share of the problem — type How much of the problem it should remove on the countermeasure (its 6M board) to say what it is worth, here and on every line.';
await page.waitForFunction(s => (document.querySelector('.pl-spread .yk-money')?.textContent ?? '').replace(/\s+/g, ' ').trim() === s, NOSHARE, { timeout: 8000 }).catch(() => {});
const M2 = await moneyNow();
ok(M2.kind === 'none' && M2.here === NOSHARE && (await pane('.pl-spread .yk-fix .yk-money')) === NOSHARE, '10 no share on the board: no money is said, and the share is asked for where it is typed', await pane('.pl-spread .yk-fix .yk-money'));
ok((await page.locator('.pl-spread .yk-if').count()) === 0 && (await page.locator('.pl-spread .yk-worth').count()) === 0, '10 no line is priced and nothing is added up — nothing estimated');
await setShare(40);
await page.waitForFunction(s => (document.querySelector('.pl-spread .yk-money')?.textContent ?? '').replace(/\s+/g, ' ').trim() === s, HERE, { timeout: 8000 }).catch(() => {});
ok((await pane('.pl-spread .yk-fix .yk-money')) === HERE, '10 the share put back, the worth is said again with no reload', await pane('.pl-spread .yk-fix .yk-money'));

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
