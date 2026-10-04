import { describe, expect, it } from 'vitest';
import { isWholeDate } from '../DateInput';

describe('a date worth writing', () => {
  it('is a picked or fully typed day, or a cleared box', () => {
    expect(isWholeDate('2026-10-30')).toBe(true);
    expect(isWholeDate('1999-01-01')).toBe(true);
    expect(isWholeDate('')).toBe(true);
  });
  it('is never a year still being typed', () => {
    for (const v of ['0002-10-30', '0020-10-30', '0202-10-30', '1026-10-30']) expect(isWholeDate(v)).toBe(false);
  });
});
