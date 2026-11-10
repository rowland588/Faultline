/* PHOTOS FROM WALKS (10 November, docs/FACTORY-WALK.md — Rowland: "Where it has a confirmed relationship to a line, machine or
 * department, it should also be visible from those relevant pages. Use relationships to the original photograph rather than creating
 * duplicate copies"). Read from the AI Mode conversations where the photographs were taken (lib/walk walkPhotosFor) — only those the
 * person filed here on a confirmed card, never one merely taken nearby. Each opens full size and says where and when it was taken and
 * that what it shows is as the person saw it; the conversation it came from is one tap away. Nothing is drawn when there is none. */
import { useEffect, useState } from 'react';
import { listAllStudies, onDataChange } from '../db';
import { isConversation } from '../colleague/conversation';
import { walkPhotosFor, type PhotoQuery, type WalkPhoto } from '../lib/walk';
import { EvidenceThumb, EvidenceViewer } from './Evidence';
import { nav } from '../state/useRoute';
import type { MediaRef } from '../types';

const when = (t: number) => new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const asMedia = (p: WalkPhoto): MediaRef => ({ id: p.turnId, kind: 'photo', blobKey: p.blobKey, mime: p.mime, capturedAt: p.at, marks: [] } as unknown as MediaRef);

export function WalkPhotos({ query, title = 'Photos from walks' }: { query: PhotoQuery; title?: string }) {
  const [photos, setPhotos] = useState<WalkPhoto[] | null>(null);
  const [open, setOpen] = useState<WalkPhoto | null>(null);
  const key = JSON.stringify(query);
  useEffect(() => {
    let live = true;
    const load = () => void listAllStudies().then(all => { if (live) setPhotos(walkPhotosFor(all.filter(isConversation), JSON.parse(key) as PhotoQuery)); });
    load();
    const off = onDataChange(load);
    return () => { live = false; off(); };
  }, [key]);
  if (!photos?.length) return null;
  return (
    <section className="walk-photos ep-panel" aria-label={title} data-walk-photos>
      <h2>{title} <span className="walk-photos-n">{photos.length}</span></h2>
      <p className="sub">Filed here from a walk with Luna — the photograph itself, kept on its walk too. What each shows is as the person saw it, not verified.</p>
      <ul className="walk-photos-l">
        {photos.map(p => (
          <li key={`${p.conversationId}:${p.turnId}`} className="walk-photo" data-walk-photo={p.blobKey}>
            <EvidenceThumb media={asMedia(p)} size={88} onClick={() => setOpen(p)} />
            <span className="walk-photo-t">
              <b>{when(p.at)}</b>
              {p.where ? <span>Taken at {p.where}</span> : <span>No place said</span>}
              {p.caption ? <span className="walk-photo-c">“{p.caption}”</span> : null}
              <span className="walk-photo-by">Filed by {p.links[0].by ?? 'the person'}{p.links[0].why ? ` — ${p.links[0].why}` : ''}</span>
              <button type="button" className="cw-link" onClick={() => nav(`/ai?c=${encodeURIComponent(p.conversationId)}`)}>The walk ›</button>
            </span>
          </li>
        ))}
      </ul>
      {open && <EvidenceViewer media={asMedia(open)} onClose={() => setOpen(null)} />}
    </section>
  );
}
