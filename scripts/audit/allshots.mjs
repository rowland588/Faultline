/* THE THREE-WIDTH PASS (docs/UPGRADE-AUDIT.md §1). Every screen smoke opens, at phone / tablet / desk, a full-page picture each
 * and a line of measurements: words on the page, buttons, how far off the side,
 * small tap targets, cut words. node scripts/audit/allshots.mjs OUTDIR [BASE] */
import pkg from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const { chromium } = pkg;
const OUT = process.argv[2];
const BASE = process.argv[3] ?? 'http://127.0.0.1:5197';
const REF = 'testproj';
mkdirSync(OUT, { recursive: true });
const smoke = readFileSync(new URL('../smoke.mjs', import.meta.url), 'utf8');
const routesSrc = smoke.slice(smoke.indexOf('const ROUTES = ['), smoke.indexOf('];', smoke.indexOf('const ROUTES = [')) + 1).replace('const ROUTES = ', '');
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const rows = [];
for (const [tag, width, height, touch] of [['phone', 390, 844, true], ['tablet', 768, 1024, true], ['desk', 1360, 900, false]]) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width, height }, hasTouch: touch, locale: 'en-GB', timezoneId: 'Europe/London' });
  await ctx.route(`https://${REF}.supabase.co/**`, r => r.abort());
  await ctx.addInitScript(([k, s]) => { localStorage.setItem(k, JSON.stringify(s)); }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage(); page.setDefaultTimeout(90000); page.setDefaultNavigationTimeout(90000);
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00Z'));
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => void d.dismiss().catch(() => {}));
  await page.goto(`${BASE}/#/`); await page.waitForTimeout(2500);
  const seeded = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  const ROUTES = new Function('seeded', `return ${routesSrc}`)(seeded);
  mkdirSync(join(OUT, tag), { recursive: true });
  for (const [name, hash] of ROUTES) {
    await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(1600);
    const m = await page.evaluate(() => {
      const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const main = document.querySelector('main, .wrap, #root') ?? document.body;
      const text = (main.innerText || '').replace(/\s+/g, ' ').trim();
      const btns = [...main.querySelectorAll('button, a[href], [role="button"]')].filter(vis);
      const small = btns.filter(el => { const b = el.getBoundingClientRect(); return b.height < 32 || b.width < 24; }).length;
      const offSide = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
      const h1 = (document.querySelector('h1')?.textContent ?? '').trim().slice(0, 60);
      const cut = [...main.querySelectorAll('h1,h2,h3,p,span,b,button,a,label,td,th,li')].filter(el => vis(el) && el.children.length <= 3 && el.scrollWidth > el.clientWidth + 2 && getComputedStyle(el).overflowX !== 'visible' && getComputedStyle(el).textOverflow !== 'ellipsis' && (el.textContent ?? '').trim().length > 2).length;
      const sheets = document.querySelectorAll('.sheet, [role="dialog"]').length;
      return { words: text.split(' ').length, buttons: btns.length, small, offSide, h1, cut, sheets, height: document.documentElement.scrollHeight };
    }).catch(e => ({ err: String(e) }));
    const file = `${slug(name)}.png`;
    await page.screenshot({ path: join(OUT, tag, file), fullPage: true }).catch(() => {});
    rows.push({ tag, name, hash, file, ...m, errors: errors.splice(0) });
    console.log(`${tag}  ${name.slice(0, 48).padEnd(48)} words ${String(m.words).padStart(5)}  btns ${String(m.buttons).padStart(3)}  small ${String(m.small).padStart(3)}  off ${m.offSide}  cut ${m.cut}  h ${m.height}`);
  }
  await ctx.close();
}
writeFileSync(join(OUT, 'metrics.json'), JSON.stringify(rows, null, 1));
/* a contact sheet a width */
for (const tag of ['phone', 'tablet', 'desk']) {
  const mine = rows.filter(r => r.tag === tag);
  writeFileSync(join(OUT, `${tag}.html`), `<!doctype html><meta charset=utf-8><style>body{font:12px system-ui;margin:12px;display:flex;flex-wrap:wrap;gap:12px}figure{margin:0;width:${tag === 'desk' ? 680 : tag === 'tablet' ? 384 : 195}px}img{width:100%;border:1px solid #ccc;max-height:900px;object-fit:cover;object-position:top}figcaption{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}</style>`
    + mine.map(r => `<figure><img src="${tag}/${r.file}" loading=lazy><figcaption title="${r.name}">${r.name} · ${r.words}w ${r.buttons}b${r.small ? ` <b style=color:#c4281c>${r.small} small</b>` : ''}${r.offSide ? ` <b style=color:#c4281c>off ${r.offSide}</b>` : ''}</figcaption></figure>`).join(''));
}
await browser.close();
