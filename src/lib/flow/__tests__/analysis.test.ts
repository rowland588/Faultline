/* A TOOL DESIGNED AS DATA — a log of entries, worked out by analysis blocks
 * (lib/flow/analysis), checked by the validator, read by the runtime into a
 * gate and a measure, and kept in the record's cloud row entry by entry. A
 * downtime log nobody wrote code for: every stop with its reason and
 * minutes, the Pareto, the minutes a day, the share over five minutes, the
 * trend, and a gate that waits on the minutes a day. */
import { describe, expect, it } from 'vitest';
import { FLOW_SCHEMA, numbersOf, type FlowDefinition, type FlowField } from '../definition';
import { ANALYSIS_BLOCKS, BLOCKS, BLOCK_CATALOGUE, analyse, cpkOf, entryValues, figuresOf, type FlowEntry } from '../analysis';
import { validateDefinition } from '../validate';
import { readFlow } from '../runtime';
import type { FlowRecord } from '../records';
import { MAPS } from '../../../cloud/mappers';
import { mergeRows } from '../../../cloud/sync';
import { sample } from '../../ie/sample';

const columns: FlowField[] = [
  { key: 'reason', label: 'Reason', type: 'choice', options: ['Jam at infeed', 'Film change', 'Label fault', 'No product'] },
  { key: 'minutes', label: 'Minutes', type: 'number', unit: 'min' },
  { key: 'packs_lost', label: 'Packs lost', type: 'calc', formula: 'minutes * 40', unit: 'packs' },
];
let n = 0;
const e = (on: string, reason: string, minutes: number, o: Partial<FlowEntry> = {}): FlowEntry => ({ id: `e${++n}`, on, at: n, values: { reason, minutes }, ...o });
const week: FlowEntry[] = [
  e('2026-10-12', 'Jam at infeed', 12), e('2026-10-12', 'Film change', 6), e('2026-10-12', 'Jam at infeed', 8),
  e('2026-10-13', 'Label fault', 3), e('2026-10-13', 'Jam at infeed', 10), e('2026-10-13', 'No product', 4),
  e('2026-10-14', 'Jam at infeed', 7), e('2026-10-14', 'Film change', 5), e('2026-10-14', 'Label fault', 2, { struck: true }),
];

const def: FlowDefinition = {
  schema: FLOW_SCHEMA, name: 'Micro-stops on the bagger', purpose: 'Every stop logged a week, the biggest cause found and fixed, proved on the minutes a day.', kind: 'improvement',
  roles: [{ key: 'op', name: 'Operator' }],
  stages: [
    {
      key: 'log', name: 'Log the stops', steps: [{
        key: 'stops', title: 'Log every stop', per: 'line', answer: 'log', role: 'op', columns, minEntries: 5,
        analyses: [
          { key: 'stops_n', label: 'Stops', block: 'count' },
          { key: 'minutes_day', label: 'Stop minutes a day', block: 'perDay', of: 'minutes' },
          { key: 'top_reason', label: 'Biggest reason', block: 'pareto', by: 'reason', of: 'minutes' },
          { key: 'long_share', label: 'Stops over 5 minutes', block: 'share', when: { column: 'minutes', op: '>', value: 5 } },
          { key: 'by_day', label: 'Stop minutes by day', block: 'trend', of: 'minutes' },
          { key: 'spread', label: 'Spread of stops', block: 'histogram', of: 'minutes' },
          { key: 'lost', label: 'Packs lost', block: 'sum', of: 'packs_lost' },
        ],
      }],
      gate: { conditions: [{ id: 'all', type: 'stepsDone', policy: 'block' }] },
    },
    {
      key: 'prove', name: 'Prove it', steps: [{ key: 'stops_after', title: 'Log every stop again', per: 'line', answer: 'log', columns, analyses: [{ key: 'minutes_day', label: 'Stop minutes a day', block: 'perDay', of: 'minutes' }] }],
      gate: { conditions: [{ id: 'f', type: 'fieldMeets', policy: 'block', step: 'stops_after', field: 'minutes_day', op: '<=', value: 10 }, { id: 'm', type: 'measureMet', policy: 'block', measure: 'minutes_day' }] },
    },
  ],
  measures: [{ key: 'minutes_day', name: 'Stop minutes a day', unit: 'min', better: 'lower', target: 10, from: [{ step: 'stops', field: 'minutes_day' }, { step: 'stops_after', field: 'minutes_day' }] }],
};

describe('the analysis blocks', () => {
  const r = analyse(def.stages[0].steps[0].analyses, columns, week);

  it('count, a figure a day, a total of a worked-out column — struck entries count for nothing', () => {
    expect(r.stops_n).toMatchObject({ value: 8, says: 'Stops: 8.' });
    /* 12+6+8 + 3+10+4 + 7+5 = 55 over three days */
    expect(r.minutes_day.value).toBeCloseTo(55 / 3, 6);
    expect(r.minutes_day.says).toBe('Stop minutes a day: 18.33 min a day, over 3 days logged.');
    expect(r.lost).toMatchObject({ value: 55 * 40, unit: 'packs' });
    expect(entryValues(columns, { reason: 'Jam at infeed', minutes: '12' })).toEqual({ reason: 'Jam at infeed', minutes: 12, packs_lost: 480 });
  });

  it('a Pareto: biggest first, the running share, the few that make 80%', () => {
    const p = r.top_reason;
    expect(p.series?.map(s => [s.label, s.value])).toEqual([['Jam at infeed', 37], ['Film change', 11], ['No product', 4], ['Label fault', 3]]);
    expect(p.series?.[0].cum).toBeCloseTo((37 / 55) * 100, 6);
    expect(p.value).toBeCloseTo((37 / 55) * 100, 6);
    expect(p.says).toBe('Biggest reason: Jam at infeed is 67.27% of minutes — 2 of 4 reasons make 80%.');
  });

  it('a share, a trend, a histogram', () => {
    expect(r.long_share.value).toBeCloseTo((5 / 8) * 100, 6);
    expect(r.long_share.says).toBe('Stops over 5 minutes: 62.5% — 5 of 8 entries where Minutes > 5.');
    expect(r.by_day.series).toEqual([{ label: '2026-10-12', value: 26 }, { label: '2026-10-13', value: 17 }, { label: '2026-10-14', value: 12 }]);
    expect(r.by_day.says).toBe('Stop minutes by day: 12 min on the latest day of 3 days — 14 min down on the first day.');
    expect(r.spread.series?.reduce((s, x) => s + x.value, 0)).toBe(8);
    expect(r.spread.value).toBeUndefined();
  });

  it('the statistics, and Cpk worked out as the capability study works it out', () => {
    const xs = [10.2, 9.8, 10.1, 10.4, 9.9, 10.0, 10.3, 9.7, 10.1, 10.2];
    const rows = xs.map((v, i) => ({ id: `x${i}`, on: '2026-10-12', at: i, values: { w: v } }));
    const cols: FlowField[] = [{ key: 'w', label: 'Weight', type: 'reading', unit: 'g', min: 9, max: 11 }];
    const s = analyse([{ key: 'm', label: 'Mean', block: 'mean', of: 'w' }, { key: 'md', label: 'Median', block: 'median', of: 'w' }, { key: 'sd', label: 'Spread', block: 'sd', of: 'w' },
      { key: 'lo', label: 'Lowest', block: 'min', of: 'w' }, { key: 'hi', label: 'Highest', block: 'max', of: 'w' }, { key: 'k', label: 'Capability', block: 'cpk', of: 'w' }], cols, rows);
    expect(s.m.value).toBeCloseTo(10.07, 6);
    expect(s.md.value).toBeCloseTo(10.1, 6);
    expect(s.lo.value).toBe(9.7);
    expect(s.hi.value).toBe(10.4);
    const f = sample({ kind: 'limits', count: xs.length, lower: 9, upper: 11 }, xs.map((value, i) => ({ id: String(i), value, at: i })));
    expect(s.sd.value).toBeCloseTo(f.sd ?? NaN, 9);
    expect(s.k.value).toBeCloseTo(f.cpk ?? NaN, 9);
    expect(cpkOf(xs, 9, 11)).toBeCloseTo(f.cpk ?? NaN, 9);
    expect(s.k.says).toMatch(/^Capability: Cpk [\d.]+ — (capable|just capable|not capable), from 10 readings \(fewer than 25: read it with care\)\.$/);
  });

  it('says when there is not enough, never a number it does not have', () => {
    const none = analyse(def.stages[0].steps[0].analyses, columns, []);
    expect(none.minutes_day).toMatchObject({ n: 0, says: 'Stop minutes a day: no entries yet.' });
    expect(none.minutes_day.value).toBeUndefined();
    expect(none.top_reason.says).toBe('Biggest reason: nothing to rank yet.');
    expect(figuresOf(none)).toEqual({ stops_n: 0 });
  });

  it('the catalogue the designer and the assistant read is the registry itself', () => {
    expect(BLOCK_CATALOGUE.map(b => b.id)).toEqual([...ANALYSIS_BLOCKS]);
    for (const id of ANALYSIS_BLOCKS) expect(BLOCKS[id].says.length).toBeGreaterThan(10);
  });
});

describe('a log, checked before it can run', () => {
  it('is kept whole: columns, analyses, the entries it needs', () => {
    const c = validateDefinition(def);
    expect(c.errors).toEqual([]);
    const s = c.def?.stages[0].steps[0];
    expect(s?.columns?.map(x => x.key)).toEqual(['reason', 'minutes', 'packs_lost']);
    expect(s?.analyses?.map(x => x.block)).toEqual(['count', 'perDay', 'pareto', 'share', 'trend', 'histogram', 'sum']);
    expect(s?.minEntries).toBe(5);
    /* its number figures are boxes a gate and a measure can name; a picture is not */
    expect(numbersOf(def.stages[0].steps[0]).map(f => f.key)).toEqual(['stops_n', 'minutes_day', 'top_reason', 'long_share', 'by_day', 'lost']);
  });

  it('refuses what cannot be worked out, in words', () => {
    const bad = structuredClone(def);
    const step = bad.stages[0].steps[0];
    step.analyses = [
      { key: 'a', label: 'Wobble', block: 'wobble' as never, of: 'minutes' },
      { key: 'b', label: 'Average reason', block: 'mean', of: 'reason' },
      { key: 'c', label: 'By minutes', block: 'pareto', by: 'minutes' },
      { key: 'd', label: 'Long ones', block: 'share' },
      { key: 'e', label: 'Capability', block: 'cpk', of: 'minutes' },
      { key: 'minutes', label: 'Clash', block: 'count' },
      { key: 'g', label: 'Ghost', block: 'sum', of: 'seconds' },
    ];
    const msgs = validateDefinition(bad).errors.map(x => x.message);
    expect(msgs.some(m => /“Wobble” uses a way of working out the app does not have: "wobble"/.test(m))).toBe(true);
    expect(msgs.some(m => /“Average reason” works on “Reason”, which is not a number/.test(m))).toBe(true);
    expect(msgs.some(m => /“By minutes” groups by “Minutes”, a number/.test(m))).toBe(true);
    expect(msgs.some(m => /“Long ones” is a share — say which entries it counts/.test(m))).toBe(true);
    expect(msgs.some(m => /“Capability” judges “Minutes” against its limits, but the column has none/.test(m))).toBe(true);
    expect(msgs.some(m => /“Clash” has the key "minutes", which a column/.test(m))).toBe(true);
    expect(msgs.some(m => /“Ghost” works on "seconds", which is not a column of the log/.test(m))).toBe(true);
    const empty = structuredClone(def);
    empty.stages[0].steps[0].columns = [];
    expect(validateDefinition(empty).errors.some(x => /is a log with no columns/.test(x.message))).toBe(true);
  });

  it('keeps what needs building as work for development — said, never run', () => {
    const c = validateDefinition({ ...def, needs: [{ what: 'Weibull fit of the time between stops', why: 'To say how long until the next jam', inputs: 'Each stop’s time', method: 'Maximum likelihood', check: 'Against a known data set' }, { what: 'Half a need' }] });
    expect(c.def?.needs).toEqual([{ what: 'Weibull fit of the time between stops', why: 'To say how long until the next jam', inputs: 'Each stop’s time', method: 'Maximum likelihood', check: 'Against a known data set' }]);
    expect(c.warnings.some(w => /must say what is needed and why/.test(w.message))).toBe(true);
  });
});

describe('a log, run', () => {
  let k = 0;
  const rec = (o: Partial<FlowRecord>): FlowRecord => ({ id: `r${++k}`, projectId: 'P', kind: 'step', stageKey: 'log', version: 1, outcome: 'planned', sort: k, createdAt: k, updatedAt: k, ...o });

  it('asks for its entries, then reads its figures — a gate and a measure on them', () => {
    const empty = readFlow({ def, records: [], machines: [], today: '2026-10-18' });
    expect(empty.stages[0].steps[0].missing).toEqual(['5 entries in its log (0 so far)']);
    const before = rec({ stepKey: 'stops', outcome: 'done', doneOn: '2026-10-14', entries: week });
    const s1 = readFlow({ def, records: [before], machines: [], today: '2026-10-18' });
    const step = s1.stages[0].steps[0];
    expect(step.complete).toBe(true);
    expect(step.entries).toBe(8);
    expect(step.values.minutes_day).toBeCloseTo(55 / 3, 6);
    expect(step.analysis?.top_reason.says).toMatch(/^Biggest reason: Jam at infeed is 67\.27%/);
    expect(s1.measures[0].says).toBe('Stop minutes a day: 18.33 min, the first reading — target at most 10 min, not met yet.');
    /* after: fewer, shorter stops — the gate reads the log's figure and the measure moves */
    const after = rec({ stageKey: 'prove', stepKey: 'stops_after', outcome: 'done', doneOn: '2026-10-21', entries: [e('2026-10-20', 'Film change', 5), e('2026-10-20', 'Jam at infeed', 3), e('2026-10-21', 'Label fault', 4)] });
    const s2 = readFlow({ def, records: [before, after], machines: [], today: '2026-10-21' });
    const gate = s2.stages[1].gate;
    expect(gate.conditions.find(c => c.id === 'f')?.met).toBe(true);
    expect(s2.measures[0].says).toBe('Stop minutes a day: 18.33 min before, 6 min now — 12.33 min better — target at most 10 min, met.');
    expect(gate.conditions.every(c => c.met)).toBe(true);
  });

  it('a log being filled is under way; struck entries do not count towards what it needs', () => {
    const partial = rec({ stepKey: 'stops', entries: week.slice(0, 2) });
    const s = readFlow({ def, records: [partial], machines: [], today: '2026-10-18' });
    expect(s.stages[0].steps[0].tone).toBe('going');
    const struck = rec({ stepKey: 'stops', outcome: 'done', entries: week.map(x => ({ ...x, struck: true as const })) });
    expect(readFlow({ def, records: [struck], machines: [], today: '2026-10-18' }).stages[0].steps[0].complete).toBe(false);
  });
});

describe('a log in the cloud', () => {
  const m = MAPS.flow_records;
  const base: FlowRecord = { id: 'r1', projectId: 'P', kind: 'step', stageKey: 'log', stepKey: 'stops', version: 1, outcome: 'planned', values: { note_box: 'shift A' }, entries: week.slice(0, 2), sort: 1, createdAt: 1, updatedAt: 1 };

  it('rides in the values column and comes back whole', () => {
    const row = m.toRow(base, 'owner');
    expect((row.values as Record<string, unknown>)._entries).toHaveLength(2);
    const back = m.fromRow(row) as unknown as FlowRecord;
    expect(back.values).toEqual({ note_box: 'shift A' });
    expect(back.entries).toEqual(week.slice(0, 2));
    expect((m.fromRow(m.toRow({ ...base, values: undefined, entries: undefined }, 'o')) as unknown as FlowRecord).entries).toBeUndefined();
  });

  it('two devices logging at once both keep their entries', () => {
    const b = m.toRow(base, 'o');
    const phone = m.toRow({ ...base, entries: [...(base.entries ?? []), week[2]] }, 'o');
    const laptop = m.toRow({ ...base, entries: [...(base.entries ?? []), week[3]], values: { note_box: 'shift B' } }, 'o');
    const { row } = mergeRows(b, phone, laptop, false, m.nested);
    const merged = m.fromRow(row) as unknown as FlowRecord;
    expect(merged.entries?.map(x => x.id).sort()).toEqual([week[0], week[1], week[2], week[3]].map(x => x.id).sort());
    expect(merged.values).toEqual({ note_box: 'shift B' });
  });
});

describe('a log, proposed by the assistant', () => {
  const fld = (label: string, type: string, o: Record<string, unknown> = {}) => ({ label, type, unit: '', min: null, max: null, options: [], formula: '', required: false, ...o });
  const an = (label: string, block: string, o: Record<string, unknown> = {}) => ({ label, block, of: '', by: '', when_column: '', when_op: '', when_value: '', unit: '', ...o });
  const step = (title: string, o: Record<string, unknown> = {}) => ({ title, per: 'line', answer: 'done', role: '', passes_if: '', photos: 0, files: 0, due_days: null, after: [], tool: '', fields: [], columns: [], analyses: [], min_entries: null, help: '', ...o });
  const cond = (o: Record<string, unknown>) => ({ type: 'stepsDone', policy: 'block', step: '', field: '', op: '>=', value: null, value2: null, evidence: 'photo', min: null, measure: '', priority: 'any', due_days: null, label: '', ...o });
  const cols = [fld('Reason', 'choice', { options: ['Jam', 'Film', 'Label'] }), fld('Minutes', 'number', { unit: 'min' })];
  const proposal = {
    name: 'Bagger stops', purpose: 'Find the biggest cause of stops and halve it.', kind: 'improvement', roles: [{ name: 'Operator', side: 'site' }],
    stages: [
      { name: 'Log', purpose: '', steps: [step('Log every stop', { answer: 'log', role: 'Operator', columns: cols, min_entries: 20, analyses: [an('Stop minutes a day', 'perDay', { of: 'Minutes' }), an('Biggest reason', 'pareto', { by: 'Reason', of: 'Minutes' }), an('Long stops', 'share', { when_column: 'Minutes', when_op: '>', when_value: '5' })] })], gate: [cond({})] },
      { name: 'Prove', purpose: '', steps: [step('Log again', { answer: 'log', columns: cols, analyses: [an('Stop minutes a day', 'perDay', { of: 'Minutes' })] })],
        gate: [cond({ type: 'fieldMeets', step: 'Log again', field: 'Stop minutes a day', op: '<=', value: 10 }), cond({ type: 'measureMet', measure: 'Stop minutes a day' })] },
    ],
    measures: [{ name: 'Stop minutes a day', unit: 'min', better: 'lower', target: 10, from: [{ step: 'Log every stop', field: 'Stop minutes a day' }, { step: 'Log again', field: 'Stop minutes a day' }] }],
    needs: [{ what: 'Time to the next jam', why: 'To plan cleaning before it stops', inputs: 'The time of each stop', method: 'A Weibull fit', check: 'Against last month' }],
    assumptions: [], questions: [],
  };

  it('is read into a method the validator keeps — log, analyses, a gate and a measure on its figures, and the need', async () => {
    const { fromProposal, toProposal } = await import('../proposal');
    const p = fromProposal(proposal);
    const c = validateDefinition(p.def);
    expect(c.errors).toEqual([]);
    const log = c.def?.stages[0].steps[0];
    expect(log?.answer).toBe('log');
    expect(log?.minEntries).toBe(20);
    expect(log?.analyses?.map(a => [a.block, a.of, a.by])).toEqual([['perDay', 'minutes', undefined], ['pareto', 'minutes', 'reason'], ['share', undefined, undefined]]);
    expect(log?.analyses?.[2].when).toEqual({ column: 'minutes', op: '>', value: 5 });
    expect(c.def?.stages[1].gate.conditions.map(x => x.type)).toEqual(['fieldMeets', 'measureMet']);
    expect(c.def?.measures?.[0].from).toEqual([{ step: log?.key, field: 'stop_minutes_a_day' }, { step: c.def?.stages[1].steps[0].key, field: 'stop_minutes_a_day' }]);
    expect(c.def?.needs?.[0].what).toBe('Time to the next jam');
    /* and said back in the same shape, so it can be changed in words */
    const again = validateDefinition(fromProposal(toProposal(c.def as FlowDefinition)).def);
    expect(again.errors).toEqual([]);
    expect(again.def?.stages[0].steps[0].analyses).toEqual(log?.analyses);
    expect(again.def?.needs).toEqual(c.def?.needs);
  });
});
