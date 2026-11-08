/* THE BRIEF ASKED OF THE ASSISTANT — the two things rules cannot do (8 November, docs/STORY.md §7, S6–S7), through the app's gateway
 * (supabase/functions/assist; the tasks `brief-read` and `brief-asks`, their rules the gateway's own — tools/story/briefAssist):
 *
 *   readBriefPages — a photo, or a scanned PDF's pages (four small JPEGs at most), read into words;
 *   splitBrief     — a prose brief split into the client's asks (three to eight), each quoting the sentence it came from.
 *
 * Both are offers: what comes back is shown to the consultant, and kept only when he says so. Whatever goes wrong — no cloud, no
 * signal, the allowance spent — comes back in words, and the brief is typed instead; nothing waits on it. */
import { supabase } from '../../cloud/client';

export const BRIEF_ASK_LIMITS = { pages: 4, brief: 12_000, asks: 8 } as const;

export type BriefAsked<T> = { ok: true; value: T } | { ok: false; why: string; off?: boolean; offline?: boolean };

const NO_CLOUD = 'The assistant needs the cloud — this device is not signed in to it. Type the brief instead.';
const NO_SIGNAL = 'No signal — type the brief, or ask again when the signal is back.';
const NOT_NOW = 'The assistant could not answer just now — type the brief, or ask again.';

async function call(body: Record<string, unknown>): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; why: string; off?: boolean; offline?: boolean }> {
  if (!supabase) return { ok: false, off: true, why: NO_CLOUD };
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { ok: false, offline: true, why: NO_SIGNAL };
  try {
    const { data, error } = await supabase.functions.invoke('assist', { body });
    if (error) {
      const ctx = (error as { context?: unknown }).context;
      if (error.name === 'FunctionsHttpError' && ctx instanceof Response) {
        const d = await ctx.clone().json().catch(() => null) as { why?: unknown; off?: unknown } | null;
        return { ok: false, why: typeof d?.why === 'string' && d.why ? d.why : NOT_NOW, ...(d?.off ? { off: true } : {}) };
      }
      if (error.name === 'FunctionsFetchError') return { ok: false, offline: true, why: NO_SIGNAL };
      return { ok: false, why: NOT_NOW };
    }
    const d = (data ?? {}) as Record<string, unknown>;
    if (d.off) return { ok: false, off: true, why: typeof d.why === 'string' ? d.why : NOT_NOW };
    if (d.ok !== true) return { ok: false, why: typeof d.why === 'string' && d.why ? d.why : NOT_NOW };
    return { ok: true, data: d };
  } catch {
    return { ok: false, why: NOT_NOW };
  }
}

/** A photo or a scanned brief's pages, read into words by the assistant. */
export async function readBriefPages(pages: readonly string[]): Promise<BriefAsked<string>> {
  const r = await call({ task: 'brief-read', pages: pages.slice(0, BRIEF_ASK_LIMITS.pages) });
  if (!r.ok) return r;
  const text = typeof r.data.text === 'string' ? r.data.text.trim() : '';
  return text ? { ok: true, value: text } : { ok: false, why: 'The assistant found no words on the pages — type the brief instead.' };
}

/** A prose brief split into asks, each with the sentence of the brief it came from. A quote not found in the brief is dropped, never
 *  shown as the client's words. */
export async function splitBrief(brief: string): Promise<BriefAsked<{ text: string; from: string }[]>> {
  const r = await call({ task: 'brief-asks', brief: brief.slice(0, BRIEF_ASK_LIMITS.brief) });
  if (!r.ok) return r;
  const raw = Array.isArray(r.data.asks) ? r.data.asks : [];
  const squash = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();
  const whole = squash(brief);
  const asks = raw
    .map(a => (a && typeof a === 'object' ? a as { text?: unknown; from?: unknown } : {}))
    .filter(a => typeof a.text === 'string' && a.text.trim())
    .map(a => ({ text: (a.text as string).trim(), from: typeof a.from === 'string' && whole.includes(squash(a.from)) ? a.from.trim() : '' }))
    .slice(0, BRIEF_ASK_LIMITS.asks);
  return asks.length ? { ok: true, value: asks } : { ok: false, why: 'The assistant found no asks in the brief — add them one by one.' };
}
