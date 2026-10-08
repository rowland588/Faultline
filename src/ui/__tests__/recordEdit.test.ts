/**
 * Save in a record's one Edit (ui/RecordEdit, docs/DOORS.md) — what it keeps:
 * only the boxes that changed, an emptied box cleared, a one-day plan with no
 * last day, and what was agreed left alone for anybody but the owner.
 */
import { describe, it, expect } from 'vitest';
import { editPatch } from '../RecordEdit';
import type { Test } from '../../lib/testing';

const step = (more: Partial<Test> = {}): Test =>
  ({ id: 's1', projectId: 'j', kind: 'install', title: 'Air and power connected', outcome: 'planned', sort: 0, createdAt: 0, updatedAt: 0, ...more } as Test);
const boxes = (t: Test, more: Record<string, string> = {}) => ({
  title: t.title, assetId: t.assetId ?? '', fromTestId: t.fromTestId ?? '', plannedFor: t.plannedFor ?? '', plannedTo: t.plannedTo ?? '',
  withWhom: t.withWhom ?? '', planned: t.planned ?? '', passesIf: t.passesIf ?? '', ranOn: t.ranOn ?? '', ranTo: t.ranTo ?? '',
  product: t.product ?? '', result: t.result ?? '', ...more,
});

describe('what Save keeps', () => {
  it('is nothing when nothing changed — spaces typed round a word are not a change', () => {
    const t = step({ withWhom: 'Ilapak UK' });
    expect(editPatch(t, boxes(t, { withWhom: ' Ilapak UK ' }), true)).toEqual({});
  });
  it('is only the boxes that changed, and an emptied box clears its field', () => {
    const t = step({ withWhom: 'Ilapak UK', result: 'Air on' });
    expect(editPatch(t, boxes(t, { withWhom: 'Site electrician', result: '' }), true)).toEqual({ withWhom: 'Site electrician', result: undefined });
  });
  it('never empties the name', () => {
    const t = step();
    expect(editPatch(t, boxes(t, { title: '  ' }), true)).toEqual({});
  });
  it('gives a one-day plan, and a one-day run, no last day', () => {
    const t = step({ plannedFor: '2026-10-07', plannedTo: '2026-10-09', ranOn: '2026-10-07', ranTo: '2026-10-08' });
    expect(editPatch(t, boxes(t, { plannedTo: '2026-10-07', ranOn: '' }), true)).toEqual({ plannedTo: undefined, ranOn: undefined, ranTo: undefined });
  });
  it('leaves what was agreed alone for anybody but the owner', () => {
    const t = step({ passesIf: 'Bolted down, level to 1 mm' });
    expect(editPatch(t, boxes(t, { passesIf: 'Bolted down' }), false)).toEqual({});
    expect(editPatch(t, boxes(t, { passesIf: 'Bolted down' }), true)).toEqual({ passesIf: 'Bolted down' });
  });
});
