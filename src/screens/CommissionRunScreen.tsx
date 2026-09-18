/* THE RUN — commissioning as a path you walk, not a form you fill in.
 *
 * The list screen is a register: everything, all at once, edit whatever you
 * like. That is the right shape for LOOKING at a job and the wrong shape for
 * DOING one, because doing one is sequential. You stand at the line with the
 * OEM engineer, you take the next program, you run it, you write down what it
 * did and what you think, you photograph the thing that went wrong, you agree
 * the next move, and then you take the next program.
 *
 * So this walks the items one at a time, in the same order every time, asking
 * the six questions a commissioning pass actually asks:
 *
 *   1  what it is                    the asset
 *   2  what good looks like          the measure of success
 *   3  what actually happened        the measurement
 *   4  what we make of it            the finding, in words
 *   5  what proves it                photographs, and the filmed walk
 *   6  what happens next             the very next move
 *
 * Every pass is KEPT rather than overwriting the last one. A line is signed off
 * on the story of how it got to rate, and "61 then 74 after the film change" is
 * an argument where "74" on its own is only a number.
 */
import { useEffect, useMemo, useState } from 'react';
import { nav, useRoute } from '../state/useRoute';
import { Crumbs } from '../ui/Crumbs';
import { useProject } from '../lib/useProjects';
import { useCommission } from '../lib/useCommission';
import { useCommissionEvidence, type WalkSnag } from '../lib/useCommissionEvidence';
import { captureMedia, pickExistingMedia } from '../lib/media';
import { getBlob, deleteBlobs } from '../db';
import { uid } from '../lib/ids';
import { SNAG_STATUS_META } from '../snag/types';
import type { MediaRef } from '../types';
import {
  stateOf, itemLine, latestFinding, STATE_LABEL,
  type CommissionItem, type Finding, type CheckStage, type TaskStage,
} from '../lib/commissioning';

const CHECK_STAGES: { id: CheckStage; label: string }[] = [
  { id: 'none', label: 'Not written' },
  { id: 'have', label: 'Written' },
  { id: 'testing', label: 'Testing' },
  { id: 'passed', label: 'Passed' },
  { id: 'failed', label: 'Failed' },
];
const TASK_STAGES: { id: TaskStage; label: string }[] = [
  { id: 'todo', label: 'To do' },
  { id: 'doing', label: 'In hand' },
  { id: 'waiting', label: 'Waiting' },
  { id: 'done', label: 'Done' },
];

function useBlobUrl(key?: string): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!key) { setUrl(undefined); return; }
    let dead = false; let made: string | undefined;
    void (async () => {
      const b = await getBlob(key);
      if (!b || dead) return;
      made = URL.createObjectURL(b); setUrl(made);
    })();
    return () => { dead = true; if (made) URL.revokeObjectURL(made); };
  }, [key]);
  return url;
}

function Thumb({ k, alt }: { k?: string; alt?: string }) {
  const url = useBlobUrl(k);
  return <span className="rn-thumb">{url ? <img src={url} alt={alt ?? ''} /> : null}</span>;
}

/** What this pass is being written against — where the item stands right now,
 *  and what the LAST pass said. Without it you are writing a finding with no
 *  memory of the finding before it, which is how a retest ends up repeating a
 *  conclusion somebody already reached. */
function History({ i }: { i: CommissionItem }) {
  const past = [...(i.findings ?? [])].reverse();
  if (past.length === 0) return null;
  return (
    <details className="rn-hist">
      <summary>{past.length} earlier pass{past.length === 1 ? '' : 'es'}</summary>
      <ol className="rn-hist-list">
        {past.map(f => (
          <li key={f.id}>
            <span className="rn-hist-when">
              {new Date(f.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              {f.by && <> · {f.by}</>}
            </span>
            {f.happened && <span className="rn-hist-h">{f.happened}</span>}
            {f.note && <span className="rn-hist-n">{f.note}</span>}
            {f.next && <span className="rn-hist-x">next: {f.next}</span>}
          </li>
        ))}
      </ol>
    </details>
  );
}

export function CommissionRunScreen({ projectId }: { projectId: string }) {
  const route = useRoute();
  const { loading, project } = useProject(projectId);
  const cm = useCommission(projectId);
  const ev = useCommissionEvidence(projectId);

  /* WHICH ITEMS THIS RUN COVERS, fixed when the run starts.
   *
   * Frozen on purpose. If the queue re-derived itself as you went, marking an
   * item Passed would drop it out from under you and the count would move while
   * you were looking at it — a progress bar that goes 3 of 12 to 3 of 11 is a
   * progress bar nobody trusts. */
  const streamFilter = route.query.get('stream') ?? '';
  /* An asset run. Present-but-empty means the LINE'S OWN items — which is a
     third state, not a missing one, so it is read off has() rather than off
     whether the string is truthy. */
  const assetParam = route.query.has('asset') ? (route.query.get('asset') ?? '') : null;
  const [queue, setQueue] = useState<string[] | null>(null);
  const [at, setAt] = useState(0);

  /* Starting a run for a DIFFERENT workstream must start a different run. The
     route stays /commissioning/run either way — only the query moves — so the
     screen is not remounted and a queue frozen on first mount would quietly
     replay the last workstream's items under the new heading. */
  const [ranFor, setRanFor] = useState<string | null>(null);
  const runKey = `${assetParam ?? '*'}|${streamFilter}`;
  useEffect(() => {
    if (cm.loading) return;
    if (queue && ranFor === runKey) return;
    const pick = cm.items
      .filter(i => assetParam == null || (i.asset ?? '') === assetParam)
      .filter(i => !streamFilter || i.stream === streamFilter)
      .filter(i => stateOf(i) !== 'g');
    setQueue(pick.map(i => i.id));
    setRanFor(runKey);
    setAt(0);
  }, [cm.loading, cm.items, queue, ranFor, runKey, assetParam, streamFilter]);

  const [by, setBy] = useState('');
  const [logged, setLogged] = useState(0);

  /* The pass being written, held here until it is saved — so moving back to an
     item you have already done this run does not silently re-open its finding. */
  const [draft, setDraft] = useState<Partial<Finding>>({});
  const [stage, setStage] = useState<CheckStage | TaskStage | undefined>();
  const [supply, setSupply] = useState<{ have?: number; onOrder?: number; dueIn?: string }>({});
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);

  const items = useMemo(
    () => (queue ?? []).map(id => cm.items.find(i => i.id === id)).filter((i): i is CommissionItem => !!i),
    [queue, cm.items],
  );
  const item = items[at];

  // A fresh item means a fresh pass — never carry one item's finding onto the next.
  //
  // Keyed on item?.id and NOT on item: `stage` below holds what the person has
  // chosen but not yet committed. If this re-ran whenever any field of the item
  // changed, a background sync pulling the same row would reset their choice
  // mid-pass. The narrow dependency is the behaviour, not an oversight.
  useEffect(() => {
    setDraft({}); setSupply({});
    setStage(item ? (item.kind === 'task' ? (item.taskStage ?? 'todo') : item.stage) : undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  if (loading || cm.loading || queue == null) {
    return <div className="wrap pace"><p className="sub">Loading…</p></div>;
  }
  if (!project) {
    return (
      <div className="wrap pace">
        <p className="sub" style={{ marginTop: 24 }}>That project isn’t here any more.</p>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => nav('/projects')}>All projects</button>
      </div>
    );
  }

  const back = () => nav(`/project/${projectId}/commissioning`);

  /* ---------- nothing to run ---------- */
  if (items.length === 0) {
    return (
      <div className="wrap pace rn">
        <Crumbs trail={[
          { label: 'Projects', to: '/projects' },
          { label: project.name, to: `/project/${projectId}` },
          { label: 'Commissioning', to: `/project/${projectId}/commissioning` },
          { label: 'Run' },
        ]} />
        <div className="bd-empty" style={{ marginTop: 20 }}>
          <p className="bd-empty-t">Nothing left to run</p>
          <p className="sub">
            Every item {assetParam ? `on ${assetParam} ` : assetParam === '' ? 'on the line itself ' : ''}
            {streamFilter ? `in ${streamFilter} ` : ''}is done. Add what is left, or go
            back to the list to see where the job stands.
          </p>
          <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={back}>Back to the list</button>
        </div>
      </div>
    );
  }

  /* ---------- the run is over ---------- */
  if (at >= items.length) {
    return (
      <div className="wrap pace rn">
        <Crumbs trail={[
          { label: 'Projects', to: '/projects' },
          { label: project.name, to: `/project/${projectId}` },
          { label: 'Commissioning', to: `/project/${projectId}/commissioning` },
          { label: 'Run' },
        ]} />
        <section className="rn-done">
          <h1 className="pace-title">Run finished</h1>
          <p className="rn-done-n"><b>{logged}</b> pass{logged === 1 ? '' : 'es'} logged</p>
          <p className="sub">
            {logged === 0
              ? 'Nothing was written down, so nothing changed.'
              : 'Each one is on its item, with what happened, what you made of it and what is next.'}
          </p>
          <div className="row-inline" style={{ marginTop: 18, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={back}>Back to the list</button>
            <button className="btn btn-ghost" onClick={() => { setLogged(0); setQueue(null); }}>
              Run again
            </button>
          </div>
        </section>
      </div>
    );
  }

  const st = stateOf(item);
  const set = (patch: Partial<Finding>) => setDraft(d => ({ ...d, ...patch }));

  const addPhoto = async (how: 'camera' | 'pick') => {
    setBusy(true);
    try {
      const got = how === 'camera'
        ? [await captureMedia('photo')].filter((x): x is MediaRef => !!x)
        : (await pickExistingMedia()).filter(m => m.kind === 'photo');
      if (got.length) set({ photos: [...(draft.photos ?? []), ...got] });
    } finally { setBusy(false); }
  };

  const dropPhoto = async (m: MediaRef) => {
    set({ photos: (draft.photos ?? []).filter(p => p.id !== m.id) });
    await deleteBlobs([m.blobKey, m.thumbKey].filter((x): x is string => !!x));
  };

  const toggleSnag = (id: string) => {
    const have = draft.snagIds ?? [];
    set({ snagIds: have.includes(id) ? have.filter(x => x !== id) : [...have, id] });
  };

  /** Anything written at all. A pass with nothing in it is not a pass, and
   *  saving one would put an empty entry in the history of a real machine. */
  const wrote = !!(draft.happened?.trim() || draft.note?.trim() || draft.next?.trim()
    || draft.photos?.length || draft.snagIds?.length
    || stage !== (item.kind === 'task' ? (item.taskStage ?? 'todo') : item.stage)
    || supply.have != null || supply.onOrder != null || supply.dueIn != null);

  const commit = () => {
    if (wrote) {
      const finding: Finding = {
        id: uid(), at: Date.now(), by: by.trim() || undefined,
        happened: draft.happened?.trim() || undefined,
        note: draft.note?.trim() || undefined,
        next: draft.next?.trim() || undefined,
        photos: draft.photos?.length ? draft.photos : undefined,
        snagIds: draft.snagIds?.length ? draft.snagIds : undefined,
        movedTo: stage,
      };
      /* The finding is the record; the item's own fields are its CURRENT state.
         Both are written together so the list, the report and the history can
         never disagree about where this item stands. */
      void cm.save({
        ...item,
        findings: [...(item.findings ?? []), finding],
        ...(draft.happened?.trim() ? { result: draft.happened.trim() } : {}),
        ...(item.kind === 'check' ? { stage: stage as CheckStage } : {}),
        ...(item.kind === 'task' ? { taskStage: stage as TaskStage } : {}),
        ...(item.kind === 'supply' ? {
          have: supply.have ?? item.have,
          onOrder: supply.onOrder ?? item.onOrder,
          dueIn: supply.dueIn ?? item.dueIn,
        } : {}),
        // Pictures and links land on the item too, so the A3 finds them without
        // having to walk the whole history looking.
        ...(draft.photos?.length ? { photos: [...(item.photos ?? []), ...draft.photos] } : {}),
        ...(draft.snagIds?.length
          ? { snagIds: [...new Set([...(item.snagIds ?? []), ...draft.snagIds])] }
          : {}),
      });
      setLogged(n => n + 1);
    }
    setAt(n => n + 1);
  };

  const stages = item.kind === 'task' ? TASK_STAGES : CHECK_STAGES;
  const linked = (draft.snagIds ?? [])
    .map(id => ev.byId.get(id)).filter((w): w is WalkSnag => !!w);
  const last = latestFinding(item);

  return (
    <div className="wrap pace rn">
      <Crumbs trail={[
        { label: 'Projects', to: '/projects' },
        { label: project.name, to: `/project/${projectId}` },
        { label: 'Commissioning', to: `/project/${projectId}/commissioning` },
        { label: 'Run' },
      ]} />

      {/* where you are in the pass */}
      <header className="rn-head">
        <div>
          <p className="pace-eyebrow">
            {project.name}
            {item.asset ? <> · {item.asset}</> : assetParam === '' ? <> · the line itself</> : null}
          </p>
          <h1 className="rn-title">{item.stream}</h1>
        </div>
        <div className="rn-prog">
          <span className="rn-prog-n">{at + 1} <i>of {items.length}</i></span>
          <span className="rn-prog-bar"><span style={{ width: `${((at) / items.length) * 100}%` }} /></span>
          <button className="btn btn-ghost rn-quit" onClick={back}>Stop</button>
        </div>
      </header>

      <div className="rn-card">
        {/* 1 — WHAT IT IS */}
        <section className="rn-step">
          <p className="rn-n">1 · What it is</p>
          <h2 className="rn-item">{item.title}</h2>
          <p className="rn-item-s">
            <span className="cm-kind">{item.kind}</span>
            <span className={'cm-state is-' + st}>{STATE_LABEL[st]}</span>
            {' '}· {itemLine(item)}
            {item.owner && <> · {item.owner}</>}
            {item.due && <> · wanted {item.due}</>}
          </p>
          <History i={item} />
        </section>

        {/* 2 — WHAT GOOD LOOKS LIKE */}
        <section className="rn-step">
          <p className="rn-n">2 · What good looks like</p>
          {item.target
            ? <p className="rn-target">{item.target}</p>
            : (
              <input className="text-input" placeholder="75 ppm at 98% OEE for 30 minutes"
                defaultValue="" onBlur={e => {
                  const v = e.target.value.trim();
                  if (v) void cm.save({ ...item, target: v });
                }} />
            )}
          {!item.target && (
            <p className="sub rn-hint">
              No measure of success set. Write it before you run — a result with nothing to be
              measured against is a number, not a pass or a fail.
            </p>
          )}
        </section>

        {/* 3 — WHAT ACTUALLY HAPPENED */}
        <section className="rn-step">
          <p className="rn-n">3 · What actually happened</p>
          {item.kind === 'supply' ? (
            <div className="cm-nums">
              <label className="cm-num"><span>Have now</span>
                <input type="number" min={0} value={supply.have ?? item.have ?? ''}
                  onChange={e => setSupply(s => ({ ...s, have: Math.max(0, Number(e.target.value) || 0) }))} /></label>
              <label className="cm-num"><span>On order</span>
                <input type="number" min={0} value={supply.onOrder ?? item.onOrder ?? ''}
                  onChange={e => setSupply(s => ({ ...s, onOrder: Math.max(0, Number(e.target.value) || 0) }))} /></label>
              <label className="cm-num"><span>Due in</span>
                <input type="date" value={supply.dueIn ?? item.dueIn ?? ''}
                  onChange={e => setSupply(s => ({ ...s, dueIn: e.target.value }))} /></label>
            </div>
          ) : (
            <div className="rn-stages">
              {stages.map(s2 => (
                <button key={s2.id} className={'chip' + (stage === s2.id ? ' on' : '')}
                  onClick={() => setStage(s2.id)}>{s2.label}</button>
              ))}
            </div>
          )}
          <input className="text-input" style={{ marginTop: 10 }}
            placeholder={item.kind === 'check' ? '72 ppm at 94%, stopped twice on film creasing' : 'What happened this time'}
            value={draft.happened ?? ''} onChange={e => set({ happened: e.target.value })} />
          {last?.happened && (
            <p className="sub rn-hint">Last time: {last.happened}</p>
          )}
        </section>

        {/* 4 — THE FINDING */}
        <section className="rn-step">
          <p className="rn-n">4 · What we make of it</p>
          <textarea className="text-input rn-area" rows={3}
            placeholder="The finding — why it did that, what it means, what the OEM said"
            value={draft.note ?? ''} onChange={e => set({ note: e.target.value })} />
        </section>

        {/* 5 — WHAT PROVES IT */}
        <section className="rn-step">
          <p className="rn-n">5 · What proves it</p>
          <div className="cm-shots">
            {(draft.photos ?? []).map(m => (
              <span className="cm-shot" key={m.id}>
                <span className="cm-shot-b"><Thumb k={m.thumbKey ?? m.blobKey} /></span>
                <button className="cm-shot-x" onClick={() => void dropPhoto(m)} aria-label="Remove">×</button>
              </span>
            ))}
            <button className="cm-shot-add" disabled={busy} onClick={() => void addPhoto('camera')}>
              {busy ? '…' : '＋ Take a photo'}
            </button>
            <button className="cm-shot-add is-pick" disabled={busy} onClick={() => void addPhoto('pick')}>
              Choose files
            </button>
            <button className="cm-shot-add" onClick={() => setPicking(true)}>⌗ Link from the walk</button>
          </div>
          {linked.length > 0 && (
            <div className="cm-evs" style={{ marginTop: 8 }}>
              {linked.map(w => (
                <div className="cm-ev" key={w.snag.id}>
                  <span className="cm-ev-b"><Thumb k={w.stillKey} /></span>
                  <div className="cm-ev-m">
                    <span className="cm-ev-t">{w.snag.problem || 'Snag'}</span>
                    <span className="cm-ev-s">
                      <b style={{ color: SNAG_STATUS_META[w.snag.status].color }}>
                        {SNAG_STATUS_META[w.snag.status].label}
                      </b>
                      {w.asset?.name && <> · {w.asset.name}</>}
                    </span>
                  </div>
                  <button className="cm-ev-x" onClick={() => toggleSnag(w.snag.id)} aria-label="Unlink">×</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 6 — WHAT HAPPENS NEXT */}
        <section className="rn-step">
          <p className="rn-n">6 · What happens next</p>
          <input className="text-input"
            placeholder="The very next move — not a wish list, the next thing somebody does"
            value={draft.next ?? ''} onChange={e => set({ next: e.target.value })} />
          {last?.next && !draft.next && (
            <p className="sub rn-hint">Last time you said: {last.next}</p>
          )}
        </section>
      </div>

      <footer className="rn-foot">
        <button className="btn btn-ghost" disabled={at === 0} onClick={() => setAt(n => Math.max(0, n - 1))}>
          ← Back
        </button>
        <label className="rn-by">
          <span>Run by</span>
          <input className="text-input" placeholder="you and the OEM engineer"
            value={by} onChange={e => setBy(e.target.value)} />
        </label>
        <div style={{ flex: 1 }} />
        <button className="btn btn-ghost" onClick={() => setAt(n => n + 1)}>Skip</button>
        <button className="btn btn-primary" onClick={commit}>
          {wrote ? 'Log it & next →' : (at + 1 === items.length ? 'Finish' : 'Next →')}
        </button>
      </footer>

      {picking && (
        <div className="lt-paste-back" role="dialog" aria-modal="true" aria-label="Link filmed evidence">
          <div className="bs cm-pick">
            <h2 className="lt-paste-t">Link filmed evidence</h2>
            <p className="sub bs-lede">Snags off this project’s line walk, attached to this pass.</p>
            {ev.snags.length === 0 ? (
              <div className="cm-pick-none">
                <p className="sub">Nothing has been pinned on this project’s walk yet.</p>
                <button className="btn btn-primary" style={{ marginTop: 12 }}
                  onClick={() => nav(`/project/${projectId}?view=snags`)}>Go to Evidence</button>
              </div>
            ) : (
              <ul className="cm-pick-list">
                {ev.snags.map(w => (
                  <li key={w.snag.id}>
                    <button type="button"
                      className={'cm-pick-row' + ((draft.snagIds ?? []).includes(w.snag.id) ? ' on' : '')}
                      onClick={() => toggleSnag(w.snag.id)}>
                      <span className="cm-pick-img"><Thumb k={w.stillKey} /></span>
                      <span className="cm-pick-m">
                        <span className="cm-pick-t">{w.snag.problem || 'Snag'}</span>
                        <span className="cm-pick-s">
                          <b style={{ color: SNAG_STATUS_META[w.snag.status].color }}>
                            {SNAG_STATUS_META[w.snag.status].label}
                          </b>
                          {w.asset?.name && <> · {w.asset.name}</>}
                        </span>
                      </span>
                      <span className="cm-pick-tick">{(draft.snagIds ?? []).includes(w.snag.id) ? '✓' : ''}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="wp-foot">
              <div style={{ flex: 1 }} />
              <button className="btn btn-primary" onClick={() => setPicking(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
