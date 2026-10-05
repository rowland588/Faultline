/* The tools inside a workspace: the numbers their boxes accept. Each case
 * here was a defect found by using the screen.
 *
 * (The cases for "the step above a workspace screen" — where the spine's Back
 * landed from a walk or a study — went with the spine. The rail (ui/Frame)
 * shows the line and its four study screens at once, so there is no one
 * step above to get right; ui/__tests__/rail.test.ts covers what the rail
 * draws instead.) */
import { describe, expect, it } from 'vitest';
import { studyTarget } from '../proof';

describe('the samples a study asks for', () => {
  it('takes twelve when twelve is typed — the box used to turn the 1 into 3, then 32', () => {
    expect(studyTarget('1', 8)).toBe(3);   // mid-typing is clamped only when used
    expect(studyTarget('12', 8)).toBe(12);
  });
  it('clamps to 3–50 and falls back to the suggestion on an empty or nonsense box', () => {
    expect(studyTarget('200', 8)).toBe(50);
    expect(studyTarget('', 8)).toBe(8);
    expect(studyTarget(null, 8)).toBe(8);
    expect(studyTarget('abc', 8)).toBe(8);
    expect(studyTarget('7.4', 20)).toBe(7);
  });
});
