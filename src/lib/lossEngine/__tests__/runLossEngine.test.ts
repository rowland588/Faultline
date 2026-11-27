import { describe, expect, it } from 'vitest';
import { runLossEngine } from '../runLossEngine';
import { FIXTURE_V32_EXPECT, FIXTURE_V32_INPUT } from '../fixtureV32';
import { formatPence } from '../money';

describe('runLossEngine §2.2 fixture', () => {
  const r = runLossEngine(FIXTURE_V32_INPUT);

  it('minute ledger and OEE', () => {
    expect(r.sigmaMinutes).toBe(FIXTURE_V32_EXPECT.sigmaMinutes);
    expect(r.effectiveMinutes).toBe(FIXTURE_V32_EXPECT.effectiveMinutes);
    expect(r.oee).toBe(FIXTURE_V32_EXPECT.oee);
    expect(r.expectedPacks).toBe(48_000);
    expect(r.shortPacks).toBe(17_859);
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