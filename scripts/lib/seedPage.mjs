/* Insert fixtures before mounting live readers. Assertions still visit the real app. */
export async function openSeedPage(page, base) {
  const url = `${base}/__faultline_fixture__.html`;
  await page.route(url, route => route.fulfill({
    contentType: 'text/html', body: '<!doctype html><meta charset="utf-8"><title>Test fixtures</title>',
  }), { times: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
}
