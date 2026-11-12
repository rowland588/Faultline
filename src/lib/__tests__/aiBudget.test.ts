import { describe, it, expect, vi } from 'vitest';

vi.mock('../../cloud/client', () => ({ supabase: null }));
import { budgetSaid, budgetState, leftShare } from '../aiBudget';

describe('the month\'s AI budget, said', () => {
  const b = (spent: number, over = false) => ({ limitMicros: 25_000_000, spentMicros: spent, over, resets: '2026-12-01' });
  it('says what is left in pounds (about) and dollars, and when it comes back', () => {
    expect(budgetSaid(b(2_640_000))).toBe('About £17.66 left of £19.75 this month ($22.36 of $25.00). It comes back on 1 December.');
    expect(leftShare(b(2_640_000))).toBeCloseTo(0.8944, 3);
    expect(budgetState(b(2_640_000))).toBe('g');
  });
  it('amber under a quarter left, red and said when spent', () => {
    expect(budgetState(b(20_000_000))).toBe('a');
    expect(budgetState(b(25_000_000, true))).toBe('r');
    expect(budgetSaid(b(25_000_000, true))).toBe('This month\'s AI budget is spent (about £19.75, $25.00). It comes back on 1 December. Everything by hand works meanwhile.');
  });
});
