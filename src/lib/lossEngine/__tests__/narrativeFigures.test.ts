import { describe, expect, it } from 'vitest';
import { runLossEngine } from '../runLossEngine';
import { FIXTURE_V32_INPUT } from '../fixtureV32';
import { narrativeFigurePool } from '../narrativeFigures';
import { numbersIn } from '../../../colleague/figureCheck';
import { immediateLossSays } from '../reportSays';

describe('loss narrative figures', () => {
  const report = runLossEngine(FIXTURE_V32_INPUT);
  const pool = narrativeFigurePool(report);
  const said = immediateLossSays(report);

  it('includes §2.2 headline numbers', () => {
    expect(pool).toContain(480);
    expect(pool).toContain(report.oee);
    expect(pool.some(n => Math.abs(n - 577.92) < 0.02)).toBe(true);
  });

  it('every number in the fixed narrative is in the pool', () => {
    const text = [said.headline, ...said.lines].join(' ');
    for (const n of numbersIn(text)) {
      const found = pool.some(p => Math.abs(p - n) < 0.015 || Math.abs(p * 100 - n) < 1);
      expect(found, `missing ${n} in pool`).toBe(true);
    }
  });
});