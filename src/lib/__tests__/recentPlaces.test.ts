import { describe, expect, it } from 'vitest';
import { lineIdFromPlace, placeAddress, projectIdFromPlace, remember, type Place } from '../recentPlaces';

const p = (to: string, scope: string, at = 1): Place => ({ to, scope, kind: 'project', at });

describe('where you were, on this device', () => {
  it('takes the one-off parts off an address', () => {
    expect(placeAddress('/project/a/report?save=1')).toBe('/project/a/report');
    expect(placeAddress('/smed?project=a&add=1')).toBe('/smed?project=a');
    expect(placeAddress('/lines/w?view=tools')).toBe('/lines/w?view=tools');
  });
  it('puts the latest first, one a scope, the page last open in it', () => {
    let l: Place[] = [];
    l = remember(l, p('/project/a', 'Line 2 commissioning'));
    l = remember(l, p('/lines/w', 'Line 7'));
    l = remember(l, p('/project/a/testing', 'Line 2 commissioning'));
    expect(l.map(x => x.to)).toEqual(['/project/a/testing', '/lines/w']);
  });
  it('reads line and project ids from remembered addresses', () => {
    expect(lineIdFromPlace('/lines/ws-2a?view=programs')).toBe('ws-2a');
    expect(projectIdFromPlace('/project/abc/install')).toBe('abc');
  });
  it('keeps eight', () => {
    let l: Place[] = [];
    for (let i = 0; i < 12; i++) l = remember(l, p(`/project/${i}`, `P${i}`));
    expect(l).toHaveLength(8);
    expect(l[0].scope).toBe('P11');
  });
});
