/* ACCEPTANCE — A DOCUMENT, CALM (10–11 November, docs/DESIGN.md — Rowland: "Faultline is a sophisticated operational improvement
 * system, but it should feel remarkably simple to use … I would rather have a beautifully simple interface supported by sophisticated
 * engineering than a screen displaying every capability the application possesses").
 *
 * A document (src/tools/doc — the 8D report, the charter, SIPOC, CTQs, Kano, SOP, job instruction, one-point lesson, the tiered meeting,
 * all one shape) had every section open with every box at once — 9,815 px at a desk and 13,230 on a phone for the seeded 8D. Now the
 * section in hand is open and every other one is a line in ui/Fold saying how far it is written; the reading's tables (open at a desk)
 * and what it does not say are folds of their own. Nothing is taken away.
 *
 *   1  a new 8D report at a desk: D0 — the first, on a document with nothing in it — the one section open; every other shut, its one
 *      line "Not started · n needed still" with n its own needed boxes (the definition's), every section the module asks drawn
 *   2  a shut section opened (D2): every box, list and photos box the definition gives it; no box, row or section drawn as a card
 *   3  D0's needed boxes typed through the real boxes: D0 one line saying it has no needed box empty, D1 the section in hand
 *   4  the seeded 8D at a desk: its tables open with their rows, What this does not say one line ("n limits of this reading") and,
 *      opened, every limit the reading has; the height printed and well under the 9,815 px before
 *   5  the phone (390): the section in hand open on the new 8D; the seeded 8D's tables and limits each one line; every fold's press
 *      ≥ 44 px; nothing off the side; the height printed and well under the 13,230 px before
 *
 *   node scripts/acceptance/docs-calm.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const BEFORE = { desk: 9815, phone: 13230 };
const t = await openApp();
const { page, ok, go } = t;
const sd = await t.seed();
const flat = s => (s ?? '').replace(/\s+/g, ' ').trim();

/* the definition's sections, as the module asks them of an empty 8D, with their needed boxes */
const model = await page.evaluate(async () => {
  const R = await import('/src/tools/doc/registry.ts'); const D = await import('/src/tools/doc/doc.ts'); const db = await import('/src/db.ts');
  const def = R.docByKey('eight-d');
  const s = D.newDocStudy(def, { name: 'Calm check — a new 8D', now: Date.now() });
  await db.putStudy(s);
  return { id: s.id, sections: D.askedSections(def, {}).map(x => ({ id: x.id, title: x.title, items: x.items.length, needed: x.items.filter(i => i.required).length })) };
});

async function read() {
  return page.locator('.doc-form .doc-sec').evaluateAll(els => els.map(e => {
    const f = e.querySelector(':scope > .fold');
    return { id: e.getAttribute('data-doc-section'), title: f?.querySelector('.fold-t')?.textContent ?? '', open: !!f?.classList.contains('is-open'), says: f?.querySelector('.fold-s')?.textContent ?? '' };
  }));
}
const clearFolds = () => page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('faultline.fold.doc.')) localStorage.removeItem(k); });

/* ---- 1 the section in hand open, the rest one line ---- */
await go(`#/doc/eight-d/${model.id}`, 2500);
await page.waitForSelector('.doc-form .doc-sec', { timeout: 20000 });
let secs = await read();
ok(secs.map(s => s.id).join() === model.sections.map(s => s.id).join(), `1 every section the module asks drawn in its order (${secs.length} of ${model.sections.length})`);
ok(secs.filter(s => s.open).map(s => s.id).join() === model.sections[0].id, `1 only the first section open on an empty document: ${secs.filter(s => s.open).map(s => s.title).join(', ')}`);
for (const [i, s] of secs.entries()) {
  const m = model.sections[i];
  const want = m.needed ? `Not started · ${m.needed} needed still` : 'Not started';
  ok(flat(s.says) === want && s.title === m.title, `1 ${m.title} — one line: "${flat(s.says)}"`, want);
}

/* ---- 2 a shut section opened: every box, and no card inside a card ---- */
const d2 = model.sections.find(s => s.id === 'd2');
await page.locator('[data-doc-section="d2"] > .fold .fold-toggle').click(); await page.waitForTimeout(400);
const boxes = await page.locator('[data-doc-section="d2"] .fold-b').evaluate(b => b.querySelectorAll(':scope > [data-field], :scope > [data-list], :scope > [data-photos]').length);
ok(boxes === d2.items, `2 ${d2.title} opened — every box the definition gives it: ${boxes} of ${d2.items}`);
const boxed = await page.locator('.doc-form').evaluate(form => [...form.querySelectorAll('.doc-sec, .fold, .doc-field, .doc-list, .doc-row, .doc-photos')].filter(e => {
  const cs = getComputedStyle(e); return cs.boxShadow !== 'none' || (parseFloat(cs.borderTopLeftRadius) > 0 && cs.backgroundColor !== 'rgba(0, 0, 0, 0)');
}).length);
ok(boxed === 0, `2 no section, box, list or row drawn as a card (${boxed} boxed)`);
await page.reload(); await page.waitForTimeout(2500);
ok((await read()).find(s => s.id === 'd2')?.open === true, '2 D2 still open after a reload — the device keeps the choice, as a tap keeps it');
await page.locator('[data-doc-section="d2"] > .fold .fold-toggle').click(); await page.waitForTimeout(300);

/* ---- 3 D0 written: D1 the section in hand ---- */
await page.locator('[data-field-input="raisedOn"]').fill('2026-11-01');
await page.locator('[data-field="source"] [data-value="complaint"]').click();
await page.locator('[data-field-input="symptom"]').fill('Leaking seals on lane 3 trays, found on delivery');
await page.locator('[data-field-input="response"]').fill('Lane 3 stopped; the last two pallets held');
await page.locator('[data-field-input="response"]').blur(); await page.waitForTimeout(1200);
await clearFolds();
await page.reload(); await page.waitForTimeout(2500);
secs = await read();
const d0 = secs.find(s => s.id === 'd0');
ok(!d0.open && !/needed still/.test(d0.says) && /\d+ of \d+ filled in|Written/.test(d0.says), `3 D0 written — one line, no needed box empty: "${flat(d0.says)}"`);
ok(secs.filter(s => s.open).map(s => s.id).join() === 'd1', `3 D1 the section in hand now: ${secs.filter(s => s.open).map(s => s.title).join(', ')}`);

/* ---- 4 the seeded 8D at a desk: the reading's own folds ---- */
const limits = await page.evaluate(async id => { const db = await import('/src/db.ts'); const D = await import('/src/tools/doc/doc.ts'); return D.studyDoc(await db.getStudy(id)).result.caveats.length; }, sd.docEightDId);
await go(`#/doc/eight-d/${sd.docEightDId}`, 2500);
const tbl = '[data-doc-table="How long each discipline took"]';
ok(await page.locator(`${tbl} > .fold.is-open`).count() === 1 && await page.locator(`${tbl} tbody tr`).count() === 7, `4 the table open at a desk with its rows (${await page.locator(`${tbl} tbody tr`).count()})`);
const cav = page.locator('.doc-caveats > .fold');
ok(!(await cav.evaluate(e => e.classList.contains('is-open'))) && flat(await cav.locator('.fold-s').innerText()) === `${limits} limit${limits === 1 ? '' : 's'} of this reading` && await page.locator('.doc-caveats li').count() === 0,
  `4 What this does not say one line: "${flat(await cav.locator('.fold-s').innerText())}"`);
await cav.locator('.fold-toggle').click(); await page.waitForTimeout(300);
ok(await page.locator('.doc-caveats li').count() === limits, `4 …opened, every limit the reading has (${await page.locator('.doc-caveats li').count()} of ${limits})`);
await cav.locator('.fold-toggle').click(); await page.waitForTimeout(300);
const deskH = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`      desk height ${deskH} px (before ${BEFORE.desk})`);
ok(deskH < BEFORE.desk * 0.5, `4 the 8D at a desk well under the before: ${deskH} px against ${BEFORE.desk}`);

/* ---- 5 the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await clearFolds();
await go(`#/doc/eight-d/${model.id}`, 2500);
secs = await read();
ok(secs.filter(s => s.open).map(s => s.id).join() === 'd1', `5 the phone: only the section in hand open (${secs.filter(s => s.open).map(s => s.title).join(', ')})`);
await go(`#/doc/eight-d/${sd.docEightDId}`, 2500);
ok(await page.locator(`${tbl} > .fold:not(.is-open)`).count() === 1 && await page.locator('.doc-caveats > .fold:not(.is-open)').count() === 1, '5 the phone: the table and what it does not say each one line, shut');
const small = await page.locator('.doc-form .fold-toggle, .doc-later .fold-toggle').evaluateAll(els => els.map(e => e.getBoundingClientRect().height).filter(h => h < 44).length);
ok(small === 0, `5 the phone: every fold's press at least 44 px (${small} smaller)`);
ok(await t.wide() <= 0, `5 the phone: nothing off the side (${await t.wide()} px)`);
const past = await page.locator('.doc-form .fold-t').evaluateAll(els => els.filter(e => e.getBoundingClientRect().right > window.innerWidth).length);
ok(past === 0, `5 the phone: every section's name inside the screen (${past} past the edge)`);
const phoneH = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`      phone height ${phoneH} px (before ${BEFORE.phone})`);
ok(phoneH < BEFORE.phone * 0.5, `5 the phone 8D well under the before: ${phoneH} px against ${BEFORE.phone}`);

await t.finish('A document opens on the section in hand; every other section, its tables on a phone and what it does not say are one line each, and open to all they held.');
