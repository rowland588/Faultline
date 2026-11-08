/* HOW I WORK (lib/preferences; docs/AI-MODE.md, Memory) — read from the device's copy, cached from the profile (a profile read
 * before the column exists leaves the copy alone), saved to the device at once and to the cloud through set_my_preferences,
 * held to its size, a line added once, and said to the colleague under each box's label. */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpc = vi.fn();
vi.mock('../../cloud/client', () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  rpc.mockReset();
  vi.stubGlobal('localStorage', { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); } });
  vi.resetModules();
});
const fresh = () => import('../preferences');

describe('How I work', () => {
  it('reads nothing until something is saved, then the device’s copy', async () => {
    const p = await fresh();
    expect(p.readPreferences()).toBeNull();
    store.set('faultline.preferences', JSON.stringify({ words: '  the CW is the checkweigher ', nonsense: 1 }));
    p.forgetPreferencesCacheForTest();
    expect(p.readPreferences()).toEqual({ words: 'the CW is the checkweigher' });
  });

  it('saves to the device and to the cloud through set_my_preferences — the cloud refusing is said, the device keeps it', async () => {
    const p = await fresh();
    rpc.mockResolvedValueOnce({ error: null });
    expect(await p.savePreferences({ reports: 'Short, money first', words: '' })).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith('set_my_preferences', { p: { reports: 'Short, money first' } });
    expect(JSON.parse(store.get('faultline.preferences') ?? 'null')).toEqual({ reports: 'Short, money first' });
    rpc.mockResolvedValueOnce({ error: { message: 'function set_my_preferences does not exist' } });
    const r = await p.savePreferences({ always: 'I walk the floor first' });
    expect(r).toEqual({ ok: false, why: 'Kept on this device; the cloud said: function set_my_preferences does not exist' });
    p.forgetPreferencesCacheForTest();
    expect(p.readPreferences()).toEqual({ always: 'I walk the floor first' });
  });

  it('refuses more than it holds, never cutting it silently', async () => {
    const p = await fresh();
    const r = await p.savePreferences({ words: 'x'.repeat(1000), always: 'y'.repeat(901) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.why).toMatch(/1901 characters — How I work holds 1900/);
    expect(rpc).not.toHaveBeenCalled();
    expect(p.readPreferences()).toBeNull();
  });

  it('caches the profile’s copy; undefined (no column yet) leaves the device’s alone, null clears it', async () => {
    const p = await fresh();
    p.cachePreferences({ methods: 'Pareto of the stops first' });
    expect(p.readPreferences()).toEqual({ methods: 'Pareto of the stops first' });
    p.cachePreferences(undefined);
    expect(p.readPreferences()).toEqual({ methods: 'Pareto of the stops first' });
    p.cachePreferences('garbage');
    expect(p.readPreferences()).toEqual({ methods: 'Pareto of the stops first' });
    p.cachePreferences(null);
    expect(p.readPreferences()).toBeNull();
    expect(store.has('faultline.preferences')).toBe(false);
  });

  it('adds a line once, under its box, and refuses one that would not fit', async () => {
    const p = await fresh();
    const a = p.withLine({ words: 'Big Bertha is the Line 3 filler' }, 'words', 'I call the checkweigher the CW');
    expect(a).toEqual({ ok: true, prefs: { words: 'Big Bertha is the Line 3 filler\nI call the checkweigher the CW' } });
    if (!a.ok) return;
    expect(p.withLine(a.prefs, 'words', 'i call the checkweigher the cw')).toMatchObject({ ok: false, why: expect.stringMatching(/already says/) });
    expect(p.withLine({ always: 'z'.repeat(1890) }, 'words', 'one more long line here')).toMatchObject({ ok: false, why: expect.stringMatching(/full/) });
  });

  it('is said to the colleague box by box under its label, within 2,000 characters', async () => {
    const p = await fresh();
    expect(p.preferencesText(null)).toBe('');
    expect(p.preferencesText({ always: 'Plain words', words: 'the line = a production line' })).toBe('The words I use:\nthe line = a production line\n\nAlways remember:\nPlain words');
    const full = p.preferencesText(p.cleanPreferences({ words: 'w'.repeat(500), methods: 'm'.repeat(500), reports: 'r'.repeat(500), always: 'a'.repeat(500) }));
    expect(full.length).toBeLessThanOrEqual(2000);
    expect(full).toMatch(/Always remember:\na+$/);
  });
});
