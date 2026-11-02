/* FC-148 part B — the why tree, against the hand-worked "poor training" case (knowledge/specs/FC-148-why-tree.md §6)
   and the independent second implementation in scripts/knowledge/why-tree.py. */
import { describe, expect, it } from 'vitest';
import { WHY_OF_CAUSE, type Cause, type Why } from '../sixm';
import { addAnswer, asTree, dropAnswer, readTree, setRoot, setSameAs, thereforeBranches, treeSays, whyForest } from '../whyTree';

const w = (id: string, text: string, extra: Partial<Why> = {}): Why => ({ id, text, ...extra });
const cause = (whys: Why[], root?: boolean): Pick<Cause, 'whys' | 'root'> & { text: string } => ({ text: 'Poor training', whys, ...(root !== undefined ? { root } : {}) });

/* W1 no written standard → W4 nobody owns the standard (same root as W6); W2 no sign-off → W5 sign-off sheet not issued
   (same root as W6); W3 the trainer has no time → W6 training is not planned into the roster (the root) */
const training = (opts: { w5Open?: boolean } = {}): Why[] => [
  w('W1', 'No written standard', { of: WHY_OF_CAUSE }), w('W2', 'New starters are not signed off', { of: WHY_OF_CAUSE }), w('W3', 'The trainer has no time', { of: WHY_OF_CAUSE }),
  w('W4', 'Nobody owns the standard', { of: 'W1', sameAs: 'W6' }),
  w('W5', 'The sign-off sheet is not issued', { of: 'W2', ...(opts.w5Open ? {} : { sameAs: 'W6' }) }),
  w('W6', 'Training is not planned into the roster', { of: 'W3', root: true }),
];

describe('the why tree (poor training, worked by hand)', () => {
  it('3 branches, 1 root shared by all three, each branch 2 whys deep', () => {
    const r = readTree(cause(training()));
    expect(r.branches).toBe(3);
    expect(r.roots).toHaveLength(1);
    expect(r.roots[0].why.id).toBe('W6');
    expect(r.roots[0].branches).toBe(3);
    expect(r.open).toHaveLength(0);
    expect(r.depth).toBe(2);
    expect(r.single).toBe(false);
  });
  it('says it in the spec’s words', () => {
    expect(treeSays(cause(training()))).toBe('3 branches, 1 root — Training is not planned into the roster — shared by all three.');
  });
  it('with W5 left unmarked: still 1 root, one branch open', () => {
    const r = readTree(cause(training({ w5Open: true })));
    expect(r.branches).toBe(3);
    expect(r.roots).toHaveLength(1);
    expect(r.roots[0].branches).toBe(2);
    expect(r.open.map(x => x.id)).toEqual(['W5']);
    expect(treeSays(cause(training({ w5Open: true })))).toBe('3 branches, 1 root — Training is not planned into the roster — shared by 2 of 3; 1 branch not yet at a root.');
  });
  it('reads the therefore test branch by branch', () => {
    const b = thereforeBranches(cause(training()), 'Poor starts');
    expect(b).toHaveLength(3);
    expect(b[0]).toEqual(['Nobody owns the standard, therefore no written standard', 'No written standard, therefore poor training', 'Poor training, therefore poor starts']);
    expect(b[2][0]).toBe('Training is not planned into the roster, therefore the trainer has no time');
  });
});

describe('a chain written before the tree', () => {
  const chain = [w('a', 'Splices vary'), w('b', 'No jig'), w('c', 'Nobody owns the jig')];
  it('reads as one branch; the last is the root when the cause says so', () => {
    const r = readTree(cause(chain, true));
    expect(r.branches).toBe(1);
    expect(r.single).toBe(true);
    expect(r.depth).toBe(3);
    expect(r.roots[0].why.id).toBe('c');
    expect(treeSays(cause(chain, true))).toBe('One chain, 3 whys deep — it reached a root: Nobody owns the jig.');
  });
  it('is open without the root flag', () => {
    const r = readTree(cause(chain));
    expect(r.roots).toHaveLength(0);
    expect(r.open.map(x => x.id)).toEqual(['c']);
    expect(treeSays(cause(chain))).toBe('One chain, 3 whys deep — it has not reached a root yet.');
  });
  it('gives the lines therefore always gave', () => {
    expect(thereforeBranches(cause(chain, true), 'Film breaks')[0]).toEqual([
      'Nobody owns the jig, therefore no jig', 'No jig, therefore splices vary', 'Splices vary, therefore poor training', 'Poor training, therefore film breaks']);
  });
  it('becomes a tree without changing its order when branched', () => {
    const t = addAnswer(chain, 'b', 'd').map(x => (x.id === 'd' ? { ...x, text: 'Jig was never ordered' } : x));
    expect(t.map(x => x.of)).toEqual([WHY_OF_CAUSE, 'a', 'b', 'b']);
    const r = readTree({ whys: setRoot(t, 'c', true) });
    expect(r.branches).toBe(2);
    expect(r.roots).toHaveLength(1);
  });
});

describe('repairs and edits keep every why', () => {
  it('an orphan is attached to the cause and said', () => {
    const f = whyForest({ whys: [w('a', 'One', { of: WHY_OF_CAUSE }), w('x', 'Lost', { of: 'gone' })] });
    expect(f.top.map(n => n.why.id)).toEqual(['a', 'x']);
    expect(f.repaired).toEqual(['x']);
  });
  it('a circle is broken, not looped', () => {
    const f = whyForest({ whys: [w('a', 'A', { of: 'b' }), w('b', 'B', { of: 'a' })] });
    expect(f.top.length).toBeGreaterThan(0);
    expect(f.byId.size).toBe(2);
    expect(f.repaired.length).toBeGreaterThan(0);
  });
  it('taking a why out moves its answers up to what it answered', () => {
    const t = dropAnswer(training(), 'W3');
    expect(t.find(x => x.id === 'W6')?.of).toBe(WHY_OF_CAUSE);
  });
  it('marking a root clears a "same root as"; "same root as" clears the mark', () => {
    const t = setRoot(training(), 'W4', true);
    expect(t.find(x => x.id === 'W4')?.sameAs).toBeUndefined();
    const u = setSameAs(t, 'W4', 'W6');
    expect(u.find(x => x.id === 'W4')?.root).toBeUndefined();
  });
  it('a "same root as" a why that is not a root does not count as reaching one', () => {
    const r = readTree({ whys: [w('a', 'A', { of: WHY_OF_CAUSE }), w('b', 'B', { of: WHY_OF_CAUSE, sameAs: 'a' })] });
    expect(r.roots).toHaveLength(0);
    expect(r.open).toHaveLength(2);
  });
  it('nothing asked yet', () => { expect(treeSays({ whys: [] })).toBe('Nobody has asked why yet.'); });
  it('asTree leaves a tree alone', () => { const t = training(); expect(asTree(t)).toBe(t); });
});

describe('two unrelated roots', () => {
  const two = [w('a', 'No jig', { of: WHY_OF_CAUSE, root: true }), w('b', 'Film is damp', { of: WHY_OF_CAUSE, root: true })];
  it('counts both and shares none', () => {
    const r = readTree({ whys: two });
    expect(r.branches).toBe(2);
    expect(r.roots).toHaveLength(2);
    expect(treeSays({ whys: two })).toBe('2 branches, 2 roots.');
  });
});
