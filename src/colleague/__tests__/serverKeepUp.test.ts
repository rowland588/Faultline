import { describe, expect, it } from 'vitest';
import type { Source } from '../../lib/data/sources';
import { archivedClients, dueServerLinks, linkHashChanged, newestLinkSources, type ServerLinkSource } from '../serverKeepUp';

const H = 60 * 60_000;
const NOW = 1_000_000_000_000;

const linkSource = (id: string, ownerId: string, client: string, url: string, hash: string, at: number, bytes = 1000): Source & { ownerId: string } => ({
  id,
  ownerId,
  at,
  facts: {
    name: 'Shift report',
    named: 'person',
    fileName: 'shift.xlsx',
    kind: 'workbook',
    bytes,
    at,
    fileId: 'wb1',
    status: 'ready',
    client,
    origin: { kind: 'link', url, service: 'onedrive', said: 'A OneDrive link', host: 'x.com', path: 'A OneDrive link · x.com', hash, modifiedAt: at, checkedAt: at },
  },
});

describe('serverKeepUp', () => {
  it('skips archived customers', () => {
    const archived = archivedClients([
      { agreed: { story: { client: 'Branston', archivedAt: 1 } } },
      { agreed: { story: { client: 'Branston', archivedAt: 2 } } },
    ]);
    expect(archived.has('branston')).toBe(true);
    expect(archivedClients([{ agreed: { story: { client: 'Acme' } } }]).size).toBe(0);
  });

  it('keeps the newest source per link and customer', () => {
    const u = 'https://x.test/a';
    const rows = newestLinkSources([
      linkSource('old', 'u1', 'Acme', u, 'aaa', NOW - H),
      linkSource('new', 'u1', 'Acme', u, 'bbb', NOW),
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.sourceId).toBe('new');
    expect(rows[0]?.hash).toBe('bbb');
  });

  it('dueServerLinks respects stamps, size and archived', () => {
    const row: ServerLinkSource = {
      fileKey: 'link:https://x|acme',
      sourceId: 's1',
      ownerId: 'u1',
      client: 'Acme',
      name: 'Report',
      url: 'https://x',
      hash: 'h1',
      bytes: 1000,
      readAt: NOW,
    };
    const big: ServerLinkSource = { ...row, fileKey: 'big', bytes: 20 * 1024 * 1024 };
    const arch: ServerLinkSource = { ...row, fileKey: 'arch', client: 'Gone' };
    const checked: Record<string, number> = { [row.fileKey]: NOW - 5 * H };
    const due = dueServerLinks([row, big, arch], NOW, checked, new Set(['gone']));
  expect(due.map(d => d.fileKey)).toEqual([row.fileKey]);
    expect(dueServerLinks([row], NOW, { [row.fileKey]: NOW - H / 2 }, new Set())).toEqual([]);
  });

  it('linkHashChanged is true only when both hashes are set and differ', () => {
    expect(linkHashChanged('a', 'b')).toBe(true);
    expect(linkHashChanged('a', 'a')).toBe(false);
    expect(linkHashChanged('', 'b')).toBe(false);
  });
});