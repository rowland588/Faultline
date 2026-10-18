/* A METHOD BUILT FROM THE APP'S CAPABILITIES — a step done with one of the
 * app's own tools, its figures read by that tool's module; a measure with a
 * before and an after, read from every attempt; a gate that waits on a
 * measure's target; all of it said back in the proposal's shape and kept
 * across versions (the vision slice, docs/PLATFORM-STATUS.md). */
import { describe, expect, it } from 'vitest';
import { FLOW_SCHEMA, type FlowDefinition } from '../definition';
import type { FlowRecord } from '../records';
import { readFlow, type ToolReading } from '../runtime';
import { validateDefinition } from '../validate';
import { fromProposal, toProposal } from '../proposal';
import { changesOf, keepKeys } from '../change';
import { capacityFigures, readCapacity, readTool, toolFigures } from '../toolRead';
import { flowRowFacts } from '../view';
import type { ToolStudy } from '../../study';
import type { Capacity } from '../../capacity';
import type { Standard } from '../../standard';
import type { Workspace } from '../../../types';

/* Changeover reduction, the shape Faultline's library gives it */
const def: FlowDefinition = {
  schema: FLOW_SCHEMA, name: 'Changeover reduction', purpose: 'Cut the changeover on a line and prove it.', kind: 'improvement',
  roles: [{ key: 'lead', name: 'Line lead' }],
  stages: [
    { key: 'record', name: 'Record it as it is', steps: [{ key: 'time-now', title: 'Time the changeover as it is', per: 'line', answer: 'measure', role: 'lead', component: { tool: 'changeover' } }], gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }] } },
    {
      key: 'prove', name: 'Prove it', steps: [{ key: 'time-again', title: 'Time it again', per: 'line', answer: 'measure', role: 'lead', component: { tool: 'changeover' } }],
      gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }, { id: 'target', type: 'measureMet', policy: 'block', measure: 'changeover_minutes' }, { id: 'f', type: 'fieldMeets', policy: 'warn', step: 'time-again', field: 'external_minutes', op: '<=', value: 2 }] },
    },
  ],
  measures: [{ key: 'changeover_minutes', name: 'Changeover minutes', unit: 'min', better: 'lower', target: 20, from: [{ step: 'time-now', field: 'changeover_minutes' }, { step: 'time-again', field: 'changeover_minutes' }] }],
};

let n = 0;
const rec = (o: Partial<FlowRecord>): FlowRecord => ({ id: `r${++n}`, projectId: 'P', kind: 'step', stageKey: 'record', version: 1, outcome: 'done', sort: n, createdAt: n, updatedAt: n, ...o });
const reading = (min: number, enough = true): ToolReading => ({ tool: 'changeover', name: 'SMED — Line 4', says: `${min} minutes`, enough, figures: enough ? { changeover_minutes: min, internal_minutes: min - 2, external_minutes: 2 } : {} });

describe('a method built from the app’s tools and measures', () => {
  it('is a method the validator keeps — tools, their figures on a gate, a measure and its target', () => {
    const c = validateDefinition(def);
    expect(c.errors).toEqual([]);
    expect(c.def?.measures?.[0]).toMatchObject({ key: 'changeover_minutes', target: 20, better: 'lower' });
    expect(c.def?.stages[1].gate.conditions.map(x => x.type)).toEqual(['stepsDone', 'measureMet', 'fieldMeets']);
  });

  it('refuses a measure fed by nothing real, and a gate on a measure with no target', () => {
    const bad = structuredClone(def);
    bad.measures = [{ key: 'm', name: 'Speed', better: 'higher', from: [{ step: 'time-now', field: 'packs_a_minute' }] }];
    bad.stages[1].gate.conditions = [{ id: 'x', type: 'measureMet', policy: 'block', measure: 'm' }];
    const msgs = validateDefinition(bad).errors.map(e => e.message);
    expect(msgs.some(m => /fed by "packs_a_minute", which is not a number on “Time the changeover as it is”/.test(m))).toBe(true);
    expect(msgs.some(m => /not fed by any step/.test(m))).toBe(true);
    expect(msgs.some(m => /needs “Speed” to meet its target, and it has none/.test(m))).toBe(true);
  });

  it('runs: a tool step asks for its study, then reads its figures; the measure is before → now against its target', () => {
    const none = readFlow({ def, records: [], machines: [], today: '2026-10-18' });
    expect(none.stages[0].steps[0].missing).toEqual(['its SMED study']);
    expect(none.measures[0].says).toBe('Changeover minutes: not measured yet — target at most 20 min.');

    const attached = [rec({ stepKey: 'time-now', studyId: 's1', doneOn: '2026-10-02' })];
    const away = readFlow({ def, records: attached, machines: [], today: '2026-10-18' });
    expect(away.stages[0].steps[0].missing).toEqual(['its SMED study (not on this device yet)']);
    const early = readFlow({ def, records: attached, machines: [], today: '2026-10-18', tools: { s1: reading(0, false) } });
    expect(early.stages[0].steps[0].missing[0]).toMatch(/^its SMED study finished/);

    const records = [...attached, rec({ stageKey: 'prove', stepKey: 'time-again', studyId: 's2', doneOn: '2026-10-16' })];
    const s = readFlow({ def, records, machines: [], today: '2026-10-18', tools: { s1: reading(42), s2: reading(18) } });
    expect(s.stages[0].steps[0]).toMatchObject({ complete: true, values: { changeover_minutes: 42 } });
    expect(s.stages[0].steps[0].tool?.name).toBe('SMED — Line 4');
    const m = s.measures[0];
    expect(m).toMatchObject({ met: true, change: -24, improved: true });
    expect(m.before?.value).toBe(42);
    expect(m.now?.value).toBe(18);
    expect(m.says).toBe('Changeover minutes: 42 min before, 18 min now — 24 min better — target at most 20 min, met.');
    const gate = s.stages[1].gate.conditions;
    expect(gate.find(c => c.type === 'measureMet')).toMatchObject({ met: true, label: 'Changeover minutes at most 20 min', why: '18 min now' });
    expect(gate.find(c => c.type === 'fieldMeets')).toMatchObject({ met: true, label: '“Time it again”: External minutes at most 2 min' });

    /* where the job's row is read — the control room — its number with it */
    expect(flowRowFacts(s).sentence).toMatch(/ Changeover minutes: 42 min → 18 min, target at most 20 min — met\.$/);
    /* not there yet: the gate waits on the measure, in words */
    const short = readFlow({ def, records, machines: [], today: '2026-10-18', tools: { s1: reading(42), s2: reading(26) } });
    expect(short.measures[0].met).toBe(false);
    expect(short.stages[1].gate.conditions.find(c => c.type === 'measureMet')).toMatchObject({ met: false, blocking: true, why: '26 min now' });
  });

  it('is said back in the proposal’s shape and read again — tools, measures and the gate on a measure kept', () => {
    const back = fromProposal(toProposal(def)).def;
    const c = validateDefinition(back);
    expect(c.errors).toEqual([]);
    expect(back.stages.map(s => s.steps[0].component?.tool)).toEqual(['changeover', 'changeover']);
    expect(back.measures).toEqual([{ key: 'changeover_minutes', name: 'Changeover minutes', unit: 'min', better: 'lower', target: 20, from: [{ step: 'time-the-changeover-as-it-is', field: 'changeover_minutes' }, { step: 'time-it-again', field: 'changeover_minutes' }] }]);
    expect(back.stages[1].gate.conditions.map(x => x.type)).toEqual(['stepsDone', 'measureMet', 'fieldMeets']);
  });

  it('a new version keeps the measure’s key and says what changed — the target, the tool', () => {
    const next = fromProposal(toProposal(def)).def;
    next.measures![0].target = 10;
    next.stages[0].steps[0].component = { tool: 'map' };
    const kept = keepKeys(def, next);
    expect(kept.measures![0].key).toBe('changeover_minutes');
    expect(kept.measures![0].from[0].step).toBe('time-now');
    const said = changesOf(def, kept).map(c => c.text);
    expect(said).toContain('Measure “Changeover minutes”: at most 10 min (was at most 20 min)');
    expect(said.some(t => /Time the changeover as it is”: done with Value stream map/.test(t))).toBe(true);
  });
});

describe('a tool’s record read for a step', () => {
  const smed = (secs: number[]): ToolStudy => ({
    id: 'st', tool: 'changeover', name: 'Line 4 bagger', startedAt: 1, createdAt: 1, updatedAt: 1, uses: [],
    facts: { sequence: secs.map((sec, i) => ({ id: `e${i}`, order: i, name: `Element ${i + 1}`, sec, side: i === 0 ? 'external' : 'internal', source: 'timed' as const })) },
  } as unknown as ToolStudy);

  it('reads SMED with SMED’s own arithmetic: the changeover, its internal and external minutes', () => {
    const f = toolFigures(smed([120, 600, 900]));
    expect(f.enough).toBe(true);
    expect(f.figures).toMatchObject({ internal_minutes: 25, external_minutes: 2 });
    expect(f.figures.changeover_minutes).toBeGreaterThan(0);
    const r = readTool(smed([120, 600, 900]));
    expect(r).toMatchObject({ tool: 'changeover', enough: true, href: '/smed/st' });
    expect(r.name).toMatch(/^SMED — Line 4 bagger/);
  });

  it('says a study with nothing timed is not enough, with no figures', () => {
    expect(toolFigures(smed([]))).toEqual({ enough: false, figures: {} });
  });
});

describe('a product’s Line capacity read for a step', () => {
  /* the Wrapper holds the line to 44 bags a minute against 60; 4 people at £15 an hour:
     £60 ÷ 2,640 bags an hour = 2.27p a bag (lib/capacity labourCost) */
  const cap = (targetPerMin?: number): Capacity => ({ ...(targetPerMin != null ? { targetPerMin } : {}), labour: { people: 4, ratePerHour: 15 }, stations: [
    { id: 'b', name: 'Bagger', kind: 'machine', unit: 'bags', contains: 1, rate: 70, ratePer: 'min', source: 'plate' },
    { id: 'w', name: 'Wrapper', kind: 'machine', unit: 'bags', contains: 1, rate: 44, ratePer: 'min', source: 'plate' },
  ] });
  const std = (c?: Capacity): Standard => ({ id: 'sd', projectId: '', workspaceId: 'L4', product: 'Express 1kg', ...(c ? { capacity: c } : {}), marks: [], sort: 1, createdAt: 1, updatedAt: 1 });

  it('reads it with Line capacity’s own arithmetic: the rate, the good out, how far short, labour a pack', () => {
    expect(capacityFigures(std(cap(60)))).toMatchObject({ enough: true, short: true, figures: { line_rate: 44, good_rate: 44, short_of_target: 16, labour_per_pack: 2.27 } });
    expect(capacityFigures(std(cap(40))).figures.short_of_target).toBe(0);
    const r = readCapacity(std(cap(60)), { id: 'L4', name: 'Line 4' } as Workspace);
    expect(r).toMatchObject({ tool: 'capacity', name: 'Line capacity — Express 1kg on Line 4', verdict: 'Short of its target', enough: true, href: '/w/L4/standards/sd?at=balance' });
  });

  it('says a capacity with no stations is not enough, with no figures', () => {
    expect(capacityFigures(std({ stations: [] }))).toMatchObject({ enough: false, figures: {} });
    expect(readCapacity(std()).verdict).toBe('Speeds still to fill in');
  });

  it('a step done with Line capacity feeds a measure, and a gate waits on its target', () => {
    const d: FlowDefinition = {
      schema: FLOW_SCHEMA, name: 'Line rate', purpose: 'Bring the line to its rate.', kind: 'improvement', roles: [],
      stages: [{ key: 'see', name: 'See it', steps: [{ key: 'cap', title: 'The line’s capacity', per: 'line', answer: 'measure', component: { tool: 'capacity' } }],
        gate: { conditions: [{ id: 'm', type: 'measureMet', policy: 'block', measure: 'rate' }] } }],
      measures: [{ key: 'rate', name: 'Line rate', unit: 'a minute', better: 'higher', target: 60, from: [{ step: 'cap', field: 'line_rate' }] }],
    };
    expect(validateDefinition(d).errors).toEqual([]);
    const none = readFlow({ def: d, records: [], machines: [], today: '2026-10-18' });
    expect(none.stages[0].steps[0].missing).toEqual(['its Line capacity']);
    const s = readFlow({ def: d, records: [rec({ stageKey: 'see', stepKey: 'cap', studyId: 'sd', doneOn: '2026-10-18' })], machines: [], today: '2026-10-18', tools: { sd: readCapacity(std(cap(60))) } });
    expect(s.stages[0].steps[0]).toMatchObject({ complete: true, values: { line_rate: 44 } });
    expect(s.measures[0].says).toBe('Line rate: 44 a minute, the first reading — target at least 60 a minute, not met yet.');
    expect(s.stages[0].gate.conditions[0]).toMatchObject({ met: false, blocking: true, why: '44 a minute now' });
  });
});
