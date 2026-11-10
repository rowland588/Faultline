/* HOW BUSY IS EACH PAGE — measured, never guessed (10 November, docs/DESIGN.md — Rowland: "Could this page communicate the same
 * information and functionality more clearly, with less visual clutter and less effort from the user? If the answer is yes, simplify
 * it … The quality of Faultline should be measured not by how much information we can put on a screen, but by how easily someone can
 * understand and act on that information").
 *
 * Every page the inventory knows (scripts/inventory/pages.mjs), on the smoke seed, at a desk (1360 × 900) and a phone (390 × 844),
 * as it opens — nothing folded is opened (that is the point: what a person meets first). For each:
 *   height      the page's length in px
 *   boxes       card-like boxes: a visible block with its own fill and an edge (border, shadow or rounded fill) at least 120 × 40 —
 *               not a button, field, chip, tag or pill
 *   headings    h1–h4 seen
 *   controls    buttons, links and fields seen
 *   sizes       distinct type sizes on text seen
 *   first       boxes + headings on the first screen (above the fold) — what competes for the eye on arrival
 *
 *   node scripts/calm.mjs                      → the table, busiest first (SMOKE_BASE as smoke)
 *   node scripts/calm.mjs --write FILE         → also writes the numbers (docs/design/calm-baseline.json is the agreed baseline)
 *   node scripts/calm.mjs --check FILE         → fails a page that got busier than FILE says: height +15% and +300 px, or 3 more
 *                                                boxes, headings or first-screen items, or 10 more controls. A page that got calmer
 *                                                is reported, so the baseline can be lowered. */
import pkg from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { PAGES } from './inventory/pages.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const args = process.argv.slice(2);
const WRITE = args[0] === '--write' ? args[1] : undefined;
const CHECK = args[0] === '--check' ? args[1] : undefined;
const ONLY = process.env.CALM_ONLY ? new RegExp(process.env.CALM_ONLY, 'i') : undefined;
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const out = {};
for (const [tag, viewport] of [['desk', { width: 1360, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport, locale: 'en-GB', timezoneId: 'Europe/London' });
  await ctx.route(`https://${REF}.supabase.co/**`, r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage?.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00Z'));
  await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
  const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  sd.checkLogs = await page.evaluate(async ([ws, pj]) => (await import('/src/dev/seed.ts')).seedChecksForTest(ws, pj), [sd.wsId, sd.projectId]);
  sd.areas = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedAreasForTest());
  const cap = await page.evaluate(async () => {
    await (await import('/src/dev/capacitySeeds.ts')).seedCapacityFor('huge');
    const all = await (await import('/src/db.ts')).listAllStandards();
    const lanes = all.find(x => (x.capacity?.lanes?.length ?? 0) > 1);
    return lanes ? { wsId: lanes.workspaceId, lanesId: lanes.id } : undefined;
  }).catch(() => undefined);
  for (const pg of PAGES(sd, cap)) {
    if (ONLY && !ONLY.test(pg.name)) continue;
    await page.goto(`${BASE}/${pg.path}`); await page.waitForTimeout(2200);
    await page.waitForFunction(sel => [...document.querySelectorAll(sel)].some(e => e.getBoundingClientRect().width > 0), pg.must[0].sel, { timeout: 6000 }).catch(() => {});
    const m = await page.evaluate(() => {
      const vh = window.innerHeight;
      const main = document.querySelector('.nv-main') ?? document.body;
      const seen = el => { const r = el.getBoundingClientRect(); if (r.width < 1 || r.height < 1) return null; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) return null; return { r, cs }; };
      const SKIP = /^(BUTTON|A|INPUT|SELECT|TEXTAREA|SUMMARY|LABEL|IMG|SVG|CANVAS|svg)$/;
      const SMALL = /btn|chip|pill|tag|badge|toggle|seg|tab/i;
      const canvas = getComputedStyle(document.body).backgroundColor;
      let boxes = 0, first = 0;
      for (const el of main.querySelectorAll('div, section, article, li, aside, header, ul, ol, details, form')) {
        if (SKIP.test(el.tagName) || SMALL.test(el.className?.baseVal ?? el.className ?? '')) continue;
        const s = seen(el); if (!s) continue;
        const { r, cs } = s;
        if (r.width < 120 || r.height < 40) continue;
        const fill = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent' && cs.backgroundColor !== canvas;
        const edges = ['Top', 'Right', 'Bottom', 'Left'].filter(k => parseFloat(cs[`border${k}Width`]) > 0 && cs[`border${k}Style`] !== 'none').length;
        const shadow = cs.boxShadow && cs.boxShadow !== 'none';
        const round = parseFloat(cs.borderTopLeftRadius) > 2;
        if ((fill && (edges >= 2 || shadow || round)) || edges >= 3 || (shadow && round)) { boxes++; if (r.top + window.scrollY < vh) first++; }
      }
      const hs = [...main.querySelectorAll('h1, h2, h3, h4')].filter(seen);
      first += hs.filter(h => h.getBoundingClientRect().top + window.scrollY < vh).length;
      const controls = [...main.querySelectorAll('button, a[href], input, select, textarea')].filter(seen).length;
      const sizes = new Set();
      for (const el of main.querySelectorAll('*')) {
        if (![...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
        if (!seen(el)) continue;
        sizes.add(getComputedStyle(el).fontSize);
      }
      return { height: document.documentElement.scrollHeight, boxes, headings: hs.length, controls, sizes: sizes.size, first };
    });
    out[`${tag} · ${pg.name}`] = m;
  }
  await ctx.close();
}
await browser.close();

const rows = Object.entries(out).sort((a, b) => b[1].height - a[1].height);
console.log('page'.padEnd(64), 'height', 'boxes', 'heads', 'ctrls', 'sizes', 'first');
for (const [k, m] of rows) console.log(k.slice(0, 63).padEnd(64), String(m.height).padStart(6), String(m.boxes).padStart(5), String(m.headings).padStart(5), String(m.controls).padStart(5), String(m.sizes).padStart(5), String(m.first).padStart(5));
if (WRITE) writeFileSync(WRITE, `${JSON.stringify(Object.fromEntries(rows), null, 1)}\n`);
if (CHECK) {
  if (!existsSync(CHECK)) { console.log(`no baseline at ${CHECK}`); process.exit(1); }
  const base = JSON.parse(readFileSync(CHECK, 'utf8'));
  let worse = 0, calmer = 0;
  for (const [k, m] of rows) {
    const b = base[k];
    if (!b) { console.log(`NEW      ${k} — not in the baseline; add it`); continue; }
    const why = [];
    if (m.height > b.height * 1.15 && m.height - b.height > 300) why.push(`height ${b.height} → ${m.height}`);
    for (const f of ['boxes', 'headings', 'first']) if (m[f] - b[f] >= 3) why.push(`${f} ${b[f]} → ${m[f]}`);
    if (m.controls - b.controls >= 10) why.push(`controls ${b.controls} → ${m.controls}`);
    if (why.length) { worse++; console.log(`BUSIER   ${k}: ${why.join(', ')}`); }
    else if (m.height < b.height * 0.85 || b.boxes - m.boxes >= 3) { calmer++; console.log(`CALMER   ${k}: height ${b.height} → ${m.height}, boxes ${b.boxes} → ${m.boxes} — lower the baseline`); }
  }
  console.log(worse ? `\n${worse} page(s) got busier than the baseline` : `\nno page busier than the baseline${calmer ? ` · ${calmer} calmer` : ''}`);
  process.exit(worse ? 1 : 0);
}
