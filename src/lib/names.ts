/* ONE COMPANY, ONE NAME.
 *
 * "Who supplied it", "who it is done with" and "where it comes from" are typed
 * by hand, in four places, by people on a shop floor. Rowland's own job has
 * the same supplier typed three ways — Brillopak, Brilopak, Brillopak — and a
 * board that groups by what was typed shows it as three companies, each
 * owing a third of the work. "Who owes what" stopped making sense.
 *
 * NOT A SUPPLIER LIST. A list of suppliers to keep would be a new noun to
 * maintain, and the names are already on the records. This reads the names
 * that are there, decides which spellings are plainly the same company, and
 * says so — the board and the client report both group by it, and the board
 * offers to make the records agree.
 *
 * WHAT COUNTS AS THE SAME. Case and punctuation do not matter. Doubled
 * letters do not matter ("Brillopak" and "Brilopak" are the same word typed
 * by two people). And a single wrong letter does not, in a name long enough
 * that one letter cannot be a different company. Short names must match
 * exactly, so "Loma" and "Lomas" are left alone.
 */

/** "Ilapak UK" → "ilapakuk"; doubled letters collapse: "Brillopak" → "brilopak". */
export const nameKey = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(.)\1+/g, '$1');

/** Names this long may differ by one letter and still be the same company. */
const FUZZY_FROM = 7;

/** Are two names one letter apart, at most (a substitution, an insertion or a
 *  deletion)? Only ever asked of two keys already known to be long. */
function withinOne(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

export const sameName = (a: string, b: string): boolean => {
  const ka = nameKey(a), kb = nameKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  return ka.length >= FUZZY_FROM && kb.length >= FUZZY_FROM && withinOne(ka, kb);
};

export interface Spelling { name: string; n: number }
export interface Company {
  /** The spelling most often typed — what everything is shown as. */
  name: string;
  /** Every distinct spelling, most used first. More than one means the
   *  records disagree with themselves. */
  spellings: Spelling[];
}

/** Group every name typed into companies. `names` is one entry per time it was
 *  typed, duplicates and all: how often a spelling was typed is how the
 *  display name is chosen. Blank names are not companies. */
export function companies(names: readonly (string | undefined | null)[]): Company[] {
  const count = new Map<string, number>();
  for (const raw of names) {
    const s = (raw ?? '').trim().replace(/\s+/g, ' ');
    if (s) count.set(s, (count.get(s) ?? 0) + 1);
  }
  const typed = [...count.keys()];
  /* Union the spellings that are the same company. */
  const parent = typed.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < typed.length; i++) {
    for (let j = i + 1; j < typed.length; j++) {
      if (sameName(typed[i], typed[j])) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, Spelling[]>();
  typed.forEach((name, i) => {
    const g = groups.get(find(i)) ?? [];
    g.push({ name, n: count.get(name) ?? 0 });
    groups.set(find(i), g);
  });
  return [...groups.values()].map(spellings => {
    /* Case-only differences are one spelling for counting, so "ilapak uk" ×1
       and "Ilapak UK" ×3 are not two contenders. The proper-cased one is shown. */
    const byLower = new Map<string, Spelling>();
    for (const s of spellings) {
      const k = s.name.toLowerCase();
      const cur = byLower.get(k);
      if (!cur) byLower.set(k, { ...s });
      else {
        cur.n += s.n;
        if (/[A-Z]/.test(s.name) && !/[A-Z]/.test(cur.name)) cur.name = s.name;
      }
    }
    const merged = [...byLower.values()].sort((a, b) => b.n - a.n || b.name.length - a.name.length || a.name.localeCompare(b.name));
    return { name: merged[0].name, spellings: merged };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

/** Any spelling → the one it is shown as. A name that was never typed comes
 *  back as itself, trimmed. */
export function resolver(names: readonly (string | undefined | null)[]): (s: string | undefined | null) => string {
  const byKey = new Map<string, string>();
  for (const c of companies(names)) for (const sp of c.spellings) byKey.set(sp.name.toLowerCase(), c.name);
  return s => {
    const t = (s ?? '').trim().replace(/\s+/g, ' ');
    return byKey.get(t.toLowerCase()) ?? t;
  };
}
