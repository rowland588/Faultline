import { describe, expect, it } from 'vitest';
import { readColleagueAsk } from '../colleagueAssist';
import { lunaWorkModelTier } from '../modelTier';

function ask(text: string, focus = 'Private customer production figures') {
  const r = readColleagueAsk({
    turns: [{ role: 'person', text, at: '09:00' }],
    focus,
    today: 'Monday',
  });
  if (!r.ok) throw new Error(r.why);
  return r.ask;
}

describe('lunaWorkModelTier', () => {
  it('simple read-only status and list questions use the read tier', () => {
    expect(lunaWorkModelTier(ask('What is open on line 7?'))).toBe('read');
    expect(lunaWorkModelTier(ask('How many open problems are there?'))).toBe('read');
    expect(lunaWorkModelTier(ask('Who owes what on line 3?'))).toBe('read');
    expect(lunaWorkModelTier(ask('List the open problems'))).toBe('read');
    expect(lunaWorkModelTier(ask("What's the status of line 2?"))).toBe('read');
  });

  it('investigation, reports, writes, jobs and analysis stay on opus', () => {
    expect(lunaWorkModelTier(ask('Review the line data.'))).toBe('opus');
    expect(lunaWorkModelTier(ask('Why did we miss target yesterday?'))).toBe('opus');
    expect(lunaWorkModelTier(ask('Find out why we missed target and put it in a report'))).toBe('opus');
    expect(lunaWorkModelTier(ask('What share of downtime was on line 2 last week?'))).toBe('opus');
    expect(lunaWorkModelTier(ask('Raise a problem on the wrapper'))).toBe('opus');
    expect(lunaWorkModelTier(ask('Make a chart of stops on line 7'))).toBe('opus');
    expect(lunaWorkModelTier(ask('What is open on line 7?', 'JOB IN HAND: Missed plan — doing step 2.'))).toBe('opus');
  });

  it('pending rounds, photos and voice stay on opus', () => {
    const base = ask('What is open on line 7?');
    expect(lunaWorkModelTier({ ...base, pending: { carry: { v: 1, rounds: [], content: [], refused: [] }, results: [] } })).toBe('opus');
    expect(lunaWorkModelTier({ ...base, images: [{ photo: 'P1', data: 'AAAA' }] })).toBe('opus');
    expect(lunaWorkModelTier({ ...base, spoken: true })).toBe('opus');
  });
});