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
import { PROPOSAL_SCHEMA, fromProposal } from '../proposal';
import { DESIGN_SYSTEM, allowance, costMicros, designUser, readDesign } from '../assistCore';
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
  });

  it('tells the assistant the floor’s rules: measured by people, no OEE, no invented figures', () => {
    expect(DESIGN_SYSTEM).toMatch(/Nothing reads a machine\. Never use OEE/);
    expect(DESIGN_SYSTEM).toMatch(/Never invent a figure/);
    expect(designUser('x'.repeat(5000)).length).toBeLessThan(4100);
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
  });
});
