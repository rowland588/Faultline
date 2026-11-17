/* Read-only UI audit over synthetic fixtures: every inventory section plus every tool's entry route, at three device widths. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from './inventory/pages.mjs';
import { openApp } from './lib/tocBrowser.mjs';
const out = process.env.UI_AUDIT_OUT || '/tmp/faultline-all-pages'; mkdirSync(out, { recursive: true });
const from = Number(process.env.UI_AUDIT_FROM || 0), limit = Number(process.env.UI_AUDIT_LIMIT || Infinity);
const t = await openApp({ width: 1440, height: 1000 }); const { page: p } = t; const sd = await t.seed();
const tools = await p.evaluate(async () => (await import('/src/catalogue/registry.ts')).APP_TOOLS.map(t => ({ key: t.key, label: t.label, to: t.to })));
const cap = await p.evaluate(async () => {
  const db = await import('/src/db.ts'); const all = await db.listAllStandards(); const s = all.find(x => (x.capacity?.lanes?.length || 0) > 1); return s ? { wsId: s.workspaceId, lanesId: s.id } : undefined;
}).catch(() => undefined);
const known = PAGES(sd, cap), paths = new Set(known.map(x => x.path));
const extra = tools.filter(x => !paths.has(`#${x.to}`)).map(x => ({ name: `${x.label} — tool entry`, path: `#${x.to}`, must: [{ sel: '.nv-main' }] }));
const pages = [...known, ...extra];
writeFileSync(join(out, 'coverage.json'), JSON.stringify({ totalSections: pages.length, tools, pages: pages.map(x => ({ name: x.name, path: x.path })) }, null, 2));
const results = [];
for (const [index, pg] of pages.entries()) {
  if (index < from || index >= from + limit) continue;
  try {
    if (pg.prep) await p.evaluate(pg.prep);
    await t.go(pg.path, 1500);
    await p.locator(pg.must[0].sel).first().waitFor({ timeout: 30000 });
    for (const width of [360, 820, 1440]) {
      await p.setViewportSize({ width, height: 1000 }); await p.waitForTimeout(150); await p.evaluate(() => scrollTo(0, 0));
      const detail = await p.evaluate(() => {
        const visible = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden'; };
        const inputs = [...document.querySelectorAll('main input, main textarea, main select')].filter(visible);
        const top = document.querySelector('.nv-top'), r = top?.getBoundingClientRect();
        const labelled = e => !!(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.labels?.length || e.getAttribute('title'));
        return { overflow: document.documentElement.scrollWidth - innerWidth,
          headerClickable: !r || !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.nv-top'),
          visibleControls: [...document.querySelectorAll('main button, main a, main input, main select, main textarea')].filter(visible).length,
          fields: inputs.map(e => ({ label: e.getAttribute('aria-label') || e.labels?.[0]?.textContent?.trim() || e.placeholder || '', labelled: labelled(e), kind: e.tagName, type: e.type, width: Math.round(e.getBoundingClientRect().width), font: getComputedStyle(e).fontSize })),
          title: document.querySelector('main h1')?.textContent?.trim(), height: document.documentElement.scrollHeight };
      });
      const issues = [...(detail.overflow > 1 ? ['horizontal overflow'] : []), ...(!detail.headerClickable ? ['header obscured'] : []), ...(detail.fields.some(x => x.width < 44) ? ['field narrower than touch target'] : [])];
      const file = `${String(index).padStart(3, '0')}-${width}.png`;
      if (process.env.UI_AUDIT_SHOTS === '1') await p.screenshot({ path: join(out, file), fullPage: true });
      results.push({ index, page: pg.name, path: pg.path, width, ...detail, issues, screenshot: process.env.UI_AUDIT_SHOTS === '1' ? file : undefined });
      console.log(`${issues.length ? 'ISSUE' : 'CHECKED'} ${index} ${width}px ${pg.name}${issues.length ? ' — ' + issues.join(', ') : ''}`);
    }
  } catch (error) { results.push({ index, page: pg.name, path: pg.path, error: error.message }); console.log(`ERROR ${index} ${pg.name}: ${error.message.split('\n')[0]}`); }
  writeFileSync(join(out, 'results.json'), JSON.stringify({ sections: pages.length, results, consoleErrors: t.errors }, null, 2));
}
await t.browser.close();
console.log(`Audit complete: ${results.length} device checks; results in ${out}`);
