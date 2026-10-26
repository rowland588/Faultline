/* A PROGRAM'S STUDIES, AS MANY AS IT NEEDS (Rowland, 26 October: "from one program I might want to do multiple proofs and set them up ...
 * I've got a capability study lined up ready to go, but I can't then put another ... as many studies as I want, quickly get them ready,
 * go through the list, and it all falls into one program"). On a test of the seeded project:
 *   1  the test's Proved by block names a study ("60 ppm") and takes it — then offers another, named "75 ppm", lined up without leaving
 *   2  a third lined up with no name is never a second of one name; each study is a proof of the same test
 *   3  every study lined up is listed on the test (Proved by) and on its program's row under its test, each opening its study
 *   and no console error.
 *   node scripts/acceptance/program-studies.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
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
/* a proving test of a program, on the seeded project */
const t = await page.evaluate(async pid => { const db = await import('/src/db.ts'); const ts = (await db.listTests(pid)).filter(x => (x.kind ?? 'test') === 'test' && !x.deletedAt); return ts.map(x => ({ id: x.id, title: x.title, programId: x.programId })); }, sd.projectId);
const test = t.find(x => x.programId) ?? t[0];
ok(!!test, '0 a test to work on', JSON.stringify(t.slice(0, 2)));
const studiesOf = () => page.evaluate(async ([pid, tid]) => (await (await import('/src/db.ts')).listStudies(pid)).filter(s => !s.deletedAt && (s.uses ?? []).some(u => u.kind === 'test' && u.ref === tid && u.role === 'proof')).map(s => s.name), [sd.projectId, test.id]);
const before = (await studiesOf()).length;
await go(`#/project/${sd.projectId}/programs?open=${encodeURIComponent(test.id)}`);
const box = page.locator('.sl').first();
await box.waitFor({ timeout: 8000 });
await page.getByLabel('Name for the readings').fill('60 ppm');
await page.getByRole('button', { name: 'Line it up' }).click();
await page.waitForTimeout(600);
ok(JSON.stringify(await studiesOf()) === JSON.stringify([...(before ? ['x'] : []), '60 ppm'].filter(x => x !== 'x')) || (await studiesOf()).includes('60 ppm'), '1 a study named 60 ppm lined up on the test, and the page stays', (await studiesOf()).join('|'));
ok(page.url().includes('open='), '1 lining it up does not leave the test');
ok(await page.getByLabel('Name for the readings').inputValue() === '' && /next study/.test(await page.getByLabel('Name for the readings').getAttribute('placeholder')), '1 the box is clear for the next, said so');
await page.getByLabel('Name for the readings').fill('75 ppm');
await page.getByRole('button', { name: 'Line it up' }).click();
await page.waitForTimeout(500);
await page.getByRole('button', { name: 'Line it up' }).click();     /* unnamed: never the same name twice */
await page.waitForTimeout(500);
const names = await studiesOf();
ok(names.includes('60 ppm') && names.includes('75 ppm') && names.length === before + 3 && new Set(names).size === names.length, '2 as many as wanted, each its own name (an unnamed one numbered)', names.join('|'));
const listed = await page.locator('.sl .sl-row').allInnerTexts();
ok(['60 ppm', '75 ppm'].every(n => listed.some(l => l.includes(n))) && listed.length === names.length, '3 every study lined up is listed under Proved by', listed.join(' || '));
/* on the program: under its test */
await go(`#/project/${sd.projectId}/programs`);
const chips = await page.locator('.ptx-studies .chip').allInnerTexts();
ok(chips.includes('60 ppm') && chips.includes('75 ppm'), '3 the program’s row lists the studies under its test', chips.join(' | '));
await page.locator('.ptx-studies .chip', { hasText: '75 ppm' }).first().click();
await page.waitForURL(/#\/capability\//, { timeout: 8000 });
ok(true, '3 a study listed on the program opens');
ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
