/* WHO CAN DO WHAT ON A PROJECT — the screens' half of
 * supabase/ACCESS_LEVELS.sql. The two must say the same thing: a button the
 * database would refuse is a button that lies. */
import { describe, expect, it } from 'vitest';
import { accessLine, accessOf, can, mayWriteAgreement } from '../access';

const me = { signedIn: true, myId: 'u-me', myEmail: 'me@x.com' };

describe('whose project it is', () => {
  it('is the owner’s on a device that is not signed in, or for a project never synced', () => {
    expect(accessOf({ signedIn: false, ownerId: 'u-other' })).toBe('owner');
    expect(accessOf({ ...me })).toBe('owner');
  });
  it('is the owner’s for its owner and for the administrator', () => {
    expect(accessOf({ ...me, ownerId: 'u-me' })).toBe('owner');
    expect(accessOf({ ...me, ownerId: 'u-other', isSuper: true, mine: { access: 'client' } })).toBe('owner');
  });
  it('makes an invited person the team unless they were invited as a client', () => {
    expect(accessOf({ ...me, ownerId: 'u-other', mine: { access: 'team' } })).toBe('team');
    expect(accessOf({ ...me, ownerId: 'u-other', mine: null })).toBe('team');
    expect(accessOf({ ...me, ownerId: 'u-other', mine: { access: 'client' } })).toBe('client');
  });
});

describe('what each may do', () => {
  it('lets the owner do everything', () => {
    expect(can('owner')).toEqual({ level: 'owner', edit: true, agree: true, remove: true, people: true });
  });
  it('lets the team do the work, not change the agreement or delete', () => {
    expect(can('team')).toEqual({ level: 'team', edit: true, agree: false, remove: false, people: false });
  });
  it('lets a client change nothing', () => {
    expect(can('client')).toEqual({ level: 'client', edit: false, agree: false, remove: false, people: false });
  });
  it('lets the team write a "passes if" nobody has written, and not one that is agreed', () => {
    expect(mayWriteAgreement(can('team'), '')).toBe(true);
    expect(mayWriteAgreement(can('team'), '  ')).toBe(true);
    expect(mayWriteAgreement(can('team'), 'Within ±1.5 g')).toBe(false);
    expect(mayWriteAgreement(can('owner'), 'Within ±1.5 g')).toBe(true);
  });
  it('tells a non-owner, in one line, what they can do and who runs it', () => {
    expect(accessLine(can('owner'), 'Rowland')).toBe('');
    expect(accessLine(can('client'), 'Rowland')).toContain('Rowland runs it');
    expect(accessLine(can('team'), 'Rowland')).toContain('stay with Rowland');
    expect(accessLine(can('team'), '')).toContain('stay with the owner');
  });
});
