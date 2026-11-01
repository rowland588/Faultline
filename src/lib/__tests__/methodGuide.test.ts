/* EVERY STEP OF EVERY METHOD SAYS WHAT IT MEANS (src/lib/methodGuide.ts — Rowland, 1 November 2026). */
import { describe, it, expect } from 'vitest';
import { METHODS } from '../methods';
import { METHOD_GUIDE, guideOfSection } from '../methodGuide';

describe('the method guides', () => {
  it('cover all eight methods, and only them', () => {
    expect(Object.keys(METHOD_GUIDE).sort()).toEqual(METHODS.map(m => m.key).sort());
  });

  for (const m of METHODS) {
    describe(m.name, () => {
      const g = METHOD_GUIDE[m.key];
      it('says when to use it, when not to, and gives an example', () => {
        expect(g.whenToUse.length).toBeGreaterThanOrEqual(50);
        expect(g.notFor.length).toBeGreaterThanOrEqual(30);
        expect(g.example.length).toBeGreaterThanOrEqual(50);
      });
      it('has one guide for each section, in the order of the method, named exactly', () => {
        expect(g.sections.map(s => s.section)).toEqual(m.sections.map(s => s.name));
      });
      for (const s of g.sections) {
        it(`“${s.section}” says what it means, what to do and what you get`, () => {
          expect(s.means.length, 'means').toBeGreaterThanOrEqual(50);
          expect(s.doThis.length, 'doThis').toBeGreaterThanOrEqual(40);
          expect(s.youGet.length, 'youGet').toBeGreaterThanOrEqual(20);
          expect(/\b(TODO|TBD|lorem)\b/i.test(s.means + s.doThis + s.youGet)).toBe(false);
          expect(guideOfSection(m.key, s.section)).toBe(s);
        });
      }
    });
  }

  it('never says a job, a snag or OEE, and says client for the person reported to', () => {
    const all = JSON.stringify(METHOD_GUIDE);
    expect(/\bjobs?\b|\bsnags?\b|\bOEE\b|\bGM\b/i.test(all)).toBe(false);
  });
});
