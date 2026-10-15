/* THE INVENTORY, CHECKED — every page in scripts/inventory/pages.mjs opened
 * on the seeds at desk and at phone width, and everything it must show found
 * on the screen with a size. Fails the gate when one is missing.
 *
 *   node scripts/inventory.mjs                      (SMOKE_BASE, as smoke)
 *   node scripts/inventory.mjs --shots DIR          and a picture of each page
 *   node scripts/inventory.mjs --compare OLD NEW    what changed between two sets of pictures
 *
 * --compare is the look before shipping (CLAUDE.md, The memory): the pictures
 * taken on what is live and on the change, compared pixel by pixel in the
 * browser, and every page that moved listed with how much — and put side by
 * side in NEW/compare.html — to be looked at, and said in the commit. */
import pkg from '/home/user/fl-card/node_modules/playwright/index.js';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from './inventory/pages.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const args = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

if (args[0] === '--compare') {
  const [, OLD, NEW] = args;
  const page = await (await browser.newContext()).newPage();
  const rows = [];
  for (const f of readdirSync(NEW).filter(x => x.endsWith('.png')).sort()) {
    const a = join(OLD, f), b = join(NEW, f);
    if (!existsSync(a)) { rows.push({ f, pct: 100, note: 'new page' }); continue; }
    const pct = await page.evaluate(async ([x, y]) => {
      const load = src => new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = src; });
      const [i1, i2] = await Promise.all([load(x), load(y)]);
      const w = Math.max(i1.width, i2.width), h = Math.max(i1.height, i2.height);
      const px = img => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(img, 0, 0); return g.getImageData(0, 0, w, h).data; };
      const d1 = px(i1), d2 = px(i2);
      let diff = 0;
      for (let k = 0; k < d1.length; k += 4) if (Math.abs(d1[k] - d2[k]) + Math.abs(d1[k + 1] - d2[k + 1]) + Math.abs(d1[k + 2] - d2[k + 2]) > 48) diff++;
      return (diff / (w * h)) * 100;
    }, [`data:image/png;base64,${readFileSync(a).toString('base64')}`, `data:image/png;base64,${readFileSync(b).toString('base64')}`]);
    rows.push({ f, pct });
  }
  const moved = rows.filter(r => r.pct > 0.5).sort((x, y) => y.pct - x.pct);
  for (const r of moved) console.log(`CHANGED  ${r.f}  ${r.note ?? `${r.pct.toFixed(1)}% of the page`}`);
  console.log(`${moved.length} of ${rows.length} pages changed`);
  writeFileSync(join(NEW, 'compare.html'), `<!doctype html><meta charset=utf-8><title>What changed</title><style>body{font:14px system-ui;margin:16px}figure{margin:0 0 24px}img{width:49%;border:1px solid #ccc;vertical-align:top}</style>`
    + moved.map(r => `<figure><figcaption><b>${r.f}</b> — ${r.note ?? `${r.pct.toFixed(1)}% changed`}</figcaption>${existsSync(join(OLD, r.f)) ? `<img src="file://${join(OLD, r.f)}">` : ''}<img src="${r.f}"></figure>`).join(''));
  await browser.close();
  process.exit(0);
}

const SHOTS = args[0] === '--shots' ? args[1] : undefined;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
let fail = 0, checked = 0;
const errors = [];
for (const [tag, viewport] of [['desk', { width: 1360, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport, locale: 'en-GB', timezoneId: 'Europe/London' });
  await ctx.route(`https://${REF}.supabase.co/**`, r => r.abort());
  await ctx.addInitScript(([k, s]) => { localStorage.setItem(k, JSON.stringify(s)); }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage();
  /* one moment for every picture, so a date on a page is not a change */
  if (SHOTS) await page.clock.setFixedTime(new Date('2026-10-15T10:00:00Z'));
  page.on('pageerror', e => errors.push(`${tag}: ${e.message}`));
  await page.goto(`${BASE}/#/`); await page.waitForTimeout(2500);
  const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  const cap = await page.evaluate(async () => {
    const s = await (await import('/src/dev/capacitySeeds.ts')).seedCapacityFor('huge');
    const db = await import('/src/db.ts');
    const all = await db.listAllStandards();
    const lanes = all.find(x => (x.capacity?.lanes?.length ?? 0) > 1);
    return lanes ? { wsId: lanes.workspaceId, lanesId: lanes.id } : undefined;
  }).catch(() => undefined);
  for (const pg of PAGES(sd, cap)) {
    await page.goto(`${BASE}/${pg.path}`); await page.waitForTimeout(2200);
    for (const m of pg.must) {
      if ((m.desk && tag !== 'desk') || (m.phone && tag !== 'phone')) continue;
      checked++;
      const found = await page.evaluate(([sel, src, n]) => {
        const re = src ? new RegExp(src) : null;
        const seen = [...document.querySelectorAll(sel)].filter(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(e).visibility !== 'hidden' && (!re || re.test(e.textContent ?? '')); });
        return { ok: seen.length >= n, count: seen.length };
      }, [m.sel, m.text?.source, m.n ?? 1]);
      if (!found.ok) { fail++; console.log(`MISSING  ${tag} · ${pg.name}: ${m.what} (${m.sel}${m.n ? `, ${m.n} wanted` : ''} — ${found.count} found)`); }
    }
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${tag} — ${pg.name.replace(/[\\/:]/g, '-')}.png`), fullPage: true });
  }
  await ctx.close();
}
await browser.close();
if (errors.length) console.log(`page errors: ${errors.slice(0, 5).join(' | ')}`);
console.log(fail ? `\n${fail} of ${checked} things a page must show are missing` : `\nevery page shows what it must: ${checked} things on ${PAGES({}, {}).length} pages, at desk and phone`);
process.exit(fail || errors.length ? 1 : 0);
