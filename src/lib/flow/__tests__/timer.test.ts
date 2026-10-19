/* A TIMED BOX (lib/flow/definition 'timer', lib/flow/timing): a time taken
 * on the floor with a tap is a number in its unit like any other box — kept
 * by the validator in seconds, minutes or hours, read from a proposal,
 * worked on by every analysis, judged against its limits, and fed to a gate
 * or a measure — and Faultline's short-stops method is built on it. */
import { describe, expect, it } from 'vitest';
import { FLOW_SCHEMA, numbersOf, timerUnit, type FlowDefinition } from '../definition';
import { clockSaid, timeIn } from '../timing';
import { validateDefinition } from '../validate';
import { fromProposal, toProposal } from '../proposal';
import { analyse, isNumberColumn } from '../analysis';
import { limitsBroken, readFlow } from '../runtime';
import { libraryEntry } from '../library';
import type { FlowRecord } from '../records';

describe('a time taken with a tap, in its unit', () => {
  it('kept as the floor reads it — a tenth of a second, a hundredth of a minute, a thousandth of an hour', () => {
    expect(timeIn(83_449, 's')).toBe(83.4);
    expect(timeIn(83_450, 's')).toBe(83.5);
    /* 83.45 s is 1.39083 min */
    expect(timeIn(83_450, 'min')).toBe(1.39);
    /* 1 h 30 min 18 s is 1.505 h */
    expect(timeIn(5_418_000, 'h')).toBe(1.505);
    expect(timeIn(-40, 's')).toBe(0);
  });
  it('the running clock said as a person reads it', () => {
    expect(clockSaid(7_349)).toBe('0:07.3');
    expect(clockSaid(724_000)).toBe('12:04.0');
    expect(clockSaid(3_729_900)).toBe('1:02:09');
    expect(clockSaid(59_990)).toBe('0:59.9');
  });
  it('seconds unless the box says minutes or hours', () => {
    expect(timerUnit({})).toBe('s');
    expect(timerUnit({ unit: 'min' })).toBe('min');
    expect(timerUnit({ unit: 'packs' })).toBe('s');
  });
});

const def = (unit?: string, extra: Record<string, unknown> = {}): unknown => ({
  schema: FLOW_SCHEMA, name: 'Changeover timed', purpose: 'Each changeover timed as it happens.', kind: 'improvement',
  roles: [{ key: 'lead', name: 'Line lead' }],
  stages: [{
    key: 'time', name: 'Time it', steps: [{
      key: 'changeover', title: 'Time the changeover', per: 'line', answer: 'measure',
      fields: [{ key: 'changeover', label: 'Changeover', type: 'timer', ...(unit !== undefined ? { unit } : {}), max: 10, required: true, ...extra }],
    }],
    gate: { conditions: [{ id: 'g', type: 'fieldMeets', policy: 'block', step: 'changeover', field: 'changeover', op: '<=', value: 10 }] },
  }],
  measures: [{ key: 'changeover', name: 'Changeover', unit: 'min', better: 'lower', from: [{ step: 'changeover', field: 'changeover' }] }],
});

describe('the validator keeps a timed box', () => {
  it('in seconds when it names nothing; in minutes or hours when it says so; with its limits', () => {
    const none = validateDefinition(def());
    expect(none.errors).toEqual([]);
    expect(none.def?.stages[0].steps[0].fields?.[0]).toEqual({ key: 'changeover', label: 'Changeover', type: 'timer', unit: 's', max: 10, required: true });
    expect(validateDefinition(def('min')).def?.stages[0].steps[0].fields?.[0].unit).toBe('min');
  });
  it('refused, in words, when its unit is not a time', () => {
    expect(validateDefinition(def('packs')).errors.map(e => e.message).join(' | '))
      .toMatch(/"Changeover" is timed, so it is kept in s, min, h — not "packs"/);
  });
  it('a number to a gate, a measure and a worked-out box', () => {
    const c = validateDefinition(def('min', {}));
    expect(c.errors).toEqual([]);
    expect(numbersOf(c.def!.stages[0].steps[0]).map(f => f.key)).toEqual(['changeover']);
    const withSum = def('min') as { stages: { steps: { fields: unknown[] }[] }[] };
    withSum.stages[0].steps[0].fields.push({ key: 'seconds', label: 'Seconds', type: 'calc', formula: 'changeover * 60' });
    expect(validateDefinition(withSum).errors).toEqual([]);
  });
});

describe('judged and read like any number', () => {
  const checked = validateDefinition(def('min')).def as FlowDefinition;
  const step = checked.stages[0].steps[0];
  it('outside its limit, said with its unit', () => {
    expect(limitsBroken(step, { changeover: 12.5 })).toEqual(['Changeover 12.5 min — at most 10 min']);
    expect(limitsBroken(step, { changeover: 8.25 })).toEqual([]);
  });
  it('a gate met by the time taken, a measure moved by it', () => {
    const rec = (v: number, n: number): FlowRecord => ({ id: `r${n}`, projectId: 'p', kind: 'step', stageKey: 'time', stepKey: 'changeover', version: 1, outcome: 'done', doneOn: '2026-10-18', values: { changeover: v }, sort: n, createdAt: n, updatedAt: n });
    const s = readFlow({ def: checked, records: [rec(8.25, 1)], machines: [], today: '2026-10-19', startedOn: '2026-10-01' });
    expect(s.stages[0].gate.conditions.find(c => c.id === 'g')?.met).toBe(true);
    expect(s.measures[0].now?.value).toBe(8.25);
  });
});

describe('the assistant’s timed box, read', () => {
  it('a time in words made a unit; none made seconds; said back the same', () => {
    const p = toProposal(validateDefinition(def('min')).def!) as { stages: { steps: { fields: Record<string, unknown>[] }[] }[] };
    expect(p.stages[0].steps[0].fields[0]).toMatchObject({ label: 'Changeover', type: 'timer', unit: 'min' });
    for (const [said, kept] of [['minutes', 'min'], ['', 's'], ['hours', 'h'], ['s', 's']]) {
      p.stages[0].steps[0].fields[0].unit = said;
      const back = validateDefinition(fromProposal({ ...p, assumptions: [], questions: [] }).def);
      expect(back.errors, said).toEqual([]);
      expect(back.def?.stages[0].steps[0].fields?.[0].unit, said).toBe(kept);
    }
  });
});

describe('a count taken with a tap', () => {
  it('a number to every block, gate and measure; its unit and limits kept; read from a proposal and said back', () => {
    const d = structuredClone(def('min')) as { stages: { steps: { fields: Record<string, unknown>[] }[] }[] };
    d.stages[0].steps[0].fields.push({ key: 'rejects', label: 'Rejects', type: 'tally', unit: 'packs', max: 5 });
    const c = validateDefinition(d);
    expect(c.errors).toEqual([]);
    expect(c.def?.stages[0].steps[0].fields?.[1]).toEqual({ key: 'rejects', label: 'Rejects', type: 'tally', unit: 'packs', max: 5 });
    expect(numbersOf(c.def!.stages[0].steps[0]).map(f => f.key)).toEqual(['changeover', 'rejects']);
    expect(isNumberColumn({ key: 'r', label: 'R', type: 'tally' })).toBe(true);
    expect(limitsBroken(c.def!.stages[0].steps[0], { rejects: 7 })).toEqual(['Rejects 7 packs — at most 5 packs']);
    const back = validateDefinition(fromProposal({ ...toProposal(c.def!), assumptions: [], questions: [] }).def);
    expect(back.def?.stages[0].steps[0].fields?.[1]).toMatchObject({ type: 'tally', unit: 'packs', max: 5 });
  });
  it('Faultline’s rejects are counted with a tap', () => {
    expect(libraryEntry('rejects-log')!.build().stages[0].steps[0].columns?.find(c => c.key === 'rejects')).toMatchObject({ type: 'tally', unit: 'packs' });
  });
});

describe('Faultline’s short stops, timed as they are cleared', () => {
  const st = libraryEntry('short-stops')!.build().stages[0].steps[0];
  const col = st.columns!.find(c => c.key === 'time_to_clear')!;
  it('a log whose time is taken with a tap', () => {
    expect(col).toMatchObject({ type: 'timer', unit: 's', required: true });
    expect(isNumberColumn(col)).toBe(true);
  });
  it('worked out on the times: a day, the cause that takes the most time, and the cost at the rate typed', () => {
    /* two days: 16 Oct — Jam 40 s, Jam 50 s, Sensor 30 s; 17 Oct — Jam 60 s, Film 20 s */
    const e = (on: string, by: string, t: number, i: number) => ({ id: `e${i}`, on, at: i, values: { stopped_by: by, time_to_clear: t } });
    const entries = [e('2026-10-16', 'Jam', 40, 1), e('2026-10-16', 'Jam', 50, 2), e('2026-10-16', 'Sensor', 30, 3), e('2026-10-17', 'Jam', 60, 4), e('2026-10-17', 'Film or label', 20, 5)];
    /* the line's own rate, typed once on the step: £12 a minute */
    const r = analyse(st.analyses!, st.columns!, entries, { values: { cost_of_a_minute: 12 }, labels: { cost_of_a_minute: 'What a minute stopped costs' } });
    /* 5 stops over 2 days */
    expect(r.stops_a_day.value).toBe(2.5);
    /* (40+50+30+60+20) = 200 s over 2 days = 100 s a day */
    expect(r.lost_a_day.value).toBe(100);
    /* Jam 150 of 200 s = 75% */
    expect(r.biggest_cause.series?.[0].label).toBe('Jam');
    expect(r.biggest_cause.value).toBe(75);
    /* 200 / 5 = 40 s */
    expect(r.average_stop.value).toBe(40);
    /* 100 s a day / 60 × £12 = £20 a day */
    expect(r.cost_a_day.value).toBe(20);
    expect(r.cost_a_day.says).toMatch(/£20/);
  });
});
