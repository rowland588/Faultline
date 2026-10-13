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
 *      line made from the problem, and the line renamed
 *   4  its journey: a step added (a day, what we did, what came of it),
 *      shown under it, changed, taken off
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
  const jobs = (await Promise.all(projects.filter(p => !p.archivedAt).map(async p => {
    const [tests, items, assets, todos] = await Promise.all([db.listTests(p.id), db.listTestItems(p.id), db.listAssets(p.id), db.listPaceTodos(p.id)]);
    const gated = planModel(p) === 'commissioning';
    return R.jobGroup({ projectId: p.id, job: p.name, tests: gated ? tests : [], items: gated ? items : [], assets, todos: gated ? [] : todos, snags: all, lineName });
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
  ok((await words('h1')) === 'Control room problems' && /^Write any problem/.test(await words('.qsl-path')) && /Control room problems/.test(await page.locator('.nv').innerText()), '1 one page, Control room problems — named so on the page and the rail, so it is never mistaken for a line\'s or a project\'s');
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
  page.once('dialog', d => void d.accept('Line 2B — packing'));
  await row(what).locator('.pe').getByRole('button', { name: 'Rename this line' }).click(); await page.waitForTimeout(1000);
  ok((await lineCalled(s?.workspaceId)) === 'Line 2B — packing' && (await page.locator('.qsl-g .qsl-gh h2', { hasText: 'Line 2B — packing' }).count()) === 1, '3 the line renamed from the problem — the new name on the page');
  await row(what).locator('.pe').getByLabel('Which line').selectOption(wasOn); await page.waitForTimeout(800);
  ok((await snag(what))?.workspaceId === wasOn, '3 and put back on its own line');
}

/* ---- 3b taken with the Problem button for a stage-gate job: assigned, never
   moved (Rowland, 12 October: "It said it's moved to line 2A ... No idea what
   that is") — then taken off again, so the stories after count as before ---- */
{
  await page.locator('.qsl-top').getByRole('button', { name: 'Problem', exact: true }).click(); await page.waitForTimeout(800);
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
  const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), page.getByRole('button', { name: 'Problems report' }).click()]);
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
    const [dlc] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: /^Problems cards/ }).click()]);
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
  const jRep = await pdfText(() => page.locator('.pace-head-actions').getByRole('button', { name: 'Problems report' }).click(), 'project-page.pdf');
  ok(pOpen.every(r => flat(jRep.text).includes(flat(r.what.slice(0, 30)))) && pAssigned.every(s => flat(jRep.text).includes(flat(s.problem.slice(0, 30)))), `8 the project's own page: its Problems report — the same ${pOpen.length + pAssigned.length}`);
  const jCards = await pdfText(() => page.locator('.pace-head-actions').getByRole('button', { name: 'Report cards' }).click(), 'project-cards.pdf');
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
  const sec = page.locator('.cmp-sec', { hasText: 'Problems for this job — not on it yet' });
  ok((await words('h1')) === `${sd.job} — problems` && (await sec.locator('.fxl-row', { hasText: 'Coder misprints the date' }).count()) === 1, '10 the project\'s own page — named for it — lists a problem assigned to it');
  await sec.locator('.fxl-row', { hasText: 'Coder misprints the date' }).getByRole('button', { name: 'Make it a fix' }).click(); await page.waitForTimeout(1500);
  ok(/seen first on /.test(await page.locator('.fxl-row', { hasText: 'Coder misprints the date' }).first().innerText()), '10 made a fix there, saying where it was seen first');
}

/* ---- 9 a fresh start: put away, nothing deleted, brought back ---- */
await go('#/snags');
{
  const before = await truth();
  const n = before.snags.length;
  page.once('dialog', d => void d.accept());
  await page.getByRole('button', { name: 'Start fresh' }).click(); await page.waitForTimeout(2500);
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
  await page.setViewportSize({ width: 1360, height: 900 }); await go('#/'); await go('#/snags');
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
  await go('#/'); await go('#/snags');
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
  ok(!(await page.locator('.qs-fab').isVisible().catch(() => false)) && !barOpts.includes(away) && barOpts.includes('Line 2C'), '12 ticked: the bar puts it on a line in use, the camera button aside');
  await page.locator('.qsl-bar-line').selectOption({ label: 'Line 2C' }); await page.waitForTimeout(1200);
  ok((await page.locator('.qsl-bar').count()) === 0 && /Saved — 1 now on Line 2C/.test(await page.locator('body').innerText()), '12 put on a line from the bar: saved, said so, the ticks cleared');
  await row(what).locator('.qsl-open').click(); await page.waitForTimeout(600);
  await row(what).locator('.pe').getByRole('group', { name: 'Priority' }).getByRole('button', { name: 'High' }).click(); await page.waitForTimeout(800);
  ok(await row(what).locator('.pe-saved').isVisible(), '12 a box changed: "Saved" beside Save');
  await row(what).locator('.pe').getByLabel('What is the problem').fill(`${what} — saved with Save`);
  await row(what).locator('.pe-save').click(); await page.waitForTimeout(1200);
  const kept = !!(await snag(`${what} — saved with Save`)), pe = await row(`${what} — saved with Save`).locator('.pe').count(), sv = await page.locator('.preg-saved').count();
  ok(kept && pe === 0 && sv === 1, `12 Save keeps what was typed, closes it and says Saved on its row (kept ${kept}, editors open ${pe}, saved shown ${sv})`);
  await go('#/');
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
  await go('#/'); await go('#/snags');
  const forArch = (await truth()).snags.find(x => x.id === forArchId);
  if (forArch) {
    const r = row(forArch.problem);
    ok(!(await words('.qsl-meta', r)).includes(sd.job), `13 a problem for an archived project: its row never names the archived project`);
    await r.locator('.qsl-open').click(); await page.waitForTimeout(500);
    ok((await r.locator('.pe').getByLabel('Which project').evaluate(el => el.options[el.selectedIndex]?.text)) === `${sd.job} — archived project`, '13 and its project box names it — never "No project"');
    /* closed from its own editor: it stays in view, saying so */
    await r.locator('.pe').getByRole('group', { name: 'Where it stands' }).getByRole('button', { name: 'Closed' }).click(); await page.waitForTimeout(900);
    ok((await row(forArch.problem).count()) === 1 && (await snag(forArch.problem))?.status === 'closed', '13 closed from its editor on Open: it stays in view until closed up');
    await row(forArch.problem).locator('.pe-save').click(); await page.waitForTimeout(800);
  } else ok(false, '13 no open problem for the archived project to look at');
  /* a changed priority never moves the row being worked — two open problems on a line in use, the lower one worked */
  await page.evaluate(async () => {
    const db = await import('/src/db.ts'); const l = (await db.listWorkspaces()).find(x => x.name === 'Line 2C'); const t = Date.now();
    for (const [i, w] of ['Sorted first, low', 'Sorted second, low'].entries()) await db.addSnag({ id: crypto.randomUUID(), workspaceId: l.id, problem: w, status: 'open', raisedAt: t - i * 1000, updatedAt: t, media: [] });
  });
  await go('#/'); await go('#/snags');
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
  await go('#/'); await go('#/snags');
  await page.locator('.qsl-f .chip', { hasText: /^Done/ }).click(); await page.waitForTimeout(400);
  ok(/Made a fix on /.test(await row('Coder misprints the date').locator('.qsl-state').innerText().catch(() => '')), '13 made a fix on its project: under Done it says "Made a fix on …", never a bare Closed');
}

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\nProblems NOT accepted: ${failed} failed` : '\nProblems accepted: the register — written, edited where it sits, assigned, its journey, marked, on paper, and a fresh start');
process.exit(failed ? 1 : 0);
