/* ACCEPTANCE — THE UPGRADE: A LINE READ FOR YOU (docs/upgrade-plan.md).
 *
 * The brief, 15 October: "take the entire app to world-class ... every
 * number drillable; works with the AI off". Driven in a real browser on the
 * demo factory (built from the account menu's demo, every line "Demo — …"),
 * with no AI anywhere:
 *
 *   1  Line capacity on the packing hall: the answer first, theoretical ·
 *      demonstrated · plannable, each opening why it is that number
 *   2  Ask, with the AI off: the biggest loss answered from the functions
 *   3  where and when it stops: the grid's sentence as lib/intelligence
 *      heatOf says it; a cell opening the stops it is made of
 *   4  the week, to send: the panel's own sentences, copied
 *   5  the Pareto, read: chronic or a one-off, the constraint or the mirage
 *   6  Capture: Again? — a tap sets the machine, what and which kind
 *   7  the line's page: the line, machine by machine — a card a machine,
 *      a tap opening its problems on the register
 *   8  Jump to: Ctrl K, two letters, Enter — the place opened
 *   9  the demo kept out of the factory
 *  10  on a phone: the panel and the tour with nothing off the side
 *  11  on paper: Line capacity's PDF for the line says the week, as the
 *      panel does (CLAUDE.md rule 2 — screen and paper together)
 *   and no console error anywhere.
 *
 *   node scripts/acceptance/upgrade.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const OUT = process.env.SHOTS;
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ serviceWorkers: 'block', viewport: { width: 1360, height: 900 }, locale: 'en-GB' });
await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
const page = await ctx.newPage();
const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/supabase|net::|Failed to fetch|DevTools/i.test(m.text())) errs.push(m.text().slice(0, 150)); });
let fail = 0; const ok = (c, m) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}`); if (!c) fail++; };
const flat = s => s.replace(/\s+/g, ' ').trim();

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(3000);
const hall = await page.evaluate(async () => (await import('/src/lib/demo.ts')).rebuildDemo());
const name = await page.evaluate(async id => (await (await import('/src/db.ts')).getWorkspace(id))?.name, hall);

/* 1 — the capacity reference */
await page.goto(`${BASE}/#/balances?line=${hall}`); await page.waitForTimeout(3500);
const hero = flat(await page.locator('.lch-hero').innerText());
ok(hero.length > 20, `1 the answer first: "${hero.slice(0, 90)}…"`);
ok(await page.locator('.lch-mx .mx').count() === 3, '1 theoretical · demonstrated · plannable');
await page.locator('.lch-mx .mx').nth(2).click(); await page.waitForTimeout(500);
const why1 = flat(await page.locator('.why').first().innerText());
ok(/four shifts in five|20th percentile/i.test(why1) && /Made of/.test(why1), '1 plannable opens why: the 20th percentile, made of the counted shifts');
await page.keyboard.press('Escape'); await page.waitForTimeout(400);

/* 2 — Ask with no AI */
await page.locator('.lch-ask input').fill('What is the biggest loss?');
await page.locator('.lch-ask').press('Enter'); await page.waitForTimeout(800);
const ans = flat(await page.locator('.lch-ans-t').innerText().catch(() => ''));
ok(/min over \d+ counted shifts/.test(ans), `2 Ask answered from the functions: "${ans.slice(0, 80)}…"`);

/* 3 — where and when it stops, as the module says */
const heatSays = await page.evaluate(async id => {
  const db = await import('/src/db.ts'); const { heatOf } = await import('/src/lib/intelligence/index.ts');
  const [o, w] = await Promise.all([db.listObservations(id), db.getWorkspace(id)]);
  return heatOf(o, Date.now(), w?.assets ?? []).says;
}, hall);
ok(flat(await page.locator('.lch-heat .lch-fall-says').innerText()) === heatSays, `3 the grid says what heatOf says: "${heatSays.slice(0, 80)}…"`);
ok(await page.locator('.lch-hm-row').count() >= 5, '3 a row a machine');
await page.locator('.lch-hm-c.is-on').first().click(); await page.waitForTimeout(500);
ok(/Made of/.test(await page.locator('.why').first().innerText()), '3 a cell opens the stops it is made of');
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
if (OUT) await page.locator('.lch-heat').screenshot({ path: `${OUT}/up-heat.png` });

/* 4 — the week, to send */
await page.locator('.lch-brief summary').click(); await page.waitForTimeout(300);
const brief = flat(await page.locator('.lch-brief-t').innerText());
ok(brief.startsWith(`${name} — the week to`) && brief.includes(heatSays) && brief.includes(hero.split(';')[0]), '4 the brief: the line, the week, what it can make and the grid\'s own sentences');
await page.locator('.lch-brief').getByRole('button', { name: 'Copy the week' }).click(); await page.waitForTimeout(400);
const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => '');
ok(flat(clip) === brief && /Copied/.test(await page.locator('.lch-brief').innerText()), '4 copied — the same paragraph');

/* 5 — the Pareto, read */
await page.goto(`${BASE}/#/w/${hall}/analyse?measure=time&dims=asset,category,subcategory`); await page.waitForTimeout(3000);
const prd = flat(await page.locator('.prd').innerText().catch(() => ''));
ok(/chronic|recurring|one-off/.test(prd) && /constraint/.test(prd), `5 the Pareto read: chronic or a one-off, the constraint said`);

/* 6 — Capture: Again? */
await page.goto(`${BASE}/#/w/${hall}/capture`); await page.waitForTimeout(3000);
const chips = page.locator('.cap-again .chip');
ok(await chips.count() >= 2, `6 Again? offers the last reasons (${await chips.count()})`);
const pick = flat(await chips.nth(1).innerText());
await chips.nth(1).click(); await page.waitForTimeout(300);
const machine = pick.split('·')[0].trim();
const onMachine = flat(await page.locator('.cap-block').nth(1).locator('.chip.on').first().innerText().catch(() => ''));
ok(onMachine === machine && (await chips.nth(1).getAttribute('aria-pressed')) === 'true', `6 a tap sets the machine, what and which kind: ${pick}`);

/* 7 — the line, machine by machine */
await page.goto(`${BASE}/#/lines/${hall}`); await page.waitForTimeout(3500);
const tour = flat(await page.locator('.tour-says').innerText());
ok(tour.startsWith(`${name}:`) && /machines/.test(tour), `7 the tour's sentence: "${tour.slice(0, 90)}…"`);
const cards = await page.locator('.tour-card').count();
ok(cards >= 8, `7 a card a machine (${cards})`);
ok(await page.locator('.tour-card.is-on').count() === 1 && /constraint/.test(await page.locator('.tour-card.is-on').innerText()), '7 the constraint tagged on its card');
const withProblem = page.locator('.tour-card', { has: page.locator('.qsl-prio') }).first();
await withProblem.locator('.tour-b').click(); await page.waitForTimeout(2000);
ok(/#\/snags\?line=/.test(page.url()) && /open=/.test(page.url()), '7 a tap opens its problems on the register');
if (OUT) { await page.goto(`${BASE}/#/lines/${hall}`); await page.waitForTimeout(2500); await page.locator('.tour').screenshot({ path: `${OUT}/up-tour.png` }); }

/* 8 — Jump to */
await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
await page.keyboard.press('Control+k'); await page.waitForTimeout(400);
ok(await page.locator('.jt').isVisible(), '8 Ctrl K opens Jump to');
await page.keyboard.type('pack'); await page.waitForTimeout(300);
const first = flat(await page.locator('.jt-list [role=option]').first().innerText());
await page.keyboard.press('Enter'); await page.waitForTimeout(1500);
ok(/Packing Hall/.test(first) && !(await page.locator('.jt').isVisible()) && page.url() !== `${BASE}/#/room`, `8 two letters and Enter: ${first.slice(0, 40)} opened`);

/* 9 — the demo stays out of the factory */
await page.goto(`${BASE}/#/factory`); await page.waitForTimeout(2500);
ok(!/Demo —/.test(await page.locator('.nv-main').innerText()), '9 Your factory carries no demo line');

/* 10 — the phone */
await page.setViewportSize({ width: 390, height: 844 });
for (const [p, what] of [[`#/balances?line=${hall}`, 'the capacity panel'], [`#/lines/${hall}`, 'the line and its tour']]) {
  await page.goto(`${BASE}/${p}`); await page.waitForTimeout(3000);
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 391, `10 phone: ${what}, nothing off the side (${sw}px)`);
}

/* 11 — the paper says what the panel says */
await page.setViewportSize({ width: 1360, height: 900 });
await page.goto(`${BASE}/#/room`); await page.waitForTimeout(1500);
const b64 = await page.evaluate(async h => {
  const db = await import('/src/db.ts'); const m = await import('/src/lib/capacityPaperLoad.ts');
  const list = (await db.listStandardsForLine(h)).filter(s => !s.deletedAt && s.capacity?.stations.length);
  const doc = await m.capacityPdf(list, { scope: 'the line' });
  const u = new Uint8Array(doc.output('arraybuffer')); let s = ''; for (const x of u) s += String.fromCharCode(x); return btoa(s);
}, hall);
const dir = mkdtempSync(join(tmpdir(), 'up-')), pdf = join(dir, 'cap.pdf');
writeFileSync(pdf, Buffer.from(b64, 'base64'));
const paperText = flat(execFileSync('pdftotext', ['-raw', pdf, '-'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
ok(paperText.includes(flat(heatSays)) && paperText.includes(hero.split(';')[0]), '11 the Line capacity paper says the week as the panel does');

ok(errs.length === 0, `no console errors${errs.length ? `: ${errs.slice(0, 3).join(' | ')}` : ''}`);
await b.close();
console.log(fail ? `${fail} failed` : 'The upgrade accepted: a line read for you — what it can make, where and when it stops, the week to send, the Pareto read, Again?, the tour, Jump to, and the phone — all with the AI off');
process.exit(fail ? 1 : 0);
