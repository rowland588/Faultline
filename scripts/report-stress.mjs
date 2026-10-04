/* EVERY REPORT, AT EVERY SIZE, CHECKED PAGE BY PAGE.
 *
 * Rowland, 4 October: a report has to "handle large and small and still look
 * beautifully designed, regardless of how much information has been pulled
 * into it". This makes that a test rather than a hope. It builds the two jobs
 * in src/dev/reportSeeds.ts — TINY (just started) and HUGE (a long way in) —
 * plus the ordinary seed, downloads every stage-gate PDF from its real button
 * (and the 6M client report from a 6M job at both edges, seedSixMJob),
 * and reads every page back with pdftotext's word boxes:
 *
 *   off the page   a word outside the page's safe margin
 *   overprinted    two words drawn over each other
 *   near-empty     a page, not the last, less than a fifth used
 *   lost           a fact the app's own models hold that never reached the paper
 *
 * --fuzz N makes N random jobs instead (seedRandomJob: any size, awkward names
 * and symbols — and a random 6M job for each, seedRandomSixMJob); --seeds 5,17
 * re-runs chosen ones. docs/REPORTS.md §4.
 *
 * Needs a dev server on 5191 (scripts/smoke.mjs's), Chromium, and poppler's
 * pdftotext. Prints a table; exits 1 if any page fails.
 *
 *     node scripts/report-stress.mjs [outDir] [--fuzz N | --seeds a,b]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '/tmp/report-stress';
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

/* In the order it was DRAWN (-raw), not the order the eye reads a page: two
   columns side by side read across, so a test's title came back with the
   machine beside it spliced into the middle — a "lost" that was the reader's. */
const textOf = pdf => execFileSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' ');

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
  // Spacing ignored: a long word broken across lines, or a line break, is still the same words.
  const flat = all.replace(/\s+/g, '');
  /* Twice over: what san() hands the PDF must be there character for
     character, AND san() must have dropped no letter or digit of what was
     TYPED (they must all still be there, in order — it may add "to" for an
     arrow, never lose an "Ł"). The second caught the font dropping Ł from
     "Łukasz": it dropped it from both sides of the first compare, so that
     one could not see it. */
  const letters = x => [...x.normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '')];
  const kept = (typed, sent) => { const have = letters(sent); let k = 0; for (const c of letters(typed)) { while (k < have.length && have[k] !== c) k++; if (k++ >= have.length) return false; } return true; };
  const lost = [...new Set(mustSay)].filter(([typed, sent]) => !flat.includes(sent.replace(/\s+/g, '')) || !kept(typed, sent)).map(([typed, , where]) => `${where}: ${typed}`);
  if (lost.length) faults.push(`lost ×${lost.length}:\n          ${lost.slice(0, 8).map(s => s.slice(0, 90)).join('\n          ')}`);
  return { pages: pages.length, faults, said: new Set(mustSay.map(m => m[0])).size };
}

/* -------------------------------- the run --------------------------------- */

const rows = [];
const fuzzAt = process.argv.indexOf('--fuzz'), seedsAt = process.argv.indexOf('--seeds');
const SIZES = seedsAt > 0 ? process.argv[seedsAt + 1].split(',').map(n => `random-${n}`)
  : fuzzAt > 0 ? Array.from({ length: Number(process.argv[fuzzAt + 1] ?? 10) }, (_, i) => `random-${i + 1}`)
  : ['tiny', 'ordinary', 'huge'];
for (const size of SIZES) {
  const { ctx, page, errors } = await device();
  const job = await page.evaluate(async size => {
    if (size === 'ordinary') {
      const sd = await (await import('/src/dev/seed.ts')).seedForSmokeTest();
      return { projectId: sd.projectId, testId: sd.testId };
    }
    const seeds = await import('/src/dev/reportSeeds.ts');
    if (size.startsWith('random-')) return seeds.seedRandomJob(Number(size.slice(7)));
    return seeds.seedReportJob(size);
  }, size);
  const fixId = job.fixId ?? await page.evaluate(async pid => (await (await import('/src/db/testing.ts')).listTests(pid)).find(t => t.kind === 'fix' && !t.deletedAt)?.id, job.projectId);
  /* WHAT MUST REACH THE PAPER — ACCURACY, NOT JUST LAYOUT. The app's own
     models are built here exactly as the screens build them (lib/clientReport,
     lib/trialCard, lib/day — each tested against the records in its own unit
     tests), and every word they say must be found on the paper. The plan
     pages are not included: on a long job they fold by design. */
  const must = await page.evaluate(async ({ pid, tid, fid }) => {
    const db = await import('/src/db/testing.ts');
    const P = await import('/src/db/projects.ts');
    const { san } = await import('/src/lib/reportKit.ts');
    // The PDF's own fonts, as a download loads them — san() keeps what they can draw.
    await (await import('/src/lib/savePdf.ts')).loadPdfLib();
    const { clientReport } = await import('/src/lib/clientReport.ts');
    const { trialCard } = await import('/src/lib/trialCard.ts');
    const { dayOf } = await import('/src/lib/day.ts');
    const { todayISO } = await import('/src/lib/weeks.ts');
    const { listMaterials } = await import('/src/db/materials.ts');
    const { listPrograms } = await import('/src/db/programs.ts');
    const project = await P.getProject(pid);
    const [tests, items, assets, materials, programs] = await Promise.all([db.listTests(pid), db.listTestItems(pid), db.listAssets(pid), listMaterials(pid), listPrograms(pid)]);
    const today = todayISO();
    const r = clientReport({ project, projects: [project], assets, tests, items, materials, programs, standards: [], walk: [], today });
    const out = { client: [], card: [], fix: [], day: [] };
    const add = (k, ...xs) => { for (const x of xs) { const v = typeof x === 'number' ? String(x) : x; if (v && san(v)) out[k].push([v, san(v), from]); } };
    let from = '';
    from = 'top'; add('client', r.name, r.sentence, r.slip);
    from = 'gates'; for (const g of r.gates) add('client', g.label, g.says);
    from = 'machines'; for (const mc of r.machines) add('client', mc.name, mc.at);
    for (const s2 of r.sections) {
      const said = s2.grid?.rows.length || s2.late.length || s2.programs?.total || s2.tests?.length;
      if (!said) continue;
      from = `section ${s2.gate}`; add('client', s2.label, s2.says);
      for (const row of s2.grid?.rows ?? []) add('client', row.machine);
      if (s2.gate !== 'commission') add('client', ...s2.late);
      for (const pr of s2.programs?.notYet ?? []) add('client', pr.what);
      from = `section ${s2.gate} test`; for (const t of s2.tests ?? []) add('client', t.title, t.passesIf, t.result, t.outcome);
    }
    from = 'fixes'; for (const fx of [...r.fixes.open, ...r.fixes.done]) add('client', fx.title, fx.when);
    for (const fx of r.fixes.open) add('client', fx.problem, fx.machine, fx.who);
    from = 'waiting'; for (const w of r.waiting) add('client', w.what, w.open, w.whose);
    const cardOf = (id, k) => {
      const t = tests.find(x => x.id === id); if (!t) return;
      const c = trialCard(t, tests, items, assets);
      from = 'card'; add(k, c.title, c.passesIf, c.result, c.plannedProduct, c.product);
      from = 'finding'; for (const fd of c.findings) add(k, fd.what, fd.owner, fd.action);
      from = 'next'; for (const n of c.next) add(k, n.what, n.owner);
    };
    cardOf(tid, 'card'); if (fid) cardOf(fid, 'fix');
    const d = dayOf({ tests, items, assets, materials, programs }, today, today);
    from = 'day'; add('day', d.headline);
    for (const sec of d.sections) for (const l of sec.lines) add('day', l.text, l.detail);
    return out;
  }, { pid: job.projectId, tid: job.testId, fid: fixId });

  const reports = [
    ['client', `#/project/${job.projectId}/report`, [['PDF']], must.client],
    ['test card', `#/project/${job.projectId}/testing/${job.testId}/card`, [['PDF']], must.card],
    ...(fixId ? [['fix card', `#/project/${job.projectId}/testing/${fixId}/card`, [['PDF']], must.fix]] : []),
    ['day', `#/project/${job.projectId}/day`, [['PDF']], must.day],
  ];
  for (const [name, hash, steps, mustSay] of reports) {
    const file = `${OUT}/${size}-${name.replace(/ /g, '-')}.pdf`;
    try {
      await download(page, hash, file, steps);
      const r = check(file, mustSay ?? []);
      rows.push({ size, report: name, pages: r.pages, faults: r.faults, said: r.said });
    } catch (e) {
      rows.push({ size, report: name, pages: 0, faults: [`could not make it: ${e.message.split('\n')[0]}`] });
    }
  }
  if (errors.length) rows.push({ size, report: '(console)', pages: 0, faults: errors });
  await ctx.close();
}
/* THE 6M CLIENT REPORT — a running line's root cause story (docs/SIXM.md),
   at both edges: a job just started (no problem yet, which it must say in a
   line, not in empty sections) and one a long way in (six problems in every
   phase, one with thirty causes, sixty actions, the walk). What must reach
   the paper is taken from the records and the engine's own views
   (lib/useProblems loadProblems → lib/fishbone buildView), not from the
   report's model: every problem, every cause on every bone, every why of
   every root and its "therefore" read-back, every countermeasure with what it
   was expected to do and what happened, every action on the board, every
   snag, every Pareto category and every station of the line balance. */
/* With --fuzz or --seeds, a random 6M job for each number too
   (seedRandomSixMJob) — any shape, every check the same. */
const SIXM_SIZES = fuzzAt > 0 || seedsAt > 0 ? SIZES : ['tiny', 'huge'];
for (const size of SIXM_SIZES) {
  const { ctx, page, errors } = await device();
  const job = await page.evaluate(async size => {
    const seeds = await import('/src/dev/reportSeeds.ts');
    return size.startsWith('random-') ? seeds.seedRandomSixMJob(Number(size.slice(7))) : seeds.seedSixMJob(size);
  }, size);
  /* The project's report, and one line's own deck (?line=) — the same
     drawer scoped to a line: its problems, its board and the actions for
     every line, its walk, its Pareto and its constraint. */
  for (const lineId of [undefined, ...(job.lineId ? [job.lineId] : [])]) {
    const must = await page.evaluate(async ({ pid, lineId }) => {
      const { san } = await import('/src/lib/reportKit.ts');
      await (await import('/src/lib/savePdf.ts')).loadPdfLib();
      const { loadProblems, viewsOf } = await import('/src/lib/useProblems.ts');
      const { therefore } = await import('/src/lib/fishbone.ts');
      const { PHASE_WORD } = await import('/src/lib/problems.ts');
      const { listPaceTodos } = await import('/src/db/pace.ts');
      const { getProject } = await import('/src/db/projects.ts');
      const project = await getProject(pid);
      const loaded = await loadProblems(pid);
      const views = viewsOf(loaded, pid, lineId, Date.now());
      const todos = (await listPaceTodos(pid)).filter(t => !lineId || !t.lineId || t.lineId === lineId);
      const lines = loaded.data.lines.filter(l => !lineId || l.id === lineId);
      const ws = new Set(lines.map(l => l.workspaceId).filter(Boolean));
      const out = [];
      let from = '';
      const add = (...xs) => { for (const x of xs) { const v = typeof x === 'number' ? String(x) : x; if (v && san(v)) out.push([v, san(v), from]); } };
      const words = t => (t.state !== 'done' && !t.due ? t.when?.trim() : undefined);
      from = 'top'; add(project.name, project.lead);
      from = 'lines'; for (const l of lines) add(l.name);
      from = 'pareto';
      const end = new Date().setHours(0, 0, 0, 0) + 86_400_000;
      for (const o of loaded.data.observations) if ((!lineId || ws.has(o.workspaceId)) && o.startedAt >= end - 28 * 86_400_000 && o.startedAt < end && (o.durationMs > 0 || o.count > 0)) add((o.category || 'Uncategorised').trim());
      from = 'constraint'; for (const l of lines) if ((l.capacity?.stations.length ?? 0) >= 2) for (const st of l.capacity.stations) add(st.name);
      for (const v of views) {
        from = `problem`; add(v.problem.title, PHASE_WORD[v.phase]);
        from = `cause of ${v.problem.title.slice(0, 30)}`; for (const c of v.problem.causes ?? []) add(c.text);
        from = `why`; for (const c of v.roots) { for (const w of c.whys) add(w.text); for (const t of therefore(c, v.problem.title)) add(t); }
        /* The old five whys, read back from the root to the problem — each
           why after the first starts lower-case, as every "therefore" does. */
        from = 'written before the fishbone';
        if (!(v.problem.causes ?? []).length) {
          const clean = x => x.trim().replace(/[.;:,\s]+$/, '');
          const low = x => (x.length > 1 && /[a-z]/.test(x[1]) ? x[0].toLowerCase() + x.slice(1) : x);
          const chain = (v.problem.whys ?? []).map(clean).filter(Boolean).reverse();
          if (chain.length) add(`${[...chain, clean(v.problem.title)].map((x, i) => (i ? low(x) : x)).join(', therefore ')}.`);
        }
        from = `countermeasure`;
        for (const a of v.actions) { const t = todos.find(x => x.id === (a.uid ?? a.ref)); if (t) add(t.what, t.expect, t.state === 'done' ? t.outcome : undefined, words(t)); }
        from = 'hold'; if (v.problem.hold) add(v.problem.hold.what, v.problem.hold.who);
      }
      from = 'board'; for (const t of todos) add(t.what, t.who, t.why, words(t));
      from = 'walk'; for (const sn of loaded.data.snags) if (!lineId || ws.has(sn.wsId)) add(sn.what, sn.state !== 'closed' ? sn.owner : undefined);
      return out;
    }, { pid: job.projectId, lineId });
    const label = lineId ? '6M line' : '6M client';
    const file = `${OUT}/6m-${size}-${lineId ? 'line' : 'client'}.pdf`;
    try {
      await download(page, `#/pace-report?project=${job.projectId}${lineId ? `&line=${lineId}` : ''}`, file, [['PDF']]);
      const r = check(file, must);
      /* A client-safe document: no record's internal id on the paper. */
      const ids = textOf(file).match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi) ?? [];
      if (ids.length) r.faults.push(`an internal id on the paper ×${ids.length}: ${ids[0]}`);
      rows.push({ size: `6m-${size}`, report: label, pages: r.pages, faults: r.faults, said: r.said });
    } catch (e) {
      rows.push({ size: `6m-${size}`, report: label, pages: 0, faults: [`could not make it: ${e.message.split('\n')[0]}`] });
    }
  }
  if (errors.length) rows.push({ size: `6m-${size}`, report: '(console)', pages: 0, faults: errors });
  await ctx.close();
}
await browser.close();

let bad = 0;
for (const r of rows) {
  const ok = r.faults.length === 0;
  if (!ok) bad++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${r.size.padEnd(9)} ${r.report.padEnd(10)} ${String(r.pages).padStart(2)} page${r.pages === 1 ? ' ' : 's'}  ${String(r.said ?? 0).padStart(4)} facts checked${ok ? '' : '\n        ' + r.faults.join('\n        ')}`);
}
writeFileSync(`${OUT}/result.json`, JSON.stringify(rows, null, 2));
console.log(`\n${rows.length - bad} of ${rows.length} reports clean — PDFs in ${OUT}`);
process.exit(bad ? 1 : 0);
