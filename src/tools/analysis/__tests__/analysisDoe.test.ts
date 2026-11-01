/* FC-111 on the Analysis tool — the plasma-etch 2³ with two replicates (Montgomery, ch. 6; figures from NumPy/SciPy, scripts/knowledge/cases-m6-analysis.py)
 * read through the page’s own module: the run sheet, the sentences, the tiles, the tables and the paper’s words. */
import { describe, expect, it } from 'vitest';
import { analysisClosing, analysisFigures, analysisGrids, analysisPicture, analysisProblem, analysisSays, analysisTiles } from '../analysis';
import { doeAgreedWords, doePlan, doeReadingWord, doeRunWords, type DoeFigures } from '../doe';
import type { AgreedAnalysis, AgreedDoe, StudyReading } from '../../../lib/study';

const ETCH = [[550, 604], [669, 650], [633, 601], [642, 635], [1037, 1052], [749, 868], [1075, 1063], [729, 860]];
const doe = (extra: Partial<AgreedDoe> = {}): AgreedDoe => ({ factors: [{ name: 'Gap', unit: 'cm', low: 0.8, high: 1.2 }, { name: 'Gas flow', unit: 'sccm', low: 125, high: 200 }, { name: 'RF power', unit: 'W', low: 275, high: 325 }], replicates: 2, seed: 20260401, ...extra });
const agreed = (d: AgreedDoe, extra: Partial<AgreedAnalysis> = {}): AgreedAnalysis => ({ kind: 'doe', name: 'Etch rate', unit: 'Å/min', confidence: 0.95, better: 'higher', doe: d, ...extra });
/** the readings the page would write, run by run, from the table of responses (corner, time) */
const readingsFor = (d: AgreedDoe, cells: number[][], only?: number): StudyReading[] => doePlan(d).slice(0, only).map((p, i) => ({ id: `r${i}`, at: i, arm: String(p.no), group: p.rep, xs: p.levels, value: p.centre ? 700 : cells[p.std][p.rep - 1] }));
const fig = (a: AgreedAnalysis, rs: StudyReading[]): DoeFigures => analysisFigures(a, rs) as DoeFigures;

describe('Designed experiments — the run sheet', () => {
  it('shuffles all 16 runs from the stored seed, the same each time, with the corners and replicates all there', () => {
    const plan = doePlan(doe());
    expect(plan).toHaveLength(16); expect(doePlan(doe())).toEqual(plan);
    expect(plan.map(p => p.no)).toEqual(Array.from({ length: 16 }, (_, i) => i + 1));
    for (let c = 0; c < 8; c++) expect(plan.filter(p => p.std === c).map(p => p.rep).sort()).toEqual([1, 2]);
    expect(plan.map(p => p.std)).toEqual([...plan.map(p => p.std)]); // order kept
    expect(plan.some((p, i) => p.std !== i % 8)).toBe(true); // not in standard order
  });
  it('says a run in the floor’s words, with units', () => {
    expect(doeRunWords(doe(), { levels: [-1, 1, -1] })).toBe('Gap 0.8 cm, Gas flow 200 sccm, RF power 275 W');
    expect(doeRunWords(doe(), { levels: [0, 0, 0] })).toBe('Gap 1 cm, Gas flow 162.5 sccm, RF power 300 W');
    expect(doeAgreedWords(doe({ centre: 2 }))).toBe(', Gap 0.8–1.2 cm, Gas flow 125–200 sccm, RF power 275–325 W; every corner run 2 times, 2 centre runs, in a random order shuffled from 20260401');
  });
  it('before any run: the first run said, and the order explained', () => {
    const a = agreed(doe()), f = fig(a, []), s = analysisSays(f, a);
    expect(s.verdict).toBe('Not started'); expect(s.text).toMatch(/^3 factors, 16 runs \(8 corners × 2\), in the random order below\. Make run 1 first — Gap /);
    expect(s.more[0]).toMatch(/shuffled from 20260401 and is kept/);
    expect(analysisTiles(f, a)[0].v).toBe('0 of 16');
    expect(analysisGrids(f, a).map(g => g.label)).toEqual(['The runs, in the order to make them']);
  });
});

describe('Designed experiments — the plasma etch worked through the page’s module', () => {
  const d = doe(), a = agreed(d), rs = readingsFor(d, ETCH), f = fig(a, rs), s = analysisSays(f, a);
  it('a half-made experiment says how many runs are done and what is short, and works nothing out', () => {
    const half = readingsFor(d, ETCH, 9), g = fig(a, half), t = analysisSays(g, a);
    expect(g.res).toBeUndefined(); expect(t.verdict).toBe('Runs to make'); expect(t.text).toMatch(/^9 of 16 runs done — the effects are worked out once every corner has the same number of readings\./);
  });
  it('the analysis of variance as SciPy prints it: A, C and AC real (p 0.0027, 1.2e-6, 0.00019); the others not', () => {
    expect(f.res?.mode).toBe('anova'); expect(f.res?.terms.filter(t => t.real).map(t => t.mask)).toEqual([1, 4, 5]);
    expect(f.done).toBe(16); expect(f.balanced).toBe(true); expect(f.r).toBe(2);
    expect(s.verdict).toBe('Gap and RF power matter'); expect(s.tone).toBe('n');
    expect(s.text).toMatch(/^Etch rate: Gap and RF power matter, and they interact\./);
    expect(s.text).toMatch(/RF power from 275 W to 325 W changes it by \+306\.1 Å\/min \(95% between \+251\.4 and \+360\.8 Å\/min; p < 0\.0001\)/);
    expect(s.text).toMatch(/Gap from 0\.8 cm to 1\.2 cm changes it by −101\.6 Å\/min \(95% between −156\.3 and −46\.9 Å\/min; p = 0\.0027\)/);
    expect(s.text).toMatch(/Gas flow is not shown to matter in these ranges — leave it where it is cheapest\./);
  });
  it('reads the interaction as two numbers, names the best settings with their interval, and costs nothing it was not told', () => {
    const m = s.more.join(' | ');
    expect(m).toMatch(/Gap changes Etch rate by \+52\.0 Å\/min at RF power 275 W and by −255\.3 Å\/min at 325 W — in opposite directions/);
    expect(m).toMatch(/Settings the fitted model puts best \(higher is better\): Gap low \(0\.8 cm\), Gas flow either, RF power high \(325 W\) — expected 1056\.8 Å\/min, 95% between 1002\.0 and 1111\.5 Å\/min/);
    expect(m).toMatch(/s = 47\.5 Å\/min on 8 degrees of freedom/); expect(m).toMatch(/accounts for 96% of all the variation/);
    expect(m).toMatch(/The experiment itself: 16 runs\. Give the packs a run makes and what a pack’s materials cost/);
    expect(analysisSays(fig(agreed(doe({ packsPerRun: 200, materialsPerPack: 0.12 })), readingsFor(doe({ packsPerRun: 200, materialsPerPack: 0.12 }), ETCH)), agreed(doe({ packsPerRun: 200, materialsPerPack: 0.12 }))).more.join(' ')).toMatch(/16 runs × 200 packs × £0\.12 materials = £384 of product/);
  });
  it('tiles, picture, tables and closing line come from the same figures', () => {
    expect(analysisTiles(f, a).map(t => [t.k, t.v])).toEqual([['Runs done', '16 of 16'], ['Real effects', '3 of 7'], ['Biggest', 'RF power'], ['Noise s', '47.5'], ['Explained', '96%']]);
    const pic = analysisPicture(f, a); expect(pic).toHaveLength(7); expect(pic[0].label).toBe('RF power · matters'); expect(pic[0].zero).toBe(true);
    const grids = analysisGrids(f, a); expect(grids.map(g => g.label)).toEqual(['Every effect — 95% intervals', 'The runs, in the order they were made']);
    expect(grids[0].rows[0].slice(0, 2)).toEqual(['RF power', '+306.1']); expect(grids[0].mark).toEqual([0, 1, 2]);
    expect(grids[1].rows).toHaveLength(16); expect(grids[1].rows.every(r => r[r.length - 1] !== '')).toBe(true);
    expect(analysisClosing(f, a, s).text).toBe('Gap and RF power matter — Etch rate, 95% confidence.');
  });
  it('a reading is worded with its run and settings; a struck one leaves the analysis short', () => {
    expect(doeReadingWord(a, rs[0])).toMatch(/^Run 1 · Gap .* → \d+ Å\/min$/);
    const g = fig(a, rs.map((r, i) => (i === 3 ? { ...r, struck: true } : r)));
    expect(g.balanced).toBe(false); expect(g.res).toBeUndefined(); expect(analysisSays(g, a).text).toMatch(/15 of 16 runs done .* Short: /);
  });
  it('90% and 99% change the intervals and what is real', () => {
    const lo = fig({ ...a, confidence: 0.99 }, rs), hi = fig({ ...a, confidence: 0.9 }, rs);
    expect(lo.res?.terms.filter(t => t.real).map(t => t.mask)).toEqual([1, 4, 5]); expect(hi.res?.terms.filter(t => t.real).map(t => t.mask)).toEqual([1, 4, 5]);
    expect(analysisSays(lo, { ...a, confidence: 0.99 }).text).toMatch(/99% between/);
  });
});

describe('Designed experiments — one run a corner uses Lenth’s margin, and centre runs look for a bend', () => {
  const d = doe({ factors: [{ name: 'Temperature', unit: '°C', low: 170, high: 190 }, { name: 'Dwell', unit: 's', low: 0.8, high: 1.2 }, { name: 'Pressure', unit: 'bar', low: 3, high: 5 }], replicates: 1 });
  const BAG = [10.2, 13.1, 11.0, 15.8, 10.6, 13.4, 11.5, 16.4].map(v => [v]);
  const a = agreed(d, { name: 'Seal strength', unit: 'N', better: 'higher' }), f = fig(a, readingsFor(d, BAG)), s = analysisSays(f, a);
  it('Temperature, Dwell and their interaction are real by the margin ±0.565 N; Pressure is not', () => {
    expect(f.res?.mode).toBe('lenth'); expect(s.verdict).toBe('Temperature and Dwell matter');
    expect(s.text).toMatch(/Temperature from 170 °C to 190 °C changes it by \+3\.85 N \(beyond Lenth’s margin ±0\.565 N, and beyond the simultaneous ±1\.351 N\)/);
    expect(s.text).toMatch(/Pressure is not shown to matter in these ranges/);
    expect(s.more.join(' ')).toMatch(/pseudo standard error is 0\.150 N, the margin of error ±0\.565 N at 95%/);
    expect(s.more.join(' ')).toMatch(/Temperature changes Seal strength by \+2\.85 N at Dwell 0\.8 s and by \+4\.85 N at 1\.2 s — and more at the higher setting — they reinforce each other/);
    expect(s.more.join(' ')).toMatch(/Temperature high \(190 °C\), Dwell high \(1\.2 s\), Pressure either — expected 16\.10 N \(no error estimate to put an interval on\)/);
    expect(f.checks.map(c => c.what)).toEqual(['Error', 'Curvature']);
    expect(analysisTiles(f, a)[3]).toMatchObject({ k: 'PSE', v: '0.150' });
  });
  it('no view on which way is better picks no best setting', () => {
    expect(analysisSays(fig({ ...a, better: 'either' }, readingsFor(d, BAG)), { ...a, better: 'either' }).more.join(' ')).toMatch(/No view on which way is better/);
  });
  it('centre runs: a bend is said when the centre differs from the corners by more than their own spread', () => {
    const dc = { ...d, replicates: 1, centre: 3 }, rsC = readingsFor(dc, BAG).map(r => (r.xs?.every(x => x === 0) ? { ...r, value: 18 + (Number(r.arm) % 3) * 0.1 } : r));
    const fc = fig(agreed(dc, { name: 'Seal strength', unit: 'N' }), rsC);
    expect(fc.res?.curvature?.p).toBeLessThan(0.05); expect(fc.checks.find(c => c.what === 'Curvature')?.say).toMatch(/the result bends between the two levels/);
    expect(analysisSays(fc, agreed(dc, { name: 'Seal strength', unit: 'N' })).tone).toBe('a');
  });
});

describe('Designed experiments — agreeing', () => {
  const ok = agreed(doe());
  it('refuses until it is set up, in words', () => {
    expect(analysisProblem({ ...ok, name: '' })).toMatch(/What is measured/);
    expect(analysisProblem({ ...ok, doe: doe({ factors: [{ name: 'A', low: 1, high: 2 }] }) })).toMatch(/2 to 5/);
    expect(analysisProblem({ ...ok, doe: doe({ factors: [{ name: 'A', low: 1, high: 2 }, { name: 'a', low: 1, high: 2 }] }) })).toMatch(/same name/);
    expect(analysisProblem({ ...ok, doe: doe({ factors: [{ name: 'A', low: 5, high: 2 }, { name: 'B', low: 1, high: 2 }] }) })).toMatch(/A: the high setting has to be above the low one/);
    expect(analysisProblem({ ...ok, doe: doe({ factors: [{ name: 'A', low: NaN, high: 2 }, { name: 'B', low: 1, high: 2 }] }) })).toMatch(/low and a high setting/);
    expect(analysisProblem({ ...ok, doe: doe({ replicates: 5 }) })).toMatch(/1 to 4/);
    expect(analysisProblem({ ...ok, doe: doe({ centre: 9 }) })).toMatch(/0 to 6/);
    expect(analysisProblem(ok)).toBe('');
  });
});
