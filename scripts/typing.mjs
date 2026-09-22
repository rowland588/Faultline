/* CAN YOU CORRECT A WORD IN THE MIDDLE OF A SENTENCE, ON A PHONE?
 *
 *   npx vite --port 5191 --strictPort &
 *   node scripts/typing.mjs
 *
 * Rowland, after a day of using it on the floor: "if I want to then correct
 * something in the middle of the sentence, it doesn't tell me. It only lets me
 * then go to the end of the message and I have to delete the whole message to
 * the point of where I want to correct it."
 *
 * The cause was that every keystroke was written to IndexedDB and read back, so
 * the value round-tripped and React put the caret at the end of the new value.
 * No unit test could have caught it — there is no assertion about a caret in a
 * jsdom textarea that means anything. This drives a real browser at phone size
 * and checks the four things that were wrong: the caret stays where you put it,
 * the edit lands, it still saves without a Save button, and the box is big
 * enough (and 16px, or iOS zooms the page the moment you tap it). */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = {
  access_token: 'smoke', token_type: 'bearer', expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: {
    id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated',
    email: 'smoke@example.com', app_metadata: {}, user_metadata: {},
    created_at: new Date().toISOString(),
  },
};

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  serviceWorkers: 'block', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
});
await ctx.route('**://*.supabase.co/**', r => r.abort());
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } },
  [`sb-${REF}-auth-token`, SESSION]);

const page = await ctx.newPage();
const errs = [];
page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
page.on('console', m => {
  if (m.type() === 'error' && !/Supabase|net::ERR|Failed to fetch|DevTools/i.test(m.text())) {
    errs.push('console: ' + m.text().slice(0, 160));
  }
});

await page.goto(`${BASE}/#/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const seeded = await page.evaluate(async () => {
  const { seedForSmokeTest } = await import('/src/dev/seed.ts');
  return seedForSmokeTest();
});
await page.goto(`${BASE}/#/project/${seeded.projectId}/testing/${seeded.testId}`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);

const sel = 'label:has(span:text-is("What happened")) textarea';
const box = page.locator(sel);
await box.waitFor({ timeout: 5000 });

const results = [];
const check = (name, ok, detail = '') => { results.push([name, ok, detail]); };

/* 1 · type a sentence with a mistake in it, then go back and correct it. */
await box.click();
await box.fill('');
await page.keyboard.type('Ran the BU at 57 packs a minute for an hour');
await page.waitForTimeout(300);

const at = await box.evaluate(el => el.value.indexOf('57') + 2);
await box.evaluate((el, p) => { el.focus(); el.setSelectionRange(p, p); }, at);
await page.keyboard.press('Backspace');
await page.keyboard.press('Backspace');
await page.keyboard.type('75');
await page.waitForTimeout(400);

const after = await box.inputValue();
const caret = await box.evaluate(el => el.selectionStart);
check('the edit lands where you made it', after === 'Ran the BU at 75 packs a minute for an hour', after);
check('the caret stays mid-sentence', caret === at, `caret ${caret}, wanted ${at}`);

/* 2 · and it is still saved without anybody pressing Save. */
await box.evaluate(el => el.blur());
await page.waitForTimeout(700);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1500);
const saved = await page.locator(sel).inputValue();
check('still saves on its own', saved === after, saved);

/* 3 · and you can read back what you wrote. */
const b2 = page.locator(sel);
const start = await b2.evaluate(el => el.getBoundingClientRect().height);
const size = await b2.evaluate(el => parseFloat(getComputedStyle(el).fontSize));
await b2.click();
await page.keyboard.press('End');
for (let i = 0; i < 10; i++) await page.keyboard.type(`\nLine ${i} of notes taken on the floor while it ran.`);
await page.waitForTimeout(400);
const grown = await b2.evaluate(el => el.getBoundingClientRect().height);
check('the box is readable to start with', start >= 96, `${Math.round(start)}px`);
check('16px, so the page does not zoom', size >= 16, `${size}px`);
check('grows with what you write', grown > start, `${Math.round(start)} → ${Math.round(grown)}px`);

check('no errors', errs.length === 0, errs.join(' | '));

let bad = 0;
for (const [name, ok, detail] of results) {
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}
await browser.close();
if (bad) { console.error(`\n${bad} of ${results.length} failed.`); process.exit(1); }
console.log(`\n${results.length} checks passed.`);
