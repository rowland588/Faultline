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
  /* a place's papers are its Reports tab since 16 November (docs/NAV.md) — the Factory's and an area's */
  const tab = page.locator('.nv-tabs .nv-tab', { has: page.locator('.nv-tab-l', { hasText: /^Reports$/ }) });
  /* a page still reading draws neither yet — wait for one of them before choosing */
  await own.or(menuB).or(menu === 'Report' ? tab : menuB).first().waitFor({ timeout: 15000 }).catch(() => {});
  if (await own.count()) return own.first();
  if (menu === 'Report' && !(await menuB.count()) && await tab.count()) return placePaper(page, label, tab);
  await menuB.first().click();
  return page.getByRole('menuitem').filter({ has: page.locator('b', { hasText: named(label) }) }).first();
}
/** Press a paper by its name — Report ▾ on the page header. */
export const paper = async (page, label, within) => {
  if (/Project report/.test(String(label)) && await page.locator('.pmethod, .mrep').count()) {
    if (!(await page.locator('.mrep').count())) await page.getByRole('button', { name: 'Project report', exact: true }).click();
    await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
    return;
  }
  await (await find(page, 'Report', label, within)).click();
};

/** Choose a scope page through the visible control at this viewport. */
export async function scopePage(page, label, tab) {
  const picker = page.locator('.scope-page-picker select');
  if (await picker.isVisible()) await picker.selectOption({ label });
  else await (tab ?? page.locator('.nv-tabs .nv-tab').filter({ has: page.locator('.nv-tab-l', { hasText: new RegExp(`^${esc(label)}$`) }) })).first().click();
}
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
  await scopePage(page, 'Reports');
  const row = page.locator(`[data-line-report="${which}"]`);
  await row.waitFor({ timeout: 15000 });
  await row.getByRole('button', { name: 'Download', exact: true }).click();
}

/** A PLACE'S PAPER, FROM ITS REPORTS TAB (16 November, docs/NAV.md N2) — the Factory's (Summary is the Factory overview; the control
 *  room's page, the client update and the library in its Other papers fold) and an area's (Everything is the area report). Returns the
 *  control that does what the old Report ▾ item did. */
export async function placePaper(page, label, tab) {
  const t = tab ?? page.locator('.nv-tabs .nv-tab', { has: page.locator('.nv-tab-l', { hasText: /^Reports$/ }) });
  if (!(await page.locator('[data-place-reports]').count())) {
    await scopePage(page, 'Reports', t);
    await page.locator('[data-place-reports]').waitFor({ timeout: 15000 });
  }
  const L = label instanceof RegExp ? label.source : String(label);
  const row = (k, b) => page.locator(`[data-place-report="${k}"]`).getByRole('button', { name: b, exact: true });
  if (/Factory overview/.test(L)) return row('summary', 'Open it');
  if (/Area report/.test(L)) return row('everything', 'Download');
  const fold = page.locator('[data-fold="factory-other-papers"]');
  if (await fold.count() && !(await page.locator('[data-fold="factory-other-papers"].is-open').count())) {
    await fold.locator('.fold-toggle').first().click();
    await page.waitForTimeout(300);
  }
  const other = w => page.locator('[data-other-papers] .lrs-p', { hasText: w }).getByRole('button', { name: 'Open', exact: true });
  if (/Client update/.test(L)) return other('Client update');
  if (/Every report/.test(L)) return other('Each project’s and each line’s papers');
  if (/Control room report/.test(L)) return page.locator('[data-other-papers] .lrs-p', { hasText: 'Control room report' }).getByRole('button', { name: 'Download', exact: true });
  throw new Error(`placePaper: no paper named ${L} on this place's Reports tab`);
}
