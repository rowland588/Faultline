/* A number as a person types it: the comma read both ways it is meant. */
import { describe, it, expect } from 'vitest';
import { readNumber } from '../format';

describe('readNumber', () => {
  it('reads a UK thousands comma as thousands, not a decimal', () => {
    expect(readNumber('1,200')).toBe(1200);
    expect(readNumber('12,500.5')).toBe(12500.5);
    expect(readNumber('1,234,567')).toBe(1234567);
  });
  it('reads a European decimal comma as a decimal', () => {
    expect(readNumber('3,1')).toBe(3.1);
    expect(readNumber('44,75')).toBe(44.75);
    expect(readNumber(',5')).toBe(0.5);
  });
  it('reads plain numbers, spaces and signs', () => {
    expect(readNumber(' 12 ')).toBe(12);
    expect(readNumber('-4.5')).toBe(-4.5);
    expect(readNumber('1 200')).toBe(1200);
  });
  it('refuses what is not a number rather than storing 0 or NaN', () => {
    expect(readNumber('')).toBeUndefined();
    expect(readNumber('abc')).toBeUndefined();
    expect(readNumber('1,2,3')).toBeUndefined();
  });
});
