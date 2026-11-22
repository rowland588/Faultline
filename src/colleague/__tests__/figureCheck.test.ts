/* EVERY FIGURE CHECKED (docs/LUNA-NEXT.md L1): figures in an answer found in Faultline's working to the rounding written; a figure found
 * nowhere marked; the things that are not figures left alone. */
import { describe, it, expect } from 'vitest';
import { UNTRACED_SAID, checkFigures, figuresSaid, lendsNothing, markFigures, numbersIn } from '../figureCheck';
import { earlierSteps, type ColleagueTurn } from '../conversation';

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

/* 21 November — the investigation measured with the real model, twice (docs/LUNA-EVAL.md §6). Asked for the finding in two sentences,
 * Luna quoted figures the app had worked out two answers earlier — 7.93%, 87%, 1,636 — and each was marked Check this. The steps of an
 * earlier answer reached the check only as the first bracketed line of the turn's text; the first step of that answer (a workbook's
 * structure) said several lines, so every step after it was lost. They are read from the turns themselves now. */
describe('what earlier answers worked out is the app’s working (21 November)', () => {
  const used = (name: string, status: string, says: string) => ({ callId: `${name}-${says.length}`, name, title: name, kind: 'read', status, says, refs: [], at: 2 });
  const turns = [
    { id: 'q1', at: 1, who: 'You', kind: 'typed', text: 'There is a significant variance against plan. Can you find out why?' },
    { id: 'r1', at: 2, who: 'Faultline', kind: 'reply', text: 'October came in under plan and most of it is Line 3. I once said 999.', used: [
      used('workbook_profile', 'done', 'Plant performance October 2026.xlsx — three sheets.\nProduction: 704 rows, a row a line, shift and day.\nDowntime log: 451 rows.'),
      used('explain_variance', 'done', 'Packs made against plan: plan 6,006,000 packs, actual 5,529,584 packs — −476,416 packs (−7.93%), below plan. It sits most in Line: Line 3 −266,568 packs (56% of the variance).'),
      used('query_workbook', 'failed', 'There is no sheet called Stops — 4,321 rows were not read.'),
    ] },
    { id: 'q2', at: 3, who: 'You', kind: 'typed', text: 'How much of that is down to the stops on Line 3?' },
    { id: 'r2', at: 4, who: 'Faultline', kind: 'reply', text: 'The stops explain most of it.', used: [
      used('work_out', 'done', 'share of Line 3 shortfall explained, low end: 2317.1 * 100 / 266568 * 100 = 87 % — 86.92 before rounding (worked out by the app).'),
      used('work_out', 'done', 'Bagger stops minutes: 1185.7 + 450.1 = 1,636 min — 1,635.8 before rounding (worked out by the app).'),
      used('work_out', 'done', `A guess: 5000 * 3 = 15,000 (worked out by the app). It rests on 5,000, ${UNTRACED_SAID}'s working or what the person said — say where it comes from, or the figure is not to be relied on.`),
      { ...used('raise_problem', 'declined', 'Not done — the person said not now. It would have said 77 minutes.'), kind: 'write' },
    ] },
    { id: 'r3', at: 5, who: 'Faultline', kind: 'reply', struck: true, text: 'Struck.', used: [used('work_out', 'done', 'x: 4444 * 2 = 8,888 (worked out by the app).')] },
  ] as unknown as ColleagueTurn[];
  const earlier = earlierSteps(turns);

  it('every step that ran lends its figures, however many lines an earlier step’s sentence ran to', () => {
    expect(earlier).toHaveLength(4);
    const said = 'October came in 476,416 packs (7.93%) under plan, and more than half of that is on Line 3. Logged stops account for 87% of Line 3’s 266,568-pack shortfall, with 1,636 minutes of them on the Bagger.';
    expect(checkFigures(said, earlier, []).unsure).toEqual([]);
    /* the value before rounding is the app’s too */
    expect(checkFigures('That is 86.92% and 1,635.8 minutes.', earlier, []).unsure).toEqual([]);
  });
  it('a step that failed or was declined, a struck answer, a sum resting on a figure nobody gave and Luna’s own words lend nothing', () => {
    expect(checkFigures('That is 4,321 rows, 77 minutes, 8,888, 15,000 from 5,000 — and 999.', earlier, []).unsure).toEqual(['4,321', '77', '8,888', '15,000', '5,000', '999']);
  });
  it('lendsNothing is a sum whose sentence says it rests on a figure found nowhere — nothing else', () => {
    expect(lendsNothing({ name: 'work_out', says: `x: 5000 * 3 = 15,000 (worked out by the app). It rests on 5,000, ${UNTRACED_SAID}'s working.` })).toBe(true);
    expect(lendsNothing({ name: 'work_out', says: 'x: 35 / 48 * 100 = 72.9 % (worked out by the app).' })).toBe(false);
    expect(lendsNothing({ name: 'query_workbook', says: `A cell says "${UNTRACED_SAID}".` })).toBe(false);
  });
});

/* A RESULT THAT WAS CUT (21 November, the audit of the analysis): more groups than it shows. A share of the groups it shows is not a
 * share of the total — and the check was vouching for it. */
describe('a share is only ever taken against a result’s true total', () => {
  /* 60 reasons in all; the three biggest shown: 400, 300 and 100 minutes of a true total of 2,000 */
  const shown = [{ key: ['Jam'], values: [400] }, { key: ['Film break'], values: [300] }, { key: ['No bags'], values: [100] }];
  const cut = { groups: shown, groupsTotal: 60, measures: ['sum of Minutes'], totals: [2000] };
  const whole = { groups: shown, groupsTotal: 3, measures: ['sum of Minutes'], totals: [800] };

  it('a result that shows every group lends each group’s share of their sum, as before', () => {
    expect(checkFigures('Jam is 50% of it and Film break 37.5%.', [{ data: whole }], []).unsure).toEqual([]);
  });

  it('a cut result does NOT lend a share of the groups it shows: 400 of the 800 shown is not 50% of the 2,000', () => {
    expect(checkFigures('Jam is 50% of the lost time.', [{ data: cut }], []).unsure).toEqual(['50%']);
    /* nor the sum of the groups shown, which is no total */
    expect(checkFigures('The top three come to 800 minutes.', [{ data: cut }], []).unsure).toEqual(['800']);
  });

  it('…it lends each group’s share of the TRUE total — 400 of 2,000 is 20%', () => {
    const c = checkFigures('Jam is 20% of the 2,000 minutes lost, Film break 15% and No bags 5%.', [{ data: cut }], []);
    expect(c.unsure).toEqual([]);
    expect(c.checked).toBe(4);
  });

  it('an average has no share, cut or not: a cut result of averages lends none', () => {
    const avg = { groups: [{ key: ['Line 1'], values: [0.9] }, { key: ['Line 2'], values: [0.8] }], groupsTotal: 12, measures: ['avg of Score'], totals: [0.85] };
    expect(checkFigures('Line 1 is 105.9% of the average.', [{ data: avg }], []).unsure).toEqual(['105.9%']);
  });

  it('a cut result with no total of its own lends no share at all', () => {
    expect(checkFigures('Jam is 20% of it.', [{ data: { ...cut, totals: [] } }], []).unsure).toEqual(['20%']);
  });
});

describe('a year is not a figure — but a number with its thousands marked is never a year', () => {
  it('"in 2026" is left alone; "2,000 minutes" is checked, and marked when nothing holds it', () => {
    expect(checkFigures('In 2026 the line lost 2,000 minutes.', [], [])).toEqual({ checked: 1, unsure: ['2,000'] });
    expect(checkFigures('In 2026 the line lost 2,000 minutes.', [{ says: 'Minutes lost: 2,000.' }], [])).toEqual({ checked: 1, unsure: [] });
  });
});
