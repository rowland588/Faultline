/* WHAT LUNA ALREADY KNOWS OF THE FILES IN HAND (21 November 2026, docs/LUNA-AGENT.md G3).
 *
 * Rowland, 21 November: "Luna linked to data … no more analysis, Luna knows everything. Ask her a question."
 *
 * With every question Luna is told the files of the customer in hand (colleague/turnRules conversationFocus) — each by its name, what
 * it holds and whose. Since today she is also told what each one SAYS: the headline of its first look, written again from the snapshot
 * kept on the file's record (lib/workbook/standing snapSays). So a question the headline answers is answered at once — no file attached,
 * no sheet named, no step — in any conversation, on any device.
 *
 * What it keeps to:
 *   only the files it is given — the customer in hand's (capabilities/data sourcesInHand); another customer's, and an archived
 *     customer's, never reach it;
 *   the newest reading speaks for a file — an earlier reading of the same link or Microsoft file is listed in a short line, never said;
 *   what CHANGED between the last two readings of a file is said under what it says (G2b) — the look's own words, kept on its record;
 *   small — the newest KNOWS.most files that have a headline, each a line no longer than lib/workbook/standing STANDING.chars;
 *   nothing new worked — every figure is one the first look worked in code when the file was read, so each is checked in her answer
 *     as the app's own (the turn's context is among what the figure check reads).
 * Pure. */
import type { Source } from '../lib/data/sources';
import { snapSays } from '../lib/workbook/standing';
import { earlierReadings } from '../lib/data/sources';
import { CHANGED, IT_SAYS } from './conversation';

export const KNOWS = { /** How many files are said with what they say. */ most: 6, /** How long what changed may be. */ changed: 520, /** How many days what changed is still told as news. */ newsDays: 7 } as const;
const DAY_MS = 86_400_000;
/** Said beside what changed while the note of it is still up on this device (colleague/KeepUpNews) — her cue to say it unasked, once. */
export const NOT_SHOWN = 'the person has not been shown this yet';

/** What one file says — nothing when no first look of it was kept (a document, a table read as evidence, a workbook with no table to
 *  lead with). */
export const saysOf = (s: Source): string | undefined => snapSays(s.facts.look?.snap);

const day = (t: number) => new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const clip = (x: string, n: number) => (x.length <= n ? x : `${x.slice(0, n - 1).replace(/\s+\S*$/, '')}…`);

/** WHAT CHANGED in a file since the reading before it (G2b) — the look's own words, kept on its record (capabilities/look workLook):
 *  the day of the reading it was compared with, and the paragraphs. Nothing when it was not compared with anything. */
export function changedOf(s: Source): { at: number; name: string; paragraphs: string[] } | undefined {
  const l = s.facts.look;
  return l?.since?.length && l.comparedWith ? { at: l.comparedWith.at, name: l.comparedWith.name, paragraphs: l.since } : undefined;
}

/** WHAT LUNA SAYS IN THE CONVERSATION when the person asks to be shown a file she read by herself (colleague/KeepUpNews, Show me):
 *  that it changed and she has read it, what changed, and what it says now — every word worked in code. */
export function changedSaid(s: Source): string {
  const c = changedOf(s), says = saysOf(s);
  return [
    /* compared with nothing — the version before had no table to lead with, or this one reads as another report: only that is said,
       never a reason the app does not know (22 November, the review) */
    c ? `“${s.facts.name}” has changed since I read it on ${day(c.at)} — I have read the new version.` : `“${s.facts.name}” has changed — I have read the new version. It is not compared with the version before.`,
    ...(c?.paragraphs ?? []),
    ...(says ? [`What it says now: ${says}`] : []),
  ].join('\n\n');
}

/** THE FILES AS LUNA IS TOLD THEM: each in its line (`line`), and under the newest `most` that have one, what it says — and, where it
 *  is a newer version of a linked file, what changed since the reading before. An earlier reading of the same linked file is listed in
 *  a short line of its own (`line` is told it is one) and never said: the newest reading speaks for the file. `list` is newest first.
 *
 *  WHAT CHANGED IS NEWS, AND NEWS GOES STALE (22 November, the review): it is said with the day the newer version came in, for
 *  KNOWS.newsDays days after it (given `now`) — then only what the file says is told; and while the note of it is still up on this
 *  device (`unseen`, the ids of the files she read by herself and the person has not acknowledged) it says so, which is her one cue to
 *  say it unasked. */
export function filesKnown(list: readonly Source[], line: (s: Source, o: { earlier: boolean }) => string, most: number = KNOWS.most, o: { now?: number; unseen?: ReadonlySet<string> } = {}): string[] {
  const earlier = earlierReadings(list);
  let said = 0;
  return list.map(s => {
    if (earlier.has(s.id)) return line(s, { earlier: true });
    const base = line(s, { earlier: false });
    const says = said < most ? saysOf(s) : undefined;
    if (!says) return base;
    said += 1;
    const c = changedOf(s);
    const news = !!c && (o.now === undefined || o.now - s.at <= KNOWS.newsDays * DAY_MS);
    return `${base}\n    ${IT_SAYS}: ${says}${c && news ? `\n    ${CHANGED} (this version came in ${day(s.at)}${o.unseen?.has(s.id) ? ` — ${NOT_SHOWN}` : ''}): ${clip(c.paragraphs.join(' '), KNOWS.changed)}` : ''}`;
  });
}
