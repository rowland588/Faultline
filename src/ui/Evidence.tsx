import type { MediaRef } from '../types';
import { useBlobUrl, useBlobSource } from '../lib/useBlobUrl';
import { VideoPlayer } from './VideoPlayer';
import { Icon } from './Icon';
import { useState } from 'react';
import { ShareSheet } from './ShareLink';

export function EvidenceThumb({ media, onClick, size = 54, still }: {
  media: MediaRef; onClick?: () => void; size?: number;
  /** Only a picture — for inside something that is itself the button (a fix's
   *  box on the Fixes page), where a button in a button is not allowed. */
  still?: boolean;
}) {
  const url = useBlobUrl(media.thumbKey ?? (media.kind === 'photo' ? media.blobKey : undefined));
  const inner = <>
    {url ? <img src={url} alt="" /> : <span className="ev-ph" aria-hidden><Icon name={media.kind === 'video' ? 'play' : 'camera'} size="1em" /></span>}
    {media.kind === 'video' && <span className="ev-play" aria-hidden><Icon name="play" size="1em" /></span>}
  </>;
  if (still) return <span className="ev-thumb" style={{ width: size, height: size }} aria-hidden>{inner}</span>;
  return (
    <button type="button" className="ev-thumb" style={{ width: size, height: size }} onClick={onClick}
      aria-label={media.kind === 'video' ? 'Play the clip' : 'Open the photo'}>
      {inner}
    </button>
  );
}

/** Full-screen lightbox for one piece of evidence. */
/** `onRemove`, where the screen allows it: a photo attached to the wrong
 *  test, or a blurred one, could be looked at and never taken off again.
 *  `share`, where the person may send it outside (the owner, signed in, and
 *  only a test's own pictures — ui/ShareLink): the picture being looked at is
 *  the one the link opens, so the way to send it is here and nowhere else. */
export function EvidenceViewer({ media, onClose, onRemove, share }: {
  media: MediaRef; onClose: () => void; onRemove?: () => void;
  share?: { projectId: string; testId: string; onMade?: () => void };
}) {
  const { url, state } = useBlobSource(media.blobKey);
  const [sharing, setSharing] = useState(false);
  return (
    <div className="ev-viewer" onClick={onClose}>
      <button className="ev-close" onClick={onClose} aria-label="Close"><Icon name="close" size="1.1em" /></button>
      {onRemove && (
        <button className="ev-remove" onClick={e => { e.stopPropagation(); onRemove(); }}>Remove</button>
      )}
      {share && (
        <button className="ev-share" onClick={e => { e.stopPropagation(); setSharing(true); }}>Share a link</button>
      )}
      <div className="ev-stage" onClick={e => e.stopPropagation()}>
        {media.kind === 'photo'
          ? (url ? <img src={url} alt="Evidence" />
            : <div className="video-msg">{state === 'loading' ? <span className="sub">Loading…</span> : <><span className="video-msg-ic" aria-hidden><Icon name="cloud" size="1em" /></span><b>Not on this device yet</b><span className="sub">It'll download on the next sync.</span></>}</div>)
          : <VideoPlayer blobKey={media.blobKey} autoPlay />}
        {/* Inside the stage on purpose: the sheet is portalled to <body>, but
            React still bubbles its taps up through here, and the stage stops
            them — so a tap on the sheet's scrim closes the sheet, not the
            picture as well. */}
        {share && <ShareSheet open={sharing} onClose={() => setSharing(false)} media={media}
          projectId={share.projectId} testId={share.testId} onMade={share.onMade} />}
      </div>
    </div>
  );
}
