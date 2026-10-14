/* ACCEPTANCE — THE COMMISSIONING REPORT AND CARDS (lib/commissioningReport,
 * lib/commissioningPdf). Rowland, 14 October: "make sure we have a fully
 * functional commissioning report and structure ... clearly then make
 * reports on the commissioning stages, where we got to, the problems ... a
 * commissioning report, commissioning cards, something that way I can
 * present in the meeting or send."
 *
 * On the seeded stage-gate job, with the real controls:
 *
 *   1  Commission's "Commissioning report" opens it, on its own chip
 *   2  its words: the gate's count as Commission's own header says it; every
 *      machine of the job with its word; why — every test whose latest
 *      attempt did not pass or did not run; doing — every open fix
 *   3  on paper: the same — the count, every machine, each test that did not
 *      pass or run, each open fix — the code to the job on its first page
 *   4  the cards: a page a machine, each naming its machine, "i OF n"
 *   5  a change moves both: the checkweigher's failed test passed on a
 *      re-test — its word, its why line and the paper move with it
 *   6  the job's Reports sheet opens it, and says Test cards are on
 *      Commission
 *   7  on a phone: the words, nothing off the side
 *   8  a client takes the paper
 *
 *   node scripts/acceptance/commissioning-report.mjs      (SMOKE_BASE, as smoke) */
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
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
/* the paper's words with every gap out, and as the PDF writes them (lib/reportKit san): → as "to", dashes as "-" */
const tight = s => (s ?? '').replace(/→/g, 'to').replace(/[–—]/g, '-').replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, '');
const OUT = mkdtempSync(join(tmpdir(), 'commissioning-'));
const pdfText = (f, p) => execFileSync('pdftotext', ['-raw', ...(p ? ['-f', String(p), '-l', String(p)] : []), f, '-'], { encoding: 'utf8' });
const pdfPages = f => Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [f], { encoding: 'utf8' }))[1]);
const has = (txt, w) => tight(txt).includes(tight(w));
/* a sheet closed just before takes its history entry off a moment later
   (ui/backCloses) — wait for it, or it undoes the goto (CLAUDE.md) */
const go = async h => {
  await page.waitForFunction(() => !(history.state && history.state.flPanel), null, { timeout: 5000 }).catch(() => {});
  await page.goto(`${BASE}/${h}`); await page.waitForTimeout(2500);
};
const main = page.locator('.nv-main');
const download = async (name, file) => {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name, exact: typeof name === 'string' }).first().click({ timeout: 60000 })]);
  const f = join(OUT, file); await dl.saveAs(f); return f;
};

await page.goto(`${BASE}/#/`); await page.waitForTimeout(3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const COMMISSION = `#/project/${sd.projectId}/testing`;
/* the job's records, as the screens read them */
const facts = () => page.evaluate(async pid => {
  const db = await import('/src/db.ts'); const T = await import('/src/lib/testing.ts');
  const assets = (await db.listAssets(pid)).filter(a => !a.deletedAt).sort((a, b) => a.sort - b.sort);
  const tests = (await db.listTests(pid)).filter(t => !t.deletedAt);
  const latest = T.latestAttempts(tests.filter(t => (t.kind ?? 'test') === 'test'));
  const name = id => assets.find(a => a.id === id)?.name;
  return {
    machines: assets.map(a => a.name),
    wrong: latest.filter(t => t.outcome === 'failed' || t.outcome === 'notRun').map(t => ({ id: t.id, title: t.title, machine: name(t.assetId) })),
    fixes: tests.filter(t => t.kind === 'fix' && t.outcome !== 'passed').map(t => t.title),
  };
}, sd.projectId);

/* ---- 1 Commission's door ---- */
let header;
{
  await go(COMMISSION);
  header = flat(await main.locator('.cw-handover').innerText());
  await main.getByRole('button', { name: /^Commissioning report/ }).click(); await page.waitForTimeout(3500);
  const pressed = flat(await page.locator('.cr-which .chip.on').innerText());
  ok(page.url().includes('/report?doc=commissioning') && pressed === 'Commissioning' && flat(await page.locator('.pace-title').innerText()) === 'Commissioning report',
    `1 Commission's "Commissioning report" opens it on its own chip (${pressed})`);
}

/* ---- 2 its words ---- */
let f = await facts();
{
  const toc = flat(await page.locator('.cm-toc').innerText());
  /* "3 of 8 passed 1 didn't pass 1 didn't run Handover …" on Commission; "3 of 8 passed · 1 didn’t pass · 1 didn’t run" here */
  const says = flat(await page.locator('.cm-toc > li').first().locator('span').first().innerText()).replace(/^Commission: /, '');
  ok(says.split(' · ').every(p => header.includes(p)), `2 the gate's count as Commission's header says it: ${says}`);
  const words = await page.locator('.cm-toc .cm-m').evaluateAll(els => els.map(e => [e.querySelector('b')?.textContent, e.querySelector('.cm-word')?.textContent]));
  ok(JSON.stringify(words.map(w => w[0])) === JSON.stringify(f.machines) && words.every(w => !!w[1]), `2b every machine with its word: ${words.map(w => w.join(' — ')).join(' · ')}`);
  ok(f.wrong.length > 0 && f.wrong.every(w => toc.includes(`${w.machine ?? 'The line'}: ${w.title}`)), `2c why: every test that did not pass or run (${f.wrong.map(w => w.title).join(', ')})`);
  ok(f.fixes.length > 0 && f.fixes.every(x => toc.includes(`Fix: ${x}`)), `2d doing: every open fix (${f.fixes.length})`);
}

/* ---- 3 on paper ---- */
{
  const file = await download('PDF', 'report.pdf');
  const txt = pdfText(file);
  ok(has(txt, 'COMMISSIONING') && has(txt, 'Line 2 commissioning') && has(txt, 'Scan for it now') && f.machines.every(m => has(txt, m)),
    `3 on paper: titled, the code to the job, every machine (${pdfPages(file)} pages)`);
  const missing = [...f.wrong.map(w => `${w.machine}: ${w.title}`), ...f.fixes.map(x => `Fix: ${x}`)].filter(w => !has(txt, w));
  ok(has(txt, 'WHY WE ARE NOT WHERE WE SHOULD BE') && !missing.length, `3b why and doing on paper, as on the screen${missing.length ? ` — not on it: ${missing.join(' | ')}` : ''}`);
}

/* ---- 4 the cards ---- */
{
  const file = await download(/^Commissioning cards/, 'cards.pdf');
  const n = pdfPages(file);
  const per = Array.from({ length: n }, (_, i) => pdfText(file, i + 1));
  const starts = f.machines.map((m, i) => per.findIndex(p => has(p, `COMMISSIONING CARD`) && has(p, `${i + 1} OF ${f.machines.length}`) && has(p, m)));
  ok(n >= f.machines.length && starts.every((s, i) => s >= 0 && (i === 0 || s > starts[i - 1])), `4 the cards: a page a machine, each naming it, in order (${n} pages · ${starts.map(s => s + 1).join(', ')})`);
}

/* ---- 5 a change moves both ---- */
{
  const wrong = f.wrong.find(w => w.machine === 'Ishida checkweigher') ?? f.wrong[0];
  await page.evaluate(async ([pid, t]) => {
    const db = await import('/src/db.ts');
    const today = (await import('/src/lib/weeks.ts')).todayISO();
    await db.putTest({ id: crypto.randomUUID(), projectId: pid, kind: 'test', title: `${t.title} — re-test`, assetId: (await db.listTests(pid)).find(x => x.id === t.id)?.assetId,
      fromTestId: t.id, outcome: 'passed', ranOn: today, sort: 999, createdAt: Date.now(), updatedAt: Date.now() });
  }, [sd.projectId, wrong]);
  await go(`#/project/${sd.projectId}/report?doc=commissioning`);
  const toc = flat(await page.locator('.cm-toc').innerText());
  const word = await page.locator('.cm-toc .cm-m', { hasText: wrong.machine }).locator('.cm-word').innerText();
  ok(!toc.includes(`${wrong.machine}: ${wrong.title} —`), `5 ${wrong.title} passed on its re-test: gone from why (${wrong.machine} now "${word}")`);
  const txt = pdfText(await download('PDF', 'report-after.pdf'));
  ok(!has(txt, `${wrong.machine}: ${wrong.title} —`) && has(txt, `${wrong.title} — re-test`), '5b and on paper: its re-test passed, its why line gone');
}

/* ---- 6 the Reports sheet ---- */
{
  await go(`#/project/${sd.projectId}`);
  await page.getByRole('button', { name: /^Reports/ }).first().click(); await page.waitForTimeout(700);
  const dlg = page.getByRole('dialog');
  const doors = (await dlg.locator('.meet-report b').allInnerTexts()).map(flat);
  ok(doors.includes('Commissioning report') && doors.includes('Test cards'), `6 the Reports sheet: ${doors.filter(d => /Commissioning|Test cards/.test(d)).join(' · ')}`);
  await dlg.locator('.meet-report', { hasText: 'Commissioning report' }).click(); await page.waitForTimeout(3000);
  ok(page.url().includes('/report?doc=commissioning'), '6b and opens it');
}

/* ---- 7 the phone ---- */
{
  await page.setViewportSize({ width: 390, height: 844 });
  await go(`#/project/${sd.projectId}/report?doc=commissioning`);
  const wide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(await page.locator('.cm-toc').isVisible() && wide <= 1, `7 on a phone: the words, nothing off the side (${wide}px)`);
  await page.setViewportSize({ width: 1360, height: 900 });
}

/* ---- 8 a client takes the paper ---- */
{
  await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
  await go(`#/project/${sd.projectId}/report?doc=commissioning`);
  const file = await download(/^Commissioning cards/, 'client-cards.pdf');
  ok(pdfPages(file) >= f.machines.length, '8 a client takes the cards too');
  await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
}

ok(errors.length === 0, errors.length ? `no console errors — ${errors.join(' | ')}` : 'no console errors');
await browser.close();
if (failed) { console.log(`\n${failed} acceptance check(s) failed`); process.exit(1); }
console.log('\nCommissioning report accepted: from Commission and the Reports sheet, the gate machine by machine, why and what we are doing, on paper and as a card a machine, moving when a test passes, on a phone and for a client');
