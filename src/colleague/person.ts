/* WHO LUNA IS TALKING TO, AND IN WHAT CAPACITY (12 November, docs/ARCHITECTURE.md §9 — Rowland: "An independent consultant is not simply
 * another factory employee … do not confuse communication style with access permissions … Luna is my intelligent colleague … whether I
 * am working independently or helping a manufacturing business improve").
 *
 * Four things kept apart, each from where the app already holds it:
 *   the PERSON      their name (lib/greetName) and their own practice or employer as they named it (Your brand — lib/brand)
 *   the CAPACITY    an independent professional working WITH businesses — when the business on this device is their own and the lines
 *                   name customers other than it — else a member of ONE business, in the role its administrator gave them
 *   the BUSINESS    the customer in hand (lib/activeClient), or none: their own, independent work
 *   the ROLE        for a member of a business only: its name and whom it usually is
 * It is a sentence for the depth and manner of an answer — NEVER a permission: what a person may see and change is the database's and
 * the capabilities' own check, whatever this says. Pure. */
export interface PersonIn {
  name?: string;
  /** Their own practice or business, as Your brand says it. */
  practice?: string;
  /** Their role in the business on this device, in words ("Manager"), and whom that usually is. */
  role?: string; roleIs?: string;
  /** The business on this device is their own (they made it). */
  own: boolean;
  /** Every customer the lines and stories name, and the one in hand ('' = none chosen). */
  clients: readonly string[]; client: string;
}

const same = (a?: string, b?: string) => (a ?? '').trim().toLowerCase() === (b ?? '').trim().toLowerCase();

/** An independent professional: the business here is their own and it serves customers that are not it. */
export function isIndependent(p: PersonIn): boolean {
  if (!p.own) return false;
  const others = p.clients.filter(c => c.trim() && !same(c, p.practice));
  return others.length > 1 || (others.length === 1 && !!p.practice?.trim());
}

export function personSaid(p: PersonIn): string {
  const who = [p.name?.trim(), p.practice?.trim() ? `of ${p.practice.trim()}` : ''].filter(Boolean).join(' ');
  const tail = 'This sets the depth and manner of your answers only — what they may see and change is decided by the app, never by this line.';
  if (isIndependent(p)) {
    const others = p.clients.filter(c => c.trim() && !same(c, p.practice));
    const hand = p.client.trim()
      ? `The business in hand now: ${p.client.trim()} — the work is for that business; never bring another business's lines, problems, files or findings into it.`
      : 'No business is in hand: this may be their own, independent work (preparing, thinking, analysing, writing) — keep it theirs, bring in no business\'s records unless they name the business, and when what they say plainly belongs to one of the businesses, say which you take it to be.';
    return `Who you are talking to: ${who || 'the person'} — an independent professional (a consultant or outside specialist) who works WITH manufacturing businesses and is not an employee of them. You are their working colleague across all of it. The businesses they work with: ${others.join(', ')}. ${hand} Speak to them as a fellow professional: the evidence, the mechanism, the money and what to tell the business's own managers. ${tail}`;
  }
  if (p.role) return `Who you are talking to: ${who || 'the person'}, whose role in the business is ${p.role}${p.roleIs ? ` (${p.roleIs})` : ''}. The role is not their job title — when the title would change the answer and they have not said it, ask once. ${tail}`;
  return who ? `Who you are talking to: ${who}. ${tail}` : '';
}
