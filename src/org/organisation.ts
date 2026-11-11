/* THE BUSINESS — a manufacturing business subscribing to Luna, its people, their roles and where each may look (11 November,
 * docs/ORGANISATION.md O1–O3; supabase/ORGANISATIONS.sql, ORG_PEOPLE.sql, ORG_VISIBILITY.sql).
 *
 * Rowland, 11 November: "Each should be able to interact with Luna according to their role, responsibilities and permissions … A team
 * leader must not automatically have access to everything a managing director can see … not unnecessary enterprise complexity."
 *
 * Pure: no database, no screen. The database is the guarantee (is_ws_member widened to the business and the person's scope; a viewer's
 * writes refused by a restrictive policy); this is the same rule for the screens, so a control is never offered that the database
 * would refuse.
 *
 * FIVE ROLES, each mapped onto the access ladder that already exists (lib/access — owner · team · client), never a second permission
 * system:
 *   admin    the business's owner, IT — everything, people included
 *   leader   MD, operations director, site manager — reads everything, changes what was agreed
 *   manager  production, engineering, maintenance, quality, technical, CI — does the work, starts projects, agrees
 *   team     team leaders, supervisors, technicians — captures, raises and works problems, runs tools
 *   viewer   an auditor, a board member who only reads, a client — reads and takes the papers
 *
 * SCOPE: a person's sites and areas, the words on each line (workspaces.site_name, area_name); none = the whole business. */
import type { Workspace } from '../types';

export type OrgRole = 'admin' | 'leader' | 'manager' | 'team' | 'viewer';

export const ORG_ROLES: readonly { role: OrgRole; name: string; who: string; can: string }[] = [
  { role: 'admin', name: 'Administrator', who: 'the business’s owner, IT', can: 'Everything, and invites people and sets their roles.' },
  { role: 'leader', name: 'Leader', who: 'managing director, operations director, site manager', can: 'Reads everything in their scope and changes what was agreed.' },
  { role: 'manager', name: 'Manager', who: 'production, engineering, maintenance, quality, CI', can: 'Does the work, starts projects and agrees them.' },
  { role: 'team', name: 'Team', who: 'team leaders, supervisors, technicians', can: 'Captures, raises and works problems, runs the tools.' },
  { role: 'viewer', name: 'Viewer', who: 'an auditor, a board member, a client', can: 'Reads and takes the papers. Changes nothing.' },
];

export const isOrgRole = (v: unknown): v is OrgRole => ORG_ROLES.some(r => r.role === v);
export const roleName = (r: OrgRole): string => ORG_ROLES.find(x => x.role === r)?.name ?? r;

export interface Organisation {
  id: string;
  name: string;
  /** Who made it (the cloud's created_by) — always its administrator. */
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

export interface OrgMember {
  /** `${orgId}:${email}` — one row a person a business, so an invite after a removal is the same row brought back. */
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  /** Where they may look — empty = the whole business. Words as the lines carry them. */
  sites: string[];
  areas: string[];
  invitedBy?: string;
  createdAt: number;
  updatedAt: number;
  deletedAt?: number;
}

/** The business of a device that is not signed in — this device's own, as a project made here is its owner's. Never sent:
 *  on signing in it becomes the person's own business (org/orgStore adoptLocalBusiness). */
export const LOCAL_ORG = 'local';

export const normEmail = (e: string): string => e.trim().toLowerCase();
export const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
export const memberId = (orgId: string, email: string): string => `${orgId}:${normEmail(email)}`;
const same = (a?: string, b?: string) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

/** What a role may do on the lines in its scope — the screens' side of ORG_VISIBILITY.sql. */
export interface OrgCan {
  role: OrgRole;
  /** Change the work: capture, raise, run tools. Not a viewer. */
  edit: boolean;
  /** Change what was agreed. */
  agree: boolean;
  /** Start projects. */
  start: boolean;
  /** Invite people, change roles, remove; name the business. */
  people: boolean;
}
export const orgCan = (role: OrgRole): OrgCan => ({
  role,
  edit: role !== 'viewer',
  agree: role === 'admin' || role === 'leader' || role === 'manager',
  start: role === 'admin' || role === 'leader' || role === 'manager',
  people: role === 'admin',
});

/** Does this person's scope reach this line? The same test as the database's (ORG_VISIBILITY.sql): every word compared without case
 *  or surrounding spaces; an empty list is the whole business; a line with no site (or area) is outside a scope that names sites. */
export function covers(m: Pick<OrgMember, 'sites' | 'areas'>, line: Pick<Workspace, 'siteName' | 'areaName'>): boolean {
  const okSite = !m.sites.length || m.sites.some(s => same(s, line.siteName) && !!line.siteName?.trim());
  const okArea = !m.areas.length || m.areas.some(a => same(a, line.areaName) && !!line.areaName?.trim());
  return okSite && okArea;
}

/** The lines a member may see of a business's lines. */
export const linesFor = (m: Pick<OrgMember, 'sites' | 'areas'>, lines: readonly Workspace[]): Workspace[] => lines.filter(w => covers(m, w));

/** Where a person may look, in words: "All of the business" · "Hull" · "Packing hall" · "Hull · Packing hall, Dispatch". */
export function scopeSays(m: Pick<OrgMember, 'sites' | 'areas'>): string {
  if (!m.sites.length && !m.areas.length) return 'All of the business';
  return [m.sites.join(', '), m.areas.join(', ')].filter(Boolean).join(' · ');
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The People page's sentence: "4 people · 1 administrator · 2 with a scope". */
export function peopleSays(members: readonly OrgMember[]): string {
  const live = members.filter(m => !m.deletedAt);
  if (!live.length) return 'Nobody yet — invite the people who work here.';
  const admins = live.filter(m => m.role === 'admin').length;
  const scoped = live.filter(m => m.sites.length || m.areas.length).length;
  return [plural(live.length, 'person', 'people'), plural(admins, 'administrator'), scoped ? `${scoped} with a scope` : ''].filter(Boolean).join(' · ');
}

/** The business's name to offer when it has none of its own: the client name its lines carry most, else "My business" — the same
 *  rule the backfill in ORGANISATIONS.sql uses. */
export function businessNameFrom(lines: readonly Pick<Workspace, 'clientName'>[]): string {
  const n = new Map<string, number>();
  for (const w of lines) { const c = w.clientName?.trim(); if (c) n.set(c, (n.get(c) ?? 0) + 1); }
  const best = [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  return best?.[0] ?? 'My business';
}

/** An invite checked before it is made: the reason in words, or null. */
export function inviteProblem(email: string, members: readonly OrgMember[]): string | null {
  const e = normEmail(email);
  if (!EMAIL.test(e)) return 'That doesn’t look like an email address.';
  if (members.some(m => !m.deletedAt && m.email === e)) return `${e} is already one of the people here.`;
  return null;
}

/** A new member row (or one removed, brought back with the new role and scope). */
export function newMember(orgId: string, email: string, role: OrgRole, scope: { sites?: string[]; areas?: string[] }, by: string | undefined, t: number): OrgMember {
  const clean = (xs?: string[]) => [...new Set((xs ?? []).map(x => x.trim()).filter(Boolean))];
  return {
    id: memberId(orgId, email), orgId, email: normEmail(email), role,
    sites: clean(scope.sites), areas: clean(scope.areas),
    ...(by ? { invitedBy: by } : {}), createdAt: t, updatedAt: t,
  };
}

/** Taking a role off somebody, or removing them, must never leave the business with no administrator. */
export function leavesNoAdmin(members: readonly OrgMember[], id: string, nextRole?: OrgRole): boolean {
  const live = members.filter(m => !m.deletedAt);
  const after = live.map(m => (m.id === id ? { ...m, role: nextRole ?? ('gone' as OrgRole) } : m));
  return live.some(m => m.role === 'admin') && !after.some(m => m.role === 'admin');
}

/** This person's role in this business: their row's, else administrator when the business is theirs (made by them, or this device's
 *  own), else none. */
export function roleOf(org: Pick<Organisation, 'id' | 'createdBy'> | undefined, members: readonly OrgMember[], me: { id?: string; email?: string }): OrgRole | undefined {
  if (!org) return undefined;
  /* its maker is always its administrator (is_org_admin in ORGANISATIONS.sql), so a business is never left with nobody to run it */
  if (org.id === LOCAL_ORG || (me.id && (org.createdBy === me.id || org.id === me.id))) return 'admin';
  const mine = me.email ? members.find(m => !m.deletedAt && m.orgId === org.id && m.email === normEmail(me.email ?? '')) : undefined;
  return mine?.role;
}
