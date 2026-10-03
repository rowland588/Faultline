/* The trial card's row arithmetic — the part of the drawing a test can hold. */
import { describe, it, expect } from 'vitest';
import { findingRowHeight } from '../trialCardPdf';

describe('a finding’s row on the card', () => {
  it('is one line tall when it is one line and nothing was filmed', () => {
    expect(findingRowHeight(1, 0)).toBe(19);
  });
  it('grows with the words', () => {
    expect(findingRowHeight(3, 0)).toBe(41);
  });
  /* "1 filmed" sits 24pt down the row: a one-line observation with a photo
     printed its count through the rule and into the next row. */
  it('leaves room for the filmed count under a short observation', () => {
    expect(findingRowHeight(1, 1)).toBeGreaterThanOrEqual(30);
  });
  it('does not pad a long observation that already has the room', () => {
    expect(findingRowHeight(3, 2)).toBe(41);
  });
});
