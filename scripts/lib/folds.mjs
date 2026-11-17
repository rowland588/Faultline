/** Open a secondary section through its visible heading, retaining a device's existing choice. */
export async function openFold(page, id) {
  // Primary settings now stand open on the page; verify the section itself before skipping a disclosure.
  if (['study-setup-details', 'study-setup-cost', 'study-setup-machines', 'study-setup-shifts'].includes(id) && await page.locator(`section.line-settings-section[id="${id}"]`).isVisible()) return;
  if (id === 'line-doing' && await page.locator('.pl-work').isVisible()) return;
  const fold = page.locator(`[data-fold="${id}"]`);
  await fold.waitFor({ state: 'visible', timeout: 20000 });
  if (!await fold.evaluate(e => e.classList.contains('is-open'))) await fold.locator(':scope > .fold-h > .fold-toggle').click();
  await fold.locator(':scope > .fold-b').waitFor({ state: 'visible' });
}
