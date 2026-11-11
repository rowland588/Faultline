/* THE BUSINESS ON THIS DEVICE, for the screens (the records themselves: org/orgData) — read, named, its people invited, their roles changed, removed with Undo (11 November,
 * docs/ORGANISATION.md O1–O2; supabase/ORGANISATIONS.sql, ORG_PEOPLE.sql). The records are synced like every other row (src/cloud
 * mappers `organisations`, `organisation_members`); the database decides who may write them (only the administrator writes the people),
 * this is the same rule for the screens.
 *
 * WHICH BUSINESS IS MINE: signed in, the one whose id is my own (the backfill and the first sign-in make it so — one id on every device,
 * never a second business made on a second phone), else one I made, else the first I was invited to. Not signed in: this device's own
 * (LOCAL_ORG), made the person's own when they sign in (adoptLocalBusiness, from the sync pass before anything is sent). */
import { useCallback, useEffect, useState } from 'react';
import { getDB, onDataChange } from '../db/core';
import type { Workspace } from '../types';
import { ensureBusiness, listOrgMembers, listOrganisations, pickBusiness, remember, type Me } from './orgData';
export { MINE_KEY, adoptLocalBusiness, changeMember, ensureBusiness, inviteToBusiness, listOrgMembers, listOrganisations, pickBusiness, removeFromBusiness, renameBusiness, type Me } from './orgData';
import { useSession, useSyncedAt } from '../cloud/session';
import { businessNameFrom, isOrgRole, orgCan, roleOf, type OrgCan, type OrgMember, type OrgRole, type Organisation } from './organisation';
import { rememberOrgRole } from './orgRole';

export interface Business {
  ready: boolean;
  /** My business, or undefined when there is none yet (a person let in to somebody else's projects only). */
  org?: Organisation;
  /** Its people, the earliest first. */
  members: OrgMember[];
  /** My role in it; on a device that is not signed in, the administrator. */
  role?: OrgRole;
  can: OrgCan;
  me: Me;
  /** Its name to offer before it is made. */
  offeredName: string;
  /** Make it now (its administrator naming it, or the first invite). */
  make: (name?: string) => Promise<Organisation>;
}

/* For trying the screens as another role in development: localStorage['faultline.access.force'] = 'viewer' | 'team' | 'manager' |
   'leader' | 'admin' — or the project ladder's 'client' (a viewer) and 'owner' (an administrator), as cloud/access useAccess reads it. */
export function forcedOrgRole(): OrgRole | undefined {
  if (!import.meta.env.DEV) return undefined;
  let v: string | null = null;
  try { v = localStorage.getItem('faultline.access.force'); } catch { /* fine */ }
  if (v === 'client') return 'viewer';
  if (v === 'owner') return 'admin';
  return isOrgRole(v) ? v : undefined;
}

/** My business, its people and what I may do — live: a change here or one the sync brings down redraws it. On first sign-in, once
 *  the first sync has been and brought nothing, the business is made (docs/ORGANISATION.md O1) — never before, so a business already
 *  in the cloud is never shadowed by a second one. */
export function useBusiness(opts: { makeOnSignIn?: boolean } = {}): Business {
  const { session } = useSession();
  const synced = useSyncedAt();
  const me: Me = { id: session?.user.id, email: session?.user.email ?? undefined };
  const [state, setState] = useState<{ ready: boolean; org?: Organisation; members: OrgMember[]; offeredName: string }>({ ready: false, members: [], offeredName: 'My business' });
  const meKey = `${me.id ?? ''}|${me.email ?? ''}`;

  const load = useCallback(async () => {
    const [orgs, members, lines] = await Promise.all([listOrganisations(), listOrgMembers(), (async () => (await getDB()).getAll('workspaces'))()]);
    const meNow: Me = { id: meKey.split('|')[0] || undefined, email: meKey.split('|')[1] || undefined };
    const org = pickBusiness(orgs, members, meNow);
    if (org) await remember(org.id);
    setState({ ready: true, org, members: org ? members.filter(m => m.orgId === org.id) : [], offeredName: businessNameFrom((lines as Workspace[]).filter(w => !w.ownerId || w.ownerId === meNow.id)) });
  }, [meKey]);

  useEffect(() => { void load(); return onDataChange(() => { void load(); }); }, [load]);

  const make = useCallback(async (name?: string) => { const o = await ensureBusiness(me, name); await load(); return o; },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meKey, load]);

  useEffect(() => {
    if (!opts.makeOnSignIn || !state.ready || state.org || !session || synced == null) return;
    /* only somebody let in to the app (not to one project) has a business of their own made for them */
    let alive = true;
    void import('../cloud/client').then(async ({ supabase }) => {
      if (!supabase) return;
      const { data, error } = await supabase.rpc('can_start_projects');
      if (alive && !error && data !== false) await make();
    }).catch(() => undefined);
    return () => { alive = false; };
  }, [opts.makeOnSignIn, state.ready, state.org, session, synced, make]);

  const real = state.org ? roleOf(state.org, state.members, me) : undefined;
  useEffect(() => { if (state.ready) rememberOrgRole(real); }, [state.ready, real]);
  const forced = forcedOrgRole();
  const role = forced ?? (state.org ? real : (session ? undefined : 'admin'));
  /* no business yet, signed in: whoever may start their own work may make it (their own), and is its administrator-to-be */
  const effective: OrgRole = role ?? (state.org ? 'viewer' : 'admin');
  return { ready: state.ready, org: state.org, members: state.members, role: role ?? (state.org ? undefined : effective), can: orgCan(effective), me, offeredName: state.offeredName, make };
}
