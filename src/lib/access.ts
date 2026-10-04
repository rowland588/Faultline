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
 * owner's: nobody else is there to be limited. */

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
}

export function accessOf(x: AccessInput): Access {
  if (!x.signedIn || !x.ownerId || x.isSuper || x.ownerId === x.myId) return 'owner';
  return x.mine?.access === 'client' ? 'client' : 'team';
}

/** A "passes if" a team member may still write: only one nobody has written yet. */
export const mayWriteAgreement = (c: Can, current: string | null | undefined): boolean =>
  c.agree || !(current ?? '').trim();

/** The one line a non-owner reads at the top of a job, saying what they can do. */
export function accessLine(c: Can, ownerName: string): string {
  const who = ownerName.trim() || 'The owner';
  if (c.level === 'client') return `You can read this job and take its reports. ${who} runs it.`;
  if (c.level === 'team') return `You’re on the team: do the work here. What was agreed — the dates, the stages, what a test must show — and deleting stay with ${who}.`;
  return '';
}
