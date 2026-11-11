/* THE BUSINESS ON THIS DEVICE, its records — read, made, named, its people invited, changed and removed (11 November,
 * docs/ORGANISATION.md O1–O2; supabase/ORGANISATIONS.sql, ORG_PEOPLE.sql). No screen and no session here, so the sync engine can call
 * adoptLocalBusiness directly; the hook the screens use is org/orgStore.
 *
 * WHICH BUSINESS IS MINE: signed in, the one whose id is my own (the backfill and the first sign-in make it so — one id on every device,
 * never a second business made on a second phone), else one I made, else the first I was invited to. Not signed in: this device's own
 * (LOCAL_ORG), made the person's own when they sign in (adoptLocalBusiness, from the sync pass before anything is sent). */
import { getDB, signalWrite } from '../db/core';
import { clearTombstones, recordTombstones, restoreRows, type Restore } from '../db/sync';
import type { Workspace } from '../types';
import {
  LOCAL_ORG, businessNameFrom, inviteProblem, isOrgRole, leavesNoAdmin, memberId, newMember, normEmail,
  type OrgMember, type OrgRole, type Organisation,
} from './organisation';

/** The meta key under which this device remembers its business, for a new line to take (db/workspaces createWorkspace). */
export const MINE_KEY = 'org.mine';

export interface Me { id?: string; email?: string }

export async function listOrganisations(): Promise<Organisation[]> {
  return (await (await getDB()).getAll('organisations')).filter(o => !o.deletedAt);
}
export async function listOrgMembers(orgId?: string): Promise<OrgMember[]> {
  const all = (await (await getDB()).getAll('organisation_members')).filter(m => !m.deletedAt);
  return (orgId ? all.filter(m => m.orgId === orgId) : all).sort((a, b) => a.createdAt - b.createdAt || a.email.localeCompare(b.email));
}

/** My business among those on the device (see the head of this file). */
export function pickBusiness(orgs: readonly Organisation[], members: readonly OrgMember[], me: Me): Organisation | undefined {
  if (!me.id) return orgs.find(o => o.id === LOCAL_ORG);
  const email = me.email ? normEmail(me.email) : '';
  return orgs.find(o => o.id === me.id)
    ?? orgs.find(o => o.createdBy === me.id)
    ?? [...orgs].sort((a, b) => a.createdAt - b.createdAt).find(o => members.some(m => m.orgId === o.id && m.email === email));
}

export async function remember(id: string | undefined): Promise<void> {
  const db = await getDB();
  if (id) await db.put('meta', id, MINE_KEY); else await db.delete('meta', MINE_KEY);
}

/** MAKE THE BUSINESS — the person's own (their id), named from their lines' client name unless named here, and their own lines with no
 *  business put into it; signed in, they are its first person, as administrator. Idempotent: an existing one is returned as it is. */
export async function ensureBusiness(me: Me, name?: string): Promise<Organisation> {
  const db = await getDB();
  const id = me.id ?? LOCAL_ORG;
  const had = await db.get('organisations', id);
  if (had && !had.deletedAt) return had;
  const lines = (await db.getAll('workspaces')) as Workspace[];
  const mine = lines.filter(w => !w.ownerId || w.ownerId === me.id);
  const t = Date.now();
  const org: Organisation = { id, name: name?.trim() || businessNameFrom(mine), ...(me.id ? { createdBy: me.id } : {}), createdAt: t, updatedAt: t };
  await db.put('organisations', org);
  if (me.email) await db.put('organisation_members', newMember(id, me.email, 'admin', {}, me.id, t));
  for (const w of mine) if (!w.orgId) await db.put('workspaces', { ...w, orgId: id, updatedAt: t });
  await remember(id);
  signalWrite();
  return org;
}

/** NAME THE BUSINESS (its administrator only — the screens offer it to nobody else, the database refuses anybody else). */
export async function renameBusiness(org: Organisation, name: string): Promise<{ ok: true } | { ok: false; why: string }> {
  const n = name.trim();
  if (!n) return { ok: false, why: 'A business needs a name.' };
  await (await getDB()).put('organisations', { ...org, name: n.slice(0, 120), updatedAt: Date.now() });
  signalWrite();
  return { ok: true };
}

/** INVITE SOMEBODY — by email, with a role and, if wanted, the sites and areas they may see. The row is the invite: on the cloud a
 *  trigger puts the address on the front door (allowed_emails, scope 'org'; ORG_PEOPLE.sql), so they can make an account. Somebody
 *  removed earlier is the same row brought back. */
export async function inviteToBusiness(org: Organisation, email: string, role: OrgRole, scope: { sites?: string[]; areas?: string[] }, me: Me): Promise<{ ok: true; member: OrgMember } | { ok: false; why: string }> {
  if (!isOrgRole(role)) return { ok: false, why: 'Pick a role.' };
  const why = inviteProblem(email, await listOrgMembers(org.id));
  if (why) return { ok: false, why };
  const db = await getDB();
  const m = newMember(org.id, email, role, scope, me.id, Date.now());
  await db.put('organisation_members', m);
  await clearTombstones([m.id]);
  signalWrite();
  return { ok: true, member: m };
}

/** CHANGE A ROLE, or where they may look. Never leaves the business with no administrator. */
export async function changeMember(m: OrgMember, patch: { role?: OrgRole; sites?: string[]; areas?: string[] }): Promise<{ ok: true } | { ok: false; why: string }> {
  const all = await listOrgMembers(m.orgId);
  if (patch.role && patch.role !== 'admin' && leavesNoAdmin(all, m.id, patch.role)) return { ok: false, why: 'The business needs an administrator — make somebody else one first.' };
  const clean = (xs?: string[]) => (xs ? [...new Set(xs.map(x => x.trim()).filter(Boolean))] : undefined);
  const next: OrgMember = { ...m, ...(patch.role ? { role: patch.role } : {}), ...(patch.sites ? { sites: clean(patch.sites) ?? [] } : {}), ...(patch.areas ? { areas: clean(patch.areas) ?? [] } : {}), updatedAt: Date.now() };
  await (await getDB()).put('organisation_members', next);
  signalWrite();
  return { ok: true };
}

/** REMOVE SOMEBODY — off the business on every device (its tombstone); the answer puts them back (Undo). Their account stays: they
 *  simply see none of the business's lines. */
export async function removeFromBusiness(m: OrgMember): Promise<{ ok: true; undo: Restore } | { ok: false; why: string }> {
  if (leavesNoAdmin(await listOrgMembers(m.orgId), m.id)) return { ok: false, why: 'The business needs an administrator — make somebody else one first.' };
  const db = await getDB();
  const row = await db.get('organisation_members', m.id);
  if (!row) return { ok: false, why: 'They are not on the list any more.' };
  await db.delete('organisation_members', m.id);
  await recordTombstones('organisation_members', [m.id]);
  signalWrite();
  return { ok: true, undo: async () => { await restoreRows('organisation_members', [row]); } };
}

/** SIGNING IN ON A DEVICE THAT HAD A BUSINESS OF ITS OWN — it becomes the person's own (their id), its people and lines with it, before
 *  anything is sent; the device's own rows are taken away without a tombstone (they were never in the cloud). Called by the sync pass. */
export async function adoptLocalBusiness(me: { id: string; email: string }): Promise<void> {
  const db = await getDB();
  const local = await db.get('organisations', LOCAL_ORG);
  const members = (await db.getAll('organisation_members')).filter(m => m.orgId === LOCAL_ORG);
  if (local) {
    const theirs = await db.get('organisations', me.id);
    if (!theirs) await db.put('organisations', { ...local, id: me.id, createdBy: me.id, updatedAt: Date.now() });
    await db.delete('organisations', LOCAL_ORG);
    for (const m of members) {
      await db.delete('organisation_members', m.id);
      if (normEmail(m.email) !== normEmail(me.email)) await db.put('organisation_members', { ...m, id: memberId(me.id, m.email), orgId: me.id, invitedBy: me.id, updatedAt: Date.now() });
    }
    if (me.email) await db.put('organisation_members', newMember(me.id, me.email, 'admin', {}, me.id, Date.now()));
    for (const w of (await db.getAll('workspaces')) as Workspace[]) if (w.orgId === LOCAL_ORG) await db.put('workspaces', { ...w, orgId: me.id, updatedAt: Date.now() });
  }
  const mine = pickBusiness(await listOrganisations(), await listOrgMembers(), me);
  await remember(mine?.id);
}
