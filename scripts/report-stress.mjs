/* EVERY REPORT, AT EVERY SIZE, CHECKED PAGE BY PAGE.
 *
 * Rowland, 4 October: a report has to "handle large and small and still look
 * beautifully designed, regardless of how much information has been pulled
 * into it". This makes that a test rather than a hope. It builds the two jobs
 * in src/dev/reportSeeds.ts — TINY (just started) and HUGE (a long way in) —
 * plus the ordinary seed, downloads every stage-gate PDF from its real button,
 * and reads every page back with pdftotext's word boxes:
 *
 *   off the page   a word outside the page's safe margin
 *   overprinted    two words drawn over each other
 *   near-empty     a page, not the last, less than a fifth used
 *   lost           a sentence from the job that never reached the paper
 *
 * Needs a dev server on 5191 (scripts/smoke.mjs's), Chromium, and poppler's
 * pdftotext. Prints a table; exits 1 if any page fails.
 *
 *     node scripts/report-stress.mjs [outDir]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const OUT = process.argv[2] ?? '/tmp/report-stress';
mkdirSync(OUT, { recursive: true });

const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });

/** One fresh device per job, so the jobs never see each other. */
async function device() {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1366, height: 900 }, locale: 'en-GB', acceptDownloads: true });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, ['sb-testproj-auth-token', SESSION]);
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}

async function download(page, hash, file, steps = [['PDF']]) {
  await page.goto(`${BASE}/${hash}`);
  await page.waitForTimeout(3000);
  for (let i = 0; i < steps.length - 1; i++) { await page.getByRole('button', { name: steps[i][0], exact: true }).first().click(); await page.waitForTimeout(2000); }
  const [dl] = await Promise.all([
    page.waitForEvent('download', { timeout: 30000 }),
    page.getByRole('button', { name: steps.at(-1)[0], exact: true }).first().click(),
  ]);
  await dl.saveAs(file);
  return file;
}

/* ------------------------------- the checks ------------------------------- */

function pagesOf(pdf) {
  const xml = execFileSync('pdftotext', ['-bbox', pdf, '-'], { encoding: 'utf8', maxBuffer: 64 << 20, stdio: ['ignore', 'pipe', 'ignore'] });
  return [...xml.matchAll(/<page width="([\d.]+)" height="([\d.]+)">([\s\S]*?)<\/page>/g)].map(m => ({
    w: +m[1], h: +m[2],
    words: [...m[3].matchAll(/<word xMin="([\d.]+)" yMin="([\d.]+)" xMax="([\d.]+)" yMax="([\d.]+)">([^<]*)<\/word>/g)]
      .map(w => ({ x0: +w[1], y0: +w[2], x1: +w[3], y1: +w[4], t: w[5] })),
  }));
}

const textOf = pdf => execFileSync('pdftotext', [pdf, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' ');

function check(pdf, mustSay = []) {
  const pages = pagesOf(pdf);
  const faults = [];
  pages.forEach((p, i) => {
    const n = i + 1;
    const edge = 8;
    const off = p.words.filter(w => w.x0 < edge || w.y0 < edge - 4 || w.x1 > p.w - edge || w.y1 > p.h - edge + 4);
    if (off.length) faults.push(`p${n} off the page: "${off.slice(0, 3).map(w => w.t).join(' ')}"`);
    // Overprint: two words whose boxes overlap by more than half the smaller.
    const ws = p.words.filter(w => w.t.trim());
    let over = 0, example = '';
    for (let a = 0; a < ws.length; a++) for (let b = a + 1; b < ws.length; b++) {
      const A = ws[a], B = ws[b];
      const ix = Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0), iy = Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0);
      if (ix <= 0 || iy <= 0) continue;
      const small = Math.min((A.x1 - A.x0) * (A.y1 - A.y0), (B.x1 - B.x0) * (B.y1 - B.y0));
      if (ix * iy > 0.5 * small) { over++; example ||= `"${A.t}" over "${B.t}"`; }
    }
    if (over) faults.push(`p${n} overprinted ×${over}: ${example}`);
    // Near-empty: the content's height as a share of the page, ignoring the
    // header strip and the footer line every page carries.
    if (n < pages.length) {
      const body = ws.filter(w => w.y0 > 60 && w.y1 < p.h - 30);
      const used = body.length ? (Math.max(...body.map(w => w.y1)) - 60) / (p.h - 90) : 0;
      if (used < 0.2) faults.push(`p${n} near-empty (${Math.round(used * 100)}% used)`);
    }
  });
  const all = textOf(pdf);
  const lost = [...new Set(mustSay)].filter(s => !all.includes(s.replace(/\s+/g, ' ')));
  if (lost.length) faults.push(`lost ×${lost.length}: ${lost.slice(0, 3).map(s => `"${s.slice(0, 50)}"`).join(', ')}`);
  return { pages: pages.length, faults };
}

/* -------------------------------- the run --------------------------------- */

const rows = [];
for (const size of ['tiny', 'ordinary', 'huge']) {
  const { ctx, page, errors } = await device();
  const job = await page.evaluate(async size => {
    if (size === 'ordinary') {
      const sd = await (await import('/src/dev/seed.ts')).seedForSmokeTest();
      return { projectId: sd.projectId, testId: sd.testId };
    }
    return (await import('/src/dev/reportSeeds.ts')).seedReportJob(size);
  }, size);
  const fixId = job.fixId ?? await page.evaluate(async pid => (await (await import('/src/db/testing.ts')).listTests(pid)).find(t => t.kind === 'fix' && !t.deletedAt)?.id, job.projectId);
  /* WHAT MUST REACH THE PAPER, taken from the job itself: every machine's
     name, whole; and the last words of every test's "passes if" and result
     — the end of a sentence is what a cap cuts off first. */
  const must = await page.evaluate(async ({ pid, tid }) => {
    const T = await import('/src/db/testing.ts');
    const san = (await import('/src/lib/reportKit.ts')).san;
    const tests = (await T.listTests(pid)).filter(t => !t.deletedAt);
    const tail = s => (s ? san(s).split(' ').slice(-5).join(' ') : '');
    const proofs = tests.filter(t => !t.kind);
    const card = tests.find(t => t.id === tid);
    return {
      client: [...(await T.listAssets(pid)).filter(a => !a.deletedAt).map(a => san(a.name)),
        ...proofs.flatMap(t => [tail(t.passesIf), tail(t.result)]).filter(Boolean)],
      trial: card ? [san(card.title), tail(card.passesIf), tail(card.result)].filter(Boolean) : [],
    };
  }, { pid: job.projectId, tid: job.testId });
  const reports = [
    ['client', `#/project/${job.projectId}/report`, [['PDF']], must.client],
    ['test card', `#/project/${job.projectId}/testing/${job.testId}/card`, [['PDF']], must.trial],
    ...(fixId ? [['fix card', `#/project/${job.projectId}/testing/${fixId}/card`, [['PDF']]]] : []),
    ['day', `#/project/${job.projectId}/day`, [['PDF']]],
  ];
  for (const [name, hash, steps, mustSay] of reports) {
    const file = `${OUT}/${size}-${name.replace(/ /g, '-')}.pdf`;
    try {
      await download(page, hash, file, steps);
      const r = check(file, mustSay ?? []);
      rows.push({ size, report: name, pages: r.pages, faults: r.faults });
    } catch (e) {
      rows.push({ size, report: name, pages: 0, faults: [`could not make it: ${e.message.split('\n')[0]}`] });
    }
  }
  if (errors.length) rows.push({ size, report: '(console)', pages: 0, faults: errors });
  await ctx.close();
}
await browser.close();

let bad = 0;
for (const r of rows) {
  const ok = r.faults.length === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.size.padEnd(8)} ${r.report.padEnd(10)} ${String(r.pages).padStart(2)} page${r.pages === 1 ? ' ' : 's'}${ok ? '' : '\n        ' + r.faults.join('\n        ')}`);
}
writeFileSync(`${OUT}/result.json`, JSON.stringify(rows, null, 2));
console.log(`\n${rows.length - bad} of ${rows.length} reports clean — PDFs in ${OUT}`);
process.exit(bad ? 1 : 0);
