/* A MACHINE'S RELIABILITY, DRIVEN (docs/TOOLKIT.md, tool 13). Rowland, 21
 * October: "a person stood at a machine, tapping a button every time an
 * event happened ... also I start a clock watch I can stop and start ...
 * then we do a failure rate, and commentary, report etc graphs".
 *
 * On the seeded line, the page's clock run by the script (Playwright's clock),
 * so a watched hour is an hour:
 *
 *   1  Reliability on the rail's tools, lit on its list; the seeded study's
 *      row as the module says it
 *   2  a new one made from the list on the line — its machine offered from
 *      the line — and set up: what counts, what one can be, the MTBF wanted,
 *      the minutes stood a stop
 *   3  the event button refused until the watch runs; the watch started,
 *      stops tapped as they come (one with no kind, given one after, one of
 *      a kind), one undone at once, the watch stopped — nothing counted while
 *      it is stopped; every tile, the sentence and what it means as
 *      lib/ie/reliability says them from the record
 *   4  carried on the next day: the watched time and the events add up, a
 *      day a row, the MTBF day by day drawn, the graphs drawn
 *   5  the MTBF wanted changed — the verdict moving as the module says
 *   6  every stop listed, one struck and the figures moving, restored
 *   7  the commentary — written, edited, deleted with Undo, kept after a reload
 *   8  on paper: the tiles, the graphs' headings, the days, the commentary,
 *      the closing line
 *   9  the list's row, the line's page and the front door saying it
 *  10  the phone: the watch and the event button big, nothing off the side
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/reliability.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
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

/* what the module says of a study, from its record as it is stored now */
const truth = id => page.evaluate(async sid => {
  const db = await import('/src/db.ts'); const R = await import('/src/lib/ie/reliability.ts'); const L = await import('/src/lib/ie/reliabilityLean.ts');
  const s = await db.getStudy(sid); const a = s.agreed?.reliability;
  const line = (await db.listWorkspaces()).find(w => w.id === s.workspaceId);
  const f = R.reliability(a, s.facts.watch, s.facts.events, Date.now());
  const said = R.reliabilitySays(a, f), cost = R.relCost(f, a, line);
  return { name: s.name, n: f.n, hours: f.hours, days: f.days.length, kinds: f.kinds.map(k => `${k.kind}:${k.n}`), said, tiles: a ? L.relTiles(a, f, cost).map(t => [t.k, t.v]) : [],
    insights: R.reliabilityInsights(a, f).map(x => x.text), closing: a ? L.relClosing(a, f, cost, said).text : '', costWords: R.costWords(cost),
    stretches: (s.facts.watch ?? []).length, events: (s.facts.events ?? []).length, remarks: (s.facts.remarks ?? []).filter(r => !r.struck).map(r => r.text), running: !!f.runningSince };
}, id);
const screenTiles = async () => (await page.locator('.ie-strip .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));

/* ---- 1 the rail, the list ---- */
await go('#/reliability');
const railOn = await page.locator('.nv-rail a.is-on, .nv-rail [aria-current="page"]').allInnerTexts().catch(() => []);
ok(railOn.some(t => /Reliability/.test(t)), '1 Reliability on the rail’s tools, lit on its list', railOn.join(' | '));
ok(/^Reliability$/.test(flat(await page.locator('h1').first().innerText())), '1 the list’s name');
{
  const t = await truth(sd.reliabilityId);
  const row = flat(await page.locator(`.lt-li[data-study="${sd.reliabilityId}"]`).innerText());
  ok(row.includes(t.said.verdict) && row.includes(`${t.n} stops`) && row.includes('watching now'), '1 the seeded study’s row — its verdict, its stops and watching now, as the module says', row);
}

/* ---- 2 a new one, set up ---- */
await page.getByRole('button', { name: 'New reliability study' }).first().click();
await page.locator('select[aria-label="Which line"]').selectOption(sd.wsId);
await page.waitForTimeout(500);
const offered = await page.locator('#new-study-machines option').evaluateAll(os => os.map(o => o.value));
ok(offered.length > 0, '2 the line’s machines offered for which machine', offered.join(', '));
await page.locator('.lt-new input.text-input').first().fill('Capper stops');
await page.locator('.lt-new input[list="new-study-machines"], .lt-new input.text-input').nth(1).fill('Capper');
await page.getByRole('button', { name: 'Start it' }).click();
await page.waitForURL(/#\/reliability\/[^/?]+/, { timeout: 10000 });
const RID = decodeURIComponent(page.url().split('#/reliability/')[1].split('?')[0]);
await page.locator('.ie-agree').waitFor();
ok(await page.locator('.ie-agree h2').innerText() === 'What counts, and what it should be', '2 set up first — what counts, and what it should be');
await page.getByRole('button', { name: 'stop', exact: true }).click();
await page.locator('input[aria-label="Kinds, separated by commas"]').fill('jam, misfeed');
await page.locator('input[aria-label="MTBF wanted, minutes"]').fill('30');
await page.locator('input[aria-label="Minutes the line stands for each"]').fill('2');
await page.getByRole('button', { name: 'Set it up' }).click();
await page.locator('.rl-watch').waitFor();
{
  const s = await page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)), RID);
  ok(s.workspaceId === sd.wsId && s.machine === 'Capper' && s.tool === 'reliability', '2 made on the line, of its machine', JSON.stringify({ ws: s.workspaceId, m: s.machine }));
  ok(JSON.stringify(s.agreed?.reliability) === JSON.stringify({ event: 'stop', kinds: ['jam', 'misfeed'], targetMin: 30, downMin: 2 }), '2 what was agreed kept', JSON.stringify(s.agreed));
}

/* ---- 3 the watch and the taps ---- */
ok(await page.locator('.rl-event').isDisabled() && /start the watch first/.test(await page.locator('.rl-event').innerText()), '3 the event button refused until the watch runs');
await page.getByRole('button', { name: 'Start the watch' }).click();
await page.locator('.rl-watch.is-on').waitFor();
ok(await page.locator('.rl-event').isEnabled(), '3 the watch started — the event button takes taps');
await later(10 * MIN); await page.locator('.rl-event').click();
await page.locator('.rl-last').waitFor();
ok(/^Stop 1 at /.test(flat(await page.locator('.rl-last').innerText())), '3 the tap said back — Stop 1 at its time', await page.locator('.rl-last').innerText());
await page.locator('.rl-last').getByRole('button', { name: 'jam', exact: true }).click();
await page.waitForTimeout(300);
ok(/ — jam/.test(flat(await page.locator('.rl-last').innerText())), '3 a stop with no kind given one after', await page.locator('.rl-last').innerText());
await later(25 * MIN); await page.locator('.rl-kinds').getByRole('button', { name: 'jam', exact: true }).click();
await later(5 * MIN); await page.locator('.rl-kinds').getByRole('button', { name: 'misfeed', exact: true }).click();
await later(20 * MIN); await page.locator('.rl-event').click();
await later(1 * MIN); await page.locator('.rl-event').click();
await page.waitForTimeout(300);
await page.locator('.rl-last').getByRole('button', { name: /^Undo/ }).click();
await page.waitForTimeout(300);
await later(15 * MIN);
await page.getByRole('button', { name: 'Stop the watch' }).click();
await page.locator('.rl-watch:not(.is-on)').waitFor();
ok(await page.locator('.rl-event').isDisabled(), '3 the watch stopped — no tap counts while it is stopped');
await later(40 * MIN);
await page.waitForTimeout(600);
{
  const t = await truth(RID);
  /* the clock runs on while the script clicks: within a quarter of a minute */
  ok(t.n === 4 && Math.abs(t.hours - 76 / 60) < 0.25 / 60 && t.events === 5, '3 four stops counted in 76 min watched, the undone one kept struck', JSON.stringify({ n: t.n, h: t.hours, e: t.events }));
  const tiles = await screenTiles();
  ok(JSON.stringify(tiles) === JSON.stringify(t.tiles), '3 the five tiles as the module says', `${JSON.stringify(tiles)} vs ${JSON.stringify(t.tiles)}`);
  ok(tiles[0][1] === '19 min', '3 MTBF 19 min (76 min ÷ 4)', tiles[0][1]);
  ok(flat(await page.locator('.ie-say').innerText()) === t.said.text, '3 the sentence as the module says', await page.locator('.ie-say').innerText());
  const ins = (await page.locator('.ln-ins li').allInnerTexts()).map(flat);
  ok(t.insights.every(x => ins.some(y => y.includes(x))), '3 what it means as the module says', `${ins.join(' | ')} vs ${t.insights.join(' | ')}`);
  ok(flat(await page.locator('.rl-cost').innerText()) === `What it costs: ${t.costWords}.`, '3 what it costs, from the minutes stood a stop', await page.locator('.rl-cost').innerText());
  ok(await page.locator('.rl-fig .rl-step').count() === 1, '3 the stops against watched hours, drawn');
}
await shot('rl-day1');

/* ---- 4 carried on the next day ---- */
await later(24 * 60 * MIN);
await page.getByRole('button', { name: 'Start the watch again' }).click();
await page.locator('.rl-watch.is-on').waitFor();
await later(12 * MIN); await page.locator('.rl-event').click();
await later(13 * MIN); await page.locator('.rl-kinds').getByRole('button', { name: 'misfeed', exact: true }).click();
await later(5 * MIN);
await page.getByRole('button', { name: 'Stop the watch' }).click();
await page.locator('.rl-watch:not(.is-on)').waitFor();
await page.waitForTimeout(500);
{
  const t = await truth(RID);
  ok(t.n === 6 && Math.abs(t.hours - 106 / 60) < 0.4 / 60 && t.stretches === 2 && t.days === 2, '4 the next day adds to it — 6 stops in 106 min, two stretches on two days', JSON.stringify(t));
  ok(JSON.stringify(await screenTiles()) === JSON.stringify(t.tiles), '4 the tiles as the module says', JSON.stringify(await screenTiles()));
  ok(await page.locator('.rl-days tbody tr').count() === 3, '4 a day a row, and all of it');
  ok(await page.locator('.ln-trend').count() === 1, '4 the MTBF day by day drawn');
  ok(await page.locator('.rl-fig .rl-med').count() === 1, '4 the gaps between stops drawn');
  const kinds = (await page.locator('.rl-kindbars .ws-bar .ws-bar-w').allInnerTexts()).map(flat);
  ok(JSON.stringify(kinds) === JSON.stringify(t.kinds.map(k => k.split(':')[0])), '4 what the stops were, the most first', `${kinds} vs ${t.kinds}`);
  const band = flat(await page.locator('.ln-band .ln-verdict').innerText());
  ok(band === t.said.verdict && t.said.tone === 'a', '4 against 30 min wanted: below it, not yet sure — amber', `${band} / ${t.said.tone}`);
}
await shot('rl-day2');

/* ---- 5 the MTBF wanted changed ---- */
await page.getByRole('button', { name: 'Change what was agreed' }).click();
await page.locator('input[aria-label="MTBF wanted, minutes"]').fill('5');
await page.getByRole('button', { name: 'Keep it' }).click();
await page.locator('.rl-watch').waitFor();
await page.waitForTimeout(400);
{
  const t = await truth(RID);
  const band = flat(await page.locator('.ln-band .ln-verdict').innerText());
  ok(band === t.said.verdict && /meets the MTBF wanted/.test(band) && t.said.tone === 'g', '5 against 5 min wanted: it meets it — the verdict moved as the module says', band);
}

/* ---- 6 every stop, one struck ---- */
await page.getByRole('button', { name: /^Every stop/ }).click();
const rows = page.locator('.ie-all .ie-rows li');
ok(await rows.count() === 7, '6 every stop listed, the undone one among them', String(await rows.count()));
await rows.nth(0).getByRole('button', { name: 'Strike' }).click();
await page.waitForTimeout(400);
{
  const t = await truth(RID);
  ok(t.n === 5 && JSON.stringify(await screenTiles()) === JSON.stringify(t.tiles), '6 a stop struck — five counted, the tiles moved with it', JSON.stringify(await screenTiles()));
}
await rows.nth(0).getByRole('button', { name: 'Restore' }).click();
await page.waitForTimeout(400);
ok((await truth(RID)).n === 6, '6 and restored');

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
  const text = await pdfText(() => page.getByRole('button', { name: 'This study on paper (PDF)' }).click());
  ok(/RELIABILITY STUDY/i.test(text) && text.includes('Capper stops'), '8 on paper — what it is and its name', text.slice(0, 300));
  ok(t.tiles.every(([k, v]) => text.includes(k.toUpperCase()) || text.includes(k)) && text.includes(t.tiles[0][1]), '8 the tiles — MTBF and the rest', t.tiles.map(x => x.join(' ')).join(' | '));
  ok(text.includes('Stops against watched hours') && text.includes('MTBF, day by day') && text.includes('Day by day'), '8 the graphs’ headings and the days');
  ok(text.includes('Commentary') && text.includes('below a quarter'), '8 the commentary');
  ok(text.includes(flat(t.closing).slice(0, 40)), '8 the closing line', t.closing);
}
await shot('rl-paper-page');

/* ---- 9 the list, the line, the front door ---- */
await go('#/reliability');
{
  const t = await truth(RID);
  const row = flat(await page.locator(`.lt-li[data-study="${RID}"]`).innerText());
  ok(row.includes('Capper stops') && row.includes(t.said.verdict) && row.includes('6 stops') && !row.includes('watching now'), '9 the list’s row says it', row);
}
await go(`#/lines/${sd.wsId}`);
{
  const tile = page.locator('.pl-tool', { has: page.locator('b', { hasText: /^Reliability$/ }) });
  const said = flat(await tile.innerText());
  ok(/2 on this line/.test(said) && said.includes('Capper stops'), '9 the line’s page — Reliability with its latest and how many', said);
}
await go('#/');
ok(await page.locator('.fd-tools li[data-tool="reliability"]').count() === 1, '9 the front door lists it among the tools');

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
  const ev = await p.locator('.rl-event').boundingBox();
  ok(ev && ev.height >= 100 && ev.width >= 300, '10 the event button big on a phone', JSON.stringify(ev));
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
  ok(ended.to !== undefined && ended.to === ended.at, '10 stopped at its last stop — the night not counted as watched', JSON.stringify(ended));
  await p.close();
}

ok(errs.length === 0, 'no console error anywhere', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
