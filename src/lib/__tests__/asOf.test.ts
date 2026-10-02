import { describe, it, expect } from 'vitest';
import { asOfWords } from '../asOf';

const H = 3_600_000, D = 24 * H;
describe('the plan says whether it is current', () => {
  const now = Date.parse('2026-10-02T09:12:00');
  it('says nothing for a device that is not signed in — nothing untrue', () => {
    expect(asOfWords(now - H, false, now)).toBeNull();
  });
  it('a sync within the day is "up to date as of" its time, not stale', () => {
    const r = asOfWords(now - 2 * H, true, now)!;
    expect(r.stale).toBe(false);
    expect(r.words).toMatch(/^Up to date as of \d\d:\d\d$/);
  });
  it('a day without a sync is stale and says how long', () => {
    expect(asOfWords(now - 26 * H, true, now)).toMatchObject({ stale: true });
    expect(asOfWords(now - 26 * H, true, now)!.words).toMatch(/^Last synced yesterday/);
    expect(asOfWords(now - 3 * D - H, true, now)!.words).toMatch(/^Last synced 3 days ago/);
  });
  it('never synced is stale and says so', () => {
    expect(asOfWords(null, true, now)).toEqual({ words: 'Not synced yet on this device', stale: true });
  });
});
