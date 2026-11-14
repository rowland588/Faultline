/* ACCEPTANCE — THE FACTORY, CALMER (10 November — Rowland: "these dashboards are going to be cleaner. Too busy. Things need to be
 * simplified … Everything is too busy"). The Factory's Lines tab (#/room, screens/WorkspaceHome):
 *
 *   1  the order — the header (its name, Report ▾, New project), the areas and lines, Needs you now, the four cards, the three answers,
 *      then ONE fold, "Every project — the control room", then the closing line last, outside it
 *   2  the three answers each at most three rows, each but Did it work with its All … link
 *   3  the fold shut by default: none of the band, who owes what, This week or the timeline drawn; its one line the band's sentence
 *   4  opened — the band and its tiles, who owes what, This week across every line and project and the projects' timeline inside it,
 *      the closing line still after it; kept open after a reload (ui/Fold, remembered on this device), shut again by a tap
 *   5  the page's height on a desk, shut, well under what it is open (printed)
 *   6  a phone (390) — the areas first, the figures under what needs you (14 November), nothing off the side, the fold's toggle and every answer row a thumb's height
 *
 *   node scripts/acceptance/factory-calm.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await t.seed();
const FOLD = '[data-fold="control-room"]';
const room = async () => {
  /* a hash alone is not a reload — the page is loaded afresh, so the fold reads what this device remembers */
  await t.go('#/room', 300); await page.reload(); await page.waitForTimeout(2500);
  await page.locator(`${FOLD} .fold-toggle`).waitFor({ timeout: 30000 });
  await page.waitForTimeout(800);
};
const shut = () => page.evaluate(() => { try { localStorage.removeItem('faultline.fold.control-room'); } catch { /* fine */ } });
const visible = sel => page.evaluate(s => [...document.querySelectorAll(s)].some(e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }), sel);
const tops = () => page.evaluate(f => {
  const top = s => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + window.scrollY : null; };
  return { header: top('.home .fq-hero'), lines: top('.fac-first'), needs: top('.fq-recs'), cards: top('.fq-cards'), answers: top('.fq-answers'),
    fold: top(f), closing: top('.jb > .ln-close') };
}, FOLD);
/* 14 November — one front page: at a desk the four figures are the status across the top, straight under the page's name, and the
   areas follow; a phone keeps the areas first (its header's sentence is the status) and the figures below what needs you */
const DESK = ['header', 'cards', 'lines', 'needs', 'answers', 'fold', 'closing'], PHONE = ['header', 'lines', 'needs', 'cards', 'answers', 'fold', 'closing'];
const inOrder = (o, order = DESK) => order.every((k, i, a) => o[k] != null && (i === 0 || o[k] > o[a[i - 1]]));
const said = (o, order = DESK) => order.map(k => `${k} ${o[k] == null ? '—' : Math.round(o[k])}`).join(' · ');

/* ---- 1 · the order ---- */
await shut(); await room();
const o1 = await tops();
ok(inOrder(o1), `1 the order: ${said(o1)}`);
ok(/^Factory$/.test(await t.words('.home h1')) && /^Report/.test(await t.words('.home .fq-hero > .part-head .part-menu-b')) && await visible('.fac-floor .fac-card'),
  '1 the header (Factory, Report ▾), the four figures across the top and the lines under them');
ok((await page.locator('.fq-card').count()) === 4, `1 the four cards (${await page.locator('.fq-card').count()})`);

/* ---- 2 · the answers, three rows each ---- */
const rows = await page.evaluate(() => ['fq-wrong', 'fq-doing', 'fq-worked'].map(id => {
  const p = document.getElementById(id)?.closest('section, .fq-panel') ?? document.getElementById(id);
  return { id, n: p ? p.querySelectorAll('.fq-row').length : -1, all: p?.querySelector('a, .fq-all, [class*="all"]')?.textContent?.trim() ?? '' };
}));
ok(rows.every(r => r.n >= 0 && r.n <= 3), `2 each answer at most three rows (${rows.map(r => `${r.id} ${r.n}`).join(' · ')})`);
const alls = await page.locator('.fq-answers').innerText();
ok(/All problems/.test(alls) && /All actions/.test(alls), '2 All problems and All actions under their answers');

/* ---- 3 · shut by default ---- */
const shutNow = await page.locator(`${FOLD}.is-open`).count() === 0;
const hidden = !(await visible('.jb-hero')) && !(await visible('.jb-owes')) && !(await visible('.jb-week')) && !(await visible('.jb-gantt'));
const foldSays = await t.words(`${FOLD} .fold-s`), foldT = await t.words(`${FOLD} .fold-t`);
ok(shutNow && hidden && foldT === 'Every project — the control room', `3 the fold "${foldT}" shut, the band, who owes what, This week and the timeline not drawn`);
ok(foldSays.length > 0 && !/Reading/.test(foldSays), `3 its one line the band's sentence: "${foldSays}"`);
ok(await visible('.jb > .ln-close'), `3 the closing line drawn, outside the fold: "${(await t.words('.jb > .ln-close')).slice(0, 90)}"`);
const hShut = await page.evaluate(() => document.documentElement.scrollHeight);

/* ---- 4 · opened ---- */
await page.locator(`${FOLD} .fold-toggle`).click(); await page.waitForTimeout(900);
const inside = async sel => page.evaluate(([f, s]) => [...document.querySelectorAll(`${f} ${s}`)].some(e => e.getBoundingClientRect().height > 0), [FOLD, sel]);
const weekH = await t.words(`${FOLD} .jb-week:not(.jb-rem):not(.jb-undated) .jb-sec-h h3`);
ok(await inside('.jb-hero .jb-says') && (await page.locator(`${FOLD} .jb-hero .jb-of`).count()) >= 3 && await inside('.jb-stat.is-money'), '4 opened: the control-room band, its tiles and what the slips cost inside it');
ok(await inside('.jb-owes'), `4 who owes what inside it (${(await t.words(`${FOLD} .jb-owes`)).slice(0, 70)})`);
ok(/^This week, across every (line and )?project$/.test(weekH), `4 "${weekH}" inside it`);
ok(await inside('.jb-gantt'), '4 the projects on one timeline inside it');
const o4 = await tops();
ok(o4.closing > o4.fold && (await page.evaluate(f => !document.querySelector(f).contains(document.querySelector('.jb > .ln-close')), FOLD)), '4 the closing line still last, outside the fold');
const hOpen = await page.evaluate(() => document.documentElement.scrollHeight);
await room();
ok((await page.locator(`${FOLD}.is-open`).count()) === 1, '4 kept open after a reload (remembered on this device)');
await page.locator(`${FOLD} .fold-toggle`).click(); await page.waitForTimeout(500);
ok((await page.locator(`${FOLD}.is-open`).count()) === 0 && !(await visible('.jb-week')), '4 shut again by a tap');

/* ---- 5 · the height ---- */
console.log(`      the Lines tab at 1440: ${hShut} px shut, ${hOpen} px with the fold open`);
ok(hShut < hOpen * 0.7 && hShut < 3200, `5 the page well under what it was: ${hShut} px shut against ${hOpen} px open`);

/* ---- 6 · a phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await shut(); await room();
const o6 = await tops();
const small = await page.evaluate(f => [...document.querySelectorAll(`${f} .fold-toggle, .fq-answers .fq-row`)].filter(e => e.getBoundingClientRect().height > 0 && e.getBoundingClientRect().height < 44).length, FOLD);
ok(inOrder(o6, PHONE), `6 a phone, the areas first and the figures under what needs you: ${said(o6, PHONE)}`);
ok(small === 0 && (await t.wide()) <= 0, `6 nothing off the side (${await t.wide()}), the fold's toggle and every answer row 44 px (${small} small)`);
const hPhone = await page.evaluate(() => document.documentElement.scrollHeight);
console.log(`      the Lines tab at 390: ${hPhone} px shut`);
await page.locator(`${FOLD} .fold-toggle`).click(); await page.waitForTimeout(900);
ok(await inside('.jb-week') && (await t.wide()) <= 0, '6 opened on a phone: This week inside, nothing off the side');

await t.finish('The Factory, calmer — the lines, what needs you, the four answers; every project one tap away in the control room.');
