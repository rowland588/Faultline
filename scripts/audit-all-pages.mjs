/* Read-only UI audit over synthetic fixtures: every inventory section plus every tool's entry route, at three device widths. */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from './inventory/pages.mjs';
import { openSeedPage } from './lib/seedPage.mjs';
import { BASE, openApp } from './lib/tocBrowser.mjs';
const out = process.env.UI_AUDIT_OUT || '/tmp/faultline-all-pages'; mkdirSync(out, { recursive: true });
const from = Number(process.env.UI_AUDIT_FROM || 0), limit = Number(process.env.UI_AUDIT_LIMIT || Infinity);
const t = await openApp({ width: 1440, height: 1000 }); const { page: p } = t;
const calculatorsOnly = process.env.UI_AUDIT_CALCS_ONLY === '1';
if (calculatorsOnly) await openSeedPage(p, BASE);
const sd = calculatorsOnly ? null : await t.seed();
if (sd) {
  sd.checkLogs = await p.evaluate(async ([ws, pj]) => (await import('/src/dev/seed.ts')).seedChecksForTest(ws, pj), [sd.wsId, sd.projectId]);
  sd.areas = await p.evaluate(async () => (await import('/src/dev/seed.ts')).seedAreasForTest());
}
const tools = await p.evaluate(async () => (await import('/src/catalogue/registry.ts')).APP_TOOLS.map(t => ({ key: t.key, label: t.label, to: t.to })));
const cap = await p.evaluate(async () => {
  const db = await import('/src/db.ts'); const all = await db.listAllStandards(); const s = all.find(x => (x.capacity?.lanes?.length || 0) > 1); return s ? { wsId: s.workspaceId, lanesId: s.id } : undefined;
}).catch(() => undefined);
const known = calculatorsOnly ? [] : PAGES(sd, cap), paths = new Set(known.map(x => x.path));
const extra = tools.filter(x => !paths.has(`#${x.to}`)).map(x => ({ name: `${x.label} — tool entry`, path: `#${x.to}`, must: [{ sel: '.nv-main' }] }));
const calculators = calculatorsOnly ? await p.evaluate(async () => {
  const { CALCS } = await import('/src/tools/calc/registry.ts'); const { newCalcStudy } = await import('/src/tools/calc/calc.ts'); const db = await import('/src/db.ts');
  const line = await (await import('/src/lib/lines.ts')).addLineToFactory('Calculator device audit'); const pages = [];
  for (const def of CALCS) {
    const s = newCalcStudy(def, { id: crypto.randomUUID(), name: `${def.title} — device audit`, workspaceId: line.id, now: Date.now(), inputs: def.examples[0]?.inputs || {} });
    await db.putStudy(s); pages.push({ name: def.title, path: `#/calc/${def.key}/${s.id}`, must: [{ sel: '[data-calc]' }] });
  }
  return pages;
}) : [];
const pages = calculatorsOnly ? calculators : [...known, ...extra];
writeFileSync(join(out, 'coverage.json'), JSON.stringify({ totalSections: pages.length, tools, pages: pages.map(x => ({ name: x.name, path: x.path })) }, null, 2));
const results = from > 0 && existsSync(join(out, 'results.json')) ? JSON.parse(readFileSync(join(out, 'results.json'), 'utf8')).results.filter(r => r.index < from) : [];
for (const [index, pg] of pages.entries()) {
  if (index < from || index >= from + limit) continue;
  try {
    if (pg.prep) await p.evaluate(pg.prep);
    await t.go(pg.path, 1500);
    await p.locator('main').waitFor();
    await p.waitForFunction(() => { const s = document.querySelector('main')?.innerText?.trim(); return !!s && !/^(Opening|Loading)[.…]*$/.test(s); }, null, { timeout: 30000 });
    for (const width of [360, 820, 1440]) {
      await p.setViewportSize({ width, height: 1000 }); await p.waitForTimeout(150); await p.evaluate(() => scrollTo(0, 0));
      const detail = await p.evaluate(() => {
        const visible = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden'; };
        const inputs = [...document.querySelectorAll('main input, main textarea, main select')].filter(visible);
        const top = document.querySelector('.nv-top'), r = top?.getBoundingClientRect();
        const labelled = e => !!(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || e.labels?.length || e.getAttribute('title'));
        return { overflow: document.documentElement.scrollWidth - innerWidth,
          modalOpen: [...document.querySelectorAll('[aria-modal="true"]')].some(visible),
          headerClickable: !r || !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.nv-top'),
          visibleControls: [...document.querySelectorAll('main button, main a, main input, main select, main textarea')].filter(visible).length,
          fields: inputs.map(e => ({ label: e.getAttribute('aria-label') || e.labels?.[0]?.textContent?.trim() || e.placeholder || '', labelled: labelled(e), kind: e.tagName, type: e.type, width: Math.round((['checkbox', 'radio'].includes(e.type) ? e.closest('label') || e : e).getBoundingClientRect().width), font: getComputedStyle(e).fontSize })),
          title: document.querySelector('main h1')?.textContent?.trim(), height: document.documentElement.scrollHeight };
      });
      const issues = [...(detail.overflow > 1 ? ['horizontal overflow'] : []), ...(!detail.headerClickable && !detail.modalOpen ? ['header obscured'] : []), ...(detail.fields.some(x => x.width < 44) ? ['field narrower than touch target'] : [])];
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
