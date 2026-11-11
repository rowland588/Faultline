/* A METHOD PROJECT'S SECTIONS, OPENED (10 November — docs/DESIGN.md, the method page made calm). The page opens with the section
 * the project is in open and every other section a line in ui/Fold. A script that reads inside a section opens it the way a person
 * does — a tap on its fold — and the choice is kept on that device, as a tap keeps it.
 *
 *     await openMethodSections(page);              // every section of the method page in view
 *     await openMethodSections(page, ['Analyse']); // only the ones named (the section's aria-label, or its start) */
export async function openMethodSections(page, names) {
  await page.waitForSelector('.pmethod-sec', { timeout: 20000 }).catch(() => {});
  const secs = page.locator('.pmethod-sec');
  const n = await secs.count();
  for (let i = 0; i < n; i++) {
    const sec = secs.nth(i);
    const label = (await sec.getAttribute('aria-label')) ?? '';
    if (names && !names.some(w => label === w || label.startsWith(w))) continue;
    const fold = sec.locator(':scope > .fold').first();
    if (!(await fold.count())) continue;
    if (await fold.evaluate(e => e.classList.contains('is-open'))) continue;
    await fold.locator('.fold-toggle').first().click();
    await page.waitForTimeout(120);
  }
}

/* A METHOD'S BOARD, OPENED (11 November — docs/DESIGN.md, the boards made calm). DMAIC's phases, the A3's blocks, PDCA's quarters,
 * the Kaizen event's days and check, the Kata's cells, experiments and coaching, the five focusing steps and the 8D's parts open
 * with the step in hand open and the rest one line each (shapes/BoardFold, ids `method-board-<method>-<part>`). A script that reads
 * inside them opens every shut one with a tap, as a person would; the choice is kept on the device, so it holds after a reload.
 *
 *     await openBoardFolds(page); */
export async function openBoardFolds(page) {
  await page.waitForSelector('.pmethod', { timeout: 4000 }).catch(() => {});
  /* a step open only because it is the one in hand is shut and opened again, so the device keeps it open once the project moves on
     (a tap is the only thing a fold remembers) */
  const ids = await page.locator('[data-fold^="method-board-"].is-open').evaluateAll(els => els.map(e => e.getAttribute('data-fold')));
  const kept = await page.evaluate(list => list.filter(id => { try { return localStorage.getItem(`faultline.fold.${id}`) === '1'; } catch { return false; } }), ids);
  for (const id of ids) {
    if (kept.includes(id)) continue;
    const b = page.locator(`[data-fold="${id}"] > .fold-h .fold-toggle`);
    await b.click(); await page.waitForTimeout(40); await b.click(); await page.waitForTimeout(40);
  }
  for (let round = 0; round < 3; round++) {
    const shut = page.locator('[data-fold^="method-board-"]:not(.is-open) > .fold-h .fold-toggle');
    const n = await shut.count();
    if (!n) return;
    for (let i = n - 1; i >= 0; i--) { await shut.nth(i).click(); await page.waitForTimeout(60); }
    await page.waitForTimeout(150);
  }
}

/** A script's `go` that, landing on a method project's own page, opens its board's steps as a person would (above). For the
 *  scripts that read inside the boards — every other address is gone to as before. */
export const goOpeningBoard = t => async (h, ms) => {
  await t.go(h, ms);
  if (/^#\/project\/[^/?]+(\?.*)?$/.test(h)) await openBoardFolds(t.page);
};
