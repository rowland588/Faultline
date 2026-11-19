/* ADD LINES ON SET UP (19 November — f203483: Set up's one primary is Add area until an area exists, then Add lines). A factory that
 * names no area yet reaches the add-lines form by the app's own door, #/factory?add=1 (the empty Factory's), where a line needs no
 * area; one with areas presses Add lines. Either way the form's own boxes are filled by the script. */
export async function openAddLines(page, base) {
  const b = page.getByRole('button', { name: 'Add lines', exact: true });
  if (await b.count() && await b.first().isVisible()) await b.first().click();
  else await page.goto(`${base}/#/factory?add=1`);
  await page.getByLabel("The new line's name").waitFor({ timeout: 15000 });
}

/* EVERY TOOL ON TOOLS (18 November — Tools opens on eight working tools, "All n tools" beside the heading for the rest): open the whole
 * list as a person does before a check that reads every tool. */
export async function showAllTools(page) {
  const b = page.locator('.et-show-all[aria-expanded="false"]');
  if (await b.count()) { await b.first().click(); await page.waitForTimeout(400); }
}
