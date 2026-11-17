// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const serviceWorker = () => {
  const update = vi.fn().mockResolvedValue(undefined);
  const unregister = vi.fn();
  vi.stubGlobal('navigator', { onLine: true, serviceWorker: { getRegistration: vi.fn().mockResolvedValue({ update, unregister }) } });
  return { update, unregister };
};

describe('Faultline version update', () => {
  it('reports current without reloading or discarding the offline app', async () => {
    const { update, unregister } = serviceWorker();
    const reload = vi.fn(); vi.stubGlobal('location', { reload });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: __BUILD_ID__ }) }));
    const { updateNow } = await import('../appUpdate');
    expect(await updateNow()).toBe('current');
    expect(reload).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled(); expect(unregister).not.toHaveBeenCalled();
  });
  it('leaves the app and work intact when offline or the version service fails', async () => {
    const { unregister } = serviceWorker(); const reload = vi.fn(); vi.stubGlobal('location', { reload });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')));
    const { updateNow } = await import('../appUpdate');
    await expect(updateNow()).rejects.toThrow('current version and saved work');
    vi.stubGlobal('navigator', { onLine: false });
    await expect(updateNow()).rejects.toThrow('offline');
    expect(reload).not.toHaveBeenCalled(); expect(unregister).not.toHaveBeenCalled();
  });
  it('does not reload if installing the new worker fails; another attempt can succeed', async () => {
    const { update, unregister } = serviceWorker(); const reload = vi.fn(); vi.stubGlobal('location', { reload });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 'next-version' }) }));
    update.mockRejectedValueOnce(new Error('Worker download failed'));
    const { updateNow } = await import('../appUpdate');
    await expect(updateNow()).rejects.toThrow('current version is still available');
    expect(reload).not.toHaveBeenCalled();
    expect(await updateNow()).toBe('reloading'); expect(reload).toHaveBeenCalledOnce(); expect(unregister).not.toHaveBeenCalled();
  });
});
