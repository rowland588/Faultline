import { describe, it, expect } from 'vitest';
import { isIndependent, personSaid } from '../person';

describe('who Luna is talking to — the person, the capacity, the business, the role', () => {
  it('an independent consultant with a business in hand: a colleague across businesses, that business only', () => {
    const p = { name: 'Rowland', practice: 'Streamline Synergy', role: 'Administrator', own: true, clients: ['Branston', 'Cobb Foods'], client: 'Branston' };
    expect(isIndependent(p)).toBe(true);
    const s = personSaid(p);
    expect(s).toMatch(/Rowland of Streamline Synergy — an independent professional/);
    expect(s).toMatch(/not an employee/);
    expect(s).toMatch(/The business in hand now: Branston/);
    expect(s).not.toMatch(/Administrator/);
    expect(s).toMatch(/never by this line/);
  });
  it('no business in hand is their own, independent work — no business\'s records brought in', () => {
    const s = personSaid({ name: 'Rowland', practice: 'Streamline Synergy', own: true, clients: ['Branston', 'Cobb Foods'], client: '' });
    expect(s).toMatch(/No business is in hand: this may be their own, independent work/);
  });
  it('one customer and a practice of another name is still independent; a business that is its own customer is not', () => {
    expect(isIndependent({ practice: 'Streamline Synergy', own: true, clients: ['Branston'], client: 'Branston' })).toBe(true);
    expect(isIndependent({ practice: 'Branston', own: true, clients: ['Branston'], client: 'Branston' })).toBe(false);
    expect(isIndependent({ own: true, clients: ['Branston'], client: 'Branston' })).toBe(false);
  });
  it('a member of one business is said by the role its administrator gave, and never as independent', () => {
    const s = personSaid({ name: 'Sam', role: 'Team', roleIs: 'team leaders, supervisors, technicians', own: false, clients: ['Branston'], client: '' });
    expect(s).toMatch(/Sam, whose role in the business is Team \(team leaders, supervisors, technicians\)/);
    expect(s).not.toMatch(/independent/);
  });
});
