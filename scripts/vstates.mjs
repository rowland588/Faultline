/* visual check only: the voice screen in its real states, driven through the app's own VoiceMode by a played recogniser and voice */
import { openApp } from './lib/tocBrowser.mjs';
const OUT = process.argv[2]; const W = +process.argv[3] || 1440, H = +process.argv[4] || 900; const tag = process.argv[5] || 'desk';
const t = await openApp({ width: W, height: H });
const { page } = t; const sd = await t.seed();
await page.addInitScript(() => {
  const res = (tx, isFinal) => ({ 0: { transcript: tx }, length: 1, isFinal });
  class FakeRec { constructor() { this.results = []; this.running = false; }
    start() { this.running = true; window.__ear = this; } stop() { this.running = false; setTimeout(() => this.onend?.(), 30); } abort() { this.running = false; setTimeout(() => this.onend?.(), 0); } }
  window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec;
  window.__say = (tx, f = true) => { const r = window.__ear; if (!r?.running) return false; if (r.results.length && !r.results.at(-1).isFinal) r.results.pop(); r.results.push(res(tx, f)); r.onresult?.({ results: [...r.results] }); return true; };
  window.__spoken = []; window.__speakMs = 9000;
  const synth = { speaking: false, cur: null, getVoices: () => [{ voiceURI: 'gb', name: 'English (UK)', lang: 'en-GB', localService: true, default: true }],
    speak(u) { window.__spoken.push(u.text); this.cur = u; this.speaking = true; const tick = setInterval(() => { if (this.cur !== u) { clearInterval(tick); return; } u.onboundary?.({}); }, 180);
      setTimeout(() => { if (this.cur !== u) return; this.cur = null; this.speaking = false; u.onend?.({}); }, window.__speakMs); },
    cancel() { this.cur = null; this.speaking = false; }, addEventListener() {}, removeEventListener() {} };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  window.SpeechSynthesisUtterance = class { constructor(tx) { this.text = tx; } };
});
await page.route('**/functions/v1/assist', async r => { await new Promise(x => setTimeout(x, 4000)); r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ ok: true, reply: 'Line 7 lost forty minutes to film breaks on the wrapper yesterday. Shall I time the next ones with you?' }) }); });
await page.reload(); await page.waitForTimeout(1500);
const st = () => page.evaluate(() => document.querySelector('[data-voice-mode]')?.getAttribute('data-voice-state'));
const snap = async n => { await page.screenshot({ path: `${OUT}/v-${n}-${tag}.png` }); console.log(n, await st()); };
await t.go(`#/ai?line=${encodeURIComponent(sd.wsId)}`, 2500);
await page.locator('[data-voice-open]').click(); await page.waitForTimeout(1500);
await snap('1-listening-quiet');
for (const w of ['the wrapper', 'the wrapper keeps', 'the wrapper keeps breaking the film']) { await page.evaluate(x => window.__say(x, false), w); await page.waitForTimeout(160); }
await snap('2-listening-voice');
await page.evaluate(() => window.__say('the wrapper keeps breaking the film, how much did it cost us', true));
await page.waitForFunction(() => ['processing','preparing'].includes(document.querySelector('[data-voice-mode]')?.getAttribute('data-voice-state')), null, { timeout: 8000 }).catch(() => {});
await page.waitForTimeout(400); await snap('3-thinking');
await page.waitForFunction(() => document.querySelector('[data-voice-mode]')?.getAttribute('data-voice-state') === 'speaking', null, { timeout: 12000 }).catch(() => {});
await page.waitForTimeout(900); await snap('4-speaking');
await t.close?.(); process.exit(0);
