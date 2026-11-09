/* A FILE THAT CAME DOWN WHILE A PASS RAN IS NEVER SENT BACK UP.
 *
 * scripts/sync-two-devices.mjs, "app health", 9 November: a clip's poster
 * (thumb-…) went up twice — once from the phone that filmed it and once from
 * the laptop, which had only downloaded it. The laptop came back online and
 * pushed its edit of the test; the merged row named the phone's new clip; the
 * download drain, running beside the pass, had fetched the small poster after
 * the pass read what had come down; so the pass found it on the device and
 * sent it. This makes the file land in exactly that window: the moment the
 * pass looks for it on the device. */
import { describe, it, expect, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

type Row = Record<string, unknown>;

describe('a file fetched from the cloud during a pass', () => {
  it('is not uploaded by the pass that finds it on the device', async () => {
    vi.resetModules();
    vi.stubGlobal('indexedDB', new IDBFactory());
    const uploads: string[] = [];
    const files = new Map<string, Blob>([['thumb-v', new Blob(['\xff\xd8\xff poster'], { type: 'image/jpeg' })]]);
    const tables = new Map<string, Map<string, Row>>();
    let rev = 0;
    const chain = (table: string) => {
      let op: 'select' | Row[] = 'select';
      const run = async () => {
        if (op !== 'select') {
          if (!tables.has(table)) tables.set(table, new Map());
          const stored = op.map(r => { const s = { ...r, rev: ++rev }; tables.get(table)!.set(r.id as string, s); return s; });
          return { data: stored, error: null };
        }
        return { data: [], error: null };
      };
      const b = {
        select: () => b, eq: () => b, gt: () => b, in: () => b, order: () => b, limit: () => b, range: () => b,
        upsert: (rows: Row[]) => { op = rows; return b; },
        update: () => b,
        then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => run().then(res, rej),
      };
      return b;
    };
    const client = {
      from: chain,
      auth: { getSession: async () => ({ data: { session: { user: { id: 'u1', email: 'rowland@example.com' } } } }) },
      storage: { from: () => ({
        upload: async (key: string) => { uploads.push(key); return { error: null }; },
        download: async (path: string) => {
          const b = files.get(path);
          return b ? { data: b, error: null } : { data: null, error: { status: 400, statusCode: '404', message: 'Object not found' } };
        },
      }) },
    };
    vi.doMock('../client', () => ({ cloudConfigured: true, supabase: client }));

    /* the drain lands the poster the moment the pass first looks for it here */
    let landInWindow: null | (() => Promise<void>) = null;
    vi.doMock('../../db', async (orig: () => Promise<Record<string, unknown>>) => {
      const m = await orig() as { getBlob: (k: string) => Promise<Blob | undefined> };
      return { ...m, getBlob: async (k: string) => {
        if (k === 'thumb-v' && landInWindow) { const go = landInWindow; landInWindow = null; await go(); }
        return m.getBlob(k);
      } };
    });
    const db = await import('../../db');
    const sync = await import('../sync');

    const t = Date.now();
    await db.putTest({
      id: 't1', projectId: 'p1', title: 'Case packer FAT', status: 'planned', createdAt: t, updatedAt: t,
      /* the phone's clip: its film is still coming down, its poster lands mid-pass */
      media: [{ id: 'm1', kind: 'video', blobKey: 'blob-v', thumbKey: 'thumb-v', mime: 'video/mp4', capturedAt: t }],
    } as never);
    await (await db.getDB()).put('meta', { keys: ['thumb-v'] } as never, 'pendingDownloads');
    landInWindow = async () => { await sync.drainDownloads('u1'); };

    await sync.syncNow();

    expect(landInWindow).toBeNull();                    // the poster did land inside the pass
    expect(await db.hasBlob('thumb-v')).toBe(true);      // on the device
    expect(sync.fetchedFromCloud('thumb-v')).toBe(true);
    expect(uploads).not.toContain('thumb-v');            // and never sent back up
    expect([...(tables.get('tests')?.keys() ?? [])]).toContain('t1');   // the row itself went
  });
});
