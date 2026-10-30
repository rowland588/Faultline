/* ACCEPTANCE — B: THE VALUE STREAM MAP, A LINE'S, INSIDE A CHANGE
 * (docs/BUILD.md, B1–B4; docs/TOOLKIT.md, tool 2).
 *
 * Rowland, 11 October: "see the VSM like a grid — a swimlane grid. We can see
 * a journey of what, who and the value"; "we need it to be multi
 * dimensional"; "remove business-wide mapping ... but keep the line large,
 * different departments can affect the line". The story, driven in a real
 * browser on the seeded job (Line 2 commissioning, Line 7's map on it) with
 * the real controls:
 *
 *   1  a new map always picks its line — no door-to-door kind
 *   2  the line's map reads as the module says: the sentence, the lanes by
 *      who (operators and departments), a step done by two in both lanes,
 *      and by where, one tap
 *   3  Walk it — Start, Next step, Last step: the steps land in the grid,
 *      timed, who and where as said
 *   4  Make it better from a waste step — a fix in the step's own figures,
 *      the map its evidence naming the step, the step wearing the branch
 *   5  Prove it — the line walked again: the same steps, carried; Walk it
 *      again times the one up next; the fixed step typed shorter
 *   6  before → after on the fix — the step first, then the lead time, what
 *      is still carried said
 *   7  the client report's PDF, read back: the fix's before → after, and the
 *      Evidence appendix with the stream as a table
 *   8  on a 6M job, the fishbone offers the line map's wait and waste, each
 *      on its bone; accepted, the cause says where it came from
 *   and a client reads the map and changes nothing;
 *   10 classifying the steps (30 October): the stopwatch's VA · NE · NV beside the clock, a letter ending the
 *      step and starting the next, Undo the last step, the phone; the step's panel — one tap sets a value, the
 *      same tap clears it, Undo, a wait showing NV with no control, V · E · N and ← →; the nudge, the card, the
 *      closing line; the walk ending on the module's figures; the paper saying "not classified"; the page's
 *      controls at least halved and every one found in its new place (More ▾).
 *
 * Every sentence is checked against the module that makes it (lib/ie/steps,
 * lib/studyLinks, lib/fishbone) on the same records. Fails on any console
 * error.
 *
 *   node scripts/acceptance/value-stream.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { paper as pressPaper, more } from '../lib/pageHeader.mjs';
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2000); };
const words = async (sel, root = page) => ((await root.locator(sel).count()) ? (await root.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : null);
const text = async sel => (await page.locator(sel).first().textContent() ?? '').replace(/\s+/g, ' ').trim();
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const lanes = async () => (await page.locator('.vs-lane').allTextContents()).map(x => x.trim());
const square = name => page.locator(`.vs-step[aria-label*="${name}"]`);

/* What the modules say of a map as it stands. */
const truth = id => page.evaluate(async id => {
  const { getStudy } = await import('/src/db.ts');
  const S = await import('/src/tools/valuestream/steps.ts');
  const s = await getStudy(id);
  if (!s) return null;
  const a = s.agreed?.map;
  const f = S.flowFigures(s.facts.flow, a);
  return { id: s.id, uses: s.uses, flow: s.facts.flow ?? [], unmarked: f.unmarked, counts: S.classCounts(s.facts.flow), summary: S.classifySummary(s.facts.flow, a).text, ordered: S.walkOrder(s.facts.flow).map(x => x.id), said: S.flowSays(f, a), who: S.lanesOf(s.facts.flow ?? [], 'who', a), where: S.lanesOf(s.facts.flow ?? [], 'where', a) };
}, id);

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const MAP = `#/value-stream/${sd.lineMapId}`;
const J = `#/project/${sd.projectId}`;

/* ---- 1 · a new map always picks its line ---- */
await go('#/value-stream');
await page.getByRole('button', { name: 'New value stream map' }).first().click(); await page.waitForTimeout(500);
{
  const sheet = (await page.locator('.lt-new').textContent()) ?? '';
  await page.locator('.lt-new input').first().fill('A test stream');
  ok(!/What does it map/.test(sheet) && /Which line\?/.test(sheet) && await page.getByRole('button', { name: 'Start it' }).isDisabled(),
    '1 a new map: which line, never "what does it map" — Start it waits for the line');
  await page.keyboard.press('Escape');
  /* A closed sheet takes its own history entry off a moment later (ui/backCloses);
     the app's own links wait for it, a goto does not — under load the late
     back() landed after the goto below and put the page back on the list. */
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);
}

/* ---- 2 · the line's map reads as the module says ---- */
await go(MAP);
let t = await truth(sd.lineMapId);
{
  const said = (await page.locator('.ie-says p.ie-say').first().textContent())?.trim();
  ok(said === t.said.text, `2 the sentence: "${said}"`);
  ok(JSON.stringify(await lanes()) === JSON.stringify(t.who) && (await text('.vs-areas-h')) === 'Who does it' && t.who.includes('Planning') && t.who.includes('Op 1'),
    `2 lanes by who — operators and departments: ${(await lanes()).join(', ')}`);
  ok(await square('Clear a jam').count() === 2, '2 a step done by two (Op 1, the team leader) sits in both their lanes');
  await page.getByRole('tab', { name: 'Where' }).click(); await page.waitForTimeout(300);
  ok(JSON.stringify(await lanes()) === JSON.stringify(t.where) && (await text('.vs-areas-h')) === 'Where', `2 by where, one tap: ${(await lanes()).join(', ')}`);
  await page.getByRole('tab', { name: 'Who does it' }).click(); await page.waitForTimeout(300);
}

/* ---- 3 · Walk it ---- */
{
  const n0 = t.flow.length;
  await page.getByRole('button', { name: 'Time the steps', exact: true }).click(); await page.waitForTimeout(300);
  const walk = page.locator('.vs-walk');
  await walk.getByLabel('This step — what happens').fill('Wrap the pallet');
  await walk.getByLabel('Who does it').fill('Op 3'); await walk.getByLabel('Where').fill('Wrapper');
  await page.getByRole('button', { name: /^Start/ }).click(); await page.waitForTimeout(1200);
  await page.getByRole('button', { name: /^Next step/ }).click(); await page.waitForTimeout(500);
  await walk.getByLabel('This step — what happens').fill('Label the pallet');
  await walk.getByLabel('Who does it').fill('Despatch');
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /^Last step/ }).click(); await page.waitForTimeout(1000);
  t = await truth(sd.lineMapId);
  const wrap = t.flow.find(x => x.name === 'Wrap the pallet'), label = t.flow.find(x => x.name === 'Label the pallet');
  ok(t.flow.length === n0 + 2 && wrap?.source === 'timed' && wrap.cycleSec >= 0.8 && wrap.cycleSec < 4 && JSON.stringify(wrap.who) === '["Op 3"]' && wrap.where === 'Wrapper'
    && label?.source === 'timed' && JSON.stringify(label.who) === '["Despatch"]',
    `3 walked: two steps, timed — ${wrap?.cycleSec} s by Op 3 at the Wrapper, then Despatch's`);
  ok(await square('Label the pallet').count() === 1 && (await page.locator('.ie-says p.ie-say').first().textContent())?.trim() === t.said.text, '3 they land in the grid and the sentence re-reads');
}

/* ---- 4 · Make it better from a waste step ---- */
const fetchId = t.flow.find(x => x.name === 'Walk to fetch flat cases')?.id;
await square('Walk to fetch flat cases').click(); await page.waitForTimeout(400);
await page.getByRole('button', { name: 'Make it better — raise a fix' }).click(); await page.waitForTimeout(1500);
const fixId = decodeURIComponent(new URL(page.url()).hash.split('open=')[1] ?? '');
{
  const want = await page.evaluate(async ([id, step]) => (await import('/src/lib/studyLinks.ts')).betterWords(await (await import('/src/db.ts')).getStudy(id), step), [sd.lineMapId, fetchId]);
  const title = await page.evaluate(async ([pid, fid]) => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.id === fid)?.title, [sd.projectId, fixId]);
  t = await truth(sd.lineMapId);
  ok(!!fixId && title === want && t.uses.some(u => u.kind === 'fix' && u.ref === fixId && u.role === 'evidence' && u.step === fetchId), `4 a fix in the step's own figures: "${title}"`);
  await go(MAP);
  ok(/has-fix/.test(await square('Walk to fetch flat cases').getAttribute('class') ?? ''), '4 the step wears the branch on the grid');
}

/* ---- 5 · Prove it — the line walked again ---- */
await go(`${J}/fixes?open=${encodeURIComponent(fixId)}`);
await page.getByRole('button', { name: 'Prove it — walk the line again' }).click(); await page.waitForTimeout(1800);
const proofId = decodeURIComponent(new URL(page.url()).hash.split('value-stream/')[1] ?? '').split(/[?&]/)[0];
let tp = await truth(proofId);
ok(!!proofId && proofId !== sd.lineMapId && tp.flow.length === t.flow.length && tp.flow.every(x => x.source === 'carried') && tp.uses[0]?.role === 'proof',
  `5 a second map on the line, the same ${tp.flow.length} steps, each carried`);
{
  await page.getByRole('button', { name: 'Time the steps again' }).click(); await page.waitForTimeout(300);
  const first = [...tp.flow].sort((a, b) => a.order - b.order).find(x => x.kind !== 'wait' && x.kind !== 'store');
  ok(((await words('.vs-walk .wb-t-h')) ?? '').includes(`up next: ${first.name}`), `5 Walk it again: up next "${first.name}"`);
  await page.getByRole('button', { name: /^Start/ }).click(); await page.waitForTimeout(1100);
  await page.getByRole('button', { name: /^Stop/ }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Time the steps again' }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Start/ }).click(); await page.waitForTimeout(1100);
  await page.getByRole('button', { name: /^Next step/ }).click(); await page.waitForTimeout(900);
  await page.getByRole('button', { name: /^Stop/ }).click(); await page.waitForTimeout(500);
  tp = await truth(proofId);
  const walked = tp.flow.find(x => x.id === first.id);
  ok(walked?.source === 'timed' && tp.flow.length === t.flow.length, `5 the step up next timed (${walked?.cycleSec} s) — nothing added`);
  /* the fixed step, typed shorter in its sheet */
  await square('Walk to fetch flat cases').click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Change this step' }).click(); await page.waitForTimeout(300);
  await page.getByLabel('How long the work takes').fill('20 s');
  await page.getByRole('button', { name: /^Save/ }).click(); await page.waitForTimeout(700);
  tp = await truth(proofId);
  const f2 = tp.flow.find(x => x.id === fetchId);
  ok(f2?.source === 'typed' && f2.cycleSec === 20, `5 the fixed step typed shorter: ${f2?.cycleSec} s, typed`);
}

/* ---- 6 · before → after on the fix ---- */
const ba = await page.evaluate(async ([pid, fid]) => (await import('/src/lib/studyLinks.ts')).beforeAfter(await (await import('/src/db.ts')).listStudies(pid), fid)?.text, [sd.projectId, fixId]);
await go(`${J}/fixes?open=${encodeURIComponent(fixId)}`);
await page.locator('.sl-ba').first().waitFor({ timeout: 10000 }).catch(() => {});
ok(!!ba && /^Walk to fetch flat cases: work 1 min → 20\.0 s\. Lead time /.test(ba) && /carried from before, not walked again yet\.$/.test(ba) && (await words('.sl-ba')) === `Before → after: ${ba}`,
  `6 before → after: "${await words('.sl-ba')}"`);

/* ---- 7 · the client report's PDF ---- */
await go(`${J}/report`);
await page.getByRole('button', { name: 'Full report', exact: true }).first().click(); await page.waitForTimeout(800);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Download', exact: true }).first().click()]);
const pdf = join(OUT, 'client.pdf'); await dl.saveAs(pdf);
/* the PDF's ready bar closed, as a person would before moving on */
await page.getByRole('button', { name: 'Close' }).last().click().catch(() => {}); await page.waitForTimeout(300);
const txt = pdfText(pdf);
const san = s => s.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/\s+/g, ' ');
const has = s => san(txt).includes(san(s).slice(0, 60));
ok(has(`Before to after: ${ba}`.slice(0, 60)), '7 the client report: the fix carries its before → after');
ok(has('Evidence') && has('Value stream map - Run released to pallet away') && has('WHAT IS DONE') && has('Walk to fetch flat cases') && has('Wrap the pallet')
  && has(`Being made better: ${await page.evaluate(async ([pid, fid]) => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.id === fid)?.title, [sd.projectId, fixId])}`.slice(0, 40)),
  '7 the client report: the map in Evidence, the stream as a table, the step a fix came from naming it');

{
  /* the map's steps nobody has classified: said on the client report's table, as on the page (the two walked steps) */
  const n = t.unmarked;
  ok(n >= 2 && has(`${n} steps not classified yet`) && /not classified/.test(txt), `7 the client report: the table says "not classified" and counts them — ${n} steps`);
}

/* ---- 8 · on a 6M job, the fishbone offers the line map ---- */
{
  const want = await page.evaluate(async ([pid, cid]) => {
    const { loadProblems } = await import('/src/lib/useProblems.ts'); const F = await import('/src/lib/fishbone.ts');
    const loaded = await loadProblems(pid); const c = loaded.cases.find(x => x.id === cid);
    return F.suggestionsFor(c, loaded.data, Date.now()).filter(s => s.source.kind === 'study' && s.source.tool === 'map').map(s => ({ text: s.text, m: s.m }));
  }, [sd.pacedProjectId, sd.oldCaseId]).catch(e => String(e));
  await go(`#/project/${sd.pacedProjectId}/fishbone?problem=${sd.oldCaseId}`);
  const offered = Array.isArray(want) ? await Promise.all(want.map(async w => (await page.locator('button.is-sugg', { hasText: w.text }).count()) > 0)) : [];
  ok(Array.isArray(want) && want.length >= 2 && offered.every(Boolean), `8 the fishbone offers the map: ${Array.isArray(want) ? want.map(w => `${w.text} (${w.m})`).join('; ') : want}`);
  if (Array.isArray(want) && want[1]) {
    await page.locator('button.is-sugg', { hasText: want[1].text }).first().click(); await page.waitForTimeout(600);
    const sheet = (await page.locator('[role="dialog"]').last().textContent()) ?? '';
    await page.getByRole('button', { name: 'Add to the fishbone' }).last().click(); await page.waitForTimeout(1000);
    const c = await page.evaluate(async ([cid, txt]) => ((await (await import('/src/db.ts')).getCase(cid))?.causes ?? []).find(x => x.text === txt), [sd.oldCaseId, want[1].text]);
    ok(/The value stream map: /.test(sheet) && c?.source?.tool === 'map' && c.m === want[1].m, `8 accepted: on ${c?.m}, "The value stream map" where it came from`);
  }
}

/* ---- a client reads the map and changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(MAP);
await page.locator('.vs-grid, .vs-sq').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const doors = await page.locator('.vs-page').getByRole('button', { name: /^\+ Add a step|^Time the steps|^Classify the steps|Change what it is held|Name the ends/ }).allInnerTexts();
  await square('Walk to fetch flat cases').first().click().catch(() => {}); await page.waitForTimeout(300);
  const inSheet = await page.getByRole('button', { name: /Change this step|Make it better/ }).count();
  const letters = await page.getByRole('radio', { name: /^(VA|NE|NV) —/ }).count();
  ok((await page.locator('.vs-sq').count()) > 0 && doors.length === 0 && inSheet === 0 && letters === 0, `a client reads the map and changes nothing — no VA · NE · NV buttons either${doors.length || inSheet || letters ? ` — found: ${doors.join(', ')}, ${inSheet} in the step's sheet, ${letters} letters` : ''}`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ---- 9 · in money (knowledge/specs/FC-001-value-stream-money.md — Rowland, 24 October: "industry standard ...
   flexible, not all costs are available"): the waste work's labour a day at the line's rate, the product waiting
   tied up and carried at the cost a piece and rate typed on the map; a missing input named, never a figure invented */
{
  await go(MAP);
  const moneyTruth = () => page.evaluate(async id => {
    const { getStudy, getWorkspace } = await import('/src/db.ts'); const S = await import('/src/tools/valuestream/steps.ts'); const L = await import('/src/tools/valuestream/flowLean.ts');
    const s = await getStudy(id); const w = s.workspaceId ? await getWorkspace(s.workspaceId) : undefined;
    const m = S.flowMoney(s.facts.flow, s.agreed?.map, w ? { labourRatePerHour: w.labourRatePerHour, labourBurden: w.labourBurden } : undefined);
    return { m, said: S.flowMoneySays(m, s.agreed?.map), tiles: L.flowMoneyTiles(m, s.agreed?.map) };
  }, sd.lineMapId);
  let mt = await moneyTruth();
  const cards = () => page.locator('.vs-cards .vs-card2.is-money');
  ok((await cards().count()) === 2, '9 two money cards among the method’s cards');
  const cardText = async i => (await cards().nth(i).innerText()).replace(/\s+/g, ' ').trim().toLowerCase();
  const sameCards = async () => (await cardText(0)) === `${mt.tiles[0].k} ${mt.tiles[0].v} ${mt.tiles[0].of}`.toLowerCase() && (await cardText(1)) === `${mt.tiles[1].k} ${mt.tiles[1].v} ${mt.tiles[1].of}`.toLowerCase();
  /* the seeded map's line has no wage yet: the labour unsaid and the wage named; the waiting product priced from the map's own inputs */
  ok(await sameCards() && mt.m.waste.gbpPerDay === undefined && /give the line’s wage on its page/.test(await cardText(0)) && mt.m.tiedUp > 0 && mt.m.carryPerDay > 0,
    `9 no wage on the line: the cards as the module says them — "${await cardText(0)}" · "${await cardText(1)}"`);
  ok((await words('.ie-money')) === mt.said.text && /^Waste work: 4 non-value-adding steps — give the line’s wage on its page to say the labour\. £[\d.]+k of product is waiting between steps — £[\d.]+k of it at Release the run to the line \(at £0\.80 a piece\), which costs about £\d+ a day to carry at 25% a year\.$/.test(mt.said.text),
    `9 the sentence names the wage as missing: "${await words('.ie-money')}"`);
  /* the line given its wage on its page (here through the record, as the line's Set up does): £14.50 × 1.3 on-costs */
  await page.evaluate(async id => { const db = await import('/src/db.ts'); const s = await db.getStudy(id); const w = await db.getWorkspace(s.workspaceId); await db.updateWorkspace({ ...w, labourRatePerHour: 14.5, labourBurden: 1.3 }); }, sd.lineMapId);
  await go(MAP);
  mt = await moneyTruth();
  ok(await sameCards() && mt.m.waste.gbpPerDay > 0 && /^Waste work costs £\d+ a day in labour \(4 non-value-adding steps — [\d.]+ h a day at £18\.85 an hour\)\. £[\d.]+k of product is waiting between steps — £[\d.]+k of it at Release the run to the line \(at £0\.80 a piece\), which costs about £\d+ a day to carry at 25% a year\.$/.test(mt.said.text)
    && (await words('.ie-money')) === mt.said.text, `9 with the wage: the sentence with its because at £18.85 an hour — page "${await words('.ie-money')}" · module ${JSON.stringify({ rate: mt.m.ratePerHour, gbp: mt.m.waste.gbpPerDay, text: mt.said.text })}`);
  /* no rate: tied up still said, the rate named as missing */
  await more(page, 'Change what it is held against'); await page.waitForTimeout(300);
  ok((await page.getByLabel(/Carrying rate, a year/).inputValue()) === '25' && (await page.getByLabel(/What a piece has cost/).inputValue()) === '0.8', '9 the two boxes carry what was agreed');
  await page.getByLabel(/Carrying rate, a year/).fill('');
  await page.getByRole('button', { name: 'Agree it' }).click(); await page.waitForTimeout(600);
  mt = await moneyTruth();
  ok(mt.m.carryPerDay === undefined && /give the carrying rate a year to say what carrying it costs/.test(await cardText(1)) && (await words('.ie-money')) === mt.said.text && /; give the carrying rate a year/.test(mt.said.text),
    `9 no rate: tied up said, the rate named — card "${await cardText(1)}" · page "${await words('.ie-money')}" · module ${JSON.stringify({ carry: mt.m.carryPerDay, text: mt.said.text })}`);
  await more(page, 'Change what it is held against'); await page.waitForTimeout(300);
  await page.getByLabel(/Carrying rate, a year/).fill('150');
  ok((await words('.ie-problem')) === 'The carrying rate — a percentage a year, up to 100.', '9 a rate over 100 refused');
  await page.getByLabel(/Carrying rate, a year/).fill('25');
  await page.getByRole('button', { name: 'Agree it' }).click(); await page.waitForTimeout(600);
  /* the map's own paper: the tiles, the sentence, the inputs */
  const [dl9] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f9 = join(OUT, 'map-money.pdf'); await dl9.saveAs(f9);
  const t9 = pdfText(f9);
  mt = await moneyTruth();
  ok(/WASTE WORK/i.test(t9) && /WAITING PRODUCT/i.test(t9) && t9.includes(mt.said.text.slice(0, 50)) && t9.includes('In money from: £18.85 an hour (the line) · £0.80 a piece · 25% a year, 365 days.'),
    `9 on paper: the two tiles, the sentence and the inputs`);
}


/* ---- 10 · classifying the steps (knowledge/specs/FC-001-value-stream-money.md, part 2 — Rowland, 30 October: "it doesn't
   allow me to quickly reference the activity as VNA, VA, etc"; "I had a stop watch but no ability to classify the
   activity, need 3 quick buttons next to the stop watch"; "too complex, many different buttons ... simplify") ---- */
const flowNow = async () => (await truth(sd.lineMapId)).flow;
const byName = (flow, name) => flow.find(x => x.name === name);
const ask = (fn, ...a) => page.evaluate(async ([f, args]) => { const S = await import('/src/tools/valuestream/steps.ts'); return S[f](...args); }, [fn, a]);
{
  /* 10a · the stopwatch's three letters: a letter ends the step being timed with its value and starts the next */
  await go(MAP);
  await page.getByRole('button', { name: 'Time the steps', exact: true }).click(); await page.waitForTimeout(500);
  const walk = page.locator('.vs-walk');
  const letters = walk.locator('.vs-seg-b');
  ok((await letters.count()) === 3 && (await letters.allInnerTexts()).map(x => x.split('\n')[0]).join(' ') === 'VA NE NV' && await letters.first().isDisabled(),
    '10a the stopwatch: VA · NE · NV beside the clock, waiting for Start');
  await walk.getByLabel('Who does it').fill('Op 3'); await walk.getByLabel('Where').fill('Labeller');
  await walk.getByLabel('This step — what happens').fill('Sticker the case');
  await page.getByRole('button', { name: /^Start/ }).click(); await page.waitForTimeout(1200);
  await walk.getByRole('button', { name: 'VA — done, next' }).click(); await page.waitForTimeout(700);
  await walk.getByLabel('This step — what happens').fill('Scan the label');
  await walk.getByRole('radio', { name: 'Move' }).click(); await page.waitForTimeout(200);
  const vaOnMove = await walk.getByRole('button', { name: 'VA — done, next' }).isDisabled();
  await walk.getByRole('button', { name: 'NE — done, next' }).click(); await page.waitForTimeout(700);
  await walk.getByLabel('This step — what happens').fill('Rework the label');
  await walk.getByRole('button', { name: 'NV — done, next' }).click(); await page.waitForTimeout(700);
  await walk.getByLabel('This step — what happens').fill('Not sure yet');
  await walk.getByRole('button', { name: 'Next step — not classified' }).click(); await page.waitForTimeout(700);
  let fl = await flowNow();
  const sticker = byName(fl, 'Sticker the case'), scan = byName(fl, 'Scan the label'), rework = byName(fl, 'Rework the label'), unsure = byName(fl, 'Not sure yet');
  ok(sticker?.value === 'adds' && sticker.kind === 'operation' && sticker.source === 'timed' && sticker.cycleSec >= 0.8 && JSON.stringify(sticker.who) === '["Op 3"]' && sticker.where === 'Labeller'
    && scan?.value === 'needed' && scan.kind === 'move' && rework?.value === 'waste' && rework.kind === 'operation' && unsure && unsure.value === undefined,
    `10a one tap a step: VA ${sticker?.cycleSec}s · a move NE · NV · one left unclassified — saved as the step's sheet saves them`);
  ok(vaOnMove, '10a a Move greys VA — only an operation adds value (the sheet\'s rule)');
  const cc = await ask('classCounts', fl);
  ok((await words('.vs-walk-tally')) === `${cc.adds} VA · ${cc.needed} NE · ${cc.waste} NV so far · ${cc.unclassified} not classified`, `10a the tally as the module counts it: "${await words('.vs-walk-tally')}"`);
  /* Undo the last step: its time, words and value */
  await walk.getByRole('button', { name: 'Undo the last step' }).click(); await page.waitForTimeout(500);
  fl = await flowNow();
  ok(!byName(fl, 'Not sure yet') && byName(fl, 'Rework the label')?.value === 'waste', '10a Undo the last step takes the unclassified one back');
  await walk.getByRole('button', { name: 'Undo the last step' }).click(); await page.waitForTimeout(500);
  fl = await flowNow();
  ok(!byName(fl, 'Rework the label') && byName(fl, 'Scan the label')?.value === 'needed' && (await walk.getByLabel('This step — what happens').inputValue()) === 'Rework the label',
    '10a Undo again takes the NV step and its value back, its words returned to the box');
  await page.getByRole('button', { name: /^Stop/ }).click(); await page.waitForTimeout(400);
  await go(MAP);
  fl = await flowNow();
  ok(byName(fl, 'Sticker the case')?.value === 'adds' && byName(fl, 'Scan the label')?.value === 'needed' && (await square('Sticker the case').count()) === 1, '10a reload-proof: the two kept steps keep their letters');
  /* the phone: the three letters a thumb's size, nothing off the side */
  await page.setViewportSize({ width: 375, height: 812 }); await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Time the steps', exact: true }).click(); await page.waitForTimeout(700);
  const hs = await page.locator('.vs-walk .vs-seg-b').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.height), Math.round(r.right)]; }));
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const primary = await page.locator('.ln-band-acts .btn-primary').boundingBox();
  ok(hs.length === 3 && hs.every(([h, r]) => h >= 44 && r <= 375) && wide <= 1 && primary && primary.x + primary.width <= 376, `10a the phone: the three letters ${hs.map(x => x[0]).join('/')} px tall, the primary inside the band, nothing off the side (${wide} px over)`);
  await page.getByRole('button', { name: /^Back$/ }).click(); await page.waitForTimeout(300);
  await page.setViewportSize({ width: 1360, height: 900 });

  /* 10b · the step's panel on the map: its value in three buttons; one tap sets it, the same tap clears it, Undo */
  const A = fl.find(x => x.kind === 'operation' && x.value && x.source !== 'timed'), B = fl.find(x => x.kind === 'check' || (x.kind === 'move' && x.source !== 'timed')), W = fl.find(x => x.kind === 'wait' || x.kind === 'store');
  const strip = names => page.evaluate(async ([id, ids]) => { const db = await import('/src/db.ts'); await db.patchStudy(id, cur => ({ facts: { ...cur.facts, flow: cur.facts.flow.map(x => (ids.includes(x.id) ? (({ value, ...r }) => r)(x) : x)) } })); }, [sd.lineMapId, names]);
  await strip([A.id, B.id]);
  await go(MAP);
  const chip = st => page.locator(`.vs-cls[aria-label*="${st.name}"]`);
  const dlg = () => page.locator('[role="dialog"]').last();
  await chip(A).click(); await page.waitForTimeout(500);
  let ordered = (await truth(sd.lineMapId)).ordered, idxA = ordered.indexOf(A.id);
  ok(/^Step \d+ of \d+ — \d+ still to classify$/.test((await words('.vs-cw-count')) ?? '') && (await words('.vs-cw-count')) === await ask('walkCount', (await flowNow()).sort((x, y) => x.order - y.order), idxA),
    `10b a step opened: "${await words('.vs-cw-count')}" — as the module counts it`);
  ok((await dlg().getByRole('radio').count()) === 3 && !(await dlg().getByRole('radio', { name: /^VA/ }).isDisabled()), '10b an operation: three buttons, VA allowed');
  await dlg().getByRole('radio', { name: /^VA/ }).click(); await page.waitForTimeout(600);
  ok(byName(await flowNow(), A.name)?.value === 'adds', '10b one tap on VA saves the step');
  await go(MAP);
  ok(byName(await flowNow(), A.name)?.value === 'adds' && /is-adds/.test(await chip(A).getAttribute('class')), '10b reload-proof: the grid\'s letter chip says VA');
  await chip(A).click(); await page.waitForTimeout(400);
  await dlg().getByRole('radio', { name: /^VA/ }).click(); await page.waitForTimeout(500);
  ok(byName(await flowNow(), A.name)?.value === undefined, '10b a second tap on the lit one clears it');
  await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(600);
  ok(byName(await flowNow(), A.name)?.value === 'adds', '10b Undo puts it back');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 10000 }).catch(() => {});
  /* a check or a move: VA is greyed; a key says NV; a wait or a store shows NV and no buttons */
  await chip(B).click(); await page.waitForTimeout(500);
  ok(await dlg().getByRole('radio', { name: /^VA/ }).isDisabled(), `10b a ${B.kind}: VA greyed — only an operation adds value`);
  await page.keyboard.press('n'); await page.waitForTimeout(600);
  ok(byName(await flowNow(), B.name)?.value === 'waste', '10b the N key says NV');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 10000 }).catch(() => {});
  await chip(W).click(); await page.waitForTimeout(500);
  ok((await dlg().getByRole('radio').count()) === 0 && /NV/.test((await words('.vs-cw-fixed')) ?? '') && /by definition/.test((await words('.vs-cw-fixed')) ?? ''), `10b a ${W.kind} shows NV with no control: "${await words('.vs-cw-fixed')}"`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 10000 }).catch(() => {});

  /* 10c · the walk is the panel: the nudge's link opens the first unclassified step; a letter goes on to the next */
  await strip([A.id, B.id]); await go(MAP);
  let tt = await truth(sd.lineMapId);
  const nudge = await ask('notClassifiedWords', tt.unmarked);
  ok(tt.unmarked >= 3 && (await words('.vs-nudge')) === `${nudge} Classify the steps ›`, `10c the nudge: "${await words('.vs-nudge')}"`);
  ok(((await words('.vs-cards .vs-card2.is-unmarked')) ?? '').toLowerCase() === `not classified ${tt.unmarked} steps`, `10c the totals band carries a Not classified card: "${await words('.vs-cards .vs-card2.is-unmarked')}"`);
  ok((await words('.ln-close > span:last-child')) === (await page.evaluate(async id => { const { getStudy } = await import('/src/db.ts'); const S = await import('/src/tools/valuestream/steps.ts'); const L = await import('/src/tools/valuestream/flowLean.ts'); const m = await getStudy(id); return L.flowClosing(S.flowFigures(m.facts.flow, m.agreed?.map), m.agreed?.map).text; }, sd.lineMapId)) && (await words('.ln-close > span:last-child'))?.endsWith(nudge),
    `10c the closing line ends with the same sentence: "${await words('.ln-close > span:last-child')}"`);
  await page.getByRole('button', { name: 'Classify the steps ›' }).click(); await page.waitForTimeout(500);
  const first = await ask('nextUnclassified', (await flowNow()).sort((x, y) => x.order - y.order), -1);
  ok((await words('.vs-cw-count'))?.startsWith(`Step ${first + 1} of`), `10c the link opens the first unclassified step (${await words('.vs-cw-count')})`);
  await page.getByRole('button', { name: 'Next unclassified ›' }).click(); await page.waitForTimeout(400);
  const second = await ask('nextUnclassified', (await flowNow()).sort((x, y) => x.order - y.order), first);
  ok((await words('.vs-cw-count'))?.startsWith(`Step ${second + 1} of`), '10c Next unclassified skips to the next one nobody has classified');
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(300);
  ok((await words('.vs-cw-count'))?.startsWith(`Step ${second} of`), '10c ← goes back a step'); await page.keyboard.press('ArrowRight'); await page.waitForTimeout(300);
  /* V · E · N through every step left */
  const keys = ['v', 'e', 'n', 'e', 'v', 'n', 'e', 'v'];
  let pressed = 0;
  for (; pressed < keys.length; pressed++) {
    const left = (await truth(sd.lineMapId)).unmarked;
    if (!left) break;
    const here = (await words('.vs-cw-count')) ?? '';
    const cur = (await flowNow()).sort((x, y) => x.order - y.order)[Number(/Step (\d+)/.exec(here)[1]) - 1];
    if (cur.kind === 'wait' || cur.kind === 'store') break;
    const k = cur.kind === 'operation' ? keys[pressed] : keys[pressed] === 'v' ? 'e' : keys[pressed];
    await page.keyboard.press(k); await page.waitForTimeout(600);
  }
  tt = await truth(sd.lineMapId);
  ok(tt.unmarked === 0 && (await words('.vs-cw-count'))?.endsWith('all classified'), `10c every step classified by V · E · N and the panel followed (${pressed} presses): "${await words('.vs-cw-count')}"`);
  ok((await words('.vs-cw-sum')) === tt.summary && /^\d+ steps: \d+ VA · \d+ NE · \d+ NV\./.test(tt.summary), `10c it ends on the module's figures: "${await words('.vs-cw-sum')}"`);
  ok((await page.getByRole('button', { name: 'Next unclassified ›' }).count()) === 0 && (await page.locator('.vs-nudge').count()) === 0, '10c none left: no Next unclassified, no nudge');
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 10000 }).catch(() => {});

  /* 10d · the paper says "not classified" and counts them */
  await strip([A.id, B.id]); await go(MAP);
  tt = await truth(sd.lineMapId);
  const [dl10] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
  const f10 = join(OUT, 'map-classify.pdf'); await dl10.saveAs(f10);
  const t10 = pdfText(f10);
  const w10 = await ask('notClassifiedWords', tt.unmarked);
  ok(t10.includes(w10.slice(0, 70)) && /not\s+classified/.test(t10) && /NOT CLASSIFIED/i.test(t10) && new RegExp(`${tt.unmarked} steps?`, 'i').test(t10), `10d on paper: the count above the table, "not classified" in the rows, a tile — ${tt.unmarked} steps`);
  const closing10 = t10.includes('adding value') && t10.includes(w10.slice(0, 40));
  ok(closing10, '10d on paper: the closing line says the same');

  /* 10e · the page is simpler: every capability found in its new place, the count of controls cut by half */
  await go(MAP);
  const counts = await page.evaluate(() => {
    const vis = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
    const own = [...document.querySelectorAll('.vs-page button, .vs-page a[href], .vs-page input, .vs-page [role=tab]')].filter(vis);
    return { all: own.length, chips: own.filter(e => e.classList.contains('vs-cls')).length };
  });
  const BEFORE = 70;    /* the same count on main, 30 October: 18 controls and 52 grid squares (spec, part 2) */
  ok(counts.all <= BEFORE / 2, `10e the controls in the page: ${counts.all} (${counts.chips} of them the steps' letter chips) against ${BEFORE} before — at least halved`);
  ok((await page.locator('.vs-page .vs-bar button, .vs-page .vs-bar [role=tab]').allInnerTexts()).join('|') === 'Who does it|Where|+ Add a step', '10e the grid\'s one row: Lanes by, + Add a step — no Today chip while there is no future');
  await page.locator('.ln-band-acts .part-menu-b', { hasText: /^More/ }).click(); await page.waitForTimeout(300);
  const items = (await page.getByRole('menuitem').allInnerTexts()).map(x => x.trim());
  ok(JSON.stringify(items) === JSON.stringify(['Play the journey', 'Show only the waste', 'Plan the future — copy today’s steps', 'Change what it is held against', 'Rename', 'Delete']),
    `10e More ▾ holds the rest: ${items.join(' · ')}`);
  await page.getByRole('menuitem', { name: 'Show only the waste' }).click(); await page.waitForTimeout(300);
  ok((await page.locator('.vs-only').count()) === 1 && (await page.locator('.vs-grid').first().evaluate(e => e.closest('.vs').classList.contains('is-waste-only'))), '10e Show only the waste: the grid narrowed, a chip to undo it');
  await page.locator('.vs-only').click(); await page.waitForTimeout(200);
  await more(page, 'Play the journey'); await page.waitForTimeout(1200);
  ok((await page.locator('.vs-play').count()) === 1 && /Step \d+ of \d+ — lead time so far/.test((await words('.vs-at')) ?? ''), '10e Play the journey: its bar appears only while it plays');
  await page.getByRole('button', { name: 'Stop playing' }).click(); await page.waitForTimeout(300);
  ok((await page.locator('.vs-play').count()) === 0, '10e Stop playing takes the bar away');
  await more(page, 'Plan the future — copy today’s steps'); await page.waitForTimeout(500);
  ok((await page.getByRole('tab', { name: 'The future' }).getAttribute('aria-selected')) === 'true' && (await page.getByRole('tab', { name: 'Today' }).count()) === 1, '10e Plan the future: copied, the Today · The future tabs appear');
  await page.getByRole('button', { name: '+ Add a step' }).click(); await page.waitForTimeout(400);
  ok((await page.locator('[role="dialog"]').last().textContent())?.includes('Add a step'), '10e + Add a step opens the step form');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
}

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nB accepted: a line\'s value stream holds, inside a change');
process.exit(failed ? 1 : 0);
