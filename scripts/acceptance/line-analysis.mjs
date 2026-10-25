/* ACCEPTANCE — ANALYSIS ON A LINE: TICK TOOLS, MAKE THEM, ONE MERGED REPORT (25 October;
 * lib/startStudy, line/StartTogether, line/report/lineBundle whereFor and picksForTools).
 *
 * Rowland, 25 October: "I intend to do analysis on a line ... using the tools I see currently in
 * the app. Capability, failure and reliability MTBF with the failure rate ... I can go to a line,
 * Line 2A for example, click tools, tick multiple tools and then these tools are available and
 * also nice then have a merged report." On the smoke seed, in a real browser, every sentence
 * checked against the module that makes it:
 *
 *   1  a line's Tools page: a tick beside each tool; nothing ticked says what ticking does; two
 *      ticked (Capability, Reliability) are counted and named, with Line report from these and
 *      Start these 2 here; a tool that asks more first (Value stream) ticked says so
 *   2  Start together: one row a tool, Start held until each says what it is of; both made the
 *      line's, each tool's row saying 1 on this line, the page saying what was started
 *   3  the capability study opened from its row and filled in: a measurement between two limits,
 *      thirty readings, the sentence and Ppk as lib/sample says them; a second, pass or fail,
 *      from New ▾; the reliability study set up, the watch run, stops and a failure tapped, the
 *      sentence as lib/reliability says it — and "Against … wanted, it is …", never "it on …"
 *   4  the Tools page ticked again: Line report from these opens the line's report with every
 *      record of those two tools in (three) and nothing else; Where on the line lists their
 *      machines; Tick none / Tick all
 *   5  the paper read back: each record's section under its name, Where on the line naming the
 *      three machines; one unticked and Download again — its section gone from the paper and its
 *      machine gone from Where on the line
 *   6  a dual line (Made of 2a + 2b): the studies of 2a under Line 2a, none under Line 2b
 *   7  the phone: nothing off the side, a tick 32px or more tall
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/line-analysis.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {} } };
const MIN = 60_000;
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const nows = s => String(s ?? '').replace(/\s+/g, '');
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const dir = mkdtempSync(join(tmpdir(), 'line-analysis-'));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
await page.clock.install();
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTool|ERR_/.test(m.text())) errs.push(m.text()); });
const go = async h => { await page.goto(`${BASE}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const later = async ms => { await page.clock.fastForward(ms); await page.waitForTimeout(250); };
const typeAll = async vs => { for (const v of vs) { await page.keyboard.type(String(v)); await page.keyboard.press('Enter'); await page.waitForTimeout(50); } await page.waitForTimeout(600); };
const pdfOf = async click => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), click()]);
  const f = join(dir, `${Date.now()}.pdf`); await d.saveAs(f);
  return { text: execFileSync('pdftotext', ['-layout', f, '-'], { encoding: 'utf8' }), pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
};
const stopsOnId = () => decodeURIComponent((page.url().split(/#\/(?:capability|reliability)\//)[1] ?? '').split('?')[0]);

await go('#/room');
const ids = await page.evaluate(async () => {
  await (await import('/src/dev/seed.ts')).seedForSmokeTest();
  const db = await import('/src/db.ts'); const { addLineToFactory } = await import('/src/lib/lines.ts');
  const a = await addLineToFactory('Line 2a'), bb = await addLineToFactory('Line 2b'), d = await addLineToFactory('2a 2b');
  await db.updateWorkspace({ ...d, madeOf: [a.id, bb.id] });
  return { a: a.id, b: bb.id, d: d.id };
});

/* ---- 1 · the Tools page: a tick a tool ---- */
await go(`#/lines/${ids.a}?view=tools`);
const rows = await page.locator('.pl-tools li.has-tick').count();
const tickLabels = await page.locator('.pl-tick input').evaluateAll(xs => xs.map(x => x.getAttribute('aria-label')));
ok(rows >= 9 && tickLabels.length === rows && tickLabels.includes('Tick Capability') && tickLabels.includes('Tick Reliability'), `1 a tick beside each of the ${rows} tools, Capability and Reliability among them`);
ok(/Tick tools to read them together in one line report, or to start several here at once/.test(flat(await page.locator('.pl-pick-hint').innerText())), '1 nothing ticked — it says what ticking does');
await page.getByLabel('Tick Capability').check(); await page.getByLabel('Tick Reliability').check(); await page.getByLabel('Tick Value stream').check();
let bar = flat(await page.locator('.pl-pick').innerText());
ok(/^3 tools ticked — Value stream, Capability, Reliability|^3 tools ticked — Capability, Value stream, Reliability|^3 tools ticked —/.test(bar) && /Line report from these/.test(bar) && /Start these 2 here/.test(bar), `1 three ticked, counted and named, a line report from them and the two that start here: "${bar.slice(0, 140)}"`);
ok(/Value stream starts from its own row — it asks more first\./.test(bar), '1 a tool that asks more first (Value stream) says it starts from its own row');
await page.getByLabel('Tick Value stream').uncheck();

/* ---- 2 · start together ---- */
await page.getByRole('button', { name: /^Start these 2 here/ }).click();
await page.locator('.st-together').waitFor();
const startBtn = page.locator('.st-together').getByRole('button', { name: /^Start these 2/ });
ok(await startBtn.isDisabled(), '2 Start is held until each says what it is of');
await page.getByLabel('Capability — what is it of').fill('Fill weight — Finest 2kg');
await page.getByLabel('Capability — which machine').fill('Multihead weigher');
ok(await startBtn.isDisabled(), '2 still held with one named');
await page.getByLabel('Reliability — what is it of').fill('Capper stops');
await page.getByLabel('Reliability — which machine').fill('Capper');
await startBtn.click(); await page.waitForTimeout(1200);
const said = flat(await page.locator('.tc-ok').first().innerText());
ok(/^Started on Line 2a: Capability, Reliability\./.test(said), `2 the page says what was started: "${said}"`);
const made = await page.evaluate(async id => (await (await import('/src/db.ts')).listStudiesForLine(id)).map(s => ({ tool: s.tool, name: s.name, machine: s.machine, ws: s.workspaceId })), ids.a);
ok(made.length === 2 && made.every(s => s.ws === ids.a) && made.some(s => s.tool === 'capability' && s.machine === 'Multihead weigher') && made.some(s => s.tool === 'reliability' && s.machine === 'Capper'), '2 both made the line’s, each with its machine', JSON.stringify(made));
const sub = async label => flat(await page.locator('.pl-tools li', { hasText: label }).first().locator('.sub').innerText());
ok(/^1 on this line$/.test(await sub('Capability')) && /^1 on this line$/.test(await sub('Reliability')), '2 each tool’s row says 1 on this line');
ok((await page.locator('.pl-tick input:checked').count()) === 0, '2 the ticks cleared');

/* ---- 3 · the studies made ---- */
/* the capability study from its row; limits and thirty readings */
await page.locator('.pl-tools li', { hasText: 'Capability' }).first().locator('button.pl-tool').click(); await page.waitForTimeout(1200);
await page.locator('.lt-li', { hasText: 'Fill weight' }).first().locator('button.lt-row').click(); await page.waitForTimeout(1200);
const capId = stopsOnId();
await page.getByLabel('Lower limit').fill('1990'); await page.getByLabel('Upper limit').fill('2020');
await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
const READ = [2001, 2003, 1999, 2004, 2000, 2002, 2005, 1998, 2001, 2003, 2000, 2002, 2004, 1999, 2001, 2003, 2002, 2000, 2001, 2004, 2003, 1999, 2002, 2001, 2000, 2003, 2002, 2001, 2004, 2000];
await typeAll(READ);
const capTruth = await page.evaluate(async id => {
  const { getStudy } = await import('/src/db.ts'); const S = await import('/src/tools/capability/sample.ts');
  const s = await getStudy(id); const a = s.agreed?.readings; const f = S.sample(a, s.facts.readings ?? []); const said = S.sampleSays(f, a);
  return { said: said.text, cap: said.capability?.text ?? null, n: f.n, ws: s.workspaceId };
}, capId);
const capSay = flat(await page.locator('.ie-say').first().innerText());
ok(capTruth.n === 30 && capTruth.ws === ids.a && capSay === capTruth.said && /Passed/.test(capSay), `3 capability: "${capSay}"`);
ok(capTruth.cap && flat(await page.locator('.ie-cap').first().innerText()) === capTruth.cap && /Ppk \d\.\d\d from 30/.test(capTruth.cap), `3 how capable, as lib/sample says: "${capTruth.cap}"`);
/* a second capability study, pass or fail, from New ▾ on the line */
await go(`#/lines/${ids.a}?view=tools`);
await page.getByRole('button', { name: /^New/ }).first().click();
await page.getByRole('menuitem', { name: /^Capability/ }).first().click(); await page.waitForTimeout(1000);
await page.getByRole('button', { name: /^New .* study/ }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What is it of?').fill('Seal integrity'); await page.getByLabel(/On which machine/).fill('Ilapak');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
const sealId = stopsOnId();
await page.getByRole('radio', { name: /^Pass or fail/ }).click(); await page.getByLabel('How many may fail').fill('1');
await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
const good = page.getByRole('button', { name: 'Good', exact: true }), bad = page.getByRole('button', { name: 'Failed', exact: true });
for (let i = 1; i <= 20; i++) { await (i === 9 ? bad : good).click(); await page.waitForTimeout(40); }
const sealTruth = await page.evaluate(async id => { const { getStudy } = await import('/src/db.ts'); const S = await import('/src/tools/capability/sample.ts'); const s = await getStudy(id); const a = s.agreed?.readings; return S.sampleSays(S.sample(a, s.facts.readings ?? []), a).text; }, sealId);
ok(flat(await page.locator('.ie-say').first().innerText()) === sealTruth && /1 failed \(no\. 9\), 1 allowed — Passed/.test(sealTruth), `3 pass or fail: "${sealTruth}"`);
/* the reliability study from its row: set up, the watch, taps */
await go(`#/lines/${ids.a}?view=tools`);
await page.locator('.pl-tools li', { hasText: 'Reliability' }).first().locator('button.pl-tool').click(); await page.waitForTimeout(1200);
await page.locator('.lt-li', { hasText: 'Capper stops' }).first().locator('button.lt-row').click(); await page.locator('.ie-agree').waitFor();
const relId = stopsOnId();
await page.locator('.ie-agree [aria-label="Offered"]').getByRole('button', { name: '+ failure' }).click();
await page.locator('input[aria-label="MTBF wanted for stop, minutes"]').fill('30');
await page.locator('input[aria-label="MTBF wanted for failure, minutes"]').fill('120');
await page.getByRole('button', { name: 'Set it up' }).click(); await page.locator('.rl-watch').waitFor();
await page.getByRole('button', { name: 'Start the watch' }).click(); await page.locator('.rl-watch.is-on').waitFor();
const tap = n => page.locator('.rl-buttons').getByRole('button', { name: `Tap a ${n}`, exact: true });
for (const [m, n] of [[10, 'stop'], [25, 'stop'], [40, 'failure'], [20, 'stop'], [35, 'stop'], [15, 'failure'], [30, 'stop']]) { await later(m * MIN); await tap(n).click(); }
await later(5 * MIN); await page.getByRole('button', { name: 'Stop the watch' }).click(); await page.waitForTimeout(500);
const relTruth = await page.evaluate(async id => {
  const db = await import('/src/db.ts'); const R = await import('/src/tools/reliability/reliability.ts'); const s = await db.getStudy(id);
  return { text: R.studyReliabilitySays(s.agreed?.reliability, s.facts.watch, s.facts.events, Date.now()).text, ws: s.workspaceId, machine: s.machine };
}, relId);
ok(relTruth.ws === ids.a && relTruth.machine === 'Capper' && /5 stops in 3 h of watched running/.test(relTruth.text) && /2 failures in 3 h/.test(relTruth.text), `3 reliability, MTBF and failure rate: "${relTruth.text.slice(0, 150)}…"`);
ok(/Against 30 min wanted, it is /.test(relTruth.text) && /Against 2 h wanted, it is /.test(relTruth.text) && !/it (on|below|short) /.test(relTruth.text), '3 "Against … wanted, it is …" — the sentence is a sentence');

/* ---- 4 · the merged report from the Tools page ---- */
await go(`#/lines/${ids.a}?view=tools`);
await page.getByLabel('Tick Capability').check(); await page.getByLabel('Tick Reliability').check();
await page.getByRole('button', { name: /^Line report from these/ }).click(); await page.waitForTimeout(2500);
ok(/#\/lines\/[^/]+\/report\?tools=/.test(page.url()), `4 the line’s report opened asking for those tools (${page.url().split('#')[1]})`);
const ticks = await page.locator('.lr-tick input').evaluateAll(xs => xs.map(x => ({ label: x.getAttribute('aria-label'), on: x.checked })));
ok(ticks.length === 3 && ticks.every(t => t.on), `4 every record of the two tools is in — ${ticks.length}: ${ticks.map(t => t.label).join(' · ')}`);
const whereRows = await page.locator('.lr-where-row [role=rowheader]').allInnerTexts();
ok(['Multihead weigher', 'Ilapak', 'Capper'].every(m => whereRows.map(flat).includes(m)), `4 Where on the line names the three machines (${whereRows.map(flat).join(', ')})`);
ok(/every record of Capability, Reliability is in already/.test(flat(await page.locator('.pl-says').first().innerText())), '4 the page says every record of those tools is in already');
await page.getByRole('button', { name: 'Tick none' }).click();
ok((await page.locator('.lr-tick input:checked').count()) === 0 && (await page.locator('.lr-where-row').count()) === 0, '4 Tick none — nothing in, and Where on the line empty with it');
await page.getByRole('button', { name: 'Tick all' }).click();
ok((await page.locator('.lr-tick input:checked').count()) === 3, '4 Tick all — the three back');

/* ---- 5 · the paper ---- */
const p1 = await pdfOf(() => page.getByRole('button', { name: 'Download' }).click());
const heads = ['Capability — Seal integrity · Ilapak', 'Capability — Fill weight — Finest 2kg · Multihead weigher', 'Reliability — Capper stops · Capper'];
ok(heads.every(h => nows(p1.text).includes(nows(h))), `5 each record’s section under its name (${p1.pages} pages)`);
ok(nows(p1.text).includes(nows(capTruth.said.slice(0, 40))) && nows(p1.text).includes(nows(sealTruth.slice(0, 40))) && nows(p1.text).includes(nows(relTruth.text.slice(0, 40))), '5 each study’s sentence is on the paper');
ok(/Where on the line/.test(p1.text) && /3 machines with findings/.test(p1.text) && /Capper/.test(p1.text.split('Where on the line')[1] ?? ''), '5 Where on the line on the paper, three machines');
ok(/Counted side by side/.test(p1.text) && /MTBF/.test(p1.text), '5 the reliability study’s own blocks: counted side by side, MTBF');
ok(/EACH ONE, IN THE ORDER CHECKED/i.test(p1.text) && /HISTOGRAM|how the readings spread/i.test(p1.text), '5 the capability studies’ own blocks: each one in order, how the readings spread');
await page.locator('.lr-tick input[aria-label^="Reliability"]').uncheck(); await page.waitForTimeout(300);
const p2 = await pdfOf(() => page.getByRole('button', { name: 'Download' }).click());
ok(!nows(p2.text).includes(nows('Reliability — Capper stops')) && !/Counted side by side/.test(p2.text), '5 Reliability unticked — its section gone from the paper');
ok(!/\bCapper\b/.test(p2.text.split('Where on the line')[1]?.split(/Capability —/)[0] ?? 'x') && /2 machines with findings/.test(p2.text), '5 …and its machine gone from Where on the line');
ok(heads.slice(0, 2).every(h => nows(p2.text).includes(nows(h))), '5 the capability studies kept');

/* ---- 6 · a dual line ---- */
await go(`#/lines/${ids.d}/report`);
const parts = await page.locator('.lr-part > h2').allInnerTexts();
ok(parts.map(x => flat(x).split(' ·')[0]).join('|') === 'Line 2a|Line 2b|Both lines together', `6 a dual line — each line, then both together (${parts.map(flat).join(' → ')})`);
ok((await page.locator('.lr-part').nth(0).locator('.lr-tick').count()) === 3 && (await page.locator('.lr-part').nth(1).locator('.lr-tick').count()) === 0, '6 the three studies are under Line 2a, none under Line 2b');

/* ---- 7 · the phone ---- */
await page.setViewportSize({ width: 390, height: 800 });
await go(`#/lines/${ids.a}/report`);
const tickH = await page.locator('.lr-tick').first().evaluate(e => e.getBoundingClientRect().height);
ok(tickH >= 32 && (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)), `7 the report on a phone: a tick ${Math.round(tickH)}px tall, nothing off the side`);
await go(`#/lines/${ids.a}?view=tools`);
await page.getByLabel('Tick Capability').check();
const tick2 = await page.locator('.pl-tick').first().evaluate(e => e.getBoundingClientRect().height);
ok(tick2 >= 32 && (await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)), `7 the Tools page on a phone: a tick ${Math.round(tick2)}px tall, nothing off the side`);

ok(errs.length === 0, 'no console errors', errs.join(' | '));
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
await b.close();
process.exit(fail ? 1 : 0);
