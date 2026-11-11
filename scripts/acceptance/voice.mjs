/* ACCEPTANCE — VOICE (9 November; docs/VOICE.md; colleague/VoiceMode, colleague/speech, colleague/voice, colleague/voicePrefs).
 * Rowland: "Functionality A — microphone input within the existing chat … Functionality B — full two-way voice conversation …
 * It must not create a new conversation engine." Driven in a real browser on the smoke seed. The phone's speech recognition and its
 * voice are played by the script (a fake SpeechRecognition the script talks into; a fake speechSynthesis that records each piece
 * said and says when it starts, each word and when it ends) and the `assist` gateway answered by the script — so what is proved is
 * what Faultline does with each event, never that a Samsung phone hears or speaks well (that is the device's, said in VOICE.md):
 *
 *   A1  dictation in the chat: the microphone, Listening… with Cancel and Done; words into the box as said; Cancel puts the box
 *       back as it was; Done leaves the words to edit; Send — a "said" turn, answered in the same conversation
 *   A2  no speech recognition in this browser: said in words, the keyboard's microphone offered; a refusal said
 *   B1  the voice conversation from the box's Voice button: its screen, Listening, the words heard shown; a pause to think after
 *       "and" not taken as the end; the end of the turn sent into the SAME conversation with spoken = true, the reply in the chat
 *   B2  the reply said sentence by sentence (the first before the next round's words), no markdown, no ids, no Suggestions line;
 *       Speaking; Listening again by itself when the last piece ends
 *   B4b Luna's own voice heard back while she speaks and just after — never the person; a short real answer still theirs
 *   B3  interrupted by a tap while speaking: speech stopped at once (nothing more said), Interrupted then Listening; a new turn sent
 *   B4  mute and unmute; "stop" said only clears; a refusal of the microphone an error said in words
 *   B5  a change of subject and back across voice and text: the same conversation's threads; Chat closes the screen with every
 *       turn in the chat; Voice again resumes the same conversation; End
 *   B6  the settings: the device's voices offered, speed and pause kept on this device, where words are written down and where
 *       sound goes said honestly; out of sight — paused and said
 *   B7  the phone at 390: the screen fills it, every press 44 px, nothing off the side
 *
 *   node scripts/acceptance/voice.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';
import { installSse } from '../lib/sseGateway.mjs';

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
const sd = await t.seed();
await page.addInitScript(() => {
  const res = (tx, isFinal) => ({ 0: { transcript: tx }, length: 1, isFinal });
  class FakeRec {
    constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; this.onresult = null; this.onerror = null; this.onend = null; this.running = false; this.results = []; }
    start() {
      if (window.__earRefused) { setTimeout(() => { this.onerror?.({ error: 'not-allowed' }); this.onend?.(); }, 20); return; }
      this.running = true; window.__ear = this; window.__earStarts = (window.__earStarts ?? 0) + 1;
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
  window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec;
  window.__say = (tx, final = true) => {
    const r = window.__ear; if (!r?.running) return false;
    if (r.results.length && !r.results[r.results.length - 1].isFinal) r.results.pop();
    r.results.push(res(tx, final)); r.onresult?.({ results: [...r.results] }); return true;
  };
  /* THE PHONE'S VOICE, played: every piece said is kept; a piece takes __speakMs to say, a boundary at each word */
  window.__spoken = []; window.__speakMs = 400;
  const synth = {
    speaking: false, cur: null, timer: null,
    getVoices: () => [{ voiceURI: 'gb-1', name: 'English (United Kingdom) 1', lang: 'en-GB', localService: true, default: true }, { voiceURI: 'us-1', name: 'English (United States) 1', lang: 'en-US', localService: false, default: false }],
    speak(u) {
      window.__spoken.push(u.text); this.cur = u; this.speaking = true;
      const words = u.text.split(/\s+/).length; let i = 0;
      const tick = setInterval(() => { if (this.cur !== u) { clearInterval(tick); return; } u.onboundary?.({}); if (++i >= words) clearInterval(tick); }, Math.max(10, window.__speakMs / Math.max(1, words)));
      this.timer = setTimeout(() => { if (this.cur !== u) return; this.cur = null; this.speaking = false; u.onend?.({}); }, window.__speakMs);
    },
    cancel() { const u = this.cur; this.cur = null; this.speaking = false; clearTimeout(this.timer); if (u) window.__cancelled = (window.__cancelled ?? 0) + 1; },
    addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  class U { constructor(tx) { this.text = tx; } }
  window.SpeechSynthesisUtterance = U;
});
/* B5b: the gateway's stream played in front of the page's fetch (scripts/lib/sseGateway) */
const sse = await installSse(page);
await page.reload(); await page.waitForTimeout(1500);

const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
const spokenAtRound = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  const answer = next ? next(body) : { ok: true, reply: 'Noted.' };
  if (answer.delay) await new Promise(res => setTimeout(res, answer.delay));
  /* what had been said out loud by the time a later round's answer goes back */
  if (body.pending) spokenAtRound.push(await page.evaluate(() => window.__spoken.length).catch(() => -1));
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});
const say = (tx, final = true) => page.evaluate(([a, f]) => window.__say(a, f), [tx, final]);
const state = () => page.evaluate(() => document.querySelector('[data-voice-mode]')?.getAttribute('data-voice-state') ?? '');
const waitState = async (s, ms = 8000) => { await page.waitForFunction(x => document.querySelector('[data-voice-mode]')?.getAttribute('data-voice-state') === x, s, { timeout: ms }).catch(() => undefined); return state(); };
const spoken = () => page.evaluate(() => [...window.__spoken]);
const boxText = () => page.locator('.ai-box').inputValue();
const replies = () => page.locator('.ai-turn.is-colleague').count();
const convs = () => page.evaluate(async () => (await (await import('/src/db.ts')).listAllStudies()).filter(s => s.tool === 'talk' && s.facts?.colleague).length);

/* ---- A1 · dictation in the chat ---- */
await t.go(`#/ai?line=${encodeURIComponent(sd.wsId)}`, 2500);
await page.locator('.ai-box').fill('On the wrapper,');
await page.getByRole('button', { name: 'Talk into the box' }).click();
await page.waitForFunction(() => window.__ear?.running, null, { timeout: 4000 }).catch(() => undefined);
ok(await page.locator('[data-ai-listening]').isVisible() && (await page.locator('[data-dictate-cancel]').count()) === 1 && (await page.locator('[data-dictate-done]').count()) === 1, 'A1 the microphone: Listening… with Cancel and Done');
await say('the film', false);
ok(/On the wrapper, the film/.test(await boxText()), `A1 the words come up in the box as they are said: "${await boxText()}"`);
await page.locator('[data-dictate-cancel]').click(); await page.waitForTimeout(300);
ok((await boxText()) === 'On the wrapper,' && !(await page.evaluate(() => window.__ear?.running)), 'A1 Cancel: listening stopped, the box as it was');
await page.getByRole('button', { name: 'Talk into the box' }).click();
await page.waitForFunction(() => window.__ear?.running, null, { timeout: 4000 }).catch(() => undefined);
await say('the film breaks twice a shift');
await page.locator('[data-dictate-done]').click(); await page.waitForTimeout(500);
ok(/the film breaks twice a shift/i.test(await boxText()), `A1 Done: the words left in the box to edit: "${await boxText()}"`);
await page.locator('.ai-box').fill(`${(await boxText()).replace(/twice/, 'three times')}`);
plan = [() => ({ ok: true, reply: 'Three film breaks a shift is worth timing.' })];
await page.getByRole('button', { name: 'Send', exact: true }).click();
await page.waitForFunction(() => document.querySelectorAll('.ai-turn.is-colleague').length >= 1 && !document.querySelector('.ai-thinking'), null, { timeout: 8000 }).catch(() => undefined);
ok(/three times a shift/.test(asks.at(-1)?.turns?.at(-1)?.text ?? '') && !asks.at(-1)?.spoken, 'A1 sent as edited through the same conversation — not marked spoken');
const conv1 = asks.at(-1)?.conversationId;

/* ---- A2 · no recognition, and a refusal ---- */
await page.evaluate(() => { window.SpeechRecognition = undefined; window.webkitSpeechRecognition = undefined; });
await page.getByRole('button', { name: 'Talk into the box' }).click(); await page.waitForTimeout(300);
ok(/does not write down speech/i.test(await t.words('.ai-said')), `A2 no recognition: said, with the keyboard's microphone: "${(await t.words('.ai-said')).slice(0, 80)}"`);
await page.evaluate(() => { window.SpeechRecognition = window.__FakeRec; window.webkitSpeechRecognition = window.__FakeRec; window.__earRefused = true; });
await page.getByRole('button', { name: 'Talk into the box' }).click(); await page.waitForTimeout(400);
ok(/did not allow|not allowed|allow/i.test(await t.words('.ai-said')), `A2 a refusal said: "${(await t.words('.ai-said')).slice(0, 90)}"`);
await page.evaluate(() => { window.__earRefused = false; });
await page.locator('.ai-box').fill('');

/* ---- B1 · the voice conversation ---- */
await page.locator('[data-voice-open]').click();
ok((await page.locator('[data-voice-mode]').count()) === 1 && (await waitState('listening')) === 'listening', `B1 Voice opens its screen, listening (${await state()})`);
ok(/Listening/.test(await t.words('[data-voice-said]')), 'B1 the state said in words under the orb');
plan = [
  () => ({ ok: true, reply: 'Line 7 has **two** open problems.\n- the wrapper film\n- the labeller', calls: [{ id: 'q1', name: 'list_problems', input: { lineId: sd.wsId } }], assistant: { v: 1 }, delay: 300 }),
  () => ({ ok: true, reply: 'The film is the one costing most. Shall I time it?\nSuggestions: Time the film | Park this', delay: 300 }),
];
const before = asks.length;
await say('what is open on this line and', false);
await page.waitForTimeout(300);
ok(/what is open on this line and/i.test(await t.words('[data-voice-words]')) && (await state()) === 'transcribing', 'B1 the words heard shown as they are said');
await say('what is open on this line and');
await page.waitForTimeout(2600);
ok(asks.length === before, 'B1 a pause after "and" is a pause to think — not sent');
await say('what is open on this line and what costs most');
await page.waitForTimeout(2600);
const b1 = asks[before];
ok(!!b1 && b1.spoken === true && /what costs most/.test(b1.turns?.at(-1)?.text ?? '') && b1.conversationId === conv1, `B1 the end of the turn sent into the SAME conversation, spoken = true (${b1?.conversationId === conv1 ? 'same' : 'other'})`);
ok(['processing', 'preparing', 'speaking'].includes(await state()), `B1 then thinking (${await state()})`);

/* ---- B2 · said sentence by sentence ---- */
await page.waitForFunction(() => window.__spoken.length >= 1, null, { timeout: 8000 }).catch(() => undefined);
/* what had been said when the next round's answer went back is recorded as that answer goes — wait for it before reading it */
for (let i = 0; i < 40 && !spokenAtRound.length; i++) await page.waitForTimeout(150);
const firstSaid = (await spoken())[0] ?? '';
ok(firstSaid.startsWith('Line 7 has two open problems.') && !/costing most/.test(firstSaid) && (spokenAtRound[0] ?? 0) >= 1, `B2 the first sentences said while the rest was still being worked out: "${firstSaid}" (${spokenAtRound[0]} said when the next round's answer came)`);
await page.waitForFunction(() => window.__spoken.some(x => /Shall I time it\?/.test(x)), null, { timeout: 8000 }).catch(() => undefined);
const all = (await spoken()).join(' ');
ok(/the wrapper film\. the labeller\./.test(all) && !/\*\*|Suggestions|list_problems|q1/.test(all), `B2 every piece said as words — no markdown, no Suggestions, no step names: "${all.slice(0, 160)}"`);
ok(await waitState('listening', 6000) === 'listening' && await page.evaluate(() => window.__ear?.running), 'B2 listening again by itself when the last piece ends');
ok(/The film is the one costing most/.test(await t.words('.ai-turn.is-colleague:last-of-type .ai-words')), 'B2 the reply written in the chat as ever');

/* ---- B3 · interrupted ---- */
await page.evaluate(() => { window.__speakMs = 4000; });
plan = [() => ({ ok: true, reply: 'The wrapper film breaks at the splice. It tears when the reel changes. The fitter has looked twice. A new splice tape is on order.', delay: 100 })];
await say('tell me about the film');
await waitState('speaking', 8000);
const saidBefore = (await spoken()).length;
await page.locator('[data-voice-main]').click(); await page.waitForTimeout(400);
const st3 = await state();
ok(['interrupted', 'listening'].includes(st3) && await page.evaluate(() => !window.speechSynthesis.speaking), `B3 Interrupt: speech stopped at once (${st3})`);
await page.waitForTimeout(4200);
ok((await spoken()).length === saidBefore, 'B3 nothing more said after the interruption — no old speech, no overlap');
await page.evaluate(() => { window.__speakMs = 300; });
plan = [() => ({ ok: true, reply: 'Line 3 then — it has one open problem.' })];
const n3 = asks.length;
await say('no I meant line three');
await page.waitForTimeout(2600);
ok(asks.length === n3 + 1 && /line three/.test(asks.at(-1)?.turns?.at(-1)?.text ?? ''), 'B3 the new words sent as the next turn of the same conversation');
await waitState('listening', 6000);

/* ---- B4 · mute, "stop", a refusal ---- */
await page.locator('[data-voice-mute]').click(); await page.waitForTimeout(300);
ok((await state()) === 'idle' && !(await page.evaluate(() => window.__ear?.running)) && /Microphone off/.test(await t.words('[data-voice-said]')), 'B4 Mute: the microphone off, said');
await page.locator('[data-voice-mute]').click(); await waitState('listening');
ok(await page.evaluate(() => window.__ear?.running), 'B4 Unmute: listening again');
const n4 = asks.length;
await say('stop'); await page.waitForTimeout(1600);
ok(asks.length === n4, 'B4 "stop" said on its own sends nothing');
await page.evaluate(() => { window.__earRefused = true; });
await page.locator('[data-voice-mute]').click(); await page.waitForTimeout(200);
await page.locator('[data-voice-mute]').click(); await page.waitForTimeout(500);
ok((await state()) === 'error' && /allow/i.test(await t.words('[data-voice-note]')), `B4 the microphone refused: an error said in words ("${(await t.words('[data-voice-note]')).slice(0, 70)}")`);
await page.evaluate(() => { window.__earRefused = false; });
await page.locator('[data-voice-main]').click(); await waitState('listening');

/* ---- B4b · Luna does not hear herself (10 November — Rowland: "When the AI speaks it hears its own voice, this then causes
   issues"): with the microphone open while she speaks, her own words coming back are never taken for the person — not while
   she speaks, not a moment after — and a short real answer just after is still the person's, sent with nothing of hers in it ---- */
await page.getByRole('button', { name: 'Voice settings' }).click(); await page.waitForTimeout(400);
await page.locator('[data-voice-talkover="on"]').click(); await page.waitForTimeout(150);
await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 3000 }).catch(() => undefined); await page.waitForTimeout(300);
await page.evaluate(() => { window.__speakMs = 2500; });
const herQ = 'The wrapper has stopped twice this shift. Is it the wrapper or the filler that worries you most?';
plan = [() => ({ ok: true, reply: herQ })];
const n5 = asks.length;
await say('what about the wrapper'); await page.waitForTimeout(2600);
ok(asks.length === n5 + 1, 'B4b the question sent');
await page.waitForFunction(() => window.speechSynthesis.speaking && window.__ear?.running, null, { timeout: 8000 }).catch(() => undefined);
const speakingHeard = await page.evaluate(() => window.speechSynthesis.speaking && !!window.__ear?.running);
await say('has stopped twice this shift', false); await page.waitForTimeout(150);
await say('the wrapper has stopped twice this shift'); await page.waitForTimeout(600);
const stillSaying = await page.evaluate(() => window.speechSynthesis.speaking);
ok(speakingHeard && stillSaying && ['speaking', 'listening'].includes(await state()) && asks.length === n5 + 1, `B4b her own words heard back while she speaks: not the person — she carries on (${await state()}, listening while she spoke: ${speakingHeard}, still speaking: ${stillSaying}, ${asks.length - n5 - 1} sent)`);
await page.waitForFunction(() => !window.speechSynthesis.speaking, null, { timeout: 12000 }).catch(() => undefined);
await page.waitForTimeout(200);
await say('the filler that worries you most'); await page.waitForTimeout(2800);
ok(asks.length === n5 + 1, `B4b her last words arriving after she stopped: nothing sent (${asks.length - n5 - 1} sent)`);
plan = [() => ({ ok: true, reply: 'The wrapper then.' })];
await say('the wrapper'); await page.waitForTimeout(2800);
const answerSent = asks.at(-1)?.turns?.at(-1)?.text ?? '';
ok(asks.length === n5 + 2 && /^the wrapper\.?$/i.test(answerSent.trim()), `B4b the person's short answer just after is theirs, nothing of hers joined to it ("${answerSent}")`);
await waitState('listening', 6000);
await page.getByRole('button', { name: 'Voice settings' }).click(); await page.waitForTimeout(400);
await page.locator('[data-voice-talkover="auto"]').click(); await page.waitForTimeout(150);
await page.keyboard.press('Escape'); await page.waitForFunction(() => !history.state?.flPanel, null, { timeout: 3000 }).catch(() => undefined); await page.waitForTimeout(300);
await page.evaluate(() => { window.__speakMs = 400; });

/* ---- B5 · across voice and text, one conversation ---- */
plan = [() => ({ ok: true, reply: '', calls: [{ id: 'f1', name: 'set_focus', input: { title: 'How to approach a changeover analysis' } }], assistant: { v: 1 } }), () => ({ ok: true, reply: 'Time it element by element first.' })];
await say('before that how would you approach a changeover analysis'); await page.waitForTimeout(2600);
await waitState('listening', 6000);
await page.locator('[data-voice-chat]').click(); await page.waitForTimeout(500);
ok((await page.locator('[data-voice-mode]').count()) === 0 && (await replies()) >= 4, `B5 Chat: back to the text with every turn in it (${await replies()} replies)`);
ok(/changeover analysis/.test(await t.words('[data-ctx-current]')) || /changeover analysis/.test(await t.words('.ai-strip')), 'B5 the subject changed in the same conversation');
plan = [() => ({ ok: true, reply: '', calls: [{ id: 'f2', name: 'set_focus', input: { title: 'Back to the line', scope: { lineId: sd.wsId } } }], assistant: { v: 1 } }), () => ({ ok: true, reply: 'Back on Line 7.' })];
await page.locator('.ai-box').fill('ok back to the line');
await page.getByRole('button', { name: 'Send', exact: true }).click(); await page.waitForTimeout(2000);
await page.locator('[data-voice-open]').click(); await waitState('listening');
plan = [() => ({ ok: true, reply: 'Still the film on Line 7.' })];
await say('where were we'); await page.waitForTimeout(2600);
ok(asks.at(-1)?.conversationId === conv1 && (await convs()) === 1, `B5 text then voice again: still one conversation (${await convs()})`);
await waitState('listening', 6000);

/* ---- B5b · said as it is written (11 November, docs/VOICE.md): the reply streamed — its first sentence spoken while the rest is
   still being written, before the final event; the rest said once it comes, nothing twice ---- */
await sse.queue({ deltas: ['Line 3 has one open problem. ', 'The jam is the one ', 'costing most'], gapMs: 300, hold: true, final: { ok: true, reply: 'Line 3 has one open problem. The jam is the one costing most. Shall I time it?', model: 'test' } });
const s5 = (await spoken()).length;
await say('what is open on line three');
await page.waitForFunction(n => window.__spoken.length > n, s5, { timeout: 10000 }).catch(() => undefined);
await page.waitForTimeout(600);
const saidEarly = (await spoken()).slice(s5);
const logB5 = (await sse.log()).at(-1);
ok(!!logB5?.stream && logB5.spoken && logB5.final === null && saidEarly[0] === 'Line 3 has one open problem.' && !saidEarly.some(x => /costing most/.test(x)),
  `B5b the first sentence spoken before the reply is complete: "${saidEarly.join(' / ')}" (the final event ${logB5?.final === null ? 'not sent yet' : 'already sent'})`);
await sse.release();
await page.waitForFunction(n => window.__spoken.slice(n).some(x => /Shall I time it\?/.test(x)), s5, { timeout: 10000 }).catch(() => undefined);
const saidAll = (await spoken()).slice(s5).join(' ');
ok(/^Line 3 has one open problem\. The jam is the one costing most\. Shall I time it\?$/.test(saidAll.replace(/\s+/g, ' ').trim()), `B5b the rest said once the answer is complete, nothing said twice: "${saidAll}"`);
await waitState('listening', 6000);

/* ---- B6 · settings, out of sight ---- */
await page.getByRole('button', { name: 'Voice settings' }).click(); await page.waitForTimeout(400);
const opts = await page.locator('[data-voice-pick] option').allInnerTexts();
ok(opts.some(o => /English \(United Kingdom\) 1/.test(o)) && opts.some(o => /needs signal/.test(o)), `B6 the device's voices offered, each saying if it needs signal: ${opts.join(' | ')}`);
await page.locator('[data-voice-pause="long"]').click();
await page.locator('[data-voice-rate]').fill('1.2');
ok(/Faultline/.test(await t.words('[data-voice-ondevice]')) || (await t.words('[data-voice-ondevice]')).length > 20, 'B6 where the words are written down said');
ok(/cannot pick the speaker/.test(await t.words('[data-voice-route]')), 'B6 where you hear Faultline said honestly');
const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('faultline.voice') ?? '{}'));
ok(kept.pause === 'long' && kept.rate === 1.2, `B6 kept on this device: ${JSON.stringify(kept)}`);
await page.keyboard.press('Escape'); await page.waitForTimeout(400);
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
await page.waitForTimeout(400);
ok((await state()) === 'idle' && /out of sight/.test(await t.words('[data-voice-note]')), 'B6 out of sight: paused and said');
await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true }); });
await page.locator('[data-voice-end]').click(); await page.waitForTimeout(400);
ok((await page.locator('[data-voice-mode]').count()) === 0 && !(await page.evaluate(() => window.__ear?.running)), 'B6 End: the screen closed, nothing listening');

/* ---- B7 · the phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.locator('[data-voice-open]').click(); await waitState('listening');
const small = await page.evaluate(() => [...document.querySelectorAll('[data-voice-mode] button')].filter(b => b.offsetParent && b.getBoundingClientRect().height < 44).map(b => b.textContent?.trim() || b.getAttribute('aria-label')));
const box = await page.locator('[data-voice-mode]').boundingBox();
ok(small.length === 0 && (await t.wide()) <= 0 && box?.width === 390 && box?.height === 844, `B7 the phone: the screen filled, every press 44 px (${small.join(', ') || 'all'}), nothing off the side`);
await page.screenshot({ path: process.env.VOICE_SHOTS ? `${process.env.VOICE_SHOTS}/voice-390.png` : '/dev/null' }).catch(() => undefined);
await page.locator('[data-voice-end]').click();

await t.finish('Voice proved: dictation into the box with Cancel and Done; the voice conversation listening, waiting out a pause, sending into the same conversation, saying the reply sentence by sentence, interrupted at once, muted, refused and said, across voice and text in one conversation, its settings kept, paused out of sight, on the phone.');
