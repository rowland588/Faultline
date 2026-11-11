/* COMMENTARY / NOTES ON A STUDY — one mechanism for every tool that keeps remarks (facts.remarks): written where the
 * work is done, kept with when and who, edited where it sits, taken off with Undo, and on the paper. Moved out of the
 * reliability screen on 2 November so the capability study (a live test) can carry notes too. */
import { useMemo, useState, type ReactNode } from 'react';
import { patchStudy } from '../db';
import { now, uid } from '../lib/ids';
import { niceDay, isoDay } from '../lib/weeks';
import type { Remark, ToolStudy } from '../lib/study';
import { LeanPanel } from './Lean';
import { useSession } from '../cloud/session';
import { displayName } from '../cloud/team';
import { ToolProblemsHere } from './ToolProblems';

const hm = (ms: number) => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

/** COMMENTARY — what the person at the machine saw and thinks, kept with when
 *  and who; edited where it sits, taken off with Undo, and on the paper. */
type CommentaryProps = { s: ToolStudy; canEdit: boolean; me?: string; title?: string; hint?: string; folded?: boolean | 'menu'; open?: boolean };

/** The notes, then the problems the record holds (docs/TOOL-PROBLEMS.md, slice 2) — every tool that keeps notes holds its problems the same way. */
export function Commentary(p: CommentaryProps) {
  return <><Notes {...p} /><ToolProblemsHere s={p.s} canEdit={p.canEdit} /></>;
}

function Notes({ s, canEdit, me, title = 'Commentary', hint, folded = false, open = false }: CommentaryProps) {
  const { session } = useSession();
  const who = me ?? (displayName(session?.user.email) || undefined);
  const remarks = useMemo(() => [...(s.facts.remarks ?? [])].sort((x, y) => x.at - y.at), [s.facts.remarks]);
  const [text, setText] = useState('');
  const [asking, setAsking] = useState(false);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [showOff, setShowOff] = useState(false);
  const put = (fn: (rs: Remark[]) => Remark[]) => void patchStudy(s.id, cur => ({ facts: { ...cur.facts, remarks: fn(cur.facts.remarks ?? []) } }));
  const add = () => { const v = text.trim(); if (!v) return; put(rs => [...rs, { id: uid(), at: now(), text: v, ...(who ? { by: who } : {}) }]); setText(''); };
  const live = remarks.filter(r => !r.struck), off = remarks.filter(r => r.struck);
  /* FOLDED: a page with no note yet shows one small control, not a box — the box comes out when it is wanted (docs, Simplicity 2) */
  if (folded && !live.length && !off.length && !asking && !open) {
    /* 'menu': the page has no room for a control — its More ▾ opens the box (open) */
    if (folded === 'menu') return null;
    return canEdit ? <p className="cmt-fold"><button type="button" className="cw-link" onClick={() => setAsking(true)}>Add a note</button></p> : null;
  }
  /* NOTHING WRITTEN YET — the box to write in under its word, on the canvas, not a card at the foot of the page (docs/DESIGN.md,
     10 November: fewer boxes); once there is a note, the panel that holds them */
  const body: ReactNode = (
    <>
      {!live.length && <p className="sub">{canEdit ? (hint ?? 'Nothing written yet — what was seen at the machine, what was tried, what to look at next.') : 'Nothing written yet.'}</p>}
      <ul className="rl-rem">
        {live.map(r => (
          <li key={r.id} data-remark={r.id}>
            {editing?.id === r.id ? (
              <form className="rl-note" onSubmit={e => { e.preventDefault(); const v = editing.text.trim(); if (v) put(rs => rs.map(x => (x.id === r.id ? { ...x, text: v, editedAt: now() } : x))); setEditing(null); }}>
                <textarea className="text-input" autoFocus rows={2} value={editing.text} aria-label="The remark" onChange={e => setEditing({ id: r.id, text: e.target.value })} />
                <button type="submit" className="btn btn-primary">Keep</button>
                <button type="button" className="btn" onClick={() => setEditing(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <p className="rl-rem-t">{r.text}</p>
                <span className="sub">{niceDay(isoDay(r.at))} {hm(r.at)}{r.by ? ` · ${r.by}` : ''}{r.editedAt ? ' · edited' : ''}</span>
                {canEdit && (
                  <span className="lt-acts">
                    <button type="button" className="cw-link" onClick={() => setEditing({ id: r.id, text: r.text })}>Edit</button>
                    <button type="button" className="cw-link sp-rm" onClick={() => put(rs => rs.map(x => (x.id === r.id ? { ...x, struck: true } : x)))}>Delete</button>
                  </span>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
      {off.length > 0 && canEdit && (
        <div className="ie-all">
          <button type="button" className="linkish" aria-expanded={showOff} onClick={() => setShowOff(o => !o)}>{showOff ? 'Hide' : 'Show'} the {off.length} taken off</button>
          {showOff && (
            <ul className="rl-rem is-off">
              {off.map(r => (
                <li key={r.id}><p className="rl-rem-t">{r.text}</p><button type="button" className="linkish" onClick={() => put(rs => rs.map(x => (x.id === r.id ? { ...x, struck: undefined } : x)))}>Undo — bring it back</button></li>
              ))}
            </ul>
          )}
        </div>
      )}
      {canEdit && (
        <form className="rl-note" onSubmit={e => { e.preventDefault(); add(); }}>
          <textarea className="text-input" rows={2} value={text} maxLength={2000} placeholder="Write what was seen, tried, or needs looking at" aria-label="Add to the commentary" onChange={e => setText(e.target.value)} />
          <button type="submit" className="btn" disabled={!text.trim()}>Add</button>
        </form>
      )}
    </>
  );
  /* never a component made here — the box would be made afresh on every key and lose what is typed */
  return live.length || off.length
    ? <LeanPanel title={title} className="ln-solo rl-remarks">{body}</LeanPanel>
    : <section className="rl-remarks cmt-quiet" aria-label={title}><h2 className="cmt-h">{title}</h2>{body}</section>;
}

