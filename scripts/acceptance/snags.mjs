/* ACCEPTANCE — PROBLEMS: ONE PLACE FOR EVERY PROBLEM, IN ORDER OF PRIORITY
 * (docs/BUILD.md, Problems). Once "Snags & fixes" — Rowland, 12 October:
 * "We will change snags and fixes to the word problems ... also add a RAG
 * status for the problems — critical red, high amber, low green — to show in
 * order of priorities." Story 1c is that.
 *
 * Rowland, 12 October: "the Snags page needs to be a working page ... the
 * best place to organise all snags"; "Snags need its own report"; "I have
 * moved some snags ... I don't know where they are"; then "Ensure no
 * confusion between snags, fixes, problems — one location for all, and we
 * manage it through its own page" (asked: "Snags & fixes", and a job's Fixes
 * as the same page, that job only); and "add edit project name". Driven in a
 * real browser on the seeded lines and job with the real controls:
 *
 *   1  one page, the path said once, every row saying what it is: every
 *      snag on its line (on the move, pinned on the walk), each job's problems
 *      and fixes under it; the sentence and the counts the module's
 *      (lib/snagsReport)
 *   2  a snag ticked and moved to a job: shown once — as the fix it became,
 *      under that job, "from a snag on" its line — and its door opens it
 *   3  a snag worked where it sits: its state, whose and its day, kept and
 *      said back ("3 days late" in red)
 *   4  the counts are the filters: Late, Problems; By who, nobody's last
 *   5  several at once: a name together, closed together, the undo offered
 *   6  the Snags & fixes report: every open snag, problem and fix on paper
 *   (1b a ticked snag deleted, asked once; and the demo line's made-up
 *      snags never on the page or the paper)
 *   7  the job's own view (its Fixes link): the same name and path, its
 *      snags not on it yet made a fix in one tap, "from a snag" on the fix,
 *      and the way back to every line and job
 *   8  the job renamed on its front page: the new name on Snags & fixes
 *   9  on a phone: nothing off the side, the controls under the snag
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/snags.mjs      (SMOKE_BASE, as smoke) */
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
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2200); };
const words = async (sel, root = page) => ((await root.locator(sel).count()) ? (await root.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : '');
const row = what => page.locator('.qsl-row', { hasText: what }).first();

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
/* The seeded line and job (three snags pinned on the walk's Former roller),
   and four taken on the move — one late and Sam's, one in progress due in
   two days, one with a real picture, one named for the job. */
const sd = await page.evaluate(async () => {
  const seed = await (await import('/src/dev/seed.ts')).seedForSmokeTest();
  const db = await import('/src/db.ts');
  const t = Date.now(), D = 86_400_000, day = n => new Date(new Date(t + n * D).setHours(0, 0, 0, 0)).getTime();
  const cv = document.createElement('canvas'); cv.width = 320; cv.height = 240;
  const g = cv.getContext('2d'); g.fillStyle = '#c9d3df'; g.fillRect(0, 0, 320, 240); g.fillStyle = '#3d4a5c'; g.fillRect(60, 80, 200, 90);
  const blob = await new Promise(res => cv.toBlob(res, 'image/jpeg', 0.85));
  const key = `acc-photo-${crypto.randomUUID()}`; await db.putBlob(key, blob);
  const mk = p => ({ id: crypto.randomUUID(), workspaceId: seed.wsId, status: 'open', raisedAt: t - 2 * D, updatedAt: t, media: [], ...p });
  const list = [
    mk({ problem: 'Guard on the infeed loose', targetAsset: 'Bagger', owner: 'Sam', dueAt: day(-3) }),
    mk({ problem: 'Film wandering on the former', status: 'in_progress', dueAt: day(2) }),
    mk({ problem: 'Seal jaw leaves marks', targetAsset: 'Bagger', media: [{ id: crypto.randomUUID(), kind: 'photo', blobKey: key, mime: 'image/jpeg', capturedAt: t }] }),
    mk({ problem: 'Label printer ribbon low', projectId: seed.projectId }),
    mk({ problem: 'Taken by mistake — delete me' }),
  ];
  for (const s of list) await db.addSnag(s);
  /* the demo line, built from the account menu — its made-up snag is never here */
  const demo = await db.createWorkspace('Demo — Packing Hall');
  await db.addSnag(mk({ workspaceId: demo.id, problem: 'Demo fault — made up for the showcase', dueAt: day(-5) }));
  return { ...seed, ids: Object.fromEntries(list.map(s => [s.problem, s.id])), job: (await (await import('/src/db/projects.ts')).getProject(seed.projectId)).name };
});
/* What the module says, read as the page reads it — every snag, and every job's problems and fixes. */
const truth = () => page.evaluate(async () => {
  const db = await import('/src/db.ts'); const R = await import('/src/lib/snagsReport.ts'); const P = await import('/src/db/projects.ts');
  const { planModel } = await import('/src/lib/planModel.ts');
  const [every, ws, projects] = await Promise.all([db.listAllSnags(), db.listWorkspaces(), P.allProjects()]);
  const snags = (await import('/src/lib/demo.ts')).withoutDemo(every, ws);
  const frames = new Map((await Promise.all([...new Set(snags.filter(s => s.assetId).map(s => s.workspaceId))].map(id => db.listSnagAssets(id)))).flat().map(a => [a.id, a]));
  const lineName = id => ws.find(w => w.id === id)?.name ?? 'A line';
  const became = new Map(), jobs = [];
  for (const p of projects.filter(x => !x.archivedAt)) {
    const [tests, items, assets, todos] = await Promise.all([db.listTests(p.id), db.listTestItems(p.id), db.listAssets(p.id), db.listPaceTodos(p.id)]);
    for (const [k, v] of R.becameOn(p.id, tests, items, assets, todos)) became.set(k, v);
    const gated = planModel(p) === 'commissioning';
    jobs.push(R.jobGroup({ projectId: p.id, job: p.name, tests: gated ? tests : [], items: gated ? items : [], assets, todos: gated ? [] : todos, snags, lineName }));
  }
  const r = R.snagsReading({ snags, lineName, jobName: id => projects.find(p => p.id === id)?.name, became, jobs,
    assetName: s => (s.assetId ? frames.get(s.assetId)?.name : undefined), stillOf: s => (s.assetId ? frames.get(s.assetId)?.stillKey : undefined) });
  return { says: r.says, counts: r.counts, rows: r.lines.flatMap(l => l.rows), jobs: r.jobs, moved: r.moved, snags };
});
const openCount = c => c.critical + c.high + c.low;

/* ---- 1 one page, the path once, every row saying what it is ---- */
await go('#/snags');
{
  const t = await truth();
  ok((await words('h1')) === 'Problems' && /^Every problem in one place, in order of priority/.test(await words('.qsl-path')), '1 one page, Problems, said once');
  ok((await words('.qsl-says')) === t.says, `1 the sentence is the module's: ${t.says}`);
  const chips = (await page.locator('.qsl-f .chip').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  ok(chips.join('|') === `Open · ${openCount(t.counts)}|Critical · ${t.counts.critical}|High · ${t.counts.high}|Low · ${t.counts.low}|Late · ${t.counts.late + t.counts.jobLate}|Done · ${t.counts.closed + t.counts.jobDone}`, `1 the counts: ${chips.join(' · ')}`);
  const openSnags = t.rows.filter(r => r.status !== 'closed');
  ok((await page.locator('.qsl-work').count()) === openSnags.length && openSnags.length === 6, `1 every open snag on its line: ${openSnags.length}`);
  ok(/^low$/i.test(await words('.qsl-prio', row('seeded snag 0'))) && /From the walk — on the Former roller/.test(await words('.qsl-meta', row('seeded snag 0'))) && /Taken on the move — Bagger/.test(await words('.qsl-meta', row('Guard on the infeed loose'))) && (await page.locator('.qsl-kind').count()) === 0,
    '1 a problem on a line: its priority (Low until said), where it came from — on the walk, on the move — and no "snag" or "fix" tag');
  const g = t.jobs.find(x => x.job === sd.job);
  const jobPrio = (await page.locator('.qsl-job', { hasText: sd.job }).first().locator('.qsl-prio').allInnerTexts()).map(x => x.trim().toLowerCase());
  ok(!!g && jobPrio.join(',') === g.rows.filter(r => r.open).map(r => r.priority).join(','), `1 the job's problems under it, each with its priority, in order: ${jobPrio.join(', ')}`);
  ok(/for Line 2 commissioning — not moved yet/.test(await words('.qsl-meta', row('Label printer ribbon low'))), '1 a snag named for the job and not moved yet — said so');
  ok((await row('Seal jaw leaves marks').locator('img').count()) > 0, '1 its picture on its row');
  ok((await page.locator('.qsl-row', { hasText: 'Demo fault' }).count()) === 0 && !/Demo/.test(await words('.qsl-says')), '1 the demo line\'s made-up snag is not here');
}

/* ---- 1c PRIORITY, RAG: set on the row and for several at once; Critical first, the chips counting ---- */
{
  await row('Guard on the infeed loose').locator('select.qsl-prio-set').selectOption('critical'); await page.waitForTimeout(900);
  let t = await truth();
  const first = await page.locator('.qsl-g:not(.qsl-job):not(.qsl-moved)').first().locator('.qsl-work .qsl-what').first().innerText();
  const tag = row('Guard on the infeed loose').locator('.qsl-prio');
  ok(t.snags.find(x => x.id === sd.ids['Guard on the infeed loose'])?.priority === 'critical' && /Guard on the infeed loose/.test(first)
    && /critical/i.test(await tag.innerText()) && /is-r/.test(await tag.getAttribute('class') ?? ''), '1c made Critical on its row: kept, red with its word, first on its line');
  await row('Label printer ribbon low').locator('.qsl-tick input').check(); await row('Film wandering on the former').locator('.qsl-tick input').check();
  await page.locator('.qsl-bar-prio').selectOption('high'); await page.waitForTimeout(1200);
  t = await truth();
  const high = ['Label printer ribbon low', 'Film wandering on the former'].map(w => t.snags.find(x => x.id === sd.ids[w])?.priority);
  const order = (await page.locator('.qsl-g:not(.qsl-job):not(.qsl-moved)').first().locator('.qsl-work .qsl-prio').allInnerTexts()).map(x => x.trim().toLowerCase());
  const ranked = order.every((p, i) => i === 0 || ['critical', 'high', 'low'].indexOf(order[i - 1]) <= ['critical', 'high', 'low'].indexOf(p));
  const chip = page.locator('.qsl-f .chip', { hasText: 'Critical' });
  ok(high.every(p => p === 'high') && ranked && /2 made high/.test(await page.locator('body').innerText()), `1c two ticked made High together, the undo offered; the line in order: ${order.join(' · ')}`);
  ok((await chip.innerText()).trim() === `Critical · ${t.counts.critical}` && /qsl-chip-r/.test(await chip.getAttribute('class') ?? '') && /qsl-chip-a/.test(await page.locator('.qsl-f .chip', { hasText: 'High' }).getAttribute('class') ?? ''), `1c the chips count them in their colours: Critical · ${t.counts.critical}, High · ${t.counts.high}`);
  for (const w of ['Label printer ribbon low', 'Film wandering on the former']) await row(w).locator('.qsl-tick input').uncheck();
}

/* ---- 1b a snag deleted: ticked, Delete, asked once, gone — here and from the store ---- */
{
  page.once('dialog', d => void d.accept());
  await row('Taken by mistake — delete me').locator('.qsl-tick input').check();
  await page.locator('.qsl-bar').getByRole('button', { name: 'Delete', exact: true }).click(); await page.waitForTimeout(1200);
  const left = (await truth()).snags.some(x => x.id === sd.ids['Taken by mistake — delete me']);
  ok(!left && (await page.locator('.qsl-row', { hasText: 'Taken by mistake' }).count()) === 0 && (await page.locator('.qsl-bar').count()) === 0, '1b a ticked snag deleted: asked once, gone from the page and the store');
}

/* ---- 2 moved to a job, and shown once — as what it became ---- */
{
  await row('Seal jaw leaves marks').locator('.qsl-tick input').check();
  await page.getByRole('button', { name: 'Move to a job' }).click(); await page.waitForTimeout(600);
  const sheet = page.locator('.sheet, [role="dialog"]').last();
  await sheet.locator('select').first().selectOption({ label: sd.job }); await page.waitForTimeout(800);
  await sheet.getByRole('button', { name: /^Move 1$/ }).click(); await page.waitForTimeout(1500);
  const t = await truth();
  const f = t.jobs.find(g => g.job === sd.job)?.rows.find(r => r.what === 'Seal jaw leaves marks');
  ok(!!f && f.kind === 'fix' && /^a snag on /.test(f.fromSnag ?? '') && (await page.locator('.qsl-work', { hasText: 'Seal jaw leaves marks' }).count()) === 0 && !t.moved.length, '2 moved: off the line, shown once — under its job, being fixed');
  const jr = page.locator('.qsl-job', { hasText: sd.job }).first().locator('.qsl-row', { hasText: 'Seal jaw leaves marks' });
  const said = await words('.qsl-meta', jr);
  const seen = `seen first on ${(f?.fromSnag ?? '').replace(/^a snag on /, '')}`;
  ok((await words('.qsl-prio', jr)).toLowerCase() === f?.priority && said.includes(seen) && (await words('.qsl-state', jr)) === f?.word, `2 under its job: ${f?.priority}, "${seen}", ${f?.word}`);
  await jr.locator('.qsl-open').click(); await page.waitForTimeout(1500);
  ok((await page.locator('.rd, .drawer, [role="dialog"]').count()) > 0 && /Seal jaw leaves marks/.test(await page.locator('body').innerText()), '2 its door opens it in the job');
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
}

/* ---- 3 worked where it sits ---- */
await go('#/snags');
{
  await row('Film wandering on the former').locator('select.qsl-st:not(.qsl-prio-set)').selectOption('closed'); await page.waitForTimeout(800);
  let t = await truth();
  ok(t.snags.find(s => s.id === sd.ids['Film wandering on the former'])?.status === 'closed', '3 its state changed on the row, and kept');
  await row('Label printer ribbon low').locator('input.qsl-who').fill('Priya'); await row('Label printer ribbon low').locator('input.qsl-who').press('Enter'); await page.waitForTimeout(800);
  t = await truth();
  ok(t.snags.find(s => s.id === sd.ids['Label printer ribbon low'])?.owner === 'Priya', '3 whose it is, typed on the row, kept');
  const late = await words('.qsl-dueword', row('Guard on the infeed loose'));
  const cls = await row('Guard on the infeed loose').locator('.qsl-dueword').getAttribute('class');
  ok(late === '3 days late' && /is-r/.test(cls ?? ''), `3 a day gone said in red: "${late}"`);
}

/* ---- 4 the counts are the filters; by who ---- */
{
  const t = await truth();
  await page.locator('.qsl-f .chip', { hasText: 'Late' }).click(); await page.waitForTimeout(400);
  const lateSnags = await page.locator('.qsl-work .qsl-what').allInnerTexts();
  const lateJob = await page.locator('.qsl-job .qsl-row').count();
  ok(lateSnags.length === t.rows.filter(r => r.late).length && lateJob === t.jobs.reduce((n, g) => n + g.rows.filter(r => r.late).length, 0), `4 Late shows the late only: ${lateSnags.length} snag(s), ${lateJob} on the jobs`);
  await page.locator('.qsl-f .chip', { hasText: 'Critical' }).click(); await page.waitForTimeout(400);
  const crit = (await page.locator('.qsl-prio').allInnerTexts()).map(x => x.trim().toLowerCase());
  ok(crit.length === t.counts.critical && crit.every(k => k === 'critical'), `4 Critical shows the critical only: ${crit.length}`);
  await page.locator('.qsl-f .chip', { hasText: /^Open/ }).click(); await page.getByRole('button', { name: 'By who' }).click(); await page.waitForTimeout(400);
  const heads = await page.locator('.qsl-g:not(.qsl-job):not(.qsl-moved) .qsl-gh h2').allInnerTexts();
  const owners = [...new Set(t.rows.filter(r => r.status !== 'closed').map(r => r.owner ?? 'Nobody yet'))];
  ok(heads.length === owners.length && owners.every(o => heads.includes(o)) && (!heads.includes('Nobody yet') || heads.at(-1) === 'Nobody yet'), `4 snags by who, nobody's last: ${heads.join(' · ')}`);
  await page.getByRole('button', { name: 'By line' }).click(); await page.waitForTimeout(300);
}

/* ---- 5 several at once ---- */
{
  for (const w of ['seeded snag 0', 'Label printer ribbon low']) await row(w).locator('.qsl-tick input').check();
  await page.getByRole('button', { name: 'Whose · due' }).click(); await page.waitForTimeout(500);
  const sheet = page.locator('.sheet, [role="dialog"]').last();
  await sheet.locator('input').first().fill('Alex');
  await sheet.getByRole('button', { name: /^Change 2$/ }).click(); await page.waitForTimeout(900);
  let t = await truth();
  const two = t.snags.filter(s => ['seeded snag 0', 'Label printer ribbon low'].includes(s.problem));
  ok(two.length === 2 && two.every(s => s.owner === 'Alex'), '5 two ticked, given a name together');
  for (const w of ['seeded snag 0', 'Label printer ribbon low']) await row(w).locator('.qsl-tick input').check();
  await page.locator('.qsl-bar').getByRole('button', { name: 'Close', exact: true }).click(); await page.waitForTimeout(900);
  t = await truth();
  const undo = /2 closed/.test(await page.locator('body').innerText());
  ok(t.snags.filter(s => ['seeded snag 0', 'Label printer ribbon low'].includes(s.problem)).every(s => s.status === 'closed') && undo, '5 closed together, the undo offered');
}

/* ---- 6 the Problems report ---- */
{
  const t = await truth();
  const dir = mkdtempSync(join(tmpdir(), 'snags-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'Problems report' }).click()]);
  const file = join(dir, 'snags.pdf'); await dl.saveAs(file); if (process.env.KEEP_PDF) execFileSync('cp', [file, process.env.KEEP_PDF]);
  const txt = execFileSync('pdftotext', ['-raw', file, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  /* as the paper prints them — lib/reportKit san() keeps what the PDF's fonts can draw */
  const all = await page.evaluate(async ws => { const { san } = await import('/src/lib/reportKit.ts'); await (await import('/src/lib/savePdf.ts')).loadPdfLib(); return ws.map(w => san(w)); },
    [...t.rows.filter(r => r.status !== 'closed').map(r => r.what), ...t.jobs.flatMap(g => g.rows.filter(r => r.open).map(r => r.what))]);
  const flatTxt = txt.replace(/\s+/g, '');
  const lost = all.filter(w => !flatTxt.includes(w.replace(/\s+/g, '')));
  ok(/PROBLEMS/.test(txt) && /Every problem open/.test(txt) && !lost.length && txt.includes(sd.job) && /CRITICAL ·/.test(txt) && /LOW ·/.test(txt) && !/SNAG ·|FIX ·/.test(txt), `6 the report: every open problem (${all.length}), each with its priority${lost.length ? ` — lost: ${lost.slice(0, 4).join(', ')}` : ''}`);
  ok(!/Demo fault|Packing Hall/.test(txt), '6 and nothing of the demo line on the paper');
}

/* ---- 7 the job's own view ---- */
{
  const before = await truth();
  await page.evaluate(async ({ ws, pid }) => {
    const db = await import('/src/db.ts');
    await db.addSnag({ id: crypto.randomUUID(), workspaceId: ws, status: 'open', raisedAt: Date.now(), updatedAt: Date.now(), media: [], problem: 'Coder misprints the date', projectId: pid });
  }, { ws: sd.wsId, pid: sd.projectId });
  await go(`#/project/${sd.projectId}/fixes`);
  ok((await words('h1')) === 'Problems' && /This job's problems/.test(await words('.qsl-path')), '7 the job\'s view: the same name');
  const sec = page.locator('.cmp-sec', { hasText: 'Problems for this job — not on it yet' });
  ok((await sec.locator('.fxl-row', { hasText: 'Coder misprints the date' }).count()) === 1, '7 its snag not on it yet, listed');
  await sec.locator('.fxl-row', { hasText: 'Coder misprints the date' }).getByRole('button', { name: 'Make it a fix' }).click(); await page.waitForTimeout(1500);
  const fixRow = page.locator('.fxl-row', { hasText: 'Coder misprints the date' }).first();
  ok((await sec.count()) === 0 || (await sec.locator('.fxl-row', { hasText: 'Coder misprints the date' }).count()) === 0, '7 made a fix in one tap — off the snags');
  ok(/seen first on /.test(await fixRow.innerText()), `7 the fix says where it was seen first: "${(await fixRow.innerText()).replace(/\s+/g, ' ').slice(0, 120)}"`);
  await page.getByRole('button', { name: 'Every line and job ›' }).click(); await page.waitForTimeout(1500);
  ok(/#\/snags/.test(page.url()) && (await truth()).counts.fixes === before.counts.fixes + 1, '7 back to every line and job — the fix counted there too');
}

/* ---- 8 the job renamed on its front page ---- */
{
  await go(`#/project/${sd.projectId}`);
  await page.getByRole('button', { name: new RegExp(`^Rename `) }).click(); await page.waitForTimeout(300);
  await page.locator('.ptitle-input').fill('Line 2 rebuild — wrapper and coder');
  await page.locator('.ptitle-form').getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(1000);
  const h = await words('h1');
  await go('#/snags');
  ok(h.startsWith('Line 2 rebuild — wrapper and coder') && (await page.locator('.qsl-job h2', { hasText: 'Line 2 rebuild — wrapper and coder' }).count()) === 1, `8 renamed on its front page, and the new name on Problems`);
}

/* ---- 9 on a phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 }); await go('#/snags');
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const r = row('Guard on the infeed loose');
  const [box, ctl] = [await r.locator('.qsl-open').boundingBox(), await r.locator('.qsl-ctl').boundingBox()];
  ok(wide <= 1 && !!box && !!ctl && ctl.y >= box.y + box.height - 2, `9 on a phone: nothing off the side (${wide}px), the controls under the snag`);
}

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\nProblems NOT accepted: ${failed} failed` : '\nProblems accepted: one place for every problem, in order of priority — Critical, High, Low — worked where it sits, on paper');
process.exit(failed ? 1 : 0);
