import { describe, expect, it } from 'vitest';
import { scopeWords, scopeReader, touches } from '../problemScope';
import { problemsByProgramOf } from '../programProblems';
import type { Snag } from '../../snag/types';

const names = (id: string) => (id === 'p10' ? 'Program 10' : undefined);
describe('what a problem is about', () => {
  it('says the program and the products, or every product, or a product alone, or nothing', () => {
    expect(scopeWords({ programId: 'p10', products: ['Maris Piper', 'King Edward'] }, names)).toBe('Program 10 · Maris Piper, King Edward');
    expect(scopeWords({ programId: 'p10' }, names)).toBe('Program 10 · every product');
    expect(scopeWords({ products: ['Baby'] }, names)).toBe('Baby');
    expect(scopeWords({}, names)).toBeUndefined();
    expect(scopeWords({ programId: 'gone' }, names)).toBe('a program no longer here · every product');
  });
  it('a program-wide problem touches every product it makes; a product-specific one only its own', () => {
    expect(touches({ programId: 'p10' }, 'p10', 'Maris Piper')).toBe(true);
    expect(touches({ programId: 'p10', products: ['King Edward'] }, 'p10', 'maris piper')).toBe(false);
    expect(touches({ programId: 'p10', products: ['King Edward'] }, 'p10', 'KING EDWARD')).toBe(true);
    expect(touches({ programId: 'p11' }, 'p10')).toBe(false);
    expect(scopeReader([{ id: 'p10', what: 'Program 10' }])({ programId: 'p10' })).toBe('Program 10 · every product');
  });
});
describe('the problems on a program, for paper', () => {
  const s = (o: Partial<Snag>): Snag => ({ id: 'x', workspaceId: 'w', problem: 'p', status: 'open', raisedAt: 0, updatedAt: 0, ...o } as Snag);
  it('lists open ones first and by priority, leaves out the general, the deleted and the put away', () => {
    const m = problemsByProgramOf([
      s({ id: 'a', programId: 'p10', priority: 'low' }), s({ id: 'b', programId: 'p10', priority: 'critical' }),
      s({ id: 'c', programId: 'p10', status: 'closed', priority: 'critical' }), s({ id: 'd' }),
      s({ id: 'e', programId: 'p10', deletedAt: 1 }), s({ id: 'f', programId: 'p10', archivedAt: 1 }),
    ], 0);
    expect(m.get('p10')?.map(r => r.id)).toEqual(['b', 'a', 'c']);
    expect(m.get('p10')?.[0].products).toBe('every product it makes');
  });
});
