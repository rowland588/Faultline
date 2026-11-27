import { describe, expect, it } from 'vitest';
import { runLossEngine } from '../runLossEngine';
import { FIXTURE_V32_BUCKETS, FIXTURE_V32_EXPECT, FIXTURE_V32_INPUT, FIXTURE_V32_LEDGER } from '../fixtureV32';
import { formatPence } from '../money';

const byReason = (code: string) => FIXTURE_V32_LEDGER.find(r => r.reasonCode === code)?.minutes;

describe('runLossEngine §2.2 fixture', () => {
  const r = runLossEngine(FIXTURE_V32_INPUT);

  it('§2.1 buckets — planned CO 50, overrun 30, unaccounted 5', () => {
    expect(byReason('planned_co')).toBe(50);
    expect(byReason('overrun')).toBe(30);
    expect(byReason('unaccounted')).toBe(5);
    expect(FIXTURE_V32_BUCKETS.plannedChangeover).toBe(50);
    expect(FIXTURE_V32_BUCKETS.changeoverOverrun).toBe(30);
    expect(FIXTURE_V32_BUCKETS.unaccounted).toBe(5);
  });

  it('minute ledger, available time and OEE', () => {
    expect(r.sigmaMinutes).toBe(FIXTURE_V32_EXPECT.sigmaMinutes);
    expect(r.availableMinutes).toBe(FIXTURE_V32_EXPECT.availableMinutes);
    expect(r.effectiveMinutes).toBe(FIXTURE_V32_EXPECT.effectiveMinutes);
    expect(r.oee).toBe(FIXTURE_V32_EXPECT.oee);
    expect(r.shortPacks).toBe(FIXTURE_V32_EXPECT.packsLostAtIdeal);
  });

  it('money — labour and contribution never blended', () => {
    expect(r.money.idleLabourPence).toBe(FIXTURE_V32_EXPECT.idleLabourPence);
    expect(formatPence(r.money.idleLabourPence)).toBe('£577.92');
    expect(r.money.contributionPence).toBe(FIXTURE_V32_EXPECT.contributionPence);
    expect(formatPence(r.money.contributionPence!)).toBe('£714.36');
    expect(r.money.scrapPence).toBe(FIXTURE_V32_EXPECT.scrapPence);
    expect(formatPence(r.money.scrapPence!)).toBe('£56.61');
    expect(r.money.missing).toEqual([]);
  });

  it('ledger families sum to lost minutes', () => {
    const lost = r.sigmaMinutes - r.effectiveMinutes;
    const sum = Object.values(r.families).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(lost, 3);
  });
});