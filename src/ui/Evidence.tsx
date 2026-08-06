import { useEffect, useState } from 'react';
import type { MediaRef } from '../types';
import { getBlob } from '../db';

/** Load a stored blob as an object URL, revoking it on unmount/change. */
function useBlobUrl(key?: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let obj: string | null = null;
    if (!key) { setUrl(null); return; }
    void getBlob(key).then(b => {
      if (alive && b) { obj = URL.createObjectURL(b); setUrl(obj); }
    });
    return () => { alive = false; if (obj) URL.revokeObjectURL(obj); };
  }, [key]);
  return url;
}

export function EvidenceThumb({ media, onClick, size = 54 }: {
  media: MediaRef; onClick?: () => void; size?: number;
}) {
  const url = useBlobUrl(media.thumbKey ?? (media.kind === 'photo' ? media.blobKey : undefined));
  return (
    <button type="button" className="ev-thumb" style={{ width: size, height: size }} onClick={onClick} aria-label="Evidence">
      {url ? <img src={url} alt="" /> : <span className="ev-ph" aria-hidden>{media.kind === 'video' ? '▶' : '📷'}</span>}
      {media.kind === 'video' && <span className="ev-play" aria-hidden>▶</span>}
    </button>
  );
}

/** Full-screen lightbox for one piece of evidence. */
export function EvidenceViewer({ media, onClose }: { media: MediaRef; onClose: () => void }) {
  const url = useBlobUrl(media.blobKey);
  return (
    <div className="ev-viewer" onClick={onClose}>
      <button className="ev-close" onClick={onClose} aria-label="Close">✕</button>
      <div className="ev-stage" onClick={e => e.stopPropagation()}>
        {url && (media.kind === 'photo'
          ? <img src={url} alt="Evidence" />
          : <video src={url} controls autoPlay playsInline />)}
      </div>
    </div>
  );
}
