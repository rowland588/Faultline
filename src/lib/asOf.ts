/* "UP TO DATE AS OF 09:12" — the stamp beside the plan.
 *
 * The moment a manager walks up and the laptop is turned round, the one
 * thing the person showing the plan must know is whether it is current. The
 * account row says when this device last synced, but it is on Home; this is
 * the same fact beside the plan, and on the plan's PDF. A day without a sync
 * is the abnormal case, and goes amber (visual management rule 2). */
const DAY = 86_400_000;

export interface AsOf { words: string; stale: boolean }

const clock = (at: number) => new Date(at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
const day = (at: number) => new Date(at).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

/** `null` = this device is not signed in to the cloud: the plan is this
 *  device's own, and the stamp says nothing rather than something untrue. */
export function asOfWords(lastSyncedAt: number | null | undefined, signedIn: boolean, now = Date.now()): AsOf | null {
  if (!signedIn) return null;
  if (!lastSyncedAt) return { words: 'Not synced yet on this device', stale: true };
  const age = now - lastSyncedAt;
  if (age < DAY) return { words: `Up to date as of ${clock(lastSyncedAt)}`, stale: false };
  const days = Math.floor(age / DAY);
  return { words: `Last synced ${days === 1 ? 'yesterday' : `${days} days ago`} · ${day(lastSyncedAt)} ${clock(lastSyncedAt)}`, stale: true };
}
