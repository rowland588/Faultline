import { describe, expect, it } from 'vitest';
import { COLLEAGUE_DOMAIN_FOOD_MANUFACTURING, domainFocusHint } from '../colleagueDomain';

describe('food FMCG domain slice', () => {
  it('states regulatory caution and factory idiom', () => {
    expect(COLLEAGUE_DOMAIN_FOOD_MANUFACTURING).toMatch(/never certify compliance/);
    expect(COLLEAGUE_DOMAIN_FOOD_MANUFACTURING).toMatch(/giveaway/);
    expect(COLLEAGUE_DOMAIN_FOOD_MANUFACTURING).toMatch(/HACCP/);
    expect(COLLEAGUE_DOMAIN_FOOD_MANUFACTURING.length).toBeLessThan(4500);
  });

  it('domainFocusHint only for food-safety-shaped threads', () => {
    expect(domainFocusHint({ title: 'Line 3 throughput' })).toBeUndefined();
    expect(domainFocusHint({ title: 'Allergen changeover on Line 6' })).toMatch(/never claim compliance/);
  });
});