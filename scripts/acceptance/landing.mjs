/* THE LANDING PAGE, DRIVEN — what Faultline says it is before anybody signs in (31 October — Rowland: "the app has
 * changed, we need it to represent what it is"). No session, a cloud that cannot be reached:
 *
 *   1  the name and the sentence: Faultline, "The operational improvement system for production lines" — find the
 *      opportunities, diagnose, apply a method, organise the delivery, verify the result; never "project management"
 *      (Rowland, 31 October: "operational improvement system, not a project management system"); none of the old words
 *      (Performance (6M), Programs and tests on the line)
 *   2  the eight methods under it, each name and the order read from lib/methods — never retyped here
 *   3  the five stages of the improvement lifecycle, in order: Identify the opportunity · Diagnose the problem · Apply a
 *      methodology · Organise the delivery · Verify the result
 *   4  the sign-in: the card's two boxes, Sign in held until both are filled, Create account by its link and back, and
 *      the signal said in words when the cloud cannot be reached
 *   5  at a desk the five stages sit beside the sign-in; on a phone the sign-in is first, the five below it, nothing
 *      off the side at 320, 390 and 1360
 *   and no console error.
 *
 *   node scripts/acceptance/landing.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;
const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [];
const open = async (w, h) => {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
  page.on('pageerror', e => errs.push(e.message));
  await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('.door-card', { timeout: 120000 });
  return { ctx, page };
};

const { ctx, page } = await open(1360, 900);

/* 1 — the name and the sentence */
ok(flat(await page.locator('.door-name').innerText()) === 'Faultline', '1 the name');
const lede = flat(await page.locator('.door-lede').innerText());
ok(/^The operational improvement system for production lines\./.test(lede) && /Find the opportunities/.test(lede) && /diagnose/.test(lede) && /apply the method/.test(lede) && /organise the delivery/.test(lede) && /verify the result/.test(lede), '1 the sentence says what it is — the whole lifecycle', lede);
const all = flat(await page.locator('.door').innerText());
ok(!/Performance \(6M\)|Programs and tests on the line|project[- ]management/i.test(all), '1 none of the old words, and never "project management"');

/* 2 — the eight methods, from the module */
await page.goto(`${BASE}/#/`); // same page; the module is read through the dev server
const wanted = await page.evaluate(async () => (await import('/src/lib/methods.ts')).METHODS.map(m => m.name));
const shown = (await page.locator('.door-methods span').allInnerTexts()).map(flat);
ok(wanted.length === 8 && shown.join(' | ') === wanted.join(' | '), '2 the eight methods, in the module’s order', `${shown.join(' | ')} vs ${wanted.join(' | ')}`);

/* 3 — the five stages */
const steps = await page.locator('.door-steps li b').allInnerTexts();
ok(steps.map(flat).join(' | ') === 'Identify the opportunity | Diagnose the problem | Apply a methodology | Organise the delivery | Verify the result', '3 the five stages, in order', steps.join(' | '));
const stepText = flat(await page.locator('.door-steps').innerText());
ok(/measured by people/.test(stepText) && /sections in order/.test(stepText) && /every finding in money/.test(stepText) && /before and after/.test(stepText), '3 each says what it is, in the floor’s words');

/* 4 — the sign-in */
const go = page.getByRole('button', { name: 'Sign in' });
ok(await go.isDisabled(), '4 Sign in held until both boxes are filled');
await page.getByLabel('Email').fill('someone@example.com');
ok(await go.isDisabled(), '4 still held with the email only');
await page.getByLabel('Password').fill('a-password');
ok(await go.isEnabled(), '4 ready with both');
await go.click(); await page.waitForTimeout(1500);
ok(/could not be reached/i.test(await page.locator('.door-msg.is-err').innerText().catch(() => '')), '4 no signal, said in words', await page.locator('.door-msg').allInnerTexts());
await page.getByRole('button', { name: /Been invited\? Create your account/ }).click();
ok((await page.locator('.door-card-h').innerText()) === 'Create your account' && (await page.getByRole('button', { name: 'Create account' }).count()) === 1, '4 Create account by its link');
await page.getByRole('button', { name: /Already have an account\? Sign in/ }).click();
ok((await page.locator('.door-card-h').innerText()) === 'Welcome back', '4 and back');

/* 5 — desk: beside; phone: sign-in first */
const box = async sel => page.locator(sel).first().boundingBox();
const [s, c] = [await box('.door-steps'), await box('.door-card')];
ok(s && c && c.x > s.x + s.width - 4 && Math.abs(c.y - s.y) < 200, '5 at a desk the five stages sit beside the sign-in', JSON.stringify({ s, c }));
ok((await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1, '5 nothing off the side at 1360');
await ctx.close();
for (const w of [390, 320]) {
  const p = await open(w, 800);
  const [ss, cc] = [await p.page.locator('.door-steps').boundingBox(), await p.page.locator('.door-card').boundingBox()];
  ok(cc.y < ss.y, `5 on a ${w}-wide phone the sign-in comes first, the five stages below`, JSON.stringify({ ss, cc }));
  ok((await p.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)) <= 1, `5 nothing off the side at ${w}`);
  await p.ctx.close();
}

ok(errs.length === 0, 'no console error', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nAll passed');
process.exit(fail ? 1 : 0);
