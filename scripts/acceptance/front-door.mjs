/* THE FRONT DOOR, DRIVEN — as it is since 20 October (docs/DIRECTION.md:
 * the method builder and its assistant deleted; "the only AI is the voice and
 * the camera video system").
 *
 * From an empty device, at home (#/; the control room is #/room):
 *
 *   1  the question first; nothing under way, said so; the three kinds of
 *      change — stage gate, 6M, lever tree — by name and situation; the ten
 *      tools to use on their own, Line Talk among them; Your factory to set
 *      up; Home and Projects at the top of the rail — and no words box, no
 *      library of methods, no Methods in the rail, no switch to show them
 *   2  a kind of change tapped: New job opens with it picked, and only the
 *      three are offered; the project made; the front door listing it under
 *      way, the row opening it
 *   3  the lever tree from the front door, picked the same way
 *   4  an old link to Methods or to the studio lands on the front door
 *   5  the phone: nothing off the side
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/front-door.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const txt = async () => (await page.locator('.nv-main').innerText()).replace(/\s+/g, ' ');
const home = async () => { await page.goto(`${BASE}/#/`); await page.locator('.fd-ask h1').waitFor({ timeout: 15000 }).catch(() => {}); await page.waitForTimeout(800); };

/* 1 — an empty device */
await home();
ok((await page.locator('.fd-ask h1').innerText()).trim() === 'What do you need to get done?', '1 the question, first');
ok(/Nothing under way yet — start a project below\./.test(await txt()), '1 nothing under way, said');
const kinds = await page.locator('.fd-lib .fw-card[data-start^="e:"] .fw-card-t').allInnerTexts();
ok(kinds.join(' · ') === 'Stage gate · 6M · Lever tree', '1 the three kinds of change by name', kinds.join(' · '));
const sits = (await page.locator('.fd-lib .fw-card[data-start^="e:"] .fw-card-p').allInnerTexts()).join(' | ');
ok(/^Bring new equipment into use — /.test(sits) && /Make a running line perform better — /.test(sits) && /Hit a number by a date — /.test(sits), '1 each by its situation', sits);
const tools = await page.locator('.fd-tools li[data-tool] b').allInnerTexts();
ok(tools.length === 11 && tools.includes('Line Talk') && tools.includes('Video study') && tools.includes('Line capacity') && tools.includes('Reliability'), '1 the eleven tools to use on their own — Line Talk and Reliability among them', tools.join(' · '));
ok(await page.locator('.fd-tools .sub').count() === 11, '1 each tool says what it is for');
ok(/Set it up ›/.test(await page.locator('.fd-factory').innerText()), '1 Your factory, to set up');
const rail = (await page.locator('.nv-rail').innerText()).replace(/\s+/g, ' ');
ok(/Home/.test(rail) && /Projects/.test(rail) && !/Methods/.test(rail), '1 Home and Projects in the rail — no Methods', rail.slice(0, 160));
ok(await page.locator('.fd-box, .fd-box textarea, .fd-parked, .fw-card[data-start^="l:"], .fw-card[data-start^="m:"]').count() === 0, '1 no words box, no library of methods, no switch to show them');

/* 2 — a kind of change tapped: New job with it picked, the project made, under way */
await page.locator('.fd-lib .fw-card[data-start="e:commissioning"] button').click(); await page.waitForTimeout(800);
ok(/#\/projects\?new=1&model=commissioning/.test(page.url()), '2 the stage gate opens New job with it picked', page.url());
ok(await page.locator('.proj-model-opt').count() === 3 && /Stage gate/.test(await page.locator('.proj-model-opt.on').innerText().catch(() => '')), '2 only the three offered, the stage gate picked');
ok(await page.locator('.proj-say, .proj-lib').count() === 0, '2 no words box and no library on New job');
await page.locator('.proj-new-grid input.text-input').first().fill('Line 4 new case packer');
await page.getByRole('button', { name: 'Create and add the machines' }).click(); await page.waitForTimeout(1500);
const made = page.url();
ok(/#\/project\/[^/]+/.test(made), '2 the project made and opened', made);
await home();
const row = page.locator('.fd-jobs li[data-project]').first();
ok(await row.count() === 1 && /Line 4 new case packer/.test(await row.innerText()) && /Stage gate/.test(await row.innerText()), '2 the front door lists it under way, with its kind', await row.innerText().catch(() => ''));
await row.locator('button').click(); await page.waitForTimeout(1000);
ok(/#\/project\//.test(page.url()), '2 its row opens it', page.url());

/* 3 — the lever tree, picked the same way */
await home();
await page.locator('.fd-lib .fw-card[data-start="e:tree"] button').click(); await page.waitForTimeout(800);
ok(/model=tree/.test(page.url()) && /Lever tree/.test(await page.locator('.proj-model-opt.on').innerText().catch(() => '')), '3 the lever tree opens New job with it picked');

/* 4 — old links land on the front door */
for (const old of ['#/methods', '#/methods/some-method', '#/design?say=Line%202%20keeps%20stopping']) {
  await page.goto(`${BASE}/${old}`); await page.waitForTimeout(1000);
  ok(((await page.locator('.fd-ask h1').innerText().catch(() => '')).trim()) === 'What do you need to get done?', `4 an old link (${old}) lands on the front door`);
}

/* 5 — the phone */
await page.setViewportSize({ width: 390, height: 800 });
await home();
const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, '5 the phone: nothing off the side', `${wide}px`);
ok(await page.locator('.fd-lib .fw-card').count() === 3 && await page.locator('.fd-tools li').count() === 11, '5 the phone: the three and the tools');

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
