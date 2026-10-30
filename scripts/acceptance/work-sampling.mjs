/* ACCEPTANCE — H1: WORK SAMPLING (docs/BUILD.md, H1; docs/TOOLKIT.md, tool 9).
 *
 * What people are doing across a shift, from one tap per person at random
 * moments — every share said with the margin it carries. The story, driven in
 * a real browser on the seeded job (Line 7's packing hall, Op 1 and Op 2
 * watched through the morning, one moment come a minute ago) with the real
 * controls:
 *
 *   1  a new study picks its line; the product's line standard offers its
 *      people; set up draws the shift's moments, in order
 *   2  the seeded study reads as the module says: the strip, and each
 *      person's shares with their margins
 *   3  the moment due asks — one tap per person, each stamped with the
 *      moment's own time, not the time it was answered; the strip moves
 *   4  a mistap struck counts for nothing, and the reading says so
 *   5  Make it better — a fix in the study's own figures, the study its
 *      evidence
 *   6  on a running line (the 6M job's Line 7): the line's card says the
 *      biggest share not the work; the fishbone offers each share a tenth or
 *      more on its bone, counted, and one accepted says where it came from;
 *      the 6M report's Evidence prints each person's shares with margins
 *   and a client reads it and changes nothing.
 *
 * Every sentence is checked against the module that makes it
 * (lib/ie/sampling, lib/studyLinks) on the same records. Fails on any
 * console error.
 *
 *   node scripts/acceptance/work-sampling.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
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

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });

let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2000); };
const san = x => x.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/[‘’]/g, "'").replace(/£/g, '').replace(/\s+/g, ' ');
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');

/* What the modules say of a study as it stands. */
const truth = id => page.evaluate(async id => {
  const { getStudy } = await import('/src/db.ts');
  const W = await import('/src/tools/sampling/sampling.ts');
  const L = await import('/src/lib/studyLinks.ts');
  const s = await getStudy(id);
  if (!s) return null;
  const a = s.agreed?.sampling, taps = s.facts.taps ?? [];
  return {
    a, taps, uses: s.uses,
    readings: (a?.who ?? []).map(w => W.samplingReading({ activities: a.activities, marginPts: a.marginPts, taps }, w)),
    verdict: W.samplingSays(a, taps).verdict,
    n: W.tapsOf(taps).length,
    due: a ? W.dueRound(a.prompts, taps, a.who, Date.now()) : undefined,
    better: L.betterWords(s), worth: L.worthBetter(s),
  };
}, id);

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const STUDY = `#/sampling/${sd.samplingId}`;

/* ---- 1 a new study: its line, its people, its moments ---- */
await go('#/sampling');
await page.getByRole('button', { name: 'New work sampling' }).first().click(); await page.waitForTimeout(500);
{
  const dlg = page.locator('[role="dialog"]').last();
  const lines = await dlg.locator('select option').allTextContents();
  const line = lines.find(x => /smoke test/.test(x));
  if (line) await dlg.locator('select').selectOption({ label: line });
  await page.waitForTimeout(400);
  await dlg.getByLabel(/What is it of/).fill('Night shift, packing hall');
  await dlg.getByLabel(/Which product/).fill('Maris Piper 2kg');
  await dlg.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  const id = page.url().split('sampling/')[1]?.split(/[?#]/)[0];
  const offered = await page.locator('.chip-row[aria-label="Who is watched"] .chip').allTextContents();
  ok(!!line && !!id && offered.includes('Op 1'), `1 a new study is on its line and its product's standard offers its people (${offered.join(', ')})`);
  await page.locator('.chip-row[aria-label="Who is watched"] .chip', { hasText: 'Op 1' }).first().click();
  await page.getByLabel('Add a person or role').fill('Team leader');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await page.getByRole('button', { name: 'Start sampling' }).click(); await page.waitForTimeout(900);
  const t = id ? await truth(id) : null;
  const inOrder = !!t?.a && t.a.prompts.every((p, i, xs) => i === 0 || xs[i - 1] <= p) && t.a.prompts.every(p => p >= t.a.from && p <= t.a.to);
  ok(!!t?.a && t.a.prompts.length === 40 && inOrder && t.a.who.join(',') === 'Op 1,Team leader', `1 set up: ${t?.a?.prompts.length} moments in the shift, in order; watching ${t?.a?.who.join(', ')}`);
  ok((await words('.ln-band .ln-verdict')).includes(t?.verdict ?? '—'), `1 it says "${t?.verdict}"`);
}

/* ---- 2 the seeded study reads as the module says ---- */
await go(STUDY);
{
  const t = await truth(sd.samplingId);
  /* the lean page (slice 6): the verdict on the band, the taps a tile */
  const strip = await words('.ie-strip');
  const said = await words('.ie-says');
  ok((await words('.ln-band .ln-verdict')).includes(t.verdict) && new RegExp(`taps ${t.n}\\b`, 'i').test(strip), `2 the band and the tiles: ${t.verdict} · ${t.n} taps`);
  ok(t.readings.every(r => said.includes(r)), `2 each person's shares, with their margins: ${t.readings.join(' / ')}`);
  ok((await page.locator('.ws-bar').count()) >= 6, '2 the shares drawn as bars, each with its margin');
}

/* ---- 3 the moment due asks; one tap per person, at the moment's time ---- */
{
  const t = await truth(sd.samplingId);
  const round = await words('.ws-round');
  ok(!!t.due && round.includes(`Moment ${t.due.no} of ${t.a.prompts.length}`), `3 the moment due asks: Moment ${t.due?.no} of ${t.a.prompts.length}`);
  ok(/● Moment/.test(await page.title()), '3 the tab says so, beyond the page');
  await page.locator('.ws-round .ws-person', { hasText: 'Op 1' }).getByRole('button', { name: 'working', exact: true }).click(); await page.waitForTimeout(500);
  await page.locator('.ws-round .ws-person', { hasText: 'Op 2' }).getByRole('button', { name: 'searching', exact: true }).click(); await page.waitForTimeout(900);
  const after = await truth(sd.samplingId);
  const at = after.taps.filter(x => x.at === t.due.at);
  ok(at.length === 2 && at.every(x => x.at === t.due.at) && after.n === t.n + 2, `3 two taps, stamped ${new Date(t.due.at).toTimeString().slice(0, 5)} — the moment, not when it was answered`);
  ok((await page.locator('.ws-round').count()) === 0 && new RegExp(`taps ${after.n}\\b`, 'i').test(await words('.ie-strip')), `3 the moment is answered; the tiles say ${after.n} taps`);
}

/* ---- 4 a mistap struck counts for nothing ---- */
{
  await page.locator('.ws-done-i', { hasText: 'Op 2 searching' }).getByRole('button', { name: /Strike/ }).click(); await page.waitForTimeout(900);
  const t = await truth(sd.samplingId);
  const struck = t.taps.filter(x => x.struck);
  const said = await words('.ie-says');
  ok(struck.length === 1 && struck[0].activity === 'searching' && t.readings.every(r => said.includes(r)), `4 struck, kept, counted for nothing: ${t.readings[1]}`);
}

/* ---- 5 Make it better: a fix in the study's own figures ---- */
{
  const t = await truth(sd.samplingId);
  const btn = page.getByRole('button', { name: /^Make it better/ });
  ok(t.worth && (await btn.count()) === 1, '5 Make it better is offered — a tenth or more of someone\'s time is not the work, from enough taps');
  if (await btn.count()) {
    await btn.click(); await page.waitForTimeout(1500);
    const after = await truth(sd.samplingId);
    const use = after.uses.find(u => u.kind === 'fix' && u.role === 'evidence');
    const fix = use && await page.evaluate(async ([pid, ref]) => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.id === ref), [sd.projectId, use.ref]);
    ok(!!fix && fix.title === t.better && fix.passesIf === t.better, `5 the fix says "${fix?.title}"`);
    ok(/fixes\?open=/.test(page.url()), '5 and it opens');
  }
}

/* ---- 6 on a running line: the line's card, the fishbone, the 6M report ----
   The same morning's taps, sampled on the 6M job's Line 7 as a person would
   start it there: the card says its biggest share not the work; the
   fishbone offers each share a tenth or more on its bone, counted; one
   accepted says "Work sampling" where it came from; and the 6M report's
   Evidence prints each person's shares with their margins. */
{
  const lineSid = await page.evaluate(async ([from, ws, pid]) => {
    const db = await import('/src/db.ts'); const s = await db.getStudy(from); const id = crypto.randomUUID(); const t = Date.now();
    await db.putStudy({ ...s, id, name: 'Line 7 packers, this morning', workspaceId: ws, projectId: pid, standardId: undefined, uses: [], createdAt: t, updatedAt: t });
    return id;
  }, [sd.samplingId, sd.line7WsId, sd.pacedProjectId]);
  const want = await page.evaluate(async ([sid, pid, cid]) => {
    const db = await import('/src/db.ts'); const W = await import('/src/tools/sampling/sampling.ts');
    const { loadProblems } = await import('/src/lib/useProblems.ts'); const F = await import('/src/lib/fishbone.ts');
    const s = await db.getStudy(sid); const a = s.agreed.sampling, taps = s.facts.taps ?? [];
    const loaded = await loadProblems(pid); const c = loaded.cases.find(x => x.id === cid);
    return { card: W.samplingCardLine(a, taps), rows: W.samplingRows(a, taps),
      offers: F.suggestionsFor(c, loaded.data, Date.now()).filter(x => x.source.kind === 'study' && x.source.tool === 'sampling').map(x => ({ text: x.text, m: x.m, grade: x.grade, ref: x.source.ref })) };
  }, [lineSid, sd.pacedProjectId, sd.oldCaseId]);
  await go(`#/project/${sd.pacedProjectId}?view=lines`);
  ok((await words('.lc-sample .lc-bal-t')) === want.card, `6 the line's card: "${await words('.lc-sample .lc-bal-t')}"`);
  await go(`#/project/${sd.pacedProjectId}/fishbone?problem=${sd.oldCaseId}`);
  const offered = await Promise.all(want.offers.map(async w => (await page.locator('button.is-sugg', { hasText: w.text }).count()) > 0));
  ok(want.offers.length >= 1 && want.offers.every(w => w.ref.startsWith(`${lineSid}#`) && w.grade === 'counted' && (w.m === 'method' || w.m === 'people')) && offered.every(Boolean),
    `6 the fishbone offers each share a tenth or more, counted: ${want.offers.map(w => `${w.text} (${w.m})`).join('; ')}`);
  if (want.offers[0]) {
    await page.locator('button.is-sugg', { hasText: want.offers[0].text }).first().click(); await page.waitForTimeout(600);
    const sheet = (await page.locator('[role="dialog"]').last().textContent()) ?? '';
    await page.getByRole('button', { name: 'Add to the fishbone' }).last().click(); await page.waitForTimeout(1000);
    const c = await page.evaluate(async ([cid, txt]) => ((await (await import('/src/db.ts')).getCase(cid))?.causes ?? []).find(x => x.text === txt), [sd.oldCaseId, want.offers[0].text]);
    ok(/Work sampling: Line 7 packers, this morning/.test(sheet) && c?.source?.tool === 'sampling' && c.m === want.offers[0].m && c.grade === 'counted', `6 accepted: on ${c?.m}, counted, "Work sampling" where it came from`);
  }
  await go(`#/pace-report?project=${sd.pacedProjectId}`);
  /* the full report: the one-page status is the one offered first */
  await page.getByRole('button', { name: 'Full report', exact: true }).click(); await page.waitForTimeout(400);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Download', exact: true }).first().click()]);
  const pdf = join(mkdtempSync(join(tmpdir(), 'sampling-')), 'sixm.pdf'); await dl.saveAs(pdf);
  const txt = san(execFileSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' '));
  const flatTxt = txt.replace(/\s+/g, '');
  const has = x => flatTxt.includes(san(x).replace(/\s+/g, '').slice(0, 60));
  const r = want.rows;
  const lost = [r.head, 'PERSON', 'TAPS', ...r.rows.flatMap(x => [x.who, ...(x.early ? [x.early] : x.cells.filter(c => c.share !== '—').map(c => `${c.share} ${c.margin}`))])].filter(x => !has(x));
  ok(!lost.length, `6 the 6M report's Evidence: each person's shares with their margins — "${r.head}"${lost.length ? ` — lost: ${lost.join(' | ')}` : ''}`);
}

/* ---- 7 · a device with no line; the shift it starts on; one more sample now (30 October — Rowland: "we must have tools that are ready and functional") ----
   A work sampling study watches a line's people. On a fresh device the picker was an empty "Pick the line…" and Start could not be
   pressed; it now offers "＋ A new line…", opens on it and says why. The shift it starts on was "now to now + 8 h" whoever's line it
   was: it is now the line's own shift (the one running, else the next today) and, with none set, the next whole hour for eight —
   said in words under the times. And between the random moments there is "Take a sample now": one tap makes this instant a moment,
   the round it asks is the ordinary one, it is kept apart as taken by hand and said so on the page and on paper. Desk and phone. */
for (const [label, width] of [['phone', 390], ['desk', 1360]]) {
  const c = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height: width < 900 ? 844 : 900 }, locale: 'en-GB', hasTouch: width < 900, acceptDownloads: true });
  await c.route('**://*.supabase.co/**', r => r.abort());
  await c.addInitScript(([k, v]) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const pg = await c.newPage();
  pg.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  pg.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
  const there = async h => { await pg.goto(`${BASE}/${h}`); await pg.waitForTimeout(2200); };
  const said = async (sel, root = pg) => ((await root.locator(sel).count()) ? (await root.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');
  const fit = () => pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const hmOf = ms => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  await there('#/room');
  ok(await pg.evaluate(async () => (await (await import('/src/db.ts')).listWorkspaces()).length) === 0, `7 ${label}: a fresh device has no line`);
  await there('#/sampling');
  await pg.getByRole('button', { name: 'New work sampling' }).first().click(); await pg.waitForTimeout(600);
  const dlg = pg.locator('[role="dialog"]').last();
  const opts = (await dlg.locator('select[data-line-field] option').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  ok(opts.length === 2 && /A new line/.test(opts[1]), `7 ${label}: the picker offers “＋ A new line…” (${opts.join(' | ')})`);
  ok((await said('[data-no-line]', dlg)) === 'A study belongs to a line — add yours here.', `7 ${label}: and says why in one line — "${await said('[data-no-line]', dlg)}"`);
  ok(await dlg.getByLabel('The new line’s name').inputValue() === 'Line 1' && await dlg.getByRole('button', { name: 'Start it' }).isDisabled(), `7 ${label}: opened on Line 1 — Start waits for what the study is of`);
  ok(await fit(), `7 ${label}: the sheet with the line to make — nothing off the side`);
  await dlg.getByLabel(/What is it of/).fill('Morning, packing hall');
  await dlg.getByLabel('The new line’s name').fill('Line 5');
  await dlg.getByRole('button', { name: 'Start it' }).click(); await pg.waitForTimeout(2200);
  const sid = pg.url().split('sampling/')[1]?.split(/[?#]/)[0];
  const made = await pg.evaluate(async id => { const db = await import('/src/db.ts'); const st = await db.getStudy(id); const ws = await db.listWorkspaces(); return { on: st?.workspaceId, ws: ws.map(w => [w.id, w.name]) }; }, sid ?? '');
  ok(!!sid && made.ws.length === 1 && made.ws[0][1] === 'Line 5' && made.on === made.ws[0][0], `7 ${label}: Start made Line 5 through Your factory's function and the study is on it`);

  /* the shift it starts on: no shift on the line — the next whole hour, for eight, said */
  const hourNext = Math.ceil(Date.now() / 3_600_000) * 3_600_000;
  const times = async () => ({ from: await pg.getByLabel('Shift from', { exact: true }).inputValue(), to: await pg.getByLabel('Shift to', { exact: true }).inputValue(), says: await said('[data-shift-says]') });
  let t = await times();
  ok(t.from === hmOf(hourNext) && t.to === hmOf(hourNext + 8 * 3_600_000) && /Line 5 has no shift set, so it starts at the next whole hour for eight hours/.test(t.says ?? ''), `7 ${label}: no shift on the line — from ${t.from} to ${t.to} (the next whole hour, for eight), said: "${t.says}"`);
  ok(await fit(), `7 ${label}: the set-up — nothing off the side`);
  /* …and the line's own shift once it has one (one running now, built from the clock so it holds at any hour) */
  const sh = await pg.evaluate(async wid => {
    const db = await import('/src/db.ts'); const w = (await db.listWorkspaces()).find(x => x.id === wid);
    const hm = ms => new Date(ms).toTimeString().slice(0, 5); const n = Date.now();
    const shift = { name: 'Day shift', start: hm(n - 3_600_000), end: hm(n + 6 * 3_600_000) };
    await db.updateWorkspace({ ...w, shifts: [shift] });
    return shift;
  }, made.on);
  await pg.waitForTimeout(1200);
  t = await times();
  const fromMs = (hh, mm) => { const d = new Date(); d.setHours(+hh, +mm, 0, 0); return d.getTime(); };
  const [fh, fm] = t.from.split(':'); const gap = fromMs(fh, fm) - Date.now();
  ok(t.to === sh.end && gap > -60_000 && gap <= 6 * 60_000 && /Line 5’s Day shift .* which is running — from \d\d:\d\d to its end/.test(t.says ?? ''), `7 ${label}: the line's own shift — from ${t.from} (now, to the next five minutes) to ${t.to}, its end: "${t.says}"`);
  /* a time typed over is left alone */
  await pg.getByLabel('Shift to', { exact: true }).fill('23:00'); await pg.waitForTimeout(300);
  ok((await times()).to === '23:00', `7 ${label}: a time typed over is kept`);

  /* set up: one person, and start */
  await pg.getByLabel('Add a person or role').fill('Op 1');
  await pg.getByRole('button', { name: 'Add', exact: true }).click();
  await pg.getByRole('button', { name: 'Start sampling' }).click(); await pg.waitForTimeout(1000);
  const st0 = await pg.evaluate(async id => { const s = await (await import('/src/db.ts')).getStudy(id); return s?.agreed?.sampling; }, sid);
  ok(!!st0 && st0.prompts.length === 40 && !st0.extra && st0.to - st0.from <= 8 * 3_600_000, `7 ${label}: 40 random moments drawn, none taken by hand`);

  /* take a sample now */
  const now0 = Date.now();
  await pg.evaluate(async (id) => { /* nothing due: move the clock past the first moment's grace so no round stands between us and the button */
    const db = await import('/src/db.ts'); const s = await db.getStudy(id);
    const a = s.agreed.sampling;
    await db.putStudy({ ...s, agreed: { ...s.agreed, sampling: { ...a, prompts: a.prompts.map(p => p + 3 * 86_400_000), from: a.from + 3 * 86_400_000, to: a.to + 3 * 86_400_000 } }, updatedAt: Date.now() });
  }, sid);
  await there(`#/sampling/${sid}`);
  const nowBtn = pg.locator('[data-sample-now]');
  ok(await pg.locator('.ws-round').count() === 0 && await nowBtn.count() === 1 && /Take a sample now/.test(await nowBtn.innerText()), `7 ${label}: between the moments the round offers “Take a sample now”`);
  if (width < 900) { const [h] = await nowBtn.evaluateAll(e => e.map(x => Math.round(x.getBoundingClientRect().height))); ok(h >= 44, `7 ${label}: the button is ${h} px tall`); }
  await nowBtn.click(); await pg.waitForTimeout(900);
  const round = (await said('.ws-round')) ?? '';
  const a1 = await pg.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)).agreed.sampling, sid);
  ok(a1.prompts.length === 41 && a1.extra?.length === 1 && a1.extra[0] >= now0 - 1000 && a1.extra[0] <= Date.now() && a1.prompts.every((p, i, xs) => i === 0 || xs[i - 1] <= p), `7 ${label}: this instant is now a moment, in order — 41 moments, 1 taken by hand`);
  ok(/Sample taken by hand — \d\d:\d\d/.test(round) && await nowBtn.count() === 0, `7 ${label}: the round is asked at once, "${round.slice(0, 50)}…", and the button waits while it is open`);
  ok(await fit(), `7 ${label}: the round — nothing off the side`);
  await pg.locator('.ws-round .ws-person', { hasText: 'Op 1' }).getByRole('button', { name: 'working', exact: true }).click(); await pg.waitForTimeout(800);
  const a2 = await pg.evaluate(async id => { const s = await (await import('/src/db.ts')).getStudy(id); return { taps: s.facts.taps, a: s.agreed.sampling }; }, sid);
  ok(a2.taps.length === 1 && a2.taps[0].at === a1.extra[0] && a2.taps[0].who === 'Op 1' && a2.taps[0].activity === 'working', `7 ${label}: one tap per person as at any moment, stamped with the moment`);
  const strip = (await said('.ie-strip')) ?? '';
  ok(/40 moments and 1 taken by hand in the shift/.test(strip) && /1 of 1 moment so far answered/.test(strip), `7 ${label}: the tiles say how many were taken by hand — "${strip.slice(0, 160)}"`);
  ok(await nowBtn.count() === 1, `7 ${label}: answered, the button is back for another`);
  await nowBtn.click(); await pg.waitForTimeout(1300);
  const a3 = await pg.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id)).agreed.sampling, sid);
  ok(a3.extra?.length === 2 || a3.prompts.length === 41, `7 ${label}: a second sample, 1.3 s later, is its own moment (${a3.extra?.length} by hand)`);
  /* its paper says it */
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 60000 }), pressPaper(pg, / — on paper$/)]);
  const f = join(mkdtempSync(join(tmpdir(), 'sampling-')), `${label}.pdf`); await dl.saveAs(f);
  const txt = san(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' '));
  ok(/moments and \d taken by hand/.test(txt) || /taken by hand/.test(txt), `7 ${label}: the paper says how many moments were taken by hand`);
  await c.close();
}

/* ---- a client reads it and changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(STUDY);
{
  const doors = await page.getByRole('button', { name: /^Make it better|Change what was agreed|^Close — keep|^Strike$|^working$|^waiting$/ }).count();
  ok((await page.locator('.ie-says').count()) === 1 && doors === 0, `a client reads the shares and changes nothing${doors ? ` — found ${doors} controls` : ''}`);
}
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nH1 accepted: work sampling holds, from the moment to the fix, on the fishbone and on paper');
process.exit(failed ? 1 : 0);
