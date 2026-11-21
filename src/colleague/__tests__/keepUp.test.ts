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
