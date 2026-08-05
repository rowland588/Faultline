import { useEffect, useState } from 'react';
import { getBlob } from '../db';

/** Resolve a `media`-store blob key to an object URL, revoking on change/unmount.
 *  Same pattern as ui/Evidence, shared for the snag stills/videos/photos. */
export function useBlobUrl(key?: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let obj: string | null = null;
    if (!key) { setUrl(null); return; }
    void getBlob(key).then(b => { if (alive && b) { obj = URL.createObjectURL(b); setUrl(obj); } });
    return () => { alive = false; if (obj) URL.revokeObjectURL(obj); };
  }, [key]);
  return url;
}
