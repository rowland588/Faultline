/* ACCEPTANCE — A METHOD'S BOARD, CALM (11 November, docs/DESIGN.md — Rowland: "Faultline is a sophisticated operational improvement
 * system, but it should feel remarkably simple to use … the complexity should exist underneath the interface").
 *
 * method-calm.mjs proves a method project's SECTIONS open on the one in hand. This proves the BOARD drawn above them — DMAIC's phase
 * gates, the A3's seven blocks, PDCA's quarters, the Kaizen event's days and 30-day check, the Kata's cells, experiments and coaching,
 * the five focusing steps and the 8D's parts — opens the same way: the step in hand open, every other step one line in ui/Fold
 * saying its state in words, opening to everything it held. Each board was drawn whole before (DMAIC's board 2,138 px at a desk and
 * 3,372 on a phone, PDCA's 1,924 · 4,084, the Kata's 1,605 · 2,917 …), a card inside a card.
 *
 *   for each seeded method project (DMAIC, PDCA, 8D, A3, Kaizen event, Kata, Theory of Constraints), at a desk and on a phone, on a
 *   device that has chosen nothing:
 *   1  at most one board step open, and the one open says it is the one in hand
 *   2  every shut step one line saying its state in words (Not started · Not written · Under way · Written · All written · Passed …)
 *   3  a shut step opened shows what it held, and its line is still there
 *   4  no card inside a card: nothing in the board drawn with a shadow, or as a filled rounded box, but its controls
 *   5  the board's height printed and well under the before
 *   6  the phone: nothing off the side, every step's press at least 44 px
 *   7  the 8D: a discipline tapped on the strip opens its part (D6 → the corrective actions)
 *
 *   node scripts/acceptance/method-boards-calm.mjs      (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

/* the boards' heights before (desk · phone, the seeded projects, 10 November) */
const BEFORE = {
  dmaic: [2138, 3372], pdca: [1924, 4084], 'eight-d': [1200, 2183], a3: [1553, 2527], 'kaizen-event': [1233, 2893], kata: [1605, 2917], toc: [644, 1133],
};
const STATE = /Not started|Not written|Under way|Written|All written|Ready for review|Passed|Held|Not recorded|Overdue|Holding|Slipping|Lost|pass|answered|containment|changes timed|used here/;

const t = await openApp();
const { page, ok, go } = t;
const sd = await t.seed();
const ids = { dmaic: sd.methodProjectId, ...sd.methodProjectIds };

const clear = () => page.evaluate(() => { for (const k of Object.keys(localStorage)) if (k.startsWith('faultline.fold.method-')) localStorage.removeItem(k); });
const read = key => page.locator(`[data-fold^="method-board-${key}-"]`).evaluateAll(els => els.map(e => ({
  id: e.getAttribute('data-fold'), open: e.classList.contains('is-open'), says: (e.querySelector(':scope > .fold-h .fold-s')?.textContent ?? '').replace(/\s+/g, ' ').trim(),
  body: e.querySelector(':scope > .fold-b')?.textContent?.trim().length ?? 0,
})));
const boardH = () => page.evaluate(() => { const b = document.querySelector('.pmethod > section:not(.pmethod-sec):not(.mdash)'); return b ? Math.round(b.getBoundingClientRect().height) : 0; });

for (const [vw, vh, tag, ix] of [[1360, 900, 'desk', 0], [390, 844, 'phone', 1]]) {
  await page.setViewportSize({ width: vw, height: vh });
  for (const [key, before] of Object.entries(BEFORE)) {
    await clear();
    await go(`#/project/${ids[key]}`, 2600);
    await page.waitForSelector(`[data-fold^="method-board-${key}-"]`, { timeout: 20000 }).catch(() => {});
    let steps = await read(key);
    ok(steps.length >= 3, `${tag} ${key}: the board's steps each in a fold (${steps.length})`);
    /* ---- 1 one step open, the one in hand ---- */
    const open = steps.filter(s => s.open);
    ok(open.length <= 1 && open.every(s => /in hand|is here/.test(s.says)), `1 ${tag} ${key}: ${open.length ? `only the step in hand open — ${open[0].id.replace(`method-board-${key}-`, '')}: "${open[0].says}"` : 'no step in hand on the board (its next step is in the sections)'}`);
    /* ---- 2 every shut step one line, its state in words ---- */
    const shut = steps.filter(s => !s.open);
    const mute = shut.filter(s => !STATE.test(s.says));
    ok(shut.length >= 2 && mute.length === 0, `2 ${tag} ${key}: ${shut.length} steps shut, each saying its state in one line${mute.length ? ` — silent: ${mute.map(s => s.id).join(', ')}` : ` (e.g. "${shut[0]?.says}")`}`);
    /* ---- 5 the height ---- */
    const h = await boardH();
    console.log(`      ${tag} ${key} board ${h} px (before ${before[ix]})`);
    ok(h > 0 && h < before[ix] * (key === 'toc' ? 0.95 : 0.8), `5 ${tag} ${key}: the board well under the before — ${h} px against ${before[ix]}`);
    /* ---- 6 the phone ---- */
    if (tag === 'phone') {
      ok(await t.wide() <= 1, `6 phone ${key}: nothing off the side (${await t.wide()} px)`);
      const small = await page.locator('[data-fold^="method-board-"] > .fold-h .fold-toggle').evaluateAll(els => els.map(e => e.getBoundingClientRect().height).filter(x => x > 0 && x < 44).length);
      ok(small === 0, `6 phone ${key}: every step's press at least 44 px (${small} smaller)`);
    }
    /* ---- 3 a shut step opened ---- */
    const one = shut[0];
    if (one) {
      await page.locator(`[data-fold="${one.id}"] > .fold-h .fold-toggle`).click(); await page.waitForTimeout(300);
      const got = (await read(key)).find(s => s.id === one.id);
      ok(got?.open && got.body > 0 && got.says === one.says, `3 ${tag} ${key}: ${one.id.replace(`method-board-${key}-`, '')} opened to what it held (${got?.body} characters), its line kept`);
    }
    /* ---- 4 no card inside a card ---- */
    if (tag === 'desk') {
      const boxed = await page.locator('.pmethod > section:not(.pmethod-sec):not(.mdash)').evaluate(b => [...b.querySelectorAll('div, section, article, li, p, label, ol, ul, dl')].filter(e => {
        if (e.closest('button, .chip, .btn, input, textarea, .lm-mark, [data-luna-draft]')) return false;
        const cs = getComputedStyle(e);
        const filled = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(cs.borderTopLeftRadius) > 0;
        return cs.boxShadow !== 'none' || filled;
      }).map(e => e.className).slice(0, 5));
      ok(boxed.length === 0, `4 desk ${key}: no step or anything in it drawn as a card${boxed.length ? ` — ${boxed.join(', ')}` : ''}`);
    }
  }
}

/* ---- 7 the 8D's strip opens its part ---- */
await page.setViewportSize({ width: 1360, height: 900 });
await clear();
await go(`#/project/${ids['eight-d']}`, 2600);
const actions = () => page.locator('[data-fold="method-board-eight-d-actions"]');
const was = await actions().evaluate(e => e.classList.contains('is-open'));
await page.locator('.e8-strip .e8-d').nth(6).click(); await page.waitForTimeout(500);
ok(!was && await actions().evaluate(e => e.classList.contains('is-open')), '7 the 8D: D6 tapped on the strip opens the corrective actions');

await t.finish('Every method board opens on the step in hand; every other step is one line saying where it stands, and opens to all it held.');
