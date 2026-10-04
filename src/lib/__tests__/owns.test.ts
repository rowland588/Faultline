import { describe, expect, it } from 'vitest';
import { owns } from '../format';

describe('a name that owns something', () => {
  it('takes ’s, or the apostrophe alone after an s', () => {
    expect(owns('Ilapak UK')).toBe('Ilapak UK’s');
    expect(owns('Loma Systems')).toBe('Loma Systems’');
    expect(owns('Rowland')).toBe('Rowland’s');
  });
});
