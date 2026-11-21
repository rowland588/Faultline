/* Found by the words a person types (lib/findWords; CLAUDE.md "Found by its name", 21 November). */
import { describe, expect, it } from 'vitest';
import { matches, wordsOf } from '../findWords';
import { FINDS, PLACES, placeWords } from '../../ui/everythingPlaces';

const CUSTOMERS = placeWords(PLACES.find(p => p.key === 'customers') as (typeof PLACES)[number]);

describe('a search is matched word by word', () => {
  it('every word that carries meaning must be there, in any order; the frame of a question is not asked for', () => {
    expect(wordsOf('How do I archive a client?')).toEqual(['archive', 'client']);
    expect(matches(CUSTOMERS, 'archive client')).toBe(true);
    expect(matches(CUSTOMERS, 'client archive')).toBe(true);
    expect(matches(CUSTOMERS, 'how do I archive a client')).toBe(true);
    expect(matches(CUSTOMERS, 'archive')).toBe(true);
    expect(matches(CUSTOMERS, 'archive line 7')).toBe(false);
    expect(matches('Line 7 — smoke test Packing hall', 'smoke line')).toBe(true);
    expect(matches('Line 7 — smoke test Packing hall', 'line 8')).toBe(false);
  });
  it('a plural, an -ing and an -ed are the word they come from', () => {
    expect(matches(CUSTOMERS, 'customers')).toBe(true);
    expect(matches(CUSTOMERS, 'archiving a customer')).toBe(true);
    expect(matches(CUSTOMERS, 'archived clients')).toBe(true);
  });
  it('little words alone, or nothing, ask for everything', () => {
    expect(matches('anything', '')).toBe(true);
    expect(matches('anything', 'how do I')).toBe(true);
  });
});

describe('every everyday job is found by the words a person would type', () => {
  const found = (q: string): string[] => [...PLACES, ...FINDS].filter(p => matches(placeWords(p), q)).map(p => p.key);
  const jobs: [string, string][] = [
    ['archive client', 'customers'], ['archive a customer', 'customers'], ['bring a customer back', 'customers'], ['unarchive', 'customers'], ['add a customer', 'customers'], ['new client', 'customers'],
    ['add a line', 'setup'], ['add machine', 'setup'], ['new area', 'setup'], ['rename a line', 'setup'],
    ['raise a problem', 'problems'], ['who owes what', 'actions'], ['late actions', 'actions'],
    ['reports', 'library'], ['download a pdf', 'library'],
    ['connect a file', 'connections'], ['sharepoint', 'connections'], ['excel', 'connections'],
    ['start a project', 'projects'], ['capability study', 'tools'],
    ['invite someone', 'people'], ['roles', 'people'],
    ['my templates', 'templates'],
    ['update the app', 'account'], ['sign out', 'account'], ['logo', 'account'], ['backup', 'account'],
  ];
  it.each(jobs)('“%s” finds %s', (q, key) => { expect(found(q)).toContain(key); });
  it('the places shown before anything is typed are the ten they were — what is only found by typing is not among them', () => {
    expect(PLACES.map(p => p.key)).toEqual(['story', 'machines', 'projects', 'problems', 'actions', 'tools', 'library', 'setup', 'customers', 'connections']);
    expect(FINDS.map(p => p.key)).toEqual(['people', 'templates', 'account']);
  });
});
