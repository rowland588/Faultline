/**
 * The drawn fishbone's layout and words (ui/fishbone/layout.ts) and what the
 * cause sheet saves (ui/CauseSheet.tsx).
 *
 * The layout is the part a screenshot cannot keep honest across every size:
 * a mark printed over another mark, a rib that runs past the bone before it,
 * or a cause that silently never gets drawn would all look fine on the one
 * fixture somebody happened to open.
 */
import { describe, it, expect } from 'vitest';
import { boneWords, layoutFish, lossWords, orderItems, overlaps } from '../fishbone/layout';
import { tidyCause } from '../CauseSheet';
import { SIXM, type Cause, type CauseStatus, type SixM } from '../../lib/sixm';
import type { Bone, Suggestion } from '../../lib/problems';

let n = 0;
const cause = (m: SixM, status: CauseStatus = 'suspected', more: Partial<Cause> = {}): Cause =>
  ({ id: `c${++n}`, m, text: `Cause ${n}`, grade: 'observed', status, whys: [], at: 0, ...more });
const sugg = (m: SixM, minutesWeek?: number): Suggestion =>
  ({ key: `s${++n}`, m, text: `Suggestion ${n}`, grade: 'measured', source: { kind: 'pareto' }, minutesWeek });
const bones = (causes: Cause[], suggestions: Suggestion[] = []): Bone[] =>
  SIXM.map(({ key }) => ({ m: key, causes: causes.filter(c => c.m === key), suggestions: suggestions.filter(s => s.m === key) }));

describe('the order a bone reads in', () => {
  it('puts roots first, then confirmed, suspected, ruled out, then suggestions biggest first', () => {
    const out = cause('machine', 'ruled_out', { root: true });
    const sus = cause('machine', 'suspected');
    const con = cause('machine', 'confirmed');
    const root = cause('machine', 'confirmed', { root: true });
    const small = sugg('machine', 10), big = sugg('machine', 90);
    const items = orderItems({ m: 'machine', causes: [out, sus, con, root], suggestions: [small, big] });
    expect(items.map(i => (i.kind === 'cause' ? i.cause.id : i.s.key))).toEqual([root.id, con.id, sus.id, out.id, big.key, small.key]);
  });
});

describe('what a bone says', () => {
  it('counts causes, roots, ruled out and suggestions in words', () => {
    expect(boneWords({ m: 'people', causes: [], suggestions: [] })).toBe('Nothing found yet');
    expect(boneWords({ m: 'people', causes: [], suggestions: [sugg('people')] })).toBe('Nothing found yet · 1 suggested');
    expect(boneWords({
      m: 'people', suggestions: [],
      causes: [cause('people', 'confirmed', { root: true }), cause('people'), cause('people', 'ruled_out', { root: true })],
    })).toBe('3 causes · 1 root · 1 ruled out');
    expect(boneWords({ m: 'people', causes: [cause('people')], suggestions: [] })).toBe('1 cause');
  });

  it('says a loss the way the floor does', () => {
    expect(lossWords(undefined)).toBe('');
    expect(lossWords(0)).toBe('');
    expect(lossWords(45)).toBe('45 min a week');
    expect(lossWords(95)).toBe('1.6 h a week');
    expect(lossWords(120)).toBe('2 h a week');
    expect(lossWords(900)).toBe('15 h a week');
  });
});

describe('the drawn fish', () => {
  const typical = bones([
    cause('people', 'confirmed'), cause('people'),
    cause('machine', 'confirmed'), cause('machine'), cause('machine', 'ruled_out'),
    cause('method'),
    cause('material', 'confirmed', { root: true }), cause('material'),
  ], [sugg('machine', 64), sugg('measurement'), sugg('environment')]);
  const huge = bones(Array.from({ length: 40 }, (_, i) => cause(i < 14 ? 'machine' : SIXM[i % 6].key, i % 4 === 3 ? 'ruled_out' : 'suspected')), [sugg('people'), sugg('environment')]);

  for (const [name, bs] of [['empty', bones([])], ['typical', typical], ['huge', huge]] as const) {
    for (const width of [790, 1000, 1290, 1880]) {
      it(`${name} at ${width}px: every mark drawn, none on another, all inside the drawing`, () => {
        const L = layoutFish(bs, width, { rowH: 34 });
        const placed = L.bones.flatMap(b => b.items);
        expect(placed.length).toBe(bs.reduce((s, b) => s + b.causes.length + b.suggestions.length, 0));
        const boxes = [...placed, ...L.bones.map(b => b.label), L.head];
        for (let i = 0; i < boxes.length; i++) {
          const b = boxes[i];
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.y).toBeGreaterThanOrEqual(0);
          expect(b.x + b.w).toBeLessThanOrEqual(width + 0.01);
          expect(b.y + b.h).toBeLessThanOrEqual(L.height + 0.01);
          for (let j = i + 1; j < boxes.length; j++) expect(overlaps(b, boxes[j]), `${i} × ${j}`).toBe(false);
        }
      });
    }
  }

  it('hangs every rib off its own bone, short of the bone before it', () => {
    const L = layoutFish(typical, 1300, { rowH: 34 });
    L.bones.forEach((pb, idx) => {
      const half = Math.abs(pb.outer.y - pb.spine.y);
      const xAt = (y: number) => pb.spine.x - (pb.spine.x - pb.outer.x) * (Math.abs(L.spineY - y) / half);
      for (const pi of pb.items) {
        expect(Math.abs(pi.attachX - xAt(pi.lineY))).toBeLessThan(0.01);
        expect(pi.x + pi.w).toBeLessThan(pi.attachX);
        if (idx % 3 > 0) expect(pi.x).toBeGreaterThan(L.bones[idx - 1].spine.x - (L.bones[idx - 1].spine.x - L.bones[idx - 1].outer.x) * (Math.abs(L.spineY - pi.lineY) / half));
        // upper ribs above the spine, lower ones below it
        expect(pb.upper ? pi.lineY < L.spineY : pi.y > L.spineY).toBe(true);
      }
    });
  });

  it('grows taller rather than piling marks up, and gives a finger more room', () => {
    const a = layoutFish(typical, 1300, { rowH: 34 }), b = layoutFish(huge, 1300, { rowH: 34 }), c = layoutFish(typical, 1300, { rowH: 44 });
    expect(b.height).toBeGreaterThan(a.height);
    expect(c.height).toBeGreaterThan(a.height);
    for (const pi of c.bones.flatMap(x => x.items)) expect(pi.h).toBeGreaterThanOrEqual(42);
  });

  it('keeps the head inside the drawing when the bones are short', () => {
    const L = layoutFish(bones([]), 1000, { rowH: 34, headH: 260 });
    expect(L.head.y).toBeGreaterThanOrEqual(0);
    expect(L.head.y + L.head.h).toBeLessThanOrEqual(L.height);
  });
});

describe('what the cause sheet saves', () => {
  it('trims the words, drops empty whys, and keeps root only with a chain under a cause that stands', () => {
    const c = cause('method', 'confirmed', { text: '  Changeover order not followed  ', root: true, whys: [{ id: 'a', text: ' No standard ' }, { id: 'b', text: '   ' }] });
    const t = tidyCause(c);
    expect(t.text).toBe('Changeover order not followed');
    expect(t.whys).toEqual([{ id: 'a', text: 'No standard' }]);
    expect(t.root).toBe(true);
    expect(tidyCause({ ...c, whys: [{ id: 'b', text: ' ' }] }).root).toBe(false);
    expect(tidyCause({ ...c, status: 'ruled_out' }).root).toBe(false);
  });

  it('keeps a cause\'s photos, and an emptied list is no list — so adding and taking one off again is not a change', () => {
    const c = cause('people');
    const photo = { id: 'p1', kind: 'photo' as const, blobKey: 'k', mime: 'image/jpeg', capturedAt: 1 };
    expect(tidyCause({ ...c, media: [photo] }).media).toEqual([photo]);
    expect(JSON.stringify(tidyCause({ ...c, media: [] }))).toBe(JSON.stringify(tidyCause(c)));
  });
});
