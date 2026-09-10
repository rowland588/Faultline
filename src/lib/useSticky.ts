/* A piece of view state that survives leaving the screen.
 *
 * Filters and a sort order are a decision — "show me what is overdue on the
 * bagger, worst first" — and re-making that decision every single time the
 * screen opens is the difference between a tool and a form. It is per person
 * and per device, not data: which is exactly what localStorage is for.
 *
 * Keyed per workspace, because "overdue on Line 7" is not a sensible thing to
 * carry over to Line 10.
 *
 * Every read and write is wrapped: a private window, cleared site data, or a
 * browser set to block storage all throw here, and none of them is a reason for
 * the snag list to fail to open. The fallback is simply the default.
 */
import { useCallback, useEffect, useState } from 'react';

const KEY = (scope: string, name: string) => `faultline:${scope}:${name}`;

function read<T>(scope: string, name: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(KEY(scope, name));
    if (raw == null) return fallback;
    const v = JSON.parse(raw) as T;
    return v ?? fallback;
  } catch { return fallback; }
}

/** Like useState, but remembered. `scope` separates one workspace from another. */
export function useSticky<T>(scope: string, name: string, fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => read(scope, name, fallback));

  // Changing workspace changes the scope, so re-read rather than carrying the
  // previous line's filters across.
  useEffect(() => { setValue(read(scope, name, fallback)); /* eslint-disable-next-line */ }, [scope, name]);

  const set = useCallback((v: T) => {
    setValue(v);
    try { localStorage.setItem(KEY(scope, name), JSON.stringify(v)); } catch { /* nothing worth failing over */ }
  }, [scope, name]);

  return [value, set];
}
