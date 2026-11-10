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
