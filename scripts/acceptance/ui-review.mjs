/* Regression: consistent navigation, discoverable tools and customer report delivery. */
import { openApp } from '../lib/tocBrowser.mjs';
const t = await openApp({ width: 390, height: 844 });
const { page: p, ok } = t;
const sd = await t.seed();
await p.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchWorkspaceRecord(id, { clientName: 'Acme Foods', siteName: 'Hull', areaName: 'Packing' }); }, sd.line7WsId);
await t.go(`#/project/${sd.methodProjectId}`);
ok((await p.locator('.nv-bar').innerText()).includes('Factory') && !(await p.locator('.nv-bar').innerText()).includes('Timeline'), 'method projects retain global navigation');
await p.locator('.nv-bar button').filter({ hasText: 'More' }).click();
await p.locator('.nv-sheet .nv-ri').first().waitFor();
ok(await p.locator('.nv-sheet .nv-ri').count() > 0, 'More contains real destinations');
await t.go(`#/lines/${sd.line7WsId}`);
const picker = p.locator('.scope-page-picker select');
ok(await picker.isVisible(), 'phone page selector exposes every destination');
await picker.selectOption({ label: 'Reports' }); await p.waitForTimeout(1200);
ok(await p.locator('[data-line-reports]').count() === 1, 'Reports reachable through phone selector');
ok(!(await p.locator('.pl .part-head').innerText()).includes('Plan a program'), 'report task has no competing program primary action');
const summary = await t.pdfText(() => p.locator('[data-line-report="summary"] button').click(), 'customer-summary');
ok(summary.includes('Acme Foods') && summary.includes('Hull'), 'line summary identifies client and site');
ok(summary.includes('Ilapak UK') && /Overdue/.test(summary), 'line summary includes action owner and overdue date');
await t.go('#/tools');
await p.getByRole('searchbox', { name: 'Find a tool', exact: true }).fill('reliability');
ok(await p.locator('.tc-cell').count() === 1, 'visible tool search filters the directory');
for (const width of [360, 820, 1440]) { await p.setViewportSize({ width, height: 1000 }); await t.go(`#/project/${sd.methodProjectId}`); ok(await t.wide() <= 1, `${width}px project fits its viewport`); }
await t.go('#/area?site=Hull&area=Packing&client=Acme%20Foods&view=reports');
const area = await t.pdfText(() => p.locator('[data-place-report="summary"] button').click(), 'area-summary');
ok(area.includes('Next actions') && area.includes('Results verified'), 'area Summary downloads with actions and proof');
await t.finish('Accepted: UI review navigation, search and client summaries');
