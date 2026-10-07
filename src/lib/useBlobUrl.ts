import { useEffect, useState } from 'react';
import { getBlob, onBlobStored } from '../db';
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
  /* Bumped when this key's bytes are written — a file that came down from the
     cloud after the screen opened is shown then, not on the next visit. */
  const [arrived, setArrived] = useState(0);
  useEffect(() => (key ? onBlobStored(k => { if (k === key) setArrived(n => n + 1); }) : undefined), [key]);

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
  }, [key, arrived]);

  /* NOT ON THIS DEVICE YET — ASK FOR IT NOW. Rowland, 7 October: "as close
     to immediate sync as possible." A picture or film on the screen that is
     missing fetches itself at once, and again every few seconds while it is
     on the screen — the phone that took it may still be sending it. When it
     lands, onBlobStored above shows it. */
  useEffect(() => {
    if (!key || state !== 'missing') return;
    let alive = true, tries = 0;
    let t: ReturnType<typeof setTimeout> | undefined;
    const ask = () => {
      void import('../cloud/sync').then(m => m.fetchBlobNow(key)).then(r => {
        /* Asked again only while the cloud says "not there yet". A failure —
           no signal, nobody signed in — is left to the next pass. */
        if (!alive || r !== 'absent') return;
        tries++;
        t = setTimeout(ask, Math.min(2000 * tries, 10000));
      }).catch(() => undefined);
    };
    ask();
    return () => { alive = false; if (t) clearTimeout(t); };
  }, [key, state]);

  return { url, state };
}
