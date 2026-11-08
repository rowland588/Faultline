// COPIED FROM src/tools/story by scripts/sync-assist.mjs — edit the source, then run it.
/* THE CHAPTER, DRAFTED BY THE ASSISTANT — what it is told, the shape of its answer, and the checks (8 November, docs/STORY.md §5;
 * the gateway's task `story`). Shared with supabase/functions/assist/story by scripts/sync-assist.mjs — edit here, then run it.
 *
 * Rowland, 8 November, asked whether the AI may write report text: "yes". So, when the consultant presses Run an update on the Story,
 * the gateway is sent the chapter's SNAPSHOT as text — every figure with where it comes from — the brief, and the headlines of the
 * chapters before, and it returns a headline and paragraphs in plain English for a site director. The rules are the gateway's own
 * (server-side), the answer is held to a schema by the API and read again here, and every figure in it that is not among the
 * snapshot's is returned as `unsure` so the page marks it "Check this" — the assistant never adds a figure and never approves. */

export const STORY_LIMITS = {
  /** The snapshot as text, in characters — the app renders it; the gateway refuses more. */
  text: 24_000,
  brief: 300,
  client: 80,
  headlines: 12,
  figures: 600,
} as const;

export interface StoryAsk {
  client: string;
  brief: string;
  /** "8 November 2026". */
  today: string;
  /** The headlines of the approved chapters before, oldest first. */
  headlinesBefore: string[];
  /** The snapshot rendered line by line by the app (tools/story/storyAsk snapshotText), each figure with its source. */
  snapshotText: string;
  /** Every figure the snapshot holds, as digits ("595", "580", "3") — the only numbers the answer may use. */
  figures: string[];
}

export interface StoryAnswer { headline: string; narrative: string[] }

export const STORY_SYSTEM = `You write the next chapter of a consultant's story for their client — a manufacturing business in the UK. The consultant (a lean / operational-improvement consultant) has spent days on the client's production lines with Faultline, a tool that times, counts and photographs what happens and works out what each problem costs. You are given what Faultline recorded as of today, what has changed since the last chapter, the client's brief, and the headlines of the chapters before. You write the chapter the consultant will read, edit and hand to the client's site director.

HOW TO WRITE
- Plain British English, as a seasoned consultant writes to a site director: direct, specific, calm, no jargon, no hype, no stock phrases. Money first where there is money.
- It is one chapter of a continuing story: pick up from the last headline, say what is new, and leave the reader knowing exactly where things stand. Never repeat an earlier chapter's news as if it were new.
- Three to six short paragraphs, in this order where there is something to say: where we are (one or two sentences); what has changed since the last update; the biggest loss and what is behind it; what is being done, by whom and by when — late things named as late; what has been proved (a fix is proved only when Faultline says the number moved the right way); what happens next. Each paragraph two to four sentences. No headings, no bullet points, no lists, no emoji.
- The headline: at most twelve words, the one thing the director should take from this update — the biggest loss, or the biggest win if one was proved this time. Never a question.

THE HARD RULES — figures and claims
- Use a figure only exactly as it appears in what you are given, with its unit (a count, minutes, £ a day, a date). Never invent, estimate, round differently, total, convert to a week or a year, or compare figures to make a new one. If a figure you want is not given, say the thing in words without a number.
- Never claim a saving, an improvement or a cause that is not in what you are given. A problem with no price is "not priced yet", never guessed. A fix is "proved" only if listed under proved; otherwise it is being done or planned.
- Never name a person beyond how they are given (a first name or a company as written). Never write about anyone's performance.
- Say where a figure comes from where it helps ("timed on the line", "the register") — Faultline's figures are measured by people, never by sensors.

YOUR ANSWER — JSON matching the schema: "headline" (a string) and "narrative" (an array of paragraph strings). Nothing else.`;

export const STORY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['headline', 'narrative'],
  properties: {
    headline: { type: 'string' },
    narrative: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 8 },
  },
} as const;

export const storyRulesText = (): string => STORY_SYSTEM + JSON.stringify(STORY_SCHEMA);

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** The ask off the wire, held to its limits — never more than the gateway will send on. */
export function readStoryAsk(body: unknown): { ok: true; ask: StoryAsk } | { ok: false; why: string } {
  const b = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const snapshotText = str(b.snapshotText, STORY_LIMITS.text + 1);
  if (!snapshotText) return { ok: false, why: 'The chapter needs its snapshot — run the update from the Story page.' };
  if (snapshotText.length > STORY_LIMITS.text) return { ok: false, why: `The snapshot is longer than the assistant takes at once (${STORY_LIMITS.text} characters) — the chapter is written from the records’ words instead.` };
  const headlinesBefore = (Array.isArray(b.headlinesBefore) ? b.headlinesBefore : []).map(h => str(h, 200)).filter(Boolean).slice(-STORY_LIMITS.headlines);
  const figures = (Array.isArray(b.figures) ? b.figures : []).map(f => str(f, 24)).filter(f => /^-?\d+(\.\d+)?$/.test(f)).slice(0, STORY_LIMITS.figures);
  return { ok: true, ask: { client: str(b.client, STORY_LIMITS.client), brief: str(b.brief, STORY_LIMITS.brief), today: str(b.today, 40), headlinesBefore, snapshotText, figures } };
}

/** The one user message: the brief, the chapters before, today, and the snapshot as given. */
export function storyUser(a: StoryAsk): string {
  return [
    `CLIENT: ${a.client || '(not named)'}`,
    `THE BRIEF, in the client's words: ${a.brief || '(none written)'}`,
    `TODAY: ${a.today}`,
    a.headlinesBefore.length ? `THE CHAPTERS BEFORE, oldest first:\n${a.headlinesBefore.map((h, i) => `  ${i + 1}. ${h}`).join('\n')}` : 'THE CHAPTERS BEFORE: none — this is the first chapter.',
    `WHAT FAULTLINE RECORDED, as of today (every figure below is the only kind you may use):\n${a.snapshotText}`,
  ].join('\n\n');
}

/** The answer read again: a headline and one to eight non-empty paragraphs, or nothing. */
export function checkStoryAnswer(raw: unknown): StoryAnswer | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const headline = str(o.headline, 200);
  const narrative = (Array.isArray(o.narrative) ? o.narrative : []).map(p => str(p, 2000)).filter(Boolean).slice(0, 8);
  if (!headline || !narrative.length) return null;
  return { headline, narrative };
}

const NUMBER = /(?<![\p{L}\d.,])\d+(?:[.,]\d+)*/gu;
const asFigure = (s: string): string => {
  const plain = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  const n = Number(plain);
  return Number.isFinite(n) ? String(n) : s;
};
/** Every figure in a text as digits — "£2,900" → "2900". */
export const storyFiguresIn = (text: string): string[] => [...text.matchAll(NUMBER)].map(m => asFigure(m[0]));

/** The figures in the answer not among the snapshot's, the brief's or today's — the page marks each "Check this". */
export function unsureStory(answer: StoryAnswer, a: StoryAsk): string[] {
  const known = new Set([...a.figures.map(asFigure), ...storyFiguresIn(a.snapshotText), ...storyFiguresIn(a.brief), ...storyFiguresIn(a.today), ...a.headlinesBefore.flatMap(storyFiguresIn)]);
  const out: string[] = [];
  for (const raw of `${answer.headline} ${answer.narrative.join(' ')}`.matchAll(NUMBER)) {
    const f = asFigure(raw[0]);
    if (!known.has(f) && !out.includes(raw[0])) out.push(raw[0]);
  }
  return out.slice(0, 12);
}
