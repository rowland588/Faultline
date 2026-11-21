/* FOUND BY THE WORDS A PERSON TYPES (21 November 2026, CLAUDE.md "Found by its name" — Rowland: "Can't find archive client? … simple
 * things missing"). Everything matched the box against a name as one run of letters, so "archive" found Customers and "archive client"
 * — what a person actually types — found nothing. A match is now word by word: every word typed that carries meaning must be in the
 * thing's words, in any order; the little words a question is made of ("how do I", "where is the", "open", "find") are not asked for;
 * a plural, an -ing or an -ed is the word it comes from. Pure. */

/** Words that ask nothing of what is searched: the frame of a question, and the verbs of looking. */
const FILLER = new Set(['a', 'an', 'the', 'to', 'of', 'my', 'our', 'i', 'me', 'we', 'you', 'how', 'do', 'does', 'can', 'could', 'where', 'what', 'which', 'is', 'are', 'for', 'in', 'on', 'at',
  'and', 'or', 'it', 'this', 'that', 'please', 'want', 'need', 'find', 'open', 'go', 'show', 'see', 'get', 'look', 'up']);

/** The words of a search that carry meaning, lower case. */
export function wordsOf(q: string): string[] {
  return q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(w => w && !FILLER.has(w));
}

const inText = (t: string, w: string): boolean =>
  t.includes(w)
  || (w.length > 3 && w.endsWith('s') && t.includes(w.slice(0, -1)))
  || (w.length > 5 && w.endsWith('ing') && t.includes(w.slice(0, -3)))
  || (w.length > 4 && w.endsWith('ed') && t.includes(w.slice(0, -2)));

/** Does this text answer the search? Every word typed that carries meaning is in it, in any order. A search of little words alone
 *  (or nothing) asks for everything. */
export function matches(text: string, q: string): boolean {
  const ws = wordsOf(q);
  if (!ws.length) return true;
  const t = text.toLowerCase();
  return ws.every(w => inText(t, w));
}
