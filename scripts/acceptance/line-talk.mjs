/* ACCEPTANCE — LINE TALK: TALK INTO THE BOX, AS IN A CHAT (docs/LINE-TALK.md;
 * Rowland, 20 October: "speaking into his phone, the AI listening to
 * everything … it remembers everything like Claude chat"; "Use the phone's own
 * speech recognition instead of Gemini"; and 21 October: "I see my words come
 * up on the interface. I simply press send … a version of ChatGPT or a
 * version of Claude, as I am doing now").
 *
 * In a real browser, from an empty device, with the phone's speech
 * recognition played by the script — a recogniser that behaves as a phone's
 * does (words forming, then final; sessions it ends by itself; no signal; a
 * microphone it cannot have; a refusal):
 *
 *   1  opened from the line's page; started on the line, named for it and
 *      the day; nothing said yet; the box: Photo, the words, the microphone,
 *      Send
 *   2  the microphone tapped: listening in British English; the words come up
 *      in the box as they are said and nothing goes into the talk; Send —
 *      the words into the talk as said, the box empty, Line Talk's answer
 *   3  nothing heard for a few seconds — the keyboard's own microphone said,
 *      still listening, gone once words come; talked, stopped, put right in
 *      the box, then sent — the words as sent; a session the phone ended by
 *      itself, both sentences in the box
 *   4  typed into while listening: listening stops, the box as typed; the
 *      microphone again — the words after what is there; a photo, a line
 *      typed and sent as typed
 *   5  corrected after it was sent — what was sent kept beside it, Undo;
 *      struck, kept and left out, brought back
 *   6  no signal: said with the way round it, listening off, the words kept
 *      in the box; typed and sent, kept
 *   7  out of sight while listening: listening stops, said; the words in the
 *      box; the microphone again carries on after them
 *   8  the microphone taken by another app, and a browser not allowed to
 *      listen: each said with the keyboard's own microphone as the way round
 *   9  a browser with no speech recognition: the microphone opens the box for
 *      the keyboard's microphone, and says so; what it writes sent as typed
 *  10  reloaded while talking: the words in the box kept, and sent as said;
 *      the conversation as it was left; nothing recorded, ever
 *  11  the line's page and every Line Talk saying it; the phone — the box on
 *      the phone's own bar, long words kept inside it
 *   and no console error anywhere, and nothing sent to a voice service. */
import pkg from 'playwright';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const { chromium } = pkg;

const BASE = process.env.SMOKE_BASE ?? 'http://127.0.0.1:5191';
const REF = process.env.SMOKE_SUPABASE_REF ?? 'testproj';
const SESSION = { access_token: 'smoke', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 31_536_000, refresh_token: 'smoke',
  user: { id: '11111111-1111-1111-1111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'smoke@example.com', app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() } };
const IGNORE = /Supabase|net::ERR|Failed to fetch|ERR_FAILED|aborted|Download the React DevTools|WebSocket/i;
/* the way round it wherever the browser will not listen — lib/hearing KEYBOARD_MIC, word for word */
const KEYBOARD_MIC = 'Tap the box, then the microphone on your keyboard, and talk — your words come up in the box the same way. Then press Send.';

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, permissions: ['microphone'] });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
/* nothing is recorded: every microphone the app opens to record is counted, across reloads, and must stay none */
let micsOpened = 0;
await ctx.exposeBinding('__micOpened', () => { micsOpened++; });
await ctx.addInitScript(() => {
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) return;
  const real = md.getUserMedia.bind(md);
  md.getUserMedia = async c => { window.__micOpened?.(); return real(c); };
});
/* THE PHONE'S SPEECH RECOGNITION, played by the script: words said into it (__say), forming or final; a session it
   ends by itself (__endSession); no signal (offline); the microphone another app holds (__earBusy); a refusal (__earRefused) */
await ctx.addInitScript(() => {
  const res = (t, isFinal) => ({ 0: { transcript: t }, length: 1, isFinal });
  class FakeRec {
    constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; this.onresult = null; this.onerror = null; this.onend = null; this.running = false; this.results = []; window.__recs = (window.__recs ?? 0) + 1; }
    start() {
      window.__earLang = this.lang;
      window.__earContinuous = this.continuous;
      const no = code => setTimeout(() => { this.onerror?.({ error: code }); this.onend?.(); }, 20);
      if (!navigator.onLine) return no('network');
      if (window.__earBusy) return no('audio-capture');
      if (window.__earRefused) return no('service-not-allowed');
      this.running = true;
      window.__ear = this;
    }
    stop() {
      if (!this.running) { setTimeout(() => this.onend?.(), 0); return; }
      this.running = false;
      const last = this.results[this.results.length - 1];
      if (last && !last.isFinal) { this.results[this.results.length - 1] = res(last[0].transcript, true); this.onresult?.({ results: [...this.results] }); }
      setTimeout(() => this.onend?.(), 30);
    }
    abort() { this.running = false; setTimeout(() => this.onend?.(), 0); }
  }
  window.__FakeRec = FakeRec;
  window.SpeechRecognition = FakeRec;
  window.webkitSpeechRecognition = FakeRec;
  window.__say = (text, final = true) => {
    const r = window.__ear;
    if (!r?.running) return false;
    if (r.results.length && !r.results[r.results.length - 1].isFinal) r.results.pop();
    r.results.push(res(text, final));
    r.onresult?.({ results: [...r.results] });
    return true;
  };
  window.__endSession = () => { const r = window.__ear; if (!r?.running) return false; r.running = false; r.onend?.(); return true; };
});
await ctx.route('**://*.supabase.co/**', r => r.abort());
/* no voice service hears anything: anything sent to one is counted, and must stay none */
let voiceAsked = 0;
await ctx.route('**/api/voice', r => { voiceAsked++; return r.fulfill({ status: 410, contentType: 'application/json', body: '{}' }); });
/* LINE TALK'S GATEWAY, answered by the script (acceptance/line-talk-assistant.mjs proves the asking) */
const asked = [];
await ctx.route('**/functions/v1/assist', r => { asked.push(r.request().postDataJSON()); return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
  body: JSON.stringify({ ok: true, answer: { reply: `Noted (${asked.length}).` }, unsure: [], model: 'test-model' }) }); });

const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const settle = async (ms = 300) => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(ms); };
const waitFor = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await page.waitForTimeout(150); } return false; };
const turns = () => page.locator('.tk-turn');
const kinds = () => turns().evaluateAll(els => els.map(e => e.getAttribute('data-kind')));
const mine = () => turns().evaluateAll(els => els.filter(e => e.getAttribute('data-kind') !== 'reply').map(e => ({ kind: e.getAttribute('data-kind'), words: e.querySelector('.tk-words')?.textContent?.trim() ?? '' })));
const summary = async () => (await page.locator('.tk-sum').innerText()).trim();
/* what the page reads as it stands — never waited for */
const said = () => page.evaluate(() => document.querySelector('.tk-said')?.textContent?.trim() ?? '');
const boxText = () => page.evaluate(() => document.querySelector('.tk-box')?.value ?? '');
const hint = () => page.evaluate(() => document.querySelector('.tk-hint')?.textContent?.trim() ?? '');
const mic = () => page.locator('.tk-bar .tk-mic');
const listening = () => page.evaluate(() => document.querySelector('.tk-mic')?.getAttribute('aria-pressed') === 'true');
const tapMic = async (hearing = true) => {
  await mic().click();
  if (hearing) await page.waitForFunction(() => window.__ear?.running, null, { timeout: 5000 }).catch(() => {});
};
const say = (text, final = true) => page.evaluate(([t, f]) => window.__say(t, f), [text, final]);
const send = () => page.locator('.tk-send').click();
const answers = () => page.locator('.tk-turn.is-reply .tk-ans').count();
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

/* 1 — opened from the line's page, started on the line; the box */
await page.goto(`${BASE}/#/lines/${lineId}`); await settle(1200);
const tile = page.locator('.pl-tool', { hasText: 'Line Talk' });
ok(await tile.count() === 1, '1 the line’s page offers Line Talk among its tools');
ok(/None yet/.test(await tile.innerText()), '1 none yet on the line', await tile.innerText());
await tile.click(); await settle(800);
ok(/#\/talk\?line=/.test(page.url()), '1 it opens Line Talk on the line', page.url());
ok(/Start a Line Talk on Line 7/.test(await page.locator('.tk-new .tk-start').innerText()), '1 Start a Line Talk on Line 7');
await page.locator('.tk-new .tk-start').click(); await settle(800);
const talkId = page.url().match(/#\/talk\/([^?]+)/)?.[1];
ok(!!talkId, '1 a talk started — its own page', page.url());
const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
ok((await page.locator('.ie-name, h1').first().innerText()).includes(`Line 7 — ${today}`), '1 named for its line and the day', await page.locator('.ie-name, h1').first().innerText());
ok(/^LINE TALK · Line 7 ›/.test(await page.locator('.pl-eyebrow').innerText()), '1 it says its line');
ok(await summary() === 'Nothing said yet.', '1 nothing said yet', await summary());
const order1 = await page.locator('.tk-type').evaluate(f => [...f.children].filter(e => !e.hidden).map(e => e.classList.contains('tk-photo') ? 'photo' : e.classList.contains('tk-box') ? 'box' : e.classList.contains('tk-mic') ? 'mic' : e.classList.contains('tk-send') ? 'send' : e.tagName));
ok(JSON.stringify(order1) === '["photo","box","mic","send"]', '1 the box as a chat’s: Photo, the words, the microphone, Send', JSON.stringify(order1));
ok(await mic().getAttribute('aria-label') === 'Talk into the box' && (await page.locator('.tk-send').innerText()).trim() === 'Send' && await page.locator('.tk-send').isDisabled(), '1 the microphone to talk; Send, nothing to send yet');
ok(await hint() === 'Tap the microphone and talk, or type — add a photo whenever it helps.', '1 it says how', await hint());

/* 2 — the microphone: the words come up in the box as they are said; Send */
await tapMic();
ok(await page.evaluate(() => window.__earLang) === 'en-GB' && await page.evaluate(() => window.__earContinuous) === true, '2 the phone asked to write down British English, continuously');
ok(await listening() && await mic().getAttribute('aria-label') === 'Stop listening', '2 listening — the microphone pressed in, tapped again to stop');
ok(/^Listening — your words come up in the box as you talk\. Put anything right, then Send\.$/.test(await hint()), '2 it says so', await hint());
await say('starting at the bagger it is running', false);
ok(await waitFor(async () => await boxText() === 'starting at the bagger it is running'), '2 the words in the box as they are said', await boxText());
await say('starting at the bagger it is running at about sixty a minute');
const W1 = 'Starting at the bagger it is running at about sixty a minute.';
ok(await waitFor(async () => await boxText() === W1), '2 written as a sentence once the phone is sure of it', await boxText());
await say('the film is wandering', false);
ok(await waitFor(async () => await boxText() === `${W1} the film is wandering`), '2 the next words after it', await boxText());
ok((await mine()).length === 0, '2 nothing in the talk until it is sent');
ok(!(await page.locator('.tk-send').isDisabled()), '2 Send, while it listens');
await send();
const W2 = `${W1} The film is wandering.`;
ok(await waitFor(async () => JSON.stringify(await mine()) === JSON.stringify([{ kind: 'said', words: W2 }])), '2 Send: the words into the talk, as said — the last words finished first', JSON.stringify(await mine()));
ok(await boxText() === '' && !(await listening()), '2 the box empty, listening stopped', await boxText());
ok(await waitFor(async () => await answers() === 1), '2 and Line Talk’s answer');
ok(asked[0]?.turns?.[0]?.kind === 'said' && asked[0].turns[0].text === W2, '2 asked with what was said, marked as said', JSON.stringify(asked[0]?.turns));
ok(/^1 piece said · 1 answer\.$/.test(await summary()), '2 the talk in a line', await summary());

/* 3 — nothing heard for a few seconds (a phone whose browser will not hear says nothing at all): the way round it said, still listening; then talked, stopped, put right in the box, sent; a session the phone ended by itself */
await tapMic();
await page.waitForTimeout(6600);
ok(await said() === `Nothing heard yet — keep talking. If your words do not come up, this phone's browser is not listening: ${KEYBOARD_MIC}`, '3 nothing heard for a few seconds: the keyboard’s own microphone said', await said());
ok(await listening(), '3 and still listening');
await say('the checkweigher is kicking out the odd bag');
ok(await waitFor(async () => await said() === ''), '3 words heard: the message gone', await said());
const recs3 = await page.evaluate(() => window.__recs);
await page.evaluate(() => window.__endSession());
ok(await waitFor(async () => await page.evaluate(n => window.__recs > n && window.__ear?.running, recs3), 8000), '3 the phone ended its session — another opened by itself');
await say('the guide rail at the infeed looks bent');
const W3 = 'The checkweigher is kicking out the odd bag. The guide rail at the infeed looks bent.';
ok(await waitFor(async () => await boxText() === W3), '3 both sentences in the box', await boxText());
await mic().click();
ok(await waitFor(async () => !(await listening())) && await boxText() === W3, '3 stopped — the words stay in the box', await boxText());
ok((await page.locator('.tk-send').innerText()).trim() === 'Send' && await hint() === 'Send, and Line Talk answers.', '3 Send, said', await hint());
const W3b = 'The checkweigher is kicking out the odd bag. The guide rail at the infeed looks bent — Ishida to check.';
await page.locator('.tk-box').fill(W3b);
await send();
ok(await waitFor(async () => (await mine()).at(-1)?.words === W3b && (await mine()).at(-1)?.kind === 'said'), '3 put right in the box, then sent: the words as sent, as said', JSON.stringify((await mine()).at(-1)));
ok(await waitFor(async () => await answers() === 2), '3 answered');

/* 4 — typed into while listening; the microphone again; a photo; typed */
await tapMic();
await say('the case packer is', false);
ok(await waitFor(async () => await boxText() === 'the case packer is'), '4 the words as they are said', await boxText());
await page.locator('.tk-box').pressSequentially(' starved');
ok(await waitFor(async () => !(await listening())), '4 typed into while listening: listening stops');
ok(await boxText() === 'the case packer is starved', '4 the box as typed', await boxText());
await page.waitForTimeout(400);
ok(await boxText() === 'the case packer is starved', '4 nothing written over it after', await boxText());
await tapMic();
await say('of cases since ten');
ok(await waitFor(async () => await boxText() === 'the case packer is starved Of cases since ten.'), '4 the microphone again — the words after what is there', await boxText());
await send();
ok(await waitFor(async () => (await mine()).at(-1)?.words === 'the case packer is starved Of cases since ten.' && (await mine()).at(-1)?.kind === 'said'), '4 sent as said', JSON.stringify((await mine()).at(-1)));
ok(await waitFor(async () => await answers() === 3), '4 answered');
await page.locator('.tk-bar input[type=file]').setInputFiles(photo);
ok(await waitFor(async () => await page.locator('.tk-turn[data-kind=photo] img.tk-photo-i').count() === 1), '4 the photo in the conversation where it was taken');
ok(await hint() === 'Send asks Line Talk about what you have added since its last answer.', '4 Send, for the photo', await hint());
await page.locator('.tk-box').fill('Ask Dave about the spare belt.');
await send();
ok(await waitFor(async () => (await mine()).at(-1)?.words === 'Ask Dave about the spare belt.' && (await mine()).at(-1)?.kind === 'typed'), '4 a line typed — sent as typed');
ok(await waitFor(async () => await answers() === 4), '4 answered');
ok(JSON.stringify(await kinds()) === JSON.stringify(['said', 'reply', 'said', 'reply', 'said', 'reply', 'photo', 'typed', 'reply']), '4 every turn in the order it happened', JSON.stringify(await kinds()));

/* 5 — corrected after it was sent; struck */
const first = turns().nth(0);
await first.locator('button', { hasText: 'Correct' }).click();
await first.locator('.tk-fix textarea').fill('Starting at the bagger — running at about 62 a minute. The film is wandering.');
await first.locator('.tk-fix button[type=submit]').click(); await settle();
ok((await first.locator('.tk-words').innerText()).trim() === 'Starting at the bagger — running at about 62 a minute. The film is wandering.', '5 the words as corrected');
ok((await first.locator('.tk-heard').innerText()).trim() === `As heard: ${W2}`, '5 what was sent kept beside them', await first.locator('.tk-heard').innerText().catch(() => ''));
ok(/Corrected — what was heard is kept beside it/.test(await page.locator('body').innerText()), '5 said, with Undo');
const typed = page.locator('.tk-turn[data-kind=typed]');
await typed.locator('button', { hasText: 'Strike' }).click(); await settle();
ok(/is-struck/.test(await typed.getAttribute('class')) && /struck/.test(await typed.locator('.tk-meta').innerText()), '5 a turn struck — still there, marked struck');
ok(!/typed/.test(await summary()), '5 and left out of the talk', await summary());
await typed.locator('button', { hasText: 'Bring back' }).click(); await settle();
ok(/1 typed/.test(await summary()), '5 brought back', await summary());

/* 6 — no signal */
await page.locator('.tk-box').fill('The wrapper film');
await ctx.setOffline(true);
await tapMic(false);
ok(await waitFor(async () => /^No signal — this phone needs it to write down speech\. What you said is in the box; type the rest, or tap the microphone again when the signal is back\.$/.test(await said())), '6 no signal, said with the way round it', await said());
ok(await waitFor(async () => !(await listening())), '6 listening off');
ok(await boxText() === 'The wrapper film', '6 what was in the box kept', await boxText());
await page.locator('.tk-box').fill('The wrapper film is wandering to the left.');
const n6 = (await mine()).length;
await send();
ok(await waitFor(async () => (await mine()).length === n6 + 1 && (await mine()).at(-1)?.words === 'The wrapper film is wandering to the left.'), '6 typed and sent with no signal — kept in the talk');
ok(await boxText() === '', '6 the box empty');
await ctx.setOffline(false);
await page.evaluate(() => window.dispatchEvent(new Event('online')));
ok(await waitFor(async () => await answers() === 5), '6 answered when the signal is back');

/* 7 — out of sight while listening */
await tapMic();
ok(await said() === '', '7 the message gone with the next tap', await said());
await say('the shrink tunnel is running hot');
ok(await waitFor(async () => await boxText() === 'The shrink tunnel is running hot.'), '7 the words in the box', await boxText());
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
ok(await waitFor(async () => !(await listening())), '7 out of sight: listening stops');
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
ok(await said() === 'Listening stopped when Faultline went out of sight — what you said is in the box. Tap the microphone to carry on.', '7 said', await said());
ok(await boxText() === 'The shrink tunnel is running hot.', '7 the words in the box kept', await boxText());
await tapMic();
await say('back at the tunnel the temperature has come down');
ok(await waitFor(async () => await boxText() === 'The shrink tunnel is running hot. Back at the tunnel the temperature has come down.'), '7 the microphone again carries on after them', await boxText());
await send();
ok(await waitFor(async () => (await mine()).at(-1)?.words === 'The shrink tunnel is running hot. Back at the tunnel the temperature has come down.'), '7 sent, the words either side');
ok(await waitFor(async () => await answers() === 6), '7 answered');

/* 8 — the microphone another app holds; a browser not allowed to listen */
await page.evaluate(() => { window.__earBusy = true; });
await tapMic(false);
ok(await waitFor(async () => await said() === `Another app has the microphone. Close it and tap the microphone again — or: ${KEYBOARD_MIC}`), '8 the microphone taken: said, with the keyboard’s own microphone', await said());
ok(await waitFor(async () => !(await listening())), '8 listening off');
await page.evaluate(() => { window.__earBusy = false; window.__earRefused = true; });
await tapMic(false);
ok(await waitFor(async () => (await said()).startsWith(`This browser was not allowed to listen. ${KEYBOARD_MIC}`) && /Siri & Dictation must be on/.test(await said())), '8 not allowed to listen: said, the keyboard’s microphone, and how to allow it', await said());
await page.evaluate(() => { window.__earRefused = false; });

/* 9 — a browser with no speech recognition: the keyboard's own microphone */
await page.evaluate(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
await page.locator('.tk-turns').click({ position: { x: 5, y: 5 } }).catch(() => {});
await mic().click();
ok(await said() === `This browser does not write down speech itself. ${KEYBOARD_MIC}`, '9 said: the keyboard’s own microphone', await said());
ok(await page.evaluate(() => document.activeElement?.classList.contains('tk-box')), '9 the box opened for it — the keyboard up');
ok(!(await listening()), '9 not listening itself');
await page.keyboard.insertText('The labeller is out of labels.');
ok(await boxText() === 'The labeller is out of labels.', '9 what the keyboard writes in the box', await boxText());
await send();
ok(await waitFor(async () => (await mine()).at(-1)?.words === 'The labeller is out of labels.'), '9 sent');
ok(await waitFor(async () => await answers() === 7), '9 answered');
await page.evaluate(() => { window.SpeechRecognition = window.__FakeRec; window.webkitSpeechRecognition = window.__FakeRec; });

/* 10 — reloaded while talking */
await tapMic();
await say('the sealer temperature reads one eighty');
ok(await waitFor(async () => await boxText() === 'The sealer temperature reads one eighty.'), '10 talking', await boxText());
const kept = await mine();
const sumKept = await summary();
await page.reload(); await settle(1500);
ok(JSON.stringify(await mine()) === JSON.stringify(kept), '10 reloaded: the conversation as it was left', JSON.stringify(await mine()));
ok(await summary() === sumKept, '10 what was said, the same', `${await summary()} | ${sumKept}`);
ok(await boxText() === 'The sealer temperature reads one eighty.', '10 the words in the box kept', await boxText());
await send();
ok(await waitFor(async () => (await mine()).at(-1)?.words === 'The sealer temperature reads one eighty.' && (await mine()).at(-1)?.kind === 'said'), '10 and sent as said', JSON.stringify((await mine()).at(-1)));
ok(await waitFor(async () => await answers() === 8), '10 answered');
await page.reload(); await settle(1200);
ok(await boxText() === '', '10 sent: the box empty after a reload too', await boxText());
ok(micsOpened === 0 && await page.locator('audio').count() === 0, '10 nothing recorded — no microphone opened to record, no recording kept');
const n10 = (await mine()).filter(t => t.kind === 'said').length;
const typed10 = (await mine()).filter(t => t.kind === 'typed').length;

/* 11 — the line, every Line Talk, the phone */
await page.goto(`${BASE}/#/lines/${lineId}`); await settle(1200);
const t11 = await page.locator('.pl-tool', { hasText: 'Line Talk' }).innerText();
ok(/1 on this line/.test(t11) && new RegExp(`Line 7 — ${today}: ${n10} pieces said · 1 photo · ${typed10} typed · 8 answers`).test(t11), '11 the line’s page says its Line Talk', t11);
await page.goto(`${BASE}/#/talk`); await settle(800);
ok(/Tap the microphone and your words come up in the box as you speak; Send, and Line Talk answers\./.test(await page.locator('.pl-says').innerText()), '11 every Line Talk says how it works', await page.locator('.pl-says').innerText());
const row = await page.locator('.lt-row').first().innerText();
ok(new RegExp(`${n10} pieces said`).test(row) && /Line 7/.test(row), '11 every Line Talk lists it, with its line', row);
await page.setViewportSize({ width: 390, height: 780 });
await page.goto(`${BASE}/#/talk/${talkId}`); await settle(1200);
const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, '11 the phone: nothing off the side', `${wide}px`);
const bar = await page.locator('.tk-bar').boundingBox();
const foot = await page.locator('.nv-bar').boundingBox();
ok(!!bar && !!foot && bar.y + bar.height <= foot.y + 1 && bar.y + bar.height >= foot.y - 30, '11 the phone: the box in reach, on the phone’s own bar', JSON.stringify({ bar, foot }));
ok(await page.locator('.qs-fab').count() === 0 || !(await page.locator('.qs-fab').isVisible()), '11 the phone: nothing over the box');
const parts = await page.locator('.tk-type > :not([hidden])').evaluateAll(els => els.map(e => { const r = e.getBoundingClientRect(); return { c: e.className, l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width) }; }));
ok(parts.length === 4 && parts.every(p => p.l >= 0 && p.r <= 390) && parts.find(p => /tk-box/.test(p.c))?.w >= 150 && parts.filter(p => /tk-photo|tk-mic/.test(p.c)).every(p => p.w >= 44), '11 the phone: Photo, the box, the microphone and Send in one row, each big enough to tap', JSON.stringify(parts));
await tapMic();
await say('the words fit the phone as they are said and they keep on going past the width of the screen and on down the box');
const boxed = await page.locator('.tk-box').evaluate(e => ({ r: e.getBoundingClientRect().right, h: e.scrollHeight, top: e.scrollTop, ch: e.clientHeight }));
ok(boxed.r <= 391 && boxed.top + boxed.ch >= boxed.h - 2, '11 the phone: long words kept inside the box, the newest in sight', JSON.stringify(boxed));
await mic().click();

ok(voiceAsked === 0, 'nothing sent to a voice service', `${voiceAsked} requests`);
ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
