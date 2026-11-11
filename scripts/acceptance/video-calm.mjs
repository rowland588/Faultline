/* ACCEPTANCE — A VIDEO STUDY, CALM (11 November, docs/DESIGN.md — "the complexity should exist underneath the interface"). The
 * busiest record in the app (5,078 px at a desk, 11,487 on a phone) as a person meets it, on the smoke seed's study (its footage
 * on another device, 13 events: 10 accepted, one of them corrected, 1 rejected, 2 to review):
 *
 *   1  the first screen says what the footage is (its file, length, picture and where it is), where the reading stands (Ready for
 *      review, what was found) and the one next step — Review the 2 still to review, the page's one primary
 *   2  the sections a heading and a hairline: the footage, the review, the line balance, is this footage fit — none a box
 *   3  the secondary parts each a line in ui/Fold, shut on arrival and saying what is inside — Stations and how it is read (the
 *      stations, the reading's settings, the camera's AI), Every event, The standard — pace and allowance, What this footage can
 *      tell you — and each opening to its contents
 *   4  the next step opens Every event and goes there
 *   5  the heights, printed — desk and phone
 *   6  the phone (390): nothing off the side, the folds' toggles and the next step 44 px or more
 *   and no console error.
 *
 *   node scripts/acceptance/video-calm.mjs      (SMOKE_BASE, as smoke) */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31536000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'acceptance@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|WebSocket|tunnel|Download the React DevTools|Failed to load resource/i;
let fail = 0;
const ok = (c, m, d) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${m}${!c && d ? ` — ${String(d).slice(0, 400)}` : ''}`); if (!c) fail++; };
const flat = s => String(s ?? '').replace(/\s+/g, ' ').trim();

const FOLDS = ['vid-reading', 'vid-events', 'vid-pace', 'vid-claims'];
/* what each fold holds once open — the drawn thing, never the box */
const INSIDE = { 'vid-reading': '.vid-zone-rows li', 'vid-events': '.vid-ev', 'vid-pace': '.vid-pace input', 'vid-claims': '.vfit-claims li' };

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' });
const heights = {};
for (const [tag, vp] of [['desk', { width: 1360, height: 900 }], ['phone', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: vp, locale: 'en-GB' });
  await ctx.route('**://*.supabase.co/**', r => r.abort());
  await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* private mode */ } }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await ctx.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message.split('\n')[0]));
  page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(`console: ${m.text().slice(0, 160)}`); });
  await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2200);
  const sd = await page.evaluate(async () => (await import('/src/dev/seed.ts')).seedForSmokeTest());
  await page.goto(`${BASE}/#/video/${sd.videoStudyId}`);
  await page.locator('.vid-study').waitFor({ timeout: 15000 }); await page.waitForTimeout(1500);
  const vh = vp.height;
  const top = sel => page.locator(sel).first().evaluate(e => e.getBoundingClientRect().top + window.scrollY).catch(() => Infinity);

  /* 1 — the first screen */
  const facts = flat(await page.locator('.vid-study [data-facts]').innerText());
  const job = flat(await page.locator('.vid-job').innerText());
  const primary = await page.locator('.vid-study .btn-primary').allInnerTexts();
  ok(/^line4-morning\.webm — 0:32\.0 · 1280×720/.test(facts) && /not on this device/.test(await page.locator('.vid-nofootage').innerText()), `1 ${tag}: what the footage is, and where it is`, facts);
  ok(/^Ready for review — 12 pieces of work found at 3 of 3 stations\./.test(job), `1 ${tag}: where the reading stands`, job);
  ok(primary.length === 1 && primary[0] === 'Review the 2 still to review', `1 ${tag}: the one next step, the page's one primary — ${primary.join(' | ')}`);
  const firsts = { facts: await top('.vid-study [data-facts]'), job: await top('.vid-job'), next: await top('.vid-job .btn-primary') };
  ok(Object.values(firsts).every(y => y < vh), `1 ${tag}: all three on the first screen (${JSON.stringify(firsts)})`);

  /* 2 — sections, not boxes */
  const boxed = await page.evaluate(() => {
    const box = el => { const cs = getComputedStyle(el); const edges = ['Top', 'Right', 'Bottom', 'Left'].filter(k => parseFloat(cs[`border${k}Width`]) > 0).length; const fill = !['rgba(0, 0, 0, 0)', 'transparent'].includes(cs.backgroundColor) && cs.backgroundColor !== getComputedStyle(document.body).backgroundColor; return (fill && (edges >= 2 || cs.boxShadow !== 'none' || parseFloat(cs.borderTopLeftRadius) > 2)) || edges >= 3 || (cs.boxShadow !== 'none' && parseFloat(cs.borderTopLeftRadius) > 2); };
    return [...document.querySelectorAll('.vid-study > section, .vid-study > .fold, .vid-says, .vid-ev, .vfit-check, .vfit-plan')].filter(box).map(e => e.className);
  });
  ok(!boxed.length, `2 ${tag}: the sections, the events, the checks and How to film it draw no box of their own`, boxed.join(' | '));
  const sections = await page.locator('.vid-study > section:not(.fold)').evaluateAll(es => es.map(e => e.getAttribute('aria-label')));
  ok(JSON.stringify(sections) === JSON.stringify(['The footage', 'Review', 'The line balance', 'Is this footage fit for the study', 'Where it sits']), `2 ${tag}: the footage, the review, the line balance, is it fit, where it sits — in that order (${sections.join(' · ')})`);

  /* 3 — the folds shut, each with its one line, each opening */
  const folds = await page.locator('.vid-study .fold').evaluateAll(es => es.map(e => ({ id: e.getAttribute('data-fold'), open: e.classList.contains('is-open'), t: e.querySelector('.fold-t')?.textContent?.trim(), s: e.querySelector('.fold-s')?.textContent?.trim() })).filter(f => f.id?.startsWith('vid-')));
  ok(JSON.stringify(folds.map(f => f.id)) === JSON.stringify(FOLDS) && folds.every(f => !f.open && f.t && f.s), `3 ${tag}: ${folds.map(f => `${f.t} (${f.s?.slice(0, 50)}…)`).join(' · ')} — every one shut, with its one line`, JSON.stringify(folds));
  ok((await page.locator(Object.values(INSIDE).join(', ')).count()) === 0, `3 ${tag}: shut means shut — none of their contents drawn on arrival`);
  heights[tag] = await page.evaluate(() => document.documentElement.scrollHeight);
  if (tag === 'phone') {
    ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), '6 phone: nothing off the side');
    const presses = await page.locator('.vid-study .fold-toggle, .vid-job .btn-primary, .vfit-plan summary, .vfit-fine summary').evaluateAll(es => es.map(e => Math.round(e.getBoundingClientRect().height)));
    ok(Math.min(...presses) >= 44, `6 phone: the folds, the next step and the one-line details ${Math.min(...presses)} px or more (${presses.length})`, presses.join(','));
  }
  for (const id of FOLDS) {
    await page.locator(`[data-fold="${id}"] .fold-toggle`).click(); await page.waitForTimeout(250);
    ok((await page.locator(`[data-fold="${id}"].is-open ${INSIDE[id]}`).count()) > 0, `3 ${tag}: ${id} opens to its contents (${INSIDE[id]})`);
    await page.locator(`[data-fold="${id}"] .fold-toggle`).click(); await page.waitForTimeout(150);
  }

  /* 4 — the next step opens Every event and goes there */
  await page.locator('.vid-job .btn-primary').click(); await page.waitForTimeout(900);
  const review = await page.locator('section[aria-label="Review"]').evaluate(e => Math.round(e.getBoundingClientRect().top));
  const nev = await page.evaluate(async id => ((await (await import('/src/db.ts')).getStudy(id)).facts.vevents ?? []).length, sd.videoStudyId);
  ok((await page.locator('[data-fold="vid-events"].is-open .vid-ev').count()) === nev && review >= -5 && review < vh / 2, `4 ${tag}: Review the 2 still to review opens every event (${nev}) and goes there (${review} px from the top)`);
  if (tag === 'phone') ok(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), '6 phone: nothing off the side with every event open');

  ok(!errs.length, `${tag}: no console error`, errs.join(' | '));
  await ctx.close();
}
await browser.close();
/* 5 — the heights */
console.log(`HEIGHTS  a video study: desk ${heights.desk} px · phone ${heights.phone} px (before, 10 November: desk 5,078 · phone 11,487)`);
ok(heights.desk < 5078 && heights.phone < 11487, '5 shorter than before at a desk and on a phone');
console.log(fail ? `\n${fail} FAILED` : '\nALL PASS');
process.exit(fail ? 1 : 0);
