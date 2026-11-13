/* ACCEPTANCE — THE LINE PAGE AS EVIDENCE (13 November, the line-page brief; src/line/glance, src/ui/EvidenceCard). Rowland: "each card
 * already showing its tool's own result, the headline figure and the graph the tool produced, so the page reads as evidence. Tapping a
 * card expands it in place, and a button then takes me to the full tool. Grouped by kind"; "every number on a card must match the number
 * on its tool page"; "What we produced … so SOPs, work instructions, PM lists and manuals have somewhere to land."
 *
 *   1  WHAT WE FOUND — a card for each tool in use on the line, newest first, under the tiles; All tools on this line a 44 px button
 *   2  Stops across workstations (the calculator's own worked example): the card's figures are the example's by hand (429 · 35.75 · 6),
 *      its picture the tool's own bars (a bar a workstation); and EVERY figure on the card equals the figure on the tool's own page
 *   3  Line capacity: the card's figures equal the capacity page's own tiles; its picture the tool's own bars (a bar a station)
 *   4  a card opens IN PLACE — still on the line's page — showing the rest of its figures and its picture whole; Open … › goes to that
 *      record's own page; a tool with no figures on a card yet says its sentence and makes none up
 *   5  WHAT WE PRODUCED — an SOP, a planned-maintenance list and a manual on the line, each a row of its kind opening its record; a
 *      document is not also a card under What we found; a line with none shows no such section
 *   6  the phone — one column, the picture under the figures, nothing off the side, every press 44 px
 *
 *   node scripts/acceptance/line-evidence.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { jsPDF } from 'jspdf';

const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
['Northfield VFB-240', 'Maintenance', 'Lubricate the jaw carriage linear bearings every 500 operating hours.', 'Replace the pull belts annually.'].forEach((l, k) => pdf.text(l, 56, 72 + k * 22));
const PDF64 = Buffer.from(pdf.output('arraybuffer')).toString('base64');

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const made = await page.evaluate(async b64 => {
  const db = await import('/src/db.ts'); const L = await import('/src/lib/lines.ts'); const C = await import('/src/tools/calc/calc.ts'); const R = await import('/src/tools/calc/registry.ts');
  const ids = await import('/src/lib/ids.ts').catch(() => null); const uid = ids?.uid ?? (() => crypto.randomUUID());
  const line = await L.addLineToFactory('Line E — evidence'); const empty = await L.addLineToFactory('Line F — nothing yet');
  await L.machineOntoLine(line.id, 'Bagger');
  const now = Date.now();
  /* the stops calculator's own first worked example, as a record on the line */
  const def = R.calcByKey('workstation-stops'); const ex = def.examples[0];
  const calc = C.newCalcStudy(def, { id: uid(), name: 'Cellox watch, Tuesday', workspaceId: line.id, now, inputs: ex.inputs });
  await db.putStudy(calc);
  /* a Line capacity with stations: the seed's, copied onto this line */
  const all = await db.listWorkspaces(); let src;
  for (const w of all) { for (const s of await db.listStandardsForLine(w.id)) if ((s.capacity?.stations?.length ?? 0) >= 3) src ??= s; }
  const std = { ...src, id: uid(), workspaceId: line.id, product: 'Maris Piper 2kg', updatedAt: now - 1000, createdAt: now - 1000 };
  await db.putStandard(std);
  /* a line balance on it has no figures on a card yet — said, none made up (Line Talk the same) */
  const seeded = await db.listAllStudies();
  const talk = seeded.find(s => s.tool === 'talk' && !s.deletedAt);
  if (talk) await db.putStudy({ ...talk, id: uid(), workspaceId: line.id, name: 'Line E — morning walk', updatedAt: now - 2000, startedAt: now - 2000 });
  /* what we produced: an SOP (a document), a PM list (a planned-maintenance log), a manual */
  const sop = seeded.find(s => s.tool === 'doc' && s.agreed?.doc?.key === 'sop') ?? seeded.find(s => s.tool === 'doc');
  const sopId = uid(); await db.putStudy({ ...sop, id: sopId, workspaceId: line.id, projectId: undefined, name: 'Bagger — film change', updatedAt: now - 3000 });
  const M = await import('/src/lib/manual/store.ts');
  const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const kept = await M.keepMachineDoc({ file: new Blob([bytes], { type: 'application/pdf' }), fileName: 'VFB-240 manual.pdf', lineId: line.id, machine: 'Bagger', docKind: 'manual' });
  const reg = await import('/src/capabilities/registry.ts');
  const pm = await reg.runCall({ now }, { id: 'x', name: 'make_pm_list', input: { documentId: kept.doc.id } }, { confirmed: true });
  return { line: line.id, empty: empty.id, calc: calc.id, std: std.id, sopId, sopKind: (await import('/src/tools/doc/doc.ts')).docTitle(sop), manual: kept.doc.id, pm: pm.data?.studyId, ex: ex.expect.tiles };
}, PDF64);

const cardTiles = key => page.locator(`[data-ev="${key}"] .ev-tile`).evaluateAll(els => els.map(e => [e.querySelector('.ev-tile-k')?.textContent ?? '', e.querySelector('.ev-tile-v')?.textContent ?? '']));
const pageTiles = () => page.locator('.ln-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent ?? '', e.querySelector('.ln-v')?.textContent ?? '']));
const openCard = async key => { const c = page.locator(`[data-ev="${key}"]`); if ((await c.getAttribute('data-ev-open')) !== '1') { await c.locator('[data-carry]').click(); await page.waitForTimeout(400); } };
const same = (a, b) => a.length > 0 && a.every(([k, v]) => b.some(([k2, v2]) => k2 === k && v2 === v));

await t.go(`#/lines/${made.line}`, 3500);

/* ---- 1 · WHAT WE FOUND ---- */
const order = await page.evaluate(() => { const y = s => document.querySelector(s)?.getBoundingClientRect().top ?? null; return { tiles: y('.pl .pl-tiles'), found: y('[data-found]'), produced: y('[data-produced]'), problems: y('.pl .pl-sec[aria-label="Problems on this line"]') }; });
ok(order.tiles != null && order.found != null && order.tiles < order.found && order.found < order.produced && order.produced < order.problems, `1 the tiles, then What we found, then What we produced, then Problems (${JSON.stringify(order)})`);
const keys = await page.locator('[data-ev]').evaluateAll(els => els.map(e => e.getAttribute('data-ev')));
ok(keys.includes('workstops') && keys.includes('linebalance') && keys.includes('talk') && !keys.includes('doc'), `1 a card a tool in use, a document not among them (${keys.join(', ')})`);
const allBtn = page.locator('[data-all-tools]');
ok((await allBtn.count()) === 1 && (await allBtn.evaluate(e => e.getBoundingClientRect().height)) >= 44, '1 All tools on this line is a button a thumb’s height, not a corner link');

/* ---- 2 · STOPS ACROSS WORKSTATIONS ---- */
await openCard('workstops');
const ct = await cardTiles('workstops');
const val = k => ct.find(([kk]) => kk === k)?.[1];
ok(val('Lost') === '429' && val('Stopped') === '35.75' && val('Stops') === '6' && val('Worst') === 'Sealer', `2 the card's figures are the worked example's, by hand: ${ct.map(x => x.join(' ')).join(' · ')}`);
ok(Object.entries(made.ex).every(([k, v]) => val(k) === v), '2 every figure of the calculator’s own example is on the open card');
const bars = await page.locator('[data-ev="workstops"] .ev-pic.is-full [data-bar]').evaluateAll(els => els.map(e => e.getAttribute('data-bar')));
ok(bars.length >= 3 && bars[0] === 'Sealer', `2 its picture is the tool's own bars, a bar a workstation, the worst first (${bars.join(', ')})`);
const says = await t.words('[data-ev="workstops"] .ev-says');
ok(/3 of 4 workstations stopped for 35\.75 minutes in all \(6 stops\), losing 429 kg/.test(says), `2 its finding is the calculator's own sentence: "${says.slice(0, 90)}"`);
ok(/#\/lines\//.test(await page.evaluate(() => location.hash)) && !(await page.evaluate(() => location.hash)).includes(made.calc), '4 opened in place — still on the line’s page');
await page.locator('[data-ev="workstops"] [data-ev-go]').click(); await page.waitForTimeout(2500);
const hash = await page.evaluate(() => location.hash);
ok(hash.includes(made.calc), `4 Open … › goes to that record's own page (${hash.slice(0, 70)})`);
const pt = await pageTiles();
ok(same(ct, pt), `2 EVERY figure on the card equals the figure on the tool's own page (${ct.length} figures; the page shows ${pt.map(x => x.join(' ')).join(' · ').slice(0, 120)})`);

/* ---- 3 · LINE CAPACITY ---- */
await t.go(`#/lines/${made.line}`, 3000);
const small = await page.locator('[data-ev="linebalance"] .ev-pic.is-small .cxb-g').count();
await openCard('linebalance');
const lt = await cardTiles('linebalance');
ok(lt.length >= 4 && lt[0][0] === 'The line makes' && /\d/.test(lt[0][1]), `3 Line capacity's card leads with what the line makes: ${lt.map(x => x.join(' ')).join(' · ')}`);
const stationBars = await page.locator('[data-ev="linebalance"] .ev-pic.is-full .cxb-g').count();
ok(small >= 1 && stationBars >= 1, '3 its picture is the tool’s own bars — small beside the figures, whole when opened');
await page.locator('[data-ev="linebalance"] [data-ev-go]').click(); await page.waitForTimeout(3000);
await page.waitForSelector('.ln-tiles .ln-tile', { timeout: 8000 }).catch(() => undefined);
const cp = await pageTiles();
ok(same(lt, cp), `3 EVERY figure on the capacity card equals the figure on the capacity page (${lt.length} figures; page: ${cp.map(x => x.join(' ')).join(' · ').slice(0, 140)})`);

/* ---- 4 · a tool with no figures on a card yet ---- */
await t.go(`#/lines/${made.line}`, 3000);
await openCard('talk');
ok((await page.locator('[data-ev="talk"] .ev-tile').count()) === 0 && (await t.words('[data-ev="talk"] .ev-says')).length > 5 && /Its figures and picture are on its own page/.test(await t.words('[data-ev="talk"] .ev-more')), '4 Line Talk’s card says its sentence and makes no figure up');
ok((await page.locator('[data-ev][data-ev-open="1"]').count()) === 1, '4 one card open, the rest shut');

/* ---- 5 · WHAT WE PRODUCED ---- */
const rows = await page.locator('[data-made]').evaluateAll(els => els.map(e => ({ id: e.getAttribute('data-made'), kind: e.querySelector('.pl-made-kind')?.textContent, name: e.querySelector('.pl-made-name')?.textContent, says: e.querySelector('.pl-made-says')?.textContent })));
const row = id => rows.find(r => r.id === id);
ok(rows.length === 3, `5 three things produced on this line (${rows.map(r => `${r.kind}: ${r.name}`).join(' · ')})`);
ok(row(made.sopId)?.kind === made.sopKind && row(made.sopId)?.name === 'Bagger — film change', `5 the document, by its kind (${row(made.sopId)?.kind})`);
ok(row(made.pm)?.kind === 'Planned maintenance list' && /2 tasks · Bagger/.test(row(made.pm)?.says ?? ''), `5 the PM list from the manual, with its tasks (${row(made.pm)?.says})`);
ok(row(made.manual)?.kind === 'Manual' && /Bagger · Manual · 1 page · 2 maintenance tasks with an interval read in it/.test(row(made.manual)?.says ?? ''), `5 the manual, on its machine, with what was read in it (${row(made.manual)?.says})`);
await page.locator(`[data-made="${made.pm}"]`).click(); await page.waitForTimeout(2500);
ok((await page.evaluate(() => location.hash)).includes(made.pm), '5 a row opens its record');
await t.go(`#/lines/${made.empty}`, 3000);
ok((await page.locator('[data-produced]').count()) === 0 && /No tool in use on this line yet/.test(await t.words('[data-found]')), '5 a line with nothing produced shows no such section, and says no tool is in use');

/* ---- 6 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await t.go(`#/lines/${made.line}`, 3000);
const ph = await page.evaluate(() => {
  const w = document.documentElement.clientWidth;
  const cards = [...document.querySelectorAll('[data-ev]')].map(e => e.getBoundingClientRect());
  const c = document.querySelector('[data-ev="workstops"]'); const m = c.querySelector('.ev-main').getBoundingClientRect(); const p = c.querySelector('.ev-pic')?.getBoundingClientRect();
  return { oneCol: cards.every(r => Math.abs(r.left - cards[0].left) < 2), under: !!p && p.top >= m.bottom - 2, wide: document.documentElement.scrollWidth - w,
    small: [...document.querySelectorAll('[data-carry], [data-all-tools], [data-made]')].map(e => Math.round(e.getBoundingClientRect().height)).filter(h => h < 44) };
});
ok(ph.oneCol && ph.under, '6 the phone: one column, the picture under the figures');
ok(ph.wide <= 0, `6 the phone: nothing off the side (${ph.wide})`);
ok(ph.small.length === 0, `6 the phone: every press 44 px (${ph.small.join(', ')})`);
await openCard('workstops');
ok((await page.locator('[data-ev="workstops"] [data-ev-go]').evaluate(e => e.getBoundingClientRect().height)) >= 44 && (await t.wide()) <= 0, '6 the phone: opened in place, the button a thumb’s height, still nothing off the side');

await t.finish('the line page as evidence: each tool’s own figures and picture on its card, opened in place, and what was produced on the line');
