/* FC-005 — THE WASTE WALK: the eight wastes seen, classed and costed (knowledge/specs/FC-005-waste-walk.md; 1 November 2026).
 * The smoke seed's line is given a crew of 4 at £25 an hour, 110 packs a minute, a 20p margin and 50p of materials a pack (its bottleneck, by
 * Line capacity, is the Packer), and seven problems are put on it, each a different waste, each sized — the knowledge record's packing line, the
 * numbers worked by hand in scripts/knowledge/cases-kaizen.py section W:
 *
 *   1  Problems › By waste: the panel's sentence, its seven rows in the ranked order with their money in the parts the record gives
 *      (£600 labour · 39,600 packs lost · £7.9k contribution a day for Waiting …), where, the last four weeks — the independent literals,
 *      and the module's own sentences on the same records
 *   2  the problems grouped by waste in the same order; the unclassed ones last
 *   3  a problem classed in its editor — the eight chips and Not a waste, the kind saying what it means and where it points; kept after a reload;
 *      its row naming the class; the walk moving without a reload; a problem put right leaving the money and being counted as put right
 *   4  the paper: the Problems report carries THE EIGHT WASTES SEEN with the sentences, the problem's report card names its waste
 *   5  the cloud row: no column — the class rides as one waste:<kind> entry in linked_obs_ids, only for a problem that has been classed
 *   6  the phone: the panel, the chips (48 px) and the editor, nothing off the side
 *
 *   node scripts/acceptance/waste-walk.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { paper } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {} } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const dir = mkdtempSync(join(tmpdir(), 'waste-'));
const readPdf = async (d, file) => { const f = join(dir, file); await d.saveAs(f); return execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).replace(/\s+/g, ' '); };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const go = async (h, ms = 1800) => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(ms); };
await go('#/room', 3000);
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());

/* ---- the line, and seven problems of known size (the record's packing line; sizes per day) */
const made = await page.evaluate(async (wsId) => {
  const db = await import('/src/db.ts');
  const ws0 = await db.getWorkspace(wsId);
  await db.updateWorkspace({ ...ws0, crew: 4, labourRatePerHour: 25, labourBurden: undefined, packsPerMin: 110, marginPerPack: 0.2, materialsPerPack: 0.5 });
  const t = Date.now(), D = 86_400_000;
  const mk = (problem, waste, machine, size) => ({ id: crypto.randomUUID(), workspaceId: wsId, problem, status: 'open', raisedAt: t - 3 * D, updatedAt: t, media: [], targetAsset: machine, ...(waste ? { waste } : {}), ...size });
  const list = [
    mk('Pallets wait for QA release', 'waiting', 'Packer', { minutesPerDay: 360 }),
    mk('Film walked from the store', 'transport', 'Labeller', { minutesPerDay: 48 }),
    mk('Reaching over the guard', 'motion', 'Labeller', { minutesPerDay: 20 }),
    mk('Double label check', 'overprocessing', 'Labeller', { minutesPerDay: 30 }),
    mk('Light packs reworked', 'defects', 'Sealer', { rejectsPerDay: 300 }),
    mk('Packs held warm for release', 'inventory', 'Chiller', { heldPacks: 36000 }),
    mk('Short-life product dumped', 'overproduction', 'Wrapper', { rejectsPerDay: 80 }),
    mk('Applicator needs cleaning twice a shift', undefined, 'Labeller', {}),    // looked at, not classed yet
  ];
  for (const s of list) await db.addSnag(s);
  const open = (await db.listAllSnags()).filter(s => s.workspaceId === wsId && !s.deletedAt && s.status !== 'closed' && !s.archivedAt);
  return { ids: Object.fromEntries(list.map(s => [s.problem, s.id])), unclassed: open.filter(s => !s.waste).length };
}, sd.wsId);
await page.waitForTimeout(1200);
const un = made.unclassed;

/* the independent literals (cases-kaizen.py W) */
const SAYS = `7 open problems classed as waste (${un} more not yet classed). The biggest is Waiting: £600 labour · 39,600 packs lost · £7.9k contribution a day, most of it at Packer.`;
const ROWS = [
  ['Waiting', '1 problem open: £600 labour · 39,600 packs lost · £7.9k contribution a day.'],
  ['Defects', '1 problem open: £150 materials a day.'],
  ['Transport', '1 problem open: £80 labour a day.'],
  ['Over-processing', '1 problem open: £50 labour a day.'],
  ['Over-production', '1 problem open: £40 materials a day.'],
  ['Motion', '1 problem open: £33 labour a day.'],
  ['Inventory', '1 problem open: £18.0k of product tied up.'],
];
const PLACES = 'Where: Packer (1 problem, £8.5k a day), Labeller (3 problems, £163 a day), Sealer (1 problem, £150 a day) and 2 more places.';
const FOUND = 'Last 4 weeks: 7 wastes raised, 0 put right, 7 still open.';
const NEXT = 'Waiting points to Stops Pareto (FC-052) and Andon calls (FC-015).';

const modSays = () => page.evaluate(async (wsId) => {
  const db = await import('/src/db.ts'); const R = await import('/src/lib/snagsReport.ts'); const { problemCost } = await import('/src/lib/problemCost.ts'); const { neckOf } = await import('/src/lib/lineLoss.ts');
  const ws = await db.getWorkspace(wsId); const snags = (await db.listAllSnags()).filter(s => s.workspaceId === wsId && !s.deletedAt && !s.archivedAt);
  const frames = await db.listSnagAssets(wsId); const neck = neckOf(await db.listAllStandards(), wsId);
  const r = R.snagsReading({ snags, lineName: () => ws.name, assetName: s => (s.assetId ? frames.find(a => a.id === s.assetId)?.name : undefined), jobName: () => undefined, became: new Map(), register: true,
    costOf: s => problemCost(s, s.assetId ? frames.find(a => a.id === s.assetId)?.name : s.targetAsset, ws, neck) });
  const w = r.wastes; return { says: w.says, lines: w.lines.map(l => [l.name, l.words]), places: (await import('/src/tools/waste/waste.ts')).placesSays(w), found: w.foundSays, next: w.next, neck: neck?.names ?? null };
}, sd.wsId);

/* 1 — Problems › By waste */
await go(`#/snags?line=${sd.wsId}`);
await page.getByRole('button', { name: 'By waste' }).click(); await page.waitForTimeout(600);
const panel = page.locator('[data-waste-walk]');
ok(await panel.count() === 1, '1 By waste draws the walk');
const mod = await modSays();
ok(mod.neck?.includes('Packer'), '0 the line’s bottleneck is the Packer, from Line capacity', JSON.stringify(mod.neck));
ok(flat(await panel.locator('.ws-says').innerText()) === SAYS, `1 the sentence is the independent one: "${SAYS}"`, await panel.locator('.ws-says').innerText());
ok(mod.says === SAYS, '1 …and the module’s own', mod.says);
const rows = await panel.locator('.ws-row').evaluateAll(els => els.map(e => [e.querySelector('.ws-name').textContent.trim(), e.querySelector('.ws-words').textContent.trim()]));
ok(JSON.stringify(rows) === JSON.stringify(ROWS), '1 the seven kinds in the ranked order — Waiting, Defects, Transport, Over-processing, Over-production, Motion, Inventory — each with its money in its own parts', JSON.stringify(rows));
ok(JSON.stringify(mod.lines.map(l => [l[0], l[1].slice(l[0].length + 3)])) === JSON.stringify(ROWS), '1 …and the module’s own rows say the same');
ok(flat(await panel.locator('.ws-places').innerText()) === PLACES && mod.places === PLACES, `1 where: "${PLACES}"`, await panel.locator('.ws-places').innerText());
ok(flat(await panel.locator('.ws-found').innerText()) === FOUND && mod.found === FOUND, `1 the last four weeks: "${FOUND}"`);
ok(flat(await panel.locator('.ws-next').innerText()) === NEXT && mod.next === NEXT, `1 where the biggest points: "${NEXT}" — and Heijunka (FC-011) is said not built where it is the pointer`, await panel.locator('.ws-next').innerText());
const overp = await page.evaluate(async () => { const { pointsSays } = await import('/src/tools/waste/waste.ts'); const { entryById } = await import('/src/catalogue/index.ts'); return pointsSays('overproduction', id => entryById(id)?.status); });
ok(overp === 'Heijunka box (FC-011, not built yet)', '1 an unbuilt tool is said not built', overp);

/* 2 — grouped by waste (the line's own groups; the project's problems come after them under their own heading) */
const WANT = ['Waiting', 'Defects', 'Transport', 'Over-processing', 'Over-production', 'Motion', 'Inventory', ...(un ? ['Not classed yet'] : [])];
const secs = await page.locator('section.qsl-g').evaluateAll(els => els.map(e => ({ name: (e.querySelector('.qsl-gh h2')?.textContent ?? '').trim(), rows: e.querySelectorAll('.qsl-row').length })));
const mine = secs.filter(x => WANT.includes(x.name));
ok(JSON.stringify(mine.map(x => x.name)) === JSON.stringify(WANT), '2 the groups are the kinds in the walk’s order, the unclassed last', secs.map(x => x.name).join(' | '));
ok(mine.reduce((n, x) => n + x.rows, 0) === 7 + un, `2 every problem of the line once (${7 + un})`, JSON.stringify(mine));

/* 3 — classed in the editor */
const target = await page.evaluate(async (wsId) => { const db = await import('/src/db.ts'); return (await db.listAllSnags()).find(s => s.workspaceId === wsId && !s.waste && !s.deletedAt && !s.archivedAt && s.status !== 'closed')?.id; }, sd.wsId);
await page.getByRole('button', { name: 'By line' }).click(); await page.waitForTimeout(500);
const trow = page.locator('.qsl-row').filter({ has: page.locator(`#problem-${target}`) }).or(page.locator(`#problem-${target}`)).first();
await trow.locator('.qsl-open').click(); await page.waitForTimeout(500);
const chips = trow.locator('.ws-chips .chip');
ok(await chips.count() === 9, '3 the eight chips and Not a waste', await chips.count());
ok((await chips.allInnerTexts()).map(flat).join('|') === 'Transport|Inventory|Motion|Waiting|Over-production|Over-processing|Defects|Unused talent|Not a waste', '3 in the order Ohno and Liker give them', (await chips.allInnerTexts()).join('|'));
ok(/Not classed yet/.test(await trow.locator('.ws-means').innerText()), '3 not classed yet, said');
await chips.filter({ hasText: /^Waiting$/ }).click(); await page.waitForTimeout(700);
ok(/^People or product idle, waiting for the step before\. A pallet waiting for QA release; the packer waiting for film\. Size it in minutes a day below\. Points to Stops Pareto \(FC-052\) and Andon calls \(FC-015\)\.$/.test(flat(await trow.locator('.ws-means').innerText())), '3 the kind says what it means, an example, how to size it and where it points', await trow.locator('.ws-means').innerText());
ok(await page.evaluate(async id => (await (await import('/src/db.ts')).listAllSnags()).find(s => s.id === id)?.waste, target) === 'waiting', '3 kept on the problem');
await page.reload(); await page.waitForTimeout(2200);
ok(await page.evaluate(async id => (await (await import('/src/db.ts')).listAllSnags()).find(s => s.id === id)?.waste, target) === 'waiting', '3 …and after a reload');
const meta = flat(await page.locator('.qsl-row', { hasText: await page.evaluate(async id => (await (await import('/src/db.ts')).listAllSnags()).find(s => s.id === id)?.problem, target) }).first().locator('.qsl-meta').first().innerText());
ok(/Waiting waste/.test(meta), `3 its row names the class — "${meta}"`);
/* the walk moves without a reload: 8 classed, the unclassed one fewer */
await page.getByRole('button', { name: 'By waste' }).click(); await page.waitForTimeout(600);
const says8 = flat(await page.locator('[data-waste-walk] .ws-says').innerText());
ok(says8.startsWith(`8 open problems classed as waste${un - 1 > 0 ? ` (${un - 1} more not yet classed)` : ''}.`), `3 the walk moved: "${says8.slice(0, 100)}"`);
/* Not a waste: neither classed nor waiting to be */
await page.getByRole('button', { name: 'By line' }).click(); await page.waitForTimeout(400);
const prob2 = await page.evaluate(async ([id, ws]) => { const s = (await (await import('/src/db.ts')).listAllSnags()).find(x => x.workspaceId === ws && !x.waste && !x.deletedAt && !x.archivedAt && x.status !== 'closed' && x.id !== id); return s ? { id: s.id, problem: s.problem } : null; }, [target, sd.wsId]);
ok(!!prob2, '3 another problem to say is not a waste');
if (prob2) {
  const r2 = page.locator('.qsl-row', { hasText: prob2.problem }).first();
  await r2.locator('.qsl-open').click(); await page.waitForTimeout(400);
  await r2.locator('.ws-chips .chip', { hasText: 'Not a waste' }).click(); await page.waitForTimeout(600);
  ok(await page.evaluate(async id => (await (await import('/src/db.ts')).listAllSnags()).find(s => s.id === id)?.waste, prob2.id) === 'none', '3 Not a waste is kept as the answer “none”, told apart from not classed yet');
  ok(/Said not to be a waste/.test(await r2.locator('.ws-means').innerText()), '3 …and said');
  await r2.locator('.qsl-open').click(); await page.waitForTimeout(300);
  await page.evaluate(async id => { await (await import('/src/db.ts')).patchSnag(id, { waste: undefined }); }, prob2.id);
}
/* put right: a closed waste leaves the money and is counted as put right */
await page.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchSnag(id, { status: 'closed', closedAt: Date.now() }); }, made.ids['Light packs reworked']);
await page.waitForTimeout(900);
await page.getByRole('button', { name: 'By waste' }).click(); await page.waitForTimeout(600);
const lines2 = (await page.locator('[data-waste-walk] .ws-row').evaluateAll(els => els.map(e => [e.querySelector('.ws-name').textContent.trim(), e.querySelector('.ws-words').textContent.trim()])));
const def = lines2.find(r => r[0] === 'Defects');
ok(def?.[1] === 'none open, 1 put right.', '3 a waste put right leaves the money and is counted as put right', JSON.stringify(def));
ok(/Last 4 weeks: 8 wastes raised, 1 put right, 7 still open\./.test(flat(await page.locator('[data-waste-walk] .ws-found').innerText())), '3 …and the last four weeks say it', await page.locator('[data-waste-walk] .ws-found').innerText());
await page.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchSnag(id, { status: 'open', closedAt: undefined }); }, made.ids['Light packs reworked']);
await page.waitForTimeout(700);

await page.evaluate(async id => { await (await import('/src/db.ts')).patchSnag(id, { waste: undefined }); }, target);   // back to the record's seven, for the paper
await page.waitForTimeout(700);

/* 4 — the paper */
await page.getByRole('button', { name: 'By line' }).click(); await page.waitForTimeout(400);
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), paper(page, 'Problems report')]);
const txt = await readPdf(dl, 'problems.pdf');
page.locator('.pdfr-x').click().catch(() => {});
ok(/THE EIGHT WASTES SEEN/.test(txt), '4 the Problems report has THE EIGHT WASTES SEEN');
ok(txt.includes('The biggest is Waiting: £600 labour · 39,600 packs lost · £7.9k contribution a day, most of it at Packer.'), '4 …with the sentence as the page says it', txt.slice(txt.indexOf('THE EIGHT'), txt.indexOf('THE EIGHT') + 400));
ok(ROWS.every(([n, w]) => txt.includes(`${n} — ${w}`) || txt.includes(`${n} — ${w.replace('1 problem open: ', '1 problem open: ')}`)), '4 …every kind with its money', ROWS.filter(([n, w]) => !txt.includes(`${n} — ${w}`)).map(r => r[0]).join(','));
ok(txt.includes(PLACES) && txt.includes(FOUND) && txt.includes(NEXT), '4 …where they are, the last four weeks and where the biggest points');
ok(/Estimates from a walk are indicative/.test(txt) && /not waste to remove, though they may be waste to shorten/.test(txt), '4 …and what the walk does not claim');
ok(/Waiting waste/.test(txt), '4 a row on the paper names its class');
/* the card */
await page.getByRole('button', { name: 'By line' }).click();
const pr = page.locator('.qsl-row', { hasText: 'Pallets wait for QA release' }).first();
await pr.locator('.qsl-open').click(); await page.waitForTimeout(500);
const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 30000 }), pr.getByRole('button', { name: 'Report card (PDF)' }).click()]);
const ct = await readPdf(dl2, 'card.pdf');
ok(/Waste: Waiting\./.test(ct) && /360 min a day at Packer, the bottleneck: £600 labour · 39,600 packs lost · £7,920 contribution|£7\.9k contribution/.test(ct), '4 the problem’s report card says its waste and its cost', ct.slice(0, 500));
page.locator('.pdfr-x').click().catch(() => {});
await pr.locator('.qsl-open').click().catch(() => {});

/* 5 — the cloud row */
const wire = await page.evaluate(async () => {
  const { MAPS } = await import('/src/cloud/mappers.ts');
  const base = { id: 'x', workspaceId: 'w', problem: 'p', status: 'open', raisedAt: 1, updatedAt: 1, linkedObsIds: ['o1'] };
  const up = w => MAPS.snags.toRow(w === undefined ? base : { ...base, waste: w }, 'u');
  const down = r => MAPS.snags.fromRow({ ...r });
  return { column: 'waste' in up('waiting'), plain: up(undefined).linked_obs_ids, classed: up('waiting').linked_obs_ids, none: up('none').linked_obs_ids,
    back: down(up('motion')), noneBack: down(up('none')).waste, never: down(up(undefined)).waste,
    bad: down({ ...up(undefined), linked_obs_ids: ['o1', 'waste:muda'] }) };
});
ok(wire.column === false && JSON.stringify(wire.plain) === '["o1"]' && JSON.stringify(wire.classed) === '["o1","waste:waiting"]' && JSON.stringify(wire.none) === '["o1","waste:none"]'
  && wire.back.waste === 'motion' && JSON.stringify(wire.back.linkedObsIds) === '["o1"]' && wire.noneBack === 'none' && wire.never === undefined && wire.bad.waste === undefined,
  '5 NO COLUMN: the class rides in the row’s linked_obs_ids as one waste:<kind> entry, goes up only for a problem that has been classed, comes back as it went and is taken out of the links; a word that is not one of the eight is not believed', JSON.stringify(wire));

/* 6 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/snags?line=${sd.wsId}`);
await page.getByRole('button', { name: 'By waste' }).click(); await page.waitForTimeout(600);
ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '6 the phone: the walk, nothing off the side');
await page.getByRole('button', { name: 'By line' }).click(); await page.waitForTimeout(400);
const pr2 = page.locator('.qsl-row', { hasText: 'Film walked from the store' }).first();
await pr2.locator('.qsl-open').click(); await page.waitForTimeout(600);
ok((await page.evaluate(() => document.scrollingElement.scrollWidth)) <= 390, '6 the editor with its chips, nothing off the side');
const hs = await pr2.locator('.ws-chips .chip').evaluateAll(els => els.map(e => Math.round(e.getBoundingClientRect().height)));
ok(hs.length === 9 && hs.every(h => h >= 44), `6 every chip a thumb’s height (${hs.join(', ')})`);

ok(!errors.length, `no console errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
await browser.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
