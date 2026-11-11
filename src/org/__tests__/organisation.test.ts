import { describe, it, expect } from 'vitest';
import {
  LOCAL_ORG, businessNameFrom, covers, inviteProblem, leavesNoAdmin, linesFor, memberId, newMember, orgCan, peopleSays, roleOf, scopeSays,
  type OrgMember,
} from '../organisation';
import { accessOf, accessOfRole } from '../../lib/access';
import type { Workspace } from '../../types';

const line = (name: string, siteName?: string, areaName?: string): Workspace =>
  ({ id: name, name, siteName, areaName, color: '', createdAt: 0, updatedAt: 0, categories: [], subcategories: {}, assets: [], shifts: [], schemaVersion: 1 });
const m = (email: string, role: OrgMember['role'], sites: string[] = [], areas: string[] = []): OrgMember => newMember('o1', email, role, { sites, areas }, 'u1', 1);

describe('the business — roles and scope (docs/ORGANISATION.md)', () => {
  it('a scope reaches the lines in its sites and areas, as the database compares them', () => {
    const pack = line('L1', 'Hull', 'Packing'), disp = line('L2', 'Hull', 'Dispatch'), none = line('L3');
    expect(covers(m('a@x.co', 'team'), none)).toBe(true);                          // no scope: the whole business
    expect(covers(m('a@x.co', 'team', [], [' packing ']), pack)).toBe(true);        // case and spaces
    expect(covers(m('a@x.co', 'team', [], ['Packing']), disp)).toBe(false);
    expect(covers(m('a@x.co', 'team', ['Hull']), none)).toBe(false);               // a line with no site is outside a site scope
    expect(linesFor(m('a@x.co', 'team', ['Hull'], ['Dispatch']), [pack, disp, none]).map(w => w.id)).toEqual(['L2']);
  });
  it('says the scope and the people in words', () => {
    expect(scopeSays(m('a@x.co', 'team'))).toBe('All of the business');
    expect(scopeSays(m('a@x.co', 'team', ['Hull'], ['Packing', 'Dispatch']))).toBe('Hull · Packing, Dispatch');
    expect(peopleSays([m('a@x.co', 'admin'), m('b@x.co', 'team', [], ['Packing']), { ...m('c@x.co', 'viewer'), deletedAt: 5 }]))
      .toBe('2 people · 1 administrator · 1 with a scope');
    expect(peopleSays([])).toMatch(/^Nobody yet/);
  });
  it('each role on the ladder: only a viewer may not edit, only an administrator manages people', () => {
    expect(orgCan('viewer')).toMatchObject({ edit: false, agree: false, start: false, people: false });
    expect(orgCan('team')).toMatchObject({ edit: true, agree: false, start: false, people: false });
    expect(orgCan('manager')).toMatchObject({ edit: true, agree: true, start: true, people: false });
    expect(orgCan('admin').people).toBe(true);
    expect(accessOfRole('viewer')).toBe('client');
    expect(accessOfRole('team')).toBe('team');
  });
  it('a business viewer is a client on a project, but owner, team and client stand as they were', () => {
    const base = { signedIn: true, myId: 'me', ownerId: 'them', mine: { access: 'team' } };
    expect(accessOf(base)).toBe('team');
    expect(accessOf({ ...base, orgRole: 'viewer' })).toBe('client');
    expect(accessOf({ ...base, orgRole: 'manager' })).toBe('team');                 // never more than the project gives
    expect(accessOf({ ...base, ownerId: 'me', orgRole: 'viewer' })).toBe('owner');   // what they own stays theirs
    expect(accessOf({ signedIn: false })).toBe('owner');
  });
  it('an invite is checked, keyed by business and email, and never leaves the business with no administrator', () => {
    const list = [m('a@x.co', 'admin'), m('b@x.co', 'team')];
    expect(inviteProblem('nope', list)).toMatch(/email address/);
    expect(inviteProblem(' B@X.co ', list)).toMatch(/already/);
    expect(inviteProblem('c@x.co', list)).toBeNull();
    expect(memberId('o1', ' C@X.co')).toBe('o1:c@x.co');
    expect(leavesNoAdmin(list, memberId('o1', 'a@x.co'), 'team')).toBe(true);
    expect(leavesNoAdmin(list, memberId('o1', 'a@x.co'))).toBe(true);
    expect(leavesNoAdmin(list, memberId('o1', 'b@x.co'))).toBe(false);
  });
  it('the business named from its lines, as the backfill names it; my role in it', () => {
    expect(businessNameFrom([{ clientName: 'Acme' }, { clientName: 'Brook' }, { clientName: ' Acme ' }, {}])).toBe('Acme');
    expect(businessNameFrom([{}])).toBe('My business');
    const org = { id: 'o1', createdBy: 'u1' };
    expect(roleOf(org, [m('b@x.co', 'viewer')], { id: 'u1', email: 'u1@x.co' })).toBe('admin');
    expect(roleOf(org, [m('b@x.co', 'viewer')], { id: 'u2', email: 'B@x.co' })).toBe('viewer');
    expect(roleOf(org, [], { id: 'u3', email: 'c@x.co' })).toBeUndefined();
    expect(roleOf({ id: LOCAL_ORG }, [], {})).toBe('admin');
  });
});
