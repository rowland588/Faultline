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
  const own = scope.getByRole('button', { name: label, exact: typeof label === 'string' });
  const menuB = scope.locator(".part-head .part-menu-b, .ln-band .part-menu-b", { hasText: new RegExp(`^${menu}`) });
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
