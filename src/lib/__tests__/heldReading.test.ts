/* A READING HELD OVER FROM THE LAST SCREEN (lib/heldReading): drawn from at
   once while nothing has changed, never once anything has — a job just made
   must not read as "not here" on the next screen. */
import { describe, expect, it } from 'vitest';
import { heldReading } from '../heldReading';
import { signalData } from '../../db';

describe('a held reading', () => {
  it('is used while nothing has been written since it was read', () => {
    const h = heldReading<string[]>();
    h.keep('p1', ['Install'], h.started());
    expect(h.get('p1')).toEqual(['Install']);
  });

  it('is not used once anything has been written — the next screen reads afresh', () => {
    const h = heldReading<string[]>();
    h.keep('p1', ['Install'], h.started());
    signalData();
    expect(h.get('p1')).toBeUndefined();
  });

  it('a read that began before a write is not kept as current', () => {
    const h = heldReading<string[]>();
    const early = h.started();
    signalData();
    h.keep('p1', ['old'], early);
    expect(h.get('p1')).toBeUndefined();
    h.keep('p1', ['new'], h.started());
    expect(h.get('p1')).toEqual(['new']);
  });
});
