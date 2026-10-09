/* NOTHING TYPED IS LOST (lib/kept, docs/STAGEGATE.md rule 4): a form's boxes
   are kept under its own key until Save or Cancel forgets them. */
import { describe, expect, it } from 'vitest';
import { forget, hasKept, keepBox } from '../kept';

describe('what a form keeps, and when it lets go', () => {
  it('nothing is kept for a form that has not been typed in', () => {
    expect(hasKept('edit:never-typed:')).toBe(false);
  });

  it('a box typed into is kept under its form until the form forgets it', () => {
    keepBox('edit:t1:typed', { result: 'Air on, regulator missing' });
    expect(hasKept('edit:t1:')).toBe(true);
    forget('edit:t1:');
    expect(hasKept('edit:t1:')).toBe(false);
  });

  it('forget lets go of one form only — a stage\'s new problem, not the one on its part', () => {
    keepBox('problem:s1::why', 'Guard brackets the wrong size');
    keepBox('problem:s1:p9:why', 'PR-04 bag short by 8 mm');
    forget('problem:s1::');
    expect(hasKept('problem:s1::')).toBe(false);
    expect(hasKept('problem:s1:p9:')).toBe(true);
    forget('problem:s1:p9:');
  });
});
