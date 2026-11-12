import { describe, it, expect, beforeEach, vi } from 'vitest';

const mem = new Map<string, string>();
vi.stubGlobal('localStorage', { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v); }, removeItem: (k: string) => { mem.delete(k); } });
import { greetName } from '../greetName';
import { setBrandForTest } from '../brand';
import { setMyName } from '../forYou';

describe('greetName — a name, never a sign-in', () => {
  beforeEach(() => { setBrandForTest(null); setMyName(''); });
  it('the brand first, then the name on the actions, then an e-mail only when it is plainly a first name', () => {
    expect(greetName('rowlandglew35@gmail.com')).toBe('');
    expect(greetName('rowland.glew@x.com')).toBe('Rowland');
    expect(greetName('j_smith@x.com')).toBe('');
    setMyName('Sam Patel');
    expect(greetName('rowlandglew35@gmail.com')).toBe('Sam');
    setBrandForTest({ name: 'Rowland Glew', business: 'Streamline Synergy' });
    expect(greetName('rowlandglew35@gmail.com')).toBe('Rowland');
  });
});
