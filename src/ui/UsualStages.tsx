/* THE USUAL STAGES — what "Add the usual stages" puts on a machine, shown and
 * edited in place on the Install screen.
 *
 * Rowland: "Allow me to edit the 6 install names that you have made as
 * default." Changing them changes what the NEXT machine gets. A step already
 * on a machine is its own record and is renamed on its own page — rewriting
 * those behind somebody's back would change what the client was already sent.
 */
import { useState } from 'react';
import { updateProject } from '../db';
import { cleanStages, type usualStages } from '../lib/install';
import { INSTALL_STAGES } from '../lib/testing';
import type { Project } from '../types';

export function UsualStages({ project, usual, otherName }: {
  project: Project; usual: ReturnType<typeof usualStages>; otherName?: string;
}) {
  const [draft, setDraft] = useState<string[] | null>(null);

  const save = async () => {
    if (!draft) return;
    await updateProject({ ...project, installStages: cleanStages(draft), updatedAt: Date.now() });
    setDraft(null);
  };
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
