/* ACCEPTANCE — AREAS (9 November — Rowland: "we now have areas in set up. So on factory page we need area.. then each area will have
 * lines in them we need area reports show everything happening in the area"; lib/areas, src/line/area/AreaScreen,
 * src/line/report/areaBundle, areaBundlePdf, AreaReportScreen). Driven in a real browser on the smoke seed, its lines put in two
 * areas of one site by seedAreasForTest, one line added with no area and a dual line made in the packing hall:
 *
 *   1  the Factory's Lines tab: each area a section — its name, its sentence equal to the module's (lib/areas areaSays over
 *      src/line/report/areaBundle), Open the area ›, Area report — its lines under it; the line with no area under No area yet with
 *      Set up the lines ›
 *   2  Open the area › — the area's page: the Lines tab lit, the context bar Factory › Hull › Packing hall, only its lines (the dual
 *      line once among them), the sentence the module's; the four answers for the area (15 November) — the Factory's cards counted
 *      from its lines alone, equal to lib/useScopeQuestions loadScopeQuestions, three rows an answer and Show all in place, a card the
 *      door to its answer; the programs to prove in a fold, each naming its line; a problem raised on one of its lines in the answers
 *      with no reload, opening its record
 *   3  the area report from Report ▾ › Area report, made on arrival and read back with pdftotext: the band (client, site, area), each
 *      line's part under its name, the dual line's own work once, The area together, the closing line, nothing of another area
 *   4  the phone: the Lines tab, the area's page and its report with nothing off the side
 *
 *   node scripts/acceptance/areas.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper } from '../lib/pageHeader.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const ar = await page.evaluate(async () => {
  const seed = await import('/src/dev/seed.ts');
  const a = await seed.seedAreasForTest();
  const db = await import('/src/db.ts');
  const { addLineToFactory } = await import('/src/lib/lines.ts');
  /* one line with no area, and a dual line in the packing hall made of its two lines */
  const loose = await addLineToFactory('Line 9 — loose', 'Packing');
  const dual = await addLineToFactory('Line 7 pair', 'Packing');
  await db.updateWorkspace({ ...(await db.getWorkspace(dual.id)), madeOf: a.packingIds, siteName: a.site, areaName: a.packing });
  /* one client on every line — the band names it */
  for (const w of (await db.listWorkspaces()).filter(x => !x.archived)) await db.updateWorkspace({ ...w, clientName: 'Northfield Foods' });
  return { ...a, looseId: loose.id, dualId: dual.id };
});

/* what the module says of an area, from the same records the pages read */
const moduleSays = area => page.evaluate(async area => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const { areaBundle } = await import('/src/line/report/areaBundle.ts');
  const { areaSays, areaTiles, areaCard } = await import('/src/lib/areas.ts');
  const { allPaceLines } = await import('/src/db/pace.ts');
  const { listAllPrograms } = await import('/src/db/programs.ts');
  const { listAllAssets } = await import('/src/db/testing.ts');
  const [all, machines, programs, standards, jobLines, jobs, studies, snags] = await Promise.all([db.listWorkspaces(), listAllAssets(), listAllPrograms(), db.listAllStandards(), allPaceLines(), db.allProjects(), db.listAllStudies(), db.listAllSnags()]);
  const lines = await liveProductionLines(all);
  const on = new Map(await Promise.all(lines.map(async w => [w.id, await db.projectsOnWorkspace(w.id)])));
  const live = new Map(jobs.filter(j => !j.deletedAt && !j.archivedAt).map(j => [j.id, j.name]));
  const b = areaBundle(area, { lines: all, machines, programs, jobLines, snags, standards: standards.filter(s => !s.deletedAt), studies, projectsOn: id => (on.get(id) ?? []).flatMap(p => (live.has(p) ? [{ id: p, name: live.get(p) }] : [])) });
  return { says: areaSays(b.facts).text, card: areaCard(b.facts), tiles: areaTiles(b.facts).map(x => `${x.k} ${x.v}`), lines: b.lines.map(w => w.name), actions: b.actions.length, otherLines: all.filter(w => !b.lines.some(x => x.id === w.id)).map(w => w.name) };
}, area);
const norm = s => s.replace(/\s+/g, ' ').trim();
/* the secondary sections sit in ui/Fold, shut on arrival (10 November, docs/DESIGN.md) — opened here before they are read */
const openFolds = async scope => { for (let i = 0; i < 20; i++) { const b = page.locator(`${scope} .fold:not(.is-open) .fold-toggle`).first(); if (!(await b.count())) break; await b.click(); await page.waitForTimeout(150); } };
const PACKING = { site: ar.site, area: ar.packing }, DESPATCH = { site: ar.site, area: ar.despatch };

/* ---- 1 · the Lines tab ---- */
await t.go('#/room', 3500);
/* since 14 November an area is a CARD on the front page (lib/areas areaCard — Rowland: "It's a card, it's a location … Beautiful cards,
   real simple"; shown the picture, "looks good continue"): its name the door to the area, how its problems stand, the worst thing
   open, its programs and projects in one line, its lines as chips; each line's full row and the Area report are on the area's page */
const heads = await page.locator('.fac-area .fac-acard-name').allInnerTexts();
ok(JSON.stringify(heads) === JSON.stringify(['Hull › Despatch', 'Hull › Packing hall']), `1 the Lines tab: a card an area — ${heads.join(' and ')}`);
const mp = await moduleSays(PACKING), md = await moduleSays(DESPATCH);
const drawnCard = place => page.evaluate(place => {
  const c = document.querySelector(`.fac-area[data-place="${place}"]`); if (!c) return null;
  const tx = q => (c.querySelector(q)?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return { tone: [...c.classList].find(x => /^is-[ragn]$/.test(x))?.slice(3), state: tx('.fac-acard-state'), stateTone: [...(c.querySelector('.fac-acard-state')?.classList ?? [])].find(x => /^is-[ragn]$/.test(x))?.slice(3),
    worst: tx('.fac-acard-worst'), rest: tx('.fac-acard-rest'), redRest: [...c.querySelectorAll('.fac-acard-rest .is-r')].map(e => e.textContent.replace(/^ · /, '').trim()),
    lines: [...c.querySelectorAll('.fac-achip .fac-achip-name')].map(e => e.textContent.trim()), n: tx('.fac-acard-n') };
}, place);
const same = (d, m) => d && d.tone === m.tone && d.stateTone === m.state && d.state === m.open + (m.red ? ` · ${m.red}` : '')
  && (m.worst ? d.worst.startsWith(m.worst.what) : d.worst === '') && d.rest === m.rest.map(r => r.text).join(' · ')
  && JSON.stringify(d.redRest) === JSON.stringify(m.rest.filter(r => r.red).map(r => r.text));
const dP = await drawnCard('Hull › Packing hall'), dD = await drawnCard('Hull › Despatch');
ok(same(dP, mp.card) && same(dD, md.card), `1 each card the module's — "${dP?.state}" / "${dP?.worst}" / "${dP?.rest}" · "${dD?.state}" / "${dD?.rest}"`);
ok(dP.lines.length === 3 && dP.lines.includes('Line 7 pair') && !dP.lines.includes('Line 2A — capacity') && dP.n === '3 lines', `1 the packing hall's lines as chips on its card: ${dP.lines.join(', ')}`);
ok((await page.locator('.fac-area .fac-area-open').count()) === 2 && (await page.locator('.fac-area .fac-area-report').count()) === 0 && (await page.locator('.fac-first .fac-floor .fac-card').count()) === 0,
  '1 each card\'s name opens its area; the Area report and each line\'s full row are on the area\'s page, not here');
const loose = await page.locator('.fac-noarea .fac-achip-name').allInnerTexts();
ok((await t.words('.fac-noarea .fac-acard-name')) === 'No area yet' && JSON.stringify(loose) === JSON.stringify(['Line 9 — loose']) && /Set up the lines/.test(await t.words('.fac-noarea .fac-area-acts')), `1 the line with no area on a card of its own, No area yet (${loose.join(', ')}), with Set up the lines`);
/* a chip is the door to its line */
await page.locator('.fac-area[data-place="Hull › Despatch"] .fac-achip').first().click(); await page.waitForTimeout(2500);
ok(/#\/lines\//.test(page.url()) && /Line 2A — capacity/.test(await t.words('.part-head h1')), `1 a line's chip opens that line (${await t.words('.part-head h1')})`);
await t.go('#/room', 3000);
const chipH = await page.locator('.fac-achip').first().evaluate(e => e.getBoundingClientRect().height);
ok(chipH >= 36, `1 a chip a press of ${Math.round(chipH)} px at a desk`);

/* ---- 2 · the area's page ---- */
await page.locator('.fac-area[data-place="Hull › Packing hall"] .fac-area-open').click(); await page.waitForTimeout(3000);
const hash = await page.evaluate(() => location.hash);
ok(/^#\/area\?/.test(hash) && /site=Hull/.test(hash) && /area=Packing\+hall|area=Packing%20hall/.test(hash), `2 Open the area › lands on ${hash}`);
ok((await t.words('.nv-tabs .nv-tab.is-on')) === 'Lines' && /Factory/.test(await t.words('.nv-ctx .nv-here')) && /Hull › Packing hall/.test(await t.words('.nv-ctx')), `2 the Lines tab lit, the bar "${norm(await t.words('.nv-ctx'))}"`);
const cards = await page.locator('.ar-page .fac-card-name').allInnerTexts();
ok(JSON.stringify([...cards].sort()) === JSON.stringify([...mp.lines].sort()) && cards.filter(n => n === 'Line 7 pair').length === 1 && !cards.includes('Line 2A — capacity') && !cards.includes('Line 9 — loose'), `2 only its lines, the dual line once: ${cards.join(', ')}`);
ok(norm(await t.words('.ar-page .part-head .ar-says')) === mp.says, '2 the area in a sentence, as the module says it');
/* THE FOUR ANSWERS FOR THE AREA (15 November — agreed with Rowland 14 November: "the Factory's four answers shown for an area and for a
   line"): the Factory's cards counted from the area's lines alone — the page's cards and answers as lib/useScopeQuestions loadScopeQuestions
   reads the same records; they replaced the five tiles, whose counts the sentence says */
const fourOf = () => page.evaluate(async area => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const { linesInArea } = await import('/src/lib/areas.ts');
  const { loadScopeQuestions } = await import('/src/lib/useScopeQuestions.ts');
  const lines = linesInArea(await liveProductionLines(await db.listWorkspaces()), area);
  const q = await loadScopeQuestions(lines);
  return { cards: q.cards.map(c => `${c.label} ${c.value} ${c.of} ${c.change}`), wrong: q.wrong.open, doing: q.doing.open, proved: q.worked.proved.length, top: q.wrong.top.map(r => r.what) };
}, PACKING);
const drawnFour = async () => (await page.locator('.ar-page .ar-four .fq-card').allInnerTexts()).map(x => norm(x));
const f0 = await fourOf();
let d0 = await drawnFour();
for (let i = 0; i < 20 && JSON.stringify(d0) !== JSON.stringify(f0.cards.map(norm)); i++) { await page.waitForTimeout(250); d0 = await drawnFour(); }
ok(JSON.stringify(d0) === JSON.stringify(f0.cards.map(norm)), `2 the four answers for the area as the module counts its lines — ${d0.join(' | ')}`, JSON.stringify({ d0, want: f0.cards }));
ok((await page.locator('.ar-page .sg-tiles .ln-tile').count()) === 0, '2 the five tiles are off the page (their counts are in the sentence)');
const panels = await page.locator('.ar-page .fq-answers').getAttribute('data-answers');
ok(panels === (f0.proved ? 'wrong doing worked' : 'wrong doing'), `2 the answers drawn — ${panels}; Did it work only once a fix is proved (${f0.proved})`);
const wrongRows = await page.locator('.ar-page #fq-wrong .fq-row').count(), doingRows = await page.locator('.ar-page #fq-doing .fq-row').count();
ok(wrongRows === Math.min(3, f0.wrong) && doingRows === Math.min(3, f0.doing), `2 three rows an answer at first — ${wrongRows} of ${f0.wrong} problems, ${doingRows} of ${f0.doing} actions`);
if (f0.doing > 3) {
  await page.locator('.ar-page #fq-doing [data-rest]').click(); await page.waitForTimeout(300);
  ok((await page.locator('.ar-page #fq-doing .fq-row').count()) === f0.doing, `2 Show all ${f0.doing} opens the rest in place`);
  await page.locator('.ar-page #fq-doing [data-rest]').click(); await page.waitForTimeout(200);
}
/* a card is a door to its answer on the same page */
await page.locator('.ar-page .ar-four .fq-card').nth(1).click(); await page.waitForTimeout(700);
const doingTop = await page.locator('#fq-doing').evaluate(e => e.getBoundingClientRect().top);
ok(doingTop >= -5 && doingTop < 400, `2 What needs doing's card brings its answer into view (${Math.round(doingTop)} px from the top)`);
/* the programs to prove, in a fold since 15 November, each naming its line */
await openFolds('.ar-page');
const rowLines = await page.locator('.ar-prove .ar-row, .ar-todo .ar-row').evaluateAll(els => els.map(e => e.getAttribute('data-line')));
const progs = await page.locator('.ar-prove .ar-row').count();
ok(progs > 0 && rowLines.every(l => mp.lines.includes(l)), `2 the programs to prove (and any check owed), each naming one of its lines: ${rowLines.length} rows`);
const raised = await page.evaluate(async ws => { const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts'); const id = uid(); await db.addSnag({ id, workspaceId: ws, problem: 'Film tension slipping at the bagger — raised now', status: 'open', priority: 'critical', raisedAt: Date.now(), updatedAt: Date.now(), media: [] }); return id; }, ar.packingIds[0]);
await page.waitForTimeout(2500);
const f1 = await fourOf();
let d1 = await drawnFour();
for (let i = 0; i < 20 && JSON.stringify(d1) !== JSON.stringify(f1.cards.map(norm)); i++) { await page.waitForTimeout(250); d1 = await drawnFour(); }
const row = page.locator('.ar-page #fq-wrong .fq-row', { hasText: 'Film tension slipping at the bagger' });
ok(f1.wrong === f0.wrong + 1 && JSON.stringify(d1) === JSON.stringify(f1.cards.map(norm)) && (await row.count()) === 1, `2 a problem raised on one of its lines is in the area's answers with no reload — ${d1[0]}`);
ok(norm(await t.words('.ar-page .part-head .ar-says')) === (await moduleSays(PACKING)).says, '2 the sentence moved with it, still the module\'s');
await row.click(); await page.waitForTimeout(1500);
ok((await page.locator(`[data-problem-panel="${raised}"]`).count()) === 1 || (await page.evaluate(() => location.hash)).includes(`open=${raised}`), '2 its row opens the problem');
await page.keyboard.press('Escape'); await page.waitForTimeout(800);
await page.evaluate(() => { if (/open=/.test(location.hash)) history.back(); }); await page.waitForTimeout(1500);
await t.go(`#/area?site=Hull&area=Packing%20hall`, 3000);
await openFolds('.ar-page');
/* THE BOARD OF CARDS (14 November — Rowland: "it just needs to be cards … a point to say these things live in this area. Click on if you want to follow through"): under each
   line a card a tool in use — as the module groups the line's own records (AreaScreen cardsOf over areaBundle) — each the door to its record */
const want = await page.evaluate(async area => {
  const db = await import('/src/db.ts');
  const { liveProductionLines } = await import('/src/lib/lines.ts');
  const { areaBundle } = await import('/src/line/report/areaBundle.ts');
  const { cardsOf, cardsShown } = await import('/src/line/area/AreaScreen.tsx');
  const { allPaceLines } = await import('/src/db/pace.ts');
  const { listAllPrograms } = await import('/src/db/programs.ts');
  const { listAllAssets } = await import('/src/db/testing.ts');
  const [all, machines, programs, standards, jobLines, jobs, studies, snags] = await Promise.all([db.listWorkspaces(), listAllAssets(), listAllPrograms(), db.listAllStandards(), allPaceLines(), db.allProjects(), db.listAllStudies(), db.listAllSnags()]);
  const lines = await liveProductionLines(all);
  const on = new Map(await Promise.all(lines.map(async w => [w.id, await db.projectsOnWorkspace(w.id)])));
  const live = new Map(jobs.filter(j => !j.deletedAt && !j.archivedAt).map(j => [j.id, j.name]));
  const b = areaBundle(area, { lines: all, machines, programs, jobLines, snags, standards: standards.filter(s => !s.deletedAt), studies, projectsOn: id => (on.get(id) ?? []).flatMap(p => (live.has(p) ? [{ id: p, name: live.get(p) }] : [])) });
  /* the line's own cards (its problems, its tests that did not pass — A3) come first, so the tools have the rest of the row */
  const own = Object.fromEntries([...document.querySelectorAll('.ar-page .fac-floor > li')].map(li => [li.querySelector('.fac-card-name')?.textContent?.trim(), li.querySelectorAll('[data-line-card]').length]));
  return b.parts.map(p => { const c = cardsShown(cardsOf(p.items), 5 - (own[p.line.name] ?? 0)); return { line: p.line.name, shown: c.shown.map(x => ({ key: x.it.key, tool: x.it.tool, name: x.it.name, says: x.it.says })), more: c.more }; });
}, PACKING).catch(e => ({ err: String(e) }));
const drawn = await page.evaluate(() => [...document.querySelectorAll('.ar-page .fac-floor > li')].map(li => ({ line: li.querySelector('.fac-card-name')?.textContent?.trim(), cards: [...li.querySelectorAll('.ar-card[data-card]')].map(c => ({ key: c.getAttribute('data-card'), tool: c.querySelector('.ar-card-tool')?.textContent?.trim(), name: c.querySelector('.ar-card-name')?.textContent?.trim(), says: c.querySelector('.ar-card-says')?.textContent?.trim() ?? '' })), more: li.querySelector('[data-card-more] .ar-card-name')?.textContent?.trim() ?? '' })));
const cardCount = drawn.reduce((n, l) => n + l.cards.length, 0);
/* a loss count's sentence on the page also reads the line's stops in its window, which this reading of the module is not given — so a card's sentence is checked by how it begins */
ok(Array.isArray(want) && cardCount > 0 && want.every(w => { const d = drawn.find(x => x.line === w.line); return d && d.cards.length === w.shown.length && w.shown.every((c, i) => d.cards[i].key === c.key && d.cards[i].name === c.name && d.cards[i].tool.startsWith(c.tool) && norm(d.cards[i].says).slice(0, 50) === norm(c.says).slice(0, 50)) && (w.more ? d.more.startsWith(`${w.more} more on`) : !d.more); }),
  `2 under each line a card a tool in use, as the module reads the line's own records (${cardCount} cards)`, JSON.stringify({ want, drawn }).slice(0, 600));
ok((await page.locator('.ar-tools').count()) === 0, '2 the folded list of the same records is gone — the cards are the one place');
{
  const first = page.locator('.ar-card[data-card]').first();
  const key = await first.getAttribute('data-card');
  await first.click(); await page.waitForTimeout(2200);
  const h = await page.evaluate(() => location.hash);
  ok(!/#\/area/.test(h) && (key.startsWith('study:') ? h.includes(key.slice(6)) : /standards|lines/.test(h)), `2 a card is the door to its record (${h.slice(0, 70)})`);
  await page.goBack(); await page.waitForTimeout(2500);
  await openFolds('.ar-page');
}
ok((await page.locator('.ar-machines .chip').count()) > 0, '2 its machines, line by line');

/* ---- 2b · A3 (15 November, docs/AREAS.md — agreed 14 November: "each card saying how its actions stand … problems and failed tests as
   cards"): a tool card says the problems it holds as its actions; each line's own cards — its open problems, its tests that did not pass —
   come first, each the module's (lib/cardActions) and each a door ---- */
{
  /* the line of the area with a program still to prove — its test is made to fail below */
  const firstLine = await page.evaluate(async ids => {
    const db = await import('/src/db.ts');
    const { listAllPrograms } = await import('/src/db/programs.ts');
    const progs = await listAllPrograms();
    for (const id of ids) if (progs.some(p => p.workspaceId === id && !p.deletedAt && !p.provedOn)) return (await db.getWorkspace(id)).name;
    return null;
  }, ar.packingIds);
  const lineLi = page.locator('.ar-page .fac-floor > li').filter({ has: page.locator('.fac-card-name', { hasText: new RegExp(`^${firstLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }) }).first();
  const key = await lineLi.locator('.ar-card[data-card^="study:"]').first().getAttribute('data-card');
  const sid = key.slice(6);
  const wsOf = await page.evaluate(async name => (await (await import('/src/db.ts')).listWorkspaces()).find(w => w.name === name)?.id, firstLine);
  /* a problem raised from that record, three days past its day, and the failed test of one of the line's programs */
  const made = await page.evaluate(async ({ sid, ws }) => {
    const db = await import('/src/db.ts');
    const { uid } = await import('/src/lib/ids.ts');
    const { listAllPrograms } = await import('/src/db/programs.ts');
    const { putTest } = await import('/src/db/testing.ts');
    await db.addSnag({ id: uid(), workspaceId: ws, problem: 'Seal jaw too cold at start-up', status: 'open', priority: 'high', raisedAt: Date.now() - 9e8, dueAt: Date.now() - 3 * 864e5, updatedAt: Date.now(), media: [], tools: [{ studyId: sid, raised: true }] });
    const prog = (await listAllPrograms()).find(p => p.workspaceId === ws && !p.deletedAt && !p.provedOn);
    if (prog) { const t0 = Date.now(); await putTest({ id: uid(), projectId: prog.projectId || '', title: `${prog.what} — first run`, programId: prog.id, assetId: prog.assetId, plannedFor: new Date().toISOString().slice(0, 10), ranOn: new Date().toISOString().slice(0, 10), outcome: 'failed', result: 'Leaked 3 in 20', sort: 1, createdAt: t0, updatedAt: t0 }); }
    return { prog: prog?.what };
  }, { sid, ws: wsOf });
  await page.waitForTimeout(2500);
  const want3 = await page.evaluate(async ({ sid, ws }) => {
    const db = await import('/src/db.ts');
    const { cardActions, problemsCard, failedCard, failedPrograms } = await import('/src/lib/cardActions.ts');
    const { lineProgramsReading, lineKit } = await import('/src/lib/lineRecords.ts');
    const { lineProblems } = await import('/src/lib/lineWork.ts');
    const { listAllPrograms } = await import('/src/db/programs.ts');
    const { listAllAssets, listAllTests } = await import('/src/db/testing.ts');
    const { allPaceLines } = await import('/src/db/pace.ts');
    const [snags, w, assets, programs, jobLines, tests, studies] = await Promise.all([db.listAllSnags(), db.getWorkspace(ws), listAllAssets(), listAllPrograms(), allPaceLines(), listAllTests(), db.listAllStudies()]);
    const kit = lineKit(w, assets, programs, jobLines);
    const pr = lineProblems(snags, { id: ws, name: w.name }, {});
    const top = pr.rows[0];
    return {
      acts: cardActions(snags, sid)?.text,
      problems: problemsCard({ open: pr.open, late: pr.late, critical: pr.critical, ...(top ? { worst: top.what } : {}) }),
      failed: failedCard(failedPrograms(kit.programs, tests.filter(t => t.programId && !t.deletedAt), lineProgramsReading([{ id: ws, name: w.name, machines: kit.machines, programs: kit.programs }], undefined, { tests: tests.filter(t => t.programId), studies }))),
    };
  }, { sid, ws: wsOf });
  const drawnActs = norm(await lineLi.locator(`.ar-card[data-card="${key}"] [data-card-acts]`).innerText().catch(() => ''));
  ok(want3.acts === '1 action open · 1 late' && drawnActs === want3.acts && (await lineLi.locator(`.ar-card[data-card="${key}"] [data-card-acts].is-r`).count()) === 1,
    `2b the card of the record a problem was raised from says how its actions stand, in red because one is late — "${drawnActs}"`);
  const pc = norm(await lineLi.locator('[data-line-card="problems"]').innerText().catch(() => ''));
  ok(want3.problems && pc.includes(norm(want3.problems.name)) && pc.includes(norm(want3.problems.says)), `2b the line's problems as its first card, as the module says them — "${pc}"`);
  const fc = norm(await lineLi.locator('[data-line-card="failed"]').innerText().catch(() => ''));
  ok(made.prog && want3.failed && fc.includes(norm(want3.failed.name)) && fc.includes(norm(want3.failed.says)), `2b a program whose test did not pass as a card of its own — "${fc}" (${made.prog})`);
  const first2 = await lineLi.locator('.ar-cards > li .ar-card').evaluateAll(els => els.slice(0, 2).map(e => e.getAttribute('data-line-card')));
  const row = await lineLi.locator('.ar-cards > li').count();
  ok(first2[0] === 'problems' && first2[1] === 'failed' && row <= 5, `2b the line's own cards first, the row still one row (${row} cards)`);
  await lineLi.locator('[data-line-card="problems"]').click(); await page.waitForTimeout(1500);
  ok(/#\/snags\?line=/.test(await page.evaluate(() => location.hash)), '2b the problems card opens the line\'s Problems');
  await page.goBack(); await page.waitForTimeout(2000);
  await lineLi.locator('[data-line-card="failed"]').click(); await page.waitForTimeout(1500);
  ok(/#\/programs\?line=/.test(await page.evaluate(() => location.hash)), '2b the failed tests card opens the line\'s Programs');
  await page.goBack(); await page.waitForTimeout(2000);
}

/* ---- 3 · the area report, made on arrival ---- */
const text = await t.pdfText(() => paper(page, 'Area report'), 'area');
await openFolds('.ar-report');
ok(/#\/area\/report\?/.test(await page.evaluate(() => location.hash)) && (await page.locator('.ar-report .lr-part').count()) >= 3, '3 Report ▾ › Area report opens the report page, a part a line and the area together');
const flat = text.replace(/\s+/g, ' ');
ok(/AREA · THE AREA REPORT/.test(flat) && /Client Northfield Foods/.test(flat) && /Site Hull/.test(flat) && /Area Packing hall/.test(flat), '3 the band names the client, the site and the area');
ok(mp.lines.every(n => flat.includes(t.norm(n))), `3 each line's part under its name — ${mp.lines.join(', ')}`);
const once = (flat.match(/what was run on Line 7 pair itself/g) ?? []).length;
ok(once === 1, `3 the dual line's own work printed once (${once})`);
ok(/THE AREA TOGETHER/.test(flat) && /Who owes what by when, across the area/.test(flat) && /Film tension slipping at the bagger/.test(flat), '3 The area together — the problem raised, who owes what across the area');
ok(!/Line 2A/.test(flat) && !/Line 9/.test(flat), '3 nothing of another area on the paper');
ok(flat.includes(t.norm((await moduleSays(PACKING)).says)), '3 the area\'s sentence on the paper, as the module says it');

/* ---- 4 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await t.go('#/room', 3000);
const w1 = await t.wide();
const phoneCards = await page.evaluate(() => { const c = [...document.querySelectorAll('.fac-acards > .fac-acard')].map(e => e.getBoundingClientRect()); const ch = [...document.querySelectorAll('.fac-achip, .fac-acard-head')].map(e => e.getBoundingClientRect().height); return { n: c.length, oneColumn: c.every(r => Math.abs(r.left - c[0].left) < 2), minPress: Math.min(...ch) }; });
ok(phoneCards.n === 3 && phoneCards.oneColumn && phoneCards.minPress >= 44, `4 the phone: the ${phoneCards.n} cards in one column, every press ${Math.round(phoneCards.minPress)} px or more`);
await t.go(`#/area?site=Hull&area=Packing%20hall`, 3000);
const w2 = await t.wide();
const tap = await page.locator('.ar-page .fq-card').first().boundingBox();
await t.go(`#/area/report?site=Hull&area=Packing%20hall`, 3500);
const w3 = await t.wide();
ok(w1 <= 1 && w2 <= 1 && w3 <= 1 && (tap?.height ?? 0) >= 44, `4 the phone: nothing off the side (${w1}, ${w2}, ${w3}), a row a thumb's height`);

await t.finish('Areas accepted: the Lines tab an area a section with its sentence, the area\'s page with only its lines and what needs doing, live, and the area report read back with each line\'s part, the dual line once and the area together.');
