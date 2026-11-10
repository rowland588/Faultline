/* ACCEPTANCE — A TOOL'S LIST, CARRY ON FIRST (10 November — Rowland: "tools is really bad, click on it i get to a page — the
 * current capacity tool page makes no relative sense to me, i have to navigate all the way to the bottom just to continue the tool
 * i was using … Tools obvious. Continue obvious. Everything is too busy"). screens/LineToolsScreen, Line capacity's list on a line:
 *
 *   1  from the line's Tools, Line capacity opens its list on that line
 *   2  under the line's name, "Carry on" and the records — above the line-wide analysis, by where they sit on the page
 *   3  the one worked on last (its updatedAt) first, with a primary Carry on › that opens it; the rest kept
 *   4  the line-wide analysis under "The line as a whole" (ui/Fold), shut until opened at a desk too, then whole; the SMED line
 *      between them when there is one
 *   5  a phone — the same: shut, Carry on › on the first screen, the presses 44 px, nothing off the side; opened, whole
 *
 *   node scripts/acceptance/tools-carry-on.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
const WS = sd.line7WsId;
const FOLD = '[data-fold="line-whole"]';
const openFold = async () => { if (!(await page.locator(`${FOLD}.is-open`).count())) await page.locator(`${FOLD} .fold-toggle`).click(); await page.waitForTimeout(1500); };

/* the newest product on the list as the records say it — the one to carry on with */
const truth = () => page.evaluate(async ws => {
  const db = await import('/src/db.ts'); const S = await import('/src/tools/linestandard/standard.ts');
  const rows = (await db.listAllStandards()).filter(s => s.workspaceId === ws && !s.deletedAt && S.inCapacityTool(s));
  const newest = rows.reduce((a, s) => (!a || (s.updatedAt ?? 0) > (a.updatedAt ?? 0) ? s : a), undefined);
  return { n: rows.length, newest: newest?.product, id: newest?.id };
}, WS);
/* a second product on the line (worked on a day ago), then the LAST in the list's own order made the one worked on last — so
   the newest-first is the records' doing and never the seed's order by chance */
await page.evaluate(async ws => {
  const db = await import('/src/db.ts'); const S = await import('/src/tools/linestandard/standard.ts');
  const before = (await db.listAllStandards()).filter(s => s.workspaceId === ws && !s.deletedAt && S.inCapacityTool(s));
  const day = Date.now() - 86_400_000;
  if (before.length < 2 && before[0]) await db.putStandard({ ...before[0], id: crypto.randomUUID(), product: 'Carry-on check 1kg', projectId: undefined, createdAt: day, updatedAt: day });
  const rows = (await db.listAllStandards()).filter(s => s.workspaceId === ws && !s.deletedAt && S.inCapacityTool(s));
  const pick = rows[rows.length - 1];
  if (pick) await db.putStandard({ ...pick, updatedAt: Date.now() + 1000 });
}, WS);
await page.evaluate(() => { try { localStorage.removeItem('faultline.fold.line-whole'); } catch { /* fine */ } });

/* ---- 1 · from the line's Tools ---- */
await t.go(`#/lines/${WS}?view=tools`, 2800);
const card = page.locator('.pl-tool', { hasText: 'Line capacity' }).first();
if (await card.count()) {
  const btn = card.locator('button, a').first();
  await ((await btn.count()) ? btn : card).click();
} else await page.getByRole('button', { name: /Line capacity/ }).first().click();
await page.waitForTimeout(2800);
let hash = decodeURIComponent(await page.evaluate(() => location.hash));
if (!hash.startsWith('#/balances')) { await t.go(`#/balances?line=${WS}`, 2800); hash = decodeURIComponent(await page.evaluate(() => location.hash)); }
ok(hash.startsWith('#/balances') && hash.includes(`line=${WS}`), `1 Line capacity's list on the line (${hash})`);
await page.locator('.lt-carry').first().waitFor({ timeout: 10000 }).catch(() => {});

/* ---- 2 · Carry on, the records first ---- */
const tr = await truth();
const g = page.locator('.qsl-g').first();
const top = sel => g.locator(sel).first().evaluate(e => e.getBoundingClientRect().top + window.scrollY).catch(() => NaN);
const [yHead, yCarry, yRows, yWhole] = [await top('.qsl-gh h2'), await top('.lt-carry-h'), await top('.lt-carry .lt-rows'), await top(FOLD)];
ok((await t.words('.lt-carry-h')) === 'Carry on' && yHead < yCarry && yCarry < yRows && yRows < yWhole,
  `2 "Carry on" and the records under the line's name, above the line-wide analysis (heading ${Math.round(yHead)}, Carry on ${Math.round(yCarry)}, records ${Math.round(yRows)}, the line as a whole ${Math.round(yWhole)})`);
const lis = g.locator('.lt-carry .lt-li');
ok((await lis.count()) === tr.n && tr.n >= 2, `2 every record is listed (${await lis.count()} of ${tr.n})`);
await openFold();
const lch = await top('.lch');
ok(Number.isFinite(lch) && lch > yRows, `2 the line's analysis (.lch) sits below the records (${Math.round(lch)} > ${Math.round(yRows)})`);

/* ---- 3 · the one worked on last first, Carry on › opening it ---- */
const firstWhat = (await lis.first().locator('.lt-what').innerText()).trim();
ok(firstWhat === tr.newest && /is-last-worked/.test((await lis.first().getAttribute('class')) ?? ''), `3 the one worked on last first: ${firstWhat} (the records say ${tr.newest})`);
const go = g.locator('.lt-carry-go');
ok((await go.count()) === 1 && (await go.innerText()).trim() === 'Carry on ›' && /btn-primary/.test((await go.getAttribute('class')) ?? ''), '3 one primary Carry on ›, on that row only');
ok((await lis.first().locator('.lt-acts').count()) === 1 && /Rename/.test(await lis.first().locator('.lt-acts').innerText()), '3 Rename and Delete still on its row');
await go.click(); await page.waitForTimeout(2500);
hash = decodeURIComponent(await page.evaluate(() => location.hash));
ok(hash.includes(`/standards/${tr.id}`) && hash.includes('at=balance'), `3 Carry on › opens that record (${hash})`);

/* ---- 4 · the line as a whole, shut until opened ---- */
await page.evaluate(() => { try { localStorage.removeItem('faultline.fold.line-whole'); } catch { /* fine */ } });
await t.go(`#/balances?line=${WS}`, 2800);
ok((await t.words(`${FOLD} .fold-t`)) === 'The line as a whole' && (await page.locator(`${FOLD}.is-open`).count()) === 0 && (await page.locator('.lch').count()) === 0,
  '4 "The line as a whole" shut at a desk until opened — the records the page');
const smed = await page.locator('.qsl-g').first().locator('.lt-co').count();
if (smed) {
  const ys = await top('.lt-co');
  ok(ys > yRows && ys < (await top(FOLD)), '4 the SMED line between the records and the line as a whole');
} else ok(true, '4 no SMED on this line — nothing between them');
await openFold();
ok((await page.locator(`${FOLD}.is-open .lch`).count()) === 1 && (await lis.count()) === tr.n, '4 opened with a tap — the analysis whole, the records kept');
await page.locator(`${FOLD} .fold-toggle`).click(); await page.waitForTimeout(400);
ok((await page.locator('.lch').count()) === 0, '4 shut again with a tap');

/* ---- 5 · a phone ---- */
await page.evaluate(() => { try { localStorage.removeItem('faultline.fold.line-whole'); } catch { /* fine */ } });
await page.setViewportSize({ width: 390, height: 844 });
await t.go(`#/balances?line=${WS}`, 2800);
const pg = page.locator('.qsl-g').first();
const yC = await pg.locator('.lt-carry-go').evaluate(e => e.getBoundingClientRect().top).catch(() => NaN);
ok((await page.locator(`${FOLD}.is-open`).count()) === 0 && (await page.locator('.lch').count()) === 0 && (await t.words(`${FOLD} .fold-t`)) === 'The line as a whole',
  '5 a phone: "The line as a whole" shut until opened');
ok(yC < 844, `5 a phone: Carry on › on the first screen (${Math.round(yC)} px down)`);
const small = await page.$$eval('.lt-carry-go, .lt-carry .lt-row, .lt-carry .lt-acts button, [data-fold="line-whole"] .fold-toggle', els => els.filter(e => e.getBoundingClientRect().height < 44).length);
ok(small === 0 && (await t.wide()) <= 1, `5 a phone: every press 44 px, nothing off the side (${small} small, ${await t.wide()} px over)`);
await openFold();
ok((await page.locator(`${FOLD}.is-open .lch`).count()) === 1 && (await t.wide()) <= 1, `5 a phone: opened, the analysis whole and nothing off the side (${await t.wide()} px over)`);

await t.finish('A tool’s list — Carry on first, the newest with its button; the line as a whole folded under it.');
