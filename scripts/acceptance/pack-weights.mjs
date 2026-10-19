/* A NEW REQUIREMENT, FROM PLAIN WORDS TO A WORKING SYSTEM (docs/CAPABILITY-CHECK.md,
 * part E). Rowland, 19 October: "Choose a useful manufacturing requirement
 * that is not already implemented ... Start with a plain-English request and
 * demonstrate the complete process."
 *
 * The requirement: pack weights against the law — how much product a line
 * gives away over the weight printed on the pack, what that costs a shift,
 * whether the packs keep the three rules packers must keep (the average
 * system, the ℮ mark), the filler set as low as the rules allow, and proved.
 * No tool, method or calculation in Faultline did this before 19 October:
 * the three rules, the giveaway and the lowest legal fill were written as
 * three blocks in lib/flow/analysis with their tests (packs.test.ts) — the
 * route for a capability no block has — and everything else here is the
 * platform as it stood.
 *
 * From an empty device, in a real browser:
 *   0  the request said in plain words; read first — said back, three
 *      questions with why each matters, one tapped, one written, one left
 *   1  the assistant's design (a recorded answer in the gateway's own shape,
 *      standing in for Claude as front-door and designed-tool do): a log of
 *      pack weights with the three rules, the giveaway, the lowest legal fill
 *      and the money a shift; gates on the rules; a before-and-after proof; a
 *      need for development said plainly (the inspector's reference test) —
 *      checked by the validator before it can run
 *   2  approved and started as a project
 *   3  thirty bags weighed on the floor; the nominal, the packs a shift and
 *      the cost a kg typed by the person (asked for, never guessed); every
 *      figure on the screen the module's own answer on the same entries
 *   4  the filler set and Quality's sign-off; the bags weighed again; one bag
 *      corrected under T2 — rule 3 broken, the gate refuses; corrected back
 *      — legal, less given away and 95% sure, the gate passes
 *   5  the measure before → now; the report read back
 *   6  reloaded: the project, its figures and its method still there; the
 *      need gathered on Methods with its brief; the method copied for reuse;
 *      Faultline's own pack-weights method found from the words with the
 *      assistant off; the phone
 *
 *   node scripts/acceptance/pack-weights.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const OUT = process.env.SHOTS;
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };

/* ------------------------------------------------ the assistant's two answers, recorded */
const fld = (label, type, o = {}) => ({ label, type, unit: '', min: null, max: null, options: [], formula: '', required: false, ...o });
const an = (label, block, o = {}) => ({ label, block, of: '', by: '', when_column: '', when_op: '', when_value: '', unit: '', against: '', also: [], target: null, target_box: '', formula: '', from_step: '', better: '', ...o });
const step = (title, o = {}) => ({ title, per: 'line', answer: 'done', role: '', passes_if: '', photos: 0, files: 0, due_days: null, after: [], tool: '', fields: [], columns: [], analyses: [], min_entries: null, only_if: { step: '', field: '', op: '', value: '' }, help: '', ...o });
const cond = (o) => ({ type: 'stepsDone', policy: 'block', step: '', field: '', op: '>=', value: null, value2: null, evidence: 'photo', min: null, measure: '', priority: 'any', due_days: null, label: '', ...o });
const COLS = [fld('Weight', 'number', { unit: 'g', required: true }), fld('Shift', 'choice', { options: ['Early', 'Late', 'Night'] })];
const BOXES = [fld('Nominal on the pack', 'number', { unit: 'g' }), fld('Packs a shift', 'number', { unit: 'packs' }), fld('Product cost a kg', 'number', { unit: '£' })];
const WEIGHED = [
  an('Average weight', 'mean', { of: 'Weight' }),
  an('The three rules', 'emark', { of: 'Weight', target_box: 'Nominal on the pack' }),
  an('Giveaway a pack', 'giveaway', { of: 'Weight', target_box: 'Nominal on the pack' }),
  an('Lowest legal fill', 'fill', { of: 'Weight', target_box: 'Nominal on the pack' }),
  an('Giveaway a shift', 'calc', { formula: 'giveaway_a_pack * packs_a_shift * product_cost_a_kg / 1000', unit: '£' }),
  an('Could save a shift', 'calc', { formula: '(average_weight - lowest_legal_fill) * packs_a_shift * product_cost_a_kg / 1000', unit: '£' }),
];
const DESIGN = {
  name: 'Pack weights on Line 3', purpose: 'Every bag weighed against the three rules for packers, the giveaway over 2 kg costed a shift, the filler set as low as the rules allow at the line’s spread, and proved.', kind: 'improvement',
  roles: [{ name: 'Operator', side: 'site' }, { name: 'Line lead', side: 'site' }, { name: 'Quality', side: 'site' }],
  stages: [
    { name: 'Weigh the bags', purpose: 'Thirty bags off the line, one by one.', steps: [step('Weigh bags off the line', { answer: 'log', role: 'Operator', columns: COLS, fields: BOXES, analyses: WEIGHED, min_entries: 30 })],
      gate: [cond({}), cond({ type: 'fieldMeets', policy: 'warn', step: 'Weigh bags off the line', field: 'The three rules', op: '=', value: 0, label: 'Legal on all three rules' })] },
    { name: 'Set the filler', purpose: 'Never below the lowest legal fill.', steps: [
      step('Set the filler to its new target', { answer: 'form', role: 'Line lead', after: ['Weigh bags off the line'], fields: [fld('New filler target', 'number', { unit: 'g', required: true })] }),
      step('Quality agrees the new target', { answer: 'signoff', role: 'Quality', after: ['Set the filler to its new target'] })],
      gate: [cond({})] },
    { name: 'Prove it', purpose: 'The same weighing at the new target.', steps: [step('Weigh bags off the line again', { answer: 'log', role: 'Operator', columns: COLS, fields: BOXES, min_entries: 30, after: ['Quality agrees the new target'],
      analyses: [...WEIGHED, an('Less given away?', 'compare', { of: 'Weight', from_step: 'Weigh bags off the line', better: 'lower' })] })],
      gate: [cond({}), cond({ type: 'fieldMeets', step: 'Weigh bags off the line again', field: 'The three rules', op: '=', value: 0, label: 'Legal on all three rules' }),
        cond({ type: 'fieldMeets', step: 'Weigh bags off the line again', field: 'Less given away?', op: '>=', value: 95, label: 'Less given away — at least 95% sure it is not chance' })] },
  ],
  measures: [
    { name: 'Giveaway a pack', unit: 'g', better: 'lower', target: 30, from: [{ step: 'Weigh bags off the line', field: 'Giveaway a pack' }, { step: 'Weigh bags off the line again', field: 'Giveaway a pack' }] },
    { name: 'Giveaway a shift', unit: '£', better: 'lower', target: null, from: [{ step: 'Weigh bags off the line', field: 'Giveaway a shift' }, { step: 'Weigh bags off the line again', field: 'Giveaway a shift' }] },
  ],
  needs: [{ what: 'The inspector’s reference test on a whole batch', why: 'So a batch is cleared the way Trading Standards would test it, not only by the packer’s own weighing', inputs: 'The batch size and the bags sampled from it',
    method: 'The Regulations’ sampling plan: the sample size and the defectives it may hold by batch size, and the sample mean against the nominal less a t-factor of the spread', check: 'Against the Regulations’ tables worked by hand' }],
  assumptions: ['A bag’s weight is its net weight — the bag itself taken off.'], questions: [],
};
const CLARIFY = {
  understood: 'Every bag weighed against the legal weight rules, what is given away over the weight on the bag costed a shift, the filler set as low as the rules allow, and proved', ready: false,
  questions: [
    { ask: 'What weight is printed on the bag?', why: 'It is the figure all three rules judge every bag against.', options: ['2 kg', '1 kg', '500 g'] },
    { ask: 'How many bags does the line pack a shift?', why: 'It turns grams given away a bag into money a shift.', options: ['2,400', '4,800', '9,600'] },
    { ask: 'Who weighs the bags?', why: 'It says whose step the weighing is.', options: ['The operator', 'Quality'] },
  ],
};
let designedFrom = '', assistOn = true;
const answer = req => {
  const body = JSON.parse(req.postData() ?? '{}');
  if (!assistOn) return { off: true, why: 'The assistant is not switched on for this.' };
  if (body.task === 'clarify') return { ok: true, clarify: CLARIFY, left: { calls: 24 } };
  if (body.task === 'design') { designedFrom = String(body.description ?? ''); return { ok: true, proposal: DESIGN, errors: [], warnings: [], left: { calls: 24 } }; }
  return { off: true, why: 'The assistant is not switched on for this.' };
};

/* the bags: thirty off the line before (the filler running at about 2,050 g, a wide spread) and after (set to 2,026 g) */
const BEFORE = [2026, 2027, 2067, 2002, 2049, 2002, 2076, 2056, 2082, 2041, 2061, 2046, 2036, 2055, 2024, 2044, 2067, 2053, 2043, 2100, 2053, 2039, 2056, 2040, 2044, 2044, 2097, 2052, 2056, 2067];
const AFTER = [2037, 2044, 2015, 2014, 2031, 2050, 2032, 2010, 2016, 2026, 2039, 2026, 2021, 2023, 2029, 2016, 2026, 2030, 2049, 2026, 2040, 2012, 2038, 2029, 2019, 2026, 2039, 2022, 2041, 2047];

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB', acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
await page.route('**/functions/v1/assist', r => r.request().method() === 'OPTIONS'
  ? r.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*' }, body: 'ok' })
  : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(answer(r.request())) }));
page.setDefaultTimeout(20000);
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m, why = '') => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${c || !why ? '' : ` — ${String(why).replace(/\s+/g, ' ').slice(0, 400)}`}`); if (!c) fail++; };
const flat = x => String(x ?? '').replace(/\s+/g, ' ').trim();
const sheet = () => page.getByRole('dialog').last();
const settle = async () => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(300); };
const NEED = 'We pack bags of potatoes on Line 3. I need to know how much product we give away over the weight on the bag and what it costs us a shift, prove we keep the legal weight rules (the e-mark average system), then set the filler as low as the law allows and prove it.';

/* the module's own answers on the same entries — what every figure on the screen and the paper is checked against */
const truthOf = (weights, boxes, earlier) => page.evaluate(async ([ws, bx, before]) => {
  const A = await import('/src/lib/flow/analysis.ts');
  const cols = [{ key: 'weight', label: 'Weight', type: 'number', unit: 'g' }, { key: 'shift', label: 'Shift', type: 'choice' }];
  const ents = xs => xs.map((w, i) => ({ id: `t${i}`, on: '2026-10-19', at: i, values: { weight: w } }));
  const list = [
    { key: 'average_weight', label: 'Average weight', block: 'mean', of: 'weight' },
    { key: 'the_three_rules', label: 'The three rules', block: 'emark', of: 'weight', targetFrom: 'nominal_on_the_pack' },
    { key: 'giveaway_a_pack', label: 'Giveaway a pack', block: 'giveaway', of: 'weight', targetFrom: 'nominal_on_the_pack' },
    { key: 'lowest_legal_fill', label: 'Lowest legal fill', block: 'fill', of: 'weight', targetFrom: 'nominal_on_the_pack' },
    { key: 'giveaway_a_shift', label: 'Giveaway a shift', block: 'calc', formula: 'giveaway_a_pack * packs_a_shift * product_cost_a_kg / 1000', unit: '£' },
    { key: 'could_save_a_shift', label: 'Could save a shift', block: 'calc', formula: '(average_weight - lowest_legal_fill) * packs_a_shift * product_cost_a_kg / 1000', unit: '£' },
    ...(before ? [{ key: 'less_given_away', label: 'Less given away?', block: 'compare', of: 'weight', from: 'weigh-bags-off-the-line', better: 'lower' }] : []),
  ];
  const labels = { nominal_on_the_pack: 'Nominal on the pack', packs_a_shift: 'Packs a shift', product_cost_a_kg: 'Product cost a kg' };
  const r = A.analyse(list, cols, ents(ws), { values: bx, labels }, before ? { 'weigh-bags-off-the-line': { title: 'Weigh bags off the line', columns: cols, entries: ents(before) } } : {});
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { says: v.says, value: v.value }]));
}, [weights, boxes, earlier ?? null]);
const BOX = { nominal_on_the_pack: 2000, packs_a_shift: 4800, product_cost_a_kg: 0.8 };

/* 0 — said at the front door, and read first */
await page.goto(`${BASE}/#/`); await page.locator('.fd-ask h1').waitFor({ timeout: 20000 });
await page.getByLabel('What you need, in your words', { exact: true }).fill(NEED);
await page.getByRole('button', { name: 'Start', exact: true }).click();
await page.locator('.fw-asking').waitFor({ timeout: 15000 });
const askTurn = flat(await page.locator('.fw-turn', { has: page.locator('.fw-asking') }).innerText());
ok(askTurn.includes(`${CLARIFY.understood}. Before it is designed, 3 questions`) && /It is the figure all three rules judge every bag against\./.test(askTurn) && await page.locator('.fw-proposed').count() === 0,
  '0 the request read before it is designed: said back, three questions with why each matters — nothing proposed yet', askTurn.slice(0, 300));
await page.locator('.fw-q[data-q="0"]').getByRole('radio', { name: '2 kg' }).click();
await page.getByLabel('Your own answer: How many bags does the line pack a shift?', { exact: true }).fill('4,800 on a 12-hour shift');
if (OUT) await page.locator('.fw-turn', { has: page.locator('.fw-asking') }).screenshot({ path: join(OUT, 'pw-0-asked.png') });
await page.getByRole('button', { name: 'Design it with these answers' }).click();
await page.locator('.fw-proposed').waitFor({ timeout: 15000 });
ok(designedFrom.startsWith(NEED) && designedFrom.includes('Asked before designing:\n- What weight is printed on the bag? — 2 kg\n- How many bags does the line pack a shift? — 4,800 on a 12-hour shift') && !designedFrom.includes('Who weighs the bags?'),
  '0a the design asked for with the request and the two answers — the one left unanswered not put in its mouth', designedFrom.slice(-240));

/* 1 — the design, reviewed before anything runs */
const prop = flat(await page.locator('.fw-proposed').innerText());
ok(/Weigh bags off the line · once · a log · Operator · 3 boxes · 2 columns an entry · works out average weight, the three rules, giveaway a pack, lowest legal fill, giveaway a shift, could save a shift/.test(prop),
  '1 proposed: a log of bag weights — the three rules, the giveaway, the lowest legal fill and the money a shift, from blocks the app runs', prop.slice(0, 500));
ok(/Needs development — what no block does yet/i.test(prop) && /The inspector’s reference test on a whole batch/.test(prop), '1a what no block does — the inspector’s reference test — said as a need for development, never faked', prop.slice(prop.search(/needs development/i), prop.search(/needs development/i) + 300));
ok(/It can run/.test(prop) && /Giveaway a pack/.test(prop), '1b the validator has checked it — it can run; the measure fed by both weighings');
if (OUT) await page.locator('.fw-proposed').screenshot({ path: join(OUT, 'pw-1-proposed.png') });

/* 2 — approved and started */
await page.getByRole('button', { name: 'Approve it and start a project' }).click();
await sheet().waitFor({ timeout: 15000 });
await page.getByLabel("The project's name", { exact: true }).fill('Line 3 — 2 kg bags');
await sheet().getByRole('button', { name: 'Start it' }).click();
await page.locator('.fw-row[data-step="weigh-bags-off-the-line"]').waitFor({ timeout: 15000 });
const projectUrl = page.url();
ok(/Line 3 — 2 kg bags/.test(flat(await page.locator('.nv-main').innerText())) && /#\/project\//.test(projectUrl), '2 approved and started: the project runs the method', projectUrl);

/* 3 — the bags weighed on the floor */
await page.locator('.fw-row[data-step="weigh-bags-off-the-line"]').first().click();
await sheet().locator('.fw-log-panel').waitFor({ timeout: 10000 });
const addBags = async ws => { for (const w of ws) { const form = sheet().locator('.fw-entry').first(); await form.getByLabel('Weight', { exact: true }).fill(String(w)); await form.getByRole('button', { name: 'Add the entry' }).click(); await page.waitForTimeout(120); } await page.waitForTimeout(500); };
await addBags(BEFORE);
const res = async key => flat(await sheet().locator(`.fw-result[data-analysis="${key}"]`).innerText().catch(() => ''));
ok(/needs the nominal quantity on the pack, from 5 to 50,000 \(g or ml\) — type it in “Nominal on the pack”/.test(await res('the_three_rules')) && /needs .*nominal on the pack|not worked out yet/i.test(await res('giveaway_a_shift')),
  '3 thirty bags in — the rules ask for the nominal in its box by name, the money for its rates: never guessed', await res('the_three_rules'));
for (const [label, v] of [['Nominal on the pack', '2000'], ['Packs a shift', '4800'], ['Product cost a kg', '0.80']]) { await sheet().getByLabel(label, { exact: true }).fill(v); await sheet().getByLabel(label, { exact: true }).press('Enter'); await page.waitForTimeout(400); }
await page.waitForTimeout(500);
const t1 = await truthOf(BEFORE, BOX);
const keys = ['average_weight', 'the_three_rules', 'giveaway_a_pack', 'lowest_legal_fill', 'giveaway_a_shift', 'could_save_a_shift'];
const shown1 = Object.fromEntries(await Promise.all(keys.map(async k => [k, await res(k)])));
ok(keys.every(k => shown1[k].includes(t1[k].says)), '3a every figure on the screen is lib/flow/analysis’s own answer on the same thirty bags', JSON.stringify(keys.filter(k => !shown1[k].includes(t1[k].says)).map(k => [k, shown1[k], t1[k].says])));
console.log(`      ${t1.the_three_rules.says}\n      ${t1.giveaway_a_pack.says}\n      ${t1.lowest_legal_fill.says}\n      ${t1.giveaway_a_shift.says}\n      ${t1.could_save_a_shift.says}`);
ok(t1.the_three_rules.value === 0 && /^The three rules: legal on all three rules — average 2050\.2 g against the nominal 2000 g, 0 of 30 under T1 \(1970 g;/.test(t1.the_three_rules.says),
  '3b legal on all three rules: 2 kg, its tolerable negative error 30 g — T1 1,970 g, T2 1,940 g');
ok(Math.abs(t1.giveaway_a_pack.value - 50.1667) < 0.001 && Math.abs(t1.giveaway_a_shift.value - 50.1667 * 4800 * 0.8 / 1000) < 0.01 && /£192\.64 — giveaway a pack × packs a shift × product cost a kg ÷ 1000/.test(t1.giveaway_a_shift.says),
  `3c given away: 50.17 g a bag — £192.64 a shift at 4,800 bags and £0.80 a kg, worked by hand: 50.1667 × 4,800 × 0.80 ÷ 1,000`, t1.giveaway_a_shift.says);
ok(/set by T2 1940 g \+ 3\.72 × the spread 22\.\d+ g \(rule 3: 1 in 10,000 at most under T2\)/.test(t1.lowest_legal_fill.says) && t1.lowest_legal_fill.value > 2023 && t1.lowest_legal_fill.value < 2024,
  `3d the lowest legal fill at this spread: ${t1.lowest_legal_fill.value?.toFixed(2)} g — rule 3 sets it, not the nominal`, t1.lowest_legal_fill.says);
ok(await sheet().locator('.fw-result[data-analysis="the_three_rules"] svg.fw-chart .fw-bar').count() >= 1, '3e the bags drawn against the limits — under T2, T2 to T1, T1 to nominal, nominal and over');
if (OUT) await sheet().locator('.fw-results').screenshot({ path: join(OUT, 'pw-3-figures.png') });
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();
await page.locator('.fw-gate-line[data-gate="weigh-the-bags"]').click();
ok(/Ready to pass/.test(flat(await sheet().innerText())) && /Legal on all three rules/.test(flat(await sheet().innerText())), '3f the first gate: every step done, and legal — ready to pass');
await sheet().getByRole('button', { name: 'Pass the gate' }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();

/* 4 — the filler set, Quality agrees, the bags weighed again */
await page.locator('.fw-strip .fw-sg[data-stage="set-the-filler"]').click(); await page.waitForTimeout(500);
await page.locator('.fw-row[data-step="set-the-filler-to-its-new-target"]').first().click();
await sheet().getByLabel('New filler target', { exact: true }).fill('2026'); await sheet().getByLabel('New filler target', { exact: true }).press('Enter'); await page.waitForTimeout(400);
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(600);
await page.keyboard.press('Escape'); await settle();
await page.locator('.fw-row[data-step="quality-agrees-the-new-target"]').first().click();
await sheet().getByLabel('Signed by', { exact: true }).fill('Priya (Quality)'); await sheet().getByLabel('Signed by', { exact: true }).press('Enter'); await page.waitForTimeout(400);
await sheet().getByRole('button', { name: 'Signed', exact: true }).click(); await page.waitForTimeout(600);
await page.keyboard.press('Escape'); await settle();
await page.locator('.fw-gate-line[data-gate="set-the-filler"]').click();
await sheet().getByRole('button', { name: 'Pass the gate' }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();
await page.locator('.fw-strip .fw-sg[data-stage="prove-it"]').click(); await page.waitForTimeout(500);
await page.locator('.fw-row[data-step="weigh-bags-off-the-line-again"]').first().click();
await sheet().locator('.fw-log-panel').waitFor();
for (const [label, v] of [['Nominal on the pack', '2000'], ['Packs a shift', '4800'], ['Product cost a kg', '0.80']]) { await sheet().getByLabel(label, { exact: true }).fill(v); await sheet().getByLabel(label, { exact: true }).press('Enter'); await page.waitForTimeout(300); }
await addBags(AFTER);
/* one bag corrected to 1,935 g — under T2 (1,940 g): rule 3 is broken, and the gate on it refuses */
const row = sheet().locator('.fw-entries-t tbody tr', { hasText: '2041 g' }).first();
await row.getByRole('button', { name: 'Correct' }).click();
await sheet().locator('.fw-entry-fix').getByLabel('Weight', { exact: true }).fill('1935');
await sheet().locator('.fw-entry-fix').getByRole('button', { name: 'Save the correction' }).click(); await page.waitForTimeout(700);
ok(/The three rules: breaks rule 3 \(1 pack under T2 — none may be\)/.test(await res('the_three_rules')), '4 one bag corrected under T2 (1,935 g): rule 3 broken, said in words', await res('the_three_rules'));
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();
await page.locator('.fw-gate-line[data-gate="prove-it"]').click();
const held = flat(await sheet().innerText());
ok(!/Ready to pass/.test(held) && /Legal on all three rules/.test(held) && await sheet().getByRole('button', { name: 'Pass the gate' }).count() === 0,
  '4a the gate refuses while a rule is broken — the application’s arithmetic decides, not anybody’s say-so', held.slice(0, 400));
await page.keyboard.press('Escape'); await settle();
await page.locator('.fw-row[data-step="weigh-bags-off-the-line-again"]').first().click(); await sheet().locator('.fw-log-panel').waitFor();
/* a done log is locked: taken back first (said and kept on the record), then corrected */
ok(await sheet().locator('.fw-entries-t tbody tr').first().getByRole('button', { name: 'Correct' }).count() === 0, '4b a done log is locked — nobody corrects completed work without taking it back');
await sheet().getByRole('button', { name: 'Take back “done”' }).click(); await page.waitForTimeout(700);
await sheet().locator('.fw-entries-t tbody tr', { hasText: '1935 g' }).first().getByRole('button', { name: 'Correct' }).click();
await sheet().locator('.fw-entry-fix').getByLabel('Weight', { exact: true }).fill('2041');
await sheet().locator('.fw-entry-fix').getByRole('button', { name: 'Save the correction' }).click(); await page.waitForTimeout(700);
const t2 = await truthOf(AFTER, BOX, BEFORE);
const shown2 = Object.fromEntries(await Promise.all([...keys, 'less_given_away'].map(async k => [k, await res(k)])));
ok([...keys, 'less_given_away'].every(k => shown2[k].includes(t2[k].says)), '4c corrected back: every figure of the second weighing is the module’s own, the proof against the first included',
  JSON.stringify([...keys, 'less_given_away'].filter(k => !shown2[k].includes(t2[k].says)).map(k => [k, shown2[k], t2[k].says])));
console.log(`      ${t2.the_three_rules.says}\n      ${t2.giveaway_a_pack.says}\n      ${t2.less_given_away.says}\n      ${t2.giveaway_a_shift.says}`);
ok(t2.the_three_rules.value === 0 && t2.less_given_away.value >= 95 && Math.abs(t2.giveaway_a_pack.value - 29.1) < 0.01, '4d at 2,026 g: legal on all three rules, 29.1 g given away a bag, and at least 95% sure less is given away');
await sheet().getByRole('button', { name: 'Done', exact: true }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();
await page.locator('.fw-gate-line[data-gate="prove-it"]').click();
ok(/Ready to pass/.test(flat(await sheet().innerText())), '4e the gate ready: legal, and proved');
await sheet().getByRole('button', { name: 'Pass the gate' }).click(); await page.waitForTimeout(700);
await page.keyboard.press('Escape'); await settle();

/* 5 — the measure and the report */
const measured = flat(await page.locator('.fw-measured').innerText().catch(() => ''));
ok(/Giveaway a pack: 50\.17 g before, 29\.1 g now — 21\.07 g better — target at most 30 g, met\./.test(measured) && /Giveaway a shift: £192\.64 before, £111\.74 now/.test(measured),
  '5 the measure before → now: 50.17 → 29.1 g a bag, £192.64 → £111.74 a shift', measured);
if (OUT) await page.screenshot({ path: join(OUT, 'pw-5-project.png'), fullPage: true });
const dir = mkdtempSync(join(tmpdir(), 'pack-weights-'));
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Method report' }).click()]);
const f = join(dir, 'report.pdf'); await dl.saveAs(f);
const pdf = flat(execFileSync('pdftotext', ['-raw', f, '-'], { encoding: 'utf8' }));
ok(pdf.includes(flat(t1.the_three_rules.says).slice(0, 80)) && pdf.includes(flat(t2.less_given_away.says).slice(0, 60)), '5a on paper: the three rules and the proof, as the module says them', pdf.slice(0, 300));
ok(/Giveaway a shift: £192\.64/.test(pdf) && /Giveaway a shift: £111\.74/.test(pdf) && /Lowest legal fill: 20\d\d\.\d g — set by T2/.test(pdf), '5b the money and the lowest legal fill on paper');
ok(/Needs development/.test(pdf) && /The inspector’s reference test on a whole batch/.test(pdf) && /Every entry/.test(pdf) && /Weight 2100 g/.test(pdf), '5c the need for development and every bag on paper');

/* 6 — saved: reloaded, it still works; the need gathered; reused; found again with the assistant off */
await page.goto(projectUrl); await page.reload(); await page.locator('.fw-measured').waitFor({ timeout: 15000 });
ok(flat(await page.locator('.fw-measured').innerText()) === measured, '6 reloaded: the project, its measure and its gates where they were');
await page.locator('.fw-strip .fw-sg[data-stage="weigh-the-bags"]').click(); await page.waitForTimeout(400);
await page.locator('.fw-row[data-step="weigh-bags-off-the-line"]').first().click(); await sheet().locator('.fw-log-panel').waitFor();
ok((await res('the_three_rules')).includes(t1.the_three_rules.says) && (await res('giveaway_a_shift')).includes(t1.giveaway_a_shift.says), '6a and its figures worked out again from the bags kept — the same answers');
await page.keyboard.press('Escape'); await settle();
await page.goto(`${BASE}/#/methods`); await page.locator('.fw-card').first().waitFor({ timeout: 15000 });
const methods = flat(await page.locator('.nv-main').innerText());
ok(/Pack weights on Line 3/.test(methods) && /What Faultline cannot do yet/i.test(methods) && /The inspector’s reference test on a whole batch/.test(methods), '6b on Methods: the method kept, and the need gathered with what asked it', methods.slice(0, 400));
await page.locator('.fw-card', { hasText: 'Pack weights on Line 3' }).first().click(); await page.waitForTimeout(1200);
await page.getByRole('button', { name: 'Make a copy' }).click(); await page.waitForTimeout(1500);
ok(/Pack weights on Line 3 \(copy\)/.test(flat(await page.locator('.nv-main').innerText())), '6c copied for the next product — a method of its own, to change the nominal’s box and run again');
/* the assistant off: the words alone find Faultline's own pack-weights method */
assistOn = false;
await page.goto(`${BASE}/#/`); await page.locator('.fd-ask h1').waitFor({ timeout: 20000 });
await page.getByLabel('What you need, in your words', { exact: true }).fill('stop giving away product — the bags are overweight on the checkweigher and the filler is set too high');
await page.getByRole('button', { name: 'Start', exact: true }).click(); await page.waitForTimeout(2500);
ok(/Pack weights — legal, and no more given away than needed/.test(flat(await page.locator('.nv-main').innerText())), '6d with the assistant off, the words alone offer Faultline’s own pack-weights method');
await page.setViewportSize({ width: 390, height: 844 }); await page.goto(projectUrl); await page.waitForTimeout(1500);
ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), '6e on a phone: the project fits, nothing off the side');

ok(errs.length === 0, `no console errors${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
