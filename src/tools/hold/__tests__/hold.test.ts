/* PRODUCT ON HOLD, WORKED (FC-135; knowledge/specs/FC-135-product-on-hold.md, Calculations). The expected figures are the knowledge record's
 * own case — 4,800 packs held 6 days on a failed seal check, £0.42 materials + £0.11 labour a pack, £0.35 margin, 12% a year, a 21-day life
 * (scripts/knowledge/cases-quality.py) — worked by hand, plus the rules the record states. */
import { describe, expect, it } from 'vitest';
import { carriedOf, costEachOf, daysBetween, daysHeld, decidedQty, gbp, heldQty, holdActions, holdClosing, holdFigures, holdMoney, holdSays, holdWords, label, lifeUsedPct, lossOf, nextNo, pastDecideBy, qtyWords, tiedUpOf, type Hold, type HoldOutcome } from '../hold';

const D0 = '2026-10-20', D6 = '2026-10-26';
const hold = (o: Partial<Hold> = {}): Hold => ({ id: 'h1', no: 1, product: 'Pouch 400 g', lot: 'L2041', qty: 4800, unit: 'packs', reason: 'Seal check failed', raisedOn: D0, raisedAt: Date.parse(D0), owner: 'A. Quality', decideBy: '2026-10-27', costEach: 0.53, lifeDays: 21, ...o });
const out = (o: Partial<HoldOutcome> = {}): HoldOutcome => ({ id: 'o1', disposition: 'release', qty: 4800, on: D6, at: Date.parse(D6), by: 'A. Quality', grounds: 'Re-test passed', ...o });
const line = { materialsPerPack: 0.42, marginPerPack: 0.35 };

describe('the record’s case — 4,800 packs held 6 days', () => {
  const h = hold();
  it('days held, to today while it is open', () => { expect(daysBetween(D0, D6)).toBe(6); expect(daysHeld(h, D6)).toBe(6); });
  it('what is tied up: 4,800 × (0.42 + 0.11) = £2,544', () => { expect(tiedUpOf(h, {})).toBe(2544); });
  it('what waiting cost at 12% a year: 2,544 × 0.12 ÷ 365 × 6 = £5.02', () => { expect(carriedOf(h, {}, 12, D6)).toBe(5.02); });
  it('with no rate given, nothing is carried and nothing is made up', () => { expect(carriedOf(h, {}, undefined, D6)).toBeUndefined(); });
  it('the shelf life used: 6 of 21 days = 29%', () => { expect(lifeUsedPct(h, D6)).toBe(29); });
  it('destroyed: the loss is £2,544 and the margin not earned £1,680, said apart (their sum is the record’s £4,224)', () => {
    const l = lossOf(out({ disposition: 'destroy' }), h, line);
    expect(l.lost).toBe(2544); expect(l.notEarned).toBe(1680); expect((l.lost ?? 0) + (l.notEarned ?? 0)).toBe(4224);
  });
  it('released after a re-test: nothing lost (the review’s hours are not priced)', () => { expect(lossOf(out(), h, line)).toEqual({ lost: 0 }); });
  it('destroyed with a disposal cost typed: it is added to what was lost, not to the margin', () => {
    expect(lossOf(out({ disposition: 'destroy', extra: 120 }), h, line).lost).toBe(2664);
  });
});

describe('the cost a piece — typed first, then the line’s materials for packs, else named as missing', () => {
  it('typed wins', () => { expect(costEachOf(hold(), line)).toEqual({ value: 0.53, from: 'typed' }); });
  it('the line’s materials a pack stands in for packs (materials only)', () => {
    const h = hold({ costEach: undefined });
    expect(costEachOf(h, line)).toEqual({ value: 0.42, from: 'line' });
    expect(tiedUpOf(h, line)).toBe(2016);
  });
  it('not for kilos — the line’s figure is a pack’s', () => { expect(costEachOf(hold({ costEach: undefined, unit: 'kg' }), line)).toBeUndefined(); });
  it('nothing known: no figure, and the money says which input is missing', () => {
    const f = holdFigures([hold({ costEach: undefined })], D6, {});
    expect(f.tiedUp).toBeUndefined(); expect(f.tiedUpMissing).toBe(1);
    expect(holdMoney(f).join(' ')).toMatch(/Give the cost a piece on the hold/);
    expect(holdSays(f).text).not.toContain('£'); // no figure is invented; the money lines name the missing input
  });
});

describe('a hold decided in part, and in full', () => {
  it('4,500 released and 300 destroyed: held 0, closed, lost £159 and £105 not earned', () => {
    const h = hold({ outcomes: [out({ id: 'a', qty: 4500 }), out({ id: 'b', disposition: 'destroy', qty: 300, on: '2026-10-25', at: Date.parse('2026-10-25') })] });
    expect(decidedQty(h)).toBe(4800); expect(heldQty(h)).toBe(0);
    const f = holdFigures([h], D6, line);
    expect(f.open.length).toBe(0); expect(f.closed.length).toBe(1);
    expect(f.lost).toBe(159); expect(f.notEarned).toBe(105);
    expect(daysHeld(h, D6)).toBe(6); // to the last decision, 25 Oct → 5 days
  });
  it('part decided leaves the rest open and tied up at the cost of what is left', () => {
    const h = hold({ outcomes: [out({ qty: 1800 })] });
    expect(heldQty(h)).toBe(3000); expect(tiedUpOf(h, {})).toBe(1590);
    expect(holdWords(h, D6, {}).text).toContain('(3,000 of 4,800 still held)');
  });
  it('a struck decision puts the quantity back on hold', () => {
    const h = hold({ outcomes: [out({ struck: true })] });
    expect(heldQty(h)).toBe(4800);
  });
});

describe('the register’s sentence and its tone', () => {
  it('quantities by unit are never added across units', () => {
    expect(qtyWords({ packs: 12400, cases: 20 })).toBe('12,400 packs and 20 cases');
    expect(qtyWords({ packs: 1, cases: 2, pallets: 3 })).toBe('1 packs, 2 cases and 3 pallets');
  });
  it('past the day to decide by is red and said in days', () => {
    const h = hold({ decideBy: '2026-10-23' });
    expect(pastDecideBy(h, D6)).toBe(true);
    const f = holdFigures([h], D6, {});
    expect(holdSays(f).tone).toBe('r');
    expect(holdSays(f).text).toContain('1 past the day to decide by');
    expect(holdWords(h, D6, {}).text).toContain('3 days past its decide-by day');
    expect(holdActions(f, D6)[0]).toMatchObject({ state: 'Late', tone: 'r', who: 'A. Quality', due: '2026-10-23' });
  });
  it('open and in time is amber; nothing open is green; none yet is grey', () => {
    expect(holdSays(holdFigures([hold()], D6, {})).tone).toBe('a');
    expect(holdSays(holdFigures([hold({ outcomes: [out()] })], D6, {})).tone).toBe('g');
    expect(holdSays(holdFigures([], D6, {})).tone).toBe('n');
  });
  it('a hold with no day to decide by or nobody to decide is said — a slow destroy', () => {
    const f = holdFigures([hold({ decideBy: undefined, owner: '' })], D6, {});
    expect(holdSays(f).text).toContain('1 hold with no day to decide by and 1 hold with nobody to decide');
    expect(holdSays(f).text).toContain('a slow destroy');
  });
  it('a struck hold is not counted', () => { expect(holdFigures([hold({ struck: true })], D6, {}).holds).toBe(0); });
});

describe('why holds happen — the repeat rule', () => {
  const three = ['Seal check failed', ' seal  CHECK failed', 'Seal check failed'].map((r, i) => hold({ id: `h${i}`, no: i + 1, reason: r, raisedOn: i === 0 ? '2026-10-01' : '2026-10-15' }));
  it('three holds for one reason in 28 days (case and spacing ignored) open an 8D', () => {
    const f = holdFigures(three, D6, {});
    expect(f.reasons[0]).toMatchObject({ n: 3 });
    expect(f.repeat).toMatchObject({ n: 3 });
    expect(holdClosing(f).text).toContain('an 8D is the next step');
  });
  it('two do not; three over more than 28 days do not', () => {
    expect(holdFigures(three.slice(0, 2), D6, {}).repeat).toBeUndefined();
    expect(holdFigures(three.map(h => ({ ...h, raisedOn: '2026-08-01' })), D6, {}).repeat).toBeUndefined();
  });
});

describe('who decided', () => {
  it('a decision by someone not on the authority list is flagged, and one by a listed name (any case) is not', () => {
    const h = hold({ outcomes: [out({ id: 'a', qty: 2000, by: 'Production lead' }), out({ id: 'b', qty: 2800, by: 'a. quality' })] });
    const f = holdFigures([h], D6, {}, { authority: ['A. Quality'] });
    expect(f.unauthorised.map(u => u.outcome.id)).toEqual(['a']);
    expect(holdFigures([h], D6, {}).unauthorised).toEqual([]);
  });
});

describe('the other fates are priced only from what is typed', () => {
  const h = hold();
  it('concession and regrade: the price lost typed; none: named', () => {
    expect(lossOf(out({ disposition: 'concession', extra: 300 }), h, line).lost).toBe(300);
    expect(lossOf(out({ disposition: 'regrade' }), h, line)).toEqual({ missing: 'Give the price lost to say it in money.' });
  });
  it('rework: its cost typed; none: named', () => {
    expect(lossOf(out({ disposition: 'rework', extra: 480 }), h, line).lost).toBe(480);
    expect(lossOf(out({ disposition: 'rework' }), h, line).missing).toBe('Give what the rework cost to say it in money.');
  });
  it('destroying kilos: no margin (the line’s margin is a pack’s)', () => {
    expect(lossOf(out({ disposition: 'destroy', qty: 100 }), hold({ unit: 'kg', qty: 100, costEach: 3 }), line)).toEqual({ lost: 300 });
  });
  it('destroying with no cost a piece: the missing input is named', () => {
    expect(lossOf(out({ disposition: 'destroy' }), hold({ costEach: undefined, unit: 'cases' }), {}).missing).toMatch(/cost of a piece/);
  });
});

describe('numbers and words', () => {
  it('the label is H- and three digits; the next number follows the highest', () => { expect(label({ no: 7 })).toBe('H-007'); expect(nextNo([hold({ no: 7 }), hold({ no: 3 })])).toBe(8); expect(nextNo([])).toBe(1); });
  it('pounds: whole when whole, pence when not', () => { expect(gbp(2544)).toBe('£2,544'); expect(gbp(5.02)).toBe('£5.02'); });
  it('the money lines say tied up is not lost', () => {
    const f = holdFigures([hold()], D6, {}, { carryPct: 12 });
    expect(holdMoney(f, { carryPct: 12 })[0]).toBe('Tied up in product on hold: £2,544 — money waiting, not money lost. Waiting has cost £5.02 so far at 12% a year.');
  });
});
