/* THE WORDS A DOCUMENT SAYS FIGURES AND LISTS IN — one set, so every definition writes "4.1 g a pack", "91.5% of intake" and
 * "a, b and c" the same way (a definition imports these; none writes its own). Pure. */
import { fmt } from '../../calc/format';
export { andList, fmt, gbp, plural } from '../../calc/format';

/** A figure with its unit: "4.1 g a pack", "91.5% of intake". */
export const sayN = (n: number, unit: string, dp = 2): string => (unit.startsWith('%') ? `${fmt(n, dp)}${unit}` : `${fmt(n, dp)} ${unit}`.trim());

/** "Give-away on Line 3" → "give-away on Line 3" (a name that starts with a capital word, not an acronym). */
export const lowerFirst = (s: string): string => (/^[A-Z][a-z]/.test(s) ? s.charAt(0).toLowerCase() + s.slice(1) : s);

/** The items of a comma- or semicolon-separated box, trimmed, without repeats (compared in lower case, first spelling kept). */
export function distinctList(...boxes: (string | undefined)[]): string[] {
  const seen = new Set<string>(), out: string[] = [];
  for (const b of boxes) for (const part of (b ?? '').split(/[,;\n]+/)) {
    const t = part.trim();
    if (t && !seen.has(t.toLowerCase())) { seen.add(t.toLowerCase()); out.push(t); }
  }
  return out;
}

/** A first sentence or at most `n` characters, without its closing full stop — for a long box quoted inside a sentence. */
export function brief(s: string, n = 140): string {
  const t = s.trim().replace(/\s+/g, ' ');
  const first = /^(.+?[.!?])(\s|$)/.exec(t)?.[1] ?? t;
  const cut = first.length > n ? `${first.slice(0, n - 1).trimEnd()}…` : first;
  return cut.replace(/[.!?]$/, '');
}
