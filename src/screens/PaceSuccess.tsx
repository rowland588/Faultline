/* SUCCESS — what was done, and what worked.
 *
 * The counterweight to the snag list. Snags are what is wrong; Next steps are
 * what is still owed; this is what landed. It exists for morale and for the
 * meeting: a place to say "we did this, and here is the number that proves it
 * worked", and to name the person who made it happen.
 *
 * A win is a story, not a task with its state flipped to done — so it does not
 * live in the Next steps list. Cards, not a table: a win reads like a short
 * paragraph and prints like one. Newest on top, because the most recent win is
 * the one worth opening the meeting with.
 *
 * WHO is a named person on purpose. "The team" is nobody; morale comes from
 * seeing your own name against the thing that worked.
 *
 * IMPACT is the number that settles the argument — "44 → 49 ppm", "changeover
 * 40 → 28 min". Free text, because not every win is a ppm figure. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { listPaceWins, putPaceWin, deletePaceWin, onDataChange, DEFAULT_PROJECT_ID, type PaceWinRow } from '../db';
import { uid } from '../lib/ids';

const when = (ms: number) =>
  new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/** Grows with the text, so a long story is never a one-line slot. */
function Grow({ value, onChange, placeholder, label, cls }: {
  value: string; onChange: (v: string) => void; placeholder: string; label: string; cls: string;
}) {
  return (
    <textarea
      className={cls} rows={1} value={value} placeholder={placeholder} aria-label={label}
      onChange={e => onChange(e.target.value)}
    />
  );
}

function Card({ win, onPatch, onDelete }: {
  win: PaceWinRow; onPatch: (p: Partial<PaceWinRow>) => void; onDelete: () => void;
}) {
  return (
    <article className="win-card">
      <div className="win-top">
        <Grow cls="win-in win-title" label="What worked" value={win.title}
          placeholder="What worked" onChange={v => onPatch({ title: v })} />
        <input className="win-in win-impact" aria-label="Impact" value={win.impact}
          placeholder="44 → 49 ppm" onChange={e => onPatch({ impact: e.target.value })} />
      </div>

      <Grow cls="win-in win-story" label="What we did" value={win.story}
        placeholder="What we did — the story you'd tell the team" onChange={v => onPatch({ story: v })} />

      <div className="win-foot">
        <input className="win-in win-who" aria-label="Who to credit" value={win.who}
          placeholder="Who made it happen" onChange={e => onPatch({ who: e.target.value })} />
        <input className="win-in win-where" aria-label="Where" value={win.where}
          placeholder="Line 10" onChange={e => onPatch({ where: e.target.value })} />
        <span className="win-date">{when(win.createdAt)}</span>
        <button className="win-del" onClick={onDelete} aria-label="Delete this win">Delete</button>
      </div>
    </article>
  );
}

/** `lineId` narrows the log to one line's own wins — see PaceNextSteps. */
export function PaceSuccess({ projectId = DEFAULT_PROJECT_ID, lineId }: { projectId?: string; lineId?: string } = {}) {
  const [wins, setWins] = useState<PaceWinRow[]>([]);
  const [loading, setLoading] = useState(true);
  const root = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => { setWins(await listPaceWins(projectId, lineId)); setLoading(false); }, [projectId, lineId]);

  // A win logged on the laptop appears here without a reload — held back while
  // someone is typing in a card, so a pull can't yank a half-written word.
  useEffect(() => {
    void load();
    return onDataChange(() => {
      if (root.current?.contains(document.activeElement)) return;
      void load();
    });
  }, [load]);

  const patch = async (id: string, p: Partial<PaceWinRow>) => {
    const next = wins.map(w => (w.id === id ? { ...w, ...p } : w));
    setWins(next);                                   // optimistic: typing stays responsive
    const w = next.find(x => x.id === id);
    if (w) await putPaceWin(w);
  };

  const add = async () => {
    const w: PaceWinRow = {
      id: uid(), projectId, lineId, title: '', story: '', where: '', who: '', impact: '',
      createdAt: Date.now(), updatedAt: Date.now(),
    };
    setWins([w, ...wins]);                            // newest on top
    await putPaceWin(w);
  };

  const remove = async (w: PaceWinRow) => {
    const filled = [w.title, w.story, w.where, w.who, w.impact].some(v => v.trim());
    if (filled && !window.confirm(`Delete this win?\n\n"${w.title || '(no title)'}"`)) return;
    setWins(wins.filter(x => x.id !== w.id));
    await deletePaceWin(w.id);
  };

  if (loading) return <p className="sub">Loading…</p>;

  return (
    <div className="win" ref={root}>
      <div className="win-bar">
        <div className="win-bar-stats">
          <b>{wins.length}</b> {wins.length === 1 ? 'win' : 'wins'} logged
        </div>
        <button className="btn btn-primary" onClick={() => void add()}>+ Log a win</button>
      </div>

      {wins.length === 0 ? (
        <div className="win-empty">
          <p className="win-empty-title">Nothing logged yet</p>
          <p className="win-empty-sub">
            The things that worked — a trial that landed, a changeover you cut, a fault you finally
            beat. Say what it was, what you did, the number that proves it, and who made it happen.
            This is the tab you open the meeting with.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => void add()}>+ Log the first win</button>
        </div>
      ) : (
        <div className="win-list">
          {wins.map(w => (
            <Card key={w.id} win={w}
              onPatch={p => void patch(w.id, p)}
              onDelete={() => void remove(w)} />
          ))}
        </div>
      )}
    </div>
  );
}
