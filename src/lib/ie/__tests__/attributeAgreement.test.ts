import { describe, expect, it } from 'vitest';
import { attributeAgreement, cohensKappa, fleissKappa } from '../attributeAgreement';

describe('cohensKappa', () => {
  it('matches a hand case', () => {
    const a = [1, 1, 0, 0, 1];
    const b = [1, 0, 0, 0, 1];
    expect(cohensKappa(a, b)).toBeCloseTo(0.6, 1);
  });
});

describe('fleissKappa', () => {
  it('is 1 when every rater agrees on every item', () => {
    expect(fleissKappa([[1, 1, 1], [0, 0, 0], [1, 1, 1]])).toBeCloseTo(1, 5);
  });
});

/** Ten-piece case for acceptance — 4 rejects, 6 good; B is weaker. */
export const ATTR_ACCEPT_ITEMS = ['P01', 'P02', 'P03', 'P04', 'P05', 'P06', 'P07', 'P08', 'P09', 'P10'];
const REF = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
const A1 = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
const A2 = [1, 1, 1, 1, 0, 0, 0, 0, 0, 0];
const B1 = [1, 0, 1, 1, 0, 1, 0, 0, 0, 0];
const B2 = [1, 1, 0, 1, 0, 0, 0, 0, 0, 0];

function buildCase() {
  const refs = ATTR_ACCEPT_ITEMS.map((item, i) => ({ item, reject: REF[i] === 1 }));
  const judgments: { item: string; inspector: string; look: number; reject: boolean }[] = [];
  for (let i = 0; i < 10; i++) {
    judgments.push({ item: ATTR_ACCEPT_ITEMS[i], inspector: 'A', look: 1, reject: A1[i] === 1 });
    judgments.push({ item: ATTR_ACCEPT_ITEMS[i], inspector: 'A', look: 2, reject: A2[i] === 1 });
    judgments.push({ item: ATTR_ACCEPT_ITEMS[i], inspector: 'B', look: 1, reject: B1[i] === 1 });
    judgments.push({ item: ATTR_ACCEPT_ITEMS[i], inspector: 'B', look: 2, reject: B2[i] === 1 });
  }
  return { refs, judgments };
}

describe('attributeAgreement', () => {
  it('computes the ten-piece acceptance case', () => {
    const { refs, judgments } = buildCase();
    const r = attributeAgreement(refs, judgments);
    expect(r).toBeDefined();
    const b = r!.inspectors.find(x => x.name === 'B');
    expect(b!.kappaRef).toBeLessThan(0.75);
    expect(r!.fleissKappa).toBeGreaterThan(0.4);
  });
});
