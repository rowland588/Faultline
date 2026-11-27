import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { looksLikeLossShiftFile, probeLossShift } from '../detectShift';

describe('detectLossShift', () => {
    const csv = readFileSync(join(__dirname, '../../../../scripts/fixtures/loss-engine-v32-shift.csv'), 'utf8');

  it('recognises the §2.2 fixture', () => {
    expect(looksLikeLossShiftFile('shift.csv', csv)).toBe(true);
    expect(probeLossShift(csv).ok).toBe(true);
  });

  it('rejects a generic downtime table', () => {
    const t = 'reason,minutes\nJam,12\n';
    expect(looksLikeLossShiftFile('downtime.csv', t)).toBe(false);
  });
});