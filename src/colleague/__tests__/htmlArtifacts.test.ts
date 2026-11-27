import { describe, it, expect, beforeEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { artifactOpenRequest } from '../visualWork';

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.resetModules();
});

describe('artifactOpenRequest', () => {
  it('opens Artifacts as the door — no extra click', () => {
    expect(artifactOpenRequest('open artifacts')).toBe('list');
    expect(artifactOpenRequest('show my dashboards')).toBe('list');
    expect(artifactOpenRequest('Luna, open the packing dashboard')).toEqual({ title: 'packing' });
    expect(artifactOpenRequest('open packing html')).toEqual({ title: 'packing' });
    expect(artifactOpenRequest('what did packing lose?')).toBeUndefined();
    expect(artifactOpenRequest('open the wrapping line')).toBeUndefined();
  });
});

describe('independent artifact records', () => {
  it('live in Artifacts after the birth chat is deleted, and carry title, when made and metrics', async () => {
    const { putStudy, deleteStudy, getStudy } = await import('../../db');
    const { newConversation } = await import('../conversation');
    const { saveHtmlArtifact, standingArtifacts, liftHtmlArtifactsFromChat, metricsFromResults } = await import('../htmlArtifacts');
    const at = Date.now();
    await putStudy(newConversation({ id: 'c1', at, name: 'Packing', client: 'Acme Foods', folderId: 'p1' }));
    const report = { id: 'r1', title: 'Packing dashboard', form: 'report' as const, at, updated: at, version: 1, sections: [] };
    const saved = await saveHtmlArtifact('c1', report, '<!doctype html><title>Packing</title>', undefined, [{ label: 'Nights', value: '£1,204' }]);
    expect(saved.metrics?.[0]).toEqual({ label: 'Nights', value: '£1,204' });
    const standing = await getStudy(saved.id);
    expect(standing?.facts).toMatchObject({ lunaArtifact: true, conversationId: 'c1', client: 'Acme Foods', folderId: 'p1' });
    const leftover = await getStudy('c1');
    expect((leftover?.facts.htmlArtifacts ?? []).every(a => a.deletedAt || a.id !== saved.id)).toBe(true);
    await liftHtmlArtifactsFromChat('c1');
    await deleteStudy('c1');
    expect(await getStudy('c1')).toBeUndefined();
    const listed = await standingArtifacts();
    expect(listed.map(a => a.id)).toContain(saved.id);
    expect(listed.find(a => a.id === saved.id)?.title).toBe('Packing dashboard');
    expect(metricsFromResults([{
      id: 'x', title: 't', at, source: { id: 's', name: 'f', kind: 'workbook' }, query: { sheet: 'A', measures: [{ op: 'sum', column: 'Variance £' }] },
      result: { sheet: 'A', rowsScanned: 1, rowsMatched: 1, groups: [], groupsTotal: 0, totals: [1204], measures: ['sum of Variance £'], groupBy: [], skipped: [], notes: [] },
    }])).toEqual([{ label: 'Variance £', value: '1,204' }]);
  });
});
