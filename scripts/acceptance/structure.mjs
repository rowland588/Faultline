/* THE STRUCTURE, ACCEPTED (docs/STRUCTURE.md §18) — slice by slice, each adding what it promised.
 *
 * B0 — what a person may be offered: inside a project, the Problem button (the top bar at a desk,
 * the round one on a phone) only for somebody who may change the project's work; a client — who
 * may read it and take its reports — is offered none, because a client's rows are never sent to
 * the cloud (src/cloud/sync.ts) and a problem saved by one stayed on that device alone, silently
 * (found 22 October). Off a project the button is there as before. And the problem sheet, opened
 * from a row, says so and holds Save when the project it is for is one the person may only read.
 *
 * The access level is forced the way the app allows in development (cloud/access:
 * localStorage['faultline.access.force']), so the same seeds are walked as a team member and as
 * a client.
 *
 *     node scripts/acceptance/structure.mjs        a dev server on 5191 (SMOKE_BASE) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [];

/** A device at a width, as a team member or a client; the seeds made once on its first page. */
async function device(width, access) {
  const ctx = await b.newContext({ viewport: { width, height: width < 900 ? 844 : 900 }, hasTouch: width < 900, serviceWorkers: 'block' });
  await ctx.addInitScript(([k, s, a]) => {
    try { localStorage.setItem(k, JSON.stringify(s)); if (a) localStorage.setItem('faultline.access.force', a); } catch { /* fine */ }
  }, [`sb-${REF}-auth-token`, SESSION, access]);
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1600); };
  await go('#/room');
  const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  return { ctx, page, go, sd };
}
const topProblem = page => page.locator('.nv-top .qs-top');
const fab = page => page.locator('.qs-fab');
const shown = async l => (await l.count()) > 0 && await l.first().isVisible();

/* ---- B0 · 1 a team member: offered a problem everywhere ---- */
{
  const { ctx, page, go, sd } = await device(1360, 'team');
  await go(`#/project/${sd.projectId}`);
  ok(await shown(topProblem(page)), 'B0 1 a team member inside a project: Problem in the top bar');
  await go('#/room');
  ok(await shown(topProblem(page)), 'B0 1 a team member on the control room: Problem in the top bar');
  await ctx.close();
}
{
  const { ctx, page, go, sd } = await device(390, 'team');
  await go(`#/project/${sd.projectId}`);
  ok(await shown(fab(page)), 'B0 1 a team member on a phone, inside a project: the round Problem button');
  await ctx.close();
}

/* ---- B0 · 2 a client: offered none inside a project they may only read ---- */
{
  const { ctx, page, go, sd } = await device(1360, 'client');
  for (const [where, hash] of [['its front page', `#/project/${sd.projectId}`], ['its Actions', `#/project/${sd.projectId}/actions`], ['a 6M project', `#/project/${sd.pacedProjectId}`]]) {
    await go(hash);
    ok(!(await shown(topProblem(page))) && !(await shown(fab(page))), `B0 2 a client on ${where}: no Problem offered`);
  }
  await go('#/room');
  ok(await shown(topProblem(page)), 'B0 2 a client off a project (the control room): Problem offered as before — the database decides');
  /* the sheet, opened from the top bar off a project, with the client's project chosen: said, and Save held */
  await topProblem(page).click(); await page.waitForTimeout(800);
  const sheet = page.locator('.sheet, [role=dialog]').filter({ has: page.getByLabel('Which project') }).first();
  await sheet.getByLabel('Which project').selectOption(sd.projectId); await page.waitForTimeout(400);
  const words = sheet.locator('textarea, input[type=text]').first();
  if (await words.count()) await words.fill('A guard is loose');
  const said = flat(await sheet.locator('.qs-ro').innerText().catch(() => ''));
  const save = sheet.getByRole('button', { name: /^Save$/ });
  ok(/^You can read .+; its problems are taken by its team\.$/.test(said) && await save.isDisabled(), `B0 2 the sheet with the client's project chosen: "${said}", Save held`);
  await sheet.getByLabel('Which project').selectOption(''); await page.waitForTimeout(300);
  ok(!(await sheet.locator('.qs-ro').count()), 'B0 2 no project chosen: nothing said, Save as before');
  await ctx.close();
}
{
  const { ctx, page, go, sd } = await device(390, 'client');
  await go(`#/project/${sd.projectId}`);
  ok(!(await shown(fab(page))), 'B0 2 a client on a phone, inside a project: no round Problem button');
  await ctx.close();
}

ok(!errs.length, `no console error${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\nThe structure NOT accepted: ${fail} failed` : '\nThe structure accepted (B0): a problem offered only to somebody who may change the project\'s work; a client offered none inside it, told so on the sheet, and offered it off a project as before.');
process.exit(fail ? 1 : 0);
