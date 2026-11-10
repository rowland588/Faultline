/* ACCEPTANCE — THE VOICE BAR (10 November, docs/LUNA-WORKSPACE.md W6 — Rowland: "Keep the longer-term hands-free voice vision in
 * mind"; "Luna must genuinely persist across navigation … voice interaction wherever technically supported"). The phone's recognition and
 * voice played by the script (as voice.mjs), the gateway answered by the script:
 *
 *   1  beside a page, Voice opens a BAR at the foot — the page still in view (its tabs, nothing covered above the bar), listening
 *   2  a turn said into the bar is sent into the same conversation (spoken), answered and said out loud
 *   3  the person goes to another page while talking: the bar stays, still listening, on the new page
 *   4  Full screen opens the immersive voice; Escape puts it back to the bar; End closes it
 *   5  a phone: the bar above the menu bar, presses 44 px, nothing off the side
 *
 *   node scripts/acceptance/luna-voice-bar.mjs   (SMOKE_BASE, as smoke) */
import { openApp } from '../lib/tocBrowser.mjs';

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
await page.reload(); await page.waitForTimeout(1500);
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(next ? next(body) : { ok: true, reply: 'Yes.', model: 'test' }) });
});
const say = (tx, final = true) => page.evaluate(([a, f]) => window.__say(a, f), [tx, final]);
const state = () => page.evaluate(() => document.querySelector('[data-voice-mode]')?.getAttribute('data-voice-state') ?? '');
const waitState = async (s, ms = 6000) => { await page.waitForFunction(x => document.querySelector('[data-voice-mode]')?.getAttribute('data-voice-state') === x, s, { timeout: ms }).catch(() => undefined); return state(); };
const lineHash = `#/lines/${encodeURIComponent(sd.wsId)}`;

/* ---- 1 · a bar beside a page ---- */
await t.go(lineHash, 2500);
await page.evaluate(async () => (await import('/src/colleague/lunaPanel.ts')).setLunaPanel('open'));
await page.waitForTimeout(1500);
await page.locator('[data-luna-panel] [data-voice-open]').click();
ok((await page.locator('[data-voice-bar]').count()) === 1 && (await waitState('listening')) === 'listening', `1 Voice beside a page opens a bar, listening (${await state()})`);
const bar = await page.locator('[data-voice-bar]').boundingBox();
ok(!!bar && bar.y > 600 && bar.height <= 140 && (await page.locator('.nv-tabs .nv-tab').first().isVisible()), `1 at the foot, the page in view above it (${Math.round(bar?.y ?? 0)}, ${Math.round(bar?.height ?? 0)} px tall)`);

/* ---- 2 · said, answered, said back ---- */
plan = [() => ({ ok: true, reply: 'One problem is open on the line.', model: 'test' })];
await say('what is open here');
await page.waitForTimeout(2800);
ok(asks.some(b => b.spoken === true && (b.turns ?? []).some(x => /what is open here/i.test(x.text ?? ''))), '2 the turn said into the bar sent, spoken');
await page.waitForFunction(() => window.__spoken.some(x => /One problem is open/.test(x)), null, { timeout: 8000 }).catch(() => undefined);
ok(await page.evaluate(() => window.__spoken.some(x => /One problem is open/.test(x))), '2 the answer said out loud');
ok(/One problem is open/.test(await t.words('[data-luna-panel] .ai-turn.is-colleague')), '2 and written in the conversation beside the page');

/* ---- 3 · another page, still talking ---- */
await page.evaluate(() => { location.hash = '#/tools'; }); await page.waitForTimeout(2000);
ok((await page.locator('[data-voice-bar]').count()) === 1 && /^#\/tools/.test(await page.evaluate(() => location.hash)), '3 on Tools: the bar still there');
const s3 = await waitState('listening', 8000);
ok(s3 === 'listening', `3 still listening on the new page (${s3})`);

/* ---- 4 · full screen and back; End ---- */
await page.locator('[data-voice-full]').click(); await page.waitForTimeout(500);
ok((await page.locator('.vm[data-voice-mode]').count()) === 1 && (await page.locator('[data-voice-bar]').count()) === 0, '4 Full screen: the immersive voice');
await page.keyboard.press('Escape'); await page.waitForTimeout(500);
ok((await page.locator('[data-voice-bar]').count()) === 1, '4 Escape: back to the bar');
await page.locator('[data-voice-end]').click(); await page.waitForTimeout(800);
ok((await page.locator('[data-voice-mode]').count()) === 0, '4 End closes it');

/* ---- 5 · a phone ---- */
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate(async () => (await import('/src/colleague/lunaPanel.ts')).setLunaPanel('open'));
await page.waitForTimeout(1200);
await page.locator('[data-luna-panel] [data-voice-open]').click(); await page.waitForTimeout(800);
const pb = await page.locator('[data-voice-bar]').boundingBox();
const small = await page.evaluate(() => [...document.querySelectorAll('[data-voice-bar] button')].filter(b => b.getBoundingClientRect().height < 44).length);
ok(!!pb && small === 0 && (await t.wide()) <= 0, `5 a phone: the bar's presses 44 px, nothing off the side (${small} small)`);
await page.locator('[data-voice-end]').click(); await page.waitForTimeout(500);

await t.finish('The voice bar — talk with Luna over any page, the work in view, carried from page to page; full screen when wanted.');
