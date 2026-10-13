/* THE AUDIT — every screen, at a desk and on a phone, held to the bar every
 * screen must meet (docs/AUDIT.md). Rowland, 13 October: "run multiple audits
 * to explore elements that are missing, not functional properly, gaps ...
 * that's very simply, for example, on the line standard, when I click on the
 * PDF, I can't get out of it. There's no X mark."
 *
 * For each screen smoke opens (scripts/smoke.mjs ROUTES, on the same seed):
 *   WAYS OUT    every button that opens a sheet, a drawer or a viewer is
 *               pressed; what opens must show a way out on the screen (an ×,
 *               Close, Cancel or Done in view) and Escape must close it
 *   PHONE       at 390 px: nothing off the side, no words cut off, nothing
 *               to press smaller than a fingertip
 *   PAPER       a page that lists records: does it offer its report, its cards
 *   ACTIONS     the edit and delete words on the page, for reading by hand
 *
 * Never presses anything that deletes, removes, archives, signs out or starts
 * fresh; every confirm is answered no. Read-only on the seed.
 *
 *   node scripts/audit.mjs [out.json]      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const OUT = process.argv[2];
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'audit@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };

/* smoke's screens, read from smoke itself so the two never drift */
const smoke = readFileSync(new URL('./smoke.mjs', import.meta.url), 'utf8');
const routesSrc = smoke.slice(smoke.indexOf('const ROUTES = ['), smoke.indexOf('];', smoke.indexOf('const ROUTES = [')) + 1).replace('const ROUTES = ', '');

const NEVER = /delete|remove|take (it )?off|archive|sign out|start fresh|put away|clear|reset|discard|undo|merge|log out|forget|leave/i;
/* what opens something: a sheet, a preview, an editor */
const OPENS = /\bpdf\b|report|cards?\b|print|\bnew\b|\badd\b|edit|change|rename|\bplan\b|^set\b|pick|more|copy|share|which|agree|move|assign|photo|picture|journey|filter|options?|…$/i;
const NAVLIKE = /^(back|‹|›|home|control room)$/i;
const OVERLAY = '.sheet, [role="dialog"], [aria-modal="true"], .rd-scrim, .ev-viewer, .ig-scrim, .sl-body';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const results = [];
for (const vp of [{ name: 'desk', width: 1280, height: 900 }, { name: 'phone', width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: vp.width, height: vp.height }, locale: 'en-GB', acceptDownloads: true });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage();
  page.on('dialog', d => void d.dismiss().catch(() => {}));
  page.on('download', d => void d.cancel().catch(() => {}));
  await page.goto(`${BASE}/#/`); await page.waitForTimeout(2500);
  const seeded = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  const ROUTES = new Function('seeded', `return ${routesSrc}`)(seeded);

  for (const [name, hash] of ROUTES) {
    const r = { vp: vp.name, name, hash, trapped: [], noEscape: [], opened: 0, offSide: 0, cut: [], small: 0, paper: [], acts: [], rows: 0 };
    await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(1800);
    const base = page.url();

    /* PHONE FIT and what is on the page */
    Object.assign(r, await page.evaluate(([vpName]) => {
      const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
      const main = document.querySelector('main, .wrap, #root') ?? document.body;
      const offSide = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
      const cut = [...main.querySelectorAll('h1,h2,h3,p,span,b,button,a,label,td,th,li')].filter(el => {
        if (!vis(el) || el.children.length > 3) return false;
        const cs = getComputedStyle(el);
        return el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis' && (el.textContent ?? '').trim().length > 2;
      }).slice(0, 6).map(el => (el.textContent ?? '').trim().slice(0, 40));
      const small = vpName === 'phone' ? [...main.querySelectorAll('button, a[href], [role="button"], input, select')].filter(el => {
        if (!vis(el)) return false; const b = el.getBoundingClientRect(); return b.height < 24 || b.width < 24;
      }).length : 0;
      const words = [...main.querySelectorAll('button, a, [role="button"]')].filter(vis).map(el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
      const paper = [...new Set(words.filter(w => /\bPDF\b|report|cards?\b|print/i.test(w)).map(w => w.slice(0, 40)))].slice(0, 8);
      const acts = [...new Set(words.filter(w => /^(edit|rename|change|delete|remove)\b|\b(delete|rename|edit)\b/i.test(w)).map(w => w.replace(/ for .*| — .*/, '').slice(0, 30)))].slice(0, 8);
      const rows = main.querySelectorAll('li, tbody tr, [class*="-row"], [class*="card"]').length;
      return { offSide, cut, small, paper, acts, rows };
    }, [vp.name]));

    /* WAYS OUT — press what might open something, one at a time */
    const labels = vp.name !== 'phone' ? [] : await page.evaluate(([never, navlike, opens]) => {
      const N = new RegExp(never, 'i'), V = new RegExp(navlike, 'i'), O = new RegExp(opens, 'i');
      const main = document.querySelector('.wrap') ?? document.querySelector('main') ?? document.body;
      return [...main.querySelectorAll('button')].filter(el => {
        const b = el.getBoundingClientRect(); if (!b.width || !b.height || el.disabled) return false;
        const t = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
        return t && t.length < 60 && !N.test(t) && !V.test(t) && O.test(t);
      }).map(el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim());
    }, [NEVER.source, NAVLIKE.source, OPENS.source]);
    for (const label of [...new Set(labels)].slice(0, 12)) {
      if (page.url() !== base) { await page.goto(base); await page.waitForTimeout(1200); }
      const btn = page.getByRole('button', { name: label, exact: true }).first();
      if (!(await btn.isVisible().catch(() => false))) continue;
      const before = await page.locator(OVERLAY).count();
      await btn.click({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(500);
      if (page.url() !== base) { await page.goto(base); await page.waitForTimeout(1200); continue; }
      const after = await page.locator(OVERLAY).count();
      if (after <= before) continue;
      r.opened++;
      /* a way out in view: an ×, Close, Cancel or Done, inside the viewport */
      const out = await page.evaluate(() => {
        const vh = window.innerHeight, vw = window.innerWidth;
        return [...document.querySelectorAll('button, [role="button"]')].some(el => {
          const t = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim();
          if (!/^(close|cancel|done|×|✕|back|not now|no thanks)\b/i.test(t)) return false;
          const b = el.getBoundingClientRect(); const cs = getComputedStyle(el);
          return b.width > 0 && b.height > 0 && b.top >= 0 && b.bottom <= vh && b.left >= 0 && b.right <= vw && cs.visibility !== 'hidden';
        });
      });
      if (!out) r.trapped.push(label);
      await page.keyboard.press('Escape'); await page.waitForTimeout(400);
      if ((await page.locator(OVERLAY).count()) > before) { r.noEscape.push(label); await page.goto(base); await page.waitForTimeout(1200); }
    }
    results.push(r);
    const flag = [r.trapped.length && `TRAPPED ${r.trapped.join(' · ')}`, r.noEscape.length && `NO ESCAPE ${r.noEscape.join(' · ')}`, r.offSide > 1 && `off ${r.offSide}px`, r.cut.length && `cut: ${r.cut.join(' · ')}`].filter(Boolean).join(' | ');
    console.log(`${vp.name.padEnd(5)} ${name.slice(0, 50).padEnd(50)} opened ${r.opened}${flag ? ` | ${flag}` : ''}`);
  }
  await ctx.close();
}
await browser.close();

const say = (title, list, f) => { console.log(`\n${title} — ${list.length}`); for (const x of list) console.log(`  ${x.vp.padEnd(5)} ${x.name.slice(0, 44).padEnd(44)} ${f(x)}`); };
say('TRAPPED — opens with no way out in view', results.filter(x => x.trapped.length), x => x.trapped.join(' · '));
say('ESCAPE DOES NOT CLOSE IT', results.filter(x => x.noEscape.length), x => x.noEscape.join(' · '));
say('OFF THE SIDE (phone)', results.filter(x => x.vp === 'phone' && x.offSide > 1), x => `${x.offSide}px`);
say('WORDS CUT OFF', results.filter(x => x.cut.length), x => x.cut.join(' · '));
say('SMALL TO PRESS (phone, under 24 px)', results.filter(x => x.small > 0), x => String(x.small));
say('LISTS WITH NO PAPER (desk, 6+ rows, no PDF/report/cards)', results.filter(x => x.vp === 'desk' && x.rows >= 6 && !x.paper.length), x => `${x.rows} rows`);
console.log(`\n${results.length} screens audited; ${results.reduce((n, x) => n + x.opened, 0)} overlays opened`);
if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 1));
