/* ACCEPTANCE — SCORED REGISTER SHAPE (FC-064 criticality first). Table-driven over src/tools/scored/registry. */
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
const nows = s => String(s ?? '').replace(/\s+/g, '').replace(/[’‘]/g, "'");
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
  key: d.key, fc: d.fc, title: d.title, noun: d.noun ?? 'machine', asksRate: !!d.asksRate, blank: !!d.blank, examples: d.examples.map(e => ({ name: e.name, rate: e.rate ?? null, rows: e.rows, expect: e.expect })),
})));
ok(all.length >= 2, `${all.length} definitions registered: ${all.map(d => d.key).join(', ')}`);

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

for (const d of all) {
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
ok(errors.length === 0, `no console errors or page errors (${errors.length})`, errors.slice(0, 3).join(' | '));

await browser.close();
process.exit(failed ? 1 : 0);
