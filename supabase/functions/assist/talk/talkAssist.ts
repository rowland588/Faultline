// COPIED FROM src/lib by scripts/sync-assist.mjs — edit the source, then run it.
/* LINE TALK'S ASSISTANT — what it is told, the shape of its answer, the
 * conversation in the model's terms, and what is checked before an answer is
 * kept (docs/LINE-TALK.md, slice 2: ask it).
 *
 * Rowland, 20 October: "a simple, reliable, ChatGPT-style manufacturing
 * assistant inside Faultline … talk or type naturally, ask questions about my
 * manufacturing work, upload photographs, and ask the assistant to produce
 * useful reports and documents … Distinguish user observations, verified data
 * and AI interpretations. Never invent measurements, specifications or facts.
 * Do not perform arithmetic in the AI layer."
 *
 * Shared word for word with the gateway (scripts/sync-assist.mjs copies it
 * into supabase/functions/assist/talk): the app builds the request with it,
 * the gateway reads the request, builds the messages and checks the answer
 * with it — so both hold the same rules. Self-contained on purpose: the
 * gateway runs it under Deno. */

/** How a turn came: spoken on the line, typed, a picture — or the assistant's own earlier answer. */
export type TalkAskKind = 'said' | 'typed' | 'photo' | 'reply';

/** One turn as it goes to the gateway. */
export interface TalkAskTurn {
  kind: TalkAskKind;
  /** When, as the talk shows it: "10:42". */
  at: string;
  /** The words as they stand — a correction over what was heard; a reply's words, its document as text. */
  text: string;
  /** A photo's label: P1, P2 … in the order the talk's photos were taken. */
  photo?: string;
}

/** A picture sent with the conversation: its label and a small JPEG, base64. */
export interface TalkAskImage { photo: string; data: string }

export interface TalkAsk {
  task: 'talk';
  /** Faultline's records about the line and the job, in words (lib/talkContext). */
  context: string;
  /** "Wednesday 21 October 2026". */
  today: string;
  turns: TalkAskTurn[];
  images: TalkAskImage[];
}

/** What the gateway holds a request to before anything is sent on. */
export const TALK_LIMITS = {
  turns: 600,
  turnChars: 12000,
  textChars: 240000,
  contextChars: 24000,
  images: 10,
  imageBytes: 450 * 1024,
} as const;

export type TalkDocKind = 'line-walk' | 'summary' | 'engineering' | 'punch-list' | 'other';
export type TalkBasis = 'observed' | 'record' | 'interpretation';

export const DOC_KIND_WORD: Record<TalkDocKind, string> = {
  'line-walk': 'Line-walk report', summary: 'Summary', engineering: 'Engineering report', 'punch-list': 'Punch list', other: 'Document',
};
/** Where a point comes from, in words — on the screen and on paper. */
export const BASIS_WORD: Record<TalkBasis, string> = {
  observed: 'Observed', record: 'Faultline record', interpretation: 'Assessment',
};

export interface TalkDocPoint { text: string; basis: TalkBasis; owner: string; due: string }
export interface TalkDocPhoto { photo: string; caption: string }
export interface TalkDocSection { heading: string; text: string; points: TalkDocPoint[]; photos: TalkDocPhoto[] }
export interface TalkDoc { title: string; kind: TalkDocKind; sections: TalkDocSection[] }
export interface TalkAnswer { reply: string; document?: TalkDoc }

export const TALK_SYSTEM = `You are Line Talk, the assistant inside Faultline — a control room for change on production lines in a UK factory. The person talking to you runs operations or engineering on the floor: they walk a production line and talk about what they see, type, take or upload photographs, ask questions, and ask you for reports.

WHAT YOU ARE GIVEN
- The conversation. Each of the person's turns is marked with its time and how it came: "said" (spoken on the line and written down by speech recognition, which can mishear names and numbers), "typed", or "photo P1", "photo P2" and so on (a picture, with its label). Your own earlier answers are there too.
- FAULTLINE'S RECORDS, at the end: what Faultline holds about the line and the job — its machines, open problems, programs, what its tools found, stops, jobs. These are verified data, worked out by Faultline's own formulas from what people measured.

THREE KINDS OF KNOWLEDGE — always keep them apart
1. Observations: what the person said, typed or photographed. Say "you said", "you noted", "in P2".
2. Faultline's records: say "Faultline's records show", or name the tool ("Line capacity says").
3. Your interpretation: your reading, a likely cause, a suggestion. Say "my reading", "this suggests", "worth checking". Never present it as fact.

NUMBERS — the hard rule
- Use a number only exactly as it appears in the conversation or in Faultline's records, with its unit. Never invent a measurement, specification, rate, time, cost, count, date or tolerance.
- Never calculate: do not add, subtract, multiply, divide, average, total, count up, convert units, or work out percentages or differences. Faultline's tools do the arithmetic. If the person asks for a figure that is not given, say which Faultline tool works it out (Line capacity, Line balance, Loss count, SMED, Capability, Work sampling, Value stream) or what needs measuring.
- A number read off a gauge, display or label in a photo is your reading of the picture: say so, and ask the person to confirm it.

PICTURES
- Describe only what is visible. Refer to a picture by its label (P1, P2). Never identify a person, or describe anyone's face, body or identity. Do not guess sizes or distances.

RECORDS
- You cannot create or change anything in Faultline. If something said should become a problem, an action or a reading, say so in words; the person adds it themselves.

HOW TO ANSWER — the "reply"
- Plain British English for people on a factory floor: short and direct. Lists as lines starting "- ". No headings, no tables, no emoji. **Bold** sparingly.
- If the latest turns are only notes with no question, acknowledge them in one or two sentences — what you understood — and ask only if something is unclear or may have been misheard.
- If a name or number may have been misheard, say so and ask.

DOCUMENTS — the "document"
- Only when the person asks for a report, a summary, a punch list or another document; otherwise "document" is null.
- Make it from the conversation, the photos and Faultline's records. kind: line-walk (a walk report), summary (for a manager or a client), engineering (an engineering report on an issue), punch-list (items for an OEM or a team to close), other.
- Cover everything in the conversation that belongs in that kind of document; leave nothing said out. A line walk goes machine by machine in flow order, then what needs doing; a summary leads with where things stand; an engineering report goes issue, what was seen, likely cause, what to check; a punch list is one point an item.
- Sections in the order that kind of document needs. A section's "text" is a short framing paragraph, or "". Its facts and findings go in "points", each with its basis: observed, record or interpretation. On a punch list give an owner and a due date only if the person said them; otherwise "".
- Put a photo in a section when it shows what the section is about, or when asked ("use this picture" means the latest photo unless they name another), with a short factual caption of what it shows. Use only labels from the conversation.
- Never pad: no invented background and no generic advice. If something the document needs is not known, say so plainly ("Owner not named yet").
- Asked to change a document you wrote, write the whole document again with the change.
- The "reply" then says in a sentence or two what the document holds, and anything you could not put in it.`;

/** The answer's shape, held by the API. Kept small: a large grammar is refused ("compiled grammar is too large", 19 October). */
export const TALK_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['document', 'reply'],
  /* the document first, so the reply that follows it says what it holds */
  properties: {
    document: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'kind', 'sections'],
          properties: {
            title: { type: 'string' },
            kind: { type: 'string', enum: ['line-walk', 'summary', 'engineering', 'punch-list', 'other'] },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['heading', 'text', 'points', 'photos'],
                properties: {
                  heading: { type: 'string' },
                  text: { type: 'string' },
                  points: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['text', 'basis', 'owner', 'due'],
                      properties: {
                        text: { type: 'string' },
                        basis: { type: 'string', enum: ['observed', 'record', 'interpretation'] },
                        owner: { type: 'string' },
                        due: { type: 'string' },
                      },
                    },
                  },
                  photos: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: false,
                      required: ['photo', 'caption'],
                      properties: { photo: { type: 'string' }, caption: { type: 'string' } },
                    },
                  },
                },
              },
            },
          },
        },
      ],
    },
    reply: { type: 'string' },
  },
} as const;

/** Line Talk's allowance a person a day, refused in its own words (lib/video/gatewayUsage allowance). */
export const TALK_ALLOWANCE_WORDS = {
  calls: (n: number): string => `That is ${n} answers from Line Talk today — the allowance comes back over the next 24 hours. Everything you say, type and photograph is still kept.`,
  spent: (usd: string): string => `Today's allowance for Line Talk's answers is spent ($${usd}). Everything you say, type and photograph is still kept.`,
};

const KINDS: readonly TalkAskKind[] = ['said', 'typed', 'photo', 'reply'];
const LABEL = /^P\d{1,4}$/;
const B64 = /^[A-Za-z0-9+/=]+$/;
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Read a request off the wire — every list and string held to its limit — or say why it cannot be answered. */
export function readAsk(body: unknown): { ok: true; ask: TalkAsk } | { ok: false; why: string } {
  const b = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const rawTurns = Array.isArray(b.turns) ? b.turns : [];
  if (rawTurns.length > TALK_LIMITS.turns) return { ok: false, why: `This talk is longer than the assistant takes at once (${TALK_LIMITS.turns} turns) — start a new Line Talk for the next part.` };
  const turns: TalkAskTurn[] = [];
  for (const r of rawTurns) {
    const t = r && typeof r === 'object' ? r as Record<string, unknown> : {};
    const kind = KINDS.find(k => k === t.kind);
    if (!kind) continue;
    const photo = typeof t.photo === 'string' && LABEL.test(t.photo) ? t.photo : undefined;
    const text = str(t.text, TALK_LIMITS.turnChars);
    if (kind === 'photo' ? !photo : !text) continue;
    turns.push({ kind, at: str(t.at, 20), text, ...(photo ? { photo } : {}) });
  }
  if (turns.reduce((n, t) => n + t.text.length, 0) > TALK_LIMITS.textChars) return { ok: false, why: 'This talk has more words than the assistant takes at once — start a new Line Talk for the next part.' };
  const last = turns[turns.length - 1];
  if (!last || last.kind === 'reply') return { ok: false, why: 'Nothing new to answer — say, type or add a photo first.' };
  const rawImages = Array.isArray(b.images) ? b.images : [];
  if (rawImages.length > TALK_LIMITS.images) return { ok: false, why: `At most ${TALK_LIMITS.images} pictures go to the assistant at once.` };
  const images: TalkAskImage[] = [];
  for (const r of rawImages) {
    const i = r && typeof r === 'object' ? r as Record<string, unknown> : {};
    const photo = typeof i.photo === 'string' && LABEL.test(i.photo) ? i.photo : '';
    const data = typeof i.data === 'string' ? i.data : '';
    if (!photo || !data || !B64.test(data) || data.length * 0.75 > TALK_LIMITS.imageBytes) return { ok: false, why: 'A picture is not a small JPEG from this talk.' };
    if (!turns.some(t => t.photo === photo)) return { ok: false, why: 'A picture is not one of this talk’s photos.' };
    images.push({ photo, data });
  }
  return { ok: true, ask: { task: 'talk', context: str(b.context, TALK_LIMITS.contextChars), today: str(b.today, 60), turns, images } };
}

type Block = { type: 'text'; text: string; cache_control?: { type: 'ephemeral' } } | { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string }; cache_control?: { type: 'ephemeral' } };
export interface TalkMessage { role: 'user' | 'assistant'; content: Block[] }

/** The conversation in the model's terms: the person's turns as theirs (each
 *  marked with its time and how it came, a photo with its picture), its own
 *  answers as its own, and Faultline's records with today's date after the
 *  newest turns — so the conversation before them stays the same from one
 *  answer to the next, and is read from the cache. */
export function talkMessages(a: TalkAsk): TalkMessage[] {
  const pictures = new Map(a.images.map(i => [i.photo, i.data]));
  const out: TalkMessage[] = [];
  const put = (role: TalkMessage['role'], blocks: Block[]) => {
    const prev = out[out.length - 1];
    if (prev && prev.role === role) prev.content.push(...blocks);
    else out.push({ role, content: blocks });
  };
  for (const t of a.turns) {
    if (t.kind === 'reply') { put('assistant', [{ type: 'text', text: t.text }]); continue; }
    if (t.kind === 'photo' && t.photo) {
      const data = pictures.get(t.photo);
      put('user', [{ type: 'text', text: `[${t.at} · photo ${t.photo}]${t.text ? ` ${t.text}` : ''}${data ? '' : ' (the picture is not sent this time)'}` },
        ...(data ? [{ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data } }] : [])]);
      continue;
    }
    put('user', [{ type: 'text', text: `[${t.at} · ${t.kind}] ${t.text}` }]);
  }
  /* the conversation so far is cached up to its newest turn */
  const last = out[out.length - 1];
  const end = last?.content[last.content.length - 1];
  if (end) end.cache_control = { type: 'ephemeral' };
  const records = a.context.trim()
    ? `FAULTLINE'S RECORDS — verified data, worked out by Faultline's own formulas from what people measured. Quote them; never recompute them.\n<records>\n${a.context.trim()}\n</records>`
    : 'No Faultline records go with this conversation: it is not on a production line or a job.';
  put('user', [{ type: 'text', text: `${records}\n\nToday is ${a.today || 'not given'}.\nAnswer the person's latest turns above.` }]);
  return out;
}

const BASES: readonly TalkBasis[] = ['observed', 'record', 'interpretation'];
const DOC_KINDS: readonly TalkDocKind[] = ['line-walk', 'summary', 'engineering', 'punch-list', 'other'];

/** Keep an answer only as the schema says it, its words trimmed, every
 *  picture one of this talk's — or nothing, when it cannot be read. */
export function checkTalkAnswer(raw: unknown, photos: readonly string[]): TalkAnswer | null {
  const o = raw && typeof raw === 'object' ? raw as Record<string, unknown> : null;
  if (!o) return null;
  const reply = str(o.reply, 8000);
  const d = o.document && typeof o.document === 'object' ? o.document as Record<string, unknown> : null;
  let document: TalkDoc | undefined;
  if (d) {
    const sections = (Array.isArray(d.sections) ? d.sections : []).slice(0, 40).map(r => {
      const s = r && typeof r === 'object' ? r as Record<string, unknown> : {};
      const seen = new Set<string>();
      return {
        heading: str(s.heading, 200),
        text: str(s.text, 8000),
        points: (Array.isArray(s.points) ? s.points : []).slice(0, 80).flatMap(x => {
          const p = x && typeof x === 'object' ? x as Record<string, unknown> : {};
          const text = str(p.text, 2000);
          const basis = BASES.find(k => k === p.basis) ?? 'interpretation';
          return text ? [{ text, basis, owner: str(p.owner, 120), due: str(p.due, 60) }] : [];
        }),
        photos: (Array.isArray(s.photos) ? s.photos : []).flatMap(x => {
          const p = x && typeof x === 'object' ? x as Record<string, unknown> : {};
          const photo = typeof p.photo === 'string' ? p.photo.trim() : '';
          if (!photos.includes(photo) || seen.has(photo)) return [];
          seen.add(photo);
          return [{ photo, caption: str(p.caption, 400) }];
        }),
      };
    }).filter(s => s.heading || s.text || s.points.length || s.photos.length);
    const title = str(d.title, 200);
    if (title || sections.length) document = { title: title || 'Document', kind: DOC_KINDS.find(k => k === d.kind) ?? 'other', sections };
  }
  if (!reply && !document) return null;
  return { reply, ...(document ? { document } : {}) };
}

/** A document as words — how an earlier one is carried in the conversation,
 *  and what its figures are checked in. */
export function docAsText(d: TalkDoc): string {
  return [
    `[The document written: ${DOC_KIND_WORD[d.kind]} — ${d.title}]`,
    ...d.sections.flatMap(s => [
      s.heading ? `## ${s.heading}` : '',
      s.text,
      ...s.points.map(p => `- ${p.text} (${BASIS_WORD[p.basis]}${p.owner ? `; owner ${p.owner}` : ''}${p.due ? `; due ${p.due}` : ''})`),
      ...s.photos.map(p => `[${p.photo}: ${p.caption}]`),
    ]),
  ].filter(Boolean).join('\n');
}

/* A number as written — "1,200", "12.5", "07" — read the one way, so the same
   figure written two ways is still the same figure. A photo's label (P3) is
   not a figure. */
const NUMBER = /(?<![\p{L}\d.,])\d+(?:[.,]\d+)*/gu;
const asFigure = (s: string): string => {
  const plain = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  const n = Number(plain);
  return Number.isFinite(n) ? String(n) : s;
};
export const figuresIn = (text: string): string[] => [...text.matchAll(NUMBER)].map(m => asFigure(m[0]));

/** The figures in an answer that are in none of its sources — what the
 *  person said and typed, the times of their turns, Faultline's records and
 *  today's date. Each is said beside the answer, to be checked before it is
 *  used: a figure the assistant was not given is never passed as known. */
export function unsureFigures(answer: TalkAnswer, a: TalkAsk): string[] {
  const known = new Set([
    ...a.turns.filter(t => t.kind !== 'reply').flatMap(t => figuresIn(`${t.text} ${t.at}`)),
    ...figuresIn(a.context), ...figuresIn(a.today),
  ]);
  const d = answer.document;
  const said = [answer.reply, ...(d ? [d.title, ...d.sections.flatMap(s => [s.heading, s.text, ...s.points.flatMap(p => [p.text, p.owner, p.due]), ...s.photos.map(p => p.caption)])] : [])].join('\n');
  const out: string[] = [];
  for (const raw of said.matchAll(NUMBER)) {
    const f = asFigure(raw[0]);
    if (!known.has(f) && !out.includes(raw[0])) out.push(raw[0]);
  }
  return out.slice(0, 12);
}
