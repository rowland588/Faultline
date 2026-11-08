import { describe, expect, it } from 'vitest';
import { fieldSaid, rowSaid, whoOf } from '../problemHistory';

describe('who changed what on a problem', () => {
  it('names the person from their email, somebody with none', () => {
    expect(whoOf('sam.taylor@site.co.uk')).toBe('Sam taylor');
    expect(whoOf(null)).toBe('Somebody');
  });
  it('says each field in words', () => {
    const d = (n: number) => new Date(2026, 10, n).getTime();
    expect(fieldSaid('due_at', d(5), d(12))).toBe('changed the due day 5 Nov → 12 Nov');
    expect(fieldSaid('status', 'open', 'in_progress')).toBe('moved it To do → Doing');
    expect(fieldSaid('owner', 'Brilopak', 'Sam')).toBe('gave it to Sam (it was Brilopak)');
    expect(fieldSaid('owner', 'Sam', null)).toBe('took Sam off it');
    expect(fieldSaid('deleted_at', null, 1)).toBe('deleted it');
    expect(fieldSaid('priority', 'low', 'critical')).toBe('set the priority Low → Critical');
  });
  it('a row in one sentence — raised, or several fields together', () => {
    expect(rowSaid({ at: '', actor_email: 'jo@x.com', action: 'raised', changed: {} })).toBe('Jo raised it');
    expect(rowSaid({ at: '', actor_email: 'jo@x.com', action: 'changed', changed: { status: { from: 'open', to: 'closed' }, owner: { from: null, to: 'Kim' } } }))
      .toBe('Jo moved it To do → Done; gave it to Kim');
  });
});
