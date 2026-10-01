/* THE USUAL STAGES — what "Add the usual stages" puts on a machine, shown and
 * edited in place on the Install screen.
 *
 * Rowland: "Allow me to edit the 6 install names that you have made as
 * default." Changing them changes what the NEXT machine gets. A step already
 * on a machine is its own record, and is never rewritten behind somebody's
 * back — that would change what the client was already sent.
 *
 * But renaming a stage and leaving its old name on every machine is how the
 * grid grew a seventh column nobody could remove. So a rename ASKS, once,
 * whether the steps already called the old name should take the new one.
 */
import { useState } from 'react';
import { updateProject } from '../db';
import { cleanStages, stageRenames, stepsNamed, type usualStages } from '../lib/install';
import { INSTALL_STAGES, type Test } from '../lib/testing';
import type { Project } from '../types';

export function UsualStages({ project, usual, otherName, tests = [], renameSteps, extras = [], onMove, onRemove }: {
  project: Project; usual: ReturnType<typeof usualStages>; otherName?: string;
  /** The job's records, to count the steps a rename would touch. */
  tests?: Test[];
  renameSteps?: (pairs: { from: string; to: string }[]) => Promise<void>;
  /** Columns on the grid that are not one of these stages — steps given a
   *  name before the stages changed. Rowland went to "edit stages" to remove
   *  one and it was not there; now it is, with the ways to clear it. */
  extras?: { col: string; n: number; fresh: number }[];
  onMove?: (col: string, target: string) => boolean;
  onRemove?: (col: string) => boolean;
}) {
  const [draft, setDraft] = useState<string[] | null>(null);
  /* Renames that have steps on machines still wearing the old name. */
  const [asking, setAsking] = useState<{ from: string; to: string; n: number }[] | null>(null);

  const save = async () => {
    if (!draft) return;
    const after = cleanStages(draft) ?? [...INSTALL_STAGES];
    const renamed = stageRenames(usual.stages, after)
      .map(r => ({ ...r, n: stepsNamed(tests, r.from).length }))
      .filter(r => r.n > 0);
    await updateProject({ ...project, installStages: cleanStages(draft), updatedAt: Date.now() });
    setDraft(null);
    if (renamed.length && renameSteps) setAsking(renamed);
  };

  if (asking) {
    return (
      <section className="in-usual is-asking">
        <div className="in-usual-h"><b>Rename the steps already on machines?</b></div>
        <ul className="in-usual-list">
          {asking.map(r => <li key={r.from}>“{r.from}” → “{r.to}” · on {r.n} machine{r.n === 1 ? '' : 's'}</li>)}
        </ul>
        <div className="in-usual-go">
          <button className="btn btn-primary" onClick={() => void (async () => { await renameSteps?.(asking); setAsking(null); })()}>Rename them too</button>
          <button className="btn btn-ghost" onClick={() => setAsking(null)}>Keep their old names</button>
        </div>
        <p className="sub tw-note">Keeping them leaves the old name as a column of its own on the grid.</p>
      </section>
    );
  }
  const set = (i: number, v: string) => setDraft(d => (d ? d.map((x, k) => (k === i ? v : x)) : d));
  const move = (i: number, by: number) => setDraft(d => {
    if (!d) return d;
    const j = i + by;
    if (j < 0 || j >= d.length) return d;
    const n = [...d];
    [n[i], n[j]] = [n[j], n[i]];
    return n;
  });

  if (!draft) {
    return (
      <section className="in-usual">
        <div className="in-usual-h">
          <b>The usual stages</b>
          <span className="sub">
            {usual.from === 'job' ? 'this job’s own'
              : usual.from === 'other' ? `taken from ${otherName ?? 'another job'}`
                : 'the app’s — make them yours'}
          </span>
          <button className="cw-link" onClick={() => setDraft([...usual.stages])}>Edit</button>
        </div>
        <ol className="in-usual-list">
          {usual.stages.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
        {extras.length > 0 && (
          <div className="in-extra">
            <b className="in-extra-h">Also on the grid — not one of these stages</b>
            <p className="sub tw-note">Steps given this name before the stages changed. Move them into a stage, remove the ones never started, or keep it as a stage of its own.</p>
            {extras.map(x => (
              <div key={x.col} className="in-extra-row">
                <span className="in-extra-n"><b>{x.col}</b> <span className="sub">on {x.n} machine{x.n === 1 ? '' : 's'}</span></span>
                <span className="in-extra-acts">
                  <select defaultValue="" aria-label={`Move “${x.col}” into`} onChange={e => { if (e.target.value) onMove?.(x.col, e.target.value); e.target.value = ''; }}>
                    <option value="">Move into…</option>
                    {usual.stages.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                  {x.fresh > 0 && <button className="btn btn-ghost in-extra-b is-bad" onClick={() => onRemove?.(x.col)}>Remove{x.fresh < x.n ? ` ${x.fresh} never started` : ''}</button>}
                  <button className="btn btn-ghost in-extra-b" onClick={() => void updateProject({ ...project, installStages: cleanStages([...usual.stages, x.col]), updatedAt: Date.now() })}>Make it a stage</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    );
  }

  const cleaned = cleanStages(draft) ?? [...INSTALL_STAGES];
  return (
    <section className="in-usual is-editing">
      <div className="in-usual-h"><b>The usual stages</b><span className="sub">in the order they happen</span></div>
      <ol className="in-usual-edit">
        {draft.map((s, i) => (
          <li key={i}>
            <span className="in-usual-n">{i + 1}</span>
            <input value={s} onChange={e => set(i, e.target.value)} aria-label={`Stage ${i + 1}`}
              placeholder="Name the stage" autoFocus={i === draft.length - 1 && s === ''} />
            <button className="btn btn-ghost in-usual-b" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
            <button className="btn btn-ghost in-usual-b" onClick={() => move(i, 1)} disabled={i === draft.length - 1} aria-label="Move down">↓</button>
            <button className="btn btn-ghost in-usual-b" onClick={() => setDraft(d => (d ? d.filter((_, k) => k !== i) : d))}
              aria-label={`Remove ${s || 'this stage'}`}>✕</button>
          </li>
        ))}
      </ol>
      <button className="cw-add" onClick={() => setDraft(d => (d ? [...d, ''] : d))}>
        <span className="cw-add-p" aria-hidden>+</span> Add a stage
      </button>
      <div className="in-usual-go">
        <button className="btn" onClick={() => void save()} disabled={cleaned.length === 0}>
          Save {cleaned.length} stage{cleaned.length === 1 ? '' : 's'}
        </button>
        <button className="btn btn-ghost" onClick={() => setDraft(null)}>Cancel</button>
        <button className="cw-link" onClick={() => setDraft([...INSTALL_STAGES])}>Back to the app’s six</button>
      </div>
      <p className="sub tw-note">
        This is what the next machine gets. Steps already on a machine keep their names — tap one to rename it.
      </p>
    </section>
  );
}
