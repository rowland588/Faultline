/* ACCEPTANCE — F: SMED, QUICK CHANGEOVER, ON ITS OWN AND INSIDE A CHANGE
 * (docs/TOOLKIT.md, tool 6; docs/BUILD.md, tool F).
 *
 * Rowland, 12 October: "you should be making the lean tool SMED ... and doing
 * everything along them principles"; "SMED is to be a tool that again can be
 * used individually or attached to projects"; "extrapolate it ... per shift
 * ... the full quantity of what the changeovers are actually costing you";
 * "we go by plate speed ... unless human".
 *
 * The ops lead's sentences, the ones the tool exists to let them say: "42
 * min now → 27 min separated → … converted → … streamlined"; "Now 42 min × …
 * = … a week stopped — … packs at 60 a minute, the Bagger's plate speed".
 * Driven in a real browser on a phone, with the real controls:
 *
 *   1  A QUICK SESSION, ON ITS OWN: a new SMED from the tool's page — the two
 *      products, no line — Lap two elements with who does each, Internal and
 *      External; type a third ("5" is five minutes); convert the internal
 *      one, streamline the typed one with a target; the grid's lanes by who,
 *      I solid and E hatched; the ladder as the module says; How the line
 *      runs with the days a week typed as 7, the breaks and the speed typed
 *      — the cost as the module says, no pounds (no line); the plan view and
 *      Play; a square opens everything about its element; Set as the
 *      standard says it needs a line
 *   2  ON A LINE AND A JOB: Start a SMED from the product's standard lands on
 *      its line, job and standard; the seeded SMED on it: the speed offered
 *      is the Bagger's PLATE speed off the line balance — Use it, said so in
 *      the cost; convert one internal element, streamline one with a target
 *      and one in parallel by the fitter — the ladder's rungs as the module
 *      says, and the plan's grid puts the two in one column
 *   3  Make it better from the converted element — a fix in its SMED action's
 *      words; the element wears the branch
 *   4  Set as the standard — the agreed sequence with its target and its
 *      checklist on the product's standard; the standard's page shows it
 *   5  Prove it — the same elements carried; Lap times the one up next; the
 *      converted element out of the stop; before → after on the fix, against
 *      the plan
 *   6  the client report's PDF, read back: the fix's before → after, and the
 *      Evidence appendix with the grid as a table (who, where, I/E, the plan,
 *      elapsed), the ladder and what the changeovers cost in words
 *   7  the 6M job: the line's card says SMED; the fishbone offers it on
 *      Method and Machine; accepted, the cause says SMED
 *   and a client reads the SMED and changes nothing.
 *
 * Every sentence is checked against the module that makes it
 * (lib/ie/changeover, lib/studyLinks, lib/fishbone) on the same records.
 * Fails on any console error.
 *
 *   node scripts/acceptance/changeover.mjs      (SMOKE_BASE, as smoke) */
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
/* A PHONE: the changeover is timed at the line, one thumb. */
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'en-GB', acceptDownloads: true });
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
const id = () => decodeURIComponent(new URL(page.url()).hash.split('smed/')[1] ?? '').split(/[?&]/)[0];
const card = name => page.locator('.co-step').filter({ has: page.locator('.co-step-n', { hasText: name }) });
const stage = name => page.locator('.co-stages').getByRole('button', { name, exact: true }).click().then(() => page.waitForTimeout(300));
const dialog = () => page.locator('[role="dialog"]').last();

/* What the modules say of a SMED as it stands — against its standard, with
   its line's cost settings, as the page reads them. */
const truth = sid => page.evaluate(async sid => {
  const { getStudy, getStandard, getWorkspace } = await import('/src/db.ts');
  const C = await import('/src/lib/ie/changeover.ts'); const L = await import('/src/lib/studyLinks.ts');
  const s = await getStudy(sid);
  if (!s) return null;
  const std = s.standardId ? await getStandard(s.standardId) : undefined;
  const agreed = C.agreedFor(std?.capacity?.changeovers, s.facts.fromProduct);
  const seq = [...(s.facts.sequence ?? [])].sort((a, b) => a.order - b.order);
  const f = C.figuresOf(s.facts), l = C.ladderOf(seq);
  const money = C.moneyOf(s.workspaceId ? await getWorkspace(s.workspaceId) : undefined);
  const iv = C.intervalOf(f, s.facts.products, C.availableOf(s.facts)?.min);
  const plan = C.arrange(seq, 'streamlined');
  return { id: s.id, name: s.name, uses: s.uses, ws: s.workspaceId, pid: s.projectId, std: s.standardId, closedAt: s.closedAt, facts: s.facts, title: L.studyTitle(s),
    said: C.changeoverSays(f, agreed), ladder: C.ladderSays(l).text, cost: C.extrapolationSays(l, s.facts, money).text, iv: C.intervalSays(iv, f).text,
    rungs: { now: C.mins(l.now.elapsedSec), separated: C.mins(l.separated.elapsedSec), converted: C.mins(l.converted.elapsedSec), streamlined: C.mins(l.streamlined.elapsedSec) },
    planCols: plan.cols.map(c => c.ids.length), planElapsed: C.mins(plan.elapsedSec), f };
}, sid);
const says = async () => (await page.locator('.ie-says p.ie-say').allTextContents()).map(x => x.replace(/\s+/g, ' ').trim());

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const J = `#/project/${sd.projectId}`;

/* ==== 1 · A QUICK SESSION, ON ITS OWN ==== */
await go('#/smed');
ok(((await words('h1')) ?? '').includes('SMED'), `1 the tool's page is SMED: "${await words('h1')}"`);
await page.getByRole('button', { name: 'New SMED' }).first().click(); await page.waitForTimeout(500);
{
  const sheet = (await page.locator('.lt-new').textContent()) ?? '';
  await page.getByLabel('From which product?').fill('Finest Red 2kg');
  const waits = await page.getByRole('button', { name: 'Start it' }).isDisabled();
  await page.getByLabel('To which product?').fill('Express 1.25 kg');
  ok(/optional/.test(sheet) && /No line yet — a quick session/.test(sheet) && waits, '1 a new SMED asks the two products; the line is optional — a quick session');
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
}
const Q = id();
let t = await truth(Q);
ok(!!Q && !t.ws && !t.pid && t.name === 'Finest Red 2kg → Express 1.25 kg' && (await page.locator('.ie-eyebrow').textContent())?.trim() === 'SMED — quick changeover',
  `1 started on its own — no line, no job: "${t.name}", under "SMED — quick changeover"`);

/* Lap two elements, who does each, Internal and External */
await page.getByRole('button', { name: /^Lap — time it/ }).click(); await page.waitForTimeout(300);
{
  const lap = page.locator('.co-lap');
  await lap.getByLabel('This element').fill('Heat the new sealing jaws');
  await lap.getByLabel('Who does it').fill('Op 1');
  await lap.getByRole('radio', { name: /^Internal/ }).click();
  await page.getByRole('button', { name: /^Start — at the last good piece/ }).click(); await page.waitForTimeout(1300);
  await page.getByRole('button', { name: /^Next — this one is done/ }).click(); await page.waitForTimeout(300);
  await lap.getByLabel('This element').fill('Fetch the next former');
  await lap.getByLabel('Who does it').fill('Op 2');
  await lap.getByRole('radio', { name: /^External/ }).click(); await page.waitForTimeout(800);
  await page.getByRole('button', { name: /^Last — first good piece at rate/ }).click(); await page.waitForTimeout(900);
}
t = await truth(Q);
{
  const [a, b] = t.facts.sequence ?? [];
  ok(t.facts.sequence.length === 2 && a.side === 'internal' && b.side === 'external' && a.source === 'timed' && b.source === 'timed' && a.sec >= 1 && a.sec < 4 && b.sec >= 0.6 && b.sec < 4
    && a.crew?.[0] === 'Op 1' && b.crew?.[0] === 'Op 2', `1 lapped: ${a?.sec} s internal by ${a?.crew}, ${b?.sec} s external by ${b?.crew} — the time between taps, who did each`);
}
/* a third, typed: "5" is five minutes */
await stage('Record');
await page.getByRole('button', { name: '+ Type an element' }).click(); await page.waitForTimeout(300);
await page.getByLabel('What is done').fill('Adjust the jaw pressure');
await dialog().getByRole('radio', { name: /^Internal/ }).click();
await page.getByLabel('How long it takes').fill('5');
await page.getByRole('button', { name: 'Add it' }).click(); await page.waitForTimeout(600);
t = await truth(Q);
ok(t.facts.sequence.length === 3 && t.facts.sequence[2].sec === 300 && t.facts.sequence[2].source === 'typed', '1 a third typed: "5" is five minutes, 300 s');
/* the grid: lanes by who, I solid, E hatched */
{
  const lanes = (await page.locator('.co-grid .vs-lane').allInnerTexts()).map(x => x.trim());
  const sq = await page.locator('.co-grid button.co-sq').evaluateAll(xs => xs.map(x => ({ c: x.className, t: x.textContent?.trim() })));
  ok(lanes.includes('Op 1') && lanes.includes('Op 2') && sq.some(x => /is-i/.test(x.c) && x.t === 'I') && sq.some(x => /is-e/.test(x.c) && x.t === 'E'),
    `1 the grid: lanes ${lanes.join(', ')}; internal solid "I", external hatched "E"`);
}
/* convert the lapped internal element; streamline the typed one with a target */
await stage('Convert');
await card('Heat the new sealing jaws').getByRole('button', { name: '→E Convert to external' }).click(); await page.waitForTimeout(500);
await stage('Streamline');
await card('Adjust the jaw pressure').getByRole('radio', { name: '↓ Streamline' }).click(); await page.waitForTimeout(500);
await card('Adjust the jaw pressure').getByLabel('Target inside the stop').fill('2 min');
await card('Adjust the jaw pressure').getByLabel('Target inside the stop').press('Tab'); await page.waitForTimeout(600);
t = await truth(Q);
{
  const jaws = t.facts.sequence.find(x => x.name === 'Heat the new sealing jaws'), adj = t.facts.sequence.find(x => x.name === 'Adjust the jaw pressure');
  ok(jaws?.plan?.kind === 'convert' && jaws.plan.how === 'prepare' && adj?.plan?.kind === 'streamline' && adj.plan.targetSec === 120,
    '1 convert: the jaws to be heated before the line stops (prepare in advance); streamline: the pressure, target 2 min');
  ok((await says()).includes(t.ladder) && /streamlined/.test(t.ladder), `1 the ladder as the module says: "${t.ladder}"`);
  const bars = (await page.locator('.co-bar-n').allTextContents()).map(x => x.trim());
  ok(bars.join('|') === [t.rungs.now, t.rungs.separated, t.rungs.converted, t.rungs.streamlined].join('|'), `1 the ladder drawn: ${bars.join(' → ')}`);
}
/* how the line runs: days a week typed as 7, the breaks, the speed typed */
await page.getByRole('button', { name: 'Say how the line runs' }).click(); await page.waitForTimeout(400);
{
  const sheet = (await dialog().textContent()) ?? '';
  await page.getByLabel('Shifts a day').fill('2');
  await page.getByLabel('Hours a shift').fill('8');
  await page.getByLabel('Breaks the line stops for, min a shift').fill('30');
  await page.getByLabel('Days a week, typed').fill('7');
  const seven = await dialog().getByRole('radio', { name: '7', exact: true }).getAttribute('aria-checked');
  await page.getByLabel('How many changeovers').fill('3');
  await dialog().getByRole('radio', { name: 'a shift' }).click();
  await page.getByLabel("The line's speed, packs a minute").fill('100');
  ok(/No plate speed on the product's line capacity/.test(sheet) && /No cost set for this line/.test(sheet) && seven === 'true',
    '1 how the line runs: nothing assumed — the days a week typed as 7 light the 7; no line capacity, so the speed is typed; no line, no pounds');
  await dialog().getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(800);
}
t = await truth(Q);
ok(t.facts.running?.daysPerWeek === 7 && t.facts.running?.breakMin === 30 && t.facts.running?.shiftsPerDay === 2 && t.facts.changeovers?.count === 3 && t.facts.rateFrom === 'typed' && t.facts.ratePerMin === 100,
  '1 saved once, on Save: 2 shifts of 8 h less 30 min, 7 days, 3 changeovers a shift, 100 a minute typed');
ok((await says()).includes(t.cost) && /× 3 a shift × 2 shifts × 7 days = /.test(t.cost) && /at 100 a minute, typed/.test(t.cost) && !/£/.test(t.cost),
  `1 what the changeovers cost, as the module says: "${t.cost}"`);
/* the plan, and Play */
await page.getByRole('tab', { name: 'The plan' }).click(); await page.waitForTimeout(400);
{
  const total = await words('.co-grid .vs-tot-lead');
  const marks = await page.locator('.co-grid .co-mark').count();
  ok(total === t.planElapsed && total === t.rungs.streamlined && marks === 0 && (await page.locator('.co-outside').innerText()).includes('Heat the new sealing jaws'),
    `1 the plan's grid: ${total} elapsed — the converted element prepared before the line stops, said under it`);
}
await page.getByRole('tab', { name: 'As timed' }).click(); await page.waitForTimeout(300);
await page.getByRole('button', { name: 'Play the changeover' }).click(); await page.waitForTimeout(1900);
ok(/Column \d+ of \d+ — elapsed so far/.test((await words('.vs-at')) ?? ''), `1 Play the changeover: "${await words('.vs-at')}"`);
await page.getByRole('button', { name: 'Restart' }).click().catch(() => {}); await page.waitForTimeout(300);
await page.locator('.co-grid button.co-sq').first().click(); await page.waitForTimeout(400);
{
  const facts = (await dialog().innerText()).replace(/\s+/g, ' ');
  ok(/Who does it Op 1/.test(facts) && /How it is known timed/.test(facts) && /The plan Convert to external — prepare in advance/.test(facts), '1 a square opens everything about its element: who, how known, the plan');
  await dialog().getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(300);
}
await stage('Standardise');
ok(((await words('.ie-agreed')) ?? '').includes('Put it on a line to set it as a product'), `1 on its own, Set as the standard says it needs a line: "${await words('.ie-agreed')}"`);

/* ==== 2 · ON A LINE AND A JOB ==== */
await go(`#/w/${sd.wsId}/standards/${sd.lineOnJobId}`);
await page.getByRole('button', { name: 'Start a SMED ›' }).click(); await page.waitForTimeout(1500);
{
  const fresh = await truth(id());
  ok(!!fresh && fresh.ws === sd.wsId && fresh.pid === sd.projectId && fresh.std === sd.lineOnJobId && fresh.facts.toProduct === 'Tesco Express 1.25 kg',
    '2 Start a SMED from the Express standard: on its line, on the Line 2 job, into its standard');
}
const CO = sd.changeoverId;
/* the line capacity says the Bagger's plate speed: the slowest station, off its plate */
await page.evaluate(async sid => {
  const { getStandard, putStandard } = await import('/src/db.ts');
  const std = await getStandard(sid);
  await putStandard({ ...std, capacity: { ...(std.capacity ?? {}), stations: [
    { id: 'w1', name: 'Weigher', kind: 'machine', unit: 'bags', contains: 1, rate: 80, ratePer: 'min', source: 'plate' },
    { id: 'b1', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 60, ratePer: 'min', source: 'plate' },
    { id: 'p1', name: 'Packers', kind: 'people', unit: 'bags', contains: 1, rate: 75, ratePer: 'min', crew: 1, source: 'timed' },
  ] } });
}, sd.lineOnJobId);
await go(`#/smed/${CO}`);
await page.getByRole('button', { name: 'Change how the line runs' }).click(); await page.waitForTimeout(400);
{
  const note = await words('.co-rate-from', dialog());
  ok(/^The Bagger's plate speed, off Tesco Express 1\.25 kg's line capacity says 60 — 50 is said as the standard's target — not a plate speed\./.test(note ?? ''),
    `2 the speed offered is the Bagger's plate speed: "${note}"`);
  await dialog().getByRole('button', { name: 'Use 60' }).click(); await page.waitForTimeout(200);
  ok(((await words('.co-rate-from', dialog())) ?? '').startsWith("From the Bagger's plate speed"), `2 used: "${await words('.co-rate-from', dialog())}"`);
  await dialog().getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(800);
}
t = await truth(CO);
ok(t.facts.ratePerMin === 60 && t.facts.rateFrom === 'plate' && t.facts.rateStation === 'Bagger' && (await says()).includes(t.cost) && /at 60 a minute, the Bagger's plate speed/.test(t.cost),
  `2 the cost at the plate speed: "${t.cost}"`);
/* convert one internal element; streamline one with a target, and one in parallel by the fitter */
await stage('Convert');
await card('Set the jaw temperature').getByRole('button', { name: '→E Convert to external' }).click(); await page.waitForTimeout(500);
await stage('Streamline');
await card('Change the former tube').getByRole('radio', { name: '↓ Streamline' }).click(); await page.waitForTimeout(400);
await card('Change the former tube').getByLabel('Target inside the stop').fill('4 min');
await card('Change the former tube').getByLabel('Target inside the stop').press('Tab'); await page.waitForTimeout(500);
await card('Change the film reel').getByRole('radio', { name: '↓ Streamline' }).click(); await page.waitForTimeout(400);
await card('Change the film reel').getByRole('radio', { name: 'in parallel' }).click(); await page.waitForTimeout(400);
await card('Change the film reel').getByLabel(/alongside which element/).selectOption({ label: '3. Change the former tube' }); await page.waitForTimeout(400);
await card('Change the film reel').getByLabel(/who does it in parallel/).fill('Fitter');
await card('Change the film reel').getByLabel(/who does it in parallel/).press('Tab'); await page.waitForTimeout(400);
await card('Change the film reel').getByLabel('Target inside the stop').fill('5');
await card('Change the film reel').getByLabel('Target inside the stop').press('Tab'); await page.waitForTimeout(600);
t = await truth(CO);
{
  const reel = t.facts.sequence.find(x => x.name === 'Change the film reel'), tube = t.facts.sequence.find(x => x.name === 'Change the former tube');
  ok(reel?.plan?.how === 'parallel' && reel.plan.alongside === tube?.id && reel.plan.crew?.[0] === 'Fitter' && reel.plan.targetSec === 300 && tube?.plan?.targetSec === 240,
    '2 streamline: the former tube to 4 min (quick-release clamps); the film reel to 5 min in parallel, alongside it, by the fitter');
  const strip = (await page.locator('.ie-strip').innerText()).replace(/\s+/g, ' ');
  ok((await says()).includes(t.ladder) && strip.includes(`${t.rungs.converted} converted`) && strip.includes(`${t.rungs.streamlined} streamlined`),
    `2 the ladder as the module says: "${t.ladder}"`);
  await page.getByRole('tab', { name: 'The plan' }).click(); await page.waitForTimeout(400);
  const par = await page.locator('.co-grid .vs-seq.co-par').count();
  ok(par === 1 && t.planCols.includes(2) && (await words('.co-grid .vs-tot-lead')) === t.rungs.streamlined, `2 the plan's grid: the two in one column (‖), ${t.rungs.streamlined} elapsed`);
  await page.getByRole('tab', { name: 'As timed' }).click(); await page.waitForTimeout(300);
}

/* ==== 3 · Make it better from the converted element ==== */
const jaws = t.facts.sequence.find(x => x.name === 'Set the jaw temperature');
await page.locator('.co-grid button.co-sq', { has: page.locator('.co-mark', { hasText: '→E' }) }).first().click(); await page.waitForTimeout(400);
await dialog().getByRole('button', { name: 'Make it better — raise a fix' }).click(); await page.waitForTimeout(1500);
const fixId = decodeURIComponent(new URL(page.url()).hash.split('open=')[1] ?? '');
{
  const want = await page.evaluate(async ([sid, step]) => (await import('/src/lib/studyLinks.ts')).betterWords(await (await import('/src/db.ts')).getStudy(sid), step), [CO, jaws.id]);
  const title = await page.evaluate(async ([pid, fid]) => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.id === fid)?.title, [sd.projectId, fixId]);
  t = await truth(CO);
  ok(!!fixId && title === want && want === 'Set the jaw temperature — convert to external (prepare in advance), 3 min' && t.uses.some(u => u.kind === 'fix' && u.ref === fixId && u.role === 'evidence' && u.step === jaws.id),
    `3 a fix in its SMED action's words: "${title}"`);
  await go(`#/smed/${CO}`);
  await stage('Convert');
  ok(/has-fix/.test(await card('Set the jaw temperature').getAttribute('class') ?? '') && (await page.locator('.co-grid button.co-sq.has-fix').count()) === 1, '3 the element wears the branch — on its row and its square');
}

/* ==== 4 · Set as the standard ==== */
await stage('Standardise');
{
  const check = ((await page.locator('.co-check').textContent()) ?? '').replace(/\s+/g, ' ');
  ok(/Before the line stops.*Set the jaw temperature/.test(check) && /With the line stopped.*Change the former tube — 4 min/.test(check), `4 the checklist: the jaws before the line stops; the tube in the stop at its target — "${check.slice(0, 220)}"`);
}
await page.getByRole('button', { name: 'Set as the standard' }).click(); await page.waitForTimeout(1200);
{
  const std = await page.evaluate(async sid => (await (await import('/src/db.ts')).getStandard(sid))?.capacity?.changeovers, sd.lineOnJobId);
  const a = (std ?? []).find(x => x.fromStudyId === CO);
  t = await truth(CO);
  ok(!!a && a.from === 'Maris Piper 2kg' && a.steps.length === 8 && a.minutes === +(t.f.afterSec / 60).toFixed(1) && a.targetMinutes === Number(t.rungs.streamlined.replace(' min', '')) && a.checklist?.before.includes('Set the jaw temperature') && !!t.closedAt,
    `4 on the Express standard: ${a?.minutes} min stopped, plan ${a?.targetMinutes} min, ${a?.steps.length} elements and the checklist; the SMED closed as a receipt`);
  await go(`#/w/${sd.wsId}/standards/${sd.lineOnJobId}`);
  const line = (await page.locator('.ls-co-agreed li').allInnerTexts()).map(x => x.replace(/\s+/g, ' '));
  ok(line.some(x => x.includes('Standard from Maris Piper 2kg:') && x.includes(`${t.rungs.separated} stopped · 8 elements, 3 external · plan ${t.rungs.streamlined}`)), `4 the standard shows it: "${line[0]}"`);
}

/* ==== 5 · Prove it — the same changeover timed again ==== */
await go(`${J}/fixes?open=${encodeURIComponent(fixId)}`);
await page.getByRole('button', { name: 'Prove it — time the changeover again' }).click(); await page.waitForTimeout(1800);
const PR = id();
let tp = await truth(PR);
ok(!!PR && PR !== CO && tp.facts.sequence.length === 8 && tp.facts.sequence.every(x => x.source === 'carried' && !x.plan) && tp.uses[0]?.role === 'proof' && tp.facts.running?.daysPerWeek === 5 && tp.facts.rateFrom === 'plate',
  '5 a second SMED: the same eight elements, each carried, the plan left on the evidence; how the line runs and the plate speed kept');
await stage('Record');
await page.getByRole('button', { name: /^Lap — time it again/ }).click(); await page.waitForTimeout(300);
ok(((await words('.co-lap .wb-t-h')) ?? '').includes('up next: Stop and clear the former'), '5 Lap: up next "Stop and clear the former"');
await page.getByRole('button', { name: /^Start — at the last good piece/ }).click(); await page.waitForTimeout(1100);
await page.getByRole('button', { name: /^Next — this one is done/ }).click(); await page.waitForTimeout(500);
await page.getByRole('button', { name: /^Stop — keep what is timed/ }).click(); await page.waitForTimeout(600);
tp = await truth(PR);
ok(tp.facts.sequence.find(x => x.name === 'Stop and clear the former')?.source === 'timed' && tp.facts.sequence.length === 8, '5 the element up next timed again — nothing added');
/* the jaws now heated before the line stops: out of the stop; the rest as they stand */
await card('Set the jaw temperature').locator('.co-step-b').click(); await page.waitForTimeout(300);
await dialog().getByRole('button', { name: 'Take it off', exact: true }).click(); await page.waitForTimeout(600);
for (const name of tp.facts.sequence.filter(x => x.source === 'carried' && x.name !== 'Set the jaw temperature').map(x => x.name)) {
  await card(name).locator('.co-step-b').click(); await page.waitForTimeout(250);
  await dialog().getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(350);
}
tp = await truth(PR);
ok(tp.facts.sequence.length === 7 && !tp.facts.sequence.some(x => x.source === 'carried'), '5 the jaws out of the stop; the rest timed or typed again — none carried');
const ba = await page.evaluate(async ([pid, fid]) => (await import('/src/lib/studyLinks.ts')).beforeAfter(await (await import('/src/db.ts')).listStudies(pid), fid), [sd.projectId, fixId]);
await go(`${J}/fixes?open=${encodeURIComponent(fixId)}`);
await page.locator('.sl-ba').first().waitFor({ timeout: 10000 }).catch(() => {});
ok(!!ba && /^Set the jaw temperature: taken out of the changeover\. 42 min → \d+ min \(−\d+ min\); .* a week back at 6 changeovers\. .*The plan was \d+ min streamlined — .*\.$/.test(ba.text)
  && (await words('.sl-ba')) === `Before → after: ${ba.text}`, `5 before → after, against the plan: "${await words('.sl-ba')}"`);

/* ==== 6 · the client report's PDF ==== */
await page.setViewportSize({ width: 1360, height: 900 });
await go(`${J}/report`);
await page.getByRole('button', { name: 'Full report', exact: true }).first().click(); await page.waitForTimeout(800);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
const pdf = join(OUT, 'client.pdf'); await dl.saveAs(pdf);
await page.getByRole('button', { name: 'Close' }).last().click().catch(() => {}); await page.waitForTimeout(300);
{
  const txt = pdfText(pdf);
  const san = s => s.replace(/→/g, 'to').replace(/[–—−]/g, '-').replace(/\s+/g, ' ');
  const has = s => san(txt).includes(san(s).slice(0, 60));
  const sheet = await page.evaluate(async ([sid, fid, pid, stdId]) => {
    const { getStudy, listTests, getStandard, getWorkspace } = await import('/src/db.ts'); const C = await import('/src/lib/ie/changeover.ts');
    const s = await getStudy(sid); const fx = (await listTests(pid)).find(x => x.id === fid); const std = await getStandard(stdId);
    return C.changeoverSheet(s.facts, C.agreedFor(std?.capacity?.changeovers, s.facts.fromProduct), new Map(s.uses.filter(u => u.step).map(u => [u.step, fx?.title ?? ''])),
      C.moneyOf(s.workspaceId ? await getWorkspace(s.workspaceId) : undefined));
  }, [CO, fixId, sd.projectId, sd.lineOnJobId]);
  ok(has(`Before to after: ${ba.text}`), '6 the client report: the fix carries its before → after');
  ok(has('Evidence') && has(t.title) && has('WHAT IS DONE') && has('THE PLAN') && has('ELAPSED') && sheet.rows.every(r => has(r.name) && has(r.plan)) && has('Being made better: Set the jaw temperature')
    && sheet.lines.every(l => has(l)) && sheet.lines.some(l => /plate speed/.test(l)),
    `6 the client report: "${t.title}" in Evidence — ${sheet.rows.length} elements as a table with who, where, I/E, the plan and the elapsed; the ladder and the cost at the plate speed in words`);
}
await page.setViewportSize({ width: 390, height: 844 });

/* ==== 7 · the 6M job: the line's card and the fishbone ==== */
{
  const line = await page.evaluate(async sid => (await import('/src/lib/studyLinks.ts')).changeoverLine(await (await import('/src/db.ts')).getStudy(sid))?.text, sd.pacedChangeoverId);
  await go(`#/project/${sd.pacedProjectId}?view=lines`);
  ok((await words('.lc-co .lc-bal-k')) === 'SMED' && (await words('.lc-co .lc-bal-t')) === line, `7 the line's card: SMED — "${line}"`);
  const want = await page.evaluate(async ([pid, cid]) => {
    const { loadProblems } = await import('/src/lib/useProblems.ts'); const F = await import('/src/lib/fishbone.ts');
    const loaded = await loadProblems(pid); const c = loaded.cases.find(x => x.id === cid);
    return F.suggestionsFor(c, loaded.data, Date.now()).filter(s => s.source.kind === 'study' && s.source.tool === 'changeover').map(s => ({ text: s.text, m: s.m }));
  }, [sd.pacedProjectId, sd.oldCaseId]).catch(e => String(e));
  await go(`#/project/${sd.pacedProjectId}/fishbone?problem=${sd.oldCaseId}`);
  const offered = Array.isArray(want) ? await Promise.all(want.map(async w => (await page.locator('button.is-sugg', { hasText: w.text }).count()) > 0)) : [];
  ok(Array.isArray(want) && want.some(w => w.m === 'method') && want.some(w => w.m === 'machine') && offered.every(Boolean),
    `7 the fishbone offers SMED: ${Array.isArray(want) ? want.map(w => `${w.text.slice(0, 48)}… (${w.m})`).join('; ') : want}`);
  const ext = Array.isArray(want) ? want.find(w => w.m === 'method') : undefined;
  if (ext) {
    await page.locator('button.is-sugg', { hasText: ext.text }).first().click(); await page.waitForTimeout(600);
    const sheet = (await dialog().textContent()) ?? '';
    await page.getByRole('button', { name: 'Add to the fishbone' }).last().click(); await page.waitForTimeout(1000);
    const c = await page.evaluate(async ([cid, txt]) => ((await (await import('/src/db.ts')).getCase(cid))?.causes ?? []).find(x => x.text === txt), [sd.oldCaseId, ext.text]);
    ok(/SMED: /.test(sheet) && c?.source?.tool === 'changeover' && c.m === 'method', `7 accepted: on ${c?.m}, "SMED" where it came from`);
  }
}

/* ==== a client reads the SMED and changes nothing ==== */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/smed/${PR}`);
await page.locator('.co-steps, .ie-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const doors = await page.locator('.co').getByRole('button', { name: /^Lap|^\+ Type an element|^Set as the standard|Change the products|List the products|how the line runs|^Rename|^→E/ }).allInnerTexts();
  let live = 0;
  for (const st of ['Record', 'Separate', 'Convert', 'Streamline']) {
    await stage(st);
    live += await page.locator('.co-panel .chip, .co-panel input, .co-panel select').evaluateAll(xs => xs.filter(x => !x.disabled).length);
  }
  await page.locator('.co-grid button.co-sq').first().click(); await page.waitForTimeout(300);
  const sheet = (await dialog().innerText()).replace(/\s+/g, ' ');
  const writes = await dialog().getByRole('button', { name: /^Save|^Make it better|Take it off|^Earlier|^Later/ }).count();
  ok((await page.locator('.co-step').count()) > 0 && doors.length === 0 && live === 0 && /Who does it/.test(sheet) && writes === 0,
    `a client reads the SMED — its element sheet too — and changes nothing${doors.length || live || writes ? ` — found: ${doors.join(', ')}, ${live} chips live, ${writes} writes in the sheet` : ''}`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nF accepted: SMED holds — on its own and inside a change');
process.exit(failed ? 1 : 0);
