/* LUNA WITH THE REAL MODEL — the evaluation harness (11 November, docs/LUNA-EVAL.md). Rowland: "Prove Luna with the real model …
 * Do not claim that scripted tests prove real-model intelligence."
 *
 * Every acceptance script plays the model with a script; this one does not. It runs the real app in a test browser (the dev server,
 * its records in the browser's own storage — nobody's factory is touched) and sends every one of Luna's asks to the LIVE AI service,
 * through its check door (`x-check-key`, the database's own key; the gateway's `task: colleague` check — the same instructions,
 * schemas, refusals and audit as a person's ask, its cost kept as `colleague-check`). The capabilities run in the test browser as they
 * run on a phone. What Luna does is marked by the exam's own code (src/colleague/exam/investigation.ts), never by this script's opinion.
 *
 * Suites:
 *   bagger   the bagger investigation exam (#/ai/exam) — thirteen turns: the machine not known, which line, a project worked within,
 *            the stops timed live, an operators' estimate kept apart, a correction, a second problem, back to it, a chart and a cost,
 *            something she may not do, the next day in a new conversation.
 *
 *   LUNA_CHECK_KEY=… SMOKE_BASE=http://127.0.0.1:5191 NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
 *     node scripts/eval/luna-real.mjs OUT_DIR [--runs N]
 *
 * LUNA_CHECK_KEY is push_keys.cron_key — read from the database by whoever runs this, never written to a file or a commit. The run
 * writes OUT_DIR/luna-real-<when>.json (every turn: what was said, Luna's reply, her steps with their inputs and statuses, the marks
 * and why, the time each ask took) and prints the score. Exit 0 whatever the score: this measures, it does not gate. */
import fs from 'node:fs';
import path from 'node:path';
import { openApp } from '../lib/tocBrowser.mjs';

const KEY = process.env.LUNA_CHECK_KEY ?? '';
if (KEY.length < 20) { console.error('LUNA_CHECK_KEY is not set (push_keys.cron_key, read from the database).'); process.exit(2); }
const GATEWAY = process.env.LUNA_EVAL_URL ?? 'https://eqdigvzbljofxznqtfia.supabase.co/functions/v1/assist';
/* the project's public (anon) key — the same one the app is built with; it only lets the request reach the function */
const ANON = process.env.LUNA_EVAL_ANON ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZGlndnpibGpvZnh6bnF0ZmlhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwMzE3NjksImV4cCI6MjEwMTYwNzc2OX0.Mz6po1Qo46-C2KsuSbsSDuyyG7yM5X22yrpshXE5bwU';
const OUT = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'eval-out';
const RUNS = Number(process.argv[process.argv.indexOf('--runs') + 1]) > 0 && process.argv.includes('--runs') ? Number(process.argv[process.argv.indexOf('--runs') + 1]) : 1;
fs.mkdirSync(OUT, { recursive: true });
const CORS = { 'access-control-allow-origin': '*' };

const t = await openApp({ width: 1440, height: 900 });
const { page } = t;
await t.seed();

/** every ask to the live service, timed */
let asks = [];
await page.route('**/functions/v1/assist', async r => {
  const body = r.request().postDataJSON();
  if (body?.task !== 'colleague') return r.fulfill({ status: 200, contentType: 'application/json', headers: CORS, body: JSON.stringify({ off: true, why: 'Not part of the evaluation.' }) });
  const t0 = Date.now();
  let status = 0, text = '', type = 'application/json';
  for (let tries = 0; tries < 3; tries++) {
    try {
      const res = await fetch(GATEWAY, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${ANON}`, apikey: ANON, 'x-check-key': KEY }, body: JSON.stringify(body) });
      status = res.status; type = res.headers.get('content-type') ?? type; text = await res.text();
      if (status < 500) break;
    } catch (e) { text = JSON.stringify({ ok: false, why: `The evaluation could not reach the AI service: ${e?.cause?.code ?? e?.message ?? e}` }); status = 200; }
    await new Promise(z => setTimeout(z, 2000 * (tries + 1)));
  }
  let calls = [];
  try { calls = (JSON.parse(text).calls ?? []).map(c => c.name); } catch { /* streamed or not JSON */ }
  asks.push({ ms: Date.now() - t0, status, calls, pending: !!body.pending });
  return r.fulfill({ status, contentType: type, headers: CORS, body: text });
});

const results = [];
for (let run = 1; run <= RUNS; run++) {
  asks = [];
  const t0 = Date.now();
  await t.go('#/ai/exam', 2500);
  const before = await page.locator('[data-inv-history] li').count();
  await page.locator('[data-inv-start]').click();
  /* a run is done when its score is kept in the history */
  await page.waitForFunction(n => (document.querySelector('[data-inv-history]')?.querySelectorAll('li').length ?? 0) > n, before, { timeout: 40 * 60_000 }).catch(() => undefined);
  const kept = await page.evaluate(async () => {
    const db = await import('/src/db.ts');
    const convs = (await db.listAllStudies()).filter(s => s.facts?.investigationExam).sort((a, b) => (b.facts.investigationExam.at ?? 0) - (a.facts.investigationExam.at ?? 0));
    return convs[0]?.facts?.investigationExam ?? null;
  });
  const ms = asks.map(a => a.ms).sort((a, b) => a - b);
  const res = {
    suite: 'bagger', run, at: new Date().toISOString(), minutes: +((Date.now() - t0) / 60_000).toFixed(1),
    score: kept?.score ?? 'no score kept', turns: kept?.turns ?? [],
    asks: { count: asks.length, medianMs: ms[Math.floor(ms.length / 2)] ?? null, p90Ms: ms[Math.floor(ms.length * 0.9)] ?? null, maxMs: ms.at(-1) ?? null, failed: asks.filter(a => a.status >= 400).length },
  };
  results.push(res);
  console.log(`\nRUN ${run}: ${res.score} · ${res.minutes} min · ${res.asks.count} asks, median ${res.asks.medianMs} ms, p90 ${res.asks.p90Ms} ms`);
  for (const tr of res.turns) {
    console.log(`${tr.pass ? 'RIGHT' : 'WRONG'}  ${tr.id}  (${tr.ms} ms)  — “${(tr.reply ?? '').replace(/\s+/g, ' ').slice(0, 220)}”`);
    console.log(`        steps: ${(tr.steps ?? []).map(s => `${s.name}:${s.status}`).join(', ') || 'none'}`);
    for (const mk of tr.marks ?? []) if (!mk.pass) console.log(`        ✗ ${mk.what} — ${mk.said}`);
  }
}
const file = path.join(OUT, `luna-real-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
fs.writeFileSync(file, JSON.stringify(results, null, 2));
console.log(`\nKept: ${file}`);
await t.browser?.close?.();
process.exit(0);
