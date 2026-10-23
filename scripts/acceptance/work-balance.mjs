/* ACCEPTANCE — THE LINE BALANCE, TIMED ON THE PHONE
 * (docs/BUILD.md, "Release 3 — step 3" and "The line balance, its own tool";
 * docs/TOOLKIT.md, tools 3 and 4).
 *
 * Rowland, 10 October, of the line balance: "thought it would be more Lean
 * 4.0". The story, driven in a real browser on the seeded line standard
 * (Maris Piper 2kg on Line 7, no job) with the real controls:
 *
 *   1  the line balance, its own page, reads as the module says — who is over
 *      takt first, in red, then the stacks' sentence; Line capacity has no
 *      People tab, a door to it instead; the old address still opens it
 *   2  a step added to a person and timed with the full-screen stopwatch —
 *      Start, Lap, Lap, Foreign — each lap on its element, the interruption
 *      kept out; Undo takes the last lap back, Skip moves Now on
 *   3  the pace seen, rated from the step's Edit — the element's standard
 *      time moves as the module says
 *   4  the map reads it: the work's branch line and each person's seconds
 *   5  the line standard attached to a job — its work balance goes with it
 *   6  Make it better — a fix on whoever is over takt, the balance its
 *      evidence, named "Work balance" in the fix's drawer
 *   7  Prove it — the same elements timed again, a second balance on the
 *      same standard; the map reads the newest, the earlier opens as itself
 *   8  before → after on the fix — "the number moved"
 *   9  the client report's PDF, read back: the fix's before → after and the
 *      Evidence appendix naming the line balance
 *   10 the link to Line capacity (Rowland, 17 October: "it can be linked
 *      directly to the capacity"): a person put at a station — their time in
 *      its unit, the people station taking their timed cycle, said whose;
 *      the takt taken from Line capacity's target; what the bottleneck
 *      costs a pack and a minute as lib/ie/balanceLink says; All together
 *      saying each tool's sentence, the line station by station with who
 *      works there, and its PDF; the Line balance list and its PDF; a phone
 *      with nothing off the side and the timer filling the screen
 *   and a client reads it and changes nothing.
 *
 * Every sentence is checked against the module that makes it (lib/ie/balance,
 * lib/studyLinks) on the same records. Fails on any console error.
 *
 *   node scripts/acceptance/work-balance.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper, more } from '../lib/pageHeader.mjs';

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
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const person = who => page.locator('.wb-person').filter({ has: page.locator('h3', { hasText: new RegExp(`^${who}$`) }) });

/* What the modules say on the records as they stand: the newest balance on
   the standard (or the one named), its figures and sentences. */
const truth = (standardId, studyId) => page.evaluate(async ([sid, id]) => {
  const { listAllStudies, getStandard } = await import('/src/db.ts');
  const B = await import('/src/lib/ie/balance.ts'); const L = await import('/src/lib/studyLinks.ts');
  const { peopleOf } = await import('/src/lib/standard.ts');
  const all = await listAllStudies();
  const s = id ? all.find(x => x.id === id) : L.currentBalance(all, sid);
  const st = await getStandard(sid);
  if (!s || !st) return null;
  const f = (await import('/src/lib/ie/balanceLink.ts')).studyBalance(s);
  const onMap = peopleOf(st).length || undefined;
  const said = B.balanceSays(f, onMap);
  return {
    id: s.id, projectId: s.projectId, uses: s.uses, said, line: L.studyLine(s).text, title: L.studyTitle(s),
    steps: s.facts.steps, els: f.elements.map(e => ({ id: e.id, name: e.name, says: B.elementSays(e, s.agreed?.balance?.allowance ?? 0).text, far: e.far })),
    people: f.people.map(p => ({ who: p.who, work: p.work, over: p.overBy > 0 })), taktSec: f.taktSec,
  };
}, [standardId, studyId ?? null]);

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const SID = sd.lineStandardId;
const MAP = `#/w/${sd.wsId}/standards/${SID}`;
const WORK = `${MAP}?at=balance&view=work`;
const J = `#/project/${sd.projectId}`;

/* ---- 1 · the People view reads as the module says ---- */
await go(WORK);
await page.locator('.wb-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
let t = await truth(SID);
const main = async () => words('.ie-says p.ie-say:not(.is-r):not(.ie-cap)');
const reds = async () => (await page.locator('.ie-says p.ie-say.is-r').allInnerTexts()).map(x => x.trim());
{
  const wantRed = t.said.lines.filter(l => l.tone === 'r').map(l => l.text);
  ok(await main() === t.said.text && JSON.stringify(await reds()) === JSON.stringify(wantRed) && wantRed.length > 0,
    `1 the People view: "${(await reds()).join(' ')}" "${await main()}"`);
  ok((await page.locator('.wb-svg').count()) === 1 && /^Line balance/.test((await words('.ls-head .sub')) ?? ''),
    `1 the stacks against takt, on the line balance's own page: "${await words('.ls-head .sub')}"`);
}

/* ---- 2 · an element added and timed with the stopwatch ---- */
await page.getByLabel('Another step for Op 2').fill('Check the seal');
await person('Op 2').getByRole('button', { name: 'Add', exact: true }).click(); await page.waitForTimeout(800);
await person('Op 2').getByRole('button', { name: 'Time Op 2' }).click(); await page.waitForTimeout(400);
const tap = async name => { await page.getByRole('button', { name }).click(); await page.waitForTimeout(1000); };
const nowIs = async () => ((await page.locator('.wb-tm-step.is-now .wb-tm-name').innerText().catch(() => '')) || '').trim();
await tap(/^Start — as /);
await tap(/^Lap — Fold and tape the case done/);
await tap(/^Lap — Check the seal done/);
/* Undo takes the last lap back and Now returns to it; Lap again */
{
  const lapsOf = async () => ((await truth(SID)).steps.find(x => x.name === 'Check the seal')?.laps ?? []).length;
  const was = await lapsOf();
  await tap(/^Undo the last lap/);
  ok(await lapsOf() === was - 1 && await nowIs() === 'Check the seal', `2 Undo the last lap: the lap taken back (${was} → ${await lapsOf()}), Now on "${await nowIs()}" again`);
  await tap(/^Lap — Check the seal done/);
}
await tap(/^Foreign — leave this out/);
{
  /* the timer is the whole screen while it runs */
  const r = await page.locator('.wb-tm').boundingBox(); const vw = page.viewportSize();
  ok(!!r && r.width >= vw.width - 1 && r.height >= vw.height - 1, `2 the timer fills the screen (${r?.width}×${r?.height})`);
}
await page.getByRole('button', { name: 'Stop timing' }).click(); await page.waitForTimeout(900);
t = await truth(SID);
{
  const fold = t.steps.find(x => x.name === 'Fold and tape the case'), seal = t.steps.find(x => x.name === 'Check the seal');
  const sealLaps = (seal?.laps ?? []).filter(l => !l.foreign), foreign = (fold?.laps ?? []).filter(l => l.foreign);
  ok(sealLaps.length === 1 && sealLaps[0].sec >= 0.8 && sealLaps[0].sec <= 6 && foreign.length === 1 && (fold?.laps ?? []).length === 8,
    `2 timed: Check the seal ${sealLaps.map(l => l.sec).join(', ')} s; the interruption kept on Fold and tape as foreign (${foreign.length})`);
  const sealSays = t.els.find(e => e.name === 'Check the seal')?.says;
  const shown = (await person('Op 2').locator('.wb-said').allInnerTexts()).map(x => x.trim());
  ok(!!sealSays && shown.includes(sealSays) && await main() === t.said.text, `2 the element and the stacks re-read: "${sealSays}"`);
}

/* ---- 3 · the pace seen, rated ---- */
{
  const row = person('Op 2').locator('.wb-el').nth(1);
  await row.getByRole('button', { name: /^Edit / }).click(); await page.waitForTimeout(300);
  await row.getByRole('radio', { name: '125' }).click(); await page.waitForTimeout(800);
  t = await truth(SID);
  const sealSays = t.els.find(e => e.name === 'Check the seal')?.says ?? '';
  ok(/observed at 125/.test(sealSays) && (await words('.wb-said', row)) === sealSays, `3 rated 125: "${sealSays}"`);
}

/* ---- 4 · the map reads it ---- */
await go(MAP);
await page.locator('.ls-balance-line').nth(1).waitFor({ timeout: 10000 }).catch(() => {});
{
  const wantWork = await page.evaluate(async sid => {
    const { listAllStudies, getStandard } = await import('/src/db.ts');
    const { workOf } = await import('/src/ui/WorkBalance.tsx'); const L = await import('/src/lib/studyLinks.ts');
    const { peopleOf } = await import('/src/lib/standard.ts');
    const st = await getStandard(sid);
    return workOf(L.currentBalance(await listAllStudies(), sid), peopleOf(st).length || undefined)?.text;
  }, SID);
  const line = (await page.locator('.ls-balance-line .ls-bl-say').nth(1).innerText()).replace(/\s+/g, ' ').trim();
  ok(!!wantWork && line === wantWork, `4 the map's work line: "${line}"`);
  const op1 = t.people.find(p => p.who === 'Op 1');
  const seconds = (await page.locator('.ls-work').allInnerTexts()).map(x => x.trim());
  ok(!!op1 && seconds.some(x => x.startsWith(`${op1.work.toFixed(1)} s of ${t.taktSec.toFixed(1)} s`)) && (await page.locator('.ls-work.is-r').count()) >= (op1.over ? 1 : 0),
    `4 who does what: Op 1 "${seconds.join(' | ')}"`);
}

/* ---- 5 · attached to a job — the work balance goes with it ---- */
await page.getByLabel('Attach to a project').first().selectOption(sd.projectId); await page.waitForTimeout(1200);
t = await truth(SID);
ok(t.projectId === sd.projectId, '5 the line standard on the job: its work balance is the job\'s now');

/* ---- 6 · Make it better ---- */
const before = t.id;
await go(`${J}/standard/${SID}?at=balance&view=work`);
await page.getByRole('button', { name: /^Make it better/ }).waitFor({ timeout: 10000 }).catch(() => {});
await page.getByRole('button', { name: /^Make it better/ }).click(); await page.waitForTimeout(1500);
const fixId = decodeURIComponent(new URL(page.url()).hash.split('open=')[1] ?? '');
t = await truth(SID, before);
{
  const want = await page.evaluate(async id => {
    const { getStudy } = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
    return L.betterWords(await getStudy(id));
  }, before);
  const title = await page.evaluate(async ([pid, fid]) => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.id === fid)?.title, [sd.projectId, fixId]);
  ok(!!fixId && t.uses.some(u => u.kind === 'fix' && u.ref === fixId && u.role === 'evidence') && title === want, `6 a fix raised: "${title}"`);
}
await page.locator('.sl').filter({ hasText: 'How we know' }).first().waitFor({ timeout: 10000 }).catch(() => {});
{ const w6 = (await words('.sl')) ?? ''; ok(/How we know/i.test(w6) && w6.includes(t.title) && w6.includes(t.line), `6 the fix's drawer: "${w6.slice(0, 180)}"`); }

/* ---- 7 · Prove it — the same elements, timed again ---- */
await page.getByRole('button', { name: /^Prove it/ }).click(); await page.waitForTimeout(1800);
const after = decodeURIComponent(new URL(page.url()).hash.split('study=')[1]?.split('&')[0] ?? '');
let ta = await truth(SID);
ok(!!after && after !== before && ta.id === after && ta.steps.length === t.steps.length && ta.steps.every(x => !(x.laps ?? []).length),
  `7 Prove it: a second balance on the same standard, the same ${ta.steps.length} elements, no laps yet`);
await person('Op 1').getByRole('button', { name: 'Time Op 1' }).click(); await page.waitForTimeout(400);
await tap(/^Start — as /);
await tap(/^Lap — Feed the bagger done/);
await tap(/^Lap — Clear the jams done/);
await page.getByRole('button', { name: 'Stop timing' }).click(); await page.waitForTimeout(800);
for (const [i, v] of [[0, '8'], [1, '1.5']]) {
  const box = person('Op 2').locator('.wb-el').nth(i).getByLabel('Typed seconds');
  await box.fill(v); await box.press('Tab'); await page.waitForTimeout(500);
}
ta = await truth(SID);
ok(await main() === ta.said.text && !ta.people.some(p => p.over), `7 after: "${await main()}"`);
await go(`${J}/standard/${SID}?at=balance&view=work&study=${encodeURIComponent(before)}`);
await page.locator('.wb-earlier').first().waitFor({ timeout: 10000 }).catch(() => {});
ok((await page.locator('.wb-earlier').count()) === 1 && (await page.getByRole('button', { name: /^Time Op/ }).count()) === 0,
  `7 the earlier timing opens as itself, read only: "${await words('.wb-earlier')}"`);

/* ---- 8 · before → after on the fix ---- */
const want = await page.evaluate(async ([pid, fid]) => {
  const { listStudies } = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
  return L.beforeAfter(await listStudies(pid), fid)?.text;
}, [sd.projectId, fixId]);
await go(`${J}/fixes?open=${encodeURIComponent(fixId)}`);
await page.locator('.sl-ba').first().waitFor({ timeout: 10000 }).catch(() => {});
ok(!!want && /within takt now/.test(want) && (await words('.sl-ba')) === `Before → after: ${want}`, `8 before → after: "${await words('.sl-ba')}"`);

/* ---- 9 · the client report's PDF ---- */
await go(`${J}/report`);
await page.getByRole('button', { name: 'Full report', exact: true }).first().click(); await page.waitForTimeout(800);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
const pdf = join(OUT, 'client.pdf'); await dl.saveAs(pdf);
const txt = pdfText(pdf);
const san = s => s.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/\s+/g, ' ');
const has = s => san(txt).includes(san(s).slice(0, 60));
ok(has('Evidence') && has('Line balance - Maris Piper 2kg'), '9 the client report: the Evidence appendix names the line balance');
ok(has('Before') && has(want.slice(0, 50)), '9 the client report: the fix carries its before → after');

/* ---- 10 · the link to Line capacity, what it costs, All together ---- */
{
  const LB = `${MAP}?at=work`;
  /* the line's labour rate, typed in Line capacity (one home) */
  await page.evaluate(async id => { const db = await import('/src/db.ts'); const st = await db.getStandard(id);
    await db.putStandard({ ...st, capacity: { ...st.capacity, labour: { ratePerHour: 15 } } }); }, SID);
  await go(LB);
  await page.locator('.wb-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
  await page.getByRole('button', { name: 'Take the takt from Line capacity' }).click(); await page.waitForTimeout(1200);
  const opts = await page.getByLabel('Where Op 2 works').locator('option').allInnerTexts();
  await page.getByLabel('Where Op 2 works').selectOption({ label: opts.find(o => /^Packer/.test(o)) ?? '' }); await page.waitForTimeout(1800);
  const L = await page.evaluate(async id => {
    const db = await import('/src/db.ts'); const S = await import('/src/lib/studyLinks.ts'); const K = await import('/src/lib/ie/balanceLink.ts'); const B = await import('/src/lib/ie/balance.ts');
    const st = await db.getStandard(id); const b = S.currentBalance(await db.listAllStudies(), id); const f = K.studyBalance(b);
    const ws = st.workspaceId ? await db.getWorkspace(st.workspaceId) : undefined;
    const op2 = f.people.find(p => p.who === 'Op 2'); const k = K.balanceCost(f, K.costInputs(st.capacity, ws));
    return { from: b.agreed?.balance?.from, packer: st.capacity.stations.find(x => x.name === 'Packer'), work: op2?.work, unit: op2?.unit, figure: op2 ? `${B.secs(op2.work)} of ${B.secs(op2.takt ?? 0)}${B.aPiece(op2)} takt` : '',
      cost: k ? K.balanceCostSays(k, st.capacity.stations[0].unit).lines : null };
  }, SID);
  ok(L.from === 'target' && /Line capacity’s target/.test((await words('.wb-strip')) ?? ''), `10 the takt taken from Line capacity's target: "${await words('.wb-strip')}"`);
  ok(L.packer?.source === 'standard' && Math.abs((L.packer?.cycleSec ?? 0) - Math.round((L.work ?? 0) * 100) / 100) < 0.006 && L.packer?.note === 'timed in the line balance — Op 2' && L.unit === 'baskets',
    `10 Op 2 at the Packer: Line capacity's Packer takes their timed ${L.packer?.cycleSec} s a basket, "${L.packer?.note}"`);
  ok(((await words('.wb-pw', person('Op 2'))) ?? '').startsWith(L.figure), `10 Op 2 read in their own piece: "${await words('.wb-pw', person('Op 2'))}"`);
  const shown = (await page.locator('.wb-cost .wb-cost-l').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  ok(!!L.cost && JSON.stringify(shown) === JSON.stringify(L.cost), `10 what it costs, a pack and a minute: "${shown.join(' ')}"`);
  /* THE LEAN PAGE (docs/LEAN-PAGE.md): the tiles took the strip's place —
     as lib/ie/balanceLean reads them — and the closing line */
  {
    const want = await page.evaluate(async id => {
      const db = await import('/src/db.ts'); const S = await import('/src/lib/studyLinks.ts'); const K = await import('/src/lib/ie/balanceLink.ts');
      const N = await import('/src/lib/ie/balanceLean.ts'); const D = await import('/src/lib/standard.ts');
      const st = await db.getStandard(id); const b = S.currentBalance(await db.listAllStudies(), id); const f = K.studyBalance(b);
      const ws = st.workspaceId ? await db.getWorkspace(st.workspaceId) : undefined;
      const a = K.agreedFor(b.agreed?.balance, st.capacity, !!b.closedAt);
      return N.balanceTiles(f, a, a ? K.balanceCost(f, K.costInputs(st.capacity, ws)) : undefined, st.capacity.stations[0]?.unit.trim() || undefined, D.peopleOf(st).length || undefined);
    }, SID);
    const vs = await page.locator('.wb-strip .ln-tile .ln-v').allInnerTexts();
    ok(vs.join('|') === want.map(x => x.v).join('|') && (await page.locator('.wb .ln-close').count()) === 1,
      `10 the tiles, as lib/ie/balanceLean reads them, and the closing line: ${want.map(x => `${x.k} ${x.v}`).join(' · ')}`);
  }
  /* Skip moves Now on without a lap */
  await person('Op 1').getByRole('button', { name: 'Time Op 1' }).click(); await page.waitForTimeout(400);
  await tap(/^Start — as /);
  const n0 = await nowIs(); await tap(/^Skip this step/); const n1 = await nowIs();
  ok(n0 === 'Feed the bagger' && n1 === 'Clear the jams', `10 Skip: Now from "${n0}" to "${n1}"`);
  await page.getByRole('button', { name: 'Stop timing' }).click(); await page.waitForTimeout(800);
  /* ALL TOGETHER — each tool's sentence, the line station by station, its paper */
  await go(`${MAP}?at=all`);
  await page.locator('.tg-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const T = await page.evaluate(async id => {
    const db = await import('/src/db.ts'); const S = await import('/src/lib/studyLinks.ts'); const G = await import('/src/lib/together.ts');
    const st = await db.getStandard(id); const t = G.togetherOf(st, S.currentBalance(await db.listAllStudies(), id));
    return { cap: t.capacity.text, n: t.stations.length, limit: t.stations.find(x => x.limit)?.name, packer: t.stations.find(x => x.name === 'Packer')?.people.map(p => p.says) ?? [] };
  }, SID);
  const cap = ((await page.locator('.tg-cell .tg-v').first().innerText()) ?? '').trim();
  const rows = await page.locator('.tg-st').count();
  const packerRow = (await page.locator('.tg-st', { hasText: 'Packer' }).first().innerText()).replace(/\s+/g, ' ');
  ok(cap === T.cap && rows === T.n && T.packer.length === 1 && packerRow.includes(`Op 2 ${T.packer[0]}`) && (await page.locator('.tg-st.is-limit').count()) === 1,
    `10 All together: "${cap}", ${rows} stations, the bottleneck (${T.limit}) marked, the Packer "${packerRow.slice(0, 90)}"`);
  {
    const want = await page.evaluate(async id => {
      const db = await import('/src/db.ts'); const S = await import('/src/lib/studyLinks.ts'); const G = await import('/src/lib/together.ts');
      const st = await db.getStandard(id); const ws = st.workspaceId ? await db.getWorkspace(st.workspaceId) : undefined;
      return G.togetherTiles(st, S.currentBalance(await db.listAllStudies(), id), ws);
    }, SID);
    const vs = await page.locator('.tg .ln-tiles .ln-tile .ln-v').allInnerTexts();
    ok(vs.join('|') === want.map(x => x.v).join('|') && (await page.locator('.tg .ln-close').count()) === 1 && (await page.locator('.tg .ls-head.is-band').count()) === 1,
      `10 All together's band, tiles and closing line — each figure from its own tool: ${want.map(x => `${x.k} ${x.v}`).join(' · ')}`);
  }
  const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.locator('.tg .ls-head-actions').getByRole('button', { name: 'PDF', exact: true }).click()]);
  const tpdf = join(OUT, 'together.pdf'); await dl2.saveAs(tpdf);
  const tt = pdfText(tpdf);
  const TT = tt.toUpperCase();
  ok(TT.includes('ALL TOGETHER') && tt.includes('Maris Piper 2kg') && TT.includes('THE LINE, STATION BY STATION') && tt.includes('Packer') && TT.includes('WHAT IT COSTS') && TT.includes('WHO STANDS WHERE'),
    '10 All together on paper: where it stands, the line station by station, the card, each person against takt, what it costs');
  /* THE LINE BALANCE'S LIST — its sentence, and its paper */
  await go('#/linebalance');
  await page.locator('.lt-row').first().waitFor({ timeout: 10000 }).catch(() => {});
  const lineSays = await page.evaluate(async id => { const db = await import('/src/db.ts'); const S = await import('/src/lib/studyLinks.ts'); return S.studyLine(S.currentBalance(await db.listAllStudies(), id)).text; }, SID);
  const rowSays = ((await page.locator('.lt-row', { hasText: 'Maris Piper 2kg' }).first().locator('.lt-says').innerText()) ?? '').trim();
  ok(rowSays === lineSays, `10 the Line balance list: "${rowSays.slice(0, 100)}"`);
  const [dl3] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, /every product shown/)]);
  const lpdf = join(OUT, 'linebalance.pdf'); await dl3.saveAs(lpdf);
  const lt = pdfText(lpdf);
  ok(lt.includes('Maris Piper 2kg') && lt.toUpperCase().includes('EACH PERSON AGAINST TAKT') && lt.toUpperCase().includes('WHAT IT COSTS'), '10 the Line balance list on paper: each person against takt, what it costs');
  /* a phone: nothing off the side */
  await page.setViewportSize({ width: 390, height: 844 });
  await go(LB);
  await page.locator('.wb-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
  const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(over <= 1, `10 on a phone nothing is off the side (${over} px)`);
  await page.setViewportSize({ width: 1360, height: 900 });
}

/* ---- a client reads it and changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`${J}/standard/${SID}?at=balance&view=work`);
await page.locator('.wb-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
const doors = await page.locator('.wb').getByRole('button', { name: /^Time |^Add$|^Use it|Make it better|Set as the standard|Change what was agreed|Take it off|Reopen/ }).allInnerTexts();
const boxes = await page.locator('.wb input, .wb select').count();
ok((await page.locator('.wb-strip').count()) === 1 && doors.length === 0 && boxes === 0, `a client reads the work balance and changes nothing${doors.length || boxes ? ` — found: ${doors.join(', ')} and ${boxes} boxes` : ''}`);
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nthe line balance accepted: its own tool, timed on the phone, linked to Line capacity, its costs, all together — on its own and on a job');
process.exit(failed ? 1 : 0);
