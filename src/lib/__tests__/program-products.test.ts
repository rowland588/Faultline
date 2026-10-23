/* THE PRODUCTS A PROGRAM RUNS (23 October — "a program 10 ... that does 4
 * products"): kept as one text, read back as a list, an older program's one
 * product its first. */
import { describe, expect, it } from 'vitest';
import { productsOf, productsText } from '../programs';
import { productsOnLine } from '../lineRecords';

describe('a program runs several products', () => {
  it('reads an older program’s one product as the first of its list', () => {
    expect(productsOf('Finest Red 2kg')).toEqual(['Finest Red 2kg']);
    expect(productsOf(undefined)).toEqual([]);
    expect(productsOf('  ')).toEqual([]);
  });
  it('reads several, each once, in the order given', () => {
    expect(productsOf('All Rounder 2kg, Express 1.25kg; Finest Red 2kg\nBaking 2kg, express 1.25KG')).toEqual(['All Rounder 2kg', 'Express 1.25kg', 'Finest Red 2kg', 'Baking 2kg']);
  });
  it('writes them back as one text, and nothing as none', () => {
    expect(productsText(['All Rounder 2kg', ' Express 1.25kg ', ''])).toBe('All Rounder 2kg, Express 1.25kg');
    expect(productsText([])).toBeUndefined();
    expect(productsOf(productsText(['A', 'B', 'C', 'D']))).toEqual(['A', 'B', 'C', 'D']);
  });
  it('offers each of a program’s products on its line, once', () => {
    expect(productsOnLine([{ runs: 'A 2kg, B 1kg' }, { runs: 'B 1kg' }], [{ product: 'C 500g' }])).toEqual(['A 2kg', 'B 1kg', 'C 500g']);
  });
});
