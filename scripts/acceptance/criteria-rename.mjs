/* A program's criteria, renamed where they are listed; and a proving study on a live line opening on the line.
 * (docs/PROJECTS.md; Rowland, 30 October: "Name it — what it judges ... I can't change it, need ability to change it"
 * and "opening a test I have done takes me to the old UI ... an archived section — I just want the test".)
 *
 *   1  a criterion study named when the program's criteria were picked — its row says its name and a Rename
 *   2  Rename: the name in a box, changed and saved — the row, and the study itself, say the new name; Escape leaves it
 *   3  a blank name cannot be saved
 *   4  the same study opened while its project is live wears the project's frame
 *   5  …and with that project ARCHIVED, on a line, it wears the LINE's frame — the line's tabs, not the project's
 *   6  a study of an archived project that sits on no line keeps the project's frame (the archive still browses)
 *
 *   node scripts/acceptance/criteria-rename.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i;
let fail = 0;
const ok = (c, m, d) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && d ? ` — ${String(d).slice(0, 400)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(`console: ${m.text().slice(0, 160)}`); });
const go = async h => {
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 5000 }).catch(() => {});
  await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2500);
};

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PID = sd.projectId, NAME = 'PR-07 Baking Potatoes 2 kg';
const made = await page.evaluate(async ([pid, name]) => {
  const db = await import('/src/db.ts'); const pc = await import('/src/lib/programCriteria.ts');
  const p = (await db.listPrograms(pid)).find(x => x.what === name);
  const s = pc.criterionStudy(p, 'capability', 'Placement weight at 75 ppm', { id: crypto.randomUUID(), at: Date.now() });
  const line = (await db.listWorkspaces()).find(w => !w.deletedAt && !w.archivedAt);
  await db.putStudy({ ...s, workspaceId: line?.id });
  await db.putProgram(pc.withCriterion(p, { kind: 'study', id: s.id }));
  return { sid: s.id, line: line?.name };
}, [PID, NAME]);

const row = () => page.locator('li.pgr', { has: page.locator('.pgr-name', { hasText: NAME }) }).first();
const crit = () => row().locator('.pgc-row').first();
const studyName = () => page.evaluate(async id => (await (await import('/src/db.ts')).getStudy(id))?.name, made.sid);

const openCriteria = async () => { const b = row().locator('.pgc-all'); if (await b.count()) { await b.click(); await page.waitForTimeout(500); } };
await go(`#/project/${PID}/programs`);
await openCriteria();
ok((await crit().locator('.pgc-t').innerText().catch(() => '')).endsWith('— Placement weight at 75 ppm') && (await crit().getByRole('button', { name: /^Rename/ }).count()) === 1,
  '1 the criterion study is listed under its name, with a Rename');

/* 2 */
await crit().getByRole('button', { name: /^Rename/ }).click(); await page.waitForTimeout(300);
const box = crit().locator('input[aria-label^="Rename the study"]');
ok((await box.inputValue()) === 'Placement weight at 75 ppm', '2 Rename opens the name in a box');
await box.press('Escape'); await page.waitForTimeout(300);
ok((await box.count()) === 0 && (await studyName()) === 'Placement weight at 75 ppm', '2 Escape leaves it as it was');
await crit().getByRole('button', { name: /^Rename/ }).click(); await page.waitForTimeout(200);
await crit().locator('input[aria-label^="Rename the study"]').fill('Pick and place weight, 75 ppm for 60 min');
await crit().getByRole('button', { name: 'Save name' }).click(); await page.waitForTimeout(1500);
ok((await crit().locator('.pgc-t').innerText().catch(() => '')).endsWith('— Pick and place weight, 75 ppm for 60 min') && (await studyName()) === 'Pick and place weight, 75 ppm for 60 min',
  '2 saved: the row and the study itself say the new name');
await page.reload(); await page.waitForTimeout(2500); await openCriteria();
ok((await crit().locator('.pgc-t').innerText().catch(() => '')).endsWith('— Pick and place weight, 75 ppm for 60 min'), '2 and after a reload');

/* 3 */
await crit().getByRole('button', { name: /^Rename/ }).click(); await page.waitForTimeout(200);
await crit().locator('input[aria-label^="Rename the study"]').fill('   ');
ok(await crit().getByRole('button', { name: 'Save name' }).isDisabled(), '3 a blank name cannot be saved');
await crit().getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(200);

/* 4 */
const tabs = async () => flat(await page.locator('.nv-tabs').innerText().catch(() => ''));
await go(`#/capability/${made.sid}`);
ok(/Timeline/.test(await tabs()) && /Gates|Machines/.test(await tabs()), '4 while its project is live the study wears the project’s tabs', await tabs());

/* 5 */
await page.evaluate(async pid => { await (await import('/src/db.ts')).archiveProject(pid); }, PID);
await go(`#/capability/${made.sid}`);
const t5 = await tabs(), ctx5 = flat(await page.locator('.nv-top .nv-ctx').innerText().catch(() => ''));
ok(/Overview/.test(t5) && !/Timeline|Gates/.test(t5) && new RegExp(made.line ?? 'Line').test(ctx5), `5 its project archived and on ${made.line}: the line’s frame — ${ctx5} | ${t5}`);

/* 6 */
await page.evaluate(async sid => { const db = await import('/src/db.ts'); const s = await db.getStudy(sid); await db.putStudy({ ...s, workspaceId: undefined, updatedAt: Date.now() }); }, made.sid);
await go(`#/capability/${made.sid}`);
ok(/Timeline|Gates|Machines/.test(await tabs()) && !/Overview/.test(await tabs()), '6 with no line it keeps the archived project’s frame, as the archive always did', await tabs());

ok(!errs.length, `no console error${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\nCriteria rename NOT accepted: ${fail} failed` : '\nCriteria rename accepted: a criterion study renamed where it is listed; a study on a live line opens on the line even when its project is archived.');
process.exit(fail ? 1 : 0);
