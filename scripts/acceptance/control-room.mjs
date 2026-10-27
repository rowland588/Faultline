/* ACCEPTANCE — THE CONTROL ROOM AND A LINE'S PAGE SEE EVERYTHING
 * (docs/FLOW-AUDIT.md, findings 1, 6, 10, 11, 16 and 19).
 *
 * Rowland, 13 October: "Fix what the audit finds and ship it." The audit
 * walked the app as he would; this drives what it found, on the smoke seed,
 * in a real browser, each sentence checked against the module that makes it:
 *
 *   1  a Critical problem on Line 7, 3 days late and Priya's, and a program
 *      on Line 7 past its test day — no job on either — move the control
 *      room's late, critical and this week; its sentence says where; Who owes
 *      what carries them; This week lists them under the line, said "on the
 *      line, no job"; the line's card says critical and late in red, in
 *      words; and the control room report prints the line (lib/lineWork)
 *   6  the critical list reads: the problem a column of its own, the when a
 *      word ("open", "3 days late"), "going with …" its branch line — at a
 *      desk and on a phone, nothing off the side
 *  10  a line's page says what each tool found — its latest record's
 *      sentence, as the tool's own list says it — and each job on it its
 *      verdict, the control room's own
 *  11  on a phone the answer comes first: the band above the factory, the
 *      Problem button off the headline, and the bar Control room · Problems ·
 *      Lines · More, every job still in More
 *  16  each count is the page's: the rail's Problems is the Problems page's
 *      open; Install's Needs you lists the machine late on site that the
 *      control room lists, and its rail count carries it; Hand over's Needs
 *      you names the machines with none of its items
 *  19  "Start a job on this line" says "A change on Line 7" with the
 *      line's problems, its latest shift counted and its late program over
 *      the three ways; the new 6M job's "Open the first problem" is not done
 *      by another job's case on the line
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/control-room.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const OUT = process.env.SHOTS;
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();
const go = async (hash, wait = 2500) => { await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(wait); };
const shot = async name => { if (OUT) await page.screenshot({ path: `${OUT}/cr-${name}.png` }); };

await go('#/room', 3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const LINE7 = sd.line7WsId;

/* the board as it stands, read from the screen */
const board = async () => {
  await go('#/room');
  await page.locator('.jb-says').filter({ hasNotText: 'Reading every project' }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  /* every party, not the first five */
  const more = page.locator('.jb-owe.is-more', { hasText: /^and \d+ more$/ });
  if (await more.count()) { await more.click(); await page.waitForTimeout(300); }
  return page.evaluate(() => {
    /* a number by its label — what it is of (.jb-of, the lean page) set aside */
    const stat = w => Number([...document.querySelectorAll('.jb-stat')].find(e => { const c = e.cloneNode(true); c.querySelector('.jb-of')?.remove(); return c.textContent.trim().endsWith(w); })?.querySelector('b')?.textContent ?? 0);
    /* each party's count and late, read apart: "owes 11" and "3 late" run together as text */
    const owes = Object.fromEntries([...document.querySelectorAll('.jb-owe')].map(e => [e.querySelector('b')?.textContent ?? '', {
      n: Number(/\d+/.exec(e.querySelector('.jb-owe-n')?.textContent ?? '')?.[0] ?? 0), late: Number(/\d+/.exec(e.querySelector('.jb-owe-l')?.textContent ?? '')?.[0] ?? 0),
      jobs: [...e.querySelectorAll('.jb-owe-job')].map(j => j.textContent.replace(/\s+/g, ' ').trim()) }]));
    return { late: stat('late'), critical: stat('critical'), week: stat('this week'), says: document.querySelector('.jb-says')?.textContent ?? '', owes,
      eyebrow: document.querySelector('.jb-eyebrow')?.textContent ?? '' };
  });
};
const before = await board();

/* ---- 1 — a line's own work, with no job ---- */
const today = new Date(); today.setHours(0, 0, 0, 0);
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const DAY = 86_400_000;
const PROBLEM = 'Bagger jaw jams on 2kg film', PLAN = 'Run the 1.25 kg film until the new jaws come';
await page.evaluate(async ({ ws, due, test, problem, plan }) => {
  const db = await import('/src/db.ts');
  await db.addSnag({ id: crypto.randomUUID(), workspaceId: ws, problem, priority: 'critical', status: 'open', owner: 'Priya Shah', raisedAt: Date.now() - 5 * 86_400_000,
    dueAt: due, media: [], targetAsset: 'Bagger', proposedSolution: plan, updatedAt: Date.now() });
  await db.addLineProgram(ws, { what: 'P-200 Express', machine: 'Bagger', runs: 'Express 1.25kg', testOn: test, from: 'Ishida Europe' });
}, { ws: LINE7, due: today.getTime() - 3 * DAY, test: iso(new Date(today.getTime() - 4 * DAY)), problem: PROBLEM, plan: PLAN });
const after = await board();
await shot('1-board');
ok(after.late === before.late + 2 && after.critical === before.critical + 1 && after.week === before.week + 2,
  `1a late ${before.late}→${after.late}, critical ${before.critical}→${after.critical}, this week ${before.week}→${after.week}`);

/* the sentence is the module's (lib/portfolio, over lib/lineWork) */
const said = await page.evaluate(async () => {
  const [{ portfolio }, db, lines] = await Promise.all([import('/src/lib/portfolio.ts'), import('/src/db.ts'), import('/src/lib/lines.ts')]);
  const [ws, snags, programs] = await Promise.all([db.listWorkspaces(), db.listAllSnags(), db.listAllPrograms()]);
  const live = await lines.liveProductionLines(ws);
  const pf = portfolio([], (await import('/src/lib/weeks.ts')).todayISO(), [], live.map(w => ({ line: { id: w.id, name: w.name }, snags, programs })));
  return { lines: pf.lines.map(l => ({ name: l.name, late: l.late, items: l.items.map(x => x.what), critical: l.critical.map(x => x.what) })) };
});
const l7 = said.lines.find(l => l.name === 'Line 7');
ok(!!l7 && l7.late === 2 && l7.items.includes(PROBLEM) && l7.items.includes('P-200 Express') && l7.critical.includes(PROBLEM), `1c the module reads Line 7's own: ${JSON.stringify(l7)}`);
/* where the late is, as the module counts it: one line by its name, several by how many */
const lateLines = said.lines.filter(l => l.late > 0), lineLate = lateLines.reduce((n, l) => n + l.late, 0);
const where = lateLines.length === 1 ? `${lineLate} on ${lateLines[0].name}, outside any project.` : `${lineLate} on ${lateLines.length} lines, outside any project.`;
ok(after.says.endsWith(where) && lateLines.some(l => l.name === 'Line 7') && /every line and project/i.test(after.eyebrow), `1b the sentence says where: "${after.says}"`);
const site0 = before.owes['The site'] ?? { n: 0, late: 0 }, site1 = after.owes['The site'] ?? { n: 0, late: 0 };
const ish = after.owes['Ishida Europe'];
ok(site1.n === site0.n + 1 && site1.late === site0.late + 1 && !!ish && ish.jobs.includes('Line 7 1'),
  `1d Who owes what: the site owes ${site0.n}→${site1.n}, late ${site0.late}→${site1.late} (Priya); Ishida Europe's shares ${ish?.jobs.join(', ')}`);
ok(await page.locator('.jb-owe', { hasText: 'Ishida Europe' }).locator('.jb-owe-job.is-line', { hasText: 'Line 7' }).count() === 1, '1e its share on Line 7 wears the line\'s square, not a job\'s colour');
const grp = page.locator('.jb-week .jb-wl-g.is-line', { has: page.locator('.jb-wl-job', { hasText: /^Line 7 · on the line, no project$/ }) });
const grpText = flat(await grp.first().innerText().catch(() => ''));
ok(grpText.includes(PROBLEM) && /Problem · Priya Shah/.test(grpText) && grpText.includes('P-200 Express') && /Program · Ishida Europe/.test(grpText), `1f This week, under "Line 7 · on the line, no job": ${grpText.slice(0, 160)}`);
/* the line's card: critical and late in red, each with its word */
const card = page.locator('.fac-card').filter({ has: page.locator('.fac-card-name', { hasText: /^Line 7$/ }) });
const cardText = flat(await card.innerText());
const reds = await card.locator('b.is-r').evaluateAll(els => {
  const probe = document.createElement('span'); probe.style.color = 'var(--st-r)'; document.body.append(probe);
  const red = getComputedStyle(probe).color; probe.remove();
  return els.map(e => ({ t: e.textContent, red: getComputedStyle(e).color === red }));
});
ok(/1 problem open · 1 critical · 1 late/.test(cardText) && reds.filter(r => r.red).map(r => r.t).join('|').startsWith('1 critical|1 late'), `1g Line 7's card: "${cardText.slice(0, 90)}" — red: ${reds.filter(r => r.red).map(r => r.t).join(', ')}`);

/* ---- 6 — the critical list, readable at a desk ---- */
await page.locator('.jb-stat.is-crit').click(); await page.waitForTimeout(700);
await shot('6-critical-desk');
const crit = await page.locator('.jb-focus .jb-fi').evaluateAll(els => els.map(e => ({
  job: e.querySelector('.jb-fi-job')?.textContent, what: e.querySelector('.jb-fi-what')?.textContent, when: e.querySelector('.jb-fi-when')?.textContent,
  b: e.querySelector('.jb-fi-b')?.textContent, w: e.querySelector('.jb-fi-what')?.getBoundingClientRect().width ?? 0,
})));
const title = flat(await page.locator('.jb-focus h3').innerText());
const ours = crit.find(c => c.what === PROBLEM);
ok(title === `${after.critical} critical, across every line and project` && crit.length === after.critical, `6a "${title}" — ${crit.length} rows`);
ok(!!ours && ours.job === 'Line 7' && ours.when === '3 days late' && ours.b === `going with: ${PLAN}`, `6b the line's: when "${ours?.when}", branch "${ours?.b}"`);
ok(crit.every(c => c.w >= 400 && (c.when ?? '').length <= 24), `6c every problem a row across the width (${crit.map(c => Math.round(c.w)).join(', ')} px), its when a word (${crit.map(c => c.when).join(' | ')})`);
ok(crit.filter(c => c.what !== PROBLEM).every(c => /^going with: |ways? round it|^$/.test(c.b ?? '') || c.b === undefined), `6d a job's "going with" is its branch: ${crit.filter(c => c.what !== PROBLEM).map(c => c.b).join(' | ')}`);
await page.locator('.jb-focus .jb-fi', { hasText: PROBLEM }).click(); await page.waitForTimeout(1500);
ok(new RegExp(`#/snags\\?line=${LINE7}&open=`).test(page.url()), `1h tapped: the register on Line 7, it open (${page.url().split('#')[1].slice(0, 40)}…)`);

/* ---- 1 — on paper ---- */
await board();
const dir = mkdtempSync(join(tmpdir(), 'cr-'));
/* the page header's Report ▾ (B3) — it was a button in the board's band */
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), pressPaper(page, 'Control room report — 1 page')]);
const pdf = join(dir, 'cr.pdf'); await dl.saveAs(pdf);
const paper = execFileSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8' }).replace(/\s+/g, ' ');
const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pdf], { encoding: 'utf8' }))?.[1]);
ok(/CONTROL ROOM · EVERY LINE AND PROJECT/.test(paper) && /ON THE LINES, OUTSIDE ANY PROJECT/.test(paper) && paper.includes(`1 critical: ${PROBLEM}`) && /Line 7 — the line itself, no project/.test(paper) && pages === 1,
  `1i the report prints the line: ${pages} page, "${(/ON THE LINES[^]{0,140}/.exec(paper) ?? [''])[0]}"`);

/* ---- 10 — a line's page says what its tools found, and its jobs' verdicts ---- */
const verdicts = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.jb-row-h')].map(r => [r.querySelector('.jb-name')?.textContent?.trim(), {
  w: r.querySelector('.jb-ot-w')?.textContent?.trim(), r: r.querySelector('.jb-ot-r')?.textContent?.trim() }])));
await go(`#/lines/${LINE7}`, 4000);
await shot('10-line');
ok(flat(await page.locator('.pl .pace-head .pl-says').innerText()) === '1 problem open · 1 critical · 1 late', `10a the line's head says what its card says: "${flat(await page.locator('.pl .pace-head .pl-says').innerText())}"`);
const tiles = await page.locator('.pl-tool').evaluateAll(els => Object.fromEntries(els.map(e => [e.querySelector('b')?.textContent, { says: e.querySelector('.pl-tool-says')?.textContent ?? '', n: e.querySelector('.sub')?.textContent ?? '' }])));
const truth = await page.evaluate(async ws => {
  const [db, studies, tools, links, std] = await Promise.all([import('/src/db.ts'), import('/src/screens/StudiesScreen.tsx'), import('/src/screens/LineToolsScreen.tsx'), import('/src/lib/studyLinks.ts'), import('/src/tools/linestandard/standard.ts')]);
  const [line, ss, obs, stds] = await Promise.all([db.getWorkspace(ws), db.listStudiesForLine(ws), db.listObservations(ws), db.listStandardsForLine(ws)]);
  const loss = links.currentLosses(ss.filter(s => !s.deletedAt), ws);
  const cap = stds.filter(std.inCapacityTool).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return {
    loss: loss ? studies.studyLine(loss, { observations: obs, workspaces: [line] }).text : '',
    losses: ss.filter(s => !s.deletedAt && s.tool === 'losses').length,
    cap: cap ? `${cap.product}: ${tools.balanceSays(cap).text}` : '',
  };
}, LINE7);
ok(!!truth.loss && tiles['Loss count']?.says === truth.loss && tiles['Loss count']?.n === `${truth.losses} on this line`, `10b Loss count says its latest shift: "${tiles['Loss count']?.says}" · ${tiles['Loss count']?.n}`);
ok(!!truth.cap && tiles['Line capacity']?.says === truth.cap, `10c Line capacity says what limits it: "${tiles['Line capacity']?.says}"`);
ok(/^None yet — /.test(tiles['Capability']?.n ?? '') && !tiles['Capability']?.says, `10d a tool with none says so: "${tiles['Capability']?.n}"`);
const jobsOn = await page.locator('.pl-job').evaluateAll(els => els.map(e => ({ name: e.querySelector('b')?.textContent, w: e.querySelector('.pl-ot')?.textContent, r: e.querySelector('.pl-job-ot .sub')?.textContent?.trim() })));
ok(jobsOn.length > 0 && jobsOn.every(j => verdicts[j.name ?? ''] && verdicts[j.name ?? ''].w === j.w && verdicts[j.name ?? ''].r === j.r),
  `10e each job its verdict, the control room's own: ${jobsOn.map(j => `${j.name}: ${j.w} — ${j.r}`).join(' | ')}`);

/* ---- 19 — a change started from the line ---- */
await page.getByRole('button', { name: 'Start a project on this line ›' }).click(); await page.waitForTimeout(2500);
await shot('19-start');
const sit = flat(await page.locator('.proj-sit').innerText().catch(() => ''));
ok(/^A change on Line 7 1 problem open · 1 critical · 1 late/.test(sit) && sit.includes(PROBLEM) && sit.includes('3 days late') && sit.includes(`The latest shift counted: ${truth.loss}`) && /P-200 Express — test was /.test(sit),
  `19a the line's situation over the three ways: "${sit.slice(0, 200)}"`);
ok(/What are you trying to do on Line 7\?/i.test(flat(await page.locator('.proj-model').innerText())), '19b the question says the line');
await page.locator('.proj-model-opt', { hasText: 'Make a running line perform better' }).click(); await page.waitForTimeout(400);
await page.getByLabel('Name', { exact: true }).fill('Line 7 jams').catch(async () => { await page.locator('.proj-new input.text-input').first().fill('Line 7 jams'); });
await page.locator('.proj-new .btn-primary', { hasText: /^Create/ }).click(); await page.waitForTimeout(3500);
const step = page.locator('.gr-step', { hasText: 'Open the first problem' });
ok(await step.count() === 1 && !/is-done/.test(await step.getAttribute('class') ?? ''), `19c the new job on Line 7: "Open the first problem" not done by the line's older case (${await step.getAttribute('class').catch(() => 'none')})`);

/* ---- 16 — each count is its page's ---- */
const P = sd.projectId;
await go(`#/project/${P}/fixes`, 3000);
/* a project's pages are tabs across the top since 23 October, each with its count */
const railN = async label => flat(await page.locator('.nv-tabs .nv-tab', { has: page.locator('.nv-tab-l', { hasText: new RegExp(`^${label}$`) }) }).first().locator('.nv-tab-n').innerText().catch(() => ''));
/* the page's counts are its tiles now (lib/stageGatePages) */
const tileOf = async k => (await page.locator('.sg-tiles .ln-tile').evaluateAll(els => els.map(e => ({ k: e.querySelector('.ln-k')?.textContent?.trim() ?? '', v: e.querySelector('.ln-v')?.textContent?.trim() ?? '', of: e.querySelector('.ln-of')?.textContent?.trim() ?? '' })))).find(x => x.k === k) ?? { v: '', of: '' };
const probsHead = `${(await tileOf('Open')).v} open`;
const tally = await page.evaluate(async pid => {
  const [db, noted] = await Promise.all([import('/src/db.ts'), import('/src/lib/noted.ts')]);
  return noted.problemsTally(await db.listTests(pid), await db.listTestItems(pid), await db.listAssets(pid));
}, P);
ok(probsHead.startsWith(`${tally.open} open`) && (await railN('Problems')).startsWith(String(tally.open)) && tally.noFix > 0,
  `16a the Problems tab's count is the page's: tab "${await railN('Problems')}", page "${probsHead}" (${tally.fixes} fixes, ${tally.noFix} with no fix)`);
await go(`#/project/${P}/install`, 3000);
await shot('16-install');
const needsI = (await page.locator('.cg-needs .nd-row').allInnerTexts()).map(flat);
const lateHead = Number((await tileOf('Late')).v || 0);
/* the gates are the Plan's tabs (docs/STAGEGATE-UX.md): Install's count is its tab's */
const railI = flat(await page.locator('.plt-t', { hasText: /^Install/ }).locator('.plt-n').innerText().catch(() => ''));
ok(needsI.some(n => /^Late Domino coder — not on site, was /.test(n)) && Number(/(\d+) late/.exec(railI)?.[1] ?? -1) === lateHead,
  `16b Install's Needs you: the coder late on site, as the control room lists it; its tab "${railI}", head ${lateHead} late`);
await go(`#/project/${P}/handover`, 3000);
const needsH = (await page.locator('.cg-needs .nd-row').allInnerTexts()).map(flat);
const headH = (await tileOf('Not added yet')).of;
const bareH = Number(/(\d+) machines? with none yet/.exec(headH)?.[1] ?? 0);
ok(bareH > 0 && needsH.some(n => /^Not added yet .+ — none of the hand-over items yet$/.test(n)) && !needsH.some(n => /^Nothing/.test(n)),
  `16c Hand over's Needs you names the machines with none (${bareH}): ${needsH.join(' | ').slice(0, 160)}`);

/* ---- 11 — the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await board();
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(300);
await shot('11-phone');
const pos = await page.evaluate(() => {
  const r = s => document.querySelector(s)?.getBoundingClientRect();
  const says = r('.jb-says'), fac = r('.fac-home'), fab = r('.nv-bar .nv-bi.is-plus'), tiles = r('.jb-stats');
  const hit = (a, b) => !!a && !!b && a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
  /* the frame's foot: the top bar, and the page's tabs under it since 23 October */
  const frame = Math.max(r('.nv-top')?.bottom ?? 0, r('.nv-tabs')?.bottom ?? 0);
  return { says: says?.top, frame, tilesBottom: tiles?.bottom, fac: fac?.top, fabOverHeadline: hit(says, fab), wide: document.documentElement.scrollWidth - window.innerWidth };
});
/* the headline the first thing under the frame (it was under 300px from the top with a 56px bar: 244px under it) */
ok(pos.says > pos.frame && pos.says - pos.frame < 244 && pos.tilesBottom < 844 && pos.fac > pos.says && !pos.fabOverHeadline && pos.wide <= 1,
  `11a the answer first: headline at ${Math.round(pos.says)}px (${Math.round(pos.says - pos.frame)}px under the frame), the four numbers end at ${Math.round(pos.tilesBottom)}px, the factory after (${Math.round(pos.fac)}px), the bar’s ＋ off it`);
const bar = await page.locator('.nv-bar .nv-bi .nv-bi-l').allInnerTexts();
/* the menu's bar, the same on every page since 23 October: Factory · Projects · ＋ · Problems · More */
ok(bar.join(' · ') === 'Factory · Projects · Problem · Problems · More', `11b the bar: ${bar.join(' · ')}`);
await page.locator('.nv-bar .nv-bi', { hasText: /^Problems$/ }).click(); await page.waitForTimeout(1200);
const toRegister = /#\/snags/.test(page.url());
await page.locator('.nv-bar .nv-bi', { hasText: /^Factory$/ }).click(); await page.waitForTimeout(1200);
await page.locator('.nv-tabs .nv-tab', { hasText: /^Lines$/ }).click(); await page.waitForTimeout(1200);
ok(toRegister && page.url().endsWith('#/factory'), `11c Problems opens the register; Factory, then its Lines tab, Your factory (${page.url().split('#')[1]})`);
await page.locator('.nv-bar .nv-bi', { hasText: 'More' }).click(); await page.waitForTimeout(800);
const more = flat(await page.locator('.nv-sheet').innerText());
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
/* every project one tap away in the context bar's switcher (the scope's name), and the menu in More */
await page.locator('.nv-top .nv-job').click(); await page.waitForTimeout(700);
const underProjects = flat(await page.locator('.nv-sw').innerText().catch(() => ''));
ok(['Line 2 commissioning', 'Line 7 pace', 'Line 7 jams'].every(n => underProjects.includes(n)) && /Factory/.test(more) && /Actions/.test(more) && /Tools/.test(more), '11d every project in the switcher, and the menu in More', `${underProjects} | ${more}`);
await page.keyboard.press('Escape'); await page.waitForTimeout(600);
await board();
await page.locator('.jb-stat.is-crit').click(); await page.waitForTimeout(700);
await shot('6-critical-phone');
const phoneCrit = await page.evaluate(() => {
  const f = document.querySelector('.jb-focus');
  return { over: [...document.querySelectorAll('.jb-focus .jb-fi')].map(e => e.scrollWidth - e.clientWidth), out: f ? f.getBoundingClientRect().right - window.innerWidth : 0,
    whens: [...document.querySelectorAll('.jb-focus .jb-fi-when')].map(e => e.textContent) };
});
ok(phoneCrit.over.every(x => x <= 1) && phoneCrit.out <= 0 && phoneCrit.whens.includes('3 days late'), `6e on a phone nothing runs off (${phoneCrit.over.join(', ')}), whens: ${phoneCrit.whens.join(' | ')}`);

/* ---- 12 the control room's Reports (Rowland, 14 October: "report is there
   but only in projects not in the control room ... we need the same in
   control room"): every paper, from the band and from More — the control
   room's own, each line's, and each job's own list under its name ---- */
{
  await board();
  /* Report ▾ › Every report — it was the band's All reports › (B3) */
  await pressPaper(page, 'Every report'); await page.waitForTimeout(1200);
  const doors = (await page.locator('.meet-report b').allInnerTexts()).map(flat);
  const jobs = (await page.locator('.cr-job-papers > .meet-line-n').allInnerTexts()).map(flat);
  ok(['Control room report — 1 page', 'Factory report', 'Problems', 'Programs', 'Line capacity', 'Line standard'].every(d => doors.includes(d))
    && ['Client report', 'Handover report', 'Machine labels', 'The plan'].every(d => doors.includes(d)) && jobs.includes('Line 2 commissioning'),
    `12a Report ▾ › Every report: the control room's papers, each line's and each job's own (${doors.length} doors; jobs ${jobs.join(', ')})`);
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 40000 }), page.locator('.meet-report', { hasText: 'Control room report — 1 page' }).first().click()]);
  const [lb] = await Promise.all([page.waitForEvent('download', { timeout: 40000 }), page.locator('.meet-report', { hasText: 'Machine labels' }).first().click()]);
  ok(/Control-room-report/.test(dl.suggestedFilename()) && /machine-labels/.test(lb.suggestedFilename()), `12b made from it: ${dl.suggestedFilename()} · ${lb.suggestedFilename()}`);
  await page.keyboard.press('Escape'); await page.waitForTimeout(500);
  await page.goto(`${BASE}/#/factory`); await page.waitForTimeout(2000);
  await page.locator('.nv-bar .nv-bi', { hasText: 'More' }).click(); await page.waitForTimeout(800);
  await page.locator('.nv-sheet').getByRole('button', { name: 'Reports', exact: true }).click(); await page.waitForTimeout(1200);
  ok(await page.locator('.meet-report', { hasText: 'Control room report — 1 page' }).count() === 1, '12c off a job, More › Reports opens the same list');
  await page.keyboard.press('Escape');
}

ok(errs.length === 0, `no console errors ${errs.slice(0, 3).join(' | ')}`);
await b.close();
console.log(fail ? `\nThe control room NOT accepted: ${fail} failed` : '\nThe control room accepted: a line\'s own work counted, listed and printed; the critical list read; a line\'s page saying what its tools found and its jobs\' verdicts; the phone\'s answer first; every count its page\'s; a change started from the line; every report from the control room');
process.exit(fail ? 1 : 0);
