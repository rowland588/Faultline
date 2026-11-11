/* THE LIBRARY (lib/library, lib/keptPdfs; docs/CONSULTANT-WORKSPACE.md C4): what paper a copy is, whom it is for, whose it is, which
 * are shown — and the copies themselves on the device: kept as library rows, renamed, said internal or client-facing, taken off and
 * put back, the old device-only copies offered once; and the row as it goes to the cloud and comes back. */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { audienceOf, kindWord, libraryRows, librarySaid, oldCopiesOffer, paperKindOf, placePaper, type PaperWorld } from '../library';
import { MAPS } from '../../cloud/mappers';
import type { KeptPaperRow } from '../../db/rows';

const L = '11111111-2222-3333-4444-555555555555', L2 = '22222222-2222-3333-4444-555555555555';
const S = '66666666-7777-8888-9999-aaaaaaaaaaaa', P = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff';

describe('what paper it is, from the page it was made on', () => {
  it.each([
    ['#/', 'story'], ['#/story', 'story'],
    [`#/lines/${L}/report`, 'line-report'], [`#/lines/${L}`, 'line-report'], [`#/w/${L}/report`, 'line-report'],
    ['#/area/report', 'area-report'],
    [`#/project/${P}/method-report`, 'project-report'], [`#/project/${P}/report`, 'project-report'], [`#/project/${P}/actions`, 'actions'],
    ['#/snags', 'problems'], ['#/actions', 'actions'], ['#/room', 'factory'], ['#/machines', 'factory'],
    [`#/capability/${S}`, 'tool'], ['#/capability', 'tool'], [`#/calc/kanban/${S}`, 'tool'], [`#/doc/charter/${S}`, 'tool'], [`#/w/${L}/standards/${S}`, 'tool'],
    [`#/talk/${S}`, 'talk'], ['#/visit/abc', 'visit-report'], ['#/tools', 'other'],
  ])('%s is a %s', (page, kind) => { expect(paperKindOf(page)).toBe(kind); });

  it('a finished report is client-facing by default; a tool’s own paper, a working sheet, a list is internal', () => {
    for (const k of ['story', 'visit-report', 'line-report', 'area-report', 'project-report']) expect(audienceOf(k)).toBe('client');
    for (const k of ['tool', 'problems', 'actions', 'factory', 'talk', 'other', 'a word this build does not know']) expect(audienceOf(k)).toBe('internal');
    expect(kindWord('line-report')).toBe('Line report');
    expect(kindWord('nonsense')).toBe('Other');
  });
});

describe('whose it is', () => {
  const world: PaperWorld = {
    lines: [{ id: L, clientName: 'Branston' }, { id: L2, clientName: ' Leeds Foods ' }],
    projects: [{ id: P }],
    jobLines: [{ projectId: P, workspaceId: L2 }],
    studies: [{ id: S, workspaceId: L }],
  };
  it('a line’s page — the line and its customer', () => {
    expect(placePaper([L], world, 'Someone else')).toEqual({ workspaceId: L, client: 'Branston' });
  });
  it('a record — the record, its line and the line’s customer', () => {
    expect(placePaper([S], world, '')).toEqual({ workspaceId: L, studyId: S, client: 'Branston' });
  });
  it('a project — the project and the customer of the line it is on', () => {
    expect(placePaper([P], world, '')).toEqual({ projectId: P, client: 'Leeds Foods' });
  });
  it('an area’s report — the customer in its address; else the customer active when it was made; else none', () => {
    expect(placePaper([], world, '', new URLSearchParams('client=Hull%20Co&area=Packing'))).toEqual({ client: 'Hull Co' });
    expect(placePaper([], world, 'Branston')).toEqual({ client: 'Branston' });
    expect(placePaper([], world, '')).toEqual({});
  });
});

describe('which are shown', () => {
  const p = (name: string, at: number, client: string | undefined, kind: string, audience: 'client' | 'internal', deletedAt?: number) =>
    ({ name, at, client, kind, audience, ...(deletedAt ? { deletedAt } : {}) });
  const all = [
    p('Line 7 — line report.pdf', 3, 'Branston', 'line-report', 'client'),
    p('Capability — fill.pdf', 5, 'Branston', 'tool', 'internal'),
    p('Story.pdf', 4, 'Leeds Foods', 'story', 'client'),
    p('Loose.pdf', 2, undefined, 'other', 'internal'),
    p('Gone.pdf', 9, 'Branston', 'tool', 'internal', 10),
  ];
  it('newest first, a copy taken off never among them, every customer under All customers', () => {
    expect(libraryRows(all, { client: '', filtering: false }).map(r => r.name)).toEqual(['Capability — fill.pdf', 'Story.pdf', 'Line 7 — line report.pdf', 'Loose.pdf']);
  });
  it('the active customer’s only once two are named — a paper of no customer is left out (separation first)', () => {
    expect(libraryRows(all, { client: 'branston', filtering: true }).map(r => r.name)).toEqual(['Capability — fill.pdf', 'Line 7 — line report.pdf']);
  });
  it('by kind, by audience, by words', () => {
    expect(libraryRows(all, { client: '', filtering: false, kind: 'story' }).map(r => r.name)).toEqual(['Story.pdf']);
    expect(libraryRows(all, { client: '', filtering: false, audience: 'internal' }).map(r => r.name)).toEqual(['Capability — fill.pdf', 'Loose.pdf']);
    expect(libraryRows(all, { client: '', filtering: false, q: 'leeds' }).map(r => r.name)).toEqual(['Story.pdf']);
    expect(libraryRows(all, { client: '', filtering: false, q: 'line report' }).map(r => r.name)).toEqual(['Line 7 — line report.pdf']);
  });
  it('says itself in one sentence', () => {
    expect(librarySaid(libraryRows(all, { client: '', filtering: false }))).toBe('4 papers · 2 client-facing · 2 internal');
    expect(librarySaid([])).toBe('No papers yet');
  });
  it('offers the old copies once, never when there are none or the answer was no', () => {
    expect(oldCopiesOffer(12, false)).toBe('Keep these 12 copies in your library?');
    expect(oldCopiesOffer(1, false)).toBe('Keep this copy in your library?');
    expect(oldCopiesOffer(0, false)).toBeNull();
    expect(oldCopiesOffer(12, true)).toBeNull();
  });
});

describe('the record, to the cloud and back', () => {
  const row: KeptPaperRow = {
    id: 'k1', key: 'kept-k1', name: 'Line 7 — line report.pdf', at: 100, size: 2048, page: `#/lines/${L}/report`, ids: [L],
    workspaceId: L, projectId: P, studyId: S, client: 'Branston', kind: 'line-report', audience: 'client', ownerId: 'u9', updatedAt: 200,
  };
  it('every field goes up and comes back the same; its PDF is the one file it names', () => {
    const up = MAPS.kept_papers.toRow(row, 'me');
    expect(up).toMatchObject({ id: 'k1', owner_id: 'u9', workspace_id: L, project_id: P, study_id: S, client: 'Branston', page: row.page, ids: [L],
      name: row.name, kind: 'line-report', audience: 'client', size: 2048, media_key: 'kept-k1', made_at: 100, updated_at: 200, deleted_at: null });
    expect(MAPS.kept_papers.fromRow({ ...up, rev: 7 })).toEqual(row);
    expect(MAPS.kept_papers.mediaKeys(row)).toEqual([{ key: 'kept-k1', mime: 'application/pdf', owner: 'u9' }]);
  });
  it('made here, it goes as this person’s; a line id that is not a uuid goes as no line rather than refusing the row', () => {
    const up = MAPS.kept_papers.toRow({ ...row, ownerId: undefined, workspaceId: 'demo-line' }, 'me');
    expect(up.owner_id).toBe('me');
    expect(up.workspace_id).toBeNull();
  });
  it('an audience the cloud holds that this build does not know reads as internal — never shown to a client by mistake', () => {
    expect((MAPS.kept_papers.fromRow({ ...MAPS.kept_papers.toRow(row, 'me'), audience: 'board' }) as unknown as KeptPaperRow).audience).toBe('internal');
  });
});

describe('the copies on this device', () => {
  beforeEach(() => { vi.resetModules(); vi.unstubAllGlobals(); vi.stubGlobal('indexedDB', new IDBFactory()); });
  const boot = async () => {
    const db = await import('../../db');
    const kept = await import('../keptPdfs');
    return { db, kept };
  };

  it('a paper made on a line’s report is a library row — its kind, audience and customer — and a write the sync will send', async () => {
    const { db, kept } = await boot();
    const t = Date.now();
    await (await db.getDB()).put('workspaces', { id: L, name: 'Line 7', clientName: 'Branston', createdAt: t, updatedAt: t } as never);
    const wrote = vi.fn();
    db.onLocalWrite(wrote);
    const rec = await kept.keepPdf(new Blob(['%PDF-1.4 x'], { type: 'application/pdf' }), 'Line 7 — line report.pdf', `#/lines/${L}/report?save=1`);
    expect(rec).toMatchObject({ kind: 'line-report', audience: 'client', client: 'Branston', workspaceId: L, page: `#/lines/${L}/report` });
    expect(wrote).toHaveBeenCalled();
    expect((await db.rawAll('kept_papers')).map(r => r.id)).toEqual([rec!.id]);
    expect(await (await kept.keptBlob(rec!))?.text()).toBe('%PDF-1.4 x');
  });

  it('renamed and said internal; taken off — gone and a tombstone left — and put back by Undo', async () => {
    const { db, kept } = await boot();
    const rec = (await kept.keepPdf(new Blob(['a']), 'A.pdf', '#/'))!;
    expect(rec).toMatchObject({ kind: 'story', audience: 'client' });
    await kept.patchKept(rec.id, { name: '  Branston — story, 11 Nov.pdf ', audience: 'internal' });
    expect((await kept.listKept())[0]).toMatchObject({ name: 'Branston — story, 11 Nov.pdf', audience: 'internal' });
    await kept.patchKept(rec.id, { name: '   ' });
    expect((await kept.listKept())[0].name).toBe('Branston — story, 11 Nov.pdf');
    const undo = await kept.dropKept(rec.id);
    expect(await kept.listKept()).toEqual([]);
    expect((await db.listTombstones()).map(t => `${t.kind}:${t.id}`)).toEqual([`kept_papers:${rec.id}`]);
    await undo();
    expect((await kept.listKept()).map(k => k.id)).toEqual([rec.id]);
    expect(await db.listTombstones()).toEqual([]);
  });

  it('old device-only copies are listed as before, offered once, moved in on a yes (the same file, the same id)', async () => {
    const { db, kept } = await boot();
    const d = await db.getDB();
    await db.putBlob('kept-old1', new Blob(['old']));
    await d.put('meta', [{ id: 'old1', key: 'kept-old1', name: 'Old.pdf', at: 5, size: 3, page: '#/snags', ids: [] }], 'keptPdfs');
    expect((await kept.listKept())).toEqual([expect.objectContaining({ id: 'old1', local: true, kind: 'problems', audience: 'internal' })]);
    expect(await kept.oldCopies()).toEqual({ count: 1, declined: false });
    expect(await kept.moveOldToLibrary()).toBe(1);
    expect(await kept.oldCopies()).toEqual({ count: 0, declined: false });
    const now = await kept.listKept();
    expect(now).toHaveLength(1);
    expect(now[0]).toMatchObject({ id: 'old1', key: 'kept-old1', kind: 'problems' });
    expect(now[0].local).toBeUndefined();
    expect((await db.rawAll('kept_papers')).map(r => r.id)).toEqual(['old1']);
  });

  it('said no to, they stay on the device and the offer is not made again', async () => {
    const { db, kept } = await boot();
    await (await db.getDB()).put('meta', [{ id: 'old2', key: 'kept-old2', name: 'Old.pdf', at: 5, size: 3, page: '#/', ids: [] }], 'keptPdfs');
    await kept.declineOldCopies();
    expect(await kept.oldCopies()).toEqual({ count: 1, declined: true });
    expect(oldCopiesOffer(1, true)).toBeNull();
    expect((await kept.listKept()).map(k => k.id)).toEqual(['old2']);
    expect(await db.rawAll('kept_papers')).toEqual([]);
  });
});
