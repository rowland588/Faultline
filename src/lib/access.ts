/* WHO CAN DO WHAT ON A PROJECT — supabase/ACCESS_LEVELS.sql is the guarantee,
 * this is the same rule for the screens, so a button is never offered that
 * the database would refuse.
 *
 * Rowland, 4 October: "If I invite you to a project, you should have
 * limitations, because I still need to be able to control what's happening."
 * Every comparable app (Asana, Fieldwire, Basecamp, Procore, Smartsheet) gives
 * a project a short ladder picked once per person. Faultline's has three:
 *
 *   owner   the project's owner (or the administrator) — everything.
 *   team    does the work — ticks steps, runs tests, logs fixes and findings,
 *           adds photos — but does not change what was AGREED (the handover
 *           dates, the stage lists, a test's "passes if" once written) and
 *           deletes nothing.
 *   client  reads it and takes the reports. Changes nothing.
 *
 * A device that is not signed in, or a project that has never synced, is the
 * owner's: nobody else is there to be limited.
 *
 * THE BUSINESS'S ROLES (11 November, docs/ORGANISATION.md; src/org/organisation) sit ON this ladder, never beside it: a business's
 * viewer reads and takes the papers — a client, whatever a project says — and the other four keep what the project gives them. A
 * role never gives more than the project's own list (the database's is_project_editor is unchanged by it). */
import type { OrgRole } from '../org/organisation';

export type Access = 'owner' | 'team' | 'client';

export interface Can {
  level: Access;
  /** Add and change the work: steps, tests, fixes, findings, photos, notes. */
  edit: boolean;
  /** Change what was agreed: handover dates, stage lists, a written "passes if", the method. */
  agree: boolean;
  /** Delete or archive anything. */
  remove: boolean;
  /** Invite and remove people. */
  people: boolean;
}

export const can = (level: Access): Can => ({
  level,
  edit: level !== 'client',
  agree: level === 'owner',
  remove: level === 'owner',
  people: level === 'owner',
});

export interface AccessInput {
  /** Signed in to the cloud. Not signed in → everything here is this device's own. */
  signedIn: boolean;
  myId?: string;
  myEmail?: string;
  isSuper?: boolean;
  /** The project's owner, as synced. Absent → made on this device, never synced. */
  ownerId?: string;
  /** This person's own row on the project's people list, if any. */
  mine?: { access?: string | null } | null;
  /** This person's role in the business, when they have one. A viewer is a client everywhere but on what they own. */
  orgRole?: OrgRole;
}

export function accessOf(x: AccessInput): Access {
  if (x.isSuper || (x.signedIn && x.ownerId && x.ownerId === x.myId)) return 'owner';
  if (x.orgRole === 'viewer') return 'client';
  if (!x.signedIn || !x.ownerId) return 'owner';
  return x.mine?.access === 'client' ? 'client' : 'team';
}

/** The project ladder's level for a business role forced in development, or as the database would treat it. */
export const accessOfRole = (r: OrgRole): Access => (r === 'viewer' ? 'client' : r === 'team' || r === 'manager' ? 'team' : 'owner');

/** A "passes if" a team member may still write: only one nobody has written yet. */
export const mayWriteAgreement = (c: Can, current: string | null | undefined): boolean =>
  c.agree || !(current ?? '').trim();

/** The one line a non-owner reads at the top of a job, saying what they can do. */
export function accessLine(c: Can, ownerName: string): string {
  const name = ownerName.trim();
  if (c.level === 'client') return `You can read this project and take its reports. ${name || 'The owner'} runs it.`;
  if (c.level === 'team') return `You’re on the team: do the work here. What was agreed — the dates, the stages, what a test must show — and deleting stay with ${name || 'the owner'}.`;
  return '';
}
