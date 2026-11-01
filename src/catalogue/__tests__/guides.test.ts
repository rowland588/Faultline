/* EVERY TOOL SAYS WHAT EACH STEP MEANS (src/catalogue/guide.ts — Rowland, 1 November 2026: "all tools must have user guidance ..
 * what's each step means"). A guide is written in the page's own labels, in the order a person meets them; this holds the
 * shape of every one, that each number is written once, that every available or part-built tool has one (or its parent's) or is
 * on the list of tools not yet written — a list that only shrinks — and that the list is honest both ways. */
import { describe, expect, it } from 'vitest';
import { ENTRIES, entryById } from '../index';
import { GUIDES, GUIDE_FILES, guideFor, ownGuide, modeGuides, stepCount } from '../guide';
import { GUIDE_EXEMPT } from '../guides/exempt';

const live = ENTRIES.filter(e => e.status === 'available' || e.status === 'partial');

describe('the guides', () => {
  it('belong to catalogue entries that exist, and each number is written in one file', () => {
    expect(Object.keys(GUIDES).filter(id => !entryById(id))).toEqual([]);
    expect(Object.entries(GUIDE_FILES).filter(([, files]) => files.length > 1).map(([id]) => id)).toEqual([]);
  });

  for (const [id, g] of Object.entries(GUIDES)) {
    describe(`${id} ${entryById(id)?.name ?? ''}`, () => {
      it('has two to nine steps, each said three ways', () => {
        expect(g.steps.length).toBeGreaterThanOrEqual(2);
        expect(g.steps.length).toBeLessThanOrEqual(9);
        for (const s of g.steps) {
          expect(s.step.trim().length, `${id} step name`).toBeGreaterThanOrEqual(3);
          expect(s.means.length, `${id} “${s.step}” means`).toBeGreaterThanOrEqual(40);
          expect(s.doThis.length, `${id} “${s.step}” doThis`).toBeGreaterThanOrEqual(30);
          expect(s.youGet.length, `${id} “${s.step}” youGet`).toBeGreaterThanOrEqual(15);
        }
        expect(new Set(g.steps.map(s => s.step)).size, `${id} names its steps once each`).toBe(g.steps.length);
      });
      it('says no placeholder and none of the old words', () => {
        const all = JSON.stringify(g);
        expect(/\b(TODO|TBD|lorem)\b/i.test(all)).toBe(false);
        expect(/\bsnags?\b|\bOEE\b|\bGM\b/i.test(all)).toBe(false);
      });
    });
  }

  it('every available or part-built tool has a guide of its own or its parent’s, or is on the list of those not yet written', () => {
    const without = live.filter(e => !guideFor(e.id, ENTRIES)).map(e => e.id).sort();
    expect(without).toEqual([...GUIDE_EXEMPT].sort());
  });

  it('the list of tools not yet written holds only tools that exist, are built, and have no guide', () => {
    for (const id of GUIDE_EXEMPT) {
      const e = entryById(id);
      expect(e, `${id} is in the catalogue`).toBeTruthy();
      expect(e && (e.status === 'available' || e.status === 'partial'), `${id} is built`).toBe(true);
      expect(guideFor(id, ENTRIES), `${id} has a guide, so it leaves the list (node scripts/guides-exempt.mjs)`).toBeUndefined();
    }
    expect(new Set(GUIDE_EXEMPT).size).toBe(GUIDE_EXEMPT.length);
  });

  it('finds a tool’s own guide, a mode’s parent, and the modes that carry their own', () => {
    expect(ownGuide('fc-094')).toBe(GUIDES['FC-094']);
    expect(guideFor('FC-083', ENTRIES)?.from).toBe('FC-094');
    expect(modeGuides('FC-094', ENTRIES).every(m => entryById(m.id)?.partOf === 'FC-094')).toBe(true);
    expect(stepCount(GUIDES['FC-094'])).toBe('6 steps');
  });
});
