/* WHO “JOHN” IS (24 November 2026, docs/LUNA-MAIL.md) — people in the app and owners on the customer in hand, matched by the words
 * a person would type. Pure: no database, no Microsoft. An address is never guessed. Several matches are named, never picked. */
import { EMAIL, normEmail } from '../../org/organisation';

export interface Person {
  /** How they are known — a name, or the local part of an address. */
  name: string;
  email?: string;
  /** Where they were found, in words (“People”, “Line A · owner”). */
  how: string;
}

export type PersonMatch =
  | { kind: 'one'; hits: [Person] }
  | { kind: 'several'; hits: Person[] }
  | { kind: 'none'; hits: [] }
  | { kind: 'no-email'; hits: [Person] };

const localOf = (email?: string): string => (email ?? '').split('@')[0] ?? '';
/** A name from an address: “john.smith@…” → “john smith”. Never a made-up given name. */
export const nameFromEmail = (email: string): string => localOf(email).replace(/[._]+/g, ' ').trim() || email;

const hay = (p: Person): string => `${p.name} ${p.email ?? ''} ${localOf(p.email)}`.toLowerCase();

/** The same person once: by address when they have one, else by name and where. */
export function uniquePeople(people: readonly Person[]): Person[] {
  const seen = new Set<string>();
  const out: Person[] = [];
  for (const p of people) {
    const k = p.email ? `e:${normEmail(p.email)}` : `n:${p.name.trim().toLowerCase()}|${p.how}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(p);
  }
  return out;
}

/** Who the words mean among these people. An address typed is that address (still to be confirmed), even when they are not in the list. */
export function matchPerson(who: string, people: readonly Person[]): PersonMatch {
  const q = who.trim();
  if (!q) return { kind: 'none', hits: [] };
  if (EMAIL.test(q)) {
    const email = normEmail(q);
    const known = uniquePeople(people).find(p => p.email && normEmail(p.email) === email);
    const one: Person = known ?? { name: nameFromEmail(email), email, how: 'typed' };
    return { kind: 'one', hits: [one] };
  }
  const words = q.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  const hits = uniquePeople(people).filter(p => {
    const h = hay(p);
    return words.every(w => h.includes(w));
  });
  if (hits.length === 1 && !hits[0].email) return { kind: 'no-email', hits: [hits[0]] };
  if (hits.length === 1) return { kind: 'one', hits: [hits[0]] };
  if (hits.length > 1) return { kind: 'several', hits };
  return { kind: 'none', hits: [] };
}

export { EMAIL, normEmail };
