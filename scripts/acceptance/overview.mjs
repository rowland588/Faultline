/* ACCEPTANCE — THE FACTORY OVERVIEW (13 November, docs/OVERVIEW.md; lib/overview, screens/OverviewScreen, lib/report/overviewPaper —
 * Rowland: "a collective view that I can present to a customer … a living picture that develops as I carry out further work, retaining
 * the original baseline … I do not want to enter information twice"). Driven in a real browser on the smoke seed, every line one customer's:
 *
 *   1  Overview the first Factory tab and lit; the page titled by the customer; its sentence and four tiles equal to lib/overview
 *      overviewOf over the same readers the Factory and the Story use; no input, textarea or select on the page — nothing is typed here
 *   2  what is costing the most: a row for each loss the module lists, in its order, each a door to the problem; what holds each line a
 *      row a line; what needs attention the module's sentences; where we have looked in a fold, shut, saying the module's sentence
 *   3  no baseline said, with the way to the Story; a first chapter approved (its figures frozen higher) — Since the baseline dated,
 *      a row for each figure then and now as the module says, Better said in words
 *   4  living: a critical problem raised on a line — the open count and the attention list move with no reload
 *   5  Report ▾ › Factory overview read back with pdftotext: the band, the sentence, every section, each loss, the baseline rows
 *   6  Present: full screen with no frame, the sentence and the figures large, Escape back to the page
 *   7  the phone: nothing off the side, rows 44 px
 *
 *   node scripts/acceptance/overview.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { paper } from '../lib/pageHeader.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const CLIENT = 'Northfield Foods';
await page.evaluate(async c => { const db = await import('/src/db.ts'); for (const w of (await db.listWorkspaces()).filter(x => !x.archived)) await db.updateWorkspace({ ...w, clientName: c }); }, CLIENT);

/* the module over the same readers the page uses */
const moduleSays = () => page.evaluate(async client => {
  const db = await import('/src/db.ts');
  const { productionLines } = await import('/src/lib/lines.ts');
  const { linesOfClient } = await import('/src/lib/clientStory.ts');
  const { isHolding, visitsOf } = await import('/src/lib/visits.ts');
  const { loadFactoryRead } = await import('/src/lib/useFactoryRead.ts');
  const { neckOf } = await import('/src/lib/lineLoss.ts');
  const { lineBrain } = await import('/src/lib/brain/homework.ts');
  const { outcomesOn } = await import('/src/lib/knowledge/fixes.ts');
  const { storyOfClient } = await import('/src/lib/storyPick.ts');
  const { overviewOf } = await import('/src/lib/overview.ts');
  const [all, studies, standards, projects] = await Promise.all([db.listWorkspaces(), db.listAllStudies(), db.listAllStandards(), db.allProjects()]);
  const lines = linesOfClient(productionLines(all), client).filter(l => !isHolding(l));
  const read = await loadFactoryRead(projects.filter(p => !p.deletedAt && !p.archivedAt), lines);
  const necks = new Map(); for (const l of lines) { const n = neckOf(standards, l.id); if (n) necks.set(l.id, n.names); }
  const now = Date.now();
  const findings = (await Promise.all(lines.map(l => lineBrain(l, now).catch(() => null)))).flatMap(b => b?.findings ?? []);
  const outcomes = (await Promise.all(lines.map(l => outcomesOn(l, now, { write: false }).catch(() => [])))).flat();
  const live = studies.filter(s => !s.deletedAt);
  const baseline = (storyOfClient(live, client)?.facts.chapters ?? []).filter(c => c.approvedAt).sort((a, b) => a.at - b.at)[0]?.snapshot;
  const o = overviewOf({ client, now, today: read.today, lines, wrong: read.wrong, actions: read.actions, proved: read.proved, studies: read.studies, snags: read.snags, necks, findings, outcomes, visits: visitsOf(live, client), ...(baseline ? { baseline } : {}) });
  return { says: o.says, tiles: o.tiles.map(x => `${x.k} ${x.v}`), losses: o.losses.map(l => l.what), lossIds: o.losses.map(l => l.id), lines: o.constraints.map(c => c.line), risks: o.risks.map(r => r.says), cover: o.coverage.says, improved: o.improved.says, progress: o.progress.says, rows: o.progress.rows, open: o.tiles[1].v, lineIds: lines.map(l => l.id) };
}, CLIENT);
const n = t.norm;
const tilesOn = async () => (await page.locator('[data-overview] .ln-tile').evaluateAll(els => els.map(e => `${e.querySelector('.ln-k')?.textContent ?? ''} ${e.querySelector('.ln-v')?.textContent ?? ''}`))).map(n);

/* ---- 1 · the tab, the sentence, the tiles ---- */
await t.go('#/overview', 4500);
let m = await moduleSays();
const tabs = await page.locator('.nv-tabs .nv-tab .nv-tab-l').allInnerTexts();
ok(tabs[0] === 'Overview' && tabs.includes('Story') && tabs.includes('Lines'), `1 Overview the first Factory tab: ${tabs.join(' · ')}`);
ok(/Overview/.test(await t.words('.nv-tabs .nv-tab.is-on, .nv-tabs .nv-tab[aria-current]')), '1 the Overview tab lit');
const head = n(await t.words('[data-overview] .pp-head, [data-overview] header'));
ok(head.includes(CLIENT) && head.includes(n(m.says)), `1 titled by the customer, the sentence the module's: "${m.says}"`);
const tl = await tilesOn();
ok(tl.length === 4 && m.tiles.every(x => tl.some(y => y === n(x))), `1 the four tiles the module's: ${tl.join(' | ')}`);
ok((await page.locator('[data-overview] input, [data-overview] textarea, [data-overview] select').count()) === 0, '1 nothing is typed on the overview — no input, textarea or select');

/* ---- 2 · the sections ---- */
const lossRows = (await page.locator('[data-ov-loss] .ov-what').allInnerTexts()).map(n);
ok(m.losses.length > 0 && JSON.stringify(lossRows) === JSON.stringify(m.losses.map(n)), `2 what is costing the most: ${lossRows.length} rows in the module's order`);
ok((await page.locator('[data-ov-loss]').first().getAttribute('href')) === `#/snags?open=${m.lossIds[0]}`, '2 a loss is a door to its problem');
const neckRows = (await page.locator('[data-ov-neck] .ov-what').allInnerTexts()).map(n);
ok(JSON.stringify(neckRows) === JSON.stringify(m.lines.map(n)), `2 what holds each line: a row a line (${neckRows.length})`);
const risks = (await page.locator('[data-ov="risks"] .ov-risk').allInnerTexts()).map(n);
ok(JSON.stringify(risks) === JSON.stringify(m.risks.map(n)), `2 what needs attention as the module says: ${risks.length}`);
ok(n(await t.words('[data-ov="improved"] .ov-says')) === n(m.improved), `2 what has improved: "${m.improved}"`);
const fold = page.locator('.fold', { hasText: 'Where we have looked' }).first();
ok((await fold.count()) === 1 && !(await fold.evaluate(e => e.classList.contains('is-open'))) && n(await fold.innerText()).includes(n(m.cover)), `2 where we have looked: a fold, shut, saying "${m.cover}"`);
await fold.locator('.fold-toggle').click(); await page.waitForTimeout(300);
ok((await page.locator('[data-ov-cover]').count()) === m.lines.length, '2 opened: a row for every line of the customer');

/* ---- 3 · the baseline ---- */
ok(/^No baseline yet/.test(n(await t.words('[data-ov="progress"] .ov-says'))) && (await page.locator('[data-ov="progress"] a[href="#/story"]').count()) === 1, '3 no baseline said, with the way to the Story');
await page.evaluate(async client => {
  const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts');
  const { productionLines } = await import('/src/lib/lines.ts'); const { linesOfClient, snapshotOf } = await import('/src/lib/clientStory.ts');
  const { loadFactoryRead } = await import('/src/lib/useFactoryRead.ts');
  const lines = linesOfClient(productionLines(await db.listWorkspaces()), client);
  const read = await loadFactoryRead((await db.allProjects()).filter(p => !p.deletedAt && !p.archivedAt), lines);
  const at = Date.UTC(2026, 8, 1, 12);
  const snap = snapshotOf({ at, lines, wrong: read.wrong, actions: read.actions, proved: read.proved, studies: read.studies, today: read.today });
  /* the figures of that day, frozen: three more open, one more critical than now */
  const frozen = { ...snap, found: { ...snap.found, open: snap.found.open + 3, critical: snap.found.critical + 1 } };
  await db.putStudy({ id: uid(), tool: 'story', name: `${client} — the story`, agreed: { story: { client, brief: 'Why are we losing output?', startedAt: at } },
    facts: { chapters: [{ id: uid(), at, from: at, headline: 'Where it stood', narrative: ['The first look.'], snapshot: frozen, since: {}, by: 'assembled', approvedAt: at }] }, uses: [], startedAt: at, createdAt: at, updatedAt: at });
}, CLIENT);
await page.waitForTimeout(1800);
m = await moduleSays();
ok(m.rows.length === 5 && n(await t.words('[data-ov="progress"] .ov-says')) === n(m.progress) && /1 September 2026/.test(m.progress), `3 the first chapter is the baseline, with no reload: "${m.progress}"`);
const moved = await page.locator('[data-ov-moved]').evaluateAll(trs => trs.map(tr => [...tr.children].map(c => c.textContent.trim())));
ok(moved.length === 5 && m.rows.every((r, k) => moved[k][0] === r.k && moved[k][1] === r.before && moved[k][2] === r.now), `3 then and now a row a figure: ${moved.map(r => `${r[0]} ${r[1]}→${r[2]}`).join(' · ')}`);
ok(moved[0][3] === 'Better' && moved[1][3] === 'Better', '3 fewer open and fewer critical said Better, in words');

/* ---- 4 · living ---- */
const before = Number(m.open);
await page.evaluate(async ws => { const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts'); const t0 = Date.now(); await db.addSnag({ id: uid(), workspaceId: ws, problem: 'Guard interlock bypassed at the sealer', status: 'open', priority: 'critical', raisedAt: t0, createdAt: t0, updatedAt: t0, media: [] }); }, sd.wsId);
await page.waitForTimeout(2200);
m = await moduleSays();
ok(Number(m.open) === before + 1 && (await tilesOn()).some(x => x === n(`Open problems ${before + 1}`)), `4 a problem raised moves the open count with no reload: ${before} → ${m.open}`);
ok((await page.locator('[data-ov-loss] .ov-what').allInnerTexts()).some(x => /Guard interlock/.test(x)) || m.losses.length === 8, '4 and it is on the page among the losses (or the eight shown are costlier)');

/* ---- 5 · the paper ---- */
const pdf = await t.pdfText(() => paper(page, 'Factory overview'), 'overview');
const has = s => pdf.includes(n(s));
ok(has('FACTORY OVERVIEW') && pdf.includes(CLIENT), '5 the paper: the band and the customer');
ok(['What is costing the most', 'What holds each line', 'Where we have looked', 'What needs attention', 'What has improved', 'Since the baseline', 'What the figures rest on'].every(h => pdf.toLowerCase().includes(h.toLowerCase())), '5 every section on the paper');
const flat = pdf.replace(/\s+/g, ' ');
ok(m.losses.every(l => flat.includes(n(l).slice(0, 28))), '5 each loss on the paper');
ok(m.rows.every(r => flat.includes(`${r.k}: ${n(r.before)} then, ${n(r.now)} now`)), '5 the baseline rows on the paper, then and now');
ok(flat.includes(n(m.cover).slice(0, 40)), '5 where we have looked, in the module’s words');

/* ---- 6 · Present ---- */
await page.getByRole('button', { name: 'Present', exact: true }).first().click(); await page.waitForTimeout(2500);
ok((await page.locator('[data-overview-present]').count()) === 1 && (await page.locator('.nv-rail').count()) === 0, '6 Present: full screen, no frame');
ok(n(await t.words('.st-present-brief')) === n(m.says) && (await page.locator('.st-present-fig').count()) === 4, '6 the sentence and the four figures, large');
await page.keyboard.press('Escape'); await page.waitForTimeout(1500);
ok((await page.locator('[data-overview]').count()) === 1 && (await page.locator('.nv-rail').count()) > 0, '6 Escape back to the page');

/* ---- 7 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 }); await t.go('#/overview', 4000);
const short = await page.locator('.ov-row').evaluateAll(els => els.filter(e => e.getBoundingClientRect().height < 43.5).length);
ok((await t.wide()) <= 1 && short === 0 && (await page.locator('[data-overview] .ln-tile').count()) === 4, `7 the phone: nothing off the side (${await t.wide()}), every row 44 px, the tiles there`);

await t.finish('The factory overview: read from the records, living, against its baseline, on paper and in the room.');
