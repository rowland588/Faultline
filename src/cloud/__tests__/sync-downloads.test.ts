/* THE FILMS NEVER HOLD THE RECORDS UP.
 *
 * Rowland, on the laptop: "20 still coming down … I need instant sync between
 * devices." The records were instant; the pull fetched every row's media
 * before moving to the next row, so a laptop's first pull sat on each walk
 * film in turn. Read out of the source, the way sync-wiring reads the mappers:
 * calling the engine needs a cloud. */
import { describe, it, expect, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

vi.mock('../client', () => ({ supabase: null, cloudConfigured: false }));
const { isNotThere } = await import('../sync');

const src = readFileSync(join(__dirname, '..', 'sync.ts'), 'utf8');
const applyRemote = /const applyRemote = async[\s\S]*?\n {6}\};/.exec(src)?.[0] ?? '';

describe('the pull and the files', () => {
  it('fetches no file while it is taking rows', () => {
    expect(applyRemote).not.toBe('');
    expect(applyRemote).not.toMatch(/download/i);
    expect(applyRemote).not.toMatch(/storage/);
  });

  it('fetches files beside the pass, not inside it', () => {
    expect(src).toMatch(/void drainDownloads\(uid\)/);
  });

  it('prunes the queue to what a live record still names', () => {
    expect(src).toMatch(/if \(!liveBlobs\.has\(k\)\) q\.delete\(k\)/);
  });
});

describe('a file that is not there, and a connection that dropped', () => {
  it('reads the storage API’s "not found" as not there', () => {
    expect(isNotThere({ status: 400, statusCode: '404', message: 'Object not found' })).toBe(true);
    expect(isNotThere({ status: 404, message: '' })).toBe(true);
  });

  it('reads a network failure as worth another go', () => {
    expect(isNotThere({ message: 'Failed to fetch' })).toBe(false);
    expect(isNotThere({ status: 500, statusCode: '500', message: 'Internal' })).toBe(false);
    expect(isNotThere(null)).toBe(false);
  });
});

/* The drain itself, against a fake cloud: one file there, one never sent. */
describe('the drain', () => {
  it('fetches what is there, keeps what is not, and counts the two apart', async () => {
    vi.resetModules();
    vi.stubGlobal('indexedDB', new IDBFactory());
    const cloud = new Map<string, Blob>([['blob-here', new Blob(['\xff\xd8\xff photo'], { type: 'image/jpeg' })]]);
    vi.doMock('../client', () => ({
      cloudConfigured: true,
      supabase: {
        storage: { from: () => ({
          download: async (path: string) => {
            const b = cloud.get(path);
            return b ? { data: b, error: null } : { data: null, error: { status: 400, statusCode: '404', message: 'Object not found' } };
          },
        }) },
      },
    }));
    const db = await import('../../db');
    await (await db.getDB()).put('meta', { keys: ['blob-here', 'blob-only-on-the-phone|u2'] } as never, 'pendingDownloads');
    const sync = await import('../sync');

    await sync.drainDownloads('u1');

    expect(await db.hasBlob('blob-here')).toBe(true);
    expect(await db.hasBlob('blob-only-on-the-phone')).toBe(false);
    expect(sync.syncStatus()).toMatchObject({ pendingDown: 0, missingDown: 1 });
    /* Still queued — the phone may send it at any moment. */
    const left = await (await db.getDB()).get('meta', 'pendingDownloads') as { keys: string[] };
    expect(left.keys).toEqual(['blob-only-on-the-phone|u2']);

    /* …and when it does, the next drain brings it down. */
    cloud.set('blob-only-on-the-phone', new Blob(['film'], { type: 'video/mp4' }));
    await sync.drainDownloads('u1');
    expect(await db.hasBlob('blob-only-on-the-phone')).toBe(true);
    expect(sync.syncStatus()).toMatchObject({ pendingDown: 0, missingDown: 0 });
  });
});
