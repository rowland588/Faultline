/* Returning to a product's map must attach its board measurement after the capacity view unmounts. */
import { openApp } from '../lib/tocBrowser.mjs';
import { openSeedPage } from '../lib/seedPage.mjs';
const t = await openApp(); const { page: p, ok } = t;
await openSeedPage(p, new URL(process.env.SMOKE_BASE || 'http://127.0.0.1:5191').origin);
const href = await p.evaluate(async () => {
  const db = await import('/src/db.ts'); const line = await (await import('/src/lib/lines.ts')).addLineToFactory('Map return');
  const { EMPTY_CAPACITY, blankStation } = await import('/src/tools/linebalance/capacity.ts'); const now = Date.now();
  const id = crypto.randomUUID();
  await db.putStandard({ id, projectId: '', workspaceId: line.id, product: 'Map return product', marks: [{ id: 'map-person', kind: 'person', x: 30, y: 50, label: 'Line lead' }], capacity: { ...EMPTY_CAPACITY, stations: [blankStation(crypto.randomUUID(), 'machine', true)] }, sort: now, createdAt: now, updatedAt: now });
  return `#/w/${line.id}/standards/${id}`;
});
for (const width of [360, 820, 1440]) {
  await p.setViewportSize({ width, height: 900 });
  await t.go(`${href}?at=balance`); await p.locator('.capx').waitFor();
  await p.getByRole('tab', { name: 'Line standard', exact: true }).click();
  await p.locator('.ls-svg').waitFor();
  let size = await p.locator('.ls-board').evaluate(e => ({ w: e.clientWidth, h: e.clientHeight, svg: e.querySelector('svg')?.getAttribute('width') }));
  ok(size.w > 200 && size.h > 0 && Number(size.svg) === size.w, `map board and SVG measured after returning from capacity at ${width}px`);
  ok(!/only 0 px/.test(await p.locator('.ls-room').innerText()), `map height hint is measured at ${width}px`);
  await p.getByRole('tab', { name: 'Line balance', exact: true }).click();
  await p.getByRole('tab', { name: 'Line standard', exact: true }).click();
  await p.locator('.ls-svg').waitFor();
  ok(await p.locator('.ls-mark').count() === 1, `saved person remains after switching product views at ${width}px`);
  ok(await t.wide() <= 1, `map fits ${width}px`);
}
await t.finish('Accepted: measured map after capacity/balance view changes on every device');
