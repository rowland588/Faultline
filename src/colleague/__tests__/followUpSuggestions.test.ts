import { describe, expect, it } from 'vitest';
import { followUpSuggestions } from '../followUpSuggestions';

describe('followUpSuggestions', () => {
  it('keeps gateway suggestions when present', () => {
    expect(followUpSuggestions(new Set(['list_problems']), ['Which is oldest?'], 'What is open?')).toEqual(['Which is oldest?']);
  });

  it('offers read follow-ups from steps that ran', () => {
    const s = followUpSuggestions(new Set(['list_problems']), [], 'Problems on Line 3');
    expect(s[0]).toMatch(/worst/i);
    expect(s.length).toBeLessThanOrEqual(3);
  });

  it('never duplicates suggestions', () => {
    const s = followUpSuggestions(new Set(['line_state', 'list_problems']), [], 'Line 3');
    expect(new Set(s.map(x => x.toLowerCase())).size).toBe(s.length);
  });
});