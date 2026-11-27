/* Greetings and chit-chat answered in the app at once (26–27 November).
 *
 * Why a hello used to wait: the screen still built conversation focus (files, Today, what stands now), then asked the
 * gateway, then Haiku, then the first streamed word. None of that belongs on a greeting or small talk. This is not a fake
 * that pretends she looked something up: it never claims a figure, a record or local conditions.
 * A client-office hello is a person meeting a person — warm, short, humanistic — never a dead "Hello." and never a menu of
 * lines or investigations. A data ask is never swallowed as chit-chat. Work still goes to Luna through the gateway
 * (docs/LUNA-ROOM.md F1, docs/AI-COST.md). Pure. */
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

/** A guest they just named ("Hello, I'm Sarah") or the first person already in the room — never invented. */
export function helloGuest(said: string, room?: readonly string[]): string | undefined {
  const intro = /\b(?:i(?:['’]?m| am)|this is)\s+([A-Za-z][A-Za-z'-]{1,30})\b/i.exec(said);
  if (intro) {
    const n = intro[1];
    return n[0].toUpperCase() + n.slice(1);
  }
  const first = room?.[0]?.split(/[—–-]/)[0]?.trim().split(/\s+/)[0];
  if (first && /^[A-Za-z][A-Za-z'-]{1,30}$/.test(first)) return first;
  return undefined;
}

export function helloSaid(said: string, o: { name?: string; hour: number; room?: readonly string[] }): string | null {
  const kind = fastChatKind(said);
  if (!kind) return null;
  if (kind === 'thanks') return 'Anytime.';
  if (kind === 'bye') return 'See you.';
  if (kind === 'hello') {
    const guest = helloGuest(said, o.room);
    if (guest) return `Hello, ${guest} — good to meet you. I'm ${COLLEAGUE.name}.`;
    const lead = helloLead(said, o.hour);
    const name = o.name?.trim();
    return name ? `${lead}, ${name} — good to see you. I'm ${COLLEAGUE.name}.` : `${lead} — good to meet you. I'm ${COLLEAGUE.name}.`;
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
  if (kind === 'meta') {
    const n = said.trim().toLowerCase();
    if (/\bwhat\s+can\s+you\s+do\b/.test(n)) {
      return `I'm ${COLLEAGUE.name}. Ask me about your numbers and files — I'll get on it. Every figure is worked by ${PRODUCT.name}, not guessed. What would you like to look at?`;
    }
    return `I'm ${COLLEAGUE.name} — good to meet you. I work with the numbers and files you already keep. Ask me anything.`;
  }
  return null;
}
