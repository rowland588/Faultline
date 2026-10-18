/* MOVING A PROJECT, ASKING ABOUT ONE — the sheet and the panel of slice 5
 * (docs/PLATFORM-REVIEW.md §6.5–6.6). Changing a method with the assistant
 * is a conversation in the design studio (screens/DesignScreen ?version=),
 * which replaced the one-shot sheet that was here: it keeps shaping the same
 * proposal turn after turn, with the library beside it.
 *
 *   MoveSheet    what moving a running project onto the approved version
 *                would do, said first (lib/flow/change moveEffect); moved
 *                only by the owner, with Undo.
 *   AskPanel     a question about the project: the app answers the common
 *                ones itself (lib/flow/ground); the assistant, when on,
 *                answers the rest from the project's facts alone, every
 *                sentence saying how it is known, checked before it is shown. */
import { useEffect, useState } from 'react';
import type { FlowProject, OpContext } from '../../lib/flow/operations';
import { askAssistant } from '../../lib/flow/assist';
import { moveProject, previewMove } from '../../lib/flow/move';
import { answerLocally, factsOf } from '../../lib/flow/ground';
import type { Said } from '../../lib/flow/askCore';
import type { MoveEffect } from '../../lib/flow/change';
import type { Method } from '../../lib/flow/records';
import { Sheet } from '../Sheet';
import { offerUndo } from '../Undo';

/** MOVE THIS PROJECT ONTO THE APPROVED VERSION — what it does, first. */
export function MoveSheet({ projectId, projectName, to, ctx, onClose }: { projectId: string; projectName: string; to: Method; ctx: OpContext; onClose: () => void }) {
  const [p, setP] = useState<{ effect: MoveEffect; from: number; to: number } | null | undefined>(undefined);
  const [said, setSaid] = useState<{ text: string; bad: boolean } | null>(null);
  useEffect(() => { void previewMove(projectId, to.id).then(x => setP(x ?? null)); }, [projectId, to.id]);
  const e = p?.effect;
  return (
    <Sheet open onClose={onClose} title={`Move ${projectName} to version ${to.version}`}>
      <div className="fw-sheet fw-edit" data-move={to.version}>
        {p === undefined && <p className="sub">Reading what it would do…</p>}
        {p === null && <p className="sub is-r">The project could not be read against that version on this device.</p>}
        {e && p && (
          <>
            <p className="fw-state is-n"><b>{e.says}</b></p>
            {e.newSteps.length > 0 && <div className="fw-f"><span className="field-label">New to do</span><ul className="fw-list">{e.newSteps.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
            {e.history.length > 0 && <div className="fw-f"><span className="field-label">No longer on the method — kept as history, not counted</span><ul className="fw-list">{e.history.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
            {e.gatesChanged.length > 0 && <div className="fw-f"><span className="field-label">Passed gates that stand, though they now need more</span><ul className="fw-list">{e.gatesChanged.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
            {e.gatesGone.length > 0 && <div className="fw-f"><span className="field-label">Passes on stages now gone — kept as history</span><ul className="fw-list">{e.gatesGone.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
            {said && <p className={'sub' + (said.bad ? ' is-r' : ' is-g')} role="status">{said.text}</p>}
            <div className="fw-acts">
              {ctx.can.agree
                ? <button type="button" className="btn btn-primary" disabled={!!said && !said.bad} onClick={() => void moveProject(ctx, projectId, to.id).then(r => {
                  setSaid(r.ok ? { text: r.said, bad: false } : { text: r.why, bad: true });
                  if (r.ok && r.undo) offerUndo(`${projectName} moved to version ${to.version}`, r.undo);
                })}>Move it to version {to.version}</button>
                : <span className="sub">Moving a project to another version is the project owner’s.</span>}
              <button type="button" className="btn btn-ghost" onClick={onClose}>{said && !said.bad ? 'Done' : 'Not now'}</button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}

const BASIS_WORD: Record<Said['basis'], string> = { known: 'known', 'worked out': 'worked out', inferred: 'the assistant’s reading', unknown: 'not known' };
const ASKS = ['What next?', 'What is late?', 'Can the gate pass?', 'Who owes what?'];

/** ASK ABOUT THIS PROJECT — answered from its facts, each sentence saying how it is known. */
export function AskPanel({ fp }: { fp: FlowProject }) {
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<{ q: string; lines: Said[]; by: 'app' | 'assistant' } | null>(null);
  const [why, setWhy] = useState<string | null>(null);
  const ask = async (question: string) => {
    const words = question.trim();
    if (!words) return;
    setWhy(null);
    const mine = answerLocally(words, fp);
    if (mine) { setSaid({ q: words, lines: mine, by: 'app' }); return; }
    setBusy(true);
    const r = await askAssistant(words, factsOf(fp));
    setBusy(false);
    if (r.ok) setSaid({ q: words, lines: r.said, by: 'assistant' });
    else { setSaid(null); setWhy(r.off ? `${r.why} The app answers these itself: ${ASKS.join(' ')}` : r.why); }
  };
  return (
    <div className="fw-ask">
      <form className="fw-acts" onSubmit={e => { e.preventDefault(); void ask(q); }}>
        <input className="text-input fw-in fw-ask-in" value={q} maxLength={400} placeholder="Ask about this project — what is late, can the gate pass…" aria-label="Ask about this project" onChange={e => setQ(e.target.value)} />
        <button type="submit" className="btn btn-sm" disabled={busy || !q.trim()}>{busy ? 'Asking…' : 'Ask'}</button>
      </form>
      <div className="fw-ask-q">{ASKS.map(a => <button key={a} type="button" className="fw-chip fw-chip-b" onClick={() => { setQ(a); void ask(a); }}>{a}</button>)}</div>
      {why && <p className="sub is-a" role="status">{why}</p>}
      {said && (
        <div className="fw-ask-a" role="status">
          <p className="sub">{said.q} — {said.by === 'app' ? 'answered by the app, from what is recorded' : 'answered by the assistant, from the project’s facts only'}</p>
          <ul className="fw-said">
            {said.lines.map((l, i) => (
              <li key={i} className={'fw-said-l is-' + l.basis.replace(' ', '-')}>
                <span>{l.text}</span> <em className="fw-basis">{BASIS_WORD[l.basis]}{l.note ? ` — ${l.note}` : ''}</em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
