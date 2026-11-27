/* LUNA KEEPS UP BY HERSELF (colleague/keepUp; docs/LUNA-AGENT.md G2): which linked files are due a look, the look itself with what does
 * the asking played, and what is never done — a file uploaded, another version of the same link, one looked at lately, a link too big
 * to fetch unasked, more than a few a visit. */
import { describe, expect, it } from 'vitest';
import { KEEP_UP, dueNow, keepUp, linkedOf, originKey, type InHand, type KeepUpDeps } from '../keepUp';
import type { LinkOrigin } from '../../lib/fileLink/link';
import type { MsOrigin } from '../../lib/microsoft/graph';

const H = 60 * 60_000;
const NOW = Date.UTC(2026, 10, 21, 18);
const link = (url: string, checkedAt: number, hash = 'h1'): LinkOrigin => ({ kind: 'link', url, service: 'onedrive', said: 'OneDrive', host: 'x', path: url.slice(8, 30), hash, modifiedAt: 0, checkedAt });
const ms = (itemId: string): MsOrigin => ({ kind: 'microsoft', driveId: 'd1', itemId, path: 'Shared/Plan.xlsx', modifiedAt: 0 });
const file = (id: string, name: string, at: number, origin?: LinkOrigin | MsOrigin, bytes = 20_000, whose = 'Branston'): InHand =>
  ({ id, at, whose, facts: { name, named: 'file', fileName: `${name}.xlsx`, kind: 'workbook', bytes, at, fileId: `f-${id}`, status: 'ready', ...(origin ? { origin } : {}) } } as unknown as InHand);

class NoSignIn extends Error {}
function rig(o: { changed?: string[]; fail?: string[]; signIn?: string[] } = {}) {
  const asked: string[] = [];
  const stamps: Record<string, number> = {};
  let t = NOW;
  const deps: KeepUpDeps = {
    link: async or => {
      asked.push(or.url);
      if (o.fail?.includes(or.url)) throw new Error('The link no longer points at a file.');
      const newer = !!o.changed?.includes(or.url);
      return { newer, file: new File(['x'], 'new.xlsx'), origin: { ...or, hash: newer ? 'h2' : or.hash, checkedAt: t } };
    },
    microsoft: async or => {
      asked.push(or.itemId);
      if (o.signIn?.includes(or.itemId)) throw new NoSignIn('sign in');
      return { newer: !!o.changed?.includes(or.itemId), item: { id: or.itemId, name: 'Plan.xlsx' } as never };
    },
    now: () => (t += 1000),
    stamps: () => stamps,
    stamp: (k, at) => { stamps[k] = at; },
    needsSignIn: e => e instanceof NoSignIn,
  };
  return { deps, asked, stamps };
}

describe('the linked files in hand', () => {
  it('are the newest record of each link or Microsoft file — an uploaded file has nothing to be checked against', () => {
    const A = 'https://1drv.ms/x/a', B = 'https://1drv.ms/x/b';
    const rows = [
      file('1', 'Shift report (September)', NOW - 40 * H, link(A, NOW - 40 * H)),
      file('2', 'Shift report (October)', NOW - 10 * H, link(A, NOW - 10 * H, 'h2')),   /* the same link, read again later */
      file('3', 'Plan', NOW - 30 * H, link(B, NOW - 30 * H)),
      file('4', 'Uploaded by hand', NOW - 50 * H),
      file('5', 'Budget', NOW - 20 * H, ms('i9')),
    ];
    const l = linkedOf(rows, {});
    expect(l.map(x => [x.key, x.source.id])).toEqual([[`link:${A}`, '2'], [`link:${B}`, '3'], ['ms:d1:i9', '5']]);
    expect(originKey(link(A, 0))).toBe(`link:${A}`);
    /* a later check on this device is when it was last looked at */
    expect(linkedOf(rows, { [`link:${B}`]: NOW - H })[1].checkedAt).toBe(NOW - H);
    expect(linkedOf(rows, {})[1].checkedAt).toBe(NOW - 30 * H);
  });
});

describe('which are due a look', () => {
  const A = 'https://1drv.ms/x/a', B = 'https://1drv.ms/x/b', C = 'https://1drv.ms/x/c';
  it('not looked at in the last few hours, the longest unlooked-at first', () => {
    const rows = [file('1', 'Fresh', NOW - H, link(A, NOW - H)), file('2', 'Old', NOW - 9 * H, link(B, NOW - 9 * H)), file('3', 'Older', NOW - 30 * H, link(C, NOW - 30 * H))];
    expect(dueNow(linkedOf(rows, {}), NOW).map(x => x.source.facts.name)).toEqual(['Older', 'Old']);
    /* exactly at the time, it is due; a minute before, it is not */
    expect(dueNow(linkedOf([file('1', 'Edge', NOW - KEEP_UP.everyMs, link(A, NOW - KEEP_UP.everyMs))], {}), NOW)).toHaveLength(1);
    expect(dueNow(linkedOf([file('1', 'Edge', NOW - KEEP_UP.everyMs + 60_000, link(A, NOW - KEEP_UP.everyMs + 60_000))], {}), NOW)).toHaveLength(0);
  });
  it('never more than a few a visit, and never a link whose file is too big to fetch unasked — a Microsoft file of any size is only asked its version', () => {
    const many = Array.from({ length: 9 }, (_, i) => file(String(i), `F${i}`, NOW - (10 + i) * H, link(`https://1drv.ms/x/${i}`, NOW - (10 + i) * H)));
    expect(dueNow(linkedOf(many, {}), NOW)).toHaveLength(KEEP_UP.most);
    expect(dueNow(linkedOf(many, {}), NOW)[0].source.facts.name).toBe('F8');
    const big = [file('1', 'Big link', NOW - 9 * H, link(A, NOW - 9 * H), KEEP_UP.maxBytes + 1), file('2', 'Big Microsoft', NOW - 9 * H, ms('i1'), KEEP_UP.maxBytes * 4)];
    expect(dueNow(linkedOf(big, {}), NOW).map(x => x.source.facts.name)).toEqual(['Big Microsoft']);
  });
});

describe('the look itself', () => {
  const A = 'https://1drv.ms/x/a', B = 'https://1drv.ms/x/b';
  const rows = [file('1', 'Shift report', NOW - 9 * H, link(A, NOW - 9 * H)), file('2', 'Plan', NOW - 8 * H, link(B, NOW - 8 * H)), file('3', 'Budget', NOW - 7 * H, ms('i9')), file('4', 'Just read', NOW - H, link('https://1drv.ms/x/n', NOW - H))];

  it('asks again for each file due; one that changed is given back to be said; each is noted as looked at', async () => {
    const r = rig({ changed: [B] });
    const got = await keepUp(rows, r.deps);
    expect(r.asked).toEqual([A, B, 'i9']);
    expect(got).toMatchObject({ checked: 3, skipped: 0 });
    expect(got.news).toHaveLength(1);
    expect(got.news[0]).toMatchObject({ key: `link:${B}`, kind: 'link', source: { id: '2', whose: 'Branston' }, origin: { hash: 'h2' } });
    expect(Object.keys(r.stamps).sort()).toEqual([`link:${A}`, `link:${B}`, 'ms:d1:i9']);
    /* …so nothing is asked again straight after */
    const again = await keepUp(rows, r.deps);
    expect(again).toEqual({ checked: 0, news: [], skipped: 0 });
    expect(r.asked).toHaveLength(3);
  });

  it('a Microsoft file that changed is given back with its item, to be downloaded on the press', async () => {
    const r = rig({ changed: ['i9'] });
    const got = await keepUp(rows, r.deps);
    expect(got.news).toHaveLength(1);
    expect(got.news[0]).toMatchObject({ kind: 'microsoft', key: 'ms:d1:i9', item: { id: 'i9' }, origin: { itemId: 'i9' } });
  });

  it('a link that cannot be asked for is noted as looked at all the same — tried again after the hours, not at every opening', async () => {
    const r = rig({ fail: [A] });
    const got = await keepUp(rows, r.deps);
    expect(got).toMatchObject({ checked: 2, skipped: 1, news: [] });
    expect(r.stamps[`link:${A}`]).toBeGreaterThan(NOW);
  });

  it('one that only wants a sign-in is left for the next opening, never stamped', async () => {
    const r = rig({ signIn: ['i9'] });
    const got = await keepUp(rows, r.deps);
    expect(got).toMatchObject({ checked: 2, skipped: 1 });
    expect(r.stamps['ms:d1:i9']).toBeUndefined();
    await keepUp(rows, r.deps);
    expect(r.asked.filter(x => x === 'i9')).toHaveLength(2);
  });

  it('with nothing linked, or nothing due, nothing is asked', async () => {
    const r = rig();
    expect(await keepUp([file('9', 'Uploaded', NOW - 90 * H)], r.deps)).toEqual({ checked: 0, news: [], skipped: 0 });
    expect(await keepUp([rows[3]], r.deps)).toEqual({ checked: 0, news: [], skipped: 0 });
    expect(r.asked).toEqual([]);
  });
});

/* ------------------------------------------------------------------ G2b: what changed is read, by herself */
import { readNews, readTold, writeTold, type News, type ReadDeps } from '../keepUp';
import { beforeEach } from 'vitest';

describe('the news read by Luna herself (G2b)', () => {
  const src = (id: string, o: LinkOrigin | MsOrigin, extra: Partial<InHand> = {}) => ({ ...file(id, `Report ${id}`, NOW - 9 * H, o), ...extra }) as InHand;
  const linkNews = (id: string, bytes = 1000, extra: Partial<InHand> = {}): News => { const o = link(`https://1drv.ms/x/${id}`, NOW - 9 * H); return { key: originKey(o), source: src(id, o, extra), kind: 'link', file: new File([new Uint8Array(bytes)], `${id}.xlsx`), origin: { ...o, hash: 'h2' } }; };
  const msNews = (id: string, size: number): News => { const o = ms(id); return { key: originKey(o), source: src(id, o), kind: 'microsoft', item: { id, name: `${id}.xlsx`, size } as never, origin: o }; };
  function rigRead(o: { cannot?: string[]; fail?: string[] } = {}) {
    const fetched: string[] = [], read: { name: string; client?: string; lineId?: string; projectId?: string; folderId?: string; conversationId?: string; kind: string }[] = [];
    const deps: ReadDeps = {
      fetch: async n => {
        fetched.push(n.source.id);
        if (n.kind === 'link') return { file: n.file, origin: n.origin };
        return (n.item as { size: number }).size <= KEEP_UP.maxBytes ? { file: new File(['x'], `${n.source.id}.xlsx`), origin: { ...n.origin, eTag: 'v2' } } : undefined;
      },
      read: async (f, to) => {
        if (o.fail?.some(x => f.name.startsWith(x))) throw new Error('The workbook could not be opened.');
        if (o.cannot?.some(x => f.name.startsWith(x))) return undefined;
        read.push({ name: f.name, kind: to.origin.kind, ...(to.client ? { client: to.client } : {}), ...(to.lineId ? { lineId: to.lineId } : {}), ...(to.projectId ? { projectId: to.projectId } : {}), ...(to.folderId ? { folderId: to.folderId } : {}), ...(to.conversationId ? { conversationId: to.conversationId } : {}) });
        return { sourceId: `new-${f.name}` };
      },
      now: () => NOW,
    };
    return { deps, fetched, read };
  }

  it('each changed file is read and kept as the newer version of the same file — with whose it is and where it was placed', async () => {
    const r = rigRead();
    const out = await readNews([linkNews('a', 1000, { lineId: 'L7', projectId: 'P1' } as Partial<InHand>), msNews('b', 2000)], r.deps);
    expect(out.left).toEqual([]);
    expect(out.told.map(t => t.sourceId)).toEqual(['new-a.xlsx', 'new-b.xlsx']);
    expect(out.told[0]).toEqual({ key: 'link:https://1drv.ms/x/a', sourceId: 'new-a.xlsx', at: NOW });
    expect(r.read).toEqual([{ name: 'a.xlsx', kind: 'link', client: 'Branston', lineId: 'L7', projectId: 'P1' }, { name: 'b.xlsx', kind: 'microsoft', client: 'Branston' }]);
  });

  it('a quieter re-read keeps the workspace and chat the file sits in', async () => {
    const r = rigRead();
    const n = linkNews('a', 1000);
    n.source.facts.folderId = 'ws-night';
    n.source.facts.conversationId = 'c-inbox';
    const out = await readNews([n], r.deps);
    expect(out.told).toHaveLength(1);
    expect(r.read[0]).toMatchObject({ name: 'a.xlsx', folderId: 'ws-night', conversationId: 'c-inbox', client: 'Branston' });
  });

  it('one she cannot read by herself is left to the person — too big, not hers to fetch, not a workbook, or the reading failed — and the rest go on', async () => {
    const r = rigRead({ cannot: ['doc'], fail: ['broken'] });
    const big = linkNews('big', KEEP_UP.maxBytes + 1);
    const out = await readNews([big, msNews('huge', KEEP_UP.maxBytes + 1), linkNews('doc'), linkNews('broken'), linkNews('fine')], r.deps);
    expect(out.told.map(t => t.sourceId)).toEqual(['new-fine.xlsx']);
    expect(out.left.map(n => n.source.id)).toEqual(['big', 'huge', 'doc', 'broken']);
    /* the one too big was never handed to the reader */
    expect(r.read.map(x => x.name)).toEqual(['fine.xlsx']);
  });

  describe('her note of what she read is kept on this device until it is acknowledged', () => {
    beforeEach(() => {
      const kept = new Map<string, string>();
      (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => { kept.set(k, v); }, removeItem: (k: string) => { kept.delete(k); } };
    });
    it('kept, one note a file, and put away by the record’s id', () => {
      expect(readTold()).toEqual([]);
      writeTold([{ key: 'link:a', sourceId: 's1', at: 10 }, { key: 'link:b', sourceId: 's2', at: 20 }]);
      expect(readTold().map(t => t.sourceId)).toEqual(['s2', 's1']);
      /* the same file read again before the note was acknowledged: its newer reading takes the note's place */
      writeTold([{ key: 'link:a', sourceId: 's3', at: 30 }]);
      expect(readTold().map(t => t.sourceId)).toEqual(['s3', 's2']);
      writeTold([], ['s2']);
      expect(readTold().map(t => t.sourceId)).toEqual(['s3']);
    });
    it('what is not a note is not read back as one', () => {
      localStorage.setItem('faultline.keepup.told', JSON.stringify([{ key: 'k' }, 'x', null, { key: 'link:a', sourceId: 's1', at: 5 }]));
      expect(readTold()).toEqual([{ key: 'link:a', sourceId: 's1', at: 5 }]);
      localStorage.setItem('faultline.keepup.told', '{not json');
      expect(readTold()).toEqual([]);
    });
  });
});
