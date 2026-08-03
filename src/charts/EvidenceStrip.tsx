import { useState } from 'react';
import type { MediaRef } from '../types';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';
import { plural } from '../lib/format';

/** The proof behind the number — every photo/video on the rows in view. This is
 *  "here's the data, now watch the problem." */
export function EvidenceStrip({ media }: { media: MediaRef[] }) {
  const [viewing, setViewing] = useState<MediaRef | null>(null);
  if (media.length === 0) return null;
  return (
    <div className="ev-strip">
      <div className="ev-strip-head">{plural(media.length, 'piece')} of evidence</div>
      <div className="ev-strip-row">
        {media.map(m => <EvidenceThumb key={m.id} media={m} size={64} onClick={() => setViewing(m)} />)}
      </div>
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
