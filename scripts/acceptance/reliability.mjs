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
  const items = R.relAll(a, s.facts.watch, s.facts.events, Date.now());
  const study = R.studyReliabilitySays(a, s.facts.watch, s.facts.events, Date.now());
  return { name: s.name, study, closing: L.relClosings(items, line).text, rows: R.relRows(items, line).map(r => [r.title, String(r.n), r.mtbf]),
    counts: items.map(({ c, f }) => {
      const said = R.reliabilitySays(c, f), cost = R.relCost(f, c, line);
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
  ok(/2 on this line/.test(said) && said.includes('Capper stops'), '9 the line’s page — Reliability with its latest and how many', said);
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

ok(errs.length === 0, 'no console error anywhere', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
