/* ACCEPTANCE — LINE TALK, SLICE 1: TALK AND KEEP, WRITTEN DOWN BY THE PHONE
 * (docs/LINE-TALK.md; Rowland, 20 October: "speaking into his phone, the AI
 * listening to everything, allows pause, continue speaking, it remembers
 * everything like Claude chat" — and the same day: "Use the phone's own
 * speech recognition instead of Gemini").
 *
 * In a real browser, from an empty device, with Chromium's fake microphone and
 * the phone's speech recognition played by the script — a recogniser that
 * behaves as a phone's does (words forming, then final; sessions it ends by
 * itself; no signal; a microphone it will not share):
 *
 *   1  opened from the line's page; started on the line, named for it and
 *      the day; nothing said yet
 *   2  talked: the words written as they are said, those still forming
 *      lighter, in British English; paused: the piece kept with its words and
 *      its recording
 *   3  a photo where it was taken; continued — a session the phone ended by
 *      itself, both its sentences kept in the one piece; a line typed — and
 *      Line Talk's answer after it (acceptance/line-talk-assistant.mjs proves
 *      the asking)
 *   4  corrected — the words as corrected, what was heard kept beside it,
 *      Undo; a turn struck, kept and left out, brought back
 *   5  no signal: said as it happens; the piece kept with its recording, not
 *      written down and why; the words typed over it with Correct
 *   6  a long stretch kept about a minute at a time — cut at a pause in what
 *      is said, never mid-sentence
 *   7  the phone taking the microphone: what was said kept, and it says so;
 *      Faultline out of sight — the phone's refusal then waited out, never
 *      taken as one, listening again on return and saying what was missed
 *   8  a phone that will not record and hear at once: the words kept, the
 *      recording off, said, and remembered — the next talk words only
 *   9  a phone whose recording comes out silent: the words kept, the
 *      recording not, said
 *  10  a browser with no speech recognition: recorded, not written down, said
 *  11  reloaded: the talk as it was left, its recordings playable, carried on
 *  12  the line's page and every Line Talk saying it; the phone
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

let fail = 0;
const ok = (c, what, detail) => { console.log(`${c ? 'PASS' : 'FAIL'}  ${what}${!c && detail ? ` — ${String(detail).slice(0, 600)}` : ''}`); if (!c) fail++; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 }, permissions: ['microphone'] });
await ctx.addInitScript(([k, s]) => { try { localStorage.setItem(k, JSON.stringify(s)); } catch { /* fine */ } }, [`sb-${REF}-auth-token`, SESSION]);
/* the microphones the app opened, so the script can play the phone taking one back (7) — or one the phone silences (9) */
await ctx.addInitScript(() => {
  const md = navigator.mediaDevices;
  if (!md?.getUserMedia) return;
  const real = md.getUserMedia.bind(md);
  md.getUserMedia = async c => {
    let s;
    if (window.__silentMic) {
      const ac = new AudioContext();
      const o = ac.createOscillator(), g = ac.createGain(), d = ac.createMediaStreamDestination();
      g.gain.value = 0;
      o.connect(g).connect(d);
      o.start();
      s = d.stream;
    } else s = await real(c);
    window.__mics = [...(window.__mics ?? []), s];
    return s;
  };
});
/* THE PHONE'S SPEECH RECOGNITION, played by the script: words said into it (__say), forming or final; a session it
   ends by itself (__endSession); no signal (offline); a microphone it will not share while another holds it (__earBusy) */
await ctx.addInitScript(() => {
  const res = (t, isFinal) => ({ 0: { transcript: t }, length: 1, isFinal });
  const micLive = () => (window.__mics ?? []).some(s => s.getAudioTracks().some(t => t.readyState === 'live'));
  class FakeRec {
    constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; this.onresult = null; this.onerror = null; this.onend = null; this.running = false; this.results = []; window.__recs = (window.__recs ?? 0) + 1; }
    start() {
      window.__earLang = this.lang;
      window.__earContinuous = this.continuous;
      const no = code => setTimeout(() => { this.onerror?.({ error: code }); this.onend?.(); }, 20);
      if (!navigator.onLine) return no('network');
      if (window.__earBusy && micLive()) return no('audio-capture');
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
/* no voice service hears anything any more: anything sent to one is counted, and must stay none */
let voiceAsked = 0;
await ctx.route('**/api/voice', r => { voiceAsked++; return r.fulfill({ status: 410, contentType: 'application/json', body: '{}' }); });
/* LINE TALK'S GATEWAY (slice 2), answered by the script: a typed line is answered */
await ctx.route('**/functions/v1/assist', r => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
  body: JSON.stringify({ ok: true, answer: { reply: 'Noted — Dave, and the spare belt.' }, unsure: [], model: 'test-model' }) }));

const page = await ctx.newPage();
const errs = [];
page.on('console', m => { if (m.type() === 'error' && !IGNORE.test(m.text())) errs.push(m.text()); });
page.on('pageerror', e => errs.push(e.message));
const settle = async (ms = 300) => { await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 5000 }).catch(() => {}); await page.waitForTimeout(ms); };
const turns = () => page.locator('.tk-turn');
const words = async () => (await page.locator('.tk-turn .tk-words').allInnerTexts()).map(s => s.trim());
const summary = async () => (await page.locator('.tk-sum').innerText()).trim();
/* what the talk says, read as it stands — never waited for */
const said = () => page.evaluate(() => document.querySelector('.tk-said')?.textContent?.trim() ?? '');
const waitFor = async (fn, ms = 15000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await fn()) return true; await page.waitForTimeout(150); } return false; };
const pieces = () => turns().evaluateAll(els => els.filter(e => e.getAttribute('data-kind') === 'said').map(e => ({ words: e.querySelector('.tk-words')?.textContent?.trim() ?? '', audio: !!e.querySelector('audio.tk-audio'), fail: e.querySelector('.tk-fail')?.textContent?.trim() ?? '', meta: e.querySelector('.tk-meta')?.textContent ?? '' })));
const startTalk = async (hearing = true) => {
  await page.locator('.tk-bar .tk-talk').click();
  await waitFor(async () => (await page.locator('.tk-bar .tk-talk').innerText()).startsWith('Pause'), 5000);
  if (hearing) await page.waitForFunction(() => window.__ear?.running, null, { timeout: 5000 }).catch(() => {});
};
const say = (text, final = true) => page.evaluate(([t, f]) => window.__say(t, f), [text, final]);
const pauseTalk = () => page.locator('.tk-bar .tk-talk').click();
const live = async () => (await page.locator('.tk-live').innerText().catch(() => '')).trim();
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
ok((await page.locator('.tk-bar .tk-talk').innerText()).trim() === 'Talk', '1 Talk, before anything is said');

/* 2 — talked: written as it is said; paused: kept with its recording */
await startTalk();
ok(await page.evaluate(() => window.__earLang) === 'en-GB' && await page.evaluate(() => window.__earContinuous) === true, '2 the phone asked to write down British English, continuously');
ok(/^Listening — what you say is written here as you say it\.$/.test(await live()), '2 listening, where the words will appear said', await live());
await say('starting at the bagger it is running', false);
ok(await waitFor(async () => (await page.locator('.tk-live .tk-interim').innerText().catch(() => '')) === 'starting at the bagger it is running'), '2 words still forming shown as they are said, lighter', await live());
await say('starting at the bagger it is running at about sixty a minute');
const W1 = 'Starting at the bagger it is running at about sixty a minute.';
ok(await waitFor(async () => await live() === W1), '2 written down as a sentence once the phone is sure of it', await live());
await page.waitForTimeout(1200);
await pauseTalk();
ok(await waitFor(async () => (await words()).includes(W1)), '2 paused: the piece kept with its words', JSON.stringify(await words()));
ok(await page.locator('.tk-turn[data-kind=said] audio.tk-audio').first().getAttribute('src').then(s => !!s?.startsWith('blob:')), '2 its recording kept with it, to play');
ok(/^1 piece said, \d+ s\.$/.test(await summary()), '2 the talk in a line', await summary());
ok((await page.locator('.tk-bar .tk-talk').innerText()).trim() === 'Continue', '2 Continue, once something is said');
ok(await page.locator('.tk-live').count() === 0, '2 the words in progress gone with the pause');

/* 3 — a photo; a session the phone ended by itself; typed */
await page.locator('.tk-bar input[type=file]').setInputFiles(photo);
ok(await waitFor(async () => await page.locator('.tk-turn[data-kind=photo] img.tk-photo-i').count() === 1), '3 the photo in the conversation where it was taken');
await startTalk();
await say('the checkweigher is kicking out the odd bag');
const recs3 = await page.evaluate(() => window.__recs);
await page.evaluate(() => window.__endSession());
ok(await waitFor(async () => await page.evaluate(n => window.__recs > n && window.__ear?.running, recs3), 8000), '3 the phone ended its session — another opened by itself');
await say('the guide rail at the infeed looks bent');
await page.waitForTimeout(800);
await pauseTalk();
const W2 = 'The checkweigher is kicking out the odd bag. The guide rail at the infeed looks bent.';
ok(await waitFor(async () => (await words()).includes(W2)), '3 both sentences kept, in the one piece', JSON.stringify(await words()));
await page.locator('.tk-type textarea').fill('Ask Dave about the spare belt.');
await page.locator('.tk-type button[type=submit]').click();
ok(await waitFor(async () => (await words()).includes('Ask Dave about the spare belt.')), '3 a line typed into it');
ok(await waitFor(async () => /Noted — Dave, and the spare belt\./.test(await page.locator('.tk-turn.is-reply').innerText().catch(() => ''))), '3 and Line Talk’s answer after it');
ok(JSON.stringify(await page.locator('.tk-turn').evaluateAll(els => els.map(e => e.getAttribute('data-kind')))) === JSON.stringify(['said', 'photo', 'said', 'typed', 'reply']), '3 every turn in the order it happened');

/* 4 — corrected, struck */
const first = turns().nth(0);
await first.locator('button', { hasText: 'Correct' }).click();
await first.locator('.tk-fix textarea').fill('Starting at the bagger — running at about 62 a minute.');
await first.locator('.tk-fix button[type=submit]').click(); await settle();
ok((await first.locator('.tk-words').innerText()).trim() === 'Starting at the bagger — running at about 62 a minute.', '4 the words as corrected');
ok((await first.locator('.tk-heard').innerText()).trim() === `As heard: ${W1}`, '4 what was heard kept beside them', await first.locator('.tk-heard').innerText().catch(() => ''));
ok(/Corrected — what was heard is kept beside it/.test(await page.locator('body').innerText()), '4 said, with Undo');
const typed = page.locator('.tk-turn[data-kind=typed]');
await typed.locator('button', { hasText: 'Strike' }).click(); await settle();
ok(/is-struck/.test(await typed.getAttribute('class')) && /struck/.test(await typed.locator('.tk-meta').innerText()), '4 a turn struck — still there, marked struck');
ok(!/typed/.test(await summary()), '4 and left out of the talk', await summary());
await typed.locator('button', { hasText: 'Bring back' }).click(); await settle();
ok(/1 typed/.test(await summary()), '4 brought back', await summary());

/* 5 — no signal: the recording kept, not written down, typed over */
await ctx.setOffline(true);
await startTalk(false);
ok(await waitFor(async () => /^No signal — the phone cannot write down what is said until it comes back\. The recording carries on; type over any piece it missed\.$/.test(await said())), '5 no signal, said as it happens', await said());
await page.waitForTimeout(2200);
await pauseTalk();
const fail5 = page.locator('.tk-turn .tk-fail');
ok(await waitFor(async () => await fail5.count() === 1), '5 the piece kept');
ok((await fail5.innerText()).trim() === 'Not written down — No signal while it was said, so the phone could not write it down. The recording is kept — play it, and type what was said with Correct.', '5 not written down, why, and how to put the words in', await fail5.innerText().catch(() => ''));
const p5 = page.locator('.tk-turn[data-kind=said]').nth(2);
ok(await p5.locator('audio.tk-audio').count() === 1, '5 its recording kept to play');
ok(/1 not written down/.test(await summary()), '5 the talk counts it', await summary());
await ctx.setOffline(false);
await p5.locator('button', { hasText: 'Correct' }).click();
await p5.locator('.tk-fix textarea').fill('The wrapper film is wandering to the left.');
await p5.locator('.tk-fix button[type=submit]').click(); await settle();
ok((await p5.locator('.tk-words').innerText()).trim() === 'The wrapper film is wandering to the left.' && await p5.locator('.tk-fail').count() === 0, '5 the words typed over it — no longer not written down');
ok(await p5.locator('.tk-heard').count() === 0, '5 nothing heard to keep beside them');
ok(!/not written down/.test(await summary()), '5 the talk no longer counts it', await summary());

/* 6 — a long stretch, cut about a minute in at a pause */
console.log('talking for a minute and a bit…');
const before6 = (await pieces()).length;
await startTalk();
await say('second minute of the walk the palletiser is waiting on cases');
await page.waitForTimeout(57500);
await say('back at the', false);
await page.waitForTimeout(4000);
ok((await pieces()).length === before6, '6 a minute in mid-sentence: not cut yet', `${before6} → ${(await pieces()).length}`);
await say('back at the bagger the jaws are clean now');
ok(await waitFor(async () => (await pieces()).length === before6 + 1, 5000), '6 cut at the pause that follows');
const p6 = (await pieces())[before6];
ok(p6?.words === 'Second minute of the walk the palletiser is waiting on cases. Back at the bagger the jaws are clean now.', '6 the sentence finished in the piece it was started in', p6?.words);
ok(/1:0\d/.test(p6?.meta ?? ''), '6 about a minute long', p6?.meta);
await say('that is the walk done');
await page.waitForTimeout(1200);
await pauseTalk();
ok(await waitFor(async () => (await pieces()).length === before6 + 2 && (await pieces())[before6 + 1].words === 'That is the walk done.'), '6 the rest kept as the next piece', JSON.stringify((await pieces()).slice(before6)));

/* 7 — the phone takes the microphone */
await startTalk();
await say('the case packer is starved of cases');
await page.waitForTimeout(1500);
await page.evaluate(() => { for (const s of window.__mics ?? []) for (const t of s.getAudioTracks()) { t.stop(); t.dispatchEvent(new Event('ended')); } });
ok(await waitFor(async () => /^Recording stopped — the phone took the microphone/.test(await said())), '7 the phone taking the microphone said', await said());
ok(await waitFor(async () => (await words()).includes('The case packer is starved of cases.')), '7 what was said up to then kept', JSON.stringify(await words()));
ok((await page.locator('.tk-bar .tk-talk').innerText()).trim() === 'Continue', '7 and Continue to carry on');

/* 7b — out of sight: the phone refuses its hearing then; waited out, and listening again on return */
await startTalk();
await say('the shrink tunnel is running hot');
await page.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  const r = window.__ear; r.running = false; r.onerror?.({ error: 'not-allowed' }); r.onend?.();
});
await page.waitForTimeout(1800);
ok(!/did not allow/.test(await said()), '7b out of sight: the phone’s refusal not taken as one', await said());
const recs7 = await page.evaluate(() => window.__recs);
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' }); document.dispatchEvent(new Event('visibilitychange')); });
ok(await waitFor(async () => await page.evaluate(n => window.__recs > n && window.__ear?.running, recs7), 5000), '7b back in sight: listening again at once');
ok(/^Faultline was out of sight, so the phone did not write down what was said meanwhile — the recording has it\. It is listening again\.$/.test(await said()), '7b and what was missed said', await said());
await say('back at the tunnel the temperature has come down');
await page.waitForTimeout(800);
await pauseTalk();
ok(await waitFor(async () => (await words()).includes('The shrink tunnel is running hot. Back at the tunnel the temperature has come down.')), '7b the words either side kept, in the one piece', JSON.stringify(await words()));

/* 8 — a phone that will not record and hear at once */
await page.evaluate(() => { window.__earBusy = true; });
const before8 = (await pieces()).length;
await startTalk(false);
ok(await waitFor(async () => /^This phone cannot record and write down at once — Line Talk keeps the words, and does not record on this phone from now\.$/.test(await said())), '8 said: the words kept, the recording off', await said());
ok(await waitFor(async () => await page.evaluate(() => window.__ear?.running), 8000), '8 listening again, with the microphone to itself');
await say('the labeller is out of labels');
await page.waitForTimeout(800);
await pauseTalk();
ok(await waitFor(async () => (await pieces()).length === before8 + 1), '8 one piece — nothing kept of the moment it could not hear', JSON.stringify((await pieces()).slice(before8)));
const p8 = (await pieces())[before8];
ok(p8?.words === 'The labeller is out of labels.' && !p8.audio, '8 its words, and no recording', JSON.stringify(p8));
ok(await page.evaluate(() => localStorage.getItem('fl-talk-hear-only')) === '1', '8 remembered on this phone');
const mics8 = await page.evaluate(() => (window.__mics ?? []).length);
await startTalk();
await say('the next talk is words only');
await page.waitForTimeout(800);
await pauseTalk();
ok(await waitFor(async () => (await pieces()).some(p => p.words === 'The next talk is words only.' && !p.audio)), '8 the next talk: words only, nothing recorded');
ok(await page.evaluate(() => (window.__mics ?? []).length) === mics8, '8 and the microphone not opened to record');
await page.evaluate(() => { window.__earBusy = false; localStorage.removeItem('fl-talk-hear-only'); });

/* 9 — a phone whose recording comes out silent */
await page.evaluate(() => { window.__silentMic = true; });
await startTalk();
await say('the sealer temperature reads one eighty');
await page.waitForTimeout(2200);
await pauseTalk();
ok(await waitFor(async () => (await pieces()).some(p => p.words === 'The sealer temperature reads one eighty.')), '9 the words kept');
ok(!(await pieces()).find(p => p.words === 'The sealer temperature reads one eighty.')?.audio, '9 the silent recording not kept');
ok(await waitFor(async () => /^This phone gives its microphone to the hearing, so its recordings come out silent/.test(await said())), '9 said', await said());
ok(await page.evaluate(() => localStorage.getItem('fl-talk-hear-only')) === '1', '9 remembered on this phone');
await page.evaluate(() => { window.__silentMic = false; localStorage.removeItem('fl-talk-hear-only'); });

/* 10 — a browser with no speech recognition */
await page.evaluate(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
await startTalk(false);
ok(/^This browser does not write down speech — what you say is recorded, not written\./.test(await said()), '10 said: recorded, not written', await said());
ok(await live() === 'Recording.', '10 recording, said where the words would be', await live());
await page.waitForTimeout(2200);
await pauseTalk();
const fail10 = page.locator('.tk-turn .tk-fail');
ok(await waitFor(async () => await fail10.count() === 1), '10 the piece kept, not written down');
ok(/^Not written down — This browser does not write down speech\. The recording is kept/.test((await fail10.innerText()).trim()), '10 why, and how to put the words in', await fail10.innerText().catch(() => ''));
await page.evaluate(() => { window.SpeechRecognition = window.__FakeRec; window.webkitSpeechRecognition = window.__FakeRec; });

/* 11 — reloaded, carried on */
const kept = await words();
const sumKept = await summary();
const kept11 = await pieces();
await page.reload(); await settle(1500);
ok(JSON.stringify(await words()) === JSON.stringify(kept), '11 reloaded: the conversation as it was left', JSON.stringify(await words()));
ok(await summary() === sumKept, '11 what was said, the same', `${await summary()} | ${sumKept}`);
const audios = await page.locator('.tk-turn[data-kind=said] audio.tk-audio').evaluateAll(els => els.map(e => e.getAttribute('src') ?? ''));
ok(audios.length === kept11.filter(p => p.audio).length && audios.length >= 6 && audios.every(s => s.startsWith('blob:')), '11 every recording kept and playable', `${audios.length} of ${kept11.filter(p => p.audio).length}`);
const playable = await page.locator('.tk-turn[data-kind=said] audio.tk-audio').first().evaluate(a => new Promise(res => { a.preload = 'auto'; a.onloadedmetadata = () => res(true); a.onerror = () => res(false); a.load(); setTimeout(() => res(false), 4000); }));
ok(playable, '11 a recording plays back');
ok(await page.locator('.tk-turn[data-kind=photo] img.tk-photo-i').count() === 1, '11 the photo kept');
await startTalk();
await say('after the reload carrying on at the wrapper');
await page.waitForTimeout(1000);
await pauseTalk();
ok(await waitFor(async () => (await words()).includes('After the reload carrying on at the wrapper.')), '11 carried on after the reload', JSON.stringify(await words()));
const n11 = (await pieces()).length;

/* 12 — the line, every Line Talk, the phone */
await page.goto(`${BASE}/#/lines/${lineId}`); await settle(1200);
const t12 = await page.locator('.pl-tool', { hasText: 'Line Talk' }).innerText();
ok(/1 on this line/.test(t12) && new RegExp(`Line 7 — ${today}: ${n11} pieces said`).test(t12), '12 the line’s page says its Line Talk', t12);
await page.goto(`${BASE}/#/talk`); await settle(800);
const row = await page.locator('.lt-row').first().innerText();
ok(new RegExp(`${n11} pieces said`).test(row) && /Line 7/.test(row) && /1 not written down/.test(row), '12 every Line Talk lists it, with its line and what is not written down', row);
await page.setViewportSize({ width: 390, height: 780 });
await page.goto(`${BASE}/#/talk/${talkId}`); await settle(1200);
const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
ok(wide <= 1, '12 the phone: nothing off the side', `${wide}px`);
const bar = await page.locator('.tk-bar').boundingBox();
const foot = await page.locator('.nv-bar').boundingBox();
ok(!!bar && !!foot && bar.y + bar.height <= foot.y + 1 && bar.y + bar.height >= foot.y - 30, '12 the phone: Talk, Photo and typing in reach, on the phone’s own bar', JSON.stringify({ bar, foot }));
ok(await page.locator('.qs-fab').count() === 0 || !(await page.locator('.qs-fab').isVisible()), '12 the phone: nothing over Photo');
ok(await page.locator('.tk-bar .tk-talk').isVisible() && await page.locator('.tk-bar .tk-photo').isVisible(), '12 the phone: Continue and Photo shown');
await startTalk();
await say('the words fit the phone as they are said and they keep on going past the width of the screen');
const liveBox = await page.locator('.tk-live').boundingBox();
ok(!!liveBox && liveBox.x >= 0 && liveBox.x + liveBox.width <= 391, '12 the phone: the words as they are said fit across it', JSON.stringify(liveBox));
await pauseTalk();

ok(voiceAsked === 0, 'nothing sent to a voice service', `${voiceAsked} requests`);
ok(errs.length === 0, 'no console error', errs.join(' | '));
await b.close();
console.log(fail ? `\n${fail} FAILED` : '\nall passed');
process.exit(fail ? 1 : 0);
