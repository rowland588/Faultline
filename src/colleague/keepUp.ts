/* LUNA KEEPS UP BY HERSELF (21 November 2026, docs/LUNA-AGENT.md G2).
 *
 * Rowland, 21 November: "the path for the app is … Luna linked to data … Luna knows everything … a live humanistic person like Iron
 * Man's Jarvis" — and, the same day, "it's to get to the level of ChatGPT agent, fully agentic".
 *
 * A file Luna is LINKED to — read by its link, or chosen from SharePoint or OneDrive — was checked for a newer version only when the
 * person opened Files and pressed Check for a newer version (colleague/LunaFiles). So she knew what the file said on the day it was
 * read, and nothing since, unless somebody remembered. Now, when Luna is opened, she checks for herself: every linked file of the
 * customer in hand that has not been looked at in the last few hours is asked for again, and one that has changed is SAID — its name,
 * and Read it — where the person will see it, without being asked.
 *
 * What it keeps to:
 *   only the customer in hand — a file is listed by capabilities/data standingOf, so another customer's, and an archived customer's,
 *     is never fetched (a file belongs to a customer; archived, it is put away with it);
 *   quiet when nothing changed — the check is stamped on this device and not made again for KEEP_UP.everyMs;
 *   small — at most KEEP_UP.most a visit, and a link is only fetched by itself when the file kept is no bigger than KEEP_UP.maxBytes
 *     (the check fetches the whole file, and a phone may be on its own signal); a bigger one stays the person's to check;
 *   nothing changed by checking — a newer version is READ only on the person's press, exactly as an upload is; the version read before
 *     stays in the register;
 *   no AI — the check is a fingerprint against the one kept (a link) or a version against the one kept (Microsoft), and what changed is
 *     the first look's own "since the last", worked in code.
 *
 * `linkedOf` and `dueNow` are pure; `keepUp` is given what does the asking, so its rules are tested with no cloud. */
import type { FileOrigin, Source } from '../lib/data/sources';
import type { LinkOrigin } from '../lib/fileLink/link';
import type { MsItem, MsOrigin } from '../lib/microsoft/graph';

export const KEEP_UP = { everyMs: 4 * 60 * 60_000, most: 4, maxBytes: 15 * 1024 * 1024 } as const;

/** A file as it is listed for the customer in hand, with whose it is (colleague/LunaFiles rows). */
export type InHand = Source & { whose: string };

/** One linked thing, whichever version of it was read last: a link's address, a Microsoft file's place. */
export const originKey = (o: FileOrigin): string => (o.kind === 'link' ? `link:${o.url}` : `ms:${o.driveId}:${o.itemId}`);

export interface Linked {
  key: string;
  /** The newest record read from it. */
  source: InHand;
  origin: FileOrigin;
  /** When it was last looked at: when that record was read, or a later check on this device. */
  checkedAt: number;
}

/** THE LINKED FILES IN HAND — the newest record of each link or Microsoft file, with when it was last looked at. A file that was
 *  uploaded has nothing to be checked against and is not among them. */
export function linkedOf(rows: readonly InHand[], stamps: Readonly<Record<string, number>>): Linked[] {
  const by = new Map<string, Linked>();
  for (const s of rows) {
    const o = s.facts.origin;
    if (!o) continue;
    const key = originKey(o);
    const had = by.get(key);
    if (had && had.source.facts.at >= s.facts.at) continue;
    by.set(key, { key, source: s, origin: o, checkedAt: Math.max(s.facts.at ?? 0, o.kind === 'link' ? o.checkedAt ?? 0 : 0, stamps[key] ?? 0) });
  }
  return [...by.values()];
}

/** WHICH ARE DUE A LOOK NOW — not looked at within `everyMs`, the longest unlooked-at first, at most `most`; a link whose file is
 *  bigger than `maxBytes` is never fetched by itself. */
export function dueNow(linked: readonly Linked[], now: number, o: { everyMs: number; most: number; maxBytes: number } = KEEP_UP): Linked[] {
  return linked
    .filter(l => now - l.checkedAt >= o.everyMs)
    .filter(l => l.origin.kind !== 'link' || (l.source.facts.bytes ?? 0) <= o.maxBytes)
    .sort((a, b) => a.checkedAt - b.checkedAt)
    .slice(0, o.most);
}

/** A file that has changed since Luna read it — with what is needed to read the newer version on the person's press. */
export type News = { key: string; source: InHand } & ({ kind: 'link'; file: File; origin: LinkOrigin } | { kind: 'microsoft'; item: MsItem; origin: MsOrigin });

export interface KeepUpDeps {
  /** The link asked for again — its file and whether its fingerprint differs from the one kept (lib/fileLink/link linkNewerThan). */
  link: (o: LinkOrigin) => Promise<{ newer: boolean; file: File; origin: LinkOrigin }>;
  /** A Microsoft file's version against the one kept (lib/microsoft/graph newerThan). Throws when the person is not signed in to Microsoft. */
  microsoft: (o: MsOrigin) => Promise<{ newer: boolean; item: MsItem }>;
  now: () => number;
  /** When each linked thing was last checked on this device, and the way to note a check. */
  stamps: () => Record<string, number>;
  stamp: (key: string, at: number) => void;
  /** The check could not be made for want of a sign-in — tried again next time, never stamped as looked at. */
  needsSignIn: (e: unknown) => boolean;
}

export interface KeptUp { checked: number; news: News[]; /** Not looked at this time: no sign-in, or the asking failed. */ skipped: number }

/** THE LOOK ITSELF: each file due is asked for again, one after another; what changed is given back to be said. A file that could not
 *  be asked for (no signal, the link gone) is noted as looked at all the same — it is tried again after `everyMs`, not at every opening;
 *  one that only wants a sign-in is left for the next opening. Nothing is read, registered or changed here. */
export async function keepUp(rows: readonly InHand[], deps: KeepUpDeps): Promise<KeptUp> {
  const due = dueNow(linkedOf(rows, deps.stamps()), deps.now());
  const out: KeptUp = { checked: 0, news: [], skipped: 0 };
  for (const l of due) {
    try {
      if (l.origin.kind === 'link') {
        const r = await deps.link(l.origin);
        if (r.newer) out.news.push({ key: l.key, source: l.source, kind: 'link', file: r.file, origin: r.origin });
      } else {
        const r = await deps.microsoft(l.origin);
        if (r.newer) out.news.push({ key: l.key, source: l.source, kind: 'microsoft', item: r.item, origin: l.origin });
      }
      out.checked += 1;
      deps.stamp(l.key, deps.now());
    } catch (e) {
      out.skipped += 1;
      if (!deps.needsSignIn(e)) deps.stamp(l.key, deps.now());
    }
  }
  return out;
}

/* ------------------------------------------------------------------ this device's note of each check */

const KEY = 'faultline.keepup';
export function readStamps(): Record<string, number> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    return v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter((e): e is [string, number] => typeof e[1] === 'number')) : {};
  } catch { return {}; }
}
export function writeStamp(key: string, at: number): void {
  try {
    const all = readStamps();
    all[key] = at;
    /* only the newest two hundred are kept — a device never grows this without end */
    const kept = Object.fromEntries(Object.entries(all).sort((a, b) => b[1] - a[1]).slice(0, 200));
    localStorage.setItem(KEY, JSON.stringify(kept));
  } catch { /* a device that keeps nothing checks again next time */ }
}
