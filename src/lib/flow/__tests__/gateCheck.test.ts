/* THE SERVER'S READING OF A GATE PASS (lib/flow/gateCheck) — a pass the
 * records bear out, one a changed device forged, one passed over with the
 * owner's reason, and the records read as they stood when it was passed:
 * a problem raised later, a machine added later, a step done later and a log
 * entry written later all leave a sound pass sound. */
import { describe, it, expect } from 'vitest';
import { readPass, readPasses, gateCheckSaid, asGateCheck, sameReading, type CheckInputs } from '../gateCheck';
import { validateDefinition } from '../validate';
import { FLOW_SCHEMA, type FlowDefinition } from '../definition';
import type { FlowRecord } from '../records';

const def: FlowDefinition = validateDefinition({
  schema: FLOW_SCHEMA, name: 'Commissioning', purpose: 'p', kind: 'stagegate',
  stages: [
    {
      key: 'mech', name: 'Mechanical',
      steps: [
        { key: 'levelled', title: 'Positioned and levelled', per: 'machine', answer: 'done' },
        { key: 'count', title: 'Stops counted', per: 'line', answer: 'log', minEntries: 2, columns: [{ key: 'min', label: 'Minutes', type: 'number', required: true }] },
      ],
      gate: {
        conditions: [
          { id: 'all', type: 'stepsDone', policy: 'block' },
          { id: 'crit', type: 'noOpenProblems', priority: 'critical', policy: 'block' },
          { id: 'tidy', type: 'manual', label: 'Area tidied and guarded', policy: 'block' },
        ],
      },
    },
    {
      key: 'hand', name: 'Handover',
      steps: [{ key: 'signed', title: 'Handed over', per: 'line', answer: 'signoff' }],
      gate: { conditions: [{ id: 'sig', type: 'signedOff', step: 'signed', policy: 'block' }] },
    },
  ],
}).def!;

const T = Date.parse('2026-10-10T12:00:00Z');
const H = 3_600_000;
const sealer = { id: 'm1', name: 'Tray sealer', updatedAt: T - 9 * H };
let n = 0;
const rec = (o: Partial<FlowRecord> & Pick<FlowRecord, 'stageKey'>): FlowRecord =>
  ({ id: `r${++n}`, projectId: 'p', kind: 'step', version: 1, outcome: 'planned', sort: n, createdAt: T - 8 * H, updatedAt: T - 8 * H, ...o });
const entry = (id: string, at: number) => ({ id, on: '2026-10-10', at, values: { min: 4 } });
/** Mechanical done properly by 12:00 on the 10th. */
const done = (): FlowRecord[] => [
  rec({ stageKey: 'mech', stepKey: 'levelled', assetId: 'm1', outcome: 'done', doneOn: '2026-10-09' }),
  rec({ stageKey: 'mech', stepKey: 'count', outcome: 'done', doneOn: '2026-10-10', entries: [entry('e1', T - 5 * H), entry('e2', T - 4 * H)] }),
];
const pass = (o: Partial<FlowRecord> = {}): FlowRecord =>
  rec({ stageKey: 'mech', kind: 'gate', outcome: 'done', doneOn: '2026-10-10', who: 'Rowland', checks: { tidy: 'Rowland' }, createdAt: T, updatedAt: T, ...o });
const inputs = (records: FlowRecord[], o: Partial<CheckInputs> = {}): CheckInputs =>
  ({ defs: { 1: def }, current: 1, records, machines: [sealer], ...o });

describe('a pass the records bear out', () => {
  it('agrees, and says so', () => {
    const p = pass();
    const r = readPass(inputs([...done(), p]), p);
    expect(r.verdict).toBe('agrees');
    expect(r.unmet).toEqual([]);
    expect(r.says).toBe('Checked on the server, as the records stood on 10 Oct: they bear this pass out — every condition was met.');
  });
});

describe('a pass a changed device recorded without the work', () => {
  it('disagrees, naming what the records do not show', () => {
    const p = pass({ checks: {} });
    const recs = [rec({ stageKey: 'mech', stepKey: 'levelled', assetId: 'm1' }), p];
    const r = readPass(inputs(recs), p);
    expect(r.verdict).toBe('disagrees');
    expect(r.unmet).toEqual(['Every step in Mechanical done — 0 of 2 done', 'Area tidied and guarded — not confirmed']);
    expect(r.says).toBe('Checked on the server, as the records stood on 10 Oct: they do not bear this pass out — Every step in Mechanical done — 0 of 2 done; Area tidied and guarded — not confirmed — and no reason to pass over them was given.');
  });

  it('a later gate passed before the one ahead of it', () => {
    const p = rec({ stageKey: 'hand', kind: 'gate', outcome: 'done', doneOn: '2026-10-10', createdAt: T, updatedAt: T });
    const s = rec({ stageKey: 'hand', stepKey: 'signed', outcome: 'done', doneOn: '2026-10-10', signedBy: 'Sam' });
    const r = readPass(inputs([s, p]), p);
    expect(r.verdict).toBe('disagrees');
    expect(r.unmet).toEqual(["Mechanical's gate was not passed first"]);
  });

  it('a pass under a version the server does not hold is read against the current one, and said', () => {
    const p = pass({ version: 4 });
    const r = readPass(inputs([...done(), p]), p);
    expect(r.verdict).toBe('agrees');
    expect(r.later).toEqual(['read against version 1 — version 4, which it was passed under, is not on the server']);
  });
});

describe('passed over what was unmet, with the owner’s reason', () => {
  it('is the owner’s call, confirmed as kept', () => {
    const p = pass({ checks: {}, override: 'OEM signed it off on paper; the guard goes on Monday' });
    const r = readPass(inputs([...done(), p]), p);
    expect(r.verdict).toBe('override');
    expect(r.override).toBe('OEM signed it off on paper; the guard goes on Monday');
    expect(r.says).toBe('Checked on the server, as the records stood on 10 Oct: passed over one condition not met — Area tidied and guarded — not confirmed — with the owner’s reason kept: “OEM signed it off on paper; the guard goes on Monday”.');
  });
});

describe('read as the records stood when it was passed', () => {
  it('a critical problem raised after the pass leaves it sound; one open at the pass does not', () => {
    const p = pass();
    const after = readPass(inputs([...done(), p], { problems: [{ title: 'Guard missing', open: true, priority: 'critical', raisedAt: T + H }] }), p);
    expect(after.verdict).toBe('agrees');
    const before = readPass(inputs([...done(), p], { problems: [{ title: 'Guard missing', open: true, priority: 'critical', raisedAt: T - H }] }), p);
    expect(before.verdict).toBe('disagrees');
    expect(before.unmet).toEqual(['No open critical problems — 1 open: Guard missing']);
  });

  it('a problem taken off after the pass was open at it; one taken off before was not', () => {
    const p = pass();
    const crit = { title: 'Guard missing', open: true, priority: 'critical' as const, raisedAt: T - 2 * H };
    expect(readPass(inputs([...done(), p], { problems: [{ ...crit, goneAt: T + H }] }), p).verdict).toBe('disagrees');
    expect(readPass(inputs([...done(), p], { problems: [{ ...crit, goneAt: T - H }] }), p).verdict).toBe('agrees');
  });

  it('a problem closed only after the pass was open at it', () => {
    const p = pass();
    const r = readPass(inputs([...done(), p], { problems: [{ title: 'Guard missing', open: false, priority: 'critical', raisedAt: T - H, closedAt: T + H }] }), p);
    expect(r.verdict).toBe('disagrees');
  });

  it('a machine added to the job after the pass is not held against it, and is said', () => {
    const p = pass();
    const packer = { id: 'm2', name: 'Case packer', updatedAt: T + 2 * H };
    const r = readPass(inputs([...done(), p], { machines: [sealer, packer] }), p);
    expect(r.verdict).toBe('agrees');
    expect(r.later).toEqual(['Case packer — on the job only after it was passed']);
  });

  it('a step done only after the pass’s day was not done at it', () => {
    const p = pass();
    const recs = done();
    recs[0] = { ...recs[0], doneOn: '2026-10-12', createdAt: T - 8 * H, updatedAt: T + 50 * H };
    const r = readPass(inputs([...recs, p]), p);
    expect(r.verdict).toBe('disagrees');
    expect(r.unmet[0]).toBe('Every step in Mechanical done — 1 of 2 done');
    expect(r.later).toContain('“Positioned and levelled” (Tray sealer) — changed after it was passed');
  });

  it('a step recorded after the pass is left out; a log entry written after it does not count', () => {
    const p = pass();
    const recs = done();
    recs[1] = { ...recs[1], entries: [entry('e1', T - 5 * H), entry('e2', T + H)], updatedAt: T + H };
    const r = readPass(inputs([...recs, p]), p);
    expect(r.verdict).toBe('disagrees');
    expect(r.unmet[0]).toBe('Every step in Mechanical done — 1 of 2 done');
    const late = [recs[0], { ...recs[1], entries: [entry('e1', T - 5 * H), entry('e2', T - 4 * H)] }, rec({ stageKey: 'mech', stepKey: 'levelled', assetId: 'm1', createdAt: T + H, updatedAt: T + H }), p];
    expect(readPass(inputs(late), p).verdict).toBe('agrees');
  });

  it('a step taken off after the pass was there at it, and is said', () => {
    const p = pass();
    const recs = done();
    recs[0] = { ...recs[0], deletedAt: T + H, updatedAt: T + H };
    const r = readPass(inputs([...recs, p]), p);
    expect(r.verdict).toBe('agrees');
    expect(r.later).toEqual(['“Positioned and levelled” (Tray sealer) — taken off after it was passed']);
    expect(r.says).toBe('Checked on the server, as the records stood on 10 Oct: they bear this pass out — every condition was met. Since: “Positioned and levelled” (Tray sealer) — taken off after it was passed.');
  });
});

describe('every pass on a project, and the record kept', () => {
  it('reads each live pass in the order passed; a reopened one is not read', () => {
    const p1 = pass();
    const s = rec({ stageKey: 'hand', stepKey: 'signed', outcome: 'done', doneOn: '2026-10-11', signedBy: 'Sam', createdAt: T + H, updatedAt: T + H });
    const p2 = rec({ stageKey: 'hand', kind: 'gate', outcome: 'done', doneOn: '2026-10-11', createdAt: T + 2 * H, updatedAt: T + 2 * H });
    const gone = pass({ id: 'old', deletedAt: T - H, createdAt: T - 2 * H });
    const all = readPasses(inputs([...done(), p1, s, p2, gone]));
    expect(all.map(r => [r.stageKey, r.verdict])).toEqual([['mech', 'agrees'], ['hand', 'agrees']]);
    const kept = asGateCheck(all[1], 'p', T + 3 * H);
    expect(kept).toMatchObject({ id: p2.id, projectId: 'p', stageKey: 'hand', verdict: 'agrees', readAt: T + 3 * H, createdAt: T + 3 * H });
    expect(sameReading(kept, { ...kept, readAt: 1 } as typeof kept)).toBe(true);
    expect(sameReading(kept, { ...kept, verdict: 'disagrees' })).toBe(false);
  });

  it('the words with no day', () => {
    expect(gateCheckSaid({ verdict: 'disagrees', unmet: ['“Handed over” done — not done'], later: [] }))
      .toBe('Checked on the server: the records do not bear this pass out — “Handed over” done — not done — and no reason to pass over it was given.');
  });
});
