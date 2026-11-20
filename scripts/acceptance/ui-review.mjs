/* Regression: consistent navigation, discoverable tools and customer report delivery. */
import { mkdirSync } from 'node:fs';
import { openApp } from '../lib/tocBrowser.mjs';
const t = await openApp({ width: 390, height: 844 });
const { page: p, ok } = t;
const sd = await t.seed();
const shots = process.env.UI_REVIEW_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });
await p.evaluate(async id => { const db = await import('/src/db.ts'); await db.patchWorkspaceRecord(id, { clientName: 'Acme Foods', siteName: 'Hull', areaName: 'Packing' }); }, sd.line7WsId);
await t.go(`#/project/${sd.methodProjectId}`);
ok((await p.locator('.nv-bar').innerText()).includes('Factory') && !(await p.locator('.nv-bar').innerText()).includes('Timeline'), 'method projects retain global navigation');
await p.locator('.nv-bar button').filter({ hasText: 'More' }).click();
await p.locator('.nv-sheet .nv-ri').first().waitFor();
ok(await p.locator('.nv-sheet .nv-ri').count() > 0, 'More contains real destinations');
await t.go(`#/project/${sd.methodProjectId}`);
ok((await p.locator('.scope-page-picker select option').allInnerTexts()).join(' · ') === 'Overview · Actions · Problems · Tools · Reports · More', 'method project shows six clear pages');
await p.locator('.scope-page-picker select').selectOption({ label: 'More' });
ok((await p.locator('.nv-scope-more .nv-ri-l').allInnerTexts()).join(' · ') === 'Journey · Notes · Details', 'method project keeps secondary pages in More');
await p.locator('.nv-scope-more .nv-ri').filter({ hasText: 'Journey' }).click();
await p.waitForFunction(() => /\/journey/.test(location.hash) && document.querySelector('.scope-page-picker select')?.value === 'pmore', null, { timeout: 5000 }).catch(() => {});   /* the picker read once Journey has opened, not mid-navigation */
ok(await p.locator('.scope-page-picker select').inputValue() === 'pmore', 'Journey retains its project context in More');
await t.go(`#/project/${sd.methodProjectId}/method-report`);
await p.locator('.mrep').waitFor();
await p.locator('.scope-page-picker select').selectOption({ label: 'Overview' });
await p.locator('.pmethod').waitFor();
ok(!p.url().includes('method-report'), 'phone report-to-project navigation selects Overview correctly');
const sixmLine = await p.evaluate(async id => {
  const db = await import('/src/db.ts'); const row = (await db.loadPaceLines(id)).find(r => r.workspaceId);
  return (await db.listWorkspaces()).find(w => w.id === row?.workspaceId)?.name;
}, sd.pacedProjectId);
await t.go(`#/sixm/${sd.pacedProjectId}`);
await p.waitForFunction(name => document.querySelector('.nv-ctx .nv-job-l')?.textContent === name, sixmLine, { timeout: 20000 });
await p.locator('main button.part-view').filter({ hasText: /^Fishbone$/ }).click();
ok(await p.locator('.nv-ctx .nv-job-l').textContent() === sixmLine, '6M direct links and view changes retain the saved line context');
await t.go(`#/lines/${sd.line7WsId}`);
const picker = p.locator('.scope-page-picker select');
ok(await picker.isVisible(), 'phone page selector exposes every destination');
for (const y of [100, 200, 700]) {
  await p.evaluate(y => window.scrollTo(0, y), y); await p.waitForTimeout(100);
  const placeBox = await p.locator('.scope-page-picker').boundingBox(), topBox = await p.locator('.nv-top').boundingBox();
  ok(!!placeBox && !!topBox && Math.abs(placeBox.y - topBox.y - topBox.height) <= 2, `phone page selector stays available at scroll ${y}`);
  ok(await p.evaluate(() => {
    const hit = selector => { const e = document.querySelector(selector), r = e.getBoundingClientRect(); return !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest(selector === '.nv-top' ? '.nv-top' : '.scope-page-picker'); };
    return hit('.nv-top') && hit('.scope-page-picker select');
  }), `global header and page selector remain clickable at scroll ${y}`);
}
await p.evaluate(() => window.scrollTo(0, 0));
await picker.selectOption({ label: 'Reports' }); await p.waitForTimeout(1200);
ok(await p.locator('[data-line-reports]').count() === 1, 'Reports reachable through phone selector');
ok(!(await p.locator('.pl .part-head').innerText()).includes('Plan a program'), 'report task has no competing program primary action');
const summary = await t.pdfText(() => p.locator('[data-line-report="summary"] button').click(), 'customer-summary');
ok(summary.includes('Acme Foods') && summary.includes('Hull'), 'line summary identifies client and site');
ok(summary.includes('Needs attention') && /No improvement verified/.test(summary), 'late actions prevent an all-clear verdict and missing proof is explicit');
ok(summary.includes('Ilapak UK') && /Overdue/.test(summary), 'line summary includes action owner and overdue date');
await t.go('#/tools');
await p.getByRole('searchbox', { name: 'Find a tool', exact: true }).fill('reliability');
ok(await p.locator('.tc-cell').count() === 1, 'visible tool search filters the directory');
await p.getByRole('searchbox', { name: 'Find a tool', exact: true }).fill('rejecting too many');
await p.locator('.et [role="status"]').getByRole('button', { name: 'Help choosing a tool', exact: true }).click();
ok(await p.locator('[data-fold="tools-find"].is-open [aria-label="What matches"]').count() === 1, 'no-name match opens the problem-based results immediately');
for (const width of [360, 820, 1440]) {
  await p.setViewportSize({ width, height: 1000 }); await t.go(`#/project/${sd.methodProjectId}`);
  ok(await t.wide() <= 1, `${width}px project fits its viewport`);
  if (shots) await p.screenshot({ path: `${shots}/project-${width}.png`, fullPage: true });
  await t.go(`#/lines/${sd.line7WsId}?view=reports`);
  if (shots) await p.screenshot({ path: `${shots}/reports-${width}.png`, fullPage: true });
}
await t.go('#/area?site=Hull&area=Packing&client=Acme%20Foods&view=reports');
const area = await t.pdfText(() => p.locator('[data-place-report="summary"] button').click(), 'area-summary');
ok(area.includes('Next actions') && area.includes('Results verified'), 'area Summary downloads with actions and proof');
const fullArea = await t.pdfText(() => p.locator('[data-place-report="everything"]').getByRole('button', { name: 'Download', exact: true }).click(), 'area-full');
ok(fullArea.includes('CONTENTS') && /findings and actions/.test(fullArea) && /supporting records and tool reports/.test(fullArea), 'full area report includes indexed findings and evidence');
await t.finish('Accepted: UI review navigation, search and client summaries');
