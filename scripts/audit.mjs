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
 *   PHONE       at 390 px on a touch screen: nothing off the side, no words
 *               cut off, nothing to press smaller than a fingertip — on the
 *               page and in every sheet that opens
 *   PAPER       a page that lists records: does it offer its report, its cards
 *   ACTIONS     the edit and delete words on the page, for reading by hand
 *
 * Never presses anything that deletes, removes, archives, signs out or starts
 * fresh; every confirm is answered no. Read-only on the seed.
 *
 * Each small or cut element is named — where it sits (its classes and its
 * parent's), its words and its size — so a finding points at its source.
 *
 *   node scripts/audit.mjs [out.json]          (SMOKE_BASE, as smoke)
 *   node scripts/audit.mjs [out.json] --fit    the phone fit only: measured, nothing pressed */
import pkg from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const ARGS = process.argv.slice(2);
const FIT = ARGS.includes('--fit');
const OUT = ARGS.find(a => !a.startsWith('--'));
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

/* THE FIT, measured in the page — of the screen (root null) or of the sheet on
   top (root: the overlays' selector, the last one open) */
function fit([vpName, root]) {
  const vis = el => { const b = el.getBoundingClientRect(); const cs = getComputedStyle(el); return b.width > 0 && b.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const where = el => { const one = e => e.tagName.toLowerCase() + [...e.classList].slice(0, 3).map(c => `.${c}`).join(''); return (el.parentElement ? `${one(el.parentElement)} > ` : '') + one(el); };
  const said = el => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || (el.tagName === 'INPUT' ? `[${el.type}]` : '') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const main = root ? [...document.querySelectorAll(root)].filter(vis).pop() : document.querySelector('main, .wrap, #root') ?? document.body;
  if (!main) return {};
  const offSide = Math.max(0, document.documentElement.scrollWidth - window.innerWidth);
  /* words kept for a screen reader only (.sr, .sr-only: a 1px clipped box)
     are hidden on purpose, never cut */
  const forReaderOnly = el => { const cs = getComputedStyle(el); return el.clientWidth <= 1 || el.clientHeight <= 1 || /rect\(0(px)?,? 0(px)?,? 0(px)?,? 0(px)?\)/.test(cs.clip) || cs.clipPath === 'inset(50%)'; };
  const cutEls = [...main.querySelectorAll('h1,h2,h3,p,span,b,button,a,label,td,th,li')].filter(el => {
    if (!vis(el) || el.children.length > 3 || forReaderOnly(el)) return false;
    const cs = getComputedStyle(el);
    return el.scrollWidth > el.clientWidth + 2 && cs.overflowX !== 'visible' && cs.textOverflow !== 'ellipsis' && (el.textContent ?? '').trim().length > 2;
  }).slice(0, 6);
  const cut = cutEls.map(el => (el.textContent ?? '').trim().slice(0, 40));
  const cutAt = cutEls.map(el => ({ at: where(el), text: said(el), w: el.clientWidth, needs: el.scrollWidth }));
  /* WHAT A FINGER PRESSES. The control's own box, grown by its halo (the
     house's ::before / ::after, an empty positioned box that takes the tap
     for it — "TAPPABLE BY THUMB" in styles.css), and for a box ticked
     through its label, the label. Measured on a touch screen, so the
     phone's own rules (pointer: coarse) are the ones in force. */
  const px = v => (/^-?[\d.]+px$/.test(v) ? parseFloat(v) : null);
  const target = el => {
    const lab = el.tagName === 'INPUT' && !['range', 'text', 'number', 'date', 'time', 'search', 'email', 'tel', 'url'].includes(el.type) && el.closest('label');
    const b = (lab || el).getBoundingClientRect();
    let L = b.left, T = b.top, R = b.right, B = b.bottom;
    const cs = getComputedStyle(el);
    /* a halo is the control's own child: its own overflow clips it */
    if (cs.position !== 'static' && cs.overflowX === 'visible' && cs.overflowY === 'visible') for (const pseudo of ['::before', '::after']) {
      const p = getComputedStyle(el, pseudo);
      if (p.content === 'none' || p.content === 'normal' || p.position !== 'absolute' || p.pointerEvents === 'none' || p.display === 'none') continue;
      const pl = b.left + parseFloat(cs.borderLeftWidth), pt = b.top + parseFloat(cs.borderTopWidth);
      const pr = b.right - parseFloat(cs.borderRightWidth), pb = b.bottom - parseFloat(cs.borderBottomWidth);
      const [l, r, t, bo, w, h] = [p.left, p.right, p.top, p.bottom, p.width, p.height].map(px);
      const hl = l != null ? pl + l : r != null && w != null ? pr - r - w : pl;
      const hr = r != null ? pr - r : hl + (w ?? 0);
      const ht = t != null ? pt + t : bo != null && h != null ? pb - bo - h : pt;
      const hb = bo != null ? pb - bo : ht + (h ?? 0);
      L = Math.min(L, hl); R = Math.max(R, hr); T = Math.min(T, ht); B = Math.max(B, hb);
    }
    return { w: R - L, h: B - T };
  };
  const tappable = vpName === 'phone' ? [...main.querySelectorAll('button, a[href], [role="button"], input, select')].filter(vis).map(el => ({ el, t: target(el) })) : [];
  const smallOnes = tappable.filter(x => x.t.h < 24 || x.t.w < 24);
  const shortOnes = tappable.filter(x => x.t.h < 32 || x.t.w < 24);
  const small = smallOnes.length, short = shortOnes.length;
  const smallAt = shortOnes.slice(0, 40).map(({ el, t }) => ({ at: where(el), text: said(el), w: Math.round(t.w), h: Math.round(t.h) }));
  const words = [...main.querySelectorAll('button, a, [role="button"]')].filter(vis).map(el => (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const paper = [...new Set(words.filter(w => /\bPDF\b|report|cards?\b|print/i.test(w)).map(w => w.slice(0, 40)))].slice(0, 8);
  const acts = [...new Set(words.filter(w => /^(edit|rename|change|delete|remove)\b|\b(delete|rename|edit)\b/i.test(w)).map(w => w.replace(/ for .*| — .*/, '').slice(0, 30)))].slice(0, 8);
  const rows = main.querySelectorAll('li, tbody tr, [class*="-row"], [class*="card"]').length;
  return { offSide, cut, cutAt, small, short, smallAt, paper, acts, rows };
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const results = [];
/* the phone is a touch screen: (pointer: coarse), as a phone in a hand */
for (const vp of [{ name: 'desk', width: 1280, height: 900, hasTouch: false }, { name: 'phone', width: 390, height: 844, hasTouch: true }]) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: vp.width, height: vp.height }, hasTouch: vp.hasTouch, locale: 'en-GB', acceptDownloads: true });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage();
  page.on('dialog', d => void d.dismiss().catch(() => {}));
  page.on('download', d => void d.cancel().catch(() => {}));
  await page.goto(`${BASE}/#/`); await page.waitForTimeout(2500);
  const seeded = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  const ROUTES = new Function('seeded', `return ${routesSrc}`)(seeded);

  for (const [name, hash] of ROUTES) {
    const r = { vp: vp.name, name, hash, trapped: [], noEscape: [], opened: 0, offSide: 0, cut: [], small: 0, short: 0, paper: [], acts: [], rows: 0, sheetSmall: [] };
    await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(1800);
    /* the bar of the document just made (ui/PdfReady) stays up across screens
       until it is closed — closed here, so its × is never taken for the way
       out of what opens next */
    const ready = page.locator('.pdfr-x');
    if (await ready.isVisible().catch(() => false)) { await ready.click().catch(() => {}); await page.waitForTimeout(200); }
    const base = page.url();

    /* PHONE FIT and what is on the page */
    Object.assign(r, await page.evaluate(fit, [vp.name, null]));

    /* WAYS OUT — press what might open something, one at a time */
    const labels = vp.name !== 'phone' || FIT ? [] : await page.evaluate(([never, navlike, opens]) => {
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
      if (await ready.isVisible().catch(() => false)) await ready.click().catch(() => {});
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
      /* the sheet's own controls, at a finger's size too */
      const inSheet = await page.evaluate(fit, [vp.name, OVERLAY]);
      for (const e of inSheet.smallAt ?? []) r.sheetSmall.push({ ...e, at: `[${label.slice(0, 24)}] ${e.at}` });
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
say('SMALL TO PRESS (phone, under 24 px, or under 32 high)', results.filter(x => x.short > 0), x => `${x.small} under 24 · ${x.short} under 32 high`);
/* the small and the cut by where they sit, so one shared source shows once */
const tally = (key, f) => {
  const m = new Map();
  for (const x of results) for (const e of x[key] ?? []) { const k = `${e.at} "${e.text}" ${f(e)}`; const v = m.get(k) ?? { n: 0, screens: new Set() }; v.n++; v.screens.add(x.name); m.set(k, v); }
  return [...m].sort((a, b) => b[1].n - a[1].n);
};
const list = (title, key, f) => { const t = tally(key, f); console.log(`\n${title} — ${t.length}`); for (const [k, v] of t) console.log(`  ${String(v.n).padStart(3)}  ${k}  — ${[...v.screens].slice(0, 3).join(' · ')}`); };
list('SMALL ON THE PAGE, BY WHERE IT SITS', 'smallAt', e => `${e.w}×${e.h}`);
list('SMALL IN A SHEET, BY WHERE IT SITS', 'sheetSmall', e => `${e.w}×${e.h}`);
list('CUT, BY WHERE IT SITS', 'cutAt', e => `${e.w} of ${e.needs}px`);
say('LISTS WITH NO PAPER (desk, 6+ rows, no PDF/report/cards)', results.filter(x => x.vp === 'desk' && x.rows >= 6 && !x.paper.length), x => `${x.rows} rows`);
const phone = results.filter(x => x.vp === 'phone');
console.log(`\n${results.length} screens audited; ${results.reduce((n, x) => n + x.opened, 0)} overlays opened`);
console.log(`phone: ${phone.filter(x => x.small).length} screens with something under 24 px (${phone.reduce((n, x) => n + x.small, 0)} controls), ${phone.filter(x => x.short).length} under 32 high (${phone.reduce((n, x) => n + x.short, 0)}); ${phone.filter(x => x.sheetSmall.length).length} with a sheet holding something under 32 high; ${results.filter(x => x.cut.length).length} screens with words cut; ${phone.filter(x => x.offSide > 1).length} off the side`);
if (OUT) writeFileSync(OUT, JSON.stringify(results, null, 1));
