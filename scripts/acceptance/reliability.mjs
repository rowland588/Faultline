/* A MACHINE'S RELIABILITY, DRIVEN (docs/TOOLKIT.md, tool 13). Rowland, 21
 * October: "a person stood at a machine, tapping a button every time an
 * event happened ... also I start a clock watch I can stop and start ...
 * then we do a failure rate, and commentary, report etc graphs"; and 22
 * October: "I could have a failure, but I also might want to do stops. I
 * might want to count something else ... three buttons ... three data sets
 * going on. There's three of everything going on."
 *
 * On the seeded line, the page's clock run by the script (Playwright's clock),
 * so a watched hour is an hour:
 *
 *   1  Reliability on the rail's tools, lit on its list; the seeded study's
 *      row as the module says it — both its counts
 *   2  a new one made from the list on the line — its machine offered from
 *      the line — and set up: what is counted, stop there to start with, a
 *      failure added from the words offered and the floor's own word typed;
 *      one taken off (listed with Bring back) and brought back; each its own
 *      MTBF wanted and minutes stood; no "What can one be?" box
 *   3  a button for each, refused until the watch runs; the watch started,
 *      each tapped as they come — the tap said back as its own, one undone
 *      at once — the watch stopped and nothing counted while it is stopped;
 *      each count's figures its own on the one watch: counted side by side
 *      a row each, and each one's tiles, sentence, what it means and cost
 *      as lib/ie/reliability says them, a chip apart
 *   4  carried on the next day: the watched time and every count add up, a
 *      day a row, the MTBF day by day drawn, the gaps drawn, the others
 *      drawn on the same graph, the band said for every count
 *   5  one count's MTBF wanted changed — its verdict, and the band, moving
 *      as the module says
 *   6  every tap listed with what it counted, one struck and its count's
 *      figures moving, restored
 *   7  the commentary — written, edited, deleted with Undo, kept after a reload
 *   8  on paper: counted side by side, then each count's own section, the
 *      commentary and the closing line
 *   9  the list's row (every count), the line's page and the front door
 *  10  the phone: a button each, big; nothing off the side; a watch left on
 *      all night asked about and stopped at its last tap
 *  11  its money to the model (FC-058): the two parts, where the machine stops the line
 *  12  repair times (FC-059, FC-055): a stop timed — help arrived, running again, a chip, a time
 *      said; one left open past four hours; the figures, the bar for each stop, a fitter's time
 *      in money, the running time less the stops' minutes, on paper, a closed study, the phone
 *  13  calls for help (FC-015): reasons, response and clearing, ranked by the minutes waited,
 *      by shift, never by person — against the independent case
 *  14  reliability growth (FC-061): the record's fourteen failures in 2,000 running hours — β,
 *      the MTBF now, the projection as an "if"; five jams not yet fitted; on paper
 *  15  how a part wears (FC-060): the twelve heater failures typed on the page, a part still
 *      running, struck and restored, the belt's gaps as lives; the plot; when to change it
 *  16  the seeded study with every part loads and says each
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/reliability.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SHOTS = process.env.SHOTS;
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
const MIN = 60_000;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const dir = mkdtempSync(join(tmpdir(), 'fl-reliability-'));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
await page.clock.install();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const shot = async name => { if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true }); };
const pdfText = async click => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click()]);
  const f = join(dir, `${Date.now()}.pdf`); await d.saveAs(f);
  return flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
};
const later = async ms => { await page.clock.fastForward(ms); await page.waitForTimeout(250); };

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* what the module says of a study, from its record as it is stored now — every count's */
const truth = id => page.evaluate(async sid => {
  const db = await import('/src/db.ts'); const R = await import('/src/tools/reliability/reliability.ts'); const L = await import('/src/tools/reliability/reliabilityLean.ts');
  const s = await db.getStudy(sid); const a = s.agreed?.reliability;
  const line = (await db.listWorkspaces()).find(w => w.id === s.workspaceId);
  const { neckOf } = await import('/src/lib/lineLoss.ts');
  const where = { machine: s.machine, neck: neckOf(await db.listAllStandards(), s.workspaceId) };   /* its machine and the line's bottleneck (FC-058) */
  const items = R.relAll(a, s.facts.watch, s.facts.events, Date.now());
  const study = R.studyReliabilitySays(a, s.facts.watch, s.facts.events, Date.now());
  return { name: s.name, study, closing: L.relClosings(items, line, where).text, rows: R.relRows(items, line, where).map(r => [r.title, String(r.n), r.mtbf]), rowCosts: R.relRows(items, line, where).map(r => r.cost ?? '—'),
    counts: items.map(({ c, f }) => {
      const said = R.reliabilitySays(c, f), cost = R.relCost(f, c, line, where);
      return { id: c.id, name: c.event, n: f.n, hours: f.hours, days: f.days.length, said, tiles: L.relTiles(c, f, cost).map(t => [t.k, t.v]),
        insights: R.reliabilityInsights(c, f).map(x => x.text), costWords: R.costWords(cost), verdict: f.verdict };
    }),
    agreed: a, stretches: (s.facts.watch ?? []).length, events: (s.facts.events ?? []).length, remarks: (s.facts.remarks ?? []).filter(r => !r.struck).map(r => r.text) };
}, id);
const screenTiles = async () => (await page.locator('.rl-counted .ie-strip .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
const seeFor = async title => { await page.locator('.rl-seen').getByRole('button', { name: title, exact: true }).click(); await page.waitForTimeout(250); };
const countBtn = name => page.locator('.rl-buttons').getByRole('button', { name: `Tap a ${name}`, exact: true });

/* ---- 1 the rail, the list ---- */
await go('#/reliability');
/* since B2 the factory's rail says Tools, lit on a tool's list, and the context bar names the tool */
const railOn = await page.locator('.nv-rail [aria-current="page"]').allInnerTexts().catch(() => []);
const ctxSays = (await page.locator('.nv-top .nv-ctx').innerText()).replace(/\s+/g, ' ').trim();
ok(railOn.some(t => /^Tools$/.test(t.trim())) && /Tools › Reliability$/.test(ctxSays), '1 Tools lit on the rail on its list, the bar saying Reliability', `${railOn.join(' | ')} — ${ctxSays}`);
ok(/^Reliability$/.test(flat(await page.locator('h1').first().innerText())), '1 the list’s name');
{
  const t = await truth(sd.reliabilityId);
  const row = flat(await page.locator(`.lt-li[data-study="${sd.reliabilityId}"]`).innerText());
  ok(row.includes(t.study.verdict) && row.includes(`${t.counts[0].n} stops`) && row.includes(`${t.counts[1].n} failures`) && row.includes('watching now'),
    '1 the seeded study’s row — every count’s MTBF, its stops and failures, watching now, as the module says', row);
}

/* ---- 2 a new one, set up: what is counted ---- */
await page.getByRole('button', { name: 'New reliability study' }).first().click();
await page.locator('select[aria-label="Which line"]').selectOption(sd.wsId);
await page.waitForTimeout(500);
const offered = await page.locator('#new-study-machines option').evaluateAll(os => os.map(o => o.value));
ok(offered.length > 0, '2 the line’s machines offered for which machine', offered.join(', '));
ok(!/optional/i.test(flat(await page.locator('.lt-new').innerText())), '2 the new study asks in plain words — no "optional"', flat(await page.locator('.lt-new').innerText()));
await page.locator('.lt-new input.text-input').first().fill('Capper stops');
await page.locator('.lt-new input[list="new-study-machines"], .lt-new input.text-input').nth(1).fill('Capper');
await page.getByRole('button', { name: 'Start it' }).click();
await page.waitForURL(/#\/reliability\/[^/?]+/, { timeout: 10000 });
const RID = decodeURIComponent(page.url().split('#/reliability/')[1].split('?')[0]);
await page.locator('.ie-agree').waitFor();
ok(await page.locator('.ie-agree h2').innerText() === 'What are you counting?', '2 set up first — what are you counting?');
ok(!/What can one be|optional/i.test(flat(await page.locator('.ie-agree').innerText())), '2 no "What can one be?" box, and no "optional" — every box says what it is for', flat(await page.locator('.ie-agree').innerText()).slice(0, 400));
ok(await page.locator('input[aria-label="What is counted, 1"]').inputValue() === 'stop', '2 a stop counted to start with');
await page.locator('.ie-agree [aria-label="Offered"]').getByRole('button', { name: '+ failure' }).click();
await page.locator('input[aria-label="Add your own thing to count"]').fill('Bottle down');
await page.getByRole('button', { name: 'Add', exact: true }).click();
ok(await page.locator('.rl-count').count() === 3 && await page.locator('input[aria-label="What is counted, 3"]').inputValue() === 'bottle down', '2 a failure added from the words offered, and the floor’s own word typed in');
await page.getByRole('button', { name: 'Take bottle down off' }).click();
ok(await page.locator('.rl-count').count() === 2, '2 one taken off');
await page.locator('input[aria-label="Add your own thing to count"]').fill('bottle down');
await page.getByRole('button', { name: 'Add', exact: true }).click();
ok(await page.locator('.rl-count').count() === 3, '2 and added back by its name, never a second of it');
await page.locator('input[aria-label="MTBF wanted for stop, minutes"]').fill('30');
await page.locator('input[aria-label="Minutes the line stands for each stop"]').fill('2');
await page.locator('input[aria-label="MTBF wanted for failure, minutes"]').fill('120');
await shot('rl-setup');
await page.getByRole('button', { name: 'Set it up' }).click();
await page.locator('.rl-watch').waitFor();
{
  const s = await page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)), RID);
  ok(s.workspaceId === sd.wsId && s.machine === 'Capper' && s.tool === 'reliability', '2 made on the line, of its machine', JSON.stringify({ ws: s.workspaceId, m: s.machine }));
  const c = s.agreed?.reliability?.counts ?? [];
  ok(JSON.stringify(c.map(x => [x.name, x.targetMin ?? null, x.downMin ?? null])) === JSON.stringify([['stop', 30, 2], ['failure', 120, null], ['bottle down', null, null]]) && !s.agreed.reliability.kinds,
    '2 what was agreed kept — three things counted, each with its own', JSON.stringify(s.agreed));
}

/* ---- 3 a button each, on the one watch ---- */
ok(await page.locator('.rl-buttons .rl-event').count() === 3, '3 a button for each thing counted', String(await page.locator('.rl-buttons .rl-event').count()));
ok((await page.locator('.rl-buttons .rl-event').evaluateAll(bs => bs.every(b => b.disabled))) && /start the watch first/.test(await countBtn('stop').innerText()), '3 every button refused until the watch runs');
await page.getByRole('button', { name: 'Start the watch' }).click();
await page.locator('.rl-watch.is-on').waitFor();
ok(await countBtn('failure').isEnabled(), '3 the watch started — every button takes taps');
await later(10 * MIN); await countBtn('stop').click();
await page.locator('.rl-last').waitFor();
ok(/^Stop 1 at /.test(flat(await page.locator('.rl-last').innerText())), '3 the tap said back as its own — Stop 1 at its time', await page.locator('.rl-last').innerText());
await later(5 * MIN); await countBtn('failure').click();
await page.waitForTimeout(250);
ok(/^Failure 1 at /.test(flat(await page.locator('.rl-last').innerText())), '3 a failure tapped in the same stretch said back as its own — Failure 1', await page.locator('.rl-last').innerText());
await later(20 * MIN); await countBtn('stop').click();
await later(1 * MIN); await countBtn('bottle down').click();
await later(9 * MIN); await countBtn('stop').click();
await later(20 * MIN); await countBtn('stop').click();
await later(1 * MIN); await countBtn('stop').click();
await page.waitForTimeout(300);
await page.locator('.rl-last').getByRole('button', { name: /^Undo/ }).click();
await page.waitForTimeout(300);
await later(15 * MIN);
await page.getByRole('button', { name: 'Stop the watch' }).click();
await page.locator('.rl-watch:not(.is-on)').waitFor();
ok(await page.locator('.rl-buttons .rl-event').evaluateAll(bs => bs.every(b => b.disabled)), '3 the watch stopped — no tap counts while it is stopped');
await later(40 * MIN);
await page.waitForTimeout(600);
{
  const t = await truth(RID);
  /* the clock runs on while the script clicks: within a quarter of a minute */
  ok(JSON.stringify(t.counts.map(c => [c.name, c.n])) === JSON.stringify([['stop', 4], ['failure', 1], ['bottle down', 1]]) && t.counts.every(c => Math.abs(c.hours - 81 / 60) < 0.25 / 60) && t.events === 7,
    '3 each counted on its own, on the one 81-minute watch — four stops, a failure, a bottle down; the undone one kept struck', JSON.stringify(t.counts.map(c => [c.name, c.n, c.hours])));
  const rows = await page.locator('.rl-together tbody tr').evaluateAll(trs => trs.map(tr => [...tr.querySelectorAll('td')].slice(0, 3).map(td => td.textContent.trim())));
  ok(JSON.stringify(rows) === JSON.stringify(t.rows), '3 counted side by side — a row each, its taps and MTBF as the module says', `${JSON.stringify(rows)} vs ${JSON.stringify(t.rows)}`);
  for (const c of t.counts) {
    await seeFor(c.name === 'stop' ? 'Stops' : c.name === 'failure' ? 'Failures' : 'Bottle downs');
    const tiles = await screenTiles();
    ok(JSON.stringify(tiles) === JSON.stringify(c.tiles), `3 ${c.name}: its five tiles as the module says`, `${JSON.stringify(tiles)} vs ${JSON.stringify(c.tiles)}`);
    ok(flat(await page.locator('.rl-counted .ie-say').innerText()) === c.said.text, `3 ${c.name}: its sentence as the module says`, await page.locator('.rl-counted .ie-say').innerText());
    const ins = (await page.locator('.rl-counted .ln-ins li').allInnerTexts()).map(flat);
    ok(c.insights.every(x => ins.some(y => y.includes(x))), `3 ${c.name}: what it means as the module says`, `${ins.join(' | ')} vs ${c.insights.join(' | ')}`);
  }
  await seeFor('Stops');
  ok((await screenTiles())[0][1] === '20 min', '3 stops: MTBF 20 min (81 min ÷ 4)', JSON.stringify(await screenTiles()));
  ok(flat(await page.locator('.rl-cost').innerText()) === `What it costs: ${t.counts[0].costWords}.`, '3 stops: what they cost, from the minutes stood each', await page.locator('.rl-cost').innerText());
}
await shot('rl-day1');

/* ---- 4 carried on the next day ---- */
await later(24 * 60 * MIN);
await page.getByRole('button', { name: 'Start the watch again' }).click();
await page.locator('.rl-watch.is-on').waitFor();
await later(12 * MIN); await countBtn('stop').click();
await later(13 * MIN); await countBtn('failure').click();
await later(5 * MIN);
await page.getByRole('button', { name: 'Stop the watch' }).click();
await page.locator('.rl-watch:not(.is-on)').waitFor();
await page.waitForTimeout(500);
{
  const t = await truth(RID);
  ok(JSON.stringify(t.counts.map(c => c.n)) === JSON.stringify([5, 2, 1]) && Math.abs(t.counts[0].hours - 111 / 60) < 0.4 / 60 && t.stretches === 2 && t.counts[0].days === 2,
    '4 the next day adds to every count — 5 stops, 2 failures, 1 bottle down in 111 min, two stretches on two days', JSON.stringify(t.counts.map(c => [c.name, c.n, c.hours, c.days])));
  await seeFor('Stops');
  ok(JSON.stringify(await screenTiles()) === JSON.stringify(t.counts[0].tiles), '4 stops: the tiles as the module says', JSON.stringify(await screenTiles()));
  ok(await page.locator('.rl-counted .rl-days tbody tr').count() === 3, '4 stops: a day a row, and all of it');
  ok(await page.locator('.rl-counted .ln-trend').count() === 1, '4 stops: the MTBF day by day drawn');
  ok(await page.locator('.rl-counted .rl-fig .rl-med').count() === 1, '4 stops: the gaps between them drawn');
  ok(await page.locator('.rl-counted .rl-fig .rl-other').count() === 2, '4 the failures and bottle downs drawn on the stops’ graph — the same watch', String(await page.locator('.rl-counted .rl-fig .rl-other').count()));
  ok(await page.locator('.rl-kindbars').count() === 0, '4 no "what they were" — nothing told apart by kind any more');
  const band = flat(await page.locator('.ln-band .ln-verdict').innerText());
  ok(band === t.study.verdict && /^Stops .+ · Failures .+ · Bottle downs /.test(band), '4 the band says every count’s MTBF, as the module says', `${band} / ${t.study.verdict}`);
}
await shot('rl-day2');

/* ---- 5 one count's MTBF wanted changed ---- */
await page.getByRole('button', { name: 'Change what was agreed' }).click();
await page.locator('input[aria-label="MTBF wanted for stop, minutes"]').fill('5');
await page.getByRole('button', { name: 'Keep it' }).click();
await page.locator('.rl-watch').waitFor();
await page.waitForTimeout(400);
{
  const t = await truth(RID);
  const band = flat(await page.locator('.ln-band .ln-verdict').innerText());
  const stopRow = flat(await page.locator('.rl-together tbody tr').first().innerText());
  ok(t.counts[0].verdict === 'met' && /5 min wanted — meets it/.test(stopRow), '5 stops against 5 min wanted: meets it, on its row', stopRow);
  ok(band === t.study.verdict && t.counts[1].verdict, '5 the band as the module says, the failures still against their own 120 min', `${band} / ${JSON.stringify(t.counts.map(c => c.verdict))}`);
}

/* ---- 6 every tap, one struck ---- */
await page.getByRole('button', { name: /^Every tap/ }).click();
const rows = page.locator('.ie-all .ie-rows li');
ok(await rows.count() === 9, '6 every tap listed, the undone one among them', String(await rows.count()));
ok(/^Stop$/.test(flat(await rows.nth(0).locator('b').innerText())) && /^Failure$/.test(flat(await rows.nth(1).locator('b').innerText())), '6 each tap says what it counted');
await rows.nth(0).getByRole('button', { name: 'Strike' }).click();
await page.waitForTimeout(400);
{
  const t = await truth(RID);
  await seeFor('Stops');
  ok(t.counts[0].n === 4 && t.counts[1].n === 2 && JSON.stringify(await screenTiles()) === JSON.stringify(t.counts[0].tiles), '6 a stop struck — four stops counted, the failures untouched, the tiles moved with it', JSON.stringify(await screenTiles()));
}
await rows.nth(0).getByRole('button', { name: 'Restore' }).click();
await page.waitForTimeout(400);
ok((await truth(RID)).counts[0].n === 5, '6 and restored');

/* ---- 7 the commentary ---- */
const box = page.locator('textarea[aria-label="Add to the commentary"]');
await box.fill('Capper jams once the cap hopper runs low.');
await page.locator('.rl-remarks').getByRole('button', { name: 'Add' }).click();
await page.waitForTimeout(300);
ok(await page.locator('.rl-rem li[data-remark]').count() === 1, '7 a remark written and kept');
await page.locator('.rl-rem li[data-remark]').first().getByRole('button', { name: 'Edit' }).click();
await page.locator('textarea[aria-label="The remark"]').fill('Capper jams once the cap hopper runs below a quarter.');
await page.getByRole('button', { name: 'Keep', exact: true }).click();
await page.waitForTimeout(300);
ok(/below a quarter/.test(await page.locator('.rl-rem li[data-remark]').first().innerText()) && /edited/.test(await page.locator('.rl-rem li[data-remark]').first().innerText()), '7 edited where it sits, said edited');
await page.locator('.rl-rem li[data-remark]').first().getByRole('button', { name: 'Delete' }).click();
await page.waitForTimeout(300);
ok(await page.locator('.rl-rem li[data-remark]').count() === 0, '7 deleted');
await page.getByRole('button', { name: /^Show the 1 taken off/ }).click();
await page.getByRole('button', { name: 'Undo — bring it back' }).click();
await page.waitForTimeout(300);
await go(`#/reliability/${RID}`);
ok((await truth(RID)).remarks.length === 1 && await page.locator('.rl-rem li[data-remark]').count() === 1, '7 brought back with Undo, and kept after a reload');

/* ---- 8 on paper ---- */
{
  const t = await truth(RID);
  const text = await pdfText(() => pressPaper(page, / — on paper$/));
  ok(/RELIABILITY STUDY/i.test(text) && text.includes('Capper stops'), '8 on paper — what it is and its name', text.slice(0, 300));
  ok(text.includes('Counted side by side') && t.rows.every(([title, , mtbf]) => text.includes(title) && text.includes(mtbf)), '8 counted side by side — every count and its MTBF', JSON.stringify(t.rows));
  ok(t.counts.every(c => c.tiles.every(([k]) => text.includes(k.toUpperCase()) || text.includes(k)) && text.includes(c.tiles[0][1])), '8 each count’s own tiles — MTBF and the rest');
  ok(text.includes('Stops against watched hours') && text.includes('Failures against watched hours') && text.includes('Stops — MTBF, day by day') && text.includes('Stops — day by day'), '8 each count’s graphs and its days, under its own name');
  ok(text.includes('Commentary') && text.includes('below a quarter'), '8 the commentary');
  ok(text.includes(flat(t.closing).slice(0, 40)), '8 the closing line', t.closing);
}
await shot('rl-paper-page');

/* ---- 9 the list, the line, the front door ---- */
await go('#/reliability');
{
  const t = await truth(RID);
  const row = flat(await page.locator(`.lt-li[data-study="${RID}"]`).innerText());
  ok(row.includes('Capper stops') && row.includes(t.study.verdict) && row.includes('5 stops · 2 failures · 1 bottle down') && !row.includes('watching now'), '9 the list’s row says every count', row);
}
await go(`#/lines/${sd.wsId}`);
{
  const tile = page.locator('.pl-tool', { has: page.locator('b', { hasText: /^Reliability$/ }) });
  const said = flat(await tile.innerText());
  ok(/3 on this line/.test(said) && said.includes('Capper stops'), '9 the line’s page — Reliability with its latest and how many (the seeded two and this one)', said);
}
/* the front door that listed the tools is gone (23 October, one home): the library is Tools in the menu */
await go('#/');
await page.locator('.nv-rail .nv-ri', { hasText: /^Tools$/ }).click(); await page.waitForTimeout(1500);
ok(page.url().endsWith('#/tools') && /Reliability/.test(await page.locator('.et-row').allInnerTexts().then(r => r.join(' | '))), '9 the menu\'s Tools lists it among the tools', page.url());

/* ---- 10 the phone ---- */
{
  const p = await ctx.newPage();
  await p.setViewportSize({ width: 390, height: 844 });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto(`${BASE}/#/reliability/${sd.reliabilityId}`);
  await p.locator('.rl-watch').waitFor({ timeout: 15000 });
  await p.waitForTimeout(1200);
  const fit = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
  ok(fit.sw <= fit.w + 1, '10 the phone — nothing off the side', JSON.stringify(fit));
  const boxes = await p.locator('.rl-buttons .rl-event').evaluateAll(bs => bs.map(b => { const r = b.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; }));
  ok(boxes.length === 2 && boxes.every(b => b.h >= 96 && b.w >= 140), '10 a button for each thing counted, big on a phone', JSON.stringify(boxes));
  ok(await p.locator('.rl-watch.is-on .rl-go').innerText() === 'Stop the watch', '10 the watch running, its stop at hand');
  if (SHOTS) await p.screenshot({ path: join(SHOTS, 'rl-phone.png'), fullPage: true });
  /* the clock is a day on from the seed: the seeded watch has run all night — asked about, stopped at its last tap in one press */
  const left = p.locator('.rl-lefton');
  ok(await left.count() === 1 && /without a stop — left on\?/.test(flat(await left.innerText())), '10 a watch left running all night asked about', await left.count() ? await left.innerText() : 'none');
  await left.getByRole('button').click();
  await p.locator('.rl-watch:not(.is-on)').waitFor({ timeout: 5000 });
  const ended = await p.evaluate(async id => {
    const s = await (await import('/src/db.ts')).getStudy(id);
    const run = [...s.facts.watch].sort((x, y) => y.from - x.from)[0];
    const lastIn = s.facts.events.filter(e => !e.struck && e.at >= run.from).sort((x, y) => y.at - x.at)[0];
    return { to: run.to, at: lastIn?.at };
  }, sd.reliabilityId);
  ok(ended.to !== undefined && ended.to === ended.at, '10 stopped at its last tap — the night not counted as watched', JSON.stringify(ended));
  await p.close();
}

/* ---- 11 its money to the model (knowledge/specs/FC-058-reliability-money.md; MONEY.md causation D): the two parts never
   blended, contribution not margin, the packs counted lost only where the study's machine stops the line ---- */
{
  const s0 = await page.evaluate(async id => (await import('/src/db.ts')).getStudy(id), RID);
  const ws0 = await page.evaluate(async id => (await import('/src/db.ts')).getWorkspace(id), s0.workspaceId);
  const setLine = async ws => { await page.evaluate(async ws => { await (await import('/src/db.ts')).updateWorkspace(ws); }, ws); };
  const setMachine = async m => { await page.evaluate(async ([id, m]) => { await (await import('/src/db.ts')).patchStudy(id, { machine: m }); }, [RID, m]); };
  const neck = await page.evaluate(async ws => { const db = await import('/src/db.ts'); const { neckOf } = await import('/src/lib/lineLoss.ts'); return neckOf(await db.listAllStandards(), ws); }, s0.workspaceId);
  ok(!!neck?.names?.length, '11 the study’s line has a bottleneck from Line capacity', JSON.stringify(neck));
  await setLine({ ...ws0, crew: 4, labourRatePerHour: 12, labourBurden: 1.25, packsPerMin: 60, marginPerPack: 0.1 });
  /* a machine that is not the bottleneck: labour only, the line runs round it */
  await setMachine('Kit shelf');
  await go(`#/reliability/${RID}`);
  let t = await truth(RID);
  let cost = flat(await page.locator('.rl-cost').innerText());
  ok(cost === `What it costs: ${t.counts[0].costWords}.` && /of the crew’s time · no packs lost — Kit shelf is not the bottleneck, so the line runs round it/.test(cost) && !/packs not made/.test(cost),
    '11 off the bottleneck — the crew’s time, no packs lost, said why', cost);
  ok(JSON.stringify(await screenTiles()) === JSON.stringify(t.counts[0].tiles) && /labour$/.test(t.counts[0].tiles[4][1]), '11 the What it costs tile — the labour, as the module says', JSON.stringify(t.counts[0].tiles[4]));
  /* the machine the bottleneck's: the packs and their contribution, two parts never blended */
  await setMachine(neck.names[0]);
  await go(`#/reliability/${RID}`);
  t = await truth(RID);
  cost = flat(await page.locator('.rl-cost').innerText());
  ok(cost === `What it costs: ${t.counts[0].costWords}.` && new RegExp(`packs not made at ${neck.names[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, the bottleneck \\(£[\\d.,]+ contribution\\)`).test(cost),
    '11 on the bottleneck — the packs not made and their contribution', cost);
  const cells = await page.locator('.rl-together tbody tr .rl-cost-cell').evaluateAll(es => es.map(e => e.textContent.trim()));
  /* a count with no minutes stood typed says no money ("—"); the ones that do say the two parts */
  const priced = cells.filter(c => c !== '—');
  ok(cells.length === t.rowCosts.length && cells.every((c, i) => c === t.rowCosts[i]) && priced.length >= 1 && priced.every(c => /^£[\d.,]+ labour · £[\d.,]+ contribution$/.test(c)), '11 the side-by-side rows — the two parts, never a sum', JSON.stringify(cells));
  const text = await pdfText(() => pressPaper(page, / — on paper$/));
  ok(text.includes(flat(t.counts[0].costWords).slice(0, 60)) && priced.every(c => text.includes(c)), '11 the paper carries the sentence and the two parts', text.slice(0, 200));
  await setMachine(s0.machine); await setLine(ws0);
}

/* ---- 12 repair times: a stop timed — help arrived, running again, a time said (FC-059; FC-055 how long the short stops are) ----
   knowledge/specs/FC-059-repair-times.md. The line gets its cost model; the study is set up on the page with a timed stop,
   reasons and a fitter's rate; five stops are made and stamped with the page's clock, a chip and a typed time; one left open
   past four hours; the figures are the module's and, for the numbers that can be known, a hand's. */
const tz = id => page.evaluate(async sid => {
  const db = await import('/src/db.ts'); const R = await import('/src/tools/reliability/reliability.ts'); const P = await import('/src/tools/reliability/repair.ts');
  const L = await import('/src/tools/reliability/reliabilityLean.ts'); const { neckOf } = await import('/src/lib/lineLoss.ts');
  const s = await db.getStudy(sid); const line = (await db.listWorkspaces()).find(w => w.id === s.workspaceId);
  const where = { machine: s.machine, neck: neckOf(await db.listAllStandards(), s.workspaceId) };
  const items = R.relAll(s.agreed?.reliability, s.facts.watch, s.facts.events, Date.now());
  return items.map(({ c, f, r, k }) => {
    const cost = R.relCost(f, c, line, where);
    return { id: c.id, name: c.event, hours: f.hours, watchedH: f.watchedH, downH: f.downH, n: f.n,
      tiles: L.relTiles(c, f, cost, { r, k }).map(t => [t.k, t.v]),
      repairSays: r ? P.repairSays(c.event, f, r).text : null, repairIns: r ? P.repairInsights(c.event, f, r).map(x => x.text) : [],
      r: r ? { timed: r.timed, open: r.open, stale: r.stale, typed: r.typed, mean: r.meanMin, median: r.medianMin, max: r.maxMin, helped: r.helped, waitShare: r.waitShare } : null,
      fitter: r ? P.fitterWords(P.fitterCost(r, f.rate, c.fitterRate)) : '', cost: R.costWords(cost),
      callSays: k ? P.callSays(c.event, k).text : null, callIns: k ? P.callInsights(c.event, k, !!c.reasons?.length).map(x => x.text) : [],
      callReasons: k ? k.reasons.map(x => x.reason) : [], k: k ? { calls: k.calls, within: k.within, respMedian: k.respMedianMin, resMedian: k.resMedianMin, wait: k.waitTotalMin } : null,
      wait: k ? R.waitWords(R.waitCost(k, f, c, line, where)) : '', closing: L.relClosings(items, line, where).text };
  });
}, id);
const newStudy = async (name, machine) => {
  await go('#/reliability');
  await page.getByRole('button', { name: 'New reliability study' }).first().click();
  await page.locator('select[aria-label="Which line"]').selectOption(sd.wsId);
  await page.waitForTimeout(500);
  await page.locator('.lt-new input.text-input').first().fill(name);
  await page.locator('.lt-new input[list="new-study-machines"], .lt-new input.text-input').nth(1).fill(machine);
  await page.getByRole('button', { name: 'Start it' }).click();
  await page.waitForURL(/#\/reliability\/[^/?]+/, { timeout: 10000 });
  await page.locator('.ie-agree').waitFor();
  return decodeURIComponent(page.url().split('#/reliability/')[1].split('?')[0]);
};
const more = async () => { await page.locator('.rl-more > summary').first().click(); };
const lineCost = { crew: 4, labourRatePerHour: 12, labourBurden: 1.25, packsPerMin: 60, marginPerPack: 0.1 };
{
  const ws0 = await page.evaluate(async id => (await import('/src/db.ts')).getWorkspace(id), sd.wsId);
  await page.evaluate(async ws => { await (await import('/src/db.ts')).updateWorkspace(ws); }, { ...ws0, ...lineCost });
  const TID = await newStudy('Wrapper repairs', 'Kit shelf');
  await more();
  const opts = await page.locator('select[aria-label="Timing for stop"] option').allInnerTexts();
  ok(opts.length === 3 && /^Count only/.test(opts[0]) && /Time each one/.test(opts[1]) && /A call for help/.test(opts[2]), '12 set-up offers timing: count only, time each one, a call for help', opts.join(' | '));
  await page.locator('select[aria-label="Timing for stop"]').selectOption('stop');
  await page.locator('input[aria-label="Reasons for stop"]').fill('jam, film break, jam');
  await page.locator('input[aria-label="A fitter costs, pounds an hour, for stop"]').fill('30');
  await page.locator('input[aria-label="MTBF wanted for stop, minutes"]').fill('30');
  await page.locator('input[aria-label="Reasons for stop"]').fill('1,2,3,4,5,6,7,8,9');
  ok(/at most/.test(await page.locator('.ie-problem').innerText()) && await page.getByRole('button', { name: 'Set it up' }).isDisabled(), '12 more than eight reasons refused, Set it up held', await page.locator('.ie-problem').innerText().catch(() => ''));
  await page.locator('input[aria-label="Reasons for stop"]').fill('jam, film break, jam');
  await page.getByRole('button', { name: 'Set it up' }).click();
  await page.locator('.rl-watch').waitFor();
  {
    const s = await page.evaluate(async id => (await import('/src/db.ts')).getStudy(id), TID);
    const c = s.agreed.reliability.counts[0];
    ok(c.timed === 'stop' && JSON.stringify(c.reasons) === JSON.stringify(['jam', 'film break']) && c.fitterRate === 30 && c.targetMin === 30, '12 what was agreed kept — timed, two reasons (none twice), a fitter at £30', JSON.stringify(c));
  }
  ok(/each timed/.test(await page.locator('.ie-agreed').innerText()) && /a fitter £30 an hour/.test(await page.locator('.ie-agreed').innerText()) && /reasons: jam, film break/.test(await page.locator('.ie-agreed').innerText()), '12 the agreed line says it', await page.locator('.ie-agreed').innerText());

  await page.getByRole('button', { name: 'Start the watch' }).click();
  await page.locator('.rl-watch.is-on').waitFor();
  const stopBtn = () => countBtn('stop');
  const rowOf = n => page.locator('.rl-open-row').nth(n);
  /* 1 — clocked: help after 1 min, running again 3 min later */
  await later(10 * MIN); await stopBtn().click(); await page.locator('.rl-open-row').first().waitFor();
  ok(/^Not yet running again/i.test(flat(await page.locator('.rl-open-h').innerText())) && await page.locator('.rl-open-row').count() === 1, '12 a tap on a timed count opens its row — Not yet running again');
  await later(1 * MIN); await rowOf(0).getByRole('button', { name: 'Help arrived' }).click();
  await page.waitForTimeout(250);
  ok(await rowOf(0).getByRole('button', { name: 'Help arrived' }).count() === 0 && /help came/.test(await rowOf(0).innerText()), '12 help arrived stamped — the button goes, the row says when', await rowOf(0).innerText());
  await later(3 * MIN); await rowOf(0).getByRole('button', { name: 'Running again' }).click();
  await page.waitForTimeout(300);
  ok(await page.locator('.rl-open-row').count() === 0, '12 running again stamped — the row is gone');
  /* 2 — a chip: it took 30 s */
  await later(10 * MIN); await stopBtn().click(); await page.locator('.rl-open-row').first().waitFor();
  await rowOf(0).getByRole('button', { name: '30 s', exact: true }).click(); await page.waitForTimeout(300);
  /* 3 — a time typed: 1:30; a bad one refused with a sentence */
  await later(10 * MIN); await stopBtn().click(); await page.locator('.rl-open-row').first().waitFor();
  await page.locator('input[aria-label="How long stop 3 took"]').fill('abc');
  await rowOf(0).getByRole('button', { name: 'Set', exact: true }).click();
  ok(/Say it as 40 s/.test(await rowOf(0).innerText()), '12 a time that is not one is refused with how to say it', await rowOf(0).innerText());
  await page.locator('input[aria-label="How long stop 3 took"]').fill('1:30');
  await rowOf(0).getByRole('button', { name: 'Set', exact: true }).click(); await page.waitForTimeout(300);
  /* 4 — clocked again: help after 2, running after 3 more; a reason picked */
  await later(10 * MIN); await stopBtn().click(); await page.locator('.rl-open-row').first().waitFor();
  await later(2 * MIN); await rowOf(0).getByRole('button', { name: 'Help arrived' }).click();
  await rowOf(0).getByRole('button', { name: 'jam', exact: true }).click(); await page.waitForTimeout(200);
  ok(await rowOf(0).getByRole('button', { name: 'jam', exact: true }).getAttribute('aria-pressed') === 'true', '12 a reason picked from the count’s own list');
  await later(3 * MIN); await rowOf(0).getByRole('button', { name: 'Running again' }).click(); await page.waitForTimeout(300);
  /* 5 — left open: after four hours it is asked about, with its row marked */
  await later(10 * MIN); await stopBtn().click(); await page.locator('.rl-open-row').first().waitFor();
  await later(5 * 60 * MIN);
  ok(await page.locator('.rl-open-row.is-stale').count() === 1 && /open for more than 4 hours/.test(await page.locator('.rl-open-row.is-stale').innerText()), '12 a stop open for five hours is asked about', await page.locator('.rl-open-row').first().innerText());
  {
    const t = await tz(TID);
    ok(t[0].r.open === 1 && t[0].r.stale === 1 && t[0].repairSays.includes('not yet cleared') === false, '12 the open stop is counted as down until cleared and named stale in the module', JSON.stringify(t[0].r));
    ok(t[0].repairIns.some(x => /open for more than 4 hours/.test(x)), '12 what it means says so');
  }
  /* the phone: the open row's buttons are the thumb's, nothing off the side */
  {
    const p = await ctx.newPage(); await p.setViewportSize({ width: 390, height: 844 }); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${BASE}/#/reliability/${TID}`); await p.locator('.rl-watch').waitFor({ timeout: 15000 }); await p.waitForTimeout(1200);
    const fit = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    const bs = await p.locator('.rl-open-row .rl-open-acts .btn').evaluateAll(b => b.map(x => Math.round(x.getBoundingClientRect().height)));
    ok(fit.sw <= fit.w + 1 && bs.length >= 1 && bs.every(h => h >= 44), '12 the phone — nothing off the side, the open row’s buttons at least 44 px', JSON.stringify({ fit, bs }));
    if (SHOTS) await p.screenshot({ path: join(SHOTS, 'rl-open-phone.png'), fullPage: true });
    await p.close();
  }
  await page.locator('input[aria-label="How long stop 5 took"]').fill('2 min');
  await rowOf(0).getByRole('button', { name: 'Set', exact: true }).click(); await page.waitForTimeout(300);
  ok(await page.locator('.rl-open').count() === 0, '12 the late one said in minutes — the open panel is gone');
  await page.getByRole('button', { name: 'Stop the watch' }).click();
  await page.locator('.rl-watch:not(.is-on)').waitFor();
  await page.waitForTimeout(500);
  {
    const t = (await tz(TID))[0];
    ok(t.r.timed === 5 && t.r.open === 0 && t.r.typed === 3, '12 five stops timed, none open, three said not clocked (a chip, a typed 1:30, a typed 2 min)', JSON.stringify(t.r));
    /* by hand: 4 and 5 min clocked, 0.5, 1.5 and 2 said → median 2, mean 2.6 (the clock runs on a little while the script clicks) */
    ok(Math.abs(t.r.median - 2) < 0.3 && Math.abs(t.r.mean - 2.6) < 0.3 && t.r.helped === 2, '12 by hand: median 2 min, mean 2.6 min, two with a help stamp', JSON.stringify(t.r));
    ok(Math.abs(t.downH * 60 - 13) < 0.5 && Math.abs((t.watchedH - t.hours) * 60 - 13) < 0.5, '12 the running time is the watch less the stops’ 13 minutes', JSON.stringify({ h: t.hours, w: t.watchedH, d: t.downH }));
    ok(JSON.stringify(await screenTiles()) === JSON.stringify(t.tiles) && t.tiles.some(x => x[0] === 'Repair time') && t.tiles.some(x => x[0] === 'Available'), '12 every tile — Repair time and Available among them — as the module says', JSON.stringify(await screenTiles()));
    ok(flat(await page.locator('[data-repair]').innerText()) === t.repairSays && /^5 of 5 stops timed: typically/.test(t.repairSays), '12 the repair sentence as the module says', await page.locator('[data-repair]').innerText());
    const ins = (await page.locator('.rl-repair-p .ln-ins li').allInnerTexts()).map(flat);
    ok(t.repairIns.length >= 2 && t.repairIns.every(x => ins.some(y => y.includes(x))), '12 what it means as the module says', `${ins.join(' | ')} vs ${t.repairIns.join(' | ')}`);
    ok(await page.locator('.rl-stopbars rect.rl-bar-wait').count() === 2 && await page.locator('.rl-stopbars rect.rl-bar-fix').count() === 2 && await page.locator('.rl-stopbars rect.rl-bar-whole').count() === 3, '12 a bar for each stop — waiting and fixing where help was stamped, the whole time where not');
    ok(await page.locator('.rl-reasons li[data-reason="jam"]').count() === 1, '12 what the stops were — the reason picked');
    ok(flat(await page.locator('[data-fitter]').innerText()) === t.fitter && /£[\d.]+ a repair/.test(t.fitter) && /the fixing time/.test(t.fitter), '12 a fitter’s time in money, from the fixing minutes', await page.locator('[data-fitter]').innerText());
    ok(flat(await page.locator('.rl-cost').last().innerText()) === `What it costs: ${t.cost}.` && /min each, the mean of the 5 timed/.test(t.cost), '12 what it costs rests on the measured minutes, said so', await page.locator('.rl-cost').last().innerText());
    ok(/of stops taken off the/.test(await page.locator('.rl-counted .ln-tile', { has: page.locator('.ln-k', { hasText: /^Watched$/i }) }).first().innerText()), '12 the Watched tile says the stops’ minutes came off', await page.locator('.rl-counted .ln-tile', { has: page.locator('.ln-k', { hasText: /^Watched$/i }) }).first().innerText());
    ok(t.closing.includes('each takes a median') && flat(await page.locator('.ln-close').last().innerText()).includes(t.closing.slice(0, 40)), '12 the closing line carries the repair', t.closing);
  }
  /* every tap: its times, and one put right */
  await page.getByRole('button', { name: /^Every tap/ }).click();
  const rows12 = page.locator('.ie-all .ie-rows li');
  ok(/help \+1 min|help \+1\.\d min/.test(await rows12.nth(0).innerText()) && /running again \+/.test(await rows12.nth(0).innerText()), '12 every tap says its times', await rows12.nth(0).innerText());
  await rows12.nth(1).getByRole('button', { name: 'Change the time' }).click();
  await rows12.nth(1).locator('input[aria-label="How long it took"]').fill('45 s');
  await rows12.nth(1).getByRole('button', { name: 'Set', exact: true }).click(); await page.waitForTimeout(400);
  {
    const t = (await tz(TID))[0];
    ok(JSON.stringify(await screenTiles()) === JSON.stringify(t.tiles) && Math.abs(t.r.mean - (4.2 + 0.75 + 1.5 + 5 + 2) / 5) < 0.3, '12 one time put right (30 s → 45 s) — the figures moved with it, as the module says', JSON.stringify(t.r));
  }
  /* on paper */
  {
    const t = (await tz(TID))[0];
    const text = await pdfText(() => pressPaper(page, / — on paper$/));
    ok(text.includes('Repair times') && text.includes(flat(t.repairSays).slice(0, 28)), '12 on paper — the repair times and their sentence', text.slice(0, 200));
    ok(text.includes('waiting for help') && text.includes('fixing') && text.includes('said, not clocked'), '12 on paper — the bar for each stop, its legend in words');
    ok(text.includes('a repair') && text.includes('fitter'), '12 on paper — the fitter’s time in money');
    ok(t.tiles.every(([k]) => text.toUpperCase().includes(k.toUpperCase())), '12 on paper — every tile among them Repair time and Available');
  }
  /* closed: no stamps taken */
  await page.getByRole('button', { name: /^Close — keep these figures/ }).click(); await page.waitForTimeout(500);
  ok(await page.locator('.rl-open').count() === 0 && await page.getByRole('button', { name: 'Help arrived' }).count() === 0 && await page.getByRole('button', { name: 'Time it' }).count() === 0, '12 a closed study takes no stamps and no times');
  await shot('rl-repair');
  await page.evaluate(async ws => { await (await import('/src/db.ts')).updateWorkspace(ws); }, ws0);
}

/* ---- 13 calls for help — the andon (FC-015): reasons, response and clearing, ranked by the minutes waited, by shift, never by person ---- */
{
  const ws0 = await page.evaluate(async id => (await import('/src/db.ts')).getWorkspace(id), sd.wsId);
  await page.evaluate(async ws => { await (await import('/src/db.ts')).updateWorkspace(ws); }, { ...ws0, ...lineCost, shifts: [{ name: 'Days', start: '06:00', end: '14:00' }, { name: 'Lates', start: '14:00', end: '22:00' }] });
  const CID = await newStudy('Case packer calls', 'Case packer');
  await page.locator('input[aria-label="What is counted, 1"]').fill('call');
  await more();
  await page.locator('select[aria-label="Timing for call"]').selectOption('call');
  ok(await page.locator('input[aria-label="Help should arrive within, minutes, for call"]').count() === 1 && await page.locator('input[aria-label^="A fitter costs"]').count() === 0, '13 a call asks the response wanted, not a fitter’s rate');
  await page.locator('input[aria-label="Reasons for call"]').fill('film change, jam, QA check, label, material short');
  await page.locator('input[aria-label="Help should arrive within, minutes, for call"]').fill('3');
  await page.getByRole('button', { name: 'Set it up' }).click();
  await page.locator('.rl-watch').waitFor();
  /* fourteen calls, made on two shifts (cases-w5.py) — reason, minutes to help, minutes to running again; made by one person, whose name the page must never show */
  await page.evaluate(async ([id]) => {
    const db = await import('/src/db.ts');
    const CALLS = [['film change', 1.0, 6.0], ['film change', 2.0, 7.0], ['film change', 1.5, 8.0], ['film change', 3.0, 9.5], ['jam', 0.5, 2.0], ['jam', 1.0, 3.0], ['jam', 4.0, 6.0],
      ['QA check', 5.0, 9.0], ['QA check', 11.0, 14.0], ['label', 2.5, 6.5], ['film change', 1.0, 5.0], ['jam', 0.5, 1.5], ['label', 3.5, 8.0], ['material short', 9.0, 19.0]];
    const M = 60_000, d = new Date(Date.now() - 2 * 86_400_000), day = (h, m = 0) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m).getTime();
    const s = await db.getStudy(id), cid = s.agreed.reliability.counts[0].id;
    const events = CALLS.map(([reason, a, z], i) => { const at = (i < 7 ? day(7) : day(15)) + (i < 7 ? i : i - 7) * 20 * M; return { id: `call${i}`, at, by: 'Zed Tapper', count: cid, reason, arrivedAt: at + a * M, fixedAt: at + z * M }; });
    await db.patchStudy(id, cur => ({ facts: { ...cur.facts, watch: [{ id: 'w1', from: day(7), to: day(12), by: 'Zed Tapper' }, { id: 'w2', from: day(15), to: day(19), by: 'Zed Tapper' }], events } }));
  }, [CID]);
  await go(`#/reliability/${CID}`);
  const t = (await tz(CID))[0];
  ok(t.k.calls === 14 && t.k.within === 9 && Math.abs(t.k.respMedian - 2.25) < 1e-6 && Math.abs(t.k.resMedian - 6.75) < 1e-6 && Math.abs(t.k.wait - 45.5) < 1e-6, '13 the independent case — 14 calls, 9 within 3 min, response median 2.25, resolution 6.75, 45.5 min waited', JSON.stringify(t.k));
  ok(JSON.stringify(t.callReasons) === JSON.stringify(['QA check', 'material short', 'film change', 'jam', 'label']), '13 the reasons ranked by the minutes waited — QA check first, film change (the most) third', JSON.stringify(t.callReasons));
  ok(flat(await page.locator('[data-calls]').innerText()) === t.callSays && t.callSays.includes('14 calls: help came in 2.3 min typically, 1 in 10 over 7.8 min; the line ran again in 6.8 min typically, 1 in 10 over 13 min.') && t.callSays.includes('9 of 14 answered within the 3 min wanted.'), '13 the sentence as the module says, and as the case says', await page.locator('[data-calls]').innerText());
  ok(JSON.stringify(await page.locator('.rl-reasons li').evaluateAll(l => l.map(x => x.getAttribute('data-reason')))) === JSON.stringify(t.callReasons), '13 the reasons on the page in that order');
  const ins = (await page.locator('.rl-calls-p .ln-ins li').allInnerTexts()).map(flat);
  ok(t.callIns.every(x => ins.some(y => y.includes(x))) && ins.some(y => /The biggest total, not the most frequent, is first/.test(y)) && ins.some(y => /never by person/.test(y)), '13 what it means as the module says — the biggest total first, never by person', ins.join(' | '));
  ok(JSON.stringify(await screenTiles()) === JSON.stringify(t.tiles) && t.tiles.some(x => x[0] === 'Help in' && x[1] === '2.3 min') && t.tiles.some(x => x[0] === 'Cleared in' && x[1] === '6.8 min'), '13 the tiles — Help in and Cleared in — as the module says', JSON.stringify(await screenTiles()));
  const shifts = await page.locator('.rl-shifts tbody tr').evaluateAll(r => r.map(x => [...x.querySelectorAll('td')].map(td => td.textContent.trim())));
  ok(JSON.stringify(shifts.map(r => r.slice(0, 3))) === JSON.stringify([['Days', '7', '7'], ['Lates', '7', '7']]), '13 by shift — seven calls on Days, seven on Lates', JSON.stringify(shifts));
  ok(flat(await page.locator('[data-wait]').innerText()) === t.wait && /^Waiting for help alone: /.test(t.wait), '13 what the waiting alone cost, by the cost model', await page.locator('[data-wait]').innerText());
  await page.getByRole('button', { name: /^Every tap/ }).click();
  ok(!/Zed/.test(await page.locator('.nv-main').innerText()), '13 no person’s name anywhere on the page — calls are by reason and by shift');
  const text = await pdfText(() => pressPaper(page, / — on paper$/));
  ok(text.includes('Reasons, by the minutes waited') && text.includes('QA check') && text.includes('By shift') && text.includes('Lates') && text.includes(flat(t.callSays).slice(0, 40)), '13 on paper — the ranked reasons, the shifts and the sentence', text.slice(0, 200));
  ok(!/Zed/.test(text), '13 on paper — no person’s name either');
  ok(t.tiles.every(([k]) => text.toUpperCase().includes(k.toUpperCase())), '13 on paper — every tile');
  {
    const p = await ctx.newPage(); await p.setViewportSize({ width: 390, height: 844 }); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${BASE}/#/reliability/${CID}`); await p.locator('.rl-watch').waitFor({ timeout: 15000 }); await p.waitForTimeout(1200);
    const fit = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    ok(fit.sw <= fit.w + 1, '13 the phone — nothing off the side', JSON.stringify(fit));
    if (SHOTS) await p.screenshot({ path: join(SHOTS, 'rl-calls-phone.png'), fullPage: true });
    await p.close();
  }
  await shot('rl-calls');
  await page.evaluate(async ws => { await (await import('/src/db.ts')).updateWorkspace(ws); }, ws0);
}

/* ---- 14 reliability growth (FC-061): the record's fourteen failures in two thousand running hours ---- */
{
  const GID = await newStudy('New wrapper bedding in', 'Wrapper');
  await more();
  await page.locator('input[aria-label="MTBF wanted for stop, minutes"]').fill('24000');
  await page.locator('input[aria-label="What is counted, 1"]').fill('failure');
  await page.locator('input[aria-label="Track growth for failure"]').check();
  await page.locator('input[aria-label="Add your own thing to count"]').fill('jam');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.locator('.rl-more > summary').nth(1).click();
  await page.locator('input[aria-label="Track growth for jam"]').check();
  await page.getByRole('button', { name: 'Set it up' }).click();
  await page.locator('.rl-watch').waitFor();
  await page.evaluate(async ([id]) => {
    const db = await import('/src/db.ts'); const H = 3_600_000;
    const AT = [12, 35, 61, 102, 148, 230, 310, 420, 560, 720, 980, 1250, 1600, 1900];
    const s = await db.getStudy(id), [fail, jam] = s.agreed.reliability.counts.map(c => c.id), from = Date.now() - 100 * 86_400_000;
    await db.patchStudy(id, cur => ({ facts: { ...cur.facts, watch: [{ id: 'w', from, to: from + 2000 * H }],
      events: [...AT.map((h, i) => ({ id: `f${i}`, at: from + h * H, count: fail })), ...[5, 90, 300, 800, 1500].map((h, i) => ({ id: `j${i}`, at: from + h * H, count: jam }))] } }));
  }, [GID]);
  await go(`#/reliability/${GID}`);
  const g = await page.evaluate(async sid => {
    const db = await import('/src/db.ts'); const R = await import('/src/tools/reliability/reliability.ts'); const G = await import('/src/tools/reliability/growth.ts');
    const s = await db.getStudy(sid); const items = R.relAll(s.agreed.reliability, s.facts.watch, s.facts.events, Date.now());
    return items.map(({ c, f, g }) => ({ name: c.event, says: G.growthSays(c.event, g).text, rows: G.growthRows(g), tile: G.growthTile(c.event, g), beta: g.beta, lo: g.betaLo, hi: g.betaHi, inst: g.instMtbfH, cum: g.cumMtbfH, more: g.moreH, n: g.n, hours: f.hours }));
  }, GID);
  ok(g[0].n === 14 && Math.abs(g[0].hours - 2000) < 1e-6 && Math.abs(g[0].beta - 0.50777) < 5e-5 && Math.abs(g[0].inst - 281.341) < 0.01 && Math.abs(g[0].cum - 142.857) < 0.01 && Math.abs(g[0].more - 2088.0) < 1.5 && Math.abs(g[0].lo - 0.30698) < 5e-4 && Math.abs(g[0].hi - 0.74964) < 5e-4,
    '14 the independent case — β 0.50777 (0.307–0.750), MTBF now 281 h against 143 h, 2,088 h more to 400 h', JSON.stringify(g[0]));
  ok(flat(await page.locator('[data-growth]').innerText()) === g[0].says && g[0].says.includes('It is getting better') && g[0].says.includes('β 0.51, 90% sure 0.31–0.75') && g[0].says.includes('about 281 h') && g[0].says.includes('143 h averaged') && g[0].says.includes('after about 2088 h more running — if the fixing keeps pace'),
    '14 the growth sentence as the module says, with its “if”', await page.locator('[data-growth]').innerText());
  const rowsOnPage = await page.locator('.rl-growth-t tr').evaluateAll(r => r.map(x => [...x.querySelectorAll('td')].map(td => td.textContent.trim())));
  ok(JSON.stringify(rowsOnPage) === JSON.stringify(g[0].rows), '14 the table as the module says', JSON.stringify(rowsOnPage));
  ok(await page.locator('.rl-growthfig path.rl-fit').count() === 1 && await page.locator('.rl-growthfig path.rl-step').count() === 1 && await page.locator('.rl-growthfig circle').count() === 14 && /not run here/.test(await page.locator('.rl-caveats').innerText()), '14 the picture — the steps, the fitted curve, fourteen dots — and what was not run said');
  ok((await screenTiles()).some(x => x[0] === 'MTBF now' && x[1] === '281 h'), '14 the MTBF now tile', JSON.stringify(await screenTiles()));
  await seeFor('Jams');
  ok(/fitted from 8/.test(await page.locator('[data-growth]').innerText()) && await page.locator('.rl-growthfig').count() === 0, '14 five jams: growth is fitted from 8 — said, no curve drawn', await page.locator('[data-growth]').innerText());
  await seeFor('Failures');
  const text = await pdfText(() => pressPaper(page, / — on paper$/));
  ok(text.includes('Reliability growth') && text.includes('It is getting better') && text.includes('MTBF now') && text.includes('fit test is not run here') && text.includes('fitted curve'), '14 on paper — the growth section, its picture’s legend and what was not run', text.slice(0, 160));
  {
    const p = await ctx.newPage(); await p.setViewportSize({ width: 390, height: 844 }); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${BASE}/#/reliability/${GID}`); await p.locator('.rl-watch').waitFor({ timeout: 15000 }); await p.waitForTimeout(1200);
    const fit = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    ok(fit.sw <= fit.w + 1 && await p.locator('.rl-growthfig svg').count() === 1, '14 the phone — nothing off the side, the picture drawn', JSON.stringify(fit));
    await p.close();
  }
  await shot('rl-growth');
}

/* ---- 15 how a part wears — Weibull (FC-060): the record's twelve heater failures typed on the page, and a belt's gaps ---- */
{
  const WID = await newStudy('Seal-jaw heaters', 'Sealer');
  await more();
  await page.locator('input[aria-label="What is counted, 1"]').fill('heater failure');
  await page.locator('input[aria-label="A part that wears: heater failure"]').check();
  await page.locator('input[aria-label="What a planned change costs, pounds, for heater failure"]').fill('20');
  await page.locator('input[aria-label="What a failure costs, pounds, for heater failure"]').fill('120');
  await page.locator('input[aria-label="Add your own thing to count"]').fill('belt break');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.locator('.rl-more > summary').nth(1).click();
  await page.locator('input[aria-label="A part that wears: belt break"]').check();
  await page.locator('input[aria-label="Use the gaps between belt break events as lives"]').check();
  await page.locator('input[aria-label="The part was new when watching began"]').check();
  await page.getByRole('button', { name: 'Set it up' }).click();
  await page.locator('.rl-watch').waitFor();
  ok(/a part that wears/.test(await page.locator('.ie-agreed').innerText()), '15 set up — a part that wears, said in what was agreed', await page.locator('.ie-agreed').innerText());
  await seeFor('Heater failures');
  ok(/Weibull is fitted from 6/.test(await page.locator('[data-wear]').innerText()), '15 with no lives yet it says a Weibull is fitted from 6', await page.locator('[data-wear]').innerText());
  await page.locator('input[aria-label="Age of the part, hours"]').fill('abc');
  await page.getByRole('button', { name: 'Add the life' }).click();
  ok(/An age is a number above 0/.test(await page.locator('.rl-life-form .ie-problem').innerText()), '15 an age that is not a number is refused with a sentence');
  for (const a of [310, 480, 560, 720, 790, 850, 940, 1010, 1100, 1250, 1380, 1620]) {
    await page.locator('input[aria-label="Age of the part, hours"]').fill(String(a));
    await page.getByRole('button', { name: 'Add the life' }).click();
  }
  await page.waitForTimeout(500);
  const w = await page.evaluate(async sid => {
    const db = await import('/src/db.ts'); const R = await import('/src/tools/reliability/reliability.ts'); const W = await import('/src/tools/reliability/wear.ts'); const X = await import('/src/tools/reliability/weibull.ts'); const WW = await import('/src/tools/reliability/words.ts');
    const s = await db.getStudy(sid); const items = R.relAll(s.agreed.reliability, s.facts.watch, s.facts.events, Date.now());
    return items.map(({ c, f }) => { const v = W.wearOf(c, f, s.facts.lives); if (!v) return null; const fit = v.fit; const rep = X.replaceSays(v.unit, fit, v.cp, v.cf, WW.gbp, undefined);
      return { name: c.event, unit: v.unit, says: X.weibullSays(v.unit, fit).text, ins: X.weibullInsights(v.unit, fit, v.hasRunning).map(x => x.text), rows: X.weibullRows(v.unit, fit), tiles: X.weibullTiles(v.unit, fit, v.rep).map(t => [t.k, t.v]), replace: rep.text,
        cond: fit.beta !== undefined && v.age !== undefined && v.ahead !== undefined ? X.conditionalSays(v.unit, fit, v.age, v.ahead) : '', beta: fit.beta, eta: fit.eta, lo: fit.betaLo, hi: fit.betaHi, b10: fit.b10, b10lo: fit.b10Lo, b10hi: fit.b10Hi, T: v.rep?.T, failures: fit.failures, running: fit.running, rr: fit.rr, typed: v.typed.length, fromWatch: v.fromWatchN }; });
  }, WID);
  const h = w[0];
  ok(h.failures === 12 && Math.abs(h.beta - 2.73793) < 5e-4 && Math.abs(h.eta - 1033.276) < 0.1 && Math.abs(h.lo - 1.81257) < 2e-3 && Math.abs(h.hi - 3.86595) < 2e-3 && Math.abs(h.b10 - 454.21) < 0.1 && Math.abs(h.b10lo - 268.6) < 0.5 && Math.abs(h.b10hi - 632.0) < 0.6 && Math.abs(h.T - 471.74) < 0.5 && Math.abs(h.rr.beta - 2.39227) < 5e-4,
    '15 the independent case — β 2.73793 (1.81–3.87), η 1,033 h, B10 454 h (269–632), change at 472 h, the plot’s line β 2.392', JSON.stringify(h));
  ok(flat(await page.locator('[data-wear]').innerText()) === h.says && h.says.includes('This part wears out') && h.says.includes('β 2.7, 90% sure 1.8–3.9') && h.says.includes('about 454 hours (90% sure 269–632)'), '15 the sentence as the module says, and as the case says', await page.locator('[data-wear]').innerText());
  ok(flat(await page.locator('[data-replace]').innerText()) === flat(h.replace) && /Changing it at about 472 hours \(a first guess\)/.test(h.replace) && /48% less/.test(h.replace) && /A planned change is £20\.00 and a failure £120\./.test(h.replace), '15 when to change it and what it saves, from the two costs', await page.locator('[data-replace]').innerText());
  ok(flat(await page.locator('[data-cond]').innerText()) === flat(h.cond) && h.cond.length > 0, '15 the chance a part of a given age fails in the next stretch, as the module says', await page.locator('[data-cond]').innerText());
  const wTiles = await page.locator('.rl-wear-p .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()]));
  ok(JSON.stringify(wTiles) === JSON.stringify(h.tiles) && h.tiles[0][1] === '2.7' && h.tiles[1][1] === '454 hours' && h.tiles[2][1] === '472 hours', '15 the three tiles — Shape β, B10 life, Change at', JSON.stringify(wTiles));
  const wRows = await page.locator('.rl-wear-t tr').evaluateAll(r => r.map(x => [...x.querySelectorAll('td')].map(td => td.textContent.trim())));
  ok(JSON.stringify(wRows) === JSON.stringify(h.rows), '15 the table as the module says', JSON.stringify(wRows));
  ok(await page.locator('.rl-weibullfig circle').count() === 12 && await page.locator('.rl-weibullfig path').count() === 2, '15 the Weibull plot — twelve points, the two lines');
  /* a part still running changes the fit; struck and restored */
  await page.getByRole('button', { name: 'Still running', exact: true }).click();
  await page.locator('input[aria-label="Age of the part, hours"]').fill('300');
  await page.locator('input[aria-label="A note on the part"]').fill('on the machine now');
  await page.getByRole('button', { name: 'Add the life' }).click(); await page.waitForTimeout(400);
  ok(await page.locator('.rl-lives li').count() === 13 && /still running · on the machine now/.test(await page.locator('.rl-lives li').last().innerText()), '15 a part still running added with its note', String(await page.locator('.rl-lives li').count()));
  const before = flat(await page.locator('[data-wear]').innerText());
  await page.locator('.rl-lives li').last().getByRole('button', { name: 'Strike' }).click(); await page.waitForTimeout(400);
  ok(await page.locator('.rl-lives li').count() === 12 && flat(await page.locator('[data-wear]').innerText()) !== before, '15 struck — the figures move');
  await page.getByRole('button', { name: /^Show the 1 struck/ }).click();
  await page.locator('.rl-wear-p').getByRole('button', { name: 'Restore' }).click(); await page.waitForTimeout(400);
  ok(await page.locator('.rl-lives li').count() === 13 && flat(await page.locator('[data-wear]').innerText()) === before, '15 and restored — the figures as they were');
  /* the part still running struck again — the twelve failures alone, as the independent case has them, for the paper */
  await page.locator('.rl-lives li').last().getByRole('button', { name: 'Strike' }).click(); await page.waitForTimeout(400);
  ok(await page.locator('.rl-lives li').count() === 12, '15 and struck again, the twelve failures alone');
  /* the belt's own gaps as lives: eight gaps and a part still running at 120 h (cases-w5.py) */
  await page.evaluate(async ([id]) => {
    const db = await import('/src/db.ts'); const H = 3_600_000;
    const s = await db.getStudy(id), belt = s.agreed.reliability.counts[1].id, from = Date.now() - 120 * 86_400_000;
    const GAPS = [212, 305, 168, 410, 260, 350, 190, 280]; let at = 0;
    await db.patchStudy(id, cur => ({ facts: { ...cur.facts, watch: [{ id: 'bw', from, to: from + (GAPS.reduce((a, b) => a + b, 0) + 120) * H }], events: GAPS.map((g, i) => { at += g; return { id: `b${i}`, at: from + at * H, count: belt }; }) } }));
  }, [WID]);
  await go(`#/reliability/${WID}`);
  await seeFor('Belt breaks');
  const wb = await page.evaluate(async sid => {
    const db = await import('/src/db.ts'); const R = await import('/src/tools/reliability/reliability.ts'); const W = await import('/src/tools/reliability/wear.ts');
    const s = await db.getStudy(sid); const it = R.relAll(s.agreed.reliability, s.facts.watch, s.facts.events, Date.now())[1]; const v = W.wearOf(it.c, it.f, s.facts.lives);
    return { beta: v.fit.beta, eta: v.fit.eta, b10: v.fit.b10, failures: v.fit.failures, running: v.fit.running, fromWatch: v.fromWatchN, unit: v.unit };
  }, WID);
  ok(wb.failures === 8 && wb.running === 1 && wb.fromWatch === 9 && wb.unit === 'hours' && Math.abs(wb.beta - 3.88971) < 1e-3 && Math.abs(wb.eta - 301.507) < 0.05 && Math.abs(wb.b10 - 169.06) < 0.05, '15 the belt’s gaps as lives (the part new at the start, the stretch since the last break still running) — the independent β 3.88971, η 301.5 h, B10 169 h', JSON.stringify(wb));
  ok(/β 3\.9, 90% sure 2\.4–5\.8/.test(await page.locator('[data-wear]').innerText()) && /the study’s own gaps/.test(await page.locator('.rl-wear-what').innerText()), '15 said on the page — the gaps are the lives', await page.locator('[data-wear]').innerText());
  await seeFor('Heater failures');
  const text = await pdfText(() => pressPaper(page, / — on paper$/));
  const want15 = ['How the part wears', 'This part wears out', 'Changing it at about 472 hours', 'maximum likelihood', 'IEC 61649'];
  ok(want15.every(x => text.includes(x)), '15 on paper — the sentence, the plot’s legend, when to change it and what is not claimed', `missing ${want15.filter(x => !text.includes(x)).join(' | ')} in ${text.slice(0, 600)}`);
  ok(text.toUpperCase().includes('SHAPE') && text.toUpperCase().includes('B10 LIFE') && text.toUpperCase().includes('CHANGE AT'), '15 on paper — the tiles', text.slice(0, 200));
  {
    const p = await ctx.newPage(); await p.setViewportSize({ width: 390, height: 844 }); p.on('pageerror', e => errs.push(e.message));
    await p.goto(`${BASE}/#/reliability/${WID}`); await p.locator('.rl-watch').waitFor({ timeout: 15000 }); await p.waitForTimeout(1200);
    const fit = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
    ok(fit.sw <= fit.w + 1 && await p.locator('.rl-weibullfig svg').count() === 1, '15 the phone — nothing off the side, the plot drawn', JSON.stringify(fit));
    await p.close();
  }
  await shot('rl-wear');
}

/* ---- 16 the seeded study with every part — the page loads and says each (smoke's own) ---- */
await go(`#/reliability/${sd.reliabilityFamilyId}`);
{
  const t = (await tz(sd.reliabilityFamilyId));
  ok(t.length === 3 && t[0].r.timed === 12 && t[1].k.calls === 11, '16 the seeded study — twelve stops timed, eleven calls', JSON.stringify([t[0].r, t[1].k]));
  ok(await page.locator('[data-repair]').count() === 1 && await page.locator('.rl-growth-p').count() === 1, '16 the seeded stops show repair times and growth');
  await seeFor('Calls');
  ok(await page.locator('[data-calls]').count() === 1 && await page.locator('.rl-reasons li').count() === 5, '16 the seeded calls show their reasons');
  await seeFor('Belt breaks');
  ok(await page.locator('[data-wear]').count() === 1 && await page.locator('.rl-lives li').count() === 9, '16 the seeded belt shows its nine lives');
}

ok(errs.length === 0, 'no console error anywhere', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
