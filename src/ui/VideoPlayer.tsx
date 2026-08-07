/* A <video> that says what went wrong instead of sitting there black.
 *
 * Three states people actually hit: the clip hasn't synced to this device yet,
 * the file is here but the browser can't decode it (an unsupported codec — a
 * Chrome-recorded WebM opened in Safari, say), or it plays. Before this, all
 * three looked identical: an empty player that did nothing when tapped. */
import { useEffect, useRef, useState, type VideoHTMLAttributes } from 'react';
import { useBlobSource } from '../lib/useBlobUrl';

export function VideoPlayer({ blobKey, className, poster, ...rest }: {
  blobKey?: string | null;
  className?: string;
  poster?: string;
} & VideoHTMLAttributes<HTMLVideoElement>) {
  const { url, state } = useBlobSource(blobKey);
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => { setFailed(false); }, [url]);

  if (state === 'missing') {
    return (
      <div className={'video-msg ' + (className ?? '')}>
        <span className="video-msg-ic" aria-hidden>☁</span>
        <b>Not on this device yet</b>
        <span className="sub">It'll download on the next sync — keep this device online for a moment.</span>
      </div>
    );
  }
  if (state === 'loading') return <div className={'video-msg ' + (className ?? '')}><span className="sub">Loading…</span></div>;

  if (failed) {
    return (
      <div className={'video-msg ' + (className ?? '')}>
        <span className="video-msg-ic" aria-hidden>⚠</span>
        <b>This browser can't play this clip</b>
        <span className="sub">The file is here, but its format isn't supported by this browser. Try Chrome, or download it to play locally.</span>
        {url && <a className="btn" style={{ marginTop: 10 }} href={url} download="faultline-clip">Download the clip</a>}
      </div>
    );
  }

  return (
    <video
      ref={ref}
      className={className}
      src={url ?? undefined}
      poster={poster}
      playsInline
      controls
      preload="metadata"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
