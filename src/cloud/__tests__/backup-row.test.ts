/* When backup speaks on a page, and when it only puts a dot on the account button (13 November — Rowland, of "6 files still to back up ·
 * 9 only on the phone that took them" at the top of his first page: "I don't need to see any of that"). */
import { describe, expect, it } from 'vitest';
import { syncNeedsYou, syncTrouble } from '../CloudPanel';

type S = Parameters<typeof syncTrouble>[0];
const st = (o: Partial<S>): S => ({ state: 'idle', ...o } as S);

describe('the Backup row on a page', () => {
  it('files still moving are not a banner — they are the dot and the Account sheet', () => {
    const moving = st({ pendingUp: 6, missingDown: 9 });
    expect(syncNeedsYou(moving)).toBe(false);
    expect(syncTrouble(moving)).toBe(true);
  });
  it('backup needing the person still speaks on the page', () => {
    for (const s of [st({ state: 'error' }), st({ refused: [{ kind: 'studies' }] as never }), st({ overwritten: [{}] as never }), st({ tooBig: [{ key: 'k', bytes: 1 }] as never }), st({ schemaOutdated: true } as never)]) {
      expect(syncNeedsYou(s)).toBe(true);
    }
  });
  it('all backed up says nothing anywhere', () => {
    expect(syncNeedsYou(st({}))).toBe(false);
    expect(syncTrouble(st({}))).toBe(false);
  });
});
