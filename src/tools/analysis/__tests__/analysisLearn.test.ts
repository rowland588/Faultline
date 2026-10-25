/* How fast is a new job being learned (FC-027) — the sentences, tones, refusals and money of the Analysis tool's learning question. The figures under
 * them are SciPy's (src/lib/ie/__tests__/learn.test.ts, scripts/knowledge/cases-w3c.py). */
import { describe, it, expect } from 'vitest';
import { analysisClosing, analysisFigures, analysisPlot, analysisProblem, analysisSays, analysisTiles } from '../analysis';
import type { AgreedAnalysis, StudyReading } from '../../../lib/study';

const rs = (vs: number[]): StudyReading[] => vs.map((value, i) => ({ id: `r${i}`, value, at: i }));
const RUNS = [68, 58, 53, 49, 47, 45, 44, 43];
const A: AgreedAnalysis = { kind: 'learn', name: 'Seconds a pack, new starter', unit: 's', standard: 40, firstName: 'run' };
const say = (a: AgreedAnalysis, r: StudyReading[], rate?: number) => { const f = analysisFigures(a, r, { rate }); return { f, s: analysisSays(f, a) }; };

describe('the record’s eight runs', () => {
  it('85.6% a doubling, the 40 s standard at run 11, the first eight planned at their average', () => {
    const { s } = say(A, rs(RUNS));
    expect(s.verdict).toBe('Standard at run 11'); expect(s.tone).toBe('n');
    expect(s.text).toBe('Seconds a pack, new starter: learning at 85.6% a doubling (we can be 95% confident between 85.0% and 86.3%; R² 0.998) — each time the runs double, the time falls to 85.6% of itself. The 40 s standard arrives at run 11. Plan the first 8 runs at about 50.9 s, the average so far, not at the standard.');
    expect(s.more[0]).toBe('The curve: time at run n = 67.7 s × n^−0.224 (Wright’s unit-time form, fitted to ln time against ln run). At run 16 it gives 36.4 s, at 32 31.1 s — beyond the runs timed it is a projection, not a measurement.');
  });
  it('in money: the units of work in a run and the line’s wage — each missing one named, nothing blocked', () => {
    expect(say(A, rs(RUNS), 13.2).s.more[1]).toBe('In money: give the units of work in a run to say the learning in money.');
    const per = { ...A, perRun: 60 };
    expect(say(per, rs(RUNS)).s.more[1]).toBe('In money: learning to the standard takes about 1.5 hours of extra time over the 11 runs — give the line a wage to say the learning in money.');
    expect(say(per, rs(RUNS), 13.2).s.more[1]).toBe('In money: learning to the standard takes about 1.5 hours of extra time over the 11 runs — £20 of labour at the line’s rate, because of the time over the standard.');
    expect(say(per, rs(RUNS), 13.2).s.verdict).toBe('Standard at run 11');
  });
  it('the tiles and the closing line', () => {
    const f = analysisFigures({ ...A, perRun: 60 }, rs(RUNS), { rate: 13.2 }), a = { ...A, perRun: 60 };
    expect(analysisTiles(f, a).map(t => [t.k, t.v])).toEqual([['Runs', '8'], ['Learning rate', '85.6%'], ['Standard arrives', 'run 11'], ['Plan at', '50.9 s'], ['In money', '£20']]);
    expect(analysisClosing(f, a, analysisSays(f, a)).text).toBe('Standard at run 11 — Seconds a pack, new starter, 95% confidence.');
  });
  it('the picture: the runs, the fitted curve out to the standard and the level of the standard', () => {
    const p = analysisPlot(analysisFigures(A, rs(RUNS)), A);
    expect(p).toMatchObject({ kind: 'scatter', xName: 'Run', hline: { y: 40, label: 'standard 40 s' } });
    expect(p?.kind === 'scatter' && p.pts.length).toBe(8); expect(p?.kind === 'scatter' && p.curve?.[0]).toEqual([1, expect.closeTo(67.686437, 4)]);
    expect(p?.kind === 'scatter' && p.curve?.[p.curve.length - 1]?.[0]).toBe(14);   // a fifth past the run the standard arrives at
  });
});

describe('what else it says', () => {
  it('a curve that flattens above the standard — amber: the method or the station, not the person', () => {
    const { s } = say(A, rs([68, 58, 53, 49, 47, 46, 46, 46, 46, 46, 46, 46]));
    expect(s.verdict).toBe('Flattening above the standard'); expect(s.tone).toBe('a');
    expect(s.text).toContain('But the last four runs have stopped falling (slope 0.00 against −0.16 overall) while still above the 40 s standard: the method or the station limits it, not the person — redesign, not more practice.');
  });
  it('a standard already met — green; a standard far beyond the runs timed — a guess, amber', () => {
    expect(say({ ...A, standard: 46 }, rs(RUNS)).s).toMatchObject({ verdict: 'Standard met at run 6', tone: 'g' });
    const far = say(A, rs([100, 99, 98.5, 98, 97.8, 97.5, 97.2, 97])).s;
    expect(far.tone).toBe('a'); expect(far.verdict).toBe('Standard far off'); expect(far.text).toContain('would arrive at a run beyond 10,000 — more than 4 times the 8 runs timed, a guess and not a forecast.');
  });
  it('a time that is not falling does not reach the standard by learning', () => {
    expect(say(A, rs([50, 51, 50, 52, 51, 53, 52, 54])).s).toMatchObject({ verdict: 'Not reaching the standard', tone: 'a' });
  });
  it('no standard named: the rate and the plan are still said', () => {
    const { s } = say({ ...A, standard: undefined }, rs(RUNS));
    expect(s.text).toBe('Seconds a pack, new starter: learning at 85.6% a doubling (we can be 95% confident between 85.0% and 86.3%; R² 0.998) — each time the runs double, the time falls to 85.6% of itself. Plan the first 8 runs at about 50.9 s, the average so far.');
  });
  it('too few, none, a bad standard, a bad run size, a time in an unknown unit', () => {
    expect(say(A, rs(RUNS.slice(0, 4))).s).toMatchObject({ verdict: 'Too few', text: '4 runs — a curve is fitted from 6, spanning a doubling or two.' });
    expect(say(A, []).s.verdict).toBe('Not started');
    expect(analysisProblem({ ...A, standard: -3 })).toBe('The standard it is heading for — a time above 0, in the unit, or leave it blank.');
    expect(analysisProblem({ ...A, perRun: 2.5 })).toBe('Units in a run — a whole number, 1 or more, or leave it blank.');
    expect(analysisProblem(A)).toBe('');
    expect(say({ ...A, unit: 'packs', perRun: 60 }, rs(RUNS), 13.2).s.more.join(' ')).toContain('needs the time in seconds or minutes');
  });
  it('minutes are minutes: the same money', () => {
    expect(say({ ...A, unit: 'min', standard: 40 / 60, perRun: 60 }, rs(RUNS.map(x => x / 60)), 13.2).s.more[1]).toContain('1.5 hours of extra time over the 11 runs — £20 of labour');
  });
  it('a run is called what it is called', () => {
    expect(say({ ...A, firstName: 'Day' }, rs(RUNS)).s.text).toContain('each time the days double');
  });
});
