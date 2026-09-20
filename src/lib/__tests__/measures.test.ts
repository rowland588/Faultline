/* THE MODEL THAT TOOK THE APP OFF ONE BUSINESS'S SPREADSHEET.
 *
 * Four things are worth pinning down here, because getting any of them wrong is
 * silent and looks like the app working:
 *
 *   WHICH WAY IS GOOD. Waste at 2.4 against 2.0 is a miss; ppm at 61 against 60
 *   is a hit. The old code assumed up was good, so every improvement in a
 *   falling measure would have been reported as a loss — and a proof would have
 *   called it a win the other way round.
 *
 *   NO TARGET IS NOT A MISS. "Nobody set a target" and "the line missed it" are
 *   different facts and only one of them is somebody's fault, so the answer is
 *   `undefined` and never `false`.
 *
 *   WHICH PERIOD IS IN PLAY. The target a line is judged against is the one for
 *   TODAY, not for whenever the last reading happened to be taken.
 *
 *   WHAT A PASTE CANNOT PLACE. An import that quietly drops half the rows is
 *   worse than one that refuses, so every unusable row comes back with a reason
 *   and every blank cell is skipped in silence.
 */
import { describe, it, expect } from 'vitest';
import {
  asISODate, bySort, guessMap, headline, lineSeries, matchLine, meets, parsePaste,
  periodOf, quarters, readPaste, say, seriesFor, standingFor, targetsAcross, todayISO, vsTarget,
  type Measure, type Period, type Reading, type Target,
} from '../measures';
import { numberProof, makeWinProof, proofFromWin, proofSentence, verdictLabel } from '../measureProof';

const ppm: Measure = { id: 'm-ppm', name: 'Packs per minute', unit: 'ppm', direction: 'up', sort: 10 };
const waste: Measure = { id: 'm-waste', name: 'Waste', unit: '%', direction: 'down', sort: 20 };

const q1: Period = { id: 'q1', name: 'Q1', from: '2026-08-01', to: '2026-10-31', sort: 10 };
const q2: Period = { id: 'q2', name: 'Q2', from: '2026-11-01', to: '2027-01-31', sort: 20 };

const LINE = 'line-2a';
const target = (measureId: string, periodId: string, value: number, lineId = LINE): Target =>
  ({ id: `t-${measureId}-${periodId}-${lineId}`, projectId: 'p', lineId, measureId, periodId, value, updatedAt: 0 });
const reading = (measureId: string, at: string, value: number, lineId = LINE): Reading =>
  ({ id: `r-${measureId}-${at}-${lineId}`, projectId: 'p', lineId, measureId, at, value, createdAt: 0, updatedAt: 0 });

describe('which way is good', () => {
  it('judges a rising measure up and a falling measure down', () => {
    expect(meets(61, 60, 'up')).toBe(true);
    expect(meets(59, 60, 'up')).toBe(false);
    expect(meets(1.8, 2, 'down')).toBe(true);
    expect(meets(2.4, 2, 'down')).toBe(false);
  });

  it('counts hitting the target exactly as meeting it, either way', () => {
    expect(meets(60, 60, 'up')).toBe(true);
    expect(meets(2, 2, 'down')).toBe(true);
  });

  it('says undefined — never false — when nothing was set to judge against', () => {
    expect(meets(61, undefined, 'up')).toBeUndefined();
    expect(meets(0, undefined, 'down')).toBeUndefined();
  });
});

describe('periods', () => {
  it('places a date in the period whose dates contain it', () => {
    expect(periodOf([q1, q2], '2026-09-15')?.name).toBe('Q1');
    expect(periodOf([q1, q2], '2026-12-01')?.name).toBe('Q2');
  });

  it('places a date in none rather than in the nearest', () => {
    expect(periodOf([q1, q2], '2026-07-31')).toBeUndefined();
    expect(periodOf([q1, q2], '2027-03-01')).toBeUndefined();
  });

  it('offers four quarters from a start date, and imposes nothing', () => {
    let n = 0;
    const qs = quarters('2026-08-01', () => `p${++n}`);
    expect(qs.map(q => q.name)).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
    expect(qs[0].from).toBe('2026-08-01');
    expect(qs[0].to).toBe('2026-10-31');
    expect(qs[3].to).toBe('2027-07-31');
    // and the quarters butt up against each other with no day in neither
    expect(periodOf(qs, '2026-10-31')?.name).toBe('Q1');
    expect(periodOf(qs, '2026-11-01')?.name).toBe('Q2');
  });

  it('gives back nothing for a date it cannot read, rather than an Invalid Date', () => {
    expect(quarters('not a date', () => 'x')).toEqual([]);
  });
});

describe('where a line stands', () => {
  const targets = [target(ppm.id, q1.id, 60), target(ppm.id, q2.id, 65), target(waste.id, q1.id, 2)];
  const readings = [
    reading(ppm.id, '2026-09-01', 55),
    reading(ppm.id, '2026-09-08', 61),
    reading(waste.id, '2026-09-08', 2.4),
  ];

  it('leads on the first measure the business listed', () => {
    expect(headline([waste, ppm])?.name).toBe('Packs per minute');
    expect(bySort([waste, ppm]).map(m => m.name)).toEqual(['Packs per minute', 'Waste']);
  });

  it('reads the margin as positive on the good side, whichever way that is', () => {
    const up = lineSeries([ppm], [q1, q2], targets, readings, LINE, ppm.id, '2026-09-10');
    expect(up?.latest).toBe(61);
    expect(up?.target).toBe(60);
    expect(up?.margin).toBe(1);
    expect(up?.meeting).toBe(true);

    const down = lineSeries([waste], [q1, q2], targets, readings, LINE, waste.id, '2026-09-10');
    expect(down?.latest).toBe(2.4);
    // 2.4 against a target of 2 is 0.4 the WRONG way
    expect(down?.margin).toBe(-0.4);
    expect(down?.meeting).toBe(false);
  });

  it('judges against the period TODAY falls in, not the one the reading was in', () => {
    // The last reading is in Q1; we are in Q2, so Q2's target is what is being
    // worked to — and 61 against 65 is behind, though it beat Q1's 60.
    const s = lineSeries([ppm], [q1, q2], targets, readings, LINE, ppm.id, '2026-12-01');
    expect(s?.period?.name).toBe('Q2');
    expect(s?.target).toBe(65);
    expect(s?.meeting).toBe(false);
  });

  it('falls back to the reading’s own period when today is in none', () => {
    const s = lineSeries([ppm], [q1, q2], targets, readings, LINE, ppm.id, '2028-01-01');
    expect(s?.period?.name).toBe('Q1');
    expect(s?.target).toBe(60);
  });

  it('carries every period’s target, in order', () => {
    expect(targetsAcross([q1, q2], targets, LINE, ppm.id))
      .toEqual([{ period: q1, value: 60 }, { period: q2, value: 65 }]);
    // a period with no target set comes back as one, not as a zero
    expect(targetsAcross([q1, q2], targets, LINE, waste.id).map(t => t.value)).toEqual([2, undefined]);
  });

  it('says nothing at all when the project has named no measures', () => {
    expect(lineSeries([], [q1], targets, readings, LINE)).toBeUndefined();
  });

  it('draws the readings oldest first, so a chart cannot go backwards', () => {
    const jumbled = [reading(ppm.id, '2026-09-08', 61), reading(ppm.id, '2026-09-01', 55)];
    expect(seriesFor(jumbled, LINE, ppm.id).map(r => r.at)).toEqual(['2026-09-01', '2026-09-08']);
  });

  it('puts the later of two readings on the same day last', () => {
    const morning = { ...reading(ppm.id, '2026-09-08', 55), id: 'am', createdAt: 100 };
    const correction = { ...reading(ppm.id, '2026-09-08', 61), id: 'pm', createdAt: 200 };
    // whichever order the database hands them back
    expect(seriesFor([correction, morning], LINE, ppm.id).map(r => r.value)).toEqual([55, 61]);
    expect(seriesFor([morning, correction], LINE, ppm.id).map(r => r.value)).toEqual([55, 61]);
  });

  it('keeps one line’s readings out of another’s', () => {
    const both = [...readings, reading(ppm.id, '2026-09-08', 99, 'line-7')];
    expect(seriesFor(both, LINE, ppm.id)).toHaveLength(2);
    expect(seriesFor(both, 'line-7', ppm.id)).toHaveLength(1);
  });

  it('stands a line on every measure at once, counting its readings', () => {
    const rows = standingFor([ppm, waste], [q1], targets, readings, LINE);
    expect(rows.map(r => [r.measure.name, r.readings, r.meeting]))
      .toEqual([['Packs per minute', 2, true], ['Waste', 1, false]]);
  });
});

describe('the one sentence about a target', () => {
  it('says the distance, the period and the unit', () => {
    expect(vsTarget({ measure: ppm, target: 60, period: q1, margin: 1 })).toBe('+1 vs Q1 target 60 ppm');
    expect(vsTarget({ measure: waste, target: 2, period: q1, margin: -0.4 })).toBe('-0.4 vs Q1 target 2 %');
    // no period named — still a target, still says so
    expect(vsTarget({ measure: ppm, target: 60, margin: 1 })).toBe('+1 vs target 60 ppm');
  });

  it('distinguishes nothing measured from no target at all', () => {
    expect(vsTarget({ measure: ppm, target: 60, period: q1 })).toBe('Q1 target 60 ppm · nothing measured yet');
    expect(vsTarget({ measure: ppm })).toBe('no target set');
  });

  it('prints a number at its own precision, with its unit', () => {
    expect(say(61)).toBe('61');
    expect(say(2.45, '%')).toBe('2.45 %');
    expect(say(2.4567)).toBe('2.46');
  });

  it('reads today as the reader’s own day, not a UTC midnight', () => {
    // 22:30 on the 15th in a zone ahead of UTC is still the 15th, and
    // toISOString() would have called it the 16th.
    expect(todayISO(new Date(2026, 8, 15, 22, 30))).toBe('2026-09-15');
  });
});

describe('dates off a spreadsheet', () => {
  it('reads the three a British sheet actually produces', () => {
    expect(asISODate('2026-09-15')).toBe('2026-09-15');
    expect(asISODate('15/09/2026')).toBe('2026-09-15');
    expect(asISODate('3 Aug 2026')).toBe('2026-08-03');
    expect(asISODate('w/c 3 Aug 2026')).toBe('2026-08-03');
  });

  it('takes the current year for a heading with no year on it', () => {
    expect(asISODate('3 Aug', new Date(2026, 0, 1))).toBe('2026-08-03');
  });

  it('says nothing rather than guessing at anything else', () => {
    expect(asISODate('week 6')).toBeUndefined();
    expect(asISODate('')).toBeUndefined();
    expect(asISODate('sometime in August')).toBeUndefined();
  });
});

describe('pasting a block in', () => {
  const lines = [
    { id: LINE, key: '2A', name: 'Line 2A' },
    { id: 'line-7', key: '7', name: 'Line 7' },
  ];

  it('splits on tabs first, so a comma inside a cell survives', () => {
    const p = parsePaste('Line\tNote\nLine 2A\tnight shift, second half');
    expect(p.headings).toEqual(['Line', 'Note']);
    expect(p.rows[0].cells).toEqual(['Line 2A', 'night shift, second half']);
  });

  it('reads a column per measure', () => {
    const p = parsePaste('Line\tDate\tPacks per minute\tWaste\nLine 2A\t15/09/2026\t61\t2.4');
    const rows = readPaste(p, guessMap(p.headings, [ppm, waste]));
    expect(rows.filter(r => !r.problem).map(r => [r.measureId, r.at, r.value])).toEqual([
      [ppm.id, '2026-09-15', 61],
      [waste.id, '2026-09-15', 2.4],
    ]);
  });

  it('reads a column per date, for whichever measure the sheet is for', () => {
    const p = parsePaste('Line\t3 Aug 2026\t10 Aug 2026\nLine 2A\t42\t44');
    const map = guessMap(p.headings, [ppm, waste]);
    // the date headings are recognised as dates, and the sheet's measure
    // defaults to the one the project leads on
    expect(map.roles.map(r => r.kind)).toEqual(['line', 'on', 'on']);
    expect(map.measureId).toBe(ppm.id);
    const rows = readPaste(p, map);
    expect(rows.map(r => [r.at, r.value, r.problem])).toEqual([
      ['2026-08-03', 42, undefined],
      ['2026-08-10', 44, undefined],
    ]);
  });

  it('skips a blank cell in silence — a blank week is a week nobody measured', () => {
    const p = parsePaste('Line\t3 Aug 2026\t10 Aug 2026\nLine 2A\t42\t');
    const rows = readPaste(p, guessMap(p.headings, [ppm]));
    expect(rows).toHaveLength(1);
    expect(rows[0].problem).toBeUndefined();
  });

  it('reports what it cannot read instead of importing less than was pasted', () => {
    const p = parsePaste('Line\tDate\tPacks per minute\nLine 2A\tsometime\t61\nLine 2A\t15/09/2026\tn/a');
    const rows = readPaste(p, guessMap(p.headings, [ppm]));
    expect(rows).toHaveLength(2);
    expect(rows[0].problem).toMatch(/could not be read as a date/);
    expect(rows[1].problem).toMatch(/not a number/);
  });

  it('says so when no column holds the date at all', () => {
    const p = parsePaste('Line\tPacks per minute\nLine 2A\t61');
    const rows = readPaste(p, guessMap(p.headings, [ppm]));
    expect(rows[0].problem).toBe('No column is marked as the date');
  });

  it('matches a pasted name onto a line, and refuses to guess when it cannot', () => {
    expect(matchLine(lines, '2A')?.id).toBe(LINE);
    expect(matchLine(lines, 'line 2a')?.id).toBe(LINE);
    expect(matchLine(lines, 'Line 7')?.id).toBe('line-7');
    expect(matchLine(lines, 'Cellox')).toBeUndefined();
    expect(matchLine(lines, '')).toBeUndefined();
  });
});

describe('proving a win from the readings', () => {
  const rising = [40, 41, 42, 47, 48, 49];
  const falling = [3.0, 2.9, 3.1, 2.1, 2.0, 2.2];

  it('calls a rise on an up measure a win', () => {
    const p = numberProof(rising, 3, 'up');
    expect(p?.delta).toBeCloseTo(7, 5);
    expect(p?.changePct).toBeGreaterThan(0);
    expect(p?.verdict).toBe('proven');
  });

  it('calls a FALL on a down measure a win too — the bug this exists to stop', () => {
    const p = numberProof(falling, 3, 'down');
    expect(p?.delta).toBeCloseTo(0.9, 5);      // positive: better
    expect(p?.changePct).toBeGreaterThan(0);
    expect(p?.verdict).toBe('proven');
  });

  it('calls a rise on a down measure worse', () => {
    const p = numberProof([...falling].reverse(), 3, 'down');
    expect(p!.delta).toBeLessThan(0);
    expect(p?.verdict).toBe('worse');
  });

  it('refuses to say anything on too few readings either side', () => {
    expect(numberProof([40, 49, 50], 1, 'up')).toBeNull();
    expect(numberProof([40, 41, 49], 2, 'up')).toBeNull();
  });

  it('calls a wobble flat rather than a win', () => {
    expect(numberProof([50, 50.2, 50.1, 50.3], 2, 'up')?.verdict).toBe('flat');
  });

  it('freezes the claim, and reads it back without recomputing it', () => {
    const live = numberProof(rising, 3, 'up')!;
    const win = makeWinProof(live, {
      lineKey: '2A', lineName: 'Line 2A', measureName: ppm.name, unit: 'ppm',
      direction: 'up', fromAt: '2026-09-08',
    }, 1_700_000_000_000);
    const back = proofFromWin(win);
    expect(back.frozen).toBe(true);
    expect(back.verdict).toBe(live.verdict);
    expect(back.beforeMean).toBe(live.beforeMean);
    expect(proofSentence(back, win.unit)).toContain('ppm');
    expect(proofSentence(back, win.unit)).toContain('3 before · 3 after');
  });

  it('has a badge that can say no', () => {
    expect(verdictLabel('proven')).toBe('Proven');
    expect(verdictLabel('better')).toBe('Not yet proven');
    expect(verdictLabel('worse')).toBe('Worse');
  });
});
