/* A PROJECT'S ACTIONS, DRIVEN — P3 (docs/PROJECTS.md). Rowland, 21 October:
 * "there isn't like a classic action tracker where it's all pulled into ...
 * who's doing what and when, why ... can we see who the owner is."
 *
 * On the seeded stage-gate project and the 6M project:
 *
 *   1  Actions on the project's rail, beside Problems, lit on its page
 *   2  every row as the records say — every thing owed, read the way Needs
 *      you reads it (lib/portfolio), and the register's problems taken for
 *      the project (lib/projectActions): the rows, the tiles (open, late),
 *      who is doing what — a group a person — and the closing line
 *   3  by when and by where; only the late, the critical and high, nobody yet
 *   4  a row opens its own record
 *   5  on paper: the list for the meeting — every person, the closing line —
 *      and one person's own
 *   6  a 6M project's actions — its board's actions among them
 *   7  the phone: nothing off the side
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/actions.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
const dir = mkdtempSync(join(tmpdir(), 'fl-actions-'));

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
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), click()]);
  const f = join(dir, `${Date.now()}.pdf`); await d.saveAs(f);
  return flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
};

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PID = sd.projectId;

/* what the records say: the owed rows Needs you is made of, and the register's for the project */
const truth = () => page.evaluate(async pid => {
  const db = await import('/src/db.ts'); const P = await import('/src/lib/portfolio.ts'); const A = await import('/src/lib/projectActions.ts'); const W = await import('/src/lib/weeks.ts');
  const today = W.todayISO();
  const project = await db.getProject(pid);
  const j = { project, tests: await db.listTests(pid), items: await db.listTestItems(pid), assets: await db.listAssets(pid), materials: await db.listMaterials(pid), programs: await db.listPrograms(pid), studies: await db.listStudies(pid) };
  const owed = [...P.criticalItems(j), ...P.riskItems(j), ...P.jobItems(j, today)];
  const name = new Map((await db.listWorkspaces()).map(w => [w.id, w.name]));
  const reg = (await db.listAllSnags()).filter(s => s.projectId === pid && !s.deletedAt).map(s => ({ ...s, line: name.get(s.workspaceId) }));
  const rows = A.projectActions(owed, reg, pid, today);
  return {
    name: project.name, n: rows.length, whats: rows.map(r => r.what), late: rows.filter(r => r.late).length,
    pri: rows.filter(r => r.priority === 'critical' || r.priority === 'high').length, nobody: rows.filter(r => !r.who).length,
    people: A.byPerson(rows).map(g => g.label), closing: A.actionsClosing(rows).text, register: rows.filter(r => r.snagId).length,
    owedLate: owed.filter(x => x.late).length,
  };
}, PID);

/* ---- 1 on the rail ---- */
await go(`#/project/${PID}`);
const t = await truth();
await page.locator('.nv-rail').getByRole('button', { name: 'Actions', exact: true }).click(); await page.waitForTimeout(2000);
ok(page.url().endsWith(`#/project/${PID}/actions`), `1 Actions from ${t.name}'s rail`, page.url());
ok(await page.locator('.nv-rail').getByRole('button', { name: 'Actions', exact: true }).getAttribute('aria-current') === 'page', '1 lit on its page');

/* ---- 2 every row as the records say ---- */
const whats = (await page.locator('.act-li .lt-what').allInnerTexts()).map(flat);
ok(t.n > 0 && whats.length === t.n && same(whats, t.whats.map(flat)), `2 every thing owed and every problem taken for the project: ${t.n} (${t.register} from the register)`, JSON.stringify(whats.slice(0, 5)));
const tile = async k => flat(await page.locator('.act-tiles .ln-tile', { has: page.locator('.ln-k', { hasText: new RegExp(`^${k}$`) }) }).locator('.ln-v').innerText());
ok(await tile('Open') === String(t.n) && await tile('Late') === String(t.late), `2 the tiles: ${t.n} open, ${t.late} late — of them ${t.owedLate} late as Needs you counts them`);
const heads = (await page.locator('.act-g .qsl-gh h2').allInnerTexts()).map(flat);
ok(JSON.stringify(heads) === JSON.stringify(t.people), `2 who is doing what — a group a person: ${heads.join(' · ')}`, JSON.stringify(t.people));
ok(flat(await page.locator('.ln-close > span:last-child').innerText()) === t.closing, `2 the closing line: "${t.closing}"`);

/* ---- 3 by when, by where, and the filters ---- */
await page.getByRole('group', { name: 'Seen by' }).getByRole('button', { name: 'When' }).click(); await page.waitForTimeout(300);
const whenHeads = (await page.locator('.act-g .qsl-gh h2').allInnerTexts()).map(flat);
ok(whenHeads.length > 0 && whenHeads.every(h => ['Late', 'Due in the next 7 days', 'Later', 'No date agreed'].includes(h)) && (await page.locator('.act-li').count()) === t.n, `3 by when: ${whenHeads.join(' · ')}`);
await page.getByRole('group', { name: 'Seen by' }).getByRole('button', { name: 'Where' }).click(); await page.waitForTimeout(300);
ok((await page.locator('.act-li').count()) === t.n, `3 by where: ${(await page.locator('.act-g .qsl-gh h2').allInnerTexts()).length} places`);
for (const [label, n] of [['Late', t.late], ['Critical and high', t.pri], ['Nobody yet', t.nobody]]) {
  await page.getByRole('group', { name: 'Which' }).getByRole('button', { name: label }).click(); await page.waitForTimeout(300);
  ok((await page.locator('.act-li').count()) === n, `3 only ${label.toLowerCase()}: ${n}`);
}
await page.getByRole('group', { name: 'Which' }).getByRole('button', { name: 'Everything' }).click();
await page.getByRole('group', { name: 'Seen by' }).getByRole('button', { name: 'Who' }).click(); await page.waitForTimeout(300);

/* ---- 4 a row opens its own record ---- */
{
  const row = page.locator('.act-li', { has: page.locator('.act-meta', { hasText: /^Fix\b|· Fix\b|Fix ·/ }) }).first();
  const target = (await row.count()) ? row : page.locator('.act-li').first();
  await target.locator('.lt-row').click(); await page.waitForTimeout(1500);
  ok(/[?&]open=/.test(page.url()) || !/\/actions$/.test(page.url()), `4 a row opens its own record (${page.url().split('#')[1]})`);
}

/* ---- 5 on paper ---- */
await go(`#/project/${PID}/actions`);
{
  const text = await pdfText(() => page.getByRole('button', { name: 'The action list on paper (PDF)' }).click());
  ok(text.includes(t.name) && /ACTIONS/.test(text) && t.people.every(p => text.includes(p)) && text.includes(t.closing.slice(0, 30)), `5 the list for the meeting: every person, the closing line`, text.slice(0, 300));
  const first = t.people.find(p => p !== 'Nobody yet');
  if (first) {
    const own = await pdfText(() => page.getByRole('button', { name: `${first}’s actions on paper (PDF)` }).click());
    ok(own.includes(first) && own.includes(t.name) && !t.people.filter(p => p !== first && p !== 'Nobody yet').some(p => own.includes(`${p} `) && own.indexOf(p) < own.indexOf('Nobody')), `5 ${first}'s own list`, own.slice(0, 200));
  }
}

/* ---- 6 a 6M project's actions ---- */
await go(`#/project/${sd.pacedProjectId}/actions`);
{
  const kinds = (await page.locator('.act-li .act-meta').allInnerTexts()).map(flat);
  ok(kinds.length > 0 && kinds.some(k => /\bAction\b/.test(k)) && (await page.locator('.ln-close').count()) === 1, `6 the 6M project's actions: ${kinds.length}, its board's actions among them`);
}

/* ---- 7 the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/project/${PID}/actions`);
ok(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth) <= 1 && (await page.locator('.act-li').count()) === t.n, '7 the phone: every row, nothing off the side');

ok(!errs.length, `no console error${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\nThe project's Actions NOT accepted: ${fail} failed` : '\nThe project\'s Actions accepted: every thing it owes, as the records say, by who, when and where, filtered; a row opening its record; on paper for the meeting and for one person; a 6M project\'s; the phone.');
process.exit(fail ? 1 : 0);
