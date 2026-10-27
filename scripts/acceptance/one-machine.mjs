/* ONE RECORD OF A MACHINE, DRIVEN (docs/STAGEGATE-RESEARCH.md §5, slice 1 — Rowland, 27 October: "Do one record per
 * machine"). A machine on a line is one record, whoever named it first.
 *
 * On the seeded stage-gate project, on its line:
 *
 *   1  a machine named on the line's page with its maker is the line's own record
 *   2  the project's Install adds the same machine (in other words' case and spacing) — no second record: the
 *      project takes the line's on, its maker kept, its id the same; Install lists it once
 *   3  the line's page shows it once, saying the project
 *   4  a second record of it arriving from another device, a program and a note on it — on the next start it is put
 *      away into the one kept (mergedInto, nothing deleted), the program and the note follow, what it knew is taken
 *   5  the line's page still shows it once, its program under it
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/one-machine.mjs      (SMOKE_BASE, as smoke) */
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
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const go = async hash => { await page.goto(`${BASE}/${hash}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500); };

await go('#/room');
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const WS = sd.wsId, PID = sd.projectId;
const NAME = 'Date coder X1';
const key = s => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Every record of the machine on the line, as the device holds them. */
const records = () => page.evaluate(async ([ws, k]) => {
  const { getDB } = await import('/src/db/core.ts');
  const all = await (await getDB()).getAll('commission_assets');
  return all.filter(a => (a.workspaceId === ws) && a.name.trim().toLowerCase().replace(/\s+/g, ' ') === k);
}, [WS, key(NAME)]);
const live = rs => rs.filter(a => !a.deletedAt);

/* 1 · named on the line */
await go(`#/lines/${WS}`);
await page.getByLabel("The machine's name").fill(NAME);
await page.getByLabel('Who made the new machine').fill('Domino UK');
await page.getByRole('button', { name: 'Add the machine' }).click();
await page.waitForTimeout(900);
let rs = live(await records());
ok(rs.length === 1 && !rs[0].projectId && rs[0].oem === 'Domino UK', "1 named on the line's page with its maker — the line's own record", JSON.stringify(rs));
const lineId = rs[0]?.id;

/* 2 · the project's Install adds the same machine */
await go(`#/project/${PID}/install`);
await page.locator('.cw-add', { hasText: 'Add a machine' }).first().click();
await page.getByPlaceholder('Machine').fill('  date   CODER x1 ');
await page.getByPlaceholder('Machine').press('Enter');
await page.waitForTimeout(1200);
rs = live(await records());
ok(rs.length === 1, '2 the project adds it — still one record of it on the line', JSON.stringify(rs.map(r => [r.id, r.projectId, r.name])));
ok(rs[0]?.id === lineId && rs[0]?.projectId === PID, "2 the project took the line's record on — the same id, now the project's", JSON.stringify(rs[0]));
ok(rs[0]?.oem === 'Domino UK' && rs[0]?.name === NAME, "2 its maker and its line's name kept", JSON.stringify(rs[0]));
await go(`#/project/${PID}/install`);
const onInstall = (await page.locator('main').innerText()).split(NAME).length - 1;
ok(onInstall >= 1, '2 the project lists it', onInstall);

/* 3 · the line's page shows it once, saying the project */
await go(`#/lines/${WS}`);
const rows = page.locator('.pl-machines > li', { hasText: NAME });
ok(await rows.count() === 1, "3 the line's page shows it once", await rows.count());

/* 4 · a second record from another device, with a program and a note on it */
await page.evaluate(async ([ws, pid, name]) => {
  const { putAsset, putTestItem } = await import('/src/db/testing.ts');
  const { putProgram } = await import('/src/db/programs.ts');
  const t = Date.now();
  await putAsset({ id: 'zz-from-the-phone', projectId: '', workspaceId: ws, name, note: 'Ribbon changed weekly', state: 'running', sort: 99, updatedAt: t });
  await putProgram({ id: 'zz-prog', projectId: '', workspaceId: ws, assetId: 'zz-from-the-phone', what: 'Date code layout B', state: 'needed', sort: 999, createdAt: t, updatedAt: t });
  await putTestItem({ id: 'zz-note', projectId: pid, testId: 'asset:zz-from-the-phone', kind: 'note', what: 'Coder head cleaned', sort: t, createdAt: t, updatedAt: t });
}, [WS, PID, NAME]);
ok(live(await records()).length === 2, '4 (two records of it on the device, as another device would leave it)');
await page.reload();
await page.locator('.nv-main').waitFor({ timeout: 15000 });
await page.waitForTimeout(2500);
rs = await records();
const kept = live(rs), gone = rs.find(r => r.id === 'zz-from-the-phone');
ok(kept.length === 1 && kept[0].id === lineId, '4 on the next start, one record of it again — the one kept', JSON.stringify(kept.map(r => r.id)));
ok(!!gone && !!gone.deletedAt && gone.mergedInto === lineId, '4 the other put away into it, kept with mergedInto — nothing deleted', JSON.stringify(gone));
ok(kept[0]?.note === 'Ribbon changed weekly', '4 what it knew is taken — its note', kept[0]?.note);
const moved = await page.evaluate(async () => {
  const { getDB } = await import('/src/db/core.ts');
  const db = await getDB();
  return { prog: (await db.get('programs', 'zz-prog'))?.assetId, note: (await db.get('test_items', 'zz-note'))?.testId };
});
ok(moved.prog === lineId, '4 its program follows it', moved.prog);
ok(moved.note === `asset:${lineId}`, '4 its note follows it', moved.note);

/* 5 · the line's page */
await go(`#/lines/${WS}`);
ok(await page.locator('.pl-machines > li', { hasText: NAME }).count() === 1, "5 the line's page still shows it once");
const progs = flat(await page.locator('section[aria-label="Programs on this line"]').innerText().catch(() => ''));
ok(/Date code layout B/.test(progs), "5 its program on the line's page", progs.slice(0, 300));

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
