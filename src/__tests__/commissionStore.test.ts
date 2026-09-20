/* THE MACHINES, THE PACKS, AND THE OEM'S PAPERWORK, ON A REAL DATABASE.
 *
 * The model tests prove the rules. These prove the storage keeps its promises:
 * deleting a machine does not leave its claims floating on the line, deleting a
 * pack does not leave programs for a pack nobody can name, and both travel to the
 * other devices instead of coming back on the next sync.
 *
 * Every one of these is a fault this app has actually shipped in some form. An
 * orphaned row is not harmless — it still counts, still syncs, and shows up in a
 * total belonging to something that no longer exists.
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import type { Asset, CommissionItem, Pack } from '../lib/commissioning';

const PROJECT = 'proj-commissioning';

const asset = (id: string, name: string, sort = 10): Asset =>
  ({ id, projectId: PROJECT, name, state: 'running', sort, updatedAt: 1 });
const pack = (id: string, name: string): Pack =>
  ({ id, projectId: PROJECT, name, sort: 10, updatedAt: 1 });

/* A brand-new database per test, the way the archive tests do it: the module
   holds an open connection, so the factory and the module cache both have to go. */
beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const freshDb = async () => {
  const db = await import('../db');
  await db.addProject({
    id: PROJECT, name: 'Line 2', color: '#0b7d68', workspaceIds: [],
    commissioning: true, createdAt: 1, updatedAt: 1,
  });
  return db;
};

describe('machines', () => {
  it('round-trips, in the order they were given', async () => {
    const db = await freshDb();
    await db.putCommissionAsset(asset('a2', 'Checkweigher', 20));
    await db.putCommissionAsset(asset('a1', 'Flow wrapper', 10));
    expect((await db.listCommissionAssets(PROJECT)).map(a => a.name)).toEqual(['Flow wrapper', 'Checkweigher']);
  });

  it('takes its claims with it when it goes, and says how many first', async () => {
    const db = await freshDb();
    await db.putCommissionAsset(asset('a1', 'Flow wrapper'));
    await db.putCommissionItems([
      { id: 'i1', projectId: PROJECT, assetId: 'a1', kind: 'task', title: 'Guarding', state: 'todo', sort: 1, createdAt: 1, updatedAt: 1 },
      { id: 'i2', projectId: PROJECT, assetId: 'a1', kind: 'task', title: 'Training', state: 'todo', sort: 2, createdAt: 1, updatedAt: 1 },
      { id: 'i3', projectId: PROJECT, kind: 'task', title: 'Hygiene clearance', state: 'todo', sort: 3, createdAt: 1, updatedAt: 1 },
    ] as CommissionItem[]);

    // Counted BEFORE anybody is asked to confirm: nobody can consent to
    // "remove this machine" without being told what goes with it.
    expect(await db.assetContents('a1', PROJECT)).toEqual({ items: 2 });

    await db.deleteCommissionAsset('a1', PROJECT);
    expect(await db.listCommissionAssets(PROJECT)).toEqual([]);
    // The line's own work is untouched — it never belonged to the machine.
    expect((await db.listCommissionItems(PROJECT)).map(i => i.title)).toEqual(['Hygiene clearance']);
  });

  it('tombstones the machine AND its claims, so the delete travels', async () => {
    /* Without both, the other device pushes its copies back and the machine
       reappears — a delete that only happens on the phone it was typed on is not
       a delete, it is a disagreement that resolves itself by restoring the data. */
    const db = await freshDb();
    await db.putCommissionAsset(asset('a1', 'Flow wrapper'));
    await db.putCommissionItem({ id: 'i1', projectId: PROJECT, assetId: 'a1', kind: 'task', title: 'Guarding', state: 'todo', sort: 1, createdAt: 1, updatedAt: 1 });
    await db.deleteCommissionAsset('a1', PROJECT);

    const stones = await db.listTombstones();
    expect(stones.filter(s => s.kind === 'commission_assets').map(s => s.id)).toEqual(['a1']);
    expect(stones.filter(s => s.kind === 'commission_items').map(s => s.id)).toEqual(['i1']);
  });
});

describe('packs', () => {
  it('takes the programs written for it, and nothing else', async () => {
    const db = await freshDb();
    await db.putCommissionPack(pack('pk1', '1kg catering'));
    await db.putCommissionItems([
      { id: 'p1', projectId: PROJECT, packId: 'pk1', kind: 'program', title: '1kg', agreedRate: 45, written: false, sort: 1, createdAt: 1, updatedAt: 1 },
      { id: 'p2', projectId: PROJECT, kind: 'program', title: '400g', agreedRate: 65, written: true, sort: 2, createdAt: 1, updatedAt: 1 },
    ] as CommissionItem[]);

    expect(await db.packContents('pk1', PROJECT)).toEqual({ items: 1 });
    await db.deleteCommissionPack('pk1', PROJECT);
    expect(await db.listCommissionPacks(PROJECT)).toEqual([]);
    expect((await db.listCommissionItems(PROJECT)).map(i => i.id)).toEqual(['p2']);
  });
});

describe('the OEM’s paperwork', () => {
  it('keeps the metadata on the machine and the bytes in the blob store', async () => {
    /* The OEM will never log into this, so their FAT report has to live where the
       work does. Metadata on the row, bytes on the same rails as a snag photo —
       which is what makes it open on a factory floor with no signal. */
    const db = await freshDb();
    await db.putBlob('doc-1', new Blob(['%PDF-1.4'], { type: 'application/pdf' }));
    await db.putCommissionAsset({
      ...asset('a1', 'Flow wrapper'),
      docs: [{ id: 'd1', name: 'FAT report.pdf', blobKey: 'doc-1', mime: 'application/pdf', bytes: 8, savedAt: 5 }],
    });

    const [saved] = await db.listCommissionAssets(PROJECT);
    expect(saved.docs?.[0].name).toBe('FAT report.pdf');
    expect(await db.getBlob(saved.docs![0].blobKey)).toBeDefined();
  });

  it('is named on the row the sync engine asks for blob keys', async () => {
    /* The one that would be silent: a document whose key the mapper does not
       report is a PDF that syncs its NAME and not its bytes, so it opens on the
       phone it was saved on and nowhere else. */
    const { MAPS } = await import('../cloud/mappers');
    const keys = MAPS.commission_assets.mediaKeys({
      ...asset('a1', 'Flow wrapper'),
      docs: [{ id: 'd1', name: 'FAT report.pdf', blobKey: 'doc-1', mime: 'application/pdf', savedAt: 5 }],
    });
    expect(keys.map(k => k.key)).toEqual(['doc-1']);
    expect(keys[0].mime).toBe('application/pdf');
  });
});
