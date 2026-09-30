/* ONE COMPANY, ONE NAME — from Rowland's own job, where the same supplier is
   typed Brillopak, Brilopak and Brillopak and "who owes what" showed three. */
import { describe, it, expect } from 'vitest';
import { companies, nameKey, resolver, sameName } from '../names';

describe('what counts as the same company', () => {
  it('ignores case, punctuation and doubled letters', () => {
    expect(sameName('Brillopak', 'Brilopak')).toBe(true);
    expect(sameName('ILAPAK UK', 'ilapak uk')).toBe(true);
    expect(sameName('Ilapak U.K.', 'Ilapak UK')).toBe(true);
    expect(nameKey('Brillopak')).toBe('brilopak');
  });

  it('allows one wrong letter in a name long enough that it cannot be another company', () => {
    expect(sameName('Brilopack', 'Brilopak')).toBe(true);
    expect(sameName('Ishida Europe', 'Ishida Eurpe')).toBe(true);
  });

  it('leaves short names, and names further apart, alone', () => {
    expect(sameName('Loma', 'Lomas')).toBe(false);
    expect(sameName('Ilapak UK', 'Ilapak')).toBe(false);
    expect(sameName('Multivac', 'Ishida')).toBe(false);
    expect(sameName('', 'Loma')).toBe(false);
  });
});

describe('grouping what was typed', () => {
  const typed = ['Brilopak', 'Brilopak', 'Brilopak', 'Brillopak', 'Brillopak', 'Ilapak UK', 'ilapak uk', 'Ilapak UK', '  ', undefined];
  const cs = companies(typed);

  it('makes one company of the spellings that are one, and counts each spelling', () => {
    expect(cs.map(c => c.name)).toEqual(['Brilopak', 'Ilapak UK']);
    expect(cs[0].spellings).toEqual([{ name: 'Brilopak', n: 3 }, { name: 'Brillopak', n: 2 }]);
  });

  it('shows it as the spelling most often typed, and case alone is not a second spelling', () => {
    expect(cs[1].spellings).toEqual([{ name: 'Ilapak UK', n: 3 }]);
  });

  it('does not treat a blank as a company', () => {
    expect(cs.flatMap(c => c.spellings.map(s => s.name))).not.toContain('');
  });

  it('turns any spelling into the one it is shown as', () => {
    const res = resolver(typed);
    expect(res('Brillopak')).toBe('Brilopak');
    expect(res('  ILAPAK uk ')).toBe('Ilapak UK');
    expect(res('Dave')).toBe('Dave');
    expect(res(undefined)).toBe('');
  });
});
