/* SMED'S TWO MODES, DRIVEN — FC-069 every product every interval (EPEI) and FC-072 cleandowns by SMED
 * (knowledge/specs/FC-069-epei.md, knowledge/specs/FC-072-cleandown.md). Called by scripts/acceptance/changeover.mjs
 * as its sections 8 and 9, on the smoke seed, in a real browser with the real controls; every sentence checked against
 * the module that makes it (src/tools/changeover/changeover.ts) AND against the independent cases
 * (scripts/knowledge/cases-smed-epei-cleandown.py), the paper downloaded and read back with pdftotext.
 *
 *   8  EPEI on Line 7 (its crew of 4 at £14.50 × 1.3): a SMED from Oat biscuits 300g to Ginger snaps 250g — 30 min
 *      internal, 10 external, 10 internal converted; 1 shift of 7.5 h, 5 days; four products taken A WEEK at their rates,
 *      three with a changeover of their own (35, 35, 50), Ginger snaps on this one's; a cost a pack each, 20% a year —
 *      every 1.9 days, separated 1.8, as planned 1.7; 20,406 packs, £9,486 tied up, £1,897 a year; £1,116 less as
 *      planned; the crew's 90 min a day £113. a — the sheet (a week ÷ the line's 5 days; the agreed changeover on a line
 *      standard offered and used with one tap); b — the sentences and the table, kept after a reload, a cost taken off
 *      named; c — the paper read back; d — 1440 and 390.
 *   9  a cleandown on the project's line: a wet clean, allergen (nut), £45 a clean; the record's six elements marked
 *      Cleaning · Verification · Release — 90 min to release, the swabs' wait from 70 to 85, release at 65 as planned;
 *      a wash streamlined shorter flagged amber, then taken back; the grid's C · V · R; the tile; the paper read back;
 *      1440 and 390; e — a client sees it and changes nothing. */
import { paper as pressPaper } from './pageHeader.mjs';

export async function epeiAndCleandown({ page, ok, BASE, sd, OUT, pdfText, join }) {
  const go = async h => { await page.goto(`${BASE}/${h}`); await page.waitForTimeout(1800); };
  const dialog = () => page.locator('[role="dialog"]').last();
  const id = () => decodeURIComponent(new URL(page.url()).hash.split('smed/')[1] ?? '').split(/[?&]/)[0];
  const card = name => page.locator('.co-step').filter({ has: page.locator('.co-step-n', { hasText: name }) });
  const stage = name => page.locator('.co-stages').getByRole('button', { name, exact: true }).click().then(() => page.waitForTimeout(300));
  const san = s => s.replace(/→/g, 'to').replace(/[–—−]/g, '-').replace(/’/g, "'").replace(/\s+/g, ' ').trim();
  const says = async () => {
    const t = page.locator('.ie-says [data-fold="smed-more"]:not(.is-open) .fold-toggle');
    if (await t.count()) { await t.first().click(); await page.waitForTimeout(250); }
    return (await page.locator('.ie-says p.ie-say').allTextContents()).map(x => x.replace(/\s+/g, ' ').trim());
  };
  const offSide = () => page.evaluate(() => ({ doc: document.documentElement.scrollWidth, w: window.innerWidth,
    any: Math.max(0, ...[...document.querySelectorAll('main *, [role="dialog"] *')].filter(e => !e.closest('.co-scale-w, .vs-scroll, .co-stages')).map(e => e.getBoundingClientRect().right)) }));
  /* the module's own reading of a SMED as it stands, with its line's cost settings */
  const truth = sid => page.evaluate(async sid => {
    const { getStudy, getWorkspace } = await import('/src/db.ts');
    const C = await import('/src/tools/changeover/changeover.ts'); const L = await import('/src/tools/changeover/changeoverLean.ts');
    const s = await getStudy(sid); if (!s) return null;
    const money = C.moneyOf(s.workspaceId ? await getWorkspace(s.workspaceId) : undefined);
    const f = C.figuresOf(s.facts), l = C.ladderOf(s.facts.sequence), iv = C.intervalFor(f, s.facts);
    const clean = s.facts.cleandown ? C.cleandownOf(s.facts.sequence, s.facts.cleandown) : undefined;
    return { facts: s.facts, ws: s.workspaceId, pid: s.projectId, iv: C.intervalSays(iv, f).text, stock: C.intervalStockSays(iv, money, s.facts.carryingRatePerYear).text,
      rows: C.intervalRows(iv, s.facts.carryingRatePerYear), clean: C.cleandownSays(s.facts), materials: C.cleanMaterialsSays(s.facts),
      tile: clean ? L.releaseTile(clean, l) : null, sheet: C.changeoverSheet(s.facts, undefined, new Map(), money) };
  }, sid);
  const lineId = await page.evaluate(async () => ((await (await import('/src/db.ts')).listWorkspaces()).find(w => w.name === 'Line 7'))?.id);

  /* ======================================================== 8 · FC-069 EPEI */
  await page.setViewportSize({ width: 1440, height: 900 });
  /* a product with an agreed changeover on its line standard (the smoke seed has none agreed): 33 min into Maris Piper 2kg */
  const offered = await page.evaluate(async ws => {
    const { listStandardsForLine, putStandard } = await import('/src/db.ts');
    const std = (await listStandardsForLine(ws)).find(x => x.product === 'Maris Piper 2kg');
    if (!std) return null;
    await putStandard({ ...std, capacity: { ...(std.capacity ?? { stations: [] }), changeovers: [{ id: 'acc-agreed', from: 'King Edward 2.5kg', steps: [], minutes: 33, agreedAt: Date.now() - 86_400_000, fromStudyId: 'acc' }] } });
    return std.product;
  }, lineId);
  await go('#/smed');
  await page.getByRole('button', { name: 'New SMED' }).first().click(); await page.waitForTimeout(500);
  await page.getByLabel('Which line').selectOption({ label: 'Line 7' });
  await page.getByLabel('From which product?').fill('Oat biscuits 300g');
  await page.getByLabel('To which product?').fill('Ginger snaps 250g');
  await page.getByRole('button', { name: 'Start it' }).click(); await page.waitForTimeout(1500);
  const E = id();
  /* the SMED into Ginger snaps: 30 internal, 10 external, 10 internal — typed through the sheet */
  await page.getByRole('button', { name: '+ Type an element' }).click(); await page.waitForTimeout(300);
  for (const [nm, side, tm, last] of [['Change the depositor head', 'Internal', '30', false], ['Fetch the next head', 'External', '10', false], ['Set the depositor', 'Internal', '10', true]]) {
    await dialog().getByLabel('What is done').fill(nm);
    await dialog().getByRole('radio', { name: new RegExp(`^${side}`) }).click();
    await dialog().getByLabel('How long it takes').fill(tm);
    await dialog().getByRole('button', { name: last ? 'Add it' : 'Add and next', exact: true }).click(); await page.waitForTimeout(350);
  }
  await stage('Convert');
  await card('Set the depositor').getByRole('button', { name: '→E Convert to external' }).click(); await page.waitForTimeout(500);
  /* how the line runs: one shift of 7.5 h, the line running through its breaks, 5 days */
  await page.getByRole('button', { name: 'Say how the line runs' }).click(); await page.waitForTimeout(400);
  await dialog().getByLabel('Shifts a day').fill('1');
  await dialog().getByLabel('Hours a shift').fill('7.5');
  await dialog().getByLabel('Breaks the line stops for, min a shift').fill('0');
  await dialog().getByRole('radio', { name: '5', exact: true }).click();
  await dialog().getByLabel('How many changeovers').fill('2');
  await dialog().getByRole('radio', { name: 'a day' }).click();
  await dialog().getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(700);
  /* the products: the line's standards are offered — one shows its agreed changeover, used with one tap, then taken off */
  await page.getByRole('button', { name: 'List the products' }).click(); await page.waitForTimeout(500);
  {
    const row = name => dialog().locator('fieldset.co-iv-row').filter({ has: page.locator(`input[aria-label="Product"][value="${name}"]`) });
    const mp = row('Maris Piper 2kg');
    const offerTxt = (await mp.count()) ? (await mp.innerText()).replace(/\s+/g, ' ') : '';
    ok(!!offered && /its line standard's agreed changeover is 33 min Use 33 min/.test(offerTxt), `8a the agreed changeover on Maris Piper 2kg's line standard is offered: "${offerTxt.match(/its line standard's[^.]*?Use 33 min/)?.[0] ?? offerTxt.slice(0, 80)}"`);
    if (await mp.count()) {
      await mp.getByRole('button', { name: 'Use 33 min' }).click(); await page.waitForTimeout(150);
      ok((await mp.getByLabel('Maris Piper 2kg — changeover into it').inputValue()) === '33' && /its agreed changeover on the line standard/.test(await mp.innerText()),
        '8a Use 33 min puts it in the box, said as its agreed changeover on the line standard');
    }
    /* our four, the rest taken off */
    for (const nm of ['Shortbread 200g', 'Gluten-free 150g']) {
      await dialog().getByLabel('Another product').fill(nm); await dialog().getByRole('button', { name: 'Add', exact: true }).click(); await page.waitForTimeout(150);
    }
    const keep = ['Shortbread 200g', 'Oat biscuits 300g', 'Ginger snaps 250g', 'Gluten-free 150g'];
    for (;;) {
      const names = await dialog().locator('fieldset.co-iv-row input[aria-label="Product"]').evaluateAll(xs => xs.map(x => x.value));
      const extra = names.find(n => !keep.includes(n));
      if (!extra) break;
      await row(extra).getByRole('button', { name: 'Take it off' }).click(); await page.waitForTimeout(120);
    }
    const typed = { 'Shortbread 200g': ['72000', '100', '35', '0.40'], 'Oat biscuits 300g': ['38400', '80', '35', '0.55'], 'Ginger snaps 250g': ['21600', '60', '', '0.30'], 'Gluten-free 150g': ['12000', '50', '50', '0.80'] };
    for (const [nm, [d, r, co, c]] of Object.entries(typed)) {
      await dialog().getByLabel(`${nm} — demand`).fill(d);
      await dialog().getByRole('radiogroup', { name: `${nm} — a day or a week` }).getByRole('radio', { name: 'a week' }).click();
      await dialog().getByLabel(`${nm} — rate a minute`).fill(r);
      if (co) await dialog().getByLabel(`${nm} — changeover into it`).fill(co);
      await dialog().getByLabel(`${nm} — cost a pack`).fill(c);
    }
    const sb = (await row('Shortbread 200g').innerText()).replace(/\s+/g, ' ');
    ok(/÷ 5 days the line runs = 14,400 a day/.test(sb) && /144 min a day — from its demand and rate/.test(sb),
      '8a a week\'s 72,000 is divided by the line\'s own 5 days: "÷ 5 days the line runs = 14,400 a day" — 144 min a day');
    ok(/blank: this SMED's minutes/.test(await row('Ginger snaps 250g').innerText()), '8a the product this SMED changes into takes its minutes — said "blank: this SMED\'s minutes"');
    await dialog().getByLabel('Carrying rate a year').fill('20');
    await dialog().getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(800);
  }
  let t = await truth(E);
  {
    const ps = t.facts.products ?? [];
    const g = n => ps.find(p => p.product === n);
    ok(ps.length === 4 && ps.every(p => p.demandPer === 'week') && g('Shortbread 200g')?.changeoverMin === 35 && g('Ginger snaps 250g')?.changeoverMin === undefined
      && g('Gluten-free 150g')?.pieceCost === 0.8 && t.facts.carryingRatePerYear === 20 && t.ws === lineId,
      `8a saved once, on Save: four products a week, changeovers 35 · 35 · this one's · 50, costs, 20% a year — on Line 7`);
  }
  const E1 = 'Four products — 170 min of changeovers a cycle, 1 at this changeover\'s 50 min — run every 1.9 days; separated, 160 min a cycle, every 1.8; as planned, 150 min a cycle, every 1.7 — a daily interval needs one cycle\'s changeovers in 90 min or less.';
  const E2 = 'At every 1.9 days a run of each product makes its demand until the next: 20,406 packs on average — £9,486 tied up, £1,897 a year to carry at 20%; as planned, every 1.7 days, 18,005 packs — £8,370, £1,116 less, if the products run that often. The changeovers take the 90 min a day the demand leaves free at any of these intervals — £113 of the crew\'s time a day; a shorter changeover is banked as less stock when the products run more often, or as time when they do not.';
  {
    const s = await says();
    ok(t.iv === E1 && s.includes(E1), `8a the interval as the record's week works it and the module says it: "${s.find(x => /products — /.test(x)) ?? t.iv}"`);
    ok(t.stock === E2 && s.includes(E2), `8b the stock and its money, the crew's time at Line 7's cost: "${(s.find(x => /^At every/.test(x)) ?? t.stock).slice(0, 140)}…"`);
    const table = await page.locator('.co-iv-t tbody tr').evaluateAll(trs => trs.map(tr => [...tr.children].map(c => c.textContent.trim())));
    const by = n => table.find(r => r[0] === n)?.join('|');
    ok(JSON.stringify(table) === JSON.stringify(t.rows.map(r => [r.product, r.run, r.into, r.lot, r.avg, r.tied])) && by('Shortbread 200g') === 'Shortbread 200g|144 min a day|35 min|27,200|9,248|£3,699'
      && by('Ginger snaps 250g') === 'Ginger snaps 250g|72 min a day|50 min — this changeover|8,160|3,427|£1,028', `8b the products' table equals the module's rows and the independent case: ${table.map(r => `${r[0]} ${r[5]}`).join(' · ')}`);
  }
  await page.reload(); await page.waitForTimeout(2000);
  ok((await says()).includes(E1) && (await page.locator('.co-iv-t tbody tr').count()) === 4, '8b kept after a reload — the sentence and the table');
  await page.screenshot({ path: join(OUT, 'smed-epei-page-1440.png'), fullPage: true });
  /* a product with no cost a pack: named, no total in pounds */
  await page.getByRole('button', { name: 'Change the products' }).last().click(); await page.waitForTimeout(400);
  await dialog().getByLabel('Ginger snaps 250g — cost a pack').fill('');
  await dialog().getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(700);
  t = await truth(E);
  {
    const s = (await says()).find(x => /^At every/.test(x)) ?? '';
    ok(s === t.stock && /Give Ginger snaps 250g a cost a pack to say the stock in money\./.test(s) && !/tied up/.test(s), `8b a product with no cost a pack is named and no pounds of stock are said: "${s.slice(0, 160)}…"`);
  }
  await page.getByRole('button', { name: 'Change the products' }).last().click(); await page.waitForTimeout(400);
  await dialog().getByLabel('Ginger snaps 250g — cost a pack').fill('0.30');
  await dialog().getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(700);
  t = await truth(E);
  ok(t.stock === E2, '8b the cost given back — the pounds said again');
  /* 8c · the paper */
  {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, 'SMED — on paper')]);
    const pdf = join(OUT, 'smed-epei.pdf'); await dl.saveAs(pdf);
    const txt = san(pdfText(pdf));
    const has = x => txt.includes(san(x));
    const parts = x => has(san(x).slice(0, 70)) && has(san(x).slice(-50));
    ok(parts(E1) && parts(E2) && has('EVERY PRODUCT EVERY INTERVAL') && t.rows.every(r => has(r.product) && has(r.tied) && has(r.lot)),
      `8c the paper read back: the interval, the stock and its money, and every product's row (${t.rows.map(r => r.tied).join(', ')})`);
  }
  /* 8d · desk and phone */
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(300);
    await says();
    const o = await offSide();
    await page.getByRole('button', { name: 'Change the products' }).last().click(); await page.waitForTimeout(400);
    const box = await dialog().getByLabel('Shortbread 200g — cost a pack').boundingBox();
    const chip = await dialog().getByRole('radiogroup', { name: 'Shortbread 200g — a day or a week' }).getByRole('radio', { name: 'a week' }).boundingBox();
    const os = await offSide();
    await page.screenshot({ path: join(OUT, `smed-epei-${w}.png`), fullPage: false });
    ok(o.doc <= o.w && o.any <= o.w + 1 && os.doc <= os.w && os.any <= os.w + 1 && box && box.height >= 44 && chip && chip.height >= 40,
      `8d at ${w} px: nothing off the side (page ${o.doc} of ${o.w}, sheet ${Math.round(os.any)}), the boxes ${Math.round(box?.height ?? 0)} px, the chips ${Math.round(chip?.height ?? 0)} px`);
    await dialog().getByRole('button', { name: 'Cancel' }).click(); await page.waitForTimeout(300);
  }

  /* ======================================================== 9 · FC-072 a cleandown */
  await page.setViewportSize({ width: 1440, height: 900 });
  await go(`#/w/${sd.wsId}/standards/${sd.lineOnJobId}`);
  await page.getByRole('button', { name: 'Start a SMED ›' }).click(); await page.waitForTimeout(1500);
  const K = id();
  ok(!!K && (await truth(K))?.pid === sd.projectId, '9a a SMED started from the product\'s standard, on the project — for the cleandown');
  const bandFacts = async () => (await page.locator('.ln-facts').first().innerText()).replace(/\s+/g, ' ');
  ok(!/The clean/.test(await bandFacts()) && (await page.getByRole('button', { name: 'Is it a cleandown?' }).count()) === 1, '9a a SMED is a product change until it is said to be a clean — no "The clean" on its band, one door: Is it a cleandown?');
  await page.getByRole('button', { name: 'Is it a cleandown?' }).click(); await page.waitForTimeout(400);
  await dialog().getByRole('radio', { name: 'A wet clean' }).click();
  await dialog().getByLabel(/An allergen clean/).check();
  await dialog().getByLabel(/Which allergen/).fill('nut');
  await dialog().getByLabel(/Chemicals and water/).fill('45');
  await dialog().getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(700);
  const els = [['Fetch the cleaning kit and chemicals', 'External', '10', null], ['Strip the depositor\'s removable parts', 'Internal', '15', 'Cleaning'], ['Clean the removable parts at the sink', 'Internal', '15', 'Cleaning'],
    ['Wet clean the frame and conveyors', 'Internal', '30', 'Cleaning'], ['Swab three sites and wait for the result', 'Internal', '15', 'Verification'], ['QA release signed', 'Internal', '5', 'Release']];
  await page.getByRole('button', { name: '+ Type an element' }).click(); await page.waitForTimeout(300);
  for (const [i, [nm, side, tm]] of els.entries()) {
    await dialog().getByLabel('What is done').fill(nm);
    await dialog().getByRole('radio', { name: new RegExp(`^${side}`) }).click();
    await dialog().getByLabel('How long it takes').fill(tm);
    await dialog().getByRole('button', { name: i === els.length - 1 ? 'Add it' : 'Add and next', exact: true }).click(); await page.waitForTimeout(300);
  }
  await stage('Record');
  for (const [nm, , , part] of els) if (part) { await card(nm).getByRole('radio', { name: part, exact: true }).click(); await page.waitForTimeout(200); }
  await page.getByRole('button', { name: 'Say how the line runs' }).click(); await page.waitForTimeout(400);
  await dialog().getByLabel('How many changeovers').fill('2');
  await dialog().getByRole('radio', { name: 'a week' }).click();
  await dialog().getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(700);
  await page.reload(); await page.waitForTimeout(2000);
  let k = await truth(K);
  ok(JSON.stringify(k.facts.cleandown) === JSON.stringify({ kind: 'wet', allergen: true, allergenName: 'nut', materials: 45 })
    && (k.facts.sequence ?? []).map(x => x.part ?? '-').join(' ') === '- clean clean clean verify release',
    `9a the clean said through its sheet and each element's part by its chip — kept after a reload: ${(k.facts.sequence ?? []).map(x => x.part ?? '-').join(' ')}`);
  const C1 = ['A wet clean, allergen (nut): 90 min to release — 60 min cleaning, 15 min on the verification, 5 min on the release and 10 min of other work.',
    'The verification — Swab three sites and wait for the result — holds the line 15 min, from 70 to 85 min into the stop; work that does not need its result can be done alongside it.',
    'With the external work done outside the stop, release at 80 min — 10 min sooner, the clean and its verification as they are.'];
  {
    const shown = (await page.locator('.ie-says p.co-clean').allTextContents()).map(x => x.replace(/\s+/g, ' ').trim());
    const mine = k.clean.filter(x => x.text !== k.materials).map(x => x.text);
    ok(JSON.stringify(shown) === JSON.stringify(mine) && JSON.stringify(mine) === JSON.stringify(C1), `9b the page says what the module says and the record's case gives: ${shown.map(x => `"${x.slice(0, 60)}…"`).join(' ')}`);
    const tile = await page.locator('.ie-strip .ln-tile').filter({ has: page.locator('.ln-k', { hasText: /^To release$/ }) }).innerText().catch(() => '');
    ok(tile.replace(/\s+/g, ' ').trim() === `To release ${k.tile.v} ${k.tile.of}` && k.tile.v === '90 min', `9b the tile: "${tile.replace(/\s+/g, ' ').trim()}"`);
    const marks = await page.locator('.co-grid .co-part').allTextContents();
    ok(marks.join('') === 'CCCVR' && /C cleaning · V verification/.test(await page.locator('.co-grid .vs-key').innerText()), `9b the grid marks each part's square: ${marks.join(' ')}`);
    const s = await says();
    ok(s.includes('Chemicals and water: £45 a clean — £90 a week at 2 cleans a week.') && s.includes(k.materials), `9b the chemicals and water in money: "${k.materials}"`);
    ok(/The clean A wet clean, allergen \(nut\)/.test(await bandFacts()) && (await page.getByRole('button', { name: 'Change the clean' }).count()) === 1, `9b the band says the clean: "${(await bandFacts()).match(/The clean[^]*$/)?.[0]}" — and its door, Change the clean`);
    await page.screenshot({ path: join(OUT, 'smed-clean-page-1440.png'), fullPage: true });
  }
  /* the parts cleaned off the line on a spare set — converted, not flagged; release at 65 */
  await stage('Convert');
  await card('Clean the removable parts at the sink').getByRole('button', { name: '→E Convert to external' }).click(); await page.waitForTimeout(500);
  k = await truth(K);
  ok(k.clean.some(x => x.text === 'As planned, release at 65 min — 25 min sooner, the clean and its verification as they are.') && !k.clean.some(x => x.tone === 'a')
    && (await page.locator('.ie-says p.co-clean').allTextContents()).some(x => /As planned, release at 65 min — 25 min sooner/.test(x)) && k.tile.of === '15 min on the verification · 65 min as planned',
    '9b converting the parts\' clean off the line: release at 65 as planned, 25 sooner — the record\'s "about 25" — and nothing flagged');
  /* 9c · the wash streamlined shorter: flagged in amber, in words */
  await stage('Streamline');
  const wash = card('Wet clean the frame and conveyors');
  await wash.getByRole('radio', { name: '↓ Streamline' }).click(); await page.waitForTimeout(400);
  await wash.getByLabel('Target inside the stop').fill('20 min'); await wash.getByLabel('Target inside the stop').press('Tab'); await page.waitForTimeout(600);
  k = await truth(K);
  const FLAG = 'Wet clean the frame and conveyors is part of the clean — a plan that shortens it changes the cleaning method validated for the allergen, which is validated again before it is used. SMED shortens what is around the clean, not the clean itself.';
  {
    const amber = (await page.locator('.ie-says p.co-clean.is-a').allTextContents()).map(x => x.replace(/\s+/g, ' ').trim());
    ok(amber.length === 1 && amber[0] === FLAG && k.clean.find(x => x.tone === 'a')?.text === FLAG, `9c the wash streamlined to 20 min is said in amber: "${amber[0]?.slice(0, 90)}…"`);
  }
  /* 9d · the paper, with the flag on it */
  {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), pressPaper(page, 'SMED — on paper')]);
    const pdf = join(OUT, 'smed-cleandown.pdf'); await dl.saveAs(pdf);
    const txt = san(pdfText(pdf));
    const has = x => txt.includes(san(x));
    const parts = x => has(san(x).slice(0, 60)) && has(san(x).slice(-45));
    const rows = k.sheet.rows;
    ok(has('A wet clean, allergen (nut)') && /TO RELEASE|To release/.test(txt) && parts(C1[0]) && parts(C1[1]) && parts(FLAG) && has('Chemicals and water: £45 a clean')
      && rows.filter(r => r.part).every(r => has(r.part)) && has('Verification') && has('Release'),
      `9d the paper read back: the clean on its band, To release, each element's part, the time to release, the wait, the flag and the chemicals`);
  }
  await wash.getByRole('radio', { name: '↓ Streamline' }).click(); await page.waitForTimeout(600);
  ok((await page.locator('.ie-says p.co-clean.is-a').count()) === 0 && (await page.locator('.ie-says p.co-clean').allTextContents()).some(x => /the clean and its verification as they are/.test(x)),
    '9c the streamline taken back — the flag goes, "as they are" comes back');
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h }); await page.waitForTimeout(300);
    await stage('Record');
    const o = await offSide();
    const chip = await card('QA release signed').getByRole('radio', { name: 'Release', exact: true }).boundingBox();
    await page.screenshot({ path: join(OUT, `smed-clean-${w}.png`), fullPage: false });
    ok(o.doc <= o.w && o.any <= o.w + 1 && chip && chip.height >= 40, `9d at ${w} px: nothing off the side (${o.doc} of ${o.w}), the part chips ${Math.round(chip?.height ?? 0)} px`);
  }
  /* 9e · a client on the project: sees the clean and the interval's products, changes neither */
  await page.evaluate(() => localStorage.setItem('faultline.access.force', 'client'));
  await go(`#/smed/${K}`);
  await page.locator('.co-steps, .ie-strip').first().waitFor({ timeout: 10000 }).catch(() => {});
  await stage('Record');
  {
    const doors = await page.locator('.co').getByRole('button', { name: /Is it a cleandown|Change the clean|List the products|Change the products/ }).count();
    const chips = await page.locator('.co-part-row .chip').count();
    const live = await page.locator('.co-part-row .chip').evaluateAll(xs => xs.filter(x => !x.disabled).length);
    const read = /The clean A wet clean, allergen \(nut\)/.test(await bandFacts()) && (await page.locator('.ie-says p.co-clean').count()) > 0;
    ok(read && chips === 18 && doors === 0 && live === 0, `9e a client reads the clean and its findings — no door to change the clean or the products, no part chip live${doors || live ? ` (found ${doors} doors, ${live} chips)` : ''}`);
  }
  await page.evaluate(() => localStorage.removeItem('faultline.access.force'));
  await page.setViewportSize({ width: 390, height: 844 });
}
