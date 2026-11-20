/* STANDARD DATA POOLED AND FITTED (FC-024; knowledge/specs/FC-024-standard-data.md §6, §11). Every number is SciPy's or
 * plain arithmetic from scripts/knowledge/cases-time.py §7b, never this code's own output. */
import { describe, it, expect } from 'vitest';
import { fitPoints, fitAt, timeFrom, type TimedPoint } from '../timeFormula';
import { element, balance, elementSays } from '../balance';
import { libraryFrom, elementGroups, groupSays, atSays, reuseOfGroup, reuseSays, checkSays, restsOn, nameKey, matchGroups, reusedSays } from '../standardData';
import type { BalanceStep, ToolStudy } from '../../../lib/study';

const pts = (xy: [number | undefined, number][]): TimedPoint[] => xy.map(([count, basic], i) => ({ product: `P${i}`, ...(count != null ? { count } : {}), basic, cycles: 6, at: i, studyId: `s${i}`, stepId: `x${i}` }));
const laps = (xs: number[]) => xs.map((sec, i) => ({ id: `l${i}`, sec, at: i }));
const st = (id: string, name: string, who: string, o: Partial<BalanceStep> = {}, order = 0): BalanceStep => ({ id, order, name, who, ...o });

describe('a time formula (F1–F4: SciPy linregress, t.ppf)', () => {
  it('F1 the record’s formula 1.2 + 0.7n through (6, 5.4), (12, 9.6), (24, 18.0): 9.6 s at 12, 13.8 s at 18, no spread', () => {
    const f = fitPoints(pts([[6, 5.4], [12, 9.6], [24, 18.0]]));
    expect(f?.kind).toBe('formula');
    if (f?.kind !== 'formula') return;
    expect(f.a).toBeCloseTo(1.2, 9); expect(f.b).toBeCloseTo(0.7, 9); expect(f.se).toBeCloseTo(0, 9); expect(f.r2).toBeCloseTo(1, 9);
    expect(fitAt(f, 12)?.basic).toBeCloseTo(9.6, 9);
    expect(fitAt(f, 18)?.basic).toBeCloseTo(13.8, 9);
    expect(fitAt(f, 18)?.margin).toBeCloseTo(0, 9);
  });
  it('F2 three timings: a 1.150000, b 0.703571, R² 0.999305, s 0.240535; at 18 13.814286 ± 2.000810 (t(1) 12.7062) — short; at 30 beyond', () => {
    const f = fitPoints(pts([[6, 5.5], [12, 9.4], [24, 18.1]]));
    if (f?.kind !== 'formula') throw new Error('no formula');
    expect(f.a).toBeCloseTo(1.15, 6); expect(f.b).toBeCloseTo(0.703571, 6); expect(f.r2).toBeCloseTo(0.999305, 6); expect(f.se).toBeCloseTo(0.240535, 6);
    expect([f.xMean, f.sxx, f.lo, f.hi]).toEqual([14, 168, 6, 24]);
    const at18 = fitAt(f, 18)!;
    expect(at18.basic).toBeCloseTo(13.814286, 6); expect(at18.half).toBeCloseTo(2.00081, 4); expect(at18.margin).toBeCloseTo(0.144836, 5);
    expect([at18.inside, at18.enough]).toEqual([true, false]);
    const at30 = fitAt(f, 30)!;
    expect(at30.basic).toBeCloseTo(22.257143, 6); expect(at30.half).toBeCloseTo(4.165019, 4); expect([at30.inside, at30.enough]).toEqual([false, false]);
  });
  it('F3 two timings: a line through two (a 1.6, b 0.65, 13.3 at 18) with no measure of how sure', () => {
    const f = fitPoints(pts([[6, 5.5], [12, 9.4]]));
    if (f?.kind !== 'formula') throw new Error('no formula');
    expect(f.a).toBeCloseTo(1.6, 9); expect(f.b).toBeCloseTo(0.65, 9); expect(f.se).toBeUndefined(); expect(f.r2).toBeUndefined();
    const d = fitAt(f, 18)!;
    expect(d.basic).toBeCloseTo(13.3, 9); expect(d.margin).toBeUndefined(); expect(d.enough).toBe(false);
  });
  it('F4 four timings: a 1.15, b 0.708333, R² 0.998728, s 0.239792; at 18 ±4.07% enough, at 15 11.775 ± 0.515870 enough, at 9 ±9.20% short, at 30 beyond', () => {
    const f = fitPoints(pts([[6, 5.5], [12, 9.4], [18, 14.1], [24, 18.1]]));
    if (f?.kind !== 'formula') throw new Error('no formula');
    expect(f.a).toBeCloseTo(1.15, 6); expect(f.b).toBeCloseTo(0.708333, 6); expect(f.r2).toBeCloseTo(0.998728, 6); expect(f.se).toBeCloseTo(0.239792, 6);
    const a18 = fitAt(f, 18)!, a15 = fitAt(f, 15)!, a9 = fitAt(f, 9)!, a30 = fitAt(f, 30)!;
    expect(a18.basic).toBeCloseTo(13.9, 6); expect(a18.half).toBeCloseTo(0.565107, 5); expect(a18.enough).toBe(true);
    expect(a15.basic).toBeCloseTo(11.775, 6); expect(a15.half).toBeCloseTo(0.51587, 5); expect(a15.margin).toBeCloseTo(0.043811, 5); expect(a15.enough).toBe(true);
    expect(a9.basic).toBeCloseTo(7.525, 6); expect(a9.half).toBeCloseTo(0.692112, 5); expect(a9.enough).toBe(false);
    expect(a30.basic).toBeCloseTo(22.4, 6); expect(a30.half).toBeCloseTo(1.263618, 5); expect([a30.inside, a30.enough]).toEqual([false, false]);
  });
  it('a formula asked with no count gives nothing; a timing with no count is left out of the line and counted', () => {
    const f = fitPoints(pts([[6, 5.5], [12, 9.4], [undefined, 7], [24, 18.1]]));
    if (f?.kind !== 'formula') throw new Error('no formula');
    expect(f.k).toBe(3); expect(f.left).toBe(1); expect(f.a).toBeCloseTo(1.15, 6);
    expect(fitAt(f)).toBeUndefined();
  });
});

describe('pooled (P1–P2)', () => {
  it('P1 4.1, 4.2, 4.15: 4.15 s, sd 0.05, ±2.99% at 95% (t(2) 4.3027) — enough', () => {
    const f = fitPoints(pts([[undefined, 4.1], [undefined, 4.2], [undefined, 4.15]]));
    if (f?.kind !== 'pooled') throw new Error('not pooled');
    expect(f.mean).toBeCloseTo(4.15, 9); expect(f.sd).toBeCloseTo(0.05, 9);
    const d = fitAt(f)!;
    expect(d.half).toBeCloseTo(0.124207, 5); expect(d.margin).toBeCloseTo(0.029929, 5); expect(d.enough).toBe(true);
  });
  it('P2 4.0, 4.6: 4.3 s, ±88.65% (t(1) 12.7062) — two studies are short of enough', () => {
    const d = fitAt(fitPoints(pts([[undefined, 4.0], [undefined, 4.6]]))!)!;
    expect(d.basic).toBeCloseTo(4.3, 9); expect(d.margin).toBeCloseTo(0.886479, 5); expect(d.enough).toBe(false);
  });
  it('all timed at one count is a mean at that count, not a formula; one timing is nothing', () => {
    const f = fitPoints(pts([[12, 9.4], [12, 9.6], [12, 9.5]]));
    expect(f?.kind).toBe('pooled'); expect(f?.kind === 'pooled' && f.at).toBe(12);
    expect(fitPoints(pts([[12, 9.4]]))).toBeUndefined();
    expect(fitPoints(pts([[6, 0], [12, -1]]))).toBeUndefined();
  });
});

/* the library across products, as the line's balances hold it */
const study = (id: string, standardId: string, name: string, steps: BalanceStep[], startedAt = 1): ToolStudy =>
  ({ id, tool: 'balance', name, standardId, workspaceId: 'ws', agreed: { balance: { taktSec: 40, allowance: 0.1 } }, facts: { steps }, uses: [], startedAt, createdAt: 1, updatedAt: 1 } as unknown as ToolStudy);
const tray = (n: number, place: number, erect?: number, at = n) => study(`t${n}`, `sd${n}`, `Tray ${n}`, [
  st(`p${n}`, n === 6 ? 'Place 6 packs' : 'Place the packs', 'Op 1', { rating: 100, laps: laps([place, place, place, place, place]), count: n, countOf: 'packs' }, 0),
  ...(erect != null ? [st(`e${n}`, 'Erect the case', 'Op 2', { rating: 100, laps: laps([erect, erect, erect, erect, erect]) }, 1)] : []),
], at * 1000);
const line = [tray(6, 5.5, 4.1), tray(12, 9.4, 4.2), tray(18, 14.1, 4.15), tray(24, 18.1)];
const here = { studyId: 'me', standardId: 'sd-new', workspaceId: 'ws' };

describe('the line’s groups (chosen 1–3)', () => {
  it('the same step is the same words, numbers and “the” aside', () => {
    expect(nameKey('Place 12 packs')).toBe(nameKey('Place the packs'));
    expect(nameKey('Erect the case')).not.toBe(nameKey('Place the packs'));
  });
  it('four trays make one formula over 4 products and three cases one mean; each with its sentence', () => {
    const groups = elementGroups(libraryFrom(line, here));
    expect(groups.map(g => [g.name, g.fit?.kind, g.points.length])).toEqual([['Erect the case', 'pooled', 3], ['Place the packs', 'formula', 4]]);
    const place = groups[1];
    expect(place.of).toBe('packs');
    expect(groupSays(place).text).toBe('Place the packs — 4 products’ timings at 6 to 24 packs: basic = 1.15 + 0.71 × packs, R² 99.9%.');
    expect(groupSays(groups[0]).text).toBe('Erect the case — the mean of 3 products’ timings: 4.2 s basic, spread 0.05 s, ±3.0% at 95%.');
    expect(atSays(place, 15).text).toBe('At 15 packs: 11.8 s basic, ±4.4% at 95%.');
    expect(atSays(place, 30)).toMatchObject({ text: 'At 30 packs: 22.4 s basic — beyond the 6 to 24 packs timed, a guess; time it.', tone: 'a', usable: true });
    expect(atSays(place)).toMatchObject({ usable: false, text: 'Type the count to work it out at.' });
    expect(matchGroups(groups, 'place pack').map(g => g.name)).toEqual(['Place the packs']);
  });
  it('a typed, borrowed or worked-out time never feeds a group; counts in two words are not put on one line', () => {
    const borrowed = study('b', 'sdb', 'Tray 9', [st('q', 'Place the packs', 'Op 1', { count: 9, countOf: 'packs', reuse: { basicSec: 7, n: 5, enough: true, product: 'Tray 6', studyId: 't6', stepId: 'p6', at: 1 } })], 99_000);
    const typed = study('c', 'sdc', 'Tray 10', [st('r', 'Place the packs', 'Op 1', { count: 10, countOf: 'packs', typedSec: 8 })], 98_000);
    const groups = elementGroups(libraryFrom([...line, borrowed, typed], here));
    expect(groups.find(g => g.name === 'Place the packs')?.points.length).toBe(4);
    const trays = study('d', 'sdd', 'Case of 2', [st('s', 'Place the packs', 'Op 1', { rating: 100, laps: laps([3, 3, 3, 3, 3]), count: 2, countOf: 'trays' })], 97_000);
    const g = elementGroups(libraryFrom([...line, trays], here)).find(x => x.name === 'Place the packs')!;
    expect(g.fit).toBeUndefined();
    expect(groupSays(g).text).toBe('Place the packs — counted in packs on one product and trays on another — not put on one line.');
  });
});

describe('borrowed here, pooled or fitted (§6.3)', () => {
  const groups = elementGroups(libraryFrom(line, here));
  const place = groups.find(g => g.name === 'Place the packs')!, erect = groups.find(g => g.name === 'Erect the case')!;
  it('at 15 packs: 11.775 s basic, this balance’s 12% → 13.188 s standard, enough; said as the formula', () => {
    const r = reuseOfGroup(place, 15)!;
    expect(r.from?.points.length).toBe(4); expect(r.from?.at).toBe(15); expect(r.basicSec).toBeCloseTo(11.775, 6);
    const e = element(st('n', 'Place the packs', 'Op 1', { count: 15, countOf: 'packs', reuse: r }), 0.12);
    expect([e.source, e.enough]).toEqual(['library', true]);
    expect(e.basic).toBeCloseTo(11.775, 6); expect(e.standard).toBeCloseTo(13.188, 6);
    expect(reuseSays(r, 15)).toBe('worked out from the line’s time formula over 4 products’ timings — 1.15 + 0.71 × 15 packs = 11.8 s basic, ±4.4% at 95%; not timed here');
    expect(elementSays(e, 0.12).text).toBe(`13.2 s standard — ${reuseSays(r, 15)}.`);
  });
  it('the count changed to 30: worked out again (22.4 s) and said to be a guess, in amber', () => {
    const r = reuseOfGroup(place, 15)!;
    const e30 = element(st('n', 'Place the packs', 'Op 1', { count: 30, countOf: 'packs', reuse: r }), 0);
    expect(e30.basic).toBeCloseTo(22.4, 6); expect(e30.enough).toBe(false);
    expect(reuseSays(r, 30)).toBe('worked out from the line’s time formula over 4 products’ timings — 1.15 + 0.71 × 30 packs = 22.4 s basic — 30 packs is beyond the 6 to 24 packs timed, a guess; not timed here');
    expect(elementSays(e30).tone).toBe('a');
  });
  it('a formula that gives nought or less at a count is not used there', () => {
    const neg = { key: 'k', name: 'Falls', kind: 'work', points: pts([[10, 2], [20, 1], [30, 0.5]]) };
    const g = { ...neg, fit: fitPoints(neg.points) };
    expect(atSays(g, 60)).toMatchObject({ usable: false, text: 'The formula gives no time at 60.' });
    expect(reuseOfGroup(g, 60)).toBeUndefined();
  });
  it('the mean of three: 4.15 s, said so; a reload of the step reads the same from the timings copied', () => {
    const r = reuseOfGroup(erect)!;
    const e = element(st('m', 'Erect the case', 'Op 2', { reuse: r }), 0.1);
    expect(e.basic).toBeCloseTo(4.15, 9); expect(e.enough).toBe(true);
    expect(reuseSays(r)).toBe('the mean of 3 products’ timings — 4.2 s basic, ±3.0% at 95%; not timed here');
    expect(restsOn(r)).toMatch(/^Rests on: Tray 6 4\.1 s \(1 Jan\), Tray 12 4\.2 s \(1 Jan\), Tray 18 4\.2 s \(1 Jan\)\.$/);
    const f = balance([st('m', 'Erect the case', 'Op 2', { reuse: r }, 0), st('o', 'Tape', 'Op 2', { typedSec: 4 }, 1)], { taktSec: 20 });
    expect(reusedSays(f)?.text).toMatch(/^1 of 2 steps are reused/);
  });
  it('a pooled or fitted step is never offered back as a library row', () => {
    const r = reuseOfGroup(erect)!;
    const mine = study('n1', 'sd-n1', 'Tray 15', [st('m', 'Erect the case', 'Op 2', { reuse: r })], 50_000);
    expect(libraryFrom([...line, mine], here).filter(x => x.product === 'Tray 15')).toEqual([]);
  });
});

describe('validation (V: borrowed 4.15, timed here 4.7 → 13.25% more)', () => {
  it('a borrowed step timed here says how far apart the two are — over 10% in amber; within it plainly', () => {
    const r = reuseOfGroup(elementGroups(libraryFrom(line, here)).find(g => g.name === 'Erect the case')!)!;
    const e = element(st('m', 'Erect the case', 'Op 2', { rating: 100, laps: laps([4.6, 4.8, 4.7, 4.7, 4.7]), reuse: r }));
    expect(e.source).toBe('timed');
    expect(e.checked?.borrowed).toBeCloseTo(4.15, 9); expect(e.checked?.gap).toBeCloseTo(0.13253, 5);
    expect(checkSays(e)).toEqual({ tone: 'a', text: 'Timed here at 4.7 s basic; borrowed, it was 4.2 s (the mean of 3 products’ timings) — 13% more. More than 10% apart: the borrowed time wants looking at (the knowledge record’s rule of thumb, not a standard).' });
    const near = element(st('m', 'Erect the case', 'Op 2', { rating: 100, laps: laps([4.3, 4.3, 4.3, 4.3, 4.3]), reuse: r }));
    expect(checkSays(near)?.tone).toBe('n'); expect(checkSays(near)?.text).toMatch(/— 4% more\.$/);
    const one = element(st('m', 'Seal', 'Op 2', { rating: 110, laps: laps([5, 5, 5, 5, 5]), reuse: { basicSec: 5, n: 5, enough: true, product: 'Maris Piper 1kg', studyId: 'x', stepId: 'y', at: 1 } }));
    expect(checkSays(one)?.text).toBe('Timed here at 5.5 s basic; borrowed, it was 5.0 s (Maris Piper 1kg) — 10% more.');
    expect(checkSays(element(st('z', 'Seal', 'Op 2', { laps: laps([5, 5, 5, 5, 5]) })))).toBeUndefined();
  });
  it('timeFrom reads the step’s own count before the count it was borrowed at', () => {
    const r = reuseOfGroup(elementGroups(libraryFrom(line, here)).find(g => g.name === 'Place the packs')!, 15)!;
    expect(timeFrom(r.from!, undefined)?.basic).toBeCloseTo(11.775, 6);
    expect(timeFrom(r.from!, 18)?.basic).toBeCloseTo(13.9, 6);
  });
});
