/* LINE TALK, ASKED — the conversation sent to the assistant through the
 * app's gateway (supabase/functions/assist, task `talk`), and its answer
 * read back (docs/LINE-TALK.md, slice 2).
 *
 * The key is the gateway's; this sends the person's session. Whatever goes
 * wrong — no signal, no cloud, the allowance spent, the model busy — comes
 * back in words, and nothing the person said, typed or photographed is
 * touched: the caller keeps the question and says it is not answered yet.
 *
 * AS IT IS WRITTEN (21 October — "like I do with you here"): asked with
 * `onPartial`, the gateway sends the reply as it is written (server-sent
 * events) and the caller shows it growing; the finished answer comes last
 * and is read exactly as a whole one is. A gateway that answers whole is
 * read as before. */
import { supabase } from '../../cloud/client';
import { checkTalkAnswer, type TalkAnswer, type TalkAsk } from './talkAssist';

export type Asked =
  | { ok: true; answer: TalkAnswer; unsure: string[]; model?: string }
  | { ok: false; why: string; off?: boolean; offline?: boolean };

export const NO_SIGNAL = 'No signal — it is answered when the signal comes back. What you said is kept.';
const NOT_NOW = 'Line Talk could not answer just now — ask again. What you said is kept.';
const NO_CLOUD = 'Line Talk’s assistant needs the cloud, and this copy of Faultline is not connected to it. Everything you say, type and photograph is kept.';

/** The reply so far, and whether a document is being written ahead of it. */
export interface SoFar { reply: string; document: boolean }

/** A stream of server-sent events read to its end: each `{ partial }` handed
 *  on as it comes, and the last other event returned — the finished answer —
 *  or null when the stream ended without one. */
export async function readTalkStream(body: ReadableStream<Uint8Array> | null, onPartial: (p: SoFar) => void): Promise<unknown> {
  if (!body) return null;
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = '', final: unknown = null;
  const take = (block: string) => {
    const data = block.split('\n').filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
    if (!data) return;
    let o: unknown;
    try { o = JSON.parse(data); } catch { return; }
    const e = o && typeof o === 'object' ? o as Record<string, unknown> : {};
    if (typeof e.partial === 'string') onPartial({ reply: e.partial, document: e.document === true });
    else final = o;
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buf += dec.decode(value, { stream: true });
    let at: number;
    while ((at = buf.indexOf('\n\n')) >= 0) { take(buf.slice(0, at)); buf = buf.slice(at + 2); }
    if (done) break;
  }
  if (buf.trim()) take(buf);
  return final;
}

export async function askTalk(ask: TalkAsk, onPartial?: (p: SoFar) => void): Promise<Asked> {
  if (!supabase) return { ok: false, off: true, why: NO_CLOUD };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, offline: true, why: NO_SIGNAL };
  const photos = ask.turns.flatMap(t => (t.kind === 'photo' && t.photo ? [t.photo] : []));
  try {
    const { data: got, error } = await supabase.functions.invoke('assist', { body: onPartial ? { ...ask, stream: true } : ask });
    if (error) {
      /* the gateway's own words when it refused (a non-2xx answer), else no signal */
      const ctx = (error as { context?: unknown }).context;
      if (error.name === 'FunctionsHttpError' && ctx instanceof Response) {
        const d = await ctx.clone().json().catch(() => null) as { why?: unknown; off?: unknown } | null;
        const why = typeof d?.why === 'string' && d.why ? d.why : ctx.status === 401 ? 'Sign in to use Line Talk’s assistant. What you said is kept.' : NOT_NOW;
        return { ok: false, why, ...(d?.off ? { off: true } : {}) };
      }
      if (error.name === 'FunctionsFetchError') return { ok: false, offline: true, why: NO_SIGNAL };
      return { ok: false, why: NOT_NOW };
    }
    /* the answer as it is written: the reply growing, then the finished answer — or the stream cut off */
    let data: unknown = got;
    if (got instanceof Response) {
      data = await readTalkStream(got.body, p => onPartial?.(p));
      if (data === null) return typeof navigator !== 'undefined' && !navigator.onLine ? { ok: false, offline: true, why: NO_SIGNAL } : { ok: false, why: NOT_NOW };
    }
    const d = (data ?? {}) as { ok?: unknown; off?: unknown; why?: unknown; answer?: unknown; unsure?: unknown; model?: unknown };
    const why = typeof d.why === 'string' && d.why ? d.why : NOT_NOW;
    if (d.off) return { ok: false, off: true, why };
    if (!d.ok) return { ok: false, why };
    /* read again here — a picture it names must be one of this talk's */
    const answer = checkTalkAnswer(d.answer, photos);
    if (!answer) return { ok: false, why: 'Line Talk’s answer could not be read, so none is kept — ask again.' };
    const unsure = Array.isArray(d.unsure) ? d.unsure.filter((x): x is string => typeof x === 'string').slice(0, 12) : [];
    return { ok: true, answer, unsure, ...(typeof d.model === 'string' ? { model: d.model } : {}) };
  } catch {
    return typeof navigator !== 'undefined' && !navigator.onLine ? { ok: false, offline: true, why: NO_SIGNAL } : { ok: false, why: NOT_NOW };
  }
}
