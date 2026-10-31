/* FC-128 — the cost of poor quality's arithmetic, against the independent cases in scripts/knowledge/cases-calc.py (Q1–Q3):
 * the record's week (quality.copq: 1,800 · 3,200 · 9,400 · 2,600, 5.5% of sales, failure 71%) worked by hand, never against itself. */
import { describe, expect, it } from 'vitest';
import { BUCKETS, COPQ_WORKED, SAY, copq } from '../copq';

const tot = (r: ReturnType<typeof copq>, b: string) => r.buckets.find(x => x.bucket === b)?.total;

describe('the four buckets (Q1: the record’s week)', () => {
  const r = copq(COPQ_WORKED);
  it('sums each bucket from its items', () => {
    expect(tot(r, 'prevention')).toBe(1800);
    expect(tot(r, 'appraisal')).toBe(3200);
    expect(tot(r, 'internal')).toBe(9400);
    expect(tot(r, 'external')).toBe(2600);
    expect(r.total).toBe(17000);
    expect(r.poor).toBe(12000);
    expect(r.spent).toBe(5000);
  });
  it('says the shares: 5.5% of sales all in, 3.9% poor quality, failure 71% of the cost of quality', () => {
    expect(Math.round((r.totalOfSales as number) * 1000) / 10).toBe(5.5);
    expect(Math.round((r.poorOfSales as number) * 1000) / 10).toBe(3.9);
    expect(Math.round((r.failureShare as number) * 100)).toBe(71);
    expect(r.poorPerPack).toBeCloseTo(12000 / 155000, 12);
  });
  it('ranks the failure: give-away 4,100, rework 2,800, scrap 1,700 — and the ranked items add to the failure', () => {
    expect(r.ranked.slice(0, 3).map(x => [x.item.id, x.item.amount])).toEqual([['giveaway', 4100], ['reworkPacks', 2800], ['scrapPacks', 1700]]);
    expect(r.ranked.reduce((n, x) => n + (x.item.amount as number), 0)).toBe(12000);
    expect(r.ranked.reduce((n, x) => n + x.share, 0)).toBeCloseTo(1, 12);
    expect(r.ranked.every(x => !x.item.bucket.startsWith('prev') && x.item.bucket !== 'appraisal')).toBe(true);
  });
  it('misses nothing, so names nothing but the shares of the buckets’ shares', () => {
    expect(r.missing).toEqual([]);
    expect(r.unpricedCount).toBe(0);
    expect(r.buckets.map(b => b.share ?? 0).reduce((n, x) => n + x, 0)).toBeCloseTo(1, 12);
  });
});

describe('Q2: a later week with a quality stop typed and no sales', () => {
  const r = copq({ rate: 15, materials: 0.5, reworkCost: 1.4, complaintCost: 80, prevHours: 120, prevOther: 600, apprHours: 160, apprSamples: 1000, apprOther: 300,
    scrapPacks: 2000, reworkPacks: 1500, giveaway: 2400, holds: 500, stops: 300, complaints: 12, credits: 400 });
  it('adds up', () => {
    expect([tot(r, 'prevention'), tot(r, 'appraisal'), tot(r, 'internal'), tot(r, 'external'), r.total, r.poor]).toEqual([2400, 3200, 6300, 1360, 13260, 7660]);
  });
  it('names the sales and the packs it was not given, and says nothing of a share', () => {
    expect(r.missing).toContain(SAY.sales);
    expect(r.missing).toContain(SAY.packsMade);
    expect(r.poorOfSales).toBeUndefined();
    expect(r.poorPerPack).toBeUndefined();
  });
});

describe('Q3: counted but not priced', () => {
  const r = copq({ materials: 0.5, scrapPacks: 1200, giveaway: 350, complaints: 4 });
  it('prices what it can and names what it cannot — never a figure invented', () => {
    expect(tot(r, 'internal')).toBe(950);
    expect(tot(r, 'external')).toBeUndefined();
    expect(r.buckets.find(b => b.bucket === 'external')).toMatchObject({ given: true, unpriced: 1 });
    expect(r.unpricedCount).toBe(1);
    expect(r.missing).toContain(SAY.complaintCost);
    expect(r.missing).toContain(SAY.bucket('prevention'));
    expect(r.missing).toContain(SAY.bucket('appraisal'));
    expect(r.missing).not.toContain(SAY.bucket('external'));
    expect(r.items.find(i => i.id === 'complaints')?.amount).toBeUndefined();
  });
});

describe('the edges', () => {
  it('nothing given prices nothing', () => {
    const r = copq({});
    expect(r.priced).toBe(false);
    expect(r.total).toBe(0);
    expect(r.items).toEqual([]);
    expect(BUCKETS.every(b => r.missing.includes(SAY.bucket(b)))).toBe(true);
  });
  it('hours without a wage are counted, not priced; with a wage they are hours × wage', () => {
    expect(copq({ apprHours: 10 }).priced).toBe(false);
    expect(copq({ apprHours: 10 }).missing).toContain(SAY.rate);
    expect(copq({ apprHours: 10, rate: 14.7 }).total).toBeCloseTo(147, 9);
  });
  it('a typed zero is a priced zero, not a missing figure; a negative or non-number is ignored', () => {
    expect(copq({ giveaway: 0 }).priced).toBe(true);
    expect(copq({ giveaway: -5, holds: Number.NaN }).priced).toBe(false);
  });
  it('a failure free week has no failure share to rank', () => {
    const r = copq({ prevOther: 500 });
    expect(r.poor).toBe(0);
    expect(r.ranked).toEqual([]);
    expect(r.failureShare).toBe(0);
  });
});
