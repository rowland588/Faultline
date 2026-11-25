/* Independent first-response checks on synthetic records. Stateful browser exams use luna-real.mjs. */
import Anthropic from '@anthropic-ai/sdk';
import { open, readFile } from 'node:fs/promises';
import { readColleagueAsk } from '../../supabase/functions/assist/colleague/colleagueAssist.ts';
import { lunaClaudeRequest, lunaModelSettings } from '../../supabase/functions/assist/colleague/colleagueRequest.ts';
import { CAPABILITY_SCHEMAS } from '../../supabase/functions/assist/colleague/schemas.ts';
import { costMicros } from '../../supabase/functions/assist/video/gatewayUsage.ts';

const cases = [
  { id: 'greeting', text: 'Good morning, Luna!', tools: [] },
  { id: 'thanks', text: 'Thank you, Luna.', tools: [] },
  { id: 'find-problems', text: 'List the open problems on the Packing line. Check Faultline for the records.', tools: ['list_problems', 'line_state', 'find'] },
  { id: 'workbook', text: 'Use the attached production workbook. Which of its lines had the highest downtime? Check the data before answering.', tools: ['query_workbook', 'list_sources', 'workbook_profile', 'workbook_rows'] },
];
const settings = lunaModelSettings(() => undefined);
const requests = cases.map(c => {
  const read = readColleagueAsk({ turns: [{ role: 'person', at: '09:00', text: c.text }], today: 'Monday',
    focus: c.id === 'workbook' ? 'Synthetic test workbook: Production, file id demo-data, sheet Runs, columns Line and Downtime minutes.' : '' });
  if (!read.ok) throw new Error(read.why);
  const { params } = lunaClaudeRequest(read.ask, CAPABILITY_SCHEMAS, settings, true);
  // Score the selected model's first response. Provider fallback would make the comparison ambiguous.
  const { betas: _betas, fallbacks: _fallbacks, ...request } = params;
  return { custom_id: c.id, params: { ...request, max_tokens: Math.min(request.max_tokens, 1500) } };
});

const [mode = 'plan', receipt] = process.argv.slice(2);
if (mode === 'plan') {
  console.log('Synthetic checks prepared locally. No Claude request sent.');
  console.table(requests.map(r => ({ check: r.custom_id, model: r.params.model, outputLimit: r.params.max_tokens })));
} else {
  if (!['submit', 'results'].includes(mode) || !receipt) throw new Error('Usage: luna-batch.mjs plan | submit RECEIPT.json | results RECEIPT.json');
  const apiKey = process.env.LUNA_BATCH_EVAL_KEY;
  if (!apiKey) throw new Error('Set LUNA_BATCH_EVAL_KEY to an Anthropic test workspace key with its own spending limit.');
  const api = new Anthropic({ apiKey, maxRetries: 0 });
  if (mode === 'submit') {
    // Exclusive creation also blocks an accidental repeat after a connection drops during submission.
    const file = await open(receipt, 'wx');
    try {
      await file.writeFile(JSON.stringify({ status: 'submitting', created: new Date().toISOString() }) + '\n');
      await file.sync();
      const batch = await api.messages.batches.create({ requests });
      await file.truncate(0);
      await file.write(JSON.stringify({ id: batch.id, created: batch.created_at }) + '\n', 0, 'utf8');
      console.log('Submitted', batch.id, '— read this batch with results', receipt);
    } finally { await file.close(); }
  } else {
    const { id } = JSON.parse(await readFile(receipt, 'utf8'));
    if (!id) throw new Error('No batch ID recorded. Check recent batches in the test workspace before submitting again.');
    const batch = await api.messages.batches.retrieve(id);
    console.log(batch.id, batch.processing_status, batch.request_counts);
    if (batch.processing_status === 'ended') {
      let micros = 0;
      const seen = new Set();
      let passed = 0;
      for await (const row of await api.messages.batches.results(id)) {
        const c = cases.find(c => c.id === row.custom_id);
        if (!c || seen.has(c.id)) throw new Error('Unexpected or duplicate result: ' + row.custom_id);
        seen.add(c.id);
        if (row.result.type !== 'succeeded') { console.log('FAIL', c.id, row.result.type); continue; }
        const m = row.result.message;
        micros += costMicros(m.model, m.usage) * 0.5;
        const tools = m.content.filter(b => b.type === 'tool_use').map(b => b.name);
        const reply = m.content.filter(b => b.type === 'text').map(b => b.text).join(' ').trim();
        const ok = c.tools.length ? m.stop_reason === 'tool_use' && tools.some(t => c.tools.includes(t))
          : m.stop_reason === 'end_turn' && !tools.length && reply.length > 0;
        if (ok) passed++;
        console.log(ok ? 'PASS' : 'FAIL', c.id, m.model, tools.length ? tools.join(', ') : m.stop_reason);
      }
      console.log(passed + '/' + cases.length + ' first responses passed. Estimated batch cost $' + (micros / 1e6).toFixed(4));
      if (passed !== cases.length || seen.size !== cases.length) process.exitCode = 1;
    }
  }
}
