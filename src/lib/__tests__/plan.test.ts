/* The arithmetic of putting the job on an axis.
 *
 * Tested here rather than through a screenshot because the screen and the
 * client report both take these numbers, and a mark in the wrong place is the
 * kind of fault that looks plausible in a picture and is obvious in a number.
 */
import { describe, it, expect } from 'vitest';
import { footprint, labelGap, layoutPlan, placeLabel, planAgenda, planSays, whenWords } from '../plan';
import type { PlanMark } from '../standing';

const mark = (o: Partial<PlanMark> & { at: string }): PlanMark => ({
  kind: 'test', label: 'a thing', tone: 'booked', ...o,
});

describe('the axis', () => {
  it('runs from the month the first thing falls in to the end of the last', () => {
    const p = layoutPlan([mark({ at: '2026-09-21' }), mark({ at: '2026-11-03' })]);
    expect(p.axis.from).toBe('2026-09-01');
    expect(p.axis.to).toBe('2026-12-01');
    expect(p.axis.ticks.map(t => t.label)).toEqual(['Sep', 'Oct', 'Nov']);
  });

  it('starts the first tick at the very left', () => {
    const p = layoutPlan([mark({ at: '2026-09-21' })]);
    expect(p.axis.ticks[0]!.at).toBe(0);
  });

  it('says the year on a month that is not in the first one', () => {
    const p = layoutPlan([mark({ at: '2026-12-02' }), mark({ at: '2027-01-08' })]);
    expect(p.axis.ticks.map(t => t.label)).toEqual(['Dec', 'Jan 27']);
  });

  it('stretches to hold today and both project dates, not just the marks', () => {
    const p = layoutPlan([mark({ at: '2026-09-21' })], {
      today: '2026-09-22', expectedAt: '2026-12-15', plannedAt: '2026-11-30',
    });
    expect(p.axis.to).toBe('2027-01-01');
  });

  it('places a date in the middle of the span, not at an end', () => {
    /* Sep + Oct = 61 days; 16 Sep is day 15. */
    const p = layoutPlan([mark({ at: '2026-09-01' }), mark({ at: '2026-10-31' })]);
    const mid = layoutPlan([mark({ at: '2026-09-16' }), mark({ at: '2026-09-01' }), mark({ at: '2026-10-31' })]);
    expect(p.axis.from).toBe('2026-09-01');
    const placed = mid.lanes[0]!.rows.flat().find(m => m.when === '16 Sep')!;
    expect(placed.at).toBeCloseTo(15 / 61, 4);
  });

  it('leaves today off when today is outside the axis', () => {
    const p = layoutPlan([mark({ at: '2026-09-21' })], { today: '2027-06-01' });
    /* today widened the axis, so it IS inside — the case that matters is a
       plan with no today given at all. */
    expect(p.axis.today).toBeDefined();
    expect(layoutPlan([mark({ at: '2026-09-21' })]).axis.today).toBeUndefined();
  });
});

describe('the lanes', () => {
  it('reads top to bottom in the order the job runs', () => {
    const p = layoutPlan([
      mark({ at: '2026-09-02', kind: 'test' }),
      mark({ at: '2026-09-03', kind: 'machine' }),
      mark({ at: '2026-09-04', kind: 'program' }),
      mark({ at: '2026-09-05', kind: 'material' }),
      mark({ at: '2026-09-06', kind: 'fix' }),
    ]);
    expect(p.lanes.map(l => l.label)).toEqual(['Machines', 'Materials', 'Programs', 'Fixes', 'Tests']);
  });

  it('does not draw a band for a list with nothing dated on it', () => {
    const p = layoutPlan([mark({ at: '2026-09-02', kind: 'test' })]);
    expect(p.lanes.map(l => l.kind)).toEqual(['test']);
  });

  it('puts two marks that would collide on separate lines', () => {
    const p = layoutPlan([
      mark({ at: '2026-09-02', label: 'one' }),
      mark({ at: '2026-09-03', label: 'two' }),
    ], { minGap: 0.5 });
    expect(p.lanes[0]!.rows).toHaveLength(2);
    expect(p.lanes[0]!.rows.map(r => r[0]!.label)).toEqual(['one', 'two']);
  });

  it('shares a line when there is room between them', () => {
    const p = layoutPlan([
      mark({ at: '2026-09-02', label: 'one' }),
      mark({ at: '2026-09-28', label: 'two' }),
    ], { minGap: 0.1 });
    expect(p.lanes[0]!.rows).toHaveLength(1);
    expect(p.lanes[0]!.rows[0]).toHaveLength(2);
  });

  it('gives a long label the room it needs and a short one less', () => {
    /* A flat gap treated "P-104" and a forty-character trial title as the same
       width, and on the A3 the long one ran straight through the mark seven
       days after it. */
    /* Both on the SAME two-month axis, so the only thing that differs is how
       many characters the first label has. Seven days is 11% of it. */
    const gap = { widthOf: (m: PlanMark) => labelGap(m.label, 3.9, 46, 1036) };
    const far = mark({ at: '2026-10-31', kind: 'material', label: 'x' });

    const wide = layoutPlan([
      far,
      mark({ at: '2026-09-20', label: 'Seal integrity — Finest Red 2kg' }),
      mark({ at: '2026-09-27', label: 'Seal integrity — Finest Red 2kg — re-test' }),
    ], gap);
    expect(wide.lanes.find(l => l.kind === 'test')!.rows).toHaveLength(2);

    const narrow = layoutPlan([
      far,
      mark({ at: '2026-09-20', label: 'P-104' }),
      mark({ at: '2026-09-27', label: 'P-118' }),
    ], gap);
    expect(narrow.lanes.find(l => l.kind === 'test')!.rows).toHaveLength(1);
  });

  it('measures the gap from the END of a bar, not its start', () => {
    /* A machine on site on the 2nd and running on the 28th occupies the month;
       something on the 20th cannot share its line. */
    const p = layoutPlan([
      mark({ at: '2026-09-02', until: '2026-09-28', kind: 'machine', label: 'packer' }),
      mark({ at: '2026-09-20', kind: 'machine', label: 'detector' }),
    ], { minGap: 0.1 });
    expect(p.lanes[0]!.rows).toHaveLength(2);
  });

  it('carries the bar end through as a fraction', () => {
    const p = layoutPlan([mark({ at: '2026-09-01', until: '2026-09-16', kind: 'machine' })]);
    const m = p.lanes[0]!.rows[0]![0]!;
    expect(m.at).toBe(0);
    expect(m.until).toBeCloseTo(15 / 30, 4);
  });

  it('writes the date for the drawer so no drawer has to parse one', () => {
    const p = layoutPlan([mark({ at: '2026-09-21' })]);
    expect(p.lanes[0]!.rows[0]![0]!.when).toBe('21 Sep');
  });
});

describe('the two dates', () => {
  it('draws the agreed date beside the expected one when it moved', () => {
    const p = layoutPlan([mark({ at: '2026-09-21' })], {
      expectedAt: '2026-10-27', plannedAt: '2026-10-19',
    });
    expect(p.axis.expected).toMatchObject({ label: 'At rate', when: '27 Oct' });
    expect(p.axis.agreed).toMatchObject({ label: 'Agreed', when: '19 Oct' });
    expect(p.axis.agreed!.at).toBeLessThan(p.axis.expected!.at);
  });

  it('does not draw the same date twice when nothing has slipped', () => {
    const p = layoutPlan([mark({ at: '2026-09-21' })], {
      expectedAt: '2026-10-19', plannedAt: '2026-10-19',
    });
    expect(p.axis.expected).toBeDefined();
    expect(p.axis.agreed).toBeUndefined();
  });

  it('says nothing about a date the project has not set', () => {
    const p = layoutPlan([mark({ at: '2026-09-21' })], { plannedAt: '2026-10-19' });
    expect(p.axis.expected).toBeUndefined();
    expect(p.axis.agreed).toBeUndefined();
  });
});

describe('nothing to draw', () => {
  it('says so rather than returning an axis with an empty middle', () => {
    const p = layoutPlan([], { today: '2026-09-22', expectedAt: '2026-10-19' });
    expect(p.empty).toBe(true);
    expect(p.lanes).toEqual([]);
  });
});

describe('the agenda — the same marks read down', () => {
  it('groups by month in date order', () => {
    const a = planAgenda([
      mark({ at: '2026-10-02', label: 'b' }),
      mark({ at: '2026-09-21', label: 'a' }),
      mark({ at: '2026-10-20', label: 'c' }),
    ]);
    expect(a.map(m => m.label)).toEqual(['Sep', 'Oct']);
    expect(a[1]!.items.map(i => i.label)).toEqual(['b', 'c']);
  });

  it('carries the same words and tones the axis does', () => {
    const a = planAgenda([mark({ at: '2026-09-21', tone: 'late', label: 'film' })]);
    expect(a[0]!.items[0]).toMatchObject({ when: '21 Sep', tone: 'late', label: 'film' });
  });
});

describe('what the plan says about itself', () => {
  it('counts what is done, what is ahead and what the day has gone on', () => {
    const s = planSays([
      mark({ at: '2026-09-01', tone: 'done' }),
      mark({ at: '2026-09-02', tone: 'late' }),
      mark({ at: '2026-10-30', tone: 'booked' }),
    ], '2026-09-22');
    expect(s).toBe('1 of 3 done · 1 still ahead · 1 past the day');
  });

  it('does not invent a count it has nothing for', () => {
    expect(planSays([mark({ at: '2026-09-01', tone: 'done' })], '2026-09-22'))
      .toBe('1 of 1 done');
  });

  it('says plainly when nothing carries a date', () => {
    expect(planSays([], '2026-09-22')).toBe('Nothing on any list carries a date yet.');
  });

  it('says how many ran and are waiting on a verdict', () => {
    expect(planSays([mark({ at: '2026-09-21', tone: 'ran' })], '2026-09-22'))
      .toBe('0 of 1 done · 1 waiting on a verdict');
  });
});

describe('the words a date becomes', () => {
  it('is the day and the short month', () => {
    expect(whenWords('2026-09-21')).toBe('21 Sep');
    expect(whenWords('2026-01-05')).toBe('5 Jan');
  });
});

describe('which way the words go', () => {
  it('go right when they fit, with the rest of the axis as their room', () => {
    expect(placeLabel(0.2, 0.2, 0.3)).toEqual({ side: 'right', room: 0.8 });
  });

  it('go back down the axis when they would run off the end of it', () => {
    /* At 0.9 with words 0.3 wide: 0.1 ahead, 0.9 behind. */
    expect(placeLabel(0.9, 0.9, 0.3)).toEqual({ side: 'left', room: 0.9 });
  });

  it('do not flip a short label just because it is near the end', () => {
    /* The old rule flipped everything past 72% of the axis. "P-104" at 80%
       fits on the right with room to spare, and reads the way the rest do. */
    expect(placeLabel(0.8, 0.8, 0.05).side).toBe('right');
  });

  it('take the roomier side, to be trimmed, when they fit on neither', () => {
    expect(placeLabel(0.4, 0.4, 0.7)).toEqual({ side: 'right', room: 0.6 });
    expect(placeLabel(0.7, 0.7, 0.9)).toEqual({ side: 'left', room: 0.7 });
  });

  it('measure a bar from where it ends going right and where it starts going left', () => {
    expect(placeLabel(0.5, 0.85, 0.2)).toEqual({ side: 'left', room: 0.5 });
    expect(placeLabel(0.1, 0.4, 0.2)).toEqual({ side: 'right', room: 0.6 });
  });

  it('are laid out by layoutPlan, so no drawer decides for itself', () => {
    /* A 30-day axis. The 28th is 0.9 along; words 0.3 wide cannot go right. */
    const p = layoutPlan([mark({ at: '2026-09-28', label: 'a long enough title' })], { widthOf: () => 0.3 });
    const m = p.lanes[0]!.rows[0]![0]!;
    expect(m.side).toBe('left');
    expect(m.room).toBeCloseTo(27 / 30, 4);
  });
});

describe('the ground a mark takes up', () => {
  it('runs from the dot to the end of its words', () => {
    expect(footprint({ at: 0.2, side: 'right', room: 0.8 }, 0.1)).toEqual([0.2, expect.closeTo(0.3, 6)]);
  });

  it('runs back from the dot when the words went left', () => {
    expect(footprint({ at: 0.9, side: 'left', room: 0.9 }, 0.1)).toEqual([expect.closeTo(0.8, 6), 0.9]);
  });

  it('is only as long as the room there was, because the words get trimmed to it', () => {
    expect(footprint({ at: 0.7, side: 'right', room: 0.3 }, 0.5)).toEqual([0.7, expect.closeTo(1, 6)]);
  });

  it('includes the whole of a bar', () => {
    expect(footprint({ at: 0.1, until: 0.4, side: 'right', room: 0.6 }, 0.1)).toEqual([0.1, expect.closeTo(0.5, 6)]);
    expect(footprint({ at: 0.5, until: 0.85, side: 'left', room: 0.5 }, 0.1)).toEqual([expect.closeTo(0.4, 6), 0.85]);
  });

  it('reads an unplaced mark as right-going with the whole axis to itself', () => {
    expect(footprint({ at: 0.2 }, 0.1)).toEqual([0.2, expect.closeTo(0.3, 6)]);
  });
});

describe('packing when words go both ways', () => {
  it('puts a flipped label on its own line rather than over the mark before it', () => {
    /* A 30-day axis. 'first' on the 22nd (0.7) goes right, words 0.25 wide,
       to 0.95. 'last' on the 28th (0.9) cannot go right, goes left to 0.65 —
       straight across 'first'. The old packer only asked whether there was
       room to the RIGHT of 'first', found 0.2 < 0.25, and stacked them anyway;
       this is the case where it would have found room and been wrong. */
    const p = layoutPlan([
      mark({ at: '2026-09-22', label: 'first' }),
      mark({ at: '2026-09-28', label: 'last' }),
    ], { widthOf: m => (m.label === 'first' ? 0.15 : 0.25) });
    expect(p.lanes[0]!.rows).toHaveLength(2);
    expect(p.lanes[0]!.rows[1]![0]!.side).toBe('left');
  });

  it('lets a flipped label share a line with something well before it', () => {
    /* 'early' on the 4th (0.1) to 0.3; 'last' at 0.9 going left to 0.65. Clear. */
    const p = layoutPlan([
      mark({ at: '2026-09-04', label: 'early' }),
      mark({ at: '2026-09-28', label: 'last' }),
    ], { widthOf: m => (m.label === 'early' ? 0.2 : 0.25) });
    expect(p.lanes[0]!.rows).toHaveLength(1);
  });

  it('keeps a hair of clear axis between two footprints', () => {
    /* 'one' at 0.1 takes exactly to 0.4; 'two' sits at 0.4. Touching is not clear. */
    const p = layoutPlan([
      mark({ at: '2026-09-04', label: 'one' }),
      mark({ at: '2026-09-13', label: 'two' }),
    ], { widthOf: m => (m.label === 'one' ? 0.3 : 0.1) });
    expect(p.lanes[0]!.rows).toHaveLength(2);
  });

  it('never lets a footprint reach past either end of the axis', () => {
    const p = layoutPlan([
      mark({ at: '2026-09-01', label: 'start' }),
      mark({ at: '2026-09-30', label: 'end' }),
    ], { widthOf: () => 1.5 });
    for (const m of p.lanes[0]!.rows.flat()) {
      const [a, b] = footprint(m, 1.5);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});
