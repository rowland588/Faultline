/* FC-034 part 4 — one feed splitting into lines (knowledge/specs/FC-034-split-lines.md §6, hand-worked).
 * Filler 120 a minute feeds Line A (a bagger at 160 then a palletiser at 68.25) and Line B (one machine at 40). */
import { describe, expect, it } from 'vitest';
import { analyse, FEED_ZONE, type Capacity, type Station } from '../capacity';

const m = (id: string, rate: number, over: Partial<Station> = {}): Station =>
  ({ id, kind: 'machine', name: id, rate, ratePer: 'min', unit: 'units', source: 'plate', contains: 1, goodPct: 100, runningPct: 100, crew: 1, ...over }) as Station;

const split = (filler: number, over: Partial<Capacity> = {}, feedOver: Partial<Station> = {}): Capacity => ({
  lanes: [{ id: 'a', name: 'Line A' }, { id: 'b', name: 'Line B' }],
  stations: [m('Filler', filler, { lane: FEED_ZONE, ...feedOver }), m('bagger', 160, { lane: 'a' }), m('palletiser', 68.25, { lane: 'a' }), m('sealer', 40, { lane: 'b' })],
  ...over,
} as Capacity);

describe('one feed splitting into lines', () => {
  it('A — the lines hold it: 120 supplied, 108.25 taken, 11.75 to spare', () => {
    const r = analyse(split(120));
    expect(r.lanes?.heldBy).toBe('lanes');
    expect(r.line).toBeCloseTo(108.25, 9);
    expect(r.lanes?.sends).toBeCloseTo(108.25, 9);
    expect(r.lanes?.sections.map(x => [x.name, x.result.line, x.result.limit?.station.name])).toEqual([['Line A', 68.25, 'palletiser'], ['Line B', 40, 'sealer']]);
    expect(r.sentence).toContain('Filler can supply 120');
    expect(r.sentence).toContain('Line A up to 68.3 (held by palletiser)');
    expect(r.sentence).toContain('together 108');
    expect(r.sentence).toContain('the feed has 11.8 to spare');
  });
  it('B — the feed holds it: 80 supplied, shared in proportion to what each can take', () => {
    const r = analyse(split(80));
    expect(r.lanes?.heldBy).toBe('feed');
    expect(r.line).toBeCloseTo(80, 9);
    expect(r.limit?.station.name).toBe('Filler');
    const fed = r.lanes!.sections.map(x => x.fed as number);
    expect(fed[0]).toBeCloseTo((80 * 68.25) / 108.25, 9);
    expect(fed[1]).toBeCloseTo((80 * 40) / 108.25, 9);
    expect(fed[0] + fed[1]).toBeCloseTo(80, 9);
    expect(r.sentence).toContain('the feed is what limits them');
  });
  it('C — fixed shares 60/40: Line B binds at 100', () => {
    const r = analyse(split(120, { split: { rule: 'shares', shares: { a: 60, b: 40 } } }));
    expect(r.line).toBeCloseTo(100, 9);
    expect(r.lanes?.sections.map(x => x.fed)).toEqual([60, 40].map(v => expect.closeTo(v, 9)));
    expect(r.lanes?.heldBy).toBe('lanes');
    expect(r.limit?.station.name).toBe('sealer');
    expect(r.sentence).toContain('Fixed shares: Line B holds the split');
  });
  it('C2 — shares not all typed fall back to equal shares, said', () => {
    const r = analyse(split(120, { split: { rule: 'shares', shares: { a: 60 } } }));
    expect(r.line).toBeCloseTo(80, 9); // equal shares: B's 40 / 0.5
    expect(r.notes.join(' ')).toContain('shared equally');
  });
  it('D — a feed with rejects thins what reaches the lines; the whole is put back to the start of the feed', () => {
    const r = analyse(split(120, {}, { goodPct: 95 }));
    expect(r.lanes?.sends).toBeCloseTo(108.25, 9);
    expect(r.line).toBeCloseTo(108.25 / 0.95, 9);
  });
  it('E — a wrapper after the merge at 90 holds the whole', () => {
    const cap = split(120);
    cap.stations.push(m('wrapper', 90));
    const r = analyse(cap);
    expect(r.lanes?.heldBy).toBe('shared');
    expect(r.line).toBeCloseTo(90, 9);
    expect(r.limit?.station.name).toBe('wrapper');
  });
  it('F — units convert from the feed into the line: 10 bags a carton', () => {
    const cap: Capacity = {
      lanes: [{ id: 'a', name: 'Line A' }, { id: 'b', name: 'Line B' }],
      stations: [m('Filler', 150, { lane: FEED_ZONE, unit: 'bags' }),
        m('cartoner A', 12, { lane: 'a', unit: 'cartons', contains: 10 }), m('cartoner B', 6, { lane: 'b', unit: 'cartons', contains: 10 })],
    } as Capacity;
    const r = analyse(cap);
    expect(r.lanes?.sections.map(x => x.result.line)).toEqual([120, 60]); // bags a minute each line can take
    expect(r.line).toBeCloseTo(150, 9); // 150 < 120 + 60: the filler holds it
    expect(r.lanes?.heldBy).toBe('feed');
  });
  it('G — a feed that cannot be counted is said, and the lines are worked out on their own', () => {
    const r = analyse(split(120, {}, { rate: undefined }));
    expect(r.notes.join(' ')).toContain('cannot be counted yet');
    expect(r.lanes?.sections[0].result.line).toBe(68.25);
  });
  it('an old record without a feed reads as it did', () => {
    const cap = split(120);
    const old: Capacity = { ...cap, stations: cap.stations.filter(s => s.lane !== FEED_ZONE) };
    expect(analyse(old).lanes?.feed).toBeUndefined();
    expect(analyse(old).line).toBeCloseTo(108.25, 9);
  });
});
