/* ACCEPTANCE — CAN THIS PHONE FILM A LONG STUDY? (screens/VideoCheckScreen;
 * docs/VIDEO-FEASIBILITY.md, the phone).
 *
 * Driven in a real browser on Chromium's own fake camera (a moving picture
 * with a counter), from Video studies, the way a site lead would before a
 * long study:
 *
 *   1  Video studies offers the check; it opens on its question
 *   2  what the phone offers, four lines, each as lib/video/phoneCheck says
 *      them from the browser's own answers; the lengths, two minutes first
 *   3  started: the camera's picture with its thirds, the time, the reading's
 *      rate, the camera's word once it has looked
 *   4  the app out of sight for three seconds, said as it runs — headless
 *      Chromium never hides a page (a tab in front, the window minimised and
 *      the page frozen were all tried, 19 October), so the event a phone fires
 *      when its screen goes off is fired here, the page answering hidden for
 *      those seconds; what the test does with it is what is checked
 *   5  a clip written at 30 s and played on its own, said as it runs
 *   6  stopped after a minute: the answer and a line an ability, every word as
 *      the module says it from the results the page copies (the JSON read
 *      back); the time out of sight counted and not held against the reading
 *   7  the last clip plays on the page; the minute's row; what was saved on
 *      the phone deleted
 *   8  Copy results: the words and every figure, without the places
 *   9  Run it again: back to the lengths
 *  10  a phone: nothing off the side, before and after
 *   and no console error anywhere. */
import pkg from 'playwright';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 700)}` : ''}`); if (!c) fail++; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, permissions: ['camera', 'clipboard-read', 'clipboard-write'] });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
await ctx.route('**://*.supabase.co/**', r => r.abort());
const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const text = async sel => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ').trim();
const fits = async () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
/* a line as "what | says", from its two parts */
const LINES = sel => [...document.querySelectorAll(sel)].map(li => `${li.querySelector('b')?.textContent.trim()} | ${li.querySelector('span')?.textContent.replace(/\s+/g, ' ').trim()}`);

/* 1 — from Video studies */
await page.goto(`${BASE}/#/video`); await page.waitForTimeout(1800);
const door = page.locator('.vck-door button', { hasText: 'Can this phone film a long study?' });
ok(await door.count() === 1, '1 Video studies offers “Can this phone film a long study?”');
await door.click(); await page.waitForTimeout(1500);
ok(/#\/video-check$/.test(page.url()) && (await text('h1')) === 'Can this phone film a long study?', '1 it opens on its question', page.url());

/* 2 — what the phone offers, as the module says it */
await page.waitForSelector('.vck-offers .vck-line', { timeout: 8000 });
const offered = await page.evaluate(async src => {
  const { phoneOffers } = await import('/src/lib/video/phoneRun.ts');
  const { offersSay } = await import('/src/lib/video/phoneCheck.ts');
  const { pickMimeType } = await import('/src/ui/VideoRecorder.tsx');
  const o = await phoneOffers(pickMimeType());
  return { want: offersSay(o).map(l => `${l.what} | ${l.says}`), got: (eval(src))('.vck-offers .vck-line') };
}, LINES.toString());
ok(offered.got.length === 4 && offered.want.every((w, i) => offered.got[i] === w), '2 what the phone offers — four lines, each as lib/video/phoneCheck says it', JSON.stringify(offered));
const lengths = await page.locator('.vck-len [role=radio]').allInnerTexts();
ok(lengths.join(' · ') === '2 minutes · 10 minutes · 30 minutes · 1 hour' && (await page.locator('.vck-len [aria-checked=true]').innerText()) === '2 minutes', '2 the lengths offered, two minutes chosen', lengths.join(' · '));
ok(await fits(), '10 a phone’s width aside, the desk page has nothing off the side');

/* 3 — started */
await page.getByRole('button', { name: 'Start the test' }).click();
await page.waitForFunction(() => { const v = document.querySelector('.vck-cam video'); return v && v.videoWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
const cam = await page.evaluate(() => { const v = document.querySelector('.vck-cam video'); return { w: v?.videoWidth ?? 0, h: v?.videoHeight ?? 0, thirds: document.querySelectorAll('.vck-thirds i').length }; });
ok(cam.w > 0 && cam.thirds === 3, '3 the camera’s picture on the page with its thirds', JSON.stringify(cam));
await page.waitForTimeout(4500);
const live1 = { time: await text('[data-live=time]'), rate: await text('[data-live=rate]'), steady: await text('[data-live=steady]') };
ok(/^0:0[3-9] of 2:00$/.test(live1.time), '3 the time, of the two minutes', live1.time);
ok(/^\d\.\d frames a second · \d+ ms each$/.test(live1.rate), '3 the reading’s rate as it runs', live1.rate);
ok(['Steady', 'Shaking', 'Moved', 'The light changed'].includes(live1.steady), '3 the camera’s word once it has looked', live1.steady);

/* 4 — out of sight for three seconds (see the head: the event a phone fires, fired here) */
await page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await page.waitForTimeout(3200);
await page.evaluate(() => { delete document.visibilityState; delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
await page.waitForTimeout(1600);
ok(/out of sight once/.test(await text('[data-live=screen]')), '4 the app put out of sight, said as it runs', await text('[data-live=screen]'));

/* 5 — a clip at 30 s, played on its own */
await page.waitForFunction(() => /written/.test(document.querySelector('[data-live=clips]')?.textContent ?? ''), null, { timeout: 40000 }).catch(() => {});
const clips1 = await text('[data-live=clips]');
ok(/^1 written, it plays on its own$/.test(clips1), '5 a clip of 30 s written and played on its own, said as it runs', clips1);

/* 6 — stopped after a minute */
await page.waitForFunction(() => /^1:0[2-9]/.test(document.querySelector('[data-live=time]')?.textContent ?? ''), null, { timeout: 40000 }).catch(() => {});
await page.getByRole('button', { name: 'Stop the test' }).click();
await page.waitForSelector('[data-headline]', { timeout: 20000 }).catch(() => {});
await page.getByRole('button', { name: 'Copy results' }).click();
await page.waitForTimeout(500);
const copied = await page.evaluate(() => navigator.clipboard.readText());
const json = (() => { try { return JSON.parse(copied.slice(copied.indexOf('\n{') + 1)); } catch { return null; } })();
ok(!!json, '8 Copy results: the words, then every figure', copied.slice(0, 300));
const said = await page.evaluate(async ([j, src]) => {
  const { phoneSays } = await import('/src/lib/video/phoneCheck.ts');
  const s = phoneSays(j.offers, { ...j.run, marks: [] }, j.steady);
  return {
    want: { headline: s.headline, ran: s.ran, lines: s.lines.map(l => `${l.what} | ${l.says}`), tones: s.lines.map(l => l.tone), next: s.next ?? '' },
    got: { headline: document.querySelector('[data-headline]')?.textContent.trim(), ran: document.querySelector('.vck-ran')?.textContent.trim(), lines: (eval(src))('.vck-done .vck-line'), tones: [...document.querySelectorAll('.vck-done .vck-line')].map(li => li.className.match(/is-(\w)/)?.[1]), next: document.querySelector('.vck-next')?.textContent.trim() ?? '' },
  };
}, [json ?? { offers: {}, run: { marks: [], clips: [], hidden: [], wake: { lost: [] }, minutes: [] }, steady: {} }, LINES.toString()]);
ok(said.got.headline === said.want.headline, '6 the answer, as the module says it', JSON.stringify([said.got.headline, said.want.headline]));
ok(said.got.ran.startsWith(said.want.ran) && /^1:0\d of the 2 minutes asked — stopped/.test(said.got.ran), '6 how long it ran, stopped part way', said.got.ran);
ok(said.got.lines.length === 7 && said.want.lines.every((w, i) => said.got.lines[i] === w) && said.want.tones.every((t, i) => said.got.tones[i] === t), '6 a line an ability, every word and its colour as lib/video/phoneCheck says them', JSON.stringify({ got: said.got.lines, want: said.want.lines }));
ok(said.got.next === said.want.next && /^Run the 1-hour test/.test(said.got.next), '6 and that a minute is not an hour', said.got.next);
const run = json?.run ?? {};
ok(run.hidden?.length === 1 && run.hidden[0].sec >= 2.5 && /^The screen and the app \| The app went out of sight once — at 0:\d\d for \d s/.test(said.got.lines[3] ?? ''), '6 the time out of sight counted once, with its length', JSON.stringify(run.hidden));
ok(said.got.tones[0] === 'g' && /^Reading as it films \| Read as it filmed: /.test(said.got.lines[0] ?? ''), '6 the reading kept up — the time out of sight not held against it', said.got.lines[0]);
ok(run.clips?.length >= 2 && run.clips.every(c => c.plays) && run.clips[0].duration >= 29 && run.clips[0].duration <= 33, '6 every clip played on its own, the first some 31 s', JSON.stringify(run.clips));
ok(run.saveMaxMs > 0 && /^Saving as it goes \| The reading so far was saved on the phone every 10 seconds, in \d+ ms at the most\.$/.test(said.got.lines[6] ?? ''), '6 the reading saved on the phone as it went', said.got.lines[6]);
ok(json?.run?.marks === undefined && json?.steady?.windows > 20, '8 the figures carry the camera’s summary, not its places', JSON.stringify(json?.steady ?? {}).slice(0, 200));

/* 7 — the last clip, the minute, nothing kept */
const clip = await page.evaluate(async () => {
  const v = document.querySelector('.vck-clip video');
  if (!v) return { here: false };
  await new Promise(r => { if (v.readyState >= 2) r(); else { v.onloadeddata = r; setTimeout(r, 6000); } });
  return { here: true, ready: v.readyState, src: v.src.startsWith('blob:') };
});
ok(clip.here && clip.ready >= 2 && clip.src, '7 the last clip plays on the page', JSON.stringify(clip));
const minute = await page.locator('.vck-minutes tbody tr').allInnerTexts();
ok(minute.length === 1 && /^1\s+\d+\s+[\d.]+ ms\s+(—|\d+%)\s+yes$/.test(minute[0].replace(/\t/g, ' ')), '7 the minute’s row — frames read, each, the battery, out of sight', JSON.stringify(minute));
const kept = await page.evaluate(async () => (await indexedDB.databases?.() ?? []).map(d => d.name));
ok(!kept.includes('fl-phone-check'), '7 what was saved on the phone deleted when it ended', JSON.stringify(kept));
ok(/Copied — paste it into a message/.test(await text('.vck-copied')), '8 Copy results said copied', await text('.vck-copied'));

/* 10 — a phone, on the results */
await page.setViewportSize({ width: 390, height: 844 }); await page.waitForTimeout(600);
ok(await fits(), '10 a phone: the results with nothing off the side');

/* 9 — again */
await page.getByRole('button', { name: 'Run it again' }).click(); await page.waitForTimeout(400);
ok(await page.locator('.vck-len [role=radio]').count() === 4 && await page.getByRole('button', { name: 'Start the test' }).count() === 1, '9 Run it again: back to the lengths and Start');
ok(await fits(), '10 a phone: the lengths with nothing off the side');

ok(!errs.length, 'no console error anywhere', errs.slice(0, 3).join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nALL PASSED');
process.exit(fail ? 1 : 0);
