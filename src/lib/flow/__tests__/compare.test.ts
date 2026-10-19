/* BEFORE AND AFTER, PROVED (the 'compare' block, lib/flow/analysis): a log
 * against an earlier one on the method — how far it moved, and how sure it
 * is not chance, by Welch's t-test; told which way is better, how sure it
 * got better. The t-distribution is held to its exact forms and to the
 * printed tables, Welch's test to an integration of the t density that
 * shares no code with it, and the block, the runtime, the validator and the
 * proposal to figures worked by hand. */
import { describe, expect, it } from 'vitest';
import { analyse, incompleteBeta, tTwoSided, welch, type EarlierLog, type FlowAnalysis, type FlowEntry } from '../analysis';
import { FLOW_SCHEMA, type FlowDefinition, type FlowField } from '../definition';
import { readFlow } from '../runtime';
import { validateDefinition } from '../validate';
import { fromProposal, toProposal } from '../proposal';
import type { FlowRecord } from '../records';

describe('the t-distribution, as the tables give it', () => {
  it('the incomplete beta on its closed forms', () => {
    expect(incompleteBeta(0.3, 1, 1)).toBeCloseTo(0.3, 12);
    expect(incompleteBeta(0.4, 3, 1)).toBeCloseTo(0.064, 12);
    expect(incompleteBeta(0.2, 1, 4)).toBeCloseTo(1 - 0.8 ** 4, 12);
    expect(incompleteBeta(0.5, 2.5, 2.5)).toBeCloseTo(0.5, 12);
  });
  it('two-sided chances on the exact forms for one and two degrees of freedom', () => {
    /* one degree of freedom is the Cauchy: P(|T| > 1) = 1/2 */
    expect(tTwoSided(1, 1)).toBeCloseTo(0.5, 10);
    /* two: P(|T| > t) = 1 − t/√(2 + t²) */
    expect(tTwoSided(1, 2)).toBeCloseTo(1 - 1 / Math.sqrt(3), 10);
    expect(tTwoSided(-2, 2)).toBeCloseTo(1 - 2 / Math.sqrt(6), 10);
  });
  it('the printed critical values — 5% and 1% two-sided', () => {
    for (const [t, df, p] of [[12.7062, 1, 0.05], [2.7764, 4, 0.05], [2.5706, 5, 0.05], [4.0321, 5, 0.01], [2.2281, 10, 0.05], [3.1693, 10, 0.01], [2.0860, 20, 0.05], [1.9600, 1e9, 0.05]] as const) {
      expect(Math.abs(tTwoSided(t, df) - p), `t ${t}, df ${df}`).toBeLessThan(2e-4);
    }
  });
});

/* the two-sided tail of Student's t by Simpson's rule on the density itself,
   normalised by its own integral — no gamma function, no incomplete beta */
function tailByIntegration(t: number, df: number): number {
  const g = (x: number) => (1 + (x * x) / df) ** (-(df + 1) / 2);
  const from = (a: number) => {
    const n = 200_000, h = 1 / n;
    let s = 0;
    for (let i = 0; i <= n; i++) {
      const u = i * h;
      const f = u >= 1 ? 0 : g(a + u / (1 - u)) / (1 - u) ** 2;
      s += f * (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
    }
    return (s * h) / 3;
  };
  return from(Math.abs(t)) / from(0);
}

describe('Welch’s t-test, worked by hand', () => {
  /* before 10, 12, 14 — mean 12, variance 4; after 6, 7, 8, 9, 10 — mean 8, variance 2.5.
     se² = 4/3 + 2.5/5 = 1.8333; t = −4 / 1.35401 = −2.95420;
     df = 1.8333² / ((4/3)²/2 + 0.5²/4) = 3.36111 / 0.95139 = 3.53285 */
  const w = welch([10, 12, 14], [6, 7, 8, 9, 10])!;
  it('the difference, t and its degrees of freedom', () => {
    expect(w.diff).toBe(-4);
    expect(w.t).toBeCloseTo(-2.954196, 5);
    expect(w.df).toBeCloseTo(3.532847, 5);
  });
  it('its chance, the same as the density integrated', () => {
    expect(w.p).toBeCloseTo(tailByIntegration(w.t, w.df), 6);
    expect(w.p).toBeGreaterThan(0.03);
    expect(w.p).toBeLessThan(0.07);
  });
  it('nothing to test with fewer than two on a side; no spread is certain either way', () => {
    expect(welch([4], [1, 2, 3])).toBeUndefined();
    expect(welch([5, 5, 5], [3, 3, 3])).toMatchObject({ diff: -2, p: 0 });
    expect(welch([5, 5], [5, 5])).toMatchObject({ diff: 0, p: 1 });
  });
});

const COLS: FlowField[] = [{ key: 'secs', label: 'Seconds', type: 'timer', unit: 's' }, { key: 'cause', label: 'Cause', type: 'choice', options: ['Jam', 'Film'] }];
let n = 0;
const ents = (vals: (number | [number, string, string?])[], day = '2026-10-10'): FlowEntry[] => vals.map(v => {
  const [secs, cause, on] = Array.isArray(v) ? v : [v, 'Jam'];
  return { id: `e${++n}`, on: on ?? day, at: n, values: { secs, cause } };
});
const LOG = (vals: Parameters<typeof ents>[0]): Record<string, EarlierLog> => ({ before: { title: 'Time it', columns: COLS, entries: ents(vals) } });
const one = (a: Partial<FlowAnalysis>, now: FlowEntry[], logs: Record<string, EarlierLog>) =>
  analyse([{ key: 'proved', label: 'Shorter?', block: 'compare', from: 'before', ...a }], COLS, now, {}, logs).proved;

describe('the block: how far it moved, and how sure', () => {
  const p = welch([10, 12, 14], [6, 7, 8, 9, 10])!.p;
  it('better lower, and it fell: how sure it got better — one-sided', () => {
    const r = one({ of: 'secs', better: 'lower' }, ents([6, 7, 8, 9, 10]), LOG([10, 12, 14]));
    const sure = (1 - p / 2) * 100;
    expect(r.value).toBeCloseTo(sure, 10);
    expect(r.says).toBe(`Shorter?: seconds an entry fell from 12 s to 8 s (−33.33%) — better, and ${Math.round(sure * 100) / 100}% sure it is not chance (on 3 entries before and 5 now, against “Time it”; fewer than 5 on a side: read it with care).`);
    expect(r.series).toEqual([{ label: 'Before', value: 12 }, { label: 'Now', value: 8 }]);
    expect(r.unit).toBe('%');
  });
  it('better lower, but it rose: low, and said worse', () => {
    const r = one({ of: 'secs', better: 'lower' }, ents([10, 12, 14]), LOG([6, 7, 8, 9, 10]));
    expect(r.value).toBeCloseTo((p / 2) * 100, 10);
    expect(r.says).toMatch(/rose from 8 s to 12 s \(\+50%\) — worse — and \d+(\.\d+)?% sure it is not chance: what changed with the countermeasure\?/);
  });
  it('which way is better not said: how sure it changed at all — two-sided', () => {
    const r = one({ of: 'secs' }, ents([6, 7, 8, 9, 10]), LOG([10, 12, 14]));
    expect(r.value).toBeCloseTo((1 - p) * 100, 10);
    expect(r.says).toMatch(p <= 0.05 ? /— a real change: / : /— probably real: /);
  });
  it('no column: the entries a day compared', () => {
    /* before: 3, 5 and 4 entries on three days — 4 a day; now: 1, 2, 1, 2 — 1.5 a day */
    const day = (d: number) => `2026-10-${String(d).padStart(2, '0')}`;
    const before = [1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3].map(d => [9, 'Jam', day(d)] as [number, string, string]);
    const now = [11, 12, 12, 13, 14, 14].map(d => [9, 'Jam', day(d)] as [number, string, string]);
    const r = one({ better: 'lower' }, ents(now), LOG(before));
    expect(r.series).toEqual([{ label: 'Before', value: 4 }, { label: 'Now', value: 1.5 }]);
    expect(r.says).toMatch(/^Shorter\?: entries a day fell from 4 a day to 1\.5 a day \(−62\.5%\) — better, /);
    expect(r.says).toMatch(/\(on 3 days before and 4 now, against “Time it”; fewer than 5 on a side/);
  });
  it('only the entries that meet it, on both logs', () => {
    const r = one({ of: 'secs', when: { column: 'cause', op: '=', value: 'Film' } }, ents([[20, 'Film'], [22, 'Film'], [1, 'Jam']]), LOG([[30, 'Film'], [34, 'Film'], [2, 'Jam']]));
    expect(r.series).toEqual([{ label: 'Before', value: 32 }, { label: 'Now', value: 21 }]);
    expect(r.says).toMatch(/^Shorter\? where Cause = Film: seconds an entry fell from 32 s to 21 s/);
  });
  it('said plainly when it cannot be read', () => {
    expect(one({ of: 'secs' }, ents([1, 2, 3]), LOG([4])).says).toBe('Shorter?: needs at least 2 entries on each side to compare — 1 entry before and 3 now (“Time it” before).');
    expect(one({ of: 'secs' }, ents([1, 2]), {}).says).toBe('Shorter?: needs the earlier log it is compared with — it is not on the method.');
    expect(one({ of: 'secs' }, ents([1, 2]), {}).value).toBeUndefined();
    const same = one({ of: 'secs', better: 'lower' }, ents([4, 6]), LOG([6, 4]));
    expect([same.value, same.says]).toEqual([0, 'Shorter?: seconds an entry the same before and now, 5 s — no change (on 2 entries before and 2 now, against “Time it”; fewer than 5 on a side: read it with care).']);
    /* every entry moved and none varies: certain — said as more than 99.9%, never 100% */
    const flat = one({ of: 'secs', better: 'lower' }, ents([3, 3, 3]), LOG([5, 5, 5]));
    expect(flat.value).toBe(99.9);
    expect(flat.says).toMatch(/better, and more than 99\.9% sure it is not chance/);
  });
});

/* a method with a log, then the same log again, compared — its gate on the proof */
const def = (perMachine = false): FlowDefinition => ({
  schema: FLOW_SCHEMA, name: 'Stops timed', purpose: 'Timed, fixed and timed again.', kind: 'improvement', roles: [],
  stages: [
    { key: 'one', name: 'Before', steps: [{ key: 'before', title: 'Time it', per: perMachine ? 'machine' : 'line', answer: 'log', columns: COLS }], gate: { conditions: [{ id: 'g1', type: 'stepsDone', policy: 'block' }] } },
    {
      key: 'two', name: 'After', steps: [{ key: 'after', title: 'Time it again', per: perMachine ? 'machine' : 'line', answer: 'log', columns: COLS, analyses: [{ key: 'proved', label: 'Shorter?', block: 'compare', of: 'secs', from: 'before', better: 'lower' }] }],
      gate: { conditions: [{ id: 'g2', type: 'fieldMeets', policy: 'block', step: 'after', field: 'proved', op: '>=', value: 95 }] },
    },
  ],
});
const rec = (stageKey: string, stepKey: string, vals: number[], assetId?: string): FlowRecord => ({
  id: `r${++n}`, projectId: 'p', kind: 'step', stageKey, stepKey, version: 1, outcome: 'done', doneOn: '2026-10-18', entries: ents(vals), sort: n, createdAt: n, updatedAt: n, ...(assetId ? { assetId } : {}),
});

describe('on a running method', () => {
  it('the second log reads the first; its gate passes on the proof', () => {
    const s = readFlow({ def: def(), records: [rec('one', 'before', [40, 44, 38, 42, 41, 39]), rec('two', 'after', [25, 27, 24, 26, 28, 25])], machines: [], today: '2026-10-19' });
    const after = s.stages[1].steps[0];
    /* before: 244 / 6 = 40.67 s; now: 155 / 6 = 25.83 s */
    expect(after.analysis?.proved.series).toEqual([{ label: 'Before', value: 244 / 6 }, { label: 'Now', value: 155 / 6 }]);
    expect(after.analysis?.proved.value).toBeGreaterThan(99);
    expect(s.stages[1].gate.conditions[0].met).toBe(true);
  });
  it('not proved yet: the gate holds', () => {
    const s = readFlow({ def: def(), records: [rec('one', 'before', [40, 20, 60]), rec('two', 'after', [38, 22, 55])], machines: [], today: '2026-10-19' });
    expect(s.stages[1].steps[0].analysis?.proved.says).toMatch(/not shown yet/);
    expect(s.stages[1].gate.conditions[0].met).toBe(false);
  });
  it('per machine, each against its own before', () => {
    const machines = [{ id: 'm1', name: 'Filler' }, { id: 'm2', name: 'Sealer' }];
    const s = readFlow({ def: def(true), records: [rec('one', 'before', [40, 42, 41], 'm1'), rec('one', 'before', [10, 11, 12], 'm2'), rec('two', 'after', [20, 21, 22], 'm1'), rec('two', 'after', [10, 12, 11], 'm2')], machines, today: '2026-10-19' });
    expect(s.stages[1].steps.map(x => [x.machine, x.analysis?.proved.series?.[0].value])).toEqual([['Filler', 41], ['Sealer', 11]]);
  });
});

describe('the validator keeps a comparison honest', () => {
  const said = (patch: Record<string, unknown>, stage = 1) => {
    const d = structuredClone(def()) as unknown as { stages: { steps: { analyses?: Record<string, unknown>[]; answer: string; columns?: unknown[] }[] }[] };
    Object.assign(d.stages[stage].steps[0].analyses![0], patch);
    return validateDefinition(d).errors.map(e => e.message).join(' | ');
  };
  it('kept when it reads a log before it on the same column', () => {
    expect(validateDefinition(def()).errors).toEqual([]);
    expect(validateDefinition(def()).def?.stages[1].steps[0].analyses?.[0]).toEqual({ key: 'proved', label: 'Shorter?', block: 'compare', of: 'secs', from: 'before', better: 'lower' });
  });
  it('refused in words otherwise', () => {
    expect(said({ from: undefined })).toMatch(/compares this log with an earlier one — say which/);
    expect(said({ from: 'nope' })).toMatch(/compares with a step that is not on the method: "nope"/);
    expect(said({ from: 'after' })).toMatch(/compares with “Time it again”, which does not come before it/);
    expect(said({ better: 'up' })).toMatch(/says better is "up" — higher or lower/);
    const d = structuredClone(def());
    d.stages[0].steps[0].columns = [{ key: 'secs', label: 'Seconds', type: 'text' }];
    expect(validateDefinition(d).errors.map(e => e.message).join(' | ')).toMatch(/compares “Seconds”, which “Time it” does not log as a number/);
    const e = structuredClone(def());
    e.stages[0].steps[0] = { key: 'before', title: 'Time it', per: 'line', answer: 'done' };
    expect(validateDefinition(e).errors.map(x => x.message).join(' | ')).toMatch(/compares with “Time it”, which is not a log/);
    const f = structuredClone(def()) as unknown as { stages: { steps: { analyses?: Record<string, unknown>[] }[] }[] };
    f.stages[1].steps[0].analyses!.push({ key: 'avg', label: 'Average', block: 'mean', of: 'secs', better: 'lower' });
    expect(validateDefinition(f).errors.map(x => x.message).join(' | ')).toMatch(/says which way is better, but only a before-and-after reads it/);
  });
});

describe('a comparison proposed by the assistant', () => {
  it('the earlier log by its title, the way that is better — said back the same', () => {
    const p = toProposal(def()) as { stages: { steps: { analyses: Record<string, unknown>[] }[] }[] };
    expect(p.stages[1].steps[0].analyses[0]).toMatchObject({ block: 'compare', of: 'Seconds', from_step: 'Time it', better: 'lower' });
    const back = validateDefinition(fromProposal({ ...p, assumptions: [], questions: [] }).def);
    expect(back.errors).toEqual([]);
    expect(back.def?.stages[1].steps[0].analyses?.[0]).toMatchObject({ block: 'compare', of: 'seconds', from: 'time-it', better: 'lower' });
  });
});
