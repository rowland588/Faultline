/* ACCEPTANCE — RELEASE 2: THE ECOSYSTEM, PROVEN BY THE CAPABILITY STUDY
 * (docs/BUILD.md, "Release 2's acceptance"; docs/TOOLKIT.md, Part 0).
 *
 * Rowland, 10 October: "So you use the tool, connect it to a problem, connect
 * it to a project, connect it to a fix." The whole story, driven in a real
 * browser on the seeded job with the real controls, so what was proved when
 * it was built stays proved in every gate after:
 *
 *   1  a quick session — a new capability study, its limits agreed, thirty
 *      readings typed (the worked example: passed, not capable)
 *   2  put on a line
 *   3  attached to a job
 *   4  used for a test on the job — the test's drawer says it is proved by it
 *   5  a fix raised from it ("Make it better") — the study is its evidence
 *   6  Prove it — the same study again, on the same scope, after
 *   7  before → after on the fix — "the number moved"
 *   8  the client report's PDF, read back: the fix's before → after and the
 *      Evidence appendix
 *   and a client reads it and changes nothing.
 *
 * Every sentence is checked against the module that makes it (lib/ie/sample,
 * lib/studyLinks) on the same records. Fails on any console error.
 *
 *   node scripts/acceptance/ecosystem-capability.mjs      (SMOKE_BASE, as smoke) */
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
const OUT = mkdtempSync(join(tmpdir(), 'acceptance-'));
const THIRTY = [400.1, 402.6, 401.6, 400.8, 401.5, 401.3, 400.2, 401.9, 400.6, 400.4, 400.6, 401.2, 401.9, 400.9, 401.8,
  401.0, 401.9, 400.8, 401.9, 401.1, 401.2, 401.6, 401.3, 400.7, 401.3, 400.4, 401.1, 401.5, 401.9, 400.8];

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
const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2000); };
const words = async sel => ((await page.locator(sel).count()) ? (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim() : null);
const pdfText = f => execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const truth = id => page.evaluate(async id => {
  const { getStudy } = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
  const s = await getStudy(id);
  return s && { said: L.studySays(s), line: L.studyLine(s).text, workspaceId: s.workspaceId, projectId: s.projectId, uses: s.uses, n: (s.facts.readings ?? []).length };
}, id);
const studyId = () => decodeURIComponent(page.url().split('/capability/')[1]?.split('?')[0] ?? '');
const type30 = async vs => { for (const v of vs) { await page.keyboard.type(String(v)); await page.keyboard.press('Enter'); await page.waitForTimeout(60); } await page.waitForTimeout(600); };

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const J = `#/project/${sd.projectId}`;

/* ---- 1 · a quick session ---- */
await go('#/capability');
await page.getByRole('button', { name: 'New capability study' }).first().click(); await page.waitForTimeout(400);
await page.getByLabel('What is it of?').fill('Fill weight 400 g');
await page.getByLabel(/On which machine/).fill('Checkweigher');
await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
const before = studyId();
await page.getByLabel('Lower limit').fill('400'); await page.getByLabel('Upper limit').fill('404');
await page.getByRole('button', { name: 'Agree these' }).click(); await page.waitForTimeout(700);
await type30(THIRTY);
let t = await truth(before);
ok(t?.n === 30 && await words('.ie-say') === t.said.text && await words('.ie-cap') === t.said.capability?.text, `1 a quick session: "${await words('.ie-say')}" "${await words('.ie-cap')}"`);
ok(/a quick session, yours alone/.test(await words('.ie-place') ?? ''), '1 not filed — yours alone');

/* ---- 2 · put on a line ---- */
await page.getByRole('button', { name: 'Put on a line' }).click();
await page.getByLabel('Put it on which line').selectOption(sd.wsId); await page.waitForTimeout(700);
t = await truth(before);
ok(t?.workspaceId === sd.wsId && /^On /.test(await words('.ie-place') ?? ''), `2 on a line: "${await words('.ie-place-w')}"`);

/* ---- 3 · attached to a job ---- */
await page.getByRole('button', { name: 'Attach to a job' }).click();
await page.getByLabel('Attach it to which job').selectOption(sd.projectId); await page.waitForTimeout(900);
t = await truth(before);
ok(t?.projectId === sd.projectId && /attached to/.test(await words('.ie-place-w') ?? ''), `3 attached to the job: "${await words('.ie-place-w')}"`);

/* ---- 4 · used for a test on the job ---- */
await page.getByRole('button', { name: 'Use it for…' }).click();
const opt = await page.getByLabel('Use it for').locator('option').filter({ hasText: /^Proves: / }).first();
const optValue = await opt.getAttribute('value'); const testId = optValue.split('|')[0];
await page.getByLabel('Use it for').selectOption(optValue); await page.waitForTimeout(700);
t = await truth(before);
ok(t?.uses.some(u => u.kind === 'test' && u.ref === testId && u.role === 'proof'), '4 used for a test: the link is on the study');
await go(`${J}/testing?open=${encodeURIComponent(testId)}`);
await page.locator('.sl').filter({ hasText: 'Proved by' }).first().waitFor({ timeout: 10000 }).catch(() => {});
ok(((await words('.sl')) ?? '').includes(t.line), `4 the test's drawer: proved by it — "${(await words('.sl'))?.slice(0, 120)}"`);

/* ---- 5 · a fix raised from it ---- */
await go(`#/capability/${before}`);
await page.getByRole('button', { name: /^Make it better/ }).click(); await page.waitForTimeout(1500);
const fixId = decodeURIComponent(new URL(page.url()).hash.split('open=')[1] ?? '');
t = await truth(before);
ok(!!fixId && t?.uses.some(u => u.kind === 'fix' && u.ref === fixId && u.role === 'evidence'), '5 a fix raised: the study is its evidence');
await page.locator('.sl').filter({ hasText: 'How we know' }).first().waitFor({ timeout: 10000 }).catch(() => {});
{ const w5 = (await words('.sl')) ?? ''; ok(/How we know/i.test(w5) && w5.includes(t.line), `5 the fix's drawer: how we know — "${w5.slice(0, 160)}"${w5.includes(t.line) ? '' : ` WANT ${t.line} GOT ${w5}`}`); }

/* ---- 6 · Prove it ---- */
await page.getByRole('button', { name: /^Prove it/ }).click(); await page.waitForTimeout(1500);
const after = studyId();
ok(!!after && after !== before && !(await page.locator('.ie-agree').count()), '6 Prove it: the same study, its limits already agreed');
await type30(THIRTY.map(v => Math.round((v + 1) * 10) / 10));
const ta = await truth(after);
ok(ta?.n === 30 && ta.uses.some(u => u.kind === 'fix' && u.ref === fixId && u.role === 'proof'), `6 after: "${await words('.ie-say')}"`);

/* ---- 7 · before → after ---- */
const want = await page.evaluate(async ([pid, fid]) => {
  const { listStudies } = await import('/src/db.ts'); const L = await import('/src/lib/studyLinks.ts');
  return L.beforeAfter(await listStudies(pid), fid)?.text;
}, [sd.projectId, fixId]);
await go(`${J}/fixes?open=${encodeURIComponent(fixId)}`);
await page.locator('.sl-ba').first().waitFor({ timeout: 10000 }).catch(() => {});
ok(!!want && (await words('.sl-ba')) === `Before → after: ${want}`, `7 before → after: "${await words('.sl-ba')}"`);

/* ---- 8 · the client report's PDF ---- */
await go(`${J}/report`);
await page.getByRole('button', { name: 'Full report', exact: true }).first().click(); await page.waitForTimeout(800);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'PDF', exact: true }).first().click()]);
const pdf = join(OUT, 'client.pdf'); await dl.saveAs(pdf);
const txt = pdfText(pdf);
const san = s => s.replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/\s+/g, ' ');
const has = s => san(txt).includes(san(s).slice(0, 60));
ok(has('Evidence') && has('Capability study') && has(t.line.slice(0, 50)), '8 the client report: the Evidence appendix lists the study and what it says');
ok(has(`Before`) && has(want.slice(0, 40)), '8 the client report: the fix carries its before → after');

/* ---- a client reads it and changes nothing ---- */
await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
await go(`#/capability/${after}`);
await page.locator('.ie-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
const doors = await page.locator('.ie').getByRole('button', { name: /Make it better|Use it for|Close|Attach|Put on a line|Agree|Overrule|Prove/ }).allInnerTexts();
ok(!(await page.locator('.ie-pad').count()) && doors.length === 0 && (await page.locator('.ie-strip').count()) === 1, `a client reads the study and changes nothing${doors.length ? ` — found: ${doors.join(', ')}` : ''}`);
await page.evaluate(() => localStorage.removeItem('faultline.access.force'));

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
console.log(failed ? `\n${failed} acceptance check(s) failed` : '\nrelease 2 accepted: the whole story holds');
process.exit(failed ? 1 : 0);
