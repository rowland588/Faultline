/* VOICE — what somebody SAID, read into the fields of a record that exists.
 *
 * Rowland: "on every part of the app I can talk the information into it — a
 * fix, an observation, etc." The phone records; this reads the recording
 * and returns the fields of ONE form the person is already on: a fix, what was
 * found, how a test or an install step went. It never writes anything. The
 * screen shows what was heard beside what it would change, and the person puts
 * it in or does not.
 *
 * THE KEY STAYS HERE. GEMINI_API_KEY is a server-side Vercel variable; the
 * phone never sees it. And the endpoint answers only somebody signed in to
 * this app's Supabase, so a stranger cannot spend the quota.
 *
 * THE MODEL IS ONE FUNCTION. `understand()` is the only code that knows it is
 * Gemini. GEMINI_MODEL picks the model (default gemini-2.5-flash); another
 * provider is another `understand()`.
 *
 * Self-contained on purpose: this runs as an ES module on Vercel, and a
 * relative import there needs a file extension the app's own bundler does not
 * want. Nothing here imports anything.
 */

/* ------------------------------ the contract ------------------------------ */

export type VoiceForm = 'fix' | 'found' | 'test' | 'install';

export interface VoiceContext {
  /** Today, as the phone sees it — "Friday" means the Friday after this. */
  today: string;
  /** Names already on the job, so a misheard "Brilor Pack" comes back as the
   *  supplier it plainly is. */
  machines?: string[];
  suppliers?: string[];
  /** The record the person is on, when there is one. */
  on?: { title?: string; machine?: string };
}

export interface VoiceRequest {
  form: VoiceForm;
  /** Base64 audio. The phone sends 16 kHz mono WAV, which every model reads. */
  audio: string;
  mime?: string;
  context: VoiceContext;
}

export interface VoiceResult {
  /** What was said, word for word as near as the model can manage. */
  transcript: string;
  /** The form's fields, only the ones that were actually said. */
  fields: Record<string, unknown>;
  /** Anything said that does not belong in this form — never thrown away. */
  leftover?: string;
}

/* -------------------------------- the forms ------------------------------- */

const DATE = { type: 'STRING', description: 'ISO date YYYY-MM-DD, or empty when no day was said.' };
const OUTCOME = (words: string) => ({ type: 'STRING', enum: ['passed', 'failed', 'notRun', ''], description: words });

/** Per form: what it is for, and the fields it has. Only fields the app
 *  already stores — nothing here invents a place to put something. */
export const FORMS: Record<VoiceForm, { what: string; fields: Record<string, unknown> }> = {
  fix: {
    what: 'a FIX: something on the line that has to be put right.',
    fields: {
      title: { type: 'STRING', description: 'What is being fixed, short, like a task title. E.g. "Replace sensor 2".' },
      machine: { type: 'STRING', description: 'Which machine, exactly as it appears in the machines list; empty if none said or none matches.' },
      problem: { type: 'STRING', description: 'The problem being fixed, in a sentence.' },
      withWhom: { type: 'STRING', description: 'Who is doing it — a supplier from the list, a person, or empty.' },
      plannedFor: DATE,
      result: { type: 'STRING', description: 'What was done, only if the fix was said to have happened.' },
      outcome: OUTCOME('passed = fixed; failed = tried and did not fix it; notRun = did not happen; empty = not said.'),
    },
  },
  found: {
    what: 'WHAT WE FOUND: observations written down on the floor. Split separate things into separate notes.',
    fields: {
      notes: {
        type: 'ARRAY',
        items: {
          type: 'OBJECT',
          properties: {
            what: { type: 'STRING', description: 'One thing seen, one short sentence.' },
            owner: { type: 'STRING', description: 'Whose it is, if said; empty otherwise.' },
          },
          required: ['what'],
        },
      },
    },
  },
  test: {
    what: 'the DAY of a TEST: what was actually run and how it went.',
    fields: {
      product: { type: 'STRING', description: 'The product actually run, if said.' },
      ranOn: DATE,
      result: { type: 'STRING', description: 'What happened, in the terms it was measured in — speeds, counts, times.' },
      outcome: OUTCOME('passed; failed = ran and did not pass; notRun = did not happen; empty = not said.'),
    },
  },
  install: {
    what: 'an INSTALL STEP on a machine: a stage of putting it in.',
    fields: {
      result: { type: 'STRING', description: 'What was done, and anything that stopped it.' },
      ranOn: DATE,
      plannedFor: { type: 'STRING', description: 'ISO date it is now planned for, if a new day was said; empty otherwise.' },
      withWhom: { type: 'STRING', description: 'Who is doing it, if said.' },
      outcome: OUTCOME('passed = done; failed = hit a problem; notRun = did not happen; empty = not said.'),
    },
  },
};

export function schemaFor(form: VoiceForm): Record<string, unknown> {
  const f = FORMS[form];
  return {
    type: 'OBJECT',
    properties: {
      transcript: { type: 'STRING', description: 'Everything that was said, word for word.' },
      fields: { type: 'OBJECT', properties: f.fields },
      leftover: { type: 'STRING', description: 'Anything said that does not belong in this form. Empty if nothing.' },
    },
    required: ['transcript', 'fields'],
  };
}

export function promptFor(form: VoiceForm, ctx: VoiceContext): string {
  const list = (label: string, xs?: string[]) => (xs && xs.length ? `${label}: ${xs.join('; ')}.` : '');
  return [
    'You are reading a voice note recorded on a factory floor during the installation and commissioning of packaging machinery in the UK.',
    `The person is filling in ${FORMS[form].what}`,
    'Return ONLY the fields that were actually said. Leave a field empty rather than guess.',
    'Speech recognition mangles names. When a name sounds like one on these lists, use the list spelling exactly.',
    list('Machines on this job', ctx.machines),
    list('Suppliers and people on this job', ctx.suppliers),
    ctx.on?.title ? `They are on the record "${ctx.on.title}"${ctx.on.machine ? ` for the ${ctx.on.machine}` : ''}.` : '',
    `Today is ${ctx.today}. Turn "today", "tomorrow", "Friday" and the like into ISO dates from today.`,
    'Anything said that does not belong in this form goes in "leftover", word for word — never drop it.',
    'British English. Do not add anything that was not said.',
  ].filter(Boolean).join('\n');
}

/** Tidy what came back into exactly the form's fields, strings trimmed and
 *  empty ones dropped — so the screen never offers to write a blank over a
 *  value that was there. */
export function tidy(form: VoiceForm, raw: unknown): VoiceResult {
  const r = (raw ?? {}) as { transcript?: unknown; fields?: Record<string, unknown>; leftover?: unknown };
  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
  const out: Record<string, unknown> = {};
  const given = r.fields ?? {};
  for (const k of Object.keys(FORMS[form].fields)) {
    const v = given[k];
    if (k === 'notes' && Array.isArray(v)) {
      const notes = v.map(n => ({ what: str((n as { what?: unknown }).what), owner: str((n as { owner?: unknown }).owner) }))
        .filter(n => n.what);
      if (notes.length) out.notes = notes;
      continue;
    }
    const s = str(v);
    if (!s) continue;
    if ((k === 'ranOn' || k === 'plannedFor') && !/^\d{4}-\d{2}-\d{2}$/.test(s)) continue;
    if (k === 'outcome' && !['passed', 'failed', 'notRun'].includes(s)) continue;
    out[k] = s;
  }
  const leftover = str(r.leftover);
  return { transcript: str(r.transcript), fields: out, ...(leftover ? { leftover } : {}) };
}

/* ------------------------------- the model -------------------------------- */

const PREFERRED = 'gemini-2.5-flash';
const API = 'https://generativelanguage.googleapis.com/v1beta';

/* WHICH MODEL. GEMINI_MODEL when it is set. Otherwise the newest Flash this
   key can use, off Google's own list: the day this went live Google answered
   "gemini-2.5-flash is no longer available to new users — use
   gemini-3.8-flash", while still LISTING 2.5. So the list decides the order
   and a refusal moves on to the next one, rather than a name written here
   going stale again. Never Lite, TTS, image or preview. */
export function flashModels(names: string[]): string[] {
  const version = (n: string) => Number(/gemini-([\d.]+)/.exec(n)?.[1] ?? 0);
  return names
    .map(n => n.replace(/^models\//, ''))
    .filter(n => /^gemini-[\d.]+-flash$/.test(n))
    .sort((a, b) => version(b) - version(a));
}
export const pickModel = (names: string[]): string | undefined => flashModels(names)[0];

let chosen: string | undefined;
let candidates: string[] | undefined;
async function listModels(key: string): Promise<string[]> {
  const res = await fetch(`${API}/models?pageSize=200`, { headers: { 'x-goog-api-key': key } });
  if (!res.ok) return [];
  const body = await res.json() as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
  return (body.models ?? []).filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name);
}
async function modelsFor(key: string): Promise<string[]> {
  if (process.env.GEMINI_MODEL) return [process.env.GEMINI_MODEL];
  if (chosen) return [chosen, ...(candidates ?? []).filter(m => m !== chosen)];
  candidates = flashModels(await listModels(key));
  return candidates.length ? candidates : [PREFERRED];
}

/** Call the first model that answers; remember it. A 404 ("no longer
 *  available") moves on to the next; anything else is the answer. */
async function generate(key: string, body: (model: string) => unknown): Promise<{ res: Response; model: string }> {
  const list = await modelsFor(key);
  let last: { res: Response; model: string } | undefined;
  for (const model of list.slice(0, 4)) {
    const res = await fetch(`${API}/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(body(model)),
    });
    last = { res, model };
    if (res.status !== 404) { if (res.ok) chosen = model; return last; }
  }
  return last as { res: Response; model: string };
}
const MODEL = () => process.env.GEMINI_MODEL || chosen || candidates?.[0] || PREFERRED;

async function understand(req: VoiceRequest, key: string): Promise<unknown> {
  const { res } = await generate(key, model => ({
    contents: [{
      role: 'user',
      parts: [
        { text: promptFor(req.form, req.context) },
        { inline_data: { mime_type: req.mime || 'audio/wav', data: req.audio } },
      ],
    }],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
      responseSchema: schemaFor(req.form),
      /* No thinking on 2.5: this is reading, not reasoning, and it is the
         phone waiting on it. Other generations take their own setting, so
         none is sent to them. */
      ...(model.startsWith('gemini-2.5') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  }));
  if (!res.ok) {
    const why = await res.text().catch(() => '');
    throw new ModelError(res.status, why.slice(0, 300));
  }
  const body = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = body.candidates?.[0]?.content?.parts?.map(p => p.text ?? '').join('') ?? '';
  return JSON.parse(text || '{}');
}

class ModelError extends Error {
  constructor(public status: number, public detail: string) { super(`model ${status}`); }
}

/* ------------------------------- the door --------------------------------- */

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

/** Signed in to this app's Supabase? Asked of Supabase itself, with the
 *  token the phone already holds. */
async function signedIn(auth: string | null): Promise<boolean> {
  const url = process.env.VITE_SUPABASE_URL, anon = process.env.VITE_SUPABASE_ANON_KEY;
  const token = auth?.replace(/^Bearer\s+/i, '');
  if (!url || !anon || !token) return false;
  const r = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, { headers: { apikey: anon, authorization: `Bearer ${token}` } });
  return r.ok;
}

/** GET — is voice switched on? Says whether the key is there and, with
 *  ?check, whether the model answers. Never says the key. */
export async function GET(request: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ ok: false, key: false, model: MODEL() }, 503);
  const params = new URL(request.url).searchParams;
  if (!params.has('check')) return json({ ok: true, key: true, model: MODEL() });
  try {
    const { res, model } = await generate(key, () => ({
      contents: [{ role: 'user', parts: [{ text: 'Reply with the single word OK.' }] }],
      generationConfig: { maxOutputTokens: 20 },
    }));
    /* Google's own words when it refuses — the reason, never the key. */
    const why = res.ok ? undefined : ((await res.json().catch(() => ({}))) as { error?: { message?: string } }).error?.message;
    const models = params.has('models') ? (await listModels(key)).map(n => n.replace(/^models\//, '')) : undefined;
    return json({ ok: res.ok, key: true, model, status: res.status, ...(why ? { why } : {}), ...(models ? { models } : {}) }, res.ok ? 200 : 502);
  } catch {
    return json({ ok: false, key: true, model: MODEL(), status: 0 }, 502);
  }
}

export async function POST(request: Request): Promise<Response> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return json({ error: 'Voice is not switched on — the Gemini key is missing on the server.' }, 503);
  if (!(await signedIn(request.headers.get('authorization')))) {
    return json({ error: 'Sign in to use voice.' }, 401);
  }
  let body: VoiceRequest;
  try { body = await request.json() as VoiceRequest; } catch { return json({ error: 'That recording did not arrive whole.' }, 400); }
  if (!body || !(body.form in FORMS) || typeof body.audio !== 'string' || !body.audio) {
    return json({ error: 'That recording did not arrive whole.' }, 400);
  }
  /* About three minutes of 16 kHz mono WAV, base64. */
  if (body.audio.length > 8_000_000) return json({ error: 'That recording is too long — keep it under two minutes.' }, 413);
  try {
    return json(tidy(body.form, await understand(body, key)));
  } catch (e) {
    if (e instanceof ModelError) {
      console.error('voice: model', e.status, e.detail);
      return json({ error: e.status === 429
        ? 'Voice has hit its limit for the minute — try again shortly.'
        : 'The voice reader did not answer. Try again.' }, 502);
    }
    console.error('voice:', e);
    return json({ error: 'That could not be read. Try again.' }, 502);
  }
}
