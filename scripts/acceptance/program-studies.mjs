/* A PROGRAM'S STUDIES, AS MANY AS IT NEEDS (Rowland, 26 October: "from one program I might want to do multiple proofs and set them up ...
 * I've got a capability study lined up ready to go, but I can't then put another ... as many studies as I want, quickly get them ready,
 * go through the list, and it all falls into one program"). On a test of the seeded project:
 *   1  the test's Proved by block names a study ("60 ppm") and takes it — then offers another, named "75 ppm", lined up without leaving
 *   2  a third lined up with no name is never a second of one name; each study is a proof of the same test
 *   3  every study lined up is listed on the test (Proved by) and on its program's row under its test, each opening its study
 *   and no console error.
 *   node scripts/acceptance/program-studies.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { paper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const dir = mkdtempSync(join(tmpdir(), 'fl-pstudies-'));
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, acceptDownloads: true });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const openProve = async () => { await page.locator('.pp-chip', { hasText: /^All/ }).first().click().catch(() => {}); await page.waitForTimeout(300); for (const h of await page.locator('.pgr-prove-h[aria-expanded=false]').all()) await h.click().catch(() => {}); await page.waitForTimeout(300); }; /* the page opens on what needs you, and a row's Prove fold is closed until opened (28 October) */
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
await go(`#/project/${sd.projectId}/programs`); await openProve();
const chips = await page.locator('.ptx-studies .chip').allInnerTexts();
ok(chips.includes('60 ppm') && chips.includes('75 ppm'), '3 the program’s row lists the studies under its test', chips.join(' | '));
await page.locator('.ptx-studies .chip', { hasText: '75 ppm' }).first().click();
await page.waitForURL(/#\/capability\//, { timeout: 8000 });
ok(true, '3 a study listed on the program opens');
/* 4  the tool is the person's to pick: a control chart lined up beside the capability studies, named for what it is */
await go(`#/project/${sd.projectId}/programs?open=${encodeURIComponent(test.id)}`);
await page.locator('.sl').first().waitFor({ timeout: 8000 });
const kinds = await page.getByLabel('Which tool proves it').locator('option').allInnerTexts();
ok(['Capability study', 'Control chart', 'Analysis', 'Reliability study'].every(k => kinds.includes(k)), '4 the tool to line up is offered: capability, control chart, analysis, reliability', kinds.join('|'));
await page.getByLabel('Which tool proves it').selectOption({ label: 'Control chart' });
await page.getByLabel('Name for the readings').fill('Run chart 60');
await page.getByRole('button', { name: 'Line it up' }).click();
await page.waitForTimeout(600);
const tools = await page.evaluate(async ([pid, tid]) => (await (await import('/src/db.ts')).listStudies(pid)).filter(s => !s.deletedAt && (s.uses ?? []).some(u => u.kind === 'test' && u.ref === tid && u.role === 'proof')).map(s => `${s.tool}:${s.name}`), [sd.projectId, test.id]);
ok(tools.includes('chart:Run chart 60') && tools.includes('capability:60 ppm'), '4 the study made is a control chart, the others stay capability studies', tools.join('|'));
await go(`#/project/${sd.projectId}/programs`); await openProve();
const chips2 = await page.locator('.ptx-studies .chip').allInnerTexts();
ok(chips2.includes('Control chart: Run chart 60') && chips2.includes('60 ppm'), '4 the program’s row names the tool of a study that is not a capability study', chips2.join(' | '));
/* 5  the Programs report: every test of the program, and each study lined up for it, as the row says them */
const row = await page.evaluate(async ([pid, tid]) => {
  const db = await import('/src/db.ts'); const j = await import('/src/lib/programJourney.ts');
  const tests = await db.listTests(pid); const progs = await db.listPrograms(pid); const t = tests.find(x => x.id === tid);
  const p = progs.find(x => x.id === t.programId);
  return j.programJourney(p, tests, new Date().toISOString().slice(0, 10)).attempts.map(a => a.text);
}, [sd.projectId, test.id]);
const flat = x => x.replace(/\s+/g, ' ');
const pdf = flat(await (async () => {
  const [d] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), paper(page, 'Programs report')]);
  const f = join(dir, `${Date.now()}.pdf`); await d.saveAs(f);
  return execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' });
})());
ok(row.length > 0 && row.every(x => pdf.includes(flat(x).slice(0, 40))), '5 the report prints every test of the program (aim, what was done, how it went)', row.join(' || ').slice(0, 300));
ok(/Study: capability study “60 ppm”/.test(pdf) && /Study: capability study “75 ppm”/.test(pdf) && /Study: control chart “Run chart 60”/.test(pdf), '5 the report prints each study lined up under its test, named for its tool', pdf.slice(0, 200));
ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
