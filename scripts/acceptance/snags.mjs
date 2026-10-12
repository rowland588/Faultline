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
 *   3  assigned, not moved: its line, its machine (the jobs' machines offered,
 *      another typed), its job — it stays here, and shows on the job too
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
  const snags = all.filter(s => !s.archivedAt);
  const frames = new Map((await Promise.all([...new Set(snags.filter(s => s.assetId).map(s => s.workspaceId))].map(id => db.listSnagAssets(id)))).flat().map(a => [a.id, a]));
  const lineName = id => ws.find(w => w.id === id)?.name ?? 'A line';
  const r = R.snagsReading({ snags, lineName, jobName: id => projects.find(p => p.id === id)?.name, became: new Map(), register: true,
    assetName: s => (s.assetId ? frames.get(s.assetId)?.name : undefined), stillOf: s => (s.assetId ? frames.get(s.assetId)?.stillKey : undefined) });
  return { says: r.says, counts: r.counts, rows: r.lines.flatMap(l => l.rows), snags, all };
});
const openUp = async what => { if ((await row(what).locator('.pe').count()) === 0) { await row(what).locator('.qsl-open').click(); await page.waitForTimeout(500); } return row(what).locator('.pe'); };
const snag = async what => (await truth()).all.find(s => s.problem === what || s.id === sd.ids[what]);
const openCount = c => c.critical + c.high + c.low;

/* ---- 1 one page, Problems ---- */
await go('#/snags');
{
  const t = await truth();
  ok((await words('h1')) === 'Problems' && /^Write any problem/.test(await words('.qsl-path')), '1 one page, Problems, said once');
  ok((await words('.qsl-says')) === t.says, `1 the sentence is the module's: ${t.says}`);
  const chips = (await page.locator('.qsl-f .chip').allInnerTexts()).map(x => x.replace(/\s+/g, ' ').trim());
  ok(chips.join('|') === `Open · ${openCount(t.counts)}|Critical · ${t.counts.critical}|High · ${t.counts.high}|Low · ${t.counts.low}|Late · ${t.counts.late}|Done · ${t.counts.closed}`, `1 the counts: ${chips.join(' · ')}`);
  const open = t.rows.filter(r => r.status !== 'closed');
  ok((await page.locator('.qsl-work').count()) === open.length && open.length === 6, `1 every open problem on its line: ${open.length}`);
  ok(/^low$/i.test(await words('.qsl-prio', row('seeded snag 0'))) && (await page.locator('.qsl-kind').count()) === 0 && (await page.locator('.qsl-job').count()) === 0, '1 each with its priority (Low until said); no snag or fix tag, nothing "moved"');
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
  await row(what).locator('.pe').getByLabel('Which job').selectOption({ label: sd.job }); await page.waitForTimeout(700);
  s = await snag(what);
  ok(s?.projectId === sd.projectId && !(s?.sent ?? []).length && (await row(what).count()) === 1 && (await words('.qsl-meta', row(what))).includes(`for ${sd.job}`), `3 assigned to ${sd.job}: it stays here, saying so — never moved away`);
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
  await page.locator('.qsl-bar').getByRole('button', { name: 'Clear' }).click();
  await crit.click(); await page.waitForTimeout(400);
  const shown = (await page.locator('.qsl-work .qsl-prio').allInnerTexts()).map(x => x.trim().toLowerCase());
  ok(shown.length === t.counts.critical && shown.every(k => k === 'critical'), `6 Critical shows the critical only: ${shown.length}`);
  await page.locator('.qsl-f .chip', { hasText: 'Late' }).click(); await page.waitForTimeout(400);
  ok((await page.locator('.qsl-work').count()) === t.rows.filter(r => r.late).length, `6 Late shows the late only: ${t.rows.filter(r => r.late).length}`);
  await page.locator('.qsl-f .chip', { hasText: /^Open/ }).click(); await page.getByRole('button', { name: 'By who' }).click(); await page.waitForTimeout(400);
  const heads = await page.locator('.qsl-g .qsl-gh h2').allInnerTexts();
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
  const all = await page.evaluate(async ws => { const { san } = await import('/src/lib/reportKit.ts'); await (await import('/src/lib/savePdf.ts')).loadPdfLib(); return ws.map(w => san(w)); }, t.rows.filter(r => r.status !== 'closed').map(r => r.what));
  const flatTxt = txt.replace(/\s+/g, '');
  const lost = all.filter(w => !flatTxt.includes(w.replace(/\s+/g, '')));
  ok(/PROBLEMS/.test(txt) && !lost.length && /CRITICAL ·/.test(txt) && /Fitted the interlocked guard — No trips since/.test(txt) && /Plan: Fit an interlocked guard/.test(txt) && !/Demo fault/.test(txt), `8 the Problems report: every open problem (${all.length}), its plan and its journey${lost.length ? ` — lost: ${lost.slice(0, 4).join(', ')}` : ''}`);
}

/* ---- 10 the job's own view (before the fresh start puts them away) ---- */
{
  await page.evaluate(async ({ ws, pid }) => {
    const db = await import('/src/db.ts');
    await db.addSnag({ id: crypto.randomUUID(), workspaceId: ws, status: 'open', raisedAt: Date.now(), updatedAt: Date.now(), media: [], problem: 'Coder misprints the date', projectId: pid });
  }, { ws: sd.wsId, pid: sd.projectId });
  await go(`#/project/${sd.projectId}/fixes`);
  const sec = page.locator('.cmp-sec', { hasText: 'Problems for this job — not on it yet' });
  ok((await words('h1')) === 'Problems' && (await sec.locator('.fxl-row', { hasText: 'Coder misprints the date' }).count()) === 1, '10 the job\'s own view lists a problem assigned to it');
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
}

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\nProblems NOT accepted: ${failed} failed` : '\nProblems accepted: the register — written, edited where it sits, assigned, its journey, marked, on paper, and a fresh start');
process.exit(failed ? 1 : 0);
