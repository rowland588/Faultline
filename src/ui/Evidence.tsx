import type { MediaRef } from '../types';
import { useBlobUrl, useBlobSource } from '../lib/useBlobUrl';
import { VideoPlayer } from './VideoPlayer';
import { Icon } from './Icon';

export function EvidenceThumb({ media, onClick, size = 54 }: {
  media: MediaRef; onClick?: () => void; size?: number;
}) {
  const url = useBlobUrl(media.thumbKey ?? (media.kind === 'photo' ? media.blobKey : undefined));
  return (
    <button type="button" className="ev-thumb" style={{ width: size, height: size }} onClick={onClick}
      aria-label={media.kind === 'video' ? 'Play the clip' : 'Open the photo'}>
      {url ? <img src={url} alt="" /> : <span className="ev-ph" aria-hidden><Icon name={media.kind === 'video' ? 'play' : 'camera'} size="1em" /></span>}
      {media.kind === 'video' && <span className="ev-play" aria-hidden><Icon name="play" size="1em" /></span>}
    </button>
  );
}

/** Full-screen lightbox for one piece of evidence. */
/** `onRemove`, where the screen allows it: a photo attached to the wrong
 *  test, or a blurred one, could be looked at and never taken off again. */
export function EvidenceViewer({ media, onClose, onRemove }: {
  media: MediaRef; onClose: () => void; onRemove?: () => void;
}) {
  const { url, state } = useBlobSource(media.blobKey);
  return (
    <div className="ev-viewer" onClick={onClose}>
      <button className="ev-close" onClick={onClose} aria-label="Close"><Icon name="close" size="1.1em" /></button>
      {onRemove && (
        <button className="ev-remove" onClick={e => { e.stopPropagation(); onRemove(); }}>Remove</button>
      )}
      <div className="ev-stage" onClick={e => e.stopPropagation()}>
        {media.kind === 'photo'
          ? (url ? <img src={url} alt="Evidence" />
            : <div className="video-msg">{state === 'loading' ? <span className="sub">Loading…</span> : <><span className="video-msg-ic" aria-hidden><Icon name="cloud" size="1em" /></span><b>Not on this device yet</b><span className="sub">It'll download on the next sync.</span></>}</div>)
          : <VideoPlayer blobKey={media.blobKey} autoPlay />}
      </div>
    </div>
  );
}
