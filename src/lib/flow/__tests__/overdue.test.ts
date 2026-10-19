/* WHO OWES WHAT BY WHEN (the 'overdue' block, lib/flow/analysis): a log
 * kept as a register of actions — what, who, the day it is due, done or not
 * — and what has gone past its day and is still open, counted, by owner,
 * the oldest named, the next said; a gate that waits on none past due. */
import { describe, expect, it } from 'vitest';
import { analyse, type FlowAnalysis, type FlowEntry } from '../analysis';
import { FLOW_SCHEMA, type FlowDefinition, type FlowField } from '../definition';
import { readFlow } from '../runtime';
import { validateDefinition } from '../validate';
import type { FlowRecord } from '../records';

const COLS: FlowField[] = [
  { key: 'action', label: 'Action', type: 'text' },
  { key: 'owner', label: 'Owner', type: 'person' },
  { key: 'due', label: 'Due', type: 'date' },
  { key: 'done', label: 'Done', type: 'yesno' },
];
const OPEN: FlowAnalysis = { key: 'past_due', label: 'Past due', block: 'overdue', of: 'due', by: 'owner', when: { column: 'done', op: '!=', value: true } };
type Row = [string, string, string, boolean?];
const ents = (rows: Row[]): FlowEntry[] => rows.map(([action, owner, due, done], i) => ({ id: `a${i}`, on: '2026-10-12', at: i, values: { action, owner, due, ...(done === undefined ? {} : { done }) } }));
const read = (rows: Row[], a: FlowAnalysis = OPEN, today = '2026-10-19') => analyse([a], COLS, ents(rows), {}, {}, today)[a.key];

const REGISTER: Row[] = [
  ['Fit the new guard', 'Sam', '2026-10-14'],
  ['Retrain the night shift', 'Lee', '2026-10-17', false],
  ['Change the film supplier', 'Sam', '2026-10-18'],
  ['Clean the infeed sensor', 'Lee', '2026-10-10', true],
  ['Order the spare belt', 'Ana', '2026-10-24'],
  ['Write the standard', 'Ana', '2026-10-22'],
];

describe('past due', () => {
  it('the open ones gone by, by owner, the oldest named and the next said — a done one counts for nothing', () => {
    const r = read(REGISTER);
    /* open and gone by: the guard (14 Oct, Sam), the night shift (17 Oct, Lee), the film (18 Oct, Sam); the sensor is done */
    expect(r.value).toBe(3);
    expect(r.series).toEqual([{ label: 'Sam', value: 2 }, { label: 'Lee', value: 1 }]);
    expect(r.says).toBe('Past due where Done is not yes: 3 past due — Sam 2, Lee 1; the oldest “Fit the new guard” (Sam), due 14 Oct — 5 days late; the next due 22 Oct — “Write the standard”, Ana.');
  });
  it('none gone by: said, with the next due', () => {
    const r = read(REGISTER, OPEN, '2026-10-01');
    expect(r.value).toBe(0);
    expect(r.says).toBe('Past due where Done is not yes: none — 5 open entries with a day, none gone by; the next due 14 Oct — “Fit the new guard”, Sam.');
  });
  it('due today is not late', () => {
    expect(read([['Fit the new guard', 'Sam', '2026-10-19']]).value).toBe(0);
    expect(read([['Fit the new guard', 'Sam', '2026-10-18']]).says).toMatch(/1 day late/);
  });
  it('a box left blank is still open; a rule may say Yes in words', () => {
    const words: FlowAnalysis = { ...OPEN, when: { column: 'done', op: '!=', value: 'Yes' } };
    expect(read([['A', 'Sam', '2026-10-01'], ['B', 'Sam', '2026-10-02', true], ['C', 'Sam', '2026-10-03', false]], words).value).toBe(2);
  });
  it('with no owner column: counted, no bars; nothing with a day; no today', () => {
    const plain: FlowAnalysis = { key: 'p', label: 'Late', block: 'overdue', of: 'due' };
    const r = read([['A', 'Sam', '2026-10-01'], ['B', 'Sam', '2026-12-01']], plain);
    expect([r.value, r.series]).toEqual([1, undefined]);
    expect(r.says).toBe('Late: 1 past due; the oldest “A”, due 1 Oct — 18 days late; the next due 1 Dec — “B”.');
    expect(analyse([plain], COLS, ents([['A', 'Sam', '']]), {}, {}, '2026-10-19').p.says).toBe('Late: nothing with a day yet.');
    expect(analyse([plain], COLS, ents([['A', 'Sam', '2026-10-01']])).p.says).toBe("Late: needs today's date to judge the days against.");
  });
});

/* a register on a running method, its stage's gate on none past due */
const def: FlowDefinition = {
  schema: FLOW_SCHEMA, name: 'Actions', purpose: 'Owned and dated.', kind: 'improvement', roles: [],
  stages: [{
    key: 'act', name: 'Act', steps: [{ key: 'actions', title: 'The actions', per: 'line', answer: 'log', columns: COLS, analyses: [OPEN] }],
    gate: { conditions: [{ id: 'none-late', type: 'fieldMeets', policy: 'block', step: 'actions', field: 'past_due', op: '=', value: 0, label: 'No action past due' }] },
  }],
};
const rec = (rows: Row[]): FlowRecord => ({ id: 'r1', projectId: 'p', kind: 'step', stageKey: 'act', stepKey: 'actions', version: 1, outcome: 'planned', entries: ents(rows), sort: 1, createdAt: 1, updatedAt: 1 });

describe('on a running method', () => {
  it('the gate holds while an action is past due, and opens when it is done', () => {
    const held = readFlow({ def, records: [rec(REGISTER)], machines: [], today: '2026-10-19' });
    expect(held.stages[0].gate.conditions[0]).toMatchObject({ met: false });
    const cleared = REGISTER.map((r, i): Row => (i < 3 ? [r[0], r[1], r[2], true] : r));
    expect(readFlow({ def, records: [rec(cleared)], machines: [], today: '2026-10-19' }).stages[0].gate.conditions[0]).toMatchObject({ met: true });
  });
  it('the validator wants a date for the day it is due', () => {
    expect(validateDefinition(def).errors).toEqual([]);
    const bad = structuredClone(def);
    bad.stages[0].steps[0].analyses = [{ ...OPEN, of: 'action' }];
    expect(validateDefinition(bad).errors.map(e => e.message).join(' | ')).toMatch(/judges “Action” as the day it is due, but it is not a date — give it a date column/);
  });
});
