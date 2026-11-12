/* THE DEMONSTRATION, WITH THE REAL MODEL (12 November, docs/LUNA-DEMO.md). Rowland: "Good morning, Luna … a natural conversation …
 * then a real business question investigated with real information … Do not claim a capability works until it has been tested."
 *
 * The demonstration's conversation typed into the real app (a dev server, a test browser, its records in that browser only), every ask
 * sent to the LIVE AI service through its check door, exactly as scripts/eval/luna-real.mjs does. The workbook is the demonstration's
 * own (scripts/workbook/make-demo-workbook.mjs), its totals written as it was made — so whether a figure Luna says is right is decided
 * by code against figures she could not have seen. Marked by THIS script's rules below (each says what it checks); it measures, it
 * does not gate.
 *
 *   LUNA_CHECK_KEY=… SMOKE_BASE=http://127.0.0.1:5191 NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
 *     node scripts/eval/luna-demo.mjs OUT_DIR [--runs N]
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { openApp } from '../lib/tocBrowser.mjs';

const KEY = process.env.LUNA_CHECK_KEY ?? '';
if (KEY.length < 20) { console.error('LUNA_CHECK_KEY is not set (push_keys.cron_key, read from the database).'); process.exit(2); }
const GATEWAY = process.env.LUNA_EVAL_URL ?? 'https://eqdigvzbljofxznqtfia.supabase.co/functions/v1/assist';
const ANON = process.env.LUNA_EVAL_ANON ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZGlndnpibGpvZnh6bnF0ZmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzE3NjksImV4cCI6MjEwMTYwNzc2OX0.Mz6po1Qo46-C2KsuSbsSDuyyG7yM5X22yrpshXE5bwU';
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'eval-out';
const RUNS = process.argv.includes('--runs') ? Math.max(1, Number(process.argv[process.argv.indexOf('--runs') + 1]) || 1) : 1;
fs.mkdirSync(OUT, { recursive: true });
const CORS = { 'access-control-allow-origin': '*' };

const WB = path.join(OUT, 'Plant performance October 2026.xlsx');
execFileSync('node', ['scripts/workbook/make-demo-workbook.mjs', WB], { stdio: 'ignore' });
const EXP = JSON.parse(fs.readFileSync(`${WB}.expected.json`, 'utf8'));
const g = n => Math.round(n).toLocaleString('en-GB');
const has = (s, n) => s.replace(/,/g, '').includes(String(Math.round(Math.abs(n))));

/* every ask, timed, and the capabilities the model called in it */
let asks = [];
let t, page;
async function freshDevice() {
  if (t) await t.browser?.close?.().catch(() => undefined);
  t = await openApp({ width: 1440, height: 900 });
  page = t.page;
  await t.seed();
  await page.route('**/functions/v1/assist', async r => {
    const body = r.request().postDataJSON();
    if (body?.task !== 'colleague') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ off: true, why: 'Not part of the evaluation.' }) });
    const t0 = Date.now();
    let status = 0, text = '', type = 'application/json', firstMs = null;
    for (let tries = 0; tries < 3; tries++) {
      try {
        const res = await fetch(GATEWAY, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${ANON}`, apikey: ANON, 'x-check-key': KEY }, body: JSON.stringify(body) });
        status = res.status; type = res.headers.get('content-type') ?? type;
        if (type.startsWith('text/event-stream') && res.body) {
          const dec = new TextDecoder(); text = '';
          for await (const chunk of res.body) { text += dec.decode(chunk, { stream: true }); if (firstMs === null && text.includes('"delta"')) firstMs = Date.now() - t0; }
          text += dec.decode();
        } else text = await res.text();
        if (status < 500) break;
      } catch (e) { text = JSON.stringify({ ok: false, why: `The evaluation could not reach the AI service: ${e?.cause?.code ?? e?.message ?? e}` }); status = 200; type = 'application/json'; }
      await new Promise(z => setTimeout(z, 2000 * (tries + 1)));
    }
    const answer = () => {
      if (!type.startsWith('text/event-stream')) return JSON.parse(text);
      const ev = text.split('\n\n').map(b => b.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n')).filter(Boolean).map(d => { try { return JSON.parse(d); } catch { return null; } });
      return ev.filter(e => e && typeof e.delta !== 'string' && e.restart !== true).at(-1) ?? {};
    };
    let calls = [];
    try { calls = (answer().calls ?? []).map(c => ({ name: c.name, input: c.input })); } catch { /* not JSON */ }
    asks.push({ ms: Date.now() - t0, firstMs, status, calls });
    return r.fulfill({ status, contentType: type, headers: CORS, body: text });
  });
}

const replies = () => page.locator('.ai-turn.is-colleague');
async function say(words) {
  const n = await replies().count();
  const a0 = asks.length;
  const t0 = Date.now();
  await page.locator('.ai-box').fill(words);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await page.waitForFunction(k => document.querySelectorAll('.ai-turn.is-colleague').length > k && !document.querySelector('.ai-thinking'), n, { timeout: 4 * 60_000 }).catch(() => console.log('           (no reply settled in 4 min — thinking still shown, or a card waits)'));
  /* any card a person would say yes to here is none: this conversation only reads */
  await page.waitForTimeout(800);
  const reply = (await replies().last().innerText().catch(() => '')).trim();
  const checks = await replies().last().locator('[data-ai-fig-check]').allInnerTexts().catch(() => []);
  const mine = asks.slice(a0);
  /* said as it goes, so a run that stalls shows where (12 November: the first run printed nothing for forty minutes) */
  console.log(`\n[${new Date().toISOString().slice(11, 19)}] YOU   ${words}\n           LUNA  ${reply.replace(/\s+/g, ' ').slice(0, 700)}\n           steps: ${mine.flatMap(a => a.calls.map(c => c.name)).join(', ') || 'none'} · ${Math.round((Date.now() - t0) / 1000)} s · asks ${mine.length}${mine.some(a => a.status >= 400) ? ' (some failed)' : ''}`);
  /* the check door's own allowance spent: say so and stop — a run of refusals measures nothing and would only look like a hang */
  if (/the allowance comes back|answers in AI Mode today/i.test(reply)) { console.log('\nSTOPPED: the check allowance for today is spent (ASSIST_CHECK_DAILY_CALLS) — run again when it has come back.'); await t.browser?.close?.(); process.exit(3); }
  return { said: words, reply, calls: mine.flatMap(a => a.calls.map(c => c.name)), inputs: mine.flatMap(a => a.calls), checks, ms: Date.now() - t0, firstWordsMs: mine.find(a => a.firstMs !== null)?.firstMs ?? null, failed: mine.filter(a => a.status >= 400).length };
}
const mark = (what, pass, said) => ({ what, pass: !!pass, said });
const FEELINGS = /\bI(?:'m| am) (?:tired|excited|happy|sad|feeling)|\bmy (?:weekend|morning|coffee)\b|\bI (?:had|slept|enjoyed)\b/i;
const INTRO = /\bI(?:'m| am) Luna\b|\bmy name is Luna\b/i;
const words = s => s.split(/\s+/).filter(Boolean).length;

const results = [];
for (let run = 1; run <= RUNS; run++) {
  await freshDevice();
  asks = [];
  const t0 = Date.now();
  await t.go('#/ai', 2500);
  const turns = [];

  const hi = await say('Good morning, Luna.');
  hi.marks = [
    mark('Greets back', /morning|hello|hi\b/i.test(hi.reply), hi.reply.slice(0, 120)),
    mark('Runs nothing on a greeting', hi.calls.length === 0, hi.calls.join(', ') || 'nothing run'),
    mark('Short, as a colleague', words(hi.reply) <= 45, `${words(hi.reply)} words`),
    mark('No pretended feelings', !FEELINGS.test(hi.reply), 'checked for claims of feelings or a life'),
  ];
  turns.push(hi);

  const small = await say("Not bad thanks. Bit of a busy one — I've got the operations director coming in later. How are you?");
  small.marks = [
    mark('Answers the question, lightly and honestly', small.reply.length > 0 && !FEELINGS.test(small.reply), small.reply.slice(0, 160)),
    mark('Runs nothing on small talk', small.calls.length === 0, small.calls.join(', ') || 'nothing run'),
    mark('Does not introduce herself again', !INTRO.test(small.reply), 'checked for "I am Luna"'),
    mark('Short', words(small.reply) <= 60, `${words(small.reply)} words`),
  ];
  turns.push(small);

  /* the workbook attached as a person attaches one — through the composer's own control */
  await page.locator('input[aria-label="Choose a factory document"]').setInputFiles(WB);
  await page.waitForSelector('[data-workbook="read"]', { timeout: 2 * 60_000 }).then(() => console.log('           (workbook read)')).catch(() => console.log('           (the workbook was NOT read within 2 min)'));

  const ask = await say("That's actually why I wanted a word. Here's October's production workbook — plan against actual. There's a significant variance against plan. Can you find out why?");
  const vin = ask.inputs.find(c => c.name === 'explain_variance');
  ask.marks = [
    mark('Reads the workbook\'s structure first', ask.calls.includes('workbook_profile'), ask.calls.join(', ')),
    mark('Finds where the variance sits with the app (explain_variance)', !!vin, vin ? JSON.stringify(vin.input).slice(0, 200) : 'not called'),
    mark('Looks for the why in another sheet (the downtime log)', ask.inputs.some(c => (c.name === 'query_workbook' || c.name === 'explain_variance') && /downtime/i.test(JSON.stringify(c.input))), ask.inputs.filter(c => c.name === 'query_workbook').map(c => c.input?.sheet).join(', ') || 'no query_workbook'),
    mark(`Says the size of the variance (${g(-EXP.variance)} packs)`, has(ask.reply, EXP.variance) || /7\.9\s?%/.test(ask.reply), ask.reply.slice(0, 200)),
    mark('Says Line 3 carries most of it', /Line 3/.test(ask.reply), ''),
    mark('Names the Bagger or the packing area', /bagger|packing/i.test(ask.reply), ''),
    mark('Every figure is one the app worked out or was told (no Check this marks)', ask.checks.length === 0, ask.checks.join(' · ') || 'none marked'),
    mark('Keeps what is established apart from what is not (a cause said as a hypothesis, or what the workbook cannot tell)', /not (?:yet )?(?:proved|proven|established|tell|show|say)|hypothes|suggest|appears|likely|doesn['’]t (?:tell|show|say)|cannot (?:tell|say)|can['’]t (?:tell|say)/i.test(ask.reply), ''),
  ];
  turns.push(ask);

  const deeper = await say('How much of that is down to the stops on Line 3, and what has it cost us?');
  deeper.marks = [
    mark('Asks the app again (a query, a lookup or work_out)', deeper.calls.some(c => ['query_workbook', 'work_out', 'explain_variance', 'join_results'].includes(c)), deeper.calls.join(', ')),
    mark(`The contribution lost on Line 3 (£${g(EXP.line3ShortfallContribution)}) if money is given`, !/£/.test(deeper.reply) || has(deeper.reply, EXP.line3ShortfallContribution) || deeper.checks.length === 0, deeper.reply.match(/£[\d,.]+k?/g)?.join(' ') ?? 'no £'),
    mark('No figure marked Check this', deeper.checks.length === 0, deeper.checks.join(' · ') || 'none marked'),
  ];
  turns.push(deeper);

  const exec = await say("If I had to explain this to the managing director in two sentences, what would I say?");
  exec.marks = [
    mark('Two or three sentences', (exec.reply.match(/[.!?](\s|$)/g) ?? []).length <= 4, `${(exec.reply.match(/[.!?](\s|$)/g) ?? []).length} sentences`),
    mark('Says Line 3', /Line 3/.test(exec.reply), exec.reply.slice(0, 200)),
    mark('No figure marked Check this', exec.checks.length === 0, exec.checks.join(' · ') || 'none marked'),
  ];
  turns.push(exec);

  const all = turns.flatMap(x => x.marks);
  const res = { run, at: new Date().toISOString(), minutes: +((Date.now() - t0) / 60_000).toFixed(1), score: `${all.filter(m => m.pass).length} of ${all.length}`, turns, asks: { count: asks.length, failed: asks.filter(a => a.status >= 400).length } };
  results.push(res);
  console.log(`\nRUN ${run}: ${res.score} · ${res.minutes} min · ${res.asks.count} asks`);
  for (const tr of turns) {
    console.log(`\nYOU   ${tr.said}\nLUNA  ${tr.reply.replace(/\s+/g, ' ').slice(0, 900)}\n      steps: ${tr.calls.join(', ') || 'none'} · ${Math.round(tr.ms / 1000)} s (first words ${tr.firstWordsMs ?? '—'} ms)`);
    for (const mk of tr.marks) console.log(`      ${mk.pass ? 'RIGHT' : 'WRONG'}  ${mk.what}${mk.pass ? '' : ` — ${mk.said}`}`);
  }
}
const file = path.join(OUT, `luna-demo-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(results, null, 2));
console.log(`\nKept: ${file}`);
await t.browser?.close?.();
process.exit(0);
