/* ACCEPTANCE — Conversation mode, Luna Hall (23 November, docs/LUNA-ROOM.md §5 C1): mocked gateway —
 * open mode, voice ask, thinking state, reply in the glass area, write card on a confirm. */
import { openApp } from '../lib/tocBrowser.mjs';

const t = await openApp({ width: 390, height: 844, mobile: true, args: ['--disable-gpu', '--disable-webgl'] });
const { page, ok } = t;
const sd = await t.seed();
await page.addInitScript(() => {
  const res = (tx, isFinal) => ({ 0: { transcript: tx }, length: 1, isFinal });
  class FakeRec {
    constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; this.onresult = null; this.onerror = null; this.onend = null; this.running = false; this.results = []; }
    start() { this.running = true; window.__ear = this; }
    stop() {
      if (!this.running) { setTimeout(() => this.onend?.(), 0); return; }
      this.running = false;
      const last = this.results[this.results.length - 1];
      if (last && !last.isFinal) { this.results[this.results.length - 1] = { 0: { transcript: last[0].transcript }, length: 1, isFinal: true }; this.onresult?.({ results: [...this.results] }); }
      setTimeout(() => this.onend?.(), 30);
    }
    abort() { this.running = false; setTimeout(() => this.onend?.(), 0); }
  }
  window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec;
  window.__say = (tx, final = true) => {
    const r = window.__ear; if (!r?.running) return false;
    if (r.results.length && !r.results[r.results.length - 1].isFinal) r.results.pop();
    r.results.push(res(tx, final)); r.onresult?.({ results: [...r.results] }); return true;
  };
  window.__spoken = [];
  const synth = {
    speaking: false, speak(u) { window.__spoken.push(u.text); this.speaking = true; this.timer = setTimeout(() => { this.speaking = false; u.onend?.({}); }, window.__speakMs ?? 280); },
    cancel() { clearTimeout(this.timer); this.speaking = false; }, getVoices: () => [{ voiceURI: 'gb-1', name: 'UK', lang: 'en-GB', localService: true, default: true }],
    addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = function SpeechSynthesisUtterance(tx) { this.text = tx; };
});
await page.reload();
await page.waitForTimeout(1200);

const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  const answer = next ? next(body) : { ok: false, why: 'nothing planned' };
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});

const lc = () => page.locator('.lc[data-luna-conversation]');
const state = async () => lc().getAttribute('data-voice-state');
const say = (tx, final = true) => page.evaluate(([a, f]) => window.__say(a, f), [tx, final]);
const sendVoice = async (words, expectGlass = /./) => {
  if (!(await page.evaluate(() => window.__ear?.running))) await lc().locator('[data-voice-main]').click();
  await page.waitForFunction(() => window.__ear?.running, null, { timeout: 15000 }).catch(() => undefined);
  await say(words, false);
  await page.waitForTimeout(200);
  await say(words, true);
  await page.waitForFunction(
    pat => {
      const st = document.querySelector('.lc')?.getAttribute('data-voice-state');
      const t = document.querySelector('.lc [data-conversation-glass] .lc-glass-words')?.textContent ?? '';
      return st !== 'processing' && st !== 'preparing' && new RegExp(pat, 'i').test(t);
    },
    expectGlass.source,
    { timeout: 25000 },
  ).catch(() => undefined);
  await page.waitForTimeout(400);
};
const glass = () => t.words('.lc [data-conversation-glass] .lc-glass-words');

const raise = { lineId: sd.wsId, words: 'Film jam on the wrapper', priority: 'high', how: 'reported' };

await t.go(`#/ai/conversation?line=${encodeURIComponent(sd.wsId)}`, 4000);
await lc().waitFor({timeout:30000});
ok((await lc().count()) === 1, '1 conversation mode — full screen surface');
ok(await lc().locator('[data-voice-orb] [data-globe-size="stage"] .luna-globe-sphere').isVisible(), '1 conversation mode shows the large blue Luna globe');
ok(/Microphone off|Talk/i.test(await t.words('.lc [data-voice-said]')), '1 opens ready to talk — mic after a press');
await lc().locator('[data-voice-main]').click();
await page.waitForTimeout(500);
ok(await page.evaluate(() => window.__ear?.running), '1 microphone live after Talk');

const before = asks.length;
await sendVoice('Hello Luna', /Morning|Hello|Evening|What are we/);
ok(asks.length === before, '2 hello — no gateway');
ok(/Morning|Hello|Evening|What are we/i.test(await glass()), '2 hello — reply in the glass area');
ok(['processing', 'preparing', 'speaking', 'listening', 'idle'].includes(await state()), '2 voice state on the surface');

await page.waitForFunction(() => document.querySelector('.lc')?.getAttribute('data-voice-state') === 'listening');
await page.evaluate(() => { window.__speakMs = 6000; });
plan = [() => ({ok:true,reply:'There are several different figures in the report. I will go through the shifts first.'})];
await say('explain those figures');
await page.waitForFunction(() => window.speechSynthesis.speaking && window.__ear?.running);
const quiet = await page.evaluate(() => window.__say('Luna, stop', false) && !window.speechSynthesis.speaking);
await say('Luna, stop');
ok(quiet && await page.evaluate(() => window.__ear?.running), 'Phone conversation mode silences Luna mid-sentence and keeps the microphone ready');
await page.evaluate(() => { window.__speakMs = 280; });

plan = [
  () => ({ ok: true, reply: 'I can raise that on the register.', calls: [{ id: 'w1', name: 'raise_problem', input: raise }], assistant: { v: 1, rounds: ['w1'] } }),
  () => ({ ok: true, reply: 'Raised.' }),
];
await sendVoice('Raise a problem about a film jam on the wrapper', /register|Raise a problem/i);
await page.waitForSelector('.lc [data-card="raise_problem"][data-card-status="waiting"]', { timeout: 20000 }).catch(() => undefined);
ok((await page.locator('.lc [data-card="raise_problem"][data-card-status="waiting"]').count()) === 1, '3 write card — glass overlay waiting');

await t.go('#/ai', 2500);
await page.getByRole('button', {name:'Settings', exact:true}).click();
await page.getByRole('menuitem', {name:/Settings/i}).click();
await page.getByRole('button', {name:/^Conversation mode/i}).click();
await page.waitForTimeout(1000);
ok((await page.evaluate(() => location.hash)).includes('/ai/conversation'), '4 entry opens conversation mode');

await t.finish('Conversation mode proved: full screen, voice turn, glass reply, write card, obvious entry.');