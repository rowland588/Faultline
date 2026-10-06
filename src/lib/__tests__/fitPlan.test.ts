import { describe, it, expect } from 'vitest';
import { fitPlan, CLOUD_FILE_LIMIT } from '../transcode';

/* Rowland's four films: 55, 91, 100 and 345 MB off a phone's camera roll.
   Each is re-made under the cloud's 50 MB, at a rate its length allows. */
const bytesAt = (p: { videoBps: number; audioBps: number }, s: number) => ((p.videoBps + p.audioBps) * s) / 8;

describe('fitPlan — how small a film has to be made to reach the cloud', () => {
  it('a short 4K clip keeps the app recorder’s own rate and comes down to 720p', () => {
    const p = fitPlan(90, 3840, 2160, CLOUD_FILE_LIMIT)!;
    expect(p.videoBps).toBe(1_500_000);
    expect([p.width, p.height]).toEqual([1280, 720]);
    expect(bytesAt(p, 90)).toBeLessThan(CLOUD_FILE_LIMIT);
  });

  it('a long walk gets a lower rate and still lands under the limit', () => {
    const p = fitPlan(8 * 60, 1920, 1080, CLOUD_FILE_LIMIT)!;
    expect(p.videoBps).toBeLessThan(1_500_000);
    expect(bytesAt(p, 8 * 60)).toBeLessThan(CLOUD_FILE_LIMIT * 0.86);
  });

  it('drops to 480p when the rate is too low for 720p to be worth it', () => {
    const p = fitPlan(15 * 60, 1920, 1080, CLOUD_FILE_LIMIT)!;
    expect(p.videoBps).toBeLessThan(800_000);
    expect(Math.max(p.width, p.height)).toBe(854);
  });

  it('keeps a portrait film portrait, in even numbers', () => {
    const p = fitPlan(60, 1080, 1920, CLOUD_FILE_LIMIT)!;
    expect(p.height).toBe(1280);
    expect(p.width % 2).toBe(0);
    expect(p.width).toBeLessThan(p.height);
  });

  it('never makes a small film bigger', () => {
    const p = fitPlan(60, 640, 360, CLOUD_FILE_LIMIT)!;
    expect([p.width, p.height]).toEqual([640, 360]);
  });

  it('says no when even the lowest rate cannot fit, or the length is unknown', () => {
    expect(fitPlan(60 * 60, 1920, 1080, CLOUD_FILE_LIMIT)).toBeNull();
    expect(fitPlan(Infinity, 1920, 1080, CLOUD_FILE_LIMIT)).toBeNull();
    expect(fitPlan(0, 1920, 1080, CLOUD_FILE_LIMIT)).toBeNull();
  });
});
