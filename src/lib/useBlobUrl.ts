import { useEffect, useState } from 'react';
import { getBlob } from '../db';
import { withUsableMime } from './mime';

export type BlobState = 'loading' | 'ready' | 'missing';

/** Resolve a `media`-store blob key to an object URL, revoking on change/unmount.
 *
 *  The type is repaired on the way out (see lib/mime): blobs that arrived from
 *  storage untyped would otherwise refuse to play. Doing it here — at the point
 *  of use rather than only on download — also heals clips already sitting on a
 *  device from before the fix, with no migration. */
export function useBlobUrl(key?: string | null): string | null {
  return useBlobSource(key).url;
}

/** As above, but also says WHY there's no URL — so a player can distinguish
 *  "still fetching" from "this clip hasn't reached this device yet" instead of
 *  showing an empty black box either way. */
export function useBlobSource(key?: string | null): { url: string | null; state: BlobState } {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<BlobState>('loading');

  useEffect(() => {
    let alive = true;
    let obj: string | null = null;
    if (!key) { setUrl(null); setState('missing'); return; }
    setUrl(null); setState('loading');
    void (async () => {
      const blob = await getBlob(key);
      if (!alive) return;
      if (!blob) { setState('missing'); return; }
      const typed = await withUsableMime(blob);
      if (!alive) return;
      obj = URL.createObjectURL(typed);
      setUrl(obj); setState('ready');
    })();
    return () => { alive = false; if (obj) URL.revokeObjectURL(obj); };
  }, [key]);

  return { url, state };
}
