import { useEffect, useRef, useState } from 'react';
import { nav } from '../state/useRoute';
import { getSegment, listSegments, updateSegment, assetsForSegment, snagsForAsset, addSnagAsset, putBlob, getBlob } from '../db';
import { sniffVideoCodec, browserCanPlay } from '../lib/mime';
import { uid, now } from '../lib/ids';
import { Sheet, SheetRow } from '../ui/Sheet';
import { useBlobSource } from './useBlobUrl';
import { captureFrame } from './frame';
import { createSegmentFromVideo } from './addSegment';
import { sectionLabel } from './labels';
import { VideoRecorder, videoCaptureSupported } from '../ui/VideoRecorder';
import { useSyncedAt } from '../cloud/session';
import type { Segment, SnagAsset } from './types';

export function SegmentScreen({ wsId, segmentId }: { wsId: string; segmentId: string }) {
  const [seg, setSeg] = useState<Segment | null>(null);
  const [segs, setSegs] = useState<Segment[]>([]);
  const [assets, setAssets] = useState<SnagAsset[]>([]);
  const [openCounts, setOpenCounts] = useState<Map<string, number>>(new Map());
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [marking, setMarking] = useState<{ still: string; blob: Blob; timestamp: number } | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [addingVideo, setAddingVideo] = useState(false);
  const [renamingSeg, setRenamingSeg] = useState(false);
  const [err, setErr] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const addRef = useRef<HTMLInputElement>(null);
  const { url: videoUrl, state: videoState } = useBlobSource(seg?.videoKey);
  const [noPicture, setNoPicture] = useState<null | 'video-track' | 'none'>(null);
  const [filming, setFilming] = useState(false);
  const [adding, setAdding] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [codec, setCodec] = useState<string | null>(null);

  const loadAssets = async () => {
    const list = await assetsForSegment(segmentId);
    setAssets(list);
    const c = new Map<string, number>();
    for (const a of list) { const sn = await snagsForAsset(a.id); c.set(a.id, sn.filter(s => s.status !== 'closed').length); }
    setOpenCounts(c);
  };
  const syncedAt = useSyncedAt();
  useEffect(() => {
    (async () => {
      const s = await getSegment(segmentId);
      if (!s) { nav(`/w/${wsId}/snags`); return; }
      setSeg(s); await loadAssets();
    })();
    // syncedAt: the segment RECORD too (a rename or re-encode from another
    // device), not just its asset list.
    // eslint-disable-next-line
  }, [segmentId, syncedAt]);
  useEffect(() => { void listSegments(wsId).then(setSegs); void loadAssets(); /* eslint-disable-next-line */ }, [wsId, syncedAt]);

  // Reset the decode verdict when the segment changes; name the codec only if
  // one of them actually failed, so the message can be specific.
  useEffect(() => { setNoPicture(null); setCodec(null); }, [seg?.videoKey]);
  useEffect(() => {
    if (!noPicture || !seg?.videoKey) return;
    let alive = true;
    void getBlob(seg.videoKey).then(async b => {
      if (!b) return;
      const c = await sniffVideoCodec(b);
      if (alive && c && !browserCanPlay(c)) setCodec(c);
    });
    return () => { alive = false; };
  }, [noPicture, seg?.videoKey]);

  const idx = segs.findIndex(s => s.id === segmentId);
  const goSeg = (s?: Segment) => { if (s) nav(`/w/${wsId}/segment/${s.id}`); };

  const addVideo = async (file: Blob) => {
    setErr(''); setAddingVideo(true); setProgress(null);
    try {
      const id = await createSegmentFromVideo(wsId, file, f => setProgress(f));
      nav(`/w/${wsId}/segment/${id}`); // jump into the new video
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not add the video.'); }
    finally { setAddingVideo(false); setProgress(null); if (addRef.current) addRef.current.value = ''; }
  };

  /* Filming stays put: navigating on the first clip would unmount this screen
   * and take the camera down with it, so a multi-clip walk could only ever
   * record one. Just refresh the strip and let them keep shooting. */
  const addFilmed = async (blob: Blob) => {
    setErr('');
    try { await createSegmentFromVideo(wsId, blob); await listSegments(wsId).then(setSegs); }
    catch (e) { setErr(e instanceof Error ? e.message : 'Could not save the clip.'); }
  };

  const renameSeg = async (nm: string) => {
    if (!seg) return;
    await updateSegment({ ...seg, name: nm.trim() || undefined });
    const s = await getSegment(segmentId); setSeg(s ?? null);   // refresh title
    await listSegments(wsId).then(setSegs);                     // refresh strip labels
    setRenamingSeg(false);
  };

  const seek = (to: number) => { const v = videoRef.current; if (v) v.currentTime = Math.max(0, Math.min(dur || v.duration || 0, to)); };
  const step = (d: number) => { const v = videoRef.current; if (v) { v.pause(); seek(v.currentTime + d); } };

  const mark = async () => {
    const v = videoRef.current; if (!v) return;
    v.pause(); setErr(''); setBusy(true);
    try {
      const blob = await captureFrame(v, 0.85);
      setMarking({ still: URL.createObjectURL(blob), blob, timestamp: v.currentTime });
      setName(''); setCode('');
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not mark.'); }
    finally { setBusy(false); }
  };

  /** Persist the marked frame as an asset; returns its id (or null on failure). */
  const create = async (): Promise<string | null> => {
    if (!marking || !seg || !name.trim()) return null;
    setBusy(true);
    try {
      const id = uid();
      const stillKey = `blob-${uid()}`;
      await putBlob(stillKey, marking.blob);
      await addSnagAsset({ id, workspaceId: wsId, segmentId: seg.id, timestampS: marking.timestamp, name: name.trim(), code: code.trim() || undefined, stillKey, createdAt: now() });
      URL.revokeObjectURL(marking.still);
      return id;
    } catch (e) { setErr(e instanceof Error ? e.message : 'Could not save.'); return null; }
    finally { setBusy(false); }
  };

  // The natural next step: go straight to the still to zoom in and pin snags.
  const saveAndAnnotate = async () => {
    const id = await create();
    if (id) { setMarking(null); nav(`/w/${wsId}/asset/${id}`); }
  };
  // The fast path: keep scrubbing to mark more assets in one pass.
  const saveAndMarkAnother = async () => {
    const ts = marking?.timestamp ?? 0;
    const id = await create();
    if (id) { setMarking(null); await loadAssets(); seek(ts); }
  };
  const cancel = () => { if (marking) URL.revokeObjectURL(marking.still); setMarking(null); };

  return (
    <div className="wrap">
      <div className="subhead">
        {/* A named destination, so go straight there. history.back() would only
            rewind ONE entry — and every segment you switched through (strip
            chips, ‹ › arrows) pushed one, so it walked you back a segment at a
            time instead of reaching the list. */}
        <button className="btn btn-ghost" onClick={() => nav(`/w/${wsId}/snags`)}>‹ All segments</button>
        <div style={{ flex: 1 }} />
        {segs.length > 1 && (
          <div className="seg-nav">
            <button className="seg-nav-arrow" disabled={idx <= 0} onClick={() => goSeg(segs[idx - 1])} aria-label="Previous segment">‹</button>
            <span className="seg-nav-pos">{idx + 1} / {segs.length}</span>
            <button className="seg-nav-arrow" disabled={idx < 0 || idx >= segs.length - 1} onClick={() => goSeg(segs[idx + 1])} aria-label="Next segment">›</button>
          </div>
        )}
      </div>

      {/* No `capture`: it would send a phone to the camera and hide the gallery. */}
      <input ref={addRef} type="file" accept="video/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) void addVideo(f); }} />
      <div className="seg-strip">
        {segs.map((s, i) => (
          <button key={s.id} className={'seg-chip' + (s.id === segmentId ? ' on' : '')} onClick={() => goSeg(s)} title={s.name || `Segment ${s.sequence}`}>
            {i + 1}
          </button>
        ))}
        {/* Both routes stay reachable: filming records H.264 (plays anywhere),
            uploading takes footage that already exists on the phone or laptop. */}
        <button className="seg-chip seg-chip-add" disabled={addingVideo}
          onClick={() => (videoCaptureSupported() ? setAdding(true) : addRef.current?.click())} title="Add another video">
          {addingVideo ? '…' : '＋ Video'}
        </button>
      </div>

      <div className="seg-title-row">
        <button className="asset-title" style={{ width: 'auto' }} onClick={() => seg && setRenamingSeg(true)}>
          <span className="mark" style={{ fontSize: 22 }}>{seg ? sectionLabel(seg, assets.map(a => a.name)) : '…'}</span>
        </button>
        {seg && <button className="btn seg-rename-btn" onClick={() => setRenamingSeg(true)}>✎ Name this video</button>}
      </div>
      <p className="sub" style={{ marginTop: 4 }}>Scrub to a machine, pause, and mark it. That exact frame becomes its still.{segs.length > 1 ? ' Switch videos with the numbers above.' : ''}</p>

      {err && <div className="card" style={{ color: 'var(--danger)', marginTop: 12 }}>{err}</div>}

      {addingVideo && progress !== null && (
        <div className="card" style={{ marginTop: 12 }}>
          <b>Adding the video…</b>
          <p className="sub" style={{ marginTop: 6 }}>Converting so it plays on your laptop as well as your phone — this runs at playback speed.</p>
          <div className="prog"><div className="prog-bar" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
          <p className="sub" style={{ marginTop: 6 }}>{Math.round(progress * 100)}%</p>
        </div>
      )}

      <div className="card" style={{ marginTop: 12, padding: 10 }}>
        {videoState === 'ready' && !noPicture ? (
          <video ref={videoRef} className="seg-video" src={videoUrl ?? undefined} playsInline controls preload="metadata"
            onError={() => setNoPicture('none')}
            onLoadedMetadata={e => {
              const v = e.target as HTMLVideoElement;
              // No picture despite metadata = the video track didn't decode
              // (phone HEVC on a laptop). Frames can't be grabbed from it either.
              if (v.videoWidth === 0) { setNoPicture('video-track'); return; }
              // A MediaRecorder clip reports Infinity until it's been seeked;
              // fall back to the length we measured and stored at import so the
              // timeline still has a scale.
              setDur(Number.isFinite(v.duration) && v.duration > 0 ? v.duration : (seg?.durationS ?? 0));
            }}
            onTimeUpdate={e => setT((e.target as HTMLVideoElement).currentTime)} />
        ) : videoState === 'ready' && noPicture ? (
          <div className="video-msg seg-video">
            <span className="video-msg-ic" aria-hidden>⚠</span>
            <b>{noPicture === 'video-track' ? "This browser can't show the picture" : "This browser can't play this clip"}</b>
            <span className="sub">
              {noPicture === 'video-track'
                ? <>The clip and its sound are here, but the picture is {codec ? <b>{codec}</b> : 'in a format'} this device can't decode — the format phones record in — so frames can't be marked here.</>
                : <>Its format isn't supported by this browser.</>}
            </span>
            <span className="sub">
              <b>To fix it for good:</b> open this workspace on the phone that filmed it, go to{' '}
              <b>Snag walk</b>, and tap <b>Convert</b>. It'll play and mark here from then on.
            </span>
            {videoUrl && <a className="btn" style={{ marginTop: 10 }} href={videoUrl} download="faultline-clip.mp4">Download the clip</a>}
          </div>
        ) : (
          <div className="video-msg seg-video">
            <span className="video-msg-ic" aria-hidden>☁</span>
            <b>{videoState === 'loading' ? 'Loading…' : 'Not on this device yet'}</b>
            {videoState === 'missing' && <span className="sub">This video will download on the next sync — keep this device online for a moment.</span>}
          </div>
        )}
        <div className="seg-controls">
          <button className="btn" onClick={() => step(-1)}>◄ 1s</button>
          <button className="btn" onClick={() => step(1)}>1s ►</button>
          <span className="seg-time">{t.toFixed(1)}s{dur ? ` / ${dur.toFixed(0)}s` : ''}</span>
          <button className="btn btn-primary" onClick={mark} disabled={busy || !videoUrl || !!noPicture}>＋ Mark asset</button>
        </div>
        {dur > 0 && (
          <div className="seg-timeline">
            {assets.map(a => <button key={a.id} className="seg-marker" style={{ left: `${(a.timestampS / dur) * 100}%` }} title={`${a.name} — ${a.timestampS.toFixed(1)}s`} onClick={() => seek(a.timestampS)} />)}
          </div>
        )}
      </div>

      <div className="card">
        <div className="field-label" style={{ marginBottom: 8 }}>Assets in this segment</div>
        {assets.length === 0 ? <p className="sub">None yet — scrub to a machine, pause, tap “Mark asset”.</p>
          : assets.map(a => (
            <button key={a.id} className="asset-line" onClick={() => nav(`/w/${wsId}/asset/${a.id}`)}>
              <span className="asset-line-name">{a.name}{a.code ? <span className="asset-code"> · {a.code}</span> : ''}</span>
              <span className="asset-line-meta">{a.timestampS.toFixed(1)}s · {openCounts.get(a.id) ?? 0} open</span>
            </button>
          ))}
      </div>

      <Sheet open={!!marking} onClose={cancel} title="New asset">
        {marking && <img className="mark-still" src={marking.still} alt="marked frame" />}
        <div className="field-label" style={{ marginTop: 8 }}>Asset name</div>
        <input className="text-input" autoFocus value={name} placeholder="e.g. Multihead Weigher" onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveAndAnnotate(); }} />
        <div className="field-label" style={{ marginTop: 10 }}>Asset code <span className="opt">optional</span></div>
        <input className="text-input" value={code} placeholder="e.g. MHW-04" onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void saveAndAnnotate(); }} />
        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={saveAndAnnotate} disabled={busy || !name.trim()}>{busy ? 'Saving…' : 'Save & add snags →'}</button>
          <button className="btn" onClick={saveAndMarkAnother} disabled={busy || !name.trim()}>Save &amp; mark another</button>
          <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
        </div>
      </Sheet>

      {filming && <VideoRecorder onCapture={b => void addFilmed(b)} onClose={() => setFilming(false)} />}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a video">
        <SheetRow label="🎥 Film a new section" hint="records in a format every device plays"
          onClick={() => { setAdding(false); setFilming(true); }} />
        <SheetRow label="⬆ Upload a video" hint="from this phone or computer"
          onClick={() => { setAdding(false); addRef.current?.click(); }} />
      </Sheet>

      <Sheet open={renamingSeg} onClose={() => setRenamingSeg(false)} title="Name this video">
        {seg && <SegNameForm key={seg.id} initial={seg.name ?? ''} placeholder={`Segment ${seg.sequence}`} onSave={renameSeg} onClose={() => setRenamingSeg(false)} />}
      </Sheet>
    </div>
  );
}

/** The little name form for a video/section. Kept simple — one field. */
function SegNameForm({ initial, placeholder, onSave, onClose }: { initial: string; placeholder: string; onSave: (n: string) => Promise<void>; onClose: () => void }) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); try { await onSave(name); } finally { setBusy(false); } };
  return (
    <>
      <p className="sub" style={{ marginBottom: 10 }}>Give this video a name so you can tell your sections apart — e.g. “Infeed”, “Filler → capper”, “Outfeed”.</p>
      <div className="field-label">Video name</div>
      <input className="text-input" autoFocus value={name} placeholder={placeholder} onChange={e => setName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') void save(); }} />
      <div className="row-end" style={{ marginTop: 14 }}>
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button>
      </div>
    </>
  );
}
