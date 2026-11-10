/* MORE ABOUT THIS LINE (10 November — Rowland: "the line pages are difficult also, busy … Everything is too busy"): on a line's
 * Overview everything after the machines — Programs, Spread what works, Eyes on the line, Photos from walks, Tools on this line,
 * Logs, Projects, The line — sits in one fold (ui/Fold, id line-more), shut until opened. A script that reads one of those parts
 * on the Overview opens the fold first, as a person would; the fold remembers being open on that device, so a second visit finds
 * it open and nothing is pressed.
 *
 *     await go(`#/lines/${ws}`); await openLineMore(page);
 */
export const LINE_PAGE = /#\/lines\/[^/?#]+(\?(?!view=)[^#]*)?$/;

/** Open "More about this line" on the line's Overview, if it is shut. A page that is not a line's Overview is left alone. */
export async function openLineMore(page) {
  if (!LINE_PAGE.test(page.url())) return;
  const fold = page.locator('[data-fold="line-more"]');
  try { await fold.first().waitFor({ timeout: 8000 }); } catch { return; }
  if (await page.locator('[data-fold="line-more"].is-open').count()) return;
  await fold.first().locator('.fold-toggle').click();
  await page.locator('[data-fold="line-more"].is-open').first().waitFor({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(300);
}
