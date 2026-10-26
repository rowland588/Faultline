/* A LINE WATCH, DRIVEN (Rowland, 25 October, urgent): "Reliability ... line 2a I have 2 machines in the project
 * but I can't pick them in any drop down. I need to pick them, and if I pick the entire line, the next screen I
 * get all the assets. Then I set them up and I can run multiple asset analyses at the same time ... start one
 * clock for the entire line and I can click through the UI on each individual asset."
 *
 * A project on a line with two machines of its own (none yet on the line's list), the page's clock run by the
 * script (Playwright's clock):
 *
 *   1  the new study's Which machine is a drop-down that lists the project's two machines, the whole line
 *      ("all 2 machines") and another to type — and a machine picked from it makes the study of that machine
 *   2  the whole line: the next screen lists every machine ticked with what is counted at each (typed there,
 *      commas for more than one), an MTBF wanted; none ticked refused in words; Back keeps the first screen
 *   3  Start the line watch: one study a machine sharing one group, opening on the first with the strip of every
 *      machine on the line and the line's clock stopped
 *   4  one press starts the clock on every machine at the same moment; taps on one machine, a click through to
 *      the other (its clock already running, the same watched time), taps there; the strip's rows say what each
 *      has counted as lib/lineWatch says; one press stops them all at the same moment
 *   5  each machine's figures its own: MTBF as lib/reliability says (watched time ÷ taps), the same watched time
 *   6  the list shows a row for each machine; the phone — the strip and the buttons fit, nothing off the side
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/reliability-line.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
const MIN = 60_000;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
await page.clock.install();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };
const SHOTS = process.env.SHOTS;
const shot = async name => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };
const later = async ms => { await page.clock.fastForward(ms); await page.waitForTimeout(250); };

await go('#/room');
await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
/* a project on Line 2C with two machines of its own, none on the line's list yet */
const ids = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const l2c = await (await import('/src/lib/lines.ts')).addLineToFactory('Line 2C');
  const proj = await db.createProject('Line 2C guarding', '#2b87d4', 'Rowland', 'r@example.com', 'commissioning');
  await db.addPaceLine({ projectId: proj.id, workspaceId: l2c.id, key: '2C', name: 'Line 2C', sort: 0 });
  const t = Date.now();
  for (const [i, name] of ['Infeed belt', 'Wrapper 2'].entries()) await db.putAsset({ id: `ln-${i}-${t}`, projectId: proj.id, name, state: 'planned', sort: 10 * (i + 1), updatedAt: t });
  return { ws: l2c.id, project: proj.id };
});
const studies = () => page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(s => s.tool === 'reliability' && !s.deletedAt && /Line 2C — every machine|Infeed single/.test(s.name)));
const MACHINE = 'select[aria-label="Which machine"]';

/* ---- 1 the drop-down ---- */
await go(`#/reliability?project=${ids.project}`);
await page.getByRole('button', { name: 'New reliability study' }).first().click();
await page.locator(MACHINE).waitFor({ timeout: 8000 });
await page.waitForTimeout(400);
let opts = await page.locator(`${MACHINE} option`).evaluateAll(os => os.map(o => ({ v: o.value, t: o.textContent })));
const named = opts.filter(o => o.v && !o.v.startsWith('::')).map(o => o.v);
ok(named.length === 2 && named.includes('Infeed belt') && named.includes('Wrapper 2'), '1 the project’s two machines are in the drop-down', JSON.stringify(opts));
ok(opts.some(o => o.v === '::whole-line' && /The whole line — all 2 machines/.test(o.t)) && opts.some(o => o.v === '::other-machine'), '1 the whole line (all 2 machines) and another to type are offered', JSON.stringify(opts));
await page.locator('.lt-new input.text-input').first().fill('Infeed single');
await page.locator(MACHINE).selectOption('Infeed belt');
ok(await page.getByRole('button', { name: 'Start it' }).isEnabled(), '1 a machine picked, Start it');
await page.getByRole('button', { name: 'Start it' }).click();
await page.waitForURL(/#\/reliability\/[^/?]+/, { timeout: 10000 });
{
  const one = (await studies()).find(s => s.name === 'Infeed single');
  ok(one?.machine === 'Infeed belt' && !one.agreed?.reliability?.group, '1 one machine picked makes the study of that machine, on no line watch', JSON.stringify(one && { m: one.machine, a: one.agreed }));
}

/* a study of one machine: choosing to time each stop brings the usual reasons, editable, with the rest a press away */
{
  await page.locator('.ie-agree').waitFor();
  await page.locator('details.rl-more > summary').first().click();
  await page.getByLabel('Timing for stop').selectOption('stop');
  const v = await page.getByLabel('Reasons for stop', { exact: true }).inputValue();
  ok(v === 'jam, film break, sensor, material short, changeover, waiting for operator, quality check, no product', '1 timing each stop brings the usual reasons, to press at the machine and add to', v);
  await page.getByLabel('Reasons for stop', { exact: true }).fill('jam, film break');
  await page.getByRole('group', { name: 'Usual reasons for stop' }).getByRole('button', { name: '+ sensor' }).click();
  ok(await page.getByLabel('Reasons for stop', { exact: true }).inputValue() === 'jam, film break, sensor', '1 one press adds a usual reason');
}

/* ---- 2 the whole line, the next screen ---- */
await go(`#/reliability?project=${ids.project}`);
await page.getByRole('button', { name: 'New reliability study' }).first().click();
await page.locator(MACHINE).waitFor();
await page.waitForTimeout(400);
await page.locator(MACHINE).selectOption('::whole-line');
ok(await page.locator('.lt-new input.text-input').count() === 1, '2 the whole line asks for no machine to type — only what the watch is of');
await page.getByRole('button', { name: 'Next — the machines' }).click();
await page.locator('.rl-linesetup').waitFor();
await shot('line-setup');
const rows = await page.locator('.rl-linesetup-row').evaluateAll(els => els.map(e => ({ m: e.getAttribute('data-machine'), on: e.querySelector('input[type=checkbox]').checked, counting: e.querySelector('input.text-input')?.value })));
ok(rows.length === 2 && rows.every(r => r.on && r.counting === 'stop') && rows.map(r => r.m).join() === 'Infeed belt,Wrapper 2', '2 the next screen lists both machines, ticked, counting a stop each', JSON.stringify(rows));
await page.getByLabel('What is counted at Infeed belt').fill('stop');
await page.getByLabel('MTBF wanted at Infeed belt, minutes').fill('20');
/* every machine starts timing its stops, with the usual reasons ready to press and add to */
{
  const usual = await page.getByLabel('Reasons for a stop at Infeed belt').inputValue();
  ok(await page.getByLabel('Time each stop at Infeed belt and press its reason').isChecked() && usual === 'jam, film break, sensor, material short, changeover, waiting for operator, quality check, no product', '2 each machine times its stops with the usual reasons ready, editable', usual);
  await page.getByLabel('Reasons for a stop at Infeed belt').fill('jam, film break');
  await page.getByRole('group', { name: 'Usual reasons at Infeed belt' }).getByRole('button', { name: '+ sensor' }).click();
  ok(await page.getByLabel('Reasons for a stop at Infeed belt').inputValue() === 'jam, film break, sensor', '2 a usual reason is added with one press, the list kept as typed');
  await page.getByLabel('Time each stop at Wrapper 2 and press its reason').uncheck();   /* the second machine counts only: its figures stay the plain MTBF */
}
await page.getByLabel('Watch Wrapper 2').uncheck();
await page.getByLabel('Watch Infeed belt').uncheck();
ok(/Tick at least one machine/.test(flat(await page.locator('.rl-linesetup').innerText())) && await page.getByRole('button', { name: /Start the line watch/ }).isDisabled(), '2 none ticked is refused in words');
await page.getByLabel('Watch Infeed belt').check();
await page.getByLabel('Watch Wrapper 2').check();
await page.getByRole('button', { name: 'Back', exact: true }).click();
ok(await page.locator(MACHINE).inputValue() === '::whole-line', '2 Back returns to the first screen with the whole line still picked');
await page.getByRole('button', { name: 'Next — the machines' }).click();
await page.getByLabel('Reasons for a stop at Infeed belt').fill('jam, film break, sensor');
await page.getByLabel('Time each stop at Wrapper 2 and press its reason').uncheck();
await page.getByLabel('What is counted at Infeed belt').fill('stop');
await page.getByLabel('MTBF wanted at Infeed belt, minutes').fill('20');
ok(/Start the line watch — 2 machines/.test(flat(await page.locator('.rl-linesetup-go').innerText())), '2 the button says how many machines');
await page.getByRole('button', { name: /Start the line watch/ }).click();
await page.waitForURL(/#\/reliability\/[^/?]+/, { timeout: 10000 });
await page.locator('[data-line-watch]').waitFor({ timeout: 8000 });

/* ---- 3 one study a machine, one group ---- */
const made = (await studies()).filter(s => s.name === 'Line 2C — every machine');
const sib = made.filter(s => s.agreed?.reliability?.group);
ok(sib.length === 2 && new Set(sib.map(s => s.agreed.reliability.group)).size === 1 && sib.map(s => s.machine).sort().join() === 'Infeed belt,Wrapper 2' && sib.every(s => s.workspaceId === ids.ws && s.projectId === ids.project),
  '3 one study a machine, sharing one group, on the line and in the project', JSON.stringify(sib.map(s => [s.name, s.machine, s.agreed?.reliability?.group])));
const first = sib.find(s => s.machine === 'Infeed belt'), second = sib.find(s => s.machine === 'Wrapper 2');
ok(first.agreed.reliability.counts.map(c => c.name).join() === 'stop' && first.agreed.reliability.counts[0].targetMin === 20 && second.agreed.reliability.counts.map(c => c.name).join() === 'stop'
    && first.agreed.reliability.counts.every(c => c.timed === 'stop' && c.reasons.join() === 'jam,film break,sensor') && !second.agreed.reliability.counts[0].timed,
  '3 what was set up at each machine is what each counts, the MTBF wanted on the first', JSON.stringify([first.agreed, second.agreed]));
ok(page.url().includes(first.id), '3 it opens on the first machine');
const strip = async () => flat(await page.locator('[data-line-watch]').innerText());
ok(/2 machines on one clock — the watch is stopped/.test(await strip()) && await page.locator('[data-line-watch] [data-machine="Infeed belt"][aria-current="page"]').count() === 1, '3 the strip names both machines on one clock, the first open', await strip());
ok(await page.locator('.rl-watch .rl-k').textContent() === 'The line’s watch is stopped', '3 the clock says it is the line’s');

/* ---- 4 one press starts them all ---- */
await page.getByRole('button', { name: /Start the line.s watch/ }).click();
await page.waitForTimeout(500);
await later(10 * MIN);
let WATCHED_H = 0;
const runs = async () => page.evaluate(async ids => { const db = await import('/src/db.ts'); return Promise.all(ids.map(async id => (await db.getStudy(id)).facts.watch ?? [])); }, [first.id, second.id]);
{
  const [a, c] = await runs();
  ok(a.length === 1 && c.length === 1 && a[0].from === c[0].from && !a[0].to && !c[0].to, '4 one press started the same stretch on both machines at the same moment', JSON.stringify([a, c]));
}
ok(/Watching the line — 2 machines/.test(await page.locator('.rl-watch .rl-k').textContent()) && /2 machines on one clock — all watching/.test(await strip()), '4 the clock and the strip say the line is being watched');
/* THE STOPWATCH WITH ITS REASONS (26 October — Rowland: "when I've got the stopwatch in front of me, these reasons need to be available ...
   as I press it, the clock stops and starts timing that issue"): the reasons are the buttons, on the watch itself */
{
  const reason = r => page.locator('.rl-reasons').getByRole('button', { name: `Stop: ${r}`, exact: true });
  const shown = await page.locator('.rl-reasons .rl-reason').evaluateAll(els => els.map(e => e.getAttribute('data-reason')));
  ok(shown.join() === 'jam,film break,sensor', '4 every reason is a button on the watch itself, ready to press', shown.join());
  ok(!(await page.locator('.rl-buttons').getByRole('button', { name: 'Tap a stop' }).count()), '4 no plain Stop button hides them, and nothing is typed');
  const before = await page.locator('.rl-time').innerText();
  await reason('jam').click();                                   /* one press: a stop, its reason, timing at once */
  await page.waitForTimeout(300);
  ok(await page.locator('.rl-stopped-row').count() === 1 && /Stopped — jam/.test(await page.locator('.rl-stopped-k').textContent()), '4 one press on the reason stopped it, said as “Stopped — jam”');
  ok(await reason('film break').isDisabled(), '4 the reasons wait while a stop is being timed');
  await later(20_000);
  const timer = await page.locator('.rl-stopped-t').innerText();
  const clockNow = await page.locator('.rl-time').innerText();
  await shot('line-stopped');
  ok(timer === '0:00:20' || timer === '0:00:21', `4 the stop is timing itself (${timer})`, timer);
  await later(20_000);
  ok(await page.locator('.rl-time').innerText() === clockNow && /paused/.test(await page.locator('.rl-clock .sub').innerText()), '4 the running clock waited while it was stopped', `${before} → ${clockNow} → ${await page.locator('.rl-time').innerText()}`);
  await page.locator('.rl-stopped-done').click();
  await page.waitForTimeout(300);
  ok(await page.locator('.rl-stopped-row').count() === 0 && await reason('film break').isEnabled(), '4 Running again closed it and the reasons are back');
  await later(1 * MIN);
  await reason('film break').click(); await later(30_000); await page.locator('.rl-stopped-done').click();
  await page.getByLabel('Another reason').fill('Bottle down'); await page.getByRole('button', { name: 'Stop', exact: true }).last().click();
  await page.waitForTimeout(300);
  ok(await reason('bottle down').count() === 1, '4 a reason typed once is pressed at once and joins the buttons');
  await later(30_000); await page.locator('.rl-stopped-done').click();
  await page.waitForTimeout(400);
  const got = await page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)).facts.events.filter(e => e.reason).map(e => [e.reason, !!e.fixedAt]), first.id);
  ok(JSON.stringify(got) === '[["jam",true],["film break",true],["bottle down",true]]', '4 three stops, each with its reason pressed and timed, none open', JSON.stringify(got));
}
await page.waitForTimeout(300);
ok(/Infeed belt 3 counted/.test(await strip()), '4 the strip counts what was tapped on this machine', await strip());
/* click through to the other machine */
await page.locator('[data-line-watch] [data-machine="Wrapper 2"]').click();
await page.waitForURL(new RegExp(second.id));
await page.locator('[data-line-watch]').waitFor();
await page.waitForTimeout(500);
ok(/Watching the line — 2 machines/.test(await page.locator('.rl-watch .rl-k').textContent()), '4 the other machine’s clock is already running, the same one');
ok(await page.locator('.rl-buttons').getByRole('button', { name: 'Tap a stop', exact: true }).isEnabled(), '4 its buttons are live without starting anything');
await page.locator('.rl-buttons').getByRole('button', { name: 'Tap a stop', exact: true }).click();
await later(4 * MIN);
await shot('line-running');
await page.getByRole('button', { name: /Stop the line.s watch/ }).click();
await page.waitForTimeout(600);
{
  const [a, c] = await runs();
  ok(a.length === 1 && c.length === 1 && a[0].to && a[0].to === c[0].to && a[0].from === c[0].from, '4 one press stopped both machines at the same moment', JSON.stringify([a, c]));
  const watched = a[0].to - a[0].from;
  WATCHED_H = watched / 3_600_000;
  ok(watched > 16 * MIN && watched < 18 * MIN, `4 the line was watched about 16 and a half minutes (${(watched / MIN).toFixed(1)}) — the same stretch on both`, watched);
}
ok(/the watch is stopped/.test(await strip()), '4 the strip says it is stopped', await strip());

/* ---- 5 each machine's figures are its own, on the same watched time ---- */
const truth = id => page.evaluate(async sid => {
  const db = await import('/src/db.ts'); const R = await import('/src/tools/reliability/reliability.ts');
  const s = await db.getStudy(sid);
  return R.relAll(s.agreed.reliability, s.facts.watch, s.facts.events, Date.now()).map(({ c, f }) => ({ name: c.event, n: f.n, hours: f.hours, mtbf: f.mtbfH }));
}, id);
{
  const ta = await truth(first.id), tb = await truth(second.id);
  ok(ta[0].n === 3 && ta.length === 1 && tb[0].n === 1 && ta[0].hours <= WATCHED_H + 1e-9 && Math.abs(tb[0].hours - WATCHED_H) < 1e-6, '5 the same watched time (less the timed stops on the first); their own taps (3 timed stops, 1 stop)', JSON.stringify([ta, tb]));
  ok(Math.abs(ta[0].mtbf * ta[0].n - ta[0].hours) < 0.001 && ta[0].hours <= WATCHED_H + 1e-9 && Math.abs(tb[0].mtbf - WATCHED_H) < 1e-6, '5 each MTBF is the running time over its own taps (the timed stops’ minutes come off the first; the whole watch on the second)', JSON.stringify([ta[0], tb[0].mtbf]));
  const text = flat(await page.locator('.rl-counted').first().innerText());
  ok(/MTBF \d+ min/.test(text), '5 the open machine’s page says its MTBF', text.slice(0, 300));
}

/* ---- 6 the list, the phone ---- */
await go('#/reliability');
const listed = flat(await page.locator('main, .nv-main').first().innerText());
ok(/Infeed belt/.test(listed) && /Wrapper 2/.test(listed), '6 the list has a row for each machine', listed.slice(0, 300));
await page.setViewportSize({ width: 390, height: 800 });
await go(`#/reliability/${second.id}`);
await page.locator('[data-line-watch]').waitFor();
await shot('line-phone');
const fits = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
ok(fits.sw <= fits.w + 1, '6 on a phone nothing is off the side', JSON.stringify(fits));
const rowBox = await page.locator('[data-line-watch] [data-machine="Infeed belt"]').boundingBox();
ok(rowBox && rowBox.height >= 44 && rowBox.width > 200, '6 a machine’s row on the phone is a big target', JSON.stringify(rowBox));
await page.locator('[data-line-watch] [data-machine="Infeed belt"]').click();
await page.waitForURL(new RegExp(first.id));
ok(true, '6 a tap on a row opens that machine on the phone');

ok(errs.length === 0, 'no console error anywhere', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
