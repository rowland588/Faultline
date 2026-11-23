/* LUNA IN THE ROOM — TV, voice, Present (23 November, docs/LUNA-ROOM.md M4, docs/LUNA-ABILITIES.md M1/M4): mocked gateway —
 * attach a workbook, voice asks about it, a report is built on a card, Put on screen at #/ai/present with charts as the app draws them,
 * voice with spoken:true adds a section from a query while the report stays on screen (figure checked against the workbook). */
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const dir = mkdirSync(join(tmpdir(), `luna-room-${Date.now()}`), { recursive: true });
const wb = join(dir, 'packing line 2 downtime.xlsx');
execFileSync('node', ['scripts/workbook/make-workbook.mjs', wb, '400', '8'], { stdio: 'ignore' });
const exp = JSON.parse(readFileSync(`${wb}.expected.json`, 'utf8'));

const t = await openApp({ width: 1440, height: 900 });
const { page, ok } = t;
await page.addInitScript(() => {
  class FakeRec {
    constructor() { this.lang = ''; this.continuous = false; this.interimResults = false; this.maxAlternatives = 1; this.onresult = null; this.onerror = null; this.onend = null; this.running = false; this.results = []; }
    start() { this.running = true; window.__ear = this; window.__earStarts = (window.__earStarts ?? 0) + 1; }
    stop() {
      if (!this.running) { setTimeout(() => this.onend?.(), 0); return; }
      this.running = false;
      const last = this.results[this.results.length - 1];
      if (last && !last.isFinal) { this.results[this.results.length - 1] = { 0: { transcript: last[0].transcript }, length: 1, isFinal: true }; this.onresult?.({ results: [...this.results] }); }
      setTimeout(() => this.onend?.(), 30);
    }
    abort() { this.running = false; setTimeout(() => this.onend?.(), 0); }
  }
  const res = (tx, isFinal) => ({ 0: { transcript: tx }, length: 1, isFinal });
  window.__FakeRec = FakeRec;
  window.SpeechRecognition = FakeRec; window.webkitSpeechRecognition = FakeRec;
  window.__say = (tx, final = true) => {
    const r = window.__ear; if (!r?.running) return false;
    if (r.results.length && !r.results[r.results.length - 1].isFinal) r.results.pop();
    r.results.push(res(tx, final)); r.onresult?.({ results: [...r.results] }); return true;
  };
  window.__spoken = []; window.__speakMs = 350;
  const synth = {
    speaking: false, cur: null, speak(u) {
      window.__spoken.push(u.text); this.cur = u; this.speaking = true;
      setTimeout(() => { this.cur = null; this.speaking = false; u.onend?.({}); }, window.__speakMs);
    },
    cancel() { this.cur = null; this.speaking = false; },
    getVoices: () => [{ voiceURI: 'gb-1', name: 'UK', lang: 'en-GB', localService: true, default: true }],
    addEventListener() {}, removeEventListener() {},
  };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  class U { constructor(tx) { this.text = tx; } }
  window.SpeechSynthesisUtterance = U;
});
await t.seed();
const CORS = { 'access-control-allow-origin': '*' };
const asks = [];
let plan = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  asks.push(body);
  const next = plan.shift();
  const answer = next ? next(body) : { ok: true, reply: 'Noted.' };
  if (answer.delay) await new Promise(res => setTimeout(res, answer.delay));
  return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify(answer) });
});
let replies = 0;
const answered = async (ms = 20000) => {
  replies++;
  for (const until = Date.now() + ms; plan.length && Date.now() < until;) await page.waitForTimeout(100);
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length >= k && !document.querySelector('.ai-thinking'), replies, { timeout: ms }).catch(() => undefined);
  await page.waitForTimeout(700);
};
const send = async words => { await page.locator('.ai-box').fill(words); await page.getByRole('button', { name: 'Send', exact: true }).click(); };
const result = (b, i = 0) => b.pending?.results?.[i];
const calls = (...cs) => () => ({ ok: true, reply: '', assistant: { v: 1 }, calls: cs.map(([id, name, input]) => ({ id, name, input })) });
const then = reply => () => ({ ok: true, reply });
const outs = () => page.evaluate(async () => {
  const d = await import('/src/db.ts');
  const s = (await d.listAllStudies()).filter(x => x.tool === 'talk' && x.facts?.colleague).sort((a, b) => b.updatedAt - a.updatedAt)[0];
  return { id: s?.id, results: s?.facts?.results ?? [], charts: s?.facts?.charts ?? [], reports: s?.facts?.reports ?? [], sessionFocus: s?.facts?.sessionFocus, sources: s?.facts?.sources ?? [] };
});
const say = (tx, final = true) => page.evaluate(([a, f]) => window.__say(a, f), [tx, final]);
const waitVoice = async (s, ms = 10000) => page.waitForFunction(x => document.querySelector('[data-voice-mode]')?.getAttribute('data-voice-state') === x, s, { timeout: ms }).catch(() => undefined);

await t.go('#/ai', 2500);
await page.waitForSelector('input[aria-label="Choose a factory document"]', { state: 'attached', timeout: 30000 });

/* 1 · workbook attached — first look in the app */
await page.locator('input[aria-label="Choose a factory document"]').setInputFiles(wb);
await page.waitForSelector('.ai-turn.is-colleague [data-ai-code]', { timeout: 60000 }).catch(() => undefined);
await page.waitForFunction(async () => {
  const list = await (await import('/src/capabilities/data.ts')).allSources();
  return list.some(s => s.facts.fileName === 'packing line 2 downtime.xlsx');
}, null, { timeout: 30000 });
await page.waitForTimeout(400);
let WB = await page.evaluate(async () => {
  const list = await (await import('/src/capabilities/data.ts')).allSources();
  return list.find(s => s.facts.fileName === 'packing line 2 downtime.xlsx')?.id ?? '';
});
ok(WB, `1 workbook attached — source ${WB}`);
let R1 = '';
let CH = '';
let REP = '';

plan = [
  calls(['q', 'query_data', { source: WB, sheet: 'Downtime', title: 'Minutes by reason', groupBy: ['Reason'], measures: [{ op: 'sum', column: 'Minutes' }] }]),
  b => { R1 = result(b)?.data?.resultId ?? ''; return calls(['c', 'make_chart', { resultId: R1, type: 'column', title: 'Downtime by reason' }])(); },
  then('This would make a good report for the room — say yes and I will build it.'),
];

/* 2 · voice asks about the workbook */
await page.locator('[data-voice-open]').click();
await waitVoice('listening');
const beforeVoice = asks.length;
await say('what stands out in that workbook for the TV');
await page.waitForTimeout(2800);
ok(asks.length >= beforeVoice, '2 voice sent a spoken turn');
const voiceAsk = asks.find((a, i) => i >= beforeVoice && a.spoken === true);
ok(voiceAsk?.spoken === true, '2 spoken:true on the voice request');
await answered();

const o1 = await outs();
CH = o1.charts.at(-1)?.id ?? '';
ok(R1 && CH, '2 query and chart kept from the voice ask');

/* 3 · yes — build_report on card */
plan = [
  calls(['b', 'build_report', { title: 'Packing line 2 — downtime for the room', sections: [{ kind: 'chart', heading: 'Downtime by reason', chartId: CH }, { kind: 'summary', heading: 'In short', text: 'The workbook’s downtime log for packing line 2.', evidence: [R1] }] }]),
  b => { REP = result(b)?.data?.reportId ?? ''; return then('The report is ready — Put on screen when you are.')(); },
];
await page.locator('[data-voice-chat]').click();
await page.waitForFunction(() => !document.querySelector('[data-voice-mode]'), null, { timeout: 5000 });
await send('Yes — create the report.');
await answered();
ok(REP, `3 build_report made report ${REP}`);

const presentBtn = page.locator('[data-put-on-screen], [data-report-present]').last();
ok((await presentBtn.count()) >= 1 && /Put on screen/.test(await presentBtn.innerText()), '3 the report card offers Put on screen');
await presentBtn.click();
await page.waitForFunction(() => location.hash.startsWith('#/ai/present'), { timeout: 8000 });
const cid = (await outs()).id;
const hash = await page.evaluate(() => location.hash);
ok(hash.includes(`reportId=${REP}`) && hash.includes(`c=${encodeURIComponent(cid)}`), `4 Present opens #/ai/present — ${hash}`);

const stage = page.locator('[data-luna-present]');
await stage.waitFor({ state: 'visible', timeout: 8000 });
ok((await stage.getAttribute('data-report-present')) === REP, '4 fullscreen names the report on screen');
const img = stage.locator('.ai-chart-img').first();
const bagMin = exp.minutesByReason['Bag presentation'];
const bagPat = bagMin == null ? '' : String(bagMin).replace(/\./, '\\.');
ok((await img.count()) === 1 && (bagPat ? new RegExp(`Bag presentation\\s+${bagPat}`).test(await img.getAttribute('alt') ?? '') : false), '4 chart readable at distance — figures in the picture');

const stored = await outs();
ok(stored.sessionFocus?.reportId === REP, '4 session focus names the report (M1)');
ok((await page.locator('[data-voice-mic-present]').count()) >= 1, '4 microphone control on the present surface');
ok((await page.locator('[data-voice-mode], [data-voice-bar]').count()) >= 1, '4 voice bar available beside the report');

/* 5 · voice-driven section change while Present stays up */
const v0 = await stage.getAttribute('data-report-version');
const beforePresent = asks.length;
let R2 = '';
plan = [
  calls(['q', 'query_data', { source: WB, sheet: 'Downtime', title: 'Rows by shift', groupBy: ['Shift'], measures: [{ op: 'count' }] }]),
  b => {
    const r2 = result(b)?.data?.resultId ?? '';
    R2 = r2;
    const nights = exp.rowsByShift?.Nights ?? 0;
    const days = exp.rowsByShift?.Days ?? 0;
    return calls(['b2', 'build_report', { reportId: REP, op: 'add', section: { kind: 'finding', heading: 'Nights vs days', text: `Nights carries ${nights} rows against ${days} on days — from the workbook.`, evidence: [r2] } }])();
  },
  then('I have added that finding to the report on screen.'),
];
await page.locator('[data-voice-mic-present]').click();
await waitVoice('listening', 8000);
await say('add a finding about nights versus days from the workbook');
await page.waitForTimeout(3200);
await answered(45000);
ok(plan.length === 0, `5 gateway finished (${asks.length - beforePresent} asks)`);
await page.waitForFunction(async repId => {
  const d = await import('/src/db.ts');
  const s = (await d.listAllStudies()).find(x => x.tool === 'talk' && x.facts?.colleague);
  return !!s?.facts?.reports?.find(r => r.id === repId)?.sections?.some(sec => /Nights vs days/i.test(sec.heading));
}, REP, { timeout: 20000 });
const onScreen = await page.evaluate(async ([repId]) => {
  const d = await import('/src/db.ts');
  const s = (await d.listAllStudies()).find(x => x.tool === 'talk' && x.facts?.colleague);
  const rep = s?.facts?.reports?.find(r => r.id === repId);
  const sec = rep?.sections?.find(x => /Nights vs days/i.test(x.heading));
  const el = document.querySelector('[data-luna-present]');
  return { hash: location.hash, domV: el?.getAttribute('data-report-version'), repV: rep?.version, heading: sec?.heading ?? '', text: sec?.text ?? '' };
}, [REP]);
ok(/Nights vs days/i.test(onScreen.heading) && /Nights carries/.test(onScreen.text) && onScreen.text.includes(String(exp.rowsByShift.Nights)) && onScreen.text.includes(String(exp.rowsByShift.Days)),
  `5 voice-driven section while Present is up (report v${onScreen.repV}, hash ${onScreen.hash}) — ${onScreen.text.slice(0, 120)}`);
ok(asks.some((a, i) => i >= beforePresent && a.spoken === true), '5 a further spoken turn from the room');

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
const clipped = await page.$$eval('[data-voice-mic-present], .lr-present-exit', els => els.filter(e => e.getBoundingClientRect().width < 44 || e.getBoundingClientRect().height < 44).map(e => e.hasAttribute('data-voice-mic-present') ? 'Talk' : 'Exit'));
ok(clipped.length === 0, `6 on a phone Talk and Exit are 44px — ${clipped.join(', ')}`);

await t.finish('Luna in the room: workbook, voice, report on screen for TV, section updated by voice.');