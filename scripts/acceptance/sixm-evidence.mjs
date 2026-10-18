/* ACCEPTANCE — A STUDY ON A RUNNING LINE (docs/BUILD.md, 2h).
 *
 * Release 2 proved the ecosystem on a stage-gate job: a study, a test, a fix,
 * before → after, the client report. On a running line (6M) the records are
 * a cause on the fishbone and a countermeasure on the board, and the same
 * story has to hold there, driven in a real browser on the 6M stress job:
 *
 *   1  the board's countermeasure says how we know it was needed, what
 *      proved it and before → after — as the module says
 *   2  the cause's panel on the fishbone says how we know it
 *   3  the study lists both, and offers the job's causes and countermeasures
 *      (never its tests and fixes)
 *   4  Make it better raises a countermeasure on the board — the study's
 *      figures its words, what it should change said — and it opens there
 *      with the study as how we know
 *   5  the 6M report's PDF carries the countermeasure's before → after
 *   and a client reads the countermeasure and changes nothing.
 *
 * Fails on any console error.
 *
 *   node scripts/acceptance/sixm-evidence.mjs      (SMOKE_BASE, as smoke) */
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
/* A SHEET CLOSED JUST BEFORE (Escape) takes its own history entry off with a
   back() of its own, a moment later (ui/backCloses). The app's navigation
   waits for it (afterPanelBack); a goto does not, and a back landing after
   the goto undid it — the page under the sheet back where the client report
   was asked for, and no PDF to press (the 6M paper's download, once in three
   runs at once and in the gate). So the entry goes first. */
const go = async h => {
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 5000 }).catch(() => {});
  await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2500);
};
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const j = await page.evaluate(async () => {
  const j = await (await import('/src/dev/reportSeeds.ts')).seedSixMJob('huge');
  const { listStudies } = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
  const studies = await listStudies(j.projectId);
  const ev = studies.find(s => s.tool === 'capability' && s.uses.some(u => u.kind === 'cause'));
  const action = ev.uses.find(u => u.kind === 'action').ref, cause = ev.uses.find(u => u.kind === 'cause').ref;
  return { ...j, ev: ev.id, evLine: L.studyLine(ev).text, title: L.studyTitle(ev), action, cause, ba: L.beforeAfter(studies, action, 'action')?.text, proved: L.provedLine(studies, action, 'action') };
});
const P = `#/project/${j.projectId}`;

/* ---- 1 · the countermeasure's sheet ---- */
await go(`${P}/board?a=${encodeURIComponent(j.action)}`);
await page.locator('.sl').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const w = await words('.sl');
  ok(/How we know/i.test(w) && /Proved by/i.test(w) && w.includes(j.evLine) && !!j.ba && (await words('.sl-ba')) === `Before → after: ${j.ba}`,
    `1 the countermeasure: how we know, proved by, "${await words('.sl-ba')}"`);
}

/* ---- 2 · the cause's panel ---- */
{
  const [cp, cc] = j.cause.split(':');
  await go(`${P}/fishbone?problem=${cp}&cause=${cc}`);
  await page.locator('.sl-cause').first().waitFor({ timeout: 10000 }).catch(() => {});
  const w = await words('.sl-cause');
  ok(/How we know/i.test(w) && w.includes(j.title) && w.includes(j.evLine), `2 the cause's panel: "${w.slice(0, 140)}"`);
}

/* ---- 3 · the study: what it is used for, and what it could be ---- */
await go(`#/capability/${j.ev}`);
await page.locator('.ie-used').first().waitFor({ timeout: 10000 }).catch(() => {});
{
  const w = await words('.ie-used');
  ok(/How we know: /.test(w) && /How we know it was needed: /.test(w), `3 used for: "${w.slice(0, 200)}"`);
  await page.getByRole('button', { name: 'Use it for…' }).click(); await page.waitForTimeout(400);
  const groups = await page.getByLabel('Use it for').locator('optgroup').evaluateAll(gs => gs.map(g => g.getAttribute('label')));
  ok(JSON.stringify(groups) === JSON.stringify(['Causes on the fishbone', 'Countermeasures on the board']), `3 it offers the job's causes and countermeasures: ${groups.join(' · ')}`);
  await page.reload(); await page.waitForTimeout(2500);
}

/* ---- 4 · Make it better — a countermeasure on the board ---- */
{
  const before = await page.evaluate(async pid => (await (await import('/src/db.ts')).listPaceTodos(pid)).map(t => t.id), j.projectId);
  await page.getByRole('button', { name: 'Make it better — a countermeasure' }).click(); await page.waitForTimeout(3000);
  const t = await page.evaluate(async ([pid, was, ev]) => {
    const db = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
    const row = (await db.listPaceTodos(pid)).find(x => !was.includes(x.id));
    const s = await db.getStudy(ev);
    return row && { row, want: L.betterWords(s), expect: L.betterExpect(s), linked: s.uses.some(u => u.kind === 'action' && u.ref === row.id && u.role === 'evidence') };
  }, [j.projectId, before, j.ev]);
  ok(!!t && t.row.what === t.want && t.row.expect === t.expect && t.linked && /\/board/.test(page.url()), `4 a countermeasure: "${t?.row.what}" — should change: "${t?.row.expect}"`);
  await page.locator('.sl').first().waitFor({ timeout: 10000 }).catch(() => {});
  const w = await words('.sl');
  ok(/How we know/i.test(w) && w.includes(j.evLine) && (await page.getByRole('button', { name: /^Prove it/ }).count()) === 1, '4 it opens on the board, the study its how we know, Prove it offered');
}

/* ---- 5 · the 6M report's PDF ---- */
await go(`#/pace-report?project=${j.projectId}`);
{
  /* the full report — the status page is the one offered first (17 below) */
  await page.getByRole('button', { name: 'Full report', exact: true }).click(); await page.waitForTimeout(400);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
  const pdf = join(OUT, 'sixm.pdf'); await dl.saveAs(pdf);
  const san = s => s.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/\s+/g, ' ');
  ok(san(pdfText(pdf)).includes(san(j.proved).slice(0, 70)), `5 the 6M report: "${j.proved.slice(0, 90)}…"`);
}

/* ---- a client reads the countermeasure and changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`${P}/board?a=${encodeURIComponent(j.action)}`);
await page.locator('.sl').first().waitFor({ timeout: 10000 }).catch(() => {});
ok((await page.locator('.sl').count()) === 1 && (await page.getByRole('button', { name: /^Prove it/ }).count()) === 0, 'a client reads how it is known and changes nothing');
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

/* ===================== THE 6M LOOP, WALKED (flow audit, 13 October) =====================
 * The loop's two loose ends and the noise between them, driven where the
 * owner meets them: holding chased (#9), the gap counted (#8), the study's
 * Use it for by machine (#15), the fishbone's suggestions about the
 * problem (#18), the 6M's paper in order (#17). Every sentence is checked
 * against the module that makes it. */
const reHash = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* ---- 9 · holding is chased: a missed check on the problem, Needs you and This week ---- */
{
  const h = await page.evaluate(async pid => {
    const { listProjectCases } = await import('/src/db.ts'); const S = await import('/src/lib/sixm.ts'); const W = await import('/src/lib/weeks.ts');
    const c = (await listProjectCases(pid, [])).find(x => !x.deletedAt && x.status === 'closed' && x.hold && S.holdDue(x.hold, W.todayISO()).state === 'missed');
    return c && { id: c.id, line: c.lineId, title: c.title, what: c.hold.what, who: c.hold.who, due: S.holdDue(c.hold, W.todayISO()).words, last: W.niceDay(c.hold.lastChecked) };
  }, j.projectId);
  ok(!!h, `9 the 6M job has a closed problem whose check is missed: "${h?.title}"`);
  await go(`${P}/fishbone?line=${h.line}&problem=${h.id}`);
  await page.locator('.fr-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
  ok((await words('.fr-strip .pc-hold.is-r')) === h.due, `9 the fishbone's strip, in red: "${await words('.fr-strip .pc-hold')}"`);
  await page.locator('.fr-strip').first().click(); await page.waitForTimeout(900);
  const kept = await words('.fj-holdline');
  ok(kept.includes(`last checked ${h.last}`) && kept.includes(h.due) && !/\d{4}-\d{2}-\d{2}/.test(kept), `9 the card's Kept by, the days said as days: "${kept}"`);
  await go(P);
  await page.locator('.fp-needs').first().waitFor({ timeout: 10000 }).catch(() => {});
  const row = page.locator('.fp-needs .fp-row').filter({ hasText: h.what }).first();
  const rw = (await row.count()) ? (await row.innerText()).replace(/\s+/g, ' ') : '';
  ok(rw.includes(`Check · ${h.who}`) && rw.includes(`Keeps the gain on “${h.title}”`) && /is-r\b/.test(await row.getAttribute('class') ?? ''), `9 the job's Needs you, late: "${rw}"`);
  if (await row.count()) { await row.click(); await page.waitForTimeout(1500); }
  ok(new RegExp(`/fishbone\\?(.*&)?problem=${reHash(h.id)}`).test(decodeURIComponent(page.url())), '9 the row opens the problem on its fishbone');
  await go('#/room');
  await page.locator('.jb-week').first().waitFor({ timeout: 10000 }).catch(() => {});
  const wk = page.locator('.jb-week .jb-wl-row').filter({ hasText: h.what }).first();
  ok((await wk.count()) === 1 && /is-late/.test(await wk.getAttribute('class') ?? ''), `9 the control room's This week, late: "${(await wk.count()) ? (await wk.innerText()).replace(/\s+/g, ' ') : ''}"`);
}

/* The smoke seed's jobs beside it: the stage-gate job and Line 7's 6M job. */
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const S6 = `#/project/${sd.pacedProjectId}`;

/* ---- 8 · the gap counted: the constraint, what the line can make, a count as a reading, no OEE ---- */
{
  const t8 = await page.evaluate(async ([pid, l7]) => {
    const db = await import('/src/db.ts'); const F = await import('/src/lib/fishbone.ts'); const C = await import('/src/lib/capacity.ts');
    const Lo = await import('/src/lib/ie/losses.ts'); const M = await import('/src/lib/measures.ts');
    const line = (await db.loadPaceLines(pid)).find(l => l.id === l7);
    const standards = [...await db.listStandards(pid), ...await db.listStandardsForLine(line.workspaceId)];
    const cap = F.lineCapacityOf(line, standards, await db.listPrograms(pid));
    const r = cap && C.analyse(cap.cap);
    const counts = (await db.listStudiesForLine(line.workspaceId)).filter(s => s.tool === 'losses' && !s.deletedAt).sort((a, b) => b.facts.losses.from - a.facts.losses.from);
    const c = Lo.countedRate(counts[0]?.facts.losses);
    const m = M.perMinuteMeasure((await db.getProject(pid)).measures ?? []);
    return { station: r?.limit?.station.name, canMake: r && C.canMakeWords(r), c, m: m && { id: m.id, unit: m.unit }, said: c && M.say(c.perMin, m?.unit) };
  }, [sd.pacedProjectId, sd.line7Id]);
  await go(`${S6}/fishbone?line=${sd.line7Id}&open=1`);
  const door = page.locator('.fj-door').filter({ hasText: 'The constraint' }).first();
  await door.waitFor({ timeout: 10000 }).catch(() => {});
  const dw = (await door.count()) ? (await door.innerText()).replace(/\s+/g, ' ') : '';
  ok(!!t8.station && dw.includes(`${t8.station} limits Line 7`) && !(await door.isDisabled()), `8 The constraint reads Line 7's Line capacity: "${dw.slice(0, 140)}"`);
  await go(S6);
  await page.locator('.fp-lines').first().waitFor({ timeout: 10000 }).catch(() => {});
  const l7 = page.locator('.fp-lines .fp-row').filter({ hasText: 'Line 7' }).first();
  const lw = (await l7.count()) ? (await l7.innerText()).replace(/\s+/g, ' ') : '';
  ok(!!t8.canMake && lw.includes(t8.canMake), `8 the line's capacity under its target: "${lw}"`);
  await go(`${S6}?view=data`);
  await page.locator('.nm-counted').first().waitFor({ timeout: 10000 }).catch(() => {});
  const offer = page.locator('.nm-counted .nm-offer').filter({ hasText: t8.c?.words ?? '—' }).first();
  ok(!!t8.c && (await offer.count()) === 1 && (await offer.innerText()).includes(`${t8.c.words}, counted`), `8 a count offered as a reading: "${(await offer.count()) ? (await offer.innerText()).replace(/\s+/g, ' ') : ''}"`);
  if (await offer.count()) { await offer.getByRole('button', { name: `Record ${t8.said}` }).click(); await page.waitForTimeout(1500); }
  const rec = await page.evaluate(async ([pid, l7, mid, day, v]) => (await (await import('/src/db.ts')).listReadings(pid))
    .find(r => !r.deletedAt && r.lineId === l7 && r.measureId === mid && r.at === day && Math.abs(r.value - v) < 0.05), [sd.pacedProjectId, sd.line7Id, t8.m?.id, t8.c?.day, t8.c?.perMin]);
  ok(!!rec && /^Counted — loss count/.test(rec.note ?? '') && (await page.locator('.nm-counted .nm-offer').filter({ hasText: t8.c?.words ?? '—' }).count()) === 0,
    `8 one tap records it — ${rec ? `${rec.value} on ${rec.at}, "${rec.note}"` : 'no reading'} — and the offer goes`);
  const fresh = await page.evaluate(async () => (await (await import('/src/db.ts')).createProject('A new 6M job', '#1b7f5a', 'Rowland', 'r@example.com', 'board')).id);
  await go(`#/project/${fresh}`);
  const startW = await words('body');
  await go(`#/project/${fresh}?view=data`);
  ok(/packs per minute, waste/.test(startW) && !/\bOEE\b/.test(startW) && !/\bOEE\b/.test(await words('body')), '8 a new 6M job asks for a number counted by people — no OEE in its example');
}

/* ---- 15 · a study's Use it for, machine by machine; attached, it takes the job's line ---- */
{
  await go(`#/capability/${sd.studyId}`);
  await page.getByRole('button', { name: 'Attach to a job' }).click(); await page.waitForTimeout(400);
  await page.getByLabel('Attach it to which job').selectOption(sd.projectId); await page.waitForTimeout(1500);
  const st = await page.evaluate(async ([id, pid]) => {
    const db = await import('/src/db.ts'); const R = await import('/src/lib/lineRecords.ts');
    const s = await db.getStudy(id); const want = R.onlyLineOf(pid, await db.allPaceLines());
    return { ws: s.workspaceId, pid: s.projectId, want, name: want ? (await db.getWorkspace(want))?.name : undefined, assets: (await db.listAssets(pid)).map(a => a.name) };
  }, [sd.studyId, sd.projectId]);
  const place = await words('.ie-place-w');
  ok(st.pid === sd.projectId && !!st.want && st.ws === st.want && place.startsWith(`On ${st.name}`), `15 attached to a job, it takes the job's line: "${place}"`);
  await page.getByRole('button', { name: 'Use it for…' }).click(); await page.waitForTimeout(400);
  const g = await page.getByLabel('Use it for').locator('optgroup').evaluateAll(gs => gs.map(x => ({ label: x.getAttribute('label'), opts: [...x.querySelectorAll('option')].map(o => o.textContent) })));
  ok(g[0]?.label === 'Ishida checkweigher — this study’s machine' && g[0].opts.length > 0
    && g.slice(1).every(x => st.assets.includes(x.label) || x.label === 'The line — on no one machine')
    && g.every(x => new Set(x.opts).size === x.opts.length),
    `15 Use it for, machine by machine, the study's first: ${g.map(x => `${x.label} (${x.opts.length})`).join(' · ')}`);
  await page.keyboard.press('Escape');
}

/* ---- 18 · the fishbone's suggestions are about the problem ---- */
{
  const s18 = await page.evaluate(async pid => {
    const P = await import('/src/lib/useProblems.ts'); const F = await import('/src/lib/fishbone.ts');
    const l = await P.loadProblems(pid); const bad = []; let n = 0;
    for (const v of P.viewsOf(l, pid)) for (const b of v.bones) for (const x of b.suggestions) {
      if (x.source.kind !== 'material' && x.source.kind !== 'program') continue;
      n++;
      const rec = (x.source.kind === 'material' ? l.data.materials : l.data.programs).find(r => r.id === x.source.ref);
      const line = l.data.lines.find(q => q.id === v.problem.lineId);
      const onLine = !!line && (rec.lineId === line.id || (!rec.lineId && !!rec.workspaceId && rec.workspaceId === line.workspaceId));
      if (!onLine && !F.sharesAWord(F.problemWords(v.problem), rec.what, rec.runs, rec.note)) bad.push(`${v.problem.title}: ${x.text}`);
    }
    return { bad, n };
  }, sd.pacedProjectId);
  ok(s18.bad.length === 0, `18 every material and program offered is on the problem's line or about it (${s18.n} offered)${s18.bad.length ? ` — not: ${s18.bad.join(' | ')}` : ''}`);
  await go(`${S6}/fishbone?line=${sd.pacedLineId}&problem=${sd.problemId}`);
  await page.locator('.fr-fish').first().waitFor({ timeout: 10000 }).catch(() => {});
  const fish = await words('.fr-fish');
  ok(!/P-150|P-130|P-160|Upgraded jaw heater/.test(fish) && /Perforated film — 2kg, 60 micron is \d+ days? late/.test(fish),
    '18 Basketer minor stops: no other line\'s programs or the jaw heater — Line 2A\'s late film still offered');
}

/* ---- 17 · the 6M's paper: the report first, each line's papers folded under it ---- */
{
  await go(S6);
  await page.getByRole('button', { name: /^Reports/ }).first().click(); await page.waitForTimeout(700);
  const dlg = page.getByRole('dialog');
  const titles = async () => dlg.locator('.meet-report b').allInnerTexts();
  const shut = await titles();
  const sheetW = (await dlg.locator('.meet-report').filter({ hasText: 'Spreadsheet' }).innerText()).replace(/\s+/g, ' ');
  ok(JSON.stringify(shut) === JSON.stringify(['Client report', 'Spreadsheet']) && (await dlg.locator('.meet-lines-h').getAttribute('aria-expanded')) === 'false',
    `17 two papers and the lines folded: ${shut.join(' · ')} · "${(await words('.meet-lines-h'))}"`);
  ok(/This job in one Excel file/.test(sheetW) && !/every project/.test(sheetW), `17 the spreadsheet worded for this job: "${sheetW}"`);
  await dlg.locator('.meet-lines-h').click(); await page.waitForTimeout(400);
  const open = await titles();
  ok(['Line 2A', 'Line 7'].every(l => ['Client report', 'One-page report', 'Evidence cards'].every(t => open.includes(`${t} — ${l}`))) && open[0] === 'Client report',
    `17 opened, each line's three papers: ${open.length} — ${open.slice(1, 4).join(' · ')}…`);
  await page.keyboard.press('Escape');
  /* the client report: the one-page status first, the full report beside it */
  await go(`#/pace-report?project=${j.projectId}`);
  const pressed = await page.locator('.cr-which .chip.on').innerText().catch(() => '');
  const st = await page.evaluate(async pid => {
    const P = await import('/src/lib/useProblems.ts'); const R = await import('/src/lib/sixmReportPdf.ts'); const S = await import('/src/lib/sixmStatus.ts');
    const db = await import('/src/db.ts'); const l = await P.loadProblems(pid); const p = await db.getProject(pid); const now = Date.now();
    const r = R.sixmReport({ project: { name: p.name, lead: p.lead }, data: l.data, problems: P.viewsOf(l, pid, undefined, now), todos: await db.listPaceTodos(pid), now });
    const s = S.sixmStatus(r); return { sentence: s.sentence, why: s.why.map(w => w.what), tags: s.why.map(w => w.tag) };
  }, j.projectId);
  /* the button waits for the report's records — as long as the download may, under the gate's load */
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click({ timeout: 60000 })]);
  const file = join(OUT, 'sixm-status.pdf'); await dl.saveAs(file);
  const pages = Number((execFileSync('pdfinfo', [file], { encoding: 'utf8' }).match(/Pages:\s+(\d+)/) ?? [])[1]);
  const san = x => x.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/[“”]/g, '"').replace(/\s+/g, '');
  const txt = san(pdfText(file));
  ok(pressed === 'Status — 1 page' && pages === 1 && txt.includes(san(st.sentence).slice(0, 50)) && txt.includes(san('Why we are not where we should be').toUpperCase())
    && st.tags.includes('CHECK MISSED') && txt.includes('CHECKMISSED'),
    `17 the 6M client report offers the one-page status first: ${pages} page, "${st.sentence.slice(0, 60)}…", why: ${st.tags.join(', ')}`);
}

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\n2h accepted: a study holds on a running line');
process.exit(failed ? 1 : 0);
