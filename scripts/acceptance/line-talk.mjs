/* ACCEPTANCE — LINE TALK, SLICE 1: RECORD AND KEEP (docs/LINE-TALK.md;
 * Rowland, 20 October: "speaking into his phone, the AI listening to
 * everything, allows pause, continue speaking, it remembers everything like
 * Claude chat").
 *
 * In a real browser, from an empty device, with Chromium's fake microphone
 * and the voice service answered by the script (what it was asked is read
 * back — the line, its machines and everything said before each piece):
 *
 *   1  opened from the line's page; started on the line, named for it and
 *      the day; nothing said yet
 *   2  talked, paused: the piece kept with its recording and heard into the
 *      conversation; asked with the line and its machines, nothing earlier
 *   3  a photo where it was taken; continued — the next piece heard with
 *      everything said before it; a line typed — and, since slice 2, Line
 *      Talk's answer to it after it (the gateway answered by the script;
 *      acceptance/line-talk-assistant.mjs proves the asking itself)
 *   4  corrected — the words as corrected, what was heard kept beside it,
 *      Undo; a turn struck, kept and left out, brought back
 *   5  a piece the service could not hear: why, the recording kept, Hear it
 *      again; a piece said with no signal waits, and is heard when the
 *      signal comes back
 *   6  a long stretch kept a minute at a time — two pieces, both heard
 *   7  the phone taking the microphone: what was said kept, and it says so
 *   8  reloaded: the talk as it was left, its recordings playable, carried on
 *   9  the line's page and every Line Talk saying it; the phone
 *   and no console error anywhere. */
import pkg from 'playwright';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
/* the voice service answering 400 is the script's own answer (5) */
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket|status of 400/i;

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, permissions: ['microphone'] });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
/* the microphone the app opened, so the script can play the phone taking it back (7) */
await ctx.addInitScript(() => {
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) return;
  const real = md.getUserMedia.bind(md);
  md.getUserMedia = async c => { const s = await real(c); window.__mics = [...(window.__mics ?? []), s]; return s; };
});
await ctx.route('**://*.supabase.co/**', r => r.abort());

/* THE VOICE SERVICE, answered by the script: each piece's words in turn, every request kept */
const asked = [];
const WORDS = [
  'Starting at the bagger, it is running at about sixty a minute.',
  'The checkweigher is kicking out the odd bag, the guide rail at the infeed looks bent.',
  'Same as the last one on the case packer.',
  'The wrapper film is wandering to the left.',
  'Second minute of the walk, the palletiser is waiting on cases.',
  'Back at the bagger, the jaws are clean now.',
  'That is the walk done.',
];
let nextWords = 0;
let refuseNext = false;
/* LINE TALK'S GATEWAY (slice 2), answered by the script: a typed line is answered */
await ctx.route('**/functions/v1/assist', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
  body: JSON.stringify({ ok: true, answer: { reply: 'Noted — Dave, and the spare belt.' }, unsure: [], model: 'claude-opus-5-5' }) }));
await ctx.route('**/api/voice', async r => {
  const body = r.request().postDataJSON();
  asked.push(body);
  if (refuseNext) { refuseNext = false; return r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'That could not be read. Try again.' }) }); }
  const said = WORDS[nextWords++] ?? 'More words.';
  return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ transcript: said.toLowerCase(), fields: { said } }) });
});

const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const settle = async (ms = 300) => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(ms); };
const turns = () => page.locator('.tk-turn');
const words = async () => (await page.locator('.tk-turn .tk-words').allInnerTexts()).map(s => s.trim());
const summary = async () => (await page.locator('.tk-sum').innerText()).trim();
const waitFor = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await page.waitForTimeout(150); } return false; };
const talk = async secs => {
  await page.locator('.tk-bar .tk-talk').click();
  await waitFor(async () => (await page.locator('.tk-bar .tk-talk').innerText()).startsWith('Pause'), 5000);
  await page.waitForTimeout(secs * 1000);
  await page.locator('.tk-bar .tk-talk').click();
};
const dir = mkdtempSync(join(tmpdir(), 'line-talk-'));
const photo = join(dir, 'infeed.png');
writeFileSync(photo, Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDK+mmyQAAAABJRU5ErkJggg==', 'base64'));

await page.goto(`${BASE}/#/room`); await page.waitForTimeout(2500);
const lineId = await page.evaluate(async () => {
  const db = await import('/src/db.ts');
  const ws = await db.createWorkspace('Line 7');
  const { addMachineToLine } = await import('/src/db/lineRecords.ts');
  await addMachineToLine(ws.id, 'Bagger', 'Ishida');
  await addMachineToLine(ws.id, 'Checkweigher', 'Ishida');
  return ws.id;
});

/* 1 — opened from the line's page, started on the line */
await page.goto(`${BASE}/#/lines/${lineId}`); await settle(1200);
const tile = page.locator('.pl-tool', { hasText: 'Line Talk' });
ok(await tile.count() === 1, 'the line’s page offers Line Talk among its tools');
ok(/None yet/.test(await tile.innerText()), 'none yet on the line', await tile.innerText());
await tile.click(); await settle(800);
ok(/#\/talk\?line=/.test(page.url()), 'it opens Line Talk on the line', page.url());
ok(/Start a Line Talk on Line 7/.test(await page.locator('.tk-new .tk-start').innerText()), 'Start a Line Talk on Line 7');
await page.locator('.tk-new .tk-start').click(); await settle(800);
const talkId = page.url().match(/#\/talk\/([^?]+)/)?.[1];
ok(!!talkId, 'a talk started — its own page', page.url());
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
ok((await page.locator('.ie-name, h1').first().innerText()).includes(`Line 7 — ${today}`), 'named for its line and the day', await page.locator('.ie-name, h1').first().innerText());
ok(/^LINE TALK · Line 7 ›/.test(await page.locator('.pl-eyebrow').innerText()), 'it says its line');
ok(await summary() === 'Nothing said yet.', 'nothing said yet', await summary());
ok((await page.locator('.tk-bar .tk-talk').innerText()).trim() === 'Talk', 'Talk, before anything is said');

/* 2 — talked, paused: kept and heard */
await talk(2.5);
ok(await waitFor(async () => (await words()).includes(WORDS[0])), 'the piece heard into the conversation', JSON.stringify(await words()));
ok(await page.locator('.tk-turn[data-kind=said] audio.tk-audio').first().getAttribute('src').then(s => !!s?.startsWith('blob:')), 'its recording kept with it, to play');
ok(asked[0]?.form === 'talk' && asked[0]?.context?.line === 'Line 7', 'heard as a Line Talk on Line 7', JSON.stringify(asked[0]?.context));
ok(JSON.stringify(asked[0]?.context?.machines ?? []).includes('Bagger') && JSON.stringify(asked[0]?.context?.machines ?? []).includes('Checkweigher'), 'with the line’s machines', JSON.stringify(asked[0]?.context?.machines));
ok(!asked[0]?.context?.earlier, 'nothing earlier for the first piece', asked[0]?.context?.earlier);
ok(typeof asked[0]?.audio === 'string' && asked[0].audio.length > 1000 && asked[0].mime === 'audio/wav', 'the recording sent as sound, not words');
ok(/^1 piece said, \d+ s\.$/.test(await summary()), 'the talk in a line', await summary());
ok((await page.locator('.tk-bar .tk-talk').innerText()).trim() === 'Continue', 'Continue, once something is said');

/* 3 — a photo, continued with all before it, typed */
await page.locator('.tk-bar input[type=file]').setInputFiles(photo);
ok(await waitFor(async () => await page.locator('.tk-turn[data-kind=photo] img.tk-photo-i').count() === 1), 'the photo in the conversation where it was taken');
await talk(2.2);
ok(await waitFor(async () => (await words()).includes(WORDS[1])), 'the next piece heard', JSON.stringify(await words()));
ok((asked[1]?.context?.earlier ?? '').includes(WORDS[0]) && (asked[1]?.context?.earlier ?? '').includes('[photo'), 'heard with everything said before it — the words and the photo', asked[1]?.context?.earlier);
await page.locator('.tk-type textarea').fill('Ask Dave about the spare belt.');
await page.locator('.tk-type button[type=submit]').click();
ok(await waitFor(async () => (await words()).includes('Ask Dave about the spare belt.')), 'a line typed into it');
ok(await waitFor(async () => /Noted — Dave, and the spare belt\./.test(await page.locator('.tk-turn.is-reply').innerText().catch(() => ''))), 'and Line Talk’s answer after it');
ok(JSON.stringify(await page.locator('.tk-turn').evaluateAll(els => els.map(e => e.getAttribute('data-kind')))) === JSON.stringify(['said', 'photo', 'said', 'typed', 'reply']), 'every turn in the order it happened');

/* 4 — corrected, struck */
const first = turns().nth(0);
await first.locator('button', { hasText: 'Correct' }).click();
await first.locator('.tk-fix textarea').fill('Starting at the bagger — running at about 62 a minute.');
await first.locator('.tk-fix button[type=submit]').click(); await settle();
ok((await first.locator('.tk-words').innerText()).trim() === 'Starting at the bagger — running at about 62 a minute.', 'the words as corrected');
ok((await first.locator('.tk-heard').innerText()).trim() === `As heard: ${WORDS[0]}`, 'what was heard kept beside them', await first.locator('.tk-heard').innerText().catch(() => ''));
ok(/Corrected — what was heard is kept beside it/.test(await page.locator('body').innerText()), 'said, with Undo');
const typed = page.locator('.tk-turn[data-kind=typed]');
await typed.locator('button', { hasText: 'Strike' }).click(); await settle();
ok(/is-struck/.test(await typed.getAttribute('class')) && /struck/.test(await typed.locator('.tk-meta').innerText()), 'a turn struck — still there, marked struck');
ok(!/typed/.test(await summary()), 'and left out of the talk', await summary());
await typed.locator('button', { hasText: 'Bring back' }).click(); await settle();
ok(/1 typed/.test(await summary()), 'brought back', await summary());

/* 5 — not heard, and no signal */
refuseNext = true;
await talk(1.8);
const failed = page.locator('.tk-turn .tk-fail');
ok(await waitFor(async () => await failed.count() === 1), 'a piece the service could not hear says so');
ok(/Not heard yet — That could not be read\. Try again\. The recording is kept\./.test(await failed.innerText()), 'why, and the recording kept', await failed.innerText().catch(() => ''));
ok(/1 could not be heard/.test(await summary()), 'the talk counts it', await summary());
await failed.locator('button', { hasText: 'Hear it again' }).click();
ok(await waitFor(async () => (await words()).includes(WORDS[2])), 'Hear it again — heard', JSON.stringify(await words()));
ok(await failed.count() === 0, 'no longer failed');
await ctx.setOffline(true);
const before = asked.length;
await talk(1.8);
await page.waitForTimeout(1500);
ok(await page.locator('.tk-turn .tk-wait').count() === 1 && /Being heard/.test(await page.locator('.tk-turn .tk-wait').innerText()), 'a piece said with no signal waits to be heard');
ok(/1 waiting to be heard/.test(await summary()), 'the talk says it waits', await summary());
ok(asked.length === before, 'nothing sent with no signal');
await ctx.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event('online')));
ok(await waitFor(async () => (await words()).includes(WORDS[3])), 'heard when the signal comes back', JSON.stringify(await words()));
ok(!/waiting/.test(await summary()), 'nothing waiting', await summary());

/* 6 — a long stretch, a minute at a time */
console.log('talking for a minute and a bit…');
const said6 = await turns().evaluateAll(els => els.filter(e => e.getAttribute('data-kind') === 'said').length);
await talk(63);
ok(await waitFor(async () => (await words()).includes(WORDS[5]), 20000), 'a long stretch kept as two pieces, both heard', JSON.stringify(await words()));
const said6After = await turns().evaluateAll(els => els.filter(e => e.getAttribute('data-kind') === 'said').length);
ok(said6After === said6 + 2, 'two pieces — a minute, then the rest', `${said6} → ${said6After}`);
ok((asked.at(-1)?.context?.earlier ?? '').includes(WORDS[4]), 'the second heard with the first before it', asked.at(-1)?.context?.earlier);
const firstMinute = await page.locator('.tk-turn[data-kind=said] .tk-meta').nth(said6).innerText();
ok(/1:0\d|0:59|1:00/.test(firstMinute), 'the first a minute long', firstMinute);

/* 7 — the phone takes the microphone */
await page.locator('.tk-bar .tk-talk').click();
await waitFor(async () => (await page.locator('.tk-bar .tk-talk').innerText()).startsWith('Pause'), 5000);
await page.waitForTimeout(1800);
await page.evaluate(() => { for (const s of window.__mics ?? []) for (const t of s.getAudioTracks()) { t.stop(); t.dispatchEvent(new Event('ended')); } });
ok(await waitFor(async () => /Recording stopped — the phone took the microphone/.test(await page.locator('.tk-said').innerText().catch(() => ''))), 'the phone taking the microphone said');
ok(await waitFor(async () => (await words()).includes(WORDS[6])), 'what was said up to then kept and heard', JSON.stringify(await words()));
ok((await page.locator('.tk-bar .tk-talk').innerText()).trim() === 'Continue', 'and Continue to carry on');

/* 8 — reloaded, carried on */
const kept = await words();
const sumKept = await summary();
await page.reload(); await settle(1500);
ok(JSON.stringify(await words()) === JSON.stringify(kept), 'reloaded: the conversation as it was left', JSON.stringify(await words()));
ok(await summary() === sumKept, 'what was said, the same', `${await summary()} | ${sumKept}`);
const audios = await page.locator('.tk-turn[data-kind=said] audio.tk-audio').evaluateAll(els => els.map(e => e.getAttribute('src') ?? ''));
ok(audios.length === 7 && audios.every(s => s.startsWith('blob:')), 'every recording kept and playable', JSON.stringify(audios.length));
const playable = await page.locator('.tk-turn[data-kind=said] audio.tk-audio').first().evaluate(a => new Promise(res => { a.preload = 'auto'; a.onloadedmetadata = () => res(true); a.onerror = () => res(false); a.load(); setTimeout(() => res(false), 4000); }));
ok(playable, 'a recording plays back');
ok(await page.locator('.tk-turn[data-kind=photo] img.tk-photo-i').count() === 1, 'the photo kept');
WORDS.push('After the reload, carrying on at the wrapper.');
await talk(1.8);
ok(await waitFor(async () => (await words()).includes(WORDS[7])), 'carried on after the reload, heard', JSON.stringify(await words()));
ok((asked.at(-1)?.context?.earlier ?? '').includes('running at about 62 a minute'), 'with the talk before it — as corrected', asked.at(-1)?.context?.earlier);

/* 9 — the line, every Line Talk, the phone */
await page.goto(`${BASE}/#/lines/${lineId}`); await settle(1200);
const t9 = await page.locator('.pl-tool', { hasText: 'Line Talk' }).innerText();
ok(/1 on this line/.test(t9) && new RegExp(`Line 7 — ${today}: 8 pieces said`).test(t9), 'the line’s page says its Line Talk', t9);
await page.goto(`${BASE}/#/talk`); await settle(800);
const row = await page.locator('.lt-row').first().innerText();
ok(/8 pieces said/.test(row) && /Line 7/.test(row), 'every Line Talk lists it, with its line', row);
await page.setViewportSize({ width: 390, height: 780 });
await page.goto(`${BASE}/#/talk/${talkId}`); await settle(1200);
const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, 'the phone: nothing off the side', `${wide}px`);
const bar = await page.locator('.tk-bar').boundingBox();
const foot = await page.locator('.nv-bar').boundingBox();
ok(!!bar && !!foot && bar.y + bar.height <= foot.y + 1 && bar.y + bar.height >= foot.y - 30, 'the phone: Talk, Photo and typing in reach, on the phone’s own bar', JSON.stringify({ bar, foot }));
ok(await page.locator('.qs-fab').count() === 0 || !(await page.locator('.qs-fab').isVisible()), 'the phone: nothing over Photo');
ok(await page.locator('.tk-bar .tk-talk').isVisible() && await page.locator('.tk-bar .tk-photo').isVisible(), 'the phone: Continue and Photo shown');

ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
