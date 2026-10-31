/* ACCEPTANCE — SCORED REGISTER SHAPE (FC-064 criticality first; FC-144 impact and effort; FC-143 the Pugh matrix).
 * Table-driven over src/tools/scored/registry: every definition's worked example is run through its own module and held to its
 * independent expectation. The boxes-and-columns registers (criticality, impact and effort) have steps A–F; a MATRIX (Pugh) has steps 1–2.
 *
 *   0  criticality registered; its worked example classed as the independent case says (2 class A)
 *   A–F  every definition that is not a matrix, each worked example: the module against its independent literals (counts, order, tiles,
 *      verdict, money); the saved register opened — tiles, sentence, money, every row's cells equal the module's; the phone; the paper read
 *      back; the £ an hour offered and used; a register that starts blank made through New and typed into by hand (FC-144)
 *   1  every MATRIX definition's worked example run through its own module and equal to its expectation (the leader, every option's
 *      score, the verdict — scripts/knowledge/cases-pugh.py case 1)
 *   2  a MATRIX (FC-143 Pugh), for every definition that has one: a new ranking made through the sheet; criteria, weights, options and
 *      every mark typed through the real boxes; the verdict, sentence, tiles, closing line and the foot of the table equal to the
 *      module's AND to the independent literals; kept after a reload; one mark moving the lead; one weight making a tie; an option
 *      left out until marked and named; a removal undone; a cost typed beside the score; the paper downloaded and read back;
 *      the phone (nothing off the side of the page); a client changing nothing
 *   3  criticality unchanged on the page: a new ranking opens with its example, five machines, two class A
 */
import pkg from 'playwright';
import { paper as pressPaper } from '../lib/pageHeader.mjs';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
let failed = 0;
const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) failed++; };

const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch {} }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
await page.goto(`${BASE}/#/scored`);
await page.locator('.nv-main').waitFor({ timeout: 15000 });
await page.waitForTimeout(1200);

const defs = await page.evaluate(async () => (await import('/src/tools/scored/registry.ts')).SCORED.map(d => ({ key: d.key, fc: d.fc, title: d.title, example: d.examples[0] })));
ok(defs.some(d => d.key === 'criticality'), 'criticality registered');

const ex = defs.find(d => d.key === 'criticality')?.example;
const truth = await page.evaluate(async ex => {
  const { rankCriticality, summarizeCriticality } = await import('/src/lib/ie/criticality.ts');
  const rows = ex.rows.map(r => ({ ...r }));
  const ranked = rankCriticality(rows);
  if ('problems' in ranked) return { err: ranked.problems };
  const sum = summarizeCriticality(ranked.ok);
  return { verdict: sum.verdict, tiles: Object.fromEntries(sum.tiles.map(t => [t.k, t.v])), a: ranked.ok.filter(r => r.class === 'A').length };
}, ex);

ok(!truth.err, `independent case ${truth.err ?? ''}`);
ok(truth.a === 2, `class A count ${truth.a} (expect 2)`);
ok(truth.tiles['Class A'] === '2', `tile Class A ${truth.tiles['Class A']}`);

/* ---- EVERY DEFINITION, EVERY WORKED EXAMPLE (the shape is table-driven; FC-144 impact and effort joined it) ----
   A: the module's ranking and sentence against the example's independent literals (counts, order, tiles, verdict, money);
   B: a saved register of the example opened — its tiles, sentence, money lines and every row's cells equal the module's;
   C: the phone — nothing off the side; D: the paper downloaded and read back against the module;
   E: a definition that asks the £ an hour offers the line's and uses it. */
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const nows = s => String(s ?? '').replace(/\s+/g, '').replace(/[’‘]/g, "'").replace(/[\u2212\u2013]/g, '-');
const OUT = mkdtempSync(join(tmpdir(), 'scored-shape-'));
const errors = [];
page.on('pageerror', e => errors.push(e.message.split('\n')[0]));
page.on('console', m => { if (m.type() === 'error' && !/Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools/i.test(m.text())) errors.push(`console: ${m.text().slice(0, 200)}`); });
const { lineId } = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const w = await db.createWorkspace('Line 2');
  await db.updateWorkspace({ ...w, labourRatePerHour: 15, labourBurden: 1.2 });
  return { lineId: w.id };
});
const all = await page.evaluate(async () => (await import('/src/tools/scored/registry.ts')).SCORED.map(d => ({
  key: d.key, fc: d.fc, title: d.title, noun: d.noun ?? 'machine', asksRate: !!d.asksRate, blank: !!d.blank, matrix: !!d.matrix, examples: d.examples.map(e => ({ name: e.name, rate: e.rate ?? null, rows: e.rows, expect: e.expect })),
})));
ok(all.length >= 3 && all.some(d => d.matrix), `${all.length} definitions registered: ${all.map(d => d.key).join(', ')}`);

const truthOf = (key, ex) => page.evaluate(async ([key, rows, rate]) => {
  const { scoredByKey } = await import('/src/tools/scored/registry.ts');
  const { studyScored } = await import('/src/tools/scored/scored.ts');
  const x = studyScored({ agreed: { scored: { key, rows, ...(rate ? { rate } : {}) } } });
  if (!x || x.problems) return { err: x?.problems ?? ['no such register'] };
  const def = scoredByKey(key), ok = x.ranked.ok;
  return {
    verdict: x.result.verdict, sentence: x.result.sentence, money: x.result.money ?? [], closing: x.result.closing,
    tiles: Object.fromEntries(x.result.tiles.map(t => [t.k, t.v])),
    order: ok.map(r => r.name), counts: x.ranked.counts,
    cells: ok.map(r => ({ name: r.name, cols: (def.columns ?? []).map(c => c.of(r)) })),
    heads: (def.columns ?? []).map(c => c.label),
  };
}, [key, ex.rows, ex.rate]);

const openRecord = async (width, key, ex, rate) => {
  const id = await page.evaluate(async ([key, name, rows, rate, lineId]) => {
    const { putStudy } = await import('/src/db.ts');
    const { uid } = await import('/src/lib/ids.ts');
    const id = uid(), t = Date.now();
    await putStudy({ id, tool: 'scored', name, workspaceId: lineId, agreed: { scored: { key, rows, ...(rate ? { rate } : {}) } }, facts: {}, uses: [], startedAt: t, createdAt: t, updatedAt: t });
    return id;
  }, [key, `${key} — ${ex.name}`, ex.rows, rate, lineId]);
  await page.setViewportSize({ width, height: width < 900 ? 844 : 900 });
  await page.goto(`${BASE}/#/scored/${key}/${id}`);
  await page.locator('.ie-scored').waitFor({ timeout: 15000 });
  await page.waitForTimeout(600);
  return id;
};

for (const d of all.filter(x => !x.matrix)) {
  for (const [n, ex] of d.examples.entries()) {
    const tag = `${d.fc} ${d.key} example ${n + 1} (${ex.name})`;
    const t = await truthOf(d.key, ex);
    ok(!t.err, `A ${tag}: ranked ${t.err ?? ''}`);
    if (t.err) continue;
    const e = ex.expect;
    if (e.counts) ok(JSON.stringify(Object.fromEntries(Object.keys(e.counts).map(k => [k, t.counts[k]]))) === JSON.stringify(e.counts), `A ${tag}: counts ${JSON.stringify(t.counts)} = ${JSON.stringify(e.counts)}`);
    if (e.order) ok(JSON.stringify(t.order) === JSON.stringify(e.order), `A ${tag}: order ${t.order.join(' > ')}`);
    if (e.tiles) ok(Object.entries(e.tiles).every(([k, v]) => t.tiles[k] === v), `A ${tag}: tiles ${JSON.stringify(t.tiles)}`);
    if (e.verdict) ok(t.verdict === e.verdict, `A ${tag}: verdict "${t.verdict}"`);
    if (e.money) ok(JSON.stringify(t.money) === JSON.stringify(e.money), `A ${tag}: money ${JSON.stringify(t.money)}`);

    /* B — desk */
    await openRecord(1360, d.key, ex, ex.rate);
    const tiles = await page.locator('.ln-tile').evaluateAll(els => Object.fromEntries(els.map(el => [el.querySelector('.ln-k')?.textContent, el.querySelector('.ln-v')?.textContent])));
    ok(Object.entries(t.tiles).every(([k, v]) => tiles[k] === v), `B ${tag}: the page's tiles are the module's ${JSON.stringify(tiles)}`);
    const says = (await page.locator('.ie-says').allInnerTexts()).map(flat);
    ok(says.includes(flat(t.sentence)), `B ${tag}: the sentence`, says.join(' | '));
    ok(t.money.every(m => says.includes(flat(m))), `B ${tag}: every money line`, says.join(' | '));
    ok(flat(await page.locator('main').innerText()).includes(flat(t.closing)), `B ${tag}: the closing line`);
    const heads = (await page.locator('.scored-table thead th').allInnerTexts()).map(flat);
    const rowsOnPage = await page.locator('.scored-table tbody tr').evaluateAll(trs => trs.map(tr => ({ name: tr.querySelector('input')?.value, cells: [...tr.querySelectorAll('td')].map(td => td.textContent) })));
    const cellsOk = t.cells.every(c => {
      const r = rowsOnPage.find(x => x.name === c.name);
      return r && c.cols.every((v, i) => flat(r.cells[r.cells.length - c.cols.length + i]) === flat(v));
    });
    ok(cellsOk, `B ${tag}: every row's worked-out cells (${t.heads.join(' · ')}) are the module's`, JSON.stringify(rowsOnPage.slice(0, 2)));
    ok(t.heads.every(h => heads.includes(h)), `B ${tag}: the table's heads ${heads.join(' · ')}`);

    /* C — phone */
    await openRecord(375, d.key, ex, ex.rate);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 1, `C ${tag}: phone, nothing off the side (${over}px)`);
    ok(await page.locator('.scored-table-wrap').evaluate(el => el.scrollWidth >= el.clientWidth), `C ${tag}: the table scrolls inside its own box`);

    /* D — the paper */
    await openRecord(1360, d.key, ex, ex.rate);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / — on paper$/)]);
    const f = join(OUT, `${d.key}-${n + 1}.pdf`); await dl.saveAs(f);
    const txt = nows(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
    ok(txt.includes(nows(t.verdict)) && txt.includes(nows(t.sentence).slice(0, 60)), `D ${tag}: paper has the verdict and the sentence`);
    ok(Object.entries(t.tiles).every(([k, v]) => txt.includes(nows(`${k}: ${v}`))), `D ${tag}: paper has the tiles`);
    ok(t.money.every(m => txt.includes(nows(m))), `D ${tag}: paper has the money lines`);
    ok(txt.includes(nows(t.closing)), `D ${tag}: paper has the closing line`);
    let at = -1, inOrder = true;
    for (const nme of t.order) { const k = txt.indexOf(nows(nme), at + 1); if (k < 0 || k < at) inOrder = false; else at = k; }
    ok(inOrder, `D ${tag}: paper lists every row, in the module's order`);
  }
}

/* E — the £ an hour: the line's wage × on-costs (15 × 1.2 = 18) offered, one tap, the module's money line */
for (const d of all.filter(x => x.asksRate)) {
  const ex = d.examples.find(x => x.rate);
  if (!ex) continue;
  const t = await truthOf(d.key, ex);
  await openRecord(1360, d.key, ex, undefined);
  const before = flat(await page.locator('main').innerText());
  ok(t.money.every(m => !before.includes(flat(m))), `E ${d.key}: with no £ an hour the quick wins' labour is not said`);
  ok(/Give the £ an hour/.test(before), `E ${d.key}: the missing £ an hour is named`);
  await page.getByRole('button', { name: /^Use Line 2’s £18 an hour/ }).click();
  await page.waitForTimeout(900);
  ok(await page.locator('.scored-rate input').inputValue() === '18', `E ${d.key}: the box holds 18`);
  const says = (await page.locator('.ie-says').allInnerTexts()).map(flat);
  ok(t.money.every(m => says.includes(flat(m))), `E ${d.key}: the money line is the module's at £18`, says.join(' | '));
  await page.reload(); await page.locator('.ie-scored').waitFor({ timeout: 15000 }); await page.waitForTimeout(500);
  ok(await page.locator('.scored-rate input').inputValue() === '18', `E ${d.key}: kept after a reload`);
}

/* F — a register that starts blank, made through New (a method page's New lands on ?add=1) and typed into by hand:
   the sheet, one empty row and nothing scored yet, the boxes typed, the order and the money following each, a row
   that cannot be ranked named and left out, the work kept after a reload. */
for (const d of all.filter(x => x.blank)) {
  await page.setViewportSize({ width: 1360, height: 900 });
  await page.goto(`${BASE}/#/scored/${d.key}?add=1`);
  await page.getByPlaceholder(/October review/).waitFor({ timeout: 15000 });
  ok(true, `F ${d.key}: ?add=1 opens the New sheet`);
  await page.getByPlaceholder(/October review/).fill('Film breaks — typed by hand');
  await page.locator('.lt-new select').selectOption({ label: 'Line 2' });
  await page.getByRole('button', { name: 'Start' }).click();
  await page.locator('.ie-scored').waitFor({ timeout: 15000 });
  await page.waitForTimeout(500);
  ok(await page.locator('.scored-table tbody tr').count() === 1, `F ${d.key}: starts with one empty row`);
  ok(/Not scored yet/.test(flat(await page.locator('.ln-band, main').first().innerText())), `F ${d.key}: nothing scored yet, said`);
  const row = n => page.locator('.scored-table tbody tr').nth(n);
  const typeRow = async (n, name, vals) => {
    await row(n).locator(`input[aria-label="${d.noun} name"]`).fill(name);
    for (const [label, v] of Object.entries(vals)) await row(n).locator(`input[aria-label="${label}"]`).fill(String(v));
  };
  await typeRow(0, 'Film guide', { Impact: 3, Effort: 1, 'Worth a year, £': 6000, Hours: 6 });
  await page.locator('.scored-rate input').fill('18');
  await page.waitForTimeout(700);
  const says = async () => (await page.locator('.ie-says').allInnerTexts()).map(flat);
  ok((await says()).includes('The quick win is worth £6.0k a year for 6 hours of work (£108 of labour at £18 an hour).'), `F ${d.key}: one quick win in money as the module says`, (await says()).join(' | '));
  await page.getByRole('button', { name: `+ Add a ${d.noun}` }).click();
  await typeRow(1, 'New unwind unit', { Impact: 4, Effort: 5 });
  await page.getByRole('button', { name: `+ Add a ${d.noun}` }).click();
  await typeRow(2, 'Half done', { Impact: 7, Effort: 2 });
  await page.waitForTimeout(700);
  const tiles = await page.locator('.ln-tile').evaluateAll(els => Object.fromEntries(els.map(el => [el.querySelector('.ln-k')?.textContent, el.querySelector('.ln-v')?.textContent])));
  ok(tiles.Implement === '1' && tiles.Challenge === '1' && tiles.Possible === '0' && tiles.Kill === '0', `F ${d.key}: the tiles follow what was typed ${JSON.stringify(tiles)}`);
  ok(/Left out of the order: “Half done” needs an impact and an effort, each a whole number from 1 to 5\./.test(flat(await page.locator('main').innerText())), `F ${d.key}: the row that cannot be ranked is named and left out`);
  const quad = (await page.locator('.scored-table tbody tr').evaluateAll(trs => trs.map(tr => [tr.querySelector('input')?.value, tr.querySelectorAll('td')[tr.querySelectorAll('td').length - 2]?.textContent])));
  ok(quad[0][1] === 'Implement · on the line' && quad[1][1] === 'Challenge' && quad[2][1] === '—', `F ${d.key}: the quadrant beside each row ${JSON.stringify(quad)}`);
  await page.reload(); await page.locator('.ie-scored').waitFor({ timeout: 15000 }); await page.waitForTimeout(600);
  ok(await page.locator('.scored-table tbody tr').count() === 3 && await page.locator('.scored-rate input').inputValue() === '18'
    && await row(0).locator('input[aria-label="Worth a year, £"]').inputValue() === '6000', `F ${d.key}: kept after a reload (three rows, £ an hour, the £ a year)`);
}
/* ---- 1 · every matrix definition's worked example equals its expectation ---- */
const each = await page.evaluate(async () => {
  const { SCORED } = await import('/src/tools/scored/registry.ts');
  const { studyScored } = await import('/src/tools/scored/scored.ts');
  return SCORED.filter(d => d.matrix).map(d => {
    const ex = d.examples[0];
    const x = studyScored({ agreed: { scored: { key: d.key, rows: ex.rows, criteria: ex.criteria, datum: ex.datum } } });
    return {
      key: d.key, matrix: !!d.matrix, expect: ex.expect, verdict: x?.result?.verdict ?? null, problems: x?.problems ?? null,
      leaders: x?.leaders ?? null,
      scores: x?.table ? Object.fromEntries(x.table.head.slice(3).map((h, i) => [h, x.table.foot[3][3 + i]])) : null,
    };
  });
});
for (const d of each) {
  if (d.problems) { ok(false, `1 ${d.key}: the worked example has problems ${d.problems.join(' ')}`); continue; }
  const want = d.expect.scores;
  const got = d.scores;
  const signed = n => (n > 0 ? `+${n}` : n < 0 ? `\u2212${-n}` : '0');
  ok(d.leaders.join('|') === d.expect.leader && d.verdict === d.expect.verdict, `1 ${d.key}: the example leads with ${d.leaders} (${d.verdict}) as the independent case says`);
  ok(Object.entries(want).every(([n, v]) => got[n] === signed(v)), `1 ${d.key}: every option’s weighted score equals the independent case ${JSON.stringify(want)} (got ${JSON.stringify(got)})`);
}

/* ---- 2 · a matrix, through the page ---- */
const go = async h => { await page.goto(`${BASE}/${h}`); await page.locator('.nv-main').waitFor({ timeout: 15000 }); await page.waitForTimeout(1200); };
const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
const lineName = await page.evaluate(async id => (await (await import('/src/db.ts')).getWorkspace?.(id))?.name ?? null, sd.lineId);

/** A new ranking made through the sheet, as a person does; returns its address id. */
async function newRanking(key, name) {
  await go(`#/scored/${key}`);
  await page.getByRole('button', { name: 'New ranking' }).first().click();
  await page.locator('.lt-new input.text-input').first().fill(name);
  const sel = page.locator('.lt-new select');
  const opts = await sel.locator('option').evaluateAll(os => os.map(o => ({ v: o.value, t: o.textContent })));
  const pick = opts.find(o => o.v === sd.lineId) ?? opts.find(o => o.v);
  await sel.selectOption(pick.v);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.waitForURL(new RegExp(`/scored/${key}/[^/]+$`), { timeout: 10000 });
  await page.locator('[data-scored]').waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  return decodeURIComponent(page.url().split('/').pop().split('?')[0]);
}
const words = async sel => ((await page.locator(sel).count()) ? flat(await page.locator(sel).first().innerText()) : null);
const tilesOf = async () => Object.fromEntries(await page.locator('.ln-tiles .ln-tile').evaluateAll(els => els.map(e => [e.querySelector('.ln-k')?.textContent?.trim(), e.querySelector('.ln-v')?.textContent?.trim()])));
const footOf = async label => page.locator(`tfoot tr[data-foot="${label}"]`).evaluate(tr => [...tr.querySelectorAll('td')].map(td => td.textContent.trim()).slice(1)).catch(() => null);
const settle = () => page.waitForTimeout(700);

for (const def of await page.evaluate(async () => (await import('/src/tools/scored/registry.ts')).SCORED.filter(d => d.matrix).map(d => ({ key: d.key, title: d.title, fc: d.fc, example: d.examples[0], asks: d.matrix.asks, datumDefault: d.matrix.datumDefault })))) {
  const ex = def.example;
  const tag = def.key;
  const id = await newRanking(def.key, 'Film breaks on Line 2 — which fix first');
  ok(!!id, `2 ${tag}: a new ranking made through the sheet (${def.asks.name})`);
  ok(await page.locator('[data-pugh] .pugh-table tbody tr').count() === 3 && await page.locator('[data-pugh] .pugh-table thead th input').count() === 2, `2 ${tag}: it opens blank — three criteria, two options`);
  ok((await page.getByLabel('Datum', { exact: true }).inputValue()) === def.datumDefault, `2 ${tag}: the datum is “${def.datumDefault}”`);
  ok(/Add at least one criterion/.test((await words('[role=alert]')) ?? ''), `2 ${tag}: nothing is ranked yet and the page says what to add`);

  /* type the example through the real boxes */
  await page.getByRole('button', { name: '+ Add a criterion' }).click();
  await page.getByRole('button', { name: '+ Add a criterion' }).click();
  await page.getByRole('button', { name: '+ Add an option' }).click();
  await page.getByRole('button', { name: '+ Add an option' }).click();
  await settle();
  ok(await page.locator('.pugh-table tbody tr').count() === 5 && await page.locator('.pugh-table thead th input').count() === 4, `2 ${tag}: criteria and options added`);
  for (let j = 0; j < ex.criteria.length; j++) {
    const row = page.locator('.pugh-table tbody tr').nth(j);
    await row.locator('td').nth(0).locator('input').fill(ex.criteria[j].name);
    await row.locator('td').nth(1).locator('input').fill(String(ex.criteria[j].weight));
  }
  for (let i = 0; i < ex.rows.length; i++) {
    await page.locator('.pugh-table thead th').nth(3 + i).locator('input').fill(ex.rows[i].name);
    for (let j = 0; j < ex.criteria.length; j++) {
      await page.locator('.pugh-table tbody tr').nth(j).locator('td').nth(3 + i).locator('select').selectOption(String(ex.rows[i].scores[ex.criteria[j].id]));
    }
  }
  await settle();

  /* the screen equals the module AND the independent literals */
  const truth = await page.evaluate(async ex => {
    const { pugh, summarizePugh, pughTable } = await import('/src/tools/pugh/pugh.ts');
    const input = { datum: ex.datum, criteria: ex.criteria, options: ex.rows };
    const out = pugh(input); const s = summarizePugh(out.ok); const t = pughTable(input, out.ok);
    return { verdict: s.verdict, sentence: s.sentence, closing: s.closing, tiles: Object.fromEntries(s.tiles.map(x => [x.k, x.v])), foot: t.foot, also: s.also?.lines ?? [], caveats: s.caveats };
  }, ex);
  ok(truth.sentence === 'Film guide leads: better than Present state on 3 criteria, worse on none \u2014 weighted +11. Reel trolley follows at +9.', `2 ${tag}: the module’s sentence is the independent literal`);
  ok(flat(await page.locator('.ie-says').innerText()) === truth.sentence, `2 ${tag}: the sentence on the page is the module’s`);
  const tl = await tilesOf();
  ok(Object.entries(truth.tiles).every(([k, v]) => tl[k] === v) && tl['Leads'] === 'Film guide' && tl['Beat the datum'] === '2 of 4' && tl['Margin'] === '+2' && tl['If a weight moves a step'] === 'Holds', `2 ${tag}: the tiles — leads Film guide, 2 of 4 beat the datum, margin +2, holds (${JSON.stringify(tl)})`);
  ok(flat(await page.locator('.ln-close').innerText()).includes(truth.closing), `2 ${tag}: the closing line is the module’s`);
  const score = await footOf('Weighted score');
  ok(JSON.stringify(score) === JSON.stringify(['0', '+11', '+9', '\u22121', '0']), `2 ${tag}: the weighted scores under the columns are +11, +9, −1, 0 (${JSON.stringify(score)})`);
  const better = await footOf('Better (+)'), worse = await footOf('Worse (\u2212)');
  ok(JSON.stringify(better.slice(1)) === '["3","2","1","1"]' && JSON.stringify(worse.slice(1)) === '["0","0","2","1"]', `2 ${tag}: the pluses 3·2·1·1 and the minuses 0·0·2·1 counted`);
  ok(JSON.stringify((await footOf('Rank')).slice(1)) === JSON.stringify(['1 \u2014 leads', '2', '4', '3']) && /leads/.test((await words('.pugh-lead')) ?? ''), `2 ${tag}: the ranks 1·2·4·3, the leader said in words`);
  ok(/Before you choose/.test((await words('.ln-panel')) ?? '') && /On Safety: Reel trolley scored better than Film guide/.test((await words('.ln-panel')) ?? ''), `2 ${tag}: “Before you choose” — the trolley is better on safety`);
  ok(/it is not a measurement/.test(flat((await page.locator('.ln-panel', { hasText: 'What this does not say' }).innerText()))), `2 ${tag}: what it does not say names that it is not a measurement`);

  /* kept after a reload */
  await page.reload(); await page.locator('[data-scored]').waitFor({ timeout: 10000 }); await page.waitForTimeout(800);
  ok(flat(await page.locator('.ie-says').innerText()) === truth.sentence && JSON.stringify(await footOf('Weighted score')) === JSON.stringify(score), `2 ${tag}: kept after a reload — the same sentence and scores`);
  ok((await page.getByLabel('Datum', { exact: true }).inputValue()) === def.datumDefault && (await page.locator('.pugh-table tbody tr').nth(0).locator('td').nth(0).locator('input').inputValue()) === 'Cuts breaks', `2 ${tag}: the datum and the criteria kept`);

  /* one mark moves the lead: the trolley is better on cost */
  const trolleyCost = page.locator('.pugh-table tbody tr').nth(1).locator('td').nth(4).locator('select');
  await trolleyCost.selectOption('1'); await settle();
  ok((await words('.ie-says'))?.startsWith('Reel trolley leads: better than Present state on 3 criteria, worse on none \u2014 weighted +12. Film guide follows at +11.'), `2 ${tag}: one mark (trolley better on cost) moves the lead to Reel trolley, +12 (${(await words('.ie-says'))?.slice(0, 90)})`);
  await trolleyCost.selectOption('0'); await settle();

  /* one weight makes a tie: time to do 3 → 1 takes the guide to 9, the trolley's 9 */
  const timeW = page.locator('.pugh-table tbody tr').nth(2).locator('td').nth(1).locator('input');
  await timeW.fill('1'); await settle();
  const tieSays = await words('.ie-says');
  ok(tieSays === 'Film guide and Reel trolley tie for the lead at +9 against Present state.', `2 ${tag}: one weight (time to do 3 → 1) ties the guide and the trolley at +9 (${tieSays})`);
  ok(/Don.t choose yet: Film guide and Reel trolley tie\./.test((await words('.ln-close')) ?? '') && (await page.locator('.ln-close.is-a').count()) === 1, `2 ${tag}: a tie is said in amber and the line says not to choose yet`);
  await timeW.fill('3'); await settle();
  ok((await words('.ie-says')) === truth.sentence, `2 ${tag}: the weight put back, the lead is back`);

  /* a weight refused: 6 */
  await timeW.fill('6'); await settle();
  ok(/whole number from 1 to 5/.test((await words('[role=alert]')) ?? '') && (await page.locator('.ie-says').count()) === 0, `2 ${tag}: a weight of 6 is refused in words and nothing is ranked on it`);
  await timeW.fill('3'); await settle();

  /* an option unmarked is left out, named */
  const opCell = page.locator('.pugh-table tbody tr').nth(4).locator('td').nth(6).locator('select');
  await opCell.selectOption(''); await settle();
  ok(/Left out until marked on every criterion: Second operator \(not marked on Hygiene\)/.test((await words('.ln-panel:has-text("What this does not say")')) ?? '') && JSON.stringify((await footOf('Rank')).slice(1)) === JSON.stringify(['1 \u2014 leads', '2', '3', 'not ranked']), `2 ${tag}: an option not marked on every criterion is left out and named; the others still ranked`);
  await opCell.selectOption('0'); await settle();

  /* a removal undone */
  await page.getByRole('button', { name: 'Take off option New unwind unit' }).click(); await settle();
  ok(await page.locator('.pugh-table thead th input').count() === 3 && (await page.locator('.pugh-undo').count()) === 1, `2 ${tag}: an option taken off, with Undo offered`);
  await page.locator('.pugh-undo').getByRole('button', { name: 'Undo' }).click(); await settle();
  ok(await page.locator('.pugh-table thead th input').count() === 4 && JSON.stringify(await footOf('Weighted score')) === JSON.stringify(score), `2 ${tag}: Undo brings it back with its marks`);

  /* a cost typed, beside the score */
  await page.getByLabel('Cost of Film guide').fill('1200'); await settle();
  const tl2 = await tilesOf();
  ok(tl2['Leader\u2019s cost'] === '\u00a31,200' && JSON.stringify(await footOf('Weighted score')) === JSON.stringify(score), `2 ${tag}: a cost of £1,200 shown as a tile beside the score; the score unchanged (${JSON.stringify(tl2)})`);
  ok(/not weighed in it/.test((await words('.ln-panel:has-text("What this does not say")')) ?? ''), `2 ${tag}: and said not to be part of the score`);

  /* the paper, read back */
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, / \u2014 on paper$/)]);
  const pf = join(OUT, `${tag}.pdf`); await dl.saveAs(pf);
  const pt = nows(flat(execFileSync('pdftotext', ['-raw', pf, '-'], { encoding: 'utf8' })));
  const pages = Number(/Pages:\s+(\d+)/.exec(execFileSync('pdfinfo', [pf], { encoding: 'utf8' }))?.[1]);
  ok(pages === 1, `2 ${tag}: the paper is ${pages} page(s)`);
  for (const [what, needle] of [
    ['the verdict', 'Film guide leads'], ['the sentence', truth.sentence], ['the datum', 'Datum: Present state'],
    ['every criterion', 'Cuts breaks'], ['a weight and criterion', 'Time to do'], ['every option', 'New unwind unit'], ['the second operator', 'Second operator'],
    ['the tiles', 'Beat the datum'], ['the score row', 'Weighted score'], ['the leader\u2019s rank', '1 \u2014 leads'], ['the cost row', '\u00a31,200'],
    ['Before you choose', 'Before you choose'], ['the safety hint', 'On Safety: Reel trolley scored better than Film guide'],
    ['what it does not say', 'it is not a measurement'], ['the closing line', truth.closing],
  ]) ok(pt.toLowerCase().includes(nows(needle).toLowerCase()), `2 ${tag}: the paper has ${what}`);
  ok(pt.includes('+11') && pt.includes('+9') && pt.includes('-1'), `2 ${tag}: the paper has the scores +11, +9 and \u22121`);

  /* the phone */
  await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(500);
  const fit = await page.evaluate(() => {
    const wrap = document.querySelector('.scored-table-wrap');
    return { sw: document.documentElement.scrollWidth, iw: window.innerWidth, frame: wrap ? wrap.scrollWidth > wrap.clientWidth : null,
      off: [...document.querySelectorAll('.ln-tile, .ie-says, .ln-close, .pugh-datum')].filter(e => { const r = e.getBoundingClientRect(); return r.right > window.innerWidth + 1 || r.left < -1; }).length };
  });
  ok(fit.sw <= fit.iw + 1 && fit.off === 0, `2 ${tag}: on a phone nothing is off the side of the page (${JSON.stringify(fit)})`);
  ok(fit.frame === true, `2 ${tag}: the matrix scrolls sideways inside its own frame`);
  await page.setViewportSize({ width: 1360, height: 900 });

  /* the method page: DMAIC's Improve section lists it as built, with New, and New opens the sheet in the project */
  await go(`#/project/${sd.methodProjectId}`);
  await page.waitForSelector('.pmethod');
  const mrow = page.locator('.pmethod .lt-li', { hasText: new RegExp(def.title) }).first();
  ok(/Built/.test(await mrow.innerText()) && !/Not built/.test(await mrow.innerText()), `2 ${tag}: the DMAIC method page lists ${def.title} as Built (${flat(await mrow.innerText()).slice(0, 60)})`);
  await mrow.locator('button', { hasText: /^New$/ }).click(); await page.waitForTimeout(800);
  ok(new RegExp(`/scored/${def.key}`).test(page.url()) && /project=/.test(page.url()) && (await page.locator('.lt-new').count()) === 1, `2 ${tag}: New on the method page opens the new-ranking sheet in the project (${page.url().split('#')[1]})`);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {});

  /* a team member of the project changes; a client changes nothing */
  const cid = await page.evaluate(async ([key, sdp, sdl]) => {
    const { SCORED } = await import('/src/tools/scored/registry.ts');
    const { newScoredStudy } = await import('/src/tools/scored/scored.ts');
    const { putStudy } = await import('/src/db.ts');
    const d = SCORED.find(x => x.key === key); const s = newScoredStudy(d, { name: 'A client reads', workspaceId: sdl, projectId: sdp, now: Date.now() });
    const ex = d.examples[0]; s.agreed.scored = { key, rows: ex.rows, criteria: ex.criteria, datum: ex.datum };
    await putStudy(s); return s.id;
  }, [def.key, sd.projectId, sd.lineId]);
  await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
  await go(`#/scored/${def.key}/${encodeURIComponent(cid)}`);
  const ro = await page.evaluate(() => ({ editable: [...document.querySelectorAll('[data-pugh] input, [data-pugh] select')].filter(e => !e.disabled).length, adds: [...document.querySelectorAll('[data-pugh] button')].length, says: document.querySelector('.ie-says')?.textContent ?? '' }));
  ok(ro.editable === 0 && ro.adds === 0 && ro.says.startsWith('Film guide leads'), `2 ${tag}: a client sees the matrix and the answer and changes nothing (${JSON.stringify({ ...ro, says: ro.says.slice(0, 30) })})`);
  await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
}

/* ---- 3 · criticality unchanged on the page ---- */
{
  await newRanking('criticality', 'Line 2 — October review');
  const rows = await page.locator('.scored-table tbody tr').count();
  const tl = await tilesOf();
  ok(rows === 5 && tl['Class A'] === '2' && tl['Class B'] === '2' && tl['Class C'] === '1' && (await page.locator('[data-pugh]').count()) === 0, `3 criticality is unchanged — its example opens with ${rows} machines, ${JSON.stringify(tl)}`);
}

ok(errors.length === 0, `no console errors or page errors (${errors.length})`, errors.slice(0, 3).join(' | '));

await browser.close();
process.exit(failed ? 1 : 0);
