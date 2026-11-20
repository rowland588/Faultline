/* EVERY FIGURE CHECKED (docs/LUNA-NEXT.md L1): figures in an answer found in Faultline's working to the rounding written; a figure found
 * nowhere marked; the things that are not figures left alone. */
import { describe, it, expect } from 'vitest';
import { checkFigures, figuresSaid, markFigures, numbersIn } from '../figureCheck';

const result = { resultId: 'R1', result: { measures: ['sum of minutes'], groups: [{ key: ['Sealer'], values: [264] }, { key: ['Filler'], values: [96.75] }, { key: ['Bagger'], values: [68.25] }], totals: [429] } };

describe('checkFigures', () => {
  it('finds a result\'s figures, its shares and its rounding; marks what nothing holds', () => {
    const text = 'Sealer lost 264 kg of the 429 — 61.5% of it. The Filler lost about 97 kg. That is 3 stations, 12 stops, in 2026 on 10/11 at 13:42; the Bagger is 15.9% and the wrapper lost 1,250 kg.';
    const c = checkFigures(text, [{ says: 'Seen 12 stops.', data: result }], ['today 2026-11-10']);
    expect(c.unsure).toEqual(['1,250']);
    expect(c.checked).toBe(7);
  });
  it('a figure written as rounded passes only when said so', () => {
    expect(checkFigures('around 1,700 kg', [{ data: { v: 1716 } }], []).unsure).toEqual([]);
    expect(checkFigures('1,700 kg', [{ data: { v: 1716 } }], []).unsure).toEqual(['1,700']);
  });
  it('a work_out that rests on a figure nobody gave lends nothing', () => {
    expect(checkFigures('That is 1,954.', [{ says: 'x = 1,954', data: { value: 1954, backed: false } }], []).unsure).toEqual(['1,954']);
    expect(checkFigures('That is 1,954.', [{ says: 'x', data: { value: 1954, backed: true } }], []).unsure).toEqual([]);
  });
  it('what the person said is a source', () => {
    expect(checkFigures('You said 42 minutes, down to 25.', [], ['around 42 minutes, down to 25']).unsure).toEqual([]);
  });
});

describe('the marks and the line', () => {
  it('marks a figure where it stands and says the count', () => {
    expect(markFigures('Lost 1,250 kg and 264 kg.', ['1,250'])).toEqual([{ text: 'Lost ', check: false }, { text: '1,250', check: true }, { text: ' kg and 264 kg.', check: false }]);
    expect(figuresSaid({ checked: 6, unsure: [] })).toBe('All 6 figures checked against the app’s working.');
    expect(figuresSaid({ checked: 6, unsure: ['1,250', '7'] })).toBe('2 of 6 figures to check — not in the app’s working or what you said.');
    expect(figuresSaid({ checked: 0, unsure: [] })).toBeUndefined();
  });
});

describe('pence said are pounds too (10 November)', () => {
  it('reads "35p" as 35 and 0.35, and leaves a word ending in p alone', () => {
    expect(numbersIn('300 packs at 35p')).toEqual(expect.arrayContaining([300, 35, 0.35]));
    expect(numbersIn('12.5p a pack')).toEqual(expect.arrayContaining([12.5, 0.125]));
    expect(numbersIn('a 3D map')).toEqual([]);
  });
});

describe('a clock time lends no figure', () => {
  it('the stamp on a turn is not a number the records hold — "about 45" stays unbacked whatever second it was sent', () => {
    const said = ['[2026-11-12T21:19:45.123Z] What is open on this line?', '[2026-11-12T20:44:46.001Z] and briefly'];
    expect(numbersIn(said[0])).toEqual([]);
    expect(checkFigures('The film costs about 45 minutes a day.', [], said).unsure).toEqual(['45']);
    expect(numbersIn('at 14:30 we lost 45 minutes')).toEqual([45]);
  });
});

describe('the workbook exam’s lessons (20 November)', () => {
  it('the day of a date said in words is not a figure; a figure beside a month still is', () => {
    expect(checkFigures('From August to 15 October, and October 15 too.', [], []).unsure).toEqual([]);
    expect(checkFigures('October made 448,842 packs.', [], []).unsure).toEqual(['448,842']);
    expect(checkFigures('It stood 25 minutes in October.', [], []).unsure).toEqual(['25']);
  });
  it('what the app said in code — a workbook’s first look — is the app’s working', async () => {
    const { workedInCode } = await import('../conversation');
    const turns = [
      { id: 'a', at: 1, who: 'Faultline', kind: 'reply', byCode: true, text: 'I have taken “Downtime (min)” as the figure that matters: 13,029 over 324 rows. By “Shift”: Days 6,145, Nights 6,884.' },
      { id: 'b', at: 2, who: 'Faultline', kind: 'reply', text: 'Luna said 999 once.' },
    ] as never[];
    const worked = workedInCode(turns);
    expect(worked).toHaveLength(1);
    expect(checkFigures('Nights lost 6,884 minutes and days 6,145, of 13,029.', [], worked).unsure).toEqual([]);
    expect(checkFigures('That is 999 minutes.', [], worked).unsure).toEqual(['999']);
  });
  it('a figure rounded to millions or thousands is the app’s figure said as rounded', () => {
    const held = [{ data: { totals: [2199187, 448842] } }];
    expect(checkFigures('About 2.2 million packs, 448.8k of them in October.', held, []).unsure).toEqual([]);
    expect(checkFigures('2.3 million packs.', held, []).unsure).toEqual(['2.3']);
    expect(checkFigures('Efficiency was 87%.', [{ data: { v: 0.8749 } }], []).unsure).toEqual([]);
  });
});
