/* A CLIP'S FIRST FRAME, AS A PICTURE (docs/ATTACHMENTS.md — Rowland, 6 November: "if video is there you can't see any image or even the classic play me
 * arrow, all we have is a very slight line box — make videos visual on the app"). A photo has always had a small picture made when it was saved; a clip
 * had none, so every list drew an empty tile. A poster is made when a clip is saved (lib/media saveEvidence), and for a clip saved before that, once, on
 * this device when its tile is first drawn — a picture only: the clip itself is never touched. */
import { useEffect, useState } from 'react';
import { getBlob } from '../db';
import { withUsableMime } from './mime';

/** The first moment of the clip that shows something, as a JPEG with its longest side `edge` — or nothing when the browser cannot decode it in time. */
export async function posterOf(blob: Blob, edge = 320, waitMs = 6000): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const typed = await withUsableMime(blob, 'video/mp4').catch(() => blob);
  const url = URL.createObjectURL(typed);
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
  try {
    return await new Promise<Blob | null>(resolve => {
      const done = (b: Blob | null) => { clearTimeout(timer); resolve(b); };
      const timer = setTimeout(() => done(null), waitMs);
      const draw = () => {
        try {
          const w = v.videoWidth, h = v.videoHeight;
          if (!w || !h) return done(null);
          const s = Math.min(1, edge / Math.max(w, h));
          const cv = document.createElement('canvas');
          cv.width = Math.max(1, Math.round(w * s)); cv.height = Math.max(1, Math.round(h * s));
          const g = cv.getContext('2d');
          if (!g) return done(null);
          g.drawImage(v, 0, 0, cv.width, cv.height);
          cv.toBlob(b => done(b), 'image/jpeg', 0.72);
        } catch { done(null); }
      };
      v.onerror = () => done(null);
      /* a little way in: the very first frame of a phone clip is often black */
      v.onloadeddata = () => {
        const at = Number.isFinite(v.duration) && v.duration > 0 ? Math.min(0.4, v.duration / 4) : 0;
        if (at <= 0) { draw(); return; }
        v.onseeked = draw;
        try { v.currentTime = at; } catch { draw(); }
      };
    });
  } finally {
    v.removeAttribute('src'); v.load();
    URL.revokeObjectURL(url);
  }
}

/* one poster per clip per sitting — a clip with none saved is read once, here */
const made = new Map<string, string | null>();
const asked = new Map<string, Promise<string | null>>();

function posterUrl(blobKey: string): Promise<string | null> {
  const have = made.get(blobKey);
  if (have !== undefined) return Promise.resolve(have);
  const was = asked.get(blobKey);
  if (was) return was;
  const p = (async () => {
    const blob = await getBlob(blobKey);
    if (!blob) return null;
    const pic = await posterOf(blob);
    const url = pic ? URL.createObjectURL(pic) : null;
    made.set(blobKey, url);
    return url;
  })().finally(() => asked.delete(blobKey));
  asked.set(blobKey, p);
  return p;
}

/** The picture to draw for a clip that has no saved poster: its first frame, once it has been read — until then, and when it cannot be, nothing. */
export function useVideoPoster(blobKey: string | undefined, enabled: boolean): string | null {
  const [url, setUrl] = useState<string | null>(blobKey ? made.get(blobKey) ?? null : null);
  useEffect(() => {
    let on = true;
    if (!enabled || !blobKey) { setUrl(null); return; }
    void posterUrl(blobKey).then(u => { if (on) setUrl(u); });
    return () => { on = false; };
  }, [blobKey, enabled]);
  return url;
}
