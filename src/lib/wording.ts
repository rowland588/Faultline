/* BETTER WORDING, ON THE PHONE — ask the server (api/wording.ts) to say what
 * was typed more clearly. Nothing is written here: the caller shows the
 * suggestion beside what was typed, and the person uses it or keeps theirs. */
import type { WordingField, WordingResult } from '../../api/wording';
import { supabase } from '../cloud/client';
export type { WordingField };

export class WordingError extends Error {}

export async function betterWording(text: string, field: WordingField, names: string[] = []): Promise<WordingResult> {
  if (!navigator.onLine) throw new WordingError('No signal — better wording needs one.');
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : undefined;
  if (!token) throw new WordingError('Sign in to use better wording.');
  let res: Response;
  try {
    res = await fetch('/api/wording', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ field, text, names }),
    });
  } catch {
    throw new WordingError('No signal — better wording needs one.');
  }
  const body = await res.json().catch(() => ({})) as Partial<WordingResult> & { error?: string };
  if (!res.ok || !body.text) throw new WordingError(body.error || 'That could not be reworded. Try again.');
  return { text: body.text, by: body.by ?? 'gemini' };
}
