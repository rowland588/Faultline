import { describe, expect, it } from 'vitest';
import { faultlineReturn, isEnvRoute, workDestination } from '../environment';

describe('opening Faultline work from Luna', () => {
  it.each([
    ['project', '/project/recovery'], ['page', '/project/a3/method'], ['report', '/pace-report?project=job&save=1'],
    ['study', '/chart/check'], ['action', '/project/job/actions'], ['line', '/lines/line'], ['problem', '/snags?open=p'],
  ] as const)('opens the %s reference at its Faultline address', (kind, href) => {
    expect(workDestination({ kind, href })).toBe('faultline');
  });
  it.each(['chart', 'result', 'convreport'] as const)('opens %s in the conversation even when the stored link is empty', kind => {
    expect(workDestination({ kind, href: '' })).toBe('conversation');
  });
  it('does not open an empty operational reference or lose the manual workspace on exit', () => {
    expect(workDestination({ kind: 'page', href: '' })).toBeUndefined();
    expect(workDestination({ kind: 'project' })).toBeUndefined();
    expect(workDestination({ kind: 'page', href: '//example.com' })).toBeUndefined();
    expect(faultlineReturn()).toBe('/room');
    expect(faultlineReturn({ lineId: 'Line A' })).toBe('/lines/Line%20A');
    expect(faultlineReturn({ projectId: 'A3' })).toBe('/project/A3');
    expect(isEnvRoute({ name: 'today', query: new URLSearchParams() }, true)).toBe(false);
    expect(isEnvRoute({ name: 'ai', query: new URLSearchParams() }, true)).toBe(true);
  });
});
