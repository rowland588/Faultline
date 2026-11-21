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
 *   the newest reading speaks for a file — an older version of the same link or Microsoft file is still listed, but not said twice;
 *   small — the newest KNOWS.most files that have a headline, each a line no longer than lib/workbook/standing STANDING.chars;
 *   nothing new worked — every figure is one the first look worked in code when the file was read, so each is checked in her answer
 *     as the app's own (the turn's context is among what the figure check reads).
 * Pure. */
import type { Source } from '../lib/data/sources';
import { snapSays } from '../lib/workbook/standing';
import { IT_SAYS } from './conversation';
import { originKey } from './keepUp';

export const KNOWS = { /** How many files are said with what they say. */ most: 6 } as const;

/** What one file says — nothing when no first look of it was kept (a document, a table read as evidence, a workbook with no table to
 *  lead with). */
export const saysOf = (s: Source): string | undefined => snapSays(s.facts.look?.snap);

/** THE FILES AS LUNA IS TOLD THEM: each in its line (`line`), and under the newest `most` that have one, what it says. `list` is
 *  newest first. */
export function filesKnown(list: readonly Source[], line: (s: Source) => string, most: number = KNOWS.most): string[] {
  const spoken = new Set<string>();
  let said = 0;
  return list.map(s => {
    const base = line(s);
    const key = s.facts.origin ? originKey(s.facts.origin) : `file:${s.id}`;
    if (said >= most || spoken.has(key)) return base;
    const says = saysOf(s);
    if (!says) return base;
    spoken.add(key);
    said += 1;
    return `${base}\n    ${IT_SAYS}: ${says}`;
  });
}
