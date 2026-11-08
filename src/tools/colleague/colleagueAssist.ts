/* AI MODE'S COLLEAGUE AT THE GATEWAY — what it is told, the request read off the wire, the conversation in the model's
 * terms (with the capabilities it asked for and what running them gave), the server-side check of every call it
 * proposes, and its reply read back (docs/AI-MODE.md; the gateway's task `colleague`).
 *
 * Rowland, 8 November: two modes over ONE application. In AI Mode Claude operates Faultline only through the approved
 * capabilities (src/capabilities) — reads run at once, writes run only when the person confirms, nothing is deleted,
 * nothing is marked verified, and no figure is ever worked out by the model. So this file holds the rules that keep it
 * so at the gateway: the instructions are the gateway's own, a call whose name is not a capability or whose input does
 * not match its schema is dropped and the model told (never sent to the device), and every figure in a reply that is
 * not in what was said, the threads or a capability's result is returned as `unsure`.
 *
 * Shared word for word with the gateway (scripts/sync-assist.mjs copies it into supabase/functions/assist/colleague):
 * self-contained on purpose — the gateway runs it under Deno. The capabilities' schemas come in as an argument (the
 * gateway passes CAPABILITY_SCHEMAS from its copy of src/capabilities/schemas.ts). */

/** How each thing is known — the same seven words as the capabilities' HowKnown. */
export const HOW_KNOWN = ['observed', 'reported', 'measured', 'calculated', 'hypothesised', 'verified', 'unknown'] as const;

/** One turn of the conversation as it goes to the gateway. */
export interface ColleagueTurn {
  role: 'person' | 'colleague';
  text: string;
  /** When, as the conversation shows it: "10:42". */
  at: string;
  /** A photo's label: P1, P2 … */
  photo?: string;
}
export interface ColleagueImage { photo: string; data: string }
/** What running one call gave, as the device sends it back. */
export interface ColleagueResult { id: string; ok: boolean; says: string; data?: unknown; declined?: boolean }
/** One content block of the colleague's own message, kept as the API gave it. */
export type ColleagueBlock = Record<string, unknown> & { type: string };
/** A round the colleague already had: what it said and asked for, and what the calls gave. */
export interface ColleagueRound { content: ColleagueBlock[]; results: ColleagueResult[]; refused: ColleagueRefusal[] }
/** A call the gateway dropped, with why — answered to the model as an error, never sent to the device. */
export interface ColleagueRefusal { id: string; name: string; why: string }
/** The opaque `assistant` the gateway hands the device and is sent back as pending.assistant: the rounds before (with
 *  their results), and the colleague's newest message, whose calls the device is running. */
export interface ColleagueCarry { v: 1; rounds: ColleagueRound[]; content: ColleagueBlock[]; refused: ColleagueRefusal[] }
export interface ColleaguePending { carry: ColleagueCarry; results: ColleagueResult[] }

export interface ColleagueAsk {
  task: 'colleague';
  turns: ColleagueTurn[];
  images: ColleagueImage[];
  /** The conversation's threads as text (current and parked). */
  focus: string;
  today: string;
  /** The AI Mode conversation's id, for the audit only. */
  conversationId?: string;
  pending?: ColleaguePending;
}

/** A capability as Claude sees it (src/capabilities/schemas.ts CAPABILITY_SCHEMAS). */
export interface CapabilitySchema { name: string; kind: 'read' | 'write' | 'local'; description: string; input_schema: object }
export interface ColleagueCall { id: string; name: string; input: unknown }

/** What the gateway holds a request to before anything is sent on — Line Talk's limits, plus the rounds. */
export const COLLEAGUE_LIMITS = {
  turns: 600,
  turnChars: 12000,
  textChars: 240000,
  focusChars: 12000,
  images: 10,
  imageBytes: 450 * 1024,
  /** Rounds of calls within one answer — the device stops at six; one spare for the gateway's own retry. */
  rounds: 8,
  /** The colleague's own message, as JSON, per round. */
  contentBytes: 60 * 1024,
  /** Everything carried in pending, as JSON. */
  carryBytes: 240 * 1024,
  results: 16,
  resultChars: 4000,
  resultDataBytes: 12 * 1024,
  callsPerRound: 8,
  suggestions: 3,
  suggestionChars: 90,
} as const;

/** AI Mode's allowance a person a day, refused in its own words (tools/video/gatewayUsage allowance). */
export const COLLEAGUE_ALLOWANCE_WORDS = {
  calls: (n: number): string => `That is ${n} answers in AI Mode today — the allowance comes back over the next 24 hours. Manual Mode does everything meanwhile, and the conversation is kept.`,
  spent: (usd: string): string => `Today's allowance for AI Mode is spent ($${usd}). Manual Mode does everything meanwhile, and the conversation is kept.`,
};

/** Said when AI Mode cannot answer at all. */
export const COLLEAGUE_OFF = 'AI Mode is not switched on for this app yet — Manual Mode does everything it would, by hand, and the conversation is kept.';

/* THE COLLEAGUE — Rowland himself, as he walks a client's factory. */
export const COLLEAGUE_SYSTEM = `You are the colleague inside Faultline's AI Mode. Faultline is an operational improvement system for UK factories, mostly food manufacturing: production lines, their machines, problems, projects, the studies and calculators the team uses, and the story told to the client. You are talking with a lean and operations consultant with thirty years in UK food manufacturing, usually walking a client's factory with their phone. Talk with them the way a trusted, experienced colleague walking beside them would.

HOW TO TALK
- Natural, plain British English, in your own words, for this moment of this conversation. Never a template, never a form.
- Brief: usually two to five sentences. Go longer only when they ask for detail. A list (lines starting "- ") only for several separate things. No headings, no tables, no emoji.
- Answer what they actually said first. Pick out what matters most and say it plainly.
- Challenge assumptions, constructively, as a good colleague does. Before agreeing that something is the cause or the constraint, say what else it could be and what would tell them apart — for example: "Before we call the filler the constraint — have we looked at the accumulation before it, or whether the wrapper is starving it?"
- Ask ONE useful question back when the answer would move things on most. Never a list of questions. Never ask for what they have already told you. When they answer, build on it.
- No stock phrases: do not open with "Noted", "Got it" or "Great question", do not repeat back what they said, do not close by offering more help.

THE THREADS
- The conversation's threads are given to you (the current one and any parked). Keep track of them. When the subject changes, use set_focus (or park_focus to park the one in hand) so the conversation keeps its place, and say so in a few words. When a parked thread becomes relevant again, or the current one is done, offer to go back to it.

HOW EACH THING IS KNOWN
- Say how each thing is known, in plain words: observed (seen on the floor), reported (somebody said so), measured (timed, counted, weighed by a person), calculated (worked out by Faultline's own formulas), hypothesised (a possible explanation, not yet checked), verified (a person confirmed it in Faultline), or unknown.
- Never turn a report into a fact, or a hypothesis into a cause. "The operator says it jams after the reel change" is reported until somebody has watched it happen.

FIGURES — THE HARD RULE
- You never invent, estimate or calculate a figure. No arithmetic of your own: no totals, differences, percentages, rates, conversions or money. A figure comes from exactly two places: what the person said (quoted exactly as they said it), or the result of a capability you ran in this conversation (run_calculator, line_state and the like) — quoted exactly, with what it is of.
- When a figure would help and you do not have it, run the capability that works it out, or say plainly which figure is missing and how it could be measured.

USING FAULTLINE
- Look things up with the read capabilities before saying anything about a line, machine, problem, project or study. Never describe a record you have not read in this conversation. Cite the records you used by name ("Line 3's problems", "the Filler's capability study").
- Changing anything — raising a problem, starting a project, adding a note or an action — is proposed through the matching capability. The person sees it as a card and decides; nothing is changed until they confirm. Say plainly that you have proposed it, never that it is done, until the result says it was done. If they decline, accept it and carry on.
- You never delete anything and never mark anything verified — only a person does that, in Faultline itself. You never build methods, templates or tools.
- If a capability fails or is refused, say so in a sentence and carry on with what you know.

THE FACTORY — NEVER ASSUME
- You do not know this factory until Faultline tells you. Before acting on, or saying anything about, a machine, line, area or process the person names ("the scales", "the mixer", "Line 2", "packaging"), run resolve with exactly their words and the line or project the conversation is on.
- One match: use it. Several: ask which, naming each of them, and wait. None: say plainly it is not known in Faultline, and offer to add it — never assume it exists, never invent a machine, line or area, and never take one from another client's factory.
- factory_map shows the client's sites, areas, lines and machines when you need the whole picture.
- Say how each fact about the factory is known: confirmed (a person said it is right), reported (said in a conversation), from a document (name the document), inferred (guessed — e.g. a machine's kind from its name — not confirmed), recorded (typed into Faultline, nothing said of how), or unknown. Never present an inferred kind as fact.

FOLLOW-UPS
- When your answer is finished (not when you are asking to run a capability), end with one last line of up to three short things the person might say next, in their words, like this:
Suggestions: Show me Line 3's open problems | Park this for now | What would you measure first?
- Only that one line, exactly in that form, and only when there is something useful to suggest.`;

/** The words that can go to the model for one capability (name, description, input schema). */
export function colleagueTools(schemas: readonly CapabilitySchema[]): { name: string; description: string; input_schema: object; cache_control?: { type: 'ephemeral' } }[] {
  const tools = schemas.map(s => ({ name: s.name, description: s.description, input_schema: s.input_schema }));
  /* the tools are the start of the cached prefix: the last one marks it */
  if (tools.length) (tools[tools.length - 1] as { cache_control?: { type: 'ephemeral' } }).cache_control = { type: 'ephemeral' };
  return tools;
}

/* ------------------------------------------------------------------ the request read off the wire */

const LABEL = /^P\d{1,4}$/;
const B64 = /^[A-Za-z0-9+/=]+$/;
const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const bytes = (v: unknown): number => { try { return new TextEncoder().encode(JSON.stringify(v) ?? '').length; } catch { return Infinity; } };
const BLOCK_TYPES = ['text', 'thinking', 'redacted_thinking', 'tool_use', 'fallback'] as const;

/** The colleague's own content as it comes back from the device: an array of the block types the API gives, of a sane size — else null. */
export function readContent(v: unknown): ColleagueBlock[] | null {
  if (!Array.isArray(v) || v.length > 64 || bytes(v) > COLLEAGUE_LIMITS.contentBytes) return null;
  for (const b of v) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
    const t = (b as { type?: unknown }).type;
    if (!BLOCK_TYPES.some(k => k === t)) return null;
    if (t === 'tool_use') {
      const u = b as { id?: unknown; name?: unknown; input?: unknown };
      if (typeof u.id !== 'string' || !u.id || typeof u.name !== 'string' || !u.input || typeof u.input !== 'object') return null;
    }
    if (t === 'text' && typeof (b as { text?: unknown }).text !== 'string') return null;
  }
  return v as ColleagueBlock[];
}

function readResults(v: unknown): ColleagueResult[] | null {
  if (!Array.isArray(v) || v.length > COLLEAGUE_LIMITS.results) return null;
  const out: ColleagueResult[] = [];
  for (const r of v) {
    const o = r && typeof r === 'object' ? r as Record<string, unknown> : null;
    if (!o || typeof o.id !== 'string' || !o.id) return null;
    const data = o.data === undefined || bytes(o.data) > COLLEAGUE_LIMITS.resultDataBytes ? undefined : o.data;
    out.push({ id: o.id.slice(0, 120), ok: o.ok === true, says: str(o.says, COLLEAGUE_LIMITS.resultChars), ...(data !== undefined ? { data } : {}), ...(o.declined === true ? { declined: true } : {}) });
  }
  return out;
}

function readRefused(v: unknown): ColleagueRefusal[] {
  return (Array.isArray(v) ? v : []).slice(0, COLLEAGUE_LIMITS.callsPerRound * 2).flatMap(r => {
    const o = r && typeof r === 'object' ? r as Record<string, unknown> : {};
    return typeof o.id === 'string' && o.id ? [{ id: o.id.slice(0, 120), name: str(o.name, 80), why: str(o.why, 400) }] : [];
  });
}

/** The carry the gateway handed out, read back: rounds and content of the right shapes, within their sizes — else null. */
export function readCarry(v: unknown): ColleagueCarry | null {
  if (bytes(v) > COLLEAGUE_LIMITS.carryBytes) return null;
  /* a bare content array is one round with nothing before it */
  if (Array.isArray(v)) { const content = readContent(v); return content ? { v: 1, rounds: [], content, refused: [] } : null; }
  const o = v && typeof v === 'object' ? v as Record<string, unknown> : null;
  if (!o || o.v !== 1 || !Array.isArray(o.rounds) || o.rounds.length >= COLLEAGUE_LIMITS.rounds) return null;
  const content = readContent(o.content);
  if (!content) return null;
  const rounds: ColleagueRound[] = [];
  for (const r of o.rounds) {
    const ro = r && typeof r === 'object' ? r as Record<string, unknown> : {};
    const c = readContent(ro.content), res = readResults(ro.results);
    if (!c || !res) return null;
    rounds.push({ content: c, results: res, refused: readRefused(ro.refused) });
  }
  return { v: 1, rounds, content, refused: readRefused(o.refused) };
}

/** Read a request off the wire — every list and string held to its limit — or say why it cannot be answered. */
export function readColleagueAsk(body: unknown): { ok: true; ask: ColleagueAsk } | { ok: false; why: string } {
  const b = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const rawTurns = Array.isArray(b.turns) ? b.turns : [];
  if (rawTurns.length > COLLEAGUE_LIMITS.turns) return { ok: false, why: `This conversation is longer than AI Mode takes at once (${COLLEAGUE_LIMITS.turns} turns) — start a new one for the next part; this one is kept.` };
  const turns: ColleagueTurn[] = [];
  for (const r of rawTurns) {
    const t = r && typeof r === 'object' ? r as Record<string, unknown> : {};
    const role = t.role === 'person' || t.role === 'colleague' ? t.role : null;
    if (!role) continue;
    const photo = role === 'person' && typeof t.photo === 'string' && LABEL.test(t.photo) ? t.photo : undefined;
    const text = str(t.text, COLLEAGUE_LIMITS.turnChars);
    if (!text && !photo) continue;
    turns.push({ role, at: str(t.at, 20), text, ...(photo ? { photo } : {}) });
  }
  if (turns.reduce((n, t) => n + t.text.length, 0) > COLLEAGUE_LIMITS.textChars) return { ok: false, why: 'This conversation has more words than AI Mode takes at once — start a new one for the next part; this one is kept.' };
  const last = turns[turns.length - 1];
  if (!last || last.role !== 'person') return { ok: false, why: 'Nothing new to answer — say, type or add a photo first.' };
  const rawImages = Array.isArray(b.images) ? b.images : [];
  if (rawImages.length > COLLEAGUE_LIMITS.images) return { ok: false, why: `At most ${COLLEAGUE_LIMITS.images} pictures go to AI Mode at once.` };
  const images: ColleagueImage[] = [];
  for (const r of rawImages) {
    const i = r && typeof r === 'object' ? r as Record<string, unknown> : {};
    const photo = typeof i.photo === 'string' && LABEL.test(i.photo) ? i.photo : '';
    const data = typeof i.data === 'string' ? i.data : '';
    if (!photo || !data || !B64.test(data) || data.length * 0.75 > COLLEAGUE_LIMITS.imageBytes) return { ok: false, why: 'A picture is not a small JPEG from this conversation.' };
    if (!turns.some(t => t.photo === photo)) return { ok: false, why: 'A picture is not one of this conversation’s photos.' };
    images.push({ photo, data });
  }
  let pending: ColleaguePending | undefined;
  if (b.pending !== undefined && b.pending !== null) {
    const p = typeof b.pending === 'object' ? b.pending as Record<string, unknown> : {};
    const carry = readCarry(p.assistant);
    const results = readResults(p.results);
    if (!carry || !results) return { ok: false, why: 'What AI Mode asked to run could not be read back — send your message again.' };
    if (!carry.content.some(c => c.type === 'tool_use')) return { ok: false, why: 'What AI Mode asked to run could not be read back — send your message again.' };
    pending = { carry, results };
  }
  const conversationId = str(b.conversationId, 80);
  return { ok: true, ask: { task: 'colleague', turns, images, focus: str(b.focus, COLLEAGUE_LIMITS.focusChars), today: str(b.today, 60), ...(conversationId ? { conversationId } : {}), ...(pending ? { pending } : {}) } };
}

/* ------------------------------------------------------------------ the conversation in the model's terms */

type Cache = { cache_control?: { type: 'ephemeral' } };
type TextBlock = { type: 'text'; text: string } & Cache;
type ImageBlock = { type: 'image'; source: { type: 'base64'; media_type: 'image/jpeg'; data: string } } & Cache;
type ResultBlock = { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean } & Cache;
type UserBlock = TextBlock | ImageBlock | ResultBlock;
export type ColleagueMessage = { role: 'user'; content: UserBlock[] } | { role: 'assistant'; content: (ColleagueBlock | TextBlock)[] };

/** One call's result as the model reads it: what it says, then its data, held to a size. */
export function resultText(r: ColleagueResult): string {
  if (r.declined) return `The person declined this — it was not done. ${r.says}`.trim();
  let data = '';
  if (r.data !== undefined) {
    try { data = JSON.stringify(r.data); } catch { data = ''; }
    if (data.length > COLLEAGUE_LIMITS.resultDataBytes) data = '';
  }
  return `${r.says || (r.ok ? 'Done.' : 'It could not be run.')}${data ? `\n<data>${data}</data>` : ''}`;
}

/** Every call in a message answered, in one user message, in the order the calls were made: a result the device sent,
 *  else the gateway's refusal, else "not run" — the API needs an answer for each. */
export function resultBlocks(content: readonly ColleagueBlock[], results: readonly ColleagueResult[], refused: readonly ColleagueRefusal[]): ResultBlock[] {
  return content.filter(c => c.type === 'tool_use').map(c => {
    const id = String(c.id);
    const r = results.find(x => x.id === id);
    if (r) return { type: 'tool_result' as const, tool_use_id: id, content: resultText(r), ...(r.ok || r.declined ? {} : { is_error: true }) };
    const no = refused.find(x => x.id === id);
    return { type: 'tool_result' as const, tool_use_id: id, content: no ? `Refused by Faultline's gateway: ${no.why}` : 'This was not run.', is_error: true };
  });
}

/** The conversation in the model's terms: the person's turns as theirs (time and photo marked), the colleague's
 *  replies as its own, then the threads and today's date after the newest turn — so the conversation before them
 *  is read from the cache — and then the rounds of calls in this answer, each with every call's result. */
export function colleagueMessages(a: ColleagueAsk): ColleagueMessage[] {
  const pictures = new Map(a.images.map(i => [i.photo, i.data]));
  const out: ColleagueMessage[] = [];
  const put = (role: 'user' | 'assistant', blocks: UserBlock[]) => {
    const prev = out[out.length - 1];
    if (prev && prev.role === role) (prev.content as UserBlock[]).push(...blocks);
    else out.push({ role, content: blocks } as ColleagueMessage);
  };
  for (const t of a.turns) {
    if (t.role === 'colleague') {
      if (!out.length) put('user', [{ type: 'text', text: '[The conversation opens.]' }]);
      put('assistant', [{ type: 'text', text: t.text }]);
      continue;
    }
    if (t.photo) {
      const data = pictures.get(t.photo);
      put('user', [{ type: 'text', text: `[${t.at} · photo ${t.photo}]${t.text ? ` ${t.text}` : ''}${data ? '' : ' (the picture is not sent this time)'}` },
        ...(data ? [{ type: 'image' as const, source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data } }] : [])]);
      continue;
    }
    put('user', [{ type: 'text', text: `[${t.at}] ${t.text}` }]);
  }
  const last = out[out.length - 1];
  const end = last?.content[last.content.length - 1] as Cache | undefined;
  if (end) end.cache_control = { type: 'ephemeral' };
  const threads = a.focus.trim() ? `THE CONVERSATION'S THREADS:\n<threads>\n${a.focus.trim()}\n</threads>` : 'No threads are open yet.';
  put('user', [{ type: 'text', text: `${threads}\n\nToday is ${a.today || 'not given'}.\nCarry on the conversation: reply to the person's latest turn above.` }]);
  if (a.pending) {
    const rounds: ColleagueRound[] = [...a.pending.carry.rounds, { content: a.pending.carry.content, results: a.pending.results, refused: a.pending.carry.refused }];
    let lastResult: ResultBlock | undefined;
    for (const r of rounds) {
      out.push({ role: 'assistant', content: r.content });
      const blocks = resultBlocks(r.content, r.results, r.refused);
      out.push({ role: 'user', content: blocks });
      lastResult = blocks[blocks.length - 1];
    }
    /* each round's results cached in turn, so the next round reads them from the cache */
    if (lastResult) lastResult.cache_control = { type: 'ephemeral' };
  }
  return out;
}

/** The carry for the next round: what came before (with its results) plus the colleague's newest message. */
export function nextCarry(a: ColleagueAsk, content: ColleagueBlock[], refused: ColleagueRefusal[]): ColleagueCarry {
  const rounds = a.pending ? [...a.pending.carry.rounds, { content: a.pending.carry.content, results: a.pending.results, refused: a.pending.carry.refused }] : [];
  return { v: 1, rounds, content, refused };
}

/* ------------------------------------------------------------------ the server-side check of every call */

type Schema = Record<string, unknown>;
const typeOf = (v: unknown): string => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const isType = (v: unknown, t: string): boolean => {
  switch (t) {
    case 'object': return typeOf(v) === 'object';
    case 'array': return Array.isArray(v);
    case 'string': return typeof v === 'string';
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    case 'integer': return typeof v === 'number' && Number.isInteger(v);
    case 'boolean': return typeof v === 'boolean';
    case 'null': return v === null;
    default: return false;
  }
};

/** Does `value` match `schema`? The subset the capabilities use: type (one or several), enum, const, required,
 *  properties, additionalProperties (false or a schema), items, min/max (length, items, value), pattern, anyOf.
 *  Returns why not, naming where — or null when it matches. A keyword it does not know is not checked. */
export function schemaError(schema: unknown, value: unknown, at = 'input'): string | null {
  if (schema === true || schema === undefined) return null;
  if (schema === false) return `${at} is not allowed`;
  if (!schema || typeof schema !== 'object') return null;
  const s = schema as Schema;
  if (Array.isArray(s.anyOf) || Array.isArray(s.oneOf)) {
    const opts = (s.anyOf ?? s.oneOf) as unknown[];
    if (!opts.some(o => schemaError(o, value, at) === null)) return `${at} matches none of the shapes allowed`;
  }
  if (s.type !== undefined) {
    const types = Array.isArray(s.type) ? s.type.map(String) : [String(s.type)];
    if (!types.some(t => isType(value, t))) return `${at} should be ${types.join(' or ')}, not ${typeOf(value)}`;
  }
  if ('const' in s && JSON.stringify(s.const) !== JSON.stringify(value)) return `${at} should be ${JSON.stringify(s.const)}`;
  if (Array.isArray(s.enum) && !s.enum.some(e => JSON.stringify(e) === JSON.stringify(value))) return `${at} should be one of ${s.enum.map(e => JSON.stringify(e)).join(', ')}`;
  if (typeof value === 'string') {
    if (typeof s.minLength === 'number' && value.length < s.minLength) return `${at} is too short (at least ${s.minLength} characters)`;
    if (typeof s.maxLength === 'number' && value.length > s.maxLength) return `${at} is too long (at most ${s.maxLength} characters)`;
    if (typeof s.pattern === 'string') { try { if (!new RegExp(s.pattern, 'u').test(value)) return `${at} is not in the form asked for`; } catch { /* a pattern it cannot read is not checked */ } }
  }
  if (typeof value === 'number') {
    if (typeof s.minimum === 'number' && value < s.minimum) return `${at} is below ${s.minimum}`;
    if (typeof s.maximum === 'number' && value > s.maximum) return `${at} is above ${s.maximum}`;
    if (typeof s.exclusiveMinimum === 'number' && value <= s.exclusiveMinimum) return `${at} should be above ${s.exclusiveMinimum}`;
    if (typeof s.exclusiveMaximum === 'number' && value >= s.exclusiveMaximum) return `${at} should be below ${s.exclusiveMaximum}`;
  }
  if (Array.isArray(value)) {
    if (typeof s.minItems === 'number' && value.length < s.minItems) return `${at} needs at least ${s.minItems} items`;
    if (typeof s.maxItems === 'number' && value.length > s.maxItems) return `${at} takes at most ${s.maxItems} items`;
    if (s.items && typeof s.items === 'object') {
      for (let i = 0; i < value.length; i++) { const e = schemaError(s.items, value[i], `${at}[${i}]`); if (e) return e; }
    }
  }
  if (typeOf(value) === 'object') {
    const o = value as Record<string, unknown>;
    const props = s.properties && typeof s.properties === 'object' ? s.properties as Record<string, unknown> : {};
    for (const k of Array.isArray(s.required) ? s.required.map(String) : []) if (!(k in o) || o[k] === undefined) return `${at}.${k} is missing`;
    for (const [k, v] of Object.entries(o)) {
      if (k in props) { const e = schemaError(props[k], v, `${at}.${k}`); if (e) return e; continue; }
      if (s.additionalProperties === false) return `${at}.${k} is not one of its fields`;
      if (s.additionalProperties && typeof s.additionalProperties === 'object') { const e = schemaError(s.additionalProperties, v, `${at}.${k}`); if (e) return e; }
    }
  }
  return null;
}

/** Every call in the colleague's message checked against the capabilities: its name must be one, its input must match
 *  that capability's schema, and no more than a round's worth are taken. What passes goes to the device; what does
 *  not is refused with why — answered to the model as an error in the next round, never sent on. */
export function checkCalls(content: readonly ColleagueBlock[], schemas: readonly CapabilitySchema[]): { calls: (ColleagueCall & { kind: CapabilitySchema['kind'] })[]; refused: ColleagueRefusal[] } {
  const calls: (ColleagueCall & { kind: CapabilitySchema['kind'] })[] = [];
  const refused: ColleagueRefusal[] = [];
  for (const c of content) {
    if (c.type !== 'tool_use') continue;
    const id = String(c.id ?? ''), name = String(c.name ?? '');
    const cap = schemas.find(s => s.name === name);
    if (!cap) { refused.push({ id, name, why: `"${name}" is not one of Faultline's capabilities — use only the ones you are given.` }); continue; }
    const wrong = schemaError(cap.input_schema, c.input);
    if (wrong) { refused.push({ id, name, why: `The input for ${name} does not match what it takes: ${wrong}.` }); continue; }
    if (calls.length >= COLLEAGUE_LIMITS.callsPerRound) { refused.push({ id, name, why: `At most ${COLLEAGUE_LIMITS.callsPerRound} capabilities at once — ask for this one next.` }); continue; }
    calls.push({ id, name, input: c.input, kind: cap.kind });
  }
  return { calls, refused };
}

/* ------------------------------------------------------------------ the reply read back */

const SUGGEST = /^\s*(?:[*_]{1,2})?suggestions?(?:[*_]{1,2})?\s*[:：]\s*(?:[*_]{1,2})?\s*(.*)$/i;
const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/;
const cleanSuggestion = (s: string): string => s.replace(/^[\s*_"“‘'`]+|[\s*_"”’'`]+$/g, '').replace(/\s+/g, ' ').trim();

/** The colleague's words from its message — the text blocks, joined — split into the reply and its follow-ups: a last
 *  line "Suggestions: a | b | c" (or that heading with a few bullets under it) is taken off and read as up to three. */
export function colleagueReply(content: readonly ColleagueBlock[]): { reply: string; suggestions: string[] } {
  const text = content.filter(c => c.type === 'text').map(c => String(c.text ?? '')).join('\n\n').trim();
  const lines = text.split('\n');
  let end = lines.length;
  while (end > 0 && !lines[end - 1].trim()) end--;
  let suggestions: string[] = [];
  let cut = -1;
  /* a heading followed only by bullets */
  let i = end - 1;
  const bullets: string[] = [];
  while (i >= 0 && BULLET.test(lines[i])) { bullets.unshift(lines[i].replace(BULLET, '$1')); i--; }
  if (bullets.length && i >= 0) { const m = SUGGEST.exec(lines[i]); if (m && !m[1].trim()) { suggestions = bullets; cut = i; } }
  /* or the one line */
  if (cut < 0 && end > 0) {
    const m = SUGGEST.exec(lines[end - 1]);
    if (m && m[1].trim()) { suggestions = m[1].split(/\s*\|\s*/); cut = end - 1; }
  }
  if (cut < 0) return { reply: text, suggestions: [] };
  const reply = lines.slice(0, cut).join('\n').trim();
  const seen = new Set<string>();
  const out = suggestions.map(cleanSuggestion).filter(s => s && s.length <= COLLEAGUE_LIMITS.suggestionChars && !seen.has(s.toLowerCase()) && seen.add(s.toLowerCase()));
  return { reply, suggestions: out.slice(0, COLLEAGUE_LIMITS.suggestions) };
}

/* A number as written — "1,200", "12.5", "07" — read the one way (the same rule as Line Talk's, tools/talk/talkAssist
   figuresIn; repeated here because this file is copied alone to the gateway). A photo's label (P3) is not a figure. */
const NUMBER = /(?<![\p{L}\d.,])\d+(?:[.,]\d+)*/gu;
const asFigure = (s: string): string => {
  const plain = /^\d{1,3}(,\d{3})+(\.\d+)?$/.test(s) ? s.replace(/,/g, '') : s.replace(/,/g, '.');
  const n = Number(plain);
  return Number.isFinite(n) ? String(n) : s;
};
export const colleagueFiguresIn = (text: string): string[] => [...text.matchAll(NUMBER)].map(m => asFigure(m[0]));

const asText = (v: unknown): string => { try { return typeof v === 'string' ? v : JSON.stringify(v) ?? ''; } catch { return ''; } };

/** The figures in a reply found in none of its sources — the person's turns and their times, the threads, today, and
 *  and every capability's result in this answer (what it says and its data). Each is
 *  said beside the reply, to be checked: a figure the colleague was not given is never passed as known. */
export function unsureColleague(reply: string, a: ColleagueAsk): string[] {
  const results = a.pending ? [...a.pending.carry.rounds.flatMap(r => r.results), ...a.pending.results] : [];
  const known = new Set([
    ...a.turns.filter(t => t.role === 'person').flatMap(t => colleagueFiguresIn(`${t.text} ${t.at}`)),
    ...colleagueFiguresIn(a.focus), ...colleagueFiguresIn(a.today),
    ...results.flatMap(r => colleagueFiguresIn(`${r.says} ${r.data === undefined ? '' : asText(r.data)}`)),
  ]);
  const out: string[] = [];
  for (const raw of reply.matchAll(NUMBER)) {
    const f = asFigure(raw[0]);
    if (!known.has(f) && !out.includes(raw[0])) out.push(raw[0]);
  }
  return out.slice(0, 12);
}

/** The instructions and the tools this copy holds, as one text — for a fingerprint, never anything secret. */
export const colleagueRulesText = (schemas: readonly CapabilitySchema[]): string => COLLEAGUE_SYSTEM + JSON.stringify(schemas);
