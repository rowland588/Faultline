/* THE WAY BACK (state/navHistory): the trail of pages visited this session — forward adds, Back pops, a replace swaps. */
import { describe, it, expect } from 'vitest';
import { step } from '../navHistory';

describe('the trail of pages', () => {
  it('starts with the page you are on', () => expect(step([], '#/room')).toEqual(['#/room']));
  it('adds the page you go to', () => expect(step(['#/room'], '#/tools')).toEqual(['#/room', '#/tools']));
  it('goes back one when the page is the one before — the browser Back', () =>
    expect(step(['#/room', '#/tools', '#/tools/capability'], '#/tools')).toEqual(['#/room', '#/tools']));
  it('stays put when the page has not moved', () => expect(step(['#/room', '#/tools'], '#/tools')).toEqual(['#/room', '#/tools']));
  it('swaps the last page when it is replaced in place, never adding one', () =>
    expect(step(['#/room', '#/tools'], '#/tools?route=rejects', true)).toEqual(['#/room', '#/tools?route=rejects']));
  it('keeps a page visited twice twice when it is not a step back', () =>
    expect(step(['#/room', '#/tools', '#/lines/a'], '#/room')).toEqual(['#/room', '#/tools', '#/lines/a', '#/room']));
  it('keeps at most sixty', () => {
    let t: string[] = [];
    for (let i = 0; i < 80; i++) t = step(t, `#/p${i}`);
    expect(t.length).toBe(60);
    expect(t[59]).toBe('#/p79');
  });
});
