/* NOTHING TYPED IS LOST (docs/STAGEGATE.md, the backbone rule 4).
 *
 * A record's Edit, the problem form and Plan a fix held what was typed in the
 * form itself, so × , Escape, the back button or another page threw it away
 * without a word. Now each box of such a form is kept here, under the form's
 * own key, as it is typed: Cancel throws it away and Save keeps it, and
 * anything else leaves it here, so the form opens with it next time.
 *
 * The store lives for the visit (sessionStorage, so a reload keeps it too),
 * on this device only. Nothing is written to the job until Save.
 */
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react';

const STORE = 'fl-kept-v1';
let kept: Map<string, unknown> | null = null;

function all(): Map<string, unknown> {
  if (kept) return kept;
  kept = new Map();
  try {
    const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORE) : null;
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, unknown>)) kept.set(k, v);
  } catch { /* a private window: kept for the page's life only */ }
  return kept;
}

function write(): void {
  try { sessionStorage.setItem(STORE, JSON.stringify(Object.fromEntries(all()))); } catch { /* as above */ }
}

/** Keep one box's value under its form's key (what useKept does as it is
 *  typed into). */
export function keepBox(key: string, val: unknown): void {
  all().set(key, val);
  write();
}

/** Like useState, but kept under `key` until `forget`. A null key keeps
 *  nothing (a form that is not one of these). */
export function useKept<T>(key: string | null, init: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const [v, setV] = useState<T>(() => {
    const m = all();
    if (key && m.has(key)) return m.get(key) as T;
    return typeof init === 'function' ? (init as () => T)() : init;
  });
  const set = useCallback<Dispatch<SetStateAction<T>>>(next => {
    /* A plain value is kept at once, so a `forget` straight after a form's
       own reset (Save, Cancel) is the last word; a function of the last
       value is kept when React works it out. */
    if (typeof next !== 'function') {
      if (key) keepBox(key, next);
      setV(next);
      return;
    }
    setV(prev => {
      const val = (next as (p: T) => T)(prev);
      if (key) keepBox(key, val);
      return val;
    });
  }, [key]);
  return [v, set];
}

/** Is anything kept for this form? (`prefix` is the form's key, ending ':'.) */
export function hasKept(prefix: string): boolean {
  for (const k of all().keys()) if (k.startsWith(prefix)) return true;
  return false;
}

/** Throw away what was kept for this form — on Save and on Cancel. */
export function forget(prefix: string): void {
  const m = all();
  let any = false;
  for (const k of [...m.keys()]) if (k.startsWith(prefix)) { m.delete(k); any = true; }
  if (any) write();
}
