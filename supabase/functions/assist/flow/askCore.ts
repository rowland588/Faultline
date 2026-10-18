// COPIED FROM src/lib/flow by scripts/sync-assist.mjs — edit the source, then run it.
/* ASKING ABOUT A PROJECT, GROUNDED — what the assistant is told and how its
 * answer is checked (slice 5; docs/PLATFORM-REVIEW.md §6.5). Shared with
 * the gateway (scripts/sync-assist.mjs).
 *
 * Rowland's mandate: the assistant "answers from project state: known,
 * calculated, inferred, unknown". It is sent the project's facts — each a
 * sentence the app made, with its id and how it is known — and the
 * question; it answers in sentences, each saying its basis and the facts it
 * rests on. The answer is then checked here: a sentence resting on a fact
 * that was not sent, or carrying a number no fact it cites carries, is not
 * passed off as known — it is marked as the assistant's inference, or
 * dropped. The assistant never works a figure out. */

export type Basis = 'known' | 'worked out' | 'inferred' | 'unknown';

export interface Fact {
  id: string;
  text: string;
  /** known: recorded by a person · worked out: the app's arithmetic on what
   *  was recorded · not recorded: asked about and absent. */
  basis: 'known' | 'worked out' | 'not recorded';
}

export interface Said { text: string; basis: Basis; facts: string[]; note?: string }

const S = { type: 'string' } as const;
/** The answer's shape, closed at every level (structured outputs). */
export const ASK_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['sentences'],
  properties: {
    sentences: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['text', 'basis', 'facts'],
        properties: {
          text: S,
          basis: { type: 'string', enum: ['known', 'worked_out', 'inferred', 'unknown'] },
          facts: { type: 'array', items: S },
        },
      },
    },
  },
} as const;

export const ASK_SYSTEM = `You answer questions about one project in Faultline, a control room for change on factory production lines. You are given FACTS about the project, each with an id and its basis: "known" (recorded by a person), "worked out" (the app's own arithmetic on what was recorded) or "not recorded" (asked about and absent).

Answer in at most five short sentences, in the JSON shape given. For each sentence say its basis and list the ids of the facts it rests on:
- known or worked_out: only when the sentence restates facts of that basis; quote their figures exactly as written.
- inferred: a reasonable reading that goes beyond what the facts say outright — say so plainly in the sentence ("probably", "it looks as if").
- unknown: when the facts do not answer the question; say what would need recording.
Rules: use only the FACTS. Never calculate, estimate or invent a number, a date or a name. Plain British English, the floor's words, no headings or lists.`;

export const askUser = (question: string, facts: readonly Fact[]): string =>
  `FACTS:\n${facts.slice(0, 400).map(f => `[${f.id}] (${f.basis}) ${f.text}`).join('\n').slice(0, 24000)}\n\nQUESTION: ${question.trim().slice(0, 400)}`;

const NUM = /\d+(?:[.,]\d+)?/g;

/** Check an answer against the facts it was given. A known or worked-out
 *  sentence must cite facts that were sent, of that basis, and carry no
 *  number they do not; otherwise it is said to be the assistant's own
 *  inference. A sentence citing nothing it was sent, and asserting a
 *  number, is dropped. */
export function checkAnswer(raw: unknown, facts: readonly Fact[]): Said[] {
  const byId = new Map(facts.map(f => [f.id, f]));
  const out: Said[] = [];
  const list = raw && typeof raw === 'object' && Array.isArray((raw as { sentences?: unknown }).sentences) ? (raw as { sentences: unknown[] }).sentences : [];
  for (const s of list.slice(0, 8)) {
    if (!s || typeof s !== 'object') continue;
    const o = s as { text?: unknown; basis?: unknown; facts?: unknown };
    const text = typeof o.text === 'string' ? o.text.trim().slice(0, 600) : '';
    if (!text) continue;
    const cited = (Array.isArray(o.facts) ? o.facts : []).map(String).filter(id => byId.has(id));
    const claimed: Basis = o.basis === 'known' ? 'known' : o.basis === 'worked_out' ? 'worked out' : o.basis === 'inferred' ? 'inferred' : 'unknown';
    const pool = cited.map(id => byId.get(id)?.text ?? '').join(' ');
    const stray = (text.match(NUM) ?? []).filter(n => !pool.includes(n));
    if (!cited.length && stray.length) continue;
    if ((claimed === 'known' || claimed === 'worked out') && (!cited.length || stray.length)) {
      out.push({ text, basis: 'inferred', facts: cited, note: stray.length ? `the figure ${stray[0]} is not in what it was told` : 'it cites nothing it was told' });
      continue;
    }
    if (claimed === 'known' && cited.some(id => byId.get(id)?.basis !== 'known')) {
      out.push({ text, basis: 'worked out', facts: cited });
      continue;
    }
    out.push({ text, basis: claimed, facts: cited });
  }
  return out;
}
