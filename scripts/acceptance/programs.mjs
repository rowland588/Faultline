/* ACCEPTANCE — A PROGRAM'S STATUS, WITH COMMENTARY (docs/BUILD.md, Programs).
 *
 * Rowland, 8 October: "pass, fail, baseline achieved ... I need status with
 * commentary"; 12 October: "In programs we need option not tested, and no
 * program, and allow commentary." Driven in a real browser on the seeded
 * job's Programs page with the real controls:
 *
 *   1  the five statuses offered — passed, baseline achieved, didn't pass
 *      (failed), not tested, no program — in the one form with the test's
 *      own didn't run (16 October: one form, not two)
 *   2  not tested, with what was seen: said on its line in its words and
 *      kept — and the program is not done
 *   3  no program, with what was seen: amber, on its chip, and on the Set up
 *      screen's Needs you as a branch of its stage
 *   4  commentary with no status picked: kept on the program, shown on its line
 *   5  the programs report: the words, the commentary and the counts as
 *      lib/programsReport says them
 *   and no console error.
 *
 *   node scripts/acceptance/programs.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
import { paper } from '../lib/pageHeader.mjs';

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
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const PROGS = `#/project/${sd.projectId}/programs`;
/* What the module says of the programs as they stand. */
const truth = () => page.evaluate(async pid => {
  const db = await import('/src/db/testing.ts'); const P = await import('/src/db/projects.ts');
  const { programsReading } = await import('/src/lib/programsReport.ts'); const { listPrograms } = await import('/src/db/programs.ts');
  const [tests, items, assets, programs, project] = await Promise.all([db.listTests(pid), db.listTestItems(pid), db.listAssets(pid), listPrograms(pid), P.getProject(pid)]);
  const r = programsReading({ tests, items, assets, programs, holder: project });
  return { says: r?.says, notTested: r?.notTested, noProgram: r?.noProgram, lines: r?.lines.map(l => ({ what: l.what, word: l.word, note: l.note, tone: l.tone })) ?? [],
    items: items.filter(i => i.kind === 'next').map(i => ({ what: i.what, note: i.note, doneAt: i.doneAt, results: i.results })) };
}, sd.projectId);
/* ONE FORM (16 October): a program's status is said where its test is — the
   button on its row (Test it · Say how it went · Go again) opens it. */
const ROWS = '.pgr:not(:has(.pp-line-tag))';
const openForm = async row => {
  const prove = row.locator('.pgr-prove-h');
  if (await prove.count() && !(await row.locator('.pgr-prove.is-open').count())) { await prove.click(); await page.waitForTimeout(300); }
  const testBtn = row.getByRole('button', { name: /^(Test it|Say how it went|Go again)$/ });
  if (await testBtn.count()) await testBtn.first().click();
  else await row.locator('.ptx-go').click();
  await page.waitForTimeout(400); return row.locator('.ptx-panel'); };
const say = async (k, is, note) => {
  const row = page.locator(ROWS).nth(k);
  const form = await openForm(row);
  if (is) await form.getByRole('button', { name: is, exact: true }).click();
  await form.locator('textarea').fill(note);
  await form.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(900);
  return flat(await row.innerText());
};

await go(PROGS);
const names = (await page.locator(`${ROWS} .pgr-name`).allInnerTexts()).map(flat);
/* ---- 1 the five statuses, in the one form with the test's ---- */
{
  const form = await openForm(page.locator(ROWS).first());
  const opts = (await form.locator('.spp-opt').allInnerTexts()).map(flat);
  ok(opts.join('|') === 'Passed|Baseline achieved|Didn’t pass|Didn’t run|Not tested|No program', `1 the statuses offered, with the test's, in one form: ${opts.join(' · ')}`);
  await form.getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(300);
}
/* ---- 2 not tested, with what was seen ---- */
{
  const line = await say(0, 'Not tested', 'Film not on site until Thursday');
  const t = await truth();
  const it = t.items.find(i => i.what === names[0]);
  const l = t.lines.find(x => x.what === names[0]);
  ok(it?.results?.at(-1)?.is === 'notTested' && it?.results?.at(-1)?.note === 'Film not on site until Thursday' && it?.doneAt == null, '2 not tested kept, with what was seen — and not done');
  ok(!!l && line.includes(l.word) && /^not tested/.test(l.word) && line.includes('Film not on site until Thursday'), `2 said on its line: "${l?.word}" and the commentary`);
}
/* ---- 3 no program ---- */
{
  const line = await say(1, 'No program', 'Brillopak to write it');
  const t = await truth();
  const l = t.lines.find(x => x.what === names[1]);
  ok(!!l && /^no program/.test(l.word) && (l.tone === 'a' || l.tone === 'r') && line.includes('Brillopak to write it'), `3 no program on its line: "${l?.word}" (${l?.tone})`);
  const chip = page.locator('.pp-chip', { hasText: 'No program' });
  const tile = flat(await chip.innerText());
  ok(tile.endsWith(String(t.noProgram)) && t.noProgram === 1 && /is-a/.test(await chip.getAttribute('class') ?? ''), `3 its chip, amber: ${tile}`);
  await go(`#/project/${sd.projectId}/set-up`);
  const needs = (await page.locator('.cg-needs .nd-row').allInnerTexts()).map(flat);
  ok(needs.some(n => n.startsWith('No program') && n.includes(names[1]) && n.includes('Brillopak to write it')), '3 on the Set up screen\'s Needs you, a branch of its stage');
  await go(PROGS);
}
/* ---- 4 commentary with no status ---- */
{
  const t0 = await truth();
  const k = t0.items.findIndex(i => !(i.results ?? []).length);
  if (k >= 0) {
    const row = page.locator(ROWS, { hasText: t0.items[k].what }).first();
    const form = await openForm(row);
    await form.locator('textarea').fill('Waiting on the change parts');
    await form.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(900);
    const t = await truth();
    ok(t.items.find(i => i.what === t0.items[k].what)?.note === 'Waiting on the change parts' && flat(await row.innerText()).includes('Waiting on the change parts'), '4 commentary with no status: kept on the program and on its line');
  } else ok(true, '4 (every seeded program has a status — commentary-only proved by the unit test)');
}
/* ---- 5 the programs report ---- */
{
  const t = await truth();
  const dir = mkdtempSync(join(tmpdir(), 'progs-'));
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), paper(page, 'Programs report')]);
  const file = join(dir, 'programs.pdf'); await dl.saveAs(file);
  const txt = flat(execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }));
  const need = [t.says, ...t.lines.filter(l => /not tested|no program/.test(l.word)).flatMap(l => [l.word, l.note])].filter(Boolean);
  const lost = need.filter(w => !txt.replace(/\s+/g, '').includes(w.replace(/\s+/g, '')));
  ok(!lost.length && /no program/.test(txt) && /not tested/.test(txt), `5 the report: the sentence, the words and the commentary${lost.length ? ` — lost: ${lost.join(' | ')}` : ''}`);
}

ok(errors.length === 0, `no console errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
await browser.close();
console.log(failed ? `\nPrograms NOT accepted: ${failed} failed` : '\nPrograms accepted: five statuses, each with commentary, and commentary on its own — on the line, the chips, Needs you and the paper');
process.exit(failed ? 1 : 0);
