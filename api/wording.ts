/* BETTER WORDING — what somebody typed, said again more clearly.
 *
 * Rowland, 6 October: "I want AI to improve my wording for any section that
 * the user will be typing in. Connect the Claude API to that section; if no
 * Claude, run the Gemini free version like we have for the voice."
 *
 * One short piece of text in, the same facts out in clearer words — for a
 * problem, a fix, how a stage went, a part of the plan, a snag. It never
 * writes anything: the screen shows the suggestion beside what was typed, and
 * the person uses it or keeps their own.
 *
 * WHICH MODEL. Claude when ANTHROPIC_API_KEY is set on the server; otherwise
 * the free Gemini the voice notes use (GEMINI_API_KEY); neither, and it says
 * so. The keys stay here; the phone never sees one. Only somebody signed in
 * to this app's Supabase is answered, so a stranger cannot spend the quota.
 *
 * Self-contained like api/voice.ts: a relative import here needs a file
 * extension the app's bundler does not want.
 */
import Anthropic from '@anthropic-ai/sdk';

/* ------------------------------ the contract ------------------------------ */

/** Which box the words came from — the house style differs a little. */
export type WordingField = 'problem' | 'fix' | 'account' | 'part' | 'snag' | 'note' | 'passes' | 'other';

export interface WordingRequest {
  field: WordingField;
  text: string;
  /** Machine and stage names on the job, so they are kept exactly as spelled. */
  names?: string[];
}

export interface WordingResult {
  text: string;
  /** Which model answered — "claude" or "gemini". */
  by: 'claude' | 'gemini';
}

const WHAT: Record<WordingField, string> = {
  problem: 'a problem found on a production line or a machine being installed — what went wrong',
  fix: 'the name of a fix — the job that puts a problem right, starting with a verb',
  account: 'how a stage of an installation went — what was done',
  part: 'one line of planned work inside a stage of a plan',
  snag: 'a snag spotted on the floor — what is wrong and where',
  note: 'a note for a project meeting',
  passes: 'what a test must show to pass — measurable where the writer gave numbers',
  other: 'a short note on a factory project',
};

function promptFor(req: WordingRequest): string {
  return [
    `Rewrite this text so it reads clearly and professionally. It is ${WHAT[req.field]}, written quickly on a factory floor, and it will be read by the project team and a client.`,
    'Rules:',
    '- Keep every fact, number, unit, date, name and part number exactly. Add nothing that is not in the text. Do not guess causes or outcomes.',
    '- Fix spelling, grammar and punctuation. Plain British English. Short sentences. No jargon the writer did not use.',
    '- Keep it about the same length or shorter. One line stays one line.',
    '- Reply with the rewritten text only — no quotes, no preamble, no explanation.',
    ...(req.names?.length ? [`Names on this job, to keep spelled exactly as here: ${req.names.slice(0, 40).join(', ')}.`] : []),
    '',
    'Text:',
    req.text,
  ].join('\n');
}

/* ------------------------------- the models ------------------------------- */

async function withClaude(req: WordingRequest, apiKey: string): Promise<string> {
  const client = new Anthropic({ apiKey });
  const response = await client.beta.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-opus-5-5',
    max_tokens: 2000,
    // A short rewrite, a person waiting on it: the least thinking that does it.
    output_config: { effort: 'low' },
    // A refused request is answered by the model the API picks for it.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages: [{ role: 'user', content: promptFor(req) }],
  });
  if (response.stop_reason === 'refusal') throw new WordingError(422, 'refused');
  return response.content.map(b => (b.type === 'text' ? b.text : '')).join('').trim();
}

const GEMINI = 'https://generativelanguage.googleapis.com/v1beta';
/** The Flash models this key can use, newest first — the voice notes' rule. */
async function flashModels(key: string): Promise<string[]> {
  if (process.env.GEMINI_MODEL) return [process.env.GEMINI_MODEL];
  try {
    const res = await fetch(`${GEMINI}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
    const body = await res.json() as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
    const names = (body.models ?? []).filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name.replace(/^models\//, ''));
    const version = (n: string) => Number(/gemini-([\d.]+)/.exec(n)?.[1] ?? 0);
    const newest = (re: RegExp) => names.filter(n => re.test(n)).sort((a, b) => version(b) - version(a));
    const list = [...newest(/^gemini-[\d.]+-flash$/), ...newest(/^gemini-[\d.]+-flash-lite$/)];
    return list.length ? list : ['gemini-2.5-flash'];
  } catch {
    return ['gemini-2.5-flash'];
  }
}

async function withGemini(req: WordingRequest, key: string): Promise<string> {
  let last = 0;
  for (const model of (await flashModels(key)).slice(0, 5)) {
    const res = await fetch(`${GEMINI}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: promptFor(req) }] }],
        generationConfig: { temperature: 0.2, ...(model.startsWith('gemini-2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}) },
      }),
    });
    last = res.status;
    if ([404, 429, 503].includes(res.status)) continue;   // gone, busy, or out of its free minute — the next Flash
    if (!res.ok) throw new WordingError(res.status, (await res.text().catch(() => '')).slice(0, 200));
    const body = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return (body.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '').trim();
  }
  throw new WordingError(last || 503, 'no model answered');
}

class WordingError extends Error {
  constructor(public status: number, public detail: string) { super(`wording ${status}`); }
}

/* ------------------------------- the door --------------------------------- */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

async function signedIn(auth: string | null): Promise<boolean> {
  const url = process.env.VITE_SUPABASE_URL, anon = process.env.VITE_SUPABASE_ANON_KEY;
  const token = auth?.replace(/^Bearer\s+/i, '');
  if (!url || !anon || !token) return false;
  const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: anon, authorization: `Bearer ${token}` } });
  return r.ok;
}

/** GET — which model would answer. Never says a key. */
export async function GET(): Promise<Response> {
  const by = process.env.ANTHROPIC_API_KEY ? 'claude' : process.env.GEMINI_API_KEY ? 'gemini' : null;
  return json({ ok: !!by, by }, by ? 200 : 503);
}

export async function POST(request: Request): Promise<Response> {
  const claude = process.env.ANTHROPIC_API_KEY, gemini = process.env.GEMINI_API_KEY;
  if (!claude && !gemini) return json({ error: 'Better wording is not switched on — no Claude or Gemini key on the server.' }, 503);
  if (!(await signedIn(request.headers.get('authorization')))) return json({ error: 'Sign in to use better wording.' }, 401);
  let body: WordingRequest;
  try { body = await request.json() as WordingRequest; } catch { return json({ error: 'Nothing arrived to reword.' }, 400); }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) return json({ error: 'Nothing to reword.' }, 400);
  if (text.length > 4000) return json({ error: 'That is too long to reword in one go.' }, 413);
  const req: WordingRequest = { field: body.field in WHAT ? body.field : 'other', text, names: Array.isArray(body.names) ? body.names.filter(n => typeof n === 'string') : [] };
  /* Claude first when it is there; if it fails and Gemini is there too, the
     free reader answers instead of nobody. */
  try {
    if (claude) {
      try { return json({ text: await withClaude(req, claude), by: 'claude' } satisfies WordingResult); }
      catch (e) { if (!gemini) throw e; console.error('wording: claude', e instanceof Error ? e.message : e); }
    }
    return json({ text: await withGemini(req, gemini as string), by: 'gemini' } satisfies WordingResult);
  } catch (e) {
    console.error('wording:', e instanceof WordingError ? `${e.status} ${e.detail}` : e);
    const busy = e instanceof WordingError && (e.status === 429 || e.status >= 500);
    return json({ retry: busy, error: busy ? 'Better wording is busy — try again in a moment.' : 'That could not be reworded. Try again.' }, 502);
  }
}
