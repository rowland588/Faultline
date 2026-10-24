/* ACCEPTANCE — PROBLEMS: THE REGISTER (docs/BUILD.md, Problems).
 *
 * Rowland, 12 October: "Every single problem allows me to put in what the
 * problem is. And we also want them to be able to track a journey of
 * improvement ... this is what it is, it's low risk, this is what we're
 * going to do, this is when we did it, this was what the result was ...
 * assign the problems to where they're going ... I want a fresh start.
 * Don't erase anything." Driven in a real browser with the real controls:
 *
 *   1  one page, Problems: every problem on its line, its priority in its
 *      colour with its word, the sentence and the counts the module's
 *      (lib/snagsReport, the register); the demo line's never here
 *   2  a problem tapped opens as its own editor where it sits: its words
 *      changed, its priority, where it stands — each kept as it is left
 *   3  assigned, not moved: its machine (the jobs' machines offered, another
 *      typed), its project — it stays here, and shows on the job too; a new
 *      line made from the problem, and the line renamed on its own page,
 *      reached from the problem (FLOW-AUDIT #20)
 *   4  its journey: a step added (a day, what we did, what came of it),
 *      shown under it, changed, taken off
 *  4b whose typed, then the due date at once: both kept after a reload
 *      (FLOW-AUDIT #4)
 *   5  a photo marked from the editor — the mark kept on the problem
 *   6  priority for several at once, Critical first, the chips counting in
 *      their colours; Late and Critical as filters; by who
 *   7  whose and due for several, closed together, the undo offered; deleted
 *   8  its report card: one page, its plan and its journey; the Problems
 *      report: every open problem with its plan and journey
 *   9  a fresh start: every problem put away, nothing deleted, the page
 *      empty and saying so; one brought back, then all
 *  10  the job's own view: a problem assigned to it listed, made a fix
 *  11  on a phone: nothing off the side, the editor fits
 *  14  a project's own problem worked in the room: priority, whose, put on a line;
 *      a fix marked done
 *  13  the audit's cases: a problem for an archived project named; closed or
 *      re-prioritised while open, it stays put; pinned on a walk, its line
 *      kept; made a fix, said so under Done
 *  1b  (FLOW-AUDIT #2) a 6M job's problems are rows, each where it is on its
 *      way, opening its fishbone; a line chosen keeps the jobs on it — the
 *      commissioning job's Critical on its line, a 6M job's problem on its own
 *      line and not on its other
 *  15  (FLOW-AUDIT #5) the Problem button inside a job: on the job's own line,
 *      never the last one used; a job on two lines asks which
 *  16  (FLOW-AUDIT #12) Closed asks what shows it is fixed — its last step in
 *      view; kept on its journey, on its card
 *  17  (FLOW-AUDIT #13) Find the root cause ›: a 6M problem opened in its
 *      words on its line's 6M job, the register problem taken there and said
 *      so; on a line with no 6M job, Start one; the fishbone's Open a problem
 *      lists the line's open problems under Something seen
 *  18  (FLOW-AUDIT #22) from a line's page on a phone: the problem tapped in
 *      view, its editor open, and ‹ the line, fingertip-sized, back to it
 *  12  an archived project's line said so; a ticked problem put on a new line
 *      from the bar, saved and said so; a box changed says Saved; Save keeps
 *      what was typed; the archived line gone from the control room
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/snags.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper, more } from '../lib/pageHeader.mjs';

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

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
/* The seeded line and job (three problems pinned on the walk's Former roller),
   four written on the page — one late and Sam's, one in progress, one with a
   real picture, one for the job — one to delete, and the demo line's. */
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
  const demo = await db.createWorkspace('Demo — Packing Hall');
  await db.addSnag(mk({ workspaceId: demo.id, problem: 'Demo fault — made up for the showcase', dueAt: day(-5) }));
  const machines = (await db.listAssets(seed.projectId)).filter(a => !a.deletedAt).map(a => a.name.trim());
  return { ...seed, ids: Object.fromEntries(list.map(s => [s.problem, s.id])), job: (await (await import('/src/db/projects.ts')).getProject(seed.projectId)).name, machines };
});
/* What the module says, read as the page reads it — the register, put-away ones aside. */
const truth = () => page.evaluate(async () => {
  const db = await import('/src/db.ts'); const R = await import('/src/lib/snagsReport.ts'); const P = await import('/src/db/projects.ts');
  const [every, ws, projects] = await Promise.all([db.listAllSnags(), db.listWorkspaces(), P.allProjects()]);
  const all = (await import('/src/lib/demo.ts')).withoutDemo(every, ws).filter(s => !s.deletedAt);
  /* a problem on a line of an archived project, or a line archived itself, stays — under "Not on a line" (13 October) */
  /* (13 October) only a line archived itself, or an archived job's own walk — a LINE of an archived job is still a line */
  const walks = await db.projectWalkIds();
  const gone = new Set([...(await db.listArchivedWorkspaces()).map(w => w.id), ...(await Promise.all(ws.map(async w => (walks.has(w.id) && await db.inArchivedProject(w.id)) ? w.id : ''))).filter(Boolean)]);
  const snags = all.filter(s => !s.archivedAt);
  const frames = new Map((await Promise.all([...new Set(snags.filter(s => s.assetId).map(s => s.workspaceId))].map(id => db.listSnagAssets(id)))).flat().map(a => [a.id, a]));
  const lineName = id => ws.find(w => w.id === id)?.name ?? 'A line';
  /* every live project's own problems and fixes — the page holds everything (12 October) */
  const { planModel } = await import('/src/lib/planModel.ts');
  const { sixMProblemsOf } = await import('/src/lib/useProblems.ts');
  const jobs = (await Promise.all(projects.filter(p => !p.archivedAt).map(async p => {
    const [tests, items, assets, todos] = await Promise.all([db.listTests(p.id), db.listTestItems(p.id), db.listAssets(p.id), db.listPaceTodos(p.id)]);
    const gated = planModel(p) === 'commissioning';
    /* a 6M job's problems are rows too (FLOW-AUDIT #2: "the 6M problems are on no line page and in no register") —
       read before as nothing, which is what the register showed */
    const cases = planModel(p) === 'board' ? await sixMProblemsOf(p.id) : [];
    return R.jobGroup({ projectId: p.id, job: p.name, tests: gated ? tests : [], items: gated ? items : [], assets, todos: gated ? [] : todos, cases, snags: all, lineName });
  }))).filter(g => g.rows.length);
  const r = R.snagsReading({ snags: snags.map(s => (gone.has(s.workspaceId) ? { ...s, workspaceId: '__no_line__' } : s)), lineName: id => (id === '__no_line__' ? 'Not on a line' : lineName(id)), jobName: id => projects.find(p => p.id === id && !p.archivedAt)?.name, became: new Map(), register: true, jobs,
    assetName: s => (s.assetId ? frames.get(s.assetId)?.name : undefined), stillOf: s => (s.assetId ? frames.get(s.assetId)?.stillKey : undefined) });
  return { says: r.says, counts: r.counts, rows: r.lines.flatMap(l => l.rows), jobRows: r.jobs.flatMap(g => g.rows.map(x => ({ ...x, job: g.job }))), snags, all };
});
const openUp = async what => { if ((await row(what).locator('.pe').count()) === 0) { await row(what).locator('.qsl-open').click(); await page.waitForTimeout(500); } return row(what).locator('.pe'); };
const snag = async what => (await truth()).all.find(s => s.problem === what || s.id === sd.ids[what]);
const openCount = c => c.critical + c.high + c.low;

/* ---- 1 one page, Problems ---- */
await go('#/snags');
{
  const t = await truth();
  /* named Problems with the context bar saying whose (docs/STRUCTURE.md §5.7, B5) — Factory › Problems, never a line's or a project's */
  ok((await words('h1')) === 'Problems' && /^Write any problem/.test(await words('.qsl-path')) && /^Factory\s*›\s*Problems$/.test((await page.locator('.nv-top .nv-ctx').innerText()).replace(/\s+/g, ' ').trim()), '1 one page, Problems — the context bar saying Factory › Problems, so it is never mistaken for a line\'s or a project\'s', (await page.locator('.nv-top .nv-ctx').innerText()).replace(/\s+/g, ' ').trim());
  ok((await words('.qsl-says')) === t.says, `1 the sentence is the module's: ${t.says}`);
  const chips = (await page.locator('.qsl-f .chip').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  ok(chips.join('|') === `Open · ${openCount(t.counts)}|Critical · ${t.counts.critical}|High · ${t.counts.high}|Low · ${t.counts.low}|Late · ${t.counts.late + t.counts.jobLate}|Done · ${t.counts.closed + t.counts.jobDone}`, `1 the counts — the projects' own problems among them: ${chips.join(' · ')}`);
  /* EVERYTHING ON ONE PAGE (Rowland, 12 October: "everything should still stay in
     the control problem page, because that's the page that has everything. That's
     the page I do the report on"): a project's own problems and fixes are here too. */
  const jOpen = t.jobRows.filter(r => r.open);
  const jShown = await page.locator('.qsl-job .qsl-jrow').allInnerTexts();
  ok(jOpen.length > 0 && jShown.length === jOpen.length && jOpen.every(r => jShown.some(x => x.includes(r.what))) && !(await page.locator('.preg-jobs').count()),
    `1 a project's own problems and fixes here too, every open one: ${jOpen.length} on ${[...new Set(jOpen.map(r => r.job))].join(', ')}`);
  const open = t.rows.filter(r => r.status !== 'closed');
  ok((await page.locator('.qsl-work').count()) === open.length && open.length === 6, `1 every open problem on its line: ${open.length}`);
  ok(/^low$/i.test(await words('.qsl-prio', row('seeded snag 0'))) && (await page.locator('.qsl-kind').count()) === 0 && (await page.locator('.qsl-moved').count()) === 0 && !/Moved to /.test(await page.locator('.qsl').innerText()), '1 each with its priority (Low until said); no snag or fix tag, nothing "moved"');
  ok((await page.locator('.qsl-row', { hasText: 'Demo fault' }).count()) === 0 && !/Demo/.test(await words('.qsl-says')), '1 the demo line\'s made-up problem is not here');
}

/* ---- 1b a 6M job's problems are rows; a line chosen keeps the jobs on it (FLOW-AUDIT #2: "Line 7 — smoke test says
   1 problem open (Low) while the job on it holds a Critical ... the 6M problems show on no line page and in no register") ---- */
{
  const t = await truth();
  const cases = t.jobRows.filter(r => r.kind === 'case');
  const open6 = cases.filter(r => r.open);
  const caseRows = await page.locator('.qsl-job .qsl-jrow').allInnerTexts();
  ok(open6.length >= 2 && open6.every(r => caseRows.some(x => x.includes(r.what) && x.includes(r.word))),
    `1b a 6M job's problems are rows, each where it is on its way: ${open6.map(r => `${r.what} — ${r.word}`).join(' · ')}`);
  const c0 = open6.find(r => r.what === 'Reject bin full by 10am') ?? open6[0];
  const cr = page.locator('.qsl-jrow', { hasText: c0.what }).first();
  await cr.locator('.qsl-open').click(); await page.waitForTimeout(400);
  await cr.getByRole('button', { name: 'Open its fishbone ›' }).click(); await page.waitForTimeout(2500);
  ok(new RegExp(`#/project/${c0.projectId}/fishbone\\?.*problem=${c0.id}`).test(page.url()) && (await page.locator('body').innerText()).includes(c0.what), `1b one tapped: its fishbone, on it (${c0.what})`);
  /* the register on the commissioning job's line: the job on it kept, its Critical among them */
  await go(`#/snags?line=${sd.wsId}`);
  const jobOpen = t.jobRows.filter(r => r.job === sd.job && r.open);
  const jobShown = await page.locator('.qsl-job', { has: page.locator('h2', { hasText: sd.job }) }).locator('.qsl-jrow').allInnerTexts();
  const lineNm = await page.evaluate(async ws => (await (await import('/src/db.ts')).listWorkspaces()).find(w => w.id === ws)?.name, sd.wsId);
  ok(jobOpen.length > 0 && jobShown.length === jobOpen.length && jobOpen.some(r => r.priority === 'critical') && /CRITICAL/i.test(jobShown.join(' ')),
    `1b the register on ${lineNm}: the job on it kept — its ${jobOpen.length} open, the Critical among them (was none)`);
  /* a job on two lines narrowed to the one chosen: the 6M job's Line 7 problem there, its Line 2A one not */
  const l7 = await page.evaluate(async () => (await (await import('/src/db.ts')).listWorkspaces()).find(w => w.name === 'Line 7')?.id);
  await go(`#/snags?line=${l7}`);
  const on7 = (await page.locator('.qsl-job .qsl-jrow').allInnerTexts()).join(' | ');
  ok(on7.includes('Reject bin full by 10am') && !on7.includes('Basketer minor stops'), '1b on Line 7: the 6M job\'s problem on Line 7 is there, its Line 2A one is not');
  await go('#/snags');
}

/* ---- 2 opened as its own editor; its words, priority and state kept ---- */
{
  const pe = await openUp('Film wandering on the former');
  ok((await pe.count()) === 1 && (await pe.getByLabel('What is the problem').count()) === 1, '2 tapped, it opens as its editor where it sits');
  const box = pe.getByLabel('What is the problem');
  await box.fill('Film wandering on the former — tracks left after every splice'); await box.blur(); await page.waitForTimeout(800);
  await pe.getByRole('button', { name: 'Critical', exact: true }).click(); await page.waitForTimeout(700);
  const r = row('Film wandering on the former');
  await r.locator('.pe').getByRole('group', { name: 'Where it stands' }).getByRole('button', { name: 'Open', exact: true }).click(); await page.waitForTimeout(700);
  const s = await snag('Film wandering on the former');
  ok(s?.problem === 'Film wandering on the former — tracks left after every splice' && s?.priority === 'critical' && s?.status === 'open', `2 its words, Critical and Open — each kept as it is left`);
  ok(/critical/i.test(await words('.qsl-prio', r)) && /is-r/.test(await r.locator('.qsl-prio').first().getAttribute('class') ?? ''), '2 its tag says Critical, in red with its word');
}

/* ---- 3 assigned, not moved ---- */
{
  const what = 'Label printer ribbon low';
  const pe = await openUp(what);
  const offered = (await pe.getByRole('group', { name: 'Which machine' }).locator('.chip').allInnerTexts()).map(x => x.trim());
  ok(sd.machines.length > 0 && sd.machines.every(m => offered.includes(m)), `3 the jobs' machines offered: ${offered.join(', ')}`);
  await pe.getByRole('group', { name: 'Which machine' }).getByRole('button', { name: sd.machines[0], exact: true }).click(); await page.waitForTimeout(700);
  let s = await snag(what);
  ok(s?.targetAsset === sd.machines[0], `3 its machine picked: ${s?.targetAsset}`);
  await row(what).locator('.pe').getByLabel('Another machine').fill('Ribbon printer, outfeed'); await row(what).locator('.pe').getByLabel('Another machine').blur(); await page.waitForTimeout(700);
  s = await snag(what);
  ok(s?.targetAsset === 'Ribbon printer, outfeed', '3 or another machine typed');
  await row(what).locator('.pe').getByLabel('Which project').selectOption({ label: sd.job }); await page.waitForTimeout(700);
  s = await snag(what);
  ok(s?.projectId === sd.projectId && !(s?.sent ?? []).length && (await row(what).count()) === 1 && (await words('.qsl-meta', row(what))).includes(`for ${sd.job}`), `3 assigned to ${sd.job}: it stays here, saying so — never moved away`);
  /* A new line typed from the problem, then renamed when its name is wrong —
     Rowland, 12 October: "I cannot pick line 2B ... I may make a mistake and
     assign something to the wrong name". Then back on its line for the rest. */
  const wasOn = s?.workspaceId;
  const lineCalled = id => page.evaluate(async x => (await (await import('/src/db.ts')).listWorkspaces()).find(w => w.id === x)?.name, id);
  page.once('dialog', d => void d.accept('Line 2B'));
  await row(what).locator('.pe').getByLabel('Which line').selectOption({ label: 'A new line…' }); await page.waitForTimeout(1000);
  s = await snag(what);
  const made = s?.workspaceId !== wasOn ? await lineCalled(s?.workspaceId) : undefined;
  ok(made === 'Line 2B', `3 a new line made from the problem, the problem on it: ${made}`);
  /* its name is the line's, put right on the line's own page — reached from the problem (FLOW-AUDIT #20: "Rename this
     line" in a problem was a third way to rename a line, read as changing the problem's line) */
  await row(what).locator('.pe').getByRole('button', { name: 'Rename Line 2B on its page ›' }).click(); await page.waitForTimeout(2000);
  const onItsPage = new RegExp(`#/lines/${s?.workspaceId}`).test(page.url()) && (await page.locator('h1').innerText()).trim() === 'Line 2B';
  await more(page, 'Edit the line'); await page.waitForTimeout(400);
  await page.getByLabel("The line's name").fill('Line 2B — packing'); await page.getByLabel("The line's name").press('Enter'); await page.waitForTimeout(900);
  await go('#/snags');
  ok(onItsPage && (await lineCalled(s?.workspaceId)) === 'Line 2B — packing' && (await page.locator('.qsl-g .qsl-gh h2', { hasText: 'Line 2B — packing' }).count()) === 1, '3 the line renamed on its own page, reached from the problem — the new name on the register');
  await openUp(what);
  await row(what).locator('.pe').getByLabel('Which line').selectOption(wasOn); await page.waitForTimeout(800);
  ok((await snag(what))?.workspaceId === wasOn, '3 and put back on its own line');
}

/* ---- 3b taken with the Problem button for a stage-gate job: assigned, never
   moved (Rowland, 12 October: "It said it's moved to line 2A ... No idea what
   that is") — then taken off again, so the stories after count as before ---- */
{
  await page.locator('.qsl .part-head').getByRole('button', { name: 'Problem', exact: true }).click(); await page.waitForTimeout(800);
  const sheet = page.locator('.sheet, [role="dialog"]').last();
  await sheet.locator('textarea').first().fill('Infeed photo-eye dirty');
  await sheet.locator('label', { hasText: 'PROJECT' }).locator('select').selectOption({ label: sd.job }); await page.waitForTimeout(500);
  const movesSaid = await sheet.getByText(/moves to/i).count();
  await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1500);
  const s = await snag('Infeed photo-eye dirty');
  ok(movesSaid === 0 && s?.status === 'open' && s?.projectId === sd.projectId && !(s?.sent ?? []).length && (await row('Infeed photo-eye dirty').count()) === 1,
    `3 taken with the Problem button for ${sd.job}: open here, for it — never moved, no "Moves to"`);
  if (s) await page.evaluate(async id => { const db = await import('/src/db.ts'); const x = (await db.listAllSnags()).find(y => y.id === id); if (x) await db.updateSnag({ ...x, deletedAt: Date.now() }); }, s.id);
  await page.waitForTimeout(800);
}

/* ---- 4 its journey ---- */
{
  const what = 'Guard on the infeed loose';
  const pe = await openUp(what);
  await pe.getByLabel('What we did — the new step').fill('Taped the guard as a stop-gap');
  await pe.getByLabel('What came of it — the new step').fill('Holds for now');
  await pe.getByRole('button', { name: 'Add the step' }).click(); await page.waitForTimeout(800);
  await row(what).locator('.pe').getByLabel('What we did — the new step').fill('Fitted the interlocked guard');
  await row(what).locator('.pe').getByRole('button', { name: 'Add the step' }).click(); await page.waitForTimeout(800);
  let s = await snag(what);
  const j = (s?.journey ?? []).map(x => `${x.did}${x.result ? ` → ${x.result}` : ''}`);
  ok(j.join(' | ') === 'Taped the guard as a stop-gap → Holds for now | Fitted the interlocked guard', `4 two steps added, each with its day: ${j.join(' | ')}`);
  ok(/2 steps — .*Fitted the interlocked guard/.test(await words('.preg-last', row(what))), `4 shown under it: "${await words('.preg-last', row(what))}"`);
  const res = row(what).locator('.pe .pj-steps .pj-step').nth(1).getByLabel('What came of it');
  await res.fill('No trips since'); await res.blur(); await page.waitForTimeout(800);
  await row(what).locator('.pe').getByLabel('What we will do').fill('Fit an interlocked guard and add it to the weekly checks'); await row(what).locator('.pe').getByLabel('What we will do').blur(); await page.waitForTimeout(800);
  s = await snag(what);
  ok(s?.journey?.find(x => x.did === 'Fitted the interlocked guard')?.result === 'No trips since' && /weekly checks/.test(s?.proposedSolution ?? ''), '4 a step\'s result changed, and what we will do written — both kept');
  await row(what).locator('.pe').getByRole('button', { name: /^Take off the step: Taped/ }).click(); await page.waitForTimeout(700);
  s = await snag(what);
  ok((s?.journey ?? []).length === 1, '4 a step taken off');
}

/* ---- 4b who owes it, then by when — both kept (FLOW-AUDIT #4: "if you type who owes a problem and then its due
   date, the name is lost" — the date was written from the copy the page drew before the name landed, putting the
   old name back while the page said Saved) ---- */
{
  const what = 'Bagger jaw jams on 2kg film';
  const id = await page.evaluate(async ws => {
    const db = await import('/src/db.ts');
    const s = { id: crypto.randomUUID(), workspaceId: ws, status: 'open', raisedAt: Date.now(), updatedAt: Date.now(), media: [], problem: 'Bagger jaw jams on 2kg film', owner: 'Priya Shah' };
    await db.addSnag(s); return s.id;
  }, sd.wsId);
  await go('#/snags');
  const pe = await openUp(what);
  await pe.getByLabel('Whose is it').click();
  const due = new Date(Date.now() + 10 * 86_400_000).toISOString().slice(0, 10);
  /* WHOSE typed, Tab, and the date straight after — quicker than the page reads its rows again, as on a busy phone */
  await row(what).locator('.pe').evaluate(async (box, d) => {
    const who = box.querySelector('input[aria-label="Whose is it"]'), day = box.querySelector('input[aria-label="Due date"]');
    const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })); };
    set(who, 'Sam Lee');
    await new Promise(r => setTimeout(r, 0));
    day.focus(); set(day, d);
    await new Promise(r => setTimeout(r, 0));
    day.blur();
  }, due);
  await page.waitForTimeout(1200);
  const saidSaved = await row(what).locator('.pe-saved').isVisible().catch(() => false);
  await page.reload(); await page.waitForTimeout(2200);
  const s = await snag(what);
  const pe2 = await openUp(what);
  const shown = { who: await pe2.getByLabel('Whose is it').inputValue(), due: await pe2.getByLabel('Due date').inputValue() };
  ok(saidSaved && s?.owner === 'Sam Lee' && shown.who === 'Sam Lee' && shown.due === due && /Sam Lee/.test(await words('.qsl-meta', row(what))),
    `4b whose typed, Tab, the date at once, the page reloaded: both kept — ${s?.owner ?? 'no name'}, due ${shown.due || 'none'}`);
  await page.evaluate(async x => { await (await import('/src/db.ts')).deleteSnag(x); }, id);
  await go('#/snags');
}

/* ---- 5 a photo marked from the editor ---- */
{
  const what = 'Seal jaw leaves marks';
  const pe = await openUp(what);
  await pe.locator('img').first().click(); await page.waitForTimeout(900);
  const pic = page.getByAltText('Evidence').last();
  const b = await pic.boundingBox();
  if (b) await page.mouse.click(b.x + b.width * 0.4, b.y + b.height * 0.5); await page.waitForTimeout(400);
  await page.locator('#evm-words').fill('Burn mark here'); await page.locator('.evm-acts').getByRole('button', { name: 'Save' }).click(); await page.waitForTimeout(900);
  await page.locator('.ev-close').click().catch(() => {}); await page.waitForTimeout(400);
  const s = await snag(what);
  ok((s?.media?.[0]?.pins ?? []).some(p => p.note === 'Burn mark here'), '5 its photo marked from the editor — the mark kept on the problem');
}

/* ---- 6 several at once; filters; by who ---- */
await go('#/snags');
{
  await row('Label printer ribbon low').locator('.qsl-tick input').check(); await row('seeded snag 0').locator('.qsl-tick input').check();
  await page.locator('.qsl-bar-prio').selectOption('high'); await page.waitForTimeout(1200);
  let t = await truth();
  const order = (await page.locator('.qsl-g').first().locator('.qsl-work .qsl-prio').allInnerTexts()).map(x => x.trim().toLowerCase());
  const ranked = order.every((p, i) => i === 0 || ['critical', 'high', 'low'].indexOf(order[i - 1]) <= ['critical', 'high', 'low'].indexOf(p));
  ok(['Label printer ribbon low', 'seeded snag 0'].every(w => t.snags.find(s => s.problem === w)?.priority === 'high') && ranked && /2 made high/.test(await page.locator('body').innerText()), `6 two made High together, the undo offered; in order: ${order.join(' · ')}`);
  const crit = page.locator('.qsl-f .chip', { hasText: 'Critical' });
  ok((await crit.innerText()).trim() === `Critical · ${t.counts.critical}` && /qsl-chip-r/.test(await crit.getAttribute('class') ?? ''), `6 the chips count in their colours: Critical · ${t.counts.critical}`);
  /* saved, the ticks clear themselves — the bar has gone */
  ok((await page.locator('.qsl-bar').count()) === 0, '6 saved: the ticks cleared, the bar gone');
  await crit.click(); await page.waitForTimeout(400);
  const shown = (await page.locator('.qsl-work .qsl-prio, .qsl-jrow .qsl-prio').allInnerTexts()).map(x => x.trim().toLowerCase());
  ok(shown.length === t.counts.critical && shown.every(k => k === 'critical'), `6 Critical shows the critical only: ${shown.length}`);
  await page.locator('.qsl-f .chip', { hasText: 'Late' }).click(); await page.waitForTimeout(400);
  const lateN = t.rows.filter(r => r.late).length + t.jobRows.filter(r => r.late).length;
  ok((await page.locator('.qsl-work, .qsl-jrow').count()) === lateN, `6 Late shows the late only, the projects' among them: ${lateN}`);
  await page.locator('.qsl-f .chip', { hasText: /^Open/ }).click(); await page.getByRole('button', { name: 'By who' }).click(); await page.waitForTimeout(400);
  /* the people's groups — the projects' own problems follow under On the projects */
  const heads = await page.locator('.qsl-g:not(.qsl-job) .qsl-gh h2').allInnerTexts();
  const owners = [...new Set(t.rows.filter(r => r.status !== 'closed').map(r => r.owner ?? 'Nobody yet'))];
  ok(heads.length === owners.length && owners.every(o => heads.includes(o)) && (!heads.includes('Nobody yet') || heads.at(-1) === 'Nobody yet'), `6 by who, nobody's last: ${heads.join(' · ')}`);
  await page.getByRole('button', { name: 'By line' }).click(); await page.waitForTimeout(300);
}

/* ---- 7 whose and due together, closed together, deleted ---- */
{
  for (const w of ['seeded snag 0', 'Label printer ribbon low']) await row(w).locator('.qsl-tick input').check();
  await page.getByRole('button', { name: 'Whose · due' }).click(); await page.waitForTimeout(500);
  const sheet = page.locator('.sheet, [role="dialog"]').last();
  await sheet.locator('input').first().fill('Alex');
  await sheet.getByRole('button', { name: /^Change 2$/ }).click(); await page.waitForTimeout(900);
  let t = await truth();
  ok(['seeded snag 0', 'Label printer ribbon low'].every(w => t.snags.find(s => s.problem === w)?.owner === 'Alex'), '7 two given a name together');
  for (const w of ['seeded snag 0', 'Label printer ribbon low']) await row(w).locator('.qsl-tick input').check();
  await page.locator('.qsl-bar').getByRole('button', { name: 'Close', exact: true }).click(); await page.waitForTimeout(900);
  t = await truth();
  ok(['seeded snag 0', 'Label printer ribbon low'].every(w => t.snags.find(s => s.problem === w)?.status === 'closed') && /2 closed/.test(await page.locator('body').innerText()), '7 closed together, the undo offered');
  page.once('dialog', d => void d.accept());
  await row('Taken by mistake — delete me').locator('.qsl-tick input').check();
  await page.locator('.qsl-bar').getByRole('button', { name: 'Delete', exact: true }).click(); await page.waitForTimeout(1200);
  ok(!(await truth()).all.some(x => x.id === sd.ids['Taken by mistake — delete me']) && (await page.locator('.qsl-row', { hasText: 'Taken by mistake' }).count()) === 0, '7 a ticked problem deleted: asked once, gone');
}

/* ---- 8 its report card, and the Problems report ---- */
{
  const dir = mkdtempSync(join(tmpdir(), 'problems-'));
  const pe = await openUp('Guard on the infeed loose');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), pe.getByRole('button', { name: 'Report card (PDF)' }).click()]);
  const card = join(dir, 'card.pdf'); await dl.saveAs(card);
  const ct = execFileSync('pdftotext', ['-raw', card, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [card], { encoding: 'utf8' }))?.[1]);
  ok(pages === 1 && /PROBLEM/.test(ct) && /Guard on the infeed loose/.test(ct) && /THE JOURNEY/.test(ct) && /Fitted the interlocked guard/.test(ct) && /No trips since/.test(ct) && /weekly checks/.test(ct), `8 its report card: one page — its plan and its journey (${pages} page)`);
  await row('Guard on the infeed loose').locator('.qsl-open').click(); await page.waitForTimeout(300);
  page.locator('.pdfr-x').click().catch(() => {});
  const t = await truth();
  const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), paper(page, 'Problems report')]);
  const rep = join(dir, 'problems.pdf'); await dl2.saveAs(rep); if (process.env.KEEP_PDF) execFileSync('cp', [rep, process.env.KEEP_PDF]);
  const txt = execFileSync('pdftotext', ['-raw', rep, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  const all = await page.evaluate(async ws => { const { san } = await import('/src/lib/reportKit.ts'); await (await import('/src/lib/savePdf.ts')).loadPdfLib(); return ws.map(w => san(w)); }, [...t.rows.filter(r => r.status !== 'closed').map(r => r.what), ...t.jobRows.filter(r => r.open).map(r => r.what)]);
  const flatTxt = txt.replace(/\s+/g, '');
  const lost = all.filter(w => !flatTxt.includes(w.replace(/\s+/g, '')));
  ok(/PROBLEMS/.test(txt) && !lost.length && /CRITICAL ·/.test(txt) && /Fitted the interlocked guard — No trips since/.test(txt) && /Plan: Fit an interlocked guard/.test(txt) && !/Demo fault/.test(txt), `8 the Problems report: every open problem, the projects' own among them (${all.length}), its plan and its journey${lost.length ? ` — lost: ${lost.slice(0, 4).join(', ')}` : ''}`);
  /* EVERY PROBLEM AS A CARD (Rowland, 13 October: "the cards are great but i
     dont have ability to make a card for all of the problems") — beside the
     report, a card for every problem it lists. */
  {
    const [dlc] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), paper(page, 'Problem cards')]);
    const cf = join(dir, 'problems-cards.pdf'); await dlc.saveAs(cf);
    const ctext = execFileSync('pdftotext', ['-raw', cf, '-'], { encoding: 'utf8' }).replace(/\s+/g, '');
    const cpages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [cf], { encoding: 'utf8' }))?.[1]);
    const missing = all.filter(w => !ctext.includes(w.replace(/\s+/g, '').slice(0, 24)));
    ok(cpages === all.length && !missing.length, `8 Problems cards: a card for every problem the report lists, the projects' own among them (${cpages} of ${all.length})${missing.length ? ` — missing: ${missing.slice(0, 3).join(', ')}` : ''}`);
  }
  /* EVERY GROUP ON PAPER, AND THE PROJECT'S OWN PAGE (Rowland, 12 October:
     "every problem can either have their own card ... or every group ... when
     it's sent to a project, on that project page itself, also I can have a
     project card"). */
  const pdfText = async (click, name) => {
    const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click()]);
    const f = join(dir, name); await d.saveAs(f);
    return { text: execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' '),
      pages: Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))?.[1]) };
  };
  const flat = x => x.replace(/\s+/g, '');
  const gName = (await page.locator('.qsl-g:not(.qsl-job) .qsl-gh h2').first().innerText()).trim();
  const gOpen = t.rows.filter(r => r.line === gName && r.status !== 'closed');
  const gRep = await pdfText(() => page.getByRole('button', { name: `Report for ${gName} (PDF)` }).click(), 'group.pdf');
  ok(new RegExp(`${gName} — problems`).test(gRep.text) && gOpen.every(r => flat(gRep.text).includes(flat(r.what.slice(0, 30)))), `8 a line's group on paper: ${gName} — its ${gOpen.length} open`);
  const gCards = await pdfText(() => page.getByRole('button', { name: `Report cards for ${gName} (PDF)` }).click(), 'group-cards.pdf');
  ok(gCards.pages === gOpen.length, `8 a line's group as cards: one page each (${gCards.pages} of ${gOpen.length})`);
  const pOpen = t.jobRows.filter(r => r.open && r.job === sd.job);
  const pAssigned = t.snags.filter(s => s.projectId === sd.projectId && s.status !== 'closed');
  const pRep = await pdfText(() => page.getByRole('button', { name: `Report for ${sd.job} (PDF)` }).click(), 'project.pdf');
  ok(new RegExp(`${sd.job} — problems`).test(pRep.text) && pOpen.every(r => flat(pRep.text).includes(flat(r.what.slice(0, 30)))) && pAssigned.every(s => flat(pRep.text).includes(flat(s.problem.slice(0, 30)))),
    `8 a project's group on paper: ${sd.job} — its own ${pOpen.length} and the ${pAssigned.length} assigned to it`);
  await go(`#/project/${sd.projectId}/fixes`);
  const jRep = await pdfText(() => paper(page, 'Problems report'), 'project-page.pdf');
  ok(pOpen.every(r => flat(jRep.text).includes(flat(r.what.slice(0, 30)))) && pAssigned.every(s => flat(jRep.text).includes(flat(s.problem.slice(0, 30)))), `8 the project's own page: its Problems report — the same ${pOpen.length + pAssigned.length}`);
  const jCards = await pdfText(() => paper(page, 'Problem cards'), 'project-cards.pdf');
  ok(jCards.pages === pOpen.length + pAssigned.length, `8 the project's own page: a card each (${jCards.pages} of ${pOpen.length + pAssigned.length})`);
  await go('#/snags');
}

/* ---- 10 the job's own view (before the fresh start puts them away) ---- */
{
  await page.evaluate(async ({ ws, pid }) => {
    const db = await import('/src/db.ts');
    await db.addSnag({ id: crypto.randomUUID(), workspaceId: ws, status: 'open', raisedAt: Date.now(), updatedAt: Date.now(), media: [], problem: 'Coder misprints the date', projectId: pid });
  }, { ws: sd.wsId, pid: sd.projectId });
  await go(`#/project/${sd.projectId}/fixes`);
  const sec = page.locator('.cmp-sec', { hasText: 'Problems for this project — not on it yet' });
  ok((await words('h1')) === `${sd.job} — problems` && (await sec.locator('.fxl-row', { hasText: 'Coder misprints the date' }).count()) === 1, '10 the project\'s own page — named for it — lists a problem assigned to it');
  await sec.locator('.fxl-row', { hasText: 'Coder misprints the date' }).getByRole('button', { name: 'Make it a fix' }).click();
  /* the fix is written, then the page reads it back — waited for, not a fixed pause (gate 32: 1.5 s was not enough under the gate's load) */
  await page.locator('.fxl-row', { hasText: 'Coder misprints the date' }).filter({ hasText: /seen first on / }).first().waitFor({ timeout: 10000 }).catch(() => {});
  ok(/seen first on /.test(await page.locator('.fxl-row', { hasText: 'Coder misprints the date' }).first().innerText()), '10 made a fix there, saying where it was seen first');
}

/* ---- 9 a fresh start: put away, nothing deleted, brought back ---- */
await go('#/snags');
{
  const before = await truth();
  const n = before.snags.length;
  page.once('dialog', d => void d.accept());
  await more(page, 'Start fresh'); await page.waitForTimeout(2500);
  const t = await truth();
  ok(t.snags.length === 0 && t.all.length === before.all.length && t.all.every(s => !!s.archivedAt), `9 a fresh start: all ${n} put away — none deleted (${t.all.length} kept)`);
  ok(/A fresh start/.test(await words('.qsl-empty')) && (await page.locator('.qsl-work').count()) === 0 && new RegExp(`Put away by a fresh start — ${t.all.length}`).test(await words('.preg-away')), '9 the page empty and saying so; the put-away listed at its foot');
  await page.locator('.preg-away > .linkish').click(); await page.waitForTimeout(400);
  await page.locator('.preg-away-row', { hasText: 'Guard on the infeed loose' }).getByRole('button', { name: 'Bring back' }).click(); await page.waitForTimeout(1200);
  ok((await truth()).snags.some(s => s.problem === 'Guard on the infeed loose') && (await row('Guard on the infeed loose').count()) === 1, '9 one brought back — on the page again');
  await page.getByRole('button', { name: 'Bring them all back' }).click(); await page.waitForTimeout(1500);
  ok((await truth()).snags.length === before.all.length, '9 and all of them');
}

/* ---- 11 on a phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 }); await go('#/snags');
  await openUp('Guard on the infeed loose');
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(wide <= 1 && (await row('Guard on the infeed loose').locator('.pe').isVisible()), `11 on a phone: nothing off the side (${wide}px), the editor fits`);
  /* every problem readable — no words squeezed into a sliver running down the page (13 October: "all of the writing was going down the page, like a long line") */
  const thin = await page.evaluate(() => [...document.querySelectorAll('.qsl .qsl-what, .qsl .qsl-meta, .qsl .qsl-gh h2')].filter(e => e.getBoundingClientRect().width < 120 && (e.textContent ?? '').length > 14).map(e => (e.textContent ?? '').slice(0, 30)));
  ok(thin.length === 0 && (await page.locator('.qsl-jrow').count()) > 0, `11 on a phone: every problem readable, the projects' among them${thin.length ? ` — squeezed: ${thin.slice(0, 3).join(' | ')}` : ''}`);
}

/* ---- 14 a project's own problem and fix, worked in Control room problems (Rowland, 13 October: "full edit, full
   changes, it doesn't matter what it is, this is the power room") — before its project is archived in 12 ---- */
{
  await page.setViewportSize({ width: 1360, height: 900 }); await go('#/room'); await go('#/snags');
  const t = await truth();
  const prob = t.jobRows.find(r => r.kind === 'problem' && r.open && !r.photo);
  const jr = page.locator('.qsl-jrow', { hasText: prob.what }).first();
  await jr.locator('.qsl-open').click(); await page.waitForTimeout(500);
  const ed = jr.locator('.pe');
  ok(await ed.isVisible(), `14 a project's own problem opens as its own editor: ${prob.what.slice(0, 40)}`);
  await ed.getByRole('group', { name: 'Priority' }).getByRole('button', { name: 'High' }).click(); await page.waitForTimeout(700);
  await ed.getByLabel('Whose is it').fill('Priya'); await ed.getByLabel('Whose is it').blur(); await page.waitForTimeout(700);
  const item = await page.evaluate(async ({ pid, id }) => (await (await import('/src/db.ts')).listTestItems(pid)).find(i => i.id === id), { pid: prob.projectId, id: prob.id });
  ok(!!item?.risk && !item?.critical && item?.owner === 'Priya' && (await ed.locator('.pe-saved').isVisible()), '14 its priority and whose changed there, kept on its project, "Saved" said');
  const lineOpt = (await ed.getByLabel('Put this problem on a line').locator('option').allInnerTexts())[1];
  await ed.getByLabel('Put this problem on a line').selectOption({ label: lineOpt }); await page.waitForTimeout(1500);
  const made = (await truth()).snags.find(x => x.problem === prob.what);
  const after = await page.evaluate(async ({ pid, id }) => (await (await import('/src/db.ts')).listTestItems(pid)).find(i => i.id === id), { pid: prob.projectId, id: prob.id });
  ok(!!made && made.projectId === prob.projectId && made.priority === 'high' && made.owner === 'Priya' && after?.doneAt != null && (await row(prob.what).locator('.pe').count()) === 1,
    `14 put on a line (${lineOpt}): one of the room's own, for its project, its priority and whose carried, open to work; its project's record sorted`);
  await row(prob.what).locator('.pe-save').click(); await page.waitForTimeout(600);
  const fx = t.jobRows.find(r => r.kind === 'fix' && r.open);
  if (fx) {
    const fr = page.locator('.qsl-jrow', { hasText: fx.what }).first();
    await fr.locator('.qsl-open').click(); await page.waitForTimeout(500);
    await fr.locator('.pe').getByRole('group', { name: 'Where it stands' }).getByRole('button', { name: 'Done' }).click(); await page.waitForTimeout(800);
    const tt = await page.evaluate(async ({ pid, id }) => (await (await import('/src/db.ts')).listTests(pid)).find(x => x.id === id), { pid: fx.projectId, id: fx.id });
    ok(tt?.outcome === 'passed', `14 a fix marked done there, kept on its project: ${fx.what.slice(0, 40)}`);
  }
}

/* ---- 12 an archived project's line, and the saves said (Rowland, 12 October:
   "2A and 2B is actually an archived project ... as I try and click the square
   box on a single problem, assign it to something else, even with the
   priority, that section there doesn't work. There's no save") — on a phone ---- */
{
  const { away, lineNm } = await page.evaluate(async ({ pid, ws }) => {
    const db = await import('/src/db.ts'); const P = await import('/src/db/projects.ts');
    const c = await db.chainForWorkspace(ws); const id = c?.projectId ?? pid; await P.archiveProject(id);
    return { away: (await P.allProjects()).find(p => p.id === id)?.name, lineNm: (await db.listWorkspaces()).find(w => w.id === ws)?.name };
  }, { pid: sd.projectId, ws: sd.wsId });
  await go('#/room'); await go('#/snags');
  /* the archived JOB's name is nowhere on the page (12 October: "the bloody title 2A2B ... doesn't exist because it's an
     archive project"); its LINE is still a line of the factory and its problems stay on it, worked (13 October: "archive
     is causing issues ... once and for all") */
  const heads = await page.locator('.qsl-g:not(.qsl-job) .qsl-gh h2').allInnerTexts();
  ok(!(await page.locator('.qsl').innerText()).includes(away) && heads.includes(lineNm), `12 the archived job's name (${away}) is nowhere on the page; its line ${lineNm} still heads its problems`);
  const onLine = page.locator('.qsl-g', { has: page.locator('.qsl-gh h2', { hasText: lineNm }) });
  const tt = await truth();
  const stayed = tt.rows.filter(r => r.workspaceId === sd.wsId && r.status !== 'closed');
  ok(stayed.length > 0 && (await onLine.locator('.qsl-work').count()) === stayed.length, `12 every one of them still here, open and worked: ${stayed.length}`);
  const freeRow = onLine.locator('.qsl-work').filter({ hasNotText: 'seeded snag' }).first();
  const what = (await freeRow.locator('.qsl-what').innerText()).replace(/^(LOW|HIGH|CRITICAL)\s*/i, '').trim();
  await row(what).locator('.qsl-open').click(); await page.waitForTimeout(500);
  const lb = row(what).locator('.pe').getByLabel('Which line');
  const lbOpts = await lb.locator('option').allInnerTexts();
  ok((await lb.evaluate(el => el.options[el.selectedIndex]?.text)) === lineNm && !lbOpts.some(o => o.includes(away)), `12 its line box says ${lineNm} and offers the factory's lines, no archived job among them`);
  page.once('dialog', d => void d.accept('Line 2C'));
  await lb.selectOption({ label: 'A new line…' }); await page.waitForTimeout(1500);
  const on2c = await page.evaluate(async () => { const db = await import('/src/db.ts'); const l = (await db.listWorkspaces()).find(x => x.name === 'Line 2C'); return (await db.listAllSnags()).filter(x => x.workspaceId === l?.id).map(x => x.problem); });
  ok(on2c.length === 1 && on2c[0] === what, `12 put on a new line from its own box: ${what}`);
  await row(what).locator('.pe-save').click(); await page.waitForTimeout(800);
  /* the bar, too: a ticked problem put on a line, and the ticks cleared */
  await row(what).locator('.qsl-tick input').check(); await page.waitForTimeout(300);
  const barOpts = await page.locator('.qsl-bar-line option').allInnerTexts();
  ok(await page.locator('.qsl-bar').isVisible() && !barOpts.includes(away) && barOpts.includes('Line 2C'), '12 ticked: the bar puts it on a line in use');
  await page.locator('.qsl-bar-line').selectOption({ label: 'Line 2C' }); await page.waitForTimeout(1200);
  ok((await page.locator('.qsl-bar').count()) === 0 && /Saved — 1 now on Line 2C/.test(await page.locator('body').innerText()), '12 put on a line from the bar: saved, said so, the ticks cleared');
  await row(what).locator('.qsl-open').click(); await page.waitForTimeout(600);
  await row(what).locator('.pe').getByRole('group', { name: 'Priority' }).getByRole('button', { name: 'High' }).click(); await page.waitForTimeout(800);
  ok(await row(what).locator('.pe-saved').isVisible(), '12 a box changed: "Saved" beside Save');
  await row(what).locator('.pe').getByLabel('What is the problem').fill(`${what} — saved with Save`);
  await row(what).locator('.pe-save').click(); await page.waitForTimeout(1200);
  /* the screen read first — "Saved" stays four seconds, and reading the store back can take longer on a busy machine */
  const sv = await page.locator('.preg-saved').count(), pe = await row(`${what} — saved with Save`).locator('.pe').count(), kept = !!(await snag(`${what} — saved with Save`));
  ok(kept && pe === 0 && sv === 1, `12 Save keeps what was typed, closes it and says Saved on its row (kept ${kept}, editors open ${pe}, saved shown ${sv})`);
  await go('#/room');
  const cr = (await page.locator('.fac-home').innerText()).replace(/\s+/g, ' ');
  ok(!cr.includes(away) && cr.includes(lineNm) && cr.includes('Line 2C'), `12 the control room's factory: ${lineNm} still there, Line 2C beside it, the archived job's name nowhere`);
}

/* ---- 13 the audit of 13 October — every case that would have sent us back ---- */
{
  await page.setViewportSize({ width: 1360, height: 900 }); await go('#/snags');
  const t = await truth();
  /* a problem for a project archived since says what it is for */
  /* an open problem put for the project before it was archived (story 12) */
  const forArchId = t.snags.find(x => x.status !== 'closed' && !x.assetId)?.id;
  await page.evaluate(async ({ id, pid }) => { const db = await import('/src/db.ts'); const x = (await db.listAllSnags()).find(y => y.id === id); if (x) await db.updateSnag({ ...x, projectId: pid }); }, { id: forArchId, pid: sd.projectId });
  await go('#/room'); await go('#/snags');
  const forArch = (await truth()).snags.find(x => x.id === forArchId);
  if (forArch) {
    const r = row(forArch.problem);
    ok(!(await words('.qsl-meta', r)).includes(sd.job), `13 a problem for an archived project: its row never names the archived project`);
    await r.locator('.qsl-open').click(); await page.waitForTimeout(500);
    ok((await r.locator('.pe').getByLabel('Which project').evaluate(el => el.options[el.selectedIndex]?.text)) === `${sd.job} — archived project`, '13 and its project box names it — never "No project"');
    /* closed from its own editor: it stays in view, saying so — Closed asks what shows it is fixed first, answered
       with nothing (FLOW-AUDIT #12: one tap closed it, nothing asked) */
    await r.locator('.pe').getByRole('group', { name: 'Where it stands' }).getByRole('button', { name: 'Closed' }).click(); await page.waitForTimeout(500);
    await r.locator('.pe-close').getByRole('button', { name: 'Close it' }).click(); await page.waitForTimeout(900);
    ok((await row(forArch.problem).count()) === 1 && (await snag(forArch.problem))?.status === 'closed', '13 closed from its editor on Open: it stays in view until closed up');
    await row(forArch.problem).locator('.pe-save').click(); await page.waitForTimeout(800);
  } else ok(false, '13 no open problem for the archived project to look at');
  /* a changed priority never moves the row being worked — two open problems on a line in use, the lower one worked */
  await page.evaluate(async () => {
    const db = await import('/src/db.ts'); const l = (await db.listWorkspaces()).find(x => x.name === 'Line 2C'); const t = Date.now();
    for (const [i, w] of ['Sorted first, low', 'Sorted second, low'].entries()) await db.addSnag({ id: crypto.randomUUID(), workspaceId: l.id, problem: w, status: 'open', raisedAt: t - i * 1000, updatedAt: t, media: [] });
  });
  await go('#/room'); await go('#/snags');
  const any = page.locator('.qsl-work').last();
  const what2 = (await any.locator('.qsl-what').innerText()).replace(/^(LOW|HIGH|CRITICAL)\s*/i, '').trim();
  await row(what2).locator('.qsl-open').click(); await page.waitForTimeout(500);
  /* its place on the page, not on the screen — the browser scrolls to reach the button */
  const pageY = () => row(what2).evaluate(el => el.getBoundingClientRect().top + window.scrollY);
  const y0 = await pageY();
  await row(what2).locator('.pe').getByRole('group', { name: 'Priority' }).getByRole('button', { name: 'Critical' }).click(); await page.waitForTimeout(900);
  const y1 = await pageY();
  ok(Math.abs(y1 - y0) < 40 && (await snag(what2))?.priority === 'critical', `13 made Critical while open: saved, and the row stays where it is (${Math.round(y1 - y0)}px)`);
  await row(what2).locator('.pe-save').click(); await page.waitForTimeout(800);
  /* one pinned on a walk keeps its walk, said so — its line no longer in use */
  const pinned = (await truth()).all.find(x => x.assetId && !x.archivedAt && x.status !== 'closed');
  if (pinned) {
    await row(pinned.problem).locator('.qsl-open').click(); await page.waitForTimeout(500);
    const pe = row(pinned.problem).locator('.pe');
    ok((await pe.getByLabel('Which line').count()) === 0 && /Pinned on the walk of a line no longer in use/.test(await pe.innerText()), '13 a problem pinned on a walk keeps its walk, said so');
    await row(pinned.problem).locator('.pe-save').click(); await page.waitForTimeout(600);
  } else ok(true, '13 (no open pinned problem left to look at)');
  /* one made a fix on its project says so under Done — put back on a line in use first, its own line having gone with its project */
  await page.evaluate(async () => { const db = await import('/src/db.ts'); const l = (await db.listWorkspaces()).find(x => x.name === 'Line 2C'); const x = (await db.listAllSnags()).find(y => y.problem === 'Coder misprints the date' && !y.deletedAt); if (x && l) await db.updateSnag({ ...x, workspaceId: l.id }); });
  await go('#/room'); await go('#/snags');
  await page.locator('.qsl-f .chip', { hasText: /^Done/ }).click(); await page.waitForTimeout(400);
  ok(/Made a fix on /.test(await row('Coder misprints the date').locator('.qsl-state').innerText().catch(() => '')), '13 made a fix on its project: under Done it says "Made a fix on …", never a bare Closed');
}

/* ---- 15 the Problem button inside a job: on the job's own line (FLOW-AUDIT #5: "a problem taken inside Line 2
   commissioning is filed on Line 7, which is the last line used, not the job's own line") ---- */
const ids = await page.evaluate(async () => {
  const db = await import('/src/db.ts'); const P = await import('/src/db/projects.ts');
  const ws = await db.listWorkspaces();
  const l2c = ws.find(w => w.name === 'Line 2C'), l7 = ws.find(w => w.name === 'Line 7');
  const guard = await db.createProject('Line 2C guarding', '#2b87d4', 'Rowland', 'r@example.com', 'commissioning');
  await db.addPaceLine({ projectId: guard.id, workspaceId: l2c.id, key: '2C', name: 'Line 2C', sort: 0 });
  const paced = (await P.allProjects()).find(p => p.name === 'Line 7 pace');
  const l7line = (await db.allPaceLines()).find(l => l.projectId === paced.id && l.workspaceId === l7.id);
  return { l2c: l2c.id, l7: l7.id, guard: guard.id, paced: paced.id, l7line: l7line.id };
});
{
  /* the last line used is another line */
  await page.evaluate(async ws => (await import('/src/snag/quick.ts')).remember('line', ws), ids.l7);
  await go(`#/project/${ids.guard}`);
  await page.locator('.qs-top').first().click(); await page.waitForTimeout(900);
  let sheet = page.locator('.sheet, [role="dialog"]').last();
  const on = await sheet.getByLabel('Which line').evaluate(el => el.options[el.selectedIndex]?.text);
  const pj = await sheet.getByLabel('Which project').evaluate(el => el.options[el.selectedIndex]?.text);
  ok(on === 'Line 2C' && pj === 'Line 2C guarding', `15 inside a job on one line: the sheet starts on its line — ${on}, for ${pj} (the last line used was Line 7)`);
  await sheet.locator('textarea').first().fill('Guard hinge cracked at the infeed');
  await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1200);
  const kept = await snag('Guard hinge cracked at the infeed');
  ok(kept?.workspaceId === ids.l2c && kept?.projectId === ids.guard, '15 saved on Line 2C, for the job');
  /* a job on two lines asks which — as it asks for the machine */
  await go(`#/project/${ids.paced}`);
  await page.locator('.qs-top').first().click(); await page.waitForTimeout(900);
  sheet = page.locator('.sheet, [role="dialog"]').last();
  const ask = sheet.getByRole('group', { name: "Which of the project's lines" });
  const offered = (await ask.locator('.chip').allInnerTexts()).map(x => x.trim());
  await sheet.locator('textarea').first().fill('Reject chute blocks on 1.25 kg');
  const held = await sheet.getByRole('button', { name: 'Save', exact: true }).isDisabled();
  ok(offered.length === 2 && offered.includes('Line 7') && held && /is on 2 lines — which is it on\?/.test(await ask.innerText()), `15 inside a job on two lines: it asks which (${offered.join(', ')}), and waits`);
  await ask.getByRole('button', { name: 'Line 7', exact: true }).click(); await page.waitForTimeout(300);
  await sheet.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1200);
  const on7 = await snag('Reject chute blocks on 1.25 kg');
  ok(on7?.workspaceId === ids.l7 && on7?.projectId === ids.paced, '15 the line said: saved on Line 7, for the 6M job');
  await page.evaluate(async x => { const db = await import('/src/db.ts'); for (const id of x) await db.deleteSnag(id); }, [kept?.id, on7?.id].filter(Boolean));
}

/* ---- 16 closed asks what shows it is fixed (FLOW-AUDIT #12: "one tap closes it ... its last step read 'Ran 2 h
   without a jam, then jammed again', and it still closed with nothing asked") ---- */
{
  const what = 'Bagger jaw jams on 2kg film — again';
  await page.evaluate(async ws => {
    const db = await import('/src/db.ts'); const t = Date.now();
    await db.addSnag({ id: crypto.randomUUID(), workspaceId: ws, problem: 'Bagger jaw jams on 2kg film — again', status: 'open', raisedAt: t - 3 * 86_400_000, updatedAt: t, media: [], priority: 'high',
      journey: [{ id: crypto.randomUUID(), at: t - 86_400_000, did: 'New jaw springs fitted', result: 'Ran 2 h without a jam, then jammed again' }] });
  }, ids.l2c);
  await go('#/snags');
  const pe = await openUp(what);
  await pe.getByRole('group', { name: 'Where it stands' }).getByRole('button', { name: 'Closed' }).click(); await page.waitForTimeout(600);
  const ask = row(what).locator('.pe-close');
  const asked = await ask.isVisible() && /WHAT SHOWS IT IS FIXED/.test(await ask.innerText()) && /jammed again/.test(await ask.innerText());
  ok(asked && (await snag(what))?.status === 'open', '16 Closed asks what shows it is fixed, its last step ("then jammed again") in view — not closed yet');
  await ask.getByLabel('What shows it is fixed').fill('A full shift on 2kg film with no jam');
  await ask.getByRole('button', { name: 'Close it' }).click(); await page.waitForTimeout(900);
  const s = await snag(what);
  const last = (s?.journey ?? []).slice().sort((a, b) => a.at - b.at).at(-1);
  ok(s?.status === 'closed' && last?.did === 'Closed' && last?.result === 'A full shift on 2kg film with no jam' && /Closed → A full shift/.test(await words('.preg-last', row(what))),
    `16 closed, and what shows it is fixed kept as its journey's last step: ${last?.did} → ${last?.result}`);
  const dir = mkdtempSync(join(tmpdir(), 'proof-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), row(what).locator('.pe').getByRole('button', { name: 'Report card (PDF)' }).click()]);
  const f = join(dir, 'card.pdf'); await dl.saveAs(f);
  const ct = execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  ok(/A full shift on 2kg film with no jam/.test(ct) && /jammed again/.test(ct), '16 on its card: the step that failed and what shows it is fixed');
  await row(what).locator('.pe-save').click(); await page.waitForTimeout(500);
}

/* ---- 17 a problem seen on the floor made the head of the fish (FLOW-AUDIT #13: "a problem seen on the floor cannot
   become the head of the fish ... today it means typing the problem again") ---- */
{
  const what = 'Checkweigher rejects good packs after a film change';
  await page.evaluate(async ({ l7, l2c }) => {
    const db = await import('/src/db.ts'); const t = Date.now();
    await db.addSnag({ id: crypto.randomUUID(), workspaceId: l7, problem: 'Checkweigher rejects good packs after a film change', status: 'open', raisedAt: t, updatedAt: t, media: [], priority: 'critical', owner: 'Lee Carty' });
    await db.addSnag({ id: crypto.randomUUID(), workspaceId: l7, problem: 'Film splice tears at the former', status: 'open', raisedAt: t, updatedAt: t, media: [] });
    await db.addSnag({ id: crypto.randomUUID(), workspaceId: l2c, problem: 'Pallet wrapper film breaks', status: 'open', raisedAt: t, updatedAt: t, media: [] });
  }, ids);
  await go('#/snags');
  /* on a line with no 6M job: start one */
  const none = await openUp('Pallet wrapper film breaks');
  ok(/No 6M project on Line 2C yet/.test(await none.innerText()) && (await none.getByRole('button', { name: 'Start one to find its root cause ›' }).count()) === 1, '17 on a line with no 6M job: "Start one to find its root cause ›"');
  await row('Pallet wrapper film breaks').locator('.pe-save').click(); await page.waitForTimeout(400);
  /* on Line 7, whose 6M job finds root causes */
  const pe = await openUp(what);
  await pe.getByRole('button', { name: 'Find the root cause ›' }).click(); await page.waitForTimeout(3000);
  const s = await snag(what);
  const made = await page.evaluate(async id => (await import('/src/db.ts')).getCase(id), s?.caseId ?? '');
  ok(new RegExp(`#/project/${ids.paced}/fishbone\\?.*problem=${s?.caseId}`).test(page.url()) && made?.title === what && made?.source?.kind === 'observed' && made?.source?.snag === s?.id && made?.lineId === ids.l7line,
    `17 Find the root cause ›: a 6M problem in its words, on Line 7 pace's Line 7, its fishbone open (${made?.title})`);
  ok((await page.locator('body').innerText()).includes(what), '17 the head of the fish says it');
  ok(s?.status === 'closed' && s?.projectId === ids.paced && /Taken to 6M on Line 7 pace/.test((s?.journey ?? []).map(j => j.did).join(' ')), '17 the register problem taken there — closed for Line 7 pace, said on its journey');
  await go('#/snags');
  await page.locator('.qsl-f .chip', { hasText: /^Done/ }).click(); await page.waitForTimeout(400);
  ok(/Taken to 6M on Line 7 pace/.test(await row(what).locator('.qsl-state').innerText().catch(() => '')), '17 under Done it says "Taken to 6M on Line 7 pace", never a bare Closed');
  await page.locator('.qsl-f .chip', { hasText: /^Open/ }).click(); await page.waitForTimeout(400);
  const asCase = page.locator('.qsl-jrow', { hasText: what }).first();
  ok((await asCase.count()) === 1 && /Finding the cause/.test(await asCase.innerText()) && /seen first on Line 7/.test(await asCase.innerText()), '17 and listed once, open, as the 6M problem — Finding the cause, seen first on Line 7');
  /* the fishbone's Open a problem lists the line's open problems under Something seen */
  await go(`#/project/${ids.paced}/fishbone?line=${ids.l7line}`);
  await page.getByRole('button', { name: /Open a problem/ }).first().click(); await page.waitForTimeout(900);
  const seen = page.getByRole('list', { name: 'Problems seen on the line' });
  const listed = (await seen.locator('.fj-seen-t').allInnerTexts()).map(x => x.trim());
  ok(listed.includes('Film splice tears at the former') && !listed.includes(what) && !listed.includes('Pallet wrapper film breaks'), `17 Open a problem, Something seen: the line's open problems listed (${listed.join(', ')})`);
  await seen.getByRole('button', { name: /Film splice tears at the former/ }).click(); await page.waitForTimeout(2500);
  const sp = await snag('Film splice tears at the former');
  ok(sp?.status === 'closed' && !!sp?.caseId && new RegExp(`problem=${sp?.caseId}`).test(page.url()) && (await page.locator('body').innerText()).includes('Film splice tears at the former'),
    '17 one tapped: the head of the fish in its words, the register problem taken there');
}

/* ---- 18 from a line's page, on a phone: the problem tapped in view, and the way back (FLOW-AUDIT #22: "it lands at
   the top ... the opened editor is two screens down, behind the Problem button ... no way back to the line") ---- */
{
  await page.evaluate(async ws => {
    const db = await import('/src/db.ts'); const t = Date.now();
    for (let i = 0; i < 10; i++) await db.addSnag({ id: crypto.randomUUID(), workspaceId: ws, problem: `Critical on the infeed ${i + 1}`, status: 'open', raisedAt: t - i * 1000, updatedAt: t, media: [], priority: 'critical' });
    await db.addSnag({ id: crypto.randomUUID(), workspaceId: ws, problem: 'Low one at the end of the line', status: 'open', raisedAt: t - 9 * 86_400_000, updatedAt: t, media: [], priority: 'low' });
  }, ids.l2c);
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/lines/${ids.l2c}`);
  await page.locator('.pl-row', { hasText: 'Low one at the end of the line' }).first().click(); await page.waitForTimeout(2600);
  const r = row('Low one at the end of the line');
  const box = await r.evaluate(el => ({ top: el.getBoundingClientRect().top, onPage: el.getBoundingClientRect().top + window.scrollY, h: window.innerHeight }));
  ok(/#\/snags\?line=/.test(page.url()) && (await r.locator('.pe').count()) === 1 && box.onPage > box.h && box.top >= 0 && box.top < box.h / 3,
    `18 from the line: the problem tapped scrolled into view, its editor open (it sits ${Math.round(box.onPage)}px down the page; now ${Math.round(box.top)}px from the top)`);
  const back = page.locator('.qsl-back');
  const bb = await back.boundingBox();
  ok((await back.innerText()).trim() === '‹ Line 2C' && (bb?.height ?? 0) >= 44, `18 the way back: "${(await back.innerText()).trim()}", ${Math.round(bb?.height ?? 0)}px tall`);
  await page.evaluate(() => window.scrollTo(0, 0)); await back.click(); await page.waitForTimeout(1500);
  ok(new RegExp(`#/lines/${ids.l2c}`).test(page.url()) && (await page.locator('h1').innerText()).trim() === 'Line 2C', '18 tapped: back on Line 2C');
  await page.setViewportSize({ width: 1360, height: 900 });
}

/* ---- 19 WHAT A PROBLEM COSTS THE LINE while it is open (knowledge/specs/FC-154-problem-cost.md; CLAUDE.md, 24 October:
   "the cost is merely one of the outputs ... don't block anything"): one number typed — the minutes a day — said in money
   by the line's cost model in the loss count's two parts; the wage, speed and margin named when the line lacks them;
   on the row, the editor, the closing line, the card and the report; the phone. ---- */
{
  const MOD = '/src/lib/problemCost.ts';
  const said = async id => page.evaluate(async ([id, MOD]) => { const db = await import('/src/db.ts'); const M = await import(MOD); const { neckOf } = await import('/src/lib/lineLoss.ts');
    const s = (await db.listAllSnags()).find(x => x.id === id); const ws = await db.getWorkspace(s.workspaceId);
    const frames = s.assetId ? await db.listSnagAssets(s.workspaceId) : []; const machine = s.assetId ? frames.find(a => a.id === s.assetId)?.name : s.targetAsset;
    return M.problemCost(s, machine, ws, neckOf(await db.listAllStandards(), s.workspaceId)); }, [id, MOD]);
  const ws0 = await page.evaluate(async id => (await import('/src/db.ts')).getWorkspace(id), sd.wsId);
  const setLine = async ws => { await page.evaluate(async ws => { const db = await import('/src/db.ts'); await db.updateWorkspace(ws); }, ws); await page.waitForTimeout(1500); };
  const { crew: _c, labourRatePerHour: _w, labourBurden: _b, packsPerMin: _p, marginPerPack: _m, ...bare } = ws0; void [_c, _w, _b, _p, _m];
  await setLine(bare);
  /* two problems of the line's own: one on no machine (it stops the line), one at the Bagger — not the bottleneck (the Packer is, Line capacity's) */
  const two = await page.evaluate(async ws => { const db = await import('/src/db.ts'); const t = Date.now();
    const mk = p => ({ id: crypto.randomUUID(), workspaceId: ws, status: 'open', raisedAt: t - 3600_000, updatedAt: t, media: [], ...p });
    const a = mk({ problem: 'Guard switch drops the line out twice a shift' }), b = mk({ problem: 'Bagger film splice by hand', targetAsset: 'Bagger' });
    await db.addSnag(a); await db.addSnag(b); return { a: a.id, b: b.id }; }, sd.wsId);
  await go('#/snags');
  const peA = await openUp('Guard switch drops the line out');
  const box = peA.getByLabel('Minutes a day it costs the line');
  await box.fill('20'); await box.blur(); await page.waitForTimeout(900);
  let c = await said(two.a), t = await words('.pe-cost', peA);
  const sA = (await truth()).all.find(x => x.id === two.a);
  ok(sA?.minutesPerDay === 20 && !!c && t === c.words && /^20 min a day on the line — give the line a wage \(Set up the line\)/.test(t), `19 20 minutes typed and kept; the sentence under the box is the module's, naming the wage the line has not got — "${t}"`);
  await setLine({ ...bare, crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, packsPerMin: 100, marginPerPack: 0.04 });
  c = await said(two.a); t = await words('.pe-cost', peA);
  ok(t === c.words && t === '20 min a day on the line: £25 labour · 2,000 packs lost · £80 contribution a day.', `19b the line given its crew, wage, speed and margin: labour, packs and contribution, without a reload — "${t}"`);
  const short = await words('.qsl-cost', row('Guard switch drops the line out'));
  ok(short === c.short && short === '£25 labour · 2,000 packs lost · £80 contribution a day', `19c the row carries the short form — "${short}"`);
  const peB = await openUp('Bagger film splice by hand');
  await peB.getByLabel('Minutes a day it costs the line').fill('10'); await peB.getByLabel('Minutes a day it costs the line').blur(); await page.waitForTimeout(900);
  const cB = await said(two.b), tB = await words('.pe-cost', peB);
  ok(tB === cB.words && /at Bagger — not the bottleneck, so the line runs round it: £13 labour a day\.$/.test(tB), `19d at a machine that is not the bottleneck: labour only, said why — "${tB}"`);
  const closing = await words('.ln-close');
  ok(/cost the line £38 labour and £80 contribution a day \(2,000 packs not made\)/.test(closing), `19e the closing line carries the register's sum — "${closing.slice(-200)}"`);
  const dir = mkdtempSync(join(tmpdir(), 'problems-cost-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), peA.getByRole('button', { name: 'Report card (PDF)' }).click()]);
  const card = join(dir, 'card.pdf'); await dl.saveAs(card);
  const ct = execFileSync('pdftotext', ['-raw', card, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  ok(/20 min a day on the line: £25 labour · 2,000 packs lost · £80 contribution a day/.test(ct), '19f its card carries the sentence');
  page.locator('.pdfr-x').click().catch(() => {});
  const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), paper(page, 'Problems report')]);
  const rep = join(dir, 'problems.pdf'); await dl2.saveAs(rep);
  const txt = execFileSync('pdftotext', ['-raw', rep, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  ok(/20 min a day on the line: £25 labour · 2,000 packs lost · £80 contribution a day/.test(txt) && /not the bottleneck, so the line runs round it: £13 labour a day/.test(txt), '19g the Problems report carries both sentences');
  page.locator('.pdfr-x').click().catch(() => {});
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(700);
  const peP = await openUp('Guard switch drops the line out');
  ok(await peP.getByLabel('Minutes a day it costs the line').isVisible() && await peP.locator('.pe-cost').isVisible(), '19h on a phone the box and the sentence are in the editor');
  await page.setViewportSize({ width: 1360, height: 900 }); await page.waitForTimeout(400);
  await setLine(ws0);
}

/* ---- 20 THE REJECTS A PROBLEM CAUSES AND THE PRODUCT IT HOLDS (knowledge/specs/FC-154-problem-cost.md, part 2): two more
   numbers typed — the rejects a day (at the line's materials a pack) and the packs on hold (money tied up, not lost); the
   pack's materials named once while the line lacks it; the row, the closing line, the card and the report; the phone. ---- */
{
  const MOD = '/src/lib/problemCost.ts';
  const said = async id => page.evaluate(async ([id, MOD]) => { const db = await import('/src/db.ts'); const M = await import(MOD); const { neckOf } = await import('/src/lib/lineLoss.ts');
    const s = (await db.listAllSnags()).find(x => x.id === id); const ws = await db.getWorkspace(s.workspaceId);
    const frames = s.assetId ? await db.listSnagAssets(s.workspaceId) : []; const machine = s.assetId ? frames.find(a => a.id === s.assetId)?.name : s.targetAsset;
    return M.problemCost(s, machine, ws, neckOf(await db.listAllStandards(), s.workspaceId)); }, [id, MOD]);
  const ws0 = await page.evaluate(async id => (await import('/src/db.ts')).getWorkspace(id), sd.wsId);
  const setLine = async ws => { await page.evaluate(async ws => { const db = await import('/src/db.ts'); await db.updateWorkspace(ws); }, ws); await page.waitForTimeout(1500); };
  const { materialsPerPack: _u, ...noMat } = ws0; void _u;
  await setLine({ ...noMat, crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, packsPerMin: 100, marginPerPack: 0.04 });
  const pid = await page.evaluate(async ws => { const db = await import('/src/db.ts'); const t = Date.now();
    const a = { id: crypto.randomUUID(), workspaceId: ws, status: 'open', raisedAt: t - 3600_000, updatedAt: t, media: [], problem: 'Checkweigher rejects good packs after a film change', minutesPerDay: 20 };
    await db.addSnag(a); return a.id; }, sd.wsId);
  await go('#/snags');
  const pe = await openUp('Checkweigher rejects good packs');
  const rej = pe.getByLabel('Rejects a day because of it'), held = pe.getByLabel('Packs on hold because of it');
  await rej.fill('300'); await rej.blur(); await page.waitForTimeout(600);
  await held.fill('1200'); await held.blur(); await page.waitForTimeout(900);
  let c = await said(pid), t = await words('.pe-cost', pe);
  const rec = (await truth()).all.find(x => x.id === pid);
  ok(rec?.rejectsPerDay === 300 && rec?.heldPacks === 1200 && !!c && t === c.words && /^20 min a day on the line: £25 labour · 2,000 packs lost · £80 contribution a day; 300 rejects a day and 1,200 packs on hold — give the line a pack’s materials \(Set up the line\) to say them in money\.$/.test(t),
    `20 rejects and held packs typed and kept; the sentence is the module's, the minutes' part unchanged, the pack's materials named once — "${t}"`);
  await setLine({ ...noMat, crew: 4, labourRatePerHour: 14.5, labourBurden: 1.3, packsPerMin: 100, marginPerPack: 0.04, materialsPerPack: 0.12 });
  c = await said(pid); t = await words('.pe-cost', pe);
  ok(t === c.words && t === '20 min a day on the line: £25 labour · 2,000 packs lost · £80 contribution a day; 300 rejects a day: £36 materials; 1,200 packs on hold: £144 tied up (not lost unless they go out of life).', `20b the line given 12p a pack’s materials: the rejects in materials a day, the hold as money tied up, without a reload — "${t}"`);
  const short = await words('.qsl-cost', row('Checkweigher rejects good packs'));
  ok(short === c.short && short === '£25 labour · 2,000 packs lost · £80 contribution a day · £36 materials a day · £144 tied up', `20c the row's short form — "${short}"`);
  const closing = await words('.ln-close');
  ok(/1 says its rejects: £36 materials a day; 1 holds £144 of product/.test(closing), `20d the closing line carries the register's materials a day and product held — "${closing.slice(-220)}"`);
  const dir = mkdtempSync(join(tmpdir(), 'problems-rejects-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), pe.getByRole('button', { name: 'Report card (PDF)' }).click()]);
  const card = join(dir, 'card.pdf'); await dl.saveAs(card);
  const ct = execFileSync('pdftotext', ['-raw', card, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  ok(/300 rejects a day: £36 materials; 1,200 packs on hold: £144 tied up/.test(ct), '20e its card carries the rejects and the hold');
  page.locator('.pdfr-x').click().catch(() => {});
  const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), paper(page, 'Problems report')]);
  const rep = join(dir, 'problems.pdf'); await dl2.saveAs(rep);
  const txt = execFileSync('pdftotext', ['-raw', rep, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
  ok(/300 rejects a day: £36 materials; 1,200 packs on hold: £144 tied up/.test(txt), '20f the Problems report carries them');
  page.locator('.pdfr-x').click().catch(() => {});
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(700);
  const peP = await openUp('Checkweigher rejects good packs');
  ok(await peP.getByLabel('Rejects a day because of it').isVisible() && await peP.getByLabel('Packs on hold because of it').isVisible(), '20g on a phone the two boxes are in the editor');
  await page.setViewportSize({ width: 1360, height: 900 }); await page.waitForTimeout(400);
  await setLine(ws0);
}

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\nProblems NOT accepted: ${failed} failed` : '\nProblems accepted: the register — written, edited where it sits, assigned, its journey, marked, on paper, and a fresh start');
process.exit(failed ? 1 : 0);
