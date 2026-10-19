/* THE GATEWAY, ON RECORDED ANSWERS — no network, no key.
 *
 * A proposal the assistant gave (a recorded answer, as the API returns it)
 * read into a method the app can run; a refusal, an answer cut short and an
 * unreadable one each said in words; a proposal that names things the app
 * does not have, or a step in a later stage, losing them rather than being
 * trusted; the schema the API holds it to closed at every level; what an
 * answer costs and when a person's day is used up; the device reading the
 * gateway's answer again; and the gateway's copies of these files the same
 * as the app's. */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DETAIL_SCHEMA, OUTLINE_SCHEMA, PROPOSAL_SCHEMA, STEP_SCHEMA, fromProposal, joinDesign, withoutDetail } from '../proposal';
import { DESIGN_SYSTEM, OUTLINE_NOTE, allowance, costMicros, designUser, readDesign, readJoined, readPass } from '../assistCore';
import { DETAIL_ROUND_MS, MOST_ALONE, designInPasses, stageAsk, stepAsk, type Pass } from '../designPasses';
import { readGateway } from '../assist';
import { validateDefinition } from '../validate';
import { readFlow } from '../runtime';

/** A recorded answer: the shape the API sends back with structured outputs. */
const recorded = {
  name: 'New tray sealer — commissioning',
  purpose: 'Take the new tray sealer and case packer from delivery to handover, proved at the agreed speed.',
  kind: 'stagegate',
  roles: [{ name: 'OEM engineer', side: 'supplier' }, { name: 'Site engineer', side: 'site' }, { name: 'Quality', side: 'site' }],
  stages: [
    {
      name: 'Install', purpose: 'Each machine in place, connected and dry-run.',
      steps: [
        { title: 'Positioned and levelled', per: 'machine', answer: 'done', role: 'OEM engineer', passes_if: '', photos: 1, files: 0, due_days: 3, after: [], fields: [], help: 'Photo of the level on the frame.' },
        { title: 'Power and air connected', per: 'machine', answer: 'done', role: 'Site engineer', passes_if: '', photos: 0, files: 0, due_days: 4, after: ['Positioned and levelled'], fields: [], help: '' },
        { title: 'Electrical test certificate', per: 'machine', answer: 'paperwork', role: 'Site engineer', passes_if: '', photos: 0, files: 1, due_days: null, after: [], fields: [], help: '' },
      ],
      gate: [
        { type: 'stepsDone', policy: 'block', step: '', field: '', op: '>=', value: null, value2: null, evidence: 'photo', min: null, priority: 'any', due_days: null, label: '' },
        { type: 'manual', policy: 'block', step: '', field: '', op: '>=', value: null, value2: null, evidence: 'photo', min: null, priority: 'any', due_days: null, label: 'Area guarded and signed off by safety' },
      ],
    },
    {
      name: 'Prove it', purpose: 'Run at the agreed speed with product.',
      steps: [
        {
          title: 'Performance run', per: 'line', answer: 'measure', role: 'OEM engineer', passes_if: '60 packs a minute for two hours', photos: 0, files: 0, due_days: 14, after: ['Power and air connected'],
          fields: [
            { label: 'Packs made', type: 'number', unit: 'packs', min: null, max: null, options: [], formula: '', required: true },
            { label: 'Minutes run', type: 'reading', unit: 'min', min: 120, max: null, options: [], formula: '', required: true },
            { label: 'Rate', type: 'calc', unit: 'packs/min', min: null, max: null, options: [], formula: 'packs_made / minutes_run', required: false },
          ],
          help: '',
        },
        { title: 'Quality sign-off', per: 'line', answer: 'signoff', role: 'Quality', passes_if: '', photos: 0, files: 0, due_days: null, after: ['Performance run'], fields: [], help: '' },
      ],
      gate: [
        { type: 'fieldMeets', policy: 'block', step: 'Performance run', field: 'Rate', op: '>=', value: 60, value2: null, evidence: 'photo', min: null, priority: 'any', due_days: null, label: '' },
        { type: 'signedOff', policy: 'block', step: 'Quality sign-off', field: '', op: '>=', value: null, value2: null, evidence: 'photo', min: null, priority: 'any', due_days: null, label: '' },
        { type: 'noOpenProblems', policy: 'warn', step: '', field: '', op: '>=', value: null, value2: null, evidence: 'photo', min: null, priority: 'critical', due_days: null, label: '' },
      ],
    },
  ],
  assumptions: ['Two machines, both new.', 'The agreed speed is 60 packs a minute.'],
  questions: ['What reject rate is acceptable on the performance run?'],
};
const message = (text: string, stop = 'end_turn') => ({ id: 'msg', type: 'message', role: 'assistant', model: 'claude-opus-5-5', stop_reason: stop, content: [{ type: 'text', text }], usage: { input_tokens: 2100, output_tokens: 3400 } });

describe('a recorded answer, read into a method', () => {
  it('becomes a method the app can run: keys from its words, references found, checked', () => {
    const r = readDesign(message(JSON.stringify(recorded)));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.errors).toEqual([]);
    const d = r.proposed.def;
    expect(d.roles.map(x => `${x.key}:${x.side}`)).toEqual(['oem-engineer:supplier', 'site-engineer:site', 'quality:site']);
    expect(d.stages.map(s => s.key)).toEqual(['install', 'prove-it']);
    const run = d.stages[1].steps[0];
    expect(run).toMatchObject({ key: 'performance-run', per: 'line', answer: 'measure', role: 'oem-engineer', dueDays: 14, after: ['power-and-air-connected'] });
    expect(run.fields?.map(f => f.key)).toEqual(['packs_made', 'minutes_run', 'rate']);
    expect(d.stages[1].gate.conditions[0]).toMatchObject({ type: 'fieldMeets', step: 'performance-run', field: 'rate', op: '>=', value: 60 });
    expect(d.stages[0].gate.conditions[1]).toMatchObject({ type: 'manual', label: 'Area guarded and signed off by safety' });
    expect(r.proposed.assumptions).toHaveLength(2);
    expect(r.proposed.questions[0]).toMatch(/reject rate/);
    /* and it runs: the runtime reads a project on it, its rate worked out by the app */
    const s = readFlow({ def: d, machines: [{ id: 'm1', name: 'Tray sealer' }], today: '2026-10-20', startedOn: '2026-10-01',
      records: [{ id: 'r', projectId: 'P', kind: 'step', stageKey: 'prove-it', stepKey: 'performance-run', version: 1, outcome: 'done', doneOn: '2026-10-15', values: { packs_made: 7800, minutes_run: 130 }, sort: 0, createdAt: 1, updatedAt: 1 }] });
    expect(s.stages[1].steps[0].values.rate).toBe(60);
  });

  it('says a refusal, an answer cut short and an unreadable one, each in words', () => {
    expect(readDesign(message('', 'refusal'))).toMatchObject({ ok: false, why: expect.stringMatching(/would not propose/) });
    expect(readDesign(message('{"name":', 'max_tokens'))).toMatchObject({ ok: false, why: expect.stringMatching(/too long/) });
    expect(readDesign(message('not json'))).toMatchObject({ ok: false, why: expect.stringMatching(/could not be read/) });
    expect(readDesign({})).toMatchObject({ ok: false });
  });

  it('drops what the app does not have, and never lets a gate read a later stage', () => {
    const odd = structuredClone(recorded) as unknown as Record<string, unknown> & { stages: Record<string, unknown>[] };
    (odd as Record<string, unknown>).script = 'rm -rf /';
    odd.stages[0].steps = [...(odd.stages[0].steps as unknown[]), { title: 'Mystery', per: 'sideways', answer: 'telepathy', role: 'Nobody', photos: -3, files: 'x', fields: [{ label: 'X', type: 'hologram' }] }];
    odd.stages[0].gate = [...(odd.stages[0].gate as unknown[]), { type: 'stepDone', policy: 'block', step: 'Performance run' }, { type: 'launchMissiles', policy: 'block' }];
    const { def } = fromProposal(odd);
    expect(JSON.stringify(def)).not.toMatch(/rm -rf|launchMissiles|telepathy|hologram/);
    const mystery = def.stages[0].steps.find(s => s.title === 'Mystery');
    expect(mystery).toMatchObject({ per: 'line', answer: 'done' });
    expect(mystery?.role).toBeUndefined();
    expect(mystery?.evidence).toBeUndefined();
    expect(mystery?.fields?.[0].type).toBe('text');
    /* "Performance run" is in the stage after: the condition is left out, not trusted */
    expect(def.stages[0].gate.conditions.some(c => c.type === 'stepDone')).toBe(false);
    expect(validateDefinition(def).ok).toBe(true);
  });

  it('a stage the assistant left without a gate still waits on its steps', () => {
    const { def } = fromProposal({ name: 'M', purpose: 'p', kind: 'other', roles: [], stages: [{ name: 'Only', purpose: '', steps: [{ title: 'Do it', per: 'line', answer: 'done' }], gate: [] }] });
    expect(def.stages[0].gate.conditions).toEqual([{ id: 'every-step', type: 'stepsDone', policy: 'block' }]);
  });
});

describe('the schema the API holds the answer to', () => {
  it('is closed at every level — every object lists every property and allows no other', () => {
    const walk = (s: unknown, path: string): string[] => {
      if (!s || typeof s !== 'object') return [];
      const o = s as Record<string, unknown>;
      const bad: string[] = [];
      if (o.type === 'object') {
        const props = Object.keys(o.properties as object);
        if (o.additionalProperties !== false) bad.push(`${path} allows more`);
        if (JSON.stringify([...(o.required as string[])].sort()) !== JSON.stringify([...props].sort())) bad.push(`${path} required ≠ properties`);
        for (const [k, v] of Object.entries(o.properties as object)) bad.push(...walk(v, `${path}.${k}`));
      }
      if (o.type === 'array') bad.push(...walk(o.items, `${path}[]`));
      for (const a of (o.anyOf as unknown[] | undefined) ?? []) bad.push(...walk(a, path));
      return bad;
    };
    expect(walk(PROPOSAL_SCHEMA, '$')).toEqual([]);
    expect(JSON.stringify(PROPOSAL_SCHEMA)).not.toMatch(/minimum|maximum|minLength|maxLength/);
    /* the two passes the assistant is held to, by the same rules */
    expect(walk(OUTLINE_SCHEMA, '$')).toEqual([]);
    expect(walk(DETAIL_SCHEMA, '$')).toEqual([]);
  });

  it('tells the assistant the floor’s rules: measured by people, no OEE, no invented figures', () => {
    expect(DESIGN_SYSTEM).toMatch(/Nothing reads a machine\. Never use OEE/);
    expect(DESIGN_SYSTEM).toMatch(/Never invent a figure/);
    expect(designUser('x'.repeat(5000)).length).toBeLessThan(4100);
  });
});

/* THE DESIGN IN TWO PASSES (19 October: the whole proposal's schema is "too
   large" for the API to hold the assistant to) — the outline and each step's
   detail, joined into the one shape: the same method as one answer would be */
describe('a design in two passes', () => {
  type Step = Record<string, unknown>;
  const DETAIL = ['fields', 'columns', 'analyses', 'min_entries', 'only_if'];
  const stepKeys = (s: unknown) => Object.keys(((s as { properties: Record<string, { items: { properties: Record<string, { items: { properties: Record<string, { items: { properties: object } }> } }> } }> }).properties.stages.items.properties.steps.items.properties));
  const split = (p: typeof recorded) => ({
    outline: { ...p, stages: p.stages.map(st => ({ ...st, steps: st.steps.map(sp => Object.fromEntries(Object.entries(sp).filter(([k]) => !DETAIL.includes(k)))) })) },
    detail: { steps: p.stages.flatMap(st => st.steps.map(sp => ({ stage: st.name, title: sp.title, ...Object.fromEntries(Object.entries(sp).filter(([k]) => DETAIL.includes(k))) }))) },
  });

  it('the outline and the detail are the whole step between them, and nothing else', () => {
    const outline = stepKeys(OUTLINE_SCHEMA), detail = Object.keys((DETAIL_SCHEMA as unknown as { properties: { steps: { items: { properties: object } } } }).properties.steps.items.properties);
    expect(outline.filter(k => detail.includes(k))).toEqual(['title']);
    expect([...new Set([...outline, ...detail.filter(k => k !== 'stage')])].sort()).toEqual(stepKeys(PROPOSAL_SCHEMA).sort());
    expect(detail.filter(k => k !== 'stage' && k !== 'title').sort()).toEqual([...DETAIL].sort());
  });

  it('joined, they are the method one answer would have been', () => {
    const { outline, detail } = split(recorded);
    const one = readDesign(message(JSON.stringify(recorded)));
    const two = readJoined(joinDesign(outline, detail));
    expect(one.ok && two.ok).toBe(true);
    if (!one.ok || !two.ok) return;
    expect(two.proposed.def).toEqual(one.proposed.def);
    expect(two.errors).toEqual(one.errors);
  });

  it('a detail is found by its title when its stage was renamed, used once, and a step with none is given an empty one', () => {
    const { outline, detail } = split(recorded);
    const renamed = { steps: detail.steps.map(d => ({ ...d, stage: 'Somewhere else' })) };
    expect(readJoined(joinDesign(outline, renamed))).toEqual(readJoined(joinDesign(outline, detail)));
    const none = joinDesign(outline, { steps: [] }) as { stages: { steps: Step[] }[] };
    expect(none.stages[1].steps[0]).toMatchObject({ fields: [], columns: [], analyses: [], min_entries: null, only_if: { step: '', field: '', op: '', value: '' } });
    const twice = { ...outline, stages: [outline.stages[0], { ...outline.stages[1], steps: [...outline.stages[1].steps, outline.stages[1].steps[0]] }] };
    const joined = joinDesign(twice, detail) as { stages: { steps: Step[] }[] };
    expect((joined.stages[1].steps[0].fields as unknown[]).length).toBeGreaterThan(0);
    expect(joined.stages[1].steps[joined.stages[1].steps.length - 1].fields).toEqual([]);
    expect(joinDesign('not an outline', detail)).toBe('not an outline');
  });

  it('each pass read as one answer is: refused, cut short or unreadable said so', () => {
    expect(readPass(message('{"steps":[]}'))).toEqual({ ok: true, raw: { steps: [] } });
    expect(readPass(message('', 'refusal'))).toMatchObject({ ok: false, why: expect.stringMatching(/would not propose/) });
    expect(readPass(message('{"name":', 'max_tokens'))).toMatchObject({ ok: false, why: expect.stringMatching(/too long/) });
    expect(readPass(message('not json'))).toMatchObject({ ok: false, why: expect.stringMatching(/could not be read/) });
    expect(OUTLINE_NOTE).toMatch(/outline/);
  });

  it('says which steps the detail left out, by their stage and title', () => {
    const { outline, detail } = split(recorded);
    expect(withoutDetail(outline, detail)).toEqual([]);
    expect(withoutDetail(outline, { steps: detail.steps.slice(1, 3) })).toEqual([
      { stage: 'Install', title: 'Positioned and levelled' },
      { stage: 'Prove it', title: 'Performance run' },
      { stage: 'Prove it', title: 'Quality sign-off' },
    ]);
    expect(withoutDetail('not an outline', detail)).toEqual([]);
    expect(Object.keys((STEP_SCHEMA as { properties: object }).properties).sort()).toEqual([...DETAIL].sort());
  });
});

describe('a design in passes, inside the time the server has', () => {
  const DETAIL = ['fields', 'columns', 'analyses', 'min_entries', 'only_if'];
  const outline = { ...recorded, stages: recorded.stages.map(st => ({ ...st, steps: st.steps.map(sp => Object.fromEntries(Object.entries(sp).filter(([k]) => !DETAIL.includes(k)))) })) };
  const detailOf = (stage: string, title: string) => {
    const sp = recorded.stages.find(s => s.name === stage)!.steps.find(s => s.title === title)!;
    return { fields: sp.fields, columns: [], analyses: [], min_entries: null, only_if: { step: '', field: '', op: '', value: '' } };
  };
  type Call = { last: string; schema: unknown; part: string; timeoutMs: number; at: number };
  /** A fake API: the clock moves by `takes` for each request; `answer` says what each gives back. */
  const api = (answer: (c: Call) => unknown, takes: (c: Call) => number = () => 10_000) => {
    let t = 0;
    const calls: Call[] = [];
    const pass: Pass = async (messages, schema, o) => {
      const c = { last: messages[messages.length - 1].content, schema, part: o.part, timeoutMs: o.timeoutMs, at: t };
      calls.push(c);
      const got = answer(c);
      await Promise.resolve();
      t = Math.max(t, c.at + takes(c));
      if (got instanceof Error) throw got;
      return got;
    };
    return { pass, calls, clock: { now: () => t, deadline: 138_000 } };
  };
  const stageOf = (last: string) => recorded.stages.find(s => last.includes(`“${s.name}”`))!;
  const whole = (c: Call) => c.part === 'outline' ? message(JSON.stringify(outline))
    : c.schema === STEP_SCHEMA ? message(JSON.stringify(detailOf(stageOf(c.last).name, recorded.stages.flatMap(s => s.steps).find(sp => c.last.includes(`“${sp.title}”`))!.title)))
    : message(JSON.stringify({ steps: stageOf(c.last).steps.map(sp => ({ stage: stageOf(c.last).name, title: sp.title, ...detailOf(stageOf(c.last).name, sp.title) })) }));

  it('outlines the method, then asks every stage’s detail at once, each naming its steps — the method one answer would have been', async () => {
    const { pass, calls, clock } = api(whole);
    const r = await designInPasses('the words', pass, clock);
    expect(calls.map(c => c.part)).toEqual(['outline', 'detail', 'detail']);
    expect(calls[0]).toMatchObject({ last: 'the words', schema: OUTLINE_SCHEMA, timeoutMs: 138_000 - DETAIL_ROUND_MS });
    expect(calls[1].at).toBe(calls[2].at);
    expect(calls[1].last).toBe(stageAsk('Install', ['Positioned and levelled', 'Power and air connected', 'Electrical test certificate']));
    expect(calls[1].last).toMatch(/its 3 steps, in order — 1\. Positioned and levelled; 2\. Power and air connected; 3\. Electrical test certificate —/);
    expect(calls[2].schema).toBe(DETAIL_SCHEMA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.left).toEqual([]);
    expect(r.requests).toBe(3);
    expect(r.messages).toHaveLength(3);
    const one = readDesign(message(JSON.stringify(recorded)));
    expect(one.ok && r.proposed.def).toEqual(one.ok && one.proposed.def);
  });

  it('asks each step a stage left out on its own, and the method comes back whole', async () => {
    const { pass, calls, clock } = api(c => (c.part === 'detail' && c.schema === DETAIL_SCHEMA && c.last.includes('“Prove it”')
      ? message(JSON.stringify({ steps: [{ stage: 'Prove it', title: 'Quality sign-off', ...detailOf('Prove it', 'Quality sign-off') }] }))
      : whole(c)));
    const r = await designInPasses('the words', pass, clock);
    expect(calls.filter(c => c.schema === STEP_SCHEMA).map(c => c.last)).toEqual([stepAsk('Prove it', 'Performance run')]);
    expect(r.ok && r.left).toEqual([]);
    const one = readDesign(message(JSON.stringify(recorded)));
    expect(r.ok && r.proposed.def).toEqual(one.ok && one.proposed.def);
    expect(r.ok && r.errors).toEqual([]);
  });

  it('a stage whose request failed is asked step by step; the failure is kept for the gateway to charge', async () => {
    const down = new Error('timed out');
    const { pass, calls, clock } = api(c => (c.schema === DETAIL_SCHEMA && c.last.includes('“Install”') ? down : whole(c)));
    const r = await designInPasses('the words', pass, clock);
    expect(calls.filter(c => c.schema === STEP_SCHEMA)).toHaveLength(3);
    expect(r.failed).toEqual([down]);
    expect(r.ok && r.left).toEqual([]);
  });

  it('with no time left for another round, a step still without its detail is named — never hidden — and the method still comes back', async () => {
    const { pass, calls, clock } = api(
      c => (c.schema === DETAIL_SCHEMA && c.last.includes('“Prove it”') ? message('{"steps":[]}') : whole(c)),
      c => (c.part === 'outline' ? 100_000 : 25_000),
    );
    const r = await designInPasses('the words', pass, clock);
    expect(calls.some(c => c.schema === STEP_SCHEMA)).toBe(false);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.left).toEqual([{ stage: 'Prove it', title: 'Performance run' }, { stage: 'Prove it', title: 'Quality sign-off' }]);
    expect(r.errors.length).toBeGreaterThan(0);
    expect(calls[1].timeoutMs).toBe(138_000 - 100_000 - 1000);
  });

  it('asks at most a dozen steps on their own', async () => {
    const big = { ...outline, stages: [{ ...outline.stages[0], steps: Array.from({ length: 20 }, (_, i) => ({ ...outline.stages[0].steps[0], title: `Step ${i + 1}`, after: [] })) }] };
    const { pass, calls, clock } = api(c => (c.part === 'outline' ? message(JSON.stringify(big)) : c.schema === DETAIL_SCHEMA ? message('{"steps":[]}') : message(JSON.stringify(detailOf('Install', 'Positioned and levelled')))));
    const r = await designInPasses('the words', pass, clock);
    expect(calls.filter(c => c.schema === STEP_SCHEMA)).toHaveLength(MOST_ALONE);
    expect(r.ok && r.left).toHaveLength(20 - MOST_ALONE);
  });

  it('an outline refused or cut short is said so, and nothing more is asked', async () => {
    const { pass, calls, clock } = api(() => message('', 'refusal'));
    expect(await designInPasses('the words', pass, clock)).toMatchObject({ ok: false, why: expect.stringMatching(/would not propose/) });
    expect(calls).toHaveLength(1);
  });
});

describe('what an answer costs, and the day’s allowance', () => {
  it('prices an answer by its model — cache reads at a tenth — and an unknown model as the dearest', () => {
    expect(costMicros('claude-opus-5-5', { input_tokens: 2100, output_tokens: 3400 })).toBe(Math.round((2100 * 4 + 3400 * 20)))
    expect(costMicros('claude-opus-5-5', { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 1_000_000 })).toBe(400_000);
    expect(costMicros('mystery', { input_tokens: 1_000_000 })).toBe(10_000_000);
  });

  it('holds a person to their day, by number and by cost', () => {
    const now = Date.parse('2026-10-20T12:00:00Z');
    const rows = Array.from({ length: 3 }, (_, i) => ({ at: new Date(now - i * 3_600_000).toISOString(), cost_micros: 500_000 }));
    expect(allowance(rows, now, { calls: 25, micros: 3_000_000 })).toMatchObject({ ok: true, used: { calls: 3, micros: 1_500_000 } });
    expect(allowance(rows, now, { calls: 3, micros: 3_000_000 })).toMatchObject({ ok: false, why: expect.stringMatching(/3 proposals in a day/) });
    expect(allowance(rows, now, { calls: 25, micros: 1_000_000 })).toMatchObject({ ok: false, why: expect.stringMatching(/allowance for the assistant is spent \(\$1\.00\)/) });
    expect(allowance([{ at: now - 2 * 86_400_000, cost_micros: 9e9 }], now, { calls: 1, micros: 1 })).toMatchObject({ ok: true });
  });
});

describe('the device reads the gateway’s answer again', () => {
  it('says the assistant is off, or could not answer, in words', () => {
    expect(readGateway({ off: true })).toMatchObject({ ok: false, off: true, why: expect.stringMatching(/write the method by hand/) });
    expect(readGateway({ ok: false, why: 'The assistant is busy — try again in a minute.' })).toMatchObject({ ok: false, why: 'The assistant is busy — try again in a minute.' });
    expect(readGateway(null)).toMatchObject({ ok: false });
  });

  it('rebuilds and checks the proposal itself — the server’s word is not taken', () => {
    const tampered = { ...structuredClone(recorded), roles: [...recorded.roles, { name: 'Root', side: 'admin', key: '__proto__' }] };
    const r = readGateway({ ok: true, proposal: tampered, errors: [], warnings: [], left: { calls: 24 } });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.def.roles.find(x => x.name === 'Root')).toEqual({ key: 'root', name: 'Root' });
    expect(r.errors).toEqual([]);
    expect(r.left).toEqual({ calls: 24 });
  });
});

describe('the gateway’s copies', () => {
  it('are the app’s own files, word for word, with the .ts Deno asks for', () => {
    const root = process.cwd();
    for (const f of ['definition', 'formula', 'components', 'validate', 'proposal', 'assistCore', 'askCore']) {
      const src = readFileSync(join(root, 'src/lib/flow', `${f}.ts`), 'utf8');
      const copy = readFileSync(join(root, 'supabase/functions/assist/flow', `${f}.ts`), 'utf8');
      const back = copy.split('\n').slice(1).join('\n').replace(/from '\.\/([A-Za-z]+)\.ts'/g, "from './$1'");
      expect(back, `${f}.ts differs from its copy — run node scripts/sync-assist.mjs`).toBe(src);
    }
    /* the video study's labelling (docs/VIDEO.md) */
    for (const f of ['record', 'visionCore']) {
      const src = readFileSync(join(root, 'src/lib/video', `${f}.ts`), 'utf8');
      const copy = readFileSync(join(root, 'supabase/functions/assist/video', `${f}.ts`), 'utf8');
      const back = copy.split('\n').slice(1).join('\n').replace(/from '\.\/([A-Za-z]+)\.ts'/g, "from './$1'");
      expect(back, `video/${f}.ts differs from its copy — run node scripts/sync-assist.mjs`).toBe(src);
    }
  });
});
