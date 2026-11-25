import { describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { listStudies, listTestItems, putStandard, putStudy } from '../../../db';
import { attachMethodEvidence } from '../../../db/methodEvidence';
import { launchPlacement, methodPhaseOf, methodToolHref, placementNote } from '../../../lib/methodPlacement';
import { methodDashboard } from '../../../lib/methodDashboard';
import { METHODS, methodByKey } from '../../../lib/methods';
import { analysisMode } from '../../../lib/methodToolMode';
import { studyHref } from '../../../lib/studyLinks';
import type { ToolStudy } from '../../../lib/study';
import { howTool, matchesMethodTool, openAt } from '../methodTools';

const make = (id: string, projectId: string): ToolStudy => ({ id, projectId, workspaceId: 'shared-line', tool: 'capability', name: id, startedAt: 1, createdAt: 1, updatedAt: 1, facts: {}, uses: [] });

describe('tools saved from project phases', () => {
  it.each(METHODS.filter(m => m.key !== 'stage-gate'))('keeps repeated and extra tools at their chosen phase in $name', async method => {
    const projectId = 'method-' + method.key;
    const first = { projectId, method: method.key, section: method.sections[0].name };
    const last = { ...first, section: method.sections[method.sections.length - 1].name };
    const a = make(projectId + '-first-run', projectId), b = make(projectId + '-second-run', projectId);
    const other = make(projectId + '-other-client', 'other-' + projectId);
    const standard = { id: projectId + '-capacity', projectId, workspaceId: 'shared-line', product: 'Packs', marks: [], sort: 0, createdAt: 1, updatedAt: 1 };
    await Promise.all([putStudy(a, first), putStudy(b, last), putStudy(other, first), putStandard(standard, { ...last, standardView: 'work' })]);
    await putStudy({ ...a, name: 'Edited after opening again' });
    expect(await attachMethodEvidence(last, 'study', other.id)).toBe(false);
    const rows = await listTestItems(projectId);
    expect(methodPhaseOf(rows, method.key, 'standard', standard.id)).toBe(last.section);
    expect(methodPhaseOf(rows, method.key, 'study', other.id)).toBeUndefined();
    const input = { method, answers: {}, studies: await listStudies(projectId), owed: rows, today: '2026-11-25', readsOf: () => undefined, matches: matchesMethodTool, ctx: { standards: [standard] } };
    const d = methodDashboard(input);
    expect(d.findings.map(f => [f.id, f.section, f.href])).toEqual([[a.id, first.section, studyHref(a)], [b.id, last.section, studyHref(b)]]);
    expect(d.sections[d.sections.length - 1]?.results).toBe(2);
    expect(d.standards[0].href).toContain('?at=work');
    expect(await attachMethodEvidence(first, 'study', b.id)).toBe(true);
    expect(await attachMethodEvidence(first, 'study', b.id)).toBe(true);
    const updated = await listTestItems(projectId);
    expect(updated).toHaveLength(3);
    expect(methodPhaseOf(updated, method.key, 'study', b.id)).toBe(first.section);
  });

  it('keeps both query scopes and opens the requested analysis mode', () => {
    const mode = openAt(howTool('FC-118'))!;
    const phase = { projectId: 'p', method: 'dmaic' as const, section: 'Measure' };
    const href = methodToolHref(mode, 'p', phase, true, 'Line A');
    const q = new URLSearchParams(href.split('?')[1]);
    expect([q.get('entry'), q.get('add'), q.get('line')]).toEqual(['FC-118', '1', 'Line A']);
    expect(analysisMode(q.get('entry')!)).toBe('grr');
    expect(launchPlacement('p', href)).toEqual(phase);
    expect(launchPlacement('other', href)).toBeUndefined();
    expect(launchPlacement('p', href.replace('Measure', 'Missing'))).toBeUndefined();
  });

  it('opens historical kinds and nested registers at their own record, with ordinary edits preserved', () => {
    const base = make('old', 'p');
    for (const tool of ['time', 'cycle', 'layout', 'ergonomics', 'run', 'ledger'] as const) {
      const study = { ...base, tool };
      const dashboard = methodDashboard({ method: methodByKey('pdca')!, answers: {}, studies: [study], owed: [], today: '', readsOf: () => undefined });
      expect(dashboard.findings[0]).toMatchObject({ id: 'old', href: '/saved-study/old', says: 'Saved record' });
    }
    expect(studyHref({ ...base, tool: 'doc', agreed: { tree: {} } } as unknown as ToolStudy)).toBe('/fault-tree/old');
  });

  it('keeps ambiguous historical records in project evidence and distinguishes actual document modes', () => {
    const cap = make('legacy', 'p'), charter = { ...cap, id: 'doc', tool: 'doc' as const, agreed: { doc: { def: 'charter' } } } as ToolStudy;
    const base = { answers: {}, owed: [], today: '', readsOf: () => undefined, matches: matchesMethodTool };
    const pdca = methodDashboard({ ...base, method: methodByKey('pdca')!, studies: [cap] });
    expect(pdca.findings[0].section).toBe('Project evidence');
    expect(pdca.sections.every(s => s.results === 0)).toBe(true);
    const dmaic = methodDashboard({ ...base, method: methodByKey('dmaic')!, studies: [charter] });
    expect(dmaic.findings[0].section).toBe('Project evidence');
    const assigned = methodDashboard({ ...base, method: methodByKey('dmaic')!, studies: [charter],
      owed: [placementNote({ projectId: 'p', method: 'dmaic', section: 'Define' }, 'study', charter.id, 2)] });
    expect(assigned.findings[0].section).toBe('Define');
    expect(matchesMethodTool('FC-142', charter)).toBe(true);
    expect(matchesMethodTool('FC-139', charter)).toBe(false);
  });
});
