import { useEffect, useRef, useState } from 'react';
import { nav, goBack } from '../state/useRoute';
import { getSegment, assetsForSegment, snagsForAsset, addSnagAsset, putBlob } from '../db';
import { uid, now } from '../lib/ids';
import { Sheet } from '../ui/Sheet';
import { useBlobUrl } from './useBlobUrl';
import { captureFrame } from './frame';
import type { Segment, SnagAsset } from './types';

export function SegmentScreen({ wsId, segmentId }: { wsId: string; segmentId: string }) {
  const [seg, setSeg] = useState<Segment | null>(null);
  const [assets, setAssets] = useState<SnagAsset[]>([]);
  const [openCounts, setOpenCounts] = useState<Map<string, number>>(new Map());
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [marking, setMarking] = useState<{ still: string; blob: Blob; timestamp: number } | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrl = useBlobUrl(seg?.videoKey);

  const loadAssets = async () => {
    const list = await assetsForSegment(segmentId);
    setAssets(list);
    const c = new Map<string, number>();
    for (const a of list) { const sn = await snagsForAsset(a.id); c.set(a.id, sn.filter(s => s.status !== 'closed').length); }
    setOpenCounts(c);
  };
  useEffect(() => {
    (async () => {
      const s = await getSegment(segmentId);
      if (!s) { nav(`/w/${wsId}/snags`); return; }
      setSeg(s); await loadAssets();
    })();
    // eslint-disable-next-line
  }, [segmentId]);

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
        <button className="btn btn-ghost" onClick={() => goBack(`/w/${wsId}/snags`)}>‹ Segments</button>
      </div>
      <div className="mark" style={{ fontSize: 22 }}>{seg?.name || `Segment ${seg?.sequence ?? ''}`}</div>
      <p className="sub" style={{ marginTop: 4 }}>Scrub to a machine, pause, and mark it. That exact frame becomes its still.</p>

      {err && <div className="card" style={{ color: 'var(--danger)', marginTop: 12 }}>{err}</div>}

      <div className="card" style={{ marginTop: 12, padding: 10 }}>
        <video ref={videoRef} className="seg-video" src={videoUrl ?? undefined} playsInline controls
          onLoadedMetadata={e => setDur((e.target as HTMLVideoElement).duration || 0)}
          onTimeUpdate={e => setT((e.target as HTMLVideoElement).currentTime)} />
        <div className="seg-controls">
          <button className="btn" onClick={() => step(-1)}>◄ 1s</button>
          <button className="btn" onClick={() => step(1)}>1s ►</button>
          <span className="seg-time">{t.toFixed(1)}s{dur ? ` / ${dur.toFixed(0)}s` : ''}</span>
          <button className="btn btn-primary" onClick={mark} disabled={busy || !videoUrl}>＋ Mark asset</button>
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
    </div>
  );
}
