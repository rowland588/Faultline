/* 6M AS A TOOL (13 November, src/tools/sixm — Rowland: "6M is still a window … it sits weird now, we need it in the tools. So do what we
 * we need"; it replaces sixm-door.mjs, 4 November). The record is unchanged — a 6M is the project of the 6M kind it always was — and
 * every way into it by its project address still works. Driven on a new line:
 *   1  Tools: 6M is a card in the list like every other tool, with its picture; the old 6M button is gone; its own page (#/tools/sixm)
 *      says what it is for and starts one;
 *   2  a line's Tools: 6M listed under Not used on this line yet, with what it is for; it opens the line's 6Ms — none yet, said;
 *   3  a 6M started by naming the problem — it opens on its own page IN THE LINE'S FRAME (the line lit in the menu, Tools lit in the
 *      line's tabs, no project tabs), titled by the problem, with Pareto · Fishbone · Countermeasures · Report;
 *   4  each tab shows its screen without leaving the tool or the line's frame; the address carries the line and the view;
 *   5  a SECOND 6M on the same line (a line has as many as it has problems worth one); the list shows both, newest first;
 *   6  the line's Tools now shows 6M under In use on this line — 2 on this line, the newest named — and opens the list;
 *   7  renamed from More ▾; put away — gone from the list, the other still there;
 *   8  the same 6M by its project address still opens as it always did, in the project's frame;
 *   9  the phone: nothing off the side, the rows and tabs a thumb's height. */
import pkg from 'playwright';
import { more } from '../lib/pageHeader.mjs';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /supabase|net::|Failed to fetch|DevTools|WebSocket|aborted/i;
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m, d) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && d ? ` — ${String(d).slice(0, 300)}` : ''}`); if (!c) fail++; };
const flat = s => s.replace(/\s+/g, ' ').trim();
const go = async (hash, ms = 1800) => { await page.goto(`${BASE}/${hash}`); await page.waitForTimeout(ms); };
const main = () => page.locator('.nv-main');

await go('#/room', 3000);
const lineId = await page.evaluate(async () => (await (await import('/src/db.ts')).createWorkspace('Line 2A')).id);

/* ---- 1 · the Tools page ---- */
await go('#/tools', 2500);
ok(await page.locator('[data-sixm-door]').count() === 0, '1 the old 6M button is gone from Tools');
const card = main().locator('li, article, div').filter({ has: page.locator('b, h3, strong', { hasText: /^6M$/ }) }).last();
ok(await main().getByText('6M', { exact: true }).count() >= 1, '1 6M is in the list of tools');
ok(await main().locator('img[src*="tools/sixm.png"]').count() >= 1, '1 its card has its picture');
await go('#/tools/sixm', 2000);
const tp = flat(await main().innerText());
ok(/6M/.test(tp) && /root cause/i.test(tp) && /Start one|Start a/i.test(tp), '1 its own page says what it is for and starts one', tp.slice(0, 200));

/* ---- 2 · the line's Tools ---- */
await go(`#/lines/${lineId}?view=tools`, 2500);
const row = main().locator('[data-sixm-tool]');
ok(await row.count() === 1 && /the problem, its causes and what is being done/.test(flat(await row.innerText())), '2 the line’s Tools lists 6M, with what it is for');
ok(await main().locator('.pl-tools-more [data-sixm-tool]').count() === 1, '2 under Not used on this line yet');
await row.click(); await page.waitForTimeout(1500);
ok(new RegExp(`#/sixm\\?line=${lineId}`).test(page.url()), `2 it opens the line’s 6Ms: ${page.url().split('#')[1]}`);
ok(await page.locator('[data-sixm-none]').count() === 1 && /No 6M on Line 2A yet/.test(await page.locator('[data-sixm-none]').innerText()), '2 none yet, said');
const lit = async () => ({ rail: flat(await page.locator('.nv-rail .nv-ri.on, .nv-rail .nv-ri[aria-current]').first().innerText().catch(() => '')), tab: flat(await page.locator('.nv-tabs .nv-tab.on, .nv-tabs .nv-tab[aria-current], .nv-tabs .nv-tab[aria-selected="true"]').first().innerText().catch(() => '')), tabs: (await page.locator('.nv-tabs .nv-tab .nv-tab-l').allInnerTexts()).map(flat) });
let f = await lit();
ok(/Line 2A/.test(f.rail) && /^Tools/.test(f.tab), `2 the list sits in the line: the line lit in the menu, Tools in its tabs (${f.rail} · ${f.tab})`);

/* ---- 3 · a 6M started by naming the problem ---- */
ok(await page.locator('[data-sixm-start]').isDisabled(), '3 Start is held until the problem is named');
await page.locator('[data-sixm-name]').fill('Bags not opening on the bagger');
await page.locator('[data-sixm-start]').click(); await page.waitForTimeout(2500);
const first = page.url();
ok(/#\/sixm\/[^?]+\?line=/.test(first) && first.includes(lineId), `3 it opens on its own page, on the line: ${first.split('#')[1]}`);
ok(flat(await page.locator('.sixm-tool-head .pace-title').innerText()) === 'Bags not opening on the bagger', '3 titled by the problem');
f = await lit();
ok(/Line 2A/.test(f.rail) && /^Tools/.test(f.tab), `3 in the line’s frame (${f.rail} · ${f.tab})`);
ok(f.tabs.includes('Machines') && !f.tabs.includes('Fishbone') && !f.tabs.includes('Board'), `3 the tabs across the top are the line’s, never a project’s: ${f.tabs.join(' · ')}`);
const tabs = (await page.locator('.sixm-tool-head [role=tab]').allInnerTexts()).map(flat);
ok(JSON.stringify(tabs) === JSON.stringify(['Pareto', 'Fishbone', 'Countermeasures', 'Report']), `3 its own four parts: ${tabs.join(' · ')}`);
ok(await page.locator('.sixm-tool-head [role=tab][aria-selected="true"]').innerText().then(flat) === 'Pareto' && !/view=/.test(first), '3 it starts on the Pareto — what costs the most first, then why');
const pid = decodeURIComponent(first.split('#/sixm/')[1].split('?')[0]);
const rec = await page.evaluate(async i => { const D = await import('/src/db.ts'); const p = await D.getProject(i); const rows = (await D.allPaceLines()).filter(r => r.projectId === i); return { name: p?.name, method: p?.method ?? null, lines: rows.map(r => r.workspaceId) }; }, pid);
ok(rec.name === 'Bags not opening on the bagger' && rec.lines.length === 1 && rec.lines[0] === lineId, '3 the record is the 6M it always was — a 6M project on that line', JSON.stringify(rec));

/* ---- 4 · each part, without leaving the tool ---- */
for (const [label, view, words] of [['Fishbone', 'fishbone', /./], ['Countermeasures', 'board', /./], ['Report', 'report', /./], ['Pareto', '', /Pareto|timed|stops/i]]) {
  await page.locator('.sixm-tool-head [role=tab]', { hasText: label }).click(); await page.waitForTimeout(1500);
  const u = page.url();
  f = await lit();
  ok(u.includes(`/sixm/${pid}`) && u.includes(lineId) && (view ? u.includes(`view=${view}`) : !u.includes('view=')) && /Line 2A/.test(f.rail) && words.test(await main().innerText()), `4 ${label}: still the tool, still the line (${u.split('#')[1].split('?')[1]})`);
  ok(await page.locator(`.sixm-tool-head [role=tab][aria-selected="true"]`, { hasText: label }).count() === 1, `4 ${label} is the part lit`);
}

/* ---- 5 · a second 6M on the same line ---- */
await page.locator('.sixm-tool-head .part-back').click(); await page.waitForTimeout(1500);
ok(new RegExp(`#/sixm\\?line=${lineId}`).test(page.url()), '5 the way back is the line’s 6Ms');
await page.locator('[data-sixm-name]').fill('Short weights after a changeover');
await page.locator('[data-sixm-start]').click(); await page.waitForTimeout(2500);
const second = page.url();
ok(second !== first && /#\/sixm\//.test(second), '5 a second 6M is its own record');
await go(`#/sixm?line=${lineId}`, 1800);
const names = (await page.locator('[data-sixm] b').allInnerTexts()).map(flat);
ok(JSON.stringify(names) === JSON.stringify(['Short weights after a changeover', 'Bags not opening on the bagger']), `5 the list shows both, newest first: ${names.join(' | ')}`);
ok(/On Line 2A · 2/.test(flat(await main().innerText())), '5 counted on the line');

/* ---- 6 · the line's Tools, in use ---- */
await go(`#/lines/${lineId}?view=tools`, 2500);
const used = main().locator('.pl-tools.is-used [data-sixm-tool]');
ok(await used.count() === 1 && /2 on this line/.test(flat(await used.innerText())) && /Short weights after a changeover — and 1 more/.test(flat(await used.innerText())), '6 6M is under In use on this line — 2 on this line, the newest named', await used.innerText().catch(() => 'none'));
await used.click(); await page.waitForTimeout(1500);
ok(new RegExp(`#/sixm\\?line=${lineId}`).test(page.url()), '6 with two it opens the list');

/* ---- 7 · renamed, and put away ---- */
await page.locator('[data-sixm] b', { hasText: 'Short weights' }).click(); await page.waitForTimeout(2000);
await more(page, 'Rename'); await page.waitForTimeout(500);
await page.locator('[data-sixm-rename]').fill('Short weights after the 2 kg changeover');
await page.getByRole('button', { name: 'Save', exact: true }).click(); await page.waitForTimeout(1200);
ok(flat(await page.locator('.sixm-tool-head .pace-title').innerText()) === 'Short weights after the 2 kg changeover', '7 renamed where it sits');
await more(page, 'Put this 6M away'); await page.waitForTimeout(1800);
const left = (await page.locator('[data-sixm] b').allInnerTexts()).map(flat);
ok(new RegExp(`#/sixm\\?line=${lineId}`).test(page.url()) && JSON.stringify(left) === JSON.stringify(['Bags not opening on the bagger']), `7 put away — gone from the list, the other still there: ${left.join(' | ')}`);
const kept = await page.evaluate(async u => { const D = await import('/src/db.ts'); const id = decodeURIComponent(u.split('#/sixm/')[1].split('?')[0]); const p = await D.getProject(id); return { there: !!p, archived: !!p?.archivedAt }; }, second);
ok(kept.there && kept.archived, '7 archived, not deleted', JSON.stringify(kept));

/* ---- 8 · its project address still works ---- */
await go(`#/project/${pid}/fishbone`, 2500);
ok(/Open a problem|problem/i.test(flat(await page.locator('body').innerText())) && page.url().includes(`/project/${pid}/fishbone`), '8 the same 6M by its project address opens as it always did');

/* ---- 9 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await go(`#/sixm?line=${lineId}`, 2000);
let off = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(off <= 1, `9 the list: nothing off the side (${off}px)`);
ok((await page.locator('[data-sixm]').first().evaluate(e => e.getBoundingClientRect().height)) >= 44, '9 a row is a thumb’s height');
await page.locator('[data-sixm]').first().click(); await page.waitForTimeout(2200);
off = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
ok(off <= 1, `9 the 6M: nothing off the side (${off}px)`);
const th = await page.locator('.sixm-tool-head [role=tab]').first().evaluate(e => e.getBoundingClientRect().height);
ok(th >= 44, `9 its parts are a thumb’s height (${th}px)`);

ok(errs.length === 0, 'no console errors', errs.join(' | '));
await b.close();
if (fail) { console.log(`\n${fail} acceptance check(s) failed`); process.exit(1); }
console.log('\nall checks passed');
