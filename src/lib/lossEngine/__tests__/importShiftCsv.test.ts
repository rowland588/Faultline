import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseLossShiftCsv } from '../importShiftCsv';
import { runLossEngine } from '../runLossEngine';
import { FIXTURE_V32_EXPECT, FIXTURE_V32_INPUT } from '../fixtureV32';

const fixtureCsv = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../scripts/fixtures/loss-engine-v32-shift.csv'), 'utf8');

describe('loss engine CSV import', () => {
  it('parses §2.2 fixture and runs to the same money and OEE', () => {
    const p = parseLossShiftCsv(fixtureCsv);
    expect(p.refused).toEqual([]);
    expect(p.facts.sigmaMinutes).toBe(480);
    expect(p.facts.breaksMinutes).toBe(30);
    expect(p.facts.plannedCoMinutes).toBe(50);
    expect(p.facts.goodPacks).toBe(10_047);
    expect(p.facts.rejectPacks).toBe(153);
    expect(p.facts.ratePerMin).toBe(40);
    expect(p.ledger.length).toBe(9);
    const overrun = p.ledger.find(r => r.reasonCode === 'overrun');
    expect(overrun?.minutes).toBe(30);
    expect(p.ledger.find(r => r.reasonCode === 'unaccounted')?.minutes).toBe(5);
    const r = runLossEngine({
      sigmaMinutes: p.facts.sigmaMinutes,
      goodPacks: p.facts.goodPacks,
      rejectPacks: p.facts.rejectPacks,
      economics: { ...FIXTURE_V32_INPUT.economics, ratePerMin: p.facts.ratePerMin ?? FIXTURE_V32_INPUT.economics.ratePerMin },
      ledger: p.ledger,
      structure: {
        breaksMinutes: p.facts.breaksMinutes,
        plannedChangeoverMinutes: p.facts.plannedCoMinutes,
        plannedCleanMinutes: p.facts.plannedCleanMinutes,
      },
    });
    expect(r.oee).toBe(FIXTURE_V32_EXPECT.oee);
    expect(r.money.idleLabourPence).toBe(FIXTURE_V32_EXPECT.idleLabourPence);
    expect(r.money.contributionPence).toBe(FIXTURE_V32_EXPECT.contributionPence);
    expect(r.money.scrapPence).toBe(FIXTURE_V32_EXPECT.scrapPence);
  });
});