/* method_knowledge — the library on demand (docs/LUNA-EXPERT-KNOWLEDGE.md). */
import { describe, expect, it, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { CAPABILITY_SCHEMAS } from '../schemas';
import { METHOD_LOOKUP_HEADINGS, methodLookupText, searchMethodRecords } from '../../catalogue/methodIndex';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

const fresh = async () => import('../registry');
const call = (name: string, input: unknown) => ({ id: `c-${name}`, name, input });

describe('method_knowledge', () => {
  it('is in the registry and schemas together', async () => {
    const reg = await fresh();
    expect(reg.CAPABILITIES.some(c => c.name === 'method_knowledge')).toBe(true);
    expect(CAPABILITY_SCHEMAS.some(s => s.name === 'method_knowledge' && s.kind === 'read')).toBe(true);
  });

  it('finds a record by id and returns the lookup headings only', async () => {
    const reg = await fresh();
    const r = await reg.runCall({ now: Date.now() }, call('method_knowledge', { id: 'foodsafety.haccp' }), { confirmed: false });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const data = r.data as { record?: { id: string; text: string }; figures?: string };
    expect(data.record?.id).toBe('foodsafety.haccp');
    expect(data.figures).toMatch(/none/);
    for (const h of METHOD_LOOKUP_HEADINGS) expect(data.record?.text).toContain(h);
    expect(data.record?.text).not.toContain('## Questions it answers');
  });

  it('searches by keywords and says not found honestly', async () => {
    const reg = await fresh();
    const hit = await reg.runCall({ now: Date.now() }, call('method_knowledge', { query: 'haccp hazard' }), { confirmed: false });
    expect(hit.ok).toBe(true);
    if (!hit.ok) return;
    const one = hit.data as { record?: { id: string }; matches?: { id: string }[]; notFound?: boolean };
    expect(one.notFound).toBe(false);
    const ids = one.record ? [one.record.id] : (one.matches ?? []).map(m => m.id);
    expect(ids).toContain('foodsafety.haccp');

    const miss = await reg.runCall({ now: Date.now() }, call('method_knowledge', { query: 'zzznomatchxyz' }), { confirmed: false });
    expect(miss.ok).toBe(true);
    if (!miss.ok) return;
    expect((miss.data as { notFound: boolean }).notFound).toBe(true);
    expect(miss.says).toMatch(/not found/i);
  });

  it('caps lookup text at four thousand characters', () => {
    const hits = searchMethodRecords({ id: 'foodsafety.haccp' });
    expect(hits.length).toBe(1);
    const { text } = methodLookupText(hits[0]);
    expect(text.length).toBeLessThanOrEqual(4000);
  });
});