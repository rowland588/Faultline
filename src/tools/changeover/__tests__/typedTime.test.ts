import { describe, expect, it } from 'vitest';
import { typedTime } from '../typedTime';

describe('typedTime — the ways a floor types an element\'s time', () => {
  it('reads units, the clock form and a bare number as minutes', () => {
    expect(typedTime('90 s')).toBe(90);
    expect(typedTime('90s')).toBe(90);
    expect(typedTime('1:30')).toBe(90);
    expect(typedTime('0:45')).toBe(45);
    expect(typedTime('12:05')).toBe(725);
    expect(typedTime('1:02:03')).toBe(3723);
    expect(typedTime('1.5 min')).toBe(90);
    expect(typedTime('1,5 min')).toBe(90);
    expect(typedTime('4 min')).toBe(240);
    expect(typedTime('5')).toBe(300);
    expect(typedTime('about 2 min')).toBe(120);
  });
  it('refuses what is not a time', () => {
    expect(typedTime('')).toBeUndefined();
    expect(typedTime('soon')).toBeUndefined();
    expect(typedTime('1:75')).toBeUndefined();
    expect(typedTime('4 min and some')).toBeUndefined();
    expect(typedTime('3 fortnights')).toBeUndefined();
  });
});
