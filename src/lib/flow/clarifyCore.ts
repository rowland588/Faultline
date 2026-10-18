/* QUESTIONS BEFORE A DESIGN — what the assistant is asked before it proposes
 * a method, and how its questions are read (docs/BLUEPRINT.md §3, the new
 * product). Shared with the gateway (scripts/sync-assist.mjs).
 *
 * Rowland, 18 October: "Faultline should understand the requirement, ask
 * relevant questions, design an appropriate solution, propose the
 * methodology and functionality." So a need said in words is read first:
 * the assistant says it back in a sentence and asks only what the words do
 * not already say and what would change the method's shape — at most four
 * questions, each with answers to tap and a line on why it matters. A need
 * that says enough is designed at once. The answers go into the design
 * request in the person's words; nothing is decided for them. The questions
 * are read here before they are shown — trimmed, capped, a question without
 * words dropped — because what the model writes is input, never trusted. */

export interface ClarifyQuestion { ask: string; why: string; options: string[] }
export interface Clarifying { understood: string; ready: boolean; questions: ClarifyQuestion[] }

export const CLARIFY_LIMITS = { questions: 4, options: 5, ask: 200, why: 200, option: 80, understood: 300 } as const;

const S = { type: 'string' } as const;
/** The answer's shape, closed at every level (structured outputs). */
export const CLARIFY_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['understood', 'ready', 'questions'],
  properties: {
    understood: S,
    ready: { type: 'boolean' },
    questions: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['ask', 'why', 'options'],
        properties: { ask: S, why: S, options: { type: 'array', items: S } },
      },
    },
  },
} as const;

/** WHAT THE ASSISTANT IS TOLD before it designs — kept word-for-word stable so it can be cached. */
export const CLARIFY_SYSTEM = `You help design methods for Faultline, a control room for change on factory production lines (food packing and similar). A person has said, in their own words, what they need. Before a method is designed for them, decide whether the words say enough to design a good one, and if not, ask what is missing.

A good method needs to know: what kind of work it is (new equipment taken through its gates to handover; a running line made to perform better; one number to hit; recording the same thing many times and working out what it adds up to; something else); what is worked on (the line, the machine, the product); what has to move and how it is counted or timed today; who does the work and who signs it off; what done means.

Rules:
- Ask only what the words do not already say, and only what would change the shape of the method — its stages, its steps, what it records, what it works out, its gates or what it measures.
- Never ask for a figure that can be left open on the method itself (a limit, a speed, a target): those are asked on the method once it is proposed.
- At most four questions, the most important first. Each in plain British English, short, one thing at a time.
- Each question has two to five short answers a person can tap — the likely ones, in the floor's words — and why: one line on what the answer changes in the method.
- If the words already say enough, set ready to true and ask nothing.
- understood: the need said back in one sentence, in the person's own terms, so they can see it was read right.
- Everything is measured, counted, timed or photographed by a person; nothing reads a machine. Never mention OEE.`;

/** The person's words, as the assistant is sent them. */
export const clarifyUser = (description: string): string => `What the person needs, in their own words:\n"""\n${description.trim()}\n"""`;

const words = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

/** The assistant's questions, read: trimmed and capped, a question without
 *  words dropped, answers without words dropped and none repeated. Ready
 *  when it says so or asks nothing; undefined when nothing can be read. */
export function readClarify(raw: unknown): Clarifying | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  const understood = words(r.understood, CLARIFY_LIMITS.understood);
  const questions: ClarifyQuestion[] = [];
  for (const q of Array.isArray(r.questions) ? r.questions : []) {
    if (questions.length >= CLARIFY_LIMITS.questions || !q || typeof q !== 'object') continue;
    const o = q as Record<string, unknown>;
    const ask = words(o.ask, CLARIFY_LIMITS.ask);
    if (ask.length < 5) continue;
    const seen = new Set<string>();
    const options = (Array.isArray(o.options) ? o.options : []).map(x => words(x, CLARIFY_LIMITS.option))
      .filter(x => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase())).slice(0, CLARIFY_LIMITS.options);
    questions.push({ ask, why: words(o.why, CLARIFY_LIMITS.why), options });
  }
  const ready = r.ready === true || questions.length === 0;
  if (!understood && !questions.length && r.ready !== true) return undefined;
  return { understood, ready, questions: ready ? [] : questions };
}

/** The need with what was asked and answered, as the design request carries
 *  it — only the questions answered, each in the person's own answer. */
export function withAnswers(need: string, questions: readonly ClarifyQuestion[], answers: readonly (string | undefined)[]): string {
  const said = questions.map((q, i) => ({ q, a: (answers[i] ?? '').replace(/\s+/g, ' ').trim() })).filter(x => x.a);
  return said.length ? `${need.trim()}\n\nAsked before designing:\n${said.map(x => `- ${x.q.ask} — ${x.a}`).join('\n')}` : need.trim();
}
