/* ACCEPTANCE — AREAS (9 November — Rowland: "we now have areas in set up. So on factory page we need area.. then each area will have
 * lines in them we need area reports show everything happening in the area"; lib/areas, src/line/area/AreaScreen,
 * src/line/report/areaBundle, areaBundlePdf, AreaReportScreen). Driven in a real browser on the smoke seed, its lines put in two
 * areas of one site by seedAreasForTest, one line added with no area and a dual line made in the packing hall:
 *
 *   1  the Factory's Lines tab: each area a section — its name, its sentence equal to the module's (lib/areas areaSays over
 *      src/line/report/areaBundle), Open the area ›, Area report — its lines under it; the line with no area under No area yet with
 *      Set up the lines ›
 *   2  Open the area › — the area's page: the Lines tab lit, the context bar Factory › Hull › Packing hall, only its lines (the dual
 *      line once among them), the sentence and tiles the module's, what needs doing naming its lines and nothing of another area;
 *      a problem raised on one of its lines on the page with no reload, opening its record
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
  const { areaSays, areaTiles } = await import('/src/lib/areas.ts');
  const { allPaceLines } = await import('/src/db/pace.ts');
  const { listAllPrograms } = await import('/src/db/programs.ts');
  const { listAllAssets } = await import('/src/db/testing.ts');
  const [all, machines, programs, standards, jobLines, jobs, studies, snags] = await Promise.all([db.listWorkspaces(), listAllAssets(), listAllPrograms(), db.listAllStandards(), allPaceLines(), db.allProjects(), db.listAllStudies(), db.listAllSnags()]);
  const lines = await liveProductionLines(all);
  const on = new Map(await Promise.all(lines.map(async w => [w.id, await db.projectsOnWorkspace(w.id)])));
  const live = new Map(jobs.filter(j => !j.deletedAt && !j.archivedAt).map(j => [j.id, j.name]));
  const b = areaBundle(area, { lines: all, machines, programs, jobLines, snags, standards: standards.filter(s => !s.deletedAt), studies, projectsOn: id => (on.get(id) ?? []).flatMap(p => (live.has(p) ? [{ id: p, name: live.get(p) }] : [])) });
  return { says: areaSays(b.facts).text, tiles: areaTiles(b.facts).map(x => `${x.k} ${x.v}`), lines: b.lines.map(w => w.name), actions: b.actions.length, otherLines: all.filter(w => !b.lines.some(x => x.id === w.id)).map(w => w.name) };
}, area);
const norm = s => s.replace(/\s+/g, ' ').trim();
/* the secondary sections sit in ui/Fold, shut on arrival (10 November, docs/DESIGN.md) — opened here before they are read */
const openFolds = async scope => { for (let i = 0; i < 20; i++) { const b = page.locator(`${scope} .fold:not(.is-open) .fold-toggle`).first(); if (!(await b.count())) break; await b.click(); await page.waitForTimeout(150); } };
const PACKING = { site: ar.site, area: ar.packing }, DESPATCH = { site: ar.site, area: ar.despatch };

/* ---- 1 · the Lines tab ---- */
await t.go('#/room', 3500);
const heads = await page.locator('.fac-area .fac-place-h').allInnerTexts();
ok(JSON.stringify(heads) === JSON.stringify(['Hull › Despatch', 'Hull › Packing hall']), `1 the Lines tab: an area a section — ${heads.join(' and ')}`);
const mp = await moduleSays(PACKING), md = await moduleSays(DESPATCH);
const sayP = norm(await t.words('.fac-area[data-place="Hull › Packing hall"] .fac-area-says'));
const sayD = norm(await t.words('.fac-area[data-place="Hull › Despatch"] .fac-area-says'));
ok(sayP === mp.says && sayD === md.says, `1 each area's sentence the module's — "${sayP}" · "${sayD}"`);
const inP = await page.locator('.fac-area[data-place="Hull › Packing hall"] .fac-card-name').allInnerTexts();
ok(inP.length === 3 && inP.includes('Line 7 pair') && !inP.includes('Line 2A — capacity'), `1 the packing hall's lines under it: ${inP.join(', ')}`);
ok((await page.locator('.fac-area[data-place="Hull › Packing hall"] .fac-area-open').innerText()) === 'Open the area ›' && (await page.locator('.fac-area .fac-area-report').count()) === 2, '1 each area: Open the area › and Area report');
const loose = await page.locator('.fac-noarea .fac-card-name').allInnerTexts();
ok((await t.words('.fac-noarea .fac-place-h')) === 'No area yet' && JSON.stringify(loose) === JSON.stringify(['Line 9 — loose']) && /Set up the lines/.test(await t.words('.fac-noarea .fac-area-acts')), `1 the line with no area under No area yet (${loose.join(', ')}) with Set up the lines ›`);

/* ---- 2 · the area's page ---- */
await page.locator('.fac-area[data-place="Hull › Packing hall"] .fac-area-open').click(); await page.waitForTimeout(3000);
const hash = await page.evaluate(() => location.hash);
ok(/^#\/area\?/.test(hash) && /site=Hull/.test(hash) && /area=Packing\+hall|area=Packing%20hall/.test(hash), `2 Open the area › lands on ${hash}`);
ok((await t.words('.nv-tabs .nv-tab.is-on')) === 'Lines' && /Factory/.test(await t.words('.nv-ctx .nv-here')) && /Hull › Packing hall/.test(await t.words('.nv-ctx')), `2 the Lines tab lit, the bar "${norm(await t.words('.nv-ctx'))}"`);
const cards = await page.locator('.ar-page .fac-card-name').allInnerTexts();
ok(JSON.stringify([...cards].sort()) === JSON.stringify([...mp.lines].sort()) && cards.filter(n => n === 'Line 7 pair').length === 1 && !cards.includes('Line 2A — capacity') && !cards.includes('Line 9 — loose'), `2 only its lines, the dual line once: ${cards.join(', ')}`);
ok(norm(await t.words('.ar-page .part-head .ar-says')) === mp.says, '2 the area in a sentence, as the module says it');
const tiles = (await page.locator('.ar-page .sg-tiles .ln-tile').allInnerTexts()).map(x => norm(x));
ok(tiles.length === 5 && mp.tiles.every((k, i) => tiles[i].toLowerCase().startsWith(k.toLowerCase())), `2 its tiles — ${tiles.map(x => x.split(' ').slice(0, 3).join(' ')).join(' · ')}`);
const rowLines = await page.locator('.ar-todo .ar-row, .ar-prove .ar-row').evaluateAll(els => els.map(e => e.getAttribute('data-line')));
ok(rowLines.length === mp.actions && rowLines.every(l => mp.lines.includes(l)), `2 what needs doing and the programs to prove: ${rowLines.length} rows, each naming one of its lines`);
const before = await page.locator('.ar-todo .ar-row').count();
const raised = await page.evaluate(async ws => { const db = await import('/src/db.ts'); const { uid } = await import('/src/lib/ids.ts'); const id = uid(); await db.addSnag({ id, workspaceId: ws, problem: 'Film tension slipping at the bagger — raised now', status: 'open', priority: 'critical', raisedAt: Date.now(), updatedAt: Date.now(), media: [] }); return id; }, ar.packingIds[0]);
await page.waitForTimeout(2500);
const row = page.locator('.ar-todo .ar-row', { hasText: 'Film tension slipping at the bagger' });
ok((await page.locator('.ar-todo .ar-row').count()) === before + 1 && (await row.count()) === 1, '2 a problem raised on one of its lines is on the area\'s page with no reload');
ok(norm(await t.words('.ar-page .part-head .ar-says')) === (await moduleSays(PACKING)).says, '2 the sentence moved with it, still the module\'s');
await row.click(); await page.waitForTimeout(2000);
ok((await page.evaluate(() => location.hash)).includes(`open=${raised}`), '2 its row opens the problem on its line\'s Problems');
await page.goBack(); await page.waitForTimeout(2500);
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
  return b.parts.map(p => { const c = cardsShown(cardsOf(p.items)); return { line: p.line.name, shown: c.shown.map(x => ({ key: x.it.key, tool: x.it.tool, name: x.it.name, says: x.it.says })), more: c.more }; });
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
await t.go(`#/area?site=Hull&area=Packing%20hall`, 3000);
const w2 = await t.wide();
const tap = await page.locator('.ar-todo .ar-row').first().boundingBox();
await t.go(`#/area/report?site=Hull&area=Packing%20hall`, 3500);
const w3 = await t.wide();
ok(w1 <= 1 && w2 <= 1 && w3 <= 1 && (tap?.height ?? 0) >= 44, `4 the phone: nothing off the side (${w1}, ${w2}, ${w3}), a row a thumb's height`);

await t.finish('Areas accepted: the Lines tab an area a section with its sentence, the area\'s page with only its lines and what needs doing, live, and the area report read back with each line\'s part, the dual line once and the area together.');
