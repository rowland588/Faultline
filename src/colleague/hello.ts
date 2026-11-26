/* A LITERAL HELLO, THANKS OR GOODBYE — answered in the app at once (26 November).
 *
 * Why a hello used to wait: the screen still built conversation focus (files, Today, what stands now), then asked the
 * gateway, then Haiku, then the first streamed word. A greeting needs none of that. This is not a fake that pretends
 * she looked something up: it never claims a figure, a record or local conditions. Remaining small talk still goes to
 * Haiku with no tools (docs/LUNA-ROOM.md F1a). Pure. */
import { fastChatKind } from '../tools/colleague/colleagueAssist';

/** The first word of a greeting — echo morning/afternoon/evening when they said it, else the hour. */
export function helloLead(said: string, hour: number): string {
  const n = said.trim().toLowerCase();
  if (/\bmorning\b/.test(n)) return 'Morning';
  if (/\bafternoon\b/.test(n)) return 'Afternoon';
  if (/\bevening\b/.test(n)) return 'Evening';
  return hour < 12 ? 'Morning' : hour < 18 ? 'Hello' : 'Evening';
}

/** The reply, or null — only a greeting, thanks or goodbye; anything else goes to Luna. */
export function helloSaid(said: string, o: { name?: string; hour: number }): string | null {
  const kind = fastChatKind(said);
  if (kind === 'thanks') return 'Anytime.';
  if (kind === 'bye') return 'See you.';
  if (kind !== 'hello') return null;
  const lead = helloLead(said, o.hour);
  const name = o.name?.trim();
  return name ? `${lead}, ${name}. What are we on?` : `${lead}. What are we on?`;
}
