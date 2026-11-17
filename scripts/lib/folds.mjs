/** Open a secondary section through its visible heading, retaining a device's existing choice. */
export async function openFold(page, id) {
  const fold = page.locator(`[data-fold="${id}"]`);
  await fold.waitFor({ state: 'visible', timeout: 20000 });
  if (!await fold.evaluate(e => e.classList.contains('is-open'))) await fold.locator(':scope > .fold-h > .fold-toggle').click();
  await fold.locator(':scope > .fold-b').waitFor({ state: 'visible' });
}
