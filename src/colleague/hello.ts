/* Greetings and chit-chat answered in the app at once (26–27 November).
 *
 * Why a hello used to wait: the screen still built conversation focus (files, Today, what stands now), then asked the
 * gateway, then Haiku, then the first streamed word. None of that belongs on a greeting or small talk. This is not a fake
 * that pretends she looked something up: it never claims a figure, a record or local conditions.
 * Work still goes to Luna through the gateway (docs/LUNA-ROOM.md F1, docs/AI-COST.md). Pure. */
import { fastChatKind } from '../tools/colleague/colleagueAssist';
import { COLLEAGUE, PRODUCT } from '../lib/product';

/** The first word of a greeting — echo morning/afternoon/evening when they said it, else the hour. */
export function helloLead(said: string, hour: number): string {
  const n = said.trim().toLowerCase();
  if (/\bmorning\b/.test(n)) return 'Morning';
  if (/\bafternoon\b/.test(n)) return 'Afternoon';
  if (/\bevening\b/.test(n)) return 'Evening';
  return hour < 12 ? 'Morning' : hour < 18 ? 'Hello' : 'Evening';
}

/** Who she is and what she can do — the live product, answered in the app. Never a thin chit-chat line, never vapour. */
export const LUNA_WHAT_I_AM = `I'm ${COLLEAGUE.name} — your personal assistant and companion in ${PRODUCT.name}. I'm linked to this customer's data: the files you've given me, and the lines and records in the app. Ask me to look something up, compare weeks, show the top losses, write a training, SOP or work instruction, make a report or a graph, remind you, or move that into a workspace. Schedules I keep are daily or weekly briefings that run when you open me; what I make lives in Artifacts. I cannot invent a figure — the app works every number — I never delete a record or write back to a business's systems, and a reminder shows when you open me, not while the app is shut. What shall we look at?`;

/** The reply, or null — classified chit-chat only; anything else goes to Luna. */
export function helloSaid(said: string, o: { name?: string; hour: number }): string | null {
  const kind = fastChatKind(said);
  if (!kind) return null;
  if (kind === 'thanks') return 'Anytime.';
  if (kind === 'bye') return 'See you.';
  if (kind === 'hello') {
    const lead = helloLead(said, o.hour);
    const name = o.name?.trim();
    return name ? `${lead}, ${name}. What are we on?` : `${lead}. What are we on?`;
  }
  const you = o.name?.trim();
  if (kind === 'small') {
    return you
      ? `All good here, thanks — ready when you are. How about you, ${you}?`
      : 'All good here, thanks — ready when you are. How about you?';
  }
  if (kind === 'weather') {
    return "I can't see the weather from here — how is it with you?";
  }
  if (kind === 'meta') return LUNA_WHAT_I_AM;
  return null;
}
