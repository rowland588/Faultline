import { openApp } from './scripts/lib/tocBrowser.mjs';
const out = process.argv[2]; const tag = process.argv[3]; const dev = process.argv[4] ?? 'desk';
const [w, h] = dev === 'phone' ? [390, 844] : [1440, 900];
const t = await openApp({ width: w, height: h }); await t.seed();
const recs = await t.page.evaluate(async () => { const db = await import('/src/db.ts'); const ss = await db.listAllStudies(); const pick = k => ss.find(s => s.tool === k)?.id; const ws = (await db.listWorkspaces())[0]?.id;
  return { ws, sample: pick('capability'), chart: pick('chart'), cap: pick('capacity') ?? pick('balance'), smed: pick('changeover'), vsm: pick('vsm') ?? pick('map'), tools: [...new Set(ss.map(s => s.tool))] }; });
console.log(JSON.stringify(recs));
const routes = (process.argv[5] ?? '').split(',').filter(Boolean);
for (const r0 of routes) { const r = r0.replace(/\{(\w+)\}/g, (_, k) => recs[k]); await t.go(r, 2200);
  await t.page.screenshot({ path: `${out}/${tag}-${r0.replace(/[^a-z0-9]/gi, '_')}-${dev}.png` }); }
await t.browser.close();
