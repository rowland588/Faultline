/* The shipped sub-category → bone map (DEFAULT_BONE): every sub-category the
 * taxonomies ship has a decision — a usual bone, or left out on purpose so the
 * words decide — and a stop is sorted by it before any word guess. */
import { describe, it, expect } from 'vitest';
import { DEFAULT_BONE, SIXM, boneOfStop, boneOfSub, KNOWN_WORD } from '../sixm';
import { TAXONOMIES } from '../taxonomy';

/** No usual bone: a symptom any of the six can cause, or a cause at another
 *  machine. Listed here so a sub-category added to a taxonomy without a
 *  decision fails this test rather than quietly guessing. */
const LEFT_OUT = [
  'Jam / blockage', 'Misfeed', 'Manual clear', 'Starved upstream', 'Blocked downstream', 'Reject', 'Rework',
  'Scrap / waste', 'Giveaway / overfill', 'Underweight reject', 'Label / date fault', 'Foreign body / detector reject',
];

const allSubs = [...new Set(TAXONOMIES.flatMap(t => Object.values(t.subcategories).flat()))];

describe('DEFAULT_BONE — the usual bone of every shipped sub-category', () => {
  it('every sub-category in every taxonomy is either mapped or left out on purpose', () => {
    const undecided = allSubs.filter(s => !boneOfSub(s) && !LEFT_OUT.includes(s));
    expect(undecided).toEqual([]);
  });
  it('maps nothing that no taxonomy ships, and leaves out nothing it also maps', () => {
    expect(Object.keys(DEFAULT_BONE).filter(k => !allSubs.includes(k))).toEqual([]);
    expect(LEFT_OUT.filter(k => k in DEFAULT_BONE)).toEqual([]);
  });
  it('the food lists reach all six bones', () => {
    const food = TAXONOMIES.find(t => t.id === 'food-packing');
    const bones = new Set(Object.values(food?.subcategories ?? {}).flat().map(boneOfSub).filter(Boolean));
    expect([...bones].sort()).toEqual(SIXM.map(x => x.key).sort());
  });
  it('follows the rule: what does the work, what checks it, what it is made of, how, who, around', () => {
    expect(boneOfSub('Sensor / photo-eye fault')).toBe('machine');
    expect(boneOfSub('Seal fault')).toBe('machine');
    expect(boneOfSub('Checkweigher false reject')).toBe('measurement');
    expect(boneOfSub('Swab / QA hold')).toBe('measurement');
    expect(boneOfSub('Product out of spec (size / shape)')).toBe('material');
    expect(boneOfSub('No packaging / consumables')).toBe('material');
    expect(boneOfSub('Allergen changeover')).toBe('method');
    expect(boneOfSub('Short runs')).toBe('method');
    expect(boneOfSub('Untrained cover')).toBe('people');
    expect(boneOfSub('No labour')).toBe('people');
    expect(boneOfSub('Condensation / ambient temperature')).toBe('environment');
  });
  it('matches ignoring case and spaces; nothing for blank or unknown', () => {
    expect(boneOfSub('  seal FAULT ')).toBe('machine');
    expect(boneOfSub('')).toBeUndefined();
    expect(boneOfSub(undefined)).toBeUndefined();
    expect(boneOfSub('Jam / blockage')).toBeUndefined();
    expect(boneOfSub('Weigher bucket stuck')).toBeUndefined();
  });
  it('the food lists only grew — every sub-category the seeds and old workspaces use is still there', () => {
    const food = TAXONOMIES.find(t => t.id === 'food-packing');
    expect(food?.subcategories.Breakdown.slice(0, 4)).toEqual(['Mechanical', 'Electrical', 'Jam / blockage', 'Utilities (air / steam / chill)']);
    expect(food?.subcategories['Minor stop'].slice(0, 4)).toEqual(['Misfeed', 'Sensor trip', 'Manual clear', 'Film / packaging snag']);
  });
});

describe('boneOfStop — the shipped map first, then the words', () => {
  it('a mapped sub-category beats the words in it and the loss category', () => {
    /* "Uneven crewing" sits under Speed loss (Machine by category); "Waiting
       QA release" under Waiting (People by category). */
    expect(boneOfStop('Speed loss', 'Uneven crewing')).toBe('people');
    expect(boneOfStop('Waiting', 'Waiting QA release')).toBe('measurement');
    expect(boneOfStop('Waiting', 'Waiting forklift / logistics')).toBe('method');
    expect(boneOfStop('Quality', 'Seal fault')).toBe('machine');
    expect(boneOfStop('Breakdown', 'Sensor / photo-eye fault')).toBe('machine');
  });
  it('the floor’s note naming the room still wins — the one bone no sub-category is about', () => {
    expect(boneOfStop('Minor stop', 'Sensor trip', 'condensation on the eye at start-up')).toBe('environment');
    expect(boneOfStop('Minor stop', 'Sensor trip')).toBe('machine');
  });
  it('a sub-category left out is guessed from its words and category, as before', () => {
    expect(boneOfStop('Minor stop', 'Misfeed')).toBe('machine');
    expect(boneOfStop('Quality', 'Foreign body / detector reject')).toBe('measurement');
    expect(boneOfStop('Waiting', 'Starved upstream')).toBe('people');
  });
});

describe('KNOWN_WORD', () => {
  it('says how a cause is known in the working method’s words', () => {
    expect(Object.values(KNOWN_WORD)).toEqual(['data', 'counted', 'seen', 'told']);
  });
});
