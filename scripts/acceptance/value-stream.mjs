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
 *   and a client reads the map and changes nothing.
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
  const S = await import('/src/lib/ie/steps.ts');
  const s = await getStudy(id);
  if (!s) return null;
  const a = s.agreed?.map;
  const f = S.flowFigures(s.facts.flow, a);
  return { id: s.id, uses: s.uses, flow: s.facts.flow ?? [], said: S.flowSays(f, a), who: S.lanesOf(s.facts.flow ?? [], 'who', a), where: S.lanesOf(s.facts.flow ?? [], 'where', a) };
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
  await page.getByRole('button', { name: 'Walk it', exact: true }).click(); await page.waitForTimeout(300);
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
  await page.getByRole('button', { name: 'Walk it again' }).click(); await page.waitForTimeout(300);
  const first = [...tp.flow].sort((a, b) => a.order - b.order).find(x => x.kind !== 'wait' && x.kind !== 'store');
  ok(((await words('.vs-walk .wb-t-h')) ?? '').includes(`up next: ${first.name}`), `5 Walk it again: up next "${first.name}"`);
  await page.getByRole('button', { name: /^Start/ }).click(); await page.waitForTimeout(1100);
  await page.getByRole('button', { name: /^Stop/ }).click(); await page.waitForTimeout(300);
  await page.getByRole('button', { name: 'Walk it again' }).click(); await page.waitForTimeout(300);
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
  const doors = await page.locator('.vs-page').getByRole('button', { name: /^\+ Add a step|^Walk it|^Copy to the future|Change what it is held|Name the ends/ }).allInnerTexts();
  await square('Walk to fetch flat cases').first().click().catch(() => {}); await page.waitForTimeout(300);
  const inSheet = await page.getByRole('button', { name: /Change this step|Make it better/ }).count();
  ok((await page.locator('.vs-sq').count()) > 0 && doors.length === 0 && inSheet === 0, `a client reads the map and changes nothing${doors.length || inSheet ? ` — found: ${doors.join(', ')} and ${inSheet} in the step's sheet` : ''}`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nB accepted: a line\'s value stream holds, inside a change');
process.exit(failed ? 1 : 0);
