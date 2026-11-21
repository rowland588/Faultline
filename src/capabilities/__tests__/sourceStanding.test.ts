/* WHOSE A FILE IS, AND WHETHER LUNA MAY USE IT (capabilities/data standingOf — 21 November, Rowland: "links and data for Luna also need
 * to be included in the current customer … if I archive it then Luna will not pull information from that … if the customer is restarted
 * then it pulls all information"). The rule, on its own: no database, no screen. */
import { describe, expect, it } from 'vitest';
import { customerOfSource, notInHandSaid, standingOf, type HandNow } from '../data';
import type { Source } from '../../lib/data/sources';

const file = (name: string, client?: string, lineId?: string): Source => ({ id: name, at: 1, ...(lineId ? { lineId } : {}),
  facts: { name, named: 'file', fileName: `${name}.xlsx`, kind: 'workbook', bytes: 1, at: 1, fileId: `wb-${name}`, status: 'ready', ...(client ? { client } : {}) } } as Source);
const hand = (client: string, clients: string[], archived: string[] = []): HandNow => ({ client, clients, archived: new Set(archived.map(a => a.toLowerCase())) });
const lineClient = (id?: string) => (id === 'L-branston' ? 'Branston' : id === 'L-cobb' ? 'Cobb Foods' : '');

describe('whose a file is', () => {
  it('the customer it was connected under, else its line’s', () => {
    expect(customerOfSource(file('a', 'Branston'), hand('', ['Branston', 'Cobb Foods']))).toBe('Branston');
    expect(customerOfSource(file('a', undefined, 'L-cobb'), hand('', ['Branston', 'Cobb Foods']), lineClient)).toBe('Cobb Foods');
  });
  it('a file that names none is the only customer’s when there is only one — in use or archived', () => {
    expect(customerOfSource(file('a'), hand('', ['Branston']))).toBe('Branston');
    expect(customerOfSource(file('a'), hand('', [], ['Branston']))).toBe('branston');
  });
  it('…and truly no one’s when there are several, or none', () => {
    expect(customerOfSource(file('a'), hand('', ['Branston', 'Cobb Foods']))).toBe('');
    expect(customerOfSource(file('a'), hand('', ['Branston'], ['Cobb Foods']))).toBe('');
    expect(customerOfSource(file('a'), hand('', []))).toBe('');
  });
});

describe('whether Luna may use it', () => {
  it('one customer, live: its files are in hand', () => {
    expect(standingOf(file('a', 'Branston'), hand('', ['Branston']))).toEqual({ in: true, customer: 'Branston' });
    expect(standingOf(file('legacy'), hand('', ['Branston'])).in).toBe(true);
  });
  it('that customer archived: nothing of it — the files it named, and the files that named none', () => {
    expect(standingOf(file('a', 'Branston'), hand('', [], ['Branston']))).toEqual({ in: false, why: 'archived', customer: 'Branston' });
    expect(standingOf(file('legacy'), hand('', [], ['Branston']))).toMatchObject({ in: false, why: 'archived' });
    expect(standingOf(file('on-its-line', undefined, 'L-branston'), hand('', [], ['Branston']), lineClient)).toMatchObject({ in: false, why: 'archived' });
  });
  it('continued: in hand again, nothing having been changed', () => {
    const f = file('a', 'Branston');
    expect(standingOf(f, hand('', [], ['Branston'])).in).toBe(false);
    expect(standingOf(f, hand('', ['Branston'])).in).toBe(true);
  });
  it('several customers, one chosen: that customer’s and the truly no one’s — never another’s', () => {
    const h = hand('Branston', ['Branston', 'Cobb Foods']);
    expect(standingOf(file('a', 'Branston'), h).in).toBe(true);
    expect(standingOf(file('n'), h).in).toBe(true);
    expect(standingOf(file('c', 'Cobb Foods'), h)).toEqual({ in: false, why: 'other', customer: 'Cobb Foods' });
    expect(standingOf(file('c', ' cobb  foods '), h)).toMatchObject({ in: false, why: 'other' });
  });
  it('several customers, all shown: every customer’s in use — never an archived one’s', () => {
    const h = hand('', ['Branston', 'Cobb Foods'], ['Dale Dairies']);
    expect(standingOf(file('a', 'Branston'), h).in).toBe(true);
    expect(standingOf(file('c', 'Cobb Foods'), h).in).toBe(true);
    expect(standingOf(file('d', 'Dale Dairies'), h)).toMatchObject({ in: false, why: 'archived' });
    expect(standingOf(file('d', 'Dale Dairies'), hand('Branston', ['Branston', 'Cobb Foods'], ['Dale Dairies']))).toMatchObject({ in: false, why: 'archived' });
  });
  it('why not is said in words, naming the customer and the way back', () => {
    const a = standingOf(file('March report', 'Branston'), hand('', [], ['Branston']));
    if (!a.in) expect(notInHandSaid(file('March report', 'Branston'), a)).toMatch(/belongs to Branston, which is archived — nothing is read from an archived customer.*continue Branston/);
    const o = standingOf(file('March report', 'Cobb Foods'), hand('Branston', ['Branston', 'Cobb Foods']));
    if (!o.in) expect(notInHandSaid(file('March report', 'Cobb Foods'), o)).toMatch(/belongs to Cobb Foods, not the customer in hand — switch to Cobb Foods/);
    expect(a.in || o.in).toBe(false);
  });
});
