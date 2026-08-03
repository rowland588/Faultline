/* Capture — the shop floor. Tap WHAT, tap WHERE, put a TIME to it, snap the
 * proof. One thumb, no charts, nothing technical. A running stopwatch is
 * persisted, so it survives the app closing. Every log is a check-sheet row. */
import { useEffect, useState } from 'react';
import type { Observation, MediaRef } from '../types';
import { useWorkspace } from '../state/WorkspaceProvider';
import { saveActiveTimer } from '../db';
import { uid, now } from '../lib/ids';
import { captureMedia } from '../lib/media';
import { fmtDuration, fmtDurationWords, plural } from '../lib/format';
import { ChipPicker } from '../ui/Chip';
import { Stopwatch } from '../ui/Stopwatch';
import { Toast } from '../ui/Toast';
import { EvidenceThumb, EvidenceViewer } from '../ui/Evidence';

export function CaptureScreen() {
  const { workspace, observations, addObs, removeObs, patchWorkspace } = useWorkspace();

  const [category, setCategory] = useState(workspace.lastCategory ?? workspace.categories[0] ?? '');
  const [subcategory, setSubcategory] = useState('');
  const [asset, setAsset] = useState(workspace.lastAsset ?? workspace.assets[0] ?? '');
  const subOptions = (workspace.subcategories ?? {})[category] ?? [];
  const pickCategory = (c: string) => { setCategory(c); setSubcategory(''); };
  const [pending, setPending] = useState<MediaRef[]>([]);
  const [startedAt, setStartedAt] = useState<number | null>(workspace.activeTimer?.startedAt ?? null);
  const [typed, setTyped] = useState(false);
  const [tMin, setTMin] = useState('');
  const [tSec, setTSec] = useState('');
  const [toast, setToast] = useState<{ msg: string; obsId: string } | null>(null);
  const [viewing, setViewing] = useState<MediaRef | null>(null);

  // Resume a running stopwatch (and its what/where) that survived an app close.
  useEffect(() => {
    if (workspace.activeTimer) {
      setStartedAt(workspace.activeTimer.startedAt);
      setCategory(workspace.activeTimer.category);
      setSubcategory(workspace.activeTimer.subcategory ?? '');
      setAsset(workspace.activeTimer.asset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const timing = startedAt !== null;
  const canLog = !!category && !!asset;

  const commit = async (durationMs: number, kind: Observation['timing'], startAt: number) => {
    const o: Observation = {
      id: uid(),
      workspaceId: workspace.id,
      category,
      subcategory: subcategory || undefined,
      asset,
      startedAt: startAt,
      endedAt: kind === 'stopwatch' ? now() : undefined,
      durationMs,
      timing: kind,
      count: 1,
      media: pending,
      createdAt: now(),
      updatedAt: now(),
    };
    await addObs(o);
    await patchWorkspace({ lastCategory: category, lastAsset: asset, activeTimer: undefined });
    setPending([]);
    setStartedAt(null);
    setToast({ msg: `${o.category} · ${o.asset}${durationMs > 0 ? ' · ' + fmtDuration(durationMs) : ''}`, obsId: o.id });
  };

  const start = async () => {
    if (!canLog) return;
    const t = now();
    setStartedAt(t);
    await saveActiveTimer(workspace.id, { category, subcategory: subcategory || undefined, asset, startedAt: t });
  };
  const stopAndLog = async () => {
    if (startedAt === null) return;
    await commit(Math.max(1000, now() - startedAt), 'stopwatch', startedAt);
  };
  const discard = async () => {
    setStartedAt(null);
    await saveActiveTimer(workspace.id, undefined);
  };
  const logInstant = async () => {
    if (!canLog) return;
    await commit(0, 'instant', now());
  };
  const logTyped = async () => {
    const ms = ((parseInt(tMin, 10) || 0) * 60 + (parseInt(tSec, 10) || 0)) * 1000;
    if (!canLog || ms <= 0) return;
    setTyped(false); setTMin(''); setTSec('');
    await commit(ms, 'typed', now());
  };
  const attach = async (kind: 'photo' | 'video') => {
    const ref = await captureMedia(kind);
    if (ref) setPending(m => [...m, ref]);
  };
  const undo = async () => {
    if (!toast) return;
    await removeObs(toast.obsId);
    setToast(null);
  };

  const total = observations.reduce((a, o) => a + o.durationMs, 0);

  return (
    <div className="wrap cap">
      {/* WHAT */}
      <div className="cap-block">
        <div className="field-label">What did you see?</div>
        <ChipPicker
          options={workspace.categories}
          value={category}
          color={workspace.color}
          onChange={pickCategory}
          onAdd={c => void patchWorkspace({ categories: [...workspace.categories, c] })}
          addLabel="Add a category…"
        />
      </div>

      {/* WHAT — sub-category (scoped to the chosen category; drills to its own Pareto) */}
      {category && (
        <div className="cap-block">
          <div className="field-label">Which kind? <span className="opt">optional</span></div>
          <ChipPicker
            options={subOptions}
            value={subcategory}
            color={workspace.color}
            onChange={setSubcategory}
            onAdd={s => void patchWorkspace({ subcategories: { ...(workspace.subcategories ?? {}), [category]: [...subOptions, s] } })}
            addLabel={`Add a kind of ${category}…`}
          />
        </div>
      )}

      {/* WHERE */}
      <div className="cap-block">
        <div className="field-label">Where?</div>
        <ChipPicker
          options={workspace.assets}
          value={asset}
          onChange={setAsset}
          onAdd={a => void patchWorkspace({ assets: [...workspace.assets, a] })}
          addLabel="Add a machine or area…"
        />
        {workspace.assets.length === 0 && <p className="sub" style={{ marginTop: 6 }}>Add the first machine or area — that's where the drill-down starts.</p>}
      </div>

      {/* THE TIME — the whole point */}
      <div className={'cap-timer' + (timing ? ' live' : '')}>
        {timing ? (
          <>
            <div className="cap-timer-what">{category} · {asset}</div>
            <div className="cap-clock"><span className="cap-dot" />{startedAt !== null && <Stopwatch startedAt={startedAt} />}</div>
            <div className="cap-timer-actions">
              <button className="btn btn-primary btn-lg cap-stop" onClick={stopAndLog}>■ Stop &amp; log</button>
              <button className="btn btn-ghost" onClick={discard}>Discard</button>
            </div>
          </>
        ) : (
          <>
            <button className="btn btn-primary cap-start" disabled={!canLog} onClick={start}>
              ▶ Start timing
            </button>
            <div className="cap-secondary">
              <button className="btn" disabled={!canLog} onClick={logInstant}>Log now</button>
              <button className="btn" disabled={!canLog} onClick={() => setTyped(t => !t)}>Type a time</button>
            </div>
            {typed && (
              <div className="cap-typed">
                <input className="text-input" type="number" min="0" placeholder="min" value={tMin} onChange={e => setTMin(e.target.value)} />
                <input className="text-input" type="number" min="0" max="59" placeholder="sec" value={tSec} onChange={e => setTSec(e.target.value)} />
                <button className="btn btn-primary" onClick={logTyped}>Log</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* EVIDENCE */}
      <div className="cap-block cap-evidence">
        <div className="cap-ev-row">
          <button className="btn cap-ev-btn" onClick={() => attach('photo')}>📷 Photo</button>
          <button className="btn cap-ev-btn" onClick={() => attach('video')}>🎥 Video</button>
          {pending.map(m => <EvidenceThumb key={m.id} media={m} onClick={() => setViewing(m)} />)}
        </div>
        {pending.length > 0 && <p className="sub" style={{ marginTop: 6 }}>{plural(pending.length, 'clip')} ready — attaches to the next log.</p>}
      </div>

      {/* RUNNING TALLY */}
      <div className="cap-tally">
        <b>{observations.length}</b> {observations.length === 1 ? 'observation' : 'observations'}
        {total > 0 && <> · <b>{fmtDurationWords(total)}</b> logged</>}
      </div>

      {toast && <Toast message={toast.msg} onUndo={undo} onDismiss={() => setToast(null)} />}
      {viewing && <EvidenceViewer media={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
