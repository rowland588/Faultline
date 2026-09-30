import { describe, expect, it } from 'vitest';
import { fixTone } from '../screens/FixesScreen';
import type { Test } from '../lib/testing';

const TODAY = '2026-09-30';
const fix = (p: Partial<Test>): Test => ({ id: 'f', projectId: 'p', kind: 'fix', title: 'Send the regulator', outcome: 'planned', sort: 0, createdAt: 0, updatedAt: 0, ...p });

describe('the colour a fix wears', () => {
  it('done is green', () => expect(fixTone(fix({ outcome: 'passed', ranOn: '2026-09-29' }), TODAY).tone).toBe('done'));
  it('past its last day is red', () => expect(fixTone(fix({ plannedFor: '2026-09-28' }), TODAY)).toMatchObject({ tone: 'late' }));
  it('tried and did not fix it is red', () => expect(fixTone(fix({ outcome: 'failed', ranOn: '2026-09-29' }), TODAY).tone).toBe('late'));
  it('due today, tomorrow or within three days is amber', () => {
    expect(fixTone(fix({ plannedFor: TODAY }), TODAY)).toEqual({ tone: 'soon', when: 'Due today' });
    expect(fixTone(fix({ plannedFor: '2026-10-01' }), TODAY)).toEqual({ tone: 'soon', when: 'Due tomorrow' });
    expect(fixTone(fix({ plannedFor: '2026-10-03' }), TODAY).tone).toBe('soon');
  });
  it('further off, or with no date, is blue', () => {
    expect(fixTone(fix({ plannedFor: '2026-10-04' }), TODAY).tone).toBe('ahead');
    expect(fixTone(fix({}), TODAY)).toEqual({ tone: 'ahead', when: 'No date yet' });
  });
  it('a block of days is judged on its last day', () => {
    expect(fixTone(fix({ plannedFor: '2026-09-25', plannedTo: '2026-10-02' }), TODAY).tone).toBe('soon');
  });
});
