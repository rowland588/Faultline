/* Which line does a piece of already-written work belong to?
 *
 * Next steps and wins existed before lines had packs of their own, so they all
 * sit at project level with nothing saying whose they are. Every one of them
 * does say where it happened, though — "Line 2A", "Line 7 robot", "L10" — and
 * that is enough to propose an answer for most of them.
 *
 * PROPOSE, not decide. The guess is shown next to the text it came from and can
 * be changed or refused before anything is written, because getting this wrong
 * moves somebody's work into somebody else's pack, and a wrong guess applied
 * silently is worse than no guess at all.
 *
 * When it cannot tell, it says so rather than picking the likeliest. The
 * commonest case is deliberate: "Line 2" on a project that runs 2A and 2B is
 * genuinely ambiguous, and a coin toss there would be indistinguishable from
 * knowledge.
 */
import type { PaceLineRow } from '../db';

/** Lower case, punctuation to spaces, runs collapsed — so "Line-2A." and
 *  "line 2a" are the same thing to match against. */
const norm = (s: string): string =>
  (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/** Whole-word test, so "2" never matches inside "10" and "7" never inside "27". */
const hasWord = (haystack: string, word: string): boolean =>
  haystack === word || haystack.startsWith(word + ' ')
  || haystack.endsWith(' ' + word) || haystack.includes(' ' + word + ' ');

export type LineGuess =
  | { kind: 'line'; lineId: string; why: string }
  | { kind: 'none'; why: string };

/**
 * Read a line out of free text.
 *
 * Tried in order of how sure each rule is:
 *   1. the line's full name — "Line 2A" is not a guess, it is a statement
 *   2. its key as a word — "2a", "l7", "10"
 *   3. nothing, said plainly
 *
 * A match on two different lines is treated as no match: text naming both is
 * either about the pair or about neither, and both are the project's business
 * rather than one line's.
 */
export function guessLine(text: string, lines: PaceLineRow[]): LineGuess {
  const t = norm(text);
  if (!t) return { kind: 'none', why: 'nothing written in Where' };

  const byName = lines.filter(l => norm(l.name) && t.includes(norm(l.name)));
  if (byName.length === 1) return { kind: 'line', lineId: byName[0].id, why: `names ${byName[0].name}` };
  if (byName.length > 1) return { kind: 'none', why: 'names more than one line' };

  // "2a", or "l7" / "line 7" once the word "line" has been normalised away
  const byKey = lines.filter(l => {
    const k = norm(l.key);
    return k !== '' && (hasWord(t, k) || hasWord(t, 'l' + k) || hasWord(t, 'line ' + k));
  });
  if (byKey.length === 1) return { kind: 'line', lineId: byKey[0].id, why: `mentions ${byKey[0].key}` };
  if (byKey.length > 1) return { kind: 'none', why: 'could be more than one line' };

  /* "Line 2" on a project that splits Line 2 into 2A and 2B.
   *
   * This is the commonest unmatched case, not an edge one: the tracker names
   * lines the way the plant does, and the app splits the ones measured
   * separately. Saying "no line named" of text that plainly names a line reads
   * as the guesser being broken. Naming the halves says what the reader has to
   * decide, which is the whole job of this message. */
  const stem = t.match(/\b(\d+)\b/)?.[1];
  if (stem) {
    const family = lines.filter(l => {
      const k = norm(l.key);
      return k !== stem && k.startsWith(stem);
    });
    if (family.length > 1) {
      return { kind: 'none', why: `${stem} is split into ${family.map(l => l.key).join(' and ')} — pick one` };
    }
  }

  return { kind: 'none', why: 'no line named' };
}

/** What a whole batch would become, ready to show before any of it is written. */
export interface LineProposal<T> {
  item: T;
  /** The text the guess was read from — shown so the guess can be judged. */
  from: string;
  /** The chosen line. Starts as the guess; the reader can change it. */
  lineId: string | null;
  why: string;
}

/** Propose a line for everything that has none yet. Items already on a line are
 *  left out entirely: this is a one-time tidy-up, not a re-filing of work
 *  somebody has already placed by hand. */
export function proposeLines<T extends { lineId?: string; where: string }>(
  items: T[],
  lines: PaceLineRow[],
): LineProposal<T>[] {
  return items
    .filter(i => !i.lineId)
    .map(item => {
      const g = guessLine(item.where, lines);
      return {
        item,
        from: item.where?.trim() || '—',
        lineId: g.kind === 'line' ? g.lineId : null,
        why: g.why,
      };
    });
}
