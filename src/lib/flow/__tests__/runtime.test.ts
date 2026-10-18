/* WHERE A PROJECT RUNNING A METHOD STANDS — the runtime's rules, and the
 * invariants that must hold however the records fall.
 *
 * The run view, the report, the assistant and the server's re-check of a
 * gate pass all read this one function, so what it says is what Faultline
 * says. */
import { describe, it, expect } from 'vitest';
import { readFlow, valuesOf, type FlowInputs } from '../runtime';
import { validateDefinition } from '../validate';
import { FLOW_SCHEMA, type FlowDefinition } from '../definition';
import type { FlowRecord } from '../records';

const TODAY = '2026-10-20';
const START = '2026-10-01';

const def: FlowDefinition = validateDefinition({
  schema: FLOW_SCHEMA, name: 'Commissioning', purpose: 'p', kind: 'stagegate',
  roles: [{ key: 'oem', name: 'OEM fitter' }, { key: 'site', name: 'Site engineer' }],
  stages: [
    {
      key: 'mech', name: 'Mechanical',
      steps: [
        { key: 'levelled', title: 'Positioned and levelled', per: 'machine', role: 'oem', answer: 'done', evidence: { photos: 1 }, dueDays: 5 },
        { key: 'air', title: 'Air and power connected', per: 'machine', role: 'site', answer: 'done', after: ['levelled'], dueDays: 25 },
      ],
      gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }, { id: 'tidy', type: 'manual', label: 'Area tidied and guarded', policy: 'block' }] },
    },
    {
      key: 'perf', name: 'Performance',
      steps: [
        {
          key: 'run', title: 'Performance run', per: 'line', role: 'oem', answer: 'measure', dueDays: 30,
          fields: [
            { key: 'packs', label: 'Packs made', type: 'number', required: true },
            { key: 'minutes', label: 'Minutes run', type: 'reading', unit: 'min', min: 120 },
            { key: 'rate', label: 'Rate', type: 'calc', unit: 'packs/min', formula: 'packs / minutes' },
          ],
        },
        { key: 'signed', title: 'Acceptance signed', per: 'line', role: 'site', answer: 'signoff' },
      ],
      gate: {
        conditions: [
          { id: 'rate', type: 'fieldMeets', step: 'run', field: 'rate', op: '>=', value: 60, policy: 'block' },
          { id: 'sig', type: 'signedOff', step: 'signed', policy: 'block' },
          { id: 'crit', type: 'noOpenProblems', priority: 'critical', policy: 'warn' },
        ],
      },
    },
  ],
}).def!;

const machines = [{ id: 'm1', name: 'Tray sealer' }, { id: 'm2', name: 'Case packer' }];
let n = 0;
const rec = (o: Partial<FlowRecord> & Pick<FlowRecord, 'stageKey'>): FlowRecord =>
  ({ id: `r${++n}`, projectId: 'p', kind: 'step', version: 1, outcome: 'planned', sort: n, createdAt: n, updatedAt: n, ...o });
const photo = { id: 'ph', kind: 'photo' as const, blobKey: 'b', mime: 'image/jpeg', capturedAt: 1 };
const inputs = (records: FlowRecord[], o: Partial<FlowInputs> = {}): FlowInputs =>
  ({ def, records, machines, startedOn: START, today: TODAY, people: { site: 'Lee' }, ...o });

describe('every step on every machine', () => {
  const s = readFlow(inputs([]));

  it('makes one per machine for a machine step, one for the line otherwise', () => {
    expect(s.stages[0].steps.map(x => `${x.def.key}:${x.machine ?? 'line'}`)).toEqual(['levelled:Tray sealer', 'levelled:Case packer', 'air:Tray sealer', 'air:Case packer']);
    expect(s.stages[1].steps.map(x => x.machine ?? 'line')).toEqual(['line', 'line']);
  });

  it('says whose each is — the person given the role, else the role', () => {
    expect(s.stages[0].steps[0].who).toBe('OEM fitter');
    expect(s.stages[0].steps[2].who).toBe('Lee');
  });

  it('counts a step due "n days from the start" as late when its day has gone', () => {
    expect(s.stages[0].steps[0]).toMatchObject({ due: '2026-10-06', late: true, tone: 'late' });
    expect(s.stages[0].steps[2]).toMatchObject({ due: '2026-10-26', late: false, tone: 'ahead' });
  });

  it('waits a step on the one it follows, on the same machine', () => {
    expect(s.stages[0].steps[2].blockedBy).toEqual(['Positioned and levelled']);
  });
});

describe('a step is complete only when its answer is', () => {
  it('a done step that needs a photo asks for it', () => {
    const s = readFlow(inputs([rec({ stageKey: 'mech', stepKey: 'levelled', assetId: 'm1', outcome: 'done', doneOn: '2026-10-19', plannedFor: '2026-10-25' })]));
    const st = s.stages[0].steps[0];
    expect(st).toMatchObject({ complete: false, tone: 'asking', missing: ['a photo'] });
    const ok = readFlow(inputs([rec({ stageKey: 'mech', stepKey: 'levelled', assetId: 'm1', outcome: 'done', media: [photo] })]));
    expect(ok.stages[0].steps[0]).toMatchObject({ complete: true, tone: 'done' });
    expect(ok.stages[0].steps[2].blockedBy).toEqual([]);
  });

  it('a sign-off is complete with who signed', () => {
    const s = readFlow(inputs([rec({ stageKey: 'perf', stepKey: 'signed', outcome: 'done' })]));
    expect(s.stages[1].steps[1].missing).toEqual(['Lee\'s sign-off']);
    const ok = readFlow(inputs([rec({ stageKey: 'perf', stepKey: 'signed', outcome: 'done', signedBy: 'Lee' })]));
    expect(ok.stages[1].steps[1].complete).toBe(true);
  });

  it('a measured step works its numbers out and fails a reading outside its limit', () => {
    expect(valuesOf(def.stages[1].steps[0], { packs: 7800, minutes: '130' })).toEqual({ packs: 7800, minutes: 130, rate: 60 });
    const short = readFlow(inputs([rec({ stageKey: 'perf', stepKey: 'run', outcome: 'done', values: { packs: 5000, minutes: 90 } })]));
    expect(short.stages[1].steps[0]).toMatchObject({ complete: false, failed: true, tone: 'failed', outOfLimits: ['Minutes run 90 min — at least 120 min'] });
  });

  it('a task that hit a problem is amber; a test that did not pass is red', () => {
    const s = readFlow(inputs([rec({ stageKey: 'mech', stepKey: 'air', assetId: 'm1', outcome: 'failed' })]));
    expect(s.stages[0].steps[2].tone).toBe('problem');
    const t = readFlow(inputs([rec({ stageKey: 'perf', stepKey: 'run', outcome: 'failed' })]));
    expect(t.stages[1].steps[0].tone).toBe('failed');
  });

  it('the newest attempt is the one that counts', () => {
    const s = readFlow(inputs([
      rec({ stageKey: 'perf', stepKey: 'run', outcome: 'failed', createdAt: 10 }),
      rec({ stageKey: 'perf', stepKey: 'run', outcome: 'done', values: { packs: 8000, minutes: 125 }, createdAt: 20 }),
    ]));
    expect(s.stages[1].steps[0]).toMatchObject({ complete: true, attempts: 2 });
  });
});

const mechDone = () => [
  ...machines.map(m => rec({ stageKey: 'mech', stepKey: 'levelled', assetId: m.id, outcome: 'done', media: [photo] })),
  ...machines.map(m => rec({ stageKey: 'mech', stepKey: 'air', assetId: m.id, outcome: 'done' })),
];

describe('a gate', () => {
  it('cannot be passed while a blocking condition is unmet, and says what it needs', () => {
    const s = readFlow(inputs([]));
    const g = s.stages[0].gate;
    expect(g.canPass).toBe(false);
    expect(g.conditions[0]).toMatchObject({ label: 'Every step in Mechanical done', met: false, blocking: true, why: '0 of 4 done' });
    expect(g.conditions[1]).toMatchObject({ manual: true, blocking: false });
  });

  it('can be passed once every blocking condition is met — a manual check is confirmed at the gate', () => {
    const s = readFlow(inputs(mechDone()));
    expect(s.stages[0].gate.canPass).toBe(true);
    expect(s.stages[0].tone).toBe('going');
    expect(s.outstanding[0]).toMatchObject({ kind: 'gate', what: 'Pass Mechanical\'s gate' });
  });

  it('a later gate waits on the one before it, however ready it is', () => {
    const s = readFlow(inputs([
      rec({ stageKey: 'perf', stepKey: 'run', outcome: 'done', values: { packs: 8000, minutes: 125 } }),
      rec({ stageKey: 'perf', stepKey: 'signed', outcome: 'done', signedBy: 'Lee' }),
    ]));
    expect(s.stages[1].gate).toMatchObject({ canPass: false, waitsOn: 'Mechanical\'s gate' });
    expect(s.stages[1].ahead).toBe(true);
  });

  it('a figure the gate compares is the app\'s own working, said with its unit', () => {
    const s = readFlow(inputs([
      ...mechDone(),
      rec({ kind: 'gate', stageKey: 'mech', outcome: 'done', doneOn: '2026-10-10', who: 'Rowland' }),
      rec({ stageKey: 'perf', stepKey: 'run', outcome: 'done', values: { packs: 6500, minutes: 130 } }),
    ]));
    const rate = s.stages[1].gate.conditions.find(c => c.id === 'rate')!;
    expect(rate).toMatchObject({ label: '“Performance run”: Rate at least 60 packs/min', met: false, why: '50 packs/min' });
  });

  it('warns, not blocks, on an open critical problem — and the pass will say it was open', () => {
    const s = readFlow(inputs([
      ...mechDone(),
      rec({ kind: 'gate', stageKey: 'mech', outcome: 'done', doneOn: '2026-10-10' }),
      rec({ stageKey: 'perf', stepKey: 'run', outcome: 'done', values: { packs: 7800, minutes: 125 } }),
      rec({ stageKey: 'perf', stepKey: 'signed', outcome: 'done', signedBy: 'Lee' }),
    ], { problems: [{ open: true, priority: 'critical', title: 'Guard interlock fails' }] }));
    const g = s.stages[1].gate;
    expect(g.canPass).toBe(true);
    expect(g.warnings.map(w => w.why)).toEqual(['1 open: Guard interlock fails']);
  });

  it('a passed gate makes its stage done, and every gate passed is the project done', () => {
    const s = readFlow(inputs([
      ...mechDone(),
      rec({ kind: 'gate', stageKey: 'mech', outcome: 'done', doneOn: '2026-10-10' }),
      rec({ stageKey: 'perf', stepKey: 'run', outcome: 'done', values: { packs: 7800, minutes: 125 } }),
      rec({ stageKey: 'perf', stepKey: 'signed', outcome: 'done', signedBy: 'Lee' }),
      rec({ kind: 'gate', stageKey: 'perf', outcome: 'done', doneOn: '2026-10-18' }),
    ]));
    expect(s.stages.map(x => x.tone)).toEqual(['done', 'done']);
    expect(s.done).toBe(true);
    expect(s.verdict.text).toMatch(/^Every gate passed — the last on /);
    expect(s.outstanding).toEqual([]);
  });
});

describe('what is outstanding, and the project in a sentence', () => {
  it('puts the late first, says whose and why, and names the next thing to do', () => {
    const s = readFlow(inputs([rec({ stageKey: 'mech', stepKey: 'levelled', assetId: 'm1', outcome: 'done' })]));
    expect(s.outstanding[0]).toMatchObject({ what: 'Positioned and levelled — Tray sealer', why: 'needs a photo', late: true, who: 'OEM fitter' });
    expect(s.next?.blocked).toBe(false);
    expect(s.verdict).toMatchObject({ text: 'Mechanical (stage 1 of 2): 0 of 4 steps done, 2 late.', tone: 'r' });
  });

  it('names what a ready gate still needs from outside its steps', () => {
    const s = readFlow(inputs([
      ...mechDone(),
      rec({ kind: 'gate', stageKey: 'mech', outcome: 'done', doneOn: '2026-10-10' }),
      rec({ stageKey: 'perf', stepKey: 'run', outcome: 'done', values: { packs: 7800, minutes: 125 } }),
    ]));
    expect(s.verdict.text).toBe('Performance (stage 2 of 2): 1 of 2 steps done — its gate needs the sign-off “Acceptance signed”.');
  });
});

describe('invariants, however the records fall', () => {
  /* a small deterministic random, so a failure can be replayed */
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
  const outcomes = ['planned', 'done', 'failed', 'notRun'] as const;

  const randomRecords = (): FlowRecord[] => {
    const out: FlowRecord[] = [];
    for (let i = 0; i < 12; i++) {
      const stage = pick(def.stages);
      const step = pick(stage.steps);
      out.push(rec({
        stageKey: stage.key, stepKey: step.key, assetId: step.per === 'machine' ? pick(machines).id : undefined,
        outcome: pick(outcomes), createdAt: Math.floor(rnd() * 100),
        ...(rnd() < 0.5 ? { media: [photo] } : {}),
        ...(rnd() < 0.5 ? { signedBy: 'Lee' } : {}),
        ...(step.key === 'run' ? { values: { packs: Math.floor(rnd() * 10000), minutes: Math.floor(rnd() * 200) } } : {}),
      }));
    }
    if (rnd() < 0.5) out.push(rec({ kind: 'gate', stageKey: 'mech', outcome: 'done', doneOn: '2026-10-10' }));
    return out;
  };

  it('no gate can be passed while a blocking condition is unmet; no step is complete with something missing', () => {
    for (let t = 0; t < 300; t++) {
      const s = readFlow(inputs(randomRecords(), { problems: rnd() < 0.3 ? [{ open: true, priority: 'critical' }] : [] }));
      for (const st of s.stages) {
        if (st.gate.canPass) expect(st.gate.conditions.some(c => c.blocking)).toBe(false);
        for (const i of st.steps) if (i.complete) expect(i.missing.length + i.outOfLimits.length).toBe(0);
      }
      expect(s.counts.done).toBeLessThanOrEqual(s.counts.steps);
    }
  });

  it('taking evidence away never opens a gate', () => {
    for (let t = 0; t < 200; t++) {
      const rs = randomRecords();
      const before = readFlow(inputs(rs));
      const after = readFlow(inputs(rs.map(r => ({ ...r, media: [] }))));
      before.stages.forEach((st, i) => { if (!st.gate.canPass) expect(after.stages[i].gate.canPass).toBe(false); });
    }
  });
});
