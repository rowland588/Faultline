/* ACCEPTANCE — THE STAGE-GATE PAPERS KEEP UP WITH THE APP (docs/REPORTS.md,
 * "Relevance"; docs/AUDIT.md bar 8).
 *
 * Rowland, 14 October: "Check the stage gate report must make sure they
 * maintain relevance when things change in the app .. new functions the app
 * does but also all changes in status. Check full report, 1 page status,
 * programs, handover." Driven in a real browser on the seeded job's Reports
 * page, its four papers downloaded from their real buttons and read back:
 *
 *   1  what the app now knows, on every paper it belongs on: a machine late
 *      on site; a problem taken on the register for the job and not on it
 *      yet (Critical); the line's own programs, planned with no job; what a
 *      gate's Needs you says is missing — each on the screen's contents and
 *      the paper, in the same words
 *   2  the door: the register problem's line on the status page opens the
 *      problem where it is kept
 *   3  the status moves, and every paper moves with it: the problem closed
 *      is on none of them; the line's program proved reads proved; the
 *      machine landed is late on site no more
 *   and the status report still one page, and no console error.
 *
 *   node scripts/acceptance/report-relevance.mjs      (SMOKE_BASE, as smoke) */
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
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
/* the paper's words with every gap taken out, so a wrapped line still matches */
const tight = s => (s ?? '').replace(/\s+/g, '');
const OUT = mkdtempSync(join(tmpdir(), 'relevance-'));
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' });
const pdfPages = f => Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))[1]);
const has = (txt, w) => tight(txt).includes(tight(w));

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const REPORT = `#/project/${sd.projectId}/report`;
const today = await page.evaluate(async () => (await import('/src/lib/weeks.ts')).todayISO());
const dayBefore = (n) => { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

/* ---- the changes the app now knows of, made with its own writes ---- */
const PROBLEM = 'Coder prints the date upside down';
const set = await page.evaluate(async ([pid, due, problem]) => {
  const t = await import('/src/db/testing.ts'); const pace = await import('/src/db/pace.ts'); const w = await import('/src/db/walk.ts');
  const ws = await import('/src/db/workspaces.ts'); const pr = await import('/src/db/programs.ts'); const { niceDay } = await import('/src/lib/weeks.ts');
  const lineId = (await pace.allPaceLines()).find(l => l.projectId === pid && l.workspaceId)?.workspaceId;
  const line = (await ws.listWorkspaces()).find(x => x.id === lineId);
  /* a machine awaited, its day gone by */
  const coder = (await t.listAssets(pid)).find(a => a.name === 'Domino coder');
  await t.putAsset({ ...coder, state: 'awaited', dueOn: due, onSiteOn: undefined, updatedAt: Date.now() });
  /* a Critical problem taken on the register for this job, naming the coder */
  const id = crypto.randomUUID();
  await w.addSnag({ id, workspaceId: lineId, problem, priority: 'critical', targetAsset: 'Domino coder', owner: 'Priya', projectId: pid, status: 'open', raisedAt: Date.now(), updatedAt: Date.now(), media: [] });
  /* the line's own program, planned with no job */
  const own = (await pr.listAllPrograms()).find(p => !p.projectId && p.workspaceId === lineId && !p.deletedAt);
  return { lineName: line?.name, snagId: id, coderId: coder.id, dueSaid: niceDay(due), program: own?.what, programId: own?.id };
}, [sd.projectId, dayBefore(3), PROBLEM]);
ok(!!set.lineName && !!set.program, `0 the job is on ${set.lineName}, whose own program is “${set.program}”`);
const LATE = `Domino coder — not on site, was due ${set.dueSaid}`;
const LINE_HEAD = `On ${set.lineName}, with no project`;

const go = async () => { await page.goto(`${BASE}/${REPORT}`); await page.waitForTimeout(2600); };
const pick = async name => { await page.getByRole('button', { name, exact: true }).first().click(); await page.waitForTimeout(900); };
const grab = async (name) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 40000 }), page.getByRole('button', { name: 'Download', exact: true }).first().click()]);
  const f = join(OUT, name); await dl.saveAs(f); return f;
};
const toc = async () => flat(await page.locator('.cr-toc').first().innerText());
const papers = async (tag) => {
  await go();
  const out = {};
  await pick('Status — 1 page'); out.statusToc = await toc(); out.status = await grab(`status-${tag}.pdf`);
  await pick('Full report'); out.fullToc = await toc(); out.full = await grab(`full-${tag}.pdf`);
  out.gaps = (await page.locator('.cr-toc span.sub', { hasText: /^Not added yet: / }).allInnerTexts()).map(t => flat(t).replace(/^Not added yet: /, ''));
  await pick('Programs report'); out.programsToc = await toc(); out.programs = await grab(`programs-${tag}.pdf`);
  await pick('Handover report'); out.handoverToc = await toc(); out.handover = await grab(`handover-${tag}.pdf`);
  for (const k of ['status', 'full', 'programs', 'handover']) out[`${k}Text`] = pdfText(out[k]);
  return out;
};

/* ---- 1 what the app knows, on every paper it belongs on ---- */
const a = await papers('before');
{
  ok(/Install .*1 machine late on site/.test(a.fullToc) && has(a.fullText, LATE), `1 a machine late on site — counted on the full report’s Install and named on its paper: “${LATE}”`);
  ok(has(a.statusText, LATE) || /more — in the full report/.test(flat(a.statusText)), '1 …and on the status page, or counted in its “and N more”');
  ok(has(a.handoverText, 'Domino coder') && /due on site/i.test(flat(a.handoverText)), '1 …and on the handover, where it is: due on site');

  ok(has(a.statusToc, `NOT ON IT YET Critical priority — ${PROBLEM}`) && has(a.statusText, 'NOT ON IT YET') && has(a.statusText, `Critical priority — ${PROBLEM}`),
    '1 a Critical problem on the register for this job — on the status page and its contents, tagged NOT ON IT YET');
  ok(has(a.fullToc, 'Problems for this project — not on it yet') && has(a.fullText, 'Problems for this project — not on it yet') && has(a.fullText, PROBLEM) && has(a.fullText, 'CRITICAL'),
    '1 …on the full report, under its own heading with its priority tag');
  ok(has(a.handoverText, `Problem for this project, not on it yet (Critical): ${PROBLEM}`), '1 …and on the handover, still open on the machine it names');

  ok(has(a.statusToc, LINE_HEAD) && has(a.statusText, LINE_HEAD), `1 the line’s own programs — a line on the status page: “${LINE_HEAD} — …”`);
  ok(has(a.fullToc, LINE_HEAD) && has(a.fullText, LINE_HEAD) && has(a.fullText, set.program), '1 …the full report, with the program');
  ok(has(a.programsToc, LINE_HEAD) && has(a.programsText, LINE_HEAD) && has(a.programsText, set.program), '1 …the programs report, after the job’s own');
  ok(has(a.handoverText, `${LINE_HEAD} — programs`.toUpperCase()) || has(a.handoverText, `${LINE_HEAD} — programs`), '1 …and the handover');

  /* What a gate's Needs you says is missing: the screen's contents and the paper agree, line for line. */
  const gaps = a.gaps;
  const gapsOnPaper = gaps.filter(g => has(a.fullText, g));
  ok(gapsOnPaper.length === gaps.length && (gaps.length === 0 || has(a.fullText, 'Not added yet')), `1 what a gate is missing — ${gaps.length} on the contents, ${gapsOnPaper.length} of them on the paper`);
  ok(pdfPages(a.status) === 1, `1 the status report still one page (${pdfPages(a.status)})`);
}

/* ---- 2 the door: the register problem opens where it is kept ---- */
{
  await go(); await pick('Status — 1 page');
  await page.locator('.cr-toc button.cr-door', { hasText: PROBLEM }).first().click(); await page.waitForTimeout(1200);
  const open = await page.locator('textarea, input').evaluateAll((els, p) => els.some(e => e.value === p), PROBLEM);
  ok(open, '2 its line on the status contents opens the problem itself, its words in the box');
  await page.keyboard.press('Escape'); await page.waitForTimeout(600);
}

/* ---- 3 the status moves, and every paper with it ---- */
await page.evaluate(async ([snagId, coderId, programId, pid, day]) => {
  const w = await import('/src/db/walk.ts'); const t = await import('/src/db/testing.ts'); const pr = await import('/src/db/programs.ts');
  await w.patchSnag(snagId, { status: 'closed', closedAt: Date.now() });
  const coder = (await t.listAssets(pid)).find(a => a.id === coderId);
  await t.putAsset({ ...coder, state: 'onSite', onSiteOn: day, updatedAt: Date.now() });
  const p = (await pr.listAllPrograms()).find(x => x.id === programId);
  await pr.putProgram({ ...p, state: 'proved', provedOn: day, note: 'Proved on the floor by the line lead', updatedAt: Date.now() });
}, [set.snagId, set.coderId, set.programId, sd.projectId, today]);
const b = await papers('after');
{
  ok(!['status', 'full', 'programs', 'handover'].some(k => has(b[`${k}Text`], PROBLEM) || has(b[`${k}Toc`], PROBLEM)), '3 the register problem closed — on none of the four papers, nor their contents');
  ok(!has(b.fullText, LATE) && !has(b.statusText, LATE) && !/late on site/.test(b.fullToc), '3 the coder on site — late on site no more, on the full report or the status page');
  const reading = await page.evaluate(async ([lineName, program]) => {
    const ws = await import('/src/db/workspaces.ts'); const pr = await import('/src/db/programs.ts'); const t = await import('/src/db/testing.ts'); const pace = await import('/src/db/pace.ts');
    const { lineProgramsReading, machinesOnLine, programsOnLine } = await import('/src/lib/lineRecords.ts');
    const line = (await ws.listWorkspaces()).find(x => x.name === lineName);
    const jobLines = await pace.allPaceLines();
    const machines = machinesOnLine(line, await t.listAllAssets(), jobLines);
    const programs = programsOnLine(line.id, await pr.listAllPrograms(), jobLines).filter(p => !p.projectId);
    const r = lineProgramsReading([{ name: line.name, id: line.id, machines, programs }]);
    return { says: r?.says, word: r?.lines.find(l => l.what === program)?.word };
  }, [set.lineName, set.program]);
  ok(/proved/.test(reading.word ?? '') && has(b.programsText, reading.says) && has(b.programsText, reading.word) && has(b.fullText, `${LINE_HEAD} — ${reading.says}`),
    `3 the line’s program proved — the programs report and the full report say “${reading.says}”, the program “${reading.word}”`);
  ok(has(b.statusText, `${LINE_HEAD} — ${reading.says}`) && has(b.handoverText, reading.says), '3 …and the status page and the handover say it too');
  ok(pdfPages(b.status) === 1, `3 the status report still one page (${pdfPages(b.status)})`);
}

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\nReport relevance NOT accepted: ${failed} failed` : '\nReport relevance accepted: what the app knows is on every paper it belongs on, and a change of status moves all four');
process.exit(failed ? 1 : 0);
