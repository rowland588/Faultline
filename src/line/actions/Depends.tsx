/* WHAT WAITS FOR WHAT, ON SCREEN (depends.ts says why). One sheet makes a link wherever it is made — from a tracker row, from a
 * bar dragged to another on the Gantt, from the problem's own editor — and offers it both ways round: this waits for…, this holds
 * up…. The editor's block says both lists with a ✕ each, and the clash in words. Every change is the waiting action's own
 * `after`, so all three places read one record. */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listAllSnags, onDataChange, patchSnag } from '../../db';
import type { Snag } from '../../snag/types';
import { Icon } from '../../ui/Icon';
import { Sheet } from '../../ui/Sheet';
import { afterOf, depSays, holdsUp, setLink, waitsFor } from './depends';

type Dir = 'waits' | 'holds';

async function apply(snags: readonly Snag[], waiter: string, on: string, linked: boolean): Promise<string | null> {
  const r = setLink(snags, waiter, on, linked);
  if ('refused' in r) return r.refused;
  await patchSnag(r.id, { after: r.after });
  return null;
}

/** The sheet: link `id` to another action on its line, either way round. With `pair` (a bar dragged onto another on the Gantt)
 *  it asks only which way round. */
export function LinkSheet({ snags, id, pair, onClose }: { snags: readonly Snag[]; id: string; pair?: string; onClose: () => void }) {
  const me = snags.find(s => s.id === id);
  const [dir, setDir] = useState<Dir>('waits');
  const [said, setSaid] = useState<string | null>(null);
  const others = useMemo(() => (me ? snags.filter(s => s.id !== id && s.workspaceId === me.workspaceId && !s.deletedAt && !s.archivedAt
    && (s.status !== 'closed' || afterOf(me).includes(s.id) || afterOf(s).includes(id))) : []), [snags, me, id]);
  if (!me) return null;
  const other = pair ? snags.find(s => s.id === pair) : undefined;
  const linkedTo = (o: Snag) => (dir === 'waits' ? afterOf(me).includes(o.id) : afterOf(o).includes(me.id));
  const toggle = async (o: Snag) => {
    const on = !linkedTo(o);
    setSaid(dir === 'waits' ? await apply(snags, me.id, o.id, on) : await apply(snags, o.id, me.id, on));
  };
  const pick = async (waiter: string, on: string) => { const r = await apply(snags, waiter, on, true); if (r) setSaid(r); else onClose(); };

  return (
    <Sheet open onClose={onClose} title={other ? 'Link these two actions' : `Link “${me.problem}”`}>
      <div className="dep-sheet" data-dep-sheet={id}>
        {other ? (
          <>
            <p className="sub">Which one has to be done first?</p>
            <div className="dep-pair">
              <button type="button" className="dep-way" data-dep-way="pair-ab" onClick={() => void pick(other.id, me.id)}>
                <b>“{other.problem}”</b> waits for <b>“{me.problem}”</b><span className="sub">{me.problem} is done first</span>
              </button>
              <button type="button" className="dep-way" data-dep-way="pair-ba" onClick={() => void pick(me.id, other.id)}>
                <b>“{me.problem}”</b> waits for <b>“{other.problem}”</b><span className="sub">{other.problem} is done first</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="chip-row dep-dirs" role="group" aria-label="Which way round">
              <button type="button" className={'chip' + (dir === 'waits' ? ' on' : '')} aria-pressed={dir === 'waits'} onClick={() => { setDir('waits'); setSaid(null); }}>This waits for…</button>
              <button type="button" className={'chip' + (dir === 'holds' ? ' on' : '')} aria-pressed={dir === 'holds'} onClick={() => { setDir('holds'); setSaid(null); }}>This holds up…</button>
            </div>
            <p className="sub dep-help">{dir === 'waits' ? 'Tick what has to be done before this one can be.' : 'Tick what cannot be done until this one is.'}</p>
            {others.length ? (
              <ul className="dep-list">
                {others.map(o => (
                  <li key={o.id}>
                    <label className="dep-opt" data-dep-opt={o.id}>
                      <input type="checkbox" checked={linkedTo(o)} onChange={() => void toggle(o)} />
                      <span className="dep-opt-w">{o.problem}{o.owner ? <span className="sub"> · {o.owner}</span> : null}{o.status === 'closed' ? <span className="sub"> · done</span> : null}</span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : <p className="sub">No other action on this line to link to yet.</p>}
          </>
        )}
        {said && <p className="dep-refused" role="alert">{said}</p>}
        {!other && <div className="qsl-x-acts"><button type="button" className="btn btn-primary" onClick={onClose}>Done</button></div>}
      </div>
    </Sheet>
  );
}

/** A link said in a line: "Waits for A · Holds up B" — the words a tracker row and a card carry. */
export function depWords(snags: readonly Snag[], id: string): { waits: string; holds: string } {
  return { waits: waitsFor(snags, id).map(s => s.problem).join(' · '), holds: holdsUp(snags, id).map(s => s.problem).join(' · ') };
}

/** The problem editor's block: what it waits for and what it holds up, each with a ✕, the clash in words, and the sheet. */
export function DependsBlock({ id }: { id: string }) {
  const [snags, setSnags] = useState<Snag[] | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(async () => setSnags(await listAllSnags()), []);
  useEffect(() => { void load(); return onDataChange(() => void load()); }, [load]);
  if (!snags) return null;
  const me = snags.find(s => s.id === id); if (!me) return null;
  const w = waitsFor(snags, id), h = holdsUp(snags, id);
  const says = depSays(snags, id, Date.now());
  const chip = (s: Snag, waiter: string, on: string, what: string) => (
    <span key={s.id} className={'dep-chip' + (s.status === 'closed' ? ' is-done' : '')} data-dep-chip={s.id}>
      {s.problem}{s.status === 'closed' ? ' · done' : ''}
      <button type="button" className="dep-x" aria-label={`${what} — ${s.problem} — take the link off`} onClick={() => void apply(snags, waiter, on, false)}><Icon name="close" size=".9em" /></button>
    </span>
  );
  return (
    <div className="pe-f pe-wide dep-block" data-dep-block={id}>
      <span className="pe-k">WAITS FOR · HOLDS UP <i className="cw-f-opt">the order the actions on this line must go in — the same on the Gantt</i></span>
      <div className="dep-lines">
        <div className="dep-line"><span className="dep-k">Waits for</span>{w.length ? w.map(s => chip(s, id, s.id, 'Waits for')) : <span className="sub">nothing</span>}</div>
        <div className="dep-line"><span className="dep-k">Holds up</span>{h.length ? h.map(s => chip(s, s.id, id, 'Holds up')) : <span className="sub">nothing</span>}</div>
      </div>
      {says.clash && <p className="dep-clash" data-dep-clash>{says.clash}</p>}
      <div><button type="button" className="btn btn-sm" onClick={() => setOpen(true)}><Icon name="link" size="1em" /> Link to another action</button></div>
      {open && <LinkSheet snags={snags} id={id} onClose={() => setOpen(false)} />}
    </div>
  );
}
