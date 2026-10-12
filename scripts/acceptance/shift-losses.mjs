/* ACCEPTANCE — E: A SHIFT'S LOSSES, BY HAND, AND WHAT THEY COST
 * (docs/BUILD.md, E; docs/TOOLKIT.md, Part 4 §7).
 *
 * The question: of what the line should have made this shift, where did the
 * rest go? The story, driven in a real browser on the seeded jobs (Line 7 on
 * the 6M job: shifts with their breaks, a cost model, a line standard whose
 * capacity has the Bagger at 100 a minute on its plate, stops timed through
 * the last two days) with the real controls — the time model of
 * docs/CAPACITY.md §5–6:
 *
 *   1  a new count: Tools → Loss count asks the line first; from the line's
 *      board beside the Pareto, "Count a shift" — on the phone — the rate the
 *      plate speed of the Bagger; the shift picked, its planned minutes worked
 *      out (the shift less its breaks, none off under relief), changed for the
 *      day only with a reason; packs made and rejects typed; nothing written
 *      while typing; saved once
 *   2  the reading: the sentence, the strip and how each number is known, as
 *      lib/ie/losses says them from the count and the stops in its window —
 *      the rest named "slow running and short stops", amber over a tenth;
 *      the pounds in two parts; the waterfall and the causes a bar each, two
 *      columns of pounds; the running speed timed (each timing kept as it is
 *      added, with who; one struck and back) tells the slow running from the
 *      short stops; the line's settings carry each shift's breaks
 *   3  Make it better from a bar — a countermeasure on the board in the bar's
 *      own figures, on its bone, the count its evidence naming the bar; the
 *      bar says "Being made better"
 *   4  Prove it — the next shift's count, the same shift, linked as proof;
 *      counted (a stop timed in its window, as Capture would)
 *   5  before → after on the countermeasure — the bar, the lost minutes, the
 *      slow running and short stops
 *   6  where it shows: the line's board beside the Pareto, the line's card,
 *      the control room's drawer, the fishbone's suggested causes (accepted,
 *      "The loss count" is where it came from)
 *   7  paper: the 6M report's Evidence — the count's table (how the planned
 *      minutes and the rate are known, idle labour and lost contribution in
 *      two columns) and the countermeasure's before → after; the stage-gate
 *      client report's Evidence — the seeded count's table
 *   8  a line a person paces: a new count takes Op 3's standard time (the
 *      time study) as its rate when Op 3 is slower than every machine; on a
 *      guess, typed and said why
 *   and a client reads a count and changes nothing.
 *
 * Every sentence is checked against the module that makes it (lib/ie/losses,
 * lib/studyLinks, lib/fishbone) on the same records. Fails on any console
 * error.
 *
 *   node scripts/acceptance/shift-losses.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() },
};
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
const OUT = mkdtempSync(join(tmpdir(), 'acceptance-'));
const DAY = 86_400_000;

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
/* the phone first — the count is made on the floor */
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, locale: 'en-GB', acceptDownloads: true, hasTouch: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
const words = async (sel, root = page) => ((await root.locator(sel).count()) ? (await root.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : null);
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const san = s => s.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/£/g, '').replace(/\s+/g, ' ');

/* What the modules say of a count as it stands — its line's stops and cost model read as the screen reads them. */
const truth = id => page.evaluate(async id => {
  const db = await import('/src/db.ts');
  const L = await import('/src/lib/studyLinks.ts'); const X = await import('/src/lib/ie/losses.ts');
  const s = await db.getStudy(id);
  if (!s) return null;
  const ctx = { observations: s.workspaceId ? await db.listObservations(s.workspaceId) : [], workspaces: s.workspaceId ? [await db.getWorkspace(s.workspaceId)].filter(Boolean) : [] };
  const f = L.lossFiguresOf(s, ctx);
  const said = X.lossSays(f, s.facts.losses, { ...(s.product ? { product: s.product } : {}) });
  return { s, f, said, rows: X.lossRows(f, s.facts.losses), line: L.studyLine(s, ctx).text };
}, id);

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const P = `#/project/${sd.pacedProjectId}`;

/* ---- 1 · a new count ---- */
await go('#/losses');
await page.getByRole('button', { name: 'New loss count' }).first().click(); await page.waitForTimeout(500);
{
  const sheet = (await page.locator('.lt-new').textContent()) ?? '';
  ok(/Which line\?/.test(sheet) && !/What is it of\?/.test(sheet) && await page.getByRole('button', { name: 'Start it' }).isDisabled(),
    '1 Tools → Loss count: which line first (its shifts, stops and cost model) — Start it waits for the line');
  await page.keyboard.press('Escape'); await page.waitForTimeout(300);
}
await go(`#/w/${sd.line7WsId}/analyse`);
const before0 = await page.evaluate(async ws => (await (await import('/src/db.ts')).listStudiesForLine(ws)).map(s => s.id), sd.line7WsId);
await page.locator('.sll').getByRole('button', { name: 'Count a shift' }).click(); await page.waitForTimeout(1800);
const countId = decodeURIComponent(page.url().split('/losses/')[1] ?? '').split(/[?&]/)[0];
let t = await truth(countId);
ok(!!countId && !before0.includes(countId) && t?.s.projectId === sd.pacedProjectId && t?.s.workspaceId === sd.line7WsId && t?.s.facts.losses?.ratePerMin === 100 && t?.s.facts.losses?.rateFrom === 'plate' && t?.s.facts.losses?.rateMachine === 'Bagger'
  && (await words('.lf-rate-why')) === 'plate speed of the Bagger',
  `1 "Count a shift" beside the Pareto: a count on Line 7, on its job, at 100 a minute — "${await words('.lf-rate-why')}"`);
ok((await words('.ie-verdict')) === 'Not yet counted' && (await page.locator('.lf-body.is-counting').count()) === 1, '1 not yet counted — on the phone the count comes first');
/* Shift 2, two days ago: the seeded stops in it (20 min breakdown, 10 min misfeed, 5 min seal fault, 15 min changeover) */
const twoDaysAgo = await page.evaluate(() => { const d = new Date(Date.now() - 2 * 86_400_000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; });
await page.getByRole('radio', { name: 'Nights' }).click(); await page.waitForTimeout(200);
const nights = await words('.lf-worked');
await page.getByRole('radio', { name: 'Shift 2' }).click(); await page.waitForTimeout(200);
await page.getByLabel('The day').fill(twoDaysAgo);
const worked = await words('.lf-worked');
ok(/^450 planned · 480 min shift − 30 min of breaks/.test(worked ?? '') && /^480 planned · 480 min shift, relief covers the breaks/.test(nights ?? '') && (await page.getByLabel('Planned minutes', { exact: true }).count()) === 0,
  `1 the planned minutes worked out, not typed: Shift 2 "${worked}"; Nights "${nights}"`);
/* changed for the day only with a reason — then back to the shift less its breaks */
await page.getByRole('button', { name: 'Change for the day' }).click(); await page.waitForTimeout(200);
await page.getByLabel('Planned minutes', { exact: true }).fill('420');
const blocked = await page.getByRole('button', { name: 'Save the count' }).isDisabled();
const askWhy = await words('.ie-problem');
await page.getByLabel('Why the planned minutes differ').fill('stood 30 min — no film');
const freed = !(await page.getByRole('button', { name: 'Save the count' }).isDisabled());
await page.getByRole('button', { name: 'Back to the shift less its breaks' }).click(); await page.waitForTimeout(200);
ok(blocked && /Say why the planned minutes/.test(askWhy ?? '') && freed && (await page.getByLabel('Planned minutes', { exact: true }).count()) === 0,
  `1 changed for the day: Save waits for the reason — "${askWhy}" — and goes back to the worked-out 450`);
await page.getByLabel('Packs made').fill('12');
const typed12 = await page.getByLabel('Packs made').inputValue();
await page.getByLabel('Packs made').fill('39000');
await page.getByLabel('Rejects').fill('250');
const unsaved = (await truth(countId))?.s.facts.losses?.made;
await page.getByRole('button', { name: 'Save the count' }).click(); await page.waitForTimeout(1200);
t = await truth(countId);
ok(typed12 === '12' && unsaved === undefined && t?.s.facts.losses?.made === 39_000 && t?.s.facts.losses?.rejects === 250 && t?.s.facts.losses?.shift === 'Shift 2' && t?.s.facts.losses?.plannedMin === 450
  && t?.s.facts.losses?.breakMin === 30 && t?.s.facts.losses?.plannedWhy === undefined,
  `1 typed "12" stays 12, nothing written while typing, saved once: ${JSON.stringify({ shift: t?.s.facts.losses?.shift, made: t?.s.facts.losses?.made, rejects: t?.s.facts.losses?.rejects })} — named "${t?.s.name}"`);

/* ---- 2 · the reading ---- */
{
  const said = await words('.ie-says p.ie-say');
  ok(said === t.said.text && t.f.lostMin === 60 && Math.round(t.f.performanceMin) === 8 && /· 8 min of slow running and short stops\. £75 idle labour · £240 lost contribution if it cannot be made up\.$/.test(said ?? ''),
    `2 the sentence, as the module says — the rest named, the pounds in two parts: "${said}"`);
  ok((await words('.ie-verdict')) === t.said.verdict && t.said.verdict === '8 min slow running and short stops' && t.said.tone === 'a' && /is-a/.test(await page.locator('.ie-verdict').getAttribute('class') ?? ''),
    `2 the verdict — amber, the rest over a tenth: "${t.said.verdict}"`);
  const known = (await page.locator('.ie-says .ie-cap').allInnerTexts()).join(' ');
  ok(t.said.lines.every(l => known.includes(l.text)) && /How known: 480 min shift − 30 min of breaks = 450 planned · .*counted · the rate is the plate speed of the Bagger · .*idle labour £75\.40 an hour .*contribution £0\.04 a pack \(the line’s margin\)/.test(known),
    '2 how each number is known — the shift less its breaks, counted, the plate speed of the Bagger, the stops timed, the two costs');
  const rows = await page.locator('.lf-row').count(), bars = await page.locator('.lf-fall .lf-go').count();
  const heads = (await page.locator('.lf-th').innerText()).replace(/\s+/g, ' ');
  ok(rows === t.f.bars.length && bars === t.f.bars.length && (await page.locator('.lf-fall.is-rows').count()) === 1 && /Idle labour/i.test(heads) && /Lost contri\S*bution/i.test(heads.replace(/\u00AD/g, '')),
    `2 the waterfall (across the phone) and the table: a bar each, two columns of pounds — ${t.f.bars.map(b => `${b.label} ${Math.round(b.min)}`).join(', ')}`);
}

/* ---- 2b · the running speed, timed while it runs ---- */
{
  await page.getByLabel('Packs counted').fill('98'); await page.getByLabel('Seconds timed').fill('60');
  await page.getByRole('button', { name: 'Add the timing' }).click(); await page.waitForTimeout(700);
  await page.getByLabel('Packs counted').fill('100');
  await page.getByRole('button', { name: 'Add the timing' }).click(); await page.waitForTimeout(900);
  t = await truth(countId);
  const runs = t.s.facts.timings ?? [];
  ok(runs.length === 2 && runs.every(r => r.by && r.at > 0 && r.sec === 60) && t.s.facts.losses?.made === 39_000 && Math.abs(t.f.running.perMin - 99) < 1e-9,
    `2b two timings kept as they were added, each with when and who (${runs.map(r => `${r.packs} in ${r.sec}s by ${r.by}`).join(', ')}) — 99 a minute`);
  /* 400 run × (100 − 99) ÷ 100 = 4 min of slow running; the short stops the rest, 3.5 */
  const said = await words('.ie-says p.ie-say');
  const known = (await page.locator('.ie-says .ie-cap').allInnerTexts()).join(' ');
  ok(Math.abs(t.f.slowMin - 4) < 1e-9 && Math.abs(t.f.shortMin - 3.5) < 1e-9 && said === t.said.text && /· 4 min of slow running · 4 min of short stops\./.test(said ?? '')
    && known.includes('Running speed timed at 99 a minute over 2 timings (2 min): slow running = 400 min run × (100 − 99) ÷ 100 = 4 min; short stops the rest, 4 min.'),
    `2b told apart: "${said}"`);
  ok((await words('.ie-verdict')) === '60 min lost' && t.said.tone === 'n' && (await page.locator('.lf-row').filter({ hasText: 'Slow running' }).count()) === 1 && (await page.locator('.lf-row').filter({ hasText: 'Short stops' }).count()) === 1
    && (await page.locator('.lf-row.is-a').count()) === 0, '2b neither part over a tenth — the verdict neutral, two bars in the table where the rest was');
  await page.locator('.lf-runs li').filter({ hasText: '100' }).getByRole('button', { name: 'Strike' }).click(); await page.waitForTimeout(800);
  const struck = await truth(countId);
  const strikeOk = (await page.locator('.lf-runs li.is-struck').count()) === 1 && Math.abs(struck.f.running.perMin - 98) < 1e-9 && (struck.s.facts.timings ?? []).length === 2;
  await page.locator('.lf-runs li').filter({ hasText: '100' }).getByRole('button', { name: 'Unstrike' }).click(); await page.waitForTimeout(800);
  t = await truth(countId);
  ok(strikeOk && Math.abs(t.f.running.perMin - 99) < 1e-9, '2b a timing struck counts for nothing and keeps its place; unstruck, it counts again');
}
await go(`#/w/${sd.line7WsId}/settings`);
{
  const brk = await page.getByLabel('Shift 1 breaks, minutes').inputValue();
  const relief = await page.getByLabel('Nights: relief covers the breaks').isChecked();
  const plan = (await page.locator('.shift-plan').allInnerTexts()).join(' | ');
  ok(brk === '30' && relief && /480 min shift − 30 min of breaks = 450 planned/.test(plan) && /480 min shift, relief covers the breaks = 480 planned/.test(plan),
    `2c the line's settings: each shift's breaks and relief — "${plan}"`);
}
await go(`#/losses/${countId}`);

/* ---- 3 · Make it better from a bar ---- */
const actionsBefore = await page.evaluate(async pid => (await (await import('/src/db.ts')).listPaceTodos(pid)).map(x => x.id), sd.pacedProjectId);
await page.locator('.lf-row').filter({ hasText: 'Breakdown' }).first().click(); await page.waitForTimeout(500);
{
  const sheet = await words('[role="dialog"]');
  ok(/20 min/.test(sheet ?? '') && /Bagger/.test(sheet ?? '') && /Machine/.test(sheet ?? ''), `3 the bar opened: its minutes, where, its bone, its stops — "${(sheet ?? '').slice(0, 120)}"`);
}
await page.getByRole('button', { name: 'Make it better — a countermeasure' }).click(); await page.waitForTimeout(2200);
const actionId = await page.evaluate(async ([pid, was]) => (await (await import('/src/db.ts')).listPaceTodos(pid)).find(x => !was.includes(x.id))?.id, [sd.pacedProjectId, actionsBefore]);
{
  const want = await page.evaluate(async id => {
    const db = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
    const s = await db.getStudy(id);
    const ctx = { observations: await db.listObservations(s.workspaceId), workspaces: [await db.getWorkspace(s.workspaceId)] };
    return { words: L.betterWords(s, 'cause:Breakdown', ctx), expect: L.betterExpect(s, 'cause:Breakdown', ctx), uses: s.uses };
  }, countId);
  const row = await page.evaluate(async ([pid, id]) => (await (await import('/src/db.ts')).listPaceTodos(pid)).find(x => x.id === id), [sd.pacedProjectId, actionId]);
  ok(!!row && row.what === want.words && row.expect === want.expect && row.pillar === 'machine' && row.where === 'Bagger' && /\/board/.test(page.url())
    && want.uses.some(u => u.kind === 'action' && u.ref === actionId && u.role === 'evidence' && u.step === 'cause:Breakdown'),
    `3 a countermeasure on the board in the bar's own figures, on Machine: "${row?.what}" — should change: "${row?.expect}"`);
  await page.locator('.sl').first().waitFor({ timeout: 10000 }).catch(() => {});
  t = await truth(countId);
  ok(((await words('.sl')) ?? '').includes(t.line), '3 it opens on the board, the count its how we know');
}
await go(`#/losses/${countId}`);
ok(((await words('.lf-row:has-text("Breakdown")')) ?? '').includes('Being made better'), '3 the bar wears the branch: "Being made better"');

/* ---- 4 · Prove it — the next shift counted ---- */
await go(`${P}/board?a=${encodeURIComponent(actionId)}`);
await page.getByRole('button', { name: 'Prove it — count the next shift' }).click(); await page.waitForTimeout(2000);
const proofId = decodeURIComponent(page.url().split('/losses/')[1] ?? '').split(/[?&]/)[0];
let tp = await truth(proofId);
{
  const c0 = t.s.facts.losses, c1 = tp?.s.facts.losses;
  ok(!!proofId && proofId !== countId && c1?.shift === 'Shift 2' && c1.made === undefined && (c1.from - c0.from) % DAY === 0 && c1.from > c0.from && c1.to <= Date.now() + 15 * 60_000
    && tp.s.uses.some(u => u.kind === 'action' && u.ref === actionId && u.role === 'proof'),
    `4 Prove it: the next Shift 2 that has run, not counted yet, proving the countermeasure (${new Date(c1?.from ?? 0).toLocaleString('en-GB')})`);
  /* the stops the floor timed in it, as Capture would log them */
  await page.evaluate(async ([ws, from]) => {
    const { addObservation } = await import('/src/db.ts');
    const mk = (h, mins, category, subcategory) => ({ id: crypto.randomUUID(), workspaceId: ws, category, subcategory, asset: 'Bagger', shift: 'Shift 2', startedAt: from + h * 3_600_000,
      endedAt: from + h * 3_600_000 + mins * 60_000, durationMs: mins * 60_000, timing: 'stopwatch', count: 1, media: [], createdAt: Date.now(), updatedAt: Date.now() });
    await addObservation(mk(1, 6, 'Breakdown', 'Mechanical'));
    await addObservation(mk(3, 15, 'Changeover', 'Size / format change'));
  }, [sd.line7WsId, c1.from]);
  await page.waitForTimeout(800);
  await page.getByLabel('Packs made').fill('42000');
  await page.getByLabel('Rejects').fill('0');
  await page.getByRole('button', { name: 'Save the count' }).click(); await page.waitForTimeout(1200);
  tp = await truth(proofId);
  ok(tp?.s.facts.losses?.made === 42_000 && (await words('.ie-says p.ie-say')) === tp.said.text, `4 counted: "${tp?.said.text}"`);
}

/* ---- 5 · before → after on the countermeasure ---- */
const ba = await page.evaluate(async ([pid, aid]) => {
  const db = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
  const studies = await db.listStudies(pid);
  const ws = [...new Set(studies.filter(s => s.tool === 'losses').map(s => s.workspaceId))];
  const ctx = { observations: (await Promise.all(ws.map(id => db.listObservations(id)))).flat(), workspaces: await Promise.all(ws.map(id => db.getWorkspace(id))) };
  return L.beforeAfter(studies, aid, 'action', ctx)?.text;
}, [sd.pacedProjectId, actionId]);
await go(`${P}/board?a=${encodeURIComponent(actionId)}`);
await page.locator('.sl-ba').first().waitFor({ timeout: 10000 }).catch(() => {});
ok(!!ba && /^Breakdown on the Bagger: 20 min → 6 min; Lost 60 min → 30 min a shift; slow running and short stops 8 min → 9 min\./.test(ba) && (await words('.sl-ba')) === `Before → after: ${ba}`,
  `5 before → after: "${await words('.sl-ba')}"`);

/* ---- 6 · where it shows ---- */
await page.setViewportSize({ width: 1360, height: 900 });
{
  const card = await page.evaluate(async ([ws]) => {
    const db = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
    const studies = await db.listStudiesForLine(ws);
    const cur = L.currentLosses(studies, ws);
    return { id: cur?.id, line: L.lossCardLine(cur, { observations: await db.listObservations(ws), workspaces: [await db.getWorkspace(ws)] }) };
  }, [sd.line7WsId]);
  await go(`#/w/${sd.line7WsId}/analyse`);
  ok(card.id === proofId && ((await words('.sll-t')) ?? '') === card.line.text, `6 the line's board beside the Pareto: "${await words('.sll-t')}"`);
  await go(`${P}?view=lines`);
  ok(((await words('.lc-shift .lc-bal-t')) ?? '').toLowerCase() === card.line.text.toLowerCase(), `6 the line's card: "${await words('.lc-shift .lc-bal-t')}"`);
  await go('#/');
  await page.locator('.jb-row').filter({ hasText: 'Line 7 pace' }).locator('.jb-lab').first().click(); await page.waitForTimeout(1200);
  ok(((await words('.jb-loss-t')) ?? '') === card.line.text, `6 the control room: under Line 7's gap — "${await words('.jb-loss-t')}"`);
  /* the fishbone: the latest count's biggest explained bars, each on its bone */
  const want = await page.evaluate(async ([pid, cid]) => {
    const { loadProblems } = await import('/src/lib/useProblems.ts'); const F = await import('/src/lib/fishbone.ts');
    const loaded = await loadProblems(pid); const c = loaded.cases.find(x => x.id === cid);
    return F.suggestionsFor(c, loaded.data, Date.now()).filter(s => s.source.kind === 'study' && s.source.tool === 'losses').map(s => ({ text: s.text, m: s.m, ref: s.source.ref }));
  }, [sd.pacedProjectId, sd.oldCaseId]).catch(e => String(e));
  await go(`${P}/fishbone?problem=${sd.oldCaseId}`);
  const offered = Array.isArray(want) ? await Promise.all(want.map(async w => (await page.locator('button.is-sugg', { hasText: w.text }).count()) > 0)) : [];
  ok(Array.isArray(want) && want.length >= 1 && want.every(w => w.ref.startsWith(`${proofId}#`)) && offered.every(Boolean), `6 the fishbone offers the count's bars: ${Array.isArray(want) ? want.map(w => `${w.text} (${w.m})`).join('; ') : want}`);
  if (Array.isArray(want) && want[0]) {
    await page.locator('button.is-sugg', { hasText: want[0].text }).first().click(); await page.waitForTimeout(600);
    const sheet = (await page.locator('[role="dialog"]').last().textContent()) ?? '';
    await page.getByRole('button', { name: 'Add to the fishbone' }).last().click(); await page.waitForTimeout(1000);
    const c = await page.evaluate(async ([cid, txt]) => ((await (await import('/src/db.ts')).getCase(cid))?.causes ?? []).find(x => x.text === txt), [sd.oldCaseId, want[0].text]);
    ok(/The loss count: /.test(sheet) && c?.source?.tool === 'losses' && c.m === want[0].m, `6 accepted: on ${c?.m}, "The loss count" where it came from`);
  }
}

/* ---- 7 · paper ---- */
{
  /* the 6M report — the count's table in Evidence, the countermeasure's before → after */
  await go(`#/pace-report?project=${sd.pacedProjectId}`);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
  const pdf = join(OUT, 'sixm.pdf'); await dl.saveAs(pdf);
  const txt = san(pdfText(pdf));
  const has = s => txt.includes(san(s).slice(0, 60));
  t = await truth(countId);
  ok(has('Evidence') && has(`Loss count - ${t.s.name}`) && has(t.rows.head) && /480 min shift − 30 min of breaks\) at 100 a minute, the plate speed of the Bagger/.test(t.rows.head)
    && t.rows.rows.every(r => has(r.cause)) && has('CAUSE') && has('MINUTES') && has('LABOUR') && has('CONTRIBUTION') && has(t.rows.total.labour) && has(t.rows.total.contribution)
    && t.rows.rows.some(r => r.cause.startsWith('Slow running — timed at 99 a minute')),
    `7 the 6M report: the count in Evidence, its table, two columns of pounds — "${t.rows.head}", ${t.rows.rows.map(r => `${r.cause.slice(0, 40)} ${r.labour}/${r.contribution}`).join(' · ')}`);
  ok(has(`Before to after: ${ba}`.slice(0, 60)), '7 the 6M report: the countermeasure\'s before → after');
  await page.getByRole('button', { name: 'Close' }).last().click().catch(() => {});
}
{
  /* the stage-gate client report — the seeded count's table in Evidence */
  const ts = await truth(sd.lossStageId);
  await go(`#/project/${sd.projectId}/report`);
  await page.getByRole('button', { name: 'Full report', exact: true }).first().click(); await page.waitForTimeout(800);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
  const pdf = join(OUT, 'client.pdf'); await dl.saveAs(pdf);
  await page.getByRole('button', { name: 'Close' }).last().click().catch(() => {});
  const txt = san(pdfText(pdf));
  const has = s => txt.includes(san(s).slice(0, 60));
  ok(!!ts?.rows && has('Evidence') && has(`Loss count - ${ts.s.name}`) && has(ts.line.slice(0, 50)) && has(ts.rows.head) && ts.rows.rows.every(r => has(r.cause)) && has(ts.rows.total.minutes),
    `7 the stage-gate client report: the count's sentence and table — "${ts?.rows?.head}"`);
}

/* ---- 8 · a line a person paces — "plate speed ... unless human" ----
   Line 9 hand-packs: the Bagger's plate says 100 bags a minute, Op 3 packs a
   case of 10 every 6.25 s on the time study's standard time — 96 bags a
   minute, slower than every machine. A new count from Tools takes Op 3's
   standard time as its rate, and says so; on a guess it is typed, and why. */
{
  const hp = await page.evaluate(async () => {
    const db = await import('/src/db.ts');
    const ws = await db.createWorkspace('Line 9 — hand pack');
    await db.updateWorkspace({ ...ws, shifts: [{ name: 'Days', start: '06:00', end: '14:00', breakMin: 30 }] });
    const t = Date.now(), id = crypto.randomUUID();
    const std = { id, projectId: '', workspaceId: ws.id, product: 'Hand-packed 5kg', marks: [], sort: 0, createdAt: t, updatedAt: t,
      capacity: { stations: [
        { id: 'b', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 100, ratePer: 'min', source: 'plate' },
        { id: 'o3', name: 'Op 3', kind: 'people', unit: 'cases', contains: 10, cycleSec: 6.25, perCycle: 1, source: 'standard' },
      ] } };
    await db.putStandard(std);
    return { wsId: ws.id, std };
  });
  const start = async () => {
    await go('#/losses');
    await page.getByRole('button', { name: 'New loss count' }).first().click(); await page.waitForTimeout(500);
    await page.getByLabel('Which line').selectOption(hp.wsId); await page.waitForTimeout(500);
    await page.locator('.lt-new input.text-input').last().fill('Hand-packed 5kg');
    await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1800);
    return decodeURIComponent(page.url().split('/losses/')[1] ?? '').split(/[?&]/)[0];
  };
  const id1 = await start();
  const t1 = await truth(id1);
  const c1 = t1?.s.facts.losses;
  ok(c1?.ratePerMin === 96 && c1.rateFrom === 'standard-time' && c1.ratePerson === 'Op 3' && !c1.rateMachine && (await words('.lf-rate-why')) === 'standard time of Op 3 (the time study)',
    `8 a person slower than every machine sets the pace: ${c1?.ratePerMin} a minute — "${await words('.lf-rate-why')}"`);
  await page.evaluate(async std => (await import('/src/db.ts')).putStandard({ ...std, capacity: { stations: std.capacity.stations.map(x => (x.id === 'o3' ? { ...x, source: 'estimate' } : x)) }, updatedAt: Date.now() }), hp.std);
  const id2 = await start();
  const c2 = (await truth(id2))?.s.facts.losses;
  ok(c2?.ratePerMin === undefined && (await words('.lf-rate-why')) === 'typed — Op 3 sets the pace and their speed is a guess — time them in the time study',
    `8 Op 3 on a guess: no rate offered — "${await words('.lf-rate-why')}"`);
}

/* ---- a client reads a count and changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/losses/${countId}`);
await page.locator('.ie-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const doors = await page.locator('.lf').getByRole('button', { name: /Save the count|Make it better|Close —|Use it for|Rename|Count a shift/ }).allInnerTexts();
  const readOnly = await page.locator('.lf-count.is-ro .lf-facts').count();
  await page.locator('.lf-row').first().click().catch(() => {}); await page.waitForTimeout(400);
  const inSheet = await page.getByRole('button', { name: /Make it better/ }).count();
  ok(readOnly === 1 && doors.length === 0 && inSheet === 0, `a client reads the count and changes nothing${doors.length || inSheet ? ` — found: ${doors.join(', ')} and ${inSheet} in the bar's sheet` : ''}`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nE accepted: a shift\'s losses hold, inside a change');
process.exit(failed ? 1 : 0);
