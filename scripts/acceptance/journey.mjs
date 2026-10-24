/* THE JOURNEY, DRIVEN — J2 (docs/JOURNEY.md). Rowland, 23 October: "pick a
 * range of reporting period ... from this date to that date ... collate all
 * the information between them two dates ... the entire history ... it's
 * the journey. It's all of it."
 *
 * On the seeded stage-gate project (and the 6M project's tab):
 *
 *   1  Journey on the project's tabs, lit on its page; this week and next by
 *      default, the range on the address
 *   2  the days and every line as lib/journey says them from the records —
 *      the tiles, the closing line, a test booked on its day
 *   3  the tools we will use: three ticked with what for and when, each a
 *      plan on the Actions page wearing its tool and on the journey's day;
 *      a tool used already saying its records; one unticked, and Undo
 *   4  the commentary for today written, kept after a reload, edited, and
 *      deleted with Undo
 *   5  the range changed three ways — this week, two picked dates, since
 *      the start — the page following each; ‹ earlier
 *   6  a range sent as a link opens on it
 *   7  the front page's This week and next line, as the module counts it
 *   8  the phone: nothing off the side, the tick list folded to the ticked
 *   9  the paper (J3): the journey report for the range shown, read back
 *      against the module — this week and next, two picked dates, since
 *      the start; from the front page's Report ▾ and from Reports; this
 *      week and next on the status report; a 6M project's
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/journey.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper } from '../lib/pageHeader.mjs';
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const dir = mkdtempSync(join(tmpdir(), 'fl-journey-'));

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1800); };
const pdfText = async click => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 40000 }), click()]);
  const f = join(dir, `${Date.now()}.pdf`); await d.saveAs(f);
  return flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
};
/* THE PAPER FOR THE RANGE SHOWN, read back against the module: the range, every day and every line, the tiles, the closing line */
const paperSays = async (t, label) => {
  const text = await pdfText(() => paper(page, /^Journey report — /));
  /* a day is printed as its label ("Mon, 19 Oct"), as the page heads it */
  const san = await page.evaluate(async xs => { const { san } = await import('/src/lib/reportKit.ts'); const { niceDay } = await import('/src/lib/weeks.ts'); return xs.map(x => san(x.startsWith('@') ? niceDay(x.slice(1), { weekday: 'short' }) : x)); },
    [t.label, t.closing, ...t.lines.flatMap(d => [`@${d.date}`, ...d.texts, ...d.notes])]);
  const [rangeSaid, closingSaid, ...rest] = san;
  const missing = rest.filter(x => x && !text.includes(flat(x)));
  ok(text.includes(rangeSaid) && text.includes(closingSaid) && !missing.length && t.tiles.every(([k, v]) => text.includes(`${k.toUpperCase()} ${v}`)),
    `9 the paper — ${label}: the range, ${t.lines.reduce((n, d) => n + d.texts.length, 0)} lines on ${t.days.length} days, the tiles, the closing line`, missing.slice(0, 3).join(' | ') || text.slice(0, 200));
  return text;
};

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PID = sd.projectId;

/* WHAT THE RECORDS SAY — the journey read by the module from the device's own records, for a pick or two dates */
const truth = (pick, dates) => page.evaluate(async ([pid, pick, dates]) => {
  const db = await import('/src/db.ts'); const J = await import('/src/project/journey/journey.ts'); const W = await import('/src/lib/weeks.ts'); const M = await import('/src/lib/planModel.ts');
  const today = W.todayISO();
  const project = await db.getProject(pid);
  const items = await db.listTestItems(pid);
  const gate = M.planModel(project) === 'commissioning'
    ? { tests: await db.listTests(pid), items, assets: await db.listAssets(pid), materials: await db.listMaterials(pid), programs: await db.listPrograms(pid), studies: await db.listStudies(pid) }
    : undefined;
  const steps = await db.listPaceTodos(pid);
  const register = (await db.listAllSnags()).filter(s => s.projectId === pid && !s.deletedAt);
  const studies = await db.listStudies(pid);
  const input = { ...(gate ? { gate } : { materials: await db.listMaterials(pid), programs: await db.listPrograms(pid) }), steps, register, notes: items, studies };
  const range = J.rangeOf(pick, today, W.isoDay(project.createdAt), dates);
  const j = J.journeyOf(input, range, today);
  const plans = J.toolPlansOf(steps);
  return {
    name: project.name, today, range, label: J.rangeLabel(range, today), days: j.days.map(d => d.date), ndays: J.daysOf(range).length, skipped: j.skipped,
    lines: j.days.map(d => ({ date: d.date, texts: d.lines.map(l => l.text), kinds: d.lines.map(l => l.kind ?? ''), notes: d.commentary.map(c => c.what) })),
    tiles: J.journeyTiles(j, today).map(t => [t.k, t.v]), counts: j.counts, closing: J.journeyClosing(j, project.name, today).text,
    plans: plans.map(p => [p.tool, p.name, p.what, p.due ?? '']),
    week: J.weekLine(input, today, W.isoDay(project.createdAt)).text,
    booked: j.days.filter(d => d.date > today).flatMap(d => d.lines.filter(l => l.tone === 'booked' && l.id).map(l => ({ date: d.date, text: l.text })))[0] ?? null,
    studiesBy: Object.fromEntries(['capability', 'balance', 'changeover', 'sampling', 'losses', 'reliability', 'video'].map(t => [t, studies.filter(s => !s.deletedAt && s.tool === t).length])),
  };
}, [PID, pick, dates]);

/* what the page shows */
const shown = async () => ({
  label: flat(await page.locator('.jn-range-t').innerText()),
  days: await page.locator('.jn-day').evaluateAll(es => es.map(e => e.dataset.date)),
  lines: await page.locator('.jn-day').evaluateAll(es => es.map(e => ({ date: e.dataset.date, texts: [...e.querySelectorAll('.jn-li .lt-what')].map(x => x.textContent.replace(/\s+/g, ' ').trim()), notes: [...e.querySelectorAll('.jn-note-t')].map(x => x.childNodes[0]?.textContent?.replace(/\s+/g, ' ').trim() ?? '') }))),
  tiles: await page.locator('.jn-tiles .ln-tile').evaluateAll(es => es.map(e => [e.querySelector('.ln-k')?.textContent.trim(), e.querySelector('.ln-v')?.textContent.trim()])),
  closing: flat(await page.locator('.ln-close > span:last-child').innerText()),
  url: page.url().split('#')[1],
});
/* the page's days are the module's, plus today empty when it is in the range and had nothing */
const sameDays = (t, s) => same(s.lines.filter(d => d.texts.length || d.notes.length || d.date !== t.today).map(d => [d.date, d.texts]), t.lines.map(d => [d.date, d.texts]));

/* ---- 1 one of the project's tabs; this week and next by default; the range on the address ---- */
await go(`#/project/${PID}`);
const tab = page.locator('.nv-tabs .nv-tab').filter({ has: page.locator('.nv-tab-l', { hasText: /^Journey$/ }) });
await tab.click(); await page.waitForTimeout(2500);
ok(page.url().includes(`#/project/${PID}/journey`), '1 Journey from the project’s tabs', page.url());
ok(await tab.getAttribute('aria-current') === 'page', '1 its tab on, on its page');
let t = await truth('thisAndNext');
let s = await shown();
ok(s.label === t.label && s.url.includes(`from=${t.range.from}&to=${t.range.to}`), `1 this week and next by default — ${t.label} — on the address`, `${s.label} · ${s.url}`);
ok(await page.getByRole('group', { name: 'Range' }).getByRole('button', { name: 'This week and next' }).getAttribute('aria-pressed') === 'true', '1 its chip pressed');

/* ---- 2 the days and every line as the module says ---- */
ok(t.days.length > 3 && sameDays(t, s), `2 the days in order, each line the record’s own — ${t.days.length} days, ${t.lines.reduce((n, d) => n + d.texts.length, 0)} lines`, JSON.stringify(s.lines.map(d => [d.date, d.texts.length])) + ' vs ' + JSON.stringify(t.lines.map(d => [d.date, d.texts.length])));
ok(same(s.tiles, t.tiles), `2 the tiles: ${t.tiles.map(x => x.join(' ')).join(' · ')}`, JSON.stringify(s.tiles));
ok(s.closing === t.closing, `2 the closing line: "${t.closing}"`, s.closing);
ok(t.booked && s.lines.find(d => d.date === t.booked.date)?.texts.includes(t.booked.text), `2 a test booked ahead on its day: ${t.booked?.date} — "${t.booked?.text}"`);
const skippedSaid = flat(await page.locator('.jn-skipped').innerText().catch(() => ''));
ok(t.skipped === 0 ? !skippedSaid : skippedSaid.startsWith(`${t.skipped} day`), `2 the days with nothing said once: "${skippedSaid}"`);
ok(flat(await page.locator('.jn-day.is-today h2').innerText()).endsWith('today'), '2 today marked');
/* ---- 9 the paper for this week and next, from the page's Report ▾ ---- */
{
  const t0 = await truth('thisAndNext');
  const text = await paperSays(t0, 'this week and next');
  ok(/THE JOURNEY/.test(text) && text.includes('The tools we are using'), '9 the band and the tools we are using on it');
}

/* ---- 3 the tools we will use ---- */
/* every tool the catalogue registers is offered — counted from it, so a tool built later never breaks the count */
const NTOOLS = await page.evaluate(async () => (await import('/src/catalogue/registry.ts')).APP_TOOLS.length);
const toolRow = label => page.locator('.jn-tool', { has: page.locator('.jn-tool-tick b', { hasText: new RegExp(`^${label}$`) }) });
ok((await page.locator('.jn-tool').count()) === NTOOLS && (await page.locator('.jn-tool.is-on').count()) === 0, `3 every tool offered (${NTOOLS}), none ticked yet`);
const usedRow = Object.entries(t.studiesBy).find(([, n]) => n > 0);
const usedLabel = { capability: 'Capability', balance: 'Line balance', changeover: 'SMED', sampling: 'Work sampling', losses: 'Loss count', reliability: 'Reliability', video: 'Video study' }[usedRow?.[0]];
ok(usedRow && flat(await toolRow(usedLabel).locator('.jn-tool-used').innerText()) === `${usedRow[1]} ${usedRow[1] === 1 ? 'record' : 'records'} so far`, `3 a tool used already says its records: ${usedLabel} — ${usedRow?.[1]}`);
const day5 = t.booked?.date ?? t.range.to;
const picks = [['SMED', 'Time the Tesco changeover on the wrapper', day5], ['Line capacity', 'What the line can make at the new rate', t.range.to], ['Loss count', 'A shift at the bottleneck', '']];
for (const [label, words, when] of picks) {
  await toolRow(label).getByLabel(`Use ${label}`).check(); await page.waitForTimeout(600);
  await toolRow(label).getByLabel(`What ${label} is for`).fill(words);
  await toolRow(label).getByLabel(`What ${label} is for`).press('Enter'); await page.waitForTimeout(500);
  if (when) { await toolRow(label).getByLabel(`When ${label} is planned`).fill(when); await page.waitForTimeout(500); }
}
t = await truth('thisAndNext');
ok(same(t.plans, [['linebalance', 'Line capacity', picks[1][1], t.range.to], ['changeover', 'SMED', picks[0][1], day5], ['losses', 'Loss count', picks[2][1], '']]), '3 three tools ticked, each a plan with what for and when, in the catalogue’s order (Line capacity before SMED)', JSON.stringify(t.plans));
ok((await page.locator('.jn-tool.is-on').count()) === 3 && flat(await page.locator('.jn-tools .qsl-gh .sub').innerText()) === `3 of ${NTOOLS} ticked`, `3 the list says 3 of ${NTOOLS} ticked`);
s = await shown();
const smedDay = s.lines.find(d => d.date === day5);
ok(smedDay?.texts.includes(`SMED: ${picks[0][1]}.`) && sameDays(t, s), `3 the plan on the journey’s day, in the tool’s word: "SMED: ${picks[0][1]}."`, JSON.stringify(smedDay?.texts));
await go(`#/project/${PID}/actions`);
const actWhats = (await page.locator('.act-li .lt-what').allInnerTexts()).map(flat);
ok(actWhats.includes(`SMED: ${picks[0][1]}`) && actWhats.includes(`Loss count: ${picks[2][1]}`), '3 each plan on the Actions page, wearing its tool', JSON.stringify(actWhats.slice(0, 8)));
await go(`#/project/${PID}/journey`);
await toolRow('Loss count').getByLabel('Use Loss count').uncheck(); await page.waitForTimeout(800);
ok((await page.locator('.jn-tool.is-on').count()) === 2 && (await truth('thisAndNext')).plans.length === 2, '3 one unticked — its plan gone');
await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(1200);
ok((await page.locator('.jn-tool.is-on').count()) === 3 && (await truth('thisAndNext')).plans.length === 3, '3 Undo brings it back');

/* ---- 4 the commentary for today ---- */
const todaySec = page.locator(`.jn-day[data-date="${t.today}"]`);
await todaySec.locator('.jn-note-add').click();
await todaySec.getByLabel(/^Commentary for /).fill('Seal failures traced to the jaw temperature; new jaws ordered for Monday.');
await todaySec.locator('.jn-note-edit button[type=submit]').click(); await page.waitForTimeout(800);
ok(flat(await todaySec.locator('.jn-note-t').first().innerText()).startsWith('Seal failures traced'), '4 the commentary written under today');
await go(`#/project/${PID}/journey`);
t = await truth('thisAndNext');
ok(t.lines.find(d => d.date === t.today)?.notes[0]?.startsWith('Seal failures traced') && flat(await page.locator(`.jn-day[data-date="${t.today}"] .jn-note-t`).first().innerText()).startsWith('Seal failures traced'), '4 kept after a reload — a note on the day (lib/noteScope day:)');
await page.locator(`.jn-day[data-date="${t.today}"]`).getByLabel('Edit this commentary').first().click();
await page.locator(`.jn-day[data-date="${t.today}"]`).getByLabel('The commentary').fill('Seal failures traced to the jaw temperature; new jaws fitted Monday, re-test Tuesday.');
await page.locator(`.jn-day[data-date="${t.today}"] .jn-note-edit button[type=submit]`).click(); await page.waitForTimeout(800);
ok((await truth('thisAndNext')).lines.find(d => d.date === t.today)?.notes[0]?.endsWith('re-test Tuesday.'), '4 edited in place, kept');
await page.locator(`.jn-day[data-date="${t.today}"]`).getByLabel('Delete this commentary').first().click(); await page.waitForTimeout(800);
ok((await truth('thisAndNext')).lines.find(d => d.date === t.today)?.notes.length === 0, '4 deleted');
await page.getByRole('button', { name: 'Undo', exact: true }).click(); await page.waitForTimeout(1200);
ok((await truth('thisAndNext')).lines.find(d => d.date === t.today)?.notes[0]?.endsWith('re-test Tuesday.'), '4 Undo brings it back');
await go(`#/project/${PID}/notes`);
ok(flat(await page.locator('.nv-main').innerText()).includes('re-test Tuesday.'), '4 and it is a note of the project — on Notes under its day');

/* ---- 5 the range changed three ways ---- */
await go(`#/project/${PID}/journey`);
await page.getByRole('group', { name: 'Range' }).getByRole('button', { name: 'This week', exact: true }).click(); await page.waitForTimeout(1200);
t = await truth('thisWeek'); s = await shown();
ok(s.label === t.label && sameDays(t, s) && same(s.tiles, t.tiles) && s.url.includes(`from=${t.range.from}&to=${t.range.to}`), `5 this week: ${t.label}, ${t.days.length} days with something`, `${s.label} / ${JSON.stringify(s.days)} vs ${JSON.stringify(t.days)}`);
await page.getByRole('group', { name: 'Range' }).getByRole('button', { name: 'Pick dates' }).click(); await page.waitForTimeout(300);
const from = new Date(Date.now() - 20 * 86400000), to = new Date(Date.now() + 3 * 86400000);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
await page.getByLabel('From', { exact: true }).fill(iso(from)); await page.getByLabel('To', { exact: true }).fill(iso(to)); await page.waitForTimeout(1200);
t = await truth('dates', { from: iso(from), to: iso(to) }); s = await shown();
ok(s.label === t.label && t.ndays === 24 && sameDays(t, s) && s.closing === t.closing, `5 two picked dates: ${t.label} — 24 days, ${t.days.length} with something`, `${s.label} / ${s.closing}`);
await paperSays(t, 'two picked dates');
await page.getByRole('group', { name: 'Range' }).getByRole('button', { name: 'Since the start' }).click(); await page.waitForTimeout(1500);
t = await truth('sinceStart'); s = await shown();
ok(s.label === t.label && sameDays(t, s) && s.closing === t.closing, `5 since the start: ${t.label} — the whole history, ${t.days.length} days with something`, `${s.label} / ${JSON.stringify(s.days)} vs ${JSON.stringify(t.days)}`);
await paperSays(t, 'since the start');
await page.getByRole('group', { name: 'Range' }).getByRole('button', { name: 'This week', exact: true }).click(); await page.waitForTimeout(800);
await page.getByLabel('Earlier').click(); await page.waitForTimeout(1200);
t = await truth('lastWeek'); s = await shown();
ok(s.label === t.label && sameDays(t, s), `5 ‹ earlier from this week is last week: ${t.label}`, s.label);
ok(await page.getByRole('group', { name: 'Range' }).getByRole('button', { name: 'Last week' }).getAttribute('aria-pressed') === 'true', '5 and its chip says so');

/* ---- 6 a range sent as a link ---- */
await go(`#/project/${PID}/journey?from=${iso(from)}&to=${iso(to)}`);
t = await truth('dates', { from: iso(from), to: iso(to) }); s = await shown();
ok(s.label === t.label && sameDays(t, s), `6 a link to a range opens on it: ${t.label}`, s.label);

/* ---- 7 the front page's line ---- */
await go(`#/project/${PID}`);
t = await truth('thisAndNext');
const week = flat(await page.locator('.jn-week').innerText());
const c = t.counts;
const want = `This week and next · ${c.done} done · ${c.toDo ? `${c.toDo} still to do${c.late ? ` (${c.late} late)` : ''}` : 'nothing still to do'} · ${c.planned} planned · Open the journey ›`;
ok(week === want, `7 the front page: "${want}"`, week);
await page.locator('.jn-week button').click(); await page.waitForTimeout(1500);
ok(page.url().includes(`/journey?from=${t.range.from}&to=${t.range.to}`), '7 Open the journey lands on this week and next');
/* ---- 9 from the front page's Report ▾, from Reports, and this week and next on the status report ---- */
await go(`#/project/${PID}`);
{
  const text = await pdfText(() => paper(page, 'Journey report — this week and next'));
  ok(text.includes(t.label) && text.includes(t.closing), `9 the front page's Report ▾ makes it for this week and next, made on arrival`, text.slice(0, 160));
}
await go(`#/project/${PID}`);
{
  await page.locator('.nv-rail .nv-ri', { has: page.locator('.nv-ri-l', { hasText: /^Reports$/ }) }).click(); await page.waitForTimeout(800);
  const text = await pdfText(() => page.locator('.meet-report', { has: page.locator('b', { hasText: /^Journey report$/ }) }).click());
  ok(text.includes(t.label), '9 Reports lists it, and the door makes it', text.slice(0, 160));
}
await go(`#/project/${PID}/report`);
{
  const text = await pdfText(async () => { await page.getByRole('button', { name: 'Status — 1 page' }).click(); await page.getByRole('button', { name: 'Download' }).click(); });
  ok(text.includes(t.week), `9 the status report says it in one line: "${t.week}"`, text.slice(0, 200));
}

/* ---- the 6M project has the tab too ---- */
await go(`#/project/${sd.pacedProjectId}/journey`);
ok((await page.locator('.jn-day').count()) > 0 && (await page.locator('.jn-tool').count()) === NTOOLS, `a 6M project’s journey: ${await page.locator('.jn-day').count()} days with something`);
{
  const text = await pdfText(() => paper(page, /^Journey report — /));
  ok(/THE JOURNEY/.test(text) && text.includes('still to do'), '9 a 6M project’s journey report', text.slice(0, 160));
}

/* ---- 8 the phone ---- */
await ctx.close();
const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx2.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx2.route('**://*.supabase.co/**', r => r.abort());
const p2 = await ctx2.newPage();
p2.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
p2.on('pageerror', e => errs.push(e.message));
/* a fresh profile: its own records — seeded again, three tools planned on it */
await p2.goto(`${BASE}/#/room`); await p2.locator('.nv-main').waitFor({ timeout: 15000 }); await p2.waitForTimeout(1500);
const sd2 = await p2.evaluate(async () => {
  const seed = await (await import('/src/dev/seed.ts')).seedForSmokeTest();
  const db = await import('/src/db.ts'); const ids = await import('/src/lib/ids.ts');
  for (const tool of ['changeover', 'linebalance', 'losses']) {
    const t = Date.now();
    await db.putPaceTodo({ id: ids.uid(), projectId: seed.projectId, what: `Plan for ${tool}`, where: '', why: '', who: '', when: '', state: 'todo', tool, createdAt: t, updatedAt: t });
  }
  return seed;
});
await p2.goto(`${BASE}/#/project/${sd2.projectId}/journey`); await p2.locator('.jn').waitFor({ timeout: 15000 }); await p2.waitForTimeout(2500);
const wide = await p2.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
ok(wide, '8 the phone: nothing off the side', await p2.evaluate(() => document.documentElement.scrollWidth));
const onPhone = await p2.locator('.jn-tool:visible').count();
ok(onPhone === 3 && await p2.locator('.jn-every').isVisible(), `8 the tick list folded to the ticked (${onPhone}) with Every tool under it`);
await p2.locator('.jn-every').click(); await p2.waitForTimeout(300);
ok((await p2.locator('.jn-tool:visible').count()) === NTOOLS, '8 Every tool unfolds them');
ok((await p2.locator('.jn-day').count()) > 3 && (await p2.locator('.jn-tiles .ln-tile').count()) === 4, '8 the days and the four tiles on the phone');
await ctx2.close();

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
