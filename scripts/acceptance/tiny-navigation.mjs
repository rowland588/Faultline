/* Every top-bar control remains in reach on small AI screens; record search stays available. */
import { openApp } from '../lib/tocBrowser.mjs';
const t = await openApp({ width: 360, height: 844 }); const { page: p, ok } = t;
await t.go('#/room');
await p.evaluate(async () => {
  const db = await import('/src/db.ts'); const line = await (await import('/src/lib/lines.ts')).addLineToFactory('Packing search'); const now = Date.now();
  await db.putStudy({ id: 'saved-search-use', tool: 'capability', name: 'Morning fill weight', machine: 'Filler', workspaceId: line.id, facts: {}, uses: [], startedAt: now, createdAt: now, updatedAt: now });
});
await t.go('#/'); await p.locator('.ai-compose').waitFor();
for (const width of [320, 360, 390, 820, 1440]) {
  await p.setViewportSize({ width, height: 1000 }); await p.waitForTimeout(100);
  ok(await t.wide() <= 1, `AI navigation fits ${width}px`);
  const outside = await p.locator('.nv-top button:visible, .nv-top a:visible').evaluateAll(es => es.filter(e => { const r = e.getBoundingClientRect(); return r.x < -1 || r.right > innerWidth + 1; }).map(e => e.getAttribute('aria-label') || e.textContent));
  ok(outside.length === 0, `every header control is on screen at ${width}px`);
}
await p.setViewportSize({ width: 360, height: 844 });
/* ONE HEADER ON A PHONE (20 November — Rowland: "combine the header into one"): Luna's menu took Everything's place in her top bar; on a
   phone Everything is the first row of the bottom bar's More (the same icon), so it is pressed there, as a person finds it */
await p.locator('.nv-top [data-luna-menu] button').waitFor();   /* the screen was a desk a moment ago: her menu moves into the bar as the width changes */
ok((await p.locator('.nv-top [data-everything-open]:visible').count()) === 0 && (await p.locator('.nv-top [data-luna-menu] button:visible').count()) === 1, 'on a phone the top bar holds Luna’s one menu, and no second Everything');
ok((await p.locator('.ai-head').evaluate(e => e.getBoundingClientRect().height)) <= 1, 'Luna’s own row under the bar is gone — one header');
await p.locator('.nv-bar button').filter({ hasText: 'More' }).click();
await p.getByRole('button', { name: /^Everything/ }).click();
await p.getByRole('button', { name: 'Search all lines, machines and problems', exact: true }).click();
await p.getByRole('dialog', { name: 'Jump to', exact: true }).waitFor();
ok(await p.getByRole('textbox', { name: 'Jump to', exact: true }).isVisible(), 'record search opens directly from Everything on small phones');
await p.getByRole('textbox', { name: 'Jump to', exact: true }).fill('Morning fill weight');
await p.locator('.jt-row').filter({ hasText: 'Morning fill weight' }).click();
await p.waitForURL('**/#/capability/saved-search-use?workspace=tools');
ok(p.url().endsWith('#/capability/saved-search-use?workspace=tools'), 'global search opens the actual saved use in Tools');
await t.go('#/room');
await p.locator('.nv-bar button').filter({ hasText: 'More' }).click();
await p.getByRole('button', { name: 'Search lines, machines and records', exact: true }).click();
await p.getByRole('dialog', { name: 'Jump to', exact: true }).waitFor();
ok(true, 'record search is also available from the global More menu');
await p.keyboard.press('Escape');
await t.go('#/');
await p.locator('[data-env-lines]').click(); await p.locator('.home').waitFor();
ok(p.url().endsWith('#/room'), 'Lines returns from the conversation to the factory');
await t.finish('Accepted: small-screen AI navigation and complete record search');
