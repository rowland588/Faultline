/* THE PAGE HEADER, AS A PERSON USES IT (docs/STRUCTURE.md §5.4, B3) — every paper a page has behind
 * Report ▾, its other actions behind More ▾ (src/ui/parts PageHeader). The acceptance scripts and the
 * journeys press a paper or an action by its name: from the menu where the page has moved it there,
 * or the page's own button where it still draws one — so a script reads the same before and after a
 * page moves to the header.
 *
 *     await paper(page, 'Problems report')            Report ▾ › Problems report
 *     await more(page, 'Edit the line')               More ▾ › Edit the line
 *     const [dl] = await Promise.all([page.waitForEvent('download'), paper(page, 'Line report')]);
 */
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const named = label => (label instanceof RegExp ? label : new RegExp(`^${esc(label)}`));

/** The control that does it: the page's own button, else the item in its header's menu (opened). */
export async function find(page, menu, label, within) {
  const scope = within ?? page.locator('main');
  /* never the context bar's crumbs — "Line capacity" going back to its list is not its paper */
  const own = scope.getByRole('button', { name: label, exact: typeof label === 'string' }).and(page.locator(':not(.nv-crumb)'));
  const menuB = scope.locator(".part-menu-b", { hasText: new RegExp(`^${menu}`) });
  /* a page still reading draws neither yet — wait for one of them before choosing */
  await own.or(menuB).first().waitFor({ timeout: 15000 }).catch(() => {});
  if (await own.count()) return own.first();
  await menuB.first().click();
  return page.getByRole('menuitem').filter({ has: page.locator('b', { hasText: named(label) }) }).first();
}
/** Press a paper by its name — Report ▾ on the page header. */
export const paper = async (page, label, within) => (await find(page, 'Report', label, within)).click();
/** Press one of the page's other actions by its name — More ▾ on the page header. */
export const more = async (page, label, within) => (await find(page, 'More', label, within)).click();

/** A LINE'S REPORT, FROM ITS REPORTS TAB (16 November, docs/NAV.md) — the line whose page is open:
 *    'summary'     the Reports tab › Summary › Download (the one page)
 *    'everything'  the Reports tab › Everything › Download (the full package, made on arrival)
 *    'shorter'     the Everything page's Shorter version, made on arrival (the combined report — no door of its own) */
export async function linePaper(page, which) {
  const ws = /#\/lines\/([^/?]+)/.exec(page.url())?.[1];
  if (!ws) throw new Error(`linePaper: not on a line's page (${page.url()})`);
  if (which === 'shorter') { await page.goto(`${new URL(page.url()).origin}/#/lines/${ws}/report?save=1`); return; }
  await page.locator('.nv-tabs .nv-tab', { hasText: /^Reports/ }).first().click();
  const row = page.locator(`[data-line-report="${which}"]`);
  await row.waitFor({ timeout: 15000 });
  await row.getByRole('button', { name: 'Download', exact: true }).click();
}
