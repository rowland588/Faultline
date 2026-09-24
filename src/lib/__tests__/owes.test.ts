import { describe, it, expect } from 'vitest';
import { whoOwes, type Debt } from '../owes';

const TODAY = '2026-09-24';
const day = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${Number(d)} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'][Number(m) - 1]}`;
};
const owes = (debts: Debt[], suppliers = ['Ilapak UK', 'Ishida Europe']) =>
  whoOwes(debts, { suppliers, today: TODAY, day });
const debt = (o: Partial<Debt>): Debt => ({ who: 'Ilapak UK', what: 'Run it', about: 'Changeover', late: false, ...o });

describe('who owes what, by when', () => {
  it('puts each debt under the party that owes it', () => {
    const o = owes([
      debt({ who: 'Ilapak UK', what: 'Run it', about: 'Changeover', on: '2026-09-29' }),
      debt({ who: 'Ishida Europe', what: 'Replace the reject valve', about: 'Reject confirmation', on: '2026-09-22', late: true }),
    ]);
    expect(o.parties.map(p => p.who)).toEqual(['Ishida Europe', 'Ilapak UK']);
    expect(o.parties[0].lines[0]).toMatchObject({ what: 'Replace the reject valve', when: 'WAS 22 Sept', tone: 'late' });
    expect(o.parties[1].lines[0]).toMatchObject({ when: 'by 29 Sept', tone: 'due' });
  });

  /* "Dave re-tracking the film" is the site's work with Dave's name on it —
     not a company of its own sitting beside Ilapak on the client's page. */
  it('files a person who is not a supplier under the site, and keeps their name', () => {
    const o = owes([debt({ who: 'Dave', what: 'Re-track the film', about: 'Seal integrity', on: '2026-09-25' })]);
    expect(o.parties).toHaveLength(1);
    expect(o.parties[0]).toMatchObject({ who: 'The site', kind: 'site' });
    expect(o.parties[0].lines[0].person).toBe('Dave');
  });

  it('files "the site" under the site, with no person', () => {
    const o = owes([debt({ who: 'the site', what: 'Say whether it passed', about: 'Line rate', on: '2026-09-21', since: true })]);
    expect(o.parties[0]).toMatchObject({ who: 'The site', kind: 'site' });
    expect(o.parties[0].lines[0]).toMatchObject({ when: 'since 21 Sept', tone: 'since', person: undefined });
  });

  it('matches a supplier whatever the case it was typed in', () => {
    const o = owes([debt({ who: 'ilapak uk' })]);
    expect(o.parties[0]).toMatchObject({ who: 'Ilapak UK', kind: 'oem' });
  });

  /* A debt nobody owns is the thing most worth putting in front of both sides. */
  it('gives what nobody owns a block of its own', () => {
    const o = owes([debt({ who: '', what: 'Get it on site', about: 'Domino coder' })]);
    expect(o.parties[0]).toMatchObject({ who: 'Nobody named yet', kind: 'nobody' });
    expect(o.parties[0].lines[0]).toMatchObject({ when: 'no date agreed', tone: 'none' });
  });

  it('orders the suppliers first, furthest behind leading, then nobody, then the site', () => {
    const o = owes([
      debt({ who: 'the site', what: 'Decide', about: 'x' }),
      debt({ who: '', what: 'Own it', about: 'y' }),
      debt({ who: 'Ilapak UK', what: 'A', about: 'a', on: '2026-09-30' }),
      debt({ who: 'Ishida Europe', what: 'B', about: 'b', on: '2026-09-20', late: true }),
    ]);
    expect(o.parties.map(p => p.kind + ':' + p.who)).toEqual([
      'oem:Ishida Europe', 'oem:Ilapak UK', 'nobody:Nobody named yet', 'site:The site',
    ]);
  });

  it('lists a party’s late debts first, then by date, then what has no date', () => {
    const o = owes([
      debt({ what: 'No date', about: 'a' }),
      debt({ what: 'Later', about: 'b', on: '2026-10-10' }),
      debt({ what: 'Sooner', about: 'c', on: '2026-09-28' }),
      debt({ what: 'Late', about: 'd', on: '2026-09-18', late: true }),
    ]);
    expect(o.parties[0].lines.map(l => l.what)).toEqual(['Late', 'Sooner', 'Later', 'No date']);
  });

  /* A booked re-test is also the next step agreed off the test before it. */
  /* "Run it" in bold told the reader nothing until they read the grey line. */
  it('leads with the test’s name when what is owed is just to run it', () => {
    const o = owes([debt({ what: 'Run it', about: 'Changeover 2kg to 1.25kg', on: '2026-09-18', late: true })]);
    expect(o.parties[0].lines[0]).toMatchObject({ what: 'Changeover 2kg to 1.25kg', about: 'to run' });
  });

  it('says the same debt once', () => {
    const o = owes([debt({ what: 'Re-test', about: 'Seal' }), debt({ what: 'Re-test', about: 'Seal' })]);
    expect(o.parties[0].lines).toHaveLength(1);
  });

  describe('what we need before the next report', () => {
    it('asks for a new date on what is late, and a date on what has none', () => {
      const o = owes([
        debt({ what: 'Run it', about: 'Changeover', on: '2026-09-18', late: true }),
        debt({ what: 'Send the kit list', about: 'Changeover', on: undefined }),
      ]);
      expect(o.parties[0].ask).toBe(
        'Before the next report: A new date for changeover. A date for send the kit list.');
    });

    it('includes what falls due inside a week, and leaves out what is further off', () => {
      const o = owes([
        debt({ what: 'Seal re-test', about: 'Seal integrity', on: '2026-09-29' }),
        debt({ what: 'Full run', about: 'Line rate', on: '2026-10-20' }),
      ]);
      expect(o.parties[0].ask).toBe('Before the next report: Due this week: seal re-test (29 Sept).');
    });

    it('says so when nothing is needed', () => {
      const o = owes([debt({ what: 'Full run', about: 'Line rate', on: '2026-10-20' })]);
      expect(o.parties[0].ask).toBe('Nothing is needed before the next report.');
    });

    it('names four at most and counts the rest', () => {
      const o = owes(['Aa', 'Bb', 'Cc', 'Dd', 'Ee'].map(w => debt({ what: w, about: 'x', on: '2026-09-10', late: true })));
      expect(o.parties[0].ask).toBe('Before the next report: New dates for aa, bb, cc and dd. And 1 more.');
    });

    it('says what a machine, a verdict and a decision are waiting on in words', () => {
      const o = owes([
        debt({ who: 'the site', what: 'Say whether it passed', about: 'Line rate', on: '2026-09-21', since: true }),
        debt({ who: 'the site', what: 'Decide on 3 observations', about: 'Seal integrity', on: '2026-09-21', since: true }),
        debt({ who: 'the site', what: 'Get it running', about: 'Checkweigher' }),
      ]);
      expect(o.parties[0].ask).toBe('Before the next report: A date for Checkweigher running. '
        + 'Still to call: 3 observations from Seal integrity and the verdict on Line rate.');
    });
  });

  it('sums up the page in one line', () => {
    const o = owes([
      debt({ who: 'Ilapak UK', what: 'A', about: 'a', on: '2026-09-18', late: true }),
      debt({ who: 'Ilapak UK', what: 'B', about: 'b', on: '2026-09-30' }),
      debt({ who: 'the site', what: 'C', about: 'c' }),
    ]);
    expect(o.says).toBe('Ilapak UK 2 · the site 1 — 1 past the day');
  });

  it('says nothing is owed when nothing is', () => {
    expect(owes([]).says).toBe('nothing owed by anybody');
  });
});
