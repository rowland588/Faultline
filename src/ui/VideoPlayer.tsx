/* A <video> that says what went wrong instead of sitting there black.
 *
 * Four states people actually hit: the clip hasn't synced to this device yet;
 * the file is here but nothing decodes; the file is here and the AUDIO decodes
 * while the picture doesn't (sound over a blank frame — a phone's HEVC/H.265
 * recording opened on a laptop that can't decode it); or it plays.
 *
 * The audio-only case is the nasty one, because the <video> reports no error at
 * all — it "works", it just never paints. The tell is videoWidth staying 0 once
 * metadata has loaded, which is what we check for. */
import { useCallback, useEffect, useState, type VideoHTMLAttributes } from 'react';
import { useBlobSource } from '../lib/useBlobUrl';
import { getBlob } from '../db';
import { sniffVideoCodec, browserCanPlay } from '../lib/mime';

type Fail = null | 'undecodable' | 'video-track';

export function VideoPlayer({ blobKey, className, poster, onLoadedMetadata, ...rest }: {
  blobKey?: string | null;
  className?: string;
  poster?: string;
} & VideoHTMLAttributes<HTMLVideoElement>) {
  const { url, state } = useBlobSource(blobKey);
  const [fail, setFail] = useState<Fail>(null);
  const [codec, setCodec] = useState<string | null>(null);

  useEffect(() => { setFail(null); }, [url]);

  // Only worth naming the codec once we know something failed.
  useEffect(() => {
    if (!fail || !blobKey) return;
    let alive = true;
    void getBlob(blobKey).then(async b => {
      if (!b) return;
      const c = await sniffVideoCodec(b);
      if (alive) setCodec(c);
    });
    return () => { alive = false; };
  }, [fail, blobKey]);

  const onMeta = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    // Metadata is in but there's no picture: the audio track decoded and the
    // video track didn't. Nothing will ever paint, so say so now.
    if (v.videoWidth === 0) setFail('video-track');
    else onLoadedMetadata?.(e);
  }, [onLoadedMetadata]);

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

  if (fail) {
    // Name the codec only when this browser genuinely can't handle it, so we
    // never point the finger at a format that isn't actually the problem.
    const named = codec && !browserCanPlay(codec) ? codec : null;
    return (
      <div className={'video-msg ' + (className ?? '')}>
        <span className="video-msg-ic" aria-hidden>⚠</span>
        <b>{fail === 'video-track' ? "This browser can't show the picture" : "This browser can't play this clip"}</b>
        <span className="sub">
          {fail === 'video-track'
            ? <>The clip is here and its sound works, but the picture is {named ? <b>{named}</b> : 'in a format'} this device can't decode — the format phones record in.</>
            : <>The file is here, but its format isn't supported by this browser.</>}
        </span>
        <span className="sub">
          <b>To fix it for good:</b> open this workspace on the phone that filmed it, go to <b>Snag walk</b>,
          and tap <b>Convert</b>. It'll play here — and everywhere — from then on.
        </span>
        {url && <a className="btn" style={{ marginTop: 10 }} href={url} download="faultline-clip.mp4">Download the clip</a>}
      </div>
    );
  }

  return (
    <video
      className={className}
      src={url ?? undefined}
      poster={poster}
      playsInline
      controls
      preload="metadata"
      onError={() => setFail('undecodable')}
      onLoadedMetadata={onMeta}
      {...rest}
    />
  );
}
